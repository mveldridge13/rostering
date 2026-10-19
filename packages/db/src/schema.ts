// Database schema for the rostering platform. BACKEND ONLY.
//
// Conventions
// - All tables live in the `app` schema, which Supabase does not expose
//   through its auto-generated Data API. Only our own API reaches this data.
// - Every tenant-owned row carries `org_id`. Row-level security lets the
//   `app_user` role see only rows for the organisation set on the current
//   transaction (see `withOrg` in ./client.ts), so a bug in a query cannot
//   leak another organisation's data.
// - References between tenant tables include `org_id` (composite foreign
//   keys), because Postgres checks foreign keys without row-level security.
//   This makes it impossible for a row to point at another organisation's row.
// - Times of day are minutes since midnight (390 = 6:30am) in the centre's
//   local time zone; dates are local calendar dates. Money is in cents.
// - Allowed values come from @rostering/domain so the database and the
//   TypeScript types cannot drift apart.

import { sql, type SQL } from "drizzle-orm"
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgRole,
  pgSchema,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import {
  AGE_GROUPS,
  AUSTRALIAN_STATES,
  CREDENTIAL_TYPES,
  EDUCATOR_ROLES,
  EMPLOYMENT_TYPES,
  LEAVE_TYPES,
  ROOM_THEMES,
  SHIFT_STATUSES,
  SHIFT_TAGS,
} from "@rostering/domain/types"

export const app = pgSchema("app")

/** The role our API switches to for every request. It cannot bypass row-level security. */
export const appUser = pgRole("app_user")

/** The organisation set for the current transaction, or null when none is set. */
const currentOrg = sql`nullif(current_setting('app.org_id', true), '')::uuid`

const tenantPolicy = (orgId: SQL | AnyPgColumn) =>
  pgPolicy("tenant_isolation", {
    for: "all",
    to: appUser,
    using: sql`${orgId} = ${currentOrg}`,
    withCheck: sql`${orgId} = ${currentOrg}`,
  })

// ---------------------------------------------------------------------------
// Enums

export const australianState = app.enum("australian_state", AUSTRALIAN_STATES)
export const ageGroup = app.enum("age_group", AGE_GROUPS)
export const roomTheme = app.enum("room_theme", ROOM_THEMES)
export const staffRole = app.enum("staff_role", EDUCATOR_ROLES)
export const employmentType = app.enum("employment_type", EMPLOYMENT_TYPES)
export const credentialType = app.enum("credential_type", CREDENTIAL_TYPES)
export const shiftTag = app.enum("shift_tag", SHIFT_TAGS)
export const shiftStatus = app.enum("shift_status", SHIFT_STATUSES)
/** Care shifts count towards a room's ratio; office and kitchen shifts do not. */
export const workType = app.enum("work_type", ["care", "office", "kitchen"])
export const leaveType = app.enum("leave_type", LEAVE_TYPES)
export const leaveStatus = app.enum("leave_status", ["requested", "approved", "declined"])
export const bookingStatus = app.enum("booking_status", ["booked", "absent"])

// ---------------------------------------------------------------------------
// Shared columns

const id = () => uuid().primaryKey().defaultRandom()
const orgId = () =>
  uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" })

/** Foreign key from (org_id, column) to the parent's (org_id, id). */
const sameOrg = (
  name: string,
  orgId: AnyPgColumn,
  column: AnyPgColumn,
  parent: { orgId: AnyPgColumn; id: AnyPgColumn },
  onDelete: "cascade" | "restrict" | "no action" = "cascade",
) => foreignKey({ name, columns: [orgId, column], foreignColumns: [parent.orgId, parent.id] }).onDelete(onDelete)

/** Lets other tables reference this one through (org_id, id). */
const orgKey = (table: string, t: { orgId: AnyPgColumn; id: AnyPgColumn }) =>
  unique(`${table}_org_id_key`).on(t.orgId, t.id)
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}
const localDate = () => date({ mode: "string" })
const minuteOfDay = () => smallint()

// ---------------------------------------------------------------------------
// Tenancy

/** A customer: a single centre or a group of centres. */
export const organisations = app.table(
  "organisations",
  {
    id: id(),
    name: text().notNull(),
    ...timestamps,
  },
  (t) => [tenantPolicy(t.id)],
)

