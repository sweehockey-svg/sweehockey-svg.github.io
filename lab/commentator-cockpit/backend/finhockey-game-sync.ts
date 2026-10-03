import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE="https://tulospalvelu.leijonat.fi";
const SOURCE="finhockey";
const SEASON=2027;
const SOURCE_COMPETITION_ID="fin-2027-170";
const PARSER_VERSION="fin-game-v1";

const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

const clean=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const norm=(v:any)=>clean(v).toLocaleLowerCase("fi-FI");

async function fetchJson(path:string,params:Record<string,any>={}){
  const url=new URL(path.startsWith("http")?path:BASE+"/"+path.replace(/^\/+/,""));
  for(const [k,v] of Object.entries(params)){
    if(v!==null&&v!==undefined) url.searchParams.set(k,String(v));
  }
  const res=await fetch(url,{
    headers:{
      "User-Agent":"SWNWORKS-Commentator-Cockpit/1.0",
      "Accept":"application/json",
      "Referer":BASE+"/"
    },
    signal:AbortSignal.timeout(20000)
  });
  if(!res.ok) throw new Error(url.pathname+" "+res.status);
  return await res.json();
}

async function optionalJson(path:string,params:Record<string,any>={}){
  try{return await fetchJson(path,params);}catch(error){
    console.warn("optional source failed",path,String((error as any)?.message||error));
    return null;
  }
}

