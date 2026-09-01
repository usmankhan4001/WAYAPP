'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, X, LogOut } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getVisibleNav, isActiveHref } from '@/lib/navigation';
import { useSession, useModules } from '@/components/providers/SessionProvider';
import { useNotifications } from '@/components/common/NotificationProvider';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { DevicePermissionsModal } from '@/components/common/DevicePermissionsModal';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEMBER: 'Team Member',
  VIEWER: 'Viewer',
};

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const { enabledModules } = useModules();
  const { unreadCount } = useNotifications();
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const navItems = getVisibleNav(enabledModules);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground">
            <svg viewBox="0 0 512 512" fill="none" className="size-full">
              <path d="M120 180L180 340L256 220L332 340L392 180" stroke="currentColor" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="392" cy="180" r="32" fill="currentColor" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
              WAY<span className="text-primary">APP</span>
            </span>
            <span className="block truncate text-2xs font-medium text-muted-foreground">WhatsApp Platform</span>
          </span>
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
        <p className="px-2 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </span>
              {item.badge === 'unread' && unreadCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : active ? (
                <span className="size-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <PWAInstallPrompt className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90" />
          <button
            onClick={() => setIsPermissionsOpen(true)}
            className="shrink-0 rounded-lg border border-border bg-card p-1.5 text-primary transition-colors hover:bg-accent"
            title="Device permissions"
          >
            <ShieldCheck className="size-4" />
          </button>
        </div>

        {user && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {(user.name || user.email || 'U').substring(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-foreground">{user.name || user.email}</span>
                <span className="block text-2xs font-semibold uppercase tracking-wider text-primary">
                  {ROLE_LABEL[user.role ?? ''] ?? 'Viewer'}
                </span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        )}

        <DevicePermissionsModal isOpen={isPermissionsOpen} onClose={() => setIsPermissionsOpen(false)} />
      </div>
    </aside>
  );
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  return (
    <>
      <div className="hidden md:block">
        <SidebarBody />
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-50 h-full w-64 max-w-[80vw] shadow-xl">
            <SidebarBody onNavigate={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
