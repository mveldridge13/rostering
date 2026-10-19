// Rules for adding an educator. Shared so the form can show errors as you
// type and the backend can enforce exactly the same rules when saving.

import { differenceInCalendarDays, isValid, parseISO } from "date-fns"

import {
  CREDENTIAL_TYPES,
  EDUCATOR_ROLES,
  EMPLOYMENT_TYPES,
  type CredentialType,
  type EducatorRole,
  type EmploymentType,
  type IsoDate,
} from "./types"

export interface NewEducator {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: EducatorRole
  employment: EmploymentType
  primaryRoomId: string | null
  contractHours: number
  hourlyRate: number
  countsInRatio: boolean
  credentials: NewCredential[]
}

export interface NewCredential {
  type: CredentialType
  /** Card or certificate number. Required for a WWCC. */
  reference: string
  expiresOn: IsoDate
}

export type NewEducatorField =
  | Exclude<keyof NewEducator, "credentials">
  | `credentials.${CredentialType}`
  | `credentials.${CredentialType}.reference`

export type NewEducatorErrors = Partial<Record<NewEducatorField, string>>

/** Full-time hours under the Children's Services Award. */
export const FULL_TIME_HOURS = 38

/** Roles that don't count towards ratios by default: they're not on the floor with children. */
export function defaultCountsInRatio(role: EducatorRole): boolean {
  return role !== "Cook" && role !== "Centre Director"
}

export function defaultContractHours(employment: EmploymentType): number {
  return employment === "Full-time" ? FULL_TIME_HOURS : employment === "Part-time" ? 24 : 0
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Check a new educator. Returns an error message per invalid field; empty when valid. */
export function validateNewEducator(input: NewEducator): NewEducatorErrors {
  const errors: NewEducatorErrors = {}

  if (!input.firstName.trim()) errors.firstName = "Enter a first name."
  else if (input.firstName.trim().length > 80) errors.firstName = "Keep it under 80 characters."
  if (!input.lastName.trim()) errors.lastName = "Enter a last name."
  else if (input.lastName.trim().length > 80) errors.lastName = "Keep it under 80 characters."

  if (input.email.trim() && !EMAIL.test(input.email.trim())) errors.email = "Enter a valid email address."
  if (input.phone.trim()) {
    const digits = input.phone.replace(/[\s()+-]/g, "")
    if (!/^\d{8,12}$/.test(digits)) errors.phone = "Enter a valid phone number."
  }

  if (!EDUCATOR_ROLES.includes(input.role)) errors.role = "Choose a role."
  if (!EMPLOYMENT_TYPES.includes(input.employment)) errors.employment = "Choose an employment type."

  if (!Number.isFinite(input.contractHours)) {
    errors.contractHours = "Enter contracted hours."
  } else if (input.employment === "Casual") {
    if (input.contractHours !== 0) errors.contractHours = "Casuals have no contracted hours."
  } else if (input.employment === "Full-time" && input.contractHours !== FULL_TIME_HOURS) {
    errors.contractHours = `Full-time is ${FULL_TIME_HOURS} hours a week.`
  } else if (input.employment === "Part-time" && (input.contractHours <= 0 || input.contractHours >= FULL_TIME_HOURS)) {
    errors.contractHours = `Part-time is more than 0 and under ${FULL_TIME_HOURS} hours a week.`
  } else if (input.contractHours * 10 !== Math.round(input.contractHours * 10)) {
    errors.contractHours = "Use at most one decimal place."
  }

  if (!Number.isFinite(input.hourlyRate) || input.hourlyRate <= 0) errors.hourlyRate = "Enter an hourly rate."
  else if (input.hourlyRate >= 500) errors.hourlyRate = "That rate looks too high."
  else if (Math.round(input.hourlyRate * 100) !== Math.round(input.hourlyRate * 1000) / 10)
    errors.hourlyRate = "Use dollars and cents, e.g. 32.50."

  const seen = new Set<CredentialType>()
  for (const c of input.credentials) {
    if (!CREDENTIAL_TYPES.includes(c.type) || seen.has(c.type)) continue
    seen.add(c.type)
    if (!isValid(parseISO(c.expiresOn)) || !/^\d{4}-\d{2}-\d{2}$/.test(c.expiresOn)) {
      errors[`credentials.${c.type}`] = "Enter a valid expiry date."
    }
  }

  // Everyone working at a children's service needs a Working with Children Check.
  const wwcc = input.credentials.find((c) => c.type === "WWCC")
  if (!wwcc || !wwcc.expiresOn) errors["credentials.WWCC"] = "A Working with Children Check is required."
  if (!wwcc?.reference.trim()) errors["credentials.WWCC.reference"] = "Enter the WWCC number."

  return errors
}

/** Credentials that will already be expired on `asOf`. Allowed, but worth a warning. */
export function expiredCredentials(input: Pick<NewEducator, "credentials">, asOf: IsoDate): CredentialType[] {
  return input.credentials
    .filter((c) => isValid(parseISO(c.expiresOn)) && differenceInCalendarDays(parseISO(c.expiresOn), parseISO(asOf)) < 0)
    .map((c) => c.type)
}
