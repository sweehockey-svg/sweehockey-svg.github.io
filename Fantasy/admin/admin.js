(() => {
  "use strict";

  const cfg = window.EHOCKEY_CONFIG || window.SEH_CONFIG || window.APP_CONFIG || {};
  const supabaseUrl = String(cfg.supabaseUrl || cfg.SUPABASE_URL || "").trim();
  const supabaseKey = String(
    cfg.supabasePublishableKey ||
    cfg.supabaseAnonKey ||
    cfg.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clean = (value) => String(value ?? "").trim();
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const fmt = (value, digits = 0) => new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(num(value));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

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
    return labels[key] || clean(status || "–").toUpperCase();
  }

  if (!window.supabase?.createClient || !supabaseUrl || !supabaseKey) {
    $("authGateText").textContent = "Supabase-konfigurationen kunde inte laddas.";
    return;
  }

  // Default auth storage on purpose: Fantasy Admin shares the normal Svensk eHockey admin session.
  // The public Fantasy page uses a different storage key for its Discord session.
  const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

  const state = {
    admin: null,
    competitions: [],
    competition: null,
    counts: {},
    entries: [],
    recentEntries: [],
    pool: [],
    scores: new Map(),
    syncState: { settings: {}, counts: {}, runs: [] },
    sclSimState: null,
    activeTab: "dashboard"
  };

  function activeCompetitionCode() {
    return clean(state.competition?.code || "SCL27").toUpperCase();
  }

  function activeLeagueCode() {
    return clean(state.competition?.competition_code || "SCL").toUpperCase();
  }

  function activeSeasonLabel() {
    return clean(state.competition?.season_label || state.competition?.name || activeCompetitionCode());
  }

  async function loadCompetitionList() {
    const { data, error } = await sb.rpc("seh_fantasy_admin_competitions");
    if (error) throw error;
    state.competitions = Array.isArray(data) ? data : [];
  }

  function requestedCompetitionCode() {
    return clean(new URLSearchParams(window.location.search).get("competition")).toUpperCase();
  }

  function chooseCompetitionCode() {
    const requested = requestedCompetitionCode();
    if (requested && state.competitions.some((row) => clean(row.code).toUpperCase() === requested)) {
      return requested;
    }
    if (state.competitions.some((row) => clean(row.code).toUpperCase() === "SCL27")) return "SCL27";
    return clean(state.competitions[0]?.code || "SCL27").toUpperCase();
  }

  function setStatus(id, text, tone = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    if (tone) el.dataset.tone = tone;
    else el.removeAttribute("data-tone");
  }

  function dateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return [
      date.getFullYear(),
      "-",
      pad(date.getMonth() + 1),
      "-",
      pad(date.getDate()),
      "T",
      pad(date.getHours()),
      ":",
      pad(date.getMinutes())
    ].join("");
  }

  function switchTab(tab) {
    const allowed = new Set(["dashboard", "competition", "pool", "entries", "sync", "simulation"]);
    state.activeTab = allowed.has(tab) ? tab : "dashboard";

    $$("[data-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
    });

    $$("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.activeTab;
    });
  }

  async function ensureAdmin() {
    $("authGate").hidden = false;
    $("adminApp").hidden = true;
    $("authGateText").textContent = "Kontrollerar din Svensk eHockey-adminsession.";

    const sessionResult = await sb.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const session = sessionResult.data?.session || null;

    if (!session?.user) {
      $("authGateText").textContent = "Du är inte inloggad med Svensk eHockey-adminsessionen. Öppna Admincenter, logga in och försök igen.";
      return false;
    }

    await loadCompetitionList();
    const selectedCode = chooseCompetitionCode();
    const { data, error } = await sb.rpc("seh_fantasy_admin_state", { p_code: selectedCode });

    if (error) {
      $("authGateText").textContent = error.message?.includes("adminbehörighet")
        ? "Kontot är inloggat, men saknar adminbehörighet för Fantasy."
        : "Fantasy Admin kunde inte verifieras: " + error.message;
      return false;
    }

    state.admin = data?.writer || null;
    state.competition = data?.competition || null;
    state.counts = data?.counts || {};
    state.entries = Array.isArray(data?.entries) ? data.entries : [];
    state.recentEntries = Array.isArray(data?.recent_entries) ? data.recent_entries : [];

    $("authGate").hidden = true;
    $("adminApp").hidden = false;
    $("adminIdentity").textContent = state.admin?.display_name
      ? state.admin.display_name + " · ADMIN"
      : "ADMIN";

    return true;
  }

  async function loadPool() {
    if (!state.competition?.id) return;

    const [poolResult, scoreResult] = await Promise.all([
      sb
        .from("ehockey_fantasy_player_pool")
        .select("*")
        .eq("competition_id", state.competition.id)
        .order("display_gamertag", { ascending: true }),
      sb
        .from("ehockey_fantasy_player_scores")
        .select("pool_player_id,fantasy_points,phase")
        .eq("competition_id", state.competition.id)
        .eq("phase", "total")
    ]);

    if (poolResult.error) throw poolResult.error;
    if (scoreResult.error) throw scoreResult.error;

    state.pool = poolResult.data || [];
    state.scores = new Map(
      (scoreResult.data || []).map((row) => [Number(row.pool_player_id), row.fantasy_points])
    );
  }

  async function loadSyncState() {
    const { data, error } = await sb.rpc("seh_fantasy_admin_sync_state", { p_code: activeCompetitionCode() });
    if (error) throw error;
    state.syncState = data || { settings: {}, counts: {}, runs: [] };
  }

  async function loadSclSimulationStatus() {
    if (activeCompetitionCode() !== "SCL27") {
      state.sclSimState = null;
      return;
    }
    const { data, error } = await sb.rpc("seh_fantasy_admin_scl_sim_status", { p_code: "SCL27" });
    if (error) throw error;
    state.sclSimState = data || null;
  }

  async function refreshAdminState() {
    const { data, error } = await sb.rpc("seh_fantasy_admin_state", { p_code: activeCompetitionCode() });
    if (error) throw error;

    state.admin = data?.writer || state.admin;
    state.competition = data?.competition || state.competition;
    state.counts = data?.counts || {};
    state.entries = Array.isArray(data?.entries) ? data.entries : [];
    state.recentEntries = Array.isArray(data?.recent_entries) ? data.recent_entries : [];
  }

  async function loadAll() {
    await Promise.all([loadCompetitionList(), refreshAdminState()]);
    await Promise.all([loadPool(), loadSyncState(), loadSclSimulationStatus()]);
    renderAll();
  }

  function renderAdminChrome() {
    const comp = state.competition || {};
    const season = activeSeasonLabel();
    const league = activeLeagueCode();

    const competitionOptions = state.competitions.map((row) =>
      '<option value="' + esc(row.code) + '">' +
        esc(clean(row.season_label || row.name || row.code)) +
      '</option>'
    ).join("");

    if ($("adminCompetitionSelect")) {
      $("adminCompetitionSelect").innerHTML = competitionOptions;
      $("adminCompetitionSelect").value = activeCompetitionCode();
    }
    if ($("heroCompetitionSelect")) {
      $("heroCompetitionSelect").innerHTML = competitionOptions;
      $("heroCompetitionSelect").value = activeCompetitionCode();
    }

    if ($("adminBrandSeason")) $("adminBrandSeason").textContent = "eHOCKEY FANTASY LIGA";
    if ($("heroKicker")) $("heroKicker").textContent = "eHOCKEY FANTASY LIGA / KONTROLLRUM";
    if ($("heroCompetitionName")) $("heroCompetitionName").textContent = season;
    if ($("competitionSectionTitle")) $("competitionSectionTitle").textContent = season + " Fantasy";
    if ($("poolSectionTitle")) $("poolSectionTitle").textContent = season + " spelarpool";
    if ($("openFantasyLink")) {
      $("openFantasyLink").href = "../?competition=" + encodeURIComponent(activeCompetitionCode());
    }

    document.title = "eHockey Fantasy Liga · " + season + " · Admin";
    document.body.dataset.fantasyLeague = league.toLowerCase();

    const sclBox = document.querySelector(".fa-scl-sim-box");
    if (sclBox) sclBox.hidden = activeCompetitionCode() !== "SCL27";
  }

  function renderDashboard() {
    const comp = state.competition || {};
    const counts = state.counts || {};
    $("heroStatus").textContent = competitionStatusLabel(comp.status || "–");

    const cards = [
      ["SPELARPOOL", counts.pool_players || 0, (counts.available_players || 0) + " tillgängliga", "is-accent"],
      ["FANTASY-LAG", counts.entries || 0, (counts.locked_entries || 0) + " låsta", ""],
      ["BUDGET", fmt(comp.budget || 0, num(comp.budget) % 1 ? 1 : 0), "CR", "is-accent"],
      ["MAX / LAG", comp.max_players_per_real_team || "–", "riktigt lag", ""],
      ["ÖVER BUDGET", counts.entries_over_budget || 0, "lag just nu", counts.entries_over_budget ? "is-warning" : ""]
    ];

    $("dashboardCards").innerHTML = cards.map(([label, value, sub, cls]) => `
      <article class="fa-card ${cls}">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(sub)}</small>
      </article>
    `).join("");

    if (!state.recentEntries.length) {
      $("recentEntries").innerHTML = '<div class="fa-empty">Inga Fantasy-lag skapade ännu.</div>';
    } else {
      $("recentEntries").innerHTML = state.recentEntries.map((entry) => `
        <button class="fa-list-row fa-row-button" type="button" data-entry-id="${entry.entry_id}">
          <span>
            <strong>${esc(entry.team_name)}</strong>
            <small>${esc(entry.owner_name)} · ${new Date(entry.created_at).toLocaleString("sv-SE")}</small>
          </span>
          <b>${fmt(entry.total_points, num(entry.total_points) % 1 ? 1 : 0)} P</b>
        </button>
      `).join("");
    }

    const scoring = comp.scoring_rules || {};
    const goalie = scoring.goalies || {};
    $("ruleSummary").innerHTML = [
      ["STATUS", competitionStatusLabel(comp.status || "–")],
      ["BUDGET", fmt(comp.budget || 0)],
      ["KAPTEN", fmt(comp.captain_multiplier || 1, 1) + "×"],
      ["MAX / LAG", comp.max_players_per_real_team || "–"],
      ["SPELARURVAL", ({
        all: "Alla",
        sweden: "Svenskar",
        scandinavia: "Skandinaver"
      })[clean(comp.settings?.nationality_scope || "all").toLowerCase()] || "Alla"],
      ["MV VINST", "+" + fmt(goalie.win || 0, 2).replace(",00", "")],
      ["MV RÄDD", "+" + fmt(goalie.save || 0, 2).replace(",00", "")]
    ].map(([label, value]) => `
      <div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>
    `).join("");
  }

  function renderCompetition() {
    const comp = state.competition || {};
    $("compStatus").value = clean(comp.status || "setup");
    if ($("compNationalityScope")) {
      $("compNationalityScope").value = clean(comp.settings?.nationality_scope || "all").toLowerCase();
    }
    $("compBudget").value = num(comp.budget);
    $("compMaxTeam").value = num(comp.max_players_per_real_team || 2);
    $("compCaptainMultiplier").value = num(comp.captain_multiplier || 1.5);
    $("compLockAt").value = dateTimeLocal(comp.lock_at);
    $("compTransfers").checked = Boolean(comp.transfers_enabled);
  }

  function filteredPool() {
    const query = clean($("poolSearch")?.value).toLocaleLowerCase("sv-SE");
    const pos = clean($("poolPosition")?.value || "all").toUpperCase();

    return state.pool
      .filter((player) => pos === "ALL" || clean(player.primary_position).toUpperCase() === pos)
      .filter((player) => {
        if (!query) return true;
        return [player.display_gamertag, player.real_team_name]
          .join(" ")
          .toLocaleLowerCase("sv-SE")
          .includes(query);
      })
      .sort((a, b) => clean(a.display_gamertag).localeCompare(clean(b.display_gamertag), "sv"));
  }

  function renderPool() {
    const rows = filteredPool();

    if (!rows.length) {
      $("poolTableBody").innerHTML = '<tr><td colspan="7"><div class="fa-empty">Inga spelare matchar filtret.</div></td></tr>';
      return;
    }

    $("poolTableBody").innerHTML = rows.map((player) => {
      const rating = num(player.ranking_points);
      return `
        <tr data-pool-row="${player.id}">
          <td class="fa-player-main">
            <strong>${esc(player.display_gamertag)}</strong>
            <small>ID ${esc(player.sports_gamer_player_id || "–")}</small>
          </td>
          <td>${esc(player.real_team_name || "–")}</td>
          <td>
            <select data-player-pos>
              ${["LW","C","RW","LD","RD","G"].map((pos) => `<option value="${pos}" ${pos === player.primary_position ? "selected" : ""}>${pos}</option>`).join("")}
            </select>
          </td>
          <td><input data-player-price type="number" min="1" max="100" step="1" value="${Math.round(num(player.price))}"></td>
          <td><strong>${fmt(rating, 2)}</strong></td>
          <td>
            <label class="fa-toggle">
              <input data-player-available type="checkbox" ${player.is_available ? "checked" : ""}>
              <span>${player.is_available ? "Ja" : "Nej"}</span>
            </label>
          </td>
          <td><button class="fa-row-button" type="button" data-save-player="${player.id}">Spara</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderEntries() {
    if (!state.entries.length) {
      $("entriesTableBody").innerHTML = '<tr><td colspan="7"><div class="fa-empty">Inga Fantasy-lag skapade ännu.</div></td></tr>';
      return;
    }

    $("entriesTableBody").innerHTML = state.entries.map((entry, index) => `
      <tr class="fa-entry-row" data-entry-id="${entry.entry_id}">
        <td>#${entry.current_rank || index + 1}</td>
        <td><strong>${esc(entry.team_name)}</strong></td>
        <td>${esc(entry.owner_name)}</td>
        <td>${esc(entry.captain || "–")}</td>
        <td>${esc(entry.player_count || 0)} / 6</td>
        <td><strong>${fmt(entry.total_points, num(entry.total_points) % 1 ? 1 : 0)} P</strong></td>
        <td><span class="fa-pill ${entry.is_locked ? "is-live" : ""}">${entry.is_locked ? "LÅST" : "ÖPPET"}</span></td>
      </tr>
    `).join("");
  }

  const DIVISION_SYNC_FIELDS = [
    { division: "Elite", leagueId: "syncLeagueElite", factorId: "syncFactorElite", defaultFactor: 1.10 },
    { division: "Pro", leagueId: "syncLeaguePro", factorId: "syncFactorPro", defaultFactor: 1.05 },
    { division: "Lite", leagueId: "syncLeagueLite", factorId: "syncFactorLite", defaultFactor: 1.00 },
    { division: "Core", leagueId: "syncLeagueCore", factorId: "syncFactorCore", defaultFactor: 0.95 },
    { division: "Neo", leagueId: "syncLeagueNeo", factorId: "syncFactorNeo", defaultFactor: 0.90 }
  ];

  function renderSync() {
    const sync = state.syncState || {};
    const settings = sync.settings || {};
    const counts = sync.counts || {};
    const runs = Array.isArray(sync.runs) ? sync.runs : [];

    const sourceLeagueIds = Array.isArray(settings.source_league_ids) && settings.source_league_ids.length
      ? settings.source_league_ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [Number(settings.source_league_id || 0)].filter((id) => Number.isInteger(id) && id > 0);
    const sourceIsPlaceholder = sourceLeagueIds.length === 1 && sourceLeagueIds[0] === 999999;
    const configuredLeagueIds = sourceIsPlaceholder ? [] : sourceLeagueIds.filter((id) => id !== 999999);
    const weights = Array.isArray(sync.league_weights) ? sync.league_weights : [];
    const isEcl = activeLeagueCode() === "ECL";
    if ($("divisionSyncSettings")) $("divisionSyncSettings").hidden = !isEcl;
    if ($("genericSyncSettings")) $("genericSyncSettings").hidden = isEcl;

    DIVISION_SYNC_FIELDS.forEach((field) => {
      const row = weights.find((item) => clean(item?.division).toLowerCase() === field.division.toLowerCase()) || {};
      if ($(field.leagueId)) $(field.leagueId).value = row.league_id || "";
      if ($(field.factorId)) $(field.factorId).value = Number(row.multiplier ?? field.defaultFactor).toFixed(2);
    });
    if ($("syncGenericLeagueIds")) $("syncGenericLeagueIds").value = configuredLeagueIds.join(", ");
    if ($("syncAutoEnabled")) $("syncAutoEnabled").checked = sourceIsPlaceholder ? false : Boolean(settings.auto_sync_enabled);
    if ($("runSportsGamerSync")) $("runSportsGamerSync").disabled = configuredLeagueIds.length === 0;
    if ($("syncTimes")) $("syncTimes").value = Array.isArray(settings.schedule_times)
      ? settings.schedule_times.join(", ")
      : "";

    const lastImport = counts.last_import_at
      ? new Date(counts.last_import_at).toLocaleString("sv-SE")
      : "Aldrig";

    const cards = [
      ["SPORTSGAMER LIGOR", configuredLeagueIds.length ? configuredLeagueIds.join(" · ") : "EJ SATT", configuredLeagueIds.length > 1 ? configuredLeagueIds.length + " källor" : (configuredLeagueIds.length ? "1 källa" : "väntar på liga-ID")],
      ["MATCHER", counts.matches || 0, "importerade"],
      ["MATCHRADER", counts.match_player_rows || 0, "spelare/match"],
      ["SPELARE", counts.players_with_match_rows || 0, "med matchdata"],
      ["SENAST", lastImport, settings.auto_sync_enabled ? "auto aktiv" : "auto av"]
    ];

    if ($("syncCards")) {
      $("syncCards").innerHTML = cards.map(([label, value, sub]) => `
        <article class="fa-card ${label === "MATCHRADER" ? "is-accent" : ""}">
          <span>${esc(label)}</span>
          <strong>${esc(value)}</strong>
          <small>${esc(sub)}</small>
        </article>
      `).join("");
    }

    if ($("syncRuns")) {
      $("syncRuns").innerHTML = runs.length ? runs.map((run) => {
        const started = run.started_at ? new Date(run.started_at).toLocaleString("sv-SE") : "–";
        const status = clean(run.status || "–").toUpperCase();
        const source = clean(run.source_table || run.details?.skater_source || "");
        const runLeagueIds = Array.isArray(run.details?.source_league_ids)
          ? run.details.source_league_ids.join(", ")
          : (run.source_league_id || "");
        return `
          <div class="fa-list-row">
            <span>
              <strong>${esc(status)} · ${esc(run.trigger_type || "manual")}</strong>
              <small>${esc(started)} · liga ${esc(runLeagueIds || "–")} · ${esc(run.player_rows_upserted || 0)} matchrader${source ? " · " + esc(source) : ""}</small>
              ${run.error_message ? '<small class="fa-sync-error">' + esc(run.error_message) + '</small>' : ""}
            </span>
            <b>${esc(run.matches_upserted || 0)} M</b>
          </div>
        `;
      }).join("") : '<div class="fa-empty">Inga synkkörningar ännu.</div>';
    }
  }

  function renderAll() {
    renderAdminChrome();
    renderDashboard();
    renderCompetition();
    renderPool();
    renderEntries();
    renderSync();
    renderSclSimulationStatus();
  }

  async function saveCompetition(event) {
    event.preventDefault();
    setStatus("competitionStatus", "Sparar…", "working");

    try {
      const localLock = $("compLockAt").value;
      const lockAt = localLock ? new Date(localLock).toISOString() : null;

      const { error } = await sb.rpc("seh_fantasy_admin_update_competition", {
        p_code: activeCompetitionCode(),
        p_status: $("compStatus").value,
        p_budget: Number($("compBudget").value),
        p_max_players_per_real_team: Number($("compMaxTeam").value),
        p_captain_multiplier: Number($("compCaptainMultiplier").value),
        p_transfers_enabled: $("compTransfers").checked,
        p_lock_at: lockAt
      });

      if (error) throw error;

      const scopeResult = await sb.rpc("seh_fantasy_admin_update_nationality_scope", {
        p_code: activeCompetitionCode(),
        p_scope: $("compNationalityScope")?.value || "all"
      });
      if (scopeResult.error) throw scopeResult.error;

      await loadAll();
      setStatus("competitionStatus", "Inställningarna är sparade.", "success");
    } catch (error) {
      setStatus("competitionStatus", "Fel: " + (error?.message || error), "error");
    }
  }

  async function savePlayer(id, button) {
    const row = document.querySelector('[data-pool-row="' + id + '"]');
    if (!row) return;

    button.disabled = true;
    setStatus("poolStatus", "Sparar " + id + "…", "working");

    try {
      const { error } = await sb.rpc("seh_fantasy_admin_update_player", {
        p_pool_player_id: Number(id),
        p_price: Math.round(Number(row.querySelector("[data-player-price]").value)),
        p_is_available: row.querySelector("[data-player-available]").checked,
        p_primary_position: row.querySelector("[data-player-pos]").value
      });

      if (error) throw error;
      await loadPool();
      renderPool();
      setStatus("poolStatus", "Spelaren är uppdaterad.", "success");
    } catch (error) {
      setStatus("poolStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      button.disabled = false;
    }
  }

  async function recalculateEntries() {
    const button = $("recalculateEntries");
    button.disabled = true;
    setStatus("recalcStatus", "Räknar om Fantasy-lagen…", "working");

    try {
      const { data, error } = await sb.rpc("seh_fantasy_admin_recalculate", { p_code: activeCompetitionCode() });
      if (error) throw error;
      await loadAll();
      setStatus("recalcStatus", (data?.updated_entries || 0) + " lag omräknade.", "success");
    } catch (error) {
      setStatus("recalcStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      button.disabled = false;
    }
  }

  async function openEntry(entryId) {
    const dialog = $("entryDialog");
    $("entryDialogContent").innerHTML = '<div class="fa-empty">Hämtar laguppställning…</div>';
    dialog.showModal();

    try {
      const { data, error } = await sb.rpc("seh_fantasy_admin_entry_roster", {
        p_entry_id: Number(entryId)
      });

      if (error) throw error;
      const entry = data?.entry || {};
      const players = Array.isArray(data?.players) ? data.players : [];
      const spend = players.reduce((sum, p) => sum + num(p.locked_price), 0);

      $("entryDialogContent").innerHTML = `
        <span class="fa-kicker">FANTASY-LAG</span>
        <h2>${esc(entry.team_name || "Namnlöst lag")}</h2>
        <p>${esc(entry.owner_name || "Okänd")} · #${esc(entry.current_rank || "–")} · ${fmt(entry.total_points, num(entry.total_points) % 1 ? 1 : 0)} P · ${fmt(spend, spend % 1 ? 1 : 0)} CR</p>
        <div class="fa-roster">
          ${players.map((p) => `
            <article class="fa-roster-player">
              <span>${esc(p.slot)}${p.is_captain ? " · KAPTEN" : ""}</span>
              <strong>${esc(p.display_gamertag)}</strong>
              <small>${esc(p.real_team_name || "–")} · ${fmt(p.locked_price)} CR</small>
              <b>${fmt(p.fantasy_points, num(p.fantasy_points) % 1 ? 1 : 0)} P</b>
            </article>
          `).join("")}
        </div>
      `;
    } catch (error) {
      $("entryDialogContent").innerHTML = '<div class="fa-empty">Fel: ' + esc(error?.message || error) + "</div>";
    }
  }

  function renderSimulation(data) {
    const summary = data?.summary || {};
    const summaryCards = [
      ["KÖRNINGAR", summary.runs || 0, "simulerade lag"],
      ["GILTIGA", summary.valid_teams || 0, (summary.valid_pct || 0) + "%"],
      ["SNITTÅTGÅNG", summary.avg_spend || 0, "CR"],
      ["MEDIAN", summary.points_median || 0, "Fantasy-P"],
      ["P90", summary.points_p90 || 0, "Fantasy-P"],
      ["MAX", summary.max_points || 0, "Fantasy-P"]
    ];

    $("simulationSummary").innerHTML = summaryCards.map(([label, value, sub]) => `
      <article class="fa-card is-accent">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(sub)}</small>
      </article>
    `).join("");

    const position = Array.isArray(data?.position_balance) ? data.position_balance : [];
    $("positionBalance").innerHTML = position.map((row) => `
      <div class="fa-list-row">
        <span><strong>${esc(row.primary_position)}</strong><small>${row.players} spelare · avg pris ${fmt(row.avg_price,1)}</small></span>
        <b>${fmt(row.avg_points,1)} P</b>
      </div>
    `).join("");

    const value = Array.isArray(data?.value_picks) ? data.value_picks : [];
    $("valuePicks").innerHTML = value.map((row) => `
      <div class="fa-list-row">
        <span><strong>${esc(row.display_gamertag)}</strong><small>${esc(row.real_team_name)} · ${fmt(row.price)} CR</small></span>
        <b>${fmt(row.points_per_credit,2)}</b>
      </div>
    `).join("");

    const flops = Array.isArray(data?.expensive_flops) ? data.expensive_flops : [];
    $("expensiveFlops").innerHTML = flops.map((row) => `
      <div class="fa-list-row">
        <span><strong>${esc(row.display_gamertag)}</strong><small>${esc(row.real_team_name)} · ${fmt(row.price)} CR</small></span>
        <b>${fmt(row.fantasy_points,1)} P</b>
      </div>
    `).join("");
  }

  function renderSclSimulationStatus() {
    const data = state.sclSimState || {};
    const cardsHost = $("sclSimCards");
    const groupsHost = $("sclSimGroups");
    const excludedHost = $("sclSimExcluded");
    if (!cardsHost) return;

    const nextMatch = data.next_match_date
      ? new Date(data.next_match_date).toLocaleString("sv-SE", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Stockholm"
        })
      : "–";

    const cards = [
      ["LAG", data.teams || 0, "minst 6 + målvakt"],
      ["MATCHER", data.scheduled_matches || 0, "schemalagda"],
      ["SPELADE", data.played_matches || 0, "simulerade"],
      ["ROTATION", data.bench_appearances || 0, "inhopp utanför bästa sexan"],
      ["NÄSTA", nextMatch, data.active ? "simulering aktiv" : "inte byggd"]
    ];

    cardsHost.innerHTML = cards.map(([label,value,sub]) => `
      <article class="fa-card ${label === "SPELADE" ? "is-accent" : ""}">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(sub)}</small>
      </article>
    `).join("");

    const groups = Array.isArray(data.groups) ? data.groups : [];
    if (groupsHost) {
      groupsHost.innerHTML = groups.length ? groups.map((group) => `
        <div class="fa-list-row">
          <span>
            <strong>Grupp ${group.group_no === 1 ? "A" : "B"}</strong>
            <small>${group.teams} lag · snittstyrka ${fmt(group.avg_strength,2)}</small>
          </span>
          <b>${group.teams}</b>
        </div>
      `).join("") : '<div class="fa-empty">Bygg testsäsongen för att skapa grupper.</div>';
    }

    const excluded = Array.isArray(data.excluded_no_goalie) ? data.excluded_no_goalie : [];
    if (excludedHost) {
      excludedHost.innerHTML = excluded.length
        ? excluded.map((name) => '<span class="fa-sim-excluded">' + esc(name) + '</span>').join("")
        : '<span class="fa-sim-ok">Inga lag med 6+ spelare saknar målvakt.</span>';
    }

    const built = num(data.teams) > 0;
    if ($("playNextSimNight")) $("playNextSimNight").disabled = !built;
    if ($("playSimPeriod")) $("playSimPeriod").disabled = !built;
    if ($("playWholeSimSeason")) $("playWholeSimSeason").disabled = !built;
    if ($("resetSclSimulation")) $("resetSclSimulation").disabled = !built;
  }

  async function runSclSimulationAction(action) {
    const buttons = [
      $("buildSclSimulation"), $("playNextSimNight"), $("playSimPeriod"),
      $("playWholeSimSeason"), $("resetSclSimulation")
    ].filter(Boolean);

    buttons.forEach((button) => { button.disabled = true; });
    setStatus("sclSimulationStatus", "Arbetar med SCL-testsäsongen…", "working");

    try {
      let rpcName = "";
      let args = { p_code: "SCL27" };

      if (action === "build") rpcName = "seh_fantasy_admin_scl_sim_build";
      else if (action === "next") rpcName = "seh_fantasy_admin_scl_sim_play_next_night";
      else if (action === "period") {
        rpcName = "seh_fantasy_admin_scl_sim_play_period";
        args.p_period_no = Number($("sclSimPeriod")?.value || 1);
      } else if (action === "all") rpcName = "seh_fantasy_admin_scl_sim_play_all";
      else if (action === "reset") rpcName = "seh_fantasy_admin_scl_sim_reset";
      else throw new Error("Okänd simuleringsåtgärd.");

      const { data, error } = await sb.rpc(rpcName, args);
      if (error) throw error;

      await Promise.all([refreshAdminState(), loadPool(), loadSclSimulationStatus()]);
      renderAll();

      const played = num(data?.played_matches);
      const teams = num(data?.teams);
      const message = action === "build"
        ? "Testsäsongen är byggd med " + teams + " lag."
        : action === "reset"
          ? "Simuleringen är återställd. Testmatcherna och testpoängen är borttagna."
          : played
            ? played + " matcher simulerades."
            : "Klart.";

      setStatus("sclSimulationStatus", message, "success");
    } catch (error) {
      setStatus("sclSimulationStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      await loadSclSimulationStatus().catch(() => {});
      renderSclSimulationStatus();
    }
  }

  function parseLeagueWeights() {
    return DIVISION_SYNC_FIELDS.map((field) => {
      const rawLeague = clean($(field.leagueId)?.value);
      const leagueId = rawLeague ? Number(rawLeague) : null;
      const multiplier = Number($(field.factorId)?.value);

      if (leagueId != null && (!Number.isInteger(leagueId) || leagueId <= 0 || leagueId === 999999)) {
        throw new Error("Ogiltigt liga-ID för " + field.division + ".");
      }
      if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 1.5) {
        throw new Error("Ogiltig poängfaktor för " + field.division + ".");
      }

      return {
        division: field.division,
        league_id: leagueId,
        multiplier: Number(multiplier.toFixed(2))
      };
    });
  }

  function parseGenericLeagueIds() {
    const values = clean($("syncGenericLeagueIds")?.value)
      .split(/[\s,;]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0 && value !== 999999);
    return [...new Set(values)].slice(0, 10);
  }

  function parseSyncTimes() {
    return clean($("syncTimes")?.value)
      .split(/[\s,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  async function saveSyncSettings(event) {
    event.preventDefault();
    setStatus("syncSettingsStatus", "Sparar synkinställningar…", "working");

    try {
      const isEcl = activeLeagueCode() === "ECL";
      let leagueIds = [];

      if (isEcl) {
        const weights = parseLeagueWeights();
        leagueIds = weights.map((item) => item.league_id).filter(Boolean);

        const weightResult = await sb.rpc("seh_fantasy_admin_update_league_weights", {
          p_code: activeCompetitionCode(),
          p_weights: weights
        });
        if (weightResult.error) throw weightResult.error;
      } else {
        leagueIds = parseGenericLeagueIds();
        if (leagueIds.length) {
          const sourceResult = await sb.rpc("seh_fantasy_admin_update_sync_sources", {
            p_code: activeCompetitionCode(),
            p_source_league_ids: leagueIds
          });
          if (sourceResult.error) throw sourceResult.error;
        }
      }

      if (Boolean($("syncAutoEnabled")?.checked) && !leagueIds.length) {
        throw new Error("Ange minst ett riktigt SportsGamer liga-ID innan autosynk aktiveras.");
      }

      const { error } = await sb.rpc("seh_fantasy_admin_update_sync_settings", {
        p_code: activeCompetitionCode(),
        p_enabled: Boolean($("syncAutoEnabled")?.checked),
        p_times: parseSyncTimes()
      });
      if (error) throw error;
      await loadSyncState();
      renderSync();
      setStatus("syncSettingsStatus", "Synkinställningarna är sparade.", "success");
    } catch (error) {
      setStatus("syncSettingsStatus", "Fel: " + (error?.message || error), "error");
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function callAdminSync(body) {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Adminsessionen saknas.");

    const response = await fetch(supabaseUrl + "/functions/v1/seh-admin-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "apikey": supabaseKey
      },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Synktjänsten svarade med " + response.status + ".");
    return payload;
  }

  async function runSportsGamerSync() {
    const button = $("runSportsGamerSync");
    if (!button) return;
    button.disabled = true;
    setStatus("syncActionStatus", "Startar SportsGamer-synk…", "working");

    const requestId = "fantasy_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

    try {
      const leagueIds = Array.isArray(state.syncState?.settings?.source_league_ids)
        ? state.syncState.settings.source_league_ids
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0 && id !== 999999)
        : [];
      if (!leagueIds.length) {
        throw new Error("SportsGamer liga-ID:n är inte satta ännu.");
      }

      await callAdminSync({
        action: "start",
        job: "fantasy_sportsgamer",
        request_id: requestId,
        competition_code: activeCompetitionCode(),
        league_ids: leagueIds
      });

      setStatus("syncActionStatus", "Synken är startad. Väntar på GitHub Actions…", "working");

      for (let attempt = 0; attempt < 72; attempt += 1) {
        await sleep(5000);
        const status = await callAdminSync({
          action: "status",
          job: "fantasy_sportsgamer",
          request_id: requestId
        });

        if (status.state === "completed") {
          if (status.conclusion === "success") {
            await loadAll();
            setStatus("syncActionStatus", "SportsGamer-synken är klar och Fantasy-poängen är uppdaterade.", "success");
          } else {
            await loadSyncState();
            renderSync();
            throw new Error("GitHub-körningen avslutades med " + (status.conclusion || "fel") + ".");
          }
          return;
        }

        const label = status.state === "in_progress" ? "Hämtar SportsGamer-data…" : "Synken väntar i kön…";
        setStatus("syncActionStatus", label, "working");
      }

      await loadSyncState();
      renderSync();
      setStatus("syncActionStatus", "Synken kör fortfarande. Klicka Uppdatera för aktuell status.", "working");
    } catch (error) {
      setStatus("syncActionStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      button.disabled = false;
    }
  }

  async function runSimulation() {
    const button = $("runSimulation");
    button.disabled = true;
    setStatus("simulationStatus", "Kör simulering…", "working");

    try {
      const { data, error } = await sb.rpc("seh_fantasy_admin_simulate", {
        p_code: activeCompetitionCode(),
        p_runs: Number($("simulationRuns").value)
      });

      if (error) throw error;
      renderSimulation(data);
      setStatus("simulationStatus", "Simuleringen är klar.", "success");
    } catch (error) {
      setStatus("simulationStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      button.disabled = false;
    }
  }

  function renderNewCompetitionSourceFields() {
    const league = clean($("newCompetitionLeague")?.value).toUpperCase();
    if ($("newGenericLeagueSource")) $("newGenericLeagueSource").hidden = league === "ECL";
    if ($("newEclLeagueSources")) $("newEclLeagueSources").hidden = league !== "ECL";
  }

  function parseNewGenericLeagueIds() {
    return [...new Set(
      clean($("newCompetitionLeagueIds")?.value)
        .split(/[\s,;]+/)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && value !== 999999)
    )].slice(0, 10);
  }

  function parseNewEclWeights() {
    const fields = [
      ["Elite","newEclEliteId","newEclEliteFactor",1.10],
      ["Pro","newEclProId","newEclProFactor",1.05],
      ["Lite","newEclLiteId","newEclLiteFactor",1.00],
      ["Core","newEclCoreId","newEclCoreFactor",0.95],
      ["Neo","newEclNeoId","newEclNeoFactor",0.90]
    ];

    return fields.map(([division,idField,factorField,defaultFactor]) => {
      const rawId = clean($(idField)?.value);
      const leagueId = rawId ? Number(rawId) : null;
      const multiplier = Number($(factorField)?.value || defaultFactor);

      if (leagueId != null && (!Number.isInteger(leagueId) || leagueId <= 0)) {
        throw new Error("Ogiltigt liga-ID för " + division + ".");
      }
      if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 1.5) {
        throw new Error("Ogiltig poängfaktor för " + division + ".");
      }

      return {
        division,
        league_id: leagueId,
        multiplier:Number(multiplier.toFixed(2))
      };
    });
  }

  async function createCompetition(event) {
    event.preventDefault();
    const button = $("createCompetitionSubmit");
    if (button) button.disabled = true;
    setStatus("createCompetitionStatus", "Skapar Fantasy-liga…", "working");

    try {
      const league = clean($("newCompetitionLeague")?.value).toUpperCase();
      const season = clean($("newCompetitionSeason")?.value);
      const customCode = clean($("newCompetitionCode")?.value);
      const startsOn = clean($("newCompetitionStartsOn")?.value) || null;
      const scopeValue = clean($("newCompetitionScope")?.value);
      const scope = scopeValue === "default"
        ? (league === "ECL" ? "sweden" : "all")
        : scopeValue;

      if (!season) throw new Error("Ange säsongsnamn, till exempel ECL 26 Spring.");

      const { data, error } = await sb.rpc("seh_fantasy_admin_create_competition", {
        p_competition_code: league,
        p_season_label: season,
        p_name: season + " Fantasy",
        p_code: customCode || null,
        p_starts_on: startsOn,
        p_nationality_scope: scope
      });
      if (error) throw error;

      const code = clean(data?.code);
      if (!code) throw new Error("Fantasy-ligan skapades men koden kunde inte läsas.");

      if (league === "ECL") {
        const weights = parseNewEclWeights();
        const hasAnyLeagueId = weights.some((item) => item.league_id);

        if (hasAnyLeagueId) {
          const weightResult = await sb.rpc("seh_fantasy_admin_update_league_weights", {
            p_code: code,
            p_weights: weights
          });
          if (weightResult.error) throw weightResult.error;
        }
      } else {
        const leagueIds = parseNewGenericLeagueIds();
        if (leagueIds.length) {
          const sourceResult = await sb.rpc("seh_fantasy_admin_update_sync_sources", {
            p_code: code,
            p_source_league_ids: leagueIds
          });
          if (sourceResult.error) throw sourceResult.error;
        }
      }

      setStatus("createCompetitionStatus", "Fantasy-ligan är skapad och SportsGamer-källan är kopplad.", "success");
      const url = new URL(window.location.href);
      url.searchParams.set("competition", code);
      window.location.href = url.toString();
    } catch (error) {
      setStatus("createCompetitionStatus", "Fel: " + (error?.message || error), "error");
      if (button) button.disabled = false;
    }
  }

  function switchCompetition(code) {
    const next = clean(code).toUpperCase();
    if (!next || next === activeCompetitionCode()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("competition", next);
    window.location.href = url.toString();
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      switchTab(tab.dataset.tab);
      return;
    }

    const openTab = event.target.closest("[data-open-tab]");
    if (openTab) {
      switchTab(openTab.dataset.openTab);
      return;
    }

    const save = event.target.closest("[data-save-player]");
    if (save) {
      savePlayer(save.dataset.savePlayer, save);
      return;
    }

    const entry = event.target.closest("[data-entry-id]");
    if (entry && !event.target.closest("[data-save-player]")) {
      openEntry(entry.dataset.entryId);
    }
  });

  $("competitionForm")?.addEventListener("submit", saveCompetition);
  $("syncSettingsForm")?.addEventListener("submit", saveSyncSettings);
  $("runSportsGamerSync")?.addEventListener("click", runSportsGamerSync);
  $("refreshSyncState")?.addEventListener("click", async () => {
    setStatus("syncActionStatus", "Uppdaterar status…", "working");
    try {
      await loadSyncState();
      renderSync();
      setStatus("syncActionStatus", "Status uppdaterad.", "success");
    } catch (error) {
      setStatus("syncActionStatus", "Fel: " + (error?.message || error), "error");
    }
  });
  $("recalculateEntries")?.addEventListener("click", recalculateEntries);
  $("runSimulation")?.addEventListener("click", runSimulation);
  $("buildSclSimulation")?.addEventListener("click", () => runSclSimulationAction("build"));
  $("playNextSimNight")?.addEventListener("click", () => runSclSimulationAction("next"));
  $("playSimPeriod")?.addEventListener("click", () => runSclSimulationAction("period"));
  $("playWholeSimSeason")?.addEventListener("click", () => runSclSimulationAction("all"));
  $("resetSclSimulation")?.addEventListener("click", () => runSclSimulationAction("reset"));
  $("refreshSclSimulation")?.addEventListener("click", async () => {
    setStatus("sclSimulationStatus", "Uppdaterar simuleringsstatus…", "working");
    try {
      await loadSclSimulationStatus();
      renderSclSimulationStatus();
      setStatus("sclSimulationStatus", "Status uppdaterad.", "success");
    } catch (error) {
      setStatus("sclSimulationStatus", "Fel: " + (error?.message || error), "error");
    }
  });
  $("adminCompetitionSelect")?.addEventListener("change", (event) => switchCompetition(event.target.value));
  $("heroCompetitionSelect")?.addEventListener("change", (event) => switchCompetition(event.target.value));
  $("heroCreateCompetition")?.addEventListener("click", () => {
    $("createCompetitionDialog")?.showModal();
  });
  $("openCreateCompetition")?.addEventListener("click", () => {
    $("createCompetitionDialog")?.showModal();
  });
  $("closeCreateCompetitionDialog")?.addEventListener("click", () => $("createCompetitionDialog")?.close());
  $("createCompetitionDialog")?.addEventListener("cancel", () => {});
  $("createCompetitionForm")?.addEventListener("submit", createCompetition);
  $("newCompetitionLeague")?.addEventListener("change", () => {
    const league = clean($("newCompetitionLeague")?.value).toUpperCase();
    if ($("newCompetitionScope")) $("newCompetitionScope").value = "default";
    if ($("newCompetitionCode")) $("newCompetitionCode").placeholder =
      league === "ECL" ? "t.ex. ECL26S" : league + "27";
    renderNewCompetitionSourceFields();
  });
  renderNewCompetitionSourceFields();

  $("retryAuth")?.addEventListener("click", init);
  $("poolSearch")?.addEventListener("input", renderPool);
  $("poolPosition")?.addEventListener("change", renderPool);
  $("closeEntryDialog")?.addEventListener("click", () => $("entryDialog").close());

  async function init() {
    try {
      const ok = await ensureAdmin();
      if (!ok) return;
      await Promise.all([loadPool(), loadSyncState(), loadSclSimulationStatus()]);
      renderAll();
      switchTab("dashboard");
    } catch (error) {
      console.error("Fantasy Admin init failed", error);
      $("authGate").hidden = false;
      $("adminApp").hidden = true;
      $("authGateText").textContent = "Fantasy Admin kunde inte startas: " + (error?.message || error);
    }
  }

  init();
})();