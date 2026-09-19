import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const FOOTER = "SportsGamer · !free";
const VALID_POSITIONS = new Set(["LW","C","RW","LD","RD","G"]);
const SKATER = ["LW","C","RW","LD","RD"];
const FWD = ["LW","C","RW"];
const DEF = ["LD","RD"];
const ALIAS = new Map([
  ["VF","LW"],["HF","RW"],["VB","LD"],["LB","LD"],["HB","RD"],
]);

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [value.code, value.message, value.details, value.hint]
      .map((part) => String(part || "").trim()).filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try { return JSON.stringify(value); } catch (_) {}
  }
  return String(error);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},
  });
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("SUPABASE_SERVICE_CONFIG");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function discord(path: string, token: string, init: RequestInit = {}, retry = true) {
  const response = await fetch("https://discord.com/api/v10"+path,{
    ...init,
    headers:{Authorization:"Bot "+token,"Content-Type":"application/json",...(init.headers||{})},
  });
  if (response.status===429 && retry) {
    let waitMs=1000;
    try {
      const payload=await response.clone().json();
      waitMs=Math.min(5000,Math.max(300,Number(payload?.retry_after||1)*1000));
    } catch (_) {}
    await new Promise((resolve)=>setTimeout(resolve,waitMs));
    return discord(path,token,init,false);
  }
  return response;
}

function isAfter(id: unknown, cursor: unknown) {
  const a=String(id||"").trim(),b=String(cursor||"").trim();
  if(!a)return false;if(!b)return true;
  try{return BigInt(a)>BigInt(b)}catch{return a>b}
}

function sortSnowflakes(a:any,b:any){
  try{const aa=BigInt(String(a?.id||0)),bb=BigInt(String(b?.id||0));return aa<bb?-1:aa>bb?1:0}
  catch{return String(a?.id||"").localeCompare(String(b?.id||""))}
}

function addUnique(arr:string[],value:string){if(!arr.includes(value))arr.push(value)}

function parsePositionAtom(raw: string, positions: string[]) {
  const x0=String(raw||"").toUpperCase().replace(/^[^A-ZÅÄÖ0-9]+|[^A-ZÅÄÖ0-9]+$/g,"");
  const x=ALIAS.get(x0)||x0;
  if(!x)return true;
  if(["UTE","UTESPELARE","SKATER"].includes(x)){for(const p of SKATER)addUnique(positions,p);return true}
  if(["F","FWD","FORWARD","FORWARDS","FW"].includes(x)){for(const p of FWD)addUnique(positions,p);return true}
  if(["B","BACK","BACKAR","D","DEF","DEFENCE","DEFENSE"].includes(x)){for(const p of DEF)addUnique(positions,p);return true}
  if(["GOALIE","MÅLVAKT","MALVAKT"].includes(x)){addUnique(positions,"G");return true}
  if(["CENTER","CENTRE"].includes(x)){addUnique(positions,"C");return true}
  if(VALID_POSITIONS.has(x)){addUnique(positions,x);return true}
  return false;
}

function parseFreeCommand(content: unknown) {
  const raw=String(content||"").trim();
  const match=raw.match(/^!(?:free|f)(?:\s+(.+))?$/i);
  if(!match)return null;
  const rest=String(match[1]||"").trim();
  if(/^(BORT|REMOVE|OFF|AV)$/i.test(rest))return{type:"remove",positions:[],note:""};
  if(!rest)return{type:"submit",positions:[],note:""};

  const words=rest.split(/\s+/).filter(Boolean),positions:string[]=[];
  let noteAt=-1;
  for(let i=0;i<words.length;i++){
    const token=words[i];
    if(/^[\/|,;:.+-]+$/.test(token))continue;
    const parts=token.split("/").filter(Boolean);
    let recognized=parts.length>0;
    for(const part of parts)if(!parsePositionAtom(part,positions))recognized=false;
    if(!recognized && noteAt<0)noteAt=i;
  }
  const note=noteAt>=0?words.slice(noteAt).join(" ").replace(/^[\s\/|,;:.-]+/,"").trim().slice(0,500):"";
  return{type:"submit",positions,note};
}

function displayName(message:any){
  return String(message?.member?.nick||message?.author?.global_name||message?.author?.username||"Player").trim();
}

