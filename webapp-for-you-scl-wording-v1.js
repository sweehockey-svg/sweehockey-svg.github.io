(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  let timer = 0;

  function patch() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const cards = root.querySelectorAll('.seh-for-you__mini-grid .seh-for-you__mini');
    for (const card of cards) {
      const title = card.querySelector('strong');
      const text = card.querySelector('span');
      if (!title || !text) continue;
      if (String(title.textContent || '').trim() !== 'SCL 27') continue;
      text.textContent = 'Planerad start i början av oktober · närmast på tur';
    }
  }

  function schedule(delay = 40) {
    clearTimeout(timer);
    timer = window.setTimeout(patch, delay);
  }

  const observer = new MutationObserver(() => schedule());

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    schedule(100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
