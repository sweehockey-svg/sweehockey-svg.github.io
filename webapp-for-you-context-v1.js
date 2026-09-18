(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  let scheduled = 0;

  function patch() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.ready !== '1') return;

    const miniCards = Array.from(root.querySelectorAll('.seh-for-you__mini-grid .seh-for-you__mini'));
    if (miniCards.length < 2) return;

    const teamCard = miniCards[0];
    const secondary = miniCards[1];
    const teamKicker = teamCard.querySelector('small');
    const teamTitle = teamCard.querySelector('strong');
    const teamText = teamCard.querySelector('span');
    const secondaryKicker = secondary.querySelector('small');
    const secondaryTitle = secondary.querySelector('strong');
    const secondaryText = secondary.querySelector('span');

    const buildingMode = /free agents/i.test(secondaryKicker?.textContent || '') || /lagbygge/i.test(teamText?.textContent || '');

    if (buildingMode) {
      const isFreeAgent = /free agent/i.test(teamTitle?.textContent || '');
      if (teamKicker) teamKicker.textContent = isFreeAgent ? 'STATUS' : 'AKTUELLT LAG';
      if (teamText) {
        teamText.textContent = isFreeAgent
          ? 'Inte i ett aktivt lagbygge'
          : 'ECL 27 · aktuellt lagbygge';
      }

      if (secondaryKicker) secondaryKicker.textContent = 'NÄSTA TÄVLING';
      if (secondaryTitle) secondaryTitle.textContent = 'SCL 27 · 1 okt';
      if (secondaryText) secondaryText.textContent = 'Planerad start · ECL följer därefter';
      secondary.dataset.fyAction = 'next-competition';
      secondary.removeAttribute('data-route');

      const identityMeta = root.querySelector('.seh-for-you__identity > div > span');
      const teamName = String(teamTitle?.textContent || '').trim();
      if (identityMeta && teamName) {
        identityMeta.textContent = /free agent/i.test(teamName) ? 'Free Agent' : `ECL 27 lagbygge · ${teamName}`;
      }

      root.querySelectorAll('.seh-for-you__feed-row span').forEach(node => {
        if (/När du går med i ett aktuellt ECL 27-lag visas lagflödet här\./i.test(node.textContent || '')) {
          node.textContent = 'När du går med i ett aktivt lagbygge byts Free Agent-statusen automatiskt.';
        }
      });

      const feedLink = root.querySelector('.seh-for-you__feed-head [data-fy-action="builds"]');
      if (feedLink) feedLink.textContent = 'ECL 27 lagbygge →';

      const shortcut = root.querySelector('.seh-for-you__shortcuts [data-fy-action="builds"]');
      if (shortcut) shortcut.textContent = 'ECL 27';
    }
  }

  function schedule(delay = 60) {
    clearTimeout(scheduled);
    scheduled = window.setTimeout(patch, delay);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-fy-action="next-competition"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const candidates = Array.from(document.querySelectorAll('#seh-native-bottom button, #seh-native-bottom a, #seh-app-home button, #seh-app-home a'));
    const competitions = candidates.find(node => /tävlingar/i.test(String(node.textContent || node.getAttribute('aria-label') || '')));
    if (competitions) competitions.click();
  }, true);

  const observer = new MutationObserver(() => schedule(80));

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    schedule(250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
