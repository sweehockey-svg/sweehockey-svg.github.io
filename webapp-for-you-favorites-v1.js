(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  const FAVORITES_KEY = 'seh_app_favorites_v1';
  const MAX_ROWS = 3;
  let client = null;
  let running = false;
  let timer = 0;
  let lastSignature = '';

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

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cleanTitle(value) {
    return String(value || '')
      .replace(/\s*[|·]\s*Svensk eHockey.*$/i, '')
      .replace(/\s*[–—-]\s*Svensk eHockey.*$/i, '')
      .trim();
  }

  function favorites() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(item => item && (item.type === 'player' || item.type === 'team'))
        .map(item => ({
          type: String(item.type),
          title: cleanTitle(item.title),
          url: String(item.url || ''),
          ts: Number(item.ts || 0)
        }))
        .filter(item => item.title || item.url)
        .slice(0, 30);
    } catch (_) {
      return [];
    }
  }

  function playerRouteHint(url) {
    const decoded = decodeURIComponent(String(url || ''));
    const match = decoded.match(/#\/spelare\/([^/?#]+)/i);
    return match ? match[1].trim() : '';
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const diff = Math.max(0, Date.now() - date.getTime());
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Nyss';
    if (hours < 24) return `${hours} h sedan`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Igår';
    if (days < 7) return `${days} dagar sedan`;
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function eventLabel(event) {
    const player = String(event?.gamertag || '').trim() || 'Spelare';
    const type = String(event?.event_type || '').toLowerCase();
    const from = String(event?.from_team || '').trim();
    const to = String(event?.to_team || '').trim();
    if (type === 'in') return {
      title: to ? `${player} → ${to}` : `${player} in`,
      text: to ? `Ny i ${to}.` : 'Ny IN-händelse.'
    };
    if (type === 'out') return {
      title: from ? `${player} lämnar ${from}` : `${player} ut`,
      text: from ? `Har lämnat ${from}.` : 'Ny UT-händelse.'
    };
    return { title: player, text: 'Ny laghändelse.' };
  }

  async function resolveFavoriteActivity(sb, favs) {
    const playerFavs = favs.filter(item => item.type === 'player');
    const teamFavs = favs.filter(item => item.type === 'team');

    const [directoryResult, projectsResult, eventsResult] = await Promise.all([
      playerFavs.length
        ? sb.from('app_player_directory_cache')
            .select('player_key,display_gamertag')
            .limit(3000)
        : Promise.resolve({ data: [], error: null }),
      teamFavs.length
        ? sb.from('ecl27_team_projects')
            .select('id,name')
            .limit(200)
        : Promise.resolve({ data: [], error: null }),
      sb.from('ecl27_roster_events')
        .select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team')
        .order('occurred_at', { ascending: false })
        .limit(120)
    ]);

    if (eventsResult.error) return [];

    const directory = directoryResult.error ? [] : (directoryResult.data || []);
    const projects = projectsResult.error ? [] : (projectsResult.data || []);
    const events = eventsResult.data || [];

    const playerMap = new Map();
    for (const fav of playerFavs) {
      const hint = playerRouteHint(fav.url).toLowerCase();
      const title = fav.title.toLowerCase();
      const row = directory.find(player => {
        const key = String(player.player_key || '').toLowerCase();
        const tag = String(player.display_gamertag || '').toLowerCase();
        return Boolean(
          (hint && (key === hint || tag === hint)) ||
          (title && tag === title)
        );
      });
      if (row?.player_key) playerMap.set(String(row.player_key), fav);
    }

    const teamMap = new Map();
    for (const fav of teamFavs) {
      const title = fav.title.toLowerCase();
      const row = projects.find(project => String(project.name || '').toLowerCase() === title);
      if (row?.id) teamMap.set(Number(row.id), fav);
    }

    const hits = [];
    const seen = new Set();
    for (const event of events) {
      const playerFav = playerMap.get(String(event.player_key || ''));
      const teamFav = teamMap.get(Number(event.team_project_id));
      const fav = playerFav || teamFav;
      if (!fav) continue;
      const dedupe = `${event.id}:${fav.url}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      const label = eventLabel(event);
      hits.push({
        id: event.id,
        url: fav.url,
        favoriteTitle: fav.title,
        title: label.title,
        text: playerFav
          ? `${label.text} Följer ${fav.title}.`
          : `${label.text} Händelse i favoritlaget ${fav.title}.`,
        occurredAt: event.occurred_at
      });
      if (hits.length >= MAX_ROWS) break;
    }
    return hits;
  }

  function renderRows(root, hits) {
    const feed = root.querySelector('.seh-for-you__feed');
    if (!feed || !hits.length) return;

    feed.querySelectorAll('[data-fy-favorite-activity]').forEach(node => node.remove());

    const first = feed.querySelector('.seh-for-you__feed-row');
    if (first) {
      const title = String(first.querySelector('strong')?.textContent || '').trim();
      if (title === 'Din profil är kopplad') first.remove();
    }

    const html = hits.map(item => `
      <article class="seh-for-you__feed-row seh-for-you__favorite-row" data-fy-favorite-activity="1" data-fy-favorite-url="${esc(item.url)}" role="button" tabindex="0">
        <b>★</b>
        <div><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div>
        <time>${esc(relativeTime(item.occurredAt))}</time>
      </article>`).join('');
    feed.insertAdjacentHTML('afterbegin', html);

    while (feed.querySelectorAll('.seh-for-you__feed-row').length > MAX_ROWS) {
      feed.lastElementChild?.remove();
    }
  }

  async function enrich() {
    if (running) return;
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.ready !== '1') return;
    const favs = favorites();
    if (!favs.length) return;

    const signature = JSON.stringify(favs.map(item => [item.type, item.title, item.url]));
    if (signature === lastSignature && root.querySelector('[data-fy-favorite-activity]')) return;

    const sb = getClient();
    if (!sb) return;

    running = true;
    try {
      const hits = await resolveFavoriteActivity(sb, favs);
      if (hits.length) {
        lastSignature = signature;
        renderRows(root, hits);
      }
    } catch (error) {
      console.warn('[Svensk eHockey] Favoritaktivitet kunde inte laddas', error);
    } finally {
      running = false;
    }
  }

  function schedule(delay = 120) {
    clearTimeout(timer);
    timer = window.setTimeout(enrich, delay);
  }

  function openFavorite(row) {
    const url = String(row?.dataset?.fyFavoriteUrl || '').trim();
    if (!url) return;
    try {
      const target = new URL(url, location.origin);
      if (target.origin === location.origin) {
        location.href = `${target.pathname}${target.search}${target.hash}`;
      } else {
        location.href = url;
      }
    } catch (_) {
      location.href = url;
    }
  }

  document.addEventListener('click', event => {
    const row = event.target.closest('[data-fy-favorite-activity]');
    if (row) openFavorite(row);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest?.('[data-fy-favorite-activity]');
    if (!row) return;
    event.preventDefault();
    openFavorite(row);
  });

  const observer = new MutationObserver(() => schedule(180));
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    schedule(350);
  });

  window.addEventListener('storage', event => {
    if (event.key === FAVORITES_KEY) {
      lastSignature = '';
      schedule(80);
    }
  });

  window.addEventListener('focus', () => schedule(250));
})();
