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
    // Same tag per booking (no timestamp) so a second message while the
    // first notification is still showing UPDATES it in place instead of
    // stacking a separate one — renotify:true keeps the alert firing on
    // every update even though the tag matches. Android Chrome has been
    // seen to silently skip the vibration on a renotify update unless a
    // pattern is given explicitly (rather than relying on the device's
    // default), so it's spelled out here instead of left implicit.
    tag: 'chat-' + (data.bookingId || 'unknown'),
    renotify: true,
    vibrate: [200, 100, 200],
    // Reflects the applicant/tutor's own mute preference (see
    // toggleChatNotificationSilent() in the main HTML file) rather than a
    // fixed value — silent:true suppresses sound/vibration regardless of
    // the vibrate pattern above, per spec.
    silent: !!data.silent,
    data: { bookingId: data.bookingId || null, forAdmin: !!data.forAdmin }
  };
  // App icon badge (the little number on the home-screen icon) — only
  // does anything on platforms that support the Badging API from a
  // service worker (iOS/iPadOS 16.4+ when installed to Home Screen).
  // Android Chrome has no such API; Android instead auto-badges based on
  // how many notifications are currently showing, which is why grouping
  // to one notification above and badging here can show different counts
  // there — nothing to fix, just how the two platforms work.
  const badgePromise = (typeof data.badgeCount === 'number' && self.navigator && 'setAppBadge' in self.navigator)
    ? self.navigator.setAppBadge(data.badgeCount).catch(() => {})
    : Promise.resolve();
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    badgePromise
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
  const forAdmin = !!(event.notification.data && event.notification.data.forAdmin);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for(const client of clientList){
        if('focus' in client) return client.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow(forAdmin ? './?admin' : './');
    })
  );
});
