'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Pencil, Play, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { statusFor } from '@/lib/automations/present';

/**
 * One card for every automation item (quick reply, flow, assistant): title, one plain line,
 * an On/Paused switch, and only the actions that exist for that item.
 */
export function AutomationCard({
  title,
  description,
  badge,
  lines,
  meta,
  active,
  onToggle,
  toggleDisabled,
  onTry,
  onEdit,
  onDelete,
  editHref,
}: {
  title: string;
  description?: string;
  badge?: string;
  lines?: { label: string; text: string }[];
  meta?: string;
  active: boolean;
  onToggle: (next: boolean) => void;
  toggleDisabled?: boolean;
  onTry?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  editHref?: string;
}) {
  const status = statusFor(active);
  return (
    <Card className={active ? 'p-4' : 'p-4 opacity-80'}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <label className="flex shrink-0 items-center gap-2 py-1 text-sm font-medium text-muted-foreground">
          <span className={active ? 'text-success' : ''}>{status.label}</span>
          <Switch
            checked={active}
            disabled={toggleDisabled}
            onCheckedChange={(v: boolean) => onToggle(v)}
            aria-label={`${title}: ${active ? 'turn off' : 'turn on'}`}
          />
        </label>
      </div>
      {lines && lines.length > 0 && (
        <dl className="mt-3 space-y-1.5 rounded-xl bg-muted p-3 text-sm">
          {lines.map((l) => (
            <div key={l.label} className="flex gap-2">
              <dt className="w-11 shrink-0 font-medium text-muted-foreground">{l.label}</dt>
              <dd className="min-w-0 break-words text-foreground">{l.text}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onTry && (
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={onTry}>
            <Play /> Try it
          </Button>
        )}
        {(onEdit || editHref) &&
          (editHref ? (
            <Button variant="outline" size="sm" className="h-9" render={<Link href={editHref} />}>
              <Pencil /> Edit
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={onEdit}>
              <Pencil /> Edit
            </Button>
          ))}
        {onDelete && (
          <Button type="button" variant="ghost" size="sm" className="h-9 text-destructive" onClick={onDelete} aria-label={`Delete ${title}`}>
            <Trash2 /> Delete
          </Button>
        )}
        {meta && <span className="ml-auto text-xs text-muted-foreground">{meta}</span>}
      </div>
    </Card>
  );
}

export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="space-y-3 p-4">
          <Skeleton variant="rounded" height={20} width="55%" />
          <Skeleton variant="rounded" height={14} width="80%" />
          <Skeleton variant="rounded" height={36} />
        </Card>
      ))}
    </div>
  );
}

/** Friendly load failure with a retry button. */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <Alert
      tone="danger"
      title={`We could not load your ${what}`}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      Check your connection and try again. Nothing was changed.
    </Alert>
  );
}

/** Field with a label, optional hint, and an inline plain-word error. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Technical fields live in here, closed by default. */
export function Advanced({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-medium text-foreground"
      >
        Advanced
        <ChevronDown className={open ? 'size-4 rotate-180 transition-transform' : 'size-4 transition-transform'} />
      </button>
      {open && <div className="space-y-4 border-t border-border p-3">{children}</div>}
    </div>
  );
}
