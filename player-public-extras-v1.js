(() => {
  'use strict';

  const MILESTONE_ID = 'seh-public-player-milestones';
  const TEAMMATES_ID = 'seh-public-player-teammates';
  const DIVISION_ID = 'seh-player-division-journey';
  const DIVISION_RANK = Object.freeze({ Neo: 1, Core: 2, Lite: 3, Pro: 4, Elite: 5 });
  const EXCLUDED_ECL = ['qualifier','qualification','kval','wildcard','crossover','registration','free agent','warmup','pre-season','preseason'];
  const GAME_THRESHOLDS=[100,250,500,1000];
  const TOURNAMENT_THRESHOLDS=[10,25,50,100];
  const CLUB_THRESHOLDS=[10,25,50];
  const SAVE_THRESHOLDS=[1000,2500,5000,10000];
  const POINT_THRESHOLDS=[100,250,500,1000,2000];

  let client=null;
  let token=0;
  let timer=0;
  let loadedRoute='';

  function cfg(){return window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};}
  function getClient(){
    if(window.__SEH_NATIVE_SUPABASE_CLIENT__)return window.__SEH_NATIVE_SUPABASE_CLIENT__;
    if(client)return client;
    const c=cfg(),url=String(c.supabaseUrl||c.SUPABASE_URL||'').trim(),key=String(c.supabasePublishableKey||c.supabaseAnonKey||c.SUPABASE_ANON_KEY||'').trim();
    if(!window.supabase?.createClient||!url||!key)return null;
    client=window.supabase.createClient(url,key);return client;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function n(v){const x=Number(v);return Number.isFinite(x)?Math.max(0,x):0;}
  function fmt(v){return Math.round(n(v)).toLocaleString('sv-SE');}
  function routeIsPlayer(){return /^#\/spelare\//i.test(String(location.hash||''));}
  function routeQuery(){
    const raw=String(location.hash||'');
    const q=raw.includes('?')?raw.slice(raw.indexOf('?')+1):'';
    return new URLSearchParams(q);
  }
  async function resolvePlayerKey(){
    const hinted=String(routeQuery().get('pk')||'').trim();
    if(/^[a-f0-9]{40,}$/i.test(hinted))return hinted;
    const raw=String(location.hash||'').match(/^#\/spelare\/([^?]+)/i)?.[1]||'';
    let value='';try{value=decodeURIComponent(raw);}catch(_){value=raw;}
    if(/^[a-f0-9]{40,}$/i.test(value))return value;
    const name=String(document.querySelector('#playerName')?.textContent||'').trim();
    if(!name)return '';
    const sb=getClient();if(!sb)return '';
    const r=await sb.from('app_player_directory_cache').select('player_key,display_gamertag').eq('display_gamertag',name).limit(5);
    if(r.error)throw r.error;
    return String(r.data?.[0]?.player_key||'').trim();
  }
  function overview(){
    const route=document.querySelector('#spaRouteView[data-route="player"]');
    const page=route?.querySelector('#playerPage:not([hidden])');
    return page?.querySelector('[data-player-panel="overview"]')||null;
  }
  function games(row){return Math.max(n(row?.total_skater_games),n(row?.total_goalie_games));}
  function division(v){const raw=String(v||'').trim().toLowerCase();return Object.keys(DIVISION_RANK).find(x=>x.toLowerCase()===raw)||'';}
  function cleanLeague(v){return String(v||'').replace(/European Championship League/gi,'ECL').replace(/\s+/g,' ').trim();}
  function seasonLabel(row){
    const source=cleanLeague(row?.league_name);
    let m=source.match(/^ECL\s*'?((?:20)?\d{2}|\d{1,2})\s*:\s*(Winter|Spring)/i);
    if(m){let x=m[1];if(/^20\d{2}$/.test(x))x=x.slice(2);return `ECL ${x}${/^winter$/i.test(m[2])?'W':'S'}`;}
    m=source.match(/^ECL\s*'?((?:20)?\d{2}|\d{1,2})/i);
    if(m){let x=m[1];if(/^20\d{2}$/.test(x))x=x.slice(2);return `ECL ${x}`;}
    return source||'ECL';
  }
  function summarizeEcl(rows){
    const valid=(Array.isArray(rows)?rows:[]).filter(row=>{
      if(String(row?.competition_name||'').toUpperCase()!=='ECL')return false;
      if(!division(row?.division)||games(row)<=0)return false;
      const text=String(row?.league_name||'').toLowerCase();
      return !EXCLUDED_ECL.some(word=>text.includes(word));
    }).sort((a,b)=>String(a?.chronology_date||'').localeCompare(String(b?.chronology_date||'')));
    if(!valid.length)return {count:0,first:'–',latest:'–',highestDivision:'–'};
    const highest=valid.reduce((best,row)=>DIVISION_RANK[division(row.division)]>DIVISION_RANK[best]?division(row.division):best,division(valid[0].division));
    return {count:new Set(valid.map(row=>String(row.league_id||seasonLabel(row)))).size,first:seasonLabel(valid[0]),latest:seasonLabel(valid[valid.length-1]),highestDivision:highest};
  }
  function highestReached(value,thresholds){const current=n(value);return [...thresholds].reverse().find(target=>current>=target)||0;}
  function badges(row,ecl){
    const out=[];
    const add=(value,thresholds,suffix,icon)=>{const mark=highestReached(value,thresholds);if(mark)out.push({text:`${fmt(mark)} ${suffix}`,icon});};
    add(row?.career_games,GAME_THRESHOLDS,'matcher','GP');
    add(row?.tournament_count,TOURNAMENT_THRESHOLDS,'turneringar','T');
    add(row?.club_count,CLUB_THRESHOLDS,'klubbar','K');
    if(n(row?.total_goalie_games)>0||n(row?.total_goalie_saves)>0)add(row?.total_goalie_saves,SAVE_THRESHOLDS,'räddningar','G');
    if(n(row?.total_skater_games)>0||n(row?.total_points)>0)add(row?.total_points,POINT_THRESHOLDS,'poäng','P');
    if(ecl.count>=10)out.push({text:'10 ECL-säsonger',icon:'ECL'});
    if(ecl.highestDivision&&ecl.highestDivision!=='–')out.push({text:`${ecl.highestDivision} nådd`,icon:'↑'});
    return out.slice(0,6);
  }
  function nextTarget(row,ecl){
    const cand=[];
    const push=(value,thresholds,label)=>{const cur=n(value),target=thresholds.find(t=>t>cur);if(target)cand.push({current:cur,target,label,ratio:cur/target});};
    push(row?.career_games,GAME_THRESHOLDS,'matcher');push(row?.tournament_count,TOURNAMENT_THRESHOLDS,'turneringar');push(row?.club_count,CLUB_THRESHOLDS,'klubbar');
    if(n(row?.total_goalie_games)>0)push(row?.total_goalie_saves,SAVE_THRESHOLDS,'räddningar');
    if(n(row?.total_skater_games)>0)push(row?.total_points,POINT_THRESHOLDS,'poäng');
    if(ecl.count<10)cand.push({current:ecl.count,target:10,label:'ECL-säsonger',ratio:ecl.count/10});
    cand.sort((a,b)=>b.ratio-a.ratio||a.target-b.target);return cand[0]||null;
  }
  function record(label,value,hint){return `<div class="seh-public-record"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(hint)}</span></div>`;}
  function milestoneMarkup(row,ecl){
    const items=badges(row,ecl),next=nextTarget(row,ecl),progress=next?Math.max(0,Math.min(100,Math.round(next.ratio*100))):100;
    return `<div class="seh-public-extra-head"><div><small>REKORD & MILSTOLPAR</small><h2>Karriärresa</h2><p>Automatiskt från spelarens registrerade historik.</p></div><span>${items.length} märken</span></div>
      <div class="seh-public-record-grid">${record('Första ECL',ecl.first,'Första ECL med matcher')}${record('Högsta division',ecl.highestDivision,'Högsta registrerade ECL-nivå')}${record('ECL-säsonger',fmt(ecl.count),'Med registrerade matcher')}${record('Senaste ECL',ecl.latest,'Senaste ECL med matcher')}</div>
      <div class="seh-public-badges">${items.map(x=>`<span><b>${esc(x.icon)}</b>${esc(x.text)}</span>`).join('')||'<span class="is-muted">Första milstolpen väntar</span>'}</div>
      ${next?`<div class="seh-public-next"><div><small>NÄSTA MILSTOLPE</small><strong>${esc(fmt(next.target))} ${esc(next.label)}</strong><span>${esc(fmt(next.current))} / ${esc(fmt(next.target))}</span></div><div class="seh-public-progress"><i style="width:${progress}%"></i></div></div>`:''}`;
  }
  function sportsId(v){return String(v||'').match(/\/players\/(\d+)/i)?.[1]||'';}
  function photo(row){
    const raw=String(row?.player_image||'').trim(),id=sportsId(row?.sports_gamer_player_url);
    try{if(typeof window.SEH_playerImageUrl==='function')return window.SEH_playerImageUrl(raw,id)||'';}catch(_){}
    return raw;
  }
  function playerHref(key,name){try{if(typeof window.SEH_playerProfileUrl==='function')return String(window.SEH_playerProfileUrl(key,name)||'').trim();}catch(_){}return '';}
  function canonicalTeam(v){return String(v||'').replace(/\s+/g,' ').trim();}
  async function localProfileKeys(rows,sb){
    const keys=[...new Set((Array.isArray(rows)?rows:[]).map(row=>String(row?.teammate_key||'').trim()).filter(Boolean))];
    if(!keys.length)return new Set();
    const result=await sb.from('app_player_directory_cache').select('player_key').in('player_key',keys);
    if(result.error)return new Set();
    return new Set((result.data||[]).map(row=>String(row?.player_key||'').trim()).filter(Boolean));
  }
  function teammateMarkup(rows,localKeys){
    return `<div class="seh-public-extra-head"><div><small>LAGKAMRATER</small><h2>Spelat mest med</h2><p>Topp fem utifrån överlappande registrerade matcher.</p></div><span>Topp ${rows.length}</span></div>
      <div class="seh-public-teammates">${rows.map((row,i)=>{const key=String(row?.teammate_key||'').trim(),name=String(row?.display_gamertag||'Spelare'),img=photo(row),team=canonicalTeam(row?.latest_shared_team),localHref=localKeys?.has(key)?playerHref(key,name):'',externalHref=!localHref?String(row?.sports_gamer_player_url||'').trim():'',href=localHref||externalHref,isExternal=Boolean(externalHref);const content=`<b>${i+1}</b><span class="seh-public-teammate-avatar">${img?`<img src="${esc(img)}" alt="${esc(name)}" loading="lazy">`:'?'}</span><span class="seh-public-teammate-copy"><strong>${esc(name)}</strong><em>${fmt(row?.shared_games)} matcher · ${fmt(row?.shared_tournaments)} turneringar</em>${team?`<small>Senast ihop: ${esc(team)}</small>`:''}</span>${href?'<i>›</i>':''}`;return href?`<a href="${esc(href)}" class="seh-public-teammate${i===0?' is-top':''}"${isExternal?' target="_blank" rel="noopener noreferrer"':''}>${content}</a>`:`<div class="seh-public-teammate${i===0?' is-top':''}">${content}</div>`;}).join('')}</div>
      <p class="seh-public-extra-note">Matchantalet bygger på överlappande registrerade matcher i samma lag och turneringsfas.</p>`;
  }
  function ensureHosts(){
    const host=overview();if(!host)return null;
    let milestones=host.querySelector('#'+MILESTONE_ID);
    if(!milestones){milestones=document.createElement('section');milestones.id=MILESTONE_ID;milestones.className='seh-public-extra-card';milestones.innerHTML='<div class="seh-public-extra-loading">Hämtar rekord & milstolpar…</div>';host.appendChild(milestones);}
    let teammates=host.querySelector('#'+TEAMMATES_ID);
    if(!teammates){teammates=document.createElement('section');teammates.id=TEAMMATES_ID;teammates.className='seh-public-extra-card';teammates.innerHTML='<div class="seh-public-extra-loading">Hämtar lagkamrater…</div>';host.appendChild(teammates);}
    const div=host.querySelector('#'+DIVISION_ID);
    if(div){
      if(div.previousElementSibling!==milestones)div.insertAdjacentElement('beforebegin',milestones);
      if(div.nextElementSibling!==teammates)div.insertAdjacentElement('afterend',teammates);
    }else{
      host.append(milestones,teammates);
    }
    return {milestones,teammates};
  }
  async function load(){
    if(!routeIsPlayer())return;
    const name=String(document.querySelector('#playerName')?.textContent||'').trim();if(!name)return;
    const route=String(location.hash||'');
    if(loadedRoute===route&&document.querySelector('#'+MILESTONE_ID)?.dataset.ready==='1'&&document.querySelector('#'+TEAMMATES_ID)?.dataset.ready==='1'){ensureHosts();return;}
    const hosts=ensureHosts();if(!hosts)return;
    const myToken=++token;
    try{
      const key=await resolvePlayerKey();if(myToken!==token||String(location.hash||'')!==route||!key)return;
      const sb=getClient();if(!sb)throw new Error('Supabase saknas');
      const [career,ecl,mates]=await Promise.all([
        sb.from('app_player_directory_cache').select('player_key,career_games,total_skater_games,total_goalie_games,total_points,total_goalie_saves,tournament_count,club_count').eq('player_key',key).limit(1),
        sb.from('v_ehockey_player_tournaments_web_v14').select('league_id,league_name,competition_name,division,chronology_date,total_skater_games,total_goalie_games').eq('player_key',key).eq('competition_name','ECL').order('chronology_date',{ascending:true,nullsFirst:false}),
        sb.rpc('seh_get_player_teammates_v2',{p_player_key:key,p_limit:5})
      ]);
      if(myToken!==token||String(location.hash||'')!==route)return;
      const row=career.data?.[0];
      if(row){hosts.milestones.innerHTML=milestoneMarkup(row,summarizeEcl(ecl.error?[]:ecl.data||[]));hosts.milestones.dataset.ready='1';}
      else{hosts.milestones.innerHTML='<div class="seh-public-extra-loading">Ingen registrerad karriärdata för milstolpar ännu.</div>';hosts.milestones.dataset.ready='1';}
      const mateRows=mates.error?[]:(Array.isArray(mates.data)?mates.data.filter(x=>n(x?.shared_games)>0):[]);
      const localKeys=mateRows.length?await localProfileKeys(mateRows,sb):new Set();
      if(myToken!==token||String(location.hash||'')!==route)return;
      if(mateRows.length){hosts.teammates.innerHTML=teammateMarkup(mateRows,localKeys);hosts.teammates.dataset.ready='1';}
      else{hosts.teammates.innerHTML='<div class="seh-public-extra-loading">Inga registrerade lagkamrater att visa ännu.</div>';hosts.teammates.dataset.ready='1';}
      loadedRoute=route;ensureHosts();
    }catch(error){
      console.warn('[Svensk eHockey] Publika spelarblock kunde inte laddas',error);
      if(hosts.milestones.isConnected)hosts.milestones.innerHTML='<div class="seh-public-extra-loading">Rekord & milstolpar kunde inte laddas just nu.</div>';
      if(hosts.teammates.isConnected)hosts.teammates.innerHTML='<div class="seh-public-extra-loading">Lagkamrater kunde inte laddas just nu.</div>';
    }
  }
  function schedule(delay=80){clearTimeout(timer);timer=setTimeout(()=>{ensureHosts();load();},delay);}
  const observer=new MutationObserver(()=>{if(routeIsPlayer())schedule(80);});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-route','class']});
  window.addEventListener('hashchange',()=>{token+=1;loadedRoute='';schedule(80);});
  window.addEventListener('seh-team-aliases-ready',()=>{if(routeIsPlayer()){loadedRoute='';schedule(20);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(100),{once:true});else schedule(100);
})();