(() => {
  'use strict';

  const REFRESH_MS = 300000;
  let client = null;
  let timer = 0;
  let busy = false;

  function getClient() {
    if (client) return client;
    const cfg = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
    const url = String(cfg.supabaseUrl || cfg.SUPABASE_URL || '').trim();
    const key = String(cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || '').trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function nav() {
    return document.querySelector('.seh-header .seh-nav');
  }

  function hideLegacyAdminLinks() {
    document.querySelectorAll('.seh-nav-auth--writer,.seh-nav-auth--admin').forEach((node) => {
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
    });
  }

  function ensureBadge() {
    const root = nav();
    if (!root) return null;
    let badge = root.querySelector('#sehNavAdminPending');
    if (badge) return badge;

    badge = document.createElement('a');
    badge.id = 'sehNavAdminPending';
    badge.className = 'seh-nav-admin-pending';
    badge.href = '#/admin/spelare';
    badge.hidden = true;
    badge.setAttribute('aria-label', 'Väntande adminärenden');
    badge.innerHTML = '<span id="sehNavAdminPendingCount">0</span>';

    const sec = root.querySelector('.seh-nav-sec');
    if (sec) sec.insertAdjacentElement('afterend', badge);
    else root.appendChild(badge);
    return badge;
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    hideLegacyAdminLinks();
    const badge = ensureBadge();
    if (!badge) { busy = false; return; }

    try {
      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas');

      const sessionResult = await sb.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      const session = sessionResult.data?.session || null;
      if (!session?.user) {
        badge.hidden = true;
        return;
      }

      const writer = await sb.rpc('seh_current_writer');
      if (writer.error) throw writer.error;
      const writerRow = Array.isArray(writer.data) ? writer.data[0] : writer.data;
      if (String(writerRow?.role || '').toLowerCase() !== 'admin') {
        badge.hidden = true;
        return;
      }

      const pending = await sb.rpc('seh_admin_pending_counts');
      if (pending.error) throw pending.error;
      const row = Array.isArray(pending.data) ? (pending.data[0] || {}) : (pending.data || {});
      const total = Math.max(0, Number(row.total) || 0);
      const count = badge.querySelector('#sehNavAdminPendingCount');
      if (count) count.textContent = total > 99 ? '99+' : String(total);
      badge.setAttribute('aria-label', `${total} väntande adminärenden`);
      badge.hidden = false;
    } catch (_) {
      badge.hidden = true;
    } finally {
      busy = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = window.setTimeout(async function tick() {
      await refresh();
      timer = window.setTimeout(tick, REFRESH_MS);
    }, 500);
  }

  const observer = new MutationObserver(() => {
    hideLegacyAdminLinks();
    const badgeMissing = !document.getElementById('sehNavAdminPending');
    if (badgeMissing && ensureBadge()) refresh();
  });

  document.addEventListener('DOMContentLoaded', () => {
    hideLegacyAdminLinks();
    ensureBadge();
    refresh();
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  });

  window.addEventListener('hashchange', () => {
    hideLegacyAdminLinks();
    ensureBadge();
    refresh();
  });
})();
