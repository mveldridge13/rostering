import type { Metadata } from "next"
import { AddEducator } from "@/components/add-educator"
import { EducatorsTable } from "@/components/educators-table"
import { NotConnectedNotice } from "@/components/not-connected"
import { PageHeader } from "@/components/roster/primitives"
import { getRosterWeek, getToday } from "@/lib/api"
import { paidHours } from "@rostering/domain/compliance"
import { weekStartOf } from "@rostering/domain/time"

export const metadata: Metadata = { title: "Educators" }

export default async function EducatorsPage() {
  const now = await getToday()
  const { educators, rooms, shifts } = await getRosterWeek(weekStartOf(now))
  const hoursThisWeek: Record<string, number> = {}
  for (const s of shifts) hoursThisWeek[s.educatorId] = (hoursThisWeek[s.educatorId] ?? 0) + paidHours(s)

  return (
    <>
      <PageHeader
        title="Educators"
        description={`${educators.length} staff`}
        actions={<AddEducator rooms={rooms} today={now} />}
      />
      <NotConnectedNotice
        reads={["Staff", "Credentials", "Rooms", "This week's shifts (hours worked)"]}
        saves={["Add educator"]}
      />
      <div className="px-4 pt-4 pb-8 md:px-8">
        <EducatorsTable educators={educators} rooms={rooms} hoursThisWeek={hoursThisWeek} today={now} />
      </div>
    </>
  )
}
