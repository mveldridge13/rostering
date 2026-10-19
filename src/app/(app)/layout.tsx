import { Suspense } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarMenuBadge, SidebarProvider } from "@/components/ui/sidebar"
import { getRosterWeek, getToday } from "@/lib/api"
import { weekStartOf } from "@/lib/domain/time"

async function OpenShiftBadge() {
  const { openShifts } = await getRosterWeek(weekStartOf(await getToday()))
  if (openShifts.length === 0) return null
  return <SidebarMenuBadge className="bg-warn/20 text-warn-foreground">{openShifts.length}</SidebarMenuBadge>
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        rosterBadge={
          <Suspense>
            <OpenShiftBadge />
          </Suspense>
        }
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
