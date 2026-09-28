import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

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
const clean=(v:any,max=160)=>String(v??"").replace(/\s+/g," ").trim().slice(0,max);
const normalizeEmail=(v:any)=>clean(v,254).toLowerCase();
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async(req:Request)=>{
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
    .select("id,email,role,team_id,active")
    .eq("email",actorEmail)
    .eq("active",true)
    .eq("role","admin")
    .is("team_id",null)
    .maybeSingle();
  if(actorError) return json({error:"access_check_failed"},500);
  if(!actor) return json({error:"admin_required"},403);

  let body:any={};
  try{body=await req.json();}catch{return json({error:"invalid_json"},400);}
  const action=clean(body.action,30)||"list";

  if(action==="list"){
    const [{data:items,error:itemError},{data:teams,error:teamError}]=await Promise.all([
      admin.from("commentator_access")
        .select("id,email,role,team_id,active,display_name,note,created_at,updated_at")
        .order("active",{ascending:false})
        .order("email",{ascending:true}),
      admin.from("teams").select("id,canonical_name")
    ]);
    if(itemError||teamError) return json({error:"list_failed"},500);
    const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t.canonical_name]));
    return json({ok:true,items:(items||[]).map((item:any)=>({
      ...item,
      team_name:item.team_id?teamMap.get(item.team_id)||"Okänt lag":"Alla lag"
    }))});
  }

  if(action==="upsert"){
    const email=normalizeEmail(body.email);
    const role=body.role==="admin"?"admin":"commentator";
    const teamId=role==="admin"?null:clean(body.team_id,80);
    const displayName=clean(body.display_name,120)||null;
    const note=clean(body.note,300)||null;

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"invalid_email"},400);
    if(role==="commentator"&&!UUID_RE.test(teamId)) return json({error:"team_required"},400);

    if(teamId){
      const {data:team,error:teamError}=await admin.from("teams").select("id").eq("id",teamId).maybeSingle();
      if(teamError||!team) return json({error:"team_not_found"},400);
    }

    let lookup=admin.from("commentator_access")
      .select("id,email,role,team_id,active")
      .eq("email",email)
      .eq("role",role);
    lookup=teamId?lookup.eq("team_id",teamId):lookup.is("team_id",null);
    const {data:existing,error:lookupError}=await lookup.maybeSingle();
    if(lookupError) return json({error:"lookup_failed"},500);

    const payload={
      email,role,team_id:teamId,active:true,
      display_name:displayName,note,
      updated_at:new Date().toISOString()
    };

    let item:any;
    let auditAction="create";
    if(existing){
      auditAction=existing.active?"update":"reactivate";
      const {data,error}=await admin.from("commentator_access")
        .update(payload).eq("id",existing.id)
        .select("id,email,role,team_id,active,display_name,note,created_at,updated_at")
        .single();
      if(error) return json({error:"update_failed"},500);
      item=data;
    }else{
      const {data,error}=await admin.from("commentator_access")
        .insert(payload)
        .select("id,email,role,team_id,active,display_name,note,created_at,updated_at")
        .single();
      if(error) return json({error:"insert_failed"},500);
      item=data;
    }

    await admin.from("commentator_access_audit").insert({
      actor_email:actorEmail,target_email:email,action:auditAction,role,team_id:teamId
    });
    return json({ok:true,item});
  }

  if(action==="deactivate"){
    const id=clean(body.id,80);
    if(!UUID_RE.test(id)) return json({error:"invalid_id"},400);

    const {data:target,error:targetError}=await admin.from("commentator_access")
      .select("id,email,role,team_id,active").eq("id",id).maybeSingle();
    if(targetError) return json({error:"lookup_failed"},500);
    if(!target) return json({error:"not_found"},404);
    if(target.id===actor.id) return json({error:"cannot_deactivate_self"},400);

    const {data,error}=await admin.from("commentator_access")
      .update({active:false,updated_at:new Date().toISOString()})
      .eq("id",id)
      .select("id,email,role,team_id,active,display_name,note,created_at,updated_at")
      .single();
    if(error) return json({error:"deactivate_failed"},500);

    await admin.from("commentator_access_audit").insert({
      actor_email:actorEmail,target_email:data.email,action:"deactivate",role:data.role,team_id:data.team_id
    });
    return json({ok:true,item:data});
  }

  return json({error:"unknown_action"},400);
});