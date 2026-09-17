(() => {
  'use strict';

  const ROOT_ID = 'seh-webapp-for-you';
  const CACHE_KEY = 'seh_for_you_render_cache_v1';
  const MAX_AGE_MS = 10 * 60 * 1000;

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!parsed || typeof parsed.html !== 'string' || !parsed.savedAt) return null;
      if (Date.now() - Number(parsed.savedAt) > MAX_AGE_MS) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function restore(root) {
    if (!root || root.dataset.instantCacheRestored === '1') return;
    if (!root.querySelector('.seh-for-you__loading')) return;
    const cached = readCache();
    if (!cached?.html) return;
    root.innerHTML = cached.html;
    root.dataset.ready = '1';
    root.dataset.instantCacheRestored = '1';
  }

  function save(root) {
    if (!root || root.querySelector('.seh-for-you__loading')) return;
    if (!root.querySelector('.seh-for-you__identity')) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        html: root.innerHTML,
        savedAt: Date.now()
      }));
    } catch (_) {}
  }

  function sync() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    restore(root);
    save(root);
  }

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }
})();
