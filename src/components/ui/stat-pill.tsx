import * as React from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

type StatPillProps = {
  label?: React.ReactNode
  value: React.ReactNode
  /** percent change; positive = up. Omit for no arrow. */
  change?: number | null
  /** invert good/bad colours (e.g. failed sends going up is bad) */
  invert?: boolean
  className?: string
}

/** Value plus a change arrow. Green up, red down, muted when flat. */
export function StatPill({ label, value, change, invert = false, className }: StatPillProps) {
  const dir = change == null || change === 0 ? "flat" : change > 0 ? "up" : "down"
  const good = dir === "flat" ? null : (dir === "up") !== invert
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus
  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span className="inline-flex items-center gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</span>
        {change != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              good === null && "bg-raised text-muted-foreground",
              good === true && "bg-success-subtle text-success-subtle-foreground",
              good === false && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon className="size-3" aria-hidden />
            {Math.abs(change)}%
          </span>
        )}
      </span>
    </span>
  )
}
