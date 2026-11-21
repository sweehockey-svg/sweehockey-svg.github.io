window.SEH_STUDIO_ACCESS_READY = (async () => {
  "use strict";
  const main = document.querySelector("main");
  main.hidden = true;
  const notice = document.createElement("p");
  notice.setAttribute("role", "status");
  notice.style.cssText = "padding:40px;color:#fff;max-width:800px;margin:auto";
  notice.textContent = "Kontrollerar studiobehörighet…";
  main.before(notice);
  try {
    const cfg=window.SEH_CONFIG || window.EHOCKEY_CONFIG;
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
    const {data,error}=await client.auth.getUser();
    if(error || !data.user) throw new Error("Logga in på Svensk eHockey för att öppna studion.");
    const source=await window.SEH_WINTER_STUDIO.load();
    const params=new URLSearchParams(location.search);
    const requested=Number(params.get("teamId"));
    const name=params.get("team") || "";
    let team=source.teams.find(t => requested ? Number(t.localTeamId)===requested : t.name.toLowerCase()===name.toLowerCase());
    const result=await client.rpc("seh_winter_studio_access");
    if(result.error) throw result.error;
    const permission=Array.isArray(result.data) ? result.data[0] : result.data;
    if(!team && !requested && !name && permission?.teams?.length)
      team=source.teams.find(t => Number(t.id)===Number(permission.teams[0].teamId));
    const permitted=team && permission?.teams?.some(t => Number(t.teamId)===Number(team.id));
    if(!permission?.is_admin && !permitted)
      throw new Error("Studion är tillgänglig för registrerade Winter-kaptener med en godkänd spelarkoppling.");
    const access={mode:permission.is_admin ? "admin" : "captain",teamName:team?.name || ""};
    window.SEH_MATCH_GRAPHICS_ACCESS=access;
    notice.remove();
    main.hidden=false;
    return access;
  } catch(error) {
    notice.textContent=error.message || "Behörigheten kunde inte kontrolleras.";
    const link=document.createElement("a");
    link.href="/#/min-profil";
    link.textContent=" Öppna Min profil →";
    link.style.color="#ffd400";
    notice.append(link);
    return null;
  }
})();
