'use client';

import React, { Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SessionProvider';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { MobileTabBar } from './MobileTabBar';
import { NotificationProvider } from '@/components/common/NotificationProvider';
import { MetaSetupGuideModal } from '@/components/common/MetaSetupGuideModal';
import { AppBanners, PushPermissionPrompt } from '@/components/notifications/AppBanners';
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
          <HideHeaderInOpenChat>
            <AppHeader
              onToggleMobileMenu={() => setIsMobileMenuOpen((v) => !v)}
              onOpenMetaGuide={() => setIsGuideOpen(true)}
            />
          </HideHeaderInOpenChat>

          <AppBanners />
          {pathname === '/' && <PushPermissionPrompt />}

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

        <MobileTabBar />

        <MetaSetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    </NotificationProvider>
  );
}

/** On a phone an open chat is full screen with its own back arrow, so the global top bar steps aside. */
function OpenChatGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const chatOpen = pathname.startsWith('/inbox') && Boolean(params.get('contactId'));
  return <div className={chatOpen ? 'max-md:hidden' : undefined}>{children}</div>;
}

function HideHeaderInOpenChat({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <OpenChatGate>{children}</OpenChatGate>
    </Suspense>
  );
}
