'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Send,
  RefreshCw,
  Menu,
  BookOpen,
  LogOut,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { useSession, useSettings } from '@/components/providers/SessionProvider';
import { useNotifications } from '@/components/common/NotificationProvider';
import { useToast } from '@/components/ui/Toast';
import { ThemeToggle } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DevicePermissionsModal } from '@/components/common/DevicePermissionsModal';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEMBER: 'Team Member',
  VIEWER: 'Viewer',
};

interface AppHeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenMetaGuide?: () => void;
}

export function AppHeader({ onToggleMobileMenu, onOpenMetaGuide }: AppHeaderProps) {
  const router = useRouter();
  const { user } = useSession();
  const { settings } = useSettings();
  const { isMuted, toggleMute } = useNotifications();
  const toast = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_CONNECTION' }),
      });
      const data = await res.json();
      if (data.success) toast.success('Meta Cloud API connected');
      else toast.error('Connection issue', data.message);
    } catch {
      toast.error('Unable to reach server');
    } finally {
      setIsTesting(false);
    }
  };

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
    <header className="safe-top sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="-ml-1 rounded-lg p-1.5 text-foreground transition-colors hover:bg-accent md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
        )}
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-success ring-2 ring-success/25" />
          <span className="truncate text-sm font-semibold text-foreground">
            {settings?.businessName || 'My WhatsApp Business'}
          </span>
        </div>
        {settings?.businessPhone && (
          <>
            <span className="hidden h-3.5 w-px bg-border sm:block" />
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {settings.businessPhone}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={isTesting}
          className="hidden sm:inline-flex"
        >
          <RefreshCw className={isTesting ? 'animate-spin text-primary' : ''} />
          <span>{isTesting ? 'Testing…' : 'Test API'}</span>
        </Button>

        <ThemeToggle className="hidden sm:inline-flex" />

        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          title={isMuted ? 'Notification sound muted' : 'Notification sound on'}
        >
          {isMuted ? <VolumeX className="text-destructive" /> : <Volume2 className="text-primary" />}
        </Button>

        <Button variant="wa" size="sm" render={<Link href="/campaigns/new" />}>
          <Send />
          <span className="hidden sm:inline">New Broadcast</span>
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
              }
            >
              {(user.name || user.email || 'U').substring(0, 1).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate">{user.name || user.email}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {ROLE_LABEL[user.role ?? ''] ?? 'Viewer'}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 sm:hidden">
                <ThemeToggle className="w-full justify-between" />
              </div>
              {onOpenMetaGuide && (
                <DropdownMenuItem onClick={onOpenMetaGuide}>
                  <BookOpen />
                  Setup guide
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsPermissionsOpen(true)}>
                <ShieldCheck />
                Device permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <DevicePermissionsModal isOpen={isPermissionsOpen} onClose={() => setIsPermissionsOpen(false)} />
    </header>
  );
}
