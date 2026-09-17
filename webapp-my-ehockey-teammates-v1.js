(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const PROFILE_KEY = 'seh_app_my_profile_v1';
  const HOST_ID = 'seh-my-teammates';
  const LIMIT = 5;

  let client = null;
  let timer = 0;
  let loadToken = 0;
  let loadedKey = '';
  let pendingForce = false;

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

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

  function canonicalTeam(value) {
    const fallback = String(value || '').replace(/\s+/g, ' ').trim();
    try { return window.SEH_WEBAPP_TEAM_ALIASES?.canonicalName(fallback) || fallback; } catch (_) { return fallback; }
  }

  function fmt(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)).toLocaleString('sv-SE') : '0';
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }

  function playerSlug(value) {
    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('sv-SE')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function playerProfileUrl(playerKey, gamertag) {
    if (typeof window.SEH_playerProfileUrl === 'function') {
      const canonical = String(window.SEH_playerProfileUrl(playerKey, gamertag) || '').trim();
      if (canonical) return canonical;
    }

    const key = String(playerKey || '').trim();
    const slug = playerSlug(gamertag);
    const routeValue = slug || key;
    if (!routeValue) return '#/spelare';

    const query = new URLSearchParams();
    if (/^[a-f0-9]{40,}$/i.test(key)) query.set('pk', key);
    const queryString = query.toString();
    return `#/spelare/${encodeURIComponent(routeValue)}${queryString ? `?${queryString}` : ''}`;
  }

  function localPlayerKey() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      return String(profile?.playerKey || profile?.player_key || profile?.key || '').trim();
    } catch (_) {
      return '';
    }
  }

  async function resolvePlayerKey() {
    const local = localPlayerKey();
    if (local) return local;
    const sb = getClient();
    if (!sb) return '';
    const result = await sb.rpc('seh_get_my_player_account');
    if (result.error) throw result.error;
    const row = Array.isArray(result.data) ? (result.data[0] || {}) : (result.data || {});
    return String(row?.status || '') === 'approved' ? String(row?.player_key || '').trim() : '';
  }

  function sportsGamerId(value) {
    return String(value || '').match(/\/players\/(\d+)/i)?.[1] || '';
  }

  function playerImageUrl(row) {
    const explicit = String(row?.player_image || '').trim();
    const sgId = sportsGamerId(row?.sports_gamer_player_url);

    if (typeof window.SEH_playerImageUrl === 'function') {
      const resolved = window.SEH_playerImageUrl(explicit, sgId);
      if (resolved) return resolved;
    }

    if (explicit) return explicit;
    if (sgId && Array.isArray(window.SEH_PLAYER_IMAGE_FILES) && window.SEH_PLAYER_IMAGE_FILES.includes(`${sgId}.png`)) {
      return `/web-images/players/${encodeURIComponent(sgId)}.png.webp`;
    }
    return '';
  }

  function ensureHost(root) {
    if (!root) return null;
    const preferredAnchor = root.querySelector('#seh-my-division-journey')
      || root.querySelector('#seh-my-career-milestones')
      || root.querySelector('.seh-me-career-section');
    if (!preferredAnchor) return null;

    let host = root.querySelector(`#${HOST_ID}`);
    if (!host) {
      host = document.createElement('section');
      host.id = HOST_ID;
      host.className = 'seh-me-section seh-me-teammates';
      host.setAttribute('aria-label', 'Spelat mest med');
      host.dataset.ready = '0';
      host.dataset.loading = '0';
      host.innerHTML = '<div class="seh-me-teammates-loading">Hämtar lagkamrater…</div>';
    }

    if (preferredAnchor.nextElementSibling !== host) {
      preferredAnchor.insertAdjacentElement('afterend', host);
    }
    return host;
  }

  function rowMarkup(row, index) {
    const name = String(row?.display_gamertag || '').trim() || 'Spelare';
    const key = String(row?.teammate_key || '').trim();
    const image = playerImageUrl(row);
    const sharedGames = fmt(row?.shared_games);
    const sharedTournaments = fmt(row?.shared_tournaments);
    const latestTeam = canonicalTeam(row?.latest_shared_team);
    const href = playerProfileUrl(key, name);
    const avatar = image
      ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy">`
      : `<span>${esc(initials(name))}</span>`;

    return `<a class="seh-me-teammate${index === 0 ? ' is-top' : ''}" href="${esc(href)}" data-me-close-first data-player-key="${esc(key)}" data-player-name="${esc(name)}" data-player-photo="${esc(image)}">
      <b class="seh-me-teammate-rank">${index + 1}</b>
      <div class="seh-me-teammate-avatar">${avatar}</div>
      <div class="seh-me-teammate-copy">
        <strong>${esc(name)}</strong>
        <span>${sharedGames} matcher · ${sharedTournaments} ${Number(row?.shared_tournaments) === 1 ? 'turnering' : 'turneringar'}</span>
        ${latestTeam ? `<small>Senast ihop: ${esc(latestTeam)}</small>` : ''}
      </div>
      <i>›</i>
    </a>`;
  }

  function render(host, rows) {
    host.innerHTML = `<div class="seh-me-section-head seh-me-teammates-head">
        <div><small>LAGKAMRATER</small><h3>Spelat mest med</h3></div>
        <span>Topp ${rows.length}</span>
      </div>
      <div class="seh-me-teammates-list">${rows.map(rowMarkup).join('')}</div>
      <p class="seh-me-teammates-note">Matchantalet bygger på överlappande registrerade matcher i samma lag och turneringsfas.</p>`;
    host.dataset.ready = '1';
  }

  async function load(force = false) {
    if (!isWebApp()) return;
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;
    const host = ensureHost(root);
    if (!host) return;
    if (host.dataset.loading === '1') {
      if (force) pendingForce = true;
      return;
    }

    const token = ++loadToken;
    host.dataset.loading = '1';

    try {
      const playerKey = await resolvePlayerKey();
      if (token !== loadToken || !host.isConnected) return;
      if (!playerKey) {
        host.remove();
        return;
      }
      if (!force && loadedKey === playerKey && host.dataset.ready === '1') return;

      host.dataset.ready = '0';
      host.innerHTML = '<div class="seh-me-teammates-loading">Hämtar lagkamrater…</div>';

      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas');
      const result = await sb.rpc('seh_get_player_teammates_v2', {
        p_player_key: playerKey,
        p_limit: LIMIT
      });
      if (token !== loadToken || !host.isConnected) return;
      if (result.error) throw result.error;

      const rows = Array.isArray(result.data) ? result.data.filter(row => Number(row?.shared_games) > 0) : [];
      if (!rows.length) {
        host.remove();
        return;
      }

      render(host, rows);
      loadedKey = playerKey;
    } catch (error) {
      console.warn('[Svensk eHockey] Spelat mest med kunde inte laddas', error);
      if (token !== loadToken || !host.isConnected) return;
      host.innerHTML = '<div class="seh-me-teammates-loading">Lagkamraterna kunde inte laddas just nu.</div>';
      host.dataset.ready = '0';
    } finally {
      if (host.isConnected && token === loadToken) host.dataset.loading = '0';
      if (pendingForce && host.isConnected && token === loadToken) {
        pendingForce = false;
        schedule(20, true);
      }
    }
  }

  function schedule(delay = 90, force = false) {
    clearTimeout(timer);
    timer = window.setTimeout(() => load(force), delay);
  }

  const observer = new MutationObserver(mutations => {
    if (!isWebApp()) return;
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;
    const relevant = mutations.some(mutation => {
      const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
      return !target?.closest?.(`#${HOST_ID}`);
    });
    if (relevant) schedule(100);
  });

  window.addEventListener('storage', event => {
    if (event.key === PROFILE_KEY) {
      loadedKey = '';
      schedule(80, true);
    }
  });

  window.SEH_REFRESH_MY_TEAMMATES = () => {
    loadedKey = '';
    schedule(20, true);
  };

  function start() {
    if (!isWebApp()) return;
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    schedule(300);
  }

  window.addEventListener('seh-team-aliases-ready', () => {
    loadedKey = '';
    schedule(20, true);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();