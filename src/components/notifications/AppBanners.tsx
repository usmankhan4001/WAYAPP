'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, Download, PauseCircle, WifiOff, Unplug } from 'lucide-react';

import { useSettings } from '@/components/providers/SessionProvider';
import { useNotifications } from '@/components/common/NotificationProvider';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const MAX_BANNERS = 2;
const INSTALL_KEY = 'wayapp:install-banner-dismissed';
const PUSH_KEY = 'wayapp:push-card-dismissed';

function getFlag(storage: 'local' | 'session', key: string): boolean {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key) === '1';
  } catch {
    return false;
  }
}
function setFlag(storage: 'local' | 'session', key: string) {
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, '1');
  } catch {
    // ignore: the banner just comes back next visit
  }
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

function useInstall() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setDismissed(getFlag('local', INSTALL_KEY));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const dismiss = () => {
    setFlag('local', INSTALL_KEY);
    setDismissed(true);
  };
  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setEvent(null);
  };
  return { canInstall: !installed && !dismissed && Boolean(event), install, dismiss };
}

/** Full-width strips under the header. At most two at a time, most important first. */
export function AppBanners() {
  const { settings } = useSettings();
  const online = useOnline();
  const { canInstall, install, dismiss: dismissInstall } = useInstall();

  const banners: React.ReactNode[] = [];

  if (!online) {
    banners.push(
      <Alert key="offline" layout="banner" tone="warning" icon={WifiOff} title="You are offline">
        Messages will not send or arrive until you are back online.
      </Alert>
    );
  }
  if (settings && !settings.isConnected && !settings.isMockMode) {
    banners.push(
      <Alert
        key="connection"
        layout="banner"
        tone="danger"
        icon={Unplug}
        title="WhatsApp is not connected"
        action={
          <Button size="sm" variant="outline" render={<Link href="/settings" />}>
            Open Settings
          </Button>
        }
      >
        Connect your number to send and receive messages.
      </Alert>
    );
  }
  if (canInstall) {
    banners.push(
      <Alert
        key="install"
        layout="banner"
        tone="info"
        icon={Download}
        title="Install WayApp on this device"
        onDismiss={dismissInstall}
        action={
          <Button size="sm" onClick={install}>
            Install
          </Button>
        }
      >
        Open it from your home screen like any other app.
      </Alert>
    );
  }

  if (!banners.length) return null;
  return <div className="shrink-0">{banners.slice(0, MAX_BANNERS)}</div>;
}

/** Calm card that asks once for push permission. Not a modal; "Not now" hides it for good on this browser. */
export function PushPermissionCard({
  onTurnOn,
  onNotNow,
  className,
}: {
  onTurnOn: () => void;
  onNotNow: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand-subtle-foreground">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Get alerts for new messages</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            We will tell you when a customer writes, even when WayApp is closed.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={onTurnOn}>
              Turn on
            </Button>
            <Button size="sm" variant="ghost" onClick={onNotNow}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wires the card to the notification provider. Shows only while permission is still undecided. */
export function PushPermissionPrompt() {
  const { permissionStatus, requestPermission } = useNotifications();
  const [hidden, setHidden] = useState(true);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported('Notification' in window);
    setHidden(getFlag('local', PUSH_KEY));
  }, []);
  if (!supported || hidden || permissionStatus !== 'default') return null;
  return (
    <PushPermissionCard
      className="mx-auto w-full max-w-7xl shrink-0 px-3.5 pt-3 sm:px-5 md:px-6"
      onTurnOn={() => {
        void requestPermission();
      }}
      onNotNow={() => {
        setFlag('local', PUSH_KEY);
        setHidden(true);
      }}
    />
  );
}
