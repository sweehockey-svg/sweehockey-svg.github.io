const PLACEHOLDER_VERSION = "logo-cache-bust-20260627";

function teamShortNameFromUrl(url) {
  const file = decodeURIComponent(url.pathname.split("/").pop() || "Lag");
  const base = file
    .replace(/\.(?:png|jpe?g|webp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+(?:IF|IK|HC|Hockey|Esport|Esports)$/i, "")
    .trim();

  return (base.slice(0, 3).toUpperCase() || "LAG")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function logoPlaceholder(url) {
  const shortName = teamShortNameFromUrl(url);
  return new Response(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#16243a"/>
          <stop offset="100%" stop-color="#0b1421"/>
        </linearGradient>
      </defs>
      <rect width="220" height="220" rx="28" fill="url(#bg)"/>
      <path d="M110 36l54 21v38c0 40-23 69-54 90-31-21-54-50-54-90V57z" fill="#f3c85f" fill-opacity=".16"/>
      <text x="110" y="126" text-anchor="middle" fill="#f3c85f" font-family="Arial, sans-serif" font-size="34" font-weight="900">${shortName}</text>
    </svg>
  `, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Svensk-Ehockey-Fallback": PLACEHOLDER_VERSION
    }
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isLogo = url.origin === self.location.origin
    && /^\/teamlogos\/.+\.(?:png|jpe?g|webp)$/i.test(url.pathname);

  if (!isLogo) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) return response;
      return logoPlaceholder(url);
    }).catch(() => logoPlaceholder(url))
  );
});
