'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Network-only: account pages and live statistics are never stored offline.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ingen anslutning – Svensk eHockey</title><body style="background:#02030a;color:#f6f6ed;font:18px/1.6 system-ui;padding:32px"><h1>Ingen anslutning</h1><p>Svensk eHockey behöver internet för att visa aktuell information.</p><a href="/?webapp=1" style="color:#f4ca51">Försök igen</a></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )));
});
