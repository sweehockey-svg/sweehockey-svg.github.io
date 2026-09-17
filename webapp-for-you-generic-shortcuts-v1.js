(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  let timer = 0;

  function patch() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.ready !== '1') return;

    const teamShortcut = root.querySelector('.seh-for-you__shortcuts [data-fy-action="team"]');
    const hasVerifiedTeam = Boolean(teamShortcut && !teamShortcut.disabled && Number(teamShortcut.dataset.teamId) > 0);

    if (hasVerifiedTeam) return;

    if (teamShortcut) {
      teamShortcut.textContent = 'Mitt lag';
      teamShortcut.disabled = true;
      teamShortcut.removeAttribute('data-team-id');
      teamShortcut.removeAttribute('data-route');
    }

    const feedLink = root.querySelector('.seh-for-you__feed-head button[data-fy-action]');
    if (feedLink) {
      feedLink.textContent = 'Tävlingar →';
      feedLink.dataset.fyAction = 'competitions';
      feedLink.removeAttribute('data-route');
    }

    const shortcuts = Array.from(root.querySelectorAll('.seh-for-you__shortcuts button'));
    for (const shortcut of shortcuts) {
      if (shortcut === teamShortcut) continue;
      const action = String(shortcut.dataset.fyAction || '');
      const text = String(shortcut.textContent || '').trim();
      if (action === 'builds' || action === 'competition' || /^(Lagbygge|ECL 27|Slutspel)$/i.test(text)) {
        shortcut.textContent = 'Tävlingar';
        shortcut.dataset.fyAction = 'competitions';
        shortcut.removeAttribute('data-route');
      }
    }
  }

  function schedule(delay = 50) {
    clearTimeout(timer);
    timer = window.setTimeout(patch, delay);
  }

  const observer = new MutationObserver(() => schedule(60));

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'data-ready', 'data-fy-action', 'data-team-id']
    });
    schedule(200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
