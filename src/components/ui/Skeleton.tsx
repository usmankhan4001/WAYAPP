'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Skeleton loading placeholder with shimmer animation.
 * Use to replace content during loading states for a professional feel.
 */
export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'rounded-md h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines > 1) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(baseClasses, variantClasses[variant], className)}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : style.width, // Last line shorter for realism
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
}

/** Skeleton card matching the dashboard stat cards */
export function SkeletonCard() {
  return (
    <div className="card-base p-4 space-y-3">
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
    <div className="p-3.5 flex items-start gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 bg-slate-200 rounded w-28" />
          <div className="h-3 bg-slate-100 rounded w-12" />
        </div>
        <div className="h-3 bg-slate-100 rounded w-48" />
        <div className="h-3 bg-slate-100 rounded w-16" />
      </div>
    </div>
  );
}

/** Skeleton for chart/graph areas */
export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div className="card-base p-4 space-y-3">
      <div className="flex justify-between items-center">
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
          <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${50 + Math.random() * 50}%` }} />
        </td>
      ))}
    </tr>
  );
}
