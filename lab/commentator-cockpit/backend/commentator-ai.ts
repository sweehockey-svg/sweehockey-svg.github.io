import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const MODEL="gpt-6-luna";
const CORS={
  "Access-Control-Allow-Origin":"https://www.svenskehockey.se",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Vary":"Origin"
};

const json=(body:any,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}
});

const cleanText=(value:any,max=500)=>String(value??"").replace(/\s+/g," ").trim().slice(0,max);

function responseText(payload:any){
  if(typeof payload?.output_text==="string") return payload.output_text;
  for(const item of payload?.output||[]){
    for(const content of item?.content||[]){
      if(content?.type==="output_text"&&typeof content.text==="string") return content.text;
    }
  }
  return "";
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);

  const started=Date.now();
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const openaiKey=Deno.env.get("OPENAI_API_KEY")||"";

  if(!supabaseUrl||!serviceKey) return json({error:"server_not_configured"},500);

  const authHeader=req.headers.get("Authorization")||"";
  const token=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";
  if(!token) return json({error:"auth_required"},401);

  const admin=createClient(supabaseUrl,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false}
  });

  const {data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user) return json({error:"invalid_session"},401);

  const email=String(user.email||"").trim().toLowerCase();

  let body:any={};
  try{body=await req.json();}catch{return json({error:"invalid_json"},400);}

  const gameId=cleanText(body.game_id,80);
  const selectedTeamId=cleanText(body.team_id,80);
  const question=cleanText(body.question,500);
  const mode=["pregame","live","studio","general"].includes(body.mode)?body.mode:"general";
  if(!/^[0-9a-f-]{36}$/i.test(gameId)) return json({error:"invalid_game_id"},400);
  if(!/^[0-9a-f-]{36}$/i.test(selectedTeamId)) return json({error:"invalid_team_id"},400);

  const cutoff=new Date(Date.now()-10*60*1000).toISOString();
  const {count:recentCount,error:countError}=await admin
    .from("commentator_ai_requests")
    .select("id",{count:"exact",head:true})
    .eq("owner_id",user.id)
    .gte("created_at",cutoff);
  if(countError) return json({error:"rate_limit_check_failed"},500);
  if((recentCount||0)>=20) return json({error:"rate_limited",retry_after_seconds:600},429);

  if(!openaiKey){
    await admin.from("commentator_ai_requests").insert({
      owner_id:user.id,game_id:gameId,model:MODEL,mode,status:"missing_api_key",
      latency_ms:Date.now()-started
    });
    return json({error:"ai_not_configured"},503);
  }

  const {data:game,error:gameError}=await admin.from("games")
    .select("id,competition_id,scheduled_start,home_team_id,away_team_id,venue_name,status,period,clock_display,home_score,away_score,source_event_game_id")
    .eq("id",gameId)
    .single();
  if(gameError||!game) return json({error:"game_not_found"},404);
  if(selectedTeamId!==game.home_team_id&&selectedTeamId!==game.away_team_id){
    return json({error:"team_not_in_game"},403);
  }

  const {data:accessRows,error:accessError}=await admin.from("commentator_access")
    .select("role,team_id,active")
    .eq("email",email)
    .eq("active",true);
  if(accessError) return json({error:"access_check_failed"},500);
  const allowed=(accessRows||[]).some((row:any)=>
    (row.role==="admin"&&row.team_id===null) ||
    (row.role==="commentator"&&row.team_id===selectedTeamId)
  );
  if(!allowed) return json({error:"access_not_approved"},403);

  const teamIds=[game.home_team_id,game.away_team_id];

  const [
    teamsResult,
    snapshotsResult,
    specialResult,
    skaterResult,
    goalieResult,
    gameStatsResult,
    eventsResult,
    recentGamesResult,
    h2hResult
  ]=await Promise.all([
    admin.from("teams").select("id,canonical_name,short_name").in("id",teamIds),
    admin.from("standings_snapshots").select("id,fetched_at").eq("competition_id",game.competition_id).order("fetched_at",{ascending:false}).limit(1),
    admin.from("team_special_teams_stats").select("team_id,games_played,pp_opportunities,pp_goals,pp_pct,pk_opportunities,pk_goals_against,pk_pct").eq("competition_id",game.competition_id).in("team_id",teamIds),
    admin.from("player_season_stats").select("team_id,player_id,source_name,jersey_number,position,games_played,goals,assists,points,shots,faceoff_pct").eq("competition_id",game.competition_id).in("team_id",teamIds),
    admin.from("goalie_season_stats").select("team_id,player_id,source_name,jersey_number,games_played,save_pct,gaa,wins,losses,shutouts").eq("competition_id",game.competition_id).in("team_id",teamIds),
    admin.from("team_game_stats").select("team_id,goals,shots,saves,pim,period_stats,power_play_opportunities,power_play_goals,power_play_pct,penalty_kill_opportunities,penalty_kill_goals_against,penalty_kill_pct").eq("game_id",game.id),
    admin.from("game_events").select("period,clock_display,event_seconds,event_type,team_id,strength,home_score,away_score,description").eq("game_id",game.id).eq("is_active",true).order("event_seconds",{ascending:false}).limit(30),
    admin.from("games").select("id,scheduled_start,home_team_id,away_team_id,home_score,away_score,status").eq("competition_id",game.competition_id).eq("status","final").or("home_team_id.in.("+teamIds.join(",")+"),away_team_id.in.("+teamIds.join(",")+")").order("scheduled_start",{ascending:false}).limit(30),
    admin.from("games").select("id,competition_id,scheduled_start,home_team_id,away_team_id,home_score,away_score,status").eq("status","final").or(
      "and(home_team_id.eq."+game.home_team_id+",away_team_id.eq."+game.away_team_id+"),and(home_team_id.eq."+game.away_team_id+",away_team_id.eq."+game.home_team_id+")"
    ).order("scheduled_start",{ascending:false}).limit(10)
  ]);

  const dbErrors=[
    teamsResult.error,snapshotsResult.error,specialResult.error,skaterResult.error,
    goalieResult.error,gameStatsResult.error,eventsResult.error,recentGamesResult.error,
    h2hResult.error
  ].filter(Boolean);
  if(dbErrors.length) return json({error:"context_load_failed"},500);

  const teams=teamsResult.data||[];
  const teamMap=new Map(teams.map((team:any)=>[team.id,team.canonical_name]));

  let standings:any[]=[];
  const snapshot=snapshotsResult.data?.[0];
  if(snapshot){
    const {data,error}=await admin.from("standings_snapshot_rows")
      .select("team_id,rank,games_played,wins,ties,losses,goals_for,goals_against,goal_diff,points")
      .eq("snapshot_id",snapshot.id)
      .in("team_id",teamIds);
    if(error) return json({error:"standings_load_failed"},500);
    standings=data||[];
  }

  const recentGames=(recentGamesResult.data||[]).filter((g:any)=>
    teamIds.includes(g.home_team_id)||teamIds.includes(g.away_team_id)
  );
  const forms:any={};
  for(const teamId of teamIds){
    forms[teamMap.get(teamId)||teamId]=recentGames
      .filter((g:any)=>g.home_team_id===teamId||g.away_team_id===teamId)
      .slice(0,5)
      .map((g:any)=>({
        date:g.scheduled_start,
        opponent:teamMap.get(g.home_team_id===teamId?g.away_team_id:g.home_team_id)||"annat lag",
        gf:g.home_team_id===teamId?g.home_score:g.away_score,
        ga:g.home_team_id===teamId?g.away_score:g.home_score
      }));
  }

  const topSkaters:any={};
  for(const teamId of teamIds){
    topSkaters[teamMap.get(teamId)||teamId]=(skaterResult.data||[])
      .filter((row:any)=>row.team_id===teamId&&row.position!=="GK")
      .sort((a:any,b:any)=>Number(b.points||0)-Number(a.points||0)||Number(b.goals||0)-Number(a.goals||0))
      .slice(0,5);
  }

  const goalies:any={};
  for(const teamId of teamIds){
    goalies[teamMap.get(teamId)||teamId]=(goalieResult.data||[])
      .filter((row:any)=>row.team_id===teamId)
      .sort((a:any,b:any)=>Number(b.games_played||0)-Number(a.games_played||0))
      .slice(0,3);
  }

  const context={
    data_policy:{
      official_stats:"All hockey facts below are database records imported from Swehockey.",
      private_notes:"Private commentator notes are intentionally excluded from this AI request."
    },
    mode,
    game:{
      id:game.id,
      scheduled_start:game.scheduled_start,
      home:teamMap.get(game.home_team_id),
      away:teamMap.get(game.away_team_id),
      venue:game.venue_name,
      status:game.status,
      period:game.period,
      clock:game.clock_display,
      score:{home:game.home_score,away:game.away_score}
    },
    standings,
    form_last_5:forms,
    h2h:(h2hResult.data||[]).map((g:any)=>({
      date:g.scheduled_start,
      home:teamMap.get(g.home_team_id)||g.home_team_id,
      away:teamMap.get(g.away_team_id)||g.away_team_id,
      score:g.home_score+"-"+g.away_score
    })),
    special_teams:specialResult.data||[],
    top_skaters:topSkaters,
    goalies,
    current_match_stats:gameStatsResult.data||[],
    current_events:eventsResult.data||[]
  };

  const systemPrompt=[
    "Du är en svensk hockeykommentators assistent.",
    "Använd ENDAST fakta som finns i JSON-kontexten.",
    "Hitta aldrig på statistik, historik, skador, relationer, tidigare klubbar eller biografiska detaljer.",
    "Privata/redaktionella anteckningar ingår inte i kontexten och får inte efterfrågas eller antas.",
    "Om underlaget är litet, säg det kort.",
    "Skriv för direktsändning: kort, naturligt, konkret och lätt att säga högt.",
    "Ge 2–3 talking points. Upprepa inte samma poäng i olika formuleringar.",
    "source_refs ska bara innehålla namn på toppnivåfält i kontexten som faktiskt stöder påståendet."
  ].join("\n");

  const openaiBody={
    model:MODEL,
    store:false,
    reasoning:{effort:"low"},
    input:[
      {role:"developer",content:systemPrompt},
      {role:"user",content:JSON.stringify({
        question:question||"Ge mig de mest relevanta talking points just nu.",
        context
      })}
    ],
    text:{
      format:{
        type:"json_schema",
        name:"commentator_brief",
        strict:true,
        schema:{
          type:"object",
          properties:{
            headline:{type:"string"},
            talking_points:{
              type:"array",
              minItems:2,
              maxItems:3,
              items:{
                type:"object",
                properties:{
                  label:{type:"string"},
                  text:{type:"string"},
                  why_now:{type:"string"},
                  source_refs:{type:"array",items:{type:"string"},maxItems:5}
                },
                required:["label","text","why_now","source_refs"],
                additionalProperties:false
              }
            },
            caution:{type:"string"}
          },
          required:["headline","talking_points","caution"],
          additionalProperties:false
        }
      }
    },
    max_output_tokens:700
  };

  let openai:any;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+openaiKey,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(openaiBody)
    });
    openai=await response.json();
    if(!response.ok){
      console.error("OpenAI error",response.status,openai?.error?.code||openai?.error?.type||"unknown");
      await admin.from("commentator_ai_requests").insert({
        owner_id:user.id,game_id:game.id,model:MODEL,mode,status:"openai_error",
        latency_ms:Date.now()-started
      });
      return json({error:"ai_provider_error"},502);
    }
  }catch(error){
    console.error("OpenAI request failed",error);
    return json({error:"ai_provider_unreachable"},502);
  }

  const raw=responseText(openai);
  let brief:any;
  try{brief=JSON.parse(raw);}catch{
    await admin.from("commentator_ai_requests").insert({
      owner_id:user.id,game_id:game.id,model:MODEL,mode,status:"parse_error",
      latency_ms:Date.now()-started
    });
    return json({error:"ai_parse_error"},502);
  }

  await admin.from("commentator_ai_requests").insert({
    owner_id:user.id,game_id:game.id,model:MODEL,mode,status:"ok",
    latency_ms:Date.now()-started
  });

  return json({
    ok:true,
    model:MODEL,
    generated_at:new Date().toISOString(),
    data_scope:"official_swehockey_only",
    brief
  });
});