import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // semantic status tones (subtle fill + readable text)
        brand: "bg-brand-subtle text-brand-subtle-foreground",
        success: "bg-success-subtle text-success-subtle-foreground",
        warning: "bg-warning-subtle text-warning-subtle-foreground",
        info: "bg-info-subtle text-info-subtle-foreground",
        accent: "bg-accent text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const STATUS_TONE: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  brand: "brand",
  success: "success",
  warning: "warning",
  info: "info",
  accent: "accent",
  destructive: "destructive",
  neutral: "secondary",
};

/**
 * Badge whose colour is driven by a semantic status/tone string. Replaces the
 * ad-hoc `bg-*-100 text-*-800` colour strings scattered through the CRM.
 */
function StatusBadge({
  tone,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant"> & { tone: string }) {
  return <Badge variant={STATUS_TONE[tone] ?? "secondary"} className={className} {...props} />;
}

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, StatusBadge, badgeVariants }
