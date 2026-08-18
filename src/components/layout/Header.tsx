'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, AlertCircle, RefreshCw, Menu, BookOpen } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/Tooltip';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenMetaGuide?: () => void;
}

export function Header({ onToggleMobileMenu, onOpenMetaGuide }: HeaderProps) {
  const [settings, setSettings] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_CONNECTION' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ text: 'Meta Cloud API Connected', ok: true });
      } else {
        setStatusMsg({ text: data.message || 'Connection issue', ok: false });
      }
    } catch {
      setStatusMsg({ text: 'Unable to reach server', ok: false });
    } finally {
      setIsTesting(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile Menu Trigger & Business Identity */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Open Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-900 truncate">
            {settings?.businessName || 'My WhatsApp Business'}
          </span>
        </div>

        {settings?.businessPhone && (
          <>
            <div className="hidden sm:block h-3.5 w-px bg-slate-200" />
            <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">
              {settings.businessPhone}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Status notification */}
        {statusMsg && (
          <div
            className={`hidden md:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border font-medium ${
              statusMsg.ok
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {statusMsg.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Meta Setup Guide Button */}
        {onOpenMetaGuide && (
          <button
            onClick={onOpenMetaGuide}
            className="btn-secondary h-8 px-2.5 text-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Setup Guide</span>
          </button>
        )}

        {/* Test Connection Button */}
        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="btn-secondary h-8 px-2.5 text-xs hidden sm:inline-flex"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>{isTesting ? 'Testing...' : 'Test API'}</span>
        </button>

        {/* New Campaign Broadcast Button */}
        <Link href="/campaigns/new" className="btn-primary h-8 px-3 text-xs">
          <Send className="w-3.5 h-3.5" />
          <span>New Broadcast</span>
        </Link>
      </div>
    </header>
  );
}
