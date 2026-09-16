const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = require('node:path').resolve(__dirname, '..');
const read = name => fs.readFileSync(root + '/' + name, 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 10));

(async () => {
  let handler, dbCalls = [];
  const server = stripTypeScriptTypes(read('supabase/functions/web-push/index.ts').replace(/^import .*;\n/, ''));
  vm.runInNewContext(server, {
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'test', PUSH_WEBHOOK_SECRET: 'hook-test' })[key] }, serve: fn => handler = fn },
    webpush: {}, EdgeRuntime: { waitUntil: () => {} }, Request, Response, URL, AbortSignal, TextEncoder, crypto,
    console, fetch: async (url, options) => { dbCalls.push({ url, options }); return new Response(JSON.stringify([{ public_key: 'public-only', private_key: 'must-not-leak' }])); }
  });
  const call = (action, method = 'GET', headers = {}, body) => handler(new Request('https://edge.test/web-push/' + action, { method, headers, body: body ? JSON.stringify(body) : undefined }));
  assert.equal((await call('config')).status, 403);
  assert.equal((await call('send', 'POST')).status, 401);
  const origin = { origin: 'https://www.svenskehockey.se' };
  assert.equal((await call('subscription','DELETE',origin)).status,401);
  const config = await call('config','GET',origin);
  assert.deepEqual(await config.json(), { publicKey: 'public-only' });
  const authorized = { ...origin, 'x-seh-push-token': 'a'.repeat(64) };
  const before = dbCalls.length;
  assert.equal((await call('subscription','POST',authorized,{ subscription: { endpoint: 'https://127.0.0.1/private', keys: {} } })).status,400);
  assert.equal(dbCalls.length,before);
  assert.equal((await call('subscription','DELETE',authorized)).status,200);
  assert.match(dbCalls.at(-1).url, /id=eq\.[a-f0-9]{64}$/);
  assert.ok(!dbCalls.at(-1).url.includes('a'.repeat(64)));

  const listeners = {}, notifications = [], opened = [];
  const self = { location: { origin: 'https://www.svenskehockey.se' }, addEventListener: (name, cb) => listeners[name] = cb,
    registration: { showNotification: async (...args) => notifications.push(args) },
    clients: { matchAll: async () => [], openWindow: async url => opened.push(url) } };
  vm.runInNewContext(read('webapp-sw.js'), { self, URL, Response, fetch });
  let pending;
  listeners.push({ data: { json: () => ({title:'Test',url:'/?webapp=1#/nyheter'}) }, waitUntil: p => pending=p }); await pending;
  assert.equal(notifications[0][0], 'Test');
  listeners.notificationclick({notification:{close(){},data:{url:'https://evil.test/'}},waitUntil:p=>pending=p}); await pending;
  assert.equal(opened[0],'https://www.svenskehockey.se/?webapp=1#/');

  const storage = new Map(), calls = []; let browserSub = null, failSave = false;
  const sub = { toJSON: () => ({ endpoint:'https://web.push.apple.com/test' }), unsubscribe:async()=>{browserSub=null;return true;} };
  const registration = { pushManager: {getSubscription:async()=>browserSub,subscribe:async()=>{calls.push('subscribe');return browserSub=sub;} } };
  const window = { EHOCKEY_CONFIG:{supabaseUrl:'https://db.test',supabasePublishableKey:'public'},PushManager:{} };
  const Notification = {permission:'default',requestPermission(){calls.push('permission');this.permission='granted';return Promise.resolve('granted');}};
  window.Notification = Notification;
  vm.runInNewContext(read('webapp-push.js'), {
    window, Notification, navigator:{userAgent:'iPhone',standalone:true,serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}},
    document:{getElementById:()=>null,querySelectorAll:()=>[]}, localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    isSecureContext:true,matchMedia:()=>({matches:true}),crypto,Uint8Array,atob,AbortSignal,
    fetch:async(url,options)=>{ calls.push(options.method); if(failSave && options.method==='POST')return new Response('{}',{status:500}); return new Response(JSON.stringify({publicKey:btoa('test')})); }
  });
  await flush(); calls.length=0;
  const enabling=window.SehWebPush.toggle();
  assert.equal(calls[0],'permission','Permission must be requested synchronously in click handler');
  await enabling; assert.equal(browserSub,sub);
  await window.SehWebPush.topic('news');
  assert.equal(JSON.parse(storage.get('seh_app_push_preferences_v1')).news,false);
  failSave=true; await window.SehWebPush.topic('news');
  assert.equal(JSON.parse(storage.get('seh_app_push_preferences_v1')).news,false,'Failed preference save must not change UI state');
  await window.SehWebPush.toggle(); assert.equal(browserSub,null);
  await window.SehWebPush.toggle(); assert.equal(browserSub,null,'Failed registration must unsubscribe');
  console.log('PASS: authorization, private key isolation, endpoint validation, service worker, iOS permission order, category rollback, enable/disable');
})().catch(error=>{console.error(error);process.exitCode=1;});
