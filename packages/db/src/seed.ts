// Seeds a demo organisation for local development: the same centre, rooms,
// staff, rosters and bookings the UI prototype was built with. Dates are
// relative to today, so credential alerts and open shifts always show.
//
//   pnpm --filter @rostering/db seed
//
// Safe to re-run: it deletes and recreates the demo organisation only.

import { eq } from "drizzle-orm"

import { addDaysIso, today, weekdaysOf, weekStartOf } from "@rostering/domain/time"
import type { CredentialType, LeaveType, ShiftTag } from "@rostering/domain/types"

import { createDb } from "./client"
import * as s from "./schema"

export const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"

const now = today()
const thisWeek = weekStartOf(now)
/** Two weeks either side of this week. */
const weeks = [-2, -1, 0, 1, 2].map((n) => addDaysIso(thisWeek, n * 7))

const centre = {
  name: "Little Wattles Early Learning",
  serviceApprovalNumber: "SE-40012345",
  state: "NSW" as const,
  timezone: "Australia/Sydney",
  opensAt: 390,
  closesAt: 1110,
  weeklyWageBudgetCents: 2_300_000,
}

const rooms = {
  possums: { name: "Possums", ageGroup: "0-24m", childrenPerEducator: 4, licensedPlaces: 10, theme: "nursery", sortOrder: 0 },
  wombats: { name: "Wombats", ageGroup: "24-36m", childrenPerEducator: 5, licensedPlaces: 15, theme: "toddler", sortOrder: 1 },
  kookaburras: { name: "Kookaburras", ageGroup: "36m-preschool", childrenPerEducator: 10, licensedPlaces: 20, theme: "preschool", sortOrder: 2 },
  platypus: { name: "Platypus", ageGroup: "36m-preschool", childrenPerEducator: 10, licensedPlaces: 22, theme: "kindy", sortOrder: 3 },
} as const satisfies Record<string, Omit<typeof s.rooms.$inferInsert, "orgId" | "centreId">>

type RoomKey = keyof typeof rooms

type StaffSeed = Omit<typeof s.staff.$inferInsert, "orgId" | "centreId" | "primaryRoomId" | "hourlyRateCents"> & {
  room: RoomKey | null
  rate: number
  /** Days until expiry, overriding the defaults below. */
  expiry?: Partial<Record<CredentialType, number>>
}

const staff: Record<string, StaffSeed> = {
  e1: { firstName: "Sarah", lastName: "Mitchell", role: "Centre Director", employment: "Full-time", room: null, contractHours: 38, rate: 48.2, countsInRatio: false },
  e2: { firstName: "Priya", lastName: "Sharma", role: "Early Childhood Teacher", employment: "Full-time", room: "platypus", contractHours: 38, rate: 42.5, expiry: { CPR: 12 } },
  e3: { firstName: "James", lastName: "O'Connor", role: "Early Childhood Teacher", employment: "Part-time", room: "kookaburras", contractHours: 24, rate: 41.1 },
  e4: { firstName: "Mei Lin", lastName: "Tan", role: "Diploma Educator", employment: "Full-time", room: "possums", contractHours: 38, rate: 33.4, expiry: { "First Aid": 21 } },
  e5: { firstName: "Hannah", lastName: "Brooks", role: "Certificate III Educator", employment: "Full-time", room: "possums", contractHours: 38, rate: 29.1 },
  e6: { firstName: "Aisha", lastName: "Rahman", role: "Certificate III Educator", employment: "Part-time", room: "possums", contractHours: 24, rate: 28.6, expiry: { WWCC: -3 } },
  e7: { firstName: "Tom", lastName: "Nguyen", role: "Diploma Educator", employment: "Full-time", room: "wombats", contractHours: 38, rate: 33.4 },
  e8: { firstName: "Grace", lastName: "Whitfield", role: "Certificate III Educator", employment: "Full-time", room: "wombats", contractHours: 38, rate: 29.1, expiry: { Anaphylaxis: 27 } },
  e9: { firstName: "Olivia", lastName: "Martin", role: "Working Towards", employment: "Casual", room: "wombats", contractHours: 0, rate: 26.3 },
  e10: { firstName: "Liam", lastName: "Fraser", role: "Diploma Educator", employment: "Full-time", room: "kookaburras", contractHours: 38, rate: 33.4 },
  e11: { firstName: "Zoe", lastName: "Papadopoulos", role: "Certificate III Educator", employment: "Full-time", room: "kookaburras", contractHours: 38, rate: 29.1 },
  e12: { firstName: "Ella", lastName: "Thompson", role: "Diploma Educator", employment: "Full-time", room: "platypus", contractHours: 38, rate: 33.4 },
  e13: { firstName: "Noah", lastName: "Williams", role: "Certificate III Educator", employment: "Part-time", room: "platypus", contractHours: 30, rate: 28.6 },
  e14: { firstName: "Chloe", lastName: "Bennett", role: "Diploma Educator", employment: "Part-time", room: "possums", contractHours: 24, rate: 33.4 },
  e15: { firstName: "Ruby", lastName: "Anderson", role: "Certificate III Educator", employment: "Casual", room: null, contractHours: 0, rate: 28.6 },
  e16: { firstName: "Daniel", lastName: "Costa", role: "Cook", employment: "Part-time", room: null, contractHours: 28, rate: 27.4, countsInRatio: false },
  e17: { firstName: "Isabella", lastName: "Rossi", role: "Certificate III Educator", employment: "Full-time", room: "wombats", contractHours: 38, rate: 29.1 },
  e18: { firstName: "Jack", lastName: "Henderson", role: "Diploma Educator", employment: "Full-time", room: "kookaburras", contractHours: 38, rate: 33.4, expiry: { "Child Protection": 9 } },
  e19: { firstName: "Sophie", lastName: "Clarke", role: "Certificate III Educator", employment: "Full-time", room: "platypus", contractHours: 38, rate: 29.1 },
  e20: { firstName: "Maya", lastName: "Patel", role: "Certificate III Educator", employment: "Full-time", room: "possums", contractHours: 38, rate: 29.1 },
}

