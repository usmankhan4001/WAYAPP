"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

export function TooltipProvider({
  delay = 200,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  return <TooltipPrimitive.Provider delay={delay}>{children}</TooltipPrimitive.Provider>;
}

/** Base UI tooltip re-exports for advanced composition. */
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> & { side?: Side; sideOffset?: number }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          className={cn(
            "z-50 w-max max-w-xs rounded-md bg-foreground px-2 py-1 text-xs leading-snug text-background shadow-md",
            "origin-[var(--transform-origin)] transition-[transform,opacity] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  position?: Side;
  className?: string;
}

/**
 * Back-compat wrapper: `<Tooltip content="…" position="top">{trigger}</Tooltip>`.
 * Now a real Base UI tooltip (portal, focus/hover, dismissal, a11y).
 */
export function Tooltip({ content, children, position = "top", className }: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={<span className={cn("inline-flex items-center", className)} />}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipContent side={position}>{content}</TooltipContent>
    </TooltipPrimitive.Root>
  );
}

/** Subtle "?" help icon with an attached tooltip. */
export function InfoTooltip({
  content,
  size = "sm",
  position = "top",
}: {
  content: React.ReactNode;
  /** icon size token */
  size?: "xs" | "sm" | "md";
  position?: Side;
}) {
  const iconSize = size === "xs" ? "size-3" : size === "md" ? "size-4" : "size-3.5";
  return (
    <Tooltip content={content} position={position}>
      <span className="inline-flex cursor-help items-center p-0.5 text-muted-foreground transition-colors hover:text-foreground">
        <HelpCircle className={iconSize} />
      </span>
    </Tooltip>
  );
}
