'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const VARIANT: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'rounded-md h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-xl',
};

/**
 * Loading placeholder. `width` / `height` are the one sanctioned inline-style
 * use in the codebase (arbitrary runtime dimensions); everything else is tokens.
 */
export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const base = 'animate-pulse bg-muted';

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines > 1) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(base, VARIANT[variant], className)}
            style={{ ...style, width: i === lines - 1 ? '75%' : style.width }}
          />
        ))}
      </div>
    );
  }

  return <div className={cn(base, VARIANT[variant], className)} style={style} />;
}

/** Skeleton card matching the dashboard stat cards */
export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <Skeleton variant="rounded" width={40} height={40} />
        <Skeleton width={60} height={12} />
      </div>
      <Skeleton width={100} height={28} />
      <Skeleton width={140} height={12} />
    </div>
  );
}

/** Skeleton row for conversation lists */
export function SkeletonConversation() {
  return (
    <div className="flex animate-pulse items-start gap-3 p-3.5">
      <div className="size-10 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 w-28 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted/60" />
        </div>
        <div className="h-3 w-48 rounded bg-muted/60" />
        <div className="h-3 w-16 rounded bg-muted/60" />
      </div>
    </div>
  );
}

/** Skeleton for chart/graph areas */
export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <Skeleton width={150} height={16} />
        <Skeleton width={80} height={28} variant="rounded" />
      </div>
      <Skeleton variant="rounded" height={height} className="w-full" />
    </div>
  );
}

/** Skeleton for table rows */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 w-3/4 rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}
