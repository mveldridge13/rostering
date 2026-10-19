"use client"

import { useState } from "react"
import { SearchIcon } from "lucide-react"

import { CredentialBadge, EducatorAvatar, RoomLabel } from "@/components/roster/primitives"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { credentialState, daysUntil } from "@rostering/domain/compliance"
import { formatHours } from "@rostering/domain/time"
import type { Educator, IsoDate, Room } from "@rostering/domain/types"
import { cn } from "@/lib/utils"

export function EducatorsTable({
  educators,
  rooms,
  hoursThisWeek,
  today,
}: {
  educators: Educator[]
  rooms: Room[]
  hoursThisWeek: Record<string, number>
  today: IsoDate
}) {
  const [query, setQuery] = useState("")
  const [room, setRoom] = useState("all")

  const filtered = educators.filter((e) => {
    const matchesQuery = `${e.firstName} ${e.lastName} ${e.role}`.toLowerCase().includes(query.toLowerCase())
    const matchesRoom = room === "all" || (room === "none" ? !e.primaryRoomId : e.primaryRoomId === room)
    return matchesQuery && matchesRoom
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search educators"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Search educators"
          />
        </div>
        <Select value={room} onValueChange={setRoom}>
          <SelectTrigger className="w-44" aria-label="Filter by room">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rooms</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
            <SelectItem value="none">Floating & support</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">Educator</TableHead>
              <TableHead>Employment</TableHead>
              <TableHead>Usual room</TableHead>
              <TableHead>This week</TableHead>
              <TableHead className="pr-4">Credentials</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No educators match that search.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => {
              const r = rooms.find((x) => x.id === e.primaryRoomId)
              const issues = e.credentials
                .map((c) => ({ ...c, state: credentialState(c, today) }))
                .filter((c) => c.state !== "valid")
                .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
              const hours = hoursThisWeek[e.id] ?? 0
              return (
                <TableRow key={e.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <EducatorAvatar educator={e} />
                      <div>
                        <div className="font-medium">
                          {e.firstName} {e.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{e.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{e.employment}</TableCell>
                  <TableCell>{r ? <RoomLabel room={r} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex w-28 flex-col gap-1">
                      <span className="text-xs tabular-nums">
                        {formatHours(hours)}
                        {e.contractHours > 0 && <span className="text-muted-foreground"> / {e.contractHours}h</span>}
                      </span>
                      {e.contractHours > 0 && (
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full bg-primary", hours > e.contractHours && "bg-warn")}
                            style={{ width: `${Math.min(100, (hours / e.contractHours) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    {issues.length === 0 ? (
                      <CredentialBadge state="valid">All current</CredentialBadge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {issues.map((c) => {
                          const days = daysUntil(c.expiresOn, today)
                          return (
                            <CredentialBadge key={c.type} state={c.state}>
                              {c.type} {c.state === "expired" ? `expired ${-days}d ago` : `· ${days}d`}
                            </CredentialBadge>
                          )
                        })}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
