import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The one alert. Use it for anything that tells the person something is wrong, fine, or worth
 * knowing: form errors, "not connected" notices, offline notices, success messages.
 *   layout="inline"  a rounded card inside a page or dialog
 *   layout="banner"  a full-width strip under the header (connection lost, install the app...)
 * danger and warning are announced to screen readers immediately; info and success politely.
 */
const alertVariants = cva("relative flex w-full items-start gap-3 border text-sm", {
  variants: {
    tone: {
      info: "border-info/30 bg-info-subtle text-info-subtle-foreground",
      success: "border-success/30 bg-success-subtle text-success-subtle-foreground",
      warning: "border-warning/30 bg-warning-subtle text-warning-subtle-foreground",
      danger: "border-danger/30 bg-danger/10 text-foreground",
    },
    layout: {
      inline: "rounded-2xl p-4",
      banner: "rounded-none border-x-0 border-t-0 px-4 py-3",
    },
  },
  defaultVariants: { tone: "info", layout: "inline" },
})

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert } as const
const ICON_TONE = { info: "text-info", success: "text-success", warning: "text-warning", danger: "text-danger" } as const

type AlertProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode
    /** a button or link, shown on the right (or below on a phone) */
    action?: React.ReactNode
    /** shows a close button when provided */
    onDismiss?: () => void
    icon?: React.ComponentType<{ className?: string }> | null
  }

export function Alert({ tone = "info", layout = "inline", title, action, onDismiss, icon, className, children, ...props }: AlertProps) {
  const t = tone ?? "info"
  const Icon = icon === null ? null : icon ?? ICONS[t]
  return (
    <div
      role={t === "danger" || t === "warning" ? "alert" : "status"}
      data-slot="alert"
      className={cn(alertVariants({ tone, layout }), className)}
      {...props}
    >
      {Icon && <Icon className={cn("mt-0.5 size-5 shrink-0", ICON_TONE[t])} aria-hidden />}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-semibold leading-snug text-foreground">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
      {action && <div className="ml-auto flex shrink-0 items-center self-center">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
