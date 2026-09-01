import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** right-aligned actions (buttons, filters) */
  actions?: React.ReactNode;
  /** optional leading icon element */
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Standard page title block. Replaces the copy-pasted
 * `<h1 class="text-xl">` / `<p class="text-xs">` header on ~10 pages.
 */
export function PageHeader({ title, description, actions, icon, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-foreground [&_svg]:size-4.5">
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
