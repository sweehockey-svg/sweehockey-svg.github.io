(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const MILESTONE_ID = 'seh-my-career-milestones';
  const DIVISION_ID = 'seh-my-division-journey';
  const TEAMMATE_ID = 'seh-my-teammates';
  let timer = 0;
  let followupTimer = 0;
  let syncing = false;

  function normalizeInternalLinks(root) {
    if (!root) return;
    for (const link of root.querySelectorAll('a[href^="/#/spelare/"]')) {
      const href = String(link.getAttribute('href') || '');
      if (href.startsWith('/#/')) link.setAttribute('href', href.slice(1));
    }
  }

  function isLinked(root) {
    if (!root) return false;
    if (root.querySelector('.seh-me-pill.ok')) return true;
    try {
      const profile = JSON.parse(localStorage.getItem('seh_app_my_profile_v1') || 'null');
      return Boolean(
        profile?.serverLinked === true ||
        profile?.linked === true ||
        profile?.playerKey ||
        profile?.player_key ||
        profile?.key
      );
    } catch (_) {
      return false;
    }
  }

  function makeSection(id, className, label, loadingHtml) {
    const section = document.createElement('section');
    section.id = id;
    section.className = `seh-me-section ${className}`;
    section.setAttribute('aria-label', label);
    section.dataset.ready = '0';
    section.dataset.loading = '0';
    section.innerHTML = loadingHtml;
    return section;
  }

  function ensureSlots(root) {
    const career = root?.querySelector('.seh-me-career-section');
    if (!career || !isLinked(root)) return false;

    let milestone = root.querySelector(`#${MILESTONE_ID}`);
    if (!milestone) {
      milestone = makeSection(
        MILESTONE_ID,
        'seh-me-milestones',
        'Rekord och milstolpar',
        '<div class="seh-me-milestone-loading">Hämtar rekord & milstolpar…</div>'
      );
    }

    let division = root.querySelector(`#${DIVISION_ID}`);
    if (!division) {
      division = makeSection(
        DIVISION_ID,
        'seh-my-division-section',
        'Din ECL-divisionsresa',
        '<div class="seh-div-loading seh-div-loading--my">Hämtar din divisionsresa…</div>'
      );
    }

    let teammate = root.querySelector(`#${TEAMMATE_ID}`);
    if (!teammate) {
      teammate = makeSection(
        TEAMMATE_ID,
        'seh-me-teammates',
        'Spelat mest med',
        '<div class="seh-me-teammates-loading">Hämtar lagkamrater…</div>'
      );
    }

    if (career.nextElementSibling !== milestone) career.insertAdjacentElement('afterend', milestone);
    if (milestone.nextElementSibling !== division) milestone.insertAdjacentElement('afterend', division);
    if (division.nextElementSibling !== teammate) division.insertAdjacentElement('afterend', teammate);

    return true;
  }

  function refreshMissing(root) {
    const milestone = root.querySelector(`#${MILESTONE_ID}`);
    const teammate = root.querySelector(`#${TEAMMATE_ID}`);

    if (milestone?.dataset.ready !== '1' && milestone?.dataset.loading !== '1') {
      window.SEH_REFRESH_MY_MILESTONES?.();
    }
    if (teammate?.dataset.ready !== '1' && teammate?.dataset.loading !== '1') {
      window.SEH_REFRESH_MY_TEAMMATES?.();
    }

    const division = root.querySelector(`#${DIVISION_ID}`);
    if (division?.dataset.ready !== '1' && !division?.dataset.loadingKey && typeof window.SEH_REFRESH_MY_DIVISION_JOURNEY === 'function') {
      window.SEH_REFRESH_MY_DIVISION_JOURNEY();
    }
  }

  function sync() {
    if (syncing) return;
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;
    if (!root.querySelector('.seh-me-career-section')) return;

    syncing = true;
    try {
      normalizeInternalLinks(root);
      if (!ensureSlots(root)) return;
      refreshMissing(root);

      clearTimeout(followupTimer);
      followupTimer = window.setTimeout(() => {
        const current = document.getElementById(ROOT_ID);
        if (!current?.classList.contains('show')) return;
        normalizeInternalLinks(current);
        if (!ensureSlots(current)) return;
        refreshMissing(current);
      }, 500);
    } finally {
      syncing = false;
    }
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
      if (target.closest?.(`#${MILESTONE_ID}, #${DIVISION_ID}, #${TEAMMATE_ID}`)) return false;
      return Boolean(target.closest?.(`#${ROOT_ID}`) || mutation.target === root);
    });

    if (relevant) schedule(40);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  document.addEventListener('click', event => {
    if (event.target.closest?.('#seh-my-profile')) schedule(80);
  }, true);

  window.addEventListener('pageshow', () => schedule(80));
  window.addEventListener('focus', () => schedule(80));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule(80);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(120), { once: true });
  else schedule(120);
})();