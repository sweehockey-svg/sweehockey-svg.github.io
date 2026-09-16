import webpush from 'npm:web-push@3.6.7';

const origins = new Set(['https://www.svenskehockey.se', 'https://svenskehockey.se', 'https://sweehockey-svg.github.io']);
const topics = ['important', 'news', 'sec', 'ecl'];
const headers = { 'content-type': 'application/json' };
async function db(path: string, method = 'GET', body?: unknown, prefer = 'return=minimal') {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/' + path, {
    method, headers: { ...headers, apikey: key, authorization: `Bearer ${key}`, Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('Database operation failed: ' + response.status);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
async function keys() {
  let rows = await db('seh_web_push_keys?id=eq.1');
  if (!rows.length) {
    const pair = webpush.generateVAPIDKeys();
    await db('seh_web_push_keys?on_conflict=id', 'POST', { id: 1, public_key: pair.publicKey, private_key: pair.privateKey }, 'resolution=ignore-duplicates');
    rows = await db('seh_web_push_keys?id=eq.1');
  }
  return rows[0];
}
function validSubscription(s: any) {
  try {
    const url = new URL(s.endpoint);
    const host = url.hostname;
    const allowed = host === 'web.push.apple.com' || host.endsWith('.push.apple.com') || host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com';
    return allowed && url.protocol === 'https:' && !url.port && !url.username && !url.password &&
      s.endpoint.length < 2048 && /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh) && /^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth);
  } catch (_) { return false; }
}
async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
async function deliver(record: any, payload: unknown, pair: any) {
  if (!validSubscription(record.subscription)) throw new Error('Invalid stored subscription');
  const details = webpush.generateRequestDetails(record.subscription, JSON.stringify(payload), {
    TTL: 86400, urgency: 'normal', contentEncoding: 'aes128gcm',
    vapidDetails: { subject: 'mailto:svenskehockey@gmail.com', publicKey: pair.public_key, privateKey: pair.private_key }
  });
  const response = await fetch(details.endpoint, { method: 'POST', headers: details.headers, body: details.body, redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (response.status === 404 || response.status === 410) {
    await db('seh_web_push_subscriptions?id=eq.' + record.id, 'DELETE');
    return;
  }
  if (!response.ok) throw new Error('Push service: ' + response.status);
}
function equal(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function send(payload: any) {
  const a = payload.record || {};
  if (payload.type !== 'UPDATE' || payload.schema !== 'public' || payload.table !== 'seh_news_articles' ||
      a.status !== 'published' || payload.old_record?.status === 'published' || !a.id || !a.published_at) return { skipped: true };
  const tag = String(a.tag || '').trim().toLowerCase();
  const topic = /^sec\b|svenska ehockey cup/.test(tag) ? 'sec' : /^ecl\b|lagbygge/.test(tag) ? 'ecl' : 'news';
  const eventKey = `web-news:${a.id}:${a.published_at}`;
  const claimed = await db('rpc/seh_claim_push_delivery', 'POST', { p_event_key: eventKey, p_article_id: Number(a.id), p_topic: 'seh_' + topic });
  if (!claimed) return { skipped: true };
  let sent = 0, failed = 0;
  try {
    const pair = await keys();
    let cursor = '';
    while (true) {
      const rows = await db('seh_web_push_subscriptions?topics=cs.' + encodeURIComponent('{'+topic+'}') + '&order=id&limit=100' + (cursor ? '&id=gt.'+cursor : ''));
      if (!rows.length) break;
      for (let i = 0; i < rows.length; i += 10) {
        await Promise.all(rows.slice(i, i + 10).map(async (row: any) => {
          // Per-device claims prevent duplicate notifications if the publication is retried.
          const deviceKey = eventKey + ':' + row.id;
          const claim = await db('rpc/seh_claim_push_delivery', 'POST', { p_event_key: deviceKey, p_article_id: Number(a.id), p_topic: 'seh_' + topic });
          if (!claim) return;
          try {
            await deliver(row, { title: String(a.title || 'Svensk eHockey').slice(0,100), body: String(a.excerpt || 'En ny artikel har publicerats.').slice(0,180), tag: eventKey,
              url: '/?webapp=1#/nyheter?article=' + encodeURIComponent(String(a.slug || '')) }, pair);
            await db('rpc/seh_finish_push_delivery', 'POST', { p_event_key: deviceKey, p_status: 'sent' }); sent++;
          } catch (_) {
            failed++;
            await db('rpc/seh_finish_push_delivery', 'POST', { p_event_key: deviceKey, p_status: 'failed', p_error: 'Web Push delivery failed' });
          }
        }));
      }
      cursor = rows[rows.length - 1].id;
    }
    await db('rpc/seh_finish_push_delivery', 'POST', { p_event_key: eventKey, p_status: failed ? 'failed' : 'sent', p_error: failed ? `${failed} web deliveries failed` : null });
    return { sent, failed };
  } catch (_) {
    await db('rpc/seh_finish_push_delivery', 'POST', { p_event_key: eventKey, p_status: 'failed', p_error: 'Web Push dispatch failed' });
    throw new Error('Dispatch failed');
  }
}
Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const cors = origins.has(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, apikey, x-seh-push-token', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'vary': 'Origin' } : {};
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, ...cors, 'cache-control': 'no-store' } });
  const action = new URL(request.url).pathname.split('/').pop();
  if (request.method === 'OPTIONS') return new Response(null, { status: origins.has(origin) ? 204 : 403, headers: cors });
  try {
    if (action === 'send') {
      const secret = Deno.env.get('PUSH_WEBHOOK_SECRET') || '';
      if (request.method !== 'POST' || !secret || !equal(secret, request.headers.get('x-seh-push-secret') || '')) return json({ error: 'Unauthorized' },401);
      const payload = await request.json();
      EdgeRuntime.waitUntil(send(payload).catch(() => console.error('Web Push dispatch failed; see delivery status')));
      return json({ accepted: true },202);
    }
    if (!origins.has(origin)) return json({ error: 'Origin not allowed' },403);
    if (action === 'config' && request.method === 'GET') return json({ publicKey: (await keys()).public_key });
    if (action !== 'subscription' || !['POST','DELETE'].includes(request.method)) return json({ error: 'Not found' },404);
    // A random 256-bit device capability is required, including for guests. Only its hash is stored.
    const token = request.headers.get('x-seh-push-token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Invalid device token' },401);
    const id = await hash(token);
    if (request.method === 'DELETE') { await db('seh_web_push_subscriptions?id=eq.' + id, 'DELETE'); return json({ ok: true }); }
    const text = await request.text();
    if (text.length > 8192) return json({ error: 'Payload too large' },413);
    const body = JSON.parse(text);
    if (!validSubscription(body.subscription)) return json({ error: 'Invalid subscription' },400);
    const selected = topics.filter(t => body.preferences?.[t] !== false);
    await db('seh_web_push_subscriptions?on_conflict=id', 'POST', { id, endpoint: body.subscription.endpoint,
      subscription: { endpoint: body.subscription.endpoint, keys: body.subscription.keys }, topics: selected, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    return json({ ok: true });
  } catch (_) { return json({ error: 'Push operation failed. Please retry.' },500); }
});
