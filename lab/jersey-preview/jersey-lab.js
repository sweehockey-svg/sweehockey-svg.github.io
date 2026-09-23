(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const JERSEY_PRESETS = [
    { id:"carolus", name:"Carolus Icemen", code:"CI", primary:"#123b67", accent:"#c99a32", trim:"#f3f4f2", pattern:"shoulder" },
    { id:"shadow", name:"Shadow skulls", code:"SS", primary:"#090b0d", accent:"#c52e33", trim:"#f1f1ef", pattern:"diagonal" },
    { id:"vasteras", name:"Västerås IK", code:"VIK", primary:"#0b0c0d", accent:"#f0c400", trim:"#f3f3ef", pattern:"classic" },
    { id:"nordic", name:"Nordic Nosebleed", code:"NNB", primary:"#102b48", accent:"#b62d31", trim:"#eef2f4", pattern:"shoulder" },
    { id:"ssk", name:"SSK Academy", code:"SSK", primary:"#123f83", accent:"#f1c21b", trim:"#f4f4ef", pattern:"classic" }
  ];
  let teamDirectory = [...JERSEY_PRESETS];
  let rostersByTeamId = new Map();
  let playerKeysByName = new Map();

  const LOCKER = [
    { pos:"G", name:"Rootmos", number:"30" },
    { pos:"LD", name:"I-Ashborn-I", number:"21" },
    { pos:"RD", name:"KabbeTV", number:"6" },
    { pos:"LW", name:"Bulten_49", number:"17" },
    { pos:"C", name:"eSwahn", number:"21" },
    { pos:"RW", name:"Feffe1och2", number:"88" }
  ];

  const state = {
    teamId:"carolus",
    side:"front",
    pattern:"shoulder",
    primary:"#123b67",
    accent:"#c99a32",
    trim:"#f3f4f2",
    playerName:"eSWAHN",
    playerNumber:"21",
    captainRole:"",
    rendererMode:"premium",
    matchHome:"vasteras",
    matchAway:"nordic"
  };

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("sv-SE")
    .replace(/[^a-z0-9]+/g," ")
    .trim();

  const manifestEntries = Object.entries(window.SEH_TEAM_LOGO_FILES || {});
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
      return "../../" + path.replace(/^\/+/, "");
    }
    const file = logoFileFor(teamName,team?.logoName || "");
    return file ? `../../teamlogos/${encodeURIComponent(file).replace(/%2F/gi,"/")}` : "";
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

  async function getRpcRows(name, payload = {}) {
    const {url,key} = configValues();
    if (!url || !key) throw new Error("Supabase-konfiguration saknas");
    const headers = {apikey:key,Accept:"application/json","Content-Type":"application/json"};
    if (/^eyJ/i.test(key)) headers.Authorization = "Bearer " + key;
    const response = await fetch(url + "/rest/v1/rpc/" + name,{
      method:"POST",
      headers,
      cache:"no-store",
      body:JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(name + ": HTTP " + response.status);
    return response.json();
  }

  function buildDynamicTeam(row,index) {
    const preset = JERSEY_PRESETS.find(team => normalize(team.name) === normalize(row.name));
    if (preset) {
      return {
        ...preset,
        projectId:Number(row.id) || null,
        sourceTeamId:Number(row.source_team_id) || null,
        division:String(row.division || ""),
        logoName:String(row.logo_name || "")
      };
    }
    const [primary,accent,trim,pattern] = fallbackPalette(index);
    return {
      id:"ecl27-" + String(row.id || index + 1),
      name:String(row.name || "Okänt lag"),
      code:initials(row.name),
      primary,accent,trim,pattern,
      projectId:Number(row.id) || null,
      sourceTeamId:Number(row.source_team_id) || null,
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

  function fillPlayerSelect() {
    const select = $("#playerName");
    if (!select) return;
    const players = rosterFor(state.teamId);
    if (!players.length) {
      select.innerHTML = `<option value="${esc(state.playerName || "PLAYER")}">${esc(state.playerName || "PLAYER")}</option>`;
      return;
    }
    const exists = players.some(name => normalize(name) === normalize(state.playerName));
    if (!exists) state.playerName = players[0];
    select.innerHTML = players.map(name =>
      `<option value="${esc(name)}"${normalize(name) === normalize(state.playerName) ? " selected" : ""}>${esc(name)}</option>`
    ).join("");
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
          sourceTeamId:Number(row.teamId) || null,
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
        sourceTeamId:Number(row.teamId) || null,
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

  async function loadEcl27Data() {
    // Load the exact ECL 27 team list first. Roster, palette or image failures
    // must never leave the UI stuck on the five local test presets.
    try {
      const teams = await getPublicRows(
        "v_ecl27_team_builds_public",
        "select=id,name,division,source_team_id,logo_name,is_new_project,status&order=division.asc,name.asc"
      );
      const rows = Array.isArray(teams) ? teams : [];
      if (!rows.length) throw new Error("ECL 27 saknar lagdata");

      teamDirectory = rows.map(buildDynamicTeam);
      rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));
      playerKeysByName = new Map();

      const current = teamDirectory.find(team => normalize(team.name) === normalize("Carolus Icemen"))
        || teamDirectory[0];
      state.teamId = current.id;
      state.matchHome = current.id;
      state.matchAway = teamDirectory.find(team => team.id !== current.id)?.id || current.id;

      fillSelect($("#teamSelect"),state.teamId);
      fillSelect($("#matchHomeSelect"),state.matchHome);
      fillSelect($("#matchAwaySelect"),state.matchAway);
      syncControlsFromTeam(current);
      fillPlayerSelect();
      renderAll();
    } catch (error) {
      console.error("[Jersey Lab] kunde inte läsa ECL 27-laglistan",error);
      return;
    }

    // Roster enrichment is independent of the already-rendered team list.
    try {
      const rosterRows = Array.isArray(window.SEH_ECL27_ROSTER_SNAPSHOT?.rows)
        ? window.SEH_ECL27_ROSTER_SNAPSHOT.rows
        : await getPublicRows("v_ecl27_current_roster_public","select=player_key,display_gamertag,team_project_id,team_name,division,team_id,logo_name&order=team_name.asc,display_gamertag.asc");
      rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));
      playerKeysByName = new Map();
      applyDirectRosterRows(rosterRows);
      fillPlayerSelect();
      renderLocker();
    } catch (error) {
      console.warn("[Jersey Lab] laglistan laddad men roster kunde inte hämtas",error);
    }

    // Palette enrichment may update colors, never identity/team membership.
    try {
      await hydrateTeamPalettes();
      const selected = teamById(state.teamId);
      syncControlsFromTeam(selected);
      renderAll();
    } catch (error) {
      console.warn("[Jersey Lab] kunde inte läsa lagfärger",error);
    }
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  // Additional patterns share colour roles across both jersey renderers.
  function extraJerseyPattern(pattern, stripe, secondary, side) {
    const bandY = side === "back" ? 450 : 274;
    const designs = {
      chestband: `
        <path d="M40 ${bandY-9} H560 V${bandY+91} H40 Z" fill="${secondary}"/>
        <path d="M40 ${bandY} H560 V${bandY+82} H40 Z" fill="${stripe}"/>
        <path d="M150 531 H450 V547 H150 Z" fill="${stripe}"/>`,
      chevron: `
        <path d="M65 157 L300 225 L535 157 V194 L300 262 L65 194 Z" fill="${secondary}"/>
        <path d="M65 154 L300 222 L535 154 V179 L300 247 L65 179 Z" fill="${stripe}"/>
        <path d="M65 452 H179 V482 H65 Z M421 452 H535 V482 H421 Z M160 535 H440 V553 H160 Z" fill="${stripe}"/>`,
      panels: `
        <path d="M166 140 C195 196 211 264 207 339 L226 579 H155 L142 216 Z M434 140 C405 196 389 264 393 339 L374 579 H445 L458 216 Z" fill="${stripe}"/>
        <path d="M177 154 C204 222 216 273 214 337 L234 579 M423 154 C396 222 384 273 386 337 L366 579" fill="none" stroke="${secondary}" stroke-width="6"/>
        <path d="M65 487 H178 V511 H65 Z M422 487 H535 V511 H422 Z" fill="${secondary}"/>`,
      retro: `
        <path d="M40 438 H560 V460 H40 Z M40 473 H560 V502 H40 Z M40 515 H560 V537 H40 Z" fill="${stripe}"/>
        <path d="M40 465 H560 V471 H40 Z M40 504 H560 V510 H40 Z M150 545 H450 V552 H150 Z" fill="${secondary}"/>
        <path d="M100 142 Q300 77 500 142" fill="none" stroke="${secondary}" stroke-width="5"/>`,
      sash: `
        <path d="M160 445 L429 183 L459 215 L184 484 Z" fill="${secondary}"/>
        <path d="M160 452 L433 190 L451 211 L181 477 Z" fill="${stripe}"/>
        <path d="M60 348 L183 330 V355 L60 373 Z M417 330 L540 348 V373 L417 355 Z M160 539 H440 V554 H160 Z" fill="${stripe}"/>`
    };
    return designs[pattern] || "";
  }

  function jerseySvg(team, options = {}) {
    const variant = options.variant || "home";
    const side = options.side || "front";
    const compact = options.compact === true;
    const pattern = options.pattern || team.pattern || "shoulder";
    const primary = options.primary || team.primary;
    const accent = options.accent || team.accent;
    const trim = options.trim || team.trim;
    const name = String(options.playerName || state.playerName || "PLAYER").toUpperCase();
    const number = String(options.playerNumber || state.playerNumber || "21");
    const requestedRole = String(options.captainRole || "").toUpperCase();
    const captainRole = requestedRole === "C" || requestedRole === "A" ? requestedRole : "";
    const base = variant === "away" ? "#f2f3f0" : primary;
    const ink = variant === "away" ? primary : trim;
    const dark = variant === "away" ? primary : "#050708";
    const stripe = variant === "away" ? primary : accent;
    const secondary = variant === "away" ? accent : trim;
    const logo = logoUrl(team.name);
    const uid = `jersey-${team.id}-${variant}-${side}-${Math.random().toString(36).slice(2,8)}`;

    // V4 uses separate full-size and compact hockey cuts.
    const silhouette = compact
      ? "M246 74 C264 58 336 58 354 74 L400 91 C435 102 468 122 498 148 L544 190 L514 470 L449 456 L440 544 Q300 558 160 544 L151 456 L86 470 L56 190 L102 148 C132 122 165 102 200 91 Z"
      : "M244 72 C263 56 337 56 356 72 L401 88 C434 97 468 117 500 144 L554 190 L512 492 L448 480 L440 552 Q300 566 160 552 L152 480 L88 492 L46 190 L100 144 C132 117 166 97 199 88 Z";

    const patternMarkup = {
      shoulder: `
        <path d="M187 93 C224 80 252 72 300 72 C348 72 376 80 413 93 L469 124 L433 181 C390 154 352 142 300 142 C248 142 210 154 167 181 L131 124 Z" fill="${stripe}"/>
        <path d="M49 241 L143 194 L157 237 L63 284 Z M551 241 L457 194 L443 237 L537 284 Z" fill="${secondary}" opacity=".98"/>
        <path d="M55 286 L149 239 L160 272 L66 319 Z M545 286 L451 239 L440 272 L534 319 Z" fill="${stripe}"/>
        <path d="M160 500 H440 V526 H160 Z" fill="${stripe}"/>
        <path d="M160 526 H440 V542 H160 Z" fill="${secondary}"/>
      `,
      classic: `
        <path d="M160 500 H440 V522 H160 Z" fill="${secondary}"/>
        <path d="M160 525 H440 V546 H160 Z" fill="${stripe}"/>
        <path d="M51 252 L147 202 L162 239 L65 290 Z M549 252 L453 202 L438 239 L535 290 Z" fill="${secondary}"/>
        <path d="M56 294 L153 244 L165 273 L68 324 Z M544 294 L447 244 L435 273 L532 324 Z" fill="${stripe}"/>
        <path d="M70 366 L151 345 L156 373 L75 395 Z M530 366 L449 345 L444 373 L525 395 Z" fill="${stripe}"/>
      `,
      diagonal: `
        <path d="M151 384 L437 208 L437 279 L167 446 L169 518 L436 353 L436 409 L239 532 H170 L164 473 L150 483 Z" fill="${stripe}" opacity=".97"/>
        <path d="M160 415 L437 244 L437 267 L167 437 L168 463 L437 297 L437 320 L170 487 L160 494 Z" fill="${secondary}" opacity=".92"/>
        <path d="M43 204 L137 148 L181 186 L61 257 Z M557 204 L463 148 L419 186 L539 257 Z" fill="${stripe}"/>
        <path d="M67 360 L151 339 L156 374 L73 395 Z M533 360 L449 339 L444 374 L527 395 Z" fill="${secondary}"/>
      `,
      minimal: `
        <path d="M160 522 H440 V542 H160 Z" fill="${stripe}"/>
        <path d="M54 289 L151 239 L162 269 L65 320 Z M546 289 L449 239 L438 269 L535 320 Z" fill="${stripe}"/>
        <path d="M194 96 C229 82 259 77 300 77 C341 77 371 82 406 96" fill="none" stroke="${secondary}" stroke-width="7" opacity=".82"/>
        <path d="M70 367 L151 346 L155 371 L75 392 Z M530 367 L449 346 L445 371 L525 392 Z" fill="${secondary}" opacity=".55"/>
      `
    }[pattern] || extraJerseyPattern(pattern, stripe, secondary, side);

    const captainMarkup = captainRole ? `
      <path d="M381 166 h38 v38 h-38 z" fill="${ink}" opacity=".94"/>
      <text x="400" y="193" text-anchor="middle" fill="${variant === "away" ? "#f2f3f0" : dark}" font-size="20" font-weight="1000">${captainRole}</text>
    ` : "";

    const front = `
      <g>
        ${logo
          ? `<image href="${esc(logo)}" x="${compact ? 193 : 194}" y="${compact ? 190 : 187}" width="${compact ? 214 : 212}" height="${compact ? 186 : 198}" preserveAspectRatio="xMidYMid meet"/>`
          : `<text x="300" y="286" text-anchor="middle" fill="${ink}" font-size="72" font-weight="1000">${esc(team.code)}</text>`}
        ${compact ? "" : `<text x="300" y="418" text-anchor="middle" fill="${ink}" opacity=".28" font-size="8" font-weight="1000" letter-spacing="3.4">SVENSK eHOCKEY</text>`}
        ${captainMarkup}
      </g>
    `;

    const back = `
      <g>
        <text x="300" y="${compact ? 201 : 205}" text-anchor="middle" fill="${ink}" stroke="${stripe}" stroke-width="1.7" paint-order="stroke fill" font-size="${compact ? 29 : 27}" font-weight="1000" letter-spacing="2.2">${esc(name)}</text>
        <text x="300" y="${compact ? 401 : 397}" text-anchor="middle" fill="${ink}" stroke="${stripe}" stroke-width="5.5" paint-order="stroke fill" font-size="${compact ? 180 : 170}" font-weight="1000" letter-spacing="-8">${esc(number)}</text>
        ${compact ? "" : `<text x="300" y="434" text-anchor="middle" fill="${ink}" opacity=".64" font-size="11" font-weight="1000" letter-spacing="3.4">SVENSK eHOCKEY</text>`}
      </g>
    `;

    return `
      <svg viewBox="0 0 600 600" role="img" aria-label="${esc(team.name)} ${variant === "away" ? "bortatröja" : "hemmatröja"}" class="seh-jersey-svg${compact ? " is-compact" : ""}">
        <defs>
          <clipPath id="clip-${uid}">
            <path d="${silhouette}"/>
          </clipPath>
          <linearGradient id="body-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000000" stop-opacity=".25"/>
            <stop offset=".18" stop-color="#ffffff" stop-opacity=".045"/>
            <stop offset=".47" stop-color="#ffffff" stop-opacity=".11"/>
            <stop offset=".62" stop-color="#ffffff" stop-opacity=".035"/>
            <stop offset="1" stop-color="#000000" stop-opacity=".30"/>
          </linearGradient>
          <radialGradient id="chest-${uid}" cx="50%" cy="25%" r="66%">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".16"/>
            <stop offset=".42" stop-color="#ffffff" stop-opacity=".025"/>
            <stop offset="1" stop-color="#000000" stop-opacity=".10"/>
          </radialGradient>
          <pattern id="mesh-${uid}" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.8" cy="1.8" r=".65" fill="#ffffff" opacity=".085"/>
            <circle cx="5.4" cy="5.4" r=".65" fill="#000000" opacity=".11"/>
          </pattern>
          <filter id="shadow-${uid}" x="-35%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="${compact ? 17 : 24}" stdDeviation="${compact ? 13 : 19}" flood-color="#000000" flood-opacity=".52"/>
          </filter>
        </defs>

        <g filter="url(#shadow-${uid})">
          <path d="${silhouette}" fill="${base}" stroke="${variant === "away" ? "#c7cccd" : "#20262a"}" stroke-width="3"/>
          <g clip-path="url(#clip-${uid})">
            ${patternMarkup}
            <rect width="600" height="600" fill="url(#body-${uid})"/>
            <rect width="600" height="600" fill="url(#chest-${uid})"/>
            <rect width="600" height="600" fill="url(#mesh-${uid})" opacity="${compact ? ".28" : ".38"}"/>
          </g>

          <path d="M199 90 C180 137 165 191 155 248" fill="none" stroke="#ffffff" stroke-opacity=".04" stroke-width="1.3"/>
          <path d="M401 90 C420 137 435 191 445 248" fill="none" stroke="#ffffff" stroke-opacity=".04" stroke-width="1.3"/>
          <path d="M152 480 C158 505 160 529 160 552 M448 480 C442 505 440 529 440 552" fill="none" stroke="#000000" stroke-opacity=".07" stroke-width="1.8"/>

          <path d="M252 75 C268 62 332 62 348 75 L365 89 C344 103 326 119 300 145 C274 119 256 103 235 89 Z" fill="${dark}"/>
          <path d="M253 78 C269 93 285 108 300 126 C315 108 331 93 347 78" fill="none" stroke="${stripe}" stroke-width="10" stroke-linejoin="round"/>
          <path d="M260 81 C274 94 287 106 300 120 C313 106 326 94 340 81" fill="none" stroke="${secondary}" stroke-width="2.8" opacity=".88"/>
          ${compact ? "" : `<text x="300" y="99" text-anchor="middle" fill="${secondary}" opacity=".66" font-size="9" font-weight="1000" letter-spacing="1.4">SEH</text>`}

          <path d="M89 486 L152 475" stroke="${dark}" stroke-opacity=".18" stroke-width="4"/>
          <path d="M511 486 L448 475" stroke="${dark}" stroke-opacity=".18" stroke-width="4"/>
          <path d="M161 548 Q300 562 439 548" fill="none" stroke="${dark}" stroke-opacity=".42" stroke-width="6"/>
          <path d="M164 542 Q300 556 436 542" fill="none" stroke="${secondary}" stroke-opacity=".45" stroke-width="1.8"/>

          ${compact ? "" : `
            <path d="M237 160 C227 254 228 401 239 535 M363 160 C373 254 372 401 361 535" fill="none" stroke="#000000" stroke-opacity=".035" stroke-width="7"/>
            <path d="M278 158 C273 263 274 414 279 540 M322 158 C327 263 326 414 321 540" fill="none" stroke="#ffffff" stroke-opacity=".015" stroke-width="5"/>
          `}

          ${side === "back" ? back : front}
        </g>
      </svg>
    `;
  }


  // A neutral, procedural cloth-lighting layer shared by every team and colour.
  // Compute once per side, not per jersey or control change. No external image assets.
  const fabricLightingCache = new Map();
  const fabricDisplacementCache = new Map();
  function jerseyFabricLighting(side) {
    if (fabricLightingCache.has(side)) return fabricLightingCache.get(side);
    try {
      const size = 600;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) { fabricLightingCache.set(side,""); return ""; }
      const heights = new Float32Array(size * size);
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const smooth = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
      const gaussian = (v, width) => Math.exp(-(v * v) / (width * width));
      // [start x/y, end x/y, width, relief]: stress folds radiate from sewn edges.
      const creases = [
        [151, 137, 224, 105, 5.5, 5.5], [132, 159, 216, 134, 7, -4.5],
        [162, 173, 197, 247, 6, -9], [145, 189, 175, 264, 9, 6],
        [382, 108, 456, 146, 6, -5], [392, 135, 470, 165, 8, 4],
        [444, 179, 408, 275, 6.5, -11], [458, 200, 428, 295, 10, 6],
        [177, 414, 236, 453, 10, -3.8], [402, 447, 352, 482, 10, -4],
        [103, 497, 173, 508, 4, 3], [102, 514, 169, 519, 3, -2.5],
        [430, 501, 499, 493, 5, -3.2], [433, 515, 499, 516, 3.5, 2.2],
        [199, 550, 261, 564, 4.5, 2.2], [330, 561, 402, 550, 5, -2.5]
      ].map(([x0,y0,x1,y1,width,relief]) => {
        const dx=x1-x0, dy=y1-y0, length=Math.hypot(dx,dy);
        return {x0,y0,dx:dx/length,dy:dy/length,length,width:width*2.1,relief:relief*.34};
      });
      const backShift = side === "back" ? 18 : 0;
      for (let y=76; y<594; y++) {
        const hanging = smooth((y-177)/170);
        for (let x=65; x<535; x++) {
          // Rounded torso/sleeves, joined gradually to avoid a straight panel shadow.
          const torso = 19 * gaussian(x-296, 125);
          const left = 12 * gaussian(x-(146-(y-170)*.038), 37);
          const right = 11 * gaussian(x-(455+(y-170)*.04), 38);
          const joinL = smooth((x-165)/45), joinR = smooth((435-x)/45);
          let h = torso * joinL * joinR + left * (1-joinL) + right * (1-joinR);
          const c1=226+backShift+12*Math.sin((y-195)*.012);
          const c2=298-backShift+9*Math.sin(y*.016+.9);
          const c3=363+10*Math.sin((y-270)*.011);
          h += hanging * (8.3*gaussian(x-c1,23)-5.2*gaussian(x-c2,30)+8.5*gaussian(x-c3,27));
          // Narrow valleys between broad folds, varied along the length of the cloth.
          h -= 3.2*gaussian(x-(251+11*Math.sin(y*.012)),9)*gaussian(y-409,132);
          h += 2.5*gaussian(x-(329+15*Math.sin(y*.01)),12)*gaussian(y-445,105);
          h -= 2.4*gaussian(x-(390-14*Math.sin(y*.009)),10)*gaussian(y-352,118);
          // Broad, irregular drape and shorter wrinkles near cuffs and hem.
          h += .8*Math.sin(x*.051+y*.025)*Math.sin(y*.037-x*.019);
          h += 2.1*gaussian(x-(132+8*Math.sin(y*.016)),16)*smooth((y-215)/90);
          h -= 2.6*gaussian(x-(467+6*Math.sin(y*.013)),19)*smooth((y-238)/80);
          h += 2.2*Math.sin(y*.115+x*.028)*gaussian(y-494,42)*(gaussian(x-131,36)+gaussian(x-471,36));
          h += 1.8*Math.sin(x*.074+y*.048)*gaussian(y-538,37)*gaussian(x-298,105);
          for (const c of creases) {
            const px=x-c.x0, py=y-c.y0, along=(px*c.dx+py*c.dy)/c.length;
            if (along<=0 || along>=1) continue;
            const across=-px*c.dy+py*c.dx;
            if (Math.abs(across)>c.width*3) continue;
            const taper=Math.sin(Math.PI*along);
            h += c.relief*taper*taper*gaussian(across,c.width);
          }
          heights[y*size+x]=h;
        }
      }
      const pixels=context.createImageData(size,size);
      const displacement=context.createImageData(size,size);
      for (let i=0;i<size*size;i++) {
        displacement.data[i*4]=displacement.data[i*4+1]=128;
        displacement.data[i*4+2]=128;
        displacement.data[i*4+3]=255;
      }
      for (let y=80; y<590; y++) {
        for (let x=69; x<531; x++) {
          const i=y*size+x;
          const sx=(heights[i+1]-heights[i-1])*.5;
          const sy=(heights[i+size]-heights[i-size])*.5;
          const norm=1/Math.sqrt(1+sx*sx+sy*sy);
          // Large studio softbox above-left, with ambient fill for white and black kits.
          const light=clamp((sx*.42+sy*.23+.875)*norm,0,1);
          const tone=(light-.875)*.98;
          // Surface-following knit; soft contrast keeps white polyester matte.
          const weave=(Math.sin(x*2.9+y*.65+heights[i]*.12)*Math.sin(y*3.1-x*.25))*.035;
          const grain=((((x*73856093)^(y*19349663))>>>0)%101/100-.5)*.018;
          const value=tone+weave+grain;
          const p=i*4, white=value>0;
          // The printed artwork bends on the same surface that receives the light.
          displacement.data[p]=clamp(128+sx*92,35,220);
          displacement.data[p+1]=clamp(128+sy*76+(heights[i]-15)*1.1,45,210);
          pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=white?255:0;
          pixels.data[p+3]=Math.round(255*(white?Math.min(.16,value*.63):Math.min(.29,-value)));
        }
      }
      context.putImageData(pixels,0,0);
      const result=canvas.toDataURL("image/png");
      context.putImageData(displacement,0,0);
      fabricDisplacementCache.set(side,canvas.toDataURL("image/png"));
      fabricLightingCache.set(side,result);
      return result;
    } catch {
      // Keep the existing vector lighting available if canvas is restricted.
      fabricLightingCache.set(side,"");
      return "";
    }
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
    const fabricLighting = jerseyFabricLighting(side);
    const fabricDisplacement = fabricDisplacementCache.get(side) || "";

    const bodyBase = variant === "away" ? "#f4f4f1" : primary;
    const sleeveBase = bodyBase;
    const yokeBase = pattern === "shoulder"
      ? (variant === "away" ? primary : accent)
      : (variant === "away" ? trim : primary);
    const stripeA = variant === "away" ? primary : accent;
    const stripeB = variant === "away" ? accent : trim;
    const ink = variant === "away" ? primary : trim;
    const dark = variant === "away" ? primary : "#07090a";

    // V28: gently sloping shoulders and relaxed sleeve edges with overlapping upper panels.
    const leftSleeve = "M242 96 C213 100 179 109 153 120 C127 131 112 150 106 177 C101 203 104 226 101 255 C99 281 101 301 97 328 C94 353 97 375 94 405 C91 433 94 451 89 479 L86 505 Q82 522 94 526 C114 532 140 534 160 529 C170 509 170 490 174 470 C178 450 176 432 181 408 C187 379 191 348 197 318 C205 278 205 246 198 212 C190 175 187 151 205 125 Z";
    const rightSleeve = "M358 93 C387 99 420 110 446 124 C470 137 487 157 492 185 C497 211 493 235 497 261 C499 284 498 308 502 336 C505 361 501 383 506 412 C509 438 506 459 512 483 L515 508 Q519 524 507 529 C486 536 461 535 440 530 C430 512 433 492 426 471 C421 450 425 432 418 407 C411 377 408 348 402 317 C394 277 395 245 401 213 C409 176 414 153 395 128 Z";
    const torso = "M242 96 Q297 111 358 93 C389 101 414 123 421 153 C429 183 420 217 413 249 C406 283 409 315 408 350 C407 385 404 412 408 445 C410 472 406 491 408 513 L405 552 Q407 565 393 570 C365 577 333 579 300 580 C267 581 234 576 207 573 Q192 570 192 558 L190 534 C193 510 188 486 190 460 C192 430 187 407 188 377 C189 345 187 318 186 290 C184 255 174 221 172 189 C169 154 189 119 218 105 Z";

    const extraDesign = extraJerseyPattern(pattern, stripeA, stripeB, side);
    const shoulderDecor = pattern === "shoulder" ? `
      <path d="M96 84 H504 V178 C425 154 363 145 301 149 C238 144 177 157 96 181 Z" fill="${yokeBase}"/>
      <path d="M99 178 C177 155 238 143 301 148 C363 144 425 152 501 175" fill="none" stroke="${stripeB}" stroke-width="7.5"/>
    ` : "";

    const sleeveStriping = pattern === "minimal" ? `
      <path d="M72 328 Q143 332 194 326 L196 347 Q143 353 72 349 Z M528 328 Q457 332 406 326 L404 347 Q457 353 528 349 Z" fill="${stripeA}"/>
    ` : pattern === "diagonal" ? `
      <path d="M72 304 L196 287 V308 L72 325 Z M528 304 L404 287 V308 L528 325 Z" fill="${stripeA}"/>
      <path d="M72 331 L196 314 V336 L72 353 Z M528 331 L404 314 V336 L528 353 Z" fill="${stripeB}"/>
    ` : `
      <path d="M72 299 Q143 302 195 298 V324 Q143 328 72 325 Z M528 299 Q457 302 405 298 V324 Q457 328 528 325 Z" fill="${stripeB}"/>
      <path d="M72 340 Q143 344 196 340 V366 Q143 370 72 366 Z M528 340 Q457 344 404 340 V366 Q457 370 528 366 Z" fill="${stripeA}"/>
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
          ? `<image href="${esc(logo)}" x="205" y="228" width="190" height="198" preserveAspectRatio="xMidYMid meet"/>`
          : `<text x="300" y="335" text-anchor="middle" fill="${ink}" font-size="74" font-weight="1000">${esc(team.code)}</text>`}
        ${captain}
      </g>
    `;

    const back = `
      <g>
        <text x="300" y="215" text-anchor="middle" fill="${ink}" stroke="${stripeA}" stroke-width="1.5" paint-order="stroke fill" font-size="${compact ? 27 : 30}" font-weight="1000" letter-spacing="2.4"${name.length > 11 ? ' textLength="205" lengthAdjust="spacingAndGlyphs"' : ""}>${esc(name)}</text>
        <text x="300" y="420" text-anchor="middle" fill="${ink}" stroke="${stripeA}" stroke-width="6" paint-order="stroke fill" font-size="${compact ? 174 : 184}" font-weight="1000" letter-spacing="-8">${esc(number)}</text>
      </g>
    `;

    return `
      <svg viewBox="0 0 600 600" role="img" aria-label="${esc(team.name)} premium ${variant === "away" ? "bortatröja" : "hemmatröja"}" class="seh-jersey-svg seh-jersey-premium${compact ? " is-compact" : ""}">
        <defs>
          ${fabricDisplacement && !compact ? `<filter id="print-drape-${uid}" x="0" y="0" width="600" height="600" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feImage href="${fabricDisplacement}" x="0" y="0" width="600" height="600" result="cloth-surface"/>
            <feDisplacementMap in="SourceGraphic" in2="cloth-surface" scale="8" xChannelSelector="R" yChannelSelector="G"/>
          </filter>` : ""}
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
          <filter id="collar-shade-${uid}" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="1.4"/>
          </filter>
        </defs>

        <g filter="url(#shadow-${uid})">
          <path d="${leftSleeve}" fill="${sleeveBase}"/>
          <path d="${rightSleeve}" fill="${sleeveBase}"/>
          <path d="${torso}" fill="${bodyBase}"/>

          <g clip-path="url(#clip-${uid})">
            ${extraDesign || shoulderDecor}
            ${extraDesign ? "" : `<g mask="url(#sleeves-only-${uid})">${sleeveStriping}</g>
            <g clip-path="url(#torso-clip-${uid})">${hemStriping}</g>`}
            <g${fabricDisplacement && !compact ? ` filter="url(#print-drape-${uid})"` : ""}>${side === "back" ? back : front}</g>
            ${fabricLighting ? `<rect width="600" height="600" fill="url(#chest-light-${uid})" opacity=".48"/><image href="${fabricLighting}" x="0" y="0" width="600" height="600" opacity="${compact ? ".88" : "1"}"/>` : `
            <path d="${leftSleeve}" fill="url(#left-sleeve-${uid})"/>
            <path d="${rightSleeve}" fill="url(#right-sleeve-${uid})"/>
            <path d="${torso}" fill="url(#torso-${uid})"/>
            <path d="${torso}" fill="url(#torso-drape-${uid})"/>
            <rect width="600" height="600" fill="url(#chest-light-${uid})"/>
            `}
            <rect width="600" height="600" fill="url(#knit-${uid})" opacity="${compact ? ".16" : ".62"}"/>
          </g>

          <!-- Sewn hems remain crisp over the continuous cloth lighting. -->
          <g clip-path="url(#clip-${uid})">
            <g fill="none" stroke-linecap="round">
              <path d="M203 111 C181 138 169 165 172 198 M393 109 C416 139 429 165 426 201" stroke="#000" stroke-opacity=".09" stroke-width="1.7"/>
              <path d="M205 112 C183 139 171 166 174 198 M391 110 C414 140 427 166 424 201" stroke="#fff" stroke-opacity=".16" stroke-width=".7" stroke-dasharray="1.2 2"/>
            </g>
            <g fill="none" stroke-linecap="round">
              <path d="M90 516 Q123 528 162 521" stroke="#000" stroke-opacity=".18" stroke-width=".75" stroke-dasharray="1 2.1"/>
              <path d="M439 522 Q477 530 513 518" stroke="#000" stroke-opacity=".18" stroke-width=".75" stroke-dasharray="1 2.1"/>
              <path d="M91 513 Q124 524 162 518 M439 519 Q478 527 513 515" stroke="#fff" stroke-opacity=".13" stroke-width=".7"/>
              <path d="M196 556 Q247 570 300 572 Q351 570 402 557" stroke="#000" stroke-opacity=".13" stroke-width=".72" stroke-dasharray="1 2.15"/>
              <path d="M198 552 Q249 565 300 567 Q350 565 400 553" stroke="#fff" stroke-opacity=".09" stroke-width=".65" stroke-dasharray=".9 2.2"/>
            </g>
          </g>
          <!-- Ribbed neckline sits above the body, with a soft contact shadow. -->
          ${side === "back" ? `
            <path d="M240 95 Q299 116 360 93 L357 108 Q300 133 243 109 Z" fill="${dark}"/>
            <path d="M245 104 Q300 126 355 103" fill="none" stroke="${stripeA}" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M249 110 Q300 129 351 108" fill="none" stroke="${stripeB}" stroke-opacity=".26" stroke-width=".65" stroke-dasharray="1 1.7"/>
          ` : `
            <path d="M238 100 C244 130 267 155 299 183 C334 158 358 132 363 100" fill="none" stroke="#000" stroke-opacity=".20" stroke-width="3.2" filter="url(#collar-shade-${uid})"/>
            <path d="M243 94 Q299 111 358 93 C353 120 328 150 300 171 C271 150 248 120 243 94 Z" fill="url(#neck-lining-${uid})"/>
            <path d="M245 96 Q299 113 356 94 L352 106 Q300 125 249 107 Z" fill="${dark}" opacity=".98"/>
            <path d="M234 95 Q240 90 247 96 C249 119 272 149 305 173 L298 182 C261 155 240 128 234 95 Z" fill="${primary}"/>
            <path d="M354 94 Q361 90 366 95 C360 130 338 157 298 182 L291 174 C328 146 350 121 354 94 Z" fill="${primary}"/>
            <path d="M237 96 C244 130 267 154 298 180 C335 155 358 126 363 96 L357 96 C351 124 330 149 298 173 C269 151 248 126 244 96 Z" fill="url(#collar-light-${uid})"/>
            <path d="M242 99 C249 128 269 151 299 175 C329 152 351 128 358 98" fill="none" stroke="${stripeA}" stroke-width="2.15" stroke-linecap="round"/>
            <path d="M248 108 C255 133 275 154 300 172 M352 107 C345 132 325 155 300 172" fill="none" stroke="${stripeB}" stroke-opacity=".30" stroke-width=".62" stroke-dasharray=".9 1.55"/>
            <path d="M252 112 C260 134 278 153 300 168 M348 111 C341 134 323 153 300 168" fill="none" stroke="#000" stroke-opacity=".10" stroke-width=".55" stroke-dasharray=".8 1.7"/>
            <path d="M238 97 C245 132 270 158 298 179 L304 174 C274 151 250 123 245 96 Z M358 96 C351 127 328 154 298 178 L294 173 C327 147 351 119 354 96 Z" fill="url(#knit-${uid})" opacity=".85"/>
          `}
        </g>
      </svg>
    `;
  }

  function renderJersey(team, options = {}) {
    return state.rendererMode === "premium"
      ? premiumJerseySvg(team, options)
      : jerseySvg(team, options);
  }

  function currentDesignTeam() {
    const base = teamById(state.teamId);
    return {
      ...base,
      primary:state.primary,
      accent:state.accent,
      trim:state.trim,
      pattern:state.pattern
    };
  }

  function fillSelect(select, selected) {
    select.innerHTML = teamDirectory.map(team =>
      `<option value="${team.id}"${team.id === selected ? " selected" : ""}>${esc(team.name)}${team.division ? " · " + esc(team.division) : ""}</option>`
    ).join("");
  }

  function syncControlsFromTeam(team) {
    state.teamId = team.id;
    state.pattern = team.pattern;
    state.primary = team.primary;
    state.accent = team.accent;
    state.trim = team.trim;
    $("#patternSelect").value = state.pattern;
    $("#primaryColor").value = state.primary;
    $("#accentColor").value = state.accent;
    $("#trimColor").value = state.trim;
  }

  function renderPair() {
    const team = currentDesignTeam();
    $("#homeTeamName").textContent = team.name;
    $("#awayTeamName").textContent = team.name;
    $("#homeJersey").innerHTML = renderJersey(team,{
      variant:"home",side:state.side,pattern:state.pattern,
      playerName:state.playerName,playerNumber:state.playerNumber,captainRole:state.captainRole
    });
    $("#awayJersey").innerHTML = renderJersey(team,{
      variant:"away",side:state.side,pattern:state.pattern,
      playerName:state.playerName,playerNumber:state.playerNumber,captainRole:state.captainRole
    });
  }

  function renderLocker() {
    const team = currentDesignTeam();
    const livePlayers = rosterFor(state.teamId).slice(0,6);
    const locker = livePlayers.length
      ? livePlayers.map(name => ({pos:"ECL",name,number:" "}))
      : LOCKER;
    $("#lockerRoom").innerHTML = locker.map(({pos,name,number}) => `
      <div class="locker-slot">
        <div class="locker-light" aria-hidden="true"></div>
        <div class="locker-nameplate">
          <strong>${esc(name)}</strong>
          <span>${esc(pos)}</span>
        </div>
        <div class="locker-hook" aria-hidden="true"></div>
        <div class="locker-jersey">${renderJersey(team,{variant:"home",side:"back",pattern:state.pattern,playerName:name,playerNumber:number,compact:true})}</div>
        <div class="locker-base"><span>${esc(pos)}</span><small>${number.trim() ? "#" + esc(number) : "ECL 27"}</small></div>
      </div>
    `).join("");
  }

  function renderMatchTeam(hostId, teamId, variant) {
    const team = teamById(teamId);
    $(hostId).innerHTML = `
      ${renderJersey(team,{variant,side:"front",pattern:team.pattern,compact:true})}
      <strong>${esc(team.name)}</strong>
    `;
  }

  function renderMatch() {
    renderMatchTeam("#matchHome",state.matchHome,"home");
    renderMatchTeam("#matchAway",state.matchAway,"away");
  }

  function renderGrid() {
    $("#teamGrid").innerHTML = teamDirectory.map(team => `
      <article class="team-jersey-card">
        ${renderJersey(team,{variant:"home",side:"front",pattern:team.pattern,compact:true})}
        <strong>${esc(team.name)}</strong>
        <small>${team.division ? esc(team.division.toUpperCase()) + " · " : ""}HEMMA · ${esc(team.pattern.toUpperCase())}</small>
      </article>
    `).join("");
  }

  function renderAll() {
    renderPair();
    renderLocker();
    renderMatch();
    renderGrid();
  }

  fillSelect($("#teamSelect"),state.teamId);
  fillSelect($("#matchHomeSelect"),state.matchHome);
  fillSelect($("#matchAwaySelect"),state.matchAway);
  $("#captainRoleSelect").value = state.captainRole;
  $("#rendererModeSelect").value = state.rendererMode;
  syncControlsFromTeam(teamById(state.teamId));

  $("#teamSelect").addEventListener("change",async event => {
    const team = teamById(event.target.value);
    await ensureTeamPalette(team);
    syncControlsFromTeam(team);
    fillPlayerSelect();
    renderPair();
    renderLocker();
  });
  $("#patternSelect").addEventListener("change",event => { state.pattern=event.target.value; renderPair(); renderLocker(); });
  $("#primaryColor").addEventListener("input",event => { state.primary=event.target.value; renderPair(); renderLocker(); });
  $("#accentColor").addEventListener("input",event => { state.accent=event.target.value; renderPair(); renderLocker(); });
  $("#trimColor").addEventListener("input",event => { state.trim=event.target.value; renderPair(); renderLocker(); });
  $("#playerName").addEventListener("change",event => { state.playerName=event.target.value || "PLAYER"; renderPair(); });
  $("#playerNumber").addEventListener("input",event => { state.playerNumber=event.target.value || "0"; renderPair(); });
  $("#captainRoleSelect").addEventListener("change",event => { state.captainRole=event.target.value; renderPair(); });
  $("#rendererModeSelect").addEventListener("change",event => {
    state.rendererMode = event.target.value === "standard" ? "standard" : "premium";
    renderAll();
  });

  $$(".lab-segmented button").forEach(button => button.addEventListener("click",() => {
    state.side=button.dataset.side;
    $$(".lab-segmented button").forEach(item=>item.classList.toggle("is-active",item===button));
    renderPair();
  }));

  $("#resetButton").addEventListener("click",() => {
    syncControlsFromTeam(teamById(state.teamId));
    renderPair();
    renderLocker();
  });

  $("#matchHomeSelect").addEventListener("change",async event => {
    state.matchHome=event.target.value;
    await ensureTeamPalette(teamById(state.matchHome));
    renderMatch();
  });
  $("#matchAwaySelect").addEventListener("change",async event => {
    state.matchAway=event.target.value;
    await ensureTeamPalette(teamById(state.matchAway));
    renderMatch();
  });

  fillPlayerSelect();
  renderAll();
  loadEcl27Data();
})();
