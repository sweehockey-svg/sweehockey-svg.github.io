(function () {
  'use strict';
  const PREFS = 'seh_app_push_preferences_v1', TOKEN = 'seh_web_push_capability_v1';
  let registration, subscription, publicKey, busy = true, error = '';
  const defaults = { important: true, news: true, sec: true, ecl: true };
  function preferences() { try { return { ...defaults, ...JSON.parse(localStorage.getItem(PREFS) || '{}') }; } catch (_) { return { ...defaults }; } }
  function limitation() {
    if (!isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'Webbpush stöds inte här. På iPhone behövs iOS 16.4 eller senare och webbappen på hemskärmen.';
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches) return 'Lägg till webbappen på hemskärmen och öppna den där för att aktivera notiser.';
    return '';
  }
  function capability() {
    let value = localStorage.getItem(TOKEN);
    if (!value) { value = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem(TOKEN, value); }
    return value;
  }
  async function api(path, method = 'GET', body) {
    const config = window.EHOCKEY_CONFIG || {};
    const response = await fetch(config.supabaseUrl + '/functions/v1/web-push/' + path, {
      method, headers: { apikey: config.supabasePublishableKey, 'content-type': 'application/json', ...(method === 'GET' ? {} : { 'x-seh-push-token': capability() }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000), credentials: 'omit'
    });
    if (!response.ok) throw new Error('Kunde inte spara notisinställningen. Kontrollera anslutningen och försök igen.');
    return response.json();
  }
  function render() {
    const enabled = !!subscription && Notification.permission === 'granted';
    const button = document.getElementById('seh-notify-toggle');
    if (button) { button.disabled = busy || !!limitation(); button.classList.toggle('on', enabled); button.setAttribute('aria-checked', String(enabled)); button.setAttribute('role', 'switch'); }
    const status = document.getElementById('seh-notify-status');
    if (status) { status.textContent = error || limitation() || (busy ? 'Kontrollerar notiser…' : enabled ? 'Aktiverade på den här enheten.' : 'Aktivera nyheter och tävlingsnotiser.'); status.dataset.tone = error ? 'error' : enabled ? 'success' : ''; }
    const panel = document.getElementById('seh-push-topics'); if (panel) panel.hidden = !enabled;
    const prefs = preferences();
    document.querySelectorAll('[data-seh-push-topic]').forEach(b => { b.disabled = busy; b.setAttribute('aria-pressed', String(prefs[b.dataset.sehPushTopic] !== false)); b.querySelector('.seh-switch')?.classList.toggle('on', prefs[b.dataset.sehPushTopic] !== false); });
  }
  async function save(prefs = preferences()) { await api('subscription', 'POST', { subscription: subscription.toJSON(), preferences: prefs }); }
  async function toggle() {
    if (busy || limitation()) return;
    error = '';
    // Must run directly in the click handler on iOS, before any network await.
    const permission = !subscription ? Notification.requestPermission() : null;
    busy = true; render();
    try {
      if (subscription) {
        await api('subscription', 'DELETE');
        if (!await subscription.unsubscribe()) throw new Error('Kunde inte avsluta prenumerationen. Försök igen.');
        subscription = null;
      } else {
        if (await permission !== 'granted') throw new Error('Notiser tilläts inte. Ändra behörigheten i enhetens inställningar om du vill försöka igen.');
        if (!registration) { await navigator.serviceWorker.register('/webapp-sw.js', { scope: '/' }); registration = await navigator.serviceWorker.ready; }
        if (!publicKey) publicKey = (await api('config')).publicKey;
        const binary = atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(binary, c => c.charCodeAt(0)) });
        try { await save(); } catch (e) { await subscription.unsubscribe(); subscription = null; throw e; }
      }
    } catch (e) { error = e.message || 'Notiser kunde inte ändras.'; }
    finally { busy = false; render(); }
  }
  async function topic(key) {
    if (busy || !subscription || !(key in defaults)) return;
    busy = true; error = ''; render();
    const prefs = preferences(); prefs[key] = prefs[key] === false;
    try { await save(prefs); localStorage.setItem(PREFS, JSON.stringify(prefs)); }
    catch (e) { error = e.message; }
    finally { busy = false; render(); }
  }
  window.SehWebPush = { render, toggle, topic };
  (async function () {
    try {
      if (limitation()) return;
      registration = await navigator.serviceWorker.register('/webapp-sw.js', { scope: '/', updateViaCache: 'none' });
      registration = await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.getSubscription();
      publicKey = (await api('config')).publicKey;
      if (subscription) {
        // Lost local capability: renew instead of taking over another device's record.
        if (!localStorage.getItem(TOKEN)) { await subscription.unsubscribe(); subscription = null; }
        else await save();
      }
    } catch (e) { error = e.message || 'Kunde inte kontrollera pushnotiser.'; }
    finally { busy = false; render(); }
  }());
}());
