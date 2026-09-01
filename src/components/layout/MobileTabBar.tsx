'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getPrimaryNav, isActiveHref } from '@/lib/navigation';
import { useModules } from '@/components/providers/SessionProvider';
import { useNotifications } from '@/components/common/NotificationProvider';

function MobileTabBarInner({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { enabledModules } = useModules();
  const { unreadCount } = useNotifications();

  if (pathname === '/login' || pathname === '/register') return null;
  // On the inbox, hide the bar once a chat is open (full-screen stacked view).
  if (pathname.startsWith('/inbox') && searchParams.get('contactId')) return null;

  const items = getPrimaryNav(enabledModules);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 px-2 py-1 backdrop-blur-md md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-lg px-3 py-1 transition-colors active:scale-95',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Icon className={cn('size-5 transition-transform', active && 'scale-110')} />
              {item.badge === 'unread' && unreadCount > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="mt-1 text-[0.625rem] font-medium">{item.shortLabel ?? item.label}</span>
            {active && <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-primary" />}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        className="relative flex flex-col items-center justify-center rounded-lg px-3 py-1 text-muted-foreground transition-colors active:scale-95"
      >
        <MoreHorizontal className="size-5" />
        <span className="mt-1 text-[0.625rem] font-medium">More</span>
      </button>
    </nav>
  );
}

export function MobileTabBar({ onOpenMore }: { onOpenMore?: () => void }) {
  return (
    <Suspense fallback={null}>
      <MobileTabBarInner onOpenMore={onOpenMore} />
    </Suspense>
  );
}
