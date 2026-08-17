/* Svensk eHockey PWA service worker */
const CACHE_VERSION = "seh-pwa-v1-20260817";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/icons/seh-icon-192.png",
  "/assets/icons/seh-icon-512.png",
  "/assets/icons/seh-icon-maskable-512.png",
  "/assets/icons/seh-apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("seh-pwa-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SEC is a separate site/app area. Never cache or rewrite its requests here.
  if (url.pathname === "/SEC" || url.pathname.startsWith("/SEC/")) return;

  // Keep live/statistical JSON and API-like data network-only so data never becomes stale.
  if (url.pathname.endsWith(".json") && url.pathname !== "/manifest.webmanifest") return;

  // Network-first for page navigations; cached root shell is only an offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) ||
                 (await caches.match("/index.html")) ||
                 (await caches.match("/"));
        })
    );
    return;
  }

  // Versioned JS/CSS/images/fonts can be cached safely. New version URLs create fresh entries.
  const destination = request.destination;
  const cacheableAsset = ["script", "style", "image", "font"].includes(destination);
  if (!cacheableAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