const defaultExpiry: Record<CredentialType, number> = {
  WWCC: 900,
  "First Aid": 400,
  CPR: 200,
  Anaphylaxis: 500,
  Asthma: 500,
  "Child Protection": 300,
}

// Shift templates: [start, end, unpaid break]. 8.5h on site, 7.5h paid.
const T = {
  E: [390, 900, 60], //   6:30 – 3:00  opener
  M1: [450, 960, 60], //  7:30 – 4:00
  M2: [510, 1020, 60], // 8:30 – 5:00
  C: [600, 1110, 60], // 10:00 – 6:30 closer
  D: [480, 990, 60], //   8:00 – 4:30 director
  K: [420, 870, 30], //   7:00 – 2:30 cook
} as const
type TemplateKey = keyof typeof T

/** Each room runs an opener, two mids and a closer; who takes which rotates daily. */
const roomRotation: TemplateKey[] = ["E", "M1", "M2", "C"]

/** Who works where, Monday → Friday. Office and kitchen are non-contact work. */
const plans: Record<RoomKey | "office" | "kitchen", string[][]> = {
  possums: [
    ["e4", "e5", "e20", "e6"],
    ["e4", "e5", "e20", "e6"],
    ["e4", "e5", "e20", "e14"],
    ["e4", "e5", "e20", "e6"],
    ["e4", "e5", "e20", "e14"],
  ],
  wombats: [
    ["e7", "e8", "e17", "e9"],
    ["e7", "e8", "e17", "e15"],
    ["e7", "e8", "e17", "e9"],
    ["e7", "e8", "e17", "e9"],
    ["e7", "e8", "e17", "e15"],
  ],
  kookaburras: [
    ["e10", "e11", "e18", "e3"],
    ["e10", "e11", "e18", "e3"],
    ["e10", "e11", "e18", "e3"],
    ["e10", "e11", "e18", "e15"],
    ["e10", "e11", "e18"],
  ],
  platypus: [
    ["e2", "e12", "e19", "e14"],
    ["e2", "e12", "e19", "e13"],
    ["e2", "e12", "e19", "e13"],
    ["e2", "e12", "e19", "e13"],
    ["e2", "e12", "e19", "e13"],
  ],
  office: [["e1"], ["e1"], ["e1"], ["e1"], ["e1"]],
  kitchen: [["e16"], ["e16"], ["e16"], ["e16"], []],
}

/** Approved leave: [staff, week offset from this week, weekday, type]. */
const leaveDays: [string, number, number, LeaveType][] = [
  ["e5", 0, 2, "Personal"],
  ["e11", 0, 4, "Study"],
  ["e8", 1, 0, "Annual"],
  ["e8", 1, 1, "Annual"],
]

