(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const PROFILE_KEY = 'seh_app_my_profile_v1';
  const FAVORITES_KEY = 'seh_app_favorites_v1';
  let bypassProfileClick = false;

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

  function profileRoute(profile) {
    const direct = String(profile?.url || profile?.profileUrl || '').trim();
    if (direct) return direct;
    const key = String(profile?.playerKey || profile?.player_key || profile?.key || '').trim();
    const name = profileName(profile);
    const target = key || name;
    return target ? `/#/spelare/${encodeURIComponent(target)}` : '';
  }

  function favTitle(item) {
    return String(item?.title || item?.name || '').replace(/\s*[|·]\s*Svensk eHockey.*$/i, '').trim();
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
  }

  function open() {
    const root = ensureRoot();
    if (!root) return;
    render();
    root.classList.add('show');
    document.body.classList.add('seh-my-ehockey-open');
    const title = document.getElementById('seh-native-title');
    if (title) title.textContent = 'Mitt eHockey';
  }

  function close() {
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return false;
    root.classList.remove('show');
    document.body.classList.remove('seh-my-ehockey-open');
    const title = document.getElementById('seh-native-title');
    if (title) title.textContent = 'Hem';
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
      if (event.target.closest?.('#seh-native-bottom')) {
        close();
      }
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
