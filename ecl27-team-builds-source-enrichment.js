/*
  ECL 27 canonical source model – Supabase backed.
  The renderer consumes window.SEH_ECL27_DATA after waiting for
  window.SEH_ECL27_DATA_READY. The shared Supabase model is fetched once per
  page load; localStorage is only a read cache/fallback and never writes back
  to Supabase.
*/
(function () {
  "use strict";

  const CACHE_KEY = "seh_ecl27_shared_source_v3";
  const EMPTY = Object.freeze({
    build:"supabase-loading",updated:"Hämtar ECL27-data…",aliases:{},
    springTeams:[],newTeams:[],moveEvents:[],posterMemberships:[],freeAgentEvents:[],
    rosterSnapshots:[],recruitment:{},extraTeamIds:{},
    officialSclTeams:[],sclLeagueId:527,sclStartsOn:"2026-10-05",sclRegistrationUpdated:""
  });

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return parsed && Array.isArray(parsed.springTeams) && Array.isArray(parsed.newTeams) ? parsed : null;
    } catch (_) { return null; }
  }

  const cached = readCache();
  window.SEH_ECL27_DATA = Object.freeze(cached || EMPTY);

  const cfg = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  const url = String(cfg.supabaseUrl || cfg.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = String(cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || "");

  const headers = { apikey:key, Accept:"application/json" };
  if (/^eyJ/i.test(key)) headers.Authorization = `Bearer ${key}`;

  async function get(view, query) {
    const response = await fetch(`${url}/rest/v1/${view}?${query}`, {headers,cache:"no-store"});
    if (!response.ok) throw new Error(`${view}: HTTP ${response.status}`);
    return response.json();
  }

  function atLocal(value) {
    const text = String(value || "");
    return text ? text.replace(/Z$/i, "").replace(/([+-]\d\d:\d\d)$/i, "").replace(" ", "T").slice(0,16) : "";
  }

  function dateOnly(value) { return String(value || "").slice(0,10); }

  async function loadOfficialSclTeams() {
    const competitions = await get(
      "ehockey_fantasy_competitions",
      "select=id,code,sports_gamer_league_id,starts_on,status,updated_at&code=eq.SCL2027&limit=1"
    );
    const competition = Array.isArray(competitions) ? competitions[0] : null;
    if (!competition?.id) {
      return {teams:[],leagueId:527,startsOn:"2026-10-05",updatedAt:""};
    }

    const leagueId = Number(competition.sports_gamer_league_id) || 527;
    const rows = await get(
      "ehockey_fantasy_player_pool",
      "select=real_team_id,real_team_name,display_gamertag,team_logo_url,source_snapshot,source_updated_at&competition_id=eq." +
        encodeURIComponent(String(competition.id)) +
        "&is_available=eq.true&order=real_team_name.asc,display_gamertag.asc"
    );

    const byTeam = new Map();
    let updatedAt = "";
    for (const row of rows || []) {
      const id = Number(row.real_team_id);
      const name = String(row.real_team_name || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !name) continue;

      if (!byTeam.has(id)) {
        const snapshot = row.source_snapshot && typeof row.source_snapshot === "object"
          ? row.source_snapshot
          : {};
        const rawTeam = snapshot?.raw_player?.team || {};
        byTeam.set(id,{
          name,
          sportsGamerTeamId:id,
          sportsGamerLeagueId:Number(snapshot.source_league_id) || leagueId,
          logoUrl:String(row.team_logo_url || rawTeam.teamLogo || "").trim(),
          registeredAt:String(rawTeam.teamRegistered || "").slice(0,10),
          syncedAt:String(row.source_updated_at || snapshot.roster_imported_at || ""),
          players:[]
        });
      }

      const player = String(row.display_gamertag || "").trim();
      if (player && !byTeam.get(id).players.includes(player)) byTeam.get(id).players.push(player);

      const rowUpdated = String(row.source_updated_at || "").trim();
      if (rowUpdated && (!updatedAt || rowUpdated > updatedAt)) updatedAt = rowUpdated;
    }

    return {
      teams:Array.from(byTeam.values()).map((team) => ({
        ...team,
        players:[...team.players].sort((a,b) => a.localeCompare(b,"sv",{sensitivity:"base"}))
      })),
      leagueId,
      startsOn:String(competition.starts_on || "2026-10-05").slice(0,10),
      updatedAt:updatedAt || String(competition.updated_at || "")
    };
  }

  async function loadSharedSource() {
    if (!url || !key) throw new Error("Supabase config missing");

    const [baseline,teams,events,recruitmentRows,aliasRows,officialScl] = await Promise.all([
      get("v_ecl27_spring_baseline","select=team_project_id,team_name,division,source_team_id,player_key,gamertag&order=team_name.asc,gamertag.asc"),
      get("v_ecl27_team_builds_public","select=id,name,division,source_team_id,logo_name,is_new_project,status&order=division.asc,name.asc"),
      get("v_ecl27_events_resolved","select=id,occurred_at,team_project_id,team_name,event_type,subject_key,display_gamertag,source_gamertag,from_team,to_team,source_note&order=occurred_at.asc,id.asc"),
      get("ecl27_recruitment_posts","select=team_project_id,posted_at,text,is_active&is_active=eq.true&order=posted_at.asc,id.asc"),
      get("ecl27_player_aliases","select=alias_normalized,canonical_display&order=alias_normalized.asc"),
      loadOfficialSclTeams()
    ]);

    const aliases={};
    for (const row of aliasRows || []) {
      const alias=String(row.alias_normalized || "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g," ");
      const canonical=String(row.canonical_display || "").trim();
      if (alias && canonical) aliases[alias]=canonical;
    }

    // Event resolution is PSN/display-first. Keep source gamertags as aliases
    // to the resolved display identity so an old Xbox/source name cannot
    // survive as a separate player in the lagbygge replay.
    for (const row of events || []) {
      const source=String(row.source_gamertag || "").trim();
      const display=String(row.display_gamertag || "").trim();
      const sourceKey=source.toLocaleLowerCase("sv-SE").replace(/\s+/g," ");
      if (sourceKey && display && sourceKey !== display.toLocaleLowerCase("sv-SE").replace(/\s+/g," ")) {
        aliases[sourceKey]=display;
      }
    }

    const byId = new Map(teams.map(t => [Number(t.id),t]));
    const springMap = new Map();
    for (const row of baseline) {
      const id = Number(row.team_project_id);

      // Only teams exposed by v_ecl27_team_builds_public belong in the
      // current lagbygge. Hidden projects can still exist in the historical
      // Spring cache, but must never be reconstructed from that baseline.
      const team = byId.get(id);
      if (!team) continue;

      if (!springMap.has(id)) {
        springMap.set(id,{
          name:String(team.name || row.team_name || ""),
          division:String(team.division || row.division || ""),
          teamId:Number(team.source_team_id || row.source_team_id) || null,
          logoName:team.logo_name || undefined,
          players:[]
        });
      }
      const gt = String(row.gamertag || "").trim();
      if (gt) springMap.get(id).players.push(gt);
    }

    const springTeams = Array.from(springMap.values());
    const newTeams = teams.filter(t => t.is_new_project).map(t => ({
      name:String(t.name || ""),division:"Nytt",teamId:Number(t.source_team_id) || null,
      logoName:t.logo_name || undefined,players:[]
    }));

    const moveEvents=[];
    const posterMemberships=[];
    const freeAgentEvents=[];
    for (const row of events) {
      const at=atLocal(row.occurred_at);
      const player=String(row.display_gamertag || row.source_gamertag || "").trim();
      const note=String(row.source_note || "");
      if (!player || !at) continue;
      if (/poster membership/i.test(note)) {
        posterMemberships.push({at,team:String(row.team_name || ""),player});
      } else if (row.event_type === "free_agent") {
        freeAgentEvents.push({at,player});
      } else if (row.event_type === "in" || row.event_type === "out") {
        moveEvents.push({
          at,team:String(row.team_name || ""),type:row.event_type,player,
          otherTeam:String(row.event_type === "in" ? (row.from_team || "") : (row.to_team || "")),
          note:/imported from/i.test(note) ? "" : note
        });
      }
    }

    const latestRecruitment = new Map();
    for (const row of recruitmentRows) latestRecruitment.set(Number(row.team_project_id),row);
    const recruitment={};
    for (const [id,row] of latestRecruitment) {
      const team=byId.get(id); if (!team) continue;
      const text=String(row.text || "").trim();
      const parts=text.split(/\s+·\s+/);
      recruitment[team.name]={
        date:dateOnly(row.posted_at),
        target:parts.length > 1 ? parts.shift() : "",
        seeks:parts.length ? parts.join(" · ") : text
      };
    }

    const extraTeamIds={};
    for (const t of teams) if (t.is_new_project && Number(t.source_team_id)>0) extraTeamIds[t.name]=Number(t.source_team_id);
    const latest = events.length ? events[events.length-1] : null;
    const model={
      build:`supabase-${latest ? String(latest.id) : "0"}-scl-${officialScl.teams.length}`,
      updated:latest ? `${dateOnly(latest.occurred_at)} · ${latest.team_name} ${latest.event_type === "in" ? "IN" : "UT"}: ${latest.display_gamertag || latest.source_gamertag}` : "Supabase",
      aliases,springTeams,newTeams,moveEvents,posterMemberships,freeAgentEvents,
      rosterSnapshots:[],recruitment,extraTeamIds,
      officialSclTeams:officialScl.teams,
      sclLeagueId:officialScl.leagueId,
      sclStartsOn:officialScl.startsOn,
      sclRegistrationUpdated:officialScl.updatedAt
    };

    try { localStorage.setItem(CACHE_KEY,JSON.stringify(model)); } catch (_) {}
    window.SEH_ECL27_DATA=Object.freeze(model);
    window.dispatchEvent(new CustomEvent("seh:ecl27-data-ready",{detail:window.SEH_ECL27_DATA}));
    return window.SEH_ECL27_DATA;
  }

  window.SEH_ECL27_DATA_READY = loadSharedSource().catch(error => {
    console.error("[ECL27] Supabase source refresh failed",error);
    if (cached) {
      window.SEH_ECL27_DATA=Object.freeze(cached);
      return window.SEH_ECL27_DATA;
    }
    const failed=Object.freeze({...EMPTY,build:"supabase-error",updated:"Kunde inte hämta ECL27-data"});
    window.SEH_ECL27_DATA=failed;
    return failed;
  });
})();