function avatarUrl(message:any){
  const uid=String(message?.author?.id||"");
  const avatar=String(message?.author?.avatar||"");
  if(uid&&avatar)return `https://cdn.discordapp.com/avatars/${uid}/${avatar}.png?size=256`;
  return "";
}
function profileCandidates(message:any){
  const values=[
    message?.author?.username,
    message?.author?.global_name,
    message?.member?.nick,
  ].map((v:any)=>String(v||"").trim()).filter(Boolean);
  return [...new Set(values)];
}

async function resolveSportsGamerPlayer(admin:any,message:any){
  for(const candidate of profileCandidates(message)){
    const{data,error}=await admin.rpc("sportsgamer_discord_player_lookup_v1",{p_gamertag:candidate});
    if(error)throw new Error("SPORTSGAMER LOOKUP: "+error.message);
    if(data?.matched)return data;
  }
  return null;
}


function userCard(message:any,uid:string){
  const embeds=Array.isArray(message?.embeds)?message.embeds:[];
  return embeds.some((embed:any)=>{
    const desc=String(embed?.description||"");
    if(desc.includes(`<@${uid}>`)&&/\bFree\b/i.test(desc))return true;
    if(String(embed?.footer?.text||"")!==FOOTER)return false;
    const fields=Array.isArray(embed?.fields)?embed.fields:[];
    return fields.some((field:any)=>String(field?.name||"").toUpperCase()==="DISCORD"&&String(field?.value||"").includes(`<@${uid}>`));
  });
}

function isFreeCard(message:any){
  const embeds=Array.isArray(message?.embeds)?message.embeds:[];
  return embeds.some((embed:any)=>{
    const desc=String(embed?.description||"");
    return String(embed?.footer?.text||"")===FOOTER || (/^<@\d+>\s*·\s*Free\b/i.test(desc));
  });
}

function cardDescription(message:any){
  const embeds=Array.isArray(message?.embeds)?message.embeds:[];
  for(const embed of embeds){
    const desc=String(embed?.description||"").trim();
    if(desc)return desc;
  }
  return "";
}

function previousCardState(message:any,uid:string,latestTeam:string,latestDivision:string,latestSeason:string,isEcl26Spring:boolean){
  if(!message)return{position:"",note:""};
  const desc=cardDescription(message);
  if(!desc.includes(`<@${uid}>`))return{position:"",note:""};
  const parts=desc.split(" · ").map((x:string)=>x.trim()).filter(Boolean);
  let position="";
  if(parts[1]&&/^Free\s+/i.test(parts[1]))position=parts[1].replace(/^Free\s+/i,"").trim();

  const tail=parts.slice(2);
  if(tail.length&&/\[?Playercard\]?/i.test(tail[tail.length-1]))tail.pop();
  if(latestTeam&&tail[0]===latestTeam)tail.shift();
  if(latestDivision&&tail[0]===latestDivision)tail.shift();
  if(!isEcl26Spring&&latestSeason&&tail[0]===latestSeason)tail.shift();

  return{position,note:tail.join(" · ").trim().slice(0,500)};
}

function mergeNotes(previous:string,next:string){
  const a=String(previous||"").trim(),b=String(next||"").trim();
  if(!a)return b.slice(0,500);
  if(!b)return a.slice(0,500);
  const al=a.toLowerCase(),bl=b.toLowerCase();
  if(al.includes(bl))return a.slice(0,500);
  if(bl.includes(al))return b.slice(0,500);
  return (a+" · "+b).slice(0,500);
}

