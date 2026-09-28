
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";
import { DateTime } from "npm:luxon@3.5.0";

const BASE="https://stats.swehockey.se";
const SOURCE="swehockey";
const ZONE="Europe/Stockholm";
const UA="HockeyCommentator/0.1 (+https://www.svenskehockey.se/lab/commentator-cockpit/)";
const ALLOWED=new Map([
  ["18270",{name:"Hockeyettan Norra",league:"Hockeyettan",season:"2025/26",group:"Norra"}]
]);

const admin=createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {auth:{persistSession:false,autoRefreshToken:false}}
);

const clean=(s:string|null|undefined)=>(s||"").replace(/\s+/g," ").trim();

function directRows($:cheerio.CheerioAPI,table:any){
  return $(table).children("tbody").children("tr").map((_:number,tr:any)=>({
    cells:$(tr).children("th,td").map((__:number,td:any)=>clean($(td).text())).get(),
    links:$(tr).find("a").map((__:number,a:any)=>({
      text:clean($(a).text()),
      href:$(a).attr("href")||""
    })).get(),
    titles:$(tr).find("[title]").map((__:number,el:any)=>clean($(el).attr("title")||"")).get()
  })).get();
}

function splitGame(text:string){
  const idx=text.indexOf(" - ");
  if(idx<1) return null;
  return [clean(text.slice(0,idx)),clean(text.slice(idx+3))] as const;
}

function parseScore(text:string){
  const m=clean(text).match(/^(\d+)\s*-\s*(\d+)/);
  return m ? [Number(m[1]),Number(m[2])] as const : null;
}

function localIso(date:string,time:string){
  const dt=DateTime.fromFormat(`${date} ${time}`,"yyyy-MM-dd HH:mm",{zone:ZONE});
  return dt.isValid ? dt.toUTC().toISO() : null;
}

async function fetchHtml(path:string){
  const url=BASE+path;
  const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"text/html,application/xhtml+xml"}});
  const text=await r.text();
  if(!r.ok) throw new Error(`Swehockey ${r.status} for ${url}`);
  return {url,text,status:r.status};
}

