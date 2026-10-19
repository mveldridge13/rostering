// Core domain model for the rostering engine. These shapes are the contract
// the UI is built against; a real API / CCS sync layer will produce them later.

export type IsoDate = string // "2026-10-19"
export type Minutes = number // minutes since midnight, e.g. 390 = 06:30

export type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT"

export interface Centre {
  id: string
  name: string
  serviceApprovalNumber: string
  state: AustralianState
  opensAt: Minutes
  closesAt: Minutes
  weeklyWageBudget: number
}

export type AgeGroup = "0-24m" | "24-36m" | "36m-preschool" | "school-age"

export type RoomTheme = "nursery" | "toddler" | "preschool" | "kindy"

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

export type EducatorRole =
  | "Centre Director"
  | "Early Childhood Teacher"
  | "Diploma Educator"
  | "Certificate III Educator"
  | "Working Towards"
  | "Cook"

export type EmploymentType = "Full-time" | "Part-time" | "Casual"

export type CredentialType =
  | "WWCC"
  | "First Aid"
  | "CPR"
  | "Anaphylaxis"
  | "Asthma"
  | "Child Protection"

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

export type ShiftTag = "Opener" | "Closer" | "Responsible Person" | "Float"

export type ShiftStatus = "draft" | "published"

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

export type LeaveType = "Annual" | "Personal" | "Study" | "Unavailable"

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