function serviceDayKey(value: string|number|Date){
  const date=new Date(value);
  const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Stockholm",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});
  const parts=Object.fromEntries(fmt.formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  const shifted=Number(parts.hour||0)<4?new Date(date.getTime()-6*60*60*1000):date;
  const f2=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Stockholm",year:"numeric",month:"2-digit",day:"2-digit"});
  return f2.format(shifted);
}

async function sendMessage(token:string,channelId:string,payload:Record<string,unknown>){
  const r=await discord("/channels/"+channelId+"/messages",token,{method:"POST",body:JSON.stringify(payload)});
  if(!r.ok)throw new Error("SEND "+r.status+": "+(await r.text()).slice(0,500));
  return r.json().catch(()=>({}));
}

async function deleteMessage(token:string,channelId:string,messageId:string){
  const r=await discord("/channels/"+channelId+"/messages/"+messageId,token,{method:"DELETE"});
  if(!r.ok&&r.status!==404)throw new Error("DELETE "+r.status+": "+(await r.text()).slice(0,500));
}

async function pollChannel(admin:any,token:string,cfg:any,botIdentity:string){
  const configId=Number(cfg?.id||0);
  const enabled=Boolean(cfg?.enabled),channelId=String(cfg?.channel_id||"").trim();
  const cursor=String(cfg?.last_message_id||"").trim(),activatedAt=Date.parse(String(cfg?.activated_at||""))||0;
  if(!enabled||!channelId)return{id:configId,channel_id:channelId,enabled,configured:Boolean(channelId)};

  const read=await discord("/channels/"+channelId+"/messages?limit=100",token,{method:"GET"});
  if(!read.ok)throw new Error("READ "+read.status+": "+(await read.text()).slice(0,500)+" | bot="+botIdentity+" | channel="+channelId);
  const raw=await read.json();
  const messages=Array.isArray(raw)?raw:[];
  const ordered=messages.filter((m:any)=>isAfter(m?.id,cursor)).sort(sortSnowflakes);

  let newest=cursor,commands=0,posted=0,removed=0,deleted=0,cleaned=0;
  let nonBot=0,readable=0;
  const errors:string[]=[];

  const today=serviceDayKey(new Date());
  for(const old of messages){
    if(!old?.author?.bot||!isFreeCard(old))continue;
    const ts=String(old?.timestamp||"");
    if(ts&&serviceDayKey(ts)!==today){
      try{await deleteMessage(token,channelId,String(old.id));cleaned++}catch(e){errors.push(errorText(e))}
    }
  }

  for(const message of ordered){
    const id=String(message?.id||"");if(!id)continue;
    newest=id;
    if(!message?.author?.bot){
      nonBot++;
      if(String(message?.content||"").trim())readable++;
    }
    if(message?.author?.bot)continue;

    const cmd=parseFreeCommand(message?.content);
    if(!cmd)continue;

    if(!cursor&&activatedAt){
      const mt=Date.parse(String(message?.timestamp||""))||0;
      if(mt&&mt+5000<activatedAt)continue;
    }

    commands++;
    const uid=String(message?.author?.id||"");if(!uid)continue;

    try{await deleteMessage(token,channelId,id);deleted++}catch(e){errors.push(errorText(e))}

    if(cmd.type==="remove"){
      const previousCards=messages
        .filter((previous:any)=>previous?.author?.bot&&userCard(previous,uid));
      for(const previous of previousCards){
        try{await deleteMessage(token,channelId,String(previous.id));removed++}catch(e){errors.push(errorText(e))}
      }
      continue;
    }

    let profile=null;
    try{profile=await resolveSportsGamerPlayer(admin,message)}catch(e){errors.push(errorText(e))}
    const profilePosition=String(profile?.position||"").trim().toUpperCase();
    const profileUrl=String(profile?.player_url||"").trim();
    const latestEclTeam=String(profile?.latest_ecl_team||"").trim();
    const latestEclDivision=String(profile?.latest_ecl_division||"").trim();
    const latestEclSeason=String(profile?.latest_ecl_season_short||"").trim();
    const isEcl26Spring=Boolean(profile?.latest_ecl_is_ecl26_spring);
    const position=cmd.positions.length?cmd.positions.join(" / "):(profilePosition||"Any");
    const note=String(cmd.note||"").trim();

    const parts=[`<@${uid}>`,`Free ${position}`];
    if(latestEclTeam){
      let eclPart=latestEclTeam;
      if(latestEclDivision)eclPart+=` · ${latestEclDivision}`;
      if(!isEcl26Spring&&latestEclSeason)eclPart+=` · ${latestEclSeason}`;
      parts.push(eclPart);
    }
    if(note)parts.push(note);
    if(profileUrl)parts.push(`[Player Card](${profileUrl})`);

    const embed:any={
      color:5763719,
      description:parts.join(" · "),
    };

    const payload:any={
      embeds:[embed],
      allowed_mentions:{parse:[]},
    };

    await sendMessage(token,channelId,payload);
    posted++;
  }

  const contentHidden=nonBot>0&&readable===0;
  if(contentHidden)errors.push("Discord returned messages without readable content. Check Message Content Intent.");

  const update:any={last_polled_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  if(newest&&!contentHidden)update.last_message_id=newest;
  update.last_error=errors.length?errors.join(" | ").slice(0,2000):null;

  const{error:updateError}=await admin.from("sportsgamer_discord_free_command_config").update(update).eq("id",configId);
  if(updateError)throw updateError;

  return{
    id:configId,channel_id:channelId,enabled:true,configured:true,
    processed:ordered.length,commands,posted,removed,deleted,cleaned,
    content_hidden:contentHidden,errors
  };
}

async function poll(){
  const token=Deno.env.get("SPORTSGAMER_DISCORD_BOT_TOKEN")||"";
  if(!token)throw new Error("SPORTSGAMER_DISCORD_BOT_TOKEN saknas.");

  const admin=serviceClient();
  const{data:configs,error:cfgError}=await admin
    .from("sportsgamer_discord_free_command_config")
    .select("id,enabled,channel_id,last_message_id,activated_at")
    .eq("enabled",true)
    .order("id",{ascending:true});
  if(cfgError)throw cfgError;

  const active=(Array.isArray(configs)?configs:[])
    .filter((cfg:any)=>String(cfg?.channel_id||"").trim());
  if(!active.length)return{enabled:false,configured:false,channel_count:0,channels:[]};

  let botIdentity="unknown";
  try{
    const me=await discord("/users/@me",token,{method:"GET"});
    if(me.ok){
      const info=await me.json();
      botIdentity=String(info?.username||"bot")+" ("+String(info?.id||"?")+")";
    }else{
      botIdentity="identity "+me.status;
    }
  }catch(_){}

  const results:any[]=[];
  for(const cfg of active){
    try{
      results.push(await pollChannel(admin,token,cfg,botIdentity));
    }catch(error){
      const message=errorText(error);
      const configId=Number(cfg?.id||0);
      try{
        await admin.from("sportsgamer_discord_free_command_config").update({
          last_polled_at:new Date().toISOString(),
          last_error:message.slice(0,2000),
          updated_at:new Date().toISOString(),
        }).eq("id",configId);
      }catch(_){}
      results.push({
        id:configId,
        channel_id:String(cfg?.channel_id||""),
        enabled:true,
        configured:true,
        error:message
      });
    }
  }

  return{
    enabled:true,
    configured:true,
    channel_count:active.length,
    channels:results,
    commands:results.reduce((sum:number,r:any)=>sum+Number(r?.commands||0),0),
    posted:results.reduce((sum:number,r:any)=>sum+Number(r?.posted||0),0),
    errors:results.filter((r:any)=>r?.error||r?.errors?.length).length,
  };
}

Deno.serve(async(request)=>{
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  try{
    const supplied=request.headers.get("x-sg-internal-key")||"";
    const admin=serviceClient();
    const{data:cfg,error}=await admin.from("sportsgamer_discord_free_command_config").select("poll_secret").eq("id",1).maybeSingle();
    if(error)throw error;
    const expected=String(cfg?.poll_secret||"");
    if(!expected||supplied!==expected)return json({error:"Forbidden."},403);

    const body=await request.json().catch(()=>({}));
    const action=String(body?.action||"watch");
    if(action==="poll")return json(await poll());
    if(action!=="watch")return json({error:"Unknown action."},400);

    const start=Date.now(),results:any[]=[];
    while(Date.now()-start<54000){
      const result=await poll();
      results.push(result);
      if(!result?.enabled||!result?.configured)break;
      await new Promise(resolve=>setTimeout(resolve,4000));
    }
    return json({mode:"watch",iterations:results.length,last:results.at(-1)||null});
  }catch(error){
    const message=errorText(error);
    try{
      const admin=serviceClient();
      await admin.from("sportsgamer_discord_free_command_config").update({
        last_polled_at:new Date().toISOString(),last_error:message.slice(0,2000),updated_at:new Date().toISOString(),
      }).eq("enabled",true);
    }catch(_){}
    console.error("sportsgamer-discord-free:",message);
    return json({error:message},500);
  }
});
