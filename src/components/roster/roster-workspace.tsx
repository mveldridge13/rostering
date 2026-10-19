"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CopyIcon,
  DollarSignIcon,
  SendIcon,
  ShieldCheckIcon,
  SmileIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RosterWeek } from "@/lib/api"
import { roomCoverage, shiftCost, summariseCoverage } from "@/lib/domain/compliance"
import { addDaysIso, formatDay } from "@/lib/domain/time"
import type { AttendanceForecast, IsoDate } from "@/lib/domain/types"

import { PageHeader, StatTile } from "./primitives"
import { RosterGrid, type RoomDayStats } from "./roster-grid"
import { RosterRail } from "./roster-rail"
import { ShiftSheet, type ShiftEditorState } from "./shift-sheet"
import { RosterViewSwitch } from "./view-switch"

export function RosterWorkspace({
  week,
  attendance,
  today,
  lastWeekCost,
}: {
  week: RosterWeek
  attendance: Record<IsoDate, AttendanceForecast[]>
  today: IsoDate
  lastWeekCost: number
}) {
  const { centre, rooms, educators, days, leave } = week
  const weekStart = days[0]
  const [shifts, setShifts] = useState(week.shifts)
  const [openShifts, setOpenShifts] = useState(week.openShifts)
  const [editor, setEditor] = useState<ShiftEditorState | null>(null)

  const isPublished = shifts.length > 0 && shifts.every((s) => s.status === "published")

  // Ratio coverage per room per day, recomputed whenever the roster changes.
  const { roomStats, activeSlots, underSlots, gaps } = useMemo(() => {
    const stats: Record<string, Record<IsoDate, RoomDayStats>> = {}
    const gapList: { roomName: string; date: IsoDate; hours: number }[] = []
    let active = 0
    let under = 0
    for (const room of rooms) {
      stats[room.id] = {}
      for (const date of days) {
        const forecast = attendance[date]?.find((a) => a.roomId === room.id)
        if (!forecast) continue
        const summary = summariseCoverage(
          roomCoverage(room, forecast, shifts.filter((s) => s.date === date), educators, centre.opensAt),
        )
        const hoursUnder = summary.underSlots * (forecast.slotMinutes / 60)
        stats[room.id][date] = { peakChildren: summary.peakChildren, hoursUnder }
        active += summary.activeSlots
        under += summary.underSlots
        if (hoursUnder > 0) gapList.push({ roomName: room.name, date, hours: hoursUnder })
      }
    }
    return { roomStats: stats, activeSlots: active, underSlots: under, gaps: gapList }
  }, [rooms, days, attendance, shifts, educators, centre.opensAt])

  const educatorById = new Map(educators.map((e) => [e.id, e]))
  const cost = shifts.reduce((sum, s) => sum + shiftCost(s, educatorById.get(s.educatorId)!), 0)
  const costDelta = lastWeekCost > 0 ? (cost - lastWeekCost) / lastWeekCost : 0
  const compliance = activeSlots === 0 ? 1 : (activeSlots - underSlots) / activeSlots
  const rosteredStaff = new Set(shifts.map((s) => s.educatorId)).size
  const avgChildren = Math.round(
    days.reduce((sum, d) => sum + rooms.reduce((s, r) => s + (roomStats[r.id]?.[d]?.peakChildren ?? 0), 0), 0) / days.length,
  )

  function save(draft: { educatorId: string; roomId: string; start: number; end: number; breakMinutes: number }) {
    if (!editor) return
    if (editor.mode === "edit") {
      setShifts((all) => all.map((s) => (s.id === editor.shift.id ? { ...s, ...draft } : s)))
    } else {
      const date = editor.mode === "fill" ? editor.openShift.date : editor.date
      setShifts((all) => [
        ...all,
        { id: `${draft.educatorId}-${date}-${Date.now()}`, date, tags: [], status: isPublished ? "published" : "draft", ...draft },
      ])
      if (editor.mode === "fill") setOpenShifts((all) => all.filter((o) => o.id !== editor.openShift.id))
    }
    setEditor(null)
  }

  function remove() {
    if (editor?.mode !== "edit") return
    setShifts((all) => all.filter((s) => s.id !== editor.shift.id))
    setEditor(null)
  }

  function publish() {
    setShifts((all) => all.map((s) => ({ ...s, status: "published" })))
  }

  return (
    <>
      <PageHeader
        title="Weekly Roster"
        description={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={`/roster?week=${addDaysIso(weekStart, -7)}`} aria-label="Previous week">
                <ChevronLeftIcon />
              </Link>
            </Button>
            <span className="font-medium text-foreground/80">
              {formatDay(days[0], "EEE d MMM")} – {formatDay(days[4], "EEE d MMM yyyy")}
            </span>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={`/roster?week=${addDaysIso(weekStart, 7)}`} aria-label="Next week">
                <ChevronRightIcon />
              </Link>
            </Button>
          </div>
        }
        actions={
          <>
            <RosterViewSwitch value="week" />
            <Select defaultValue="marrickville">
              <SelectTrigger className="h-9 w-56 rounded-xl bg-card" aria-label="Centre">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marrickville">{centre.name}</SelectItem>
                <SelectItem value="ashfield">Little Wattles Ashfield</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-9 rounded-xl bg-card">
              <CopyIcon />
              Copy last week
            </Button>
            <Button className="h-9 rounded-xl bg-room-preschool-soft text-room-preschool-ink hover:bg-room-preschool-soft/70">
              <SparklesIcon />
              Auto-fill
            </Button>
            <Button className="h-9 rounded-xl px-5 shadow-sm" disabled={isPublished} onClick={publish}>
              {isPublished ? <CircleCheckIcon /> : <SendIcon />}
              {isPublished ? "Published" : "Publish"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 px-4 pt-4 pb-8 md:px-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={UsersIcon}
              tint="blue"
              label="Staff rostered"
              value={rosteredStaff}
              hint={
                openShifts.length === 0 ? (
                  `of ${educators.length} on the team`
                ) : (
                  <span className="font-semibold text-warn-foreground">{openShifts.length} open shifts</span>
                )
              }
              status={openShifts.length === 0 ? <CircleCheckIcon className="size-5 fill-ok text-card" /> : undefined}
            />
            <StatTile icon={SmileIcon} tint="pink" label="Children / day" value={avgChildren} hint={`across ${rooms.length} rooms`} />
            <StatTile
              icon={ShieldCheckIcon}
              tint="green"
              label="Ratio compliance"
              value={`${Math.round(compliance * 100)}%`}
              tone={underSlots === 0 ? "default" : "breach"}
              hint={underSlots === 0 ? "all rooms covered" : `${gaps.length} ${gaps.length === 1 ? "gap" : "gaps"} to fix`}
            />
            <StatTile
              icon={DollarSignIcon}
              tint="peach"
              label="Labour cost"
              value={`$${Math.round(cost).toLocaleString("en-AU")}`}
              hint={
                <span className={costDelta > 0 ? "text-warn-foreground" : "text-ok-foreground"}>
                  {costDelta > 0 ? "↑" : "↓"} {Math.abs(costDelta * 100).toFixed(0)}% vs last wk
                </span>
              }
            />
          </div>

          <RosterGrid
            rooms={rooms}
            educators={educators}
            days={days}
            shifts={shifts}
            openShifts={openShifts}
            leave={leave}
            roomStats={roomStats}
            today={today}
            onEdit={setEditor}
          />
        </div>

        <RosterRail
          isPublished={isPublished}
          onPublish={publish}
          educators={educators}
          shifts={shifts}
          openShifts={openShifts}
          leave={leave}
          gaps={gaps}
          cost={cost}
          budget={centre.weeklyWageBudget}
          rooms={rooms}
          today={today}
        />
      </div>

      <ShiftSheet
        state={editor}
        onOpenChange={(open) => !open && setEditor(null)}
        rooms={rooms}
        educators={educators}
        shifts={shifts}
        today={today}
        onSave={save}
        onDelete={remove}
      />
    </>
  )
}
