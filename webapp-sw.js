'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(String(data.title || 'Svensk eHockey'), {
    body: String(data.body || 'En ny uppdatering finns i webbappen.'),
    icon: '/assets/icons/seh-icon-192.png', tag: String(data.tag || 'seh-update'),
    data: { url: data.url || '/?webapp=1#/' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let url = new URL('/?webapp=1#/', self.location.origin);
    try { const target = new URL(event.notification.data?.url, self.location.origin); if (target.origin === self.location.origin) url = target; } catch (_) {}
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      const navigated = await client.navigate(url.href);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});
// Network-only: account pages and live statistics are never stored offline.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ingen anslutning – Svensk eHockey</title><body style="background:#02030a;color:#f6f6ed;font:18px/1.6 system-ui;padding:32px"><h1>Ingen anslutning</h1><p>Svensk eHockey behöver internet för att visa aktuell information.</p><a href="/?webapp=1" style="color:#f4ca51">Försök igen</a></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )));
});
