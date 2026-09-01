'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { MessageSquare, X, ArrowRight, Bell, Volume2, VolumeX, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { playIncomingChime, setMuteState, getMuteState } from '@/lib/notifications/sound';

interface InboundAlert {
  id: string;
  contactId?: string;
  senderName: string;
  phoneNumber: string;
  body: string;
  timestamp: string;
}

interface NotificationContextType {
  unreadCount: number;
  requestPermission: () => Promise<NotificationPermission>;
  permissionStatus: NotificationPermission;
  isMuted: boolean;
  toggleMute: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  requestPermission: async () => 'default',
  permissionStatus: 'default',
  isMuted: false,
  toggleMute: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerPushSubscription() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const res = await fetch('/api/push/vapid-key');
      const data = await res.json();
      if (!data.publicKey) return;

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    }
  } catch (err) {
    console.warn('[Push] Background push subscription registration:', err);
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<InboundAlert | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isMuted, setIsMuted] = useState(false);
  const lastKnownMsgId = useRef<string | null>(null);

  // Initialize service worker and notification & mute state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMuted(getMuteState());

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }

      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
        if (Notification.permission === 'granted') {
          registerPushSubscription();
        }
      }
    }
  }, []);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setMuteState(nextState);
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermissionStatus(res);
        if (res === 'granted') {
          await registerPushSubscription();
        }
        return res;
      } catch {
        return 'denied';
      }
    }
    return 'denied';
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
          const contact = item.contact || item;
          const lastMsg = item.messages?.[0] || contact.chatMessages?.[0];
          if (lastMsg && lastMsg.direction === 'INBOUND') {
            unread += item.unreadCount ?? 1;
            if (!newestInbound || new Date(lastMsg.timestamp) > new Date(newestInbound.timestamp)) {
              newestInbound = {
                id: lastMsg.id,
                contactId: contact.id,
                senderName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Customer',
                phoneNumber: contact.phoneNumber,
                body: lastMsg.body || 'Media Attachment',
                timestamp: lastMsg.timestamp,
              };
            }
          }
        }

        setUnreadCount(unread);

        // Detect if this is a newly arrived message
        if (newestInbound && lastKnownMsgId.current && newestInbound.id !== lastKnownMsgId.current) {
          // Play WhatsApp audio chime
          if (!isMuted) {
            playIncomingChime();
          }

          // Vibrate device if supported on mobile
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([200, 100, 200]);
            } catch {}
          }

          // Show browser OS notification if tab is backgrounded
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification(`WhatsApp from ${newestInbound.senderName}`, {
                  body: newestInbound.body,
                  icon: '/icon-192.png',
                  badge: '/icon-192.png',
                  tag: `inbound-${newestInbound.id}`,
                  data: { url: `/inbox?contactId=${newestInbound.contactId || ''}` },
                });
              } else {
                new Notification(`WhatsApp from ${newestInbound.senderName}`, {
                  body: newestInbound.body,
                  icon: '/icon-192.png',
                });
              }
            } catch {}
          }

          // Show prominent in-app floating banner
          setActiveToast(newestInbound);
          setTimeout(() => setActiveToast(null), 9000);
        }

        if (newestInbound) {
          lastKnownMsgId.current = newestInbound.id;
        }
      } catch {}
    };

    checkIncoming();
    const interval = setInterval(checkIncoming, 3000);
    return () => clearInterval(interval);
  }, [isMuted]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        requestPermission,
        permissionStatus,
        isMuted,
        toggleMute,
      }}
    >
      {children}

      {/* Prominent Native WhatsApp Notification Banner (Top of Mobile / Bottom Right of Desktop) */}
      {activeToast && (
        <div className="fixed top-3 left-3 right-3 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm z-50 animate-in slide-in-from-top-3 sm:slide-in-from-bottom-4 duration-300">
          <div className="bg-card text-foreground rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-border flex items-start gap-3 ring-1 ring-primary/30">
            {/* WhatsApp Emerald Icon */}
            <div className="w-10 h-10 rounded-full bg-wa flex items-center justify-center shrink-0  text-white font-normal text-sm ring-2 ring-primary/20">
              {activeToast.senderName.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-normal text-foreground truncate">{activeToast.senderName}</h4>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-muted-foreground hover:text-foreground p-1 -mr-1 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-2xs text-[#1c1e21] font-mono font-medium">{activeToast.phoneNumber}</p>
              <p className="text-xs text-foreground mt-1 line-clamp-2 leading-relaxed font-sans">
                {activeToast.body}
              </p>

              <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-border">
                <span className="text-2xs text-muted-foreground">WhatsApp Live Alert</span>
                <Link
                  href={`/inbox?contactId=${activeToast.contactId || ''}`}
                  onClick={() => setActiveToast(null)}
                  className="inline-flex items-center gap-1 text-xs font-normal text-[#1c1e21] hover:text-brand-subtle-foreground bg-black/5 hover:bg-[#e6ffda] px-3 py-1 rounded-full border border-transparent transition-all"
                >
                  <span>Reply Now</span>
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
