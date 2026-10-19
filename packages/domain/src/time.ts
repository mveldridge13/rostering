import { addDays, format, parseISO, startOfWeek } from "date-fns"

import type { IsoDate, Minutes } from "./types"

export function toIsoDate(date: Date): IsoDate {
  return format(date, "yyyy-MM-dd")
}

export function today(): IsoDate {
  return toIsoDate(new Date())
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: IsoDate): IsoDate {
  return toIsoDate(startOfWeek(parseISO(date), { weekStartsOn: 1 }))
}

export function addDaysIso(date: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(parseISO(date), days))
}

/** Monday–Friday of the week starting `weekStart`. Long day care runs weekdays. */
export function weekdaysOf(weekStart: IsoDate): IsoDate[] {
  return [0, 1, 2, 3, 4].map((offset) => addDaysIso(weekStart, offset))
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(date: IsoDate): number {
  return (parseISO(date).getDay() + 6) % 7
}

export function formatMinutes(minutes: Minutes): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h >= 12 ? "pm" : "am"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`
}

export function formatTimeRange(start: Minutes, end: Minutes): string {
  return `${formatMinutes(start)} – ${formatMinutes(end)}`
}

export function formatDay(date: IsoDate, pattern = "EEE d MMM"): string {
  return format(parseISO(date), pattern)
}

export function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

/** Compact clock time without am/pm, e.g. 390 → "6:30". Used where space is tight. */
export function formatClock(minutes: Minutes): string {
  const h = Math.floor(minutes / 60) % 12 || 12
  return `${h}:${String(minutes % 60).padStart(2, "0")}`
}
