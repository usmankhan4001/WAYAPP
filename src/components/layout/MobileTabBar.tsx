'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { MoreHorizontal, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getPrimaryNav, getOverflowNav, isActiveHref } from '@/lib/navigation';
import { useModules, useDeveloperMode } from '@/components/providers/SessionProvider';
import { useNotifications } from '@/components/common/NotificationProvider';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Badge } from '@/components/ui/badge';

function MobileTabBarInner({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { enabledModules } = useModules();
  const { developerMode } = useDeveloperMode();
  const { unreadCount } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  if (pathname === '/login' || pathname === '/register') return null;
  // On the inbox, hide the bar once a chat is open (full-screen stacked view).
  if (pathname.startsWith('/inbox') && searchParams.get('contactId')) return null;

  const items = getPrimaryNav(enabledModules, developerMode);
  const overflow = getOverflowNav(enabledModules, developerMode);
  const moreActive = overflow.some((i) => isActiveHref(pathname, i.href));

  const handleMore = () => {
    if (onOpenMore) onOpenMore();
    else setMoreOpen(true);
  };

  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card/95 px-2 pt-1.5 pb-1 backdrop-blur-md md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors duration-150 active:scale-95',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150',
                  active && 'bg-accent'
                )}
              >
                <Icon className="size-5" />
                {item.badge === 'unread' && unreadCount > 0 && (
                  <Badge variant="count" className="absolute -right-0.5 -top-1 h-4 min-h-4 min-w-4 px-1 text-2xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </span>
              <span className={cn('max-w-full truncate text-xs', active ? 'font-semibold' : 'font-medium')}>
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleMore}
          aria-haspopup="dialog"
          className={cn(
            'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors duration-150 active:scale-95',
            moreActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', moreActive && 'bg-accent')}>
            <MoreHorizontal className="size-5" />
          </span>
          <span className={cn('text-xs', moreActive ? 'font-semibold' : 'font-medium')}>More</span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More" size="sm">
        <ul className="flex flex-col">
          {overflow.map((item) => {
            const Icon = item.icon;
            const active = isActiveHref(pathname, item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-2xl px-3 text-base font-medium transition-colors duration-150 hover:bg-accent',
                    active ? 'bg-accent text-foreground' : 'text-foreground'
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-raised">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

export function MobileTabBar({ onOpenMore }: { onOpenMore?: () => void }) {
  return (
    <Suspense fallback={null}>
      <MobileTabBarInner onOpenMore={onOpenMore} />
    </Suspense>
  );
}
