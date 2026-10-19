"use client"

import { useState, useTransition } from "react"
import { AlertTriangleIcon, PlugZapIcon, UserPlusIcon } from "lucide-react"

import { RoomDot } from "@/components/roster/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { createEducator } from "@/lib/actions"
import { cn } from "@/lib/utils"
import {
  defaultContractHours,
  defaultCountsInRatio,
  expiredCredentials,
  type NewEducator,
  type NewEducatorErrors,
  validateNewEducator,
} from "@rostering/domain/educator"
import {
  CREDENTIAL_TYPES,
  EDUCATOR_ROLES,
  EMPLOYMENT_TYPES,
  type CredentialType,
  type EducatorRole,
  type EmploymentType,
  type IsoDate,
  type Room,
} from "@rostering/domain/types"

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: EducatorRole
  employment: EmploymentType
  primaryRoomId: string
  contractHours: string
  hourlyRate: string
  countsInRatio: boolean
  /** Once the user sets "counts in ratio" themselves, changing role no longer overrides it. */
  countsInRatioTouched: boolean
  credentials: Record<CredentialType, { reference: string; expiresOn: string }>
}

const NO_ROOM = "none"

const emptyForm = (): FormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "Certificate III Educator",
  employment: "Full-time",
  primaryRoomId: NO_ROOM,
  contractHours: String(defaultContractHours("Full-time")),
  hourlyRate: "",
  countsInRatio: true,
  countsInRatioTouched: false,
  credentials: Object.fromEntries(CREDENTIAL_TYPES.map((t) => [t, { reference: "", expiresOn: "" }])) as FormState["credentials"],
})

/** Blank numbers become NaN so validation reports them as missing. */
const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value))

function toInput(form: FormState): NewEducator {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    role: form.role,
    employment: form.employment,
    primaryRoomId: form.primaryRoomId === NO_ROOM ? null : form.primaryRoomId,
    contractHours: toNumber(form.contractHours),
    hourlyRate: toNumber(form.hourlyRate),
    countsInRatio: form.countsInRatio,
    credentials: CREDENTIAL_TYPES.filter(
      (type) => type === "WWCC" || form.credentials[type].expiresOn || form.credentials[type].reference,
    ).map((type) => ({ type, reference: form.credentials[type].reference.trim(), expiresOn: form.credentials[type].expiresOn })),
  }
}

