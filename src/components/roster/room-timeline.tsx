import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CoverageSlot, summariseCoverage } from "@/lib/domain/compliance"
import { formatMinutes, formatTimeRange } from "@/lib/domain/time"
import type { Educator, OpenShift, Room, Shift } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

import { CoverageStrip } from "./coverage-strip"
import { ageGroupLabel, RoomDot, roleShort, roomThemeClasses } from "./primitives"

/**
 * One room's day: a Gantt of who is on, with the ratio strip aligned beneath
 * so gaps line up with the shifts that cause them. Omit `room` for support staff.
 */
export function RoomTimeline({
  room,
  slots,
  summary,
  shifts,
  openShifts = [],
  educators,
  opensAt,
  closesAt,
}: {
  room?: Room
  slots?: CoverageSlot[]
  summary?: ReturnType<typeof summariseCoverage>
  shifts: Shift[]
  openShifts?: OpenShift[]
  educators: Educator[]
  opensAt: number
  closesAt: number
}) {
  const span = closesAt - opensAt
  const pct = (m: number) => `${((m - opensAt) / span) * 100}%`
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => Math.ceil(opensAt / 60) * 60 + i * 60).filter(
    (m) => m <= closesAt,
  )
  const sorted = [...shifts].sort((a, b) => a.start - b.start || a.end - b.end)
  const theme = room ? roomThemeClasses[room.theme] : null

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {room ? <RoomDot room={room} /> : null}
          {room ? room.name : "Support & non-contact"}
          {room && <span className="text-xs font-normal text-muted-foreground">1:{room.childrenPerEducator}</span>}
        </CardTitle>
        <CardDescription>
          {room
            ? `${ageGroupLabel[room.ageGroup]} · peak ${summary?.peakChildren ?? 0} of ${room.licensedPlaces} places`
            : "Not counted in educator-to-child ratios"}
        </CardDescription>
        {summary && (
          <CardAction>
            {summary.underSlots === 0 ? (
              <Badge variant="outline" className="border-ok/30 bg-ok/10 text-ok-foreground">
                <CircleCheckIcon />
                Ratios met
              </Badge>
            ) : (
              <Badge variant="outline" className="border-breach/30 bg-breach/10 text-breach-foreground">
                <TriangleAlertIcon />
                Under ratio from {formatMinutes(summary.firstGap!.start)}
              </Badge>
            )}
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <div className="min-w-[44rem]">
          {/* Hour axis */}
          <div className="grid grid-cols-[10rem_1fr] text-[0.7rem] text-muted-foreground">
            <div />
            <div className="relative h-5">
              {hours.map((m) => (
                <span key={m} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(m) }}>
                  {formatMinutes(m).replace(/:00/, "")}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {sorted.map((shift) => {
              const educator = educators.find((e) => e.id === shift.educatorId)
              if (!educator) return null
              return (
                <div key={shift.id} className="grid grid-cols-[10rem_1fr] items-center">
                  <div className="truncate pr-3 text-sm">
                    {educator.firstName} {educator.lastName[0]}.
                    <span className="ml-1.5 text-xs text-muted-foreground">{roleShort[educator.role]}</span>
                  </div>
                  <TrackBackground hours={hours} pct={pct}>
                    <div
                      className={cn(
                        "absolute inset-y-1 flex items-center rounded-md px-2 text-xs font-medium",
                        theme ? [theme.soft, theme.ink] : "bg-muted text-muted-foreground",
                      )}
                      style={{ left: pct(shift.start), width: `calc(${pct(shift.end)} - ${pct(shift.start)})` }}
                    >
                      <span className="truncate tabular-nums">{formatTimeRange(shift.start, shift.end)}</span>
                    </div>
                  </TrackBackground>
                </div>
              )
            })}

            {openShifts.map((o) => (
              <div key={o.id} className="grid grid-cols-[10rem_1fr] items-center">
                <div className="truncate pr-3 text-sm font-medium text-warn-foreground">Open shift</div>
                <TrackBackground hours={hours} pct={pct}>
                  <div
                    className="absolute inset-y-1 flex items-center rounded-md border border-dashed border-warn bg-warn/10 px-2 text-xs"
                    style={{ left: pct(o.start), width: `calc(${pct(o.end)} - ${pct(o.start)})` }}
                  >
                    <span className="truncate text-warn-foreground">{o.reason}</span>
                  </div>
                </TrackBackground>
              </div>
            ))}
          </div>

          {slots && room && (
            <div className="mt-3 grid grid-cols-[10rem_1fr] items-end border-t pt-3">
              <div className="pr-3 pb-1">
                <div className="text-sm font-medium">Ratio</div>
                <div className="text-xs text-muted-foreground">Children vs educators</div>
              </div>
              <CoverageStrip slots={slots} capacity={room.licensedPlaces} height="h-12" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TrackBackground({
  hours,
  pct,
  children,
}: {
  hours: number[]
  pct: (m: number) => string
  children: React.ReactNode
}) {
  return (
    <div className="relative h-9 rounded-md bg-muted/40">
      {hours.map((m) => (
        <span key={m} className="absolute inset-y-0 w-px bg-border" style={{ left: pct(m) }} />
      ))}
      {children}
    </div>
  )
}
