(()=>{"use strict";
const $=s=>document.querySelector(s);
const SUPA="https://oujqnvrczdavqbqaavuh.supabase.co/rest/v1/";
const key=(window.SEH_SUPABASE_ANON_KEY||"");
const headers=key?{apikey:key,Authorization:"Bearer "+key}:{};
let teams=[],players=[];
const esc=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
async function q(path){const r=await fetch(SUPA+path,{headers});if(!r.ok)throw Error(await r.text());return r.json()}
function portrait(p){return p.player_image||p.image_url||p.portrait_url||""}
function jerseySvg(team,variant){
  if(typeof window.SEH_TEAM_JERSEY_RENDERER_V27?.render==="function") return window.SEH_TEAM_JERSEY_RENDERER_V27.render(team,{variant,side:"front"});
  return "";
}
function dataUrl(svg){return svg?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg):""}
function render(){
 const team=teams.find(t=>String(t.team_id||t.id)===$("#team").value)||teams[0], p=players.find(x=>String(x.player_key)===$("#player").value)||players[0];
 if(!team||!p)return;
 const pic=portrait(p), variant=$("#variant").value, off=Number($("#offset").value)||0, jersey=dataUrl(jerseySvg(team,variant));
 const modes=[
  ["Overlay","Grundtest: porträtt bakom tröjan",""],
  ["Mask-look","Lite större tröja över axlar/bröst","mask"],
  ["Tight fit","Mer aggressiv zoom och högre tröja","tight"],
  ["Blend","Overlay med mjukare kroppsområde","fade"]
 ];
 $("#grid").innerHTML=modes.map(([n,d,cl])=>'<article class="card"><div class="stage '+cl+'">'+(pic?'<img class="player" src="'+esc(pic)+'">':'')+(jersey?'<img class="jersey" style="margin-top:'+off+'px" src="'+jersey+'">':'')+'</div><div class="meta"><b>'+n+'</b><span>'+d+'</span></div></article>').join("");
}
async function init(){
 try{
  teams=await q("v_local_team_list?select=*&order=team_name.asc&limit=500");
  $("#team").innerHTML=teams.map(t=>'<option value="'+esc(t.team_id||t.id)+'">'+esc(t.team_name||t.name)+'</option>').join("");
  async function loadPlayers(){
   const id=$("#team").value;
   players=await q("v_ehockey_team_all_time_players_public?select=team_id,player_key,display_gamertag,player_image,primary_position&team_id=eq."+encodeURIComponent(id)+"&order=display_gamertag.asc&limit=250");
   $("#player").innerHTML=players.map(p=>'<option value="'+esc(p.player_key)+'">'+esc(p.display_gamertag)+'</option>').join("");
   render();
  }
  $("#team").addEventListener("change",loadPlayers);$("#player").addEventListener("change",render);$("#variant").addEventListener("change",render);$("#offset").addEventListener("input",render);
  await loadPlayers();
 }catch(e){$("#grid").innerHTML='<div class="card"><div class="meta"><b>Kunde inte ladda data</b><span>'+esc(e.message)+'</span></div></div>'}
}
init();
})();