import {createClient} from 'npm:@supabase/supabase-js@2.112.2';
import {unzipSync} from 'npm:fflate@0.8.2';
import {issueTicket} from './tickets.ts';

const workflow='fetch-graphics-data.yml';
const allowedLeagues=new Set([520,523,524,525,526,527,529,532]);
const origins=new Set(['https://swnworks.se','https://www.swnworks.se','https://www.svenskehockey.se','https://svenskehockey.se','http://localhost:8765','http://127.0.0.1:8765']);
const cache=new Map();
const json=(data,status,origin)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})}});
function validPeriod(start,end){
 const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 return valid(start)&&valid(end)&&start>='2020-01-01'&&end>=start&&Date.parse(end)-Date.parse(start)<=365*86400000&&Date.parse(end)<=Date.now()+7*86400000;
}
async function github(path,init={}){
 const token=Deno.env.get('GITHUB_SYNC_TOKEN');
 if(!token)throw Error('Source service is not configured');
 const r=await fetch('https://api.github.com'+path,{...init,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'swn-graphics-fetch',...(init.headers||{})},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('Source service HTTP '+r.status);
 return r;
}
async function admin(req){
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))throw Error('UNAUTHORIZED');
 const client=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||Deno.env.get('SUPABASE_ANON_KEY')||'',{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser();
 if(error||!data.user)throw Error('UNAUTHORIZED');
 const access=await client.rpc('swn_studio_admin_access');
 if(access.error||access.data!==true)throw Error('FORBIDDEN');
 return data.user.id.slice(0,8);
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(origin&&!origins.has(origin))return json({error:'Forbidden origin'},403,'');
 if(req.method==='OPTIONS')return json({},200,origin);
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 try{
  const owner=await admin(req),body=await req.json();
  const repo=Deno.env.get('GITHUB_SYNC_REPO')||'sweehockey-svg/sweehockey-svg.github.io';
  const ref=Deno.env.get('GITHUB_SYNC_REF')||'main';
  if(body.action!=='start'&&body.action!=='status')return json({error:'Invalid action'},400,origin);
  const recent=await (await github('/repos/'+repo+'/actions/workflows/'+workflow+'/runs?event=workflow_dispatch&per_page=100')).json();
  const runs=recent.workflow_runs||[];
  if(body.action==='start'){
   const league=Number(body.league),start=String(body.start||''),end=String(body.end||'');
   if(!allowedLeagues.has(league)||!validPeriod(start,end))return json({error:'Välj giltig liga och period (högst 366 dagar).'},400,origin);
   const prefix=owner+'_'+league+'_'+start+'_'+end+'_';
   const active=runs.find(r=>r.status!=='completed'&&String(r.display_title).includes(owner+'_'));
   if(active){
    const id=String(active.display_title).split(' · ').pop();
    if(id.startsWith(prefix))return json({state:active.status,request_id:id},202,origin);
    return json({error:'En hämtning pågår redan. Vänta tills den är klar.'},409,origin);
   }
   const latest=runs.find(r=>String(r.display_title).includes(owner+'_'));
   if(latest&&Date.now()-Date.parse(latest.created_at)<30000)return json({error:'Vänta en kort stund före nästa hämtning.'},429,origin);
   const id=prefix+crypto.randomUUID().replaceAll('-','').slice(0,16);
   await github('/repos/'+repo+'/actions/workflows/'+workflow+'/dispatches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref,inputs:{request_id:id,league_id:String(league),start,end}})});
   return json({state:'queued',request_id:id},202,origin);
  }
  const id=String(body.request_id||'');
  if(!/^[a-f0-9]{8}_\d{3}_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}_[a-f0-9]{16}$/.test(id)||!id.startsWith(owner+'_'))return json({error:'Invalid request'},400,origin);
  const run=runs.find(r=>String(r.display_title).endsWith(' · '+id));
  if(!run)return json({state:'queued',request_id:id},200,origin);
  if(run.status!=='completed')return json({state:run.status,request_id:id},200,origin);
  if(run.conclusion!=='success')return json({error:'SportsGamer-hämtningen misslyckades. Tidigare grafik är kvar.',state:'failed'},502,origin);
  let data=cache.get(id);
  if(!data){
   const artifacts=await (await github('/repos/'+repo+'/actions/runs/'+run.id+'/artifacts')).json();
   const file=(artifacts.artifacts||[]).find(a=>a.name==='graphics-'+id&&!a.expired);
   if(!file||file.size_in_bytes>8000000)return json({error:'Resultatet har gått ut eller är för stort. Hämta igen.'},410,origin);
   const response=await github('/repos/'+repo+'/actions/artifacts/'+file.id+'/zip');
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes.length>8000000)throw Error('Result too large');
   const files=unzipSync(bytes,{filter:file=>file.name==='result.json'&&file.originalSize<=12000000});
   if(!files['result.json'])throw Error('Invalid result');
   data=JSON.parse(new TextDecoder().decode(files['result.json']));
   const parts=id.split('_');
   if(data.schema_version!==1||data.league_id!==Number(parts[1])||data.weekly?.start!==parts[2]||data.weekly?.end!==parts[3]||!Array.isArray(data.teams)||!Array.isArray(data.players)||data.players.length>20000)throw Error('Invalid result scope');
   if(cache.size>=10)cache.delete(cache.keys().next().value);
   cache.set(id,data);
  }
  if(!Number.isFinite(Date.parse(data.expires_at))||Date.parse(data.expires_at)<=Date.now()){cache.delete(id);return json({error:'Resultatet har gått ut. Hämta igen.'},410,origin);}
  const broadcast_ticket=await issueTicket(id,data.league_id,data.broadcast_expires_at||data.expires_at,Deno.env.get('GITHUB_SYNC_TOKEN'));
  return json({state:'completed',request_id:id,data,broadcast_ticket},200,origin);
 }catch(error){
  const message=error instanceof Error?error.message:'';
  if(message==='UNAUTHORIZED')return json({error:'Logga in igen.'},401,origin);
  if(message==='FORBIDDEN')return json({error:'Administratörsbehörighet krävs.'},403,origin);
  console.error('graphics-fetch:',message);
  return json({error:'Hämtningen kunde inte slutföras. Tidigare grafik är kvar.'},502,origin);
 }
});