/** Booked children per room by weekday, as it would arrive from CCS enrolments. */
const bookedByWeekday: Record<RoomKey, number[]> = {
  possums: [9, 10, 10, 10, 8],
  wombats: [12, 13, 13, 13, 11],
  kookaburras: [18, 20, 20, 19, 16],
  platypus: [19, 21, 22, 21, 18],
}

/** Share of booked children on site through the day: arrivals 6:30–9:30, departures 3:00–6:30. */
function presence(slotStart: number): number {
  const curve: [number, number][] = [
    [390, 0.1], [420, 0.22], [450, 0.4], [480, 0.62], [510, 0.82], [540, 0.95], [570, 1],
    [900, 1], [930, 0.9], [960, 0.75], [990, 0.55], [1020, 0.38], [1050, 0.22], [1080, 0.08], [1110, 0],
  ]
  for (let i = 0; i < curve.length - 1; i++) {
    const [t0, v0] = curve[i]
    const [t1, v1] = curve[i + 1]
    if (slotStart >= t0 && slotStart < t1) return v0 + ((v1 - v0) * (slotStart - t0)) / (t1 - t0)
  }
  return 0
}

/**
 * Turn a day's headcount curve into individual sessions. Child k is on site
 * for every slot where at least k children are expected, which reproduces
 * the curve exactly because it only rises then falls.
 */
function sessions(booked: number): { start: number; end: number }[] {
  const slots = Array.from({ length: (centre.closesAt - centre.opensAt) / 30 }, (_, i) => {
    const start = centre.opensAt + i * 30
    return { start, children: Math.round(booked * presence(start)) }
  })
  return Array.from({ length: booked }, (_, k) => {
    const present = slots.filter((slot) => slot.children >= k + 1)
    return { start: present[0].start, end: present.at(-1)!.start + 30 }
  })
}

