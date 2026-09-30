import * as React from "react"

import { cn } from "@/lib/utils"

type ListRowProps = {
  /** avatar or icon */
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** top-right meta, e.g. time */
  meta?: React.ReactNode
  /** bottom-right, e.g. unread Badge */
  trailing?: React.ReactNode
  active?: boolean
  className?: string
  onClick?: React.MouseEventHandler<HTMLElement>
}

/**
 * Two-line list row (chat list, contacts, settings). At least 56px tall so it
 * is a comfortable touch target. Pass onClick for a button row, or wrap the
 * row in a Link yourself for navigation.
 */
export function ListRow({ leading, title, subtitle, meta, trailing, active, className, onClick }: ListRowProps) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-active={active || undefined}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 outline-none focus-visible:bg-accent",
        onClick && "hover:bg-accent",
        active && "bg-accent",
        className
      )}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>}
      </span>
      {(meta || trailing) && (
        <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
          {meta}
          {trailing}
        </span>
      )}
    </Comp>
  )
}
