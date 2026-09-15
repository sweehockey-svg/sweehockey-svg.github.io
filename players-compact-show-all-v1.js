/* Svensk eHockey – kompakt spelarläge visar alltid hela listan. */
(() => {
  "use strict";

  let applying = false;

  function applyCompactShowAll() {
    if (applying) return;
    const route = document.querySelector('#spaRouteView[data-route="players"]');
    if (!route) return;

    const compact = route.querySelector('input[type="checkbox"]');
    const grid = route.querySelector('.player-directory__grid');
    if (!compact || !compact.checked || !grid?.classList.contains('is-compact')) return;

    const buttons = [...route.querySelectorAll('button')];
    const showAll = buttons.find(button => button.textContent.trim() === 'Visa alla');
    if (!showAll) return;

    applying = true;
    showAll.click();
    window.setTimeout(() => { applying = false; }, 0);
  }

  const observer = new MutationObserver(() => applyCompactShowAll());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('change', event => {
    if (event.target?.matches('#spaRouteView[data-route="players"] input[type="checkbox"]')) {
      window.setTimeout(applyCompactShowAll, 0);
    }
  });

  window.addEventListener('hashchange', () => window.setTimeout(applyCompactShowAll, 0));
  window.addEventListener('load', () => window.setTimeout(applyCompactShowAll, 0));
})();
