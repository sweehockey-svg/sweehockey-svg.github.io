(() => {
  "use strict";

  const cfg = window.EHOCKEY_CONFIG || {};
  const supabaseUrl = String(cfg.supabaseUrl || "").trim();
  const supabaseKey = String(cfg.supabasePublishableKey || "").trim();

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clean = (value) => String(value ?? "").trim();
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  if (!window.supabase?.createClient || !supabaseUrl || !supabaseKey) {
    $("gateTitle").textContent = "Fantasy kunde inte startas";
    $("gateText").textContent = "Supabase-inställningarna saknas eller kunde inte laddas.";
    $("discordLogin").hidden = true;
    return;
  }

  const sb = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: "seh-scl27-fantasy-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const state = {
    competitions: [],
    competition: null,
    pool: [],
    leaderboard: [],
    session: null,
    account: null,
    entry: null,
    picks: new Map(),
    savedPicks: new Map(),
    savedScores: new Map(),
    savedBreakdowns: new Map(),
    formerPlayers: [],
    transferState: null,
    insights: null,
    ownership: new Map(),
    activeTab: "team",
    pendingPlacementPlayerId: null,
    pickerSlot: null,
    swapSlot: null
  };

  const DEFAULT_SCL_LOGO = "https://fhr.fra1.cdn.digitaloceanspaces.com/NHLGamer/Community/uploads/monthly_2021_08/large.SCL_logo_shading.png.eb94cae29f362f6a451128a25ebfa3ae.png";
  const LEAGUE_BRANDS = {
    SCL: {
      label: "SCL",
      logo: DEFAULT_SCL_LOGO,
      accent: "#21b8ff",
      accentRgb: "33,184,255"
    },
    ECL: {
      label: "ECL",
      logo: "assets/leagues/ecl.png",
      accent: "#d72b2b",
      accentRgb: "215,43,43"
    },
    FCL: {
      label: "FCL",
      accent: "#e7edf4",
      accentRgb: "231,237,244"
    },
    WEL: {
      label: "WEL",
      accent: "#00aeea",
      accentRgb: "0,174,234"
    },
    GCL: {
      label: "GCL",
      accent: "#d62828",
      accentRgb: "214,40,40"
    }
  };

  function competitionCode() {
    return clean(state.competition?.code || "SCL27");
  }

  function leagueCode() {
    return clean(state.competition?.competition_code || "SCL").toUpperCase();
  }

  function seasonLabel() {
    return clean(state.competition?.season_label || state.competition?.name || leagueCode());
  }

  function leagueBrand() {
    const key = leagueCode();
    const fallback = LEAGUE_BRANDS.SCL;
    const base = LEAGUE_BRANDS[key] || {
      label: key || "FANTASY",
      accent: fallback.accent,
      accentRgb: fallback.accentRgb
    };
    const settings = state.competition?.settings || {};
    return {
      ...base,
      logo: clean(settings.brand_logo) || base.logo || fallback.logo,
      accent: clean(settings.brand_accent) || base.accent || fallback.accent,
      accentRgb: base.accentRgb || fallback.accentRgb
    };
  }

  function nationalityScope() {
    return clean(state.competition?.settings?.nationality_scope || "all").toLowerCase();
  }

  function fantasyCountryAllowed(countryCode) {
    const scope = nationalityScope();
    const code = clean(countryCode).toUpperCase();

    if (scope === "all") return true;
    if (scope === "sweden") return ["SE","SWE","SWEDEN"].includes(code);
    if (scope === "scandinavia") {
      return [
        "SE","SWE","SWEDEN",
        "DK","DNK","DEN","DENMARK",
        "NO","NOR","NORWAY"
      ].includes(code);
    }
    return true;
  }

  function format(value, digits = 0) {
    return new Intl.NumberFormat("sv-SE", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(number(value));
  }

  function formatDate(value) {
    const raw = clean(value);
    if (!raw) return "–";
    const date = new Date(raw.length === 10 ? raw + "T12:00:00" : raw);
    if (Number.isNaN(date.valueOf())) return raw;
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function setStatus(id, text, tone = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    if (tone) el.dataset.tone = tone;
    else el.removeAttribute("data-tone");
  }

  function formatDeadline(value) {
    const raw = clean(value);
    if (!raw) return "Ej satt";
    const date = new Date(raw);
    if (Number.isNaN(date.valueOf())) return raw;
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm"
    }).format(date);
  }

  function ownershipFor(playerId) {
    return state.ownership.get(Number(playerId)) || null;
  }

  function ownershipText(playerId) {
    const row = ownershipFor(playerId);
    if (!state.insights?.ownership_visible) return "Ägarinfo efter deadline";
    if (!row) return "Ägs av 0 % · Kapten 0 %";
    return "Ägs av " + format(row.ownership_pct, number(row.ownership_pct) % 1 ? 1 : 0) +
      " % · Kapten " + format(row.captain_pct, number(row.captain_pct) % 1 ? 1 : 0) + " %";
  }

  function differentialMarkup(playerId) {
    const row = ownershipFor(playerId);
    const entries = number(state.insights?.ownership_period?.entries);
    if (!state.insights?.ownership_visible || !row || entries < 10 || number(row.ownership_pct) >= 5) return "";
    return '<span class="fantasy-differential">DIFFERENTIAL</span>';
  }

  function renderPeriodHub() {
    const host = $("periodHub");
    if (!host) return;

    const insights = state.insights || {};
    const period = insights.period || null;
    const entries = number(insights.entries || state.leaderboard.length);
    const ownershipVisible = Boolean(insights.ownership_visible);

    if (!period) {
      $("periodHubEyebrow").textContent = "FÖRSÄSONG";
      $("periodHubName").textContent = "Fantasy-perioderna är inte klara";
      $("periodHubWindow").textContent = "Periodinformationen visas när tävlingen har konfigurerats.";
      $("periodHubMatches").textContent = "0";
      $("periodHubEntries").textContent = String(entries);
      $("periodHubOwnership").textContent = "Efter deadline";
      $("periodHubDeadline").textContent = "Ej satt";
      return;
    }

    const status = clean(period.status);
    $("periodHubEyebrow").textContent =
      status === "simulation" ? "TESTSÄSONG / AKTUELL PERIOD" :
      status === "live" ? "PÅGÅR NU" :
      status === "finished" ? "SENASTE FANTASY-PERIOD" :
      "NÄSTA FANTASY-PERIOD";
    $("periodHubName").textContent = clean(period.name) || ("Period " + (period.round_no || "–"));
    $("periodHubWindow").textContent =
      formatDate(period.starts_at) + " – " + formatDate(period.ends_at) +
      " · " + (clean(period.phase) || "SCL");
    $("periodHubMatches").textContent = String(number(period.matches_played));
    $("periodHubEntries").textContent = String(entries);
    $("periodHubOwnership").textContent = ownershipVisible
      ? (clean(insights.ownership_period?.name) || "Publicerad")
      : "Efter deadline";
    $("periodHubDeadline").textContent = formatDeadline(period.lock_at);
  }

  function renderTransferStatus() {
    const panel = $("transferPanel");
    if (!panel) return;

    const info = state.transferState;
    const mode = clean(info?.mode || "preseason");
    const unlimited = Boolean(info?.unlimited);
    const target = info?.target_round || null;
    const extraCost = number(info?.extra_transfer_cost || 10);
    const free = number(info?.free_transfers || 0);

    $("transferMode").textContent =
      mode === "preseason"
        ? "INFÖR SÄSONGEN · OBEGRÄNSADE BYTEN"
        : mode === "unlimited"
          ? (clean(target?.name) || "FRI BYTESPERIOD")
          : mode === "round"
            ? (clean(target?.name) || "KOMMANDE PERIOD")
            : mode === "closed"
              ? "BYTESFÖNSTRET STÄNGT"
              : "BYTEN AVSTÄNGDA";

    $("transferFree").textContent = unlimited ? "∞" : String(free);
    $("transferNext").textContent = unlimited || free > 0 ? "0 P" : "−" + format(extraCost) + " P";
    $("transferDeadline").textContent = target?.lock_at ? formatDeadline(target.lock_at) : "Ej satt";

    $("transferDetail").textContent = unlimited
      ? "Bygg om fritt fram till första Fantasy-periodens deadline kl. 18:00 svensk tid. Därefter: 1 gratis byte per period, max 2 sparade."
      : mode === "round"
        ? "1 gratis byte per period · max 2 sparade · extra byte kostar −" + format(extraCost) + " P. Kaptensbyte är gratis."
        : mode === "closed"
          ? "Inga fler Fantasy-perioder är öppna för byten."
          : "Bytesreglerna är inte aktiva just nu.";
  }

  let rosterToastTimer = null;

  function showRosterError(message) {
    const text = clean(message) || "Det gick inte att göra det valet.";
    setStatus("saveStatus", text, "error");

    const toast = $("fantasyToast");
    if (!toast) return;

    toast.textContent = text;
    toast.dataset.tone = "error";
    toast.classList.add("is-visible");

    if (rosterToastTimer) clearTimeout(rosterToastTimer);
    rosterToastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 4200);
  }

  function isDiscordUser(user) {
    if (!user) return false;
    const provider = String(user.app_metadata?.provider || "").toLowerCase();
    if (provider === "discord") return true;
    if ((user.app_metadata?.providers || []).some((item) => String(item).toLowerCase() === "discord")) return true;
    return (user.identities || []).some((identity) => String(identity?.provider || "").toLowerCase() === "discord");
  }

  function competitionOpen() {
    const comp = state.competition;
    if (!comp || comp.status !== "open") return false;

    if (comp.transfers_enabled) {
      const mode = clean(state.transferState?.mode);
      return mode !== "closed" && mode !== "disabled";
    }

    if (!comp.lock_at) return true;
    return new Date(comp.lock_at).getTime() > Date.now();
  }

  function competitionStatusLabel(status) {
    const key = clean(status).toLowerCase();
    const labels = {
      setup: "UPPSTART",
      open: "ÖPPEN",
      locked: "LÅST",
      live: "PÅGÅR",
      finished: "AVSLUTAD",
      archived: "ARKIVERAD"
    };
    return labels[key] || clean(status || "UPPSTART").toUpperCase();
  }

  function eligibleSlots(player) {
    const explicit = Array.isArray(player?.eligible_slots)
      ? player.eligible_slots.map((item) => clean(item).toUpperCase()).filter(Boolean)
      : [];

    if (explicit.length) return [...new Set(explicit)];

    const pos = clean(player?.primary_position).toUpperCase();
    if (pos === "F" || pos === "FORWARD") return ["LW", "C", "RW"];
    if (pos === "D" || pos === "DEF" || pos === "BACK") return ["LD", "RD"];
    if (["LW", "C", "RW", "LD", "RD", "G"].includes(pos)) return [pos];
    return [];
  }

  function formatPoints(value) {
    const rounded = Math.round(number(value) * 100) / 100;
    const digits = Number.isInteger(rounded) ? 0 : (Number.isInteger(rounded * 10) ? 1 : 2);
    return format(rounded, digits);
  }

  function breakdownKey(playerId, slot) {
    return Number(playerId) + ":" + clean(slot).toUpperCase();
  }

  function savedPickMatches(slot, pick) {
    const saved = state.savedPicks.get(slot);
    return Boolean(
      saved &&
      pick &&
      Number(saved.player?.id) === Number(pick.player?.id) &&
      Boolean(saved.isCaptain) === Boolean(pick.isCaptain)
    );
  }

  function savedScoreBreakdown(slot, pick) {
    if (!savedPickMatches(slot, pick)) return null;

    const row = state.savedScores.get(Number(pick.player.id));
    const detail = state.savedBreakdowns.get(breakdownKey(pick.player.id, slot)) || null;
    const base = detail ? number(detail.total_points) : number(row?.fantasy_points);
    const multiplier = pick.isCaptain ? number(state.competition?.captain_multiplier || 1) : 1;
    const historyMode = Boolean(detail?.history_mode);
    const total = detail && detail.team_points != null
      ? number(detail.team_points)
      : base * multiplier;

    return {
      base,
      multiplier,
      total,
      games: detail ? number(detail.games) : number(row?.games),
      roundCount: detail ? number(detail.round_count) : 0,
      captainBonus: detail ? number(detail.captain_bonus_points) : Math.max(0, total - base),
      historyMode,
      detail
    };
  }

  function savedScoreMeta(savedScore, pick) {
    if (!savedScore) return "";

    if (savedScore.historyMode) {
      const parts = [];
      parts.push(savedScore.games + " matcher");
      if (savedScore.roundCount > 0) parts.push(savedScore.roundCount + (savedScore.roundCount === 1 ? " period" : " perioder"));
      if (savedScore.captainBonus > 0) parts.push("+" + formatPoints(savedScore.captainBonus) + " kaptensbonus");
      return parts.join(" · ");
    }

    return pick.isCaptain
      ? formatPoints(savedScore.base) + " × " + format(savedScore.multiplier, savedScore.multiplier % 1 ? 1 : 0)
      : savedScore.games + " matcher";
  }

  function scorePill(label, value, points, tone = "") {
    const pointValue = number(points);
    const pointText = pointValue === 0
      ? "0 P"
      : (pointValue > 0 ? "+" : "") + formatPoints(pointValue) + " P";

    return `
      <div class="fantasy-slot__detail-pill${tone ? " fantasy-slot__detail-pill--" + tone : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${format(value, number(value) % 1 ? 1 : 0)}</strong>
        <em>${pointText}</em>
      </div>
    `;
  }

  function savedStatMarkup(savedScore) {
    const d = savedScore?.detail;
    if (!d) return "";

    const forwardGames = number(d.forward_games);
    const defenseGames = number(d.defense_games);
    const goalieGames = number(d.goalie_games);

    if (goalieGames >= forwardGames && goalieGames >= defenseGames && goalieGames > 0) {
      return [
        scorePill("Vinster", d.goalie_wins, d.win_points, "success"),
        scorePill("Räddn", d.goalie_saves, d.save_points, "ice"),
        scorePill("Nollor", d.goalie_shutouts, d.shutout_points, "ice")
      ].join("");
    }

    if (defenseGames > forwardGames) {
      return [
        scorePill("Mål", d.goals, d.goal_points, "goal"),
        scorePill("Assist", d.assists, d.assist_points, "assist"),
        scorePill("Block", d.blocked_shots, d.block_points, "ice")
      ].join("");
    }

    return [
      scorePill("Mål", d.goals, d.goal_points, "goal"),
      scorePill("Assist", d.assists, d.assist_points, "assist"),
      scorePill("Avg. mål", d.game_winning_goals, d.gwg_points, "success")
    ].join("");
  }

  function draftMatchesSavedRoster() {
    if (!state.entry || state.picks.size !== state.savedPicks.size) return false;

    for (const [slot, pick] of state.picks.entries()) {
      if (!savedPickMatches(slot, pick)) return false;
    }

    return true;
  }

  function countryFlagMarkup(code) {
    const normalized = clean(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      return '<span class="fantasy-country-flag fantasy-country-flag--fallback" aria-label="Okänt land">🌐</span>';
    }

    return '<img class="fantasy-country-flag" src="https://flagcdn.com/24x18/' +
      encodeURIComponent(normalized.toLowerCase()) +
      '.png" data-fantasy-country-flag data-country-code="' +
      escapeHtml(normalized) +
      '" alt="' + escapeHtml(normalized) +
      '" title="' + escapeHtml(normalized) +
      '" width="24" height="18" loading="lazy">';
  }

  function playerPortraitUrls(player) {
    const id = clean(player?.sports_gamer_player_id).replace(/\D/g, "");
    const fallback = "../players/1DEFAULTBILDID.png";
    if (!id) return { src: fallback, original: "", fallback };
    return {
      src: "../web-images/players/" + encodeURIComponent(id + ".png") + ".webp",
      original: "../players/" + encodeURIComponent(id + ".png"),
      fallback
    };
  }

  function portraitMarkup(player, className = "") {
    const urls = playerPortraitUrls(player);
    return '<img class="' + escapeHtml(className) + '" src="' + escapeHtml(urls.src) +
      '" data-fantasy-portrait data-original="' + escapeHtml(urls.original) +
      '" data-default="' + escapeHtml(urls.fallback) +
      '" data-fallback-step="0" alt="' + escapeHtml(player?.display_gamertag || "") + '" loading="lazy">';
  }

  function teamLogoMarkup(player, className = "") {
    const url = clean(player?.team_logo_url);
    if (!url) return "";
    return '<img class="' + escapeHtml(className) + '" src="' + escapeHtml(url) +
      '" data-fantasy-team-logo alt="" loading="lazy">';
  }

  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;

    if (image.hasAttribute("data-fantasy-portrait")) {
      const step = number(image.dataset.fallbackStep);
      const original = clean(image.dataset.original);
      const fallback = clean(image.dataset.default) || "../players/1DEFAULTBILDID.png";

      if (step === 0 && original) {
        image.dataset.fallbackStep = "1";
        image.src = original;
        return;
      }

      if (step <= 1 && image.src !== new URL(fallback, window.location.href).href) {
        image.dataset.fallbackStep = "2";
        image.src = fallback;
        return;
      }

      image.classList.add("is-default");
      return;
    }

    if (image.hasAttribute("data-fantasy-country-flag")) {
      const code = clean(image.dataset.countryCode).toUpperCase();
      const fallback = document.createElement("span");
      fallback.className = "fantasy-country-flag fantasy-country-flag--text";
      fallback.textContent = code || "🌐";
      fallback.setAttribute("aria-label", code || "Okänt land");
      image.replaceWith(fallback);
      return;
    }

    if (image.hasAttribute("data-fantasy-team-logo")) {
      image.hidden = true;
    }
  }, true);

  function selectedIds() {
    return new Set([...state.picks.values()].map((pick) => Number(pick.player.id)));
  }

  function playerById(id) {
    return state.pool.find((row) => Number(row.id) === Number(id)) || null;
  }

  function usedBudget() {
    return [...state.picks.values()].reduce((sum, pick) => sum + number(pick.player.price), 0);
  }

  function realTeamCount(player) {
    if (player?.real_team_id == null) return 0;
    return [...state.picks.values()].filter(
      (pick) => String(pick.player.real_team_id) === String(player.real_team_id)
    ).length;
  }

  function updateHeaderAccount() {
    const button = $("accountButton");
    if (!button) return;

    if (!state.session?.user) {
      button.textContent = "Logga in med Discord";
      button.dataset.action = "login";
      return;
    }

    const playerName = clean(state.account?.player_name || state.account?.playerName);
    button.textContent = playerName ? playerName : "Logga ut";
    button.dataset.action = "logout";
  }

  function renderCompetitionBranding() {
    const comp = state.competition;
    if (!comp) return;

    const brand = leagueBrand();
    const league = brand.label || leagueCode();
    const season = seasonLabel();
    const settings = comp.settings || {};
    const betaSource = clean(settings.beta_source);
    const setupMessage = clean(settings.setup_message);
    const scope = nationalityScope();
    const scopeText =
      scope === "sweden" ? "svenska spelare" :
      scope === "scandinavia" ? "skandinaviska spelare" :
      "alla spelare";

    document.body.dataset.fantasyLeague = league.toLowerCase();
    document.documentElement.style.setProperty("--league-accent", brand.accent);
    document.documentElement.style.setProperty("--league-accent-rgb", brand.accentRgb);
    document.title = season + " Fantasy" + (settings.beta_mode ? " Beta" : "");

    const selector = $("competitionSelect");
    if (selector) {
      selector.innerHTML = state.competitions.map((row) =>
        '<option value="' + escapeHtml(row.code) + '">' +
          escapeHtml(clean(row.season_label || row.name || row.code)) +
        '</option>'
      ).join("");
      selector.value = comp.code;
    }

    const logoNodes = [$("leagueBrandLogo"), $("heroLeagueLogo")].filter(Boolean);
    logoNodes.forEach((node) => {
      node.src = brand.logo;
      node.alt = league;
    });

    if ($("leagueBrandSeason")) $("leagueBrandSeason").textContent = "eHOCKEY FANTASY";
    if ($("heroLeagueLab")) $("heroLeagueLab").innerHTML = '<span></span>' + escapeHtml(league + " FANTASY");
    if ($("heroLeagueSix")) $("heroLeagueSix").textContent = league + "-SEXA.";
    if ($("heroBuildButton")) $("heroBuildButton").textContent = "Bygg din " + league + "-sexa";
    if ($("scoreboardLeagueTitle")) $("scoreboardLeagueTitle").textContent = season + " FANTASY";
    if ($("footerCompetitionLabel")) $("footerCompetitionLabel").textContent = season + " Fantasy";

    const intro = comp.status === "setup"
      ? (setupMessage || season + " Fantasy är under uppbyggnad.")
      : betaSource
        ? "Välj sex spelare, håll dig under budget och utse din kapten. Spelarpoolen bygger just nu på " + betaSource + "."
        : "Välj sex spelare, håll dig under budget och utse din kapten. Fantasy följer spelarnas riktiga matcher och resultat.";
    if ($("heroLead")) $("heroLead").textContent = intro;

    if ($("betaRibbonTitle")) {
      $("betaRibbonTitle").textContent = betaSource ? "BETAPOOL: " + betaSource.toUpperCase() : season.toUpperCase() + " FANTASY";
    }
    if ($("betaRibbonText")) {
      $("betaRibbonText").textContent = comp.status === "setup"
        ? (setupMessage || "Fantasy-ligan förbereds.")
        : "Spelarurval: " + scopeText + ".";
    }
    if ($("scoreboardSource")) {
      $("scoreboardSource").textContent = betaSource
        ? betaSource.toUpperCase()
        : (comp.status === "setup" ? "SPELARPOOL EJ PUBLICERAD" : scopeText.toUpperCase());
    }
    if ($("commandMode")) {
      $("commandMode").textContent =
        season.toUpperCase() + " / " +
        (comp.status === "setup" ? "UNDER UPPBYGGNAD" :
          comp.status === "open" ? "LAGBYGGE ÖPPET" :
          competitionStatusLabel(comp.status));
    }
    if ($("commandPoolCount")) $("commandPoolCount").textContent = state.pool.length + " SPELARE";

    if ($("setupBannerTitle")) $("setupBannerTitle").textContent = season + " är under uppbyggnad";
    if ($("setupBannerText")) {
      $("setupBannerText").textContent = setupMessage ||
        (state.pool.length ? "Fantasy-poolen är tillgänglig." : "Spelarpoolen är inte publicerad ännu.");
    }
    if ($("marketSourceLabel")) {
      $("marketSourceLabel").textContent = betaSource
        ? betaSource.toUpperCase()
        : (comp.status === "setup" ? "VÄNTAR PÅ SPELARPOOL" : season.toUpperCase());
    }
    if ($("playersKicker")) $("playersKicker").textContent = season.toUpperCase() + " / FANTASYSPELARE";
    if ($("playersIntro")) {
      $("playersIntro").textContent = comp.status === "setup"
        ? (setupMessage || "Spelarpoolen publiceras senare.")
        : "Här ser du de spelare som är valbara i " + season + " Fantasy.";
    }
    if ($("leaderboardTitle")) $("leaderboardTitle").textContent = season + " Fantasy";
    if ($("leaderboardIntro")) {
      $("leaderboardIntro").textContent = comp.status === "setup"
        ? "Topplistan öppnar när " + season + " Fantasy är igång."
        : "Topplistan uppdateras med riktiga Fantasy-poäng efter matcherna.";
    }
    if ($("rulesTitle")) $("rulesTitle").textContent = "Så fungerar " + league + " Fantasy";
    if ($("rulesIntro")) {
      $("rulesIntro").textContent = comp.status === "setup"
        ? season + " Fantasy är förberedd och reglerna kan finjusteras inför öppning."
        : "Bygg din " + league + "-sexa, håll budgeten och följ poängen period för period.";
    }
    if ($("ruleBudgetTitle")) $("ruleBudgetTitle").textContent = format(comp.budget || 0) + " CR";
    if ($("ruleBudgetText")) $("ruleBudgetText").textContent =
      "Hela startsexan måste rymmas inom " + format(comp.budget || 0) + " CR.";
    if ($("ruleTeamLimitTitle")) $("ruleTeamLimitTitle").textContent =
      "Max " + format(comp.max_players_per_real_team || 2) + " från samma lag";
    if ($("ruleTeamLimitText")) $("ruleTeamLimitText").textContent =
      "Du får välja högst " + format(comp.max_players_per_real_team || 2) + " spelare från samma riktiga lag.";
    if ($("ruleCaptainTitle")) $("ruleCaptainTitle").textContent =
      "Kapten " + format(comp.captain_multiplier || 1, 1) + "×";
    if ($("ruleCaptainText")) $("ruleCaptainText").textContent =
      "En spelare utses till kapten och får " +
      format((number(comp.captain_multiplier || 1) - 1) * 100) +
      " procent extra Fantasy-poäng.";

    const divisionBlock = $("divisionFactorBlock");
    if (divisionBlock) divisionBlock.hidden = league !== "ECL";
    const gclFactorBlock = $("gclFactorBlock");
    if (gclFactorBlock) gclFactorBlock.hidden = league !== "GCL";

    if ($("periodRulesText")) {
      $("periodRulesText").textContent = comp.status === "setup"
        ? season + " kommer att använda Fantasy-perioder. Deadlines, fria byten och eventuellt slutspelsreset publiceras innan ligan öppnar."
        : league === "SCL"
          ? "SCL spelas inte i fasta omgångar, så Fantasy delas i tidsbestämda perioder. Varje ny Fantasy-period låses kl. 18:00 svensk tid och matcherna räknas efter sin faktiska starttid. Före första perioden är byten obegränsade. Därefter får du 1 gratis byte per period och kan spara upp till 2. Extra byten kostar −10 Fantasy-poäng och kaptensbyte är gratis."
          : "Fantasy delas i tidsbestämda perioder. Matcherna räknas efter sin faktiska starttid och byten gäller från nästa låsta period.";
    }

    const betaRibbon = document.querySelector(".beta-ribbon");
    if (betaRibbon) betaRibbon.hidden = settings.beta_mode === false;

    const brandLink = $("leagueBrandLink");
    if (brandLink) brandLink.setAttribute("aria-label", season + " Fantasy");
  }

  function renderHero() {
    const comp = state.competition;
    renderCompetitionBranding();
    $("heroStart").textContent = comp?.starts_on ? formatDate(comp.starts_on).toUpperCase() : "EJ SATT";
    $("heroStatus").textContent = competitionStatusLabel(comp?.status || "setup");
    $("heroBudget").textContent = format(comp?.budget || 100);
    $("heroEntries").textContent = String(state.leaderboard.length || 0);
  }

  function showGate(kind, message = "") {
    $("accountGate").hidden = false;
    $("builder").hidden = true;
    $("discordLogin").hidden = false;
    $("connectProfile").hidden = true;
    setStatus("gateStatus", "");

    let title = "Logga in för att bygga ditt lag";
    let text = message || "Du måste vara inloggad med Discord och ha en godkänd spelarprofil kopplad för att skapa ett lag.";

    if (kind === "loading") {
      title = "Kontrollerar ditt konto…";
      text = "Kontrollerar Discord-inloggning och kopplad spelarprofil.";
      $("discordLogin").hidden = true;
    } else if (kind === "pending") {
      title = "Spelarkopplingen väntar på godkännande";
      text = message || "Din valda spelarprofil måste godkännas innan du kan skapa ett Fantasy-lag.";
      $("discordLogin").hidden = true;
    } else if (kind === "unlinked") {
      title = "Koppla din spelarprofil först";
      text = message || "Discord-kontot är inloggat men saknar en godkänd koppling till ett spelarkort.";
      $("discordLogin").hidden = true;
      $("connectProfile").hidden = false;
    } else if (kind === "wrong-account") {
      title = "Fantasy använder Discord-inloggning";
      text = message || "Logga ut från admin-/skribentkontot och logga sedan in med Discord.";
    }

    $("gateTitle").textContent = title;
    $("gateText").textContent = text;
  }

  function showBuilder() {
    $("accountGate").hidden = true;
    $("builder").hidden = false;

    const open = competitionOpen();
    const hasPool = state.pool.length > 0;

    $("setupBanner").hidden = open && hasPool;
    $("saveTeam").disabled = !(open && hasPool);
    $("linkedPlayer").textContent = clean(state.account?.player_name) || "Kopplad spelare";

    if (!hasPool) {
      setStatus("saveStatus", seasonLabel() + " har ingen publicerad spelarpool ännu.");
    } else if (!open) {
      setStatus("saveStatus", "Lagbygget är inte öppet ännu.");
    } else {
      setStatus("saveStatus", "");
    }
  }

  function renderLineup() {
    const budget = number(state.competition?.budget || 100);
    const used = usedBudget();
    const captainId = [...state.picks.values()].find((pick) => pick.isCaptain)?.player?.id || null;
    const saveButton = $("saveTeam");
    const invalidSlots = new Set(
      [...state.picks.entries()]
        .filter(([slot, pick]) => !eligibleSlots(pick.player).includes(slot))
        .map(([slot]) => slot)
    );
    const savedRosterIsCurrent = draftMatchesSavedRoster() && invalidSlots.size === 0;

    $("selectedCount").textContent = state.picks.size + " / 6";
    $("budgetUsed").textContent = format(used);
    $("budgetLeft").textContent = format(budget - used);
    $("budgetLeft").classList.toggle("over-budget", used > budget);

    if ($("teamPoints")) {
      $("teamPoints").textContent = state.entry ? formatPoints(state.entry.total_points) + " P" : "–";
      $("teamPoints").classList.toggle("is-stale", Boolean(state.entry) && !savedRosterIsCurrent);
    }
    if ($("teamPointsLabel")) {
      $("teamPointsLabel").textContent = state.entry && !savedRosterIsCurrent
        ? "SPARADE " + leagueCode() + "-POÄNG"
        : leagueCode() + "-POÄNG";
    }

    if (saveButton) {
      const complete = state.picks.size === 6;
      const hasCaptain = Boolean(captainId);
      const withinBudget = used <= budget;
      const savedAndUnchanged = Boolean(state.entry) && savedRosterIsCurrent;
      const canSave =
        competitionOpen() &&
        complete &&
        hasCaptain &&
        withinBudget &&
        invalidSlots.size === 0 &&
        !savedAndUnchanged;

      saveButton.disabled = !canSave;
      saveButton.classList.toggle("is-saved", savedAndUnchanged);
      saveButton.textContent = invalidSlots.size > 0
        ? "BYT OGILTIG SPELARE"
        : !complete
          ? "VÄLJ 6 SPELARE"
          : !hasCaptain
            ? "VÄLJ KAPTEN"
            : !withinBudget
              ? "ÖVER BUDGET"
              : savedAndUnchanged
                ? leagueCode() + "-LAG SPARAT"
                : state.entry
                  ? "UPPDATERA " + leagueCode() + "-LAG"
                  : "SPARA " + leagueCode() + "-LAG";
    }

    $$(".fantasy-slot").forEach((slotEl) => {
      const slot = slotEl.dataset.slot;
      const pick = state.picks.get(slot);

      if (!pick) {
        slotEl.classList.remove("is-filled", "is-captain-card", "is-invalid-slot");
        const count = state.pool.filter((player) =>
          player.is_available !== false &&
          !selectedIds().has(Number(player.id)) &&
          eligibleSlots(player).includes(slot)
        ).length;

        slotEl.innerHTML =
          '<span class="fantasy-slot__position">' + slot + '</span>' +
          '<button type="button" class="fantasy-slot__empty" data-open-slot="' + slot + '">' +
            '<strong>Välj ' + slot + '</strong>' +
            '<small>' + count + ' valbara</small>' +
          '</button>';
        return;
      }

      const player = pick.player;
      const captain = Number(captainId) === Number(player.id);
      const invalidSlot = invalidSlots.has(slot);
      const flag = countryFlagMarkup(player.country_code);
      const savedScore = savedScoreBreakdown(slot, pick);
      const scoreMarkup = savedScore && savedScore.games > 0
        ? `<div class="fantasy-slot__score">
            <div class="fantasy-slot__score-head">
              <span>${escapeHtml(seasonLabel())}</span>
              <strong>${formatPoints(savedScore.total)} P</strong>
            </div>
            <small>${escapeHtml(savedScoreMeta(savedScore, pick))}</small>
          </div>
          <div class="fantasy-slot__details">${savedStatMarkup(savedScore)}</div>`
        : (state.entry
          ? '<div class="fantasy-slot__score fantasy-slot__score--pending"><span>' + escapeHtml(seasonLabel()) + '</span><small>Inväntar riktiga matcher</small></div>'
          : "");

      slotEl.classList.add("is-filled");
      slotEl.classList.toggle("is-captain-card", captain);
      slotEl.classList.toggle("is-invalid-slot", invalidSlot);

      slotEl.innerHTML = `
        <div class="fantasy-slot__player fantasy-slot__player--club">
          <div class="fantasy-slot__club-stripe" aria-hidden="true"></div>
          ${teamLogoMarkup(player, "fantasy-slot__club-watermark")}
          <div class="fantasy-slot__visual">
            <div class="fantasy-slot__portrait-wrap fantasy-slot__portrait-wrap--club">
              ${portraitMarkup(player, "fantasy-slot__portrait")}
            </div>
            <div class="fantasy-slot__identity">
              <strong class="fantasy-player-name-line">${flag}<span class="fantasy-player-name">${escapeHtml(clean(player.display_gamertag) || "Okänd")}</span></strong>
              <small class="fantasy-slot__team fantasy-slot__club-row">
                <span class="fantasy-slot__club-logo">
                  ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--slot")}
                </span>
                <span class="fantasy-slot__club-copy">
                  <b>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</b>
                  <em>KLUBB</em>
                </span>
              </small>
              <small class="fantasy-slot__meta">${escapeHtml(eligibleSlots(player).join(" / "))} · ${format(player.price)} CR</small>
              ${invalidSlot ? '<small class="fantasy-slot__invalid-note">Ej giltig som ' + escapeHtml(slot) + ' · välj Byt</small>' : ""}
            </div>
          </div>
          ${scoreMarkup}
          <div class="fantasy-slot__actions">
            <button type="button" data-captain="${player.id}" class="${captain ? "is-captain" : ""}">
              ${captain ? "KAPTEN" : "Gör kapten"}
            </button>
            <button type="button" data-swap="${slot}">Byt</button>
          </div>
        </div>
      `;
    });
  }

  function filteredPlayers(searchId, positionId) {
    const query = clean($(searchId)?.value).toLocaleLowerCase("sv-SE");
    const position = clean($(positionId)?.value || "all").toUpperCase();

    return state.pool
      .filter((player) => player.is_available !== false)
      .filter((player) => {
        if (position !== "ALL" && !eligibleSlots(player).includes(position)) return false;
        if (!query) return true;

        return [
          player.display_gamertag,
          player.real_team_name,
          player.primary_position
        ].join(" ").toLocaleLowerCase("sv-SE").includes(query);
      })
      .sort((a, b) =>
        number(b.price) - number(a.price) ||
        clean(a.display_gamertag).localeCompare(clean(b.display_gamertag), "sv")
      );
  }

  function renderFormerPlayers() {
    const section = $("formerPlayersSection");
    const host = $("formerPlayersList");
    if (!section || !host) return;

    const rows = Array.isArray(state.formerPlayers)
      ? [...state.formerPlayers].sort((a, b) =>
          number(b.last_round_no) - number(a.last_round_no) ||
          clean(a.slot).localeCompare(clean(b.slot), "sv")
        )
      : [];

    if (!state.entry || !rows.length) {
      section.hidden = true;
      host.innerHTML = "";
      return;
    }

    section.hidden = false;
    host.innerHTML = rows.map((row) => {
      const player = playerById(row.pool_player_id);
      const name = clean(player?.display_gamertag) || "Okänd spelare";
      const team = clean(player?.real_team_name) || "Lag ej klart";
      const slot = clean(row.slot).toUpperCase() || "–";
      const rounds = Array.isArray(row.round_breakdown) ? row.round_breakdown : [];
      const roundMarkup = rounds.map((round) => {
        const label = clean(round.round_name) || ("Period " + (round.round_no || "–"));
        return '<span class="fantasy-former-player__round">' +
          escapeHtml(label) + ': <strong>' + formatPoints(round.team_points) + ' P</strong>' +
          (round.is_captain ? '<em>K</em>' : '') +
        '</span>';
      }).join("");

      return [
        '<article class="fantasy-former-player">',
          '<div class="fantasy-former-player__portrait-wrap">',
            player ? portraitMarkup(player, "fantasy-former-player__portrait") : "",
            player ? teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--former") : "",
          '</div>',
          '<div class="fantasy-former-player__main">',
            '<strong class="fantasy-player-name-line">',
              player ? countryFlagMarkup(player.country_code) : "",
              '<span class="fantasy-player-name">' + escapeHtml(name) + '</span>',
            '</strong>',
            '<small>' + escapeHtml(team) + ' · ' + escapeHtml(slot) + ' · ' + number(row.games) + ' matcher</small>',
            '<div class="fantasy-former-player__rounds">',
              roundMarkup || '<span class="fantasy-former-player__round">Ingen matchpoäng registrerad</span>',
            '</div>',
          '</div>',
          '<div class="fantasy-former-player__points">',
            '<span>BIDRAG TILL LAGET</span>',
            '<strong>' + formatPoints(row.team_points) + ' P</strong>',
            '<small>' + (number(row.captain_bonus_points) > 0
              ? "+" + formatPoints(row.captain_bonus_points) + " P kaptensbonus"
              : "Poängen ligger kvar i totalen") + '</small>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderMarket() {
    const host = $("marketList");
    if (!host) return;

    if (!state.pool.length) {
      host.innerHTML = '<div class="fantasy-empty">Spelarpoolen är inte publicerad ännu.</div>';
      return;
    }

    const selected = selectedIds();
    const rows = filteredPlayers("marketSearch", "marketPosition");

    host.innerHTML = rows.map((player) => {
      const alreadySelected = selected.has(Number(player.id));
      const slots = eligibleSlots(player).join("/") || clean(player.primary_position) || "–";

      return `
        <article class="fantasy-player-row">
          <div class="fantasy-player-row__portrait-wrap">
            ${portraitMarkup(player, "fantasy-player-row__portrait")}
            ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--market")}
          </div>
          <div class="fantasy-player-row__main">
            <strong class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(player.display_gamertag)}</span></strong>
            <small>
              ${escapeHtml(clean(player.real_team_name) || "Lag ej klart")} ·
              ${escapeHtml(slots)}
            </small>
            <small class="fantasy-player-row__ownership">${escapeHtml(ownershipText(player.id))}</small>
            <button class="fantasy-inline-player-link" type="button" data-player-detail="${player.id}">Form & info →</button>
          </div>
          <div class="fantasy-player-row__price">
            <b>${format(player.price)}</b>
            <span>CR</span>
          </div>
          <button type="button" data-add="${player.id}" ${alreadySelected || !competitionOpen() ? "disabled" : ""}>
            ${alreadySelected
              ? "Vald"
              : eligibleSlots(player).length > 1
                ? "Välj position"
                : "Lägg till"}
          </button>
        </article>
      `;
    }).join("") || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
  }

  function renderPlayers() {
    const host = $("playersGrid");
    if (!host) return;

    if (!state.pool.length) {
      host.innerHTML = '<div class="fantasy-empty">' + escapeHtml(seasonLabel()) + ' har ingen publicerad spelarpool ännu.</div>';
      return;
    }

    const rows = filteredPlayers("playersSearch", "playersPosition");

    host.innerHTML = rows.map((player) => `
      <article class="fantasy-player-card">
        <div class="fantasy-player-card__visual">
          ${portraitMarkup(player, "fantasy-player-card__portrait")}
          <div class="fantasy-player-card__identity">
            <div class="fantasy-player-card__top">
              <span>${escapeHtml(eligibleSlots(player).join("/") || clean(player.primary_position) || "–")}</span>
              <b>${format(player.price)} CR</b>
            </div>
            <h3 class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(player.display_gamertag)}</span></h3>
            <p>
              ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--card")}
              <span>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</span>
            </p>
            ${differentialMarkup(player.id)}
          </div>
        </div>
        <footer>
          <span>${escapeHtml(ownershipText(player.id))}</span>
          <span>${escapeHtml(eligibleSlots(player).join(" / "))}</span>
        </footer>
        <button class="fantasy-player-card__detail" type="button" data-player-detail="${player.id}">Visa form & statistik →</button>
      </article>
    `).join("") || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
  }

  function playerDetailStat(label, value, suffix = "") {
    return '<div class="fantasy-player-detail__stat"><span>' + escapeHtml(label) +
      '</span><strong>' + escapeHtml(value) + escapeHtml(suffix) + '</strong></div>';
  }

  function renderPlayerDetail(data) {
    const host = $("playerDetailContent");
    if (!host) return;

    if (!data?.ok) {
      host.innerHTML = '<div class="fantasy-empty">Spelarinformationen kunde inte hämtas.</div>';
      return;
    }

    const player = data.player || {};
    const totals = data.totals || {};
    const ownership = data.ownership || null;
    const recent = Array.isArray(data.recent_matches) ? data.recent_matches : [];
    const games = number(totals.games);
    const totalPoints = number(totals.fantasy_points);
    const slots = Array.isArray(player.eligible_slots) ? player.eligible_slots.join(" / ") : clean(player.primary_position);

    const ownershipValue = data.ownership_visible
      ? format(ownership?.ownership_pct || 0, number(ownership?.ownership_pct) % 1 ? 1 : 0) + " %"
      : "Efter deadline";
    const captainValue = data.ownership_visible
      ? format(ownership?.captain_pct || 0, number(ownership?.captain_pct) % 1 ? 1 : 0) + " %"
      : "–";

    const recentMarkup = recent.length
      ? recent.map((match) => {
          const factor = number(match.league_multiplier || 1);
          const factorText = Math.abs(factor - 1) > 0.001
            ? '<em>×' + escapeHtml(format(factor, 2)) + '</em>'
            : "";
          const date = match.started_at ? formatDate(match.started_at) : "Match";
          return '<div class="fantasy-player-form-row">' +
            '<span><b>' + escapeHtml(date) + '</b><small>' +
              escapeHtml(clean(match.played_position || match.scoring_role) || "–") +
              ' · liga ' + escapeHtml(match.source_league_id || "–") +
            '</small></span>' +
            '<span class="fantasy-player-form-row__factor">' + factorText + '</span>' +
            '<strong>' + formatPoints(match.fantasy_points) + ' P</strong>' +
          '</div>';
        }).join("")
      : '<div class="fantasy-player-detail__empty">Inga SCL-matcher registrerade ännu.</div>';

    const hasGoalieGames = number(totals.goalie_games) > 0;
    const hasSkaterGames = number(totals.forward_games) + number(totals.defense_games) > 0;
    const statPieces = [];
    if (hasSkaterGames || !games) {
      statPieces.push(playerDetailStat("Mål", format(totals.goals || 0)));
      statPieces.push(playerDetailStat("Assist", format(totals.assists || 0)));
      statPieces.push(playerDetailStat("Block", format(totals.blocked_shots || 0)));
    }
    if (hasGoalieGames) {
      statPieces.push(playerDetailStat("MV-vinster", format(totals.goalie_wins || 0)));
      statPieces.push(playerDetailStat("Räddningar", format(totals.goalie_saves || 0)));
      statPieces.push(playerDetailStat("Nollor", format(totals.goalie_shutouts || 0)));
    }

    host.innerHTML = `
      <div class="fantasy-player-detail__hero">
        <div class="fantasy-player-detail__portrait-wrap">
          ${portraitMarkup(player, "fantasy-player-detail__portrait")}
          ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--detail")}
        </div>
        <div class="fantasy-player-detail__identity">
          <p class="fantasy-kicker">SPELARPROFIL / FANTASY</p>
          <h2 class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(clean(player.display_gamertag) || "Okänd")}</span></h2>
          <p>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")} · ${escapeHtml(slots || "–")}</p>
          <div class="fantasy-player-detail__tags">
            <span>${format(player.price)} CR</span>
            ${data.ownership_visible && number(ownership?.ownership_pct) < 5 && number(ownership?.entries) >= 10
              ? '<span class="is-differential">DIFFERENTIAL</span>'
              : ""}
          </div>
        </div>
      </div>

      <div class="fantasy-player-detail__metrics">
        ${playerDetailStat("Fantasy-poäng", formatPoints(totalPoints) + " P")}
        ${playerDetailStat("Matcher", format(games))}
        ${playerDetailStat("Poäng / match", format(totals.points_per_game || 0, 2))}
        ${playerDetailStat("Ägd", ownershipValue)}
        ${playerDetailStat("Kapten", captainValue)}
      </div>

      <section class="fantasy-player-detail__section">
        <div class="fantasy-player-detail__section-head">
          <span>FORM</span>
          <h3>Senaste 5 matcher</h3>
        </div>
        <div class="fantasy-player-form">${recentMarkup}</div>
      </section>

      <section class="fantasy-player-detail__section">
        <div class="fantasy-player-detail__section-head">
          <span>UTFALL</span>
          <h3>Registrerad statistik</h3>
        </div>
        <div class="fantasy-player-detail__stats">${statPieces.join("")}</div>
        ${data.ownership_visible
          ? '<p class="fantasy-player-detail__note">Ägarandel från ' +
              escapeHtml(clean(ownership?.period_name) || "senast låsta Fantasy-period") +
              ' · ' + format(ownership?.entries || 0) + ' låsta Fantasy-lag.</p>'
          : '<p class="fantasy-player-detail__note">Ägar- och kaptenandel visas först efter Fantasy-periodens deadline.</p>'}
      </section>
    `;
  }

  async function openPlayerDetail(playerId) {
    const dialog = $("playerDetailDialog");
    const host = $("playerDetailContent");
    if (!dialog || !host) return;

    const player = playerById(playerId);
    host.innerHTML = '<div class="fantasy-player-detail__loading">' +
      (player ? escapeHtml(player.display_gamertag) + ' · ' : '') +
      'hämtar form och statistik…</div>';
    dialog.showModal();

    try {
      const { data, error } = await sb.rpc("seh_fantasy_public_player_detail", {
        p_pool_player_id: Number(playerId),
        p_code: competitionCode()
      });
      if (error) throw error;
      renderPlayerDetail(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      host.innerHTML = '<div class="fantasy-empty">Kunde inte hämta spelaren: ' +
        escapeHtml(error?.message || String(error)) + '</div>';
    }
  }

  function renderLeaderboard() {
    const host = $("leaderboard");
    if (!host) return;

    if (!state.leaderboard.length) {
      host.innerHTML = '<div class="fantasy-empty">Topplistan är tom. Den fylls när Fantasy-lag börjar skapas.</div>';
      return;
    }

    const rows = [...state.leaderboard].sort((a, b) =>
      number(b.total_points) - number(a.total_points) ||
      number(a.entry_id) - number(b.entry_id)
    );

    host.innerHTML = rows.map((row, index) => `
      <button class="fantasy-leaderboard-row fantasy-leaderboard-row--clickable" type="button" data-view-entry="${row.entry_id}">
        <span>#${row.current_rank || index + 1}</span>
        <strong>${escapeHtml(row.team_name || "Namnlöst lag")}</strong>
        <b>${format(row.total_points, number(row.total_points) % 1 ? 1 : 0)} P</b>
        <em>Visa lag →</em>
      </button>
    `).join("");
  }

  function publicRosterMeta(player) {
    const team = clean(player?.real_team_name) || "Lag ej klart";
    const totalGames = number(player?.total_games ?? player?.games);
    const slots = Array.isArray(player?.eligible_slots)
      ? player.eligible_slots.map((slot) => clean(slot).toUpperCase()).filter(Boolean)
      : [];
    const hybrid = slots.includes("G") && slots.some((slot) => slot !== "G");

    if (!hybrid) {
      return team + " · " + totalGames + " matcher totalt";
    }

    const fantasySlot = clean(player?.slot).toUpperCase();
    const countedGames = fantasySlot === "G"
      ? number(player?.goalie_games)
      : number(player?.skater_games);
    const countedLabel = fantasySlot === "G"
      ? "målvaktsmatcher räknas"
      : "utespelarmatcher räknas";

    return team + " · " + totalGames + " matcher totalt · " + countedGames + " " + countedLabel;
  }

  function publicRosterPlayerMarkup(player) {
    const captain = Boolean(player?.is_captain);
    const contribution = number(player?.team_points);
    const captainBonus = number(player?.captain_bonus_points);

    return `
      <article class="fantasy-public-roster-player${captain ? " is-captain" : ""}">
        <div class="fantasy-public-roster-player__portrait-wrap">
          ${portraitMarkup(player, "fantasy-public-roster-player__portrait")}
          ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--public-roster")}
        </div>
        <div class="fantasy-public-roster-player__main">
          <div class="fantasy-public-roster-player__name">
            <span class="fantasy-public-roster-player__slot">${escapeHtml(clean(player?.slot || "–"))}</span>
            <strong class="fantasy-player-name-line">
              ${countryFlagMarkup(player?.country_code)}
              <span class="fantasy-player-name">${escapeHtml(clean(player?.display_gamertag) || "Okänd")}</span>
            </strong>
            ${captain ? '<span class="fantasy-public-roster-player__captain">KAPTEN</span>' : ""}
          </div>
          <small>${escapeHtml(publicRosterMeta(player))}</small>
          ${captainBonus > 0
            ? '<small class="fantasy-public-roster-player__bonus">+' + formatPoints(captainBonus) + ' P kaptensbonus</small>'
            : ""}
        </div>
        <div class="fantasy-public-roster-player__points">
          <span>BIDRAG</span>
          <strong>${formatPoints(contribution)} P</strong>
        </div>
      </article>
    `;
  }

  function renderPublicEntry(data) {
    const content = $("publicEntryContent");
    if (!content) return;

    if (!data?.visible) {
      content.innerHTML = `
        <div class="fantasy-public-entry__locked">
          <span>🔒</span>
          <h3>Laget är dolt</h3>
          <p>${escapeHtml(clean(data?.message) || "Laget blir synligt efter deadline.")}</p>
        </div>
      `;
      return;
    }

    const entry = data.entry || {};
    const round = data.round || null;
    const roster = Array.isArray(data.roster) ? data.roster : [];
    const former = Array.isArray(data.former_players) ? data.former_players : [];
    const penalty = number(data.transfer_penalty_points);
    const roundLabel = round
      ? (clean(round.name) || ("Period " + (round.round_no || "–")))
      : "Låst lag";

    content.innerHTML = `
      <div class="fantasy-public-entry__hero">
        <div>
          <span>LÅST FANTASY-LAG · ${escapeHtml(roundLabel.toUpperCase())}</span>
          <h2>${escapeHtml(clean(entry.team_name) || "Namnlöst lag")}</h2>
          <small>Det här är den senast låsta uppställningen. Kommande byten visas inte före nästa deadline.</small>
        </div>
        <div class="fantasy-public-entry__total">
          <span>TOTALT</span>
          <strong>${formatPoints(entry.total_points)} P</strong>
          ${penalty > 0 ? '<small>−' + formatPoints(penalty) + ' P bytesavdrag</small>' : ""}
        </div>
      </div>

      <div class="fantasy-public-entry__section-head">
        <span>STARTSEXA</span>
        <strong>LW · C · RW · LD · RD · G</strong>
      </div>
      <div class="fantasy-public-entry__roster">
        ${roster.map(publicRosterPlayerMarkup).join("") || '<div class="fantasy-empty">Ingen låst uppställning hittades.</div>'}
      </div>

      ${former.length ? `
        <div class="fantasy-public-entry__section-head fantasy-public-entry__section-head--history">
          <span>TIDIGARE SPELARE</span>
          <strong>Poängen ligger kvar i lagets total</strong>
        </div>
        <div class="fantasy-public-entry__former">
          ${former.map((player) => {
            const rounds = Array.isArray(player.round_breakdown) ? player.round_breakdown : [];
            return `
              <article class="fantasy-public-former-player">
                <div>
                  <strong class="fantasy-player-name-line">
                    ${countryFlagMarkup(player.country_code)}
                    <span class="fantasy-player-name">${escapeHtml(clean(player.display_gamertag) || "Okänd")}</span>
                  </strong>
                  <small>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")} · ${escapeHtml((player.used_slots || []).join(" / ") || "–")} · ${number(player.games)} matcher</small>
                  <div class="fantasy-public-former-player__rounds">
                    ${rounds.map((r) =>
                      '<span>' + escapeHtml(clean(r.round_name) || ("Period " + (r.round_no || "–"))) +
                      ' · ' + escapeHtml(clean(r.slot) || "–") +
                      ' · <strong>' + formatPoints(r.team_points) + ' P</strong>' +
                      (r.is_captain ? ' <em>K</em>' : '') +
                      '</span>'
                    ).join("")}
                  </div>
                </div>
                <b>${formatPoints(player.team_points)} P</b>
              </article>
            `;
          }).join("")}
        </div>
      ` : ""}
    `;
  }

  async function openPublicEntry(entryId) {
    const dialog = $("publicEntryDialog");
    const content = $("publicEntryContent");
    if (!dialog || !content) return;

    content.innerHTML = '<div class="fantasy-public-entry__loading">Hämtar låst lag…</div>';
    dialog.showModal();

    try {
      const result = await sb.rpc("seh_fantasy_public_entry_roster", {
        p_entry_id: Number(entryId),
        p_code: competitionCode()
      });
      if (result.error) throw result.error;
      renderPublicEntry(Array.isArray(result.data) ? result.data[0] : result.data);
    } catch (error) {
      content.innerHTML =
        '<div class="fantasy-public-entry__locked"><h3>Kunde inte hämta laget</h3><p>' +
        escapeHtml(error?.message || String(error)) +
        '</p></div>';
    }
  }

  function renderTeamName() {
    const host = $("teamNameDisplay");
    if (!host) return;
    const linkedName = clean(state.account?.player_name);
    host.textContent = clean(state.entry?.team_name) || (linkedName ? linkedName + " Fantasy" : "–");
  }

  function renderAll() {
    renderHero();
    renderLineup();
    renderFormerPlayers();
    renderMarket();
    renderPlayers();
    renderLeaderboard();
    renderPeriodHub();
    renderTeamName();
    renderTransferStatus();
    updateHeaderAccount();
  }

  function placePlayer(player, slot) {
    if (!player || !slot) return;

    const occupied = state.picks.get(slot);
    const isSwap = state.swapSlot === slot && Boolean(occupied);
    if (occupied && !isSwap) {
      showRosterError(
        slot + " är redan upptagen av " +
        (clean(occupied.player?.display_gamertag) || "en annan spelare") +
        ". Använd Byt på spelarkortet."
      );
      return;
    }

    if (!eligibleSlots(player).includes(slot)) {
      showRosterError(
        (clean(player.display_gamertag) || "Spelaren") +
        " kan inte användas som " + slot + "."
      );
      return;
    }

    const selected = selectedIds();
    if (isSwap && occupied?.player?.id) selected.delete(Number(occupied.player.id));
    if (selected.has(Number(player.id))) {
      showRosterError((clean(player.display_gamertag) || "Spelaren") + " finns redan i laget.");
      return;
    }

    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    const teamCount = [...state.picks.entries()].filter(([pickSlot, pick]) =>
      pickSlot !== (isSwap ? slot : "") &&
      pick.player?.real_team_id != null &&
      player.real_team_id != null &&
      Number(pick.player.real_team_id) === Number(player.real_team_id)
    ).length;
    if (teamCount >= teamLimit) {
      showRosterError("Du får välja högst " + teamLimit + " spelare från samma riktiga lag.");
      return;
    }

    state.picks.set(slot, {
      player,
      isCaptain: isSwap ? Boolean(occupied.isCaptain) : false
    });
    state.pendingPlacementPlayerId = null;
    state.pickerSlot = null;
    state.swapSlot = null;
    setStatus("saveStatus", "");
    $("positionDialog")?.close();
    $("playerPickerDialog")?.close();
    renderAll();
  }

  function openPositionChooser(player, slots) {
    const dialog = $("positionDialog");
    const choices = $("positionDialogChoices");
    if (!dialog || !choices) {
      placePlayer(player, slots[0]);
      return;
    }

    state.pendingPlacementPlayerId = Number(player.id);
    $("positionDialogPlayer").textContent = player.display_gamertag;

    const positionDialogText = $("positionDialogText");
    const playerSlots = eligibleSlots(player);
    const goalieHybrid = playerSlots.includes("G") && playerSlots.some((slot) => slot !== "G");

    if (goalieHybrid) {
      const outfieldSlots = playerSlots.filter((slot) => slot !== "G");
      positionDialogText.innerHTML =
        "<strong>" + escapeHtml(player.display_gamertag) + " kan användas på " +
        escapeHtml(playerSlots.join(" / ")) + ".</strong><br>" +
        "Välj vilken ledig plats spelaren ska ta.<br>" +
        "<strong>G:</strong> endast målvaktsmatcher räknas<br>" +
        "<strong>" + escapeHtml(outfieldSlots.join(" / ")) + ":</strong> endast utespelarmatcher räknas";
    } else {
      positionDialogText.textContent =
        player.display_gamertag + " kan användas på " + playerSlots.join(" / ") +
        ". Välj vilken ledig plats spelaren ska ta.";
    }

    choices.innerHTML = slots.map((slot) =>
      '<button type="button" data-place-slot="' + slot + '">' + slot + '</button>'
    ).join("");

    dialog.showModal();
  }

  function pickerPlayers(slot, query = "") {
    const selected = selectedIds();
    const currentPick = state.swapSlot === slot ? state.picks.get(slot) : null;
    if (currentPick?.player?.id) selected.delete(Number(currentPick.player.id));
    const normalizedQuery = clean(query).toLocaleLowerCase("sv-SE");

    return state.pool
      .filter((player) => player.is_available !== false)
      .filter((player) => !currentPick || Number(player.id) !== Number(currentPick.player?.id))
      .filter((player) => !selected.has(Number(player.id)))
      .filter((player) => eligibleSlots(player).includes(slot))
      .filter((player) => {
        if (!normalizedQuery) return true;
        return [player.display_gamertag, player.real_team_name, eligibleSlots(player).join(" ")]
          .join(" ")
          .toLocaleLowerCase("sv-SE")
          .includes(normalizedQuery);
      })
      .sort((a, b) =>
        number(b.price) - number(a.price) ||
        clean(a.display_gamertag).localeCompare(clean(b.display_gamertag), "sv")
      );
  }

  function renderPlayerPicker() {
    const slot = state.pickerSlot;
    const host = $("playerPickerList");
    if (!slot || !host) return;

    const query = clean($("playerPickerSearch")?.value);
    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    const rows = pickerPlayers(slot, query);
    const swapPick = state.swapSlot === slot ? state.picks.get(slot) : null;

    $("playerPickerTitle").textContent = swapPick
      ? "Byt " + (clean(swapPick.player?.display_gamertag) || slot)
      : "Välj " + slot;
    $("playerPickerCount").textContent = rows.length + " spelare kan användas som " + slot;

    host.innerHTML = rows.map((player) => {
      const teamCount = [...state.picks.entries()].filter(([pickSlot, pick]) =>
        pickSlot !== state.swapSlot &&
        pick.player?.real_team_id != null &&
        player.real_team_id != null &&
        Number(pick.player.real_team_id) === Number(player.real_team_id)
      ).length;
      const teamBlocked = teamCount >= teamLimit;
      return `
        <article class="fantasy-picker-player ${teamBlocked ? "is-blocked" : ""}">
          <div class="fantasy-picker-player__portrait-wrap">
            ${portraitMarkup(player, "fantasy-picker-player__portrait")}
            ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--picker")}
          </div>
          <div class="fantasy-picker-player__info">
            <strong class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(player.display_gamertag)}</span></strong>
            <small>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</small>
            <span>${escapeHtml(eligibleSlots(player).join(" / "))}</span>
          </div>
          <div class="fantasy-picker-player__price">
            <strong>${format(player.price)}</strong>
            <small>CR</small>
          </div>
          <button type="button" data-pick-player="${player.id}" ${teamBlocked || !competitionOpen() ? "disabled" : ""}>
            ${teamBlocked ? "2/2 FRÅN LAGET" : "VÄLJ " + slot}
          </button>
        </article>
      `;
    }).join("") || '<div class="fantasy-empty">Inga valbara spelare för ' + escapeHtml(slot) + '.</div>';
  }

  function openPlayerPicker(slot) {
    if (!["LW","C","RW","LD","RD","G"].includes(slot)) return;

    const occupied = state.picks.get(slot);
    if (occupied) {
      showRosterError(
        slot + " är redan upptagen av " +
        (clean(occupied.player?.display_gamertag) || "en annan spelare") +
        ". Använd Byt på spelarkortet."
      );
      return;
    }

    state.swapSlot = null;
    state.pickerSlot = slot;
    if ($("playerPickerSearch")) $("playerPickerSearch").value = "";
    renderPlayerPicker();
    $("playerPickerDialog")?.showModal();
  }

  function openSwapPlayerPicker(slot) {
    if (!["LW","C","RW","LD","RD","G"].includes(slot)) return;

    const occupied = state.picks.get(slot);
    if (!occupied) {
      openPlayerPicker(slot);
      return;
    }

    state.swapSlot = slot;
    state.pickerSlot = slot;
    if ($("playerPickerSearch")) $("playerPickerSearch").value = "";
    renderPlayerPicker();
    $("playerPickerDialog")?.showModal();
  }

  function addPlayer(id) {
    const player = playerById(id);
    if (!player) return;

    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    if (realTeamCount(player) >= teamLimit) {
      showRosterError("Du får välja högst " + teamLimit + " spelare från samma riktiga lag.");
      return;
    }

    const eligible = eligibleSlots(player);
    const openSlots = eligible.filter((candidate) => !state.picks.has(candidate));
    if (!openSlots.length) {
      const occupied = eligible
        .map((slot) => ({ slot, pick: state.picks.get(slot) }))
        .filter((item) => item.pick);

      if (occupied.length === 1 && eligible.length === 1) {
        showRosterError(
          occupied[0].slot + " är redan upptagen av " +
          (clean(occupied[0].pick.player?.display_gamertag) || "en annan spelare") +
          ". " + (clean(player.display_gamertag) || "Spelaren") +
          " kan bara användas som " + occupied[0].slot + "."
        );
      } else {
        showRosterError(
          "Ingen ledig position för " + (clean(player.display_gamertag) || "spelaren") +
          " (" + eligible.join(" / ") + ")."
        );
      }
      return;
    }

    if (openSlots.length === 1) {
      placePlayer(player, openSlots[0]);
      return;
    }

    openPositionChooser(player, openSlots);
  }

  function removePlayer(slot) {
    state.picks.delete(slot);
    renderAll();
  }

  function setCaptain(id) {
    for (const [slot, pick] of state.picks.entries()) {
      state.picks.set(slot, {
        ...pick,
        isCaptain: Number(pick.player.id) === Number(id)
      });
    }
    renderLineup();
  }

  async function loadLeaderboard() {
    if (!state.competition) return;
    const result = await sb
      .from("v_ehockey_fantasy_leaderboard")
      .select("*")
      .eq("competition_id", state.competition.id)
      .order("total_points", { ascending: false })
      .limit(100);

    if (result.error) throw result.error;
    state.leaderboard = result.data || [];
  }

  async function loadInsights() {
    const result = await sb.rpc("seh_fantasy_public_insights", { p_code: competitionCode() });
    if (result.error) throw result.error;

    state.insights = Array.isArray(result.data)
      ? (result.data[0] || null)
      : (result.data || null);
    state.ownership.clear();

    const rows = Array.isArray(state.insights?.ownership) ? state.insights.ownership : [];
    for (const row of rows) {
      state.ownership.set(Number(row.pool_player_id), row);
    }
  }

  async function loadPublic() {
    const competitionResult = await sb
      .from("ehockey_fantasy_competitions")
      .select("*")
      .order("id", { ascending: true });

    if (competitionResult.error) throw competitionResult.error;

    state.competitions = (competitionResult.data || []).filter((row) =>
      !row?.settings?.archive_role
    );

    const requested = clean(new URLSearchParams(window.location.search).get("competition")).toUpperCase();
    state.competition =
      state.competitions.find((row) => clean(row.code).toUpperCase() === requested) ||
      state.competitions.find((row) => clean(row.code).toUpperCase() === "SCL27") ||
      state.competitions[0] ||
      null;

    if (!state.competition) throw new Error("Ingen Fantasy-tävling är konfigurerad.");

    const poolResult = await sb
      .from("ehockey_fantasy_player_pool")
      .select("*")
      .eq("competition_id", state.competition.id)
      .order("price", { ascending: false })
      .order("display_gamertag", { ascending: true });

    if (poolResult.error) throw poolResult.error;

    state.pool = (poolResult.data || []).filter((player) => fantasyCountryAllowed(player.country_code));
    await Promise.all([loadLeaderboard(), loadInsights()]);
  }

  async function loadTransferState() {
    if (!state.session?.user || !state.competition) {
      state.transferState = null;
      renderTransferStatus();
      return;
    }

    const result = await sb.rpc("seh_fantasy_my_transfer_state", {
      p_code: competitionCode()
    });

    if (result.error) throw result.error;

    state.transferState = Array.isArray(result.data)
      ? (result.data[0] || null)
      : (result.data || null);

    renderTransferStatus();
  }

  async function loadMyEntry() {
    if (!state.session?.user || !state.competition) return;

    const entryResult = await sb
      .from("ehockey_fantasy_entries")
      .select("*")
      .eq("competition_id", state.competition.id)
      .eq("user_id", state.session.user.id)
      .maybeSingle();

    if (entryResult.error) throw entryResult.error;

    state.entry = entryResult.data || null;

    if (!state.entry) {
      state.savedPicks.clear();
      state.savedScores.clear();
      state.savedBreakdowns.clear();
      state.formerPlayers = [];
      // Keep any unsaved draft intact. Auth refreshes must never wipe the user's picks.
      renderAll();
      return;
    }

    state.picks.clear();
    state.savedPicks.clear();
    state.savedScores.clear();
    state.savedBreakdowns.clear();
    state.formerPlayers = [];

    const picksResult = await sb
      .from("ehockey_fantasy_entry_players")
      .select("pool_player_id,slot,is_captain,locked_price")
      .eq("entry_id", state.entry.id);

    if (picksResult.error) throw picksResult.error;

    const savedRows = picksResult.data || [];
    const scoreIds = [...new Set(savedRows.map((row) => Number(row.pool_player_id)).filter(Boolean))];

    if (scoreIds.length) {
      const scoreResult = await sb
        .from("ehockey_fantasy_player_scores")
        .select("pool_player_id,fantasy_points,games")
        .eq("competition_id", state.competition.id)
        .eq("phase", "total")
        .in("pool_player_id", scoreIds);

      if (scoreResult.error) throw scoreResult.error;

      for (const row of scoreResult.data || []) {
        state.savedScores.set(Number(row.pool_player_id), row);
      }

    }

    const breakdownResult = await sb.rpc("seh_fantasy_my_saved_score_breakdown", {
      p_code: competitionCode()
    });

    if (breakdownResult.error) throw breakdownResult.error;

    const breakdownRows = Array.isArray(breakdownResult.data)
      ? breakdownResult.data
      : [];

    for (const row of breakdownRows) {
      if (row?.is_current === false) {
        state.formerPlayers.push(row);
        continue;
      }
      state.savedBreakdowns.set(breakdownKey(row.pool_player_id, row.slot), row);
    }

    for (const row of savedRows) {
      const player = playerById(row.pool_player_id);
      if (!player) continue;

      const savedPick = {
        player,
        isCaptain: Boolean(row.is_captain),
        lockedPrice: row.locked_price
      };

      state.picks.set(row.slot, { ...savedPick });
      state.savedPicks.set(row.slot, { ...savedPick });
    }

    renderAll();
  }

  async function resolveAccount() {
    showGate("loading");

    const sessionResult = await sb.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    state.session = sessionResult.data?.session || null;
    state.account = null;

    if (!state.session?.user) {
      showGate("logged-out");
      updateHeaderAccount();
      return;
    }

    if (!isDiscordUser(state.session.user)) {
      showGate("wrong-account");
      updateHeaderAccount();
      return;
    }

    const accountResult = await sb.rpc("seh_fantasy_get_my_account");
    if (accountResult.error) throw accountResult.error;

    state.account = Array.isArray(accountResult.data)
      ? (accountResult.data[0] || {})
      : (accountResult.data || {});

    if (state.account.status === "pending") {
      showGate("pending");
      updateHeaderAccount();
      return;
    }

    if (state.account.status !== "approved" || !clean(state.account.player_key)) {
      showGate("unlinked");
      updateHeaderAccount();
      return;
    }

    showBuilder();
    updateHeaderAccount();
    await loadMyEntry();
    await loadTransferState();
  }

  async function loginWithDiscord() {
    setStatus("gateStatus", "Öppnar Discord…", "working");

    try {
      const existing = await sb.auth.getSession();

      if (existing.data?.session && !isDiscordUser(existing.data.session.user)) {
        await sb.auth.signOut();
      }

      const redirectTo = window.location.origin === "null"
        ? window.location.href
        : window.location.origin + window.location.pathname;

      const { error } = await sb.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo }
      });

      if (error) throw error;
    } catch (error) {
      setStatus("gateStatus", "Fel: " + (error?.message || error), "error");
    }
  }

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      state.session = null;
      state.account = null;
      state.entry = null;
      state.picks.clear();
      state.savedPicks.clear();
      state.savedScores.clear();
      state.savedBreakdowns.clear();
      state.transferState = null;
      renderAll();
      showGate("logged-out");
    }
  }

  async function saveTeam() {
    const budget = number(state.competition?.budget || 100);

    if (!state.session?.user || state.account?.status !== "approved") {
      setStatus("saveStatus", "Du måste vara inloggad och ha en godkänd spelarprofil kopplad.", "error");
      return;
    }

    if (!competitionOpen()) {
      setStatus("saveStatus", "Lagbygget är inte öppet ännu.", "error");
      return;
    }

    if (state.picks.size !== 6) {
      setStatus("saveStatus", "Välj alla sex positioner innan du sparar.", "error");
      return;
    }

    if (usedBudget() > budget) {
      setStatus("saveStatus", "Laget är över budget.", "error");
      return;
    }

    const captains = [...state.picks.values()].filter((pick) => pick.isCaptain);
    if (captains.length !== 1) {
      setStatus("saveStatus", "Välj exakt en kapten.", "error");
      return;
    }

    $("saveTeam").disabled = true;
    setStatus("saveStatus", "Sparar laget…", "working");

    try {
      const hadEntry = Boolean(state.entry);
      const picks = [...state.picks.entries()].map(([slot, pick]) => ({
        pool_player_id: pick.player.id,
        slot,
        is_captain: Boolean(pick.isCaptain)
      }));

      const { data, error } = await sb.rpc("seh_fantasy_save_my_team", {
        p_competition_code: competitionCode(),
        p_team_name: "",
        p_picks: picks
      });

      if (error) throw error;

      const transfer = data?.transfer || {};
      const transferCount = number(transfer.count);
      const paidCount = number(transfer.paid_count);
      const penalty = number(transfer.penalty_points);
      const unlimited = Boolean(transfer.unlimited);

      await loadMyEntry();
      await loadTransferState();
      await Promise.all([loadLeaderboard(), loadInsights()]);
      renderHero();
      renderLeaderboard();
      renderPeriodHub();
      renderMarket();
      renderPlayers();

      let successText = hadEntry
        ? leagueCode() + "-laget är uppdaterat."
        : leagueCode() + "-laget är sparat.";

      if (transferCount > 0) {
        successText += unlimited
          ? " " + transferCount + " byte är gratis inför säsongen/i fri bytesperiod."
          : paidCount > 0
            ? " " + transferCount + " byte · straff −" + format(penalty) + " P."
            : " " + transferCount + " gratis byte använt.";
      } else if (hadEntry) {
        successText += " Kaptensbyte/positionsändring kostar inget.";
      }

      setStatus("saveStatus", successText, "success");
    } catch (error) {
      setStatus("saveStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      renderLineup();
    }
  }

  function switchTab(tab) {
    const allowed = new Set(["team", "players", "leaderboard", "rules"]);
    state.activeTab = allowed.has(tab) ? tab : "team";

    $$("[data-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
    });

    $$("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.activeTab;
    });
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      switchTab(tab.dataset.tab);
      return;
    }

    const viewEntry = event.target.closest("[data-view-entry]");
    if (viewEntry) {
      openPublicEntry(viewEntry.dataset.viewEntry);
      return;
    }

    const playerDetail = event.target.closest("[data-player-detail]");
    if (playerDetail) {
      openPlayerDetail(playerDetail.dataset.playerDetail);
      return;
    }

    const openSlot = event.target.closest("[data-open-slot]");
    if (openSlot) {
      openPlayerPicker(openSlot.dataset.openSlot);
      return;
    }

    const pickPlayer = event.target.closest("[data-pick-player]");
    if (pickPlayer) {
      const player = playerById(pickPlayer.dataset.pickPlayer);
      if (player && state.pickerSlot) placePlayer(player, state.pickerSlot);
      return;
    }

    const add = event.target.closest("[data-add]");
    if (add) {
      addPlayer(add.dataset.add);
      return;
    }

    const swap = event.target.closest("[data-swap]");
    if (swap) {
      openSwapPlayerPicker(swap.dataset.swap);
      return;
    }

    const captain = event.target.closest("[data-captain]");
    if (captain) {
      setCaptain(captain.dataset.captain);
      return;
    }

    const placement = event.target.closest("[data-place-slot]");
    if (placement) {
      const player = playerById(state.pendingPlacementPlayerId);
      if (player) placePlayer(player, placement.dataset.placeSlot);
    }
  });

  $("discordLogin")?.addEventListener("click", loginWithDiscord);
  $("closePlayerPickerDialog")?.addEventListener("click", () => {
    state.pickerSlot = null;
    state.swapSlot = null;
    $("playerPickerDialog")?.close();
  });
  $("playerPickerDialog")?.addEventListener("cancel", () => {
    state.pickerSlot = null;
    state.swapSlot = null;
  });
  $("playerPickerSearch")?.addEventListener("input", renderPlayerPicker);
  $("closePublicEntryDialog")?.addEventListener("click", () => {
    $("publicEntryDialog")?.close();
  });
  $("publicEntryDialog")?.addEventListener("cancel", () => {});
  $("closePlayerDetailDialog")?.addEventListener("click", () => {
    $("playerDetailDialog")?.close();
  });
  $("playerDetailDialog")?.addEventListener("cancel", () => {});

  $("closePositionDialog")?.addEventListener("click", () => {
    state.pendingPlacementPlayerId = null;
    $("positionDialog")?.close();
  });
  $("positionDialog")?.addEventListener("cancel", () => {
    state.pendingPlacementPlayerId = null;
  });
  $("saveTeam")?.addEventListener("click", saveTeam);
  $("logoutButton")?.addEventListener("click", logout);

  $("accountButton")?.addEventListener("click", async () => {
    if (state.session?.user) await logout();
    else await loginWithDiscord();
  });

  $("marketSearch")?.addEventListener("input", renderMarket);
  $("marketPosition")?.addEventListener("change", renderMarket);
  $("playersSearch")?.addEventListener("input", renderPlayers);
  $("playersPosition")?.addEventListener("change", renderPlayers);
  $("competitionSelect")?.addEventListener("change", (event) => {
    const code = clean(event.target?.value);
    if (!code || code === competitionCode()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("competition", code);
    window.location.href = url.toString();
  });

  document.querySelector("[data-jump-team]")?.addEventListener("click", () => {
    switchTab("team");
    $("teamPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("[data-jump-rules]")?.addEventListener("click", () => {
    switchTab("rules");
    $("rulesPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  sb.auth.onAuthStateChange((event, session) => {
    // Do not reload the builder on token refresh / duplicate SIGNED_IN events:
    // that could wipe a draft before it is saved.
    if (event === "SIGNED_OUT") {
      state.session = null;
      state.account = null;
      state.entry = null;
      state.picks.clear();
      renderAll();
      showGate("logged-out");
      return;
    }

    const currentUserId = state.session?.user?.id || "";
    const nextUserId = session?.user?.id || "";

    if (event === "SIGNED_IN" && nextUserId && nextUserId !== currentUserId) {
      window.setTimeout(() => {
        resolveAccount().catch((error) => {
          console.warn("Fantasy auth sign-in refresh failed", error);
        });
      }, 0);
    }
  });

  switchTab("team");

  (async () => {
    try {
      await loadPublic();
      renderAll();
      await resolveAccount();
    } catch (error) {
      console.error(seasonLabel() + " Fantasy kunde inte laddas", error);
      showGate("logged-out", "Fantasy-data kunde inte hämtas just nu.");
      setStatus("gateStatus", "Fel: " + (error?.message || error), "error");

      if (!$("playersGrid").children.length) {
        $("playersGrid").innerHTML = '<div class="fantasy-empty">Fantasy-data kunde inte hämtas just nu.</div>';
      }
    }
  })();
})();
