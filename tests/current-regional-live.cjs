// Optional smoke test against public endpoints; never authenticates a user.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const key=process.env.SEH_PUBLIC_KEY;
if(!key) throw new Error('Set SEH_PUBLIC_KEY to the public publishable key');
function query(table){const params=new URLSearchParams();let start=0,end=999;const q={
 select(value){params.set('select',value);return q},
 eq(k,v){params.set(k,'eq.'+v);return q},in(k,v){params.set(k,'in.('+v.join(',')+')');return q},
 order(k,o){params.set('order',k+(o?.ascending===false?'.desc':'.asc'));return q},
 range(a,b){start=a;end=b;return q},limit(n){end=start+n-1;return q},
 async then(resolve,reject){try{params.set('offset',start);params.set('limit',end-start+1);
 const response=await fetch('https://oujqnvrczdavqbqaavuh.supabase.co/rest/v1/'+table+'?'+params,{headers:{apikey:key}});
 const data=await response.json();return resolve(response.ok?{data,error:null}:{data:null,error:data});
 }catch(e){return reject(e)}}};return q;}
const context={window:{SEH_CONFIG:{supabaseUrl:'https://test.invalid',supabasePublishableKey:'test'},supabase:{createClient:()=>({from:query})},dispatchEvent(){},addEventListener(){},removeEventListener(){}},location:{pathname:'/'},CustomEvent:class{},console,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../player-current-status-v1.js'),'utf8'),context);
(async()=>{
 const player=await query('app_player_directory_cache').select('player_key').eq('display_gamertag','eSwahn');
 const status=await context.window.SEH_currentPlayerStatus.get(player.data[0].player_key);
 assert.equal(status?.teamName,'TIKI TALK');assert.equal(status.competitionKey,'sportsgamer:529');
 console.log('Live anonymous status passed: eSwahn → TIKI TALK (FCL 2027).');
})().catch(e=>{console.error(e);process.exitCode=1});
