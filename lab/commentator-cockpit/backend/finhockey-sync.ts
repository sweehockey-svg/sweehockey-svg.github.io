import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { DateTime } from "npm:luxon@3.5.0";

const BASE="https://tulospalvelu.leijonat.fi";
const SOURCE="finhockey";
const SEASON=2027;
const SEASON_LABEL="2026/27";
const SUBSERIE_ID=170;
const SERIE_ID=648;
const SOURCE_COMPETITION_ID="fin-2027-170";
const PARSER_VERSION="fin-base-v1";

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
      "Referer":BASE+"/serie?season=2027&lid=66&did=9&ssid=170"
    },
    signal:AbortSignal.timeout(20000)
  });
  if(!res.ok) throw new Error(url.pathname+" "+res.status);
  return await res.json();
}

async function sha256(value:string){
  const data=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function sourceName(first:any,last:any){
  return clean([clean(first),clean(last)].filter(Boolean).join(" "));
}

function personKey(first:any,last:any,birth:any){
  return norm(first)+"|"+norm(last)+"|"+clean(birth);
}

function rolePosition(role:any){
  const r=clean(role).toUpperCase();
  if(["MV","KP"].includes(r)) return "GK";
  if(r==="VL") return "LW";
  if(r==="KH") return "CE";
  if(r==="OL") return "RW";
  if(r==="VP") return "LD";
  if(r==="OP") return "RD";
  if(["H","HY"].includes(r)) return "F";
  if(["P","PU"].includes(r)) return "D";
  return r||null;
}

function gameStatus(value:any){
  const n=Number(value);
  if(n===2||n===94) return "final";
  if(n===1||n===3||n===4) return "live";
  return "scheduled";
}

function localStart(date:any,time:any){
  const d=clean(date);
  const t=clean(time)||"00:00:00";
  if(!d) return null;
  const dt=DateTime.fromISO(d+"T"+t,{zone:"Europe/Helsinki"});
  return dt.isValid?dt.toUTC().toISO():null;
}

function intOrNull(v:any){
  if(v===null||v===undefined||v==="") return null;
  const n=Number(v); return Number.isFinite(n)?Math.trunc(n):null;
}

function numberOrNull(v:any){
  if(v===null||v===undefined||v==="") return null;
  const n=Number(String(v).replace(",",".")); return Number.isFinite(n)?n:null;
}

function logoUrl(img:any){
  const file=clean(img);
  return file?BASE+"/images/associations/weblogos/200x200/"+file:null;
}

async function parallelMap<T,R>(items:T[],limit:number,fn:(item:T,index:number)=>Promise<R>){
  const out:R[]=[];
  for(let i=0;i<items.length;i+=limit){
    const group=items.slice(i,i+limit);
    out.push(...await Promise.all(group.map((item,j)=>fn(item,i+j))));
  }
  return out;
}

Deno.serve(async(req:Request)=>{
  const started=Date.now();
  try{
    const candidate=req.headers.get("x-sync-token")||"";
    const {data:valid,error:authError}=await admin.rpc("validate_swehockey_sync_token",{candidate});
    if(authError||valid!==true) return Response.json({error:"forbidden"},{status:403});

    const now=new Date().toISOString();
    const filters={
      "filters[Games]":"",
      "filters[Strength]":"",
      "filters[Rookies]":0,
      "filters[Total]":0,
      "filters[Period]":"",
      "filters[SortOrder]":"DESC"
    };

    const [subserie,gamesBlocks,standings,skaters,goalies,teamStats]=await Promise.all([
      fetchJson("serie/helpers/getsubserie",{season:SEASON,subSerieId:SUBSERIE_ID,teamid:0}),
      fetchJson("helpers/getgames",{dwl:0,season:SEASON,subSerieId:SUBSERIE_ID,teamid:0,districtid:0,gamedays:3,dog:"",levelid:-1}),
      fetchJson("serie/helpers/getstandings",{season:SEASON,subSerieId:SUBSERIE_ID}),
      fetchJson("helpers/getplayers",{
        season:SEASON,subSerieId:SUBSERIE_ID,teamid:0,nop:0,type:0,
        ...filters,"filters[SortedBy]":"PlayerPoints","filters[PlayerName]":"","filters[RoleID]":""
      }),
      fetchJson("helpers/getgoalkeepers",{
        season:SEASON,subSerieId:SUBSERIE_ID,teamid:0,nop:0,gamesratio:0,levelid:66,type:0,
        ...filters,"filters[SortedBy]":"GoalieSavesPerc","filters[PlayerName]":"","filters[RoleID]":""
      }),
      fetchJson("helpers/getteamstats",{
        season:SEASON,subSerieId:SUBSERIE_ID,...filters,"filters[SortedBy]":"TeamPoints"
      })
    ]);

    const sourceUrl=BASE+"/serie?season="+SEASON+"&lid=66&did=9&ssid="+SUBSERIE_ID;

    let {data:competition,error:compError}=await admin.from("competitions")
      .select("id")
      .eq("source",SOURCE)
      .eq("source_competition_id",SOURCE_COMPETITION_ID)
      .maybeSingle();
    if(compError) throw compError;

    if(!competition){
      const ins=await admin.from("competitions").insert({
        source:SOURCE,
        source_competition_id:SOURCE_COMPETITION_ID,
        name:"Suomi-sarja",
        league_name:"Suomi-sarja",
        season_label:SEASON_LABEL,
        group_name:"Suomi-sarja",
        country_code:"FIN",
        starts_on:"2026-09-11",
        ends_on:"2027-04-01",
        source_url:sourceUrl,
        source_updated_at:now,
        last_seen_at:now,
        updated_at:now
      }).select("id").single();
      if(ins.error) throw ins.error;
      competition=ins.data;
    }else{
      const upd=await admin.from("competitions").update({
        name:"Suomi-sarja",league_name:"Suomi-sarja",season_label:SEASON_LABEL,
        group_name:"Suomi-sarja",country_code:"FIN",starts_on:"2026-09-11",ends_on:"2027-04-01",
        source_url:sourceUrl,source_updated_at:now,last_seen_at:now,updated_at:now
      }).eq("id",competition.id);
      if(upd.error) throw upd.error;
    }
    const competitionId=competition.id;

    const extTeams=(subserie?.teams||[]).map((t:any)=>({
      extId:Number(t.TeamID),
      name:clean(t.TeamAbbrv),
      img:clean(t.TeamImg)
    })).filter((t:any)=>t.extId&&t.name);

    const teamPayload=extTeams.map((t:any)=>({
      canonical_name:t.name,
      short_name:t.name,
      country_code:"FIN",
      logo_url:logoUrl(t.img),
      logo_source:"finhockey",
      logo_source_url:sourceUrl,
      logo_updated_at:now,
      updated_at:now
    }));
    const teamUpsert=await admin.from("teams")
      .upsert(teamPayload,{onConflict:"canonical_name"})
      .select("id,canonical_name");
    if(teamUpsert.error) throw teamUpsert.error;
    const teamByName=new Map((teamUpsert.data||[]).map((t:any)=>[t.canonical_name,t.id]));
    const teamNameByExt=new Map(extTeams.map((t:any)=>[t.extId,t.name]));
    const teamByExt=new Map(extTeams.map((t:any)=>[t.extId,teamByName.get(t.name)]));

    const rosterBlocks=await parallelMap(extTeams,5,async(t:any)=>{
      const data=await fetchJson("helpers/getteamserieroster",{season:SEASON,teamid:t.extId,serieId:SERIE_ID});
      return {team:t,players:data?.Players||[]};
    });

    const parsedPlayers=new Map<string,any>();
    for(const block of rosterBlocks){
      for(const p of block.players){
        const birth=clean(p.DateOfBirth)||null;
        const key=personKey(p.FirstName,p.LastName,birth);
        if(!parsedPlayers.has(key)){
          parsedPlayers.set(key,{
            first_name:clean(p.FirstName)||null,
            last_name:clean(p.LastName)||null,
            display_name:sourceName(p.FirstName,p.LastName),
            birth_date:birth,
            nationality_code:null,
            primary_position:rolePosition(p.RoleAbbrv||p.Position),
            height_cm:intOrNull(p.Height),
            weight_kg:intOrNull(p.Weight),
            updated_at:now
          });
        }
      }
    }

    const playerPayload=[...parsedPlayers.values()].filter((p:any)=>p.display_name);
    const playerUpsert=await admin.from("players")
      .upsert(playerPayload,{onConflict:"first_name,last_name,birth_date"})
      .select("id,first_name,last_name,birth_date");
    if(playerUpsert.error) throw playerUpsert.error;
    const playerMap=new Map((playerUpsert.data||[]).map((p:any)=>[
      personKey(p.first_name,p.last_name,p.birth_date),p.id
    ]));

    const deactivate=await admin.from("team_rosters")
      .update({is_active:false,updated_at:now})
      .eq("competition_id",competitionId);
    if(deactivate.error) throw deactivate.error;

    const rosterPayload:any[]=[];
    const rosterByExternalPlayer=new Map<number,any>();
    for(const block of rosterBlocks){
      const teamId=teamByExt.get(block.team.extId);
      if(!teamId) continue;
      for(const p of block.players){
        const birth=clean(p.DateOfBirth)||null;
        const pkey=personKey(p.FirstName,p.LastName,birth);
        const playerId=playerMap.get(pkey);
        if(!playerId) continue;
        const row={
          competition_id:competitionId,
          team_id:teamId,
          player_id:playerId,
          roster_stint:1,
          jersey_number:intOrNull(p.JerseyNr??p.Number),
          position:rolePosition(p.RoleAbbrv||p.Position),
          source_name:sourceName(p.FirstName,p.LastName),
          is_active:Number(p.NotInRoster||0)!==1,
          last_seen_at:now,
          source_fragment:{
            source:SOURCE,external_player_id:p.PlayerID||null,link_id:p.LinkID||null,
            role_id:p.RoleID||null,role_abbrv:p.RoleAbbrv||p.Position||null,
            team_external_id:block.team.extId,parser:PARSER_VERSION
          },
          updated_at:now
        };
        rosterPayload.push(row);
        if(p.PlayerID) rosterByExternalPlayer.set(Number(p.PlayerID),row);
      }
    }
    if(rosterPayload.length){
      const up=await admin.from("team_rosters")
        .upsert(rosterPayload,{onConflict:"competition_id,team_id,player_id,roster_stint"});
      if(up.error) throw up.error;
    }

    const playerSeason=(skaters?.Players||[]).map((s:any)=>{
      const teamId=teamByExt.get(Number(s.TeamID));
      if(!teamId) return null;
      const source=sourceName(s.FirstName,s.LastName);
      const roster=rosterByExternalPlayer.get(Number(s.PlayerID));
      return {
        competition_id:competitionId,team_id:teamId,player_id:roster?.player_id||null,
        source_name:source,jersey_number:roster?.jersey_number||null,
        position:rolePosition(s.RoleAbbrv),
        games_played:intOrNull(s.PlayerGames),goals:intOrNull(s.PlayerGoals),
        assists:intOrNull(s.PlayerAssists),points:intOrNull(s.PlayerPoints),
        pim:intOrNull(s.PlayerPenaltyMin),plus_minus:intOrNull(s.PlayerPlusMinus),
        game_winning_goals:intOrNull(s.PlayerWinGoal),power_play_goals:intOrNull(s.PlayerGoalsPP),
        shorthanded_goals:intOrNull(s.PlayerGoalsSH),shots:null,shooting_pct:null,
        faceoff_wins:null,faceoff_losses:null,faceoff_total:null,faceoff_pct:null,
        source_fragment:{source:SOURCE,external_player_id:s.PlayerID,raw:s,parser:PARSER_VERSION},
        source_updated_at:now,updated_at:now
      };
    }).filter(Boolean);
    if(playerSeason.length){
      const up=await admin.from("player_season_stats")
        .upsert(playerSeason,{onConflict:"competition_id,team_id,source_name"});
      if(up.error) throw up.error;
    }

    const goalieSeason=(goalies?.Players||[]).map((g:any)=>{
      const teamId=teamByExt.get(Number(g.TeamID));
      if(!teamId) return null;
      const source=sourceName(g.FirstName,g.LastName);
      const roster=rosterByExternalPlayer.get(Number(g.PlayerID));
      const saves=intOrNull(g.GoalieSaves);
      const ga=intOrNull(g.GoalieGoalsAgainst);
      return {
        competition_id:competitionId,team_id:teamId,player_id:roster?.player_id||null,
        source_name:source,jersey_number:intOrNull(g.JerseyNr)||roster?.jersey_number||null,
        games_played:intOrNull(g.GoaliePlayedGames),games_started:null,games_in_net:intOrNull(g.GoaliePlayedGames),
        minutes_played_seconds:intOrNull(g.GoalieTimeOnIce),goals_against:ga,saves,
        shots_against:saves!=null&&ga!=null?saves+ga:null,
        save_pct:numberOrNull(g.GoalieSavesPercNum??g.GoalieSavesPerc),
        gaa:numberOrNull(g.GoalieGA60MinNum??g.GoalieGA60Min),
        shutouts:intOrNull(g.GoalieZeroGames),wins:intOrNull(g.GoalieWinGames),losses:intOrNull(g.GoalieLossGames),
        source_fragment:{source:SOURCE,external_player_id:g.PlayerID,raw:g,parser:PARSER_VERSION},
        source_updated_at:now,updated_at:now
      };
    }).filter(Boolean);
    if(goalieSeason.length){
      const up=await admin.from("goalie_season_stats")
        .upsert(goalieSeason,{onConflict:"competition_id,team_id,source_name"});
      if(up.error) throw up.error;
    }

    const specialPayload=(teamStats?.Teams||[]).map((s:any)=>{
      const teamId=teamByExt.get(Number(s.TeamID));
      if(!teamId) return null;
      return {
        competition_id:competitionId,team_id:teamId,games_played:intOrNull(s.TeamGames),
        pp_rank:null,pp_opportunities:null,pp_goals:intOrNull(s.TeamGoalsForPP),pp_pct:null,
        pp_seconds:null,pp_seconds_per_goal:null,
        shorthanded_goals_against:intOrNull(s.TeamGoalsAgainstSH),
        pk_rank:null,pk_opportunities:null,pk_goals_against:intOrNull(s.TeamGoalsAgainstPP),pk_pct:null,
        pk_seconds:null,pk_seconds_per_goal_against:null,
        shorthanded_goals_for:intOrNull(s.TeamGoalsForSH),
        source_fragment:{source:SOURCE,raw:s,parser:PARSER_VERSION},
        source_updated_at:now,updated_at:now
      };
    }).filter(Boolean);
    if(specialPayload.length){
      const up=await admin.from("team_special_teams_stats")
        .upsert(specialPayload,{onConflict:"competition_id,team_id"});
      if(up.error) throw up.error;
    }

    const games=(gamesBlocks||[]).flatMap((b:any)=>b.Games||[]);
    const gamePayload=games.map((g:any)=>{
      const homeId=teamByExt.get(Number(g.HomeTeam));
      const awayId=teamByExt.get(Number(g.AwayTeam));
      if(!homeId||!awayId) return null;
      return {
        competition_id:competitionId,source:SOURCE,source_game_id:String(g.GameID),
        game_number:String(g.GameID),source_event_game_id:String(g.GameID),
        scheduled_start:localStart(g.GameDateDB||g.GameDate,g.GameTime),
        home_team_id:homeId,away_team_id:awayId,venue_name:clean(g.RinkName)||null,
        attendance:intOrNull(g.Spectator),status:gameStatus(g.GameStatus),
        period:g.GameStatus===2?intOrNull(g.PeriodSummary?.PlayedPeriods):null,
        clock_display:g.GameStatus===2&&g.GameEffTime?Math.floor(Number(g.GameEffTime)/60)+":"+String(Number(g.GameEffTime)%60).padStart(2,"0"):null,
        home_score:intOrNull(g.HomeGoals)||0,away_score:intOrNull(g.AwayGoals)||0,
        went_overtime:Number(g.FinishedType)>=2,went_shootout:Number(g.FinishedType)>=3,
        source_url:BASE+"/game?gameid="+g.GameID+"&lang=fi&season="+SEASON,
        source_updated_at:now,last_seen_at:now,updated_at:now
      };
    }).filter(Boolean);
    if(gamePayload.length){
      const up=await admin.from("games").upsert(gamePayload,{onConflict:"source,source_game_id"});
      if(up.error) throw up.error;
    }

    const standingsRows=standings?.Teams||[];
    const standingsHash=await sha256(JSON.stringify(standingsRows));
    let {data:snapshot,error:snapError}=await admin.from("standings_snapshots")
      .select("id").eq("competition_id",competitionId).eq("content_hash",standingsHash).maybeSingle();
    if(snapError) throw snapError;
    if(!snapshot&&standingsRows.length){
      const ins=await admin.from("standings_snapshots").insert({
        competition_id:competitionId,content_hash:standingsHash,
        source_url:sourceUrl,source_updated_at:now
      }).select("id").single();
      if(ins.error) throw ins.error;
      snapshot=ins.data;
      const rows=standingsRows.map((s:any)=>{
        const teamName=clean(s.TeamAbbrv);
        const teamId=teamByName.get(teamName);
        if(!teamId) return null;
        return {
          snapshot_id:snapshot.id,team_id:teamId,rank:intOrNull(s.Ranking),
          games_played:intOrNull(s.Games),
          wins:(intOrNull(s.Wins)||0)+(intOrNull(s.OtWins)||0),
          ties:intOrNull(s.Ties)||0,
          losses:(intOrNull(s.Looses)||0)+(intOrNull(s.OtLooses)||0),
          goals_for:intOrNull(s.GoalsFor),goals_against:intOrNull(s.GoalsAgainst),
          goal_diff:intOrNull(s.GoalDiff),points:intOrNull(s.Points),
          source_values:{...s,parser:PARSER_VERSION}
        };
      }).filter(Boolean);
      if(rows.length){
        const rowIns=await admin.from("standings_snapshot_rows")
          .upsert(rows,{onConflict:"snapshot_id,team_id"});
        if(rowIns.error) throw rowIns.error;
      }
    }

    return Response.json({
      ok:true,competition:"Suomi-sarja",source_competition_id:SOURCE_COMPETITION_ID,
      counts:{
        teams:extTeams.length,players:playerPayload.length,roster_rows:rosterPayload.length,
        games:gamePayload.length,standings:standingsRows.length,
        player_season_stats:playerSeason.length,goalie_season_stats:goalieSeason.length,
        special_teams_stats:specialPayload.length
      },
      elapsed_ms:Date.now()-started
    });
  }catch(error){
    console.error(error);
    return Response.json({ok:false,error:String((error as any)?.message||error),elapsed_ms:Date.now()-started},{status:500});
  }
});
