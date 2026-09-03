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
  
    const APP_BUILD = "2026-08-14-v89-team-fullwidth-hero";
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
      allNameCount: document.querySelector("#allNameCount"),
      appearanceCount: document.querySelector("#appearanceCount"),
      divisionCount: document.querySelector("#divisionCount"),
      matchCount: document.querySelector("#matchCount"),
      winCount: document.querySelector("#winCount"),
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
      return [
        tournament.seasonLabel,
        division ? divisionDisplay(division).toUpperCase() : competitionDisplay(tournament.competitionCode)
      ].join(" · ");
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
        String(index + 1).padStart(2, "0");
  
      renderLogo(fragment.querySelector(".directory-team-card__logo"), team);
  
      const name = fragment.querySelector(".directory-team-card__name");
      name.textContent = displayName;
      name.title = displayName;
  
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
      elements.allNameCount.textContent = formatNumber(allNames.size);
      elements.appearanceCount.textContent = formatNumber(tournaments.length);
      elements.divisionCount.textContent = formatNumber(divisions.size);
      elements.matchCount.textContent = formatNumber(sum(tournaments, "gamesPlayed"));
      elements.winCount.textContent = formatNumber(sum(tournaments, "wins"));
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
    elements.reloadButton.addEventListener("click", load);
  
    load();
  })();
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
      overviewSkaters: document.querySelector("#overviewSkaters")
    };
  
    const state = {
      players: [],
      filtered: [],
      page: 1,
      showAll: false
    };
  
    const APP_BUILD = "2026-07-30-player-directory-v24.1";
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
  
    async function fetchDirectory() {
      return fetchPages("v_ehockey_swedish_player_directory_central_v1", {
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
        image: sportsGamerId
          ? `players/${sportsGamerId}.jpg`
          : clean(row.player_image) || "players/1DEFAULTBILDID.jpg",
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
        !["SPORTSGAMER", "MAIN", "DIVISION A"].includes(clean(label).toUpperCase())
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
  
    function updateOverview() {
      const goalies = state.players.filter((player) => player.role === "goalie").length;
      elements.overviewPlayers.textContent = state.players.length.toLocaleString("sv-SE");
      elements.overviewGoalies.textContent = goalies.toLocaleString("sv-SE");
      elements.overviewSkaters.textContent = (state.players.length - goalies).toLocaleString("sv-SE");
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
      return `<img src="${escapeHtml(player.image)}" alt="${escapeHtml(player.name)}" loading="lazy" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='players/1DEFAULTBILDID.jpg'}">`;
    }
  
    function playerCard(player) {
      const link = document.createElement("a");
      link.className = "players-card";
      link.href = SEH_playerProfileUrl(player.key, player.name);
      link.innerHTML = `
        <div class="players-card__head">
          <div><h3>${escapeHtml(player.name)}</h3><span>${player.role === "goalie" ? "MÅLVAKT" : "UTESPELARE"}</span></div>
          <b>${player.clubCount} ${player.clubCount === 1 ? "klubb" : "klubbar"}</b>
        </div>
        <div class="players-card__body">
          <div class="players-card__avatar">${avatarMarkup(player)}</div>
          <div>
            <strong>${statLine(player)}</strong>
            <p><span>${player.games.toLocaleString("sv-SE")} matcher</span><span>${player.seasons.toLocaleString("sv-SE")} säsonger</span></p>
          </div>
        </div>
        <div class="players-card__foot">
          <p><b>Senast:</b> ${escapeHtml([player.latestSeason, player.latestTeam].filter(Boolean).join(" · ") || "–")}</p>
          <p>${escapeHtml(divisionLabels(player).join(", ") || "–")}</p>
        </div>
      `;
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
        return b.games - a.games || b.points - a.points;
      });
    }
  
    function render() {
      applyFilters();
      const compact = elements.compact.checked;
      const pageSize = compact ? 50 : 21;
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
  const routeValue = slug || String(playerKey || "").trim();
  const query =
    Number.isInteger(Number(fromTeam)) && Number(fromTeam) > 0
      ? `?fromTeam=${encodeURIComponent(Number(fromTeam))}`
      : "";

  return `#/spelare/${encodeURIComponent(routeValue)}${query}`;
}

function SEH_initPlayer() {
  /* ======================================================
     ROUTE CONTROLLER: player
     Ursprungligen separat fil, nu inbyggd i app.js.
     ====================================================== */
  (() => {
    "use strict";
  
    const APP_BUILD = "2026-08-19-v88-player-merits-cache";
    const config = window.EHOCKEY_CONFIG || {};
    const elements = {
      backLink: document.querySelector("#backLink"),
      reloadButton: document.querySelector("#reloadButton"),
      setupNotice: document.querySelector("#setupNotice"),
      errorNotice: document.querySelector("#errorNotice"),
      errorMessage: document.querySelector("#errorMessage"),
      loadingState: document.querySelector("#loadingState"),
      playerPage: document.querySelector("#playerPage"),
      playerAvatar: document.querySelector("#playerAvatar"),

      playerFlag: document.querySelector("#playerFlag"),

      playerName: document.querySelector("#playerName"),

      playerCurrentTeam: document.querySelector("#playerCurrentTeam"),

      playerMeta: document.querySelector("#playerMeta"),

      playerCompetitions: document.querySelector("#playerCompetitions"),

      playerBio: document.querySelector("#playerBio"),

      playerLinks: document.querySelector("#playerLinks"),
      playerMeritsSection: document.querySelector("#playerMeritsSection"),
      teamMeritsList: document.querySelector("#teamMeritsList"),
      personalMeritsList: document.querySelector("#personalMeritsList"),
      tournamentCount: document.querySelector("#tournamentCount"),
      teamCount: document.querySelector("#teamCount"),
      careerGames: document.querySelector("#careerGames"),
      headlineStats: document.querySelector(".player-editorial-stats"),
      careerPoints: document.querySelector("#careerPoints"),
      careerGoals: document.querySelector("#careerGoals"),
      careerAssists: document.querySelector("#careerAssists"),
      skaterCareerStats: document.querySelector("#skaterCareerStats"),
      goalieCareerStats: document.querySelector("#goalieCareerStats"),
      playerTeamsSection: document.querySelector("#playerTeamsSection"),
      playerTeamsGrid: document.querySelector("#playerTeamsGrid"),
      historyCompetitionFilters: document.querySelector("#historyCompetitionFilters"),
      historyCount: document.querySelector("#historyCount"),
      historyTableBody: document.querySelector("#historyTableBody")
    };

    let historyCompetitionFilter = "ALL";
    let currentHistoryRows = [];
  
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
  
    function localPlayerImageUrl(row) {
      const sportsGamerId = String(row.externalUrl || "")
        .match(/\/players\/(\d+)/i)?.[1];
      if (sportsGamerId) return `players/${sportsGamerId}.jpg`;
      return row.image || "players/1DEFAULTBILDID.jpg";
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
          "v_ehockey_swedish_player_directory_central_v1",
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
      return fetchJson("v_ehockey_swedish_player_directory_central_v1", params);
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
        shotsAgainst: number(row.total_goalie_shots_against),
        goalsAllowed: number(row.total_goalie_goals_allowed),
        savePercentage: nullableNumber(row.total_goalie_save_percentage),
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
          image.src = "players/1DEFAULTBILDID.jpg";
          return;
        }
        elements.playerAvatar.replaceChildren();
        elements.playerAvatar.textContent = initials(row.name);
      });
      elements.playerAvatar.append(image);
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
  
    function normalizedClubKey(row) {
      const name = String(row.teamCurrentName || row.teamName || "").trim();
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
      if (row.teamId) return `team:${row.teamId}`;
      if (row.teamExternalId) return `external:${String(row.teamExternalId).trim().toLowerCase()}`;
      return `name:${String(row.teamName || row.teamCurrentName || "okänt lag")
        .trim().toLocaleLowerCase("sv-SE")}`;
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
      merged.shotsAgainst = Math.max(
        maximum(group, "shotsAgainst"),
        merged.regularShotsAgainst + merged.playoffShotsAgainst
      );
      merged.goalsAllowed = Math.max(
        maximum(group, "goalsAllowed"),
        merged.regularGoalsAllowed + merged.playoffGoalsAllowed
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
        const seasonMatch = source.match(/(?:season|ecl)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
        const modernMatch = source.match(/(?:ecl\s*)?'?([0-9]{2})'?\s*[:\-]?\s*(spring|winter)/i);

        if (modernMatch) {
          return `ECL ${modernMatch[1]} ${modernMatch[2][0].toUpperCase()}${modernMatch[2].slice(1).toLowerCase()}`;
        }

        if (seasonMatch) {
          return `ECL ${seasonMatch[1]}`;
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

    function renderHistoryProfileBio({
      currentName,
      earliest,
      latest,
      bestOffense,
      tournamentCount,
      clubCount,
      primaryRole,
      careerGames
    }) {
      elements.playerBio.replaceChildren();

      const first = document.createElement("p");
      first.append(
        document.createTextNode(
          `${currentName} är en svensk eHockey-spelare som gjorde sitt första registrerade framträdande i ${bioSeasonLabel(earliest)} för `
        )
      );
      appendBioTeamLink(first, earliest);
      first.append(document.createTextNode("."));

      const second = document.createElement("p");
      second.append(
        document.createTextNode(
          `Totalt finns ${tournamentCount} säsongsrader i historiken och ${clubCount} olika lag. Senast syns spelaren i ${bioSeasonLabel(latest)} för `
        )
      );
      appendBioTeamLink(second, latest, "sitt senaste lag");
      second.append(document.createTextNode("."));

      const third = document.createElement("p");
      third.textContent =
        `Profilen är främst noterad som ${primaryRole.toLocaleLowerCase("sv-SE")} med ${careerGames} ${matchWord(careerGames)} totalt.`;

      elements.playerBio.append(first, second, third);

      if (bestOffense && number(bestOffense.points) > 0) {
        const fourth = document.createElement("p");
        fourth.append(
          document.createTextNode(
            `Bästa offensiva raden är ${formatInteger(bestOffense.points, "0")} poäng i ${bioSeasonLabel(bestOffense)} för `
          )
        );
        appendBioTeamLink(fourth, bestOffense);
        fourth.append(document.createTextNode("."));
        elements.playerBio.append(fourth);
      }
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
        return `${base} - ${division}`;
      }

      return base;
    }

    function teamMeritText(placement, tournament, teamName) {
      if (placement === 1) return `Mästare i ${tournament} med ${teamName}.`;
      if (placement === 2) return `Finalist i ${tournament} med ${teamName}.`;
      return `Brons i ${tournament} med ${teamName}.`;
    }

    function createMeritRow(icon, text, type = "") {
      const row = document.createElement("div");
      row.className = "player-merit-row";

      const badge = document.createElement("span");
      badge.className = [
        "player-merit-icon",
        type ? `player-merit-icon--${type}` : ""
      ].filter(Boolean).join(" ");
      badge.textContent = icon;

      const copy = document.createElement("p");
      copy.textContent = text;

      row.append(badge, copy);
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
        container.append(
          createMeritRow(item.icon, item.text, item.type || "")
        );
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

    function buildTeamMerits(meritRows) {
      const seen = new Set();

      return meritRows
        .map((row) => {
          const placement = nullableNumber(row?.placement);
          if (![1, 2, 3].includes(placement)) return null;

          const tournament = meritTournamentLabel(null, row);
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
            text: teamMeritText(placement, tournament, teamName),
            sortValue: meritSortValue(row)
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.sortValue - a.sortValue);
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

    function buildPersonalMerits(profileRows, personalMeritRows) {
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
            text: meritText,
            sortValue: Number(row?.league_id ?? row?.sports_gamer_league_id) || 0
          };
        })
        .filter(Boolean);

      const highestLevel = highestEclLevel(profileRows);

      if (highestLevel) {
        items.push({
          icon: "N",
          type: "level",
          text: `Högsta ECL-nivå i historiken: ${highestLevel}.`,
          sortValue: -1
        });
      }

      return items.sort((a, b) => {
        if (a.type === "level") return 1;
        if (b.type === "level") return -1;
        return number(b.sortValue) - number(a.sortValue);
      });
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

      const [meritRows, personalMeritRows] = await Promise.all([
        meritsPromise,
        personalMeritsPromise
      ]);

      console.info(
        `Svensk eHockey ${APP_BUILD}: meritkoppling`,
        {
          playerKey,
          sportsGamerPlayerId,
          teamMerits: meritRows.length,
          personalMerits: personalMeritRows.length
        }
      );

      return { meritRows, personalMeritRows };
    }

    function renderPlayerMerits(
      profileRows,
      meritRows = [],
      personalMeritRows = []
    ) {
      const teamMerits = buildTeamMerits(meritRows);
      const personalMerits = buildPersonalMerits(profileRows, personalMeritRows);

      renderMeritList(
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
        data.personalMeritRows
      );
    }


    function normalizedPlayerTeamName(value) {
      return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sv-SE")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    }


    function teamNameAliases(row) {
      return [
        row?.teamName,
        row?.teamCurrentName
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
    }

    function buildLocalTeamNameIndex(teamRows = []) {
      const index = new Map();

      const add = (name, teamRow) => {
        const key = normalizedPlayerTeamName(name);
        if (!key || index.has(key)) return;
        index.set(key, teamRow);
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

        let match = null;

        for (const name of teamNameAliases(row)) {
          const key = normalizedPlayerTeamName(name);
          if (key && byName.has(key)) {
            match = byName.get(key);
            break;
          }
        }

        if (!match?.team_id) {
          return row;
        }

        return {
          ...row,
          teamId: Number(match.team_id) || null,
          teamIsLinkable: true,
          teamCurrentName:
            String(match.current_name || row.teamCurrentName || row.teamName || "").trim(),
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
        metadata?.current_name ||
        row.teamCurrentName ||
        row.teamName ||
        ""
      ).trim();
    }

    function buildPlayerTeams(profileRows, teamRows = []) {
      const metadataById = new Map(
        teamRows.map((row) => [Number(row.team_id), row])
      );
      const grouped = new Map();

      for (const row of profileRows) {
        const displayName = playerTeamDisplayName(row, metadataById);
        const normalizedName = normalizedPlayerTeamName(displayName);

        if (!normalizedName) continue;

        const key = `name:${normalizedName}`;
        const sortValue = tournamentChronologyValue(row);
        const rowTeamId =
          Number.isInteger(Number(row.teamId)) && Number(row.teamId) > 0
            ? Number(row.teamId)
            : null;

        if (!grouped.has(key)) {
          grouped.set(key, {
            teamId: null,
            teamIds: new Set(),
            teamName: displayName || "Okänt lag",
            tournaments: new Set(),
            competitions: new Set(),
            latestSort: sortValue,
            latestTeamId: rowTeamId
          });
        }

        const team = grouped.get(key);

        if (rowTeamId) {
          team.teamIds.add(rowTeamId);

          if (metadataById.has(rowTeamId) && !team.teamId) {
            // Prefer a real local Svensk eHockey team id for the card link.
            team.teamId = rowTeamId;
          }
        }

        team.tournaments.add(
          [
            row.competitionCode,
            row.leagueId,
            row.seasonLabel
          ].join("|")
        );

        if (row.competitionCode) {
          team.competitions.add(String(row.competitionCode));
        }

        if (sortValue > team.latestSort) {
          team.latestSort = sortValue;
          team.latestTeamId = rowTeamId;
          team.teamName = displayName || team.teamName;
        }
      }

      return [...grouped.values()]
        .map((team) => {
          // If no ID was confirmed through v_local_team_list, use the
          // newest historical ID as fallback so the card remains clickable.
          const linkTeamId =
            team.teamId ||
            team.latestTeamId ||
            [...team.teamIds][0] ||
            null;

          const metadata = linkTeamId
            ? metadataById.get(Number(linkTeamId))
            : null;

          return {
            ...team,
            teamId: linkTeamId,
            teamName: metadata?.current_name || team.teamName,
            logoUrl:
              metadata?.logo_url ||
              metadata?.logo_path ||
              "",
            tournamentCount: team.tournaments.size,
            competitionList: [...team.competitions]
          };
        })
        .sort((a, b) =>
          b.tournamentCount - a.tournamentCount ||
          b.latestSort - a.latestSort ||
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

      const fragment = document.createDocumentFragment();

      for (const team of teams) {
        const card = document.createElement(team.teamId ? "a" : "article");
        card.className = "player-team-card";
        if (team.teamId) card.href = teamUrl(team.teamId);

        const logo = document.createElement("span");
        logo.className = "player-team-card__logo";

        {
          const image = document.createElement("img");
          image.alt = "";
          image.loading = "lazy";
          logo.append(image);
          applyTeamLogoWithFallback(
            image,
            team.logoUrl,
            team.teamName,
            logo
          );
        }

        const copy = document.createElement("span");
        copy.className = "player-team-card__copy";

        const name = document.createElement("strong");
        name.textContent = team.teamName;

        const meta = document.createElement("small");
        const seasons = `${team.tournamentCount} ${team.tournamentCount === 1 ? "säsong" : "säsonger"}`;
        meta.textContent = team.competitionList.length
          ? `${seasons} · ${team.competitionList.join(" · ")}`
          : seasons;

        copy.append(name, meta);
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
      const teamIds = [...new Set(
        profileRows.map((row) => Number(row.teamId)).filter((id) => Number.isInteger(id) && id > 0)
      )];

      renderPlayerTeams(profileRows);

      /*
       * Historikraderna har redan försökt teamlogos/<lagnamn>.
       * Om inga team_id finns behöver vi inte Supabase-metadata,
       * men lokala loggor ska alltså ändå ha renderats.
       */
      if (!teamIds.length) return;

      const params = new URLSearchParams({
        select: "team_id,current_name,logo_path,logo_url",
        team_id: `in.(${teamIds.join(",")})`
      });

      try {
        const teamRows = await fetchAllJson("v_local_team_list", params);
        renderPlayerTeams(profileRows, teamRows);

        const teamMeta = new Map(
          teamRows.map((row) => [String(row.team_id), row])
        );

        document.querySelectorAll("[data-team-logo-for]").forEach((node) => {
          const meta = teamMeta.get(String(node.dataset.teamLogoFor || ""));
          const logoUrl = meta?.logo_url || meta?.logo_path || "";
          const historicalTeamName =
            node.dataset.teamNameForLogo || "";

          const teamName =
            historicalTeamName ||
            meta?.current_name ||
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
        teamLogo.dataset.teamLogoFor = row.teamId ? String(row.teamId) : "";
        teamLogo.dataset.teamNameForLogo = row.teamCurrentName || row.teamName || "";

        SEH_renderTeamLogo(
          teamLogo,
          [row.resolvedLogoUrl || ""],
          teamLogo.dataset.teamNameForLogo,
          `${teamLogo.dataset.teamNameForLogo} logotyp`
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

        const role = row.goalieGames > row.skaterGames ? "G" : row.position || "Utespelare";
        const values = [
          row.division || "–",
          role,
          formatInteger(row.appearanceGames, "0"),
          formatInteger(row.goals, "0"),
          formatInteger(row.assists, "0"),
          formatInteger(row.points, "0"),
          row.goalieGames ? formatSavePercentage(row.savePercentage) : "–",
          row.goalieGames ? formatDecimal(row.gaa, 2) : "–"
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
        td.colSpan = 10;
        td.className = "player-history-empty";
        td.textContent = "Inga turneringar matchar filtret.";
        tr.append(td);
        elements.historyTableBody.append(tr);
      }
    }

    function render(rows) {
      const latest = [...rows].sort(compareHistoryRows)[0];
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

      const chronologicalRows = [...rows].sort((a, b) =>
        tournamentChronologyValue(a) - tournamentChronologyValue(b) ||
        number(a.leagueId) - number(b.leagueId)
      );

      const earliest = chronologicalRows[0] || latest;
      const bestOffense = bestOffensiveRow(rows);
      const bestGoalie = bestGoalieRow(rows);

      elements.playerCurrentTeam.replaceChildren();
      if (latest.teamId) {
        const currentTeamLink = document.createElement("a");
        currentTeamLink.href = teamUrl(latest.teamId);
        currentTeamLink.textContent = latest.teamName || "Okänt lag";
        elements.playerCurrentTeam.append(currentTeamLink);
      } else {
        elements.playerCurrentTeam.textContent =
          latest.teamName || "Okänt lag";
      }

      elements.playerMeta.textContent = [
        primaryRole,
        `${tournamentCount} ${seasonWord(tournamentCount)}`,
        `${careerGames} ${matchWord(careerGames)}`
      ].join(" • ");

      elements.playerCompetitions.textContent =
        competitionLine(rows) || "Turneringshistorik";

      /* Visa direkt egenhistorikens personliga meriter. */
      renderPlayerMerits(rows);

      renderHistoryProfileBio({
        currentName,
        earliest,
        latest,
        bestOffense,
        tournamentCount,
        clubCount,
        primaryRole,
        careerGames
      });

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
  
      currentHistoryRows = [...rows];
      renderPlayerHistoryFilters(currentHistoryRows);
      renderPlayerHistoryTable(currentHistoryRows);
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

      elements.playerCurrentTeam.textContent =
        directoryRow.latest_team || "Okänt lag";

      elements.playerMeta.textContent = [
        standaloneRole,
        `${tournamentCount} ${seasonWord(tournamentCount)}`,
        `${careerGames} ${matchWord(careerGames)}`
      ].join(" • ");

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
  
      elements.historyTableBody.replaceChildren();
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 10;
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
      let playerKey = playerRouteValue;

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
        playerKey = await resolvePlayerRouteValue(playerRouteValue);

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
  
    const APP_BUILD = "2026-08-13-v73-alltime-show-all";
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
        totalGoalieSaves: number(row.total_goalie_saves),
        totalGoalieShotsAgainst: number(row.total_goalie_shots_against),
        totalGoalieGoalsAllowed: number(row.total_goalie_goals_allowed),
        totalGoalieSavePercentage: nullableNumber(row.total_goalie_save_percentage),
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
  
    function localPlayerImageUrl(player) {
      const sportsGamerId = String(player.sportsGamerPlayerUrl || "")
        .match(/\/players\/(\d+)/i)?.[1];
      if (sportsGamerId) return `players/${sportsGamerId}.jpg`;
      return player.playerImage || "players/1DEFAULTBILDID.jpg";
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
        const goalieShots = sum("total_goalie_shots_against");
        const goalieGoalsAllowed = sum("total_goalie_goals_allowed");
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
      const gold = eligible.filter(
        (row) => String(row.playoffStatusCode || "").toUpperCase() === "CHAMPION"
      ).length;
      const silver = eligible.filter((row) =>
        ["RUNNER_UP", "FINALIST_UNDECIDED"].includes(
          String(row.playoffStatusCode || "").toUpperCase()
        )
      ).length;
      const bronze = eligible.filter(
        (row) => String(row.playoffStatusCode || "").toUpperCase() === "THIRD_PLACE"
      ).length;

      const badges = [
        gold ? { icon: "🏆", label: `${gold} guld`, place: "gold" } : null,
        silver ? { icon: "🏆", label: `${silver} silver`, place: "silver" } : null,
        bronze ? { icon: "🏆", label: `${bronze} brons`, place: "bronze" } : null
      ].filter(Boolean);

      elements.historyBadges.hidden = badges.length === 0;

      for (const badgeData of badges) {
        const badge = document.createElement("span");
        badge.className = `history-badge history-badge--${badgeData.place}`;
        badge.innerHTML = `<strong>${badgeData.icon}</strong><small>${badgeData.label}</small>`;
        elements.historyBadges.append(badge);
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
      const goalDiff = sumKnown(state.tournaments, effectiveGoalDiff) || 0;
      const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
      const latest = state.tournaments[0];
      const best = bestEclTournament();
      const first = [...state.tournaments].sort(
        (a, b) =>
          tournamentChronologyValue(a) -
          tournamentChronologyValue(b) ||
          Number(a.leagueId || 0) - Number(b.leagueId || 0)
      )[0];
  
      const sentences = [
        first
          ? `${state.team.currentName} syns första gången i den importerade historiken i ${compactSeasonLabel(first)}.`
          : `${state.team.currentName} finns i den importerade eHockeyhistoriken.`,
        `Laget har deltagit i ${state.tournaments.length} registrerade turneringar och spelat ${games} matcher med ${wins} vinster och ${losses} förluster (${winRate} %).`,
        `Den sammanlagda målskillnaden är ${formatSignedInteger(goalDiff, "0")}.`,
        best
          ? `Högsta ECL-nivån är ${best.division}, nådd i ${compactSeasonLabel(best)}.`
          : "",
        latest && latest.nameUsed !== state.team.currentName
          ? `Senast spelade laget under namnet ${latest.nameUsed}.`
          : ""
      ].filter(Boolean);
  
      elements.clubProfileText.textContent = sentences.join(" ");
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
      elements.divisionCurve.replaceChildren();
  
      if (!rows.length) {
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
        THIRD_PLACE: 3,
        FOURTH_PLACE: 4,
        SEMIFINAL: 5
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
        "THIRD_PLACE",
        "FOURTH_PLACE",
        "SEMIFINAL"
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
  
  
    function createHonourCard(tournament) {
      const article =
        document.createElement("article");
  
      article.className =
        `team-honour-card ` +
        `team-honour-card--${playoffBadgeClass(
          tournament.playoffStatusCode
        )}`;
  
      const status =
        document.createElement("span");
  
      status.className =
        "team-honour-status";
  
      status.textContent =
        tournament.playoffStatus;
  
      const title = document.createElement("a");
      title.className = "history-honour-link";
      title.href = tournamentPageUrl(tournament);
      title.textContent = seasonTitle(tournament);
  
      const meta =
        document.createElement("small");
  
      const finalRecord =
        finalSeriesRecord(tournament);
  
      meta.textContent = [
        competitionLabel(tournament),
        tournament.division,
        finalRecord
          ? `Final ${finalRecord}`
          : "",
        formatPeriod(
          tournament.startDate,
          tournament.endDate
        )
      ]
        .filter(Boolean)
        .join(" · ");
  
      article.append(
        status,
        title,
        meta
      );
  
      return article;
    }
  
  
    function renderHonours() {
      const honours = honourTournaments();
      const honourEligibleTournaments = state.tournaments.filter(
        isHonourEligibleTournament
      );
      const champions = honourEligibleTournaments.filter(
        (row) => row.playoffStatusCode === "CHAMPION"
      ).length;
      const finals = honourEligibleTournaments.filter(isFinalAppearance).length;
      const bronze = honourEligibleTournaments.filter(
        (row) => row.playoffStatusCode === "THIRD_PLACE"
      ).length;
  
      elements.championshipsCount.textContent = formatInteger(champions, "0");
      elements.finalsCount.textContent = formatInteger(finals, "0");
      elements.bronzeCount.textContent = formatInteger(bronze, "0");
      elements.teamHonoursList.replaceChildren();
  
      if (!honours.length) {
        elements.teamHonoursSection.hidden = true;
        elements.teamHonoursCount.textContent = "";
        return;
      }
  
      const fragment = document.createDocumentFragment();
      for (const tournament of honours) {
        fragment.append(createHonourCard(tournament));
      }
      elements.teamHonoursList.append(fragment);
      elements.teamHonoursCount.textContent =
        `${honours.length.toLocaleString("sv-SE")} meriter`;
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
      image.addEventListener("error", () => {
        if (!image.dataset.fallback) {
          image.dataset.fallback = "1";
          image.src = "players/1DEFAULTBILDID.jpg";
          return;
        }
        avatar.replaceChildren();
        avatar.textContent = initials(player.displayGamertag);
      });
      avatar.append(image);
  
      return avatar;
    }
  
  
    function createAllTimePlayerCard(player) {
      const link = document.createElement("a");
      link.className = "history-player-card";
      link.href = playerPageUrl(player.playerKey, player.displayGamertag);
  
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
const SEH_TEAM_LOGO_FILES = (
  window.SEH_TEAM_LOGO_FILES &&
  typeof window.SEH_TEAM_LOGO_FILES === "object"
)
  ? window.SEH_TEAM_LOGO_FILES
  : {};
const SEH_HAS_TEAM_LOGO_MANIFEST =
  Object.keys(SEH_TEAM_LOGO_FILES).length > 0;

function SEH_resolveLocalTeamLogo(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  const match = url.match(/^(?:\.\/)?teamlogos\/([^?#]+)(?:[?#].*)?$/i);
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

  const APP_BUILD = "2026-08-15-hash-spa-v98-season-menu-hidden";

  const templates = {"home": "<main class=\"directory-shell portal-shell\">\n<section class=\"portal-hero\">\n<div class=\"portal-hero__copy\">\n<p class=\"directory-kicker\">SVENSK eHOCKEY / LIVE DATA</p>\n<h1>All svensk<br/>eHockey.<br/><em>En plats.</em></h1>\n<p>\n          Svensk eHockey är en samlingsplats för statistik och information om svenska spelare och lag inom eHockey. Syftet med sidan är att göra det enklare att följa den svenska eHockeyscenen och samla information som annars finns utspridd på flera olika platser.\n        </p>\n<p>\n          Här kan du följa svenska spelares och lags utveckling i ECL, se matchresultat, spelarstatistik, lagbyten och historik från tidigare säsonger. Sidan samlar även information om svenska lag genom åren och ger en tydlig överblick över vilka spelare som representerat lagen.\n        </p>\n<p>\n          Svensk eHockey arrangerar även den egna turneringen Svenska eHockey Cupen (SEC). Turneringen har en egen avdelning på sidan där samtliga upplagor av SEC finns samlade. Där går det att se deltagande lag, tabeller, matchresultat och statistik för både lag och spelare från varje turnering.\n        </p>\n<p>\n          Målet är att samla, bevara och göra den svenska eHockeyhistoriken mer tillgänglig – från enskilda spelare och lag till ECL och Svenska eHockey Cupen.\n        </p>\n<div class=\"portal-actions\">\n<a class=\"portal-button portal-button--primary\" href=\"#/laghistoria\">Utforska laghistoriken</a>\n<a class=\"portal-button\" href=\"#/spelare\">Hitta spelare</a>\n</div>\n</div>\n<div aria-hidden=\"true\" class=\"portal-mark\">\n<img alt=\"\" src=\"assets/SeHlogga.png\"/>\n<span>SVENSK<br/>eHOCKEY</span>\n</div>\n</section>\n<section aria-labelledby=\"exploreTitle\" class=\"portal-section\">\n<div class=\"portal-section__heading\">\n<div>\n<p class=\"directory-kicker\">UTFORSKA</p>\n<h2 id=\"exploreTitle\">Allt samlat på ett ställe</h2>\n</div>\n<p>Välj område och gå direkt till aktuell datavy.</p>\n</div>\n<div class=\"portal-grid\">\n<a href=\"#/nyheter\"><span>01</span><h3>Nyheter</h3><p>Uppdateringar om sidan, databasen och svensk eHockey.</p></a>\n<a href=\"#/spelare\"><span>02</span><h3>Spelare</h3><p>Sök bland spelarna i databasen och öppna kompletta profiler.</p></a>\n<a href=\"#/laghistoria\"><span>03</span><h3>Laghistoria</h3><p>Organisationer, historiska namn, säsonger och lagstatistik.</p></a>\n<a href=\"#/sasong/ecl26spring\"><span>04</span><h3>Säsonger</h3><p>Översikt, matcher, byten, lag och statistik per ECL-säsong.</p></a>\n<a href=\"https://www.svenskehockey.se/SEC/\"><span>05</span><h3>SEC</h3><p>Svenska eHockey Cupens egna turneringssidor.</p></a>\n</div>\n</section>\n</main>\n<footer class=\"directory-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>", "news": "\u003cmain class=\"directory-shell news-page-shell\"\u003e\n\u003csection class=\"news-page-hero\"\u003e\n\u003cdiv\u003e\n\u003cp class=\"directory-kicker\"\u003eSVENSK eHOCKEY / REDAKTIONEN\u003c/p\u003e\n\u003ch1\u003eNyheter\u003c/h1\u003e\n\u003cp\u003eArtiklar, uppdateringar och notiser från den svenska eHockeyscenen.\u003c/p\u003e\n\u003c/div\u003e\n\u003caside class=\"news-page-tools\" aria-label=\"Filtrera nyheter\"\u003e\n\u003clabel for=\"newsSearch\"\u003eSÖK I NYHETER\u003c/label\u003e\n\u003cinput id=\"newsSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Sök titel, text eller tagg…\"\u003e\n\u003cdiv class=\"news-tag-row\" id=\"newsTagFilters\"\u003e\u003c/div\u003e\n\u003csmall id=\"newsResultText\"\u003e\u003c/small\u003e\n\u003c/aside\u003e\n\u003c/section\u003e\n\u003csection class=\"news-featured\" id=\"featuredNews\" aria-label=\"Senaste huvudnyhet\"\u003e\u003c/section\u003e\n\u003csection class=\"news-card-grid\" id=\"newsGrid\" aria-label=\"Fler nyheter\"\u003e\u003c/section\u003e\n\u003c/main\u003e\n\u003cfooter class=\"directory-footer\"\u003e\u003cdiv\u003e\u003cstrong\u003eSVENSK eHOCKEY\u003c/strong\u003e\u003cspan\u003e© 2026 Svensk eHockey\u003c/span\u003e\u003c/div\u003e\u003c/footer\u003e", "players": "<main class=\"directory-shell players-shell\">\n<section aria-labelledby=\"playersTitle\" class=\"players-hero\">\n<div class=\"players-hero__copy\">\n<p class=\"directory-kicker\">SPELARE</p>\n<h1 id=\"playersTitle\">Svenska<br/>Spelare</h1>\n<p>\n          Här hittar du svenska spelare som förekommer i databasen från ECL, SCL,\n          eSHL, SEC, ITHL, LGEL och SM. Sök efter spelare, lag eller division,\n          filtrera efter roll och öppna profilen för klubbhistorik, statistik och\n          tidigare säsonger.\n        </p>\n<div aria-label=\"Registeregenskaper\" class=\"players-hero__tags\">\n<span>SVENSKT SPELARREGISTER</span>\n<span>PROFILER MED HISTORIK</span>\n<span>SORTERBART PÅ KLUBBAR</span>\n</div>\n</div>\n<aside aria-label=\"Översikt\" class=\"players-overview\">\n<p class=\"directory-kicker\">ÖVERSIKT</p>\n<p>Snabbkoll på alla svenska spelare och roller som hittats i databasen.</p>\n<div>\n<article><span>SPELARE</span><strong id=\"overviewPlayers\">–</strong></article>\n<article><span>MÅLVAKTER</span><strong id=\"overviewGoalies\">–</strong></article>\n<article><span>UTESPELARE</span><strong id=\"overviewSkaters\">–</strong></article>\n</div>\n</aside>\n</section>\n<section aria-labelledby=\"playerDirectoryTitle\" class=\"player-directory\">\n<h2 class=\"sr-only\" id=\"playerDirectoryTitle\">Spelarregister</h2>\n<div class=\"players-toolbar\">\n<label class=\"players-field players-field--search\">\n<span>SÖK</span>\n<input autocomplete=\"off\" id=\"playerSearch\" placeholder=\"Sök spelare, lag, division…\" type=\"search\"/>\n</label>\n<label class=\"players-field\">\n<span>ROLL</span>\n<select id=\"roleFilter\">\n<option value=\"all\">Alla roller</option>\n<option value=\"skater\">Utespelare</option>\n<option value=\"goalie\">Målvakter</option>\n</select>\n</label>\n<label class=\"players-field\">\n<span>DIVISION</span>\n<select id=\"divisionFilter\"><option value=\"all\">Alla divisioner</option></select>\n</label>\n<label class=\"players-field\">\n<span>SORTERA</span>\n<select id=\"playerSort\">\n<option value=\"games\">Flest matcher</option>\n<option value=\"points\">Flest poäng</option>\n<option value=\"clubs\">Flest klubbar</option>\n<option value=\"name\">Namn A–Ö</option>\n</select>\n</label>\n<label class=\"players-compact\">\n<span>VY</span>\n<span class=\"players-compact__control\">\n<input id=\"compactToggle\" type=\"checkbox\"/>\n<b>Visa mindre</b>\n</span>\n</label>\n</div>\n<p class=\"player-directory__result\" id=\"playerResultText\">Laddar svenska spelare…</p>\n<div aria-live=\"polite\" class=\"player-directory__grid\" id=\"playerGrid\"></div>\n<nav aria-label=\"Sidnumrering\" class=\"player-pagination\" id=\"playerPagination\"></nav>\n</section>\n</main>\n<footer class=\"directory-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>", "history": "<main class=\"directory-shell\">\n<section aria-labelledby=\"pageTitle\" class=\"directory-hero\">\n<div class=\"directory-hero__copy\">\n<p class=\"directory-kicker\">LAGHISTORIK</p>\n<h1 id=\"pageTitle\">Svensk<br/>laghistoria</h1>\n<p>\n          Här samlas svenska lag från ECL, SCL, eSHL, SEC, ITHL, LGEL och SM.\n          Sök efter lag, spelare, turnering eller division och följ samma\n          organisation genom namnbyten och olika säsonger.\n        </p>\n</div>\n<aside aria-label=\"Historikens omfattning\" class=\"directory-year-card\">\n<strong id=\"historyYearCount\">–</strong>\n<span>ÅR AV SVENSK eHOCKEY</span>\n</aside>\n</section>\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>\n        Öppna <code>config.js</code> och fyll i projektets URL och\n        publishable key.\n      </p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta laghistoriken</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<section aria-labelledby=\"directoryTitle\" class=\"directory-section\" id=\"teamDirectory\">\n<div class=\"directory-section__heading\">\n<div>\n<p class=\"directory-kicker\">HISTORIK</p>\n<h2 id=\"directoryTitle\">Svenska lag</h2>\n</div>\n<button class=\"directory-reload\" id=\"reloadButton\" type=\"button\">\n          Uppdatera data\n        </button>\n</div>\n<div aria-label=\"Filtrering och sortering\" class=\"directory-toolbar\">\n<label>\n<span class=\"sr-only\">Namnvisning</span>\n<select id=\"nameModeSelect\">\n<option value=\"current\">Visa via lagnamn</option>\n<option value=\"latest\">Visa senaste turneringsnamn</option>\n</select>\n</label>\n<label>\n<span class=\"sr-only\">Turnering</span>\n<select id=\"tournamentFilter\">\n<option value=\"all\">Alla turneringar</option>\n</select>\n</label>\n<label>\n<span class=\"sr-only\">Sortering</span>\n<select id=\"sortSelect\">\n<option value=\"name-asc\">Namn A–Ö</option>\n<option value=\"name-desc\">Namn Ö–A</option>\n<option value=\"latest\">Senast aktiv</option>\n<option value=\"games\">Flest matcher</option>\n<option value=\"wins\">Flest vinster</option>\n<option value=\"winpct\">Högst vinst%</option>\n<option value=\"tournaments\">Flest turneringar</option>\n<option value=\"players\">Flest spelare</option>\n</select>\n</label>\n<label>\n<span class=\"sr-only\">Kortstorlek</span>\n<select id=\"viewModeSelect\">\n<option value=\"full\">Hela kort</option>\n<option value=\"compact\">Kompakta kort</option>\n</select>\n</label>\n<label class=\"directory-search\">\n<span aria-hidden=\"true\" class=\"directory-search__icon\">⌕</span>\n<input autocomplete=\"off\" id=\"searchInput\" placeholder=\"Sök lag, spelare, ECL eller division\" type=\"search\"/>\n</label>\n</div>\n<section aria-label=\"Samlad lagstatistik\" class=\"directory-stats\" id=\"directoryStats\">\n<article>\n<span>VISAR LAG</span>\n<strong id=\"visibleTeamCount\">–</strong>\n</article>\n<article>\n<span>ALLA LAGNAMN</span>\n<strong id=\"allNameCount\">–</strong>\n</article>\n<article>\n<span>SÄSONGER</span>\n<strong id=\"appearanceCount\">–</strong>\n</article>\n<article>\n<span>DIVISIONER</span>\n<strong id=\"divisionCount\">–</strong>\n</article>\n<article>\n<span>MATCHER / VINSTER</span>\n<strong><span id=\"matchCount\">–</span> / <span id=\"winCount\">–</span></strong>\n</article>\n<article>\n<span>SPELARE</span>\n<strong id=\"playerCount\">–</strong>\n</article>\n</section>\n<div class=\"directory-resultbar\">\n<span id=\"resultText\">Laddar…</span>\n<span id=\"lastUpdated\"></span>\n</div>\n<div class=\"directory-loading\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar lag, turneringar och spelare…</p>\n</div>\n<div aria-live=\"polite\" class=\"directory-grid\" id=\"teamGrid\"></div>\n</section>\n</main>\n<footer class=\"directory-footer\">\n<div>\n<strong>SVENSK eHOCKEY</strong>\n<span>© 2026 Svensk eHockey</span>\n</div>\n<a href=\"#teamDirectory\">Till toppen ↑</a>\n</footer>\n<template id=\"teamCardTemplate\">\n<article class=\"directory-team-card\">\n<a aria-label=\"\" class=\"directory-team-card__main-link\" href=\"#\"></a>\n<span class=\"directory-team-card__number\"></span>\n<div class=\"directory-team-card__header\">\n<div aria-hidden=\"true\" class=\"directory-team-card__logo\"></div>\n<div class=\"directory-team-card__identity\">\n<h3 class=\"directory-team-card__name\"></h3>\n<p class=\"directory-team-card__identity-name\" hidden=\"\"></p>\n<div class=\"directory-team-card__badges\"></div>\n</div>\n</div>\n<dl class=\"directory-team-card__metrics\">\n<div><dt>SPELARE</dt><dd class=\"metric-players\">–</dd></div>\n<div><dt>TURNERINGAR</dt><dd class=\"metric-tournaments\">–</dd></div>\n<div><dt>DIVISIONER</dt><dd class=\"metric-divisions\">–</dd></div>\n<div><dt>MATCHER</dt><dd class=\"metric-games\">–</dd></div>\n<div><dt>RECORD</dt><dd class=\"metric-record\">–</dd></div>\n<div><dt>VINST%</dt><dd class=\"metric-winpct\">–</dd></div>\n<div><dt>GF–GA</dt><dd class=\"metric-goals\">–</dd></div>\n<div><dt>+/−</dt><dd class=\"metric-diff\">–</dd></div>\n<div><dt>SLUTSPEL</dt><dd class=\"metric-playoffs\">–</dd></div>\n</dl>\n<div class=\"directory-team-card__summary\">\n<p><strong>Topp spelare:</strong> <a class=\"summary-top-player\" href=\"#\">–</a></p>\n<p><strong>Senast:</strong> <span class=\"summary-latest\">–</span></p>\n<p class=\"summary-alias-row\"><strong>Namnvariationer:</strong> <span class=\"summary-aliases\">–</span></p>\n</div>\n<div class=\"directory-team-card__action\">\n        Öppna laghistoriken <span aria-hidden=\"true\">→</span>\n</div>\n</article>\n</template>", "player": "<div class=\"page-shell history-page-shell player-profile-shell\">\n  <nav aria-label=\"Navigering\" class=\"page-nav history-nav player-profile-legacy-nav\">\n    <a class=\"back-button\" href=\"#/spelare\" id=\"backLink\">← Tillbaka till spelare</a>\n    <button class=\"reload-button\" id=\"reloadButton\" type=\"button\">Uppdatera</button>\n  </nav>\n\n  <section class=\"notice notice-warning\" hidden id=\"setupNotice\">\n    <h2>Anslut sidan till Supabase</h2>\n    <p>Öppna <code>config.js</code> och fyll i projektets URL och publishable key.</p>\n  </section>\n\n  <section class=\"notice notice-error\" hidden id=\"errorNotice\">\n    <h2>Kunde inte hämta spelaren</h2>\n    <p id=\"errorMessage\"></p>\n  </section>\n\n  <main hidden id=\"playerPage\" class=\"player-profile-page-v5\">\n    <section class=\"player-editorial-profile\" aria-label=\"Spelarprofil\">\n      <div class=\"player-editorial-photo-column\">\n        <div aria-hidden=\"true\" class=\"profile-detail-avatar player-editorial-photo\" id=\"playerAvatar\"></div>\n      </div>\n\n      <div class=\"player-editorial-main\">\n        <p class=\"player-editorial-kicker\">\n          <span id=\"playerFlag\" aria-hidden=\"true\">🇸🇪</span>\n          <span>SPELARPROFIL</span>\n        </p>\n\n        <h1 id=\"playerName\">Laddar spelare…</h1>\n\n        <div class=\"player-editorial-identity\">\n          <span class=\"player-editorial-team\" id=\"playerCurrentTeam\">–</span>\n          <p id=\"playerMeta\">–</p>\n        </div>\n\n        <section class=\"player-editorial-stats\" aria-label=\"Offensiv karriärstatistik\">\n          <article>\n            <strong id=\"careerPoints\">–</strong>\n            <span>POÄNG</span>\n          </article>\n          <article>\n            <strong id=\"careerGoals\">–</strong>\n            <span>MÅL</span>\n          </article>\n          <article>\n            <strong id=\"careerAssists\">–</strong>\n            <span>ASSIST</span>\n          </article>\n        </section>\n\n        <p class=\"player-editorial-competitions\" id=\"playerCompetitions\"></p>\n      </div>\n\n      <aside class=\"player-editorial-bio\" aria-label=\"Spelarpresentation\">\n        <div id=\"playerBio\"></div>\n        <div class=\"team-profile-links player-editorial-links\" id=\"playerLinks\"></div>\n      </aside>\n    </section>\n\n    <section class=\"player-merits-layout\" id=\"playerMeritsSection\" hidden>\n      <article class=\"player-merits-column player-merits-column--team\">\n        <div class=\"player-merits-heading player-merits-heading--team\">\n          <span aria-hidden=\"true\"></span>\n          <h2>MERITER</h2>\n          <span aria-hidden=\"true\"></span>\n        </div>\n        <div class=\"player-merits-list\" id=\"teamMeritsList\"></div>\n      </article>\n\n      <article class=\"player-merits-column player-merits-column--personal\">\n        <div class=\"player-merits-heading player-merits-heading--personal\">\n          <h2>PERSONLIGA MERITER</h2>\n        </div>\n        <div class=\"player-merits-list\" id=\"personalMeritsList\"></div>\n      </article>\n    </section>\n\n    <section class=\"player-secondary-metrics\" aria-label=\"Spelaröversikt\">\n      <article><span>TURNERINGAR</span><strong id=\"tournamentCount\">–</strong></article>\n      <article><span>LAG</span><strong id=\"teamCount\">–</strong></article>\n      <article><span>MATCHER</span><strong id=\"careerGames\">–</strong></article>\n    </section>\n\n    <section class=\"history-alltime-grid player-career-grid player-career-grid-v5\">\n      <article class=\"history-alltime-card\">\n        <p class=\"history-kicker history-kicker--gold\">Utespelare</p>\n        <h2>Karriärstatistik</h2>\n        <div class=\"profile-stat-list\" id=\"skaterCareerStats\"></div>\n      </article>\n\n      <article class=\"history-alltime-card\">\n        <p class=\"history-kicker history-kicker--gold\">Målvakt</p>\n        <h2>Målvaktsstatistik</h2>\n        <div class=\"profile-stat-list\" id=\"goalieCareerStats\"></div>\n      </article>\n    </section>\n\n    <section class=\"player-teams-section-v5\" id=\"playerTeamsSection\" hidden>\n      <div class=\"player-teams-heading-v5\">\n        <h2>Lag</h2>\n        <p>Lag spelaren har representerat i historiken.</p>\n      </div>\n      <div class=\"player-teams-grid-v5\" id=\"playerTeamsGrid\"></div>\n    </section>\n\n    <section class=\"history-section player-history-section-v5\">\n      <div class=\"history-section-heading\">\n        <div>\n          <p class=\"history-kicker history-kicker--gold\">Historik</p>\n          <h2>Alla turneringar</h2>\n          <p>Varje rad länkar till lagets sida för just den turneringen.</p>\n        </div>\n        <span class=\"history-section-count\" id=\"historyCount\"></span>\n      </div>\n\n      <div class=\"player-history-filters\" id=\"historyCompetitionFilters\" aria-label=\"Filtrera turneringshistorik\"></div>\n\n      <div class=\"history-table-wrap\">\n        <table class=\"history-table player-history-table\">\n          <thead>\n            <tr>\n              <th>Säsong</th>\n              <th>Lag</th>\n              <th>Division</th>\n              <th>Roll</th>\n              <th>GP</th>\n              <th>G</th>\n              <th>A</th>\n              <th>PTS</th>\n              <th>SV%</th>\n              <th>GAA</th>\n            </tr>\n          </thead>\n          <tbody id=\"historyTableBody\"></tbody>\n        </table>\n      </div>\n    </section>\n  </main>\n\n  <div class=\"loading-state\" id=\"loadingState\">\n    <div aria-hidden=\"true\" class=\"spinner\"></div>\n    <p>Hämtar spelarens historik…</p>\n  </div>\n</div>\n<footer class=\"directory-footer\">\n  <div>\n    <strong>SVENSK eHOCKEY</strong>\n    <span>© 2026 Svensk eHockey</span>\n  </div>\n</footer>", "team": "<div class=\"page-shell history-page-shell\">\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>\n        Öppna <code>config.js</code> och fyll i projektets URL och\n        publishable key.\n      </p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta laget</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<main hidden=\"\" id=\"teamPage\">\n<section class=\"history-hero\">\n<div class=\"history-hero-main\">\n<p class=\"history-kicker\">Lagets historik</p>\n<h1 id=\"teamName\">Laddar lag…</h1>\n<div class=\"history-hero-content\">\n<div class=\"history-team-identity\">\n<div aria-hidden=\"true\" class=\"history-team-logo\" id=\"teamProfileAvatar\"></div>\n<div aria-label=\"Lagets pallplatser\" class=\"history-badges\" id=\"historyBadges\"></div>\n</div>\n<div class=\"history-profile-copy\">\n<div class=\"history-chip-row\" id=\"heroChips\"></div>\n<div class=\"history-profile-block\">\n<span>Klubbprofil</span>\n<p id=\"clubProfileText\"></p>\n</div>\n<div class=\"history-leaders\">\n<div>\n<span>Flest matcher</span>\n<strong id=\"leaderMatches\">–</strong>\n</div>\n<div>\n<span>Flest poäng</span>\n<strong id=\"leaderPoints\">–</strong>\n</div>\n<div>\n<span>Främsta målvakt</span>\n<strong id=\"leaderGoalie\">–</strong>\n</div>\n</div>\n<div class=\"team-profile-links\" id=\"teamLinks\"></div>\n</div>\n</div>\n</div>\n<aside aria-labelledby=\"divisionCurveHeading\" class=\"history-division-panel\">\n<p class=\"history-kicker history-kicker--gold\">Divisioner</p>\n<h2 id=\"divisionCurveHeading\">Divisionskurva</h2>\n<p>Från NEO längst ner till ELITE högst upp.</p>\n<div class=\"division-curve\" id=\"divisionCurve\"></div>\n<div class=\"division-curve-footer\">\n<span id=\"divisionCurveFirst\">–</span>\n<span id=\"divisionCurveLatest\">–</span>\n</div>\n</aside>\n</section>\n<section aria-label=\"Lagöversikt\" class=\"history-metric-band\">\n<article class=\"history-feature-metric\">\n<span>Matchvinster</span>\n<strong id=\"winsCount\">–</strong>\n<small id=\"winsMetricNote\"></small>\n</article>\n<article class=\"history-feature-metric\">\n<span>Bästa ECL</span>\n<strong id=\"bestEclSeason\">–</strong>\n<small id=\"bestEclNote\"></small>\n</article>\n<article class=\"history-feature-metric\">\n<span>Högsta nivå</span>\n<strong id=\"bestDivision\">–</strong>\n<small id=\"divisionMetricNote\"></small>\n</article>\n<article class=\"history-feature-metric\">\n<span>Slutspel</span>\n<strong id=\"playoffRecord\">–</strong>\n<small id=\"playoffMetricNote\"></small>\n</article>\n<div class=\"history-compact-metrics\">\n<div><span>Matcher</span><strong id=\"gamesCount\">–</strong></div>\n<div><span>Vinster</span><strong id=\"winsCompact\">–</strong></div>\n<div><span>Förluster</span><strong id=\"lossesCount\">–</strong></div>\n<div><span>Vinst%</span><strong id=\"winPercentage\">–</strong></div>\n<div><span>GF–GA</span><strong id=\"goalsRecord\">–</strong></div>\n<div><span>+/−</span><strong id=\"goalDifference\">–</strong></div>\n</div>\n</section>\n<section class=\"history-section history-honours\" hidden=\"\" id=\"teamHonoursSection\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Meriter</p>\n<h2>Pallplatser</h2>\n</div>\n<span class=\"history-section-count\" id=\"teamHonoursCount\"></span>\n</div>\n<div class=\"history-honour-summary\">\n<div><span>Mästare</span><strong id=\"championshipsCount\">0</strong></div>\n<div><span>Finaler</span><strong id=\"finalsCount\">0</strong></div>\n<div><span>Brons</span><strong id=\"bronzeCount\">0</strong></div>\n</div>\n<div class=\"history-honour-list\" id=\"teamHonoursList\"></div>\n</section>\n<section class=\"history-section\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Säsonger</p>\n<h2>Lagets säsonger</h2>\n<p>Säsonger, divisioner och tillgänglig lagstatistik.</p>\n</div>\n<span class=\"history-section-count\" id=\"tournamentCount\">–</span>\n</div>\n<div class=\"player-history-filters team-season-filters\" id=\"seasonCompetitionFilters\" aria-label=\"Filtrera lagets säsonger efter turnering\"></div>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-seasons-table\">\n<thead>\n<tr>\n<th>Säsong</th>\n<th>Datum</th>\n<th>Lagnamn då</th>\n<th>Division</th>\n<th>Spelare</th>\n<th>Matcher</th>\n<th>Record</th>\n<th>Poäng</th>\n<th>GF–GA</th>\n<th>Länk</th>\n</tr>\n</thead>\n<tbody id=\"seasonsTableBody\"></tbody>\n</table>\n</div>\n</section>\n<section class=\"history-section history-player-section\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Spelare</p>\n<h2 id=\"playersHeading\">Spelare – all-time</h2>\n<p>Alla spelare som har representerat laget i importerade turneringar.</p>\n</div>\n<span class=\"history-section-count\" id=\"allTimePlayerCount\">–</span>\n</div>\n<div class=\"history-player-grid\" id=\"playerCards\"></div>\n<div class=\"history-player-grid-actions\">\n<button class=\"history-outline-button\" hidden=\"\" id=\"togglePlayerCards\" type=\"button\">\n            Visa alla spelare\n          </button>\n</div>\n<div class=\"history-alltime-grid\">\n<article class=\"history-alltime-card\">\n<h3>All-time utespelare</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr>\n<th>#</th>\n<th>Spelare</th>\n<th>GP</th>\n<th>G</th>\n<th>A</th>\n<th>PTS</th>\n<th>PIM</th>\n</tr>\n</thead>\n<tbody id=\"allTimeSkaterBody\"></tbody>\n</table>\n</div>\n<div class=\"history-alltime-table-actions\">\n<button class=\"history-outline-button\" hidden=\"\" id=\"toggleAllTimeSkaters\" type=\"button\" aria-expanded=\"false\">Visa alla utespelare</button>\n</div>\n</article>\n<article class=\"history-alltime-card\">\n<h3>All-time målvakter</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr>\n<th>#</th>\n<th>Målvakt</th>\n<th>GP</th>\n<th>SA</th>\n<th>GA</th>\n<th>SV</th>\n<th>SV%</th>\n<th>GAA</th>\n<th>SO</th>\n</tr>\n</thead>\n<tbody id=\"allTimeGoalieBody\"></tbody>\n</table>\n</div>\n<div class=\"history-alltime-table-actions\">\n<button class=\"history-outline-button\" hidden=\"\" id=\"toggleAllTimeGoalies\" type=\"button\" aria-expanded=\"false\">Visa alla målvakter</button>\n</div>\n</article>\n</div>\n</section>\n<section class=\"history-section history-details-section\">\n<details>\n<summary>\n<span>\n<span class=\"history-kicker history-kicker--gold\">Fördjupning</span>\n<strong>Detaljerad turneringshistorik</strong>\n</span>\n<small>Behåller all information från den tidigare lagsidan</small>\n</summary>\n<div class=\"history-details-body\">\n<div class=\"section-heading\">\n<div>\n<h2>Alla turneringar</h2>\n</div>\n<div class=\"tournament-controls\">\n<label>\n<span>Turnering</span>\n<select id=\"competitionFilter\">\n<option value=\"\">Alla turneringar</option>\n</select>\n</label>\n<label>\n<span>Sortering</span>\n<select id=\"tournamentSort\">\n<option value=\"newest\">Nyaste först</option>\n<option value=\"oldest\">Äldsta först</option>\n<option value=\"competition\">Turnering A–Ö</option>\n</select>\n</label>\n</div>\n</div>\n<div class=\"result-bar tournament-result-bar\">\n<span id=\"tournamentResultText\"></span>\n<span id=\"lastUpdated\"></span>\n</div>\n<div class=\"tournament-list\" id=\"tournamentList\"></div>\n</div>\n</details>\n</section>\n<section class=\"team-information-panel history-source-panel\">\n<div>\n<span class=\"information-label\">SportsGamer-ID</span>\n<div class=\"information-value\" id=\"sportsGamerIds\"></div>\n</div>\n<div>\n<span class=\"information-label\">Historiska namn</span>\n<div class=\"information-value\" id=\"historicalNames\"></div>\n</div>\n<div>\n<span class=\"information-label\">Namn i turneringar</span>\n<div class=\"information-value\" id=\"leagueNames\"></div>\n</div>\n</section>\n</main>\n<div class=\"loading-state\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar lagets historik, turneringar och spelare…</p>\n</div>\n</div>", "teamTournament": "<div class=\"page-shell history-page-shell\">\n<nav aria-label=\"Navigering\" class=\"page-nav history-nav\">\n<a class=\"back-button\" href=\"#/laghistoria\" id=\"backLink\">← Tillbaka till laget</a>\n<button class=\"reload-button\" id=\"reloadButton\" type=\"button\">Uppdatera</button>\n</nav>\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>Kontrollera att befintliga <code>config.js</code> innehåller projektets URL och publishable key.</p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta turneringen</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<main hidden=\"\" id=\"tournamentPage\">\n<section class=\"profile-detail-hero tournament-detail-hero\">\n<div aria-hidden=\"true\" class=\"profile-detail-avatar profile-detail-avatar--team\" id=\"teamAvatar\"></div>\n<div class=\"profile-detail-copy\">\n<p class=\"history-kicker history-kicker--gold\" id=\"competitionName\"></p>\n<h1 id=\"teamName\">Laddar lag…</h1>\n<h2 class=\"tournament-page-title\" id=\"tournamentName\"></h2>\n<p class=\"profile-detail-meta\" id=\"tournamentMeta\"></p>\n<div class=\"team-profile-links\" id=\"tournamentLinks\"></div>\n</div>\n</section>\n<section aria-label=\"Turneringsöversikt\" class=\"profile-summary-grid tournament-summary-grid\">\n<article><span>Matcher</span><strong id=\"gamesCount\">–</strong></article>\n<article><span>Vinster</span><strong id=\"winsCount\">–</strong></article>\n<article><span>Förluster</span><strong id=\"lossesCount\">–</strong></article>\n<article><span>Vinst%</span><strong id=\"winPercentage\">–</strong></article>\n<article><span>GF–GA</span><strong id=\"goalsRecord\">–</strong></article>\n<article><span>+/−</span><strong id=\"goalDifference\">–</strong></article>\n</section>\n<section class=\"tournament-single-grid\">\n<article class=\"history-alltime-card\">\n<p class=\"history-kicker history-kicker--gold\">Grundserie</p>\n<h2 id=\"regularRecord\">–</h2>\n<div class=\"profile-stat-list\" id=\"regularDetails\"></div>\n</article>\n<article class=\"history-alltime-card\">\n<p class=\"history-kicker history-kicker--gold\">Slutspel</p>\n<h2 id=\"playoffRecord\">–</h2>\n<div class=\"profile-stat-list\" id=\"playoffDetails\"></div>\n</article>\n</section>\n<section class=\"history-section\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Trupp</p>\n<h2>Spelare i turneringen</h2>\n<p>Spelarnamnen länkar till Svensk eHockey-profiler. Kopplade spelare har även en direktlänk till SportsGamer.</p>\n</div>\n<span class=\"history-section-count\" id=\"playerCount\"></span>\n</div>\n<div class=\"history-alltime-grid tournament-roster-grid\">\n<article class=\"history-alltime-card\">\n<h3>Utespelare</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr><th>Spelare</th><th>Pos</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/−</th><th>PIM</th></tr>\n</thead>\n<tbody id=\"skaterBody\"></tbody>\n</table>\n</div>\n</article>\n<article class=\"history-alltime-card\">\n<h3>Målvakter</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead>\n<tr><th>Målvakt</th><th>GP</th><th>V</th><th>F</th><th>ÖF</th><th>SV%</th><th>GAA</th><th>SO</th></tr>\n</thead>\n<tbody id=\"goalieBody\"></tbody>\n</table>\n</div>\n</article>\n</div>\n</section>\n<section class=\"history-section\" hidden=\"\" id=\"matchesSection\">\n<div class=\"history-section-heading\">\n<div>\n<p class=\"history-kicker history-kicker--gold\">Matcher</p>\n<h2>Matcher i turneringen</h2>\n<p>Spelade, ospelade, walkover- och rekonstruerade matcher visas med separat status.</p>\n</div>\n<span class=\"history-section-count\" id=\"matchCount\"></span>\n</div>\n<div class=\"tournament-match-list\" id=\"matchList\"></div>\n</section>\n</main>\n<div class=\"loading-state\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar turneringssidan…</p>\n</div>\n</div>", "tournament": "<div class=\"page-shell history-page-shell tournament-overview-shell\">\n<nav aria-label=\"Navigering\" class=\"page-nav history-nav\">\n<a class=\"back-button\" href=\"#/laghistoria\">← Till laghistoriken</a>\n<button class=\"reload-button\" id=\"reloadButton\" type=\"button\">Uppdatera</button>\n</nav>\n<section class=\"notice notice-warning\" hidden=\"\" id=\"setupNotice\">\n<h2>Anslut sidan till Supabase</h2>\n<p>Kontrollera att befintliga <code>config.js</code> innehåller projektets URL och publishable key.</p>\n</section>\n<section class=\"notice notice-error\" hidden=\"\" id=\"errorNotice\">\n<h2>Kunde inte hämta turneringen</h2>\n<p id=\"errorMessage\"></p>\n</section>\n<main hidden=\"\" id=\"tournamentOverview\">\n<section class=\"tournament-overview-hero\">\n<div>\n<p class=\"history-kicker history-kicker--gold\" id=\"competitionName\">TURNERING</p>\n<h1 id=\"tournamentTitle\">Laddar turnering…</h1>\n<p class=\"tournament-overview-intro\" id=\"tournamentDescription\"></p>\n<div class=\"team-profile-links\" id=\"tournamentExternalLinks\"></div>\n</div>\n<aside aria-label=\"Turneringsidentitet\" class=\"tournament-overview-identity\">\n<span>LIGA-ID</span>\n<strong id=\"leagueIdValue\">–</strong>\n<small id=\"tournamentPeriod\">–</small>\n</aside>\n</section>\n<nav aria-label=\"Turneringsinnehåll\" class=\"tournament-overview-nav\">\n<a href=\"#overview\">Översikt</a>\n<a href=\"#standings\">Tabeller</a>\n<a href=\"#teams\">Lag</a>\n<a href=\"#matches\">Matcher</a>\n<a href=\"#statistics\">Statistik</a>\n<a href=\"#playoffs\">Slutspel</a>\n</nav>\n<section aria-label=\"Turneringsöversikt\" class=\"tournament-overview-metrics\" id=\"overview\">\n<article><span>Lag</span><strong id=\"metricTeams\">–</strong></article>\n<article><span>Spelare</span><strong id=\"metricPlayers\">–</strong><small id=\"metricLinkedPlayers\"></small></article>\n<article><span>Matcher</span><strong id=\"metricMatches\">–</strong><small id=\"metricPlayedMatches\"></small></article>\n<article><span>Walkovers</span><strong id=\"metricWalkovers\">–</strong></article>\n<article><span>Slutspelsserier</span><strong id=\"metricSeries\">–</strong></article>\n<article><span>Slutspelsmatcher</span><strong id=\"metricPlayoffMatches\">–</strong><small id=\"metricReconstructed\"></small></article>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"standings\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">TABELLER</p><h2>Grundserie och grupper</h2><p>Tabellplaceringar och lagresultat hämtas direkt från Supabase.</p></div>\n<span class=\"history-section-count\" id=\"standingsCount\"></span>\n</div>\n<div class=\"tournament-standings-container\" id=\"standingsContainer\"></div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"teams\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">LAG</p><h2>Deltagande lag</h2><p>Öppna lagets turneringssida för trupp, statistik och samtliga matcher.</p></div>\n<span class=\"history-section-count\" id=\"teamsCount\"></span>\n</div>\n<div class=\"tournament-teams-grid\" id=\"teamsGrid\"></div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"matches\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">MATCHER</p><h2>Alla matcher</h2><p>Ospelade matcher, walkovers och rekonstruerade matcher har egen status.</p></div>\n<span class=\"history-section-count\" id=\"matchesCount\"></span>\n</div>\n<div class=\"tournament-filter-bar\">\n<label><span>FAS</span><select id=\"stageFilter\"><option value=\"all\">Alla faser</option></select></label>\n<label><span>STATUS</span><select id=\"statusFilter\"><option value=\"all\">Alla statusar</option><option value=\"played\">Spelade</option><option value=\"pending\">Ospelade</option><option value=\"walkover\">Walkover</option><option value=\"reconstructed\">Rekonstruerade</option></select></label>\n<label><span>LAG</span><select id=\"teamFilter\"><option value=\"all\">Alla lag</option></select></label>\n</div>\n<div class=\"tournament-global-match-list\" id=\"matchesList\"></div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"statistics\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">STATISTIK</p><h2>Spelarstatistik</h2><p>SportsGamer-kopplade spelare använder permanent playerID och SportsGamer-namn när uppgifterna finns i databasen.</p></div>\n<span class=\"history-section-count\" id=\"statisticsCount\"></span>\n</div>\n<div class=\"history-alltime-grid tournament-statistics-grid\">\n<article class=\"history-alltime-card\">\n<h3>Utespelare</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead><tr><th>#</th><th>Spelare</th><th>Lag</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/−</th></tr></thead>\n<tbody id=\"skaterStatsBody\"></tbody>\n</table>\n</div>\n</article>\n<article class=\"history-alltime-card\">\n<h3>Målvakter</h3>\n<div class=\"history-table-wrap\">\n<table class=\"history-table history-player-table\">\n<thead><tr><th>#</th><th>Målvakt</th><th>Lag</th><th>GP</th><th>SV</th><th>SA</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead>\n<tbody id=\"goalieStatsBody\"></tbody>\n</table>\n</div>\n</article>\n</div>\n</section>\n<section class=\"history-section tournament-overview-section\" id=\"playoffs\">\n<div class=\"history-section-heading\">\n<div><p class=\"history-kicker history-kicker--gold\">SLUTSPEL</p><h2>Slutspelsserier</h2><p>Serierna skapas från turneringens slutspelsmatcher och grupperas per runda.</p></div>\n<span class=\"history-section-count\" id=\"playoffsCount\"></span>\n</div>\n<div class=\"tournament-playoff-bracket\" id=\"playoffBracket\"></div>\n</section>\n</main>\n<div class=\"loading-state\" id=\"loadingState\">\n<div aria-hidden=\"true\" class=\"spinner\"></div>\n<p>Hämtar turneringsdata…</p>\n</div>\n</div>", "season": "<main class=\"directory-shell portal-shell\">\n<section class=\"portal-page-hero season-hero\">\n<p class=\"directory-kicker\">ECL-SÄSONG</p>\n<h1 id=\"seasonTitle\">ECL ’26:<br/>Spring</h1>\n<p id=\"seasonText\">Samlad ingång till svenska lag, spelare och historik för säsongen.</p>\n</section>\n<nav aria-label=\"Säsongsmeny\" class=\"season-subnav\">\n<a class=\"is-active\" href=\"#overview\">Översikt</a>\n<a href=\"#matches\">Matcher</a>\n<a href=\"#transfers\">Byten</a>\n<a href=\"#teams\">Lag</a>\n<a href=\"#statistics\">Statistik</a>\n</nav>\n<section class=\"season-overview\" id=\"overview\">\n<p class=\"directory-kicker\">ÖVERSIKT</p>\n<h2 id=\"seasonOverviewTitle\">ECL ’26: Spring</h2>\n<p>\n        Den här säsongssidan är navet för säsongens innehåll. Databasens\n        laghistorik kan öppnas direkt med säsongen vald.\n      </p>\n<div class=\"portal-actions\">\n<a class=\"portal-button portal-button--primary\" href=\"#/laghistoria\" id=\"seasonTeamsLink\">Visa lag i databasen</a>\n<a class=\"portal-button\" href=\"#/spelare\">Öppna spelarregistret</a>\n</div>\n</section>\n<section class=\"season-panels\">\n<article id=\"matches\"><span>MATCHER</span><h3>Matcher</h3><p>Säsongens matchvy kopplas in här när matchdata finns i databasen.</p></article>\n<article id=\"transfers\"><span>BYTEN</span><h3>Byten</h3><p>En tydlig plats för svenska spelarbyten under säsongen.</p></article>\n<article id=\"teams\"><span>LAG</span><h3>Svenska lag</h3><p>Öppna laghistoriken och filtrera fram säsongens deltagande lag.</p></article>\n<article id=\"statistics\"><span>STATISTIK</span><h3>Statistik</h3><p>Tabeller och topplistor kan byggas från databasens säsongsdata.</p></article>\n</section>\n</main>\n<footer class=\"directory-footer\"><div><strong>SVENSK eHOCKEY</strong><span>© 2026 Svensk eHockey</span></div></footer>"};
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

  const routeBodyClasses = {"home": "directory-page portal-page", "news": "directory-page portal-page", "players": "directory-page portal-page", "history": "directory-page", "player": "history-body", "team": "history-body", "teamTournament": "history-body", "tournament": "history-body tournament-overview-body", "shop": "directory-page shop-page", "season": "directory-page portal-page"};

  const routeControllers = {
    news: SEH_initNews,
    history: SEH_initHistory,
    players: SEH_initPlayers,
    player: SEH_initPlayer,
    team: SEH_initTeam,
    teamTournament: SEH_initTeamTournament,
    tournament: SEH_initTournament,
    shop: SEH_initShop
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
    ecl26spring: {
      id: "ecl26spring",
      title: "ECL ’26: Spring",
      databaseLabel: "ECL 26 Spring",
      leagueIds: [507, 508, 509, 510, 511],
      countryCode: "SE"
    },
    ecl26winter: {
      id: "ecl26winter",
      title: "ECL ’26: Winter",
      databaseLabel: "ECL 26 Winter"
    },
    ecl27winter: {
      id: "ecl27winter",
      title: "ECL ’27: Winter",
      databaseLabel: "ECL 27 Winter"
    }
  };

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
    return seasons[id] ? id : "ecl26spring";
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
        active: "season",
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
            class="${route.active === "history" ? "is-active" : ""}"
            href="#/laghistoria"
          >
            Laghistoria
          </a>

          <a
            class="${route.active === "shop" ? "is-active" : ""}"
            href="#/shop"
          >
            SHOP
          </a>

          <a
            class="seh-nav-sec"
            href="https://www.svenskehockey.se/SEC/"
          >
            SEC
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
      history: "Laghistoria – Svensk eHockey",
      player: "Spelarprofil – Svensk eHockey",
      team: "Lagprofil – Svensk eHockey",
      teamTournament: "Lag i turnering – Svensk eHockey",
      tournament: "Turnering – Svensk eHockey",
      shop: "Shop – Svensk eHockey",
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

  async function seasonFetchLegacyData() {
    const candidates = [
      "./svenskstatistikecl26spring.json",
      "/svenskstatistikecl26spring.json",
      "https://www.svenskehockey.se/svenskstatistikecl26spring.json"
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;
        const outer = await response.json();
        if (outer?.teams || outer?.matcher || outer?.overgangar) return outer;
        const wrapped = outer?.rows?.[0]?.json_result;
        if (wrapped) return typeof wrapped === "string" ? JSON.parse(wrapped) : wrapped;
      } catch {
        // Prova nästa kända placering.
      }
    }
    return null;
  }

  function seasonLegacyMatches(legacy) {
    return Object.entries(legacy?.matcher || {}).flatMap(([division, matches]) =>
      (Array.isArray(matches) ? matches : []).map((match) => ({ ...match, division }))
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

  function seasonDate(value) {
    const text = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return seasonText(value);
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(new Date(`${text}T12:00:00`));
  }

  function initializeSeasonMatches(view, legacy) {
    const host = view.querySelector("#seasonMatchList");
    const division = view.querySelector("#seasonMatchDivision");
    const search = view.querySelector("#seasonMatchSearch");
    const summary = view.querySelector("#seasonMatchSummary");
    const matches = seasonLegacyMatches(legacy);
    if (!host || !division || !search || !summary) return;

    const render = () => {
      const query = search.value.trim().toLowerCase();
      const rows = matches.filter((match) => {
        const divisionMatch = division.value === "all" || match.division === division.value;
        const haystack = [match.homeTeam, match.awayTeam, match.svensktLag, match.group, match.date].join(" ").toLowerCase();
        return divisionMatch && (!query || haystack.includes(query));
      });
      summary.innerHTML = `<strong>${rows.length}</strong><span>svenska matcher visas</span>`;
      host.innerHTML = rows.length ? rows.map((match) => `
        <article class="season-match-card">
          <div class="season-match-meta"><span>${escapeHtml(String(match.division || "").toUpperCase())}</span><time>${escapeHtml(seasonDate(match.date))} · ${escapeHtml(seasonText(match.time, "Tid saknas"))}</time><small>${escapeHtml(seasonText(match.group, ""))}</small></div>
          <div class="season-match-score"><span>${escapeHtml(seasonText(match.homeTeam))}</span><strong>${seasonNumber(match.homeScore)}–${seasonNumber(match.awayScore)}${match.ot ? `<small>${escapeHtml(match.ot)}</small>` : ""}</strong><span>${escapeHtml(seasonText(match.awayTeam))}</span></div>
          ${match.goalsSummary ? `<details><summary>Visa matchhändelser</summary><p>${escapeHtml(match.goalsSummary).replaceAll(" | ", "<br>")}</p></details>` : ""}
        </article>`).join("") : `<p class="season-empty">Inga matcher matchar filtret.</p>`;
    };
    division.addEventListener("change", render);
    search.addEventListener("input", render);
    render();
  }

  function initializeSeasonTransfers(view, legacy) {
    const host = view.querySelector("#seasonTransferList");
    const search = view.querySelector("#seasonTransferSearch");
    const summary = view.querySelector("#seasonTransferSummary");
    if (!host || !search || !summary) return;
    const transfers = (legacy?.overgangar || [])
      .filter((row) => String(row.nationality || "").toUpperCase() === "SE")
      .sort((a, b) => String(b.Date || "").localeCompare(String(a.Date || "")));
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const rows = transfers.filter((row) =>
        !query || [row.Player, row.From, row.To, row.FromDiv, row.ToDiv].join(" ").toLowerCase().includes(query)
      );
      summary.innerHTML = `<strong>${rows.length}</strong><span>svenska lagbyten</span>`;
      host.innerHTML = rows.length ? rows.map((row) => `
        <article class="season-transfer-card">
          <time>${escapeHtml(seasonDate(row.Date))}</time>
          <h4>${escapeHtml(seasonText(row.Player))}</h4>
          <div><span><small>FRÅN</small>${escapeHtml(seasonText(row.From, "Free Agent"))}<em>${escapeHtml(seasonText(row.FromDiv, ""))}</em></span><b>→</b><span><small>TILL</small>${escapeHtml(seasonText(row.To))}<em>${escapeHtml(seasonText(row.ToDiv, ""))}</em></span></div>
        </article>`).join("") : `<p class="season-empty">Inga byten matchar sökningen.</p>`;
    };
    search.addEventListener("input", render);
    render();
  }

  function initializeSeasonTeams(view, rows) {
    const host = view.querySelector("#seasonTeamsList");
    const division = view.querySelector("#seasonTeamDivision");
    const sort = view.querySelector("#seasonTeamSort");
    const search = view.querySelector("#seasonTeamSearch");
    const summary = view.querySelector("#seasonTeamSummary");
    const playoffOnly = view.querySelector("#seasonTeamPlayoffOnly");
    const aliveOnly = view.querySelector("#seasonTeamAliveOnly");
    if (!host || !division || !sort || !search || !summary || !playoffOnly || !aliveOnly) return;

    const divisionRank = { elite: 1, pro: 2, lite: 3, core: 4, neo: 5 };
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
      const label = playoffLabel(row).toLowerCase();
      return seasonNumber(row.playoff_games) > 0 || (!label.includes("ej slutspel") && !label.includes("nedflyttning") && label !== "–");
    };
    const isAlive = (row) => {
      const label = playoffLabel(row).toLowerCase();
      return isPlayoffTeam(row) && !label.includes("utslagen") && !label.includes("ej slutspel") && !label.includes("nedflyttning");
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
        return `<article class="season-team-card">
          <a class="season-team-card__link" href="${escapeHtml(href)}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""}>
            <div class="season-team-card__identity">
              <div class="season-team-card__logo" data-season-team-logo data-team-name="${escapeHtml(seasonTeamName(row))}" data-logo-url="${escapeHtml(seasonText(row.logo_url, ""))}"></div>
              <div><h4>${escapeHtml(seasonTeamName(row))}</h4><span class="season-team-division">${escapeHtml(seasonDivision(row))}</span></div>
            </div>
            <div class="season-team-highlights">
              <div><span>POÄNG</span><strong>${seasonNumber(row.table_points)}</strong></div>
              <div><span>GRUPPLACERING</span><strong>${row.table_position ? `#${seasonNumber(row.table_position)}` : "–"}</strong></div>
              <div class="${playoffClass}"><span>SLUTSPEL</span><strong>${escapeHtml(playoff)}</strong></div>
            </div>
            <section class="season-team-card__stats">
              <h5>GRUPPSPEL</h5>
              <dl>
                <div><dt>GRUPP</dt><dd>${escapeHtml(seasonText(row.group_name))}</dd></div>
                <div><dt>MATCHER</dt><dd>${seasonNumber(row.games_played)}</dd></div>
                <div><dt>RECORD</dt><dd>${record(row)}</dd></div>
                <div><dt>P/G</dt><dd>${pointsPerGame(row).toFixed(2).replace(".", ",")}</dd></div>
                <div><dt>GF–GA</dt><dd>${seasonNumber(row.goals_for)}–${seasonNumber(row.goals_against)}</dd></div>
                <div><dt>MÅL +/−</dt><dd>${signed(row.goal_diff)}</dd></div>
                <div><dt>SV SPELARE</dt><dd>${seasonNumber(row.swedish_players)}</dd></div>
                <div><dt>SV POÄNG</dt><dd>${seasonNumber(row.swedish_points)}</dd></div>
              </dl>
            </section>
            ${playoffGames ? `<section class="season-team-card__stats season-team-card__stats--playoff">
              <h5>SLUTSPEL</h5>
              <dl>
                <div><dt>RUNDA</dt><dd>${escapeHtml(seasonText(row.playoff_round))}</dd></div>
                <div><dt>MATCHER</dt><dd>${seasonNumber(row.playoff_wins)}–${seasonNumber(row.playoff_losses)}</dd></div>
                <div><dt>FORMAT</dt><dd>${row.playoff_best_of ? `BO${seasonNumber(row.playoff_best_of)}` : "–"}</dd></div>
                <div><dt>GF–GA</dt><dd>${seasonNumber(row.playoff_goals_for)}–${seasonNumber(row.playoff_goals_against)}</dd></div>
              </dl>
            </section>` : ""}
            ${topPlayer ? `<p class="season-team-card__note"><strong>TOPP SVENSK:</strong> ${escapeHtml(topPlayer)}, ${seasonNumber(row.top_swedish_points)}p</p>` : ""}
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

  function initializeSeasonStatistics(view, playerRows) {
    const stage = view.querySelector("#seasonStatsStage");
    const type = view.querySelector("#seasonStatsType");
    const division = view.querySelector("#seasonStatsDivision");
    const search = view.querySelector("#seasonStatsSearch");
    const podium = view.querySelector("#seasonStatsPodium");
    const host = view.querySelector("#seasonStatsTable");
    if (!stage || !type || !division || !search || !podium || !host) return;

    const render = () => {
      const prefix = stage.value === "playoff" ? "playoff" : "regular";
      const goalie = type.value === "goalie";
      const query = search.value.trim().toLowerCase();
      const rows = playerRows.map((row) => ({
        row,
        name: seasonPlayerName(row),
        team: seasonTeamName(row),
        division: seasonDivision(row).toLowerCase(),
        gp: seasonNumber(row[`${prefix}_${goalie ? "goalie" : "skater"}_games`]),
        goals: seasonNumber(row[`${prefix}_goals`]),
        assists: seasonNumber(row[`${prefix}_assists`]),
        points: seasonNumber(row[`${prefix}_points`]),
        saves: seasonNumber(row[`${prefix}_goalie_saves`]),
        shots: seasonNumber(row[`${prefix}_goalie_shots_against`]),
        shutouts: seasonNumber(row[`${prefix}_goalie_shutouts`])
      })).filter((item) => item.gp > 0 &&
        (division.value === "all" || item.division === division.value) &&
        (!query || `${item.name} ${item.team}`.toLowerCase().includes(query))
      ).sort((a, b) => goalie ? b.gp - a.gp || b.saves - a.saves : b.points - a.points || b.goals - a.goals);

      podium.innerHTML = rows.slice(0, 3).map((item, index) => `<article><span>${index + 1}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.team)}</small><b>${goalie ? `${item.gp} GP` : `${item.points} PTS`}</b></article>`).join("");
      const headings = goalie
        ? `<tr><th>#</th><th>Spelare</th><th>Lag</th><th>GP</th><th>SV</th><th>SV%</th><th>SO</th></tr>`
        : `<tr><th>#</th><th>Spelare</th><th>Lag</th><th>GP</th><th>G</th><th>A</th><th>PTS</th></tr>`;
      const body = rows.map((item, index) => goalie
        ? `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.team)}</td><td>${item.gp}</td><td>${item.saves}</td><td>${item.shots ? (100 * item.saves / item.shots).toFixed(1).replace(".", ",") : "–"}</td><td>${item.shutouts}</td></tr>`
        : `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.team)}</td><td>${item.gp}</td><td>${item.goals}</td><td>${item.assists}</td><td>${item.points}</td></tr>`
      ).join("");
      host.innerHTML = `<div class="season-table-wrap"><table class="season-data-table"><thead>${headings}</thead><tbody>${body || `<tr><td colspan="7">Ingen statistik matchar filtret.</td></tr>`}</tbody></table></div>`;
    };
    [stage, type, division].forEach((control) => control.addEventListener("change", render));
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

    status.textContent = selectedSection === "teams" || selectedSection === "statistics"
      ? "Hämtar aktuell säsongsdata från Supabase…"
      : "Hämtar säsongsarkivet…";

    const legacy = await seasonFetchLegacyData();
    if (!view.isConnected) return;

    try {
      if (selectedSection === "matches") {
        if (!legacy) throw new Error("Matchfilen svenskstatistikecl26spring.json kunde inte hämtas.");
        initializeSeasonMatches(view, legacy);
        status.textContent = "Svenska matcher från ECL 26 Spring";
      } else if (selectedSection === "transfers") {
        if (!legacy) throw new Error("Den daterade byteshistoriken kunde inte hämtas.");
        initializeSeasonTransfers(view, legacy);
        status.textContent = "Daterade svenska spelarbyten";
      } else if (selectedSection === "teams") {
        const archivedTeams = seasonLegacyTeams(legacy);
        const teams = archivedTeams.length ? [] : await seasonFetchLeagueSet("v_ehockey_team_tournaments_web_v14", season.leagueIds, {
          select: "team_id,league_id,current_name,name_used_in_tournament,effective_country,division,division_rank,group_name,table_position,games_played,wins,losses,table_points,goal_diff,playoff_games",
          effective_country: `eq.${season.countryCode}`
        });
        const effectiveTeams = archivedTeams.length ? archivedTeams : teams;
        initializeSeasonTeams(view, effectiveTeams);
        status.textContent = archivedTeams.length
          ? "Svenska lag och slutspelsstatus från ECL 26 Spring"
          : "Svenska lag hämtade från Supabase";
      } else if (selectedSection === "statistics") {
        const playerRows = await seasonFetchLeagueSet("v_ehockey_player_tournaments_web_v14", season.leagueIds, {
          select: "player_key,sports_gamer_player_id,display_gamertag,player_country,league_id,division,team_id,team_name_in_tournament,regular_skater_games,regular_goals,regular_assists,regular_points,regular_goalie_games,regular_goalie_saves,regular_goalie_shots_against,regular_goalie_shutouts,playoff_skater_games,playoff_goals,playoff_assists,playoff_points,playoff_goalie_games,playoff_goalie_saves,playoff_goalie_shots_against,playoff_goalie_shutouts,total_skater_games,total_goals,total_assists,total_points,total_goalie_games,total_goalie_saves,total_goalie_shots_against,total_goalie_shutouts",
          player_country: `eq.${season.countryCode}`
        });
        const effectivePlayerRows = playerRows.length ? playerRows : seasonLegacyPlayerRows(legacy);
        initializeSeasonStatistics(view, effectivePlayerRows);
        status.textContent = playerRows.length
          ? "Svensk spelarstatistik hämtad från Supabase"
          : "Svensk spelarstatistik visas från säsongsarkivet";
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

    const sections = [
      "overview",
      "matches",
      "transfers",
      "teams",
      "statistics"
    ];

    const selectedSection = sections.includes(
      route.query.get("section")
    )
      ? route.query.get("section")
      : "overview";

    const seasonTitle =
      view.querySelector("#seasonTitle");

    const overviewTitle =
      view.querySelector("#seasonOverviewTitle");

    const teamsLink =
      view.querySelector("#seasonTeamsLink");

    if (seasonTitle) {
      seasonTitle.innerHTML =
        season.title.replace(": ", ":<br>");
    }

    if (overviewTitle) {
      overviewTitle.textContent =
        season.title;
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

    if (season.leagueIds?.length) {
      const overview = view.querySelector(".season-overview");
      const panels = view.querySelector(".season-panels");

      if (overview) {
        overview.innerHTML = `
          <p class="directory-kicker">SÄSONG</p>
          <h2>${escapeHtml(season.title)}</h2>
          <p>Samlad ingång till svenska lag, spelare, matcher och historik för säsongen.</p>
          <div class="season-landing-grid">
            <a class="season-landing-card" href="${seasonSectionRoute(seasonId, "transfers")}">
              <span>01</span><h3>Byten</h3><p>Svenska spelarbyten under ECL 26 Spring.</p>
            </a>
            <a class="season-landing-card" href="${seasonSectionRoute(seasonId, "matches")}">
              <span>02</span><h3>Matcher</h3><p>Alla svenska matcher, resultat och datum.</p>
            </a>
            <a class="season-landing-card" href="${seasonSectionRoute(seasonId, "teams")}">
              <span>03</span><h3>Lag</h3><p>Svenska lag i Elite, Pro, Lite, Core och Neo.</p>
            </a>
            <a class="season-landing-card" href="${seasonSectionRoute(seasonId, "statistics")}">
              <span>04</span><h3>Statistik</h3><p>Topplistor och statistik för svenska spelare.</p>
            </a>
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
            <div class="season-legacy-controls">
              <label><span>DIVISION</span><select id="seasonMatchDivision"><option value="all">Alla divisioner</option><option value="elite">Elite</option><option value="pro">Pro</option><option value="lite">Lite</option><option value="core">Core</option><option value="neo">Neo</option></select></label>
              <label><span>SÖK</span><input id="seasonMatchSearch" type="search" placeholder="Sök lag, grupp eller datum…"></label>
            </div>
            <div class="season-summary-bar" id="seasonMatchSummary"></div>
            <div class="season-match-list" id="seasonMatchList"></div>
          </section>
          <section class="season-data-section" id="transfers" data-season-section="transfers">
            <div class="season-data-heading"><div><span>BYTEN</span><h3>Svenska ECL-byten</h3></div></div>
            <p>Spelare, datum, tidigare lag och nytt lag – samma daterade byteshistorik som på den gamla sidan.</p>
            <div class="season-legacy-controls"><label><span>SÖK</span><input id="seasonTransferSearch" type="search" placeholder="Sök spelare eller lag…"></label></div>
            <div class="season-summary-bar" id="seasonTransferSummary"></div>
            <div class="season-transfer-list" id="seasonTransferList"></div>
          </section>
          <section class="season-data-section" id="teams" data-season-section="teams">
            <div class="season-data-heading"><div><span>LAG</span><h3>Svenska eHockey-lag</h3><p>Här samlas svenska lag i ECL 26 Spring med division, tabellplacering, poäng och aktuell slutspelsstatus.</p></div></div>
            <div class="season-team-controls">
              <label><span>DIVISION</span><select id="seasonTeamDivision"><option value="all">Alla divisioner</option><option value="elite">Elite</option><option value="pro">Pro</option><option value="lite">Lite</option><option value="core">Core</option><option value="neo">Neo</option></select></label>
              <label><span>SORTERA</span><select id="seasonTeamSort"><option value="division">Division + poäng</option><option value="name-asc">Namn A–Ö</option><option value="name-desc">Namn Ö–A</option><option value="players-desc">Flest spelare</option><option value="points-desc">Flest poäng</option><option value="ppg-desc">Bäst poängsnitt</option><option value="form-desc">Bäst form</option><option value="swedish-points-desc">Flest svenska poäng</option><option value="matches-desc">Flest matcher</option></select></label>
              <label class="season-team-controls__search"><span>SÖK</span><input id="seasonTeamSearch" type="search" placeholder="Sök lag eller division…"></label>
              <label class="season-team-toggle"><input id="seasonTeamPlayoffOnly" type="checkbox"><span>Endast slutspel</span></label>
              <label class="season-team-toggle"><input id="seasonTeamAliveOnly" type="checkbox"><span>Endast lag kvar</span></label>
            </div>
            <div class="season-summary-bar" id="seasonTeamSummary"></div>
            <div class="season-team-list" id="seasonTeamsList"></div>
          </section>
          <section class="season-data-section" id="statistics" data-season-section="statistics">
            <div class="season-data-heading"><div><span>STATISTIK</span><h3>Svensk statistik</h3></div></div>
            <div class="season-stats-menu">
              <label><span>SPELFORM</span><select id="seasonStatsStage"><option value="regular">Grundserie</option><option value="playoff">Slutspel</option></select></label>
              <label><span>SPELARTYP</span><select id="seasonStatsType"><option value="skater">Utespelare</option><option value="goalie">Målvakter</option></select></label>
              <label><span>DIVISION</span><select id="seasonStatsDivision"><option value="all">Alla divisioner</option><option value="elite">Elite</option><option value="pro">Pro</option><option value="lite">Lite</option><option value="core">Core</option><option value="neo">Neo</option></select></label>
              <label><span>SÖK</span><input id="seasonStatsSearch" type="search" placeholder="Sök spelare eller lag…"></label>
            </div>
            <div class="season-stats-podium" id="seasonStatsPodium"></div>
            <div id="seasonStatsTable"></div>
          </section>
        `;
      }

      loadSeasonDashboard(view, season, selectedSection);
    }

    view
      .querySelectorAll(".season-subnav a")
      .forEach((anchor) => {
        const original =
          String(anchor.getAttribute("href") || "");

        const section =
          original.replace(/^#/, "") || "overview";

        anchor.href =
          seasonSectionRoute(
            seasonId,
            section
          );

        anchor.classList.toggle(
          "is-active",
          section === selectedSection
        );
      });

    view
      .querySelector(".season-subnav")
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

    bindHeader(
      header,
      route
    );

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
    () => {
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