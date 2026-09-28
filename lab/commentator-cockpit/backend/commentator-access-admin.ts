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

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);

  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!supabaseUrl||!serviceKey) return json({error:"server_not_configured"},500);

  const authHeader=req.headers.get("Authorization")||"";
  const token=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";
  if(!token) return json({error:"auth_required"},401);

  const admin=createClient(supabaseUrl,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user) return json({error:"invalid_session"},401);

  const actorEmail=normalizeEmail(user.email);
  const {data:actor,error:actorError}=await admin.from("commentator_access")
    .select("id,email,role,active")
    .ilike("email",actorEmail)
    .eq("active",true)
    .eq("role","admin")
    .maybeSingle();
  if(actorError) return json({error:"access_check_failed"},500);
  if(!actor) return json({error:"admin_required"},403);

  let body:any={};
  try{body=await req.json();}catch{return json({error:"invalid_json"},400);}
  const action=clean(body.action,30)||"list";

  if(action==="list"){
    const {data,error}=await admin.from("commentator_access")
      .select("id,email,role,active,display_name,note,created_at,updated_at")
      .order("active",{ascending:false})
      .order("email",{ascending:true});
    if(error) return json({error:"list_failed"},500);
    return json({ok:true,items:data||[]});
  }

  if(action==="upsert"){
    const email=normalizeEmail(body.email);
    const role=body.role==="admin"?"admin":"commentator";
    const displayName=clean(body.display_name,120)||null;
    const note=clean(body.note,300)||null;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"invalid_email"},400);

    const {data:existing,error:existingError}=await admin.from("commentator_access")
      .select("id,email,role,active")
      .ilike("email",email)
      .maybeSingle();
    if(existingError) return json({error:"lookup_failed"},500);

    let item:any;
    let auditAction="create";
    if(existing){
      auditAction=existing.active?"update":"reactivate";
      const {data,error}=await admin.from("commentator_access")
        .update({
          email,
          role,
          active:true,
          display_name:displayName,
          note,
          updated_at:new Date().toISOString()
        })
        .eq("id",existing.id)
        .select("id,email,role,active,display_name,note,created_at,updated_at")
        .single();
      if(error) return json({error:"update_failed"},500);
      item=data;
    }else{
      const {data,error}=await admin.from("commentator_access")
        .insert({email,role,active:true,display_name:displayName,note})
        .select("id,email,role,active,display_name,note,created_at,updated_at")
        .single();
      if(error) return json({error:"insert_failed"},500);
      item=data;
    }

    await admin.from("commentator_access_audit").insert({
      actor_email:actorEmail,target_email:email,action:auditAction,role
    });
    return json({ok:true,item});
  }

  if(action==="deactivate"){
    const email=normalizeEmail(body.email);
    if(email===actorEmail) return json({error:"cannot_deactivate_self"},400);
    const {data,error}=await admin.from("commentator_access")
      .update({active:false,updated_at:new Date().toISOString()})
      .ilike("email",email)
      .select("id,email,role,active,display_name,note,created_at,updated_at")
      .maybeSingle();
    if(error) return json({error:"deactivate_failed"},500);
    if(!data) return json({error:"not_found"},404);
    await admin.from("commentator_access_audit").insert({
      actor_email:actorEmail,target_email:email,action:"deactivate",role:data.role
    });
    return json({ok:true,item:data});
  }

  return json({error:"unknown_action"},400);
});