"use client"

import { BellIcon, ChevronDownIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { NotConnected } from "@/components/not-connected"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="text-muted-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <SunIcon className="hidden dark:block" />
          <MoonIcon className="dark:hidden" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative text-muted-foreground">
          <BellIcon />
        </Button>

        <NotConnected needs="sign-in (auth). The user shown here is a placeholder." className="ml-2 hidden sm:inline-flex" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 h-11 gap-3 rounded-full pr-3 pl-1">
              <Avatar className="size-9">
                <AvatarFallback className="bg-room-kindy-soft text-xs font-semibold text-room-kindy-ink">SM</AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold">Sarah Mitchell</span>
                <span className="block text-xs font-normal text-muted-foreground">Centre Director</span>
              </span>
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm">Sarah Mitchell</div>
              <div className="text-xs font-normal text-muted-foreground">Centre Director</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
