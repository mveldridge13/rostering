import type { Metadata } from "next"

import { NotConnectedNotice } from "@/components/not-connected"
import { ageGroupLabel, EducatorAvatar, PageHeader, RoomDot, roomThemeClasses } from "@/components/roster/primitives"
import { AvatarGroup } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAttendanceForDays, getRosterWeek, getToday } from "@/lib/api"
import { requiredEducators } from "@rostering/domain/compliance"
import { formatDay, weekStartOf } from "@rostering/domain/time"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Rooms" }

export default async function RoomsPage() {
  const { rooms, educators, days } = await getRosterWeek(weekStartOf(await getToday()))
  const attendance = await getAttendanceForDays(days)
  const peakByDay = days.map((d) => attendance[d])

  return (
    <>
      <PageHeader title="Rooms" description="Age groups, ratios and this week's bookings" />
      <NotConnectedNotice reads={["Rooms", "Staff (usual room)", "Bookings for the week"]} />
      <div className="grid gap-4 px-4 pt-4 pb-8 md:grid-cols-2 md:px-8">
        {rooms.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground md:col-span-2">No rooms to show.</p>}
        {rooms.map((room) => {
          const team = educators.filter((e) => e.primaryRoomId === room.id)
          const peaks = peakByDay.map((att) => Math.max(...(att.find((a) => a.roomId === room.id)?.children ?? [0])))
          return (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RoomDot room={room} />
                  {room.name}
                </CardTitle>
                <CardDescription>{ageGroupLabel[room.ageGroup]}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-border text-sm">
                  {[
                    ["Ratio", `1:${room.childrenPerEducator}`],
                    ["Licensed places", room.licensedPlaces],
                    ["Educators at capacity", requiredEducators(room.licensedPlaces, room.childrenPerEducator)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-card px-3 py-2">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Booked this week</div>
                  <div className="grid grid-cols-5 gap-2">
                    {days.map((d, i) => (
                      <div key={d} className="flex flex-col items-center gap-1">
                        <div className="relative flex h-16 w-full items-end overflow-hidden rounded-md bg-muted">
                          <div
                            className={cn("w-full rounded-md", roomThemeClasses[room.theme].bar)}
                            style={{ height: `${(peaks[i] / room.licensedPlaces) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs tabular-nums">{peaks[i]}</div>
                        <div className="text-[0.7rem] text-muted-foreground">{formatDay(d, "EEE")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <AvatarGroup>
                    {team.map((e) => (
                      <EducatorAvatar key={e.id} educator={e} className="ring-2 ring-card" />
                    ))}
                  </AvatarGroup>
                  <span className="text-xs text-muted-foreground">{team.length} regular educators</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
