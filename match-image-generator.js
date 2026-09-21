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
  const access = {
    mode:String(window.SEH_MATCH_GRAPHICS_ACCESS?.mode || "admin").toLowerCase(),
    teamName:String(window.SEH_MATCH_GRAPHICS_ACCESS?.teamName || "").trim()
  };
  let teamDirectory = [...JERSEY_PRESETS];
  let rostersByTeamId = new Map();
  let dataSource = "testdata";

  const FORMATS = {
    square:{ label:"Kvadrat · 1080×1080", width:1080, height:1080 },
    landscape:{ label:"Liggande · 1920×1080", width:1920, height:1080 },
    story:{ label:"Story · 1080×1920", width:1080, height:1920 }
  };

  const state = {
    teamId:"carolus",
    opponentId:"vasteras",
    ownSide:"home",
    competition:"ECL 27 Winter",
    badge:"MATCHDAY",
    date:"2026-10-01",
    time:"20:00",
    format:"square",
    lineupStyle:"cards",
    streamPlatform:"none",
    streamChannel:"",
    playerName:"eSWAHN",
    playerNumber:"21",
    lineup:{...EMPTY_LINEUP}
  };

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("sv-SE")
    .replace(/[^a-z0-9]+/g," ")
    .trim();

  const manifestEntries = Object.entries(window.SEH_TEAM_LOGO_FILES || {});
  const assetPrefix = location.pathname.includes("/lab/match-image-generator/") ? "../../" : "";

  function logoFileFor(teamName) {
    const wanted = normalize(teamName);
    let hit = manifestEntries.find(([key,value]) =>
      normalize(key.replace(/\.png$/i,"")) === wanted ||
      normalize(value.replace(/\.png$/i,"")) === wanted
    );
    if (!hit) {
      hit = manifestEntries.find(([key,value]) =>
        normalize(key).includes(wanted) || normalize(value).includes(wanted)
      );
    }
    return hit ? hit[1] : "";
  }

  function logoUrl(teamName) {
    const file = logoFileFor(teamName);
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
    const palettes = [
      ["#142d4c","#d6b15f","#f4f4ef","shoulder"],
      ["#11161d","#c63b42","#f0f2f4","classic"],
      ["#183b34","#d8b35e","#f2f3ef","minimal"],
      ["#30204c","#d1a33f","#f4f0f5","diagonal"]
    ];
    return palettes[Math.abs(index) % palettes.length];
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

  function setDefaultLineup() {
    const players = rosterFor(state.teamId);
    const next = {...EMPTY_LINEUP};
    POSITIONS.forEach((pos,index) => {
      next[pos] = players[index] || "";
    });
    state.lineup = next;
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

  async function loadLagbyggeData() {
    const status = $("#dataStatus");
    if (status) status.textContent = "Hämtar aktuellt lagbygge…";
    try {
      const [teams,rosterRows] = await Promise.all([
        getPublicRows(
          "v_ecl27_team_builds_public",
          "select=id,name,division,source_team_id,logo_name,is_new_project,status&order=division.asc,name.asc"
        ),
        getPublicRows(
          "v_ecl27_current_roster_v1",
          "select=subject_key,player_key,display_gamertag,team_project_id,team_name,division,team_id,logo_name,roster_source&order=team_name.asc,display_gamertag.asc"
        )
      ]);

      const rows = Array.isArray(teams) ? teams : [];
      if (!rows.length) throw new Error("Lagbygget innehåller inga lag");

      teamDirectory = rows.map(buildDynamicTeam);
      const byName = new Map(teamDirectory.map(team => [normalize(team.name),team]));
      rostersByTeamId = new Map(teamDirectory.map(team => [team.id,[]]));

      for (const row of Array.isArray(rosterRows) ? rosterRows : []) {
        const team = byName.get(normalize(row.team_name));
        const player = String(row.display_gamertag || "").trim();
        if (!team || !player) continue;
        const list = rostersByTeamId.get(team.id);
        if (!list.some(name => normalize(name) === normalize(player))) list.push(player);
      }
      for (const list of rostersByTeamId.values()) {
        list.sort((a,b) => a.localeCompare(b,"sv",{sensitivity:"base"}));
      }

      dataSource = "ECL 27 lagbygge";
      const preferred = teamDirectory.find(team => normalize(team.name) === normalize("Carolus Icemen")) || teamDirectory[0];
      state.teamId = preferred.id;
      state.opponentId = teamDirectory.find(team => team.id !== state.teamId)?.id || state.teamId;
      applyAccessMode();
      setDefaultLineup();
      syncForm();
      render();

      const playerCount = [...rostersByTeamId.values()].reduce((sum,list) => sum + list.length,0);
      if (status) status.textContent = teamDirectory.length + " lag · " + playerCount + " aktuella spelare";
    } catch (error) {
      console.error("[Match Graphics] kunde inte läsa lagbygget",error);
      dataSource = "lokal testdata";
      rostersByTeamId = new Map(JERSEY_PRESETS.map(team => [team.id,[]]));
      teamDirectory = [...JERSEY_PRESETS];
      state.teamId = teamDirectory[0].id;
      state.opponentId = teamDirectory[1]?.id || teamDirectory[0].id;
      state.lineup = {...EMPTY_LINEUP};
      syncForm();
      render();
      if (status) status.textContent = "Lagbygget kunde inte laddas · visar testlag";
    }
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
        playerNumber:" "
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
    const colX = [120,722];
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
        playerNumber:" "
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
        leftX:205,rightX:1245,jerseyY:182,jerseySize:470,
        teamNameY:188,vsY:382,metaY:468,lineupY:822,
        headerY:76,competitionY:116,ownLabelY:784
      };
    }
    if (format === "story") {
      return {
        width:1080,height:1920,
        leftX:58,rightX:602,jerseyY:430,jerseySize:420,
        teamNameY:398,vsY:670,metaY:760,lineupY:1135,
        headerY:120,competitionY:174,ownLabelY:1080
      };
    }
    return {
      width:1080,height:1080,
      leftX:50,rightX:630,jerseyY:214,jerseySize:400,
      teamNameY:195,vsY:401,metaY:488,lineupY:835,
      headerY:62,competitionY:102,ownLabelY:799
    };
  }

  function buildMatchSvg() {
    const own = teamById(state.teamId);
    const opponent = teamById(state.opponentId);
    const home = state.ownSide === "home" ? own : opponent;
    const away = state.ownSide === "home" ? opponent : own;
    const layout = layoutFor(state.format);
    const W = layout.width;
    const H = layout.height;
    const leftJersey = premiumJerseySvg(home,{variant:"home",side:"front",compact:false});
    const rightJersey = premiumJerseySvg(away,{variant:"away",side:"front",compact:false});
    const titleSize = state.format === "landscape" ? 58 : state.format === "story" ? 56 : 42;
    const teamSize = state.format === "landscape" ? 34 : state.format === "story" ? 31 : 27;
    const vsSize = state.format === "landscape" ? 92 : state.format === "story" ? 78 : 68;
    const metaSize = state.format === "landscape" ? 34 : state.format === "story" ? 32 : 25;
    const ownVariant = state.ownSide === "home" ? "home" : "away";
    const lineup = state.lineupStyle === "jerseys"
      ? (state.format === "story"
          ? lineupJerseyStory(layout.lineupY,own,ownVariant)
          : lineupJerseySquare(W,layout.lineupY,own,ownVariant))
      : (state.format === "story"
          ? lineupMarkupStory(layout.lineupY)
          : lineupMarkupSquare(W,layout.lineupY));
    const stream = esc(streamLabel());
    const ownSideLabel = state.ownSide === "home" ? "HEMMA" : "BORTA";
    const ownSideX = state.ownSide === "home"
      ? layout.leftX + layout.jerseySize / 2
      : layout.rightX + layout.jerseySize / 2;
    const ownName = esc(own.name);
    const homeName = esc(home.name);
    const awayName = esc(away.name);
    const badge = esc(cleanText(state.badge,20).toUpperCase() || "MATCHDAY");
    const competition = esc(cleanText(state.competition,28).toUpperCase() || "SVENSK eHOCKEY");
    const date = esc(formatDate(state.date));
    const time = esc(cleanText(state.time,5) || "20:00");

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Matchbild ' + homeName + ' mot ' + awayName + '">',
      '<defs>',
      '<linearGradient id="match-bg" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0" stop-color="' + home.primary + '"/><stop offset=".42" stop-color="#090d12"/><stop offset=".62" stop-color="#090d12"/><stop offset="1" stop-color="' + away.primary + '"/>',
      '</linearGradient>',
      '<radialGradient id="match-light" cx="50%" cy="34%" r="72%"><stop offset="0" stop-color="#ffffff" stop-opacity=".13"/><stop offset=".55" stop-color="#ffffff" stop-opacity=".02"/><stop offset="1" stop-color="#000000" stop-opacity=".34"/></radialGradient>',
      '<pattern id="match-grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#fff" stroke-opacity=".028" stroke-width="1"/></pattern>',
      '<filter id="glow"><feGaussianBlur stdDeviation="28"/></filter>',
      '</defs>',
      '<rect width="' + W + '" height="' + H + '" fill="url(#match-bg)"/>',
      '<circle cx="' + (W * .22) + '" cy="' + (H * .27) + '" r="' + (W * .22) + '" fill="' + home.accent + '" opacity=".10" filter="url(#glow)"/>',
      '<circle cx="' + (W * .80) + '" cy="' + (H * .29) + '" r="' + (W * .20) + '" fill="' + away.accent + '" opacity=".09" filter="url(#glow)"/>',
      '<rect width="' + W + '" height="' + H + '" fill="url(#match-light)"/>',
      '<rect width="' + W + '" height="' + H + '" fill="url(#match-grid)"/>',
      '<path d="M' + (W/2) + ' 0 L' + (W*.43) + ' ' + H + ' L' + (W*.57) + ' ' + H + ' Z" fill="#ffffff" opacity=".025"/>',
      '<text x="' + (W/2) + '" y="' + layout.headerY + '" text-anchor="middle" fill="#ffffff" font-size="' + titleSize + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">' + badge + '</text>',
      '<text x="' + (W/2) + '" y="' + layout.competitionY + '" text-anchor="middle" fill="#ffffff" fill-opacity=".62" font-size="' + (titleSize*.34) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">' + competition + '</text>',
      '<text x="' + (layout.leftX + layout.jerseySize/2) + '" y="' + layout.teamNameY + '" text-anchor="middle" fill="#ffffff" font-size="' + teamSize + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + homeName + '</text>',
      '<text x="' + (layout.rightX + layout.jerseySize/2) + '" y="' + layout.teamNameY + '" text-anchor="middle" fill="#ffffff" font-size="' + teamSize + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + awayName + '</text>',
      placedJersey(leftJersey,layout.leftX,layout.jerseyY,layout.jerseySize),
      placedJersey(rightJersey,layout.rightX,layout.jerseyY,layout.jerseySize),
      '<circle cx="' + (W/2) + '" cy="' + layout.vsY + '" r="' + (state.format === "landscape" ? 72 : 58) + '" fill="#070a0d" fill-opacity=".86" stroke="#ffffff" stroke-opacity=".14"/>',
      '<text x="' + (W/2) + '" y="' + (layout.vsY + vsSize*.28) + '" text-anchor="middle" fill="#ffffff" font-size="' + vsSize + '" font-weight="1000" font-family="Arial,Helvetica,sans-serif" letter-spacing="-4">VS</text>',
      '<text x="' + (W/2) + '" y="' + layout.metaY + '" text-anchor="middle" fill="#ffffff" font-size="' + metaSize + '" font-weight="900" font-family="Arial,Helvetica,sans-serif">' + date + ' · ' + time + '</text>',
      stream ? '<g><rect x="' + (W/2 - (state.format === "landscape" ? 220 : 180)) + '" y="' + (layout.metaY + 20) + '" width="' + (state.format === "landscape" ? 440 : 360) + '" height="' + (state.format === "story" ? 44 : 38) + '" rx="19" fill="#ffffff" fill-opacity=".075" stroke="#ffffff" stroke-opacity=".11"/><circle cx="' + (W/2 - (state.format === "landscape" ? 194 : 154)) + '" cy="' + (layout.metaY + (state.format === "story" ? 42 : 39)) + '" r="6" fill="#ff4d5f"/><text x="' + (W/2) + '" y="' + (layout.metaY + (state.format === "story" ? 48 : 44)) + '" text-anchor="middle" fill="#ffffff" font-size="' + (state.format === "story" ? 19 : state.format === "landscape" ? 18 : 15) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.1">' + stream + '</text></g>' : '',
      '<text x="' + ownSideX + '" y="' + layout.ownLabelY + '" text-anchor="middle" fill="#ffffff" fill-opacity=".54" font-size="' + (state.format === "story" ? 17 : 14) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="2.5">' + ownSideLabel + ' · ' + ownName + '</text>',
      '<text x="' + (W/2) + '" y="' + (layout.lineupY - 28) + '" text-anchor="middle" fill="#ffffff" fill-opacity=".72" font-size="' + (state.format === "story" ? 22 : 16) + '" font-weight="900" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">STARTING SIX</text>',
      lineup,
      '<text x="' + (W/2) + '" y="' + (H - 30) + '" text-anchor="middle" fill="#ffffff" fill-opacity=".34" font-size="' + (state.format === "landscape" ? 17 : 13) + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" letter-spacing="3">SVENSK eHOCKEY · MATCH GRAPHICS</text>',
      '</svg>'
    ].join("");
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
    syncLineupSelects();
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
    state.lineupStyle = "cards";
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

  $("#teamSelect").addEventListener("change",event => {
    state.teamId = event.target.value;
    ensureDifferentTeams("team");
    setDefaultLineup();
    syncForm();
    render();
  });

  $("#opponentSelect").addEventListener("change",event => {
    state.opponentId = event.target.value;
    ensureDifferentTeams("opponent");
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

  $("#lineupStyleSelect").addEventListener("change",event => {
    state.lineupStyle = event.target.value === "jerseys" ? "jerseys" : "cards";
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

  $("#resetButton").addEventListener("click",reset);
  $("#svgButton").addEventListener("click",exportSvg);
  $("#pngButton").addEventListener("click",exportPng);

  syncForm();
  render();
  loadLagbyggeData();
})();
