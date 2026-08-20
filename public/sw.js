// WAYAPP Service Worker: Network-First Caching & Real Native Web Push Notifications
const CACHE_NAME = 'wayapp-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/inbox',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Safe Network-first fetch handler (strictly same-origin HTTP/HTTPS only)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Only handle standard HTTP/HTTPS GET requests from our OWN ORIGIN
  if (req.method !== 'GET' || !req.url.startsWith('http') || url.origin !== self.location.origin) {
    return;
  }

  // 2. Never intercept API calls, webhooks, or dynamic JSON endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) {
    return;
  }

  // 3. Network first with safe fallback
  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache).catch(() => {});
          }).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.headers.get('accept')?.includes('text/html')) {
          const fallbackHtml = await caches.match('/');
          if (fallbackHtml) return fallbackHtml;
        }
        return new Response('Network offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});

// Background Native Web Push Listener (Fires even when browser / app is completely CLOSED)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'New WhatsApp Message',
    body: 'You received a new WhatsApp customer message.',
    url: '/inbox',
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || `msg-${Date.now()}`,
    vibrate: [200, 100, 200],
    renotify: true,
    data: {
      url: payload.url || '/inbox',
    },
    actions: [
      { action: 'reply', title: 'Reply Now' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Notification Click Handler -> Focus existing window or open new window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
