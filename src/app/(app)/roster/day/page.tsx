import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon, ClockAlertIcon, ShieldCheckIcon, SmileIcon, UsersIcon } from "lucide-react"

import { CoverageLegend } from "@/components/roster/coverage-strip"
import { PageHeader, StatTile } from "@/components/roster/primitives"
import { RoomTimeline } from "@/components/roster/room-timeline"
import { RosterViewSwitch } from "@/components/roster/view-switch"
import { Button } from "@/components/ui/button"
import { getDayCoverage, getRosterWeek, getToday } from "@/lib/api"
import { addDaysIso, formatDay, formatTimeRange, weekdayIndex, weekdaysOf, weekStartOf } from "@/lib/domain/time"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Day & ratios" }

/** Step to the previous/next weekday. */
function stepWeekday(date: string, direction: 1 | -1) {
  let next = addDaysIso(date, direction)
  while (weekdayIndex(next) > 4) next = addDaysIso(next, direction)
  return next
}

export default async function DayPage({ searchParams }: PageProps<"/roster/day">) {
  const { date: dateParam } = await searchParams
  const now = await getToday()
  let date = typeof dateParam === "string" ? dateParam : now
  if (weekdayIndex(date) > 4) date = stepWeekday(date, 1)

  const [coverage, week] = await Promise.all([getDayCoverage(date), getRosterWeek(weekStartOf(date))])
  const { centre, educators } = week
  const dayShifts = week.shifts.filter((s) => s.date === date)
  const openToday = week.openShifts.filter((o) => o.date === date)
  const supportShifts = dayShifts.filter((s) => !coverage.some((c) => c.room.id === s.roomId))

  const peakChildren = coverage.reduce((sum, c) => sum + c.summary.peakChildren, 0)
  const activeSlots = coverage.reduce((sum, c) => sum + c.summary.activeSlots, 0)
  const underSlots = coverage.reduce((sum, c) => sum + c.summary.underSlots, 0)
  const compliance = activeSlots === 0 ? 1 : (activeSlots - underSlots) / activeSlots

  return (
    <>
      <PageHeader
        title="Day & ratios"
        description={`${formatDay(date, "EEEE d MMMM yyyy")} · Open ${formatTimeRange(centre.opensAt, centre.closesAt)}`}
        actions={<RosterViewSwitch value="day" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/roster/day?date=${stepWeekday(date, -1)}`} aria-label="Previous day">
              <ChevronLeftIcon />
            </Link>
          </Button>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            {weekdaysOf(weekStartOf(date)).map((d) => (
              <Link
                key={d}
                href={`/roster/day?date=${d}`}
                aria-current={d === date ? "date" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                  d === date && "bg-background text-foreground shadow-sm",
                )}
              >
                <span className={cn(d === now && "text-primary")}>{formatDay(d, "EEE")}</span>
                <span className="font-medium">{formatDay(d, "d")}</span>
              </Link>
            ))}
          </div>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/roster/day?date=${stepWeekday(date, 1)}`} aria-label="Next day">
              <ChevronRightIcon />
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6 px-4 pt-4 pb-8 md:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={SmileIcon} tint="pink" label="Children booked" value={peakChildren} hint="from CCS bookings" />
          <StatTile
            icon={UsersIcon}
            tint="blue"
            label="Educators rostered"
            value={dayShifts.filter((s) => educators.find((e) => e.id === s.educatorId)?.countsInRatio).length}
            hint={`+ ${supportShifts.length} support staff`}
          />
          <StatTile
            icon={ShieldCheckIcon}
            tint="green"
            label="Ratio compliance"
            value={`${Math.round(compliance * 100)}%`}
            tone={underSlots === 0 ? "default" : "breach"}
            hint={underSlots === 0 ? "Every room, all day" : `${underSlots / 2}h under ratio across rooms`}
          />
          <StatTile
            icon={ClockAlertIcon}
            tint="peach"
            label="Open shifts"
            value={openToday.length}
            tone={openToday.length > 0 ? "warn" : "default"}
            hint={openToday.length > 0 ? "need an educator" : "nothing to fill"}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Rooms</h2>
          <CoverageLegend />
        </div>

        {coverage.map((c) => (
          <RoomTimeline
            key={c.room.id}
            room={c.room}
            slots={c.slots}
            summary={c.summary}
            shifts={c.shifts}
            openShifts={openToday.filter((o) => o.roomId === c.room.id)}
            educators={educators}
            opensAt={centre.opensAt}
            closesAt={centre.closesAt}
          />
        ))}

        {supportShifts.length > 0 && (
          <RoomTimeline
            shifts={supportShifts}
            educators={educators}
            opensAt={centre.opensAt}
            closesAt={centre.closesAt}
          />
        )}
      </div>
    </>
  )
}
