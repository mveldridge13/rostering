import type { Metadata } from "next"
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, CheckIcon, CircleIcon } from "lucide-react"

import { ageGroupLabel, PageHeader, RoomLabel } from "@/components/roster/primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCentre, getRooms } from "@/lib/api"
import { formatMinutes } from "@/lib/domain/time"

export const metadata: Metadata = { title: "Settings" }

const inbound = [
  { label: "Enrolments & booking patterns", detail: "Drives expected children per room", live: true },
  { label: "Absences & casual bookings", detail: "Adjusts ratios on the day", live: true },
  { label: "Educator records", detail: "Names, qualifications, WWCC", live: true },
]

const outbound = [
  { label: "Published rosters", detail: "Shown to families and staff in your CCS app", live: true },
  { label: "Timesheets for payroll", detail: "Actual hours against the roster", live: false },
  { label: "Educator attendance records", detail: "Required for CCS reporting", live: false },
]

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { tab } = await searchParams
  const [centre, rooms] = await Promise.all([getCentre(), getRooms()])

  return (
    <>
      <PageHeader title="Settings" description={centre.name} />
      <div className="px-4 pt-4 pb-8 md:px-8">
        <Tabs defaultValue={typeof tab === "string" ? tab : "centre"} className="gap-6">
          <TabsList>
            <TabsTrigger value="centre">Centre</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="ratios">Ratios & rules</TabsTrigger>
          </TabsList>

          <TabsContent value="centre" className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Centre details</CardTitle>
                <CardDescription>Used for ratio rules and roster headers.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Service name" defaultValue={centre.name} className="sm:col-span-2" />
                <Field id="san" label="Service approval number" defaultValue={centre.serviceApprovalNumber} mono />
                <Field id="state" label="State or territory" defaultValue={centre.state} />
                <Field id="opens" label="Opens" defaultValue={formatMinutes(centre.opensAt)} />
                <Field id="closes" label="Closes" defaultValue={formatMinutes(centre.closesAt)} />
                <Field id="budget" label="Weekly wage budget" defaultValue={`$${centre.weeklyWageBudget.toLocaleString("en-AU")}`} mono />
              </CardContent>
              <CardFooter className="justify-end border-t">
                <Button>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="flex max-w-3xl flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CCS software</CardTitle>
                <CardDescription>
                  Your Child Care Subsidy management system is the source of truth for children, bookings and staff.
                </CardDescription>
                <CardAction>
                  <Badge variant="outline" className="border-ok/30 bg-ok/10 text-ok-foreground">
                    <CircleIcon className="fill-current" />
                    Connected
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <SyncList title="We read" icon={<ArrowDownToLineIcon />} items={inbound} />
                <SyncList title="We send back" icon={<ArrowUpFromLineIcon />} items={outbound} />
              </CardContent>
              <CardFooter className="justify-between border-t text-xs text-muted-foreground">
                Last synced 4 minutes ago · 61 children, 20 educators
                <Button variant="outline" size="sm">
                  Sync now
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed in your CCS app</CardTitle>
                <CardDescription>
                  Drop the roster into another product. Sign-in is passed through, so staff don&apos;t log in twice.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
{`<script src="https://embed.wattleroster.app/v1.js"></script>
<wattle-roster
  centre="${centre.serviceApprovalNumber}"
  view="week"
  token="{{ session_token }}">
</wattle-roster>`}
                </pre>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="client" label="Client ID" defaultValue="wr_live_7f3a91c2" mono readOnly />
                  <Field id="webhook" label="Webhook endpoint" defaultValue="https://api.wattleroster.app/hooks/ccs" mono readOnly />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratios" className="flex max-w-3xl flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Educator-to-child ratios</CardTitle>
                <CardDescription>National Quality Framework ratios for {centre.state}. Applied per room, per half hour.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Room</TableHead>
                      <TableHead>Age group</TableHead>
                      <TableHead className="pr-6 text-right">Ratio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-6">
                          <RoomLabel room={r} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{ageGroupLabel[r.ageGroup]}</TableCell>
                        <TableCell className="pr-6 text-right font-mono tabular-nums">1:{r.childrenPerEducator}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roster rules</CardTitle>
                <CardDescription>Checks run every time a shift changes.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col divide-y">
                {[
                  ["Room ratios", "Every room meets its ratio for each half hour children are booked.", true],
                  ["Credentials current", "No shifts with children for anyone whose WWCC has expired.", true],
                  ["Contract hours", "Warn when a shift takes someone past their contracted hours.", true],
                  ["Early childhood teacher", "Meet ECT attendance requirements for the number of children on site.", false],
                  ["Under-the-roof ratios", "Count all educators across rooms at opening and closing.", false],
                  ["Staggered breaks", "Deduct breaks from coverage and suggest break times.", false],
                ].map(([title, detail, live]) => (
                  <div key={title as string} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={
                        live
                          ? "mt-0.5 flex size-5 items-center justify-center rounded-full bg-ok/15 text-ok-foreground"
                          : "mt-0.5 flex size-5 items-center justify-center rounded-full border border-dashed text-muted-foreground"
                      }
                    >
                      {live && <CheckIcon className="size-3" />}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">{detail}</div>
                    </div>
                    {!live && <Badge variant="secondary">Planned</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function Field({
  id,
  label,
  defaultValue,
  mono,
  readOnly,
  className,
}: {
  id: string
  label: string
  defaultValue: string
  mono?: boolean
  readOnly?: boolean
  className?: string
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} defaultValue={defaultValue} readOnly={readOnly} className={mono ? "font-mono text-xs" : undefined} />
    </div>
  )
}

function SyncList({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: { label: string; detail: string; live: boolean }[]
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {title}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            <span
              className={
                item.live
                  ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok-foreground"
                  : "mt-0.5 size-4 shrink-0 rounded-full border border-dashed"
              }
            >
              {item.live && <CheckIcon className="size-2.5" />}
            </span>
            <span>
              <span className="block text-sm">
                {item.label}
                {!item.live && <span className="ml-1.5 text-xs text-muted-foreground">Planned</span>}
              </span>
              <span className="block text-xs text-muted-foreground">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
