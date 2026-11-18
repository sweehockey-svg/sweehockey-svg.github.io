(() => {
  'use strict';

  const CACHE_MS = 60 * 1000;
  const WINTER = {
    competition_key: 'ecl27winter',
    display_name: 'ECL ’27: Winter',
    phase: 'building',
    route_hash: '#/lagbygge'
  };

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

  async function fetchAll(sb, table, select, orderColumn = '', filter = null) {
    const rows = [];
    const pageSize = 1000;
    let from = 0;

    for (;;) {
      let query = sb.from(table).select(select);
      if (filter) query = filter(query);
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

  function freeAgentStatus(playerKey) {
    return {
      kind: 'free_agent',
      playerKey: clean(playerKey),
      teamName: '',
      teamId: null,
      logoName: '',
      division: '',
      competitionKey: '',
      competitionName: '',
      phase: '',
      source: 'free_agent_list',
      routeHash: ''
    };
  }

  function noTeamStatus(playerKey) {
    return {
      kind: 'no_team',
      playerKey: clean(playerKey),
      teamName: '',
      teamId: null,
      logoName: '',
      division: '',
      competitionKey: '',
      competitionName: '',
      phase: '',
      source: 'no_current_team',
      routeHash: ''
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


  async function loadPlayerIdentityMap(sb) {
    const rows = await fetchAll(
      sb,
      'app_player_directory_cache',
      'player_key,display_gamertag,sports_gamer_player_url',
      'player_key'
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

  function canonicalFreeAgentPlayerKey(row, identity) {
    const rawKey = clean(row?.player_key);
    if (rawKey) return identity?.byKey?.get(rawKey) || rawKey;
    return canonicalRosterPlayerKey(row?.display_gamertag, identity);
  }

  async function loadActiveFreeAgentKeys(sb, identity) {
    const rows = await fetchAll(
      sb,
      'v_ehockey_free_agents_public',
      'player_key,display_gamertag',
      'player_key'
    );
    const keys = new Set();
    for (const row of rows) {
      const playerKey = canonicalFreeAgentPlayerKey(row, identity);
      if (playerKey) keys.add(playerKey);
    }
    return keys;
  }

  async function loadTeamBuildStatuses(identity) {
    const statuses = new Map();
    // Match the actual Lagbygge page, not the raw Spring baseline.
    const getVisibleTeams = await window.SEH_ECL27_BUILD_ROSTER_READY;
    if (!getVisibleTeams) return statuses;
    for (const team of await getVisibleTeams()) {
      for (const player of team.playersNow) {
        const playerKey = canonicalRosterPlayerKey(player, identity);
        if (!playerKey) continue;
        statuses.set(playerKey, {
          kind: 'team',
          playerKey,
          teamName: team.name,
          teamId: team.teamId,
          logoName: team.logoName,
          division: team.division,
          competitionKey: WINTER.competition_key,
          competitionName: WINTER.display_name,
          phase: WINTER.phase,
          source: 'team_build',
          href: team.href,
          routeHash: team.href
        });
      }
    }
    return statuses;
  }

  async function loadWinterStatuses(identity) {
    const statuses = new Map();
    if (typeof window.SEH_fetchWinterRosters !== 'function') return statuses;
    const snapshot = await window.SEH_fetchWinterRosters();
    for (const [id, team] of window.SEH_winterPlayerTeams(snapshot)) {
      const playerKey = identity.byKey.get('SG:' + id);
      const club = window.SEH_winterClubStatus(snapshot, team);
      if (!playerKey || !club) continue;
      statuses.set(playerKey, {
        ...club,
        playerKey,
        teamId: null,
        teamProjectId: null,
        logoName: clean(team.logoUrl),
        division: '',
        competitionKey: WINTER.competition_key,
        competitionName: WINTER.display_name,
        phase: WINTER.phase,
        source: 'winter-registration',
        routeHash: window.SEH_winterTeamUrl(team)
      });
    }
    return statuses;
  }

  function optionalSource(promise, name, fallback) {
    return promise.catch(error => {
      console.warn('[Svensk eHockey] Kunde inte läsa ' + name, error);
      return fallback;
    });
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

      const identity = await loadPlayerIdentityMap(sb);
      const [statuses, activeFreeAgents, registered] = await Promise.all([
        optionalSource(loadTeamBuildStatuses(identity), 'Lagbygge', new Map()),
        optionalSource(loadActiveFreeAgentKeys(sb, identity), 'Free Agents', new Set()),
        optionalSource(loadWinterStatuses(identity), 'Winter-anmälningar', new Map())
      ]);
      // A unique official registration wins over the current team build.
      for (const [playerKey, status] of registered) statuses.set(playerKey, status);
      const competitions = [WINTER];

      cache = { loadedAt: Date.now(), statuses, activeFreeAgents, competitions, secBypass: false };
      window.dispatchEvent(new CustomEvent('seh-current-player-status-ready'));
      return cache;
    })().catch(error => {
      console.warn('[Svensk eHockey] Aktuell spelarstatus kunde inte laddas', error);
      cache = { loadedAt: Date.now(), statuses: new Map(), activeFreeAgents: new Set(), competitions: [], error, secBypass: false };
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
    if (data.activeFreeAgents?.has(key)) return freeAgentStatus(key);
    return noTeamStatus(key);
  }

  async function decorateRows(rows, options = {}) {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length || (isSecContext() && options.allowSec !== true)) return list;

    const data = await load(Boolean(options.force));
    if (data.secBypass && options.allowSec !== true) return list;
    if (data.error) return list;

    return list.map(row => {
      const playerKey = clean(row?.player_key || row?.key);
      if (!playerKey) return row;

      const status =
        data.statuses.get(playerKey) ||
        (data.activeFreeAgents?.has(playerKey)
          ? freeAgentStatus(playerKey)
          : noTeamStatus(playerKey));
      return {
        ...row,
        current_status: status.kind,
        current_team_name: status.teamName,
        current_team_id: status.teamId,
        current_team_project_id: status.teamProjectId || null,
        current_team_logo: status.logoName,
        current_team_href: status.href || '',
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
