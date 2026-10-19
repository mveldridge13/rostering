"use client"

import { useState, useTransition } from "react"
import { CheckIcon, PlugZapIcon, PlusIcon, ShieldCheckIcon } from "lucide-react"

import { Field, Notice, Section } from "@/components/form-parts"
import { NotConnected } from "@/components/not-connected"
import { ageGroupLabel, roomThemeClasses } from "@/components/roster/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { createRoom } from "@/lib/actions"
import { cn } from "@/lib/utils"
import { requiredEducators } from "@rostering/domain/compliance"
import { defaultTheme, legalRatio, type NewRoom, type NewRoomErrors, validateNewRoom } from "@rostering/domain/room"
import { AGE_GROUPS, ROOM_THEMES, type AgeGroup, type AustralianState, type RoomTheme } from "@rostering/domain/types"

const themeLabel: Record<RoomTheme, string> = {
  nursery: "Blue",
  toddler: "Green",
  preschool: "Lavender",
  kindy: "Peach",
}

interface FormState {
  name: string
  ageGroup: AgeGroup
  licensedPlaces: string
  stricter: boolean
  stricterRatio: string
  theme: RoomTheme
  /** Once the user picks a colour, changing the age group no longer overrides it. */
  themeTouched: boolean
}

const emptyForm = (): FormState => ({
  name: "",
  ageGroup: "0-24m",
  licensedPlaces: "",
  stricter: false,
  stricterRatio: "",
  theme: defaultTheme("0-24m"),
  themeTouched: false,
})

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value))

