'use client';

import React from 'react';
import Link from 'next/link';
import { BellOff, CheckCheck, CircleAlert, CircleCheck, Megaphone, MessageSquare, TriangleAlert, WifiOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  relativeTime,
  type NotificationGroups,
  type NotificationKind,
  type NotificationRow,
} from '@/lib/notifications/build';

const KIND_ICON: Record<NotificationKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  message: { icon: MessageSquare, tone: 'bg-brand-subtle text-brand-subtle-foreground' },
  failed: { icon: CircleAlert, tone: 'bg-danger/10 text-danger' },
  broadcast: { icon: Megaphone, tone: 'bg-info-subtle text-info-subtle-foreground' },
  template_approved: { icon: CircleCheck, tone: 'bg-success-subtle text-success-subtle-foreground' },
  template_rejected: { icon: TriangleAlert, tone: 'bg-warning-subtle text-warning-subtle-foreground' },
  connection: { icon: WifiOff, tone: 'bg-warning-subtle text-warning-subtle-foreground' },
};

function Row({ row, now, onNavigate }: { row: NotificationRow; now: Date; onNavigate?: () => void }) {
  const { icon: Icon, tone } = KIND_ICON[row.kind];
  return (
    <li>
      <Link
        href={row.href}
        onClick={onNavigate}
        className="flex min-h-14 items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full', tone)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm leading-snug text-foreground', row.unread && 'font-semibold')}>{row.text}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{relativeTime(row.at, now)}</span>
        </span>
        {row.unread && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </Link>
    </li>
  );
}

function Group({ label, rows, now, onNavigate }: { label: string; rows: NotificationRow[]; now: Date; onNavigate?: () => void }) {
  if (!rows.length) return null;
  return (
    <section>
      <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <Row key={r.id} row={r} now={now} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  );
}

/** The list inside the bell popover / bottom sheet. Pure presentation, so /design can render it with sample rows. */
export function NotificationPanel({
  groups,
  now = new Date(),
  loading = false,
  onMarkAllRead,
  onNavigate,
  className,
}: {
  groups: NotificationGroups;
  now?: Date;
  loading?: boolean;
  onMarkAllRead?: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const empty = groups.today.length + groups.earlier.length === 0;
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {!empty && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">{groups.unreadCount ? `${groups.unreadCount} unread` : 'All read'}</span>
          <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={!groups.unreadCount}>
            <CheckCheck />
            Mark all as read
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <BellOff className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">{loading ? 'Loading' : 'You are all caught up'}</p>
            {!loading && <p className="text-xs text-muted-foreground">New messages and updates will show up here.</p>}
          </div>
        ) : (
          <>
            <Group label="Today" rows={groups.today} now={now} onNavigate={onNavigate} />
            <Group label="Earlier" rows={groups.earlier} now={now} onNavigate={onNavigate} />
          </>
        )}
      </div>
    </div>
  );
}
