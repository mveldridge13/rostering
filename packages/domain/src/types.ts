// Core domain model for the rostering engine. These shapes are the contract
// between backend and frontend. The `as const` value lists are the single
// source of truth for allowed values; the database enums are built from them.

export type IsoDate = string // "2026-10-19"
export type Minutes = number // minutes since midnight, e.g. 390 = 06:30

export const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const
export type AustralianState = (typeof AUSTRALIAN_STATES)[number]

export interface Centre {
  id: string
  name: string
  serviceApprovalNumber: string
  state: AustralianState
  opensAt: Minutes
  closesAt: Minutes
  weeklyWageBudget: number
}

export const AGE_GROUPS = ["0-24m", "24-36m", "36m-preschool", "school-age"] as const
export type AgeGroup = (typeof AGE_GROUPS)[number]

export const ROOM_THEMES = ["nursery", "toddler", "preschool", "kindy"] as const
export type RoomTheme = (typeof ROOM_THEMES)[number]

export interface Room {
  id: string
  centreId: string
  name: string
  ageGroup: AgeGroup
  /** Children per educator required under the National Quality Framework. */
  childrenPerEducator: number
  licensedPlaces: number
  theme: RoomTheme
}

export const EDUCATOR_ROLES = [
  "Centre Director",
  "Early Childhood Teacher",
  "Diploma Educator",
  "Certificate III Educator",
  "Working Towards",
  "Cook",
] as const
export type EducatorRole = (typeof EDUCATOR_ROLES)[number]

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Casual"] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const CREDENTIAL_TYPES = ["WWCC", "First Aid", "CPR", "Anaphylaxis", "Asthma", "Child Protection"] as const
export type CredentialType = (typeof CREDENTIAL_TYPES)[number]

export interface Credential {
  type: CredentialType
  expiresOn: IsoDate
}

export interface Educator {
  id: string
  firstName: string
  lastName: string
  role: EducatorRole
  employment: EmploymentType
  primaryRoomId: string | null
  contractHours: number
  hourlyRate: number
  credentials: Credential[]
  /** Counts towards educator-to-child ratios. */
  countsInRatio: boolean
}

export const SHIFT_TAGS = ["Opener", "Closer", "Responsible Person", "Float"] as const
export type ShiftTag = (typeof SHIFT_TAGS)[number]

export const SHIFT_STATUSES = ["draft", "published"] as const
export type ShiftStatus = (typeof SHIFT_STATUSES)[number]

export interface Shift {
  id: string
  educatorId: string
  roomId: string
  date: IsoDate
  start: Minutes
  end: Minutes
  breakMinutes: number
  tags: ShiftTag[]
  status: ShiftStatus
}

/** Open shift that still needs an educator assigned. */
export interface OpenShift {
  id: string
  roomId: string
  date: IsoDate
  start: Minutes
  end: Minutes
  reason: string
}

export const LEAVE_TYPES = ["Annual", "Personal", "Study", "Unavailable"] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export interface Leave {
  educatorId: string
  date: IsoDate
  type: LeaveType
}

/**
 * Children expected in a room per 30-minute slot, derived from CCS bookings
 * (enrolment patterns minus notified absences).
 */
export interface AttendanceForecast {
  roomId: string
  date: IsoDate
  slotMinutes: number
  /** children[i] is the headcount for the slot starting at centre.opensAt + i * slotMinutes */
  children: number[]
}
