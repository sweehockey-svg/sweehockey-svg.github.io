/*
  Svensk eHockey – central player identity + clean player profile routes.

  Responsibilities:
  - Canonical display aliases that must be identical across views.
  - Player profile URLs use a stable readable gamertag slug, not ?pk=<player_key>.
  - Route matching ignores spaces, underscores, dashes and other separators.
  - Old/internal player links that still contain pk are cleaned before navigation.
  - Temporary ECL 27 page query state is removed when leaving a lagbygge.
  - No MutationObserver.
*/
(function () {
  "use strict";

  const CANONICAL_GAMERTAGS = Object.freeze({
    "isvamp": "Svampify",
    "svampify": "Svampify",
    "dobby the joker": "DobbyTheJoker_",
    "dobbythejoker": "DobbyTheJoker_",
    "dobbythejoker_": "DobbyTheJoker_"
  });

  function norm(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("sv-SE")
      .replace(/\s+/g, " ");
  }

  /*
    Player routes use one separator-insensitive key.

    Examples:
      Dobby the Joker  -> dobbythejoker
      DobbyTheJoker_   -> dobbythejoker
      l-Furyan-l       -> lfuryanl

    app_player_directory_cache currently has no duplicate values under this
    normalization, so the clean route can resolve a player without exposing pk.
  */
  function compactPlayerSlug(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[^a-z0-9]+/g, "");
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

  function stripTransientPageQuery(url) {
    const copy = new URL(url.href);
    if (String(copy.hash || "").startsWith("#/spelare/")) {
      copy.searchParams.delete("ecl27lag");
    }
    return copy;
  }

  function cleanCurrentPlayerProfileUrl() {
    if (!String(window.location.hash || "").startsWith("#/spelare/")) return;

    let cleanedHref = cleanPlayerProfileHref(window.location.href);
    const cleanedUrl = stripTransientPageQuery(new URL(cleanedHref));
    cleanedHref = `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`;

    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (cleanedHref !== current) {
      window.history.replaceState(window.history.state, "", cleanedHref);
    }
  }

  window.SEH_PLAYER_CANONICAL_ALIASES = CANONICAL_GAMERTAGS;
  window.SEH_canonicalGamertag = canonicalGamertag;
  window.SEH_cleanPlayerProfileHref = cleanPlayerProfileHref;

  /*
    The app's route resolver calls SEH_playerSlug dynamically. Override the
    global helper once here so URL generation and URL lookup use the exact same
    separator-insensitive normalization everywhere.
  */
  window.SEH_playerSlug = compactPlayerSlug;

  /*
    Keep the established synchronous helper API, but never expose player_key in
    the URL. playerKey remains a fallback only if there is no gamertag at all.
    fromTeam is preserved because it is useful navigation context.
  */
  window.SEH_playerProfileUrl = function (playerKey, gamertag, fromTeam = null) {
    const canonical = canonicalGamertag(gamertag);
    const slug = compactPlayerSlug(canonical);
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
    the deterministic renderer reads it, instead of adding roster-specific DOM
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
    this module loaded. Clean player-profile links at click time. When the link
    is opened from an ECL 27 lagbygge, first remove the temporary ecl27lag page
    query without reloading, then let the normal hash router open the profile.
  */
  document.addEventListener("click", function (event) {
    const link = event.target?.closest?.('a[href*="#/spelare/"]');
    if (!link) return;

    const raw = link.getAttribute("href") || "";
    const cleaned = cleanPlayerProfileHref(raw);
    if (cleaned !== raw) link.setAttribute("href", cleaned);

    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("ecl27lag")) return;

    const hashIndex = cleaned.indexOf("#/spelare/");
    if (hashIndex < 0) return;

    event.preventDefault();
    const targetHash = cleaned.slice(hashIndex);
    currentUrl.searchParams.delete("ecl27lag");
    currentUrl.hash = window.location.hash;
    window.history.replaceState(
      window.history.state,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
    window.location.hash = targetHash;
  }, true);

  window.addEventListener("hashchange", cleanCurrentPlayerProfileUrl);
  window.addEventListener("popstate", cleanCurrentPlayerProfileUrl);
  window.addEventListener("pageshow", cleanCurrentPlayerProfileUrl);
  cleanCurrentPlayerProfileUrl();
})();
