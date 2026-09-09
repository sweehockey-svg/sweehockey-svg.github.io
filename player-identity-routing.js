/*
  Svensk eHockey – central player identity + clean player profile routes.

  Responsibilities:
  - Canonical display aliases that must be identical across views.
  - Player profile URLs use a stable readable gamertag slug, not ?pk=<player_key>.
  - Route matching ignores spaces, underscores, dashes and other separators.
  - Old/internal player links that still contain pk are cleaned before navigation.
  - Temporary ECL 27 page query state is removed when leaving a lagbygge.
  - Approved "Min profil" data is presented in the existing player profile UI.
  - No MutationObserver and no recurring polling.
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

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[char]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function ensureSelfProfileStyles() {
    if (document.querySelector("#sehPlayerSelfProfileUiStyles")) return;
    const style = document.createElement("style");
    style.id = "sehPlayerSelfProfileUiStyles";
    style.textContent = `
      .player-self-profile-public{display:none!important}
      .seh-player-socials{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
      .seh-player-socials a{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:5px 9px;border:1px solid rgba(214,177,95,.32);border-radius:999px;background:rgba(4,12,18,.72);color:#f3eee1!important;font-size:9px;font-weight:900;letter-spacing:.04em;text-decoration:none!important;transition:border-color .15s ease,background .15s ease,color .15s ease}
      .seh-player-socials a:hover,.seh-player-socials a:focus-visible{border-color:#f0d58b;background:rgba(214,177,95,.1);color:#f0d58b!important;outline:none}
      .seh-player-socials__mark{display:grid;place-items:center;min-width:15px;height:15px;color:#57e6dc;font-size:9px;font-weight:950}
      .seh-player-self-overview{margin:0 0 18px;padding:18px 20px;border:1px solid rgba(214,177,95,.26);border-left:3px solid #d6b15f;border-radius:12px;background:linear-gradient(135deg,rgba(7,17,26,.92),rgba(2,7,12,.82))}
      .seh-player-self-overview__head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:11px}
      .seh-player-self-overview__head>div{display:grid;gap:3px}
      .seh-player-self-overview__head span{color:#57e6dc;font-size:8px;font-weight:950;letter-spacing:.13em}
      .seh-player-self-overview__head strong{color:#f5f1e8;font-size:17px}
      .seh-player-self-overview__approved{padding:4px 7px;border:1px solid rgba(87,230,220,.23);border-radius:999px;color:#76d8d0!important;font-size:7px!important;font-style:normal;font-weight:900;letter-spacing:.08em;white-space:nowrap}
      .seh-player-self-overview__presentation{margin:0 0 14px;color:#cbd5dc;font-size:13px;line-height:1.65}
      .seh-player-self-overview__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .seh-player-self-overview__facts>div{padding:9px 10px;border:1px solid rgba(35,57,72,.8);border-radius:8px;background:rgba(1,8,13,.6)}
      .seh-player-self-overview__facts span{display:block;margin-bottom:3px;color:#6f8ca0;font-size:7px;font-weight:950;letter-spacing:.11em}
      .seh-player-self-overview__facts strong{display:block;color:#f2eee5;font-size:10px;line-height:1.35;word-break:break-word}
      @media(max-width:700px){.seh-player-self-overview{padding:15px}.seh-player-self-overview__head{align-items:flex-start}.seh-player-self-overview__facts{grid-template-columns:1fr}.seh-player-socials{gap:5px}.seh-player-socials a{padding:5px 8px}}
    `;
    document.head.appendChild(style);
  }

  function cleanupSelfProfileEnhancement() {
    document.querySelector("#sehPlayerSocialLinks")?.remove();
    document.querySelector("#sehPlayerSelfOverview")?.remove();
  }

  function enhanceApprovedSelfProfile() {
    if (!String(window.location.hash || "").startsWith("#/spelare/")) {
      cleanupSelfProfileEnhancement();
      return false;
    }

    const source = document.querySelector(".player-self-profile-public");
    const competitions = document.querySelector("#playerCompetitions");
    const bio = document.querySelector("#playerBio");
    if (!source || !competitions || !bio) return false;

    ensureSelfProfileStyles();
    cleanupSelfProfileEnhancement();

    const playerName = String(document.querySelector("#playerName")?.textContent || "").trim() || "spelaren";
    const sourcePresentation = Array.from(source.children).find((node) => node.tagName === "P");
    const presentation = String(sourcePresentation?.textContent || "").trim();

    const facts = [];
    source.querySelectorAll(".player-self-profile-public__facts > div").forEach((item) => {
      const label = String(item.querySelector("span")?.textContent || "").trim();
      const value = String(item.querySelector("strong")?.textContent || "").trim();
      if (label && value) facts.push({label,value});
    });

    const sourceLinks = Array.from(source.querySelectorAll(".player-self-profile-public__links a"))
      .map((link) => ({
        label:String(link.textContent || "").replace(/↗/g, "").trim(),
        href:String(link.getAttribute("href") || "").trim()
      }))
      .filter((link) => /^https?:\/\//i.test(link.href));

    if (sourceLinks.length) {
      const socials = document.createElement("div");
      socials.id = "sehPlayerSocialLinks";
      socials.className = "seh-player-socials";
      socials.setAttribute("aria-label", "Spelarens sociala länkar");
      socials.innerHTML = sourceLinks.map((link) => {
        const normalizedLabel = link.label.toLowerCase();
        const mark = normalizedLabel === "x" ? "𝕏" : normalizedLabel.startsWith("twitch") ? "TV" : normalizedLabel.startsWith("instagram") ? "IG" : "↗";
        return `<a href="${escapeAttribute(link.href)}" target="_blank" rel="noopener noreferrer"><span class="seh-player-socials__mark">${mark}</span>${escapeHtml(link.label)}</a>`;
      }).join("");
      competitions.insertAdjacentElement("afterend", socials);
    }

    if (presentation || facts.length) {
      const overview = document.createElement("section");
      overview.id = "sehPlayerSelfOverview";
      overview.className = "seh-player-self-overview";
      overview.setAttribute("aria-label", "Profiluppgifter från spelaren");

      const presentationMarkup = presentation
        ? `<p class="seh-player-self-overview__presentation">${escapeHtml(presentation)}</p>`
        : "";
      const factsMarkup = facts.length
        ? `<div class="seh-player-self-overview__facts">${facts.map((fact) => `<div><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`).join("")}</div>`
        : "";

      overview.innerHTML = `<div class="seh-player-self-overview__head"><div><span>FRÅN SPELAREN</span><strong>Om ${escapeHtml(playerName)}</strong></div><em class="seh-player-self-overview__approved">ADMIN GODKÄND</em></div>${presentationMarkup}${factsMarkup}`;
      bio.parentNode?.insertBefore(overview, bio);
    }

    source.hidden = true;
    return true;
  }

  let selfProfileEnhancementGeneration = 0;
  function scheduleSelfProfileEnhancement() {
    const generation = ++selfProfileEnhancementGeneration;
    cleanupSelfProfileEnhancement();
    if (!String(window.location.hash || "").startsWith("#/spelare/")) return;

    [0,80,180,350,650,1100,1800,2800].forEach((delay) => {
      window.setTimeout(() => {
        if (generation !== selfProfileEnhancementGeneration) return;
        if (enhanceApprovedSelfProfile()) selfProfileEnhancementGeneration++;
      }, delay);
    });
  }

  window.SEH_PLAYER_CANONICAL_ALIASES = CANONICAL_GAMERTAGS;
  window.SEH_canonicalGamertag = canonicalGamertag;
  window.SEH_cleanPlayerProfileHref = cleanPlayerProfileHref;
  window.SEH_playerSlug = compactPlayerSlug;

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

  function handlePlayerRouteChange() {
    cleanCurrentPlayerProfileUrl();
    scheduleSelfProfileEnhancement();
  }

  window.addEventListener("hashchange", handlePlayerRouteChange);
  window.addEventListener("popstate", handlePlayerRouteChange);
  window.addEventListener("pageshow", handlePlayerRouteChange);
  window.addEventListener("load", scheduleSelfProfileEnhancement);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSelfProfileEnhancement, {once:true});
  } else {
    scheduleSelfProfileEnhancement();
  }
  cleanCurrentPlayerProfileUrl();
})();
