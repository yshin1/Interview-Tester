// Minimal service worker whose only job is receiving and displaying push
// notifications while the app/tab isn't actually open — no offline caching,
// no asset interception. Keeping it this small means it can't interfere with
// anything else on the site if something about it ever needs to change.

self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try{
    data = event.data ? event.data.json() : {};
  }catch(e){
    data = { title: 'New message', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'New message';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    // A fresh tag per push so a second message while the first
    // notification is still showing doesn't silently get swallowed instead
    // of appearing on its own — same reasoning as the in-page notification
    // tagging fix.
    tag: 'push-' + (data.bookingId || 'unknown') + '-' + Date.now(),
    data: { bookingId: data.bookingId || null }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for(const client of clientList){
        if('focus' in client) return client.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
