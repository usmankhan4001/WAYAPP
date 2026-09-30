'use client';

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 15_000;
const MAX_BACKOFF_MS = 60_000;

/**
 * Keeps an inbox view fresh. New-message pushes arrive over the existing SSE route
 * (/api/chat/stream); a 15-second poll is the fallback for when the stream is blocked or down.
 * After a failed refresh the poll delay doubles (capped at 60s) so a struggling server is not
 * hammered. Nothing runs while the tab is hidden, and one refresh happens as soon as it is shown.
 *
 * `refresh` must reject (throw) when it fails so the hook can back off and report `offline`.
 */
export function useLiveRefresh(refresh: () => Promise<void>, opts: { contactId?: string | null } = {}) {
  const [offline, setOffline] = useState(false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const contactId = opts.contactId || null;

  useEffect(() => {
    let cancelled = false;
    let failures = 0;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let esRetry: ReturnType<typeof setTimeout> | null = null;
    let esFailures = 0;

    const run = async () => {
      if (cancelled || running || document.hidden) return;
      running = true;
      try {
        await refreshRef.current();
        failures = 0;
        if (!cancelled) setOffline(!navigator.onLine);
      } catch {
        failures += 1;
        if (!cancelled) setOffline(true);
      } finally {
        running = false;
      }
    };

    const schedule = () => {
      if (cancelled) return;
      const delay = Math.min(POLL_MS * Math.pow(2, failures), MAX_BACKOFF_MS);
      timer = setTimeout(async () => {
        await run();
        schedule();
      }, delay);
    };

    const openStream = () => {
      if (cancelled || typeof EventSource === 'undefined' || document.hidden) return;
      es = new EventSource(`/api/chat/stream${contactId ? `?contactId=${encodeURIComponent(contactId)}` : ''}`);
      es.onmessage = (ev) => {
        esFailures = 0;
        try {
          if (JSON.parse(ev.data)?.type === 'new_messages') void run();
        } catch {
          /* ignore malformed frames */
        }
      };
      es.onerror = () => {
        // Close and reopen ourselves so the retry delay follows the same capped backoff.
        es?.close();
        es = null;
        esFailures += 1;
        const delay = Math.min(POLL_MS * Math.pow(2, esFailures - 1), MAX_BACKOFF_MS);
        esRetry = setTimeout(openStream, delay);
      };
    };

    const closeStream = () => {
      es?.close();
      es = null;
      if (esRetry) clearTimeout(esRetry);
      esRetry = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        closeStream();
      } else {
        void run();
        if (!es) openStream();
      }
    };
    const onOnline = () => void run();
    const onOffline = () => setOffline(true);

    void run();
    schedule();
    openStream();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      closeStream();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [contactId]);

  return { offline };
}

export function ReconnectingBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      className="absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm"
    >
      Reconnecting...
    </div>
  );
}
