(() => {
  'use strict';

  const FOR_YOU_ROOT = '#seh-webapp-for-you';
  const BUILDS_ROUTE = '#/sasong/ecl27winter';

  function openAllBuilds() {
    const target = new URL(location.href);
    target.searchParams.delete('ecl27lag');
    target.hash = BUILDS_ROUTE;
    location.href = `${target.pathname}${target.search}${target.hash}`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.(`${FOR_YOU_ROOT} [data-fy-action="builds"]`);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openAllBuilds();
  }, true);
})();
