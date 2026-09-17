(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';

  function playerHashFromHref(value) {
    const raw = String(value || '').trim();
    const index = raw.indexOf('#/spelare/');
    return index >= 0 ? raw.slice(index) : '';
  }

  function navigatePlayer(hash) {
    const route = String(hash || '').trim();
    if (!route.startsWith('#/spelare/')) return;

    // Bygg en full URL från den aktuella webbappadressen så ?webapp=1 och
    // andra app-parametrar bevaras. Full omladdning används avsiktligt här:
    // den eliminerar race mellan Mitt eHockey-overlayn och SPA-routeringen.
    const target = new URL(window.location.href);
    target.hash = route.slice(1);
    window.location.assign(target.href);
  }

  document.addEventListener('click', event => {
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;

    const link = event.target.closest?.(`#${ROOT_ID} a[href*="#/spelare/"]`);
    if (!link) return;

    const hash = playerHashFromHref(link.getAttribute('href'));
    if (!hash) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    navigatePlayer(hash);
  }, true);
})();