import * as React from "react"

import { cn } from "@/lib/utils"

type ChipProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  selected?: boolean
  /** optional count shown after the label */
  count?: number
}

/** Filter chip (pill). Selected = primary fill, idle = raised surface. */
export function Chip({ selected = false, count, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        selected ? "bg-primary text-primary-foreground" : "bg-raised text-foreground hover:bg-accent",
        className
      )}
      {...props}
    >
      {children}
      {count != null && (
        <span className={cn("text-xs tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>{count}</span>
      )}
    </button>
  )
}
