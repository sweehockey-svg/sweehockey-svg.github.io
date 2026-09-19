(() => {
  'use strict';

  const ROOT_ID='sehRecordbookRoot';
  const MIN_SAVE_PERCENTAGE_GAMES=20;
  const MIN_RATE_GAMES=50;
  const MATCH_METRICS=new Set(['fastest_goal_seconds','hattricks','max_goals_game']);

  const PLAYER_GROUPS=[
    {key:'career',label:'Karriär',items:[
      ['games','Matcher','GP'],['points','Poäng','PTS'],['goals','Mål','G'],['assists','Assist','A'],
      ['penalty_minutes','Utvisningsminuter','PIM'],['points_per_game','Poäng/match','PPG'],['goals_per_game','Mål/match','GPG']
    ]},
    {key:'playoffs',label:'Slutspel',items:[
      ['playoff_games','Matcher','PO GP'],['playoff_points','Poäng','PO PTS'],
      ['playoff_goals','Mål','PO G'],['playoff_assists','Assist','PO A']
    ]},
    {key:'goalie',label:'Målvakt',items:[
      ['goalie_wins','Vinster','W'],['goalie_saves','Räddningar','SV'],
      ['save_percentage','Räddnings%','SV%'],['goalie_shutouts','Nollor','SO']
    ]},
    {key:'merits',label:'Meriter',items:[
      ['golds','Guld','GULD'],['medals','Medaljer','MED'],['silvers','Silver','SILVER'],['bronzes','Brons','BRONS'],
      ['tournament_count','Turneringar','T'],['club_count','Klubbar','K'],['ecl_seasons','ECL-säsonger','ECL']
    ]},
    {key:'match',label:'Matchrekord',items:[
      ['fastest_goal_seconds','Snabbaste mål','TID'],['hattricks','Hattricks','HT'],['max_goals_game','Mål i en match','MÅL']
    ]}
  ];
  const TEAM_GROUPS=[
    {key:'team',label:'Lagrekord',items:[
      ['games','Matcher','GP'],['wins','Vinster','W'],['goals_for','Mål','GF'],['goal_diff','Målskillnad','+/−'],
      ['tournament_count','Turneringar','T'],['titles','Titlar','GULD']
    ]}
  ];

  let client=null;
  const cache=new Map();
  const state={type:'players',competition:'ALL',group:'career',metric:'games'};

  function cfg(){return window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};}
  function getClient(){if(client)return client;const c=cfg(),url=String(c.supabaseUrl||c.SUPABASE_URL||'').trim(),key=String(c.supabasePublishableKey||c.supabaseAnonKey||c.SUPABASE_ANON_KEY||c.SUPABASE_PUBLISHABLE_KEY||'').trim();if(!window.supabase?.createClient||!url||!key)return null;client=window.supabase.createClient(url,key);return client;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function fmt(v){return Math.round(num(v)).toLocaleString('sv-SE');}
  function playerPhoto(row){const raw=String(row?.player_image||''),id=String(row?.sports_gamer_player_url||'').match(/\/players\/(\d+)/i)?.[1]||'';try{return window.SEH_playerImageUrl?.(raw,id)||raw;}catch(_){return raw;}}
  function playerHref(row){try{return window.SEH_playerProfileUrl?.(row.player_key,row.display_gamertag)||'#/spelare';}catch(_){return '#/spelare';}}
  function teamLogo(row){try{return window.SEH_teamLogoCandidates?.([row.logo_url,row.logo_path],row.current_name)?.[0]||'';}catch(_){return '';}}
  function currentPlayerTeam(row){
    const kind=String(row?.current_status||'').trim();
    const teamName=String(row?.current_team_name||'').trim();
    if(kind==='team'&&teamName){
      let logo='';
      try{logo=window.SEH_teamLogoCandidates?.([row.current_team_logo],teamName)?.[0]||String(row.current_team_logo||'');}catch(_){logo=String(row.current_team_logo||'');}
      return {name:teamName,logo};
    }
    if(kind==='free_agent')return {name:'Free Agent',logo:''};
    return {name:'',logo:''};
  }

  function metricAvailable(key){
    if(state.type!=='players')return true;
    if(key==='ecl_seasons'&&!['ALL','ECL'].includes(state.competition))return false;
    if(key==='penalty_minutes'&&state.competition==='SM')return false;
    if(key==='fastest_goal_seconds'&&!['ALL','ECL','SCL'].includes(state.competition))return false;
    if(['hattricks','max_goals_game'].includes(key)&&!['ALL','ECL','SCL','SEC','ITHL','LGEL'].includes(state.competition))return false;
    return true;
  }
  function metricGroups(){
    const groups=state.type==='players'?PLAYER_GROUPS:TEAM_GROUPS;
    return groups.map(group=>({...group,items:group.items.filter(item=>metricAvailable(item[0]))})).filter(group=>group.items.length);
  }
  function activeGroup(){
    const groups=metricGroups();
    return groups.find(group=>group.key===state.group)||groups[0];
  }
  function metrics(){return metricGroups().flatMap(group=>group.items);}
  function activeMetric(){
    const group=activeGroup();
    return group?.items.find(x=>x[0]===state.metric)||group?.items[0]||metrics()[0];
  }

  function mergeMatchRows(...datasets){
    const merged=new Map();
    const keyOf=row=>String(row?.player_key||row?.sports_gamer_player_url||row?.display_gamertag||'').trim().toLowerCase();

    function put(row){
      const key=keyOf(row);if(!key)return;
      if(!merged.has(key)){merged.set(key,{...row});return;}
      const current=merged.get(key);

      current.hattricks=num(current.hattricks)+num(row.hattricks);
      current.detailed_matches=num(current.detailed_matches)+num(row.detailed_matches);

      const currentFast=num(current.fastest_goal_seconds);
      const nextFast=num(row.fastest_goal_seconds);
      if(nextFast>0&&(!currentFast||nextFast<currentFast)){
        current.fastest_goal_seconds=row.fastest_goal_seconds;
        current.fastest_goal_date=row.fastest_goal_date;
        current.fastest_goal_competition=row.fastest_goal_competition;
      }

      const currentMax=num(current.max_goals_game);
      const nextMax=num(row.max_goals_game);
      const currentDate=Date.parse(current.max_goals_match_date||'')||0;
      const nextDate=Date.parse(row.max_goals_match_date||'')||0;
      if(nextMax>currentMax||(nextMax===currentMax&&nextMax>0&&nextDate>currentDate)){
        current.max_goals_game=row.max_goals_game;
        current.max_goals_match_competition=row.max_goals_match_competition;
        current.max_goals_match_season=row.max_goals_match_season;
        current.max_goals_match_date=row.max_goals_match_date;
        current.max_goals_match_team=row.max_goals_match_team;
        current.max_goals_match_opponent=row.max_goals_match_opponent;
        current.max_goals_match_team_score=row.max_goals_match_team_score;
        current.max_goals_match_opponent_score=row.max_goals_match_opponent_score;
        current.max_goals_match_stage=row.max_goals_match_stage;
        current.max_goals_match_count=row.max_goals_match_count;
      }else if(nextMax===currentMax&&nextMax>0){
        current.max_goals_match_count=num(current.max_goals_match_count)+num(row.max_goals_match_count);
      }

      current.player_image=current.player_image||row.player_image;
      current.sports_gamer_player_url=current.sports_gamer_player_url||row.sports_gamer_player_url;
      current.primary_position=current.primary_position||row.primary_position;
    }

    datasets.forEach(rows=>(rows||[]).forEach(put));
    return [...merged.values()];
  }

  async function rpcRows(sb,rpc,args){
    const r=await sb.rpc(rpc,args);
    if(r.error)throw r.error;
    return Array.isArray(r.data)?r.data:[];
  }

  async function rows(type,competition,metric){
    const matchMode=type==='players'&&MATCH_METRICS.has(metric);
    const matchDataset=metric==='fastest_goal_seconds'?'fastest':(matchMode?'match':'career');
    const key=`${type}|${competition}|${matchDataset}`;
    if(cache.has(key))return cache.get(key);
    const sb=getClient();if(!sb)throw new Error('Supabase saknas');

    const promise=(async()=>{
      if(type==='teams'){
        return rpcRows(sb,'seh_recordbook_teams_v1',{p_competition:competition,p_limit:500});
      }
      if(!matchMode){
        return rpcRows(sb,'seh_recordbook_players_v3',{p_competition:competition,p_limit:2000});
      }

      if(competition==='ECL'){
        return rpcRows(sb,'seh_recordbook_ecl_match_players_v1',{p_limit:3000});
      }

      if(competition==='SCL'){
        return rpcRows(sb,'seh_recordbook_scl_match_players_v1',{p_limit:2000});
      }

      if(competition==='ALL'){
        const eclPromise=rpcRows(sb,'seh_recordbook_ecl_match_players_v1',{p_limit:3000});
        const sclPromise=rpcRows(sb,'seh_recordbook_scl_match_players_v1',{p_limit:2000});

        if(metric==='fastest_goal_seconds'){
          const [ecl,scl]=await Promise.all([eclPromise,sclPromise]);
          return mergeMatchRows(ecl,scl);
        }

        const secPromise=rpcRows(sb,'seh_recordbook_match_players_v2',{p_competition:'SEC',p_limit:2000});
        const ithlPromise=rpcRows(sb,'seh_recordbook_match_players_v2',{p_competition:'ITHL',p_limit:2000});
        const lgelPromise=rpcRows(sb,'seh_recordbook_match_players_v2',{p_competition:'LGEL',p_limit:2000});
        const [ecl,scl,sec,ithl,lgel]=await Promise.all([eclPromise,sclPromise,secPromise,ithlPromise,lgelPromise]);
        return mergeMatchRows(ecl,scl,sec,ithl,lgel);
      }

      if(metric==='fastest_goal_seconds'){
        return rpcRows(sb,'seh_recordbook_fastest_goal_players_v1',{p_competition:competition,p_limit:2000});
      }
      return rpcRows(sb,'seh_recordbook_match_players_v2',{p_competition:competition,p_limit:2000});
    })();

    cache.set(key,promise);
    try{return await promise;}catch(e){cache.delete(key);throw e;}
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
  function recordMatchDate(value){
    if(!value)return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return date.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});
  }
  function recordMatchSeason(row){
    const competition=String(row?.max_goals_match_competition||'').trim().toUpperCase();
    const raw=String(row?.max_goals_match_season||'').trim();
    const ecl=raw.match(/^ecl(\d+)(spring|winter|fall|autumn)?$/i);
    if(ecl){
      const period=ecl[2]?ecl[2].charAt(0).toUpperCase()+ecl[2].slice(1).toLowerCase():'';
      return ['ECL',ecl[1],period].filter(Boolean).join(' ');
    }
    if(raw&&competition&&raw.toUpperCase().startsWith(competition))return raw;
    return [competition,raw].filter(Boolean).join(' · ');
  }
  function recordMatchStage(value){
    const raw=String(value||'').trim();
    const normalized=raw.toLowerCase();
    if(normalized==='regular season')return 'Grundserie';
    if(normalized==='playoffs'||normalized==='playoff')return 'Slutspel';
    return raw;
  }
  function maxGoalsMatchMeta(row){
    const team=String(row?.max_goals_match_team||'').trim();
    const opponent=String(row?.max_goals_match_opponent||'').trim();
    const teamScore=row?.max_goals_match_team_score;
    const opponentScore=row?.max_goals_match_opponent_score;
    const hasScore=teamScore!==null&&teamScore!==undefined&&opponentScore!==null&&opponentScore!==undefined;
    const primary=team&&opponent
      ? `${team}${hasScore?` ${fmt(teamScore)}–${fmt(opponentScore)}`:' –'} ${opponent}`
      : '';
    const count=num(row?.max_goals_match_count);
    const secondary=[
      recordMatchSeason(row),
      recordMatchStage(row?.max_goals_match_stage),
      recordMatchDate(row?.max_goals_match_date),
      count>1?`rekordet nått ${fmt(count)} gånger`:''
    ].filter(Boolean).join(' · ');
    return {primary,secondary};
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
  function entity(row,index,rankOffset=0){
    const metric=activeMetric();
    const val=value(row,metric[0]);
    const shown=metricValueText(metric[0],val);
    const rank=index+1+rankOffset;
    if(state.type==='players'){
      const name=String(row.display_gamertag||'Okänd spelare'),photo=playerPhoto(row);
      const matchMeta=metric[0]==='max_goals_game'?maxGoalsMatchMeta(row):null;
      const hasMatchContext=Boolean(matchMeta?.primary);
      const metaHtml=hasMatchContext
        ? `<small class="seh-record-meta-primary">${esc(matchMeta.primary)}</small>${matchMeta.secondary?`<small class="seh-record-meta-secondary">${esc(matchMeta.secondary)}</small>`:''}`
        : `<small>${esc(playerMeta(row,metric[0]))}</small>`;
      return `<a class="seh-record-row${hasMatchContext?' has-match-context':''}" href="${esc(playerHref(row))}"><b class="seh-record-rank">${rank}</b><span class="seh-record-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}" loading="lazy">`:'?'}</span><span class="seh-record-copy"><strong>${esc(name)}</strong>${metaHtml}</span><span class="seh-record-value"><strong>${shown}</strong><small>${esc(metric[2])}</small></span></a>`;
    }
    const name=String(row.current_name||'Okänt lag'),logo=teamLogo(row);
    return `<a class="seh-record-row" href="#/lag/${encodeURIComponent(row.team_id)}"><b class="seh-record-rank">${rank}</b><span class="seh-record-avatar is-team">${logo?`<img src="${esc(logo)}" alt="${esc(name)}" loading="lazy">`:esc(name.split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase())}</span><span class="seh-record-copy"><strong>${esc(name)}</strong><small>${fmt(row.tournament_count)} turneringar · ${fmt(row.games)} matcher</small></span><span class="seh-record-value"><strong>${shown}</strong><small>${esc(metric[2])}</small></span></a>`;
  }

  function podiumMeta(row,metricKey){
    if(state.type==='teams')return `${fmt(row.tournament_count)} turneringar · ${fmt(row.games)} matcher`;
    if(metricKey==='max_goals_game'){
      const match=maxGoalsMatchMeta(row);
      if(match.primary)return [match.primary,match.secondary].filter(Boolean).join(' · ');
    }
    return playerMeta(row,metricKey);
  }
  function podiumSupportingStats(row,metricKey){
    const candidates=state.type==='teams'
      ? [['games','GP'],['wins','W'],['goals_for','GF'],['goal_diff','+/−'],['tournament_count','T'],['titles','GULD']]
      : state.group==='playoffs'
        ? [['playoff_games','GP'],['playoff_goals','MÅL'],['playoff_assists','ASSIST'],['playoff_points','PTS']]
        : state.group==='goalie'
          ? [['goalie_games','GP'],['goalie_wins','W'],['goalie_saves','SV'],['save_percentage','SV%'],['goalie_shutouts','SO']]
          : state.group==='merits'
            ? [['golds','GULD'],['medals','MED'],['tournament_count','T'],['silvers','SILVER'],['bronzes','BRONS']]
            : state.group==='match'
              ? [['hattricks','HT'],['max_goals_game','MAX MÅL'],['fastest_goal_seconds','SNABBAST']]
              : [['games','GP'],['goals','MÅL'],['assists','ASSIST'],['points','PTS'],['penalty_minutes','PIM'],['points_per_game','PPG']];
    return candidates
      .filter(([key])=>key!==metricKey&&matchesMetric(row,key))
      .slice(0,3)
      .map(([key,label])=>({key,label,value:metricValueText(key,value(row,key))}));
  }
  function podiumCard(row,index,allRows){
    const rank=index+1;
    const metric=activeMetric();
    const val=value(row,metric[0]);
    const shown=metricValueText(metric[0],val);
    const isPlayer=state.type==='players';
    const name=String(isPlayer?row.display_gamertag:row.current_name||'Okänd');
    const href=isPlayer?playerHref(row):`#/lag/${encodeURIComponent(row.team_id)}`;
    const visual=isPlayer?playerPhoto(row):teamLogo(row);
    const initials=name.split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
    const media=visual
      ? `<img src="${esc(visual)}" alt="${esc(name)}" loading="lazy">`
      : `<span>${esc(initials||'?')}</span>`;
    const currentTeam=isPlayer?currentPlayerTeam(row):{name:name,logo:teamLogo(row)};
    const teamLogoUrl=String(currentTeam.logo||'');
    const teamIdentity=currentTeam.name
      ? `<span class="seh-record-podium-team">${esc(currentTeam.name)}</span>`
      : '';
    const logoMarkup=teamLogoUrl
      ? `<img class="seh-record-podium-teamlogo" src="${esc(teamLogoUrl)}" alt="" loading="lazy"><img class="seh-record-podium-watermark" src="${esc(teamLogoUrl)}" alt="" aria-hidden="true" loading="lazy">`
      : '';
    const stats=podiumSupportingStats(row,metric[0]);
    const statsHtml=stats.length
      ? `<span class="seh-record-podium-stats">${stats.map(stat=>`<span><small>${esc(stat.label)}</small><strong>${esc(stat.value)}</strong></span>`).join('')}</span>`
      : '';
    const leaderValue=value(allRows?.[0],metric[0]);
    const ratio=metric[0]==='fastest_goal_seconds'
      ? (val>0&&leaderValue>0?Math.min(1,leaderValue/val):0)
      : (leaderValue>0?Math.min(1,val/leaderValue):0);
    const progress=Math.max(.08,ratio)*100;
    return `<a class="seh-record-podium-card is-rank-${rank}${isPlayer?'':' is-team'}" href="${esc(href)}">
      <span class="seh-record-podium-rank">${rank}</span>
      <span class="seh-record-podium-media">${media}</span>
      <span class="seh-record-podium-main">
        ${logoMarkup}
        <span class="seh-record-podium-copy">
          <strong>${esc(name)}</strong>
          ${teamIdentity}
        </span>
        <span class="seh-record-podium-value"><strong>${shown}</strong><small>${esc(metric[2])}</small></span>
        ${statsHtml}
        <span class="seh-record-podium-detail">${esc(podiumMeta(row,metric[0]))}</span>
        <span class="seh-record-podium-progress"><i style="width:${progress.toFixed(1)}%"></i></span>
      </span>
    </a>`;
  }

  function groupButtonsHtml(){
    const groups=metricGroups();
    if(state.type==='teams')return '';
    return groups.map(group=>`<button type="button" data-record-group="${esc(group.key)}" class="${state.group===group.key?'is-active':''}${group.key==='match'?' is-match-group':''}">${esc(group.label)}</button>`).join('');
  }
  function metricButtonsHtml(){
    const group=activeGroup();
    if(!group)return '';
    return group.items.map(([key,label])=>`<button type="button" data-record-metric="${key}" class="${state.metric===key?'is-active':''}">${esc(label)}</button>`).join('');
  }
  function controls(root){
    root.querySelector('[data-record-type="players"]')?.classList.toggle('is-active',state.type==='players');
    root.querySelector('[data-record-type="teams"]')?.classList.toggle('is-active',state.type==='teams');
    root.querySelectorAll('[data-record-competition]').forEach(b=>b.classList.toggle('is-active',b.dataset.recordCompetition===state.competition));
    const groupHost=root.querySelector('[data-record-groups]');
    const metricHost=root.querySelector('[data-record-metrics]');
    if(groupHost){
      groupHost.innerHTML=groupButtonsHtml();
      groupHost.hidden=state.type==='teams';
    }
    metricHost.innerHTML=metricButtonsHtml();
    metricHost.classList.toggle('is-match-records',state.type==='players'&&state.group==='match');
  }
  function statusSuffix(metricKey){
    if(metricKey==='save_percentage')return ` · minst ${MIN_SAVE_PERCENTAGE_GAMES} målvaktsmatcher`;
    if(metricKey==='points_per_game'||metricKey==='goals_per_game')return ` · minst ${MIN_RATE_GAMES} utespelarmatcher`;
    if(metricKey==='fastest_goal_seconds'){
      if(state.competition==='ECL')return ' · validerade SportsGamer-måltider · ECL-historik';
      if(state.competition==='SCL')return ' · registrerad måltid: SCL 2023–2025';
      return ' · validerade måltider: ECL + SCL 2023–2025';
    }
    if(metricKey==='hattricks'||metricKey==='max_goals_game'){
      if(state.competition==='ECL')return ' · SportsGamer-matchdata: ECL 1–26 Spring';
      if(state.competition==='SCL')return ' · SportsGamer-matchdata: SCL 2019–2025';
      if(state.competition==='SEC')return ' · registrerad SEC-matchdetaljdata';
      if(state.competition==='ITHL'||state.competition==='LGEL')return ` · registrerad ${state.competition}-matchdata`;
      return ' · matchdetaljdata: ECL 1–26 Spring + SCL 2019–2025 + SEC + ITHL + LGEL';
    }
    return '';
  }

  async function render(){
    const root=document.getElementById(ROOT_ID);if(!root)return;
    const groups=metricGroups();
    if(!groups.some(group=>group.key===state.group))state.group=groups[0]?.key||'career';
    const group=activeGroup();
    if(!group?.items.some(item=>item[0]===state.metric))state.metric=group?.items[0]?.[0]||'games';
    controls(root);
    const podium=root.querySelector('[data-record-podium]');
    const list=root.querySelector('[data-record-list]'),status=root.querySelector('[data-record-status]');
    if(podium)podium.innerHTML='';
    list.innerHTML='<div class="seh-record-loading">Hämtar rekord…</div>';status.textContent='';
    try{
      const data=await rows(state.type,state.competition,state.metric);
      const top=sorted(data);
      const metric=activeMetric();
      let podiumRows=top.slice(0,3);
      const remaining=top.slice(3);
      if(state.type==='players'&&window.SEH_currentPlayerStatus?.decorateRows){
        try{podiumRows=await window.SEH_currentPlayerStatus.decorateRows(podiumRows);}catch(_){}
      }
      status.textContent=`${state.competition==='ALL'?'Alla registrerade tävlingar':state.competition} · Topp ${top.length} · ${metric[1]}${statusSuffix(metric[0])}`;
      if(podium)podium.innerHTML=podiumRows.map(podiumCard).join('');
      list.innerHTML=top.length
        ? remaining.map((row,index)=>entity(row,index,3)).join('')
        : '<div class="seh-record-loading">Ingen registrerad data för detta rekord.</div>';
    }catch(error){
      console.warn('[Svensk eHockey] Rekordboken kunde inte laddas',error);
      if(podium)podium.innerHTML='';
      list.innerHTML='<div class="seh-record-loading">Rekordboken kunde inte laddas just nu.</div>';
    }
  }
  function bind(root){
    if(root.dataset.bound==='1')return;root.dataset.bound='1';
    root.addEventListener('click',e=>{
      const type=e.target.closest('[data-record-type]');if(type){
        state.type=type.dataset.recordType;
        state.group=state.type==='players'?'career':'team';
        state.metric='games';
        render();return;
      }
      const comp=e.target.closest('[data-record-competition]');if(comp){
        state.competition=comp.dataset.recordCompetition;
        const group=activeGroup();
        if(!group?.items.some(item=>item[0]===state.metric))state.metric=group?.items[0]?.[0]||'games';
        render();return;
      }
      const groupButton=e.target.closest('[data-record-group]');if(groupButton){
        state.group=groupButton.dataset.recordGroup;
        state.metric=activeGroup()?.items?.[0]?.[0]||'games';
        render();return;
      }
      const metric=e.target.closest('[data-record-metric]');if(metric){state.metric=metric.dataset.recordMetric;render();}
    });
  }
  window.SEH_initRecordBook=()=>{
    const root=document.getElementById(ROOT_ID);if(!root)return;
    bind(root);render();
  };
})();