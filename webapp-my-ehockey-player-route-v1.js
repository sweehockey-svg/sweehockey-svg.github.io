(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const FAST_PROFILE_KEY = 'seh_fast_profile_nav_v1';
  let client = null;
  let replaying = false;

  function cfg() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (window.__SEH_NATIVE_SUPABASE_CLIENT__) return window.__SEH_NATIVE_SUPABASE_CLIENT__;
    if (client) return client;
    const config = cfg();
    const url = String(config.supabaseUrl || config.SUPABASE_URL || '').trim();
    const key = String(config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_ANON_KEY || '').trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function sportsGamerId(value) {
    return String(value || '').match(/\/players\/(\d+)/i)?.[1] || '';
  }

  function resolvedPhoto(row, link) {
    const visible = String(link?.dataset?.playerPhoto || link?.querySelector('img')?.currentSrc || link?.querySelector('img')?.src || '').trim();
    if (visible) return visible;

    const explicit = String(row?.player_image || '').trim();
    const sgId = sportsGamerId(row?.sports_gamer_player_url);
    if (typeof window.SEH_playerImageUrl === 'function') {
      const result = window.SEH_playerImageUrl(explicit, sgId);
      if (result) return result;
    }
    if (explicit) return explicit;
    if (sgId && Array.isArray(window.SEH_PLAYER_IMAGE_FILES) && window.SEH_PLAYER_IMAGE_FILES.includes(`${sgId}.png`)) {
      return `/web-images/players/${encodeURIComponent(sgId)}.png.webp`;
    }
    return '';
  }

  function seed(data) {
    const value = {
      href: String(data?.href || ''),
      key: String(data?.key || ''),
      name: String(data?.name || ''),
      position: String(data?.position || 'Spelare'),
      photo: String(data?.photo || ''),
      latestTeam: String(data?.latestTeam || ''),
      latestSeason: String(data?.latestSeason || ''),
      history: String(data?.history || ''),
      games: Math.max(0, Number(data?.games) || 0),
      rankNo: 0,
      rankPoints: 0,
      teamLogo: '',
      savedAt: Date.now()
    };
    try { sessionStorage.setItem(FAST_PROFILE_KEY, JSON.stringify(value)); } catch (_) {}
    window.__SEH_PENDING_NATIVE_PLAYER__ = value;
  }

  async function preload(link) {
    const href = String(link?.href || link?.getAttribute('href') || '').trim();
    const key = String(link?.dataset?.playerKey || '').trim();
    const name = String(link?.dataset?.playerName || link?.querySelector('.seh-me-teammate-copy strong')?.textContent || '').trim();

    seed({
      href,
      key,
      name: name || key,
      photo: resolvedPhoto(null, link)
    });

    if (!key) return;
    const sb = getClient();
    if (!sb) return;

    try {
      const result = await sb
        .from('app_player_directory_cache')
        .select('player_key,display_gamertag,primary_position,latest_team,latest_season,career_games,player_image,sports_gamer_player_url')
        .eq('player_key', key)
        .limit(1);

      if (result.error) throw result.error;
      const row = result.data?.[0];
      if (!row) return;

      seed({
        href,
        key: row.player_key || key,
        name: row.display_gamertag || name || key,
        position: row.primary_position || 'Spelare',
        photo: resolvedPhoto(row, link),
        latestTeam: row.latest_team || '',
        latestSeason: row.latest_season || '',
        games: row.career_games || 0
      });
    } catch (error) {
      console.warn('[Svensk eHockey] Kunde inte förladda spelarprofil från Mitt eHockey', error);
    }
  }

  document.addEventListener('click', async event => {
    if (replaying) return;

    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;

    const link = event.target.closest?.(`#${ROOT_ID} a[href*="#/spelare/"]`);
    if (!link) return;

    const key = String(link.dataset.playerKey || '').trim();
    if (!key) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    await preload(link);
    if (!link.isConnected) return;

    replaying = true;
    try {
      link.click();
    } finally {
      replaying = false;
    }
  }, true);
})();