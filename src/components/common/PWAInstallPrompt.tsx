'use client';

import React, { useState, useEffect } from 'react';
import { Download, Check, Smartphone, Share, PlusSquare, X } from 'lucide-react';

export function PWAInstallPrompt({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);

      // Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIosDevice);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for browsers that don't emit beforeinstallprompt (e.g. desktop safari/firefox)
      alert(
        'To install WAYAPP:\n• On Desktop Chrome/Edge: Click the install icon in the address bar (top right)\n• On Mobile: Tap browser menu (⋮) -> "Add to Home screen"'
      );
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={
          className ||
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all'
        }
        title="Install WAYAPP as Standalone App on Desktop or Mobile"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To install WAYAPP on iOS and receive real-time notifications:
            </p>

            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1">
                  Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 text-blue-600 inline" /> in Safari
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1">
                  Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" />
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