const childFirstNames = [
  "Ava", "Leo", "Isla", "Oliver", "Mia", "Henry", "Charlotte", "Jack", "Amelia", "Noah", "Olivia", "Hudson",
  "Willow", "Archie", "Matilda", "Theo", "Harper", "Lucas", "Grace", "Max", "Sienna", "Thomas", "Evie", "Arlo",
  "Ruby", "Hugo", "Zara", "Finn", "Ivy", "Oscar", "Sophie", "Charlie", "Frankie", "Elijah", "Poppy", "Louis",
  "Lily", "Harrison", "Chloe", "Ethan", "Ella", "Mason", "Billie", "Levi", "Maeve", "Xavier", "Hazel", "Jasper",
  "Aria", "Kai", "Layla", "Riley", "Eden", "Toby", "Nina", "Felix", "Rosie", "Ari", "Pippa", "Sam", "Tilly",
  "Ned", "Clara", "Remy", "Lola", "Jude", "Daisy",
]
const childLastNames = ["Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "Nguyen", "Kelly", "Ryan", "Chen", "Singh", "Walker"]

/** A date of birth that puts the child in the middle of their room's age band. */
function dateOfBirth(room: RoomKey, k: number): string {
  const months = { possums: 8 + (k % 14), wombats: 25 + (k % 10), kookaburras: 38 + (k % 12), platypus: 50 + (k % 10) }[room]
  return addDaysIso(now, -Math.round(months * 30.4))
}

export async function seed() {
  const { db, close } = createDb()
  try {
    await db.transaction(async (tx) => {
      // Cascades to everything the demo organisation owns.
      await tx.delete(s.organisations).where(eq(s.organisations.id, DEMO_ORG_ID))
      const orgId = DEMO_ORG_ID
      await tx.insert(s.organisations).values({ id: orgId, name: "Little Wattles Group" })

      const [{ id: centreId }] = await tx.insert(s.centres).values({ orgId, ...centre }).returning({ id: s.centres.id })

      const roomKeys = Object.keys(rooms) as RoomKey[]
      const roomRows = await tx
        .insert(s.rooms)
        .values(roomKeys.map((key) => ({ orgId, centreId, ...rooms[key] })))
        .returning({ id: s.rooms.id })
      const roomId = Object.fromEntries(roomKeys.map((key, i) => [key, roomRows[i].id])) as Record<RoomKey, string>

      const staffKeys = Object.keys(staff)
      const staffRows = await tx
        .insert(s.staff)
        .values(
          staffKeys.map((key) => {
            const { room, rate, expiry: _expiry, ...rest } = staff[key]
            return { orgId, centreId, ...rest, primaryRoomId: room ? roomId[room] : null, hourlyRateCents: Math.round(rate * 100) }
          }),
        )
        .returning({ id: s.staff.id })
      const staffId = Object.fromEntries(staffKeys.map((key, i) => [key, staffRows[i].id]))

      await tx.insert(s.credentials).values(
        staffKeys.flatMap((key) =>
          (Object.keys(defaultExpiry) as CredentialType[]).map((type) => ({
            orgId,
            staffId: staffId[key],
            type,
            expiresOn: addDaysIso(now, staff[key].expiry?.[type] ?? defaultExpiry[type]),
          })),
        ),
      )

      // Children: enough per room for the busiest day.
      let nameIndex = 0
      const childIds: Record<RoomKey, string[]> = { possums: [], wombats: [], kookaburras: [], platypus: [] }
      for (const room of roomKeys) {
        const count = Math.max(...bookedByWeekday[room])
        const rows = await tx
          .insert(s.children)
          .values(
            Array.from({ length: count }, (_, k) => {
              const n = nameIndex++
              return {
                orgId,
                centreId,
                externalRef: `CCS-${1000 + n}`,
                firstName: childFirstNames[n % childFirstNames.length],
                lastName: childLastNames[n % childLastNames.length],
                dateOfBirth: dateOfBirth(room, k),
                roomId: roomId[room],
              }
            }),
          )
          .returning({ id: s.children.id })
        childIds[room] = rows.map((r) => r.id)
      }

      const dates = weeks.flatMap((week) => weekdaysOf(week))

      await tx.insert(s.bookings).values(
        dates.flatMap((date, i) =>
          roomKeys.flatMap((room) =>
            sessions(bookedByWeekday[room][i % 5]).map(({ start, end }, k) => ({
              orgId,
              centreId,
              childId: childIds[room][k],
              roomId: roomId[room],
              date,
              startMinute: start,
              endMinute: end,
            })),
          ),
        ),
      )

      const leaveRows = leaveDays.map(([key, week, day, type]) => ({
        staffKey: key,
        date: addDaysIso(thisWeek, week * 7 + day),
        type,
      }))

      // Rosters: published up to this week, drafts after. Shifts vacated by
      // leave become open shifts.
      const shiftRows: (typeof s.shifts.$inferInsert)[] = []
      for (const week of weeks) {
        const status = week <= thisWeek ? "published" : "draft"
        weekdaysOf(week).forEach((date, day) => {
          for (const [area, days] of Object.entries(plans) as [keyof typeof plans, string[][]][]) {
            days[day].forEach((key, position) => {
              const template: TemplateKey =
                area === "office" ? "D" : area === "kitchen" ? "K" : roomRotation[(position + day) % roomRotation.length]
              const [startMinute, endMinute, breakMinutes] = T[template]
              const person = staff[key]
              const tags: ShiftTag[] = []
              if (template === "E") tags.push("Opener")
              if (template === "C") tags.push("Closer")
              if (person.role === "Centre Director") tags.push("Responsible Person")
              if (person.employment === "Casual") tags.push("Float")

              const onLeave = leaveRows.find((l) => l.staffKey === key && l.date === date)
              shiftRows.push({
                orgId,
                centreId,
                staffId: onLeave ? null : staffId[key],
                workType: area === "office" || area === "kitchen" ? area : "care",
                roomId: area === "office" || area === "kitchen" ? null : roomId[area],
                date,
                startMinute,
                endMinute,
                breakMinutes,
                tags: onLeave ? [] : tags,
                status,
                openReason: onLeave
                  ? `Cover for ${person.firstName} ${person.lastName} (${onLeave.type.toLowerCase()} leave)`
                  : null,
              })
            })
          }
        })
      }
      await tx.insert(s.shifts).values(shiftRows)

      await tx.insert(s.leave).values(
        leaveRows.map(({ staffKey, date, type }) => ({
          orgId,
          staffId: staffId[staffKey],
          startDate: date,
          endDate: date,
          type,
          status: "approved" as const,
        })),
      )

      console.log(
        `Seeded "${centre.name}": ${roomKeys.length} rooms, ${staffKeys.length} staff, ` +
          `${Object.values(childIds).flat().length} children, ${shiftRows.length} shifts over ${weeks.length} weeks.`,
      )
    })
  } finally {
    await close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seed()
}
