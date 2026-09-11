/*
  ECL 27 – Svenska lagbyggen.
  Deterministic renderer: Spring baseline + chronological events from
  ecl27-team-builds-source-enrichment.js. No MutationObserver.
*/
(function () {
  "use strict";

  let ecl27RendererReady = false;

  function mountSourceState(kind, title, message) {
    if (!String(location.hash || "").startsWith("#/sasong/ecl27winter")) return false;
    const overview = document.querySelector("#overview");
    if (!overview) return false;

    document.querySelector("#ecl27TeamBuilds")?.remove();
    let section = document.querySelector("#ecl27TeamBuildsV2");
    if (!section) {
      section = document.createElement("section");
      section.id = "ecl27TeamBuildsV2";
      section.className = "ecl27v2";
      overview.insertAdjacentElement("afterend", section);
    }
    section.dataset.ecl27Loading = kind;
    section.innerHTML = `<div style="margin:28px 0 44px;padding:28px 30px;border:1px solid #172839;border-radius:18px;background:#02080e;color:#f5f1e8"><p style="margin:0 0 7px;color:#57e6dc;font-size:10px;font-weight:900;letter-spacing:.12em">${kind === "error" ? "KUNDE INTE HÄMTA DATA" : "HÄMTAR DATA"}</p><h3 style="margin:0 0 8px;font-size:28px">${title}</h3><p style="margin:0;color:#91a4b4">${message}</p></div>`;
    return true;
  }

  function scheduleLoadingState() {
    [0,80,220,500,1000,1800,3000].forEach((delay) => {
      window.setTimeout(() => {
        if (ecl27RendererReady) return;
        mountSourceState("loading", "Laddar svenska lagbyggen…", "Hämtar Spring-trupper och bekräftade ECL 27-rörelser från Svensk eHockey.");
      }, delay);
    });
  }

  scheduleLoadingState();

  async function startEcl27Renderer() {
    let DATA = window.SEH_ECL27_DATA;
    if (window.SEH_ECL27_DATA_READY && typeof window.SEH_ECL27_DATA_READY.then === "function") {
      try {
        DATA = await window.SEH_ECL27_DATA_READY;
      } catch (error) {
        console.error("[ECL27] source model failed", error);
      }
    }

    ecl27RendererReady = true;
    document.querySelector('#ecl27TeamBuildsV2[data-ecl27-loading="loading"]')?.remove();

    if (!DATA || DATA.build === "supabase-loading" || DATA.build === "supabase-error") {
      console.error("[ECL27] source model unavailable");
      [0,100,350,800].forEach((delay) => window.setTimeout(() => {
        mountSourceState("error", "Kunde inte hämta lagbyggen", "Försök ladda om sidan. Ingen tom 0-lagsmodell visas som riktig data.");
      }, delay));
      return;
    }

  const ROUTE_PREFIX = "#/sasong/ecl27winter";
  const TEAM_QUERY_PARAM = "ecl27lag";
  const DIVISION_ORDER = Object.freeze({Elite:0,Pro:1,Lite:2,Core:3,Neo:4,Nytt:5});
  const state = {search:"",division:"all",status:"all"};
  const $ = (selector, root=document) => root.querySelector(selector);
  const numberFormat = new Intl.NumberFormat("sv-SE");
  let directoryClient = null;
  let teamPowerPromise = null;
  const teamPowerByName = new Map();

  function norm(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
  }

  const registeredDisplay = new Map();
  for (const team of DATA.springTeams) {
    for (const player of team.players || []) registeredDisplay.set(norm(player), String(player));
  }
  for (const value of Object.values(DATA.aliases || {})) registeredDisplay.set(norm(value), value);

  function canonical(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return DATA.aliases?.[norm(raw)] || registeredDisplay.get(norm(raw)) || raw;
  }

  function playerKey(value) {
    return norm(canonical(value));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[char]);
  }

  function slug(value) {
    return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function playerUrl(name) {
    const gt = canonical(name);
    if (typeof window.SEH_playerProfileUrl === "function") {
      try { return window.SEH_playerProfileUrl("", gt); } catch (_) {}
    }
    return `#/spelare/${encodeURIComponent(slug(gt))}`;
  }

  function playerLink(name, className="") {
    const gt = canonical(name);
    return `<a${className ? ` class="${esc(className)}"` : ""} href="${esc(playerUrl(gt))}">${esc(gt)}</a>`;
  }

  const teamDefs = [...DATA.springTeams, ...DATA.newTeams].map((team) => ({
    ...team,
    kind: team.division === "Nytt" ? "new" : "spring"
  }));
  const teamDefByName = new Map(teamDefs.map((team) => [norm(team.name), team]));
  const extraTeamIds = new Map(Object.entries(DATA.extraTeamIds || {}).map(([name,id]) => [norm(name), id]));

  function teamId(name) {
    const def = teamDefByName.get(norm(name));
    if (Number.isInteger(def?.teamId) && def.teamId > 0) return def.teamId;
    const extra = extraTeamIds.get(norm(name));
    return Number.isInteger(extra) && extra > 0 ? extra : null;
  }

  function teamUrl(name) {
    const id = teamId(name);
    return id ? `#/lag/${id}` : "";
  }

  function teamTextLink(name, className="") {
    const label = String(name || "").trim();
    const url = teamUrl(label);
    if (!url) return `<span${className ? ` class="${esc(className)}"` : ""}>${esc(label)}</span>`;
    return `<a${className ? ` class="${esc(className)}"` : ""} href="${esc(url)}">${esc(label)}</a>`;
  }

  function seasonListUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete(TEAM_QUERY_PARAM);
    url.hash = ROUTE_PREFIX;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function teamBuildUrl(name) {
    const url = new URL(window.location.href);
    url.searchParams.set(TEAM_QUERY_PARAM, slug(name));
    url.hash = ROUTE_PREFIX;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function requestedTeamSlug() {
    try { return new URL(window.location.href).searchParams.get(TEAM_QUERY_PARAM) || ""; }
    catch (_) { return ""; }
  }

  function dateOnly(at) {
    return String(at || "").slice(0, 10);
  }

  function formatDate(at) {
    const parts = dateOnly(at).split("-");
    const months = ["","jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
    return parts.length === 3 ? `${Number(parts[2])} ${months[Number(parts[1])]}` : dateOnly(at);
  }

  function logoUrl(team) {
    const manifest = window.SEH_TEAM_LOGO_FILES || {};
    const candidates = [team.logoName, team.name, team.springName].filter(Boolean);
    for (const candidate of candidates) {
      const key = `${candidate}.png`.normalize("NFC").toLocaleLowerCase("sv-SE");
      const actual = manifest[key];
      if (actual) return `teamlogos/${encodeURIComponent(actual)}`;
    }
    return "";
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0,3).map((part) => part[0]).join("").toUpperCase();
  }

  function buildModel() {
    const teams = new Map(teamDefs.map((def) => [norm(def.name), {...def,roster:new Map(),timeline:[]}])) ;
    const owner = new Map();
    const lastKnownTeam = new Map();

    const teamState = (name) => teams.get(norm(name)) || null;
    const removeFromTeam = (name,key) => teamState(name)?.roster.delete(key);
    const addToTeam = (name,key,display) => teamState(name)?.roster.set(key, canonical(display));
    const pushTimeline = (name,row) => {
      const team = teamState(name);
      if (team) team.timeline.push({...row,team:team.name});
    };

    for (const team of DATA.springTeams) {
      for (const rawPlayer of team.players || []) {
        const player = canonical(rawPlayer);
        const key = playerKey(player);
        if (!key) continue;
        addToTeam(team.name,key,player);
        owner.set(key,team.name);
        lastKnownTeam.set(key,team.name);
      }
    }

    let seq = 0;
    const queue = [];
    for (const event of DATA.moveEvents || []) queue.push({...event,kind:"move",seq:seq++});
    for (const event of DATA.posterMemberships || []) queue.push({...event,kind:"poster",seq:seq++});
    for (const event of DATA.freeAgentEvents || []) queue.push({...event,kind:"fa",seq:seq++});
    for (const event of DATA.rosterSnapshots || []) queue.push({...event,kind:"snapshot",seq:seq++});
    queue.sort((a,b) => String(a.at).localeCompare(String(b.at)) || a.seq - b.seq);

    function moveInto(teamName, rawPlayer, event, visibleIn=true) {
      const player = canonical(rawPlayer);
      const key = playerKey(player);
      if (!key) return;
      const previous = owner.get(key) || "";

      if (previous && norm(previous) !== norm(teamName)) {
        removeFromTeam(previous,key);
        pushTimeline(previous,{
          at:event.at,seq:event.seq - 0.1,type:"out",player,
          otherTeam:teamName,derived:true
        });
      }

      addToTeam(teamName,key,player);
      owner.set(key,teamName);
      lastKnownTeam.set(key,teamName);

      if (visibleIn) {
        pushTimeline(teamName,{
          at:event.at,seq:event.seq,type:"in",player,
          otherTeam:event.otherTeam || (previous && norm(previous) !== norm(teamName) ? previous : ""),
          note:event.note || "",explicit:true
        });
      }
    }

    for (const event of queue) {
      if (event.kind === "poster") {
        moveInto(event.team,event.player,event,false);
        continue;
      }

      if (event.kind === "move") {
        const player = canonical(event.player);
        const key = playerKey(player);
        if (!key) continue;

        if (event.type === "in") {
          moveInto(event.team,player,event,true);
          continue;
        }

        const current = owner.get(key) || "";
        if (current && norm(current) === norm(event.team)) {
          removeFromTeam(event.team,key);
          owner.delete(key);
        }
        if (!current || norm(current) === norm(event.team)) lastKnownTeam.set(key,event.team);

        pushTimeline(event.team,{
          at:event.at,seq:event.seq,type:"out",player,
          otherTeam:event.otherTeam || "",note:event.note || "",explicit:true
        });
        continue;
      }

      if (event.kind === "fa") {
        const player = canonical(event.player);
        const key = playerKey(player);
        if (!key) continue;

        const current = owner.get(key) || "";
        const sourceTeam = current || lastKnownTeam.get(key) || "";
        if (current) {
          removeFromTeam(current,key);
          owner.delete(key);
        }
        if (sourceTeam) lastKnownTeam.set(key,sourceTeam);

        pushTimeline(sourceTeam,{
          at:event.at,seq:event.seq,type:"out",player,
          note:"Free Agent",freeAgent:true,explicit:true
        });
        continue;
      }

      if (event.kind === "snapshot") {
        const team = teamState(event.team);
        if (!team) continue;

        const desired = new Map();
        for (const rawPlayer of event.players || []) {
          const player = canonical(rawPlayer);
          const key = playerKey(player);
          if (key) desired.set(key,player);
        }

        for (const key of Array.from(team.roster.keys())) {
          if (desired.has(key)) continue;
          team.roster.delete(key);
          if (norm(owner.get(key)) === norm(team.name)) owner.delete(key);
        }

        for (const [key,player] of desired) {
          const previous = owner.get(key) || "";
          if (previous && norm(previous) !== norm(team.name)) {
            removeFromTeam(previous,key);
            pushTimeline(previous,{
              at:event.at,seq:event.seq - 0.1,type:"out",player,
              otherTeam:team.name,derived:true
            });
          }
          team.roster.set(key,player);
          owner.set(key,team.name);
          lastKnownTeam.set(key,team.name);
        }
      }
    }

    for (const team of teams.values()) {
      team.playersNow = Array.from(team.roster.values()).sort((a,b) => a.localeCompare(b,"sv",{sensitivity:"base"}));
      team.timeline.sort((a,b) => String(b.at).localeCompare(String(a.at)) || (b.seq || 0) - (a.seq || 0));

      const inPlayers = new Set();
      const outPlayers = new Set();
      for (const row of team.timeline) {
        const key = playerKey(row.player);
        if (!key) continue;
        if (row.type === "in" && row.explicit) inPlayers.add(key);
        if (row.type === "out") outPlayers.add(key);
      }
      team.inCount = inPlayers.size;
      team.outCount = outPlayers.size;
      team.recruitment = DATA.recruitment?.[team.name] || null;
    }

    return {teams:Array.from(teams.values()),owner,lastKnownTeam};
  }

  const model = buildModel();

  function statusFor(team) {
    const count = team.playersNow.length;
    if (team.kind === "new") {
      if (count >= 7) return {key:"ready",label:"Nytt lag · ser färdigt ut",tone:"green"};
      if (count >= 5) return {key:"building",label:"Nytt lag · på god väg",tone:"yellow"};
      if (count >= 3) return {key:"thin",label:"Nytt lag · bygger",tone:"orange"};
      return {key:"rebuild",label:"Nytt lag · tidigt bygge",tone:"red"};
    }
    if (count >= 7) return {key:"ready",label:"Ser färdigt ut",tone:"green"};
    if (count >= 5) return {key:"building",label:"På god väg",tone:"yellow"};
    if (count >= 3) return {key:"thin",label:"Tunt",tone:"orange"};
    return {key:"rebuild",label:"Kraftigt ombyggt",tone:"red"};
  }

  function renderOtherTeam(row) {
    if (row.freeAgent) return `<small>Free Agent</small>`;
    const other = String(row.otherTeam || "").trim();
    if (other) {
      const prefix = row.type === "in" ? "från " : "→ ";
      return `<small>${prefix}${teamTextLink(other,"ecl27v2-inline-team")}</small>`;
    }
    return row.note ? `<small>${esc(row.note)}</small>` : "";
  }

  function renderMove(row) {
    return `<div class="ecl27v2-move ecl27v2-move--${row.type}${row.freeAgent ? " is-fa" : ""}">
      <span>${row.type === "in" ? "IN" : "UT"}</span>
      ${playerLink(row.player,"ecl27v2-player")}
      ${renderOtherTeam(row)}
      <time datetime="${esc(dateOnly(row.at))}">${esc(formatDate(row.at))}</time>
    </div>`;
  }

  function renderRecruitment(team, detail=false) {
    const item = team.recruitment;
    if (!item) return "";
    const parts = [];
    if (item.seeks) parts.push(item.seeks);
    if (item.target) parts.push(`Mål: ${item.target}`);
    return `<section class="ecl27v2-recruit${detail ? " ecl27v2-detail-recruit" : ""}"><label>LAGET SÖKER</label><div>${esc(parts.join(" · "))}</div><time datetime="${esc(item.date)}">${esc(formatDate(item.date))}</time></section>`;
  }

  function renderTeamHeader(team,logo,status) {
    const url = teamUrl(team.name);
    const logoInner = logo ? `<img src="${logo}" alt="${esc(team.name)}">` : `<span>${esc(initials(team.name))}</span>`;
    const logoMarkup = url ? `<a class="ecl27v2-logo" href="${esc(url)}">${logoInner}</a>` : `<div class="ecl27v2-logo">${logoInner}</div>`;
    const nameMarkup = url ? `<h3><a href="${esc(url)}">${esc(team.name)}</a></h3>` : `<h3>${esc(team.name)}</h3>`;
    const source = team.kind === "new"
      ? "NYTT PROJEKT"
      : `ECL 26 SPRING · ${team.division}${team.springName && team.springName !== team.name ? ` · ${team.springName}` : ""}`;

    return `<header>${logoMarkup}<div><p>${esc(source)}</p>${nameMarkup}<div class="ecl27v2-badges"><span>${team.kind === "new" ? "NYTT" : esc(team.division)}</span><b class="is-${status.tone}">${esc(status.label)}</b></div></div></header>`;
  }

  function numeric(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function teamRpClamp(value,min,max) {
    return Math.max(min,Math.min(max,value));
  }

  function teamRpPercentile(values,value) {
    const sorted = values
      .filter((item) => Number.isFinite(item))
      .sort((a,b) => a-b);
    if (!sorted.length || !Number.isFinite(value)) return 50;
    if (sorted.length === 1) return 50;
    let below = 0;
    let equal = 0;
    for (const item of sorted) {
      if (item < value) below++;
      else if (item === value) equal++;
    }
    return teamRpClamp(
      ((below + Math.max(0,equal - 1) / 2) / (sorted.length - 1)) * 100,
      0,
      100
    );
  }

  function teamRpDraws(row) {
    return Math.max(
      0,
      numeric(row.games_played) -
        numeric(row.wins) -
        numeric(row.losses)
    );
  }

  function teamRpScopeKey(row) {
    const leagueId = Number(row.league_id);
    if (Number.isInteger(leagueId) && leagueId > 0) {
      return `${String(row.competition_code || "OTHER").toUpperCase()}::league:${leagueId}`;
    }
    return `${String(row.competition_code || "OTHER").toUpperCase()}::${String(row.season_label || row.external_league_id || "unknown")}`;
  }

  function teamRpDetectPointsModel(rows) {
    const played = rows.filter((row) => numeric(row.games_played) > 0);
    if (!played.length || !played.some((row) => numeric(row.table_points) > 0)) {
      return null;
    }

    const candidates = [
      {
        maxPointsPerGame:2,
        expected:(row) => numeric(row.wins) * 2 + numeric(row.overtime_losses)
      },
      {
        maxPointsPerGame:3,
        expected:(row) => {
          const otWins = Math.min(numeric(row.wins),numeric(row.overtime_wins));
          const regulationWins = Math.max(0,numeric(row.wins) - otWins);
          return regulationWins * 3 + otWins * 2 + numeric(row.overtime_losses);
        }
      },
      {
        maxPointsPerGame:3,
        expected:(row) => numeric(row.wins) * 3 + teamRpDraws(row)
      },
      {
        maxPointsPerGame:2,
        expected:(row) => numeric(row.wins) * 2 + teamRpDraws(row)
      },
      {
        maxPointsPerGame:2,
        expected:(row) => numeric(row.wins) * 2
      },
      {
        maxPointsPerGame:3,
        expected:(row) => numeric(row.wins) * 3
      }
    ];

    return candidates.find((candidate) =>
      played.every((row) =>
        Math.abs(numeric(row.table_points) - candidate.expected(row)) < 0.001
      )
    ) || null;
  }

  function teamRpRowTimestamp(row) {
    const raw = String(
      row?.chronology_date ||
      row?.display_end_date ||
      row?.end_date ||
      row?.sort_date ||
      ""
    ).slice(0,10);
    const timestamp = raw ? Date.parse(raw + "T12:00:00Z") : NaN;
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function teamRpRecencyWeight(row,latestTimestamp) {
    const when = teamRpRowTimestamp(row);
    if (!when || !latestTimestamp) return 0.35;
    const ageYears = Math.max(0,(latestTimestamp - when) / 31557600000);
    return Math.max(0.18,Math.exp(-ageYears / 3.25));
  }

  function teamRpScoreRow(row,context) {
    const gp = numeric(row.games_played);
    if (gp <= 0) return null;

    const wins = teamRpClamp(numeric(row.wins),0,gp);
    const losses = teamRpClamp(numeric(row.losses),0,gp);
    const draws = teamRpDraws(row);
    const goalsFor = Math.max(0,numeric(row.goals_for));
    const goalsAgainst = Math.max(0,numeric(row.goals_against));
    const goalDifference = goalsFor - goalsAgainst;
    const gfpg = goalsFor / gp;
    const gapg = goalsAgainst / gp;
    const gdpg = goalDifference / gp;
    const winRate = wins / gp;

    const pointsPercentage = context.pointsModel
      ? teamRpClamp(
          numeric(row.table_points) / (gp * context.pointsModel.maxPointsPerGame),
          0,
          1
        )
      : null;

    const resultScore = pointsPercentage !== null
      ? pointsPercentage * 100
      : winRate * 100;
    const goalDifferenceScore =
      ((teamRpClamp(gdpg,-5,5) + 5) / 10) * 100;
    const offenseScore = teamRpPercentile(context.gfpgValues,gfpg);
    const defenseScore = 100 - teamRpPercentile(context.gapgValues,gapg);
    const rawTeamRp =
      resultScore * .50 +
      goalDifferenceScore * .25 +
      offenseScore * .15 +
      defenseScore * .10;

    return {
      gp,wins,draws,losses,
      goalsFor,goalsAgainst,goalDifference,
      gfpg,gapg,gdpg,winRate,
      resultScore,goalDifferenceScore,offenseScore,defenseScore,rawTeamRp
    };
  }

  function teamRpDedupeScopeRows(rows) {
    const byTeam = new Map();
    for (const row of rows) {
      const id = Number(row.team_id);
      if (!(id > 0)) continue;
      const current = byTeam.get(id);
      if (!current) {
        byTeam.set(id,row);
        continue;
      }
      const currentScore = numeric(current.games_played) * 100 + numeric(current.playoff_games);
      const rowScore = numeric(row.games_played) * 100 + numeric(row.playoff_games);
      if (rowScore > currentScore) byTeam.set(id,row);
    }
    return [...byTeam.values()];
  }

  async function fetchTeamHistoryRows() {
    const client = getDirectoryClient();
    if (!client) return [];

    const select = [
      "team_id","league_id","external_league_id","competition_code","season_label",
      "games_played","wins","losses","overtime_wins","overtime_losses",
      "goals_for","goals_against","table_points","playoff_games",
      "chronology_date","display_end_date","end_date","sort_date"
    ].join(",");

    const rows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const {data,error} = await client
        .from("v_ehockey_team_tournaments_web_v14")
        .select(select)
        .gt("games_played",0)
        .order("team_id",{ascending:true})
        .range(from,from + pageSize - 1);
      if (error) throw error;
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return rows;
  }

  async function loadTeamPower() {
    if (teamPowerPromise) return teamPowerPromise;
    teamPowerPromise = (async () => {
      const historyRows = await fetchTeamHistoryRows();
      const rowsByScope = new Map();

      for (const row of historyRows) {
        const key = teamRpScopeKey(row);
        if (!rowsByScope.has(key)) rowsByScope.set(key,[]);
        rowsByScope.get(key).push(row);
      }

      const scoredByTeam = new Map();
      for (const rows of rowsByScope.values()) {
        const deduped = teamRpDedupeScopeRows(rows);
        const played = deduped.filter((row) => numeric(row.games_played) > 0);
        const context = {
          pointsModel:teamRpDetectPointsModel(played),
          gfpgValues:played.map((row) => numeric(row.goals_for) / numeric(row.games_played)),
          gapgValues:played.map((row) => numeric(row.goals_against) / numeric(row.games_played))
        };

        for (const row of played) {
          const score = teamRpScoreRow(row,context);
          if (!score) continue;
          const id = Number(row.team_id);
          if (!scoredByTeam.has(id)) scoredByTeam.set(id,[]);
          scoredByTeam.get(id).push({row,score});
        }
      }

      const latestTimestamp = Math.max(0,...historyRows.map(teamRpRowTimestamp));

      const calculated = model.teams.map((team) => {
        const id = teamId(team.name);
        const entries = id ? (scoredByTeam.get(id) || []) : [];
        let weightedRp = 0;
        let totalWeight = 0;
        let effectiveGp = 0;
        let allGames = 0;
        let allWins = 0;
        let allDraws = 0;
        let allLosses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;

        for (const entry of entries) {
          const recency = teamRpRecencyWeight(entry.row,latestTimestamp);
          const sampleWeight = Math.min(entry.score.gp,20);
          const weight = sampleWeight * recency;
          weightedRp += entry.score.rawTeamRp * weight;
          totalWeight += weight;
          effectiveGp += entry.score.gp * recency;
          allGames += entry.score.gp;
          allWins += entry.score.wins;
          allDraws += entry.score.draws;
          allLosses += entry.score.losses;
          goalsFor += entry.score.goalsFor;
          goalsAgainst += entry.score.goalsAgainst;
        }

        const rawTeamRp = totalWeight > 0 ? weightedRp / totalWeight : 50;
        const matchReliability = effectiveGp > 0
          ? effectiveGp / (effectiveGp + 30)
          : 0;
        const historyReliability = entries.length > 0
          ? entries.length / (entries.length + 2)
          : 0;
        const reliability = Math.sqrt(
          matchReliability * historyReliability
        );
        const adjustedRp = 50 + (rawTeamRp - 50) * reliability;
        const teamRp = Math.round(teamRpClamp(adjustedRp,0,100));
        const goalDifference = goalsFor - goalsAgainst;

        return {
          team,
          teamRp,
          swedenRank:null,
          history:{
            tournamentCount:entries.length,
            allGames,
            allWins,
            allDraws,
            allLosses,
            goalsFor,
            goalsAgainst,
            goalDifference,
            gdpg:allGames > 0 ? goalDifference / allGames : 0,
            winPct:allGames > 0 ? allWins / allGames : 0,
            effectiveGp,
            reliability,
            matchReliability,
            historyReliability,
            rawTeamRp
          }
        };
      });

      const ranked = calculated
        .filter((item) => item.history.allGames > 0)
        .sort((a,b) =>
          b.teamRp - a.teamRp ||
          b.history.rawTeamRp - a.history.rawTeamRp ||
          b.history.effectiveGp - a.history.effectiveGp ||
          a.team.name.localeCompare(b.team.name,"sv")
        );
      ranked.forEach((item,index) => { item.swedenRank = index + 1; });

      teamPowerByName.clear();
      for (const item of calculated) teamPowerByName.set(norm(item.team.name),item);
      return calculated;
    })().catch((error) => {
      teamPowerPromise = null;
      throw error;
    });
    return teamPowerPromise;
  }

  function formatPct(value) {
    return Number.isFinite(Number(value)) ? new Intl.NumberFormat("sv-SE",{style:"percent",maximumFractionDigits:0}).format(Number(value)) : "–";
  }

  function renderTeamPowerStrip(team) {
    return `<div class="ecl27v2-teamrp" data-team-rp="${esc(team.name)}">
      <div><span>TEAM RP <em>BETA</em></span><strong data-team-rp-score>–</strong></div>
      <div><span>ECL 27</span><strong data-team-rp-rank>–</strong></div>
      <div><span>MATCHER</span><strong data-team-rp-games>–</strong></div>
      <div><span>VINSTER</span><strong data-team-rp-wins>–</strong></div>
    </div>`;
  }

  function applyTeamPowerToDom(root=document) {
    root.querySelectorAll?.("[data-team-rp]").forEach((node) => {
      const item = teamPowerByName.get(norm(node.dataset.teamRp));
      if (!item) return;
      const set = (selector,value) => {
        const el = node.querySelector(selector);
        if (el) el.textContent = value;
      };
      set("[data-team-rp-score]",numberFormat.format(item.teamRp));
      set("[data-team-rp-rank]",item.swedenRank ? `#${item.swedenRank}` : "NY");
      set("[data-team-rp-games]",numberFormat.format(item.history.allGames));
      set("[data-team-rp-wins]",numberFormat.format(item.history.allWins));
      node.dataset.loaded = "true";
    });

    root.querySelectorAll?.("[data-team-rp-detail]").forEach((node) => {
      const item = teamPowerByName.get(norm(node.dataset.teamRpDetail));
      if (!item) return;
      const values = {
        score:numberFormat.format(item.teamRp),
        rank:item.swedenRank ? `#${item.swedenRank} av ECL 27-lagen` : "Nytt lag",
        games:numberFormat.format(item.history.allGames),
        tournaments:numberFormat.format(item.history.tournamentCount),
        wins:numberFormat.format(item.history.allWins),
        winpct:item.history.allGames > 0 ? formatPct(item.history.winPct) : "–",
        goaldiff:item.history.allGames > 0
          ? `${item.history.goalDifference > 0 ? "+" : ""}${numberFormat.format(item.history.goalDifference)}`
          : "0",
        gdpg:item.history.allGames > 0
          ? `${item.history.gdpg > 0 ? "+" : ""}${new Intl.NumberFormat("sv-SE",{maximumFractionDigits:2}).format(item.history.gdpg)} / match`
          : "–"
      };
      for (const [key,value] of Object.entries(values)) {
        const el = node.querySelector(`[data-team-rp-value="${key}"]`);
        if (el) el.textContent = value;
      }
      node.dataset.loaded = "true";
    });
  }

  async function hydrateTeamPower(root=document) {
    try { await loadTeamPower(); applyTeamPowerToDom(root); }
    catch (error) { console.warn("[ECL27] kunde inte beräkna Team RP",error); }
  }
  function renderTeamCard(team) {
    const status = statusFor(team);
    const logo = logoUrl(team);
    const recent = team.timeline.slice(0,4);
    const buildUrl = teamBuildUrl(team.name);

    return `<article class="ecl27v2-card is-clickable" data-status="${status.key}" data-team="${esc(team.name)}" data-build-url="${esc(buildUrl)}" role="link" tabindex="0" aria-label="Öppna ECL 27-lagbygget för ${esc(team.name)}">
      <div class="ecl27v2-watermark">${logo ? `<img src="${logo}" alt="">` : ""}</div>
      ${renderTeamHeader(team,logo,status)}
      <div class="ecl27v2-metrics">
        <div><span>KÄNDA NU</span><strong>${team.playersNow.length}</strong></div>
        <div><span>IN</span><strong class="in">${team.inCount}</strong></div>
        <div><span>UT</span><strong class="out">${team.outCount}</strong></div>
      </div>
      ${renderTeamPowerStrip(team)}
      <section class="ecl27v2-roster"><label>KÄND TRUPP JUST NU</label><div>${team.playersNow.length ? team.playersNow.map((name) => playerLink(name,"ecl27v2-roster-player")).join("") : `<em>Ingen säker spelare kvar i sammanställningen.</em>`}</div></section>
      ${renderRecruitment(team)}
      <section class="ecl27v2-moves"><label>SENASTE BEKRÄFTADE RÖRELSER</label>${recent.length ? recent.map(renderMove).join("") : `<p>Inga in/ut-poster i underlaget.</p>`}</section>
      ${team.timeline.length > 4 ? `<details><summary>Visa alla ${team.timeline.length} rörelser</summary><div>${team.timeline.map(renderMove).join("")}</div></details>` : ""}
      <div class="ecl27v2-card-open" aria-hidden="true">Öppna lagbygget →</div>
    </article>`;
  }

  function allLatestMoves() {
    return model.teams.flatMap((team) => team.timeline.map((row) => ({...row,team:team.name})))
      .sort((a,b) => String(b.at).localeCompare(String(a.at)) || (b.seq || 0) - (a.seq || 0))
      .slice(0,12);
  }

  function renderLatestFeed() {
    return allLatestMoves().map((row) => `<div class="ecl27v2-feed-row">
      <time datetime="${esc(dateOnly(row.at))}">${esc(formatDate(row.at))}</time>
      <b class="${row.type}">${row.type === "in" ? "IN" : "UT"}</b>
      ${playerLink(row.player,"ecl27v2-feed-player")}
      ${teamTextLink(row.team,"ecl27v2-feed-team")}
      ${renderOtherTeam(row)}
    </div>`).join("");
  }

  function sortedTeams() {
    return [...model.teams].sort((a,b) =>
      ((DIVISION_ORDER[a.division] ?? 99) - (DIVISION_ORDER[b.division] ?? 99)) ||
      a.name.localeCompare(b.name,"sv")
    );
  }

  function filteredTeams() {
    return sortedTeams().filter((team) => {
      const status = statusFor(team);
      if (state.division !== "all" && team.division !== state.division) return false;
      if (state.status !== "all" && status.key !== state.status) return false;
      if (!state.search) return true;

      const haystack = [
        team.name,team.springName,...team.playersNow,
        ...team.timeline.map((row) => row.player),
        team.recruitment?.seeks || ""
      ].filter(Boolean).join(" ").toLocaleLowerCase("sv-SE");
      return haystack.includes(state.search.toLocaleLowerCase("sv-SE"));
    });
  }

  function renderGrid() {
    const host = $("#ecl27v2Grid");
    if (!host) return;
    const teams = filteredTeams();
    host.innerHTML = teams.map(renderTeamCard).join("");
    applyTeamPowerToDom(host);
    const result = $("#ecl27v2Result");
    if (result) result.textContent = `${teams.length} av ${model.teams.length} lag/projekt`;
  }

  function springBasePlayers(team) {
    if (team.kind !== "spring") return [];
    return (team.players || []).map(canonical).filter(Boolean).sort((a,b) => a.localeCompare(b,"sv",{sensitivity:"base"}));
  }

  function rosterEvidence(team, name) {
    const key = playerKey(name);
    const candidates = [];

    for (const row of team.timeline || []) {
      if (row.type !== "in" || playerKey(row.player) !== key) continue;
      candidates.push({
        at: row.at,
        type: "in",
        label: `IN ${formatDate(row.at)}`,
        detail: row.otherTeam ? `från ${row.otherTeam}` : "bekräftad IN-post"
      });
    }

    for (const row of DATA.posterMemberships || []) {
      if (norm(row.team) !== norm(team.name) || playerKey(row.player) !== key) continue;
      candidates.push({
        at: row.at,
        type: "poster",
        label: `LAGPOST ${formatDate(row.at)}`,
        detail: "bekräftad via lagets egen post"
      });
    }

    for (const row of DATA.rosterSnapshots || []) {
      if (norm(row.team) !== norm(team.name)) continue;
      if (!(row.players || []).some((player) => playerKey(player) === key)) continue;
      candidates.push({
        at: row.at,
        type: "snapshot",
        label: `TRUPPPOST ${formatDate(row.at)}`,
        detail: "med i senaste uttryckliga truppen"
      });
    }

    candidates.sort((a,b) => String(b.at).localeCompare(String(a.at)));
    if (candidates.length) return candidates[0];

    const inSpring = team.kind === "spring" && (team.players || []).some((player) => playerKey(player) === key);
    if (inSpring) {
      return {at:"",type:"spring",label:"SPRING-BAS",detail:`ECL ’26 Spring · ${team.division}`};
    }

    return {at:"",type:"known",label:"KÄND NU",detail:"aktuell enligt sammanställningen"};
  }

  function sportsGamerId(url) {
    return String(url || "").match(/\/players\/(\d+)/i)?.[1] || "";
  }

  function localPlayerImage(row) {
    const fallback = "players/1DEFAULTBILDID.png";
    if (!row) return fallback;

    const id = sportsGamerId(row.sports_gamer_player_url);
    if (id) {
      const file = `${id}.png`;
      if (Array.isArray(window.SEH_PLAYER_IMAGE_FILES) && window.SEH_PLAYER_IMAGE_FILES.includes(file)) {
        return `players/${encodeURIComponent(file)}`;
      }
    }

    const raw = String(row.player_image || "").trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    return fallback;
  }

  function compactLatestSeason(value) {
    return String(value || "")
      .replace(/\s*[🇦-🇿]{2}\s*$/u, "")
      .replace(/^European Championship League\b/i, "ECL")
      .trim();
  }

  function formatMetaNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? numberFormat.format(n) : "–";
  }

  function renderDetailRosterCard(team, name, row=null) {
    const evidence = rosterEvidence(team,name);
    const position = String(row?.primary_position || "–").trim() || "–";
    const isGoalie = position.toUpperCase() === "G" || String(row?.player_type || "").toLowerCase() === "goalie";
    const statTwoLabel = isGoalie ? "RÄDDNINGAR" : "POÄNG";
    const statTwoValue = isGoalie ? row?.total_goalie_saves : row?.total_points;
    const latest = [row?.latest_team, compactLatestSeason(row?.latest_season)].filter(Boolean).join(" · ");
    const teamLogo = logoUrl(team);
    const image = localPlayerImage(row);

    return `<a class="ecl27v2-roster-feature${row ? " is-hydrated" : " is-loading"}" href="${esc(playerUrl(name))}" data-player-card-key="${esc(playerKey(name))}">
      <div class="ecl27v2-roster-feature__portrait"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy" onerror="this.onerror=null;this.src='players/1DEFAULTBILDID.png'"></div>
      ${teamLogo ? `<img class="ecl27v2-roster-feature__watermark" src="${esc(teamLogo)}" alt="" aria-hidden="true">` : ""}
      <div class="ecl27v2-roster-feature__body">
        <div class="ecl27v2-roster-feature__top"><span>AKTUELL TRUPP</span><b>${esc(position)}</b></div>
        <h4>${esc(name)}</h4>
        <div class="ecl27v2-roster-feature__evidence is-${esc(evidence.type)}"><strong>${esc(evidence.label)}</strong><small>${esc(evidence.detail)}</small></div>
        <div class="ecl27v2-roster-feature__stats">
          <div><span>MATCHER</span><strong>${formatMetaNumber(row?.career_games)}</strong></div>
          <div><span>${statTwoLabel}</span><strong>${formatMetaNumber(statTwoValue)}</strong></div>
          <div><span>TURNERINGAR</span><strong>${formatMetaNumber(row?.tournament_count)}</strong></div>
        </div>
        <div class="ecl27v2-roster-feature__latest"><span>SENAST I DATABASEN</span><strong>${esc(latest || "Laddar spelaruppgifter…")}</strong></div>
      </div>
    </a>`;
  }

  function getDirectoryClient() {
    if (directoryClient) return directoryClient;
    const config = window.EHOCKEY_CONFIG || {};
    if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabasePublishableKey) return null;
    directoryClient = window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    });
    return directoryClient;
  }

  async function fetchDirectoryRows(names) {
    const client = getDirectoryClient();
    if (!client || !names.length) return [];

    const select = "player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_season,latest_team,career_games,total_points,player_type,tournament_count,total_goalie_saves";
    const {data,error} = await client.from("app_player_directory_cache").select(select).in("display_gamertag",names);
    if (error) throw error;

    const rows = Array.isArray(data) ? [...data] : [];
    const found = new Set(rows.map((row) => norm(row.display_gamertag)));
    const missing = names.filter((name) => !found.has(norm(name)));

    // app_player_directory_cache is intentionally the Swedish player directory.
    // A Swedish ECL team can still contain foreign players, so roster cards must
    // fall back to the all-player Supabase summary instead of showing empty data.
    if (missing.length) {
      const {data:fallback,error:fallbackError} = await client.rpc(
        "seh_ecl27_player_card_rows",
        {p_names:missing}
      );
      if (fallbackError) {
        console.warn("[ECL27] kunde inte hämta fallback-data för utländska/ej katalogförda spelare",fallbackError);
      } else {
        for (const row of fallback || []) {
          if (row && !found.has(norm(row.display_gamertag))) {
            rows.push(row);
            found.add(norm(row.display_gamertag));
          }
        }
      }
    }

    return rows;
  }

  async function hydrateDetailRoster(team, section) {
    const host = $("#ecl27v2DetailRosterCards",section);
    if (!host || !team.playersNow.length) return;

    try {
      const rows = await fetchDirectoryRows(team.playersNow);
      const byName = new Map(rows.map((row) => [norm(row.display_gamertag),row]));
      host.innerHTML = team.playersNow.map((name) => renderDetailRosterCard(team,name,byName.get(norm(name)) || null)).join("");
    } catch (error) {
      console.warn("[ECL27] kunde inte hämta spelaruppgifter för lagbygget",error);
    }
  }

  function renderTeamDetail(team) {
    const status = statusFor(team);
    const logo = logoUrl(team);
    const regularUrl = teamUrl(team.name);
    const basePlayers = springBasePlayers(team);
    const source = team.kind === "new"
      ? "NYTT PROJEKT INFÖR ECL 27"
      : `ECL 26 SPRING · ${team.division}${team.springName && team.springName !== team.name ? ` · ${team.springName}` : ""}`;

    return `<div class="ecl27v2-detail">
      <a class="ecl27v2-back" href="${esc(seasonListUrl())}">← Alla svenska lagbyggen</a>
      <header class="ecl27v2-detail-hero">
        <div class="ecl27v2-detail-logo">${logo ? `<img src="${logo}" alt="${esc(team.name)}">` : `<span>${esc(initials(team.name))}</span>`}</div>
        <div class="ecl27v2-detail-title">
          <p class="directory-kicker">${esc(source)}</p>
          <h2>${esc(team.name)}</h2>
          <div class="ecl27v2-badges"><span>${team.kind === "new" ? "NYTT" : esc(team.division)}</span><b class="is-${status.tone}">${esc(status.label)}</b></div>
          <p>Det här är Svensk eHockeys aktuella arbetsbild av lagbygget inför ECL 27, baserad på Spring-truppen och de daterade IN/UT-, lagpost- och ECL-Free Agent-händelser som finns i underlaget.</p>
          ${regularUrl ? `<a class="ecl27v2-team-profile" href="${esc(regularUrl)}">Öppna ordinarie lagprofil →</a>` : ""}
        </div>
      </header>

      <div class="ecl27v2-detail-metrics">
        <div><span>KÄNDA NU</span><strong>${team.playersNow.length}</strong></div>
        <div><span>IN</span><strong class="in">${team.inCount}</strong></div>
        <div><span>UT</span><strong class="out">${team.outCount}</strong></div>
        <div><span>STATUS</span><strong class="status-text">${esc(status.label)}</strong></div>
      </div>

      <section class="ecl27v2-detail-panel ecl27v2-power-detail" data-team-rp-detail="${esc(team.name)}">
        <div class="ecl27v2-detail-panel-head"><div><p class="directory-kicker">LAGSTYRKA · BETA</p><h3>Team RP</h3></div><span>50% resultat · 25% målskillnad · 15% offensiv · 10% defensiv</span></div>
        <div class="ecl27v2-power-detail-grid">
          <div class="is-primary"><span>TEAM RP</span><strong data-team-rp-value="score">–</strong><small data-team-rp-value="rank">–</small></div>
          <div><span>MATCHER</span><strong data-team-rp-value="games">–</strong><small><b data-team-rp-value="tournaments">–</b> turneringar</small></div>
          <div><span>VINSTER</span><strong data-team-rp-value="wins">–</strong><small><b data-team-rp-value="winpct">–</b> historisk vinst%</small></div>
          <div><span>MÅLSKILLNAD</span><strong data-team-rp-value="goaldiff">–</strong><small><b data-team-rp-value="gdpg">–</b></small></div>
        </div>
        <p class="ecl27v2-power-note">Team RP bygger enbart på lagets egna historiska prestationer. Nyare säsonger väger mer och lag med få matcher dras mot neutrala 50. Spelar-RP, aktuell trupp och spelarnas tidigare lag påverkar inte Team RP.</p>
      </section>

      <section class="ecl27v2-detail-panel ecl27v2-detail-roster-featured">
        <div class="ecl27v2-detail-panel-head"><div><p class="directory-kicker">JUST NU</p><h3>Känd trupp</h3></div><span>${team.playersNow.length} spelare</span></div>
        <div id="ecl27v2DetailRosterCards" class="ecl27v2-roster-feature-grid">${team.playersNow.length
          ? team.playersNow.map((name) => renderDetailRosterCard(team,name)).join("")
          : `<p class="ecl27v2-detail-empty">Ingen säker spelare kvar i sammanställningen.</p>`}</div>
      </section>

      <section class="ecl27v2-detail-panel">
        <div class="ecl27v2-detail-panel-head"><div><p class="directory-kicker">REKRYTERING</p><h3>Lagets senaste sökpost</h3></div></div>
        ${team.recruitment ? renderRecruitment(team,true) : `<p class="ecl27v2-detail-empty">Ingen aktuell sökpost finns i underlaget.</p>`}
      </section>

      <section class="ecl27v2-detail-panel ecl27v2-detail-timeline">
        <div class="ecl27v2-detail-panel-head"><div><p class="directory-kicker">KRONOLOGI</p><h3>Bekräftade rörelser</h3></div><span>${team.timeline.length} händelser</span></div>
        <div class="ecl27v2-detail-moves">${team.timeline.length ? team.timeline.map(renderMove).join("") : `<p class="ecl27v2-detail-empty">Inga bekräftade IN/UT-rörelser i underlaget.</p>`}</div>
      </section>

      <section class="ecl27v2-detail-panel">
        <div class="ecl27v2-detail-panel-head"><div><p class="directory-kicker">UTGÅNGSPUNKT</p><h3>${team.kind === "spring" ? "ECL ’26 Spring-trupp" : "Nytt projekt"}</h3></div></div>
        ${team.kind === "spring"
          ? `<div class="ecl27v2-detail-base-list">${basePlayers.map((name) => playerLink(name,"ecl27v2-detail-base-player")).join("")}</div>`
          : `<p class="ecl27v2-detail-empty">Laget hade ingen Spring-trupp som bas och byggs därför enbart från senare bekräftade händelser.</p>`}
      </section>

      <aside class="ecl27v2-method"><strong>Arbetsbild – inte officiell ECL 27-roster</strong>En UT-händelse kan inte lämna samma spelare kvar i KÄND TRUPP JUST NU. En senare IN flyttar spelaren till det nya laget. ECL-Free Agents behandlas som UT från senast kända ECL-lag.</aside>
    </div>`;
  }

  function bindCardNavigation(host) {
    if (!host || host.dataset.cardNavigationBound === "true") return;
    host.dataset.cardNavigationBound = "true";

    host.addEventListener("click", (event) => {
      const card = event.target.closest(".ecl27v2-card[data-build-url]");
      if (!card || !host.contains(card)) return;
      if (event.target.closest("a,button,input,select,option,summary,details,label")) return;
      window.location.href = card.dataset.buildUrl;
    });

    host.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest(".ecl27v2-card[data-build-url]");
      if (!card || event.target !== card) return;
      event.preventDefault();
      window.location.href = card.dataset.buildUrl;
    });
  }

  function injectStyles() {
    if ($("#ecl27TeamBuildsV2Style")) return;
    const style = document.createElement("style");
    style.id = "ecl27TeamBuildsV2Style";
    style.textContent = `
      .ecl27v2{margin:28px 0 44px;color:#f5f1e8;scroll-margin-top:90px}.ecl27v2 *{box-sizing:border-box}.ecl27v2 a{color:inherit;text-decoration:none}.ecl27v2 a:hover,.ecl27v2 a:focus-visible{color:#f0d58b;text-decoration:underline;text-underline-offset:2px}
      .ecl27v2-hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;padding:32px;border:1px solid rgba(214,177,95,.3);border-radius:22px;background:linear-gradient(135deg,#030b14,#071426);box-shadow:0 24px 60px rgba(0,0,0,.22)}.ecl27v2-hero h2{margin:4px 0 12px;font-size:clamp(36px,4vw,64px);line-height:.95;letter-spacing:-.04em}.ecl27v2-hero>div>p:last-of-type{max-width:850px;color:#aebdca;line-height:1.6}
      .ecl27v2-stamp{align-self:center;padding:18px;border:1px solid rgba(214,177,95,.25);border-radius:15px;background:rgba(0,0,0,.22)}.ecl27v2-stamp span,.ecl27v2-stamp small{display:block;color:#7890a4;font-size:10px;font-weight:900;letter-spacing:.1em}.ecl27v2-stamp strong{display:block;margin:6px 0 8px;color:#f0d58b;font-size:18px}
      .ecl27v2-overview{display:grid;grid-template-columns:repeat(4,1fr);margin:14px 0 20px;border:1px solid #172839;border-radius:16px;overflow:hidden;background:#030a12}.ecl27v2-overview>div{padding:18px 20px;border-right:1px solid #172839}.ecl27v2-overview>div:last-child{border-right:0}.ecl27v2-overview span{display:block;color:#57e6dc;font-size:9px;font-weight:950;letter-spacing:.12em}.ecl27v2-overview strong{display:block;margin:5px 0 2px;color:#ffd900;font-size:30px}.ecl27v2-overview small{color:#70869a;font-size:10px}
      .ecl27v2-panel{margin-top:16px;border:1px solid #172839;border-radius:18px;background:#02080e;overflow:hidden}.ecl27v2-head{display:flex;justify-content:space-between;align-items:end;gap:16px;padding:20px 22px;border-bottom:1px solid #172839}.ecl27v2-head h3{margin:3px 0 0;font-size:27px}.ecl27v2-head>span{color:#71879a;font-size:11px}
      .ecl27v2-feed{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#172839}.ecl27v2-feed-row{display:grid;grid-template-columns:48px 32px minmax(90px,.8fr) minmax(100px,1fr);gap:8px;align-items:center;min-height:52px;padding:9px 14px;background:#030a11}.ecl27v2-feed-row>time{color:#71879a;font-size:10px}.ecl27v2-feed-row>b{display:grid;place-items:center;height:23px;border-radius:5px;font-size:9px}.ecl27v2-feed-row>b.in{color:#46e8d2;background:rgba(38,209,177,.1)}.ecl27v2-feed-row>b.out{color:#ff7777;background:rgba(255,90,90,.1)}.ecl27v2-feed-row>small{grid-column:4;color:#738698}
      .ecl27v2-toolbar{display:grid;grid-template-columns:1.4fr .7fr .8fr;gap:10px;padding:14px;border-bottom:1px solid #172839}.ecl27v2-toolbar label{display:grid;gap:5px;color:#52e4dc;font-size:8px;font-weight:950;letter-spacing:.12em}.ecl27v2-toolbar input,.ecl27v2-toolbar select{height:43px;border:1px solid #203549;border-radius:9px;background:#020811;color:#fff;padding:0 12px}
      .ecl27v2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:14px}.ecl27v2-card{position:relative;overflow:hidden;padding:17px;border:1px solid rgba(214,177,95,.27);border-radius:16px;background:linear-gradient(155deg,#04111d,#02080e);transition:border-color .16s ease,transform .16s ease,box-shadow .16s ease}.ecl27v2-card.is-clickable{cursor:pointer}.ecl27v2-card.is-clickable:hover,.ecl27v2-card.is-clickable:focus-visible{border-color:rgba(240,213,139,.7);transform:translateY(-2px);box-shadow:0 18px 36px rgba(0,0,0,.28);outline:none}.ecl27v2-card-open{margin-top:12px;color:#d6b15f;font-size:9px;font-weight:900;letter-spacing:.04em;text-align:right}.ecl27v2-watermark{position:absolute;right:-20px;top:55px;width:150px;height:150px;opacity:.05;filter:grayscale(1)}.ecl27v2-watermark img{width:100%;height:100%;object-fit:contain}
      .ecl27v2-card header{position:relative;z-index:1;display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center}.ecl27v2-logo{display:grid;place-items:center;width:64px;height:64px;border:1px solid #203549;border-radius:14px;background:#061522;overflow:hidden}.ecl27v2-logo img{width:86%;height:86%;object-fit:contain}.ecl27v2-logo span{color:#e4c56f;font-weight:950}.ecl27v2-card header p{margin:0 0 3px;color:#5de5dd;font-size:8px;font-weight:900;letter-spacing:.1em}.ecl27v2-card h3{margin:0;font-size:24px;line-height:1.05}
      .ecl27v2-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ecl27v2-badges span,.ecl27v2-badges b{padding:4px 7px;border:1px solid #264056;border-radius:999px;font-size:8px;letter-spacing:.06em}.ecl27v2-badges .is-green{color:#44e6b9}.ecl27v2-badges .is-yellow{color:#f0d58b}.ecl27v2-badges .is-orange{color:#ffb35f}.ecl27v2-badges .is-red{color:#ff7e7e}
      .ecl27v2-metrics{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:15px 0}.ecl27v2-metrics>div{padding:9px;border:1px solid #152b3c;border-radius:9px;background:#030c14}.ecl27v2-metrics span{display:block;color:#6b879a;font-size:7px;font-weight:900}.ecl27v2-metrics strong{display:block;margin-top:4px;font-size:20px}.ecl27v2-metrics .in,.ecl27v2-detail-metrics .in{color:#45e3c5}.ecl27v2-metrics .out,.ecl27v2-detail-metrics .out{color:#ff7d7d}
      .ecl27v2-roster label,.ecl27v2-recruit label,.ecl27v2-moves label{display:block;margin-bottom:7px;color:#6d879a;font-size:8px;font-weight:950;letter-spacing:.1em}.ecl27v2-roster>div{display:flex;flex-wrap:wrap;gap:5px}.ecl27v2-roster-player{padding:5px 7px;border:1px solid #1c3447;border-radius:6px;background:#05121c;color:#dfe7ed;font-size:9px}.ecl27v2-roster em{color:#778b9c;font-size:10px}
      .ecl27v2-recruit{position:relative;margin-top:12px;padding:10px 72px 10px 10px;border:1px solid rgba(214,177,95,.18);border-radius:9px;background:rgba(214,177,95,.035)}.ecl27v2-recruit div{color:#d9c790;font-size:9px}.ecl27v2-recruit time{position:absolute;right:10px;top:10px;color:#71879a;font-size:8px}
      .ecl27v2-moves{margin-top:14px;padding-top:12px;border-top:1px solid #142737}.ecl27v2-move{display:grid;grid-template-columns:28px minmax(80px,1fr) minmax(0,1.1fr) 42px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(24,47,63,.45)}.ecl27v2-move>span{font-size:8px;font-weight:950}.ecl27v2-move--in>span{color:#45e3c5}.ecl27v2-move--out>span{color:#ff7d7d}.ecl27v2-move.is-fa{background:rgba(255,211,79,.025)}.ecl27v2-player{font-size:10px;font-weight:800}.ecl27v2-move small{color:#71879a;font-size:8px}.ecl27v2-move time{color:#61798d;font-size:8px;text-align:right}.ecl27v2-inline-team{color:#8ba4b7!important}.ecl27v2-moves>p{color:#738698;font-size:10px}.ecl27v2-card details{margin-top:10px}.ecl27v2-card summary{cursor:pointer;color:#d9bd71;font-size:9px;font-weight:900}
      .ecl27v2-method{margin-top:15px;padding:18px 20px;border-left:3px solid #d6b15f;background:#060d14;color:#91a4b4;font-size:11px;line-height:1.55}.ecl27v2-method strong{display:block;margin-bottom:4px;color:#f0d58b}
      .ecl27v2-detail{display:grid;gap:16px}.ecl27v2-back{width:max-content;padding:8px 12px;border:1px solid #203549;border-radius:999px;background:#030a11;color:#b8c7d2!important;font-size:10px;font-weight:850}.ecl27v2-detail-hero{display:grid;grid-template-columns:150px minmax(0,1fr);gap:26px;align-items:center;padding:28px;border:1px solid rgba(214,177,95,.32);border-radius:20px;background:linear-gradient(145deg,#04111d,#02080e);box-shadow:0 24px 54px rgba(0,0,0,.24)}.ecl27v2-detail-logo{display:grid;place-items:center;width:150px;height:150px;border:1px solid #203549;border-radius:24px;background:#061522;overflow:hidden}.ecl27v2-detail-logo img{width:88%;height:88%;object-fit:contain}.ecl27v2-detail-logo span{color:#e4c56f;font-size:32px;font-weight:950}.ecl27v2-detail-title h2{margin:3px 0 10px;font-size:clamp(40px,5vw,72px);line-height:.92;letter-spacing:-.045em}.ecl27v2-detail-title>p:last-of-type{max-width:850px;color:#91a4b4;line-height:1.6}.ecl27v2-team-profile{display:inline-flex;margin-top:10px;padding:9px 12px;border:1px solid rgba(214,177,95,.35);border-radius:9px;color:#f0d58b!important;font-size:10px;font-weight:900}.ecl27v2-detail-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.ecl27v2-detail-metrics>div{padding:16px;border:1px solid #172839;border-radius:12px;background:#030a11}.ecl27v2-detail-metrics span{display:block;color:#6b879a;font-size:8px;font-weight:950;letter-spacing:.1em}.ecl27v2-detail-metrics strong{display:block;margin-top:6px;font-size:28px}.ecl27v2-detail-metrics .status-text{font-size:15px;color:#f0d58b;line-height:1.25}.ecl27v2-detail-panel{padding:20px;border:1px solid #172839;border-radius:16px;background:#02080e}.ecl27v2-detail-panel-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:14px}.ecl27v2-detail-panel-head h3{margin:2px 0 0;font-size:24px}.ecl27v2-detail-panel-head>span{color:#70869a;font-size:9px}.ecl27v2-detail-base-list{display:flex;flex-wrap:wrap;gap:8px}.ecl27v2-detail-base-player{padding:9px 11px;border:1px solid #1c3447;border-radius:8px;background:#05121c;font-size:11px;font-weight:850}.ecl27v2-detail-recruit{margin:0}.ecl27v2-detail-empty{margin:0;color:#71879a;font-size:11px;line-height:1.5}.ecl27v2-detail-timeline .ecl27v2-move{grid-template-columns:42px minmax(140px,.8fr) minmax(160px,1.2fr) 62px;padding:10px 0}.ecl27v2-detail-timeline .ecl27v2-player{font-size:12px}.ecl27v2-detail-timeline .ecl27v2-move small,.ecl27v2-detail-timeline .ecl27v2-move time{font-size:10px}
      .ecl27v2-detail-roster-featured{padding:22px}.ecl27v2-roster-feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ecl27v2-roster-feature{position:relative;display:grid;grid-template-columns:150px minmax(0,1fr);min-height:248px;overflow:hidden;border:1px solid rgba(214,177,95,.42);border-radius:16px;background:linear-gradient(135deg,#04111d 0%,#02070d 75%);color:#fff!important;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.ecl27v2-roster-feature:hover,.ecl27v2-roster-feature:focus-visible{transform:translateY(-2px);border-color:#f0d58b;box-shadow:0 18px 34px rgba(0,0,0,.3);text-decoration:none!important;outline:none}.ecl27v2-roster-feature:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:#f0d000;z-index:3}.ecl27v2-roster-feature__portrait{position:relative;z-index:2;overflow:hidden;background:linear-gradient(155deg,#0a2a48,#06101b)}.ecl27v2-roster-feature__portrait:after{content:"";position:absolute;inset:0;border-right:1px solid rgba(240,208,0,.5);pointer-events:none}.ecl27v2-roster-feature__portrait img{display:block;width:100%;height:100%;min-height:248px;object-fit:cover;object-position:center top}.ecl27v2-roster-feature__watermark{position:absolute;right:-22px;top:-12px;width:145px;height:145px;object-fit:contain;opacity:.07;filter:grayscale(1);pointer-events:none}.ecl27v2-roster-feature__body{position:relative;z-index:2;display:flex;flex-direction:column;padding:16px}.ecl27v2-roster-feature__top{display:flex;align-items:center;justify-content:space-between;gap:12px}.ecl27v2-roster-feature__top span{color:#48e4dc;font-size:8px;font-weight:950;letter-spacing:.12em}.ecl27v2-roster-feature__top b{display:grid;place-items:center;min-width:34px;height:28px;padding:0 8px;border:1px solid #e6cb36;border-radius:8px;color:#ffe52b;font-size:13px}.ecl27v2-roster-feature h4{margin:8px 0 10px;font-size:clamp(22px,2vw,32px);line-height:.95;letter-spacing:-.035em}.ecl27v2-roster-feature__evidence{display:flex;align-items:center;gap:8px;min-height:34px;padding:7px 9px;border:1px solid rgba(214,177,95,.24);border-radius:8px;background:rgba(214,177,95,.045)}.ecl27v2-roster-feature__evidence strong{color:#f0d58b;font-size:9px;letter-spacing:.04em}.ecl27v2-roster-feature__evidence small{color:#8ca1b2;font-size:8px}.ecl27v2-roster-feature__evidence.is-in strong{color:#49e7cb}.ecl27v2-roster-feature__evidence.is-poster strong,.ecl27v2-roster-feature__evidence.is-snapshot strong{color:#ffe257}.ecl27v2-roster-feature__stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:11px;border:1px solid #193247;border-radius:9px;overflow:hidden;background:#020a12}.ecl27v2-roster-feature__stats>div{padding:8px 7px;border-right:1px solid #193247}.ecl27v2-roster-feature__stats>div:last-child{border-right:0}.ecl27v2-roster-feature__stats span,.ecl27v2-roster-feature__latest span{display:block;color:#5be5dc;font-size:6px;font-weight:950;letter-spacing:.1em}.ecl27v2-roster-feature__stats strong{display:block;margin-top:3px;font-size:17px}.ecl27v2-roster-feature__latest{margin-top:auto;padding-top:9px}.ecl27v2-roster-feature__latest strong{display:block;margin-top:3px;color:#aebdca;font-size:8px;line-height:1.35}.ecl27v2-roster-feature.is-loading{opacity:.78}.ecl27v2-roster-feature.is-loading .ecl27v2-roster-feature__portrait img{filter:grayscale(.25)}
      .ecl27v2-teamrp{display:grid;grid-template-columns:1.2fr .8fr .8fr .9fr;margin:0 18px 15px;border:1px solid rgba(214,177,95,.28);border-radius:11px;overflow:hidden;background:linear-gradient(135deg,rgba(214,177,95,.08),rgba(4,15,25,.7))}.ecl27v2-teamrp>div{padding:10px 11px;border-right:1px solid rgba(214,177,95,.18)}.ecl27v2-teamrp>div:last-child{border-right:0}.ecl27v2-teamrp span{display:block;color:#6fe7df;font-size:7px;font-weight:950;letter-spacing:.11em}.ecl27v2-teamrp span em{margin-left:4px;color:#f0d58b;font-style:normal}.ecl27v2-teamrp strong{display:block;margin-top:4px;color:#f5f1e8;font-size:16px}.ecl27v2-teamrp>div:first-child strong{color:#ffe257;font-size:20px}.ecl27v2-teamrp:not([data-loaded="true"]){opacity:.7}
      .ecl27v2-power-detail{border-color:rgba(214,177,95,.36);background:linear-gradient(135deg,#071522,#02080e)}.ecl27v2-power-detail-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(214,177,95,.22);border-radius:13px;overflow:hidden;background:#02080e}.ecl27v2-power-detail-grid>div{padding:17px 16px;border-right:1px solid rgba(214,177,95,.16)}.ecl27v2-power-detail-grid>div:last-child{border-right:0}.ecl27v2-power-detail-grid span{display:block;color:#59e5dc;font-size:8px;font-weight:950;letter-spacing:.11em}.ecl27v2-power-detail-grid strong{display:block;margin:5px 0 3px;font-size:28px}.ecl27v2-power-detail-grid small{color:#8297a9;font-size:9px}.ecl27v2-power-detail-grid small b{color:#f0d58b}.ecl27v2-power-detail-grid .is-primary strong{color:#ffe257;font-size:34px}.ecl27v2-power-detail-grid .is-primary small{color:#f0d58b;font-weight:900}.ecl27v2-power-note{margin:13px 0 0;color:#71879a;font-size:10px;line-height:1.55}
      @media(max-width:1180px){.ecl27v2-grid{grid-template-columns:repeat(2,1fr)}.ecl27v2-feed{grid-template-columns:1fr}.ecl27v2-roster-feature-grid{grid-template-columns:1fr}.ecl27v2-power-detail-grid{grid-template-columns:repeat(2,1fr)}.ecl27v2-power-detail-grid>div:nth-child(2){border-right:0}.ecl27v2-power-detail-grid>div:nth-child(-n+2){border-bottom:1px solid rgba(214,177,95,.16)}}
      @media(max-width:780px){.ecl27v2-hero{grid-template-columns:1fr;padding:23px}.ecl27v2-overview{grid-template-columns:repeat(2,1fr)}.ecl27v2-toolbar{grid-template-columns:1fr}.ecl27v2-grid{grid-template-columns:1fr}.ecl27v2-teamrp{grid-template-columns:repeat(2,1fr)}.ecl27v2-teamrp>div:nth-child(2){border-right:0}.ecl27v2-teamrp>div:nth-child(-n+2){border-bottom:1px solid rgba(214,177,95,.18)}.ecl27v2-feed-row{grid-template-columns:42px 30px 1fr}.ecl27v2-feed-row>.ecl27v2-feed-team,.ecl27v2-feed-row>small{grid-column:3}.ecl27v2-move{grid-template-columns:28px minmax(90px,1fr) 46px}.ecl27v2-move small{grid-column:2}.ecl27v2-move time{grid-column:3;grid-row:1}.ecl27v2-detail-hero{grid-template-columns:92px 1fr;padding:18px;gap:16px}.ecl27v2-detail-logo{width:92px;height:92px;border-radius:16px}.ecl27v2-detail-title h2{font-size:36px}.ecl27v2-detail-metrics{grid-template-columns:repeat(2,1fr)}.ecl27v2-detail-timeline .ecl27v2-move{grid-template-columns:28px minmax(90px,1fr) 46px}.ecl27v2-detail-timeline .ecl27v2-move small{grid-column:2}.ecl27v2-detail-timeline .ecl27v2-move time{grid-column:3;grid-row:1}.ecl27v2-roster-feature{grid-template-columns:112px minmax(0,1fr);min-height:218px}.ecl27v2-roster-feature__portrait img{min-height:218px}.ecl27v2-roster-feature__body{padding:12px}.ecl27v2-roster-feature__stats strong{font-size:14px}.ecl27v2-roster-feature__evidence{align-items:flex-start;flex-direction:column;gap:2px}}
    `;
    document.head.appendChild(style);
  }

  function renderListSection(section) {
    // The SPA keeps this module alive when navigating between routes.
    // A newly mounted list view must therefore start with clean filters,
    // otherwise an old search can stay active behind an empty new input.
    state.search = "";
    state.division = "all";
    state.status = "all";

    const springCount = DATA.springTeams.length;
    const newCount = DATA.newTeams.length;
    const knownNow = model.teams.reduce((sum,team) => sum + team.playersNow.length,0);
    const movementCount = model.teams.reduce((sum,team) => sum + team.timeline.length,0);

    section.innerHTML = `<header class="ecl27v2-hero"><div><p class="directory-kicker">SILLY SEASON · SVERIGE</p><h2>ECL 27 – Svenska lagbyggen</h2><p>Arbetsbilden börjar alltid i den registrerade ECL ’26 Spring-truppen. Därefter spelas bekräftade svenska IN/UT, lagposter och ECL-Free Agents igenom kronologiskt. En senare IN kan därför alltid aktivera spelaren i sitt nya lag.</p></div><div class="ecl27v2-stamp"><span>SENAST UPPDATERAD</span><strong>${esc(DATA.updated)}</strong><small>Spring-bas + daterade Discord-händelser</small></div></header>
      <div class="ecl27v2-overview"><div><span>SPRING-LAG</span><strong>${springCount}</strong><small>Elite → Neo</small></div><div><span>NYA PROJEKT</span><strong>${newCount}</strong><small>Västerås Vipers borttaget</small></div><div><span>KÄNDA SPELARE NU</span><strong>${knownNow}</strong><small>unika per lag efter replay</small></div><div><span>RÖRELSER</span><strong>${movementCount}</strong><small>IN / UT / FA, härledda byten inkluderade</small></div></div>
      <section class="ecl27v2-panel"><div class="ecl27v2-head"><div><p class="directory-kicker">SENASTE</p><h3>Transferflödet</h3></div><span>Bekräftade rörelser + Free Agents</span></div><div class="ecl27v2-feed">${renderLatestFeed()}</div></section>
      <section class="ecl27v2-panel"><div class="ecl27v2-head"><div><p class="directory-kicker">LAG FÖR LAG</p><h3>Svenska lagbyggen just nu</h3></div><span id="ecl27v2Result">${model.teams.length} lag/projekt</span></div><div class="ecl27v2-toolbar"><label>SÖK<input id="ecl27v2Search" type="search" placeholder="Lag eller spelare…"></label><label>SPRING-NIVÅ<select id="ecl27v2Division"><option value="all">Alla nivåer</option><option>Elite</option><option>Pro</option><option>Lite</option><option>Core</option><option>Neo</option><option value="Nytt">Nya projekt</option></select></label><label>STATUS<select id="ecl27v2Status"><option value="all">Alla statusar</option><option value="ready">Ser färdigt ut</option><option value="building">På god väg</option><option value="thin">Tunt / bygger</option><option value="rebuild">Kraftigt ombyggt / tidigt</option></select></label></div><div id="ecl27v2Grid" class="ecl27v2-grid"></div></section>
      <aside class="ecl27v2-method"><strong>Arbetsbild – inte officiella ECL 27-rosters</strong>En UT-händelse kan aldrig lämna samma spelare kvar i KÄND TRUPP JUST NU. En senare IN flyttar spelaren från tidigare känt lag till det nya laget. En aktiv ECL-Free Agent behandlas som UT från spelarens senaste kända ECL-lag, medan SEC-only-poster inte används. Alias normaliseras centralt innan någon händelse räknas.</aside>`;

    const search = $("#ecl27v2Search");
    const division = $("#ecl27v2Division");
    const status = $("#ecl27v2Status");
    search?.addEventListener("input",() => {state.search=search.value.trim();renderGrid();});
    division?.addEventListener("change",() => {state.division=division.value;renderGrid();});
    status?.addEventListener("change",() => {state.status=status.value;renderGrid();});
    bindCardNavigation($("#ecl27v2Grid"));
    renderGrid();
  }

  function mount() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return false;
    const overview = $("#overview");
    if (!overview) return false;

    $("#ecl27TeamBuilds")?.remove();
    $("#ecl27TeamBuildsV2")?.remove();
    injectStyles();

    const section = document.createElement("section");
    section.id = "ecl27TeamBuildsV2";
    section.className = "ecl27v2";
    section.dataset.build = DATA.build;
    overview.insertAdjacentElement("afterend",section);

    const wantedSlug = requestedTeamSlug();
    const wantedTeam = wantedSlug ? model.teams.find((team) => slug(team.name) === wantedSlug) : null;
    if (wantedTeam) {
      section.innerHTML = renderTeamDetail(wantedTeam);
      hydrateDetailRoster(wantedTeam,section);
      hydrateTeamPower(section);
      document.title = `${wantedTeam.name} – ECL 27 lagbygge | Svensk eHockey`;
    } else {
      if (wantedSlug) history.replaceState(null,"",seasonListUrl());
      renderListSection(section);
      hydrateTeamPower(section);
    }

    const actions = overview.querySelector(".season-upcoming-actions-v12840");
    if (actions) {
      actions.querySelector("[data-ecl-builds-jump]")?.remove();
      actions.querySelector("[data-ecl27v2-jump]")?.remove();
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.ecl27v2Jump = "true";
      button.textContent = wantedTeam ? "← Alla lagbyggen" : "Svenska lagbyggen →";
      button.addEventListener("click",() => {
        if (wantedTeam) window.location.href = seasonListUrl();
        else section.scrollIntoView({behavior:"smooth",block:"start"});
      });
      actions.prepend(button);
    }

    return true;
  }

  let retryGeneration = 0;
  function scheduleMount() {
    const generation = ++retryGeneration;
    [0,80,220,500,1000,1800,3000].forEach((delay) => {
      window.setTimeout(() => {
        if (generation !== retryGeneration) return;
        if (mount()) retryGeneration++;
      },delay);
    });
  }

  window.SEH_ECL27_PLAYER_ALIASES = DATA.aliases;
  window.addEventListener("hashchange",scheduleMount);
  window.addEventListener("load",scheduleMount);
  window.addEventListener("pageshow",scheduleMount);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",scheduleMount,{once:true});
  } else {
    scheduleMount();
  }
  }

  startEcl27Renderer();
})();
