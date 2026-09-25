(()=>{"use strict";
const $=s=>document.querySelector(s);
const cfg=window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};
const SUPA=String(cfg.supabaseUrl||cfg.SUPABASE_URL||"").replace(/\/+$/,"")+"/rest/v1/";
const key=String(cfg.supabasePublishableKey||cfg.supabaseAnonKey||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||"");
const headers=key?{apikey:key,Accept:"application/json"}:{};
if(/^eyJ/i.test(key)) headers.Authorization="Bearer "+key;
let teams=[],players=[];
const esc=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
async function q(path){const r=await fetch(SUPA+path,{headers});if(!r.ok)throw Error(await r.text());return r.json()}
function sportsGamerId(v){return String(v||"").match(/\/players\/(\d+)/i)?.[1]||""}
function portrait(p){
 const id=sportsGamerId(p.sports_gamer_player_url);
 if(id&&Array.isArray(window.SEH_PLAYER_IMAGE_FILES)&&window.SEH_PLAYER_IMAGE_FILES.includes(id+".png")) return "../../players/"+encodeURIComponent(id+".png");
 const raw=String(p.player_image||p.image_url||p.portrait_url||"").trim();
 return /^https?:\/\//i.test(raw)?raw:"../../players/1DEFAULTBILDID.png";
}
async function rpc(name,payload){
 const r=await fetch(SUPA+"rpc/"+name,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(payload||{})});
 if(!r.ok) return null;
 const data=await r.json(); return Array.isArray(data)?(data[0]||null):data;
}
async function jerseySvg(team,variant){
 const api=window.SEH_TEAM_JERSEY_V27;
 if(!api?.render||!api?.prepareTeam) return "";
 const prepared=await api.prepareTeam({id:Number(team.team_id),name:team.current_name,logoUrl:team.logo_url||team.logo_path||""});
 const saved=await rpc("seh_get_team_jersey_settings",{p_team_id:Number(team.team_id)});
 if(saved&&typeof saved==="object"){
   const row=Array.isArray(saved)?saved[0]:saved;
   if(row?.primary_color) prepared.primary=row.primary_color;
   if(row?.accent_color) prepared.accent=row.accent_color;
   if(row?.trim_color) prepared.trim=row.trim_color;
   if(row?.pattern) prepared.pattern=row.pattern;
 }
 return api.render(prepared,{variant,side:"front",compact:false});
}
function inlineJersey(svg,cls,off){
 if(!svg)return "";
 const safe=String(svg)
   .replace(/<svg\b([^>]*)>/i,(m,a)=>'<svg class="'+cls+'" style="margin-top:'+off+'px" '+a.replace(/\s(?:width|height)="[^"]*"/gi,"")+'>');
 return safe;
}
async function render(){
 const team=teams.find(t=>String(t.team_id||t.id)===$("#team").value)||teams[0], p=players.find(x=>String(x.player_key)===$("#player").value)||players[0];
 if(!team||!p)return;
 const pic=portrait(p), variant=$("#variant").value, off=Number($("#offset").value)||0, jersey=await jerseySvg(team,variant);
 const modes=[
  ["Overlay","Grundtest: porträtt bakom tröjan",""],
  ["Mask-look","Lite större tröja över axlar/bröst","mask"],
  ["Tight fit","Mer aggressiv zoom och högre tröja","tight"],
  ["Blend","Overlay med mjukare kroppsområde","fade"]
 ];
 const basic=modes.map(([n,d,cl])=>'<article class="card"><div class="stage '+cl+'">'+(pic?'<img class="player" src="'+esc(pic)+'">':'')+(jersey?inlineJersey(jersey,"jersey",off):'')+'</div><div class="meta"><b>'+n+'</b><span>'+d+'</span></div></article>').join("");
 const worn='<article class="card worn-card"><div class="stage worn">'+
   (pic?'<img class="player" src="'+esc(pic)+'">':'')+
   (jersey?inlineJersey(jersey,"worn-jersey",off):'')+
   (pic?'<div class="head-cut"><img src="'+esc(pic)+'"></div><i class="neck-shadow"></i>':'')+
   '</div><div class="meta"><b>Worn Jersey · prototyp</b><span>Huvud/hals ovanpå, hockeytröjan ersätter visuellt originalets överkropp. Detta är spåret vi testar för automatisk lagtröja.</span></div></article>';
 $("#grid").innerHTML=basic+worn;
}
async function init(){
 try{
  teams=await q("v_local_team_list?select=team_id,current_name,logo_path,logo_url&order=current_name.asc&limit=5000");
  $("#team").innerHTML=teams.map(t=>'<option value="'+esc(t.team_id)+'">'+esc(t.current_name)+'</option>').join("");
  async function loadPlayers(){
   const id=$("#team").value;
   players=await q("v_ehockey_team_all_time_players_public?select=team_id,player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position&team_id=eq."+encodeURIComponent(id)+"&order=display_gamertag.asc&limit=250");
   $("#player").innerHTML=players.map(p=>'<option value="'+esc(p.player_key)+'">'+esc(p.display_gamertag)+'</option>').join("");
   render();
  }
  $("#team").addEventListener("change",loadPlayers);$("#player").addEventListener("change",render);$("#variant").addEventListener("change",render);$("#offset").addEventListener("input",render);
  await loadPlayers();
 }catch(e){$("#grid").innerHTML='<div class="card"><div class="meta"><b>Kunde inte ladda data</b><span>'+esc(e.message)+'</span></div></div>'}
}
init();
})();