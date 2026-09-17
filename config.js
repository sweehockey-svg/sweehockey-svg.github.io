/*
  Klistra in Project URL och PUBLISHABLE KEY från Supabase.

  Använd aldrig:
  - Secret key
  - service_role key
  - databaslösenord
*/

window.EHOCKEY_CONFIG = {
  supabaseUrl: "https://oujqnvrczdavqbqaavuh.supabase.co",
  supabasePublishableKey: "sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z"
};

/* Huvudmenyn: adminverktygen ligger i kontodropdownen. Visa endast väntande ärenden. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/header-admin-pending-v1.css?v=20260917-1';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/header-admin-pending-v1.js?v=20260917-2';
  script.defer = true;
  document.head.appendChild(script);
})();

/* Favoriter: lokalt för gäster, konto/Supabase som primär lagring när användaren är inloggad. */
(() => {
  const script = document.createElement('script');
  script.src = '/webapp-favorites-account-sync-v1.js?v=20260917-2';
  script.defer = true;
  document.head.appendChild(script);
})();

/* Webbappen: personlig För dig-start. Samma Supabase-data kan senare återanvändas i Android. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/webapp-for-you-v1.css?v=20260917-1';
  document.head.appendChild(css);

  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'script';
  preload.href = '/webapp-for-you-v2.js?v=20260917-competition-aware-1';
  document.head.appendChild(preload);

  const isWebApp = () => Boolean(
    window.__SEH_WEB_APP__ ||
    document.documentElement.classList.contains('seh-web-app') ||
    new URLSearchParams(location.search).get('webapp') === '1' ||
    window.matchMedia?.('(display-mode: standalone)')?.matches
  );

  const ensureForYouSlot = () => {
    if (!isWebApp()) return;
    const page = document.querySelector('#seh-app-home .seh-app-page');
    const grid = page?.querySelector('.seh-card-grid');
    if (!page || !grid || page.querySelector('#seh-webapp-for-you')) return;

    const root = document.createElement('section');
    root.id = 'seh-webapp-for-you';
    root.className = 'seh-for-you';
    root.setAttribute('aria-label', 'För dig');
    root.innerHTML = `
      <div class="seh-for-you__head">
        <div><small>PERSONLIGT</small><h2>För dig</h2></div>
        <span class="seh-for-you__live">LIVE</span>
      </div>
      <div class="seh-for-you__loading"><i></i><i></i><i></i></div>`;
    grid.insertAdjacentElement('beforebegin', root);
  };

  const observer = new MutationObserver(ensureForYouSlot);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureForYouSlot, { once: true });
  } else {
    ensureForYouSlot();
  }

  const instantCacheScript = document.createElement('script');
  instantCacheScript.src = '/webapp-for-you-instant-cache-v1.js?v=20260917-1';
  instantCacheScript.async = false;
  document.head.appendChild(instantCacheScript);

  const script = document.createElement('script');
  script.src = '/webapp-for-you-v2.js?v=20260917-competition-aware-1';
  script.async = false;
  document.head.appendChild(script);

  const favoritesScript = document.createElement('script');
  favoritesScript.src = '/webapp-for-you-favorites-v1.js?v=20260917-1';
  favoritesScript.defer = true;
  document.head.appendChild(favoritesScript);

  const buildsRouteFix = document.createElement('script');
  buildsRouteFix.src = '/webapp-for-you-builds-route-fix-v1.js?v=20260917-1';
  buildsRouteFix.defer = true;
  document.head.appendChild(buildsRouteFix);

  const sclWordingFix = document.createElement('script');
  sclWordingFix.src = '/webapp-for-you-scl-wording-v1.js?v=20260917-1';
  sclWordingFix.defer = true;
  document.head.appendChild(sclWordingFix);

  const genericShortcuts = document.createElement('script');
  genericShortcuts.src = '/webapp-for-you-generic-shortcuts-v1.js?v=20260917-2';
  genericShortcuts.defer = true;
  document.head.appendChild(genericShortcuts);
})();

/* Webbappen: personligt Notiscenter med samma läst-status för webb och kommande Android-klient. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/webapp-notification-center-v1.css?v=20260917-1';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/webapp-notification-center-v1.js?v=20260917-2';
  script.defer = true;
  document.head.appendChild(script);
})();

/* Webbappen: Mitt eHockey ligger bakom avatar-knappen och tar inte plats på Hem. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/webapp-my-ehockey-v1.css?v=20260917-career-1';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/webapp-my-ehockey-v1.js?v=20260917-career-2';
  script.defer = true;
  document.head.appendChild(script);
})();

/* Spelarprofiler + Mitt eHockey: ECL-divisionsresa byggd på faktiska registrerade matcher. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/player-division-curve-v1.css?v=20260917-1';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/player-division-curve-v1.js?v=20260917-1';
  script.defer = true;
  document.head.appendChild(script);
})();
