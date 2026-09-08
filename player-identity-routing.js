/*
  Svensk eHockey – central player identity + clean player profile routes.

  Responsibilities:
  - Canonical display aliases that must be identical across views.
  - Player profile URLs use the readable gamertag slug, not ?pk=<player_key>.
  - Old/internal player links that still contain pk are cleaned before navigation.
  - No MutationObserver.
*/
(function () {
  "use strict";

  const CANONICAL_GAMERTAGS = Object.freeze({
    "isvamp": "Svampify",
    "svampify": "Svampify"
  });

  function norm(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("sv-SE")
      .replace(/\s+/g, " ");
  }

  function fallbackPlayerSlug(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function canonicalGamertag(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return CANONICAL_GAMERTAGS[norm(raw)] || raw;
  }

  function cleanPlayerProfileHref(value) {
    const href = String(value || "");
    const marker = "#/spelare/";
    const markerIndex = href.indexOf(marker);
    if (markerIndex < 0) return href;

    const hashPart = href.slice(markerIndex);
    const queryIndex = hashPart.indexOf("?");
    if (queryIndex < 0) return href;

    const route = hashPart.slice(0, queryIndex);
    const params = new URLSearchParams(hashPart.slice(queryIndex + 1));
    if (!params.has("pk")) return href;

    params.delete("pk");
    const prefix = href.slice(0, markerIndex);
    const query = params.toString();
    return `${prefix}${route}${query ? `?${query}` : ""}`;
  }

  function cleanCurrentPlayerProfileUrl() {
    const current = window.location.href;
    const cleaned = cleanPlayerProfileHref(current);
    if (cleaned !== current) {
      window.history.replaceState(window.history.state, "", cleaned);
    }
  }

  window.SEH_PLAYER_CANONICAL_ALIASES = CANONICAL_GAMERTAGS;
  window.SEH_canonicalGamertag = canonicalGamertag;
  window.SEH_cleanPlayerProfileHref = cleanPlayerProfileHref;

  /*
    Keep the established synchronous helper API, but use the readable slug.
    playerKey remains a fallback only when no gamertag exists at all.
    fromTeam is preserved because it is useful navigation context.
  */
  window.SEH_playerProfileUrl = function (playerKey, gamertag, fromTeam = null) {
    const canonical = canonicalGamertag(gamertag);
    const slug = typeof window.SEH_playerSlug === "function"
      ? window.SEH_playerSlug(canonical)
      : fallbackPlayerSlug(canonical);
    const cleanPlayerKey = String(playerKey || "").trim();
    const routeValue = slug || cleanPlayerKey;

    if (!routeValue) return "#/spelare";

    const params = new URLSearchParams();
    if (fromTeam !== null && fromTeam !== undefined && String(fromTeam).trim()) {
      params.set("fromTeam", String(fromTeam).trim());
    }

    const query = params.toString();
    return `#/spelare/${encodeURIComponent(routeValue)}${query ? `?${query}` : ""}`;
  };

  /*
    ECL 27 already has one canonical alias table. Extend that same table before
    the deterministic renderer reads it, instead of adding roster-specific
    fixes in the renderer.
  */
  if (window.SEH_ECL27_DATA) {
    const data = window.SEH_ECL27_DATA;
    const aliases = Object.freeze({
      ...(data.aliases || {}),
      ...CANONICAL_GAMERTAGS
    });
    window.SEH_ECL27_DATA = Object.freeze({
      ...data,
      aliases
    });
  }

  /*
    Older rendered markup may still contain pk because it was produced before
    this module loaded. Clean only player-profile links at click time.
  */
  document.addEventListener("click", function (event) {
    const link = event.target?.closest?.('a[href*="#/spelare/"]');
    if (!link) return;

    const raw = link.getAttribute("href") || "";
    const cleaned = cleanPlayerProfileHref(raw);
    if (cleaned !== raw) link.setAttribute("href", cleaned);
  }, true);

  window.addEventListener("hashchange", cleanCurrentPlayerProfileUrl);
  window.addEventListener("popstate", cleanCurrentPlayerProfileUrl);
  window.addEventListener("pageshow", cleanCurrentPlayerProfileUrl);
  cleanCurrentPlayerProfileUrl();
})();
