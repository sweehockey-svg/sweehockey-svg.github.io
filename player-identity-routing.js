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

  let approvedProfilesPromise = null;
  let selfProfileEnhancementGeneration = 0;

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

  function getSupabaseConfig() {
    return {
      url: String(window.EHOCKEY_CONFIG?.supabaseUrl || "").replace(/\/+$/, ""),
      key: String(window.EHOCKEY_CONFIG?.supabasePublishableKey || "").trim()
    };
  }

  async function loadApprovedProfiles() {
    if (approvedProfilesPromise) return approvedProfilesPromise;

    approvedProfilesPromise = (async () => {
      const config = getSupabaseConfig();
      if (!config.url || !config.key) return new Map();

      const query = new URLSearchParams({
        select: "player_key,display_gamertag,image_url,presentation,positions_text,contact,twitch_url,x_url,instagram_url,availability_status,team_status",
        limit: "5000"
      });
      const response = await fetch(
        `${config.url}/rest/v1/v_ehockey_player_self_profiles_public?${query.toString()}`,
        {
          cache: "no-store",
          headers: {
            apikey: config.key,
            Accept: "application/json"
          }
        }
      );
      if (!response.ok) throw new Error(`Supabase svarade ${response.status}`);

      const rows = await response.json();
      const map = new Map();
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const key = compactPlayerSlug(row?.display_gamertag);
        if (key && !map.has(key)) map.set(key, row);
      });
      return map;
    })().catch((error) => {
      console.warn("Svensk eHockey: kunde inte hämta godkända Min profil-uppgifter", error);
      return new Map();
    });

    return approvedProfilesPromise;
  }

  function discordContact(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^discord\s*:\s*(.+)$/i);
    return match ? match[1].trim() : "";
  }

  function ensureSelfProfileStyles() {
    if (document.querySelector("#sehPlayerSelfProfileUiStyles")) return;
    const style = document.createElement("style");
    style.id = "sehPlayerSelfProfileUiStyles";
    style.textContent = `
      .player-self-profile-public{display:none!important}
      .seh-player-socials{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:9px}
      .seh-player-socials a,.seh-player-socials span{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:5px 9px;border:1px solid rgba(214,177,95,.32);border-radius:999px;background:rgba(4,12,18,.72);color:#f3eee1!important;font-size:9px;font-weight:900;letter-spacing:.04em;text-decoration:none!important}
      .seh-player-socials a:hover,.seh-player-socials a:focus-visible{border-color:#f0d58b;background:rgba(214,177,95,.1);color:#f0d58b!important;outline:none}
      .seh-player-socials__x{min-width:30px!important;justify-content:center;padding-inline:8px!important;font-size:13px!important;color:#57e6dc!important}
      .seh-player-socials__mark{display:grid;place-items:center;min-width:15px;height:15px;color:#57e6dc;font-size:9px;font-weight:950}
      .seh-player-socials__discord{border-color:rgba(87,230,220,.28)!important;color:#d8f7f4!important}
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
      @media(max-width:700px){.seh-player-self-overview{padding:15px}.seh-player-self-overview__head{align-items:flex-start}.seh-player-self-overview__facts{grid-template-columns:1fr}.seh-player-socials{gap:5px}.seh-player-socials a,.seh-player-socials span{padding:5px 8px}}
    `;
    document.head.appendChild(style);
  }

  function cleanupSelfProfileEnhancement() {
    document.querySelector("#sehPlayerSocialLinks")?.remove();
    document.querySelector("#sehPlayerSelfOverview")?.remove();
  }

  function profileFacts(row) {
    const discord = discordContact(row?.contact);
    return [
      ["POSITIONER", row?.positions_text],
      ["STATUS", row?.availability_status],
      ["LAGSTATUS", row?.team_status],
      ["KONTAKT", discord ? "" : row?.contact]
    ].map(([label, value]) => ({ label, value: String(value || "").trim() }))
      .filter((item) => item.value);
  }

  function socialMarkup(row) {
    const items = [];
    const xUrl = String(row?.x_url || "").trim();
    const twitchUrl = String(row?.twitch_url || "").trim();
    const instagramUrl = String(row?.instagram_url || "").trim();
    const discord = discordContact(row?.contact);

    if (/^https?:\/\//i.test(xUrl)) {
      items.push(`<a class="seh-player-socials__x" href="${escapeAttribute(xUrl)}" target="_blank" rel="noopener noreferrer" aria-label="X" title="X">𝕏</a>`);
    }
    if (/^https?:\/\//i.test(twitchUrl)) {
      items.push(`<a href="${escapeAttribute(twitchUrl)}" target="_blank" rel="noopener noreferrer"><span class="seh-player-socials__mark">TV</span>Twitch</a>`);
    }
    if (/^https?:\/\//i.test(instagramUrl)) {
      items.push(`<a href="${escapeAttribute(instagramUrl)}" target="_blank" rel="noopener noreferrer"><span class="seh-player-socials__mark">IG</span>Instagram</a>`);
    }
    if (discord) {
      items.push(`<span class="seh-player-socials__discord"><span class="seh-player-socials__mark">D</span>Discord: ${escapeHtml(discord)}</span>`);
    }
    return items.join("");
  }

  async function enhanceApprovedSelfProfile() {
    if (!String(window.location.hash || "").startsWith("#/spelare/")) {
      cleanupSelfProfileEnhancement();
      return false;
    }

    const competitions = document.querySelector("#playerCompetitions");
    const bio = document.querySelector("#playerBio");
    const playerName = String(document.querySelector("#playerName")?.textContent || "").trim();
    if (!competitions || !bio || !playerName) return false;

    const profiles = await loadApprovedProfiles();
    const row = profiles.get(compactPlayerSlug(playerName));
    if (!row) {
      cleanupSelfProfileEnhancement();
      return false;
    }

    ensureSelfProfileStyles();
    cleanupSelfProfileEnhancement();

    const approvedImage = String(row.image_url || "").trim();
    const avatar = document.querySelector("#playerAvatar");
    if (/^https?:\/\//i.test(approvedImage) && avatar && avatar.src !== approvedImage) {
      avatar.src = approvedImage;
    }

    const socialsMarkup = socialMarkup(row);
    if (socialsMarkup) {
      const socials = document.createElement("div");
      socials.id = "sehPlayerSocialLinks";
      socials.className = "seh-player-socials";
      socials.setAttribute("aria-label", "Spelarens sociala länkar och kontakt");
      socials.innerHTML = socialsMarkup;
      competitions.insertAdjacentElement("afterend", socials);
    }

    const presentation = String(row.presentation || "").trim();
    const facts = profileFacts(row);
    if (presentation || facts.length) {
      const overview = document.createElement("section");
      overview.id = "sehPlayerSelfOverview";
      overview.className = "seh-player-self-overview";
      overview.setAttribute("aria-label", "Profiluppgifter från spelaren");
      overview.innerHTML = `
        <div class="seh-player-self-overview__head">
          <div><span>FRÅN SPELAREN</span><strong>Om ${escapeHtml(playerName)}</strong></div>
          <em class="seh-player-self-overview__approved">ADMIN GODKÄND</em>
        </div>
        ${presentation ? `<p class="seh-player-self-overview__presentation">${escapeHtml(presentation)}</p>` : ""}
        ${facts.length ? `<div class="seh-player-self-overview__facts">${facts.map((fact) => `<div><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`).join("")}</div>` : ""}
      `;
      bio.parentNode?.insertBefore(overview, bio);
    }

    document.querySelector(".player-self-profile-public")?.setAttribute("hidden", "");
    return true;
  }

  function scheduleSelfProfileEnhancement() {
    const generation = ++selfProfileEnhancementGeneration;
    cleanupSelfProfileEnhancement();
    if (!String(window.location.hash || "").startsWith("#/spelare/")) return;

    [0,100,250,500,900,1500,2500,4000,6500,9500].forEach((delay) => {
      window.setTimeout(() => {
        if (generation !== selfProfileEnhancementGeneration) return;
        void enhanceApprovedSelfProfile().then((done) => {
          if (done && generation === selfProfileEnhancementGeneration) {
            selfProfileEnhancementGeneration++;
          }
        });
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