export function AddRoom({ state, existingNames }: { state: AustralianState | null; existingNames: string[] }) {
  const [open, setOpen] = useState(false)
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
        <Button>
          <PlusIcon />
          Add room
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <AddRoomForm key={formKey} state={state} existingNames={existingNames} onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function AddRoomForm({
  state,
  existingNames,
  onDone,
}: {
  state: AustralianState | null
  existingNames: string[]
  onDone: () => void
}) {
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<NewRoomErrors>({})
  const [outcome, setOutcome] = useState<"not-connected" | null>(null)
  const [pending, startTransition] = useTransition()

  const legal = legalRatio(form.ageGroup, state)
  const input: NewRoom = {
    name: form.name.trim(),
    ageGroup: form.ageGroup,
    childrenPerEducator: form.stricter ? toNumber(form.stricterRatio) : legal,
    licensedPlaces: toNumber(form.licensedPlaces),
    theme: form.theme,
  }
  const errors: NewRoomErrors = submitted ? { ...serverErrors, ...validateNewRoom(input, { state, existingNames }) } : {}
  const places = input.licensedPlaces
  const ratioOk = Number.isInteger(input.childrenPerEducator) && input.childrenPerEducator >= 1
  const atCapacity = Number.isInteger(places) && places > 0 && ratioOk ? requiredEducators(places, input.childrenPerEducator) : null

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
    setServerErrors({})
    setOutcome(null)
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateNewRoom(input, { state, existingNames })).length > 0) return
    startTransition(async () => {
      const result = await createRoom(input)
      if (result.status === "saved") onDone()
      else if (result.status === "invalid") setServerErrors(result.errors)
      else setOutcome(result.status)
    })
  }

  return (
    <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b">
        <SheetTitle>Add room</SheetTitle>
        <SheetDescription>Set up a room so you can roster educators into it.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <Section title="Room">
          <Field label="Room name" error={errors.name} required>
            {(props) => (
              <Input
                {...props}
                autoComplete="off"
                placeholder="e.g. Possums"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            )}
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
            <Field label="Age group" error={errors.ageGroup} required>
              {(props) => (
                <Select
                  value={form.ageGroup}
                  onValueChange={(ageGroup: AgeGroup) =>
                    update({
                      ageGroup,
                      ...(!form.themeTouched && { theme: defaultTheme(ageGroup) }),
                      // A stricter ratio that's now looser than the new legal ratio no longer applies.
                      ...(form.stricter &&
                        toNumber(form.stricterRatio) >= legalRatio(ageGroup, state) && { stricter: false, stricterRatio: "" }),
                    })
                  }
                >
                  <SelectTrigger {...props} className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {ageGroupLabel[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Licensed places" error={errors.licensedPlaces} required>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={form.licensedPlaces}
                  onChange={(e) => update({ licensedPlaces: e.target.value })}
                />
              )}
            </Field>
          </div>
        </Section>

        <Separator />

        <Section title="Ratio">
          <div className="rounded-lg border bg-muted/40 px-3 py-3">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok-foreground">
                <ShieldCheckIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold tabular-nums">1:{legal}</span>
                  <span className="text-sm text-muted-foreground">
                    {state ? `${state} rule` : "National rule"} for {ageGroupLabel[form.ageGroup].toLowerCase()}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Set by the National Quality Framework. One educator for every {legal} children.
                </p>
                {!state && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <NotConnected needs="the centre's state, which sets the ratio. NSW, TAS and WA differ for 3–5 year olds." />
                    Using the national ratio until then.
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">Use a stricter ratio</span>
              <span className="block text-xs text-muted-foreground">
                Roster more educators than the law requires. It can never be looser.
              </span>
            </span>
            <Switch
              checked={form.stricter}
              disabled={legal <= 1}
              onCheckedChange={(stricter) => update({ stricter, stricterRatio: stricter ? String(legal - 1) : "" })}
              className="mt-0.5"
            />
          </label>
          {form.stricter && (
            <Field label="Children per educator" error={errors.childrenPerEducator} hint={`At most ${legal - 1} to be stricter`} required>
              {(props) => (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">1 :</span>
                  <Input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={legal}
                    step={1}
                    className="w-24"
                    value={form.stricterRatio}
                    onChange={(e) => update({ stricterRatio: e.target.value })}
                  />
                </div>
              )}
            </Field>
          )}
          {!form.stricter && errors.childrenPerEducator && (
            <p className="text-xs text-breach-foreground">{errors.childrenPerEducator}</p>
          )}

          {atCapacity !== null && (
            <p className="text-sm text-muted-foreground">
              When all {places} places are filled, this room needs{" "}
              <span className="font-semibold text-foreground">
                {atCapacity} {atCapacity === 1 ? "educator" : "educators"}
              </span>
              .
            </p>
          )}
        </Section>

        <Separator />

        <Section title="Colour" description="Used for this room across the roster.">
          <div role="radiogroup" aria-label="Room colour" className="grid grid-cols-4 gap-2">
            {ROOM_THEMES.map((theme) => {
              const t = roomThemeClasses[theme]
              const selected = form.theme === theme
              return (
                <button
                  key={theme}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update({ theme, themeTouched: true })}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected && "border-primary bg-primary/5 hover:bg-primary/5",
                  )}
                >
                  <span className={cn("flex size-8 items-center justify-center rounded-full", t.soft, t.ink)}>
                    <t.icon className="size-4" />
                  </span>
                  {themeLabel[theme]}
                  {selected && <CheckIcon className="absolute top-1.5 right-1.5 size-3.5 text-primary" />}
                </button>
              )
            })}
          </div>
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
              roomThemeClasses[form.theme].band,
            )}
          >
            {(() => {
              const t = roomThemeClasses[form.theme]
              return (
                <span className={cn("flex size-7 items-center justify-center rounded-full bg-card", t.ink)}>
                  <t.icon className="size-3.5" />
                </span>
              )
            })()}
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-semibold">{form.name.trim() || "Room name"}</span>
              <span className="block text-xs text-muted-foreground">
                {ageGroupLabel[form.ageGroup]} · 1:{form.stricter && ratioOk ? input.childrenPerEducator : legal}
              </span>
            </span>
            <span className="ml-auto text-xs text-muted-foreground">Preview</span>
          </div>
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
            {pending ? "Saving…" : "Add room"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
