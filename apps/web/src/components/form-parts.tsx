// Building blocks for the slide-out forms (Add educator, Add room).

import type { AlertTriangleIcon } from "lucide-react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`
  const messageId = `${id}-message`
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-breach">*</span>}
      </Label>
      {children({ id, ...(error && { "aria-invalid": true as const }), ...((error || hint) && { "aria-describedby": messageId }) })}
      {(error || hint) && (
        <p id={messageId} className={cn("text-xs", error ? "text-breach-foreground" : "text-muted-foreground")}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: "warn" | "breach"
  icon: typeof AlertTriangleIcon
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-2 rounded-lg border px-3 py-2 text-sm",
        tone === "breach" && "border-breach/30 bg-breach/8 text-breach-foreground",
        tone === "warn" && "border-warn/40 bg-warn/12 text-warn-foreground",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
