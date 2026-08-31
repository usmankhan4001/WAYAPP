'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Zap,
  FileText,
  Settings,
} from 'lucide-react';
import { useNotifications } from '@/components/common/NotificationProvider';

const BOTTOM_NAV_ITEMS = [
  { label: 'Chats', href: '/inbox', icon: MessageSquare, hasBadge: true },
  { label: 'Broadcasts', href: '/campaigns', icon: Send },
  { label: 'Automations', href: '/automations', icon: Zap },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadCount } = useNotifications();

  // Hide on auth routes
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  // Hide on inbox ONLY if a chat is actually open (contactId is present)
  // This allows the BottomNav to appear natively on the mobile Inbox list view
  if (pathname.startsWith('/inbox') && searchParams.get('contactId')) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 flex items-center justify-around shadow-lg safe-bottom">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative active:scale-95 ${
              isActive
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-emerald-600' : 'text-slate-500'} transition-transform`} />
              {item.hasBadge && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-5 h-0.5 rounded-full bg-emerald-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
