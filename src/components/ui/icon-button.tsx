import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, "size" | "children"> & {
  /** Required: icon-only controls must be named for screen readers. */
  label: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

const SIZE = {
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
} as const

/** Round icon-only button. 44px touch target on phones. */
export function IconButton({ label, size = "md", variant = "ghost", className, children, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant={variant}
      size={SIZE[size]}
      className={cn("rounded-full", className)}
      {...props}
    >
      {children}
    </Button>
  )
}
