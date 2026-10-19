import { differenceInCalendarDays, parseISO } from "date-fns"

import type { AttendanceForecast, Credential, Educator, IsoDate, Room, Shift } from "./types"

export type CoverageStatus = "closed" | "under" | "met" | "over"

export interface CoverageSlot {
  start: number
  children: number
  required: number
  rostered: number
  status: CoverageStatus
}

/** Educators required for a headcount at a given ratio. */
export function requiredEducators(children: number, childrenPerEducator: number): number {
  return children === 0 ? 0 : Math.ceil(children / childrenPerEducator)
}

/**
 * Compare rostered in-ratio educators against the ratio requirement for each
 * slot of the day. Breaks are not yet deducted; that belongs in the engine.
 */
export function roomCoverage(
  room: Room,
  forecast: AttendanceForecast,
  shifts: Shift[],
  educators: Educator[],
  opensAt: number,
): CoverageSlot[] {
  const inRatio = new Set(educators.filter((e) => e.countsInRatio).map((e) => e.id))
  const roomShifts = shifts.filter((s) => s.roomId === room.id && inRatio.has(s.educatorId))

  return forecast.children.map((children, i) => {
    const start = opensAt + i * forecast.slotMinutes
    const mid = start + forecast.slotMinutes / 2
    const required = requiredEducators(children, room.childrenPerEducator)
    const rostered = roomShifts.filter((s) => s.start <= mid && s.end > mid).length
    const status: CoverageStatus =
      children === 0 && rostered === 0
        ? "closed"
        : rostered < required
          ? "under"
          : rostered - required >= 3
            ? "over"
            : "met"
    return { start, children, required, rostered, status }
  })
}

export function summariseCoverage(slots: CoverageSlot[]) {
  const active = slots.filter((s) => s.status !== "closed")
  const under = active.filter((s) => s.status === "under")
  const over = active.filter((s) => s.status === "over")
  return {
    activeSlots: active.length,
    underSlots: under.length,
    overSlots: over.length,
    compliance: active.length === 0 ? 1 : (active.length - under.length) / active.length,
    peakChildren: Math.max(0, ...slots.map((s) => s.children)),
    firstGap: under[0],
  }
}

export type CredentialState = "valid" | "expiring" | "expired"

export function credentialState(credential: Credential, asOf: IsoDate, warnDays = 30): CredentialState {
  const days = differenceInCalendarDays(parseISO(credential.expiresOn), parseISO(asOf))
  if (days < 0) return "expired"
  if (days <= warnDays) return "expiring"
  return "valid"
}

export function daysUntil(date: IsoDate, asOf: IsoDate): number {
  return differenceInCalendarDays(parseISO(date), parseISO(asOf))
}

export function worstCredentialState(educator: Educator, asOf: IsoDate): CredentialState {
  const states = educator.credentials.map((c) => credentialState(c, asOf))
  if (states.includes("expired")) return "expired"
  if (states.includes("expiring")) return "expiring"
  return "valid"
}

export function paidHours(shift: Pick<Shift, "start" | "end" | "breakMinutes">): number {
  return (shift.end - shift.start - shift.breakMinutes) / 60
}

/** Casuals attract a 25% loading under the Children's Services Award. */
export function shiftCost(shift: Shift, educator: Educator): number {
  const loading = educator.employment === "Casual" ? 1.25 : 1
  return paidHours(shift) * educator.hourlyRate * loading
}
