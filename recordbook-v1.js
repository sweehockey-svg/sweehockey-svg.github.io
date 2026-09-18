(() => {
  'use strict';

  const ROOT_ID='sehRecordbookRoot';
  const MIN_SAVE_PERCENTAGE_GAMES=20;
  const MIN_RATE_GAMES=50;
  const MATCH_METRICS=new Set(['fastest_goal_seconds','hattricks','max_goals_game']);

  const PLAYER_GROUPS=[
    {label:'KARRIÄR',items:[
      ['games','Matcher','GP'],['points','Poäng','PTS'],['goals','Mål','G'],['assists','Assist','A'],
      ['penalty_minutes','Utvisningsminuter','PIM']
    ]},
    {label:'SNITT',items:[
      ['points_per_game','Poäng/match','PPG'],['goals_per_game','Mål/match','GPG']
    ]},
    {label:'SLUTSPEL',items:[
      ['playoff_games','Slutspelsmatcher','PO GP'],['playoff_points','Slutspelspoäng','PO PTS'],
      ['playoff_goals','Slutspelsmål','PO G'],['playoff_assists','Slutspelsassist','PO A']
    ]},
    {label:'MÅLVAKT',items:[
      ['goalie_wins','Vinster','W'],['goalie_saves','Räddningar','SV'],
      ['save_percentage','Räddnings%','SV%'],['goalie_shutouts','Nollor','SO']
    ]},
    {label:'MERITER',items:[
      ['golds','Guld','GULD'],['medals','Medaljer','MED'],['silvers','Silver','SILVER'],['bronzes','Brons','BRONS'],
      ['tournament_count','Turneringar','T'],['club_count','Klubbar','K'],['ecl_seasons','ECL-säsonger','ECL']
    ]},
    {label:'MATCHREKORD',items:[
      ['fastest_goal_seconds','Snabbaste mål','TID'],['hattricks','Hattricks','HT'],['max_goals_game','Mål i en match','MÅL']
    ]}
  ];
  const TEAM_GROUPS=[
    {label:'LAGREKORD',items:[
      ['games','Matcher','GP'],['wins','Vinster','W'],['goals_for','Mål','GF'],['goal_diff','Målskillnad','+/−'],
      ['tournament_count','Turneringar','T'],['titles','Titlar','GULD']
    ]}
  ];

  let client=null;
  const cache=new Map();
  const state={type:'players',competition:'ALL',metric:'games'};

  function cfg(){return window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};}
  function getClient(){if(client)return client;const c=cfg(),url=String(c.supabaseUrl||c.SUPABASE_URL||'').trim(),key=String(c.supabasePublishableKey||c.supabaseAnonKey||c.SUPABASE_ANON_KEY||c.SUPABASE_PUBLISHABLE_KEY||'').trim();if(!window.supabase?.createClient||!url||!key)return null;client=window.supabase.createClient(url,key);return client;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function fmt(v){return Math.round(num(v)).toLocaleString('sv-SE');}
  function playerPhoto(row){const raw=String(row?.player_image||''),id=String(row?.sports_gamer_player_url||'').match(/\/players\/(\d+)/i)?.[1]||'';try{return window.SEH_playerImageUrl?.(raw,id)||raw;}catch(_){return raw;}}
  function playerHref(row){try{return window.SEH_playerProfileUrl?.(row.player_key,row.display_gamertag)||'#/spelare';}catch(_){return '#/spelare';}}
  function teamLogo(row){try{return window.SEH_teamLogoCandidates?.([row.logo_url,row.logo_path],row.current_name)?.[0]||'';}catch(_){return '';}}

  function metricAvailable(key){
    if(state.type!=='players')return true;
    if(key==='ecl_seasons'&&!['ALL','ECL'].includes(state.competition))return false;
    if(key==='penalty_minutes'&&state.competition==='SM')return false;
    if(key==='fastest_goal_seconds'&&!['ALL','ECL','SEC'].includes(state.competition))return false;
    if(['hattricks','max_goals_game'].includes(key)&&!['ALL','ECL','SEC','ITHL','LGEL'].includes(state.competition))return false;
    return true;
  }
  function metricGroups(){
    const groups=state.type==='players'?PLAYER_GROUPS:TEAM_GROUPS;
    return groups.map(group=>({...group,items:group.items.filter(item=>metricAvailable(item[0]))})).filter(group=>group.items.length);
  }
  function metrics(){return metricGroups().flatMap(group=>group.items);}
  function activeMetric(){return metrics().find(x=>x[0]===state.metric)||metrics()[0];}

  async function rows(type,competition,metric){
    const matchMode=type==='players'&&MATCH_METRICS.has(metric);
    const key=`${type}|${competition}|${matchMode?'match':'career'}`;
    if(cache.has(key))return cache.get(key);
    const sb=getClient();if(!sb)throw new Error('Supabase saknas');
    const rpc=type==='teams'
      ?'seh_recordbook_teams_v1'
      :(matchMode?'seh_recordbook_match_players_v1':'seh_recordbook_players_v3');
    const promise=sb.rpc(rpc,{p_competition:competition,p_limit:type==='players'?2000:500}).then(r=>{if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];});
    cache.set(key,promise);try{return await promise;}catch(e){cache.delete(key);throw e;}
  }

  function value(row,key){
    if(key==='points_per_game')return num(row?.skater_games)>0?num(row?.points)/num(row?.skater_games):0;
    if(key==='goals_per_game')return num(row?.skater_games)>0?num(row?.goals)/num(row?.skater_games):0;
    return num(row?.[key]);
  }
  function formatGoalTime(seconds){
    const total=Math.max(0,Math.round(num(seconds)));
    const minutes=Math.floor(total/60),secs=String(total%60).padStart(2,'0');
    return `${minutes}:${secs}`;
  }
  function metricValueText(key,val){
    if(key==='save_percentage'){
      const percent=val<=1.5?val*100:val;
      return percent.toLocaleString('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1});
    }
    if(key==='points_per_game'||key==='goals_per_game')return val.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2});
    if(key==='fastest_goal_seconds')return formatGoalTime(val);
    return `${key==='goal_diff'&&val>0?'+':''}${fmt(val)}`;
  }
  function matchesMetric(row,key){
    if(key==='save_percentage')return value(row,'goalie_games')>=MIN_SAVE_PERCENTAGE_GAMES&&value(row,key)>0;
    if(key==='points_per_game'||key==='goals_per_game')return value(row,'skater_games')>=MIN_RATE_GAMES&&value(row,key)>0;
    if(key==='fastest_goal_seconds')return value(row,key)>0;
    return value(row,key)>0;
  }
  function sorted(data){
    const metric=state.metric;
    const lowerIsBetter=metric==='fastest_goal_seconds';
    return [...data]
      .filter(r=>matchesMetric(r,metric))
      .sort((a,b)=>{
        const av=value(a,metric),bv=value(b,metric);
        const diff=lowerIsBetter?av-bv:bv-av;
        return diff||String(state.type==='players'?a.display_gamertag:a.current_name).localeCompare(String(state.type==='players'?b.display_gamertag:b.current_name),'sv');
      })
      .slice(0,10);
  }
  function playerMeta(row,metricKey){
    if(MATCH_METRICS.has(metricKey)){
      if(metricKey==='fastest_goal_seconds'){
        const comp=String(row.fastest_goal_competition||state.competition||'').trim();
        const date=row.fastest_goal_date?new Date(row.fastest_goal_date).toLocaleDateString('sv-SE'):'';
        return [row.primary_position||'Spelare',comp,date].filter(Boolean).join(' · ');
      }
      return [row.primary_position||'Spelare','registrerad matchdetaljdata'].join(' · ');
    }
    if(['goalie_wins','goalie_saves','save_percentage','goalie_shutouts'].includes(metricKey))return `${fmt(row.goalie_games)} målvaktsmatcher`;
    if(metricKey.startsWith('playoff_'))return `${fmt(row.playoff_games)} slutspelsmatcher`;
    if(['golds','silvers','bronzes','medals'].includes(metricKey))return `${fmt(row.medals)} medaljer · ${fmt(row.tournament_count)} turneringar`;
    if(metricKey==='points_per_game'||metricKey==='goals_per_game')return `${fmt(row.skater_games)} utespelarmatcher`;
    return `${row.primary_position||'Spelare'} · ${fmt(row.games)} matcher`;
  }
  function entity(row,index){
    const metric=activeMetric();
    const val=value(row,metric[0]);
    const shown=metricValueText(metric[0],val);
    if(state.type==='players'){
      const name=String(row.display_gamertag||'Okänd spelare'),photo=playerPhoto(row);
      return `<a class="seh-record-row${index===0?' is-leader':''}" href="${esc(playerHref(row))}"><b class="seh-record-rank">${index+1}</b><span class="seh-record-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`:'?'}</span><span class="seh-record-copy"><strong>${esc(name)}</strong><small>${esc(playerMeta(row,metric[0]))}</small></span><span class="seh-record-value"><strong>${shown}</strong><small>${esc(metric[2])}</small></span></a>`;
    }
    const name=String(row.current_name||'Okänt lag'),logo=teamLogo(row);
    return `<a class="seh-record-row${index===0?' is-leader':''}" href="#/lag/${encodeURIComponent(row.team_id)}"><b class="seh-record-rank">${index+1}</b><span class="seh-record-avatar is-team">${logo?`<img src="${esc(logo)}" alt="${esc(name)}" loading="lazy">`:esc(name.split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase())}</span><span class="seh-record-copy"><strong>${esc(name)}</strong><small>${fmt(row.tournament_count)} turneringar · ${fmt(row.games)} matcher</small></span><span class="seh-record-value"><strong>${shown}</strong><small>${esc(metric[2])}</small></span></a>`;
  }

  function metricButtonsHtml(){
    return metricGroups().map(group=>
      `<div class="seh-recordbook-metric-group${group.label==='MATCHREKORD'?' is-match-records':''}"><span>${esc(group.label)}</span><div>${group.items.map(([key,label])=>`<button type="button" data-record-metric="${key}" class="${state.metric===key?'is-active':''}">${esc(label)}</button>`).join('')}</div></div>`
    ).join('');
  }
  function controls(root){
    root.querySelector('[data-record-type="players"]')?.classList.toggle('is-active',state.type==='players');
    root.querySelector('[data-record-type="teams"]')?.classList.toggle('is-active',state.type==='teams');
    root.querySelectorAll('[data-record-competition]').forEach(b=>b.classList.toggle('is-active',b.dataset.recordCompetition===state.competition));
    const metricHost=root.querySelector('[data-record-metrics]');
    metricHost.innerHTML=metricButtonsHtml();
  }
  function statusSuffix(metricKey){
    if(metricKey==='save_percentage')return ` · minst ${MIN_SAVE_PERCENTAGE_GAMES} målvaktsmatcher`;
    if(metricKey==='points_per_game'||metricKey==='goals_per_game')return ` · minst ${MIN_RATE_GAMES} utespelarmatcher`;
    if(metricKey==='fastest_goal_seconds'){
      if(state.competition==='ECL')return ' · matchdetaljdata: ECL 26 Spring';
      if(state.competition==='SEC')return ' · registrerad SEC-matchdetaljdata';
      return ' · begränsad matchdetaljdata: ECL 26 Spring + SEC';
    }
    if(metricKey==='hattricks'||metricKey==='max_goals_game'){
      if(state.competition==='ECL')return ' · matchdetaljdata: ECL 26 Spring';
      if(state.competition==='SEC')return ' · registrerad SEC-matchdetaljdata';
      if(state.competition==='ITHL'||state.competition==='LGEL')return ` · registrerad ${state.competition}-matchdata`;
      return ' · begränsad matchdetaljdata: ECL 26 Spring + SEC + ITHL + LGEL';
    }
    return '';
  }

  async function render(){
    const root=document.getElementById(ROOT_ID);if(!root)return;
    if(!metrics().some(item=>item[0]===state.metric))state.metric='games';
    controls(root);
    const list=root.querySelector('[data-record-list]'),status=root.querySelector('[data-record-status]');
    list.innerHTML='<div class="seh-record-loading">Hämtar rekord…</div>';status.textContent='';
    try{
      const data=await rows(state.type,state.competition,state.metric);
      const top=sorted(data);
      const metric=activeMetric();
      status.textContent=`${state.competition==='ALL'?'Alla registrerade tävlingar':state.competition} · Topp ${top.length} · ${metric[1]}${statusSuffix(metric[0])}`;
      list.innerHTML=top.length?top.map(entity).join(''):'<div class="seh-record-loading">Ingen registrerad data för detta rekord.</div>';
    }catch(error){
      console.warn('[Svensk eHockey] Rekordboken kunde inte laddas',error);
      list.innerHTML='<div class="seh-record-loading">Rekordboken kunde inte laddas just nu.</div>';
    }
  }
  function bind(root){
    if(root.dataset.bound==='1')return;root.dataset.bound='1';
    root.addEventListener('click',e=>{
      const type=e.target.closest('[data-record-type]');if(type){state.type=type.dataset.recordType;state.metric='games';render();return;}
      const comp=e.target.closest('[data-record-competition]');if(comp){state.competition=comp.dataset.recordCompetition;if(!metrics().some(item=>item[0]===state.metric))state.metric='games';render();return;}
      const metric=e.target.closest('[data-record-metric]');if(metric){state.metric=metric.dataset.recordMetric;render();}
    });
  }
  window.SEH_initRecordBook=()=>{
    const root=document.getElementById(ROOT_ID);if(!root)return;
    bind(root);render();
  };
})();