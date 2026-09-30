"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, CircleAlertIcon, Loader2Icon } from "lucide-react"

import { useIsMobile } from "@/lib/hooks/use-is-mobile"

/**
 * The one toast look. Short confirmations only: 4s, bottom on phones, top-right on desktop.
 * Icons carry the tone (success, danger, info, warning); the card itself stays neutral.
 * Action button: toast.success("Saved", { action: { label: "Undo", onClick } }).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const isMobile = useIsMobile()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isMobile ? "bottom-center" : "top-right"}
      duration={4000}
      mobileOffset={{ bottom: "5.5rem", left: "1rem", right: "1rem" }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-success" />,
        info: <InfoIcon className="size-5 text-info" />,
        warning: <TriangleAlertIcon className="size-5 text-warning" />,
        error: <CircleAlertIcon className="size-5 text-danger" />,
        loading: <Loader2Icon className="size-5 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !gap-3 !p-4 !shadow-lg",
          title: "!text-sm !font-semibold !text-foreground",
          description: "!text-sm !text-muted-foreground",
          actionButton: "!h-8 !rounded-full !bg-primary !px-3 !text-xs !font-semibold !text-primary-foreground",
          cancelButton: "!h-8 !rounded-full !bg-secondary !px-3 !text-xs !text-secondary-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
