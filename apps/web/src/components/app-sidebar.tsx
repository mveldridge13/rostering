"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  DoorOpenIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const rosterNav = [
  { href: "/", label: "Today", icon: LayoutDashboardIcon, exact: true },
  { href: "/roster", label: "Roster", icon: CalendarRangeIcon, exact: true },
  { href: "/roster/day", label: "Day & ratios", icon: CalendarDaysIcon },
]

const centreNav = [
  { href: "/educators", label: "Team", icon: UsersIcon },
  { href: "/rooms", label: "Rooms", icon: DoorOpenIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

const navButton =
  "h-10 gap-3 rounded-xl px-3 text-[0.9rem] font-medium text-sidebar-foreground/80 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-[1.1rem]"

export function AppSidebar({ rosterBadge }: { rosterBadge?: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  const renderItems = (items: typeof rosterNav) =>
    items.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} tooltip={item.label} className={navButton}>
          <Link href={item.href}>
            <item.icon strokeWidth={1.75} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        {item.href === "/roster" && rosterBadge}
      </SidebarMenuItem>
    ))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-5 pb-4">
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <BrandMark className="size-8 shrink-0 text-primary" />
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[1.05rem] font-bold tracking-tight">Roster</span>
            <span className="text-[0.7rem] text-muted-foreground">Smart rosters. Happier rooms.</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderItems(rosterNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-4" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderItems(centreNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-5 group-data-[collapsible=icon]:hidden">
        <CentreIllustration className="w-full max-w-[13rem]" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Better childcare starts
          <br />
          with great people.
        </p>
        <Link
          href="/settings?tab=integrations"
          className="mt-1 inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground hover:text-foreground"
        >
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          CCS not connected
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** Placeholder brand mark: a sprig. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d="M16 29V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 18c-4.5 0-8-3-8.5-8 4.5 0 8 3 8.5 8Z" fill="currentColor" opacity=".55" />
      <path d="M16 15c4.5 0 8-3 8.5-8-4.5 0-8 3-8.5 8Z" fill="currentColor" />
      <circle cx="16" cy="6.5" r="3" fill="oklch(0.82 0.14 85)" />
      <circle cx="9.5" cy="21.5" r="2.2" fill="oklch(0.82 0.14 85)" />
      <circle cx="22.5" cy="19.5" r="2.2" fill="oklch(0.82 0.14 85)" />
    </svg>
  )
}

/** Soft pastel centre-and-trees illustration for the sidebar footer. */
function CentreIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={className} aria-hidden>
      <circle cx="48" cy="52" r="34" className="fill-room-kindy-soft" />
      <circle cx="150" cy="40" r="26" className="fill-room-toddler-soft" />
      <ellipse cx="100" cy="104" rx="96" ry="6" className="fill-muted" />
      {/* house */}
      <path d="M58 62 88 38l30 24v42H58Z" className="fill-card stroke-room-kindy" strokeWidth="2" strokeLinejoin="round" />
      <path d="M52 64 88 34l36 30" className="stroke-room-kindy" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M80 104V84a8 8 0 0 1 16 0v20" className="fill-room-kindy-soft stroke-room-kindy" strokeWidth="2" />
      <circle cx="88" cy="58" r="5" className="fill-room-nursery-soft stroke-room-nursery" strokeWidth="1.5" />
      {/* trees */}
      <path d="M150 104V70" className="stroke-room-toddler-ink" strokeWidth="3" strokeLinecap="round" />
      <circle cx="150" cy="62" r="16" className="fill-room-toddler" opacity=".85" />
      <circle cx="140" cy="72" r="10" className="fill-room-toddler" />
      <circle cx="161" cy="72" r="9" className="fill-room-toddler" opacity=".9" />
      <path d="M30 104V86" className="stroke-room-toddler-ink" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="80" r="10" className="fill-room-toddler" opacity=".6" />
      <circle cx="176" cy="98" r="6" className="fill-room-preschool" opacity=".5" />
      <circle cx="128" cy="100" r="4" className="fill-room-nursery" opacity=".6" />
    </svg>
  )
}
