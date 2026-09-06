/*
  Svensk eHockey
  HASH SPA v3 – SINGLE APP

  Den här filen innehåller:
  - hash-router
  - laghistorik
  - spelarregister
  - spelarprofil
  - lagprofil
  - lag i turnering
  - turneringsöversikt
  - säsongsrouting

  config.js ligger separat med Supabase URL + publishable key.
*/

"use strict";


/* ============================================================
   GOOGLE ANALYTICS 4 / CONSENT
   Measurement ID: G-QJ6VHZ2339
   ============================================================ */
function SEH_getAnalyticsConsent() {
  try {
    return localStorage.getItem("seh_analytics_consent");
  } catch (error) {
    return null;
  }
}

let SEH_lastTrackedPageLocation = "";

function SEH_setAnalyticsConsent(choice) {
  const granted = choice === "granted";

  try {
    localStorage.setItem(
      "seh_analytics_consent",
      granted ? "granted" : "denied"
    );
  } catch (error) {
    /* Sidan fungerar även om localStorage är avstängt. */
  }

  window.SEH_ANALYTICS_CHOICE = granted ? "granted" : "denied";
  window.SEH_ANALYTICS_ALLOWED = granted;

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }

  document.querySelector("#sehAnalyticsConsent")?.remove();
}

function SEH_trackPageView(force = false) {
  if (
    typeof window.gtag !== "function" ||
    !window.SEH_GA_ID
  ) {
    return;
  }

  const pageLocation = `${location.origin}${location.pathname}${location.search}${location.hash || "#/"}`;
  if (!force && pageLocation === SEH_lastTrackedPageLocation) {
    return;
  }
  SEH_lastTrackedPageLocation = pageLocation;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: pageLocation,
    page_path: `${location.pathname}${location.search}${location.hash || "#/"}`,
    seh_route: location.hash || "#/"
  });
}

function SEH_renderAnalyticsConsent() {
  if (SEH_getAnalyticsConsent() !== null) {
    return;
  }

  document.querySelector("#sehAnalyticsConsent")?.remove();

  const banner = document.createElement("aside");
  banner.id = "sehAnalyticsConsent";
  banner.className = "seh-consent";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Val för besöksstatistik");
  banner.innerHTML = `
    <div class="seh-consent__copy">
      <strong>Besöksstatistik</strong>
      <p>Vi använder anonym besöksstatistik för att se vad som är mest populärt på Svensk eHockey. Vi följer inte vem du är eller exakt vad just du gör, utan använder statistiken för att få en helhetsbild och kunna lägga mer fokus på det innehåll som faktiskt används.</p>
    </div>
    <div class="seh-consent__actions">
      <button type="button" class="seh-consent__button seh-consent__button--secondary" data-seh-consent="denied">Endast nödvändiga</button>
      <button type="button" class="seh-consent__button seh-consent__button--primary" data-seh-consent="granted">Tillåt statistik</button>
    </div>
  `;

  banner.addEventListener("click", (event) => {
    const button = event.target.closest("[data-seh-consent]");
    if (!button) return;
    SEH_setAnalyticsConsent(button.dataset.sehConsent);
  });

  document.body.appendChild(banner);
}



/* ============================================================
   GLOBAL COUNTRY FLAGS
   Lokala SVG-flaggor används i hela SPA:n. Windows/Chrome visar annars
   regional-indicator-emojis som text (t.ex. "SE" och "FI") i stället för
   riktiga flaggor.
   ============================================================ */
function SEH_normalizeCountryCode(code) {
  const raw = String(code || "").trim().toUpperCase();
  const aliases = {
    SWE: "SE", FIN: "FI", NOR: "NO", DEN: "DK", GER: "DE",
    BEL: "BE", LET: "LV", LAT: "LV", CZE: "CZ", POL: "PL",
    RUS: "RU", GBR: "GB", WAL: "GB", AUT: "AT", SWI: "CH",
    NET: "NL", NED: "NL", USA: "US", CAN: "CA", FRA: "FR",
    EST: "EE", SVK: "SK", ISL: "IS"
  };
  return aliases[raw] || raw;
}

function SEH_flagSvgMarkup(code) {
  const c = SEH_normalizeCountryCode(code);
  const svg = {
    SE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#006aa7"/><rect x="5" width="2" height="10" fill="#fecc00"/><rect y="4" width="16" height="2" fill="#fecc00"/></svg>`,
    FI: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#fff"/><rect x="5" width="2" height="10" fill="#003580"/><rect y="4" width="16" height="2" fill="#003580"/></svg>`,
    NO: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 16"><rect width="22" height="16" fill="#ba0c2f"/><rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="22" height="4" fill="#fff"/><rect x="7" width="2" height="16" fill="#00205b"/><rect y="7" width="22" height="2" fill="#00205b"/></svg>`,
    DK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 14"><rect width="18" height="14" fill="#c60c30"/><rect x="5" width="2" height="14" fill="#fff"/><rect y="6" width="18" height="2" fill="#fff"/></svg>`,
    DE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 9"><rect width="15" height="3" y="0" fill="#000"/><rect width="15" height="3" y="3" fill="#dd0000"/><rect width="15" height="3" y="6" fill="#ffce00"/></svg>`,
    BE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 13"><rect width="5" height="13" fill="#000"/><rect x="5" width="5" height="13" fill="#ffd90c"/><rect x="10" width="5" height="13" fill="#ef3340"/></svg>`,
    LV: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 10"><rect width="18" height="10" fill="#9e3039"/><rect y="4" width="18" height="2" fill="#fff"/></svg>`,
    CZ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 12"><rect width="18" height="6" fill="#fff"/><rect y="6" width="18" height="6" fill="#d7141a"/><path d="M0 0L9 6 0 12z" fill="#11457e"/></svg>`,
    PL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="5" fill="#fff"/><rect y="5" width="16" height="5" fill="#dc143c"/></svg>`,
    RU: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 9"><rect width="15" height="3" fill="#fff"/><rect y="3" width="15" height="3" fill="#0039a6"/><rect y="6" width="15" height="3" fill="#d52b1e"/></svg>`,
    NL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 9"><rect width="15" height="3" fill="#ae1c28"/><rect y="3" width="15" height="3" fill="#fff"/><rect y="6" width="15" height="3" fill="#21468b"/></svg>`,
    AT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 9"><rect width="15" height="3" fill="#ed2939"/><rect y="3" width="15" height="3" fill="#fff"/><rect y="6" width="15" height="3" fill="#ed2939"/></svg>`,
    CH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><rect width="12" height="12" fill="#d52b1e"/><path fill="#fff" d="M5 2h2v3h3v2H7v3H5V7H2V5h3z"/></svg>`,
    FR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 10"><rect width="5" height="10" fill="#0055a4"/><rect x="5" width="5" height="10" fill="#fff"/><rect x="10" width="5" height="10" fill="#ef4135"/></svg>`,
    EE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 9"><rect width="15" height="3" fill="#4891d9"/><rect y="3" width="15" height="3" fill="#000"/><rect y="6" width="15" height="3" fill="#fff"/></svg>`,
    SK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 9"><rect width="15" height="3" fill="#fff"/><rect y="3" width="15" height="3" fill="#0b4ea2"/><rect y="6" width="15" height="3" fill="#ee1c25"/></svg>`,
    GB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12"><rect width="20" height="12" fill="#012169"/><path d="M0 0l20 12M20 0L0 12" stroke="#fff" stroke-width="2.4"/><path d="M0 0l20 12M20 0L0 12" stroke="#c8102e" stroke-width="1"/><path d="M10 0v12M0 6h20" stroke="#fff" stroke-width="4"/><path d="M10 0v12M0 6h20" stroke="#c8102e" stroke-width="2.2"/></svg>`,
    US: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 10"><rect width="19" height="10" fill="#fff"/><path stroke="#b22234" stroke-width="1" d="M0 .5h19M0 2.5h19M0 4.5h19M0 6.5h19M0 8.5h19"/><rect width="8" height="5.4" fill="#3c3b6e"/></svg>`,
    CA: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect width="20" height="10" fill="#fff"/><rect width="5" height="10" fill="#d80621"/><rect x="15" width="5" height="10" fill="#d80621"/><path d="M10 2l.7 1.8 1.8-.5-1 1.5 1.2.7-2 .5.2 2H9.1l.2-2-2-.5 1.2-.7-1-1.5 1.8.5z" fill="#d80621"/></svg>`
  }[c];
  return svg || "";
}

function SEH_countryFlagDataUri(code) {
  const svg = SEH_flagSvgMarkup(code);
  return svg ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` : "";
}

function SEH_createCountryFlag(code, extraClass = "") {
  const normalized = SEH_normalizeCountryCode(code);
  const flag = document.createElement("span");
  flag.className = `seh-country-flag${extraClass ? ` ${extraClass}` : ""}`;
  flag.setAttribute("aria-label", normalized || "Okänt land");
  flag.setAttribute("role", "img");

  const dataUri = SEH_countryFlagDataUri(normalized);
  if (dataUri) {
    flag.style.backgroundImage = `url("${dataUri}")`;
  } else {
    flag.classList.add("seh-country-flag--fallback");
    flag.textContent = normalized.slice(0, 2) || "?";
  }
  return flag;
}

function SEH_appendFlaggedText(container, code, text) {
  container.append(
    SEH_createCountryFlag(code),
    document.createTextNode(` ${String(text || "")}`)
  );
  return container;
}

function SEH_tableSeasonLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const replacements = [
    [/^European Championship League\b/i, "ECL"],
    [/^Finnish Championship League\b/i, "FCL"],
    [/^Swedish Championship League\b/i, "SCL"],
    [/^German Championship League\b/i, "GCL"]
  ];
  for (const [pattern, abbreviation] of replacements) {
    if (pattern.test(raw)) return raw.replace(pattern, abbreviation);
  }
  return raw;
}

function SEH_initHistory() {
  /* ======================================================
     ROUTE CONTROLLER: history
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const APP_BUILD = "2026-09-02-v12857-season-teams-history-style";
    const PAGE_SIZE = 1000;
  
    const state = {
      teams: [],
      tournaments: [],
      players: [],
      filteredTeams: [],
      loadedAt: null,
      playerDataAvailable: true
    };
  
    const elements = {
      setupNotice: document.querySelector("#setupNotice"),
      errorNotice: document.querySelector("#errorNotice"),
      errorMessage: document.querySelector("#errorMessage"),
      loadingState: document.querySelector("#loadingState"),
      teamGrid: document.querySelector("#teamGrid"),
      template: document.querySelector("#teamCardTemplate"),
      searchInput: document.querySelector("#searchInput"),
      nameModeSelect: document.querySelector("#nameModeSelect"),
      tournamentFilter: document.querySelector("#tournamentFilter"),
      headerSeasonSelect: document.querySelector("#headerSeasonSelect"),
      sortSelect: document.querySelector("#sortSelect"),
      viewModeSelect: document.querySelector("#viewModeSelect"),
      reloadButton: document.querySelector("#reloadButton"),
      historyYearCount: document.querySelector("#historyYearCount"),
      visibleTeamCount: document.querySelector("#visibleTeamCount"),
      appearanceCount: document.querySelector("#appearanceCount"),
      playerCount: document.querySelector("#playerCount"),
      resultText: document.querySelector("#resultText"),
      lastUpdated: document.querySelector("#lastUpdated")
    };
  
    const config = window.EHOCKEY_CONFIG || {};
    const numberFormatter = new Intl.NumberFormat("sv-SE");
  
    console.info("Svensk eHockey laghistoria build:", APP_BUILD);
  
    function hasValidConfig() {
      return (
        typeof config.supabaseUrl === "string" &&
        /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl.trim()) &&
        typeof config.supabasePublishableKey === "string" &&
        !config.supabasePublishableKey.includes("KLISTRA_IN") &&
        config.supabasePublishableKey.trim().length > 20
      );
    }
  
    function number(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  
    function nullableNumber(value) {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  
    function normalizeArray(value) {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
      if (typeof value === "string" && value.trim()) {
        return [value.trim()];
      }
      return [];
    }
  
    function cleanText(value) {
      return String(value || "").trim();
    }
  
    function normalizeCompetitionCode(value) {
      const code = cleanText(value).toUpperCase();
      if (code === "ESHL") return "ESHL";
      return code || "ÖVRIGT";
    }
  
    function competitionDisplay(code) {
      const normalized = normalizeCompetitionCode(code);
      const labels = {
        ECL: "ECL",
        SEC: "SEC",
        SCL: "SCL",
        ESHL: "eSHL",
        ITHL: "ITHL",
        LGEL: "LGEL",
        SM: "SM"
      };
      return labels[normalized] || normalized;
    }
  
    function normalizeDivision(value) {
      const raw = cleanText(value);
      if (!raw || raw === "–" || raw === "-") return "";
      const upper = raw.toUpperCase();
      const map = {
        ELITE: "ELITE",
        PRO: "PRO",
        LITE: "LITE",
        CORE: "CORE",
        NEO: "NEO",
        MAIN: "MAIN",
        SWEAT: "SWEAT",
        RAMMER: "RAMMER",
        QUALIFIER: "QUALIFIER",
        CHALLENGER: "CHALLENGER"
      };
      return map[upper] || upper;
    }
  
    function divisionDisplay(value) {
      const division = normalizeDivision(value);
      const map = {
        ELITE: "Elite",
        PRO: "Pro",
        LITE: "Lite",
        CORE: "Core",
        NEO: "Neo",
        MAIN: "Main",
        SWEAT: "Sweat",
        RAMMER: "Rammer",
        QUALIFIER: "Qualifier",
        CHALLENGER: "Challenger"
      };
      return map[division] || cleanText(value);
    }
  
    function tableSeasonLabel(value) {
      const raw = cleanText(value);
      if (!raw) return raw;

      const replacements = [
        [/^European Championship League\b/i, "ECL"],
        [/^Finnish Championship League\b/i, "FCL"],
        [/^Swedish Championship League\b/i, "SCL"],
        [/^German Championship League\b/i, "GCL"]
      ];

      for (const [pattern, abbreviation] of replacements) {
        if (pattern.test(raw)) return raw.replace(pattern, abbreviation);
      }

      return raw;
    }

    function meaningfulDivision(tournament) {
      const division = normalizeDivision(tournament.division);
      if (!division || division === "MAIN") return "";
      if (["SEC", "SCL", "ESHL", "LGEL", "SM"].includes(tournament.competitionCode)) {
        return "";
      }
      return division;
    }
  
    function normalizedSeasonLabel(value, competitionCode, leagueName, seasonNumber) {
      const code = normalizeCompetitionCode(competitionCode);
      const raw = cleanText(value || leagueName || seasonNumber);
      if (!raw) return "Okänd turnering";
  
      if (code === "SEC") {
        if (/^SEC(?:\s|$)/i.test(raw)) {
          return raw.replace(/^sec/i, "SEC");
        }
        if (/^\d+(?:\.\d+)?(?:\s+Challenger)?$/i.test(raw)) {
          return `SEC ${raw}`;
        }
      }
  
      return raw;
    }
  
    function normalizeTeam(row) {
      return {
        teamId: number(row.team_id),
        currentName: cleanText(row.current_name) || "Namnlöst lag",
        country: cleanText(row.effective_country).toUpperCase(),
        sportsGamerIds: normalizeArray(row.sports_gamer_team_ids),
        historicalNames: normalizeArray(row.historical_names),
        leagueNames: normalizeArray(row.names_used_in_leagues),
        leagueAppearances: number(row.league_appearances),
        firstRegisteredAt: cleanText(row.first_registered_at),
        lastRegisteredAt: cleanText(row.last_registered_at),
        logoPath: cleanText(row.logo_path),
        logoUrl: cleanText(row.logo_url),
        profileUrl: cleanText(row.profile_url),
        tournaments: [],
        players: [],
        stats: null
      };
    }
  
    function normalizeTournament(row) {
      const competitionCode = normalizeCompetitionCode(
        row.competition_code,
        row.competition_name,
        row.season_label,
        row.league_name
      );
      return {
        teamId: number(row.team_id),
        sportsGamerTeamId: cleanText(row.sports_gamer_team_id),
        currentName: cleanText(row.current_name),
        competitionCode,
        competitionName: cleanText(row.competition_name),
        seasonLabel: normalizedSeasonLabel(
          row.season_label,
          competitionCode,
          row.league_name,
          row.season_number
        ),
        seasonNumber: cleanText(row.season_number),
        seasonYear: nullableNumber(row.season_year),
        seasonPeriod: cleanText(row.season_period),
        startDate: cleanText(
          row.display_start_date || row.chronology_date || row.start_date
        ),
        endDate: cleanText(
          row.display_end_date || row.chronology_end_date || row.end_date ||
          row.display_start_date || row.chronology_date || row.start_date
        ),
        sortDate: cleanText(row.sort_date),
        chronologyDate: cleanText(row.chronology_date || row.display_start_date || row.sort_date),
        chronologyEndDate: cleanText(row.chronology_end_date || row.display_end_date),
        registeredAt: cleanText(row.registered_at),
        leagueId: number(row.league_id),
        externalLeagueId: cleanText(row.external_league_id),
        leagueName: cleanText(row.league_name),
        catalogDisplayName: cleanText(row.catalog_display_name),
        division: cleanText(row.division),
        divisionKey: cleanText(row.division_key),
        divisionRank: nullableNumber(row.division_rank),
        nameUsed: cleanText(row.name_used_in_tournament || row.current_name),
        gamesPlayed: number(row.games_played),
        wins: number(row.wins),
        losses: number(row.losses),
        overtimeWins: number(row.overtime_wins),
        overtimeLosses: number(row.overtime_losses),
        goalsFor: number(row.goals_for),
        goalsAgainst: number(row.goals_against),
        goalDiff: number(row.goal_diff),
        tablePoints: number(row.table_points),
        playoffGames: number(row.playoff_games),
        hasStatistics:
          row.has_statistics === true ||
          row.has_statistics === "true" ||
          number(row.games_played) > 0
      };
    }
  
    function normalizePlayer(row) {
      return {
        teamId: number(row.team_id),
        playerKey: cleanText(row.player_key),
        displayGamertag: cleanText(row.display_gamertag) || "Okänd spelare",
        totalPoints: number(row.total_points),
        careerGames: number(row.career_games),
        totalSkaterGames: number(row.total_skater_games),
        totalGoalieGames: number(row.total_goalie_games),
        playerType: cleanText(row.player_type) || "skater",
        lastAppearanceDate: cleanText(row.last_appearance_date)
      };
    }
  
    function createApiUrl(view, params) {
      const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
      return `${baseUrl}/rest/v1/${view}?${params.toString()}`;
    }
  
  
    const SUPABASE_RETRY_DELAYS = [0, 700, 1800];
  
    function wait(milliseconds) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });
    }
  
    function isRetryableSupabaseFailure(status, body, error) {
      if (error instanceof TypeError) return true;
      if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  
      const text = String(body || error?.message || "");
      return (
        text.includes('"code":"57014"') ||
        text.includes("statement timeout") ||
        text.includes("canceling statement due to statement timeout") ||
        text.includes("Failed to fetch")
      );
    }
  
    async function fetchSupabaseResponse(url, options, label) {
      let lastError = null;
  
      for (
        let attempt = 0;
        attempt < SUPABASE_RETRY_DELAYS.length;
        attempt += 1
      ) {
        if (SUPABASE_RETRY_DELAYS[attempt] > 0) {
          await wait(SUPABASE_RETRY_DELAYS[attempt]);
        }
  
        try {
          const response = await fetch(url, {
            cache: "no-store",
            ...options
          });
          const body = await response.text();
  
          if (response.ok) {
            return { response, body };
          }
  
          const error = new Error(
            `${label}: Supabase svarade ${response.status}. ${
              body || response.statusText
            }`
          );
  
          if (
            attempt < SUPABASE_RETRY_DELAYS.length - 1 &&
            isRetryableSupabaseFailure(response.status, body, error)
          ) {
            console.warn(
              `${label}: tillfälligt Supabase-fel, försök ${
                attempt + 2
              } av ${SUPABASE_RETRY_DELAYS.length}.`
            );
            lastError = error;
            continue;
          }
  
          return { response, body };
        } catch (error) {
          lastError = error;
  
          if (
            attempt < SUPABASE_RETRY_DELAYS.length - 1 &&
            isRetryableSupabaseFailure(0, "", error)
          ) {
            console.warn(
              `${label}: nätverksfel, försök ${
                attempt + 2
              } av ${SUPABASE_RETRY_DELAYS.length}.`
            );
            continue;
          }
  
          throw error;
        }
      }
  
      throw lastError || new Error(`${label}: hämtningen misslyckades.`);
    }
  
    function parseSupabaseArray(body, label) {
      let data;
  
      try {
        data = body ? JSON.parse(body) : [];
      } catch {
        throw new Error(`${label}: Supabase returnerade ogiltig JSON.`);
      }
  
      if (!Array.isArray(data)) {
        throw new Error(`${label}: Supabase returnerade ett oväntat svar.`);
      }
  
      return data;
    }
  
    async function fetchJson(view, params) {
      const { response, body } = await fetchSupabaseResponse(
        createApiUrl(view, params),
        {
          headers: {
            apikey: config.supabasePublishableKey.trim(),
            Accept: "application/json"
          }
        },
        view
      );
  
      if (!response.ok) {
        throw new Error(
          `${view}: Supabase svarade ${response.status}. ${
            body || response.statusText
          }`
        );
      }
  
      return parseSupabaseArray(body, view);
    }
  
  
    async function fetchAllPages(view, baseParams, normalizer) {
      const allRows = [];
      let offset = 0;
  
      while (true) {
        const params = new URLSearchParams(baseParams);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
  
        const rows = await fetchJson(view, params);
        allRows.push(...rows.map(normalizer));
  
        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
  
      return allRows;
    }
  
    async function fetchTeams() {
      return fetchAllPages(
        "v_local_team_list",
        {
          select: [
            "team_id",
            "current_name",
            "effective_country",
            "sports_gamer_team_ids",
            "historical_names",
            "names_used_in_leagues",
            "league_appearances",
            "first_registered_at",
            "last_registered_at",
            "logo_path",
            "logo_url",
            "profile_url"
          ].join(","),
          order: "current_name.asc,team_id.asc"
        },
        normalizeTeam
      );
    }
  
    async function fetchTournaments() {
      return fetchAllPages(
        "v_ehockey_team_tournaments_web_v14",
        {
          select: [
            "team_id",
            "sports_gamer_team_id",
            "current_name",
            "competition_code",
            "competition_name",
            "season_label",
            "season_number",
            "season_year",
            "season_period",
            "start_date",
            "end_date",
            "sort_date",
            "chronology_date",
            "chronology_end_date",
            "display_start_date",
            "display_end_date",
            "registered_at",
            "league_id",
            "external_league_id",
            "league_name",
            "division",
            "division_key",
            "division_rank",
            "name_used_in_tournament",
            "games_played",
            "wins",
            "losses",
            "overtime_wins",
            "overtime_losses",
            "goals_for",
            "goals_against",
            "goal_diff",
            "table_points",
            "playoff_games",
            "has_statistics"
          ].join(","),
          order: "team_id.asc,chronology_date.desc.nullslast,league_id.desc"
        },
        normalizeTournament
      );
    }

    async function fetchLeagueDisplayNames() {
      const rows = await fetchAllPages(
        "v_ehockey_league_catalog_v1",
        {
          select: "league_id,display_name",
          order: "league_id.asc"
        },
        (row) => row
      );

      return new Map(
        rows.map((row) => [
          Number(row.league_id),
          cleanText(row.display_name)
        ])
      );
    }
  
    async function fetchPlayers() {
      return fetchAllPages(
        "v_ehockey_team_all_time_players_chronological",
        {
          select: [
            "team_id",
            "player_key",
            "display_gamertag",
            "total_points",
            "career_games",
            "total_skater_games",
            "total_goalie_games",
            "player_type",
            "last_appearance_date"
          ].join(","),
          order: "team_id.asc,total_points.desc,career_games.desc,display_gamertag.asc"
        },
        normalizePlayer
      );
    }
  
    function normalizedTeamNameKey(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv-SE")
        .replace(/[^a-z0-9]+/g, "");
    }
  
    function tournamentAllowsSwedishTeamLink(tournament) {
      const tournamentKey = normalizedTeamNameKey(
        `${tournament.seasonLabel || ""} ${tournament.leagueName || ""}`
      );
      const teamKey = normalizedTeamNameKey(
        tournament.nameUsed || tournament.currentName
      );
      const exactTeamName = cleanText(
        tournament.nameUsed || tournament.currentName
      ).toLocaleLowerCase("sv-SE");
  
      if (tournamentKey.includes("ehockeysm")) return false;
      if (
        tournamentKey.startsWith("fcl") ||
        tournamentKey.includes("fcl6v6") ||
        tournamentKey.includes("finnishchampionshipleague")
      ) return false;
      if (
        tournamentKey.startsWith("rcl") ||
        tournamentKey.includes("rclcup") ||
        tournamentKey.includes("russianchampionshipleague")
      ) return false;
      if (
        tournamentKey.startsWith("glc") ||
        tournamentKey.includes("glc") ||
        tournamentKey.startsWith("gcl") ||
        tournamentKey.includes("gcl") ||
        tournamentKey.includes("germanchampionshipleague")
      ) return false;
  
      // "Show Time" med mellanslag är det ryska laget.
      if (exactTeamName === "show time") return false;
  
      // Chiefzz HC är bara svenskt i de tre bekräftade turneringarna.
      if (teamKey === "chiefzzhc" || teamKey === "chiefzzhcdnf") {
        return (
          tournamentKey.includes("eclwarmuplitecore") ||
          tournamentKey.includes("ecl22wintercore") ||
          tournamentKey.includes("ecl22springcore")
        );
      }
  
      return true;
    }
  
    function buildUniqueTeamMap(teams, valueGetter) {
      const candidates = new Map();
  
      for (const team of teams) {
        if (!["SE", "SWE"].includes(team.country)) continue;
  
        for (const rawValue of valueGetter(team)) {
          const value = cleanText(rawValue);
          if (!value) continue;
  
          if (!candidates.has(value)) {
            candidates.set(value, new Map());
          }
          candidates.get(value).set(team.teamId, team);
        }
      }
  
      const result = new Map();
      for (const [value, matches] of candidates.entries()) {
        if (matches.size === 1) {
          result.set(value, [...matches.values()][0]);
        }
      }
      return result;
    }
  
    function resolveTournamentTeamLinks(tournaments, teams) {
      const teamById = new Map(
        teams.map((team) => [team.teamId, team])
      );
  
      const sportsGamerMap = buildUniqueTeamMap(
        teams,
        (team) => team.sportsGamerIds.map((value) => cleanText(value))
      );
  
      const nameMap = buildUniqueTeamMap(
        teams,
        (team) => [
          team.currentName,
          ...team.historicalNames,
          ...team.leagueNames
        ].map(normalizedTeamNameKey)
      );
  
      return tournaments.map((tournament) => {
        if (!tournamentAllowsSwedishTeamLink(tournament)) {
          return {
            ...tournament,
            teamId: 0
          };
        }
  
        let team = teamById.get(tournament.teamId) || null;
  
        if (!team && tournament.sportsGamerTeamId) {
          team = sportsGamerMap.get(
            cleanText(tournament.sportsGamerTeamId)
          ) || null;
        }
  
        if (!team) {
          const nameKeys = [
            tournament.nameUsed,
            tournament.currentName
          ]
            .map(normalizedTeamNameKey)
            .filter(Boolean);
  
          for (const key of nameKeys) {
            team = nameMap.get(key) || null;
            if (team) break;
          }
        }
  
        if (!team) {
          return {
            ...tournament,
            teamId: 0
          };
        }
  
        return {
          ...tournament,
          teamId: team.teamId,
          currentName: team.currentName
        };
      });
    }
  
    function validDateTimestamp(value) {
      if (!value) return 0;
      const text = String(value).slice(0, 10);
      const year = Number(text.slice(0, 4));
      if (!Number.isInteger(year) || year < 1980 || year > 2099) return 0;
      const timestamp = Date.parse(`${text}T00:00:00`);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }
  
    function tournamentTimestamp(tournament) {
      const chronology = validDateTimestamp(tournament.chronologyDate);
      if (chronology) return chronology;
  
      return (
        validDateTimestamp(tournament.endDate) ||
        validDateTimestamp(tournament.sortDate) ||
        validDateTimestamp(tournament.startDate) ||
        validDateTimestamp(tournament.registeredAt)
      );
    }
  
    function tournamentSequence(tournament) {
      const direct = Number.parseFloat(tournament.seasonNumber);
      if (Number.isFinite(direct)) return direct;
  
      const label = `${tournament.seasonLabel} ${tournament.leagueName}`;
      const patterns = {
        ECL: /(?:European Championship League|\bECL)\s*['’]?(\d+(?:\.\d+)?)/i,
        SEC: /\bSEC\s*(\d+(?:\.\d+)?)/i,
        SCL: /(?:Swedish Championship League|\bSCL)\s*['’]?(\d+(?:\.\d+)?)/i,
        ITHL: /\bITHL\s*(\d+(?:\.\d+)?)/i,
        LGEL: /\bLGEL\s*(\d+(?:\.\d+)?)/i
      };
      const match = label.match(patterns[tournament.competitionCode] || /(\d+(?:\.\d+)?)/);
      return match ? Number.parseFloat(match[1]) || 0 : 0;
    }
  
    function tournamentYear(tournament) {
      if (Number.isFinite(tournament.seasonYear)) return tournament.seasonYear;
      const timestamp = tournamentTimestamp(tournament);
      if (timestamp) return new Date(timestamp).getFullYear();
      const match = tournament.seasonLabel.match(/\b(19|20)\d{2}\b/);
      return match ? Number(match[0]) : 0;
    }
  
    function compareTournamentsDescending(a, b) {
      // Samma kronologiska datum används för samtliga tävlingar.
      const dateDifference = tournamentTimestamp(b) - tournamentTimestamp(a);
      if (dateDifference) return dateDifference;
  
      const yearDifference = tournamentYear(b) - tournamentYear(a);
      if (yearDifference) return yearDifference;
  
      const sequenceDifference = tournamentSequence(b) - tournamentSequence(a);
      if (sequenceDifference) return sequenceDifference;
  
      return (
        b.leagueId - a.leagueId ||
        b.seasonLabel.localeCompare(a.seasonLabel, "sv-SE", { numeric: true })
      );
    }
  
    function tournamentKey(tournament) {
      return [
        tournament.competitionCode,
        tournament.leagueId || tournament.externalLeagueId || tournament.seasonLabel
      ].join("|");
    }
  
    function dedupeTournaments(rows) {
      const map = new Map();
      for (const row of rows) {
        const key = tournamentKey(row);
        const current = map.get(key);
        if (!current) {
          map.set(key, row);
          continue;
        }
  
        const currentScore =
          (current.hasStatistics ? 1000000 : 0) +
          current.gamesPlayed * 100 +
          current.playoffGames;
        const rowScore =
          (row.hasStatistics ? 1000000 : 0) +
          row.gamesPlayed * 100 +
          row.playoffGames;
  
        if (rowScore > currentScore) map.set(key, row);
      }
      return [...map.values()].sort(compareTournamentsDescending);
    }
  
    function uniqueNames(team) {
      const names = [
        team.currentName,
        ...team.historicalNames,
        ...team.leagueNames,
        ...team.tournaments.map((tournament) => tournament.nameUsed)
      ];
      const seen = new Set();
      const result = [];
      for (const name of names) {
        const clean = cleanText(name);
        if (!clean) continue;
        const key = clean.toLocaleLowerCase("sv-SE");
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(clean);
      }
      return result;
    }
  
    function sum(rows, field) {
      return rows.reduce((total, row) => total + number(row[field]), 0);
    }
  
    function calculateTeamStats(team) {
      const tournaments = team.tournaments;
      const games = sum(tournaments, "gamesPlayed");
      const wins = sum(tournaments, "wins");
      const losses = Math.max(0, games - wins);
      const goalsFor = sum(tournaments, "goalsFor");
      const goalsAgainst = sum(tournaments, "goalsAgainst");
      const playoffGames = sum(tournaments, "playoffGames");
      const divisionKeys = new Set(
        tournaments.map((tournament) => {
          const division = meaningfulDivision(tournament);
          return division
            ? `${tournament.competitionCode}|${division}`
            : tournament.competitionCode;
        })
      );
      const topPlayer = [...team.players].sort((a, b) =>
        b.totalPoints - a.totalPoints ||
        b.careerGames - a.careerGames ||
        a.displayGamertag.localeCompare(b.displayGamertag, "sv-SE")
      )[0] || null;
      const latestTournament = tournaments[0] || null;
  
      return {
        games,
        wins,
        losses,
        winPercentage: games > 0 ? Math.round((wins / games) * 100) : 0,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        playoffGames,
        tournamentCount: tournaments.length,
        divisionCount: divisionKeys.size,
        playerCount: team.players.length,
        topPlayer,
        latestTournament,
        names: uniqueNames(team)
      };
    }
  
    function attachData() {
      const tournamentsByTeam = new Map();
      for (const tournament of state.tournaments) {
        if (!tournamentsByTeam.has(tournament.teamId)) {
          tournamentsByTeam.set(tournament.teamId, []);
        }
        tournamentsByTeam.get(tournament.teamId).push(tournament);
      }
  
      const playersByTeam = new Map();
      for (const player of state.players) {
        if (!playersByTeam.has(player.teamId)) playersByTeam.set(player.teamId, []);
        playersByTeam.get(player.teamId).push(player);
      }
  
      for (const team of state.teams) {
        team.tournaments = dedupeTournaments(tournamentsByTeam.get(team.teamId) || []);
        team.players = playersByTeam.get(team.teamId) || [];
        team.stats = calculateTeamStats(team);
      }
  
      state.teams = state.teams.filter((team) =>
        team.tournaments.length > 0 &&
        (
          ["SE", "SWE"].includes(team.country) ||
          team.tournaments.some((tournament) => tournament.competitionCode === "SM")
        )
      );
    }
  
    function formatNumber(value) {
      return numberFormatter.format(number(value));
    }
  
    function formatSigned(value) {
      const numeric = number(value);
      if (numeric > 0) return `+${formatNumber(numeric)}`;
      return formatNumber(numeric);
    }
  
    function initials(name) {
      const words = String(name)
        .replace(/\([^)]*\)/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!words.length) return "SEH";
      return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
    }
  
    function renderLogo(container, team) {
      SEH_renderTeamLogo(
        container,
        [team.logoUrl, team.logoPath],
        team.currentName,
        ""
      );
    }

    function badgeLabel(tournament) {
      const competition = competitionDisplay(tournament.competitionCode);
      const division = meaningfulDivision(tournament);
      return division ? `${competition} - ${divisionDisplay(division)}` : competition;
    }
  
    function badgeClass(tournament) {
      const code = tournament.competitionCode.toLowerCase();
      const division = meaningfulDivision(tournament).toLowerCase();
      return `badge--${code}${division ? ` badge--${division}` : ""}`;
    }
  
    function teamBadges(team) {
      const seen = new Set();
      const badges = [];
      for (const tournament of team.tournaments) {
        const label = badgeLabel(tournament);
        const key = label.toLocaleLowerCase("sv-SE");
        if (seen.has(key)) continue;
        seen.add(key);
        badges.push({ label, className: badgeClass(tournament) });
      }
      return badges;
    }
  
    function renderBadges(container, team) {
      container.replaceChildren();
      const badges = teamBadges(team);
      const maxVisible = 5;
      for (const badge of badges.slice(0, maxVisible)) {
        const element = document.createElement("span");
        element.className = `directory-badge ${badge.className}`;
        element.textContent = badge.label;
        container.append(element);
      }
      if (badges.length > maxVisible) {
        const more = document.createElement("span");
        more.className = "directory-badge badge--more";
        more.textContent = `+${badges.length - maxVisible}`;
        more.title = badges.slice(maxVisible).map((badge) => badge.label).join(", ");
        container.append(more);
      }
    }
  
    function latestDisplayName(team) {
      return cleanText(team.stats.latestTournament?.nameUsed) || team.currentName;
    }
  
    function displayedTeamName(team) {
      return elements.nameModeSelect.value === "latest"
        ? latestDisplayName(team)
        : team.currentName;
    }
  
    function aliasesForDisplay(team, displayedName) {
      const displayedKey = displayedName.toLocaleLowerCase("sv-SE");
      return team.stats.names.filter(
        (name) => name.toLocaleLowerCase("sv-SE") !== displayedKey
      );
    }
  
    function compactAliasText(aliases) {
      if (!aliases.length) return "Inga registrerade";
      const visible = aliases.slice(0, 3);
      const rest = aliases.length - visible.length;
      return `${visible.join(", ")}${rest > 0 ? ` +${rest}` : ""}`;
    }
  
    function latestSummary(tournament) {
      if (!tournament) return "Ingen turnering";
      const division = meaningfulDivision(tournament);
      const seasonLabel = SEH_tableSeasonLabel(tournament.seasonLabel);
      const divisionLabel = division
        ? divisionDisplay(division).toUpperCase()
        : competitionDisplay(tournament.competitionCode);

      if (!seasonLabel) return divisionLabel || "Ingen turnering";
      if (!divisionLabel) return seasonLabel;

      const normalizedSeason = seasonLabel.toLocaleLowerCase("sv-SE");
      const normalizedDivision = divisionLabel.toLocaleLowerCase("sv-SE");
      if (normalizedSeason.includes(normalizedDivision)) return seasonLabel;

      return `${seasonLabel} · ${divisionLabel}`;
    }
  
    function createTeamCard(team, index) {
      const fragment = elements.template.content.cloneNode(true);
      const card = fragment.querySelector(".directory-team-card");
      const mainLink = fragment.querySelector(".directory-team-card__main-link");
      const displayName = displayedTeamName(team);
      const identityName = fragment.querySelector(".directory-team-card__identity-name");
      const teamUrl = `#/lag/${encodeURIComponent(team.teamId)}`;
  
      mainLink.href = teamUrl;
      mainLink.setAttribute("aria-label", `Öppna laghistoriken för ${team.currentName}`);
      fragment.querySelector(".directory-team-card__number").textContent =
        `#${index + 1}`;
 
      renderLogo(fragment.querySelector(".directory-team-card__logo"), team);

      const watermark = document.createElement("div");
      watermark.className = "directory-team-card__watermark";
      watermark.setAttribute("aria-hidden", "true");
      card.prepend(watermark);
      renderLogo(watermark, team);
      SEH_hydratePlayerCardTeamPalette(card, watermark, team.currentName);
 
      const name = fragment.querySelector(".directory-team-card__name");
      name.textContent = displayName;
      name.title = displayName;

      const normalizedNameLength = displayName.replace(/\s+/g, " ").trim().length;
      card.dataset.nameLength = String(normalizedNameLength);
      if (normalizedNameLength >= 27) {
        name.classList.add("is-name-xxlong");
      } else if (normalizedNameLength >= 20) {
        name.classList.add("is-name-xlong");
      } else if (normalizedNameLength >= 14) {
        name.classList.add("is-name-long");
      }
  
      if (displayName.toLocaleLowerCase("sv-SE") !== team.currentName.toLocaleLowerCase("sv-SE")) {
        identityName.hidden = false;
        identityName.textContent = `Lagidentitet: ${team.currentName}`;
      }
  
      renderBadges(fragment.querySelector(".directory-team-card__badges"), team);
  
      fragment.querySelector(".metric-players").textContent = formatNumber(team.stats.playerCount);
      fragment.querySelector(".metric-tournaments").textContent = formatNumber(team.stats.tournamentCount);
      fragment.querySelector(".metric-divisions").textContent = formatNumber(team.stats.divisionCount);
      fragment.querySelector(".metric-games").textContent = formatNumber(team.stats.games);
      fragment.querySelector(".metric-record").textContent = `${formatNumber(team.stats.wins)}–${formatNumber(team.stats.losses)}`;
      fragment.querySelector(".metric-winpct").textContent = `${team.stats.winPercentage}%`;
      fragment.querySelector(".metric-goals").textContent = `${formatNumber(team.stats.goalsFor)}–${formatNumber(team.stats.goalsAgainst)}`;
      fragment.querySelector(".metric-diff").textContent = formatSigned(team.stats.goalDifference);
      fragment.querySelector(".metric-playoffs").textContent = team.stats.playoffGames
        ? formatNumber(team.stats.playoffGames)
        : "–";
  
      const topPlayerLink = fragment.querySelector(".summary-top-player");
      if (team.stats.topPlayer?.playerKey) {
        const topPlayer = team.stats.topPlayer;
        topPlayerLink.textContent = `${topPlayer.displayGamertag}, ${formatNumber(topPlayer.totalPoints)}p`;
        topPlayerLink.href = SEH_playerProfileUrl(
          topPlayer.playerKey,
          topPlayer.displayGamertag,
          team.teamId
        );
        topPlayerLink.setAttribute("aria-label", `Öppna spelarsidan för ${topPlayer.displayGamertag}`);
      } else {
        topPlayerLink.textContent = "Statistik saknas";
        topPlayerLink.removeAttribute("href");
        topPlayerLink.classList.add("is-disabled");
      }
  
      fragment.querySelector(".summary-latest").textContent = latestSummary(team.stats.latestTournament);
  
      const aliases = aliasesForDisplay(team, displayName);
      const aliasRow = fragment.querySelector(".summary-alias-row");
      fragment.querySelector(".summary-aliases").textContent = compactAliasText(aliases);
      if (!aliases.length) aliasRow.classList.add("has-no-aliases");
  
      card.dataset.teamId = String(team.teamId);
      return fragment;
    }
  
    function tournamentFilterKey(tournament, includeDivision = true) {
      const division = includeDivision ? meaningfulDivision(tournament) : "";
      return `${tournament.competitionCode}::${division || "*"}`;
    }
  
    function tournamentFilterLabel(key) {
      const [code, division] = key.split("::");
      const competition = competitionDisplay(code);
      return division && division !== "*"
        ? `${competition} - ${divisionDisplay(division)}`
        : competition;
    }
  
    function buildTournamentFilter() {
      const baseCodes = new Set();
      const detailedKeys = new Set();
  
      for (const tournament of state.tournaments) {
        if (["SPORTSGAMER", "ÖVRIGT"].includes(tournament.competitionCode)) continue;
        baseCodes.add(tournamentFilterKey(tournament, false));
        const division = meaningfulDivision(tournament);
        if (division) detailedKeys.add(tournamentFilterKey(tournament, true));
      }
  
      const order = ["ECL", "SEC", "SCL", "ESHL", "ITHL", "LGEL", "SM"];
      const codeRank = (key) => {
        const code = key.split("::")[0];
        const index = order.indexOf(code);
        return index === -1 ? order.length : index;
      };
      const divisionOrder = ["ELITE", "PRO", "LITE", "CORE", "NEO", "SWEAT", "RAMMER", "QUALIFIER", "CHALLENGER"];
  
      const keys = [...baseCodes, ...detailedKeys].sort((a, b) => {
        const codeDifference = codeRank(a) - codeRank(b);
        if (codeDifference) return codeDifference;
        const [codeA, divisionA] = a.split("::");
        const [codeB, divisionB] = b.split("::");
        if (codeA !== codeB) return codeA.localeCompare(codeB, "sv-SE");
        if (divisionA === "*") return -1;
        if (divisionB === "*") return 1;
        const rankA = divisionOrder.indexOf(divisionA);
        const rankB = divisionOrder.indexOf(divisionB);
        if (rankA !== rankB) {
          return (rankA === -1 ? 999 : rankA) - (rankB === -1 ? 999 : rankB);
        }
        return divisionA.localeCompare(divisionB, "sv-SE");
      });
  
      elements.tournamentFilter.replaceChildren();
      const all = document.createElement("option");
      all.value = "all";
      all.textContent = "Alla turneringar";
      elements.tournamentFilter.append(all);
  
      for (const key of keys) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = tournamentFilterLabel(key);
        elements.tournamentFilter.append(option);
      }
    }
  
  
    function seasonFilterKey(tournament) {
      const leagueId = Number(tournament.leagueId);
      return Number.isInteger(leagueId) && leagueId > 0
        ? `${tournament.competitionCode}::league:${leagueId}`
        : `${tournament.competitionCode}::${tournament.seasonLabel}`;
    }
  
    function seasonFilterLabel(tournament) {
      const catalogLabel = cleanText(tournament.catalogDisplayName);
      if (catalogLabel) return catalogLabel;

      const competition = competitionDisplay(tournament.competitionCode);
      const season = cleanText(tournament.seasonLabel);
      return season.toLocaleUpperCase("sv-SE").startsWith(
        competition.toLocaleUpperCase("sv-SE")
      )
        ? season
        : `${competition} ${season}`;
    }
  
    function buildSeasonFilter() {
      if (!elements.headerSeasonSelect) return;
  
      const selectedValue = elements.headerSeasonSelect.value || "all";
      const seasons = new Map();
  
      for (const tournament of state.tournaments) {
        const key = seasonFilterKey(tournament);
        const current = seasons.get(key);
        if (!current || compareTournamentsDescending(tournament, current) < 0) {
          seasons.set(key, tournament);
        }
      }
  
      const rows = [...seasons.values()].sort(compareTournamentsDescending);
      elements.headerSeasonSelect.replaceChildren();
  
      const all = document.createElement("option");
      all.value = "all";
      all.textContent = "Välj säsong";
      elements.headerSeasonSelect.append(all);
  
      for (const tournament of rows) {
        const option = document.createElement("option");
        option.value = seasonFilterKey(tournament);
        option.textContent = seasonFilterLabel(tournament);
        elements.headerSeasonSelect.append(option);
      }
  
      if ([...elements.headerSeasonSelect.options].some((option) => option.value === selectedValue)) {
        elements.headerSeasonSelect.value = selectedValue;
      }
  
      const requestedSeason = cleanText(window.SEH_ROUTE?.query?.get("season") || new URLSearchParams(location.search).get("season"))
        .toLocaleLowerCase("sv-SE")
        .replace(/[’']/g, "")
        .replace(/[:\s]+/g, "");
      if (requestedSeason) {
        const requestedOption = [...elements.headerSeasonSelect.options].find((option) =>
          cleanText(option.textContent)
            .toLocaleLowerCase("sv-SE")
            .replace(/[’']/g, "")
            .replace(/[:\s]+/g, "") === requestedSeason
        );
        if (requestedOption) elements.headerSeasonSelect.value = requestedOption.value;
      }
    }
  
    function teamMatchesSeasonFilter(team, filterValue) {
      if (!filterValue || filterValue === "all") return true;
      return team.tournaments.some(
        (tournament) => seasonFilterKey(tournament) === filterValue
      );
    }
  
    function teamMatchesTournamentFilter(team, filterValue) {
      if (filterValue === "all") return true;
      const [code, division] = filterValue.split("::");
      return team.tournaments.some((tournament) => {
        if (tournament.competitionCode !== code) return false;
        if (!division || division === "*") return true;
        return meaningfulDivision(tournament) === division;
      });
    }
  
    function searchableText(team) {
      return [
        team.currentName,
        ...team.stats.names,
        ...team.sportsGamerIds,
        ...team.tournaments.flatMap((tournament) => [
          tournament.seasonLabel,
          tournament.leagueName,
          tournament.competitionCode,
          tournament.competitionName,
          tournament.division,
          tournament.nameUsed
        ]),
        ...team.players.map((player) => player.displayGamertag)
      ]
        .join(" ")
        .toLocaleLowerCase("sv-SE");
    }
  
    function compareTeams(a, b, sortMode) {
      const nameA = displayedTeamName(a);
      const nameB = displayedTeamName(b);
  
      if (sortMode === "name-desc") {
        return nameB.localeCompare(nameA, "sv-SE") || b.teamId - a.teamId;
      }
      if (sortMode === "latest") {
        return (
          tournamentTimestamp(b.stats.latestTournament || {}) -
            tournamentTimestamp(a.stats.latestTournament || {}) ||
          compareTournamentsDescending(
            a.stats.latestTournament || { competitionCode: "", leagueId: 0, seasonLabel: "" },
            b.stats.latestTournament || { competitionCode: "", leagueId: 0, seasonLabel: "" }
          ) ||
          nameA.localeCompare(nameB, "sv-SE")
        );
      }
      if (sortMode === "games") {
        return b.stats.games - a.stats.games || nameA.localeCompare(nameB, "sv-SE");
      }
      if (sortMode === "wins") {
        return b.stats.wins - a.stats.wins || nameA.localeCompare(nameB, "sv-SE");
      }
      if (sortMode === "winpct") {
        return b.stats.winPercentage - a.stats.winPercentage || b.stats.games - a.stats.games || nameA.localeCompare(nameB, "sv-SE");
      }
      if (sortMode === "tournaments") {
        return b.stats.tournamentCount - a.stats.tournamentCount || nameA.localeCompare(nameB, "sv-SE");
      }
      if (sortMode === "players") {
        return b.stats.playerCount - a.stats.playerCount || nameA.localeCompare(nameB, "sv-SE");
      }
      return nameA.localeCompare(nameB, "sv-SE") || a.teamId - b.teamId;
    }
  
    function updateStats(teams) {
      const allNames = new Set();
      const tournaments = [];
      const divisions = new Set();
      const players = new Set();
  
      for (const team of teams) {
        for (const name of team.stats.names) {
          allNames.add(name.toLocaleLowerCase("sv-SE"));
        }
        tournaments.push(...team.tournaments);
        for (const tournament of team.tournaments) {
          const division = meaningfulDivision(tournament);
          divisions.add(division ? `${tournament.competitionCode}|${division}` : tournament.competitionCode);
        }
        for (const player of team.players) {
          if (player.playerKey) players.add(player.playerKey);
        }
      }
  
      elements.visibleTeamCount.textContent = formatNumber(teams.length);
      elements.appearanceCount.textContent = formatNumber(tournaments.length);
      elements.playerCount.textContent = state.playerDataAvailable ? formatNumber(players.size) : "–";
    }
  
    function updateHistoryYearCount() {
      const timestamps = state.tournaments
        .map(tournamentTimestamp)
        .filter((timestamp) => timestamp > 0);
      if (!timestamps.length) {
        elements.historyYearCount.textContent = "17+";
        return;
      }
      const earliestYear = new Date(Math.min(...timestamps)).getFullYear();
      const latestYear = new Date(Math.max(Date.now(), ...timestamps)).getFullYear();
      const years = Math.max(1, latestYear - earliestYear + 1);
      elements.historyYearCount.textContent = `${years}+`;
    }
  
    function renderTeams() {
      elements.teamGrid.replaceChildren();
      if (!state.filteredTeams.length) {
        const empty = document.createElement("div");
        empty.className = "directory-empty";
        empty.innerHTML = "<strong>Inga lag hittades.</strong><span>Prova ett annat sökord eller filter.</span>";
        elements.teamGrid.append(empty);
      } else {
        const output = document.createDocumentFragment();
        state.filteredTeams.forEach((team, index) => output.append(createTeamCard(team, index)));
        elements.teamGrid.append(output);
      }
  
      const visible = state.filteredTeams.length;
      const total = state.teams.length;
      elements.resultText.textContent = visible === total
        ? `${formatNumber(total)} svenska lag`
        : `${formatNumber(visible)} av ${formatNumber(total)} svenska lag`;
  
      updateStats(state.filteredTeams);
    }
  
    function applyFilters() {
      const query = elements.searchInput.value.trim().toLocaleLowerCase("sv-SE");
      const tournamentFilter = elements.tournamentFilter.value;
      const seasonFilter = elements.headerSeasonSelect?.value || "all";
      const sortMode = elements.sortSelect.value;
  
      state.filteredTeams = state.teams
        .filter((team) => !query || searchableText(team).includes(query))
        .filter((team) => teamMatchesTournamentFilter(team, tournamentFilter))
        .filter((team) => teamMatchesSeasonFilter(team, seasonFilter))
        .sort((a, b) => compareTeams(a, b, sortMode));
  
      document.body.dataset.cardView = elements.viewModeSelect.value;
      renderTeams();
    }
  
    function showError(error) {
      console.error(error);
      elements.errorMessage.textContent = error instanceof Error ? error.message : String(error);
      elements.errorNotice.hidden = false;
    }
  
    async function load() {
      elements.errorNotice.hidden = true;
      elements.setupNotice.hidden = true;
      elements.loadingState.hidden = false;
      elements.teamGrid.replaceChildren();
      if (elements.reloadButton) elements.reloadButton.disabled = true;
      elements.resultText.textContent = "Laddar laghistorik…";
  
      if (!hasValidConfig()) {
        elements.loadingState.hidden = true;
        elements.setupNotice.hidden = false;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
        elements.resultText.textContent = "Supabase är inte anslutet.";
        return;
      }
  
      try {
        const [teams, tournaments, playersResult, leagueDisplayNames] = await Promise.all([
          fetchTeams(),
          fetchTournaments(),
          fetchPlayers().then(
            (players) => ({ ok: true, players }),
            (error) => ({ ok: false, error, players: [] })
          ),
          fetchLeagueDisplayNames()
        ]);
  
        state.teams = teams;
        state.tournaments = resolveTournamentTeamLinks(
          tournaments.map((tournament) => ({
            ...tournament,
            catalogDisplayName:
              leagueDisplayNames.get(Number(tournament.leagueId)) ||
              tournament.catalogDisplayName ||
              ""
          })),
          teams
        ).filter((tournament) =>
          !["SPORTSGAMER", "ÖVRIGT"].includes(tournament.competitionCode)
        );
        state.players = playersResult.players;
        state.playerDataAvailable = playersResult.ok;
  
        if (!playersResult.ok) {
          console.warn("Spelarstatistiken kunde inte hämtas:", playersResult.error);
        }
  
        attachData();
        buildTournamentFilter();
        buildSeasonFilter();
        updateHistoryYearCount();
        state.loadedAt = new Date();
        elements.lastUpdated.textContent = `Uppdaterad ${new Intl.DateTimeFormat("sv-SE", {
          dateStyle: "short",
          timeStyle: "medium"
        }).format(state.loadedAt)}`;
        applyFilters();
      } catch (error) {
        showError(error);
        elements.resultText.textContent = "Hämtningen misslyckades.";
      } finally {
        elements.loadingState.hidden = true;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
      }
    }
  
    elements.searchInput.addEventListener("input", applyFilters);
    elements.nameModeSelect.addEventListener("change", applyFilters);
    elements.tournamentFilter.addEventListener("change", applyFilters);
    elements.headerSeasonSelect?.addEventListener("change", applyFilters);
    elements.sortSelect.addEventListener("change", applyFilters);
    elements.viewModeSelect.addEventListener("change", applyFilters);
    elements.reloadButton?.addEventListener("click", load);
  
    load();
  })();
}



/* ============================================================
   V122 – delad RP-cache för spelarregister + spelarprofil
   Samma publika cache/retry-princip som Android-appen använder.
   ============================================================ */
const SEH_PLAYER_RANKING_ENDPOINT = "https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/app-player-ranking?key=seh-player-ranking-2026-v1&v=11";
let SEH_playerRankingPromise = null;

function SEH_rankingNameAliases(value) {
  const raw = String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("sv-SE");
  if (!raw) return [];
  const aliases = new Set([raw]);
  const compact = raw.replace(/[^a-z0-9åäö]/gi, "");
  if (compact) aliases.add(compact);
  const core = raw
    .replace(/^[|il]+[-_. ]*/i, "")
    .replace(/[-_. ]*[|il]+$/i, "")
    .replace(/[^a-z0-9åäö]/gi, "");
  if (core.length >= 3) aliases.add(core);
  return [...aliases];
}

function SEH_buildRankingLookup(rows) {
  const byName = new Map();
  const byKey = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    SEH_rankingNameAliases(row.display_gamertag).forEach((key) => {
      if (key && !byName.has(key)) byName.set(key, row);
    });
    if (row.player_key !== null && row.player_key !== undefined) {
      const key = String(row.player_key).trim().toLocaleLowerCase("sv-SE");
      if (key) byKey.set(key, row);
    }
  });
  return { rows: Array.isArray(rows) ? rows : [], byName, byKey };
}

function SEH_findPlayerRanking(lookup, playerKey, displayName) {
  const key = String(playerKey || "").trim().toLocaleLowerCase("sv-SE");
  if (key && lookup?.byKey?.has(key)) return lookup.byKey.get(key);
  for (const alias of SEH_rankingNameAliases(displayName)) {
    if (lookup?.byName?.has(alias)) return lookup.byName.get(alias);
  }
  return null;
}

function SEH_formatRpNumber(value, decimals = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "–";
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numeric);
}

async function SEH_loadPlayerRanking() {
  if (window.__SEH_WEB_PLAYER_RANKING_LOOKUP__?.rows?.length) {
    return window.__SEH_WEB_PLAYER_RANKING_LOOKUP__;
  }
  if (SEH_playerRankingPromise) return SEH_playerRankingPromise;

  SEH_playerRankingPromise = (async () => {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const endpoint = attempt === 1
          ? SEH_PLAYER_RANKING_ENDPOINT
          : `${SEH_PLAYER_RANKING_ENDPOINT}&retry=${Date.now()}-${attempt}`;
        const response = await fetch(endpoint, attempt === 1 ? {} : { cache: "no-store" });
        if (!response.ok) throw new Error(`Ranking svarade ${response.status}.`);
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length < 100) {
          throw new Error("Rankingcachen gav ett ofullständigt svar.");
        }
        const lookup = SEH_buildRankingLookup(rows);
        window.__SEH_WEB_PLAYER_RANKING_LOOKUP__ = lookup;
        return lookup;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, 350 * attempt));
        }
      }
    }
    throw lastError || new Error("Rankingen kunde inte laddas.");
  })().catch((error) => {
    SEH_playerRankingPromise = null;
    throw error;
  });

  return SEH_playerRankingPromise;
}

function SEH_initPlayers() {
  /* ======================================================
     ROUTE CONTROLLER: players
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const config = window.EHOCKEY_CONFIG || {};
    const elements = {
      grid: document.querySelector("#playerGrid"),
      search: document.querySelector("#playerSearch"),
      role: document.querySelector("#roleFilter"),
      division: document.querySelector("#divisionFilter"),
      sort: document.querySelector("#playerSort"),
      compact: document.querySelector("#compactToggle"),
      result: document.querySelector("#playerResultText"),
      pagination: document.querySelector("#playerPagination"),
      overviewPlayers: document.querySelector("#overviewPlayers"),
      overviewGoalies: document.querySelector("#overviewGoalies"),
      overviewSkaters: document.querySelector("#overviewSkaters"),
      overviewRanked: document.querySelector("#overviewRanked")
    };
  
    const state = {
      players: [],
      filtered: [],
      page: 1,
      showAll: false,
      ranking: SEH_buildRankingLookup([])
    };
  
    const APP_BUILD = "2026-08-30-v1266-five-column-player-grid";
    const PAGE_SIZE = 1000;
    const MAX_RETRIES = 2;
    const REQUEST_TIMEOUT_MS = 20000;
    const DIVISION_OPTIONS = [
      "ECL", "ECL Elite", "ECL Pro", "ECL Lite", "ECL Core", "ECL Neo",
      "SCL", "SEC", "eSHL", "LGEL", "SM",
      "ITHL", "ITHL Elite", "ITHL Sweat", "ITHL Rammer", "ITHL Core"
    ];
  
    const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const clean = (value) => String(value ?? "").trim();
    const list = (value) => Array.isArray(value)
      ? value.map(clean).filter(Boolean)
      : clean(value).split(/[,;|]/).map(clean).filter(Boolean);
    const escapeHtml = (value) => clean(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
    const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  
    function validConfig() {
      return /^https:\/\/.+\.supabase\.co\/?$/.test(clean(config.supabaseUrl)) &&
        clean(config.supabasePublishableKey).length > 20;
    }
  
    function sportsGamerIdFromValue(value) {
      const text = clean(value);
      if (!text) return "";
      const urlMatch = text.match(/\/players\/(\d+)/i);
      if (urlMatch) return urlMatch[1];
      return /^\d+$/.test(text) ? text : "";
    }
  
    function isRetryableStatus(status) {
      return status === 408 || status === 425 || status === 429 ||
        status === 500 || status === 502 || status === 503 || status === 504;
    }
  
    async function fetchPage(view, parameters, attempt = 0) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const url = `${config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/${view}?${parameters}`;
  
      try {
        const response = await fetch(url, {
          headers: {
            apikey: config.supabasePublishableKey.trim(),
            Accept: "application/json"
          },
          signal: controller.signal
        });
  
        if (!response.ok) {
          if (attempt < MAX_RETRIES && isRetryableStatus(response.status)) {
            await sleep(500 * (2 ** attempt));
            return fetchPage(view, parameters, attempt + 1);
          }
          throw new Error(`${view} svarade ${response.status}.`);
        }
  
        return response.json();
      } catch (error) {
        const canRetry = attempt < MAX_RETRIES &&
          (error.name === "AbortError" || error instanceof TypeError);
        if (canRetry) {
          await sleep(500 * (2 ** attempt));
          return fetchPage(view, parameters, attempt + 1);
        }
        if (error.name === "AbortError") {
          throw new Error(`${view} tog för lång tid att svara.`);
        }
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    }
  
    async function fetchPages(view, baseParameters) {
      const rows = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const parameters = new URLSearchParams(baseParameters);
        parameters.set("limit", String(PAGE_SIZE));
        parameters.set("offset", String(offset));
        const page = await fetchPage(view, parameters);
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
      return rows;
    }
  
    let nationalTeamDirectoryPromise = null;

    async function fetchNationalTeamDirectory() {
      if (!nationalTeamDirectoryPromise) {
        nationalTeamDirectoryPromise = fetchPages("ehockey_national_teams", {
          select: "team_external_id,canonical_display_name",
          order: "country_code.asc"
        }).catch((error) => {
          nationalTeamDirectoryPromise = null;
          throw error;
        });
      }
      return nationalTeamDirectoryPromise;
    }

    function normalizedTeamKey(value) {
      return clean(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv-SE");
    }

    function isWorldCupSeason(value) {
      return /world\s*cup/i.test(clean(value));
    }

    async function replaceNationalTeamLatest(rows) {
      let nationalTeams = [];
      try {
        nationalTeams = await fetchNationalTeamDirectory();
      } catch (error) {
        console.warn(`${APP_BUILD}: kunde inte hämta landslagsregistret.`, error);
      }

      const nationalExternalIds = new Set(
        nationalTeams.map((row) => clean(row.team_external_id)).filter(Boolean)
      );
      const nationalNames = new Set(
        nationalTeams.map((row) => normalizedTeamKey(row.canonical_display_name)).filter(Boolean)
      );

      const isNationalTeamName = (value) => {
        const key = normalizedTeamKey(value);
        return nationalNames.has(key) || /^ehockey\s+/.test(key) || /^sg\s+(?:sweden|denmark|finland|norway|germany|austria|canada|czechia|france|great britain|latvia|poland|slovakia|switzerland|ukraine|usa)$/i.test(clean(value));
      };

      const affected = rows.filter((row) =>
        isNationalTeamName(row.latest_team) || isWorldCupSeason(row.latest_season)
      );

      if (!affected.length) return rows;

      const affectedKeys = [...new Set(affected.map((row) => clean(row.player_key)).filter(Boolean))];
      if (!affectedKeys.length) return rows;

      const quotedKeys = affectedKeys
        .map((key) => `"${key.replace(/"/g, "")}"`)
        .join(",");

      let historyRows = [];
      try {
        historyRows = await fetchPages("ehockey_player_history_cache_v25", {
          select: [
            "player_key", "team_external_id", "team_name_in_tournament",
            "team_current_name", "season_label", "league_name",
            "chronology_date", "sort_date", "league_id"
          ].join(","),
          player_key: `in.(${quotedKeys})`,
          order: "chronology_date.desc.nullslast,sort_date.desc.nullslast,league_id.desc"
        });
      } catch (error) {
        console.warn(`${APP_BUILD}: kunde inte ersätta senaste landslag med senaste klubblag.`, error);
        return rows;
      }

      const latestClubByPlayer = new Map();

      for (const historyRow of historyRows) {
        const playerKey = clean(historyRow.player_key);
        if (!playerKey || latestClubByPlayer.has(playerKey)) continue;

        const teamExternalId = clean(historyRow.team_external_id);
        const teamName = clean(historyRow.team_name_in_tournament || historyRow.team_current_name);
        const seasonName = clean(historyRow.season_label || historyRow.league_name);
        const isNational =
          nationalExternalIds.has(teamExternalId) ||
          isNationalTeamName(teamName) ||
          isWorldCupSeason(seasonName) ||
          isWorldCupSeason(historyRow.league_name);

        if (isNational) continue;

        latestClubByPlayer.set(playerKey, {
          latest_team: teamName || clean(historyRow.team_name_in_tournament),
          latest_season: seasonName
        });
      }

      return rows.map((row) => {
        const replacement = latestClubByPlayer.get(clean(row.player_key));
        return replacement ? { ...row, ...replacement } : row;
      });
    }

    async function fetchDirectory() {
      // Läs den färdiga katalogcachen. Den innehåller samma centrala spelarlista
      // men slipper bygga identitets- och historikkedjan vid varje sidladdning.
      const rows = await fetchPages("app_player_directory_cache", {
        select: [
          "player_key", "display_gamertag", "player_country", "player_image",
          "sports_gamer_player_url", "primary_position", "latest_season",
          "latest_team", "last_appearance_date", "tournament_count",
          "competitions", "divisions", "filter_divisions", "club_names",
          "club_count", "total_skater_games", "total_goals", "total_assists",
          "total_points", "total_goalie_games", "total_goalie_saves",
          "total_goalie_shots_against", "total_goalie_save_percentage",
          "career_games", "player_type"
        ].join(","),
        order: "display_gamertag.asc"
      });

      return replaceNationalTeamLatest(rows);
    }
  
    function compactPlayerCardTournamentName(value) {
      let label = clean(value);
      if (!label) return "";

      const replacements = [
        [/Western European Championship League/gi, "WECL"],
        [/Xbox European Championship League/gi, "XECL"],
        [/North American Championship League/gi, "NACL"],
        [/Czech Slovak Championship League/gi, "CSCL"],
        [/European Championship League/gi, "ECL"],
        [/Finnish Championship League/gi, "FCL"],
        [/Swedish Championship League/gi, "SCL"],
        [/German Championship League/gi, "GCL"],
        [/Russian Championship League/gi, "RCL"]
      ];

      replacements.forEach(([pattern, shortName]) => {
        label = label.replace(pattern, shortName);
      });

      return label
        // Ta bort lands-/regionsflaggor från turneringsnamnet.
        .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "")
        // Ta bort avslutande region-/landskoder som används i SportsGamer-namnen.
        .replace(/(?:\s*[|·/\-]\s*)?\b(?:EU|EUR|SE|SWE|FI|FIN|NO|NOR|DK|DEN|DE|GER|CZ|CZE|SK|SVK|PL|POL|RU|RUS|AT|AUT|CH|SUI|GB|GBR|UK|US|USA|CA|CAN)\b\s*$/i, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([:;,])/g, "$1")
        .trim();
    }

    function normalizePlayer(row) {
      const sportsGamerId = sportsGamerIdFromValue(row.sports_gamer_player_url);
      const skaterGames = number(row.total_skater_games);
      const goalieGames = number(row.total_goalie_games);
      const role = clean(row.player_type).toLowerCase() === "goalie" || goalieGames > skaterGames
        ? "goalie"
        : "skater";
  
      return {
        key: clean(row.player_key),
        sportsGamerId,
        name: clean(row.display_gamertag) || "Okänd spelare",
        image: SEH_playerImageUrl(sportsGamerId, clean(row.player_image)),
        role,
        games: number(row.career_games),
        skaterGames,
        goalieGames,
        goals: number(row.total_goals),
        assists: number(row.total_assists),
        points: number(row.total_points),
        saves: number(row.total_goalie_saves),
        shotsAgainst: number(row.total_goalie_shots_against),
        savePercentage: number(row.total_goalie_save_percentage),
        seasons: number(row.tournament_count),
        clubCount: number(row.club_count),
        clubNames: list(row.club_names),
        latestSeason: clean(row.latest_season),
        latestTeam: clean(row.latest_team),
        competitions: list(row.competitions),
        divisions: list(row.divisions),
        filterDivisions: list(row.filter_divisions)
      };
    }
  
    function divisionLabels(player) {
      const labels = new Set();
      player.competitions.forEach((competition) => labels.add(competition));
      player.divisions.forEach((division) => labels.add(division));
      ["eSHL", "LGEL", "SM"].forEach((competition) => {
        if (player.filterDivisions.includes(competition)) labels.add(competition);
      });
      return [...labels].filter((label) =>
        !["SPORTSGAMER", "MAIN", "DIVISION A", "6V6"].includes(clean(label).toUpperCase())
      );
    }
  
    function buildDivisionFilter() {
      const existingValues = new Set(
        [...elements.division.options].map((option) => option.value)
      );
      DIVISION_OPTIONS.forEach((label) => {
        if (existingValues.has(label)) return;
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        elements.division.append(option);
      });
    }
  
    function rankingForPlayer(player) {
      return SEH_findPlayerRanking(state.ranking, player.key, player.name);
    }

    function updateOverview() {
      const goalies = state.players.filter((player) => player.role === "goalie").length;
      const ranked = state.players.filter((player) => {
        const ranking = rankingForPlayer(player);
        return Number(ranking?.overall_rank) > 0;
      }).length;
      elements.overviewPlayers.textContent = state.players.length.toLocaleString("sv-SE");
      elements.overviewGoalies.textContent = goalies.toLocaleString("sv-SE");
      elements.overviewSkaters.textContent = (state.players.length - goalies).toLocaleString("sv-SE");
      if (elements.overviewRanked) elements.overviewRanked.textContent = ranked.toLocaleString("sv-SE");
    }
  
    function statLine(player) {
      if (player.role === "goalie") {
        const percentage = player.shotsAgainst > 0
          ? `${(player.savePercentage * 100).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}%`
          : "–";
        return `SV% ${percentage} · ${player.saves.toLocaleString("sv-SE")} räddningar`;
      }
      return `${player.points.toLocaleString("sv-SE")}p · ${player.goals.toLocaleString("sv-SE")}G ${player.assists.toLocaleString("sv-SE")}A`;
    }
  
    function avatarMarkup(player) {
      return `<img src="${escapeHtml(player.image)}" alt="${escapeHtml(player.name)}" loading="lazy" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='players/1DEFAULTBILDID.png'}">`;
    }
  
    function playerCard(player) {
      const ranking = rankingForPlayer(player);
      const overallRank = Number(ranking?.overall_rank) > 0
        ? `#${SEH_formatRpNumber(ranking.overall_rank)}`
        : "–";
      const totalRp = Number.isFinite(Number(ranking?.ranking_points))
        ? `${SEH_formatRpNumber(ranking.ranking_points)} RP`
        : "RP –";
      const secondaryValue = player.role === "goalie"
        ? (player.shotsAgainst > 0
            ? `${(player.savePercentage * 100).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}%`
            : "–")
        : player.points.toLocaleString("sv-SE");
      const secondaryLabel = player.role === "goalie" ? "SV%" : "POÄNG";

      const link = document.createElement("a");
      link.className = "players-card players-card-v122";
      link.href = SEH_playerProfileUrl(player.key, player.name);
      link.innerHTML = `
        <span class="players-card__team-watermark-v1265" aria-hidden="true"></span>
        <div class="players-card__top-v1266">
          <div class="players-card__media-v122">
            <div class="players-card__avatar">
              ${avatarMarkup(player)}
            </div>
            <span class="players-card__role-v122">${player.role === "goalie" ? "MÅLVAKT" : "UTESPELARE"}</span>
          </div>
          <div class="players-card__identity-v1266">
            <span class="players-card__corner-logo-v12901" aria-hidden="true"></span>
            <span class="players-card__ranking-v122"><b>${overallRank}</b><em>${totalRp}</em></span>
            <div class="players-card__title-v122">
              <h3>${escapeHtml(player.name)}</h3>
            </div>
            <div class="players-card__team-v122">
              <span class="players-card__team-logo-v122" aria-hidden="true"></span>
              <strong>${escapeHtml(player.latestTeam || "Okänt lag")}</strong>
            </div>
            <div class="players-card__metrics-v122">
              <div><span>MATCHER</span><strong>${player.games.toLocaleString("sv-SE")}</strong></div>
              <div><span>${secondaryLabel}</span><strong>${secondaryValue}</strong></div>
              <div><span>SÄSONGER</span><strong>${player.seasons.toLocaleString("sv-SE")}</strong></div>
            </div>
            <div class="players-card__footer-v12882">
              <div class="players-card__latest-v122">
                <span>SENAST</span>
                <strong>${escapeHtml(compactPlayerCardTournamentName(player.latestSeason) || "–")}</strong>
              </div>
              <div class="players-card__career-v12882">
                <span>KARRIÄR</span>
                <strong>${escapeHtml(divisionLabels(player).slice(0, 6).join(" · ") || "–")}</strong>
              </div>
            </div>
          </div>
        </div>
      `;
      const logoNode = link.querySelector(".players-card__team-logo-v122");
      if (logoNode) SEH_renderTeamLogo(logoNode, [], player.latestTeam, `${player.latestTeam || "Lag"} logotyp`);

      const cornerLogoNode = link.querySelector(".players-card__corner-logo-v12901");
      if (cornerLogoNode) SEH_renderTeamLogo(cornerLogoNode, [], player.latestTeam, "");

      const watermarkNode = link.querySelector(".players-card__team-watermark-v1265");
      if (watermarkNode) {
        SEH_renderTeamLogo(watermarkNode, [], player.latestTeam, "");
        SEH_hydratePlayerCardTeamPalette(link, watermarkNode, player.latestTeam);
      }

      return link;
    }

    function renderPagination(totalPages) {
      elements.pagination.replaceChildren();
      if (totalPages <= 1) return;
  
      const add = (label, page, active = false, disabled = false) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.disabled = disabled;
        button.classList.toggle("is-active", active);
        button.addEventListener("click", () => {
          state.showAll = false;
          state.page = page;
          render();
          document.querySelector(".player-directory")?.scrollIntoView({ behavior: "smooth" });
        });
        elements.pagination.append(button);
      };
  
      add("Föregående", Math.max(1, state.page - 1), false, state.page === 1);
      const start = Math.max(1, Math.min(state.page - 4, Math.max(1, totalPages - 8)));
      const end = Math.min(totalPages, start + 8);
      for (let page = start; page <= end; page += 1) add(String(page), page, page === state.page);
      add("Nästa", Math.min(totalPages, state.page + 1), false, state.page === totalPages);
  
      const showAllButton = document.createElement("button");
      showAllButton.type = "button";
      showAllButton.textContent = state.showAll ? "Visa sidvisning" : "Visa alla";
      showAllButton.classList.toggle("is-active", state.showAll);
      showAllButton.addEventListener("click", () => {
        state.showAll = !state.showAll;
        state.page = 1;
        render();
        document.querySelector(".player-directory")?.scrollIntoView({ behavior: "smooth" });
      });
      elements.pagination.append(showAllButton);
    }
  
    function searchable(player) {
      return [
        player.name, player.latestTeam, player.latestSeason,
        ...player.clubNames, ...player.competitions, ...player.divisions,
        ...player.filterDivisions
      ].join(" ").toLocaleLowerCase("sv");
    }
  
    function applyFilters() {
      const query = clean(elements.search.value).toLocaleLowerCase("sv");
      const role = elements.role.value;
      const division = elements.division.value;
  
      state.filtered = state.players
        .filter((player) => !query || searchable(player).includes(query))
        .filter((player) => role === "all" || player.role === role)
        .filter((player) => division === "all" || player.filterDivisions.includes(division));
  
      const sort = elements.sort.value;
      state.filtered.sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "sv");
        if (sort === "points") return b.points - a.points || b.games - a.games;
        if (sort === "clubs") return b.clubCount - a.clubCount || b.games - a.games;
        if (sort === "ranking") {
          const ar = Number(rankingForPlayer(a)?.overall_rank);
          const br = Number(rankingForPlayer(b)?.overall_rank);
          const aRanked = Number.isFinite(ar) && ar > 0;
          const bRanked = Number.isFinite(br) && br > 0;
          if (aRanked && bRanked && ar !== br) return ar - br;
          if (aRanked !== bRanked) return aRanked ? -1 : 1;
        }
        if (sort === "average-ranking") {
          const ar = Number(rankingForPlayer(a)?.average_rank);
          const br = Number(rankingForPlayer(b)?.average_rank);
          const aRanked = Number.isFinite(ar) && ar > 0;
          const bRanked = Number.isFinite(br) && br > 0;
          if (aRanked && bRanked && ar !== br) return ar - br;
          if (aRanked !== bRanked) return aRanked ? -1 : 1;
        }
        return b.games - a.games || b.points - a.points;
      });
    }
  
    function render() {
      applyFilters();
      const compact = elements.compact.checked;
      const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const pageSize = compact
        ? 48
        : viewportWidth >= 901
          ? 30
          : viewportWidth >= 621
            ? 20
            : 10;
      const totalPages = Math.max(1, Math.ceil(state.filtered.length / pageSize));
      state.page = Math.min(state.page, totalPages);
      const start = state.showAll ? 0 : (state.page - 1) * pageSize;
      const visible = state.showAll
        ? state.filtered
        : state.filtered.slice(start, start + pageSize);
  
      elements.grid.classList.toggle("is-compact", compact);
      elements.grid.replaceChildren(...visible.map(playerCard));
      elements.result.textContent = state.filtered.length
        ? state.showAll
          ? `Visar alla ${state.filtered.length} svenska spelare`
          : `Visar ${start + 1}–${Math.min(start + pageSize, state.filtered.length)} av ${state.filtered.length} svenska spelare · Sida ${state.page} av ${totalPages}`
        : "Inga svenska spelare hittades.";
      renderPagination(totalPages);
    }
  
    async function load() {
      if (!validConfig()) {
        elements.result.textContent = "Supabase-inställningarna saknas i config.js.";
        return;
      }
  
      const startedAt = performance.now();
      try {
        const rows = await fetchDirectory();
        state.players = rows
          .map(normalizePlayer)
          .filter((player) => player.key);
        buildDivisionFilter();
        updateOverview();
        render();

        void SEH_loadPlayerRanking()
          .then((lookup) => {
            state.ranking = lookup;
            updateOverview();
            render();
          })
          .catch((error) => {
            console.warn(`${APP_BUILD}: RP/ranking kunde inte laddas just nu.`, error);
          });

        console.info(
          `Svensk eHockey ${APP_BUILD}: ${state.players.length} spelare laddades på ${Math.round(performance.now() - startedAt)} ms.`
        );
      } catch (error) {
        elements.result.textContent =
          `Spelarregistret kunde inte laddas: ${error.message} Kör SQL/04_optimera_spelarregister_v7.sql i Supabase.`;
      }
    }
  
    [elements.search, elements.role, elements.division, elements.sort, elements.compact]
      .forEach((element) => element.addEventListener(
        element === elements.search ? "input" : "change",
        () => {
          state.page = 1;
          state.showAll = false;
          render();
        }
      ));
  
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!state.players.length || state.showAll) return;
        state.page = 1;
        render();
      }, 140);
    });

    load();
  })();
}



function SEH_playerSlug(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sv-SE")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SEH_isHashedPlayerKey(value) {
  return /^[a-f0-9]{40,}$/i.test(String(value || "").trim());
}

function SEH_playerProfileUrl(playerKey, gamertag, fromTeam = null) {
  const slug = SEH_playerSlug(gamertag);
  const cleanPlayerKey = String(playerKey || "").trim();
  const routeValue = slug || cleanPlayerKey;
  const query = new URLSearchParams();

  // Snygg gamertag-URL utåt, riktig player_key internt. Detta gör att ett
  // profilklick kan gå direkt till spelaren utan att först läsa hela registret.
  if (SEH_isHashedPlayerKey(cleanPlayerKey)) {
    query.set("pk", cleanPlayerKey);
  }

  if (Number.isInteger(Number(fromTeam)) && Number(fromTeam) > 0) {
    query.set("fromTeam", String(Number(fromTeam)));
  }

  const queryString = query.toString();
  return `#/spelare/${encodeURIComponent(routeValue)}${queryString ? `?${queryString}` : ""}`;
}

function SEH_initPlayer() {
  /* ======================================================
     ROUTE CONTROLLER: player
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const APP_BUILD = "2026-09-05-v12878-no-qualifier-merits";
    const config = window.EHOCKEY_CONFIG || {};
    const elements = {
      backLink: document.querySelector("#backLink"),
      reloadButton: document.querySelector("#reloadButton"),
      setupNotice: document.querySelector("#setupNotice"),
      errorNotice: document.querySelector("#errorNotice"),
      errorMessage: document.querySelector("#errorMessage"),
      loadingState: document.querySelector("#loadingState"),
      playerPage: document.querySelector("#playerPage"),
      playerHero: document.querySelector(".player-profile-hero-v123"),
      playerAvatar: document.querySelector("#playerAvatar"),

      playerFlag: document.querySelector("#playerFlag"),

      playerName: document.querySelector("#playerName"),

      playerCurrentTeam: document.querySelector("#playerCurrentTeam"),
      playerCurrentTeamLogo: document.querySelector("#playerCurrentTeamLogo"),
      playerHeroWatermark: document.querySelector("#playerHeroWatermark"),
      playerPortraitWatermark: document.querySelector("#playerPortraitWatermark"),
      heroTotalRp: document.querySelector("#heroTotalRp"),
      heroSwedenRank: document.querySelector("#heroSwedenRank"),
      heroAverageRp: document.querySelector("#heroAverageRp"),
      heroPositionRank: document.querySelector("#heroPositionRank"),
      profileStripRp: document.querySelector("#profileStripRp"),

      playerMeta: document.querySelector("#playerMeta"),

      playerCompetitions: document.querySelector("#playerCompetitions"),

      playerBio: document.querySelector("#playerBio"),

      playerLinks: document.querySelector("#playerLinks"),
      playerProfileTabs: document.querySelector("#playerProfileTabs"),
      overviewMeritBadges: document.querySelector("#overviewMeritBadges"),
      playerMeritsSection: document.querySelector("#playerMeritsSection"),
      teamMeritsList: document.querySelector("#teamMeritsList"),
      personalMeritsList: document.querySelector("#personalMeritsList"),
      meritsTitleCount: document.querySelector("#meritsTitleCount"),
      meritsFinalCount: document.querySelector("#meritsFinalCount"),
      meritsBronzeCount: document.querySelector("#meritsBronzeCount"),
      meritsPersonalCount: document.querySelector("#meritsPersonalCount"),
      teamMeritsHeadingCount: document.querySelector("#teamMeritsHeadingCount"),
      personalMeritsHeadingCount: document.querySelector("#personalMeritsHeadingCount"),
      tournamentCount: document.querySelector("#tournamentCount"),
      teamCount: document.querySelector("#teamCount"),
      careerGames: document.querySelector("#careerGames"),
      headlineStats: document.querySelector(".player-editorial-stats"),
      careerPoints: document.querySelector("#careerPoints"),
      careerGoals: document.querySelector("#careerGoals"),
      careerAssists: document.querySelector("#careerAssists"),
      skaterCareerStats: document.querySelector("#skaterCareerStats"),
      goalieCareerStats: document.querySelector("#goalieCareerStats"),
      skaterCareerCard: document.querySelector("#skaterCareerCard"),
      goalieCareerCard: document.querySelector("#goalieCareerCard"),
      careerSummaryGrid: document.querySelector("#careerSummaryGrid"),
      careerSummaryLead: document.querySelector("#careerSummaryLead"),
      playerTeamsSection: document.querySelector("#playerTeamsSection"),
      playerTeamsGrid: document.querySelector("#playerTeamsGrid"),
      playerTeamsClubCount: document.querySelector("#playerTeamsClubCount"),
      playerTeamsSeasonCount: document.querySelector("#playerTeamsSeasonCount"),
      playerTeamsLatestTeam: document.querySelector("#playerTeamsLatestTeam"),
      playerTeamsMostTeam: document.querySelector("#playerTeamsMostTeam"),
      historyCompetitionFilters: document.querySelector("#historyCompetitionFilters"),
      historyCount: document.querySelector("#historyCount"),
      historyTableBody: document.querySelector("#historyTableBody")
    };

    let historyCompetitionFilter = "ALL";
    let currentHistoryRows = [];
    let currentBioContext = null;
    let activeProfileTab = "overview";

    function setProfileTab(tabName, { focus = false } = {}) {
      const requested = String(tabName || "overview").trim().toLowerCase();
      const allowed = new Set(["overview", "statistics", "teams", "merits"]);
      const nextTab = allowed.has(requested) ? requested : "overview";
      activeProfileTab = nextTab;

      document.querySelectorAll("[data-player-tab]").forEach((button) => {
        const active = button.dataset.playerTab === nextTab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus({ preventScroll: true });
      });

      document.querySelectorAll("[data-player-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.playerPanel !== nextTab;
      });
    }

    function initProfileTabs() {
      if (!elements.playerProfileTabs) return;
      const buttons = [...elements.playerProfileTabs.querySelectorAll("[data-player-tab]")];
      buttons.forEach((button, index) => {
        button.addEventListener("click", () => setProfileTab(button.dataset.playerTab || "overview"));
        button.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          let nextIndex = index;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length;
          if (event.key === "ArrowLeft") nextIndex = (index - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = buttons.length - 1;
          const next = buttons[nextIndex];
          setProfileTab(next?.dataset.playerTab || "overview", { focus: true });
        });
      });
      setProfileTab("overview");
    }
  
    function hasValidConfig() {
      return typeof config.supabaseUrl === "string" &&
        /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl.trim()) &&
        typeof config.supabasePublishableKey === "string" &&
        config.supabasePublishableKey.trim().length > 20 &&
        !config.supabasePublishableKey.includes("KLISTRA_IN");
    }
  
    function number(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  
    function nullableNumber(value) {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  
    function formatInteger(value, fallback = "–") {
      if (value === null || value === undefined || value === "") return fallback;
      return Number(value).toLocaleString("sv-SE");
    }
  
    function formatDecimal(value, decimals = 2) {
      const numeric = nullableNumber(value);
      return numeric === null ? "–" : numeric.toLocaleString("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
  
    function formatSavePercentage(value) {
      const numeric = nullableNumber(value);
      return numeric === null ? "–" : numeric.toLocaleString("sv-SE", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    }
  
    function formatDate(value) {
      if (!value) return "";
      const normalized = String(value).slice(0, 10);
      const date = new Date(`${normalized}T00:00:00`);
      return Number.isNaN(date.getTime())
        ? normalized
        : new Intl.DateTimeFormat("sv-SE").format(date);
    }
  
    function formatPeriod(startValue, endValue) {
      const start = formatDate(startValue);
      const end = formatDate(endValue);
      if (start && end && start !== end) return `${start} – ${end}`;
      return start || end || "";
    }
  
    function initials(name) {
      return String(name || "EH").trim().split(/\s+/).slice(0, 2)
        .map((part) => part[0] || "").join("").toUpperCase() || "EH";
    }
  
    function normalizeLocalPortraitPath(value) {
      const raw = String(value || "").trim();
      if (!raw) return "";

      const localMatch = raw.match(/(?:^|\/)(?:players\/)?(\d+)(?:\.(?:png|jpe?g|webp))?(?:[?#].*)?$/i);
      if (localMatch) return `players/${localMatch[1]}.png`;

      const remoteMatch = raw.match(/\/players\/(\d+)(?:[/?#]|$)/i);
      if (remoteMatch) return `players/${remoteMatch[1]}.png`;

      return /^players\/.+\.png(?:[?#].*)?$/i.test(raw) ? raw : "";
    }

    function localPlayerImageUrl(row) {
      const sportsGamerId = String(row.externalUrl || "")
        .match(/\/players\/(\d+)/i)?.[1];
      const localImage = normalizeLocalPortraitPath(row.image);
      return SEH_playerImageUrl(sportsGamerId, localImage);
    }
  
    function countryFlag(code) {
      const normalized = String(code || "").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalized)) return "🌐";
      return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
    }

    function setPlayerFlag(code) {
      elements.playerFlag.className = "";
      elements.playerFlag.removeAttribute("style");
      elements.playerFlag.replaceChildren(SEH_createCountryFlag(code, "player-country-flag-global"));
    }
  
    function apiUrl(view, params) {
      return `${config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/${view}?${params.toString()}`;
    }
  
  
    const SUPABASE_RETRY_DELAYS = [0, 700, 1800];
  
    function wait(milliseconds) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });
    }
  
    function isRetryableSupabaseFailure(status, body, error) {
      if (error instanceof TypeError) return true;
      if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  
      const text = String(body || error?.message || "");
      return (
        text.includes('"code":"57014"') ||
        text.includes("statement timeout") ||
        text.includes("canceling statement due to statement timeout") ||
        text.includes("Failed to fetch")
      );
    }
  
    async function fetchSupabaseResponse(url, options, label) {
      let lastError = null;
  
      for (
        let attempt = 0;
        attempt < SUPABASE_RETRY_DELAYS.length;
        attempt += 1
      ) {
        if (SUPABASE_RETRY_DELAYS[attempt] > 0) {
          await wait(SUPABASE_RETRY_DELAYS[attempt]);
        }
  
        try {
          const response = await fetch(url, {
            cache: "no-store",
            ...options
          });
          const body = await response.text();
  
          if (response.ok) {
            return { response, body };
          }
  
          const error = new Error(
            `${label}: Supabase svarade ${response.status}. ${
              body || response.statusText
            }`
          );
  
          if (
            attempt < SUPABASE_RETRY_DELAYS.length - 1 &&
            isRetryableSupabaseFailure(response.status, body, error)
          ) {
            console.warn(
              `${label}: tillfälligt Supabase-fel, försök ${
                attempt + 2
              } av ${SUPABASE_RETRY_DELAYS.length}.`
            );
            lastError = error;
            continue;
          }
  
          return { response, body };
        } catch (error) {
          lastError = error;
  
          if (
            attempt < SUPABASE_RETRY_DELAYS.length - 1 &&
            isRetryableSupabaseFailure(0, "", error)
          ) {
            console.warn(
              `${label}: nätverksfel, försök ${
                attempt + 2
              } av ${SUPABASE_RETRY_DELAYS.length}.`
            );
            continue;
          }
  
          throw error;
        }
      }
  
      throw lastError || new Error(`${label}: hämtningen misslyckades.`);
    }
  
    function parseSupabaseArray(body, label) {
      let data;
  
      try {
        data = body ? JSON.parse(body) : [];
      } catch {
        throw new Error(`${label}: Supabase returnerade ogiltig JSON.`);
      }
  
      if (!Array.isArray(data)) {
        throw new Error(`${label}: Supabase returnerade ett oväntat svar.`);
      }
  
      return data;
    }
  
    async function fetchJson(view, params) {
      const { response, body } = await fetchSupabaseResponse(
        apiUrl(view, params),
        {
          headers: {
            apikey: config.supabasePublishableKey.trim(),
            Accept: "application/json"
          }
        },
        view
      );
  
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "De nödvändiga Supabase-vyerna saknas."
            : `${view}: Supabase svarade ${response.status}. ${
                body || response.statusText
              }`
        );
      }
  
      return parseSupabaseArray(body, view);
    }
  
  
    async function fetchAllJson(view, baseParams, pageSize = 1000) {
      const allRows = [];
      let offset = 0;

      while (true) {
        const params = new URLSearchParams(baseParams);
        params.set("limit", String(pageSize));
        params.set("offset", String(offset));

        const rows = await fetchJson(view, params);
        allRows.push(...rows);

        if (rows.length < pageSize) break;
        offset += pageSize;
      }

      return allRows;
    }


    async function fetchRpcJson(functionName, payload) {
      const url = `${
        config.supabaseUrl.replace(/\/+$/, "")
      }/rest/v1/rpc/${functionName}`;
  
      const { response, body } = await fetchSupabaseResponse(
        url,
        {
          method: "POST",
          headers: {
            apikey: config.supabasePublishableKey.trim(),
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        },
        functionName
      );
  
      if (!response.ok) {
        throw new Error(
          `${functionName}: Supabase svarade ${response.status}. ${
            body || response.statusText
          }`
        );
      }
  
      return parseSupabaseArray(body, functionName);
    }
  
  
    function getPlayerKey() {
      return window.SEH_ROUTE?.params?.playerKey ||
        new URLSearchParams(location.search).get("id") ||
        "";
    }

    function getPlayerKeyHint() {
      const value = String(
        window.SEH_ROUTE?.query?.get("pk") ||
        new URLSearchParams(location.search).get("pk") ||
        ""
      ).trim();

      return SEH_isHashedPlayerKey(value) ? value : "";
    }
  
    function getFromTeam() {
      const value = Number(
        window.SEH_ROUTE?.query?.get("fromTeam") ||
        new URLSearchParams(location.search).get("fromTeam")
      );
      return Number.isInteger(value) && value > 0 ? value : null;
    }
  
    function sportsGamerIdFromUrl(value) {
      return String(value || "").match(/\/players\/(\d+)/i)?.[1] || "";
    }
  
    function directoryRowScore(row) {
      return (
        number(row.tournament_count) * 1000000000 +
        number(row.club_count) * 10000000 +
        number(row.career_games) * 10000 +
        number(row.total_points) * 100 +
        number(row.total_goalie_games)
      );
    }
  
    function chooseBestDirectoryRow(rows) {
      return [...rows].sort((a, b) =>
        directoryRowScore(b) - directoryRowScore(a) ||
        String(b.last_appearance_date || "").localeCompare(
          String(a.last_appearance_date || "")
        )
      )[0] || null;
    }
  
    let playerSlugDirectoryPromise = null;

    async function fetchPlayerSlugDirectory() {
      if (!playerSlugDirectoryPromise) {
        playerSlugDirectoryPromise = fetchAllJson(
          "app_player_directory_cache",
          new URLSearchParams({
            select: "player_key,display_gamertag"
          }),
          1000
        ).catch((error) => {
          playerSlugDirectoryPromise = null;
          throw error;
        });
      }

      return playerSlugDirectoryPromise;
    }

    async function resolvePlayerRouteValue(routeValue) {
      const value = String(routeValue || "").trim();
      if (!value || SEH_isHashedPlayerKey(value)) {
        return value;
      }

      const wantedSlug = SEH_playerSlug(value);
      if (!wantedSlug) {
        return value;
      }

      const rows = await fetchPlayerSlugDirectory();
      const matches = rows.filter((row) =>
        SEH_playerSlug(row.display_gamertag || row.player_key) === wantedSlug
      );

      if (!matches.length) {
        return value;
      }

      if (matches.length > 1) {
        console.warn(
          `Svensk eHockey: flera spelare matchar URL-sluggen "${wantedSlug}". ` +
          "Första katalogmatchningen används."
        );
      }

      return String(matches[0].player_key || value).trim();
    }


    async function fetchDirectoryPlayer(playerKey) {
      const params = new URLSearchParams({
        select: "*",
        player_key: `eq.${playerKey}`,
        limit: "25"
      });

      return fetchJson("app_player_directory_cache", params);
    }
  
    async function fetchPlayerHistory(playerKey, directoryRow) {
      const sportsGamerPlayerId = sportsGamerIdFromUrl(
        directoryRow?.sports_gamer_player_url
      );
  
      // Ett enda snabbt RPC-anrop mot den fysiska cachetabellen.
      // RPC:t söker globalt på player_key, effektivt SportsGamer-ID,
      // identitetsoverride, profil-URL och normaliserat GT.
      return fetchRpcJson(
        "get_ehockey_player_history_cache_v26",
        {
          p_player_key: playerKey || null,
          p_sports_gamer_player_id:
            sportsGamerPlayerId
              ? Number(sportsGamerPlayerId)
              : null,
          p_display_gamertag:
            directoryRow?.display_gamertag || null
        }
      );
    }

    let leagueDisplayNameMapPromise = null;

    async function fetchLeagueDisplayNameMap() {
      if (!leagueDisplayNameMapPromise) {
        const params = new URLSearchParams({
          select: "league_id,display_name",
          limit: "1000"
        });

        leagueDisplayNameMapPromise = fetchJson(
          "v_ehockey_league_catalog_v1",
          params
        )
          .then((rows) => new Map(
            rows.map((row) => [
              Number(row.league_id),
              String(row.display_name || "").trim()
            ])
          ))
          .catch((error) => {
            leagueDisplayNameMapPromise = null;
            throw error;
          });
      }

      return leagueDisplayNameMapPromise;
    }

    async function addLeagueDisplayNames(rows) {
      try {
        const displayNames = await fetchLeagueDisplayNameMap();
        return rows.map((row) => ({
          ...row,
          catalog_display_name:
            displayNames.get(Number(row.league_id)) || ""
        }));
      } catch (error) {
        console.warn(
          `${APP_BUILD}: kunde inte hämta standardiserade liganamn; tidigare namn används som reserv.`,
          error
        );
        return rows;
      }
    }
  
    function tournamentUrl(row) {
      const teamId = String(row.teamId ?? row.team_id ?? "");
      const leagueId = String(row.leagueId ?? row.league_id ?? "");
      const params = new URLSearchParams();

      const teamName = String(
        row.teamName ||
        row.team_name_in_tournament ||
        row.teamCurrentName ||
        row.team_current_name ||
        ""
      ).trim();

      const teamCurrentName = String(
        row.teamCurrentName ||
        row.team_current_name ||
        ""
      ).trim();

      const teamExternalId = String(
        row.teamExternalId ||
        row.team_external_id ||
        ""
      ).trim();

      if (teamName) params.set("teamName", teamName);
      if (teamCurrentName) params.set("teamCurrentName", teamCurrentName);
      if (teamExternalId) params.set("teamExternalId", teamExternalId);

      const query = params.toString();
      return `#/lag/${encodeURIComponent(teamId)}/turnering/${encodeURIComponent(leagueId)}${query ? `?${query}` : ""}`;
    }
  
    function teamUrl(teamId) {
      return `#/lag/${encodeURIComponent(teamId)}`;
    }
  
    function normalizedSeasonLabel(value, competitionCode = "", leagueName = "") {
      const raw = String(value || leagueName || "").trim();
      if (!raw) return "Okänd säsong";
  
      if (String(competitionCode).trim().toUpperCase() === "SEC") {
        if (/^SEC(?:\s|$)/i.test(raw)) {
          return raw.replace(/^sec/i, "SEC");
        }
        if (/^\d+(?:\.\d+)?(?:\s+Challenger)?$/i.test(raw)) {
          return `SEC ${raw}`;
        }
      }
  
      return raw;
    }
  
    function validChronologyDate(value) {
      if (!value) return 0;
      const text = String(value).slice(0, 10);
      const year = Number(text.slice(0, 4));
      if (!Number.isInteger(year) || year < 1980 || year > 2099) return 0;
      const timestamp = Date.parse(`${text}T00:00:00`);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }
  
    function tournamentChronologyValue(row) {
      // chronology_date är det korrigerade gemensamma datumet från Supabase.
      // Råa SportsGamer-datum får bara användas när chronology_date saknas;
      // annars kan felaktiga importdatum flytta äldre säsonger flera år.
      const chronology = validChronologyDate(row.chronologyDate);
      if (chronology) return chronology;
  
      return (
        validChronologyDate(row.endDate) ||
        validChronologyDate(row.sortDate) ||
        validChronologyDate(row.startDate)
      );
    }
  
    function normalizedCompetitionCode(row) {
      const explicit = String(row.competitionCode || "").trim().toUpperCase();

      /*
       * eHSM visas via catalogDisplayName i tabellen.
       * Äldre data kan samtidigt ha seasonLabel/competitionCode = SM.
       * Därför måste catalogDisplayName ingå i själva filterklassificeringen.
       */
      const label = [
        row.catalogDisplayName,
        row.seasonLabel,
        row.leagueName,
        row.competitionName
      ]
        .filter(Boolean)
        .join(" ");

      const normalizedLabel = label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

      /* eHSM hör till FCL och ska aldrig hamna under SM. */
      if (/(^|[^A-Z0-9])EHSM([^A-Z0-9]|$)/.test(normalizedLabel)) {
        return "FCL";
      }

      if (/EUROPEAN CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])ECL([^A-Z0-9]|$)/.test(normalizedLabel)) return "ECL";
      if (/SWEDISH CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])SCL([^A-Z0-9]|$)/.test(normalizedLabel)) return "SCL";
      if (/FINNISH CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])FCL([^A-Z0-9]|$)/.test(normalizedLabel)) return "FCL";
      if (/GERMAN CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])GCL([^A-Z0-9]|$)/.test(normalizedLabel)) return "GCL";
      if (/RUSSIAN CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])RCL([^A-Z0-9]|$)/.test(normalizedLabel)) return "RCL";
      if (/CZECH SLOVAK CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])CSCL([^A-Z0-9]|$)/.test(normalizedLabel)) return "CSCL";
      if (/NORTH AMERICAN CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])NACL([^A-Z0-9]|$)/.test(normalizedLabel)) return "NACL";
      if (/(^|[^A-Z0-9])SEC([^A-Z0-9]|$)/.test(normalizedLabel)) return "SEC";
      if (/(^|[^A-Z0-9])ITHL([^A-Z0-9]|$)/.test(normalizedLabel)) return "ITHL";
      if (/(^|[^A-Z0-9])LGEL([^A-Z0-9]|$)/.test(normalizedLabel)) return "LGEL";
      if (/(^|[^A-Z0-9])6HL([^A-Z0-9]|$)/.test(normalizedLabel)) return "6HL";
      if (/(^|[^A-Z0-9])E-?SHL([^A-Z0-9]|$)/.test(normalizedLabel)) return "ESHL";

      if (
        /SM\s*EHOCKEY|EHOCKEY\s*SM|(^|[^A-Z0-9])SM([^A-Z0-9]|$)/.test(normalizedLabel)
      ) {
        return "SM";
      }

      if (explicit && explicit !== "SPORTSGAMER" && explicit !== "ÖVRIGT") {
        return explicit;
      }

      return "ÖVRIGT";
    }

    function tournamentSequenceValue(row) {
      const code = normalizedCompetitionCode(row);
      const label = `${row.seasonLabel || ""} ${row.leagueName || ""}`;
      let match = null;
  
      if (code === "ECL") {
        match = label.match(/(?:european championship league|\becl\b)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
      } else if (code === "SEC") {
        match = label.match(/\bsec\s*([0-9]+(?:\.[0-9]+)?)/i);
      } else if (code === "LGEL") {
        match = label.match(/\blgel(?:\s+season)?\s*([0-9]+(?:\.[0-9]+)?)/i);
      }
  
      if (!match && row.seasonNumber) {
        const value = Number(String(row.seasonNumber).replace(",", "."));
        if (Number.isFinite(value)) return value;
      }
  
      return match ? Number(match[1]) : 0;
    }
  
    function labelYearValue(row) {
      if (Number.isFinite(row.seasonYear) && row.seasonYear >= 1980) {
        return row.seasonYear;
      }
      const label = `${row.seasonLabel || ""} ${row.leagueName || ""}`;
      const years = [...label.matchAll(/(?:19|20)\d{2}/g)].map((match) => Number(match[0]));
      return years.length ? Math.max(...years) : 0;
    }
  
    function compareHistoryRows(a, b) {
      // All turneringar, oavsett tävling, sorteras på samma kronologidatum.
      // Säsongsnummer används bara som sista reserv när två rader saknar datum.
      const dateDifference = tournamentChronologyValue(b) - tournamentChronologyValue(a);
      if (dateDifference) return dateDifference;
  
      const yearDifference = labelYearValue(b) - labelYearValue(a);
      if (yearDifference) return yearDifference;
  
      const sequenceDifference = tournamentSequenceValue(b) - tournamentSequenceValue(a);
      if (sequenceDifference) return sequenceDifference;
  
      return Number(b.leagueId || 0) - Number(a.leagueId || 0) ||
        b.seasonLabel.localeCompare(a.seasonLabel, "sv-SE", { numeric: true });
    }
  
    function inferCompetitionCode(row) {
      const code = String(row.competition_code || "").trim().toUpperCase();
      if (code === "ESHL") return "ESHL";
      return code || "ÖVRIGT";
    }
  
    function normalize(row) {
      const competitionCode = inferCompetitionCode(row);
      const rawSkaterGames = number(row.total_skater_games);
      const rawGoalieGames = number(row.total_goalie_games);
      const isGoalieOnly = row.is_goalie_only === true || row.is_goalie_only === "true";
      const normalized = {
        playerKey: row.player_key || "",
        playerSource: row.player_source || "",
        canonicalName: row.canonical_display_gamertag || row.sports_gamer_gamertag || row.sportsgamer_gamertag || "",
        name: row.canonical_display_gamertag || row.sports_gamer_gamertag || row.sportsgamer_gamertag || row.display_gamertag || "Okänd spelare",
        country: String(row.player_country || "").toUpperCase(),
        image: row.player_image || "",
        externalUrl: row.sports_gamer_player_url || "",
        sportsGamerPlayerId: row.sports_gamer_player_id || row.sportsgamer_player_id || "",
        teamId: Number(row.team_id) || null,
        teamIsLinkable: row.team_is_linkable === true || row.team_is_linkable === "true",
        teamExternalId: row.team_external_id || "",
        teamCurrentName: row.team_current_name || "Okänt lag",
        teamName: row.team_name_in_tournament || row.team_current_name || "Okänt lag",
        competitionCode,
        competitionName: row.competition_name || "",
        seasonLabel: normalizedSeasonLabel(
          row.season_label,
          competitionCode,
          row.league_name
        ),
        seasonNumber: row.season_number || "",
        seasonYear: nullableNumber(row.season_year),
        seasonPeriod: row.season_period || "",
        leagueName: row.league_name || row.season_label || "",
        catalogDisplayName: row.catalog_display_name || "",
        division: row.division || "",
        leagueId: Number(row.league_id),
        startDate:
          row.display_start_date ||
          row.chronology_date ||
          row.start_date ||
          "",
        endDate:
          row.display_end_date ||
          row.chronology_end_date ||
          row.end_date ||
          row.display_start_date ||
          row.chronology_date ||
          row.start_date ||
          "",
        sortDate: row.sort_date || row.end_date || row.start_date || "",
        chronologyDate:
          row.chronology_date ||
          row.display_start_date ||
          row.sort_date ||
          row.end_date ||
          row.start_date ||
          "",
        chronologyEndDate:
          row.chronology_end_date ||
          row.display_end_date ||
          "",
        position: row.primary_position || "",
        playerType: row.player_type || "skater",
  
        regularSkaterGames: number(row.regular_skater_games),
        playoffSkaterGames: number(row.playoff_skater_games),
        regularGoals: number(row.regular_goals),
        playoffGoals: number(row.playoff_goals),
        regularAssists: number(row.regular_assists),
        playoffAssists: number(row.playoff_assists),
        regularPoints: number(row.regular_points),
        playoffPoints: number(row.playoff_points),
        regularPenaltyMinutes: number(row.regular_penalty_minutes),
        playoffPenaltyMinutes: number(row.playoff_penalty_minutes),
  
        skaterGames: number(row.total_skater_games),
        goals: number(row.total_goals),
        assists: number(row.total_assists),
        points: number(row.total_points),
        plusMinus: number(row.total_plus_minus),
        penaltyMinutes: number(row.total_penalty_minutes),
  
        regularGoalieGames: number(row.regular_goalie_games),
        playoffGoalieGames: number(row.playoff_goalie_games),
        regularGoalieWins: number(row.regular_goalie_wins),
        playoffGoalieWins: number(row.playoff_goalie_wins),
        regularGoalieLosses: number(row.regular_goalie_losses),
        playoffGoalieLosses: number(row.playoff_goalie_losses),
        regularGoalieOvertimeLosses: number(row.regular_goalie_overtime_losses),
        playoffGoalieOvertimeLosses: number(row.playoff_goalie_overtime_losses),
        regularSaves: number(row.regular_goalie_saves),
        playoffSaves: number(row.playoff_goalie_saves),
        regularShotsAgainst: number(row.regular_goalie_shots_against),
        playoffShotsAgainst: number(row.playoff_goalie_shots_against),
        regularGoalsAllowed: number(row.regular_goalie_goals_allowed),
        playoffGoalsAllowed: number(row.playoff_goalie_goals_allowed),
        regularShutouts: number(row.regular_goalie_shutouts),
        playoffShutouts: number(row.playoff_goalie_shutouts),
  
        goalieGames: number(row.total_goalie_games),
        goalieWins: number(row.total_goalie_wins),
        goalieLosses: number(row.total_goalie_losses),
        goalieOvertimeLosses: number(row.total_goalie_overtime_losses),
        saves: number(row.total_goalie_saves),
        shotsAgainst: number(row.total_goalie_saves) + number(row.total_goalie_goals_allowed) > 0
          ? number(row.total_goalie_saves) + number(row.total_goalie_goals_allowed)
          : number(row.total_goalie_shots_against),
        goalsAllowed: number(row.total_goalie_goals_allowed),
        savePercentage: number(row.total_goalie_saves) + number(row.total_goalie_goals_allowed) > 0
          ? number(row.total_goalie_saves) /
            (number(row.total_goalie_saves) + number(row.total_goalie_goals_allowed))
          : nullableNumber(row.total_goalie_save_percentage),
        gaa: nullableNumber(row.total_goalie_goals_against_average),
        shutouts: number(row.total_goalie_shutouts),
        appearanceGames: number(row.appearance_games) || Math.max(rawSkaterGames, rawGoalieGames),
        isGoalieOnly
      };
  
      if (isGoalieOnly) {
        normalized.regularSkaterGames = 0;
        normalized.playoffSkaterGames = 0;
        normalized.skaterGames = 0;
        normalized.playerType = "goalie";
      }
  
      return normalized;
    }
  
    function sum(rows, key) {
      return rows.reduce((total, row) => total + number(row[key]), 0);
    }
  
    function setAvatar(row) {
      elements.playerAvatar.replaceChildren();
      const image = document.createElement("img");
      image.src = localPlayerImageUrl(row);
      image.alt = `${row.name}`;
      image.addEventListener("error", () => {
        if (!image.dataset.fallback) {
          image.dataset.fallback = "1";
          image.src = "players/1DEFAULTBILDID.png";
          return;
        }
        elements.playerAvatar.replaceChildren();
        elements.playerAvatar.textContent = initials(row.name);
      });
      elements.playerAvatar.append(image);
    }
  
    const DEFAULT_HERO_PALETTE = {
      primary: "#0b2647",
      secondary: "#d6b15f"
    };

    const PLAYER_HERO_TEAM_COLOR_PRESETS = {
      /* Samma referens-preset som Android-appen. */
      "ssk esports": { primary: "#0750a0", secondary: "#f0c51b" }
    };

    function profileTeamPaletteKey(teamName) {
      return String(teamName || "").trim().toLocaleLowerCase("sv-SE");
    }

    function profileRgbToHex(r, g, b) {
      const part = (value) => Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0");
      return `#${part(r)}${part(g)}${part(b)}`;
    }

    function profileColorDistance(a, b) {
      return Math.sqrt(
        (a[0] - b[0]) ** 2 +
        (a[1] - b[1]) ** 2 +
        (a[2] - b[2]) ** 2
      );
    }

    /*
     * Samma palettprincip som Android-appen:
     * - skala loggan till 48x48
     * - ignorera transparent, nästan svart/vitt och grått
     * - kvantisera RGB i steg om 32
     * - vanligaste tydliga färgen = primary
     * - första färgen >90 RGB-enheter bort = secondary
     */
    function profilePaletteFromLogo(image) {
      try {
        if (!(image instanceof HTMLImageElement)) return null;
        if (!image.naturalWidth || !image.naturalHeight) return null;
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return null;
        context.clearRect(0, 0, 48, 48);
        context.drawImage(image, 0, 0, 48, 48);
        const pixels = context.getImageData(0, 0, 48, 48).data;
        const buckets = new Map();
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          if (alpha < 100) continue;
          let r = pixels[index];
          let g = pixels[index + 1];
          let b = pixels[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const light = (max + min) / 2;
          const saturation = max - min;
          if (light < 24 || light > 235 || saturation < 24) continue;
          r = Math.round(r / 32) * 32;
          g = Math.round(g / 32) * 32;
          b = Math.round(b / 32) * 32;
          const key = `${r},${g},${b}`;
          buckets.set(key, (buckets.get(key) || 0) + 1);
        }
        const colors = [...buckets.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => ({
            rgb: key.split(",").map(Number),
            count
          }));
        if (!colors.length) return null;
        const primary = colors[0].rgb;
        const secondary = (
          colors.find((item) => profileColorDistance(item.rgb, primary) > 90) ||
          colors[1] ||
          colors[0]
        ).rgb;
        return {
          primary: profileRgbToHex(...primary),
          secondary: profileRgbToHex(...secondary)
        };
      } catch (error) {
        return null;
      }
    }

    function setPlayerHeroPalette(palette) {
      if (!elements.playerHero) return;
      const chosen = palette || DEFAULT_HERO_PALETTE;
      const primary = chosen.primary || chosen.primaryColor || DEFAULT_HERO_PALETTE.primary;
      const secondary = chosen.secondary || chosen.secondaryColor || primary;
      elements.playerHero.style.setProperty("--player-team-primary", primary);
      elements.playerHero.style.setProperty("--player-team-secondary", secondary);
    }

    function hydratePlayerHeroPalette(teamName) {
      const key = profileTeamPaletteKey(teamName);
      const configured =
        window.SEH_TEAM_COLORS?.[teamName] ||
        window.SEH_TEAM_COLORS?.[key] ||
        PLAYER_HERO_TEAM_COLOR_PRESETS[key];
      const cache = window.__SEH_TEAM_PALETTE_CACHE_V1236__ instanceof Map
        ? window.__SEH_TEAM_PALETTE_CACHE_V1236__
        : (window.__SEH_TEAM_PALETTE_CACHE_V1236__ = new Map());

      setPlayerHeroPalette(DEFAULT_HERO_PALETTE);
      if (configured) {
        setPlayerHeroPalette(configured);
        return;
      }
      if (cache.has(key)) {
        setPlayerHeroPalette(cache.get(key));
        return;
      }

      /*
       * Läs färgen från en egen lokal teamlogos-bild, inte från den
       * lazy-loadade watermarken. Det gör samma Android-palett stabil även
       * på webben och undviker att vi faller tillbaka till standardfärgen.
       */
      const paletteImage = new Image();
      paletteImage.loading = "eager";
      paletteImage.decoding = "async";
      paletteImage.alt = "";

      const read = () => {
        const palette = profilePaletteFromLogo(paletteImage);
        if (!palette) return;
        cache.set(key, palette);
        setPlayerHeroPalette(palette);
      };

      paletteImage.addEventListener("load", read, { once: true });
      SEH_applyTeamLogo(paletteImage, [], teamName, null);
    }

    function renderProfileTeamBrand(teamName) {
      const displayName = String(teamName || "").trim() || "Okänt lag";
      if (elements.playerCurrentTeamLogo) {
        SEH_renderTeamLogo(
          elements.playerCurrentTeamLogo,
          [],
          displayName,
          `${displayName} logotyp`
        );
      }
      if (elements.playerHeroWatermark) {
        SEH_renderTeamLogo(
          elements.playerHeroWatermark,
          [],
          displayName,
          ""
        );
      }
      if (elements.playerPortraitWatermark) {
        SEH_renderTeamLogo(
          elements.playerPortraitWatermark,
          [],
          displayName,
          ""
        );
      }
      hydratePlayerHeroPalette(displayName);
    }

    function resetProfileRanking() {
      if (elements.heroTotalRp) elements.heroTotalRp.textContent = "–";
      if (elements.heroSwedenRank) elements.heroSwedenRank.textContent = "–";
      if (elements.heroAverageRp) elements.heroAverageRp.textContent = "–";
      if (elements.heroPositionRank) elements.heroPositionRank.textContent = "–";
      if (elements.profileStripRp) elements.profileStripRp.textContent = "–";
    }

    function applyProfileRanking(rank) {
      if (!rank) return;
      const totalRp = Number.isFinite(Number(rank.ranking_points))
        ? SEH_formatRpNumber(rank.ranking_points)
        : "–";
      const overallRank = Number(rank.overall_rank) > 0
        ? `#${SEH_formatRpNumber(rank.overall_rank)}`
        : "–";
      const averageRp = Number(rank.average_rank) > 0 && Number.isFinite(Number(rank.average_rating))
        ? SEH_formatRpNumber(rank.average_rating, 3)
        : "–";
      const positionGroup = String(rank.position_group || "").toUpperCase() ||
        (String(rank.primary_position || "").toUpperCase() === "G" ? "G" : "F");
      const roleRank = positionGroup === "G"
        ? rank.goalie_rank
        : (rank.position_rank || rank.skater_rank);
      const roleRankText = Number(roleRank) > 0
        ? `#${SEH_formatRpNumber(roleRank)}`
        : "–";

      if (elements.heroTotalRp) elements.heroTotalRp.textContent = totalRp;
      if (elements.heroSwedenRank) elements.heroSwedenRank.textContent = overallRank;
      if (elements.heroAverageRp) elements.heroAverageRp.textContent = averageRp;
      if (elements.heroPositionRank) elements.heroPositionRank.textContent = roleRankText;
      if (elements.profileStripRp) elements.profileStripRp.textContent = totalRp;
    }

    async function hydrateProfileRanking(playerKey, displayName) {
      resetProfileRanking();
      try {
        const lookup = await SEH_loadPlayerRanking();
        const rank = SEH_findPlayerRanking(lookup, playerKey, displayName);
        if (rank) applyProfileRanking(rank);
      } catch (error) {
        console.warn(`${APP_BUILD}: RP/ranking kunde inte laddas just nu.`, error);
      }
    }

    function addStat(container, label, value) {
      const item = document.createElement("div");
      const span = document.createElement("span");
      const strong = document.createElement("strong");
      span.textContent = label;
      strong.textContent = value;
      item.append(span, strong);
      container.append(item);
    }
  
    function historicalPlayerTeamName(row) {
      return String(
        row?.resolvedHistoricalTeamName ||
        row?.teamName ||
        row?.teamCurrentName ||
        ""
      ).trim();
    }

    function normalizedClubKey(row) {
      const name = historicalPlayerTeamName(row);
      if (!name || /free\s*agent/i.test(name)) return "";
      return name
        .toLocaleLowerCase("sv-SE")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    }
  
    function uniqueClubCount(rows) {
      return new Set(rows.map(normalizedClubKey).filter(Boolean)).size;
    }
  
    function uniqueTournamentCount(rows) {
      return new Set(
        rows
          .map((row) => Number(row.leagueId))
          .filter((leagueId) => Number.isFinite(leagueId) && leagueId > 0)
      ).size;
    }
  
    function historyTeamIdentity(row) {
      const historicalName = historicalPlayerTeamName(row);
      const normalizedHistoricalName = normalizedPlayerTeamName(historicalName);

      // SportsGamer-ID är inte en stabil klubbidentitet över tid. Samma ID kan
      // ha använts av flera helt olika lag, så turneringens lagnamn är primärt.
      if (normalizedHistoricalName) return `name:${normalizedHistoricalName}`;
      if (row.teamExternalId) return `external:${String(row.teamExternalId).trim().toLowerCase()}`;
      if (row.teamId) return `team:${row.teamId}`;
      return "name:okantlag";
    }
  
    function historyIdentity(row) {
      return [row.playerKey, row.leagueId, historyTeamIdentity(row)].join("|");
    }
  
    function maximum(rows, key) {
      return Math.max(0, ...rows.map((row) => number(row[key])));
    }
  
    function historyCompletenessScore(row) {
      return (
        row.appearanceGames * 1000000 +
        (row.points + row.saves) * 100 +
        (row.externalUrl ? 10 : 0) +
        (row.teamIsLinkable ? 1 : 0)
      );
    }
  
    function mergeDuplicateHistoryRows(group) {
      const preferred = [...group].sort((a, b) =>
        historyCompletenessScore(b) - historyCompletenessScore(a) ||
        tournamentChronologyValue(b) - tournamentChronologyValue(a)
      )[0];
      const merged = { ...preferred };
  
      const stageFields = [
        "regularSkaterGames", "playoffSkaterGames",
        "regularGoals", "playoffGoals",
        "regularAssists", "playoffAssists",
        "regularPoints", "playoffPoints",
        "regularPenaltyMinutes", "playoffPenaltyMinutes",
        "regularGoalieGames", "playoffGoalieGames",
        "regularGoalieWins", "playoffGoalieWins",
        "regularGoalieLosses", "playoffGoalieLosses",
        "regularGoalieOvertimeLosses", "playoffGoalieOvertimeLosses",
        "regularSaves", "playoffSaves",
        "regularShotsAgainst", "playoffShotsAgainst",
        "regularGoalsAllowed", "playoffGoalsAllowed",
        "regularShutouts", "playoffShutouts"
      ];
      stageFields.forEach((key) => { merged[key] = maximum(group, key); });
  
      merged.skaterGames = Math.max(
        maximum(group, "skaterGames"),
        merged.regularSkaterGames + merged.playoffSkaterGames
      );
      merged.goals = Math.max(
        maximum(group, "goals"),
        merged.regularGoals + merged.playoffGoals
      );
      merged.assists = Math.max(
        maximum(group, "assists"),
        merged.regularAssists + merged.playoffAssists
      );
      merged.points = Math.max(
        maximum(group, "points"),
        merged.regularPoints + merged.playoffPoints
      );
      merged.penaltyMinutes = Math.max(
        maximum(group, "penaltyMinutes"),
        merged.regularPenaltyMinutes + merged.playoffPenaltyMinutes
      );
      merged.plusMinus = maximum(group, "plusMinus");
  
      merged.goalieGames = Math.max(
        maximum(group, "goalieGames"),
        merged.regularGoalieGames + merged.playoffGoalieGames
      );
      merged.goalieWins = Math.max(
        maximum(group, "goalieWins"),
        merged.regularGoalieWins + merged.playoffGoalieWins
      );
      merged.goalieLosses = Math.max(
        maximum(group, "goalieLosses"),
        merged.regularGoalieLosses + merged.playoffGoalieLosses
      );
      merged.goalieOvertimeLosses = Math.max(
        maximum(group, "goalieOvertimeLosses"),
        merged.regularGoalieOvertimeLosses + merged.playoffGoalieOvertimeLosses
      );
      merged.saves = Math.max(
        maximum(group, "saves"),
        merged.regularSaves + merged.playoffSaves
      );
      merged.goalsAllowed = Math.max(
        maximum(group, "goalsAllowed"),
        merged.regularGoalsAllowed + merged.playoffGoalsAllowed
      );
      const derivedMergedShotsAgainst = merged.saves + merged.goalsAllowed;
      merged.shotsAgainst = derivedMergedShotsAgainst > 0
        ? derivedMergedShotsAgainst
        : Math.max(
            maximum(group, "shotsAgainst"),
            merged.regularShotsAgainst + merged.playoffShotsAgainst
          );
      merged.shutouts = Math.max(
        maximum(group, "shutouts"),
        merged.regularShutouts + merged.playoffShutouts
      );
      merged.savePercentage = merged.shotsAgainst
        ? merged.saves / merged.shotsAgainst
        : preferred.savePercentage;
      merged.gaa = merged.goalieGames
        ? merged.goalsAllowed / merged.goalieGames
        : preferred.gaa;
      merged.playerType = merged.goalieGames > 0 && merged.skaterGames > 0
        ? "hybrid"
        : merged.goalieGames > 0 ? "goalie" : "skater";
  
      return merged;
    }
  
    function dedupeHistoryRows(rows) {
      const groups = new Map();
      rows.forEach((row) => {
        const key = historyIdentity(row);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      });
      return [...groups.values()].map(mergeDuplicateHistoryRows);
    }
  
    function roleLabel(skaterGames, goalieGames) {
      if (goalieGames > skaterGames) return "Målvakt";
      if (goalieGames > 0 && skaterGames > 0) return "Utespelare / Målvakt";
      return "Utespelare";
    }

    function seasonWord(value) {
      return number(value) === 1 ? "säsong" : "säsonger";
    }

    function matchWord(value) {
      return number(value) === 1 ? "match" : "matcher";
    }

    function competitionDisplayLabel(code) {
      const normalized = String(code || "").trim().toUpperCase();
      const labels = {
        ECL: "ECL",
        SEC: "SEC",
        SCL: "SCL",
        SM: "SM",
        ESHL: "eSHL",
        LGEL: "LGEL",
        ITHL: "ITHL"
      };
      return labels[normalized] || normalized;
    }

    function competitionLine(rows) {
      const labels = [];
      const seen = new Set();

      rows.forEach((row) => {
        const code = normalizedCompetitionCode(row);

        if (!code || code === "SPORTSGAMER" || code === "ÖVRIGT") return;

        const label = competitionDisplayLabel(code);
        const key = label.toLocaleLowerCase("sv-SE");

        if (!seen.has(key)) {
          seen.add(key);
          labels.push(label);
        }
      });

      return labels.join(", ");
    }

    function cleanStandaloneCompetitions(values) {
      const labels = [];
      const seen = new Set();

      values.forEach((value) => {
        let raw = String(value || "").trim();
        if (!raw) return;

        const upper = raw.toUpperCase();

        if (upper === "SPORTSGAMER" || upper === "ÖVRIGT") return;

        let code = upper;

        if (/^ECL(?:\s|\s*-|$)/i.test(raw)) code = "ECL";
        else if (/^SM(?:\s|\s*-|$)/i.test(raw)) code = "SM";
        else if (/^ESHL$/i.test(raw)) code = "ESHL";
        else if (/^SEC(?:\s|\s*-|$)/i.test(raw)) code = "SEC";
        else if (/^SCL(?:\s|\s*-|$)/i.test(raw)) code = "SCL";
        else if (/^LGEL(?:\s|\s*-|$)/i.test(raw)) code = "LGEL";
        else if (/^ITHL(?:\s|\s*-|$)/i.test(raw)) code = "ITHL";

        if (code === "SPORTSGAMER" || code === "ÖVRIGT") return;

        const label = competitionDisplayLabel(code);
        const key = label.toLocaleLowerCase("sv-SE");

        if (!seen.has(key)) {
          seen.add(key);
          labels.push(label);
        }
      });

      return labels;
    }

    function setProfileBio(paragraphs) {
      elements.playerBio.replaceChildren();

      paragraphs
        .filter(Boolean)
        .forEach((text) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = text;
          elements.playerBio.append(paragraph);
        });
    }

    function bioSeasonLabel(row) {
      const code = normalizedCompetitionCode(row);
      const source = String(
        row?.seasonLabel ||
        row?.leagueName ||
        ""
      ).trim();

      if (code === "ECL") {
        const seasonMatch = source.match(/(?:european\s+championship\s+league|season|\becl\b)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
        const modernMatch = source.match(/(?:ecl\s*)?'?([0-9]{2})'?\s*[:\-]?\s*(spring|winter)/i);
        const division = String(row?.division || "").trim();

        if (modernMatch) {
          return `ECL ${modernMatch[1]} ${modernMatch[2][0].toUpperCase()}${modernMatch[2].slice(1).toLowerCase()}${division ? ` ${division}` : ""}`;
        }

        if (seasonMatch) {
          return `ECL ${seasonMatch[1]}${division ? ` ${division}` : ""}`;
        }

        return "ECL";
      }

      if (code === "SCL") {
        const yearMatch = source.match(/(?:19|20)\d{2}/);
        if (yearMatch) return `SCL ${yearMatch[0].slice(-2)}`;
        return "SCL";
      }

      if (code === "SEC") {
        const secMatch = source.match(/\bsec\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (secMatch) return `SEC ${secMatch[1]}`;
        return "SEC";
      }

      if (code === "LGEL") {
        const lgelMatch = source.match(/\blgel(?:\s+season)?\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (lgelMatch) return `LGEL S${lgelMatch[1]}`;
        return "LGEL";
      }

      return source || code || "den registrerade turneringen";
    }

    function appendBioTeamLink(paragraph, row, fallbackName = "ett registrerat lag") {
      const teamName = String(row?.teamName || fallbackName).trim() || fallbackName;

      if (row?.teamId) {
        const link = document.createElement("a");
        link.className = "player-bio-team-link";
        link.href = teamUrl(row.teamId);
        link.textContent = teamName;
        paragraph.append(link);
      } else {
        paragraph.append(document.createTextNode(teamName));
      }
    }

    function isNationalTeamHistoryRow(row) {
      const leagueId = Number(row?.leagueId ?? row?.league_id);
      if ([453, 517, 518].includes(leagueId)) return true;

      const text = [
        row?.seasonLabel,
        row?.leagueName,
        row?.competitionName,
        row?.catalogDisplayName
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("sv-SE");

      return text.includes("world cup");
    }

    function clubHistoryRows(rows) {
      return rows.filter((row) => !isNationalTeamHistoryRow(row));
    }

    function renderNationalTeamBio(nationalTeamRows = []) {
      const oldRows = elements.playerBio.querySelectorAll("[data-national-team-bio]");
      oldRows.forEach((row) => row.remove());

      nationalTeamRows
        .filter((row) => number(row?.matches) > 0)
        .sort((a, b) => number(b?.matches) - number(a?.matches))
        .forEach((row) => {
          const phrase = String(row?.national_team_phrase_sv || "").trim();
          if (!phrase) return;

          const paragraph = document.createElement("p");
          paragraph.dataset.nationalTeamBio = "true";
          paragraph.textContent =
            `Spelaren har representerat ${phrase} i ${formatInteger(row.matches, "0")} ${matchWord(number(row.matches))}.`;

          const roleParagraph = [...elements.playerBio.querySelectorAll("p")]
            .find((item) => item.textContent.startsWith("Profilen är främst noterad"));

          if (roleParagraph) {
            roleParagraph.before(paragraph);
          } else {
            elements.playerBio.append(paragraph);
          }
        });
    }

    function naturalSwedishList(values) {
      const items = values.filter(Boolean);
      if (!items.length) return "";
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} och ${items[1]}`;
      return `${items.slice(0, -1).join(", ")} och ${items[items.length - 1]}`;
    }

    function skaterPositionLabel(value) {
      const raw = String(value || "").trim();
      const normalized = raw.toUpperCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
      const labels = {
        C: "center",
        CENTER: "center",
        CENTRE: "center",
        LW: "vänsterforward",
        "LEFT WING": "vänsterforward",
        "LEFT WINGER": "vänsterforward",
        RW: "högerforward",
        "RIGHT WING": "högerforward",
        "RIGHT WINGER": "högerforward",
        LD: "vänsterback",
        "LEFT DEFENSE": "vänsterback",
        "LEFT DEFENCE": "vänsterback",
        "LEFT DEFENSEMAN": "vänsterback",
        RD: "högerback",
        "RIGHT DEFENSE": "högerback",
        "RIGHT DEFENCE": "högerback",
        "RIGHT DEFENSEMAN": "högerback",
        D: "back",
        DEFENSE: "back",
        DEFENCE: "back",
        DEFENSEMAN: "back",
        F: "forward",
        FORWARD: "forward",
        SKATER: "utespelare",
        U: "utespelare",
        UTESPELARE: "utespelare"
      };
      if (!raw || normalized === "G" || normalized === "GK" || normalized === "GOALIE" || normalized === "MÅLVAKT") {
        return "";
      }
      return labels[normalized] || raw.toLocaleLowerCase("sv-SE");
    }

    function skaterPositionSummary(profileRows = []) {
      const totals = new Map();
      const sorted = [...profileRows].sort(compareHistoryRows);
      let latestPosition = "";

      sorted.forEach((row) => {
        if (number(row?.skaterGames) <= 0) return;
        const label = skaterPositionLabel(row?.position);
        if (!label) return;
        if (!latestPosition) latestPosition = label;
        totals.set(label, (totals.get(label) || 0) + Math.max(1, number(row?.skaterGames)));
      });

      const primaryPosition = [...totals.entries()]
        .sort((a, b) => b[1] - a[1])[0]?.[0] || latestPosition || "";

      return { primaryPosition, latestPosition };
    }

    function latestRegisteredRole(profileRows = []) {
      const row = [...profileRows].sort(compareHistoryRows)[0] || null;
      if (!row) return { type: "", position: "" };
      const goalie = number(row.goalieGames);
      const skater = number(row.skaterGames);
      if (goalie > skater && goalie > 0) return { type: "goalie", position: "målvakt" };
      if (skater > 0) return { type: "skater", position: skaterPositionLabel(row.position) };
      if (goalie > 0) return { type: "goalie", position: "målvakt" };
      return { type: "", position: "" };
    }

    function meritCountPhrase(count, singular, plural) {
      return `${formatInteger(count, "0")} ${count === 1 ? singular : plural}`;
    }

    function trimSentence(value) {
      return String(value || "").trim().replace(/[.!?]+$/, "");
    }

    function appendBioMeritParagraph({
      currentName,
      profileRows = [],
      meritRows = [],
      personalMeritRows = [],
      nationalTeamRows = []
    }) {
      const teamMerits = buildTeamMerits(meritRows);
      const personalMerits = buildPersonalMerits(
        profileRows,
        personalMeritRows,
        nationalTeamRows
      );

      const championships = teamMerits.filter((item) => item.type === "place-1");
      const finalists = teamMerits.filter((item) => item.type === "place-2");
      const bronze = teamMerits.filter((item) => item.type === "place-3");
      const statisticalMerits = personalMerits.filter((item) =>
        item.type !== "level" && item.type !== "national-team"
      );
      const nationalMerits = personalMerits.filter((item) => item.type === "national-team");

      if (!teamMerits.length && !statisticalMerits.length && !nationalMerits.length) return;

      const paragraph = document.createElement("p");
      const placementParts = [];
      if (championships.length) placementParts.push(meritCountPhrase(championships.length, "mästartitel", "mästartitlar"));
      if (finalists.length) placementParts.push(meritCountPhrase(finalists.length, "silver", "silver"));
      if (bronze.length) placementParts.push(meritCountPhrase(bronze.length, "bronsplacering", "bronsplaceringar"));

      if (placementParts.length) {
        paragraph.append(
          document.createTextNode(
            `På meritlistan finns ${naturalSwedishList(placementParts)}. `
          )
        );

        const headlineMerits = [
          ...championships.slice(0, 2),
          ...(championships.length ? [] : finalists.slice(0, 1))
        ].slice(0, 2);
        if (headlineMerits.length) {
          paragraph.append(
            document.createTextNode(
              `Bland lagmeriterna märks ${naturalSwedishList(headlineMerits.map((item) => trimSentence(item.text).replace(/^Mästare i /, "segern i ").replace(/^Silver i /, "silvret i ")))}. `
            )
          );
        }
      }

      if (statisticalMerits.length) {
        const highlights = statisticalMerits.slice(0, 2).map((item) => trimSentence(item.text));
        paragraph.append(
          document.createTextNode(
            `${placementParts.length ? "Individuellt" : `${currentName} har också personliga meriter`} ${placementParts.length ? "finns" : "som"} ${naturalSwedishList(highlights)}. `
          )
        );
      }

      if (nationalMerits.length) {
        const nationalText = naturalSwedishList(
          nationalMerits.slice(0, 2).map((item) => trimSentence(item.text).replace(/^Representerat /, "representation för "))
        );
        paragraph.append(
          document.createTextNode(
            `${nationalText ? `Därtill finns ${nationalText}.` : ""}`
          )
        );
      }

      if (paragraph.textContent.trim()) elements.playerBio.append(paragraph);
    }

    function renderHistoryProfileBio(context) {
      const {
        currentName,
        earliest,
        latest,
        bestOffense,
        bestGoalie,
        tournamentCount,
        clubCount,
        careerGames,
        skaterGames,
        goalieGames,
        careerSavePercentage,
        shutouts,
        competitions,
        profileRows = [],
        meritRows = [],
        personalMeritRows = [],
        nationalTeamRows = []
      } = context;

      currentBioContext = { ...context };
      elements.playerBio.replaceChildren();

      const first = document.createElement("p");
      first.append(
        document.createTextNode(
          `${currentName} har varit en del av svensk eHockey sedan ${bioSeasonLabel(earliest)}, då det första registrerade framträdandet kom med `
        )
      );
      appendBioTeamLink(first, earliest);
      first.append(
        document.createTextNode(
          `. Sedan dess har det blivit ${formatInteger(tournamentCount, "0")} registrerade säsonger, ${formatInteger(clubCount, "0")} olika lag och totalt ${formatInteger(careerGames, "0")} ${matchWord(careerGames)}. Senast representerade ${currentName} `
        )
      );
      appendBioTeamLink(first, latest, "sitt senaste lag");
      first.append(document.createTextNode(` i ${bioSeasonLabel(latest)}.`));

      const second = document.createElement("p");
      const positionSummary = skaterPositionSummary(profileRows);
      const latestRole = latestRegisteredRole(profileRows);

      if (number(goalieGames) > 0 && number(skaterGames) <= 0) {
        second.append(
          document.createTextNode(
            `I den registrerade historiken har ${currentName} spelat uteslutande som målvakt. Det har blivit ${formatInteger(goalieGames, "0")} matcher i mål`
          )
        );
        if (Number.isFinite(Number(careerSavePercentage)) && Number(careerSavePercentage) > 0) {
          second.append(document.createTextNode(`, med ${formatSavePercentage(careerSavePercentage)} i räddningsprocent`));
        }
        if (number(shutouts) > 0) {
          second.append(document.createTextNode(` och ${formatInteger(shutouts, "0")} nollor`));
        }
        second.append(document.createTextNode("."));
      } else if (number(skaterGames) > 0 && number(goalieGames) <= 0) {
        second.append(
          document.createTextNode(
            `I den registrerade historiken har ${currentName} enbart spelat som utespelare, totalt ${formatInteger(skaterGames, "0")} matcher.`
          )
        );
        if (positionSummary.primaryPosition) {
          second.append(
            document.createTextNode(
              ` Den vanligaste positionen är ${positionSummary.primaryPosition}`
            )
          );
          if (positionSummary.latestPosition && positionSummary.latestPosition !== positionSummary.primaryPosition) {
            second.append(document.createTextNode(`, medan den senaste registrerade positionen är ${positionSummary.latestPosition}.`));
          } else {
            second.append(document.createTextNode(", vilket också är den senaste registrerade positionen."));
          }
        }
      } else if (number(skaterGames) > 0 && number(goalieGames) > 0) {
        second.append(
          document.createTextNode(
            `Karriären har innehållit både utespel och målvaktsspel: ${formatInteger(skaterGames, "0")} matcher som utespelare och ${formatInteger(goalieGames, "0")} i mål.`
          )
        );
        if (positionSummary.primaryPosition) {
          second.append(document.createTextNode(` Som utespelare har ${currentName} framför allt spelat ${positionSummary.primaryPosition}.`));
        }
        if (latestRole.type === "goalie") {
          second.append(document.createTextNode(` Den senaste registrerade rollen är målvakt.`));
        } else if (latestRole.position) {
          second.append(document.createTextNode(` Den senaste registrerade positionen är ${latestRole.position}.`));
        }
        if (Number.isFinite(Number(careerSavePercentage)) && Number(careerSavePercentage) > 0 && number(goalieGames) >= 3) {
          second.append(document.createTextNode(` I mål ligger karriärens räddningsprocent på ${formatSavePercentage(careerSavePercentage)}.`));
        }
      }

      const competitionItems = String(competitions || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (competitionItems.length) {
        second.append(
          document.createTextNode(
            ` Karriären sträcker sig över bland annat ${naturalSwedishList(competitionItems)}.`
          )
        );
      }

      elements.playerBio.append(first, second);

      if (bestOffense && number(skaterGames) > 0 && number(bestOffense.points) > 0) {
        const third = document.createElement("p");
        third.append(
          document.createTextNode(
            `Offensivt sticker ${bioSeasonLabel(bestOffense)} ut som karriärens bästa säsong hittills. Då noterades ${currentName} för ${formatInteger(bestOffense.points, "0")} poäng med `
          )
        );
        appendBioTeamLink(third, bestOffense);
        third.append(document.createTextNode("."));
        elements.playerBio.append(third);
      } else if (bestGoalie && number(goalieGames) > 0 && number(bestGoalie.goalieGames) >= 3 && number(bestGoalie.savePercentage) > 0) {
        const third = document.createElement("p");
        third.append(
          document.createTextNode(
            `I målet sticker ${bioSeasonLabel(bestGoalie)} ut i statistiken, med ${formatSavePercentage(bestGoalie.savePercentage)} i räddningsprocent över ${formatInteger(bestGoalie.goalieGames, "0")} matcher för `
          )
        );
        appendBioTeamLink(third, bestGoalie);
        third.append(document.createTextNode("."));
        elements.playerBio.append(third);
      }

      appendBioMeritParagraph({
        currentName,
        profileRows,
        meritRows,
        personalMeritRows,
        nationalTeamRows
      });
    }

    function bestOffensiveRow(rows) {
      return [...rows].sort((a, b) =>
        number(b.points) - number(a.points) ||
        number(b.goals) - number(a.goals) ||
        number(b.assists) - number(a.assists) ||
        tournamentChronologyValue(b) - tournamentChronologyValue(a)
      )[0] || null;
    }

    function bestGoalieRow(rows) {
      return [...rows]
        .filter((row) => number(row.goalieGames) > 0)
        .sort((a, b) =>
          number(b.savePercentage) - number(a.savePercentage) ||
          number(b.goalieGames) - number(a.goalieGames) ||
          tournamentChronologyValue(b) - tournamentChronologyValue(a)
        )[0] || null;
    }

    function normalizedNameKey(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv-SE")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    }

    function cleanMeritDivision(value) {
      const division = String(value || "").trim();
      if (!division) return "";
      if (/^(main|division a|övrigt|other)$/i.test(division)) return "";
      return division;
    }

    function compactMeritTournamentName(value) {
      let label = String(value || "").trim();
      if (!label) return "";

      const replacements = [
        [/European Championship League/gi, "ECL"],
        [/German Championship League/gi, "GCL"],
        [/Swedish Championship League/gi, "SCL"],
        [/Finnish Championship League/gi, "FCL"],
        [/Russian Championship League/gi, "RCL"],
        [/Czech Slovak Championship League/gi, "CSCL"],
        [/North American Championship League/gi, "NACL"],
        [/Western European Championship League/gi, "WECL"],
        [/Xbox European Championship League/gi, "XECL"]
      ];

      replacements.forEach(([pattern, shortName]) => {
        label = label.replace(pattern, shortName);
      });

      label = label
        .replace(/\b(ECL|GCL|SCL|FCL|RCL|CSCL|NACL|WECL|XECL)\s+['’]?20(\d{2})\b/gi, "$1 ’$2")
        .replace(/\b(ECL|GCL|SCL|FCL|RCL|CSCL|NACL|WECL|XECL)\s+['’](\d{4})\b/gi, (_, code, year) => `${code} ’${String(year).slice(-2)}`)
        .replace(/\bSM\s+(20\d{2})\s*[–—-]\s*6v6\b/gi, "SM $1")
        .replace(/\bSCL\s+6v6\s*[–—-]\s*(20\d{2})\b/gi, "SCL $1")
        .replace(/\bSCL\s*[–—-]\s*6v6\s*[–—-]\s*(20\d{2})\b/gi, "SCL $1")
        .replace(/\b(ECL|GCL|FCL|RCL|CSCL|NACL|WECL|XECL)\s+([’']\d{2})\s*:\s*/gi, "$1 $2 ")
        .replace(/\b(ECL|GCL|FCL|RCL|CSCL|NACL|WECL|XECL)\s+([’']\d{2})\s+Spring\s*[–—-]\s*/gi, "$1 $2 Spring ")
        .replace(/\s+[–—-]\s+/g, " – ")
        .replace(/\b(ECL\s+[’']\d{2}\s+Spring)\s+–\s+/gi, "$1 ")
        .replace(/\b(SCL\s+20\d{2})\s+–\s+6v6\b/gi, "$1")
        .replace(/\bSummer Cup\s*[–—-]\s*Season\s*(\d+)\b/gi, "Summer Cup $1")
        .replace(/\s{2,}/g, " ")
        .trim();

      return label;
    }

    function polishPersonalMeritText(value) {
      let label = String(value || "").trim();
      if (!label) return "";

      const replacements = [
        [/European Championship League/gi, "ECL"],
        [/German Championship League/gi, "GCL"],
        [/Swedish Championship League/gi, "SCL"],
        [/Finnish Championship League/gi, "FCL"],
        [/Russian Championship League/gi, "RCL"],
        [/Czech Slovak Championship League/gi, "CSCL"],
        [/North American Championship League/gi, "NACL"],
        [/Western European Championship League/gi, "WECL"],
        [/Xbox European Championship League/gi, "XECL"]
      ];

      replacements.forEach(([pattern, shortName]) => {
        label = label.replace(pattern, shortName);
      });

      return label
        .replace(/(\d+)\.(\d+)\s*SV%/gi, "$1,$2 % SV")
        .replace(/(\d+)\.(\d+)\s*%/g, "$1,$2 %")
        .replace(/\bSCL\s+6v6\s*[–—-]\s*(20\d{2})\b/gi, "SCL $1")
        .replace(/\bSM\s+(20\d{2})\s*[–—-]\s*6v6\b/gi, "SM $1")
        .replace(/\s+-\s+/g, " – ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    function meritTournamentLabel(profileRow, databaseRow = null) {
      const base = String(
        profileRow?.seasonLabel ||
        databaseRow?.season_label ||
        databaseRow?.league_name ||
        "Okänd turnering"
      ).trim();

      const division = cleanMeritDivision(
        profileRow?.division ||
        databaseRow?.division ||
        ""
      );

      if (
        division &&
        !base.toLocaleLowerCase("sv-SE")
          .includes(division.toLocaleLowerCase("sv-SE"))
      ) {
        return compactMeritTournamentName(`${base} – ${division}`);
      }

      return compactMeritTournamentName(base);
    }

    function teamMeritText(placement, tournament, teamName) {
      if (placement === 1) return `Mästare i ${tournament} med ${teamName}.`;
      if (placement === 2) return `Silver i ${tournament} med ${teamName}.`;
      return `Brons i ${tournament} med ${teamName}.`;
    }

    function createMeritRow(item) {
      const row = document.createElement("div");
      row.className = [
        "player-merit-row",
        item?.type ? `player-merit-row--${item.type}` : "",
        item?.teamName ? "player-merit-row--with-team" : ""
      ].filter(Boolean).join(" ");

      const badge = document.createElement("span");
      badge.className = [
        "player-merit-icon",
        item?.type ? `player-merit-icon--${item.type}` : ""
      ].filter(Boolean).join(" ");
      badge.textContent = item?.icon || "★";

      const copy = document.createElement("p");

      if (item?.teamName && item?.tournament && [1, 2, 3].includes(Number(item?.placement))) {
        const lead = Number(item.placement) === 1
          ? `Mästare i ${item.tournament} med `
          : Number(item.placement) === 2
            ? `Silver i ${item.tournament} med `
            : `Brons i ${item.tournament} med `;
        copy.append(document.createTextNode(lead));

        const teamId = Number(item.teamId);
        if (Number.isFinite(teamId) && teamId > 0) {
          const teamLink = document.createElement("a");
          teamLink.href = teamUrl(teamId);
          teamLink.textContent = item.teamName;
          copy.append(teamLink);
        } else {
          const teamName = document.createElement("strong");
          teamName.textContent = item.teamName;
          copy.append(teamName);
        }
        copy.append(document.createTextNode("."));
      } else {
        copy.textContent = item?.text || "";
      }

      row.append(badge, copy);

      if (item?.teamName) {
        const logo = document.createElement("span");
        logo.className = "player-merit-team-logo";
        logo.setAttribute("aria-hidden", "true");
        row.append(logo);
        SEH_renderTeamLogo(logo, [], item.teamName, "");
      }

      return row;
    }

    function renderMeritList(container, items, emptyText) {
      container.replaceChildren();

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "player-merits-empty";
        empty.textContent = emptyText;
        container.append(empty);
        return;
      }

      items.forEach((item) => {
        container.append(createMeritRow(item));
      });
    }

    function renderGroupedTeamMerits(container, items, emptyText) {
      container.replaceChildren();

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "player-merits-empty";
        empty.textContent = emptyText;
        container.append(empty);
        return;
      }

      const groups = [
        { placement: 1, icon: "🏆", label: "Guld", tone: "gold" },
        { placement: 2, icon: "🥈", label: "Silver", tone: "silver" },
        { placement: 3, icon: "🥉", label: "Brons", tone: "bronze" }
      ];

      groups.forEach((group) => {
        const groupItems = items.filter((item) => Number(item?.placement) === group.placement);
        if (!groupItems.length) return;

        const section = document.createElement("section");
        section.className = `player-merit-placement-group player-merit-placement-group--${group.tone}`;

        const heading = document.createElement("div");
        heading.className = "player-merit-placement-heading";

        const title = document.createElement("div");
        title.className = "player-merit-placement-title";

        const icon = document.createElement("span");
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = group.icon;

        const label = document.createElement("strong");
        label.textContent = group.label;

        const count = document.createElement("small");
        count.textContent = formatInteger(groupItems.length, "0");

        title.append(icon, label);
        heading.append(title, count);

        const grid = document.createElement("div");
        grid.className = "player-merit-placement-grid";
        groupItems.forEach((item) => grid.append(createMeritRow(item)));

        section.append(heading, grid);
        container.append(section);
      });
    }

    function renderOverviewMeritBadges(teamMerits = [], personalMerits = []) {
      if (!elements.overviewMeritBadges) return;

      const championshipCount = teamMerits.filter((item) => item.type === "place-1").length;
      const finalCount = teamMerits.filter((item) => item.type === "place-2").length;
      const bronzeCount = teamMerits.filter((item) => item.type === "place-3").length;
      const personalCount = personalMerits.length;

      const badges = [
        { icon: "🏆", value: championshipCount, label: "MÄSTARTITLAR", tone: "gold" },
        { icon: "🥈", value: finalCount, label: "SILVER", tone: "silver" },
        { icon: "🥉", value: bronzeCount, label: "BRONS", tone: "bronze" },
        { icon: "★", value: personalCount, label: "PERSONLIGA", tone: "personal" }
      ];

      elements.overviewMeritBadges.replaceChildren();
      badges.forEach((item) => {
        const card = document.createElement("article");
        card.className = `player-overview-honour player-overview-honour--${item.tone}`;
        const icon = document.createElement("span");
        icon.className = "player-overview-honour__icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = item.icon;
        const copy = document.createElement("div");
        const value = document.createElement("strong");
        value.textContent = formatInteger(item.value, "0");
        const label = document.createElement("small");
        label.textContent = item.label;
        copy.append(value, label);
        card.append(icon, copy);
        elements.overviewMeritBadges.append(card);
      });
    }

    function highestEclLevel(rows) {
      const ranking = [
        { rank: 5, label: "Elite", pattern: /\belite\b/i },
        { rank: 4, label: "Pro", pattern: /\bpro\b/i },
        { rank: 3, label: "Lite", pattern: /\blite\b/i },
        { rank: 2, label: "Core", pattern: /\bcore\b/i },
        { rank: 1, label: "Neo", pattern: /\bneo\b/i }
      ];

      let best = null;

      rows
        .filter((row) => normalizedCompetitionCode(row) === "ECL")
        .forEach((row) => {
          const text = [row.division, row.seasonLabel, row.leagueName]
            .filter(Boolean)
            .join(" ");

          const level = ranking.find((item) => item.pattern.test(text));

          if (level && (!best || level.rank > best.rank)) {
            best = level;
          }
        });

      return best?.label || "";
    }

    function meritSortValue(row) {
      return (
        validChronologyDate(row?.sort_date) ||
        validChronologyDate(row?.sortDate) ||
        0
      );
    }

    function isTeamMeritEligible(row, tournamentLabel = "") {
      const text = [
        tournamentLabel,
        row?.season_label,
        row?.league_name,
        row?.division,
        row?.competition_name
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("sv-SE");

      const excludedWords = [
        "qualifier",
        "qualification",
        "kval",
        "wildcard",
        "crossover",
        "registration",
        "free agent"
      ];

      return !excludedWords.some((word) => text.includes(word));
    }

    function buildTeamMerits(meritRows) {
      const seen = new Set();

      return meritRows
        .map((row) => {
          const placement = nullableNumber(row?.placement);
          if (![1, 2, 3].includes(placement)) return null;

          const tournament = meritTournamentLabel(null, row);
          if (!isTeamMeritEligible(row, tournament)) return null;

          const teamName = String(row?.team_name || "Okänt lag").trim() || "Okänt lag";
          const key = [
            String(row?.external_league_id || row?.league_id || ""),
            normalizedNameKey(teamName),
            placement
          ].join("|");

          if (seen.has(key)) return null;
          seen.add(key);

          return {
            icon: String(placement),
            type: `place-${placement}`,
            placement,
            tournament,
            teamName,
            teamId: nullableNumber(row?.team_id ?? row?.teamId),
            text: teamMeritText(placement, tournament, teamName),
            sortValue: meritSortValue(row)
          };
        })
        .filter(Boolean)
        .sort((a, b) =>
          number(a.placement) - number(b.placement) ||
          number(b.sortValue) - number(a.sortValue)
        );
    }

    function personalMeritIcon(row) {
      const code = String(row?.merit_code || "").trim().toUpperCase();
      if (code === "POINTS") return "P";
      if (code === "GOALS") return "M";
      if (code === "ASSISTS") return "A";
      return "★";
    }

    function personalMeritType(row) {
      const code = String(row?.merit_code || "").trim().toUpperCase();
      if (code === "POINTS") return "points";
      if (code === "GOALS") return "goals";
      if (code === "ASSISTS") return "assists";
      return "";
    }

    function buildPersonalMerits(profileRows, personalMeritRows, nationalTeamRows = []) {
      /*
       * Statistikmeriter kommer färdigberäknade från Supabase:
       * public.v_ehockey_player_personal_merits_v2
       *
       * V10: personliga meriter läses från den slutliga Supabase V2-viewen.
       * Frontend avgör alltså INTE vem som är poängkung, målkung eller
       * assistkung. Den renderar bara merit_text från den verifierade viewen.
       */
      const seen = new Set();

      const items = personalMeritRows
        .map((row) => {
          const meritText = String(row?.merit_text || "").trim();
          if (!meritText) return null;

          const key = [
            String(row?.league_id || row?.sports_gamer_league_id || ""),
            String(row?.merit_code || "").toUpperCase(),
            meritText
          ].join("|");

          if (seen.has(key)) return null;
          seen.add(key);

          return {
            icon: personalMeritIcon(row),
            type: personalMeritType(row),
            text: polishPersonalMeritText(meritText),
            sortValue: Number(row?.league_id ?? row?.sports_gamer_league_id) || 0
          };
        })
        .filter(Boolean);

      nationalTeamRows
        .filter((row) => number(row?.matches) > 0)
        .forEach((row) => {
          const phrase = String(row?.national_team_phrase_sv || "").trim();
          const countryCode = String(row?.country_code || "").trim().toUpperCase();
          if (!phrase) return;

          const matches = number(row.matches);
          const tournaments = number(row.tournaments);
          const matchLabel = matches === 1 ? "landskamp" : "landskamper";
          const countryLabel = countryCode === "SE" ? "Sverige" : phrase;
          const tournamentDetail = tournaments > 0
            ? ` under ${tournaments === 1 ? "en" : formatInteger(tournaments, "0")} World Cup-${tournaments === 1 ? "turnering" : "turneringar"}`
            : "";

          items.push({
            icon: countryFlag(countryCode) || "L",
            type: "national-team",
            text: `Representerat ${countryLabel} i ${formatInteger(matches, "0")} ${matchLabel}${tournamentDetail}.`,
            sortValue: -0.5
          });
        });

      return items.sort((a, b) => {
        if (a.type === "national-team" && b.type !== "national-team") return 1;
        if (b.type === "national-team" && a.type !== "national-team") return -1;
        return number(b.sortValue) - number(a.sortValue);
      });
    }

    async function fetchPlayerNationalTeams(profileRows, directoryRow = null) {
      const playerKey = String(
        profileRows.find((row) => String(row?.playerKey || "").trim())?.playerKey || ""
      ).trim();

      const sportsGamerUrl = String(
        directoryRow?.sports_gamer_player_url ||
        profileRows.find((row) => String(row?.externalUrl || "").trim())?.externalUrl ||
        ""
      ).trim();

      const fetchBy = async (field, value) => {
        if (!value) return [];
        const params = new URLSearchParams({ select: "*" });
        params.set(field, `eq.${value}`);
        return fetchAllJson("v_ehockey_player_national_team_summary_v1", params);
      };

      try {
        if (playerKey) {
          const rows = await fetchBy("player_key", playerKey);
          if (rows.length) return rows;
        }

        if (sportsGamerUrl) {
          return await fetchBy("sports_gamer_player_url", sportsGamerUrl);
        }
      } catch (error) {
        console.warn(`${APP_BUILD}: kunde inte läsa landslagsrepresentation från Supabase.`, error);
      }

      return [];
    }

    async function fetchPlayerMeritData(profileRows, directoryRow = null) {
      const playerKey = String(
        profileRows.find((row) => String(row?.playerKey || "").trim())?.playerKey || ""
      ).trim();

      const sportsGamerPlayerId = String(
        directoryRow?.sports_gamer_player_id ||
        directoryRow?.sportsgamer_player_id ||
        sportsGamerIdFromUrl(directoryRow?.sports_gamer_player_url) ||
        profileRows.find((row) => String(row?.sportsGamerPlayerId || "").trim())?.sportsGamerPlayerId ||
        profileRows
          .map((row) => sportsGamerIdFromUrl(row?.externalUrl || row?.sports_gamer_player_url || ""))
          .find(Boolean) ||
        ""
      ).trim();

      let meritsPromise = Promise.resolve([]);

      if (playerKey || sportsGamerPlayerId) {
        const meritParams = new URLSearchParams({
          select: "*"
        });

        if (playerKey) {
          meritParams.set("player_key", `eq.${playerKey}`);
        } else {
          meritParams.set("sports_gamer_player_id", `eq.${sportsGamerPlayerId}`);
        }

        meritsPromise = fetchAllJson(
          "ehockey_player_merits_cache_v1",
          meritParams
        ).catch((error) => {
          console.warn(`${APP_BUILD}: kunde inte läsa färdiga spelarmeriter från Supabase-cache.`, error);
          return [];
        });
      }

      let personalMeritsPromise = Promise.resolve([]);

      if (sportsGamerPlayerId) {
        const personalParams = new URLSearchParams({
          select: "*",
          sports_gamer_player_id: `eq.${sportsGamerPlayerId}`
        });

        personalMeritsPromise = fetchAllJson(
          "ehockey_player_personal_merits_cache_v1",
          personalParams
        ).catch((error) => {
          console.warn(
            `${APP_BUILD}: kunde inte läsa personliga meriter från Supabase-cache.`,
            error
          );
          return [];
        });
      }

      const [meritRows, personalMeritRows, nationalTeamRows] = await Promise.all([
        meritsPromise,
        personalMeritsPromise,
        fetchPlayerNationalTeams(profileRows, directoryRow)
      ]);

      console.info(
        `Svensk eHockey ${APP_BUILD}: meritkoppling`,
        {
          playerKey,
          sportsGamerPlayerId,
          teamMerits: meritRows.length,
          personalMerits: personalMeritRows.length,
          nationalTeams: nationalTeamRows.length
        }
      );

      return { meritRows, personalMeritRows, nationalTeamRows };
    }

    function renderPlayerMerits(
      profileRows,
      meritRows = [],
      personalMeritRows = [],
      nationalTeamRows = []
    ) {
      const teamMerits = buildTeamMerits(meritRows);
      const personalMerits = buildPersonalMerits(
        profileRows,
        personalMeritRows,
        nationalTeamRows
      );

      renderOverviewMeritBadges(teamMerits, personalMerits);

      const titleCount = teamMerits.filter((item) => item.type === "place-1").length;
      const finalCount = teamMerits.filter((item) => item.type === "place-2").length;
      const bronzeCount = teamMerits.filter((item) => item.type === "place-3").length;
      const personalCount = personalMerits.length;

      if (elements.meritsTitleCount) elements.meritsTitleCount.textContent = formatInteger(titleCount, "0");
      if (elements.meritsFinalCount) elements.meritsFinalCount.textContent = formatInteger(finalCount, "0");
      if (elements.meritsBronzeCount) elements.meritsBronzeCount.textContent = formatInteger(bronzeCount, "0");
      if (elements.meritsPersonalCount) elements.meritsPersonalCount.textContent = formatInteger(personalCount, "0");
      if (elements.teamMeritsHeadingCount) elements.teamMeritsHeadingCount.textContent = formatInteger(teamMerits.length, "0");
      if (elements.personalMeritsHeadingCount) elements.personalMeritsHeadingCount.textContent = formatInteger(personalCount, "0");

      renderGroupedTeamMerits(
        elements.teamMeritsList,
        teamMerits,
        "Inga registrerade pallplaceringar i databasen."
      );

      renderMeritList(
        elements.personalMeritsList,
        personalMerits,
        "Inga personliga meriter kan fastställas från nuvarande data."
      );

      elements.playerMeritsSection.hidden = false;
    }

    async function enrichPlayerMerits(profileRows, directoryRow = null) {
      const data = await fetchPlayerMeritData(profileRows, directoryRow);

      renderPlayerMerits(
        profileRows,
        data.meritRows,
        data.personalMeritRows,
        data.nationalTeamRows
      );

      if (currentBioContext) {
        renderHistoryProfileBio({
          ...currentBioContext,
          profileRows,
          meritRows: data.meritRows,
          personalMeritRows: data.personalMeritRows,
          nationalTeamRows: data.nationalTeamRows
        });
      }
    }


    function normalizedPlayerTeamName(value) {
      return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv-SE")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    }


    function buildLocalTeamNameIndex(teamRows = []) {
      const index = new Map();

      // HISTORIKTABELLEN: ett historiskt alias får aldrig ärva dagens
      // klubbidentitet. Matcha därför endast mot lagets faktiska current_name.
      for (const teamRow of teamRows) {
        const key = normalizedPlayerTeamName(teamRow.current_name);
        if (!key || index.has(key)) continue;
        index.set(key, teamRow);
      }

      return index;
    }

    function buildLocalClubAliasIndex(teamRows = []) {
      const index = new Map();

      const add = (name, teamRow) => {
        const key = normalizedPlayerTeamName(name);
        if (!key) return;

        /*
         * LAG-FLIKEN: alias används bara när v_local_team_list uttryckligen
         * säger att namnet tillhör klubben. Om samma alias mot förmodan ligger
         * på flera klubbar markerar vi det som tvetydigt och slår inte ihop.
         */
        if (!index.has(key)) {
          index.set(key, teamRow);
          return;
        }

        const existing = index.get(key);
        if (Number(existing?.team_id) !== Number(teamRow?.team_id)) {
          index.set(key, null);
        }
      };

      for (const teamRow of teamRows) {
        add(teamRow.current_name, teamRow);

        const historicalNames = Array.isArray(teamRow.historical_names)
          ? teamRow.historical_names
          : [];
        const leagueNames = Array.isArray(teamRow.names_used_in_leagues)
          ? teamRow.names_used_in_leagues
          : [];

        historicalNames.forEach((name) => add(name, teamRow));
        leagueNames.forEach((name) => add(name, teamRow));
      }

      return index;
    }

    function resolveHistoryRowsToLocalTeams(profileRows, teamRows = []) {
      const byName = buildLocalTeamNameIndex(teamRows);

      return profileRows.map((row) => {
        if (row.teamId) {
          return row;
        }

        // Endast namnet som faktiskt användes i den här turneringen får
        // avgöra om historikraden kan kopplas till ett lokalt lag.
        const historicalName = historicalPlayerTeamName(row);
        const key = normalizedPlayerTeamName(historicalName);
        const match = key ? byName.get(key) : null;

        if (!match?.team_id) {
          return row;
        }

        const resolvedHistoricalTeamName = String(
          match.current_name || historicalName
        ).trim();

        return {
          ...row,
          teamId: Number(match.team_id) || null,
          teamIsLinkable: true,
          teamCurrentName: resolvedHistoricalTeamName,
          resolvedHistoricalTeamName,
          resolvedLogoUrl:
            String(match.logo_url || match.logo_path || "").trim()
        };
      });
    }

    function localTeamLogoCandidates(teamName) {
      return SEH_teamLogoCandidates([], teamName);
    }

    function applyTeamLogoWithFallback(image, primaryUrl, teamName, fallbackNode) {
      SEH_applyTeamLogo(image, primaryUrl, teamName, fallbackNode);
    }

    function playerTeamDisplayName(row, metadataById) {
      const metadata = row.teamId
        ? metadataById.get(Number(row.teamId))
        : null;

      return String(
        row.resolvedHistoricalTeamName ||
        row.teamName ||
        row.teamCurrentName ||
        metadata?.current_name ||
        ""
      ).trim();
    }

    function historyRowSafeTeamId(row) {
      const teamId = Number(row?.teamId);
      if (!Number.isInteger(teamId) || teamId <= 0) return null;

      const historicalName = normalizedPlayerTeamName(
        historicalPlayerTeamName(row)
      );
      const currentName = normalizedPlayerTeamName(row?.teamCurrentName);

      return historicalName && currentName && historicalName === currentName
        ? teamId
        : null;
    }

    function playerTeamCompetitionLabel(row) {
      const explicit = String(row?.competitionCode || "").trim();
      const explicitUpper = explicit.toUpperCase();
      const sourceText = [
        row?.catalogDisplayName,
        row?.competitionName,
        row?.leagueName,
        row?.seasonLabel
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const upper = sourceText.toUpperCase();

      // Mer specifika turneringsnamn måste testas före de bredare ligakoderna.
      if (/(^|[^A-Z0-9])EHSM([^A-Z0-9]|$)/.test(upper)) return "eHSM";
      if (/IS\s*CUP/.test(upper)) return "IS Cup";
      if (/XBOX\s+EUROPEAN\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])XECL([^A-Z0-9]|$)/.test(upper)) return "XECL";
      if (/WESTERN\s+EUROPEAN\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])WECL([^A-Z0-9]|$)/.test(upper)) return "WECL";
      if (/NORTH\s+AMERICAN\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])NACL([^A-Z0-9]|$)/.test(upper)) return "NACL";
      if (/CZECH\s+SLOVAK\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])CSCL([^A-Z0-9]|$)/.test(upper)) return "CSCL";
      if (/RUSSIAN\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])RCL([^A-Z0-9]|$)/.test(upper)) return "RCL";
      if (/GERMAN\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])GCL([^A-Z0-9]|$)/.test(upper)) return "GCL";
      if (/FINNISH\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])FCL([^A-Z0-9]|$)/.test(upper)) return "FCL";
      if (/SWEDISH\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])SCL([^A-Z0-9]|$)/.test(upper)) return "SCL";
      if (/EUROPEAN\s+CHAMPIONSHIP\s+LEAGUE|(^|[^A-Z0-9])ECL([^A-Z0-9]|$)/.test(upper)) return "ECL";
      if (/(^|[^A-Z0-9])SEC([^A-Z0-9]|$)/.test(upper)) return "SEC";
      if (/(^|[^A-Z0-9])E-?SHL([^A-Z0-9]|$)/.test(upper)) return "eSHL";
      if (/(^|[^A-Z0-9])ITHL([^A-Z0-9]|$)/.test(upper)) return "ITHL";
      if (/(^|[^A-Z0-9])LGEL([^A-Z0-9]|$)/.test(upper)) return "LGEL";
      if (/(^|[^A-Z0-9])6HL([^A-Z0-9]|$)/.test(upper)) return "6HL";
      if (/SM\s*EHOCKEY|EHOCKEY\s*SM|(^|[^A-Z0-9])SM([^A-Z0-9]|$)/.test(upper)) return "SM";

      // Om competition_code redan är en riktig liga använder vi den.
      if (explicitUpper && explicitUpper !== "SPORTSGAMER" && explicitUpper !== "ÖVRIGT") {
        return competitionDisplayLabel(explicitUpper);
      }

      // SportsGamer är plattform/källa, inte tävlingen. Visa hellre inget än fel badge.
      return "";
    }

    function buildPlayerTeams(profileRows, teamRows = []) {
      const metadataById = new Map(
        teamRows.map((row) => [Number(row.team_id), row])
      );
      const canonicalByName = buildLocalClubAliasIndex(teamRows);
      const grouped = new Map();

      for (const row of profileRows) {
        const historicalDisplayName = playerTeamDisplayName(row, metadataById);
        const normalizedHistoricalName = normalizedPlayerTeamName(historicalDisplayName);

        if (!normalizedHistoricalName) continue;

        /*
         * Lag-fliken visar KLUBBAR, inte varje historisk stavning/namnvariant.
         *
         * En sammanslagning får endast göras när v_local_team_list uttryckligen
         * känner namnet som current_name, historical_names eller
         * names_used_in_leagues för samma lokala klubb. Vi använder alltså
         * ALDRIG SportsGamer team_external_id som klubbidentitet här.
         *
         * Exempel:
         *   IFK Norrland + IF Norrland + Norrland -> IF Norrland
         * medan Frölunda HC / FILADELPHIA / Last Dance hålls separata även om
         * SportsGamer historiskt har återanvänt samma externa team-id.
         */
        const canonicalMeta = canonicalByName.get(normalizedHistoricalName) || null;
        const canonicalTeamId = Number(canonicalMeta?.team_id) || null;
        const canonicalName = String(
          canonicalMeta?.current_name || historicalDisplayName || "Okänt lag"
        ).trim();
        const canonicalNameKey = normalizedPlayerTeamName(canonicalName);

        const key = canonicalTeamId
          ? `club:${canonicalTeamId}`
          : `name:${canonicalNameKey || normalizedHistoricalName}`;
        const sortValue = tournamentChronologyValue(row);
        const rowTeamId = historyRowSafeTeamId(row);

        if (!grouped.has(key)) {
          grouped.set(key, {
            teamId: canonicalTeamId || null,
            teamIds: new Set(),
            teamName: canonicalName || "Okänt lag",
            tournaments: new Set(),
            competitions: new Set(),
            latestSort: sortValue,
            latestTeamId: rowTeamId,
            canonicalMeta
          });
        }

        const team = grouped.get(key);

        if (rowTeamId) {
          team.teamIds.add(rowTeamId);
        }

        team.tournaments.add(
          [
            row.competitionCode,
            row.leagueId,
            row.seasonLabel
          ].join("|")
        );

        const competitionLabel = playerTeamCompetitionLabel(row);
        if (competitionLabel) {
          team.competitions.add(competitionLabel);
        }

        if (sortValue > team.latestSort) {
          team.latestSort = sortValue;
          team.latestTeamId = rowTeamId;
          // Kanoniska klubbar behåller current_name. Omatchade historiska lag
          // fortsätter däremot visa namnet från den senaste turneringen.
          if (!team.canonicalMeta) {
            team.teamName = historicalDisplayName || team.teamName;
          }
        }
      }

      return [...grouped.values()]
        .map((team) => {
          if (team.canonicalMeta) {
            return {
              ...team,
              teamId: Number(team.canonicalMeta.team_id) || null,
              teamName: String(team.canonicalMeta.current_name || team.teamName).trim(),
              logoUrl:
                team.canonicalMeta.logo_url ||
                team.canonicalMeta.logo_path ||
                "",
              tournamentCount: team.tournaments.size,
              competitionList: [...team.competitions]
            };
          }

          // Omatchade historiska lag får aldrig slås ihop bara för att de råkar
          // dela ett gammalt SportsGamer-id med en senare klubbidentitet.
          const linkTeamId =
            team.latestTeamId ||
            [...team.teamIds][0] ||
            null;
          const metadata = linkTeamId
            ? metadataById.get(Number(linkTeamId))
            : null;
          const metadataName = String(metadata?.current_name || "").trim();
          const metadataMatchesHistorical = Boolean(
            metadata &&
            normalizedPlayerTeamName(metadataName) ===
              normalizedPlayerTeamName(team.teamName)
          );

          return {
            ...team,
            teamId: metadataMatchesHistorical ? linkTeamId : null,
            logoUrl: metadataMatchesHistorical
              ? (metadata?.logo_url || metadata?.logo_path || "")
              : "",
            tournamentCount: team.tournaments.size,
            competitionList: [...team.competitions]
          };
        })
        .sort((a, b) =>
          b.latestSort - a.latestSort ||
          b.tournamentCount - a.tournamentCount ||
          a.teamName.localeCompare(b.teamName, "sv-SE")
        );
    }

    function renderPlayerTeams(profileRows, teamRows = []) {
      if (!elements.playerTeamsGrid || !elements.playerTeamsSection) return;

      const teams = buildPlayerTeams(profileRows, teamRows);
      elements.playerTeamsGrid.replaceChildren();

      if (!teams.length) {
        elements.playerTeamsSection.hidden = true;
        return;
      }

      const seasonKeys = new Set(
        profileRows.map((row) => [row.competitionCode, row.leagueId, row.seasonLabel].join("|"))
      );
      if (elements.playerTeamsClubCount) {
        elements.playerTeamsClubCount.textContent = formatInteger(teams.length, "0");
      }
      if (elements.playerTeamsSeasonCount) {
        elements.playerTeamsSeasonCount.textContent = formatInteger(seasonKeys.size, "0");
      }

      const latestSort = Math.max(...teams.map((team) => number(team.latestSort)));
      const latestTeam = teams.find((team) => number(team.latestSort) === latestSort) || teams[0];
      const mostSeasonsTeam = [...teams].sort((a, b) =>
        b.tournamentCount - a.tournamentCount ||
        b.latestSort - a.latestSort ||
        a.teamName.localeCompare(b.teamName, "sv-SE")
      )[0];

      if (elements.playerTeamsLatestTeam) {
        elements.playerTeamsLatestTeam.textContent = latestTeam?.teamName || "–";
        elements.playerTeamsLatestTeam.title = latestTeam?.teamName || "";
      }
      if (elements.playerTeamsMostTeam) {
        elements.playerTeamsMostTeam.textContent = mostSeasonsTeam
          ? `${mostSeasonsTeam.teamName} · ${mostSeasonsTeam.tournamentCount}`
          : "–";
        elements.playerTeamsMostTeam.title = mostSeasonsTeam
          ? `${mostSeasonsTeam.teamName} · ${mostSeasonsTeam.tournamentCount} ${mostSeasonsTeam.tournamentCount === 1 ? "säsong" : "säsonger"}`
          : "";
      }
      const fragment = document.createDocumentFragment();

      for (const team of teams) {
        const isLatest = number(team.latestSort) === latestSort;
        const isMostSeasons = team === mostSeasonsTeam;
        const card = document.createElement(team.teamId ? "a" : "article");
        card.className = `player-team-card${isLatest ? " is-latest" : ""}${isMostSeasons ? " is-most-seasons" : ""}`;
        if (team.teamId) card.href = teamUrl(team.teamId);

        const logo = document.createElement("span");
        logo.className = "player-team-card__logo";

        {
          const image = document.createElement("img");
          image.alt = "";
          image.loading = "lazy";
          logo.append(image);
          applyTeamLogoWithFallback(image, team.logoUrl, team.teamName, logo);
        }

        const copy = document.createElement("span");
        copy.className = "player-team-card__copy";

        const identity = document.createElement("span");
        identity.className = "player-team-card__identity";

        const name = document.createElement("strong");
        name.textContent = team.teamName;
        identity.append(name);

        if (isLatest) {
          const badge = document.createElement("em");
          badge.className = "player-team-card__latest";
          badge.textContent = "SENASTE";
          identity.append(badge);
        }

        if (isMostSeasons && !isLatest) {
          const badge = document.createElement("em");
          badge.className = "player-team-card__most";
          badge.textContent = "FLEST SÄSONGER";
          identity.append(badge);
        }

        const meta = document.createElement("small");
        const seasonCount = document.createElement("b");
        seasonCount.textContent = `${team.tournamentCount} ${team.tournamentCount === 1 ? "säsong" : "säsonger"}`;
        meta.append(seasonCount);

        if (team.competitionList.length) {
          const competitions = document.createElement("span");
          competitions.className = "player-team-card__competitions";
          for (const competition of team.competitionList) {
            const badge = document.createElement("i");
            badge.textContent = competition;
            competitions.append(badge);
          }
          meta.append(competitions);
        }

        copy.append(identity, meta);
        card.append(logo, copy);

        if (team.teamId) {
          const arrow = document.createElement("span");
          arrow.className = "player-team-card__arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "›";
          card.append(arrow);
        }

        fragment.append(card);
      }

      elements.playerTeamsGrid.append(fragment);
      elements.playerTeamsSection.hidden = false;
    }


    async function resolveAndRenderHistoryTeamLinks(profileRows) {
      try {
        const params = new URLSearchParams({
          select:
            "team_id,current_name,historical_names,names_used_in_leagues,logo_path,logo_url",
          limit: "5000"
        });

        const localTeams = await fetchAllJson(
          "v_local_team_list",
          params
        );

        const resolvedRows = resolveHistoryRowsToLocalTeams(
          profileRows,
          localTeams
        );

        /*
         * Rendera om hela profilen bara när någon rad faktiskt fick
         * ett lokalt team_id via namnmatchningen. På så sätt blir både
         * säsong och lagnamn klickbara till rätt turneringsvy.
         */
        const changed = resolvedRows.some(
          (row, index) =>
            Number(row.teamId || 0) !==
            Number(profileRows[index]?.teamId || 0)
        );

        if (changed) {
          console.info(
            `${APP_BUILD}: ${resolvedRows.filter((row, index) =>
              Number(row.teamId || 0) !== Number(profileRows[index]?.teamId || 0)
            ).length} historikrader fick lokalt team_id via namnmatchning.`
          );
        }

        return resolvedRows;
      } catch (error) {
        console.warn(
          `${APP_BUILD}: kunde inte matcha historiska lagnamn mot lokala lag.`,
          error
        );
        return profileRows;
      }
    }

    async function enrichPlayerTeams(profileRows) {
      renderPlayerTeams(profileRows);

      /*
       * Lag-fliken behöver hela den lokala aliasbilden, inte bara team-id:n som
       * råkar vara säkra på en enskild historikrad. Annars blir exempelvis
       * IFK Norrland / IF Norrland / Norrland tre kort trots att lagsidan redan
       * känner dem som samma klubb.
       */
      const params = new URLSearchParams({
        select: "team_id,current_name,historical_names,names_used_in_leagues,logo_path,logo_url",
        limit: "5000"
      });

      try {
        const teamRows = await fetchAllJson("v_local_team_list", params);
        renderPlayerTeams(profileRows, teamRows);

        const teamMeta = new Map(
          teamRows.map((row) => [String(row.team_id), row])
        );

        document.querySelectorAll("[data-team-logo-for]").forEach((node) => {
          const meta = teamMeta.get(String(node.dataset.teamLogoFor || ""));
          const historicalTeamName =
            node.dataset.teamNameForLogo || "";
          const metaName = String(meta?.current_name || "").trim();
          const metadataMatchesHistorical = Boolean(
            meta &&
            normalizedPlayerTeamName(metaName) ===
              normalizedPlayerTeamName(historicalTeamName)
          );
          const logoUrl = metadataMatchesHistorical
            ? (meta?.logo_url || meta?.logo_path || "")
            : "";

          const teamName =
            historicalTeamName ||
            metaName ||
            node.closest("td")?.querySelector("strong, a, .team-name")?.textContent?.trim() ||
            node.closest("td")?.textContent?.trim() ||
            "";

          node.replaceChildren();
          const img = document.createElement("img");
          img.alt = "";
          img.loading = "lazy";
          node.append(img);

          SEH_applyTeamLogo(
            img,
            [logoUrl],
            teamName,
            node
          );
        });
      } catch (error) {
        console.warn(`${APP_BUILD}: kunde inte komplettera lagkort med logotyper.`, error);
      }
    }


    function playerHistoryFilterCode(row) {
      return normalizedCompetitionCode(row);
    }

    function playerHistoryFilterOptions(rows) {
      const preferredOrder = [
        "ECL", "SEC", "SCL", "FCL", "GCL", "ITHL",
        "ESHL", "LGEL", "SM", "6HL", "RCL", "CSCL", "NACL"
      ];
      const available = new Set(rows.map(playerHistoryFilterCode).filter(Boolean));
      const options = preferredOrder.filter((code) => available.has(code));
      if ([...available].some((code) => !preferredOrder.includes(code))) {
        options.push("ÖVRIGA");
      }
      return options;
    }

    function playerHistoryMatchesFilter(row) {
      if (historyCompetitionFilter === "ALL") return true;
      const code = playerHistoryFilterCode(row);

      if (historyCompetitionFilter === "ÖVRIGA") {
        return !new Set([
          "ECL", "SEC", "SCL", "FCL", "GCL", "ITHL",
          "ESHL", "LGEL", "SM", "6HL", "RCL", "CSCL", "NACL"
        ]).has(code);
      }

      return code === historyCompetitionFilter;
    }

    function renderPlayerHistoryFilters(rows) {
      if (!elements.historyCompetitionFilters) return;

      const options = playerHistoryFilterOptions(rows);

      if (
        historyCompetitionFilter !== "ALL" &&
        !options.includes(historyCompetitionFilter)
      ) {
        historyCompetitionFilter = "ALL";
      }

      elements.historyCompetitionFilters.replaceChildren();

      [
        { value: "ALL", label: "Alla" },
        ...options.map((code) => ({
          value: code,
          label: code === "ÖVRIGA" ? "Övriga" : code
        }))
      ].forEach(({ value, label }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "player-history-filter";
        button.textContent = label;
        button.setAttribute("aria-pressed", historyCompetitionFilter === value ? "true" : "false");

        if (historyCompetitionFilter === value) {
          button.classList.add("is-active");
        }

        button.addEventListener("click", () => {
          historyCompetitionFilter = value;
          renderPlayerHistoryFilters(currentHistoryRows);
          renderPlayerHistoryTable(currentHistoryRows);
        });

        elements.historyCompetitionFilters.append(button);
      });
    }

    function renderPlayerHistoryTable(rows) {
      const visibleRows = [...rows]
        .sort(compareHistoryRows)
        .filter(playerHistoryMatchesFilter);

      elements.historyTableBody.replaceChildren();

      visibleRows.forEach((row) => {
        const tr = document.createElement("tr");
        const seasonCell = document.createElement("td");

        if (row.teamId) {
          const seasonLink = document.createElement("a");
          seasonLink.className = "history-table-link history-table-link--gold";
          seasonLink.href = tournamentUrl(row);
          seasonLink.textContent =
            row.catalogDisplayName || SEH_tableSeasonLabel(row.seasonLabel);
          seasonCell.append(seasonLink);
        } else {
          const seasonText = document.createElement("span");
          seasonText.className = "history-table-link--gold";
          seasonText.textContent =
            row.catalogDisplayName || SEH_tableSeasonLabel(row.seasonLabel);
          seasonCell.append(seasonText);
        }

        const teamCell = document.createElement("td");
        const teamWrap = document.createElement("span");
        teamWrap.className = "player-history-team";

        const teamLogo = document.createElement("span");
        teamLogo.className = "player-history-team__logo";
        const safeTeamId = historyRowSafeTeamId(row);
        const historicalTeamName = historicalPlayerTeamName(row);
        teamLogo.dataset.teamLogoFor = safeTeamId ? String(safeTeamId) : "";
        teamLogo.dataset.teamNameForLogo = historicalTeamName;

        SEH_renderTeamLogo(
          teamLogo,
          [row.resolvedLogoUrl || ""],
          historicalTeamName,
          `${historicalTeamName} logotyp`
        );

        if (row.teamId) {
          const teamLink = document.createElement("a");
          teamLink.className = "history-table-link";
          teamLink.href = tournamentUrl(row);
          teamLink.textContent = row.teamName;
          teamWrap.append(teamLogo, teamLink);
        } else {
          const teamText = document.createElement("span");
          teamText.textContent = row.teamName;
          teamWrap.append(teamLogo, teamText);
        }

        teamCell.append(teamWrap);

        const skaterGames = number(row.skaterGames);
        const goalieGames = number(row.goalieGames);
        const role = goalieGames > skaterGames ? "G" : row.position || "Utespelare";
        const values = [
          row.division || "–",
          role,
          skaterGames > 0 ? formatInteger(skaterGames, "0") : "–",
          goalieGames > 0 ? formatInteger(goalieGames, "0") : "–",
          skaterGames > 0 ? formatInteger(row.goals, "0") : "–",
          skaterGames > 0 ? formatInteger(row.assists, "0") : "–",
          skaterGames > 0 ? formatInteger(row.points, "0") : "–",
          goalieGames > 0 ? formatSavePercentage(row.savePercentage) : "–",
          goalieGames > 0 ? formatDecimal(row.gaa, 2) : "–"
        ];

        tr.append(seasonCell, teamCell);

        values.forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.append(td);
        });

        elements.historyTableBody.append(tr);
      });

      const total = uniqueTournamentCount(rows);
      const visible = uniqueTournamentCount(visibleRows);

      elements.historyCount.textContent =
        historyCompetitionFilter === "ALL"
          ? `${total} turneringar`
          : `${visible} ${historyCompetitionFilter === "ÖVRIGA" ? "övriga" : historyCompetitionFilter}-turneringar`;

      if (!visibleRows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 11;
        td.className = "player-history-empty";
        td.textContent = "Inga turneringar matchar filtret.";
        tr.append(td);
        elements.historyTableBody.append(tr);
      }
    }

    async function hydratePlayerSelfProfile(playerKey) {
      if (!playerKey || !hasValidConfig()) return;
      try {
        const params = new URLSearchParams({
          select: 'player_key,image_url,presentation,positions_text,contact,twitch_url,x_url,instagram_url,availability_status,team_status',
          player_key: `eq.${playerKey}`,
          limit: '1'
        });
        const rows = await fetchJson('v_ehockey_player_self_profiles_public', params);
        const row = rows[0] || null;
        const old = document.querySelector('.player-self-profile-public');
        old?.remove();
        if (!row) return;

        if (row.image_url && elements.playerAvatar) {
          elements.playerAvatar.src = row.image_url;
          elements.playerAvatar.onerror = () => { elements.playerAvatar.onerror = null; };
        }

        const hasContent = [row.presentation,row.positions_text,row.contact,row.twitch_url,row.x_url,row.instagram_url,row.availability_status,row.team_status].some((value)=>String(value||'').trim());
        if (!hasContent || !elements.playerBio) return;
        const section = document.createElement('section');
        section.className = 'player-self-profile-public';
        const links = [
          ['Twitch', row.twitch_url],
          ['X', row.x_url],
          ['Instagram', row.instagram_url]
        ].filter(([,url]) => /^https?:\/\//i.test(String(url||'').trim()));
        section.innerHTML = `<div class="player-self-profile-public__head"><span>FRÅN SPELAREN</span><strong>Profiluppgifter från spelaren själv</strong><em>ADMIN GODKÄND</em></div>${row.presentation?`<p>${escapeHtml(row.presentation)}</p>`:''}<div class="player-self-profile-public__facts">${row.positions_text?`<div><span>POSITIONER</span><strong>${escapeHtml(row.positions_text)}</strong></div>`:''}${row.availability_status?`<div><span>STATUS</span><strong>${escapeHtml(row.availability_status)}</strong></div>`:''}${row.team_status?`<div><span>LAGSTATUS</span><strong>${escapeHtml(row.team_status)}</strong></div>`:''}${row.contact?`<div><span>KONTAKT</span><strong>${escapeHtml(row.contact)}</strong></div>`:''}</div>${links.length?`<div class="player-self-profile-public__links">${links.map(([label,url])=>`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')}</div>`:''}`;
        elements.playerBio.insertAdjacentElement('afterend', section);
      } catch (error) {
        console.warn('Kunde inte hämta spelarens självuppdaterade profil:', error);
      }
    }

    function render(rows) {
      const latest = [...rows].sort(compareHistoryRows)[0];
      const clubRows = clubHistoryRows(rows);
      const latestClub = [...clubRows].sort(compareHistoryRows)[0] || latest;
      const tournamentCount = uniqueTournamentCount(rows);
      const clubCount = uniqueClubCount(rows);
      const names = new Map();
      rows.forEach((row) => names.set(row.name, (names.get(row.name) || 0) + 1));
      const canonicalName = rows.find((row) => row.canonicalName)?.canonicalName || "";
      const currentName = canonicalName || [...names].sort((a, b) => b[1] - a[1])[0]?.[0] || latest.name;
      latest.name = currentName;
  
      document.title = `${currentName} – Svensk eHockey`;
      setPlayerFlag(latest.country);
      elements.playerName.textContent = currentName;
      setAvatar(latest);

      elements.playerLinks.replaceChildren();
      if (latest.externalUrl) {
        const link = document.createElement("a");
        link.className = "profile-action-link";
        link.href = latest.externalUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Öppna SportsGamer-profil ↗";
        elements.playerLinks.append(link);
      }
  
      const skaterGames = sum(rows, "skaterGames");
      const goalieGames = sum(rows, "goalieGames");
      const goals = sum(rows, "goals");
      const assists = sum(rows, "assists");
      const points = sum(rows, "points");
      const saves = sum(rows, "saves");
      const shotsAgainst = sum(rows, "shotsAgainst");
      const goalsAllowed = sum(rows, "goalsAllowed");
      const shutouts = sum(rows, "shutouts");
      const careerGames = rows.reduce(
        (total, row) => total + number(row.appearanceGames),
        0
      );

      const primaryRole = roleLabel(skaterGames, goalieGames);

      const chronologicalRows = [...clubRows].sort((a, b) =>
        tournamentChronologyValue(a) - tournamentChronologyValue(b) ||
        number(a.leagueId) - number(b.leagueId)
      );

      const earliest = chronologicalRows[0] || latestClub;
      const bestOffense = bestOffensiveRow(clubRows.length ? clubRows : rows);
      const bestGoalie = bestGoalieRow(rows);

      elements.playerCurrentTeam.replaceChildren();
      if (latestClub.teamId) {
        const currentTeamLink = document.createElement("a");
        currentTeamLink.href = teamUrl(latestClub.teamId);
        currentTeamLink.textContent = latestClub.teamName || "Okänt lag";
        elements.playerCurrentTeam.append(currentTeamLink);
      } else {
        elements.playerCurrentTeam.textContent =
          latestClub.teamName || "Okänt lag";
      }

      const currentTeamName = latestClub.teamName || "Okänt lag";
      renderProfileTeamBrand(currentTeamName);
      void hydrateProfileRanking(latest.playerKey, currentName);

      elements.playerMeta.textContent = [
        primaryRole,
        latest.country ? countryFlag(latest.country) : "",
        `${tournamentCount} ${seasonWord(tournamentCount)}`
      ].filter(Boolean).join(" • ");

      elements.playerCompetitions.textContent =
        competitionLine(rows) || "Turneringshistorik";

      /* Visa direkt egenhistorikens personliga meriter. */
      renderPlayerMerits(rows);

      renderHistoryProfileBio({
        currentName,
        earliest,
        latest: latestClub,
        bestOffense,
        bestGoalie,
        tournamentCount,
        clubCount,
        primaryRole,
        careerGames,
        skaterGames,
        goalieGames,
        careerSavePercentage: shotsAgainst > 0 ? saves / shotsAgainst : null,
        shutouts,
        competitions: competitionLine(rows),
        profileRows: rows
      });
      void hydratePlayerSelfProfile(latest.playerKey);

      elements.tournamentCount.textContent = formatInteger(tournamentCount, "0");
      elements.teamCount.textContent = formatInteger(clubCount, "0");
      elements.careerGames.textContent = formatInteger(careerGames, "0");
      const isPrimaryGoalie = goalieGames > skaterGames;
      const careerGoalieSavePercentage =
        shotsAgainst > 0 ? saves / shotsAgainst : null;

      setHeadlineCareerStats({
        isGoalie: isPrimaryGoalie,
        skaterPoints: points,
        skaterGoals: goals,
        skaterAssists: assists,
        goalieGames,
        goalieSavePercentage: careerGoalieSavePercentage,
        goalieShutouts: shutouts
      });
  
      elements.skaterCareerStats.replaceChildren();
      addStat(elements.skaterCareerStats, "Matcher", formatInteger(skaterGames, "0"));
      addStat(elements.skaterCareerStats, "Mål", formatInteger(goals, "0"));
      addStat(elements.skaterCareerStats, "Assist", formatInteger(assists, "0"));
      addStat(elements.skaterCareerStats, "Poäng", formatInteger(points, "0"));
      addStat(elements.skaterCareerStats, "+/−", formatInteger(sum(rows, "plusMinus"), "0"));
      addStat(elements.skaterCareerStats, "PIM", formatInteger(sum(rows, "penaltyMinutes"), "0"));
  
      elements.goalieCareerStats.replaceChildren();
      addStat(elements.goalieCareerStats, "Matcher", formatInteger(goalieGames, "0"));
      addStat(elements.goalieCareerStats, "Vinster", formatInteger(sum(rows, "goalieWins"), "0"));
      addStat(elements.goalieCareerStats, "Skott", formatInteger(shotsAgainst, "0"));
      addStat(elements.goalieCareerStats, "Räddningar", formatInteger(saves, "0"));
      addStat(elements.goalieCareerStats, "GAA", goalieGames ? formatDecimal(goalsAllowed / goalieGames, 2) : "–");
      addStat(elements.goalieCareerStats, "SV%", shotsAgainst ? formatSavePercentage(saves / shotsAgainst) : "–");
      addStat(elements.goalieCareerStats, "Nollor", formatInteger(shutouts, "0"));
      updateCareerSummaryRoleVisibility({ skaterGames, goalieGames });
  
      currentHistoryRows = [...rows];
      renderPlayerHistoryFilters(currentHistoryRows);
      renderPlayerHistoryTable(currentHistoryRows);
    }
  
    function updateCareerSummaryRoleVisibility({ skaterGames = 0, goalieGames = 0 }) {
      const hasSkaterGames = Number(skaterGames) > 0;
      const hasGoalieGames = Number(goalieGames) > 0;

      if (elements.skaterCareerCard) elements.skaterCareerCard.hidden = !hasSkaterGames;
      if (elements.goalieCareerCard) elements.goalieCareerCard.hidden = !hasGoalieGames;

      if (elements.careerSummaryGrid) {
        elements.careerSummaryGrid.classList.toggle("is-single-role", hasSkaterGames !== hasGoalieGames);
        elements.careerSummaryGrid.classList.toggle("is-hybrid-role", hasSkaterGames && hasGoalieGames);
      }

      if (!elements.careerSummaryLead) return;
      if (hasSkaterGames && hasGoalieGames) {
        elements.careerSummaryLead.textContent = `${formatInteger(Number(skaterGames) + Number(goalieGames), "0")} registrerade rollmatcher: ${formatInteger(skaterGames, "0")} som utespelare och ${formatInteger(goalieGames, "0")} i mål.`;
      } else if (hasGoalieGames) {
        elements.careerSummaryLead.textContent = `${formatInteger(goalieGames, "0")} registrerade matcher som målvakt.`;
      } else if (hasSkaterGames) {
        elements.careerSummaryLead.textContent = `${formatInteger(skaterGames, "0")} registrerade matcher som utespelare.`;
      } else {
        elements.careerSummaryLead.textContent = "Ingen registrerad matchstatistik för vald spelare.";
      }
    }

    function setHeadlineCareerStats({
      isGoalie,
      skaterPoints = 0,
      skaterGoals = 0,
      skaterAssists = 0,
      goalieGames = 0,
      goalieSavePercentage = null,
      goalieShutouts = 0
    }) {
      const stats = [
        {
          element: elements.careerPoints,
          label: isGoalie ? "MATCHER" : "POÄNG",
          value: isGoalie
            ? formatInteger(goalieGames, "0")
            : formatInteger(skaterPoints, "0")
        },
        {
          element: elements.careerGoals,
          label: isGoalie ? "SV%" : "MÅL",
          value: isGoalie
            ? (
                goalieSavePercentage === null
                  ? "–"
                  : formatSavePercentage(goalieSavePercentage)
              )
            : formatInteger(skaterGoals, "0")
        },
        {
          element: elements.careerAssists,
          label: isGoalie ? "NOLLOR" : "ASSIST",
          value: isGoalie
            ? formatInteger(goalieShutouts, "0")
            : formatInteger(skaterAssists, "0")
        }
      ];

      stats.forEach(({ element, label, value }) => {
        element.textContent = value;
        const article = element.closest("article");
        const labelElement = article?.querySelector("span");
        if (labelElement) {
          labelElement.textContent = label;
        }
      });

      if (elements.headlineStats) {
        elements.headlineStats.setAttribute(
          "aria-label",
          isGoalie
            ? "Målvaktens karriärstatistik"
            : "Offensiv karriärstatistik"
        );
      }
    }


    function renderStandalone(directoryRow, cacheMissing = false) {
      const externalUrl = directoryRow.sports_gamer_player_url || "";
      const sportsGamerPlayerId = sportsGamerIdFromUrl(externalUrl);
      const tournamentCount = number(directoryRow.tournament_count);
      const clubCount = number(directoryRow.club_count);
      const careerGames = number(directoryRow.career_games);
      const totalGoals = number(directoryRow.total_goals);
      const totalAssists = number(directoryRow.total_assists);
      const totalPoints = number(directoryRow.total_points);
      const totalSkaterGames = number(directoryRow.total_skater_games);
      const totalGoalieGames = number(directoryRow.total_goalie_games);
      const totalGoalieSaves = number(directoryRow.total_goalie_saves);
      const totalGoalieShotsAgainst =
        number(directoryRow.total_goalie_shots_against);
      const totalGoalieSavePercentage =
        nullableNumber(directoryRow.total_goalie_save_percentage);
      const totalGoalieShutouts =
        number(directoryRow.total_goalie_shutouts);
  
      const profile = {
        name: directoryRow.display_gamertag || "Okänd spelare",
        country: String(directoryRow.player_country || "").toUpperCase(),
        image: directoryRow.player_image || "",
        externalUrl,
        sportsGamerPlayerId,
        position: directoryRow.primary_position || "",
        playerType: directoryRow.player_type || "unknown"
      };
  
      document.title = `${profile.name} – Svensk eHockey`;
      setPlayerFlag(profile.country);
      elements.playerName.textContent = profile.name;
      setAvatar(profile);

      const standaloneRole = roleLabel(totalSkaterGames, totalGoalieGames);

      const standaloneTeamName = directoryRow.latest_team || "Okänt lag";
      elements.playerCurrentTeam.textContent = standaloneTeamName;
      renderProfileTeamBrand(standaloneTeamName);
      void hydrateProfileRanking(directoryRow.player_key, profile.name);

      elements.playerMeta.textContent = [
        standaloneRole,
        profile.country ? countryFlag(profile.country) : "",
        `${tournamentCount} ${seasonWord(tournamentCount)}`
      ].filter(Boolean).join(" • ");

      const standaloneCompetitionValues = Array.isArray(directoryRow.competitions)
        ? directoryRow.competitions
        : String(directoryRow.competitions || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

      const standaloneCompetitions =
        cleanStandaloneCompetitions(standaloneCompetitionValues);

      elements.playerCompetitions.textContent =
        standaloneCompetitions.join(", ") || "Spelarprofil";

      setProfileBio([
        `${profile.name} är en svensk eHockey-spelare i Svensk eHockeys databas.`,
        tournamentCount > 0
          ? `Profilen innehåller ${tournamentCount} ${seasonWord(tournamentCount)} och ${clubCount} olika lag. Senast syns spelaren i ${directoryRow.latest_season || "den senaste registrerade säsongen"} för ${directoryRow.latest_team || "sitt senaste lag"}.`
          : "Spelaren finns registrerad i spelarregistret, men har ännu ingen importerad turneringshistorik.",
        `Profilen är främst noterad som ${standaloneRole.toLocaleLowerCase("sv-SE")} med ${careerGames} ${matchWord(careerGames)} totalt.`,
        totalPoints > 0
          ? `Karriärsummeringen visar ${formatInteger(totalPoints, "0")} poäng, ${formatInteger(totalGoals, "0")} mål och ${formatInteger(totalAssists, "0")} assist.`
          : ""
      ]);

      elements.playerLinks.replaceChildren();
      if (profile.externalUrl) {
        const link = document.createElement("a");
        link.className = "profile-action-link";
        link.href = profile.externalUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Öppna SportsGamer-profil ↗";
        elements.playerLinks.append(link);
      }
  
      elements.tournamentCount.textContent =
        formatInteger(tournamentCount, "0");
      elements.teamCount.textContent =
        formatInteger(clubCount, "0");
      elements.careerGames.textContent =
        formatInteger(careerGames, "0");
      const isStandaloneGoalie = totalGoalieGames > totalSkaterGames;

      setHeadlineCareerStats({
        isGoalie: isStandaloneGoalie,
        skaterPoints: totalPoints,
        skaterGoals: totalGoals,
        skaterAssists: totalAssists,
        goalieGames: totalGoalieGames,
        goalieSavePercentage: totalGoalieSavePercentage,
        goalieShutouts: totalGoalieShutouts
      });
  
      elements.skaterCareerStats.replaceChildren();
      addStat(
        elements.skaterCareerStats,
        "Matcher",
        formatInteger(totalSkaterGames, "0")
      );
      addStat(
        elements.skaterCareerStats,
        "Mål",
        formatInteger(totalGoals, "0")
      );
      addStat(
        elements.skaterCareerStats,
        "Assist",
        formatInteger(totalAssists, "0")
      );
      addStat(
        elements.skaterCareerStats,
        "Poäng",
        formatInteger(totalPoints, "0")
      );
      addStat(elements.skaterCareerStats, "+/−", "–");
      addStat(elements.skaterCareerStats, "PIM", "–");
  
      elements.goalieCareerStats.replaceChildren();
      addStat(
        elements.goalieCareerStats,
        "Matcher",
        formatInteger(totalGoalieGames, "0")
      );
      addStat(elements.goalieCareerStats, "Vinster", "–");
      addStat(
        elements.goalieCareerStats,
        "Skott",
        formatInteger(totalGoalieShotsAgainst, "0")
      );
      addStat(
        elements.goalieCareerStats,
        "Räddningar",
        formatInteger(totalGoalieSaves, "0")
      );
      addStat(elements.goalieCareerStats, "GAA", "–");
      addStat(
        elements.goalieCareerStats,
        "SV%",
        totalGoalieSavePercentage === null
          ? "–"
          : formatSavePercentage(totalGoalieSavePercentage)
      );
      addStat(
        elements.goalieCareerStats,
        "Nollor",
        formatInteger(totalGoalieShutouts, "0")
      );
      updateCareerSummaryRoleVisibility({
        skaterGames: totalSkaterGames,
        goalieGames: totalGoalieGames
      });
  
      elements.historyTableBody.replaceChildren();
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 11;
      emptyCell.textContent = cacheMissing && tournamentCount > 0
        ? "Sammanfattningen finns, men detaljerad historik saknas i spelarhistorikcachen."
        : "Ingen importerad turneringshistorik.";
      emptyCell.className = "history-empty-cell";
      emptyRow.append(emptyCell);
      elements.historyTableBody.append(emptyRow);
      elements.historyCount.textContent =
        `${tournamentCount} turneringar`;
    }
  
    function showError(error) {
      elements.errorMessage.textContent = error instanceof Error ? error.message : String(error);
      elements.errorNotice.hidden = false;
      elements.playerPage.hidden = true;
    }
  
    async function load() {
      const playerRouteValue = getPlayerKey();
      const playerKeyHint = getPlayerKeyHint();
      let playerKey = playerKeyHint || playerRouteValue;

      elements.errorNotice.hidden = true;
      elements.setupNotice.hidden = true;
      elements.loadingState.hidden = false;
      elements.playerPage.hidden = true;
      if (elements.reloadButton) elements.reloadButton.disabled = true;
  
      const fromTeam = getFromTeam();
      elements.backLink.href = fromTeam ? teamUrl(fromTeam) : "#/spelare";
      elements.backLink.textContent = fromTeam ? "← Tillbaka till laget" : "← Alla svenska spelare";
  
      if (!playerRouteValue) {
        showError(new Error("Länken innehåller ingen giltig spelaridentifierare."));
        elements.loadingState.hidden = true;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
        return;
      }
      if (!hasValidConfig()) {
        elements.loadingState.hidden = true;
        elements.setupNotice.hidden = false;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
        return;
      }
  
      try {
        if (!playerKeyHint) {
          // Äldre/delade profil-URL:er utan pk fungerar fortfarande. Även
          // slug-reserven läser nu den snabba katalogcachen.
          playerKey = await resolvePlayerRouteValue(playerRouteValue);
        }

        // Läs alltid den lilla spelarkatalograden först. Spelare med 0
        // turneringar ska inte starta någon historikfråga alls.
        const directoryRows = await fetchDirectoryPlayer(playerKey);
  
        if (!directoryRows.length) {
          throw new Error("Spelaren hittades inte.");
        }
  
        const directoryRow = chooseBestDirectoryRow(directoryRows);

        const friendlySlug = SEH_playerSlug(
          directoryRow?.display_gamertag || playerRouteValue
        );

        if (
          friendlySlug &&
          (
            !playerKeyHint ||
            SEH_isHashedPlayerKey(playerRouteValue) ||
            SEH_playerSlug(playerRouteValue) !== friendlySlug
          )
        ) {
          const friendlyHash = SEH_playerProfileUrl(
            playerKey,
            directoryRow?.display_gamertag || friendlySlug,
            fromTeam
          );

          history.replaceState(
            null,
            "",
            `${location.pathname}${location.search}${friendlyHash}`
          );
        }

        const hasImportedHistory =
          number(directoryRow.tournament_count) > 0 ||
          number(directoryRow.career_games) > 0;
  
        if (!hasImportedHistory) {
          renderStandalone(directoryRow);
          console.info(
            `Svensk eHockey ${APP_BUILD}: spelarprofil utan importerad historik laddades.`
          );
        } else {
          // Först används player_key. Efter en merge används SportsGamer-ID
          // automatiskt som reserv om katalogen och historikcachen har olika
          // player_key för samma verkliga spelare.
          const historyRows = await fetchPlayerHistory(
            playerKey,
            directoryRow
          );
  
          if (!historyRows.length) {
            // Visa åtminstone den korrekta katalogsammanfattningen i stället
            // för felaktiga nollor om historikcachen skulle vara osynkad.
            renderStandalone(directoryRow, true);
            console.warn(
              `Svensk eHockey ${APP_BUILD}: katalogen anger historik men det globala historik-RPC:t gav inga rader.`
            );
          } else {
            const namedHistoryRows = await addLeagueDisplayNames(historyRows);
            const rows = dedupeHistoryRows(namedHistoryRows.map(normalize));
            console.info(
              `Svensk eHockey ${APP_BUILD}: ${uniqueTournamentCount(rows)} turneringar och ${rows.length} historikrader laddades.`
            );
            /*
             * Matcha först historiska lagnamn mot det lokala lagregistret.
             * Det här måste ske i själva load-flödet innan tabellen är klar,
             * annars blir rader utan team_id aldrig klickbara.
             */
            const resolvedRows =
              await resolveAndRenderHistoryTeamLinks(rows);

            render(resolvedRows);
            void enrichPlayerTeams(resolvedRows);
            void enrichPlayerMerits(resolvedRows, directoryRow);
          }
        }
  
        elements.playerPage.hidden = false;
      } catch (error) {
        showError(error);
      } finally {
        elements.loadingState.hidden = true;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
      }
    }
  
    initProfileTabs();
    elements.reloadButton.addEventListener("click", load);
    load();
  })();
}


function SEH_initTeam() {
  /* ======================================================
     ROUTE CONTROLLER: team
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const APP_BUILD = "2026-08-31-v1284-team-hero-recommended";
    const config = window.EHOCKEY_CONFIG || {};
  
    console.info("eHockey Master team build:", APP_BUILD);
  
    const elements = {
      setupNotice: document.querySelector("#setupNotice"),
      errorNotice: document.querySelector("#errorNotice"),
      errorMessage: document.querySelector("#errorMessage"),
      loadingState: document.querySelector("#loadingState"),
      teamPage: document.querySelector("#teamPage"),
      reloadButton: document.querySelector("#reloadButton"),
  
      teamProfileAvatar: document.querySelector("#teamProfileAvatar"),
      teamName: document.querySelector("#teamName"),
      teamLinks: document.querySelector("#teamLinks"),
      historyBadges: document.querySelector("#historyBadges"),
      heroChips: document.querySelector("#heroChips"),
      clubProfileText: document.querySelector("#clubProfileText"),
      leaderMatches: document.querySelector("#leaderMatches"),
      leaderPoints: document.querySelector("#leaderPoints"),
      leaderGoalie: document.querySelector("#leaderGoalie"),
      divisionCurve: document.querySelector("#divisionCurve"),
      divisionCurveFirst: document.querySelector("#divisionCurveFirst"),
      divisionCurveLatest: document.querySelector("#divisionCurveLatest"),
  
      winsCount: document.querySelector("#winsCount"),
      winsMetricNote: document.querySelector("#winsMetricNote"),
      bestEclSeason: document.querySelector("#bestEclSeason"),
      bestEclNote: document.querySelector("#bestEclNote"),
      bestDivision: document.querySelector("#bestDivision"),
      divisionMetricNote: document.querySelector("#divisionMetricNote"),
      playoffRecord: document.querySelector("#playoffRecord"),
      playoffMetricNote: document.querySelector("#playoffMetricNote"),
      gamesCount: document.querySelector("#gamesCount"),
      winsCompact: document.querySelector("#winsCompact"),
      lossesCount: document.querySelector("#lossesCount"),
      winPercentage: document.querySelector("#winPercentage"),
      goalsRecord: document.querySelector("#goalsRecord"),
      goalDifference: document.querySelector("#goalDifference"),
  
      teamHonoursSection: document.querySelector("#teamHonoursSection"),
      teamHonoursCount: document.querySelector("#teamHonoursCount"),
      teamHonoursList: document.querySelector("#teamHonoursList"),
      championshipsCount: document.querySelector("#championshipsCount"),
      finalsCount: document.querySelector("#finalsCount"),
      bronzeCount: document.querySelector("#bronzeCount"),
  
      tournamentCount: document.querySelector("#tournamentCount"),
      seasonsTableBody: document.querySelector("#seasonsTableBody"),
      playersHeading: document.querySelector("#playersHeading"),
      allTimePlayerCount: document.querySelector("#allTimePlayerCount"),
      playerCards: document.querySelector("#playerCards"),
      togglePlayerCards: document.querySelector("#togglePlayerCards"),
      allTimeSkaterBody: document.querySelector("#allTimeSkaterBody"),
      allTimeGoalieBody: document.querySelector("#allTimeGoalieBody"),
      toggleAllTimeSkaters: document.querySelector("#toggleAllTimeSkaters"),
      toggleAllTimeGoalies: document.querySelector("#toggleAllTimeGoalies"),
  
      sportsGamerIds: document.querySelector("#sportsGamerIds"),
      historicalNames: document.querySelector("#historicalNames"),
      leagueNames: document.querySelector("#leagueNames"),
  
      competitionFilter: document.querySelector("#competitionFilter"),
      seasonCompetitionFilters: document.querySelector("#seasonCompetitionFilters"),
      tournamentSort: document.querySelector("#tournamentSort"),
      tournamentResultText: document.querySelector("#tournamentResultText"),
      lastUpdated: document.querySelector("#lastUpdated"),
      tournamentList: document.querySelector("#tournamentList")
    };
  
    let seasonCompetitionFilter = "ALL";
    let activeTeamProfileTab = "overview";
    let teamProfileTabButtons = [];
    let teamProfileTabPanels = [];

    const state = {
      team: null,
      tournaments: [],
      filteredTournaments: [],
      allTimePlayers: [],
      playerCounts: new Map(),
      playerCache: new Map(),
      showAllPlayerCards: false,
      showAllTimeSkaters: false,
      showAllTimeGoalies: false,
      loadedAt: null
    };

    function setTeamProfileTab(tabName, { focus = false } = {}) {
      const requested = String(tabName || "overview").trim().toLowerCase();
      const available = teamProfileTabButtons.filter((button) => !button.hidden);
      const allowed = new Set(available.map((button) => button.dataset.teamTab));
      const nextTab = allowed.has(requested) ? requested : "overview";
      activeTeamProfileTab = nextTab;

      teamProfileTabButtons.forEach((button) => {
        const active = button.dataset.teamTab === nextTab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus({ preventScroll: true });
      });

      teamProfileTabPanels.forEach((panel) => {
        panel.hidden = panel.dataset.teamPanel !== nextTab;
      });
    }

    function updateTeamMeritsTabVisibility() {
      const meritsButton = teamProfileTabButtons.find(
        (button) => button.dataset.teamTab === "merits"
      );
      if (!meritsButton) return;

      // Meriter ska alltid finnas som en del av lagprofilens fasta navigering.
      // Lag utan registrerade meriter får i stället ett tydligt tomläge i fliken.
      meritsButton.hidden = false;
      meritsButton.closest(".team-profile-tabs-v1280")?.classList.remove(
        "has-no-merits"
      );
    }

    function initTeamProfileTabs() {
      if (!elements.teamPage || elements.teamPage.querySelector("#teamProfileTabs")) return;

      const hero = elements.teamPage.querySelector(".history-hero");
      const metrics = elements.teamPage.querySelector(".history-metric-band");
      const seasons = elements.seasonsTableBody?.closest(".history-section");
      const players = elements.playerCards?.closest(".history-player-section");
      const details = elements.tournamentList?.closest(".history-details-section");
      const source = elements.sportsGamerIds?.closest(".history-source-panel");

      if (!hero || !metrics || !seasons || !players || !details || !source) return;

      const tabDefinitions = [
        { key: "overview", label: "Översikt" },
        { key: "seasons", label: "Säsonger" },
        { key: "players", label: "Spelare" },
        { key: "merits", label: "Meriter" }
      ];

      const tabs = document.createElement("nav");
      tabs.id = "teamProfileTabs";
      tabs.className = "team-profile-tabs-v1280";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "Lagprofilens innehåll");

      const stage = document.createElement("div");
      stage.className = "team-profile-tab-stage-v1280";

      const panels = new Map();
      tabDefinitions.forEach(({ key, label }, index) => {
        const button = document.createElement("button");
        button.id = `team-profile-tab-${key}`;
        button.type = "button";
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", index === 0 ? "true" : "false");
        button.setAttribute("aria-controls", `team-profile-panel-${key}`);
        button.dataset.teamTab = key;
        button.classList.toggle("is-active", index === 0);
        button.tabIndex = index === 0 ? 0 : -1;
        button.textContent = label;
        tabs.append(button);

        const panel = document.createElement("section");
        panel.id = `team-profile-panel-${key}`;
        panel.className = `team-profile-tab-panel-v1280 team-profile-tab-panel-v1280--${key}`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", button.id);
        panel.dataset.teamPanel = key;
        panel.hidden = index !== 0;
        stage.append(panel);
        panels.set(key, panel);
      });

      panels.get("overview").append(metrics, source);
      panels.get("seasons").append(seasons, details);
      panels.get("players").append(players);
      panels.get("merits").append(elements.teamHonoursSection);

      // Samma struktur som spelarprofilen: lagets hero ligger alltid kvar
      // och undermenyn byter endast innehållet under hero-sektionen.
      elements.teamPage.prepend(hero, tabs, stage);
      teamProfileTabButtons = [...tabs.querySelectorAll("[data-team-tab]")];
      teamProfileTabPanels = [...stage.querySelectorAll("[data-team-panel]")];

      teamProfileTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          setTeamProfileTab(button.dataset.teamTab || "overview");
        });

        button.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();

          const available = teamProfileTabButtons.filter((item) => !item.hidden);
          const index = available.indexOf(button);
          if (index < 0 || !available.length) return;

          let nextIndex = index;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % available.length;
          if (event.key === "ArrowLeft") nextIndex = (index - 1 + available.length) % available.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = available.length - 1;

          setTeamProfileTab(available[nextIndex]?.dataset.teamTab || "overview", {
            focus: true
          });
        });
      });

      setTeamProfileTab("overview");
    }
  
    function hasValidConfig() {
      return (
        typeof config.supabaseUrl === "string" &&
        /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl.trim()) &&
        typeof config.supabasePublishableKey === "string" &&
        !config.supabasePublishableKey.includes("KLISTRA_IN") &&
        config.supabasePublishableKey.trim().length > 20
      );
    }
  
    function getTeamId() {
      const value = window.SEH_ROUTE?.params?.teamId ||
        new URLSearchParams(window.location.search).get("id");
      const teamId = Number(value);
  
      return Number.isInteger(teamId) && teamId > 0
        ? teamId
        : null;
    }
  
    function normalizeArray(value) {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
  
      if (typeof value === "string" && value.trim()) {
        return [value.trim()];
      }
  
      return [];
    }
  
    function normalizeTeam(row) {
      return {
        teamId: Number(row.team_id),
        currentName: row.current_name || "Namnlöst lag",
        country: String(row.effective_country || "").trim().toUpperCase(),
        sportsGamerIds: normalizeArray(row.sports_gamer_team_ids),
        historicalNames: normalizeArray(row.historical_names),
        leagueNames: normalizeArray(row.names_used_in_leagues),
        leagueAppearances: number(row.league_appearances),
        firstRegisteredAt: row.first_registered_at || "",
        lastRegisteredAt: row.last_registered_at || "",
        logoPath: row.logo_path || "",
        logoUrl: row.logo_url || "",
        profileUrl: row.profile_url || ""
      };
    }
  
  
    function normalizePlayer(row) {
      return {
        playerKey: row.player_key || "",
        playerSource: row.player_source || "",
        playerImage: row.player_image || "",
  
        displayGamertag:
          row.display_gamertag || "Okänd spelare",
  
        psnTag: row.psn_tag || "",
        xboxGamertag: row.xbox_gamertag || "",
  
        playerNumber: nullableNumber(
          row.player_number
        ),
  
        playerCountry:
          String(
            row.player_country || ""
          ).trim().toUpperCase(),
  
        captainRole:
          String(
            row.captain_role || ""
          ).trim().toUpperCase(),
  
        primaryPosition:
          row.primary_position || "",
  
        listedInRoster:
          row.listed_in_roster === true,
  
        hasFullLicense:
          row.has_full_license === true,
  
        hasBackupLicense:
          row.has_backup_license === true,
  
        hasAnyStatistics:
          row.has_any_statistics === true,
  
        playerType:
          row.player_type || "roster",
  
        regularSkaterGames:
          number(row.regular_skater_games),
  
        regularGoals:
          number(row.regular_goals),
  
        regularAssists:
          number(row.regular_assists),
  
        regularPoints:
          number(row.regular_points),
  
        playoffSkaterGames:
          number(row.playoff_skater_games),
  
        playoffGoals:
          number(row.playoff_goals),
  
        playoffAssists:
          number(row.playoff_assists),
  
        playoffPoints:
          number(row.playoff_points),
  
        totalSkaterGames:
          number(row.total_skater_games),
  
        totalGoals:
          number(row.total_goals),
  
        totalAssists:
          number(row.total_assists),
  
        totalPoints:
          number(row.total_points),
  
        totalPlusMinus:
          number(row.total_plus_minus),
  
        totalPenaltyMinutes:
          number(row.total_penalty_minutes),
  
        regularGoalieGames:
          number(row.regular_goalie_games),
  
        playoffGoalieGames:
          number(row.playoff_goalie_games),
  
        totalGoalieGames:
          number(row.total_goalie_games),
  
        totalGoalieWins:
          number(row.total_goalie_wins),
  
        totalGoalieLosses:
          number(row.total_goalie_losses),
  
        totalGoalieOvertimeLosses:
          number(row.total_goalie_overtime_losses),
  
        totalGoalieSavePercentage:
          nullableNumber(
            row.total_goalie_save_percentage
          ),
  
        totalGoalieGoalsAgainstAverage:
          nullableNumber(
            row.total_goalie_goals_against_average
          ),
  
        totalGoalieShutouts:
          number(row.total_goalie_shutouts),
  
        sportsGamerPlayerUrl:
          row.sports_gamer_player_url || ""
      };
    }
  
  
    function normalizeAllTimePlayer(row) {
      const totalGoalieSaves = number(row.total_goalie_saves);
      const totalGoalieGoalsAllowed = number(row.total_goalie_goals_allowed);
      const derivedGoalieShotsAgainst = totalGoalieSaves + totalGoalieGoalsAllowed;
      const reportedGoalieShotsAgainst = number(row.total_goalie_shots_against);
      const totalGoalieShotsAgainst = derivedGoalieShotsAgainst > 0
        ? derivedGoalieShotsAgainst
        : reportedGoalieShotsAgainst;
      const totalGoalieSavePercentage = totalGoalieShotsAgainst > 0
        ? totalGoalieSaves / totalGoalieShotsAgainst
        : nullableNumber(row.total_goalie_save_percentage);

      return {
        playerKey: row.player_key || "",
        displayGamertag: row.display_gamertag || "Okänd spelare",
        playerCountry: String(row.player_country || "").trim().toUpperCase(),
        playerImage: row.player_image || "",
        sportsGamerPlayerUrl: row.sports_gamer_player_url || "",
        primaryPosition: row.primary_position || "",
        latestSeason: row.latest_season || "",
        latestDivision: row.latest_division || "",
        tournamentCount: number(row.tournament_count),
        competitionCount: number(row.competition_count),
        competitions: normalizeArray(row.competitions),
        divisions: normalizeArray(row.divisions),
        totalSkaterGames: number(row.total_skater_games),
        totalGoals: number(row.total_goals),
        totalAssists: number(row.total_assists),
        totalPoints: number(row.total_points),
        totalPlusMinus: number(row.total_plus_minus),
        totalPenaltyMinutes: number(row.total_penalty_minutes),
        totalGoalieGames: number(row.total_goalie_games),
        totalGoalieWins: number(row.total_goalie_wins),
        totalGoalieLosses: number(row.total_goalie_losses),
        totalGoalieOvertimeLosses: number(row.total_goalie_overtime_losses),
        totalGoalieSaves,
        totalGoalieShotsAgainst,
        totalGoalieGoalsAllowed,
        totalGoalieSavePercentage,
        totalGoalieGoalsAgainstAverage: nullableNumber(row.total_goalie_goals_against_average),
        totalGoalieShutouts: number(row.total_goalie_shutouts),
        careerGames: number(row.career_games),
        playerType: row.player_type || "skater",
        lastAppearanceDate: row.last_appearance_date || ""
      };
    }
  
  
    function inferCompetitionCode(row) {
      const code = String(row.competition_code || "").trim().toUpperCase();
      if (code === "ESHL") return "ESHL";
      return code || "ÖVRIGT";
    }
  
    function normalizeTournament(row) {
      const competitionCode = inferCompetitionCode(row);
      return {
        teamId: Number(row.team_id),
        currentName: row.current_name || "",
        effectiveCountry: row.effective_country || "",
  
        competitionCode,
        competitionName: row.competition_name || "",
        seasonLabel: normalizedSeasonLabel(
          row.season_label,
          competitionCode,
          row.league_name,
          row.season_number
        ),
        seasonNumber: row.season_number,
        seasonYear: row.season_year,
        seasonPeriod: row.season_period || "",
        startDate:
          row.display_start_date ||
          row.chronology_date ||
          row.start_date ||
          "",
        endDate:
          row.display_end_date ||
          row.chronology_end_date ||
          row.end_date ||
          row.display_start_date ||
          row.chronology_date ||
          row.start_date ||
          "",
        chronologyEndDate:
          row.chronology_end_date ||
          row.display_end_date ||
          "",
  
        leagueId: Number(row.league_id),
        externalLeagueId: row.external_league_id || "",
        leagueName: row.league_name || "",
        catalogDisplayName: row.catalog_display_name || "",
        division: row.division || "",
        divisionKey: row.division_key || "",
        divisionRank: row.division_rank,
  
        nameUsed:
          row.tournament_team_name ||
          row.name_used_in_tournament ||
          row.current_name ||
          "",
        canonicalTeamKey: row.canonical_team_key || "",
        canonicalDisplayName: row.canonical_display_name || "",
        groupId:
          row.group_id === null ||
          row.group_id === undefined ||
          String(row.group_id).trim() === "0"
            ? ""
            : String(row.group_id).trim(),
        groupName: row.group_name || "",
        tablePosition: nullableNumber(row.table_position),
        regularSeasonSeed: nullableNumber(
          row.regular_season_seed
        ),
        qualifiedForPlayoffs:
          row.qualified_for_playoffs === true
            ? true
            : row.qualified_for_playoffs === false
              ? false
              : null,
        finalPlacement: nullableNumber(
          row.final_placement
        ),
        registeredAt: row.registered_at || "",
        registeredForLeague: row.registered_for_league || "",
        sourceUrl: row.source_url || "",
  
        leagueSourceSystem: row.league_source_system || "",
        sportsGamerTeamId: row.sports_gamer_team_id || "",
        sportsGamerUrl: row.sports_gamer_tournament_url || "",
  
        statisticsStage: row.statistics_stage || "",
        gamesPlayed: nullableNumber(row.games_played),
        wins: nullableNumber(row.wins),
        losses: nullableNumber(row.losses),
        overtimeWins: nullableNumber(row.overtime_wins),
        overtimeLosses: nullableNumber(row.overtime_losses),
        goalsFor: nullableNumber(row.goals_for),
        goalsAgainst: nullableNumber(row.goals_against),
        goalDiff: nullableNumber(row.goal_diff),
        tablePoints: nullableNumber(row.table_points),
  
        regularGames: nullableNumber(row.regular_games),
        regularWins: nullableNumber(row.regular_wins),
        regularLosses: nullableNumber(row.regular_losses),
        regularOvertimeWins: nullableNumber(
          row.regular_overtime_wins
        ),
        regularOvertimeLosses: nullableNumber(
          row.regular_overtime_losses
        ),
  
        playoffGames: nullableNumber(row.playoff_games),
        playoffWins: nullableNumber(row.playoff_wins),
        playoffLosses: nullableNumber(row.playoff_losses),
        playoffOvertimeWins: nullableNumber(
          row.playoff_overtime_wins
        ),
        playoffOvertimeLosses: nullableNumber(
          row.playoff_overtime_losses
        ),
        playoffGoalsFor: nullableNumber(row.playoff_goals_for),
        playoffGoalsAgainst: nullableNumber(row.playoff_goals_against),
        playoffRoundCode:
          row.playoff_round_code || "",
        playoffRound: row.playoff_round || "",
        playoffStatusCode:
          row.playoff_status_code || "",
        playoffStatus: row.playoff_status || "",
  
        playoffSeriesPlayed: nullableNumber(
          row.playoff_series_played
        ),
        playoffSeriesWon: nullableNumber(
          row.playoff_series_won
        ),
        playoffSeriesLost: nullableNumber(
          row.playoff_series_lost
        ),
  
        finalTeamGameWins: nullableNumber(
          row.final_team_game_wins
        ),
        finalOpponentGameWins: nullableNumber(
          row.final_opponent_game_wins
        ),
  
        playedCrossover:
          number(row.played_crossover) === 1,
        wonCrossover:
          number(row.won_crossover) === 1,
  
        hasPlayoffResult:
          row.has_playoff_result === true,
  
        hasStatistics: row.has_statistics === true,
        statisticsSource: row.statistics_source || "",
        sortDate: row.sort_date || row.start_date || row.registered_at || "",
        chronologyDate: row.chronology_date || row.sort_date || row.end_date || row.start_date || row.registered_at || ""
      };
    }
  
    function number(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  
    function nullableNumber(value) {
      if (value === null || value === undefined || value === "") {
        return null;
      }
  
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  
    function formatStageRecord(
      wins,
      losses,
      overtimeWins,
      overtimeLosses
    ) {
      const parts = [
        `${formatInteger(wins, "0")} V`
      ];
  
      if (number(overtimeWins) > 0) {
        parts.push(
          `${formatInteger(overtimeWins, "0")} ÖV`
        );
      }
  
      parts.push(
        `${formatInteger(losses, "0")} F`
      );
  
      if (number(overtimeLosses) > 0) {
        parts.push(
          `${formatInteger(overtimeLosses, "0")} ÖF`
        );
      }
  
      return parts.join(" · ");
    }
  
  
    function playoffBadgeClass(code) {
      const normalized = String(code || "")
        .trim()
        .toUpperCase();
  
      if (normalized === "CHAMPION") {
        return "champion";
      }
  
      if (normalized === "RUNNER_UP") {
        return "runner-up";
      }
  
      if (normalized === "THIRD_PLACE") {
        return "third-place";
      }
  
      if (normalized === "FOURTH_PLACE") {
        return "fourth-place";
      }
  
      if (normalized === "MISSED_PLAYOFFS") {
        return "missed";
      }
  
      if (normalized === "FINALIST_UNDECIDED") {
        return "ongoing";
      }
  
      return "round";
    }
  
  
    function playoffSeriesRecord(tournament) {
      if (
        tournament.playoffSeriesWon === null &&
        tournament.playoffSeriesLost === null
      ) {
        return "";
      }
  
      return (
        `${formatInteger(
          tournament.playoffSeriesWon,
          "0"
        )}–${formatInteger(
          tournament.playoffSeriesLost,
          "0"
        )}`
      );
    }
  
  
    function finalSeriesRecord(tournament) {
      if (
        tournament.finalTeamGameWins === null ||
        tournament.finalOpponentGameWins === null
      ) {
        return "";
      }
  
      return (
        `${formatInteger(
          tournament.finalTeamGameWins,
          "0"
        )}–${formatInteger(
          tournament.finalOpponentGameWins,
          "0"
        )}`
      );
    }
  
  
    function formatInteger(value, fallback = "–") {
      if (value === null || value === undefined || value === "") {
        return fallback;
      }
  
      return Number(value).toLocaleString("sv-SE");
    }
  
    function formatSignedInteger(value, fallback = "–") {
      if (value === null || value === undefined || value === "") {
        return fallback;
      }
  
      const numeric = Number(value);
  
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
  
      return numeric > 0
        ? `+${numeric.toLocaleString("sv-SE")}`
        : numeric.toLocaleString("sv-SE");
    }
  
    function formatDate(value) {
      if (!value) {
        return "";
      }
  
      const normalized = String(value).slice(0, 10);
      const date = new Date(`${normalized}T00:00:00`);
  
      if (Number.isNaN(date.getTime())) {
        return normalized;
      }
  
      return new Intl.DateTimeFormat("sv-SE").format(date);
    }
  
    function formatPeriod(
      startValue,
      endValue
    ) {
      const start = formatDate(startValue);
      const end = formatDate(endValue);
  
      if (start && end && start !== end) {
        return `${start} – ${end}`;
      }
  
      return start || end || "";
    }
  
  
    function validDateValues(values) {
      return values
        .filter(Boolean)
        .map((value) => ({
          value,
          timestamp: dateValue(value)
        }))
        .filter((item) => item.timestamp > 0);
    }
  
  
    function teamHistoryPeriod() {
      const starts = validDateValues(
        state.tournaments.flatMap(
          (tournament) => [
            tournament.startDate,
            tournament.registeredAt,
            tournament.registeredForLeague
          ]
        )
      );
  
      const ends = validDateValues(
        state.tournaments.flatMap(
          (tournament) => [
            tournament.endDate,
            tournament.startDate,
            tournament.registeredAt
          ]
        )
      );
  
      const earliest = starts.length
        ? starts.reduce(
            (best, item) =>
              item.timestamp < best.timestamp
                ? item
                : best
          ).value
        : state.team.firstRegisteredAt;
  
      const latest = ends.length
        ? ends.reduce(
            (best, item) =>
              item.timestamp > best.timestamp
                ? item
                : best
          ).value
        : state.team.lastRegisteredAt;
  
      return formatPeriod(earliest, latest);
    }
  
  
    function dateValue(value) {
      if (!value) {
        return 0;
      }
  
      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }
  
    function initials(name) {
      const words = String(name || "")
        .replace(/\([^)]*\)/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
  
      if (!words.length) {
        return "EH";
      }
  
      return words
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
    }
  
    function normalizeLocalPortraitPath(value) {
      const raw = String(value || "").trim();
      if (!raw) return "";

      const localMatch = raw.match(/(?:^|\/)(?:players\/)?(\d+)(?:\.(?:png|jpe?g|webp))?(?:[?#].*)?$/i);
      if (localMatch) return `players/${localMatch[1]}.png`;

      const remoteMatch = raw.match(/\/players\/(\d+)(?:[/?#]|$)/i);
      if (remoteMatch) return `players/${remoteMatch[1]}.png`;

      return /^players\/.+\.png(?:[?#].*)?$/i.test(raw) ? raw : "";
    }

    function localPlayerImageUrl(player) {
      const sportsGamerId = String(player.sportsGamerPlayerUrl || "")
        .match(/\/players\/(\d+)/i)?.[1];
      const localImage = normalizeLocalPortraitPath(player.playerImage);
      return SEH_playerImageUrl(sportsGamerId, localImage);
    }
  
    function playerPageUrl(playerKey, gamertag = "") {
      return SEH_playerProfileUrl(
        playerKey,
        gamertag,
        state.team?.teamId || null
      );
    }
  
    function tournamentPageUrl(tournament) {
      return `#/lag/${encodeURIComponent(tournament.teamId)}/turnering/${encodeURIComponent(tournament.leagueId)}`;
    }
  
    function fullTournamentPageUrl(tournament) {
      return `#/turnering/${encodeURIComponent(tournament.leagueId)}`;
    }
  
    function countryFlag(code) {
      const normalized = String(code || "").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalized)) {
        return "🌐";
      }
      return String.fromCodePoint(
        ...[...normalized].map((letter) => 127397 + letter.charCodeAt(0))
      );
    }
  
    function normalizedSeasonLabel(
      value,
      competitionCode = "",
      leagueName = "",
      seasonNumber = ""
    ) {
      const raw = String(
        value || leagueName || seasonNumber || ""
      ).trim();
  
      if (!raw) {
        return "Okänd säsong";
      }
  
      if (String(competitionCode).trim().toUpperCase() === "SEC") {
        if (/^SEC(?:\s|$)/i.test(raw)) {
          return raw.replace(/^sec/i, "SEC");
        }
  
        if (/^\d+(?:\.\d+)?(?:\s+Challenger)?$/i.test(raw)) {
          return `SEC ${raw}`;
        }
      }
  
      return raw;
    }
  
    function validChronologyDate(value) {
      if (!value) {
        return 0;
      }
  
      const text = String(value).slice(0, 10);
      const year = Number(text.slice(0, 4));
      if (!Number.isInteger(year) || year < 1980 || year > 2099) {
        return 0;
      }
  
      const timestamp = Date.parse(`${text}T00:00:00`);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }
  
    function tournamentChronologyValue(tournament) {
      const chronology = validChronologyDate(tournament.chronologyDate);
      if (chronology) return chronology;
  
      return (
        validChronologyDate(tournament.endDate) ||
        validChronologyDate(tournament.sortDate) ||
        validChronologyDate(tournament.startDate) ||
        validChronologyDate(tournament.registeredAt) ||
        validChronologyDate(tournament.registeredForLeague)
      );
    }
  
    function compareTournamentsByDateDescending(a, b) {
      return (
        tournamentChronologyValue(b) -
          tournamentChronologyValue(a) ||
        Number(b.leagueId || 0) - Number(a.leagueId || 0) ||
        normalizedSeasonLabel(
          b.seasonLabel,
          b.competitionCode,
          b.leagueName,
          b.seasonNumber
        ).localeCompare(
          normalizedSeasonLabel(
            a.seasonLabel,
            a.competitionCode,
            a.leagueName,
            a.seasonNumber
          ),
          "sv-SE",
          { numeric: true }
        )
      );
    }
  
    function tournamentIdentity(tournament) {
      return [tournament.teamId, tournament.leagueId].join("|");
    }
  
    function tournamentCompletenessScore(tournament) {
      const effectiveGames = Math.max(
        number(tournament.gamesPlayed),
        number(tournament.regularGames) + number(tournament.playoffGames)
      );
      return (
        (tournament.hasStatistics ? 100000000 : 0) +
        effectiveGames * 10000 +
        number(tournament.playoffGames) * 100 +
        number(tournament.tablePoints)
      );
    }
  
    function dedupeTeamTournaments(tournaments) {
      const map = new Map();
      tournaments.forEach((tournament) => {
        const key = tournamentIdentity(tournament);
        const current = map.get(key);
        if (!current || tournamentCompletenessScore(tournament) > tournamentCompletenessScore(current)) {
          map.set(key, tournament);
        }
      });
      return [...map.values()].sort(compareTournamentsByDateDescending);
    }
  
    function compactSeasonLabel(tournament) {
      /*
       * Samma namnkälla som spelarprofilens "Alla turneringar":
       * catalogDisplayName är förstahandsval när ligakatalogen har ett namn.
       */
      const catalogLabel = String(tournament.catalogDisplayName || "").trim();
      if (catalogLabel) {
        return catalogLabel;
      }

      const raw = normalizedSeasonLabel(
        tournament.seasonLabel,
        tournament.competitionCode,
        tournament.leagueName,
        tournament.seasonNumber
      );

      let label = SEH_tableSeasonLabel(raw);

      // Reserv för äldre rader som ännu saknar katalogens display_name.
      label = label
        .replace(/^ECL\s*[-–—:]?\s*Season\s*([0-9]+(?:\.[0-9]+)?)/i, "ECL $1")
        .replace(/^FCL\s*[-–—:]?\s*Season\s*([0-9]+(?:\.[0-9]+)?)/i, "FCL $1")
        .replace(/^SCL\s*[-–—:]?\s*Season\s*([0-9]+(?:\.[0-9]+)?)/i, "SCL $1")
        .replace(/^GCL\s*[-–—:]?\s*Season\s*([0-9]+(?:\.[0-9]+)?)/i, "GCL $1");

      return label;
    }

    function teamTournamentCompetitionCode(tournament) {
      const explicit = String(tournament.competitionCode || "").trim().toUpperCase();
      const text = [
        tournament.catalogDisplayName,
        tournament.seasonLabel,
        tournament.leagueName,
        tournament.competitionName
      ].filter(Boolean).join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

      // eHSM hör till FCL, aldrig SM.
      if (/(^|[^A-Z0-9])EHSM([^A-Z0-9]|$)/.test(text)) return "FCL";
      if (/EUROPEAN CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])ECL([^A-Z0-9]|$)/.test(text)) return "ECL";
      if (/SWEDISH CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])SCL([^A-Z0-9]|$)/.test(text)) return "SCL";
      if (/FINNISH CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])FCL([^A-Z0-9]|$)/.test(text)) return "FCL";
      if (/GERMAN CHAMPIONSHIP LEAGUE|(^|[^A-Z0-9])GCL([^A-Z0-9]|$)/.test(text)) return "GCL";
      if (/(^|[^A-Z0-9])SEC([^A-Z0-9]|$)/.test(text)) return "SEC";
      if (/(^|[^A-Z0-9])ITHL([^A-Z0-9]|$)/.test(text)) return "ITHL";
      if (/(^|[^A-Z0-9])LGEL([^A-Z0-9]|$)/.test(text)) return "LGEL";
      if (/(^|[^A-Z0-9])E-?SHL([^A-Z0-9]|$)/.test(text)) return "ESHL";
      if (/SM\s*EHOCKEY|EHOCKEY\s*SM|(^|[^A-Z0-9])SM([^A-Z0-9]|$)/.test(text)) return "SM";

      if (explicit && explicit !== "SPORTSGAMER" && explicit !== "ÖVRIGT") return explicit;
      return "ÖVRIGT";
    }

    function seasonCompetitionFilterOptions() {
      const preferredOrder = [
        "ECL", "SEC", "SCL", "FCL", "GCL", "ITHL",
        "ESHL", "LGEL", "SM", "6HL", "RCL", "CSCL", "NACL"
      ];
      const available = new Set(state.tournaments.map(teamTournamentCompetitionCode).filter(Boolean));
      const options = preferredOrder.filter((code) => available.has(code));
      if ([...available].some((code) => !preferredOrder.includes(code))) options.push("ÖVRIGA");
      return options;
    }

    function seasonTournamentMatchesFilter(tournament) {
      if (seasonCompetitionFilter === "ALL") return true;
      const code = teamTournamentCompetitionCode(tournament);
      if (seasonCompetitionFilter === "ÖVRIGA") {
        return !new Set([
          "ECL", "SEC", "SCL", "FCL", "GCL", "ITHL",
          "ESHL", "LGEL", "SM", "6HL", "RCL", "CSCL", "NACL"
        ]).has(code);
      }
      return code === seasonCompetitionFilter;
    }

    function renderSeasonCompetitionFilters() {
      if (!elements.seasonCompetitionFilters) return;
      const options = seasonCompetitionFilterOptions();

      if (seasonCompetitionFilter !== "ALL" && !options.includes(seasonCompetitionFilter)) {
        seasonCompetitionFilter = "ALL";
      }

      elements.seasonCompetitionFilters.replaceChildren();
      [
        { value: "ALL", label: "Alla" },
        ...options.map((code) => ({
          value: code,
          label: code === "ÖVRIGA" ? "Övriga" : code === "ESHL" ? "eSHL" : code
        }))
      ].forEach(({ value, label }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "player-history-filter";
        button.textContent = label;
        button.setAttribute("aria-pressed", seasonCompetitionFilter === value ? "true" : "false");
        if (seasonCompetitionFilter === value) button.classList.add("is-active");
        button.addEventListener("click", () => {
          seasonCompetitionFilter = value;
          renderSeasonCompetitionFilters();
          renderSeasonsTable();
        });
        elements.seasonCompetitionFilters.append(button);
      });
    }
  
    function createApiUrl(view, params) {
      const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
      return `${baseUrl}/rest/v1/${view}?${params.toString()}`;
    }
  
  
    const SUPABASE_RETRY_DELAYS = [0, 700, 1800];
  
    function wait(milliseconds) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });
    }
  
    function isRetryableSupabaseFailure(status, body, error) {
      if (error instanceof TypeError) return true;
      if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  
      const text = String(body || error?.message || "");
      return (
        text.includes('"code":"57014"') ||
        text.includes("statement timeout") ||
        text.includes("canceling statement due to statement timeout") ||
        text.includes("Failed to fetch")
      );
    }
  
    async function fetchSupabaseResponse(url, options, label) {
      let lastError = null;
  
      for (
        let attempt = 0;
        attempt < SUPABASE_RETRY_DELAYS.length;
        attempt += 1
      ) {
        if (SUPABASE_RETRY_DELAYS[attempt] > 0) {
          await wait(SUPABASE_RETRY_DELAYS[attempt]);
        }
  
        try {
          const response = await fetch(url, {
            cache: "no-store",
            ...options
          });
          const body = await response.text();
  
          if (response.ok) {
            return { response, body };
          }
  
          const error = new Error(
            `${label}: Supabase svarade ${response.status}. ${
              body || response.statusText
            }`
          );
  
          if (
            attempt < SUPABASE_RETRY_DELAYS.length - 1 &&
            isRetryableSupabaseFailure(response.status, body, error)
          ) {
            console.warn(
              `${label}: tillfälligt Supabase-fel, försök ${
                attempt + 2
              } av ${SUPABASE_RETRY_DELAYS.length}.`
            );
            lastError = error;
            continue;
          }
  
          return { response, body };
        } catch (error) {
          lastError = error;
  
          if (
            attempt < SUPABASE_RETRY_DELAYS.length - 1 &&
            isRetryableSupabaseFailure(0, "", error)
          ) {
            console.warn(
              `${label}: nätverksfel, försök ${
                attempt + 2
              } av ${SUPABASE_RETRY_DELAYS.length}.`
            );
            continue;
          }
  
          throw error;
        }
      }
  
      throw lastError || new Error(`${label}: hämtningen misslyckades.`);
    }
  
    function parseSupabaseArray(body, label) {
      let data;
  
      try {
        data = body ? JSON.parse(body) : [];
      } catch {
        throw new Error(`${label}: Supabase returnerade ogiltig JSON.`);
      }
  
      if (!Array.isArray(data)) {
        throw new Error(`${label}: Supabase returnerade ett oväntat svar.`);
      }
  
      return data;
    }
  
    async function fetchJson(view, params) {
      const { response, body } = await fetchSupabaseResponse(
        createApiUrl(view, params),
        {
          headers: {
            apikey: config.supabasePublishableKey.trim(),
            Accept: "application/json"
          }
        },
        view
      );
  
      if (!response.ok) {
        if (
          response.status === 404 ||
          body.includes("v_local_team_tournaments") ||
          body.includes("v_local_team_tournament_players")
        ) {
          throw new Error(
            "En nödvändig Supabase-vy saknas."
          );
        }
  
        throw new Error(
          `${view}: Supabase svarade ${response.status}. ${
            body || response.statusText
          }`
        );
      }
  
      return parseSupabaseArray(body, view);
    }
  
  
    async function fetchRpcJson(functionName, payload) {
      const url = `${
        config.supabaseUrl.replace(/\/+$/, "")
      }/rest/v1/rpc/${functionName}`;
  
      const { response, body } = await fetchSupabaseResponse(
        url,
        {
          method: "POST",
          headers: {
            apikey: config.supabasePublishableKey.trim(),
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        },
        functionName
      );
  
      if (!response.ok) {
        throw new Error(
          `${functionName}: Supabase svarade ${response.status}. ${
            body || response.statusText
          }`
        );
      }
  
      return parseSupabaseArray(body, functionName);
    }
  
  
    async function fetchTeam(teamId) {
      const params = new URLSearchParams({
        select: "*",
        team_id: `eq.${teamId}`,
        effective_country: "eq.SE",
        limit: "1"
      });
  
      const rows = await fetchJson("v_local_team_list", params);
      return rows[0] ? normalizeTeam(rows[0]) : null;
    }
  
    let teamLeagueDisplayNameMapPromise = null;

    async function fetchTeamLeagueDisplayNameMap() {
      if (!teamLeagueDisplayNameMapPromise) {
        const params = new URLSearchParams({
          select: "league_id,display_name",
          limit: "5000"
        });

        teamLeagueDisplayNameMapPromise = fetchJson(
          "v_ehockey_league_catalog_v1",
          params
        )
          .then((rows) => new Map(
            rows.map((row) => [
              Number(row.league_id),
              String(row.display_name || "").trim()
            ])
          ))
          .catch((error) => {
            teamLeagueDisplayNameMapPromise = null;
            throw error;
          });
      }

      return teamLeagueDisplayNameMapPromise;
    }

    async function addTeamLeagueDisplayNames(rows) {
      try {
        const displayNames = await fetchTeamLeagueDisplayNameMap();
        return rows.map((row) => ({
          ...row,
          catalog_display_name:
            displayNames.get(Number(row.league_id)) || row.catalog_display_name || ""
        }));
      } catch (error) {
        console.warn(
          `${APP_BUILD}: kunde inte hämta standardiserade turneringsnamn för lagsidan; använder befintliga namn som reserv.`,
          error
        );
        return rows;
      }
    }


    function fallbackCanonicalTeamKey(teamName) {
      const normalized = String(teamName || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv-SE")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return normalized ? `name:${normalized}` : "";
    }

    async function resolveCanonicalTeamIdentity(team) {
      const currentName = String(team?.currentName || "").trim();
      const fallbackKey = fallbackCanonicalTeamKey(currentName);

      if (!currentName) {
        return {
          canonicalTeamKey: fallbackKey,
          canonicalDisplayName: currentName
        };
      }

      const params = new URLSearchParams({
        select: "canonical_team_key,canonical_display_name,alias_name",
        alias_name: `eq.${currentName}`,
        limit: "1"
      });

      try {
        const rows = await fetchJson("ehockey_team_name_aliases", params);
        const match = rows[0];

        if (match?.canonical_team_key) {
          return {
            canonicalTeamKey: String(match.canonical_team_key),
            canonicalDisplayName:
              String(match.canonical_display_name || currentName)
          };
        }
      } catch (error) {
        console.warn(
          `${APP_BUILD}: kunde inte läsa ehockey_team_name_aliases; använder namnnyckel som reserv.`,
          error
        );
      }

      return {
        canonicalTeamKey: fallbackKey,
        canonicalDisplayName: currentName
      };
    }


    async function fetchTournaments(team) {
      /*
       * V69:
       * Laghistoriken styrs nu av NAMNET SOM ANVÄNDES I TURNERINGEN.
       *
       * Supabase source of truth:
       *   ehockey_team_name_aliases
       *   v_ehockey_team_tournaments_by_name_dedup
       *
       * team_id och SportsGamer-ID får alltså återanvändas efter namnbyte
       * utan att den gamla klubbhistoriken automatiskt följer med.
       */
      const identity = await resolveCanonicalTeamIdentity(team);

      if (!identity.canonicalTeamKey) {
        return [];
      }

      const params = new URLSearchParams({
        select: "*",
        canonical_team_key: `eq.${identity.canonicalTeamKey}`,
        limit: "5000"
      });

      const rows = await fetchJson(
        "v_ehockey_team_tournaments_by_name_dedup",
        params
      );

      const namedRows = await addTeamLeagueDisplayNames(rows);

      return dedupeTeamTournaments(
        namedRows.map((row) =>
          normalizeTournament({
            ...row,
            // Vyns explicita turneringsnamn ska alltid vinna.
            name_used_in_tournament:
              row.tournament_team_name ||
              row.name_used_in_tournament ||
              row.current_name
          })
        )
      );
    }


    async function fetchAllTimePlayers(teamId) {
      const params = new URLSearchParams({
        select: "*",
        team_id: `eq.${teamId}`,
        order: "career_games.desc,total_points.desc,display_gamertag.asc",
        limit: "1000"
      });
  
      const rows = await fetchJson(
        "v_ehockey_team_all_time_players_chronological",
        params
      );
  
      return rows.map(normalizeAllTimePlayer);
    }
  
    function teamNameKey(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv")
        .replace(/[^a-z0-9]+/g, "");
    }
  
    async function fetchUnlinkedTeamPlayers(team) {
      /*
       * Kompletterande historiska spelarposter.
       *
       * v_ehockey_player_tournaments_chronological är en tung historikvy
       * och kan ibland nå Supabase statement_timeout (57014).
       * Dessa rader är ENDAST ett komplement till den vanliga all-time-
       * spelarlistan och får därför aldrig göra att hela lagprofilen kraschar.
       */
      const names = [
        team.currentName,
        ...team.historicalNames,
        ...team.leagueNames
      ].filter(Boolean);

      const uniqueNames = [...new Map(
        names.map((name) => [teamNameKey(name), name])
      ).values()];

      const rows = new Map();

      for (const name of uniqueNames) {
        const params = new URLSearchParams({
          select: [
            "player_key",
            "display_gamertag",
            "player_country",
            "player_image",
            "sports_gamer_player_url",
            "primary_position",
            "league_id",
            "competition_code",
            "competition_name",
            "season_label",
            "division",
            "team_id",
            "team_external_id",
            "team_name_in_tournament",
            "team_current_name",
            "chronology_date",
            "end_date",
            "start_date",
            "is_goalie_only",
            "total_skater_games",
            "total_goals",
            "total_assists",
            "total_points",
            "total_plus_minus",
            "total_penalty_minutes",
            "total_goalie_games",
            "total_goalie_wins",
            "total_goalie_losses",
            "total_goalie_overtime_losses",
            "total_goalie_saves",
            "total_goalie_shots_against",
            "total_goalie_goals_allowed",
            "total_goalie_shutouts"
          ].join(","),
          team_id: "is.null",
          team_name_in_tournament: `eq.${name}`,
          limit: "1000"
        });

        try {
          const page = await fetchJson(
            "v_ehockey_player_tournaments_chronological",
            params
          );

          page.forEach((row) => {
            const key = [
              row.player_key,
              row.league_id,
              teamNameKey(row.team_name_in_tournament)
            ].join(":");
            rows.set(key, row);
          });
        } catch (error) {
          const message = String(error?.message || error || "").toLowerCase();

          if (
            message.includes("57014") ||
            message.includes("statement timeout") ||
            message.includes("canceling statement due to statement timeout")
          ) {
            console.warn(
              `${APP_BUILD}: kompletterande spelhistorik för "${name}" timeoutade och hoppas över.`,
              error
            );
            continue;
          }

          /*
           * Även andra fel i just den kompletterande historikvyn ska inte
           * blockera hela lagprofilen. Den primära spelarlistan kommer från
           * v_ehockey_team_all_time_players_chronological.
           */
          console.warn(
            `${APP_BUILD}: kompletterande spelhistorik för "${name}" kunde inte hämtas och hoppas över.`,
            error
          );
        }
      }

      return [...rows.values()];
    }

    function aggregateUnlinkedTeamPlayers(rows) {
      const groups = new Map();
      rows.forEach((row) => {
        const key = String(row.player_key || "").trim();
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      });
  
      return [...groups.entries()].map(([playerKey, playerRows]) => {
        const latest = [...playerRows].sort((a, b) =>
          String(b.chronology_date || b.end_date || b.start_date || "")
            .localeCompare(String(a.chronology_date || a.end_date || a.start_date || ""))
        )[0];
        const sum = (field) => playerRows.reduce(
          (total, row) => total + number(row[field]), 0
        );
        const skaterGames = playerRows.reduce((total, row) => {
          const goalieOnly = row.is_goalie_only === true || row.is_goalie_only === "true";
          return total + (goalieOnly ? 0 : number(row.total_skater_games));
        }, 0);
        const goalieGames = sum("total_goalie_games");
        const goalieSaves = sum("total_goalie_saves");
        const goalieGoalsAllowed = sum("total_goalie_goals_allowed");
        const reportedGoalieShots = sum("total_goalie_shots_against");
        const derivedGoalieShots = goalieSaves + goalieGoalsAllowed;
        const goalieShots = derivedGoalieShots > 0
          ? derivedGoalieShots
          : reportedGoalieShots;
        const competitions = uniqueValues(playerRows.map((row) =>
          row.competition_code || row.competition_name ||
          String(row.season_label || "").split(/\s+/)[0]
        ));
        const divisions = uniqueValues(playerRows.map((row) => row.division));
        const sportsGamerPlayerUrl = latest.sports_gamer_player_url ||
          playerRows.find((row) => row.sports_gamer_player_url)?.sports_gamer_player_url || "";
        const playerImage = latest.player_image ||
          playerRows.find((row) => row.player_image)?.player_image || "";
  
        return {
          playerKey,
          displayGamertag: latest.display_gamertag || "Okänd spelare",
          playerCountry: String(latest.player_country || "").trim().toUpperCase(),
          playerImage,
          sportsGamerPlayerUrl,
          primaryPosition: latest.primary_position || "",
          latestSeason: latest.season_label || "",
          latestDivision: latest.division || "",
          tournamentCount: new Set(playerRows.map((row) => row.league_id)).size,
          competitionCount: competitions.length,
          competitions,
          divisions,
          totalSkaterGames: skaterGames,
          totalGoals: sum("total_goals"),
          totalAssists: sum("total_assists"),
          totalPoints: sum("total_points"),
          totalPlusMinus: sum("total_plus_minus"),
          totalPenaltyMinutes: sum("total_penalty_minutes"),
          totalGoalieGames: goalieGames,
          totalGoalieWins: sum("total_goalie_wins"),
          totalGoalieLosses: sum("total_goalie_losses"),
          totalGoalieOvertimeLosses: sum("total_goalie_overtime_losses"),
          totalGoalieSaves: goalieSaves,
          totalGoalieShotsAgainst: goalieShots,
          totalGoalieGoalsAllowed: goalieGoalsAllowed,
          totalGoalieSavePercentage: goalieShots ? goalieSaves / goalieShots : null,
          totalGoalieGoalsAgainstAverage: goalieGames
            ? goalieGoalsAllowed / goalieGames : null,
          totalGoalieShutouts: sum("total_goalie_shutouts"),
          careerGames: playerRows.reduce((total, row) => total + Math.max(
            number(row.total_skater_games), number(row.total_goalie_games)
          ), 0),
          playerType: goalieGames > skaterGames ? "goalie" : "skater",
          lastAppearanceDate:
            latest.chronology_date || latest.end_date || latest.start_date || ""
        };
      });
    }
  
    function mergeAllTimePlayers(linkedPlayers, unlinkedRows) {
      const merged = new Map(linkedPlayers.map((player) => [
        player.playerKey, player
      ]));
  
      aggregateUnlinkedTeamPlayers(unlinkedRows).forEach((extra) => {
        const current = merged.get(extra.playerKey);
        if (!current) merged.set(extra.playerKey, extra);
      });
  
      return [...merged.values()].sort(comparePlayers);
    }
  
    function mergeUnlinkedPlayerCounts(playerCounts, rows) {
      const keysByLeague = new Map();
      rows.forEach((row) => {
        const leagueId = number(row.league_id);
        const playerKey = String(row.player_key || "").trim();
        if (!leagueId || !playerKey) return;
        if (!keysByLeague.has(leagueId)) keysByLeague.set(leagueId, new Set());
        keysByLeague.get(leagueId).add(playerKey);
      });
      keysByLeague.forEach((keys, leagueId) => {
        playerCounts.set(
          leagueId,
          Math.max(number(playerCounts.get(leagueId)), keys.size)
        );
      });
      return playerCounts;
    }
  
  
    async function fetchPlayerCounts(team) {
      /*
       * V70:
       * Spelarantal följer samma namn-/aliasmodell som laghistoriken.
       *
       * Det här är viktigt när ett SportsGamer-ID eller tekniskt team_id
       * har återanvänts efter namnbyte. Supabase-vyn avgör då vilken
       * teknisk team_id som ska användas som källa för spelarantalet i
       * just den turneringen.
       */
      const identity = await resolveCanonicalTeamIdentity(team);

      if (!identity.canonicalTeamKey) {
        return new Map();
      }

      const params = new URLSearchParams({
        select: "league_id,player_count",
        canonical_team_key: `eq.${identity.canonicalTeamKey}`,
        limit: "5000"
      });

      try {
        const rows = await fetchJson(
          "v_ehockey_team_tournament_player_counts_by_name",
          params
        );

        return new Map(
          rows.map((row) => [
            Number(row.league_id),
            number(row.player_count)
          ])
        );
      } catch (error) {
        const message = String(error?.message || error || "").toLowerCase();

        if (
          message.includes("57014") ||
          message.includes("statement timeout") ||
          message.includes("canceling statement")
        ) {
          console.warn(
            `${APP_BUILD}: spelarantal per säsong timeoutade; lagsidan fortsätter utan spelarantal.`,
            error
          );
          return new Map();
        }

        throw error;
      }
    }


    function uniqueValues(values) {
      return [...new Set(values.filter(Boolean))];
    }
  
    function renderChipValues(element, values, emptyText) {
      element.replaceChildren();
  
      const unique = uniqueValues(values);
  
      if (!unique.length) {
        const empty = document.createElement("span");
        empty.className = "empty-value";
        empty.textContent = emptyText;
        element.append(empty);
        return;
      }
  
      const list = document.createElement("span");
      list.className = "chip-list";
  
      for (const value of unique) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = value;
        list.append(chip);
      }
  
      element.append(list);
    }
  
    function renderProfileAvatar(team) {
      SEH_renderTeamLogo(
        elements.teamProfileAvatar,
        [team.logoUrl, team.logoPath],
        team.currentName,
        `${team.currentName} logotyp`
      );

      const hero = elements.teamPage?.querySelector(".history-hero");
      if (!hero) return;

      let watermark = hero.querySelector(".history-hero-watermark-v1279");
      if (!watermark) {
        watermark = document.createElement("div");
        watermark.className = "history-hero-watermark-v1279";
        watermark.setAttribute("aria-hidden", "true");
        hero.prepend(watermark);
      }

      SEH_renderTeamLogo(
        watermark,
        [team.logoUrl, team.logoPath],
        team.currentName,
        ""
      );
      SEH_hydratePlayerCardTeamPalette(elements.teamPage, watermark, team.currentName);
    }

    function renderTeamLinks(team) {
      elements.teamLinks.replaceChildren();
  
      if (team.profileUrl) {
        const link = document.createElement("a");
        link.className = "profile-action-link";
        link.href = team.profileUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Öppna extern lagprofil";
        elements.teamLinks.append(link);
      }
    }
  
    function renderHistoryBadges() {
      elements.historyBadges.replaceChildren();

      const eligible = state.tournaments.filter(isHonourEligibleTournament);
      const placeWeight = { gold: 0, silver: 1, bronze: 2 };
      const honours = eligible
        .map((row) => {
          const code = String(row.playoffStatusCode || "").toUpperCase();
          if (code === "CHAMPION") {
            return { row, place: "gold", label: "Mästare" };
          }
          if (["RUNNER_UP", "FINALIST_UNDECIDED"].includes(code)) {
            return { row, place: "silver", label: "Silver" };
          }
          if (code === "THIRD_PLACE") {
            return { row, place: "bronze", label: "Brons" };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) =>
          placeWeight[a.place] - placeWeight[b.place] ||
          tournamentChronologyValue(a.row) - tournamentChronologyValue(b.row) ||
          Number(a.row.leagueId || 0) - Number(b.row.leagueId || 0)
        );

      elements.historyBadges.hidden = honours.length === 0;
      if (!honours.length) return;

      const heading = document.createElement("span");
      heading.className = "history-badges-label-v1284";
      heading.textContent = "Meriter";
      elements.historyBadges.append(heading);

      const visible = honours.slice(0, 3);
      visible.forEach(({ row, place, label }) => {
        const badge = document.createElement("span");
        badge.className = `history-badge history-badge--${place}`;

        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        icon.classList.add("history-badge-icon-v1284");
        icon.innerHTML = [
          '<path d="M8 4h8v4c0 3-1.8 5-4 5s-4-2-4-5V4Z"/>',
          '<path d="M8 6H5v1c0 2 1.2 3 3.1 3M16 6h3v1c0 2-1.2 3-3.1 3"/>',
          '<path d="M12 13v4M9 20h6M10 17h4v3h-4Z"/>'
        ].join("");

        const text = document.createElement("small");
        text.textContent = `${cleanHonourDisplayText(compactSeasonLabel(row))} ${label}`;
        badge.append(icon, text);
        elements.historyBadges.append(badge);
      });

      if (honours.length > visible.length) {
        const more = document.createElement("span");
        more.className = "history-badges-more-v1284";
        more.textContent = `+${honours.length - visible.length}`;
        elements.historyBadges.append(more);
      }
    }

  
  
    function renderHeroChips() {
      elements.heroChips.replaceChildren();
      const latest = state.tournaments[0];
      const values = [
        latest ? compactSeasonLabel(latest) : "",
        latest?.division ? `Senaste division: ${latest.division}` : "",
        `${state.tournaments.length} säsonger`,
        `${state.allTimePlayers.length} spelare`
      ].filter(Boolean);
  
      values.forEach((value, index) => {
        const chip = document.createElement("span");
        chip.className = index === 0 ? "history-chip history-chip--active" : "history-chip";
        chip.textContent = value;
        elements.heroChips.append(chip);
      });
    }
  
  
    function leaderText(player, value, suffix) {
      if (!player) {
        return "–";
      }
      return `${player.displayGamertag} · ${formatInteger(value, "0")} ${suffix}`;
    }
  
  
    function renderProfileText() {
      const games = sumKnown(state.tournaments, effectiveGames) || 0;
      const wins = sumKnown(state.tournaments, (row) => row.wins) || 0;
      const losses = sumKnown(state.tournaments, (row) => row.losses) || 0;
      const latest = state.tournaments[0];
      const best = bestEclTournament();
      const first = [...state.tournaments].sort(
        (a, b) =>
          tournamentChronologyValue(a) -
          tournamentChronologyValue(b) ||
          Number(a.leagueId || 0) - Number(b.leagueId || 0)
      )[0];
      const winRate = games > 0
        ? ((wins / games) * 100).toLocaleString("sv-SE", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })
        : "0,0";

      const latestGames = latest ? effectiveGames(latest) : null;
      const latestStatusCode = String(latest?.playoffStatusCode || "")
        .trim()
        .toUpperCase();

      let latestResultText = "";
      if (latestStatusCode === "MISSED_PLAYOFFS") {
        latestResultText = " och missade slutspel";
      } else if (latestStatusCode === "CHAMPION") {
        latestResultText = " och blev mästare";
      } else if (latestStatusCode === "RUNNER_UP") {
        latestResultText = " och slutade tvåa";
      } else if (latestStatusCode === "THIRD_PLACE") {
        latestResultText = " och slutade trea";
      } else if (latestStatusCode === "FOURTH_PLACE") {
        latestResultText = " och slutade fyra";
      } else if (latest && isPlayoffAppearance(latest)) {
        latestResultText = " och nådde slutspel";
      }

      const latestNameText = latest && latest.nameUsed && latest.nameUsed !== state.team.currentName
        ? ` under namnet ${latest.nameUsed}`
        : "";

      const champions = state.tournaments
        .filter((row) =>
          isHonourEligibleTournament(row) &&
          String(row.playoffStatusCode || "").toUpperCase() === "CHAMPION"
        )
        .sort((a, b) =>
          tournamentChronologyValue(a) - tournamentChronologyValue(b) ||
          Number(a.leagueId || 0) - Number(b.leagueId || 0)
        );

      const runnerUps = state.tournaments
        .filter((row) =>
          isHonourEligibleTournament(row) &&
          ["RUNNER_UP", "FINALIST_UNDECIDED"].includes(
            String(row.playoffStatusCode || "").toUpperCase()
          )
        )
        .sort((a, b) =>
          tournamentChronologyValue(a) - tournamentChronologyValue(b) ||
          Number(a.leagueId || 0) - Number(b.leagueId || 0)
        );

      const bronze = state.tournaments
        .filter((row) =>
          isHonourEligibleTournament(row) &&
          String(row.playoffStatusCode || "").toUpperCase() === "THIRD_PLACE"
        )
        .sort((a, b) =>
          tournamentChronologyValue(a) - tournamentChronologyValue(b) ||
          Number(a.leagueId || 0) - Number(b.leagueId || 0)
        );

      function swedishList(values) {
        if (!values.length) return "";
        if (values.length === 1) return values[0];
        if (values.length === 2) return `${values[0]} och ${values[1]}`;
        return `${values.slice(0, -1).join(", ")} och ${values[values.length - 1]}`;
      }

      function possessiveTeamName(name) {
        const trimmed = String(name || "").trim();
        if (!trimmed) return "Lagets";
        return /[sxz]$/i.test(trimmed) ? trimmed : `${trimmed}s`;
      }

      const paragraphs = [];

      paragraphs.push(
        `${state.team.currentName} har deltagit i ${state.tournaments.length.toLocaleString("sv-SE")} registrerade turneringar och spelat totalt ${formatInteger(games, "0")} matcher. ` +
        `Av dessa matcher har laget vunnit ${formatInteger(wins, "0")} och förlorat ${formatInteger(losses, "0")}, vilket motsvarar en segerprocent på ${winRate} %.` +
        (first ? ` Den första registrerade turneringen var ${compactSeasonLabel(first)}.` : "")
      );

      if (latest || best) {
        const latestSentence = latest
          ? `Senast spelade ${state.team.currentName}${latestNameText} i ${compactSeasonLabel(latest)}` +
            (latestGames !== null
              ? `, där laget spelade ${formatInteger(latestGames, "0")} matcher${latestResultText}.`
              : `${latestResultText}.`)
          : "";
        const bestSentence = best
          ? `Den högsta registrerade ECL-nivån är ${best.division}.`
          : "";
        paragraphs.push([latestSentence, bestSentence].filter(Boolean).join(" "));
      }

      let meritSentence = "";
      if (champions.length) {
        const titles = swedishList(
          champions.map((row) => cleanHonourDisplayText(compactSeasonLabel(row)))
        );
        meritSentence = champions.length === 1
          ? `${possessiveTeamName(state.team.currentName)} främsta merit är mästartiteln i ${titles}.`
          : `${possessiveTeamName(state.team.currentName)} främsta meriter är mästartitlarna i ${titles}.`;
      } else if (runnerUps.length) {
        const titles = swedishList(
          runnerUps.map((row) => cleanHonourDisplayText(compactSeasonLabel(row)))
        );
        meritSentence = runnerUps.length === 1
          ? `${possessiveTeamName(state.team.currentName)} främsta merit är silverplatsen i ${titles}.`
          : `${possessiveTeamName(state.team.currentName)} främsta meriter är silverplatserna i ${titles}.`;
      } else if (bronze.length) {
        const titles = swedishList(
          bronze.map((row) => cleanHonourDisplayText(compactSeasonLabel(row)))
        );
        meritSentence = bronze.length === 1
          ? `${possessiveTeamName(state.team.currentName)} främsta merit är bronsplatsen i ${titles}.`
          : `${possessiveTeamName(state.team.currentName)} främsta meriter är bronsplatserna i ${titles}.`;
      }

      if (meritSentence) {
        paragraphs.push(meritSentence);
      }

      elements.clubProfileText.replaceChildren();
      for (const text of paragraphs.filter(Boolean)) {
        const paragraph = document.createElement("span");
        paragraph.className = "history-profile-paragraph-v1282";
        paragraph.textContent = text;
        elements.clubProfileText.append(paragraph);
      }
    }
  
  
    function renderLeaders() {
      const byGames = [...state.allTimePlayers].sort(
        (a, b) => b.careerGames - a.careerGames || b.totalPoints - a.totalPoints
      )[0];
      const byPoints = [...state.allTimePlayers]
        .filter((player) => player.totalSkaterGames > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints || b.totalSkaterGames - a.totalSkaterGames)[0];
      const bestGoalie = [...state.allTimePlayers]
        .filter((player) => player.totalGoalieGames > 0)
        .sort((a, b) =>
          (b.totalGoalieSavePercentage ?? -1) - (a.totalGoalieSavePercentage ?? -1) ||
          b.totalGoalieGames - a.totalGoalieGames
        )[0];
  
      elements.leaderMatches.textContent = leaderText(byGames, byGames?.careerGames, "GP");
      elements.leaderPoints.textContent = leaderText(byPoints, byPoints?.totalPoints, "PTS");
      elements.leaderGoalie.textContent = bestGoalie
        ? `${bestGoalie.displayGamertag} · ${formatSavePercentage(bestGoalie.totalGoalieSavePercentage)}`
        : "–";
    }
  
  
    function eclDivisionTournaments() {
      const excludedWords = [
        "qualifier", "wildcard", "crossover", "registration", "free agent"
      ];
  
      return state.tournaments
        .filter((tournament) => {
          if (String(tournament.competitionCode).toUpperCase() !== "ECL") {
            return false;
          }
          const text = `${tournament.leagueName} ${tournament.seasonLabel}`.toLowerCase();
          return !excludedWords.some((word) => text.includes(word)) &&
            ["Elite", "Pro", "Lite", "Core", "Neo"].includes(tournament.division);
        })
        .sort((a, b) =>
          tournamentChronologyValue(a) -
          tournamentChronologyValue(b) ||
          Number(a.leagueId || 0) - Number(b.leagueId || 0)
        );
    }
  
  
    function renderDivisionCurve() {
      const divisions = { Elite: 5, Pro: 4, Lite: 3, Core: 2, Neo: 1 };
      const rows = eclDivisionTournaments();
      const hero = elements.divisionCurve.closest(".history-hero");

      elements.divisionCurve.replaceChildren();
      elements.divisionCurve.classList.toggle("is-single-point", rows.length === 1);
      elements.divisionCurve.classList.toggle("is-short-history", rows.length > 0 && rows.length <= 2);
      hero?.classList.toggle("has-short-division-history", rows.length > 0 && rows.length <= 2);
  
      if (!rows.length) {
        elements.divisionCurve.classList.remove("is-single-point", "is-short-history");
        hero?.classList.remove("has-short-division-history");
        elements.divisionCurve.textContent = "Ingen ECL-divisionshistorik hittades.";
        elements.divisionCurveFirst.textContent = "–";
        elements.divisionCurveLatest.textContent = "–";
        return;
      }
  
      const width = 720;
      const height = 290;
      const left = 76;
      const right = 22;
      const top = 22;
      const bottom = 54;
      const chartWidth = width - left - right;
      const chartHeight = height - top - bottom;
      const visibleRows = rows.length > 12 ? rows.slice(-12) : rows;
  
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Lagets ECL-divisioner över tid");
  
      for (const [division, rank] of Object.entries(divisions)) {
        const y = top + ((5 - rank) / 4) * chartHeight;
        const line = document.createElementNS(svg.namespaceURI, "line");
        line.setAttribute("x1", left);
        line.setAttribute("x2", width - right);
        line.setAttribute("y1", y);
        line.setAttribute("y2", y);
        line.setAttribute("class", "division-grid-line");
        svg.append(line);
  
        const label = document.createElementNS(svg.namespaceURI, "text");
        label.setAttribute("x", 8);
        label.setAttribute("y", y + 5);
        label.setAttribute("class", "division-axis-label");
        label.textContent = division.toUpperCase();
        svg.append(label);
      }
  
      const points = visibleRows.map((row, index) => {
        const x = visibleRows.length === 1
          ? left + chartWidth / 2
          : left + (index / (visibleRows.length - 1)) * chartWidth;
        const rank = divisions[row.division] || 1;
        const y = top + ((5 - rank) / 4) * chartHeight;
        return { x, y, row };
      });
  
      const polyline = document.createElementNS(svg.namespaceURI, "polyline");
      polyline.setAttribute("points", points.map((point) => `${point.x},${point.y}`).join(" "));
      polyline.setAttribute("class", "division-line");
      svg.append(polyline);
  
      for (const point of points) {
        const circle = document.createElementNS(svg.namespaceURI, "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", 5);
        circle.setAttribute("class", "division-point");
        svg.append(circle);
  
        const label = document.createElementNS(svg.namespaceURI, "text");
        label.setAttribute("x", point.x);
        label.setAttribute("y", height - 16);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "division-season-label");
        label.textContent = compactSeasonLabel(point.row).replace(/^ECL\s*/i, "");
        svg.append(label);
      }
  
      elements.divisionCurve.append(svg);
      const first = rows[0];
      const latest = rows[rows.length - 1];
      elements.divisionCurveFirst.textContent = `${compactSeasonLabel(first)}: ${first.division}`;
      elements.divisionCurveLatest.textContent = `${compactSeasonLabel(latest)}: ${latest.division}`;
    }
  
  
    function renderTeamHeader() {
      const team = state.team;
      document.title = `${team.currentName} – eHockey Master`;
      elements.teamName.textContent = team.currentName;
      elements.playersHeading.textContent = "Spelare – all-time";
  
      renderProfileAvatar(team);
      renderTeamLinks(team);
      renderHistoryBadges();
      renderHeroChips();
      renderProfileText();
      renderLeaders();
      renderDivisionCurve();
  
      renderChipValues(elements.sportsGamerIds, team.sportsGamerIds, "Saknas");
      renderChipValues(elements.historicalNames, team.historicalNames, "Inga");
      renderChipValues(elements.leagueNames, team.leagueNames, "Inga avvikande");
    }
  
    function effectiveGames(tournament) {
      if (tournament.gamesPlayed !== null) {
        return tournament.gamesPlayed;
      }
  
      const stages = [
        tournament.regularGames,
        tournament.playoffGames
      ].filter((value) => value !== null);
  
      return stages.length
        ? stages.reduce((sum, value) => sum + value, 0)
        : null;
    }
  
    function effectiveGoalDiff(tournament) {
      if (tournament.goalDiff !== null) {
        return tournament.goalDiff;
      }
  
      if (
        tournament.goalsFor !== null &&
        tournament.goalsAgainst !== null
      ) {
        return tournament.goalsFor - tournament.goalsAgainst;
      }
  
      return null;
    }
  
    function sumKnown(tournaments, getter) {
      let hasKnownValue = false;
      let total = 0;
  
      for (const tournament of tournaments) {
        const value = getter(tournament);
  
        if (value === null || value === undefined) {
          continue;
        }
  
        hasKnownValue = true;
        total += number(value);
      }
  
      return hasKnownValue ? total : null;
    }
  
    function isPlayoffAppearance(tournament) {
      if (
        tournament.playoffStatusCode ===
        "MISSED_PLAYOFFS"
      ) {
        return false;
      }
  
      return (
        tournament.qualifiedForPlayoffs === true ||
        (
          tournament.hasPlayoffResult &&
          Boolean(tournament.playoffRoundCode)
        )
      );
    }
  
  
    function isFinalAppearance(tournament) {
      return [
        "CHAMPION",
        "RUNNER_UP",
        "FINALIST_UNDECIDED"
      ].includes(
        String(
          tournament.playoffStatusCode || ""
        ).toUpperCase()
      );
    }
  
  
    function bestEclTournament() {
      const ranks = { Elite: 5, Pro: 4, Lite: 3, Core: 2, Neo: 1 };
      return [...eclDivisionTournaments()].sort((a, b) => {
        const rankDifference = (ranks[b.division] || 0) - (ranks[a.division] || 0);
        if (rankDifference) {
          return rankDifference;
        }
        const aGames = effectiveGames(a) || 0;
        const bGames = effectiveGames(b) || 0;
        const aRate = aGames ? number(a.wins) / aGames : 0;
        const bRate = bGames ? number(b.wins) / bGames : 0;
        return bRate - aRate || number(b.wins) - number(a.wins) ||
          tournamentChronologyValue(b) - tournamentChronologyValue(a);
      })[0] || null;
    }
  
  
    function bestEclDivision() {
      return bestEclTournament()?.division || "–";
    }
  
  
    function renderSummary() {
      const tournaments = state.tournaments;
      const games = sumKnown(tournaments, effectiveGames) || 0;
      const wins = sumKnown(tournaments, (row) => row.wins) || 0;
      const losses = sumKnown(tournaments, (row) => row.losses) || 0;
      const goalsFor = sumKnown(tournaments, (row) => row.goalsFor) || 0;
      const goalsAgainst = sumKnown(tournaments, (row) => row.goalsAgainst) || 0;
      const goalDiff = goalsFor - goalsAgainst;
      const playoffWins = sumKnown(tournaments, (row) => row.playoffWins) || 0;
      const playoffLosses = sumKnown(tournaments, (row) => row.playoffLosses) || 0;
      const playoffGames = sumKnown(tournaments, (row) => row.playoffGames) || 0;
      const best = bestEclTournament();
      const divisions = uniqueValues(
        eclDivisionTournaments().map((row) => row.division)
      );
  
      elements.tournamentCount.textContent =
        `${tournaments.length.toLocaleString("sv-SE")} säsonger`;
      elements.gamesCount.textContent = formatInteger(games, "0");
      elements.winsCount.textContent = formatInteger(wins, "0");
      elements.winsCompact.textContent = formatInteger(wins, "0");
      elements.lossesCount.textContent = formatInteger(losses, "0");
      elements.winPercentage.textContent = games
        ? `${Math.round((wins / games) * 100)}%`
        : "–";
      elements.goalsRecord.textContent = `${formatInteger(goalsFor, "0")}–${formatInteger(goalsAgainst, "0")}`;
      elements.goalDifference.textContent = formatSignedInteger(goalDiff, "0");
      elements.goalDifference.classList.toggle("positive", goalDiff > 0);
      elements.goalDifference.classList.toggle("negative", goalDiff < 0);
  
      elements.winsMetricNote.textContent =
        `${losses} förluster · ${games ? Math.round((wins / games) * 100) : 0}% vinstgrad · ${playoffGames} slutspelsmatcher`;
  
      elements.bestEclSeason.textContent = best
        ? compactSeasonLabel(best).replace(/^ECL\s*/i, "ECL ")
        : "–";
      elements.bestEclNote.textContent = best
        ? `${formatInteger(best.wins, "0")}–${formatInteger(best.losses, "0")} · ${best.division}`
        : "Ingen ECL-säsong";
  
      elements.bestDivision.textContent = bestEclDivision().toUpperCase();
      elements.divisionMetricNote.textContent =
        `${divisions.length} ECL-divisioner totalt`;
  
      elements.playoffRecord.textContent = `${playoffWins}–${playoffLosses}`;
      elements.playoffMetricNote.textContent = `${playoffGames} matcher`;
    }
  
  
    function honourPriority(tournament) {
      const priorities = {
        CHAMPION: 1,
        RUNNER_UP: 2,
        FINALIST_UNDECIDED: 2,
        THIRD_PLACE: 3
      };
  
      return (
        priorities[
          String(
            tournament.playoffStatusCode || ""
          ).toUpperCase()
        ] || 99
      );
    }
  
  
    function isHonourEligibleTournament(tournament) {
      const text = [
        tournament?.leagueName,
        tournament?.seasonLabel,
        tournament?.division,
        tournament?.competitionName
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("sv-SE");

      const excludedWords = [
        "qualifier",
        "qualification",
        "kval",
        "wildcard",
        "crossover",
        "registration",
        "free agent"
      ];

      return !excludedWords.some((word) => text.includes(word));
    }


    function honourTournaments() {
      const accepted = new Set([
        "CHAMPION",
        "RUNNER_UP",
        "FINALIST_UNDECIDED",
        "THIRD_PLACE"
      ]);
  
      return state.tournaments
        .filter((tournament) =>
          isHonourEligibleTournament(tournament) &&
          accepted.has(
            String(
              tournament.playoffStatusCode || ""
            ).toUpperCase()
          )
        )
        .sort((a, b) => (
          tournamentChronologyValue(b) -
            tournamentChronologyValue(a) ||
          honourPriority(a) -
            honourPriority(b) ||
          seasonTitle(a).localeCompare(
            seasonTitle(b),
            "sv-SE"
          )
        ));
    }
  
  
    function cleanHonourDisplayText(value) {
      return String(value || "")
        .replace(/\s*[–—-]\s*6v6\b/gi, "")
        .replace(/\b6v6\s*[–—-]\s*/gi, "")
        .replace(/\b6v6\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    function honourPlacementLabel(tournament) {
      const code = String(tournament?.playoffStatusCode || "")
        .trim()
        .toUpperCase();

      if (code === "CHAMPION") return "MÄSTARE";
      if (["RUNNER_UP", "FINALIST_UNDECIDED"].includes(code)) return "SILVER";
      if (code === "THIRD_PLACE") return "BRONS";
      return "";
    }


    function honourPlacementNumber(tournament) {
      const code = String(tournament?.playoffStatusCode || "")
        .trim()
        .toUpperCase();
      if (code === "CHAMPION") return "1";
      if (["RUNNER_UP", "FINALIST_UNDECIDED"].includes(code)) return "2";
      if (code === "THIRD_PLACE") return "3";
      return "";
    }


    function createHonourCard(tournament) {
      const article = document.createElement("article");
      article.className =
        `team-honour-card ` +
        `team-honour-card--${playoffBadgeClass(
          tournament.playoffStatusCode
        )}`;

      const status = document.createElement("span");
      status.className = "team-honour-status";
      status.textContent = honourPlacementNumber(tournament);
      status.setAttribute(
        "aria-label",
        honourPlacementLabel(tournament)
      );

      const title = document.createElement("a");
      title.className = "history-honour-link";
      title.href = tournamentPageUrl(tournament);

      const placementLabel = honourPlacementLabel(tournament);
      const cleanTitle = cleanHonourDisplayText(seasonTitle(tournament));
      title.textContent = placementLabel === "MÄSTARE"
        ? `Mästare i ${cleanTitle}`
        : placementLabel === "SILVER"
          ? `Silver i ${cleanTitle}`
          : placementLabel === "BRONS"
            ? `Brons i ${cleanTitle}`
            : cleanTitle;

      const meta = document.createElement("small");
      const finalRecord = finalSeriesRecord(tournament);

      meta.textContent = [
        cleanHonourDisplayText(competitionLabel(tournament)),
        /^6v6$/i.test(String(tournament.division || "").trim())
          ? ""
          : cleanHonourDisplayText(tournament.division),
        finalRecord ? `Final ${finalRecord}` : "",
        formatPeriod(tournament.startDate, tournament.endDate)
      ]
        .filter(Boolean)
        .join(" · ");

      article.append(status, title, meta);
      return article;
    }


    function createHonourGroup({ key, label, icon, rows }) {
      const section = document.createElement("section");
      section.className = `team-honour-group team-honour-group--${key}`;

      const heading = document.createElement("div");
      heading.className = "team-honour-group-heading";

      const titleWrap = document.createElement("div");
      const iconNode = document.createElement("span");
      iconNode.className = "team-honour-group-icon";
      iconNode.setAttribute("aria-hidden", "true");
      iconNode.textContent = icon;

      const title = document.createElement("strong");
      title.textContent = label;
      titleWrap.append(iconNode, title);

      const count = document.createElement("span");
      count.className = "team-honour-group-count";
      count.textContent = rows.length.toLocaleString("sv-SE");

      heading.append(titleWrap, count);

      const grid = document.createElement("div");
      grid.className = "team-honour-group-grid";
      rows.forEach((tournament) => grid.append(createHonourCard(tournament)));

      section.append(heading, grid);
      return section;
    }


    function renderHonours() {
      const honours = honourTournaments();
      const honourEligibleTournaments = state.tournaments.filter(
        isHonourEligibleTournament
      );
      const champions = honourEligibleTournaments.filter(
        (row) => row.playoffStatusCode === "CHAMPION"
      ).length;
      const finals = honourEligibleTournaments.filter((row) =>
        ["RUNNER_UP", "FINALIST_UNDECIDED"].includes(
          String(row.playoffStatusCode || "").toUpperCase()
        )
      ).length;
      const bronze = honourEligibleTournaments.filter(
        (row) => row.playoffStatusCode === "THIRD_PLACE"
      ).length;

      elements.championshipsCount.textContent = formatInteger(champions, "0");
      elements.finalsCount.textContent = formatInteger(finals, "0");
      elements.bronzeCount.textContent = formatInteger(bronze, "0");
      elements.teamHonoursList.replaceChildren();

      const honoursHeading = elements.teamHonoursSection?.querySelector(
        ".history-section-heading h2"
      );
      if (honoursHeading) honoursHeading.textContent = "Lagets meriter";

      const summaryLabels = elements.teamHonoursSection?.querySelectorAll(
        ".history-honour-summary span"
      );
      if (summaryLabels?.length >= 3) {
        summaryLabels[0].textContent = "Guld";
        summaryLabels[1].textContent = "Silver";
        summaryLabels[2].textContent = "Brons";
      }

      if (!honours.length) {
        const empty = document.createElement("div");
        empty.className = "team-honours-empty-v12815";

        const icon = document.createElement("span");
        icon.className = "team-honours-empty-v12815__icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "☆";

        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = "Inga registrerade meriter";
        const text = document.createElement("p");
        text.textContent = "Klubben har ännu inga registrerade guld-, silver- eller bronsplaceringar i historiken.";
        copy.append(title, text);
        empty.append(icon, copy);

        elements.teamHonoursList.append(empty);
        elements.teamHonoursCount.textContent = "0 lagmeriter";
        elements.teamHonoursSection.hidden = false;
        return;
      }

      const groups = [
        {
          key: "gold",
          label: "GULD",
          icon: "🏆",
          rows: honours.filter((row) => row.playoffStatusCode === "CHAMPION")
        },
        {
          key: "silver",
          label: "SILVER",
          icon: "🥈",
          rows: honours.filter((row) =>
            ["RUNNER_UP", "FINALIST_UNDECIDED"].includes(
              String(row.playoffStatusCode || "").toUpperCase()
            )
          )
        },
        {
          key: "bronze",
          label: "BRONS",
          icon: "🥉",
          rows: honours.filter((row) => row.playoffStatusCode === "THIRD_PLACE")
        }
      ].filter((group) => group.rows.length);

      const fragment = document.createDocumentFragment();
      groups.forEach((group) => fragment.append(createHonourGroup(group)));
      elements.teamHonoursList.append(fragment);

      elements.teamHonoursCount.textContent =
        `${honours.length.toLocaleString("sv-SE")} lagmeriter`;
      elements.teamHonoursSection.hidden = false;
    }


    function competitionLabel(tournament) {
      return (
        tournament.competitionName ||
        tournament.competitionCode ||
        "Okänd turnering"
      );
    }
  
    function seasonTitle(tournament) {
      const season = tournament.seasonLabel || tournament.leagueName;
      const division = tournament.division;
  
      if (season && division) {
        const normalizedSeason = season.toLocaleLowerCase("sv-SE");
        const normalizedDivision = division.toLocaleLowerCase("sv-SE");
  
        if (!normalizedSeason.includes(normalizedDivision)) {
          return `${season} – ${division}`;
        }
      }
  
      return season || division || "Okänd turnering";
    }
  
    function createStat(label, value, className = "") {
      const item = document.createElement("div");
      item.className = `tournament-stat ${className}`.trim();
  
      const labelElement = document.createElement("span");
      labelElement.textContent = label;
  
      const valueElement = document.createElement("strong");
      valueElement.textContent = value;
  
      item.append(labelElement, valueElement);
      return item;
    }
  
    function createDetail(label, value) {
      if (!value) {
        return null;
      }
  
      const item = document.createElement("div");
      item.className = "tournament-detail";
  
      const labelElement = document.createElement("span");
      labelElement.textContent = label;
  
      const valueElement = document.createElement("strong");
      valueElement.textContent = value;
  
      item.append(labelElement, valueElement);
      return item;
    }
  
  
    function createTextCell(value, className = "") {
      const cell = document.createElement("td");
      if (className) {
        cell.className = className;
      }
      cell.textContent = value;
      return cell;
    }
  
  
    function createInternalLink(text, href, className = "") {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = text;
      if (className) {
        link.className = className;
      }
      return link;
    }


    function seasonPodiumMeta(tournament) {
      const normalizedStatus = String(tournament?.playoffStatusCode || "")
        .trim()
        .toUpperCase();
      const placement = nullableNumber(tournament?.finalPlacement);

      if (normalizedStatus === "CHAMPION" || placement === 1) {
        return { tone: "gold", label: "Pallplats: guld" };
      }

      if (normalizedStatus === "RUNNER_UP" || placement === 2) {
        return { tone: "silver", label: "Pallplats: silver" };
      }

      if (normalizedStatus === "THIRD_PLACE" || placement === 3) {
        return { tone: "bronze", label: "Pallplats: brons" };
      }

      return null;
    }


    function seasonExternalTournamentUrl(tournament) {
      const code = String(tournament?.competitionCode || "")
        .trim()
        .toUpperCase();

      // SM saknar extern turneringssida och ska därför inte länkas.
      if (code === "SM") {
        return "";
      }

      // SEC ska alltid öppnas på Svensk eHockeys egen cupsida, inte SportsGamer.
      // Cupnumret hämtas från den färdiga turneringsdatan i Supabase.
      if (code === "SEC") {
        const secText = [
          tournament?.seasonLabel,
          tournament?.leagueName,
          tournament?.competitionName
        ]
          .filter(Boolean)
          .join(" ");
        const secMatch = secText.match(/\bSEC\s*([0-9]+(?:\.[0-9]+)?)\b/i);

        return secMatch
          ? `https://www.svenskehockey.se/SEC/#/cups/${encodeURIComponent(secMatch[1])}`
          : "https://www.svenskehockey.se/SEC/";
      }

      // Tillfälligt: alla ITHL-säsonger länkas till samma ITHL-tabell.
      if (code === "ITHL") {
        return "https://ithl.hockey/standings?season=69af85087ff7bb80c174c9ef&division=69dc3510029cdbf6afa80397";
      }

      const sourceUrl = String(tournament?.sourceUrl || "").trim();
      const sportsGamerUrl = String(tournament?.sportsGamerUrl || "").trim();

      // LGEL prioriterar turneringens egen sparade käll-URL.
      if (code === "LGEL") {
        return sourceUrl || sportsGamerUrl || (
          tournament?.leagueId
            ? `https://sportsgamer.gg/leagues/${encodeURIComponent(tournament.leagueId)}`
            : ""
        );
      }

      // Övriga SportsGamer-turneringar använder den sparade SportsGamer-URL:en
      // i första hand. League-ID används bara som reserv om URL saknas i datan.
      return sportsGamerUrl || sourceUrl || (
        tournament?.leagueId
          ? `https://sportsgamer.gg/leagues/${encodeURIComponent(tournament.leagueId)}`
          : ""
      );
    }
  
  
    function renderSeasonsTable() {
      elements.seasonsTableBody.replaceChildren();
      const fragment = document.createDocumentFragment();
      const visibleTournaments = state.tournaments.filter(seasonTournamentMatchesFilter);
  
      for (const tournament of visibleTournaments) {
        const row = document.createElement("tr");
        const pageUrl = tournamentPageUrl(tournament);
  
        const seasonCell = document.createElement("td");
        const seasonCellContent = document.createElement("span");
        seasonCellContent.className = "history-season-label";
        const seasonPodium = seasonPodiumMeta(tournament);

        if (seasonPodium) {
          const trophy = document.createElement("span");
          trophy.className = `history-season-podium history-season-podium--${seasonPodium.tone}`;
          trophy.textContent = "🏆";
          trophy.title = seasonPodium.label;
          trophy.setAttribute("aria-label", seasonPodium.label);
          seasonCellContent.append(trophy);
        }

        seasonCellContent.append(
          createInternalLink(
            compactSeasonLabel(tournament),
            pageUrl,
            "history-table-link history-table-link--gold"
          )
        );
        seasonCell.append(seasonCellContent);
  
        const nameCell = document.createElement("td");
        nameCell.append(
          createInternalLink(
            tournament.nameUsed || state.team.currentName,
            pageUrl,
            "history-table-link"
          )
        );
  
        const linkCell = document.createElement("td");
        const externalTournamentUrl = seasonExternalTournamentUrl(tournament);

        if (externalTournamentUrl) {
          const externalLink = document.createElement("a");
          externalLink.href = externalTournamentUrl;
          externalLink.className = "history-table-link history-table-link--gold";
          externalLink.target = "_blank";
          externalLink.rel = "noopener noreferrer";
          externalLink.textContent = "Visa turnering →";
          linkCell.append(externalLink);
        } else {
          linkCell.textContent = "–";
        }
  
        const record = tournament.hasStatistics
          ? `${formatInteger(tournament.wins, "0")}–${formatInteger(tournament.losses, "0")}`
          : "–";
        const goals = tournament.goalsFor !== null && tournament.goalsAgainst !== null
          ? `${formatInteger(tournament.goalsFor, "0")}–${formatInteger(tournament.goalsAgainst, "0")}`
          : "–";
  
        row.append(
          seasonCell,
          createTextCell(
            formatPeriod(
              tournament.startDate,
              tournament.endDate
            ) || "–",
            "history-date-cell"
          ),
          nameCell,
          createTextCell(tournament.division || "–"),
          createTextCell(formatInteger(state.playerCounts.get(tournament.leagueId) || 0, "0")),
          createTextCell(formatInteger(effectiveGames(tournament), "–")),
          createTextCell(record),
          createTextCell(formatInteger(tournament.tablePoints, "–")),
          createTextCell(goals),
          linkCell
        );
        fragment.append(row);
      }
  
      if (!visibleTournaments.length) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 10;
        emptyCell.textContent = "Inga turneringar för valt filter.";
        emptyCell.className = "history-empty-cell";
        emptyRow.append(emptyCell);
        fragment.append(emptyRow);
      }

      elements.seasonsTableBody.append(fragment);
      if (elements.tournamentCount) {
        elements.tournamentCount.textContent = seasonCompetitionFilter === "ALL"
          ? `${state.tournaments.length.toLocaleString("sv-SE")} säsonger`
          : `${visibleTournaments.length.toLocaleString("sv-SE")} av ${state.tournaments.length.toLocaleString("sv-SE")} säsonger`;
      }
    }
  
  
    function createPlayerAvatar(player, className = "") {
      const avatar = document.createElement("span");
      avatar.className = `history-player-avatar ${className}`.trim();

      const image = document.createElement("img");
      image.src = localPlayerImageUrl(player);
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";

      const isDefaultPortrait = (value) =>
        String(value || "").includes("players/1DEFAULTBILDID.png");

      if (isDefaultPortrait(image.src)) {
        avatar.classList.add("is-default");
      }

      image.addEventListener("load", () => {
        if (isDefaultPortrait(image.currentSrc || image.src)) {
          avatar.classList.add("is-default");
        } else {
          avatar.classList.remove("is-default");
        }
      });

      image.addEventListener("error", () => {
        if (!image.dataset.fallback) {
          image.dataset.fallback = "1";
          avatar.classList.add("is-default");
          image.src = "players/1DEFAULTBILDID.png";
          return;
        }
        avatar.classList.add("is-empty");
        avatar.replaceChildren();
      });

      avatar.append(image);
      return avatar;
    }
  
  
    function createAllTimePlayerCard(player) {
      const link = document.createElement("a");
      link.className = "history-player-card";
      link.href = playerPageUrl(player.playerKey, player.displayGamertag);

      const teamLogoCandidate = state.team
        ? SEH_teamLogoCandidates(
            [state.team.logoUrl, state.team.logoPath],
            state.team.currentName
          )[0] || ""
        : "";
      if (teamLogoCandidate) {
        link.style.setProperty(
          "--history-player-logo-image",
          `url("${teamLogoCandidate.replace(/"/g, '\"')}")`
        );
      }
  
      const avatar = createPlayerAvatar(player);
      const content = document.createElement("span");
      content.className = "history-player-card-copy";
  
      const name = document.createElement("strong");
      SEH_appendFlaggedText(name, player.playerCountry, player.displayGamertag);
  
      const role = document.createElement("small");
      role.textContent = player.totalGoalieGames > player.totalSkaterGames
        ? "Målvakt"
        : player.playerType === "hybrid"
          ? "Utespelare / Målvakt"
          : "Utespelare";
  
      const stats = document.createElement("span");
      stats.className = "history-player-card-stats";
      stats.textContent = player.totalGoalieGames > player.totalSkaterGames
        ? `GP ${player.totalGoalieGames} · SV% ${formatSavePercentage(player.totalGoalieSavePercentage)} · SO ${player.totalGoalieShutouts}`
        : `GP ${player.totalSkaterGames} · PTS ${player.totalPoints} · G ${player.totalGoals} · A ${player.totalAssists}`;
  
      const meta = document.createElement("span");
      meta.className = "history-player-card-meta";
      meta.textContent = `${player.tournamentCount} säsonger · ${player.competitions.join(", ") || player.latestDivision || "eHockey"}`;
  
      content.append(name, role, stats, meta);
      link.append(avatar, content);
      return link;
    }
  
  
    function renderPlayerCards() {
      elements.playerCards.replaceChildren();
      const players = [...state.allTimePlayers].sort(
        (a, b) => b.careerGames - a.careerGames || b.totalPoints - a.totalPoints
      );
      const visible = state.showAllPlayerCards ? players : players.slice(0, 9);
      const fragment = document.createDocumentFragment();
      visible.forEach((player) => fragment.append(createAllTimePlayerCard(player)));
      elements.playerCards.append(fragment);
  
      elements.togglePlayerCards.hidden = players.length <= 9;
      elements.togglePlayerCards.textContent = state.showAllPlayerCards
        ? "Visa färre spelare"
        : `Visa alla ${players.length} spelare`;
    }
  
  
    function createPlayerNameCell(player) {
      const cell = document.createElement("td");
      const link = createInternalLink(
        player.displayGamertag,
        playerPageUrl(player.playerKey, player.displayGamertag),
        "history-table-link"
      );
      link.textContent = "";
      SEH_appendFlaggedText(link, player.playerCountry, player.displayGamertag);
      cell.append(link);
      return cell;
    }
  
  
    function renderAllTimeTables() {
      elements.allTimeSkaterBody.replaceChildren();
      elements.allTimeGoalieBody.replaceChildren();

      const allSkaters = [...state.allTimePlayers]
        .filter((player) => player.totalSkaterGames > 0)
        .sort(
          (a, b) =>
            b.totalPoints - a.totalPoints ||
            b.totalSkaterGames - a.totalSkaterGames
        );

      const visibleSkaters = state.showAllTimeSkaters
        ? allSkaters
        : allSkaters.slice(0, 10);

      visibleSkaters.forEach((player, index) => {
        const row = document.createElement("tr");
        row.append(
          createTextCell(String(index + 1)),
          createPlayerNameCell(player),
          createTextCell(formatInteger(player.totalSkaterGames, "0")),
          createTextCell(formatInteger(player.totalGoals, "0")),
          createTextCell(formatInteger(player.totalAssists, "0")),
          createTextCell(
            formatInteger(player.totalPoints, "0"),
            "history-highlight-cell"
          ),
          createTextCell(formatInteger(player.totalPenaltyMinutes, "0"))
        );
        elements.allTimeSkaterBody.append(row);
      });

      elements.toggleAllTimeSkaters.hidden = allSkaters.length <= 10;
      elements.toggleAllTimeSkaters.textContent = state.showAllTimeSkaters
        ? "Visa topp 10"
        : `Visa alla ${allSkaters.length} utespelare`;
      elements.toggleAllTimeSkaters.setAttribute(
        "aria-expanded",
        String(state.showAllTimeSkaters)
      );

      const allGoalies = [...state.allTimePlayers]
        .filter((player) => player.totalGoalieGames > 0)
        .sort(
          (a, b) =>
            b.totalGoalieGames - a.totalGoalieGames ||
            (b.totalGoalieSavePercentage ?? -1) -
              (a.totalGoalieSavePercentage ?? -1)
        );

      const visibleGoalies = state.showAllTimeGoalies
        ? allGoalies
        : allGoalies.slice(0, 10);

      visibleGoalies.forEach((player, index) => {
        const row = document.createElement("tr");
        row.append(
          createTextCell(String(index + 1)),
          createPlayerNameCell(player),
          createTextCell(formatInteger(player.totalGoalieGames, "0")),
          createTextCell(formatInteger(player.totalGoalieShotsAgainst, "0")),
          createTextCell(formatInteger(player.totalGoalieGoalsAllowed, "0")),
          createTextCell(formatInteger(player.totalGoalieSaves, "0")),
          createTextCell(
            formatSavePercentage(player.totalGoalieSavePercentage),
            "history-highlight-cell"
          ),
          createTextCell(
            formatDecimal(player.totalGoalieGoalsAgainstAverage, 2)
          ),
          createTextCell(formatInteger(player.totalGoalieShutouts, "0"))
        );
        elements.allTimeGoalieBody.append(row);
      });

      elements.toggleAllTimeGoalies.hidden = allGoalies.length <= 10;
      elements.toggleAllTimeGoalies.textContent = state.showAllTimeGoalies
        ? "Visa topp 10"
        : `Visa alla ${allGoalies.length} målvakter`;
      elements.toggleAllTimeGoalies.setAttribute(
        "aria-expanded",
        String(state.showAllTimeGoalies)
      );
    }

    function renderAllTimePlayers() {
      elements.allTimePlayerCount.textContent =
        `${state.allTimePlayers.length.toLocaleString("sv-SE")} spelare`;
      renderPlayerCards();
      renderAllTimeTables();
    }
  
  
    function comparePlayers(a, b) {
      const roleRank = (player) => {
        if (player.captainRole === "C") {
          return 1;
        }
  
        if (player.captainRole === "A") {
          return 2;
        }
  
        return 3;
      };
  
      return (
        roleRank(a) - roleRank(b) ||
        b.totalPoints - a.totalPoints ||
        b.totalSkaterGames - a.totalSkaterGames ||
        b.totalGoalieGames - a.totalGoalieGames ||
        a.displayGamertag.localeCompare(
          b.displayGamertag,
          "sv-SE"
        )
      );
    }
  
  
    function formatDecimal(
      value,
      decimals = 2,
      fallback = "–"
    ) {
      if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
      ) {
        return fallback;
      }
  
      return Number(value).toLocaleString(
        "sv-SE",
        {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }
      );
    }
  
  
    function formatSavePercentage(value) {
      if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
      ) {
        return "–";
      }
  
      return Number(value).toLocaleString(
        "sv-SE",
        {
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }
      );
    }
  
  
    function createRoleBadge(role) {
      if (!role) {
        return null;
      }
  
      const badge = document.createElement("span");
      badge.className =
        `player-role player-role--${role.toLowerCase()}`;
  
      badge.textContent = role;
      badge.title =
        role === "C"
          ? "Kapten"
          : "Assisterande kapten";
  
      return badge;
    }
  
  
    function createPlayerIdentity(
      player,
      splitText
    ) {
      const wrapper = document.createElement("div");
      wrapper.className = "player-identity";
  
      const firstLine = document.createElement("div");
      firstLine.className = "player-identity-main";
  
      const name = player.playerKey
        ? document.createElement("a")
        : player.sportsGamerPlayerUrl
          ? document.createElement("a")
          : document.createElement("strong");
  
      name.textContent = player.displayGamertag;
  
      if (player.playerKey) {
        name.href = playerPageUrl(player.playerKey, player.displayGamertag);
      } else if (player.sportsGamerPlayerUrl) {
        name.href = player.sportsGamerPlayerUrl;
        name.target = "_blank";
        name.rel = "noopener noreferrer";
      }
  
      const roleBadge = createRoleBadge(player.captainRole);
      firstLine.append(name);
  
      if (roleBadge) {
        firstLine.append(roleBadge);
      }
  
      const metadata = document.createElement("small");
      metadata.textContent = [
        player.playerCountry,
        player.playerNumber !== null ? `#${player.playerNumber}` : "",
        splitText
      ].filter(Boolean).join(" · ");
  
      wrapper.append(firstLine);
      if (metadata.textContent) {
        wrapper.append(metadata);
      }
      return wrapper;
    }
  
  
    function createRosterTable(
      type,
      players
    ) {
      const wrapper = document.createElement("div");
      wrapper.className = "roster-table-wrapper";
  
      const table = document.createElement("table");
      table.className =
        `roster-table roster-table--${type}`;
  
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
  
      const headers = type === "goalie"
        ? [
            "Spelare",
            "Pos",
            "GP",
            "V",
            "F",
            "ÖF",
            "R%",
            "GAA",
            "SO"
          ]
        : [
            "Spelare",
            "Pos",
            "GP",
            "M",
            "A",
            "P",
            "+/−",
            "PIM"
          ];
  
      for (const header of headers) {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = header;
        headerRow.append(cell);
      }
  
      thead.append(headerRow);
  
      const tbody = document.createElement("tbody");
  
      for (const player of players) {
        const row = document.createElement("tr");
  
        const identityCell =
          document.createElement("td");
  
        const splitText = type === "goalie"
          ? [
              player.regularGoalieGames
                ? `Grundserie ${player.regularGoalieGames} GP`
                : "",
              player.playoffGoalieGames
                ? `Slutspel ${player.playoffGoalieGames} GP`
                : ""
            ]
              .filter(Boolean)
              .join(" · ")
          : [
              player.regularSkaterGames
                ? (
                    `Grundserie ${player.regularSkaterGames} GP` +
                    ` / ${player.regularPoints} P`
                  )
                : "",
              player.playoffSkaterGames
                ? (
                    `Slutspel ${player.playoffSkaterGames} GP` +
                    ` / ${player.playoffPoints} P`
                  )
                : ""
            ]
              .filter(Boolean)
              .join(" · ");
  
        identityCell.append(
          createPlayerIdentity(
            player,
            splitText
          )
        );
  
        row.append(identityCell);
  
        const values = type === "goalie"
          ? [
              player.primaryPosition || "G",
              formatInteger(player.totalGoalieGames, "0"),
              formatInteger(player.totalGoalieWins, "0"),
              formatInteger(player.totalGoalieLosses, "0"),
              formatInteger(
                player.totalGoalieOvertimeLosses,
                "0"
              ),
              formatSavePercentage(
                player.totalGoalieSavePercentage
              ),
              formatDecimal(
                player.totalGoalieGoalsAgainstAverage,
                2
              ),
              formatInteger(
                player.totalGoalieShutouts,
                "0"
              )
            ]
          : [
              player.primaryPosition || "–",
              formatInteger(player.totalSkaterGames, "0"),
              formatInteger(player.totalGoals, "0"),
              formatInteger(player.totalAssists, "0"),
              formatInteger(player.totalPoints, "0"),
              formatSignedInteger(
                player.totalPlusMinus
              ),
              formatInteger(
                player.totalPenaltyMinutes,
                "0"
              )
            ];
  
        for (const value of values) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
  
        tbody.append(row);
      }
  
      table.append(thead, tbody);
      wrapper.append(table);
  
      return wrapper;
    }
  
  
    function createRosterOnlyList(players) {
      const section = document.createElement("section");
      section.className = "roster-only-section";
  
      const heading = document.createElement("h5");
      heading.textContent =
        "Registrerade utan statistik";
  
      const list = document.createElement("div");
      list.className = "roster-only-list";
  
      for (const player of players) {
        const item = document.createElement("div");
        item.className = "roster-only-player";
  
        item.append(
          createPlayerIdentity(
            player,
            [
              player.primaryPosition,
              player.hasBackupLicense
                ? "Backup License"
                : player.hasFullLicense
                  ? "Full License"
                  : ""
            ]
              .filter(Boolean)
              .join(" · ")
          )
        );
  
        list.append(item);
      }
  
      section.append(heading, list);
      return section;
    }
  
  
    function renderTournamentPlayers(
      container,
      players
    ) {
      container.replaceChildren();
  
      if (!players.length) {
        const empty = document.createElement("p");
        empty.className = "roster-empty";
        empty.textContent =
          "Ingen trupp eller spelarstatistik hittades.";
        container.append(empty);
        return;
      }
  
      const skaters = players.filter(
        (player) =>
          player.totalSkaterGames > 0
      );
  
      const goalies = players.filter(
        (player) =>
          player.totalGoalieGames > 0
      );
  
      const rosterOnly = players.filter(
        (player) =>
          player.totalSkaterGames === 0 &&
          player.totalGoalieGames === 0
      );
  
      const overview =
        document.createElement("div");
  
      overview.className = "roster-overview";
      overview.textContent = [
        `${players.length} unika spelare`,
        skaters.length
          ? `${skaters.length} utespelarroller`
          : "",
        goalies.length
          ? `${goalies.length} målvaktsroller`
          : "",
        rosterOnly.length
          ? `${rosterOnly.length} utan statistik`
          : ""
      ]
        .filter(Boolean)
        .join(" · ");
  
      container.append(overview);
  
      if (skaters.length) {
        const heading = document.createElement("h5");
        heading.textContent = "Utespelare";
  
        container.append(
          heading,
          createRosterTable("skater", skaters)
        );
      }
  
      if (goalies.length) {
        const heading = document.createElement("h5");
        heading.textContent = "Målvakter";
  
        container.append(
          heading,
          createRosterTable("goalie", goalies)
        );
      }
  
      if (rosterOnly.length) {
        container.append(
          createRosterOnlyList(rosterOnly)
        );
      }
    }
  
  
    function createTournamentRoster(
      tournament
    ) {
      const details = document.createElement("details");
      details.className = "tournament-roster";
  
      const summary = document.createElement("summary");
  
      const title = document.createElement("span");
      title.textContent =
        "Trupp och spelarstatistik";
  
      const status = document.createElement("small");
      status.textContent =
        "Öppna för att ladda";
  
      summary.append(title, status);
  
      const body = document.createElement("div");
      body.className = "tournament-roster-body";
  
      details.append(summary, body);
  
      details.addEventListener(
        "toggle",
        async () => {
          if (
            !details.open ||
            details.dataset.loaded === "true" ||
            details.dataset.loading === "true"
          ) {
            return;
          }
  
          details.dataset.loading = "true";
          status.textContent = "Laddar…";
  
          const loading =
            document.createElement("p");
  
          loading.className = "roster-loading";
          loading.textContent =
            "Hämtar trupp och statistik…";
  
          body.replaceChildren(loading);
  
          try {
            const players =
              await fetchTournamentPlayers(
                tournament
              );
  
            renderTournamentPlayers(
              body,
              players
            );
  
            status.textContent =
              `${players.length} unika spelare`;
  
            details.dataset.loaded = "true";
          } catch (error) {
            const message =
              document.createElement("p");
  
            message.className = "roster-error";
            message.textContent =
              error instanceof Error
                ? error.message
                : String(error);
  
            body.replaceChildren(message);
            status.textContent =
              "Kunde inte laddas";
          } finally {
            details.dataset.loading = "false";
          }
        }
      );
  
      return details;
    }
  
  
    function createTournamentCard(tournament) {
      const article = document.createElement("article");
      article.className = "tournament-card";
  
      const header = document.createElement("header");
      header.className = "tournament-card-header";
  
      const heading = document.createElement("div");
      heading.className = "tournament-heading";
  
      const eyebrow = document.createElement("p");
      eyebrow.className = "tournament-competition";
      eyebrow.textContent = competitionLabel(tournament);
  
      const title = document.createElement("h3");
      title.append(
        createInternalLink(
          seasonTitle(tournament),
          tournamentPageUrl(tournament),
          "tournament-title-link"
        )
      );
  
      const subtitle = document.createElement("p");
      subtitle.className = "tournament-subtitle";
      subtitle.textContent = [
        tournament.nameUsed &&
        tournament.nameUsed !== state.team.currentName
          ? `Spelade som ${tournament.nameUsed}`
          : "",
        tournament.externalLeagueId
          ? `Liga-ID ${tournament.externalLeagueId}`
          : `Internt liga-ID ${tournament.leagueId}`,
        tournament.groupName || (
          tournament.groupId
            ? `Grupp ${tournament.groupId}`
            : ""
        )
      ]
        .filter(Boolean)
        .join(" · ");
  
      heading.append(eyebrow, title);
  
      if (tournament.playoffStatus) {
        const playoffBadge =
          document.createElement("span");
  
        playoffBadge.className =
          `tournament-playoff-badge ` +
          `tournament-playoff-badge--${playoffBadgeClass(
            tournament.playoffStatusCode
          )}`;
  
        playoffBadge.textContent =
          tournament.playoffStatus;
  
        heading.append(playoffBadge);
      }
  
      heading.append(subtitle);
      header.append(heading);
  
      if (
        tournament.playoffStatusCode === "CHAMPION"
      ) {
        article.classList.add(
          "tournament-card--champion"
        );
      }
  
      const headerLinks = document.createElement("div");
      headerLinks.className = "tournament-header-links";
  
      const internalLink = document.createElement("a");
      internalLink.className = "tournament-external-link";
      internalLink.href = tournamentPageUrl(tournament);
      internalLink.textContent = "Visa lagets turneringssida →";
      headerLinks.append(internalLink);
  
      const overviewLink = document.createElement("a");
      overviewLink.className = "tournament-external-link tournament-external-link--muted";
      overviewLink.href = fullTournamentPageUrl(tournament);
      overviewLink.textContent = "Visa hela turneringen";
      headerLinks.append(overviewLink);
  
      if (tournament.sportsGamerUrl || tournament.sourceUrl) {
        const externalLink = document.createElement("a");
        externalLink.className = "tournament-external-link tournament-external-link--muted";
        externalLink.href = tournament.sportsGamerUrl || tournament.sourceUrl;
        externalLink.target = "_blank";
        externalLink.rel = "noopener noreferrer";
        externalLink.textContent = "Extern källa ↗";
        headerLinks.append(externalLink);
      }
  
      header.append(headerLinks);
  
      article.append(header);
  
      const games = effectiveGames(tournament);
      const goalDiff = effectiveGoalDiff(tournament);
  
      if (tournament.hasStatistics) {
        const stats = document.createElement("div");
        stats.className = "tournament-stat-grid";
  
        stats.append(
          createStat("Matcher", formatInteger(games)),
          createStat("Vinster", formatInteger(tournament.wins)),
          createStat("Förluster", formatInteger(tournament.losses)),
          createStat(
            "Mål",
            tournament.goalsFor !== null &&
            tournament.goalsAgainst !== null
              ? `${formatInteger(tournament.goalsFor)}–${formatInteger(tournament.goalsAgainst)}`
              : "–"
          ),
          createStat(
            "Målskillnad",
            formatSignedInteger(goalDiff),
            goalDiff !== null && goalDiff > 0
              ? "positive"
              : goalDiff !== null && goalDiff < 0
                ? "negative"
                : ""
          ),
          createStat("Poäng", formatInteger(tournament.tablePoints))
        );
  
        article.append(stats);
  
        const splitStats = document.createElement("div");
        splitStats.className = "tournament-split-grid";
  
        const regular = document.createElement("section");
        regular.className = "tournament-split-card";
        regular.innerHTML = `
          <span>Grundserie</span>
          <strong>
            ${formatInteger(tournament.regularGames)} matcher
          </strong>
          <small>
            ${formatStageRecord(
              tournament.regularWins,
              tournament.regularLosses,
              tournament.regularOvertimeWins,
              tournament.regularOvertimeLosses
            )}
          </small>
        `;
  
        const playoffs = document.createElement("section");
        playoffs.className = "tournament-split-card";
        playoffs.innerHTML = `
          <span>Slutspel</span>
          <strong>
            ${formatInteger(tournament.playoffGames)} matcher
          </strong>
          <small>
            ${formatStageRecord(
              tournament.playoffWins,
              tournament.playoffLosses,
              tournament.playoffOvertimeWins,
              tournament.playoffOvertimeLosses
            )}
          </small>
        `;
  
        splitStats.append(regular, playoffs);
        article.append(splitStats);
      } else {
        const notice = document.createElement("div");
        notice.className = "statistics-missing";
        notice.textContent =
          "Laget är registrerat i turneringen, men lagstatistik saknas i databasen.";
        article.append(notice);
      }
  
      const details = document.createElement("div");
      details.className = "tournament-details-grid";
  
      const showSeparatePlayoffRound =
        Boolean(tournament.playoffRound) &&
        tournament.playoffRound !==
          tournament.playoffStatus;
  
      const detailItems = [
        createDetail(
          "Tabellplacering",
          tournament.tablePosition !== null
            ? `#${tournament.tablePosition}`
            : ""
        ),
        createDetail(
          "Grundserieseed",
          tournament.regularSeasonSeed !== null
            ? `#${tournament.regularSeasonSeed}`
            : ""
        ),
        createDetail(
          "Slutspelsresultat",
          tournament.playoffStatus
        ),
        createDetail(
          "Slutspelsrunda",
          showSeparatePlayoffRound
            ? tournament.playoffRound
            : ""
        ),
        createDetail(
          "Slutplacering",
          tournament.finalPlacement !== null
            ? `#${tournament.finalPlacement}`
            : ""
        ),
        createDetail(
          "Slutspelsserier",
          playoffSeriesRecord(tournament)
        ),
        createDetail(
          "Finalserie",
          finalSeriesRecord(tournament)
        ),
        createDetail(
          "Crossover",
          tournament.playedCrossover
            ? (
                tournament.wonCrossover
                  ? "Vann"
                  : "Förlorade"
              )
            : ""
        ),
        createDetail(
          "Registrerad",
          formatDate(
            tournament.registeredAt ||
            tournament.registeredForLeague
          )
        ),
        createDetail(
          "Period",
          formatPeriod(
            tournament.startDate,
            tournament.endDate
          )
        ),
        createDetail(
          "SportsGamer-team-ID",
          tournament.sportsGamerTeamId
        )
      ].filter(Boolean);
  
      if (detailItems.length) {
        details.append(...detailItems);
        article.append(details);
      }
  
      article.append(
        createTournamentRoster(tournament)
      );
  
      return article;
    }
  
    function populateCompetitionFilter() {
      const options = uniqueValues(
        state.tournaments.map((tournament) =>
          tournament.competitionCode ||
          tournament.competitionName
        )
      ).sort((a, b) => a.localeCompare(b, "sv-SE"));
  
      const currentValue = elements.competitionFilter.value;
  
      elements.competitionFilter.replaceChildren();
  
      const allOption = document.createElement("option");
      allOption.value = "";
      allOption.textContent = "Alla turneringar";
      elements.competitionFilter.append(allOption);
  
      for (const optionValue of options) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        elements.competitionFilter.append(option);
      }
  
      if (options.includes(currentValue)) {
        elements.competitionFilter.value = currentValue;
      }
    }
  
    function applyTournamentFilters() {
      const competition = elements.competitionFilter.value;
      const sortMode = elements.tournamentSort.value;
  
      state.filteredTournaments = state.tournaments
        .filter((tournament) => {
          if (!competition) {
            return true;
          }
  
          return (
            tournament.competitionCode === competition ||
            tournament.competitionName === competition
          );
        })
        .sort((a, b) => {
          if (sortMode === "oldest") {
            return (
              tournamentChronologyValue(a) - tournamentChronologyValue(b) ||
              seasonTitle(a).localeCompare(seasonTitle(b), "sv-SE", { numeric: true })
            );
          }
  
          if (sortMode === "competition") {
            return (
              competitionLabel(a).localeCompare(competitionLabel(b), "sv-SE") ||
              compareTournamentsByDateDescending(a, b)
            );
          }
  
          return compareTournamentsByDateDescending(a, b);
        });
  
      renderTournaments();
    }
  
    function renderTournaments() {
      elements.tournamentList.replaceChildren();
  
      if (!state.filteredTournaments.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "Inga turneringar matchar filtret.";
        elements.tournamentList.append(empty);
      } else {
        const output = document.createDocumentFragment();
  
        for (const tournament of state.filteredTournaments) {
          output.append(createTournamentCard(tournament));
        }
  
        elements.tournamentList.append(output);
      }
  
      const visible = state.filteredTournaments.length;
      const total = state.tournaments.length;
  
      elements.tournamentResultText.textContent =
        visible === total
          ? `${total.toLocaleString("sv-SE")} turneringar`
          : `${visible.toLocaleString("sv-SE")} av ${total.toLocaleString("sv-SE")} turneringar`;
  
      elements.lastUpdated.textContent = state.loadedAt
        ? `Hämtad ${new Intl.DateTimeFormat("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }).format(state.loadedAt)}`
        : "";
    }
  
    function showError(error) {
      console.error(error);
  
      elements.errorMessage.textContent =
        error instanceof Error
          ? error.message
          : String(error);
  
      elements.errorNotice.hidden = false;
      elements.teamPage.hidden = true;
    }
  
    async function loadTeamPage() {
      const teamId = getTeamId();
  
      elements.errorNotice.hidden = true;
      elements.setupNotice.hidden = true;
      elements.loadingState.hidden = false;
      elements.teamPage.hidden = true;
      if (elements.reloadButton) elements.reloadButton.disabled = true;
  
      if (!teamId) {
        showError(
          new Error("Länken innehåller inget giltigt internt lag-ID.")
        );
        elements.loadingState.hidden = true;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
        return;
      }
  
      if (!hasValidConfig()) {
        elements.loadingState.hidden = true;
        elements.setupNotice.hidden = false;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
        return;
      }
  
      try {
        const team = await fetchTeam(teamId);
  
        if (!team || team.country !== "SE") {
          throw new Error(
            "Laget hittades inte bland de svenska lagen."
          );
        }
  
        const [
          tournaments,
          allTimePlayers,
          playerCounts,
          unlinkedTeamPlayers
        ] = await Promise.all([
          fetchTournaments(team),
          fetchAllTimePlayers(teamId),
          fetchPlayerCounts(team),
          fetchUnlinkedTeamPlayers(team)
        ]);
  
        const canonicalTournamentNames = uniqueValues(
          tournaments.map((row) => row.nameUsed)
        );
        const canonicalSportsGamerIds = uniqueValues(
          tournaments
            .map((row) => row.sportsGamerTeamId)
            .filter(Boolean)
        );

        state.team = {
          ...team,
          historicalNames: canonicalTournamentNames.filter(
            (name) => teamNameKey(name) !== teamNameKey(team.currentName)
          ),
          leagueNames: canonicalTournamentNames,
          sportsGamerIds: canonicalSportsGamerIds.length
            ? canonicalSportsGamerIds
            : team.sportsGamerIds
        };
        state.tournaments = tournaments;
        state.allTimePlayers = mergeAllTimePlayers(
          allTimePlayers,
          unlinkedTeamPlayers
        );
        state.playerCounts = mergeUnlinkedPlayerCounts(
          playerCounts,
          unlinkedTeamPlayers
        );
        state.showAllPlayerCards = false;
        state.loadedAt = new Date();
  
        renderTeamHeader();
        renderSummary();
        renderHonours();
        updateTeamMeritsTabVisibility();
        renderSeasonCompetitionFilters();
        renderSeasonsTable();
        renderAllTimePlayers();
        populateCompetitionFilter();
        applyTournamentFilters();
  
        elements.teamPage.hidden = false;
      } catch (error) {
        showError(error);
      } finally {
        elements.loadingState.hidden = true;
        if (elements.reloadButton) elements.reloadButton.disabled = false;
      }
    }
  
    elements.competitionFilter.addEventListener(
      "change",
      applyTournamentFilters
    );
  
    elements.tournamentSort.addEventListener(
      "change",
      applyTournamentFilters
    );
  
    elements.reloadButton?.addEventListener(
      "click",
      loadTeamPage
    );
  
    elements.togglePlayerCards.addEventListener(
      "click",
      () => {
        state.showAllPlayerCards = !state.showAllPlayerCards;
        renderPlayerCards();
      }
    );
  
    elements.toggleAllTimeSkaters.addEventListener(
      "click",
      () => {
        state.showAllTimeSkaters = !state.showAllTimeSkaters;
        renderAllTimeTables();
      }
    );

    elements.toggleAllTimeGoalies.addEventListener(
      "click",
      () => {
        state.showAllTimeGoalies = !state.showAllTimeGoalies;
        renderAllTimeTables();
      }
    );

    initTeamProfileTabs();
    loadTeamPage();
  })();
}


function SEH_initTeamTournament() {
  /* ======================================================
     ROUTE CONTROLLER: teamTournament
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const APP_BUILD = "2026-08-12-team-tournament-v31-player-fallback";
    const config = window.EHOCKEY_CONFIG || {};
    const elements = {
      backLink: document.querySelector("#backLink"),
      reloadButton: document.querySelector("#reloadButton"),
      setupNotice: document.querySelector("#setupNotice"),
      errorNotice: document.querySelector("#errorNotice"),
      errorMessage: document.querySelector("#errorMessage"),
      loadingState: document.querySelector("#loadingState"),
      tournamentPage: document.querySelector("#tournamentPage"),
      teamAvatar: document.querySelector("#teamAvatar"),
      competitionName: document.querySelector("#competitionName"),
      teamName: document.querySelector("#teamName"),
      tournamentName: document.querySelector("#tournamentName"),
      tournamentMeta: document.querySelector("#tournamentMeta"),
      tournamentLinks: document.querySelector("#tournamentLinks"),
      gamesCount: document.querySelector("#gamesCount"),
      winsCount: document.querySelector("#winsCount"),
      lossesCount: document.querySelector("#lossesCount"),
      winPercentage: document.querySelector("#winPercentage"),
      goalsRecord: document.querySelector("#goalsRecord"),
      goalDifference: document.querySelector("#goalDifference"),
      regularRecord: document.querySelector("#regularRecord"),
      regularDetails: document.querySelector("#regularDetails"),
      playoffRecord: document.querySelector("#playoffRecord"),
      playoffDetails: document.querySelector("#playoffDetails"),
      playerCount: document.querySelector("#playerCount"),
      skaterBody: document.querySelector("#skaterBody"),
      goalieBody: document.querySelector("#goalieBody"),
      matchesSection: document.querySelector("#matchesSection"),
      matchCount: document.querySelector("#matchCount"),
      matchList: document.querySelector("#matchList")
    };
  
    console.info("Svensk eHockey lagturnering build:", APP_BUILD);
  
    function hasValidConfig() {
      return typeof config.supabaseUrl === "string" &&
        /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl.trim()) &&
        typeof config.supabasePublishableKey === "string" &&
        config.supabasePublishableKey.trim().length > 20 &&
        !config.supabasePublishableKey.includes("KLISTRA_IN");
    }
  
    function clean(value) {
      return String(value ?? "").trim();
    }
  
    function number(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  
    function nullableNumber(value) {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  
    function booleanValue(value) {
      if (value === true || value === 1 || value === "1") return true;
      return ["true", "yes", "y", "ja"].includes(clean(value).toLowerCase());
    }
  
    function firstValue(row, keys, fallback = "") {
      for (const key of keys) {
        const value = row?.[key];
        if (value !== null && value !== undefined && value !== "") return value;
      }
      return fallback;
    }
  
    function formatInteger(value, fallback = "–") {
      const numeric = nullableNumber(value);
      return numeric === null ? fallback : numeric.toLocaleString("sv-SE");
    }
  
    function formatSigned(value, fallback = "–") {
      const numeric = nullableNumber(value);
      if (numeric === null) return fallback;
      return numeric > 0 ? `+${numeric.toLocaleString("sv-SE")}` : numeric.toLocaleString("sv-SE");
    }
  
    function formatDecimal(value, decimals = 2) {
      const numeric = nullableNumber(value);
      return numeric === null ? "–" : numeric.toLocaleString("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
  
    function formatSavePercentage(value) {
      const numeric = nullableNumber(value);
      if (numeric === null) return "–";
      const normalized = numeric > 1 ? numeric / 100 : numeric;
      return normalized.toLocaleString("sv-SE", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    }
  
    function formatDate(value) {
      if (!value) return "";
      const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
      return Number.isNaN(date.getTime())
        ? String(value).slice(0, 10)
        : new Intl.DateTimeFormat("sv-SE").format(date);
    }
  
    function formatPeriod(startValue, endValue) {
      const start = formatDate(startValue);
      const end = formatDate(endValue);
      if (start && end && start !== end) return `${start} – ${end}`;
      return start || end || "";
    }
  
    function initials(name) {
      return clean(name || "EH").split(/\s+/).slice(0, 2)
        .map((part) => part[0] || "").join("").toUpperCase() || "EH";
    }
  
    function countryFlag(code) {
      const normalized = clean(code).toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalized)) return "🌐";
      return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
    }
  
    function getIds() {
      const legacy = new URLSearchParams(location.search);
      const teamId = Number(window.SEH_ROUTE?.params?.teamId || legacy.get("team"));
      const leagueId = Number(window.SEH_ROUTE?.params?.leagueId || legacy.get("league"));
      return {
        teamId: Number.isInteger(teamId) && teamId > 0 ? teamId : null,
        leagueId: Number.isInteger(leagueId) && leagueId > 0 ? leagueId : null
      };
    }
  
    function apiUrl(view, params) {
      return `${config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/${view}?${params.toString()}`;
    }
  
    async function fetchJson(view, params) {
      const response = await fetch(apiUrl(view, params), {
        headers: {
          apikey: config.supabasePublishableKey.trim(),
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${view}: Supabase svarade ${response.status}. ${body || response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Supabase returnerade ett oväntat svar.");
      return data;
    }
  
    function teamUrl(teamId) {
      return `#/lag/${encodeURIComponent(teamId)}`;
    }
  
    function tournamentUrl(leagueId) {
      return `#/turnering/${encodeURIComponent(leagueId)}`;
    }
  
    function playerUrl(playerKey, teamId, gamertag = "") {
      return SEH_playerProfileUrl(playerKey, gamertag, teamId);
    }
  
    function inferCompetitionCode(row) {
      const code = String(row.competition_code || "").trim().toUpperCase();
      if (code === "ESHL") return "ESHL";
      return code || "ÖVRIGT";
    }
  
    function competitionDisplay(row) {
      const code = inferCompetitionCode(row);
      if (code === "LGEL" || code === "SM") return code;
      return row.competition_name || row.competition_code || "Turnering";
    }
  
    function normalizedSeasonLabel(tournament) {
      const raw = clean(tournament.season_label || tournament.league_name || tournament.season_number);
      if (!raw) return "Okänd turnering";
      if (inferCompetitionCode(tournament) === "SEC") {
        if (/^SEC(?:\s|$)/i.test(raw)) return raw.replace(/^sec/i, "SEC");
        if (/^\d+(?:\.\d+)?(?:\s+Challenger)?$/i.test(raw)) return `SEC ${raw}`;
      }
      return raw;
    }
  
    function canonicalPlayerName(player) {
      return clean(
        player.canonical_display_gamertag ||
        player.sports_gamer_gamertag ||
        player.sportsgamer_gamertag ||
        player.display_gamertag
      ) || "Okänd spelare";
    }
  
    function setTeamAvatar(team) {
      const teamName = clean(team.current_name);
      SEH_renderTeamLogo(
        elements.teamAvatar,
        [clean(team.logo_url), clean(team.logo_path)],
        teamName,
        `${teamName} logotyp`
      );
    }

    function addStat(container, label, value) {
      const item = document.createElement("div");
      const span = document.createElement("span");
      const strong = document.createElement("strong");
      span.textContent = label;
      strong.textContent = value;
      item.append(span, strong);
      container.append(item);
    }
  
    function textCell(value, className = "") {
      const cell = document.createElement("td");
      if (className) cell.className = className;
      cell.textContent = value;
      return cell;
    }
  
    function playerCell(player, teamId) {
      const cell = document.createElement("td");
      const wrapper = document.createElement("span");
      wrapper.className = "tournament-player-cell";
      const name = canonicalPlayerName(player);
  
      if (clean(player.player_key)) {
        const link = document.createElement("a");
        link.className = "history-table-link";
        link.href = playerUrl(player.player_key, teamId, name);
        SEH_appendFlaggedText(link, player.player_country, name);
        wrapper.append(link);
      } else {
        const text = document.createElement("span");
        SEH_appendFlaggedText(text, player.player_country, name);
        wrapper.append(text);
      }
  
      const metaParts = [];
      if (player.player_number !== null && player.player_number !== undefined && player.player_number !== "") {
        metaParts.push(`#${player.player_number}`);
      }
      if (player.captain_role) metaParts.push(clean(player.captain_role).toUpperCase());
      if (player.has_full_license === true) metaParts.push("Full licens");
      else if (player.has_backup_license === true) metaParts.push("Backup");
  
      const sportsGamerUrl = clean(player.sports_gamer_player_url);
      if (sportsGamerUrl) {
        const external = document.createElement("a");
        external.href = sportsGamerUrl;
        external.target = "_blank";
        external.rel = "noopener noreferrer";
        external.className = "tournament-player-external";
        external.textContent = "SportsGamer ↗";
        wrapper.append(external);
      }
  
      if (metaParts.length) {
        const meta = document.createElement("small");
        meta.textContent = metaParts.join(" · ");
        wrapper.append(meta);
      }
  
      cell.append(wrapper);
      return cell;
    }
  
    function appendEmptyRow(body, columns, text) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = columns;
      cell.className = "history-table-empty";
      cell.textContent = text;
      row.append(cell);
      body.append(row);
    }
  
    function isGoalieOnlyRow(player) {
      if (player.is_goalie_only === true || player.is_goalie_only === "true") return true;
      return String(player.primary_position || "").trim().toUpperCase() === "G" &&
        number(player.total_goalie_games) > 0 &&
        number(player.total_goals) === 0 &&
        number(player.total_assists) === 0 &&
        number(player.total_points) === 0 &&
        number(player.total_goalie_games) >= number(player.total_skater_games);
    }
  
    function renderRoster(players, teamId) {
      elements.skaterBody.replaceChildren();
      elements.goalieBody.replaceChildren();
  
      const uniquePlayers = new Map();
      players.forEach((player) => {
        const key = clean(player.player_key) || `${canonicalPlayerName(player).toLowerCase()}::${clean(player.primary_position)}`;
        if (!uniquePlayers.has(key)) uniquePlayers.set(key, player);
      });
      const rows = [...uniquePlayers.values()];
      elements.playerCount.textContent = `${rows.length.toLocaleString("sv-SE")} spelare`;
  
      const skaters = rows.filter((player) => !isGoalieOnlyRow(player) && number(player.total_skater_games) > 0)
        .sort((a, b) => number(b.total_points) - number(a.total_points) ||
          number(b.total_skater_games) - number(a.total_skater_games) ||
          canonicalPlayerName(a).localeCompare(canonicalPlayerName(b), "sv-SE"));
  
      skaters.forEach((player) => {
        const row = document.createElement("tr");
        row.append(
          playerCell(player, teamId),
          textCell(player.primary_position || "–"),
          textCell(formatInteger(player.total_skater_games, "0")),
          textCell(formatInteger(player.total_goals, "0")),
          textCell(formatInteger(player.total_assists, "0")),
          textCell(formatInteger(player.total_points, "0"), "history-highlight-cell"),
          textCell(formatSigned(player.total_plus_minus, "0")),
          textCell(formatInteger(player.total_penalty_minutes, "0"))
        );
        elements.skaterBody.append(row);
      });
      if (!skaters.length) appendEmptyRow(elements.skaterBody, 8, "Ingen utespelarstatistik finns för laget i turneringen.");
  
      const goalies = rows.filter((player) => number(player.total_goalie_games) > 0)
        .sort((a, b) => number(b.total_goalie_games) - number(a.total_goalie_games) ||
          canonicalPlayerName(a).localeCompare(canonicalPlayerName(b), "sv-SE"));
  
      goalies.forEach((player) => {
        const row = document.createElement("tr");
        row.append(
          playerCell(player, teamId),
          textCell(formatInteger(player.total_goalie_games, "0")),
          textCell(formatInteger(player.total_goalie_wins, "0")),
          textCell(formatInteger(player.total_goalie_losses, "0")),
          textCell(formatInteger(player.total_goalie_overtime_losses, "0")),
          textCell(formatSavePercentage(player.total_goalie_save_percentage), "history-highlight-cell"),
          textCell(formatDecimal(player.total_goalie_goals_against_average, 2)),
          textCell(formatInteger(player.total_goalie_shutouts, "0"))
        );
        elements.goalieBody.append(row);
      });
      if (!goalies.length) appendEmptyRow(elements.goalieBody, 8, "Ingen målvaktsstatistik finns för laget i turneringen.");
    }
  
    function normalizeMatch(match) {
      const homeScore = nullableNumber(firstValue(match, ["home_score", "home_goals", "score_home"]));
      const awayScore = nullableNumber(firstValue(match, ["away_score", "away_goals", "score_away"]));
      const explicitHasResult = firstValue(match, ["has_result", "result_available", "is_played"], null);
      const hasResult = explicitHasResult === null
        ? homeScore !== null && awayScore !== null
        : booleanValue(explicitHasResult);
      const statusText = clean(firstValue(match, ["match_status", "status", "result_type", "status_code"]));
      const sourceText = clean(firstValue(match, ["statistics_source", "source_type", "source", "stats_summary"]));
      const walkover = booleanValue(firstValue(match, ["is_walkover", "walkover", "is_wo"], false)) ||
        /(^|\W)(wo|walkover)(\W|$)/i.test(statusText);
      const reconstructed = booleanValue(firstValue(match, ["is_reconstructed", "reconstructed"], false)) ||
        /rekonstru|reconstruct/i.test(`${statusText} ${sourceText}`);
      const stage = clean(firstValue(match, ["stage_name", "playoff_round", "round_name", "stage_code"], "Match"));
      const playoff = booleanValue(firstValue(match, ["is_playoff", "playoff"], false)) ||
        /slutspel|playoff|final|semi|quarter|kvart|brons|round\s*of/i.test(stage);
  
      return {
        ...match,
        homeScore,
        awayScore,
        hasResult,
        walkover,
        reconstructed,
        stage,
        playoff,
        playedAt: firstValue(match, ["played_at", "scheduled_at", "match_date", "date"]),
        homeTeamId: number(firstValue(match, ["home_team_id", "team_1_id"])),
        awayTeamId: number(firstValue(match, ["away_team_id", "team_2_id"])),
        homeTeamName: clean(firstValue(match, ["home_team_name", "home_name", "team_1_name"], "Hemmalag")),
        awayTeamName: clean(firstValue(match, ["away_team_name", "away_name", "team_2_name"], "Bortalag")),
        overtime: booleanValue(firstValue(match, ["overtime", "is_overtime", "went_to_overtime"], false)),
        gameNumber: nullableNumber(firstValue(match, ["game_number", "series_game_number", "match_number"])),
        goalsSummary: clean(firstValue(match, ["goals_summary", "events_summary", "match_summary"]))
      };
    }
  
    function matchStatusLabel(match) {
      if (match.walkover) return "WO";
      if (match.reconstructed) return "REKONSTRUERAD";
      if (!match.hasResult) return "OSPELAD";
      if (match.overtime) return "OT";
      return "SPELAD";
    }
  
    function teamMatchResult(match, teamId) {
      if (!match.hasResult || match.homeScore === null || match.awayScore === null) {
        return { code: "–", className: "pending", score: "–" };
      }
      const isHome = match.homeTeamId === teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      const code = teamScore > opponentScore ? "V" : teamScore < opponentScore ? "F" : "O";
      return {
        code,
        className: code.toLowerCase(),
        score: `${teamScore}–${opponentScore}`
      };
    }
  
    function renderMatches(rawMatches, teamId) {
      elements.matchList.replaceChildren();
      const matches = rawMatches.map(normalizeMatch).sort((a, b) => {
        const dateA = Date.parse(a.playedAt || "") || 0;
        const dateB = Date.parse(b.playedAt || "") || 0;
        return dateA - dateB || number(a.gameNumber) - number(b.gameNumber);
      });
  
      if (!matches.length) {
        elements.matchesSection.hidden = true;
        return;
      }
  
      elements.matchesSection.hidden = false;
      const playedCount = matches.filter((match) => match.hasResult).length;
      elements.matchCount.textContent = `${playedCount.toLocaleString("sv-SE")} spelade av ${matches.length.toLocaleString("sv-SE")}`;
  
      matches.forEach((match) => {
        const isHome = match.homeTeamId === teamId;
        const opponent = isHome ? match.awayTeamName : match.homeTeamName;
        const result = teamMatchResult(match, teamId);
        const item = document.createElement("article");
        item.className = `tournament-match-card tournament-match-card--${result.className}`;
  
        const heading = document.createElement("div");
        heading.className = "tournament-match-heading";
  
        const resultBadge = document.createElement("span");
        resultBadge.className = `tournament-match-result tournament-match-result--${result.className}`;
        resultBadge.textContent = result.code;
  
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = `${isHome ? "Hemma" : "Borta"} mot ${opponent}`;
        const meta = document.createElement("small");
        meta.textContent = [
          formatDate(match.playedAt),
          match.stage,
          match.gameNumber ? `Match ${match.gameNumber}` : ""
        ].filter(Boolean).join(" · ");
        copy.append(title, meta);
  
        const scoreWrap = document.createElement("div");
        scoreWrap.className = "tournament-match-score-wrap";
        const status = document.createElement("small");
        status.className = `match-status-chip match-status-chip--${match.walkover ? "wo" : match.reconstructed ? "reconstructed" : match.hasResult ? "played" : "pending"}`;
        status.textContent = matchStatusLabel(match);
        const score = document.createElement("span");
        score.className = "tournament-match-score";
        score.textContent = result.score;
        scoreWrap.append(status, score);
  
        heading.append(resultBadge, copy, scoreWrap);
        item.append(heading);
  
        if (match.goalsSummary) {
          const details = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "Visa matchhändelser";
          const text = document.createElement("p");
          text.textContent = match.goalsSummary;
          details.append(summary, text);
          item.append(details);
        }
        elements.matchList.append(item);
      });
    }
  
    function render(
      team,
      tournament,
      players,
      matches,
      localTeamId,
      tournamentTeamId,
      leagueId
    ) {
      const seasonLabel = normalizedSeasonLabel(tournament);
      const displayTeamName = clean(tournament.name_used_in_tournament || team.current_name) || "Okänt lag";
      document.title = `${displayTeamName} – ${seasonLabel} – Svensk eHockey`;
      elements.backLink.href = teamUrl(localTeamId);
      elements.teamName.textContent = displayTeamName;
      elements.competitionName.textContent = competitionDisplay(tournament);
      elements.tournamentName.textContent = seasonLabel;
      elements.tournamentMeta.textContent = [
        tournament.division,
        tournament.group_name,
        tournament.playoff_status,
        formatPeriod(
          tournament.display_start_date ||
          tournament.chronology_date ||
          tournament.start_date,
          tournament.display_end_date ||
          tournament.chronology_end_date ||
          tournament.end_date ||
          tournament.display_start_date ||
          tournament.chronology_date ||
          tournament.start_date
        )
      ].filter(Boolean).join(" · ");
      setTeamAvatar(team);
  
      elements.tournamentLinks.replaceChildren();
      const teamHistoryLink = document.createElement("a");
      teamHistoryLink.className = "profile-action-link";
      teamHistoryLink.href = teamUrl(localTeamId);
      teamHistoryLink.textContent = "Visa hela laghistoriken";
      elements.tournamentLinks.append(teamHistoryLink);
  
      const overviewLink = document.createElement("a");
      overviewLink.className = "profile-action-link";
      overviewLink.href = tournamentUrl(leagueId);
      overviewLink.textContent = "Visa hela turneringen";
      elements.tournamentLinks.append(overviewLink);
  
      if (tournament.sports_gamer_tournament_url || tournament.source_url) {
        const external = document.createElement("a");
        external.className = "profile-action-link";
        external.href = tournament.sports_gamer_tournament_url || tournament.source_url;
        external.target = "_blank";
        external.rel = "noopener noreferrer";
        external.textContent = "Extern turneringssida ↗";
        elements.tournamentLinks.append(external);
      }
  
      const games = nullableNumber(tournament.games_played) ??
        number(tournament.regular_games) + number(tournament.playoff_games);
      const wins = number(tournament.wins);
      const losses = number(tournament.losses);
      const goalsFor = nullableNumber(tournament.goals_for);
      const goalsAgainst = nullableNumber(tournament.goals_against);
      const goalDiff = nullableNumber(tournament.goal_diff) ??
        (goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : null);
  
      elements.gamesCount.textContent = formatInteger(games, "0");
      elements.winsCount.textContent = formatInteger(wins, "0");
      elements.lossesCount.textContent = formatInteger(losses, "0");
      elements.winPercentage.textContent = games ? `${Math.round((wins / games) * 100)}%` : "–";
      elements.goalsRecord.textContent = goalsFor !== null && goalsAgainst !== null
        ? `${formatInteger(goalsFor, "0")}–${formatInteger(goalsAgainst, "0")}`
        : "–";
      elements.goalDifference.textContent = formatSigned(goalDiff);
  
      elements.regularRecord.textContent = `${number(tournament.regular_wins)}–${number(tournament.regular_losses)}`;
      elements.regularDetails.replaceChildren();
      addStat(elements.regularDetails, "Matcher", formatInteger(tournament.regular_games, "0"));
      addStat(elements.regularDetails, "Vinster", formatInteger(tournament.regular_wins, "0"));
      addStat(elements.regularDetails, "Förluster", formatInteger(tournament.regular_losses, "0"));
      addStat(elements.regularDetails, "Övertidsvinster", formatInteger(tournament.regular_overtime_wins, "0"));
      addStat(elements.regularDetails, "Övertidsförluster", formatInteger(tournament.regular_overtime_losses, "0"));
      addStat(elements.regularDetails, "Tabellplacering", tournament.table_position ? `#${tournament.table_position}` : "–");
  
      elements.playoffRecord.textContent = `${number(tournament.playoff_wins)}–${number(tournament.playoff_losses)}`;
      elements.playoffDetails.replaceChildren();
      addStat(elements.playoffDetails, "Matcher", formatInteger(tournament.playoff_games, "0"));
      addStat(elements.playoffDetails, "Resultat", tournament.playoff_status || "–");
      addStat(elements.playoffDetails, "Runda", tournament.playoff_round || "–");
      addStat(elements.playoffDetails, "Slutplacering", tournament.final_placement ? `#${tournament.final_placement}` : "–");
      addStat(elements.playoffDetails, "Grundserieseed", tournament.regular_season_seed ? `#${tournament.regular_season_seed}` : "–");
  
      renderRoster(players, localTeamId);
      renderMatches(matches, tournamentTeamId);
    }
  
    function showError(error) {
      console.error(error);
      elements.errorMessage.textContent = error instanceof Error ? error.message : String(error);
      elements.errorNotice.hidden = false;
      elements.tournamentPage.hidden = true;
    }
  
    async function load() {
      const { teamId, leagueId } = getIds();
      elements.errorNotice.hidden = true;
      elements.setupNotice.hidden = true;
      elements.loadingState.hidden = false;
      elements.tournamentPage.hidden = true;
      elements.reloadButton.disabled = true;
  
      if (!teamId || !leagueId) {
        showError(new Error("Länken saknar ett giltigt lag- eller turnerings-ID."));
        elements.loadingState.hidden = true;
        elements.reloadButton.disabled = false;
        return;
      }
      if (!hasValidConfig()) {
        elements.loadingState.hidden = true;
        elements.setupNotice.hidden = false;
        elements.reloadButton.disabled = false;
        return;
      }
  
      try {
        const routeQuery = window.SEH_ROUTE?.query || new URLSearchParams();

        const linkedTeamName = clean(routeQuery.get("teamName"));
        const linkedTeamCurrentName = clean(routeQuery.get("teamCurrentName"));
        const linkedTeamExternalId = clean(routeQuery.get("teamExternalId"));

        const normalizeName = (value) =>
          clean(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("sv-SE")
            .replace(/[^\p{L}\p{N}]+/gu, "");

        const wantedNames = new Set(
          [linkedTeamName, linkedTeamCurrentName]
            .map(normalizeName)
            .filter(Boolean)
        );

        const externalNumberMatch =
          linkedTeamExternalId.match(/(?:^|:)(\d+)$/);

        const wantedSportsGamerTeamId = externalNumberMatch
          ? externalNumberMatch[1]
          : /^\d+$/.test(linkedTeamExternalId)
            ? linkedTeamExternalId
            : "";

        const rowNames = (row) => [
          row?.current_name,
          row?.name_used_in_tournament,
          row?.team_name_in_tournament,
          row?.team_current_name,
          ...(Array.isArray(row?.historical_names) ? row.historical_names : []),
          ...(Array.isArray(row?.names_used_in_leagues) ? row.names_used_in_leagues : [])
        ]
          .map(normalizeName)
          .filter(Boolean);

        const nameMatches = (row) => {
          if (!wantedNames.size) return false;
          return rowNames(row).some((name) => wantedNames.has(name));
        };

        const sportsGamerIdMatches = (row) => {
          if (!wantedSportsGamerTeamId) return false;

          if (
            String(
              row?.sports_gamer_team_id ||
              row?.sports_gamer_team_external_id ||
              ""
            ) === wantedSportsGamerTeamId
          ) {
            return true;
          }

          const ids = Array.isArray(row?.sports_gamer_team_ids)
            ? row.sports_gamer_team_ids.map(String)
            : [];

          return ids.includes(wantedSportsGamerTeamId);
        };

        // ==================================================
        // A. Local Svensk eHockey team
        // ==================================================
        const routeTeamParams = new URLSearchParams({
          select: "*",
          team_id: `eq.${teamId}`,
          limit: "1"
        });

        let localTeamRows = await fetchJson(
          "v_local_team_list",
          routeTeamParams
        );

        let localTeamRow = localTeamRows[0] || null;

        if (
          !localTeamRow ||
          (
            (wantedNames.size || wantedSportsGamerTeamId) &&
            !nameMatches(localTeamRow) &&
            !sportsGamerIdMatches(localTeamRow)
          )
        ) {
          const allLocalParams = new URLSearchParams({
            select: "*",
            limit: "5000"
          });

          const allLocalTeams = await fetchJson(
            "v_local_team_list",
            allLocalParams
          );

          localTeamRow =
            allLocalTeams.find((row) => sportsGamerIdMatches(row)) ||
            allLocalTeams.find((row) => nameMatches(row)) ||
            localTeamRow;
        }

        const localTeamId =
          Number(localTeamRow?.team_id) ||
          teamId;

        // ==================================================
        // B. Fetch BOTH team-tournament rows and player rows
        // for the league. Older imports are not guaranteed to
        // exist in the team-tournament view, but their player
        // rows do exist because "Alla turneringar" came from
        // that history.
        // ==================================================
        const leagueTournamentParams = new URLSearchParams({
          select: "*",
          league_id: `eq.${leagueId}`,
          limit: "5000"
        });

        const leaguePlayerParams = new URLSearchParams({
          select: "*",
          league_id: `eq.${leagueId}`,
          limit: "5000"
        });

        const [leagueTeams, leaguePlayers] = await Promise.all([
          fetchJson(
            "v_ehockey_team_tournaments_web_v14",
            leagueTournamentParams
          ).catch(() => []),
          fetchJson(
            "v_ehockey_player_tournaments_web_v14",
            leaguePlayerParams
          ).catch(() => [])
        ]);

        // ==================================================
        // C. Resolve tournament/source team.
        // ==================================================
        let tournamentRow =
          leagueTeams.find((row) =>
            Number(row.team_id) === teamId &&
            (!wantedNames.size || nameMatches(row))
          ) ||
          leagueTeams.find((row) => sportsGamerIdMatches(row)) ||
          leagueTeams.find((row) => nameMatches(row)) ||
          null;

        let matchedPlayerRows = leaguePlayers.filter((row) =>
          sportsGamerIdMatches(row) ||
          nameMatches(row)
        );

        if (!matchedPlayerRows.length && localTeamRow) {
          const localNames = new Set(rowNames(localTeamRow));

          matchedPlayerRows = leaguePlayers.filter((row) =>
            rowNames(row).some((name) => localNames.has(name))
          );
        }

        if (!matchedPlayerRows.length) {
          matchedPlayerRows = leaguePlayers.filter((row) =>
            Number(row.team_id) === teamId
          );
        }

        if (!tournamentRow && localTeamRow) {
          const localNames = new Set(rowNames(localTeamRow));

          tournamentRow =
            leagueTeams.find((row) =>
              rowNames(row).some((name) => localNames.has(name))
            ) ||
            null;
        }

        // ==================================================
        // D. FALLBACK FOR OLD ECL / SM / SEC:
        // if the team-tournament row does not exist, build the
        // page from the matching player-tournament rows instead
        // of returning "Laget eller turneringen hittades inte".
        // ==================================================
        if (!tournamentRow && matchedPlayerRows[0]) {
          const source = matchedPlayerRows[0];

          tournamentRow = {
            team_id: source.team_id,
            sports_gamer_team_id:
              source.sports_gamer_team_id ||
              wantedSportsGamerTeamId ||
              null,
            current_name:
              source.team_current_name ||
              linkedTeamCurrentName ||
              linkedTeamName ||
              source.team_name_in_tournament ||
              "Okänt lag",
            name_used_in_tournament:
              source.team_name_in_tournament ||
              linkedTeamName ||
              source.team_current_name ||
              "Okänt lag",
            competition_code: source.competition_code,
            competition_name: source.competition_name,
            season_label: source.season_label,
            season_number: source.season_number,
            season_year: source.season_year,
            season_period: source.season_period,
            league_id: source.league_id || leagueId,
            external_league_id: source.external_league_id,
            league_name: source.league_name,
            division: source.division,
            division_key: source.division_key,
            display_start_date:
              source.display_start_date ||
              source.chronology_date ||
              source.start_date,
            display_end_date:
              source.display_end_date ||
              source.chronology_end_date ||
              source.end_date,
            chronology_date: source.chronology_date,
            chronology_end_date: source.chronology_end_date,
            start_date: source.start_date,
            end_date: source.end_date,
            games_played: 0,
            wins: 0,
            losses: 0,
            regular_games: 0,
            regular_wins: 0,
            regular_losses: 0,
            regular_overtime_wins: 0,
            regular_overtime_losses: 0,
            playoff_games: 0,
            playoff_wins: 0,
            playoff_losses: 0,
            goals_for: null,
            goals_against: null,
            goal_diff: null
          };
        }

        if (!tournamentRow) {
          throw new Error(
            `Ingen lagrad lagsida hittades för ${linkedTeamName || linkedTeamCurrentName || "laget"} i turnering ${leagueId}.`
          );
        }

        const tournamentTeamId =
          Number(tournamentRow.team_id) ||
          Number(matchedPlayerRows[0]?.team_id) ||
          teamId;

        // Use already matched league players first. This is crucial
        // for old imports where the source team id differs between
        // tables.
        let players = matchedPlayerRows;

        if (!players.length && tournamentTeamId) {
          const playerParams = new URLSearchParams({
            select: "*",
            team_id: `eq.${tournamentTeamId}`,
            league_id: `eq.${leagueId}`,
            limit: "1000"
          });

          players = await fetchJson(
            "v_ehockey_player_tournaments_web_v14",
            playerParams
          ).catch(() => []);
        }

        // Matches are optional for older imports. Failure/no rows
        // should not block the whole team-tournament page.
        let matches = [];

        if (tournamentTeamId) {
          const matchParams = new URLSearchParams({
            select: "*",
            league_id: `eq.${leagueId}`,
            or: `(home_team_id.eq.${tournamentTeamId},away_team_id.eq.${tournamentTeamId})`,
            order: "played_at.asc.nullslast",
            limit: "1000"
          });

          matches = await fetchJson(
            "v_ehockey_team_tournament_matches_all",
            matchParams
          ).catch(() => []);
        }

        const teamForRender = localTeamRow || {
          team_id: localTeamId,
          current_name:
            tournamentRow.current_name ||
            tournamentRow.name_used_in_tournament ||
            linkedTeamCurrentName ||
            linkedTeamName ||
            "Okänt lag",
          logo_url:
            tournamentRow.logo_url ||
            tournamentRow.team_logo_url ||
            "",
          logo_path:
            tournamentRow.logo_path ||
            tournamentRow.team_logo_path ||
            ""
        };

        console.info(
          "Svensk eHockey lagturnering V31:",
          {
            routeTeamId: teamId,
            localTeamId,
            tournamentTeamId,
            leagueId,
            linkedTeamName,
            linkedTeamCurrentName,
            linkedTeamExternalId,
            teamTournamentRowsInLeague: leagueTeams.length,
            playerRowsInLeague: leaguePlayers.length,
            matchedPlayerRows: players.length,
            usedPlayerFallback:
              !leagueTeams.some((row) => row === tournamentRow)
          }
        );

        render(
          teamForRender,
          tournamentRow,
          players,
          matches,
          localTeamId,
          tournamentTeamId,
          leagueId
        );

        elements.tournamentPage.hidden = false;
      } catch (error) {
        showError(error);
      } finally {
        elements.loadingState.hidden = true;
        elements.reloadButton.disabled = false;
      }
    }
  
    elements.reloadButton.addEventListener("click", load);
    load();
  })();
}


function SEH_initTournament() {
  /* ======================================================
     ROUTE CONTROLLER: tournament
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const APP_BUILD = "2026-08-11-hash-spa-v1-appearance-chronology-v11";
    const PAGE_SIZE = 1000;
    const config = window.EHOCKEY_CONFIG || {};
  
    const elements = {
      reloadButton: document.querySelector("#reloadButton"),
      setupNotice: document.querySelector("#setupNotice"),
      errorNotice: document.querySelector("#errorNotice"),
      errorMessage: document.querySelector("#errorMessage"),
      loadingState: document.querySelector("#loadingState"),
      page: document.querySelector("#tournamentOverview"),
      competitionName: document.querySelector("#competitionName"),
      tournamentTitle: document.querySelector("#tournamentTitle"),
      tournamentDescription: document.querySelector("#tournamentDescription"),
      tournamentExternalLinks: document.querySelector("#tournamentExternalLinks"),
      leagueIdValue: document.querySelector("#leagueIdValue"),
      tournamentPeriod: document.querySelector("#tournamentPeriod"),
      metricTeams: document.querySelector("#metricTeams"),
      metricPlayers: document.querySelector("#metricPlayers"),
      metricLinkedPlayers: document.querySelector("#metricLinkedPlayers"),
      metricMatches: document.querySelector("#metricMatches"),
      metricPlayedMatches: document.querySelector("#metricPlayedMatches"),
      metricWalkovers: document.querySelector("#metricWalkovers"),
      metricSeries: document.querySelector("#metricSeries"),
      metricPlayoffMatches: document.querySelector("#metricPlayoffMatches"),
      metricReconstructed: document.querySelector("#metricReconstructed"),
      standingsCount: document.querySelector("#standingsCount"),
      standingsContainer: document.querySelector("#standingsContainer"),
      teamsCount: document.querySelector("#teamsCount"),
      teamsGrid: document.querySelector("#teamsGrid"),
      matchesCount: document.querySelector("#matchesCount"),
      stageFilter: document.querySelector("#stageFilter"),
      statusFilter: document.querySelector("#statusFilter"),
      teamFilter: document.querySelector("#teamFilter"),
      matchesList: document.querySelector("#matchesList"),
      statisticsCount: document.querySelector("#statisticsCount"),
      skaterStatsBody: document.querySelector("#skaterStatsBody"),
      goalieStatsBody: document.querySelector("#goalieStatsBody"),
      playoffsCount: document.querySelector("#playoffsCount"),
      playoffBracket: document.querySelector("#playoffBracket")
    };
  
    const state = {
      leagueId: null,
      tournamentRows: [],
      players: [],
      matches: [],
      teams: new Map(),
      series: []
    };
  
    console.info("Svensk eHockey turneringsöversikt build:", APP_BUILD);
  
    function validConfig() {
      return typeof config.supabaseUrl === "string" &&
        /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl.trim()) &&
        typeof config.supabasePublishableKey === "string" &&
        config.supabasePublishableKey.trim().length > 20 &&
        !config.supabasePublishableKey.includes("KLISTRA_IN");
    }
  
    function clean(value) {
      return String(value ?? "").trim();
    }
  
    function number(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  
    function nullableNumber(value) {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  
    function booleanValue(value) {
      if (value === true || value === 1 || value === "1") return true;
      return ["true", "yes", "y", "ja"].includes(clean(value).toLowerCase());
    }
  
    function firstValue(row, keys, fallback = "") {
      for (const key of keys) {
        const value = row?.[key];
        if (value !== null && value !== undefined && value !== "") return value;
      }
      return fallback;
    }
  
    function formatInteger(value, fallback = "–") {
      const numeric = nullableNumber(value);
      return numeric === null ? fallback : numeric.toLocaleString("sv-SE");
    }
  
    function formatSigned(value, fallback = "–") {
      const numeric = nullableNumber(value);
      if (numeric === null) return fallback;
      return numeric > 0 ? `+${numeric.toLocaleString("sv-SE")}` : numeric.toLocaleString("sv-SE");
    }
  
    function formatDecimal(value, decimals = 2) {
      const numeric = nullableNumber(value);
      return numeric === null ? "–" : numeric.toLocaleString("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
  
    function formatSavePercentage(value) {
      const numeric = nullableNumber(value);
      if (numeric === null) return "–";
      const normalized = numeric > 1 ? numeric / 100 : numeric;
      return normalized.toLocaleString("sv-SE", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    }
  
    function formatDate(value) {
      if (!value) return "";
      const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
      return Number.isNaN(date.getTime())
        ? String(value).slice(0, 10)
        : new Intl.DateTimeFormat("sv-SE").format(date);
    }
  
    function formatPeriod(startValue, endValue) {
      const start = formatDate(startValue);
      const end = formatDate(endValue);
      if (start && end && start !== end) return `${start} – ${end}`;
      return start || end || "Datum saknas";
    }
  
    function countryFlag(code) {
      const normalized = clean(code).toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalized)) return "🌐";
      return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
    }
  
    function initials(name) {
      return clean(name || "EH").replace(/\([^)]*\)/g, " ").split(/\s+/).filter(Boolean)
        .slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EH";
    }
  
    function getLeagueId() {
      const value = Number(
        window.SEH_ROUTE?.params?.leagueId ||
        new URLSearchParams(location.search).get("league")
      );
      return Number.isInteger(value) && value > 0 ? value : null;
    }
  
    function apiUrl(view, params) {
      return `${config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/${view}?${params.toString()}`;
    }
  
    async function fetchJson(view, params) {
      const response = await fetch(apiUrl(view, params), {
        headers: {
          apikey: config.supabasePublishableKey.trim(),
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${view}: Supabase svarade ${response.status}. ${body || response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error(`${view}: Supabase returnerade ett oväntat svar.`);
      return data;
    }
  
    async function fetchAllPages(view, baseParams) {
      const rows = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const params = new URLSearchParams(baseParams);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        const page = await fetchJson(view, params);
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
      return rows;
    }
  
    function inferCompetitionCode(row) {
      const code = clean(row.competition_code).toUpperCase();
      if (code === "ESHL") return "ESHL";
      return code || "ÖVRIGT";
    }
  
    function competitionDisplay(row) {
      const code = inferCompetitionCode(row);
      if (code === "LGEL" || code === "SM") return code;
      return clean(row.competition_name || row.competition_code) || "Turnering";
    }
  
    function normalizedSeasonLabel(row) {
      const raw = clean(row.season_label || row.league_name || row.season_number);
      if (!raw) return "Okänd turnering";
      if (inferCompetitionCode(row) === "SEC") {
        if (/^SEC(?:\s|$)/i.test(raw)) return raw.replace(/^sec/i, "SEC");
        if (/^\d+(?:\.\d+)?(?:\s+Challenger)?$/i.test(raw)) return `SEC ${raw}`;
      }
      return raw;
    }
  
    function teamName(row) {
      return clean(row.name_used_in_tournament || row.current_name || row.team_current_name) || "Okänt lag";
    }
  
    function canonicalPlayerName(player) {
      return clean(
        player.canonical_display_gamertag ||
        player.sports_gamer_gamertag ||
        player.sportsgamer_gamertag ||
        player.display_gamertag
      ) || "Okänd spelare";
    }
  
    function teamPageUrl(teamId) {
      return `#/lag/${encodeURIComponent(teamId)}`;
    }
  
    function teamTournamentUrl(teamId) {
      return `#/lag/${encodeURIComponent(teamId)}/turnering/${encodeURIComponent(state.leagueId)}`;
    }
  
    function playerPageUrl(player) {
      return SEH_playerProfileUrl(
        player.player_key,
        canonicalPlayerName(player)
      );
    }
  
    function normalizeMatch(match, index) {
      const homeScore = nullableNumber(firstValue(match, ["home_score", "home_goals", "score_home"]));
      const awayScore = nullableNumber(firstValue(match, ["away_score", "away_goals", "score_away"]));
      const explicitResult = firstValue(match, ["has_result", "result_available", "is_played"], null);
      const hasResult = explicitResult === null
        ? homeScore !== null && awayScore !== null
        : booleanValue(explicitResult);
      const statusText = clean(firstValue(match, ["match_status", "status", "result_type", "status_code"]));
      const sourceText = clean(firstValue(match, ["statistics_source", "source_type", "source", "stats_summary"]));
      const walkover = booleanValue(firstValue(match, ["is_walkover", "walkover", "is_wo"], false)) ||
        /(^|\W)(wo|walkover)(\W|$)/i.test(statusText);
      const reconstructed = booleanValue(firstValue(match, ["is_reconstructed", "reconstructed"], false)) ||
        /rekonstru|reconstruct/i.test(`${statusText} ${sourceText}`);
      const stage = clean(firstValue(match, ["stage_name", "playoff_round", "round_name", "stage_code"], "Matcher"));
      const playoff = booleanValue(firstValue(match, ["is_playoff", "playoff"], false)) ||
        /slutspel|playoff|final|semi|quarter|kvart|brons|round\s*of/i.test(stage) ||
        clean(firstValue(match, ["series_id", "playoff_series_id", "bracket_series_id"]));
      const homeTeamId = number(firstValue(match, ["home_team_id", "team_1_id"]));
      const awayTeamId = number(firstValue(match, ["away_team_id", "team_2_id"]));
      const homeTeamName = clean(firstValue(match, ["home_team_name", "home_name", "team_1_name"], teamNameById(homeTeamId) || "Hemmalag"));
      const awayTeamName = clean(firstValue(match, ["away_team_name", "away_name", "team_2_name"], teamNameById(awayTeamId) || "Bortalag"));
      const explicitSeriesId = clean(firstValue(match, ["playoff_series_id", "series_id", "bracket_series_id", "series_key"]));
      const pairKey = [homeTeamId || homeTeamName.toLowerCase(), awayTeamId || awayTeamName.toLowerCase()]
        .sort((a, b) => String(a).localeCompare(String(b), "sv-SE", { numeric: true })).join("::");
  
      return {
        raw: match,
        id: clean(firstValue(match, ["match_id", "id", "external_match_id"], `row-${index}`)),
        homeScore,
        awayScore,
        hasResult,
        walkover,
        reconstructed,
        playoff: Boolean(playoff),
        stage,
        playedAt: firstValue(match, ["played_at", "scheduled_at", "match_date", "date"]),
        homeTeamId,
        awayTeamId,
        homeTeamName,
        awayTeamName,
        overtime: booleanValue(firstValue(match, ["overtime", "is_overtime", "went_to_overtime"], false)),
        gameNumber: nullableNumber(firstValue(match, ["game_number", "series_game_number", "match_number"])),
        seriesId: explicitSeriesId || `${stage.toLowerCase()}::${pairKey}`,
        goalsSummary: clean(firstValue(match, ["goals_summary", "events_summary", "match_summary"]))
      };
    }
  
    function teamNameById(teamId) {
      return state.teams.get(Number(teamId))?.currentName ||
        teamName(state.tournamentRows.find((row) => Number(row.team_id) === Number(teamId)) || {});
    }
  
    function matchStatus(match) {
      if (match.walkover) return "walkover";
      if (match.reconstructed) return "reconstructed";
      return match.hasResult ? "played" : "pending";
    }
  
    function matchStatusLabel(match) {
      if (match.walkover) return "WO";
      if (match.reconstructed) return "REKONSTRUERAD";
      if (!match.hasResult) return "OSPELAD";
      if (match.overtime) return "OT";
      return "SPELAD";
    }
  
    function isSportsGamerLinked(player) {
      return Boolean(clean(player.sports_gamer_player_url) ||
        firstValue(player, ["sports_gamer_player_id", "sportsgamer_player_id"]));
    }
  
    function uniquePlayers(players) {
      const map = new Map();
      players.forEach((player) => {
        const key = clean(player.player_key) ||
          clean(firstValue(player, ["sports_gamer_player_id", "sportsgamer_player_id"])) ||
          `${canonicalPlayerName(player).toLowerCase()}::${Number(player.team_id) || teamName(player).toLowerCase()}`;
        if (!map.has(key)) map.set(key, player);
      });
      return [...map.values()];
    }
  
    function buildSeries(matches) {
      const groups = new Map();
      matches.filter((match) => match.playoff).forEach((match) => {
        if (!groups.has(match.seriesId)) groups.set(match.seriesId, []);
        groups.get(match.seriesId).push(match);
      });
  
      return [...groups.entries()].map(([id, seriesMatches]) => {
        seriesMatches.sort((a, b) => number(a.gameNumber) - number(b.gameNumber) ||
          (Date.parse(a.playedAt || "") || 0) - (Date.parse(b.playedAt || "") || 0));
        const first = seriesMatches[0];
        const teamAId = first.homeTeamId;
        const teamBId = first.awayTeamId;
        const teamAName = first.homeTeamName;
        const teamBName = first.awayTeamName;
        let teamAWins = 0;
        let teamBWins = 0;
        seriesMatches.forEach((match) => {
          if (!match.hasResult || match.homeScore === null || match.awayScore === null) return;
          const homeWon = match.homeScore > match.awayScore;
          const awayWon = match.awayScore > match.homeScore;
          if (match.homeTeamId === teamAId || (!teamAId && match.homeTeamName === teamAName)) {
            if (homeWon) teamAWins += 1;
            if (awayWon) teamBWins += 1;
          } else {
            if (homeWon) teamBWins += 1;
            if (awayWon) teamAWins += 1;
          }
        });
        return {
          id,
          round: first.stage || "Slutspel",
          teamAId,
          teamBId,
          teamAName,
          teamBName,
          teamAWins,
          teamBWins,
          matches: seriesMatches
        };
      }).sort((a, b) => roundRank(a.round) - roundRank(b.round) || a.teamAName.localeCompare(b.teamAName, "sv-SE"));
    }
  
    function roundRank(round) {
      const value = clean(round).toLowerCase();
      if (/round\s*1|första|first|åtton|round of 16/.test(value)) return 10;
      if (/kvart|quarter/.test(value)) return 20;
      if (/semi/.test(value)) return 30;
      if (/brons|third/.test(value)) return 40;
      if (/final/.test(value)) return 50;
      return 25;
    }
  
    function createLink(text, href, className = "history-table-link") {
      const link = document.createElement("a");
      link.href = href;
      link.className = className;
      link.textContent = text;
      return link;
    }
  
    function textCell(value, className = "") {
      const cell = document.createElement("td");
      if (className) cell.className = className;
      cell.textContent = value;
      return cell;
    }
  
    function appendEmpty(body, columns, message) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = columns;
      cell.className = "history-table-empty";
      cell.textContent = message;
      row.append(cell);
      body.append(row);
    }
  
    function isGoalieOnlyRow(player) {
      if (player.is_goalie_only === true || player.is_goalie_only === "true") return true;
      return String(player.primary_position || "").trim().toUpperCase() === "G" &&
        number(player.total_goalie_games) > 0 &&
        number(player.total_goals) === 0 &&
        number(player.total_assists) === 0 &&
        number(player.total_points) === 0 &&
        number(player.total_goalie_games) >= number(player.total_skater_games);
    }
  
    function renderHeader() {
      const first = state.tournamentRows[0] || {};
      const title = normalizedSeasonLabel(first);
      const competition = competitionDisplay(first);
      const groups = new Set(state.tournamentRows.map((row) => clean(row.group_name)).filter(Boolean));
      const divisions = new Set(state.tournamentRows.map((row) => clean(row.division)).filter((value) => value && value.toUpperCase() !== "MAIN"));
      const start = state.tournamentRows
        .map((row) =>
          row.display_start_date ||
          row.chronology_date ||
          row.start_date
        )
        .filter(Boolean)
        .sort()[0];
  
      const end = state.tournamentRows
        .map((row) =>
          row.display_end_date ||
          row.chronology_end_date ||
          row.end_date ||
          row.display_start_date ||
          row.chronology_date ||
          row.start_date
        )
        .filter(Boolean)
        .sort()
        .at(-1);
  
      document.title = `${title} – Svensk eHockey`;
      elements.competitionName.textContent = competition;
      elements.tournamentTitle.textContent = title;
      elements.tournamentDescription.textContent = [
        `${state.tournamentRows.length.toLocaleString("sv-SE")} deltagande lag`,
        groups.size ? `${groups.size.toLocaleString("sv-SE")} grupper` : "",
        divisions.size ? [...divisions].join(", ") : ""
      ].filter(Boolean).join(" · ");
      elements.leagueIdValue.textContent = String(state.leagueId);
      elements.tournamentPeriod.textContent = formatPeriod(start, end);
  
      elements.tournamentExternalLinks.replaceChildren();
      const sourceUrl = clean(first.sports_gamer_tournament_url || first.source_url);
      if (sourceUrl) {
        const link = createLink("Extern turneringssida ↗", sourceUrl, "profile-action-link");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        elements.tournamentExternalLinks.append(link);
      }
    }
  
    function renderMetrics() {
      const unique = uniquePlayers(state.players);
      const linked = unique.filter(isSportsGamerLinked).length;
      const played = state.matches.filter((match) => match.hasResult).length;
      const walkovers = state.matches.filter((match) => match.walkover).length;
      const playoffMatches = state.matches.filter((match) => match.playoff && match.hasResult).length;
      const reconstructed = state.matches.filter((match) => match.playoff && match.reconstructed).length;
  
      elements.metricTeams.textContent = state.tournamentRows.length.toLocaleString("sv-SE");
      elements.metricPlayers.textContent = unique.length.toLocaleString("sv-SE");
      elements.metricLinkedPlayers.textContent = `${linked.toLocaleString("sv-SE")} SportsGamer-kopplade`;
      elements.metricMatches.textContent = state.matches.length.toLocaleString("sv-SE");
      elements.metricPlayedMatches.textContent = `${played.toLocaleString("sv-SE")} med resultat`;
      elements.metricWalkovers.textContent = walkovers.toLocaleString("sv-SE");
      elements.metricSeries.textContent = state.series.length.toLocaleString("sv-SE");
      elements.metricPlayoffMatches.textContent = playoffMatches.toLocaleString("sv-SE");
      elements.metricReconstructed.textContent = reconstructed ? `${reconstructed.toLocaleString("sv-SE")} rekonstruerade` : "";
    }
  
    function standingsSort(a, b) {
      const positionA = nullableNumber(a.table_position);
      const positionB = nullableNumber(b.table_position);
      if (positionA !== null || positionB !== null) {
        return (positionA ?? 9999) - (positionB ?? 9999);
      }
      return number(b.table_points) - number(a.table_points) ||
        number(b.goal_diff) - number(a.goal_diff) ||
        number(b.goals_for) - number(a.goals_for) ||
        teamName(a).localeCompare(teamName(b), "sv-SE");
    }
  
    function renderStandings() {
      elements.standingsContainer.replaceChildren();
      const groups = new Map();
      state.tournamentRows.forEach((row) => {
        const key = clean(row.group_name) || "Tabell";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      });
  
      [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "sv-SE", { numeric: true })).forEach(([group, rows]) => {
        const article = document.createElement("article");
        article.className = "history-alltime-card tournament-standing-card";
        const heading = document.createElement("h3");
        heading.textContent = group;
        const wrap = document.createElement("div");
        wrap.className = "history-table-wrap";
        const table = document.createElement("table");
        table.className = "history-table tournament-standing-table";
        table.innerHTML = "<thead><tr><th>#</th><th>Lag</th><th>GP</th><th>V</th><th>F</th><th>ÖV</th><th>ÖF</th><th>GF</th><th>GA</th><th>+/−</th><th>P</th></tr></thead>";
        const body = document.createElement("tbody");
  
        [...rows].sort(standingsSort).forEach((row, index) => {
          const teamId = Number(row.team_id);
          const tr = document.createElement("tr");
          const teamCell = document.createElement("td");
          teamCell.append(createLink(teamName(row), teamTournamentUrl(teamId)));
          tr.append(
            textCell(formatInteger(row.table_position, String(index + 1))),
            teamCell,
            textCell(formatInteger(row.regular_games ?? row.games_played, "0")),
            textCell(formatInteger(row.regular_wins ?? row.wins, "0")),
            textCell(formatInteger(row.regular_losses ?? row.losses, "0")),
            textCell(formatInteger(row.regular_overtime_wins ?? row.overtime_wins, "0")),
            textCell(formatInteger(row.regular_overtime_losses ?? row.overtime_losses, "0")),
            textCell(formatInteger(row.goals_for, "0")),
            textCell(formatInteger(row.goals_against, "0")),
            textCell(formatSigned(row.goal_diff, "0")),
            textCell(formatInteger(row.table_points, "0"), "history-highlight-cell")
          );
          body.append(tr);
        });
        table.append(body);
        wrap.append(table);
        article.append(heading, wrap);
        elements.standingsContainer.append(article);
      });
  
      elements.standingsCount.textContent = `${groups.size.toLocaleString("sv-SE")} ${groups.size === 1 ? "tabell" : "tabeller"}`;
    }
  
    function teamLogo(teamRow, tournamentRow) {
      return clean(teamRow?.logo_url || teamRow?.logo_path || tournamentRow.logo_url || tournamentRow.logo_path);
    }
  
    function renderTeams() {
      elements.teamsGrid.replaceChildren();
      [...state.tournamentRows].sort((a, b) => teamName(a).localeCompare(teamName(b), "sv-SE"))
        .forEach((row) => {
          const teamId = Number(row.team_id);
          const linkedTeam = state.teams.get(teamId);
          const article = document.createElement("article");
          article.className = "tournament-team-card";
          const avatar = document.createElement("div");
          avatar.className = "tournament-team-card__logo";
          const logo = teamLogo(linkedTeam, row);
          if (logo) {
            const image = document.createElement("img");
            image.src = logo;
            image.alt = "";
            image.addEventListener("error", () => {
              avatar.replaceChildren();
              avatar.textContent = initials(teamName(row));
            });
            avatar.append(image);
          } else {
            avatar.textContent = initials(teamName(row));
          }
          const copy = document.createElement("div");
          const title = document.createElement("h3");
          title.append(createLink(teamName(row), teamTournamentUrl(teamId)));
          const meta = document.createElement("p");
          meta.textContent = [
            clean(row.group_name),
            clean(row.division),
            row.table_position ? `#${row.table_position} i tabellen` : "",
            clean(row.playoff_status)
          ].filter(Boolean).join(" · ");
          const links = document.createElement("div");
          links.className = "tournament-team-card__links";
          links.append(
            createLink("Turneringssida →", teamTournamentUrl(teamId), "tournament-external-link"),
            createLink("Laghistorik", teamPageUrl(teamId), "tournament-external-link tournament-external-link--muted")
          );
          copy.append(title, meta, links);
          article.append(avatar, copy);
          elements.teamsGrid.append(article);
        });
      elements.teamsCount.textContent = `${state.tournamentRows.length.toLocaleString("sv-SE")} lag`;
    }
  
    function buildFilters() {
      const currentStage = elements.stageFilter.value;
      const currentTeam = elements.teamFilter.value;
      const stages = [...new Set(state.matches.map((match) => match.stage).filter(Boolean))]
        .sort((a, b) => roundRank(a) - roundRank(b) || a.localeCompare(b, "sv-SE", { numeric: true }));
      elements.stageFilter.innerHTML = '<option value="all">Alla faser</option>';
      stages.forEach((stage) => {
        const option = document.createElement("option");
        option.value = stage;
        option.textContent = stage;
        elements.stageFilter.append(option);
      });
      if ([...elements.stageFilter.options].some((option) => option.value === currentStage)) {
        elements.stageFilter.value = currentStage;
      }
  
      elements.teamFilter.innerHTML = '<option value="all">Alla lag</option>';
      [...state.tournamentRows].sort((a, b) => teamName(a).localeCompare(teamName(b), "sv-SE"))
        .forEach((row) => {
          const option = document.createElement("option");
          option.value = String(row.team_id);
          option.textContent = teamName(row);
          elements.teamFilter.append(option);
        });
      if ([...elements.teamFilter.options].some((option) => option.value === currentTeam)) {
        elements.teamFilter.value = currentTeam;
      }
    }
  
    function matchScore(match) {
      return match.hasResult && match.homeScore !== null && match.awayScore !== null
        ? `${match.homeScore}–${match.awayScore}`
        : "–";
    }
  
    function renderMatches() {
      const stage = elements.stageFilter.value;
      const status = elements.statusFilter.value;
      const teamId = elements.teamFilter.value;
      const filtered = state.matches.filter((match) => {
        if (stage !== "all" && match.stage !== stage) return false;
        if (status !== "all" && matchStatus(match) !== status) return false;
        if (teamId !== "all" && ![match.homeTeamId, match.awayTeamId].includes(Number(teamId))) return false;
        return true;
      }).sort((a, b) => {
        const dateDifference = (Date.parse(a.playedAt || "") || 0) - (Date.parse(b.playedAt || "") || 0);
        return dateDifference || roundRank(a.stage) - roundRank(b.stage) || number(a.gameNumber) - number(b.gameNumber);
      });
  
      elements.matchesList.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "directory-empty";
        empty.innerHTML = "<strong>Inga matcher hittades.</strong><span>Prova ett annat filter.</span>";
        elements.matchesList.append(empty);
      }
  
      filtered.forEach((match) => {
        const article = document.createElement("article");
        article.className = `tournament-global-match tournament-global-match--${matchStatus(match)}`;
        const meta = document.createElement("div");
        meta.className = "tournament-global-match__meta";
        const chip = document.createElement("span");
        chip.className = `match-status-chip match-status-chip--${matchStatus(match)}`;
        chip.textContent = matchStatusLabel(match);
        const details = document.createElement("small");
        details.textContent = [formatDate(match.playedAt), match.stage, match.gameNumber ? `Match ${match.gameNumber}` : ""]
          .filter(Boolean).join(" · ");
        meta.append(chip, details);
  
        const score = document.createElement("div");
        score.className = "tournament-global-match__score";
        const home = createLink(match.homeTeamName, match.homeTeamId ? teamTournamentUrl(match.homeTeamId) : "#");
        if (!match.homeTeamId) home.removeAttribute("href");
        const result = document.createElement("strong");
        result.textContent = matchScore(match);
        const away = createLink(match.awayTeamName, match.awayTeamId ? teamTournamentUrl(match.awayTeamId) : "#");
        if (!match.awayTeamId) away.removeAttribute("href");
        score.append(home, result, away);
        article.append(meta, score);
  
        if (match.goalsSummary) {
          const eventDetails = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "Visa matchhändelser";
          const text = document.createElement("p");
          text.textContent = match.goalsSummary;
          eventDetails.append(summary, text);
          article.append(eventDetails);
        }
        elements.matchesList.append(article);
      });
  
      elements.matchesCount.textContent = `${filtered.length.toLocaleString("sv-SE")} av ${state.matches.length.toLocaleString("sv-SE")} matcher`;
    }
  
    function renderPlayerCell(player) {
      const cell = document.createElement("td");
      const wrapper = document.createElement("span");
      wrapper.className = "tournament-player-cell";
      const playerName = canonicalPlayerName(player);
      if (clean(player.player_key)) {
        const link = createLink(playerName, playerPageUrl(player));
        link.textContent = "";
        SEH_appendFlaggedText(link, player.player_country, playerName);
        wrapper.append(link);
      } else {
        const label = document.createElement("span");
        SEH_appendFlaggedText(label, player.player_country, playerName);
        wrapper.append(label);
      }
      const externalUrl = clean(player.sports_gamer_player_url);
      if (externalUrl) {
        const external = createLink("SportsGamer ↗", externalUrl, "tournament-player-external");
        external.target = "_blank";
        external.rel = "noopener noreferrer";
        wrapper.append(external);
      }
      cell.append(wrapper);
      return cell;
    }
  
    function renderStatistics() {
      elements.skaterStatsBody.replaceChildren();
      elements.goalieStatsBody.replaceChildren();
      const players = uniquePlayers(state.players);
      const skaters = players.filter((player) => !isGoalieOnlyRow(player) && number(player.total_skater_games) > 0)
        .sort((a, b) => number(b.total_points) - number(a.total_points) ||
          number(b.total_goals) - number(a.total_goals) ||
          number(b.total_assists) - number(a.total_assists) ||
          canonicalPlayerName(a).localeCompare(canonicalPlayerName(b), "sv-SE"));
      const goalies = players.filter((player) => number(player.total_goalie_games) > 0)
        .sort((a, b) => {
          const saveA = nullableNumber(a.total_goalie_save_percentage) ?? 0;
          const saveB = nullableNumber(b.total_goalie_save_percentage) ?? 0;
          return saveB - saveA || number(b.total_goalie_games) - number(a.total_goalie_games) ||
            canonicalPlayerName(a).localeCompare(canonicalPlayerName(b), "sv-SE");
        });
  
      skaters.forEach((player, index) => {
        const row = document.createElement("tr");
        const teamCell = document.createElement("td");
        const teamId = Number(player.team_id);
        if (teamId) teamCell.append(createLink(clean(player.team_name_in_tournament) || teamNameById(teamId), teamTournamentUrl(teamId)));
        else teamCell.textContent = clean(player.team_name_in_tournament) || "–";
        row.append(
          textCell(String(index + 1)),
          renderPlayerCell(player),
          teamCell,
          textCell(formatInteger(player.total_skater_games, "0")),
          textCell(formatInteger(player.total_goals, "0")),
          textCell(formatInteger(player.total_assists, "0")),
          textCell(formatInteger(player.total_points, "0"), "history-highlight-cell"),
          textCell(formatSigned(player.total_plus_minus, "0"))
        );
        elements.skaterStatsBody.append(row);
      });
      if (!skaters.length) appendEmpty(elements.skaterStatsBody, 8, "Ingen utespelarstatistik finns för turneringen.");
  
      goalies.forEach((player, index) => {
        const row = document.createElement("tr");
        const teamCell = document.createElement("td");
        const teamId = Number(player.team_id);
        if (teamId) teamCell.append(createLink(clean(player.team_name_in_tournament) || teamNameById(teamId), teamTournamentUrl(teamId)));
        else teamCell.textContent = clean(player.team_name_in_tournament) || "–";
        row.append(
          textCell(String(index + 1)),
          renderPlayerCell(player),
          teamCell,
          textCell(formatInteger(player.total_goalie_games, "0")),
          textCell(formatInteger(player.total_goalie_saves, "0")),
          textCell(formatInteger(player.total_goalie_shots_against, "0")),
          textCell(formatSavePercentage(player.total_goalie_save_percentage), "history-highlight-cell"),
          textCell(formatDecimal(player.total_goalie_goals_against_average, 2)),
          textCell(formatInteger(player.total_goalie_shutouts, "0"))
        );
        elements.goalieStatsBody.append(row);
      });
      if (!goalies.length) appendEmpty(elements.goalieStatsBody, 9, "Ingen målvaktsstatistik finns för turneringen.");
      elements.statisticsCount.textContent = `${players.length.toLocaleString("sv-SE")} spelare`;
    }
  
    function renderPlayoffs() {
      elements.playoffBracket.replaceChildren();
      const rounds = new Map();
      state.series.forEach((series) => {
        if (!rounds.has(series.round)) rounds.set(series.round, []);
        rounds.get(series.round).push(series);
      });
  
      if (!state.series.length) {
        const empty = document.createElement("div");
        empty.className = "directory-empty";
        empty.innerHTML = "<strong>Inga slutspelsserier hittades.</strong><span>Slutspelsmatcher visas här när matchraderna innehåller slutspelsfas eller serie-ID.</span>";
        elements.playoffBracket.append(empty);
        elements.playoffsCount.textContent = "0 serier";
        return;
      }
  
      [...rounds.entries()].sort((a, b) => roundRank(a[0]) - roundRank(b[0]) || a[0].localeCompare(b[0], "sv-SE"))
        .forEach(([round, seriesRows]) => {
          const column = document.createElement("section");
          column.className = "tournament-playoff-round";
          const heading = document.createElement("h3");
          heading.textContent = round;
          column.append(heading);
  
          seriesRows.sort((a, b) => a.teamAName.localeCompare(b.teamAName, "sv-SE")).forEach((series) => {
            const card = document.createElement("article");
            card.className = "tournament-series-card";
            const winnerA = series.teamAWins > series.teamBWins;
            const winnerB = series.teamBWins > series.teamAWins;
  
            const teamA = document.createElement("div");
            if (winnerA) teamA.className = "is-winner";
            const teamALink = createLink(series.teamAName, series.teamAId ? teamTournamentUrl(series.teamAId) : "#");
            if (!series.teamAId) teamALink.removeAttribute("href");
            const scoreA = document.createElement("strong");
            scoreA.textContent = String(series.teamAWins);
            teamA.append(teamALink, scoreA);
  
            const teamB = document.createElement("div");
            if (winnerB) teamB.className = "is-winner";
            const teamBLink = createLink(series.teamBName, series.teamBId ? teamTournamentUrl(series.teamBId) : "#");
            if (!series.teamBId) teamBLink.removeAttribute("href");
            const scoreB = document.createElement("strong");
            scoreB.textContent = String(series.teamBWins);
            teamB.append(teamBLink, scoreB);
  
            const footer = document.createElement("small");
            const played = series.matches.filter((match) => match.hasResult).length;
            const reconstructed = series.matches.filter((match) => match.reconstructed).length;
            footer.textContent = [
              `${played} spelade matcher`,
              reconstructed ? `${reconstructed} rekonstruerade` : ""
            ].filter(Boolean).join(" · ");
            card.append(teamA, teamB, footer);
            column.append(card);
          });
          elements.playoffBracket.append(column);
        });
      elements.playoffsCount.textContent = `${state.series.length.toLocaleString("sv-SE")} serier`;
    }
  
    function render() {
      renderHeader();
      renderMetrics();
      renderStandings();
      renderTeams();
      buildFilters();
      renderMatches();
      renderStatistics();
      renderPlayoffs();
    }
  
    async function fetchTeams(teamIds) {
      if (!teamIds.length) return [];
      const params = new URLSearchParams({
        select: "*",
        team_id: `in.(${teamIds.join(",")})`,
        limit: "1000"
      });
      return fetchJson("v_local_team_list", params);
    }
  
    function showError(error) {
      console.error(error);
      elements.errorMessage.textContent = error instanceof Error ? error.message : String(error);
      elements.errorNotice.hidden = false;
      elements.page.hidden = true;
    }
  
    async function load() {
      state.leagueId = getLeagueId();
      elements.errorNotice.hidden = true;
      elements.setupNotice.hidden = true;
      elements.loadingState.hidden = false;
      elements.page.hidden = true;
      elements.reloadButton.disabled = true;
  
      if (!state.leagueId) {
        showError(new Error("Länken saknar ett giltigt league-ID. Öppna sidan från ett lags turneringskort."));
        elements.loadingState.hidden = true;
        elements.reloadButton.disabled = false;
        return;
      }
      if (!validConfig()) {
        elements.setupNotice.hidden = false;
        elements.loadingState.hidden = true;
        elements.reloadButton.disabled = false;
        return;
      }
  
      try {
        const common = { league_id: `eq.${state.leagueId}` };
        const [tournamentRows, players, rawMatches] = await Promise.all([
          fetchAllPages("v_ehockey_team_tournaments_web_v14", {
            ...common,
            select: "*",
            order: "group_name.asc.nullslast,table_position.asc.nullslast,current_name.asc"
          }),
          fetchAllPages("v_ehockey_player_tournaments_web_v14", {
            ...common,
            select: "*",
            order: "total_points.desc.nullslast,display_gamertag.asc"
          }),
          fetchAllPages("v_ehockey_team_tournament_matches_all", {
            ...common,
            select: "*",
            order: "played_at.asc.nullslast"
          })
        ]);
  
        if (!tournamentRows.length) throw new Error("Turneringen hittades inte i v_ehockey_team_tournaments_web_v14.");
        state.tournamentRows = tournamentRows;
        state.players = players;
        const teamIds = [...new Set(tournamentRows.map((row) => Number(row.team_id)).filter((id) => id > 0))];
        const teamRows = await fetchTeams(teamIds);
        state.teams = new Map(teamRows.map((row) => [Number(row.team_id), {
          ...row,
          currentName: clean(row.current_name) || "Okänt lag"
        }]));
        state.matches = rawMatches.map(normalizeMatch);
        state.series = buildSeries(state.matches);
        render();
        elements.page.hidden = false;
      } catch (error) {
        showError(error);
      } finally {
        elements.loadingState.hidden = true;
        elements.reloadButton.disabled = false;
      }
    }
  
    elements.reloadButton.addEventListener("click", load);
    elements.stageFilter.addEventListener("change", renderMatches);
    elements.statusFilter.addEventListener("change", renderMatches);
    elements.teamFilter.addEventListener("change", renderMatches);
    load();
  })();
}




/* GLOBAL TEAM LOGO RESOLVER */
const SEH_PLAYER_IMAGE_FILES = new Set(
  Array.isArray(window.SEH_PLAYER_IMAGE_FILES)
    ? window.SEH_PLAYER_IMAGE_FILES
    : []
);

function SEH_playerImageUrl(value, fallbackCandidate = "") {
  const fallback = "players/1DEFAULTBILDID.png";

  for (const candidate of [value, fallbackCandidate]) {
    const raw = String(candidate || "").trim();
    if (!raw) continue;

    const numericId = raw.match(/^\d+$/)?.[0];
    const localFile = raw.match(/(?:^|\/)([^/?#]+\.png)(?:[?#].*)?$/i)?.[1];
    const fileName = numericId ? `${numericId}.png` : localFile;

    if (fileName && SEH_PLAYER_IMAGE_FILES.has(fileName)) {
      return `players/${encodeURIComponent(fileName)}`;
    }

    if (/^https?:\/\//i.test(raw) && !/\/players\/\d+(?:[/?#]|$)/i.test(raw)) {
      return raw;
    }
  }

  return fallback;
}

const SEH_TEAM_LOGO_FILES = (
  window.SEH_TEAM_LOGO_FILES &&
  typeof window.SEH_TEAM_LOGO_FILES === "object"
)
  ? window.SEH_TEAM_LOGO_FILES
  : {};
const SEH_HAS_TEAM_LOGO_MANIFEST =
  Object.keys(SEH_TEAM_LOGO_FILES).length > 0;

// Historical SportsGamer team logos that are no longer represented by the
// club's current team name/logo in our local logo archive. These are used as
// verified fallbacks before initials are shown.
const SEH_TEAM_LOGO_REMOTE_OVERRIDES = Object.freeze({
  "nemesis": "https://sportsgamer.gg/storage/team-logos/171/147/IMG-20220314-WA0000_20220314-142104.png",
  "hc bisons": "https://fhr.fra1.cdn.digitaloceanspaces.com/NHLGamer/Community/uploads/monthly_2019_10/CE821323-0CCE-4C8A-A28D-A39247FDFE0E.thumb.jpeg.af47fb2589046feb52a0a61ec56a3d37.jpeg"
});

function SEH_normalizeTeamLogoLookupName(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("sv-SE");
}

function SEH_resolveLocalTeamLogo(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  const match = url.match(/^(?:\.\/)?(?:teamlogos\/)?([^/?#]+\.(?:png|jpe?g|webp))(?:[?#].*)?$/i);
  if (!match || !SEH_HAS_TEAM_LOGO_MANIFEST) {
    return url;
  }

  let requestedFile;
  try {
    requestedFile = decodeURIComponent(match[1]);
  } catch {
    requestedFile = match[1];
  }

  const key = requestedFile
    .normalize("NFC")
    .toLocaleLowerCase("sv-SE");
  const actualFile = SEH_TEAM_LOGO_FILES[key];

  return actualFile
    ? `teamlogos/${encodeURIComponent(actualFile)}`
    : "";
}

function SEH_teamLogoNameVariants(teamName) {
  const raw = String(teamName || "").trim();
  if (!raw) return [];

  const variants = new Set();

  const add = (value) => {
    const name = String(value || "").replace(/\s+/g, " ").trim();
    if (!name) return;
    variants.add(name);
    variants.add(name.normalize("NFC"));
  };

  add(raw);
  add(raw.replace(/\s+(EU|SE)$/i, ""));
  add(raw.replace(/\s+\([^)]*\)\s*$/i, ""));

  return [...variants];
}

function SEH_teamLogoCandidates(primaryUrls, teamName) {
  const result = [];
  const seen = new Set();

  const add = (value) => {
    const url = SEH_resolveLocalTeamLogo(value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    result.push(url);
  };

  (Array.isArray(primaryUrls) ? primaryUrls : [primaryUrls]).forEach(add);

  const remoteOverride =
    SEH_TEAM_LOGO_REMOTE_OVERRIDES[SEH_normalizeTeamLogoLookupName(teamName)];
  if (remoteOverride) add(remoteOverride);

  for (const name of SEH_teamLogoNameVariants(teamName)) {
    add(`teamlogos/${encodeURIComponent(name)}.png`);
    add(`teamlogos/${encodeURIComponent(name)}.webp`);
    add(`teamlogos/${encodeURIComponent(name)}.jpg`);
    add(`teamlogos/${encodeURIComponent(name)}.jpeg`);
  }

  return result;
}

function SEH_teamInitials(teamName) {
  const words = String(teamName || "")
    .replace(/\([^)]*\)/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.length
    ? words.slice(0, 2).map((word) => word[0]).join("").toUpperCase()
    : "SEH";
}

function SEH_applyTeamLogo(image, primaryUrls, teamName, fallbackNode) {
  if (!image) return;

  const candidates = SEH_teamLogoCandidates(primaryUrls, teamName);
  let index = 0;

  const tryNext = () => {
    if (index >= candidates.length) {
      if (fallbackNode) {
        fallbackNode.replaceChildren();
        fallbackNode.textContent = SEH_teamInitials(teamName);
      }
      return;
    }

    image.src = candidates[index++];
  };

  image.addEventListener("error", tryNext);
  tryNext();
}

function SEH_renderTeamLogo(container, primaryUrls, teamName, altText = "") {
  if (!container) return;

  container.replaceChildren();

  const image = document.createElement("img");
  image.alt = altText;
  image.loading = "lazy";
  container.append(image);

  SEH_applyTeamLogo(image, primaryUrls, teamName, container);
}


/* ============================================================
   V1.26.7 – KLUBBFÄRG PÅ SPELARKORT
   Hämtar en diskret tvåfärgspalett från den lokala lagloggan.
   SportsGamer-ID används aldrig här – endast visat lagnamn/logo-resolver.
   ============================================================ */
const SEH_PLAYER_CARD_DEFAULT_PALETTE = {
  primary: "#0b3855",
  secondary: "#d6b15f"
};

const SEH_PLAYER_CARD_TEAM_COLOR_PRESETS = {
  "ssk esports": { primary: "#0750a0", secondary: "#f0c51b" }
};

function SEH_playerCardTeamPaletteKey(teamName) {
  return String(teamName || "").trim().toLocaleLowerCase("sv-SE");
}

function SEH_playerCardRgbToHex(r, g, b) {
  const part = (value) => Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function SEH_playerCardColorDistance(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  );
}

function SEH_playerCardPaletteFromLogo(image) {
  try {
    if (!(image instanceof HTMLImageElement)) return null;
    if (!image.naturalWidth || !image.naturalHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.clearRect(0, 0, 40, 40);
    context.drawImage(image, 0, 0, 40, 40);
    const pixels = context.getImageData(0, 0, 40, 40).data;
    const buckets = new Map();

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha < 100) continue;

      let r = pixels[index];
      let g = pixels[index + 1];
      let b = pixels[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const light = (max + min) / 2;
      const saturation = max - min;

      /* Undvik svart/vitt/grått – vi vill åt klubbens accentfärger. */
      if (light < 24 || light > 235 || saturation < 24) continue;

      r = Math.round(r / 32) * 32;
      g = Math.round(g / 32) * 32;
      b = Math.round(b / 32) * 32;
      const key = `${r},${g},${b}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const colors = [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ rgb: key.split(",").map(Number), count }));

    if (!colors.length) return null;

    const primary = colors[0].rgb;
    const secondary = (
      colors.find((item) => SEH_playerCardColorDistance(item.rgb, primary) > 90) ||
      colors[1] ||
      colors[0]
    ).rgb;

    return {
      primary: SEH_playerCardRgbToHex(...primary),
      secondary: SEH_playerCardRgbToHex(...secondary)
    };
  } catch (_error) {
    /* Remote legacy logos can be CORS-tainted. Generic palette is safer. */
    return null;
  }
}

function SEH_applyPlayerCardTeamPalette(card, palette) {
  if (!card) return;
  const chosen = palette || SEH_PLAYER_CARD_DEFAULT_PALETTE;
  card.style.setProperty("--player-card-team-primary", chosen.primary || SEH_PLAYER_CARD_DEFAULT_PALETTE.primary);
  card.style.setProperty("--player-card-team-secondary", chosen.secondary || chosen.primary || SEH_PLAYER_CARD_DEFAULT_PALETTE.secondary);
}

function SEH_hydratePlayerCardTeamPalette(card, logoContainer, teamName) {
  if (!card || !logoContainer) return;

  const key = SEH_playerCardTeamPaletteKey(teamName);
  const configured =
    window.SEH_TEAM_COLORS?.[teamName] ||
    window.SEH_TEAM_COLORS?.[key] ||
    SEH_PLAYER_CARD_TEAM_COLOR_PRESETS[key];
  const cache = window.__SEH_PLAYER_CARD_PALETTE_CACHE_V1267__ instanceof Map
    ? window.__SEH_PLAYER_CARD_PALETTE_CACHE_V1267__
    : (window.__SEH_PLAYER_CARD_PALETTE_CACHE_V1267__ = new Map());

  SEH_applyPlayerCardTeamPalette(card, SEH_PLAYER_CARD_DEFAULT_PALETTE);
  if (configured) {
    SEH_applyPlayerCardTeamPalette(card, configured);
    return;
  }
  if (cache.has(key)) {
    SEH_applyPlayerCardTeamPalette(card, cache.get(key));
    return;
  }

  const image = logoContainer.querySelector("img");
  if (!image) return;

  const read = () => {
    const palette = SEH_playerCardPaletteFromLogo(image);
    if (!palette) return;
    cache.set(key, palette);
    SEH_applyPlayerCardTeamPalette(card, palette);
  };

  if (image.complete && image.naturalWidth) read();
  else image.addEventListener("load", read, { once: true });
}

function SEH_initShop() {
  "use strict";

  const frame = document.querySelector("#spreadshopFrame");
  const status = document.querySelector("#spreadshopStatus");

  if (!frame) return;

  const shopDocument = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <base target="_self">
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #050707;
      color: #f4f1e9;
      font-family: Arial, Helvetica, sans-serif;
    }

    #spreadshop {
      min-height: 760px;
      background: #050707;
    }

    #spreadshop > a {
      display: inline-block;
      margin: 24px;
      color: #ffcc00;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div id="spreadshop">
    <a
      href="https://svenskehockey.myspreadshop.se/"
      target="_blank"
      rel="noopener noreferrer"
    >
      Svensk eHockey Shop
    </a>
  </div>

  <script>
    /*
     * Spreadshop använder hashbang-navigation.
     * Här får den en egen URL/hash som INTE påverkar
     * Svensk eHockey-SPA:n i föräldrafönstret.
     */
    try {
      history.replaceState(null, "", "#!/all");
    } catch {}

    window.spread_shop_config = {
      shopName: "svenskehockey",
      prefix: "https://svenskehockey.myspreadshop.se",
      baseId: "spreadshop",
      locale: "sv_SE",
      startToken: "all",
      usePushState: false,
      updateMetadata: false
    };

    const sendHeight = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        760
      );

      parent.postMessage(
        {
          type: "seh-spreadshop-height",
          height
        },
        "*"
      );
    };

    window.addEventListener("load", sendHeight);
    window.addEventListener("resize", sendHeight);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(sendHeight);
      observer.observe(document.documentElement);
      observer.observe(document.body);
    }

    setInterval(sendHeight, 1000);
  <\/script>

  <script
    type="text/javascript"
    src="https://svenskehockey.myspreadshop.net/js/shopclient.nocache.js?seh=20260812v38"
  ><\/script>
</body>
</html>`;

  frame.srcdoc = shopDocument;

  const onMessage = (event) => {
    if (
      event.source !== frame.contentWindow ||
      event.data?.type !== "seh-spreadshop-height"
    ) {
      return;
    }

    const height = Math.max(
      760,
      Math.min(Number(event.data.height) || 760, 20000)
    );

    frame.style.height = `${height}px`;

    if (status) {
      status.hidden = true;
    }
  };

  window.addEventListener("message", onMessage);

  frame.addEventListener(
    "load",
    () => {
      if (status) {
        status.hidden = true;
      }
    },
    { once: true }
  );
}


(() => {
  "use strict";

  const APP_BUILD = "2026-09-07-v12972-min-profil-session-fix";

  const sehAuthState = {
    client: null,
    session: null,
    writer: null,
    initialized: false,
    initPromise: null,
    refreshToken: 0
  };

  function sehAuthRpcRow(data) {
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  }

  function sehAuthIdentifierToEmail(value) {
    const identifier = String(value || "").trim().toLowerCase();
    if (!identifier) return "";

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return identifier;
    }

    if (/^[a-z0-9._-]{2,40}$/.test(identifier)) {
      return `${identifier}@writers.svenskehockey.se`;
    }

    return "";
  }

  function sehGetAuthClient() {
    if (sehAuthState.client) return sehAuthState.client;

    const config = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
    const supabaseUrl = config.supabaseUrl || config.SUPABASE_URL || "";
    const supabaseKey = config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY || "";

    if (!window.supabase?.createClient || !supabaseUrl || !supabaseKey) {
      return null;
    }

    sehAuthState.client = window.supabase.createClient(supabaseUrl, supabaseKey);
    return sehAuthState.client;
  }

  async function sehResolveWriterAccess(client) {
    if (!client || !sehAuthState.session?.user) return null;

    try {
      const current = await client.rpc("seh_current_writer");
      if (!current.error) {
        const row = sehAuthRpcRow(current.data);
        if (row?.writer_id) return row;
      }
    } catch (error) {
      console.warn("Kunde inte läsa skribentbehörighet", error);
    }

    // Samma claim-flöde som Skrivcenter använder. För vanliga användare
    // ger detta ingen skribentroll och de fortsätter vara vanliga användare.
    try {
      const claimed = await client.rpc("seh_claim_writer");
      if (!claimed.error) {
        const row = sehAuthRpcRow(claimed.data);
        if (row?.writer_id) return row;
      }
    } catch (error) {
      console.warn("Kunde inte koppla skribentkonto", error);
    }

    return null;
  }

  function sehUpdateHeaderAuth(header = document.querySelector(".seh-header")) {
    if (!header) return;

    const sessionUser = sehAuthState.session?.user || null;
    const loggedIn = Boolean(sessionUser && !sessionUser.is_anonymous);
    const writer = sehAuthState.writer;
    const role = String(writer?.role || "").toLowerCase();
    const isWriter = Boolean(writer?.writer_id);
    const isAdmin = isWriter && role === "admin";

    const writerLink = header.querySelector('[data-seh-auth-link="writer"]');
    const adminLink = header.querySelector('[data-seh-auth-link="admin"]');
    if (writerLink) writerLink.hidden = !isWriter;
    if (adminLink) adminLink.hidden = !isAdmin;

    const authRoot = header.querySelector(".seh-auth");
    const authButton = header.querySelector("#sehAuthButton");
    const authPanel = header.querySelector("#sehAuthPanel");
    const authStatus = header.querySelector("#sehAuthStatus");

    if (authRoot) {
      authRoot.dataset.state = loggedIn ? "logged-in" : "logged-out";
    }

    if (authButton) {
      authButton.textContent = loggedIn ? "LOGGA UT" : "LOGGA IN";
      authButton.classList.toggle("is-authenticated", loggedIn);
      authButton.setAttribute("aria-label", loggedIn ? "Logga ut" : "Logga in");
      if (loggedIn) authButton.setAttribute("aria-expanded", "false");
    }

    if (loggedIn && authPanel) {
      authPanel.hidden = true;
    }

    if (loggedIn && authStatus) {
      authStatus.textContent = "";
      authStatus.removeAttribute("data-tone");
    }
  }

  async function sehRefreshAuthAccess(session) {
    const token = ++sehAuthState.refreshToken;
    const client = sehGetAuthClient();
    let nextSession = session || null;

    if (nextSession?.user?.is_anonymous) {
      try { await client?.auth.signOut(); } catch (_) {}
      nextSession = null;
    }

    sehAuthState.session = nextSession;
    sehAuthState.writer = null;
    sehUpdateHeaderAuth();

    if (!nextSession?.user || !client) return;

    const writer = await sehResolveWriterAccess(client);
    if (token !== sehAuthState.refreshToken) return;

    sehAuthState.writer = writer;
    sehUpdateHeaderAuth();
  }

  function sehInitializeAuth() {
    if (sehAuthState.initPromise) return sehAuthState.initPromise;

    sehAuthState.initPromise = (async () => {
      const client = sehGetAuthClient();
      if (!client) {
        sehAuthState.initialized = true;
        sehUpdateHeaderAuth();
        return;
      }

      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        await sehRefreshAuthAccess(data?.session || null);
      } catch (error) {
        console.warn("Kunde inte läsa Supabase-sessionen", error);
        sehAuthState.session = null;
        sehAuthState.writer = null;
        sehUpdateHeaderAuth();
      }

      client.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => {
          sehRefreshAuthAccess(session || null).catch((error) => {
            console.warn("Kunde inte uppdatera inloggningsstatus", error);
          });
        }, 0);
      });

      sehAuthState.initialized = true;
    })();

    return sehAuthState.initPromise;
  }

  window.SEH_refreshAuth = async function SEH_refreshAuth() {
    const client = sehGetAuthClient();
    if (!client) {
      sehAuthState.session = null;
      sehAuthState.writer = null;
      sehUpdateHeaderAuth();
      return;
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await sehRefreshAuthAccess(data?.session || null);
    } catch (error) {
      console.warn("Kunde inte synka inloggningsstatus", error);
    }
  };

  async function sehLoginFromHeader(header) {
    const client = sehGetAuthClient();
    const panel = header.querySelector("#sehAuthPanel");
    const form = header.querySelector("#sehAuthForm");
    const identifierInput = header.querySelector("#sehAuthIdentifier");
    const passwordInput = header.querySelector("#sehAuthPassword");
    const status = header.querySelector("#sehAuthStatus");
    const submit = form?.querySelector('button[type="submit"]');

    if (!client) {
      if (status) {
        status.textContent = "Supabase Auth kunde inte startas.";
        status.dataset.tone = "error";
      }
      return;
    }

    const email = sehAuthIdentifierToEmail(identifierInput?.value);
    const password = String(passwordInput?.value || "");

    if (!email) {
      if (status) {
        status.textContent = "Skriv ett giltigt användarnamn eller en e-postadress.";
        status.dataset.tone = "error";
      }
      identifierInput?.focus();
      return;
    }

    if (!password) {
      if (status) {
        status.textContent = "Skriv ditt lösenord.";
        status.dataset.tone = "error";
      }
      passwordInput?.focus();
      return;
    }

    if (status) {
      status.textContent = "Loggar in…";
      status.dataset.tone = "working";
    }
    if (submit) submit.disabled = true;

    try {
      // Rensar endast en eventuell gammal/trasig session innan ny inloggning.
      try { await client.auth.signOut(); } catch (_) {}

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login credentials/i.test(error.message || "")) {
          throw new Error("Fel användarnamn/e-post eller lösenord.");
        }
        throw error;
      }

      if (!data?.session?.user) throw new Error("Inloggningen misslyckades.");

      await sehRefreshAuthAccess(data.session);

      if (identifierInput) identifierInput.value = "";
      if (passwordInput) passwordInput.value = "";
      if (status) {
        status.textContent = "";
        status.removeAttribute("data-tone");
      }
      if (panel) panel.hidden = true;
      header.querySelector("#sehAuthButton")?.setAttribute("aria-expanded", "false");
    } catch (error) {
      sehAuthState.session = null;
      sehAuthState.writer = null;
      try { await client.auth.signOut(); } catch (_) {}
      sehUpdateHeaderAuth(header);
      if (status) {
        status.textContent = `Fel: ${error?.message || error}`;
        status.dataset.tone = "error";
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  const templates = {"home": "<main class=\"directory-shell portal-shell home-one-screen home-one-screen--refined\">\n<section class=\"home-stage\">\n  <div class=\"home-stage__copy\">\n    <div class=\"home-stage__eyebrow\">\n      <p class=\"directory-kicker\">SVENSK eHOCKEY / SAMLAD DATA</p>\n      <span aria-hidden=\"true\"></span>\n    </div>\n    <h1>All svensk<br>eHockey.<br><em>En plats.</em></h1>\n    <div class=\"home-stage__intro\">\n      <p class=\"home-stage__lead\">Svensk eHockey samlar statistik, historia och information om svenska spelare och lag inom eHockey – på ett ställe.</p>\n      <p class=\"home-stage__detail\">Följ ECL-säsonger, spelarprofiler, laghistorik, resultat, statistik och byten. Här finns också Svenska eHockey Cupen (SEC) och en växande historik över den svenska scenen, från enskilda spelare och lag till hela säsonger och turneringar.</p>\n    </div>\n    <div class=\"portal-support-note home-stage__support\" aria-label=\"Stöd Svensk eHockey\">\n      <span>Svensk eHockey drivs ideellt.</span>\n      <a href=\"#/stod\">Stöd Svensk eHockey <span aria-hidden=\"true\">→</span></a>\n    </div>\n  </div>\n\n  <aside class=\"home-stage__identity\" aria-label=\"Svensk eHockey\">\n    <div class=\"home-stage__identity-mark\">\n      <span class=\"home-stage__logo-glow\" aria-hidden=\"true\"></span>\n      <img src=\"assets/SeHlogga.png\" alt=\"Svensk eHockey\">\n    </div>\n    <div class=\"home-stage__identity-text\">\n      <span>SVENSK eHOCKEY</span>\n      <strong>STATISTIK · HISTORIA · SEC</strong>\n      <p>Svenska spelare och lag genom ECL-säsonger, historik och våra egna SEC-turneringar.</p>\n    </div>\n  </aside>\n</section>\n\n<section class=\"home-quicklinks\" aria-labelledby=\"homeQuicklinksTitle\">\n  <div class=\"home-quicklinks__label\">\n    <p class=\"directory-kicker\">GÅ DIREKT TILL</p>\n    <h2 id=\"homeQuicklinksTitle\">Utforska</h2>\n  </div>\n  <nav class=\"home-quicklinks__grid\" aria-label=\"Snabblänkar\">\n    <a href=\"#/nyheter\"><span>01</span><div><strong>Nyheter</strong><small>Senaste nytt från scenen</small></div><b aria-hidden=\"true\">↗</b></a>\n    <a href=\"#/spelare\"><span>02</span><div><strong>Spelare</strong><small>Profiler, klubbar & statistik</small></div><b aria-hidden=\"true\">↗</b></a>\n    <a href=\"#/laghistoria\"><span>03</span><div><strong>Laghistoria</strong><small>Svenska lag genom åren</small></div><b aria-hidden=\"true\">↗</b></a>\n    <a href=\"#/sasong/ecl26spring\"><span>04</span><div><strong>Säsonger</strong><small>ECL samlat säsong för säsong</small></div><b aria-hidden=\"true\">↗</b></a>\n    <a href=\"https://www.svenskehockey.se/SEC/\"><span>05</span><div><strong>SEC</strong><small>Svenska eHockey Cupen</small></div><b aria-hidden=\"true\">↗</b></a>\n  </nav>\n</section>\n</main>\n<footer class=\"directory-footer home-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>", "news": "\u003cmain class=\"directory-shell news-page-shell\"\u003e\n\u003csection class=\"news-page-hero\"\u003e\n\u003cdiv\u003e\n\u003cp class=\"directory-kicker\"\u003eSVENSK eHOCKEY / REDAKTIONEN\u003c/p\u003e\n\u003ch1\u003eNyheter\u003c/h1\u003e\n\u003cp\u003eArtiklar, uppdateringar och notiser från den svenska eHockeyscenen.\u003c/p\u003e\n\u003c/div\u003e\n\u003caside class=\"news-page-tools\" aria-label=\"Filtrera nyheter\"\u003e\n\u003clabel for=\"newsSearch\"\u003eSÖK I NYHETER\u003c/label\u003e\n\u003cinput id=\"newsSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Sök titel, text eller tagg…\"\u003e\n\u003cdiv class=\"news-tag-row\" id=\"newsTagFilters\"\u003e\u003c/div\u003e\n\u003csmall id=\"newsResultText\"\u003e\u003c/small\u003e\n\u003c/aside\u003e\n\u003c/section\u003e\n\u003csection class=\"news-featured\" id=\"featuredNews\" aria-label=\"Senaste huvudnyhet\"\u003e\u003c/section\u003e\n\u003csection class=\"news-card-grid\" id=\"newsGrid\" aria-label=\"Fler nyheter\"\u003e\u003c/section\u003e\n\u003c/main\u003e\n\u003cfooter class=\"directory-footer\"\u003e\u003cdiv\u003e\u003cstrong\u003eSVENSK eHOCKEY\u003c/strong\u003e\u003cspan\u003e© 2026 Svensk eHockey\u003c/span\u003e\u003c/div\u003e\u003c/footer\u003e", "players": "<main class=\"directory-shell players-shell players-shell-v122\">\n<section aria-labelledby=\"playersTitle\" class=\"players-hero players-hero-v122\">\n  <div class=\"players-hero__copy\">\n    <p class=\"directory-kicker\">SPELARREGISTER</p>\n    <h1 id=\"playersTitle\">Svenska spelare</h1>\n    <p>Samlad svensk eHockey-data med spelarprofiler, klubbhistorik, statistik och Svensk eHockey RP. Sök på gamertag, lag eller division och öppna spelaren för hela karriären.</p>\n    <div aria-label=\"Registeregenskaper\" class=\"players-hero__tags\">\n      <span>SUPABASE LIVE</span><span>RP &amp; RANKING</span><span>KARRIÄRHISTORIK</span>\n    </div>\n  </div>\n  <aside aria-label=\"Översikt\" class=\"players-overview players-overview-v122\">\n    <p class=\"directory-kicker\">ÖVERSIKT</p>\n    <div>\n      <article><span>SPELARE</span><strong id=\"overviewPlayers\">–</strong></article>\n      <article><span>UTESPELARE</span><strong id=\"overviewSkaters\">–</strong></article>\n      <article><span>MÅLVAKTER</span><strong id=\"overviewGoalies\">–</strong></article>\n      <article><span>RP-RANKADE</span><strong id=\"overviewRanked\">–</strong></article>\n    </div>\n  </aside>\n</section>\n<section aria-labelledby=\"playerDirectoryTitle\" class=\"player-directory player-directory-v122\">\n  <div class=\"players-directory-heading-v122\">\n    <div><p class=\"directory-kicker\">HITTA SPELARE</p><h2 id=\"playerDirectoryTitle\">Spelare</h2></div>\n    <p id=\"playerResultText\">Laddar svenska spelare…</p>\n  </div>\n  <div class=\"players-toolbar players-toolbar-v122\">\n    <label class=\"players-field players-field--search\"><span>SÖK</span><input autocomplete=\"off\" id=\"playerSearch\" placeholder=\"Gamertag, lag, division…\" type=\"search\"/></label>\n    <label class=\"players-field\"><span>ROLL</span><select id=\"roleFilter\"><option value=\"all\">Alla roller</option><option value=\"skater\">Utespelare</option><option value=\"goalie\">Målvakter</option></select></label>\n    <label class=\"players-field\"><span>DIVISION</span><select id=\"divisionFilter\"><option value=\"all\">Alla divisioner</option></select></label>\n    <label class=\"players-field\"><span>SORTERA</span><select id=\"playerSort\"><option value=\"ranking\">Sverige-rank</option><option value=\"average-ranking\">Snitt-rank</option><option value=\"games\">Flest matcher</option><option value=\"points\">Flest poäng</option><option value=\"clubs\">Flest klubbar</option><option value=\"name\">Namn A–Ö</option></select></label>\n    <label class=\"players-compact\"><span>VY</span><span class=\"players-compact__control\"><input id=\"compactToggle\" type=\"checkbox\"/><b>Kompakt</b></span></label>\n  </div>\n  <div aria-live=\"polite\" class=\"player-directory__grid\" id=\"playerGrid\"></div>\n  <nav aria-label=\"Sidnumrering\" class=\"player-pagination\" id=\"playerPagination\"></nav>\n</section>\n</main>\n<footer class=\"directory-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>", "history": "<main class=\"directory-shell\">\n<section aria-labelledby=\"pageTitle\" class=\"directory-hero\">\n<div class=\"directory-hero__copy\">\n<p class=\"directory-kicker\">LAGHISTORIK</p>\n<h1 id=\"pageTitle\">Svensk<br/>laghistoria</h1>\n<p>\n          Här samlas svenska lag från ECL, SCL, eSHL, SEC, ITHL, LGEL och SM.\n          Sök efter lag, spelare, turnering eller division och följ samma\n          organisation genom namnbyten och olika säsonger.\n        </p>\n</div>\n<aside aria-label=\"Översikt\" class=\"history-overview history-overview-v124\">\n<p class=\"directory-kicker\">ÖVERSIKT</p>\n<div class=\"history-overview-grid\">\n<article>\n<span>VISAR LAG</span>\n<strong id=\"visibleTeamCount\">–</strong>\n</article>\n<article>\n<span>SÄSONGER</span>\n<strong id=\"appearanceCount\">–</strong>\n</article>\n<article>\n<span>SPELARE</span>\n<strong id=\"playerCount\">–</strong>\n</article>\n<article>\n<span>ÅR AV SVENSK eHOCKEY</span>\n<strong id=\"historyYearCount\">–</strong>\n</article>\n</div>\n</aside>\n</section>\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>\n        Öppna <code>config.js</code> och fyll i projektets URL och\n        publishable key.\n      </p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta laghistoriken</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<section aria-labelledby=\"directoryTitle\" class=\"directory-section\" id=\"teamDirectory\">\n<div class=\"directory-section__heading\">\n<div>\n<p class=\"directory-kicker\">HISTORIK</p>\n<h2 id=\"directoryTitle\">Svenska lag</h2>\n</div>\n</div>\n<div aria-label=\"Filtrering och sortering\" class=\"directory-toolbar\">\n<label>\n<span class=\"sr-only\">Namnvisning</span>\n<select id=\"nameModeSelect\">\n<option value=\"current\">Visa via lagnamn</option>\n<option value=\"latest\">Visa senaste turneringsnamn</option>\n</select>\n</label>\n<label>\n<span class=\"sr-only\">Turnering</span>\n<select id=\"tournamentFilter\">\n<option value=\"all\">Alla turneringar</option>\n</select>\n</label>\n<label>\n<span class=\"sr-only\">Sortering</span>\n<select id=\"sortSelect\">\n<option value=\"name-asc\">Namn A–Ö</option>\n<option value=\"name-desc\">Namn Ö–A</option>\n<option value=\"latest\">Senast aktiv</option>\n<option value=\"games\">Flest matcher</option>\n<option value=\"wins\">Flest vinster</option>\n<option value=\"winpct\">Högst vinst%</option>\n<option value=\"tournaments\">Flest turneringar</option>\n<option value=\"players\">Flest spelare</option>\n</select>\n</label>\n<label>\n<span class=\"sr-only\">Kortstorlek</span>\n<select id=\"viewModeSelect\">\n<option value=\"full\">Hela kort</option>\n<option value=\"compact\">Kompakta kort</option>\n</select>\n</label>\n<label class=\"directory-search\">\n<span aria-hidden=\"true\" class=\"directory-search__icon\">⌕</span>\n<input autocomplete=\"off\" id=\"searchInput\" placeholder=\"Sök lag, spelare, ECL eller division\" type=\"search\"/>\n</label>\n</div>\n<div class=\"directory-resultbar\">\n<span id=\"resultText\">Laddar…</span>\n<span id=\"lastUpdated\"></span>\n</div>\n<div class=\"directory-loading\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar lag, turneringar och spelare…</p>\n</div>\n<div aria-live=\"polite\" class=\"directory-grid\" id=\"teamGrid\"></div>\n</section>\n</main>\n<footer class=\"directory-footer\">\n<div>\n<strong>SVENSK eHOCKEY</strong>\n<span>© 2026 Svensk eHockey</span>\n</div>\n<a href=\"#teamDirectory\">Till toppen ↑</a>\n</footer>\n<template id=\"teamCardTemplate\">\n<article class=\"directory-team-card\">\n<a aria-label=\"\" class=\"directory-team-card__main-link\" href=\"#\"></a>\n<span class=\"directory-team-card__number\"></span>\n<div class=\"directory-team-card__header\">\n<div aria-hidden=\"true\" class=\"directory-team-card__logo\"></div>\n<div class=\"directory-team-card__identity\">\n<h3 class=\"directory-team-card__name\"></h3>\n<p class=\"directory-team-card__identity-name\" hidden=\"\"></p>\n<div class=\"directory-team-card__badges\"></div>\n</div>\n</div>\n<dl class=\"directory-team-card__metrics\">\n<div><dt>SPELARE</dt><dd class=\"metric-players\">–</dd></div>\n<div><dt>TURNERINGAR</dt><dd class=\"metric-tournaments\">–</dd></div>\n<div><dt>DIVISIONER</dt><dd class=\"metric-divisions\">–</dd></div>\n<div><dt>MATCHER</dt><dd class=\"metric-games\">–</dd></div>\n<div><dt>RECORD</dt><dd class=\"metric-record\">–</dd></div>\n<div><dt>VINST%</dt><dd class=\"metric-winpct\">–</dd></div>\n<div><dt>GF–GA</dt><dd class=\"metric-goals\">–</dd></div>\n<div><dt>+/−</dt><dd class=\"metric-diff\">–</dd></div>\n<div><dt>SLUTSPEL</dt><dd class=\"metric-playoffs\">–</dd></div>\n</dl>\n<div class=\"directory-team-card__summary\">\n<p><strong>Topp spelare:</strong> <a class=\"summary-top-player\" href=\"#\">–</a></p>\n<p><strong>Senast:</strong> <span class=\"summary-latest\">–</span></p>\n<p class=\"summary-alias-row\"><strong>Namnvariationer:</strong> <span class=\"summary-aliases\">–</span></p>\n</div>\n<div class=\"directory-team-card__action\">\n        Öppna laghistoriken <span aria-hidden=\"true\">→</span>\n</div>\n</article>\n</template>", "player": "<div class=\"page-shell history-page-shell player-profile-shell player-profile-shell-v123\">\n  <nav aria-label=\"Navigering\" class=\"page-nav history-nav player-profile-legacy-nav\">\n    <a class=\"back-button\" href=\"#/spelare\" id=\"backLink\">← Tillbaka till spelare</a>\n    <button class=\"reload-button\" id=\"reloadButton\" type=\"button\">Uppdatera</button>\n  </nav>\n\n  <section class=\"notice notice-warning\" hidden id=\"setupNotice\"><h2>Anslut sidan till Supabase</h2><p>Öppna <code>config.js</code> och fyll i projektets URL och publishable key.</p></section>\n  <section class=\"notice notice-error\" hidden id=\"errorNotice\"><h2>Kunde inte hämta spelaren</h2><p id=\"errorMessage\"></p></section>\n\n  <main hidden id=\"playerPage\" class=\"player-profile-page-v5 player-profile-page-v123\">\n    <div class=\"player-profile-hero-frame-v123\">\n      <section class=\"player-profile-hero-v123\" aria-label=\"Spelarprofil\">\n        <div class=\"player-profile-hero-grid-v123\" aria-hidden=\"true\"></div>\n        <div class=\"player-profile-watermark-v123\" id=\"playerHeroWatermark\" aria-hidden=\"true\"></div>\n\n        <div class=\"player-profile-portrait-v123\">\n          <div class=\"player-profile-portrait-glow-v123\" aria-hidden=\"true\"></div>\n          <div class=\"player-profile-portrait-watermark-v123\" id=\"playerPortraitWatermark\" aria-hidden=\"true\"></div>\n          <div aria-hidden=\"true\" class=\"profile-detail-avatar player-editorial-photo\" id=\"playerAvatar\"></div>\n          <span class=\"player-profile-portrait-tag-v123\">SVENSK eHOCKEY</span>\n        </div>\n\n        <div class=\"player-profile-identity-v123\">\n          <p class=\"player-profile-kicker-v123\"><span id=\"playerFlag\" aria-hidden=\"true\">🇸🇪</span><span>SPELARPROFIL</span></p>\n          <h1 id=\"playerName\">Laddar spelare…</h1>\n\n          <div class=\"player-profile-team-v123\">\n            <span class=\"player-profile-team-logo-v123\" id=\"playerCurrentTeamLogo\" aria-hidden=\"true\"></span>\n            <span class=\"player-editorial-team\" id=\"playerCurrentTeam\">–</span>\n          </div>\n\n          <div class=\"player-profile-context-v123\">\n            <p class=\"player-profile-meta-v123\" id=\"playerMeta\">–</p>\n            <p class=\"player-profile-leagues-v123\" id=\"playerCompetitions\"></p>\n          </div>\n\n          <section class=\"player-editorial-stats player-profile-career-v123\" aria-label=\"Offensiv karriärstatistik\">\n            <article><span>POÄNG</span><strong id=\"careerPoints\">–</strong></article>\n            <article><span>MÅL</span><strong id=\"careerGoals\">–</strong></article>\n            <article><span>ASSIST</span><strong id=\"careerAssists\">–</strong></article>\n          </section>\n        </div>\n\n        <aside class=\"player-profile-ranking-v123\" aria-label=\"Svensk eHockey RP\">\n          <div class=\"player-profile-ranking-label-v123\"><span>SEH</span><b>RANKING</b></div>\n          <div class=\"player-profile-ranking-main-v123\">\n            <span>SVENSK eHOCKEY RP</span>\n            <strong id=\"heroTotalRp\">–</strong>\n            <small>RANKING POINTS</small>\n          </div>\n          <div class=\"player-profile-ranking-grid-v123\">\n            <article><span>SVERIGE</span><strong id=\"heroSwedenRank\">–</strong></article>\n            <article><span>SNITT-RP</span><strong id=\"heroAverageRp\">–</strong></article>\n            <article><span>POSITIONSRANK</span><strong id=\"heroPositionRank\">–</strong></article>\n          </div>\n        </aside>\n      </section>\n\n      <section class=\"player-profile-strip-v123\" aria-label=\"Spelaröversikt\">\n        <article><span>SÄSONGER</span><strong id=\"tournamentCount\">–</strong></article>\n        <article><span>KLUBBAR</span><strong id=\"teamCount\">–</strong></article>\n        <article><span>MATCHER</span><strong id=\"careerGames\">–</strong></article>\n        <article class=\"player-profile-strip-rp-v123\"><span>TOTAL RP</span><strong id=\"profileStripRp\">–</strong></article>\n      </section>\n    </div>\n\n    <nav class=\"player-profile-tabs-v124\" id=\"playerProfileTabs\" role=\"tablist\" aria-label=\"Spelarprofilens innehåll\">\n      <button class=\"is-active\" type=\"button\" role=\"tab\" aria-selected=\"true\" data-player-tab=\"overview\">Översikt</button>\n      <button type=\"button\" role=\"tab\" aria-selected=\"false\" data-player-tab=\"statistics\">Statistik</button>\n      <button type=\"button\" role=\"tab\" aria-selected=\"false\" data-player-tab=\"teams\">Lag</button>\n      <button type=\"button\" role=\"tab\" aria-selected=\"false\" data-player-tab=\"merits\">Meriter</button>\n    </nav>\n\n    <div class=\"player-profile-tab-stage-v124\">\n      <section class=\"player-profile-tab-panel-v124 player-profile-overview-v124\" data-player-panel=\"overview\" role=\"tabpanel\">\n        <div class=\"player-overview-grid-v124\">\n          <section class=\"player-profile-bio-v123\" aria-label=\"Spelarpresentation\">\n            <div class=\"player-profile-bio-copy-v123\" id=\"playerBio\"></div>\n            <div class=\"team-profile-links player-editorial-links\" id=\"playerLinks\" hidden></div>\n          </section>\n          <aside class=\"player-overview-honours-v124\" aria-label=\"Meritöversikt\">\n            <div class=\"player-overview-honours-v124__heading\">\n              <span>MERITER</span>\n              <strong>Karriärens bucklor</strong>\n            </div>\n            <div class=\"player-overview-honours-grid-v124\" id=\"overviewMeritBadges\"></div>\n          </aside>\n        </div>\n      </section>\n\n      <section class=\"player-profile-tab-panel-v124 player-profile-statistics-v124 player-profile-statistics-v1245\" data-player-panel=\"statistics\" role=\"tabpanel\" hidden>\n        <section class=\"player-career-summary-v124 player-career-summary-v1245\" aria-label=\"Sammanlagd karriärstatistik\">\n          <div class=\"player-career-summary-heading-v124 player-career-summary-heading-v1245\">\n            <div>\n              <p class=\"history-kicker history-kicker--gold\">STATISTIK</p>\n              <h2>Karriäröversikt</h2>\n              <p class=\"player-career-summary-lead-v1245\" id=\"careerSummaryLead\">Samlad statistik från spelarens registrerade karriär.</p>\n            </div>\n          </div>\n          <div class=\"history-alltime-grid player-career-grid player-career-grid-v5 player-career-grid-v1245\" id=\"careerSummaryGrid\">\n            <article class=\"history-alltime-card player-career-role-card-v1245\" id=\"skaterCareerCard\">\n              <div class=\"player-career-role-heading-v1245\"><p class=\"history-kicker history-kicker--gold\">UTESPELARE</p><h2>Karriär totalt</h2></div>\n              <div class=\"profile-stat-list\" id=\"skaterCareerStats\"></div>\n            </article>\n            <article class=\"history-alltime-card player-career-role-card-v1245\" id=\"goalieCareerCard\">\n              <div class=\"player-career-role-heading-v1245\"><p class=\"history-kicker history-kicker--gold\">MÅLVAKT</p><h2>Karriär totalt</h2></div>\n              <div class=\"profile-stat-list\" id=\"goalieCareerStats\"></div>\n            </article>\n          </div>\n        </section>\n\n        <section class=\"history-section player-history-section-v5 player-history-section-v1245\">\n          <div class=\"history-section-heading player-history-heading-v1245\">\n            <div>\n              <p class=\"history-kicker history-kicker--gold\">TURNERING FÖR TURNERING</p>\n              <h2>Turneringshistorik</h2>\n              <p>Filtrera på liga och följ statistik, lag, division och roll genom hela karriären.</p>\n            </div>\n            <span class=\"history-section-count\" id=\"historyCount\"></span>\n          </div>\n          <div class=\"player-history-filters\" id=\"historyCompetitionFilters\" aria-label=\"Filtrera turneringsstatistik\"></div>\n          <div class=\"history-table-wrap player-history-table-wrap-v1245\"><table class=\"history-table player-history-table\"><thead><tr><th>Säsong</th><th>Lag</th><th>Division</th><th>Roll</th><th>GP Ute</th><th>GP MV</th><th>G</th><th>A</th><th>PTS</th><th>SV%</th><th>GAA</th></tr></thead><tbody id=\"historyTableBody\"></tbody></table></div>\n        </section>\n      </section>\n\n      <section class=\"player-profile-tab-panel-v124\" data-player-panel=\"teams\" role=\"tabpanel\" hidden>\n        <section class=\"player-teams-section-v5 player-teams-section-v1247\" id=\"playerTeamsSection\" hidden>\n          <div class=\"player-teams-heading-v5 player-teams-heading-v1246 player-teams-heading-v1247\">\n            <div class=\"player-teams-heading-copy-v1246 player-teams-heading-copy-v1247\">\n              <p class=\"history-kicker history-kicker--gold\">KLUBBAR</p>\n              <h2>Laghistorik</h2>\n              <p>Alla lag spelaren har representerat, från senaste klubb och bakåt genom karriären.</p>\n            </div>\n            <div class=\"player-teams-summary-v1246 player-teams-summary-v1247\" aria-label=\"Laghistorik i siffror\">\n              <article class=\"player-teams-summary-number-v1247\"><strong id=\"playerTeamsClubCount\">–</strong><span>KLUBBAR</span></article>\n              <article class=\"player-teams-summary-number-v1247\"><strong id=\"playerTeamsSeasonCount\">–</strong><span>SÄSONGER</span></article>\n              <article class=\"player-teams-summary-text-v1247\"><span>SENASTE LAG</span><strong id=\"playerTeamsLatestTeam\">–</strong></article>\n              <article class=\"player-teams-summary-text-v1247\"><span>FLEST SÄSONGER</span><strong id=\"playerTeamsMostTeam\">–</strong></article>\n            </div>\n          </div>\n          <div class=\"player-teams-grid-v5 player-teams-grid-v1246\" id=\"playerTeamsGrid\"></div>\n        </section>\n      </section>\n\n      <section class=\"player-profile-tab-panel-v124\" data-player-panel=\"merits\" role=\"tabpanel\" hidden>\n        <section class=\"player-merits-layout player-merits-layout-v1248\" id=\"playerMeritsSection\" hidden>\n          <header class=\"player-merits-overview-v1248\">\n            <div class=\"player-merits-overview-copy-v1248\">\n              <p class=\"history-kicker history-kicker--gold\">MERITER</p>\n              <h2>Karriärens meriter</h2>\n              <p>Lagmeriter och personliga utmärkelser från spelarens registrerade turneringshistorik.</p>\n            </div>\n            <div class=\"player-merits-summary-v1248\" aria-label=\"Meriter i siffror\">\n              <article class=\"is-gold\"><span>🏆</span><strong id=\"meritsTitleCount\">0</strong><small>MÄSTARTITLAR</small></article>\n              <article class=\"is-silver\"><span>🥈</span><strong id=\"meritsFinalCount\">0</strong><small>SILVER</small></article>\n              <article class=\"is-bronze\"><span>🥉</span><strong id=\"meritsBronzeCount\">0</strong><small>BRONS</small></article>\n              <article class=\"is-personal\"><span>★</span><strong id=\"meritsPersonalCount\">0</strong><small>PERSONLIGA</small></article>\n            </div>\n          </header>\n          <div class=\"player-merits-sections-v1248\">\n            <article class=\"player-merits-column player-merits-column--team player-merits-section-v1248\">\n              <div class=\"player-merits-section-heading-v1248\">\n                <div><span class=\"player-merits-section-icon-v1248\" aria-hidden=\"true\">🏆</span><div><p>LAGMERITER</p><h3>Lagmeriter</h3></div></div>\n                <strong id=\"teamMeritsHeadingCount\">0</strong>\n              </div>\n              <div class=\"player-merits-list player-merits-list-v1248\" id=\"teamMeritsList\"></div>\n            </article>\n            <article class=\"player-merits-column player-merits-column--personal player-merits-section-v1248\">\n              <div class=\"player-merits-section-heading-v1248\">\n                <div><span class=\"player-merits-section-icon-v1248 is-personal\" aria-hidden=\"true\">★</span><div><p>PERSONLIGT</p><h3>Personliga meriter</h3></div></div>\n                <strong id=\"personalMeritsHeadingCount\">0</strong>\n              </div>\n              <div class=\"player-merits-list player-merits-list-v1248\" id=\"personalMeritsList\"></div>\n            </article>\n          </div>\n        </section>\n      </section>\n    </div>\n  </main>\n\n  <div class=\"loading-state\" id=\"loadingState\"><div aria-hidden=\"true\" class=\"spinner\"></div><p>Hämtar spelarens historik…</p></div>\n</div>\n<footer class=\"directory-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>", "team": "<div class=\"page-shell history-page-shell\">\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>\n        Öppna <code>config.js</code> och fyll i projektets URL och\n        publishable key.\n      </p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta laget</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<main hidden=\"\" id=\"teamPage\">\n<section class=\"history-hero\">\n<div class=\"history-hero-main\">\n<p class=\"history-kicker\">Lagets historik</p>\n<h1 id=\"teamName\">Laddar lag…</h1>\n<div class=\"history-hero-content\">\n<div class=\"history-team-identity\">\n<div aria-hidden=\"true\" class=\"history-team-logo\" id=\"teamProfileAvatar\"></div>\n</div>\n<div class=\"history-profile-copy\">\n<div class=\"history-chip-row\" id=\"heroChips\"></div>\n<div class=\"history-profile-block\">\n<span>Klubbprofil</span>\n<p id=\"clubProfileText\"></p>\n</div>\n</div>\n<div class=\"history-leaders\">\n<div>\n<span>Flest matcher</span>\n<strong id=\"leaderMatches\">–</strong>\n</div>\n<div>\n<span>Flest poäng</span>\n<strong id=\"leaderPoints\">–</strong>\n</div>\n<div>\n<span>Främsta målvakt</span>\n<strong id=\"leaderGoalie\">–</strong>\n</div>\n</div>\n<div class=\"history-hero-footer-v1284\">\n<div class=\"team-profile-links\" id=\"teamLinks\"></div>\n<div aria-label=\"Lagets främsta meriter\" class=\"history-badges history-badges-v1284\" id=\"historyBadges\"></div>\n</div>\n</div>\n</div>\n<aside aria-labelledby=\"divisionCurveHeading\" class=\"history-division-panel\">\n<p class=\"history-kicker history-kicker--gold\">Divisioner</p>\n<h2 id=\"divisionCurveHeading\">Divisionskurva</h2>\n<p>Från NEO längst ner till ELITE högst upp.</p>\n<div class=\"division-curve\" id=\"divisionCurve\"></div>\n<div class=\"division-curve-footer\">\n<span id=\"divisionCurveFirst\">–</span>\n<span id=\"divisionCurveLatest\">–</span>\n</div>\n</aside>\n</section>\n<section aria-label=\"Lagöversikt\" class=\"history-metric-band\">\n<article class=\"history-feature-metric\">\n<span>Matchvinster</span>\n<strong id=\"winsCount\">–</strong>\n<small id=\"winsMetricNote\"></small>\n</article>\n<article class=\"history-feature-metric\">\n<span>Bästa ECL</span>\n<strong id=\"bestEclSeason\">–</strong>\n<small id=\"bestEclNote\"></small>\n</article>\n<article class=\"history-feature-metric\">\n<span>Högsta nivå</span>\n<strong id=\"bestDivision\">–</strong>\n<small id=\"divisionMetricNote\"></small>\n</article>\n<article class=\"history-feature-metric\">\n<span>Slutspel</span>\n<strong id=\"playoffRecord\">–</strong>\n<small id=\"playoffMetricNote\"></small>\n</article>\n<div class=\"history-compact-metrics\">\n<div><span>Matcher</span><strong id=\"gamesCount\">–</strong></div>\n<div><span>Vinster</span><strong id=\"winsCompact\">–</strong></div>\n<div><span>Förluster</span><strong id=\"lossesCount\">–</strong></div>\n<div><span>Vinst%</span><strong id=\"winPercentage\">–</strong></div>\n<div><span>GF–GA</span><strong id=\"goalsRecord\">–</strong></div>\n<div><span>+/−</span><strong id=\"goalDifference\">–</strong></div>\n</div>\n</section>\n<section class=\"history-section history-honours\" hidden=\"\" id=\"teamHonoursSection\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Meriter</p>\n<h2>Pallplatser</h2>\n</div>\n<span class=\"history-section-count\" id=\"teamHonoursCount\"></span>\n</div>\n<div class=\"history-honour-summary\">\n<div><span>Mästare</span><strong id=\"championshipsCount\">0</strong></div>\n<div><span>Silver</span><strong id=\"finalsCount\">0</strong></div>\n<div><span>Brons</span><strong id=\"bronzeCount\">0</strong></div>\n</div>\n<div class=\"history-honour-list\" id=\"teamHonoursList\"></div>\n</section>\n<section class=\"history-section\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Säsonger</p>\n<h2>Lagets säsonger</h2>\n<p>Säsonger, divisioner och tillgänglig lagstatistik.</p>\n</div>\n<span class=\"history-section-count\" id=\"tournamentCount\">–</span>\n</div>\n<div class=\"player-history-filters team-season-filters\" id=\"seasonCompetitionFilters\" aria-label=\"Filtrera lagets säsonger efter turnering\"></div>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-seasons-table\">\n<thead>\n<tr>\n<th>Säsong</th>\n<th>Datum</th>\n<th>Lagnamn då</th>\n<th>Division</th>\n<th>Spelare</th>\n<th>Matcher</th>\n<th>Record</th>\n<th>Poäng</th>\n<th>GF–GA</th>\n<th>Länk</th>\n</tr>\n</thead>\n<tbody id=\"seasonsTableBody\"></tbody>\n</table>\n</div>\n</section>\n<section class=\"history-section history-player-section\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Spelare</p>\n<h2 id=\"playersHeading\">Spelare – all-time</h2>\n<p>Alla spelare som har representerat laget i importerade turneringar.</p>\n</div>\n<span class=\"history-section-count\" id=\"allTimePlayerCount\">–</span>\n</div>\n<div class=\"history-player-grid\" id=\"playerCards\"></div>\n<div class=\"history-player-grid-actions\">\n<button class=\"history-outline-button\" hidden=\"\" id=\"togglePlayerCards\" type=\"button\">\n            Visa alla spelare\n          </button>\n</div>\n<div class=\"history-alltime-grid\">\n<article class=\"history-alltime-card\">\n<h3>All-time utespelare</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr>\n<th>#</th>\n<th>Spelare</th>\n<th>GP</th>\n<th>G</th>\n<th>A</th>\n<th>PTS</th>\n<th>PIM</th>\n</tr>\n</thead>\n<tbody id=\"allTimeSkaterBody\"></tbody>\n</table>\n</div>\n<div class=\"history-alltime-table-actions\">\n<button class=\"history-outline-button\" hidden=\"\" id=\"toggleAllTimeSkaters\" type=\"button\" aria-expanded=\"false\">Visa alla utespelare</button>\n</div>\n</article>\n<article class=\"history-alltime-card\">\n<h3>All-time målvakter</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr>\n<th>#</th>\n<th>Målvakt</th>\n<th>GP</th>\n<th>SA</th>\n<th>GA</th>\n<th>SV</th>\n<th>SV%</th>\n<th>GAA</th>\n<th>SO</th>\n</tr>\n</thead>\n<tbody id=\"allTimeGoalieBody\"></tbody>\n</table>\n</div>\n<div class=\"history-alltime-table-actions\">\n<button class=\"history-outline-button\" hidden=\"\" id=\"toggleAllTimeGoalies\" type=\"button\" aria-expanded=\"false\">Visa alla målvakter</button>\n</div>\n</article>\n</div>\n</section>\n<section class=\"history-section history-details-section\">\n<details>\n<summary>\n<span>\n<span class=\"history-kicker history-kicker--gold\">Fördjupning</span>\n<strong>Detaljerad turneringshistorik</strong>\n</span>\n<small>Behåller all information från den tidigare lagsidan</small>\n</summary>\n<div class=\"history-details-body\">\n<div class=\"section-heading\">\n<div>\n<h2>Alla turneringar</h2>\n</div>\n<div class=\"tournament-controls\">\n<label>\n<span>Turnering</span>\n<select id=\"competitionFilter\">\n<option value=\"\">Alla turneringar</option>\n</select>\n</label>\n<label>\n<span>Sortering</span>\n<select id=\"tournamentSort\">\n<option value=\"newest\">Nyaste först</option>\n<option value=\"oldest\">Äldsta först</option>\n<option value=\"competition\">Turnering A–Ö</option>\n</select>\n</label>\n</div>\n</div>\n<div class=\"result-bar tournament-result-bar\">\n<span id=\"tournamentResultText\"></span>\n<span id=\"lastUpdated\"></span>\n</div>\n<div class=\"tournament-list\" id=\"tournamentList\"></div>\n</div>\n</details>\n</section>\n<section class=\"team-information-panel history-source-panel\">\n<div>\n<span class=\"information-label\">SportsGamer-ID</span>\n<div class=\"information-value\" id=\"sportsGamerIds\"></div>\n</div>\n<div>\n<span class=\"information-label\">Historiska namn</span>\n<div class=\"information-value\" id=\"historicalNames\"></div>\n</div>\n<div>\n<span class=\"information-label\">Namn i turneringar</span>\n<div class=\"information-value\" id=\"leagueNames\"></div>\n</div>\n</section>\n</main>\n<div class=\"loading-state\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar lagets historik, turneringar och spelare…</p>\n</div>\n</div>", "teamTournament": "<div class=\"page-shell history-page-shell\">\n<nav aria-label=\"Navigering\" class=\"page-nav history-nav\">\n<a class=\"back-button\" href=\"#/laghistoria\" id=\"backLink\">← Tillbaka till laget</a>\n<button class=\"reload-button\" id=\"reloadButton\" type=\"button\">Uppdatera</button>\n</nav>\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>Kontrollera att befintliga <code>config.js</code> innehåller projektets URL och publishable key.</p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta turneringen</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<main hidden=\"\" id=\"tournamentPage\">\n<section class=\"profile-detail-hero tournament-detail-hero\">\n<div aria-hidden=\"true\" class=\"profile-detail-avatar profile-detail-avatar--team\" id=\"teamAvatar\"></div>\n<div class=\"profile-detail-copy\">\n<p class=\"history-kicker history-kicker--gold\" id=\"competitionName\"></p>\n<h1 id=\"teamName\">Laddar lag…</h1>\n<h2 class=\"tournament-page-title\" id=\"tournamentName\"></h2>\n<p class=\"profile-detail-meta\" id=\"tournamentMeta\"></p>\n<div class=\"team-profile-links\" id=\"tournamentLinks\"></div>\n</div>\n</section>\n<section aria-label=\"Turneringsöversikt\" class=\"profile-summary-grid tournament-summary-grid\">\n<article><span>Matcher</span><strong id=\"gamesCount\">–</strong></article>\n<article><span>Vinster</span><strong id=\"winsCount\">–</strong></article>\n<article><span>Förluster</span><strong id=\"lossesCount\">–</strong></article>\n<article><span>Vinst%</span><strong id=\"winPercentage\">–</strong></article>\n<article><span>GF–GA</span><strong id=\"goalsRecord\">–</strong></article>\n<article><span>+/−</span><strong id=\"goalDifference\">–</strong></article>\n</section>\n<section class=\"tournament-single-grid\">\n<article class=\"history-alltime-card\">\n<p class=\"history-kicker history-kicker--gold\">Grundserie</p>\n<h2 id=\"regularRecord\">–</h2>\n<div class=\"profile-stat-list\" id=\"regularDetails\"></div>\n</article>\n<article class=\"history-alltime-card\">\n<p class=\"history-kicker history-kicker--gold\">Slutspel</p>\n<h2 id=\"playoffRecord\">–</h2>\n<div class=\"profile-stat-list\" id=\"playoffDetails\"></div>\n</article>\n</section>\n<section class=\"history-section\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Trupp</p>\n<h2>Spelare i turneringen</h2>\n<p>Spelarnamnen länkar till Svensk eHockey-profiler. Kopplade spelare har även en direktlänk till SportsGamer.</p>\n</div>\n<span class=\"history-section-count\" id=\"playerCount\"></span>\n</div>\n<div class=\"history-alltime-grid tournament-roster-grid\">\n<article class=\"history-alltime-card\">\n<h3>Utespelare</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr><th>Spelare</th><th>Pos</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/−</th><th>PIM</th></tr>\n</thead>\n<tbody id=\"skaterBody\"></tbody>\n</table>\n</div>\n</article>\n<article class=\"history-alltime-card\">\n<h3>Målvakter</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr><th>Målvakt</th><th>GP</th><th>V</th><th>F</th><th>ÖF</th><th>SV%</th><th>GAA</th><th>SO</th></tr>\n</thead>\n<tbody id=\"goalieBody\"></tbody>\n</table>\n</div>\n</article>\n</div>\n</section>\n<section class=\"history-section\" hidden=\"\" id=\"matchesSection\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Matcher</p>\n<h2>Matcher i turneringen</h2>\n<p>Spelade, ospelade, walkover- och rekonstruerade matcher visas med separat status.</p>\n</div>\n<span class=\"history-section-count\" id=\"matchCount\"></span>\n</div>\n<div class=\"tournament-match-list\" id=\"matchList\"></div>\n</section>\n</main>\n<div class=\"loading-state\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar turneringssidan…</p>\n</div>\n</div>", "tournament": "<div class=\"page-shell history-page-shell tournament-overview-shell\">\n<nav aria-label=\"Navigering\" class=\"page-nav history-nav\">\n<a class=\"back-button\" href=\"#/laghistoria\">← Till laghistoriken</a>\n<button class=\"reload-button\" id=\"reloadButton\" type=\"button\">Uppdatera</button>\n</nav>\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>Kontrollera att befintliga <code>config.js</code> innehåller projektets URL och publishable key.</p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta turneringen</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<main hidden=\"\" id=\"tournamentOverview\">\n<section class=\"tournament-overview-hero\">\n<div>\n<p class=\"history-kicker history-kicker--gold\" id=\"competitionName\">TURNERING</p>\n<h1 id=\"tournamentTitle\">Laddar turnering…</h1>\n<p class=\"tournament-overview-intro\" id=\"tournamentDescription\"></p>\n<div class=\"team-profile-links\" id=\"tournamentExternalLinks\"></div>\n</div>\n<aside aria-label=\"Turneringsidentitet\" class=\"tournament-overview-identity\">\n<span>LIGA-ID</span>\n<strong id=\"leagueIdValue\">–</strong>\n<small id=\"tournamentPeriod\">–</small>\n</aside>\n</section>\n<nav aria-label=\"Turneringsinnehåll\" class=\"tournament-overview-nav\">\n<a href=\"#overview\">Översikt</a>\n<a href=\"#standings\">Tabeller</a>\n<a href=\"#teams\">Lag</a>\n<a href=\"#matches\">Matcher</a>\n<a href=\"#statistics\">Statistik</a>\n<a href=\"#playoffs\">Slutspel</a>\n</nav>\n<section aria-label=\"Turneringsöversikt\" class=\"tournament-overview-metrics\" id=\"overview\">\n<article><span>Lag</span><strong id=\"metricTeams\">–</strong></article>\n<article><span>Spelare</span><strong id=\"metricPlayers\">–</strong><small id=\"metricLinkedPlayers\"></small></article>\n<article><span>Matcher</span><strong id=\"metricMatches\">–</strong><small id=\"metricPlayedMatches\"></small></article>\n<article><span>Walkovers</span><strong id=\"metricWalkovers\">–</strong></article>\n<article><span>Slutspelsserier</span><strong id=\"metricSeries\">–</strong></article>\n<article><span>Slutspelsmatcher</span><strong id=\"metricPlayoffMatches\">–</strong><small id=\"metricReconstructed\"></small></article>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"standings\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">TABELLER</p><h2>Grundserie och grupper</h2><p>Tabellplaceringar och lagresultat hämtas direkt från Supabase.</p></div>\n<span class=\"history-section-count\" id=\"standingsCount\"></span>\n</div>\n<div class=\"tournament-standings-container\" id=\"standingsContainer\"></div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"teams\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">LAG</p><h2>Deltagande lag</h2><p>Öppna lagets turneringssida för trupp, statistik och samtliga matcher.</p></div>\n<span class=\"history-section-count\" id=\"teamsCount\"></span>\n</div>\n<div class=\"tournament-teams-grid\" id=\"teamsGrid\"></div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"matches\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">MATCHER</p><h2>Alla matcher</h2><p>Ospelade matcher, walkovers och rekonstruerade matcher har egen status.</p></div>\n<span class=\"history-section-count\" id=\"matchesCount\"></span>\n</div>\n<div class=\"tournament-filter-bar\">\n<label><span>FAS</span><select id=\"stageFilter\"><option value=\"all\">Alla faser</option></select></label>\n<label><span>STATUS</span><select id=\"statusFilter\"><option value=\"all\">Alla statusar</option><option value=\"played\">Spelade</option><option value=\"pending\">Ospelade</option><option value=\"walkover\">Walkover</option><option value=\"reconstructed\">Rekonstruerade</option></select></label>\n<label><span>LAG</span><select id=\"teamFilter\"><option value=\"all\">Alla lag</option></select></label>\n</div>\n<div class=\"tournament-global-match-list\" id=\"matchesList\"></div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"statistics\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">STATISTIK</p><h2>Spelarstatistik</h2><p>SportsGamer-kopplade spelare använder permanent playerID och SportsGamer-namn när uppgifterna finns i databasen.</p></div>\n<span class=\"history-section-count\" id=\"statisticsCount\"></span>\n</div>\n<div class=\"history-alltime-grid tournament-statistics-grid\">\n<article class=\"history-alltime-card\">\n<h3>Utespelare</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead><tr><th>#</th><th>Spelare</th><th>Lag</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/−</th></tr></thead>\n<tbody id=\"skaterStatsBody\"></tbody>\n</table>\n</div>\n</article>\n<article class=\"history-alltime-card\">\n<h3>Målvakter</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead><tr><th>#</th><th>Målvakt</th><th>Lag</th><th>GP</th><th>SV</th><th>SA</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead>\n<tbody id=\"goalieStatsBody\"></tbody>\n</table>\n</div>\n</article>\n</div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"playoffs\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">SLUTSPEL</p><h2>Slutspelsserier</h2><p>Serierna skapas från turneringens slutspelsmatcher och grupperas per runda.</p></div>\n<span class=\"history-section-count\" id=\"playoffsCount\"></span>\n</div>\n<div class=\"tournament-playoff-bracket\" id=\"playoffBracket\"></div>\n</section>\n</main>\n<div class=\"loading-state\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar turneringsdata…</p>\n</div>\n</div>", "season": "<main class=\"directory-shell portal-shell\">\n<section class=\"portal-page-hero season-hero\">\n<p class=\"directory-kicker\">ECL-SÄSONG</p>\n<h1 id=\"seasonTitle\">ECL ’26:<br/>Spring</h1>\n<p id=\"seasonText\">Samlad ingång till svenska lag, spelare och historik för säsongen.</p>\n</section>\n<nav aria-label=\"Säsongsmeny\" class=\"season-subnav\">\n<a class=\"is-active\" href=\"#overview\">Översikt</a>\n<a href=\"#matches\">Matcher</a>\n<a href=\"#transfers\">Byten</a>\n<a href=\"#teams\">Lag</a>\n<a href=\"#statistics\">Statistik</a>\n</nav>\n<section class=\"season-overview\" id=\"overview\">\n<p class=\"directory-kicker\">ÖVERSIKT</p>\n<h2 id=\"seasonOverviewTitle\">ECL ’26: Spring</h2>\n<p>\n        Den här säsongssidan är navet för säsongens innehåll. Databasens\n        laghistorik kan öppnas direkt med säsongen vald.\n      </p>\n<div class=\"portal-actions\">\n<a class=\"portal-button portal-button--primary\" href=\"#/laghistoria\" id=\"seasonTeamsLink\">Visa lag i databasen</a>\n<a class=\"portal-button\" href=\"#/spelare\">Öppna spelarregistret</a>\n</div>\n</section>\n<section class=\"season-panels\">\n<article id=\"matches\"><span>MATCHER</span><h3>Matcher</h3><p>Säsongens matchvy kopplas in här när matchdata finns i databasen.</p></article>\n<article id=\"transfers\"><span>BYTEN</span><h3>Byten</h3><p>En tydlig plats för svenska spelarbyten under säsongen.</p></article>\n<article id=\"teams\"><span>LAG</span><h3>Svenska lag</h3><p>Öppna laghistoriken och filtrera fram säsongens deltagande lag.</p></article>\n<article id=\"statistics\"><span>STATISTIK</span><h3>Statistik</h3><p>Tabeller och topplistor kan byggas från databasens säsongsdata.</p></article>\n</section>\n</main>\n<footer class=\"directory-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>"};
  templates.ecl = `
    <main class="directory-shell ecl-hub-shell-v12840">
      <section class="ecl-hub-hero-v12840" aria-labelledby="eclHubTitle">
        <div class="ecl-hub-hero-v12840__copy">
          <p class="directory-kicker">ECL / SVENSK BEVAKNING</p>
          <h1 id="eclHubTitle">ECL</h1>
          <p>Följ svenska lag och spelare i European Championship League. Här samlas matcher, spelarbyten, lagstatus och svensk spelarstatistik – säsong för säsong.</p>
          <div class="ecl-hub-tags-v12840" aria-label="ECL-innehåll">
            <span>MATCHER</span><span>BYTEN</span><span>LAG</span><span>STATISTIK</span>
          </div>
        </div>
        <aside class="ecl-hub-current-v12840" aria-label="Kommande ECL-säsong">
          <span>KOMMANDE SÄSONG</span>
          <strong>ECL ’27: Winter</strong>
          <p>ECL ’27 Winter blir nästa säsong. När säsongsdata finns kopplas samma svenska bevakning in här.</p>
          <div>
            <a class="ecl-hub-button-v12840" href="#/sasong/ecl27winter">Öppna ECL ’27 Winter</a>
            <a class="ecl-hub-button-v12840 ecl-hub-button-v12840--ghost" href="#/sasong/ecl26spring">Senaste fulla ECL-data</a>
          </div>
        </aside>
      </section>

      <section class="ecl-season-focus-v12840" aria-labelledby="eclLatestTitle">
        <div class="ecl-section-heading-v12840">
          <div>
            <p class="directory-kicker">SENAST TILLGÄNGLIGA SÄSONG</p>
            <h2 id="eclLatestTitle">ECL ’26: Spring</h2>
            <p>Den senaste kompletta svenska ECL-bevakningen. Öppna direkt den vy du vill följa.</p>
          </div>
          <a href="#/sasong/ecl26spring">Öppna säsongsöversikt →</a>
        </div>
        <div class="ecl-season-links-v12840">
          <a href="#/sasong/ecl26spring?section=matches"><span>01</span><strong>Matcher</strong><small>Alla svenska matcher och resultat</small></a>
          <a href="#/sasong/ecl26spring?section=transfers"><span>02</span><strong>Byten</strong><small>Svenska spelarbyten under säsongen</small></a>
          <a href="#/sasong/ecl26spring?section=teams"><span>03</span><strong>Lag</strong><small>Hur de svenska lagen presterar</small></a>
          <a href="#/sasong/ecl26spring?section=statistics"><span>04</span><strong>Statistik</strong><small>Topplistor för svenska spelare</small></a>
        </div>
      </section>

      <section class="ecl-archive-v12840" id="eclArchive" aria-labelledby="eclArchiveTitle">
        <div class="ecl-section-heading-v12840">
          <div>
            <p class="directory-kicker">ARKIV</p>
            <h2 id="eclArchiveTitle">Tidigare ECL-säsonger</h2>
            <p>ECL-historiken går tillbaka till Season 1 från 2015. Varje säsong visar bara de vyer där vi faktiskt har tillräcklig historisk data.</p>
          </div>
        </div>
        <div class="ecl-archive-groups-v12852" id="eclArchiveGroups">
          <p class="season-data-status">Laddar ECL-historik…</p>
        </div>
      </section>
    </main>
    <footer class="directory-footer"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>
  `;

  templates.season = `
    <main class="directory-shell season-shell-v12840">
      <section class="season-hero-v12840" aria-labelledby="seasonTitle">
        <div class="season-hero-v12840__copy">
          <p class="directory-kicker">ECL-SÄSONG</p>
          <h1 id="seasonTitle">ECL ’26: Spring</h1>
          <p id="seasonText">Svenska lag, matcher, spelarbyten och statistik samlat för säsongen.</p>
        </div>
        <aside class="season-hero-v12840__side" aria-label="ECL-säsongsnavigation">
          <span id="seasonHeroEyebrow">SVENSK ECL-BEVAKNING</span>
          <strong id="seasonHeroLabel">ECL</strong>
          <p id="seasonHeroStatus">Välj en vy nedan för att följa säsongens svenska lag och spelare.</p>
          <a href="#/ecl?view=archive">ECL-arkiv →</a>
        </aside>
      </section>

      <nav aria-label="Säsongsmeny" class="season-subnav season-subnav-v12840">
        <a class="is-active" href="#overview">Översikt</a>
        <a href="#matches">Matcher</a>
        <a href="#transfers">Byten</a>
        <a href="#teams">Lag</a>
        <a href="#statistics">Statistik</a>
        <a href="#/ecl?view=archive" data-season-archive="true">Arkiv</a>
      </nav>

      <section class="season-overview season-overview-v12840" id="overview">
        <p class="directory-kicker">ÖVERSIKT</p>
        <h2 id="seasonOverviewTitle">ECL ’26: Spring</h2>
        <p>Välj vilken del av den svenska ECL-bevakningen du vill öppna.</p>
      </section>
      <section class="season-panels"></section>
    </main>
    <footer class="directory-footer"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>
  `;

  templates.shop = `
    <main class="shop-page-shell">
      <section class="shop-page-hero shop-page-hero--reference">
        <div class="shop-title-block">
          <p class="directory-kicker">SVENSK eHOCKEY</p>
          <h1>SHOP</h1>
          <div class="shop-title-accent" aria-hidden="true"></div>
          <p class="shop-page-lead">Officiell Svensk eHockey-merch.</p>
          <p class="shop-page-summary">
            Här hittar du officiella produkter för lag, spelare och fans.
            Alla köp stödjer Svensk eHockey.
          </p>
        </div>

        <div class="shop-info-panel shop-info-panel--reference">
          <div class="shop-info-stack">
            <article class="shop-info-card shop-info-card--reference">
              <div class="shop-card-index">01</div>
              <div class="shop-card-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M18 31c-5-7-2-16 6-18 4-1 8 1 10 5 2-4 6-6 10-5 8 2 11 11 6 18-5 7-16 15-16 15S23 38 18 31Z"/>
                  <path d="M12 36v12l9 8M56 36v12l-9 8M12 36c5 0 9 3 12 8M56 36c-5 0-9 3-12 8"/>
                </svg>
              </div>
              <div class="shop-card-divider" aria-hidden="true"></div>
              <div class="shop-card-copy">
                <h2>Utan vinstsyfte</h2>
                <p>Shoppen drivs utan vinstsyfte. 20 kr per såld produkt går till Svensk eHockey och används för drift och underhåll.</p>
              </div>
            </article>

            <article class="shop-info-card shop-info-card--reference">
              <div class="shop-card-index">02</div>
              <div class="shop-card-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M22 13 32 18 42 13 53 20 47 31 42 28v23H22V28l-5 3-6-11 11-7Z"/>
                  <path d="M27 19h10"/>
                </svg>
              </div>
              <div class="shop-card-divider" aria-hidden="true"></div>
              <div class="shop-card-copy">
                <h2>Lag & personliga produkter</h2>
                <p>Vill du lägga till eller ta bort produkter för ditt lag eller dina personliga produkter? Kontakta oss.</p>
              </div>
            </article>

            <article class="shop-info-card shop-info-card--reference">
              <div class="shop-card-index">03</div>
              <div class="shop-card-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M14 48 46 16l8 8-32 32H14v-8Z"/>
                  <path d="M39 13 51 25M17 41l6 6"/>
                  <path d="M12 20 24 8l8 8-12 12M44 36l12 12-8 8-12-12"/>
                </svg>
              </div>
              <div class="shop-card-divider" aria-hidden="true"></div>
              <div class="shop-card-copy">
                <h2>Personlig design</h2>
                <p>Vi kan även ta fram en personlig design åt dig. Detta är en betaltjänst och priset beror på designens omfattning och komplexitet.</p>
              </div>
            </article>

            <article class="shop-info-card shop-info-card--reference">
              <div class="shop-card-index">04</div>
              <div class="shop-card-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M14 18 31 9l19 10-18 10-18-11Z"/>
                  <path d="M14 18v24l18 11V29M50 19v16"/>
                  <path d="M44 44a10 10 0 1 0 3-7"/>
                  <path d="m44 35 5 2-1-6"/>
                </svg>
              </div>
              <div class="shop-card-divider" aria-hidden="true"></div>
              <div class="shop-card-copy">
                <h2>Beställning & reklamation</h2>
                <p>Shoppen och beställningarna hanteras av Spreadshirt. Eventuella reklamationer och frågor om order, leverans eller retur görs därför direkt till Spreadshirt. Svensk eHockey hjälper självklart till så gott vi kan om du önskar hjälp.</p>
              </div>
            </article>
          </div>

          <div class="shop-contact-bar">
            <div class="shop-contact-left">
              <span class="shop-contact-icon" aria-hidden="true">✉</span>
              <strong>KONTAKT</strong>
              <a href="mailto:svenskehockey@gmail.com">svenskehockey@gmail.com</a>
            </div>

            <a class="shop-open-button"
               href="https://svenskehockey.myspreadshop.se/"
               target="_blank"
               rel="noopener noreferrer">
              ÖPPNA SHOPPEN SEPARAT
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section class="spreadshop-frame" aria-label="Svensk eHockey Shop">
        <div id="spreadshopStatus" class="spreadshop-status">
          Laddar shoppen…
        </div>

        <iframe
          id="spreadshopFrame"
          class="spreadshop-iframe"
          title="Svensk eHockey Shop"
          scrolling="no"
          loading="eager"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </section>
    </main>

    <footer class="directory-footer">
      <div>
        <strong>SVENSK eHOCKEY</strong>
        <span>© 2026 Svensk eHockey</span>
      </div>
    </footer>
  `;


  templates.support = `
    <main class="directory-shell support-shell">
      <section class="support-intro">
        <div class="support-intro__copy">
          <p class="directory-kicker">SVENSK eHOCKEY / IDEELLT</p>
          <h1>Stöd Svensk eHockey</h1>
          <p class="support-lead">
            Svensk eHockey drivs ideellt och vi tar inte betalt för arbetet bakom
            sidan, statistiken eller appen.
          </p>
          <p class="support-copy">
            Det finns däremot löpande kostnader för bland annat domän, teknisk drift,
            databas och andra tjänster. Den som vill får gärna hjälpa till med en liten
            del av de kostnaderna. Det är helt frivilligt och allt innehåll fortsätter
            vara tillgängligt oavsett om man bidrar eller inte.
          </p>

          <div class="support-actions">
            <a
              class="support-button support-button--primary"
              href="https://hihat.io/svenskehockey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lämna ett frivilligt bidrag
              <span aria-hidden="true">↗</span>
            </a>
            <span class="support-action-meta">
              <strong>Swish via Hihat</strong>
              <small>Hihat hanterar betalning och skatterapportering</small>
            </span>
          </div>
        </div>

        <aside class="support-card" aria-label="Löpande kostnader">
          <div class="support-card__topline">
            <p class="directory-kicker">LÖPANDE KOSTNADER</p>
            <span class="support-card__badge">IDEELLT</span>
          </div>

          <div class="support-card__mark" aria-hidden="true">
            <img src="assets/SeHlogga.png" alt="">
          </div>

          <div class="support-cost-list">
            <article>
              <span>01</span>
              <div><strong>Webb & domän</strong><small>Domän, hosting och teknisk drift.</small></div>
            </article>
            <article>
              <span>02</span>
              <div><strong>Databas</strong><small>Statistik, historik och lagrad data.</small></div>
            </article>
            <article>
              <span>03</span>
              <div><strong>App & tjänster</strong><small>Tjänster som behövs för sidan och appen.</small></div>
            </article>
            <article>
              <span>04</span>
              <div><strong>SEC & innehåll</strong><small>Praktiska kostnader runt Svensk eHockey och SEC.</small></div>
            </article>
          </div>

          <div class="support-card__footer">
            <span>Bidrag är frivilliga</span>
            <span>Swish via Hihat</span>
          </div>
        </aside>
      </section>

      <section class="support-bottom-note" aria-label="Information om bidrag">
        <span aria-hidden="true">i</span>
        <p>
          Stöd ger inga extra funktioner, fördelar eller tillgång till innehåll.
          Hihat Basic tillåter valfria belopp mellan 10 och 150 kr.
        </p>
      </section>
    </main>

    <footer class="directory-footer">
      <div>
        <strong>SVENSK eHOCKEY</strong>
        <span>© 2026 Svensk eHockey</span>
      </div>
    </footer>
  `;

  templates.writer = "<main class=\"writer-shell\">\n    <a class=\"writer-back\" href=\"#/nyheter\">← Till nyheter</a>\n\n    <header class=\"writer-hero\">\n      <p class=\"directory-kicker\">SVENSK eHOCKEY / SKRIBENTCENTER</p>\n      <h1>Skriv nyhet</h1>\n      <p>Skriv artikeln, ladda upp desktop- och mobilbild och skicka den för granskning.</p>\n    </header>\n\n    <section id=\"writerLogin\" class=\"writer-panel writer-login-panel\">\n      <p class=\"writer-panel-kicker\">SKRIBENTINLOGGNING</p>\n      <h2>Logga in</h2>\n      <p>Logga in med ditt skribentnamn och lösenord.</p>\n      <div class=\"writer-grid\">\n        <label>\n          <span>Inloggningsnamn</span>\n          <input id=\"writerUsername\" type=\"text\" autocomplete=\"username\" placeholder=\"eSwahn\" spellcheck=\"false\">\n        </label>\n        <label>\n          <span>Lösenord</span>\n          <input id=\"writerPassword\" type=\"password\" autocomplete=\"current-password\" placeholder=\"Ditt lösenord\">\n        </label>\n      </div>\n      <div class=\"writer-actions\">\n        <span></span>\n        <button id=\"writerLoginBtn\" type=\"button\">Logga in</button>\n      </div>\n      <p id=\"writerLoginStatus\" role=\"status\"></p>\n    </section>\n\n    <section id=\"writerSessionBar\" class=\"writer-session-bar\" hidden>\n      <div>\n        <span>INLOGGAD SOM</span>\n        <strong id=\"writerDisplayName\">–</strong>\n        <small id=\"writerRoleLabel\"></small>\n      </div>\n      <button id=\"writerLogout\" class=\"writer-secondary\" type=\"button\">Logga ut</button>\n    </section>\n\n    <form id=\"writerForm\" class=\"writer-panel\" hidden>\n      <div class=\"writer-form-heading\">\n        <div>\n          <p class=\"writer-panel-kicker\" id=\"writerFormKicker\">NY ARTIKEL</p>\n          <h2 id=\"writerFormTitle\">Skriv artikel</h2>\n        </div>\n        <button type=\"button\" id=\"writerCancelEdit\" class=\"writer-secondary\" hidden>Avbryt redigering</button>\n      </div>\n\n      <div class=\"writer-grid\">\n        <label>\n          <span>Rubrik</span>\n          <input id=\"title\" required maxlength=\"140\">\n        </label>\n        <label>\n          <span>Kategori</span>\n          <select id=\"tag\">\n            <option>SEC</option>\n            <option>ECL</option>\n            <option>Svenska lag</option>\n            <option>Sajt</option>\n            <option>Nyhet</option>\n          </select>\n        </label>\n      </div>\n\n      <label>\n        <span>Ingress</span>\n        <textarea id=\"excerpt\" rows=\"3\" required maxlength=\"500\"></textarea>\n      </label>\n\n      <label>\n        <span>Artikeltext</span>\n        <div class=\"writer-editor-toolbar\" aria-label=\"Formatera artikeltext\">\n          <button type=\"button\" data-editor-insert=\"h2\">Mellanrubrik</button>\n          <button type=\"button\" data-editor-insert=\"h3\">Mindre rubrik</button>\n          <button type=\"button\" data-editor-insert=\"ul\">Punktlista</button>\n          <button type=\"button\" data-editor-insert=\"ol\">Numrerad lista</button>\n          <button type=\"button\" data-editor-insert=\"bold\">Fetstil</button>\n          <button type=\"button\" data-editor-insert=\"image1\">Bild 1 här</button>\n          <button type=\"button\" data-editor-insert=\"image2\">Bild 2 här</button>\n        </div>\n        <textarea id=\"body\" rows=\"14\" required placeholder=\"Skriv artikeln här. Tom rad skapar nytt stycke.\"></textarea>\n      </label>\n\n      <aside class=\"writer-format-guide\" aria-label=\"Instruktioner för textformatering\">\n        <strong>Så formaterar du texten</strong>\n        <ul>\n          <li><code>## Rubrik</code><span>Stor mellanrubrik</span></li>\n          <li><code>### Rubrik</code><span>Mindre rubrik</span></li>\n          <li><code>- Din text</code><span>Punktlista</span></li>\n          <li><code>1. Din text</code><span>Numrerad lista</span></li>\n          <li><code>**text**</code><span>Fetstil</span></li>\n          <li><code>[[BILD1]]</code><span>Placera inline-bild 1 här</span></li>\n          <li><code>[[BILD2]]</code><span>Placera inline-bild 2 här</span></li>\n          <li><code>Tom rad</code><span>Nytt stycke</span></li>\n        </ul>\n      </aside>\n\n      <div class=\"writer-image-grid\">\n        <label class=\"writer-upload\">\n          <strong>Desktopbild</strong>\n          <small>Rekommenderat: 1920 × 1080 px (16:9), JPG/PNG/WebP, max 5 MB.</small>\n          <input id=\"desktopImage\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\">\n          <div class=\"writer-file-actions\"><button type=\"button\" class=\"writer-clear-file\" data-clear-file=\"desktopImage\">Ta bort bild</button></div>\n          <span id=\"desktopExisting\" class=\"writer-existing-image\" hidden></span>\n        </label>\n        <label class=\"writer-upload\">\n          <strong>Mobilbild</strong>\n          <small>Rekommenderat: 1080 × 1350 px (4:5), JPG/PNG/WebP, max 5 MB. Valfri – desktopbild används annars.</small>\n          <input id=\"mobileImage\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\">\n          <div class=\"writer-file-actions\"><button type=\"button\" class=\"writer-clear-file\" data-clear-file=\"mobileImage\">Ta bort bild</button></div>\n          <span id=\"mobileExisting\" class=\"writer-existing-image\" hidden></span>\n        </label>\n      </div>\n\n      <label>\n        <span>Bildbeskrivning / alt-text</span>\n        <input id=\"imageAlt\" maxlength=\"180\">\n      </label>\n\n      <section class=\"writer-inline-images\">\n        <div class=\"writer-inline-images__heading\">\n          <div>\n            <strong>Extra bilder i artikeln</strong>\n            <small>Du kan lägga till upp till två bilder. Placera dem exakt mellan stycken med knapparna “Bild 1 här” och “Bild 2 här” ovanför artikeltexten. Om ingen placering anges används en automatisk placering längre ner i artikeln.</small>\n          </div>\n        </div>\n        <div class=\"writer-image-grid writer-image-grid--inline\">\n          <div class=\"writer-upload writer-upload--inline\">\n            <strong>Inline-bild 1</strong>\n            <small>Placeras där <code>[[BILD1]]</code> står i artikeltexten. Lägg gärna in både desktop- och mobilvariant.</small>\n            <div class=\"writer-inline-slot-grid\">\n              <label>\n                <span>Desktopbild 1</span>\n                <input id=\"inlineImage1\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\">\n                <div class=\"writer-file-actions\"><button type=\"button\" class=\"writer-clear-file\" data-clear-file=\"inlineImage1\">Ta bort bild</button></div>\n                <span id=\"inlineExisting1\" class=\"writer-existing-image\" hidden></span>\n              </label>\n              <label>\n                <span>Mobilbild 1</span>\n                <input id=\"inlineImage1Mobile\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\">\n                <div class=\"writer-file-actions\"><button type=\"button\" class=\"writer-clear-file\" data-clear-file=\"inlineImage1Mobile\">Ta bort bild</button></div>\n                <span id=\"inlineExisting1Mobile\" class=\"writer-existing-image\" hidden></span>\n              </label>\n            </div>\n            <label>\n              <span>Bildtext 1</span>\n              <input id=\"inlineCaption1\" maxlength=\"180\">\n            </label>\n            <label>\n              <span>Alt-text 1</span>\n              <input id=\"inlineAlt1\" maxlength=\"180\">\n            </label>\n          </div>\n          <div class=\"writer-upload writer-upload--inline\">\n            <strong>Inline-bild 2</strong>\n            <small>Placeras där <code>[[BILD2]]</code> står i artikeltexten. Lägg gärna in både desktop- och mobilvariant.</small>\n            <div class=\"writer-inline-slot-grid\">\n              <label>\n                <span>Desktopbild 2</span>\n                <input id=\"inlineImage2\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\">\n                <div class=\"writer-file-actions\"><button type=\"button\" class=\"writer-clear-file\" data-clear-file=\"inlineImage2\">Ta bort bild</button></div>\n                <span id=\"inlineExisting2\" class=\"writer-existing-image\" hidden></span>\n              </label>\n              <label>\n                <span>Mobilbild 2</span>\n                <input id=\"inlineImage2Mobile\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\">\n                <div class=\"writer-file-actions\"><button type=\"button\" class=\"writer-clear-file\" data-clear-file=\"inlineImage2Mobile\">Ta bort bild</button></div>\n                <span id=\"inlineExisting2Mobile\" class=\"writer-existing-image\" hidden></span>\n              </label>\n            </div>\n            <label>\n              <span>Bildtext 2</span>\n              <input id=\"inlineCaption2\" maxlength=\"180\">\n            </label>\n            <label>\n              <span>Alt-text 2</span>\n              <input id=\"inlineAlt2\" maxlength=\"180\">\n            </label>\n          </div>\n        </div>\n      </section>\n</section>\n\n      <div class=\"writer-preview-switch\">\n        <button type=\"button\" data-preview=\"desktop\" class=\"is-active\">Desktop</button>\n        <button type=\"button\" data-preview=\"mobile\">Mobil</button>\n      </div>\n\n      <div id=\"writerPreview\" class=\"writer-preview writer-preview--desktop\">\n        <div class=\"writer-preview-card\">\n          <img id=\"previewImage\" hidden alt=\"\">\n          <div>\n            <span id=\"previewTag\">SEC</span>\n            <h2 id=\"previewTitle\">Din rubrik</h2>\n            <p id=\"previewExcerpt\">Din ingress visas här.</p>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"writer-actions\">\n        <span></span>\n        <button type=\"submit\" id=\"writerSubmitBtn\">Skicka för granskning</button>\n      </div>\n      <p id=\"writerStatus\" role=\"status\"></p>\n    </form>\n\n    <section id=\"writerArticleManager\" class=\"writer-panel writer-manager\" hidden>\n      <div class=\"writer-manager-heading\">\n        <div>\n          <p class=\"writer-panel-kicker\" id=\"writerManagerKicker\">MINA ARTIKLAR</p>\n          <h2 id=\"writerManagerTitle\">Artiklar</h2>\n        </div>\n        <button id=\"writerRefreshArticles\" type=\"button\" class=\"writer-secondary\">Uppdatera</button>\n      </div>\n      <p id=\"writerManagerText\" class=\"writer-manager-text\"></p>\n      <div id=\"writerArticleList\" class=\"writer-article-list\"></div>\n    </section>\n\n    <div id=\"writerArticlePreviewModal\" class=\"writer-preview-modal\" hidden>\n      <div class=\"writer-preview-modal__backdrop\" data-close-preview></div>\n      <section class=\"writer-preview-modal__dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"writerPreviewArticleTitle\">\n        <div class=\"writer-preview-modal__topbar\">\n          <strong>FÖRHANDSGRANSKNING</strong>\n          <button type=\"button\" class=\"writer-secondary\" data-close-preview>Stäng</button>\n        </div>\n        <div id=\"writerArticlePreviewContent\"></div>\n      </section>\n    </div>\n  </main>";
  templates.admin = "<style id=\"sehAdminRouteStyles\">.admin-shell{max-width:1100px;margin:0 auto;padding:3rem 1.25rem 5rem}.admin-hero{margin:2rem 0}.admin-hero h1{margin:.25rem 0 1rem}.admin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}.admin-card{padding:1.5rem;border:1px solid #303030;background:#0c0d0d}.admin-card h2{margin:.25rem 0 .5rem}.admin-card p{color:#b7b7b7;line-height:1.5}.admin-actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem}.admin-actions button[disabled]{opacity:.5;cursor:not-allowed}.admin-status{min-height:1.5rem;margin-top:1rem}.admin-status[data-tone=success]{color:#62e59b}.admin-status[data-tone=error]{color:#ff7272}.admin-status[data-tone=working]{color:#ffd400}.admin-login{max-width:560px}.admin-login label{display:block;margin:1rem 0}.admin-login label span{display:block;margin-bottom:.4rem}.admin-login input{width:100%;box-sizing:border-box}.admin-session{display:flex;justify-content:space-between;align-items:center;gap:1rem;border-bottom:1px solid #303030;padding:1rem 0;margin-bottom:2rem}.admin-session span{display:block;color:#aaa;font-size:.75rem;letter-spacing:.08em}.admin-session strong{font-size:1.1rem}@media(max-width:600px){.admin-session{align-items:flex-start;flex-direction:column}}</style><main class=\"admin-shell\">\n    <a class=\"writer-back\" href=\"#/nyheter\">← Till nyheter</a>\n    <header class=\"admin-hero\"><p class=\"directory-kicker\">SVENSK eHOCKEY / ADMIN</p><h1>Admincenter</h1><p>Här samlas synkningar och framtida verktyg för webbplatsen.</p></header>\n    <section id=\"adminLogin\" class=\"admin-card admin-login\">\n      <p class=\"writer-panel-kicker\">ADMININLOGGNING</p><h2>Logga in</h2>\n      <label><span>Inloggningsnamn</span><input id=\"adminUsername\" autocomplete=\"username\" placeholder=\"eSwahn\" spellcheck=\"false\"></label>\n      <label><span>Lösenord</span><input id=\"adminPassword\" type=\"password\" autocomplete=\"current-password\"></label>\n      <div class=\"admin-actions\"><button id=\"adminLoginBtn\" type=\"button\">Logga in</button></div><p id=\"adminLoginStatus\" class=\"admin-status\" role=\"status\"></p>\n    </section>\n    <div id=\"adminDashboard\" hidden>\n      <section class=\"admin-session\"><div><span>INLOGGAD SOM</span><strong id=\"adminDisplayName\">–</strong></div><button id=\"adminLogout\" class=\"writer-secondary\" type=\"button\">Logga ut</button></section>\n      <section class=\"admin-grid\">\n        <article class=\"admin-card\"><p class=\"writer-panel-kicker\">SPELARREGISTER</p><h2>Svenska spelare</h2><p>Hämtar nya svenska SportsGamer-profiler och uppdaterar det centrala spelarregistret i Supabase.</p><div class=\"admin-actions\"><button id=\"startPlayerSync\" type=\"button\">Synka svenska spelare</button><button id=\"refreshPlayerSync\" class=\"writer-secondary\" type=\"button\" disabled>Kontrollera status</button></div><p id=\"playerSyncStatus\" class=\"admin-status\" role=\"status\" aria-live=\"polite\"></p></article>\n        <article class=\"admin-card\"><p class=\"writer-panel-kicker\">SPELARSTATISTIK</p><h2>Alla svenska spelares turneringar</h2><p>Hämtar nya och korrigerade statistik­rader från samtliga SportsGamer-turneringar för spelarna i det svenska registret. SportsGamer läses endast.</p><div class=\"admin-actions\"><button id=\"startStatsSync\" type=\"button\">Uppdatera spelarstatistik</button><button id=\"refreshStatsSync\" class=\"writer-secondary\" type=\"button\" disabled>Kontrollera status</button></div><p id=\"statsSyncStatus\" class=\"admin-status\" role=\"status\" aria-live=\"polite\"></p></article>\n        <article class=\"admin-card fa-admin-card\">\n          <div class=\"fa-admin-heading\"><div><p class=\"writer-panel-kicker\">FREE AGENTS</p><h2>Hantera lediga spelare</h2><p>Lägg till en spelare på Free Agent-sidan eller uppdatera en befintlig annons.</p></div><a class=\"writer-secondary fa-admin-public-link\" href=\"#/free-agents\">Öppna Free Agents →</a></div>\n          <div class=\"fa-admin-approval-grid\">\n            <section class=\"fa-admin-approval-panel\">\n              <div class=\"fa-admin-current__head\"><div><span>DISCORD → SPELARPROFIL</span><strong id=\"faAdminLinkRequestCount\">0</strong></div></div>\n              <p class=\"fa-admin-approval-help\">Spelaren har loggat in med Discord och valt vilken Svensk eHockey-profil som ska kopplas till kontot.</p>\n              <div id=\"faAdminLinkRequests\" class=\"fa-admin-request-list\"></div>\n            </section>\n            <section class=\"fa-admin-approval-panel\">\n              <div class=\"fa-admin-current__head\"><div><span>FA-FÖRFRÅGNINGAR</span><strong id=\"faAdminRequestCount\">0</strong></div></div>\n              <p class=\"fa-admin-approval-help\">Nya annonser, ändringar och önskemål om borttagning visas här tills admin godkänner eller avslår.</p>\n              <div id=\"faAdminRequests\" class=\"fa-admin-request-list\"></div>\n            </section>\n            <section class=\"fa-admin-approval-panel\">\n              <div class=\"fa-admin-current__head\"><div><span>SPELARPROFIL / FELRAPPORTER</span><strong id=\"profileAdminRequestCount\">0</strong></div></div>\n              <p class=\"fa-admin-approval-help\">Profiltexter, sociala länkar, spelarbildsförslag och rapporterade fel från Discord-kopplade spelare.</p>\n              <div id=\"profileAdminRequests\" class=\"fa-admin-request-list\"></div>\n            </section>\n            <section class=\"fa-admin-approval-panel fa-admin-approved-links-panel\">\n              <div class=\"fa-admin-current__head\"><div><span>GODKÄNDA DISCORD-KOPPLINGAR</span><strong id=\"faAdminApprovedLinkCount\">0</strong></div></div>\n              <p class=\"fa-admin-approval-help\">Här kan admin bryta en redan godkänd koppling mellan Discord-kontot och spelarprofilen. Spelarens Free Agent-annons påverkas inte.</p>\n              <div id=\"faAdminApprovedLinks\" class=\"fa-admin-request-list\"></div>\n            </section>\n          </div>\n          <div class=\"fa-admin-layout\">\n            <section class=\"fa-admin-form\">\n              <label><span>Sök spelare i registret</span><input id=\"faAdminSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Skriv gamertag…\"></label>\n              <div id=\"faAdminSearchResults\" class=\"fa-admin-search-results\"></div>\n              <div id=\"faAdminSelected\" class=\"fa-admin-selected\" hidden><span id=\"faAdminSelectedType\">VALD SPELARE</span><strong id=\"faAdminSelectedName\">–</strong><small id=\"faAdminSelectedMeta\"></small></div>\n              <div class=\"fa-admin-grid\"><label><span>Positioner</span><input id=\"faAdminPositions\" maxlength=\"100\" placeholder=\"T.ex. HF / HB, VF / C eller G\"></label><label><span>Division / nivå</span><input id=\"faAdminLevels\" maxlength=\"100\" placeholder=\"T.ex. Neo / Core, Elite+ eller Alla\"></label></div>\n              <div class=\"fa-admin-grid\"><label><span>FA-datum</span><input id=\"faAdminDate\" type=\"date\"></label><label><span>Gäller till (valfritt)</span><input id=\"faAdminExpires\" type=\"date\"></label></div>\n              <div class=\"fa-admin-grid\"><label><span>Tillgänglighet</span><input id=\"faAdminAvailability\" maxlength=\"160\" placeholder=\"T.ex. 4–5 kvällar/vecka\"></label><label><span>Kontakt</span><input id=\"faAdminContact\" maxlength=\"160\" placeholder=\"T.ex. Discord: gamertag\"></label></div>\n              <label><span>Kommentar</span><textarea id=\"faAdminMessage\" rows=\"3\" maxlength=\"500\" placeholder=\"T.ex. Nästa ECL, Backup eller Gärna moget gäng\"></textarea></label>\n              <div class=\"admin-actions\"><button id=\"faAdminSave\" type=\"button\" disabled>Spara Free Agent</button><button id=\"faAdminClear\" class=\"writer-secondary\" type=\"button\">Rensa</button></div><p id=\"faAdminStatus\" class=\"admin-status\" role=\"status\" aria-live=\"polite\"></p>\n            </section>\n            <section class=\"fa-admin-current\"><div class=\"fa-admin-current__head\"><div><span>PUBLICERADE / SPARADE</span><strong id=\"faAdminCount\">0</strong></div><button id=\"faAdminRefresh\" class=\"writer-secondary\" type=\"button\">Uppdatera</button></div><div id=\"faAdminList\" class=\"fa-admin-list\"></div></section>\n          </div>\n        </article>\n        <article class=\"admin-card\"><p class=\"writer-panel-kicker\">KOMMANDE</p><h2>SEC-matcher</h2><p>Separat hämtning av nya SEC-matcher kan läggas här när datakällan och reglerna är fastställda.</p><div class=\"admin-actions\"><button type=\"button\" disabled>Kommer senare</button></div></article>\n        <article class=\"admin-card\"><p class=\"writer-panel-kicker\">KOMMANDE</p><h2>Automatisk timer</h2><p>Timer för återkommande hämtningar aktiveras efter att manuella körningar fungerar stabilt.</p><div class=\"admin-actions\"><button type=\"button\" disabled>Kommer senare</button></div></article>\n        <article class=\"admin-card\"><p class=\"writer-panel-kicker\">KONTO</p><h2>Byt adminlösenord</h2><p>Sätt ett nytt lösenord direkt för ett konto när återställningsmejl inte kan användas.</p><label><span>Användarnamn</span><input id=\"resetUsername\" value=\"eSwahn\" spellcheck=\"false\"></label><label><span>Nytt lösenord</span><input id=\"resetPassword\" type=\"password\" minlength=\"8\" autocomplete=\"new-password\"></label><div class=\"admin-actions\"><button id=\"resetPasswordBtn\" type=\"button\">Sätt nytt lösenord</button></div><p id=\"resetPasswordStatus\" class=\"admin-status\" role=\"status\"></p></article>\n      </section>\n    </div>\n  </main>";

  function SEH_initWriterCenter() {
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  const cfg = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  const supabaseUrl = cfg.supabaseUrl || cfg.SUPABASE_URL || '';
  const supabaseKey = cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || '';

  let sb = null;
  try {
    if (!window.supabase?.createClient) {
      throw new Error('Supabase-biblioteket kunde inte laddas. Kontrollera internetanslutningen/CDN-länken.');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase-inställningar saknas i config.js.');
    }
    // Dela Auth-klienten med huvudmenyn. Flera GoTrue-klienter med samma
    // lagringsnyckel kan annars konkurrera om samma inloggningssession.
    sb = sehGetAuthClient();
  } catch (err) {
    const el = document.querySelector('#writerLoginStatus');
    if (el) el.textContent = 'Fel: ' + (err?.message || err);
    console.error('Skribentcenter initieringsfel:', err);
  }

  const login = $('#writerLogin');
  const loginStatus = $('#writerLoginStatus');
  const form = $('#writerForm');
  const status = $('#writerStatus');
  const sessionBar = $('#writerSessionBar');
  const manager = $('#writerArticleManager');
  const list = $('#writerArticleList');

  let currentWriter = null;
  let currentAuthUser = null;
  let editingArticle = null;
  let existingDesktopUrl = '';
  let existingMobileUrl = '';
  let existingInlineImages = [];
  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
  }

  function usernameToEmail(value) {
    const username = normalizeUsername(value);
    if (!/^[a-z0-9._-]{2,40}$/.test(username)) return '';
    return `${username}@writers.svenskehockey.se`;
  }

  const standaloneHeader = document.querySelector('.seh-header--standalone');

  function headerIdentifierToEmail(value) {
    const identifier = String(value || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return identifier;
    return usernameToEmail(identifier);
  }

  async function resolveHeaderWriter() {
    if (!sb) return null;
    try {
      const current = await sb.rpc('seh_current_writer');
      if (!current.error) {
        const row = Array.isArray(current.data) ? current.data[0] : current.data;
        if (row?.writer_id) return row;
      }
    } catch (_) {}

    try {
      const claimed = await sb.rpc('seh_claim_writer');
      if (!claimed.error) {
        const row = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data;
        if (row?.writer_id) return row;
      }
    } catch (_) {}

    return null;
  }

  function updateStandaloneHeader(session, writerRow) {
    if (!standaloneHeader) return;
    const loggedIn = Boolean(session?.user && !session.user.is_anonymous);
    const role = String(writerRow?.role || '').toLowerCase();
    const isWriter = Boolean(writerRow?.writer_id);
    const isAdmin = isWriter && role === 'admin';

    const writerLink = standaloneHeader.querySelector('[data-seh-auth-link="writer"]');
    const adminLink = standaloneHeader.querySelector('[data-seh-auth-link="admin"]');
    if (writerLink) writerLink.hidden = !isWriter;
    if (adminLink) adminLink.hidden = !isAdmin;

    const authRoot = standaloneHeader.querySelector('.seh-auth');
    const authButton = standaloneHeader.querySelector('#sehAuthButton');
    const authPanel = standaloneHeader.querySelector('#sehAuthPanel');
    const authStatus = standaloneHeader.querySelector('#sehAuthStatus');
    if (authRoot) authRoot.dataset.state = loggedIn ? 'logged-in' : 'logged-out';

    if (authButton) {
      authButton.textContent = loggedIn ? 'LOGGA UT' : 'LOGGA IN';
      authButton.classList.toggle('is-authenticated', loggedIn);
      authButton.setAttribute('aria-expanded', 'false');
      authButton.setAttribute('aria-label', loggedIn ? 'Logga ut' : 'Logga in');
    }
    if (loggedIn && authPanel) authPanel.hidden = true;
    if (authStatus && loggedIn) {
      authStatus.textContent = '';
      authStatus.removeAttribute('data-tone');
    }
  }

  async function refreshStandaloneHeader() {
    if (!standaloneHeader || !sb) return;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      const session = data?.session || null;
      const row = session?.user && !session.user.is_anonymous ? await resolveHeaderWriter() : null;
      updateStandaloneHeader(session, row);
    } catch (err) {
      console.warn('Kunde inte uppdatera huvudmenyns inloggningsstatus:', err);
      updateStandaloneHeader(null, null);
    }
  }

  function bindStandaloneHeader() {
    if (!standaloneHeader) return;
    const menuButton = standaloneHeader.querySelector('.seh-menu-button');
    const navigation = standaloneHeader.querySelector('.seh-nav');
    const authButton = standaloneHeader.querySelector('#sehAuthButton');
    const authPanel = standaloneHeader.querySelector('#sehAuthPanel');
    const authForm = standaloneHeader.querySelector('#sehAuthForm');
    const identifier = standaloneHeader.querySelector('#sehAuthIdentifier');
    const password = standaloneHeader.querySelector('#sehAuthPassword');
    const authStatus = standaloneHeader.querySelector('#sehAuthStatus');

    menuButton?.addEventListener('click', () => {
      const open = !navigation?.classList.contains('is-open');
      navigation?.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
    });

    authButton?.addEventListener('click', async () => {
      const { data } = await sb.auth.getSession();
      const loggedIn = Boolean(data?.session?.user && !data.session.user.is_anonymous);
      if (loggedIn) {
        try { await sb.auth.signOut(); } catch (_) {}
        setLoggedOut();
        updateStandaloneHeader(null, null);
        return;
      }
      const open = authPanel?.hidden !== false;
      if (authPanel) authPanel.hidden = !open;
      authButton.setAttribute('aria-expanded', String(open));
      if (open) requestAnimationFrame(() => identifier?.focus());
    });

    authForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = headerIdentifierToEmail(identifier?.value);
      const passwordValue = String(password?.value || '');
      const submit = authForm.querySelector('button[type="submit"]');

      if (!email) {
        authStatus.textContent = 'Skriv ett giltigt användarnamn eller en e-postadress.';
        authStatus.dataset.tone = 'error';
        return;
      }
      if (!passwordValue) {
        authStatus.textContent = 'Skriv ditt lösenord.';
        authStatus.dataset.tone = 'error';
        return;
      }

      authStatus.textContent = 'Loggar in…';
      authStatus.dataset.tone = 'working';
      if (submit) submit.disabled = true;

      try {
        try { await sb.auth.signOut(); } catch (_) {}
        const { data, error } = await sb.auth.signInWithPassword({ email, password: passwordValue });
        if (error) {
          if (/invalid login credentials/i.test(error.message || '')) throw new Error('Fel användarnamn/e-post eller lösenord.');
          throw error;
        }
        const row = await resolveHeaderWriter();
        updateStandaloneHeader(data?.session || null, row);
        if (identifier) identifier.value = '';
        if (password) password.value = '';
        authStatus.textContent = '';
        authPanel.hidden = true;

        if (row?.writer_id) {
          await loadCurrentWriter();
        } else {
          setLoggedOut(false);
        }
      } catch (err) {
        try { await sb.auth.signOut(); } catch (_) {}
        updateStandaloneHeader(null, null);
        authStatus.textContent = 'Fel: ' + (err?.message || err);
        authStatus.dataset.tone = 'error';
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    document.addEventListener('click', (event) => {
      if (!authPanel || authPanel.hidden || standaloneHeader.contains(event.target)) return;
      authPanel.hidden = true;
      authButton?.setAttribute('aria-expanded', 'false');
    });
  }

  bindStandaloneHeader();

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90);
  }

  function paragraphArray(value) {
    return String(value || '')
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function paragraphsToText(value) {
    if (Array.isArray(value)) return value.join('\n\n');
    if (typeof value === 'string') return value;
    return '';
  }

  function normalizeInlineImages(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => ({
        slot: Number(item?.slot || index + 1),
        after_paragraph: Number(item?.after_paragraph || (index === 0 ? 4 : 10)),
        image_url: String(item?.image_url || '').trim(),
        image_mobile_url: String(item?.image_mobile_url || '').trim(),
        image_alt: String(item?.image_alt || '').trim(),
        caption: String(item?.caption || '').trim()
      }))
      .filter((item) => item.image_url || item.image_mobile_url || item.caption || item.image_alt)
      .sort((a, b) => a.slot - b.slot);
  }

  function formatRichText(value) {
    return escapeHtml(value)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function parseEditorBlocks(value) {
    const raw = Array.isArray(value) ? value.join('\n\n') : String(value || '');
    const chunks = raw.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const blocks = [];
    for (const chunk of chunks) {
      const lines = chunk.split(/\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) continue;
      const first = lines[0];
      if (lines.length === 1 && /^\[\[BILD([12])\]\]$/i.test(first)) {
        blocks.push({ type: 'imageMarker', slot: Number(first.match(/^\[\[BILD([12])\]\]$/i)[1]) });
        continue;
      }
      if (/^###\s+/.test(first)) {
        blocks.push({ type: 'heading3', text: first.replace(/^###\s+/, '') });
        if (lines.length > 1) blocks.push({ type: 'paragraph', text: lines.slice(1).join(' ') });
        continue;
      }
      if (/^##\s+/.test(first)) {
        blocks.push({ type: 'heading2', text: first.replace(/^##\s+/, '') });
        if (lines.length > 1) blocks.push({ type: 'paragraph', text: lines.slice(1).join(' ') });
        continue;
      }
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        blocks.push({ type: 'ul', items: lines.map((line) => line.replace(/^[-*]\s+/, '')) });
        continue;
      }
      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        blocks.push({ type: 'ol', items: lines.map((line) => line.replace(/^\d+\.\s+/, '')) });
        continue;
      }
      blocks.push({ type: 'paragraph', text: lines.join(' ') });
    }
    return blocks;
  }

  function renderInlinePicture(item, className) {
    const desktop = String(item?.image_url || '').trim();
    if (!desktop) return '';
    const mobile = String(item?.image_mobile_url || '').trim();
    const alt = String(item?.image_alt || '').trim();
    return `<picture class="${className}">${mobile ? `<source media="(max-width:700px)" srcset="${escapeHtml(mobile)}">` : ''}<img src="${escapeHtml(desktop)}" alt="${escapeHtml(alt)}"></picture>`;
  }

  function renderRichBlocks(blocks, inlineImages = [], opts = {}) {
    const blockClass = opts.blockClass || '';
    const leadClass = opts.leadClass || '';
    const h2Class = opts.h2Class || '';
    const h3Class = opts.h3Class || '';
    const listClass = opts.listClass || '';
    const inlineFigureClass = opts.inlineFigureClass || '';
    const inlinePictureClass = opts.inlinePictureClass || '';
    const inlineCaptionClass = opts.inlineCaptionClass || '';
    const images = Array.isArray(inlineImages) ? inlineImages : [];
    const imageBySlot = new Map(images.map((item, index) => [Number(item?.slot || index + 1), item]));
    const usedSlots = new Set();
    const explicitSlots = new Set(blocks.filter((block) => block?.type === 'imageMarker').map((block) => Number(block.slot)).filter(Boolean));
    const figuresByPos = new Map();

    images.forEach((item, index) => {
      const slot = Number(item?.slot || index + 1);
      if (explicitSlots.has(slot)) return;
      const pos = Number(item?.after_paragraph || (slot === 1 ? 4 : 10));
      if (!figuresByPos.has(pos)) figuresByPos.set(pos, []);
      figuresByPos.get(pos).push(item);
    });

    const renderFigure = (item) => {
      if (!item) return '';
      const caption = String(item?.caption || '').trim();
      return `<figure${inlineFigureClass ? ` class="${inlineFigureClass}"` : ''}>${renderInlinePicture(item, inlinePictureClass)}${caption ? `<figcaption${inlineCaptionClass ? ` class="${inlineCaptionClass}"` : ''}>${formatRichText(caption)}</figcaption>` : ''}</figure>`;
    };

    let html = '';
    let contentIndex = 0;
    blocks.forEach((block, index) => {
      if (block.type === 'imageMarker') {
        const slot = Number(block.slot);
        const image = imageBySlot.get(slot);
        if (image) {
          html += renderFigure(image);
          usedSlots.add(slot);
        }
        return;
      }

      contentIndex += 1;
      if (block.type === 'heading2') {
        html += `<h2${h2Class ? ` class="${h2Class}"` : ''}>${formatRichText(block.text)}</h2>`;
      } else if (block.type === 'heading3') {
        html += `<h3${h3Class ? ` class="${h3Class}"` : ''}>${formatRichText(block.text)}</h3>`;
      } else if (block.type === 'ul' || block.type === 'ol') {
        const tag = block.type;
        html += `<${tag}${listClass ? ` class="${listClass}"` : ''}>${(block.items || []).map((item) => `<li>${formatRichText(item)}</li>`).join('')}</${tag}>`;
      } else {
        const cls = [blockClass, contentIndex === 1 ? leadClass : ''].filter(Boolean).join(' ');
        html += `<p${cls ? ` class="${cls}"` : ''}>${formatRichText(block.text)}</p>`;
      }

      if (figuresByPos.has(contentIndex)) {
        html += figuresByPos.get(contentIndex).map((item) => {
          const slot = Number(item?.slot || 0);
          if (usedSlots.has(slot)) return '';
          usedSlots.add(slot);
          return renderFigure(item);
        }).join('');
      }
    });

    // Om artikeln är kortare än den automatiska placeringen läggs bilden sist, aldrig mitt i ett stycke.
    images.forEach((item, index) => {
      const slot = Number(item?.slot || index + 1);
      if (!usedSlots.has(slot)) {
        html += renderFigure(item);
        usedSlots.add(slot);
      }
    });

    return html;
  }

  async function getCurrentAuthUser() {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error) throw error;
    return user || null;
  }

  async function claimCurrentWriter() {
    const { data, error } = await sb.rpc('seh_claim_writer');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.writer_id) throw new Error('Kontot är inte registrerat som skribent.');
    return row;
  }

  async function loadCurrentWriter() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) return setLoggedOut();

      // Gamla anonyma sessioner från den tidigare lösningen ska inte användas.
      if (session.user.is_anonymous || !session.user.email) {
        await sb.auth.signOut();
        return setLoggedOut(false);
      }

      currentAuthUser = session.user;

      let { data, error } = await sb.rpc('seh_current_writer');
      if (error) throw error;
      let row = Array.isArray(data) ? data[0] : data;

      if (!row?.writer_id) {
        row = await claimCurrentWriter();
      }

      currentWriter = row;
      setLoggedIn();
      await loadArticles();
    } catch (err) {
      console.error(err);
      setLoggedOut(false);
      await refreshStandaloneHeader(); await window.SEH_refreshAuth?.();
    }
  }

  function setLoggedOut(clearStatus = true) {
    currentWriter = null;
    currentAuthUser = null;
    editingArticle = null;
    login.hidden = false;
    form.hidden = true;
    sessionBar.hidden = true;
    manager.hidden = true;
    if (clearStatus) loginStatus.textContent = '';
  }

  function setLoggedIn() {
    login.hidden = true;
    form.hidden = false;
    sessionBar.hidden = false;
    manager.hidden = false;
    $('#writerDisplayName').textContent = currentWriter.display_name;
    $('#writerRoleLabel').textContent = currentWriter.role === 'admin' ? 'ADMIN' : 'SKRIBENT';
    $('#writerManagerKicker').textContent = currentWriter.role === 'admin' ? 'ADMIN / ALLA ARTIKLAR' : 'MINA ARTIKLAR';
    $('#writerManagerTitle').textContent = currentWriter.role === 'admin' ? 'Hantera artiklar' : 'Dina artiklar';
    $('#writerManagerText').textContent = currentWriter.role === 'admin'
      ? 'Som eSwahn kan du redigera, publicera, avpublicera och ta bort samtliga artiklar.'
      : 'Här ser du dina inskickade artiklar. Du kan redigera artiklar som ännu inte är publicerade.';
  }

  async function loginWithPassword() {
    loginStatus.textContent = 'Loggar in…';
    try {
      if (!sb) throw new Error('Supabase är inte initierat. Kontrollera config.js.');

      const username = $('#writerUsername').value.trim();
      const password = $('#writerPassword').value;
      const email = usernameToEmail(username);

      if (!email) throw new Error('Skriv ett giltigt inloggningsnamn.');
      if (!password) throw new Error('Skriv ditt lösenord.');

      // Rensa eventuell gammal anonym session från den tidigare kodlösningen.
      try { await sb.auth.signOut(); } catch (_) {}

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login credentials/i.test(error.message || '')) {
          throw new Error('Fel inloggningsnamn eller lösenord.');
        }
        throw error;
      }
      if (!data?.user) throw new Error('Inloggningen misslyckades.');

      currentAuthUser = data.user;
      currentWriter = await claimCurrentWriter();
      $('#writerUsername').value = '';
      $('#writerPassword').value = '';
      loginStatus.textContent = '';
      setLoggedIn();
      resetForm();
      await loadArticles();
      await refreshStandaloneHeader(); await window.SEH_refreshAuth?.();
    } catch (err) {
      try { await sb.auth.signOut(); } catch (_) {}
      loginStatus.textContent = 'Fel: ' + (err?.message || err);
    }
  }

  $('#writerLoginBtn').addEventListener('click', loginWithPassword);
  ['writerUsername', 'writerPassword'].forEach((id) => {
    $('#' + id).addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loginWithPassword();
      }
    });
  });

  $('#writerLogout').addEventListener('click', async () => {
    try { await sb.auth.signOut(); } catch (_) {}
    setLoggedOut();
    updateStandaloneHeader(null, null);
  });

  function insertEditorSyntax(type) {
    const textarea = $('#body');
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const selected = textarea.value.slice(start, end);
    const templates = {
      h2: `## ${selected || 'Mellanrubrik'}`,
      h3: `### ${selected || 'Mindre rubrik'}`,
      ul: selected ? selected.split(/\n/).map((line) => `- ${line.replace(/^[-*]\s*/, '')}`).join('\n') : '- Punkt 1\n- Punkt 2',
      ol: selected ? selected.split(/\n/).map((line, i) => `${i + 1}. ${line.replace(/^\d+\.\s*/, '')}`).join('\n') : '1. Punkt 1\n2. Punkt 2',
      bold: `**${selected || 'fet text'}**`,
      image1: '[[BILD1]]',
      image2: '[[BILD2]]'
    };
    const insertion = templates[type] || '';
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const needsBeforeBreak = before && !before.endsWith('\n\n') && (type === 'image1' || type === 'image2' || type === 'h2' || type === 'h3' || type === 'ul' || type === 'ol');
    const needsAfterBreak = after && !after.startsWith('\n\n') && (type === 'image1' || type === 'image2' || type === 'h2' || type === 'h3' || type === 'ul' || type === 'ol');
    const text = `${needsBeforeBreak ? '\n\n' : ''}${insertion}${needsAfterBreak ? '\n\n' : ''}`;
    textarea.setRangeText(text, start, end, 'end');
    textarea.focus();
  }

  document.querySelectorAll('[data-editor-insert]').forEach((button) => {
    button.addEventListener('click', () => insertEditorSyntax(button.dataset.editorInsert));
  });

  ['title', 'excerpt', 'tag', 'inlineCaption1', 'inlineCaption2'].forEach((id) => $('#' + id).addEventListener('input', preview));
  ['desktopImage', 'mobileImage', 'inlineImage1', 'inlineImage1Mobile', 'inlineImage2', 'inlineImage2Mobile'].forEach((id) => $('#' + id).addEventListener('change', preview));

  document.querySelectorAll('[data-clear-file]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.clearFile);
      if (!input) return;
      input.value = '';
      preview();
    });
  });

  document.querySelectorAll('[data-preview]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-preview]').forEach((x) => x.classList.remove('is-active'));
      button.classList.add('is-active');
      $('#writerPreview').className = 'writer-preview writer-preview--' + button.dataset.preview;
      preview();
    });
  });

  function preview() {
    $('#previewTitle').textContent = $('#title').value || 'Din rubrik';
    $('#previewExcerpt').textContent = $('#excerpt').value || 'Din ingress visas här.';
    $('#previewTag').textContent = $('#tag').value;

    const mobile = $('#writerPreview').classList.contains('writer-preview--mobile');
    const file = mobile && $('#mobileImage').files[0] ? $('#mobileImage').files[0] : $('#desktopImage').files[0];
    const fallbackUrl = mobile ? (existingMobileUrl || existingDesktopUrl) : existingDesktopUrl;

    if (file) {
      $('#previewImage').src = URL.createObjectURL(file);
      $('#previewImage').hidden = false;
    } else if (fallbackUrl) {
      $('#previewImage').src = fallbackUrl;
      $('#previewImage').hidden = false;
    } else {
      $('#previewImage').hidden = true;
    }
  }

  async function upload(file, kind, writerId, slug) {
    if (!file) return '';
    if (file.size > 5 * 1024 * 1024) throw new Error(kind + 'bilden är större än 5 MB.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Otillåtet bildformat.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${writerId}/${Date.now()}-${slug}-${kind}.${ext}`;
    const { error } = await sb.storage.from('news-images').upload(path, file, {
      upsert: false,
      contentType: file.type
    });
    if (error) throw error;
    return sb.storage.from('news-images').getPublicUrl(path).data.publicUrl;
  }

  function resetForm() {
    editingArticle = null;
    existingDesktopUrl = '';
    existingMobileUrl = '';
    existingInlineImages = [];
    form.reset();
    $('#writerFormKicker').textContent = 'NY ARTIKEL';
    $('#writerFormTitle').textContent = 'Skriv artikel';
    $('#writerSubmitBtn').textContent = 'Skicka för granskning';
    $('#writerCancelEdit').hidden = true;
    $('#desktopExisting').hidden = true;
    $('#mobileExisting').hidden = true;
    ['inlineExisting1','inlineExisting1Mobile','inlineExisting2','inlineExisting2Mobile'].forEach((id) => { const el = $('#' + id); el.textContent = ''; el.hidden = true; });
    status.textContent = '';
    preview();
  }

  $('#writerCancelEdit').addEventListener('click', resetForm);

  function articleStatusLabel(value) {
    return ({ draft: 'UTKAST', pending: 'VÄNTAR PÅ GRANSKNING', published: 'PUBLICERAD', rejected: 'AVVISAD' })[value] || String(value || '').toUpperCase();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function loadArticles() {
    if (!currentWriter) return;
    list.innerHTML = '<p class="writer-loading">Laddar artiklar…</p>';

    let query = sb.from('seh_news_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (currentWriter.role !== 'admin') query = query.eq('writer_id', currentWriter.writer_id);

    const { data, error } = await query;
    if (error) {
      list.innerHTML = `<p class="writer-error">Kunde inte hämta artiklar: ${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      list.innerHTML = '<p class="writer-empty">Inga artiklar ännu.</p>';
      return;
    }

    list.innerHTML = data.map((article) => {
      const canEdit = currentWriter.role === 'admin' || article.status !== 'published';
      const adminButtons = currentWriter.role === 'admin'
        ? `<button type="button" data-admin-status="${article.id}" data-next-status="${article.status === 'published' ? 'pending' : 'published'}" class="writer-list-button writer-list-button--publish">${article.status === 'published' ? 'Avpublicera' : 'Publicera'}</button>
           <button type="button" data-delete-article="${article.id}" class="writer-list-button writer-list-button--danger">Ta bort</button>`
        : '';
      return `<article class="writer-article-row" data-article-id="${article.id}">
        <div class="writer-article-row__copy">
          <div class="writer-article-row__meta">
            <span class="writer-status writer-status--${escapeHtml(article.status)}">${escapeHtml(articleStatusLabel(article.status))}</span>
            <span>${escapeHtml(article.author_name || '')}</span>
            <span>${escapeHtml(String(article.created_at || '').slice(0,10))}</span>
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.excerpt || '')}</p>
        </div>
        <div class="writer-article-row__actions">
          <button type="button" data-preview-article="${article.id}" class="writer-list-button writer-list-button--preview">Förhandsgranska</button>
          ${canEdit ? `<button type="button" data-edit-article="${article.id}" class="writer-list-button">Redigera</button>` : ''}
          ${adminButtons}
        </div>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-preview-article]').forEach((button) => button.addEventListener('click', () => previewArticle(Number(button.dataset.previewArticle))));
    list.querySelectorAll('[data-edit-article]').forEach((button) => button.addEventListener('click', () => editArticle(Number(button.dataset.editArticle))));
    list.querySelectorAll('[data-admin-status]').forEach((button) => button.addEventListener('click', () => setArticleStatus(Number(button.dataset.adminStatus), button.dataset.nextStatus)));
    list.querySelectorAll('[data-delete-article]').forEach((button) => button.addEventListener('click', () => deleteArticle(Number(button.dataset.deleteArticle))));
  }

  async function getArticle(id) {
    const { data, error } = await sb.from('seh_news_articles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  function formatPreviewDate(value) {
    const raw = String(value || '').slice(0, 10);
    const d = raw ? new Date(raw + 'T12:00:00') : null;
    return d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
      : raw;
  }

  function formatPreviewText(value) {
    return formatRichText(value);
  }

  async function previewArticle(id) {
    try {
      const article = await getArticle(id);
      const modal = $('#writerArticlePreviewModal');
      const host = $('#writerArticlePreviewContent');
      const bodyBlocks = parseEditorBlocks(Array.isArray(article.body) ? article.body.join('\n\n') : (article.body || article.excerpt || ''));
      const inlineImages = normalizeInlineImages(article.inline_images);
      const bodyHtml = renderRichBlocks(bodyBlocks, inlineImages, {
        blockClass: 'writer-preview-article__paragraph',
        leadClass: 'writer-preview-article__lead',
        h2Class: 'writer-preview-article__h2',
        h3Class: 'writer-preview-article__h3',
        listClass: 'writer-preview-article__list',
        inlineFigureClass: 'writer-preview-article__inline',
        inlinePictureClass: 'writer-preview-article__inline-picture',
        inlineCaptionClass: 'writer-preview-article__caption'
      });

      const desktop = String(article.desktop_image_url || '').trim();
      const mobile = String(article.mobile_image_url || '').trim();
      const hero = desktop ? `<picture class="writer-preview-article__hero">${mobile ? `<source media="(max-width:700px)" srcset="${escapeHtml(mobile)}">` : ''}<img src="${escapeHtml(desktop)}" alt="${escapeHtml(article.image_alt || article.title || '')}"></picture>` : '';

      host.innerHTML = `<article class="writer-preview-article">
        <header class="writer-preview-article__header">
          <div class="writer-preview-article__meta"><span>${escapeHtml(article.tag || 'Nyhet')}</span><time>${escapeHtml(formatPreviewDate(article.created_at || article.published_at))}</time><b>${escapeHtml(article.author_name || currentWriter?.display_name || 'Svensk eHockey')}</b></div>
          <h1 id="writerPreviewArticleTitle">${escapeHtml(article.title || '')}</h1>
        </header>
        ${hero}
        <div class="writer-preview-article__body">${bodyHtml || `<p class="writer-preview-article__lead">${formatPreviewText(article.excerpt || '')}</p>`}</div>
      </article>`;
      modal.hidden = false;
      document.body.classList.add('writer-preview-open');
    } catch (err) {
      alert('Kunde inte förhandsgranska artikeln: ' + (err?.message || err));
    }
  }

  function closeArticlePreview() {
    const modal = $('#writerArticlePreviewModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('writer-preview-open');
  }

  document.querySelectorAll('[data-close-preview]').forEach((el) => el.addEventListener('click', closeArticlePreview));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeArticlePreview(); });

  async function editArticle(id) {
    try {
      const article = await getArticle(id);
      editingArticle = article;
      existingDesktopUrl = article.desktop_image_url || '';
      existingMobileUrl = article.mobile_image_url || '';
      existingInlineImages = normalizeInlineImages(article.inline_images);
      $('#title').value = article.title || '';
      $('#tag').value = article.tag || 'Nyhet';
      $('#excerpt').value = article.excerpt || '';
      $('#body').value = paragraphsToText(article.body);
      $('#imageAlt').value = article.image_alt || '';
      const inline1 = existingInlineImages.find((item) => item.slot === 1) || {};
      const inline2 = existingInlineImages.find((item) => item.slot === 2) || {};
      $('#inlineCaption1').value = inline1.caption || '';
      $('#inlineAlt1').value = inline1.image_alt || '';
      $('#inlineCaption2').value = inline2.caption || '';
      $('#inlineAlt2').value = inline2.image_alt || '';
      $('#desktopExisting').textContent = existingDesktopUrl ? 'Nuvarande desktopbild behålls om du inte väljer en ny.' : '';
      $('#desktopExisting').hidden = !existingDesktopUrl;
      $('#mobileExisting').textContent = existingMobileUrl ? 'Nuvarande mobilbild behålls om du inte väljer en ny.' : '';
      $('#mobileExisting').hidden = !existingMobileUrl;
      $('#inlineExisting1').textContent = inline1.image_url ? 'Nuvarande desktopbild 1 behålls om du inte väljer en ny.' : '';
      $('#inlineExisting1').hidden = !inline1.image_url;
      $('#inlineExisting1Mobile').textContent = inline1.image_mobile_url ? 'Nuvarande mobilbild 1 behålls om du inte väljer en ny.' : '';
      $('#inlineExisting1Mobile').hidden = !inline1.image_mobile_url;
      $('#inlineExisting2').textContent = inline2.image_url ? 'Nuvarande desktopbild 2 behålls om du inte väljer en ny.' : '';
      $('#inlineExisting2').hidden = !inline2.image_url;
      $('#inlineExisting2Mobile').textContent = inline2.image_mobile_url ? 'Nuvarande mobilbild 2 behålls om du inte väljer en ny.' : '';
      $('#inlineExisting2Mobile').hidden = !inline2.image_mobile_url;
      $('#writerFormKicker').textContent = currentWriter.role === 'admin' ? 'ADMIN / REDIGERA' : 'REDIGERA ARTIKEL';
      $('#writerFormTitle').textContent = 'Redigera artikel';
      $('#writerSubmitBtn').textContent = 'Spara ändringar';
      $('#writerCancelEdit').hidden = false;
      status.textContent = '';
      preview();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      status.textContent = 'Fel: ' + (err?.message || err);
    }
  }

  async function setArticleStatus(id, nextStatus) {
    if (currentWriter?.role !== 'admin') return;
    const action = nextStatus === 'published' ? 'publicera' : 'avpublicera';
    if (!confirm(`Vill du ${action} artikeln?`)) return;
    const patch = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      published_at: nextStatus === 'published' ? new Date().toISOString() : null
    };
    const { error } = await sb.from('seh_news_articles').update(patch).eq('id', id);
    if (error) alert('Fel: ' + error.message);
    await loadArticles();
  }

  async function deleteArticle(id) {
    if (currentWriter?.role !== 'admin') return;
    const article = await getArticle(id).catch(() => null);
    const name = article?.title ? `“${article.title}”` : 'artikeln';
    if (!confirm(`Ta bort ${name} permanent?\n\nDetta går inte att ångra.`)) return;
    const { error } = await sb.from('seh_news_articles').delete().eq('id', id);
    if (error) {
      alert('Fel: ' + error.message);
      return;
    }
    if (editingArticle?.id === id) resetForm();
    await loadArticles();
  }

  $('#writerRefreshArticles').addEventListener('click', loadArticles);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = editingArticle ? 'Sparar ändringar…' : 'Laddar upp och skickar…';

    try {
      if (!currentWriter) throw new Error('Du är inte inloggad.');
      if (!editingArticle && !$('#desktopImage').files[0]) throw new Error('Välj en desktopbild.');

      const baseSlug = slugify($('#title').value) || 'nyhet';
      const slug = editingArticle?.slug || `${baseSlug}-${Date.now().toString().slice(-6)}`;
      const desktop = $('#desktopImage').files[0]
        ? await upload($('#desktopImage').files[0], 'desktop', currentWriter.writer_id, slug)
        : existingDesktopUrl;
      const mobile = $('#mobileImage').files[0]
        ? await upload($('#mobileImage').files[0], 'mobile', currentWriter.writer_id, slug)
        : existingMobileUrl;

      const authUser = currentAuthUser || await getCurrentAuthUser();
      if (!authUser?.id) throw new Error('Kunde inte läsa inloggad användare. Logga ut och in igen.');
      currentAuthUser = authUser;

      const existingInline1 = existingInlineImages.find((item) => item.slot === 1) || {};
      const existingInline2 = existingInlineImages.find((item) => item.slot === 2) || {};
      const inline1Url = $('#inlineImage1').files[0]
        ? await upload($('#inlineImage1').files[0], 'inline-1', currentWriter.writer_id, slug)
        : (existingInline1.image_url || '');
      const inline1MobileUrl = $('#inlineImage1Mobile').files[0]
        ? await upload($('#inlineImage1Mobile').files[0], 'inline-1-mobile', currentWriter.writer_id, slug)
        : (existingInline1.image_mobile_url || '');
      const inline2Url = $('#inlineImage2').files[0]
        ? await upload($('#inlineImage2').files[0], 'inline-2', currentWriter.writer_id, slug)
        : (existingInline2.image_url || '');
      const inline2MobileUrl = $('#inlineImage2Mobile').files[0]
        ? await upload($('#inlineImage2Mobile').files[0], 'inline-2-mobile', currentWriter.writer_id, slug)
        : (existingInline2.image_mobile_url || '');
      const inlineImages = [
        { slot: 1, after_paragraph: 4, image_url: inline1Url, image_mobile_url: inline1MobileUrl, image_alt: $('#inlineAlt1').value.trim(), caption: $('#inlineCaption1').value.trim() },
        { slot: 2, after_paragraph: 10, image_url: inline2Url, image_mobile_url: inline2MobileUrl, image_alt: $('#inlineAlt2').value.trim(), caption: $('#inlineCaption2').value.trim() }
      ].filter((item) => item.image_url || item.image_mobile_url);

      const payload = {
        writer_id: currentWriter.writer_id,
        author_id: authUser.id,
        author_email: authUser.email || '',
        author_name: editingArticle?.author_name || currentWriter.display_name,
        slug,
        title: $('#title').value.trim(),
        excerpt: $('#excerpt').value.trim(),
        body: paragraphArray($('#body').value),
        inline_images: inlineImages,
        tag: $('#tag').value,
        desktop_image_url: desktop,
        mobile_image_url: mobile,
        image_alt: $('#imageAlt').value.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingArticle) {
        if (currentWriter.role !== 'admin' && editingArticle.status === 'published') throw new Error('En publicerad artikel kan bara redigeras av admin.');
        const { error } = await sb.from('seh_news_articles').update(payload).eq('id', editingArticle.id);
        if (error) throw error;
        status.textContent = 'Ändringarna är sparade.';
      } else {
        payload.status = 'pending';
        const { error } = await sb.from('seh_news_articles').insert(payload);
        if (error) throw error;
        status.textContent = 'Klart! Artikeln är inskickad för granskning.';
      }

      resetForm();
      await loadArticles();
      manager.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      status.textContent = 'Fel: ' + (err?.message || err);
    }
  });

  if (sb) {
    loadCurrentWriter().finally(() => { refreshStandaloneHeader(); window.SEH_refreshAuth?.(); });
  }
})();
  }



  templates.freeAgents = `
    <main class="directory-shell free-agents-shell">
      <section class="free-agents-hero">
        <div class="free-agents-hero__copy">
          <p class="directory-kicker">FREE AGENTS</p>
          <h1>Lediga spelare</h1>
          <p>Spelare som söker lag inför kommande turneringar. Filtrera på position och nivå eller öppna spelarprofilen för hela karriären.</p>
          <div class="free-agents-hero__tags" aria-label="Free Agent-information"><span>AKTIVA ANNONSER</span><span>SVENSK eHOCKEY RP</span><span>SUPABASE LIVE</span></div>
        </div>
        <aside class="free-agents-overview" aria-label="Översikt">
          <p class="directory-kicker">ÖVERSIKT</p>
          <div><article><span>LEDIGA</span><strong id="faOverviewTotal">–</strong></article><article><span>UTESPELARE</span><strong id="faOverviewSkaters">–</strong></article><article><span>MÅLVAKTER</span><strong id="faOverviewGoalies">–</strong></article><article><span>NYA 7 DAGAR</span><strong id="faOverviewNew">–</strong></article></div>
        </aside>
      </section>
      <section class="fa-self-service" id="faSelfService" aria-labelledby="faSelfTitle">
        <div class="fa-self-service__intro">
          <p class="directory-kicker">MIN FREE AGENT</p>
          <h2 id="faSelfTitle">Skriv in dig själv</h2>
          <p>Logga in med Discord, koppla kontot till din Svensk eHockey-profil och skicka din FA-annons. Allt måste godkännas av admin innan det publiceras eller tas bort.</p>
        </div>
        <div class="fa-self-service__panel">
          <div id="faSelfLoggedOut" class="fa-self-state">
            <button id="faDiscordLogin" class="fa-discord-button" type="button"><span aria-hidden="true">◉</span> Logga in med Discord</button>
            <small>Discord används för att verifiera vilket konto som skickar förfrågan.</small>
            <p id="faDiscordLoginStatus" class="fa-self-status" role="status" aria-live="polite"></p>
          </div>
          <div id="faSelfWrongProvider" class="fa-self-state" hidden>
            <strong>Du är redan inloggad med ett annat konto.</strong>
            <span>Spelarhanteringen kräver Discord-inloggning.</span>
            <button id="faDiscordSwitch" class="fa-discord-button" type="button">Byt till Discord</button>
          </div>
          <div id="faSelfLoggedIn" hidden>
            <div class="fa-discord-identity">
              <img id="faDiscordAvatar" alt="" hidden>
              <div><span>INLOGGAD MED DISCORD</span><strong id="faDiscordName">–</strong></div>
              <button id="faDiscordLogout" class="fa-self-secondary" type="button">Logga ut</button>
            </div>

            <div id="faLinkSetup" class="fa-self-link" hidden>
              <p class="fa-self-kicker">KOPPLA SPELARPROFIL</p>
              <h3>Vilken spelare är du?</h3>
              <p>Sök fram din egen profil. Kopplingen skickas till admin för godkännande.</p>
              <label><span>Sök gamertag</span><input id="faSelfPlayerSearch" type="search" autocomplete="off" placeholder="Skriv ditt gamertag…"></label>
              <div id="faSelfPlayerResults" class="fa-self-player-results"></div>
              <p id="faSelfLinkStatus" class="fa-self-status" role="status" aria-live="polite"></p>
            </div>

            <div id="faLinkPending" class="fa-self-notice" hidden>
              <span>VÄNTAR PÅ ADMIN</span><strong id="faLinkPendingName">Spelarkoppling skickad</strong><p>Du kan skicka FA-annonsen när kopplingen har godkänts.</p>
            </div>
            <div id="faLinkRejected" class="fa-self-notice is-rejected" hidden>
              <span>KOPPLING AVSLAGEN</span><strong id="faLinkRejectedName">Välj profil igen</strong><p>Du kan söka fram rätt spelarprofil och skicka en ny begäran.</p>
              <button id="faLinkTryAgain" class="fa-self-secondary" type="button">Välj profil igen</button>
            </div>

            <div id="faSelfApproved" hidden>
              <div class="fa-self-approved-head"><div><span>KOPPLAD SPELARE</span><strong id="faSelfPlayerName">–</strong><small id="faSelfPlayerMeta"></small></div><em>GODKÄND</em></div>
              <div id="faSelfRequestNotice" class="fa-self-notice" hidden><span>VÄNTAR PÅ ADMIN</span><strong id="faSelfRequestTitle">FA-förfrågan skickad</strong><p>Din publika annons ändras först när admin godkänt förfrågan.</p></div>
              <div class="fa-self-form">
                <div class="fa-self-form-grid"><label><span>Positioner</span><input id="faSelfPositions" maxlength="100" placeholder="T.ex. HF / HB eller G"></label><label><span>Söker nivå</span><input id="faSelfLevels" maxlength="100" placeholder="T.ex. Lite / Pro eller Alla"></label></div>
                <div class="fa-self-form-grid"><label><span>Tillgänglighet</span><input id="faSelfAvailability" maxlength="160" placeholder="Valfritt"></label><label><span>Kontakt</span><input id="faSelfContact" maxlength="160" placeholder="Discord fylls i automatiskt"></label></div>
                <label><span>Kommentar</span><textarea id="faSelfMessage" rows="3" maxlength="500" placeholder="T.ex. Nästa ECL, Backup eller annan information"></textarea></label>
                <div class="fa-self-actions"><button id="faSelfSubmit" type="button">Skicka FA-ansökan</button><button id="faSelfRemove" class="fa-self-danger" type="button" hidden>Begär borttagning</button><a class="fa-self-profile-link" href="#/min-profil">Min profil →</a></div>
                <p id="faSelfFormStatus" class="fa-self-status" role="status" aria-live="polite"></p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="free-agents-directory" aria-labelledby="freeAgentsTitle">
        <div class="free-agents-heading"><div><p class="directory-kicker">HITTA SPELARE</p><h2 id="freeAgentsTitle">Free Agents</h2></div><p id="faResultText">Laddar lediga spelare…</p></div>
        <div class="free-agents-toolbar">
          <label class="free-agents-field free-agents-field--search"><span>SÖK</span><input id="faSearch" type="search" autocomplete="off" placeholder="Gamertag, senaste lag…"></label>
          <label class="free-agents-field"><span>POSITION</span><select id="faPosition"><option value="all">Alla positioner</option><option value="F">Forward</option><option value="VF">VF</option><option value="C">C</option><option value="HF">HF</option><option value="D">Back</option><option value="VB">VB</option><option value="HB">HB</option><option value="G">Målvakt</option></select></label>
          <label class="free-agents-field"><span>SÖKER NIVÅ</span><select id="faLevel"><option value="all">Alla nivåer</option><option>Elite</option><option>Pro</option><option>Lite</option><option>Core</option><option>Neo</option></select></label>
          <label class="free-agents-field"><span>SORTERA</span><select id="faSort"><option value="rank">Sverige-rank</option><option value="newest">Nyast först</option><option value="rp">Högst RP</option><option value="name">Namn A–Ö</option></select></label>
        </div>
        <div id="faLoading" class="free-agents-loading"><div class="spinner" aria-hidden="true"></div><p>Hämtar Free Agents…</p></div>
        <div id="faEmpty" class="free-agents-empty" hidden><strong>Inga Free Agents matchar filtret.</strong><span>Ändra filtreringen eller kom tillbaka senare.</span></div>
        <div id="faGrid" class="free-agents-grid" aria-live="polite"></div>
      </section>
    </main>
    <footer class="directory-footer"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>
  `;

  function SEH_initFreeAgents() {
    const root = document.querySelector('#spaRouteView[data-route="freeAgents"]');
    if (!root) return;
    const $ = (selector) => root.querySelector(selector);
    const clean = (value) => String(value ?? '').trim();
    const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
    const splitDisplay = (value) => clean(value).split(/\s*[\/,;+]\s*/).map(clean).filter(Boolean);
    const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const format = (value) => new Intl.NumberFormat('sv-SE').format(number(value));
    const sb = sehGetAuthClient();
    const state = { rows: [] };

    const positionCanonical = (value) => {
      const p = clean(value).toUpperCase().replace(/\s+/g, ' ');
      const map = { VF:'LW', HF:'RW', VB:'LD', HB:'RD', BACK:'D', DEF:'D', FORWARD:'F', MÅLVAKT:'G', GOALIE:'G' };
      return map[p] || p;
    };
    const positionGroup = (value) => {
      const p = positionCanonical(value);
      if (p === 'G') return 'G';
      if (['LD','RD','D'].includes(p)) return 'D';
      if (['LW','C','RW','F'].includes(p)) return 'F';
      return p;
    };
    const positionTokens = (row) => {
      const display = splitDisplay(row.positions_text);
      if (display.length) return display;
      return [clean(row.primary_position), ...list(row.alternate_positions)].filter(Boolean);
    };
    const levelDisplayTokens = (row) => {
      const source = `${clean(row.levels_text)} ${list(row.looking_for_levels).join(' ')}`.trim();
      if (!source || /\balla\b|öppen för förslag/i.test(source)) return [];
      const display = splitDisplay(row.levels_text);
      return display.length ? display : list(row.looking_for_levels);
    };
    const levelCanonicals = (row) => {
      const source = `${clean(row.levels_text)} ${list(row.looking_for_levels).join(' ')}`.trim().toLowerCase();
      if (!source || /\balla\b|öppen för förslag/.test(source)) return ['Elite','Pro','Lite','Core','Neo'];
      return ['Elite','Pro','Lite','Core','Neo'].filter((level) => source.includes(level.toLowerCase()));
    };
    const playerImage = (row) => {
      if (!clean(row.player_image) && !clean(row.sports_gamer_player_url)) return 'players/1DEFAULTBILDID.png';
      const match = clean(row.sports_gamer_player_url).match(/\/players\/(\d+)/i);
      return SEH_playerImageUrl(match?.[1] || '', clean(row.player_image));
    };
    const dateText = (value) => {
      const date = value ? new Date(`${String(value).slice(0,10)}T12:00:00`) : null;
      return (!date || Number.isNaN(date.getTime())) ? '–' : new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(date);
    };
    const ageDays = (value) => {
      const date = value ? new Date(`${String(value).slice(0,10)}T12:00:00`) : null;
      return (!date || Number.isNaN(date.getTime())) ? 99999 : (Date.now()-date.getTime())/86400000;
    };
    const latestPlayedEclTeam = (row) => clean(row.latest_ecl_team) || '–';
    const latestPlayedEclDivision = (row) => clean(row.latest_ecl_division) || '–';

    function updateOverview() {
      const goalies = state.rows.filter((row)=>positionTokens(row).some((p)=>positionGroup(p)==='G')).length;
      $('#faOverviewTotal').textContent=format(state.rows.length);
      $('#faOverviewGoalies').textContent=format(goalies);
      $('#faOverviewSkaters').textContent=format(state.rows.length-goalies);
      $('#faOverviewNew').textContent=format(state.rows.filter((row)=>ageDays(row.fa_date || row.created_at)<=7).length);
    }

    function card(row) {
      const article=document.createElement('article');
      article.className=`free-agent-card${row.player_key ? '' : ' is-manual'}`;
      const levels=levelDisplayTokens(row), positions=positionTokens(row);
      const primary=positions[0] || clean(row.primary_position) || (clean(row.player_type).toLowerCase()==='goalie'?'G':'–');
      const alternate=positions.slice(1);
      const rp=Number(row.ranking_points), rank=Number(row.overall_rank);
      const isGoalie=positionGroup(primary)==='G';
      const secondary=isGoalie
        ? (Number(row.total_goalie_save_percentage)>0 ? `${(Number(row.total_goalie_save_percentage)*100).toLocaleString('sv-SE',{maximumFractionDigits:1})}% SV` : `${format(row.total_goalie_games)} GP`)
        : `${format(row.total_points)} PTS`;
      const name=clean(row.display_gamertag)||'Okänd spelare';
      const href=row.player_key ? SEH_playerProfileUrl(row.player_key,name) : '';
      const linkMarkup=href ? `<a class="free-agent-card__link" href="${escapeHtml(href)}" aria-label="Öppna spelarprofilen för ${escapeHtml(name)}"></a>` : '';
      article.innerHTML=`${linkMarkup}<div class="free-agent-card__portrait"><img src="${escapeHtml(playerImage(row))}" alt="${escapeHtml(name)}" loading="lazy" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='players/1DEFAULTBILDID.png'}"><span>FREE AGENT</span></div><div class="free-agent-card__content"><div class="free-agent-card__topline"><span class="free-agent-card__rank">${rank>0?`#${format(rank)}`:'ORANKAD'}</span><strong>${Number.isFinite(rp)?`${SEH_formatRpNumber(rp)} RP`:'RP –'}</strong></div><h3>${escapeHtml(name)}</h3><div class="free-agent-card__positions"><b>${escapeHtml(primary)}</b>${alternate.map((p)=>`<span>${escapeHtml(p)}</span>`).join('')}</div><div class="free-agent-card__facts"><div><span>SENASTE ECL-LAG</span><strong>${escapeHtml(latestPlayedEclTeam(row))}</strong></div><div><span>DIVISION</span><strong>${escapeHtml(latestPlayedEclDivision(row))}</strong></div></div><div class="free-agent-card__career"><span>KARRIÄR</span><strong>${row.player_key?`${format(row.career_games)} GP · ${escapeHtml(secondary)}`:'–'}</strong></div><div class="free-agent-card__looking"><span>SÖKER</span><div>${levels.length?levels.map((level)=>`<b>${escapeHtml(level)}</b>`).join(''):'<b>Öppen för förslag</b>'}</div></div>${clean(row.availability)?`<p class="free-agent-card__availability"><span>TILLGÄNGLIGHET</span>${escapeHtml(row.availability)}</p>`:''}${clean(row.message)?`<p class="free-agent-card__message">${escapeHtml(row.message)}</p>`:''}<div class="free-agent-card__footer"><span>FA sedan ${escapeHtml(dateText(row.fa_date || row.created_at))}</span>${clean(row.contact)?`<strong>${escapeHtml(row.contact)}</strong>`:(href?'<strong>Öppna profil →</strong>':'<strong>Manuell FA-post</strong>')}</div></div>`;
      return article;
    }

    function applyFilters() {
      const search=clean($('#faSearch').value).toLocaleLowerCase('sv-SE');
      const position=$('#faPosition').value, level=$('#faLevel').value, sort=$('#faSort').value;
      let rows=state.rows.filter((row)=>{
        const rawPositions=positionTokens(row), canonical=rawPositions.map(positionCanonical), groups=canonical.map(positionGroup);
        const selected=positionCanonical(position);
        const posMatch=position==='all' || canonical.includes(selected) || (selected==='F'&&groups.includes('F')) || (selected==='D'&&groups.includes('D'));
        const canonicalLevels=levelCanonicals(row);
        const levelMatch=level==='all' || canonicalLevels.some((x)=>x.toLowerCase()===level.toLowerCase());
        const haystack=[row.display_gamertag,row.latest_ecl_team,row.latest_ecl_division,row.latest_ecl_season,row.latest_team,row.latest_season,row.positions_text,row.levels_text,row.message,...list(row.looking_for_levels),...rawPositions].join(' ').toLocaleLowerCase('sv-SE');
        return posMatch&&levelMatch&&(!search||haystack.includes(search));
      });
      rows.sort((a,b)=>{
        if(sort==='rank')return(number(a.overall_rank)||999999)-(number(b.overall_rank)||999999);
        if(sort==='rp')return number(b.ranking_points)-number(a.ranking_points);
        if(sort==='name')return clean(a.display_gamertag).localeCompare(clean(b.display_gamertag),'sv-SE');
        return String(b.fa_date||b.created_at||'').localeCompare(String(a.fa_date||a.created_at||''));
      });
      $('#faGrid').replaceChildren(...rows.map(card));
      $('#faEmpty').hidden=rows.length>0;
      $('#faResultText').textContent=`${format(rows.length)} av ${format(state.rows.length)} lediga spelare`;
    }

    async function load() {
      $('#faLoading').hidden=false; $('#faEmpty').hidden=true;
      try {
        const {data,error}=await sb.from('v_ehockey_free_agents_public').select('*').order('fa_date',{ascending:false});
        if(error)throw error;
        state.rows=Array.isArray(data)?data:[];
        updateOverview(); applyFilters();
      } catch(error) {
        console.error('Kunde inte hämta Free Agents:',error);
        $('#faResultText').textContent='Kunde inte hämta Free Agents.';
        $('#faEmpty').hidden=false;
        $('#faEmpty').querySelector('strong').textContent='Kunde inte hämta Free Agents.';
        $('#faEmpty').querySelector('span').textContent=error?.message||'Försök igen senare.';
      } finally { $('#faLoading').hidden=true; }
    }
    const selfState = { session:null, link:null, activeFa:null, pendingRequest:null, approvedPlayer:null, searchTimer:null };
    const selfEl = (id) => root.querySelector(`#${id}`);
    const selfStatus = (id,message,tone='') => { const el=selfEl(id); if(!el)return; el.textContent=message||''; if(tone)el.dataset.tone=tone; else el.removeAttribute('data-tone'); };
    const isDiscordUser = (user) => Boolean(user && (String(user.app_metadata?.provider||'').toLowerCase()==='discord' || (Array.isArray(user.identities)&&user.identities.some((x)=>String(x?.provider||'').toLowerCase()==='discord'))));
    const discordDisplayName = (user) => clean(user?.user_metadata?.global_name)||clean(user?.user_metadata?.full_name)||clean(user?.user_metadata?.name)||clean(user?.user_metadata?.preferred_username)||clean(user?.email)||'Discord-användare';
    const discordAvatar = (user) => clean(user?.user_metadata?.avatar_url)||clean(user?.user_metadata?.picture);
    const hideSelfStates = () => ['faSelfLoggedOut','faSelfWrongProvider','faSelfLoggedIn','faLinkSetup','faLinkPending','faLinkRejected','faSelfApproved','faSelfRequestNotice'].forEach((id)=>{const el=selfEl(id);if(el)el.hidden=true;});
    const selfCacheKey = (userId) => `seh_fa_self_v1_${String(userId||'')}`;
    function selfReadCache(userId){
      try{const raw=sessionStorage.getItem(selfCacheKey(userId));return raw?JSON.parse(raw):null;}catch{return null;}
    }
    function selfWriteCache(userId,approvedKey){
      if(!userId||!approvedKey)return;
      try{sessionStorage.setItem(selfCacheKey(userId),JSON.stringify({approvedKey,approvedPlayer:selfState.approvedPlayer||null,activeFa:selfState.activeFa||null,pendingRequest:selfState.pendingRequest||null,savedAt:Date.now()}));}catch{}
    }
    function selfClearCache(userId){try{if(userId)sessionStorage.removeItem(selfCacheKey(userId));}catch{}}
    function selfRenderApproved(session,approvedKey){
      hideSelfStates();
      selfEl('faSelfLoggedIn').hidden=false;
      selfEl('faSelfApproved').hidden=false;
      selfEl('faSelfPlayerName').textContent=selfState.approvedPlayer?.display_gamertag||approvedKey||'Kopplad spelare';
      selfEl('faSelfPlayerMeta').textContent=[selfState.approvedPlayer?.primary_position,selfState.approvedPlayer?.latest_ecl_team,selfState.approvedPlayer?.latest_ecl_division].filter(Boolean).join(' · ');
      const source=selfState.pendingRequest&&selfState.pendingRequest.request_type!=='remove'?selfState.pendingRequest:selfState.activeFa;
      selfEl('faSelfPositions').value=clean(source?.positions_text)||clean(selfState.approvedPlayer?.primary_position);
      selfEl('faSelfLevels').value=clean(source?.levels_text);
      selfEl('faSelfAvailability').value=clean(source?.availability);
      selfEl('faSelfMessage').value=clean(source?.message);
      selfEl('faSelfContact').value=clean(source?.contact)||`Discord: ${discordDisplayName(session?.user)}`;
      selfEl('faSelfSubmit').textContent=selfState.activeFa?'Skicka ändring':'Skicka FA-ansökan';
      selfEl('faSelfRemove').hidden=!selfState.activeFa;
      if(selfState.pendingRequest){
        selfEl('faSelfRequestNotice').hidden=false;
        selfEl('faSelfRequestTitle').textContent=selfState.pendingRequest.request_type==='remove'?'Borttagning väntar på admin':selfState.pendingRequest.request_type==='update'?'Ändring väntar på admin':'FA-ansökan väntar på admin';
      }
    }

    async function selfFetchPlayer(key){
      if(!key)return null;

      // Use a small authenticated RPC for the linked-player summary. The raw
      // tournament-history view is not guaranteed to be readable by ordinary
      // Discord users and could previously make the entire FA form disappear.
      const {data:summary,error:summaryError}=await sb.rpc('seh_get_linked_player_summary',{p_player_key:key});
      if(!summaryError&&summary)return summary;

      // Safe fallback: always keep the self-service form usable even if the
      // ECL summary cannot be loaded for some reason.
      const {data:player,error:playerError}=await sb
        .from('app_player_directory_cache')
        .select('player_key,display_gamertag,primary_position,latest_team')
        .eq('player_key',key)
        .maybeSingle();
      if(playerError)throw playerError;
      return player||null;
    }
    async function selfRefresh(){
      if(!sb||!selfEl('faSelfService'))return;
      const refreshToken=(selfState.refreshToken||0)+1;selfState.refreshToken=refreshToken;
      const isCurrent=()=>selfState.refreshToken===refreshToken;
      const {data:sessionData,error:sessionError}=await sb.auth.getSession();
      if(!isCurrent())return;
      if(sessionError){hideSelfStates();selfEl('faSelfLoggedOut').hidden=false;selfStatus('faDiscordLoginStatus',sessionError.message,'error');return;}
      const session=sessionData?.session||null;selfState.session=session;
      if(!session?.user){hideSelfStates();selfEl('faSelfLoggedOut').hidden=false;return;}
      if(!isDiscordUser(session.user)){hideSelfStates();selfEl('faSelfWrongProvider').hidden=false;return;}

      // Restore the last approved self-service state immediately on refresh.
      // Fresh Supabase data replaces it a moment later, but the form never
      // collapses to an empty Discord header while requests are in flight.
      selfEl('faSelfLoggedIn').hidden=false;
      selfEl('faDiscordName').textContent=discordDisplayName(session.user);
      const avatar=discordAvatar(session.user);const avatarEl=selfEl('faDiscordAvatar');
      if(avatarEl){avatarEl.hidden=!avatar;if(avatar)avatarEl.src=avatar;}
      const cachedSelf=selfReadCache(session.user.id);
      if(cachedSelf?.approvedKey){
        selfState.approvedPlayer=cachedSelf.approvedPlayer||selfState.approvedPlayer||null;
        selfState.activeFa=cachedSelf.activeFa||selfState.activeFa||null;
        selfState.pendingRequest=cachedSelf.pendingRequest||selfState.pendingRequest||null;
        selfRenderApproved(session,clean(cachedSelf.approvedKey));
      }

      const [{data:link,error:linkError},{data:requests,error:reqError}]=await Promise.all([
        sb.from('ehockey_discord_player_links').select('*').eq('user_id',session.user.id).maybeSingle(),
        sb.from('ehockey_free_agent_requests').select('*').eq('user_id',session.user.id).order('submitted_at',{ascending:false}).limit(10)
      ]);
      if(!isCurrent())return;
      if(linkError)throw linkError;if(reqError)throw reqError;
      selfState.link=link||null;
      selfState.pendingRequest=(requests||[]).find((x)=>x.status==='pending')||null;
      const approvedKey=clean(link?.approved_player_key);

      if(!approvedKey){
        selfClearCache(session.user.id);
        selfState.approvedPlayer=null;selfState.activeFa=null;
        hideSelfStates();selfEl('faSelfLoggedIn').hidden=false;
        if(link?.status==='pending'){
          selfEl('faLinkPending').hidden=false;
          const pendingPlayer=await selfFetchPlayer(link.requested_player_key).catch(()=>null);
          if(!isCurrent())return;
          selfEl('faLinkPendingName').textContent=pendingPlayer?.display_gamertag||'Spelarkoppling skickad';
        }else if(link?.status==='rejected'){
          selfEl('faLinkRejected').hidden=false;
          const rejectedPlayer=await selfFetchPlayer(link.requested_player_key).catch(()=>null);
          if(!isCurrent())return;
          selfEl('faLinkRejectedName').textContent=rejectedPlayer?.display_gamertag||'Välj profil igen';
        }else{
          selfEl('faLinkSetup').hidden=false;
        }
        return;
      }

      const [approvedPlayer,activeResult]=await Promise.all([
        selfFetchPlayer(approvedKey),
        sb.from('v_ehockey_free_agents_public').select('*').eq('player_key',approvedKey).limit(1)
      ]);
      if(!isCurrent())return;
      selfState.approvedPlayer=approvedPlayer||selfState.approvedPlayer||null;
      if(activeResult.error){
        console.warn('Kunde inte uppdatera spelarens aktiva FA-annons:',activeResult.error);
      }else{
        selfState.activeFa=activeResult.data?.[0]||null;
      }

      selfRenderApproved(session,approvedKey);
      selfWriteCache(session.user.id,approvedKey);
    }
    async function selfDiscordLogin(){
      selfStatus('faDiscordLoginStatus','Öppnar Discord…','working');
      try{
        const {data:existing}=await sb.auth.getSession();
        if(existing?.session&&!isDiscordUser(existing.session.user))await sb.auth.signOut();
        localStorage.setItem('seh_oauth_return','#/free-agents');
        const redirectTo=`${window.location.origin}${window.location.pathname}`;
        const {error}=await sb.auth.signInWithOAuth({provider:'discord',options:{redirectTo}});
        if(error)throw error;
      }catch(error){
        localStorage.removeItem('seh_oauth_return');
        selfStatus('faDiscordLoginStatus',/provider.*enabled/i.test(error?.message||'')?'Discord-inloggning är inte aktiverad i Supabase ännu.':`Fel: ${error?.message||error}`,'error');
      }
    }
    async function selfSearchPlayers(){
      const host=selfEl('faSelfPlayerResults');if(!host)return;
      const q=clean(selfEl('faSelfPlayerSearch')?.value);host.replaceChildren();
      if(q.length<2)return;
      const {data,error}=await sb.from('app_player_directory_cache').select('player_key,display_gamertag,primary_position,latest_team').ilike('display_gamertag',`%${q.replaceAll('%','')}%`).order('display_gamertag',{ascending:true}).limit(8);
      if(error){selfStatus('faSelfLinkStatus',`Fel: ${error.message}`,'error');return;}
      const players=data||[];
      let linkedKeys=new Set();
      if(players.length){
        const {data:linkStates,error:linkStateError}=await sb.rpc('seh_discord_player_link_status',{p_player_keys:players.map((player)=>player.player_key)});
        if(linkStateError){console.warn('Kunde inte kontrollera Discord-kopplingar:',linkStateError);}
        else linkedKeys=new Set((linkStates||[]).filter((row)=>row.is_linked).map((row)=>String(row.player_key)));
      }
      for(const player of players){
        const isLinked=linkedKeys.has(String(player.player_key));
        const button=document.createElement('button');button.type='button';
        if(isLinked){button.disabled=true;button.classList.add('is-linked');button.setAttribute('aria-label',`${player.display_gamertag||'Spelaren'} är redan kopplad till ett Discord-konto`);}
        else button.dataset.faSelfPlayer=player.player_key;
        button.innerHTML=`<span class="fa-self-player-result__identity"><strong>${escapeHtml(player.display_gamertag||player.player_key)}</strong><small>${escapeHtml([player.primary_position,player.latest_team].filter(Boolean).join(' · ')||'Spelarprofil')}</small></span>${isLinked?'<em>Redan kopplad</em>':'<span>Välj profil</span>'}`;
        host.append(button);
      }
      if(!players.length){const p=document.createElement('p');p.textContent='Ingen spelarprofil hittades.';host.append(p);}
    }
    async function selfRequestLink(playerKey){
      selfStatus('faSelfLinkStatus','Skickar kopplingen till admin…','working');
      const {data,error}=await sb.rpc('seh_request_discord_player_link',{p_player_key:playerKey});
      if(error){selfStatus('faSelfLinkStatus',`Fel: ${error.message}`,'error');return;}
      selfStatus('faSelfLinkStatus','Skickad. Admin måste godkänna kopplingen.','success');
      await selfRefresh();
    }
    async function selfSubmitRequest(type){
      const statusId='faSelfFormStatus';selfStatus(statusId,type==='remove'?'Skickar borttagningsbegäran…':'Skickar till admin…','working');
      const args={
        p_request_type:type,
        p_positions_text:type==='remove'?null:clean(selfEl('faSelfPositions')?.value),
        p_levels_text:type==='remove'?null:clean(selfEl('faSelfLevels')?.value),
        p_availability:type==='remove'?null:clean(selfEl('faSelfAvailability')?.value),
        p_message:type==='remove'?null:clean(selfEl('faSelfMessage')?.value),
        p_contact:type==='remove'?null:clean(selfEl('faSelfContact')?.value)
      };
      const {error}=await sb.rpc('seh_submit_free_agent_request',args);
      if(error){selfStatus(statusId,`Fel: ${error.message}`,'error');return;}
      selfStatus(statusId,type==='remove'?'Borttagningsbegäran är skickad. Du ligger kvar tills admin godkänner.':'Förfrågan är skickad. Den publiceras när admin godkänt.','success');
      await selfRefresh();
    }
    selfEl('faDiscordLogin')?.addEventListener('click',selfDiscordLogin);
    selfEl('faDiscordSwitch')?.addEventListener('click',selfDiscordLogin);
    selfEl('faDiscordLogout')?.addEventListener('click',async()=>{const userId=selfState.session?.user?.id;selfClearCache(userId);await sb.auth.signOut();await window.SEH_refreshAuth?.();await selfRefresh();});
    selfEl('faLinkTryAgain')?.addEventListener('click',()=>{selfEl('faLinkRejected').hidden=true;selfEl('faLinkSetup').hidden=false;requestAnimationFrame(()=>selfEl('faSelfPlayerSearch')?.focus());});
    selfEl('faSelfPlayerSearch')?.addEventListener('input',()=>{clearTimeout(selfState.searchTimer);selfState.searchTimer=setTimeout(selfSearchPlayers,180);});
    selfEl('faSelfPlayerResults')?.addEventListener('click',(event)=>{const button=event.target.closest('[data-fa-self-player]');if(button)selfRequestLink(button.dataset.faSelfPlayer);});
    selfEl('faSelfSubmit')?.addEventListener('click',()=>selfSubmitRequest(selfState.activeFa?'update':'create'));
    selfEl('faSelfRemove')?.addEventListener('click',()=>{if(confirm('Begär att tas bort från Free Agent-listan? Du ligger kvar tills admin godkänner.'))selfSubmitRequest('remove');});
    sb?.auth.onAuthStateChange(()=>window.setTimeout(()=>selfRefresh().catch((error)=>selfStatus('faDiscordLoginStatus',`Fel: ${error?.message||error}`,'error')),0));

    ['#faSearch','#faPosition','#faLevel','#faSort'].forEach((selector)=>$(selector)?.addEventListener(selector==='#faSearch'?'input':'change',applyFilters));
    load();
    selfRefresh().catch((error)=>selfStatus('faDiscordLoginStatus',`Fel: ${error?.message||error}`,'error'));
  }



  templates.myProfile = `
    <main class="directory-shell my-profile-shell">
      <section class="my-profile-hero">
        <div>
          <p class="directory-kicker">MITT KONTO</p>
          <h1>Min profil</h1>
          <p>Din egen yta på Svensk eHockey. Ändringar som påverkar den publika spelarprofilen skickas till admin för godkännande.</p>
        </div>
        <div class="my-profile-hero__actions"><a href="#/free-agents">Free Agents →</a></div>
      </section>

      <section id="myProfileGate" class="my-profile-gate">
        <p class="directory-kicker">DISCORD</p>
        <h2>Logga in för att fortsätta</h2>
        <p id="myProfileGateText">Du behöver ett godkänt Discord-konto kopplat till din spelarprofil.</p>
        <div class="my-profile-gate__actions"><button id="myProfileDiscordLogin" type="button">Logga in med Discord</button><a href="#/free-agents">Koppla spelarprofil →</a></div>
        <p id="myProfileGateStatus" class="my-profile-status" role="status"></p>
      </section>

      <div id="myProfileDashboard" hidden>
        <section class="my-profile-identity">
          <div class="my-profile-identity__portrait"><img id="myProfilePortrait" src="players/1DEFAULTBILDID.png" alt=""></div>
          <div class="my-profile-identity__copy">
            <span>KOPPLAD SPELARE</span>
            <h2 id="myProfileName">–</h2>
            <p id="myProfileMeta">–</p>
            <div class="my-profile-identity__chips"><b id="myProfileDiscord">Discord: –</b><b id="myProfileFaState">FA: –</b></div>
          </div>
          <a id="myProfilePublicLink" class="my-profile-public-link" href="#/spelare">Öppna publik profil →</a>
        </section>

        <div class="my-profile-layout">
          <section class="my-profile-card my-profile-editor">
            <div class="my-profile-card__head"><div><p class="directory-kicker">MIN PROFIL</p><h2>Det här kan du skicka in</h2></div><span>ADMIN GODKÄNNER</span></div>
            <p class="my-profile-help">Din statistik, ranking och historik ändras aldrig här. De fortsätter komma från Svensk eHockey-databasen.</p>

            <label class="my-profile-field my-profile-field--wide"><span>PRESENTATION</span><textarea id="myProfilePresentation" maxlength="1000" rows="5" placeholder="Berätta kort om dig som spelare, spelstil eller vad du vill att andra ska veta."></textarea><small><b id="myProfilePresentationCount">0</b>/1000</small></label>
            <div class="my-profile-form-grid">
              <label class="my-profile-field"><span>POSITIONER</span><input id="myProfilePositions" maxlength="100" placeholder="T.ex. VF / C eller G"></label>
              <label class="my-profile-field"><span>TILLGÄNGLIGHET / STATUS</span><input id="myProfileAvailability" maxlength="160" placeholder="T.ex. Aktiv, backup, paus"></label>
            </div>
            <label class="my-profile-field"><span>LAGSTATUS</span><input id="myProfileTeamStatus" maxlength="200" placeholder="T.ex. Spelar i X, söker nytt lag, laglös"></label>
            <div class="my-profile-form-grid">
              <label class="my-profile-field"><span>KONTAKT</span><input id="myProfileContact" maxlength="160" placeholder="T.ex. Discord: namn"></label>
              <label class="my-profile-field"><span>TWITCH</span><input id="myProfileTwitch" maxlength="300" placeholder="https://twitch.tv/..."></label>
              <label class="my-profile-field"><span>X / TWITTER</span><input id="myProfileX" maxlength="300" placeholder="https://x.com/..."></label>
              <label class="my-profile-field"><span>INSTAGRAM</span><input id="myProfileInstagram" maxlength="300" placeholder="https://instagram.com/..."></label>
            </div>

            <div class="my-profile-image-submit">
              <div><span>SPELARBILD</span><strong>Föreslå ny profilbild</strong><small>JPG, PNG eller WEBP · max 8 MB. Bilden används först efter admin-godkännande.</small></div>
              <label class="my-profile-file"><input id="myProfileImage" type="file" accept="image/jpeg,image/png,image/webp"><span>Välj bild</span></label>
              <img id="myProfileImagePreview" alt="Förhandsvisning" hidden>
            </div>

            <div class="my-profile-actions"><button id="myProfileSubmit" type="button">Skicka ändringar till admin</button><button id="myProfileReset" class="my-profile-secondary" type="button">Återställ</button></div>
            <p id="myProfileFormStatus" class="my-profile-status" role="status" aria-live="polite"></p>
          </section>

          <aside class="my-profile-side">
            <section class="my-profile-card">
              <div class="my-profile-card__head"><div><p class="directory-kicker">MIN STATUS</p><h2>Snabblänkar</h2></div></div>
              <div class="my-profile-status-links"><a href="#/free-agents"><span>FREE AGENT</span><strong id="myProfileFaLinkText">Hantera FA</strong><b>→</b></a><a id="myProfileSportsGamer" href="#" target="_blank" rel="noopener noreferrer" hidden><span>SPORTSGAMER</span><strong>Öppna originalprofil</strong><b>↗</b></a></div>
            </section>

            <section class="my-profile-card">
              <div class="my-profile-card__head"><div><p class="directory-kicker">MINA ÄRENDEN</p><h2>Godkännanden</h2></div><strong id="myProfilePendingCount">0</strong></div>
              <div id="myProfileRequests" class="my-profile-request-list"></div>
            </section>
          </aside>
        </div>

        <section class="my-profile-card my-profile-report">
          <div class="my-profile-card__head"><div><p class="directory-kicker">RAPPORTERA FEL</p><h2>Något i historiken som inte stämmer?</h2><p>Rapporten går till Admincenter. Du ändrar aldrig statistik eller historik direkt.</p></div></div>
          <div class="my-profile-report-grid">
            <label class="my-profile-field"><span>VAD GÄLLER DET?</span><select id="myProfileReportCategory"><option>Spelarhistorik</option><option>Lag</option><option>Statistik</option><option>Gamertag / alias</option><option>Position</option><option>Annat</option></select></label>
            <label class="my-profile-field"><span>REFERENS / SÄSONG (VALFRITT)</span><input id="myProfileReportReference" maxlength="200" placeholder="T.ex. ECL '26 Spring / lag / match"></label>
          </div>
          <label class="my-profile-field"><span>BESKRIV FELET</span><textarea id="myProfileReportDetails" maxlength="1500" rows="4" placeholder="Beskriv vad som är fel och vad du anser ska vara rätt."></textarea></label>
          <div class="my-profile-actions"><button id="myProfileReportSubmit" type="button">Skicka felrapport</button></div>
          <p id="myProfileReportStatus" class="my-profile-status" role="status"></p>
        </section>
      </div>
    </main>
    <footer class="directory-footer"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>
  `;

  function SEH_initMyProfile() {
    const root = document.querySelector('#spaRouteView[data-route="myProfile"]');
    if (!root) return;
    const $ = (id) => root.querySelector(`#${id}`);
    const sb = sehGetAuthClient();
    const clean = (value) => String(value ?? '').trim();
    let dashboard = null;
    let selectedImageUrl = '';

    const status = (id, text, tone='') => { const el=$(id); if(!el)return; el.textContent=text||''; if(tone)el.dataset.tone=tone; else el.removeAttribute('data-tone'); };
    const isDiscord = (user) => (user?.app_metadata?.provider === 'discord') || (user?.app_metadata?.providers || []).includes('discord') || (user?.identities || []).some((x)=>x.provider==='discord');
    const playerImage = (player, profile) => clean(profile?.image_url) || (clean(player?.sports_gamer_player_url).match(/\/players\/(\d+)/i)?.[1] ? SEH_playerImageUrl(clean(player.sports_gamer_player_url).match(/\/players\/(\d+)/i)?.[1], clean(player.player_image)) : (clean(player?.player_image) || 'players/1DEFAULTBILDID.png'));
    const dateText = (value) => { if(!value)return ''; const d=new Date(value); return Number.isNaN(d.getTime())?String(value).slice(0,10):new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'short',day:'numeric'}).format(d); };
    const requestLabel = (row) => row.request_type==='report' ? `Felrapport · ${clean(row.payload?.category)||'Annat'}` : 'Profiländring';
    const statusLabel = (value) => value==='approved'?'Godkänd':value==='rejected'?'Avslagen':'Väntar på admin';

    async function discordLogin(){
      status('myProfileGateStatus','Öppnar Discord…','working');
      try{
        const {data:existing}=await sb.auth.getSession();
        if(existing?.session&&!isDiscord(existing.session.user))await sb.auth.signOut();
        localStorage.setItem('seh_oauth_return','#/min-profil');
        const redirectTo=`${window.location.origin}${window.location.pathname}`;
        const {error}=await sb.auth.signInWithOAuth({provider:'discord',options:{redirectTo}});
        if(error)throw error;
      }catch(error){status('myProfileGateStatus',`Fel: ${error?.message||error}`,'error');}
    }

    function fillForm(){
      const player=dashboard?.player||{}, profile=dashboard?.profile||{};
      const pending=(Array.isArray(dashboard?.requests)?dashboard.requests:[]).find((row)=>row.request_type==='profile_update'&&row.status==='pending');
      const source=pending?.payload||profile;
      $('myProfilePresentation').value=source.presentation||'';
      $('myProfilePositions').value=source.positions_text||player.primary_position||'';
      $('myProfileAvailability').value=source.availability_status||'';
      $('myProfileTeamStatus').value=source.team_status||'';
      $('myProfileContact').value=source.contact||(`Discord: ${dashboard?.discord_username||''}`);
      $('myProfileTwitch').value=source.twitch_url||'';
      $('myProfileX').value=source.x_url||'';
      $('myProfileInstagram').value=source.instagram_url||'';
      selectedImageUrl=source.image_url||profile.image_url||'';
      $('myProfileImage').value='';
      const preview=$('myProfileImagePreview');
      if(pending?.payload?.image_url && pending.payload.image_url!==profile.image_url){preview.src=pending.payload.image_url;preview.hidden=false;}else preview.hidden=true;
      $('myProfilePresentationCount').textContent=String($('myProfilePresentation').value.length);
      if(pending)status('myProfileFormStatus','Du har redan profiländringar som väntar på admin. Du kan uppdatera dem genom att skicka formuläret igen.','working');
    }

    function renderRequests(){
      const host=$('myProfileRequests'); host.replaceChildren();
      const rows=Array.isArray(dashboard?.requests)?dashboard.requests:[];
      const pending=rows.filter((row)=>row.status==='pending');
      $('myProfilePendingCount').textContent=String(pending.length);
      if(!rows.length){const p=document.createElement('p');p.className='my-profile-empty';p.textContent='Du har inga profilärenden ännu.';host.append(p);return;}
      for(const row of rows.slice(0,8)){
        const item=document.createElement('article');item.className=`my-profile-request is-${row.status||'pending'}`;
        item.innerHTML=`<div><span>${escapeHtml(requestLabel(row))}</span><strong>${escapeHtml(statusLabel(row.status))}</strong><small>${escapeHtml(dateText(row.submitted_at))}${row.admin_note?` · ${escapeHtml(row.admin_note)}`:''}</small></div>`;
        host.append(item);
      }
    }

    function renderDashboard(){
      const player=dashboard?.player||{}, profile=dashboard?.profile||{}, fa=dashboard?.free_agent||{};
      $('myProfileGate').hidden=true;$('myProfileDashboard').hidden=false;
      $('myProfileName').textContent=player.display_gamertag||'Kopplad spelare';
      $('myProfileMeta').textContent=[player.primary_position,player.latest_ecl_team,player.latest_ecl_division].filter(Boolean).join(' · ')||'Svensk eHockey-profil';
      $('myProfileDiscord').textContent=`Discord: ${dashboard?.discord_username||'–'}`;
      const faActive=Boolean(fa.id&&fa.is_active!==false);$('myProfileFaState').textContent=faActive?'Free Agent: aktiv':'Free Agent: inte aktiv';
      $('myProfileFaLinkText').textContent=faActive?'Redigera min Free Agent':'Bli Free Agent';
      const portrait=$('myProfilePortrait');portrait.src=playerImage(player,profile);portrait.onerror=()=>{portrait.onerror=null;portrait.src='players/1DEFAULTBILDID.png';};
      const profileLink=$('myProfilePublicLink');profileLink.href=player.player_key?`#/spelare/${encodeURIComponent(player.player_key)}`:'#/spelare';
      const sg=$('myProfileSportsGamer');if(clean(player.sports_gamer_player_url)){sg.href=player.sports_gamer_player_url;sg.hidden=false;}else sg.hidden=true;
      fillForm();renderRequests();
    }

    async function load(){
      status('myProfileGateStatus','Kontrollerar Discord-kontot…','working');
      const {data,error}=await sb.auth.getSession();
      if(error){status('myProfileGateStatus',`Fel: ${error.message}`,'error');return;}
      const session=data?.session;
      if(!session?.user){
        $('myProfileGate').hidden=false;$('myProfileDashboard').hidden=true;
        $('myProfileGateText').textContent='Du behöver logga in med Discord för att öppna Min profil.';
        status('myProfileGateStatus','');return;
      }
      if(!isDiscord(session.user)){
        $('myProfileGate').hidden=false;$('myProfileDashboard').hidden=true;
        $('myProfileGateText').textContent='Du är inloggad med ett annat konto. Den här sidan kräver Discord.';
        status('myProfileGateStatus','');return;
      }

      // Kontrollera den faktiska spelar-kopplingen först. Free Agents använder samma rad,
      // så Min profil ska aldrig kunna visa "inte kopplad" bara för att dashboard-RPC:n
      // råkar svara sent under auth/session-uppstarten.
      const {data:link,error:linkError}=await sb
        .from('ehockey_discord_player_links')
        .select('status,approved_player_key,discord_username')
        .eq('user_id',session.user.id)
        .maybeSingle();

      if(linkError){
        $('myProfileGate').hidden=false;$('myProfileDashboard').hidden=true;
        $('myProfileGateText').textContent='Din Discord-session är aktiv, men spelar-kopplingen kunde inte kontrolleras just nu.';
        status('myProfileGateStatus',`Försöker igen… (${linkError.message})`,'working');
        window.setTimeout(()=>load().catch(()=>{}),800);
        return;
      }

      const approvedKey=clean(link?.approved_player_key);
      if(link?.status!=='approved' || !approvedKey){
        $('myProfileGate').hidden=false;$('myProfileDashboard').hidden=true;
        $('myProfileGateText').textContent=link?.status==='pending'
          ? 'Din spelarkoppling väntar fortfarande på admin-godkännande.'
          : 'Discord-kontot är inte kopplat till en godkänd spelarprofil ännu. Gå till Free Agents och koppla din profil först.';
        status('myProfileGateStatus','');return;
      }

      // Kopplingen är bekräftat godkänd. Retry:a dashboarden vid tillfälligt auth-/API-fel
      // istället för att felaktigt behandla spelaren som okopplad.
      let result=null;
      for(let attempt=0;attempt<3;attempt+=1){
        result=await sb.rpc('seh_get_my_player_dashboard');
        if(!result.error)break;
        if(attempt===0){try{await sb.auth.getUser();}catch{}}
        if(attempt<2)await new Promise((resolve)=>window.setTimeout(resolve,250+(attempt*350)));
      }

      if(result?.error){
        $('myProfileGate').hidden=false;$('myProfileDashboard').hidden=true;
        $('myProfileGateText').textContent=`${link.discord_username||'Discord-kontot'} är godkänt och kopplat till en spelarprofil, men profildatan kunde inte laddas just nu.`;
        status('myProfileGateStatus',`Laddar om automatiskt… (${result.error.message})`,'working');
        window.setTimeout(()=>load().catch(()=>{}),1200);
        return;
      }

      dashboard=result?.data||{};
      renderDashboard();
      status('myProfileGateStatus','');
    }

    async function uploadImage(file){
      if(!file)return selectedImageUrl||'';
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Bilden måste vara JPG, PNG eller WEBP.');
      if(file.size>8*1024*1024)throw new Error('Bilden får vara högst 8 MB.');
      const {data:sessionData}=await sb.auth.getSession();const userId=sessionData?.session?.user?.id;if(!userId)throw new Error('Discord-sessionen saknas.');
      const extension=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
      const path=`submissions/${userId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${extension}`;
      const {error}=await sb.storage.from('player-profile-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;
      return sb.storage.from('player-profile-images').getPublicUrl(path).data.publicUrl;
    }

    async function submitProfile(){
      status('myProfileFormStatus','Skickar till admin…','working');$('myProfileSubmit').disabled=true;
      try{
        const imageUrl=await uploadImage($('myProfileImage').files?.[0]);
        const payload={
          presentation:clean($('myProfilePresentation').value),positions_text:clean($('myProfilePositions').value),availability_status:clean($('myProfileAvailability').value),team_status:clean($('myProfileTeamStatus').value),contact:clean($('myProfileContact').value),twitch_url:clean($('myProfileTwitch').value),x_url:clean($('myProfileX').value),instagram_url:clean($('myProfileInstagram').value),image_url:imageUrl
        };
        const {error}=await sb.rpc('seh_submit_player_profile_request',{p_request_type:'profile_update',p_payload:payload});if(error)throw error;
        selectedImageUrl=imageUrl;status('myProfileFormStatus','Skickat. Ändringarna blir publika först när admin godkänt dem.','success');await load();
      }catch(error){status('myProfileFormStatus',`Fel: ${error?.message||error}`,'error');}finally{$('myProfileSubmit').disabled=false;}
    }

    async function submitReport(){
      const details=clean($('myProfileReportDetails').value);if(details.length<5){status('myProfileReportStatus','Beskriv felet lite tydligare.','error');return;}
      status('myProfileReportStatus','Skickar rapport…','working');$('myProfileReportSubmit').disabled=true;
      try{
        const payload={category:clean($('myProfileReportCategory').value),reference:clean($('myProfileReportReference').value),details};
        const {error}=await sb.rpc('seh_submit_player_profile_request',{p_request_type:'report',p_payload:payload});if(error)throw error;
        $('myProfileReportDetails').value='';$('myProfileReportReference').value='';status('myProfileReportStatus','Rapporten är skickad till Admincenter.','success');await load();
      }catch(error){status('myProfileReportStatus',`Fel: ${error?.message||error}`,'error');}finally{$('myProfileReportSubmit').disabled=false;}
    }

    $('myProfileDiscordLogin')?.addEventListener('click',discordLogin);
    $('myProfilePresentation')?.addEventListener('input',()=>{$('myProfilePresentationCount').textContent=String($('myProfilePresentation').value.length);});
    $('myProfileImage')?.addEventListener('change',()=>{const file=$('myProfileImage').files?.[0],preview=$('myProfileImagePreview');if(!file){preview.hidden=true;return;}preview.src=URL.createObjectURL(file);preview.hidden=false;});
    $('myProfileSubmit')?.addEventListener('click',submitProfile);
    $('myProfileReset')?.addEventListener('click',()=>{fillForm();status('myProfileFormStatus','');});
    $('myProfileReportSubmit')?.addEventListener('click',submitReport);
    sb.auth.onAuthStateChange(()=>window.setTimeout(()=>load().catch((error)=>status('myProfileGateStatus',`Fel: ${error?.message||error}`,'error')),0));
    load().catch((error)=>status('myProfileGateStatus',`Fel: ${error?.message||error}`,'error'));
  }

  function SEH_initAdminCenter() {
(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  const supabaseUrl = cfg.supabaseUrl || cfg.SUPABASE_URL || '';
  const supabaseKey = cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || '';
  let sb = null;
  try { if (!window.supabase?.createClient) throw Error('Supabase-biblioteket kunde inte laddas.'); if (!supabaseUrl || !supabaseKey) throw Error('Supabase-inställningar saknas i config.js.'); sb = sehGetAuthClient(); } catch (e) { $('adminLoginStatus').textContent = 'Fel: ' + e.message; }
  let writer = null, requestId = sessionStorage.getItem('seh_player_sync_request_id') || '', timer = null;
  let statsRequestId = sessionStorage.getItem('seh_player_stats_sync_request_id') || '', statsTimer = null;
  const rpcRow = (value) => Array.isArray(value) ? value[0] : value;
  const emailFor = (v) => { const n = String(v || '').trim().toLowerCase(); return /^[a-z0-9._-]{2,40}$/.test(n) ? n + '@writers.svenskehockey.se' : ''; };

  let faDirectory = [], faEntries = [], faLinkRequests = [], faApprovedLinks = [], faApprovalRequests = [], profileApprovalRequests = [], faSelectedKey = '', faSelectedId = 0, faManualName = '';
  const faClean = (v) => String(v ?? '').trim();
  const faToday = () => new Date().toLocaleDateString('sv-SE');
  const faSplitDisplay = (v) => [...new Set(String(v || '').split(/[,;\/+]+/).map((x) => x.trim()).filter(Boolean))];
  const faDirectoryMap = () => new Map(faDirectory.map((row) => [String(row.player_key), row]));
  const faPositionCanonical = (value) => {
    const p = faClean(value).toUpperCase();
    const map = { VF:'LW', HF:'RW', VB:'LD', HB:'RD', BACK:'D', DEF:'D', FORWARD:'F', MÅLVAKT:'G', GOALIE:'G' };
    return map[p] || p;
  };
  const faPositionParts = (value) => faSplitDisplay(value).map(faPositionCanonical).filter(Boolean);
  const faLevelParts = (value) => {
    const source = faClean(value).toLowerCase();
    if (!source) return [];
    if (/\balla\b/.test(source)) return ['Elite','Pro','Lite','Core','Neo'];
    return ['Elite','Pro','Lite','Core','Neo'].filter((level) => source.includes(level.toLowerCase()));
  };
  async function faFetchDirectory(){
    const rows=[],pageSize=1000;
    for(let from=0;;from+=pageSize){
      const{data,error}=await sb.from('app_player_directory_cache').select('player_key,display_gamertag,primary_position,latest_team').order('display_gamertag',{ascending:true}).range(from,from+pageSize-1);
      if(error)throw error;
      rows.push(...(data||[]));
      if(!data||data.length<pageSize)break;
    }
    return rows;
  }
  function faSetStatus(message,tone=''){const el=$('faAdminStatus');if(!el)return;el.textContent=message;el.dataset.tone=tone;}
  function faEntryForKey(key){return faEntries.find((row)=>row.player_key && String(row.player_key)===String(key))||null;}
  function faEntryForManual(name){const n=faClean(name).toLocaleLowerCase('sv-SE');return faEntries.find((row)=>!row.player_key&&faClean(row.manual_gamertag).toLocaleLowerCase('sv-SE')===n)||null;}
  function faEntryById(id){return faEntries.find((row)=>Number(row.id)===Number(id))||null;}
  function faPositionText(entry,player){
    if(faClean(entry?.positions_text))return faClean(entry.positions_text);
    const values=[faClean(entry?.primary_position)||faClean(player?.primary_position),...(Array.isArray(entry?.alternate_positions)?entry.alternate_positions:[])].filter(Boolean);
    return values.join(' / ');
  }
  function faLevelsText(entry){
    if(faClean(entry?.levels_text))return faClean(entry.levels_text);
    return Array.isArray(entry?.looking_for_levels)?entry.looking_for_levels.join(' / '):'';
  }
  function faResetForm(){
    faSelectedKey='';faSelectedId=0;faManualName='';
    if($('faAdminSearch'))$('faAdminSearch').value='';
    $('faAdminSearchResults')?.replaceChildren();
    if($('faAdminSelected'))$('faAdminSelected').hidden=true;
    if($('faAdminSelectedType'))$('faAdminSelectedType').textContent='VALD SPELARE';
    if($('faAdminPositions'))$('faAdminPositions').value='';
    if($('faAdminLevels'))$('faAdminLevels').value='';
    if($('faAdminDate'))$('faAdminDate').value=faToday();
    if($('faAdminAvailability'))$('faAdminAvailability').value='';
    if($('faAdminContact'))$('faAdminContact').value='';
    if($('faAdminMessage'))$('faAdminMessage').value='';
    if($('faAdminExpires'))$('faAdminExpires').value='';
    if($('faAdminSave')){$('faAdminSave').disabled=true;$('faAdminSave').textContent='Spara Free Agent';}
  }
  function faFillForm(entry,player){
    $('faAdminPositions').value=faPositionText(entry,player);
    $('faAdminLevels').value=faLevelsText(entry);
    $('faAdminDate').value=entry?.fa_date?String(entry.fa_date).slice(0,10):faToday();
    $('faAdminAvailability').value=entry?.availability||'';
    $('faAdminContact').value=entry?.contact||'';
    $('faAdminMessage').value=entry?.message||'';
    $('faAdminExpires').value=entry?.expires_at?String(entry.expires_at).slice(0,10):'';
    $('faAdminSave').textContent=entry?'Uppdatera Free Agent':'Spara Free Agent';
    $('faAdminSave').disabled=false;
  }
  function faSelectPlayer(key){
    const player=faDirectoryMap().get(String(key));if(!player)return;
    const entry=faEntryForKey(key);
    faSelectedKey=String(key);faSelectedId=Number(entry?.id)||0;faManualName='';
    $('faAdminSelected').hidden=false;
    $('faAdminSelectedType').textContent='KOPPLAD SPELARE';
    $('faAdminSelectedName').textContent=player.display_gamertag||player.player_key;
    $('faAdminSelectedMeta').textContent=[player.primary_position,player.latest_team].filter(Boolean).join(' · ')||'Spelarprofil hittad';
    $('faAdminSearch').value=player.display_gamertag||'';
    $('faAdminSearchResults').replaceChildren();
    faFillForm(entry,player);
    faSetStatus('');
  }
  function faSelectManual(name,entry=null){
    const manual=faClean(name);if(!manual)return;
    const existing=entry||faEntryForManual(manual);
    faSelectedKey='';faSelectedId=Number(existing?.id)||0;faManualName=manual;
    $('faAdminSelected').hidden=false;
    $('faAdminSelectedType').textContent='MANUELL GAMERTAG';
    $('faAdminSelectedName').textContent=existing?.manual_gamertag||manual;
    $('faAdminSelectedMeta').textContent='Ingen kopplad spelarprofil – posten kan ändå publiceras som Free Agent.';
    $('faAdminSearch').value=existing?.manual_gamertag||manual;
    $('faAdminSearchResults').replaceChildren();
    faFillForm(existing,null);
    faSetStatus('');
  }
  function faRenderSearch(){
    const host=$('faAdminSearchResults');if(!host)return;
    const raw=faClean($('faAdminSearch')?.value),q=raw.toLocaleLowerCase('sv-SE');host.replaceChildren();
    if(q.length<2)return;
    const matches=faDirectory.filter((row)=>`${row.display_gamertag||''} ${row.latest_team||''}`.toLocaleLowerCase('sv-SE').includes(q)).slice(0,10);
    matches.forEach((row)=>{
      const button=document.createElement('button');button.type='button';button.dataset.faPlayerKey=row.player_key;
      button.innerHTML=`<strong>${escapeHtml(row.display_gamertag||row.player_key)}</strong><span>${escapeHtml([row.primary_position,row.latest_team].filter(Boolean).join(' · ')||'–')}</span>`;
      host.append(button);
    });
    const exact=matches.some((row)=>faClean(row.display_gamertag).toLocaleLowerCase('sv-SE')===q);
    if(!exact){
      const manual=document.createElement('button');manual.type='button';manual.className='fa-admin-manual';manual.dataset.faManual=raw;
      const existing=faEntryForManual(raw);
      manual.innerHTML=`<strong>${existing?'Redigera manuell post':'Använd gamertag manuellt'}: ${escapeHtml(raw)}</strong><span>${existing?'Redan sparad som Free Agent':'För spelare som inte finns i registret'}</span>`;
      host.append(manual);
    }
  }
  function faRenderList(){
    const host=$('faAdminList');if(!host)return;
    const playerMap=faDirectoryMap();host.replaceChildren();$('faAdminCount').textContent=String(faEntries.length);
    if(!faEntries.length){const empty=document.createElement('p');empty.className='fa-admin-empty';empty.textContent='Inga Free Agents är registrerade ännu.';host.append(empty);return;}
    faEntries.forEach((entry)=>{
      const player=entry.player_key?playerMap.get(String(entry.player_key)):null;
      const name=player?.display_gamertag||entry.manual_gamertag||entry.player_key||'Okänd';
      const detail=[faPositionText(entry,player),faLevelsText(entry),entry.fa_date?`FA ${String(entry.fa_date).slice(0,10)}`:''].filter(Boolean).join(' · ');
      const row=document.createElement('article');row.className=`fa-admin-row${entry.is_active?'':' is-inactive'}`;
      row.innerHTML=`<div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(detail||'–')}</span></div><em>${entry.is_active?'AKTIV':'INAKTIV'}</em><div class="fa-admin-row__actions"><button type="button" class="writer-secondary" data-fa-edit-id="${entry.id}">Redigera</button><button type="button" class="writer-secondary" data-fa-toggle="${entry.id}">${entry.is_active?'Avaktivera':'Aktivera'}</button><button type="button" class="writer-secondary fa-admin-delete" data-fa-delete="${entry.id}">Ta bort</button></div>`;
      host.append(row);
    });
  }
  function faApprovalPlayerName(key){return faDirectoryMap().get(String(key))?.display_gamertag||String(key||'Okänd spelare');}
  function faRenderApprovals(){
    const linkHost=$('faAdminLinkRequests'),approvedHost=$('faAdminApprovedLinks'),requestHost=$('faAdminRequests');
    if($('faAdminLinkRequestCount'))$('faAdminLinkRequestCount').textContent=String(faLinkRequests.length);
    if($('faAdminApprovedLinkCount'))$('faAdminApprovedLinkCount').textContent=String(faApprovedLinks.length);
    if($('faAdminRequestCount'))$('faAdminRequestCount').textContent=String(faApprovalRequests.length);
    if(linkHost){
      linkHost.replaceChildren();
      if(!faLinkRequests.length){const p=document.createElement('p');p.className='fa-admin-empty';p.textContent='Inga spelarkopplingar väntar.';linkHost.append(p);}
      for(const row of faLinkRequests){const item=document.createElement('article');item.className='fa-admin-request-row';item.innerHTML=`<div><span>DISCORD</span><strong>${escapeHtml(row.discord_username||row.discord_user_id||'Discord-konto')}</strong><small>vill kopplas till <b>${escapeHtml(faApprovalPlayerName(row.requested_player_key))}</b></small></div><div class="fa-admin-request-actions"><button type="button" data-fa-link-approve="${escapeHtml(row.user_id)}">Godkänn</button><button type="button" class="writer-secondary" data-fa-link-reject="${escapeHtml(row.user_id)}">Avslå</button></div>`;linkHost.append(item);}
    }
    if(approvedHost){
      approvedHost.replaceChildren();
      if(!faApprovedLinks.length){const p=document.createElement('p');p.className='fa-admin-empty';p.textContent='Inga godkända Discord-kopplingar ännu.';approvedHost.append(p);}
      for(const row of faApprovedLinks){const item=document.createElement('article');item.className='fa-admin-request-row';item.innerHTML=`<div><span>GODKÄND KOPPLING</span><strong>${escapeHtml(row.discord_username||row.discord_user_id||'Discord-konto')}</strong><small>kopplad till <b>${escapeHtml(faApprovalPlayerName(row.approved_player_key))}</b></small></div><div class="fa-admin-request-actions"><button type="button" class="writer-secondary fa-admin-delete" data-fa-link-unlink="${escapeHtml(row.user_id)}">Ta bort koppling</button></div>`;approvedHost.append(item);}
    }
    if(requestHost){
      requestHost.replaceChildren();
      if(!faApprovalRequests.length){const p=document.createElement('p');p.className='fa-admin-empty';p.textContent='Inga FA-förfrågningar väntar.';requestHost.append(p);}
      for(const row of faApprovalRequests){const typeLabel=row.request_type==='remove'?'TA BORT':row.request_type==='update'?'ÄNDRING':'NY FA';const detail=[row.positions_text,row.levels_text,row.message].filter(Boolean).join(' · ');const item=document.createElement('article');item.className=`fa-admin-request-row${row.request_type==='remove'?' is-remove':''}`;item.innerHTML=`<div><span>${escapeHtml(typeLabel)} · ${escapeHtml(row.discord_username||'Discord')}</span><strong>${escapeHtml(faApprovalPlayerName(row.player_key))}</strong><small>${escapeHtml(detail||'Ingen extra kommentar')}</small></div><div class="fa-admin-request-actions"><button type="button" data-fa-request-approve="${row.id}">${row.request_type==='remove'?'Godkänn borttagning':'Godkänn'}</button><button type="button" class="writer-secondary" data-fa-request-reject="${row.id}">Avslå</button></div>`;requestHost.append(item);}
    }
  }
  function profileRequestDetail(row){
    const payload=row?.payload||{};
    if(row?.request_type==='report'){
      return [payload.category,payload.reference,payload.details].filter(Boolean).join(' · ');
    }
    return [payload.positions_text,payload.availability_status,payload.team_status,payload.presentation].filter(Boolean).join(' · ');
  }
  function renderProfileApprovals(){
    const host=$('profileAdminRequests');
    if($('profileAdminRequestCount'))$('profileAdminRequestCount').textContent=String(profileApprovalRequests.length);
    if(!host)return;
    host.replaceChildren();
    if(!profileApprovalRequests.length){const p=document.createElement('p');p.className='fa-admin-empty';p.textContent='Inga profilärenden väntar.';host.append(p);return;}
    for(const row of profileApprovalRequests){
      const label=row.request_type==='report'?'FELRAPPORT':'PROFILÄNDRING';
      const detail=profileRequestDetail(row)||'Ingen extra information';
      const item=document.createElement('article');item.className=`fa-admin-request-row${row.request_type==='report'?' is-report':''}`;
      item.innerHTML=`<div><span>${label}</span><strong>${escapeHtml(faApprovalPlayerName(row.player_key))}</strong><small>${escapeHtml(detail)}</small></div><div class="fa-admin-request-actions"><button type="button" data-profile-request-approve="${row.id}">${row.request_type==='report'?'Markera hanterad':'Godkänn'}</button><button type="button" class="writer-secondary" data-profile-request-reject="${row.id}">${row.request_type==='report'?'Avslå / stäng':'Avslå'}</button></div>`;
      host.append(item);
    }
  }
  async function loadProfileApprovals(){
    if(!sb||writer?.role!=='admin')return;
    const result=await sb.from('ehockey_player_profile_requests').select('*').eq('status','pending').order('submitted_at',{ascending:true});
    if(result.error)throw result.error;
    profileApprovalRequests=result.data||[];
    renderProfileApprovals();
  }
  async function reviewProfileRequest(id,decision){
    faSetStatus(decision==='approved'?'Behandlar profilärendet…':'Avslår profilärendet…','working');
    const{error}=await sb.rpc('seh_review_player_profile_request',{p_request_id:Number(id),p_decision:decision,p_admin_note:null});
    if(error){faSetStatus('Fel: '+error.message,'error');return;}
    faSetStatus(decision==='approved'?'Profilärendet är godkänt/hanterat.':'Profilärendet är avslaget.','success');
    await loadProfileApprovals();
  }
  async function loadFreeAgentApprovals(){
    if(!sb||writer?.role!=='admin')return;
    const [linksResult,approvedLinksResult,requestsResult]=await Promise.all([
      sb.from('ehockey_discord_player_links').select('*').eq('status','pending').order('updated_at',{ascending:true}),
      sb.from('ehockey_discord_player_links').select('*').eq('status','approved').not('approved_player_key','is',null).order('updated_at',{ascending:false}),
      sb.from('ehockey_free_agent_requests').select('*').eq('status','pending').order('submitted_at',{ascending:true})
    ]);
    if(linksResult.error)throw linksResult.error;if(approvedLinksResult.error)throw approvedLinksResult.error;if(requestsResult.error)throw requestsResult.error;
    faLinkRequests=linksResult.data||[];faApprovedLinks=approvedLinksResult.data||[];faApprovalRequests=requestsResult.data||[];faRenderApprovals();await loadProfileApprovals();
  }
  async function faReviewLink(userId,decision){
    faSetStatus(decision==='approved'?'Godkänner spelarkoppling…':'Avslår spelarkoppling…','working');
    const{error}=await sb.rpc('seh_review_discord_player_link',{p_user_id:userId,p_decision:decision});
    if(error){faSetStatus('Fel: '+error.message,'error');return;}faSetStatus(decision==='approved'?'Spelarkopplingen är godkänd.':'Spelarkopplingen är avslagen.','success');await loadFreeAgentApprovals();
  }
  async function faUnlinkPlayer(userId){
    const link=faApprovedLinks.find((row)=>String(row.user_id)===String(userId));
    const discordName=link?.discord_username||'Discord-kontot';
    const playerName=faApprovalPlayerName(link?.approved_player_key);
    if(!confirm(`Ta bort kopplingen ${discordName} → ${playerName}?

Free Agent-annonsen ligger kvar, men Discord-kontot måste kopplas och godkännas igen för att spelaren ska kunna hantera den själv.`))return;
    faSetStatus('Tar bort Discord-kopplingen…','working');
    const{error}=await sb.rpc('seh_unlink_discord_player',{p_user_id:userId});
    if(error){faSetStatus('Fel: '+error.message,'error');return;}
    faSetStatus('Discord-kopplingen är borttagen. Free Agent-annonsen är oförändrad.','success');
    await loadFreeAgentApprovals();
  }
  async function faReviewRequest(id,decision){
    faSetStatus(decision==='approved'?'Behandlar FA-förfrågan…':'Avslår FA-förfrågan…','working');
    const{error}=await sb.rpc('seh_review_free_agent_request',{p_request_id:Number(id),p_decision:decision,p_admin_note:null});
    if(error){faSetStatus('Fel: '+error.message,'error');return;}faSetStatus(decision==='approved'?'FA-förfrågan är godkänd.':'FA-förfrågan är avslagen.','success');await loadFreeAgentAdmin();
  }
  async function loadFreeAgentAdmin(){
    if(!sb||writer?.role!=='admin'||!$('faAdminList'))return;
    faSetStatus('Laddar Free Agents…','working');
    try{
      const[directory,entriesResult]=await Promise.all([faFetchDirectory(),sb.from('ehockey_free_agents').select('*').order('fa_date',{ascending:false}).order('updated_at',{ascending:false})]);
      if(entriesResult.error)throw entriesResult.error;
      faDirectory=directory;faEntries=entriesResult.data||[];faRenderList();await loadFreeAgentApprovals();faSetStatus('');
    }catch(error){faSetStatus('Fel: '+(error?.message||error),'error');}
  }
  async function faSave(){
    if(!faSelectedKey&&!faManualName)return faSetStatus('Välj en spelare eller använd en manuell gamertag först.','error');
    const positionsText=faClean($('faAdminPositions').value),levelsText=faClean($('faAdminLevels').value),positions=faPositionParts(positionsText),expires=faClean($('faAdminExpires').value),faDate=faClean($('faAdminDate').value)||faToday();
    const payload={
      player_key:faSelectedKey||null,
      manual_gamertag:faSelectedKey?null:faManualName,
      positions_text:positionsText||null,
      levels_text:levelsText||null,
      primary_position:positions[0]||null,
      alternate_positions:positions.slice(1),
      looking_for_levels:faLevelParts(levelsText),
      fa_date:faDate,
      availability:faClean($('faAdminAvailability').value)||null,
      contact:faClean($('faAdminContact').value)||null,
      message:faClean($('faAdminMessage').value)||null,
      expires_at:expires?`${expires}T23:59:59+02:00`:null,
      is_active:true
    };
    $('faAdminSave').disabled=true;faSetStatus('Sparar…','working');
    try{
      let result;
      if(faSelectedId) result=await sb.from('ehockey_free_agents').update(payload).eq('id',faSelectedId);
      else result=await sb.from('ehockey_free_agents').insert(payload);
      if(result.error)throw result.error;
      const keepKey=faSelectedKey,keepManual=faManualName;
      faSetStatus('Free Agent-annonsen är sparad.','success');
      await loadFreeAgentAdmin();
      if(keepKey)faSelectPlayer(keepKey);else faSelectManual(keepManual);
    }catch(error){faSetStatus('Fel: '+(error?.message||error),'error');}
    finally{$('faAdminSave').disabled=!(faSelectedKey||faManualName);}
  }
  function bindFreeAgentAdmin(){
    faResetForm();
    $('faAdminSearch')?.addEventListener('input',faRenderSearch);
    $('faAdminSearchResults')?.addEventListener('click',(event)=>{
      const linked=event.target.closest('[data-fa-player-key]');if(linked){faSelectPlayer(linked.dataset.faPlayerKey);return;}
      const manual=event.target.closest('[data-fa-manual]');if(manual)faSelectManual(manual.dataset.faManual);
    });
    $('faAdminSave')?.addEventListener('click',faSave);
    $('faAdminClear')?.addEventListener('click',()=>{faResetForm();faSetStatus('');});
    $('faAdminRefresh')?.addEventListener('click',loadFreeAgentAdmin);
    $('faAdminLinkRequests')?.addEventListener('click',(event)=>{
      const approve=event.target.closest('[data-fa-link-approve]'),reject=event.target.closest('[data-fa-link-reject]');
      if(approve)faReviewLink(approve.dataset.faLinkApprove,'approved');else if(reject)faReviewLink(reject.dataset.faLinkReject,'rejected');
    });
    $('faAdminRequests')?.addEventListener('click',(event)=>{
      const approve=event.target.closest('[data-fa-request-approve]'),reject=event.target.closest('[data-fa-request-reject]');
      if(approve)faReviewRequest(approve.dataset.faRequestApprove,'approved');else if(reject)faReviewRequest(reject.dataset.faRequestReject,'rejected');
    });
    $('profileAdminRequests')?.addEventListener('click',(event)=>{
      const approve=event.target.closest('[data-profile-request-approve]'),reject=event.target.closest('[data-profile-request-reject]');
      if(approve)reviewProfileRequest(approve.dataset.profileRequestApprove,'approved');else if(reject)reviewProfileRequest(reject.dataset.profileRequestReject,'rejected');
    });
    $('faAdminApprovedLinks')?.addEventListener('click',(event)=>{
      const unlink=event.target.closest('[data-fa-link-unlink]');
      if(unlink)faUnlinkPlayer(unlink.dataset.faLinkUnlink);
    });
    $('faAdminList')?.addEventListener('click',async(event)=>{
      const edit=event.target.closest('[data-fa-edit-id]');
      if(edit){
        const entry=faEntryById(Number(edit.dataset.faEditId));if(!entry)return;
        if(entry.player_key&&faDirectoryMap().has(String(entry.player_key)))faSelectPlayer(entry.player_key);else faSelectManual(entry.manual_gamertag||String(entry.player_key||''),entry);
        $('faAdminSearch')?.scrollIntoView({behavior:'smooth',block:'center'});return;
      }
      const toggle=event.target.closest('[data-fa-toggle]'),remove=event.target.closest('[data-fa-delete]');
      if(toggle){
        const id=Number(toggle.dataset.faToggle),entry=faEntryById(id);if(!entry)return;
        const{error}=await sb.from('ehockey_free_agents').update({is_active:!entry.is_active}).eq('id',id);
        if(error)return faSetStatus('Fel: '+error.message,'error');await loadFreeAgentAdmin();
      }else if(remove){
        const id=Number(remove.dataset.faDelete);if(!confirm('Ta bort Free Agent-annonsen permanent?'))return;
        const{error}=await sb.from('ehockey_free_agents').delete().eq('id',id);
        if(error)return faSetStatus('Fel: '+error.message,'error');
        if(faSelectedId===id)faResetForm();await loadFreeAgentAdmin();
      }
    });
  }

  const standaloneHeader = document.querySelector('.seh-header--standalone');

  const headerIdentifierToEmail = (value) => {
    const identifier = String(value || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return identifier;
    return emailFor(identifier);
  };

  async function resolveHeaderWriter() {
    if (!sb) return null;
    try {
      const current = await sb.rpc('seh_current_writer');
      if (!current.error) {
        const row = rpcRow(current.data);
        if (row?.writer_id) return row;
      }
    } catch (_) {}
    try {
      const claimed = await sb.rpc('seh_claim_writer');
      if (!claimed.error) {
        const row = rpcRow(claimed.data);
        if (row?.writer_id) return row;
      }
    } catch (_) {}
    return null;
  }

  function updateStandaloneHeader(session, writerRow) {
    if (!standaloneHeader) return;
    const loggedIn = Boolean(session?.user && !session.user.is_anonymous);
    const isWriter = Boolean(writerRow?.writer_id);
    const isAdmin = isWriter && String(writerRow?.role || '').toLowerCase() === 'admin';

    const writerLink = standaloneHeader.querySelector('[data-seh-auth-link="writer"]');
    const adminLink = standaloneHeader.querySelector('[data-seh-auth-link="admin"]');
    if (writerLink) writerLink.hidden = !isWriter;
    if (adminLink) adminLink.hidden = !isAdmin;

    const authRoot = standaloneHeader.querySelector('.seh-auth');
    const authButton = standaloneHeader.querySelector('#sehAuthButton');
    const authPanel = standaloneHeader.querySelector('#sehAuthPanel');
    const authStatus = standaloneHeader.querySelector('#sehAuthStatus');
    if (authRoot) authRoot.dataset.state = loggedIn ? 'logged-in' : 'logged-out';

    if (authButton) {
      authButton.textContent = loggedIn ? 'LOGGA UT' : 'LOGGA IN';
      authButton.classList.toggle('is-authenticated', loggedIn);
      authButton.setAttribute('aria-expanded', 'false');
      authButton.setAttribute('aria-label', loggedIn ? 'Logga ut' : 'Logga in');
    }
    if (loggedIn && authPanel) authPanel.hidden = true;
    if (authStatus && loggedIn) {
      authStatus.textContent = '';
      authStatus.removeAttribute('data-tone');
    }
  }

  async function refreshStandaloneHeader() {
    if (!standaloneHeader || !sb) return;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      const session = data?.session || null;
      const row = session?.user && !session.user.is_anonymous ? await resolveHeaderWriter() : null;
      updateStandaloneHeader(session, row);
    } catch (err) {
      console.warn('Kunde inte uppdatera huvudmenyns inloggningsstatus:', err);
      updateStandaloneHeader(null, null);
    }
  }

  function bindStandaloneHeader() {
    if (!standaloneHeader || !sb) return;
    const menuButton = standaloneHeader.querySelector('.seh-menu-button');
    const navigation = standaloneHeader.querySelector('.seh-nav');
    const authButton = standaloneHeader.querySelector('#sehAuthButton');
    const authPanel = standaloneHeader.querySelector('#sehAuthPanel');
    const authForm = standaloneHeader.querySelector('#sehAuthForm');
    const identifier = standaloneHeader.querySelector('#sehAuthIdentifier');
    const password = standaloneHeader.querySelector('#sehAuthPassword');
    const authStatus = standaloneHeader.querySelector('#sehAuthStatus');

    menuButton?.addEventListener('click', () => {
      const open = !navigation?.classList.contains('is-open');
      navigation?.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
    });

    authButton?.addEventListener('click', async () => {
      const { data } = await sb.auth.getSession();
      const loggedIn = Boolean(data?.session?.user && !data.session.user.is_anonymous);
      if (loggedIn) {
        clearTimeout(timer);
        clearTimeout(statsTimer);
        try { await sb.auth.signOut(); } catch (_) {}
        writer = null;
        $('adminDashboard').hidden = true;
        $('adminLogin').hidden = false;
        updateStandaloneHeader(null, null);
        return;
      }
      const open = authPanel?.hidden !== false;
      if (authPanel) authPanel.hidden = !open;
      authButton.setAttribute('aria-expanded', String(open));
      if (open) requestAnimationFrame(() => identifier?.focus());
    });

    authForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = headerIdentifierToEmail(identifier?.value);
      const passwordValue = String(password?.value || '');
      const submit = authForm.querySelector('button[type="submit"]');

      if (!email) {
        authStatus.textContent = 'Skriv ett giltigt användarnamn eller en e-postadress.';
        authStatus.dataset.tone = 'error';
        return;
      }
      if (!passwordValue) {
        authStatus.textContent = 'Skriv ditt lösenord.';
        authStatus.dataset.tone = 'error';
        return;
      }

      authStatus.textContent = 'Loggar in…';
      authStatus.dataset.tone = 'working';
      if (submit) submit.disabled = true;

      try {
        try { await sb.auth.signOut(); } catch (_) {}
        const { data, error } = await sb.auth.signInWithPassword({ email, password: passwordValue });
        if (error) {
          if (/invalid login credentials/i.test(error.message || '')) throw new Error('Fel användarnamn/e-post eller lösenord.');
          throw error;
        }

        const row = await resolveHeaderWriter();
        updateStandaloneHeader(data?.session || null, row);
        if (identifier) identifier.value = '';
        if (password) password.value = '';
        authStatus.textContent = '';
        authPanel.hidden = true;

        if (row?.role === 'admin') {
          writer = row;
          $('adminDisplayName').textContent = writer.display_name || email;
          $('adminLogin').hidden = true;
          $('adminDashboard').hidden = false;
          if (requestId) refresh(true);
          if (statsRequestId) refreshStats(true);
        }
      } catch (err) {
        try { await sb.auth.signOut(); } catch (_) {}
        updateStandaloneHeader(null, null);
        authStatus.textContent = 'Fel: ' + (err?.message || err);
        authStatus.dataset.tone = 'error';
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    document.addEventListener('click', (event) => {
      if (!authPanel || authPanel.hidden || standaloneHeader.contains(event.target)) return;
      authPanel.hidden = true;
      authButton?.setAttribute('aria-expanded', 'false');
    });
  }

  bindStandaloneHeader();
  bindFreeAgentAdmin();
  const setStatus = (text, tone='') => { $('playerSyncStatus').textContent = text; $('playerSyncStatus').dataset.tone = tone; };
  const busy = (v) => { $('startPlayerSync').disabled = v; $('refreshPlayerSync').disabled = v || !requestId; };
  const makeId = () => window.crypto?.randomUUID ? 'web_' + crypto.randomUUID().replaceAll('-','') : 'web_' + Date.now();
  async function invoke(action){ const r = await sb.functions.invoke('seh-admin-sync',{body:{action,job:'swedish_players',request_id:requestId}}); if(r.error){let message=r.error.message||'Synktjänsten svarade med ett fel.';try{const details=await r.error.context?.json();if(details?.error)message=details.error}catch(_){}throw new Error(message)} if(r.data?.error) throw new Error(r.data.error); return r.data || {}; }
  async function invokeStats(action){ const r = await sb.functions.invoke('seh-admin-sync',{body:{action,job:'swedish_player_stats',request_id:statsRequestId}}); if(r.error){let message=r.error.message||'Synktjänsten svarade med ett fel.';try{const details=await r.error.context?.json();if(details?.error)message=details.error}catch(_){}throw new Error(message)} if(r.data?.error) throw new Error(r.data.error); return r.data || {}; }
  async function refresh(poll=false){ if(!requestId) return; busy(true); try { const d=await invoke('status'); const done=d.state==='completed'; setStatus(done ? (d.conclusion==='success'?'Klart – spelarregistret är uppdaterat.':'Synkningen misslyckades.') : 'Synkningen körs…', done&&d.conclusion==='success'?'success':done?'error':'working'); if(d.run_url){const a=document.createElement('a');a.href=d.run_url;a.target='_blank';a.textContent=' Visa körlogg';$('playerSyncStatus').append(a)} if(poll&&!done) timer=setTimeout(()=>refresh(true),7000); } catch(e){setStatus('Fel: '+(e.message||e),'error')} finally{busy(false)} }
  const setStatsStatus=(text,tone='')=>{$('statsSyncStatus').textContent=text;$('statsSyncStatus').dataset.tone=tone};
  const busyStats=(v)=>{$('startStatsSync').disabled=v;$('refreshStatsSync').disabled=v||!statsRequestId};
  async function refreshStats(poll=false){if(!statsRequestId)return;busyStats(true);try{const d=await invokeStats('status');const done=d.state==='completed';setStatsStatus(done?(d.conclusion==='success'?'Klart – svensk spelarstatistik är uppdaterad.':'Statistiksynkningen misslyckades.'):'Statistiksynkningen körs…',done&&d.conclusion==='success'?'success':done?'error':'working');if(d.run_url){const a=document.createElement('a');a.href=d.run_url;a.target='_blank';a.textContent=' Visa körlogg';$('statsSyncStatus').append(a)}if(poll&&!done)statsTimer=setTimeout(()=>refreshStats(true),7000)}catch(e){setStatsStatus('Fel: '+(e.message||e),'error')}finally{busyStats(false)}}
  async function login(){ $('adminLoginStatus').textContent='Loggar in…'; try { if(!sb) throw Error('Supabase är inte initierat.'); const em=emailFor($('adminUsername').value); if(!em) throw Error('Skriv ett giltigt inloggningsnamn.'); try { await sb.auth.signOut(); } catch (_) {} const r=await sb.auth.signInWithPassword({email:em,password:$('adminPassword').value}); if(r.error) { if(/invalid login credentials/i.test(r.error.message||'')) throw Error('Fel inloggningsnamn eller lösenord.'); throw r.error; } const c=await sb.rpc('seh_claim_writer'); if(c.error) throw c.error; writer=rpcRow(c.data); if(writer?.role!=='admin') throw Error('Kontot saknar adminbehörighet.'); $('adminDisplayName').textContent=writer.display_name||em; $('adminLogin').hidden=true; $('adminDashboard').hidden=false; $('adminLoginStatus').textContent=''; await loadFreeAgentAdmin(); if(requestId) refresh(true); if(statsRequestId) refreshStats(true); await refreshStandaloneHeader(); await window.SEH_refreshAuth?.(); } catch(e){$('adminLoginStatus').textContent='Fel: '+(e.message||e); await refreshStandaloneHeader(); await window.SEH_refreshAuth?.();} }
  $('adminLoginBtn').onclick=login; ['adminUsername','adminPassword'].forEach(id=>$(id).onkeydown=e=>{if(e.key==='Enter')login()});
  $('adminLogout').onclick=async()=>{clearTimeout(timer);clearTimeout(statsTimer);await sb?.auth.signOut();writer=null;$('adminDashboard').hidden=true;$('adminLogin').hidden=false;updateStandaloneHeader(null,null)};
  $('startPlayerSync').onclick=async()=>{if(!confirm('Starta synkningen av svenska SportsGamer-spelare nu?'))return; requestId=makeId();sessionStorage.setItem('seh_player_sync_request_id',requestId);busy(true);setStatus('Startar synkningen…','working');try{await invoke('start');await refresh(true)}catch(e){setStatus('Fel: '+(e.message||e),'error');busy(false)}};
  $('refreshPlayerSync').onclick=()=>refresh(false);
  $('startStatsSync').onclick=async()=>{if(!confirm('Hämta ny statistik för alla registrerade svenska SportsGamer-spelare nu? SportsGamer-databasen kommer endast att läsas.'))return;statsRequestId=makeId();sessionStorage.setItem('seh_player_stats_sync_request_id',statsRequestId);busyStats(true);setStatsStatus('Startar statistiksynkningen…','working');try{await invokeStats('start');await refreshStats(true)}catch(e){setStatsStatus('Fel: '+(e.message||e),'error');busyStats(false)}};
  $('refreshStatsSync').onclick=()=>refreshStats(false);
  $('resetPasswordBtn').onclick=async()=>{const username=$('resetUsername').value.trim();const password=$('resetPassword').value;if(!password||password.length<8){$('resetPasswordStatus').textContent='Lösenordet måste vara minst 8 tecken.';return}if(!confirm('Sätt nytt lösenord för '+username+'?'))return;$('resetPasswordStatus').textContent='Uppdaterar…';try{const r=await sb.functions.invoke('seh-admin-password',{body:{username,password}});if(r.error)throw r.error;if(r.data?.error)throw Error(r.data.error);$('resetPasswordStatus').textContent='Lösenordet är uppdaterat.';$('resetPasswordStatus').dataset.tone='success';$('resetPassword').value=''}catch(e){$('resetPasswordStatus').textContent='Fel: '+(e.message||e);$('resetPasswordStatus').dataset.tone='error'}};
  sb?.auth.getSession().then(async({data})=>{if(data.session){const c=await sb.rpc('seh_current_writer');const current=rpcRow(c.data);if(!c.error&&current?.role==='admin'){writer=current;$('adminDisplayName').textContent=writer.display_name||'Admin';$('adminLogin').hidden=true;$('adminDashboard').hidden=false;await loadFreeAgentAdmin();if(requestId)refresh(true);if(statsRequestId)refreshStats(true)}}await refreshStandaloneHeader(); await window.SEH_refreshAuth?.()});
})();
  }

  const routeBodyClasses = {"home": "directory-page portal-page", "news": "directory-page portal-page", "players": "directory-page portal-page", "freeAgents": "directory-page portal-page free-agents-page", "myProfile": "directory-page portal-page my-profile-page", "history": "directory-page", "player": "history-body", "team": "history-body", "teamTournament": "history-body", "tournament": "history-body tournament-overview-body", "shop": "directory-page shop-page", "support": "directory-page portal-page support-page", "ecl": "directory-page portal-page", "season": "directory-page portal-page", "writer": "directory-page writer-page", "admin": "directory-page"};

  const routeControllers = {
    ecl: SEH_initEcl,
    news: SEH_initNews,
    history: SEH_initHistory,
    players: SEH_initPlayers,
    freeAgents: SEH_initFreeAgents,
    myProfile: SEH_initMyProfile,
    player: SEH_initPlayer,
    team: SEH_initTeam,
    teamTournament: SEH_initTeamTournament,
    tournament: SEH_initTournament,
    shop: SEH_initShop,
    writer: SEH_initWriterCenter,
    admin: SEH_initAdminCenter
  };

  async function SEH_initNews() {
    const staticArticles = Array.isArray(window.SEH_NEWS_ARTICLES)
      ? window.SEH_NEWS_ARTICLES
      : [];

    let submittedArticles = [];
    try {
      const config = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
      const supabaseUrl = config.supabaseUrl || config.SUPABASE_URL || "";
      const supabaseKey = config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY || "";
      if (supabaseUrl && supabaseKey) {
        const endpoint = `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/seh_news_articles?status=eq.published&select=*&order=published_at.desc.nullslast,created_at.desc`;
        const headers = { apikey: supabaseKey };
        // Äldre anon-nycklar är JWT:er och kan användas som Bearer-token.
        // Nya sb_publishable_-nycklar ska däremot bara skickas som apikey.
        if (String(supabaseKey).startsWith("eyJ")) headers.Authorization = `Bearer ${supabaseKey}`;
        const response = await fetch(endpoint, { headers });
        if (response.ok) {
          const rows = await response.json();
          submittedArticles = rows.map((row) => ({
            url: row.slug,
            title: row.title,
            excerpt: row.excerpt,
            tag: row.tag || "Nyhet",
            author: row.author_name || "Svensk eHockey",
            date: String(row.published_at || row.created_at || "").slice(0, 10),
            heroImage: row.desktop_image_url || "",
            heroImageMobile: row.mobile_image_url || "",
            heroImageAlt: row.image_alt || row.title,
            body: Array.isArray(row.body) ? row.body : String(row.body || "").split(/\n\s*\n/).filter(Boolean),
            inlineImages: Array.isArray(row.inline_images) ? row.inline_images : [],
            sections: Array.isArray(row.sections) ? row.sections : []
          }));
        } else {
          console.warn("Kunde inte hämta publicerade skribentnyheter", response.status, await response.text());
        }
      }
    } catch (error) {
      console.warn("Kunde inte hämta publicerade skribentnyheter", error);
    }

    const articles = [...submittedArticles, ...staticArticles]
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const formatDate = (value) => {
      const date = new Date(`${value}T12:00:00`);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
    };

    const formatText = (value) => {
      const links = [];
      const tokenized = String(value ?? "").replace(
        /(^|[\s([{>])((?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>"']*)?)/gi,
        (match, prefix, rawUrl) => {
          let url = rawUrl;
          let trailing = "";
          while (/[.,!?;:)\]}>]$/.test(url)) {
            trailing = url.slice(-1) + trailing;
            url = url.slice(0, -1);
          }
          if (!url) return match;
          const href = /^(?:https?:\/\/)/i.test(url) ? url : `https://${url}`;
          const token = `\u0000SEH_LINK_${links.length}\u0000`;
          links.push({ href, label: url });
          return `${prefix}${token}${trailing}`;
        }
      );

      return escapeHtml(tokenized)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\u0000SEH_LINK_(\d+)\u0000/g, (match, index) => {
          const link = links[Number(index)];
          if (!link) return match;
          return `<a class="news-inline-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
        });
    };

    const normalizedLink = (link) => {
      const url = String(link?.url || "").trim();
      const label = String(link?.label || "Läs mer").trim();
      const legacyRoutes = {
        "/svenskecl26spring-lag.html": "#/laghistoria?season=ECL%2026%20Spring",
        "/svenskecl26spring-statistik.html": "#/sasong/ecl26spring?section=statistics",
        "/svenskecl26spring-matcher.html": "#/sasong/ecl26spring?section=matches"
      };
      return { label, url: legacyRoutes[url] || url || "#/nyheter" };
    };

    const articleSlug = (article) => {
      const explicit = String(article?.url || "").trim().replace(/^#\/?/, "");
      if (explicit) return explicit.replace(/^nyheter\//, "");
      return String(article?.title || "artikel")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    };

    const articleHref = (article) => `#/nyheter/${encodeURIComponent(articleSlug(article))}`;

    const renderPicture = (src, mobile, alt, className = "") => {
      const image = String(src || "").trim();
      if (!image) return "";
      const mobileImage = String(mobile || "").trim();
      return `<picture${className ? ` class="${escapeHtml(className)}"` : ""}>
        ${mobileImage ? `<source media="(max-width: 700px)" srcset="${escapeHtml(mobileImage.replace(/^\//, ""))}">` : ""}
        <img src="${escapeHtml(image.replace(/^\//, ""))}" alt="${escapeHtml(alt || "")}" loading="lazy">
      </picture>`;
    };

    const renderSection = (section) => {
      const sectionText = Array.isArray(section.text) ? section.text : [section.text];
      const image = renderPicture(
        section.image,
        section.imageMobile,
        section.imageAlt || section.title,
        "news-article-section__image"
      );
      const items = Array.isArray(section.items) && section.items.length
        ? `<ol class="news-ranking">${section.items.map((item, index) => {
            const rank = item.rank ?? index + 1;
            const title = item.title || item.name || "";
            const meta = item.meta ? `<span>${formatText(item.meta)}</span>` : "";
            const value = item.value ? `<b class="news-ranking__value">${formatText(item.value)}</b>` : "";
            return `<li class="news-ranking__item"><span class="news-ranking__pos">${escapeHtml(String(rank))}</span><div class="news-ranking__main"><strong>${formatText(title)}</strong>${meta}</div>${value}</li>`;
          }).join("")}</ol>`
        : "";
      return `<section class="news-article-section">${image}<h2>${escapeHtml(section.title || "")}</h2>${items}${sectionText.filter(Boolean).map((text) => `<p>${formatText(text)}</p>`).join("")}</section>`;
    };


    const parseRichBlocks = (paragraphs) => {
      const raw = Array.isArray(paragraphs) ? paragraphs.join('\n\n') : String(paragraphs || '');
      const chunks = raw.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
      const blocks = [];
      chunks.forEach((chunk) => {
        const lines = chunk.split(/\n/).map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return;
        const first = lines[0];
        if (lines.length === 1 && /^\[\[BILD([12])\]\]$/i.test(first)) {
          blocks.push({ type: 'imageMarker', slot: Number(first.match(/^\[\[BILD([12])\]\]$/i)[1]) });
          return;
        }
        if (/^###\s+/.test(first)) {
          blocks.push({ type: 'heading3', text: first.replace(/^###\s+/, '') });
          if (lines.length > 1) blocks.push({ type: 'paragraph', text: lines.slice(1).join(' ') });
          return;
        }
        if (/^##\s+/.test(first)) {
          blocks.push({ type: 'heading2', text: first.replace(/^##\s+/, '') });
          if (lines.length > 1) blocks.push({ type: 'paragraph', text: lines.slice(1).join(' ') });
          return;
        }
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          blocks.push({ type: 'ul', items: lines.map((line) => line.replace(/^[-*]\s+/, '')) });
          return;
        }
        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          blocks.push({ type: 'ol', items: lines.map((line) => line.replace(/^\d+\.\s+/, '')) });
          return;
        }
        blocks.push({ type: 'paragraph', text: lines.join(' ') });
      });
      return blocks;
    };

    const renderInlineFigure = (item) => {
      const imageUrl = String(item?.image_url || item?.image || '').trim();
      if (!imageUrl) return '';
      const mobileImageUrl = String(item?.image_mobile_url || '').trim();
      const alt = item?.image_alt || item?.alt || '';
      const caption = String(item?.caption || '').trim();
      return `<figure class="news-article-inline-image"><picture class="news-article-inline-image__picture">${mobileImageUrl ? `<source media="(max-width: 700px)" srcset="${escapeHtml(mobileImageUrl.replace(/^\//, ''))}">` : ''}<img src="${escapeHtml(imageUrl.replace(/^\//, ''))}" alt="${escapeHtml(alt)}" loading="lazy"></picture>${caption ? `<figcaption>${formatText(caption)}</figcaption>` : ''}</figure>`;
    };

    const renderBodyContent = (paragraphs, inlineImages = []) => {
      const items = parseRichBlocks(paragraphs);
      const images = Array.isArray(inlineImages) ? inlineImages : [];
      const imageBySlot = new Map(images.map((item, index) => [Number(item?.slot || index + 1), item]));
      const usedSlots = new Set();
      const explicitSlots = new Set(items.filter((block) => block?.type === 'imageMarker').map((block) => Number(block.slot)).filter(Boolean));
      const figuresByPos = new Map();

      images.forEach((item, index) => {
        const slot = Number(item?.slot || index + 1);
        if (explicitSlots.has(slot)) return;
        const pos = Number(item?.after_paragraph || (slot === 1 ? 4 : 10));
        if (!figuresByPos.has(pos)) figuresByPos.set(pos, []);
        figuresByPos.get(pos).push(item);
      });

      let html = '<div class="news-article-flow">';
      let contentIndex = 0;
      items.forEach((block) => {
        if (block.type === 'imageMarker') {
          const slot = Number(block.slot);
          const image = imageBySlot.get(slot);
          if (image) {
            html += renderInlineFigure(image);
            usedSlots.add(slot);
          }
          return;
        }

        contentIndex += 1;
        if (block.type === 'heading2') {
          html += `<h2 class="news-article-flow__h2">${formatText(block.text)}</h2>`;
        } else if (block.type === 'heading3') {
          html += `<h3 class="news-article-flow__h3">${formatText(block.text)}</h3>`;
        } else if (block.type === 'ul' || block.type === 'ol') {
          const tag = block.type;
          html += `<${tag} class="news-article-flow__list">${(block.items || []).map((item) => `<li>${formatText(item)}</li>`).join('')}</${tag}>`;
        } else {
          html += `<p${contentIndex === 1 ? ' class="news-article-flow__lead"' : ''}>${formatText(block.text)}</p>`;
        }

        if (figuresByPos.has(contentIndex)) {
          html += figuresByPos.get(contentIndex).map((item, index) => {
            const slot = Number(item?.slot || index + 1);
            if (usedSlots.has(slot)) return '';
            usedSlots.add(slot);
            return renderInlineFigure(item);
          }).join('');
        }
      });

      images.forEach((item, index) => {
        const slot = Number(item?.slot || index + 1);
        if (!usedSlots.has(slot)) {
          html += renderInlineFigure(item);
          usedSlots.add(slot);
        }
      });

      if (!items.length) html += '<p class="news-article-flow__lead"></p>';
      html += '</div>';
      return html;
    };

    const routeSlug = String(window.SEH_ROUTE?.params?.newsSlug || "").trim();
    if (routeSlug) {
      const decodedSlug = decode(routeSlug);
      const article = articles.find((item) => articleSlug(item) === decodedSlug);
      const view = document.querySelector("#spaRouteView");
      if (!view) return;

      if (!article) {
        view.innerHTML = `<main class="directory-shell news-article-page"><nav class="news-article-back"><a href="#/nyheter">← Till nyheter</a></nav><section class="news-article-not-found"><p class="directory-kicker">NYHETER</p><h1>Artikeln hittades inte</h1><p>Den här nyhetsartikeln finns inte eller har flyttats.</p><a href="#/nyheter">Visa alla nyheter</a></section></main>`;
        return;
      }

      document.title = `${article.title} – Svensk eHockey`;
      const body = Array.isArray(article.body) && article.body.length
        ? article.body
        : [article.excerpt];
      const sections = Array.isArray(article.sections) ? article.sections : [];
      const inlineImages = Array.isArray(article.inlineImages) ? article.inlineImages : [];
      const links = Array.isArray(article.links) ? article.links.map(normalizedLink) : [];
      const hero = renderPicture(
        article.heroImage,
        article.heroImageMobile,
        article.heroImageAlt || article.title,
        "news-article-hero__image"
      );
      const actions = links.length
        ? `<div class="news-article-actions">${links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join("")}</div>`
        : "";

      view.innerHTML = `<main class="directory-shell news-article-page">
        <nav class="news-article-back" aria-label="Tillbaka"><a href="#/nyheter">← Till nyheter</a></nav>
        <article class="news-article-view">
          <header class="news-article-header">
            <div class="news-card__meta"><span>${escapeHtml(article.tag || "Nyhet")}</span><time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDate(article.date))}</time><b>${escapeHtml(article.author || "Svensk eHockey")}</b></div>
            <h1>${escapeHtml(article.title)}</h1>
          </header>
          ${hero}
          <div class="news-article-body">
            ${renderBodyContent(body, inlineImages)}
            ${sections.map(renderSection).join("")}
            ${actions}
          </div>
        </article>
      </main>
      <footer class="directory-footer"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>`;
      return;
    }

    const searchInput = document.querySelector("#newsSearch");
    const tagFilters = document.querySelector("#newsTagFilters");
    const featuredHost = document.querySelector("#featuredNews");
    const gridHost = document.querySelector("#newsGrid");
    const resultText = document.querySelector("#newsResultText");
    if (!searchInput || !tagFilters || !featuredHost || !gridHost) return;

    let activeTag = "Alla";

    const articleMarkup = (article, featured = false) => {
      const links = Array.isArray(article.links) ? article.links.map(normalizedLink) : [];
      const href = articleHref(article);
      const externalActions = links.length
        ? `<div class="news-card__actions news-card__actions--secondary">${links.map((link) =>
            `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join("")}</div>`
        : "";
      const heroImage = String(article.heroImage || "").trim();
      const heroImageMobile = String(article.heroImageMobile || "").trim();
      const heroMarkup = heroImage
        ? `<a class="news-card__hero-link" href="${escapeHtml(href)}" aria-label="Läs ${escapeHtml(article.title)}">
            <picture class="news-card__hero">
              ${heroImageMobile ? `<source media="(max-width: 700px)" srcset="${escapeHtml(heroImageMobile.replace(/^\//, ""))}">` : ""}
              <img src="${escapeHtml(heroImage.replace(/^\//, ""))}" alt="${escapeHtml(article.heroImageAlt || article.title)}" loading="${featured ? "eager" : "lazy"}">
            </picture>
          </a>`
        : "";

      return `<article class="news-card${featured ? " news-card--featured" : ""}">
        <div class="news-card__meta"><span>${escapeHtml(article.tag || "Nyhet")}</span><time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDate(article.date))}</time><b>${escapeHtml(article.author || "Svensk eHockey")}</b></div>
        <h2><a href="${escapeHtml(href)}">${escapeHtml(article.title)}</a></h2>
        ${heroMarkup}
        <div class="news-card__intro"><p>${formatText(article.excerpt || (article.body || [""])[0] || "")}</p></div>
        <div class="news-card__footer"><a class="news-read-more" href="${escapeHtml(href)}">Läs artikeln <span aria-hidden="true">→</span></a>${externalActions}</div>
      </article>`;
    };

    function renderTags() {
      const tags = ["Alla", ...new Set(articles.map((article) => article.tag).filter(Boolean))];
      tagFilters.innerHTML = tags.map((tag) => `<button type="button" class="news-tag${tag === activeTag ? " is-active" : ""}" data-news-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("");
    }

    function renderNews() {
      const query = searchInput.value.trim().toLocaleLowerCase("sv-SE");
      const rows = articles.filter((article) => {
        if (activeTag !== "Alla" && article.tag !== activeTag) return false;
        if (!query) return true;
        const sectionText = (article.sections || []).flatMap((section) =>
          Array.isArray(section.text) ? section.text : [section.text]).join(" ");
        return [article.title, article.excerpt, article.tag, article.author, ...(article.body || []), sectionText]
          .join(" ").toLocaleLowerCase("sv-SE").includes(query);
      });

      renderTags();
      if (resultText) resultText.textContent = `${rows.length} av ${articles.length} nyheter`;
      if (!rows.length) {
        featuredHost.innerHTML = "";
        gridHost.innerHTML = `<div class="news-empty">Inga nyheter matchade sökningen.</div>`;
        return;
      }
      featuredHost.innerHTML = articleMarkup(rows[0], true);
      gridHost.innerHTML = rows.slice(1).map((article) => articleMarkup(article)).join("");
    }

    searchInput.addEventListener("input", renderNews);
    tagFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-news-tag]");
      if (!button) return;
      activeTag = button.dataset.newsTag;
      renderNews();
    });

    renderNews();
  }

  const seasons = {
    ecl1: {
      id: "ecl1", title: "ECL 1", archiveLabel: "SÄSONG 1", archiveEra: "classic",
      databaseLabel: "European Championship League - Season 1", leagueIds: [4], countryCode: "SE",
      divisions: [{ id: "ecl", label: "ECL" }], divisionFallback: "ECL",
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl2: {
      id: "ecl2", title: "ECL 2", archiveLabel: "SÄSONG 2", archiveEra: "classic",
      databaseLabel: "European Championship League - Season 2", leagueIds: [5], countryCode: "SE",
      divisions: [{ id: "ecl", label: "ECL" }], divisionFallback: "ECL",
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl3: {
      id: "ecl3", title: "ECL 3", archiveLabel: "SÄSONG 3", archiveEra: "classic",
      databaseLabel: "European Championship League - Season 3", leagueIds: [17], countryCode: "SE",
      divisions: [{ id: "ecl", label: "ECL" }], divisionFallback: "ECL",
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl4: {
      id: "ecl4", title: "ECL 4", archiveLabel: "SÄSONG 4", archiveEra: "classic",
      databaseLabel: "ECL 4", leagueIds: [18, 19, 20], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl5: {
      id: "ecl5", title: "ECL 5", archiveLabel: "SÄSONG 5", archiveEra: "classic",
      databaseLabel: "ECL 5", leagueIds: [23, 24, 25], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl6: {
      id: "ecl6", title: "ECL 6", archiveLabel: "SÄSONG 6", archiveEra: "classic",
      databaseLabel: "ECL 6", leagueIds: [27, 28, 29], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl7: {
      id: "ecl7", title: "ECL 7", archiveLabel: "SÄSONG 7", archiveEra: "classic",
      databaseLabel: "ECL 7", leagueIds: [35, 36, 37], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl8: {
      id: "ecl8", title: "ECL 8", archiveLabel: "SÄSONG 8", archiveEra: "classic",
      databaseLabel: "ECL 8", leagueIds: [40, 41, 42], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl9: {
      id: "ecl9", title: "ECL 9", archiveLabel: "SÄSONG 9", archiveEra: "classic",
      databaseLabel: "ECL 9", leagueIds: [55, 56, 57, 58], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl10: {
      id: "ecl10", title: "ECL 10", archiveLabel: "SÄSONG 10", archiveEra: "classic",
      databaseLabel: "ECL 10", leagueIds: [65, 66, 67, 68], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl11: {
      id: "ecl11", title: "ECL 11", archiveLabel: "SÄSONG 11", archiveEra: "classic",
      databaseLabel: "ECL 11", leagueIds: [94, 95, 96, 97], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl12: {
      id: "ecl12", title: "ECL 12", archiveLabel: "SÄSONG 12", archiveEra: "classic",
      databaseLabel: "ECL 12", leagueIds: [119, 120, 121, 122, 123], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl22winter: {
      id: "ecl22winter", title: "ECL ’22: Winter", archiveLabel: "2021/22", archiveEra: "modern",
      databaseLabel: "ECL 22 Winter", leagueIds: [170, 171, 172, 173, 174], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl22spring: {
      id: "ecl22spring", title: "ECL ’22: Spring", archiveLabel: "2022", archiveEra: "modern",
      databaseLabel: "ECL 22 Spring", leagueIds: [190, 191, 192, 193, 194], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl23winter: {
      id: "ecl23winter", title: "ECL ’23: Winter", archiveLabel: "2022/23", archiveEra: "modern",
      databaseLabel: "ECL 23 Winter", leagueIds: [250, 251, 252, 253, 254], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl23spring: {
      id: "ecl23spring", title: "ECL ’23: Spring", archiveLabel: "2023", archiveEra: "modern",
      databaseLabel: "ECL 23 Spring", leagueIds: [305, 306, 307, 308, 309], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl24winter: {
      id: "ecl24winter", title: "ECL ’24: Winter", archiveLabel: "2023/24", archiveEra: "modern",
      databaseLabel: "ECL 24 Winter", leagueIds: [338, 339, 340, 341, 342], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl24spring: {
      id: "ecl24spring", title: "ECL ’24: Spring", archiveLabel: "2024", archiveEra: "modern",
      databaseLabel: "ECL 24 Spring", leagueIds: [379, 380, 381, 382, 383], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl25winter: {
      id: "ecl25winter", title: "ECL ’25: Winter", archiveLabel: "2024/25", archiveEra: "modern",
      databaseLabel: "ECL 25 Winter", leagueIds: [411, 412, 413, 414, 415], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl25spring: {
      id: "ecl25spring", title: "ECL ’25: Spring", archiveLabel: "2025", archiveEra: "modern",
      databaseLabel: "ECL 25 Spring", leagueIds: [461, 462, 463, 464, 465], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl26winter: {
      id: "ecl26winter", title: "ECL ’26: Winter", archiveLabel: "2025/26", archiveEra: "modern",
      databaseLabel: "ECL 26 Winter", leagueIds: [487, 488, 489, 490, 491], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "teams", "statistics"], completed: true
    },
    ecl26spring: {
      id: "ecl26spring", title: "ECL ’26: Spring", archiveLabel: "2026", archiveEra: "modern",
      databaseLabel: "ECL 26 Spring", leagueIds: [507, 508, 509, 510, 511], countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview", "matches", "transfers", "teams", "statistics"], completed: true
    },
    ecl27winter: {
      id: "ecl27winter", title: "ECL ’27: Winter", archiveLabel: "2026/27", archiveEra: "current",
      databaseLabel: "ECL 27 Winter", countryCode: "SE",
      divisions: [{ id: "elite", label: "Elite" }, { id: "pro", label: "Pro" }, { id: "lite", label: "Lite" }, { id: "core", label: "Core" }, { id: "neo", label: "Neo" }],
      sections: ["overview"], status: "upcoming"
    }
  };


  function seasonSectionLabels(season) {
    const labels = { matches: "Matcher", transfers: "Byten", teams: "Lag", statistics: "Statistik" };
    return (season.sections || [])
      .filter((section) => section !== "overview")
      .map((section) => labels[section])
      .filter(Boolean);
  }

  function ECL_archiveCard(season) {
    const available = seasonSectionLabels(season);
    return `
      <a href="#/sasong/${escapeHtml(season.id)}" class="ecl-archive-card-v12852">
        <span>${escapeHtml(season.archiveLabel || "")}</span>
        <strong>${escapeHtml(season.title)}</strong>
        <small>${escapeHtml(available.join(" · ") || "Översikt")}</small>
        <b>Öppna →</b>
      </a>`;
  }

  function SEH_initEcl() {
    const host = document.querySelector("#eclArchiveGroups");
    if (!host) return;

    const modern = Object.values(seasons)
      .filter((season) => season.archiveEra === "modern")
      .reverse();
    const classic = Object.values(seasons)
      .filter((season) => season.archiveEra === "classic")
      .reverse();

    host.innerHTML = `
      <section class="ecl-archive-era-v12852">
        <div class="ecl-archive-era-v12852__heading">
          <div><span>2022–2026</span><h3>Winter / Spring</h3></div>
          <small>${modern.length} säsonger</small>
        </div>
        <div class="ecl-archive-grid-v12840">${modern.map(ECL_archiveCard).join("")}</div>
      </section>
      <section class="ecl-archive-era-v12852">
        <div class="ecl-archive-era-v12852__heading">
          <div><span>2015–2021</span><h3>ECL 1–12</h3></div>
          <small>${classic.length} säsonger</small>
        </div>
        <div class="ecl-archive-grid-v12840">${classic.map(ECL_archiveCard).join("")}</div>
      </section>
    `;
  }


  let renderToken = 0;

  console.info("Svensk eHockey SPA build:", APP_BUILD);

  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function normalizeSeasonId(value) {
    const id = String(value || "").trim().toLowerCase();
    return seasons[id] ? id : "ecl27winter";
  }

  function parseRoute() {
    const originalHash = String(location.hash || "#/");

    let rawHash = originalHash
      .replace(/^#\/?/, "");

    /*
     * Kompatibilitet med adresser som äldre SHOP-versioner
     * kunde lämna efter sig:
     *   #!/        -> startsidan
     *   #!/spelare -> #/spelare
     */
    if (rawHash === "!" || rawHash === "!/") {
      rawHash = "";
    } else if (rawHash.startsWith("!/")) {
      rawHash = rawHash.slice(2);
    }

    const [rawPath, rawQuery = ""] = rawHash.split("?");
    const parts = rawPath
      .split("/")
      .filter(Boolean)
      .map(decode);

    const query = new URLSearchParams(rawQuery);

    let route = {
      key: "home",
      label: "Översikt",
      active: "home",
      params: {},
      query
    };

    if (!parts.length) return route;

    if (parts[0] === "skriv" && parts.length === 1) {
      return {
        ...route,
        key: "writer",
        label: "Skrivcenter",
        active: "writer"
      };
    }

    if (parts[0] === "admin" && parts.length === 1) {
      return {
        ...route,
        key: "admin",
        label: "Admincenter",
        active: "admin"
      };
    }

    if (parts[0] === "stod" && parts.length === 1) {
      return {
        ...route,
        key: "support",
        label: "Stöd Svensk eHockey",
        active: "support"
      };
    }

    if (parts[0] === "shop" && parts.length === 1) {
      return {
        ...route,
        key: "shop",
        label: "Shop",
        active: "shop"
      };
    }

    if (parts[0] === "nyheter" && parts.length === 1) {
      const legacyArticle = query.get("article");
      return {
        ...route,
        key: "news",
        label: "Nyheter",
        active: "news",
        params: legacyArticle ? { newsSlug: legacyArticle } : {}
      };
    }

    if (parts[0] === "nyheter" && parts[1]) {
      return {
        ...route,
        key: "news",
        label: "Nyheter",
        active: "news",
        params: {
          newsSlug: parts.slice(1).join("/")
        }
      };
    }

    if (parts[0] === "ecl" && parts.length === 1) {
      return {
        ...route,
        key: "ecl",
        label: "ECL",
        active: "ecl"
      };
    }

    if ((parts[0] === "free-agents" || parts[0] === "freeagents") && parts.length === 1) {
      return { ...route, key: "freeAgents", label: "Free Agents", active: "freeAgents" };
    }

    if ((parts[0] === "min-profil" || parts[0] === "minprofil") && parts.length === 1) {
      return { ...route, key: "myProfile", label: "Min profil", active: "freeAgents" };
    }

    if (parts[0] === "spelare" && parts.length === 1) {
      return {
        ...route,
        key: "players",
        label: "Svenska spelare",
        active: "players"
      };
    }

    if (parts[0] === "spelare" && parts[1]) {
      return {
        ...route,
        key: "player",
        label: "Spelarprofil",
        active: "players",
        params: {
          playerKey: parts.slice(1).join("/")
        }
      };
    }

    if (parts[0] === "laghistoria" && parts.length === 1) {
      return {
        ...route,
        key: "history",
        label: "Laghistoria",
        active: "history"
      };
    }

    if (
      parts[0] === "lag" &&
      parts[1] &&
      parts[2] === "turnering" &&
      parts[3]
    ) {
      return {
        ...route,
        key: "teamTournament",
        label: "Lag i turnering",
        active: "history",
        params: {
          teamId: parts[1],
          leagueId: parts[3]
        }
      };
    }

    if (parts[0] === "lag" && parts[1]) {
      return {
        ...route,
        key: "team",
        label: "Lagprofil",
        active: "history",
        params: {
          teamId: parts[1]
        }
      };
    }

    if (parts[0] === "turnering" && parts[1]) {
      return {
        ...route,
        key: "tournament",
        label: "Turnering",
        active: "history",
        params: {
          leagueId: parts[1]
        }
      };
    }

    /*
     * Både #/sasong/... och #/season/... accepteras.
     * Den publika adressen vi använder är #/sasong/...
     */
    if (
      (parts[0] === "sasong" || parts[0] === "season") &&
      parts[1]
    ) {
      const seasonId = normalizeSeasonId(parts[1]);
      return {
        ...route,
        key: "season",
        label: seasons[seasonId].title,
        active: "ecl",
        params: {
          seasonId
        }
      };
    }

    return {
      ...route,
      key: "notFound",
      label: "Sidan saknas",
      active: ""
    };
  }

  function headerHtml(route) {
    return `
      <div class="seh-header__inner">
        <a class="seh-brand seh-brand--logo-only" href="#/" aria-label="Svensk eHockey – startsida">
          <img src="assets/SeHlogga.png" alt="" width="150" height="46">
        </a>

        <div class="seh-current" aria-label="Aktuell sida">
          <span>AKTUELL VY</span>
          <strong>${escapeHtml(route.label)}</strong>
        </div>

        <button
          class="seh-menu-button"
          type="button"
          aria-expanded="false"
          aria-controls="sehNavigation"
        >
          <span></span>
          <span></span>
          <span></span>
          <b class="sr-only">Öppna meny</b>
        </button>

        <nav
          id="sehNavigation"
          class="seh-nav"
          aria-label="Huvudnavigation"
        >
          <a
            class="${route.active === "home" ? "is-active" : ""}"
            href="#/"
          >
            Hem
          </a>

          <a
            class="${route.active === "news" ? "is-active" : ""}"
            href="#/nyheter"
          >
            Nyheter
          </a>

          <a
            class="${route.active === "players" ? "is-active" : ""}"
            href="#/spelare"
          >
            Spelare
          </a>

          <a
            class="${route.active === "freeAgents" ? "is-active" : ""}"
            href="#/free-agents"
          >
            Free Agents
          </a>

          <a
            class="${route.active === "history" ? "is-active" : ""}"
            href="#/laghistoria"
          >
            Laghistoria
          </a>

          <a
            class="${route.active === "ecl" ? "is-active" : ""}"
            href="#/sasong/ecl27winter"
          >
            ECL
          </a>

          <a
            class="${route.active === "shop" ? "is-active" : ""}"
            href="#/shop"
          >
            SHOP
          </a>


          <a
            class="seh-nav-sec"
            href="SEC/"
          >
            SEC
          </a>

          <a
            class="seh-nav-auth seh-nav-auth--writer ${route.active === "writer" ? "is-active" : ""}"
            data-seh-auth-link="writer"
            href="#/skriv"
            hidden
          >
            Skrivcenter
          </a>

          <a
            class="seh-nav-auth seh-nav-auth--admin ${route.active === "admin" ? "is-active" : ""}"
            data-seh-auth-link="admin"
            href="#/admin"
            hidden
          >
            Admincenter
          </a>
        </nav>

        <div class="seh-header__tools">
          <label
            class="seh-season"
            for="headerSeasonSelect"
            hidden
            aria-hidden="true"
          >
            <span>SÄSONG</span>
            <select
              id="headerSeasonSelect"
              aria-label="Välj säsong"
            >
              <option value="">Välj säsong</option>
              <option value="ecl26spring">ECL ’26: Spring</option>
              <option value="ecl26winter">ECL ’26: Winter</option>
              <option value="ecl27winter">ECL ’27: Winter</option>
            </select>
          </label>

          <div class="seh-auth" data-state="logged-out">
            <button
              id="sehAuthButton"
              class="seh-auth-trigger"
              type="button"
              aria-expanded="false"
              aria-controls="sehAuthPanel"
            >
              LOGGA IN
            </button>

            <div id="sehAuthPanel" class="seh-auth-panel" hidden>
              <form id="sehAuthForm" novalidate>
                <div class="seh-auth-panel__heading">
                  <span>SVENSK eHOCKEY</span>
                  <strong>Logga in</strong>
                </div>
                <label>
                  <span>Användarnamn eller e-post</span>
                  <input
                    id="sehAuthIdentifier"
                    type="text"
                    autocomplete="username"
                    spellcheck="false"
                    placeholder="eSwahn"
                  >
                </label>
                <label>
                  <span>Lösenord</span>
                  <input
                    id="sehAuthPassword"
                    type="password"
                    autocomplete="current-password"
                  >
                </label>
                <p id="sehAuthStatus" class="seh-auth-status" role="status" aria-live="polite"></p>
                <button class="seh-auth-submit" type="submit">Logga in</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindHeader(header, route) {
    const seasonSelect = header.querySelector("#headerSeasonSelect");

    if (route.key === "season" && route.params.seasonId) {
      seasonSelect.value = route.params.seasonId;
    }

    seasonSelect?.addEventListener("change", () => {
      if (/^ecl(?:26spring|26winter|27winter)$/.test(seasonSelect.value)) {
        location.hash =
          `#/sasong/${encodeURIComponent(seasonSelect.value)}`;
      }
    });

    const menuButton = header.querySelector(".seh-menu-button");
    const navigation = header.querySelector(".seh-nav");

    menuButton?.addEventListener("click", () => {
      const open =
        menuButton.getAttribute("aria-expanded") === "true";

      menuButton.setAttribute(
        "aria-expanded",
        String(!open)
      );

      navigation?.classList.toggle(
        "is-open",
        !open
      );
    });

    navigation?.addEventListener("click", () => {
      menuButton?.setAttribute(
        "aria-expanded",
        "false"
      );

      navigation.classList.remove("is-open");
    });

    const authButton = header.querySelector("#sehAuthButton");
    const authPanel = header.querySelector("#sehAuthPanel");
    const authForm = header.querySelector("#sehAuthForm");

    authButton?.addEventListener("click", async () => {
      const loggedIn = Boolean(sehAuthState.session?.user && !sehAuthState.session.user.is_anonymous);

      if (loggedIn) {
        const client = sehGetAuthClient();
        authButton.disabled = true;
        try {
          await client?.auth.signOut();
          await sehRefreshAuthAccess(null);
        } catch (error) {
          console.warn("Kunde inte logga ut", error);
        } finally {
          authButton.disabled = false;
        }
        return;
      }

      if (!authPanel) return;
      const open = !authPanel.hidden;
      authPanel.hidden = open;
      authButton.setAttribute("aria-expanded", String(!open));
      if (!open) {
        requestAnimationFrame(() => header.querySelector("#sehAuthIdentifier")?.focus());
      }
    });

    authForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      sehLoginFromHeader(header);
    });

    authPanel?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      authPanel.hidden = true;
      authButton?.setAttribute("aria-expanded", "false");
      authButton?.focus();
    });

    sehUpdateHeaderAuth(header);
    sehInitializeAuth();
  }

  function titleFor(route) {
    if (route.key === "season") {
      const season = seasons[
        normalizeSeasonId(route.params.seasonId)
      ];
      return `Svensk eHockey – ${season.title}`;
    }

    const titles = {
      home: "Svensk eHockey – Hem",
      news: "Nyheter – Svensk eHockey",
      players: "Spelare – Svensk eHockey",
      freeAgents: "Free Agents – Svensk eHockey",
      myProfile: "Min profil – Svensk eHockey",
      history: "Laghistoria – Svensk eHockey",
      ecl: "ECL – Svensk eHockey",
      player: "Spelarprofil – Svensk eHockey",
      team: "Lagprofil – Svensk eHockey",
      teamTournament: "Lag i turnering – Svensk eHockey",
      tournament: "Turnering – Svensk eHockey",
      shop: "Shop – Svensk eHockey",
      support: "Stöd Svensk eHockey",
      writer: "Skrivcenter – Svensk eHockey",
      admin: "Admincenter – Svensk eHockey",
      notFound: "Sidan saknas – Svensk eHockey"
    };

    return titles[route.key] || titles.home;
  }

  function notFoundHtml() {
    return `
      <main class="directory-shell portal-shell">
        <section class="notice notice-error">
          <h2>Sidan kunde inte hittas</h2>
          <p>
            <a href="#/">
              Gå tillbaka till startsidan
            </a>
          </p>
        </section>
      </main>
    `;
  }

  function seasonSectionRoute(seasonId, section) {
    const base =
      `#/sasong/${encodeURIComponent(seasonId)}`;

    return section && section !== "overview"
      ? `${base}?section=${encodeURIComponent(section)}`
      : base;
  }

  const SEASON_PAGE_SIZE = 1000;

  function seasonNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function seasonText(value, fallback = "–") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  async function seasonFetchAll(viewName, parameters = {}) {
    const config = window.EHOCKEY_CONFIG || {};
    const baseUrl = String(config.supabaseUrl || "").replace(/\/$/, "");
    const key = String(config.supabasePublishableKey || "").trim();

    if (!baseUrl || !key) {
      throw new Error("Supabase saknas i config.js.");
    }

    const rows = [];
    let offset = 0;

    while (true) {
      const query = new URLSearchParams({
        select: "*",
        ...parameters,
        limit: String(SEASON_PAGE_SIZE),
        offset: String(offset)
      });
      const response = await fetch(
        `${baseUrl}/rest/v1/${encodeURIComponent(viewName)}?${query}`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`
          }
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Supabase svarade ${response.status}: ${message}`);
      }

      const page = await response.json();
      rows.push(...page);
      if (page.length < SEASON_PAGE_SIZE) break;
      offset += SEASON_PAGE_SIZE;
    }

    return rows;
  }

  async function seasonFetchLeagueSet(viewName, leagueIds, parameters = {}) {
    const rows = [];

    // En liten fråga per division är avsiktligt. Den stora sammanslagna
    // IN-frågan kan slå i Supabases statement_timeout på de här vyerna.
    for (const leagueId of leagueIds) {
      let divisionRows;
      try {
        divisionRows = await seasonFetchAll(viewName, {
          ...parameters,
          league_id: `eq.${leagueId}`
        });
      } catch (firstError) {
        // Land + liga kan ge en sämre frågeplan i PostgreSQL. Prova då
        // samma lilla liga utan landsvillkoret och filtrera i webbläsaren.
        const fallbackParameters = { ...parameters };
        const countryField = Object.hasOwn(fallbackParameters, "player_country")
          ? "player_country"
          : Object.hasOwn(fallbackParameters, "effective_country")
            ? "effective_country"
            : "";
        delete fallbackParameters.player_country;
        delete fallbackParameters.effective_country;
        try {
          divisionRows = await seasonFetchAll(viewName, {
            ...fallbackParameters,
            league_id: `eq.${leagueId}`
          });
          if (countryField) {
            divisionRows = divisionRows.filter((row) =>
              String(row[countryField] || "").toUpperCase() === "SE"
            );
          }
        } catch (secondError) {
          console.warn(`Liga ${leagueId} kunde inte hämtas från ${viewName}.`, firstError, secondError);
          divisionRows = [];
        }
      }
      rows.push(...divisionRows);
    }

    return rows;
  }

  function seasonSupabaseMatchRows(rows) {
    const stockholmTime = new Intl.DateTimeFormat("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Stockholm"
    });

    return (rows || []).map((row) => {
      const playedAt = String(row.played_at || "");
      const parsed = playedAt ? new Date(playedAt) : null;
      return {
        division: row.division,
        stage: row.stage,
        group: row.group_name,
        date: playedAt.slice(0, 10),
        time: parsed && !Number.isNaN(parsed.valueOf()) ? stockholmTime.format(parsed) : "",
        matchID: row.match_id,
        leagueID: row.league_id,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        homeScore: row.home_score,
        awayScore: row.away_score,
        ot: row.overtime,
        svensktLag: row.swedish_team,
        goalsSummary: row.goals_summary
      };
    });
  }

  function seasonSupabaseTransferRows(rows) {
    return (rows || []).map((row) => ({
      Date: row.transfer_date,
      Player: row.player_name,
      playerID: row.player_id,
      userID: row.user_id,
      nationality: row.nationality,
      Role: row.player_role,
      From: row.from_team,
      FromDiv: row.from_division,
      FromTeamID: row.from_team_id,
      FromLeagueID: row.from_league_id,
      fromTeamLogo: row.from_team_logo,
      To: row.to_team,
      ToDiv: row.to_division,
      ToTeamID: row.to_team_id,
      ToLeagueID: row.to_league_id,
      toTeamLogo: row.to_team_logo,
      playerImage: row.player_image,
      GroupGames26Winter: row.previous_group_games,
      TotalGames26Winter: row.previous_total_games,
      PlayoffGames26Winter: row.previous_playoff_games
    }));
  }

  function seasonSupabaseMetricsLegacy(rows) {
    const legacy = {
      regular: { skaters: {}, defenders: {}, goalies: {} },
      playoffs: { skaters: {}, defenders: {}, goalies: {} }
    };

    (rows || []).forEach((row) => {
      const stage = row.stage === "playoffs" ? "playoffs" : "regular";
      const type = ["skaters", "defenders", "goalies"].includes(row.stat_type)
        ? row.stat_type
        : "skaters";
      const division = String(row.division || "").toLowerCase();
      if (!legacy[stage][type][division]) legacy[stage][type][division] = [];
      legacy[stage][type][division].push({
        name: row.player_name,
        team: row.team_name,
        gp: row.games,
        g: row.goals,
        a: row.assists,
        p: row.points,
        pen: row.penalty_minutes,
        sv: row.saves,
        svp: row.save_percentage,
        gaa: row.goals_against_average,
        w: row.wins,
        so: row.shutouts,
        dim: row.defensive_impact,
        teamMatches: row.team_matches,
        teamLogo: row.team_logo
      });
    });

    return legacy;
  }

  function seasonPlayerId(row) {
    return seasonText(
      row.sports_gamer_player_id || row.central_player_id || row.player_key,
      ""
    );
  }

  function seasonPlayerName(row) {
    return seasonText(row.display_gamertag || row.gamertag, "Okänd spelare");
  }

  function seasonTeamName(row) {
    return seasonText(
      row.name_used_in_tournament || row.team_name_in_tournament ||
      row.current_name || row.team_name,
      "Okänt lag"
    );
  }

  function seasonDivision(row) {
    return seasonText(row.division || row.division_name, "Övriga");
  }

  function seasonRowsWithDivisionFallback(rows, season) {
    if (!season?.divisionFallback) return rows || [];
    return (rows || []).map((row) => (
      row.division || row.division_name
        ? row
        : { ...row, division: season.divisionFallback }
    ));
  }

  function aggregateSeasonPlayers(rows) {
    const players = new Map();

    rows.forEach((row) => {
      const key = seasonPlayerId(row) || `${seasonPlayerName(row)}:${row.player_key || ""}`;
      const current = players.get(key) || {
        key,
        name: seasonPlayerName(row),
        profileKey: row.player_key || row.sports_gamer_player_id || "",
        teams: new Set(),
        divisions: new Set(),
        skaterGames: 0,
        goals: 0,
        assists: 0,
        points: 0,
        goalieGames: 0,
        saves: 0,
        shotsAgainst: 0,
        shutouts: 0
      };

      current.teams.add(seasonTeamName(row));
      current.divisions.add(seasonDivision(row));
      current.skaterGames += seasonNumber(row.total_skater_games ?? row.games_played);
      current.goals += seasonNumber(row.total_goals ?? row.goals);
      current.assists += seasonNumber(row.total_assists ?? row.assists);
      current.points += seasonNumber(row.total_points ?? row.points);
      current.goalieGames += seasonNumber(row.total_goalie_games ?? row.goalie_games);
      current.saves += seasonNumber(row.total_goalie_saves ?? row.total_saves ?? row.saves);
      current.shotsAgainst += seasonNumber(row.total_goalie_shots_against ?? row.total_shots_against ?? row.shots_against);
      current.shutouts += seasonNumber(row.total_goalie_shutouts ?? row.total_shutouts ?? row.shutouts);
      players.set(key, current);
    });

    return [...players.values()];
  }

  function seasonProfileLink(player) {
    const name = escapeHtml(player.name);
    if (!player.profileKey || typeof window.SEH_playerProfileUrl !== "function") {
      return name;
    }
    return `<a href="${escapeHtml(window.SEH_playerProfileUrl(player.profileKey, player.name))}">${name}</a>`;
  }

  function fitSeasonTop3Portraits(root) {
    if (!root) return;
    const medias = root.querySelectorAll('.season-top3-media');
    medias.forEach((media) => {
      const img = media.querySelector(':scope > img');
      if (!img) return;

      const applyFit = () => {
        const boxWidth = media.clientWidth;
        const boxHeight = media.clientHeight;
        if (!boxWidth || !boxHeight || !img.naturalWidth || !img.naturalHeight) return;

        const setFit = (bounds) => {
          const safeBounds = bounds && bounds.width > 0 && bounds.height > 0
            ? bounds
            : { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
          const horizontalPadding = boxWidth * 0.018;
          const topPadding = 0;
          const scale = Math.max(
            Math.max(1, boxWidth - horizontalPadding * 2) / safeBounds.width,
            Math.max(1, boxHeight - topPadding) / safeBounds.height
          );
          const translateX = (boxWidth / 2) - ((safeBounds.x + safeBounds.width / 2) * scale);
          const translateY = topPadding - (safeBounds.y * scale);
          img.style.width = `${img.naturalWidth * scale}px`;
          img.style.height = `${img.naturalHeight * scale}px`;
          img.style.transform = `translate(${translateX}px, ${translateY}px)`;
          img.dataset.top3Fitted = '1';
        };

        if (img.dataset.trimBounds) {
          try {
            setFit(JSON.parse(img.dataset.trimBounds));
            return;
          } catch (error) {
            delete img.dataset.trimBounds;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          const sampleMax = 280;
          const ratio = Math.min(1, sampleMax / Math.max(img.naturalWidth, img.naturalHeight));
          canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Canvas context unavailable');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let minX = canvas.width;
          let minY = canvas.height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
              const alpha = pixels[(y * canvas.width + x) * 4 + 3];
              if (alpha > 14) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }
          const bounds = maxX >= 0 && maxY >= 0
            ? {
                x: Math.max(0, (minX / ratio) - (img.naturalWidth * 0.012)),
                y: Math.max(0, (minY / ratio) - (img.naturalHeight * 0.008)),
                width: Math.min(img.naturalWidth, ((maxX - minX + 1) / ratio) + (img.naturalWidth * 0.024)),
                height: Math.min(img.naturalHeight, ((maxY - minY + 1) / ratio) + (img.naturalHeight * 0.018))
              }
            : { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
          img.dataset.trimBounds = JSON.stringify(bounds);
          setFit(bounds);
        } catch (error) {
          img.style.width = '116%';
          img.style.height = '116%';
          img.style.left = '50%';
          img.style.top = '0';
          img.style.transform = 'translateX(-50%)';
          img.style.objectFit = 'contain';
          img.style.objectPosition = 'center top';
        }
      };

      if (img.complete) {
        applyFit();
      } else {
        img.addEventListener('load', applyFit, { once: true });
      }
    });
  }

  function renderSeasonPlayerTable(players, goalie = false) {
    const sorted = [...players]
      .filter((player) => goalie ? player.goalieGames > 0 : player.skaterGames > 0)
      .sort((a, b) => goalie
        ? b.goalieGames - a.goalieGames || b.saves - a.saves
        : b.points - a.points || b.goals - a.goals)
      .slice(0, 30);

    if (!sorted.length) return `<p class="season-empty">Ingen statistik hittades.</p>`;

    const heading = goalie
      ? `<tr><th>Spelare</th><th>Lag</th><th>GP</th><th>SV</th><th>SV%</th><th>SO</th></tr>`
      : `<tr><th>Spelare</th><th>Lag</th><th>GP</th><th>G</th><th>A</th><th>PTS</th></tr>`;
    const body = sorted.map((player) => {
      const team = escapeHtml([...player.teams].join(" / "));
      if (goalie) {
        const savePercentage = player.shotsAgainst > 0
          ? `${(100 * player.saves / player.shotsAgainst).toFixed(1).replace(".", ",")} %`
          : "–";
        return `<tr><td>${seasonProfileLink(player)}</td><td>${team}</td><td>${player.goalieGames}</td><td>${player.saves}</td><td>${savePercentage}</td><td>${player.shutouts}</td></tr>`;
      }
      return `<tr><td>${seasonProfileLink(player)}</td><td>${team}</td><td>${player.skaterGames}</td><td>${player.goals}</td><td>${player.assists}</td><td>${player.points}</td></tr>`;
    }).join("");

    return `<div class="season-table-wrap"><table class="season-data-table"><thead>${heading}</thead><tbody>${body}</tbody></table></div>`;
  }

  function renderSeasonTeams(rows) {
    const sorted = [...rows].sort((a, b) =>
      seasonDivision(a).localeCompare(seasonDivision(b), "sv") ||
      seasonTeamName(a).localeCompare(seasonTeamName(b), "sv")
    );
    return sorted.map((row) => {
      const teamId = seasonNumber(row.team_id);
      const leagueId = seasonNumber(row.league_id);
      const href = teamId && leagueId
        ? `#/lag/${encodeURIComponent(teamId)}/turnering/${encodeURIComponent(leagueId)}`
        : "#/laghistoria";
      return `<a class="season-team-row" href="${href}"><span>${escapeHtml(seasonDivision(row))}</span><strong>${escapeHtml(seasonTeamName(row))}</strong><small>${seasonNumber(row.games_played)} matcher</small></a>`;
    }).join("");
  }

  function seasonLegacyMatches(legacy) {
    return Object.entries(legacy?.matcher || {}).flatMap(([division, matches]) =>
      (Array.isArray(matches) ? matches : []).map((match) => ({ division, ...match }))
    );
  }

  function seasonLegacyTeams(legacy) {
    const playerStats = new Map();
    const teamKey = (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[^a-z0-9]+/g, "");

    ["regular", "playoffs"].forEach((stage) => {
      ["skaters", "goalies"].forEach((type) => {
        Object.values(legacy?.[stage]?.[type] || {}).forEach((rows) => {
          (Array.isArray(rows) ? rows : []).forEach((player) => {
            const key = teamKey(player.team);
            if (!key) return;
            const current = playerStats.get(key) || {
              players: new Set(),
              regularPoints: 0,
              playoffPoints: 0,
              topPlayer: "",
              topPoints: -1,
              teamLogo: ""
            };
            current.players.add(String(player.name || "").trim());
            current.teamLogo ||= player.teamLogo || "";
            if (type === "skaters") {
              const points = seasonNumber(player.p);
              if (stage === "regular") {
                current.regularPoints += points;
                if (points > current.topPoints) {
                  current.topPoints = points;
                  current.topPlayer = String(player.name || "").trim();
                }
              } else {
                current.playoffPoints += points;
              }
            }
            playerStats.set(key, current);
          });
        });
      });
    });

    return (legacy?.teams || []).map((row) => {
      const stats = playerStats.get(teamKey(row.name));
      return {
        team_id: row.teamID,
        league_id: row.leagueID,
        current_name: row.name,
        name_used_in_tournament: row.name,
        effective_country: "SE",
        division: row.division,
        group_name: row.group,
        table_position: row.tablePosition,
        games_played: row.gamesPlayed,
        wins: row.wins,
        overtime_wins: row.overtimeWins,
        losses: row.losses,
        overtime_losses: row.otLosses,
        table_points: row.tablePoints,
        goals_for: row.goalsFor,
        goals_against: row.goalsAgainst,
        goal_diff: row.goalDiff,
        playoff_games: row.playoffMatches,
        playoff_wins: row.playoffWins,
        playoff_losses: row.playoffLosses,
        playoff_goals_for: row.playoffGoalsFor,
        playoff_goals_against: row.playoffGoalsAgainst,
        playoff_round: row.playoffRound,
        playoff_best_of: row.playoffBestOf,
        playoff_status: row.playoffStatus,
        next_playoff_round: row.nextPlayoffRound,
        sports_gamer_url: row.url,
        logo_url: row.logo || stats?.teamLogo || "",
        swedish_players: stats?.players.size || 0,
        swedish_points: stats?.regularPoints || 0,
        playoff_swedish_points: stats?.playoffPoints || 0,
        top_swedish_player: stats?.topPlayer || "",
        top_swedish_points: Math.max(0, stats?.topPoints || 0)
      };
    });
  }

  function seasonLegacyPlayerRows(legacy) {
    const players = new Map();
    ["regular", "playoffs"].forEach((stageName) => {
      const prefix = stageName === "playoffs" ? "playoff" : "regular";
      ["skaters", "goalies"].forEach((type) => {
        Object.entries(legacy?.[stageName]?.[type] || {}).forEach(([division, rows]) => {
          (rows || []).forEach((row) => {
            const key = `${row.name}|${row.team}|${division}`;
            const current = players.get(key) || {
              player_key: row.name,
              display_gamertag: row.name,
              player_country: "SE",
              division,
              team_name_in_tournament: row.team
            };
            if (type === "goalies") {
              current[`${prefix}_goalie_games`] = seasonNumber(row.gp);
              current[`${prefix}_goalie_saves`] = seasonNumber(row.sv);
              current[`${prefix}_goalie_shots_against`] = row.svp
                ? Math.round(seasonNumber(row.sv) / (seasonNumber(row.svp) / 100))
                : 0;
              current[`${prefix}_goalie_shutouts`] = seasonNumber(row.so);
            } else {
              current[`${prefix}_skater_games`] = seasonNumber(row.gp);
              current[`${prefix}_goals`] = seasonNumber(row.g);
              current[`${prefix}_assists`] = seasonNumber(row.a);
              current[`${prefix}_points`] = seasonNumber(row.p);
            }
            players.set(key, current);
          });
        });
      });
    });
    return [...players.values()];
  }

  function enrichSeasonTeamsWithPlayers(teamRows, playerRows) {
    const playerStats = new Map();
    const teamKey = (row) => {
      const leagueId = seasonNumber(row.league_id);
      const teamId = seasonNumber(row.team_id);
      if (leagueId && teamId) return `${leagueId}:${teamId}`;
      return `${leagueId}:${seasonTeamName(row).toLocaleLowerCase("sv-SE")}`;
    };

    playerRows.forEach((row) => {
      const key = teamKey(row);
      const current = playerStats.get(key) || {
        players: new Set(),
        regularPoints: 0,
        playoffPoints: 0,
        topPlayer: "",
        topPoints: -1
      };
      const playerKey = seasonText(row.player_key || row.display_gamertag, "");
      const playerName = seasonPlayerName(row);
      const regularPoints = seasonNumber(row.regular_points);
      if (playerKey) current.players.add(playerKey);
      current.regularPoints += regularPoints;
      current.playoffPoints += seasonNumber(row.playoff_points);
      if (regularPoints > current.topPoints) {
        current.topPoints = regularPoints;
        current.topPlayer = playerName;
      }
      playerStats.set(key, current);
    });

    return teamRows.map((row) => {
      const stats = playerStats.get(teamKey(row));
      return {
        ...row,
        sports_gamer_url:
          row.sports_gamer_url ||
          row.sports_gamer_tournament_url ||
          row.source_url ||
          "",
        swedish_players: stats?.players.size || 0,
        swedish_points: stats?.regularPoints || 0,
        playoff_swedish_points: stats?.playoffPoints || 0,
        top_swedish_player: stats?.topPlayer || "",
        top_swedish_points: Math.max(0, stats?.topPoints || 0)
      };
    });
  }

  function seasonDate(value) {
    const text = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return seasonText(value);
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(new Date(`${text}T12:00:00`));
  }

  function initializeSeasonMatches(view, legacy) {
    const host = view.querySelector("#seasonMatchList");
    const division = view.querySelector("#seasonMatchDivision");
    const stage = view.querySelector("#seasonMatchStage");
    const sort = view.querySelector("#seasonMatchSort");
    const search = view.querySelector("#seasonMatchSearch");
    const summary = view.querySelector("#seasonMatchSummary");
    const matches = seasonLegacyMatches(legacy);
    if (!host || !division || !stage || !sort || !search || !summary) return;

    const isPlayoff = (match) => String(match.stage || "").toLocaleLowerCase("sv-SE") !== "gruppspel";
    const activateLogos = () => {
      host.querySelectorAll("[data-season-match-logo]").forEach((container) => {
        const name = container.dataset.teamName || "";
        SEH_renderTeamLogo(container, [], name, `${name} logotyp`);
      });
    };
    const eventsMarkup = (value) => String(value || "")
      .split(" | ")
      .filter(Boolean)
      .map((event) => `<li>${escapeHtml(event)}</li>`)
      .join("");

    const render = () => {
      const query = search.value.trim().toLocaleLowerCase("sv-SE");
      const rows = matches.filter((match) => {
        const divisionMatch = division.value === "all" || match.division === division.value;
        const stageMatch = stage.value === "all" || (stage.value === "playoff" ? isPlayoff(match) : !isPlayoff(match));
        const haystack = [match.homeTeam, match.awayTeam, match.svensktLag, match.group, match.stage, match.date]
          .join(" ")
          .toLocaleLowerCase("sv-SE");
        return divisionMatch && stageMatch && (!query || haystack.includes(query));
      });
      rows.sort((a, b) => {
        const dateOrder = `${a.date || ""}T${a.time || ""}`.localeCompare(`${b.date || ""}T${b.time || ""}`);
        return sort.value === "oldest" ? dateOrder : -dateOrder;
      });

      const playoffCount = rows.filter(isPlayoff).length;
      const overtimeCount = rows.filter((match) => Boolean(match.ot)).length;
      const swedishTeams = new Set(rows.map((match) => match.svensktLag).filter(Boolean)).size;
      summary.innerHTML = `<strong>${rows.length}</strong><span>matcher · ${swedishTeams} svenska lag · ${playoffCount} slutspelsmatcher · ${overtimeCount} avgjorda i OT</span>`;
      host.innerHTML = rows.length ? rows.map((match) => {
        const home = seasonText(match.homeTeam);
        const away = seasonText(match.awayTeam);
        const homeSwedish = home === match.svensktLag;
        const awaySwedish = away === match.svensktLag;
        const hasScore = match.homeScore !== null && match.homeScore !== undefined && match.awayScore !== null && match.awayScore !== undefined;
        const stageLabel = seasonText(match.stage, "Match");
        return `
          <article class="season-match-card season-match-card--full">
            <div class="season-match-meta">
              <span>${escapeHtml(String(match.division || "").toUpperCase())}</span>
              <time>${escapeHtml(seasonDate(match.date))} · ${escapeHtml(seasonText(match.time, "Tid saknas"))}</time>
              <small>${escapeHtml(stageLabel)}${match.group ? ` · ${escapeHtml(match.group)}` : ""}</small>
            </div>
            <div class="season-match-row">
              <div class="season-match-side${homeSwedish ? " is-swedish" : ""}">
                <div class="season-match-logo" data-season-match-logo data-team-name="${escapeHtml(home)}"></div>
                <div><small>HEMMALAG</small><strong>${escapeHtml(home)}</strong>${homeSwedish ? "<span>SVENSKT LAG</span>" : ""}</div>
              </div>
              <div class="season-match-center">
                <small>${escapeHtml(stageLabel.toUpperCase())}</small>
                <strong>${hasScore ? `${seasonNumber(match.homeScore)}–${seasonNumber(match.awayScore)}` : "–"}</strong>
                <span>${match.ot ? escapeHtml(match.ot) : "SLUT"}</span>
              </div>
              <div class="season-match-side season-match-side--away${awaySwedish ? " is-swedish" : ""}">
                <div><small>BORTALAG</small><strong>${escapeHtml(away)}</strong>${awaySwedish ? "<span>SVENSKT LAG</span>" : ""}</div>
                <div class="season-match-logo" data-season-match-logo data-team-name="${escapeHtml(away)}"></div>
              </div>
            </div>
            ${match.goalsSummary ? `<details><summary>Visa matchhändelser <span aria-hidden="true">＋</span></summary><ol class="season-match-events">${eventsMarkup(match.goalsSummary)}</ol></details>` : ""}
          </article>`;
      }).join("") : `<p class="season-empty">Inga matcher matchar filtret.</p>`;
      activateLogos();
    };
    division.addEventListener("change", render);
    stage.addEventListener("change", render);
    sort.addEventListener("change", render);
    search.addEventListener("input", render);
    render();
  }

  function initializeSeasonTransfers(view, legacy) {
    const host = view.querySelector("#seasonTransferList");
    const search = view.querySelector("#seasonTransferSearch");
    const summary = view.querySelector("#seasonTransferSummary");
    if (!host || !search || !summary) return;
    const transfers = (legacy?.overgangar || [])
      .filter((row) => ["SE", "SWE", "SWEDEN", "SVERIGE"].includes(String(row.nationality || "").trim().toUpperCase()))
      .sort((a, b) => String(b.Date || "").localeCompare(String(a.Date || "")));
    const teamHref = (teamId, leagueId) => seasonNumber(teamId) && seasonNumber(leagueId)
      ? `#/lag/${encodeURIComponent(seasonNumber(teamId))}/turnering/${encodeURIComponent(seasonNumber(leagueId))}`
      : "";
    const teamBox = (row, direction) => {
      const from = direction === "from";
      const name = seasonText(row[from ? "From" : "To"], from ? "Free Agent" : "Okänt lag");
      const division = seasonText(row[from ? "FromDiv" : "ToDiv"], "");
      const logo = seasonText(row[from ? "fromTeamLogo" : "toTeamLogo"], "");
      const href = teamHref(row[from ? "FromTeamID" : "ToTeamID"], row[from ? "FromLeagueID" : "ToLeagueID"]);
      const content = `<div class="season-transfer-team-logo" data-season-transfer-logo data-team-name="${escapeHtml(name)}" data-logo-url="${escapeHtml(logo)}"></div><div><small>${from ? "FRÅN" : "TILL"}</small><strong>${escapeHtml(name)}</strong><span>${escapeHtml(division)}</span></div>`;
      return href
        ? `<a class="season-transfer-team" href="${escapeHtml(href)}">${content}</a>`
        : `<div class="season-transfer-team is-unlinked">${content}</div>`;
    };
    const activateLogos = () => {
      host.querySelectorAll("[data-season-transfer-logo]").forEach((container) => {
        const name = container.dataset.teamName || "";
        const logo = container.dataset.logoUrl || "";
        SEH_renderTeamLogo(container, [logo], name, `${name} logotyp`);
      });
    };
    const render = () => {
      const query = search.value.trim().toLocaleLowerCase("sv-SE");
      const rows = transfers.filter((row) =>
        !query || [row.Player, row.From, row.To, row.FromDiv, row.ToDiv, row.Role, row.Date].join(" ").toLocaleLowerCase("sv-SE").includes(query)
      );
      const uniquePlayers = new Set(rows.map((row) => String(row.playerID || row.Player || "").trim()).filter(Boolean)).size;
      summary.innerHTML = `<strong>${rows.length}</strong><span>svenska lagbyten · ${uniquePlayers} spelare${query ? " matchar sökningen" : ""}</span>`;
      host.innerHTML = rows.length ? rows.map((row) => `
        <article class="season-transfer-full-card">
          <div class="season-transfer-player">
            <a href="${escapeHtml(SEH_playerProfileUrl(row.playerID, row.Player))}">
              <img src="${escapeHtml(SEH_playerImageUrl(row.playerID))}" alt="${escapeHtml(seasonText(row.Player))}" loading="lazy">
              <div><h4>${escapeHtml(seasonText(row.Player))}</h4><time>${escapeHtml(seasonDate(row.Date))}</time>${row.Role ? `<span>${escapeHtml(row.Role)}</span>` : ""}</div>
            </a>
          </div>
          <div class="season-transfer-move">
            ${teamBox(row, "from")}
            <b class="season-transfer-arrow" aria-label="bytte till">→</b>
            ${teamBox(row, "to")}
          </div>
        </article>`).join("") : `<p class="season-empty">Inga byten matchar sökningen.</p>`;
      activateLogos();
    };
    search.addEventListener("input", render);
    render();
  }

  function initializeSeasonTeams(view, rows, options = {}) {
    const host = view.querySelector("#seasonTeamsList");
    const division = view.querySelector("#seasonTeamDivision");
    const sort = view.querySelector("#seasonTeamSort");
    const search = view.querySelector("#seasonTeamSearch");
    const summary = view.querySelector("#seasonTeamSummary");
    const playoffOnly = view.querySelector("#seasonTeamPlayoffOnly");
    const aliveOnly = view.querySelector("#seasonTeamAliveOnly");
    if (!host || !division || !sort || !search || !summary || !playoffOnly || !aliveOnly) return;

    const divisionRank = { elite: 1, pro: 2, lite: 3, core: 4, neo: 5 };
    const seasonCompleted = Boolean(options.completed);
    const playoffLabel = (row) => {
      const explicit = seasonText(row.playoff_status, "");
      if (explicit) {
        if (explicit.toLowerCase() === "nej") return "Ej slutspel";
        if (explicit.toLowerCase() === "ja") return "Klar för slutspel";
        return explicit;
      }
      const position = seasonNumber(row.table_position);
      const key = seasonDivision(row).toLowerCase();
      if (!position) return "–";
      if (key === "elite") return position <= 8 ? "Klar för slutspel" : position <= 12 ? "Ej slutspel" : position <= 15 ? "Kval" : "Nedflyttning";
      if (key === "pro") return position <= 8 ? "Klar för slutspel" : position <= 11 ? "Ej slutspel" : position <= 14 ? "Kval" : "Nedflyttning";
      if (key === "lite" || key === "core") return position <= 10 ? "Klar för slutspel" : position === 11 ? "Möjlig" : "Ej slutspel";
      if (key === "neo") return position <= 2 ? "Runda 2" : position <= 6 ? "Klar för slutspel" : "Ej slutspel";
      return "–";
    };
    const isPlayoffTeam = (row) => {
      if (typeof row.qualified_for_playoffs === "boolean") {
        return row.qualified_for_playoffs;
      }
      const statusCode = seasonText(row.playoff_status_code, "").toUpperCase();
      if (statusCode === "MISSED_PLAYOFFS") return false;
      const label = playoffLabel(row).toLowerCase();
      return seasonNumber(row.playoff_games) > 0 ||
        (!label.includes("ej slutspel") &&
          !label.includes("missade slutspel") &&
          !label.includes("nedflyttning") &&
          label !== "–");
    };
    const isAlive = (row) => {
      if (seasonCompleted) return false;
      const terminalCodes = new Set([
        "MISSED_PLAYOFFS",
        "ELIMINATED",
        "CHAMPION",
        "RUNNER_UP",
        "THIRD_PLACE"
      ]);
      if (terminalCodes.has(seasonText(row.playoff_status_code, "").toUpperCase())) {
        return false;
      }
      const label = playoffLabel(row).toLowerCase();
      return isPlayoffTeam(row) &&
        !label.includes("utslagen") &&
        !label.includes("ej slutspel") &&
        !label.includes("missade slutspel") &&
        !label.includes("nedflyttning");
    };
    const signed = (value) => seasonNumber(value) > 0 ? `+${seasonNumber(value)}` : String(seasonNumber(value));
    const record = (row) => [
      seasonNumber(row.wins),
      seasonNumber(row.overtime_wins),
      seasonNumber(row.overtime_losses),
      seasonNumber(row.losses)
    ].join("-");
    const pointsPerGame = (row) => seasonNumber(row.games_played)
      ? seasonNumber(row.table_points) / seasonNumber(row.games_played)
      : 0;

    const activateLogos = () => {
      host.querySelectorAll("[data-season-team-logo]").forEach((container) => {
        const name = container.dataset.teamName || "";
        const primary = container.dataset.logoUrl || "";
        SEH_renderTeamLogo(container, [primary], name, `${name} logotyp`);
      });
    };

    const render = () => {
      const query = search.value.trim().toLowerCase();
      const filtered = rows.filter((row) => {
        const haystack = [
          seasonTeamName(row), seasonDivision(row), row.group_name,
          row.top_swedish_player, playoffLabel(row)
        ].join(" ").toLowerCase();
        return (division.value === "all" || seasonDivision(row).toLowerCase() === division.value) &&
          (!query || haystack.includes(query)) &&
          (!playoffOnly.checked || isPlayoffTeam(row)) &&
          (!aliveOnly.checked || isAlive(row));
      });

      filtered.sort((a, b) => {
        if (sort.value === "name-asc") return seasonTeamName(a).localeCompare(seasonTeamName(b), "sv");
        if (sort.value === "name-desc") return seasonTeamName(b).localeCompare(seasonTeamName(a), "sv");
        if (sort.value === "players-desc") return seasonNumber(b.swedish_players) - seasonNumber(a.swedish_players) || seasonTeamName(a).localeCompare(seasonTeamName(b), "sv");
        if (sort.value === "points-desc") return seasonNumber(b.table_points) - seasonNumber(a.table_points) || seasonTeamName(a).localeCompare(seasonTeamName(b), "sv");
        if (sort.value === "ppg-desc") return pointsPerGame(b) - pointsPerGame(a) || seasonNumber(b.table_points) - seasonNumber(a.table_points);
        if (sort.value === "form-desc") return seasonNumber(b.wins) - seasonNumber(a.wins) || seasonNumber(b.table_points) - seasonNumber(a.table_points);
        if (sort.value === "swedish-points-desc") return seasonNumber(b.swedish_points) - seasonNumber(a.swedish_points) || seasonTeamName(a).localeCompare(seasonTeamName(b), "sv");
        if (sort.value === "matches-desc") return seasonNumber(b.games_played) - seasonNumber(a.games_played) || seasonTeamName(a).localeCompare(seasonTeamName(b), "sv");
        return (divisionRank[seasonDivision(a).toLowerCase()] || 99) - (divisionRank[seasonDivision(b).toLowerCase()] || 99) ||
          seasonNumber(b.table_points) - seasonNumber(a.table_points) ||
          seasonTeamName(a).localeCompare(seasonTeamName(b), "sv");
      });

      const playoffCount = filtered.filter(isPlayoffTeam).length;
      const qualificationCount = filtered.filter((row) => /kval|möjlig/i.test(playoffLabel(row))).length;
      const relegationCount = filtered.filter((row) => /nedflyttning/i.test(playoffLabel(row))).length;
      const playerCount = filtered.reduce((total, row) => total + seasonNumber(row.swedish_players), 0);
      summary.innerHTML = `
        <article><span>VISAR LAG</span><strong>${filtered.length}</strong></article>
        <article><span>SLUTSPEL</span><strong>${playoffCount}</strong></article>
        <article><span>KVAL/MÖJLIG</span><strong>${qualificationCount}</strong></article>
        <article><span>NEDFLYTTNING</span><strong>${relegationCount}</strong></article>
        <article><span>SV SPELARE</span><strong>${playerCount}</strong></article>`;

      host.innerHTML = filtered.length ? filtered.map((row) => {
        const teamId = seasonNumber(row.team_id);
        const leagueId = seasonNumber(row.league_id);
        const internalHref = `#/lag/${encodeURIComponent(teamId)}/turnering/${encodeURIComponent(leagueId)}`;
        const href = seasonText(row.sports_gamer_url, internalHref);
        const external = /^https?:/i.test(href);
        const playoff = playoffLabel(row);
        const playoffClass = /utslagen|ej slutspel|nedflyttning/i.test(playoff)
          ? "is-negative"
          : /kval|möjlig/i.test(playoff) ? "is-warning" : "is-positive";
        const playoffGames = seasonNumber(row.playoff_games);
        const topPlayer = seasonText(row.top_swedish_player, "");
        const groupLabel = seasonText(row.group_name, "");
        const placementLabel = row.table_position ? `#${seasonNumber(row.table_position)}` : "–";
        const actionLabel = external ? "Öppna på SportsGamer" : "Öppna lag";
        const topPlayerMarkup = topPlayer
          ? `<div class="season-team-card__summary"><p><strong>Topp svensk:</strong> ${escapeHtml(topPlayer)} · ${seasonNumber(row.top_swedish_points)} p</p><p><strong>Status:</strong> ${escapeHtml(playoff)}</p></div>`
          : `<div class="season-team-card__summary season-team-card__summary--muted"><p><strong>Topp svensk:</strong> Ingen svensk spelare kopplad ännu</p><p><strong>Status:</strong> ${escapeHtml(playoff)}</p></div>`;
        return `<article class="season-team-card">
          <a class="season-team-card__link" href="${escapeHtml(href)}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""}>
            <div class="season-team-card__watermark" data-season-team-logo data-team-name="${escapeHtml(seasonTeamName(row))}" data-logo-url="${escapeHtml(seasonText(row.logo_url, ""))}" aria-hidden="true"></div>
            <header class="season-team-card__header">
              <div class="season-team-card__logo" data-season-team-logo data-team-name="${escapeHtml(seasonTeamName(row))}" data-logo-url="${escapeHtml(seasonText(row.logo_url, ""))}"></div>
              <div class="season-team-card__identity">
                <div class="season-team-card__eyebrow">
                  <span class="season-team-division">${escapeHtml(seasonDivision(row))}</span>
                  ${groupLabel ? `<span class="season-team-group">Grupp ${escapeHtml(groupLabel)}</span>` : ""}
                  <span class="season-team-status-badge ${playoffClass}">${escapeHtml(playoff)}</span>
                </div>
                <h4>${escapeHtml(seasonTeamName(row))}</h4>
                <p>${row.table_position ? `Tabellplacering ${escapeHtml(placementLabel)}` : "Tabellplacering saknas"}</p>
              </div>
            </header>
            <div class="season-team-highlights">
              <div><span>POÄNG</span><strong>${seasonNumber(row.table_points)}</strong></div>
              <div><span>PLACERING</span><strong>${escapeHtml(placementLabel)}</strong></div>
              <div><span>SV SPELARE</span><strong>${seasonNumber(row.swedish_players)}</strong></div>
              <div><span>SV POÄNG</span><strong>${seasonNumber(row.swedish_points)}</strong></div>
            </div>
            <div class="season-team-card__panels">
              <section class="season-team-card__stats">
                <h5>GRUNDSERIE</h5>
                <dl>
                  <div><dt>GRUPP</dt><dd>${escapeHtml(groupLabel || "–")}</dd></div>
                  <div><dt>GP</dt><dd>${seasonNumber(row.games_played)}</dd></div>
                  <div><dt>RECORD</dt><dd>${record(row)}</dd></div>
                  <div><dt>P/G</dt><dd>${pointsPerGame(row).toFixed(2).replace(".", ",")}</dd></div>
                  <div><dt>GF–GA</dt><dd>${seasonNumber(row.goals_for)}–${seasonNumber(row.goals_against)}</dd></div>
                  <div><dt>MÅL +/−</dt><dd>${signed(row.goal_diff)}</dd></div>
                </dl>
              </section>
              <section class="season-team-card__stats${playoffGames ? ' season-team-card__stats--playoff' : ' season-team-card__stats--empty'}">
                <h5>SLUTSPEL</h5>
                ${playoffGames ? `<dl>
                  <div><dt>RUNDA</dt><dd>${escapeHtml(seasonText(row.playoff_round) || "–")}</dd></div>
                  <div><dt>W–L</dt><dd>${seasonNumber(row.playoff_wins)}–${seasonNumber(row.playoff_losses)}</dd></div>
                  <div><dt>FORMAT</dt><dd>${row.playoff_best_of ? `BO${seasonNumber(row.playoff_best_of)}` : "–"}</dd></div>
                  <div><dt>GF–GA</dt><dd>${seasonNumber(row.playoff_goals_for)}–${seasonNumber(row.playoff_goals_against)}</dd></div>
                </dl>` : `<p class="season-team-card__empty-note">Inga slutspelsmatcher registrerade.</p>`}
              </section>
            </div>
            <footer class="season-team-card__footer">
              ${topPlayerMarkup}
              <span class="season-team-card__action">${actionLabel} <b aria-hidden="true">→</b></span>
            </footer>
          </a>
        </article>`;
      }).join("") : `<p class="season-empty">Inga lag matchar filtret.</p>`;
      activateLogos();
    };
    division.addEventListener("change", render);
    sort.addEventListener("change", render);
    search.addEventListener("input", render);
    playoffOnly.addEventListener("change", render);
    aliveOnly.addEventListener("change", render);
    render();
  }

  function initializeSeasonStatistics(view, playerRows, teamRows, legacy, rawTeamRows = []) {
    const stage = view.querySelector("#seasonStatsStage");
    const role = view.querySelector("#seasonStatsRole");
    const division = view.querySelector("#seasonStatsDivision");
    const search = view.querySelector("#seasonStatsSearch");
    const summary = view.querySelector("#seasonStatsSummary");
    const top3 = view.querySelector("#seasonStatsTop3");
    const table = view.querySelector("#seasonStatsTable");
    const title = view.querySelector("#seasonStatsListTitle");
    const stageButtons = [...view.querySelectorAll("[data-season-stats-stage]")];
    const roleButtons = [...view.querySelectorAll("[data-season-stats-role]")];
    const divisionButtons = [...view.querySelectorAll("[data-season-stats-division]")];
    if (!stage || !role || !division || !search || !summary || !top3 || !table || !title) return;

    const divisionLabels = { ecl: "ECL", elite: "Elite", pro: "Pro", lite: "Lite", core: "Core", neo: "Neo" };
    const normalKey = (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[^a-z0-9]+/g, "");
    const legacyData = legacy?.rows?.[0]?.json_result
      ? (typeof legacy.rows[0].json_result === "string" ? JSON.parse(legacy.rows[0].json_result) : legacy.rows[0].json_result)
      : legacy;
    const legacyLookup = new Map();
    ["regular", "playoffs"].forEach((legacyStage) => {
      ["skaters", "goalies", "defenders"].forEach((kind) => {
        Object.entries(legacyData?.[legacyStage]?.[kind] || {}).forEach(([division, rows]) => {
          (rows || []).forEach((row) => {
            const exactKey = `${legacyStage}|${kind}|${normalKey(division)}|${normalKey(row.name)}|${normalKey(row.team)}`;
            const playerKey = `${legacyStage}|${kind}|${normalKey(division)}|${normalKey(row.name)}|`;
            legacyLookup.set(exactKey, row);
            if (!legacyLookup.has(playerKey)) legacyLookup.set(playerKey, row);
          });
        });
      });
    });

    const teamMatches = new Map();
    const teamMatchesByName = new Map();
    const setTeamMatchCount = (map, key, value) => {
      const count = seasonNumber(value);
      if (!key || count <= 0) return;
      map.set(key, Math.max(count, seasonNumber(map.get(key))));
    };
    const stageTeamGames = (row, stageName) => {
      const totalGames = seasonNumber(row.games_played);
      const regularGames = seasonNumber(row.regular_games);
      const playoffGames = seasonNumber(row.playoff_games);
      if (stageName === "playoff") return playoffGames;
      if (regularGames > 0) return regularGames;
      // Äldre lagrader kan sakna regular_games men ha combined games_played.
      // Dra då bort slutspelsmatcherna i stället för att använda totalen.
      if (totalGames > 0 && playoffGames > 0) return Math.max(0, totalGames - playoffGames);
      return totalGames;
    };

    (teamRows || []).forEach((row) => {
      const leagueId = seasonNumber(row.league_id);
      const teamId = seasonNumber(row.team_id);
      const teamName = normalKey(row.name_used_in_tournament || row.current_name);
      const regularGames = stageTeamGames(row, "regular");
      const playoffGames = stageTeamGames(row, "playoff");
      if (teamId > 0) {
        setTeamMatchCount(teamMatches, `${leagueId}:${teamId}:regular`, regularGames);
        setTeamMatchCount(teamMatches, `${leagueId}:${teamId}:playoff`, playoffGames);
      }
      if (teamName) {
        setTeamMatchCount(teamMatchesByName, `${leagueId}:${teamName}:regular`, regularGames);
        setTeamMatchCount(teamMatchesByName, `${leagueId}:${teamName}:playoff`, playoffGames);
      }
    });

    // Historiska spelarposter saknar ibland internt team_id även om lagnamnet
    // är korrekt. SportsGamers råa lagtävlingstabell ger då rätt matchantal
    // per fas och gör 50 %-regeln korrekt även för äldre ECL-säsonger.
    (rawTeamRows || []).forEach((row) => {
      const leagueId = seasonNumber(row.sports_gamer_league_id);
      const teamName = normalKey(row.team_name_in_league || row.current_global_team_name);
      const stageName = String(row.statistics_stage || "").toLocaleLowerCase("sv-SE");
      if (!leagueId || !teamName) return;
      if (stageName === "regular") {
        setTeamMatchCount(teamMatchesByName, `${leagueId}:${teamName}:regular`, row.games_played);
      } else if (stageName === "playoffs" || stageName === "playoff") {
        setTeamMatchCount(teamMatchesByName, `${leagueId}:${teamName}:playoff`, row.games_played);
      }
    });

    const configs = {
      ppg: { label: "Poäng per match", short: "P/M", kind: "skater", rate: true, value: (p) => p.gp ? p.points / p.gp : 0 },
      gpg: { label: "Mål per match", short: "M/M", kind: "skater", rate: true, value: (p) => p.gp ? p.goals / p.gp : 0 },
      apg: { label: "Assist per match", short: "A/M", kind: "skater", rate: true, value: (p) => p.gp ? p.assists / p.gp : 0 },
      goals: { label: "Mål", short: "MÅL", kind: "skater", value: (p) => p.goals },
      assists: { label: "Assist", short: "A", kind: "skater", value: (p) => p.assists },
      points: { label: "Poäng", short: "P", kind: "skater", value: (p) => p.points },
      penalties: { label: "Utvisningsminuter", short: "PIM", kind: "skater", value: (p) => p.penalties },
      defenderPoints: { label: "Backar – poäng", short: "P", kind: "defender", value: (p) => p.points },
      defenderAssists: { label: "Backar – assist", short: "A", kind: "defender", value: (p) => p.assists },
      defenderGoals: { label: "Backar – mål", short: "MÅL", kind: "defender", value: (p) => p.goals },
      defenderPenalties: { label: "Backar – utvisningsminuter", short: "PIM", kind: "defender", value: (p) => p.penalties },
      svp: { label: "Räddningsprocent", short: "SV%", kind: "goalie", rate: true, value: (p) => p.savePercentage },
      gaa: { label: "Insläppta mål per match", short: "GAA", kind: "goalie", rate: true, ascending: true, value: (p) => p.gaa },
      goalieWins: { label: "Målvaktsvinster", short: "W", kind: "goalie", value: (p) => p.wins },
      shutouts: { label: "Hållna nollor", short: "SO", kind: "goalie", value: (p) => p.shutouts },
      dim: { label: "Defensiv impact (DIM)", short: "DIM", kind: "skater", rate: true, legacyOnly: true, value: (p) => p.dim }
    };
    let sortKey = "points";

    const formatValue = (value, config) => {
      if (!Number.isFinite(value)) return "–";
      if (config.short === "SV%") return `${value.toFixed(2).replace(".", ",")} %`;
      if (["P/M", "M/M", "A/M", "GAA", "DIM"].includes(config.short)) return value.toFixed(2).replace(".", ",");
      return String(Math.round(value));
    };
    const formatTop3Value = (value, config) => {
      if (!Number.isFinite(value)) return "–";
      if (["SV%", "P/M", "M/M", "A/M", "GAA", "DIM"].includes(config.short)) {
        return value.toFixed(2).replace(".", ",");
      }
      return String(Math.round(value));
    };
    const seasonTop3NameClass = (name) => {
      const length = Array.from(String(name || "")).length;
      if (length >= 16) return " is-very-long";
      if (length >= 12) return " is-long";
      if (length >= 10) return " is-medium";
      return "";
    };
    const legacyPlayer = (stageName, kind, division, row) =>
      legacyLookup.get(`${stageName}|${kind}|${division}|${normalKey(seasonPlayerName(row))}|${normalKey(seasonTeamName(row))}`) ||
      legacyLookup.get(`${stageName}|${kind}|${division}|${normalKey(seasonPlayerName(row))}|`);
    const buildPlayers = (stageName, config) => {
      const prefix = stageName === "playoffs" ? "playoff" : "regular";
      return playerRows.map((row) => {
        const division = normalKey(seasonDivision(row));
        const position = seasonText(row.primary_position, "").toUpperCase();
        const legacyKind = config.kind === "goalie" ? "goalies" : config.kind === "defender" ? "defenders" : "skaters";
        const archived = legacyPlayer(stageName, legacyKind, division, row) ||
          (config.kind === "defender" ? legacyPlayer(stageName, "skaters", division, row) : null);
        const goalie = config.kind === "goalie";
        const gp = seasonNumber(row[`${prefix}_${goalie ? "goalie" : "skater"}_games`] ?? archived?.gp);
        const saves = seasonNumber(row[`${prefix}_goalie_saves`] ?? archived?.sv);
        const shots = seasonNumber(row[`${prefix}_goalie_shots_against`]);
        const goalsAllowed = seasonNumber(row[`${prefix}_goalie_goals_allowed`]);
        const dbSavePercentage = Number(row[`${prefix}_goalie_save_percentage`]);
        const dbGaa = Number(row[`${prefix}_goalie_goals_against_average`]);
        const leagueId = seasonNumber(row.league_id);
        const teamId = seasonNumber(row.team_id);
        const teamNameKey = normalKey(seasonTeamName(row));
        const matches =
          (teamId > 0 ? seasonNumber(teamMatches.get(`${leagueId}:${teamId}:${prefix}`)) : 0) ||
          seasonNumber(teamMatchesByName.get(`${leagueId}:${teamNameKey}:${prefix}`)) ||
          seasonNumber(archived?.teamMatches);
        const sportsGamerId = seasonText(row.sports_gamer_player_url, "").match(/\/players\/(\d+)/i)?.[1];
        return {
          row,
          name: seasonPlayerName(row),
          team: seasonTeamName(row),
          division,
          gp,
          goals: seasonNumber(row[`${prefix}_goals`] ?? archived?.g),
          assists: seasonNumber(row[`${prefix}_assists`] ?? archived?.a),
          points: seasonNumber(row[`${prefix}_points`] ?? archived?.p),
          penalties: seasonNumber(row[`${prefix}_penalty_minutes`] ?? archived?.pen),
          saves,
          savePercentage: (saves + goalsAllowed) > 0
            ? 100 * saves / (saves + goalsAllowed)
            : Number.isFinite(dbSavePercentage) && dbSavePercentage > 0
              ? (dbSavePercentage <= 1 ? dbSavePercentage * 100 : dbSavePercentage)
              : shots > 0 ? 100 * saves / shots : seasonNumber(archived?.svp),
          gaa: Number.isFinite(dbGaa) && dbGaa > 0 ? dbGaa : gp > 0 && goalsAllowed > 0 ? goalsAllowed / gp : seasonNumber(archived?.gaa),
          wins: seasonNumber(row[`${prefix}_goalie_wins`] ?? archived?.w),
          shutouts: seasonNumber(row[`${prefix}_goalie_shutouts`] ?? archived?.so),
          dim: seasonNumber(archived?.dim),
          matchShare: matches > 0 ? 100 * gp / matches : seasonNumber(archived?.matchSharePct),
          isDefender: position === "LD" || position === "RD" || Boolean(legacyPlayer(stageName, "defenders", division, row)),
          teamLogo: seasonText(archived?.teamLogo, ""),
          playerImage: SEH_playerImageUrl(sportsGamerId)
        };
      });
    };

    const activateLogos = () => {
      view.querySelectorAll("[data-season-stat-logo]").forEach((container) => {
        const name = container.dataset.teamName || "";
        const logo = container.dataset.logoUrl || "";
        SEH_renderTeamLogo(container, [logo], name, `${name} logotyp`);
      });
    };
    const roleConfig = {
      skater: {
        label: "Poängliga",
        kind: "skater",
        defaultSort: "points",
        columns: ["gp", "goals", "assists", "points", "ppg", "penalties"]
      },
      defender: {
        label: "Backliga",
        kind: "defender",
        defaultSort: "defenderPoints",
        columns: ["gp", "defenderGoals", "defenderAssists", "defenderPoints", "ppg", "defenderPenalties", "dim"]
      },
      goalie: {
        label: "Målvaktsliga",
        kind: "goalie",
        defaultSort: "svp",
        columns: ["gp", "goalieWins", "saves", "svp", "gaa", "shutouts"]
      }
    };
    const columnConfig = {
      gp: { label: "GP", short: "GP", kind: "all", value: (p) => p.gp },
      saves: { label: "SV", short: "SV", kind: "goalie", value: (p) => p.saves },
      ...configs
    };
    const eligibleForSort = (player, config) =>
      player.gp > 0 &&
      (!config.rate || player.matchShare >= 50) &&
      (!config.legacyOnly || player.dim > 0);
    const sortedRows = (players, config) => players
      .filter((player) => eligibleForSort(player, config))
      .map((player) => ({ ...player, statValue: config.value(player) }))
      .filter((player) => Number.isFinite(player.statValue))
      .sort((a, b) => (config.ascending ? a.statValue - b.statValue : b.statValue - a.statValue) || b.gp - a.gp || a.name.localeCompare(b.name, "sv"));
    const setButtonGroup = (buttons, activeButton) => {
      buttons.forEach((button) => {
        const active = button === activeButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    };
    const render = () => {
      const stageName = stage.value === "playoff" ? "playoffs" : "regular";
      const query = search.value.trim().toLocaleLowerCase("sv-SE");
      const currentRole = roleConfig[role.value] || roleConfig.skater;
      const config = columnConfig[sortKey] || columnConfig[currentRole.defaultSort];
      const players = buildPlayers(stageName, { kind: currentRole.kind })
        .filter((player) => player.gp > 0)
        .filter((player) => currentRole.kind !== "defender" || player.isDefender)
        .filter((player) => player.division === division.value)
        .filter((player) => !query || `${player.name} ${player.team}`.toLocaleLowerCase("sv-SE").includes(query));
      const ranking = sortedRows(players, config);
      const leaders = ranking.slice(0, 3);
      const maxStat = Math.max(...leaders.map((player) => Math.abs(player.statValue)), 1);
      const stageLabel = stageName === "playoffs" ? "Slutspel" : "Grundserie";
      title.innerHTML = `<span>${escapeHtml(stageLabel.toUpperCase())}</span><h4>${escapeHtml(divisionLabels[division.value])} ${escapeHtml(currentRole.label)} – ${escapeHtml(config.label)}</h4>${config.rate ? `<p>Minst 50 % av lagets matcher krävs för den här topplistan.</p>` : ""}`;
      top3.innerHTML = leaders.length ? leaders.map((player, index) => `
        <article class="season-top3-card${index === 0 ? " is-winner" : ""}">
          <span class="season-top3-medal">${index + 1}</span>
          <div class="season-top3-team-logo" data-season-stat-logo data-team-name="${escapeHtml(player.team)}" data-logo-url="${escapeHtml(player.teamLogo)}"></div>
          <div class="season-top3-hero">
            <div class="season-top3-media">
              <div class="season-top3-bg-logo" data-season-stat-logo data-team-name="${escapeHtml(player.team)}" data-logo-url="${escapeHtml(player.teamLogo)}"></div>
              <img src="${escapeHtml(player.playerImage)}" alt="${escapeHtml(player.name)}" loading="lazy" onerror="this.onerror=null;this.src='players/1DEFAULTBILDID.png'">
            </div>
            <div class="season-top3-content">
              <div class="season-top3-content-logo" data-season-stat-logo data-team-name="${escapeHtml(player.team)}" data-logo-url="${escapeHtml(player.teamLogo)}"></div>
              <div class="season-top3-copy"><strong class="season-top3-player-name${seasonTop3NameClass(player.name)}">${seasonProfileLink({ name: player.name, profileKey: player.row.player_key })}</strong><small>${escapeHtml(player.team)}</small><b class="season-top3-value${config.short === "SV%" ? " season-top3-value--svp" : ""}">${escapeHtml(formatTop3Value(player.statValue, config))} <em>${escapeHtml(config.short)}</em></b></div>
              <dl>${role.value === "goalie"
                ? `<div><dt>GP</dt><dd>${player.gp}</dd></div><div><dt>Vinster</dt><dd>${player.wins}</dd></div><div><dt>Nollor</dt><dd>${player.shutouts}</dd></div>`
                : `<div><dt>GP</dt><dd>${player.gp}</dd></div><div><dt>Mål</dt><dd>${player.goals}</dd></div><div><dt>Assist</dt><dd>${player.assists}</dd></div>`}</dl>
              <div class="season-top3-bar"><span style="width:${Math.max(5, 100 * Math.abs(player.statValue) / maxStat)}%"></span></div>
            </div>
          </div>
        </article>`).join("") : `<p class="season-empty">Ingen svensk spelare uppfyller kraven.</p>`;

      requestAnimationFrame(() => fitSeasonTop3Portraits(top3));

      const columns = currentRole.columns.map((key) => ({ key, config: columnConfig[key] }));
      const tableRows = [...players].sort((a, b) => {
        const av = config.value(a);
        const bv = config.value(b);
        return (config.ascending ? av - bv : bv - av) || b.gp - a.gp || a.name.localeCompare(b.name, "sv");
      });
      table.innerHTML = `<div class="season-table-wrap"><table class="season-data-table season-stat-table"><thead><tr><th>#</th><th>Spelare</th><th>Lag</th>${columns.map(({ key, config: item }) => `<th><button type="button" data-season-stat-sort="${escapeHtml(key)}" class="${key === sortKey ? "is-active" : ""}">${escapeHtml(item.short)}</button></th>`).join("")}</tr></thead><tbody>${tableRows.length ? tableRows.map((player, index) => `<tr><td><span class="season-stat-rank">${index + 1}</span></td><td class="season-stat-player">${seasonProfileLink({ name: player.name, profileKey: player.row.player_key })}</td><td><div class="season-stat-team"><span class="season-stat-team__logo" data-season-stat-logo data-team-name="${escapeHtml(player.team)}" data-logo-url="${escapeHtml(player.teamLogo)}"></span><span class="season-stat-team__name">${escapeHtml(player.team)}</span></div></td>${columns.map(({ config: item }) => `<td>${escapeHtml(formatValue(item.value(player), item))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length + 3}">Ingen statistik matchar filtret.</td></tr>`}</tbody></table></div>`;
      table.querySelectorAll("[data-season-stat-sort]").forEach((button) => button.addEventListener("click", () => {
        sortKey = button.dataset.seasonStatSort || currentRole.defaultSort;
        render();
      }));
      summary.innerHTML = `<strong>${players.length}</strong><span>svenska ${role.value === "goalie" ? "målvakter" : role.value === "defender" ? "backar" : "spelare"} i ${divisionLabels[division.value]} · topp 3 sorterad på ${config.label.toLowerCase()}</span>`;
      activateLogos();
    };
    stageButtons.forEach((button) => button.addEventListener("click", () => {
      stage.value = button.dataset.seasonStatsStage === "playoff" ? "playoff" : "regular";
      setButtonGroup(stageButtons, button);
      render();
    }));
    roleButtons.forEach((button) => button.addEventListener("click", () => {
      role.value = button.dataset.seasonStatsRole || "skater";
      sortKey = roleConfig[role.value]?.defaultSort || "points";
      setButtonGroup(roleButtons, button);
      render();
    }));
    divisionButtons.forEach((button) => button.addEventListener("click", () => {
      division.value = button.dataset.seasonStatsDivision || "elite";
      setButtonGroup(divisionButtons, button);
      render();
    }));
    search.addEventListener("input", render);
    render();
  }

  async function loadSeasonDashboard(view, season, selectedSection) {
    const content = view.querySelector("#seasonDatabaseContent");
    const status = view.querySelector("#seasonDataStatus");
    if (!content || !status || !season.leagueIds?.length) return;

    content.hidden = selectedSection === "overview";
    content.querySelectorAll("[data-season-section]").forEach((section) => {
      section.hidden = section.dataset.seasonSection !== selectedSection;
    });
    if (selectedSection === "overview") return;

    status.classList.remove("is-error");
    status.textContent = "Hämtar säsongsdata från Supabase…";

    try {
      if (selectedSection === "matches") {
        const matches = await seasonFetchAll("ehockey_season_matches_v1", {
          select: "match_id,league_id,division,stage,group_name,played_at,home_team,away_team,home_score,away_score,overtime,swedish_team,goals_summary",
          season_id: `eq.${season.id}`,
          order: "played_at.desc"
        });
        if (!matches.length) throw new Error("Inga matcher hittades i Supabase för säsongen.");
        initializeSeasonMatches(view, { matcher: { all: seasonSupabaseMatchRows(matches) } });
        status.textContent = `${matches.length} svenska matcher hämtade från Supabase`;
      } else if (selectedSection === "transfers") {
        const transfers = await seasonFetchAll("ehockey_season_transfers_v1", {
          select: "transfer_date,player_name,player_id,user_id,nationality,player_role,from_team,from_division,from_team_id,from_league_id,from_team_logo,to_team,to_division,to_team_id,to_league_id,to_team_logo,player_image,previous_group_games,previous_total_games,previous_playoff_games",
          season_id: `eq.${season.id}`,
          order: "transfer_date.desc"
        });
        if (!transfers.length) throw new Error("Inga spelarbyten hittades i Supabase för säsongen.");
        initializeSeasonTransfers(view, { overgangar: seasonSupabaseTransferRows(transfers) });
        status.textContent = "Daterade svenska spelarbyten hämtade från Supabase";
      } else if (selectedSection === "teams") {
        const [teams, playerRows] = await Promise.all([
          seasonFetchLeagueSet("v_ehockey_team_tournaments_web_v14", season.leagueIds, {
            select: "team_id,league_id,current_name,name_used_in_tournament,effective_country,division,division_rank,group_name,table_position,regular_season_seed,qualified_for_playoffs,final_placement,games_played,wins,losses,overtime_wins,overtime_losses,table_points,goals_for,goals_against,goal_diff,playoff_games,playoff_wins,playoff_losses,playoff_overtime_wins,playoff_overtime_losses,playoff_goals_for,playoff_goals_against,playoff_round_code,playoff_round,playoff_status_code,playoff_status,playoff_series_played,playoff_series_won,playoff_series_lost,final_team_game_wins,final_opponent_game_wins,has_playoff_result,source_url,sports_gamer_tournament_url,chronology_end_date,end_date",
            effective_country: `eq.${season.countryCode}`
          }),
          seasonFetchLeagueSet("v_ehockey_player_tournaments_web_v14", season.leagueIds, {
            select: "player_key,display_gamertag,player_country,team_id,team_name_in_tournament,league_id,division,regular_points,playoff_points",
            player_country: `eq.${season.countryCode}`
          })
        ]);
        if (!teams.length) throw new Error("Inga svenska lag hittades i Supabase för säsongen.");
        const normalizedTeams = seasonRowsWithDivisionFallback(teams, season);
        const normalizedPlayers = seasonRowsWithDivisionFallback(playerRows, season);
        initializeSeasonTeams(view, enrichSeasonTeamsWithPlayers(normalizedTeams, normalizedPlayers), {
          completed: season.completed
        });
        status.textContent = "Svenska lag, spelare och slutspelsresultat hämtade från Supabase";
      } else if (selectedSection === "statistics") {
        const [playerRows, teamRows, metricRows, rawTeamRows] = await Promise.all([
          seasonFetchLeagueSet("v_ehockey_player_tournaments_web_v14", season.leagueIds, {
            select: "player_key,display_gamertag,player_country,league_id,division,team_id,team_name_in_tournament,primary_position,player_type,sports_gamer_player_url,regular_skater_games,regular_goals,regular_assists,regular_points,regular_penalty_minutes,regular_goalie_games,regular_goalie_wins,regular_goalie_saves,regular_goalie_shots_against,regular_goalie_goals_allowed,regular_goalie_save_percentage,regular_goalie_goals_against_average,regular_goalie_shutouts,playoff_skater_games,playoff_goals,playoff_assists,playoff_points,playoff_penalty_minutes,playoff_goalie_games,playoff_goalie_wins,playoff_goalie_saves,playoff_goalie_shots_against,playoff_goalie_goals_allowed,playoff_goalie_save_percentage,playoff_goalie_goals_against_average,playoff_goalie_shutouts",
            player_country: `eq.${season.countryCode}`
          }),
          seasonFetchLeagueSet("v_ehockey_team_tournaments_web_v14", season.leagueIds, {
            select: "team_id,league_id,current_name,name_used_in_tournament,games_played,regular_games,playoff_games",
            effective_country: `eq.${season.countryCode}`
          }),
          seasonFetchAll("ehockey_season_player_metrics_v1", {
            select: "stage,stat_type,division,player_name,team_name,games,goals,assists,points,penalty_minutes,saves,save_percentage,goals_against_average,wins,shutouts,defensive_impact,team_matches,team_logo",
            season_id: `eq.${season.id}`
          }),
          (async () => {
            const rows = [];
            for (const leagueId of season.leagueIds) {
              try {
                rows.push(...await seasonFetchAll("sportsgamer_team_tournament_stats", {
                  select: "sports_gamer_league_id,team_name_in_league,current_global_team_name,statistics_stage,games_played",
                  sports_gamer_league_id: `eq.${leagueId}`
                }));
              } catch (error) {
                console.warn(`SportsGamer-lagdata kunde inte hämtas för liga ${leagueId}.`, error);
              }
            }
            return rows;
          })()
        ]);
        if (!playerRows.length) throw new Error("Ingen svensk spelarstatistik hittades i Supabase för säsongen.");
        initializeSeasonStatistics(
          view,
          seasonRowsWithDivisionFallback(playerRows, season),
          seasonRowsWithDivisionFallback(teamRows, season),
          seasonSupabaseMetricsLegacy(metricRows),
          rawTeamRows
        );
        status.textContent = "Svensk spelarstatistik och DIM hämtade från Supabase";
      }
    } catch (error) {
      if (!view.isConnected) return;
      status.classList.add("is-error");
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function initializeSeasonView(view, route) {
    const seasonId =
      normalizeSeasonId(route.params.seasonId);

    const season = seasons[seasonId];

    const sections = ["overview", "matches", "transfers", "teams", "statistics"];
    const availableSections = new Set(season.sections || ["overview"]);

    let selectedSection = sections.includes(route.query.get("section"))
      ? route.query.get("section")
      : "overview";

    if (!availableSections.has(selectedSection)) {
      selectedSection = "overview";
    }

    const seasonTitle =
      view.querySelector("#seasonTitle");

    const overviewTitle =
      view.querySelector("#seasonOverviewTitle");

    const teamsLink =
      view.querySelector("#seasonTeamsLink");

    if (seasonTitle) {
      seasonTitle.textContent = season.title;
    }

    if (overviewTitle) {
      overviewTitle.textContent =
        season.title;
    }

    const seasonHeroLabel = view.querySelector("#seasonHeroLabel");
    const seasonHeroStatus = view.querySelector("#seasonHeroStatus");
    if (seasonHeroLabel) seasonHeroLabel.textContent = season.title;
    if (seasonHeroStatus) {
      const availableLabels = seasonSectionLabels(season);
      seasonHeroStatus.textContent = season.leagueIds?.length
        ? `${availableLabels.join(", ")} finns tillgängligt för den här säsongen.`
        : "Säsongen är ännu inte igång. När ECL-data finns aktiveras matcher, byten, lag och statistik här.";
    }

    if (teamsLink) {
      teamsLink.href =
        `#/laghistoria?season=${
          encodeURIComponent(season.databaseLabel)
        }`;
    }

    const playerLink = [
      ...view.querySelectorAll("a")
    ].find((anchor) =>
      anchor.textContent
        .trim()
        .toLowerCase()
        .includes("öppna spelarregistret")
    );

    if (playerLink) {
      playerLink.href = "#/spelare";
    }

    const overview = view.querySelector(".season-overview");
    const panels = view.querySelector(".season-panels");

    if (season.leagueIds?.length) {
      if (overview) {
        const landingCards = [
          ["matches", "Matcher", "Alla svenska matcher, resultat och datum."],
          ["transfers", "Byten", `Svenska spelarbyten under ${season.title}.`],
          ["teams", "Lag", "Svenska lag, tabeller och slutspelsstatus."],
          ["statistics", "Statistik", "Topplistor och statistik för svenska spelare."]
        ].filter(([section]) => availableSections.has(section));

        overview.innerHTML = `
          <p class="directory-kicker">SVENSK ECL-BEVAKNING</p>
          <h2>${escapeHtml(season.title)}</h2>
          <p>${season.archiveEra === "classic"
            ? "Historisk ECL-data från SportsGamer och Supabase. De vyer som visas nedan är de delar vi har tillräckligt bra data för från säsongen."
            : "Välj vilken del av den svenska ECL-bevakningen du vill öppna."}</p>
          <div class="season-landing-grid" style="--season-landing-count:${Math.max(1, landingCards.length)}">
            ${landingCards.map(([section, label, text], index) => `
              <a class="season-landing-card" href="${seasonSectionRoute(seasonId, section)}">
                <span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(label)}</h3><p>${escapeHtml(text)}</p>
              </a>`).join("")}
          </div>
        `;
        overview.hidden = selectedSection !== "overview";
      }

      if (panels) {
        panels.className = "season-database-content";
        panels.id = "seasonDatabaseContent";
        panels.hidden = true;
        panels.innerHTML = `
          <p class="season-data-status" id="seasonDataStatus" aria-live="polite"></p>
          <section class="season-data-section" id="matches" data-season-section="matches">
            <div class="season-data-heading"><div><span>MATCHER</span><h3>Alla svenska matcher</h3></div></div>
            <div class="season-legacy-controls season-match-controls">
              <label><span>DIVISION</span><select id="seasonMatchDivision"><option value="all">Alla divisioner</option><option value="elite">Elite</option><option value="pro">Pro</option><option value="lite">Lite</option><option value="core">Core</option><option value="neo">Neo</option></select></label>
              <label><span>FAS</span><select id="seasonMatchStage"><option value="all">Alla faser</option><option value="regular">Gruppspel</option><option value="playoff">Slutspel</option></select></label>
              <label><span>SORTERA</span><select id="seasonMatchSort"><option value="newest">Nyaste först</option><option value="oldest">Äldsta först</option></select></label>
              <label class="season-match-search"><span>SÖK</span><input id="seasonMatchSearch" type="search" placeholder="Sök lag, grupp, fas eller datum…"></label>
            </div>
            <div class="season-summary-bar" id="seasonMatchSummary"></div>
            <div class="season-match-list" id="seasonMatchList"></div>
          </section>
          <section class="season-data-section" id="transfers" data-season-section="transfers">
            <div class="season-data-heading"><div><span>BYTEN</span><h3>Svenska ECL-byten</h3><p>Här visas svenska spelare som bytt ECL-lag inför eller under säsongen. Varje kort visar spelare, datum, tidigare lag och nytt lag.</p></div></div>
            <div class="season-transfer-toolbar"><div><span>ÖVERGÅNGAR</span><h4>Svenska spelare som bytt lag</h4></div><label><span>SÖK</span><input id="seasonTransferSearch" type="search" placeholder="Sök spelare eller lag…"></label></div>
            <div class="season-summary-bar" id="seasonTransferSummary"></div>
            <div class="season-transfer-list" id="seasonTransferList"></div>
          </section>
          <section class="season-data-section" id="teams" data-season-section="teams">
            <div class="season-data-heading"><div><span>LAG</span><h3>Svenska eHockey-lag</h3><p>Här samlas svenska lag i ${escapeHtml(season.title)} med division, tabellplacering, poäng och aktuell slutspelsstatus.</p></div></div>
            <div class="season-team-controls">
              <label><span>DIVISION</span><select id="seasonTeamDivision"><option value="all">Alla divisioner</option>${(season.divisions || []).map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")}</select></label>
              <label><span>SORTERA</span><select id="seasonTeamSort"><option value="division">Division + poäng</option><option value="name-asc">Namn A–Ö</option><option value="name-desc">Namn Ö–A</option><option value="players-desc">Flest spelare</option><option value="points-desc">Flest poäng</option><option value="ppg-desc">Bäst poängsnitt</option><option value="form-desc">Bäst form</option><option value="swedish-points-desc">Flest svenska poäng</option><option value="matches-desc">Flest matcher</option></select></label>
              <label class="season-team-controls__search"><span>SÖK</span><input id="seasonTeamSearch" type="search" placeholder="Sök lag eller division…"></label>
              <label class="season-team-toggle"><input id="seasonTeamPlayoffOnly" type="checkbox"><span>Endast slutspel</span></label>
              <label class="season-team-toggle"><input id="seasonTeamAliveOnly" type="checkbox"><span>Endast lag kvar</span></label>
            </div>
            <div class="season-summary-bar" id="seasonTeamSummary"></div>
            <div class="season-team-list" id="seasonTeamsList"></div>
          </section>
          <section class="season-data-section" id="statistics" data-season-section="statistics">
            <div class="season-data-heading"><div><span>STATISTIK</span><h3>${escapeHtml(season.title)} – svensk statistik</h3><p>Välj spelform, roll och division. Se topp tre svenska spelare och hela topplistan för den valda kategorin.</p></div></div>
            <div class="season-stats-tabs" aria-label="Statistikfilter">
              <div><span>SPELFORM</span><input id="seasonStatsStage" type="hidden" value="regular"><nav><button class="is-active" type="button" data-season-stats-stage="regular" aria-pressed="true">Grundserie</button><button type="button" data-season-stats-stage="playoff" aria-pressed="false">Slutspel</button></nav></div>
              <div><span>ROLL</span><input id="seasonStatsRole" type="hidden" value="skater"><nav><button class="is-active" type="button" data-season-stats-role="skater" aria-pressed="true">Spelare</button><button type="button" data-season-stats-role="defender" aria-pressed="false">Backar</button><button type="button" data-season-stats-role="goalie" aria-pressed="false">Målvakter</button></nav></div>
              <div><span>DIVISION</span><input id="seasonStatsDivision" type="hidden" value="${escapeHtml(season.divisions?.[0]?.id || "elite")}"><nav>${(season.divisions || []).map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-season-stats-division="${escapeHtml(item.id)}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(item.label)}</button>`).join("")}</nav></div>
            </div>
            <div class="season-stats-heading"><div id="seasonStatsListTitle"></div><label><span>SÖK</span><input id="seasonStatsSearch" type="search" placeholder="Sök spelare eller lag…"></label></div>
            <div class="season-summary-bar" id="seasonStatsSummary"></div>
            <div class="season-top3" id="seasonStatsTop3"></div>
            <div class="season-stat-table-host" id="seasonStatsTable"></div>
          </section>
        `;
      }

      loadSeasonDashboard(view, season, selectedSection);
    } else {
      if (overview) {
        overview.innerHTML = `
          <p class="directory-kicker">KOMMANDE SÄSONG</p>
          <h2>${escapeHtml(season.title)}</h2>
          <p>Säsongen är ännu inte igång. När data finns läggs samma svenska ECL-bevakning in här automatiskt.</p>
          <div class="season-upcoming-actions-v12840">
            <a href="#/ecl">Till ECL</a>
            <a href="#/ecl?view=archive">Öppna ECL-arkivet</a>
            <a href="#/sasong/ecl26spring">Senaste fulla ECL-data</a>
          </div>
        `;
        overview.hidden = false;
      }
      if (panels) panels.hidden = true;
      view.querySelectorAll(".season-subnav a:not([data-season-archive])").forEach((anchor) => {
        const href = String(anchor.getAttribute("href") || "");
        if (href !== "#overview") anchor.hidden = true;
      });
    }

    view
      .querySelectorAll(".season-subnav a")
      .forEach((anchor) => {
        if (anchor.dataset.seasonArchive === "true") {
          anchor.href = "#/ecl?view=archive";
          anchor.classList.remove("is-active");
          return;
        }

        const original =
          String(anchor.getAttribute("href") || "");

        const section = original.replace(/^#/, "") || "overview";
        const isAvailable = availableSections.has(section);
        anchor.hidden = !isAvailable;
        if (!isAvailable) {
          anchor.classList.remove("is-active");
          return;
        }

        anchor.href = seasonSectionRoute(seasonId, section);
        anchor.classList.toggle("is-active", section === selectedSection);
      });

    const seasonNav = view.querySelector(".season-subnav");
    if (seasonNav) {
      seasonNav.style.setProperty("--season-tab-count", String(availableSections.size + 1));
    }

    seasonNav
      ?.addEventListener("click", (event) => {
        const anchor =
          event.target.closest("a[href]");

        if (!anchor) return;

        /*
         * Hash-route byts normalt. Om användaren klickar
         * på den redan aktiva sektionen behöver vi ändå
         * scrolla till rätt block.
         */
        if (
          anchor.getAttribute("href") ===
          location.hash
        ) {
          event.preventDefault();

          document
            .querySelector(
              `#${CSS.escape(selectedSection)}`
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        }
      });

    document.body.dataset.seasonId =
      seasonId;

    window.dispatchEvent(
      new CustomEvent(
        "seh:season-ready",
        {
          detail: {
            id: seasonId
          }
        }
      )
    );

    if (selectedSection !== "overview") {
      requestAnimationFrame(() => {
        view
          .querySelector(
            `#${CSS.escape(selectedSection)}`
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      });
    }
  }

  function loadRouteController(route, token) {
    const init = routeControllers[route.key];

    if (!init) {
      return Promise.resolve();
    }

    try {
      /*
       * Alla controllers ligger nu i denna app.js.
       * Ingen extra JavaScript-fil laddas över nätverket.
       */
      init();
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function ensureGlobalFooter(view) {
    if (!view) return;

    let footer = view.querySelector(":scope > .directory-footer:last-child");
    if (!footer) {
      footer = document.createElement("footer");
      footer.className = "directory-footer site-global-footer";
      footer.innerHTML = `<div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div>`;
      view.append(footer);
    } else {
      footer.classList.add("site-global-footer");
    }

    let footerInner = footer.querySelector(":scope > div");
    if (!footerInner) {
      footerInner = document.createElement("div");
      footerInner.innerHTML = `<strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span>`;
      footer.replaceChildren(footerInner);
    }

    if (!footerInner.querySelector(".directory-footer__support")) {
      const supportLink = document.createElement("a");
      supportLink.className = "directory-footer__support";
      supportLink.href = "#/stod";
      supportLink.textContent = "Svensk eHockey drivs ideellt · Stöd sidan →";
      footerInner.append(supportLink);
    }
  }

  async function render() {
    const token = ++renderToken;
    const route = parseRoute();

    window.SEH_ROUTE = route;

    const bodyClass =
      routeBodyClasses[route.key] ||
      "directory-page";

    document.body.className =
      `${bodyClass} spa-route-body`.trim();

    document.title =
      titleFor(route);

    document.body.replaceChildren();

    const header =
      document.createElement("header");

    header.className =
      "seh-header";

    header.innerHTML =
      headerHtml(route);

    const view =
      document.createElement("div");

    view.id =
      "spaRouteView";

    view.dataset.route =
      route.key;

    view.innerHTML =
      route.key === "notFound"
        ? notFoundHtml()
        : (
          templates[route.key] ||
          notFoundHtml()
        );

    document.body.append(
      header,
      view
    );

    ensureGlobalFooter(view);

    bindHeader(
      header,
      route
    );

    if (route.key === "ecl" && route.query.get("view") === "archive") {
      requestAnimationFrame(() => {
        view.querySelector("#eclArchive")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (route.key === "season") {
      initializeSeasonView(
        view,
        route
      );
    }

    if (
      route.key !== "season" ||
      !route.query.get("section")
    ) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
      });
    }

    try {
      await loadRouteController(
        route,
        token
      );

      if (token === renderToken) {
        ensureGlobalFooter(view);
      }
    } catch (error) {
      if (token !== renderToken) {
        return;
      }

      console.error(error);

      view.insertAdjacentHTML(
        "afterbegin",
        `
          <section class="notice notice-error">
            <h2>Kunde inte starta sidan</h2>
            <p>${escapeHtml(error.message)}</p>
          </section>
        `
      );
    }

    SEH_renderAnalyticsConsent();
    SEH_trackPageView();
  }


  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href]");
    if (!anchor) return;

    const href = String(anchor.getAttribute("href") || "");

    if (
      href.startsWith("#") &&
      !href.startsWith("#/") &&
      href.length > 1
    ) {
      const targetId = href.slice(1);
      const target = document.getElementById(targetId);

      if (target) {
        event.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  });

  window.addEventListener(
    "hashchange",
    render
  );

  window.addEventListener(
    "DOMContentLoaded",
    async () => {
      const oauthReturn = localStorage.getItem("seh_oauth_return");
      if (oauthReturn) {
        try {
          await sehInitializeAuth();
          if (sehAuthState.session?.user) {
            localStorage.removeItem("seh_oauth_return");
            history.replaceState(null, "", `${location.pathname}${location.search}${oauthReturn}`);
          }
        } catch (error) {
          console.warn("Kunde inte återgå till Free Agents efter Discord-inloggning", error);
        }
      }
      if (!location.hash) {
        history.replaceState(
          null,
          "",
          `${location.pathname}${
            location.search
          }#/`
        );
      }

      render();
    }
  );
})();
