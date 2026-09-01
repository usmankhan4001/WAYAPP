import * as React from "react";

import { cn } from "@/lib/utils";

export interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** small helper line under the value */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** trend delta, e.g. "+12%" */
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  className?: string;
}

const DELTA_TONE: Record<NonNullable<StatProps["deltaTone"]>, string> = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

/** Dashboard KPI card. */
export function Stat({ label, value, hint, icon, delta, deltaTone = "neutral", className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {delta && <span className={cn("text-xs font-medium", DELTA_TONE[deltaTone])}>{delta}</span>}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>
  );
}