Deno.serve(async(req:Request)=>{
  const started=Date.now();
  try{
    const candidate=req.headers.get("x-sync-token")||"";
    const {data:valid,error:authError}=await admin.rpc("validate_swehockey_sync_token",{candidate});
    if(authError||valid!==true) return Response.json({error:"forbidden"},{status:403});

    let body:any={};
    try{body=await req.json();}catch{}
    const sourceCompetitionId=String(body.competition_id||"18270");
    const meta=ALLOWED.get(sourceCompetitionId);
    if(!meta) return Response.json({error:"competition_not_allowed"},{status:400});

    const schedule=await fetchHtml(`/ScheduleAndResults/Schedule/${sourceCompetitionId}`);
    const $=cheerio.load(schedule.text);
    const tables=$("table.tblContent").toArray().map(t=>directRows($,t));
    const rows=tables.find((r:any[])=>r.some((x:any)=>x.cells.includes("Date")&&x.cells.includes("Time")&&x.cells.includes("Game"))) || [];

    let currentDate="";
    const games:any[]=[];
    const teamNames=new Set<string>();

    for(const row of rows){
      const explicitDate=row.cells.find((c:string)=>/^\d{4}-\d{2}-\d{2}$/.test(c));
      if(explicitDate) currentDate=explicitDate;
      if(!currentDate) continue;

      const time=row.cells.find((c:string)=>/^\d{2}:\d{2}$/.test(c));
      const gameIndex=row.cells.findIndex((c:string)=>c.includes(" - "));
      if(!time||gameIndex<0) continue;

      const teams=splitGame(row.cells[gameIndex]);
      if(!teams) continue;
      const score=parseScore(row.cells[gameIndex+1]||"");
      if(!score) continue;

      const hrefs=row.links.map((l:any)=>l.href).join(" ");
      const eventMatch=hrefs.match(/\/Game\/(?:Events|Reports|LineUps)\/(\d+)/);
      const eventId=eventMatch ? eventMatch[1] : null;
      const gameNumber=row.titles.find((v:string)=>/^90\d{6}$/.test(v)) || null;
      const scheduledStart=localIso(currentDate,time);
      if(!scheduledStart) continue;

      teamNames.add(teams[0]); teamNames.add(teams[1]);
      games.push({
        date:currentDate,time,
        scheduledStart,
        home:teams[0],away:teams[1],
        homeScore:score[0],awayScore:score[1],
        venue:row.cells[row.cells.length-1]||null,
        eventId,gameNumber
      });
    }

    let {data:competition,error:compError}=await admin.from("competitions")
      .select("id")
      .eq("source",SOURCE)
      .eq("source_competition_id",sourceCompetitionId)
      .maybeSingle();
    if(compError) throw compError;

    if(!competition){
      const ins=await admin.from("competitions").insert({
        source:SOURCE,
        source_competition_id:sourceCompetitionId,
        name:meta.name,
        league_name:meta.league,
        season_label:meta.season,
        group_name:meta.group,
        country_code:"SWE",
        source_url:schedule.url
      }).select("id").single();
      if(ins.error) throw ins.error;
      competition=ins.data;
    }else{
      const upd=await admin.from("competitions").update({
        name:meta.name,
        league_name:meta.league,
        season_label:meta.season,
        group_name:meta.group,
        country_code:"SWE",
        source_url:schedule.url,
        last_seen_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }).eq("id",competition.id);
      if(upd.error) throw upd.error;
    }

    const teamPayload=[...teamNames].map(canonical_name=>({
      canonical_name,
      country_code:"SWE",
      updated_at:new Date().toISOString()
    }));
    const teamUpsert=await admin.from("teams")
      .upsert(teamPayload,{onConflict:"canonical_name"})
      .select("id,canonical_name");
    if(teamUpsert.error) throw teamUpsert.error;
    const teamMap=new Map(teamUpsert.data.map((t:any)=>[t.canonical_name,t.id]));

    const now=new Date().toISOString();
    const gamePayload=games.map(g=>({
      competition_id:competition.id,
      source:SOURCE,
      source_game_id:g.eventId
        ? `history:${sourceCompetitionId}:event:${g.eventId}`
        : `history:${sourceCompetitionId}:${g.date}|${g.home}|${g.away}`,
      source_event_game_id:g.eventId,
      game_number:g.gameNumber,
      scheduled_start:g.scheduledStart,
      home_team_id:teamMap.get(g.home),
      away_team_id:teamMap.get(g.away),
      venue_name:g.venue,
      status:"final",
      home_score:g.homeScore,
      away_score:g.awayScore,
      source_url:g.eventId ? `${BASE}/Game/Events/${g.eventId}` : schedule.url,
      last_seen_at:now,
      updated_at:now
    })).filter(g=>g.home_team_id&&g.away_team_id);

    const up=await admin.from("games")
      .upsert(gamePayload,{onConflict:"source,source_game_id"});
    if(up.error) throw up.error;

    const vasbyId=teamMap.get("Väsby IK HK");
    const suraId=teamMap.get("Surahammars IF");
    const pair=gamePayload
      .filter(g=>vasbyId&&suraId&&
        ((g.home_team_id===vasbyId&&g.away_team_id===suraId)||
         (g.home_team_id===suraId&&g.away_team_id===vasbyId)))
      .sort((a,b)=>new Date(b.scheduled_start).getTime()-new Date(a.scheduled_start).getTime());

    return Response.json({
      ok:true,
      competition_id:sourceCompetitionId,
      season:meta.season,
      imported_games:gamePayload.length,
      teams:teamPayload.length,
      vasby_surahammar:pair.map(g=>({
        scheduled_start:g.scheduled_start,
        home_score:g.home_score,
        away_score:g.away_score,
        home:g.home_team_id===vasbyId?"Väsby IK HK":"Surahammars IF",
        away:g.away_team_id===suraId?"Surahammars IF":"Väsby IK HK",
        event_id:g.source_event_game_id
      })),
      elapsed_ms:Date.now()-started
    });
  }catch(error){
    console.error("swehockey-history-sync failed",error);
    return Response.json({
      ok:false,
      error:error instanceof Error?error.message:String(error),
      elapsed_ms:Date.now()-started
    },{status:500});
  }
});
