"use client"

import { useState } from "react"
import { AlertTriangleIcon, CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { credentialState, daysUntil, paidHours, shiftCost } from "@rostering/domain/compliance"
import { formatDay, formatHours, formatTimeRange } from "@rostering/domain/time"
import type { Educator, IsoDate, OpenShift, Room, Shift } from "@rostering/domain/types"
import { cn } from "@/lib/utils"

import { EducatorAvatar, RoomDot, roleShort } from "./primitives"

export type ShiftEditorState =
  | { mode: "edit"; shift: Shift }
  | { mode: "create"; educatorId: string; date: IsoDate; roomId: string }
  | { mode: "fill"; openShift: OpenShift }

interface Draft {
  educatorId: string | null
  roomId: string
  start: number
  end: number
  breakMinutes: number
}

function initialDraft(state: ShiftEditorState): Draft {
  switch (state.mode) {
    case "edit":
      return { ...state.shift }
    case "create":
      return { educatorId: state.educatorId, roomId: state.roomId, start: 510, end: 1020, breakMinutes: 30 }
    case "fill":
      return { educatorId: null, roomId: state.openShift.roomId, start: state.openShift.start, end: state.openShift.end, breakMinutes: 30 }
  }
}

const toTimeValue = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const fromTimeValue = (v: string) => {
  const [h, m] = v.split(":").map(Number)
  return h * 60 + (m || 0)
}

export function ShiftSheet({
  state,
  onOpenChange,
  rooms,
  educators,
  shifts,
  today,
  onSave,
  onDelete,
}: {
  state: ShiftEditorState | null
  onOpenChange: (open: boolean) => void
  rooms: Room[]
  educators: Educator[]
  shifts: Shift[]
  today: IsoDate
  onSave: (draft: Draft & { educatorId: string }) => void
  onDelete: () => void
}) {
  return (
    <Sheet open={state !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {state && (
          <ShiftForm
            // Remount the form for each shift so the draft resets.
            key={state.mode === "edit" ? state.shift.id : state.mode === "fill" ? state.openShift.id : `${state.educatorId}-${state.date}`}
            state={state}
            rooms={rooms}
            educators={educators}
            shifts={shifts}
            today={today}
            onSave={onSave}
            onDelete={onDelete}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function ShiftForm({
  state,
  rooms,
  educators,
  shifts,
  today,
  onSave,
  onDelete,
  onCancel,
}: {
  state: ShiftEditorState
  rooms: Room[]
  educators: Educator[]
  shifts: Shift[]
  today: IsoDate
  onSave: (draft: Draft & { educatorId: string }) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(state))
  const date = state.mode === "edit" ? state.shift.date : state.mode === "fill" ? state.openShift.date : state.date
  const educator = educators.find((e) => e.id === draft.educatorId) ?? null
  const room = rooms.find((r) => r.id === draft.roomId)

  const weekHours = (id: string) =>
    shifts
      .filter((s) => s.educatorId === id && !(state.mode === "edit" && s.id === state.shift.id))
      .reduce((sum, s) => sum + paidHours(s), 0)

  const hours = Math.max(0, paidHours(draft))
  const cost = educator ? shiftCost({ ...draft, id: "", educatorId: educator.id, date, tags: [], status: "draft" }, educator) : 0
  const expired = educator?.credentials.filter((c) => credentialState(c, today) === "expired") ?? []
  const projectedHours = educator ? weekHours(educator.id) + hours : 0
  const overContract = educator && educator.contractHours > 0 && projectedHours > educator.contractHours

  const candidates = educators
    .filter((e) => e.countsInRatio && !shifts.some((s) => s.educatorId === e.id && s.date === date))
    .sort((a, b) => Number(b.primaryRoomId === draft.roomId) - Number(a.primaryRoomId === draft.roomId))

  const title = state.mode === "edit" ? "Edit shift" : state.mode === "fill" ? "Fill open shift" : "Add shift"
  const valid = !!educator && draft.end > draft.start

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>
          {formatDay(date, "EEEE d MMMM")}
          {state.mode === "fill" && <> · {state.openShift.reason}</>}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {state.mode === "fill" ? (
          <div className="flex flex-col gap-2">
            <Label>Available educators</Label>
            <div className="flex flex-col gap-1">
              {candidates.length === 0 && (
                <p className="text-sm text-muted-foreground">Everyone is already rostered on this day.</p>
              )}
              {candidates.map((c) => {
                const selected = c.id === draft.educatorId
                const h = weekHours(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, educatorId: c.id }))}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60",
                      selected && "border-primary bg-primary/5 hover:bg-primary/5",
                    )}
                  >
                    <EducatorAvatar educator={c} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {roleShort[c.role]} · {c.employment}
                        {c.primaryRoomId === draft.roomId && " · Usual room"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatHours(h)}
                      {c.contractHours > 0 && <span className="opacity-60"> / {c.contractHours}h</span>}
                    </div>
                    {selected && <CheckIcon className="size-4 text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          educator && (
            <div className="flex items-center gap-3">
              <EducatorAvatar educator={educator} className="size-10" />
              <div>
                <div className="font-medium">
                  {educator.firstName} {educator.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {educator.role} · {educator.employment}
                </div>
              </div>
            </div>
          )
        )}

        <Separator />

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="room">Room</Label>
            <Select value={draft.roomId} onValueChange={(roomId) => setDraft((d) => ({ ...d, roomId }))}>
              <SelectTrigger id="room" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <RoomDot room={r} />
                    {r.name}
                    <span className="text-xs text-muted-foreground">1:{r.childrenPerEducator}</span>
                  </SelectItem>
                ))}
                <SelectItem value="office">Office (non-contact)</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="time"
                step={900}
                value={toTimeValue(draft.start)}
                onChange={(e) => setDraft((d) => ({ ...d, start: fromTimeValue(e.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">Finish</Label>
              <Input
                id="end"
                type="time"
                step={900}
                value={toTimeValue(draft.end)}
                onChange={(e) => setDraft((d) => ({ ...d, end: fromTimeValue(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="break">Unpaid break</Label>
            <Select
              value={String(draft.breakMinutes)}
              onValueChange={(v) => setDraft((d) => ({ ...d, breakMinutes: Number(v) }))}
            >
              <SelectTrigger id="break" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No break</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-border text-sm">
          {[
            ["Shift", formatTimeRange(draft.start, draft.end)],
            ["Paid", formatHours(hours)],
            ["Est. cost", `$${cost.toFixed(0)}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xs font-medium tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        {(expired.length > 0 || overContract || draft.end <= draft.start) && educator && (
          <div className="flex flex-col gap-2">
            {expired.map((c) => (
              <Warning key={c.type} tone="breach">
                {educator.firstName}&apos;s {c.type} expired {Math.abs(daysUntil(c.expiresOn, today))} days ago.
                {c.type === "WWCC" && " They can't work with children until it's renewed."}
              </Warning>
            ))}
            {overContract && (
              <Warning tone="warn">
                Takes {educator.firstName} to {formatHours(projectedHours)} this week. Contract is{" "}
                {educator.contractHours}h, so overtime rates may apply.
              </Warning>
            )}
            {draft.end <= draft.start && <Warning tone="breach">Finish time must be after start time.</Warning>}
          </div>
        )}

        {room && state.mode !== "fill" && (
          <p className="text-xs text-muted-foreground">
            Counts towards the {room.name} ratio (1:{room.childrenPerEducator}). Coverage updates as soon as you save.
          </p>
        )}
      </div>

      <SheetFooter className="flex-row border-t">
        {state.mode === "edit" && (
          <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={onDelete}>
            Remove shift
          </Button>
        )}
        <Button variant="outline" className={cn(state.mode !== "edit" && "ml-auto")} onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!valid} onClick={() => educator && onSave({ ...draft, educatorId: educator.id })}>
          {state.mode === "fill" ? "Assign shift" : "Save"}
        </Button>
      </SheetFooter>
    </>
  )
}

function Warning({ tone, children }: { tone: "warn" | "breach"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border px-3 py-2 text-sm",
        tone === "breach" && "border-breach/30 bg-breach/8 text-breach-foreground",
        tone === "warn" && "border-warn/40 bg-warn/12 text-warn-foreground",
      )}
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
