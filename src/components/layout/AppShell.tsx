'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { NotificationProvider } from '@/components/common/NotificationProvider';
import { MetaSetupGuideModal } from '@/components/common/MetaSetupGuideModal';
import { InitialSetupGatekeeper } from '@/components/common/InitialSetupGatekeeper';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionAndSettings = async () => {
    try {
      const [settingsRes, authRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/auth/me'),
      ]);

      const settingsData = await settingsRes.json();
      const authData = await authRes.json();

      setSettings(settingsData);
      if (authData?.authenticated && authData.user) {
        setUser(authData.user);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndSettings();
  }, [pathname]);

  // Bypass shell completely on login page
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="h-screen h-[100dvh] w-screen bg-transparent flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Gatekeeper: Only show if NO credentials or mock mode are configured
  const isPlatformConfigured =
    settings?.isConnected ||
    Boolean(settings?.phoneNumberId && settings?.accessTokenMasked) ||
    Boolean(settings?.wabaId && settings?.phoneNumberId) ||
    settings?.isMockMode === true;

  if (!isPlatformConfigured) {
    return (
      <InitialSetupGatekeeper
        onActivationSuccess={(updatedSettings) => {
          setSettings(updatedSettings);
        }}
      />
    );
  }

  const isInboxPage = pathname === '/inbox' || pathname.startsWith('/inbox/');

  // Full Active Native App Shell Workspace
  return (
    <NotificationProvider>
      <div className="h-[100dvh] w-full flex bg-slate-50 text-slate-900 overflow-hidden">
        {/* Sidebar (Desktop + Sliding Mobile Drawer) */}
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          <Header
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            onOpenMetaGuide={() => setIsGuideOpen(true)}
          />

          <main className={`flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col ${
            isInboxPage ? 'p-0' : 'overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-20 md:pb-6'
          }`}>
            {isInboxPage ? (
              children
            ) : (
              <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col space-y-4">
                {children}
              </div>
            )}
          </main>
        </div>

        {/* WhatsApp Mobile App Bottom Navigation */}
        <React.Suspense fallback={null}>
          <BottomNav />
        </React.Suspense>

        {/* Meta WhatsApp Cloud API Setup & Go-Live Guide Modal */}
        <MetaSetupGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </div>
    </NotificationProvider>
  );
}
