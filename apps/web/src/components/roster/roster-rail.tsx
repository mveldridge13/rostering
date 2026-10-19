"use client"

import Link from "next/link"
import {
  CalendarCheckIcon,
  CalendarOffIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  ClockAlertIcon,
  DownloadIcon,
  HeartIcon,
  type LucideIcon,
  SendIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserRoundXIcon,
  UsersRoundIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { credentialState } from "@rostering/domain/compliance"
import { formatClock, formatDay } from "@rostering/domain/time"
import type { Educator, IsoDate, Leave, OpenShift, Room, Shift } from "@rostering/domain/types"
import { cn } from "@/lib/utils"

import { Panel } from "./primitives"

type CheckTone = "ok" | "warn" | "breach"

interface Check {
  id: string
  tone: CheckTone
  icon?: LucideIcon
  title: string
  lines?: string[]
}

const toneStyles: Record<CheckTone, string> = {
  ok: "bg-ok text-white",
  warn: "bg-warn/20 text-warn-foreground",
  breach: "bg-breach/12 text-breach-foreground",
}

export function RosterRail({
  isPublished,
  onPublish,
  educators,
  shifts,
  openShifts,
  leave,
  gaps,
  cost,
  budget,
  rooms,
  today,
}: {
  isPublished: boolean
  onPublish: () => void
  educators: Educator[]
  shifts: Shift[]
  openShifts: OpenShift[]
  leave: Leave[]
  gaps: { roomName: string; date: IsoDate; hours: number }[]
  cost: number
  budget: number
  rooms: Room[]
  today: IsoDate
}) {
  const name = (id: string) => {
    const e = educators.find((x) => x.id === id)
    return e ? `${e.firstName} ${e.lastName}` : "Unknown"
  }
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id

  const expired = educators.flatMap((e) =>
    e.credentials
      .filter((c) => credentialState(c, today) === "expired")
      .filter(() => shifts.some((s) => s.educatorId === e.id))
      .map((c) => `${e.firstName} ${e.lastName} · ${c.type}`),
  )

  const checks: Check[] = []
  if (leave.length > 0) {
    checks.push({
      id: "leave",
      tone: "breach",
      icon: CalendarOffIcon,
      title: `${new Set(leave.map((l) => l.educatorId)).size} staff on leave`,
      lines: leave.map((l) => `${name(l.educatorId)} · ${formatDay(l.date, "EEE d MMM")}`),
    })
  }
  if (openShifts.length > 0) {
    checks.push({
      id: "open",
      tone: "warn",
      icon: ClockAlertIcon,
      title: `${openShifts.length} ${openShifts.length === 1 ? "shift needs" : "shifts need"} cover`,
      lines: openShifts.map(
        (o) => `${formatDay(o.date, "EEE")} · ${roomName(o.roomId)} (${formatClock(o.start)}–${formatClock(o.end)})`,
      ),
    })
  }
  checks.push(
    expired.length > 0
      ? { id: "creds", tone: "breach", icon: UserRoundXIcon, title: "Expired credentials on roster", lines: expired }
      : { id: "creds", tone: "ok", title: "All qualifications are valid" },
  )
  checks.push(
    gaps.length > 0
      ? {
          id: "ratios",
          tone: "breach",
          icon: TriangleAlertIcon,
          title: "Ratios not met",
          lines: gaps.map((g) => `${g.roomName} · ${formatDay(g.date, "EEE")} (${g.hours}h short)`),
        }
      : { id: "ratios", tone: "ok", title: "Staffing ratios are compliant" },
  )
  checks.push(
    cost <= budget
      ? { id: "cost", tone: "ok", title: "Estimated cost is within budget" }
      : {
          id: "cost",
          tone: "warn",
          icon: TriangleAlertIcon,
          title: "Over wage budget",
          lines: [`$${Math.round(cost - budget).toLocaleString("en-AU")} over $${budget.toLocaleString("en-AU")}`],
        },
  )

  const allClear = checks.every((c) => c.tone === "ok")

  return (
    <aside className="flex flex-col gap-4">
      {/* Publish status */}
      <div className="rounded-2xl border border-primary/15 bg-accent/60 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-card text-primary shadow-xs">
            {isPublished ? <CalendarCheckIcon className="size-4" /> : <SparklesIcon className="size-4" />}
          </span>
          <div className="font-semibold text-accent-foreground">{isPublished ? "Roster published" : "Draft ready to review"}</div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {isPublished
            ? "Educators can see their shifts for this week in the app."
            : "Educators can't see this week yet. Check the alerts, then publish to notify everyone."}
        </p>
        {isPublished ? (
          <Button asChild variant="outline" className="mt-3 w-full rounded-xl bg-card">
            <Link href="/roster/day">View day & ratios</Link>
          </Button>
        ) : (
          <Button className="mt-3 w-full rounded-xl" onClick={onPublish}>
            <SendIcon />
            Publish roster
          </Button>
        )}
      </div>

      {/* Alerts & checks */}
      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Alerts & checks</h2>
          <Link href="/" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <ul className="flex flex-col gap-3.5">
          {checks.map((check) => (
            <li key={check.id} className="flex gap-3">
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", toneStyles[check.tone])}>
                {check.tone === "ok" ? <CircleCheckIcon className="size-4" /> : check.icon && <check.icon className="size-3.5" />}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="text-sm leading-snug font-medium">{check.title}</div>
                {check.lines?.map((line) => (
                  <div key={line} className="mt-0.5 truncate text-xs text-muted-foreground">
                    {line}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Quick actions */}
      <Panel className="p-2">
        <h2 className="px-2 pt-2 pb-1 font-semibold">Quick actions</h2>
        {[
          { label: "Manage staff availability", icon: UsersRoundIcon, href: "/educators" },
          { label: "View leave requests", icon: CalendarOffIcon, href: "/educators" },
          { label: "Export roster", icon: DownloadIcon, href: "#" },
          { label: "Send to families", icon: SendIcon, href: "#" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-foreground/85 transition-colors hover:bg-muted"
          >
            <action.icon className="size-4 text-muted-foreground" />
            <span className="flex-1">{action.label}</span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </Panel>

      {allClear && (
        <Panel className="relative overflow-hidden p-4">
          <div className="flex items-center gap-2">
            <HeartIcon className="size-4 fill-primary/20 text-primary" />
            <span className="font-hand text-2xl leading-none text-foreground/90">Great work!</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">You&apos;ve built a balanced, compliant roster for the week.</p>
          <svg viewBox="0 0 40 40" className="absolute -right-1 -bottom-1 size-12 text-room-toddler" aria-hidden>
            <path d="M8 38C14 26 22 16 34 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M20 22c-6-1-9-5-9-10 6 1 9 5 9 10Zm4-6c1-6 5-9 10-9-1 6-5 9-10 9Zm-8 14c-6 0-9-3-10-8 6 0 9 3 10 8Z" fill="currentColor" opacity=".6" />
          </svg>
        </Panel>
      )}
    </aside>
  )
}
