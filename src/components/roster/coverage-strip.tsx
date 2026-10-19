import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { CoverageSlot, CoverageStatus } from "@/lib/domain/compliance"
import { formatTimeRange } from "@/lib/domain/time"
import { cn } from "@/lib/utils"

const statusBar: Record<CoverageStatus, string> = {
  closed: "bg-muted",
  under: "bg-breach",
  met: "bg-ok/70",
  over: "bg-warn",
}

const statusLabel: Record<CoverageStatus, string> = {
  closed: "No children booked",
  under: "Under ratio",
  met: "Ratio met",
  over: "Over-staffed",
}

/**
 * Half-hour ratio coverage for a room. Bar height shows children on site
 * relative to licensed places; colour shows whether ratio is met.
 */
export function CoverageStrip({
  slots,
  capacity,
  slotMinutes = 30,
  height = "h-10",
  className,
}: {
  slots: CoverageSlot[]
  capacity: number
  slotMinutes?: number
  height?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-end gap-0.5", height, className)}>
      {slots.map((slot) => {
        const fill = slot.children === 0 ? 8 : Math.max(14, Math.round((slot.children / capacity) * 100))
        return (
          <Tooltip key={slot.start}>
            <TooltipTrigger asChild>
              <div className="group flex h-full flex-1 items-end rounded-[4px] hover:bg-muted/60">
                <div
                  className={cn("w-full rounded-[4px] transition-opacity group-hover:opacity-80", statusBar[slot.status])}
                  style={{ height: `${fill}%` }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="font-medium">{formatTimeRange(slot.start, slot.start + slotMinutes)}</div>
              <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
                <span className="opacity-70">Children</span>
                <span>{slot.children}</span>
                <span className="opacity-70">Required</span>
                <span>{slot.required}</span>
                <span className="opacity-70">Rostered</span>
                <span>{slot.rostered}</span>
              </div>
              <div className="mt-1 opacity-80">{statusLabel[slot.status]}</div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function CoverageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["met", "under", "over"] as const).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[4px]", statusBar[s])} />
          {statusLabel[s]}
        </span>
      ))}
      <span>Bar height = children on site</span>
    </div>
  )
}
