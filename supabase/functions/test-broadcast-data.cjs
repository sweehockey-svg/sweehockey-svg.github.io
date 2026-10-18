const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
(async()=>{
 const {issueTicket,verifyTicket}=await import(pathToFileURL(__dirname+'/graphics-fetch/tickets.ts'));
 const id='12345678_532_2026-10-11_2026-10-15_1234567890abcdef',secret='test-signing-key-never-sent-to-browser',expires=new Date(Date.now()+3500000).toISOString();
 const token=await issueTicket(id,532,expires,secret);
 assert.equal((await verifyTicket(token,secret)).league,532);assert.equal(await verifyTicket(token,'wrong'),null);
 assert.equal(await verifyTicket(token.replace('ey','aa'),secret),null);assert.equal(await verifyTicket('',secret),null);
 await assert.rejects(issueTicket(id,529,expires,secret),/scope/);
 const clock=Date.now;try{Date.now=()=>clock()+4000000;assert.equal(await verifyTicket(token,secret),null);}finally{Date.now=clock;}
 const data={schema_version:1,league_id:532,expires_at:expires,fetched_at:new Date().toISOString(),weekly:{start:'2026-10-11',end:'2026-10-15',candidates:['not-public']},teams:[{sports_gamer_league_id:532,sports_gamer_team_id:1,team_name_in_league:'Canada',private_contact:'secret'}],players:[{sports_gamer_league_id:532,sports_gamer_team_id:1,sports_gamer_player_id:9804,display_gamertag:'Player',regular_points:31,player_city:'private-city',sports_gamer_user_id:12345}]};
 function setup(payload=data){
  let handler,calls=0;const source=fs.readFileSync(__dirname+'/broadcast-data/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInNewContext(source,{Deno:{env:{get:name=>name==='GITHUB_SYNC_TOKEN'?secret:undefined},serve:fn=>handler=fn},verifyTicket,unzipSync:()=>({'result.json':new TextEncoder().encode(JSON.stringify(payload))}),TextDecoder,Uint8Array,Response,Date,Map,Set,Object,Number,String,JSON,AbortSignal,fetch:async(url,options)=>{
   calls++;assert.equal(options.method,undefined,'Reader must never dispatch a workflow');
   const body=url.includes('/zip')?new Uint8Array(5):url.includes('/artifacts')?JSON.stringify({artifacts:[{id:2,name:'graphics-'+id,size_in_bytes:5}]}):JSON.stringify({workflow_runs:[{id:1,status:'completed',conclusion:'success',display_title:'Graphics fetch · '+id}]});
   return new Response(body,{status:200});
  }});return {request:body=>handler(new Request('https://example.test',{method:'POST',headers:{Origin:'https://swnworks.se'},body:JSON.stringify(body)})),calls:()=>calls};
 }
 const t=setup();assert.equal((await t.request({ticket:'bad'})).status,401);assert.equal(t.calls(),0);
 const response=await t.request({ticket:token});assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.data.players[0].regular_points,31);assert(!JSON.stringify(body).includes('private'));assert(!body.data.weekly);assert(!body.data.players[0].sports_gamer_user_id);
 assert.equal((await t.request({ticket:token})).status,200);assert.equal(t.calls(),3,'Cache should avoid another GitHub download');
 const wrong=setup({...data,league_id:529});assert.equal((await wrong.request({ticket:token})).status,502);
 const broadcastExpiry=new Date(clock()+8*3600000).toISOString();
 const longToken=await issueTicket(id,532,broadcastExpiry,secret);
 const longReader=setup({...data,broadcast_expires_at:broadcastExpiry});
 try{
  Date.now=()=>clock()+5*3600000;
  assert(await verifyTicket(longToken,secret),'Broadcast ticket must work after five hours');
  const fiveHours=await longReader.request({ticket:longToken});assert.equal(fiveHours.status,200);
  assert.equal((await fiveHours.json()).data.expires_at,broadcastExpiry,'OBS gets the broadcast expiry, not the one-hour graphics expiry');
  Date.now=()=>clock()+8*3600000+1000;
  assert.equal(await verifyTicket(longToken,secret),null);
  assert.equal((await longReader.request({ticket:longToken})).status,401);
 }finally{Date.now=clock;}
 await assert.rejects(issueTicket(id,532,new Date(clock()+9*3600000).toISOString(),secret),/scope/);
 assert.equal(fs.readFileSync(__dirname+'/graphics-fetch/tickets.ts','utf8'),fs.readFileSync(__dirname+'/broadcast-data/tickets.ts','utf8'),'Issuer and reader must use identical lifetime rules');
 console.log('Broadcast tickets and reader: signature, scope, expiry, anonymous signed read, no dispatch, public allowlist and memory cache passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
