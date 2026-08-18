// WAYAPP Service Worker: Network-First Caching & Real Web Push Notifications
const CACHE_NAME = 'wayapp-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/inbox',
  '/campaigns',
  '/contacts',
  '/manifest.json',
  '/icon.svg',
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

// Network-first fetch handler with offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET navigation & static requests (never cache API calls or mutating requests)
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background Push Notification Listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'WAYAPP WhatsApp Notification';
    const options = {
      body: data.body || 'New customer interaction received.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/inbox',
      },
      actions: [
        { action: 'open', title: 'Open Inbox' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const title = 'WAYAPP — New WhatsApp Notification';
    const options = {
      body: event.data.text() || 'A new event occurred on your gateway.',
      icon: '/icon.svg',
      data: { url: '/inbox' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification Click -> Focus or Navigate to URL
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
