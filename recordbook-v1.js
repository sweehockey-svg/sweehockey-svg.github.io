(() => {
  'use strict';

  const ROOT_ID='sehRecordbookRoot';
  const PLAYER_METRICS=[
    ['games','Matcher','GP'],['points','Poäng','PTS'],['goals','Mål','G'],['assists','Assist','A'],
    ['goalie_saves','Räddningar','SV'],['goalie_shutouts','Nollor','SO'],['tournament_count','Turneringar','T'],['club_count','Klubbar','K']
  ];
  const TEAM_METRICS=[
    ['games','Matcher','GP'],['wins','Vinster','W'],['goals_for','Mål','GF'],['goal_diff','Målskillnad','+/−'],
    ['tournament_count','Turneringar','T'],['titles','Titlar','GULD']
  ];
  const COMPETITIONS=[['ALL','Alla'],['ECL','ECL'],['SCL','SCL'],['SEC','SEC']];
  let client=null;
  const cache=new Map();
  const state={type:'players',competition:'ALL',metric:'games'};

  function cfg(){return window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};}
  function getClient(){if(client)return client;const c=cfg(),url=String(c.supabaseUrl||'').trim(),key=String(c.supabasePublishableKey||'').trim();if(!window.supabase?.createClient||!url||!key)return null;client=window.supabase.createClient(url,key);return client;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function fmt(v){return Math.round(num(v)).toLocaleString('sv-SE');}
  function playerPhoto(row){const raw=String(row?.player_image||''),id=String(row?.sports_gamer_player_url||'').match(/\/players\/(\d+)/i)?.[1]||'';try{return window.SEH_playerImageUrl?.(raw,id)||raw;}catch(_){return raw;}}
  function playerHref(row){try{return window.SEH_playerProfileUrl?.(row.player_key,row.display_gamertag)||'#/spelare';}catch(_){return '#/spelare';}}
  function teamLogo(row){try{return window.SEH_teamLogoCandidates?.([row.logo_url,row.logo_path],row.current_name)?.[0]||'';}catch(_){return '';}}

  async function rows(type,competition){
    const key=`${type}|${competition}`;if(cache.has(key))return cache.get(key);
    const sb=getClient();if(!sb)throw new Error('Supabase saknas');
    const rpc=type==='players'?'seh_recordbook_players_v1':'seh_recordbook_teams_v1';
    const promise=sb.rpc(rpc,{p_competition:competition,p_limit:350}).then(r=>{if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];});
    cache.set(key,promise);try{return await promise;}catch(e){cache.delete(key);throw e;}
  }
  function metrics(){return state.type==='players'?PLAYER_METRICS:TEAM_METRICS;}
  function value(row,key){return num(row?.[key]);}
  function sorted(data){
    const metric=state.metric;
    return [...data].filter(r=>value(r,metric)>0).sort((a,b)=>value(b,metric)-value(a,metric)||String(state.type==='players'?a.display_gamertag:a.current_name).localeCompare(String(state.type==='players'?b.display_gamertag:b.current_name),'sv')).slice(0,10);
  }
  function entity(row,index){
    const metric=metrics().find(x=>x[0]===state.metric)||metrics()[0];
    const val=value(row,metric[0]);
    if(state.type==='players'){
      const name=String(row.display_gamertag||'Okänd spelare'),photo=playerPhoto(row);
      return `<a class="seh-record-row${index===0?' is-leader':''}" href="${esc(playerHref(row))}"><b class="seh-record-rank">${index+1}</b><span class="seh-record-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`:'?'}</span><span class="seh-record-copy"><strong>${esc(name)}</strong><small>${esc(row.primary_position||'Spelare')} · ${fmt(row.games)} matcher</small></span><span class="seh-record-value"><strong>${metric[0]==='goal_diff'&&val>0?'+':''}${fmt(val)}</strong><small>${esc(metric[2])}</small></span></a>`;
    }
    const name=String(row.current_name||'Okänt lag'),logo=teamLogo(row);
    return `<a class="seh-record-row${index===0?' is-leader':''}" href="#/lag/${encodeURIComponent(row.team_id)}"><b class="seh-record-rank">${index+1}</b><span class="seh-record-avatar is-team">${logo?`<img src="${esc(logo)}" alt="${esc(name)}" loading="lazy">`:esc(name.split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase())}</span><span class="seh-record-copy"><strong>${esc(name)}</strong><small>${fmt(row.tournament_count)} turneringar · ${fmt(row.games)} matcher</small></span><span class="seh-record-value"><strong>${metric[0]==='goal_diff'&&val>0?'+':''}${fmt(val)}</strong><small>${esc(metric[2])}</small></span></a>`;
  }
  function controls(root){
    root.querySelector('[data-record-type="players"]')?.classList.toggle('is-active',state.type==='players');
    root.querySelector('[data-record-type="teams"]')?.classList.toggle('is-active',state.type==='teams');
    root.querySelectorAll('[data-record-competition]').forEach(b=>b.classList.toggle('is-active',b.dataset.recordCompetition===state.competition));
    const metricHost=root.querySelector('[data-record-metrics]');
    metricHost.innerHTML=metrics().map(([key,label])=>`<button type="button" data-record-metric="${key}" class="${state.metric===key?'is-active':''}">${esc(label)}</button>`).join('');
  }
  async function render(){
    const root=document.getElementById(ROOT_ID);if(!root)return;
    controls(root);
    const list=root.querySelector('[data-record-list]'),status=root.querySelector('[data-record-status]');
    list.innerHTML='<div class="seh-record-loading">Hämtar rekord…</div>';status.textContent='';
    try{
      const data=await rows(state.type,state.competition);
      const top=sorted(data);
      const metric=metrics().find(x=>x[0]===state.metric)||metrics()[0];
      status.textContent=`${state.competition==='ALL'?'Alla registrerade tävlingar':state.competition} · Topp ${top.length} · ${metric[1]}`;
      list.innerHTML=top.length?top.map(entity).join(''):'<div class="seh-record-loading">Ingen registrerad data för detta rekord.</div>';
    }catch(error){
      console.warn('[Svensk eHockey] Rekordboken kunde inte laddas',error);
      list.innerHTML='<div class="seh-record-loading">Rekordboken kunde inte laddas just nu.</div>';
    }
  }
  function bind(root){
    if(root.dataset.bound==='1')return;root.dataset.bound='1';
    root.addEventListener('click',e=>{
      const type=e.target.closest('[data-record-type]');if(type){state.type=type.dataset.recordType;state.metric=state.type==='players'?'games':'games';render();return;}
      const comp=e.target.closest('[data-record-competition]');if(comp){state.competition=comp.dataset.recordCompetition;render();return;}
      const metric=e.target.closest('[data-record-metric]');if(metric){state.metric=metric.dataset.recordMetric;render();}
    });
  }
  window.SEH_initRecordBook=()=>{
    const root=document.getElementById(ROOT_ID);if(!root)return;
    bind(root);render();
  };
})();