(() => {
  'use strict';

  const STATE = window.__SEH_VERIFIED_TEAM_ALIAS_STATE__ || (
    window.__SEH_VERIFIED_TEAM_ALIAS_STATE__ = {
      rows: null,
      aliasMap: null,
      teamIdMap: null,
      promise: null,
      error: null,
      version: 0
    }
  );

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

  function key(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('sv-SE');
  }

  function build(rows) {
    const aliasMap = new Map();
    const teamIdMap = new Map();

    for (const row of Array.isArray(rows) ? rows : []) {
      const teamId = Number(row?.team_id) || 0;
      const currentName = String(row?.current_name || '').replace(/\s+/g, ' ').trim();
      if (!teamId || !currentName) continue;

      teamIdMap.set(teamId, row);
      const names = [
        currentName,
        ...(Array.isArray(row?.historical_names) ? row.historical_names : []),
        ...(Array.isArray(row?.names_used_in_leagues) ? row.names_used_in_leagues : [])
      ];

      for (const name of names) {
        const normalized = key(name);
        if (!normalized) continue;
        if (!aliasMap.has(normalized)) {
          aliasMap.set(normalized, row);
          continue;
        }
        const existing = aliasMap.get(normalized);
        if (existing && Number(existing?.team_id) !== teamId) aliasMap.set(normalized, null);
      }
    }

    STATE.aliasMap = aliasMap;
    STATE.teamIdMap = teamIdMap;
  }

  async function ensure() {
    if (STATE.aliasMap instanceof Map && STATE.teamIdMap instanceof Map) return STATE.rows || [];
    if (STATE.promise) return STATE.promise;

    const cfg = window.EHOCKEY_CONFIG || window.SEH_CONFIG || {};
    const supabaseUrl = String(cfg.supabaseUrl || cfg.SUPABASE_URL || '').replace(/\/+$/, '');
    const publishableKey = String(cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || '').trim();
    if (!supabaseUrl || !publishableKey) return [];

    STATE.promise = (async () => {
      try {
        const url = new URL(`${supabaseUrl}/rest/v1/v_local_team_list`);
        url.searchParams.set('select', 'team_id,current_name,historical_names,names_used_in_leagues,logo_path,logo_url,profile_url');
        url.searchParams.set('limit', '5000');

        const response = await fetch(url.toString(), {
          headers: { apikey: publishableKey, Accept: 'application/json' },
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Klubbalias HTTP ${response.status}`);

        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('Ogiltigt klubbalias-svar');

        STATE.rows = rows;
        build(rows);
        STATE.error = null;
        STATE.version = Number(STATE.version || 0) + 1;
        window.dispatchEvent(new CustomEvent('seh-team-aliases-ready', {
          detail: { count: rows.length, version: STATE.version }
        }));
        return rows;
      } catch (error) {
        STATE.error = error;
        STATE.rows = [];
        STATE.aliasMap = null;
        STATE.teamIdMap = null;
        STATE.version = Number(STATE.version || 0) + 1;
        console.warn('[Svensk eHockey] Webbappens klubbalias kunde inte laddas', error);
        return [];
      } finally {
        STATE.promise = null;
      }
    })();

    return STATE.promise;
  }

  function byName(value) {
    const normalized = key(value);
    if (!normalized) return null;
    ensure().catch(() => {});
    return STATE.aliasMap instanceof Map ? (STATE.aliasMap.get(normalized) || null) : null;
  }

  function byTeamId(teamId) {
    const id = Number(teamId) || 0;
    if (!id) return null;
    ensure().catch(() => {});
    return STATE.teamIdMap instanceof Map ? (STATE.teamIdMap.get(id) || null) : null;
  }

  function resolve(value, teamId = 0) {
    return byTeamId(teamId) || byName(value) || null;
  }

  function canonicalName(value, teamId = 0) {
    const fallback = String(value || '').replace(/\s+/g, ' ').trim();
    return String(resolve(fallback, teamId)?.current_name || fallback).replace(/\s+/g, ' ').trim();
  }

  function canonicalTeamId(value, teamId = 0) {
    return Number(resolve(value, teamId)?.team_id) || Number(teamId) || 0;
  }

  function aliases(value, teamId = 0) {
    const row = resolve(value, teamId);
    if (!row) return String(value || '').trim() ? [String(value).trim()] : [];
    return [...new Set([
      row.current_name,
      ...(Array.isArray(row.historical_names) ? row.historical_names : []),
      ...(Array.isArray(row.names_used_in_leagues) ? row.names_used_in_leagues : [])
    ].map(name => String(name || '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
  }

  function searchText(value, teamId = 0) {
    return aliases(value, teamId).join(' ').toLocaleLowerCase('sv-SE');
  }

  window.SEH_WEBAPP_TEAM_ALIASES = Object.freeze({
    ensure,
    key,
    resolve,
    byName,
    byTeamId,
    canonicalName,
    canonicalTeamId,
    aliases,
    searchText,
    state: STATE
  });

  if (isWebApp()) ensure().catch(() => {});
})();