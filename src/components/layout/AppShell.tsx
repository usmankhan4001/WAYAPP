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
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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

  // Full Active Workspace
  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <Header
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            onOpenMetaGuide={() => setIsGuideOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* WhatsApp Mobile App Bottom Navigation */}
        <BottomNav />

        {/* Meta WhatsApp Cloud API Setup & Go-Live Guide Modal */}
        <MetaSetupGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </div>
    </NotificationProvider>
  );
}
