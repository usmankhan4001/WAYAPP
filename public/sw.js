// WAYAPP Service Worker: Background Push Notifications & Caching
const CACHE_NAME = 'wayapp-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Push Notification Listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'New WhatsApp Message';
    const options = {
      body: data.body || 'You have received a new customer reply.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/inbox',
      },
      actions: [
        { action: 'open', title: 'Reply Now' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const title = 'WAYAPP — New WhatsApp Reply';
    const options = {
      body: event.data.text() || 'A customer responded on WhatsApp.',
      icon: '/favicon.svg',
      data: { url: '/inbox' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification Click Listener -> Open Inbox
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
