import Link from "next/link"

import { cn } from "@/lib/utils"

export function RosterViewSwitch({ value }: { value: "week" | "day" }) {
  const items = [
    { value: "week", label: "Week", href: "/roster" },
    { value: "day", label: "Day", href: "/roster/day" },
  ] as const

  return (
    <div className="inline-flex h-9 items-center rounded-xl bg-muted p-1 text-sm">
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          aria-current={item.value === value ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground",
            item.value === value && "bg-card text-foreground shadow-xs",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
