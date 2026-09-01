"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface FilterOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export interface FilterTabsProps<T extends string = string> {
  options: readonly FilterOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Horizontal single-select filter pills (scrollable on mobile). Replaces the
 * three divergent filter-pill styles across campaigns / inbox / contacts.
 */
export function FilterTabs<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
  size = "md",
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("flex items-center gap-1.5 overflow-x-auto", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-sm",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-2xs tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-foreground/10"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact enclosed segmented control (iOS-style). Use for 2–4 mutually
 * exclusive view modes (e.g. Table / Kanban).
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-card text-foreground ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
