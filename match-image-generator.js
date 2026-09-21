(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const JERSEY_PRESETS = [
    { id:"carolus", name:"Carolus Icemen", code:"CI", primary:"#123b67", accent:"#c99a32", trim:"#f3f4f2", pattern:"shoulder" },
    { id:"shadow", name:"Shadow skulls", code:"SS", primary:"#090b0d", accent:"#c52e33", trim:"#f1f1ef", pattern:"diagonal" },
    { id:"vasteras", name:"Västerås IK", code:"VIK", primary:"#0b0c0d", accent:"#f0c400", trim:"#f3f3ef", pattern:"classic" },
    { id:"nordic", name:"Nordic Nosebleed", code:"NNB", primary:"#102b48", accent:"#b62d31", trim:"#eef2f4", pattern:"shoulder" },
    { id:"ssk", name:"SSK Academy", code:"SSK", primary:"#123f83", accent:"#f1c21b", trim:"#f4f4ef", pattern:"classic" }
  ];

  const POSITIONS = ["LW","C","RW","LD","RD","G"];
  const EMPTY_LINEUP = Object.freeze({LW:"",C:"",RW:"",LD:"",RD:"",G:""});
  const EMPTY_NUMBERS = Object.freeze({LW:"",C:"",RW:"",LD:"",RD:"",G:""});
  const access = {
    mode:String(window.SEH_MATCH_GRAPHICS_ACCESS?.mode || "admin").toLowerCase(),
    teamName:String(window.SEH_MATCH_GRAPHICS_ACCESS?.teamName || "").trim()
  };
  let teamDirectory = [...JERSEY_PRESETS];
  let rostersByTeamId = new Map();
  let playerKeysByName = new Map();
  let playerPortraits = new Map();
  let dataSource = "testdata";

  const FORMATS = {
    square:{ label:"Kvadrat · 1080×1080", width:1080, height:1080 },
    landscape:{ label:"Liggande · 1920×1080", width:1920, height:1080 },
    story:{ label:"Story · 1080×1920", width:1080, height:1920 }
  };

  const BACKGROUNDS = [
    {id:"outdoor",label:"Utomhus"},
    {id:"arena",label:"Arena"},
    {id:"smoke",label:"Rök"},
    {id:"ice",label:"Ice Texture"},
    {id:"sweden",label:"Sverige"}
  ];

  const state = {
    teamId:"carolus",
    opponentId:"vasteras",
    ownSide:"home",
    competition:"ECL 27 Winter",
    badge:"MATCHDAY",
    date:"2026-10-01",
    time:"20:00",
    format:"square",
    template:"classic",
    background:"arena",
    lineupStyle:"cards",
    streamPlatform:"none",
    streamChannel:"",
    playerName:"eSWAHN",
    playerNumber:"21",
    lineup:{...EMPTY_LINEUP},
    lineupNumbers:{...EMPTY_NUMBERS}
  };

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("sv-SE")
    .replace(/[^a-z0-9]+/g," ")
    .trim();

  const manifestEntries = Object.entries(window.SEH_TEAM_LOGO_FILES || {});
  const assetPrefix = location.pathname.includes("/lab/match-image-generator/") ? "../../" : "";
  const backgroundPrefix = location.pathname.includes("/lab/match-image-generator/")
    ? "backgrounds/"
    : "match-image-generator-backgrounds/";

  function backgroundUrl(id = state.background) {
    if (id === "outdoor") return assetPrefix + "assets/bgsommar.png";
    if (id === "arena") return assetPrefix + "assets/bg.jpg";
    if (id === "smoke") return backgroundPrefix + "smoke.svg";
    if (id === "ice") return backgroundPrefix + "ice-texture.svg";
    if (id === "sweden") return backgroundPrefix + "sweden.svg";
    return assetPrefix + "assets/bg.jpg";
  }

  function backgroundImageSvg(width,height,opacity=1) {
    return '<image href="' + esc(backgroundUrl()) + '" x="0" y="0" width="' + width + '" height="' + height + '" opacity="' + opacity + '" preserveAspectRatio="xMidYMid slice"/>';
  }

  function logoFileFor(teamName, explicitLogoName = "") {
    const candidates = [explicitLogoName,teamName].filter(Boolean);
    for (const candidate of candidates) {
      const key = (String(candidate).trim() + ".png").normalize("NFC").toLocaleLowerCase("sv-SE");
      const actual = window.SEH_TEAM_LOGO_FILES?.[key];
      if (actual) return actual;
    }
    return "";
  }

  function logoUrl(teamName) {
    const team = teamDirectory.find(item => normalize(item.name) === normalize(teamName)) || null;
    const path = String(team?.exactLogoUrl || "").trim();
    if (path) {
      if (/^https?:\/\//i.test(path)) return path;
      return assetPrefix + path.replace(/^\/+/, "");
    }
    const file = logoFileFor(teamName,team?.logoName || ""); 
    return file ? assetPrefix + "teamlogos/" + encodeURIComponent(file).replace(/%2F/gi,"/") : "";
  }

  function teamById(id) {
    return teamDirectory.find(team => team.id === id) || teamDirectory[0] || JERSEY_PRESETS[0];
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0,3)
      .map(part => part[0])
      .join("")
      .toUpperCase();
  }

  function fallbackPalette(index) {
    const patterns = ["shoulder","classic","minimal","diagonal"];
    return ["#0c0f12","#f4f4f1","#f4f4f1",patterns[Math.abs(index) % patterns.length]];
  }

  const teamPaletteCache = new Map();

  function rgbToHex(r,g,b) {
    const hex = value => Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,"0");
    return "#" + hex(r) + hex(g) + hex(b);
  }

  function colorDistance(a,b) {
    return Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b);
  }

  function colorStats(r,g,b,weight=1) {
    const max = Math.max(r,g,b);
    const min = Math.min(r,g,b);
    const saturation = max ? (max-min)/max : 0;
    const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return {r,g,b,weight,saturation,luminance};
  }

  function blackWhiteFallback(team) {
    team.primary = "#0c0f12";
    team.accent = "#f4f4f1";
    team.trim = "#f4f4f1";
    team.paletteSource = "black-white-fallback";
    return team;
  }

  function isPresetTeam(team) {
    return JERSEY_PRESETS.some(preset => normalize(preset.name) === normalize(team?.name));
  }

  async function extractLogoPalette(url) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const size = 56;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d",{willReadFrequently:true});
          if (!ctx) return resolve(null);
          ctx.clearRect(0,0,size,size);
          ctx.drawImage(image,0,0,size,size);
          const pixels = ctx.getImageData(0,0,size,size).data;
          const buckets = new Map();

          for (let i=0;i<pixels.length;i+=4) {
            const alpha = pixels[i+3];
            if (alpha < 72) continue;
            const r = Math.min(255,Math.round(pixels[i]/32)*32);
            const g = Math.min(255,Math.round(pixels[i+1]/32)*32);
            const b = Math.min(255,Math.round(pixels[i+2]/32)*32);
            const stats = colorStats(r,g,b,alpha/255);
            if (stats.luminance > .95 && stats.saturation < .10) continue;
            const key = r + "," + g + "," + b;
            const current = buckets.get(key) || {r,g,b,weight:0};
            current.weight += alpha/255;
            buckets.set(key,current);
          }

          const colors = [...buckets.values()]
            .map(item => colorStats(item.r,item.g,item.b,item.weight))
            .sort((a,b) => b.weight-a.weight);
          if (!colors.length) return resolve(null);

          const topWeight = colors[0].weight || 1;
          const darkCandidates = colors
            .filter(color => color.luminance <= .56 && color.weight >= topWeight * .08)
            .sort((a,b) =>
              (b.weight*(1+b.saturation*.28)) -
              (a.weight*(1+a.saturation*.28))
            );
          const colorfulCandidates = colors
            .filter(color => color.saturation >= .20 && color.luminance <= .86)
            .sort((a,b) =>
              (b.weight*(1+b.saturation*.70)) -
              (a.weight*(1+a.saturation*.70))
            );

          const primary = darkCandidates[0] || colorfulCandidates[0] || colors[0];
          const accent = colors
            .filter(color =>
              colorDistance(color,primary) >= 88 &&
              (color.saturation >= .20 || color.luminance >= .62)
            )
            .sort((a,b) =>
              (b.weight*(.7+b.saturation*1.5+b.luminance*.25)) -
              (a.weight*(.7+a.saturation*1.5+a.luminance*.25))
            )[0];

          const trim = primary.luminance < .58 ? "#f4f4f1" : "#101214";
          resolve({
            primary:rgbToHex(primary.r,primary.g,primary.b),
            accent:accent ? rgbToHex(accent.r,accent.g,accent.b) : trim,
            trim
          });
        } catch (error) {
          console.warn("[Jersey Lab] kunde inte läsa logofärger",error);
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function ensureTeamPalette(team) {
    if (!team || isPresetTeam(team)) return team;
    const exactUrl = logoUrl(team.name);
    if (!exactUrl) return blackWhiteFallback(team);

    const cacheKey = exactUrl;
    if (teamPaletteCache.has(cacheKey)) {
      Object.assign(team,teamPaletteCache.get(cacheKey));
      team.paletteSource = "logo-cache";
      return team;
    }

    const palette = await extractLogoPalette(exactUrl);
    if (!palette) return blackWhiteFallback(team);
    teamPaletteCache.set(cacheKey,palette);
    Object.assign(team,palette);
    team.paletteSource = "logo";
    return team;
  }

  async function hydrateTeamPalettes(teams = teamDirectory) {
    await Promise.all((Array.isArray(teams) ? teams : []).map(team => ensureTeamPalette(team)));
    return teams;
  }

  function configValues() {
    const cfg = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
    return {
      url:String(cfg.supabaseUrl || cfg.SUPABASE_URL || "").replace(/\/+$/,""),
      key:String(cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || "")
    };
  }

  async function getPublicRows(view, query) {
    const {url,key} = configValues();
    if (!url || !key) throw new Error("Supabase-konfiguration saknas");
    const headers = {apikey:key,Accept:"application/json"};
    if (/^eyJ/i.test(key)) headers.Authorization = "Bearer " + key;
    const response = await fetch(url + "/rest/v1/" + view + "?" + query,{headers,cache:"no-store"});
    if (!response.ok) throw new Error(view + ": HTTP " + response.status);
    return response.json();
  }

  async function getRpcRows(name, payload) {
    const {url,key} = configValues();
    if (!url || !key) throw new Error("Supabase-konfiguration saknas");
    const headers = {apikey:key,Accept:"application/json","Content-Type":"application/json"};
    if (/^eyJ/i.test(key)) headers.Authorization = "Bearer " + key;
    const response = await fetch(url + "/rest/v1/rpc/" + name,{
      method:"POST",
      headers,
      cache:"no-store",
      body:JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(name + ": HTTP " + response.status);
    return response.json();
  }

  function sportsGamerId(value) {
    return String(value || "").match(/\/players\/(\d+)/i)?.[1] || "";
  }

  function defaultPlayerImageUrl() {
    return assetPrefix + "players/1DEFAULTBILDID.png";
  }

  function portraitUrlFromRow(row) {
    const id = sportsGamerId(row?.sports_gamer_player_url);
    if (id && Array.isArray(window.SEH_PLAYER_IMAGE_FILES) && window.SEH_PLAYER_IMAGE_FILES.includes(id + ".png")) {
      return assetPrefix + "players/" + encodeURIComponent(id + ".png");
    }
    const raw = String(row?.player_image || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : defaultPlayerImageUrl();
  }

  function portraitUrlForPlayer(name) {
    return playerPortraits.get(normalize(name)) || defaultPlayerImageUrl();
  }

  async function hydratePlayerPortraits(teamId) {
    const names = rosterFor(teamId).filter(Boolean);
    const missing = names.filter(name => !playerPortraits.has(normalize(name)));
    if (!missing.length) return;

    await Promise.all(missing.map(async name => {
      const normalized = normalize(name);
      try {
        const playerKey = playerKeysByName.get(normalized) || "";
        const filter = playerKey
          ? "player_key=eq." + encodeURIComponent(playerKey)
          : "display_gamertag=eq." + encodeURIComponent(name);
        const rows = await getPublicRows(
          "app_player_directory_cache",
          "select=player_key,display_gamertag,player_image,sports_gamer_player_url&" + filter + "&limit=1"
        );
        const row = Array.isArray(rows) ? rows[0] : null;
        playerPortraits.set(normalized,portraitUrlFromRow(row));
      } catch (error) {
        console.warn("[Match Graphics] kunde inte hämta spelarporträtt för",name,error);
        playerPortraits.set(normalized,defaultPlayerImageUrl());
      }
    }));
  }

  function buildDynamicTeam(row,index) {
    const preset = JERSEY_PRESETS.find(team => normalize(team.name) === normalize(row.name));
    if (preset) {
      return {
        ...preset,
        projectId:Number(row.id) || null,
        teamId:Number(row.source_team_id) || null,
        division:String(row.division || ""),
        logoName:String(row.logo_name || "")
      };
    }
    const [primary,accent,trim,pattern] = fallbackPalette(index);
    return {
      id:"build-" + String(row.id || index + 1),
      name:String(row.name || "Okänt lag"),
      code:initials(row.name),
      primary,accent,trim,pattern,
      projectId:Number(row.id) || null,
      teamId:Number(row.source_team_id) || null,
      division:String(row.division || ""),
      logoName:String(row.logo_name || ""),
      genericJersey:true
    };
  }

  function rosterFor(teamId) {
    return rostersByTeamId.get(teamId) || [];
  }

  function rosterPlayerCount() {
    return [...rostersByTeamId.values()].reduce((sum,list) => sum + list.length,0);
  }

  function applyDirectRosterRows(rows) {
    const byName = new Map(teamDirectory.map(team => [normalize(team.name),team]));
    if (!(rostersByTeamId instanceof Map) || !rostersByTeamId.size) {
      rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));
    }
    for (const row of Array.isArray(rows) ? rows : []) {
      const team = byName.get(normalize(row.team_name));
      const player = String(row.display_gamertag || "").trim();
      if (!team || !player) continue;
      const list = rostersByTeamId.get(team.id) || [];
      if (!list.some(name => normalize(name) === normalize(player))) list.push(player);
      rostersByTeamId.set(team.id,list);
      const key = String(row.player_key || "").trim();
      if (key) playerKeysByName.set(normalize(player),key);
    }
    for (const list of rostersByTeamId.values()) {
      list.sort((a,b) => a.localeCompare(b,"sv",{sensitivity:"base"}));
    }
    return rosterPlayerCount();
  }

  async function refreshCurrentRostersFromView() {
    const rows = await getPublicRows("v_ecl27_current_roster_public","select=player_key,display_gamertag,team_project_id,team_name,division,team_id,logo_name&order=team_name.asc,display_gamertag.asc");
    if (!Array.isArray(rows) || !rows.length) return 0;
    rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));
    playerKeysByName = new Map();
    return applyDirectRosterRows(rows);
  }

  function setDefaultLineup() {
    const players = rosterFor(state.teamId);
    const next = {...EMPTY_LINEUP};
    POSITIONS.forEach((pos,index) => {
      next[pos] = players[index] || "";
    });
    state.lineup = next;
    state.lineupNumbers = {...EMPTY_NUMBERS};
  }

  function applyAccessMode() {
    const select = $("#teamSelect");
    const badge = $("#accessBadge");
    if (access.mode === "captain" && access.teamName) {
      const locked = teamDirectory.find(team => normalize(team.name) === normalize(access.teamName));
      if (locked) {
        state.teamId = locked.id;
        if (state.opponentId === locked.id) {
          state.opponentId = teamDirectory.find(team => team.id !== locked.id)?.id || locked.id;
        }
        if (select) select.disabled = true;
        if (badge) badge.textContent = "KAPTEN · " + locked.name;
      }
    } else {
      if (select) select.disabled = false;
      if (badge) badge.textContent = "ADMIN · ALLA LAG";
    }
  }

  async function sharedEcl27Roster() {
    const current = () => {
      const model = window.SEH_ECL27_CURRENT_ROSTER_V1;
      return model && Array.isArray(model.teams) && model.teams.length ? model : null;
    };
    if (current()) return current();

    try {
      if (window.SEH_ECL27_DATA_READY && typeof window.SEH_ECL27_DATA_READY.then === "function") {
        await window.SEH_ECL27_DATA_READY;
      }
    } catch (_) {}

    if (current()) return current();

    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("seh-ecl27-current-roster-ready",onReady);
        resolve(current());
      };
      const onReady = () => finish();
      window.addEventListener("seh-ecl27-current-roster-ready",onReady,{once:true});
      window.setTimeout(finish,3000);
    });
  }

  function applySharedEcl27Roster(model) {
    const rows = Array.isArray(model?.teams) ? model.teams : [];
    if (!rows.length) return false;

    teamDirectory = rows.map((row,index) => {
      const preset = JERSEY_PRESETS.find(team => normalize(team.name) === normalize(row.name));
      if (preset) {
        return {
          ...preset,
          projectId:null,
          teamId:Number(row.teamId) || null,
          division:String(row.division || ""),
          logoName:String(row.logoName || ""),
          exactLogoUrl:String(row.logoUrl || "")
        };
      }
      const [primary,accent,trim,pattern] = fallbackPalette(index);
      return {
        id:"ecl27-" + String(index + 1),
        name:String(row.name || "Okänt lag"),
        code:initials(row.name),
        primary,accent,trim,pattern,
        projectId:null,
        teamId:Number(row.teamId) || null,
        division:String(row.division || ""),
        logoName:String(row.logoName || ""),
        exactLogoUrl:String(row.logoUrl || ""),
        genericJersey:true
      };
    });

    const byName = new Map(teamDirectory.map(team => [normalize(team.name),team]));
    rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));

    for (const row of rows) {
      const team = byName.get(normalize(row.name));
      if (!team) continue;
      const list = rostersByTeamId.get(team.id);
      const sharedPlayers = Array.isArray(row.players)
        ? row.players
        : (Array.isArray(row.playersNow) ? row.playersNow : []);
      for (const raw of sharedPlayers) {
        const player = String(raw || "").trim();
        if (player && !list.some(name => normalize(name) === normalize(player))) list.push(player);
      }
      list.sort((a,b) => a.localeCompare(b,"sv",{sensitivity:"base"}));
    }
    return true;
  }

  async function loadLagbyggeData() {
    const status = $("#dataStatus");
    if (status) status.textContent = "Hämtar ECL 27-lag…";

    // Team list is the authoritative first step. Nothing after this point is
    // allowed to replace a successfully loaded ECL 27 team list with test data.
    let rows = [];
    try {
      const teams = await getPublicRows(
        "v_ecl27_team_builds_public",
        "select=id,name,division,source_team_id,logo_name,is_new_project,status&order=division.asc,name.asc"
      );
      rows = Array.isArray(teams) ? teams : [];
      if (!rows.length) throw new Error("ECL 27 innehåller inga lag");

      teamDirectory = rows.map(buildDynamicTeam);

      const preferred = teamDirectory.find(team => normalize(team.name) === normalize("Carolus Icemen"))
        || teamDirectory[0];
      state.teamId = preferred.id;
      state.opponentId = teamDirectory.find(team => team.id !== state.teamId)?.id || state.teamId;

      rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));
      playerKeysByName = new Map();
      applyAccessMode();
      setDefaultLineup();
      syncForm();
      render();

      if (status) status.textContent = teamDirectory.length + " lag · hämtar spelare…";
    } catch (error) {
      console.error("[Match Graphics] kunde inte läsa ECL 27-laglistan",error);
      dataSource = "lokal testdata";
      rostersByTeamId = new Map(JERSEY_PRESETS.map(team => [team.id,[]]));
      teamDirectory = [...JERSEY_PRESETS];
      state.teamId = teamDirectory[0].id;
      state.opponentId = teamDirectory[1]?.id || teamDirectory[0].id;
      state.lineup = {...EMPTY_LINEUP};
      state.lineupNumbers = {...EMPTY_NUMBERS};
      syncForm();
      render();
      if (status) status.textContent = "ECL 27-lag kunde inte laddas · visar testlag";
      return;
    }

    // Roster loading is independent from the team list.
    try {
      const rosterRows = Array.isArray(window.SEH_ECL27_ROSTER_SNAPSHOT?.rows)
        ? window.SEH_ECL27_ROSTER_SNAPSHOT.rows
        : await getPublicRows("v_ecl27_current_roster_public","select=player_key,display_gamertag,team_project_id,team_name,division,team_id,logo_name&order=team_name.asc,display_gamertag.asc");
      rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));
      playerKeysByName = new Map();
      applyDirectRosterRows(rosterRows);
      setDefaultLineup();
      await hydratePlayerPortraits(state.teamId);
      syncForm();
      render();
      dataSource = "ECL 27 · team + current roster";
    } catch (error) {
      console.warn("[Match Graphics] laglistan laddad men roster kunde inte hämtas",error);
      dataSource = "ECL 27 · laglista utan roster";
    }

    // Logo-derived palette is also non-blocking. Exact team identity is already
    // established by teamDirectory and may never be replaced here.
    try {
      await Promise.all([
        ensureTeamPalette(teamById(state.teamId)),
        ensureTeamPalette(teamById(state.opponentId))
      ]);
      render();
    } catch (error) {
      console.warn("[Match Graphics] kunde inte läsa lagfärger",error);
    }

    const playerCount = rosterPlayerCount();
    if (status) status.textContent = teamDirectory.length + " lag · " + playerCount + " aktuella spelare";
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function premiumJerseySvg(team, options = {}) {
    const variant = options.variant || "home";
    const side = options.side || "front";
    const compact = options.compact === true;
    const pattern = options.pattern || team.pattern || "shoulder";
    const primary = options.primary || team.primary;
    const accent = options.accent || team.accent;
    const trim = options.trim || team.trim;
    const name = String(options.playerName || state.playerName || "PLAYER").toUpperCase();
    const number = String(options.playerNumber || state.playerNumber || "21");
    const roleRaw = String(options.captainRole || "").toUpperCase();
    const captainRole = roleRaw === "C" || roleRaw === "A" ? roleRaw : "";
    const logo = logoUrl(team.name);
    const uid = `premium-${team.id}-${variant}-${side}-${Math.random().toString(36).slice(2,8)}`;

    const bodyBase = variant === "away" ? "#f4f4f1" : primary;
    const sleeveBase = bodyBase;
    const yokeBase = pattern === "shoulder"
      ? (variant === "away" ? primary : accent)
      : (variant === "away" ? trim : primary);
    const stripeA = variant === "away" ? primary : accent;
    const stripeB = variant === "away" ? accent : trim;
    const ink = variant === "away" ? primary : trim;
    const dark = variant === "away" ? primary : "#07090a";

    // V27: softer, slightly asymmetric hockey cut with longer sleeves and natural fabric drape.
    const leftSleeve = "M242 96 C216 96 179 103 151 116 C124 129 111 154 109 188 C106 249 104 322 102 391 L97 520 C99 532 126 536 171 531 C181 512 184 476 189 439 C194 397 199 348 199 302 C198 252 190 210 186 176 C184 143 208 108 242 96 Z";
    const rightSleeve = "M358 93 C385 96 423 104 449 118 C475 132 487 156 490 190 C493 254 495 327 497 393 L503 518 C501 531 474 535 428 530 C419 514 415 480 410 442 C404 399 400 349 401 300 C402 250 411 207 415 177 C418 141 392 106 358 93 Z";
    const torso = "M242 96 Q297 111 358 93 C390 101 418 126 425 161 C431 194 425 233 419 270 C414 315 413 357 410 398 C407 447 411 500 407 558 C401 570 377 573 352 576 Q298 586 247 578 C219 575 197 570 191 558 C188 510 190 466 185 422 C181 381 177 341 175 305 C170 259 166 214 170 178 C175 135 204 105 242 96 Z";

    const shoulderDecor = pattern === "shoulder" ? `
      <path d="M116 111 C160 101 205 99 242 96 Q299 112 358 93 C399 99 442 105 484 120 L480 169 C420 151 360 145 301 149 C239 145 181 152 120 172 Z" fill="${yokeBase}"/>
      <path d="M121 169 C180 151 239 144 301 148 C361 144 420 151 479 168" fill="none" stroke="${stripeB}" stroke-width="7.5" stroke-linecap="round"/>
    ` : "";

    const sleeveStriping = pattern === "minimal" ? `
      <path d="M98 328 Q143 332 194 326 L196 347 Q143 353 98 349 Z M502 328 Q457 332 406 326 L404 347 Q457 353 502 349 Z" fill="${stripeA}"/>
    ` : pattern === "diagonal" ? `
      <path d="M98 304 L196 287 V308 L98 325 Z M502 304 L404 287 V308 L502 325 Z" fill="${stripeA}"/>
      <path d="M98 331 L196 314 V336 L98 353 Z M502 331 L404 314 V336 L502 353 Z" fill="${stripeB}"/>
    ` : `
      <path d="M98 299 Q143 302 195 298 V324 Q143 328 98 325 Z M502 299 Q457 302 405 298 V324 Q457 328 502 325 Z" fill="${stripeB}"/>
      <path d="M98 340 Q143 344 196 340 V366 Q143 370 98 366 Z M502 340 Q457 344 404 340 V366 Q457 370 502 366 Z" fill="${stripeA}"/>
    `;

    const hemStriping = pattern === "minimal" ? `
      <path d="M183 532 Q249 543 300 545 Q354 544 417 531 L417 553 Q354 565 300 566 Q247 564 183 553 Z" fill="${stripeA}"/>
    ` : `
      <path d="M182 522 Q246 534 300 536 Q357 535 418 521 L418 544 Q356 556 300 558 Q245 556 182 544 Z" fill="${stripeA}"/>
      <path d="M182 548 Q247 559 300 560 Q356 559 418 547 L418 561 Q355 572 300 573 Q246 571 182 561 Z" fill="${stripeB}"/>
    `;

    const captain = captainRole ? `
      <g transform="translate(377 190)">
        <path d="M0 0 H40 V40 H0 Z" fill="${ink}" opacity=".95"/>
        <text x="20" y="28" text-anchor="middle" fill="${variant === "away" ? "#f5f5f1" : dark}" font-size="21" font-weight="1000">${captainRole}</text>
      </g>
    ` : "";

    const front = `
      <g>
        ${logo
          ? `<image href="${esc(logo)}" x="199" y="226" width="202" height="202" preserveAspectRatio="xMidYMid meet"/>`
          : `<text x="300" y="335" text-anchor="middle" fill="${ink}" font-size="74" font-weight="1000">${esc(team.code)}</text>`}
        ${captain}
      </g>
    `;

    const back = `
      <g>
        <text x="300" y="215" text-anchor="middle" fill="${ink}" stroke="${stripeA}" stroke-width="1.5" paint-order="stroke fill" font-size="${compact ? 27 : 30}" font-weight="1000" letter-spacing="2.4">${esc(name)}</text>
        <text x="300" y="420" text-anchor="middle" fill="${ink}" stroke="${stripeA}" stroke-width="6" paint-order="stroke fill" font-size="${compact ? 174 : 184}" font-weight="1000" letter-spacing="-8">${esc(number)}</text>
      </g>
    `;

    return `
      <svg viewBox="0 0 600 600" role="img" aria-label="${esc(team.name)} premium ${variant === "away" ? "bortatröja" : "hemmatröja"}" class="seh-jersey-svg seh-jersey-premium${compact ? " is-compact" : ""}">
        <defs>
          <clipPath id="clip-${uid}">
            <path d="${leftSleeve}"/>
            <path d="${torso}"/>
            <path d="${rightSleeve}"/>
          </clipPath>
          <clipPath id="torso-clip-${uid}"><path d="${torso}"/></clipPath>
          <mask id="sleeves-only-${uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600">
            <path d="${leftSleeve}" fill="#fff"/><path d="${rightSleeve}" fill="#fff"/>
            <path d="${torso}" fill="#000"/>
          </mask>
          <linearGradient id="torso-${uid}" x1="0%" y1="0%" x2="100%" y2="10%">
            <stop offset="0" stop-color="#000" stop-opacity=".08"/>
            <stop offset=".15" stop-color="#fff" stop-opacity=".10"/>
            <stop offset=".36" stop-color="#fff" stop-opacity=".035"/>
            <stop offset=".58" stop-color="#fff" stop-opacity=".075"/>
            <stop offset=".79" stop-color="#000" stop-opacity=".09"/>
            <stop offset="1" stop-color="#000" stop-opacity=".12"/>
          </linearGradient>
          <radialGradient id="torso-drape-${uid}" cx="46%" cy="34%" r="76%">
            <stop offset="0" stop-color="#fff" stop-opacity=".055"/>
            <stop offset=".56" stop-color="#fff" stop-opacity=".012"/>
            <stop offset="1" stop-color="#000" stop-opacity=".095"/>
          </radialGradient>
          <linearGradient id="left-sleeve-${uid}" x1="0%" y1="0%" x2="100%" y2="8%">
            <stop offset="0" stop-color="#000" stop-opacity=".22"/>
            <stop offset=".31" stop-color="#fff" stop-opacity=".07"/>
            <stop offset=".67" stop-color="#fff" stop-opacity=".018"/>
            <stop offset="1" stop-color="#000" stop-opacity=".11"/>
          </linearGradient>
          <linearGradient id="right-sleeve-${uid}" x1="100%" y1="0%" x2="0%" y2="10%">
            <stop offset="0" stop-color="#000" stop-opacity=".25"/>
            <stop offset=".34" stop-color="#fff" stop-opacity=".055"/>
            <stop offset=".72" stop-color="#fff" stop-opacity=".014"/>
            <stop offset="1" stop-color="#000" stop-opacity=".10"/>
          </linearGradient>
          <radialGradient id="chest-light-${uid}" cx="39%" cy="19%" r="88%">
            <stop offset="0" stop-color="#fff" stop-opacity="${variant === "away" ? ".16" : ".22"}"/>
            <stop offset=".34" stop-color="#fff" stop-opacity=".055"/>
            <stop offset=".72" stop-color="#000" stop-opacity=".018"/>
            <stop offset="1" stop-color="#000" stop-opacity=".10"/>
          </radialGradient>
          <pattern id="knit-${uid}" width="3.2" height="4.2" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <path d="M.45 .25 L1.5 2.05 L.45 3.85" fill="none" stroke="#fff" stroke-opacity=".085" stroke-width=".35"/>
            <path d="M1.75 .25 L2.8 2.05 L1.75 3.85" fill="none" stroke="#000" stroke-opacity=".072" stroke-width=".35"/>
          </pattern>
          <linearGradient id="neck-lining-${uid}" x1="0" y1="0" x2=".25" y2="1">
            <stop stop-color="#343a3e"/><stop offset=".28" stop-color="#aab0b0"/><stop offset=".58" stop-color="#d9dcda"/><stop offset="1" stop-color="#6d7477"/>
          </linearGradient>
          <linearGradient id="collar-light-${uid}" x1="0" x2="1" y2=".45">
            <stop stop-color="#fff" stop-opacity=".20"/><stop offset=".46" stop-color="#fff" stop-opacity=".035"/><stop offset="1" stop-color="#000" stop-opacity=".20"/>
          </linearGradient>
          <filter id="shadow-${uid}" x="-35%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="${compact ? 17 : 24}" stdDeviation="${compact ? 13 : 18}" flood-color="#000" flood-opacity=".52"/>
          </filter>
          <filter id="soft-${uid}" x="-30%" y="-20%" width="160%" height="150%">
            <feGaussianBlur stdDeviation="10"/>
          </filter>
          <filter id="crease-${uid}" x="-40%" y="-25%" width="180%" height="150%">
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>
        </defs>

        <g filter="url(#shadow-${uid})">
          <path d="${leftSleeve}" fill="${sleeveBase}"/>
          <path d="${rightSleeve}" fill="${sleeveBase}"/>
          <path d="${torso}" fill="${bodyBase}"/>

          <g clip-path="url(#clip-${uid})">
            ${shoulderDecor}
            <g mask="url(#sleeves-only-${uid})">${sleeveStriping}</g>
            <g clip-path="url(#torso-clip-${uid})">${hemStriping}</g>
            ${side === "back" ? back : front}
            <path d="${leftSleeve}" fill="url(#left-sleeve-${uid})"/>
            <path d="${rightSleeve}" fill="url(#right-sleeve-${uid})"/>
            <path d="${torso}" fill="url(#torso-${uid})"/>
            <path d="${torso}" fill="url(#torso-drape-${uid})"/>
            <rect width="600" height="600" fill="url(#chest-light-${uid})"/>
            <rect width="600" height="600" fill="url(#knit-${uid})" opacity="${compact ? ".18" : ".34"}"/>
          </g>

          <!-- V27 broad photographic fabric shading with small asymmetric stress folds. -->
          <g clip-path="url(#clip-${uid})">
            <g filter="url(#soft-${uid})" opacity="${variant === "away" ? ".58" : ".76"}">
              <path d="M141 141 C177 125 207 137 226 173 C191 157 168 163 151 202 C134 189 128 160 141 141 Z" fill="#fff" opacity=".12"/>
              <path d="M118 188 C143 165 169 177 183 214 C164 196 144 204 123 243 C112 228 108 207 118 188 Z" fill="#000" opacity=".13"/>
              <path d="M395 128 C432 126 463 146 474 177 C449 159 426 166 411 204 C401 181 394 151 395 128 Z" fill="#fff" opacity=".09"/>
              <path d="M420 175 C447 166 470 190 480 225 C458 206 439 218 420 257 C412 229 411 199 420 175 Z" fill="#000" opacity=".16"/>
              <path d="M125 286 C154 265 178 286 184 342 C165 316 146 323 120 365 C112 338 113 309 125 286 Z" fill="#fff" opacity=".075"/>
              <path d="M438 292 C461 281 480 309 481 359 C464 336 447 345 427 386 C424 348 427 316 438 292 Z" fill="#000" opacity=".11"/>
              <path d="M223 180 C255 161 282 190 291 251 C269 220 244 226 218 284 C207 244 209 207 223 180 Z" fill="#fff" opacity=".06"/>
              <path d="M330 168 C362 172 382 211 375 268 C361 232 337 232 313 287 C310 236 315 194 330 168 Z" fill="#000" opacity=".075"/>
              <path d="M210 358 C242 335 270 364 276 437 C253 399 229 410 207 474 C197 431 199 390 210 358 Z" fill="#000" opacity=".065"/>
              <path d="M340 353 C371 340 392 379 386 448 C371 409 349 414 326 478 C322 430 327 385 340 353 Z" fill="#fff" opacity=".055"/>
            </g>
            <g fill="none" stroke-linecap="round" filter="url(#crease-${uid})">
              <path d="M151 128 Q176 133 193 151 M185 111 Q211 117 230 132" stroke="#fff" stroke-opacity=".13" stroke-width="2.6"/>
              <path d="M389 109 Q419 116 440 138" stroke="#000" stroke-opacity=".09" stroke-width="2.1"/>
              <path d="M161 178 Q158 198 174 216 M437 171 Q442 194 427 220" stroke="#000" stroke-opacity=".11" stroke-width="1.7"/>
              <path d="M173 510 Q150 520 118 514 M429 512 Q458 521 490 513" stroke="#fff" stroke-opacity=".095" stroke-width="1.8"/>
            </g>
            <g fill="none" stroke-linecap="round">
              <path d="M104 516 Q136 526 170 520" stroke="#000" stroke-opacity=".14" stroke-width=".75" stroke-dasharray="1 2.1"/>
              <path d="M430 519 Q462 526 496 516" stroke="#000" stroke-opacity=".14" stroke-width=".75" stroke-dasharray="1 2.1"/>
              <path d="M196 556 Q247 570 300 572 Q351 570 402 557" stroke="#000" stroke-opacity=".13" stroke-width=".72" stroke-dasharray="1 2.15"/>
              <path d="M198 552 Q249 565 300 567 Q350 565 400 553" stroke="#fff" stroke-opacity=".09" stroke-width=".65" stroke-dasharray=".9 2.2"/>
            </g>
          </g>
          <!-- V27 ribbed V-neck: inner lining, soft edge shadow and discreet stitching. -->
          ${side === "back" ? `
            <path d="M240 95 Q299 116 360 93 L357 108 Q300 133 243 109 Z" fill="${dark}"/>
            <path d="M245 104 Q300 126 355 103" fill="none" stroke="${stripeA}" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M249 110 Q300 129 351 108" fill="none" stroke="${stripeB}" stroke-opacity=".26" stroke-width=".65" stroke-dasharray="1 1.7"/>
          ` : `
            <path d="M243 94 Q299 111 358 93 C353 120 328 150 300 171 C271 150 248 120 243 94 Z" fill="url(#neck-lining-${uid})"/>
            <path d="M245 96 Q299 113 356 94 L352 106 Q300 125 249 107 Z" fill="${dark}" opacity=".98"/>
            <path d="M234 95 Q240 90 247 96 C249 119 272 149 305 173 L298 182 C261 155 240 128 234 95 Z" fill="${primary}"/>
            <path d="M354 94 Q361 90 366 95 C360 130 338 157 298 182 L291 174 C328 146 350 121 354 94 Z" fill="${primary}"/>
            <path d="M237 96 C244 130 267 154 298 180 C335 155 358 126 363 96 L357 96 C351 124 330 149 298 173 C269 151 248 126 244 96 Z" fill="url(#collar-light-${uid})"/>
            <path d="M242 99 C249 128 269 151 299 175 C329 152 351 128 358 98" fill="none" stroke="${stripeA}" stroke-width="2.15" stroke-linecap="round"/>
            <path d="M248 108 C255 133 275 154 300 172 M352 107 C345 132 325 155 300 172" fill="none" stroke="${stripeB}" stroke-opacity=".30" stroke-width=".62" stroke-dasharray=".9 1.55"/>
            <path d="M252 112 C260 134 278 153 300 168 M348 111 C341 134 323 153 300 168" fill="none" stroke="#000" stroke-opacity=".10" stroke-width=".55" stroke-dasharray=".8 1.7"/>
          `}
        </g>
      </svg>
    `;
  }

  function cleanText(value, max = 36) {
    return String(value || "").trim().slice(0,max);
  }

  function formatDate(value) {
    if (!value) return "DATUM EJ SATT";
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    const months = ["JAN","FEB","MAR","APR","MAJ","JUN","JUL","AUG","SEP","OKT","NOV","DEC"];
    const month = months[Math.max(0,Math.min(11,Number(parts[1]) - 1))];
    return Number(parts[2]) + " " + month + " " + parts[0];
  }

  function safeFilePart(value) {
    return normalize(value).replace(/\s+/g,"-").replace(/^-|-$/g,"") || "match";
  }

  function placedJersey(svg, x, y, size) {
    return svg.replace(
      '<svg viewBox="0 0 600 600"',
      '<svg x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" viewBox="0 0 600 600"'
    );
  }

  function lineupMarkupSquare(width, y) {
    const margin = width === 1920 ? 170 : 54;
    const gap = width === 1920 ? 16 : 10;
    const available = width - margin * 2 - gap * 5;
    const cardWidth = available / 6;
    const cardHeight = width === 1920 ? 118 : 104;
    return POSITIONS.map((pos,index) => {
      const x = margin + index * (cardWidth + gap);
      const name = esc(cleanText(state.lineup[pos],18) || "—");
      return [
        '<g transform="translate(' + x + ' ' + y + ')">',
        '<rect width="' + cardWidth + '" height="' + cardHeight + '" rx="18" fill="#ffffff" fill-opacity=".072" stroke="#ffffff" stroke-opacity=".12"/>',
        '<rect x="12" y="12" width="42" height="26" rx="8" fill="#ffffff" fill-opacity=".14"/>',
        '<text x="33" y="31" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text>',
        '<text x="14" y="' + (cardHeight - 24) + '" fill="#ffffff" font-size="' + (width === 1920 ? 24 : 17) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif">' + name + '</text>',
        '</g>'
      ].join("");
    }).join("");
  }

  function lineupMarkupStory(y) {
    const cardWidth = 430;
    const cardHeight = 122;
    const gapX = 20;
    const gapY = 18;
    return POSITIONS.map((pos,index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 100 + col * (cardWidth + gapX);
      const yy = y + row * (cardHeight + gapY);
      const name = esc(cleanText(state.lineup[pos],20) || "—");
      return [
        '<g transform="translate(' + x + ' ' + yy + ')">',
        '<rect width="' + cardWidth + '" height="' + cardHeight + '" rx="22" fill="#ffffff" fill-opacity=".072" stroke="#ffffff" stroke-opacity=".12"/>',
        '<rect x="18" y="18" width="52" height="32" rx="9" fill="#ffffff" fill-opacity=".14"/>',
        '<text x="44" y="41" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text>',
        '<text x="20" y="92" fill="#ffffff" font-size="25" font-weight="800" font-family="Arial,Helvetica,sans-serif">' + name + '</text>',
        '</g>'
      ].join("");
    }).join("");
  }

  function lineupJerseySquare(width, y, team, variant) {
    const margin = width === 1920 ? 160 : 48;
    const gap = width === 1920 ? 12 : 6;
    const available = width - margin * 2 - gap * 5;
    const slotWidth = available / 6;
    const jerseySize = width === 1920 ? 176 : 148;
    return POSITIONS.map((pos,index) => {
      const x = margin + index * (slotWidth + gap) + (slotWidth - jerseySize) / 2;
      const name = cleanText(state.lineup[pos],18) || "PLAYER";
      const jersey = premiumJerseySvg(team,{
        variant,
        side:"back",
        compact:true,
        playerName:name,
        playerNumber:state.lineupNumbers[pos] || " "
      });
      return [
        '<g>',
        placedJersey(jersey,x,y,jerseySize),
        '<rect x="' + (x + jerseySize/2 - 23) + '" y="' + (y + jerseySize - 5) + '" width="46" height="25" rx="8" fill="#070a0d" fill-opacity=".86" stroke="#ffffff" stroke-opacity=".13"/>',
        '<text x="' + (x + jerseySize/2) + '" y="' + (y + jerseySize + 13) + '" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text>',
        '</g>'
      ].join("");
    }).join("");
  }

  function lineupJerseyStory(y, team, variant) {
    const jerseySize = 238;
    const colX = [270,810];
    const rowGap = 235;
    return POSITIONS.map((pos,index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = colX[col] - jerseySize/2;
      const yy = y + row * rowGap;
      const name = cleanText(state.lineup[pos],20) || "PLAYER";
      const jersey = premiumJerseySvg(team,{
        variant,
        side:"back",
        compact:true,
        playerName:name,
        playerNumber:state.lineupNumbers[pos] || " "
      });
      return [
        '<g>',
        placedJersey(jersey,x,yy,jerseySize),
        '<rect x="' + (x + jerseySize/2 - 28) + '" y="' + (yy + jerseySize - 6) + '" width="56" height="30" rx="9" fill="#070a0d" fill-opacity=".86" stroke="#ffffff" stroke-opacity=".13"/>',
        '<text x="' + (x + jerseySize/2) + '" y="' + (yy + jerseySize + 16) + '" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text>',
        '</g>'
      ].join("");
    }).join("");
  }


  function portraitCard(pos, name, x, y, width, height, team, variant) {
    const cleanName = cleanText(name,20) || "PLAYER";
    const number = cleanText(state.lineupNumbers[pos],2);
    const portrait = portraitUrlForPlayer(cleanName) || defaultPlayerImageUrl();
    const clipId = "portrait-" + pos + "-" + normalize(cleanName).replace(/\s+/g,"-");
    const nameSize = width >= 220 ? 18 : width >= 160 ? 15 : 13;
    const imageBottom = y + height - 44;
    const imageHeight = Math.max(1,imageBottom - y - 4);
    const posBadgeWidth = pos.length > 1 ? 42 : 34;

    return [
      '<g>',
      '<defs><clipPath id="' + clipId + '"><rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="18"/></clipPath></defs>',
      '<rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="18" fill="#0a0f15" stroke="#ffffff" stroke-opacity=".14"/>',
      '<rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="18" fill="' + team.primary + '" opacity=".22"/>',
      '<image href="' + esc(portrait) + '" x="' + (x+4) + '" y="' + (y+4) + '" width="' + (width-8) + '" height="' + imageHeight + '" preserveAspectRatio="xMidYMin slice" clip-path="url(#' + clipId + ')"/>',
      '<rect x="' + (x+10) + '" y="' + (y+10) + '" width="' + posBadgeWidth + '" height="24" rx="12" fill="#05080c" fill-opacity=".88" stroke="#ffffff" stroke-opacity=".16"/>',
      '<text x="' + (x+10+posBadgeWidth/2) + '" y="' + (y+27) + '" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="1000" letter-spacing=".8" font-family="Arial,Helvetica,sans-serif">' + esc(pos) + '</text>',
      number ? '<rect x="' + (x+width-50) + '" y="' + (y+10) + '" width="40" height="24" rx="12" fill="#05080c" fill-opacity=".88" stroke="#ffffff" stroke-opacity=".16"/>' : '',
      number ? '<text x="' + (x+width-30) + '" y="' + (y+27) + '" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="1000" font-family="Arial,Helvetica,sans-serif">#' + esc(number) + '</text>' : '',
      '<rect x="' + x + '" y="' + (y+height-48) + '" width="' + width + '" height="48" fill="#05080c" fill-opacity=".93" clip-path="url(#' + clipId + ')"/>',
      '<text x="' + (x+12) + '" y="' + (y+height-17) + '" fill="#ffffff" font-size="' + nameSize + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + esc(cleanName) + '</text>',
      '</g>'
    ].join("");
  }

  function lineupPortraitSquare(width, y, team, variant) {
    const landscape = width === 1920;
    const cardWidth = landscape ? 205 : 140;
    const cardHeight = landscape ? 238 : 190;
    const gap = landscape ? 18 : 8;
    const totalWidth = cardWidth * 6 + gap * 5;
    const startX = (width - totalWidth) / 2;
    return POSITIONS.map((pos,index) => {
      const x = startX + index * (cardWidth + gap);
      return portraitCard(pos,state.lineup[pos],x,y,cardWidth,cardHeight,team,variant);
    }).join("");
  }

  function lineupPortraitStory(y, team, variant) {
    const cardWidth = 220;
    const cardHeight = 240;
    const gapX = 20;
    const gapY = 18;
    const totalWidth = cardWidth * 2 + gapX;
    const startX = (1080 - totalWidth) / 2;
    return POSITIONS.map((pos,index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * (cardWidth + gapX);
      const yy = y + row * (cardHeight + gapY);
      return portraitCard(pos,state.lineup[pos],x,yy,cardWidth,cardHeight,team,variant);
    }).join("");
  }

  function lineupForTemplate(width, y, team, variant) {
    if (state.lineupStyle === "portraits") {
      return state.format === "story"
        ? lineupPortraitStory(y,team,variant)
        : lineupPortraitSquare(width,y,team,variant);
    }
    if (state.lineupStyle === "jerseys") {
      return state.format === "story"
        ? lineupJerseyStory(y,team,variant)
        : lineupJerseySquare(width,y,team,variant);
    }
    return state.format === "story" ? lineupMarkupStory(y) : lineupMarkupSquare(width,y);
  }

  function cleanStreamChannel(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\//i,"")
      .replace(/^www\./i,"")
      .replace(/^twitch\.tv\//i,"")
      .replace(/^youtube\.com\//i,"")
      .replace(/^youtu\.be\//i,"")
      .replace(/^kick\.com\//i,"")
      .replace(/\/$/,"");
  }

  function streamLabel() {
    const channel = cleanStreamChannel(state.streamChannel);
    if (!channel || state.streamPlatform === "none") return "";
    if (state.streamPlatform === "twitch") return "LIVE · TWITCH.TV/" + channel.toUpperCase();
    if (state.streamPlatform === "youtube") return "LIVE · YOUTUBE · " + channel.toUpperCase();
    if (state.streamPlatform === "kick") return "LIVE · KICK.COM/" + channel.toUpperCase();
    return "LIVE · " + channel.toUpperCase();
  }

  function layoutFor(format) {
    if (format === "landscape") {
      return {
        width:1920,height:1080,
        leftX:125,rightX:1295,jerseyY:190,jerseySize:540,
        teamNameY:182,vsY:405,metaY:535,lineupY:730,
        headerY:96,competitionY:142,ownLabelY:684
      };
    }
    if (format === "story") {
      return {
        width:1080,height:1920,
        leftX:38,rightX:602,jerseyY:300,jerseySize:440,
        teamNameY:270,vsY:690,metaY:810,lineupY:1090,
        headerY:112,competitionY:164,ownLabelY:1030
      };
    }
    return {
      width:1080,height:1080,
      leftX:55,rightX:625,jerseyY:205,jerseySize:400,
      teamNameY:180,vsY:410,metaY:505,lineupY:815,
      headerY:70,competitionY:108,ownLabelY:770
    };
  }


  function buildClassicSvg() {
    const own = teamById(state.teamId);
    const opponent = teamById(state.opponentId);
    const home = state.ownSide === "home" ? own : opponent;
    const away = state.ownSide === "home" ? opponent : own;
    const layout = layoutFor(state.format);
    const W = layout.width;
    const H = layout.height;
    const isWide = state.format === "landscape";
    const isStory = state.format === "story";
    const leftJersey = premiumJerseySvg(home,{variant:"home",side:"front",compact:false});
    const rightJersey = premiumJerseySvg(away,{variant:"away",side:"front",compact:false});
    const titleSize = isWide ? 84 : isStory ? 68 : 54;
    const teamSize = isWide ? 40 : isStory ? 31 : 28;
    const vsSize = isWide ? 112 : isStory ? 92 : 82;
    const metaSize = isWide ? 35 : isStory ? 32 : 27;
    const ownVariant = state.ownSide === "home" ? "home" : "away";
    const lineup = lineupForTemplate(W,layout.lineupY,own,ownVariant);
    const stream = esc(streamLabel());
    const ownName = esc(own.name);
    const homeName = esc(home.name);
    const awayName = esc(away.name);
    const badge = esc(cleanText(state.badge,20).toUpperCase() || "MATCHDAY");
    const competition = esc(cleanText(state.competition,28).toUpperCase() || "SVENSK eHOCKEY");
    const date = esc(formatDate(state.date));
    const time = esc(cleanText(state.time,5) || "20:00");

    const panelX = isWide ? 155 : isStory ? 70 : 44;
    const panelY = isWide ? 690 : isStory ? 1042 : 765;
    const panelW = W - panelX * 2;
    const panelH = isWide ? 322 : isStory ? 790 : 278;
    const lineupTitleY = panelY + (isStory ? 42 : 38);
    const footerY = H - (isWide ? 28 : isStory ? 34 : 24);
    const watermarkSize = isWide ? 560 : isStory ? 430 : 410;
    const leftWatermarkX = isWide ? 20 : -55;
    const rightWatermarkX = W - watermarkSize - (isWide ? 20 : -55);
    const watermarkY = isStory ? 285 : 205;
    const leftNameX = layout.leftX + layout.jerseySize / 2;
    const rightNameX = layout.rightX + layout.jerseySize / 2;
    const streamWidth = isWide ? 520 : isStory ? 520 : 380;
    const streamHeight = isStory ? 54 : isWide ? 48 : 42;
    const streamY = layout.metaY + (isStory ? 38 : 24);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Matchbild ' + homeName + ' mot ' + awayName + '">',
      '<defs>',
      '<linearGradient id="classic-overlay" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0" stop-color="' + home.primary + '" stop-opacity=".50"/>',
      '<stop offset=".32" stop-color="#07111c" stop-opacity=".74"/>',
      '<stop offset=".68" stop-color="#07111c" stop-opacity=".76"/>',
      '<stop offset="1" stop-color="' + away.primary + '" stop-opacity=".52"/>',
      '</linearGradient>',
      '<linearGradient id="classic-title" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".58" stop-color="#f4f7fb"/><stop offset="1" stop-color="#aebbc9"/></linearGradient>',
      '<linearGradient id="classic-vs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".52" stop-color="#e9f2fb"/><stop offset="1" stop-color="#86a7c8"/></linearGradient>',
      '<linearGradient id="classic-ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fc5ff" stop-opacity="0"/><stop offset=".55" stop-color="#83c7ff" stop-opacity=".06"/><stop offset="1" stop-color="#b9e3ff" stop-opacity=".20"/></linearGradient>',
      '<radialGradient id="classic-center-glow" cx="50%" cy="44%" r="52%"><stop offset="0" stop-color="#3e9fff" stop-opacity=".28"/><stop offset=".45" stop-color="#1d6bad" stop-opacity=".08"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>',
      '<radialGradient id="classic-vignette" cx="50%" cy="45%" r="72%"><stop offset=".45" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#02070d" stop-opacity=".62"/></radialGradient>',
      '<filter id="classic-title-shadow" x="-30%" y="-40%" width="160%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000814" flood-opacity=".68"/></filter>',
      '<filter id="classic-blue-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="' + (isWide ? 20 : 14) + '"/></filter>',
      '<filter id="classic-soft-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity=".5"/></filter>',
      '</defs>',

      backgroundImageSvg(W,H,1),
      '<rect width="' + W + '" height="' + H + '" fill="#02070d" opacity=".15"/>',
      '<rect width="' + W + '" height="' + H + '" fill="url(#classic-overlay)" opacity=".88"/>',
      '<rect width="' + W + '" height="' + H + '" fill="url(#classic-center-glow)"/>',
      '<path d="M' + (W*.5) + ' 0 L' + (W*.39) + ' ' + H + ' H' + (W*.61) + ' Z" fill="#4aaeff" opacity=".035"/>',
      '<path d="M' + (W*.5) + ' 0 L' + (W*.455) + ' ' + H + '" stroke="#76bdff" stroke-opacity=".11" stroke-width="' + (isWide?3:2) + '"/>',
      '<path d="M' + (W*.5) + ' 0 L' + (W*.545) + ' ' + H + '" stroke="#76bdff" stroke-opacity=".07" stroke-width="' + (isWide?3:2) + '"/>',
      '<rect x="0" y="' + (H*.50) + '" width="' + W + '" height="' + (H*.50) + '" fill="url(#classic-ice)"/>',
      '<ellipse cx="' + (W/2) + '" cy="' + (H*.79) + '" rx="' + (W*.46) + '" ry="' + (H*.13) + '" fill="#7cc7ff" opacity=".10" filter="url(#classic-blue-glow)"/>',
      '<line x1="' + (W*.08) + '" y1="' + (H*.755) + '" x2="' + (W*.92) + '" y2="' + (H*.755) + '" stroke="#b9dcff" stroke-opacity=".12" stroke-width="2"/>',

      svgLogo(home,leftWatermarkX,watermarkY,watermarkSize,.075),
      svgLogo(away,rightWatermarkX,watermarkY,watermarkSize,.075),

      '<g opacity=".80">',
      '<text x="' + (isWide?54:34) + '" y="' + (isStory?54:42) + '" fill="#ffffff" fill-opacity=".54" font-size="' + (isWide?13:11) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="5">SVENSK</text>',
      '<text x="' + (isWide?54:34) + '" y="' + (isStory?76:62) + '" fill="#ffffff" fill-opacity=".54" font-size="' + (isWide?13:11) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="5">eHOCKEY</text>',
      '<text x="' + (isWide?54:34) + '" y="' + (isStory?98:82) + '" fill="#ffffff" fill-opacity=".54" font-size="' + (isWide?13:11) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="5">LEAGUE</text>',
      '</g>',

      '<g filter="url(#classic-title-shadow)">',
      '<text x="' + (W/2) + '" y="' + layout.headerY + '" text-anchor="middle" fill="url(#classic-title)" font-size="' + titleSize + '" font-weight="1000" font-family="Arial Black,Arial,Helvetica,sans-serif" letter-spacing="' + (isWide?3:2) + '">' + badge + '</text>',
      '</g>',
      '<line x1="' + (W/2-(isWide?235:170)) + '" y1="' + (layout.competitionY-9) + '" x2="' + (W/2-(isWide?105:82)) + '" y2="' + (layout.competitionY-9) + '" stroke="#ffffff" stroke-opacity=".48" stroke-width="2"/>',
      '<line x1="' + (W/2+(isWide?105:82)) + '" y1="' + (layout.competitionY-9) + '" x2="' + (W/2+(isWide?235:170)) + '" y2="' + (layout.competitionY-9) + '" stroke="#77bfff" stroke-opacity=".62" stroke-width="2"/>',
      '<text x="' + (W/2) + '" y="' + layout.competitionY + '" text-anchor="middle" fill="#ffffff" fill-opacity=".78" font-size="' + (isWide?20:isStory?19:15) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="' + (isWide?7:4) + '">' + competition + '</text>',

      '<text x="' + leftNameX + '" y="' + layout.teamNameY + '" text-anchor="middle" fill="#ffffff" font-size="' + teamSize + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" filter="url(#classic-title-shadow)">' + homeName + '</text>',
      '<line x1="' + (leftNameX-(isWide?170:120)) + '" y1="' + (layout.teamNameY+22) + '" x2="' + (leftNameX+(isWide?170:120)) + '" y2="' + (layout.teamNameY+22) + '" stroke="' + home.accent + '" stroke-opacity=".62" stroke-width="2"/>',
      '<text x="' + rightNameX + '" y="' + layout.teamNameY + '" text-anchor="middle" fill="#ffffff" font-size="' + teamSize + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" filter="url(#classic-title-shadow)">' + awayName + '</text>',
      '<line x1="' + (rightNameX-(isWide?170:120)) + '" y1="' + (layout.teamNameY+22) + '" x2="' + (rightNameX+(isWide?170:120)) + '" y2="' + (layout.teamNameY+22) + '" stroke="' + away.accent + '" stroke-opacity=".62" stroke-width="2"/>',

      '<g filter="url(#classic-soft-shadow)">' + placedJersey(leftJersey,layout.leftX,layout.jerseyY,layout.jerseySize) + '</g>',
      '<g filter="url(#classic-soft-shadow)">' + placedJersey(rightJersey,layout.rightX,layout.jerseyY,layout.jerseySize) + '</g>',

      '<ellipse cx="' + (W/2) + '" cy="' + layout.vsY + '" rx="' + (isWide?105:78) + '" ry="' + (isWide?72:58) + '" fill="#2f8fff" opacity=".30" filter="url(#classic-blue-glow)"/>',
      '<path d="M' + (W/2) + ' ' + (layout.vsY-(isWide?118:88)) + ' L' + (W/2-(isWide?82:60)) + ' ' + (layout.vsY+(isWide?90:68)) + ' L' + (W/2+(isWide?82:60)) + ' ' + (layout.vsY+(isWide?90:68)) + ' Z" fill="#0a1522" fill-opacity=".48" stroke="#8fcbff" stroke-opacity=".30"/>',
      '<text x="' + (W/2) + '" y="' + (layout.vsY + vsSize*.30) + '" text-anchor="middle" fill="url(#classic-vs)" font-size="' + vsSize + '" font-weight="1000" font-style="italic" font-family="Arial Black,Arial,Helvetica,sans-serif" letter-spacing="-5" filter="url(#classic-title-shadow)">VS</text>',
      '<text x="' + (W/2) + '" y="' + layout.metaY + '" text-anchor="middle" fill="#ffffff" font-size="' + metaSize + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" letter-spacing="' + (isWide?3:1) + '">' + date + ' · ' + time + '</text>',

      stream ? '<g><rect x="' + (W/2-streamWidth/2) + '" y="' + streamY + '" width="' + streamWidth + '" height="' + streamHeight + '" rx="' + (streamHeight/2) + '" fill="#06101b" fill-opacity=".82" stroke="#8fc8ff" stroke-opacity=".42"/><circle cx="' + (W/2-streamWidth/2+32) + '" cy="' + (streamY+streamHeight/2) + '" r="8" fill="#ff4d5f"/><circle cx="' + (W/2-streamWidth/2+32) + '" cy="' + (streamY+streamHeight/2) + '" r="15" fill="#ff4d5f" opacity=".15"/><text x="' + (W/2) + '" y="' + (streamY+streamHeight/2+6) + '" text-anchor="middle" fill="#ffffff" font-size="' + (isStory?20:isWide?18:15) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">' + stream + '</text><path d="M' + (W/2+streamWidth/2-42) + ' ' + (streamY+streamHeight/2-7) + ' l8 7 -8 7" fill="none" stroke="#a9d5ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>' : '',

      '<rect x="' + panelX + '" y="' + panelY + '" width="' + panelW + '" height="' + panelH + '" rx="' + (isWide?28:22) + '" fill="#06101b" fill-opacity=".42" stroke="#9ccfff" stroke-opacity=".26"/>',
      '<line x1="' + (W/2-(isWide?270:160)) + '" y1="' + (lineupTitleY-6) + '" x2="' + (W/2-(isWide?90:65)) + '" y2="' + (lineupTitleY-6) + '" stroke="#ffffff" stroke-opacity=".34" stroke-width="2"/>',
      '<line x1="' + (W/2+(isWide?90:65)) + '" y1="' + (lineupTitleY-6) + '" x2="' + (W/2+(isWide?270:160)) + '" y2="' + (lineupTitleY-6) + '" stroke="#72b9ff" stroke-opacity=".44" stroke-width="2"/>',
      '<text x="' + (W/2) + '" y="' + lineupTitleY + '" text-anchor="middle" fill="#ffffff" fill-opacity=".90" font-size="' + (isStory?23:isWide?19:16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="' + (isWide?7:4) + '">STARTING SIX</text>',
      lineup,

      '<line x1="' + (W/2-(isWide?330:210)) + '" y1="' + (footerY-6) + '" x2="' + (W/2-(isWide?150:100)) + '" y2="' + (footerY-6) + '" stroke="#ffffff" stroke-opacity=".28"/>',
      '<line x1="' + (W/2+(isWide?150:100)) + '" y1="' + (footerY-6) + '" x2="' + (W/2+(isWide?330:210)) + '" y2="' + (footerY-6) + '" stroke="#ffffff" stroke-opacity=".28"/>',
      '<text x="' + (W/2) + '" y="' + footerY + '" text-anchor="middle" fill="#ffffff" fill-opacity=".48" font-size="' + (isWide?15:isStory?14:12) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="' + (isWide?5:3) + '">SVENSK eHOCKEY · MATCH GRAPHICS</text>',
      '<rect width="' + W + '" height="' + H + '" fill="url(#classic-vignette)" pointer-events="none"/>',
      '</svg>'
    ].join("");
  }


  function templateContext() {
    const own = teamById(state.teamId);
    const opponent = teamById(state.opponentId);
    const home = state.ownSide === "home" ? own : opponent;
    const away = state.ownSide === "home" ? opponent : own;
    const format = FORMATS[state.format] || FORMATS.square;
    return {
      own,opponent,home,away,
      ownVariant:state.ownSide === "home" ? "home" : "away",
      W:format.width,H:format.height,
      badge:esc(cleanText(state.badge,20).toUpperCase() || "MATCHDAY"),
      competition:esc(cleanText(state.competition,28).toUpperCase() || "SVENSK eHOCKEY"),
      date:esc(formatDate(state.date)),
      time:esc(cleanText(state.time,5) || "20:00"),
      stream:esc(streamLabel()),
      background:state.background
    };
  }

  function commonTemplateDefs(ctx, id) {
    return [
      '<defs>',
      '<linearGradient id="' + id + '-bg" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0" stop-color="' + ctx.own.primary + '"/><stop offset=".52" stop-color="#080c11"/><stop offset="1" stop-color="' + ctx.opponent.primary + '"/>',
      '</linearGradient>',
      '<radialGradient id="' + id + '-light" cx="50%" cy="30%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".58" stop-color="#fff" stop-opacity=".015"/><stop offset="1" stop-color="#000" stop-opacity=".36"/></radialGradient>',
      '<pattern id="' + id + '-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" stroke-opacity=".022"/></pattern>',
      '<filter id="' + id + '-blur"><feGaussianBlur stdDeviation="34"/></filter>',
      '</defs>'
    ].join("");
  }

  function templateStream(ctx, y, wide = false) {
    if (!ctx.stream) return "";
    const width = wide ? Math.min(ctx.W * .62,720) : Math.min(ctx.W * .44,520);
    const height = state.format === "story" ? 54 : 44;
    return [
      '<g>',
      '<rect x="' + (ctx.W/2-width/2) + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="' + (height/2) + '" fill="#090d12" fill-opacity=".84" stroke="#fff" stroke-opacity=".13"/>',
      '<circle cx="' + (ctx.W/2-width/2+28) + '" cy="' + (y+height/2) + '" r="7" fill="#ff4d5f"/>',
      '<text x="' + (ctx.W/2+8) + '" y="' + (y+height/2+6) + '" text-anchor="middle" fill="#fff" font-size="' + (state.format === "story" ? 20 : 16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.1">' + ctx.stream + '</text>',
      '</g>'
    ].join("");
  }

  function svgLogo(team,x,y,size,opacity=1) {
    const url = logoUrl(team.name);
    if (!url) return '<text x="' + (x+size/2) + '" y="' + (y+size*.62) + '" text-anchor="middle" fill="#fff" fill-opacity="' + opacity + '" font-size="' + (size*.28) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + esc(initials(team.name)) + '</text>';
    return '<image href="' + esc(url) + '" x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" opacity="' + opacity + '" preserveAspectRatio="xMidYMid meet"/>';
  }

  function focusLineupMarkup(ctx, y) {
    if (state.lineupStyle === "portraits") {
      return state.format === "story"
        ? lineupPortraitStory(y,ctx.own,ctx.ownVariant)
        : lineupPortraitSquare(ctx.W,y,ctx.own,ctx.ownVariant);
    }
    const useJerseys = state.lineupStyle === "jerseys";
    if (state.format === "landscape") {
      const margin=110,gap=18,slot=(ctx.W-margin*2-gap*5)/6;
      return POSITIONS.map((pos,index) => {
        const x=margin+index*(slot+gap);
        const name=cleanText(state.lineup[pos],18) || "—";
        if (useJerseys) {
          const size=Math.min(232,slot);
          const jersey=premiumJerseySvg(ctx.own,{variant:ctx.ownVariant,side:"back",compact:true,playerName:name==="—"?"PLAYER":name,playerNumber:state.lineupNumbers[pos] || " "});
          return placedJersey(jersey,x+(slot-size)/2,y,size) +
            '<text x="' + (x+slot/2) + '" y="' + (y+size+22) + '" text-anchor="middle" fill="#fff" font-size="15" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text>';
        }
        return '<g transform="translate(' + x + ' ' + y + ')"><rect width="' + slot + '" height="132" rx="22" fill="#fff" fill-opacity=".075" stroke="#fff" stroke-opacity=".12"/><text x="18" y="34" fill="#fff" fill-opacity=".58" font-size="14" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text><text x="18" y="88" fill="#fff" font-size="24" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + esc(name) + '</text></g>';
      }).join("");
    }

    const cols = state.format === "story" ? 2 : 3;
    const margin = state.format === "story" ? 84 : 54;
    const gapX = state.format === "story" ? 24 : 18;
    const gapY = state.format === "story" ? 24 : 16;
    const slot=(ctx.W-margin*2-gapX*(cols-1))/cols;
    const jerseySize=state.format === "story" ? Math.min(270,slot) : Math.min(230,slot);
    const cardH=state.format === "story" ? 138 : 118;
    const rowStep=useJerseys ? jerseySize+44 : cardH+gapY;

    return POSITIONS.map((pos,index) => {
      const col=index%cols,row=Math.floor(index/cols);
      const x=margin+col*(slot+gapX);
      const yy=y+row*rowStep;
      const name=cleanText(state.lineup[pos],18) || "—";
      if (useJerseys) {
        const jersey=premiumJerseySvg(ctx.own,{variant:ctx.ownVariant,side:"back",compact:true,playerName:name==="—"?"PLAYER":name,playerNumber:state.lineupNumbers[pos] || " "});
        return placedJersey(jersey,x+(slot-jerseySize)/2,yy,jerseySize) +
          '<text x="' + (x+slot/2) + '" y="' + (yy+jerseySize+22) + '" text-anchor="middle" fill="#fff" font-size="' + (state.format === "story" ? 18 : 14) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text>';
      }
      return '<g transform="translate(' + x + ' ' + yy + ')"><rect width="' + slot + '" height="' + cardH + '" rx="20" fill="#fff" fill-opacity=".075" stroke="#fff" stroke-opacity=".12"/><text x="16" y="32" fill="#fff" fill-opacity=".58" font-size="13" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + pos + '</text><text x="16" y="' + (cardH-28) + '" fill="#fff" font-size="' + (state.format === "story" ? 25 : 18) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + esc(name) + '</text></g>';
    }).join("");
  }

  function buildStartingSixSvg() {
    const ctx=templateContext();
    const ownName=esc(ctx.own.name),oppName=esc(ctx.opponent.name);
    const isStory=state.format==="story",isWide=state.format==="landscape";
    const heroSize=isWide?470:isStory?520:390;
    const heroX=isWide?70:(ctx.W-heroSize)/2;
    const heroY=isWide?170:isStory?260:160;
    const lineupY=isWide?620:isStory?830:500;
    const opponentLogoSize=isWide?115:isStory?130:88;
    const opponentLogoX=isWide?ctx.W-240:ctx.W-opponentLogoSize-58;
    const opponentLogoY=isWide?112:isStory?180:102;
    const hero=premiumJerseySvg(ctx.own,{variant:ctx.ownVariant,side:"front",compact:false});

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + ctx.W + '" height="' + ctx.H + '" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '">',
      commonTemplateDefs(ctx,"focus"),
      backgroundImageSvg(ctx.W,ctx.H,1),
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="#05080c" opacity=".68"/>',
      '<circle cx="' + (ctx.W*.22) + '" cy="' + (ctx.H*.28) + '" r="' + (ctx.W*.32) + '" fill="' + ctx.own.primary + '" opacity=".42" filter="url(#focus-blur)"/>',
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="url(#focus-light)"/>',
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="url(#focus-grid)"/>',
      '<text x="' + (isWide?80:ctx.W/2) + '" y="' + (isStory?104:64) + '" text-anchor="' + (isWide?"start":"middle") + '" fill="#fff" font-size="' + (isWide?62:isStory?58:44) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">' + ctx.badge + '</text>',
      '<text x="' + (isWide?82:ctx.W/2) + '" y="' + (isStory?154:102) + '" text-anchor="' + (isWide?"start":"middle") + '" fill="#fff" fill-opacity=".55" font-size="' + (isWide?18:15) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">' + ctx.competition + '</text>',
      placedJersey(hero,heroX,heroY,heroSize),
      isWide ? '<text x="610" y="250" fill="#fff" font-size="54" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + ownName + '</text>' : '',
      '<g><text x="' + (opponentLogoX+opponentLogoSize/2) + '" y="' + (opponentLogoY-18) + '" text-anchor="middle" fill="#fff" fill-opacity=".46" font-size="13" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">MOT</text>' +
        svgLogo(ctx.opponent,opponentLogoX,opponentLogoY,opponentLogoSize,.9) +
        '<text x="' + (opponentLogoX+opponentLogoSize/2) + '" y="' + (opponentLogoY+opponentLogoSize+28) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?22:17) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + oppName + '</text></g>',
      '<text x="' + (isWide?610:ctx.W/2) + '" y="' + (isWide?324:isStory?740:510) + '" text-anchor="' + (isWide?"start":"middle") + '" fill="#fff" font-size="' + (isWide?36:isStory?30:24) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + ctx.date + ' · ' + ctx.time + '</text>',
      templateStream(ctx,isWide?355:(isStory?765:530),isWide),
      '<text x="' + (isWide?610:ctx.W/2) + '" y="' + (lineupY-26) + '" text-anchor="' + (isWide?"start":"middle") + '" fill="#fff" fill-opacity=".63" font-size="' + (isWide?18:isStory?22:16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">STARTING SIX · ' + ownName.toUpperCase() + '</text>',
      focusLineupMarkup(ctx,lineupY),
      '<text x="' + (ctx.W/2) + '" y="' + (ctx.H-28) + '" text-anchor="middle" fill="#fff" fill-opacity=".3" font-size="13" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">SVENSK eHOCKEY · STARTING SIX</text>',
      '</svg>'
    ].join("");
  }

  function buildVersusSvg() {
    const ctx=templateContext();
    const isStory=state.format==="story",isWide=state.format==="landscape";
    const leftTeam=ctx.home,rightTeam=ctx.away;
    const leftSize=isWide?560:isStory?520:460;
    const rightSize=leftSize;
    const leftX=isWide?110:isStory?30:20;
    const rightX=isWide?ctx.W-rightSize-110:isStory?ctx.W-rightSize-30:ctx.W-rightSize-20;
    const jerseyY=isStory?410:(isWide?190:205);
    const lineupY=isStory?1160:(isWide?855:855);
    const left=premiumJerseySvg(leftTeam,{variant:"home",side:"front",compact:false});
    const right=premiumJerseySvg(rightTeam,{variant:"away",side:"front",compact:false});
    const lineup=lineupForTemplate(ctx.W,lineupY,ctx.own,ctx.ownVariant);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + ctx.W + '" height="' + ctx.H + '" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '">',
      commonTemplateDefs(ctx,"versus"),
      backgroundImageSvg(ctx.W,ctx.H,1),
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="#05080c" opacity=".58"/>',
      '<path d="M0 0 H' + (ctx.W*.56) + ' L' + (ctx.W*.44) + ' ' + ctx.H + ' H0Z" fill="' + leftTeam.primary + '" opacity=".38"/>',
      '<path d="M' + (ctx.W*.56) + ' 0 H' + ctx.W + ' V' + ctx.H + ' H' + (ctx.W*.44) + 'Z" fill="' + rightTeam.primary + '" opacity=".38"/>',
      '<path d="M' + (ctx.W*.505) + ' 0 L' + (ctx.W*.46) + ' ' + ctx.H + '" stroke="#fff" stroke-opacity=".08" stroke-width="' + (isWide?18:10) + '"/>',
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="url(#versus-light)"/>',
      '<text x="' + (ctx.W/2) + '" y="' + (isStory?105:65) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?58:isWide?64:46) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">' + ctx.badge + '</text>',
      '<text x="' + (ctx.W/2) + '" y="' + (isStory?155:105) + '" text-anchor="middle" fill="#fff" fill-opacity=".55" font-size="16" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">' + ctx.competition + '</text>',
      '<text x="' + (leftX+leftSize/2) + '" y="' + (jerseyY-18) + '" text-anchor="middle" fill="#fff" font-size="' + (isWide?34:27) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + esc(leftTeam.name) + '</text>',
      '<text x="' + (rightX+rightSize/2) + '" y="' + (jerseyY-18) + '" text-anchor="middle" fill="#fff" font-size="' + (isWide?34:27) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + esc(rightTeam.name) + '</text>',
      placedJersey(left,leftX,jerseyY,leftSize),
      placedJersey(right,rightX,jerseyY,rightSize),
      '<circle cx="' + (ctx.W/2) + '" cy="' + (isStory?700:isWide?460:450) + '" r="' + (isWide?92:68) + '" fill="#07090c" stroke="#fff" stroke-opacity=".16"/>',
      '<text x="' + (ctx.W/2) + '" y="' + (isStory?723:isWide?490:473) + '" text-anchor="middle" fill="#fff" font-size="' + (isWide?104:76) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">VS</text>',
      '<text x="' + (ctx.W/2) + '" y="' + (isStory?835:isWide?585:570) + '" text-anchor="middle" fill="#fff" font-size="' + (isWide?38:isStory?32:26) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + ctx.date + ' · ' + ctx.time + '</text>',
      templateStream(ctx,isStory?872:(isWide?610:595),true),
      '<text x="' + (ctx.W/2) + '" y="' + (lineupY-26) + '" text-anchor="middle" fill="#fff" fill-opacity=".62" font-size="' + (isStory?22:16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">STARTING SIX · ' + esc(ctx.own.name).toUpperCase() + '</text>',
      lineup,
      '</svg>'
    ].join("");
  }

  function buildBroadcastSvg() {
    const ctx=templateContext();
    const isStory=state.format==="story",isWide=state.format==="landscape";
    const topH=isStory?560:state.format==="square"?380:350;
    const homeLogo=isStory?150:110;
    const logoY=isStory?185:120;
    const jerseySize=isStory?250:isWide?250:190;
    const leftJ=premiumJerseySvg(ctx.home,{variant:"home",side:"front",compact:true});
    const rightJ=premiumJerseySvg(ctx.away,{variant:"away",side:"front",compact:true});
    const lineupY=isStory?1040:isWide?725:700;
    const lineup=lineupForTemplate(ctx.W,lineupY,ctx.own,ctx.ownVariant);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + ctx.W + '" height="' + ctx.H + '" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '">',
      commonTemplateDefs(ctx,"broadcast"),
      backgroundImageSvg(ctx.W,ctx.H,1),
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="#05080c" opacity=".72"/>',
      '<rect width="' + ctx.W + '" height="' + topH + '" fill="url(#broadcast-bg)" opacity=".72"/>',
      '<rect x="0" y="' + (topH-8) + '" width="' + ctx.W + '" height="8" fill="#fff" fill-opacity=".08"/>',
      '<text x="' + (ctx.W/2) + '" y="' + (isStory?85:58) + '" text-anchor="middle" fill="#fff" fill-opacity=".58" font-size="15" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="4">' + ctx.competition + '</text>',
      '<text x="' + (ctx.W/2) + '" y="' + (isStory?145:105) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?54:isWide?56:42) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + ctx.badge + '</text>',
      svgLogo(ctx.home,ctx.W*.21-homeLogo/2,logoY,homeLogo,.95),
      svgLogo(ctx.away,ctx.W*.79-homeLogo/2,logoY,homeLogo,.95),
      placedJersey(leftJ,ctx.W*.21-jerseySize/2,logoY+homeLogo-20,jerseySize),
      placedJersey(rightJ,ctx.W*.79-jerseySize/2,logoY+homeLogo-20,jerseySize),
      '<text x="' + (ctx.W*.21) + '" y="' + (logoY+homeLogo+jerseySize+10) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?25:19) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + esc(ctx.home.name) + '</text>',
      '<text x="' + (ctx.W*.79) + '" y="' + (logoY+homeLogo+jerseySize+10) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?25:19) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + esc(ctx.away.name) + '</text>',
      '<text x="' + (ctx.W/2) + '" y="' + (logoY+homeLogo+55) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?58:48) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">VS</text>',
      '<text x="' + (ctx.W/2) + '" y="' + (topH+75) + '" text-anchor="middle" fill="#fff" font-size="' + (isStory?34:isWide?34:27) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + ctx.date + ' · ' + ctx.time + '</text>',
      ctx.stream ? '<g><rect x="' + (ctx.W*.12) + '" y="' + (topH+108) + '" width="' + (ctx.W*.76) + '" height="' + (isStory?92:72) + '" rx="18" fill="#ff4d5f" fill-opacity=".12" stroke="#ff6c78" stroke-opacity=".45"/><text x="' + (ctx.W*.16) + '" y="' + (topH+(isStory?165:153)) + '" fill="#ff6c78" font-size="' + (isStory?23:18) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">LIVE</text><text x="' + (ctx.W*.25) + '" y="' + (topH+(isStory?165:153)) + '" fill="#fff" font-size="' + (isStory?26:isWide?25:20) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + ctx.stream.replace(/^LIVE · /,"") + '</text></g>' : '',
      '<text x="' + (ctx.W*.08) + '" y="' + (lineupY-30) + '" fill="#fff" fill-opacity=".54" font-size="' + (isStory?22:16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">LINEUP · ' + esc(ctx.own.name).toUpperCase() + '</text>',
      lineup,
      '<rect x="0" y="' + (ctx.H-58) + '" width="' + ctx.W + '" height="58" fill="#fff" fill-opacity=".035"/>',
      '<text x="' + (ctx.W*.06) + '" y="' + (ctx.H-22) + '" fill="#fff" fill-opacity=".42" font-size="13" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">SVENSK eHOCKEY BROADCAST</text>',
      '</svg>'
    ].join("");
  }

  function buildMinimalSvg() {
    const ctx=templateContext();
    const isStory=state.format==="story",isWide=state.format==="landscape";
    const jerseySize=isWide?520:isStory?600:470;
    const jerseyX=isWide?ctx.W*.08:isStory?(ctx.W-jerseySize)/2:-15;
    const jerseyY=isWide?205:isStory?320:225;
    const ownJ=premiumJerseySvg(ctx.own,{variant:ctx.ownVariant,side:"front",compact:false});
    const lineupY=isStory?1150:isWide?790:825;
    const lineup=lineupForTemplate(ctx.W,lineupY,ctx.own,ctx.ownVariant);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + ctx.W + '" height="' + ctx.H + '" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '">',
      commonTemplateDefs(ctx,"minimal"),
      backgroundImageSvg(ctx.W,ctx.H,1),
      '<rect width="' + ctx.W + '" height="' + ctx.H + '" fill="#f3f1eb" opacity=".86"/>',
      '<rect x="0" y="0" width="' + (isWide?ctx.W*.46:ctx.W) + '" height="' + (isWide?ctx.H:ctx.H*.56) + '" fill="' + ctx.own.primary + '" opacity=".91"/>',
      '<circle cx="' + (isWide?ctx.W*.23:ctx.W*.5) + '" cy="' + (isWide?ctx.H*.44:ctx.H*.27) + '" r="' + (isWide?ctx.W*.20:ctx.W*.38) + '" fill="' + ctx.own.accent + '" opacity=".12"/>',
      placedJersey(ownJ,jerseyX,jerseyY,jerseySize),
      '<text x="' + (isWide?ctx.W*.53:54) + '" y="' + (isWide?140:isStory?90:72) + '" fill="' + (isWide?"#101318":"#fff") + '" font-size="' + (isWide?70:isStory?58:44) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">' + ctx.badge + '</text>',
      '<text x="' + (isWide?ctx.W*.53:58) + '" y="' + (isWide?190:isStory?140:110) + '" fill="' + (isWide?"#59616b":"#fff") + '" fill-opacity="' + (isWide?1:.62) + '" font-size="16" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">' + ctx.competition + '</text>',
      '<text x="' + (isWide?ctx.W*.53:ctx.W*.52) + '" y="' + (isWide?330:isStory?955:620) + '" fill="' + (isWide?"#101318":"#101318") + '" font-size="' + (isWide?50:isStory?46:36) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + esc(ctx.own.name) + '</text>',
      '<text x="' + (isWide?ctx.W*.53:ctx.W*.52) + '" y="' + (isWide?390:isStory?1005:668) + '" fill="#7a828a" font-size="' + (isWide?24:isStory?22:18) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif">mot ' + esc(ctx.opponent.name) + '</text>',
      svgLogo(ctx.opponent,isWide?ctx.W*.84:(ctx.W-130),isWide?255:(isStory?930:590),isWide?135:90,.95),
      '<text x="' + (isWide?ctx.W*.53:ctx.W*.52) + '" y="' + (isWide?475:isStory?1070:735) + '" fill="#101318" font-size="' + (isWide?32:isStory?30:24) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + ctx.date + ' · ' + ctx.time + '</text>',
      ctx.stream ? '<text x="' + (isWide?ctx.W*.53:ctx.W*.52) + '" y="' + (isWide?525:isStory?1110:775) + '" fill="#c43543" font-size="' + (isWide?20:isStory?19:15) + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif">' + ctx.stream + '</text>' : '',
      '<rect x="' + (isWide?ctx.W*.48:24) + '" y="' + (lineupY-62) + '" width="' + (isWide?ctx.W*.49:ctx.W-48) + '" height="' + (ctx.H-lineupY+34) + '" rx="24" fill="#101318"/>',
      '<text x="' + (isWide?ctx.W*.725:ctx.W/2) + '" y="' + (lineupY-26) + '" text-anchor="middle" fill="#ffffff" fill-opacity=".58" font-size="' + (isStory?22:16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">STARTING SIX</text>',
      '<g>' + lineup + '</g>',
      '</svg>'
    ].join("");
  }

  function buildMatchSvg() {
    if (state.template === "starting-six") return buildStartingSixSvg();
    if (state.template === "versus") return buildVersusSvg();
    if (state.template === "broadcast") return buildBroadcastSvg();
    if (state.template === "minimal") return buildMinimalSvg();
    return buildClassicSvg();
  }

  function render() {
    $("#graphicPreview").innerHTML = buildMatchSvg();
    $("#previewSize").textContent = FORMATS[state.format].label;
    const team = teamById(state.teamId);
    const rosterCount = rosterFor(state.teamId).length;
    $("#ownTeamHint").textContent =
      team.name +
      (team.division ? " · " + team.division : "") +
      " · " + rosterCount + " spelare";
  }

  function fillTeamSelect(select, selected) {
    select.innerHTML = teamDirectory.map(team =>
      '<option value="' + esc(team.id) + '"' + (team.id === selected ? ' selected' : '') + '>' +
      esc(team.name) + (team.division ? ' · ' + esc(team.division) : '') +
      '</option>'
    ).join("");
  }

  function fillFormatSelect() {
    $("#formatSelect").innerHTML = Object.entries(FORMATS).map(([key,value]) =>
      '<option value="' + key + '"' + (key === state.format ? ' selected' : '') + '>' + value.label + '</option>'
    ).join("");
  }

  function lineupOptions(position) {
    const players = rosterFor(state.teamId);
    const selectedElsewhere = new Set(
      POSITIONS.filter(pos => pos !== position)
        .map(pos => state.lineup[pos])
        .filter(Boolean)
        .map(normalize)
    );
    const current = state.lineup[position] || "";
    return [
      '<option value="">— Välj spelare —</option>',
      ...players.map(player =>
        '<option value="' + esc(player) + '"' +
        (normalize(player) === normalize(current) ? ' selected' : '') +
        (selectedElsewhere.has(normalize(player)) ? ' disabled' : '') +
        '>' + esc(player) + '</option>'
      )
    ].join("");
  }

  function syncLineupSelects() {
    POSITIONS.forEach(pos => {
      const select = $('[data-lineup="' + pos + '"]');
      if (!select) return;
      const roster = rosterFor(state.teamId);
      if (state.lineup[pos] && !roster.some(player => normalize(player) === normalize(state.lineup[pos]))) {
        state.lineup[pos] = "";
      }
      select.innerHTML = lineupOptions(pos);
      select.disabled = !roster.length;
    });
  }

  function syncForm() {
    fillTeamSelect($("#teamSelect"),state.teamId);
    fillTeamSelect($("#opponentSelect"),state.opponentId);
    fillFormatSelect();
    $("#sideSelect").value = state.ownSide;
    $("#competitionInput").value = state.competition;
    $("#badgeSelect").value = state.badge;
    $("#dateInput").value = state.date;
    $("#timeInput").value = state.time;
    $("#lineupStyleSelect").value = state.lineupStyle;
    $("#streamPlatformSelect").value = state.streamPlatform;
    $("#streamChannelInput").value = state.streamChannel;
    $("#streamChannelInput").disabled = state.streamPlatform === "none";
    $$("[data-template]").forEach(button => {
      button.classList.toggle("is-active",button.dataset.template === state.template);
      button.setAttribute("aria-pressed",button.dataset.template === state.template ? "true" : "false");
    });
    $$("[data-background]").forEach(button => {
      const id = button.dataset.background;
      button.classList.toggle("is-active",id === state.background);
      button.setAttribute("aria-pressed",id === state.background ? "true" : "false");
      const preview = button.querySelector(".background-thumb");
      if (preview) preview.style.backgroundImage = 'url("' + backgroundUrl(id) + '")';
    });
    syncLineupSelects();
    POSITIONS.forEach(pos => {
      const input = $('[data-lineup-number="' + pos + '"]');
      if (input) input.value = state.lineupNumbers[pos] || "";
    });
    applyAccessMode();
  }

  function ensureDifferentTeams(changed) {
    if (state.teamId !== state.opponentId) return;
    const replacement = teamDirectory.find(team => team.id !== (changed === "team" ? state.teamId : state.opponentId));
    if (!replacement) return;
    if (changed === "team") state.opponentId = replacement.id;
    else state.teamId = replacement.id;
  }

  function reset() {
    const preferred = teamDirectory.find(team => normalize(team.name) === normalize("Carolus Icemen")) || teamDirectory[0];
    state.teamId = preferred?.id || "";
    state.opponentId = teamDirectory.find(team => team.id !== state.teamId)?.id || state.teamId;
    state.ownSide = "home";
    state.competition = "ECL 27 Winter";
    state.badge = "MATCHDAY";
    state.date = "2026-10-01";
    state.time = "20:00";
    state.format = "square";
    state.template = "classic";
    state.background = "arena";
    state.lineupStyle = "cards";
    state.lineupNumbers = {...EMPTY_NUMBERS};
    state.streamPlatform = "none";
    state.streamChannel = "";
    applyAccessMode();
    setDefaultLineup();
    syncForm();
    render();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1200);
  }

  function exportSvg() {
    const own = teamById(state.teamId);
    const opponent = teamById(state.opponentId);
    const filename = "seh-" + safeFilePart(own.name) + "-vs-" + safeFilePart(opponent.name) + "-" + state.format + ".svg";
    downloadBlob(new Blob([buildMatchSvg()],{type:"image/svg+xml;charset=utf-8"}),filename);
  }

  function fileToDataUrl(blob) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function inlineSvgImages(svgText) {
    const doc = new DOMParser().parseFromString(svgText,"image/svg+xml");
    const images = [...doc.querySelectorAll("image")];
    await Promise.all(images.map(async image => {
      const href = image.getAttribute("href") || image.getAttributeNS("http://www.w3.org/1999/xlink","href");
      if (!href || href.startsWith("data:")) return;
      try {
        const absolute = new URL(href,location.href).href;
        const response = await fetch(absolute,{cache:"force-cache"});
        if (!response.ok) return;
        const dataUrl = await fileToDataUrl(await response.blob());
        image.setAttribute("href",dataUrl);
      } catch (_) {}
    }));
    return new XMLSerializer().serializeToString(doc.documentElement);
  }

  async function exportPng() {
    const button = $("#pngButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Skapar PNG…";
    try {
      const format = FORMATS[state.format];
      const inlined = await inlineSvgImages(buildMatchSvg());
      const url = URL.createObjectURL(new Blob([inlined],{type:"image/svg+xml;charset=utf-8"}));
      const image = new Image();
      await new Promise((resolve,reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = format.width;
      canvas.height = format.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image,0,0,format.width,format.height);
      URL.revokeObjectURL(url);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/png",1));
      if (!blob) throw new Error("PNG-export misslyckades");
      const own = teamById(state.teamId);
      const opponent = teamById(state.opponentId);
      downloadBlob(blob,"seh-" + safeFilePart(own.name) + "-vs-" + safeFilePart(opponent.name) + "-" + state.format + ".png");
    } catch (error) {
      console.error(error);
      alert("Kunde inte skapa PNG. SVG-exporten fungerar fortfarande.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  $$("[data-background]").forEach(button => {
    button.addEventListener("click",() => {
      const id = button.dataset.background;
      state.background = BACKGROUNDS.some(item => item.id === id) ? id : "arena";
      syncForm();
      render();
    });
  });

  $$("[data-template]").forEach(button => {
    button.addEventListener("click",() => {
      const template = button.dataset.template;
      state.template = ["classic","starting-six","versus","broadcast","minimal"].includes(template)
        ? template
        : "classic";
      syncForm();
      render();
    });
  });

  $("#teamSelect").addEventListener("change",async event => {
    state.teamId = event.target.value;
    ensureDifferentTeams("team");
    await Promise.all([
      ensureTeamPalette(teamById(state.teamId)),
      ensureTeamPalette(teamById(state.opponentId))
    ]);
    setDefaultLineup();
    await hydratePlayerPortraits(state.teamId);
    syncForm();
    render();
  });

  $("#opponentSelect").addEventListener("change",async event => {
    state.opponentId = event.target.value;
    ensureDifferentTeams("opponent");
    await Promise.all([
      ensureTeamPalette(teamById(state.teamId)),
      ensureTeamPalette(teamById(state.opponentId))
    ]);
    syncForm();
    render();
  });

  $("#sideSelect").addEventListener("change",event => {
    state.ownSide = event.target.value === "away" ? "away" : "home";
    render();
  });

  $("#competitionInput").addEventListener("input",event => {
    state.competition = event.target.value;
    render();
  });

  $("#badgeSelect").addEventListener("change",event => {
    state.badge = event.target.value;
    render();
  });

  $("#dateInput").addEventListener("input",event => {
    state.date = event.target.value;
    render();
  });

  $("#timeInput").addEventListener("input",event => {
    state.time = event.target.value;
    render();
  });

  $("#formatSelect").addEventListener("change",event => {
    state.format = FORMATS[event.target.value] ? event.target.value : "square";
    render();
  });

  $("#lineupStyleSelect").addEventListener("change",async event => {
    state.lineupStyle = ["jerseys","portraits"].includes(event.target.value)
      ? event.target.value
      : "cards";
    if (state.lineupStyle === "portraits") await hydratePlayerPortraits(state.teamId);
    render();
  });

  $("#streamPlatformSelect").addEventListener("change",event => {
    state.streamPlatform = ["twitch","youtube","kick","other"].includes(event.target.value)
      ? event.target.value
      : "none";
    $("#streamChannelInput").disabled = state.streamPlatform === "none";
    render();
  });

  $("#streamChannelInput").addEventListener("input",event => {
    state.streamChannel = event.target.value;
    render();
  });

  $$("[data-lineup]").forEach(select => {
    select.addEventListener("change",event => {
      const pos = event.target.dataset.lineup;
      const player = event.target.value;
      if (player) {
        for (const other of POSITIONS) {
          if (other !== pos && normalize(state.lineup[other]) === normalize(player)) {
            state.lineup[other] = "";
          }
        }
      }
      state.lineup[pos] = player;
      syncLineupSelects();
      render();
    });
  });

  $$("[data-lineup-number]").forEach(input => {
    input.addEventListener("input",event => {
      const pos = event.target.dataset.lineupNumber;
      const value = String(event.target.value || "").replace(/\D/g,"").slice(0,2);
      event.target.value = value;
      state.lineupNumbers[pos] = value;
      render();
    });
  });

  $("#resetButton").addEventListener("click",reset);
  $("#svgButton").addEventListener("click",exportSvg);
  $("#pngButton").addEventListener("click",exportPng);

  syncForm();
  render();
  loadLagbyggeData();
})();
