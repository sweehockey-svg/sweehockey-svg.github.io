import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const ALLOWED_ORIGINS=new Set([
  "https://www.svenskehockey.se",
  "https://swnworks.se"
]);

function corsHeaders(req:Request){
  const origin=req.headers.get("Origin")||"";
  return {
    "Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(origin)?origin:"https://swnworks.se",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin"
  };
}
const clean=(v:any,max=160)=>String(v??"").replace(/\s+/g," ").trim().slice(0,max);
const normalizeEmail=(v:any)=>clean(v,254).toLowerCase();
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async(req:Request)=>{
  const CORS=corsHeaders(req);
  const json=(body:any,status=200)=>new Response(JSON.stringify(body),{
    status,
    headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}
  });
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);

  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!supabaseUrl||!serviceKey) return json({error:"server_not_configured"},500);

  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) return json({error:"auth_required"},401);

  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user) return json({error:"invalid_session"},401);

  const actorEmail=normalizeEmail(user.email);
  const {data:actor,error:actorError}=await admin.from("commentator_access")
    .select("id,email,role,team_id,league_key,active")
    .eq("email",actorEmail)
    .eq("active",true)
    .eq("role","admin")
    .is("team_id",null)
    .is("league_key",null)
    .maybeSingle();
  if(actorError) return json({error:"access_check_failed"},500);
  if(!actor) return json({error:"admin_required"},403);

  let body:any={};
  try{body=await req.json();}catch{return json({error:"invalid_json"},400);}
  const action=clean(body.action,30)||"list";

  if(action==="list"){
    const [{data:items,error:itemError},{data:teams,error:teamError}]=await Promise.all([
      admin.from("commentator_access")
        .select("id,email,role,team_id,league_key,active,display_name,note,created_at,updated_at")
        .order("active",{ascending:false})
        .order("email",{ascending:true}),
      admin.from("teams").select("id,canonical_name")
    ]);
    if(itemError||teamError) return json({error:"list_failed"},500);
    const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t.canonical_name]));
    return json({ok:true,items:(items||[]).map((item:any)=>({
      ...item,
      team_name:item.team_id?teamMap.get(item.team_id)||"Okänt lag":null
    }))});
  }

  if(action==="upsert"){
    const email=normalizeEmail(body.email);
    const scope=body.scope==="admin"?"admin":body.scope==="league"?"league":"team";
    const role=scope==="admin"?"admin":"commentator";
    const teamId=scope==="team"?clean(body.team_id,80):null;
    const leagueKey=scope==="admin"?null:clean(body.league_key,80).toLowerCase();
    const displayName=clean(body.display_name,120)||null;
    const note=clean(body.note,300)||null;

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"invalid_email"},400);
    if(scope!=="admin"&&!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(leagueKey)) return json({error:"league_required"},400);
    if(scope==="team"&&!UUID_RE.test(teamId)) return json({error:"team_required"},400);

    if(teamId){
      const {data:team,error:teamError}=await admin.from("teams").select("id").eq("id",teamId).maybeSingle();
      if(teamError||!team) return json({error:"team_not_found"},400);
    }

    let lookup=admin.from("commentator_access")
      .select("id,email,role,team_id,league_key,active")
      .eq("email",email)
      .eq("role",role);
    if(scope==="admin"){
      lookup=lookup.is("team_id",null).is("league_key",null);
    }else if(scope==="league"){
      lookup=lookup.is("team_id",null).eq("league_key",leagueKey);
    }else{
      lookup=lookup.eq("team_id",teamId).eq("league_key",leagueKey);
    }
    const {data:existing,error:lookupError}=await lookup.maybeSingle();
    if(lookupError) return json({error:"lookup_failed"},500);

    const payload={
      email,role,team_id:teamId,league_key:leagueKey,active:true,
      display_name:displayName,note,
      updated_at:new Date().toISOString()
    };

    let item:any;
    let auditAction="create";
    if(existing){
      auditAction=existing.active?"update":"reactivate";
      const {data,error}=await admin.from("commentator_access")
        .update(payload).eq("id",existing.id)
        .select("id,email,role,team_id,league_key,active,display_name,note,created_at,updated_at")
        .single();
      if(error) return json({error:"update_failed"},500);
      item=data;
    }else{
      const {data,error}=await admin.from("commentator_access")
        .insert(payload)
        .select("id,email,role,team_id,league_key,active,display_name,note,created_at,updated_at")
        .single();
      if(error) return json({error:"insert_failed"},500);
      item=data;
    }

    await admin.from("commentator_access_audit").insert({
      actor_email:actorEmail,target_email:email,action:auditAction,role,team_id:teamId,league_key:leagueKey
    });
    return json({ok:true,item});
  }

  if(action==="deactivate"){
    const id=clean(body.id,80);
    if(!UUID_RE.test(id)) return json({error:"invalid_id"},400);

    const {data:target,error:targetError}=await admin.from("commentator_access")
      .select("id,email,role,team_id,league_key,active").eq("id",id).maybeSingle();
    if(targetError) return json({error:"lookup_failed"},500);
    if(!target) return json({error:"not_found"},404);
    if(target.id===actor.id) return json({error:"cannot_deactivate_self"},400);

    const {data,error}=await admin.from("commentator_access")
      .update({active:false,updated_at:new Date().toISOString()})
      .eq("id",id)
      .select("id,email,role,team_id,league_key,active,display_name,note,created_at,updated_at")
      .single();
    if(error) return json({error:"deactivate_failed"},500);

    await admin.from("commentator_access_audit").insert({
      actor_email:actorEmail,target_email:data.email,action:"deactivate",role:data.role,team_id:data.team_id,league_key:data.league_key
    });
    return json({ok:true,item:data});
  }

  return json({error:"unknown_action"},400);
});