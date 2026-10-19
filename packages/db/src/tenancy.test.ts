// Integration tests for tenant isolation. They run against the local Supabase
// database (`pnpm db:start`) and clean up after themselves.

import { eq, inArray, sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDb, withOrg } from "./client"
import * as s from "./schema"

const { db, close } = createDb()

const A = "00000000-0000-4000-8000-0000000000aa"
const B = "00000000-0000-4000-8000-0000000000bb"
const ids = { centreA: "", centreB: "", roomA: "", roomB: "", staffA: "" }

/** The Postgres error behind a failed query (Drizzle wraps it). */
async function pgError(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
  try {
    await promise
  } catch (error) {
    const cause = (error as { cause?: { code?: string; message: string } }).cause
    return cause ?? (error as Error)
  }
  throw new Error("Expected the query to fail")
}

beforeAll(async () => {
  await db.delete(s.organisations).where(inArray(s.organisations.id, [A, B]))
  await db.insert(s.organisations).values([
    { id: A, name: "Org A" },
    { id: B, name: "Org B" },
  ])
  const centre = (orgId: string, san: string) => ({
    orgId,
    name: san,
    serviceApprovalNumber: san,
    state: "NSW" as const,
    opensAt: 390,
    closesAt: 1110,
  })
  ;[{ id: ids.centreA }, { id: ids.centreB }] = await db
    .insert(s.centres)
    .values([centre(A, "TEST-A"), centre(B, "TEST-B")])
    .returning({ id: s.centres.id })
  const room = (orgId: string, centreId: string) => ({
    orgId,
    centreId,
    name: "Room",
    ageGroup: "0-24m" as const,
    childrenPerEducator: 4,
    licensedPlaces: 10,
    theme: "nursery" as const,
  })
  ;[{ id: ids.roomA }, { id: ids.roomB }] = await db
    .insert(s.rooms)
    .values([room(A, ids.centreA), room(B, ids.centreB)])
    .returning({ id: s.rooms.id })
  ;[{ id: ids.staffA }] = await db
    .insert(s.staff)
    .values({
      orgId: A,
      centreId: ids.centreA,
      firstName: "Alex",
      lastName: "A",
      role: "Diploma Educator",
      employment: "Full-time",
      hourlyRateCents: 3300,
    })
    .returning({ id: s.staff.id })
})

afterAll(async () => {
  await db.delete(s.organisations).where(inArray(s.organisations.id, [A, B]))
  await close()
})

describe("tenant isolation", () => {
  it("only shows the current organisation's rows", async () => {
    const centres = await withOrg(db, A, (tx) => tx.select({ id: s.centres.id, orgId: s.centres.orgId }).from(s.centres))
    expect(centres.map((c) => c.id)).toContain(ids.centreA)
    expect(centres.every((c) => c.orgId === A)).toBe(true)
  })

  it("shows nothing when no organisation is set", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`set local role app_user`)
      return tx.select().from(s.centres)
    })
    expect(rows).toEqual([])
  })

  it("cannot read another organisation's row even by id", async () => {
    const rows = await withOrg(db, A, (tx) => tx.select().from(s.rooms).where(eq(s.rooms.id, ids.roomB)))
    expect(rows).toEqual([])
  })

  it("cannot update or delete another organisation's rows", async () => {
    await withOrg(db, A, async (tx) => {
      await tx.update(s.rooms).set({ name: "Hacked" }).where(eq(s.rooms.id, ids.roomB))
      await tx.delete(s.rooms).where(eq(s.rooms.id, ids.roomB))
    })
    const [roomB] = await db.select().from(s.rooms).where(eq(s.rooms.id, ids.roomB))
    expect(roomB.name).toBe("Room")
  })

  it("cannot insert rows for another organisation", async () => {
    const error = await pgError(
      withOrg(db, A, (tx) =>
        tx.insert(s.rooms).values({
          orgId: B,
          centreId: ids.centreB,
          name: "Sneaky",
          ageGroup: "0-24m",
          childrenPerEducator: 4,
          licensedPlaces: 10,
          theme: "nursery",
        }),
      ),
    )
    expect(error.message).toMatch(/row-level security/)
  })

  it("cannot point a row at another organisation's row", async () => {
    // Foreign keys bypass row-level security, so this is caught by the
    // composite (org_id, id) foreign key instead.
    const error = await pgError(
      withOrg(db, A, (tx) =>
        tx.insert(s.shifts).values({
          orgId: A,
          centreId: ids.centreA,
          staffId: ids.staffA,
          roomId: ids.roomB,
          date: "2026-10-19",
          startMinute: 390,
          endMinute: 900,
        }),
      ),
    )
    expect(error.code).toBe("23503") // foreign_key_violation
  })

  it("rejects an invalid organisation id before touching the database", async () => {
    await expect(withOrg(db, "'; drop table app.shifts; --", async () => 1)).rejects.toThrow(/Invalid organisation id/)
  })
})

describe("data rules", () => {
  it("keeps the audit log append-only", async () => {
    await withOrg(db, A, (tx) =>
      tx.insert(s.auditLog).values({ orgId: A, action: "shift.created", entityType: "shift", after: { start: 390 } }),
    )
    const error = await pgError(withOrg(db, A, (tx) => tx.update(s.auditLog).set({ action: "edited" })))
    expect(error.code).toBe("42501") // insufficient_privilege
    const deleteError = await pgError(withOrg(db, A, (tx) => tx.delete(s.auditLog)))
    expect(deleteError.code).toBe("42501")
  })

  it("does not let a tenant create organisations", async () => {
    const error = await pgError(withOrg(db, A, (tx) => tx.insert(s.organisations).values({ id: A, name: "x" })))
    expect(error.code).toBe("42501")
  })

  it("keeps Supabase's public API roles out of the app schema", async () => {
    for (const role of ["anon", "authenticated"]) {
      const error = await pgError(
        db.transaction(async (tx) => {
          await tx.execute(sql.raw(`set local role ${role}`))
          await tx.select().from(s.centres)
        }),
      )
      expect(error.code).toBe("42501")
    }
  })

  it("requires care shifts to have a room and non-contact shifts not to", async () => {
    const shift = { orgId: A, centreId: ids.centreA, staffId: ids.staffA, date: "2026-10-19", startMinute: 390, endMinute: 900 }
    const noRoom = await pgError(withOrg(db, A, (tx) => tx.insert(s.shifts).values({ ...shift, workType: "care" })))
    expect(noRoom.code).toBe("23514") // check_violation
    const kitchenInRoom = await pgError(
      withOrg(db, A, (tx) => tx.insert(s.shifts).values({ ...shift, workType: "kitchen", roomId: ids.roomA })),
    )
    expect(kitchenInRoom.code).toBe("23514")
  })

  it("rejects a shift that ends before it starts", async () => {
    const error = await pgError(
      withOrg(db, A, (tx) =>
        tx.insert(s.shifts).values({
          orgId: A,
          centreId: ids.centreA,
          staffId: ids.staffA,
          roomId: ids.roomA,
          date: "2026-10-19",
          startMinute: 900,
          endMinute: 390,
        }),
      ),
    )
    expect(error.code).toBe("23514")
  })
})