async function sha256(value:string){
  const data=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function intOrNull(v:any){
  if(v===null||v===undefined||v==="") return null;
  const n=Number(v); return Number.isFinite(n)?Math.trunc(n):null;
}

function numberOrNull(v:any){
  if(v===null||v===undefined||v==="") return null;
  const n=Number(String(v).replace(",",".")); return Number.isFinite(n)?n:null;
}

function clock(seconds:any){
  const n=Math.max(0,Number(seconds)||0);
  const m=Math.floor(n/60);
  const s=Math.floor(n%60);
  return m+":"+String(s).padStart(2,"0");
}

function mmssSeconds(value:any){
  const m=clean(value).match(/^(\d+):(\d{2})$/);
  return m?Number(m[1])*60+Number(m[2]):null;
}

function pair(value:any){
  const m=clean(value).match(/^(\d+)\s*-\s*(\d+)$/);
  return m?[Number(m[1]),Number(m[2])]:[null,null];
}

function sourceName(first:any,last:any){
  return clean([clean(first),clean(last)].filter(Boolean).join(" "));
}

function finnishLogName(value:any){
  const s=clean(value);
  if(!s||/^null null$/i.test(s)) return "";
  const parts=s.split(" ");
  if(parts.length<2) return s;
  return clean(parts.slice(1).join(" ")+" "+parts[0]);
}

function rolePosition(role:any,roleId:any=null){
  const r=clean(role).toUpperCase();
  if(r==="MV"||Number(roleId)===1) return "GK";
  if(r==="VL") return "LW";
  if(r==="KH") return "CE";
  if(r==="OL") return "RW";
  if(r==="VP") return "LD";
  if(r==="OP") return "RD";
  if([2,11,16,17].includes(Number(roleId))) return "D";
  if([3,12,13,14,15].includes(Number(roleId))) return "F";
  return r||null;
}

function strengthCode(value:any){
  const v=clean(value).toUpperCase();
  if(v==="YV") return "PP";
  if(v==="AV") return "SH";
  if(v==="IM") return "EN";
  if(v==="VL") return "GWS";
  return v||null;
}

function reportStatus(report:any,logs:any[],scheduledStart:any){
  const n=Number(report?.GameStatus);
  if(n===2||n===94) return "final";
  if(logs.length || (scheduledStart&&new Date(scheduledStart).getTime()<=Date.now())) return "live";
  return "scheduled";
}

function gameUrl(sourceGameId:any){
  return BASE+"/game?gameid="+sourceGameId+"&lang=fi&season="+SEASON;
}

function latestTotal(list:any[],key:string){
  if(!Array.isArray(list)||!list.length) return [null,null];
  const value=list[list.length-1]?.[key];
  return pair(value);
}

function recentFinalQuery(competitionId:string,teamId:string,limit=5){
  return admin.from("games")
    .select("id,competition_id,source_game_id,source_event_game_id,scheduled_start,home_team_id,away_team_id,status,home_score,away_score")
    .eq("competition_id",competitionId)
    .eq("status","final")
    .or("home_team_id.eq."+teamId+",away_team_id.eq."+teamId)
    .order("scheduled_start",{ascending:false})
    .limit(limit);
}

async function rosterLookup(game:any){
  const {data,error}=await admin.from("team_rosters")
    .select("team_id,player_id,jersey_number,source_name,position,is_active")
    .eq("competition_id",game.competition_id)
    .in("team_id",[game.home_team_id,game.away_team_id]);
  if(error) throw error;
  const rows=data||[];
  const byJersey=new Map<string,any>();
  const byName=new Map<string,any>();
  for(const row of rows){
    if(row.jersey_number!=null) byJersey.set(row.team_id+"|"+row.jersey_number,row);
    if(row.source_name) byName.set(row.team_id+"|"+norm(row.source_name),row);
  }
  return {rows,byJersey,byName};
}

function matchRoster(lookup:any,teamId:string,jersey:any,name:any){
  if(jersey!==null&&jersey!==undefined){
    const row=lookup.byJersey.get(teamId+"|"+Number(jersey));
    if(row) return row;
  }
  const n=norm(name);
  return n?lookup.byName.get(teamId+"|"+n)||null:null;
}

async function syncLineup(game:any,report:any,rosters:any,lookup:any){
  if(!rosters) return {available:false,players:0};
  const teams=[
    {teamId:game.home_team_id,roster:rosters.HomeTeamGameRoster},
    {teamId:game.away_team_id,roster:rosters.AwayTeamGameRoster}
  ];
  const players:any[]=[];
  for(const block of teams){
    const sourcePlayers=block.roster?.Players||[];
    const goalies=sourcePlayers.filter((p:any)=>rolePosition(p.RoleAbbrv,p.RoleID)==="GK")
      .sort((a:any,b:any)=>Number(a.Line||99)-Number(b.Line||99));
    const goalieIndex=new Map(goalies.map((p:any,i:number)=>[String(p.PlayerID||p.LinkID||p.JerseyNr),i]));
    for(const p of sourcePlayers){
      const pos=rolePosition(p.RoleAbbrv,p.RoleID);
      const line=intOrNull(p.Line);
      const name=sourceName(p.FirstName,p.LastName);
      const rosterRow=matchRoster(lookup,block.teamId,p.JerseyNr,name);
      const gidx=goalieIndex.get(String(p.PlayerID||p.LinkID||p.JerseyNr));
      players.push({
        team_id:block.teamId,
        player_id:rosterRow?.player_id||null,
        source_name:name,
        jersey_number:intOrNull(p.JerseyNr),
        position:pos,
        line_number:pos==="GK"?null:(line&&line>=1&&line<=4?line:null),
        goalie_role:pos==="GK"?(gidx===0?"starter":"backup"):null,
        is_extra:pos!=="GK"&&!(line&&line>=1&&line<=4),
        source_fragment:{
          source:SOURCE,external_player_id:p.PlayerID||null,link_id:p.LinkID||null,
          role_id:p.RoleID||null,role_name:p.RoleName||null,role_abbrv:p.RoleAbbrv||null,
          captain:p.Captain||null,raw_line:p.Line||null,parser:PARSER_VERSION
        }
      });
    }
  }
  if(!players.length) return {available:false,players:0};

  const contentHash=await sha256(JSON.stringify(players.map(p=>[
    p.team_id,p.player_id,p.source_name,p.jersey_number,p.position,p.line_number,p.goalie_role,p.is_extra
  ])));

  const {data:existing,error:existingError}=await admin.from("game_lineup_revisions")
    .select("id,content_hash").eq("game_id",game.id).eq("is_current",true)
    .order("fetched_at",{ascending:false}).limit(1).maybeSingle();
  if(existingError) throw existingError;
  if(existing?.content_hash===contentHash) return {available:true,changed:false,players:players.length,revision_id:existing.id};

  const off=await admin.from("game_lineup_revisions").update({is_current:false}).eq("game_id",game.id).eq("is_current",true);
  if(off.error) throw off.error;
  const now=new Date().toISOString();
  const ins=await admin.from("game_lineup_revisions").upsert({
    game_id:game.id,content_hash:contentHash,status:game.status,
    is_current:true,source_url:gameUrl(game.source_game_id),source_updated_at:now
  },{onConflict:"game_id,content_hash"}).select("id").single();
  if(ins.error) throw ins.error;
  const revisionId=ins.data.id;
  const del=await admin.from("game_lineup_players").delete().eq("lineup_revision_id",revisionId);
  if(del.error) throw del.error;
  const payload=players.map(p=>({...p,lineup_revision_id:revisionId}));
  const pin=await admin.from("game_lineup_players").insert(payload);
  if(pin.error) throw pin.error;
  return {available:true,changed:true,players:players.length,revision_id:revisionId};
}

async function syncPlayerGameStats(game:any,summary:any,goalies:any,lookup:any){
  const now=new Date().toISOString();
  const blocks=[
    {teamId:game.home_team_id,players:summary?.HomeTeamGameRoster?.Players||[]},
    {teamId:game.away_team_id,players:summary?.AwayTeamGameRoster?.Players||[]}
  ];
  const allSkaters=blocks.flatMap(b=>b.players.filter((p:any)=>rolePosition(p.RoleAbbrv,p.RoleID)!=="GK"));
  const hasShots=allSkaters.reduce((s:number,p:any)=>s+Number(p.Shots||0),0)>0;
  const hasFaceoffs=allSkaters.reduce((s:number,p:any)=>s+Number(p.WinFO||0)+Number(p.LossFO||0),0)>0;

  const playerRows:any[]=[];
  for(const block of blocks){
    for(const p of block.players){
      const pos=rolePosition(p.RoleAbbrv,p.RoleID);
      if(pos==="GK") continue;
      const name=sourceName(p.FirstName,p.LastName);
      const rosterRow=matchRoster(lookup,block.teamId,p.JerseyNr,name);
      const fw=intOrNull(p.WinFO),fl=intOrNull(p.LossFO);
      const total=(fw||0)+(fl||0);
      playerRows.push({
        game_id:game.id,team_id:block.teamId,player_id:rosterRow?.player_id||null,
        source_name:name,jersey_number:intOrNull(p.JerseyNr),position:pos,
        goals:intOrNull(p.Goals)||0,assists:intOrNull(p.Assists)||0,points:intOrNull(p.Points)||0,
        plus_minus:intOrNull(p.PlusMinus),pim:intOrNull(p.PenMin)||0,
        shots:hasShots?intOrNull(p.Shots):null,
        faceoff_wins:hasFaceoffs?fw:null,faceoff_losses:hasFaceoffs?fl:null,
        faceoff_pct:hasFaceoffs&&total?100*(fw||0)/total:null,
        toi_seconds:intOrNull(p.Toi)||null,
        source_fragment:{source:SOURCE,external_person_id:p.PersonID||null,link_id:p.LinkID||null,raw:p,parser:PARSER_VERSION},
        source_updated_at:now,updated_at:now
      });
    }
  }
  const delPlayers=await admin.from("player_game_stats").delete().eq("game_id",game.id);
  if(delPlayers.error) throw delPlayers.error;
  if(playerRows.length){
    const ins=await admin.from("player_game_stats").insert(playerRows);
    if(ins.error) throw ins.error;
  }

  const goalieRows:any[]=[];
  for(const g of goalies||[]){
    const externalTeam=Number(g.TeamID);
    const reportHome=Number(summary?.HomeTeamGameRoster?.Players?.[0]?.TeamID||0);
    const teamId=externalTeam===reportHome?game.home_team_id:
      (externalTeam?game.away_team_id:null);
    if(!teamId) continue;
    const name=sourceName(g.FirstName,g.LastName);
    const rosterRow=matchRoster(lookup,teamId,g.Jersey,name);
    const saves=intOrNull(g.SavesSum);
    const ga=intOrNull(g.GASum);
    const toi=intOrNull(g.TimeOnIce);
    goalieRows.push({
      game_id:game.id,team_id:teamId,player_id:rosterRow?.player_id||null,
      source_name:name,jersey_number:intOrNull(g.Jersey),
      shots_against:saves!=null&&ga!=null?saves+ga:null,goals_against:ga,saves,
      save_pct:numberOrNull(g.SavePerc),minutes_played_seconds:toi,
      gaa:toi&&ga!=null?ga*3600/toi:null,decision:null,started:null,
      source_fragment:{source:SOURCE,link_id:g.LinkID||null,raw:g,parser:PARSER_VERSION},
      source_updated_at:now,updated_at:now
    });
  }
  const delGoalies=await admin.from("goalie_game_stats").delete().eq("game_id",game.id);
  if(delGoalies.error) throw delGoalies.error;
  if(goalieRows.length){
    const ins=await admin.from("goalie_game_stats").insert(goalieRows);
    if(ins.error) throw ins.error;
  }
  return {skaters:playerRows.length,goalies:goalieRows.length};
}

async function syncEventsAndTeamStats(game:any,reportPayload:any,lookup:any){
  const now=new Date().toISOString();
  const report=reportPayload?.GamesUpdate?.[0];
  const logs=reportPayload?.GameLogsUpdate||[];
  const winningShots=reportPayload?.WinningShots||[];
  if(!report) return {events:0,team_stats:0};

  const extToTeam=new Map<number,string>([
    [Number(report.HomeTeam?.Id),game.home_team_id],
    [Number(report.AwayTeam?.Id),game.away_team_id]
  ]);
  const shootoutWinner=(winningShots||[]).find((s:any)=>Number(s.WinningGoal)===1)||null;

  const eventRows:any[]=[];
  const participants:any[]=[];
  let ordinal=0;
  for(let i=0;i<logs.length;i++){
    const row=logs[i];
    const type=clean(row.Type);
    if(type==="GK_start") continue;
    if(shootoutWinner&&type==="Goal"&&Number(row.Period)>=5) continue;

    const teamId=extToTeam.get(Number(row.TeamId))||null;
    const seconds=intOrNull(row.GameTime);
    let eventType="";
    let description="";
    let strength:any=null;
    const eventParticipants:any[]=[];

    if(type==="Goal"){
      eventType="goal";
      const scorer=finnishLogName(row.ScorerName);
      const a1=finnishLogName(row.FirstAssistName);
      const a2=finnishLogName(row.SecondAssistName);
      description=(row.ScorerJersey?"#"+row.ScorerJersey+" ":"")+scorer;
      const assists=[
        a1?((row.FirstAssistJersey?"#"+row.FirstAssistJersey+" ":"")+a1):"",
        a2?((row.SecondAssistJersey?"#"+row.SecondAssistJersey+" ":"")+a2):""
      ].filter(Boolean);
      if(assists.length) description+=" · "+assists.join(", ");
      strength=strengthCode(row.GoalType||row.GoalSpecialTypeEN);
      if(teamId&&scorer) eventParticipants.push({teamId,name:scorer,jersey:row.ScorerJersey,role:"scorer",sort:0});
      if(teamId&&a1) eventParticipants.push({teamId,name:a1,jersey:row.FirstAssistJersey,role:"assist",sort:1});
      if(teamId&&a2) eventParticipants.push({teamId,name:a2,jersey:row.SecondAssistJersey,role:"assist",sort:2});
    }else if(type==="Penalty"){
      eventType="penalty";
      const person=finnishLogName(row.Name);
      const reason=clean(row.PenaltyReasonsEN||row.PenaltyReasonsFI);
      const mins=intOrNull(row.PenaltyMinutesNumber);
      description=[person?(row.Jersey?"#"+row.Jersey+" ":"")+person:"Lagstraff",mins!=null?mins+" min":"",reason].filter(Boolean).join(" · ");
      if(teamId&&person) eventParticipants.push({teamId,name:person,jersey:row.Jersey,role:"penalized",sort:0});
    }else if(type==="GK_out"){
      eventType="goalie_out";
      const person=finnishLogName(row.PreviousGoalkeeperName);
      description=(row.PreviousGoalkeeperJersey?"#"+row.PreviousGoalkeeperJersey+" ":"")+person;
    }else if(type==="GK_in"){
      eventType="goalie_in";
      const person=finnishLogName(row.GoalkeeperName);
      description=(row.GoalkeeperJersey?"#"+row.GoalkeeperJersey+" ":"")+person;
    }else if(type==="Timeout"){
      eventType="timeout";
      description="Timeout";
    }else{
      continue;
    }

    const sourceKey=clean(row.Key)||[type,row.GameTime,row.TeamId,row.Jersey||row.GoalkeeperJersey||row.ScorerJersey||"",i].join(":");
    eventRows.push({
      game_id:game.id,source_event_key:sourceKey,ordinal:ordinal++,
      period:intOrNull(row.Period),event_seconds:seconds,clock_display:seconds!=null?clock(seconds):null,
      event_type:eventType,team_id:teamId,strength,
      home_score:intOrNull(row.HomeTeamGoals),away_score:intOrNull(row.AwayTeamGoals),
      description,is_active:true,
      source_fragment:{source:SOURCE,raw:row,parser:PARSER_VERSION},
      last_seen_at:now,updated_at:now
    });
    participants.push({sourceKey,rows:eventParticipants});
  }

  if(shootoutWinner){
    const teamId=extToTeam.get(Number(shootoutWinner.ShooterTeamID))||null;
    const name=sourceName(shootoutWinner.ShooterFirstName,shootoutWinner.ShooterLastName);
    const key="shootout_winner:"+shootoutWinner.ShotNumber;
    eventRows.push({
      game_id:game.id,source_event_key:key,ordinal:ordinal++,
      period:5,event_seconds:intOrNull(report.GameTime)||3900,clock_display:"SO",
      event_type:"shootout_winner",team_id:teamId,strength:"GWS",
      home_score:intOrNull(report.HomeTeam?.Goals),away_score:intOrNull(report.AwayTeam?.Goals),
      description:(shootoutWinner.ShooterJersey?"#"+shootoutWinner.ShooterJersey+" ":"")+name+" · avgörande straff",
      is_active:true,
      source_fragment:{source:SOURCE,raw:shootoutWinner,parser:PARSER_VERSION},
      last_seen_at:now,updated_at:now
    });
    participants.push({sourceKey:key,rows:teamId&&name?[{teamId,name,jersey:shootoutWinner.ShooterJersey,role:"shootout_winner",sort:0}]:[]});
  }

  const deactivate=await admin.from("game_events").update({is_active:false,updated_at:now}).eq("game_id",game.id);
  if(deactivate.error) throw deactivate.error;
  let savedEvents:any[]=[];
  if(eventRows.length){
    const up=await admin.from("game_events")
      .upsert(eventRows,{onConflict:"game_id,source_event_key"})
      .select("id,source_event_key");
    if(up.error) throw up.error;
    savedEvents=up.data||[];
  }
  const eventByKey=new Map(savedEvents.map((e:any)=>[e.source_event_key,e.id]));
  const eventIds=savedEvents.map((e:any)=>e.id);
  if(eventIds.length){
    const del=await admin.from("game_event_players").delete().in("event_id",eventIds);
    if(del.error) throw del.error;
    const playerRows:any[]=[];
    for(const block of participants){
      const eventId=eventByKey.get(block.sourceKey);
      if(!eventId) continue;
      for(const p of block.rows){
        const rosterRow=matchRoster(lookup,p.teamId,p.jersey,p.name);
        playerRows.push({
          event_id:eventId,player_id:rosterRow?.player_id||null,team_id:p.teamId,
          source_name:p.name,jersey_number:intOrNull(p.jersey),role:p.role,sort_order:p.sort,
          source_fragment:{source:SOURCE,parser:PARSER_VERSION}
        });
      }
    }
    if(playerRows.length){
      const ins=await admin.from("game_event_players").insert(playerRows);
      if(ins.error) throw ins.error;
    }
  }

  const period=reportPayload?.PeriodSummary||{};
  const saves=latestTotal(period.PeriodSaves||[],"Saves");
  const pim=latestTotal(period.PeriodPenMins||[],"PenMins");
  const ppMins=latestTotal(period.PeriodPPMins||[],"PPMins");
  const ppGoals=latestTotal(period.PeriodPPGoals||[],"PPGoals");
  const shGoals=latestTotal(period.PeriodSHGoals||[],"SHGoals");
  const normalGoals=[
    logs.filter((r:any)=>r.Type==="Goal"&&Number(r.Period)<5&&Number(r.TeamId)===Number(report.HomeTeam?.Id)).length,
    logs.filter((r:any)=>r.Type==="Goal"&&Number(r.Period)<5&&Number(r.TeamId)===Number(report.AwayTeam?.Id)).length
  ];
  const homeShots=saves[1]!=null?saves[1]+normalGoals[0]:null;
  const awayShots=saves[0]!=null?saves[0]+normalGoals[1]:null;

  const {data:existingStats,error:existingError}=await admin.from("team_game_stats")
    .select("team_id,shots,saves,pim,power_play_goals,power_play_seconds,source_fragment")
    .eq("game_id",game.id);
  if(existingError) throw existingError;
  const existingByTeam=new Map((existingStats||[]).map((r:any)=>[r.team_id,r]));

  const values=[
    {
      team_id:game.home_team_id,goals:intOrNull(report.HomeTeam?.Goals),shots:homeShots,saves:saves[0],
      pim:pim[0],pp_goals:ppGoals[0],pp_seconds:mmssSeconds(ppMins[0]),sh:shGoals[0]
    },
    {
      team_id:game.away_team_id,goals:intOrNull(report.AwayTeam?.Goals),shots:awayShots,saves:saves[1],
      pim:pim[1],pp_goals:ppGoals[1],pp_seconds:mmssSeconds(ppMins[1]),sh:shGoals[1]
    }
  ];
  const statRows=values.map((v:any,index:number)=>{
    const opp=values[index===0?1:0];
    const old=existingByTeam.get(v.team_id);
    const changed={...(old?.source_fragment?.stat_changed_at||{})};
    if(!old||old.shots!==v.shots) changed.shots=now;
    if(!old||old.saves!==v.saves) changed.saves=now;
    if(!old||old.pim!==v.pim) changed.pim=now;
    if(!old||old.power_play_goals!==v.pp_goals||old.power_play_seconds!==v.pp_seconds) changed.pp=now;
    const shotsAgainst=opp.shots;
    return {
      game_id:game.id,team_id:v.team_id,goals:v.goals,shots:v.shots,saves:v.saves,
      save_pct:v.saves!=null&&shotsAgainst?100*v.saves/shotsAgainst:null,
      pim:v.pim,power_play_opportunities:null,power_play_goals:v.pp_goals,power_play_pct:null,
      power_play_seconds:v.pp_seconds,penalty_kill_opportunities:null,
      penalty_kill_goals_against:opp.pp_goals,penalty_kill_pct:null,
      shorthanded_goals:v.sh,faceoff_wins:null,faceoff_losses:null,faceoff_pct:null,
      period_stats:{raw:period},
      source_fragment:{source:SOURCE,raw_summary:period,stat_changed_at:changed,parser:PARSER_VERSION},
      source_updated_at:now,updated_at:now
    };
  });
  const upStats=await admin.from("team_game_stats").upsert(statRows,{onConflict:"game_id,team_id"});
  if(upStats.error) throw upStats.error;

  return {events:eventRows.length,participants:participants.reduce((s:any,b:any)=>s+b.rows.length,0),team_stats:statRows.length};
}

async function syncGame(game:any){
  const reportPayload=await fetchJson("gamereport/getgamereportdata",{gameid:game.source_game_id,season:SEASON});
  const report=reportPayload?.GamesUpdate?.[0];
  if(!report) return {game_id:game.id,source_game_id:game.source_game_id,awaiting:true};

  const logs=reportPayload?.GameLogsUpdate||[];
  const status=reportStatus(report,logs,game.scheduled_start);
  const maxPeriod=logs.reduce((m:number,row:any)=>Math.max(m,Number(row.Period)||0),0)||
    intOrNull(reportPayload?.PeriodSummary?.PlayedPeriods);
  const now=new Date().toISOString();
  const update={
    status,period:maxPeriod||null,clock_display:clock(report.GameTime||0),
    home_score:intOrNull(report.HomeTeam?.Goals)||0,away_score:intOrNull(report.AwayTeam?.Goals)||0,
    venue_name:clean(report.Arena)||game.venue_name||null,attendance:intOrNull(report.Spectators),
    went_overtime:Number(report.FinishedType)>=2,went_shootout:Number(report.FinishedType)>=3,
    source_event_game_id:String(report.Id||game.source_game_id),
    source_url:gameUrl(game.source_game_id),source_updated_at:now,last_seen_at:now,updated_at:now
  };
  const upd=await admin.from("games").update(update).eq("id",game.id);
  if(upd.error) throw upd.error;
  const merged={...game,...update};

  const lookup=await rosterLookup(merged);
  const rosters=await optionalJson("game/helpers/getrosters",{gameid:game.source_game_id,season:SEASON});
  const lineup=await syncLineup(merged,report,rosters,lookup);

  let summary:any=null,goalies:any=null;
  if(status==="live"||status==="final"){
    [summary,goalies]=await Promise.all([
      optionalJson("game/helpers/getsummary",{
        gameid:game.source_game_id,season:SEASON,gamelength:report.GameTime||3600,
        subSerieId:report.SubSerieID||170
      }),
      optionalJson("game/helpers/getgoalies",{
        gameid:game.source_game_id,season:SEASON,
        hometeam:report.HomeTeam?.Id||0,awayteam:report.AwayTeam?.Id||0
      })
    ]);
  }
  const gameStats=summary?await syncPlayerGameStats(merged,summary,goalies||[],lookup):{skaters:0,goalies:0};
  const events=await syncEventsAndTeamStats(merged,reportPayload,lookup);
  return {
    game_id:game.id,source_game_id:game.source_game_id,status,
    score:(report.HomeTeam?.Goals??0)+"-"+(report.AwayTeam?.Goals??0),
    lineup,player_stats:gameStats,events
  };
}

async function collectTargetGames(competition:any,body:any){
  const gameSelect="id,competition_id,source_game_id,source_event_game_id,scheduled_start,home_team_id,away_team_id,venue_name,status,home_score,away_score";
  if(body.source_game_id){
    const {data,error}=await admin.from("games").select(gameSelect)
      .eq("competition_id",competition.id).eq("source_game_id",String(body.source_game_id)).maybeSingle();
    if(error) throw error;
    return data?[data]:[];
  }

  if(body.bootstrap_all===true){
    const {data,error}=await admin.from("games").select(gameSelect)
      .eq("competition_id",competition.id).eq("status","final")
      .order("scheduled_start",{ascending:false}).limit(80);
    if(error) throw error;
    return data||[];
  }

  let teamIds:string[]=[];
  if(body.team_id){
    teamIds=[clean(body.team_id)];
  }else{
    const {data:access,error:accessError}=await admin.from("commentator_access")
      .select("team_id").eq("active",true).eq("role","commentator").not("team_id","is",null);
    if(accessError) throw accessError;
    const requested=[...new Set((access||[]).map((r:any)=>r.team_id).filter(Boolean))];
    if(!requested.length) return [];
    const {data:memberships,error:membershipError}=await admin.from("team_rosters")
      .select("team_id").eq("competition_id",competition.id).eq("is_active",true).in("team_id",requested);
    if(membershipError) throw membershipError;
    teamIds=[...new Set((memberships||[]).map((r:any)=>r.team_id))];
  }

  const map=new Map<string,any>();
  for(const teamId of teamIds){
    const recent=await recentFinalQuery(competition.id,teamId,5);
    if(recent.error) throw recent.error;
    for(const g of recent.data||[]) map.set(g.id,g);

    const windowStart=new Date(Date.now()-8*60*60*1000).toISOString();
    const {data:next,error:nextError}=await admin.from("games").select(gameSelect)
      .eq("competition_id",competition.id).neq("status","final")
      .or("home_team_id.eq."+teamId+",away_team_id.eq."+teamId)
      .gte("scheduled_start",windowStart).order("scheduled_start",{ascending:true}).limit(1).maybeSingle();
    if(nextError) throw nextError;
    if(next){
      const hours=(new Date(next.scheduled_start).getTime()-Date.now())/3600000;
      if(hours<=24) map.set(next.id,next);
    }
  }
  return [...map.values()].sort((a:any,b:any)=>new Date(b.scheduled_start).getTime()-new Date(a.scheduled_start).getTime());
}

Deno.serve(async(req:Request)=>{
  const started=Date.now();
  try{
    const candidate=req.headers.get("x-sync-token")||"";
    const {data:valid,error:authError}=await admin.rpc("validate_swehockey_sync_token",{candidate});
    if(authError||valid!==true) return Response.json({error:"forbidden"},{status:403});
    let body:any={};try{body=await req.json();}catch{}

    const {data:competition,error:competitionError}=await admin.from("competitions")
      .select("id,name,source_competition_id,season_label")
      .eq("source",SOURCE).eq("source_competition_id",SOURCE_COMPETITION_ID).maybeSingle();
    if(competitionError) throw competitionError;
    if(!competition) return Response.json({ok:false,error:"suomi_sarja_not_imported"},{status:409});

    const games=await collectTargetGames(competition,body);
    const results:any[]=[];
    for(let i=0;i<games.length;i+=3){
      const group=games.slice(i,i+3);
      results.push(...await Promise.all(group.map(async(game:any)=>{
        try{return await syncGame(game);}
        catch(error){return {game_id:game.id,source_game_id:game.source_game_id,error:String((error as any)?.message||error)};}
      })));
    }

    return Response.json({
      ok:true,competition:competition.name,target_count:games.length,
      synced:results.filter(r=>!r.error).length,errors:results.filter(r=>r.error).length,
      results,elapsed_ms:Date.now()-started
    });
  }catch(error){
    console.error(error);
    return Response.json({ok:false,error:String((error as any)?.message||error),elapsed_ms:Date.now()-started},{status:500});
  }
});
