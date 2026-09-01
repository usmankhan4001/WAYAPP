'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';

export function PWAInstallPrompt({ className }: { className?: string }) {
  const toast = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);
    setIsIos(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      toast.info(
        'Install WAYAPP',
        'Desktop Chrome/Edge: use the install icon in the address bar. Mobile: browser menu → "Add to Home screen".'
      );
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {className ? (
        <button onClick={handleInstallClick} className={className} title="Install WAYAPP as a standalone app">
          <Download className="size-3.5" />
          <span>Install app</span>
        </button>
      ) : (
        <Button variant="wa" size="sm" onClick={handleInstallClick} title="Install WAYAPP as a standalone app">
          <Download />
          <span>Install app</span>
        </Button>
      )}

      <Modal
        open={showIosGuide}
        onOpenChange={setShowIosGuide}
        size="sm"
        title={
          <span className="inline-flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            Install on iPhone / iPad
          </span>
        }
        description="To install WAYAPP on iOS and receive real-time notifications:"
        footer={
          <Button className="w-full" onClick={() => setShowIosGuide(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-2.5 rounded-lg bg-muted p-3.5 text-xs text-foreground">
          {[
            <>Tap the <strong>Share</strong> button <Share className="inline size-3.5 text-info" /> in Safari</>,
            <>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline size-3.5" /></>,
            <>Tap <strong>Add</strong> in the top-right corner</>,
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="flex items-center gap-1">{step}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
