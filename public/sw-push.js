// Custom service worker additions — imported by vite-plugin-pwa
// Handles incoming push events and notification clicks

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'IK Finance', body: event.data.text(), url: '/' };
  }

  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon-192x192.png',
    badge: payload.badge ?? '/icon-96x96.png',
    data: { url: payload.url ?? '/' },
    vibrate: [100, 50, 100],
    tag: `ik-finance-notification-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'IK Finance', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          await client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
