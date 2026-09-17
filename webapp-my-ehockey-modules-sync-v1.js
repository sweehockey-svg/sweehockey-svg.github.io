(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const MILESTONE_ID = 'seh-my-career-milestones';
  const DIVISION_ID = 'seh-my-division-journey';
  const TEAMMATE_ID = 'seh-my-teammates';
  let timer = 0;
  let pulseTimer = 0;

  function normalizeInternalLinks(root) {
    if (!root) return;
    for (const link of root.querySelectorAll('a[href^="/#/spelare/"]')) {
      const href = String(link.getAttribute('href') || '');
      if (href.startsWith('/#/')) link.setAttribute('href', href.slice(1));
    }
  }

  function pulseDivision(root) {
    if (!root || root.querySelector(`#${DIVISION_ID}`)) return;
    root.classList.add('seh-me-modules-sync-pulse');
    requestAnimationFrame(() => root.classList.remove('seh-me-modules-sync-pulse'));
  }

  function sync() {
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;
    if (!root.querySelector('.seh-me-career-section')) return;

    normalizeInternalLinks(root);

    if (!root.querySelector(`#${MILESTONE_ID}`) && typeof window.SEH_REFRESH_MY_MILESTONES === 'function') {
      window.SEH_REFRESH_MY_MILESTONES();
    }
    if (!root.querySelector(`#${TEAMMATE_ID}`) && typeof window.SEH_REFRESH_MY_TEAMMATES === 'function') {
      window.SEH_REFRESH_MY_TEAMMATES();
    }
    pulseDivision(root);

    clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(() => {
      const current = document.getElementById(ROOT_ID);
      if (!current?.classList.contains('show')) return;
      normalizeInternalLinks(current);
      if (!current.querySelector(`#${MILESTONE_ID}`) && typeof window.SEH_REFRESH_MY_MILESTONES === 'function') window.SEH_REFRESH_MY_MILESTONES();
      if (!current.querySelector(`#${TEAMMATE_ID}`) && typeof window.SEH_REFRESH_MY_TEAMMATES === 'function') window.SEH_REFRESH_MY_TEAMMATES();
      pulseDivision(current);
    }, 650);
  }

  function schedule(delay = 60) {
    clearTimeout(timer);
    timer = window.setTimeout(sync, delay);
  }

  const observer = new MutationObserver(mutations => {
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;
    const relevant = mutations.some(mutation => {
      const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
      if (!target) return false;
      return !target.closest?.(`#${MILESTONE_ID}, #${DIVISION_ID}, #${TEAMMATE_ID}`);
    });
    if (relevant) schedule(80);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  document.addEventListener('click', event => {
    if (event.target.closest?.('#seh-my-profile')) schedule(120);
  }, true);

  window.addEventListener('pageshow', () => schedule(100));
  window.addEventListener('focus', () => schedule(100));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule(100);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(200), { once: true });
  else schedule(200);
})();
