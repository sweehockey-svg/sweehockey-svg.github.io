(() => {
  "use strict";

  const cfg = window.COMMENTATOR_CONFIG;
  const sb = window.supabase;
  const client = cfg && sb ? sb.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  }) : null;

  const state = {
    competition: null,
    teams: [],
    teamById: new Map(),
    vasby: null,
    opponent: null,
    nextGame: null,
    standings: [],
    standingsByTeam: new Map(),
    roster: [],
    vasbyForm: [],
    opponentForm: [],
    latestVasbyGame: null,
    latestEvents: [],
    latestTeamStats: new Map(),
    latestPlayerStats: [],
    latestGoalieStats: [],
    seasonPlayerStats: [],
    seasonGoalieStats: [],
    recentPlayerStats: [],
    recentGoalieStats: [],
    nextLineup: null,
    fallbackLineups: new Map(),
    seasonSpecialTeams: [],
    teamGameStats: []
  };

  const panels = {
    match: {
      kicker: "MATCH",
      title: "Matchöversikt",
      cards: [
        ["Nästa match", "Laddar från Hockeyettan Norra 2026/27."],
        ["Datakälla", "Swehockey → collector → Supabase → cockpit."]
      ]
    },
    lines: {
      kicker: "KEDJOR",
      title: "Matchkedjor",
      cards: []
    },
    players: {
      kicker: "SPELARE",
      title: "Spelarstatistik",
      cards: []
    },
    goalies: {
      kicker: "MÅLVAKTER",
      title: "Målvaktsstatistik",
      cards: []
    },
    special: {
      kicker: "PP / BP",
      title: "Special teams",
      cards: []
    },
    live: {
      kicker: "LIVE",
      title: "Live matchdata",
      cards: [
        ["Nästa steg", "Matchspecifik eventcollector kopplas mot Swehockey Game/Events."],
        ["Grunddata", "Schema, resultat, tabell och roster är redan automatiskt synkade."]
      ]
    },
    story: {
      kicker: "STORYLINES",
      title: "Matchens vinklar",
      cards: [
        ["Automatiskt", "Form, tidigare möten, streaks och situationsstatistik byggs från verifierad historik."],
        ["Redaktionellt", "Egna anteckningar kan komplettera med sådant som inte finns i officiell statistik."]
      ]
    },
    h2h: {
      kicker: "H2H",
      title: "Tidigare möten",
      cards: [
        ["Datagrund", "H2H räknas från importerade matcher. Äldre säsonger läggs till efter V1-flödet."],
        ["Ingen dubbellagring", "Senaste möten och sviter beräknas från matchhistoriken när panelen öppnas."]
      ]
    },
    studio: {
      kicker: "STUDIO",
      title: "Periodunderlag",
      cards: [
        ["Periodslut", "När live- och rapportcollectorn är inkopplad byggs pausunderlaget automatiskt."],
        ["Verifierat först", "Skott, special teams och nyckelhändelser kommer från matchens officiella data."]
      ]
    },
    ai: {
      kicker: "AI",
      title: "AI-assistent",
      cards: [
        ["Begränsad källa", "AI får endast strukturerad, verifierad data från stats engine och godkända anteckningar."],
        ["Ingen statistikfantasi", "AI formulerar samtalspunkter men får inte hitta på matchfakta."]
      ]
    }
  };

  const drawer = document.getElementById("drawer");
  const drawerKicker = document.getElementById("drawerKicker");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function shortTeam(name) {
    if (!name) return "—";
    return name
      .replace(/ Hockey| IK| IF| HC| HK/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 3) || "—";
  }

  function swedishDate(iso) {
    if (!iso) return "Tid ej fastställd";
    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm"
    }).format(new Date(iso)).replace(",", " ·");
  }

  function ageOn(dateText, referenceIso) {
    if (!dateText) return null;
    const birth = new Date(dateText + "T12:00:00Z");
    const ref = referenceIso ? new Date(referenceIso) : new Date();
    let age = ref.getUTCFullYear() - birth.getUTCFullYear();
    const beforeBirthday =
      ref.getUTCMonth() < birth.getUTCMonth() ||
      (ref.getUTCMonth() === birth.getUTCMonth() && ref.getUTCDate() < birth.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  function getTeamName(id) {
    return state.teamById.get(id)?.canonical_name || "Okänt lag";
  }

  function resultForTeam(game, teamId) {
    const home = game.home_team_id === teamId;
    const gf = home ? game.home_score : game.away_score;
    const ga = home ? game.away_score : game.home_score;
    if (gf > ga) return "win";
    if (gf < ga) return "loss";
    return "tie";
  }

  function formatPct(value) {
    if (value == null || value === "") return "–";
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + "%" : "–";
  }

  function formatClockSeconds(value) {
    if (value == null || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const minutes = Math.floor(n / 60);
    const seconds = Math.floor(n % 60);
    return minutes + ":" + String(seconds).padStart(2, "0");
  }

  function latestStatsPair() {
    const game = state.latestVasbyGame;
    if (!game) return { home: null, away: null };
    return {
      home: state.latestTeamStats.get(game.home_team_id) || null,
      away: state.latestTeamStats.get(game.away_team_id) || null
    };
  }

  function statPair(a, b, formatter = (v) => v ?? "–") {
    return formatter(a) + "–" + formatter(b);
  }

  function renderMatchStats() {
    const game = state.latestVasbyGame;
    if (!game) return;
    const { home, away } = latestStatsPair();
    const homeName = getTeamName(game.home_team_id);
    const awayName = getTeamName(game.away_team_id);
    const detail = shortTeam(homeName) + "–" + shortTeam(awayName);

    document.getElementById("shotsValue").textContent =
      statPair(home?.shots, away?.shots);
    document.getElementById("shotsDetail").textContent = detail;

    document.getElementById("savesValue").textContent =
      statPair(home?.saves, away?.saves);
    document.getElementById("savesDetail").textContent = detail;

    document.getElementById("ppValue").textContent =
      statPair(home?.power_play_pct, away?.power_play_pct, formatPct);
    const ppTimes = [formatClockSeconds(home?.power_play_seconds), formatClockSeconds(away?.power_play_seconds)]
      .filter(Boolean);
    document.getElementById("ppDetail").textContent =
      ppTimes.length === 2 ? ppTimes.join("–") : detail;

    document.getElementById("pimValue").textContent =
      statPair(home?.pim, away?.pim);
    document.getElementById("pimDetail").textContent = detail;
  }

  function matchStatsStripHtml() {
    const game = state.latestVasbyGame;
    if (!game) return "";
    const { home, away } = latestStatsPair();
    if (!home && !away) return "";
    const items = [
      ["SKOTT", statPair(home?.shots, away?.shots)],
      ["RÄDDNINGAR", statPair(home?.saves, away?.saves)],
      ["PP", statPair(home?.power_play_pct, away?.power_play_pct, formatPct)],
      ["PIM", statPair(home?.pim, away?.pim)]
    ];
    return '<div class="match-stats-strip">' +
      items.map(([label, value]) =>
        '<div><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>'
      ).join("") +
    '</div>';
  }

  function renderForm(elementId, games, teamId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const results = games.map((game) => resultForTeam(game, teamId));
    el.innerHTML = Array.from({ length: 5 }, (_, i) =>
      '<i class="' + (results[i] || "") + '"></i>'
    ).join("");
  }

  function renderStandingsQuick() {
    const el = document.getElementById("standingsQuick");
    if (!el || !state.vasby || !state.opponent) return;
    const rows = [state.vasby, state.opponent].map((team) => {
      const row = state.standingsByTeam.get(team.id);
      return '<div><b>' + esc(row?.rank ?? "–") + '</b><span>' +
        esc(team.canonical_name) + '</span><em>' + esc(row?.points ?? "–") + ' p</em></div>';
    });
    el.innerHTML = rows.join("");
  }

  function renderLatestGame() {
    const feed = document.getElementById("eventFeed");
    const game = state.latestVasbyGame;
    if (!feed || !game) return;
    feed.className = "event-feed-live";

    const eventRows = state.latestEvents.length
      ? '<div class="event-list">' + state.latestEvents.map((event) => {
          const teamName = event.team_id ? getTeamName(event.team_id) : "";
          const label = event.event_type === "goal" ? "MÅL" :
            event.event_type === "penalty" ? "UTVISNING" :
            event.event_type === "goalie_in" ? "MV IN" :
            event.event_type === "goalie_out" ? "MV UT" :
            event.event_type === "timeout" ? "TIMEOUT" :
            event.event_type === "powerbreak" ? "POWERBREAK" : event.event_type.replaceAll("_", " ").toUpperCase();
          const score = event.home_score != null && event.away_score != null
            ? '<b>' + event.home_score + '–' + event.away_score + '</b>'
            : '';
          return '<div class="event-row ' + (event.event_type === "goal" ? "goal" : "") + '">' +
            '<div class="event-time"><strong>' + esc(event.clock_display || "–") + '</strong><span>P' + esc(event.period || "–") + '</span></div>' +
            '<div class="event-copy"><div><em>' + esc(label) + '</em>' + (teamName ? '<span>' + esc(teamName) + '</span>' : '') + '</div>' +
            '<p>' + esc(event.description || "") + '</p></div>' +
            '<div class="event-score">' + score + '</div>' +
          '</div>';
        }).join("") + '</div>'
      : '<div class="recent-game-foot">Inga importerade händelser för matchen ännu.</div>';

    feed.innerHTML =
      '<article class="recent-game">' +
        '<div class="recent-game-top"><span>SENASTE VÄSBY-MATCH · OFFICIELL EVENTDATA</span><span>' + esc(swedishDate(game.scheduled_start)) + '</span></div>' +
        '<div class="recent-game-score">' +
          '<span>' + esc(getTeamName(game.home_team_id)) + '</span>' +
          '<strong>' + esc(game.home_score) + '–' + esc(game.away_score) + '</strong>' +
          '<span>' + esc(getTeamName(game.away_team_id)) + '</span>' +
        '</div>' +
        '<div class="recent-game-foot">' + esc(game.venue_name || "") + ' · ' + state.latestEvents.length + ' importerade händelser</div>' +
      '</article>' +
      matchStatsStripHtml() +
      eventRows;
  }

  function renderFacts() {
    const box = document.getElementById("factStack");
    if (!box || !state.nextGame || !state.vasby || !state.opponent) return;
    const vasbyStanding = state.standingsByTeam.get(state.vasby.id);
    const oppStanding = state.standingsByTeam.get(state.opponent.id);
    box.innerHTML =
      '<article class="fact-card primary">' +
        '<span>NÄSTA MATCH</span>' +
        '<strong>' + esc(state.vasby.canonical_name) + ' – ' + esc(state.opponent.canonical_name) + '</strong>' +
        '<p>' + esc(swedishDate(state.nextGame.scheduled_start)) + ' · ' + esc(state.nextGame.venue_name || "Arena ej angiven") + '</p>' +
      '</article>' +
      '<article class="fact-card">' +
        '<span>TABELL JUST NU</span>' +
        '<strong>Väsby #' + esc(vasbyStanding?.rank ?? "–") + ' · ' + esc(vasbyStanding?.points ?? "–") + ' p</strong>' +
        '<p>' + esc(state.opponent.canonical_name) + ' #' + esc(oppStanding?.rank ?? "–") + ' · ' + esc(oppStanding?.points ?? "–") + ' p</p>' +
      '</article>' +
      '<article class="fact-card">' +
        '<span>MATCHCOLLECTOR</span>' +
        '<strong>' + state.latestEvents.length + ' verifierade händelser från senaste matchen</strong>' +
        '<p>' + state.roster.length + ' aktiva Väsbyspelare i roster. Nästa match-ID bevakas automatiskt när matchen närmar sig.</p>' +
      '</article>';
  }

  function renderRoster() {
    const groups = [
      ["MÅLVAKTER", (p) => p.position === "GK"],
      ["BACKAR", (p) => p.position === "LD" || p.position === "RD"],
      ["FORWARDS", (p) => !["GK", "LD", "RD"].includes(p.position)]
    ];
    return groups.map(([title, test]) => {
      const items = state.roster.filter(test);
      if (!items.length) return "";
      return '<section class="roster-section"><h3 class="roster-section-title">' + title + '</h3><div class="roster-list">' +
        items.map((item) => {
          const p = item.player;
          const age = ageOn(p?.birth_date, state.nextGame?.scheduled_start);
          const meta = [
            item.position,
            age != null ? age + " år" : null,
            p?.shoots_catches ? p.shoots_catches + "-fattad" : null,
            p?.height_cm ? p.height_cm + " cm" : null,
            p?.weight_kg ? p.weight_kg + " kg" : null
          ].filter(Boolean).join(" · ");
          return '<div class="roster-player">' +
            '<b>#' + esc(item.jersey_number ?? "–") + '</b>' +
            '<div><strong>' + esc(p?.display_name || item.source_name || "Okänd spelare") + '</strong>' +
            '<small>' + esc(meta) + (p?.youth_club ? ' · ' + esc(p.youth_club) : '') + '</small></div>' +
            '<em>' + esc(item.position || "") + '</em>' +
          '</div>';
        }).join("") +
      '</div></section>';
    }).join("");
  }

  function humanSourceName(sourceName) {
    const value = String(sourceName || "");
    const comma = value.indexOf(",");
    if (comma < 0) return value;
    return value.slice(comma + 1).trim() + " " + value.slice(0, comma).trim();
  }

  function cleanLineupSourceName(sourceName) {
    return String(sourceName || "").replace(/\s*\((RD|LD|RW|LW|CE|GK)\)\s*$/i, "").trim();
  }

  async function loadLineup(game) {
    if (!game?.id) return null;
    const { data: revision, error: revisionError } = await client.from("game_lineup_revisions")
      .select("id,game_id,fetched_at,source_updated_at,status,source_url")
      .eq("game_id", game.id)
      .eq("is_current", true)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (revisionError) throw revisionError;
    if (!revision) return null;

    const { data: players, error: playersError } = await client.from("game_lineup_players")
      .select("team_id,player_id,source_name,jersey_number,position,line_number,goalie_role,is_extra")
      .eq("lineup_revision_id", revision.id)
      .order("line_number", { ascending: true, nullsFirst: true })
      .order("jersey_number", { ascending: true });
    if (playersError) throw playersError;

    return { game, revision, players: players || [] };
  }

  function lineupContextForTeam(teamId) {
    const official = state.nextLineup?.players?.some((row) => row.team_id === teamId);
    if (official) {
      return { ...state.nextLineup, mode: "official" };
    }
    const fallback = state.fallbackLineups.get(teamId) || null;
    return fallback ? { ...fallback, mode: "previous" } : null;
  }

  function lineupSlot(row, position) {
    if (!row) {
      return '<div class="lineup-slot empty"><span>' + esc(position) + '</span><strong>–</strong></div>';
    }
    return '<div class="lineup-slot">' +
      '<span>' + esc(position) + '</span>' +
      '<b>#' + esc(row.jersey_number ?? "–") + '</b>' +
      '<strong>' + esc(humanSourceName(cleanLineupSourceName(row.source_name))) + '</strong>' +
    '</div>';
  }

  function renderLineupTeam(teamId) {
    const ctx = lineupContextForTeam(teamId);
    const teamName = getTeamName(teamId);

    if (!ctx) {
      return '<section class="lineup-team">' +
        '<div class="lineup-team-head"><div><span>INGEN LINEUP</span><h3>' + esc(teamName) + '</h3></div></div>' +
        '<div class="drawer-card"><strong>Uppställning saknas</strong><span>Ingen tidigare lineup är importerad för laget ännu.</span></div>' +
      '</section>';
    }

    const rows = ctx.players.filter((row) => row.team_id === teamId);
    const goalies = rows
      .filter((row) => row.position === "GK")
      .sort((a, b) => String(a.goalie_role || "").localeCompare(String(b.goalie_role || "")));
    const extras = rows.filter((row) => row.line_number == null && row.position !== "GK");
    const statusLabel = ctx.mode === "official" ? "OFFICIELL LINEUP ✓" : "SENAST ANVÄNDA";
    const meta = ctx.mode === "official"
      ? swedishDate(state.nextGame.scheduled_start)
      : "Från " + swedishDate(ctx.game.scheduled_start);

    const lineHtml = [1,2,3,4].map((lineNumber) => {
      const line = rows.filter((row) => Number(row.line_number) === lineNumber);
      const byPos = new Map(line.filter((row) => row.position).map((row) => [row.position, row]));
      if (!line.length) return "";
      return '<article class="lineup-line">' +
        '<div class="lineup-line-head"><strong>' + lineNumber + ':A</strong><span>' + esc(teamName) + '</span></div>' +
        '<div class="lineup-forwards">' +
          lineupSlot(byPos.get("LW"), "LW") +
          lineupSlot(byPos.get("CE"), "C") +
          lineupSlot(byPos.get("RW"), "RW") +
        '</div>' +
        '<div class="lineup-defense">' +
          lineupSlot(byPos.get("LD"), "LD") +
          lineupSlot(byPos.get("RD"), "RD") +
        '</div>' +
      '</article>';
    }).join("");

    const goaliesHtml = '<div class="lineup-goalies">' +
      goalies.map((row, i) =>
        '<div><span>' + (i === 0 ? "G1" : "G2") + '</span><b>#' + esc(row.jersey_number ?? "–") + '</b><strong>' +
        esc(humanSourceName(cleanLineupSourceName(row.source_name))) + '</strong></div>'
      ).join("") +
    '</div>';

    const extrasHtml = extras.length
      ? '<div class="lineup-extras"><span>EXTRA</span>' + extras.map((row) =>
          '<strong>#' + esc(row.jersey_number ?? "–") + ' ' + esc(humanSourceName(cleanLineupSourceName(row.source_name))) + '</strong>'
        ).join("") + '</div>'
      : "";

    return '<section class="lineup-team">' +
      '<div class="lineup-team-head"><div><span class="' + (ctx.mode === "official" ? "official" : "") + '">' + statusLabel + '</span><h3>' + esc(teamName) + '</h3></div><small>' + esc(meta) + '</small></div>' +
      goaliesHtml +
      '<div class="lineup-lines">' + lineHtml + '</div>' +
      extrasHtml +
    '</section>';
  }

  function renderLineups() {
    const officialTeams = state.nextLineup
      ? new Set(state.nextLineup.players.map((row) => row.team_id))
      : new Set();
    const officialReady = officialTeams.has(state.vasby.id) && officialTeams.has(state.opponent.id);

    const intro = officialReady
      ? '<article class="drawer-card lineup-info official"><strong>Officiell lineup publicerad</strong><span>Uppställningen för nästa match hämtas direkt från Swehockey och ersätter automatiskt tidigare kedjor.</span></article>'
      : '<article class="drawer-card lineup-info"><strong>Officiell lineup är inte publicerad ännu</strong><span>Visar respektive lags senast importerade uppställning tills nästa matchs lineup kommer. Den byts då ut automatiskt.</span></article>';

    return intro +
      '<div class="lineup-team-grid">' +
        renderLineupTeam(state.vasby.id) +
        renderLineupTeam(state.opponent.id) +
      '</div>';
  }

  function sourceNameKey(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE");
  }

  function recentGameIdsForTeam(teamId) {
    return (teamId === state.vasby?.id ? state.vasbyForm : state.opponentForm)
      .map((game) => game.id);
  }

  function sameStatPlayer(seasonRow, gameRow) {
    if (seasonRow.player_id && gameRow.player_id) {
      return seasonRow.player_id === gameRow.player_id;
    }
    return seasonRow.team_id === gameRow.team_id &&
      sourceNameKey(seasonRow.source_name) === sourceNameKey(gameRow.source_name);
  }

  function aggregateRecentPlayer(seasonRow) {
    const allowedGames = new Set(recentGameIdsForTeam(seasonRow.team_id));
    const rows = state.recentPlayerStats.filter((row) =>
      allowedGames.has(row.game_id) && sameStatPlayer(seasonRow, row)
    );
    const goals = rows.reduce((sum, row) => sum + Number(row.goals || 0), 0);
    const assists = rows.reduce((sum, row) => sum + Number(row.assists || 0), 0);
    const points = rows.reduce((sum, row) => sum + Number(row.points || 0), 0);
    const shots = rows.reduce((sum, row) => sum + Number(row.shots || 0), 0);
    const pim = rows.reduce((sum, row) => sum + Number(row.pim || 0), 0);
    const plusMinus = rows.reduce((sum, row) => sum + Number(row.plus_minus || 0), 0);
    const faceoffWins = rows.reduce((sum, row) => sum + Number(row.faceoff_wins || 0), 0);
    const faceoffLosses = rows.reduce((sum, row) => sum + Number(row.faceoff_losses || 0), 0);
    const foTotal = faceoffWins + faceoffLosses;
    return {
      games: rows.length,
      goals,
      assists,
      points,
      shots,
      pim,
      plusMinus,
      faceoffPct: foTotal ? (faceoffWins / foTotal) * 100 : null
    };
  }

  function aggregateRecentGoalie(seasonRow) {
    const allowedGames = new Set(recentGameIdsForTeam(seasonRow.team_id));
    const rows = state.recentGoalieStats.filter((row) =>
      allowedGames.has(row.game_id) && sameStatPlayer(seasonRow, row)
    );
    const saves = rows.reduce((sum, row) => sum + Number(row.saves || 0), 0);
    const shotsAgainst = rows.reduce((sum, row) => sum + Number(row.shots_against || 0), 0);
    const goalsAgainst = rows.reduce((sum, row) => sum + Number(row.goals_against || 0), 0);
    const seconds = rows.reduce((sum, row) => sum + Number(row.minutes_played_seconds || 0), 0);
    return {
      games: rows.length,
      saves,
      shotsAgainst,
      goalsAgainst,
      seconds,
      savePct: shotsAgainst ? (saves / shotsAgainst) * 100 : null,
      gaa: seconds ? (goalsAgainst * 3600) / seconds : null
    };
  }

  function renderPlayerStats() {
    if (!state.seasonPlayerStats.length || !state.nextGame) {
      return '<div class="drawer-card"><strong>Ingen säsongsstatistik ännu</strong><span>Swehockeys Players By Team har ännu inte gett oss spelardata.</span></div>';
    }

    const teamOrder = [state.vasby.id, state.opponent.id];
    return teamOrder.map((teamId) => {
      const rows = state.seasonPlayerStats
        .filter((row) => row.team_id === teamId && row.position !== "GK")
        .sort((a, b) =>
          Number(b.points || 0) - Number(a.points || 0) ||
          Number(b.goals || 0) - Number(a.goals || 0) ||
          Number(b.shots || 0) - Number(a.shots || 0) ||
          Number(a.jersey_number || 999) - Number(b.jersey_number || 999)
        );

      if (!rows.length) return "";
      return '<section class="player-stat-section">' +
        '<h3 class="roster-section-title">' + esc(getTeamName(teamId)) + ' · SÄSONG</h3>' +
        '<div class="player-stat-head"><span>SPELARE</span><span>GP</span><span>G</span><span>A</span><span>P</span><span>SOG</span><span>FO%</span></div>' +
        '<div class="player-stat-list">' +
          rows.map((row) => {
            const recent = aggregateRecentPlayer(row);
            const fo = row.faceoff_pct == null ? "–" :
              Number(row.faceoff_pct).toLocaleString("sv-SE", { maximumFractionDigits: 1 });
            const recentText = recent.games
              ? 'S5 ' + recent.games + ' GP · ' + recent.goals + '+' + recent.assists + ' · ' + recent.points + ' P'
              : 'S5 väntar på matchrapport';
            return '<div class="player-stat-row">' +
              '<div class="player-stat-name"><b>#' + esc(row.jersey_number ?? "–") + '</b><span>' +
                '<strong>' + esc(humanSourceName(row.source_name)) + '</strong>' +
                '<small>' + esc((row.position || "") + ' · ' + recentText) + '</small>' +
              '</span></div>' +
              '<em>' + esc(row.games_played ?? 0) + '</em>' +
              '<em>' + esc(row.goals ?? 0) + '</em>' +
              '<em>' + esc(row.assists ?? 0) + '</em>' +
              '<em class="pts">' + esc(row.points ?? 0) + '</em>' +
              '<em>' + esc(row.shots ?? 0) + '</em>' +
              '<em>' + esc(fo) + '</em>' +
            '</div>';
          }).join("") +
        '</div>' +
      '</section>';
    }).join("");
  }

  function renderGoalieStats() {
    if (!state.seasonGoalieStats.length || !state.nextGame) {
      return '<div class="drawer-card"><strong>Ingen målvaktsstatistik ännu</strong><span>Swehockeys säsongstabell har ännu inte gett oss målvaktsdata.</span></div>';
    }

    const teamOrder = [state.vasby.id, state.opponent.id];
    return teamOrder.map((teamId) => {
      const rows = state.seasonGoalieStats
        .filter((row) => row.team_id === teamId)
        .sort((a, b) =>
          Number(b.games_played || 0) - Number(a.games_played || 0) ||
          Number(b.minutes_played_seconds || 0) - Number(a.minutes_played_seconds || 0)
        );
      if (!rows.length) return "";

      return '<section class="goalie-team-section">' +
        '<h3 class="roster-section-title">' + esc(getTeamName(teamId)) + ' · SÄSONG</h3>' +
        '<div class="goalie-card-grid">' + rows.map((row) => {
          const recent = aggregateRecentGoalie(row);
          const svPct = row.save_pct == null ? "–" :
            Number(row.save_pct).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
          const gaa = row.gaa == null ? "–" :
            Number(row.gaa).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const record = Number(row.games_played || 0)
            ? String(row.wins ?? 0) + "–" + String(row.losses ?? 0)
            : "–";
          const recentSv = recent.savePct == null ? "–" :
            recent.savePct.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
          const recentGaa = recent.gaa == null ? "–" :
            recent.gaa.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          return '<article class="goalie-card">' +
            '<div class="goalie-card-head"><span>SÄSONG</span><b>#' + esc(row.jersey_number ?? "–") + '</b></div>' +
            '<h3>' + esc(humanSourceName(row.source_name)) + '</h3>' +
            '<div class="goalie-metrics goalie-season-metrics">' +
              '<div><span>GP</span><strong>' + esc(row.games_played ?? 0) + '</strong></div>' +
              '<div><span>SV%</span><strong>' + esc(svPct) + '</strong></div>' +
              '<div><span>GAA</span><strong>' + esc(gaa) + '</strong></div>' +
              '<div><span>W–L</span><strong>' + esc(record) + '</strong></div>' +
            '</div>' +
            '<div class="goalie-recent">' +
              '<span>S5</span><strong>' + esc(recent.games + ' GP · ' + recent.saves + '/' + recent.shotsAgainst + ' · ' + recentSv + ' · GAA ' + recentGaa) + '</strong>' +
            '</div>' +
          '</article>';
        }).join("") + '</div>' +
      '</section>';
    }).join("");
  }


  function seasonSpecialForTeam(teamId) {
    return state.seasonSpecialTeams.find((row) => row.team_id === teamId) || null;
  }

  function aggregateRecentSpecial(teamId) {
    const allowed = new Set(recentGameIdsForTeam(teamId));
    const rows = state.teamGameStats.filter((row) =>
      row.team_id === teamId &&
      allowed.has(row.game_id) &&
      row.power_play_opportunities != null &&
      row.penalty_kill_opportunities != null
    );
    const games = new Set(rows.map((row) => row.game_id)).size;
    const ppOpp = rows.reduce((sum,row)=>sum+Number(row.power_play_opportunities||0),0);
    const ppGoals = rows.reduce((sum,row)=>sum+Number(row.power_play_goals||0),0);
    const pkOpp = rows.reduce((sum,row)=>sum+Number(row.penalty_kill_opportunities||0),0);
    const pkGa = rows.reduce((sum,row)=>sum+Number(row.penalty_kill_goals_against||0),0);
    return {
      games,
      ppOpp,
      ppGoals,
      ppPct: ppOpp ? ppGoals/ppOpp*100 : null,
      pkOpp,
      pkGa,
      pkPct: pkOpp ? (pkOpp-pkGa)/pkOpp*100 : null
    };
  }

  function nextGameSpecialForTeam(teamId) {
    return state.teamGameStats.find((row) =>
      row.game_id === state.nextGame?.id && row.team_id === teamId
    ) || null;
  }

  function specialRecord(goals, opportunities) {
    if (goals == null || opportunities == null) return "–";
    return String(goals) + "/" + String(opportunities);
  }

  function renderSpecialTeamCard(teamId) {
    const season=seasonSpecialForTeam(teamId);
    const recent=aggregateRecentSpecial(teamId);
    const current=nextGameSpecialForTeam(teamId);
    const name=getTeamName(teamId);

    if(!season){
      return '<section class="special-team-card"><h3>'+esc(name)+'</h3><div class="drawer-card"><strong>Ingen special teams-data</strong><span>Swehockey har ännu inte publicerat säsongsraden.</span></div></section>';
    }

    const seasonPkKills = season.pk_opportunities == null || season.pk_goals_against == null
      ? null
      : Number(season.pk_opportunities)-Number(season.pk_goals_against);
    const recentPkKills = recent.pkOpp-recent.pkGa;

    const currentHtml=current && current.power_play_opportunities != null
      ? '<div class="special-current"><span>AKTUELL MATCH</span><strong>PP '+
          esc(specialRecord(current.power_play_goals,current.power_play_opportunities))+
          ' · BP '+esc(specialRecord(
            Number(current.penalty_kill_opportunities||0)-Number(current.penalty_kill_goals_against||0),
            current.penalty_kill_opportunities
          ))+'</strong></div>'
      : '<div class="special-current muted"><span>NÄSTA MATCH</span><strong>Väntar på matchdata</strong></div>';

    return '<section class="special-team-card">' +
      '<div class="special-team-head"><span>SÄSONG</span><h3>'+esc(name)+'</h3></div>' +
      '<div class="special-primary">' +
        '<div><span>POWERPLAY</span><strong>'+esc(formatPct(season.pp_pct))+'</strong><small>'+
          esc(specialRecord(season.pp_goals,season.pp_opportunities))+' · '+esc(formatClockSeconds(season.pp_seconds))+
        '</small></div>' +
        '<div><span>BOXPLAY</span><strong>'+esc(formatPct(season.pk_pct))+'</strong><small>'+
          esc(specialRecord(seasonPkKills,season.pk_opportunities))+' dödade</small></div>' +
      '</div>' +
      '<div class="special-recent">' +
        '<span>SENASTE 5 · '+esc(recent.games)+' SPELADE</span>' +
        '<strong>PP '+esc(specialRecord(recent.ppGoals,recent.ppOpp))+
          ' ('+esc(formatPct(recent.ppPct))+') · BP '+
          esc(specialRecord(recentPkKills,recent.pkOpp))+
          ' ('+esc(formatPct(recent.pkPct))+')</strong>' +
      '</div>' +
      currentHtml +
    '</section>';
  }

  function renderSpecialTeams() {
    return '<article class="drawer-card special-intro"><strong>PP / BP</strong><span>Säsongen kommer direkt från Swehockeys officiella PP/Penalty Killing-tabell. Senaste 5 räknas från importerade officiella matchrapporter.</span></article>' +
      '<div class="special-team-grid">' +
        renderSpecialTeamCard(state.vasby.id) +
        renderSpecialTeamCard(state.opponent.id) +
      '</div>';
  }

  function renderDrawer(key) {
    const data = panels[key] || panels.match;
    drawerKicker.textContent = data.kicker;
    drawerTitle.textContent = data.title;

    drawer.classList.toggle("wide", key === "lines");
    if (key === "lines") {
      drawerBody.innerHTML = renderLineups();
    } else if (key === "players") {
      drawerBody.innerHTML =
        '<article class="drawer-card"><strong>Säsong + senaste 5</strong><span>Säsongstotalen kommer direkt från Swehockey. S5 räknas från de fem senaste Player Summary-rapporterna som finns importerade.</span></article>' +
        renderPlayerStats();
    } else if (key === "goalies") {
      drawerBody.innerHTML =
        '<article class="drawer-card"><strong>Säsong + senaste 5</strong><span>SV%, GAA och record kommer från Swehockeys säsongstabell. S5 räknas från matchrapporterna.</span></article>' +
        renderGoalieStats();
    } else if (key === "special") {
      drawerBody.innerHTML = renderSpecialTeams();
    } else {
      drawerBody.innerHTML = data.cards.map(([title, text]) =>
        '<article class="drawer-card"><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></article>'
      ).join("");
    }
    drawer.classList.add("open");
  }

  async function loadForm(teamId) {
    const { data, error } = await client.from("games")
      .select("id,scheduled_start,home_team_id,away_team_id,home_score,away_score,venue_name,status")
      .eq("competition_id", state.competition.id)
      .eq("status", "final")
      .or("home_team_id.eq." + teamId + ",away_team_id.eq." + teamId)
      .order("scheduled_start", { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  }

  async function loadData() {
    if (!client) throw new Error("Supabase-klienten kunde inte startas.");

    const { data: competition, error: compError } = await client.from("competitions")
      .select("id,name,season_label,group_name,updated_at")
      .eq("source", "swehockey")
      .eq("source_competition_id", "21043")
      .single();
    if (compError) throw compError;
    state.competition = competition;

    const { data: teams, error: teamError } = await client.from("teams")
      .select("id,canonical_name,short_name");
    if (teamError) throw teamError;
    state.teams = teams || [];
    state.teamById = new Map(state.teams.map((team) => [team.id, team]));
    state.vasby = state.teams.find((team) => team.canonical_name === "Väsby IK HK");
    if (!state.vasby) throw new Error("Väsby IK HK saknas i importerad data.");

    const { data: nextGames, error: nextError } = await client.from("games")
      .select("id,scheduled_start,home_team_id,away_team_id,venue_name,status,home_score,away_score,source_game_id,source_event_game_id,game_number")
      .eq("competition_id", competition.id)
      .or("home_team_id.eq." + state.vasby.id + ",away_team_id.eq." + state.vasby.id)
      .gt("scheduled_start", new Date().toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(1);
    if (nextError) throw nextError;
    state.nextGame = nextGames?.[0] || null;
    if (!state.nextGame) throw new Error("Ingen kommande Väsby-match hittades.");

    const opponentId = state.nextGame.home_team_id === state.vasby.id
      ? state.nextGame.away_team_id
      : state.nextGame.home_team_id;
    state.opponent = state.teamById.get(opponentId);
    if (!state.opponent) throw new Error("Motståndarlaget saknas.");

    const { data: latestSnapshot, error: snapError } = await client.from("standings_snapshots")
      .select("id,fetched_at")
      .eq("competition_id", competition.id)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapError) throw snapError;

    if (latestSnapshot) {
      const { data: standings, error: standingsError } = await client.from("standings_snapshot_rows")
        .select("team_id,rank,games_played,wins,ties,losses,goals_for,goals_against,goal_diff,points")
        .eq("snapshot_id", latestSnapshot.id)
        .order("rank", { ascending: true });
      if (standingsError) throw standingsError;
      state.standings = standings || [];
      state.standingsByTeam = new Map(state.standings.map((row) => [row.team_id, row]));
    }

    const { data: rosterRows, error: rosterError } = await client.from("team_rosters")
      .select("player_id,jersey_number,position,source_name")
      .eq("competition_id", competition.id)
      .eq("team_id", state.vasby.id)
      .eq("is_active", true)
      .order("jersey_number", { ascending: true });
    if (rosterError) throw rosterError;

    const playerIds = [...new Set((rosterRows || []).map((row) => row.player_id).filter(Boolean))];
    let playerMap = new Map();
    if (playerIds.length) {
      const { data: players, error: playerError } = await client.from("players")
        .select("id,display_name,birth_date,nationality_code,shoots_catches,primary_position,height_cm,weight_kg,youth_club")
        .in("id", playerIds);
      if (playerError) throw playerError;
      playerMap = new Map((players || []).map((player) => [player.id, player]));
    }
    state.roster = (rosterRows || []).map((row) => ({ ...row, player: playerMap.get(row.player_id) || null }));

    const [vasbyForm, opponentForm] = await Promise.all([
      loadForm(state.vasby.id),
      loadForm(state.opponent.id)
    ]);
    state.vasbyForm = vasbyForm;
    state.opponentForm = opponentForm;
    state.latestVasbyGame = vasbyForm[0] || null;

    const [nextLineup, vasbyFallbackLineup, opponentFallbackLineup] = await Promise.all([
      loadLineup(state.nextGame),
      loadLineup(state.vasbyForm[0]),
      loadLineup(state.opponentForm[0])
    ]);
    state.nextLineup = nextLineup;
    state.fallbackLineups = new Map();
    if (vasbyFallbackLineup) state.fallbackLineups.set(state.vasby.id, vasbyFallbackLineup);
    if (opponentFallbackLineup) state.fallbackLineups.set(state.opponent.id, opponentFallbackLineup);

    const focusTeamIds = [state.vasby.id, state.opponent.id];
    const recentGameIds = [...new Set([...state.vasbyForm, ...state.opponentForm].map((game) => game.id))];

    const statGameIds = [...new Set([...recentGameIds, state.nextGame.id])];

    const [seasonPlayerResult, seasonGoalieResult, specialSeasonResult, teamGameStatsResult] = await Promise.all([
      client.from("player_season_stats")
        .select("team_id,player_id,source_name,jersey_number,position,games_played,goals,assists,points,pim,plus_minus,game_winning_goals,power_play_goals,shorthanded_goals,shots,shooting_pct,faceoff_wins,faceoff_losses,faceoff_total,faceoff_pct")
        .eq("competition_id", competition.id)
        .in("team_id", focusTeamIds),
      client.from("goalie_season_stats")
        .select("team_id,player_id,source_name,jersey_number,games_played,minutes_played_seconds,goals_against,saves,shots_against,save_pct,gaa,shutouts,wins,losses")
        .eq("competition_id", competition.id)
        .in("team_id", focusTeamIds),
      client.from("team_special_teams_stats")
        .select("team_id,games_played,pp_rank,pp_opportunities,pp_goals,pp_pct,pp_seconds,pk_rank,pk_opportunities,pk_goals_against,pk_pct,pk_seconds,shorthanded_goals_for,shorthanded_goals_against")
        .eq("competition_id", competition.id)
        .in("team_id", focusTeamIds),
      client.from("team_game_stats")
        .select("game_id,team_id,power_play_opportunities,power_play_goals,power_play_pct,power_play_seconds,penalty_kill_opportunities,penalty_kill_goals_against,penalty_kill_pct")
        .in("game_id", statGameIds)
        .in("team_id", focusTeamIds)
    ]);
    if (seasonPlayerResult.error) throw seasonPlayerResult.error;
    if (seasonGoalieResult.error) throw seasonGoalieResult.error;
    if (specialSeasonResult.error) throw specialSeasonResult.error;
    if (teamGameStatsResult.error) throw teamGameStatsResult.error;
    state.seasonPlayerStats = seasonPlayerResult.data || [];
    state.seasonGoalieStats = seasonGoalieResult.data || [];
    state.seasonSpecialTeams = specialSeasonResult.data || [];
    state.teamGameStats = teamGameStatsResult.data || [];

    if (recentGameIds.length) {
      const [recentPlayerResult, recentGoalieResult] = await Promise.all([
        client.from("player_game_stats")
          .select("game_id,team_id,player_id,source_name,jersey_number,position,goals,assists,points,plus_minus,pim,shots,faceoff_wins,faceoff_losses,faceoff_pct")
          .in("game_id", recentGameIds),
        client.from("goalie_game_stats")
          .select("game_id,team_id,player_id,source_name,jersey_number,shots_against,goals_against,saves,save_pct,minutes_played_seconds,gaa")
          .in("game_id", recentGameIds)
      ]);
      if (recentPlayerResult.error) throw recentPlayerResult.error;
      if (recentGoalieResult.error) throw recentGoalieResult.error;
      state.recentPlayerStats = recentPlayerResult.data || [];
      state.recentGoalieStats = recentGoalieResult.data || [];
    } else {
      state.recentPlayerStats = [];
      state.recentGoalieStats = [];
    }

    if (state.latestVasbyGame) {
      state.latestPlayerStats = state.recentPlayerStats.filter((row) => row.game_id === state.latestVasbyGame.id);
      state.latestGoalieStats = state.recentGoalieStats.filter((row) => row.game_id === state.latestVasbyGame.id);
    }

    if (state.latestVasbyGame) {
      const { data: events, error: eventsError } = await client.from("game_events")
        .select("id,period,clock_display,event_seconds,event_type,team_id,strength,home_score,away_score,description")
        .eq("game_id", state.latestVasbyGame.id)
        .eq("is_active", true)
        .order("event_seconds", { ascending: false })
        .order("ordinal", { ascending: true })
        .limit(12);
      if (eventsError) throw eventsError;
      state.latestEvents = events || [];
    }

    if (state.latestVasbyGame) {
      const { data: teamStats, error: teamStatsError } = await client.from("team_game_stats")
        .select("team_id,goals,shots,saves,save_pct,pim,power_play_pct,power_play_seconds,period_stats")
        .eq("game_id", state.latestVasbyGame.id);
      if (teamStatsError) throw teamStatsError;
      state.latestTeamStats = new Map((teamStats || []).map((row) => [row.team_id, row]));
    }

    panels.live.cards = [
      ["Matchcollector", state.latestEvents.length + " händelser lästa från senaste Väsby-matchen."],
      ["Spelardata", state.seasonPlayerStats.filter((row) => row.position !== "GK").length + " säsongsrader · " + state.recentPlayerStats.length + " S5-matchrader."],
      ["Special teams", state.seasonSpecialTeams.length + " säsongsrader · " + state.teamGameStats.filter((row) => row.power_play_opportunities != null).length + " matchrader."],
      ["Nästa match-ID", state.nextGame.source_event_game_id
        ? "Live-/rapport-ID: " + state.nextGame.source_event_game_id
        : "Schema-ID " + (state.nextGame.game_number || "saknas") + " är känt. Live-ID väntas senare."]
    ];

    render();
  }

  function render() {
    const game = state.nextGame;
    const home = state.teamById.get(game.home_team_id);
    const away = state.teamById.get(game.away_team_id);

    document.getElementById("competitionLabel").textContent =
      state.competition.name + " · " + state.competition.season_label;
    document.getElementById("venueLabel").textContent = game.venue_name || "Arena ej angiven";
    document.getElementById("homeName").textContent = home?.canonical_name || "Hemmalag";
    document.getElementById("awayName").textContent = away?.canonical_name || "Bortalag";
    document.querySelector(".team.home .team-badge").textContent = shortTeam(home?.canonical_name);
    document.querySelector(".team.away .team-badge").textContent = shortTeam(away?.canonical_name);
    document.getElementById("gameState").textContent = swedishDate(game.scheduled_start);
    document.getElementById("homeScore").textContent = "–";
    document.getElementById("awayScore").textContent = "–";

    document.getElementById("homeFormLabel").textContent = "Väsby";
    document.getElementById("awayFormLabel").textContent = state.opponent.canonical_name;
    renderForm("homeFormDots", state.vasbyForm, state.vasby.id);
    renderForm("awayFormDots", state.opponentForm, state.opponent.id);

    renderStandingsQuick();
    renderMatchStats();
    renderLatestGame();
    renderFacts();

    const vasbyStanding = state.standingsByTeam.get(state.vasby.id);
    const oppStanding = state.standingsByTeam.get(state.opponent.id);
    panels.match.cards = [
      ["Nästa match", swedishDate(game.scheduled_start) + " · " + (game.venue_name || "Arena ej angiven")],
      ["Tabell", "Väsby #" + (vasbyStanding?.rank ?? "–") + " (" + (vasbyStanding?.points ?? "–") + " p) · " +
        state.opponent.canonical_name + " #" + (oppStanding?.rank ?? "–") + " (" + (oppStanding?.points ?? "–") + " p)"],
      ["Kedjor", state.nextLineup
        ? "Officiell lineup för nästa match är importerad."
        : "Visar senaste kända kedjor tills nästa lineup publiceras."]
    ];

    const syncState = document.getElementById("syncState");
    const syncText = document.getElementById("syncText");
    syncState.classList.add("ok");
    syncText.textContent = "Swehockey synkad · " +
      new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" })
        .format(new Date(state.competition.updated_at));
  }

  function showLoadError(error) {
    console.error("Commentator Cockpit data load failed", error);
    const syncState = document.getElementById("syncState");
    syncState.classList.add("bad");
    document.getElementById("syncText").textContent = "Datakoppling misslyckades";
    document.getElementById("factStack").innerHTML =
      '<div class="data-error"><strong>Kunde inte läsa Hockeyettan-data.</strong><br>' +
      esc(error?.message || error) + '</div>';
  }

  document.querySelectorAll(".deck-key").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".deck-key").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderDrawer(button.dataset.panel);
    });
  });

  document.getElementById("closeDrawer").addEventListener("click", () => drawer.classList.remove("open"));

  document.getElementById("clearDemo").addEventListener("click", () => {
    renderLatestGame();
  });

  function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  updateClock();
  window.setInterval(updateClock, 1000);
  loadData().catch(showLoadError);

  window.CommentatorCockpit = {
    config: cfg || null,
    state,
    reload: () => loadData().catch(showLoadError),
    openPanel: renderDrawer
  };
})();