export const centres = app.table(
  "centres",
  {
    id: id(),
    orgId: orgId(),
    name: text().notNull(),
    serviceApprovalNumber: text().notNull(),
    state: australianState().notNull(),
    /** IANA time zone; all dates and times for this centre are local to it. */
    timezone: text().notNull().default("Australia/Sydney"),
    opensAt: minuteOfDay().notNull(),
    closesAt: minuteOfDay().notNull(),
    weeklyWageBudgetCents: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("centres_service_approval_number_key").on(t.serviceApprovalNumber),
    orgKey("centres", t),
    check("centres_hours_check", sql`${t.opensAt} >= 0 and ${t.closesAt} <= 1440 and ${t.closesAt} > ${t.opensAt}`),
    tenantPolicy(t.orgId),
  ],
)

export const rooms = app.table(
  "rooms",
  {
    id: id(),
    orgId: orgId(),
    centreId: uuid().notNull(),
    name: text().notNull(),
    ageGroup: ageGroup().notNull(),
    /** Children per educator required under the National Quality Framework. */
    childrenPerEducator: smallint().notNull(),
    licensedPlaces: smallint().notNull(),
    theme: roomTheme().notNull(),
    sortOrder: smallint().notNull().default(0),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    orgKey("rooms", t),
    sameOrg("rooms_centre_fk", t.orgId, t.centreId, centres),
    index("rooms_centre_idx").on(t.centreId),
    check("rooms_ratio_check", sql`${t.childrenPerEducator} > 0`),
    check("rooms_places_check", sql`${t.licensedPlaces} >= 0`),
    tenantPolicy(t.orgId),
  ],
)

// ---------------------------------------------------------------------------
// People

