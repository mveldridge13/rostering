"use client"

import { Fragment } from "react"
import { PlusIcon, TriangleAlertIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paidHours, worstCredentialState } from "@/lib/domain/compliance"
import { formatClock, formatDay, formatHours, formatTimeRange } from "@/lib/domain/time"
import type { Educator, IsoDate, Leave, OpenShift, Room, Shift } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

import { ageGroupShort, EducatorAvatar, Panel, RoomIcon, roleShort, roomThemeClasses } from "./primitives"
import type { ShiftEditorState } from "./shift-sheet"

export interface RoomDayStats {
  peakChildren: number
  hoursUnder: number
}

const gridCols = "grid-cols-[minmax(12.5rem,14rem)_repeat(5,minmax(6.75rem,1fr))]"

export function RosterGrid({
  rooms,
  educators,
  days,
  shifts,
  openShifts,
  leave,
  roomStats,
  today,
  onEdit,
}: {
  rooms: Room[]
  educators: Educator[]
  days: IsoDate[]
  shifts: Shift[]
  openShifts: OpenShift[]
  leave: Leave[]
  roomStats: Record<string, Record<IsoDate, RoomDayStats>>
  today: IsoDate
  onEdit: (state: ShiftEditorState) => void
}) {
  const roomById = new Map(rooms.map((r) => [r.id, r]))

  const groups: { key: string; room: Room | null; members: Educator[] }[] = [
    ...rooms.map((room) => ({ key: room.id, room, members: educators.filter((e) => e.primaryRoomId === room.id) })),
    { key: "support", room: null, members: educators.filter((e) => !e.primaryRoomId) },
  ]

  const dayTotals = days.map((date) =>
    shifts.filter((s) => s.date === date).reduce((sum, s) => sum + paidHours(s), 0),
  )

  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className={cn("grid min-w-[46rem] text-sm", gridCols)} role="table" aria-label="Weekly roster">
          {/* Day headings */}
          <div className="sticky left-0 z-10 flex items-end bg-card px-4 pt-4 pb-3 text-sm font-semibold">Staff</div>
          {days.map((date) => (
            <div key={date} className="flex flex-col items-center border-l border-border/60 pt-4 pb-3 text-center">
              <div className={cn("text-sm font-semibold", date === today && "text-primary")}>{formatDay(date, "EEE")}</div>
              <div className={cn("text-xs text-muted-foreground", date === today && "text-primary")}>
                {formatDay(date, "d MMM")}
              </div>
              {date === today && <span className="mt-1 h-0.5 w-6 rounded-full bg-primary" />}
            </div>
          ))}

          {groups.map((group) => {
            const theme = group.room ? roomThemeClasses[group.room.theme] : null
            return (
              <Fragment key={group.key}>
                {/* Room band */}
                <div className={cn("sticky left-0 z-10 flex items-center gap-2.5 px-4 py-2", theme?.band ?? "bg-muted/70", "border-y border-border/60")}>
                  {group.room ? <RoomIcon room={group.room} /> : null}
                  <div className="min-w-0 leading-tight">
                    <div className="truncate font-semibold">{group.room ? group.room.name : "Floating & support"}</div>
                    {group.room && (
                      <div className="text-xs text-muted-foreground">
                        {ageGroupShort[group.room.ageGroup]} · 1:{group.room.childrenPerEducator}
                      </div>
                    )}
                  </div>
                </div>
                {days.map((date) => {
                  const stats = group.room ? roomStats[group.room.id]?.[date] : undefined
                  return (
                    <div
                      key={date}
                      className={cn(
                        "flex items-center justify-center gap-1.5 border-y border-border/60 px-2 py-2 text-xs",
                        theme?.band ?? "bg-muted/70",
                      )}
                    >
                      {stats &&
                        (stats.hoursUnder > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 rounded-full bg-breach px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-white">
                                <TriangleAlertIcon className="size-3" />
                                {formatHours(stats.hoursUnder)} short
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {stats.peakChildren} children · {formatHours(stats.hoursUnder)} under ratio. Open the day view to see when.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="whitespace-nowrap text-muted-foreground tabular-nums">{stats.peakChildren} children</span>
                        ))}
                    </div>
                  )
                })}

                {/* Open shifts needing cover */}
                {group.room && openShifts.some((o) => o.roomId === group.room!.id) && (
                  <>
                    <div className="sticky left-0 z-10 flex items-center gap-3 bg-card px-4 py-2">
                      <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-warn text-warn-foreground">
                        <TriangleAlertIcon className="size-3.5" />
                      </span>
                      <div className="leading-tight">
                        <div className="font-semibold text-warn-foreground">Open shift</div>
                        <div className="text-xs text-muted-foreground">Needs an educator</div>
                      </div>
                    </div>
                    {days.map((date) => (
                      <div key={date} className="flex flex-col justify-center gap-1 px-1.5 py-1.5">
                        {openShifts
                          .filter((o) => o.roomId === group.room!.id && o.date === date)
                          .map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => onEdit({ mode: "fill", openShift: o })}
                              className="rounded-lg border border-dashed border-warn bg-warn/10 py-2 text-center text-[0.8rem] font-semibold text-warn-foreground tabular-nums transition-colors hover:bg-warn/20"
                            >
                              {formatClock(o.start)} – {formatClock(o.end)}
                            </button>
                          ))}
                      </div>
                    ))}
                  </>
                )}

                {group.members.map((educator, i) => {
                  const educatorShifts = shifts.filter((s) => s.educatorId === educator.id)
                  const hours = educatorShifts.reduce((sum, s) => sum + paidHours(s), 0)
                  const credState = worstCredentialState(educator, today)
                  const overContract = educator.contractHours > 0 && hours > educator.contractHours
                  const rowBorder = i > 0 && "border-t border-border/50"
                  return (
                    <Fragment key={educator.id}>
                      <div className={cn("sticky left-0 z-10 flex items-center gap-3 bg-card px-4 py-2", rowBorder)}>
                        <EducatorAvatar educator={educator} className="size-8" />
                        <div className="min-w-0 leading-tight">
                          <div className="flex items-center gap-1.5 truncate font-semibold">
                            {educator.firstName} {educator.lastName}
                            {credState !== "valid" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn("size-1.5 shrink-0 rounded-full", credState === "expired" ? "bg-breach" : "bg-warn")} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {credState === "expired" ? "A credential has expired" : "A credential expires soon"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {roleShort[educator.role]} ·{" "}
                            <span className={cn("tabular-nums", overContract && "font-medium text-warn-foreground")}>
                              {formatHours(hours)}
                              {educator.contractHours > 0 && ` / ${educator.contractHours}h`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {days.map((date) => {
                        const dayShifts = educatorShifts.filter((s) => s.date === date)
                        const onLeave = leave.find((l) => l.educatorId === educator.id && l.date === date)
                        return (
                          <div key={date} className={cn("group/cell flex flex-col justify-center gap-1 px-1.5 py-1.5", rowBorder)}>
                            {onLeave ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="rounded-lg bg-[repeating-linear-gradient(135deg,var(--muted)_0_5px,transparent_5px_10px)] py-2 text-center text-[0.8rem] font-medium text-muted-foreground ring-1 ring-border ring-inset">
                                    Leave
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{onLeave.type} leave</TooltipContent>
                              </Tooltip>
                            ) : dayShifts.length > 0 ? (
                              dayShifts.map((shift) => (
                                <ShiftChip
                                  key={shift.id}
                                  shift={shift}
                                  room={roomById.get(shift.roomId)}
                                  isAway={shift.roomId !== educator.primaryRoomId}
                                  onClick={() => onEdit({ mode: "edit", shift })}
                                />
                              ))
                            ) : (
                              <button
                                type="button"
                                aria-label={`Add shift for ${educator.firstName} on ${formatDay(date)}`}
                                onClick={() =>
                                  onEdit({ mode: "create", educatorId: educator.id, date, roomId: educator.primaryRoomId ?? rooms[0].id })
                                }
                                className="flex h-9 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted"
                              >
                                <span className="group-hover/cell:hidden">—</span>
                                <PlusIcon className="hidden size-4 group-hover/cell:block" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </Fragment>
            )
          })}

          {/* Totals */}
          <div className="sticky left-0 z-10 border-t bg-muted/60 px-4 py-3 font-semibold">Paid hours</div>
          {dayTotals.map((hours, i) => (
            <div key={days[i]} className="border-t bg-muted/60 py-3 text-center text-sm font-semibold tabular-nums">
              {formatHours(hours)}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function ShiftChip({
  shift,
  room,
  isAway,
  onClick,
}: {
  shift: Shift
  room: Room | undefined
  isAway: boolean
  onClick: () => void
}) {
  const theme = room ? roomThemeClasses[room.theme] : null
  const place = room?.name ?? (shift.roomId === "kitchen" ? "Kitchen" : "Office")
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "relative rounded-lg py-2 text-center text-[0.8rem] font-semibold tabular-nums transition-all hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            theme ? [theme.soft, theme.ink] : "bg-muted text-muted-foreground",
            shift.status === "draft" && "outline-1 -outline-offset-1 outline-current/30 outline-dashed",
          )}
        >
          {formatClock(shift.start)} – {formatClock(shift.end)}
          {isAway && room && (
            <span className={cn("absolute top-1 right-1 size-1.5 rounded-full", theme?.dot)} aria-label={`In ${room.name}`} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        <div className="font-medium">{formatTimeRange(shift.start, shift.end)}</div>
        <div className="opacity-80">
          {[place, `${formatHours(paidHours(shift))} paid`, ...shift.tags].join(" · ")}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