export function AddEducator({ rooms, today }: { rooms: Room[]; today: IsoDate }) {
  const [open, setOpen] = useState(false)
  // Remount the form each time the sheet opens so it starts blank.
  const [formKey, setFormKey] = useState(0)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setFormKey((k) => k + 1)
        setOpen(next)
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline">
          <UserPlusIcon />
          Add educator
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <AddEducatorForm key={formKey} rooms={rooms} today={today} onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function AddEducatorForm({ rooms, today, onDone }: { rooms: Room[]; today: IsoDate; onDone: () => void }) {
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<NewEducatorErrors>({})
  const [outcome, setOutcome] = useState<"not-connected" | null>(null)
  const [pending, startTransition] = useTransition()

  const input = toInput(form)
  // Errors show only after the first save attempt, then update as you fix them.
  const errors: NewEducatorErrors = submitted ? { ...serverErrors, ...validateNewEducator(input) } : {}
  const expired = expiredCredentials(input, today)

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
    setServerErrors({})
    setOutcome(null)
  }

  function setCredential(type: CredentialType, patch: Partial<{ reference: string; expiresOn: string }>) {
    update({ credentials: { ...form.credentials, [type]: { ...form.credentials[type], ...patch } } })
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateNewEducator(input)).length > 0) return
    startTransition(async () => {
      const result = await createEducator(input)
      if (result.status === "saved") onDone()
      else if (result.status === "invalid") setServerErrors(result.errors)
      else setOutcome(result.status)
    })
  }

  const rate = toNumber(form.hourlyRate)

  return (
    <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b">
        <SheetTitle>Add educator</SheetTitle>
        <SheetDescription>Add someone to the team so they can be rostered.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <Section title="Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.firstName} required>
              {(props) => (
                <Input {...props} autoComplete="off" value={form.firstName} onChange={(e) => update({ firstName: e.target.value })} />
              )}
            </Field>
            <Field label="Last name" error={errors.lastName} required>
              {(props) => (
                <Input {...props} autoComplete="off" value={form.lastName} onChange={(e) => update({ lastName: e.target.value })} />
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" error={errors.email} hint="For roster notifications">
              {(props) => <Input {...props} type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />}
            </Field>
            <Field label="Mobile" error={errors.phone}>
              {(props) => <Input {...props} type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />}
            </Field>
          </div>
        </Section>

        <Separator />

        <Section title="Role and pay">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" error={errors.role} required>
              {(props) => (
                <Select
                  value={form.role}
                  onValueChange={(role: EducatorRole) =>
                    update({ role, ...(!form.countsInRatioTouched && { countsInRatio: defaultCountsInRatio(role) }) })
                  }
                >
                  <SelectTrigger {...props} className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATOR_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Usual room" hint={rooms.length === 0 ? "No rooms set up yet" : undefined}>
              {(props) => (
                <Select value={form.primaryRoomId} onValueChange={(primaryRoomId) => update({ primaryRoomId })}>
                  <SelectTrigger {...props} className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ROOM}>None (floats)</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <RoomDot room={r} />
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Employment" error={errors.employment} required>
              {(props) => (
                <Select
                  value={form.employment}
                  onValueChange={(employment: EmploymentType) =>
                    update({ employment, contractHours: String(defaultContractHours(employment)) })
                  }
                >
                  <SelectTrigger {...props} className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Hours / week" error={errors.contractHours} required={form.employment !== "Casual"}>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  disabled={form.employment === "Casual"}
                  value={form.employment === "Casual" ? "" : form.contractHours}
                  placeholder={form.employment === "Casual" ? "As needed" : undefined}
                  onChange={(e) => update({ contractHours: e.target.value })}
                />
              )}
            </Field>
            <Field label="Hourly rate" error={errors.hourlyRate} required>
              {(props) => (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    {...props}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    className="pl-6"
                    value={form.hourlyRate}
                    onChange={(e) => update({ hourlyRate: e.target.value })}
                  />
                </div>
              )}
            </Field>
          </div>
          {form.employment === "Casual" && Number.isFinite(rate) && rate > 0 && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Casuals get a 25% loading on top: ${(rate * 1.25).toFixed(2)} an hour on the roster.
            </p>
          )}

          <label className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">Counts towards ratios</span>
              <span className="block text-xs text-muted-foreground">
                Turn off for staff who aren&apos;t on the floor with children, like a cook or a non-contact director.
              </span>
            </span>
            <Switch
              checked={form.countsInRatio}
              onCheckedChange={(countsInRatio) => update({ countsInRatio, countsInRatioTouched: true })}
              className="mt-0.5"
            />
          </label>
        </Section>

        <Separator />

        <Section title="Checks and certificates" description="Add expiry dates so you're warned before anything lapses.">
          <div className="flex flex-col divide-y rounded-lg border">
            {CREDENTIAL_TYPES.map((type) => {
              const error = errors[`credentials.${type}`]
              const referenceError = errors[`credentials.${type}.reference`]
              const id = `cred-${type.replace(/\s+/g, "-").toLowerCase()}`
              return (
                <div key={type} className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-start gap-x-3 gap-y-1 px-3 py-2.5">
                  <div className="min-w-0">
                    <Label htmlFor={id} className="text-sm">
                      {type === "WWCC" ? "Working with Children Check" : type}
                      {type === "WWCC" && <span className="text-breach">*</span>}
                    </Label>
                    {type === "WWCC" && (
                      <Input
                        aria-label="WWCC number"
                        aria-invalid={!!referenceError || undefined}
                        placeholder="Clearance number, e.g. WWC1234567E"
                        className="mt-1.5 h-8"
                        value={form.credentials.WWCC.reference}
                        onChange={(e) => setCredential("WWCC", { reference: e.target.value })}
                      />
                    )}
                    {referenceError && <p className="mt-1 text-xs text-breach-foreground">{referenceError}</p>}
                  </div>
                  <div>
                    <Input
                      id={id}
                      type="date"
                      aria-label={`${type} expiry date`}
                      aria-invalid={!!error || undefined}
                      className="h-8"
                      value={form.credentials[type].expiresOn}
                      onChange={(e) => setCredential(type, { expiresOn: e.target.value })}
                    />
                    {error && <p className="mt-1 text-xs text-breach-foreground">{error}</p>}
                  </div>
                </div>
              )
            })}
          </div>
          {expired.length > 0 && (
            <Notice tone="warn" icon={AlertTriangleIcon}>
              {expired.join(", ")} {expired.length === 1 ? "has" : "have"} already expired. You can still add them, but they&apos;ll be
              flagged {expired.includes("WWCC") && "and can't work with children "}until it&apos;s renewed.
            </Notice>
          )}
        </Section>
      </div>

      <SheetFooter className="border-t">
        {outcome === "not-connected" && (
          <Notice tone="warn" icon={PlugZapIcon}>
            <strong className="font-semibold">Not saved.</strong> The form is valid, but the backend isn&apos;t connected yet.
            Your entries are still here.
          </Notice>
        )}
        {submitted && Object.keys(errors).length > 0 && (
          <p className="text-sm text-breach-foreground" role="alert">
            Fix the highlighted fields to continue.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add educator"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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

function Field({
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

function Notice({
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
