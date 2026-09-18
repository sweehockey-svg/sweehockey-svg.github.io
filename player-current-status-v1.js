(() => {
  'use strict';

  const ACTIVE_PHASES = new Set(['building', 'regular', 'playoffs']);
  const CACHE_MS = 60 * 1000;
  const SOURCES = [
    {
      competitionKey: 'ecl27winter',
      eventsTable: 'ecl27_roster_events',
      projectsTable: 'ecl27_team_projects'
    }
  ];

  let client = null;
  let cache = null;
  let loadPromise = null;

  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

  function config() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (client) return client;
    const cfg = config();
    const url = clean(cfg.supabaseUrl || cfg.SUPABASE_URL);
    const key = clean(
      cfg.supabasePublishableKey ||
      cfg.supabaseAnonKey ||
      cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_PUBLISHABLE_KEY
    );
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function isSecContext() {
    const path = String(location.pathname || '').toLowerCase();
    return /(?:^|\/)sec(?:\/|$)/.test(path);
  }

  async function fetchAll(sb, table, select, orderColumn = '') {
    const rows = [];
    const pageSize = 1000;
    let from = 0;

    for (;;) {
      let query = sb.from(table).select(select);
      if (orderColumn) query = query.order(orderColumn, { ascending: false });
      const result = await query.range(from, from + pageSize - 1);
      if (result.error) throw result.error;
      const batch = Array.isArray(result.data) ? result.data : [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }

  function freeAgentStatus(playerKey, competition = null) {
    return {
      kind: 'free_agent',
      playerKey: clean(playerKey),
      teamName: 'Free Agent',
      teamId: null,
      logoName: '',
      division: '',
      competitionKey: clean(competition?.competition_key),
      competitionName: clean(competition?.display_name),
      phase: clean(competition?.phase),
      source: 'free_agent',
      routeHash: clean(competition?.route_hash)
    };
  }

  function normalizedGamertag(value) {
    return clean(value)
      .normalize('NFKC')
      .toLocaleLowerCase('sv-SE');
  }

  function sportsGamerId(value) {
    const match = clean(value).match(/\/players\/(\d+)(?:\/|$|[?#])/i);
    return match?.[1] || '';
  }

  function compactGamertag(value) {
    return normalizedGamertag(value).replace(/[^a-z0-9åäö]/gi, '');
  }

  function waitForEcl27CurrentRoster(timeoutMs = 5000) {
    const ready = window.SEH_ECL27_CURRENT_ROSTER_V1;
    if (ready?.teams?.length) return Promise.resolve(ready);

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('seh-ecl27-current-roster-ready', onReady);
        resolve(window.SEH_ECL27_CURRENT_ROSTER_V1 || null);
      };
      const onReady = () => finish();
      window.addEventListener('seh-ecl27-current-roster-ready', onReady, { once: true });
      window.setTimeout(finish, timeoutMs);
    });
  }

  async function loadPlayerIdentityMap(sb) {
    const rows = await fetchAll(
      sb,
      'app_player_directory_cache',
      'player_key,display_gamertag,sports_gamer_player_url'
    );

    const byKey = new Map();
    const gamertagCandidates = new Map();
    const compactCandidates = new Map();

    for (const row of rows) {
      const canonicalKey = clean(row.player_key);
      if (!canonicalKey) continue;

      byKey.set(canonicalKey, canonicalKey);

      const sgId = sportsGamerId(row.sports_gamer_player_url);
      if (sgId) {
        byKey.set('SG:' + sgId, canonicalKey);
        byKey.set(sgId, canonicalKey);
      }

      const gt = normalizedGamertag(row.display_gamertag);
      if (gt) {
        if (!gamertagCandidates.has(gt)) gamertagCandidates.set(gt, new Set());
        gamertagCandidates.get(gt).add(canonicalKey);
      }

      const compact = compactGamertag(row.display_gamertag);
      if (compact) {
        if (!compactCandidates.has(compact)) compactCandidates.set(compact, new Set());
        compactCandidates.get(compact).add(canonicalKey);
      }
    }

    const byGamertag = new Map();
    for (const [gt, keys] of gamertagCandidates) {
      if (keys.size === 1) byGamertag.set(gt, [...keys][0]);
    }

    const byCompactGamertag = new Map();
    for (const [gt, keys] of compactCandidates) {
      if (keys.size === 1) byCompactGamertag.set(gt, [...keys][0]);
    }

    return { byKey, byGamertag, byCompactGamertag };
  }

  function canonicalRosterPlayerKey(playerName, identity) {
    const gt = normalizedGamertag(playerName);
    if (gt && identity?.byGamertag?.has(gt)) return identity.byGamertag.get(gt);

    const compact = compactGamertag(playerName);
    if (compact && identity?.byCompactGamertag?.has(compact)) {
      return identity.byCompactGamertag.get(compact);
    }
    return '';
  }

  function statusesFromBuildSnapshot(snapshot, identity, competition) {
    const statuses = new Map();

    for (const team of snapshot?.teams || []) {
      const teamName = clean(team?.name);
      if (!teamName) continue;

      for (const playerName of team?.players || []) {
        const playerKey = canonicalRosterPlayerKey(playerName, identity);
        if (!playerKey) continue;

        statuses.set(playerKey, {
          kind: 'team',
          playerKey,
          teamName,
          teamId: Number(team?.teamId) || null,
          teamProjectId: null,
          logoName: clean(team?.logoUrl || team?.logoName),
          division: clean(team?.division),
          competitionKey: clean(competition?.competition_key),
          competitionName: clean(competition?.display_name),
          phase: clean(competition?.phase),
          source: 'team_build',
          routeHash: clean(competition?.route_hash)
        });
      }
    }

    return statuses;
  }

  function statusesFromRosterRows(rows, identity, competition) {
    const statuses = new Map();

    for (const row of rows || []) {
      const playerKey =
        clean(row?.player_key) ||
        identity?.byKey?.get(clean(row?.subject_key)) ||
        canonicalRosterPlayerKey(row?.display_gamertag, identity);
      const teamName = clean(row?.team_name);
      if (!playerKey || !teamName) continue;

      statuses.set(playerKey, {
        kind: 'team',
        playerKey,
        teamName,
        teamId: Number(row?.team_id) || null,
        teamProjectId: Number(row?.team_project_id) || null,
        logoName: clean(row?.logo_name),
        division: clean(row?.division),
        competitionKey: clean(competition?.competition_key),
        competitionName: clean(competition?.display_name),
        phase: clean(competition?.phase),
        source: 'team_build',
        routeHash: clean(competition?.route_hash)
      });
    }

    return statuses;
  }

  function canonicalEventPlayerKey(event, identity) {
    const rawKey = clean(event?.player_key);
    const direct = identity?.byKey?.get(rawKey);
    if (direct) return direct;

    const gt = normalizedGamertag(event?.gamertag);
    const byName = gt ? identity?.byGamertag?.get(gt) : '';
    return byName || rawKey;
  }

  async function loadSource(sb, source, identity) {
    const stateResult = await sb
      .from('seh_app_competition_states')
      .select('competition_key,display_name,phase,route_hash,updated_at')
      .eq('competition_key', source.competitionKey)
      .limit(1);

    if (stateResult.error) throw stateResult.error;
    const competition = stateResult.data?.[0] || null;
    if (!competition || !ACTIVE_PHASES.has(clean(competition.phase).toLowerCase())) {
      return { competition, statuses: new Map() };
    }

    if (
      clean(competition.phase).toLowerCase() === 'building' &&
      clean(source.competitionKey).toLowerCase() === 'ecl27winter'
    ) {
      const rosterResult = await sb
        .from('v_ecl27_current_roster_v1')
        .select('subject_key,player_key,display_gamertag,team_project_id,team_name,division,team_id,logo_name,roster_source');

      if (!rosterResult.error && Array.isArray(rosterResult.data)) {
        return {
          competition,
          statuses: statusesFromRosterRows(rosterResult.data, identity, competition)
        };
      }

      const snapshot = await waitForEcl27CurrentRoster();
      if (snapshot?.teams?.length) {
        return {
          competition,
          statuses: statusesFromBuildSnapshot(snapshot, identity, competition)
        };
      }

      throw rosterResult.error || new Error('ECL 27 current roster is unavailable.');
    }

    const [events, projects] = await Promise.all([
      fetchAll(
        sb,
        source.eventsTable,
        'id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team',
        'occurred_at'
      ),
      fetchAll(
        sb,
        source.projectsTable,
        'id,name,division,source_team_id,logo_name,status'
      )
    ]);

    const projectsById = new Map(
      projects.map(row => [Number(row.id), row]).filter(([id]) => Number.isFinite(id) && id > 0)
    );

    events.sort((a, b) =>
      (Date.parse(b.occurred_at || '') || 0) - (Date.parse(a.occurred_at || '') || 0) ||
      Number(b.id || 0) - Number(a.id || 0)
    );

    const latestByPlayer = new Map();
    for (const event of events) {
      const playerKey = canonicalEventPlayerKey(event, identity);
      if (!playerKey || latestByPlayer.has(playerKey)) continue;
      latestByPlayer.set(playerKey, { ...event, canonical_player_key: playerKey });
    }

    const statuses = new Map();
    for (const [playerKey, event] of latestByPlayer) {
      const eventType = clean(event.event_type).toLowerCase();
      if (eventType !== 'in') continue;

      const project = projectsById.get(Number(event.team_project_id)) || null;
      const teamName = clean(project?.name || event.to_team);
      if (!teamName) continue;

      statuses.set(playerKey, {
        kind: 'team',
        playerKey,
        teamName,
        teamId: Number(project?.source_team_id) || null,
        teamProjectId: Number(project?.id || event.team_project_id) || null,
        logoName: clean(project?.logo_name),
        division: clean(project?.division),
        competitionKey: clean(competition.competition_key),
        competitionName: clean(competition.display_name),
        phase: clean(competition.phase),
        source: clean(competition.phase).toLowerCase() === 'building' ? 'team_build' : 'tournament',
        routeHash: clean(competition.route_hash)
      });
    }

    return { competition, statuses };
  }

  async function load(force = false) {
    if (isSecContext()) {
      return { loadedAt: Date.now(), statuses: new Map(), competitions: [], secBypass: true };
    }

    if (!force && cache && Date.now() - cache.loadedAt < CACHE_MS) return cache;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas för aktuell spelarstatus.');

      const statuses = new Map();
      const competitions = [];
      const identity = await loadPlayerIdentityMap(sb);

      for (const source of SOURCES) {
        const result = await loadSource(sb, source, identity);
        if (result.competition) competitions.push(result.competition);

        // First active source wins if several competition sources are added later.
        for (const [playerKey, status] of result.statuses) {
          if (!statuses.has(playerKey)) statuses.set(playerKey, status);
        }
      }

      cache = { loadedAt: Date.now(), statuses, competitions, secBypass: false };
      window.dispatchEvent(new CustomEvent('seh-current-player-status-ready'));
      return cache;
    })().catch(error => {
      console.warn('[Svensk eHockey] Aktuell spelarstatus kunde inte laddas', error);
      cache = { loadedAt: Date.now(), statuses: new Map(), competitions: [], error, secBypass: false };
      return cache;
    }).finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  async function get(playerKey, options = {}) {
    const key = clean(playerKey);
    if (!key) return null;
    if (isSecContext() && options.allowSec !== true) return null;

    const data = await load(Boolean(options.force));
    if (data.secBypass && options.allowSec !== true) return null;
    if (data.error) return null;

    const status = data.statuses.get(key);
    if (status) return { ...status };

    const competition = data.competitions.find(row =>
      ACTIVE_PHASES.has(clean(row.phase).toLowerCase())
    ) || null;
    return freeAgentStatus(key, competition);
  }

  async function decorateRows(rows, options = {}) {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length || (isSecContext() && options.allowSec !== true)) return list;

    const data = await load(Boolean(options.force));
    if (data.secBypass && options.allowSec !== true) return list;
    if (data.error) return list;

    const competition = data.competitions.find(row =>
      ACTIVE_PHASES.has(clean(row.phase).toLowerCase())
    ) || null;

    return list.map(row => {
      const playerKey = clean(row?.player_key || row?.key);
      if (!playerKey) return row;

      const status = data.statuses.get(playerKey) || freeAgentStatus(playerKey, competition);
      return {
        ...row,
        current_status: status.kind,
        current_team_name: status.teamName,
        current_team_id: status.teamId,
        current_team_project_id: status.teamProjectId || null,
        current_team_logo: status.logoName,
        current_team_division: status.division,
        current_competition_key: status.competitionKey,
        current_competition_name: status.competitionName,
        current_competition_phase: status.phase,
        current_status_source: status.source,
        current_route_hash: status.routeHash
      };
    });
  }

  function invalidate() {
    cache = null;
  }

  window.SEH_currentPlayerStatus = {
    load,
    get,
    decorateRows,
    invalidate,
    isSecContext
  };
})();