(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  let timer = 0;

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setAction(node, value) {
    if (node && node.dataset.fyAction !== value) node.dataset.fyAction = value;
  }

  function patch() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const teamShortcut = root.querySelector('.seh-for-you__shortcuts [data-fy-action="team"]');
    const hasVerifiedTeam = Boolean(
      teamShortcut &&
      !teamShortcut.disabled &&
      Number(teamShortcut.dataset.teamId) > 0
    );

    if (hasVerifiedTeam) return;

    if (teamShortcut) {
      setText(teamShortcut, 'Mitt lag');
      if (!teamShortcut.disabled) teamShortcut.disabled = true;
      teamShortcut.removeAttribute('data-team-id');
      teamShortcut.removeAttribute('data-route');
    }

    const feedLink = root.querySelector('.seh-for-you__feed-head button[data-fy-action]');
    if (feedLink) {
      const action = String(feedLink.dataset.fyAction || '');
      const text = String(feedLink.textContent || '').trim();
      if (action === 'builds' || action === 'competition' || /lagbygge|ECL\s*27|slutspel/i.test(text)) {
        setText(feedLink, 'Tävlingar →');
        setAction(feedLink, 'competitions');
        feedLink.removeAttribute('data-route');
      }
    }

    const shortcuts = Array.from(root.querySelectorAll('.seh-for-you__shortcuts button'));
    for (const shortcut of shortcuts) {
      if (shortcut === teamShortcut) continue;
      const action = String(shortcut.dataset.fyAction || '');
      const text = String(shortcut.textContent || '').trim();
      if (action === 'builds' || action === 'competition' || /^(Lagbygge|ECL 27|Slutspel)$/i.test(text)) {
        setText(shortcut, 'Tävlingar');
        setAction(shortcut, 'competitions');
        shortcut.removeAttribute('data-route');
      }
    }
  }

  function schedule(delay = 40) {
    clearTimeout(timer);
    timer = window.setTimeout(patch, delay);
  }

  const observer = new MutationObserver(() => schedule(40));

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'data-fy-action', 'data-team-id', 'data-ready']
    });
    patch();
    window.setTimeout(patch, 250);
    window.setTimeout(patch, 1000);
  }

  window.addEventListener('focus', () => schedule(20));
  window.addEventListener('hashchange', () => schedule(80));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
