import { PlugZapIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Temporary markers while the frontend has no backend. They show where a
// screen still needs connecting; delete each one as its data is wired up.

/** Inline tag for a value that is hard-coded rather than coming from the backend. */
export function NotConnected({ needs, className }: { needs: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-warn bg-warn/10 px-1.5 py-px text-[0.65rem] font-semibold whitespace-nowrap text-warn-foreground",
            className,
          )}
        >
          <PlugZapIcon className="size-3" />
          Not connected
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">Needs: {needs}</TooltipContent>
    </Tooltip>
  )
}

/** Panel at the top of a screen listing the backend data and actions it needs. */
export function NotConnectedNotice({ reads, saves }: { reads: string[]; saves?: string[] }) {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-dashed border-warn bg-warn/8 px-4 py-3 text-sm md:mx-8">
      <div className="flex items-center gap-2 font-semibold text-warn-foreground">
        <PlugZapIcon className="size-4" />
        Not connected to the backend
      </div>
      <dl className="mt-2 grid gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[4rem_minmax(0,1fr)]">
        <dt className="font-medium text-muted-foreground">Reads</dt>
        <dd className="flex flex-wrap gap-1.5">
          {reads.map((r) => (
            <Chip key={r}>{r}</Chip>
          ))}
        </dd>
        {saves && saves.length > 0 && (
          <>
            <dt className="font-medium text-muted-foreground">Saves</dt>
            <dd className="flex flex-wrap gap-1.5">
              {saves.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-card px-1.5 py-0.5 ring-1 ring-border">{children}</span>
}
