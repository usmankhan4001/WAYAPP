'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SessionProvider';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { MobileTabBar } from './MobileTabBar';
import { NotificationProvider } from '@/components/common/NotificationProvider';
import { MetaSetupGuideModal } from '@/components/common/MetaSetupGuideModal';
import { InitialSetupGatekeeper } from '@/components/common/InitialSetupGatekeeper';

const BARE_ROUTES = ['/login', '/register', '/setup', '/design'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings, loading, setSettings } = useSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Pre-auth / first-run pages bypass the shell entirely.
  if (BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  if (loading && !settings) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  const isPlatformConfigured =
    settings?.isConnected ||
    Boolean(settings?.phoneNumberId && settings?.accessTokenMasked) ||
    Boolean(settings?.wabaId && settings?.phoneNumberId) ||
    settings?.isMockMode === true;

  if (!isPlatformConfigured) {
    return <InitialSetupGatekeeper onActivationSuccess={(updated) => setSettings(updated)} />;
  }

  const isInboxPage = pathname === '/inbox' || pathname.startsWith('/inbox/');

  return (
    <NotificationProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />

        <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader
            onToggleMobileMenu={() => setIsMobileMenuOpen((v) => !v)}
            onOpenMetaGuide={() => setIsGuideOpen(true)}
          />

          <main
            className={cn(
              'flex h-full min-h-0 w-full flex-1 flex-col',
              isInboxPage ? 'p-0' : 'overflow-y-auto p-3.5 pb-20 sm:p-5 md:p-6 md:pb-6'
            )}
          >
            {isInboxPage ? (
              children
            ) : (
              <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4">{children}</div>
            )}
          </main>
        </div>

        <MobileTabBar onOpenMore={() => setIsMobileMenuOpen(true)} />

        <MetaSetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    </NotificationProvider>
  );
}
