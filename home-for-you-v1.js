(() => {
  'use strict';

  const ROOT_ID = 'seh-desktop-for-you';
  const COMPETITION_KEY = 'ecl27winter';
  const BUILDS_ROUTE = '#/sasong/ecl27winter';
  const PLAYER_FALLBACK = 'players/1DEFAULTBILDID.png';
  const originalMarkup = new WeakMap();

  let client = null;
  let authBound = false;
  let observer = null;
  let refreshTimer = 0;
  let resizeTimer = 0;
  let renderToken = 0;

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function config() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (client) return client;
    const cfg = config();
    const url = String(cfg.supabaseUrl || cfg.SUPABASE_URL || '').trim();
    const key = String(
      cfg.supabasePublishableKey ||
      cfg.supabaseAnonKey ||
      cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function isDesktopWebsite() {
    return !window.__SEH_WEB_APP__ &&
      !document.documentElement.classList.contains('seh-web-app') &&
      window.matchMedia?.('(min-width: 1101px)')?.matches === true;
  }

  function homeIdentity() {
    return document.querySelector('#spaRouteView[data-route="home"] .home-stage__identity');
  }

  function rememberOriginal(host) {
    if (!host || originalMarkup.has(host)) return;
    originalMarkup.set(host, host.innerHTML);
  }

  function restore(host) {
    if (!host) return;
    const original = originalMarkup.get(host);
    host.classList.remove('home-stage__identity--for-you');
    host.removeAttribute('data-seh-personal');
    if (typeof original === 'string' && host.querySelector('#' + ROOT_ID)) {
      host.innerHTML = original;
    }
  }

  function showSkeleton(host) {
    rememberOriginal(host);
    host.classList.add('home-stage__identity--for-you');
    host.setAttribute('data-seh-personal', 'loading');
    host.innerHTML =
      '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
        '<div class="seh-dfy__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div><span>LIVE</span></div>' +
        '<div class="seh-dfy__loading"><i></i><i></i><i></i></div>' +
      '</section>';
  }

  function renderPending(host, account) {
    const status = String(account?.status || 'unlinked');
    const title = status === 'pending' ? 'Spelarkopplingen väntar' : 'Koppla din spelarprofil';
    const text = status === 'pending'
      ? 'När kopplingen godkänts visas din personliga översikt här automatiskt.'
      : 'Koppla ditt Discord-konto till ditt befintliga spelarkort för att aktivera För dig.';
    host.classList.add('home-stage__identity--for-you');
    host.setAttribute('data-seh-personal', 'pending');
    host.innerHTML =
      '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
        '<div class="seh-dfy__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>' +
        '<div class="seh-dfy__pending">' +
          '<div class="seh-dfy__pending-icon">◎</div>' +
          '<div><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div>' +
          '<a href="#/min-profil">Min profil</a>' +
        '</div>' +
      '</section>';
  }

  function playerImage(player) {
    const sportsGamer = String(player?.sports_gamer_player_url || '').trim();
    const id = sportsGamer.match(/\/players\/(\d+)/i)?.[1];
    if (id && typeof window.SEH_playerImageUrl === 'function') {
      try { return window.SEH_playerImageUrl(id, player?.player_image || ''); } catch (_) {}
    }
    if (id) return 'players/' + id + '.png';
    return String(player?.player_image || player?.photo || '').trim() || PLAYER_FALLBACK;
  }

  function playerHref(playerKey, playerName) {
    if (typeof window.SEH_playerProfileUrl === 'function') {
      try { return window.SEH_playerProfileUrl(playerKey, playerName); } catch (_) {}
    }
    return '#/spelare/' + encodeURIComponent(playerName || playerKey || '');
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const diff = Math.max(0, Date.now() - date.getTime());
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Nyss';
    if (hours < 24) return hours + ' h';
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Igår';
    if (days < 7) return days + ' d';
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function eventCopy(event, teamName) {
    const tag = String(event?.gamertag || '').trim() || 'Spelare';
    const type = String(event?.event_type || '').toLowerCase();
    if (type === 'in') return { marker: '+', tone: 'in', title: tag + ' in', text: 'Ny spelare till ' + teamName + '.' };
    if (type === 'out') return { marker: '−', tone: 'out', title: tag + ' ut', text: 'Har lämnat ' + teamName + '.' };
    if (type === 'free_agent') return { marker: 'FA', tone: 'fa', title: tag + ' Free Agent', text: 'Spelaren är tillgänglig.' };
    return { marker: '•', tone: '', title: tag, text: 'Ny laghändelse.' };
  }

  function favoriteCount() {
    try {
      const rows = JSON.parse(localStorage.getItem('seh_app_favorites_v1') || '[]');
      return Array.isArray(rows) ? rows.filter((row) => row && (row.type === 'player' || row.type === 'team')).length : 0;
    } catch (_) {
      return 0;
    }
  }

  function renderPersonal(host, data) {
    const account = data.account || {};
    const player = data.player || {};
    const project = data.project || null;
    const phase = String(data.competitionState?.phase || 'building');
    const playerName = String(player.display_gamertag || account.playerName || account.playerKey || 'Din profil').trim();
    const teamName = String(project?.name || '').trim();
    const division = String(project?.division || '').trim();
    const latestTeam = String(player.latest_team || player.latest_ecl_team || '').trim();
    const sourceTeamId = Number(project?.source_team_id) || 0;
    const currentTeamText = teamName || latestTeam || 'Inte i aktuellt lagbygge';
    const currentTeamMeta = teamName
      ? [division, phase === 'building' ? 'ECL 27 lagbygge' : 'Aktuellt lag'].filter(Boolean).join(' · ')
      : (latestTeam ? 'Senaste registrerade lag' : 'ECL 27 lagbygge');
    const faCount = Number(data.activeFaCount || 0);
    const profileUrl = playerHref(account.playerKey, playerName);
    const favCount = favoriteCount();

    const feed = [];
    if (phase === 'building' && data.recruitment?.text && teamName) {
      feed.push({
        marker: '!',
        tone: 'recruit',
        title: teamName + ' söker spelare',
        text: String(data.recruitment.text).trim(),
        time: relativeTime(data.recruitment.posted_at)
      });
    }
    for (const event of data.events || []) {
      if (feed.length >= 2) break;
      const copy = eventCopy(event, teamName || String(event?.to_team || event?.from_team || 'ditt lag'));
      feed.push({ ...copy, time: relativeTime(event?.occurred_at) });
    }
    if (!feed.length) {
      feed.push({
        marker: '✓',
        tone: '',
        title: teamName ? teamName + ' är kopplat' : 'Din profil är kopplad',
        text: teamName ? 'Nya IN/UT och rekryteringsposter visas här.' : 'När du går med i ett aktuellt lag visas lagflödet här.',
        time: ''
      });
    }

    const feedHtml = feed.slice(0, 2).map((item) =>
      '<article class="seh-dfy__feed-row" data-tone="' + esc(item.tone) + '">' +
        '<b>' + esc(item.marker) + '</b>' +
        '<div><strong>' + esc(item.title) + '</strong><span>' + esc(item.text) + '</span></div>' +
        '<time>' + esc(item.time) + '</time>' +
      '</article>'
    ).join('');

    const teamHref = sourceTeamId ? '#/lag/' + sourceTeamId : BUILDS_ROUTE;
    const teamActionLabel = sourceTeamId ? 'Öppna lag' : 'Lagbygge';

    host.classList.add('home-stage__identity--for-you');
    host.setAttribute('data-seh-personal', 'ready');
    host.innerHTML =
      '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
        '<div class="seh-dfy__head">' +
          '<div><small>PERSONLIGT</small><h2>För dig</h2></div>' +
          '<span>LIVE</span>' +
        '</div>' +
        '<div class="seh-dfy__identity">' +
          '<a class="seh-dfy__avatar" href="' + esc(profileUrl) + '" aria-label="Öppna ' + esc(playerName) + '">' +
            '<img src="' + esc(playerImage(player)) + '" alt="' + esc(playerName) + '">' +
          '</a>' +
          '<div><small>DIN SPELARE</small><strong>' + esc(playerName) + '</strong><span>' + esc(currentTeamText) + '</span></div>' +
          '<a class="seh-dfy__profile-link" href="#/min-profil">Min profil</a>' +
        '</div>' +
        '<div class="seh-dfy__mini-grid">' +
          '<a class="seh-dfy__mini" href="' + esc(teamHref) + '">' +
            '<small>DITT LAG</small><strong>' + esc(currentTeamText) + '</strong><span>' + esc(currentTeamMeta) + '</span>' +
          '</a>' +
          '<a class="seh-dfy__mini" href="#/free-agents">' +
            '<small>FREE AGENTS</small><strong>' + faCount + ' aktiva</strong><span>Se spelare som söker lag</span>' +
          '</a>' +
        '</div>' +
        '<div class="seh-dfy__feed-head"><strong>Senaste för dig</strong><a href="' + esc(BUILDS_ROUTE) + '">Alla lagbyggen →</a></div>' +
        '<div class="seh-dfy__feed">' + feedHtml + '</div>' +
        '<div class="seh-dfy__shortcuts">' +
          '<a href="' + esc(profileUrl) + '">Spelarkort</a>' +
          '<a href="' + esc(teamHref) + '">' + esc(teamActionLabel) + '</a>' +
          '<a href="#/free-agents">Free Agents</a>' +
          '<a href="#/min-profil">Mitt eHockey' + (favCount ? ' · ' + favCount + ' fav' : '') + '</a>' +
        '</div>' +
      '</section>';
  }

  async function loadForHost(host) {
    const token = ++renderToken;
    const sb = getClient();
    if (!sb || !host) return;

    try {
      const sessionResult = await sb.auth.getSession();
      if (token !== renderToken) return;
      const session = sessionResult.data?.session || null;

      if (!session?.user) {
        restore(host);
        return;
      }

      showSkeleton(host);

      const accountResult = await sb.rpc('seh_get_my_player_account');
      if (token !== renderToken) return;
      if (accountResult.error) throw accountResult.error;

      const rawAccount = Array.isArray(accountResult.data) ? (accountResult.data[0] || {}) : (accountResult.data || {});
      const account = {
        status: String(rawAccount.status || 'unlinked'),
        playerKey: String(rawAccount.player_key || '').trim(),
        playerName: String(rawAccount.player_name || '').trim()
      };

      if (account.status !== 'approved' || !account.playerKey) {
        renderPending(host, account);
        return;
      }

      const [phaseResult, dashboardResult, directoryResult, playerEventsResult, faResult] = await Promise.all([
        sb.from('seh_app_competition_states')
          .select('competition_key,display_name,phase,route_hash')
          .eq('competition_key', COMPETITION_KEY)
          .limit(1),
        sb.rpc('seh_get_my_player_dashboard'),
        sb.from('app_player_directory_cache')
          .select('player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_team,latest_season')
          .eq('player_key', account.playerKey)
          .limit(1),
        sb.from('ecl27_roster_events')
          .select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team')
          .eq('player_key', account.playerKey)
          .order('occurred_at', { ascending: false })
          .limit(20),
        sb.from('v_ehockey_free_agents_public')
          .select('player_key', { count: 'exact', head: true })
      ]);

      if (token !== renderToken) return;
      if (playerEventsResult.error) throw playerEventsResult.error;

      const dashboardRow = Array.isArray(dashboardResult.data) ? (dashboardResult.data[0] || {}) : (dashboardResult.data || {});
      const dashboardPlayer = dashboardResult.error ? {} : (dashboardRow.player || {});
      const directoryPlayer = directoryResult.error ? {} : (directoryResult.data?.[0] || {});
      const player = { ...directoryPlayer, ...dashboardPlayer };
      const competitionState = !phaseResult.error && phaseResult.data?.[0]
        ? phaseResult.data[0]
        : { competition_key: COMPETITION_KEY, display_name: 'ECL 27 Winter', phase: 'building', route_hash: BUILDS_ROUTE };

      const playerEvents = playerEventsResult.data || [];
      const latestPlayerEvent = playerEvents[0] || null;
      const currentProjectId = String(latestPlayerEvent?.event_type || '').toLowerCase() === 'in'
        ? Number(latestPlayerEvent?.team_project_id) || 0
        : 0;
      const building = String(competitionState.phase || '') === 'building';

      const [projectResult, eventsResult, recruitmentResult] = await Promise.all([
        currentProjectId
          ? sb.from('ecl27_team_projects')
              .select('id,name,division,source_team_id,logo_name,status')
              .eq('id', currentProjectId)
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
        currentProjectId
          ? sb.from('ecl27_roster_events')
              .select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team')
              .eq('team_project_id', currentProjectId)
              .order('occurred_at', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [], error: null }),
        currentProjectId && building
          ? sb.from('ecl27_recruitment_posts')
              .select('id,team_project_id,posted_at,text,is_active')
              .eq('team_project_id', currentProjectId)
              .eq('is_active', true)
              .order('posted_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (token !== renderToken) return;

      renderPersonal(host, {
        account,
        player,
        competitionState,
        project: projectResult.error ? null : (projectResult.data?.[0] || null),
        events: eventsResult.error ? [] : (eventsResult.data || []),
        recruitment: recruitmentResult.error ? null : (recruitmentResult.data?.[0] || null),
        activeFaCount: faResult.error ? 0 : Number(faResult.count || 0)
      });
    } catch (error) {
      console.warn('[Svensk eHockey] Desktop För dig kunde inte laddas', error);
      if (token !== renderToken) return;
      if (!host.querySelector('#' + ROOT_ID)) return;
      host.setAttribute('data-seh-personal', 'error');
      host.innerHTML =
        '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
          '<div class="seh-dfy__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>' +
          '<div class="seh-dfy__error"><strong>Kunde inte ladda För dig.</strong><button type="button" data-seh-dfy-retry>Försök igen</button></div>' +
        '</section>';
    }
  }

  function refresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      const host = homeIdentity();
      if (!host) return;
      rememberOriginal(host);
      if (!isDesktopWebsite()) {
        restore(host);
        return;
      }
      loadForHost(host);
    }, 40);
  }

  function bindAuth() {
    if (authBound) return;
    const sb = getClient();
    if (!sb) return;
    authBound = true;
    sb.auth.onAuthStateChange(() => {
      window.setTimeout(refresh, 0);
    });
  }

  function start() {
    bindAuth();
    observer = new MutationObserver(() => {
      if (homeIdentity()) refresh();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
      if (!event.target.closest?.('[data-seh-dfy-retry]')) return;
      event.preventDefault();
      refresh();
    });

    window.addEventListener('hashchange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 120);
    });

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();