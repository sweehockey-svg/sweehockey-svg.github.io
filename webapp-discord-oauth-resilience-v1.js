(() => {
  'use strict';

  const RETURN_KEY = 'seh_webapp_oauth_return';
  let client = null;
  let busy = false;

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

  function isNative() {
    return Boolean(window.SehNative || window.Capacitor?.isNativePlatform?.());
  }

  function cfg() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (window.__SEH_NATIVE_SUPABASE_CLIENT__) return window.__SEH_NATIVE_SUPABASE_CLIENT__;
    if (client) return client;
    const config = cfg();
    const url = String(config.supabaseUrl || config.SUPABASE_URL || '').trim();
    const key = String(config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY || '').trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function isDiscordUser(user) {
    if (!user) return false;
    if (String(user.app_metadata?.provider || '').toLowerCase() === 'discord') return true;
    if ((user.app_metadata?.providers || []).some(value => String(value).toLowerCase() === 'discord')) return true;
    return (user.identities || []).some(identity => String(identity?.provider || '').toLowerCase() === 'discord');
  }

  function authRedirect() {
    const target = new URL(location.href);
    target.hash = '';
    target.searchParams.delete('webapp');
    target.searchParams.set('webapp', '1');
    return target.href;
  }

  function makePlaceholder() {
    let popup = null;
    try {
      popup = window.open('', '_blank');
      if (!popup) return null;
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Öppnar Discord…</title><style>html,body{margin:0;min-height:100%;background:#050710;color:#f4f1e9;font-family:Arial,sans-serif}body{display:grid;place-items:center;padding:24px;box-sizing:border-box}.box{text-align:center;max-width:340px}.mark{width:54px;height:54px;margin:0 auto 18px;border:2px solid #5865f2;border-top-color:transparent;border-radius:50%;animation:s .8s linear infinite}h1{font-size:20px;margin:0 0 8px}p{margin:0;color:#9da4af;font-size:13px;line-height:1.45}@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div class="box"><div class="mark"></div><h1>Öppnar Discord</h1><p>Svensk eHockey ligger kvar i den andra fliken medan du loggar in.</p></div></body></html>`);
      popup.document.close();
    } catch (_) {}
    return popup;
  }

  function closePopup(popup) {
    try { if (popup && !popup.closed) popup.close(); } catch (_) {}
  }

  async function startLogin(popup) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase Auth kunde inte startas.');

    const sessionResult = await sb.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const existing = sessionResult.data?.session || null;

    if (existing?.user && isDiscordUser(existing.user)) {
      closePopup(popup);
      location.reload();
      return;
    }

    if (existing?.user) {
      const signOutResult = await sb.auth.signOut();
      if (signOutResult.error) throw signOutResult.error;
    }

    localStorage.setItem(RETURN_KEY, JSON.stringify({ hash: '#/', savedAt: Date.now(), webapp: true }));

    const result = await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: authRedirect(),
        skipBrowserRedirect: true
      }
    });
    if (result.error) throw result.error;
    if (!result.data?.url) throw new Error('Discord-inloggningen saknar startadress.');

    if (popup && !popup.closed) {
      popup.location.replace(result.data.url);
      try { popup.focus(); } catch (_) {}
      return;
    }

    // Popup blocker: fall back to the old same-tab behaviour rather than fail login.
    location.assign(result.data.url);
  }

  document.addEventListener('click', event => {
    if (!isWebApp() || isNative()) return;
    const button = event.target.closest?.('#seh-ob-discord, [data-v760-login]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (busy) return;

    busy = true;
    const popup = makePlaceholder();
    startLogin(popup)
      .catch(error => {
        closePopup(popup);
        try { localStorage.removeItem(RETURN_KEY); } catch (_) {}
        alert(`Discord-inloggningen kunde inte starta: ${error?.message || error}`);
      })
      .finally(() => { busy = false; });
  }, true);
})();
