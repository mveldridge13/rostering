import type { Metadata } from "next"

import { RosterWorkspace } from "@/components/roster/roster-workspace"
import { getAttendanceForDays, getRosterWeek, getToday } from "@/lib/api"
import { shiftCost } from "@/lib/domain/compliance"
import { addDaysIso, weekStartOf } from "@/lib/domain/time"

export const metadata: Metadata = { title: "Roster" }

export default async function RosterPage({ searchParams }: PageProps<"/roster">) {
  const { week: weekParam } = await searchParams
  const now = await getToday()
  const weekStart = weekStartOf(typeof weekParam === "string" ? weekParam : now)
  const [week, lastWeek] = await Promise.all([getRosterWeek(weekStart), getRosterWeek(addDaysIso(weekStart, -7))])
  const attendance = await getAttendanceForDays(week.days)
  const lastWeekCost = lastWeek.shifts.reduce(
    (sum, s) => sum + shiftCost(s, lastWeek.educators.find((e) => e.id === s.educatorId)!),
    0,
  )

  return <RosterWorkspace key={weekStart} week={week} attendance={attendance} today={now} lastWeekCost={lastWeekCost} />
}
