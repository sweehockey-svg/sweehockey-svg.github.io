(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  const PLAYER_FALLBACK = '/players/1DEFAULTBILDID.png';
  let client = null;
  let renderToken = 0;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  function fmtDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Nyss';
    if (hours < 24) return `${hours} h sedan`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Igår';
    if (days < 7) return `${days} dagar sedan`;
    return fmtDate(value);
  }

  function home() {
    return document.querySelector('#seh-app-home .seh-app-page');
  }

  function ensureRoot() {
    const page = home();
    if (!page) return null;
    let root = page.querySelector(`#${ROOT_ID}`);
    if (root) return root;
    root = document.createElement('section');
    root.id = ROOT_ID;
    root.className = 'seh-for-you';
    root.setAttribute('aria-label', 'För dig');
    const grid = page.querySelector('.seh-card-grid');
    if (grid) grid.insertAdjacentElement('beforebegin', root);
    else page.appendChild(root);
    bind(root);
    return root;
  }

  function skeleton(root) {
    root.innerHTML = `
      <div class="seh-for-you__head">
        <div><small>PERSONLIGT</small><h2>För dig</h2></div>
        <span class="seh-for-you__live">LIVE</span>
      </div>
      <div class="seh-for-you__loading">
        <i></i><i></i><i></i>
      </div>`;
  }

  function loggedOut(root) {
    root.innerHTML = `
      <div class="seh-for-you__head">
        <div><small>PERSONLIGT</small><h2>För dig</h2></div>
      </div>
      <div class="seh-for-you__welcome">
        <div class="seh-for-you__welcome-icon">◎</div>
        <div><strong>Gör webbappen personlig</strong><span>Logga in med Discord för att få din spelarprofil, ditt lag och de senaste laghändelserna direkt på Hem.</span></div>
        <button type="button" data-fy-action="profile">Logga in</button>
      </div>`;
  }

  function pending(root, account) {
    const status = String(account?.status || 'unlinked');
    const title = status === 'pending' ? 'Spelarkopplingen väntar' : 'Koppla din spelarprofil';
    const text = status === 'pending'
      ? 'När kopplingen har godkänts visas ditt lag och ditt personliga flöde här automatiskt.'
      : 'Koppla ditt befintliga spelarkort så kan För dig följa din profil och ditt lag.';
    root.innerHTML = `
      <div class="seh-for-you__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>
      <div class="seh-for-you__welcome">
        <div class="seh-for-you__welcome-icon">◎</div>
        <div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>
        <button type="button" data-fy-action="profile">Min profil</button>
      </div>`;
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
    const raw = String(player?.player_image || player?.photo || '').trim();
    return raw || PLAYER_FALLBACK;
  }

  function renderPersonal(root, data) {
    const { account, player, project, events, recruitment, activeFaCount } = data;
    const playerName = String(player?.display_gamertag || account?.playerName || account?.playerKey || 'Din profil').trim();
    const teamName = String(project?.name || '').trim();
    const division = String(project?.division || '').trim();
    const profileMeta = [teamName, division].filter(Boolean).join(' · ') || String(player?.latest_team || player?.latest_ecl_team || 'Kopplad spelare');
    const sourceTeamId = Number(project?.source_team_id) || 0;

    const feed = [];
    if (recruitment?.text) {
      feed.push({
        marker: '!', tone: 'recruit', title: `${teamName} söker spelare`,
        text: String(recruitment.text).trim(), time: relativeTime(recruitment.posted_at)
      });
    }
    for (const event of events || []) {
      if (feed.length >= 3) break;
      const item = eventText(event, teamName || String(event?.to_team || event?.from_team || 'ditt lag'));
      feed.push({ ...item, time: relativeTime(event?.occurred_at) });
    }
    if (!feed.length) {
      feed.push({ marker: '✓', tone: '', title: teamName ? `${teamName} är kopplat` : 'Din profil är kopplad', text: teamName ? 'Nya IN/UT och rekryteringsposter visas här automatiskt.' : 'När du går med i ett aktuellt ECL 27-lag visas lagflödet här.', time: '' });
    }

    const feedHtml = feed.map(item => `
      <article class="seh-for-you__feed-row" data-tone="${esc(item.tone)}">
        <b>${esc(item.marker)}</b>
        <div><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div>
        <time>${esc(item.time)}</time>
      </article>`).join('');

    const teamCard = teamName
      ? `<button type="button" class="seh-for-you__mini" data-fy-action="team" data-team-id="${sourceTeamId}">
           <small>DITT LAG</small><strong>${esc(teamName)}</strong><span>${esc(division || 'Aktuellt lagbygge')}</span>
         </button>`
      : `<button type="button" class="seh-for-you__mini" data-fy-action="builds">
           <small>DITT LAG</small><strong>Inte i lagbygget ännu</strong><span>Öppna aktuella svenska lagbyggen</span>
         </button>`;

    root.innerHTML = `
      <div class="seh-for-you__head">
        <div><small>PERSONLIGT</small><h2>För dig</h2></div>
        <span class="seh-for-you__live">LIVE</span>
      </div>
      <div class="seh-for-you__identity">
        <img src="${esc(playerImage(player))}" alt="${esc(playerName)}">
        <div><small>DIN SPELARE</small><strong>${esc(playerName)}</strong><span>${esc(profileMeta)}</span></div>
        <button type="button" data-fy-action="profile">Min profil</button>
      </div>
      <div class="seh-for-you__mini-grid">
        ${teamCard}
        <button type="button" class="seh-for-you__mini" data-fy-action="fa">
          <small>FREE AGENTS</small><strong>${Number(activeFaCount) || 0} aktiva</strong><span>Se spelare som söker lag</span>
        </button>
      </div>
      <div class="seh-for-you__feed-head"><strong>Senaste för dig</strong><button type="button" data-fy-action="builds">Alla lagbyggen →</button></div>
      <div class="seh-for-you__feed">${feedHtml}</div>
      <div class="seh-for-you__shortcuts">
        <button type="button" data-fy-action="profile">Min profil</button>
        <button type="button" data-fy-action="team" data-team-id="${sourceTeamId}" ${teamName ? '' : 'disabled'}>Mitt lag</button>
        <button type="button" data-fy-action="builds">Lagbygge</button>
        <button type="button" data-fy-action="favorites">Favoriter</button>
      </div>`;
  }

  async function load() {
    if (!window.__SEH_WEB_APP__ && !document.documentElement.classList.contains('seh-web-app')) return;
    const root = ensureRoot();
    if (!root) return;
    const token = ++renderToken;
    skeleton(root);

    try {
      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas');
      const sessionResult = await sb.auth.getSession();
      if (token !== renderToken) return;
      const session = sessionResult.data?.session || null;
      if (!session?.user) {
        loggedOut(root);
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
        return;
      }

      let player = {};
      const dashboardResult = await sb.rpc('seh_get_my_player_dashboard');
      if (!dashboardResult.error) player = asRow(dashboardResult.data)?.player || {};

      // Komplettera dashboard-spelaren från samma publika directory-källa som
      // resten av webbappen använder. Där finns bl.a. SportsGamer-URL:n som
      // ger den lokala spelarbilden /players/{id}.png.
      const directoryResult = await sb
        .from('app_player_directory_cache')
        .select('player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_team,latest_season')
        .eq('player_key', account.playerKey)
        .limit(1);
      if (!directoryResult.error && directoryResult.data?.[0]) {
        player = { ...directoryResult.data[0], ...player };
      }

      const playerEventsResult = await sb
        .from('ecl27_roster_events')
        .select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team')
        .eq('player_key', account.playerKey)
        .order('occurred_at', { ascending: false })
        .limit(20);
      if (playerEventsResult.error) throw playerEventsResult.error;
      const playerEvents = playerEventsResult.data || [];
      const latestPlayerEvent = playerEvents[0] || null;
      const currentProjectId = String(latestPlayerEvent?.event_type || '').toLowerCase() === 'in'
        ? Number(latestPlayerEvent?.team_project_id) || 0
        : 0;

      let project = null;
      let events = [];
      let recruitment = null;
      if (currentProjectId) {
        const [projectResult, eventsResult, recruitmentResult] = await Promise.all([
          sb.from('ecl27_team_projects').select('id,name,division,source_team_id,logo_name,status').eq('id', currentProjectId).limit(1),
          sb.from('ecl27_roster_events').select('id,occurred_at,event_type,player_key,gamertag,from_team,to_team').eq('team_project_id', currentProjectId).order('occurred_at', { ascending: false }).limit(4),
          sb.from('ecl27_recruitment_posts').select('id,posted_at,text,is_active').eq('team_project_id', currentProjectId).eq('is_active', true).order('posted_at', { ascending: false }).limit(1)
        ]);
        if (!projectResult.error) project = (projectResult.data || [])[0] || null;
        if (!eventsResult.error) events = eventsResult.data || [];
        if (!recruitmentResult.error) recruitment = (recruitmentResult.data || [])[0] || null;
      }

      // Använd exakt samma publika FA-källa som Free Agents-vyn.
      // Den filtrerar redan bort inaktiva/utgångna poster.
      const faResult = await sb
        .from('v_ehockey_free_agents_public')
        .select('player_key')
        .limit(300);
      const activeFaCount = faResult.error ? 0 : (faResult.data || []).length;

      if (token !== renderToken) return;
      renderPersonal(root, { account, player, project, events, recruitment, activeFaCount });
    } catch (error) {
      console.warn('[Svensk eHockey] För dig kunde inte laddas', error);
      if (token !== renderToken) return;
      root.innerHTML = `
        <div class="seh-for-you__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>
        <div class="seh-for-you__error"><strong>Kunde inte ladda det personliga flödet.</strong><button type="button" data-fy-action="retry">Försök igen</button></div>`;
    }
  }

  function bind(root) {
    if (root.dataset.bound === '1') return;
    root.dataset.bound = '1';
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-fy-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.fyAction;
      if (action === 'retry') return load();
      if (action === 'profile') return document.querySelector('#seh-home-profile')?.click();
      if (action === 'favorites') return document.querySelector('#seh-home-favs')?.click();
      if (action === 'fa') return document.querySelector('#seh-home-fa')?.click();
      if (action === 'builds') {
        location.hash = '#/sasong/ecl27winter';
        return;
      }
      if (action === 'team') {
        const teamId = Number(button.dataset.teamId) || 0;
        location.hash = teamId ? `#/lag/${teamId}` : '#/sasong/ecl27winter';
      }
    });
  }

  function mountWhenReady() {
    const root = ensureRoot();
    if (root) load();
  }

  const observer = new MutationObserver(() => {
    if (!window.__SEH_WEB_APP__ && !document.documentElement.classList.contains('seh-web-app')) return;
    if (!document.getElementById(ROOT_ID) && home()) mountWhenReady();
  });

  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    mountWhenReady();
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#/' || location.hash === '') window.setTimeout(load, 120);
  });

  window.addEventListener('focus', () => {
    if (document.getElementById('seh-app-home')?.classList.contains('show')) load();
  });

  window.SEH_REFRESH_FOR_YOU = load;
})();
