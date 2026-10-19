// Small presentational building blocks shared across roster screens.

import type { ReactNode } from "react"
import { BabyIcon, BackpackIcon, BlocksIcon, PaletteIcon, type LucideIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { CredentialState } from "@rostering/domain/compliance"
import type { AgeGroup, Educator, EducatorRole, Room, RoomTheme } from "@rostering/domain/types"
import { cn } from "@/lib/utils"

export const roomThemeClasses: Record<
  RoomTheme,
  { dot: string; bar: string; soft: string; ink: string; band: string; icon: LucideIcon }
> = {
  nursery: {
    dot: "bg-room-nursery",
    bar: "bg-room-nursery",
    soft: "bg-room-nursery-soft",
    ink: "text-room-nursery-ink",
    band: "bg-room-nursery-soft/70",
    icon: BabyIcon,
  },
  toddler: {
    dot: "bg-room-toddler",
    bar: "bg-room-toddler",
    soft: "bg-room-toddler-soft",
    ink: "text-room-toddler-ink",
    band: "bg-room-toddler-soft/70",
    icon: BlocksIcon,
  },
  preschool: {
    dot: "bg-room-preschool",
    bar: "bg-room-preschool",
    soft: "bg-room-preschool-soft",
    ink: "text-room-preschool-ink",
    band: "bg-room-preschool-soft/70",
    icon: PaletteIcon,
  },
  kindy: {
    dot: "bg-room-kindy",
    bar: "bg-room-kindy",
    soft: "bg-room-kindy-soft",
    ink: "text-room-kindy-ink",
    band: "bg-room-kindy-soft/70",
    icon: BackpackIcon,
  },
}

export const ageGroupLabel: Record<AgeGroup, string> = {
  "0-24m": "Birth – 24 months",
  "24-36m": "24 – 36 months",
  "36m-preschool": "36 months – preschool",
  "school-age": "School age",
}

export const ageGroupShort: Record<AgeGroup, string> = {
  "0-24m": "0–2 years",
  "24-36m": "2–3 years",
  "36m-preschool": "3–5 years",
  "school-age": "5+ years",
}

export const roleShort: Record<EducatorRole, string> = {
  "Centre Director": "Director",
  "Early Childhood Teacher": "ECT",
  "Diploma Educator": "Diploma",
  "Certificate III Educator": "Cert III",
  "Working Towards": "Working towards",
  Cook: "Cook",
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-2 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function RoomDot({ room, className }: { room: Pick<Room, "theme">; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", roomThemeClasses[room.theme].dot, className)} />
}

export function RoomIcon({ room, className }: { room: Pick<Room, "theme">; className?: string }) {
  const theme = roomThemeClasses[room.theme]
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-card shadow-xs ring-1 ring-foreground/5",
        theme.ink,
        className,
      )}
    >
      <theme.icon className="size-3.5" />
    </span>
  )
}

export function RoomLabel({ room, showRatio = false }: { room: Room; showRatio?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <RoomDot room={room} />
      <span className="font-medium">{room.name}</span>
      {showRatio && <span className="text-xs text-muted-foreground tabular-nums">1:{room.childrenPerEducator}</span>}
    </span>
  )
}

export function initials(educator: Pick<Educator, "firstName" | "lastName">) {
  return `${educator.firstName[0]}${educator.lastName[0]}`
}

const avatarTints = [
  "bg-room-nursery-soft text-room-nursery-ink",
  "bg-room-toddler-soft text-room-toddler-ink",
  "bg-room-preschool-soft text-room-preschool-ink",
  "bg-room-kindy-soft text-room-kindy-ink",
  "bg-accent text-accent-foreground",
]

function avatarTint(id: string) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return avatarTints[hash % avatarTints.length]
}

export function EducatorAvatar({ educator, className }: { educator: Educator; className?: string }) {
  return (
    <Avatar className={cn("size-9", className)}>
      <AvatarFallback className={cn("text-xs font-semibold", avatarTint(educator.id))}>{initials(educator)}</AvatarFallback>
    </Avatar>
  )
}

export function CredentialBadge({ state, children }: { state: CredentialState; children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full border-transparent font-medium",
        state === "expired" && "bg-breach/10 text-breach-foreground",
        state === "expiring" && "bg-warn/15 text-warn-foreground",
        state === "valid" && "bg-ok/10 text-ok-foreground",
      )}
    >
      {children}
    </Badge>
  )
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card shadow-xs", className)}>{children}</div>
}

const statTones = {
  default: { tile: "", icon: "text-primary" },
  blue: { tile: "bg-room-nursery-soft/40", icon: "text-room-nursery-ink" },
  pink: { tile: "bg-breach/[0.04]", icon: "text-breach-foreground" },
  green: { tile: "bg-room-toddler-soft/40", icon: "text-room-toddler-ink" },
  violet: { tile: "bg-room-preschool-soft/40", icon: "text-room-preschool-ink" },
  peach: { tile: "bg-room-kindy-soft/50", icon: "text-room-kindy-ink" },
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tint = "default",
  tone = "default",
  status,
  children,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tint?: keyof typeof statTones
  tone?: "default" | "ok" | "warn" | "breach"
  status?: ReactNode
  children?: ReactNode
}) {
  const tintStyle = statTones[tint]
  return (
    <Panel className={cn("relative flex gap-3 p-4", tintStyle.tile)}>
      {Icon && (
        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-foreground/5", tintStyle.icon)}>
          <Icon className="size-[1.15rem]" strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-1 text-2xl font-bold tracking-tight tabular-nums",
            tone === "ok" && "text-ok-foreground",
            tone === "warn" && "text-warn-foreground",
            tone === "breach" && "text-breach-foreground",
          )}
        >
          {value}
        </div>
        {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
        {children}
      </div>
      {status && <div className="absolute top-4 right-4">{status}</div>}
    </Panel>
  )
}
