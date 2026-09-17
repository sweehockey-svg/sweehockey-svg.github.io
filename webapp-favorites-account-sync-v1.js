(() => {
  'use strict';

  const FAVORITES_KEY = 'seh_app_favorites_v1';
  const FAVORITES_TABLE = 'ehockey_user_favorites';
  const STATE_TABLE = 'ehockey_user_favorite_state';
  const MAX_FAVORITES = 100;
  const LOCAL_POLL_MS = 700;
  const REMOTE_REFRESH_MS = 30000;

  let client = null;
  let currentUserId = '';
  let activationToken = 0;
  let baseline = new Map();
  let observedSignature = '';
  let writingLocal = false;
  let syncChain = Promise.resolve();
  let remoteTimer = 0;

  function cfg() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (window.__SEH_NATIVE_SUPABASE_CLIENT__) return window.__SEH_NATIVE_SUPABASE_CLIENT__;
    if (client) return client;
    const config = cfg();
    const url = String(config.supabaseUrl || config.SUPABASE_URL || '').trim();
    const key = String(config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY || '').trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function cleanTitle(value) {
    return String(value || '')
      .replace(/\s*[|·]\s*Svensk eHockey.*$/i, '')
      .replace(/\s*[–—-]\s*Svensk eHockey.*$/i, '')
      .trim();
  }

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try { return new URL(raw, location.origin).href; }
    catch (_) { return raw; }
  }

  function entityKeyFor(item) {
    const type = item?.type === 'team' ? 'team' : item?.type === 'player' ? 'player' : '';
    if (!type) return '';
    const url = normalizeUrl(item?.url);
    if (url) {
      try {
        const parsed = new URL(url, location.origin);
        return parsed.origin === location.origin
          ? `${parsed.pathname}${parsed.search}${parsed.hash}`
          : parsed.href;
      } catch (_) {
        return url;
      }
    }
    const title = cleanTitle(item?.title).toLocaleLowerCase('sv-SE');
    return title ? `title:${title}` : '';
  }

  function normalizeFavorite(item, index = 0) {
    if (!item || (item.type !== 'player' && item.type !== 'team')) return null;
    const type = String(item.type);
    const title = cleanTitle(item.title || item.name);
    const url = normalizeUrl(item.url);
    const entityKey = entityKeyFor({ type, title, url });
    if (!entityKey || (!title && !url)) return null;
    const rawTs = Number(item.ts ?? item.sort_ts ?? 0);
    const ts = Number.isFinite(rawTs) && rawTs > 0 ? Math.round(rawTs) : Math.max(1, Date.now() - index);
    return { type, title, url, ts, entityKey };
  }

  function normalizeList(value) {
    const raw = Array.isArray(value) ? value : [];
    const seen = new Set();
    const result = [];
    for (let index = 0; index < raw.length; index += 1) {
      const favorite = normalizeFavorite(raw[index], index);
      if (!favorite) continue;
      const key = `${favorite.type}|${favorite.entityKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(favorite);
      if (result.length >= MAX_FAVORITES) break;
    }
    return result.sort((a, b) => b.ts - a.ts);
  }

  function readLocal() {
    try { return normalizeList(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
    catch (_) { return []; }
  }

  function publicFavorite(item) {
    return { type: item.type, title: item.title, url: item.url, ts: item.ts };
  }

  function listSignature(list) {
    return JSON.stringify(normalizeList(list).map(item => [item.type, item.entityKey, item.title, item.url, item.ts]));
  }

  function listMap(list) {
    return new Map(normalizeList(list).map(item => [`${item.type}|${item.entityKey}`, item]));
  }

  function sameFavorite(a, b) {
    return Boolean(a && b && a.title === b.title && a.url === b.url && a.ts === b.ts);
  }

  function notifyLocalChange(value) {
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: FAVORITES_KEY,
        newValue: value,
        storageArea: localStorage,
        url: location.href
      }));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('seh:favorites-synced'));
  }

  function writeLocal(list) {
    const normalized = normalizeList(list);
    const json = JSON.stringify(normalized.map(publicFavorite));
    observedSignature = listSignature(normalized);
    if ((localStorage.getItem(FAVORITES_KEY) || '[]') === json) return normalized;
    writingLocal = true;
    try {
      localStorage.setItem(FAVORITES_KEY, json);
      notifyLocalChange(json);
    } finally {
      writingLocal = false;
    }
    return normalized;
  }

  function rowFromFavorite(userId, item) {
    return {
      user_id: userId,
      favorite_type: item.type,
      entity_key: item.entityKey,
      title: item.title,
      url: item.url,
      sort_ts: item.ts,
      updated_at: new Date().toISOString()
    };
  }

  function favoriteFromRow(row) {
    return normalizeFavorite({
      type: row?.favorite_type,
      title: row?.title,
      url: row?.url,
      ts: row?.sort_ts
    });
  }

  async function fetchRemote(userId) {
    const sb = getClient();
    if (!sb || !userId) return [];
    const result = await sb
      .from(FAVORITES_TABLE)
      .select('favorite_type,entity_key,title,url,sort_ts,updated_at')
      .eq('user_id', userId)
      .order('sort_ts', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(MAX_FAVORITES);
    if (result.error) throw result.error;
    return normalizeList((result.data || []).map(favoriteFromRow).filter(Boolean));
  }

  async function stateExists(userId) {
    const sb = getClient();
    const result = await sb.from(STATE_TABLE).select('user_id').eq('user_id', userId).maybeSingle();
    if (result.error) throw result.error;
    return Boolean(result.data?.user_id);
  }

  async function touchState(userId) {
    const sb = getClient();
    const result = await sb
      .from(STATE_TABLE)
      .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
  }

  async function upsertFavorites(userId, list) {
    const normalized = normalizeList(list);
    if (!normalized.length) return;
    const sb = getClient();
    const result = await sb
      .from(FAVORITES_TABLE)
      .upsert(normalized.map(item => rowFromFavorite(userId, item)), {
        onConflict: 'user_id,favorite_type,entity_key'
      });
    if (result.error) throw result.error;
  }

  async function deleteFavorites(userId, list) {
    const sb = getClient();
    for (const type of ['player', 'team']) {
      const keys = list.filter(item => item.type === type).map(item => item.entityKey);
      if (!keys.length) continue;
      const result = await sb
        .from(FAVORITES_TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('favorite_type', type)
        .in('entity_key', keys);
      if (result.error) throw result.error;
    }
  }

  function mergeLists(remote, local) {
    const map = listMap(remote);
    for (const item of normalizeList(local)) {
      const key = `${item.type}|${item.entityKey}`;
      const existing = map.get(key);
      if (!existing || item.ts >= existing.ts) map.set(key, item);
    }
    return normalizeList([...map.values()]);
  }

  function queue(task) {
    syncChain = syncChain.then(task, task);
    return syncChain;
  }

  async function bootstrapUser(userId, token) {
    const local = readLocal();
    const [initialized, remoteBefore] = await Promise.all([stateExists(userId), fetchRemote(userId)]);
    if (token !== activationToken || currentUserId !== userId) return;

    if (!initialized) {
      await upsertFavorites(userId, mergeLists(remoteBefore, local));
      await touchState(userId);
    }

    const remote = await fetchRemote(userId);
    if (token !== activationToken || currentUserId !== userId) return;
    const cached = writeLocal(remote);
    baseline = listMap(cached);
    observedSignature = listSignature(cached);
  }

  async function syncLocalDelta() {
    const userId = currentUserId;
    if (!userId || writingLocal) return;

    const current = readLocal();
    const currentSignature = listSignature(current);
    if (currentSignature === observedSignature) return;

    const currentMap = listMap(current);
    const additions = [];
    const removals = [];

    for (const [key, item] of currentMap) {
      const previous = baseline.get(key);
      if (!previous || !sameFavorite(previous, item)) additions.push(item);
    }
    for (const [key, item] of baseline) {
      if (!currentMap.has(key)) removals.push(item);
    }

    if (!additions.length && !removals.length) {
      baseline = currentMap;
      observedSignature = currentSignature;
      return;
    }

    await deleteFavorites(userId, removals);
    await upsertFavorites(userId, additions);
    await touchState(userId);
    if (currentUserId !== userId) return;

    const remote = await fetchRemote(userId);
    if (currentUserId !== userId) return;
    const cached = writeLocal(remote);
    baseline = listMap(cached);
    observedSignature = listSignature(cached);
  }

  async function refreshFromRemote() {
    const userId = currentUserId;
    if (!userId) return;
    if (listSignature(readLocal()) !== observedSignature) await syncLocalDelta();
    if (currentUserId !== userId) return;

    const remote = await fetchRemote(userId);
    if (currentUserId !== userId) return;
    if (listSignature(remote) === observedSignature) return;

    const cached = writeLocal(remote);
    baseline = listMap(cached);
    observedSignature = listSignature(cached);
  }

  function scheduleRemoteRefresh() {
    clearInterval(remoteTimer);
    remoteTimer = window.setInterval(() => {
      if (!currentUserId || document.visibilityState === 'hidden') return;
      queue(refreshFromRemote).catch(error => {
        console.warn('[Svensk eHockey] Favoriter kunde inte uppdateras från kontot', error);
      });
    }, REMOTE_REFRESH_MS);
  }

  function activateUser(user) {
    const nextUserId = String(user?.id || '').trim();
    const token = ++activationToken;
    currentUserId = nextUserId;
    baseline = new Map();
    observedSignature = listSignature(readLocal());
    clearInterval(remoteTimer);

    if (!nextUserId) return;
    queue(() => bootstrapUser(nextUserId, token))
      .then(scheduleRemoteRefresh)
      .catch(error => {
        console.warn('[Svensk eHockey] Kontosynk för favoriter kunde inte startas', error);
      });
  }

  async function init() {
    const sb = getClient();
    if (!sb) return;

    try {
      const sessionResult = await sb.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      activateUser(sessionResult.data?.session?.user || null);
    } catch (error) {
      console.warn('[Svensk eHockey] Kunde inte läsa inloggning för favoritsynk', error);
    }

    sb.auth.onAuthStateChange((_event, session) => {
      const nextId = String(session?.user?.id || '');
      if (nextId === currentUserId) return;
      activateUser(session?.user || null);
    });

    window.setInterval(() => {
      if (!currentUserId || writingLocal) return;
      if (listSignature(readLocal()) === observedSignature) return;
      queue(syncLocalDelta).catch(error => {
        console.warn('[Svensk eHockey] Favoritändringen kunde inte sparas på kontot', error);
      });
    }, LOCAL_POLL_MS);

    window.addEventListener('storage', event => {
      if (event.key !== FAVORITES_KEY || !currentUserId || writingLocal) return;
      queue(syncLocalDelta).catch(error => {
        console.warn('[Svensk eHockey] Favoritändringen kunde inte synkas mellan flikar', error);
      });
    });

    const refresh = () => {
      if (!currentUserId) return;
      queue(refreshFromRemote).catch(error => {
        console.warn('[Svensk eHockey] Favoriter kunde inte uppdateras', error);
      });
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
  }

  window.SEH_FAVORITES_SYNC = {
    refresh() {
      return currentUserId ? queue(refreshFromRemote) : Promise.resolve();
    },
    isAccountBacked() {
      return Boolean(currentUserId);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
