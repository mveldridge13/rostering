import type { Metadata } from "next"
import { UserPlusIcon } from "lucide-react"

import { EducatorsTable } from "@/components/educators-table"
import { PageHeader } from "@/components/roster/primitives"
import { Button } from "@/components/ui/button"
import { getRosterWeek, getToday } from "@/lib/api"
import { paidHours } from "@/lib/domain/compliance"
import { weekStartOf } from "@/lib/domain/time"

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
        description={`${educators.length} staff · synced from your CCS software`}
        actions={
          <Button variant="outline">
            <UserPlusIcon />
            Add educator
          </Button>
        }
      />
      <div className="px-4 pt-4 pb-8 md:px-8">
        <EducatorsTable educators={educators} rooms={rooms} hoursThisWeek={hoursThisWeek} today={now} />
      </div>
    </>
  )
}
