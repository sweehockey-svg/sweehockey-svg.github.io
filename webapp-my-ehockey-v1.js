(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const PROFILE_KEY = 'seh_app_my_profile_v1';
  const FAVORITES_KEY = 'seh_app_favorites_v1';
  let bypassProfileClick = false;
  let previousTitle = '';
  let client = null;
  let careerLoadToken = 0;

  const USER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4.2 2.9-6.5 7-6.5s6.5 2.3 7 6.5"/></svg>';

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

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

  function readProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : null;
    } catch (_) {
      return null;
    }
  }

  function readFavorites() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(Boolean).slice(0, 50) : [];
    } catch (_) {
      return [];
    }
  }

  function profileName(profile) {
    return String(profile?.name || profile?.displayName || profile?.display_gamertag || profile?.gamertag || '').trim();
  }

  function profilePhoto(profile) {
    return String(profile?.image || profile?.photo || profile?.playerImage || profile?.player_image || profile?.avatar || '').trim();
  }

  function profilePlayerKey(profile) {
    return String(profile?.playerKey || profile?.player_key || profile?.key || '').trim();
  }

  function profileRoute(profile) {
    const direct = String(profile?.url || profile?.profileUrl || '').trim();
    if (direct) return direct;
    const key = profilePlayerKey(profile);
    const name = profileName(profile);
    const target = key || name;
    return target ? `/#/spelare/${encodeURIComponent(target)}` : '';
  }

  function favTitle(item) {
    return String(item?.title || item?.name || '').replace(/\s*[|·]\s*Svensk eHockey.*$/i, '').trim();
  }

  function statNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)).toLocaleString('sv-SE') : '0';
  }

  function decimalNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
    return number.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function savePct(value) {
    let number = Number(value);
    if (!Number.isFinite(number) || number < 0) return '–';
    if (number <= 1) number *= 100;
    return `${number.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;
  }

  function ensureRoot() {
    if (!isWebApp()) return null;
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement('section');
    root.id = ROOT_ID;
    root.setAttribute('aria-label', 'Mitt eHockey');
    root.innerHTML = '<div class="seh-me-wrap"></div>';
    document.body.appendChild(root);
    return root;
  }

  function careerStat(label, value, accent = '') {
    return `<div class="seh-me-career-stat${accent ? ` ${accent}` : ''}"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  }

  function renderCareer(root, row) {
    const holder = root?.querySelector('[data-me-career]');
    const status = root?.querySelector('[data-me-career-status]');
    if (!holder) return;

    const careerGames = Number(row?.career_games) || 0;
    const skaterGames = Number(row?.total_skater_games) || 0;
    const goalieGames = Number(row?.total_goalie_games) || 0;
    const goals = Number(row?.total_goals) || 0;
    const assists = Number(row?.total_assists) || 0;
    const points = Number(row?.total_points) || 0;
    const tournaments = Number(row?.tournament_count) || 0;
    const clubs = Number(row?.club_count) || 0;
    const saves = Number(row?.total_goalie_saves) || 0;
    const shotsAgainst = Number(row?.total_goalie_shots_against) || 0;
    const savePercentage = Number(row?.total_goalie_save_percentage);
    const hasGoalieHistory = goalieGames > 0 || saves > 0 || shotsAgainst > 0 || (Number.isFinite(savePercentage) && savePercentage > 0);
    const hasSkaterHistory = skaterGames > 0 || goals > 0 || assists > 0 || points > 0;
    const isGoalieOnly = hasGoalieHistory && !hasSkaterHistory;
    const position = String(row?.primary_position || '').trim();
    const latestTeam = String(row?.latest_team || '').trim();
    const latestSeason = String(row?.latest_season || '').trim();
    const context = [position ? `Position ${position}` : '', latestTeam, latestSeason].filter(Boolean);

    let highlight = 'Karriärstatistiken fylls på när matcher finns registrerade.';
    if (isGoalieOnly && careerGames > 0) {
      highlight = `${statNumber(careerGames)} matcher · ${savePct(savePercentage)} räddningsprocent`;
    } else if (skaterGames > 0) {
      highlight = `${statNumber(skaterGames)} utespelarmatcher · ${decimalNumber(points / skaterGames)} poäng per match`;
    } else if (careerGames > 0) {
      highlight = `${statNumber(careerGames)} matcher registrerade`;
    }

    const mainStats = isGoalieOnly
      ? [
          careerStat('Matcher', statNumber(careerGames), 'gold'),
          careerStat('Räddningsprocent', savePct(savePercentage), 'cyan'),
          careerStat('Räddningar', statNumber(saves)),
          careerStat('Skott mot', statNumber(shotsAgainst)),
          careerStat('Turneringar', statNumber(tournaments)),
          careerStat('Klubbar', statNumber(clubs))
        ]
      : [
          careerStat('Matcher', statNumber(careerGames), 'gold'),
          careerStat('Poäng', statNumber(points), 'cyan'),
          careerStat('Mål', statNumber(goals)),
          careerStat('Assist', statNumber(assists)),
          careerStat('Turneringar', statNumber(tournaments)),
          careerStat('Klubbar', statNumber(clubs))
        ];

    holder.innerHTML = `
      <div class="seh-me-career-summary">
        <div><small>ÖVERSIKT</small><strong>${esc(highlight)}</strong><span>${esc(context.join(' · ') || 'Verifierad historik från Svensk eHockey')}</span></div>
      </div>
      <div class="seh-me-career-grid">${mainStats.join('')}</div>
      ${hasGoalieHistory && !isGoalieOnly ? `
        <div class="seh-me-goalie-row">
          <div><small>MÅLVAKTSHISTORIK</small><strong>${savePct(savePercentage)}</strong><span>Räddningsprocent</span></div>
          <div><strong>${statNumber(goalieGames)}</strong><span>Matcher i mål</span></div>
          <div><strong>${statNumber(saves)}</strong><span>Räddningar</span></div>
        </div>` : ''}
      <p class="seh-me-career-note">Bygger på registrerad historik i Svensk eHockey och uppdateras automatiskt.</p>`;

    if (status) status.textContent = careerGames || tournaments ? 'Karriärdata' : 'Ingen statistik ännu';
  }

  function renderCareerMessage(root, message, statusText = '') {
    const holder = root?.querySelector('[data-me-career]');
    const status = root?.querySelector('[data-me-career-status]');
    if (holder) holder.innerHTML = `<div class="seh-me-career-empty">${esc(message)}</div>`;
    if (status) status.textContent = statusText;
  }

  async function loadCareer(root, profile) {
    const token = ++careerLoadToken;
    const holder = root?.querySelector('[data-me-career]');
    if (!holder) return;

    try {
      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas');

      let playerKey = profilePlayerKey(profile);
      if (!playerKey) {
        const accountResult = await sb.rpc('seh_get_my_player_account');
        if (token !== careerLoadToken) return;
        if (accountResult.error) throw accountResult.error;
        const account = asRow(accountResult.data);
        if (String(account?.status || '') === 'approved') playerKey = String(account?.player_key || '').trim();
      }

      if (!playerKey) {
        renderCareerMessage(root, 'Koppla din befintliga spelarprofil för att se din karriär här.', 'Profil krävs');
        return;
      }

      const result = await sb
        .from('app_player_directory_cache')
        .select('player_key,display_gamertag,primary_position,latest_team,latest_season,total_skater_games,total_goalie_games,career_games,total_points,total_goals,total_assists,total_goalie_saves,total_goalie_shots_against,total_goalie_save_percentage,tournament_count,club_count')
        .eq('player_key', playerKey)
        .limit(1);

      if (token !== careerLoadToken) return;
      if (result.error) throw result.error;
      const row = result.data?.[0] || null;
      if (!row) {
        renderCareerMessage(root, 'Ingen registrerad karriärhistorik hittades för spelarprofilen ännu.', 'Ingen data');
        return;
      }

      renderCareer(root, row);
    } catch (error) {
      console.warn('[Svensk eHockey] Mitt eHockey karriär kunde inte laddas', error);
      if (token !== careerLoadToken) return;
      renderCareerMessage(root, 'Karriärstatistiken kunde inte laddas just nu.', 'Försök igen senare');
    }
  }

  function render() {
    const root = ensureRoot();
    if (!root) return;
    const wrap = root.querySelector('.seh-me-wrap');
    const profile = readProfile();
    const favorites = readFavorites();
    const name = profileName(profile) || 'Mitt eHockey';
    const photo = profilePhoto(profile);
    const linked = profile?.serverLinked === true || profile?.linked === true;
    const team = String(profile?.latestTeam || profile?.team || profile?.currentTeam || '').trim();
    const season = String(profile?.latestSeason || profile?.season || '').trim();
    const route = profileRoute(profile);
    const playerFavs = favorites.filter(item => String(item?.type || '') === 'player');
    const teamFavs = favorites.filter(item => String(item?.type || '') === 'team');
    const visibleFavs = favorites.slice(0, 5);

    const avatar = photo
      ? `<img src="${esc(photo)}" alt="${esc(name)}">`
      : USER_ICON;

    const favoriteHtml = visibleFavs.length
      ? visibleFavs.map(item => {
          const title = favTitle(item) || (String(item?.type || '') === 'team' ? 'Lag' : 'Spelare');
          const type = String(item?.type || '') === 'team' ? 'Lag' : 'Spelare';
          const url = String(item?.url || '').trim();
          const tag = url ? 'a' : 'div';
          const href = url ? ` href="${esc(url)}"` : '';
          return `<${tag} class="seh-me-favorite"${href}>
            <b>${type === 'Lag' ? 'T' : '★'}</b>
            <span><strong>${esc(title)}</strong><small>${esc(type)}</small></span>
            <i>›</i>
          </${tag}>`;
        }).join('')
      : '<div class="seh-me-empty">Du har inga favoriter ännu. Följ spelare och lag så samlas de här.</div>';

    wrap.innerHTML = `
      <header class="seh-me-head">
        <div><small>PERSONLIGT NAV</small><h1>Mitt eHockey</h1></div>
        <span>${linked ? 'Profil kopplad' : 'Personligt konto'}</span>
      </header>

      <section class="seh-me-profile">
        <div class="seh-me-avatar">${avatar}</div>
        <div class="seh-me-copy">
          <small>${linked ? 'DIN SPELARPROFIL' : 'DITT KONTO'}</small>
          <h2>${esc(name)}</h2>
          <p>${esc([team, season].filter(Boolean).join(' · ') || (linked ? 'Kopplad spelare' : 'Koppla en spelarprofil för mer personlig data'))}</p>
          <div class="seh-me-status">
            <span class="seh-me-pill${linked ? ' ok' : ''}">${linked ? 'Discord kopplad' : 'Profil ej kopplad'}</span>
            <span class="seh-me-pill">${playerFavs.length} spelare följs</span>
            <span class="seh-me-pill">${teamFavs.length} lag följs</span>
          </div>
        </div>
      </section>

      <section class="seh-me-section seh-me-career-section">
        <div class="seh-me-section-head"><div><small>MIN KARRIÄR</small><h3>Karriären i siffror</h3></div><span data-me-career-status>Hämtar…</span></div>
        <div class="seh-me-career" data-me-career>
          <div class="seh-me-career-loading"><i></i><i></i><i></i></div>
        </div>
      </section>

      <section class="seh-me-section">
        <div class="seh-me-section-head"><div><small>SNABBT</small><h3>Din eHockey</h3></div></div>
        <div class="seh-me-actions">
          ${route ? `<a class="seh-me-action primary" href="${esc(route)}" data-me-close-first><strong>Min spelarprofil</strong><span>Öppna din publika profil</span></a>` : `<button class="seh-me-action primary" type="button" data-me-account><strong>Koppla spelarprofil</strong><span>Välj din befintliga profil</span></button>`}
          <button class="seh-me-action cyan" type="button" data-me-notifications><strong>Notiser</strong><span>Öppna ditt Notiscenter</span></button>
          <button class="seh-me-action" type="button" data-me-account><strong>Mina ärenden</strong><span>Profiländringar och spelarbild</span></button>
          <button class="seh-me-action" type="button" data-me-account><strong>Konto & inställningar</strong><span>Discord, profil och appval</span></button>
        </div>
      </section>

      <section class="seh-me-section">
        <div class="seh-me-section-head"><div><small>FÖLJER</small><h3>Mina favoriter</h3></div><span>${favorites.length} totalt</span></div>
        <div class="seh-me-favorites">${favoriteHtml}</div>
      </section>

      <p class="seh-me-footer-note">Mitt eHockey är din personliga hubb. Hem fortsätter vara en snabb startsida med nyheter och genvägar.</p>`;

    loadCareer(root, profile);
  }

  function open() {
    const root = ensureRoot();
    if (!root) return;
    render();
    root.classList.add('show');
    document.body.classList.add('seh-my-ehockey-open');
    const title = document.getElementById('seh-native-title');
    previousTitle = String(title?.textContent || '').trim();
    if (title) title.textContent = 'Mitt eHockey';
  }

  function close() {
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return false;
    careerLoadToken += 1;
    root.classList.remove('show');
    document.body.classList.remove('seh-my-ehockey-open');
    const title = document.getElementById('seh-native-title');
    if (title && previousTitle) title.textContent = previousTitle;
    previousTitle = '';
    return true;
  }

  function openLegacyAccount() {
    const profileButton = document.getElementById('seh-my-profile');
    close();
    if (!profileButton) return;
    bypassProfileClick = true;
    profileButton.click();
    queueMicrotask(() => { bypassProfileClick = false; });
  }

  function openNotifications() {
    close();
    document.getElementById('seh-notification-button')?.click();
  }

  document.addEventListener('click', event => {
    const profileButton = event.target.closest?.('#seh-my-profile');
    if (profileButton && !bypassProfileClick && isWebApp()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
      return;
    }

    if (document.getElementById(ROOT_ID)?.classList.contains('show')) {
      const back = event.target.closest?.('#seh-back');
      if (back) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      if (event.target.closest?.('#seh-native-bottom')) close();
    }

    if (event.target.closest?.('[data-me-account]')) {
      event.preventDefault();
      openLegacyAccount();
      return;
    }
    if (event.target.closest?.('[data-me-notifications]')) {
      event.preventDefault();
      openNotifications();
      return;
    }
    if (event.target.closest?.('[data-me-close-first]')) close();
  }, true);

  window.addEventListener('storage', event => {
    if ((event.key === PROFILE_KEY || event.key === FAVORITES_KEY) && document.getElementById(ROOT_ID)?.classList.contains('show')) render();
  });

  const observer = new MutationObserver(() => {
    if (!isWebApp()) return;
    const profileButton = document.getElementById('seh-my-profile');
    if (profileButton) profileButton.setAttribute('aria-label', 'Mitt eHockey');
  });

  function start() {
    if (!isWebApp()) return;
    ensureRoot();
    const profileButton = document.getElementById('seh-my-profile');
    if (profileButton) profileButton.setAttribute('aria-label', 'Mitt eHockey');
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
