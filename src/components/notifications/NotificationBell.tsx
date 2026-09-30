'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';

import { useSession } from '@/components/providers/SessionProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { groupNotifications, unreadBadgeLabel, type NotificationItem } from '@/lib/notifications/build';
import { NotificationPanel } from './NotificationPanel';

const POLL_MS = 30000;
const storageKey = (userId?: string) => `wayapp:notifications-read:${userId ?? 'anon'}`;

function readLastRead(userId?: string): number {
  try {
    return Number(window.localStorage.getItem(storageKey(userId))) || 0;
  } catch {
    return 0;
  }
}

/** Bell with an unread badge. Bottom sheet on phones, popover on desktop. "Read" is remembered per browser and user. */
export function NotificationBell() {
  const { user } = useSession();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => setLastReadAt(readLastRead(user?.id)), [user?.id]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.items)) setItems(data.items);
      setNow(new Date());
    } catch {
      // keep whatever we already show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const groups = useMemo(() => groupNotifications(items, now, lastReadAt), [items, now, lastReadAt]);

  const markAllRead = () => {
    const stamp = Date.now();
    setLastReadAt(stamp);
    try {
      window.localStorage.setItem(storageKey(user?.id), String(stamp));
    } catch {
      // private mode: the dots just come back on reload
    }
  };

  const label = groups.unreadCount ? `Notifications, ${groups.unreadCount} unread` : 'Notifications';
  const trigger = (
    <Button variant="outline" size="icon" className="relative" aria-label={label} onClick={isMobile ? () => setOpen(true) : undefined}>
      <Bell />
      {groups.unreadCount > 0 && (
        <Badge variant="count" className="absolute -right-1.5 -top-1.5 h-5 px-1 text-2xs">
          {unreadBadgeLabel(groups.unreadCount)}
        </Badge>
      )}
    </Button>
  );

  const panel = (
    <NotificationPanel
      groups={groups}
      now={now}
      loading={loading}
      onMarkAllRead={markAllRead}
      onNavigate={() => setOpen(false)}
      className="max-h-[70vh]"
    />
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Modal open={open} onOpenChange={setOpen} title="Notifications" contentClassName="px-0 pb-0">
          {panel}
        </Modal>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-96 gap-0 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Notifications</div>
        {panel}
      </PopoverContent>
    </Popover>
  );
}
