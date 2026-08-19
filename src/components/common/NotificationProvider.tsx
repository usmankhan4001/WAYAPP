'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface InboundAlert {
  id: string;
  senderName: string;
  phoneNumber: string;
  body: string;
  timestamp: string;
}

interface NotificationContextType {
  unreadCount: number;
  requestPermission: () => void;
  permissionStatus: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  requestPermission: () => {},
  permissionStatus: 'default',
});

export const useNotifications = () => useContext(NotificationContext);

/**
 * Plays a clean, high-clarity notification chime using Web Audio API
 */
function playWhatsAppChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First Tone (B5: 987.77 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second Tone (E6: 1318.51 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.35);
  } catch {}
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<InboundAlert | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const lastKnownMsgId = useRef<string | null>(null);

  // Register Service Worker for background push
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {})
        .catch(() => {});

      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
    }
  };

  // Poll for new inbound chat messages
  useEffect(() => {
    const checkIncoming = async () => {
      try {
        const res = await fetch('/api/chat');
        const data = await res.json();
        if (!Array.isArray(data)) return;

        let unread = 0;
        let newestInbound: any = null;

        for (const item of data) {
          // Handle both response shapes: conversation objects { contact, messages }
          // and the flat contacts fallback { chatMessages }
          const contact = item.contact || item;
          const lastMsg = item.messages?.[0] || contact.chatMessages?.[0];
          if (lastMsg && lastMsg.direction === 'INBOUND') {
            unread += item.unreadCount ?? 1;
            if (!newestInbound || new Date(lastMsg.timestamp) > new Date(newestInbound.timestamp)) {
              newestInbound = {
                id: lastMsg.id,
                senderName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Customer',
                phoneNumber: contact.phoneNumber,
                body: lastMsg.body,
                timestamp: lastMsg.timestamp,
              };
            }
          }
        }

        setUnreadCount(unread);

        // Detect if this is a newly arrived message
        if (newestInbound && lastKnownMsgId.current && newestInbound.id !== lastKnownMsgId.current) {
          // Play Chime
          playWhatsAppChime();

          // Show Toast
          setActiveToast(newestInbound);
          setTimeout(() => setActiveToast(null), 7000);

          // Trigger System Desktop/Mobile Background Notification if tab is hidden
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`WhatsApp from ${newestInbound.senderName}`, {
              body: newestInbound.body,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
            });
          }
        }

        if (newestInbound) {
          lastKnownMsgId.current = newestInbound.id;
        }
      } catch {}
    };

    checkIncoming();
    const interval = setInterval(checkIncoming, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, requestPermission, permissionStatus }}>
      {children}

      {/* Floating In-App Inbound Alert Toast */}
      {activeToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-full animate-bounce-in">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white truncate">{activeToast.senderName}</h4>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-slate-400 hover:text-white p-1 -mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono">{activeToast.phoneNumber}</p>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-snug">
                {activeToast.body}
              </p>

              <div className="mt-2 flex justify-end">
                <Link
                  href="/inbox"
                  onClick={() => setActiveToast(null)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  <span>Open Chat</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
