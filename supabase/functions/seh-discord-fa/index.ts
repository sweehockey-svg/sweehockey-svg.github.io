import{createClient}from"npm:@supabase/supabase-js@2.112.2";
const PROFILE="https://www.svenskehockey.se/#/spelare/",MIN="https://www.svenskehockey.se/#/min-profil";
const POS=new Set(["LW","C","RW","LD","RD","G"]),UTE=["LW","C","RW","LD","RD"],FWD=["LW","C","RW"],BACK=["LD","RD"],ALIAS=new Map([["VF","LW"],["HF","RW"],["VB","LD"],["LB","LD"],["HB","RD"]]);
const j=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const err=e=>e instanceof Error?e.message:String(e?.message||e);
function db(){const u=Deno.env.get("SUPABASE_URL")||"",k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";if(!u||!k)throw Error("SUPABASE_SERVICE_CONFIG");return createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}})}
async function dc(path,t,init={}){return fetch("https://discord.com/api/v10"+path,{...init,headers:{Authorization:"Bot "+t,"Content-Type":"application/json",...(init.headers||{})}})}
function after(a,b){try{return BigInt(String(a||0))>BigInt(String(b||0))}catch{return String(a||"")>String(b||"")}}
function parse(v){
 const m=String(v||"").trim().match(/^!fa(?:\s+(.+))?$/i);if(!m)return null;
 let rest=String(m[1]||"").trim();
 if(!rest)return{type:"submit",p:[],l:[],bad:[],note:""};
 if(/^(BORT|REMOVE|AV|OFF)$/i.test(rest))return{type:"remove",p:[],l:[],bad:[],note:""};
 rest=rest.replace(/\s*\/\s*/g,"/");
 const words=rest.split(/\s+/).filter(Boolean),p=[],l=[];let top=false,noteAt=-1;
 const add=(arr,val)=>{if(!arr.includes(val))arr.push(val)};
 const parseAtom=(raw)=>{
   const x0=raw.toUpperCase().replace(/^[,;]+|[,;]+$/g,""),x=ALIAS.get(x0)||x0;
   if(x==="TOP"){top=true;return true}
   if(["UTE","UTESPELARE","SKATER"].includes(x)){for(const q of UTE)add(p,q);return true}
   if(["F","FWD","FORWARD","FW"].includes(x)){for(const q of FWD)add(p,q);return true}
   if(["BACK","BACKAR","D","DEF"].includes(x)){for(const q of BACK)add(p,q);return true}
   if(POS.has(x)){add(p,x);return true}
   const lm=x.match(/^(ELITE|PRO|LITE|CORE|NEO)([+-])?$/);
   if(lm){const base=lm[1][0]+lm[1].slice(1).toLowerCase(),q=(top?"Top ":"")+base+(lm[2]||"");add(l,q);top=false;return true}
   if(["ALLA","OPEN","ÖPPEN"].includes(x)){top=false;return true}
   return false;
 };
 for(let i=0;i<words.length;i++){
   const parts=words[i].split("/").filter(Boolean);
   let ok=true;
   for(const part of parts){if(!parseAtom(part)){ok=false;break}}
   if(!ok){noteAt=i;break}
 }
 if(top&&noteAt<0)noteAt=words.length-1;
 const note=noteAt>=0?words.slice(noteAt).join(" ").trim().slice(0,500):"";
 return{type:"submit",p,l,bad:[],note};
}
async function send(t,c,p){const r=await dc("/channels/"+c+"/messages",t,{method:"POST",body:JSON.stringify(p)});if(!r.ok)throw Error("SEND "+r.status+": "+(await r.text()).slice(0,300))}
async function del(t,c,id){const r=await dc("/channels/"+c+"/messages/"+id,t,{method:"DELETE"});if(!r.ok&&r.status!==404)throw Error("DELETE "+r.status+": "+(await r.text()).slice(0,300))}
async function once(){
 const t=Deno.env.get("SEH_DISCORD_BOT_TOKEN")||Deno.env.get("DISCORD_BOT_TOKEN")||"";if(!t)throw Error("BOT_TOKEN");
 const a=db(),{data:c,error:ce}=await a.from("ehockey_discord_fa_command_config").select("enabled,channel_id,last_message_id,activated_at").eq("id",1).maybeSingle();if(ce)throw ce;
 const ch=String(c?.channel_id||""),cur=String(c?.last_message_id||""),act=Date.parse(String(c?.activated_at||""))||0;if(!c?.enabled||!ch)return{enabled:!!c?.enabled,configured:!!ch};
 const r=await dc("/channels/"+ch+"/messages?limit=100",t);if(!r.ok)throw Error("READ "+r.status+": "+(await r.text()).slice(0,300));
 const raw=await r.json(),ms=(Array.isArray(raw)?raw:[]).filter(x=>after(x?.id,cur)).sort((x,y)=>after(x.id,y.id)?1:-1);
 let newest=cur,commands=0,submitted=0,deleted=0;const errors=[];
 for(const m of ms){const id=String(m?.id||"");if(!id)continue;newest=id;if(m?.author?.bot)continue;const cmd=parse(m?.content);if(!cmd)continue;if(!cur&&act){const mt=Date.parse(String(m?.timestamp||""))||0;if(mt&&mt+5000<act)continue}commands++;const uid=String(m?.author?.id||"");if(!uid)continue;
  if(cmd.type==="bad"||cmd.bad.length){try{await del(t,ch,id);deleted++}catch(e){errors.push(err(e))}await send(t,ch,{content:`<@${uid}> ogiltigt val. Exempel: \`!fa RD Pro Lite | Backup, 2+ kvällar i veckan\`, \`!fa VF/HF Core\`, \`!fa UTE\` eller \`!fa bort\`.`,allowed_mentions:{users:[uid],parse:[]}});continue}
  try{
   const{data:x,error:e}=await a.rpc("seh_discord_submit_free_agent_request_v2",{p_discord_user_id:uid,p_positions_text:cmd.p.length?cmd.p.join(" / "):null,p_levels_text:cmd.l.length?cmd.l.join(" / "):null,p_request_type:cmd.type==="remove"?"remove":"create",p_message:cmd.note||null});if(e)throw e;
   try{await del(t,ch,id);deleted++}catch(e){errors.push(err(e))}
   if(!x?.linked){await send(t,ch,{content:`<@${uid}> koppla först ditt Discord-konto till ett godkänt spelarkort under **Min profil**: <${MIN}>`,allowed_mentions:{users:[uid],parse:[]}});continue}
   if(x?.ok===false){await send(t,ch,{content:`<@${uid}> du finns inte på den aktiva Free Agent-listan.`,allowed_mentions:{users:[uid],parse:[]}});continue}
   submitted++;const gt=String(x.display_gamertag||"Spelare"),remove=x.request_type==="remove",url=PROFILE+encodeURIComponent(String(x.player_key||"")),sid=String(x.sports_gamer_player_id||"");
   const fields=remove?[{name:"DISCORD",value:`<@${uid}>`,inline:true}]:[{name:"POSITIONER",value:String(x.positions_text||"–"),inline:true},{name:"SÖKER",value:String(x.levels_text||"Öppen för förslag"),inline:true},{name:"DISCORD",value:`<@${uid}>`,inline:true}];
   if(!remove&&String(x.message||"").trim())fields.push({name:"INFO",value:String(x.message).trim().slice(0,500),inline:false});
   const em={color:remove?16766720:5763719,title:remove?`🟡 ${gt} vill lämna Free Agent-listan`:`🟢 ${gt} söker lag`,url,fields};
   if(sid)em.thumbnail={url:"https://www.svenskehockey.se/web-images/players/"+encodeURIComponent(sid)+".png.webp"};
   await send(t,ch,{embeds:[em],components:[{type:1,components:[{type:2,style:5,label:"Spelarkort",url}]}],allowed_mentions:{parse:[]}});
  }catch(e){errors.push(err(e))}
 }
 const up={last_polled_at:new Date().toISOString(),updated_at:new Date().toISOString()};if(newest)up.last_message_id=newest;if(errors.length)up.last_error=errors.join(" | ").slice(0,2000);else if(commands)up.last_error=null;await a.from("ehockey_discord_fa_command_config").update(up).eq("id",1);
 return{enabled:true,configured:true,processed:ms.length,commands,submitted,deleted,errors}
}
Deno.serve(async req=>{if(req.method!=="POST")return j({error:"Method not allowed"},405);try{const a=db(),{data:c,error:e}=await a.from("ehockey_discord_fa_command_config").select("poll_secret").eq("id",1).maybeSingle();if(e)throw e;if(!c?.poll_secret||req.headers.get("x-seh-internal-key")!==c.poll_secret)return j({error:"Forbidden"},403);const b=await req.json().catch(()=>({})),action=String(b?.action||"watch");if(action==="poll")return j(await once());if(action!=="watch")return j({error:"Unknown action"},400);const start=Date.now(),out=[];while(Date.now()-start<54000){const x=await once();out.push(x);if(!x?.enabled||!x?.configured)break;await new Promise(r=>setTimeout(r,4000))}return j({mode:"watch",iterations:out.length,last:out.at(-1)||null})}catch(e){return j({error:err(e)},500)}});