(function () {
  'use strict';
  if (window.SehNative || window.Capacitor?.isNativePlatform?.()) return;
  const requested = new URLSearchParams(location.search).get('webapp');
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const ua = String(navigator.userAgent || '');
  const uaDataMobile = navigator.userAgentData?.mobile === true;
  const phoneUa = /iPhone|iPod|Windows Phone|IEMobile|Android.*Mobile/i.test(ua);
  const phoneFallback = !/iPad|Tablet/i.test(ua) &&
    navigator.maxTouchPoints > 0 &&
    Math.min(Number(screen.width) || 9999, Number(screen.height) || 9999) <= 600;
  const mobilePhone = uaDataMobile || phoneUa || phoneFallback;
  let preview = false;
  let oauthWebappReturn = false;
  try {
    const rawOauthReturn =
      localStorage.getItem('seh_webapp_oauth_return') ||
      localStorage.getItem('seh_oauth_return') ||
      '';
    if (rawOauthReturn) {
      const savedOauthReturn = JSON.parse(rawOauthReturn);
      oauthWebappReturn = Boolean(
        savedOauthReturn?.webapp === true &&
        Date.now() - Number(savedOauthReturn?.savedAt || 0) <= 10 * 60 * 1000
      );
    }
  } catch (_) {}
  try {
    if (requested === '0') {
      sessionStorage.removeItem('seh_webapp_preview');

      // Explicit exit always wins over preview/standalone detection.
      // This lets the iPhone landing page return to the normal website
      // instead of immediately booting the web-app shell again.
      if (location.search.includes('webapp=0')) {
        const cleanUrl = location.pathname + (location.hash || '#/');
        history.replaceState(null, '', cleanUrl);
      }
      return;
    }
    if (requested === '1') sessionStorage.setItem('seh_webapp_preview', '1');
    preview = sessionStorage.getItem('seh_webapp_preview') === '1' || oauthWebappReturn;
  } catch (_) {
    if (requested === '0') return;
  }
  if (!standalone && requested !== '1' && !preview && !mobilePhone) return;
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
    script.src = '/webapp-shell.js?v=20260918-current-status-v1';
    script.onerror = function () { document.documentElement.classList.remove('seh-web-app'); };
    const push = document.createElement('script');
    push.src = '/webapp-push.js?v=1';
    push.onload = push.onerror = function () { document.head.appendChild(script); };
    document.head.appendChild(push);
  }, 100);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/webapp-sw.js', { scope: '/', updateViaCache: 'none' }).catch(console.warn);
  }
}());
