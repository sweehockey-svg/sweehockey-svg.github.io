const ASSET_VERSION = "sw-image-rescue-20260627s";
const MANIFESTS = {
  players: { file: "players.json", folder: "players", items: null, promise: null },
  teamlogos: { file: "teamlogos.json", folder: "teamlogos", items: null, promise: null }
};

function stripExt(value) {
  return String(value || "").replace(/\.(?:png|jpe?g|webp)$/i, "");
}

function removeDiacritics(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slug(value) {
  return removeDiacritics(stripExt(value))
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

function teamShortNameFromUrl(url) {
  const file = decodeURIComponent(url.pathname.split("/").pop() || "Lag");
  const base = stripExt(file)
    .replace(/[_-]+/g, " ")
    .replace(/\s+(?:IF|IK|HC|Hockey|Esport|Esports)$/i, "")
    .trim();

  return (base.slice(0, 3).toUpperCase() || "LAG")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function svgPlaceholder(url, kind = "team") {
  const shortName = kind === "player" ? "" : teamShortNameFromUrl(url);
  const playerShape = `
    <circle cx="110" cy="84" r="31" fill="#020814"/>
    <path d="M58 174c8-42 27-62 52-62s44 20 52 62z" fill="#020814"/>
  `;
  const teamShape = `
    <path d="M110 36l54 21v38c0 40-23 69-54 90-31-21-54-50-54-90V57z" fill="#f3c85f" fill-opacity=".16"/>
    <text x="110" y="126" text-anchor="middle" fill="#f3c85f" font-family="Arial, sans-serif" font-size="34" font-weight="900">${shortName}</text>
  `;

  return new Response(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#14325a"/>
          <stop offset="68%" stop-color="#06111f"/>
        </linearGradient>
      </defs>
      <rect width="220" height="220" rx="28" fill="url(#bg)"/>
      <path d="M161 0h59v220h-92z" fill="#f3c85f"/>
      ${kind === "player" ? playerShape : teamShape}
    </svg>
  `, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Svensk-Ehockey-Fallback": ASSET_VERSION
    }
  });
}

function assetUrl(folder, file) {
  return "/" + folder + "/" + String(file || "")
    .split("/")
    .map(encodeURIComponent)
    .join("/") + "?v=" + ASSET_VERSION;
}

async function readManifest(type) {
  const config = MANIFESTS[type];
  if (config.items) return config.items;
  if (!config.promise) {
    config.promise = fetch("/" + config.file + "?v=" + ASSET_VERSION, { cache: "reload" })
      .then((response) => response.ok ? response.json() : [])
      .then((files) => {
        config.items = Array.isArray(files)
          ? files
              .filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file))
              .map((file) => ({ file, key: slug(file), url: assetUrl(config.folder, file) }))
              .filter((item) => item.key.length >= 3)
          : [];
        return config.items;
      })
      .catch(() => {
        config.items = [];
        return config.items;
      });
  }
  return config.promise;
}

function editDistanceUpTo(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > limit) return limit + 1;
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }
  return previous[b.length];
}

function scoreKey(query, key) {
  if (!query || !key) return Infinity;
  if (query === key) return 0;
  const minLen = Math.min(query.length, key.length);
  if (minLen >= 5 && (query.startsWith(key) || key.startsWith(query))) {
    return 1 + Math.abs(query.length - key.length) / 10;
  }
  const limit = minLen >= 9 ? 2 : 1;
  if (Math.abs(query.length - key.length) <= limit) {
    const distance = editDistanceUpTo(query, key, limit);
    if (distance <= limit) return 10 + distance;
  }
  return Infinity;
}

async function resolveAsset(url, type) {
  const query = slug(decodeURIComponent(url.pathname.split("/").pop() || ""));
  if (!query) return "";
  const manifest = await readManifest(type);
  let best = null;
  for (const item of manifest) {
    const score = scoreKey(query, item.key);
    if (Number.isFinite(score) && (!best || score < best.score)) best = { ...item, score };
  }
  return best && best.score < 12.5 ? best.url : "";
}

async function playerFallback(url) {
  const manifest = await readManifest("players");
  const defaultImage = manifest.find((item) => item.file.toLowerCase() === "1defaultbildid.jpg");
  if (defaultImage) {
    try {
      const response = await fetch(defaultImage.url, { cache: "reload" });
      if (response.ok) return response;
    } catch (error) {}
  }
  return svgPlaceholder(url, "player");
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isImageRequest = event.request.destination === "image"
    || /\.(?:png|jpe?g|webp)$/i.test(url.pathname);
  if (!isImageRequest) return;

  const isPlayer = /^\/players\//i.test(url.pathname);
  const isKnownStatic = /^\/(?:assets|nyhetsbilder|ECL)\//i.test(url.pathname)
    || /^\/(?:favicon|bgsommar|bg|svenakehocket|SECLOGGA)\./i.test(url.pathname);
  if (isKnownStatic) return;

  event.respondWith((async () => {
    const type = isPlayer ? "players" : "teamlogos";
    const resolved = await resolveAsset(url, type);
    if (resolved) {
      try {
        const response = await fetch(resolved, { cache: "reload" });
        if (response.ok) return response;
      } catch (error) {}
    }

    return isPlayer ? playerFallback(url) : svgPlaceholder(url, "team");
  })());
});
