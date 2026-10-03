import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const HOCKEYTVAAN_SOURCE_IDS = [
  "21088","21089","21090",
  "21213","21214",
  "21505",
  "21319","21320","21321"
];

const EP_SEARCH = "https://search.eliteprospects.com/api/quicksearch";
const EP_LOGOS = "https://files.eliteprospects.com/layout/logos";
const BUCKET = "team-logos";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession:false, autoRefreshToken:false }
});

const clean = (value:string|null|undefined) => (value || "").replace(/\s+/g," ").trim();

function normalizeName(value:string) {
  return clean(value)
    .toLocaleLowerCase("sv-SE")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/&/g," och ")
    .replace(/[^a-z0-9åäö]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function baseClubName(value:string) {
  return normalizeName(value)
    .replace(/\b(?:hockeyklubb|ishockey|hockey|hk|hc)\b/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function looksYouthOrWomen(value:string) {
  return /\b(?:u1[6-9]|u20|j1[8-9]|j20|women|dam|junior|2)\b/i.test(value);
}

function scoreCandidate(teamName:string,candidate:any) {
  const target=normalizeName(teamName);
  const result=normalizeName(candidate?.name || "");
  const targetBase=baseClubName(teamName);
  const resultBase=baseClubName(candidate?.name || "");
  let score=0;

  if(result===target) score+=120;
  else if(resultBase===targetBase) score+=95;
  else if(result.includes(target)||target.includes(result)) score+=55;

  const league=clean(candidate?.leagueName || candidate?.league || "");
  if(/^HockeyTvåan$/i.test(league)) score+=45;
  else if(/Division 2/i.test(league)) score+=30;
  else if(/Not Active/i.test(league)) score-=20;

  if(clean(candidate?.nationalityName)==="Sweden") score+=15;
  if(looksYouthOrWomen((candidate?.slug || "")+" "+(candidate?.league || "")+" "+(candidate?.leagueName || ""))) score-=90;
  if(!candidate?.logo) score-=200;

  return score;
}

function extensionFromLogo(filename:string,contentType:string) {
  const ext=(filename.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
  if(["png","jpg","jpeg","webp","gif","svg"].includes(ext)) return ext==="jpeg"?"jpg":ext;
  if(contentType.includes("png")) return "png";
  if(contentType.includes("webp")) return "webp";
  if(contentType.includes("gif")) return "gif";
  if(contentType.includes("svg")) return "svg";
  return "jpg";
}

function slugify(value:string) {
  return normalizeName(value)
    .replace(/[åä]/g,"a")
    .replace(/ö/g,"o")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,80) || "team";
}

async function findEliteProspectsTeam(teamName:string) {
  const url=EP_SEARCH+"?q="+encodeURIComponent(teamName)+"&collection=teams";
  const response=await fetch(url,{
    headers:{"User-Agent":"SWNWORKS-Commentator-Cockpit/1.0"},
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok) throw new Error("EP search "+response.status);
  const payload=await response.json();
  const results=payload?.data?.results || [];
  const ranked=results
    .map((candidate:any)=>({candidate,score:scoreCandidate(teamName,candidate)}))
    .sort((a:any,b:any)=>b.score-a.score);
  const best=ranked[0] || null;
  if(!best || best.score<70) {
    return {match:null,score:best?.score ?? null,candidates:ranked.slice(0,3)};
  }
  return {match:best.candidate,score:best.score,candidates:ranked.slice(0,3)};
}

async function hockeyTvaanTeamIds() {
  const {data:competitions,error:competitionError}=await admin.from("competitions")
    .select("id,source_competition_id")
    .eq("source","swehockey")
    .in("source_competition_id",HOCKEYTVAAN_SOURCE_IDS);
  if(competitionError) throw competitionError;
  const competitionIds=(competitions || []).map((row:any)=>row.id);
  if(!competitionIds.length) return [];

  const [{data:rosters,error:rosterError},{data:snapshots,error:snapshotError}]=await Promise.all([
    admin.from("team_rosters")
      .select("team_id,competition_id")
      .in("competition_id",competitionIds)
      .eq("is_active",true),
    admin.from("standings_snapshots")
      .select("id,competition_id,fetched_at")
      .in("competition_id",competitionIds)
      .order("fetched_at",{ascending:false})
  ]);
  if(rosterError) throw rosterError;
  if(snapshotError) throw snapshotError;

  const ids=new Set<string>((rosters || []).map((row:any)=>row.team_id).filter(Boolean));
  const latestSnapshotByCompetition=new Map<string,string>();
  for(const row of snapshots || []) {
    if(!latestSnapshotByCompetition.has(row.competition_id)) {
      latestSnapshotByCompetition.set(row.competition_id,row.id);
    }
  }

  const snapshotIds=[...latestSnapshotByCompetition.values()];
  if(snapshotIds.length) {
    const {data:rows,error:rowsError}=await admin.from("standings_snapshot_rows")
      .select("team_id,snapshot_id")
      .in("snapshot_id",snapshotIds);
    if(rowsError) throw rowsError;
    for(const row of rows || []) if(row.team_id) ids.add(row.team_id);
  }

  return [...ids];
}

async function syncLogo(team:any,force:boolean) {
  if(team.logo_url && !force) return {team:team.canonical_name,state:"existing",logo_url:team.logo_url};

  const search=await findEliteProspectsTeam(team.canonical_name);
  if(!search.match) {
    return {
      team:team.canonical_name,
      state:"unresolved",
      best_score:search.score,
      candidates:search.candidates.map((row:any)=>({
        name:row.candidate?.name,
        league:row.candidate?.leagueName || row.candidate?.league,
        score:row.score
      }))
    };
  }

  const match=search.match;
  const sourceLogoUrl=EP_LOGOS+"/"+match.logo;
  const imageResponse=await fetch(sourceLogoUrl,{
    headers:{"User-Agent":"SWNWORKS-Commentator-Cockpit/1.0"},
    signal:AbortSignal.timeout(15000)
  });
  if(!imageResponse.ok) throw new Error("EP logo "+imageResponse.status+" for "+team.canonical_name);

  const contentType=clean(imageResponse.headers.get("content-type")) || "image/png";
  if(!contentType.startsWith("image/")) throw new Error("Unexpected logo content type "+contentType);
  const bytes=new Uint8Array(await imageResponse.arrayBuffer());
  if(!bytes.length) throw new Error("Empty logo for "+team.canonical_name);
  if(bytes.length>5*1024*1024) throw new Error("Logo too large for "+team.canonical_name);

  const ext=extensionFromLogo(match.logo,contentType);
  const objectPath="hockeytvaan/"+slugify(team.canonical_name)+"."+ext;
  const {error:uploadError}=await admin.storage.from(BUCKET)
    .upload(objectPath,bytes,{contentType,upsert:true,cacheControl:"86400"});
  if(uploadError) throw uploadError;

  const {data:publicData}=admin.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl=publicData.publicUrl;
  const sourcePageUrl="https://www.eliteprospects.com/team/"+match.id+"/"+match.slug;
  const now=new Date().toISOString();

  const {error:updateError}=await admin.from("teams").update({
    logo_url:publicUrl,
    logo_source:"eliteprospects",
    logo_source_url:sourcePageUrl,
    logo_updated_at:now,
    updated_at:now
  }).eq("id",team.id);
  if(updateError) throw updateError;

  return {
    team:team.canonical_name,
    state:"updated",
    score:search.score,
    ep_team_id:match.id,
    ep_name:match.name,
    source_page:sourcePageUrl,
    logo_url:publicUrl,
    bytes:bytes.length
  };
}

Deno.serve(async(req:Request)=>{
  const started=Date.now();
  try{
    const candidate=req.headers.get("x-sync-token") || "";
    const {data:valid,error:authError}=await admin.rpc("validate_swehockey_sync_token",{candidate});
    if(authError || valid!==true) return Response.json({error:"forbidden"},{status:403});

    let body:any={};
    try{body=await req.json();}catch{}

    const force=body.force===true;
    const offset=Math.max(0,Math.floor(Number(body.offset)||0));
    const limit=Math.min(25,Math.max(1,Math.floor(Number(body.limit)||20)));

    const teamIds=await hockeyTvaanTeamIds();
    const {data:teams,error:teamsError}=await admin.from("teams")
      .select("id,canonical_name,logo_url,logo_source,logo_source_url")
      .in("id",teamIds)
      .order("canonical_name",{ascending:true});
    if(teamsError) throw teamsError;

    const eligible=(teams || []).filter((team:any)=>force || !team.logo_url);
    const batch=eligible.slice(offset,offset+limit);
    const results:any[]=[];

    for(let i=0;i<batch.length;i+=4){
      const group=batch.slice(i,i+4);
      const groupResults=await Promise.all(group.map(async(team:any)=>{
        try{return await syncLogo(team,force);}
        catch(error){
          return {team:team.canonical_name,state:"error",error:String((error as any)?.message || error)};
        }
      }));
      results.push(...groupResults);
    }

    const counts=results.reduce((acc:any,row:any)=>{
      acc[row.state]=(acc[row.state]||0)+1;
      return acc;
    },{});

    return Response.json({
      ok:true,
      total_hockeytvaan_teams:(teams || []).length,
      eligible:eligible.length,
      offset,
      limit,
      processed:results.length,
      counts,
      next_offset:offset+results.length<eligible.length ? offset+results.length : null,
      results,
      elapsed_ms:Date.now()-started
    });
  }catch(error){
    return Response.json({ok:false,error:String((error as any)?.message || error),elapsed_ms:Date.now()-started},{status:500});
  }
});
