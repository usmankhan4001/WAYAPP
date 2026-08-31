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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fcf5eb]/95 backdrop-blur-md border-t border-[#1c1e21]/10 px-2 py-1.5 flex items-center justify-around shadow-xl safe-bottom">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all relative ${
              isActive
                ? 'text-[#1c1e21] font-normal font-normal'
                : 'text-[#1c1e21]/70 hover:text-[#1c1e21]'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'scale-105' : ''} transition-transform`} />
              {item.hasBadge && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#25d366] text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center ">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            {isActive && (
              <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-[#25d366]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
