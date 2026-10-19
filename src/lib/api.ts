// Data access boundary for the UI. Everything here is async so pages are
// already shaped for the real rostering engine API; today it reads mock data.

import { connection } from "next/server"

import { roomCoverage, summariseCoverage } from "@/lib/domain/compliance"
import { today, weekdaysOf, weekStartOf } from "@/lib/domain/time"
import type { IsoDate } from "@/lib/domain/types"
import {
  centre,
  educators,
  getAttendance,
  getLeave,
  getOpenShifts,
  getShifts,
  rooms,
} from "@/lib/mock/data"

/** Today's date, resolved at request time rather than at build. */
export async function getToday() {
  await connection()
  return today()
}

export async function getCentre() {
  return centre
}

export async function getRooms() {
  return rooms
}

export async function getEducators() {
  return educators
}

export async function getRosterWeek(weekStart: IsoDate) {
  return {
    centre,
    rooms,
    educators,
    days: weekdaysOf(weekStart),
    shifts: getShifts(weekStart),
    openShifts: getOpenShifts(weekStart),
    leave: getLeave(weekStart),
  }
}

/** Per-room ratio coverage for a single day. */
export async function getDayCoverage(date: IsoDate) {
  const weekStart = weekStartOf(date)
  const shifts = getShifts(weekStart).filter((s) => s.date === date)
  const attendance = getAttendance(date)

  return rooms.map((room) => {
    const forecast = attendance.find((a) => a.roomId === room.id)!
    const slots = roomCoverage(room, forecast, shifts, educators, centre.opensAt)
    return {
      room,
      slots,
      summary: summariseCoverage(slots),
      shifts: shifts.filter((s) => s.roomId === room.id),
    }
  })
}

/** Expected children per room per half hour, from CCS bookings. */
export async function getAttendanceForDays(dates: IsoDate[]) {
  return Object.fromEntries(dates.map((d) => [d, getAttendance(d)]))
}

export type RosterWeek = Awaited<ReturnType<typeof getRosterWeek>>
export type DayCoverage = Awaited<ReturnType<typeof getDayCoverage>>
