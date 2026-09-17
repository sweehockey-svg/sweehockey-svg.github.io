(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  const PLAYER_FALLBACK = '/web-images/players/1DEFAULTBILDID.png.webp';
  const COMPETITION_KEY = 'ecl27winter';
  const DEFAULT_ROUTE = '#/sasong/ecl27winter';
  const MIN_REFRESH_MS = 12000;

  let client = null;
  let renderToken = 0;
  let loadPromise = null;
  let lastLoadedAt = 0;
  let lastData = null;

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

  function asRow(value) {
    return Array.isArray(value) ? (value[0] || {}) : (value || {});
  }

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

  function home() {
    return document.querySelector('#seh-app-home .seh-app-page');
  }

  function skeletonHtml() {
    return `
      <div class="seh-for-you__head">
        <div><small>PERSONLIGT</small><h2>För dig</h2></div>
        <span class="seh-for-you__live">LIVE</span>
      </div>
      <div class="seh-for-you__loading">
        <i></i><i></i><i></i>
      </div>`;
  }

  function ensureRoot() {
    if (!isWebApp()) return null;
    const page = home();
    if (!page) return null;

    let root = page.querySelector(`#${ROOT_ID}`);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ID;
      root.className = 'seh-for-you';
      root.setAttribute('aria-label', 'För dig');
      root.innerHTML = skeletonHtml();
      const grid = page.querySelector('.seh-card-grid');
      if (grid) grid.insertAdjacentElement('beforebegin', root);
      else page.appendChild(root);
    }

    bind(root);

    if (lastData && root.dataset.ready !== '1') {
      renderPersonal(root, lastData);
    }

    return root;
  }

  function showInitialSkeleton(root) {
    if (!root || root.dataset.ready === '1') return;
    if (!root.querySelector('.seh-for-you__loading')) root.innerHTML = skeletonHtml();
  }

  function loggedOut(root) {
    lastData = null;
    root.dataset.ready = '1';
    root.innerHTML = `
      <div class="seh-for-you__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>
      <div class="seh-for-you__welcome">
        <div class="seh-for-you__welcome-icon">◎</div>
        <div><strong>Gör webbappen personlig</strong><span>Logga in med Discord för att få din spelarprofil, dina favoriter och det senaste direkt på Hem.</span></div>
        <button type="button" data-fy-action="profile">Logga in</button>
      </div>`;
  }

  function pending(root, account) {
    lastData = null;
    const status = String(account?.status || 'unlinked');
    const title = status === 'pending' ? 'Spelarkopplingen väntar' : 'Koppla din spelarprofil';
    const text = status === 'pending'
      ? 'När kopplingen har godkänts visas ditt personliga flöde här automatiskt.'
      : 'Koppla ditt befintliga spelarkort så kan För dig följa din profil, dina favoriter och aktuella tävlingar.';
    root.dataset.ready = '1';
    root.innerHTML = `
      <div class="seh-for-you__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>
      <div class="seh-for-you__welcome">
        <div class="seh-for-you__welcome-icon">◎</div>
        <div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>
        <button type="button" data-fy-action="profile">Min profil</button>
      </div>`;
  }

  function fmtDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
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
    return fmtDate(value);
  }

  function phaseMeta(value) {
    const phase = ['building', 'regular', 'playoffs', 'finished', 'offseason'].includes(String(value || ''))
      ? String(value)
      : 'building';

    return {
      building: {
        phase,
        feedTitle: 'Senaste för dig', feedLink: 'Alla lagbyggen →', feedAction: 'builds', shortcutLabel: 'Lagbygge', shortcutAction: 'builds',
        emptyTeam: 'Nya IN/UT och rekryteringsposter i ECL-lagbygget visas här.', emptyNoTeam: 'Personliga laghändelser visas här när vi har en säker koppling till en aktuell tävling.'
      },
      regular: {
        phase,
        feedTitle: 'Senaste för dig', feedLink: 'Öppna ECL 27 →', feedAction: 'competition', shortcutLabel: 'ECL 27', shortcutAction: 'competition',
        emptyTeam: 'Matcher, resultat och laghändelser visas här när datan finns.', emptyNoTeam: 'Öppna tävlingarna för matcher, tabell och statistik.'
      },
      playoffs: {
        phase,
        feedTitle: 'Slutspel för dig', feedLink: 'Öppna slutspelet →', feedAction: 'competition', shortcutLabel: 'Slutspel', shortcutAction: 'competition',
        emptyTeam: 'Slutspelsmatcher och serieresultat visas här när datan finns.', emptyNoTeam: 'Öppna tävlingarna för aktuellt slutspel.'
      },
      finished: {
        phase,
        feedTitle: 'Säsongen i korthet', feedLink: 'Öppna ECL 27 →', feedAction: 'competition', shortcutLabel: 'ECL 27', shortcutAction: 'competition',
        emptyTeam: 'Säsongsresultat och slutstatistik visas här.', emptyNoTeam: 'Öppna tävlingarna och se slutresultaten.'
      },
      offseason: {
        phase,
        feedTitle: 'För dig just nu', feedLink: 'Tävlingar →', feedAction: 'competitions', shortcutLabel: 'Tävlingar', shortcutAction: 'competitions',
        emptyTeam: 'När nästa tävling blir aktuell anpassas den här ytan automatiskt.', emptyNoTeam: 'När nästa tävling blir aktuell anpassas den här ytan automatiskt.'
      }
    }[phase];
  }

  function currentCompetitionFocus(competitionState) {
    const now = new Date();
    const sclStart = new Date('2026-10-01T00:00:00+02:00');
    const sclEnd = new Date('2026-11-16T00:00:00+01:00');
    if (now < sclEnd) {
      const beforeStart = now < sclStart;
      return {
        kicker: 'AKTUELLT',
        title: 'SCL 27',
        text: beforeStart ? 'Start 1 oktober · närmast på tur' : 'Pågår · följ tävlingen',
        action: 'competitions',
        route: '#/ecl'
      };
    }
    return {
      kicker: 'AKTUELL TÄVLING',
      title: String(competitionState?.display_name || 'Tävlingar'),
      text: 'Öppna aktuell tävling',
      action: 'competition',
      route: String(competitionState?.route_hash || DEFAULT_ROUTE)
    };
  }

  function eventText(event, teamName) {
    const tag = String(event?.gamertag || '').trim() || 'Spelare';
    const type = String(event?.event_type || '').toLowerCase();
    if (type === 'in') return { marker: '+', tone: 'in', title: `${tag} in`, text: `Ny spelare till ${teamName}.` };
    if (type === 'out') return { marker: '−', tone: 'out', title: `${tag} ut`, text: `Har lämnat ${teamName}.` };
    if (type === 'free_agent') return { marker: 'FA', tone: 'fa', title: `${tag} Free Agent`, text: 'Spelaren är tillgänglig.' };
    return { marker: '•', tone: '', title: tag, text: 'Ny laghändelse.' };
  }

  function playerImage(player) {
    const sportsGamer = String(player?.sports_gamer_player_url || '').trim();
    const sportsGamerId = sportsGamer.match(/\/players\/(\d+)(?:\/|$|[?#])/i)?.[1] || '';
    const raw = String(player?.player_image || player?.photo || '').trim();
    try {
      if (typeof window.SEH_playerImageUrl === 'function') {
        return window.SEH_playerImageUrl(raw, sportsGamerId) || PLAYER_FALLBACK;
      }
    } catch (_) {}
    if (sportsGamerId && Array.isArray(window.SEH_PLAYER_IMAGE_FILES) && window.SEH_PLAYER_IMAGE_FILES.includes(`${sportsGamerId}.png`)) {
      return `/web-images/players/${encodeURIComponent(sportsGamerId)}.png.webp`;
    }
    return raw || PLAYER_FALLBACK;
  }

  function renderPersonal(root, data) {
    lastData = data;
    const { account, player, project, events, recruitment, competitionState } = data;
    const meta = phaseMeta(competitionState?.phase);
    const focus = currentCompetitionFocus(competitionState);
    const routeHash = String(competitionState?.route_hash || DEFAULT_ROUTE);
    const playerName = String(player?.display_gamertag || account?.playerName || account?.playerKey || 'Din profil').trim();
    const teamName = String(project?.name || '').trim();
    const division = String(project?.division || '').trim();
    const historicalTeam = canonicalTeam(player?.latest_team || player?.latest_ecl_team);
    const profileMeta = teamName
      ? `${teamName} · ECL 27-lagbygge`
      : (historicalTeam ? `Senaste lag: ${historicalTeam}` : 'Kopplad spelare');
    const sourceTeamId = Number(project?.source_team_id) || 0;

    const feed = [];
    if (meta.phase === 'building' && teamName && recruitment?.text) {
      feed.push({ marker: '!', tone: 'recruit', title: `${teamName} söker spelare`, text: String(recruitment.text).trim(), time: relativeTime(recruitment.posted_at) });
    }
    for (const event of events || []) {
      if (feed.length >= 3) break;
      const item = eventText(event, teamName || canonicalTeam(event?.to_team || event?.from_team || 'laget'));
      feed.push({ ...item, time: relativeTime(event?.occurred_at) });
    }
    if (!feed.length) {
      feed.push({ marker: '✓', tone: '', title: teamName ? `${teamName} i ECL 27-lagbygget` : 'Din profil är kopplad', text: teamName ? meta.emptyTeam : meta.emptyNoTeam, time: '' });
    }

    const feedHtml = feed.map(item => `
      <article class="seh-for-you__feed-row" data-tone="${esc(item.tone)}">
        <b>${esc(item.marker)}</b><div><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div><time>${esc(item.time)}</time>
      </article>`).join('');

    const teamCard = teamName
      ? `<button type="button" class="seh-for-you__mini" data-fy-action="team" data-team-id="${sourceTeamId}" data-route="${esc(routeHash)}"><small>ECL 27 · LAGBYGGE</small><strong>${esc(teamName)}</strong><span>${esc(division || 'Aktuell lagbyggedata')}</span></button>`
      : `<button type="button" class="seh-for-you__mini" data-fy-action="competitions"><small>DINA TÄVLINGAR</small><strong>SCL 27 närmast</strong><span>Vi visar bara lag när kopplingen är säker</span></button>`;

    root.dataset.ready = '1';
    root.innerHTML = `
      <div class="seh-for-you__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div><span class="seh-for-you__live">LIVE</span></div>
      <div class="seh-for-you__identity">
        <img src="${esc(playerImage(player))}" alt="${esc(playerName)}">
        <div><small>DIN SPELARE</small><strong>${esc(playerName)}</strong><span>${esc(profileMeta)}</span></div>
        <button type="button" data-fy-action="profile">Min profil</button>
      </div>
      <div class="seh-for-you__mini-grid">
        ${teamCard}
        <button type="button" class="seh-for-you__mini" data-fy-action="${esc(focus.action)}" data-route="${esc(focus.route)}"><small>${esc(focus.kicker)}</small><strong>${esc(focus.title)}</strong><span>${esc(focus.text)}</span></button>
      </div>
      <div class="seh-for-you__feed-head"><strong>${esc(meta.feedTitle)}</strong><button type="button" data-fy-action="${esc(meta.feedAction)}" data-route="${esc(routeHash)}">${esc(meta.feedLink)}</button></div>
      <div class="seh-for-you__feed">${feedHtml}</div>
      <div class="seh-for-you__shortcuts">
        <button type="button" data-fy-action="profile">Min profil</button>
        <button type="button" data-fy-action="team" data-team-id="${sourceTeamId}" data-route="${esc(routeHash)}" ${teamName ? '' : 'disabled'}>Mitt ECL-lag</button>
        <button type="button" data-fy-action="${esc(meta.shortcutAction)}" data-route="${esc(routeHash)}">${esc(meta.shortcutLabel)}</button>
        <button type="button" data-fy-action="favorites">Favoriter</button>
      </div>`;
  }

  async function load(force = false) {
    if (!isWebApp()) return;
    const root = ensureRoot();
    if (!root) return;

    if (!force && root.dataset.ready === '1' && Date.now() - lastLoadedAt < MIN_REFRESH_MS) return;
    if (loadPromise) return loadPromise;

    const token = ++renderToken;
    showInitialSkeleton(root);

    loadPromise = (async () => {
      try {
        const sb = getClient();
        if (!sb) throw new Error('Supabase saknas');

        const sessionResult = await sb.auth.getSession();
        if (token !== renderToken) return;
        const session = sessionResult.data?.session || null;
        if (!session?.user) {
          loggedOut(root);
          lastLoadedAt = Date.now();
          return;
        }

        const accountResult = await sb.rpc('seh_get_my_player_account');
        if (accountResult.error) throw accountResult.error;
        const rawAccount = asRow(accountResult.data);
        const account = {
          status: String(rawAccount.status || 'unlinked'),
          playerKey: String(rawAccount.player_key || '').trim(),
          playerName: String(rawAccount.player_name || '').trim()
        };
        if (account.status !== 'approved' || !account.playerKey) {
          pending(root, account);
          lastLoadedAt = Date.now();
          return;
        }

        const defaultCompetitionState = { competition_key: COMPETITION_KEY, display_name: 'ECL 27 Winter', phase: 'building', route_hash: DEFAULT_ROUTE };

        const [phaseResult, dashboardResult, directoryResult, playerEventsResult] = await Promise.all([
          sb.from('seh_app_competition_states').select('competition_key,display_name,phase,route_hash,updated_at').eq('competition_key', COMPETITION_KEY).limit(1),
          sb.rpc('seh_get_my_player_dashboard'),
          sb.from('app_player_directory_cache').select('player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_team,latest_season').eq('player_key', account.playerKey).limit(1),
          sb.from('ecl27_roster_events').select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team').eq('player_key', account.playerKey).order('occurred_at', { ascending: false }).limit(20)
        ]);

        if (playerEventsResult.error) throw playerEventsResult.error;
        const competitionState = !phaseResult.error && phaseResult.data?.[0] ? phaseResult.data[0] : defaultCompetitionState;
        const dashboardPlayer = dashboardResult.error ? {} : (asRow(dashboardResult.data)?.player || {});
        const directoryPlayer = directoryResult.error ? {} : (directoryResult.data?.[0] || {});
        const player = { ...directoryPlayer, ...dashboardPlayer };
        const playerEvents = playerEventsResult.data || [];
        const latestPlayerEvent = playerEvents[0] || null;
        const currentProjectId = String(latestPlayerEvent?.event_type || '').toLowerCase() === 'in' ? Number(latestPlayerEvent?.team_project_id) || 0 : 0;
        const building = String(competitionState.phase || '') === 'building';

        const projectQuery = currentProjectId
          ? sb.from('ecl27_team_projects').select('id,name,division,source_team_id,logo_name,status').eq('id', currentProjectId).limit(1)
          : Promise.resolve({ data: [], error: null });
        const eventsQuery = currentProjectId
          ? sb.from('ecl27_roster_events').select('id,occurred_at,event_type,player_key,gamertag,from_team,to_team').eq('team_project_id', currentProjectId).order('occurred_at', { ascending: false }).limit(4)
          : Promise.resolve({ data: [], error: null });
        const recruitmentQuery = currentProjectId && building
          ? sb.from('ecl27_recruitment_posts').select('id,posted_at,text,is_active').eq('team_project_id', currentProjectId).eq('is_active', true).order('posted_at', { ascending: false }).limit(1)
          : Promise.resolve({ data: [], error: null });

        const [projectResult, eventsResult, recruitmentResult] = await Promise.all([projectQuery, eventsQuery, recruitmentQuery]);
        if (token !== renderToken) return;

        const data = {
          account,
          player,
          competitionState,
          project: projectResult.error ? null : (projectResult.data?.[0] || null),
          events: eventsResult.error ? [] : (eventsResult.data || []),
          recruitment: recruitmentResult.error ? null : (recruitmentResult.data?.[0] || null)
        };

        renderPersonal(root, data);
        lastLoadedAt = Date.now();
      } catch (error) {
        console.warn('[Svensk eHockey] För dig kunde inte laddas', error);
        if (token !== renderToken) return;
        if (lastData) {
          renderPersonal(root, lastData);
          return;
        }
        root.dataset.ready = '1';
        root.innerHTML = `<div class="seh-for-you__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div><div class="seh-for-you__error"><strong>Kunde inte ladda det personliga flödet.</strong><button type="button" data-fy-action="retry">Försök igen</button></div>`;
      } finally {
        loadPromise = null;
      }
    })();

    return loadPromise;
  }

  function bind(root) {
    if (!root || root.dataset.bound === '2') return;
    root.dataset.bound = '2';
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-fy-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.fyAction;
      if (action === 'retry') return load(true);
      if (action === 'profile') return document.querySelector('#seh-home-profile')?.click();
      if (action === 'favorites') return document.querySelector('#seh-home-favs')?.click();
      if (action === 'fa') return document.querySelector('#seh-home-fa')?.click();
      if (action === 'builds') { location.hash = DEFAULT_ROUTE; return; }
      if (action === 'competition') {
        const route = String(button.dataset.route || DEFAULT_ROUTE);
        location.hash = route.startsWith('#') ? route : DEFAULT_ROUTE;
        return;
      }
      if (action === 'competitions') { location.hash = '#/ecl'; return; }
      if (action === 'team') {
        const teamId = Number(button.dataset.teamId) || 0;
        const route = String(button.dataset.route || DEFAULT_ROUTE);
        location.hash = teamId ? `#/lag/${teamId}` : (route.startsWith('#') ? route : DEFAULT_ROUTE);
      }
    });
  }

  function mount() {
    const root = ensureRoot();
    if (root) load();
  }

  const observer = new MutationObserver(() => {
    if (!isWebApp()) return;
    const root = document.getElementById(ROOT_ID);
    if (!root && home()) mount();
    else if (root) bind(root);
  });

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    mount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.addEventListener('hashchange', () => {
    if (location.hash === '#/' || location.hash === '') window.setTimeout(() => load(), 60);
  });

  window.addEventListener('focus', () => {
    if (document.getElementById('seh-app-home')?.classList.contains('show')) load();
  });

  window.addEventListener('seh-team-aliases-ready', () => load(true));
  window.SEH_REFRESH_FOR_YOU = () => load(true);
})();