/** Educators and other staff. Called "educators" in the UI. */
export const staff = app.table(
  "staff",
  {
    id: id(),
    orgId: orgId(),
    /** Home centre. Staff can still be rostered at other centres in the organisation. */
    centreId: uuid().notNull(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    email: text(),
    phone: text(),
    role: staffRole().notNull(),
    employment: employmentType().notNull(),
    /** Rooms are archived rather than deleted, so this never dangles. */
    primaryRoomId: uuid(),
    contractHours: numeric({ precision: 4, scale: 1, mode: "number" }).notNull().default(0),
    hourlyRateCents: integer().notNull(),
    /** Counts towards educator-to-child ratios. False for cooks, admin and non-contact directors. */
    countsInRatio: boolean().notNull().default(true),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    orgKey("staff", t),
    sameOrg("staff_centre_fk", t.orgId, t.centreId, centres),
    sameOrg("staff_primary_room_fk", t.orgId, t.primaryRoomId, rooms, "no action"),
    index("staff_centre_idx").on(t.centreId),
    check("staff_contract_hours_check", sql`${t.contractHours} >= 0`),
    check("staff_rate_check", sql`${t.hourlyRateCents} >= 0`),
    tenantPolicy(t.orgId),
  ],
)

export const credentials = app.table(
  "credentials",
  {
    id: id(),
    orgId: orgId(),
    staffId: uuid().notNull(),
    type: credentialType().notNull(),
    /** Card or certificate number, e.g. the WWCC clearance number. */
    reference: text(),
    expiresOn: localDate().notNull(),
    ...timestamps,
  },
  (t) => [
    sameOrg("credentials_staff_fk", t.orgId, t.staffId, staff),
    uniqueIndex("credentials_staff_type_key").on(t.staffId, t.type),
    index("credentials_expiry_idx").on(t.orgId, t.expiresOn),
    tenantPolicy(t.orgId),
  ],
)

/**
 * Children, as imported from the centre's CCS software. We keep the minimum
 * needed for ratios: who they are, their age and their room.
 */
export const children = app.table(
  "children",
  {
    id: id(),
    orgId: orgId(),
    centreId: uuid().notNull(),
    /** The child's id in the CCS software, used to match records on re-import. */
    externalRef: text(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    dateOfBirth: localDate().notNull(),
    roomId: uuid(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    orgKey("children", t),
    sameOrg("children_centre_fk", t.orgId, t.centreId, centres),
    sameOrg("children_room_fk", t.orgId, t.roomId, rooms, "no action"),
    uniqueIndex("children_external_ref_key").on(t.centreId, t.externalRef),
    index("children_room_idx").on(t.roomId),
    tenantPolicy(t.orgId),
  ],
)

// ---------------------------------------------------------------------------
// Attendance and rosters

/** A child booked into a room for a session on a date. Drives ratio requirements. */
export const bookings = app.table(
  "bookings",
  {
    id: id(),
    orgId: orgId(),
    centreId: uuid().notNull(),
    childId: uuid().notNull(),
    roomId: uuid().notNull(),
    date: localDate().notNull(),
    startMinute: minuteOfDay().notNull(),
    endMinute: minuteOfDay().notNull(),
    status: bookingStatus().notNull().default("booked"),
    ...timestamps,
  },
  (t) => [
    sameOrg("bookings_centre_fk", t.orgId, t.centreId, centres),
    sameOrg("bookings_child_fk", t.orgId, t.childId, children),
    sameOrg("bookings_room_fk", t.orgId, t.roomId, rooms),
    uniqueIndex("bookings_child_date_key").on(t.childId, t.date),
    index("bookings_room_date_idx").on(t.roomId, t.date),
    check("bookings_times_check", sql`${t.startMinute} >= 0 and ${t.endMinute} <= 1440 and ${t.endMinute} > ${t.startMinute}`),
    tenantPolicy(t.orgId),
  ],
)

/**
 * A rostered shift. A shift with no staff member is an open shift that still
 * needs someone; `openReason` says why (e.g. cover for leave).
 */
export const shifts = app.table(
  "shifts",
  {
    id: id(),
    orgId: orgId(),
    centreId: uuid().notNull(),
    staffId: uuid(),
    workType: workType().notNull().default("care"),
    roomId: uuid(),
    date: localDate().notNull(),
    startMinute: minuteOfDay().notNull(),
    endMinute: minuteOfDay().notNull(),
    breakMinutes: smallint().notNull().default(0),
    tags: shiftTag().array().notNull().default(sql`'{}'`),
    status: shiftStatus().notNull().default("draft"),
    openReason: text(),
    ...timestamps,
  },
  (t) => [
    sameOrg("shifts_centre_fk", t.orgId, t.centreId, centres),
    sameOrg("shifts_staff_fk", t.orgId, t.staffId, staff),
    sameOrg("shifts_room_fk", t.orgId, t.roomId, rooms, "restrict"),
    index("shifts_centre_date_idx").on(t.centreId, t.date),
    index("shifts_staff_date_idx").on(t.staffId, t.date),
    check("shifts_times_check", sql`${t.startMinute} >= 0 and ${t.endMinute} <= 1440 and ${t.endMinute} > ${t.startMinute}`),
    check("shifts_break_check", sql`${t.breakMinutes} >= 0 and ${t.breakMinutes} < ${t.endMinute} - ${t.startMinute}`),
    check("shifts_room_check", sql`(${t.workType} = 'care') = (${t.roomId} is not null)`),
    tenantPolicy(t.orgId),
  ],
)

export const leave = app.table(
  "leave",
  {
    id: id(),
    orgId: orgId(),
    staffId: uuid().notNull(),
    startDate: localDate().notNull(),
    endDate: localDate().notNull(),
    type: leaveType().notNull(),
    status: leaveStatus().notNull().default("requested"),
    note: text(),
    ...timestamps,
  },
  (t) => [
    sameOrg("leave_staff_fk", t.orgId, t.staffId, staff),
    index("leave_staff_dates_idx").on(t.staffId, t.startDate),
    check("leave_dates_check", sql`${t.endDate} >= ${t.startDate}`),
    tenantPolicy(t.orgId),
  ],
)

// ---------------------------------------------------------------------------
// Audit

/**
 * Append-only record of every change. The National Regulations require
 * services to keep a record of which educators worked directly with children,
 * so roster history must not be editable. `app_user` may insert and read but
 * never update or delete (see the grants migration).
 */
export const auditLog = app.table(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    orgId: orgId(),
    /** Who made the change. Null for system jobs such as a CCS import. */
    actorId: uuid(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    before: jsonb(),
    after: jsonb(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.orgId, t.entityType, t.entityId), tenantPolicy(t.orgId)],
)
