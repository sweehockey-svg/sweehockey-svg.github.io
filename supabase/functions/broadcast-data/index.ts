import {unzipSync} from 'npm:fflate@0.8.2';
import {verifyTicket} from './tickets.ts';

// This endpoint cannot dispatch jobs or write to Supabase. A signed, expiring
// ticket authenticates access to exactly one already-sanitized graphics result.
const origins=new Set(['https://swnworks.se','https://www.swnworks.se','https://www.svenskehockey.se','https://svenskehockey.se','http://localhost:8765','http://127.0.0.1:8765']);
const cache=new Map(),pending=new Map();
const teamFields='sports_gamer_league_id sports_gamer_team_id team_name_in_league team_logo_in_league statistics_stage effective_group_id group_name games_played wins losses overtime_wins overtime_losses total_wins table_points goals_for goals_against goal_difference'.split(' ');
const playerFields='sports_gamer_league_id sports_gamer_team_id sports_gamer_player_id display_gamertag team_name_in_league player_number player_country player_image roster_preferred_position_abbreviation regular_skater_position_abbreviation playoff_skater_position_abbreviation sports_gamer_player_url is_current_roster'.split(' ');
for(const stage of ['regular','playoff'])for(const stat of ['skater_games','goals','assists','points','penalty_minutes','hits','faceoff_wins','faceoff_losses','takeaways','interceptions','blocked_shots','goalie_games','goalie_save_percentage','goalie_goals_against_average','goalie_shutouts'])playerFields.push(stage+'_'+stat);
const pick=(row,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]]));
const json=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})}});
async function github(path){
 const token=Deno.env.get('GITHUB_SYNC_TOKEN');if(!token)throw Error('Source unavailable');
 const response=await fetch('https://api.github.com'+path,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'swn-broadcast-data'},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Source unavailable');return response;
}
async function read(claims){
 if(cache.has(claims.id))return cache.get(claims.id);
 if(pending.has(claims.id))return pending.get(claims.id);
 const task=(async()=>{
  const repo=Deno.env.get('GITHUB_SYNC_REPO')||'sweehockey-svg/sweehockey-svg.github.io';
  const runs=await(await github('/repos/'+repo+'/actions/workflows/fetch-graphics-data.yml/runs?event=workflow_dispatch&per_page=100')).json();
  const run=(runs.workflow_runs||[]).find(r=>r.status==='completed'&&r.conclusion==='success'&&String(r.display_title).endsWith(' · '+claims.id));
  if(!run)throw Error('Result unavailable');
  const list=await(await github('/repos/'+repo+'/actions/runs/'+run.id+'/artifacts')).json();
  const artifact=(list.artifacts||[]).find(a=>a.name==='graphics-'+claims.id&&!a.expired&&a.size_in_bytes<=8000000);
  if(!artifact)throw Error('Result unavailable');
  const bytes=new Uint8Array(await(await github('/repos/'+repo+'/actions/artifacts/'+artifact.id+'/zip')).arrayBuffer());
  if(bytes.length>8000000)throw Error('Result too large');
  const files=unzipSync(bytes,{filter:f=>f.name==='result.json'&&f.originalSize<=12000000});
  if(!files['result.json'])throw Error('Invalid result');
  const data=JSON.parse(new TextDecoder().decode(files['result.json'])),parts=claims.id.split('_');
  // Graphics remain short-lived; a signed broadcast snapshot lasts up to eight hours.
  data.expires_at=data.broadcast_expires_at||data.expires_at;
  if(data.schema_version!==1||data.league_id!==claims.league||data.weekly?.start!==parts[2]||data.weekly?.end!==parts[3]||Math.floor(Date.parse(data.expires_at)/1000)!==claims.exp||!Array.isArray(data.teams)||!Array.isArray(data.players)||data.teams.length>10000||data.players.length>20000)throw Error('Invalid result');
  if([...data.teams,...data.players].some(p=>Number(p.sports_gamer_league_id)!==claims.league||!(Number(p.sports_gamer_team_id)>0)))throw Error('Mixed leagues');
  const clean={schema_version:1,league_id:data.league_id,fetched_at:data.fetched_at,expires_at:data.expires_at,teams:data.teams.map(t=>pick(t,teamFields)),players:data.players.map(p=>pick(p,playerFields))};
  if(cache.size>=10)cache.delete(cache.keys().next().value);cache.set(claims.id,clean);return clean;
 })();
 pending.set(claims.id,task);try{return await task;}finally{pending.delete(claims.id);}
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(origin&&!origins.has(origin))return json({error:'Forbidden origin'},403,'');
 if(req.method==='OPTIONS')return json({},200,origin);
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 try{
  const text=await req.text();if(text.length>2048)return json({error:'Invalid request'},400,origin);
  const body=JSON.parse(text),claims=await verifyTicket(body.ticket,Deno.env.get('GITHUB_SYNC_TOKEN'));
  if(!claims)return json({error:'Underlaget saknar giltig läsbehörighet eller har gått ut. Hämta igen i studion.'},401,origin);
  const data=await read(claims);
  if(Date.parse(data.expires_at)<=Date.now())return json({error:'Underlaget har gått ut. Hämta igen i studion.'},410,origin);
  return json({data},200,origin);
 }catch{return json({error:'Kunde inte läsa sändningsunderlaget. Senast fungerande data har behållits.'},502,origin);}
});
