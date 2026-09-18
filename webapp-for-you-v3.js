(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  const PLAYER_FALLBACK = '/players/1DEFAULTBILDID.png';
  const FAVORITES_KEY = 'seh_app_favorites_v1';
  const COMPETITION_KEY = 'ecl27winter';
  const DEFAULT_ROUTE = '#/sasong/ecl27winter';
  const MIN_REFRESH_MS = 12000;

  let client = null;
  let renderToken = 0;
  let loadPromise = null;
  let lastLoadedAt = 0;
  let lastData = null;
  let homeWasVisible = false;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const cfg = () => window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};

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

  const asRow = value => Array.isArray(value) ? (value[0] || {}) : (value || {});

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

  const home = () => document.querySelector('#seh-app-home .seh-app-page');
  const homeVisible = () => document.getElementById('seh-app-home')?.classList.contains('show') === true;

  function skeletonHtml() {
    return `
      <div class="seh-for-you__head">
        <div><small>PERSONLIGT</small><h2>För dig</h2></div>
        <span class="seh-for-you__live">LIVE</span>
      </div>
      <div class="seh-for-you__loading"><i></i><i></i><i></i></div>`;
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
    if (lastData && root.dataset.ready !== '1') renderPersonal(root, lastData);
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
        <div><strong>Gör webbappen personlig</strong><span>Logga in med Discord för att få din spelarprofil, ditt lag och det senaste direkt på Hem.</span></div>
        <button type="button" data-fy-action="profile">Logga in</button>
      </div>`;
  }

  function pending(root, account) {
    lastData = null;
    const status = String(account?.status || 'unlinked');
    const title = status === 'pending' ? 'Spelarkopplingen väntar' : 'Koppla din spelarprofil';
    const text = status === 'pending'
      ? 'När kopplingen har godkänts visas ditt personliga flöde här automatiskt.'
      : 'Koppla ditt befintliga spelarkort så kan För dig följa din profil och ditt lag.';
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
    const phase = ['building', 'regular', 'playoffs', 'finished', 'offseason'].includes(String(value || '')) ? String(value) : 'building';
    return {
      building: {
        phase,
        teamKicker: 'AKTUELLT LAG', missingTitle: 'Free Agent', missingText: 'Inte i ett aktivt lagbygge', missingAction: 'fa', teamSubtitle: 'Aktuellt lagbygge',
        secondKicker: 'FREE AGENTS', secondTitle: '', secondText: 'Se spelare som söker lag', secondAction: 'fa',
        feedTitle: 'Senaste för dig', feedLink: 'Alla lagbyggen →', feedAction: 'builds', shortcutLabel: 'Lagbygge', shortcutAction: 'builds',
        emptyTeam: 'Nya IN/UT och rekryteringsposter visas här automatiskt.', emptyNoTeam: 'När du går med i ett aktuellt ECL 27-lag visas lagflödet här.'
      },
      regular: {
        phase,
        teamKicker: 'AKTUELLT LAG', missingTitle: 'Free Agent', missingText: 'Inte i ett pågående lag', missingAction: 'fa', teamSubtitle: 'Grundserie',
        secondKicker: 'ECL 27', secondTitle: 'Grundserie', secondText: 'Matcher, tabell och statistik', secondAction: 'competition',
        feedTitle: 'Senaste för dig', feedLink: 'Öppna ECL 27 →', feedAction: 'competition', shortcutLabel: 'ECL 27', shortcutAction: 'competition',
        emptyTeam: 'Matcher, resultat och laghändelser visas här när datan finns.', emptyNoTeam: 'Öppna ECL 27 för matcher, tabell och statistik.'
      },
      playoffs: {
        phase,
        teamKicker: 'AKTUELLT LAG', missingTitle: 'Free Agent', missingText: 'Inte i ett pågående lag', missingAction: 'fa', teamSubtitle: 'Slutspel',
        secondKicker: 'ECL 27', secondTitle: 'Slutspel', secondText: 'Serier, matcher och resultat', secondAction: 'competition',
        feedTitle: 'Slutspel för dig', feedLink: 'Öppna slutspelet →', feedAction: 'competition', shortcutLabel: 'Slutspel', shortcutAction: 'competition',
        emptyTeam: 'Slutspelsmatcher och serieresultat visas här när datan finns.', emptyNoTeam: 'Öppna ECL 27-slutspelet.'
      },
      finished: {
        phase,
        teamKicker: 'STATUS', missingTitle: 'Free Agent', missingText: 'Ingen aktiv lagkoppling', missingAction: 'fa', teamSubtitle: 'Slutresultat',
        secondKicker: 'ECL 27', secondTitle: 'Säsongen avslutad', secondText: 'Resultat och slutstatistik', secondAction: 'competition',
        feedTitle: 'Säsongen i korthet', feedLink: 'Öppna ECL 27 →', feedAction: 'competition', shortcutLabel: 'ECL 27', shortcutAction: 'competition',
        emptyTeam: 'Säsongsresultat och slutstatistik visas här.', emptyNoTeam: 'Öppna ECL 27 och se slutresultatet.'
      },
      offseason: {
        phase,
        teamKicker: 'STATUS', missingTitle: 'Free Agent', missingText: 'Ingen aktiv lagkoppling', missingAction: 'fa', teamSubtitle: 'Senaste säsong',
        secondKicker: 'ECL', secondTitle: 'Mellan säsonger', secondText: 'Nyheter, historik och kommande tävlingar', secondAction: 'competitions',
        feedTitle: 'För dig just nu', feedLink: 'Tävlingar →', feedAction: 'competitions', shortcutLabel: 'Tävlingar', shortcutAction: 'competitions',
        emptyTeam: 'När nästa lagbygge öppnar byter den här ytan automatiskt.', emptyNoTeam: 'När nästa ECL-period öppnar anpassas den här ytan automatiskt.'
      }
    }[phase];
  }

  function favoriteTargets() {
    let raw = [];
    try { raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch (_) { raw = []; }
    if (!Array.isArray(raw)) raw = [];

    const playerNames = new Set();
    const teamIds = new Set();
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      try {
        const url = new URL(String(item.url || ''), location.href);
        const hash = decodeURIComponent(url.hash || '');
        if (item.type === 'player') {
          const match = hash.match(/^#\/spelare\/([^/?#]+)/i);
          if (match?.[1]) playerNames.add(match[1].trim().toLocaleLowerCase('sv-SE'));
        } else if (item.type === 'team') {
          const match = hash.match(/^#\/lag\/(\d+)/i);
          if (match?.[1]) teamIds.add(Number(match[1]));
        }
      } catch (_) {}
    }
    return { playerNames, teamIds, total: raw.length };
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
    const sportsGamerId = sportsGamer.match(/\/players\/(\d+)(?:\/|$|[?#])/i)?.[1];
    if (sportsGamerId) return `/players/${sportsGamerId}.png`;
    return String(player?.player_image || player?.photo || '').trim() || PLAYER_FALLBACK;
  }

  function addFeed(feed, seen, item) {
    const key = String(item?.key || '');
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    feed.push(item);
  }

  function buildFeed(data, meta, teamName) {
    const { events, recruitment, favoritePlayerEvents, favoriteTeamEvents, favoriteRecruitments, favoriteProjects, favoriteTargets: targets } = data;
    const own = [];
    const favorite = [];
    const seen = new Set();

    if (meta.phase === 'building' && recruitment?.text) {
      addFeed(own, seen, {
        key: `recruit-own-${recruitment.id || recruitment.posted_at || ''}`,
        marker: '!', tone: 'recruit', title: `${teamName} söker spelare`, text: String(recruitment.text).trim(),
        time: relativeTime(recruitment.posted_at), stamp: Date.parse(recruitment.posted_at || '') || 0
      });
    }

    for (const event of events || []) {
      const item = eventText(event, teamName || String(event?.to_team || event?.from_team || 'ditt lag'));
      addFeed(own, seen, {
        key: `event-${event.id || `${event.occurred_at}-${event.gamertag}`}`,
        ...item, time: relativeTime(event?.occurred_at), stamp: Date.parse(event?.occurred_at || '') || 0
      });
    }

    const projectMap = new Map((favoriteProjects || []).map(project => [Number(project.id), String(project.name || 'Favoritlag')]));

    for (const event of favoritePlayerEvents || []) {
      const type = String(event?.event_type || '').toLowerCase();
      const tag = String(event?.gamertag || '').trim() || 'Favoritspelare';
      const destination = type === 'in' ? String(event?.to_team || '').trim() : String(event?.from_team || '').trim();
      const title = type === 'in' ? `${tag} → ${destination || 'nytt lag'}` : type === 'out' ? `${tag} lämnar ${destination || 'laget'}` : tag;
      addFeed(favorite, seen, {
        key: `event-${event.id || `${event.occurred_at}-${tag}`}`,
        marker: '★', tone: 'favorite', title,
        text: type === 'in' ? 'Favoritspelare · ny IN-händelse' : type === 'out' ? 'Favoritspelare · ny UT-händelse' : 'Favoritspelare',
        time: relativeTime(event?.occurred_at), stamp: Date.parse(event?.occurred_at || '') || 0
      });
    }

    for (const post of favoriteRecruitments || []) {
      const projectName = projectMap.get(Number(post.team_project_id)) || 'Favoritlag';
      addFeed(favorite, seen, {
        key: `recruit-fav-${post.id || post.posted_at || projectName}`,
        marker: '★', tone: 'favorite', title: `${projectName} söker spelare`,
        text: `Favoritlag · ${String(post.text || '').trim()}`,
        time: relativeTime(post.posted_at), stamp: Date.parse(post.posted_at || '') || 0
      });
    }

    for (const event of favoriteTeamEvents || []) {
      const projectName = projectMap.get(Number(event.team_project_id)) || String(event?.to_team || event?.from_team || 'Favoritlag');
      const base = eventText(event, projectName);
      addFeed(favorite, seen, {
        key: `event-${event.id || `${event.occurred_at}-${event.gamertag}`}`,
        marker: '★', tone: 'favorite', title: base.title,
        text: `Favoritlag · ${projectName}`,
        time: relativeTime(event?.occurred_at), stamp: Date.parse(event?.occurred_at || '') || 0
      });
    }

    own.sort((a, b) => b.stamp - a.stamp);
    favorite.sort((a, b) => b.stamp - a.stamp);
    const feed = [...own, ...favorite].slice(0, 3);

    if (!feed.length) {
      if ((targets?.playerNames?.size || 0) + (targets?.teamIds?.size || 0) > 0) {
        feed.push({ marker: '★', tone: 'favorite', title: 'Dina favoriter bevakas', text: 'Nya IN/UT och lagbyggehändelser från dina favoritspelare och favoritlag visas här.', time: '', stamp: 0 });
      } else {
        feed.push({
          marker: teamName ? '✓' : 'FA', tone: teamName ? '' : 'fa', title: teamName ? `${teamName} är kopplat` : 'Du är Free Agent',
          text: teamName ? meta.emptyTeam : 'När du går med i ett aktivt lagbygge byts statusen automatiskt.', time: '', stamp: 0
        });
      }
    }
    return feed;
  }

  function renderPersonal(root, data) {
    lastData = data;
    const { account, player, project, activeFaCount, competitionState, favoriteTargets: targets, currentStatus } = data;
    const meta = phaseMeta(competitionState?.phase);
    const routeHash = String(competitionState?.route_hash || DEFAULT_ROUTE);
    const playerName = String(player?.display_gamertag || account?.playerName || account?.playerKey || 'Din profil').trim();
    const teamName = currentStatus?.kind === 'team' ? String(project?.name || currentStatus?.teamName || '').trim() : '';
    const division = String(project?.division || currentStatus?.division || '').trim();
    const profileMeta = teamName ? [teamName, division].filter(Boolean).join(' · ') : 'Free Agent';
    const sourceTeamId = Number(project?.source_team_id || currentStatus?.teamId) || 0;

    const feed = buildFeed(data, meta, teamName);
    const hasFavoriteFeed = feed.some(item => item.tone === 'favorite');
    const feedLink = !teamName && hasFavoriteFeed ? 'Favoriter →' : meta.feedLink;
    const feedAction = !teamName && hasFavoriteFeed ? 'favorites' : meta.feedAction;
    const feedHtml = feed.map(item => `
      <article class="seh-for-you__feed-row" data-tone="${esc(item.tone)}">
        <b>${esc(item.marker)}</b><div><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div><time>${esc(item.time)}</time>
      </article>`).join('');

    const teamSubtitle = meta.phase === 'building' ? (division || meta.teamSubtitle) : [division, meta.teamSubtitle].filter(Boolean).join(' · ');
    const teamCard = teamName
      ? `<button type="button" class="seh-for-you__mini" data-fy-action="team" data-team-id="${sourceTeamId}" data-route="${esc(routeHash)}"><small>${esc(meta.teamKicker)}</small><strong>${esc(teamName)}</strong><span>${esc(teamSubtitle)}</span></button>`
      : `<button type="button" class="seh-for-you__mini" data-fy-action="${esc(meta.missingAction)}" data-route="${esc(routeHash)}"><small>${esc(meta.teamKicker)}</small><strong>${esc(meta.missingTitle)}</strong><span>${esc(meta.missingText)}</span></button>`;
    const secondTitle = meta.phase === 'building' ? `${Number(activeFaCount) || 0} aktiva` : meta.secondTitle;
    const favoriteCount = Number(targets?.playerNames?.size || 0) + Number(targets?.teamIds?.size || 0);

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
        <button type="button" class="seh-for-you__mini" data-fy-action="${esc(meta.secondAction)}" data-route="${esc(routeHash)}"><small>${esc(meta.secondKicker)}</small><strong>${esc(secondTitle)}</strong><span>${esc(meta.secondText)}</span></button>
      </div>
      <div class="seh-for-you__feed-head"><strong>${esc(meta.feedTitle)}</strong><button type="button" data-fy-action="${esc(feedAction)}" data-route="${esc(routeHash)}">${esc(feedLink)}</button></div>
      <div class="seh-for-you__feed">${feedHtml}</div>
      <div class="seh-for-you__shortcuts">
        <button type="button" data-fy-action="profile">Min profil</button>
        <button type="button" data-fy-action="team" data-team-id="${sourceTeamId}" data-route="${esc(routeHash)}" ${teamName ? '' : 'disabled'}>Mitt lag</button>
        <button type="button" data-fy-action="${esc(meta.shortcutAction)}" data-route="${esc(routeHash)}">${esc(meta.shortcutLabel)}</button>
        <button type="button" data-fy-action="favorites">Favoriter${favoriteCount ? ` (${favoriteCount})` : ''}</button>
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

        const targets = favoriteTargets();
        const defaultCompetitionState = { competition_key: COMPETITION_KEY, display_name: 'ECL 27 Winter', phase: 'building', route_hash: DEFAULT_ROUTE };
        const recentEventsQuery = targets.playerNames.size
          ? sb.from('ecl27_roster_events').select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team').order('occurred_at', { ascending: false }).limit(120)
          : Promise.resolve({ data: [], error: null });
        const favoriteProjectsQuery = targets.teamIds.size
          ? sb.from('ecl27_team_projects').select('id,name,division,source_team_id,status').in('source_team_id', [...targets.teamIds]).limit(40)
          : Promise.resolve({ data: [], error: null });

        const [phaseResult, dashboardResult, directoryResult, playerEventsResult, recentEventsResult, favoriteProjectsResult] = await Promise.all([
          sb.from('seh_app_competition_states').select('competition_key,display_name,phase,route_hash,updated_at').eq('competition_key', COMPETITION_KEY).limit(1),
          sb.rpc('seh_get_my_player_dashboard'),
          sb.from('app_player_directory_cache').select('player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_team,latest_season').eq('player_key', account.playerKey).limit(1),
          sb.from('ecl27_roster_events').select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team').eq('player_key', account.playerKey).order('occurred_at', { ascending: false }).limit(20),
          recentEventsQuery,
          favoriteProjectsQuery
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

        const favoritePlayerEvents = recentEventsResult.error ? [] : (recentEventsResult.data || []).filter(event => targets.playerNames.has(String(event?.gamertag || '').trim().toLocaleLowerCase('sv-SE')));
        const favoriteProjects = favoriteProjectsResult.error ? [] : (favoriteProjectsResult.data || []);
        const favoriteProjectIds = favoriteProjects.map(project => Number(project.id)).filter(Boolean);

        const projectQuery = currentProjectId
          ? sb.from('ecl27_team_projects').select('id,name,division,source_team_id,logo_name,status').eq('id', currentProjectId).limit(1)
          : Promise.resolve({ data: [], error: null });
        const eventsQuery = currentProjectId
          ? sb.from('ecl27_roster_events').select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team').eq('team_project_id', currentProjectId).order('occurred_at', { ascending: false }).limit(4)
          : Promise.resolve({ data: [], error: null });
        const recruitmentQuery = currentProjectId && building
          ? sb.from('ecl27_recruitment_posts').select('id,team_project_id,posted_at,text,is_active').eq('team_project_id', currentProjectId).eq('is_active', true).order('posted_at', { ascending: false }).limit(1)
          : Promise.resolve({ data: [], error: null });
        const faQuery = building
          ? sb.from('v_ehockey_free_agents_public').select('player_key').limit(300)
          : Promise.resolve({ data: [], error: null });
        const favoriteTeamEventsQuery = favoriteProjectIds.length
          ? sb.from('ecl27_roster_events').select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team').in('team_project_id', favoriteProjectIds).order('occurred_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [], error: null });
        const favoriteRecruitmentsQuery = building && favoriteProjectIds.length
          ? sb.from('ecl27_recruitment_posts').select('id,team_project_id,posted_at,text,is_active').in('team_project_id', favoriteProjectIds).eq('is_active', true).order('posted_at', { ascending: false }).limit(12)
          : Promise.resolve({ data: [], error: null });

        const [projectResult, eventsResult, recruitmentResult, faResult, favoriteTeamEventsResult, favoriteRecruitmentsResult] = await Promise.all([
          projectQuery, eventsQuery, recruitmentQuery, faQuery, favoriteTeamEventsQuery, favoriteRecruitmentsQuery
        ]);
        if (token !== renderToken) return;

        const currentStatus = window.SEH_currentPlayerStatus?.get
          ? await window.SEH_currentPlayerStatus.get(account.playerKey)
          : null;
        let currentProject = projectResult.error ? null : (projectResult.data?.[0] || null);
        if (currentStatus?.kind === 'team') {
          currentProject = currentProject || {
            id: currentStatus.teamProjectId || null,
            name: currentStatus.teamName,
            division: currentStatus.division,
            source_team_id: currentStatus.teamId,
            logo_name: currentStatus.logoName,
            status: currentStatus.phase
          };
        } else if (currentStatus?.kind === 'free_agent') {
          currentProject = null;
        }

        const data = {
          account,
          player,
          competitionState,
          currentStatus,
          favoriteTargets: targets,
          project: currentProject,
          events: eventsResult.error ? [] : (eventsResult.data || []),
          recruitment: recruitmentResult.error ? null : (recruitmentResult.data?.[0] || null),
          activeFaCount: faResult.error ? 0 : (faResult.data || []).length,
          favoritePlayerEvents,
          favoriteProjects,
          favoriteTeamEvents: favoriteTeamEventsResult.error ? [] : (favoriteTeamEventsResult.data || []),
          favoriteRecruitments: favoriteRecruitmentsResult.error ? [] : (favoriteRecruitmentsResult.data || [])
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
    if (!root || root.dataset.bound === '3') return;
    root.dataset.bound = '3';
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

    const visible = homeVisible();
    if (visible && !homeWasVisible) load(true);
    homeWasVisible = visible;
  });

  function start() {
    homeWasVisible = homeVisible();
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    mount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.addEventListener('hashchange', () => {
    if (location.hash === '#/' || location.hash === '') window.setTimeout(() => load(true), 60);
  });

  window.addEventListener('focus', () => {
    if (homeVisible()) load();
  });

  window.addEventListener('storage', event => {
    if (event.key === FAVORITES_KEY) load(true);
  });

  window.SEH_REFRESH_FOR_YOU = () => load(true);
})();
