(() => {
  'use strict';

  const FAVORITES_KEY = 'seh_app_favorites_v1';
  const LOCAL_READ_KEY = 'seh_notification_reads_guest_v1';
  const MAX_NOTIFICATIONS = 40;
  let client = null;
  let currentItems = [];
  let currentUser = null;
  let loading = false;
  let refreshTimer = 0;

  const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M10 20h4"/></svg>';

  function cfg() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
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
        .map(item => ({ type: String(item.type), title: cleanTitle(item.title), url: String(item.url || '') }))
        .filter(item => item.title || item.url)
        .slice(0, 50);
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
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Nyss';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Igår';
    if (days < 7) return `${days} d`;
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function localReadSet() {
    try { return new Set(JSON.parse(localStorage.getItem(LOCAL_READ_KEY) || '[]')); }
    catch (_) { return new Set(); }
  }

  function saveLocalRead(set) {
    try { localStorage.setItem(LOCAL_READ_KEY, JSON.stringify(Array.from(set).slice(-500))); } catch (_) {}
  }

  function eventCopy(event) {
    const player = String(event.gamertag || '').trim() || 'Spelare';
    const type = String(event.event_type || '').toLowerCase();
    const from = String(event.from_team || '').trim();
    const to = String(event.to_team || '').trim();
    if (type === 'in') return { title: to ? `${player} → ${to}` : `${player} går in`, text: to ? `Ny spelare i ${to}.` : 'Ny IN-händelse.' };
    if (type === 'out') return { title: from ? `${player} lämnar ${from}` : `${player} går ut`, text: from ? `Har lämnat ${from}.` : 'Ny UT-händelse.' };
    return { title: player, text: 'Ny laghändelse.' };
  }

  async function buildNotifications(sb, user) {
    const favs = favorites();
    const playerFavs = favs.filter(item => item.type === 'player');
    const teamFavs = favs.filter(item => item.type === 'team');

    const [directoryResult, projectsResult, eventsResult, faResult, imageResult, profileResult] = await Promise.all([
      playerFavs.length
        ? sb.from('app_player_directory_cache').select('player_key,display_gamertag').limit(4000)
        : Promise.resolve({ data: [], error: null }),
      teamFavs.length
        ? sb.from('ecl27_team_projects').select('id,name').limit(250)
        : Promise.resolve({ data: [], error: null }),
      favs.length
        ? sb.from('ecl27_roster_events').select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team').order('occurred_at', { ascending: false }).limit(200)
        : Promise.resolve({ data: [], error: null }),
      playerFavs.length
        ? sb.from('v_ehockey_free_agents_public').select('id,player_key,display_gamertag,created_at,updated_at,fa_date').limit(500)
        : Promise.resolve({ data: [], error: null }),
      user
        ? sb.from('ehockey_player_image_requests').select('id,status,updated_at,reviewed_at,published_url').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20)
        : Promise.resolve({ data: [], error: null }),
      user
        ? sb.from('ehockey_player_profile_requests').select('id,request_type,status,updated_at,reviewed_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30)
        : Promise.resolve({ data: [], error: null })
    ]);

    const directory = directoryResult.error ? [] : (directoryResult.data || []);
    const projects = projectsResult.error ? [] : (projectsResult.data || []);
    const events = eventsResult.error ? [] : (eventsResult.data || []);
    const freeAgents = faResult.error ? [] : (faResult.data || []);
    const imageRequests = imageResult.error ? [] : (imageResult.data || []);
    const profileRequests = profileResult.error ? [] : (profileResult.data || []);

    const playerFavByKey = new Map();
    for (const fav of playerFavs) {
      const hint = playerRouteHint(fav.url).toLowerCase();
      const title = fav.title.toLowerCase();
      const row = directory.find(player => {
        const key = String(player.player_key || '').toLowerCase();
        const tag = String(player.display_gamertag || '').toLowerCase();
        return Boolean((hint && (key === hint || tag === hint)) || (title && tag === title));
      });
      if (row?.player_key) playerFavByKey.set(String(row.player_key), fav);
    }

    const teamFavById = new Map();
    for (const fav of teamFavs) {
      const title = fav.title.toLowerCase();
      const row = projects.find(project => String(project.name || '').toLowerCase() === title);
      if (row?.id != null) teamFavById.set(Number(row.id), fav);
    }

    const items = [];
    const seen = new Set();

    for (const event of events) {
      const playerFav = playerFavByKey.get(String(event.player_key || ''));
      const teamFav = teamFavById.get(Number(event.team_project_id));
      const fav = playerFav || teamFav;
      if (!fav) continue;
      const key = `roster:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const copy = eventCopy(event);
      items.push({
        key,
        type: String(event.event_type || '').toLowerCase() === 'out' ? 'out' : 'in',
        title: copy.title,
        text: playerFav ? `${copy.text} Du följer ${fav.title}.` : `${copy.text} Favoritlaget ${fav.title}.`,
        at: event.occurred_at,
        url: fav.url
      });
    }

    for (const row of freeAgents) {
      const fav = playerFavByKey.get(String(row.player_key || ''));
      if (!fav) continue;
      const key = `fa:${row.id || row.player_key}:${row.created_at || row.fa_date || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key,
        type: 'fa',
        title: `${row.display_gamertag || fav.title} är Free Agent`,
        text: 'En spelare du följer finns nu på Free Agents-listan.',
        at: row.created_at || row.updated_at || row.fa_date,
        url: fav.url
      });
    }

    for (const row of imageRequests) {
      if (String(row.status || '').toLowerCase() !== 'published') continue;
      items.push({
        key: `image:${row.id}:published`,
        type: 'profile',
        title: 'Din spelarbild är publicerad',
        text: 'Den redigerade bilden har lagts upp på din spelarprofil.',
        at: row.reviewed_at || row.updated_at,
        action: 'account'
      });
    }

    const approvedByDay = new Map();
    for (const row of profileRequests) {
      if (String(row.status || '').toLowerCase() !== 'approved') continue;
      const at = row.reviewed_at || row.updated_at;
      if (!at) continue;
      const day = String(at).slice(0, 10);
      const bucket = approvedByDay.get(day) || [];
      bucket.push({ row, at });
      approvedByDay.set(day, bucket);
    }

    for (const [day, bucket] of approvedByDay.entries()) {
      bucket.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      const count = bucket.length;
      items.push({
        key: count === 1 ? `profile:${bucket[0].row.id}:approved` : `profile-group:${day}:approved`,
        type: 'profile',
        title: count === 1 ? 'Din profiländring är godkänd' : `${count} profiländringar har godkänts`,
        text: count === 1 ? 'Ändringen på din spelarprofil har godkänts.' : 'Flera ändringar på din spelarprofil godkändes samma dag.',
        at: bucket[0].at,
        action: 'account'
      });
    }

    return items
      .filter(item => item.key && item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, MAX_NOTIFICATIONS);
  }

  async function readKeys(sb, user) {
    if (!user) return localReadSet();
    const { data, error } = await sb.from('ehockey_notification_reads').select('event_key').eq('user_id', user.id).limit(1000);
    if (error) return new Set();
    return new Set((data || []).map(row => String(row.event_key || '')));
  }

  function ensureUi() {
    if (!isWebApp()) return false;
    const top = document.getElementById('seh-native-top');
    const actionRow = top?.querySelector('.action-row');
    if (!top || !actionRow) return false;

    if (!document.getElementById('seh-notification-button')) {
      const button = document.createElement('button');
      button.className = 'navbtn seh-notification-button';
      button.id = 'seh-notification-button';
      button.type = 'button';
      button.setAttribute('aria-label', 'Notiser');
      button.innerHTML = `${BELL}<span class="seh-notification-badge" hidden>0</span>`;
      const profile = actionRow.querySelector('#seh-my-profile');
      actionRow.insertBefore(button, profile || null);
      button.addEventListener('click', openPanel);
    }

    if (!document.getElementById('seh-notification-center')) {
      const modal = document.createElement('div');
      modal.id = 'seh-notification-center';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <section class="seh-notification-sheet" role="dialog" aria-modal="true" aria-labelledby="seh-notification-title">
          <header class="seh-notification-head">
            <div><small>PERSONLIGT</small><h2 id="seh-notification-title">Notiser</h2></div>
            <div class="seh-notification-head-actions">
              <button type="button" data-notification-read-all>Markera lästa</button>
              <button type="button" class="seh-notification-close" data-notification-close aria-label="Stäng">×</button>
            </div>
          </header>
          <div class="seh-notification-list"><div class="seh-notification-empty">Laddar notiser…</div></div>
        </section>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', event => {
        if (event.target === modal || event.target.closest('[data-notification-close]')) closePanel();
        const row = event.target.closest('[data-notification-key]');
        if (row) activateItem(row.dataset.notificationKey);
        if (event.target.closest('[data-notification-read-all]')) markAllRead();
      });
    }
    return true;
  }

  function render(readSet) {
    const list = document.querySelector('#seh-notification-center .seh-notification-list');
    if (!list) return;
    const unread = currentItems.filter(item => !readSet.has(item.key));
    const badge = document.querySelector('#seh-notification-button .seh-notification-badge');
    if (badge) {
      badge.textContent = String(Math.min(unread.length, 99));
      badge.hidden = unread.length === 0;
      badge.parentElement?.classList.toggle('has-unread', unread.length > 0);
    }

    if (!currentItems.length) {
      list.innerHTML = '<div class="seh-notification-empty"><strong>Inga notiser ännu</strong><span>Följ spelare eller lag så dyker relevant aktivitet upp här.</span></div>';
      return;
    }

    list.innerHTML = currentItems.map(item => {
      const unreadClass = readSet.has(item.key) ? '' : ' is-unread';
      const icon = item.type === 'fa' ? 'FA' : item.type === 'out' ? 'UT' : item.type === 'profile' ? '✓' : 'IN';
      return `<button type="button" class="seh-notification-row${unreadClass}" data-notification-key="${esc(item.key)}">
        <span class="seh-notification-icon seh-notification-icon--${esc(item.type)}">${esc(icon)}</span>
        <span class="seh-notification-copy"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></span>
        <time>${esc(relativeTime(item.at))}</time>
      </button>`;
    }).join('');
  }

  async function refresh() {
    if (loading || !ensureUi()) return;
    const sb = getClient();
    if (!sb) return;
    loading = true;
    try {
      const { data: sessionData } = await sb.auth.getSession();
      currentUser = sessionData?.session?.user || null;
      const [items, reads] = await Promise.all([
        buildNotifications(sb, currentUser),
        readKeys(sb, currentUser)
      ]);
      currentItems = items;
      render(reads);
    } catch (error) {
      console.warn('[Svensk eHockey] Notiscenter kunde inte laddas', error);
    } finally {
      loading = false;
    }
  }

  async function markRead(key) {
    const sb = getClient();
    if (!key) return;
    if (!currentUser || !sb) {
      const set = localReadSet();
      set.add(key);
      saveLocalRead(set);
      render(set);
      return;
    }
    await sb.from('ehockey_notification_reads').upsert({ user_id: currentUser.id, event_key: key, read_at: new Date().toISOString() }, { onConflict: 'user_id,event_key' });
    render(await readKeys(sb, currentUser));
  }

  async function markAllRead() {
    if (!currentItems.length) return;
    const sb = getClient();
    if (!currentUser || !sb) {
      const set = localReadSet();
      currentItems.forEach(item => set.add(item.key));
      saveLocalRead(set);
      render(set);
      return;
    }
    const rows = currentItems.map(item => ({ user_id: currentUser.id, event_key: item.key, read_at: new Date().toISOString() }));
    await sb.from('ehockey_notification_reads').upsert(rows, { onConflict: 'user_id,event_key' });
    render(await readKeys(sb, currentUser));
  }

  async function activateItem(key) {
    const item = currentItems.find(entry => entry.key === key);
    if (!item) return;
    await markRead(key);
    closePanel();
    if (item.action === 'account') {
      document.getElementById('seh-my-profile')?.click();
      return;
    }
    if (item.url) {
      try {
        const target = new URL(item.url, location.origin);
        if (target.origin === location.origin) location.href = `${target.pathname}${target.search}${target.hash}`;
        else location.href = item.url;
      } catch (_) {
        location.href = item.url;
      }
    }
  }

  function openPanel() {
    const modal = document.getElementById('seh-notification-center');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    refresh();
  }

  function closePanel() {
    const modal = document.getElementById('seh-notification-center');
    modal?.classList.remove('show');
    modal?.setAttribute('aria-hidden', 'true');
  }

  function schedule(delay = 150) {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, delay);
  }

  const observer = new MutationObserver(() => {
    if (ensureUi()) schedule(250);
  });

  function start() {
    if (!isWebApp()) return;
    ensureUi();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    schedule(500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.addEventListener('focus', () => schedule(300));
  window.addEventListener('storage', event => { if (event.key === FAVORITES_KEY) schedule(100); });
})();
