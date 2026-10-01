(() => {
  "use strict";

  const cfg = window.COMMENTATOR_CONFIG;
  const sb = window.supabase;
  const client = cfg && sb ? sb.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  const state = {
    competition: null,
    teams: [],
    teamById: new Map(),
    focusTeam: null,
    opponent: null,
    nextGame: null,
    upcomingGames: [],
    standings: [],
    standingsByTeam: new Map(),
    roster: [],
    playerProfiles: new Map(),
    focusForm: [],
    opponentForm: [],
    latestFocusGame: null,
    latestEvents: [],
    latestTeamStats: new Map(),
    latestPlayerStats: [],
    latestGoalieStats: [],
    seasonPlayerStats: [],
    seasonGoalieStats: [],
    recentPlayerStats: [],
    recentGoalieStats: [],
    currentPlayerStats: [],
    currentGoalieStats: [],
    nextLineup: null,
    fallbackLineups: new Map(),
    seasonSpecialTeams: [],
    teamGameStats: [],
    competitionById: new Map(),
    h2hGames: [],
    currentEvents: [],
    seenFactIds: new Set(),
    lastQuickFactIds: [],
    liveRefreshBusy: false,
    notes: [],
    aiBrief: null,
    aiBriefSource: "local",
    aiBusy: false,
    aiError: "",
    aiUsedTopics: [],
    authUser: null,
    authBusy: false,
    authMessage: "",
    authMessageType: "",
    authEmailDraft: "",
    cloudSyncState: "local",
    cloudSyncMessage: "",
    access: null,
    accessRows: [],
    competitionTeams: [],
    teamCompetitionByTeam: new Map(),
    selectedCompetition: null,
    selectedTeam: null,
    selectedTeamSlug: "",
    teamDataLoaded: false,
    teamLoading: false,
    teamLoadError: "",
    loadWarnings: [],
    lastLiveRefreshAt: null,
    lastLiveRefreshError: "",
    accessAdminItems: [],
    accessAdminLoaded: false,
    accessAdminBusy: false,
    accessAdminError: ""
  };

  const panels = {
    match: {
      kicker: "MATCH",
      title: "Matchöversikt",
      cards: [
        ["Nästa match", "Laddar från Hockeyettan 2026/27."],
        ["Datakälla", "Swehockey → collector → Supabase → cockpit."]
      ]
    },
    lines: {
      kicker: "KEDJOR",
      title: "Matchkedjor",
      cards: []
    },
    players: {
      kicker: "SPELARE",
      title: "Spelarstatistik",
      cards: []
    },
    goalies: {
      kicker: "MÅLVAKTER",
      title: "Målvaktsstatistik",
      cards: []
    },
    special: {
      kicker: "PP / BP",
      title: "Special teams",
      cards: []
    },
    live: {
      kicker: "LIVE",
      title: "Live matchdata",
      cards: [
        ["Matchcollector", "Matchrapport, lineup och events hämtas automatiskt när Swehockey publicerar dem."],
        ["Grunddata", "Schema, resultat, tabell, roster och statistik synkas automatiskt."]
      ]
    },
    story: {
      kicker: "STORYLINES",
      title: "Matchens vinklar",
      cards: []
    },
    h2h: {
      kicker: "H2H",
      title: "Tidigare möten",
      cards: []
    },
    studio: {
      kicker: "STUDIO",
      title: "Periodunderlag",
      cards: []
    },
    notes: {
      kicker: "NOTES",
      title: "Redaktionella anteckningar",
      cards: []
    },
    ai: {
      kicker: "AI",
      title: "Talking point-assistent",
      cards: []
    },
    account: {
      kicker: "KONTO",
      title: "Inloggning & molnsynk",
      cards: []
    }
  };

  const drawer = document.getElementById("drawer");
  const drawerKicker = document.getElementById("drawerKicker");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");
  const THEME_STORAGE_KEY = "commentator-cockpit-theme";

  function currentTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function updateThemeToggle() {
    const button=document.getElementById("themeToggle");
    if(!button) return;
    const light=currentTheme()==="light";
    button.innerHTML='<span aria-hidden="true">'+(light?"☀":"☾")+'</span><strong>'+(light?"LJUS":"MÖRK")+'</strong>';
    button.setAttribute("aria-label",light?"Byt till mörkt läge":"Byt till ljust läge");
    button.setAttribute("title",light?"Byt till mörkt läge":"Byt till ljust läge");
  }

  function setTheme(theme) {
    const next=theme==="light"?"light":"dark";
    document.documentElement.dataset.theme=next;
    try{ localStorage.setItem(THEME_STORAGE_KEY,next); }catch{}
    updateThemeToggle();
  }

  function setDrawerOpen(open) {
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("drawer-open", open);
  }

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const NATIONALITIES = Object.freeze({
    SWE:["SE","Sverige"],
    FIN:["FI","Finland"],
    NOR:["NO","Norge"],
    CZE:["CZ","Tjeckien"],
    LAT:["LV","Lettland"],
    CAN:["CA","Kanada"],
    AUT:["AT","Österrike"],
    DEN:["DK","Danmark"],
    EST:["EE","Estland"],
    GBR:["GB","Storbritannien"],
    LTU:["LT","Litauen"],
    NED:["NL","Nederländerna"],
    ROM:["RO","Rumänien"],
    SUI:["CH","Schweiz"],
    UKR:["UA","Ukraina"],
    USA:["US","USA"]
  });

  function nationalityMarkup(playerId) {
    const code = String(state.playerProfiles.get(playerId)?.nationality_code || "").trim().toUpperCase();
    if (!code) return "";
    const entry = NATIONALITIES[code];
    const alpha2 = String(entry?.[0] || (code.length === 2 ? code : "")).toLowerCase();
    const label = entry?.[1] || code;
    return /^[a-z]{2}$/.test(alpha2)
      ? '<img class="player-flag" src="https://flagcdn.com/20x15/' + esc(alpha2) + '.png" srcset="https://flagcdn.com/40x30/' + esc(alpha2) + '.png 2x" width="20" height="15" loading="lazy" decoding="async" alt="' + esc(label) + '" title="' + esc(label) + '">'
      : '<span class="player-country-code" title="' + esc(label) + '">' + esc(code) + '</span>';
  }


  const HOCKEYETTAN_LOGO="https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_Hockeyettan.svg";
  const TEAM_LOGOS=Object.freeze({
    "Asplöven Haparanda Hockey Förening":"https://files.eliteprospects.com/layout/logos/425eee90-8102-491a-9e98-3ceebaa07264_large.png",
    "Bodens HF":"https://cdn.api.everysport.com/logos/ishockey/bodens_hf_37750/1580983280534.png.cropped.png",
    "Borlänge HF":"https://cdn.api.everysport.com/logos/ishockey/borl_nge_hf_3932/1580983254910.png",
    "Enköpings SK HK":"https://cdn.api.everysport.com/logos/ishockey/enk_pings_sk_hk_202686/1669289501830.png.cropped.png",
    "Hudiksvalls HC":"https://cdn.api.everysport.com/logos/ishockey/hudiksvalls_hc_117146/1637920246862.png.cropped.png",
    "IF Sundsvall Hockey":"https://files.eliteprospects.com/layout/logos/ce38e0bd-a849-4d8f-819a-da4a0f24361b_large.png",
    "Järfälla HC":"https://blob.api.swehockey.net/blob/184c68ef-a8a8-4ec8-8769-1c375f31bfd6.png",
    "Kalix HC":"https://cdn.api.everysport.com/logos/ishockey/kalix_hc_146840/1637918356560.png",
    "Kiruna IF":"https://imgk.svenskafans.com/articlemedia/image-original/559077.jpg?format=webp&quality=75&width=640",
    "Lindlövens IF":"https://files.eliteprospects.com/layout/logos/e6041f6d-5c6e-453c-87bc-50375a1dd451_large.png",
    "Norrtälje IK":"https://cdn.svenskalag.se/images/03bab0c9-5d40-4ec7-863b-43e1395cc270?v=0",
    "Örnsköldsvik HF":"https://files.eliteprospects.com/layout/logos/b2e5b5c7-0a8e-4547-b7f4-878c8309e756_large.png",
    "Piteå HC":"https://cdn.api.everysport.com/logos/ishockey/pite__hc_1190/1580983285788.png",
    "Sollentuna HC":"https://files.eliteprospects.com/layout/logos/cc541b05-7688-43b7-b473-907585078062_large.png",
    "Strömsbro IF":"https://files.eliteprospects.com/layout/logos/5b96a076-5d3d-4ccc-b3c2-dff4f449d616_large.png",
    "Surahammars IF":"https://files.eliteprospects.com/layout/logos/f4f38399-7162-4743-ae2d-a617ce931e8b_original.png",
    "Vallentuna Hockey":"https://edg01-prd-de-ixn.solidtango.com/cache/media_file/resize1280x720/798fa9ef-468f-4181-905c-10acbb153dcc.jpg?cb=921d0fc60bc59efdaa159fc05a0cfc5b",
    "Väsby IK HK":"https://cdn.api.everysport.com/logos/ishockey/v_sby_ik_hk_183229/1638186314447.png.cropped.png",
    "Wings HC Arlanda":"https://cdn.api.everysport.com/logos/ishockey/wings_hc_arlanda_1209/1580983580402.png",
    "Borås HC":"https://cdn.api.everysport.com/logos/ishockey/bor_s_hc_87521/1636622668942.png.cropped.png",
    "Boro/Vetlanda HC":"https://files.eliteprospects.com/layout/logos/ca7f8b7e-e04b-45e9-b325-a9a83bca6b31_large.png",
    "Grästorps IK":"https://az729104.cdn.laget.se/emblem_5377808.png%3Bwidth%3D1170%3Bheight%3D600%3BpaddingWidth%3D15%3BbgColor%3D0c0f0f%3Bmode%3Dpad%3Bscale%3Dboth%3Banchor%3Dmiddlecenter",
    "Grums IK":"https://files.eliteprospects.com/layout/logos/8e5b87d0-2a77-41d7-b53b-4f27df45ff96_original.png",
    "Halmstad Hammers HC":"https://cdn.api.everysport.com/logos/ishockey/halmstad_hf_146068/1642229231194.png.cropped.png",
    "Hanvikens SK":"https://blob.api.swehockey.net/blob/101428e9-ee0c-49a4-9d13-ba79c098d2df.png",
    "HC Dalen":"https://files.eliteprospects.com/layout/logos/ed9a935b-e706-4ba2-bc2c-76b7533b0e36_large.png",
    "HC Vita Hästen":"https://cdn.api.everysport.com/logos/ishockey/hc_vita_h_sten_209544/1698416578799.png",
    "Huddinge IK":"https://files.eliteprospects.com/layout/logos/ee01eebb-22f1-4ee9-b33d-d27fb4e9a32e_large.png",
    "IF Troja-Ljungby":"https://cdn.api.everysport.com/logos/ishockey/if_troja_ljungby_25654/1636622596899.png",
    "Karlskrona HK":"https://dpsportsmanagement.se/wp-content/uploads/khk-logo.png",
    "Kungälvs IK":"https://s3-eu-west-1.amazonaws.com/myclub-site/uploads/images/000/122/017/KIK_logo_red__1_.png",
    "Mariestad BoIS HC":"https://files.eliteprospects.com/layout/logos/4715278e-94d6-40ec-8ead-ff57b4849c1a_original.png",
    "Mjölby HC":"https://cdn.svenskalag.se/images/6af498d7-4416-4b78-a81f-2f0bf0091cf0?v=0",
    "Mörrums GoIS IK":"https://files.livearenasports.com/files/892be289-ec35-4ee0-8eb7-461a94c44e0a",
    "Nyköpings SK":"https://vectorportal.com/storage/nykopingshockey_3948.jpg",
    "Tingsryds AIF":"https://pbs.twimg.com/profile_images/1856462130343444481/fN5SpDhr_400x400.jpg",
    "Tranås AIF":"https://www.targetaid.com/media/yo4naz2r/tran-s-back.jpg",
    "Tyringe SoSS":"https://pbs.twimg.com/profile_images/1965118781870477312/H1mpzluE_400x400.jpg",
    "Västerviks IK":"https://edg01-prd-se-ixn.solidtango.com/cache/media_file/resize1280x720/3ad3d7f7-ddc2-47c9-9fee-b76529ed8c4f.png?cb=f75ebc0da6d7e4ca8c064823e7f93f6e"
  });

  function teamLogoUrl(name) {
    return TEAM_LOGOS[name] || "";
  }

  function teamLogoMarkup(name,className="team-logo-img") {
    const url=teamLogoUrl(name);
    if(!url) return '<span class="team-logo-fallback">'+esc(shortTeam(name))+'</span>';
    return '<img class="'+esc(className)+'" src="'+esc(url)+'" alt="'+esc(name)+' logotyp" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span class="team-logo-fallback" style="display:none">'+esc(shortTeam(name))+'</span>';
  }

  function shortTeam(name) {
    if (!name) return "—";
    return name
      .replace(/ Hockey| IK| IF| HC| HK/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 3) || "—";
  }

  function swedishDate(iso) {
    if (!iso) return "Tid ej fastställd";
    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm"
    }).format(new Date(iso)).replace(",", " ·");
  }

  function ageOn(dateText, referenceIso) {
    if (!dateText) return null;
    const birth = new Date(dateText + "T12:00:00Z");
    const ref = referenceIso ? new Date(referenceIso) : new Date();
    let age = ref.getUTCFullYear() - birth.getUTCFullYear();
    const beforeBirthday =
      ref.getUTCMonth() < birth.getUTCMonth() ||
      (ref.getUTCMonth() === birth.getUTCMonth() && ref.getUTCDate() < birth.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  function getTeamName(id) {
    return state.teamById.get(id)?.canonical_name || "Okänt lag";
  }

  function teamSlug(name) {
    return String(name||"")
      .toLocaleLowerCase("sv-SE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }

  function requestedTeamSlug() {
    return new URLSearchParams(window.location.search).get("team")||"";
  }

  function globalAdminAccess() {
    return state.accessRows.find((row)=>row.active&&row.role==="admin"&&!row.team_id)||null;
  }

  function effectiveAccessForTeam(teamId) {
    return globalAdminAccess() ||
      state.accessRows.find((row)=>row.active&&row.role==="commentator"&&row.team_id===teamId) ||
      null;
  }

  function canAccessTeam(teamId) {
    return Boolean(state.authUser&&effectiveAccessForTeam(teamId));
  }

  function allowedCommentatorTeams() {
    return state.accessRows
      .filter((row)=>row.active&&row.role==="commentator"&&row.team_id)
      .map((row)=>state.teamById.get(row.team_id))
      .filter(Boolean);
  }

  function selectTeamInPlace(team) {
    if(!team) return false;
    state.selectedTeam=team;
    state.selectedTeamSlug=teamSlug(team.canonical_name);
    state.selectedCompetition=state.teamCompetitionByTeam.get(team.id)||null;
    state.teamDataLoaded=false;
    state.aiBrief=null;
    state.aiBriefSource="local";
    state.aiError="";
    state.aiUsedTopics=[];
    const url=new URL(window.location.href);
    url.searchParams.set("team",state.selectedTeamSlug);
    history.replaceState(null,"",url.pathname+url.search+url.hash);
    return true;
  }

  function normalizeTeamSelectionForAccess() {
    if(!state.authUser||globalAdminAccess()) return false;
    const allowed=allowedCommentatorTeams();
    if(allowed.length!==1) return false;
    if(state.selectedTeam&&canAccessTeam(state.selectedTeam.id)) return false;
    return selectTeamInPlace(allowed[0]);
  }

  function setRouteScreen(name) {
    document.getElementById("homeScreen")?.classList.toggle("hidden",name!=="home");
    document.getElementById("lockScreen")?.classList.toggle("hidden",name!=="lock");
    document.getElementById("cockpitScreen")?.classList.toggle("hidden",name!=="cockpit");
    document.getElementById("cockpitDeck")?.classList.toggle("hidden",name!=="cockpit");
    document.getElementById("homeButton")?.classList.toggle("hidden",name==="home");
    if(name!=="cockpit") setDrawerOpen(false);
  }

  function openTeam(team) {
    const url=new URL(window.location.href);
    url.searchParams.set("team",teamSlug(team.canonical_name));
    window.location.href=url.toString();
  }

  function goHome() {
    const url=new URL(window.location.href);
    url.searchParams.delete("team");
    window.location.href=url.toString();
  }

  function renderLeagueHome() {
    setRouteScreen("home");
    document.title="Commentator Cockpit · Hockeyettan";
    const grid=document.getElementById("teamGrid");
    if(!grid) return;
    const teams=[...state.competitionTeams].sort((a,b)=>
      a.canonical_name.localeCompare(b.canonical_name,"sv")
    );
    grid.innerHTML=teams.map((team)=>{
      const access=effectiveAccessForTeam(team.id);
      const status=!state.authUser
        ? "KRÄVER INLOGGNING"
        : access ? (access.role==="admin"?"ADMIN · ÖPPEN":"ÖPPEN FÖR DIG") : "LÅST";
      return '<button class="team-card '+(access?"unlocked":"locked")+'" type="button" data-team-id="'+esc(team.id)+'">' +
        '<div class="team-card-badge">'+teamLogoMarkup(team.canonical_name,"team-card-logo")+'</div>' +
        '<div class="team-card-copy"><span>HOCKEYETTAN · '+esc(state.teamCompetitionByTeam.get(team.id)?.group_name||"")+'</span><strong>'+esc(team.canonical_name)+'</strong><small>'+esc(status)+'</small></div>' +
        '<div class="team-card-arrow">→</div>' +
      '</button>';
    }).join("");
    grid.querySelectorAll("[data-team-id]").forEach((button)=>{
      button.addEventListener("click",()=>{
        const team=state.teamById.get(button.dataset.teamId);
        if(team) openTeam(team);
      });
    });
    document.getElementById("syncText").textContent=teams.length+" Hockeyettan-lag laddade · Norra + Södra";
  }

  function renderTeamLock() {
    setRouteScreen("lock");
    setLockMode("normal");
    const team=state.selectedTeam;
    if(!team) return;
    document.getElementById("lockBadge").innerHTML=teamLogoMarkup(team.canonical_name,"lock-team-logo");
    document.getElementById("lockTeamName").textContent=team.canonical_name;
    const message=!state.authUser
      ? "Logga in med ett konto som har behörighet till "+team.canonical_name+"."
      : "Du är inloggad som "+(state.authUser.email||"användare")+", men kontot saknar behörighet till "+team.canonical_name+".";
    document.getElementById("lockMessage").textContent=message;
    document.getElementById("syncText").textContent="Cockpit låst · "+team.canonical_name;
  }

  function showCockpit() {
    setRouteScreen("cockpit");
    if(state.selectedTeam){
      document.title=state.selectedTeam.canonical_name+" · Commentator Cockpit";
    }
  }

  function setSyncStatus(kind,text) {
    const syncState=document.getElementById("syncState");
    const syncText=document.getElementById("syncText");
    if(!syncState||!syncText) return;
    syncState.classList.remove("ok","bad","warn","working");
    if(kind) syncState.classList.add(kind);
    syncText.textContent=text;
  }

  function syncAgeMinutes() {
    const value=state.competition?.updated_at;
    if(!value) return null;
    const ms=Date.now()-new Date(value).getTime();
    return Number.isFinite(ms) ? Math.max(0,Math.round(ms/60000)) : null;
  }

  function renderSyncFreshness() {
    if(!state.teamDataLoaded||!state.competition) return;
    if(state.lastLiveRefreshError){
      setSyncStatus("warn","Live-uppdatering misslyckades · senaste data visas");
      return;
    }
    const age=syncAgeMinutes();
    const time=new Intl.DateTimeFormat("sv-SE",{
      hour:"2-digit",minute:"2-digit",timeZone:"Europe/Stockholm"
    }).format(new Date(state.competition.updated_at));
    const ageText=age==null?"":age<1?" · nyss":" · "+age+" min sedan";
    const liveText=state.lastLiveRefreshAt && state.nextGame?.status==="live"
      ? " · live "+new Intl.DateTimeFormat("sv-SE",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"Europe/Stockholm"}).format(new Date(state.lastLiveRefreshAt))
      : "";
    const warningText=state.loadWarnings.length ? " · "+state.loadWarnings.length+" delvarning"+(state.loadWarnings.length===1?"":"ar") : "";
    const kind=state.loadWarnings.length ? "warn" : age!=null&&age>180 ? "bad" : age!=null&&age>75 ? "warn" : "ok";
    setSyncStatus(kind,"Swehockey synkad · "+time+ageText+liveText+warningText);
  }

  function recordLoadWarning(scope,error) {
    const message=String(error?.message||error||"Okänt fel");
    state.loadWarnings.push({scope,message});
    console.warn("Commentator Cockpit partial data:",scope,error);
  }

  function optionalData(result,scope,fallback=[]) {
    if(result?.error){
      recordLoadWarning(scope,result.error);
      return fallback;
    }
    return result?.data ?? fallback;
  }

  async function optionalLoad(scope,loader,fallback=null) {
    try{
      return await loader();
    }catch(error){
      recordLoadWarning(scope,error);
      return fallback;
    }
  }

  function setLockMode(mode) {
    const card=document.querySelector(".team-lock-card");
    const login=document.getElementById("lockLoginButton");
    const retry=document.getElementById("lockRetryButton");
    card?.classList.toggle("loading",mode==="loading");
    card?.classList.toggle("error",mode==="error");
    login?.classList.toggle("hidden",mode==="loading"||mode==="error");
    retry?.classList.toggle("hidden",mode!=="error");
  }

  function showTeamLoading() {
    state.teamLoading=true;
    state.teamLoadError="";
    setRouteScreen("lock");
    setLockMode("loading");
    const team=state.selectedTeam;
    if(team){
      document.getElementById("lockBadge").innerHTML=teamLogoMarkup(team.canonical_name,"lock-team-logo");
      document.getElementById("lockTeamName").textContent=team.canonical_name;
      document.getElementById("lockMessage").textContent="Laddar lagdata · match, kedjor, statistik och live-underlag…";
      setSyncStatus("working","Laddar lagdata · "+team.canonical_name);
    }
  }

  function showTeamLoadError(error) {
    state.teamLoading=false;
    state.teamLoadError=String(error?.message||error||"Okänt fel");
    setRouteScreen("lock");
    setLockMode("error");
    const team=state.selectedTeam;
    if(team){
      document.getElementById("lockBadge").innerHTML=teamLogoMarkup(team.canonical_name,"lock-team-logo");
      document.getElementById("lockTeamName").textContent=team.canonical_name;
    }
    document.getElementById("lockMessage").textContent="Kunde inte ladda lagets cockpit. "+state.teamLoadError;
    setSyncStatus("bad","Lagdata kunde inte laddas");
  }


  const LEGACY_NOTE_STORAGE_KEY="commentator-cockpit-notes-v1";
  const NOTE_STORAGE_PREFIX="commentator-cockpit-notes-v2";
  const AUTH_REDIRECT_URL="https://www.svenskehockey.se/lab/commentator-cockpit/";
  const AUTH_PENDING_TEAM_KEY="commentator-cockpit-auth-team";

  function noteStorageKey(userId=state.authUser?.id) {
    return userId ? NOTE_STORAGE_PREFIX+"-user-"+userId : NOTE_STORAGE_PREFIX+"-guest";
  }

  function readNotesFromStorage(key) {
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||"[]");
      return Array.isArray(parsed)?parsed.filter((note)=>note&&note.id&&note.body):[];
    }catch{
      return [];
    }
  }

  function loadLocalNotes() {
    const key=noteStorageKey();
    let notes=readNotesFromStorage(key);
    if(!state.authUser&&notes.length===0){
      const legacy=readNotesFromStorage(LEGACY_NOTE_STORAGE_KEY);
      if(legacy.length){
        notes=legacy;
        try{
          localStorage.setItem(key,JSON.stringify(legacy));
          localStorage.removeItem(LEGACY_NOTE_STORAGE_KEY);
        }catch{}
      }
    }
    return notes;
  }

  function persistLocalNotes() {
    try{
      localStorage.setItem(noteStorageKey(),JSON.stringify(state.notes));
      return true;
    }catch{
      return false;
    }
  }

  function noteTimestamp(note) {
    const value=new Date(note?.updated_at||note?.created_at||0).getTime();
    return Number.isFinite(value)?value:0;
  }

  function mergeNoteSets(...sets) {
    const map=new Map();
    for(const set of sets){
      for(const note of set||[]){
        if(!note?.id||!note?.body) continue;
        const current=map.get(note.id);
        if(!current||noteTimestamp(note)>=noteTimestamp(current)) map.set(note.id,note);
      }
    }
    return [...map.values()].sort((a,b)=>noteTimestamp(b)-noteTimestamp(a));
  }

  function noteCloudPayload(note) {
    return {
      id:note.id,
      scope_type:note.scope_type,
      game_id:note.game_id||null,
      team_id:note.team_id||null,
      player_id:note.player_id||null,
      title:String(note.title||"").slice(0,120),
      body:String(note.body||"").slice(0,1200),
      tags:Array.isArray(note.tags)?note.tags.slice(0,8):[],
      pinned:Boolean(note.pinned),
      is_active:note.is_active!==false,
      created_at:note.created_at||new Date().toISOString(),
      updated_at:note.updated_at||new Date().toISOString()
    };
  }

  function updateAuthButton() {
    const button=document.getElementById("accountButton");
    if(!button) return;
    state.access=state.selectedTeam
      ? effectiveAccessForTeam(state.selectedTeam.id)
      : globalAdminAccess() || state.accessRows.find((row)=>row.active) || null;
    if(state.authUser){
      const label=state.authUser.email||"Inloggad";
      button.classList.toggle("signed-in",Boolean(state.access?.active));
      button.classList.toggle("pending",!state.access?.active);
      const sub=state.access?.active
        ? (state.access.role==="admin"?"ADMIN":state.selectedTeam?"LAGACCESS":"KOMMENTATOR")
        : "EJ GODKÄND";
      button.innerHTML='<span class="account-dot"></span><strong>'+esc(label)+'</strong><small>'+esc(sub)+'</small>';
    }else{
      button.classList.remove("signed-in","pending");
      button.innerHTML='<span class="account-dot"></span><strong>LOGGA IN</strong><small>LAGACCESS</small>';
    }
  }

  async function syncNotesWithCloud({includeGuest=false}={}) {
    if(!client||!state.authUser||!state.selectedTeam||!canAccessTeam(state.selectedTeam.id)){
      state.cloudSyncState=state.authUser?"blocked":"local";
      state.cloudSyncMessage=state.authUser
        ? "Kontot är inloggat men saknar godkänd cockpit-behörighet."
        : "";
      updateAuthButton();
      return false;
    }
    state.cloudSyncState="syncing";
    state.cloudSyncMessage="Synkar anteckningar…";
    updateAuthButton();

    const userKey=noteStorageKey(state.authUser.id);
    const userLocal=readNotesFromStorage(userKey);
    const guestLocal=includeGuest?readNotesFromStorage(noteStorageKey(null)):[];
    const localMerged=mergeNoteSets(state.notes,userLocal,guestLocal);

    const {data:cloud,error:readError}=await client.from("commentator_notes")
      .select("id,scope_type,game_id,team_id,player_id,title,body,tags,pinned,is_active,created_at,updated_at")
      .order("updated_at",{ascending:false});
    if(readError){
      state.cloudSyncState="error";
      state.cloudSyncMessage=readError.message||"Molnsynk misslyckades.";
      updateAuthButton();
      return false;
    }

    const merged=mergeNoteSets(cloud||[],localMerged);
    if(merged.length){
      const {error:writeError}=await client.from("commentator_notes")
        .upsert(merged.map(noteCloudPayload),{onConflict:"id"});
      if(writeError){
        state.cloudSyncState="error";
        state.cloudSyncMessage=writeError.message||"Molnsynk misslyckades.";
        updateAuthButton();
        return false;
      }
    }

    state.notes=merged;
    try{
      localStorage.setItem(userKey,JSON.stringify(merged));
      if(includeGuest) localStorage.removeItem(noteStorageKey(null));
    }catch{}

    state.cloudSyncState="synced";
    state.cloudSyncMessage="Synkad "+new Intl.DateTimeFormat("sv-SE",{
      hour:"2-digit",minute:"2-digit",timeZone:"Europe/Stockholm"
    }).format(new Date());
    updateAuthButton();
    renderFacts();
    return true;
  }

  function saveNotes() {
    persistLocalNotes();
    if(state.authUser&&state.selectedTeam&&canAccessTeam(state.selectedTeam.id)){
      syncNotesWithCloud().catch((error)=>{
        console.error("Note cloud sync failed",error);
        state.cloudSyncState="error";
        state.cloudSyncMessage="Molnsynk misslyckades.";
        updateAuthButton();
      });
    }
  }

  function noteId() {
    if(window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "note-"+Date.now()+"-"+Math.random().toString(36).slice(2,9);
  }

  function notePlayerName(playerId) {
    const row=state.seasonPlayerStats.find((player)=>player.player_id===playerId);
    return row?humanSourceName(row.source_name):"Spelare";
  }

  function noteScopeLabel(note) {
    if(note.scope_type==="match"){
      return "MATCH · "+(state.nextGame
        ? getTeamName(state.nextGame.home_team_id)+" – "+getTeamName(state.nextGame.away_team_id)
        : "match");
    }
    if(note.scope_type==="team") return getTeamName(note.team_id);
    if(note.scope_type==="player") return notePlayerName(note.player_id);
    return "ALLMÄNT";
  }

  function noteAppliesToCurrentMatch(note) {
    if(!note||note.is_active===false) return false;
    if(note.scope_type==="general") return true;
    if(note.scope_type==="match") return note.game_id===state.nextGame?.id;
    if(note.scope_type==="team"){
      return note.team_id===state.focusTeam?.id||note.team_id===state.opponent?.id;
    }
    if(note.scope_type==="player"){
      return state.seasonPlayerStats.some((row)=>
        row.player_id===note.player_id &&
        (row.team_id===state.focusTeam?.id||row.team_id===state.opponent?.id)
      );
    }
    return false;
  }

  function currentEditorialNotes() {
    return state.notes
      .filter(noteAppliesToCurrentMatch)
      .sort((a,b)=>
        Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) ||
        (new Date(b.updated_at||b.created_at||0).getTime()-new Date(a.updated_at||a.created_at||0).getTime())
      );
  }

  function noteScopeOptionsHtml(selectedValue) {
    const opts=[];
    const push=(value,label)=>opts.push(
      '<option value="'+esc(value)+'" '+(value===selectedValue?"selected":"")+'>'+esc(label)+'</option>'
    );
    push("general|","Allmänt");
    if(state.nextGame){
      push("match|"+state.nextGame.id,"Match · "+getTeamName(state.nextGame.home_team_id)+" – "+getTeamName(state.nextGame.away_team_id));
    }
    if(state.focusTeam) push("team|"+state.focusTeam.id,"Lag · "+state.focusTeam.canonical_name);
    if(state.opponent) push("team|"+state.opponent.id,"Lag · "+state.opponent.canonical_name);

    const players=state.seasonPlayerStats
      .filter((row)=>row.player_id&&(row.team_id===state.focusTeam?.id||row.team_id===state.opponent?.id))
      .sort((a,b)=>
        getTeamName(a.team_id).localeCompare(getTeamName(b.team_id),"sv") ||
        humanSourceName(a.source_name).localeCompare(humanSourceName(b.source_name),"sv")
      );

    const seen=new Set();
    for(const row of players){
      if(seen.has(row.player_id)) continue;
      seen.add(row.player_id);
      push("player|"+row.player_id,"Spelare · "+humanSourceName(row.source_name)+" · "+getTeamName(row.team_id));
    }
    return opts.join("");
  }

  function parseNoteScope(value) {
    const [scopeType,targetId]=String(value||"general|").split("|");
    return {
      scope_type:["general","match","team","player"].includes(scopeType)?scopeType:"general",
      game_id:scopeType==="match"&&targetId?targetId:null,
      team_id:scopeType==="team"&&targetId?targetId:null,
      player_id:scopeType==="player"&&targetId?targetId:null
    };
  }

  function renderNotes() {
    const notes=currentEditorialNotes();
    const playerCount=state.seasonPlayerStats.filter((row)=>row.player_id).length;

    const list=notes.length
      ? '<div class="notes-list">'+notes.map((note)=>{
          const tags=(note.tags||[]).map((tag)=>'<span>#'+esc(tag)+'</span>').join("");
          return '<article class="note-card '+(note.pinned?"pinned":"")+'">' +
            '<div class="note-card-head"><div><span>'+esc(noteScopeLabel(note))+'</span>' +
              (note.pinned?'<b>PINNAD</b>':'')+'</div>' +
              '<small>'+esc(shortDateOnly(note.updated_at||note.created_at))+'</small></div>' +
            (note.title?'<h3>'+esc(note.title)+'</h3>':'') +
            '<p>'+esc(note.body)+'</p>' +
            (tags?'<div class="note-tags">'+tags+'</div>':'') +
            '<div class="note-actions">' +
              '<button type="button" data-note-pin="'+esc(note.id)+'">'+(note.pinned?"TA BORT FRÅN STORY":"PINNA TILL STORY")+'</button>' +
              '<button type="button" data-note-edit="'+esc(note.id)+'">REDIGERA</button>' +
              '<button type="button" class="danger" data-note-delete="'+esc(note.id)+'">RADERA</button>' +
            '</div>' +
          '</article>';
        }).join("")+'</div>'
      : '<div class="notes-empty"><strong>Inga anteckningar för den här matchen ännu.</strong><span>Lägg in sådant som officiell statistik inte känner till.</span></div>';

    const storageTitle=state.access?.active
      ? "Molnsynk aktiv"
      : state.authUser ? "Lokalt · behörighet saknas" : "Lokalt sparat";
    const storageText=state.access?.active
      ? (state.cloudSyncMessage||"Anteckningar följer det godkända kontot mellan enheter.")
      : state.authUser
        ? "Du är inloggad, men kontot måste godkännas innan NOTES får skrivas till Supabase."
        : "Anteckningar ligger bara i den här webbläsaren tills du loggar in med ett godkänt konto.";
    return '<article class="drawer-card notes-storage-info"><strong>'+esc(storageTitle)+'</strong><span>'+esc(storageText)+'</span></article>' +
      '<form class="note-form" id="noteForm">' +
        '<input type="hidden" id="noteEditId" value="">' +
        '<label><span>KOPPLA TILL</span><select id="noteScope">'+noteScopeOptionsHtml(state.nextGame?"match|"+state.nextGame.id:"general|")+'</select></label>' +
        '<label><span>RUBRIK</span><input id="noteTitle" maxlength="120" placeholder="T.ex. återvänder till moderklubben"></label>' +
        '<label class="wide"><span>ANTECKNING</span><textarea id="noteBody" rows="4" maxlength="1200" placeholder="Skriv fakta, bakgrund eller en talking point du vill kunna använda i sändningen."></textarea></label>' +
        '<label><span>TAGGAR</span><input id="noteTags" maxlength="160" placeholder="bakgrund, comeback, lokal"></label>' +
        '<label class="note-pin-control"><input type="checkbox" id="notePinned" checked><span>PINNA TILL STORY / SNABBFAKTA</span></label>' +
        '<div class="note-form-actions"><button type="button" id="noteCancelEdit">RENSA</button><button type="submit" class="primary">SPARA ANTECKNING</button></div>' +
      '</form>' +
      '<div class="notes-meta"><span>'+esc(notes.length)+' relevanta anteckningar</span><small>'+esc(playerCount)+' spelare kan kopplas</small></div>' +
      list;
  }

  function bindNotesUi() {
    const form=document.getElementById("noteForm");
    if(!form) return;

    const resetForm=()=>{
      document.getElementById("noteEditId").value="";
      document.getElementById("noteTitle").value="";
      document.getElementById("noteBody").value="";
      document.getElementById("noteTags").value="";
      document.getElementById("notePinned").checked=true;
      document.getElementById("noteScope").value=state.nextGame?"match|"+state.nextGame.id:"general|";
    };

    form.addEventListener("submit",(event)=>{
      event.preventDefault();
      const body=String(document.getElementById("noteBody").value||"").trim();
      if(!body) return;
      const id=document.getElementById("noteEditId").value||noteId();
      const existing=state.notes.find((note)=>note.id===id);
      const scope=parseNoteScope(document.getElementById("noteScope").value);
      const now=new Date().toISOString();
      const note={
        id,
        ...scope,
        title:String(document.getElementById("noteTitle").value||"").trim(),
        body,
        tags:String(document.getElementById("noteTags").value||"")
          .split(",").map((tag)=>tag.trim()).filter(Boolean).slice(0,8),
        pinned:Boolean(document.getElementById("notePinned").checked),
        is_active:true,
        created_at:existing?.created_at||now,
        updated_at:now
      };
      state.notes=existing
        ? state.notes.map((item)=>item.id===id?note:item)
        : [note,...state.notes];
      saveNotes();
      renderFacts();
      renderDrawer("notes");
    });

    document.getElementById("noteCancelEdit")?.addEventListener("click",resetForm);

    drawerBody.querySelectorAll("[data-note-pin]").forEach((button)=>{
      button.addEventListener("click",()=>{
        const id=button.dataset.notePin;
        state.notes=state.notes.map((note)=>note.id===id
          ? {...note,pinned:!note.pinned,updated_at:new Date().toISOString()}
          : note
        );
        saveNotes();
        renderFacts();
        renderDrawer("notes");
      });
    });

    drawerBody.querySelectorAll("[data-note-delete]").forEach((button)=>{
      button.addEventListener("click",()=>{
        const id=button.dataset.noteDelete;
        state.notes=state.notes.map((note)=>note.id===id
          ? {...note,is_active:false,updated_at:new Date().toISOString()}
          : note
        );
        saveNotes();
        renderFacts();
        renderDrawer("notes");
      });
    });

    drawerBody.querySelectorAll("[data-note-edit]").forEach((button)=>{
      button.addEventListener("click",()=>{
        const note=state.notes.find((item)=>item.id===button.dataset.noteEdit);
        if(!note) return;
        document.getElementById("noteEditId").value=note.id;
        document.getElementById("noteTitle").value=note.title||"";
        document.getElementById("noteBody").value=note.body||"";
        document.getElementById("noteTags").value=(note.tags||[]).join(", ");
        document.getElementById("notePinned").checked=Boolean(note.pinned);
        const value=note.scope_type+"|"+(note.game_id||note.team_id||note.player_id||"");
        const scope=document.getElementById("noteScope");
        if([...scope.options].some((option)=>option.value===value)) scope.value=value;
        document.getElementById("noteBody").focus();
      });
    });
  }


  function hasApprovedAccess() {
    return Boolean(state.selectedTeam&&canAccessTeam(state.selectedTeam.id));
  }

  function isAccessAdmin() {
    return Boolean(state.authUser&&globalAdminAccess());
  }

  async function loadAccessForCurrentUser() {
    state.access=null;
    state.accessRows=[];
    if(!client||!state.authUser?.email) return [];
    const {data,error}=await client.from("commentator_access")
      .select("id,email,role,team_id,active,display_name")
      .order("role",{ascending:true});
    if(error){
      console.error("Access check failed",error);
      return [];
    }
    state.accessRows=data||[];
    state.access=state.selectedTeam
      ? effectiveAccessForTeam(state.selectedTeam.id)
      : globalAdminAccess() || state.accessRows.find((row)=>row.active) || null;
    return state.accessRows;
  }

  async function invokeAccessAdmin(body) {
    if(!client||!isAccessAdmin()) return {ok:false,error:"admin_required"};
    const {data,error}=await client.functions.invoke("commentator-access-admin",{body});
    if(error) return {ok:false,error:String(error.message||error)};
    return data||{ok:false,error:"invalid_response"};
  }

  async function refreshAccessAdminList() {
    if(!isAccessAdmin()||state.accessAdminBusy) return false;
    state.accessAdminBusy=true;
    state.accessAdminError="";
    const result=await invokeAccessAdmin({action:"list"});
    state.accessAdminBusy=false;
    state.accessAdminLoaded=true;
    if(!result?.ok){
      state.accessAdminError="Kunde inte läsa behörighetslistan.";
      return false;
    }
    state.accessAdminItems=result.items||[];
    return true;
  }

  function accessAdminHtml() {
    if(!isAccessAdmin()) return "";
    const teamOptions=state.competitionTeams
      .slice()
      .sort((a,b)=>a.canonical_name.localeCompare(b.canonical_name,"sv"))
      .map((team)=>'<option value="'+esc(team.id)+'">'+esc(team.canonical_name)+'</option>')
      .join("");

    const rows=state.accessAdminItems.map((item)=>{
      const self=item.id===globalAdminAccess()?.id;
      const action=item.active
        ? (self?"":'<button type="button" class="danger" data-access-deactivate="'+esc(item.id)+'">STÄNG AV</button>')
        : '<button type="button" data-access-reactivate="'+esc(item.id)+'" data-access-email="'+esc(item.email)+'" data-access-role="'+esc(item.role)+'" data-access-team="'+esc(item.team_id||"")+'" data-access-name="'+esc(item.display_name||"")+'">ÅTERAKTIVERA</button>';
      return '<div class="access-row '+(item.active?"active":"inactive")+'">' +
        '<div><strong>'+esc(item.display_name||item.email)+'</strong><small>'+esc(item.email)+'</small></div>' +
        '<span>'+esc(item.role==="admin"?"ADMIN":item.team_name||"LAG")+'</span>' +
        '<em>'+(item.active?"AKTIV":"AVSTÄNGD")+'</em>' +
        '<div>'+action+'</div>' +
      '</div>';
    }).join("");

    return '<section class="access-admin">' +
      '<div class="section-title"><span>LAGBEHÖRIGHETER</span><small>ADMIN</small></div>' +
      '<form class="access-form access-form-team" id="accessForm">' +
        '<input id="accessEmail" type="email" required placeholder="kommentator@example.com">' +
        '<input id="accessName" maxlength="120" placeholder="Namn (valfritt)">' +
        '<select id="accessRole"><option value="commentator">Kommentator</option><option value="admin">Global admin</option></select>' +
        '<select id="accessTeam">'+teamOptions+'</select>' +
        '<button type="submit">LÄGG TILL / UPPDATERA</button>' +
      '</form>' +
      (state.accessAdminError?'<div class="account-message">'+esc(state.accessAdminError)+'</div>':"") +
      '<div class="access-list">'+
        (state.accessAdminBusy?'<div class="notes-empty"><strong>Laddar behörigheter…</strong></div>':
          rows||'<div class="notes-empty"><strong>Ingen godkänd användare ännu.</strong></div>')+
      '</div>' +
    '</section>';
  }

  function swahnworksAboutCard() {
    return '<article class="drawer-card swahnworks-about">' +
      '<span>SWNWORKS</span>' +
      '<strong>Koncept & utveckling</strong>' +
      '<p>Sports technology & broadcast tools · Commentator Cockpit är utvecklad av SWNWORKS.</p>' +
      '<a href="mailto:swnworks@gmail.com">swnworks@gmail.com</a>' +
    '</article>';
  }

  function renderAccount() {
    if(state.authUser){
      const email=state.authUser.email||"Inloggad användare";
      const allowedTeams=state.competitionTeams.filter((team)=>canAccessTeam(team.id));
      const teamText=isAccessAdmin()
        ? "Global admin · alla lag"
        : allowedTeams.length
          ? allowedTeams.map((team)=>team.canonical_name).join(" · ")
          : "Inga lag ännu";

      if(!state.accessRows.some((row)=>row.active)){
        return '<article class="account-card pending">' +
          '<span>INLOGGAD · EJ GODKÄND</span><h3>'+esc(email)+'</h3>' +
          '<p>Kontot är verifierat, men har ännu ingen lagbehörighet.</p>' +
        '</article>' +
        '<div class="account-actions"><button type="button" id="refreshAccessButton">KONTROLLERA BEHÖRIGHET</button>' +
        '<button type="button" class="danger" id="signOutButton">LOGGA UT</button></div>' +
        '<article class="drawer-card"><strong>Lagstyrt</strong><span>En admin måste koppla e-postadressen till rätt Hockeyettan-lag.</span></article>' +
        swahnworksAboutCard();
      }

      return '<article class="account-card signed-in">' +
        '<span>'+esc(isAccessAdmin()?"GLOBAL ADMIN":"GODKÄND KOMMENTATOR")+'</span><h3>'+esc(email)+'</h3>' +
        '<p>'+esc(teamText)+'</p>' +
      '</article>' +
      '<div class="account-actions">' +
        (state.selectedTeam&&canAccessTeam(state.selectedTeam.id)?'<button type="button" id="syncNotesNow">SYNKA NOTES NU</button>':'') +
        '<button type="button" class="danger" id="signOutButton">LOGGA UT</button>' +
      '</div>' +
      '<article class="drawer-card"><strong>Åtkomst</strong><span>Varje lag har sin egen cockpit-behörighet. Global admin kan öppna alla lag.</span></article>' +
      accessAdminHtml() +
      swahnworksAboutCard();
    }

    return '<article class="drawer-card"><strong>E-postinloggning</strong><span>Du får en personlig engångslänk via e-post. Inget lösenord behövs. Efter inloggningen kontrolleras din lagbehörighet.</span></article>' +
      '<form class="account-form" id="accountForm">' +
        '<label><span>E-POST</span><input id="accountEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required placeholder="namn@example.com" value="'+esc(state.authEmailDraft)+'"></label>' +
        '<button type="submit" '+(state.authBusy?"disabled":"")+'>'+(state.authBusy?"SKICKAR…":"SKICKA INLOGGNINGSLÄNK")+'</button>' +
      '</form>' +
      (state.authMessage?'<div class="account-message '+esc(state.authMessageType||"")+'" role="status" aria-live="polite">'+esc(state.authMessage)+'</div>':'') +
      '<article class="drawer-card"><strong>Lagbehörighet</strong><span>Inloggning och lagåtkomst är separata. En admin kopplar din e-postadress till rätt Hockeyettan-lag.</span></article>' +
      swahnworksAboutCard();
  }

  function bindAccountUi() {
    const form=document.getElementById("accountForm");
    if(form){
      form.addEventListener("submit",async(event)=>{
        event.preventDefault();
        if(state.authBusy||!client) return;
        const email=String(document.getElementById("accountEmail")?.value||"").trim();
        if(!email) return;
        state.authBusy=true;
        state.authMessage="";
        state.authMessageType="";
        state.authEmailDraft=email;
        renderDrawer("account");
        if(state.selectedTeamSlug){
          try{ localStorage.setItem(AUTH_PENDING_TEAM_KEY,state.selectedTeamSlug); }catch{}
        }
        const redirectUrl=new URL(AUTH_REDIRECT_URL);
        if(state.selectedTeamSlug) redirectUrl.searchParams.set("team",state.selectedTeamSlug);
        const {error}=await client.auth.signInWithOtp({
          email,
          options:{
            emailRedirectTo:redirectUrl.toString(),
            shouldCreateUser:true
          }
        });
        state.authBusy=false;
        state.authMessageType=error?"error":"success";
        state.authMessage=error
          ? "Kunde inte skicka inloggningslänken: "+error.message
          : "Inloggningslänk skickad till "+email+". Öppna mejlet och klicka på Logga in.";
        renderDrawer("account");
      });
    }

    document.getElementById("refreshAccessButton")?.addEventListener("click",async()=>{
      await loadAccessForCurrentUser();
      if(state.selectedTeam&&canAccessTeam(state.selectedTeam.id)){
        const includeGuest=readNotesFromStorage(noteStorageKey(null)).length>0;
        await syncNotesWithCloud({includeGuest});
      }
      updateAuthButton();
      await routeApp();
      renderDrawer("account");
    });

    document.getElementById("syncNotesNow")?.addEventListener("click",async()=>{
      await syncNotesWithCloud();
      renderDrawer("account");
    });

    document.getElementById("signOutButton")?.addEventListener("click",async()=>{
      if(!client) return;
      await client.auth.signOut();
    });

    const accessForm=document.getElementById("accessForm");
    if(accessForm){
      accessForm.addEventListener("submit",async(event)=>{
        event.preventDefault();
        if(state.accessAdminBusy) return;
        const email=String(document.getElementById("accessEmail")?.value||"").trim();
        if(!email) return;
        state.accessAdminBusy=true;
        state.accessAdminError="";
        renderDrawer("account");
        const role=document.getElementById("accessRole")?.value==="admin"?"admin":"commentator";
        const result=await invokeAccessAdmin({
          action:"upsert",
          email,
          display_name:String(document.getElementById("accessName")?.value||"").trim(),
          role,
          team_id:role==="admin"?null:document.getElementById("accessTeam")?.value
        });
        state.accessAdminBusy=false;
        if(!result?.ok){
          state.accessAdminError="Kunde inte uppdatera användaren.";
        }
        await refreshAccessAdminList();
        renderDrawer("account");
      });
    }

    drawerBody.querySelectorAll("[data-access-deactivate]").forEach((button)=>{
      button.addEventListener("click",async()=>{
        state.accessAdminBusy=true;
        renderDrawer("account");
        const result=await invokeAccessAdmin({
          action:"deactivate",
          id:button.dataset.accessDeactivate
        });
        state.accessAdminBusy=false;
        if(!result?.ok) state.accessAdminError="Kunde inte stänga av användaren.";
        await refreshAccessAdminList();
        renderDrawer("account");
      });
    });

    drawerBody.querySelectorAll("[data-access-reactivate]").forEach((button)=>{
      button.addEventListener("click",async()=>{
        state.accessAdminBusy=true;
        renderDrawer("account");
        const result=await invokeAccessAdmin({
          action:"upsert",
          email:button.dataset.accessEmail,
          display_name:button.dataset.accessName||"",
          role:button.dataset.accessRole==="admin"?"admin":"commentator",
          team_id:button.dataset.accessRole==="admin"?null:button.dataset.accessTeam
        });
        state.accessAdminBusy=false;
        if(!result?.ok) state.accessAdminError="Kunde inte återaktivera användaren.";
        await refreshAccessAdminList();
        renderDrawer("account");
      });
    });

    const roleSelect=document.getElementById("accessRole");
    const teamSelect=document.getElementById("accessTeam");
    const syncTeamSelect=()=>{
      if(teamSelect) teamSelect.disabled=roleSelect?.value==="admin";
    };
    roleSelect?.addEventListener("change",syncTeamSelect);
    syncTeamSelect();

    if(isAccessAdmin()&&!state.accessAdminLoaded&&!state.accessAdminBusy){
      window.setTimeout(async()=>{
        await refreshAccessAdminList();
        if(drawer.classList.contains("open")&&drawerKicker.textContent==="KONTO"){
          renderDrawer("account");
        }
      },0);
    }
  }

  async function handleAuthSession(session) {
    const previousId=state.authUser?.id||null;
    const nextUser=session?.user||null;
    state.authUser=nextUser;
    state.authMessage="";
    state.access=null;
    state.accessRows=[];
    state.accessAdminItems=[];
    state.accessAdminLoaded=false;
    state.accessAdminError="";

    if(nextUser){
      state.authEmailDraft="";
      state.authMessageType="";
      try{ localStorage.removeItem(AUTH_PENDING_TEAM_KEY); }catch{}
      await loadAccessForCurrentUser();
      normalizeTeamSelectionForAccess();
      const includeGuest=previousId!==nextUser.id && readNotesFromStorage(noteStorageKey(null)).length>0;
      state.notes=mergeNoteSets(
        readNotesFromStorage(noteStorageKey(nextUser.id)),
        includeGuest?readNotesFromStorage(noteStorageKey(null)):[]
      );

      if(state.selectedTeam&&canAccessTeam(state.selectedTeam.id)){
        await syncNotesWithCloud({includeGuest});
      }else{
        persistLocalNotes();
        state.cloudSyncState="blocked";
        state.cloudSyncMessage="Molnsynk aktiveras när du öppnar ett lag du har behörighet till.";
      }
    }else{
      state.cloudSyncState="local";
      state.cloudSyncMessage="";
      state.notes=loadLocalNotes();
    }

    updateAuthButton();
    await routeApp();

    const activeButton=document.querySelector(".deck-key.active");
    if(drawer.classList.contains("open")){
      if(activeButton?.dataset.panel==="notes") renderDrawer("notes");
      else if(drawerKicker.textContent==="KONTO") renderDrawer("account");
      else if(activeButton?.dataset.panel==="ai") renderDrawer("ai");
    }
  }

  async function initAuth() {
    if(!client) return;
    client.auth.onAuthStateChange((_event,session)=>{
      window.setTimeout(()=>{
        handleAuthSession(session).catch((error)=>console.error("Auth state handling failed",error));
      },0);
    });
    const {data,error}=await client.auth.getSession();
    if(error) throw error;
    await handleAuthSession(data.session||null);
  }

  function resultForTeam(game, teamId) {
    const home = game.home_team_id === teamId;
    const gf = home ? game.home_score : game.away_score;
    const ga = home ? game.away_score : game.home_score;
    if (gf > ga) return "win";
    if (gf < ga) return "loss";
    return "tie";
  }

  function formatPct(value) {
    if (value == null || value === "") return "–";
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + "%" : "–";
  }

  function formatClockSeconds(value) {
    if (value == null || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const minutes = Math.floor(n / 60);
    const seconds = Math.floor(n % 60);
    return minutes + ":" + String(seconds).padStart(2, "0");
  }

  function latestStatsPair() {
    const game = state.latestFocusGame;
    if (!game) return { home: null, away: null };
    return {
      home: state.latestTeamStats.get(game.home_team_id) || null,
      away: state.latestTeamStats.get(game.away_team_id) || null
    };
  }

  function statPair(a, b, formatter = (v) => v ?? "–") {
    return formatter(a) + "–" + formatter(b);
  }

  function renderMatchStats() {
    const game = state.latestFocusGame;
    if (!game) return;
    const { home, away } = latestStatsPair();
    const homeName = getTeamName(game.home_team_id);
    const awayName = getTeamName(game.away_team_id);
    const detail = shortTeam(homeName) + "–" + shortTeam(awayName);

    document.getElementById("shotsValue").textContent =
      statPair(home?.shots, away?.shots);
    document.getElementById("shotsDetail").textContent = detail;

    document.getElementById("savesValue").textContent =
      statPair(home?.saves, away?.saves);
    document.getElementById("savesDetail").textContent = detail;

    document.getElementById("ppValue").textContent =
      statPair(home?.power_play_pct, away?.power_play_pct, formatPct);
    const ppTimes = [formatClockSeconds(home?.power_play_seconds), formatClockSeconds(away?.power_play_seconds)]
      .filter(Boolean);
    document.getElementById("ppDetail").textContent =
      ppTimes.length === 2 ? ppTimes.join("–") : detail;

    document.getElementById("pimValue").textContent =
      statPair(home?.pim, away?.pim);
    document.getElementById("pimDetail").textContent = detail;
  }

  function matchStatsStripHtml() {
    const game = state.latestFocusGame;
    if (!game) return "";
    const { home, away } = latestStatsPair();
    if (!home && !away) return "";
    const items = [
      ["SKOTT", statPair(home?.shots, away?.shots)],
      ["RÄDDNINGAR", statPair(home?.saves, away?.saves)],
      ["PP", statPair(home?.power_play_pct, away?.power_play_pct, formatPct)],
      ["PIM", statPair(home?.pim, away?.pim)]
    ];
    return '<div class="match-stats-strip">' +
      items.map(([label, value]) =>
        '<div><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>'
      ).join("") +
    '</div>';
  }

  function renderForm(elementId, games, teamId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const results = games.map((game) => resultForTeam(game, teamId));
    el.innerHTML = Array.from({ length: 5 }, (_, i) =>
      '<i class="' + (results[i] || "") + '"></i>'
    ).join("");
  }

  function renderStandingsQuick() {
    const el = document.getElementById("standingsQuick");
    if (!el || !state.focusTeam || !state.opponent) return;
    const rows = [state.focusTeam, state.opponent].map((team) => {
      const row = state.standingsByTeam.get(team.id);
      return '<div><b>' + esc(row?.rank ?? "–") + '</b><span>' +
        esc(team.canonical_name) + '</span><em>' + esc(row?.points ?? "–") + ' p</em></div>';
    });
    el.innerHTML = rows.join("");
  }

  function renderLatestGame() {
    const feed = document.getElementById("eventFeed");
    const game = state.latestFocusGame;
    if (!feed) return;
    if(!game){
      feed.className="empty-state";
      feed.innerHTML='<div class="empty-icon">↯</div><strong>Ingen tidigare matchdata ännu</strong><p>Cockpiten har nästa match, men ingen importerad slutrapport för det valda laget ännu.</p>';
      return;
    }
    feed.className = "event-feed-live";

    const eventRows = state.latestEvents.length
      ? '<div class="event-list">' + state.latestEvents.slice(0,12).map((event) => {
          const teamName = event.team_id ? getTeamName(event.team_id) : "";
          const label = event.event_type === "goal" ? "MÅL" :
            event.event_type === "penalty" ? "UTVISNING" :
            event.event_type === "goalie_in" ? "MV IN" :
            event.event_type === "goalie_out" ? "MV UT" :
            event.event_type === "timeout" ? "TIMEOUT" :
            event.event_type === "powerbreak" ? "POWERBREAK" : event.event_type.replaceAll("_", " ").toUpperCase();
          const score = event.home_score != null && event.away_score != null
            ? '<b>' + event.home_score + '–' + event.away_score + '</b>'
            : '';
          return '<div class="event-row ' + (event.event_type === "goal" ? "goal" : "") + '">' +
            '<div class="event-time"><strong>' + esc(event.clock_display || "–") + '</strong><span>P' + esc(event.period || "–") + '</span></div>' +
            '<div class="event-copy"><div><em>' + esc(label) + '</em>' + (teamName ? '<span>' + esc(teamName) + '</span>' : '') + '</div>' +
            '<p>' + esc(event.description || "") + '</p></div>' +
            '<div class="event-score">' + score + '</div>' +
          '</div>';
        }).join("") + '</div>'
      : '<div class="recent-game-foot">Inga importerade händelser för matchen ännu.</div>';

    feed.innerHTML =
      '<article class="recent-game">' +
        '<div class="recent-game-top"><span>SENASTE MATCH · ' + esc(state.focusTeam.canonical_name.toUpperCase()) + ' · OFFICIELL EVENTDATA</span><span>' + esc(swedishDate(game.scheduled_start)) + '</span></div>' +
        '<div class="recent-game-score">' +
          '<span>' + esc(getTeamName(game.home_team_id)) + '</span>' +
          '<strong>' + esc(game.home_score) + '–' + esc(game.away_score) + '</strong>' +
          '<span>' + esc(getTeamName(game.away_team_id)) + '</span>' +
        '</div>' +
        '<div class="recent-game-foot">' + esc(game.venue_name || "") + ' · ' + state.latestEvents.length + ' importerade händelser</div>' +
      '</article>' +
      matchStatsStripHtml() +
      eventRows;
  }

  function formSummary(games, teamId) {
    const summary={games:0,wins:0,ties:0,losses:0,gf:0,ga:0};
    for(const game of (games || []).slice(0,5)){
      const home=game.home_team_id===teamId;
      const gf=Number(home?game.home_score:game.away_score);
      const ga=Number(home?game.away_score:game.home_score);
      if(!Number.isFinite(gf)||!Number.isFinite(ga)) continue;
      summary.games++;
      summary.gf+=gf;
      summary.ga+=ga;
      if(gf>ga) summary.wins++;
      else if(gf<ga) summary.losses++;
      else summary.ties++;
    }
    return summary;
  }

  function formText(summary) {
    return summary.wins+"–"+summary.ties+"–"+summary.losses+" · mål "+summary.gf+"–"+summary.ga;
  }

  function latestResultText(games, teamId) {
    const game=games?.[0];
    if(!game) return null;
    const home=game.home_team_id===teamId;
    const gf=Number(home?game.home_score:game.away_score);
    const ga=Number(home?game.away_score:game.home_score);
    const opponentId=home?game.away_team_id:game.home_team_id;
    return {
      gf,ga,
      result:gf>ga?"vann":gf<ga?"föll":"spelade oavgjort",
      opponent:getTeamName(opponentId),
      game
    };
  }

  function topSkater(teamId) {
    return state.seasonPlayerStats
      .filter((row)=>row.team_id===teamId && row.position!=="GK" && Number(row.games_played||0)>0)
      .sort((a,b)=>
        Number(b.points||0)-Number(a.points||0) ||
        Number(b.goals||0)-Number(a.goals||0) ||
        Number(b.shots||0)-Number(a.shots||0)
      )[0] || null;
  }

  function leadingGoalie(teamId) {
    return state.seasonGoalieStats
      .filter((row)=>row.team_id===teamId && Number(row.games_played||0)>0 && row.save_pct!=null)
      .sort((a,b)=>
        Number(b.games_played||0)-Number(a.games_played||0) ||
        Number(b.save_pct||0)-Number(a.save_pct||0)
      )[0] || null;
  }

  function buildInsightFacts() {
    if(!state.nextGame||!state.focusTeam||!state.opponent) return [];
    const facts=[];
    const game=state.nextGame;
    const live=game.status==="live";
    const focusStanding=state.standingsByTeam.get(state.focusTeam.id);
    const oppStanding=state.standingsByTeam.get(state.opponent.id);
    const focusForm=formSummary(state.focusForm,state.focusTeam.id);
    const oppForm=formSummary(state.opponentForm,state.opponent.id);

    const add=(fact)=>{
      if(!fact?.id||!fact?.title||!fact?.text) return;
      facts.push({story:false,score:50,...fact});
    };

    if(live){
      const home=getTeamName(game.home_team_id);
      const away=getTeamName(game.away_team_id);
      add({
        id:"live-score",
        tag:"LIVE",
        title:home+" "+game.home_score+"–"+game.away_score+" "+away,
        text:"Period "+(game.period||"–")+" · "+(game.clock_display||"matchen pågår"),
        score:220,
        story:true
      });

      const latestGoal=state.currentEvents.find((event)=>event.event_type==="goal");
      if(latestGoal){
        add({
          id:"live-latest-goal",
          tag:"SENASTE MÅLET",
          title:latestGoal.description || "Mål registrerat",
          text:(latestGoal.clock_display||"–")+" · P"+(latestGoal.period||"–")+
            (latestGoal.home_score!=null?" · "+latestGoal.home_score+"–"+latestGoal.away_score:""),
          score:205,
          story:true
        });
      }

      const focusLive=state.teamGameStats.find((row)=>row.game_id===game.id&&row.team_id===state.focusTeam.id);
      const oppLive=state.teamGameStats.find((row)=>row.game_id===game.id&&row.team_id===state.opponent.id);
      if(focusLive||oppLive){
        add({
          id:"live-special",
          tag:"SPECIAL TEAMS LIVE",
          title:state.focusTeam.canonical_name+" PP "+specialRecord(focusLive?.power_play_goals,focusLive?.power_play_opportunities)+
            " · "+state.opponent.canonical_name+" PP "+specialRecord(oppLive?.power_play_goals,oppLive?.power_play_opportunities),
          text:"Aktuell matchdata från officiella matchrapporten.",
          score:180,
          story:true
        });
      }
    }else{
      add({
        id:"next-match",
        tag:"NÄSTA MATCH",
        title:state.focusTeam.canonical_name+" – "+state.opponent.canonical_name,
        text:swedishDate(game.scheduled_start)+" · "+(game.venue_name||"Arena ej angiven"),
        score:74
      });
    }

    if(focusStanding&&oppStanding){
      add({
        id:"standings",
        tag:"TABELL",
        title:state.opponent.canonical_name+" #"+oppStanding.rank+" · "+state.focusTeam.canonical_name+" #"+focusStanding.rank,
        text:"Efter "+oppStanding.games_played+" respektive "+focusStanding.games_played+
          " spelade matcher. Poäng "+oppStanding.points+"–"+focusStanding.points+".",
        score:72,
        story:true
      });
    }

    if(focusForm.games||oppForm.games){
      add({
        id:"form",
        tag:"FORM",
        title:state.focusTeam.canonical_name+" "+formText(focusForm),
        text:state.opponent.canonical_name+" "+formText(oppForm)+".",
        score:104,
        story:true
      });

      const focusLatest=latestResultText(state.focusForm,state.focusTeam.id);
      const oppLatest=latestResultText(state.opponentForm,state.opponent.id);
      if(focusLatest&&oppLatest){
        add({
          id:"latest-results",
          tag:"SENAST",
          title:state.focusTeam.canonical_name+" "+focusLatest.result+" "+focusLatest.gf+"–"+focusLatest.ga+" mot "+focusLatest.opponent,
          text:state.opponent.canonical_name+" "+oppLatest.result+" "+oppLatest.gf+"–"+oppLatest.ga+" mot "+oppLatest.opponent+".",
          score:96,
          story:true
        });
      }
    }

    if(state.h2hGames.length){
      const h=h2hSummary();
      const latest=state.h2hGames[0];
      const latestScore=h2hScoreFor(latest,state.focusTeam.id);
      add({
        id:"h2h",
        tag:"H2H",
        title:"Importerad historik: "+h.focusWins+"–"+h.opponentWins+" i vinster · mål "+h.focusGoals+"–"+h.opponentGoals,
        text:"Senaste mötet: "+state.focusTeam.canonical_name+" "+latestScore.gf+"–"+latestScore.ga+" "+state.opponent.canonical_name+
          " · "+shortDateOnly(latest.scheduled_start)+".",
        score:118,
        story:true
      });
    }

    const focusSpecial=seasonSpecialForTeam(state.focusTeam.id);
    const oppSpecial=seasonSpecialForTeam(state.opponent.id);
    if(focusSpecial&&oppSpecial){
      const focusPkKills=Number(focusSpecial.pk_opportunities||0)-Number(focusSpecial.pk_goals_against||0);
      const oppPkKills=Number(oppSpecial.pk_opportunities||0)-Number(oppSpecial.pk_goals_against||0);
      add({
        id:"special-teams",
        tag:"PP / BP",
        title:state.focusTeam.canonical_name+" PP "+specialRecord(focusSpecial.pp_goals,focusSpecial.pp_opportunities)+
          " · BP "+specialRecord(focusPkKills,focusSpecial.pk_opportunities),
        text:state.opponent.canonical_name+" PP "+specialRecord(oppSpecial.pp_goals,oppSpecial.pp_opportunities)+
          " · BP "+specialRecord(oppPkKills,oppSpecial.pk_opportunities)+
          ". Tidigt säsongsunderlag.",
        score:112,
        story:true
      });
    }

    const focusTop=topSkater(state.focusTeam.id);
    const oppTop=topSkater(state.opponent.id);
    if(focusTop&&oppTop){
      add({
        id:"points-leaders",
        tag:"POÄNGLIGAN I LAGEN",
        title:"#"+focusTop.jersey_number+" "+humanSourceName(focusTop.source_name)+
          " "+focusTop.goals+"+"+focusTop.assists+" · "+focusTop.points+" P",
        text:state.opponent.canonical_name+": #"+oppTop.jersey_number+" "+humanSourceName(oppTop.source_name)+
          " "+oppTop.goals+"+"+oppTop.assists+" · "+oppTop.points+" P.",
        score:89,
        story:true
      });
    }

    const focusGoalie=leadingGoalie(state.focusTeam.id);
    const oppGoalie=leadingGoalie(state.opponent.id);
    if(focusGoalie&&oppGoalie){
      add({
        id:"goalie-numbers",
        tag:"MÅLVAKTSSIFFROR",
        title:humanSourceName(focusGoalie.source_name)+" "+formatPct(focusGoalie.save_pct),
        text:humanSourceName(oppGoalie.source_name)+" "+formatPct(oppGoalie.save_pct)+
          ". Statistik, inte bekräftade starters.",
        score:67
      });
    }

    if(state.nextLineup){
      add({
        id:"official-lineup",
        tag:"LINEUP",
        title:"Officiell lineup för nästa match är publicerad",
        text:"KEDJOR-panelen visar Swehockeys aktuella uppställning.",
        score:150,
        story:true
      });
    }

    for(const note of currentEditorialNotes().filter((item)=>item.pinned)){
      const scopeScore=note.scope_type==="match"?190:
        note.scope_type==="team"?165:
        note.scope_type==="player"?160:135;
      add({
        id:"editorial-"+note.id,
        tag:"REDAKTIONELLT · "+noteScopeLabel(note),
        title:note.title||note.body.slice(0,100),
        text:note.title?note.body:((note.tags||[]).length?"Taggar: "+note.tags.join(", "):"Egen anteckning."),
        score:scopeScore,
        story:true,
        editorial:true
      });
    }

    const unique=new Map();
    for(const fact of facts){
      const old=unique.get(fact.id);
      if(!old||fact.score>old.score) unique.set(fact.id,fact);
    }
    return [...unique.values()].sort((a,b)=>b.score-a.score);
  }

  function rankedQuickFacts() {
    return buildInsightFacts().sort((a,b)=>{
      const aScore=a.score-(state.seenFactIds.has(a.id)?55:0);
      const bScore=b.score-(state.seenFactIds.has(b.id)?55:0);
      return bScore-aScore;
    });
  }

  function renderFacts() {
    const box=document.getElementById("factStack");
    if(!box) return;
    const facts=rankedQuickFacts();
    if(!facts.length){
      box.innerHTML='<article class="fact-card"><span>SNABBFAKTA</span><strong>Ingen verifierad fakta ännu.</strong><p>Väntar på mer matchdata.</p></article>';
      return;
    }

    const shown=facts.slice(0,3);
    state.lastQuickFactIds=shown.map((fact)=>fact.id);
    box.innerHTML=shown.map((fact,index)=>
      '<article class="fact-card '+(index===0?"primary ":"")+(fact.editorial?"editorial ":"")+'insight-card">' +
        '<span>'+esc(fact.tag)+'</span>' +
        '<strong>'+esc(fact.title)+'</strong>' +
        '<p>'+esc(fact.text)+'</p>' +
      '</article>'
    ).join("") +
    (facts.length>3
      ? '<button class="quick-fact-next" id="nextQuickFact" type="button"><span>↻</span><strong>NÄSTA SNABBIS</strong><small>Redan visade fakta prioriteras ned</small></button>'
      : "");

    const next=document.getElementById("nextQuickFact");
    if(next){
      next.addEventListener("click",()=>{
        state.lastQuickFactIds.forEach((id)=>state.seenFactIds.add(id));
        const all=buildInsightFacts();
        if(all.length&&all.every((fact)=>state.seenFactIds.has(fact.id))){
          state.seenFactIds.clear();
        }
        renderFacts();
      });
    }
  }

  function renderStorylines() {
    const stories=buildInsightFacts()
      .filter((fact)=>fact.story)
      .sort((a,b)=>b.score-a.score)
      .slice(0,7);

    if(!stories.length){
      return '<article class="drawer-card"><strong>Inga storylines ännu</strong><span>Väntar på verifierad matchdata.</span></article>';
    }

    const earlySeason=Math.max(
      Number(state.standingsByTeam.get(state.focusTeam.id)?.games_played||0),
      Number(state.standingsByTeam.get(state.opponent.id)?.games_played||0)
    )<5;

    return (earlySeason
      ? '<article class="drawer-card story-note"><strong>Tidigt på säsongen</strong><span>Form, tabell och procenttal bygger ännu på få matcher. Cockpiten visar siffrorna men drar inga stora slutsatser av dem.</span></article>'
      : "") +
      '<div class="story-grid">'+stories.map((fact,index)=>
        '<article class="story-card '+(fact.editorial?"editorial":"")+'">' +
          '<div class="story-index">'+String(index+1).padStart(2,"0")+'</div>' +
          '<div><span>'+esc(fact.tag)+'</span><strong>'+esc(fact.title)+'</strong><p>'+esc(fact.text)+'</p></div>' +
        '</article>'
      ).join("")+'</div>';
  }


  function aiQuestionBonus(fact,question) {
    const q=String(question||"").toLocaleLowerCase("sv-SE");
    if(!q) return 0;
    const hay=(fact.id+" "+fact.tag+" "+fact.title+" "+fact.text).toLocaleLowerCase("sv-SE");
    const groups=[
      [["pp","powerplay","bp","boxplay","utvis"],80],
      [["mål","goal","gör mål","poäng"],55],
      [["målvakt","goalie","sv%","gaa"],75],
      [["h2h","historik","möten","senast mot"],85],
      [["form","senaste","svit"],70],
      [["tabell","placering","poäng"],65],
      [["kedja","lineup","uppställning"],70],
      [["spelare","poängliga"],45]
    ];
    let bonus=0;
    for(const [terms,score] of groups){
      if(terms.some((term)=>q.includes(term))&&terms.some((term)=>hay.includes(term))){
        bonus=Math.max(bonus,score);
      }
    }
    return bonus;
  }

  function localAiBrief(question="") {
    const facts=buildInsightFacts()
      .map((fact)=>({...fact,localRank:Number(fact.score||0)+aiQuestionBonus(fact,question)}))
      .sort((a,b)=>b.localRank-a.localRank)
      .slice(0,3);

    return {
      headline:question
        ? "Talking points för frågan"
        : "Mest relevant just nu",
      talking_points:facts.map((fact)=>({
        label:fact.tag,
        text:fact.title+(fact.text?" "+fact.text:""),
        why_now:fact.editorial
          ? "Pinnad redaktionell anteckning för den aktuella matchkontexten."
          : "Hög relevans i den verifierade matchkontexten.",
        source_refs:[fact.editorial?"editorial_notes":"verified_stats"]
      })),
      caution:"Regelbaserad fallback. Ingen extern språkmodell har använts."
    };
  }

  function aiMode() {
    if(state.nextGame?.status==="live") return "live";
    return "pregame";
  }

  function aiTopicsFromBrief(brief) {
    return (brief?.talking_points||[])
      .slice(0,3)
      .map((point)=>String((point?.label||"")+" · "+(point?.text||"")).replace(/\s+/g," ").trim())
      .filter(Boolean);
  }

  function rememberAiTopics(brief) {
    const merged=[...state.aiUsedTopics,...aiTopicsFromBrief(brief)];
    state.aiUsedTopics=[...new Set(merged)].slice(-9);
  }

  async function requestServerAi(question="",requestStyle="relevant") {
    if(!client||!state.nextGame?.id||!state.focusTeam?.id) return {used:false,reason:"missing_context"};
    if(!canAccessTeam(state.focusTeam.id)) return {used:false,reason:"access_not_approved"};
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token) return {used:false,reason:"not_authenticated"};

    const body={
      game_id:state.nextGame.id,
      team_id:state.focusTeam.id,
      question:String(question||"").trim().slice(0,500),
      mode:aiMode(),
      request_style:requestStyle
    };
    if(requestStyle==="fresh"){
      body.avoid_topics=state.aiUsedTopics.slice(-9);
    }

    const {data,error}=await client.functions.invoke("commentator-ai",{body});

    if(error){
      const message=String(error.message||error);
      return {used:false,reason:message};
    }
    if(!data?.ok||!data?.brief){
      return {used:false,reason:data?.error||"invalid_response"};
    }
    return {used:true,brief:data.brief,model:data.model||"gpt-6-luna"};
  }

  function aiBriefHtml(brief,source) {
    if(!brief?.talking_points?.length){
      return '<div class="notes-empty"><strong>Inga talking points ännu.</strong><span>Matchkontexten är för tunn.</span></div>';
    }
    const sourceLabel=source==="server"?"OPENAI · GPT-6 LUNA":"VERIFIERAD FALLBACK";
    return '<div class="ai-result-head"><span>'+esc(sourceLabel)+'</span><strong>'+esc(brief.headline||"Talking points")+'</strong></div>' +
      '<div class="ai-points">'+brief.talking_points.slice(0,3).map((point,index)=>
        '<article class="ai-point">' +
          '<b>'+String(index+1).padStart(2,"0")+'</b>' +
          '<div><span>'+esc(point.label||"TALKING POINT")+'</span>' +
          '<strong>'+esc(point.text||"")+'</strong>' +
          '<p>'+esc(point.why_now||"")+'</p>' +
          (Array.isArray(point.source_refs)&&point.source_refs.length
            ? '<small>'+esc(point.source_refs.join(" · "))+'</small>'
            : "")+
          '</div>' +
        '</article>'
      ).join("")+'</div>' +
      (brief.caution?'<div class="ai-caution">'+esc(brief.caution)+'</div>':"");
  }

  function renderAi() {
    const brief=state.aiBrief||localAiBrief("");
    const serverReady=state.aiBriefSource==="server";
    const statusText=serverReady
      ? "Svar från servermodellen, byggt enbart på verifierad Swehockey-data."
      : !state.authUser
        ? "Fallbacken fungerar direkt. Server-AI kräver inloggning, godkänd behörighet och OPENAI_API_KEY."
        : !state.access?.active
          ? "Kontot är inloggat men inte godkänt för server-AI. Fallbacken fungerar fortfarande."
          : "Server-AI är konfigurerad. Om ett anrop misslyckas visas verifierad fallback automatiskt.";

    return '<article class="drawer-card ai-safety"><strong>Ingen fri statistikfantasi</strong><span>Server-AI får match-ID och hämtar själv officiell Swehockey-data från databasen. Privata NOTES skickas aldrig till språkmodellen.</span></article>' +
      '<div class="ai-status '+(serverReady?"ready":"fallback")+'"><span>'+(serverReady?"SERVER-AI":"LOKAL FALLBACK")+'</span><strong>'+esc(statusText)+'</strong></div>' +
      '<form class="ai-form" id="aiForm">' +
        '<label><span>FRÅGA / VINKEL</span><textarea id="aiQuestion" rows="3" maxlength="500" placeholder="T.ex. Vad är mest relevant att säga om lagets powerplay just nu?"></textarea></label>' +
        '<div class="ai-form-actions">' +
          '<button type="button" id="aiReset" '+(state.aiBusy?"disabled":"")+'>MEST RELEVANT NU</button>' +
          '<button type="button" id="aiFresh" class="fresh" '+(state.aiBusy?"disabled":"")+'>NYA VINKLAR</button>' +
          '<button type="submit" class="primary" '+(state.aiBusy?"disabled":"")+'>'+(state.aiBusy?"JOBBAR…":"GENERERA TALKING POINTS")+'</button>' +
        '</div>' +
      '</form>' +
      (state.aiError?'<div class="ai-error">'+esc(state.aiError)+'</div>':"") +
      '<div class="ai-output">'+aiBriefHtml(brief,state.aiBriefSource)+'</div>';
  }

  function bindAiUi() {
    const form=document.getElementById("aiForm");
    if(!form) return;

    async function runAi(question="",requestStyle="relevant") {
      if(state.aiBusy) return;
      state.aiBusy=true;
      state.aiError="";
      state.aiBrief=localAiBrief(question);
      state.aiBriefSource="local";
      renderDrawer("ai");

      const result=await requestServerAi(question,requestStyle);
      state.aiBusy=false;
      if(result.used){
        state.aiBrief=result.brief;
        state.aiBriefSource="server";
        state.aiError="";
        rememberAiTopics(result.brief);
      }else if(result.reason==="not_authenticated"){
        state.aiError="Server-AI kräver inloggning. Fallbacken ovan använder bara verifierad cockpit-data.";
      }else if(result.reason==="access_not_approved"){
        state.aiError="Kontot är inte godkänt för server-AI ännu. Den verifierade fallbacken används.";
      }else if(String(result.reason||"").includes("ai_not_configured")){
        state.aiError="OPENAI_API_KEY är inte konfigurerad på servern ännu. Fallbacken används tills dess.";
      }else if(result.reason&&result.reason!=="missing_context"){
        state.aiError="Server-AI fick inget användbart svar just nu. Verifierad fallback visas i stället.";
      }
      renderDrawer("ai");
    }

    document.getElementById("aiReset")?.addEventListener("click",()=>{
      runAi("","relevant");
    });

    document.getElementById("aiFresh")?.addEventListener("click",()=>{
      runAi("","fresh");
    });

    form.addEventListener("submit",(event)=>{
      event.preventDefault();
      const question=String(document.getElementById("aiQuestion")?.value||"").trim();
      runAi(question,question?"question":"relevant");
    });
  }

  function renderRoster() {
    const groups = [
      ["MÅLVAKTER", (p) => p.position === "GK"],
      ["BACKAR", (p) => p.position === "LD" || p.position === "RD"],
      ["FORWARDS", (p) => !["GK", "LD", "RD"].includes(p.position)]
    ];
    return groups.map(([title, test]) => {
      const items = state.roster.filter(test);
      if (!items.length) return "";
      return '<section class="roster-section"><h3 class="roster-section-title">' + title + '</h3><div class="roster-list">' +
        items.map((item) => {
          const p = item.player;
          const age = ageOn(p?.birth_date, state.nextGame?.scheduled_start);
          const meta = [
            item.position,
            age != null ? age + " år" : null,
            p?.shoots_catches ? p.shoots_catches + "-fattad" : null,
            p?.height_cm ? p.height_cm + " cm" : null,
            p?.weight_kg ? p.weight_kg + " kg" : null
          ].filter(Boolean).join(" · ");
          return '<div class="roster-player">' +
            '<b>#' + esc(item.jersey_number ?? "–") + '</b>' +
            '<div><strong>' + esc(p?.display_name || item.source_name || "Okänd spelare") + '</strong>' +
            '<small>' + esc(meta) + (p?.youth_club ? ' · ' + esc(p.youth_club) : '') + '</small></div>' +
            '<em>' + esc(item.position || "") + '</em>' +
          '</div>';
        }).join("") +
      '</div></section>';
    }).join("");
  }

  function humanSourceName(sourceName) {
    const value = String(sourceName || "");
    const comma = value.indexOf(",");
    if (comma < 0) return value;
    return value.slice(comma + 1).trim() + " " + value.slice(0, comma).trim();
  }

  function cleanLineupSourceName(sourceName) {
    return String(sourceName || "").replace(/\s*\((RD|LD|RW|LW|CE|GK)\)\s*$/i, "").trim();
  }

  async function loadLineup(game) {
    if (!game?.id) return null;
    const { data: revision, error: revisionError } = await client.from("game_lineup_revisions")
      .select("id,game_id,fetched_at,source_updated_at,status,source_url")
      .eq("game_id", game.id)
      .eq("is_current", true)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (revisionError) throw revisionError;
    if (!revision) return null;

    const { data: players, error: playersError } = await client.from("game_lineup_players")
      .select("team_id,player_id,source_name,jersey_number,position,line_number,goalie_role,is_extra")
      .eq("lineup_revision_id", revision.id)
      .order("line_number", { ascending: true, nullsFirst: true })
      .order("jersey_number", { ascending: true });
    if (playersError) throw playersError;

    return { game, revision, players: players || [] };
  }

  function lineupContextForTeam(teamId) {
    const official = state.nextLineup?.players?.some((row) => row.team_id === teamId);
    if (official) {
      return { ...state.nextLineup, mode: "official" };
    }
    const fallback = state.fallbackLineups.get(teamId) || null;
    return fallback ? { ...fallback, mode: "previous" } : null;
  }

  function lineupSlot(row, position) {
    if (!row) {
      return '<div class="lineup-slot empty"><span>' + esc(position) + '</span><strong>–</strong></div>';
    }
    return '<div class="lineup-slot">' +
      '<span>' + esc(position) + '</span>' +
      '<b>#' + esc(row.jersey_number ?? "–") + '</b>' +
      '<strong>' + nationalityMarkup(row.player_id) + esc(humanSourceName(cleanLineupSourceName(row.source_name))) + '</strong>' +
    '</div>';
  }

  function renderLineupTeam(teamId) {
    const ctx = lineupContextForTeam(teamId);
    const teamName = getTeamName(teamId);

    if (!ctx) {
      return '<section class="lineup-team">' +
        '<div class="lineup-team-head"><div><span>INGEN LINEUP</span><h3>' + esc(teamName) + '</h3></div></div>' +
        '<div class="drawer-card"><strong>Uppställning saknas</strong><span>Ingen tidigare lineup är importerad för laget ännu.</span></div>' +
      '</section>';
    }

    const rows = ctx.players.filter((row) => row.team_id === teamId);
    const goalies = rows
      .filter((row) => row.position === "GK")
      .sort((a, b) => String(a.goalie_role || "").localeCompare(String(b.goalie_role || "")));
    const extras = rows.filter((row) => row.line_number == null && row.position !== "GK");
    const statusLabel = ctx.mode === "official" ? "OFFICIELL LINEUP ✓" : "SENAST ANVÄNDA";
    const meta = ctx.mode === "official"
      ? swedishDate(state.nextGame.scheduled_start)
      : "Från " + swedishDate(ctx.game.scheduled_start);

    const lineHtml = [1,2,3,4].map((lineNumber) => {
      const line = rows.filter((row) => Number(row.line_number) === lineNumber);
      const byPos = new Map(line.filter((row) => row.position).map((row) => [row.position, row]));
      if (!line.length) return "";
      return '<article class="lineup-line">' +
        '<div class="lineup-line-head"><strong>' + lineNumber + ':A</strong><span>' + esc(teamName) + '</span></div>' +
        '<div class="lineup-forwards">' +
          lineupSlot(byPos.get("LW"), "LW") +
          lineupSlot(byPos.get("CE"), "C") +
          lineupSlot(byPos.get("RW"), "RW") +
        '</div>' +
        '<div class="lineup-defense">' +
          lineupSlot(byPos.get("LD"), "LD") +
          lineupSlot(byPos.get("RD"), "RD") +
        '</div>' +
      '</article>';
    }).join("");

    const goaliesHtml = '<div class="lineup-goalies">' +
      goalies.map((row, i) =>
        '<div><span>' + (i === 0 ? "G1" : "G2") + '</span><b>#' + esc(row.jersey_number ?? "–") + '</b><strong>' +
        nationalityMarkup(row.player_id) + esc(humanSourceName(cleanLineupSourceName(row.source_name))) + '</strong></div>'
      ).join("") +
    '</div>';

    const extrasHtml = extras.length
      ? '<div class="lineup-extras"><span>EXTRA</span>' + extras.map((row) =>
          '<strong>#' + esc(row.jersey_number ?? "–") + ' ' + esc(humanSourceName(cleanLineupSourceName(row.source_name))) + '</strong>'
        ).join("") + '</div>'
      : "";

    return '<section class="lineup-team">' +
      '<div class="lineup-team-head"><div><span class="' + (ctx.mode === "official" ? "official" : "") + '">' + statusLabel + '</span><h3>' + esc(teamName) + '</h3></div><small>' + esc(meta) + '</small></div>' +
      goaliesHtml +
      '<div class="lineup-lines">' + lineHtml + '</div>' +
      extrasHtml +
    '</section>';
  }

  function renderLineups() {
    const officialTeams = state.nextLineup
      ? new Set(state.nextLineup.players.map((row) => row.team_id))
      : new Set();
    const officialReady = officialTeams.has(state.focusTeam.id) && officialTeams.has(state.opponent.id);

    const intro = officialReady
      ? '<article class="drawer-card lineup-info official"><strong>Officiell lineup publicerad</strong><span>Uppställningen för nästa match hämtas direkt från Swehockey och ersätter automatiskt tidigare kedjor.</span></article>'
      : '<article class="drawer-card lineup-info"><strong>Officiell lineup är inte publicerad ännu</strong><span>Visar respektive lags senast importerade uppställning tills nästa matchs lineup kommer. Den byts då ut automatiskt.</span></article>';

    return intro +
      '<div class="lineup-team-grid">' +
        renderLineupTeam(state.focusTeam.id) +
        renderLineupTeam(state.opponent.id) +
      '</div>';
  }

  function sourceNameKey(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE");
  }

  function recentGameIdsForTeam(teamId) {
    return (teamId === state.focusTeam?.id ? state.focusForm : state.opponentForm)
      .map((game) => game.id);
  }

  function sameStatPlayer(seasonRow, gameRow) {
    if (seasonRow.player_id && gameRow.player_id) {
      return seasonRow.player_id === gameRow.player_id;
    }
    return seasonRow.team_id === gameRow.team_id &&
      sourceNameKey(seasonRow.source_name) === sourceNameKey(gameRow.source_name);
  }

  function aggregateRecentPlayer(seasonRow) {
    const allowedGames = new Set(recentGameIdsForTeam(seasonRow.team_id));
    const rows = state.recentPlayerStats.filter((row) =>
      allowedGames.has(row.game_id) && sameStatPlayer(seasonRow, row)
    );
    const goals = rows.reduce((sum, row) => sum + Number(row.goals || 0), 0);
    const assists = rows.reduce((sum, row) => sum + Number(row.assists || 0), 0);
    const points = rows.reduce((sum, row) => sum + Number(row.points || 0), 0);
    const shots = rows.reduce((sum, row) => sum + Number(row.shots || 0), 0);
    const pim = rows.reduce((sum, row) => sum + Number(row.pim || 0), 0);
    const plusMinus = rows.reduce((sum, row) => sum + Number(row.plus_minus || 0), 0);
    const faceoffWins = rows.reduce((sum, row) => sum + Number(row.faceoff_wins || 0), 0);
    const faceoffLosses = rows.reduce((sum, row) => sum + Number(row.faceoff_losses || 0), 0);
    const foTotal = faceoffWins + faceoffLosses;
    return {
      games: rows.length,
      goals,
      assists,
      points,
      shots,
      pim,
      plusMinus,
      faceoffPct: foTotal ? (faceoffWins / foTotal) * 100 : null
    };
  }

  function aggregateRecentGoalie(seasonRow) {
    const allowedGames = new Set(recentGameIdsForTeam(seasonRow.team_id));
    const rows = state.recentGoalieStats.filter((row) =>
      allowedGames.has(row.game_id) && sameStatPlayer(seasonRow, row)
    );
    const saves = rows.reduce((sum, row) => sum + Number(row.saves || 0), 0);
    const shotsAgainst = rows.reduce((sum, row) => sum + Number(row.shots_against || 0), 0);
    const goalsAgainst = rows.reduce((sum, row) => sum + Number(row.goals_against || 0), 0);
    const seconds = rows.reduce((sum, row) => sum + Number(row.minutes_played_seconds || 0), 0);
    return {
      games: rows.length,
      saves,
      shotsAgainst,
      goalsAgainst,
      seconds,
      savePct: shotsAgainst ? (saves / shotsAgainst) * 100 : null,
      gaa: seconds ? (goalsAgainst * 3600) / seconds : null
    };
  }

  function currentPlayerGameRow(seasonRow) {
    if(state.nextGame?.status!=="live") return null;
    return state.currentPlayerStats.find((row)=>sameStatPlayer(seasonRow,row)) || null;
  }

  function currentGoalieGameRow(seasonRow) {
    if(state.nextGame?.status!=="live") return null;
    return state.currentGoalieStats.find((row)=>sameStatPlayer(seasonRow,row)) || null;
  }

  function signedStat(value) {
    const n=Number(value || 0);
    return n>0 ? "+"+n : String(n);
  }

  function livePlayerDetail(row) {
    if(!row) return "";
    const fo=row.faceoff_pct==null ? "" : " · FO "+Number(row.faceoff_pct).toLocaleString("sv-SE",{maximumFractionDigits:1})+"%";
    return '<span class="live-stat-line"><b>LIVE</b> '+esc(Number(row.goals||0)+"+"+Number(row.assists||0)+" · "+Number(row.points||0)+" P · "+Number(row.shots||0)+" SOG · "+Number(row.pim||0)+" PIM · +/- "+signedStat(row.plus_minus))+esc(fo)+'</span>';
  }

  function liveGoalieDetail(row) {
    if(!row) return "";
    const sv=row.save_pct==null ? "–" : Number(row.save_pct).toLocaleString("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";
    const gaa=row.gaa==null ? "–" : Number(row.gaa).toLocaleString("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2});
    return '<div class="goalie-live"><span>LIVE</span><strong>'+esc(Number(row.saves||0)+"/"+Number(row.shots_against||0)+" · "+sv+" · GAA "+gaa+" · "+formatClockSeconds(row.minutes_played_seconds))+'</strong></div>';
  }

  function renderPlayerStats() {
    if ((!state.seasonPlayerStats.length && !state.currentPlayerStats.length) || !state.nextGame) {
      return '<div class="drawer-card"><strong>Ingen säsongsstatistik ännu</strong><span>Swehockeys Players By Team har ännu inte gett oss spelardata.</span></div>';
    }

    const teamOrder = [state.focusTeam.id, state.opponent.id];
    return teamOrder.map((teamId) => {
      const seasonRows = state.seasonPlayerStats
        .filter((row) => row.team_id === teamId && row.position !== "GK");
      const liveOnlyRows = state.currentPlayerStats
        .filter((row)=>row.team_id===teamId && row.position!=="GK")
        .filter((liveRow)=>!seasonRows.some((seasonRow)=>sameStatPlayer(seasonRow,liveRow)))
        .map((row)=>({
          ...row,
          games_played:0,goals:0,assists:0,points:0,shots:0,pim:0,plus_minus:0,
          faceoff_pct:null,
          live_only:true
        }));
      const rows = [...seasonRows,...liveOnlyRows]
        .sort((a, b) =>
          Number(b.points || 0) - Number(a.points || 0) ||
          Number(b.goals || 0) - Number(a.goals || 0) ||
          Number(b.shots || 0) - Number(a.shots || 0) ||
          Number(a.jersey_number || 999) - Number(b.jersey_number || 999)
        );

      if (!rows.length) return "";
      return '<section class="player-stat-section">' +
        '<h3 class="roster-section-title">' + esc(getTeamName(teamId)) + ' · SÄSONG</h3>' +
        '<div class="player-stat-head"><span>SPELARE</span><span>GP</span><span>G</span><span>A</span><span>P</span><span>SOG</span><span>FO%</span></div>' +
        '<div class="player-stat-list">' +
          rows.map((row) => {
            const recent = aggregateRecentPlayer(row);
            const fo = row.faceoff_pct == null ? "–" :
              Number(row.faceoff_pct).toLocaleString("sv-SE", { maximumFractionDigits: 1 });
            const recentText = recent.games
              ? 'S5 ' + recent.games + ' GP · ' + recent.goals + '+' + recent.assists + ' · ' + recent.points + ' P'
              : 'S5 väntar på matchrapport';
            const liveRow=currentPlayerGameRow(row);
            return '<div class="player-stat-row' + (liveRow ? ' is-live' : '') + '">' +
              '<div class="player-stat-name"><b>#' + esc(row.jersey_number ?? "–") + '</b><span>' +
                '<strong>' + nationalityMarkup(row.player_id) + esc(humanSourceName(row.source_name)) + '</strong>' +
                livePlayerDetail(liveRow) +
                '<small>' + esc((row.position || "") + ' · ' + recentText) + '</small>' +
              '</span></div>' +
              '<em>' + esc(row.games_played ?? 0) + '</em>' +
              '<em>' + esc(row.goals ?? 0) + '</em>' +
              '<em>' + esc(row.assists ?? 0) + '</em>' +
              '<em class="pts">' + esc(row.points ?? 0) + '</em>' +
              '<em>' + esc(row.shots ?? 0) + '</em>' +
              '<em>' + esc(fo) + '</em>' +
            '</div>';
          }).join("") +
        '</div>' +
      '</section>';
    }).join("");
  }

  function renderGoalieStats() {
    if ((!state.seasonGoalieStats.length && !state.currentGoalieStats.length) || !state.nextGame) {
      return '<div class="drawer-card"><strong>Ingen målvaktsstatistik ännu</strong><span>Swehockeys säsongstabell har ännu inte gett oss målvaktsdata.</span></div>';
    }

    const teamOrder = [state.focusTeam.id, state.opponent.id];
    return teamOrder.map((teamId) => {
      const seasonRows=state.seasonGoalieStats.filter((row)=>row.team_id===teamId);
      const liveOnlyRows=state.currentGoalieStats
        .filter((row)=>row.team_id===teamId)
        .filter((liveRow)=>!seasonRows.some((seasonRow)=>sameStatPlayer(seasonRow,liveRow)))
        .map((row)=>({
          ...row,games_played:0,wins:0,losses:0,save_pct:null,gaa:null,minutes_played_seconds:0,live_only:true
        }));
      const rows = [...seasonRows,...liveOnlyRows]
        .sort((a, b) =>
          Number(b.games_played || 0) - Number(a.games_played || 0) ||
          Number(b.minutes_played_seconds || 0) - Number(a.minutes_played_seconds || 0)
        );
      if (!rows.length) return "";

      return '<section class="goalie-team-section">' +
        '<h3 class="roster-section-title">' + esc(getTeamName(teamId)) + ' · SÄSONG</h3>' +
        '<div class="goalie-card-grid">' + rows.map((row) => {
          const recent = aggregateRecentGoalie(row);
          const svPct = row.save_pct == null ? "–" :
            Number(row.save_pct).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
          const gaa = row.gaa == null ? "–" :
            Number(row.gaa).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const record = Number(row.games_played || 0)
            ? String(row.wins ?? 0) + "–" + String(row.losses ?? 0)
            : "–";
          const recentSv = recent.savePct == null ? "–" :
            recent.savePct.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
          const recentGaa = recent.gaa == null ? "–" :
            recent.gaa.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          return '<article class="goalie-card">' +
            '<div class="goalie-card-head"><span>SÄSONG</span><b>#' + esc(row.jersey_number ?? "–") + '</b></div>' +
            '<h3>' + nationalityMarkup(row.player_id) + esc(humanSourceName(row.source_name)) + '</h3>' +
            '<div class="goalie-metrics goalie-season-metrics">' +
              '<div><span>GP</span><strong>' + esc(row.games_played ?? 0) + '</strong></div>' +
              '<div><span>SV%</span><strong>' + esc(svPct) + '</strong></div>' +
              '<div><span>GAA</span><strong>' + esc(gaa) + '</strong></div>' +
              '<div><span>W–L</span><strong>' + esc(record) + '</strong></div>' +
            '</div>' +
            liveGoalieDetail(currentGoalieGameRow(row)) +
            '<div class="goalie-recent">' +
              '<span>S5</span><strong>' + esc(recent.games + ' GP · ' + recent.saves + '/' + recent.shotsAgainst + ' · ' + recentSv + ' · GAA ' + recentGaa) + '</strong>' +
            '</div>' +
          '</article>';
        }).join("") + '</div>' +
      '</section>';
    }).join("");
  }


  function seasonSpecialForTeam(teamId) {
    return state.seasonSpecialTeams.find((row) => row.team_id === teamId) || null;
  }

  function aggregateRecentSpecial(teamId) {
    const allowed = new Set(recentGameIdsForTeam(teamId));
    const rows = state.teamGameStats.filter((row) =>
      row.team_id === teamId &&
      allowed.has(row.game_id) &&
      row.power_play_opportunities != null &&
      row.penalty_kill_opportunities != null
    );
    const games = new Set(rows.map((row) => row.game_id)).size;
    const ppOpp = rows.reduce((sum,row)=>sum+Number(row.power_play_opportunities||0),0);
    const ppGoals = rows.reduce((sum,row)=>sum+Number(row.power_play_goals||0),0);
    const pkOpp = rows.reduce((sum,row)=>sum+Number(row.penalty_kill_opportunities||0),0);
    const pkGa = rows.reduce((sum,row)=>sum+Number(row.penalty_kill_goals_against||0),0);
    return {
      games,
      ppOpp,
      ppGoals,
      ppPct: ppOpp ? ppGoals/ppOpp*100 : null,
      pkOpp,
      pkGa,
      pkPct: pkOpp ? (pkOpp-pkGa)/pkOpp*100 : null
    };
  }

  function nextGameSpecialForTeam(teamId) {
    return state.teamGameStats.find((row) =>
      row.game_id === state.nextGame?.id && row.team_id === teamId
    ) || null;
  }

  function specialRecord(goals, opportunities) {
    if (goals == null || opportunities == null) return "–";
    return String(goals) + "/" + String(opportunities);
  }

  function renderSpecialTeamCard(teamId) {
    const season=seasonSpecialForTeam(teamId);
    const recent=aggregateRecentSpecial(teamId);
    const current=nextGameSpecialForTeam(teamId);
    const name=getTeamName(teamId);

    if(!season){
      return '<section class="special-team-card"><h3>'+esc(name)+'</h3><div class="drawer-card"><strong>Ingen special teams-data</strong><span>Swehockey har ännu inte publicerat säsongsraden.</span></div></section>';
    }

    const seasonPkKills = season.pk_opportunities == null || season.pk_goals_against == null
      ? null
      : Number(season.pk_opportunities)-Number(season.pk_goals_against);
    const recentPkKills = recent.pkOpp-recent.pkGa;

    const currentHtml=current && current.power_play_opportunities != null
      ? '<div class="special-current"><span>AKTUELL MATCH</span><strong>PP '+
          esc(specialRecord(current.power_play_goals,current.power_play_opportunities))+
          ' · BP '+esc(specialRecord(
            Number(current.penalty_kill_opportunities||0)-Number(current.penalty_kill_goals_against||0),
            current.penalty_kill_opportunities
          ))+'</strong></div>'
      : '<div class="special-current muted"><span>NÄSTA MATCH</span><strong>Väntar på matchdata</strong></div>';

    return '<section class="special-team-card">' +
      '<div class="special-team-head"><span>SÄSONG</span><h3>'+esc(name)+'</h3></div>' +
      '<div class="special-primary">' +
        '<div><span>POWERPLAY</span><strong>'+esc(formatPct(season.pp_pct))+'</strong><small>'+
          esc(specialRecord(season.pp_goals,season.pp_opportunities))+' · '+esc(formatClockSeconds(season.pp_seconds))+
        '</small></div>' +
        '<div><span>BOXPLAY</span><strong>'+esc(formatPct(season.pk_pct))+'</strong><small>'+
          esc(specialRecord(seasonPkKills,season.pk_opportunities))+' dödade</small></div>' +
      '</div>' +
      '<div class="special-recent">' +
        '<span>SENASTE 5 · '+esc(recent.games)+' SPELADE</span>' +
        '<strong>PP '+esc(specialRecord(recent.ppGoals,recent.ppOpp))+
          ' ('+esc(formatPct(recent.ppPct))+') · BP '+
          esc(specialRecord(recentPkKills,recent.pkOpp))+
          ' ('+esc(formatPct(recent.pkPct))+')</strong>' +
      '</div>' +
      currentHtml +
    '</section>';
  }

  function renderSpecialTeams() {
    return '<article class="drawer-card special-intro"><strong>PP / BP</strong><span>Säsongen kommer direkt från Swehockeys officiella PP/Penalty Killing-tabell. Senaste 5 räknas från importerade officiella matchrapporter.</span></article>' +
      '<div class="special-team-grid">' +
        renderSpecialTeamCard(state.focusTeam.id) +
        renderSpecialTeamCard(state.opponent.id) +
      '</div>';
  }

  function h2hScoreFor(game,teamId) {
    const home=game.home_team_id===teamId;
    return {
      gf:Number(home?game.home_score:game.away_score),
      ga:Number(home?game.away_score:game.home_score)
    };
  }

  function h2hWinner(game) {
    const v=h2hScoreFor(game,state.focusTeam.id);
    if(v.gf>v.ga) return state.focusTeam.id;
    if(v.gf<v.ga) return state.opponent.id;
    return null;
  }

  function h2hSummary() {
    const games=state.h2hGames;
    let focusWins=0,opponentWins=0,ties=0,focusGoals=0,opponentGoals=0;
    for(const game of games) {
      const score=h2hScoreFor(game,state.focusTeam.id);
      focusGoals+=score.gf;
      opponentGoals+=score.ga;
      if(score.gf>score.ga) focusWins++;
      else if(score.gf<score.ga) opponentWins++;
      else ties++;
    }

    let streakTeam=null;
    let streak=0;
    for(const game of games) {
      const winner=h2hWinner(game);
      if(!winner) break;
      if(streakTeam===null) {
        streakTeam=winner;
        streak=1;
      } else if(winner===streakTeam) {
        streak++;
      } else {
        break;
      }
    }

    return {games:games.length,focusWins,opponentWins,ties,focusGoals,opponentGoals,streakTeam,streak};
  }

  function seasonForGame(game) {
    return state.competitionById.get(game.competition_id)?.season_label || "–";
  }

  function shortDateOnly(iso) {
    if(!iso) return "–";
    return new Intl.DateTimeFormat("sv-SE",{
      day:"numeric",month:"short",year:"numeric",timeZone:"Europe/Stockholm"
    }).format(new Date(iso));
  }

  function renderH2H() {
    if(!state.h2hGames.length) {
      return '<article class="drawer-card"><strong>Inga tidigare möten importerade</strong><span>Historikcollectorn har ännu inte hittat en match mellan lagen.</span></article>';
    }

    const s=h2hSummary();
    const latest=state.h2hGames[0];
    const latestScore=h2hScoreFor(latest,state.focusTeam.id);
    const streakName=s.streakTeam?getTeamName(s.streakTeam):"Ingen";
    const historySeasons=[...new Set(state.h2hGames.map(seasonForGame))].filter(Boolean);

    const rows=state.h2hGames.slice(0,10).map((game)=>{
      const v=h2hScoreFor(game,state.focusTeam.id);
      const result=v.gf>v.ga?"win":v.gf<v.ga?"loss":"tie";
      const home=getTeamName(game.home_team_id);
      const away=getTeamName(game.away_team_id);
      return '<div class="h2h-row '+result+'">' +
        '<div class="h2h-date"><strong>'+esc(shortDateOnly(game.scheduled_start))+'</strong><span>'+esc(seasonForGame(game))+'</span></div>' +
        '<div class="h2h-teams"><span>'+esc(home)+'</span><span>'+esc(away)+'</span></div>' +
        '<div class="h2h-score"><strong>'+esc(game.home_score)+'–'+esc(game.away_score)+'</strong><small>'+esc(game.venue_name||"")+'</small></div>' +
      '</div>';
    }).join("");

    return '<article class="drawer-card h2h-intro"><strong>Historik från Swehockey</strong><span>'+esc(historySeasons.join(" · "))+' · siffrorna räknas direkt från importerade matcher.</span></article>' +
      '<div class="h2h-summary">' +
        '<div><span>MÖTEN</span><strong>'+esc(s.games)+'</strong></div>' +
        '<div><span>VINSTER</span><strong>'+esc(s.focusWins)+'–'+esc(s.opponentWins)+'</strong><small>'+esc(state.focusTeam.canonical_name)+' – '+esc(state.opponent.canonical_name)+'</small></div>' +
        '<div><span>MÅL</span><strong>'+esc(s.focusGoals)+'–'+esc(s.opponentGoals)+'</strong><small>'+esc(state.focusTeam.canonical_name)+' – '+esc(state.opponent.canonical_name)+'</small></div>' +
        '<div><span>SVIT</span><strong>'+esc(s.streak||"–")+'</strong><small>'+esc(s.streak?streakName:"Ingen pågående")+'</small></div>' +
      '</div>' +
      '<article class="h2h-latest">' +
        '<span>SENASTE MÖTET · '+esc(seasonForGame(latest))+'</span>' +
        '<strong>'+esc(state.focusTeam.canonical_name)+' '+esc(latestScore.gf)+'–'+esc(latestScore.ga)+' '+esc(state.opponent.canonical_name)+'</strong>' +
        '<small>'+esc(shortDateOnly(latest.scheduled_start))+' · '+esc(latest.venue_name||"Arena saknas")+'</small>' +
      '</article>' +
      '<div class="h2h-list">'+rows+'</div>';
  }


  function studioGame() {
    return state.nextGame?.status === "live" ? state.nextGame : state.latestFocusGame;
  }

  function studioEvents(game) {
    if(!game) return [];
    return game.id === state.nextGame?.id && state.nextGame?.status === "live"
      ? state.currentEvents
      : state.latestEvents;
  }

  function studioStatsForTeam(game,teamId) {
    if(!game) return null;
    const current=state.teamGameStats.find((row)=>row.game_id===game.id&&row.team_id===teamId);
    if(current) return current;
    if(game.id===state.latestFocusGame?.id) return state.latestTeamStats.get(teamId)||null;
    return null;
  }

  function studioPeriod(game,events) {
    const eventPeriods=events.map((event)=>Number(event.period||0)).filter((period)=>period>0&&period<=5);
    const maxEventPeriod=eventPeriods.length?Math.max(...eventPeriods):1;
    if(game?.status==="live"&&Number(game.period)>0) return Math.max(1,Number(game.period));
    return Math.max(1,maxEventPeriod);
  }

  function periodStat(stats,key,period) {
    const values=stats?.period_stats?.[key];
    if(!Array.isArray(values)) return null;
    const value=values[period-1];
    return value==null?null:Number(value);
  }

  function periodGoalCounts(events,period,homeId,awayId) {
    let home=0,away=0;
    for(const event of events){
      if(Number(event.period)!==period||event.event_type!=="goal") continue;
      if(event.team_id===homeId) home++;
      else if(event.team_id===awayId) away++;
    }
    return {home,away};
  }

  function scoreAfterPeriod(events,period) {
    const goals=events
      .filter((event)=>event.event_type==="goal"&&Number(event.period)<=period&&event.home_score!=null&&event.away_score!=null)
      .sort((a,b)=>Number(b.event_seconds||0)-Number(a.event_seconds||0));
    return goals[0]
      ? {home:Number(goals[0].home_score),away:Number(goals[0].away_score)}
      : {home:0,away:0};
  }

  function contributorName(text) {
    return String(text||"")
      .replace(/^#\d+\s+/,"")
      .replace(/\s*\(\d+\)\s*$/,"")
      .trim();
  }

  function periodKeyPlayer(events,period) {
    const points=new Map();
    const add=(name,teamId,value)=>{
      if(!name) return;
      const key=teamId+"|"+name;
      const current=points.get(key)||{name,teamId,goals:0,assists:0,weight:0};
      if(value===2) current.goals++;
      else current.assists++;
      current.weight+=value;
      points.set(key,current);
    };

    for(const event of events){
      if(Number(event.period)!==period||event.event_type!=="goal") continue;
      const description=String(event.description||"");
      const parts=description.split("· Ass:");
      const scorer=parts[0].replace(/\s*\(\d+\)\s*$/,"").trim();
      add(contributorName(scorer),event.team_id,2);
      if(parts[1]){
        parts[1].split(",").forEach((assist)=>add(contributorName(assist.trim()),event.team_id,1));
      }
    }

    return [...points.values()].sort((a,b)=>
      b.weight-a.weight || b.goals-a.goals || a.name.localeCompare(b.name,"sv")
    )[0]||null;
  }

  function periodLabel(period) {
    if(period===4) return "OT";
    if(period===5) return "SO";
    return "P"+period;
  }

  function renderStudio() {
    const game=studioGame();
    if(!game){
      return '<article class="drawer-card"><strong>Ingen match att sammanfatta</strong><span>Studio-underlaget aktiveras när matchdata finns.</span></article>';
    }

    const events=studioEvents(game);
    const period=studioPeriod(game,events);
    const homeId=game.home_team_id;
    const awayId=game.away_team_id;
    const homeName=getTeamName(homeId);
    const awayName=getTeamName(awayId);
    const homeStats=studioStatsForTeam(game,homeId);
    const awayStats=studioStatsForTeam(game,awayId);
    const goals=periodGoalCounts(events,period,homeId,awayId);
    const overall=scoreAfterPeriod(events,period);
    const homeShots=periodStat(homeStats,"shots",period);
    const awayShots=periodStat(awayStats,"shots",period);
    const homePim=periodStat(homeStats,"pim",period);
    const awayPim=periodStat(awayStats,"pim",period);
    const periodEvents=events
      .filter((event)=>Number(event.period)===period&&(event.event_type==="goal"||event.event_type==="penalty"))
      .sort((a,b)=>Number(a.event_seconds||0)-Number(b.event_seconds||0));
    const ppGoals={
      home:periodEvents.filter((event)=>event.event_type==="goal"&&event.team_id===homeId&&String(event.strength||"").toUpperCase().startsWith("PP")).length,
      away:periodEvents.filter((event)=>event.event_type==="goal"&&event.team_id===awayId&&String(event.strength||"").toUpperCase().startsWith("PP")).length
    };
    const keyPlayer=periodKeyPlayer(events,period);
    const live=game.status==="live";
    const modeLabel=live?"AKTUELL MATCH":"TESTLÄGE · SENASTE MATCH";

    const periodResult=goals.home===goals.away
      ? "Perioden "+goals.home+"–"+goals.away
      : (goals.home>goals.away?homeName:awayName)+" vann perioden "+goals.home+"–"+goals.away;

    const shotText=homeShots!=null&&awayShots!=null
      ? "Skotten "+homeShots+"–"+awayShots+"."
      : "Periodskott saknas ännu.";

    const specialText=(ppGoals.home||ppGoals.away)
      ? "PP-mål "+ppGoals.home+"–"+ppGoals.away+
        (homePim!=null&&awayPim!=null?" · PIM "+homePim+"–"+awayPim+".":".")
      : "Inga PP-mål i perioden"+
        (homePim!=null&&awayPim!=null?". PIM "+homePim+"–"+awayPim+".":".");

    const keyText=keyPlayer
      ? keyPlayer.name+" · "+keyPlayer.goals+" mål · "+keyPlayer.assists+" assist"
      : "Ingen poängspelare sticker ut i eventdata för perioden.";

    const talkingPoints=[
      {
        tag:"PERIODBILD",
        title:periodResult,
        text:shotText+" Totalt efter perioden: "+homeName+" "+overall.home+"–"+overall.away+" "+awayName+"."
      },
      {
        tag:"SPECIAL TEAMS / DISCIPLIN",
        title:specialText,
        text:"Bygger på periodens mål, utvisningar och officiella periodstatistik."
      },
      {
        tag:"NYCKELSPELARE",
        title:keyText,
        text:keyPlayer?"Poängbidrag i periodens registrerade mål.":"Använd skottbild och matchhändelser som huvudspår."
      }
    ];

    const eventsHtml=periodEvents.length
      ? '<div class="studio-events">'+periodEvents.map((event)=>{
          const label=event.event_type==="goal"?"MÅL":"UTVISNING";
          return '<div class="studio-event '+event.event_type+'">' +
            '<div><span>'+esc(event.clock_display||"–")+'</span><b>'+label+'</b></div>' +
            '<strong>'+esc(event.team_id?getTeamName(event.team_id):"")+'</strong>' +
            '<p>'+esc(event.description||"")+'</p>' +
          '</div>';
        }).join("")+'</div>'
      : '<div class="drawer-card"><strong>Inga mål eller utvisningar i perioden</strong><span>Eventflödet innehåller inga sådana händelser ännu.</span></div>';

    return '<article class="studio-banner '+(live?"live":"")+'">' +
      '<div><span>'+esc(modeLabel)+'</span><h3>'+esc(periodLabel(period))+' · '+esc(homeName)+' – '+esc(awayName)+'</h3></div>' +
      '<strong>'+esc(overall.home)+'–'+esc(overall.away)+'</strong>' +
    '</article>' +
    '<div class="studio-summary-grid">' +
      '<div><span>PERIOD</span><strong>'+esc(goals.home)+'–'+esc(goals.away)+'</strong><small>'+esc(periodLabel(period))+'</small></div>' +
      '<div><span>SKOTT</span><strong>'+esc(homeShots??"–")+'–'+esc(awayShots??"–")+'</strong><small>'+esc(periodLabel(period))+'</small></div>' +
      '<div><span>PP-MÅL</span><strong>'+esc(ppGoals.home)+'–'+esc(ppGoals.away)+'</strong><small>'+esc(periodLabel(period))+'</small></div>' +
      '<div><span>PIM</span><strong>'+esc(homePim??"–")+'–'+esc(awayPim??"–")+'</strong><small>'+esc(periodLabel(period))+'</small></div>' +
    '</div>' +
    '<div class="studio-section-title"><span>3 TALKING POINTS</span><small>VERIFIERAD DATA</small></div>' +
    '<div class="studio-talking-points">'+talkingPoints.map((point,index)=>
      '<article><b>'+String(index+1).padStart(2,"0")+'</b><div><span>'+esc(point.tag)+'</span><strong>'+esc(point.title)+'</strong><p>'+esc(point.text)+'</p></div></article>'
    ).join("")+'</div>' +
    '<div class="studio-section-title"><span>PERIODENS HÄNDELSER</span><small>'+esc(periodLabel(period))+'</small></div>' +
    eventsHtml;
  }

  function renderUpcomingGames() {
    const games = state.upcomingGames || [];
    if (!games.length) {
      return '<section class="upcoming-schedule">' +
        '<div class="upcoming-schedule-head"><span>KOMMANDE MATCHER</span><small>SCHEMA</small></div>' +
        '<div class="drawer-card"><strong>Inga kommande matcher</strong><span>Det finns inga framtida matcher importerade för laget just nu.</span></div>' +
      '</section>';
    }

    return '<section class="upcoming-schedule">' +
      '<div class="upcoming-schedule-head"><span>KOMMANDE MATCHER</span><small>NÄSTA ' + games.length + '</small></div>' +
      '<div class="upcoming-game-list">' +
        games.map((game, index) => {
          const home = state.teamById.get(game.home_team_id);
          const away = state.teamById.get(game.away_team_id);
          const active = game.id === state.nextGame?.id;
          const live = game.status === "live";
          const tag = live ? "LIVE" : active ? "NÄSTA" : "";
          return '<article class="upcoming-game' + (active ? ' active' : '') + (live ? ' live' : '') + '">' +
            '<div class="upcoming-game-time"><strong>' + esc(swedishDate(game.scheduled_start)) + '</strong>' +
              '<span>' + esc(game.venue_name || "Arena ej angiven") + '</span></div>' +
            '<div class="upcoming-game-teams">' +
              '<span>' + esc(home?.canonical_name || "Hemmalag") + '</span>' +
              '<b>–</b>' +
              '<span>' + esc(away?.canonical_name || "Bortalag") + '</span>' +
            '</div>' +
            (tag ? '<em>' + tag + '</em>' : '<em aria-hidden="true"></em>') +
          '</article>';
        }).join("") +
      '</div>' +
    '</section>';
  }

  function renderDataHealth() {
    const lineupStatus=state.nextLineup
      ? ["ready","OFFICIELL"]
      : state.fallbackLineups.size ? ["warn","SENASTE"] : ["waiting","VÄNTAR"];
    const statsTotal=state.seasonPlayerStats.length+state.seasonGoalieStats.length+state.seasonSpecialTeams.length;
    const statsStatus=statsTotal
      ? (state.loadWarnings.some((item)=>/statistik|special/i.test(item.scope)) ? ["warn","DELVIS"] : ["ready","REDO"])
      : ["waiting","VÄNTAR"];
    const liveStatus=state.nextGame?.status==="live"
      ? (state.currentEvents.length ? ["ready","LIVE"] : ["warn","STARTAD"])
      : (state.nextGame?.source_event_game_id ? ["ready","FÖRBEREDD"] : ["waiting","VÄNTAR"]);
    const items=[
      ["MATCH",state.nextGame?["ready","REDO"]:["waiting","VÄNTAR"]],
      ["KEDJOR",lineupStatus],
      ["STATISTIK",statsStatus],
      ["LIVE",liveStatus]
    ];
    const warning=state.loadWarnings.length
      ? '<article class="drawer-card data-warning"><strong>Delvis data</strong><span>'+esc(state.loadWarnings.length)+' sekundär'+(state.loadWarnings.length===1?" datakälla svarade inte.":"a datakällor svarade inte.")+' Resten av cockpiten visas som vanligt.</span></article>'
      : "";
    return '<div class="data-health">'+items.map(([label,status])=>
      '<div class="'+status[0]+'"><span>'+esc(label)+'</span><strong>'+esc(status[1])+'</strong></div>'
    ).join("")+'</div>'+warning;
  }

  function renderMatchOverview() {
    const cards = panels.match.cards || [];
    const first = cards.slice(0, 1).map(([title, text]) =>
      '<article class="drawer-card"><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></article>'
    ).join("");
    const rest = cards.slice(1).map(([title, text]) =>
      '<article class="drawer-card"><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></article>'
    ).join("");
    return first + renderDataHealth() + renderUpcomingGames() + rest;
  }

  function renderDrawer(key) {
    const data = panels[key] || panels.match;
    drawerKicker.textContent = data.kicker;
    drawerTitle.textContent = data.title;

    const statsWide = key === "players" || key === "goalies";
    const fullWork = key === "lines" || key === "players";
    const medium = key === "goalies" || key === "story" || key === "h2h" || key === "studio" || key === "notes" || key === "ai" || key === "account";
    drawer.classList.remove("wide","medium","full-work");
    drawer.classList.toggle("stats-wide", statsWide);
    drawer.classList.toggle("full-work", fullWork);
    drawer.classList.toggle("medium", medium);
    if (key === "lines") {
      drawerBody.innerHTML = renderLineups();
    } else if (key === "players") {
      drawerBody.innerHTML =
        '<article class="drawer-card stats-intro"><strong>'+(state.nextGame?.status==="live"?"LIVE + säsong + senaste 5":"Säsong + senaste 5")+'</strong><span>'+(state.nextGame?.status==="live"?"LIVE-raden kommer från pågående Player Summary när Swehockey publicerar den. ":"")+'Säsongstotalen kommer direkt från Swehockey. S5 räknas från de fem senaste Player Summary-rapporterna som finns importerade.</span></article>' +
        '<div class="stats-team-grid players-grid">' + renderPlayerStats() + '</div>';
    } else if (key === "goalies") {
      drawerBody.innerHTML =
        '<article class="drawer-card stats-intro"><strong>'+(state.nextGame?.status==="live"?"LIVE + säsong + senaste 5":"Säsong + senaste 5")+'</strong><span>'+(state.nextGame?.status==="live"?"LIVE-raden uppdateras från pågående Player Summary när den finns. ":"")+'SV%, GAA och record kommer från Swehockeys säsongstabell. S5 räknas från matchrapporterna.</span></article>' +
        '<div class="stats-team-grid goalies-grid">' + renderGoalieStats() + '</div>';
    } else if (key === "special") {
      drawerBody.innerHTML = renderSpecialTeams();
    } else if (key === "story") {
      drawerBody.innerHTML = renderStorylines();
    } else if (key === "h2h") {
      drawerBody.innerHTML = renderH2H();
    } else if (key === "studio") {
      drawerBody.innerHTML = renderStudio();
    } else if (key === "notes") {
      drawerBody.innerHTML = renderNotes();
      bindNotesUi();
    } else if (key === "ai") {
      drawerBody.innerHTML = renderAi();
      bindAiUi();
    } else if (key === "account") {
      drawerBody.innerHTML = renderAccount();
      bindAccountUi();
    } else if (key === "match") {
      drawerBody.innerHTML = renderMatchOverview();
    } else {
      drawerBody.innerHTML = data.cards.map(([title, text]) =>
        '<article class="drawer-card"><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></article>'
      ).join("");
    }
    setDrawerOpen(true);
  }

  async function loadForm(teamId) {
    const { data, error } = await client.from("games")
      .select("id,scheduled_start,home_team_id,away_team_id,home_score,away_score,venue_name,status")
      .eq("competition_id", state.competition.id)
      .eq("status", "final")
      .or("home_team_id.eq." + teamId + ",away_team_id.eq." + teamId)
      .order("scheduled_start", { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  }

  async function loadBaseData() {
    if(!client) throw new Error("Supabase-klienten kunde inte startas.");

    const {data:competitions,error:compError}=await client.from("competitions")
      .select("id,name,season_label,group_name,updated_at,source_competition_id")
      .eq("source","swehockey");
    if(compError) throw compError;
    state.competitionById=new Map((competitions||[]).map((row)=>[row.id,row]));

    const leagueCompetitions=(competitions||[])
      .filter((row)=>["21043","21044"].includes(row.source_competition_id));
    if(leagueCompetitions.length<2) throw new Error("Båda Hockeyettan-serierna är inte importerade ännu.");

    const competitionIds=leagueCompetitions.map((row)=>row.id);
    const [{data:teams,error:teamError},{data:rosters,error:rosterError}]=await Promise.all([
      client.from("teams").select("id,canonical_name,short_name"),
      client.from("team_rosters").select("team_id,competition_id")
        .in("competition_id",competitionIds).eq("is_active",true)
    ]);
    if(teamError) throw teamError;
    if(rosterError) throw rosterError;

    state.teams=teams||[];
    state.teamById=new Map(state.teams.map((team)=>[team.id,team]));
    state.teamCompetitionByTeam=new Map();
    for(const row of rosters||[]){
      const competition=state.competitionById.get(row.competition_id);
      if(competition&&!state.teamCompetitionByTeam.has(row.team_id)){
        state.teamCompetitionByTeam.set(row.team_id,competition);
      }
    }

    state.competitionTeams=state.teams.filter((team)=>state.teamCompetitionByTeam.has(team.id));
    state.competition=null;

    state.selectedTeamSlug=requestedTeamSlug();
    if(!state.selectedTeamSlug){
      try{
        const pending=localStorage.getItem(AUTH_PENDING_TEAM_KEY)||"";
        if(pending){
          state.selectedTeamSlug=pending;
          const url=new URL(window.location.href);
          url.searchParams.set("team",pending);
          history.replaceState(null,"",url.pathname+url.search+url.hash);
        }
      }catch{}
    }
    state.selectedTeam=state.selectedTeamSlug
      ? state.competitionTeams.find((team)=>teamSlug(team.canonical_name)===state.selectedTeamSlug)||null
      : null;
    state.selectedCompetition=state.selectedTeam
      ? state.teamCompetitionByTeam.get(state.selectedTeam.id)||null
      : null;
    state.competition=state.selectedCompetition;

    if(state.selectedTeamSlug&&!state.selectedTeam){
      state.selectedTeamSlug="";
      state.selectedCompetition=null;
      history.replaceState(null,"",window.location.pathname);
    }
  }

  async function routeApp() {
    updateAuthButton();

    if(!state.selectedTeam){
      renderLeagueHome();
      return;
    }

    if(!canAccessTeam(state.selectedTeam.id)){
      renderTeamLock();
      return;
    }

    state.access=effectiveAccessForTeam(state.selectedTeam.id);
    if(!state.teamDataLoaded){
      if(state.teamLoading) return;
      showTeamLoading();
      try{
        await loadData();
      }catch(error){
        console.error("Team cockpit load failed",error);
        showTeamLoadError(error);
      }
      return;
    }

    showCockpit();
    render();
  }

  async function loadData() {
    if (!client) throw new Error("Supabase-klienten kunde inte startas.");
    state.loadWarnings=[];
    state.teamLoadError="";
    state.lastLiveRefreshError="";
    state.notes=loadLocalNotes();

    const competition=state.selectedCompetition;
    if(!competition) throw new Error("Serie saknas för valt Hockeyettan-lag.");
    state.competition=competition;

    const { data: teams, error: teamError } = await client.from("teams")
      .select("id,canonical_name,short_name");
    if (teamError) throw teamError;
    state.teams = teams || [];
    state.teamById = new Map(state.teams.map((team) => [team.id, team]));
    state.focusTeam = state.selectedTeam
      ? state.teamById.get(state.selectedTeam.id)
      : null;
    if (!state.focusTeam) throw new Error("Valt lag saknas i importerad data.");

    const activeWindowStart = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const { data: nextGames, error: nextError } = await client.from("games")
      .select("id,scheduled_start,home_team_id,away_team_id,venue_name,status,period,clock_display,home_score,away_score,source_game_id,source_event_game_id,game_number")
      .eq("competition_id", competition.id)
      .neq("status", "final")
      .or("home_team_id.eq." + state.focusTeam.id + ",away_team_id.eq." + state.focusTeam.id)
      .gte("scheduled_start", activeWindowStart)
      .order("scheduled_start", { ascending: true })
      .limit(5);
    if (nextError) throw nextError;
    state.upcomingGames = nextGames || [];
    state.nextGame = state.upcomingGames[0] || null;
    if (!state.nextGame) throw new Error("Ingen kommande match hittades för "+state.focusTeam.canonical_name+".");

    const opponentId = state.nextGame.home_team_id === state.focusTeam.id
      ? state.nextGame.away_team_id
      : state.nextGame.home_team_id;
    state.opponent = state.teamById.get(opponentId);
    if (!state.opponent) throw new Error("Motståndarlaget saknas.");

    const { data: focusHistory, error: h2hError } = await client.from("games")
      .select("id,competition_id,scheduled_start,home_team_id,away_team_id,home_score,away_score,venue_name,status,source_event_game_id")
      .eq("status","final")
      .or("home_team_id.eq."+state.focusTeam.id+",away_team_id.eq."+state.focusTeam.id)
      .order("scheduled_start",{ascending:false})
      .limit(150);
    if (h2hError) recordLoadWarning("H2H-historik",h2hError);
    state.h2hGames = (h2hError ? [] : (focusHistory || []))
      .filter((game) =>
        (game.home_team_id === state.focusTeam.id && game.away_team_id === state.opponent.id) ||
        (game.home_team_id === state.opponent.id && game.away_team_id === state.focusTeam.id)
      )
      .sort((a,b)=>new Date(b.scheduled_start).getTime()-new Date(a.scheduled_start).getTime());

    const { data: latestSnapshot, error: snapError } = await client.from("standings_snapshots")
      .select("id,fetched_at")
      .eq("competition_id", competition.id)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapError) recordLoadWarning("Tabell",snapError);

    state.standings=[];
    state.standingsByTeam=new Map();
    if (!snapError && latestSnapshot) {
      const { data: standings, error: standingsError } = await client.from("standings_snapshot_rows")
        .select("team_id,rank,games_played,wins,ties,losses,goals_for,goals_against,goal_diff,points")
        .eq("snapshot_id", latestSnapshot.id)
        .order("rank", { ascending: true });
      if (standingsError) {
        recordLoadWarning("Tabellrader",standingsError);
      } else {
        state.standings = standings || [];
        state.standingsByTeam = new Map(state.standings.map((row) => [row.team_id, row]));
      }
    }

    const rosterResult = await client.from("team_rosters")
      .select("team_id,player_id,jersey_number,position,source_name")
      .eq("competition_id", competition.id)
      .in("team_id", [state.focusTeam.id, state.opponent.id])
      .eq("is_active", true)
      .order("jersey_number", { ascending: true });
    const rosterRows=optionalData(rosterResult,"Trupper",[]);

    const playerIds = [...new Set(rosterRows.map((row) => row.player_id).filter(Boolean))];
    let playerMap = new Map();
    if (playerIds.length) {
      const { data: players, error: playerError } = await client.from("players")
        .select("id,display_name,birth_date,nationality_code,shoots_catches,primary_position,height_cm,weight_kg,youth_club")
        .in("id", playerIds);
      if (playerError) {
        recordLoadWarning("Spelarprofiler",playerError);
      } else {
        playerMap = new Map((players || []).map((player) => [player.id, player]));
      }
    }
    state.playerProfiles = playerMap;
    state.roster = (rosterRows || [])
      .filter((row) => row.team_id === state.focusTeam.id)
      .map((row) => ({ ...row, player: playerMap.get(row.player_id) || null }));

    const [focusForm, opponentForm] = await Promise.all([
      optionalLoad("Form · "+state.focusTeam.canonical_name,()=>loadForm(state.focusTeam.id),[]),
      optionalLoad("Form · "+state.opponent.canonical_name,()=>loadForm(state.opponent.id),[])
    ]);
    state.focusForm = focusForm;
    state.opponentForm = opponentForm;
    state.latestFocusGame = focusForm[0] || null;

    const [nextLineup, focusFallbackLineup, opponentFallbackLineup] = await Promise.all([
      optionalLoad("Kedjor · nästa match",()=>loadLineup(state.nextGame),null),
      optionalLoad("Kedjor · "+state.focusTeam.canonical_name,()=>loadLineup(state.focusForm[0]),null),
      optionalLoad("Kedjor · "+state.opponent.canonical_name,()=>loadLineup(state.opponentForm[0]),null)
    ]);
    state.nextLineup = nextLineup;
    state.fallbackLineups = new Map();
    if (focusFallbackLineup) state.fallbackLineups.set(state.focusTeam.id, focusFallbackLineup);
    if (opponentFallbackLineup) state.fallbackLineups.set(state.opponent.id, opponentFallbackLineup);

    const focusTeamIds = [state.focusTeam.id, state.opponent.id];
    const recentGameIds = [...new Set([...state.focusForm, ...state.opponentForm].map((game) => game.id))];

    const statGameIds = [...new Set([...recentGameIds, state.nextGame.id])];

    const [seasonPlayerResult, seasonGoalieResult, specialSeasonResult, teamGameStatsResult] = await Promise.all([
      client.from("player_season_stats")
        .select("team_id,player_id,source_name,jersey_number,position,games_played,goals,assists,points,pim,plus_minus,game_winning_goals,power_play_goals,shorthanded_goals,shots,shooting_pct,faceoff_wins,faceoff_losses,faceoff_total,faceoff_pct")
        .eq("competition_id", competition.id)
        .in("team_id", focusTeamIds),
      client.from("goalie_season_stats")
        .select("team_id,player_id,source_name,jersey_number,games_played,minutes_played_seconds,goals_against,saves,shots_against,save_pct,gaa,shutouts,wins,losses")
        .eq("competition_id", competition.id)
        .in("team_id", focusTeamIds),
      client.from("team_special_teams_stats")
        .select("team_id,games_played,pp_rank,pp_opportunities,pp_goals,pp_pct,pp_seconds,pk_rank,pk_opportunities,pk_goals_against,pk_pct,pk_seconds,shorthanded_goals_for,shorthanded_goals_against")
        .eq("competition_id", competition.id)
        .in("team_id", focusTeamIds),
      client.from("team_game_stats")
        .select("game_id,team_id,goals,shots,saves,pim,period_stats,power_play_opportunities,power_play_goals,power_play_pct,power_play_seconds,penalty_kill_opportunities,penalty_kill_goals_against,penalty_kill_pct")
        .in("game_id", statGameIds)
        .in("team_id", focusTeamIds)
    ]);
    state.seasonPlayerStats = optionalData(seasonPlayerResult,"Spelarstatistik",[]);
    state.seasonGoalieStats = optionalData(seasonGoalieResult,"Målvaktsstatistik",[]);
    state.seasonSpecialTeams = optionalData(specialSeasonResult,"Special teams",[]);
    state.teamGameStats = optionalData(teamGameStatsResult,"Matchstatistik",[]);

    if (recentGameIds.length) {
      const [recentPlayerResult, recentGoalieResult] = await Promise.all([
        client.from("player_game_stats")
          .select("game_id,team_id,player_id,source_name,jersey_number,position,goals,assists,points,plus_minus,pim,shots,faceoff_wins,faceoff_losses,faceoff_pct")
          .in("game_id", recentGameIds),
        client.from("goalie_game_stats")
          .select("game_id,team_id,player_id,source_name,jersey_number,shots_against,goals_against,saves,save_pct,minutes_played_seconds,gaa")
          .in("game_id", recentGameIds)
      ]);
      state.recentPlayerStats = optionalData(recentPlayerResult,"Senaste spelarstatistik",[]);
      state.recentGoalieStats = optionalData(recentGoalieResult,"Senaste målvaktsstatistik",[]);
    } else {
      state.recentPlayerStats = [];
      state.recentGoalieStats = [];
    }

    const [currentPlayerResult,currentGoalieResult]=await Promise.all([
      client.from("player_game_stats")
        .select("game_id,team_id,player_id,source_name,jersey_number,position,goals,assists,points,plus_minus,pim,shots,faceoff_wins,faceoff_losses,faceoff_pct")
        .eq("game_id",state.nextGame.id),
      client.from("goalie_game_stats")
        .select("game_id,team_id,player_id,source_name,jersey_number,shots_against,goals_against,saves,save_pct,minutes_played_seconds,gaa")
        .eq("game_id",state.nextGame.id)
    ]);
    state.currentPlayerStats=optionalData(currentPlayerResult,"Aktuell spelarstatistik",[]);
    state.currentGoalieStats=optionalData(currentGoalieResult,"Aktuell målvaktsstatistik",[]);

    if (state.latestFocusGame) {
      state.latestPlayerStats = state.recentPlayerStats.filter((row) => row.game_id === state.latestFocusGame.id);
      state.latestGoalieStats = state.recentGoalieStats.filter((row) => row.game_id === state.latestFocusGame.id);
    }

    if (state.latestFocusGame) {
      const { data: events, error: eventsError } = await client.from("game_events")
        .select("id,period,clock_display,event_seconds,event_type,team_id,strength,home_score,away_score,description")
        .eq("game_id", state.latestFocusGame.id)
        .eq("is_active", true)
        .order("event_seconds", { ascending: false })
        .order("ordinal", { ascending: true })
        .limit(100);
      if (eventsError) {
        recordLoadWarning("Senaste matchhändelser",eventsError);
        state.latestEvents=[];
      } else {
        state.latestEvents = events || [];
      }
    } else {
      state.latestEvents=[];
    }

    state.currentEvents = [];
    if (state.nextGame?.status === "live") {
      const { data: currentEvents, error: currentEventsError } = await client.from("game_events")
        .select("id,period,clock_display,event_seconds,event_type,team_id,strength,home_score,away_score,description")
        .eq("game_id", state.nextGame.id)
        .eq("is_active", true)
        .order("event_seconds", { ascending: false })
        .order("ordinal", { ascending: true })
        .limit(100);
      if (currentEventsError) {
        recordLoadWarning("Live-händelser",currentEventsError);
      } else {
        state.currentEvents = currentEvents || [];
      }
    }

    if (state.latestFocusGame) {
      const { data: teamStats, error: teamStatsError } = await client.from("team_game_stats")
        .select("team_id,goals,shots,saves,save_pct,pim,power_play_pct,power_play_seconds,period_stats")
        .eq("game_id", state.latestFocusGame.id);
      if (teamStatsError) {
        recordLoadWarning("Senaste matchstatistik",teamStatsError);
        state.latestTeamStats=new Map();
      } else {
        state.latestTeamStats = new Map((teamStats || []).map((row) => [row.team_id, row]));
      }
    } else {
      state.latestTeamStats=new Map();
    }

    panels.live.cards = [
      ["Matchcollector", state.latestEvents.length + " händelser lästa från senaste "+state.focusTeam.canonical_name+"-matchen."],
      ["Spelardata", state.seasonPlayerStats.filter((row) => row.position !== "GK").length + " säsongsrader · " + state.recentPlayerStats.length + " S5-matchrader."],
      ["Special teams", state.seasonSpecialTeams.length + " säsongsrader · " + state.teamGameStats.filter((row) => row.power_play_opportunities != null).length + " matchrader."],
      ["Nästa match-ID", state.nextGame.source_event_game_id
        ? "Live-/rapport-ID: " + state.nextGame.source_event_game_id
        : "Schema-ID " + (state.nextGame.game_number || "saknas") + " är känt. Live-ID väntas senare."],
      ["Datakvalitet", state.loadWarnings.length
        ? state.loadWarnings.length + " sekundär" + (state.loadWarnings.length===1?" datakälla":"a datakällor") + " saknas just nu. Övrig data visas."
        : "Alla efterfrågade datalager svarade."]
    ];

    state.teamDataLoaded=true;
    state.teamLoading=false;
    showCockpit();
    render();
  }

  function render() {
    const game = state.nextGame;
    const home = state.teamById.get(game.home_team_id);
    const away = state.teamById.get(game.away_team_id);

    document.getElementById("competitionLabel").textContent =
      state.competition.name + " · " + state.competition.season_label;
    document.getElementById("venueLabel").textContent = game.venue_name || "Arena ej angiven";
    document.getElementById("homeName").textContent = home?.canonical_name || "Hemmalag";
    document.getElementById("awayName").textContent = away?.canonical_name || "Bortalag";
    document.querySelector(".team.home .team-badge").innerHTML = teamLogoMarkup(home?.canonical_name,"score-team-logo");
    document.querySelector(".team.away .team-badge").innerHTML = teamLogoMarkup(away?.canonical_name,"score-team-logo");
    const isLive = game.status === "live";
    const livePill = document.querySelector(".live-pill");
    livePill.textContent = isLive ? "LIVE" : "NÄSTA MATCH";
    livePill.classList.toggle("is-live", isLive);
    document.getElementById("gameState").textContent = isLive
      ? "P" + (game.period || "–") + " · " + (game.clock_display || "LIVE")
      : swedishDate(game.scheduled_start);
    document.getElementById("homeScore").textContent = isLive ? game.home_score : "–";
    document.getElementById("awayScore").textContent = isLive ? game.away_score : "–";

    document.getElementById("homeFormLabel").textContent = state.focusTeam.canonical_name;
    document.getElementById("awayFormLabel").textContent = state.opponent.canonical_name;
    renderForm("homeFormDots", state.focusForm, state.focusTeam.id);
    renderForm("awayFormDots", state.opponentForm, state.opponent.id);

    renderStandingsQuick();
    renderMatchStats();
    renderLatestGame();
    renderFacts();

    const focusStanding = state.standingsByTeam.get(state.focusTeam.id);
    const oppStanding = state.standingsByTeam.get(state.opponent.id);
    panels.match.cards = [
      ["Nästa match", swedishDate(game.scheduled_start) + " · " + (game.venue_name || "Arena ej angiven")],
      ["Tabell", state.focusTeam.canonical_name + " #" + (focusStanding?.rank ?? "–") + " (" + (focusStanding?.points ?? "–") + " p) · " +
        state.opponent.canonical_name + " #" + (oppStanding?.rank ?? "–") + " (" + (oppStanding?.points ?? "–") + " p)"],
      ["Kedjor", state.nextLineup
        ? "Officiell lineup för nästa match är importerad."
        : "Visar senaste kända kedjor tills nästa lineup publiceras."],
      ["H2H", state.h2hGames.length
        ? state.h2hGames.length + " tidigare möten importerade."
        : "Inga tidigare möten importerade ännu."],
      ["Notes", currentEditorialNotes().length + " relevanta anteckningar · " +
        currentEditorialNotes().filter((note)=>note.pinned).length + " pinnade till STORY."],
      ["AI", state.aiBriefSource === "server"
        ? "Server-AI har genererat senaste talking points."
        : "Verifierad fallback är aktiv. Server-AI är förberedd."]
    ];

    renderSyncFreshness();
  }

  async function refreshActiveMatch() {
    if(!client||!state.teamDataLoaded||!state.selectedTeam||!canAccessTeam(state.selectedTeam.id)||!state.nextGame?.id||state.liveRefreshBusy) return;
    state.liveRefreshBusy=true;
    if(state.nextGame?.status==="live") setSyncStatus("working","Uppdaterar live-data…");
    try{
      const {data:game,error:gameError}=await client.from("games")
        .select("id,scheduled_start,home_team_id,away_team_id,venue_name,status,period,clock_display,home_score,away_score,source_game_id,source_event_game_id,game_number")
        .eq("id",state.nextGame.id)
        .single();
      if(gameError) throw gameError;

      const wasFinal=state.nextGame.status==="final";
      state.nextGame={...state.nextGame,...game};

      if(game.status==="final"&&!wasFinal){
        await loadData();
        return;
      }

      if(game.status==="live"){
        const [eventResult,statsResult,playerResult,goalieResult,lineupResult]=await Promise.all([
          client.from("game_events")
            .select("id,period,clock_display,event_seconds,event_type,team_id,strength,home_score,away_score,description")
            .eq("game_id",game.id)
            .eq("is_active",true)
            .order("event_seconds",{ascending:false})
            .order("ordinal",{ascending:true})
            .limit(100),
          client.from("team_game_stats")
            .select("game_id,team_id,goals,shots,saves,pim,period_stats,power_play_opportunities,power_play_goals,power_play_pct,power_play_seconds,penalty_kill_opportunities,penalty_kill_goals_against,penalty_kill_pct")
            .eq("game_id",game.id),
          client.from("player_game_stats")
            .select("game_id,team_id,player_id,source_name,jersey_number,position,goals,assists,points,plus_minus,pim,shots,faceoff_wins,faceoff_losses,faceoff_pct")
            .eq("game_id",game.id),
          client.from("goalie_game_stats")
            .select("game_id,team_id,player_id,source_name,jersey_number,shots_against,goals_against,saves,save_pct,minutes_played_seconds,gaa")
            .eq("game_id",game.id),
          game.source_event_game_id ? loadLineup(game) : Promise.resolve(null)
        ]);
        if(eventResult.error) throw eventResult.error;
        if(statsResult.error) throw statsResult.error;
        if(playerResult.error) throw playerResult.error;
        if(goalieResult.error) throw goalieResult.error;
        state.currentEvents=eventResult.data||[];
        if((playerResult.data||[]).length || !state.currentPlayerStats.length) state.currentPlayerStats=playerResult.data||[];
        if((goalieResult.data||[]).length || !state.currentGoalieStats.length) state.currentGoalieStats=goalieResult.data||[];
        if(lineupResult) state.nextLineup=lineupResult;
        state.teamGameStats=[
          ...state.teamGameStats.filter((row)=>row.game_id!==game.id),
          ...(statsResult.data||[])
        ];
      }else{
        state.currentEvents=[];
        state.currentPlayerStats=[];
        state.currentGoalieStats=[];
        if(game.source_event_game_id){
          const latestLineup=await loadLineup(game);
          if(latestLineup) state.nextLineup=latestLineup;
        }
      }

      state.lastLiveRefreshError="";
      state.lastLiveRefreshAt=new Date().toISOString();
      render();
      const activeButton=document.querySelector(".deck-key.active");
      const livePanels=new Set(["lines","players","goalies","special","live","studio"]);
      if(drawer.classList.contains("open")&&livePanels.has(activeButton?.dataset.panel||"")){
        renderDrawer(activeButton.dataset.panel);
      }
    }catch(error){
      console.error("Live refresh failed",error);
      state.lastLiveRefreshError=String(error?.message||error||"Okänt fel");
      if(state.nextGame?.status==="live") setSyncStatus("warn","Live-uppdatering misslyckades · senaste data visas");
    }finally{
      state.liveRefreshBusy=false;
      if(!state.lastLiveRefreshError) renderSyncFreshness();
    }
  }

  function showLoadError(error) {
    console.error("Commentator Cockpit data load failed", error);
    if(state.selectedTeam&&canAccessTeam(state.selectedTeam.id)){
      showTeamLoadError(error);
      return;
    }
    setRouteScreen("home");
    setSyncStatus("bad","Datakoppling misslyckades");
    const grid=document.getElementById("teamGrid");
    if(grid){
      grid.innerHTML='<div class="home-load-error"><strong>Kunde inte läsa Hockeyettan-data.</strong><span>'+esc(error?.message||error)+'</span><button type="button" id="homeRetryButton">FÖRSÖK IGEN</button></div>';
      document.getElementById("homeRetryButton")?.addEventListener("click",()=>window.location.reload());
    }
  }

  document.querySelectorAll(".deck-key").forEach((button) => {
    button.addEventListener("click", () => {
      const samePanel = button.classList.contains("active");
      const drawerOpen = drawer.classList.contains("open");
      if (samePanel && drawerOpen) {
        setDrawerOpen(false);
        return;
      }

      document.querySelectorAll(".deck-key").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderDrawer(button.dataset.panel);
    });
  });

  document.getElementById("closeDrawer").addEventListener("click", () => setDrawerOpen(false));

  document.addEventListener("click",(event)=>{
    if(!drawer.classList.contains("open")) return;
    const target=event.target instanceof Element ? event.target : null;
    if(!target) return;

    if(
      drawer.contains(target) ||
      target.closest(".deck-key") ||
      target.closest("#accountButton") ||
      target.closest("#lockLoginButton") ||
      target.closest("#aiButton")
    ) return;

    setDrawerOpen(false);
  });

  document.addEventListener("keydown",(event)=>{
    if(event.key==="Escape"&&drawer.classList.contains("open")) setDrawerOpen(false);
  });

  document.getElementById("accountButton")?.addEventListener("click",()=>{
    renderDrawer("account");
  });

  document.getElementById("themeToggle")?.addEventListener("click",()=>{
    setTheme(currentTheme()==="light"?"dark":"light");
  });
  updateThemeToggle();

  document.getElementById("homeButton")?.addEventListener("click",goHome);
  document.getElementById("lockHomeButton")?.addEventListener("click",goHome);
  document.getElementById("lockRetryButton")?.addEventListener("click",async()=>{
    if(state.teamLoading) return;
    state.teamDataLoaded=false;
    state.teamLoadError="";
    await routeApp();
  });
  document.getElementById("lockLoginButton")?.addEventListener("click",()=>{
    renderDrawer("account");
  });

  document.getElementById("aiButton")?.addEventListener("click",()=>{
    document.querySelectorAll(".deck-key").forEach((item)=>item.classList.remove("active"));
    document.querySelector('.deck-key[data-panel="ai"]')?.classList.add("active");
    renderDrawer("ai");
  });

  function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  updateClock();
  updateAuthButton();
  window.setInterval(updateClock, 1000);
  window.setInterval(refreshActiveMatch, 15000);
  window.setInterval(renderSyncFreshness, 60000);

  async function boot() {
    await loadBaseData();
    renderLeagueHome();
    try{
      await initAuth();
    }catch(error){
      console.error("Auth init failed",error);
      state.authMessage="Inloggningen kunde inte starta.";
      updateAuthButton();
      await routeApp();
    }
  }

  boot().catch(showLoadError);

  window.CommentatorCockpit = {
    config: cfg || null,
    state,
    reload: () => routeApp().catch(showLoadError),
    openPanel: renderDrawer,
    editorialNotes: () => currentEditorialNotes(),
    aiFallback: (question="") => localAiBrief(question),
    syncNotes: () => syncNotesWithCloud(),
    theme: () => currentTheme(),
    setTheme
  };
})();
