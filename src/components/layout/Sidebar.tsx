'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Send,
  FileText,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  ShieldCheck,
  Zap,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { DevicePermissionsModal } from '@/components/common/DevicePermissionsModal';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Campaigns', href: '/campaigns', icon: Send },
  { label: 'Automations', href: '/automations', icon: Zap },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'Contacts & Groups', href: '/contacts', icon: Users },
  { label: 'Live Inbox', href: '/inbox', icon: MessageSquare },
  { label: 'Analytics & Funnel', href: '/analytics', icon: BarChart3 },
  { label: 'API & Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  };

  const sidebarContent = (
    <aside className="w-60 bg-slate-950 text-slate-200 flex flex-col shrink-0 border-r border-slate-800/80 h-full min-h-screen">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 p-1 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-400/20">
            <svg viewBox="0 0 512 512" fill="none" className="w-full h-full">
              <path d="M120 180L180 340L256 220L332 340L392 180" stroke="#FFFFFF" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="392" cy="180" r="32" fill="#34d399" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm text-white tracking-tight block truncate">
              WAY<span className="text-emerald-400">APP</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium truncate">WhatsApp Platform</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors shrink-0',
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User & Footer Info */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center gap-2">
          <PWAInstallPrompt className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all" />
          <button
            onClick={() => setIsPermissionsOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all shrink-0"
            title="Device Permissions"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {user && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {user.name ? user.name.substring(0, 1).toUpperCase() : 'G'}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-white block truncate">
                  {user.name || user.email}
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider block">
                  {user.role === 'SUPER_ADMIN' ? 'GCC Admin' : 'GCC Member'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Meta Graph v21.0 Ready</span>
        </div>

        <DevicePermissionsModal
          isOpen={isPermissionsOpen}
          onClose={() => setIsPermissionsOpen(false)}
        />
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-60 max-w-[80vw] h-full shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
