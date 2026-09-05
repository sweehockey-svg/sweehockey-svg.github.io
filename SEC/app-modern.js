(function () {
  const app = document.querySelector("#app");
  const LOCAL_ASSET_VERSION = "site-20260727-sommar26a";
  const GOALIE_ELIGIBILITY_RATE = 0.4;
  const state = {
    cups: [],
    teams: [],
    players: [],
    goalies: [],
    summer26Signups: [],
    summer26UpdatedAt: "",
    summerSignupQuery: "",
    summerSignupDivision: "all",
    summerSignupRole: "all",
    summerSignupCaptain: "all",
    teamLogoIndex: new Map(),
    playerImageIndex: new Map(),
    view: "cups",
    query: "",
    activeCupId: "",
    activeCupSection: "",
    activeCupTeamFilter: "",
    activeCupMatchStatus: "all",
    activeCupTableMode: "group",
    activeCupStatsMode: "all",
    activeCupGoalieEligibleOnly: false,
    activeCupStatsPlayersAll: false,
    activeCupStatsGoaliesAll: false,
    activeTeamStatsMode: "all",
    activeTeamHistoryMode: "all",
    activeTeam: "",
    activePlayer: "",
    activeGoalie: "",
    activeMatchCupId: "",
    activeMatchId: "",
    activeCupTeamName: "",
    activeTeamTab: "roster",
    adminUpdateVisible: false,
    adminUpdateKey: "",
    adminUpdateStatus: ""
  };

  const routes = new Set(["cups", "teams", "players", "goalies", "matches", "match", "about", "sommar26"]);
  function localAssetUrl(path) {
    const rawPath = String(path || "");
    if (!rawPath.startsWith("./assets/")) return path;
    const fileName = rawPath.replace(/^\.\/assets\//, "");
    const externalBase = String(window.SEC_CONFIG?.siteAssetBaseUrl || "").replace(/\/+$/, "");
    const useExternal = Boolean(externalBase);
    const assetPath = useExternal ? externalBase + "/" + encodeURIComponent(fileName) : rawPath;
    const separator = assetPath.includes("?") ? "&" : "?";
    return assetPath + separator + "v=" + encodeURIComponent(LOCAL_ASSET_VERSION);
  }

  window.SEC_LOGO_FALLBACK = function (image) {
    const parent = image.closest(".teamLogo");
    let fallbacks = [];
    try {
      fallbacks = JSON.parse(image.dataset.fallbackSrcs || "[]");
    } catch (_error) {
      fallbacks = [];
    }
    if (fallbacks.length) {
      image.dataset.fallbackSrcs = JSON.stringify(fallbacks.slice(1));
      image.src = fallbacks[0];
      return;
    }
    if (parent) parent.classList.add("missing");
    image.remove();
  };

  window.SEC_PLAYER_IMAGE_FALLBACK = function (image) {
    const parent = image.closest(".playerPortrait");
    let fallbacks = [];
    try {
      fallbacks = JSON.parse(image.dataset.fallbackSrcs || "[]");
    } catch (_error) {
      fallbacks = [];
    }
    if (fallbacks.length) {
      image.dataset.fallbackSrcs = JSON.stringify(fallbacks.slice(1));
      image.src = fallbacks[0];
      return;
    }
    if (parent) parent.classList.add("missing");
    image.remove();
  };

  init();

  async function init() {
    try {
      const rawCups = await loadAllCupSources();
      state.cups = normalizeCups(rawCups);
      state.teams = buildTeams(state.cups);
      state.players = buildPlayers(state.cups);
      state.goalies = buildGoalies(state.cups);
      const summer26Data = await loadSummer26Signups();
      state.summer26Signups = summer26Data.players;
      state.summer26UpdatedAt = summer26Data.updatedAt;
      readRoute();
      render();
      loadTeamLogoIndex().then(function (index) {
        if (index.size) {
          state.teamLogoIndex = index;
          render();
        }
      });
      loadPlayerImageIndex().then(function (index) {
        if (index.size) {
          state.playerImageIndex = index;
          render();
        }
      });
      window.addEventListener("hashchange", function () {
        readRoute();
        render();
      });
    } catch (error) {
      app.innerHTML = `
        <main class="fail">
          <h1>Kunde inte ladda SEC</h1>
          <p>${escapeHtml(error.message || String(error))}</p>
        </main>
      `;
    }
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Datakallan svarade inte: " + response.status);
    }
    return response.json();
  }

  async function loadAllCupSources() {
    if (String(window.SEC_CONFIG?.dataSource || "").toLowerCase() === "supabase") {
      try {
        return mergeRawCups(await loadCupSourcesFromSupabase());
      } catch (error) {
        if (window.SEC_CONFIG?.allowStaticDataFallback === false) throw error;
        console.warn("SEC: Supabase-data kunde inte laddas. Använder statisk reservdata.", error);
      }
    }

    const configuredUrls = window.SEC_CONFIG?.dataUrls;
    const urls = Array.isArray(configuredUrls) && configuredUrls.length
      ? configuredUrls
      : [
        window.SEC_CONFIG?.sheetUrl || "./database-cups-1-13.json",
        window.SEC_CONFIG?.archiveUrl || "./database-cups-14-20.json",
        window.SEC_CONFIG?.databaseUrl || "./database-cups.json"
      ].filter(Boolean);
    const payloads = await Promise.all(urls.map(function (url) {
      return loadJson(url).catch(function () { return { cups: [] }; });
    }));
    return mergeRawCups(payloads.flatMap(function (payload) {
      return payload.cups || payload.data || [];
    }));
  }

  async function loadCupSourcesFromSupabase() {
    const supabaseUrl = text(window.SEC_CONFIG?.supabaseUrl || "").replace(/\/+$/, "");
    const publishableKey = text(window.SEC_CONFIG?.supabasePublishableKey || "");
    const table = text(window.SEC_CONFIG?.supabaseCupTable || "sec_site_cup_sources");

    if (!/^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl) || !publishableKey) {
      throw new Error("Supabase-inställningarna för SEC saknas.");
    }

    const query = new URLSearchParams({
      select: "payload",
      is_active: "eq.true",
      order: "sort_order.asc,source_key.asc,cup_key.asc"
    });
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?${query.toString()}`,
      {
        cache: "no-store",
        headers: {
          apikey: publishableKey,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Supabase svarade ${response.status}: ${message || response.statusText}`);
    }

    const rows = await response.json();
    const cups = Array.isArray(rows)
      ? rows.map(function (row) { return row?.payload; }).filter(Boolean)
      : [];

    if (!cups.length) {
      throw new Error("Supabase innehåller ännu inga publicerade SEC-cuper.");
    }

    return cups;
  }

  async function loadSummer26Signups() {
    const url = window.SEC_CONFIG?.summer26SignupsUrl || "./sec-sommar-26-anmalda.json";
    try {
      const payload = await loadJson(url);
      const rows = Array.isArray(payload) ? payload : payload.players || payload.data || [];
      return {
        players: rows.map(normalizeSummer26Signup).filter(function (player) { return player.gt; }),
        updatedAt: text(payload.updatedAt || "")
      };
    } catch (_error) {
      return { players: [], updatedAt: "" };
    }
  }

  function normalizeSummer26Signup(player) {
    const captainValue = text(player?.captain || player?.isCaptain || "");
    return {
      gt: text(player?.gt || player?.name || player?.player || ""),
      mainPosition: text(player?.mainPosition || player?.main_position || player?.position || ""),
      alternativePosition: text(player?.alternativePosition || player?.alternative_position || player?.altPosition || ""),
      latestTeam: text(player?.latestTeam || player?.latest_team || player?.team || ""),
      division: normalizeSummerSignupDivision(player?.division),
      availability: text(player?.availability || player?.available || ""),
      captain: /^ja$/i.test(captainValue) ? "Ja" : /^nej|nope$/i.test(captainValue) ? "Nej" : ""
    };
  }

  async function loadTeamLogoIndex() {
    const url = window.SEC_CONFIG?.teamLogoManifestUrl || "";
    if (!url) return new Map();
    try {
      const payload = await loadJson(url);
      const files = (Array.isArray(payload) ? payload : []).map(function (item) {
        return item?.name || "";
      }).filter(function (name) {
        return /\.(png|jpe?g|webp|svg)$/i.test(name);
      });
      const index = new Map();
      files.forEach(function (filename) {
        const base = filename.replace(/\.[^.]+$/, "");
        const keys = uniqueStrings([
          fold(base),
          normalizeLogoKey(base)
        ]);
        keys.forEach(function (key) {
          if (key && !index.has(key)) index.set(key, filename);
        });
      });
      return index;
    } catch (_error) {
      return new Map();
    }
  }

  async function loadPlayerImageIndex() {
    const url = window.SEC_CONFIG?.playerImageManifestUrl || "";
    if (!url) return new Map();
    try {
      const payload = await loadJson(url);
      const files = (Array.isArray(payload) ? payload : []).map(function (item) {
        return item?.name || "";
      }).filter(function (name) {
        return /\.(png|jpe?g|webp)$/i.test(name);
      });
      const index = new Map();
      files.forEach(function (filename) {
        const base = filename.replace(/\.[^.]+$/, "");
        getPlayerAssetKeys(base).forEach(function (key) {
          if (key && !index.has(key)) index.set(key, filename);
        });
      });
      return index;
    } catch (_error) {
      return new Map();
    }
  }

  function mergeRawCups(cups) {
    const map = new Map();
    cups.forEach(function (cup) {
      const playInMeta = parsePlayInCupCode(cup.code || cup.name || "");
      if (playInMeta) {
        const baseKey = fold(playInMeta.baseCode);
        const existing = map.get(baseKey) || {
          id: playInMeta.baseCode.replace(/^SEC\s+/i, "").trim(),
          code: playInMeta.baseCode,
          name: "Svenska eHockey Cupen " + playInMeta.baseCode.replace(/^SEC\s+/i, "").trim()
        };
        map.set(baseKey, mergePlayInCup(existing, cup));
        return;
      }
      const key = fold(cup.code || cup.name || cup.id);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, cup);
        return;
      }
      const existing = map.get(key);
      map.set(key, preferRicherCup(existing, cup));
    });
    return Array.from(map.values());
  }

  function parsePlayInCupCode(value) {
    const raw = text(value);
    const match = raw.match(/^(SEC\s+\d+(?:\.\d+)?(?:\s+DIV\s+\d+)?)\s+Play\s*in$/i);
    return match ? { baseCode: match[1].replace(/\s+/g, " ").trim() } : null;
  }

  function mergePlayInCup(baseCup, playInCup) {
    return Object.assign({}, baseCup, {
      playinSettings: Object.assign({}, baseCup.playinSettings || {}, playInCup.settings || playInCup),
      playinMeta: Object.assign({}, baseCup.playinMeta || {}, {
        code: text(playInCup.code || ""),
        name: text(playInCup.name || "")
      })
    });
  }

  function preferRicherCup(left, right) {
    const leftScore = dataRichness(left);
    const rightScore = dataRichness(right);
    return rightScore > leftScore ? Object.assign({}, left, right) : Object.assign({}, right, left);
  }

  function dataRichness(cup) {
    return (cup.matches?.length || 0)
      + getStatRows(cup.playerStats, "group").length
      + getStatRows(cup.playerStats, "playin").length
      + getStatRows(cup.playerStats, "playoffs").length
      + getStatRows(cup.goalieStats, "group").length
      + getStatRows(cup.goalieStats, "playin").length
      + getStatRows(cup.goalieStats, "playoffs").length;
  }

  function readRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    const routeAndQuery = hash.split("?");
    const parts = routeAndQuery[0].split("/").filter(Boolean);
    const params = new URLSearchParams(routeAndQuery[1] || "");
    if (parts[0] === "overview") {
      history.replaceState(null, "", "#/cups");
      parts.splice(0, parts.length, "cups");
    }
    state.view = routes.has(parts[0]) ? parts[0] : "cups";
    state.activeCupId = state.view === "cups" ? decodeURIComponent(parts[1] || "") : "";
    state.activeCupSection = state.view === "cups" ? decodeURIComponent(parts[2] || "") : "";
    state.activeCupTeamName = state.view === "cups" && state.activeCupSection === "teams" ? decodeURIComponent(parts[3] || "") : "";
    state.activeCupTeamFilter = state.view === "cups" && state.activeCupSection === "matches" ? params.get("team") || "" : "";
    state.activeCupMatchStatus = state.view === "cups" && state.activeCupSection === "matches" ? normalizeMatchStatus(params.get("status")) : "all";
    state.activeCupTableMode = state.view === "cups" && state.activeCupSection === "tables" ? normalizeTableMode(params.get("mode")) : "group";
    state.activeCupStatsMode = state.view === "cups" && state.activeCupSection === "stats" ? normalizeStatsMode(params.get("mode")) : "all";
    state.activeCupGoalieEligibleOnly = state.view === "cups" && state.activeCupSection === "stats" && params.get("eligible") === "1";
    state.activeCupStatsPlayersAll = state.view === "cups" && state.activeCupSection === "stats" && params.get("players") === "all";
    state.activeCupStatsGoaliesAll = state.view === "cups" && state.activeCupSection === "stats" && params.get("goalies") === "all";
    state.activeTeam = state.view === "teams" ? decodeURIComponent(parts[1] || "") : "";
    state.activeTeamTab = normalizeTeamTab(params.get("tab"));
    state.activeTeamStatsMode = state.activeTeamTab === "stats" ? normalizeStatsMode(params.get("mode")) : "all";
    state.activeTeamHistoryMode = state.activeTeamTab === "history" ? normalizeStatsMode(params.get("mode")) : "all";
    state.activePlayer = state.view === "players" ? decodeURIComponent(parts[1] || "") : "";
    state.activeGoalie = state.view === "goalies" ? decodeURIComponent(parts[1] || "") : "";
    state.activeMatchCupId = state.view === "match" ? decodeURIComponent(parts[1] || "") : "";
    state.activeMatchId = state.view === "match" ? decodeURIComponent(parts[2] || "") : "";
    state.summerSignupQuery = state.view === "sommar26" ? text(params.get("q") || "") : "";
    state.summerSignupDivision = state.view === "sommar26" ? normalizeSummerSignupDivision(params.get("division")) : "all";
    state.summerSignupRole = state.view === "sommar26" ? normalizeSummerSignupRole(params.get("role")) : "all";
    state.summerSignupCaptain = state.view === "sommar26" ? normalizeSummerSignupCaptain(params.get("captain")) : "all";
    normalizeTeamRoute(routeAndQuery[1] || "");
    normalizePersonRoute(routeAndQuery[1] || "");
  }

  function normalizeTeamRoute(routeQuery) {
    if (state.view === "teams" && state.activeTeam) {
      const team = findTeamByRouteName(state.activeTeam);
      if (!team) return;
      state.activeTeam = team.name;
      replaceHashIfNeeded(getTeamHref(team.name), routeQuery);
      return;
    }
    if (state.view === "cups" && state.activeCupSection === "teams" && state.activeCupTeamName) {
      const team = findTeamByRouteName(state.activeCupTeamName);
      if (!team) return;
      state.activeCupTeamName = team.name;
      replaceHashIfNeeded(getTeamHref(team.name, state.activeCupId), routeQuery);
    }
  }

  function normalizePersonRoute(routeQuery) {
    if (state.view === "players" && state.activePlayer) {
      const player = findPlayerByPersonName(state.activePlayer);
      if (!player) return;
      const cleanName = getPersonDisplayName(player.name);
      state.activePlayer = cleanName;
      replaceHashIfNeeded(getPersonHref("players", player.name), routeQuery);
      return;
    }
    if (state.view === "goalies" && state.activeGoalie) {
      const goalie = findGoalieByPersonName(state.activeGoalie);
      if (!goalie) return;
      const cleanName = getPersonDisplayName(goalie.name);
      state.activeGoalie = cleanName;
      replaceHashIfNeeded(getPersonHref("goalies", goalie.name), routeQuery);
    }
  }

  function replaceHashIfNeeded(hash, routeQuery) {
    const nextHash = hash + (routeQuery ? "?" + routeQuery : "");
    if (location.hash !== nextHash) {
      history.replaceState(null, "", nextHash);
    }
  }

  function normalizeStatsMode(value) {
    return value === "group" || value === "playin" || value === "playoffs" || value === "all" ? value : "all";
  }

  function normalizeTableMode(value) {
    return value === "playin" ? "playin" : "group";
  }

  function normalizeTeamTab(value) {
    return value === "matches" || value === "stats" || value === "history" || value === "roster" ? value : "roster";
  }

  function normalizeMatchStatus(value) {
    return value === "played" || value === "unplayed" ? value : "all";
  }

  function normalizeSummerSignupDivision(value) {
    const clean = text(value);
    return ["Elite", "Pro", "Lite", "Core", "Neo"].includes(clean) ? clean : "all";
  }

  function normalizeSummerSignupRole(value) {
    return ["forward", "defense", "goalie"].includes(value) ? value : "all";
  }

  function normalizeSummerSignupCaptain(value) {
    return ["yes", "no", "unspecified"].includes(value) ? value : "all";
  }

  function render() {
    const model = buildModel();
    app.innerHTML = `
      <div class="shell">
        <main class="stage">
          ${renderTopbar(model)}
          <div class="view" data-view="${state.view}">
            ${renderView(model)}
          </div>
        </main>
        ${renderFooter()}
      </div>
    `;
    repairRenderedText(app);
    bindInteractions();
  }

  function renderFooter() {
    return `
      <footer class="siteFooter">
        <div>
          <strong>SEC</strong>
          <span>Copyright Ã‚Â© ${new Date().getFullYear()} Svenska eHockey Cupen. Designad av SEC.</span>
        </div>
        <nav aria-label="Kontakt">
          <a href="mailto:svenskehockey@gmail.com">E-post: svenskehockey@gmail.com</a>
          <a href="https://discord.gg/B9TYMEjpj6" target="_blank" rel="noopener">GÃƒÂ¥ med i Discord</a>
        </nav>
      </footer>
    `;
  }

  function renderArenaHeader(model) {
    return `
      <header class="arena">
        <a class="mark" href="#/cups" aria-label="SEC start">
          <img src="${localAssetUrl("./assets/SECLOGGA.png")}" alt="">
          <span>SEC</span>
          <b>Cup</b>
        </a>
        <nav class="railnav" aria-label="SEC meny">
          ${navItem("cups", "Cuper", "Ã¢â€”â€ ")}
          ${navItem("teams", "Lag", "Ã¢â€“Â¦")}
          ${navItem("players", "Spelare", "Ã¢â€”Â")}
          ${navItem("matches", "Matcher", "Ã¢â€ Â¯")}
          ${navItem("goalies", "MÃƒÂ¥lvakter", "Ã¢â€“Â£")}
          ${navItem("about", "Info", "i")}
        </nav>
        <div class="railcard">
          <span>SEC</span>
          <strong>${model.totalMatches}</strong>
          <em>matcher</em>
        </div>
      </header>
    `;
  }

  function navItem(view, label, icon) {
    return `
      <a class="${state.view === view ? "active" : ""}" href="#/${view}">
        <span>${icon}</span>
        ${label}
      </a>
    `;
  }

  function renderTopbar(model) {
    const compact = state.view === "cups" && state.activeCupId;
    return `
      <header class="top ${compact ? "compactTop" : ""}">
        ${renderMainNav()}
        <div>
          <p></p>
          ${compact ? "" : `<h1>${getViewTitle()}</h1>`}
        </div>
        <label class="command">
          <span>SÃƒÂ¶k</span>
          <input data-global-search value="${escapeHtml(state.query)}" placeholder="Lag, spelare, cup eller match" autocomplete="off">
        </label>
      </header>
      ${state.query ? renderSearchResults(model) : ""}
    `;
  }

  function renderMainNav() {
    return `
      <nav class="mainNav" aria-label="Huvudmeny">
        <select class="mobileMainNav" aria-label="Meny" data-mobile-main-nav>
          <option value="https://www.svenskehockey.se/">Svensk eHockey</option>
          <option value="#/cups" selected>SEC</option>
        </select>
        <a class="mainNavLink" href="https://www.svenskehockey.se/">Svensk eHockey</a>
        <a class="mainNavLink active" href="#/cups">SEC</a>
      </nav>
    `;
  }
  function getViewKicker(model) {
    if (state.view === "players" && state.activePlayer) return "Spelare";
    if (state.view === "goalies" && state.activeGoalie) return "Spelare";
    if (state.view === "teams" && state.activeTeam) return "Lag";
    if (state.view === "match") return "Match";
    return model.latestCup ? model.latestCup.code : "SEC";
  }

  function getCupSectionLabel() {
    return {
      tables: "Tabell",
      teams: "Lag",
      bracket: "Slutspel",
      players: "Spelare",
      goalies: "MÃƒÂ¥lvakter",
      stats: "Statistik",
      info: "Regler",
      matches: "Matcher"
    }[state.activeCupSection] || "Ãƒâ€“versikt";
  }

  function getViewTitle() {
    if (state.view === "sommar26") return "SEC Sommar 26";
    if (state.view === "match") return "Match";
    if (state.view === "cups" && state.activeCupId) {
      const cup = state.cups.find(function (entry) { return entry.id === state.activeCupId; });
      if (!cup) return "Cup";
      if (state.activeCupSection === "tables") return cup.name + " - tabeller";
      if (state.activeCupSection === "teams") return cup.name + " - lag";
      if (state.activeCupSection === "bracket") return cup.name + " - slutspel";
      if (state.activeCupSection === "players") return cup.name + " - spelare";
      if (state.activeCupSection === "goalies") return cup.name + " - mÃƒÂ¥lvakter";
      if (state.activeCupSection === "stats") return cup.name + " - statistik";
      if (state.activeCupSection === "info") return cup.name + " - cupinfo";
      if (state.activeCupSection === "matches") return cup.name + " - matcher";
      return cup.name;
    }
    if (state.view === "teams" && state.activeTeam) return state.activeTeam;
    if (state.view === "players" && state.activePlayer) return getPersonDisplayName(state.activePlayer);
    if (state.view === "goalies" && state.activeGoalie) return getPersonDisplayName(state.activeGoalie);
    return {
      cups: "Svenska eHockey Cupen",
      teams: "Lagkartan",
      players: "Spelarhubben",
      goalies: "MÃƒÂ¥lvaktshubben",
      matches: "MatchflÃƒÂ¶de",
      about: "SEC"
    }[state.view] || "SEC";
  }

  function renderSearchResults(model) {
    const query = fold(state.query);
    const cupHits = state.cups.filter(function (cup) {
      return fold(cup.name + " " + cup.code + " " + cup.winner).includes(query);
    }).slice(0, 4);
    const teamHits = state.teams.filter(function (team) {
      return fold(team.name).includes(query);
    }).slice(0, 4);
    const personHits = buildPersonSearchHits(query).slice(0, 4);
    const matchHits = model.allMatches.filter(function (entry) {
      return fold(entry.cup.code + " " + entry.match.awayTeam + " " + entry.match.homeTeam).includes(query);
    }).slice(0, 4);
    const hits = []
      .concat(cupHits.map(function (cup) { return searchLink("#/cups/" + encodeURIComponent(cup.id), "Cup", cup.name, cup.matchCount + " matcher"); }))
      .concat(teamHits.map(function (team) { return searchLink(getTeamHref(team.name), "Lag", team.name, team.matches + " matcher"); }))
      .concat(personHits.map(function (person) { return searchLink(person.href, person.type, person.name, person.meta); }))
      .concat(matchHits.map(function (entry) { return searchLink(getMatchUrl(entry.cup, entry.match), entry.cup.code, entry.match.awayTeam + " - " + entry.match.homeTeam, score(entry.match)); }));

    return `
      <section class="searchdrop">
        ${hits.length ? hits.join("") : `<div class="empty">Inga trÃƒÂ¤ffar fÃƒÂ¶r "${escapeHtml(state.query)}".</div>`}
      </section>
    `;
  }

  function searchLink(href, type, title, meta) {
    return `<a href="${href}" data-search-hit><span>${escapeHtml(type)}</span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(meta)}</em></a>`;
  }

  function buildPersonSearchHits(query) {
    const map = new Map();
    state.players.forEach(function (player) {
      if (!fold(player.name + " " + player.team).includes(query)) return;
      const key = getPersonProfileKey(player.name);
      if (!map.has(key)) map.set(key, { player: null, goalie: null });
      map.get(key).player = player;
    });
    state.goalies.forEach(function (goalie) {
      if (!fold(goalie.name + " " + goalie.team).includes(query)) return;
      const key = getPersonProfileKey(goalie.name);
      if (!map.has(key)) map.set(key, { player: null, goalie: null });
      map.get(key).goalie = goalie;
    });
    return Array.from(map.values()).map(function (entry) {
      const player = entry.player;
      const goalie = entry.goalie;
      const person = player || goalie;
      const parts = [];
      if (player) parts.push(player.pts + " poÃ¤ng");
      if (goalie) parts.push(formatPercent(goalie.svp) + " SV%");
      return {
        href: player ? getPersonHref("players", player.name) : getPersonHref("goalies", goalie.name),
        type: player && goalie ? "Spelare/MÃ¥lvakt" : player ? "Spelare" : "MÃ¥lvakt",
        name: person.name,
        meta: parts.join(" Â· ")
      };
    });
  }

  function renderView(model) {
    if (state.view === "cups" && state.activeCupId) {
      const cup = state.cups.find(function (entry) { return entry.id === state.activeCupId; });
      if (state.activeCupSection === "tables") return renderCupTablesPage(cup);
      if (state.activeCupSection === "teams" && state.activeCupTeamName) {
        const team = findTeamByRouteName(state.activeCupTeamName) || { name: state.activeCupTeamName };
        return renderTeamDetail(model, team, cup);
      }
      if (state.activeCupSection === "teams") return renderCupTeamsPage(cup);
      if (state.activeCupSection === "bracket") return renderCupBracketPage(cup);
      if (state.activeCupSection === "players") return renderCupPlayersPage(cup);
      if (state.activeCupSection === "goalies") return renderCupGoaliesPage(cup);
      if (state.activeCupSection === "stats") return renderCupStatsPage(cup);
      if (state.activeCupSection === "info") return renderCupInfoPage(cup);
      if (state.activeCupSection === "matches") return renderCupMatchesPage(cup);
      return renderCupDetail(model, cup);
    }
    if (state.view === "teams" && state.activeTeam) {
      return renderTeamDetail(model, findTeamByRouteName(state.activeTeam));
    }
    if (state.view === "players" && state.activePlayer) {
      return renderPlayerDetail(model, findPlayerByPersonName(state.activePlayer));
    }
    if (state.view === "goalies" && state.activeGoalie) {
      return renderGoalieDetail(model, findGoalieByPersonName(state.activeGoalie));
    }
    if (state.view === "match") {
      const cup = state.cups.find(function (entry) { return entry.id === state.activeMatchCupId; });
      const match = cup?.matches.find(function (entry) { return entry.id === state.activeMatchId; });
      return cup && match ? renderMatchDetail(cup, match) : `<section class="emptyPage">Matchen hittades inte.</section>`;
    }

    return {
      cups: renderCups,
      teams: renderTeams,
      players: renderPlayers,
      goalies: renderGoalies,
      matches: renderMatches,
      sommar26: renderSummer26,
      about: renderAbout
    }[state.view](model);
  }


  function renderSummer26() {
    const signups = getFilteredSummer26Signups();
    const total = state.summer26Signups.length;
    const goalies = state.summer26Signups.filter(function (player) {
      return getSummerSignupRoles(player).includes("goalie");
    }).length;
    const captains = state.summer26Signups.filter(function (player) {
      return player.captain === "Ja";
    }).length;
    const divisions = ["Elite", "Pro", "Lite", "Core", "Neo"];
    const activeFilters = [
      state.summerSignupQuery,
      state.summerSignupDivision !== "all" ? state.summerSignupDivision : "",
      state.summerSignupRole !== "all" ? state.summerSignupRole : "",
      state.summerSignupCaptain !== "all" ? state.summerSignupCaptain : ""
    ].filter(Boolean).length;
    const updatedLabel = state.summer26UpdatedAt ? formatDate(state.summer26UpdatedAt) : "Ej angivet";

    return `
      <section class="cupHero full summer summer26Hero">
        <div class="cupHeroCopy">
          <nav class="crumbs" aria-label="Brödsmulor">
            <a href="#/cups">SEC</a>
            <span>/</span>
            <strong>Sommar 26</strong>
          </nav>
          <p class="cupKicker">Skandinavisk draftcup</p>
          <h2>SEC Sommar <span>26</span></h2>
          <p class="cupHeroSub">10 augusti - 10 september 2026</p>
          <p>Här visas spelarna som har anmält sig till SEC Sommar 26. Använd filtren för att hitta målvakter, backar, forwards, kaptener eller spelare från en viss ECL-division.</p>
          <div class="cupHeroStats">
            <div><strong>${total}</strong><span>Anmälda spelare</span></div>
            <div><strong>${goalies}</strong><span>Målvakter</span></div>
            <div><strong>${captains}</strong><span>Vill vara kapten</span></div>
          </div>
        </div>
        <div class="cupHeroLogo">
          <img src="${localAssetUrl("./assets/sommarcuplogga.png")}" alt="SEC Sommar 26" loading="eager">
        </div>
      </section>

      <section class="summer26DivisionStrip" aria-label="Anmälda per division">
        ${divisions.map(function (division) {
          const count = state.summer26Signups.filter(function (player) { return player.division === division; }).length;
          return `<span><b>${count}</b>${escapeHtml(division)}</span>`;
        }).join("")}
        <span class="updated"><b>Uppdaterad</b>${escapeHtml(updatedLabel)}</span>
      </section>

      <section class="summerSignupTools" aria-label="Filtrera anmälda spelare">
        <label class="summerSignupSearch">
          <span>Sök spelare eller lag</span>
          <input type="search" data-summer-signup-search value="${escapeHtml(state.summerSignupQuery)}" placeholder="GT eller senaste ECL-lag" autocomplete="off">
        </label>
        <label>
          <span>Division</span>
          <select data-summer-signup-division>
            ${renderSummerSignupOptions(["all", "Elite", "Pro", "Lite", "Core", "Neo"], state.summerSignupDivision, {
              all: "Alla divisioner"
            })}
          </select>
        </label>
        <label>
          <span>Position</span>
          <select data-summer-signup-role>
            ${renderSummerSignupOptions(["all", "forward", "defense", "goalie"], state.summerSignupRole, {
              all: "Alla positioner",
              forward: "Forwards",
              defense: "Backar",
              goalie: "Målvakter"
            })}
          </select>
        </label>
        <label>
          <span>Lagkapten</span>
          <select data-summer-signup-captain>
            ${renderSummerSignupOptions(["all", "yes", "no", "unspecified"], state.summerSignupCaptain, {
              all: "Alla",
              yes: "Ja",
              no: "Nej",
              unspecified: "Ej angivet"
            })}
          </select>
        </label>
        <button type="button" class="summerSignupClear" data-summer-signup-clear ${activeFilters ? "" : "disabled"}>Rensa filter</button>
      </section>

      <div class="summerSignupResultHead">
        <div>
          <span>Anmälda spelare</span>
          <strong>${signups.length}${signups.length !== total ? ` av ${total}` : ""}</strong>
        </div>
        <p>Spelarna sorteras efter senaste ECL-division och därefter GT.</p>
      </div>

      ${signups.length ? `
        <section class="summerSignupGrid">
          ${signups.map(renderSummerSignupCard).join("")}
        </section>
      ` : `
        <section class="emptyPage summerSignupEmpty">
          Inga spelare matchar de valda filtren.
        </section>
      `}
    `;
  }

  function renderSummerSignupOptions(values, activeValue, labels) {
    return values.map(function (value) {
      const label = labels?.[value] || value;
      return `<option value="${escapeHtml(value)}" ${value === activeValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
  }

  function getFilteredSummer26Signups() {
    const query = fold(state.summerSignupQuery);
    const divisionRank = { Elite: 0, Pro: 1, Lite: 2, Core: 3, Neo: 4 };
    return state.summer26Signups.filter(function (player) {
      if (query && !fold([
        player.gt,
        player.mainPosition,
        player.alternativePosition,
        player.latestTeam,
        player.division,
        player.availability,
        player.captain
      ].join(" ")).includes(query)) return false;
      if (state.summerSignupDivision !== "all" && player.division !== state.summerSignupDivision) return false;
      if (state.summerSignupRole !== "all" && !getSummerSignupRoles(player).includes(state.summerSignupRole)) return false;
      if (state.summerSignupCaptain === "yes" && player.captain !== "Ja") return false;
      if (state.summerSignupCaptain === "no" && player.captain !== "Nej") return false;
      if (state.summerSignupCaptain === "unspecified" && player.captain) return false;
      return true;
    }).sort(function (left, right) {
      return (divisionRank[left.division] ?? 99) - (divisionRank[right.division] ?? 99)
        || left.gt.localeCompare(right.gt, "sv", { sensitivity: "base" });
    });
  }

  function getSummerSignupRoles(player) {
    const value = fold([player.mainPosition, player.alternativePosition].join(" "));
    const roles = new Set();
    if (/(^|[^a-z])g([^a-z]|$)|malvakt/.test(value)) roles.add("goalie");
    if (/(^|[^a-z])(hb|vb|ld|rd|d)([^a-z]|$)|back/.test(value)) roles.add("defense");
    if (/(^|[^a-z])(hf|vf|lw|rw|c|fwd)([^a-z]|$)|forward/.test(value)) roles.add("forward");
    if (/alla ute|ute-position|uteposition/.test(value)) {
      roles.add("forward");
      roles.add("defense");
    }
    return Array.from(roles);
  }

  function renderSummerSignupCard(player) {
    const captainClass = player.captain === "Ja" ? "yes" : player.captain === "Nej" ? "no" : "unknown";
    const captainLabel = player.captain || "Ej angivet";
    const positions = [player.mainPosition, player.alternativePosition].filter(Boolean).join(" / ");
    return `
      <article class="summerSignupCard" id="anmalan-${getUrlSlug(player.gt)}">
        <header>
          ${renderPlayerPortrait({ name: player.gt }, "summerSignupPortrait")}
          <div class="summerSignupIdentity">
            <span class="summerDivision summerDivision${escapeHtml(player.division)}">${escapeHtml(player.division)}</span>
            <h3>${escapeHtml(player.gt)}</h3>
            <div class="summerLatestTeam">
              ${renderTeamIdentityStatic(player.latestTeam || "Ej angivet", "teamLogoTiny")}
            </div>
          </div>
        </header>
        <div class="summerSignupFacts">
          <div>
            <span>Huvudposition</span>
            <strong>${escapeHtml(player.mainPosition || "Ej angivet")}</strong>
          </div>
          <div>
            <span>Alternativ</span>
            <strong>${escapeHtml(player.alternativePosition || "Ej angivet")}</strong>
          </div>
          <div class="wide">
            <span>Positioner</span>
            <strong>${escapeHtml(positions || "Ej angivet")}</strong>
          </div>
        </div>
        <footer>
          <span class="availabilityPill">${escapeHtml(player.availability || "Ej angivet")}</span>
          <span class="captainPill ${captainClass}">Lagkapten: ${escapeHtml(captainLabel)}</span>
        </footer>
      </article>
    `;
  }

  function syncSummerSignupRoute() {
    const params = new URLSearchParams();
    if (state.summerSignupQuery) params.set("q", state.summerSignupQuery);
    if (state.summerSignupDivision !== "all") params.set("division", state.summerSignupDivision);
    if (state.summerSignupRole !== "all") params.set("role", state.summerSignupRole);
    if (state.summerSignupCaptain !== "all") params.set("captain", state.summerSignupCaptain);
    const query = params.toString();
    history.replaceState(null, "", "#/sommar26" + (query ? "?" + query : ""));
  }

  function renderOverview(model) {
    return `
      <section class="hero">
        <div class="heroCopy">
          <span class="tag">SEC</span>
          <h2>Svenska eHockey Cupen</h2>
          <p>FÃƒÂ¶lj cuper, tabeller, slutspel, lag, spelare, mÃƒÂ¥lvakter och senaste matcherna frÃƒÂ¥n hela SEC.</p>
          <div class="updateStrip">
            <span>Uppdaterad ${escapeHtml(formatClock())}</span>
            <span>${model.latestMatches[0] ? escapeHtml(model.latestMatches[0].cup.code + " Ã‚Â· " + formatDate(model.latestMatches[0].match.date)) : "VÃƒÂ¤ntar pÃƒÂ¥ matchdata"}</span>
          </div>
          <div class="actions">
            <a href="#/matches">Matcher</a>
            <a href="#/cups">Cuper</a>
          </div>
        </div>
        <div class="rink">
          <div class="rinkLine"></div>
          <div class="puck"></div>
          <strong>${model.latestCup ? escapeHtml(model.latestCup.code) : "SEC"}</strong>
          <span>${model.totalGoals} mÃƒÂ¥l registrerade</span>
        </div>
      </section>
      <section class="metricGrid">
        ${metric("Cuper", state.cups.length, "turneringar")}
        ${metric("Matcher", model.totalMatches, "i arkivet")}
        ${metric("Lag", state.teams.length, "unika namn")}
        ${metric("Spelare", state.players.length, "statistikrader")}
        ${metric("MÃƒÂ¥lvakter", state.goalies.length, "registrerade")}
        ${metric("MÃƒÂ¥l", model.totalGoals, "totalt")}
        ${metric("Snitt", model.avgGoals, "mÃƒÂ¥l per match")}
      </section>
      <section class="dashGrid">
        ${panel("Senaste matcher", renderMatchRows(model.latestMatches, 7))}
        ${panel("PoÃƒÂ¤ngtoppen", renderLeaderRows(model.topPlayers))}
        ${panel("MÃƒÂ¥lvaktstoppen", renderGoalieRows(model.topGoalies))}
      </section>
    `;
  }

  function renderCups(model) {
    return `
      ${renderCupsWelcome(model)}
      <section class="cupMatrix">
        ${state.cups.map(renderCupCard).join("")}
      </section>
    `;
  }

  function renderCupsWelcome(model) {
    const archivePlayers = new Set([]
      .concat(state.players.map(function (player) { return player.name; }))
      .concat(state.goalies.map(function (goalie) { return goalie.name; }))
      .map(fold)
      .filter(Boolean));
    return `
      <section class="cupsWelcome">
        <div class="cupsWelcomeHead">
          <div>
            <span aria-hidden="true">i</span>
            <h2>V&auml;lkommen</h2>
          </div>
          <button type="button" class="adminUnlockButton" data-admin-unlock>Admin</button>
        </div>
        <p>V&auml;lkommen till Svenska eHockey Cupen (SEC) - en communitydriven eHockey-cup som spelas i <strong>EA Sports NHL</strong>. Cupen &auml;r i grunden svensk, men vi vill att v&aring;ra skandinaviska spelare ska vara helt likv&auml;rdiga. D&auml;rf&ouml;r r&auml;knas spelare fr&aring;n <strong>Sverige, Danmark och Norge</strong> p&aring; samma villkor, b&aring;de i lagbyggen och i t&auml;vlingssammanhang.</p>
        <p>Genom &aring;ren har reglerna kunnat skilja sig n&aring;got mellan olika upplagor av cupen, men en sak har varit tydlig: antalet spelare utanf&ouml;r Skandinavien brukar vara <strong>begr&auml;nsat</strong> f&ouml;r att beh&aring;lla cupens skandinaviska profil och en j&auml;mn, tydlig identitet.</p>
        <p>H&auml;r p&aring; sidan hittar du allt f&ouml;r att f&ouml;lja SEC: matchresultat, tabeller, topplistor, spelarstatistik, historiska resultat, matchdata och lagrepresentationer. Sidan <strong>uppdateras kontinuerligt</strong> och fylls p&aring; med nya detaljer, f&ouml;rb&auml;ttringar och mer inneh&aring;ll.</p>
        <p class="cupsWelcomeStats">Just nu finns <strong>${state.cups.length} cuper</strong>, <strong>${model.totalMatches} matcher</strong>, <strong>${state.teams.length} lag</strong> och <strong>${archivePlayers.size} spelare</strong> i arkivet.</p>
        ${renderAdminUpdatePanel()}
      </section>
    `;
  }

  function renderAdminUpdatePanel() {
    if (!state.adminUpdateVisible) return "";
    const endpoint = text(window.SEC_CONFIG?.manualUpdateEndpointUrl || "");
    const workflowUrl = text(window.SEC_CONFIG?.manualUpdateWorkflowUrl || "https://github.com/sweehockey-svg/SEC/actions/workflows/update-database-cups.yml");
    return `
      <div class="adminUpdatePanel">
        <div>
          <strong>Admin</strong>
          <span>${endpoint ? "Kör uppdatering från databasen." : "Öppna GitHub Actions och kör workflow manuellt."}</span>
          ${state.adminUpdateStatus ? `<em>${escapeHtml(state.adminUpdateStatus)}</em>` : ""}
        </div>
        <button type="button" data-admin-update data-workflow-url="${escapeHtml(workflowUrl)}">
          Uppdatera data
        </button>
      </div>
    `;
  }

  function renderCupCard(cup) {
    const cupLogo = isSummer(cup) ? localAssetUrl("./assets/sommarcuplogga.png") : localAssetUrl("./assets/SECLOGGA.png");
    const hasWinner = Boolean(cup.winner);
    return `
      <a class="cupTile ${isSummer(cup) ? "summer" : ""}" href="#/cups/${encodeURIComponent(cup.id)}">
        <img class="cupTileLogo" src="${cupLogo}" alt="" loading="lazy">
<strong>${escapeHtml(cup.code)}</strong>
        <div class="cupTileStats">
          <b>${cup.matchCount}</b><em>matcher</em>
          <b>${cup.teams.length}</b><em>lag</em>
        </div>
        <p class="cupTileDate">${escapeHtml(formatCupDateRange(cup))}</p>
        <div class="cupTileWinner">
          ${hasWinner ? renderTeamLogo(cup.winner, "cupWinnerLogo") : ""}
          <span>
            <em>Vinnare</em>
            <b>${escapeHtml(cup.winner || "Ej klar")}</b>
          </span>
        </div>
      </a>
    `;
  }

  function renderCupHero(cup, options) {
    const opts = options || {};
    const full = opts.full !== false;
    const groupMatches = cup.matches.filter(function (match) { return !isPlayoffMatch(match) && normalizeStage(match.stage || match.group) !== "playin"; }).length;
    const playInMatches = cup.matches.filter(function (match) { return normalizeStage(match.stage || match.group) === "playin"; }).length;
    const playoffMatches = cup.matches.filter(isPlayoffMatch).length;
    const titleParts = splitCupTitle(opts.title || cup.name);
    const cupLogo = isSummer(cup) ? localAssetUrl("./assets/sommarcuplogga.png") : localAssetUrl("./assets/SECLOGGA.png");
    return `
      <section class="cupHero ${full ? "full" : "compact"} ${isSummer(cup) ? "summer" : ""}">
        <div class="cupHeroCopy">
          <nav class="crumbs" aria-label="BrÃƒÂ¶dsmulor">
            <a href="#/cups">Start</a>
            <span>/</span>
            <strong>${escapeHtml(cup.code)}</strong>
          </nav>
          ${opts.kicker === true ? `<p class="cupKicker">${escapeHtml(cup.code)}</p>` : ""}
          <h2>${escapeHtml(titleParts.main)}${titleParts.edition ? ` <span>${escapeHtml(titleParts.edition)}</span>` : ""}</h2>
          ${titleParts.sub ? `<p class="cupHeroSub">${escapeHtml(titleParts.sub)}</p>` : ""}
          <p>${escapeHtml(opts.description || cup.name)}</p>
          ${full ? `
            <div class="cupHeroStats">
              ${cupHeroStat(cup.teams.length, "Lag")}
              ${cupHeroStat(groupMatches, "Gruppmatcher")}
              ${playInMatches ? cupHeroStat(playInMatches, "Play in-matcher") : ""}
              ${cupHeroStat(playoffMatches, "Slutspelsmatcher")}
            </div>
          ` : ""}
        </div>
        ${full ? `
          <div class="cupHeroLogo">
            <img src="${cupLogo}" alt="${escapeHtml(cup.code)}">
          </div>
        ` : ""}
      </section>
      ${opts.spotlight === false ? "" : renderCupSpotlight(cup)}
    `;
  }

  function cupHeroStat(value, label) {
    return `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function splitCupTitle(title) {
    const clean = text(title);
    const match = clean.match(/^(Svenska eHockey Cupen)\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/i);
    if (match) return { main: match[1], edition: match[2], sub: match[3] || "" };
    return { main: clean, edition: "", sub: "" };
  }

  function renderCupSpotlight(cup) {
    const topPlayer = cup.topPlayers[0];
    const topGoalie = cup.topGoalies[0];
    return `
      <section class="cupSpotlight">
        ${topPlayer ? `
          <a class="spotlightCard" href="${getPersonHref("players", topPlayer.name)}">
            ${renderPlayerPortrait(topPlayer, "spotlightPortrait")}
            <div>
              <span>PoÃƒÂ¤ngkung</span>
              <strong>${renderPersonName(topPlayer.name)}</strong>
              <em>${renderTeamIdentityStatic(topPlayer.team, "teamLogoChip")}</em>
              <b>${topPlayer.pts} p</b>
            </div>
          </a>
        ` : ""}
        ${cup.winner ? `<a class="spotlightCard" href="${getTeamHref(cup.winner, cup.id)}">` : `<div class="spotlightCard">`}
          ${cup.winner ? renderTeamLogo(cup.winner, "spotlightLogo") : `<img src="${localAssetUrl("./assets/SECLOGGA.png")}" alt="">`}
          <div>
            <span>Vinnare</span>
            <strong>${escapeHtml(cup.winner || "Ej klar")}</strong>
            <em>Finalist: ${escapeHtml(cup.runnerUp || "Ej klar")}</em>
          </div>
        ${cup.winner ? `</a>` : `</div>`}
        ${topGoalie ? `
          <a class="spotlightCard" href="${getPersonHref("goalies", topGoalie.name)}">
            ${renderPlayerPortrait(topGoalie, "spotlightPortrait")}
            <div>
              <span>MÃƒÂ¥lvaktskung</span>
              <strong>${renderPersonName(topGoalie.name)}</strong>
              <em>${renderTeamIdentityStatic(topGoalie.team, "teamLogoChip")}</em>
              <b>${formatPercent(topGoalie.svp)}</b>
            </div>
          </a>
        ` : ""}
      </section>
    `;
  }

  function renderCupDetail(model, cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    const rows = cup.matches.filter(isPlayedMatch).sort(compareMatches).slice(0, 10).map(function (match) {
      return { cup: cup, match: match };
    });
    const standings = buildStandings(cup);
    const bracket = buildBracket(cup);
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: "Cupsidan visar ÃƒÂ¶versikt, tabeller, lag, topplistor och matcher fÃƒÂ¶r den valda turneringen.",
        full: true
      })}
      ${renderCupSectionNav(cup)}
      <section class="sportGrid">
        ${panelWithAction("Tabeller", "FullstÃƒÂ¤ndig tabell", "#/cups/" + encodeURIComponent(cup.id) + "/tables", renderStandingsPreview(standings, cup.settings))}
        ${panelWithAction("SlutspelstrÃƒÂ¤d", "FullstÃƒÂ¤ndigt trÃƒÂ¤d", "#/cups/" + encodeURIComponent(cup.id) + "/bracket", renderBracketPreview(bracket, cup.settings, cup))}
      </section>
      <section class="dashGrid two">
        ${panelWithAction("Cupinfo", "FullstÃƒÂ¤ndiga regler", "#/cups/" + encodeURIComponent(cup.id) + "/info", renderCupSettings(cup.settings, { preview: true }))}
        ${panelWithAction("Senaste spelade matcher", "Alla matcher", "#/cups/" + encodeURIComponent(cup.id) + "/matches", renderCupMatchPreview(rows))}
        ${panelWithAction("Toppspelare", "All statistik", "#/cups/" + encodeURIComponent(cup.id) + "/stats", renderCupTopPlayerPreview(cup.topPlayers))}
        ${panelWithAction("ToppmÃƒÂ¥lvakter", "All statistik", "#/cups/" + encodeURIComponent(cup.id) + "/stats", renderCupTopGoaliePreview(cup.topGoalies))}
      </section>
      <section class="cupTeamsWide">
        ${panel("Lag i cupen", renderMiniTags(cup.teams, "teams"))}
      </section>
    `;
  }

  function renderCupTablesPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    const hasPlayIn = supportsPlayInGroup(cup) && (hasPlayInTableData(cup) || hasStageStats(cup, "playin"));
    const mode = hasPlayIn ? state.activeCupTableMode : "group";
    const standings = buildStandings(cup, mode);
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· " + formatCupDateRange(cup) + " Ã‚Â· streck enligt cupinfo."
      })}
      ${renderCupSectionNav(cup)}
      <section class="fullPagePanel">
        ${hasPlayIn ? renderTableModeTabs(cup, mode) : ""}
        ${mode === "playin" && !standings.length && hasStageStats(cup, "playin") ? renderMissingPlayInTableNotice() : renderStandings(standings, getStandingsSettings(cup, mode), { full: true })}
      </section>
    `;
  }

  function renderMissingPlayInTableNotice() {
    return `<div class="empty">Play in-tabellen saknas i den hÃƒÂ¤r JSON-exporten. Play in-statistik finns, men matcherna frÃƒÂ¥n liga 395 behÃƒÂ¶ver exporteras ocksÃƒÂ¥. KÃƒÂ¶r om sql/database-cups.sql och uppdatera database-cups.json sÃƒÂ¥ visas tabellen hÃƒÂ¤r.</div>`;
  }

  function renderTableModeTabs(cup, activeMode) {
    const modes = [
      ["group", "Gruppspel"],
      ["playin", "Play in"]
    ];
    return `
      <nav class="subTabs tableModeTabs" aria-label="Tabelldel">
        ${modes.map(function (mode) {
          const href = "#/cups/" + encodeURIComponent(cup.id) + "/tables" + (mode[0] === "group" ? "" : "?mode=" + mode[0]);
          return `<a class="${activeMode === mode[0] ? "active" : ""}" href="${href}">${escapeHtml(mode[1])}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderCupBracketPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    const bracket = buildBracket(cup);
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· " + bracket.reduce(function (sum, round) { return sum + ((round.series && round.series.length) || 0); }, 0) + " serier."
      })}
      ${renderCupSectionNav(cup)}
      <section class="fullPagePanel">
        ${renderBracket(bracket, cup.settings, { full: true, cup: cup })}
      </section>
    `;
  }

  function renderCupSectionNav(cup) {
    const base = "#/cups/" + encodeURIComponent(cup.id);
    const current = state.activeCupSection || "";
    const items = [
      ["", "Ãƒâ€“versikt"],
      ["teams", "Lag"],
      ["tables", "Tabell"],
      ["bracket", "Slutspel"],
      ["matches", "Matcher"],
      ["stats", "Statistik"],
      ["info", "Regler"]
    ];
    return `
      <nav class="cupSectionNav" aria-label="Cupmeny">
        ${items.map(function (item) {
          return `<a class="${current === item[0] ? "active" : ""}" href="${item[0] ? base + "/" + item[0] : base}">${escapeHtml(item[1])}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderCupTeamsPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    const rows = buildCupTeamRows(cup);
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· " + rows.length + " lag med matcher, mÃƒÂ¥l och resultat i cupen."
      })}
      ${renderCupSectionNav(cup)}
      <section class="cupTeamGrid">
        ${rows.map(function (team) {
          return `
            <a class="teamTile cupTeamTile" href="${getTeamHref(team.name, cup.id)}">
              ${renderTeamLogo(team.name, "teamLogoTile")}
              <strong>${escapeHtml(team.name)}</strong>
              <em>${team.matches} matcher Ã‚Â· ${team.wins} vinster Ã‚Â· ${team.goalsFor}-${team.goalsAgainst}</em>
              <span>${team.points} pts</span>
            </a>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderCupPlayersPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· all spelarstatistik frÃƒÂ¥n gruppspel och slutspel."
      })}
      ${renderCupSectionNav(cup)}
      <section class="fullPagePanel">
        ${renderCupPlayerStatsTable(cup.playerRows)}
      </section>
    `;
  }

  function renderCupGoaliesPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· rÃƒÂ¤ddningsprocent, GAA, rÃƒÂ¤ddningar och nollor."
      })}
      ${renderCupSectionNav(cup)}
      <section class="fullPagePanel">
        ${renderCupGoalieStatsTable(cup.goalieRows)}
      </section>
    `;
  }

  function renderCupStatsPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    const requestedMode = state.activeCupStatsMode || "all";
    const mode = requestedMode === "playin" && !supportsPlayInGroup(cup) ? "all" : requestedMode;
    const playerRows = mode === "group" ? cup.playerStageRows.group : mode === "playin" ? cup.playerStageRows.playin : mode === "playoffs" ? cup.playerStageRows.playoffs : cup.playerRows;
    const rawGoalieRows = mode === "group" ? cup.goalieStageRows.group : mode === "playin" ? cup.goalieStageRows.playin : mode === "playoffs" ? cup.goalieStageRows.playoffs : cup.goalieRows;
    const goalieRows = state.activeCupGoalieEligibleOnly ? filterEligibleCupGoalies(rawGoalieRows, getMatchesForStatsMode(cup, mode)) : rawGoalieRows;
    const modeLabel = mode === "group" ? "Gruppspel" : mode === "playin" ? "Play in" : mode === "playoffs" ? "Slutspel" : "All statistik";
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· spelare och mÃƒÂ¥lvakter uppdelat pÃƒÂ¥ gruppspel och slutspel."
      })}
      ${renderCupSectionNav(cup)}
      <section class="statPageGrid">
        ${panelWithTools("Spelare - " + modeLabel, renderCupStatsModeTabs(cup, mode), renderCupPlayerStatsTable(playerRows, {
          limit: 10,
          expanded: state.activeCupStatsPlayersAll,
          showAllHref: buildCupStatsHref(cup, mode, { playersAll: true }),
          collapseHref: buildCupStatsHref(cup, mode, { playersAll: false })
        }))}
        ${panelWithTools("M\u00e5lvakter - " + modeLabel, renderCupGoalieEligibilityToggle(cup, mode), renderCupGoalieStatsTable(goalieRows, {
          limit: 10,
          expanded: state.activeCupStatsGoaliesAll,
          showAllHref: buildCupStatsHref(cup, mode, { goaliesAll: true }),
          collapseHref: buildCupStatsHref(cup, mode, { goaliesAll: false })
        }))}
      </section>
    `;
  }

  function getMatchesForStatsMode(cup, mode) {
    if (mode === "group") return cup.matches.filter(function (match) { return !isPlayoffMatch(match); });
    if (mode === "playin") return supportsPlayInGroup(cup) ? cup.matches.filter(function (match) { return normalizeStage(match.stage || match.group) === "playin"; }) : [];
    if (mode === "playoffs") return cup.matches.filter(isPlayoffMatch);
    return cup.matches;
  }

  function renderCupStatsModeTabs(cup, activeMode) {
    const modes = [
      ["all", "Allt"],
      ["group", "Gruppspel"]
    ];
    if (supportsPlayInGroup(cup) && hasStageStats(cup, "playin")) modes.push(["playin", "Play in"]);
    modes.push(["playoffs", "Slutspel"]);
    return `
      <nav class="subTabs" aria-label="StatistiklÃƒÂ¤ge">
        ${modes.map(function (mode) {
          const href = buildCupStatsHref(cup, mode[0]);
          return `<a class="${activeMode === mode[0] ? "active" : ""}" href="${href}">${mode[1]}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderCupGoalieEligibilityToggle(cup, mode) {
    const href = buildCupStatsHref(cup, mode, { eligible: !state.activeCupGoalieEligibleOnly });
    return `
      <a class="toggleChip ${state.activeCupGoalieEligibleOnly ? "active" : ""}" href="${href}">
        <span class="toggleBox">${state.activeCupGoalieEligibleOnly ? "✓" : ""}</span>
        <span>Minst ${formatPercent(GOALIE_ELIGIBILITY_RATE)}% av lagets matcher</span>
      </a>
    `;
  }

  function buildCupStatsHref(cup, mode, overrides) {
    const opts = overrides || {};
    const hasOverride = function (key) {
      return Object.prototype.hasOwnProperty.call(opts, key);
    };
    const params = new URLSearchParams();
    params.set("mode", mode || state.activeCupStatsMode || "all");
    const eligible = hasOverride("eligible") ? opts.eligible : state.activeCupGoalieEligibleOnly;
    const playersAll = hasOverride("playersAll") ? opts.playersAll : state.activeCupStatsPlayersAll;
    const goaliesAll = hasOverride("goaliesAll") ? opts.goaliesAll : state.activeCupStatsGoaliesAll;
    if (eligible) params.set("eligible", "1");
    if (playersAll) params.set("players", "all");
    if (goaliesAll) params.set("goalies", "all");
    return "#/cups/" + encodeURIComponent(cup.id) + "/stats?" + params.toString();
  }

  function renderCupInfoPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· cupinfo, behÃƒÂ¶righet, BO-format och spelargrÃƒÂ¤nser."
      })}
      ${renderCupSectionNav(cup)}
      <section class="fullPagePanel">
        ${renderCupSettings(cup.settings, { full: true })}
      </section>
      <section class="fullPagePanel">
        ${renderSharedSecRules()}
      </section>
    `;
  }

  function renderCupMatchesPage(cup) {
    if (!cup) return `<section class="emptyPage">Cupen hittades inte.</section>`;
    const teams = cup.teams.slice().sort(function (a, b) {
      return a.localeCompare(b, "sv");
    });
    const selectedTeam = teams.includes(state.activeCupTeamFilter) ? state.activeCupTeamFilter : "";
    const selectedStatus = state.activeCupMatchStatus;
    const filteredMatchesByTeam = selectedTeam
      ? cup.matches.filter(function (match) {
        return match.awayTeam === selectedTeam || match.homeTeam === selectedTeam;
      })
      : cup.matches;
    const filteredMatches = filteredMatchesByTeam.filter(function (match) {
      return matchMatchesStatus(match, selectedStatus);
    });
    const rows = filteredMatches.slice().sort(compareMatches).map(function (match) {
      return { cup: cup, match: match };
    });
    return `
      ${renderCupHero(cup, {
        title: cup.name,
        description: cup.name + " Ã‚Â· " + rows.length + " av " + cup.matches.length + " matcher" + (selectedTeam ? " fÃƒÂ¶r " + selectedTeam : "") + "."
      })}
      ${renderCupSectionNav(cup)}
      <section class="fullPagePanel">
        ${renderCupMatchFilter(cup, teams, selectedTeam, selectedStatus)}
        ${renderCupMatchSchedule(rows)}
      </section>
    `;
  }

  function matchMatchesStatus(match, status) {
    if (status === "played") return isPlayedMatch(match);
    if (status === "unplayed") return !isPlayedMatch(match);
    return true;
  }

  function getCupMatchesHref(cup, team, status) {
    const params = new URLSearchParams();
    if (team) params.set("team", team);
    if (status && status !== "all") params.set("status", status);
    const query = params.toString();
    return "#/cups/" + encodeURIComponent(cup.id) + "/matches" + (query ? "?" + query : "");
  }

  function renderCupMatchStatusTabs(cup, selectedTeam, selectedStatus) {
    const modes = [
      ["all", "Alla"],
      ["played", "Spelade"],
      ["unplayed", "Ospelade"]
    ];
    return `
      <nav class="matchStatusTabs" aria-label="Matchfilter">
        ${modes.map(function (mode) {
          return `<a class="${selectedStatus === mode[0] ? "active" : ""}" href="${getCupMatchesHref(cup, selectedTeam, mode[0])}">${escapeHtml(mode[1])}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderCupMatchFilter(cup, teams, selectedTeam, selectedStatus) {
    return `
      <div class="matchFilter">
        ${renderCupMatchStatusTabs(cup, selectedTeam, selectedStatus)}
        <label>
          <span>Lag</span>
          <select data-cup-team-filter data-cup-id="${escapeHtml(cup.id)}">
            <option value="">Alla lag</option>
            ${teams.map(function (team) {
              return `<option value="${escapeHtml(team)}" ${team === selectedTeam ? "selected" : ""}>${escapeHtml(team)}</option>`;
            }).join("")}
          </select>
        </label>
      </div>
    `;
  }

  function renderMatchDetail(cup, match) {
    const parsed = parseMatchStatsSummary(match.statsSummary, match);
    const ea = parseEaMatchData(match);
    const displayMatch = ea.match ? Object.assign({}, match, ea.match) : match;
    const rawPlayerStats = shouldUseEaPlayerStats(displayMatch, match.playerStats, ea.playerStats) ? ea.playerStats : match.playerStats;
    const rawGoalieStats = shouldUseEaGoalieStats(match.goalieStats, ea.goalieStats) ? ea.goalieStats : match.goalieStats;
    const basePlayerStats = hasMatchStats(rawPlayerStats) ? rawPlayerStats : parsed.playerStats;
    const goalieStats = hasMatchStats(rawGoalieStats) ? rawGoalieStats : parsed.goalieStats;
    const parsedEvents = parseMatchEvents(match.goalsSummary, displayMatch);
    const playerStats = reconcileMatchPlayerStats(displayMatch, basePlayerStats, parsedEvents);
    const events = parsedEvents.length ? parsedEvents : buildFallbackMatchEvents(displayMatch, playerStats);
    return `
      <section class="matchDetailHero">
        <a class="backLink" href="#/cups/${encodeURIComponent(cup.id)}/matches">Tillbaka till matcher</a>
        <div class="crumbs">
          <a href="#/cups">Start</a>
          <span>/</span>
          <a href="#/cups/${encodeURIComponent(cup.id)}">${escapeHtml(cup.code)}</a>
          <span>/</span>
          <strong>Match</strong>
        </div>
        <div class="matchDetailScoreboard">
          ${renderMatchDetailTeam(cup, displayMatch.awayTeam)}
          <div class="matchDetailCenter">
            <span>${escapeHtml(displayMatch.group || (isPlayoffMatch(displayMatch) ? "Slutspel" : "Gruppspel"))}</span>
            <strong>${score(displayMatch)}</strong>
            <em>${escapeHtml(formatDate(match.date))}${match.time ? " Ã‚Â· " + escapeHtml(match.time) : ""}</em>
          </div>
          ${renderMatchDetailTeam(cup, displayMatch.homeTeam)}
        </div>
      </section>
      <section class="matchDetailGrid">
        ${panel("MatchÃƒÂ¶versikt", renderMatchStatBoard(displayMatch, playerStats, goalieStats))}
        ${panel("HÃƒÂ¤ndelser", renderMatchTimeline(events))}
      </section>
      <section class="matchTeamStatsGrid">
        ${renderMatchPlayerSide(displayMatch.awayTeam, playerStats.away)}
        ${renderMatchPlayerSide(displayMatch.homeTeam, playerStats.home)}
      </section>
      <section class="matchTeamStatsGrid">
        ${renderMatchGoalieSide(displayMatch.awayTeam, goalieStats.away)}
        ${renderMatchGoalieSide(displayMatch.homeTeam, goalieStats.home)}
      </section>
    `;
  }

  function renderMatchDetailTeam(cup, teamName) {
    return `
      <a class="matchDetailTeam" href="${getTeamHref(teamName, cup.id)}">
        ${renderTeamLogo(teamName, "teamLogoHero")}
        <strong>${escapeHtml(teamName)}</strong>
      </a>
    `;
  }

  function renderMatchStatBoard(match, playerStats, goalieStats) {
    const shots = getMatchShots(match, goalieStats);
    const awayPim = sumMatchRows(playerStats.away, "pim");
    const homePim = sumMatchRows(playerStats.home, "pim");
    const rows = [
      shots ? { label: "Skott", away: shots.away, home: shots.home } : null,
      { label: "MÃƒÂ¥l", away: match.awayScore, home: match.homeScore },
      { label: "PIM", away: awayPim, home: homePim },
      { label: "MÃƒÂ¥lvaktsrÃƒÂ¤ddningar", away: sumMatchRows(goalieStats.away, "sv"), home: sumMatchRows(goalieStats.home, "sv") },
      { label: "SV%", away: goalieStats.away[0] ? formatPercent(goalieStats.away[0].svp) : "-", home: goalieStats.home[0] ? formatPercent(goalieStats.home[0].svp) : "-" }
    ].filter(Boolean);
    return `
      <div class="matchStatBoard">
        <div class="matchStatHead"><span>${escapeHtml(match.awayTeam)}</span><span></span><span>${escapeHtml(match.homeTeam)}</span></div>
        ${rows.map(function (row) {
          return `<div class="matchStatRow"><strong>${escapeHtml(formatMatchValue(row.away))}</strong><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(formatMatchValue(row.home))}</strong></div>`;
        }).join("")}
      </div>
    `;
  }

  function renderMatchTimeline(events) {
    if (!events.length) return `<div class="empty">Ingen matchsummering finns registrerad.</div>`;
    return `
      <div class="matchTimeline">
        ${events.map(function (event) {
          const typeLabel = event.type === "penalty" ? "Utvisning" : event.type === "goal" ? "MÃƒÂ¥l" : "Info";
          const description = event.type === "goal"
            ? event.player + (event.assists.length ? " (" + event.assists.join(", ") + ")" : "") + (event.tags.length ? " Ã‚Â· " + event.tags.join(", ") : "")
            : event.type === "penalty"
              ? event.player + (event.penalty ? " - " + event.penalty : "") + (event.pim ? " (" + event.pim + " min)" : "")
              : event.body;
          return `
            <div class="matchEvent is-${escapeHtml(event.type)}">
              <span>${escapeHtml(event.time || "-")}</span>
              <b>${escapeHtml(typeLabel)}</b>
              <strong>${escapeHtml(event.team || "")}</strong>
              <em>${escapeHtml(description)}</em>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderMatchPlayerSide(teamName, rows) {
    const sorted = (rows || []).slice().sort(function (a, b) {
      return number(b.pts) - number(a.pts) || number(b.g) - number(a.g) || number(b.a) - number(a.a) || a.name.localeCompare(b.name, "sv");
    });
    return panel(teamName + " - spelare", sorted.length ? `
      <div class="dataTable matchStatsTable">
        <table>
          <thead><tr><th>Spelare</th><th>G</th><th>A</th><th>PTS</th><th>PIM</th></tr></thead>
          <tbody>${sorted.map(function (row) {
            return `<tr><td><a href="${getPersonHref("players", row.name)}">${renderPersonName(row.name)}</a></td><td>${row.g}</td><td>${row.a}</td><td><strong>${row.pts}</strong></td><td>${row.pim}</td></tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    ` : `<div class="empty">Ingen spelarstatistik finns registrerad.</div>`);
  }

  function renderMatchGoalieSide(teamName, rows) {
    const sorted = (rows || []).slice().sort(sortGoalies);
    return panel(teamName + " - mÃƒÂ¥lvakter", sorted.length ? `
      <div class="dataTable matchStatsTable">
        <table>
          <thead><tr><th>MÃƒÂ¥lvakt</th><th>SA</th><th>GA</th><th>SV</th><th>SV%</th></tr></thead>
          <tbody>${sorted.map(function (row) {
            return `<tr><td><a href="${getPersonHref("goalies", row.name)}">${renderPersonName(row.name)}</a></td><td>${row.sa}</td><td>${row.ga}</td><td>${row.sv}</td><td><strong>${formatPercent(row.svp)}</strong></td></tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    ` : `<div class="empty">Ingen mÃƒÂ¥lvaktsstatistik finns registrerad.</div>`);
  }

  function normalizeMatchStatSides(stats, normalizer) {
    const empty = { away: [], home: [] };
    if (!stats) return empty;
    if (Array.isArray(stats.away) || Array.isArray(stats.home)) {
      return {
        away: normalizer(stats.away || []),
        home: normalizer(stats.home || [])
      };
    }
    return empty;
  }

  function normalizePlayerRowsForMatch(rows) {
    return (rows || []).map(function (row) {
      return {
        name: text(row.displayName || row.player || row.name || "OkÃƒÂ¤nd spelare"),
        team: text(row.team),
        gp: number(row.gp) || 1,
        g: number(row.g),
        a: number(row.a),
        pts: number(row.pts),
        pim: number(row.pim),
        playerId: text(row.playerId)
      };
    });
  }

  function normalizeGoalieRowsForMatch(rows) {
    return (rows || []).map(function (row) {
      const ga = number(row.ga);
      const sv = number(row.sv);
      const sa = number(row.sa) || ga + sv;
      return finalizeGoalie({
        name: text(row.displayName || row.player || row.name || "OkÃƒÂ¤nd mÃƒÂ¥lvakt"),
        team: text(row.team),
        gp: number(row.gp) || 1,
        sa: sa,
        ga: ga,
        sv: sv,
        svp: number(row.svp),
        gaa: number(row.gaa) || ga,
        so: number(row.so),
        playerId: text(row.playerId)
      });
    });
  }

  function hasMatchStats(stats) {
    return Boolean(stats && ((stats.away && stats.away.length) || (stats.home && stats.home.length)));
  }

  function shouldUseEaPlayerStats(match, currentStats, eaStats) {
    if (!hasMatchStats(eaStats)) return false;
    if (!hasMatchStats(currentStats)) return true;
    const currentGoals = sumMatchRows(currentStats.away || [], "g") + sumMatchRows(currentStats.home || [], "g");
    const eaGoals = sumMatchRows(eaStats.away || [], "g") + sumMatchRows(eaStats.home || [], "g");
    const matchGoals = number(match.awayScore) + number(match.homeScore);
    return matchGoals > 0 && currentGoals === 0 && eaGoals > 0;
  }

  function shouldUseEaGoalieStats(currentStats, eaStats) {
    if (!hasMatchStats(eaStats)) return false;
    if (!hasMatchStats(currentStats)) return true;
    const currentShots = sumMatchRows(currentStats.away || [], "sa") + sumMatchRows(currentStats.home || [], "sa");
    const eaShots = sumMatchRows(eaStats.away || [], "sa") + sumMatchRows(eaStats.home || [], "sa");
    return currentShots === 0 && eaShots > 0;
  }

  function parseEaMatchData(match) {
    const empty = { match: null, playerStats: { away: [], home: [] }, goalieStats: { away: [], home: [] } };
    if (!match.eaJson) return empty;
    let data = null;
    try {
      data = JSON.parse(match.eaJson);
    } catch (error) {
      return empty;
    }
    if (!data || typeof data !== "object") return empty;

    const awayClub = findEaClubEntry(data, match.awayTeam);
    const homeClub = findEaClubEntry(data, match.homeTeam);
    const playerStats = {
      away: parseEaSkaterRows(data, awayClub, match.awayTeam),
      home: parseEaSkaterRows(data, homeClub, match.homeTeam)
    };
    const goalieStats = {
      away: parseEaGoalieRows(data, awayClub, match.awayTeam),
      home: parseEaGoalieRows(data, homeClub, match.homeTeam)
    };
    const matchPatch = {};
    if (awayClub && number(awayClub.value.shots) > 0) matchPatch.awayShots = number(awayClub.value.shots);
    if (homeClub && number(homeClub.value.shots) > 0) matchPatch.homeShots = number(homeClub.value.shots);
    return {
      match: Object.keys(matchPatch).length ? matchPatch : null,
      playerStats: playerStats,
      goalieStats: goalieStats
    };
  }

  function findEaClubEntry(data, teamName) {
    const clubs = data.clubs || {};
    const target = fold(teamName);
    const entries = Object.keys(clubs).map(function (clubId) {
      return { id: clubId, value: clubs[clubId] || {} };
    });
    return entries.find(function (entry) {
      return fold(entry.value.details?.name || entry.value.name || "") === target;
    }) || null;
  }

  function parseEaSkaterRows(data, clubEntry, teamName) {
    if (!clubEntry || !data.players || !data.players[clubEntry.id]) return [];
    return Object.keys(data.players[clubEntry.id]).map(function (playerId) {
      const row = data.players[clubEntry.id][playerId] || {};
      if (isEaGoalie(row)) return null;
      const g = firstEaNumber(row, ["skgoals", "goals"]);
      const a = firstEaNumber(row, ["skassists", "assists"]);
      const pim = firstEaNumber(row, ["skpim", "pim", "penaltyMinutes"]);
      return {
        name: getEaPlayerDisplayName(row, playerId),
        team: teamName,
        gp: 1,
        g: g,
        a: a,
        pts: firstEaNumber(row, ["skpoints", "points"]) || g + a,
        pim: pim,
        playerId: String(playerId)
      };
    }).filter(Boolean).sort(function (a, b) {
      return number(b.pts) - number(a.pts) || number(b.g) - number(a.g) || number(b.a) - number(a.a) || a.name.localeCompare(b.name, "sv");
    });
  }

  function parseEaGoalieRows(data, clubEntry, teamName) {
    if (!clubEntry || !data.players || !data.players[clubEntry.id]) return [];
    return Object.keys(data.players[clubEntry.id]).map(function (playerId) {
      const row = data.players[clubEntry.id][playerId] || {};
      if (!isEaGoalie(row)) return null;
      const sa = firstEaNumber(row, ["glshots", "goalieShots", "shotsAgainst"]);
      const ga = firstEaNumber(row, ["glga", "goalsAllowed"]);
      const sv = firstEaNumber(row, ["glsaves", "saves"]);
      return finalizeGoalie({
        name: getEaPlayerDisplayName(row, playerId),
        team: teamName,
        gp: 1,
        sa: sa || ga + sv,
        ga: ga,
        sv: sv,
        svp: normalizeEaSavePercent(firstEaNumber(row, ["glsavepct", "savePct"])),
        gaa: ga,
        so: ga === 0 ? 1 : 0,
        playerId: String(playerId)
      });
    }).filter(Boolean);
  }

  function isEaGoalie(row) {
    const position = fold(row.position || row.pos || row.playerPosition || "");
    return position.includes("goalie")
      || position === "g"
      || ["glshots", "glsaves", "glga", "goalieShots", "saves", "goalsAllowed"].some(function (key) {
        return number(row[key]) > 0;
      });
  }

  function firstEaNumber(row, keys) {
    for (let index = 0; index < keys.length; index += 1) {
      if (row[keys[index]] !== undefined && row[keys[index]] !== null && row[keys[index]] !== "") {
        return number(row[keys[index]]);
      }
    }
    return 0;
  }

  function getEaPlayerDisplayName(row, playerId) {
    return text(
      row.playername
      || row.playerName
      || row.personaName
      || row.persona
      || row.name
      || row.displayName
      || row.gamertag
      || row.psntag
      || playerId
    );
  }

  function normalizeEaSavePercent(value) {
    const svp = number(value);
    if (!svp) return 0;
    return svp > 1 ? svp / 100 : svp;
  }

  function parseMatchStatsSummary(summary, match) {
    const result = { playerStats: { away: [], home: [] }, goalieStats: { away: [], home: [] } };
    let currentTeam = "";
    text(summary).split("|").map(text).filter(Boolean).forEach(function (part) {
      const header = part.match(/^([^:]+):\s*(.*)$/);
      if (header && !isGoalieStatLabel(header[1])) {
        currentTeam = text(header[1]);
        part = text(header[2]);
        if (!part) return;
      }
      const side = getMatchStatSide(currentTeam, match);
      if (!side) return;
      const goalie = parseMatchGoalieStatLine(part, currentTeam);
      if (goalie) {
        result.goalieStats[side].push(goalie);
        return;
      }
      const player = parseMatchPlayerStatLine(part, currentTeam);
      if (player) result.playerStats[side].push(player);
    });
    return result;
  }

  function parseMatchPlayerStatLine(line, teamName) {
    const match = text(line).match(/^(.*?)\s+(-?\d+)G\s+(-?\d+)A\s+(-?\d+)PTS\s+(-?\d+)PIM$/i);
    if (!match) return null;
    return {
      name: text(match[1]),
      team: teamName,
      gp: 1,
      g: number(match[2]),
      a: number(match[3]),
      pts: number(match[4]),
      pim: number(match[5])
    };
  }

  function parseMatchGoalieStatLine(line, teamName) {
    const header = text(line).match(/^([^:]+):\s*(.*)$/);
    if (!header || !isGoalieStatLabel(header[1])) return null;
    const match = text(header[2]).match(/^(.*?)\s+(-|\d+)SA\s+(\d+)GA\s+(\d+)SV\s+(-|[.\d,]+)SV%$/i);
    if (!match) return null;
    const ga = number(match[3]);
    const sv = number(match[4]);
    const sa = match[2] === "-" ? ga + sv : number(match[2]);
    return finalizeGoalie({
      name: text(match[1]),
      team: teamName,
      gp: 1,
      sa: sa,
      ga: ga,
      sv: sv,
      svp: sa ? sv / sa : 0,
      gaa: ga,
      so: ga === 0 ? 1 : 0
    });
  }

  function isGoalieStatLabel(value) {
    const key = fold(value).replace(/[^a-z]/g, "");
    return key === "malvakt" || key === "goalie";
  }

  function getMatchStatSide(teamName, match) {
    const teamKey = fold(teamName);
    if (teamKey === fold(match.awayTeam)) return "away";
    if (teamKey === fold(match.homeTeam)) return "home";
    return "";
  }

  function parseMatchEvents(summary, matchData) {
    const lines = text(summary).split("|").map(text).filter(Boolean);
    const teamCodeMap = buildEventTeamCodeMap(lines, matchData);
    const events = lines.map(function (line) {
      const timed = splitMatchEventLine(line);
      const time = timed.time;
      const body = timed.body;
      const penalty = body.match(/^UTV\s+(.+?)\s+-\s+(.+?)(?:\s+([A-Za-zÃƒâ€¦Ãƒâ€žÃƒâ€“ÃƒÂ¥ÃƒÂ¤ÃƒÂ¶ -]+))?\s+(\d+)\s+min$/i);
      if (penalty) {
        return {
          type: "penalty",
          time: time,
          team: resolveEventTeamName(penalty[1], matchData, teamCodeMap),
          player: text(penalty[2]),
          penalty: text(penalty[3] || ""),
          pim: number(penalty[4]),
          body: body
        };
      }
      const goal = body.match(/^(.+?)\s+-\s+(.+)$/);
      if (goal) {
        let detail = text(goal[2]);
        const tags = [];
        detail = detail.replace(/\s*\((GWG|PP|SH|EN)\)\s*/gi, function (_whole, tag) {
          tags.push(text(tag).toUpperCase());
          return " ";
        }).replace(/\s+(PP|SH|EN)\b/gi, function (_whole, tag) {
          tags.push(text(tag).toUpperCase());
          return " ";
        });
        const assistsMatch = text(detail).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
        let player = text(detail);
        let assists = [];
        if (assistsMatch) {
          player = text(assistsMatch[1]);
          assists = assistsMatch[2].split(",").map(text).filter(Boolean);
        }
        return {
          type: "goal",
          time: time,
          team: resolveEventTeamName(goal[1], matchData, teamCodeMap),
          player: text(player.replace(/\s*\([^)]*\)\s*$/, "")),
          assists: assists,
          tags: tags,
          body: body
        };
      }
      return { type: "info", time: time, team: "", player: "", assists: [], tags: [], body: body };
    });
    events.forEach(function (event) {
      if (event.type !== "penalty") return;
      const detail = text(event.body)
        .replace(/^UTV\s+.+?\s+-\s+/i, "")
        .replace(/\s+\d+\s+min$/i, "");
      const side = getMatchStatSide(event.team, matchData || {});
      const rows = side && matchData && matchData.playerStats ? matchData.playerStats[side] || [] : [];
      const names = rows.map(function (row) {
        return text(row.name || row.player || row.displayName).replace(/,\s*[A-Z]{3}$/i, "");
      }).filter(Boolean).sort(function (left, right) { return right.length - left.length; });
      const player = names.find(function (name) {
        return fold(detail) === fold(name) || fold(detail).startsWith(fold(name) + " ");
      });
      if (!player) return;
      event.player = player;
      event.penalty = text(detail.slice(player.length));
    });
    return events;
  }

  function splitMatchEventLine(line) {
    const match = text(line).match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/);
    if (!match) return { time: "", body: text(line) };
    const parts = match[1].split(":").map(number);
    const time = parts.length === 3
      ? (parts[0] * 60 + parts[1]) + ":" + String(parts[2]).padStart(2, "0")
      : parts[0] + ":" + String(parts[1]).padStart(2, "0");
    return { time: time, body: text(match[2]) };
  }

  function reconcileMatchPlayerStats(match, currentStats, events) {
    if (!hasMatchStats(currentStats)) return currentStats;
    const awayScore = nullableNumber(match.awayScore);
    const homeScore = nullableNumber(match.homeScore);
    if (awayScore === null || homeScore === null) return currentStats;

    const goals = (events || []).filter(function (event) { return event.type === "goal"; });
    const goalSides = goals.map(function (event) { return getMatchStatSide(event.team, match); });
    const awayGoals = goalSides.filter(function (side) { return side === "away"; }).length;
    const homeGoals = goalSides.filter(function (side) { return side === "home"; }).length;
    if (goals.length !== awayScore + homeScore
      || goalSides.some(function (side) { return !side; })
      || awayGoals !== awayScore
      || homeGoals !== homeScore) {
      return currentStats;
    }

    const corrected = {
      away: (currentStats.away || []).map(resetMatchPlayerStats),
      home: (currentStats.home || []).map(resetMatchPlayerStats)
    };
    const rowMaps = {
      away: buildMatchPlayerRowMap(corrected.away),
      home: buildMatchPlayerRowMap(corrected.home)
    };

    function getRow(side, playerName) {
      const name = text(playerName);
      const key = getMatchPlayerKey(name);
      if (!side || !key) return null;
      if (!rowMaps[side].has(key)) {
        const row = { name: name, team: side === "away" ? match.awayTeam : match.homeTeam, gp: 1, g: 0, a: 0, pts: 0, pim: 0, playerId: "" };
        corrected[side].push(row);
        rowMaps[side].set(key, row);
      }
      return rowMaps[side].get(key);
    }

    goals.forEach(function (event) {
      const side = getMatchStatSide(event.team, match);
      const scorer = getRow(side, event.player);
      if (scorer) scorer.g += 1;
      (event.assists || []).forEach(function (assist) {
        const player = getRow(side, assist);
        if (player) player.a += 1;
      });
    });
    (events || []).filter(function (event) { return event.type === "penalty"; }).forEach(function (event) {
      const side = getMatchStatSide(event.team, match);
      const player = getRow(side, event.player);
      if (player) player.pim += number(event.pim);
    });
    corrected.away.concat(corrected.home).forEach(function (row) { row.pts = row.g + row.a; });
    return corrected;
  }

  function resetMatchPlayerStats(row) {
    return Object.assign({}, row, { g: 0, a: 0, pts: 0, pim: 0 });
  }

  function buildMatchPlayerRowMap(rows) {
    const map = new Map();
    (rows || []).forEach(function (row) { map.set(getMatchPlayerKey(row.name), row); });
    return map;
  }

  function getMatchPlayerKey(value) {
    return fold(text(value).replace(/,\s*[A-Z]{3}$/i, ""));
  }

  function buildFallbackMatchEvents(match, playerStats) {
    if (!isPlayedMatch(match)) return [];
    if (isWalkoverMatch(match)) {
      return [{
        type: "info",
        time: match.time || "",
        team: "",
        player: "",
        assists: [],
        tags: [],
        body: "Walkover"
      }];
    }

    const events = [];
    [
      { side: "away", team: match.awayTeam, score: nullableNumber(match.awayScore), rows: playerStats.away || [] },
      { side: "home", team: match.homeTeam, score: nullableNumber(match.homeScore), rows: playerStats.home || [] }
    ].forEach(function (side) {
      const goals = buildFallbackGoalsForTeam(match, side);
      goals.forEach(function (goal, index) {
        events.push(Object.assign(goal, {
          time: seededMatchTime(match, side.team + "|goal|" + index + "|" + goal.player, match.overtime)
        }));
      });
      buildFallbackPenaltiesForTeam(match, side).forEach(function (penalty, index) {
        events.push(Object.assign(penalty, {
          time: seededMatchTime(match, side.team + "|penalty|" + index + "|" + penalty.player, match.overtime)
        }));
      });
    });

    return events.sort(function (a, b) {
      return timeToSeconds(a.time) - timeToSeconds(b.time) || a.type.localeCompare(b.type);
    });
  }

  function buildFallbackGoalsForTeam(match, side) {
    const targetGoals = side.score === null ? sumMatchRows(side.rows, "g") : side.score;
    if (!targetGoals) return [];

    const scorers = [];
    side.rows.forEach(function (row) {
      for (let index = 0; index < number(row.g); index += 1) {
        scorers.push(getPersonDisplayName(row.name));
      }
    });
    while (scorers.length < targetGoals) scorers.push("OkÃƒÆ’Ã‚Â¤nd mÃƒÆ’Ã‚Â¥lskytt");

    const assists = [];
    side.rows.forEach(function (row) {
      for (let index = 0; index < number(row.a); index += 1) {
        assists.push(getPersonDisplayName(row.name));
      }
    });

    return scorers.slice(0, targetGoals).map(function (scorer, goalIndex) {
      return {
        type: "goal",
        team: side.team,
        player: scorer,
        assists: takeFallbackAssists(match, assists, scorer, side.team + "|" + goalIndex),
        tags: [],
        body: ""
      };
    });
  }

  function buildFallbackPenaltiesForTeam(match, side) {
    const penalties = [];
    side.rows.forEach(function (row) {
      let minutes = Math.max(0, number(row.pim));
      let index = 0;
      while (minutes >= 2) {
        penalties.push({
          type: "penalty",
          team: side.team,
          player: getPersonDisplayName(row.name),
          penalty: "Utvisning",
          pim: 2,
          assists: [],
          tags: [],
          body: ""
        });
        minutes -= 2;
        index += 1;
        if (index > 6) break;
      }
    });
    return penalties;
  }

  function takeFallbackAssists(match, assists, scorer, seed) {
    const picked = [];
    for (let index = 0; index < 2 && assists.length; index += 1) {
      const candidates = assists
        .map(function (name, assistIndex) { return { name: name, index: assistIndex }; })
        .filter(function (entry) { return entry.name !== scorer && !picked.includes(entry.name); });
      if (!candidates.length) break;
      const choice = candidates[seededNumber(match.id + "|" + seed + "|" + index, candidates.length)];
      picked.push(choice.name);
      assists.splice(choice.index, 1);
    }
    return picked;
  }

  function seededMatchTime(match, salt, overtime) {
    const maxSeconds = overtime ? 75 * 60 : 60 * 60;
    const seconds = 20 + seededNumber(match.id + "|" + salt, Math.max(1, maxSeconds - 40));
    return formatMatchClock(seconds);
  }

  function seededNumber(seed, modulo) {
    let hash = 2166136261;
    text(seed).split("").forEach(function (char) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });
    return Math.abs(hash >>> 0) % modulo;
  }

  function formatMatchClock(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ":" + String(seconds).padStart(2, "0");
  }

  function timeToSeconds(value) {
    const match = text(value).match(/^(\d+):(\d{2})$/);
    return match ? number(match[1]) * 60 + number(match[2]) : 999999;
  }

  function buildEventTeamCodeMap(lines, matchData) {
    const map = new Map();
    if (!matchData) return map;
    const away = text(matchData.awayTeam);
    const home = text(matchData.homeTeam);
    addEventTeamAliases(map, away);
    addEventTeamAliases(map, home);

    const goalCounts = new Map();
    lines.forEach(function (line) {
      const body = splitMatchEventLine(line).body;
      if (/^UTV\s+/i.test(body)) return;
      const goal = body.match(/^(.+?)\s+-\s+(.+)$/);
      if (!goal) return;
      const key = getEventTeamKey(goal[1]);
      if (!key) return;
      goalCounts.set(key, (goalCounts.get(key) || 0) + 1);
    });

    const entries = Array.from(goalCounts.entries());
    const awayScore = nullableNumber(matchData.awayScore);
    const homeScore = nullableNumber(matchData.homeScore);
    if (awayScore !== null && homeScore !== null) {
      if (entries.length === 1) {
        const only = entries[0];
        if (only[1] === awayScore && homeScore === 0) map.set(only[0], away);
        if (only[1] === homeScore && awayScore === 0) map.set(only[0], home);
      } else if (entries.length === 2 && awayScore !== homeScore) {
        const first = entries[0];
        const second = entries[1];
        if (first[1] === awayScore && second[1] === homeScore) {
          map.set(first[0], away);
          map.set(second[0], home);
        } else if (first[1] === homeScore && second[1] === awayScore) {
          map.set(first[0], home);
          map.set(second[0], away);
        }
      }
    }
    return map;
  }

  function addEventTeamAliases(map, teamName) {
    const team = text(teamName);
    if (!team) return;
    getEventTeamAliases(team).forEach(function (alias) {
      if (alias && !map.has(alias)) map.set(alias, team);
    });
  }

  function getEventTeamAliases(teamName) {
    const clean = text(teamName);
    const words = removeDiacritics(clean).split(/[^A-Za-z0-9]+/).filter(Boolean);
    const aliases = new Set([
      getEventTeamKey(clean),
      normalizeLogoKey(clean)
    ]);
    if (words.length) aliases.add(words[0].slice(0, 3).toLowerCase());
    if (words.length > 1) {
      aliases.add(words.map(function (word) { return word[0]; }).join("").toLowerCase());
      aliases.add((words[0].slice(0, 2) + words[1][0]).toLowerCase());
      aliases.add((words[0][0] + words[1].slice(0, 2)).toLowerCase());
    }
    return Array.from(aliases);
  }

  function resolveEventTeamName(value, matchData, teamCodeMap) {
    const raw = text(value);
    const key = getEventTeamKey(raw);
    if (!raw || !matchData) return raw;
    if (isSameTeamName(raw, matchData.awayTeam)) return text(matchData.awayTeam);
    if (isSameTeamName(raw, matchData.homeTeam)) return text(matchData.homeTeam);
    return teamCodeMap.get(key) || raw;
  }

  function getEventTeamKey(value) {
    return fold(value).replace(/[^a-z0-9]/g, "");
  }

  function getMatchShots(match, goalieStats) {
    if (match.awayShots !== null || match.homeShots !== null) {
      return { away: match.awayShots, home: match.homeShots };
    }
    const awayGoalieSa = sumMatchRows(goalieStats.away, "sa");
    const homeGoalieSa = sumMatchRows(goalieStats.home, "sa");
    if (!awayGoalieSa && !homeGoalieSa) return null;
    return { away: homeGoalieSa, home: awayGoalieSa };
  }

  function sumMatchRows(rows, key) {
    return (rows || []).reduce(function (sum, row) {
      return sum + number(row[key]);
    }, 0);
  }

  function formatMatchValue(value) {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  }

  function renderTeams() {
    return `
      <p class="viewIntro">Alla lag samlade som scanbara brickor. Klicka ett lag fÃƒÂ¶r snabb historik.</p>
      <section class="teamGrid">
        ${state.teams.slice(0, 240).map(function (team) {
          return `
            <a class="teamTile" href="${getTeamHref(team.name)}">
              ${renderTeamLogo(team.name, "teamLogoTile")}
              <strong>${escapeHtml(team.name)}</strong>
              <em>${team.matches} matcher Ã‚Â· ${team.wins} vinster</em>
            </a>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderTeamDetail(model, team, cup) {
    if (!team) return `<section class="emptyPage">Laget hittades inte.</section>`;
    return renderTeamDetailModern(model, team, cup);
    const matches = model.allMatches.filter(function (entry) {
      return entry.match.awayTeam === team.name || entry.match.homeTeam === team.name;
    }).slice(0, 16);
    const roster = buildTeamRoster(team.name);
    const cupRows = buildTeamCupRows(team.name);
    return `
      <section class="detailHero">
        <a href="#/teams">Tillbaka till lag</a>
        ${renderTeamLogo(team.name, "teamLogoHero")}
        <h2>${escapeHtml(team.name)}</h2>
        <p>${team.cups} cuper, ${team.matches} matcher, ${team.wins} vinster och ${team.goalsFor} mÃƒÂ¥l framÃƒÂ¥t.</p>
      </section>
      <section class="metricGrid compact">
        ${metric("Cuper", team.cups, "deltaganden")}
        ${metric("Matcher", team.matches, "totalt")}
        ${metric("Vinster", team.wins, "registrerade")}
        ${metric("MÃƒÂ¥l", team.goalsFor, "gjorda")}
      </section>
      <section class="sportGrid">
        ${panel("Lagets SEC-sÃƒÂ¤songer", renderTeamCupTable(cupRows))}
        ${panel("Profiler i laget", renderLeaderRows(roster.slice(0, 12)))}
        ${panel("MÃƒÂ¥lvakter i laget", renderGoalieRows(buildTeamGoalies(team.name).slice(0, 8)))}
      </section>
      ${panel("Senaste matcher", renderMatchRows(matches, 16))}
    `;
  }

  function renderTeamDetailModern(model, team, cup) {
    const scopedMatches = (cup ? cup.matches.map(function (match) { return { cup: cup, match: match }; }) : model.allMatches)
      .filter(function (entry) {
        return isSameTeamName(entry.match.awayTeam, team.name) || isSameTeamName(entry.match.homeTeam, team.name);
      })
      .sort(function (a, b) { return compareMatches(a.match, b.match); });
    const playerRows = getTeamPlayerRows(team.name, cup);
    const goalieRows = getTeamGoalieRows(team.name, cup);
    const rosterRows = getTeamRosterRows(team.name, cup);
    const roster = buildTeamRosterRows(playerRows, goalieRows, rosterRows);
    const goalsFor = scopedMatches.reduce(function (sum, entry) {
      return sum + number(isSameTeamName(entry.match.awayTeam, team.name) ? entry.match.awayScore : entry.match.homeScore);
    }, 0);
    const goalsAgainst = scopedMatches.reduce(function (sum, entry) {
      return sum + number(isSameTeamName(entry.match.awayTeam, team.name) ? entry.match.homeScore : entry.match.awayScore);
    }, 0);
    const wins = scopedMatches.filter(function (entry) {
      const gf = number(isSameTeamName(entry.match.awayTeam, team.name) ? entry.match.awayScore : entry.match.homeScore);
      const ga = number(isSameTeamName(entry.match.awayTeam, team.name) ? entry.match.homeScore : entry.match.awayScore);
      return gf > ga;
    }).length;
    const base = getTeamHref(team.name, cup?.id);
    const activeTab = state.activeTeamTab;
    const crumbCup = cup || getLatestTeamCup(team.name);
    return `
      <section class="detailHero teamDetailHero">
        ${renderTeamBreadcrumb(team.name, crumbCup)}
        <div class="teamHeroMain">
          ${renderTeamLogo(team.name, "teamLogoHero teamHeroLogoLarge")}
          <div>
            <h2>${escapeHtml(team.name)}</h2>
            <p>${cup ? "Spelare och matcher fr\u00e5n just den h\u00e4r cupen." : `${scopedMatches.length} matcher, ${wins} vinster och ${goalsFor}-${goalsAgainst} i m\u00e5l.`}</p>
            ${renderTeamHeroStats(cup, team, scopedMatches.length, wins, goalsFor, goalsAgainst)}
          </div>
        </div>
      </section>
      <section class="metricGrid compact teamLegacyMetrics">
        ${metric(cup ? "Cup" : "Cuper", cup ? cup.code : String(team.cups || 0), cup ? "vald turnering" : "deltaganden")}
        ${metric("Matcher", scopedMatches.length, "totalt")}
        ${metric("Vinster", wins, "registrerade")}
        ${metric("MÃƒÂ¥l", goalsFor, "gjorda")}
      </section>
      ${renderTeamTabs(base, activeTab)}
      <section class="fullPagePanel teamTabPanel">
        ${activeTab === "matches" ? renderTeamAllMatches(scopedMatches, team.name) : ""}
        ${activeTab === "stats" ? renderTeamCurrentStats(team.name, cup, base, state.activeTeamStatsMode) : ""}
        ${activeTab === "history" ? renderTeamHistoricalStats(team.name, base, state.activeTeamHistoryMode) : ""}
        ${activeTab === "roster" ? renderTeamRosterPanel(team.name, roster) : ""}
      </section>
    `;
  }

  function renderTeamHeroStats(cup, team, matches, wins, goalsFor, goalsAgainst) {
    const stats = [
      { label: cup ? "Cup" : "Cuper", value: cup ? cup.code : String(team.cups || 0) },
      { label: "Matcher", value: matches },
      { label: "Vinster", value: wins },
      { label: "M\u00e5l", value: goalsFor + "-" + goalsAgainst }
    ];
    return `
      <div class="profileHeroStats teamHeroStats" aria-label="Lagstatistik">
        ${stats.map(function (stat) {
          return `<span><b>${escapeHtml(stat.value)}</b><em>${escapeHtml(stat.label)}</em></span>`;
        }).join("")}
      </div>
    `;
  }

  function renderTeamBreadcrumb(teamName, cup) {
    return `
      <nav class="crumbs profileCrumbs" aria-label="Br\u00f6dsmulor">
        <a href="#/cups">Start</a>
        ${cup ? `<span>/</span> <a href="#/cups/${encodeURIComponent(cup.id)}">${escapeHtml(cup.code)}</a>` : ""}
        <span>/</span>
        <strong>${escapeHtml(teamName)}</strong>
      </nav>
    `;
  }

  function getLatestTeamCup(teamName) {
    return state.cups.find(function (cup) {
      return cup.matches.some(function (match) {
        return isSameTeamName(match.awayTeam, teamName) || isSameTeamName(match.homeTeam, teamName);
      }) || cup.playerRows.some(function (row) {
        return isSameTeamName(row.team, teamName);
      }) || cup.goalieRows.some(function (row) {
        return isSameTeamName(row.team, teamName);
      });
    }) || null;
  }

  function renderTeamTabs(base, activeTab) {
    const tabs = [
      ["roster", "LaguppstÃƒÂ¤llning"],
      ["matches", "Alla matcher"],
      ["stats", "Statistik"],
      ["history", "Historisk statistik"]
    ];
    return `
      <nav class="subTabs teamTabs" aria-label="Lagflikar">
        ${tabs.map(function (tab) {
          return `<a class="${activeTab === tab[0] ? "active" : ""}" href="${base}${tab[0] === "roster" ? "" : "?tab=" + tab[0]}">${escapeHtml(tab[1])}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderTeamRosterPanel(teamName, roster, title) {
    return `
      <div class="panelHead"><h3>LaguppstÃƒÂ¤llning</h3></div>
      <div class="teamRosterGrid">
        ${roster.length ? roster.map(renderTeamRosterCard).join("") : `<div class="empty">Inga spelare hittades fÃƒÂ¶r ${escapeHtml(teamName)}.</div>`}
      </div>
    `;
  }

  function renderTeamRosterCard(row) {
    const isGoalieOnly = fold(row.role).includes("malvakt") && !row.gp;
    const href = isGoalieOnly ? getPersonHref("goalies", row.name) : getPersonHref("players", row.name);
    const statLine = [
      row.gp ? row.gp + " GP" : "",
      row.pts ? row.pts + " PTS" : "",
      row.goalieGp ? row.goalieGp + " GP mÃƒÂ¥lvakt" : "",
      row.sa ? formatPercent(row.svp) + " SV%" : ""
    ].filter(Boolean).join(" Ã‚Â· ");
    return `
      <a class="teamRosterCard" href="${href}">
        ${renderPlayerPortrait(row, "previewPortrait")}
        <span>
          <strong>${renderPersonName(row.name)}</strong>
          <em>${escapeHtml(row.role)}</em>
          <b>${escapeHtml(statLine || "Registrerad")}</b>
        </span>
      </a>
    `;
  }

  function renderTeamAllMatches(entries, teamName) {
    return `
      <div class="panelHead"><h3>Alla matcher</h3></div>
      ${renderTeamMatchRows(entries, teamName, entries.length)}
    `;
  }

  function renderTeamCurrentStats(teamName, cup, base, mode) {
    const requestedMode = normalizeStatsMode(mode);
    const activeMode = requestedMode === "playin" && !supportsPlayInGroup(cup) ? "all" : requestedMode;
    const playerRows = getTeamStatsPlayerRows(teamName, cup, activeMode);
    const goalieRows = getTeamStatsGoalieRows(teamName, cup, activeMode);
    const suffix = activeMode === "all" ? "All statistik" : formatStageLabel(activeMode);
    return `
      ${renderTeamStatsModeTabs(base, activeMode, supportsPlayInGroup(cup) && hasTeamStageStats(teamName, cup, "playin"))}
      <div class="teamStatsGrid">
        ${panel("Utespelare - " + suffix, renderCupPlayerStatsTable(playerRows, { hideTeam: true }))}
        ${panel("M\u00e5lvakter - " + suffix, renderCupGoalieStatsTable(goalieRows, { hideTeam: true }))}
      </div>
    `;
  }

  function renderTeamStatsModeTabs(base, activeMode, hasPlayIn) {
    const modes = [
      ["all", "Allt"],
      ["group", "Gruppspel"]
    ];
    if (hasPlayIn) modes.push(["playin", "Play in"]);
    modes.push(["playoffs", "Slutspel"]);
    return `
      <nav class="subTabs statsModeTabs teamStatsModeTabs" aria-label="Statistikdel">
        ${modes.map(function (mode) {
          const href = base + "?tab=stats" + (mode[0] === "all" ? "" : "&mode=" + mode[0]);
          return `<a class="${activeMode === mode[0] ? "active" : ""}" href="${href}">${escapeHtml(mode[1])}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderTeamHistoricalStats(teamName, base, mode) {
    const activeMode = normalizeStatsMode(mode);
    const playerRows = getTeamStatsPlayerRows(teamName, null, activeMode);
    const goalieRows = getTeamStatsGoalieRows(teamName, null, activeMode);
    const allPlayerRows = getTeamPlayerRows(teamName, null);
    const allGoalieRows = getTeamGoalieRows(teamName, null);
    const allRosterRows = getTeamRosterRows(teamName, null);
    const cupRows = buildTeamCupRows(teamName);
    const roster = buildTeamRosterRows(allPlayerRows, allGoalieRows, allRosterRows);
    return `
      ${renderTeamHistorySummary(teamName, cupRows, allPlayerRows, allGoalieRows)}
      ${renderTeamHistoryPeople(teamName, roster)}
      ${renderTeamHistoryModeTabs(base, activeMode, hasTeamStageStats(teamName, null, "playin"))}
      <div class="teamStatsGrid teamHistoryTables">
        ${panel("All-time utespelare", renderTeamAllTimePlayerTable(playerRows))}
        ${panel("All-time m\u00e5lvakter", renderTeamAllTimeGoalieTable(goalieRows))}
      </div>
    `;
  }

  function renderTeamHistorySummary(teamName, cupRows, playerRows, goalieRows) {
    const summary = buildTeamHistorySummary(teamName, cupRows);
    return `
      <section class="teamHistoryOverview">
        <span class="eyebrow">Lagets historik</span>
        <h3>${escapeHtml(teamName)} i SEC</h3>
        <div class="teamHistoryOverviewGrid">
          <article class="teamHistoryIntro">
            <h4>Cuper och resultat</h4>
            <p>Laget har deltagit i <strong>${summary.cups}</strong> cuper: ${summary.cupLinks || "<strong>inga registrerade</strong>"}.</p>
            <p>${summary.titleText}</p>
            <p>${summary.matches} matcher, ${summary.wins} vinster och ${summary.goalsFor}-${summary.goalsAgainst} i m\u00e5lskillnad.</p>
          </article>
          ${renderTeamHistoryTopList("B\u00e4sta utespelare", playerRows.slice().sort(sortPlayers).slice(0, 3), "player")}
          ${renderTeamHistoryTopList("B\u00e4sta m\u00e5lvakter", goalieRows.slice().sort(sortGoalies).slice(0, 3), "goalie")}
        </div>
      </section>
    `;
  }

  function buildTeamHistorySummary(teamName, cupRows) {
    const cupLinks = cupRows.map(function (row) {
      return `<a href="#/cups/${encodeURIComponent(row.cup.id)}">${escapeHtml(row.cup.code)}</a>`;
    }).join(", ");
    const titles = cupRows.filter(function (row) {
      return fold(row.cup.winner) === fold(teamName);
    }).map(function (row) {
      return `<a href="#/cups/${encodeURIComponent(row.cup.id)}">${escapeHtml(row.cup.code)}</a>`;
    });
    const runnerUps = cupRows.filter(function (row) {
      return fold(row.cup.runnerUp) === fold(teamName);
    }).map(function (row) {
      return `<a href="#/cups/${encodeURIComponent(row.cup.id)}">${escapeHtml(row.cup.code)}</a>`;
    });
    const titleText = titles.length
      ? "M\u00e4stare i " + titles.map(function (link) { return `<strong>${link}</strong>`; }).join(", ") + "."
      : (runnerUps.length ? "Finalist i " + runnerUps.map(function (link) { return `<strong>${link}</strong>`; }).join(", ") + "." : "Ingen titel registrerad \u00e4n.");
    return {
      cups: cupRows.length,
      cupCodes: cupRows.map(function (row) { return row.cup.code; }).join(", "),
      cupLinks: cupLinks,
      matches: cupRows.reduce(function (sum, row) { return sum + row.matches; }, 0),
      wins: cupRows.reduce(function (sum, row) { return sum + row.wins; }, 0),
      goalsFor: cupRows.reduce(function (sum, row) { return sum + row.goalsFor; }, 0),
      goalsAgainst: cupRows.reduce(function (sum, row) { return sum + row.goalsAgainst; }, 0),
      titleText: titleText
    };
  }

  function renderTeamHistoryTopList(title, rows, type) {
    return `
      <article class="teamHistoryTop">
        <h4>${escapeHtml(title)}</h4>
        <div>
          ${rows.length ? rows.map(function (row) {
            const meta = type === "goalie"
              ? `${row.gp} GP \u00b7 ${formatPercent(row.svp)} SV% \u00b7 ${row.sv} SV`
              : `${row.gp} GP \u00b7 ${row.g} G \u00b7 ${row.a} A`;
            const value = type === "goalie" ? `${row.gp} GP` : `${row.pts} PTS`;
            const href = type === "goalie" ? getPersonHref("goalies", row.name) : getPersonHref("players", row.name);
            return `
              <a class="teamHistoryTopRow" href="${href}">
                <strong>${renderPersonName(row.name)}</strong>
                <b>${escapeHtml(value)}</b>
                <em>${escapeHtml(meta)}</em>
              </a>
            `;
          }).join("") : `<span class="empty">Ingen statistik hittades.</span>`}
        </div>
      </article>
    `;
  }

  function renderTeamHistoryPeople(teamName, roster) {
    return `
      <section class="teamHistoryPeople">
        <span class="eyebrow">Historik</span>
        <h3>Alla spelare som spelat eller varit registrerade i ${escapeHtml(teamName)}</h3>
        <div class="teamHistoryPeopleGrid">
          ${roster.length ? roster.map(renderTeamHistoryPersonCard).join("") : `<div class="empty">Inga spelare hittades f\u00f6r ${escapeHtml(teamName)}.</div>`}
        </div>
      </section>
    `;
  }

  function renderTeamHistoryPersonCard(row) {
    const isGoalieOnly = fold(row.role).includes("malvakt") && !row.gp;
    const href = isGoalieOnly ? getPersonHref("goalies", row.name) : getPersonHref("players", row.name);
    const skater = row.gp ? `GP ${row.gp} PTS ${row.pts}` : "";
    const goalie = row.goalieGp ? `G ${row.goalieGp} SV% ${formatPercent(row.svp)}` : "";
    return `
      <a class="teamHistoryPersonCard" href="${href}">
        ${renderPlayerPortrait(row, "previewPortrait")}
        <span>
          <strong>${renderPersonName(row.name)}</strong>
          <em>${escapeHtml(row.role)}</em>
          <b>${escapeHtml([skater, goalie].filter(Boolean).join(" \u00b7 ") || "Registrerad")}</b>
        </span>
      </a>
    `;
  }

  function renderTeamHistoryModeTabs(base, activeMode, hasPlayIn) {
    const modes = [
      ["all", "Total"],
      ["group", "Gruppspel"]
    ];
    if (hasPlayIn) modes.push(["playin", "Play in"]);
    modes.push(["playoffs", "Slutspel"]);
    return `
      <nav class="subTabs teamHistoryModeTabs" aria-label="Historikdel">
        ${modes.map(function (mode) {
          const href = base + "?tab=history" + (mode[0] === "all" ? "" : "&mode=" + mode[0]);
          return `<a class="${activeMode === mode[0] ? "active" : ""}" href="${href}">${escapeHtml(mode[1])}</a>`;
        }).join("")}
      </nav>
    `;
  }

  function renderTeamAllTimePlayerTable(rows) {
    const sorted = rows.slice().sort(sortPlayers);
    if (!sorted.length) return `<div class="empty">Ingen utespelarstatistik hittades.</div>`;
    return `
      <div class="dataTable teamAllTimeTable">
        <table class="sortableStanding">
          <thead><tr>
            ${renderSortHead("name", "Spelare", "text")}
            ${renderSortHead("gp", "GP")}
            ${renderSortHead("g", "G")}
            ${renderSortHead("a", "A")}
            ${renderSortHead("pts", "PTS")}
            ${renderSortHead("pim", "PIM")}
          </tr></thead>
          <tbody>
            ${sorted.map(function (row) {
              return `<tr data-name="${escapeHtml(getPersonDisplayName(row.name))}" data-gp="${row.gp}" data-g="${row.g}" data-a="${row.a}" data-pts="${row.pts}" data-pim="${row.pim}"><td><a href="${getPersonHref("players", row.name)}">${renderPersonName(row.name)}</a></td><td>${row.gp}</td><td>${row.g}</td><td>${row.a}</td><td><strong>${row.pts}</strong></td><td>${row.pim}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTeamAllTimeGoalieTable(rows) {
    const sorted = rows.slice().sort(sortGoalies);
    if (!sorted.length) return `<div class="empty">Ingen m\u00e5lvaktsstatistik hittades.</div>`;
    return `
      <div class="dataTable teamAllTimeTable">
        <table class="sortableStanding">
          <thead><tr>
            ${renderSortHead("name", "M\u00e5lvakt", "text")}
            ${renderSortHead("gp", "GP")}
            ${renderSortHead("sa", "SA")}
            ${renderSortHead("ga", "GA")}
            ${renderSortHead("sv", "SV")}
            ${renderSortHead("svp", "SV%")}
            ${renderSortHead("gaa", "GAA")}
            ${renderSortHead("so", "SO")}
          </tr></thead>
          <tbody>
            ${sorted.map(function (row) {
              return `<tr data-name="${escapeHtml(getPersonDisplayName(row.name))}" data-gp="${row.gp}" data-sa="${row.sa}" data-ga="${row.ga}" data-sv="${row.sv}" data-svp="${formatPercent(row.svp)}" data-gaa="${formatDecimal(row.gaa)}" data-so="${row.so}"><td><a href="${getPersonHref("goalies", row.name)}">${renderPersonName(row.name)}</a></td><td>${row.gp}</td><td>${row.sa}</td><td>${row.ga}</td><td>${row.sv}</td><td><strong>${formatPercent(row.svp)}</strong></td><td>${formatDecimal(row.gaa)}</td><td>${row.so}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSortHead(key, label, type) {
    return `<th><button type="button" data-standing-sort="${key}" data-sort-type="${type || "number"}">${escapeHtml(label)}</button></th>`;
  }

  function getTeamPlayerRows(teamName, cup) {
    const rows = (cup ? cup.playerRows : state.cups.flatMap(function (entry) { return entry.playerRows || []; }))
      .filter(function (row) { return isSameTeamName(row.team, teamName); });
    return aggregateTeamPlayerRows(rows);
  }

  function getTeamGoalieRows(teamName, cup) {
    const rows = (cup ? cup.goalieRows : state.cups.flatMap(function (entry) { return entry.goalieRows || []; }))
      .filter(function (row) { return isSameTeamName(row.team, teamName); });
    return aggregateTeamGoalieRows(rows);
  }

  function getTeamRosterRows(teamName, cup) {
    return (cup ? cup.rosterRows || [] : state.cups.flatMap(function (entry) { return entry.rosterRows || []; }))
      .filter(function (row) { return isSameTeamName(row.team, teamName); });
  }

  function getTeamStatsPlayerRows(teamName, cup, mode) {
    const activeMode = normalizeStatsMode(mode);
    if (activeMode === "all") return getTeamPlayerRows(teamName, cup);
    const rows = (cup ? getCupProfilePlayerRows(cup) : state.cups.flatMap(getCupProfilePlayerRows))
      .filter(function (row) {
        return isSameTeamName(row.team, teamName) && normalizeStage(row.stage) === activeMode;
      });
    return aggregateTeamPlayerRows(rows);
  }

  function getTeamStatsGoalieRows(teamName, cup, mode) {
    const activeMode = normalizeStatsMode(mode);
    if (activeMode === "all") return getTeamGoalieRows(teamName, cup);
    const rows = (cup ? getCupProfileGoalieRows(cup) : state.cups.flatMap(getCupProfileGoalieRows))
      .filter(function (row) {
        return isSameTeamName(row.team, teamName) && normalizeStage(row.stage) === activeMode;
      });
    return aggregateTeamGoalieRows(rows);
  }

  function hasTeamStageStats(teamName, cup, stage) {
    const playerRows = cup ? getCupProfilePlayerRows(cup) : state.cups.flatMap(getCupProfilePlayerRows);
    const goalieRows = cup ? getCupProfileGoalieRows(cup) : state.cups.flatMap(getCupProfileGoalieRows);
    return playerRows.concat(goalieRows).some(function (row) {
      return isSameTeamName(row.team, teamName) && normalizeStage(row.stage) === stage;
    });
  }

  function isSameTeamName(left, right) {
    return fold(left) === fold(right);
  }

  function aggregateTeamPlayerRows(rows) {
    const map = new Map();
    rows.forEach(function (row) {
      const key = getRosterPersonKey(row);
      if (!map.has(key)) {
        map.set(key, { name: row.name, team: row.team, playerId: row.playerId || "", gp: 0, g: 0, a: 0, pts: 0, pim: 0 });
      }
      const target = map.get(key);
      target.gp += number(row.gp);
      target.g += number(row.g);
      target.a += number(row.a);
      target.pts += number(row.pts);
      target.pim += number(row.pim);
    });
    return Array.from(map.values()).sort(sortPlayers);
  }

  function aggregateTeamGoalieRows(rows) {
    const map = new Map();
    rows.forEach(function (row) {
      const key = getRosterPersonKey(row);
      if (!map.has(key)) {
        map.set(key, { name: row.name, team: row.team, playerId: row.playerId || "", gp: 0, sa: 0, ga: 0, sv: 0, svp: 0, gaa: 0, so: 0 });
      }
      const target = map.get(key);
      target.gp += number(row.gp);
      target.sa += number(row.sa);
      target.ga += number(row.ga);
      target.sv += number(row.sv);
      target.so += number(row.so);
    });
    return Array.from(map.values()).map(finalizeGoalie).sort(sortGoalies);
  }

  function buildTeamRosterRows(playerRows, goalieRows, rosterRows) {
    const map = new Map();
    (rosterRows || []).forEach(function (row) {
      const key = getRosterPersonKey(row);
      if (!map.has(key)) {
        map.set(key, {
          name: row.name,
          team: row.team,
          playerId: row.playerId || "",
          gp: 0,
          g: 0,
          a: 0,
          pts: 0,
          pim: 0,
          role: row.role || "Registrerad",
          goalieGp: 0,
          sa: 0,
          sv: 0,
          ga: 0,
          svp: 0
        });
      }
    });
    playerRows.forEach(function (row) {
      const key = getRosterPersonKey(row);
      const existing = map.get(key) || {};
      map.set(key, Object.assign({}, existing, row, { role: "Utespelare", goalieGp: existing.goalieGp || 0, sa: existing.sa || 0, sv: existing.sv || 0, ga: existing.ga || 0, svp: existing.svp || 0 }));
    });
    goalieRows.forEach(function (row) {
      const key = getRosterPersonKey(row);
      if (!map.has(key)) {
        map.set(key, { name: row.name, team: row.team, gp: 0, g: 0, a: 0, pts: 0, pim: 0, role: "MÃƒÂ¥lvakt", goalieGp: row.gp, sa: row.sa, sv: row.sv, ga: row.ga, svp: row.svp });
      } else {
        const target = map.get(key);
        target.role = "Utespelare/MÃƒÂ¥lvakt";
        target.goalieGp = row.gp;
        target.sa = row.sa;
        target.sv = row.sv;
        target.ga = row.ga;
        target.svp = row.svp;
      }
    });
    return Array.from(map.values()).sort(function (a, b) {
      return number(b.pts) - number(a.pts) || number(b.goalieGp) - number(a.goalieGp) || a.name.localeCompare(b.name, "sv");
    });
  }

  function getRosterPersonKey(row) {
    const parsed = parsePersonCountry(row?.name || row?.player || "");
    return fold(parsed.name || row?.name || row?.player || "");
  }

  function renderPlayers() {
    return `
      <p class="viewIntro">En kompakt leaderboard ÃƒÂ¶ver spelare frÃƒÂ¥n all cupdata.</p>
      <section class="playerBoard">
        ${state.players.slice(0, 160).map(function (player, index) {
          return `
            <a class="playerRow" href="${getPersonHref("players", player.name)}">
              <span>${index + 1}</span>
              <strong>${renderPersonName(player.name)}</strong>
              <em>${escapeHtml(player.team || "OkÃƒÂ¤nt lag")}</em>
              <b>${player.pts}p</b>
            </a>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderGoalies() {
    return `
      <p class="viewIntro">RÃƒÂ¤ddningsprocent, rÃƒÂ¤ddningar, GAA och historik fÃƒÂ¶r mÃƒÂ¥lvakter frÃƒÂ¥n bÃƒÂ¥da datakÃƒÂ¤llorna.</p>
      <section class="playerBoard">
        ${state.goalies.slice(0, 160).map(function (goalie, index) {
          return `
            <a class="playerRow" href="${getPersonHref("goalies", goalie.name)}">
              <span>${index + 1}</span>
              <strong>${renderPersonName(goalie.name)}</strong>
              <em>${escapeHtml(goalie.team || "OkÃƒÂ¤nt lag")} Ã‚Â· ${goalie.gp} GP</em>
              <b>${formatPercent(goalie.svp)}</b>
            </a>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderPlayerDetail(model, player) {
    if (!player) return `<section class="emptyPage">Spelaren hittades inte.</section>`;
    return `
      <section class="detailHero">
        <a href="#/players">Tillbaka till spelare</a>
        <h2>${renderPersonName(player.name)}</h2>
        <p>${escapeHtml(player.team || "OkÃƒÂ¤nt lag")} Ã‚Â· ${player.cups.size} cuper Ã‚Â· ${player.gp} GP Ã‚Â· ${player.pts} poÃƒÂ¤ng.</p>
      </section>
      <section class="metricGrid compact">
        ${metric("PoÃƒÂ¤ng", player.pts, "totalt")}
        ${metric("MÃƒÂ¥l", player.g, "gjorda")}
        ${metric("Assist", player.a, "passningar")}
        ${metric("Matcher", player.gp, "GP")}
      </section>
      <section class="sportGrid">
        ${panel("Cuphistorik", renderPlayerCupTable(player))}
        ${panel("Lagresa", renderMiniTags(Array.from(player.teams), "teams"))}
      </section>
    `;
  }

  function renderGoalieDetail(model, goalie) {
    if (!goalie) return `<section class="emptyPage">MÃƒÂ¥lvakten hittades inte.</section>`;
    return `
      <section class="detailHero">
        <a href="#/goalies">Tillbaka till mÃƒÂ¥lvakter</a>
        <h2>${renderPersonName(goalie.name)}</h2>
        <p>${escapeHtml(goalie.team || "OkÃƒÂ¤nt lag")} Ã‚Â· ${goalie.cups.size} cuper Ã‚Â· ${goalie.gp} GP Ã‚Â· ${formatPercent(goalie.svp)} SV%.</p>
      </section>
      <section class="metricGrid compact">
        ${metric("SV%", formatPercent(goalie.svp), "rÃƒÂ¤ddningsprocent")}
        ${metric("GAA", formatDecimal(goalie.gaa), "mÃƒÂ¥l emot/match")}
        ${metric("SV", goalie.sv, "rÃƒÂ¤ddningar")}
        ${metric("SO", goalie.so, "hÃƒÂ¥llna nollor")}
      </section>
      <section class="sportGrid">
        ${panel("Cuphistorik", renderGoalieCupTable(goalie))}
        ${panel("Lagresa", renderMiniTags(Array.from(goalie.teams), "teams"))}
      </section>
    `;
  }

  function renderMatches(model) {
    return `
      <p class="viewIntro">Senaste registrerade matcher frÃƒÂ¥n hela datan, oavsett cup.</p>
      ${panel("Matcher", renderMatchRows(model.allMatches.slice(0, 90), 90))}
    `;
  }

  function renderAbout(model) {
    return `
      <section class="manifest">
        <span>SEC</span>
        <h2>Svenska eHockey Cupen</h2>
        <p>Sidan samlar aktuell cupdata, historik, matchflÃƒÂ¶de, tabeller, slutspel, lag, spelare och mÃƒÂ¥lvakter pÃƒÂ¥ ett stÃƒÂ¤lle.</p>
        <p>Senaste registrerade match: <strong>${model.latestMatches[0] ? escapeHtml(model.latestMatches[0].cup.code + " Ã‚Â· " + model.latestMatches[0].match.awayTeam + " - " + model.latestMatches[0].match.homeTeam + " " + score(model.latestMatches[0].match)) : "Ingen match hittad"}</strong>.</p>
      </section>
    `;
  }

  function metric(label, value, meta) {
    return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(meta)}</em></article>`;
  }

  function panel(title, body) {
    return `<section class="panel"><h3>${escapeHtml(title)}</h3>${body}</section>`;
  }

  function panelWithAction(title, actionLabel, href, body) {
    return `
      <section class="panel">
        <div class="panelHead">
          <h3>${escapeHtml(title)}</h3>
          <a href="${href}">${escapeHtml(actionLabel)}</a>
        </div>
        ${body}
      </section>
    `;
  }

  function panelWithTools(title, tools, body) {
    return `
      <section class="panel">
        <div class="panelHead panelHeadTools">
          <h3>${escapeHtml(title)}</h3>
          ${tools}
        </div>
        ${body}
      </section>
    `;
  }

  function renderMatchRows(entries, limit) {
    const rows = entries.slice(0, limit).map(function (entry) {
      return `
        <a class="matchRow" href="${getMatchUrl(entry.cup, entry.match)}">
          <span>${escapeHtml(entry.cup.code)}</span>
          <strong class="matchTeams">
            ${renderTeamIdentityStatic(entry.match.awayTeam, "teamLogoInline")}
            <b>${score(entry.match)}</b>
            ${renderTeamIdentityStatic(entry.match.homeTeam, "teamLogoInline")}
          </strong>
          <em>${escapeHtml(formatDate(entry.match.date))} Ã‚Â· ${escapeHtml(entry.match.group || entry.match.stage || "Match")}</em>
        </a>
      `;
    }).join("");
    return `<div class="matchList">${rows || `<div class="empty">Inga matcher hittades.</div>`}</div>`;
  }

  function renderTeamMatchRows(entries, teamName, limit) {
    const safeTeam = text(teamName);
    const groups = [];
    const byDate = {};
    entries.slice(0, limit).forEach(function (entry) {
      const key = entry.match.date || "Datum saknas";
      if (!byDate[key]) {
        byDate[key] = { label: formatDate(entry.match.date), rows: [] };
        groups.push(byDate[key]);
      }
      byDate[key].rows.push(entry);
    });
    if (!groups.length) return `<div class="empty">Inga matcher hittades.</div>`;
    return `
      <div class="teamMatchSchedule">
        ${groups.map(function (group) {
          return `
            <section class="teamMatchDay">
              <header class="teamMatchDayHead">
                <strong>${escapeHtml(group.label)}</strong>
                <span>${group.rows.length} ${group.rows.length === 1 ? "match" : "matcher"}</span>
              </header>
              <div class="teamMatchGrid">
                ${group.rows.map(function (entry) { return renderTeamMatchCard(entry, safeTeam); }).join("")}
              </div>
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTeamMatchCard(entry, teamName) {
    const match = entry.match;
    const isAway = match.awayTeam === teamName;
    const teamScore = number(isAway ? match.awayScore : match.homeScore);
    const opponentScore = number(isAway ? match.homeScore : match.awayScore);
    const won = teamScore > opponentScore;
    const walkover = isWalkoverMatch(match);
    return `
      <a class="matchRow teamMatchRow ${won ? "teamMatchWin" : "teamMatchLoss"} ${walkover ? "isWalkover" : ""}" href="${getMatchUrl(entry.cup, match)}">
        <span class="teamMatchStatus">${walkover ? "WO" : (won ? "V" : "X")}</span>
        <strong class="matchTeams">
          ${renderTeamIdentityStatic(match.awayTeam, "teamLogoInline")}
          <span class="teamMatchScore"><b>${score(match)}</b><em>${escapeHtml(getMatchContextLabel(match))}</em></span>
          ${renderTeamIdentityStatic(match.homeTeam, "teamLogoInline")}
        </strong>
      </a>
    `;
  }

  function renderCupMatchSchedule(entries) {
    if (!entries.length) return `<div class="empty">Inga matcher hittades.</div>`;
    const groups = [];
    const byDate = {};
    entries.forEach(function (entry) {
      const key = entry.match.date || "Datum saknas";
      if (!byDate[key]) {
        byDate[key] = {
          label: formatDate(entry.match.date),
          rows: []
        };
        groups.push(byDate[key]);
      }
      byDate[key].rows.push(entry);
    });
    return `
      <div class="matchSchedule">
        ${groups.map(function (group) {
          return `
            <section class="matchDay">
              <header class="matchDayHead">
                <span>Borta</span>
                <strong>${escapeHtml(group.label)}</strong>
                <span>Hemma</span>
              </header>
              <div class="matchDayRows">
                ${group.rows.map(function (entry) {
                  const label = getMatchContextLabel(entry.match);
                  return `
                    <a class="matchScheduleRow ${isWalkoverMatch(entry.match) ? "isWalkover" : ""}" href="${getMatchUrl(entry.cup, entry.match)}">
                      <div class="matchScheduleTeam away">${renderTeamIdentityStatic(entry.match.awayTeam, "teamLogoInline")}</div>
                      <div class="matchScheduleScore">
                        <b>${score(entry.match)}</b>
                        <span>${escapeHtml([entry.match.time, label].filter(Boolean).join(" · "))}</span>
                      </div>
                      <div class="matchScheduleTeam home">${renderTeamIdentityStatic(entry.match.homeTeam, "teamLogoInline")}</div>
                    </a>
                  `;
                }).join("")}
              </div>
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCupMatchPreview(entries) {
    const rows = entries.slice(0, 10).map(function (entry) {
      return `
        <a class="matchPreviewRow" href="${getMatchUrl(entry.cup, entry.match)}">
          ${renderTeamLogo(entry.match.awayTeam, "teamLogoInline")}
          <span>${escapeHtml(entry.match.awayTeam)}</span>
          <b>${score(entry.match)}</b>
          ${renderTeamLogo(entry.match.homeTeam, "teamLogoInline")}
          <span>${escapeHtml(entry.match.homeTeam)}</span>
          <em>${escapeHtml(entry.match.group || entry.match.stage || "Match")}</em>
        </a>
      `;
    }).join("");
    return `<div class="matchPreviewList">${rows || `<div class="empty">Inga matcher hittades.</div>`}</div>`;
  }

  function getMatchUrl(cup, match) {
    return "#/match/" + encodeURIComponent(cup.id) + "/" + encodeURIComponent(match.id);
  }

  function renderLeaderRows(players) {
    return `
      <div class="leaderList">
        ${players.map(function (player, index) {
          return `
            <a class="leader" href="${getPersonHref("players", player.name)}">
              <span>${index + 1}</span>
              <strong>${renderPersonName(player.name)}</strong>
              <em>${escapeHtml(player.team || "OkÃƒÂ¤nt lag")}</em>
              <b>${player.pts}p</b>
            </a>
          `;
        }).join("") || `<div class="empty">Ingen spelarstatistik hittades.</div>`}
      </div>
    `;
  }

  function renderGoalieRows(goalies) {
    return `
      <div class="leaderList">
        ${goalies.map(function (goalie, index) {
          return `
            <a class="leader" href="${getPersonHref("goalies", goalie.name)}">
              <span>${index + 1}</span>
              <strong>${renderPersonName(goalie.name)}</strong>
              <em>${escapeHtml(goalie.team || "OkÃƒÂ¤nt lag")} Ã‚Â· ${goalie.gp} GP</em>
              <b>${formatPercent(goalie.svp)}</b>
            </a>
          `;
        }).join("") || `<div class="empty">Ingen mÃƒÂ¥lvaktsstatistik hittades.</div>`}
      </div>
    `;
  }

  function renderCupTopPlayerPreview(players) {
    const rows = (players || []).slice(0, 5);
    return `
      <div class="previewLeaders">
        ${rows.map(function (player, index) {
          return `
            <a class="previewLeader" href="${getPersonHref("players", player.name)}">
              <span class="previewRank">${index + 1}</span>
              ${renderPlayerPortrait(player, "previewPortrait")}
              <strong>${renderPersonName(player.name)}</strong>
              <em>${renderTeamIdentityStatic(player.team, "teamLogoChip")}</em>
              <b>${player.pts}p</b>
            </a>
          `;
        }).join("") || `<div class="empty">Ingen spelarstatistik hittades.</div>`}
      </div>
    `;
  }

  function renderCupTopGoaliePreview(goalies) {
    const rows = (goalies || []).slice(0, 5);
    return `
      <div class="previewLeaders">
        ${rows.map(function (goalie, index) {
          return `
            <a class="previewLeader" href="${getPersonHref("goalies", goalie.name)}">
              <span class="previewRank">${index + 1}</span>
              ${renderPlayerPortrait(goalie, "previewPortrait")}
              <strong>${renderPersonName(goalie.name)}</strong>
              <em>${renderTeamIdentityStatic(goalie.team, "teamLogoChip")} Ã‚Â· ${goalie.gp} GP</em>
              <b>${formatPercent(goalie.svp)}</b>
            </a>
          `;
        }).join("") || `<div class="empty">Ingen mÃƒÂ¥lvaktsstatistik hittades.</div>`}
      </div>
    `;
  }

  function renderStatsSortHead(key, label, type) {
    return `<th><button type="button" data-standing-sort="${escapeHtml(key)}" data-sort-type="${escapeHtml(type || "number")}">${escapeHtml(label)}</button></th>`;
  }
  function renderCupPlayerStatsTable(rows, options) {
    const opts = options || {};
    const sorted = rows.slice().sort(function (a, b) {
      return b.pts - a.pts || b.g - a.g || b.a - a.a || b.gp - a.gp || a.name.localeCompare(b.name, "sv");
    });
    if (!sorted.length) return `<div class="empty">Ingen spelarstatistik hittades.</div>`;
    const displayRows = getLimitedStatsRows(sorted, opts);
    const teamHead = opts.hideTeam ? "" : renderStatsSortHead("team", "Lag", "text");
    return `
      <div class="dataTable fullStatsTable">
        <table class="sortableStanding">
          <thead><tr>${renderStatsSortHead("rank", "#")}${renderStatsSortHead("player", "Spelare", "text")}${teamHead}${renderStatsSortHead("gp", "GP")}${renderStatsSortHead("g", "G")}${renderStatsSortHead("a", "A")}${renderStatsSortHead("pts", "PTS")}${renderStatsSortHead("pim", "PIM")}</tr></thead>
          <tbody>
            ${displayRows.map(function (row, index) {
              const teamCell = opts.hideTeam ? "" : `<td>${renderTeamIdentity(row.team, "teamLogoTiny")}</td>`;
              return `<tr data-rank="${index + 1}" data-player="${escapeHtml(fold(row.name))}" data-team="${escapeHtml(fold(row.team))}" data-gp="${number(row.gp)}" data-g="${number(row.g)}" data-a="${number(row.a)}" data-pts="${number(row.pts)}" data-pim="${number(row.pim)}"><td class="rankCell">${index + 1}</td><td><a href="${getPersonHref("players", row.name)}">${renderPersonName(row.name)}</a></td>${teamCell}<td>${row.gp}</td><td>${row.g}</td><td>${row.a}</td><td><strong>${row.pts}</strong></td><td>${row.pim}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
        ${renderStatsTableLimitAction(sorted, displayRows, opts)}
      </div>
    `;
  }

  function renderCupGoalieStatsTable(rows, options) {
    const opts = options || {};
    const sorted = rows.slice().sort(function (a, b) {
      return number(b.svp) - number(a.svp) || number(a.gaa) - number(b.gaa) || number(b.sv) - number(a.sv) || b.gp - a.gp || a.name.localeCompare(b.name, "sv");
    });
    const displayRows = getLimitedStatsRows(sorted, opts);
    if (!sorted.length) return `<div class="empty">Ingen målvaktsstatistik hittades.</div>`;
    const teamHead = opts.hideTeam ? "" : renderStatsSortHead("team", "Lag", "text");
    return `
      <div class="dataTable fullStatsTable">
        <table class="sortableStanding">
          <thead><tr>${renderStatsSortHead("rank", "#")}${renderStatsSortHead("goalie", "Målvakt", "text")}${teamHead}${renderStatsSortHead("gp", "GP")}${renderStatsSortHead("sa", "SA")}${renderStatsSortHead("ga", "GA")}${renderStatsSortHead("sv", "SV")}${renderStatsSortHead("svp", "SV%")}${renderStatsSortHead("gaa", "GAA")}${renderStatsSortHead("so", "SO")}</tr></thead>
          <tbody>
            ${displayRows.map(function (row, index) {
              const teamCell = opts.hideTeam ? "" : `<td>${renderTeamIdentity(row.team, "teamLogoTiny")}</td>`;
              return `<tr data-rank="${index + 1}" data-goalie="${escapeHtml(fold(row.name))}" data-team="${escapeHtml(fold(row.team))}" data-gp="${number(row.gp)}" data-sa="${number(row.sa)}" data-ga="${number(row.ga)}" data-sv="${number(row.sv)}" data-svp="${number(row.svp)}" data-gaa="${number(row.gaa)}" data-so="${number(row.so)}"><td class="rankCell">${index + 1}</td><td><a href="${getPersonHref("goalies", row.name)}">${renderPersonName(row.name)}</a></td>${teamCell}<td>${row.gp}</td><td>${row.sa}</td><td>${row.ga}</td><td>${row.sv}</td><td><strong>${formatPercent(row.svp)}</strong></td><td>${formatDecimal(row.gaa)}</td><td>${row.so}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
        ${renderStatsTableLimitAction(sorted, displayRows, opts)}
      </div>
    `;
  }

  function getLimitedStatsRows(rows, opts) {
    const limit = number(opts.limit);
    if (!limit || opts.expanded || rows.length <= limit) return rows;
    return rows.slice(0, limit);
  }

  function renderStatsTableLimitAction(rows, displayRows, opts) {
    const limit = number(opts.limit);
    if (!limit || rows.length <= limit) return "";
    const href = opts.expanded ? opts.collapseHref : opts.showAllHref;
    if (!href) return "";
    const label = opts.expanded ? "Visa topp 10" : "Visa alla " + rows.length;
    const meta = opts.expanded ? "" : "Visar topp " + displayRows.length;
    return `
      <div class="tableMore">
        <span>${escapeHtml(meta)}</span>
        <a href="${href}">${escapeHtml(label)}</a>
      </div>
    `;
  }

  function renderCupStack(cups) {
    return `
      <div class="cupStack">
        ${cups.map(function (cup) {
          return `
            <a href="#/cups/${encodeURIComponent(cup.id)}">
              <span>${escapeHtml(cup.code)}</span>
              <strong>${escapeHtml(cup.winner || "Ej klar")}</strong>
              <em>${cup.matchCount} matcher</em>
            </a>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderMiniTags(items, type) {
    const hrefBase = type === "teams" ? "#/teams/" : "#/cups/";
    return `
      <div class="tagCloud">
        ${items.slice(0, 80).map(function (item) {
          const value = typeof item === "object" ? text(item.name) : text(item);
          const href = type === "teams" && item && typeof item === "object" && item.cupId
            ? getTeamHref(value, item.cupId)
            : type === "teams" ? getTeamHref(value) : hrefBase + getUrlSlug(value);
          return `<a href="${href}">${type === "teams" ? renderTeamLogo(value, "teamLogoChip") : ""}<span>${escapeHtml(value)}</span></a>`;
        }).join("")}
      </div>
    `;
  }

  function buildCupTeamRows(cup) {
    const map = new Map();
    cup.teams.forEach(function (team) {
      map.set(team, { name: team, matches: 0, wins: 0, losses: 0, otl: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    });
    cup.matches.forEach(function (match) {
      ingestCupTeamRow(map, match.awayTeam, match.awayScore, match.homeScore, match.overtime);
      ingestCupTeamRow(map, match.homeTeam, match.homeScore, match.awayScore, match.overtime);
    });
    return Array.from(map.values()).sort(function (a, b) {
      return b.points - a.points
        || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
        || b.goalsFor - a.goalsFor
        || a.name.localeCompare(b.name, "sv");
    });
  }

  function ingestCupTeamRow(map, team, gf, ga, overtime) {
    if (!map.has(team)) map.set(team, { name: team, matches: 0, wins: 0, losses: 0, otl: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    if (gf === null || ga === null) return;
    const row = map.get(team);
    const goalsFor = number(gf);
    const goalsAgainst = number(ga);
    row.matches += 1;
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      row.wins += 1;
      row.points += overtime ? 2 : 3;
    } else if (overtime) {
      row.otl += 1;
      row.points += 1;
    } else {
      row.losses += 1;
    }
  }

  function buildStandings(cup, mode) {
    const activeMode = normalizeTableMode(mode);
    const groups = new Map();
    if (activeMode === "group") {
      (cup.groupRows || []).forEach(function (row) {
        const groupName = row.group || "Gruppspel";
        if (!groups.has(groupName)) groups.set(groupName, new Map());
        ingestStanding(groups.get(groupName), row.team, null, null, false, null, null);
      });
    }
    cup.matches.filter(function (match) {
      const stage = normalizeStage(match.stage || match.group);
      return activeMode === "playin" ? stage === "playin" : !isPlayoffMatch(match) && stage !== "playin";
    }).forEach(function (match) {
      const groupName = activeMode === "playin" ? (match.group || "Play in") : match.group || "Gruppspel";
      if (!groups.has(groupName)) groups.set(groupName, new Map());
      ingestStanding(groups.get(groupName), match.awayTeam, match.awayScore, match.homeScore, match.overtime, match.awayShots, match.homeShots);
      ingestStanding(groups.get(groupName), match.homeTeam, match.homeScore, match.awayScore, match.overtime, match.homeShots, match.awayShots);
    });

    return Array.from(groups.entries()).sort(function (a, b) {
      return compareGroupNames(a[0], b[0]);
    }).map(function (entry) {
      return {
        name: entry[0],
        rows: Array.from(entry[1].values()).sort(function (a, b) {
          return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.team.localeCompare(b.team, "sv");
        })
      };
    });
  }

  function hasPlayInTableData(cup) {
    return (cup?.matches || []).some(function (match) {
      return normalizeStage(match.stage || match.group) === "playin";
    });
  }

  function getStandingsSettings(cup, mode) {
    if (mode !== "playin") return cup.settings;
    const playin = cup.playinSettings || {};
    return Object.assign({}, cup.settings, {
      playoffCut1: playin.playoffCut1 ?? playin.cut1 ?? cup.settings?.playinCut1 ?? cup.settings?.playInCut1 ?? getDefaultPlayInCut(cup),
      playoffCut2: playin.playoffCut2 ?? playin.cut2 ?? cup.settings?.playinCut2 ?? cup.settings?.playInCut2 ?? null
    });
  }

  function getDefaultPlayInCut(cup) {
    return getRouteLookupKey(cup?.code || cup?.name || cup?.id) === "SEC-15".toLowerCase() ? 2 : null;
  }

  function ingestStanding(map, team, gf, ga, overtime, sf, sa) {
    if (!map.has(team)) {
      map.set(team, { team: team, gp: 0, w: 0, otw: 0, l: 0, otl: 0, gf: 0, ga: 0, sf: 0, sa: 0, pts: 0 });
    }
    if (gf === null || ga === null) return;
    const row = map.get(team);
    const goalsFor = number(gf);
    const goalsAgainst = number(ga);
    row.gp += 1;
    row.gf += goalsFor;
    row.ga += goalsAgainst;
    row.sf += nullableNumber(sf) ?? 0;
    row.sa += nullableNumber(sa) ?? 0;
    if (goalsFor > goalsAgainst) {
      if (overtime) row.otw += 1;
      else row.w += 1;
      row.pts += overtime ? 2 : 3;
    } else if (overtime) {
      row.otl += 1;
      row.pts += 1;
    } else {
      row.l += 1;
    }
  }

  function renderStandingsPreview(groups, settings) {
    return renderStandings(groups, settings, { preview: true });
  }

  function compareGroupNames(a, b) {
    const left = groupSortParts(a);
    const right = groupSortParts(b);
    if (left.prefix !== right.prefix) return left.prefix.localeCompare(right.prefix, "sv");
    if (left.number !== right.number) return left.number - right.number;
    return text(a).localeCompare(text(b), "sv", { numeric: true });
  }

  function groupSortParts(value) {
    const name = text(value);
    const match = name.match(/^(.*?)(\d+)\s*$/);
    return {
      prefix: fold(match ? match[1].trim() : name),
      number: match ? number(match[2]) : Number.MAX_SAFE_INTEGER
    };
  }

  function renderStandings(groups, settings, options) {
    if (!groups.length) return `<div class="empty">Ingen gruppstatistik hittades.</div>`;
    const opts = options || {};
    const isFull = Boolean(opts.full);
    const cut1 = settings?.playoffCut1 || null;
    const cut2 = settings?.playoffCut2 || null;
    const displayGroups = groups;
    const fullHead = [
      ["rank", "#"],
      ["team", "Lag", "text"],
      ["gp", "GP"],
      ["w", "W"],
      ["otw", "OTW"],
      ["l", "L"],
      ["otl", "OTL"],
      ["gf", "GF"],
      ["ga", "GA"],
      ["diff", "+/-"],
      ["sf", "SF"],
      ["sa", "SA"],
      ["shotdiff", "S+/-"],
      ["pts", "PTS"]
    ];
    return `
      <div class="standingsDeck ${isFull ? "fullStandings" : ""}">
        ${displayGroups.map(function (group) {
          const rows = group.rows;
          return `
            <section class="standing">
              <h4>${escapeHtml(group.name)}</h4>
              <table class="${isFull ? "sortableStanding" : "previewStanding"}">
                <colgroup>
                  ${isFull ? `<col class="standingRankCol">` : ""}
                  <col class="standingTeamCol">
                  <col span="${isFull ? 12 : 4}">
                </colgroup>
                <thead><tr>${isFull ? fullHead.map(function (head) {
                  return `<th><button type="button" data-standing-sort="${head[0]}" data-sort-type="${head[2] || "number"}">${head[1]}</button></th>`;
                }).join("") : "<th>Lag</th><th>GP</th><th>W</th><th>L</th><th>PTS</th>"}</tr></thead>
                <tbody>
                  ${rows.map(function (row, index) {
                    const rank = index + 1;
                    const cutClass = rank === cut1 ? " playoffCutLine cutOne" : rank === cut2 ? " playoffCutLine cutTwo" : "";
                    const diff = row.gf - row.ga;
                    const shotDiff = row.sf - row.sa;
                    return `
                      <tr class="${cutClass}" data-rank="${rank}" data-team="${escapeHtml(fold(row.team))}" data-gp="${row.gp}" data-w="${row.w}" data-otw="${row.otw}" data-l="${row.l}" data-otl="${row.otl}" data-gf="${row.gf}" data-ga="${row.ga}" data-diff="${diff}" data-sf="${row.sf}" data-sa="${row.sa}" data-shotdiff="${shotDiff}" data-pts="${row.pts}">
                        ${isFull ? `<td class="rankCell">${rank}</td>` : ""}
                        <td>${renderTeamIdentity(row.team, "teamLogoTiny")}</td>
                        <td>${row.gp}</td><td>${row.w}</td>${isFull ? `<td>${row.otw}</td>` : ""}<td>${isFull ? row.l : row.l + row.otl}</td>${isFull ? `<td>${row.otl}</td><td>${row.gf}</td><td>${row.ga}</td><td>${diff}</td><td>${row.sf}</td><td>${row.sa}</td><td>${shotDiff}</td>` : ""}
                        <td><strong>${row.pts}</strong></td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
              ${opts.preview && group.rows.length > rows.length ? `<div class="previewMore">+${group.rows.length - rows.length} lag till</div>` : ""}
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  function buildBracket(cup) {
    const playoffMatches = cup.matches.filter(isPlayoffMatch);
    const explicitRounds = new Map();
    playoffMatches.forEach(function (match) {
      const round = normalizeRound(match.group || match.stage || "Slutspel");
      if (!explicitRounds.has(round)) explicitRounds.set(round, []);
      explicitRounds.get(round).push(match);
    });

    if (explicitRounds.size === 1 && explicitRounds.has("Slutspel")) {
      return inferPlayoffRounds(playoffMatches, cup);
    }

    return Array.from(explicitRounds.entries()).sort(function (a, b) {
      return roundRank(a[0]) - roundRank(b[0]);
    }).map(function (entry) {
      return { round: entry[0], series: buildPlayoffSeries(entry[1]), matches: entry[1].sort(compareMatches) };
    });
  }

  function renderBracketPreview(rounds, settings, cup) {
    return renderBracket(rounds, settings, { preview: true, cup: cup });
  }


  function getConfiguredBracketRounds(settings) {
    const cutLayout = getPlayInBracketLayout(settings);
    if (cutLayout.length) {
      return cutLayout.map(function (entry) {
        return { round: entry.round, series: [], matches: [] };
      });
    }

    const bestOf = settings?.bestOf || {};
    return [
      ["roundOf16", "Åttondelsfinal"],
      ["quarter", "Kvartsfinal"],
      ["semi", "Semifinal"],
      ["final", "Final"]
    ].filter(function (entry) {
      return nullableNumber(bestOf[entry[0]]) !== null;
    }).map(function (entry) {
      return { round: entry[1], series: [], matches: [] };
    });
  }
  function renderBracket(rounds, settings, options) {
    const opts = options || {};
    const configuredRounds = !rounds.length ? getConfiguredBracketRounds(settings) : [];
    if (!rounds.length && !configuredRounds.length) return `<div class="empty">Inget slutspelsträd hittades för cupen.</div>`;
    const displayRounds = rounds.length ? rounds : configuredRounds;
    return `
      <div class="bracket ${opts.full ? "fullBracket" : ""} ${opts.preview ? "previewBracket" : ""}">
        ${displayRounds.map(function (round) {
          const bestOf = getBestOfForRound(round.round, settings);
          const seriesRows = round.series && round.series.length ? round.series : buildPlayoffSeries(round.matches);
          const displaySeries = seriesRows;
          return `
            <section class="bracketRound">
              <h4>${escapeHtml(round.round)}${bestOf ? ` <span class="boBadge">BO${escapeHtml(bestOf)}</span>` : ""}</h4>
              <div class="bracketSeriesStack">
                ${displaySeries.length ? displaySeries.map(function (series) {
                  const winner = getSeriesWinner(series);
                  return `
                    <div class="series">
                      <div class="seriesTeam ${winner === series.awayTeam ? "winner" : ""}">${renderTeamIdentity(series.awayTeam, "teamLogoTiny", opts.cup?.id)} <b>${series.awayWins}</b></div>
                      <div class="seriesTeam ${winner === series.homeTeam ? "winner" : ""}">${renderTeamIdentity(series.homeTeam, "teamLogoTiny", opts.cup?.id)} <b>${series.homeWins}</b></div>
                      ${renderSeriesResults(series, opts.cup)}
                    </div>
                  `;
                }).join("") : renderEmptyBracketSeries()}
              </div>
              ${opts.preview && seriesRows.length > displaySeries.length ? `<div class="previewMore">+${seriesRows.length - displaySeries.length} serier till</div>` : ""}
            </section>
          `;
        }).join("")}
      </div>
    `;
  }


  function renderEmptyBracketSeries() {
    return `
      <div class="series seriesPlaceholder">
        <div class="seriesTeam muted"><span>Lag ej klart</span><b>-</b></div>
        <div class="seriesTeam muted"><span>Lag ej klart</span><b>-</b></div>
        <em>Inga matcher spelade</em>
      </div>
    `;
  }
  function renderSeriesResults(series, cup) {
    const rows = (series.matches || []).slice().sort(function (a, b) {
      return parseDate(a.date, a.time) - parseDate(b.date, b.time);
    });
    if (!rows.length) return `<em>Inga matchresultat</em>`;
    return `
      <div class="seriesResults">
        ${rows.map(function (match) {
          return `<a href="${getSeriesMatchUrl(match, cup)}">${escapeHtml(seriesScore(match, series.awayTeam, series.homeTeam))}</a>`;
        }).join("")}
      </div>
    `;
  }

  function getSeriesMatchUrl(match, cup) {
    const cupId = cup?.id || match.cupId || state.activeCupId || "";
    return "#/match/" + encodeURIComponent(cupId) + "/" + encodeURIComponent(match.id);
  }

  function seriesScore(match, firstTeam, secondTeam) {
    const firstScore = match.awayTeam === firstTeam ? match.awayScore : match.homeTeam === firstTeam ? match.homeScore : null;
    const secondScore = match.awayTeam === secondTeam ? match.awayScore : match.homeTeam === secondTeam ? match.homeScore : null;
    const suffix = match.overtime ? " OT" : "";
    return display(firstScore) + "-" + display(secondScore) + suffix;
  }

  function renderCupSettings(settings, options) {
    const safeSettings = settings || normalizeCupSettings({});
    const opts = options || {};
    const items = [
      ["Slutspelsstreck 1", formatSettingValue(safeSettings.playoffCut1)],
      ["Slutspelsstreck 2", formatSettingValue(safeSettings.playoffCut2)],
      ["BO ÃƒÂ¥tton", formatSettingValue(safeSettings.bestOf.roundOf16)],
      ["BO kvart", formatSettingValue(safeSettings.bestOf.quarter)],
      ["BO semi", formatSettingValue(safeSettings.bestOf.semi)],
      ["BO final", formatSettingValue(safeSettings.bestOf.final)],
      ["Minst antal spelare", formatSettingValue(safeSettings.minPlayers)],
      ["Max antal spelare", formatSettingValue(safeSettings.maxPlayers)]
    ];
    const visibleItems = items.filter(function (item) { return item[1] !== "Ej angivet"; });
    const hasAny = visibleItems.length
      || safeSettings.eligibility
      || safeSettings.info;
    if (!hasAny) return `<div class="empty">Ingen extra cupinfo hittades.</div>`;
    const infoItems = splitSettingsInfo(safeSettings.info);
    const shownInfo = opts.preview ? infoItems.slice(0, 1) : infoItems;
    return `
      <div class="cupInfoGrid">
        ${visibleItems.map(function (item) {
          return `<div><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(item[1])}</strong></div>`;
        }).join("")}
      </div>
      <div class="cupInfoText">
        ${safeSettings.eligibility ? `<p><span>BehÃƒÂ¶righet</span>${escapeHtml(stripRuleLabel(safeSettings.eligibility, "BehÃƒÂ¶righet"))}</p>` : ""}
        ${shownInfo.map(function (info) {
          return `<p><span>Info</span>${escapeHtml(info)}</p>`;
        }).join("")}
        ${opts.preview && infoItems.length > shownInfo.length ? `<div class="previewMore">+${infoItems.length - shownInfo.length} infodelar till</div>` : ""}
      </div>
    `;
  }

  function renderSharedSecRules() {
    const sections = getSharedSecRuleSections();
    return `
      <div class="panelHead">
        <h3>Gemensamma SEC-regler</h3>
      </div>
      <div class="sharedRules">
        ${sections.map(function (section, index) {
          return `
            <details class="sharedRuleSection" ${index === 0 ? "open" : ""}>
              <summary>${escapeHtml(section.title)}</summary>
              <div>
                ${section.items.map(function (item) {
                  return `
                    <article>
                      <h4>${escapeHtml(item.heading)}</h4>
                      <p>${escapeHtml(item.text)}</p>
                      ${item.bullets ? `<ul>${item.bullets.map(function (bullet) {
                        return `<li>${escapeHtml(bullet)}</li>`;
                      }).join("")}</ul>` : ""}
                    </article>
                  `;
                }).join("")}
              </div>
            </details>
          `;
        }).join("")}
      </div>
    `;
  }

  function getSharedSecRuleSections() {
    return [
      {
        title: "Medlemsregistrering",
        items: [
          { heading: "AllmÃƒÂ¤nt", text: "Alla spelare som deltar i SEC mÃƒÂ¥ste ha ett registrerat konto pÃƒÂ¥ SportsGamer.gg med sitt PSN-ID eller Gamertag tillagt i sin profil." },
          { heading: "Kontodetaljer", text: "SportsGamer-kontonamn, PSN-ID, Gamertag och spelarnamn fÃƒÂ¥r inte vara stÃƒÂ¶tande, fÃƒÂ¶rolÃƒÂ¤mpande, rÃƒÂ¥a eller vulgÃƒÂ¤ra. SportsGamers personal kan begÃƒÂ¤ra att uppgifter ÃƒÂ¤ndras om de anses olÃƒÂ¤mpliga." },
          { heading: "Acceptera regler", text: "Genom att gÃƒÂ¥ med i ett lag som ÃƒÂ¤r registrerat fÃƒÂ¶r en cup accepterar spelaren dessa regler." },
          { heading: "Antal konton", text: "Ingen spelare fÃƒÂ¥r ha mer ÃƒÂ¤n ett konto pÃƒÂ¥ SportsGamer.gg. Kontot kan anvÃƒÂ¤ndas pÃƒÂ¥ olika konsoler och i olika ligor eller turneringar sÃƒÂ¥ lÃƒÂ¤nge spelarens PSN-ID eller Gamertag finns pÃƒÂ¥ profilen." },
          { heading: "Konto i samma hushÃƒÂ¥ll", text: "Om flera spelare anvÃƒÂ¤nder konton frÃƒÂ¥n samma IP-adress, till exempel syskon i samma hem, ska administratÃƒÂ¶r informeras om detta." },
          { heading: "Playercard", text: "Namn och nummer pÃƒÂ¥ SportsGamer-playercard ska stÃƒÂ¤mma med spelet. Alla spelare i ett lag ska ha unika nummer, och korrekt nationalitet och stad ska vara synliga. Ãƒâ€¦lder ÃƒÂ¤r frivilligt." }
        ]
      },
      {
        title: "Lagregistrering",
        items: [
          { heading: "AllmÃƒÂ¤nt", text: "Registrerade svenska, norska och danska medlemmar fÃƒÂ¥r registrera lag fÃƒÂ¶r SEC. Lagets registrant blir kapten som standard. Lagregistrering ÃƒÂ¤r endast mÃƒÂ¶jlig under registreringsperioden." },
          { heading: "Registrering", text: "Registreringar ÃƒÂ¤r slutgiltiga nÃƒÂ¤r anmÃƒÂ¤lningstiden har passerat. SportsGamers personal har sista ordet kring placering i divisioner eller grupper." },
          { heading: "Dra tillbaka en registrering", text: "FÃƒÂ¶r att dra tillbaka en registrering ska kaptenen ta bort anmÃƒÂ¤lan och meddela att laget inte lÃƒÂ¤ngre avser delta. Om laget redan placerats i division ska support kontaktas. Detta kan bara gÃƒÂ¶ras innan anmÃƒÂ¤lningstiden gÃƒÂ¥tt ut." },
          { heading: "Logotyper", text: "Genom anmÃƒÂ¤lan samtycker laget till att SportsGamer, SportsGamers dotterbolag och motstÃƒÂ¥ndare fÃƒÂ¥r anvÃƒÂ¤nda lagets logotyp fÃƒÂ¶r sÃƒÂ¤ndnings- och reklamÃƒÂ¤ndamÃƒÂ¥l." },
          { heading: "SÃƒÂ¤ndningsbilder", text: "Genom anmÃƒÂ¤lan samtycker spelare och lag till att inskickade bilder fÃƒÂ¥r anvÃƒÂ¤ndas fÃƒÂ¶r sÃƒÂ¤ndnings- och reklamÃƒÂ¤ndamÃƒÂ¥l." },
          { heading: "Sponsring", text: "Lag fÃƒÂ¥r ha sponsorer, men sponsorer fÃƒÂ¥r inte stÃƒÂ¥ i konflikt med SportsGamers vÃƒÂ¤rderingar, turneringens huvudsponsor eller cupens arrangÃƒÂ¶r. Alkohol, tobak, spel och vuxenunderhÃƒÂ¥llning ÃƒÂ¤r inte tillÃƒÂ¥tet." }
        ]
      },
      {
        title: "UppfÃƒÂ¶randekod",
        items: [
          { heading: "AllmÃƒÂ¤nt", text: "Medlemmar fÃƒÂ¶rvÃƒÂ¤ntas behandla varandra med respekt och undvika krÃƒÂ¤nkande sprÃƒÂ¥kbruk i cupens konversationer pÃƒÂ¥ SportsGamer.gg och i extern kommunikation dÃƒÂ¤r bevis och kontext kan lÃƒÂ¤mnas." },
          { heading: "FÃƒÂ¶rsÃƒÂ¶k att kringgÃƒÂ¥ regler", text: "Medlemmar fÃƒÂ¥r inte kringgÃƒÂ¥ reglerna, fÃƒÂ¶rsÃƒÂ¶ka gÃƒÂ¶ra det, eller lura SportsGamers personal och Cup Administration." }
        ]
      },
      {
        title: "Lagledningens ansvar",
        items: [
          { heading: "AllmÃƒÂ¤nt", text: "Lagledare ÃƒÂ¤r representanter fÃƒÂ¶r hela laget och ansvarar fÃƒÂ¶r lagets agerande.", bullets: [
            "SchemalÃƒÂ¤gga matcher.",
            "Se till att laget alltid fÃƒÂ¶ljer cupens och turneringens regler.",
            "SkÃƒÂ¶ta kommunikation med managers och cupadministration i lagets namn.",
            "Se till att laget slutfÃƒÂ¶r sina matcher."
          ] }
        ]
      },
      {
        title: "Cupens administration",
        items: [
          { heading: "Ansvar", text: "Cupens administration ansvarar fÃƒÂ¶r att anordna cupen, upprÃƒÂ¤tthÃƒÂ¥lla reglerna, undersÃƒÂ¶ka ÃƒÂ¶vertrÃƒÂ¤delser och lÃƒÂ¶sa tvister mellan spelare och lag." },
          { heading: "RegelÃƒÂ¤ndringar", text: "Cupens administration kan lÃƒÂ¤gga till fÃƒÂ¶rtydliganden eller nya regler om ett fall inte tÃƒÂ¤cks av befintliga regler. Efter beslut ska berÃƒÂ¶rda parter fÃƒÂ¥ en fÃƒÂ¶rklaring kring vilka regler som ÃƒÂ¥beropats." },
          { heading: "Definition av bestraffning", text: "Spelar- och lagbestraffningar definieras efter allvarlighetsgrad och tidigare beslut kan anvÃƒÂ¤ndas som prejudikat." },
          { heading: "Majoritetsbeslut", text: "Cupadministrationen beslutar med majoritet och agerar som en enhet efter beslut. Enskilda rÃƒÂ¶ster avslÃƒÂ¶jas inte." },
          { heading: "Kontakt", text: "Kontakt med cupadministrationen ska ske via supportfunktionen och SEC Support. AnvÃƒÂ¤nd inte privata meddelanden till enskilda CA-medlemmar fÃƒÂ¶r CA-frÃƒÂ¥gor." }
        ]
      },
      {
        title: "Lagregler",
        items: [
          { heading: "Spelare", text: "Lag fÃƒÂ¥r endast anvÃƒÂ¤nda spelare som ÃƒÂ¤r listade i den officiella laguppstÃƒÂ¤llningen pÃƒÂ¥ SportsGamer.gg." },
          { heading: "WO-matcher", text: "Lag fÃƒÂ¥r lÃƒÂ¤mna WO, men varje fall avgÃƒÂ¶rs av CA. MotstÃƒÂ¥ndarlaget fÃƒÂ¥r walkover-vinst." },
          { heading: "Annullera matcher", text: "Om en match spelas med en eller flera otillÃƒÂ¥tna spelare kan CA annullera matcher och tilldela WO-segrar till laget som inte brutit mot reglerna." }
        ]
      },
      {
        title: "Fair Play",
        items: [
          { heading: "AllmÃƒÂ¤nt", text: "Fair Play ÃƒÂ¤r grundregeln i alla matcher pÃƒÂ¥ SportsGamer.gg. Behandla motstÃƒÂ¥ndaren som du sjÃƒÂ¤lv vill bli behandlad.", bullets: [
            "Utnyttja inte spelmekanik eller buggar fÃƒÂ¶r att ge motstÃƒÂ¥ndaren nackdel.",
            "Distrahera inte motstÃƒÂ¥ndaren frÃƒÂ¥n spelet genom spam, samtal under match eller liknande."
          ] }
        ]
      },
      {
        title: "Buggar",
        items: [
          { heading: "Spelare fastnar i animationer", text: "Om spelare eller mÃƒÂ¥lvakter fastnar i oavsiktliga animationer ska laget rensa pucken sÃƒÂ¥ snart felet upptÃƒÂ¤cks. Vid oenighet kan videobevis skickas till CA." },
          { heading: "SlagsmÃƒÂ¥l vid tekning", text: "Spelare fÃƒÂ¥r inte initiera slagsmÃƒÂ¥l innan pucken slÃƒÂ¤pps vid tekning." },
          { heading: "MÃƒÂ¥lvakter lÃƒÂ¤mnar mÃƒÂ¥lgÃƒÂ¥rden", text: "MÃƒÂ¥lvakter fÃƒÂ¥r inte lÃƒÂ¤mna mÃƒÂ¥lgÃƒÂ¥rden i syfte att stÃƒÂ¶ra motstÃƒÂ¥ndarens skridskoÃƒÂ¥kare." },
          { heading: "Hindra spelare utan puck", text: "SkridskoÃƒÂ¥kare fÃƒÂ¥r inte slÃƒÂ¥, stÃƒÂ¶ta eller aktivt ÃƒÂ¥ka i vÃƒÂ¤gen fÃƒÂ¶r spelare som inte har pucken." },
          { heading: "FÃƒÂ¥nga spelare i mÃƒÂ¥let", text: "MÃƒÂ¥lvakten fÃƒÂ¥r inte fÃƒÂ¶rsÃƒÂ¶ka hindra en motstÃƒÂ¥ndare bakom mÃƒÂ¥let eller i sarghÃƒÂ¶rnet genom att stÃƒÂ¥ i vÃƒÂ¤gen sÃƒÂ¥ spelaren inte kan ÃƒÂ¥ka dÃƒÂ¤rifrÃƒÂ¥n." }
        ]
      },
      {
        title: "SchemalÃƒÂ¤ggning",
        items: [
          { heading: "SchemalÃƒÂ¤ggning", text: "Varje match har en officiell speldag. Lag fÃƒÂ¥r flytta matcher om de inte sÃƒÂ¤nds eller ÃƒÂ¤r utvalda matcher, men ska kommunicera med motstÃƒÂ¥ndare fÃƒÂ¶re speldagen och skicka ÃƒÂ¶verenskomna ÃƒÂ¤ndringar via rescheduling-verktyget." }
        ]
      },
      {
        title: "Diskvalificering och fÃƒÂ¶rbjudna spelare",
        items: [
          { heading: "Diskvalificering av lag", text: "Om ett lag diskvalificeras stÃƒÂ¤ngs lagkaptener och assisterande kaptener av frÃƒÂ¥n cupen. Ãƒâ€“vriga spelare kan byta lag om de inte var inblandade i diskvalificeringen." },
          { heading: "FÃƒÂ¶rvÃƒÂ¤rv av fÃƒÂ¶rbjudna spelare", text: "Lag som plockar upp spelare som ÃƒÂ¤r fÃƒÂ¶rbjudna att spela pÃƒÂ¥ SportsGamer fÃƒÂ¥r allvarliga pÃƒÂ¥fÃƒÂ¶ljder. Lagkaptenerna kan stÃƒÂ¤ngas av och laget diskvalificeras." }
        ]
      }
    ];
  }

  function isPlayoffMatch(match) {
    const marker = fold([match?.stage, match?.group, match?.gameType, match?.matchType].filter(Boolean).join(" "));
    return marker.includes("playoff")
      || marker.includes("slutspel")
      || marker.includes("final")
      || marker.includes("semi")
      || marker.includes("kvart")
      || marker.includes("atton")
      || /^round\b/.test(marker);
  }

  function inferPlayoffRounds(matches, cup) {
    const series = buildPlayoffSeries(matches).sort(function (a, b) {
      return a.firstTimestamp - b.firstTimestamp;
    });
    if (isLegacySecOneCup(cup)) return inferSecOnePlayoffRounds(series);
    if (hasOnlyGenericPlayoffRounds(matches)) {
      const cutRounds = inferPlayoffRoundsFromCuts(series, cup);
      if (cutRounds.length) return cutRounds;
      return inferPlayoffRoundsBySeriesCount(series);
    }
    const bracketRounds = inferPlayoffRoundsFromWinners(series);
    if (bracketRounds.length >= 2) return bracketRounds;
    return inferPlayoffRoundsBySeriesCount(series);
  }

  function hasOnlyGenericPlayoffRounds(matches) {
    return (matches || []).length > 0 && matches.every(function (match) {
      return isGenericPlayoffRound(match.group || match.stage || match.gameType || match.matchType || "");
    });
  }

  function isGenericPlayoffRound(value) {
    const folded = fold(value);
    return !folded
      || folded === "round"
      || /^round\b/.test(folded)
      || folded === "slutspel"
      || folded === "playoff"
      || folded === "playoffs";
  }

  function inferPlayoffRoundsBySeriesCount(series) {
    const rounds = [];
    let remaining = (series || []).slice().sort(function (a, b) {
      return a.firstTimestamp - b.firstTimestamp;
    });
    const pattern = [
      { count: 8, round: "ÃƒÆ’Ã¢â‚¬Â¦ttondelsfinal" },
      { count: 4, round: "Kvartsfinal" },
      { count: 2, round: "Semifinal" },
      { count: 1, round: "Final" }
    ];

    pattern.forEach(function (entry) {
      if (remaining.length >= entry.count && (remaining.length - entry.count === 0 || remaining.length - entry.count < entry.count)) {
        rounds.push({ round: entry.round, series: remaining.slice(0, entry.count), matches: remaining.slice(0, entry.count).flatMap(function (item) { return item.matches; }) });
        remaining = remaining.slice(entry.count);
      }
    });

    if (remaining.length) {
      rounds.push({ round: "Slutspel", series: remaining, matches: remaining.flatMap(function (item) { return item.matches; }) });
    }

    return rounds.sort(function (a, b) {
      return roundRank(a.round) - roundRank(b.round);
    });
  }
  function getPlayInBracketLayout(settings) {
    const cut1 = nullableNumber(settings?.playoffCut1);
    const cut2 = nullableNumber(settings?.playoffCut2);
    if (cut1 === null || cut2 === null || cut1 <= 0 || cut2 <= cut1) return [];

    const playInTeams = cut2 - cut1;
    if (playInTeams < 2 || playInTeams % 2 !== 0) return [];

    const playInSeriesCount = playInTeams / 2;
    const mainBracketTeams = cut1 + playInSeriesCount;
    const mainLayouts = {
      2: [{ round: "Final", count: 1 }],
      4: [{ round: "Semifinal", count: 2 }, { round: "Final", count: 1 }],
      8: [{ round: "Kvartsfinal", count: 4 }, { round: "Semifinal", count: 2 }, { round: "Final", count: 1 }],
      16: [{ round: "Ãƒâ€¦ttondelsfinal", count: 8 }, { round: "Kvartsfinal", count: 4 }, { round: "Semifinal", count: 2 }, { round: "Final", count: 1 }]
    };
    const mainLayout = mainLayouts[mainBracketTeams];
    if (!mainLayout) return [];

    return [{ round: "Play in", count: playInSeriesCount }].concat(mainLayout);
  }

  function inferPlayoffRoundsFromCuts(series, cup) {
    const layout = getPlayInBracketLayout(cup?.settings || {});
    if (!layout.length || !(series || []).length) return [];

    const sorted = (series || []).slice().sort(function (a, b) {
      return a.firstTimestamp - b.firstTimestamp;
    });
    const cut1 = nullableNumber(cup?.settings?.playoffCut1);
    const cut2 = nullableNumber(cup?.settings?.playoffCut2);
    const standings = buildStandings(cup);
    const rankMap = new Map();
    if (standings.length === 1) {
      standings[0].rows.forEach(function (row, index) {
        rankMap.set(fold(row.team), index + 1);
      });
    }

    const isPlayInSeries = function (item) {
      if (!rankMap.size || cut1 === null || cut2 === null) return false;
      const awayRank = rankMap.get(fold(item.awayTeam));
      const homeRank = rankMap.get(fold(item.homeTeam));
      return awayRank > cut1 && awayRank <= cut2 && homeRank > cut1 && homeRank <= cut2;
    };

    const playInCount = layout[0].count;
    let playInSeries = sorted.filter(isPlayInSeries).slice(0, playInCount);
    if (playInSeries.length < Math.min(playInCount, sorted.length)) {
      playInSeries = sorted.slice(0, playInCount);
    }

    const assigned = new Set(playInSeries);
    let remaining = sorted.filter(function (item) { return !assigned.has(item); });
    const rounds = [];

    if (playInSeries.length) {
      rounds.push({ round: "Play in", series: playInSeries, matches: playInSeries.flatMap(function (item) { return item.matches; }) });
    }

    layout.slice(1).forEach(function (entry) {
      if (!remaining.length) return;
      const roundSeries = remaining.slice(0, entry.count);
      if (!roundSeries.length) return;
      rounds.push({ round: entry.round, series: roundSeries, matches: roundSeries.flatMap(function (item) { return item.matches; }) });
      remaining = remaining.slice(entry.count);
    });

    if (remaining.length) {
      rounds.push({ round: "Slutspel", series: remaining, matches: remaining.flatMap(function (item) { return item.matches; }) });
    }

    return rounds.sort(function (a, b) {
      return roundRank(a.round) - roundRank(b.round);
    });
  }

  function hasStageStats(cup, stage) {
    return (cup?.playerStageRows?.[stage] || []).length > 0 || (cup?.goalieStageRows?.[stage] || []).length > 0;
  }

  function supportsPlayInGroup(cup) {
    if (!cup) return false;
    const keys = [cup.id, cup.code, cup.name].map(getRouteLookupKey);
    return keys.includes("15") || keys.includes("sec-15") || keys.includes("svenska-ehockey-cupen-15");
  }

  function inferSecOnePlayoffRounds(series) {
    const sorted = (series || []).slice().sort(function (a, b) {
      return a.firstTimestamp - b.firstTimestamp;
    });
    if (sorted.length < 3) return inferPlayoffRoundsFromWinners(sorted);
    const finalSeries = sorted.slice(-1);
    const semifinalSeries = sorted.slice(-3, -1);
    const quarterfinalSeries = sorted.slice(0, -3);
    return [
      { round: "Kvartsfinal", series: quarterfinalSeries, matches: quarterfinalSeries.flatMap(function (item) { return item.matches; }) },
      { round: "Semifinal", series: semifinalSeries, matches: semifinalSeries.flatMap(function (item) { return item.matches; }) },
      { round: "Final", series: finalSeries, matches: finalSeries.flatMap(function (item) { return item.matches; }) }
    ].filter(function (round) {
      return round.series.length;
    });
  }

  function isLegacySecOneCup(cup) {
    return getRouteLookupKey(cup?.code || cup?.name || cup?.id) === "SEC-1".toLowerCase()
      || String(cup?.id || "") === "1";
  }

  function inferPlayoffRoundsFromWinners(series) {
    if (!series.length) return [];
    const assigned = new Set();
    const finalSeries = series.slice().sort(function (a, b) {
      return b.firstTimestamp - a.firstTimestamp;
    })[0];
    const rounds = [{ round: "Final", series: [finalSeries], matches: finalSeries.matches }];
    assigned.add(finalSeries);

    let current = [finalSeries];
    ["Semifinal", "Kvartsfinal", "Ãƒâ€¦ttondelsfinal"].forEach(function (roundName) {
      const previous = [];
      current.forEach(function (targetSeries) {
        [targetSeries.awayTeam, targetSeries.homeTeam].forEach(function (team) {
          const predecessor = series
            .filter(function (candidate) {
              return !assigned.has(candidate)
                && candidate.firstTimestamp < targetSeries.firstTimestamp
                && getSeriesWinner(candidate) === team;
            })
            .sort(function (a, b) {
              return b.firstTimestamp - a.firstTimestamp;
            })[0];
          if (predecessor && !previous.includes(predecessor)) {
            previous.push(predecessor);
            assigned.add(predecessor);
          }
        });
      });
      if (previous.length) {
        const effectiveRoundName = roundName === "Ãƒâ€¦ttondelsfinal" && previous.length < current.length * 2 ? "Play in" : roundName;
        previous.sort(function (a, b) { return a.firstTimestamp - b.firstTimestamp; });
        rounds.push({ round: effectiveRoundName, series: previous, matches: previous.flatMap(function (item) { return item.matches; }) });
        current = previous;
      }
    });

    const leftovers = series.filter(function (candidate) {
      return !assigned.has(candidate);
    });
    if (leftovers.length) {
      const earliestName = rounds.some(function (round) { return round.round === "Ãƒâ€¦ttondelsfinal" || round.round === "Play in"; }) ? "Slutspel" : "Play in";
      leftovers.sort(function (a, b) { return a.firstTimestamp - b.firstTimestamp; });
      rounds.push({ round: earliestName, series: leftovers, matches: leftovers.flatMap(function (item) { return item.matches; }) });
    }

    return rounds.sort(function (a, b) {
      return roundRank(a.round) - roundRank(b.round);
    });
  }

  function buildPlayoffSeries(matches) {
    const map = new Map();
    (matches || []).forEach(function (match) {
      const teams = [match.awayTeam, match.homeTeam].sort(function (a, b) {
        return a.localeCompare(b, "sv");
      });
      const key = teams.join(" | ");
      if (!map.has(key)) {
        map.set(key, {
          awayTeam: teams[0],
          homeTeam: teams[1],
          awayWins: 0,
          homeWins: 0,
          firstTimestamp: parseDate(match.date, match.time) || 0,
          matches: []
        });
      }
      const series = map.get(key);
      series.firstTimestamp = Math.min(series.firstTimestamp || Infinity, parseDate(match.date, match.time) || Infinity);
      series.matches.push(match);
      const awayScore = number(match.awayScore);
      const homeScore = number(match.homeScore);
      if (awayScore === homeScore) return;
      const winner = awayScore > homeScore ? match.awayTeam : match.homeTeam;
      if (winner === series.awayTeam) {
        series.awayWins += 1;
      } else if (winner === series.homeTeam) {
        series.homeWins += 1;
      }
    });
    return Array.from(map.values()).map(function (series) {
      series.matches.sort(compareMatches);
      return series;
    });
  }

  function getSeriesWinner(series) {
    if (series.awayWins === series.homeWins) return "";
    return series.awayWins > series.homeWins ? series.awayTeam : series.homeTeam;
  }

  function inferCupPlacement(cup) {
    const rounds = buildBracket(cup);
    if (!rounds.length) return { winner: "", runnerUp: "" };
    const sortedRounds = rounds.slice().sort(function (a, b) {
      return roundRank(b.round) - roundRank(a.round);
    });
    const finalRound = sortedRounds.find(function (round) {
      return fold(round.round).includes("final") && !fold(round.round).includes("semi") && (round.series || []).length === 1;
    }) || sortedRounds.find(function (round) {
      return (round.series || []).length === 1;
    });
    const finalSeries = finalRound?.series?.[0];
    if (!finalSeries) return { winner: "", runnerUp: "" };
    const winner = getSeriesWinner(finalSeries);
    if (!winner) return { winner: "", runnerUp: "" };
    return {
      winner: winner,
      runnerUp: winner === finalSeries.awayTeam ? finalSeries.homeTeam : finalSeries.awayTeam
    };
  }

  function normalizeCupSettings(cup) {
    const source = cup?.settings || cup || {};
    const bestOf = source.bestOf || {};
    return {
      playoffCut1: nullableNumber(source.playoffCut1 ?? source["slutspelsstreck  1"] ?? source["slutspelsstreck 1"]),
      playoffCut2: nullableNumber(source.playoffCut2 ?? source["slutspelsstreck  2"] ?? source["slutspelsstreck 2"]),
      playinCut1: nullableNumber(source.playinCut1 ?? source.playInCut1 ?? source["play in slutspelsstreck 1"] ?? source["playin slutspelsstreck 1"]),
      playinCut2: nullableNumber(source.playinCut2 ?? source.playInCut2 ?? source["play in slutspelsstreck 2"] ?? source["playin slutspelsstreck 2"]),
      bestOf: {
        playIn: nullableNumber(bestOf.playIn ?? bestOf.playin ?? source.boPlayIn ?? source["bo play in"] ?? source["bo playin"]),
        roundOf16: nullableNumber(bestOf.roundOf16 ?? source.boAtton ?? source["bo ÃƒÂ¥tton"] ?? source["bo atton"]),
        quarter: nullableNumber(bestOf.quarter ?? source.boQuarter ?? source["bo kvart"]),
        semi: nullableNumber(bestOf.semi ?? source.boSemi ?? source["bo semi"]),
        final: nullableNumber(bestOf.final ?? source.boFinal ?? source["bo final"])
      },
      minPlayers: nullableNumber(source.minPlayers ?? source["Minst antal spelare"] ?? source["Min antal spelare"]),
      maxPlayers: nullableNumber(source.maxPlayers ?? source["Max antal spelare"] ?? source["Max antal"]),
      eligibility: text(source.eligibility ?? source["BehÃƒÂ¶righet:"] ?? source["BehÃƒÂ¶righet"] ?? source.Behorighet ?? ""),
      info: text(source.info ?? source.Info ?? "")
    };
  }

  function getBestOfForRound(roundName, settings) {
    const bestOf = settings?.bestOf || {};
    const folded = fold(roundName);
    if (folded.includes("play in") || folded.includes("playin")) return bestOf.playIn ?? bestOf.playin ?? bestOf.quarter ?? null;
    if (folded.includes("atton") || folded.includes("16")) return bestOf.roundOf16;
    if (folded.includes("kvart")) return bestOf.quarter;
    if (folded.includes("semi")) return bestOf.semi;
    if (folded.includes("final")) return bestOf.final;
    return [bestOf.roundOf16, bestOf.quarter, bestOf.semi, bestOf.final].find(Boolean) || null;
  }

  function formatSettingValue(value) {
    return value === null || value === undefined || value === "" ? "Ej angivet" : String(value);
  }

  function stripRuleLabel(value, label) {
    const clean = text(value);
    const labels = uniqueStrings([label, removeDiacritics(label)]).map(function (entry) {
      return entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:$/, "");
    });
    for (let index = 0; index < labels.length; index += 1) {
      const stripped = clean.replace(new RegExp("^\\s*" + labels[index] + "\\s*:?\\s*", "i"), "").trim();
      if (stripped && stripped !== clean) return stripped;
    }
    return clean;
  }

  function splitSettingsInfo(value) {
    return text(value).replace(/<br\s*\/?>/gi, "\n").split(/\r?\n|(?:\s*\|\s*)/).map(function (part) {
      return part.trim();
    }).filter(Boolean);
  }

  function buildTeamRoster(teamName) {
    const map = new Map();
    state.cups.forEach(function (cup) {
      cup.playerRows.filter(function (row) {
        return row.team === teamName;
      }).forEach(function (row) {
        const key = fold(row.name);
        if (!map.has(key)) {
          map.set(key, { name: row.name, team: teamName, gp: 0, g: 0, a: 0, pts: 0, cups: new Set() });
        }
        const target = map.get(key);
        target.gp += row.gp;
        target.g += row.g;
        target.a += row.a;
        target.pts += row.pts;
        target.cups.add(cup.code);
      });
    });
    return Array.from(map.values()).sort(sortPlayers);
  }

  function buildTeamCupRows(teamName) {
    return state.cups.map(function (cup) {
      const rows = cup.playerRows.filter(function (row) { return isSameTeamName(row.team, teamName); });
      const rosterRows = (cup.rosterRows || []).filter(function (row) { return isSameTeamName(row.team, teamName); });
      const matches = cup.matches.filter(function (match) {
        return isSameTeamName(match.awayTeam, teamName) || isSameTeamName(match.homeTeam, teamName);
      });
      const goalsFor = matches.reduce(function (sum, match) {
        return sum + number(isSameTeamName(match.awayTeam, teamName) ? match.awayScore : match.homeScore);
      }, 0);
      const goalsAgainst = matches.reduce(function (sum, match) {
        return sum + number(isSameTeamName(match.awayTeam, teamName) ? match.homeScore : match.awayScore);
      }, 0);
      const wins = matches.filter(function (match) {
        const gf = number(isSameTeamName(match.awayTeam, teamName) ? match.awayScore : match.homeScore);
        const ga = number(isSameTeamName(match.awayTeam, teamName) ? match.homeScore : match.awayScore);
        return gf > ga;
      }).length;
      return { cup: cup, players: Math.max(rows.length, rosterRows.length), matches: matches.length, wins: wins, goalsFor: goalsFor, goalsAgainst: goalsAgainst };
    }).filter(function (row) {
      return row.players || row.matches;
    }).sort(function (a, b) {
      return compareCupsByDate(a.cup, b.cup);
    });
  }

  function renderTeamCupTable(rows) {
    if (!rows.length) return `<div class="empty">Ingen laghistorik hittades.</div>`;
    return `
      <div class="dataTable">
        <table>
          <thead><tr><th>Cup</th><th>Matcher</th><th>Vinster</th><th>MÃƒÂ¥l</th><th>Spelare</th></tr></thead>
          <tbody>
            ${rows.map(function (row) {
              return `<tr><td><a href="#/cups/${encodeURIComponent(row.cup.id)}">${escapeHtml(row.cup.code)}</a></td><td>${row.matches}</td><td>${row.wins}</td><td>${row.goalsFor}</td><td>${row.players}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPlayerCupTable(player) {
    const rows = player.rows.slice().sort(function (a, b) {
      return compareProfileRowsByDate(a, b);
    });
    if (!rows.length) return `<div class="empty">Ingen cuphistorik hittades.</div>`;
    return `
      <div class="dataTable">
        <table>
          <thead><tr><th>Cup</th><th>Lag</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>PIM</th></tr></thead>
          <tbody>
            ${rows.map(function (row) {
              return `<tr><td><a href="#/cups/${encodeURIComponent(row.cupId)}">${escapeHtml(row.cupCode)}</a></td><td>${renderTeamIdentity(row.team, "teamLogoTiny")}</td><td>${row.gp}</td><td>${row.g}</td><td>${row.a}</td><td><strong>${row.pts}</strong></td><td>${row.pim}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderGoalieCupTable(goalie) {
    const rows = goalie.rows.slice().sort(function (a, b) {
      return compareCupRowsByDate(a, b);
    });
    if (!rows.length) return `<div class="empty">Ingen mÃƒÂ¥lvaktshistorik hittades.</div>`;
    return `
      <div class="dataTable">
        <table>
          <thead><tr><th>Cup</th><th>Lag</th><th>GP</th><th>SA</th><th>GA</th><th>SV</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead>
          <tbody>
            ${rows.map(function (row) {
              return `<tr><td><a href="#/cups/${encodeURIComponent(row.cupId)}">${escapeHtml(row.cupCode)}</a></td><td>${renderTeamIdentity(row.team, "teamLogoTiny")}</td><td>${row.gp}</td><td>${row.sa}</td><td>${row.ga}</td><td>${row.sv}</td><td><strong>${formatPercent(row.svp)}</strong></td><td>${formatDecimal(row.gaa)}</td><td>${row.so}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTeamCupTable(rows) {
    if (!rows.length) return `<div class="empty">Ingen laghistorik hittades.</div>`;
    return `
      <div class="dataTable">
        <table>
          <thead><tr><th>Cup</th><th>Datum</th><th>Matcher</th><th>Vinster</th><th>Mal</th><th>Spelare</th></tr></thead>
          <tbody>
            ${rows.map(function (row) {
              return `<tr><td><a href="#/cups/${encodeURIComponent(row.cup.id)}">${escapeHtml(row.cup.code)}</a></td><td>${escapeHtml(formatCupDateRange(row.cup))}</td><td>${row.matches}</td><td>${row.wins}</td><td>${row.goalsFor}</td><td>${row.players}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPlayerCupTable(player) {
    const rows = player.rows.slice().sort(function (a, b) {
      return compareProfileRowsByDate(a, b);
    });
    if (!rows.length) return `<div class="empty">Ingen cuphistorik hittades.</div>`;
    return `
      <div class="dataTable">
        <table>
          <thead><tr><th>Cup</th><th>Del</th><th>Lag</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>PIM</th></tr></thead>
          <tbody>
            ${rows.map(function (row) {
              return `<tr><td><a href="#/cups/${encodeURIComponent(row.cupId)}">${escapeHtml(row.cupCode)}</a></td><td>${escapeHtml(formatStageLabel(row.stage))}</td><td>${renderTeamIdentity(row.team, "teamLogoTiny", row.cupId)}</td><td>${row.gp}</td><td>${row.g}</td><td>${row.a}</td><td><strong>${row.pts}</strong></td><td>${row.pim}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderGoalieCupTable(goalie) {
    const rows = goalie.rows.slice().sort(function (a, b) {
      return compareProfileRowsByDate(a, b);
    });
    if (!rows.length) return `<div class="empty">Ingen malvaktshistorik hittades.</div>`;
    return `
      <div class="dataTable">
        <table>
          <thead><tr><th>Cup</th><th>Del</th><th>Lag</th><th>GP</th><th>SA</th><th>GA</th><th>SV</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead>
          <tbody>
            ${rows.map(function (row) {
              return `<tr><td><a href="#/cups/${encodeURIComponent(row.cupId)}">${escapeHtml(row.cupCode)}</a></td><td>${escapeHtml(formatStageLabel(row.stage))}</td><td>${renderTeamIdentity(row.team, "teamLogoTiny", row.cupId)}</td><td>${row.gp}</td><td>${row.sa}</td><td>${row.ga}</td><td>${row.sv}</td><td><strong>${formatPercent(row.svp)}</strong></td><td>${formatDecimal(row.gaa)}</td><td>${row.so}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTeamLogo(teamName, className) {
    const safeName = text(teamName);
    const urls = getTeamLogoCandidates(safeName);
    const first = urls[0] || "";
    const fallbacks = urls.slice(1);
    return `
      <span class="teamLogo ${className || ""}" data-initials="${escapeHtml(getTeamInitials(safeName))}">
        ${first ? `<img src="${escapeHtml(first)}" data-fallback-srcs="${escapeHtml(JSON.stringify(fallbacks))}" onerror="window.SEC_LOGO_FALLBACK(this)" alt="${escapeHtml(safeName)} logga" loading="eager" decoding="async">` : ""}
      </span>
    `;
  }

  function renderTeamIdentity(teamName, logoClass, cupId) {
    const safeName = text(teamName || "OkÃƒÂ¤nt lag");
    return `
      <a class="teamIdentity" href="${getTeamHref(safeName, cupId)}">
        ${renderTeamLogo(safeName, logoClass || "teamLogoTiny")}
        <span>${escapeHtml(safeName)}</span>
      </a>
    `;
  }

  function renderTeamIdentityStatic(teamName, logoClass) {
    const safeName = text(teamName || "OkÃƒÂ¤nt lag");
    return `
      <span class="teamIdentity teamIdentityStatic">
        ${renderTeamLogo(safeName, logoClass || "teamLogoTiny")}
        <span>${escapeHtml(safeName)}</span>
      </span>
    `;
  }

  function getTeamHref(teamName, cupId) {
    const safeName = text(teamName || "OkÃƒÂ¤nt lag");
    if (cupId) {
      return "#/cups/" + getUrlSlug(cupId) + "/teams/" + getUrlSlug(safeName);
    }
    if (state.view === "cups" && state.activeCupId) {
      return "#/cups/" + getUrlSlug(state.activeCupId) + "/teams/" + getUrlSlug(safeName);
    }
    if (state.view === "match" && state.activeMatchCupId) {
      return "#/cups/" + getUrlSlug(state.activeMatchCupId) + "/teams/" + getUrlSlug(safeName);
    }
    return "#/teams/" + getUrlSlug(safeName);
  }

  function findTeamByRouteName(name) {
    const key = getRouteLookupKey(name);
    return state.teams.find(function (team) {
      return getRouteLookupKey(team.name) === key || isSameTeamName(team.name, name);
    }) || null;
  }

  function getPersonHref(route, name) {
    const displayName = getPersonDisplayName(name);
    return "#/" + route + "/" + getUrlSlug(displayName);
  }

  function renderPersonName(name) {
    const parsed = parsePersonCountry(name);
    const flag = countryFlag(parsed.country);
    return `<span class="personName">${flag ? `<span class="countryFlag" title="${escapeHtml(parsed.country)}">${flag}</span>` : ""}<span>${escapeHtml(parsed.name)}</span></span>`;
  }

  function getPersonDisplayName(name) {
    return parsePersonCountry(name).name;
  }

  function parsePersonCountry(name) {
    const safeName = text(name);
    const match = safeName.match(/,\s*([A-ZÅÄÖa-zåäö ]+)$/i);
    const cleanName = match ? safeName.slice(0, match.index).trim() : safeName;
    const explicitCountry = normalizeCountryCode(match ? match[1] : "");
    const manualCountry = getManualPlayerCountry(cleanName);
    return {
      name: cleanName,
      country: !explicitCountry || explicitCountry === "UNK" ? manualCountry : explicitCountry
    };
  }

  function getManualPlayerCountry(name) {
    const countries = {
      nigeltje1: "NLD"
    };
    return countries[fold(name)] || "";
  }

  function normalizeCountryCode(code) {
    const value = text(code).trim();
    if (!value) return "";
    const key = fold(value).replace(/\s+/g, "");
    const aliases = {
      sweden: "SWE",
      sverige: "SWE",
      finland: "FIN",
      norway: "NOR",
      norge: "NOR",
      denmark: "DEN",
      danmark: "DEN",
      germany: "GER",
      deutschland: "GER",
      tyskland: "GER",
      netherlands: "NLD",
      holland: "NLD",
      nederländerna: "NLD",
      nederlanderna: "NLD",
      latvia: "LAT",
      lettland: "LAT",
      russia: "RUS",
      ryssland: "RUS",
      estonia: "EST",
      estland: "EST",
      lithuania: "LTU",
      litauen: "LTU",
      ukraine: "UKR",
      ukraina: "UKR"
    };
    return aliases[key] || value.toUpperCase();
  }

  function countryFlag(code) {
    const normalizedCode = normalizeCountryCode(code);
    const countries = {
      SWE: "SE",
      FIN: "FI",
      NOR: "NO",
      DEN: "DK",
      DNK: "DK",
      ISL: "IS",
      USA: "US",
      CAN: "CA",
      GBR: "GB",
      GER: "DE",
      DEU: "DE",
      FRA: "FR",
      ESP: "ES",
      ITA: "IT",
      CZE: "CZ",
      SVK: "SK",
      POL: "PL",
      AUT: "AT",
      SUI: "CH",
      CHE: "CH",
      NED: "NL",
      NLD: "NL",
      BEL: "BE",
      LAT: "LV",
      LVA: "LV",
      EST: "EE",
      LTU: "LT",
      RUS: "RU",
      UKR: "UA"
    };
    const iso2 = countries[normalizedCode];
    if (!iso2) return "";
    const safeIso = iso2.toLowerCase();
    return `<img src="https://flagcdn.com/24x18/${safeIso}.png" srcset="https://flagcdn.com/48x36/${safeIso}.png 2x" alt="${escapeHtml(normalizedCode)}">`;
  }
  function renderPlayerPortrait(player, className) {
    const safeName = text(player?.name || player?.player || "Spelare");
    const urls = getPlayerImageCandidates(player);
    const first = urls[0] || getDefaultPlayerImageUrl();
    const fallbacks = urls.slice(1).concat(getDefaultPlayerImageUrl());
    return `
      <span class="playerPortrait ${className || ""}" data-initials="${escapeHtml(getPlayerInitials(safeName))}">
        <img src="${escapeHtml(first)}" data-fallback-srcs="${escapeHtml(JSON.stringify(uniqueStrings(fallbacks)))}" onerror="window.SEC_PLAYER_IMAGE_FALLBACK(this)" alt="${escapeHtml(safeName)} spelarfoto" loading="eager" decoding="async">
      </span>
    `;
  }

  function getPlayerImageCandidates(player) {
    const base = getPlayerImageBaseUrl();
    const matched = resolvePlayerImageFilename(player);
    const names = getPlayerAssetNameCandidates(player);
    const guessed = uniqueStrings(names.flatMap(function (name) {
      return ["jpg", "jpeg", "png", "webp"].map(function (ext) {
        return base + "/" + encodeURIComponent(name + "." + ext);
      });
    })).slice(0, 28);
    return uniqueStrings((matched ? [base + "/" + encodeURIComponent(matched)] : []).concat(guessed));
  }

  function resolvePlayerImageFilename(player) {
    const keys = getPlayerAssetKeysForPlayer(player);
    for (let index = 0; index < keys.length; index += 1) {
      const match = state.playerImageIndex.get(keys[index]);
      if (match) return match;
    }
    return "";
  }

  function getPlayerAssetNameCandidates(player) {
    const name = text(player?.name || player?.player);
    const nameWithoutCountry = name.replace(/,\s*[A-Z]{2,3}$/i, "");
    const id = text(player?.playerId || player?.id);
    const baseNames = uniqueStrings([
      nameWithoutCountry,
      removeDiacritics(nameWithoutCountry),
      nameWithoutCountry.replace(/[_-]+/g, " "),
      nameWithoutCountry.replace(/\s+/g, "_"),
      nameWithoutCountry.replace(/\s+/g, "-"),
      nameWithoutCountry.replace(/[._-]+/g, ""),
      removeDiacritics(nameWithoutCountry).replace(/\s+/g, "_"),
      removeDiacritics(nameWithoutCountry).replace(/\s+/g, "-"),
      removeDiacritics(nameWithoutCountry).replace(/[._-]+/g, ""),
      name,
      removeDiacritics(name),
      name.replace(/[_-]+/g, " "),
      name.replace(/\s+/g, "_"),
      name.replace(/\s+/g, "-"),
      name.replace(/[._-]+/g, ""),
      removeDiacritics(name).replace(/\s+/g, "_"),
      removeDiacritics(name).replace(/\s+/g, "-"),
      removeDiacritics(name).replace(/[._-]+/g, ""),
      id
    ].map(function (value) { return text(value).trim(); }).filter(Boolean));
    return uniqueStrings(baseNames.flatMap(function (value) {
      return [value, value.toLowerCase(), toTitleCase(value)];
    }));
  }

  function getPlayerAssetKeysForPlayer(player) {
    return uniqueStrings(getPlayerAssetNameCandidates(player).flatMap(getPlayerAssetKeys));
  }

  function getPlayerAssetKeys(value) {
    const clean = text(value).replace(/\.[^.]+$/, "");
    return uniqueStrings([
      fold(clean),
      normalizeLogoKey(clean),
      fold(removeDiacritics(clean)),
      normalizeLogoKey(removeDiacritics(clean))
    ]);
  }

  function getPlayerImageBaseUrl() {
    return String(window.SEC_CONFIG?.playerImageBaseUrl || "https://sweehockey-svg.github.io/players").replace(/\/+$/, "");
  }

  function getDefaultPlayerImageUrl() {
    return getPlayerImageBaseUrl() + "/1DEFAULTBILDID.jpg";
  }

  function getPlayerInitials(playerName) {
    const parts = text(playerName).split(/[\s._-]+/).filter(Boolean);
    return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  }

  function renderPersonDetail(player, goalie, source) {
    const person = player || goalie;
    if (!person) return `<section class="emptyPage">Spelaren hittades inte.</section>`;
    const parsedPerson = parsePersonCountry(person.name);
    const profileBio = buildPersonBio(player, goalie);
    const teams = uniqueStrings([]
      .concat(player ? Array.from(player.teams || []) : [])
      .concat(goalie ? Array.from(goalie.teams || []) : [])
      .filter(Boolean));
    const teamJourney = buildPersonTeamJourney(player, goalie);
    const currentEditionTeams = getPersonCurrentEditionTeams(player, goalie);
    const cups = new Set([]
      .concat(player ? Array.from(player.cups || []) : [])
      .concat(goalie ? Array.from(goalie.cups || []) : []));
    const roleText = player && goalie ? "Utespelare / m\u00e5lvakt" : player ? "Utespelare" : "M\u00e5lvakt";
    const meta = [
      cups.size + " cuper",
      player ? player.gp + " GP ute" : "",
      player ? player.pts + " po\u00e4ng" : "",
      goalie ? goalie.gp + " GP m\u00e5l" : "",
      goalie ? formatPercent(goalie.svp) + " SV%" : ""
    ].filter(Boolean).join(" \u00b7 ");
    return `
      <section class="detailHero playerProfileHero">
        ${renderPersonBreadcrumb(parsedPerson.name)}
        <div class="profileMedia">
          ${renderPlayerPortrait(person, "playerPortraitHero")}
        </div>
        <div class="profileCopy">
          <p class="profileLabel">${parsedPerson.country ? `<span class="countryFlag">${countryFlag(parsedPerson.country)}</span>` : ""}<span>Spelarprofil</span></p>
          <h2>${escapeHtml(parsedPerson.name)}</h2>
          <p class="profileMeta">
            <span class="profileCurrentTeams">${renderProfileCurrentTeams(currentEditionTeams)}</span>
            <span>${escapeHtml(roleText)} \u00b7 ${escapeHtml(meta)}.</span>
          </p>
          ${renderPersonProfileStats(player, goalie)}
        </div>
        ${renderPersonBioPanel(profileBio)}
      </section>
      ${renderPersonMeritsPanel(profileBio)}
      <section class="personDetailGrid">
        <div class="personHistoryStack">
          ${player ? panel("Utespelare - cuphistorik", renderPlayerCupTable(player)) : ""}
          ${goalie ? panel("M\u00e5lvakt - cuphistorik", renderGoalieCupTable(goalie)) : ""}
        </div>
      </section>
    `;
  }


  function renderPersonProfileStats(player, goalie) {
    const stats = []
      .concat(player ? [
        { label: "Po\u00e4ng", value: player.pts },
        { label: "M\u00e5l", value: player.g },
        { label: "Assist", value: player.a }
      ] : [])
      .concat(goalie ? [
        { label: "SV%", value: formatPercent(goalie.svp) },
        { label: "GAA", value: formatDecimal(goalie.gaa) },
        { label: "R\u00e4ddningar", value: goalie.sv }
      ] : []);
    if (!stats.length) return "";
    return `
      <div class="profileHeroStats" aria-label="Profilstatistik">
        ${stats.map(function (stat) {
          return `<span><b>${escapeHtml(stat.value)}</b><em>${escapeHtml(stat.label)}</em></span>`;
        }).join("")}
      </div>
    `;
  }


  function renderProfileCurrentTeams(items) {
    if (!items.length) return `<span class="freeAgentPill">Free agent</span>`;
    return items.map(function (item) {
      return renderTeamIdentity(item.name, "profileTeamLogo", item.cupId);
    }).join("");
  }

  function getPersonCurrentEditionTeams(player, goalie) {
    const latestKey = getLatestCupEditionKey();
    if (!latestKey) return [];
    const seen = new Set();
    return []
      .concat(player ? player.rows : [])
      .concat(goalie ? goalie.rows : [])
      .filter(function (row) {
        return getCupEditionKey(row) === latestKey && row.team;
      })
      .sort(compareCupRowsByDate)
      .map(function (row) {
        return { name: row.team, cupId: row.cupId };
      })
      .filter(function (item) {
        const key = fold(item.name) + "::" + text(item.cupId);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function getLatestCupEditionKey() {
    return getCupEditionKey(state.cups[0]);
  }

  function getCupEditionKey(source) {
    if (!source) return "";
    const cup = source.id ? source : state.cups.find(function (entry) { return entry.id === source.cupId; });
    const label = text((cup && (cup.code + " " + cup.name + " " + cup.id)) || (source.cupCode + " " + source.cupId));
    const family = /sommar/i.test(label) ? "summer" : "sec";
    const variant = /challenger/i.test(label) ? "challenger" : "";
    const match = label.match(/(?:SEC|Sommar)\s*(?:Sommar\s*)?(\d+(?:[.,]\d+)?)/i) || label.match(/(\d+(?:[.,]\d+)?)/);
    const edition = match ? match[1].replace(",", ".") : fold(label);
    return [family, edition, variant].filter(Boolean).join(":");
  }


  function buildPersonTeamJourney(player, goalie) {
    const seen = new Set();
    return []
      .concat(player ? player.rows : [])
      .concat(goalie ? goalie.rows : [])
      .sort(compareCupRowsByDate)
      .map(function (row) {
        return { name: row.team, cupId: row.cupId };
      })
      .filter(function (item) {
        const key = fold(item.name);
        if (!item.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  function renderPersonBreadcrumb(playerName) {
    return `
      <nav class="crumbs profileCrumbs" aria-label="Br\u00f6dsmulor">
        <a href="#/cups">Start</a>
        <span>/</span>
        <strong>${escapeHtml(playerName)}</strong>
      </nav>
    `;
  }

  function getCupByCode(code) {
    const key = fold(code);
    return state.cups.find(function (cup) {
      return fold(cup.code) === key;
    }) || null;
  }

  function buildPersonBio(player, goalie) {
    const person = player || goalie;
    const parsed = parsePersonCountry(person.name);
    const allRows = []
      .concat(player ? player.rows.map(function (row) { return Object.assign({ role: "skater" }, row); }) : [])
      .concat(goalie ? goalie.rows.map(function (row) { return Object.assign({ role: "goalie" }, row); }) : [])
      .sort(compareCupRowsByDate);
    const chronological = allRows.slice().sort(function (a, b) { return compareCupRowsByDate(b, a); });
    const regularRows = chronological.filter(function (row) { return !isSummerCupRow(row); });
    const bioRows = regularRows.length ? regularRows : chronological;
    const firstRow = bioRows[0] || chronological[0] || null;
    const lastRow = bioRows[bioRows.length - 1] || chronological[chronological.length - 1] || null;
    const teams = uniqueStrings(allRows.map(function (row) { return row.team; }).filter(Boolean));
    const cups = uniqueStrings(allRows.map(function (row) { return row.cupCode; }).filter(Boolean));
    const bestSkater = player ? player.rows.filter(function (row) {
      return number(row.gp) || number(row.pts);
    }).sort(function (a, b) {
      return b.pts - a.pts || b.g - a.g || b.gp - a.gp;
    })[0] : null;
    const bestGoalie = goalie ? goalie.rows.filter(function (row) {
      return number(row.gp) || number(row.sa) || number(row.sv);
    }).sort(function (a, b) {
      return number(b.svp) - number(a.svp) || number(b.sv) - number(a.sv) || number(b.gp) - number(a.gp);
    })[0] : null;
    return {
      name: parsed.name,
      country: parsed.country,
      nationality: translateNationality(parsed.country),
      firstCup: firstRow?.cupCode || "",
      firstTeam: firstRow?.team || "",
      lastCup: lastRow?.cupCode || "",
      lastTeam: lastRow?.team || "",
      cupsCount: cups.length,
      teamsCount: teams.length,
      totalGames: (player ? player.gp : 0) + (goalie ? goalie.gp : 0),
      bestSkater: bestSkater,
      bestGoalie: bestGoalie,
      teamMerits: getPersonTeamMerits(player, goalie),
      personalMerits: getPersonPersonalMerits(player, goalie)
    };
  }

  function renderPersonBioPanel(bio) {
    return `
      <aside class="personBioPanel" aria-label="Spelarbio och meriter">
        <p><strong>${escapeHtml(bio.name)}</strong> ${bio.nationality ? "\u00e4r en <strong>" + escapeHtml(bio.nationality) + "</strong>" : "\u00e4r en"} eHockey-spelare som gjorde sitt f\u00f6rsta framtr\u00e4dande i <strong>${escapeHtml(bio.firstCup || "SEC")}</strong>${bio.firstTeam ? " f\u00f6r <strong>" + escapeHtml(bio.firstTeam) + "</strong>" : ""}.</p>
        <p>Totalt har han deltagit i <strong>${bio.cupsCount}</strong> upplagor av <strong>Svenska eHockey Cupen</strong> och representerat <strong>${bio.teamsCount}</strong> olika lag. Senast spelade han i <strong>${escapeHtml(bio.lastCup || "SEC")}</strong>${bio.lastTeam ? " f\u00f6r <strong>" + escapeHtml(bio.lastTeam) + "</strong>" : ""}.</p>
        <p>Sammanlagt st\u00e5r han p\u00e5 <strong>${bio.totalGames}</strong> matcher i SEC.</p>
        ${bio.bestSkater ? `<p>Hans b\u00e4sta turnering som utespelare kom i <strong>${escapeHtml(bio.bestSkater.cupCode)}</strong>, d\u00e4r han gjorde <strong>${bio.bestSkater.pts}</strong> po\u00e4ng f\u00f6r <strong>${escapeHtml(bio.bestSkater.team)}</strong>.</p>` : ""}
        ${bio.bestGoalie ? `<p>Hans b\u00e4sta turnering som m\u00e5lvakt kom i <strong>${escapeHtml(bio.bestGoalie.cupCode)}</strong>, med <strong>${formatPercent(bio.bestGoalie.svp)}</strong> i SV% f\u00f6r <strong>${escapeHtml(bio.bestGoalie.team)}</strong>.</p>` : ""}
      </aside>
    `;
  }

  function renderPersonMeritsPanel(bio) {
    if (!bio.teamMerits.length && !bio.personalMerits.length) return "";
    return `
      <section class="personMeritsPanel">
        ${renderPersonMeritSection("Meriter", bio.teamMerits)}
        ${renderPersonMeritSection("Personliga meriter", bio.personalMerits)}
      </section>
    `;
  }

  function renderPersonMeritSection(title, items) {
    if (!items.length) return "";
    return `
      <div class="personMeritSection">
        <h3>${escapeHtml(title)}</h3>
        <div class="personMeritList">
          ${items.map(function (item) {
            return `<div><span>${escapeHtml(item.icon)}</span><strong>${escapeHtml(item.text)}</strong></div>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function getPersonTeamMerits(player, goalie) {
    const rows = [].concat(player ? player.rows : []).concat(goalie ? goalie.rows : []);
    const output = [];
    const seen = new Set();
    state.cups.forEach(function (cup) {
      uniqueStrings(rows.filter(function (row) {
        return row.cupId === cup.id && row.team;
      }).map(function (row) { return row.team; })).forEach(function (team) {
        const teamKey = fold(team);
        if (cup.winner && fold(cup.winner) === teamKey) {
          const key = "gold-" + cup.id + "-" + teamKey;
          if (!seen.has(key)) {
            seen.add(key);
            output.push({ icon: trophyIcon(1), text: "M\u00e4stare i " + cup.code + " med " + team + "." });
          }
        }
        if (cup.runnerUp && fold(cup.runnerUp) === teamKey) {
          const key = "silver-" + cup.id + "-" + teamKey;
          if (!seen.has(key)) {
            seen.add(key);
            output.push({ icon: trophyIcon(2), text: "2:a i " + cup.code + " med " + team + "." });
          }
        }
      });
    });
    return output.sort(function (a, b) { return a.text.localeCompare(b.text, "sv"); });
  }

  function getPersonPersonalMerits(player, goalie) {
    return []
      .concat(player ? getSkaterPointMerits(player) : [])
      .concat(player ? getSkaterGoalMerits(player) : [])
      .concat(goalie ? getGoaliePersonalMerits(goalie) : []);
  }

  function getSkaterPointMerits(player) {
    return getRankMerits(player.rows, "pts", function (row, index) {
      return { icon: targetIcon(index), text: (index + 1) + ":a i po\u00e4ngligan i " + getStageCupLabel(row) + " (" + row.pts + "p)." };
    }, function (a, b) {
      return b.pts - a.pts || b.g - a.g || a.name.localeCompare(b.name, "sv");
    });
  }

  function getSkaterGoalMerits(player) {
    return getRankMerits(player.rows, "g", function (row, index) {
      return { icon: targetIcon(index), text: (index + 1) + ":a i skytteligan i " + getStageCupLabel(row) + " (" + row.g + " m\u00e5l)." };
    }, function (a, b) {
      return b.g - a.g || b.pts - a.pts || a.name.localeCompare(b.name, "sv");
    });
  }

  function getGoaliePersonalMerits(goalie) {
    return getRankMerits(goalie.rows, "svp", function (row, index) {
      return { icon: targetIcon(index), text: (index + 1) + ":a i m\u00e5lvaktsligan i " + getStageCupLabel(row) + " (" + formatPercent(row.svp) + ")." };
    }, function (a, b) {
      return number(b.svp) - number(a.svp) || number(b.sv) - number(a.sv) || a.name.localeCompare(b.name, "sv");
    });
  }

  function getRankMerits(rows, statKey, makeItem, sorter) {
    const output = [];
    rows.forEach(function (row) {
      if (!number(row[statKey])) return;
      const cup = state.cups.find(function (entry) { return entry.id === row.cupId; });
      if (!cup) return;
      const peers = getCupStageRows(cup, row, row.sa !== undefined ? "goalie" : "player").slice().sort(sorter);
      const index = peers.findIndex(function (candidate) {
        return getPersonProfileKey(candidate.name) === getPersonProfileKey(row.name) && fold(candidate.team) === fold(row.team);
      });
      if (index >= 0 && index < 3) output.push(makeItem(row, index));
    });
    return output;
  }

  function getCupStageRows(cup, row, type) {
    const rows = type === "goalie" ? cup.goalieRows : cup.playerRows;
    return rows.filter(function (candidate) {
      return normalizeStage(candidate.stage) === normalizeStage(row.stage);
    });
  }

  function getStageCupLabel(row) {
    const stage = normalizeStage(row.stage);
    return row.cupCode + (stage === "playoffs" ? " S" : stage === "playin" ? " PI" : " G");
  }

  function normalizeStage(value) {
    const raw = String(value || "");
    if (value === "playin" || /play[\s_-]*in/i.test(raw)) return "playin";
    return value === "playoffs" || /slut|playoff|^round\b/i.test(raw) ? "playoffs" : "group";
  }

  function isSummerCupRow(row) {
    return /sommar/i.test(String(row?.cupId || row?.cupCode || ""));
  }

  function translateNationality(code) {
    const map = {
      SWE: "svensk",
      SE: "svensk",
      FIN: "finsk",
      FI: "finsk",
      NOR: "norsk",
      NO: "norsk",
      DEN: "dansk",
      DNK: "dansk",
      DK: "dansk",
      GER: "tysk",
      DEU: "tysk",
      DE: "tysk",
      CZE: "tjeckisk",
      SVK: "slovakisk",
      CAN: "kanadensisk",
      USA: "amerikansk"
    };
    return map[String(code || "").trim().toUpperCase()] || "";
  }

  function trophyIcon(place) {
    return place === 1 ? String.fromCodePoint(0x1f3c6) : place === 2 ? String.fromCodePoint(0x1f948) : String.fromCodePoint(0x1f949);
  }

  function targetIcon(index) {
    return index === 0 ? String.fromCodePoint(0x1f3af) : trophyIcon(index + 1);
  }

  function findPlayerByPersonName(name) {
    const key = getPersonProfileKey(name);
    return state.players.find(function (player) {
      return getPersonProfileKey(player.name) === key;
    }) || null;
  }

  function findGoalieByPersonName(name) {
    const key = getPersonProfileKey(name);
    return state.goalies.find(function (goalie) {
      return getPersonProfileKey(goalie.name) === key;
    }) || null;
  }

  function getPersonProfileKey(name) {
    const parsed = parsePersonCountry(name);
    return getRouteLookupKey(parsed.name || name);
  }

  function renderPlayerDetail(_model, player) {
    if (!player) return `<section class="emptyPage">Spelaren hittades inte.</section>`;
    return renderPersonDetail(player, findGoalieByPersonName(player.name), "players");
    /*
    return `
      <section class="detailHero playerProfileHero">
        <div class="profileMedia">
          ${renderPlayerPortrait(player, "playerPortraitHero")}
        </div>
        <div class="profileCopy">
          <a href="#/players">Tillbaka till spelare</a>
          <h2>${renderPersonName(player.name)}</h2>
          <p>${renderTeamIdentity(player.team || "Okant lag", "teamLogoInline")} <span>${player.cups.size} cuper Ã‚Â· ${player.gp} GP Ã‚Â· ${player.pts} poang.</span></p>
        </div>
      </section>
      <section class="metricGrid compact">
        ${metric("Poang", player.pts, "totalt")}
        ${metric("Mal", player.g, "gjorda")}
        ${metric("Assist", player.a, "passningar")}
        ${metric("Matcher", player.gp, "GP")}
      </section>
      <section class="sportGrid">
        ${panel("Cuphistorik", renderPlayerCupTable(player))}
        ${panel("Lagresa", renderMiniTags(Array.from(player.teams), "teams"))}
      </section>
    `;
    */
  }

  function renderGoalieDetail(_model, goalie) {
    if (!goalie) return `<section class="emptyPage">Malvakten hittades inte.</section>`;
    return renderPersonDetail(findPlayerByPersonName(goalie.name), goalie, "goalies");
    /*
    return `
      <section class="detailHero playerProfileHero">
        <div class="profileMedia">
          ${renderPlayerPortrait(goalie, "playerPortraitHero")}
        </div>
        <div class="profileCopy">
          <a href="#/goalies">Tillbaka till malvakter</a>
          <h2>${renderPersonName(goalie.name)}</h2>
          <p>${renderTeamIdentity(goalie.team || "Okant lag", "teamLogoInline")} <span>${goalie.cups.size} cuper Ã‚Â· ${goalie.gp} GP Ã‚Â· ${formatPercent(goalie.svp)} SV%.</span></p>
        </div>
      </section>
      <section class="metricGrid compact">
        ${metric("SV%", formatPercent(goalie.svp), "raddningsprocent")}
        ${metric("GAA", formatDecimal(goalie.gaa), "mal emot/match")}
        ${metric("SV", goalie.sv, "raddningar")}
        ${metric("SO", goalie.so, "hallna nollor")}
      </section>
      <section class="sportGrid">
        ${panel("Cuphistorik", renderGoalieCupTable(goalie))}
        ${panel("Lagresa", renderMiniTags(Array.from(goalie.teams), "teams"))}
      </section>
    `;
    */
  }

  function getTeamLogoCandidates(teamName) {
    if (!teamName || teamName === "Ej klar") return [];
    const base = String(window.SEC_CONFIG?.teamLogoBaseUrl || "https://sweehockey-svg.github.io/teamlogos").replace(/\/+$/, "");
    const matched = resolveTeamLogoFilename(teamName);
    const names = uniqueStrings([
      teamName,
      removeDiacritics(teamName),
      teamName.replace(/\s+/g, "_"),
      removeDiacritics(teamName).replace(/\s+/g, "_"),
      teamName.replace(/\s+/g, "-"),
      removeDiacritics(teamName).replace(/\s+/g, "-"),
      teamName.replace(/[^a-z0-9]+/gi, ""),
      removeDiacritics(teamName).replace(/[^a-z0-9]+/gi, "")
    ].map(function (name) { return name.trim(); }).filter(Boolean));
    const guessed = uniqueStrings(names.flatMap(function (name) {
      return ["png", "jpg", "jpeg", "webp", "svg"].map(function (ext) {
        return base + "/" + encodeURIComponent(name + "." + ext);
      });
    })).slice(0, 20);
    return uniqueStrings((matched ? [base + "/" + encodeURIComponent(matched)] : []).concat(guessed));
  }

  function resolveTeamLogoFilename(teamName) {
    const keys = uniqueStrings([
      fold(teamName),
      normalizeLogoKey(teamName),
      fold(removeDiacritics(teamName)),
      normalizeLogoKey(removeDiacritics(teamName))
    ]);
    for (let index = 0; index < keys.length; index += 1) {
      const match = state.teamLogoIndex.get(keys[index]);
      if (match) return match;
    }
    return "";
  }

  function getTeamInitials(teamName) {
    const clean = removeDiacritics(teamName).replace(/[^a-z0-9\s]/gi, " ").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) return "SEC";
    return parts.slice(0, 3).map(function (part) { return part[0]; }).join("").toUpperCase();
  }

  function buildModel() {
    const allMatches = [];
    let totalGoals = 0;
    state.cups.forEach(function (cup) {
      cup.matches.forEach(function (match) {
        allMatches.push({ cup: cup, match: match });
        totalGoals += number(match.awayScore) + number(match.homeScore);
      });
    });
    allMatches.sort(function (left, right) {
      return compareMatches(left.match, right.match);
    });
    const completed = allMatches.filter(function (entry) {
      return entry.match.awayScore !== null && entry.match.homeScore !== null;
    }).length;
    return {
      allMatches: allMatches,
      latestMatches: allMatches.slice(0, 8),
      latestCup: state.cups[0] || null,
      featuredCups: state.cups.slice(0, 6),
      totalMatches: allMatches.length,
      totalGoals: totalGoals,
      avgGoals: completed ? (totalGoals / completed).toFixed(1) : "0.0",
      topPlayers: state.players.slice(0, 8),
      topGoalies: state.goalies.slice(0, 8)
    };
  }

  function normalizeCups(cups) {
    return cups.map(function (cup, index) {
      const matches = (cup.matches || []).map(function (match, matchIndex) {
        return {
          id: String(match.id || cup.id + "-" + matchIndex),
          date: text(match.date),
          time: text(match.time),
          awayTeam: text(match.awayTeam || "OkÃƒÂ¤nt lag"),
          awayScore: nullableNumber(match.awayScore),
          awayShots: nullableNumber(match.awayShots),
          homeScore: nullableNumber(match.homeScore),
          homeShots: nullableNumber(match.homeShots),
          homeTeam: text(match.homeTeam || "OkÃƒÂ¤nt lag"),
          group: text(match.group),
          stage: text(match.stage || "group"),
          gameType: text(match.gameType || match.game_type || match.game_type_name || ""),
          matchType: text(match.matchType || match.match_type || match.gameType || match.game_type || ""),
          overtime: Boolean(match.overtime),
          goalsSummary: text(match.goalsSummary || ""),
          eaJson: text(match.eaJson || match.eaJSON || ""),
          statsSummary: text(match.statsSummary || match.Stats || match.stats || ""),
          playerStats: normalizeMatchStatSides(match.playerStats, normalizePlayerRowsForMatch),
          goalieStats: normalizeMatchStatSides(match.goalieStats, normalizeGoalieRowsForMatch)
        };
      });
      const cupDateMeta = getCupDateMeta(matches, cup, index);
      const rawRosterRows = normalizeCupRosterRows(cup);
      const groupRows = normalizeCupGroupRows(cup);
      const teams = Array.from(new Set(
        matches.flatMap(function (match) {
          return [match.awayTeam, match.homeTeam];
        }).concat(rawRosterRows.map(function (row) {
          return row.team;
        })).concat(groupRows.map(function (row) {
          return row.team;
        })).filter(Boolean)
      )).sort(function (a, b) { return a.localeCompare(b, "sv"); });
      const settings = normalizeCupSettings(cup);
      const playinSettings = normalizeCupSettings(cup.playinSettings || cup.playInSettings || cup.playin || {});
      const topPlayers = collectCupPlayers(cup).slice(0, 10);
      const playerStageRows = {
        group: collectCupPlayersForStage(cup, "group"),
        playin: collectCupPlayersForStage(cup, "playin"),
        playoffs: collectCupPlayersForStage(cup, "playoffs")
      };
      const playerRows = collectCupPlayers(cup).map(function (row) {
        return Object.assign({}, row, {
          cupId: String(cup.id || index + 1),
          cupCode: text(cup.code || "SEC " + (index + 1)),
          sortOrder: typeof cup.sortOrder === "number" ? cup.sortOrder : index,
          cupStartTimestamp: cupDateMeta.startTimestamp,
          cupEndTimestamp: cupDateMeta.endTimestamp,
          cupSortTimestamp: cupDateMeta.sortTimestamp
        });
      });
      const cupGoalies = collectCupGoalies(cup);
      const topGoalies = filterEligibleCupGoalies(cupGoalies, matches).slice(0, 10);
      const goalieStageRows = {
        group: collectCupGoaliesForStage(cup, "group"),
        playin: collectCupGoaliesForStage(cup, "playin"),
        playoffs: collectCupGoaliesForStage(cup, "playoffs")
      };
      const goalieRows = cupGoalies.map(function (row) {
        return Object.assign({}, row, {
          cupId: String(cup.id || index + 1),
          cupCode: text(cup.code || "SEC " + (index + 1)),
          sortOrder: typeof cup.sortOrder === "number" ? cup.sortOrder : index,
          cupStartTimestamp: cupDateMeta.startTimestamp,
          cupEndTimestamp: cupDateMeta.endTimestamp,
          cupSortTimestamp: cupDateMeta.sortTimestamp
        });
      });
      const rosterRows = rawRosterRows.map(function (row) {
        return Object.assign({}, row, {
          cupId: String(cup.id || index + 1),
          cupCode: text(cup.code || "SEC " + (index + 1)),
          sortOrder: typeof cup.sortOrder === "number" ? cup.sortOrder : index,
          cupStartTimestamp: cupDateMeta.startTimestamp,
          cupEndTimestamp: cupDateMeta.endTimestamp,
          cupSortTimestamp: cupDateMeta.sortTimestamp
        });
      });
      const inferredPlacement = inferCupPlacement({ matches: matches });
      return {
        id: String(cup.id || index + 1),
        sortOrder: typeof cup.sortOrder === "number" ? cup.sortOrder : index,
        cupStartTimestamp: cupDateMeta.startTimestamp,
        cupEndTimestamp: cupDateMeta.endTimestamp,
        cupSortTimestamp: cupDateMeta.sortTimestamp,
        code: text(cup.code || "SEC " + (index + 1)),
        name: text(cup.name || cup.code || "SEC"),
        winner: text(cup.placements?.first || cup.winner || inferredPlacement.winner || ""),
        runnerUp: text(cup.placements?.second || cup.runnerUp || inferredPlacement.runnerUp || ""),
        settings: settings,
        playinSettings: playinSettings,
        matches: matches,
        matchCount: matches.length,
        teams: teams,
        goals: matches.reduce(function (sum, match) { return sum + number(match.awayScore) + number(match.homeScore); }, 0),
        topPlayers: topPlayers,
        playerRows: playerRows,
        rosterRows: rosterRows,
        groupRows: groupRows,
        playerStageRows: playerStageRows,
        topGoalies: topGoalies,
        goalieRows: goalieRows,
        goalieStageRows: goalieStageRows
      };
    }).sort(compareCupsByDate);
  }

  function collectCupPlayers(cup) {
    const rows = getStatRows(cup.playerStats, "group")
      .concat(getStatRows(cup.playerStats, "playin"))
      .concat(getStatRows(cup.playerStats, "playoffs"));
    return aggregateCupPlayerRows(rows, cup);
  }

  function collectCupPlayersForStage(cup, stage) {
    return aggregateCupPlayerRows(getStatRows(cup.playerStats, stage), cup);
  }

  function aggregateCupPlayerRows(rows, cup) {
    const map = new Map();
    rows.forEach(function (row) {
      const name = text(row.displayName || row.player || "OkÃƒÂ¤nd spelare");
      const key = fold(name);
        if (!map.has(key)) {
          map.set(key, { name: name, team: text(row.team), playerId: text(row.playerId), gp: 0, g: 0, a: 0, pts: 0, pim: 0, cups: new Set([text(cup.code)]) });
        }
      const target = map.get(key);
      target.gp += number(row.gp);
      target.g += number(row.g);
      target.a += number(row.a);
      target.pts += number(row.pts);
      target.pim += number(row.pim);
    });
    return Array.from(map.values()).sort(sortPlayers);
  }

  function collectCupGoalies(cup) {
    const rows = getStatRows(cup.goalieStats, "group")
      .concat(getStatRows(cup.goalieStats, "playin"))
      .concat(getStatRows(cup.goalieStats, "playoffs"));
    return aggregateCupGoalieRows(rows, cup);
  }

  function collectCupGoaliesForStage(cup, stage) {
    return aggregateCupGoalieRows(getStatRows(cup.goalieStats, stage), cup);
  }

  function filterEligibleCupGoalies(goalies, matches) {
    if (!matches || !matches.length) return goalies;
    return goalies.filter(function (goalie) {
      const teamGames = countTeamMatches(matches, goalie.team, { playedOnly: true, excludeWalkovers: true });
      return teamGames > 0 && number(goalie.gp) >= teamGames * GOALIE_ELIGIBILITY_RATE;
    });
  }

  function countTeamMatches(matches, teamName, options) {
    const settings = options || {};
    return (matches || []).filter(function (match) {
      const teamMatch = match.awayTeam === teamName || match.homeTeam === teamName;
      if (!teamMatch) return false;
      if (settings.playedOnly && !isPlayedMatch(match)) return false;
      if (settings.excludeWalkovers && isWalkoverMatch(match)) return false;
      return true;
    }).length;
  }

  function aggregateCupGoalieRows(rows, cup) {
    const map = new Map();
    rows.forEach(function (row) {
      const name = text(row.displayName || row.player || "OkÃƒÂ¤nd mÃƒÂ¥lvakt");
      const key = fold(name);
        if (!map.has(key)) {
          map.set(key, { name: name, team: text(row.team), playerId: text(row.playerId), gp: 0, sa: 0, ga: 0, sv: 0, svp: 0, gaa: 0, so: 0, cups: new Set([text(cup.code)]) });
        }
      const target = map.get(key);
      const sa = number(row.sa);
      const ga = number(row.ga);
      const sv = number(row.sv);
      target.gp += number(row.gp);
      target.sa += sa || ga + sv;
      target.ga += ga;
      target.sv += sv;
      target.so += number(row.so);
    });
    return Array.from(map.values()).map(finalizeGoalie).sort(sortGoalies);
  }

  function normalizeCupRosterRows(cup) {
    const rows = []
      .concat(getStatRows(cup.rosterRows, "all"))
      .concat(getStatRows(cup.rosters, "all"))
      .concat(getStatRows(cup.roster, "all"));
    const map = new Map();
    rows.forEach(function (row) {
      const name = text(row.name || row.player || row.displayName || "");
      const team = text(row.team || row.teamName || "");
      if (!name || !team) return;
      const key = fold(team) + "::" + fold(name);
      if (!map.has(key)) {
        map.set(key, {
          name: name,
          team: team,
          playerId: text(row.playerId || row.playerID),
          role: text(row.role || row.position || "Registrerad")
        });
      }
    });
    return Array.from(map.values()).sort(function (a, b) {
      return a.team.localeCompare(b.team, "sv") || getPersonDisplayName(a.name).localeCompare(getPersonDisplayName(b.name), "sv");
    });
  }

  function normalizeCupGroupRows(cup) {
    const rows = []
      .concat(getStatRows(cup.groupRows, "all"))
      .concat(getStatRows(cup.groups, "all"))
      .concat(getStatRows(cup.groupTeams, "all"));
    const map = new Map();
    rows.forEach(function (row) {
      const team = text(row.team || row.teamName || row.name || "");
      const group = text(row.group || row.groupName || row.stage || "Gruppspel");
      if (!team) return;
      const key = fold(group) + "::" + fold(team);
      if (!map.has(key)) {
        map.set(key, { team: team, group: group || "Gruppspel" });
      }
    });
    return Array.from(map.values()).sort(function (a, b) {
      return compareGroupNames(a.group, b.group) || a.team.localeCompare(b.team, "sv");
    });
  }

  function getStatRows(source, key) {
    const mode = key || "all";
    if (!source) return [];
    if (Array.isArray(source)) return filterStatRowsByMode(source, mode);
    if (mode !== "all") {
      if (Array.isArray(source[mode])) return source[mode];
      if (Array.isArray(source[mode + "Stats"])) return source[mode + "Stats"];
      return [];
    }
    return Object.values(source).filter(Array.isArray).flat();
  }

  function filterStatRowsByMode(rows, mode) {
    if (mode === "all") return rows;
    const hasStage = rows.some(function (row) {
      return row && (row.stage || row.group || row.gameType || row.matchType);
    });
    if (!hasStage) return mode === "group" ? rows : [];
    return rows.filter(function (row) {
      return normalizeStage(row.stage || row.group || row.gameType || row.matchType) === mode;
    });
  }

  function buildTeams(cups) {
    const map = new Map();
    cups.forEach(function (cup) {
      cup.matches.forEach(function (match) {
        ingestTeam(map, match.awayTeam, cup, match, true);
        ingestTeam(map, match.homeTeam, cup, match, false);
      });
      (cup.rosterRows || []).forEach(function (row) {
        ingestRosterTeam(map, row.team, cup);
      });
      (cup.groupRows || []).forEach(function (row) {
        ingestRosterTeam(map, row.team, cup);
      });
    });
    return Array.from(map.values()).sort(function (a, b) {
      return b.matches - a.matches || a.name.localeCompare(b.name, "sv");
    });
  }

  function ingestRosterTeam(map, name, cup) {
    if (!name) return;
    if (!map.has(name)) {
      map.set(name, { name: name, cupsSet: new Set(), cups: 0, matches: 0, wins: 0, goalsFor: 0, goalsAgainst: 0 });
    }
    const team = map.get(name);
    team.cupsSet.add(cup.id);
    team.cups = team.cupsSet.size;
  }

  function ingestTeam(map, name, cup, match, away) {
    if (!map.has(name)) {
      map.set(name, { name: name, cupsSet: new Set(), cups: 0, matches: 0, wins: 0, goalsFor: 0, goalsAgainst: 0 });
    }
    const team = map.get(name);
    const goalsFor = number(away ? match.awayScore : match.homeScore);
    const goalsAgainst = number(away ? match.homeScore : match.awayScore);
    team.cupsSet.add(cup.id);
    team.cups = team.cupsSet.size;
    team.matches += 1;
    team.goalsFor += goalsFor;
    team.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) team.wins += 1;
  }

  function buildPlayers(cups) {
    const map = new Map();
    cups.forEach(function (cup) {
      const seenCupTeams = new Set();
      const rows = getCupProfilePlayerRows(cup);
      rows.forEach(function (row) {
        const key = fold(row.name);
        seenCupTeams.add(getProfileRosterKey(row, cup));
        if (!map.has(key)) {
          map.set(key, { name: row.name, team: row.team, gp: 0, g: 0, a: 0, pts: 0, pim: 0, cups: new Set(), teams: new Set(), rows: [] });
        }
        const player = map.get(key);
        player.playerId = player.playerId || row.playerId || "";
        if (!player.team && row.team) player.team = row.team;
        player.gp += row.gp;
        player.g += row.g;
        player.a += row.a;
        player.pts += row.pts;
        player.pim += row.pim;
        player.cups.add(cup.code);
        player.teams.add(row.team);
        player.rows.push(Object.assign({}, row, {
          cupId: cup.id,
          cupCode: cup.code,
          sortOrder: cup.sortOrder,
          cupStartTimestamp: cup.cupStartTimestamp,
          cupEndTimestamp: cup.cupEndTimestamp,
          cupSortTimestamp: cup.cupSortTimestamp
        }));
      });
      (cup.rosterRows || []).filter(function (row) {
        return !isGoalieRosterRole(row.role) && row.name && row.team && !seenCupTeams.has(getProfileRosterKey(row, cup));
      }).forEach(function (row) {
        const key = fold(row.name);
        if (!map.has(key)) {
          map.set(key, { name: row.name, team: row.team, gp: 0, g: 0, a: 0, pts: 0, pim: 0, cups: new Set(), teams: new Set(), rows: [] });
        }
        const player = map.get(key);
        player.playerId = player.playerId || row.playerId || "";
        if (!player.team && row.team) player.team = row.team;
        player.cups.add(cup.code);
        player.teams.add(row.team);
        player.rows.push(enrichProfileCupRow({
          name: row.name,
          team: row.team,
          playerId: row.playerId || "",
          gp: 0,
          g: 0,
          a: 0,
          pts: 0,
          pim: 0,
          stage: "roster",
          role: row.role || "Registrerad"
        }, cup));
      });
    });
    return Array.from(map.values()).sort(sortPlayers);
  }

  function buildGoalies(cups) {
    const map = new Map();
    cups.forEach(function (cup) {
      const seenCupTeams = new Set();
      const rows = getCupProfileGoalieRows(cup);
      rows.forEach(function (row) {
        const key = fold(row.name);
        seenCupTeams.add(getProfileRosterKey(row, cup));
        if (!map.has(key)) {
          map.set(key, { name: row.name, team: row.team, gp: 0, sa: 0, ga: 0, sv: 0, svp: 0, gaa: 0, so: 0, cups: new Set(), teams: new Set(), rows: [] });
        }
        const goalie = map.get(key);
        goalie.playerId = goalie.playerId || row.playerId || "";
        if (!goalie.team && row.team) goalie.team = row.team;
        goalie.gp += number(row.gp);
        goalie.sa += number(row.sa);
        goalie.ga += number(row.ga);
        goalie.sv += number(row.sv);
        goalie.so += number(row.so);
        goalie.cups.add(cup.code);
        goalie.teams.add(row.team);
        goalie.rows.push(Object.assign({}, row, {
          cupId: cup.id,
          cupCode: cup.code,
          sortOrder: cup.sortOrder,
          cupStartTimestamp: cup.cupStartTimestamp,
          cupEndTimestamp: cup.cupEndTimestamp,
          cupSortTimestamp: cup.cupSortTimestamp
        }));
      });
      (cup.rosterRows || []).filter(function (row) {
        return isGoalieRosterRole(row.role) && row.name && row.team && !seenCupTeams.has(getProfileRosterKey(row, cup));
      }).forEach(function (row) {
        const key = fold(row.name);
        if (!map.has(key)) {
          map.set(key, { name: row.name, team: row.team, gp: 0, sa: 0, ga: 0, sv: 0, svp: 0, gaa: 0, so: 0, cups: new Set(), teams: new Set(), rows: [] });
        }
        const goalie = map.get(key);
        goalie.playerId = goalie.playerId || row.playerId || "";
        if (!goalie.team && row.team) goalie.team = row.team;
        goalie.cups.add(cup.code);
        goalie.teams.add(row.team);
        goalie.rows.push(enrichProfileCupRow({
          name: row.name,
          team: row.team,
          playerId: row.playerId || "",
          gp: 0,
          sa: 0,
          ga: 0,
          sv: 0,
          svp: 0,
          gaa: 0,
          so: 0,
          stage: "roster",
          role: row.role || "Registrerad"
        }, cup));
      });
    });
    return Array.from(map.values()).map(finalizeGoalie).sort(sortGoalies);
  }

  function getProfileRosterKey(row, cup) {
    return fold(row?.name || row?.player || "") + "::" + text(cup?.id || "") + "::" + fold(row?.team || "");
  }

  function isGoalieRosterRole(role) {
    const value = fold(role);
    return value.includes("malvakt") || value.includes("goalie");
  }

  function getCupProfilePlayerRows(cup) {
    const staged = []
      .concat((cup.playerStageRows?.group || []).map(function (row) { return Object.assign({}, row, { stage: "group" }); }))
      .concat((cup.playerStageRows?.playin || []).map(function (row) { return Object.assign({}, row, { stage: "playin" }); }))
      .concat((cup.playerStageRows?.playoffs || []).map(function (row) { return Object.assign({}, row, { stage: "playoffs" }); }));
    return (staged.length ? staged : (cup.playerRows && cup.playerRows.length ? cup.playerRows : collectCupPlayers(cup))).map(function (row) {
      return enrichProfileCupRow(row, cup);
    });
  }

  function getCupProfileGoalieRows(cup) {
    const staged = []
      .concat((cup.goalieStageRows?.group || []).map(function (row) { return Object.assign({}, row, { stage: "group" }); }))
      .concat((cup.goalieStageRows?.playin || []).map(function (row) { return Object.assign({}, row, { stage: "playin" }); }))
      .concat((cup.goalieStageRows?.playoffs || []).map(function (row) { return Object.assign({}, row, { stage: "playoffs" }); }));
    return (staged.length ? staged : (cup.goalieRows && cup.goalieRows.length ? cup.goalieRows : collectCupGoalies(cup))).map(function (row) {
      return enrichProfileCupRow(row, cup);
    });
  }

  function enrichProfileCupRow(row, cup) {
    return Object.assign({}, row, {
      cupId: cup.id,
      cupCode: cup.code,
      sortOrder: cup.sortOrder,
      cupStartTimestamp: cup.cupStartTimestamp,
      cupEndTimestamp: cup.cupEndTimestamp,
      cupSortTimestamp: cup.cupSortTimestamp
    });
  }

  function buildTeamGoalies(teamName) {
    const map = new Map();
    state.cups.forEach(function (cup) {
      cup.goalieRows.filter(function (row) {
        return row.team === teamName;
      }).forEach(function (row) {
        const key = fold(row.name);
        if (!map.has(key)) {
          map.set(key, { name: row.name, team: teamName, gp: 0, sa: 0, ga: 0, sv: 0, so: 0, cups: new Set() });
        }
        const target = map.get(key);
        target.gp += row.gp;
        target.sa += row.sa;
        target.ga += row.ga;
        target.sv += row.sv;
        target.so += row.so;
        target.cups.add(cup.code);
      });
    });
    return Array.from(map.values()).map(finalizeGoalie).sort(sortGoalies);
  }

  function bindInteractions() {
    const navSearch = document.querySelector("[data-main-search]");
    if (navSearch) {
      navSearch.addEventListener("click", function () {
        const searchInput = document.querySelector("[data-global-search]");
        if (searchInput) searchInput.focus();
      });
    }
    document.querySelectorAll("[data-main-dropdown]").forEach(function (dropdown) {
      const button = dropdown.querySelector("[data-main-dropdown-button]");
      if (!button) return;
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        const isOpen = dropdown.classList.toggle("open");
        button.setAttribute("aria-expanded", String(isOpen));
      });
    });
    if (!document.body.dataset.mainNavEvents) {
      document.addEventListener("click", closeMainNavMenus);
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeMainNavMenus();
      });
      document.body.dataset.mainNavEvents = "true";
    }
    const input = document.querySelector("[data-global-search]");
    if (input) {
      input.addEventListener("input", function () {
        state.query = input.value;
        render();
        const nextInput = document.querySelector("[data-global-search]");
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }
    const mobileMainNav = document.querySelector("[data-mobile-main-nav]");
    if (mobileMainNav) {
      mobileMainNav.addEventListener("change", function () {
        if (mobileMainNav.value) location.href = mobileMainNav.value;
      });
    }
    document.querySelectorAll("[data-search-hit]").forEach(function (link) {
      link.addEventListener("click", function () {
        state.query = "";
      });
    });
    const summerSignupSearch = document.querySelector("[data-summer-signup-search]");
    if (summerSignupSearch) {
      summerSignupSearch.addEventListener("input", function () {
        state.summerSignupQuery = summerSignupSearch.value;
        syncSummerSignupRoute();
        render();
        const nextInput = document.querySelector("[data-summer-signup-search]");
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }
    const summerSignupDivision = document.querySelector("[data-summer-signup-division]");
    if (summerSignupDivision) {
      summerSignupDivision.addEventListener("change", function () {
        state.summerSignupDivision = normalizeSummerSignupDivision(summerSignupDivision.value);
        syncSummerSignupRoute();
        render();
      });
    }
    const summerSignupRole = document.querySelector("[data-summer-signup-role]");
    if (summerSignupRole) {
      summerSignupRole.addEventListener("change", function () {
        state.summerSignupRole = normalizeSummerSignupRole(summerSignupRole.value);
        syncSummerSignupRoute();
        render();
      });
    }
    const summerSignupCaptain = document.querySelector("[data-summer-signup-captain]");
    if (summerSignupCaptain) {
      summerSignupCaptain.addEventListener("change", function () {
        state.summerSignupCaptain = normalizeSummerSignupCaptain(summerSignupCaptain.value);
        syncSummerSignupRoute();
        render();
      });
    }
    const summerSignupClear = document.querySelector("[data-summer-signup-clear]");
    if (summerSignupClear) {
      summerSignupClear.addEventListener("click", function () {
        state.summerSignupQuery = "";
        state.summerSignupDivision = "all";
        state.summerSignupRole = "all";
        state.summerSignupCaptain = "all";
        syncSummerSignupRoute();
        render();
      });
    }
    const teamFilter = document.querySelector("[data-cup-team-filter]");
    if (teamFilter) {
      teamFilter.addEventListener("change", function () {
        const cupId = teamFilter.dataset.cupId || state.activeCupId;
        const team = teamFilter.value;
        const params = new URLSearchParams();
        if (team) params.set("team", team);
        if (state.activeCupMatchStatus !== "all") params.set("status", state.activeCupMatchStatus);
        const query = params.toString();
        location.hash = "#/cups/" + encodeURIComponent(cupId) + "/matches" + (query ? "?" + query : "");
      });
    }
    document.querySelectorAll("[data-standing-sort]").forEach(function (button) {
      button.addEventListener("click", function () {
        sortStandingTable(button);
      });
    });
    const adminUnlockButton = document.querySelector("[data-admin-unlock]");
    if (adminUnlockButton) {
      adminUnlockButton.addEventListener("click", handleAdminUnlockClick);
    }
    const adminUpdateButton = document.querySelector("[data-admin-update]");
    if (adminUpdateButton) {
      adminUpdateButton.addEventListener("click", handleAdminUpdateClick);
    }
  }

  async function handleAdminUnlockClick() {
    const adminKey = window.prompt("Admin-l\u00f6senord:");
    if (!adminKey) return;
    const endpoint = text(window.SEC_CONFIG?.manualUpdateEndpointUrl || "");
    if (!endpoint) {
      state.adminUpdateKey = adminKey;
      state.adminUpdateVisible = true;
      state.adminUpdateStatus = "Admin uppl\u00e5st.";
      render();
      return;
    }
    try {
      const body = new URLSearchParams();
      body.set("key", adminKey);
      body.set("action", "check");
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        body: body
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Fel l\u00f6senord." : "HTTP " + response.status);
      state.adminUpdateKey = adminKey;
      state.adminUpdateVisible = true;
      state.adminUpdateStatus = "Admin uppl\u00e5st.";
      render();
    } catch (error) {
      state.adminUpdateKey = "";
      state.adminUpdateVisible = false;
      window.alert(error.message || "Fel l\u00f6senord.");
    }
  }
  async function handleAdminUpdateClick(event) {
    const button = event.currentTarget;
    const endpoint = text(window.SEC_CONFIG?.manualUpdateEndpointUrl || "");
    if (!endpoint) {
      window.open(button.dataset.workflowUrl || "https://github.com/sweehockey-svg/SEC/actions/workflows/update-database-cups.yml", "_blank", "noopener");
      return;
    }
    const adminKey = state.adminUpdateKey || window.prompt("Admin-l\u00f6senord:");
    if (!adminKey) return;
    button.disabled = true;
    state.adminUpdateStatus = "Startar uppdatering...";
    render();
    try {
      const body = new URLSearchParams();
      body.set("key", adminKey);
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        body: body
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      state.adminUpdateStatus = "Uppdatering startad.";
    } catch (error) {
      state.adminUpdateStatus = "Kunde inte starta: " + (error.message || String(error));
    }
    render();
  }

  function closeMainNavMenus() {
    document.querySelectorAll("[data-main-dropdown]").forEach(function (dropdown) {
      dropdown.classList.remove("open");
      const button = dropdown.querySelector("[data-main-dropdown-button]");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  }

  function sortStandingTable(button) {
    const table = button.closest("table");
    const tbody = table?.querySelector("tbody");
    if (!table || !tbody) return;
    const key = button.dataset.standingSort || "rank";
    const type = button.dataset.sortType || "number";
    const currentKey = table.dataset.sortKey || "rank";
    const currentDir = table.dataset.sortDir || "asc";
    const defaultDir = type === "text" || key === "rank" ? "asc" : "desc";
    const direction = currentKey === key ? (currentDir === "desc" ? "asc" : "desc") : defaultDir;
    table.dataset.sortKey = key;
    table.dataset.sortDir = direction;
    table.querySelectorAll("[data-standing-sort]").forEach(function (sortButton) {
      sortButton.classList.toggle("active", sortButton === button);
      sortButton.dataset.sortDir = sortButton === button ? direction : "";
    });
    const rows = Array.from(tbody.querySelectorAll("tr")).sort(function (left, right) {
      const leftValue = left.dataset[key] || "";
      const rightValue = right.dataset[key] || "";
      if (type === "text") {
        return direction === "asc"
          ? leftValue.localeCompare(rightValue, "sv")
          : rightValue.localeCompare(leftValue, "sv");
      }
      const diff = number(leftValue) - number(rightValue);
      return direction === "asc" ? diff : -diff;
    });
    rows.forEach(function (row, index) {
      const rankCell = row.querySelector(".rankCell");
      if (rankCell) rankCell.textContent = String(index + 1);
      tbody.appendChild(row);
    });
  }

  function sortPlayers(a, b) {
    return b.pts - a.pts || b.g - a.g || a.name.localeCompare(b.name, "sv");
  }

  function finalizeGoalie(goalie) {
    const sa = number(goalie.sa);
    const sv = number(goalie.sv);
    const ga = number(goalie.ga);
    const gp = number(goalie.gp);
    goalie.svp = sa ? sv / sa : 0;
    goalie.gaa = gp ? ga / gp : 0;
    return goalie;
  }

  function sortGoalies(a, b) {
    return b.svp - a.svp || b.sv - a.sv || b.gp - a.gp || a.name.localeCompare(b.name, "sv");
  }

  function compareMatches(a, b) {
    return parseDate(b.date, b.time) - parseDate(a.date, a.time);
  }

  function parseDate(date, time) {
    const value = Date.parse([date, time].filter(Boolean).join(" "));
    return Number.isFinite(value) ? value : 0;
  }

  function getCupDateMeta(matches, cup, index) {
    const timestamps = (matches || []).map(function (match) {
      return parseDate(match.date, match.time);
    }).filter(function (value) {
      return value > 0;
    });
    const fallback = typeof cup.sortOrder === "number" ? cup.sortOrder : index;
    if (!timestamps.length) {
      return {
        startTimestamp: 0,
        endTimestamp: 0,
        sortTimestamp: 0,
        fallbackSort: fallback
      };
    }
    return {
      startTimestamp: Math.min.apply(Math, timestamps),
      endTimestamp: Math.max.apply(Math, timestamps),
      sortTimestamp: Math.max.apply(Math, timestamps),
      fallbackSort: fallback
    };
  }

  function compareCupsByDate(a, b) {
    const upcomingDiff = Number(isUpcomingCup(b)) - Number(isUpcomingCup(a));
    if (upcomingDiff) return upcomingDiff;
    const dateDiff = number(b.cupSortTimestamp) - number(a.cupSortTimestamp);
    if (dateDiff) return dateDiff;
    return number(b.sortOrder) - number(a.sortOrder);
  }

  function compareCupRowsByDate(a, b) {
    const upcomingDiff = Number(isUpcomingCup(b)) - Number(isUpcomingCup(a));
    if (upcomingDiff) return upcomingDiff;
    const dateDiff = number(b.cupSortTimestamp) - number(a.cupSortTimestamp);
    if (dateDiff) return dateDiff;
    return number(b.sortOrder) - number(a.sortOrder);
  }

  function isUpcomingCup(cup) {
    return !number(cup.cupSortTimestamp) && number(cup.matchCount) === 0 && (cup.teams || []).length > 0;
  }

  function compareProfileRowsByDate(a, b) {
    const cupDiff = compareCupRowsByDate(a, b);
    if (cupDiff) return cupDiff;
    return stageSortValue(a.stage) - stageSortValue(b.stage);
  }

  function stageSortValue(stage) {
    if (isRosterStage(stage)) return -1;
    const normalized = normalizeStage(stage);
    return normalized === "playoffs" ? 2 : normalized === "playin" ? 1 : 0;
  }

  function formatStageLabel(stage) {
    if (isRosterStage(stage)) return "Registrerad";
    const normalized = normalizeStage(stage);
    return normalized === "playoffs" ? "Slutspel" : normalized === "playin" ? "Play in" : "Gruppspel";
  }

  function isRosterStage(stage) {
    const value = fold(stage);
    return value === "roster" || value === "registrerad";
  }

  function formatDate(value) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return value || "Datum saknas";
    return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "short", day: "numeric" }).format(parsed);
  }

  function formatClock() {
    return new Intl.DateTimeFormat("sv-SE", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
  }

  function formatCupDateRange(cup) {
    const start = number(cup.cupStartTimestamp);
    const end = number(cup.cupEndTimestamp);
    if (!start && !end) return "Datum saknas";
    if (!start || start === end) return formatTimestampDate(end || start);
    return formatTimestampDate(start) + " - " + formatTimestampDate(end);
  }

  function formatTimestampDate(timestamp) {
    return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "short", day: "numeric" }).format(new Date(timestamp));
  }

  function score(match) {
    if (match.awayScore === null || match.homeScore === null) return "VS";
    const suffix = match.overtime ? " OT" : "";
    return display(match.awayScore) + "-" + display(match.homeScore) + suffix;
  }

  function isPlayedMatch(match) {
    return nullableNumber(match && match.awayScore) !== null && nullableNumber(match && match.homeScore) !== null;
  }

  function isWalkoverMatch(match) {
    if (!match) return false;
    const marker = fold([
      match.status,
      match.matchStatus,
      match.resultType,
      match.result,
      match.notes,
      match.comment,
      match.label,
      match.gameType
    ].filter(Boolean).join(" "));
    if (marker.includes("walkover") || marker.includes("walk over") || /\bwo\b/.test(marker)) return true;

    const awayScore = nullableNumber(match.awayScore);
    const homeScore = nullableNumber(match.homeScore);
    const hasWalkoverScore = (awayScore === 5 && homeScore === 0) || (awayScore === 0 && homeScore === 5);
    if (!hasWalkoverScore) return false;

    const hasPlayerStats = (Array.isArray(match.players) && match.players.length > 0)
      || (Array.isArray(match.playerStats) && match.playerStats.length > 0)
      || (Array.isArray(match.participants) && match.participants.length > 0);
    const hasGoalieStats = (Array.isArray(match.goalies) && match.goalies.length > 0)
      || (Array.isArray(match.goalieStats) && match.goalieStats.length > 0);
    const summary = text(match.goalsSummary || match.eventsSummary || match.summary);
    return !hasPlayerStats && !hasGoalieStats && !summary;
  }

  function getMatchContextLabel(match) {
    const label = isPlayoffMatch(match) ? normalizeRound(match.group || match.stage || "Slutspel") : (match.group || match.stage || "Match");
    return [isWalkoverMatch(match) ? "WO" : "", label].filter(Boolean).join(" Â· ");
  }

  function formatPercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return "0.0";
    return (parsed * 100).toFixed(1);
  }

  function formatDecimal(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
  }

  function display(value) {
    return value === null || value === undefined ? "?" : String(value);
  }

  function isSummer(cup) {
    return fold(cup.name + " " + cup.code).includes("sommar");
  }

  function normalizeRound(value) {
    const folded = fold(value);
    if (folded.includes("final") && !folded.includes("semi")) return "Final";
    if (folded.includes("semi")) return "Semifinal";
    if (folded.includes("kvart")) return "Kvartsfinal";
    if (folded.includes("atton") || folded.includes("ÃƒÆ’Ã‚Â¥tton") || folded.includes("16")) return "ÃƒÆ’Ã¢â‚¬Â¦ttondelsfinal";
    if (folded.includes("playoff") || folded.includes("slutspel") || /^round\b/.test(folded)) return "Slutspel";
    return value || "Slutspel";
  }

  function roundRank(round) {
    const folded = fold(round);
    if (folded.includes("play in") || folded.includes("playin")) return 0;
    if (folded.includes("atton")) return 1;
    if (folded.includes("kvart")) return 2;
    if (folded.includes("semi")) return 3;
    if (folded.includes("final")) return 4;
    return 9;
  }

  function nullableNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function text(value) {
    return fixEncoding(String(value || "").trim());
  }

  function fold(value) {
    return text(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function removeDiacritics(value) {
    return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getUrlSlug(value) {
    return removeDiacritics(value)
      .replace(/&/g, " och ")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "okant";
  }

  function getRouteLookupKey(value) {
    return getUrlSlug(value).toLowerCase();
  }

  function normalizeLogoKey(value) {
    return removeDiacritics(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function toTitleCase(value) {
    return String(value || "").replace(/[^\s_-]+/g, function (part) {
      return part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase();
    });
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const output = [];
    (values || []).forEach(function (value) {
      const clean = String(value || "").trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      output.push(clean);
    });
    return output;
  }

  function fixEncoding(value) {
    let output = String(value || "");
    for (let pass = 0; pass < 3 && /[\u00c3\u00c2\u00e2]/.test(output); pass += 1) {
      try {
        const encoded = Array.from(output).map(function (char) {
          const code = cp1252Byte(char);
          if (code !== null) return "%" + code.toString(16).padStart(2, "0");
          return encodeURIComponent(char);
        }).join("");
        const decoded = decodeURIComponent(encoded);
        if (decoded === output) break;
        output = decoded;
      } catch (_error) {
        break;
      }
    }
    return output
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u00a0/g, " ")
      .replace(/[\u2302\u25c6\u25a6\u25cf\u21af\u25a3]/g, "");
  }

  function cp1252Byte(char) {
    const code = char.charCodeAt(0);
    if (code <= 255) return code;
    const map = {
      0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
      0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
      0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
      0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
      0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
      0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
      0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f
    };
    return Object.prototype.hasOwnProperty.call(map, code) ? map[code] : null;
  }

  function escapeHtml(value) {
    return fixEncoding(String(value ?? ""))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function repairRenderedText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      const fixed = fixEncoding(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    });
    root.querySelectorAll("[placeholder], [aria-label], [title], [alt]").forEach(function (node) {
      ["placeholder", "aria-label", "title", "alt"].forEach(function (attribute) {
        if (!node.hasAttribute(attribute)) return;
        const value = node.getAttribute(attribute);
        const fixed = fixEncoding(value);
        if (fixed !== value) node.setAttribute(attribute, fixed);
      });
    });
  }
})();
