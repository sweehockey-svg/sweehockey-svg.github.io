(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const LEAGUE = 520;
  const SLOTS = ["LW", "C", "RW", "LD", "G", "RD"];
  // Match identity is editorial. Historical numbers only come from Supabase.
  const MATCH_TEAMS = [
    { sports_gamer_team_id: 7046, team_name_in_league: "Daankerzquad" },
    { sports_gamer_team_id: 3252, team_name_in_league: "Västerås IK" }
  ];
  const data = { teams: [], players: [], playoffs: [] };
  const status = { teams: "loading", players: "loading", playoffs: "loading" };
  const lineups = new Map();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const same = (a, b) => String(a) === String(b);
  const number = value => value != null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
  const stat = value => number(value) ?? "–";
  const rate = (n, d, percent = false) => number(n) !== null && number(d) > 0
    ? (percent ? Math.round(100 * Number(n) / Number(d)) + "%" : (Number(n) / Number(d)).toFixed(1)) : "–";
  const total = (a, b) => number(a) === null && number(b) === null ? null : (number(a) ?? 0) + (number(b) ?? 0);
  const logo = t => t.team_logo_in_league || t.current_global_team_logo || "";
  const team = id => data.teams.find(t => same(t.sports_gamer_team_id, id)) || MATCH_TEAMS.find(t => same(t.sports_gamer_team_id, id)) || { team_name_in_league: "LAG" };
  const selectedTeam = side => team($("#" + side).value);
  const roster = t => data.players.filter(p => same(p.sports_gamer_team_id, t.sports_gamer_team_id));
  const position = p => p.playoff_skater_position_abbreviation || p.regular_skater_position_abbreviation || p.roster_preferred_position_abbreviation || ((p.playoff_goalie_games || p.regular_goalie_games) ? "G" : "");
  const stage = (t, name) => data.teams.find(r => same(r.sports_gamer_team_id, t.sports_gamer_team_id) && r.statistics_stage === name) || {};
  const playoff = t => data.playoffs.find(r => same(r.sports_gamer_team_id, t.sports_gamer_team_id)) || {};

  const portraitFiles = new Set(window.SEH_PLAYER_IMAGE_FILES || []);
  const playerImage = p => p.player_image || "../../players/" + (portraitFiles.has(p.sports_gamer_player_id + ".png") ? p.sports_gamer_player_id + ".png" : "1DEFAULTBILDID.png");

  function image(src) {
    return src ? '<img src="' + esc(src) + '" alt="">' : '<div class="sil">?</div>';
  }

  function fill(selector, t) {
    $$(selector).forEach(el => {
      const img = el.querySelector("img");
      if (img) {
        const src = logo(t);
        img.hidden = !src;
        if (src && img.getAttribute("src") !== src) img.src = src;
        if (!src) img.removeAttribute("src");
        img.alt = "";
      }
      const label = el.querySelector("b");
      if (label) label.textContent = t.team_name_in_league;
    });
  }

  function renderTeams() {
    const unique = [...new Map([...MATCH_TEAMS, ...data.teams].map(t => [String(t.sports_gamer_team_id), t])).values()]
      .sort((a, b) => a.team_name_in_league.localeCompare(b.team_name_in_league, "sv"));
    ["home", "away"].forEach((side, index) => {
      const select = $("#" + side);
      const value = select.value || String(MATCH_TEAMS[index].sports_gamer_team_id);
      select.replaceChildren(...unique.map(t => new Option(t.team_name_in_league, String(t.sports_gamer_team_id))));
      select.value = value;
    });
    renderMatch();
  }

  function renderMatch() {
    fill(".homeTeam", selectedTeam("home"));
    fill(".awayTeam", selectedTeam("away"));
    $("#topTitle").textContent = $("#headline").value;
    $("#topSub").textContent = $("#subline").value;
    $("#homeScore").textContent = $("#hs").value || "0";
    $("#awayScore").textContent = $("#as").value || "0";
    $("#personOut").textContent = $("#person").value;
    $("#roleOut").textContent = $("#role").value;
  }

  function lineupFor(side) {
    const t = selectedTeam(side);
    const key = side + ":" + t.sports_gamer_team_id;
    if (lineups.has(key)) return lineups.get(key);
    const ps = roster(t);
    const result = Object.fromEntries(SLOTS.map(slot => [slot, ""]));
    // Do not cache an empty roster while its independent request is pending.
    if (!ps.length) return result;
    const used = new Set();
    const candidates = slot => [...ps].sort((a, b) => {
      const games = p => slot === "G" ? (p.playoff_goalie_games || 0) : (p.playoff_skater_games || 0);
      const regular = p => slot === "G" ? (p.regular_goalie_games || 0) : (p.regular_skater_games || 0);
      return games(b) - games(a) || regular(b) - regular(a) || (b.playoff_points || 0) - (a.playoff_points || 0);
    });
    const assign = (slot, p) => {
      if (!p) return;
      result[slot] = String(p.sports_gamer_player_id);
      used.add(result[slot]);
    };
    // Reserve exact positions first so a missing winger cannot consume the goalie.
    SLOTS.forEach(slot => assign(slot, candidates(slot).find(p => position(p) === slot && !used.has(String(p.sports_gamer_player_id)))));
    SLOTS.filter(slot => !result[slot]).forEach(slot => assign(slot, candidates(slot).find(p => !used.has(String(p.sports_gamer_player_id)) && (slot === "G" ? position(p) === "G" : position(p) !== "G"))));
    lineups.set(key, result);
    return result;
  }

  function renderLineup() {
    const side = $("#lineupSide").value;
    const t = selectedTeam(side), ps = roster(t), lineup = lineupFor(side);
    $("#lineupTeam").textContent = t.team_name_in_league;
    $("#lineupEditors").innerHTML = SLOTS.map(slot => '<label>' + slot + '<select data-lineup-slot="' + slot + '"' + (!ps.length ? " disabled" : "") + '><option value="">Välj spelare</option>' + ps.map(p => '<option value="' + esc(p.sports_gamer_player_id) + '"' + (same(lineup[slot], p.sports_gamer_player_id) ? " selected" : "") + '>' + esc(p.display_gamertag) + ' · ' + esc(position(p) || "–") + '</option>').join("") + '</select></label>').join("");
    $(".players").innerHTML = SLOTS.map(slot => {
      const p = ps.find(p => same(p.sports_gamer_player_id, lineup[slot]));
      if (!p) return '<div class="player empty"><span>' + slot + '</span><div class="sil">?</div><b>EJ VALD</b></div>';
      return '<div class="player"><span>' + slot + '</span>' + image(playerImage(p)) + '<div class="player-info"><strong>#' + esc(p.player_number ?? "") + ' ' + esc(p.display_gamertag) + '</strong><small>GRUPP ' + stat(p.regular_points) + ' P · SLUTSPEL ' + stat(p.playoff_points) + ' P</small></div></div>';
    }).join("");
  }

  function renderStats() {
    const h = selectedTeam("home"), a = selectedTeam("away");
    const hr = stage(h, "regular"), ar = stage(a, "regular"), hp = stage(h, "playoffs"), ap = stage(a, "playoffs");
    const rows = [
      [rate(hr.total_wins, hr.games_played, true), rate(ar.total_wins, ar.games_played, true), "GRUPP WIN RATE"],
      [rate(hr.goals_for, hr.games_played), rate(ar.goals_for, ar.games_played), "GRUPP MÅL / MATCH"],
      [rate(hp.total_wins, hp.games_played, true), rate(ap.total_wins, ap.games_played, true), "SLUTSPEL WIN RATE"],
      [stat(hp.goals_for), stat(ap.goals_for), "SLUTSPEL MÅL"]
    ];
    $(".statrows").innerHTML = rows.map(r => '<div><b>' + r[0] + '</b><span>' + r[2] + '</span><b>' + r[1] + '</b></div>').join("");
  }

  function renderRoad() {
    $("#roadGrid").innerHTML = ["home", "away"].map(side => {
      const t = selectedTeam(side), r = stage(t, "regular"), po = playoff(t);
      return '<div class="road-card"><div class="road-team">' + (logo(t) ? image(logo(t)) : "") + '<b>' + esc(t.team_name_in_league) + '</b></div><div class="road-step"><small>GRUPPSPEL</small><strong>#' + stat(po.regular_season_seed) + '</strong><span>' + stat(r.total_wins) + ' vinster · ' + stat(r.goals_for) + '–' + stat(r.goals_against) + '</span></div><i></i><div class="road-step"><small>SLUTSPEL · ' + esc(po.playoff_round_name || "DATA SAKNAS") + '</small><strong>' + stat(po.series_won) + '–' + stat(po.series_lost) + ' serier</strong><span>' + stat(po.matched_playoff_game_wins) + ' matchvinster</span></div><i></i><div class="road-step final"><small>FIKTIV TESTMATCH</small><strong>BRONS</strong><span>Ingen historisk bronsmatch</span></div></div>';
    }).join("");
  }

  function renderLeaders() {
    const ids = [$("#home").value, $("#away").value];
    const leaders = data.players.filter(p => ids.includes(String(p.sports_gamer_team_id)) && ((p.regular_skater_games || 0) + (p.playoff_skater_games || 0) > 0))
      .sort((a, b) => (total(b.regular_points, b.playoff_points) ?? 0) - (total(a.regular_points, a.playoff_points) ?? 0)).slice(0, 4);
    $("#leaderGrid").innerHTML = leaders.length ? leaders.map(p => '<div class="leader-card">' + image(playerImage(p)) + '<div><small>' + esc(p.team_name_in_league) + '</small><b>' + esc(p.display_gamertag) + '</b><span>' + stat(total(p.regular_goals, p.playoff_goals)) + ' G · ' + stat(total(p.regular_assists, p.playoff_assists)) + ' A · <strong>' + stat(total(p.regular_points, p.playoff_points)) + ' P</strong></span><em>Grupp ' + stat(p.regular_points) + ' · Slutspel ' + stat(p.playoff_points) + '</em></div></div>').join("") : '<p>Spelarstatistik saknas.</p>';
  }

  function renderStatus() {
    const labels = { teams: "Lagstatistik", players: "Trupp/spelare", playoffs: "Slutspel" };
    $("#dataStatus").textContent = Object.entries(status).map(([key, state]) => labels[key] + ": " + ({ loading: "laddar…", ready: "klar", empty: "saknas", error: "kunde inte laddas" }[state])).join(" · ");
  }

  async function loadPart(key, view, render) {
    try {
      const cfg = window.EHOCKEY_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) throw new Error("Supabase-konfiguration saknas");
      const apiKey = String(cfg.supabasePublishableKey);
      const headers = { apikey: apiKey, Accept: "application/json" };
      if (/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(apiKey)) headers.Authorization = "Bearer " + apiKey;
      const url = String(cfg.supabaseUrl).replace(/\/+$/, "") + "/rest/v1/" + view + "?select=*&sports_gamer_league_id=eq." + LEAGUE;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(view + " HTTP " + response.status);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.some(row => !row || !same(row.sports_gamer_league_id, LEAGUE) || row.sports_gamer_team_id == null || typeof row.team_name_in_league !== "string" || (key === "players" && (row.sports_gamer_player_id == null || typeof row.display_gamertag !== "string")))) throw new Error(view + ": oväntat dataformat");
      data[key] = key === "players" ? [...new Map(rows.map(p => [p.sports_gamer_team_id + ":" + p.sports_gamer_player_id, p])).values()] : rows;
      status[key] = rows.length ? "ready" : "empty";
      render();
    } catch (error) {
      status[key] = "error";
      console.error("Broadcast " + key + ":", error);
    }
    renderStatus();
  }

  // Controls are installed synchronously, before any data request starts.
  $("[data-scene]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.lineupSide) {
      $("#lineupSide").value = button.dataset.lineupSide;
      renderLineup();
    }
    $("[data-scene]").forEach(b => b.classList.toggle("active", b === button));
    $(".scene").forEach(scene => scene.classList.toggle("active", scene.classList.contains(button.dataset.scene)));
  }));
  $("#lineupSide").addEventListener("change", renderLineup);
  $("#lineupEditors").addEventListener("change", event => {
    const select = event.target.closest("[data-lineup-slot]");
    if (!select) return;
    const side = $("#lineupSide").value, lineup = lineupFor(side), slot = select.dataset.lineupSlot;
    if (select.value && !roster(selectedTeam(side)).some(p => same(p.sports_gamer_player_id, select.value))) return;
    // Move an already selected player by swapping positions, never duplicating them.
    const other = SLOTS.find(s => s !== slot && select.value && lineup[s] === select.value);
    if (other) lineup[other] = lineup[slot];
    lineup[slot] = select.value;
    renderLineup();
  });
  ["home", "away"].forEach(side => $("#" + side).addEventListener("change", () => {
    $("#subline").value = selectedTeam("home").team_name_in_league.toLocaleUpperCase("sv") + " vs " + selectedTeam("away").team_name_in_league.toLocaleUpperCase("sv");
    renderMatch();
    renderLineup();
    renderStats();
    renderRoad();
    renderLeaders();
  }));
  ["hs", "as", "headline", "subline", "person", "role"].forEach(id => $("#" + id).addEventListener("input", renderMatch));
  $("#screen").addEventListener("error", event => {
    if (event.target.tagName === "IMG") event.target.hidden = true;
  }, true);
  renderTeams();
  renderLineup();
  renderStats();
  renderRoad();
  renderLeaders();
  renderStatus();
  void loadPart("teams", "v_sec21_broadcast_teams_public", () => { renderTeams(); renderStats(); renderRoad(); renderLineup(); });
  void loadPart("players", "v_sec21_broadcast_players_public", () => { renderLineup(); renderLeaders(); });
  void loadPart("playoffs", "v_sec21_broadcast_playoffs_public", renderRoad);
})();
