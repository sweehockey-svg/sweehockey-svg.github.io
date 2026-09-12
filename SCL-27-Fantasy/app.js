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
    transferState: null,
    activeTab: "team",
    pendingPlacementPlayerId: null,
    pickerSlot: null
  };

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
      minute: "2-digit"
    }).format(date);
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
        ? "PRESEASON · OBEGRÄNSADE BYTEN"
        : mode === "unlimited"
          ? (clean(target?.name) || "FRI TRANSFERRUNDA")
          : mode === "round"
            ? (clean(target?.name) || "KOMMANDE RUNDA")
            : mode === "closed"
              ? "TRANSFERFÖNSTRET STÄNGT"
              : "BYTEN AVSTÄNGDA";

    $("transferFree").textContent = unlimited ? "∞" : String(free);
    $("transferNext").textContent = unlimited || free > 0 ? "0 P" : "−" + format(extraCost) + " P";
    $("transferDeadline").textContent = target?.lock_at ? formatDeadline(target.lock_at) : "Ej satt";

    $("transferDetail").textContent = unlimited
      ? "Bygg om fritt fram till första riktiga runddeadlinen. Därefter: 1 gratis byte per runda, max 2 sparade."
      : mode === "round"
        ? "1 gratis byte per runda · max 2 sparade · extra byte kostar −" + format(extraCost) + " P. Kaptensbyte är gratis."
        : mode === "closed"
          ? "Inga fler rundor är öppna för byten."
          : "Transferreglerna är inte aktiva just nu.";
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
    const detail = state.savedBreakdowns.get(Number(pick.player.id)) || null;
    const base = number(row?.fantasy_points);
    const multiplier = pick.isCaptain ? number(state.competition?.captain_multiplier || 1) : 1;

    return {
      base,
      multiplier,
      total: base * multiplier,
      games: number(row?.games),
      detail
    };
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
        scorePill("Blocks", d.blocked_shots, d.block_points, "ice")
      ].join("");
    }

    return [
      scorePill("Mål", d.goals, d.goal_points, "goal"),
      scorePill("Assist", d.assists, d.assist_points, "assist"),
      scorePill("GWG", d.game_winning_goals, d.gwg_points, "success")
    ].join("");
  }

  function draftMatchesSavedRoster() {
    if (!state.entry || state.picks.size !== state.savedPicks.size) return false;

    for (const [slot, pick] of state.picks.entries()) {
      if (!savedPickMatches(slot, pick)) return false;
    }

    return true;
  }

  function countryFlag(code) {
    const normalized = clean(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) return "🌐";
    return String.fromCodePoint(
      ...[...normalized].map((letter) => 127397 + letter.charCodeAt(0))
    );
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

  function renderHero() {
    const comp = state.competition;
    $("heroStart").textContent = comp?.starts_on ? formatDate(comp.starts_on).toUpperCase() : "1 OKT";
    $("heroStatus").textContent = clean(comp?.status || "setup").toUpperCase();
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
      setStatus("saveStatus", "Spelarpoolen öppnas när SCL 27-rostrarna och priserna är klara.");
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
    const savedRosterIsCurrent = draftMatchesSavedRoster();

    $("selectedCount").textContent = state.picks.size + " / 6";
    $("budgetUsed").textContent = format(used, used % 1 ? 1 : 0);
    $("budgetLeft").textContent = format(budget - used, (budget - used) % 1 ? 1 : 0);
    $("budgetLeft").classList.toggle("over-budget", used > budget);

    if ($("teamPoints")) {
      $("teamPoints").textContent = state.entry ? formatPoints(state.entry.total_points) + " P" : "–";
      $("teamPoints").classList.toggle("is-stale", Boolean(state.entry) && !savedRosterIsCurrent);
    }
    if ($("teamPointsLabel")) {
      $("teamPointsLabel").textContent = state.entry && !savedRosterIsCurrent
        ? "SAVED SCL25 PTS"
        : "SCL25 POINTS";
    }

    if (saveButton) {
      const complete = state.picks.size === 6;
      const hasCaptain = Boolean(captainId);
      const withinBudget = used <= budget;
      const savedAndUnchanged = Boolean(state.entry) && savedRosterIsCurrent;
      const canSave = competitionOpen() && complete && hasCaptain && withinBudget && !savedAndUnchanged;

      saveButton.disabled = !canSave;
      saveButton.classList.toggle("is-saved", savedAndUnchanged);
      saveButton.textContent = !complete
        ? "VÄLJ 6 SPELARE"
        : !hasCaptain
          ? "VÄLJ KAPTEN"
          : !withinBudget
            ? "ÖVER BUDGET"
            : savedAndUnchanged
              ? "TESTLAG SPARAT"
              : state.entry
                ? "UPPDATERA TESTLAG"
                : "LOCK IN TEST TEAM";
    }

    $$(".fantasy-slot").forEach((slotEl) => {
      const slot = slotEl.dataset.slot;
      const pick = state.picks.get(slot);

      if (!pick) {
        slotEl.classList.remove("is-filled", "is-captain-card");
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
      const flag = countryFlag(player.country_code);
      const savedScore = savedScoreBreakdown(slot, pick);
      const scoreMarkup = savedScore
        ? `<div class="fantasy-slot__score">
            <div class="fantasy-slot__score-head">
              <span>SCL 25</span>
              <strong>${formatPoints(savedScore.total)} P</strong>
            </div>
            <small>${pick.isCaptain
              ? formatPoints(savedScore.base) + " × " + format(savedScore.multiplier, savedScore.multiplier % 1 ? 1 : 0)
              : savedScore.games + " matcher"}</small>
          </div>
          <div class="fantasy-slot__details">${savedStatMarkup(savedScore)}</div>`
        : (state.entry
          ? '<div class="fantasy-slot__score fantasy-slot__score--pending"><span>ÄNDRAT</span><small>Spara laget för replaypoäng</small></div>'
          : "");

      slotEl.classList.add("is-filled");
      slotEl.classList.toggle("is-captain-card", captain);

      slotEl.innerHTML = `
        <div class="fantasy-slot__player">
          <div class="fantasy-slot__visual">
            <div class="fantasy-slot__portrait-wrap">
              ${portraitMarkup(player, "fantasy-slot__portrait")}
              <span class="fantasy-slot__position fantasy-slot__position--overlay">${slot}</span>
            </div>
            <div class="fantasy-slot__identity">
              <strong><span class="fantasy-flag">${flag}</span>${escapeHtml(clean(player.display_gamertag) || "Okänd")}</strong>
              <small class="fantasy-slot__team">
                ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--slot")}
                <span>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</span>
              </small>
              <small>${escapeHtml(eligibleSlots(player).join(" / "))} · ${format(player.price, number(player.price) % 1 ? 1 : 0)} CR</small>
            </div>
          </div>
          ${scoreMarkup}
          <div class="fantasy-slot__actions">
            <button type="button" data-captain="${player.id}" class="${captain ? "is-captain" : ""}">
              ${captain ? "KAPTEN" : "Gör kapten"}
            </button>
            <button type="button" data-remove="${slot}">Ta bort</button>
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
            <strong><span class="fantasy-flag">${countryFlag(player.country_code)}</span>${escapeHtml(player.display_gamertag)}</strong>
            <small>
              ${escapeHtml(clean(player.real_team_name) || "Lag ej klart")} ·
              ${escapeHtml(slots)}
            </small>
          </div>
          <div class="fantasy-player-row__price">
            <b>${format(player.price, number(player.price) % 1 ? 1 : 0)}</b>
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
      host.innerHTML = '<div class="fantasy-empty">SCL 25-testpoolen kunde inte laddas.</div>';
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
              <b>${format(player.price, number(player.price) % 1 ? 1 : 0)} CR</b>
            </div>
            <h3><span class="fantasy-flag">${countryFlag(player.country_code)}</span>${escapeHtml(player.display_gamertag)}</h3>
            <p>
              ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--card")}
              <span>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</span>
            </p>
          </div>
        </div>
        <footer>
          <span>Pris satt före SCL 25</span>
          <span>${escapeHtml(eligibleSlots(player).join(" / "))}</span>
        </footer>
      </article>
    `).join("") || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
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
      <article class="fantasy-leaderboard-row">
        <span>#${row.current_rank || index + 1}</span>
        <strong>${escapeHtml(row.team_name || "Namnlöst lag")}</strong>
        <b>${format(row.total_points, number(row.total_points) % 1 ? 1 : 0)} P</b>
      </article>
    `).join("");
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
    renderMarket();
    renderPlayers();
    renderLeaderboard();
    renderTeamName();
    renderTransferStatus();
    updateHeaderAccount();
  }

  function placePlayer(player, slot) {
    if (!player || !slot) return;

    const occupied = state.picks.get(slot);
    if (occupied) {
      showRosterError(
        slot + " är redan upptagen av " +
        (clean(occupied.player?.display_gamertag) || "en annan spelare") +
        ". Ta bort spelaren på " + slot + " först."
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

    if (selectedIds().has(Number(player.id))) {
      showRosterError((clean(player.display_gamertag) || "Spelaren") + " finns redan i laget.");
      return;
    }

    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    if (realTeamCount(player) >= teamLimit) {
      showRosterError("Du får välja högst " + teamLimit + " spelare från samma riktiga lag.");
      return;
    }

    state.picks.set(slot, { player, isCaptain: false });
    state.pendingPlacementPlayerId = null;
    state.pickerSlot = null;
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
    $("positionDialogText").textContent =
      player.display_gamertag + " kan användas på " + eligibleSlots(player).join(" / ") +
      ". Välj vilken ledig plats spelaren ska ta.";

    choices.innerHTML = slots.map((slot) =>
      '<button type="button" data-place-slot="' + slot + '">' + slot + '</button>'
    ).join("");

    dialog.showModal();
  }

  function pickerPlayers(slot, query = "") {
    const selected = selectedIds();
    const normalizedQuery = clean(query).toLocaleLowerCase("sv-SE");

    return state.pool
      .filter((player) => player.is_available !== false)
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

    $("playerPickerTitle").textContent = "Välj " + slot;
    $("playerPickerCount").textContent = rows.length + " spelare kan användas som " + slot;

    host.innerHTML = rows.map((player) => {
      const teamBlocked = realTeamCount(player) >= teamLimit;
      return `
        <article class="fantasy-picker-player ${teamBlocked ? "is-blocked" : ""}">
          <div class="fantasy-picker-player__portrait-wrap">
            ${portraitMarkup(player, "fantasy-picker-player__portrait")}
            ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--picker")}
          </div>
          <div class="fantasy-picker-player__info">
            <strong><span class="fantasy-flag">${countryFlag(player.country_code)}</span>${escapeHtml(player.display_gamertag)}</strong>
            <small>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</small>
            <span>${escapeHtml(eligibleSlots(player).join(" / "))}</span>
          </div>
          <div class="fantasy-picker-player__price">
            <strong>${format(player.price, number(player.price) % 1 ? 1 : 0)}</strong>
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
        ". Ta bort spelaren på " + slot + " först."
      );
      return;
    }

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

  async function loadPublic() {
    const competitionResult = await sb
      .from("ehockey_fantasy_competitions")
      .select("*")
      .eq("code", "SCL27")
      .maybeSingle();

    if (competitionResult.error) throw competitionResult.error;
    state.competition = competitionResult.data || null;
    if (!state.competition) throw new Error("SCL 27 Fantasy är inte konfigurerad.");

    const poolResult = await sb
      .from("ehockey_fantasy_player_pool")
      .select("*")
      .eq("competition_id", state.competition.id)
      .order("price", { ascending: false })
      .order("display_gamertag", { ascending: true });

    if (poolResult.error) throw poolResult.error;

    state.pool = poolResult.data || [];
    await loadLeaderboard();
  }

  async function loadTransferState() {
    if (!state.session?.user || !state.competition) {
      state.transferState = null;
      renderTransferStatus();
      return;
    }

    const result = await sb.rpc("seh_fantasy_my_transfer_state", {
      p_code: "SCL27"
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
      // Keep any unsaved draft intact. Auth refreshes must never wipe the user's picks.
      renderAll();
      return;
    }

    state.picks.clear();
    state.savedPicks.clear();
    state.savedScores.clear();
    state.savedBreakdowns.clear();

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

      const breakdownResult = await sb.rpc("seh_fantasy_my_saved_score_breakdown", {
        p_code: "SCL27"
      });

      if (breakdownResult.error) throw breakdownResult.error;

      const breakdownRows = Array.isArray(breakdownResult.data)
        ? breakdownResult.data
        : [];

      for (const row of breakdownRows) {
        state.savedBreakdowns.set(Number(row.pool_player_id), row);
      }
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
        p_competition_code: "SCL27",
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
      await loadLeaderboard();
      renderHero();
      renderLeaderboard();

      let successText = hadEntry
        ? "Testlaget är uppdaterat."
        : "Testlaget är sparat.";

      if (transferCount > 0) {
        successText += unlimited
          ? " " + transferCount + " byte är gratis i preseason/fri transferrunda."
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

    const remove = event.target.closest("[data-remove]");
    if (remove) {
      removePlayer(remove.dataset.remove);
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
    $("playerPickerDialog")?.close();
  });
  $("playerPickerDialog")?.addEventListener("cancel", () => {
    state.pickerSlot = null;
  });
  $("playerPickerSearch")?.addEventListener("input", renderPlayerPicker);
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
      console.error("SCL 27 Fantasy kunde inte laddas", error);
      showGate("logged-out", "Fantasy-data kunde inte hämtas just nu.");
      setStatus("gateStatus", "Fel: " + (error?.message || error), "error");

      if (!$("playersGrid").children.length) {
        $("playersGrid").innerHTML = '<div class="fantasy-empty">Fantasy-data kunde inte hämtas just nu.</div>';
      }
    }
  })();
})();
