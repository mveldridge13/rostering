// Data access boundary for the UI. Every screen reads through here and
// nothing else, so connecting the backend means changing only this file.
//
// NOT CONNECTED YET: there is no API, so every function returns empty data.
// Each will call the backend API through the typed client once it exists.

import { connection } from "next/server"

import type { CoverageSlot, summariseCoverage } from "@rostering/domain/compliance"
import { today, weekdaysOf } from "@rostering/domain/time"
import type { AttendanceForecast, Centre, Educator, IsoDate, Leave, OpenShift, Room, Shift } from "@rostering/domain/types"

/** Today's date, resolved at request time rather than at build. */
export async function getToday() {
  await connection()
  return today()
}

/** The current centre, or null when none is available. */
export async function getCentre(): Promise<Centre | null> {
  return null
}

export async function getRooms(): Promise<Room[]> {
  return []
}

export async function getEducators(): Promise<Educator[]> {
  return []
}

export interface RosterWeek {
  centre: Centre | null
  rooms: Room[]
  educators: Educator[]
  days: IsoDate[]
  shifts: Shift[]
  openShifts: OpenShift[]
  leave: Leave[]
}

export async function getRosterWeek(weekStart: IsoDate): Promise<RosterWeek> {
  return {
    centre: await getCentre(),
    rooms: await getRooms(),
    educators: await getEducators(),
    days: weekdaysOf(weekStart),
    shifts: [],
    openShifts: [],
    leave: [],
  }
}

export interface RoomDayCoverage {
  room: Room
  slots: CoverageSlot[]
  summary: ReturnType<typeof summariseCoverage>
  shifts: Shift[]
}

/** Per-room ratio coverage for a single day. */
export async function getDayCoverage(date: IsoDate): Promise<RoomDayCoverage[]> {
  void date // used once connected
  return []
}

/** Expected children per room per half hour, from CCS bookings. */
export async function getAttendanceForDays(dates: IsoDate[]): Promise<Record<IsoDate, AttendanceForecast[]>> {
  return Object.fromEntries(dates.map((d) => [d, []]))
}

export type DayCoverage = RoomDayCoverage[]
