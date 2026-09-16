(function () {
  'use strict';
  if (window.SehNative || window.Capacitor?.isNativePlatform?.()) return;
  const requested = new URLSearchParams(location.search).get('webapp');
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  let preview = false;
  try {
    if (requested === '0') sessionStorage.removeItem('seh_webapp_preview');
    if (requested === '1') sessionStorage.setItem('seh_webapp_preview', '1');
    preview = sessionStorage.getItem('seh_webapp_preview') === '1';
  } catch (_) {}
  if (!standalone && requested !== '1' && !preview) return;
  if (window.__SEH_WEB_APP__) return;
  window.__SEH_WEB_APP__ = true;
  document.documentElement.classList.add('seh-web-app');
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/webapp.css?v=1';
  document.head.appendChild(style);
  // Defer until the site's existing initialization and observer guards finish.
  setTimeout(function () {
    const script = document.createElement('script');
    script.src = '/webapp-shell.js?v=1';
    script.onerror = function () { document.documentElement.classList.remove('seh-web-app'); };
    document.head.appendChild(script);
  }, 100);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/webapp-sw.js', { scope: '/', updateViaCache: 'none' }).catch(console.warn);
  }
}());
