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

  const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

  const state = {
    competition: null,
    pool: [],
    leaderboard: [],
    session: null,
    account: null,
    entry: null,
    picks: new Map(),
    activeTab: "team"
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

    $("selectedCount").textContent = state.picks.size + " / 6";
    $("budgetUsed").textContent = format(used, used % 1 ? 1 : 0);
    $("budgetLeft").textContent = format(budget - used, (budget - used) % 1 ? 1 : 0);
    $("budgetLeft").classList.toggle("over-budget", used > budget);

    $$(".fantasy-slot").forEach((slotEl) => {
      const slot = slotEl.dataset.slot;
      const pick = state.picks.get(slot);

      if (!pick) {
        slotEl.innerHTML =
          '<span class="fantasy-slot__position">' + slot + '</span>' +
          '<div class="fantasy-slot__empty">Välj ' + slot + "</div>";
        return;
      }

      const player = pick.player;
      const captain = Number(captainId) === Number(player.id);

      slotEl.innerHTML = `
        <span class="fantasy-slot__position">${slot}</span>
        <div class="fantasy-slot__player">
          <strong>${escapeHtml(clean(player.display_gamertag) || "Okänd")}</strong>
          <small>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")} · ${format(player.price, number(player.price) % 1 ? 1 : 0)} CR</small>
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
          <div class="fantasy-player-row__main">
            <strong>${escapeHtml(player.display_gamertag)}</strong>
            <small>
              ${escapeHtml(clean(player.real_team_name) || "Lag ej klart")} ·
              ${escapeHtml(slots)}
              ${player.ranking_position ? " · #" + player.ranking_position : ""}
            </small>
          </div>
          <div class="fantasy-player-row__price">
            <b>${format(player.price, number(player.price) % 1 ? 1 : 0)}</b>
            <span>CR</span>
          </div>
          <button type="button" data-add="${player.id}" ${alreadySelected || !competitionOpen() ? "disabled" : ""}>
            ${alreadySelected ? "Vald" : "Lägg till"}
          </button>
        </article>
      `;
    }).join("") || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
  }

  function renderPlayers() {
    const host = $("playersGrid");
    if (!host) return;

    if (!state.pool.length) {
      host.innerHTML = '<div class="fantasy-empty">SCL 27-spelarpoolen publiceras när rostrarna är klara.</div>';
      return;
    }

    const rows = filteredPlayers("playersSearch", "playersPosition");

    host.innerHTML = rows.map((player) => `
      <article class="fantasy-player-card">
        <div class="fantasy-player-card__top">
          <span>${escapeHtml(eligibleSlots(player).join("/") || clean(player.primary_position) || "–")}</span>
          <b>${format(player.price, number(player.price) % 1 ? 1 : 0)} CR</b>
        </div>
        <h3>${escapeHtml(player.display_gamertag)}</h3>
        <p>${escapeHtml(clean(player.real_team_name) || "Lag ej klart")}</p>
        <footer>
          <span>${player.ranking_position ? "#" + player.ranking_position + " RP" : "Ej rankad"}</span>
          <span>${player.ranking_points ? format(player.ranking_points) + " RP" : ""}</span>
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

  function renderAll() {
    renderHero();
    renderLineup();
    renderMarket();
    renderPlayers();
    renderLeaderboard();
    updateHeaderAccount();
  }

  function addPlayer(id) {
    const player = playerById(id);
    if (!player || state.picks.size >= 6) return;

    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    if (realTeamCount(player) >= teamLimit) {
      setStatus("saveStatus", "Du får välja högst " + teamLimit + " spelare från samma riktiga lag.", "error");
      return;
    }

    const slot = eligibleSlots(player).find((candidate) => !state.picks.has(candidate));
    if (!slot) {
      setStatus("saveStatus", "Det finns ingen ledig position för " + player.display_gamertag + ".", "error");
      return;
    }

    state.picks.set(slot, { player, isCaptain: false });
    setStatus("saveStatus", "");
    renderAll();
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

  async function loadPublic() {
    const competitionResult = await sb
      .from("ehockey_fantasy_competitions")
      .select("*")
      .eq("code", "SCL27")
      .maybeSingle();

    if (competitionResult.error) throw competitionResult.error;
    state.competition = competitionResult.data || null;
    if (!state.competition) throw new Error("SCL 27 Fantasy är inte konfigurerad.");

    const [poolResult, leaderboardResult] = await Promise.all([
      sb
        .from("ehockey_fantasy_player_pool")
        .select("*")
        .eq("competition_id", state.competition.id)
        .order("price", { ascending: false })
        .order("display_gamertag", { ascending: true }),
      sb
        .from("v_ehockey_fantasy_leaderboard")
        .select("*")
        .eq("competition_id", state.competition.id)
        .order("total_points", { ascending: false })
        .limit(100)
    ]);

    if (poolResult.error) throw poolResult.error;
    if (leaderboardResult.error) throw leaderboardResult.error;

    state.pool = poolResult.data || [];
    state.leaderboard = leaderboardResult.data || [];
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
    state.picks.clear();

    if (!state.entry) {
      if (!clean($("teamName").value)) {
        const playerName = clean(state.account?.player_name);
        $("teamName").value = playerName ? playerName + " Fantasy" : "";
      }
      renderAll();
      return;
    }

    $("teamName").value = state.entry.team_name || "";

    const picksResult = await sb
      .from("ehockey_fantasy_entry_players")
      .select("pool_player_id,slot,is_captain,locked_price")
      .eq("entry_id", state.entry.id);

    if (picksResult.error) throw picksResult.error;

    for (const row of picksResult.data || []) {
      const player = playerById(row.pool_player_id);
      if (!player) continue;
      state.picks.set(row.slot, {
        player,
        isCaptain: Boolean(row.is_captain),
        lockedPrice: row.locked_price
      });
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

    const accountResult = await sb.rpc("seh_get_my_player_account");
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
      renderAll();
      showGate("logged-out");
    }
  }

  async function saveTeam() {
    const teamName = clean($("teamName").value);
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

    if (teamName.length < 2) {
      setStatus("saveStatus", "Ge Fantasy-laget ett namn.", "error");
      $("teamName").focus();
      return;
    }

    $("saveTeam").disabled = true;
    setStatus("saveStatus", "Sparar laget…", "working");

    try {
      const picks = [...state.picks.entries()].map(([slot, pick]) => ({
        pool_player_id: pick.player.id,
        slot,
        is_captain: Boolean(pick.isCaptain)
      }));

      const { error } = await sb.rpc("seh_fantasy_save_my_team", {
        p_competition_code: "SCL27",
        p_team_name: teamName,
        p_picks: picks
      });

      if (error) throw error;

      setStatus("saveStatus", "Laget är sparat.", "success");
      await loadMyEntry();
    } catch (error) {
      setStatus("saveStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      $("saveTeam").disabled = !competitionOpen();
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
    }
  });

  $("discordLogin")?.addEventListener("click", loginWithDiscord);
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

  sb.auth.onAuthStateChange(() => {
    window.setTimeout(() => {
      resolveAccount().catch((error) => {
        console.warn("Fantasy auth refresh failed", error);
      });
    }, 0);
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
