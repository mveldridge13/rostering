import Link from "next/link"
import {
  DollarSignIcon,
  ShieldCheckIcon,
  SmileIcon,
  UsersIcon,
  ArrowRightIcon,
  BadgeAlertIcon,
  CalendarClockIcon,
  CircleCheckIcon,
  FileClockIcon,
  TriangleAlertIcon,
  UserRoundXIcon,
} from "lucide-react"

import { NotConnectedNotice } from "@/components/not-connected"
import { CoverageStrip } from "@/components/roster/coverage-strip"
import { PageHeader, RoomDot, StatTile } from "@/components/roster/primitives"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getDayCoverage, getRosterWeek, getToday } from "@/lib/api"
import { credentialState, daysUntil, shiftCost } from "@rostering/domain/compliance"
import { addDaysIso, formatDay, formatMinutes, weekdayIndex, weekStartOf } from "@rostering/domain/time"
import { cn } from "@/lib/utils"

type Attention = {
  id: string
  tone: "breach" | "warn" | "info"
  icon: typeof TriangleAlertIcon
  title: string
  detail: string
  href: string
}

export default async function TodayPage() {
  const now = await getToday()
  // Long day care runs weekdays; on a weekend, look ahead to Monday.
  const date = weekdayIndex(now) > 4 ? addDaysIso(weekStartOf(now), 7) : now
  const weekStart = weekStartOf(date)

  const [coverage, week, nextWeek] = await Promise.all([
    getDayCoverage(date),
    getRosterWeek(weekStart),
    getRosterWeek(addDaysIso(weekStart, 7)),
  ])
  const { centre, educators } = week
  const todayShifts = week.shifts.filter((s) => s.date === date)
  const inRatioToday = todayShifts.filter((s) => educators.find((e) => e.id === s.educatorId)?.countsInRatio)

  const peakChildren = coverage.reduce((sum, c) => sum + c.summary.peakChildren, 0)
  const activeSlots = coverage.reduce((sum, c) => sum + c.summary.activeSlots, 0)
  const underSlots = coverage.reduce((sum, c) => sum + c.summary.underSlots, 0)
  const compliance = activeSlots === 0 ? 1 : (activeSlots - underSlots) / activeSlots
  const weekCost = week.shifts.reduce((sum, s) => sum + shiftCost(s, educators.find((e) => e.id === s.educatorId)!), 0)

  const attention: Attention[] = []
  for (const c of coverage.filter((c) => c.summary.underSlots > 0)) {
    attention.push({
      id: `gap-${c.room.id}`,
      tone: "breach",
      icon: TriangleAlertIcon,
      title: `${c.room.name} is under ratio from ${formatMinutes(c.summary.firstGap!.start)}`,
      detail: `${c.summary.underSlots / 2}h short today. Assign cover or move an educator.`,
      href: `/roster/day?date=${date}`,
    })
  }
  for (const o of week.openShifts.filter((o) => o.date >= date)) {
    attention.push({
      id: o.id,
      tone: "warn",
      icon: CalendarClockIcon,
      title: `Open shift ${o.date === date ? "today" : formatDay(o.date, "EEEE")}`,
      detail: o.reason,
      href: "/roster",
    })
  }
  for (const e of educators) {
    for (const cred of e.credentials) {
      const state = credentialState(cred, date)
      if (state === "valid") continue
      const days = daysUntil(cred.expiresOn, date)
      const rostered = week.shifts.some((s) => s.educatorId === e.id && s.date >= date)
      attention.push({
        id: `cred-${e.id}-${cred.type}`,
        tone: state === "expired" ? "breach" : "warn",
        icon: state === "expired" ? UserRoundXIcon : BadgeAlertIcon,
        title:
          state === "expired"
            ? `${e.firstName} ${e.lastName}'s ${cred.type} has expired`
            : `${e.firstName} ${e.lastName}'s ${cred.type} expires in ${days} days`,
        detail:
          state === "expired" && rostered
            ? "Still rostered this week. Resolve before their next shift."
            : `Expires ${formatDay(cred.expiresOn, "d MMM yyyy")}`,
        href: "/educators",
      })
    }
  }
  if (nextWeek.shifts.some((s) => s.status === "draft")) {
    attention.push({
      id: "publish-next",
      tone: "info",
      icon: FileClockIcon,
      title: "Next week's roster is still a draft",
      detail: `Educators can't see shifts for ${formatDay(nextWeek.days[0], "d MMM")} onwards until it's published.`,
      href: `/roster?week=${nextWeek.days[0]}`,
    })
  }
  const budget = centre?.weeklyWageBudget ?? 0
  const hasRooms = coverage.length > 0
  const toneOrder = { breach: 0, warn: 1, info: 2 }
  attention.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone])

  return (
    <>
      <PageHeader
        title={date === now ? "Today" : "Monday"}
        description={[formatDay(date, "EEEE d MMMM"), centre?.name].filter(Boolean).join(" · ")}
        actions={
          <Button asChild>
            <Link href="/roster">
              Open week roster
              <ArrowRightIcon />
            </Link>
          </Button>
        }
      />

      <NotConnectedNotice
        reads={[
          "Centre details",
          "Rooms",
          "Staff and credentials",
          "Today's bookings",
          "This week's shifts, open shifts and leave",
          "Next week's roster status",
        ]}
      />

      <div className="flex flex-col gap-6 px-4 pt-4 pb-8 md:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={SmileIcon} tint="pink" label="Children booked" value={peakChildren} hint={`Across ${coverage.length} rooms`} />
          <StatTile icon={UsersIcon} tint="blue" label="Educators on the floor" value={inRatioToday.length} hint={`${todayShifts.length - inRatioToday.length} support staff`} />
          <StatTile
            icon={ShieldCheckIcon}
            tint="green"
            label="Ratio compliance"
            value={hasRooms ? `${Math.round(compliance * 100)}%` : "—"}
            tone={underSlots === 0 ? "default" : "breach"}
            hint={!hasRooms ? "No rooms" : underSlots === 0 ? "All rooms covered all day" : `${underSlots / 2}h under ratio`}
          />
          <StatTile
            icon={DollarSignIcon}
            tint="peach"
            label="Wages this week"
            value={`$${(weekCost / 1000).toFixed(1)}k`}
            tone={budget > 0 && weekCost > budget ? "warn" : "default"}
            hint={budget > 0 ? `of $${(budget / 1000).toFixed(1)}k budget` : "No budget set"}
          >
            <Progress value={budget > 0 ? Math.min(100, (weekCost / budget) * 100) : 0} className="mt-2 h-1.5" />
          </StatTile>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle>Rooms today</CardTitle>
              <CardDescription>Ratio coverage by half hour, from opening to close</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/roster/day?date=${date}`}>
                    Day view
                    <ArrowRightIcon />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {!hasRooms && <p className="py-6 text-center text-sm text-muted-foreground">No rooms to show.</p>}
              {coverage.map(({ room, slots, summary, shifts }) => (
                <div key={room.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <RoomDot room={room} />
                      {room.name}
                      <span className="text-xs font-normal text-muted-foreground">1:{room.childrenPerEducator}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {summary.peakChildren}/{room.licensedPlaces} children · {shifts.length} educators
                    </div>
                    <div
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 text-xs",
                        summary.underSlots === 0 ? "text-ok-foreground" : "font-medium text-breach-foreground",
                      )}
                    >
                      {summary.underSlots === 0 ? <CircleCheckIcon className="size-3.5" /> : <TriangleAlertIcon className="size-3.5" />}
                      {summary.underSlots === 0 ? "Ratios met" : `${summary.underSlots / 2}h under ratio`}
                    </div>
                  </div>
                  <div>
                    <CoverageStrip slots={slots} capacity={room.licensedPlaces} height="h-10" />
                    <div className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
                      <span>{centre && formatMinutes(centre.opensAt)}</span>
                      <span>12pm</span>
                      <span>{centre && formatMinutes(centre.closesAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>
                {!hasRooms ? "Nothing to check yet" : attention.length === 0 ? "You're all set" : `${attention.length} items across this week`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-2">
              {hasRooms && attention.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <CircleCheckIcon className="size-6 text-ok" />
                  Ratios covered, credentials current, roster published.
                </div>
              )}
              {attention.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                      item.tone === "breach" && "bg-breach/10 text-breach-foreground",
                      item.tone === "warn" && "bg-warn/15 text-warn-foreground",
                      item.tone === "info" && "bg-primary/10 text-primary",
                    )}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm leading-snug font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
