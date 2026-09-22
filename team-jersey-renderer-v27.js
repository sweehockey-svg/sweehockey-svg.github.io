/*
  Svensk eHockey – public team jersey renderer.
  V27 premium jersey body is mirrored from Match Graphics Lab.
*/
(() => {
  "use strict";

  const JERSEY_PRESETS = [
    { id:"carolus", name:"Carolus Icemen", code:"CI", primary:"#123b67", accent:"#c99a32", trim:"#f3f4f2", pattern:"shoulder" },
    { id:"shadow", name:"Shadow skulls", code:"SS", primary:"#090b0d", accent:"#c52e33", trim:"#f1f1ef", pattern:"diagonal" },
    { id:"vasteras", name:"Västerås IK", code:"VIK", primary:"#0b0c0d", accent:"#f0c400", trim:"#f3f3ef", pattern:"classic" },
    { id:"nordic", name:"Nordic Nosebleed", code:"NNB", primary:"#102b48", accent:"#b62d31", trim:"#eef2f4", pattern:"shoulder" },
    { id:"ssk", name:"SSK Academy", code:"SSK", primary:"#123f83", accent:"#f1c21b", trim:"#f4f4ef", pattern:"classic" }
  ];
  const state = {playerName:"PLAYER",playerNumber:"21"};
  const teamPaletteCache = new Map();
  let teamDirectory = [];
  const assetPrefix = "";

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("sv-SE")
    .replace(/[^a-z0-9]+/g," ")
    .trim();

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0,3)
      .map(part => part[0]).join("").toUpperCase();
  }

  function patternFor(name) {
    const patterns=["shoulder","classic","minimal","diagonal"];
    const value=[...String(name||"")].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    return patterns[Math.abs(value)%patterns.length];
  }

  function logoFileFor(teamName, explicitLogoName = "") {
    const aliases = {
      "bik karlskoga":"BIK Karlskoga Esport",
      "bik karlskoga academy":"BIK Karlskoga Academy",
      "northern ztars":"Northern Ztars Hockey"
    };
    const candidates=[explicitLogoName,teamName,aliases[normalize(teamName)]].filter(Boolean);
    for(const candidate of candidates){
      const key=(String(candidate).trim()+".png").normalize("NFC").toLocaleLowerCase("sv-SE");
      const actual=window.SEH_TEAM_LOGO_FILES?.[key];
      if(actual) return actual;
    }
    return "";
  }

  function logoUrl(teamName) {
    const team=teamDirectory.find(item=>normalize(item.name)===normalize(teamName)) || null;
    const path=String(team?.exactLogoUrl || "").trim();
    if(path){
      if(/^https?:\/\//i.test(path) || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
      return assetPrefix+path.replace(/^\/+/, "");
    }
    const file=logoFileFor(teamName,team?.logoName || "");
    if(file) return assetPrefix+"teamlogos/"+encodeURIComponent(file).replace(/%2F/gi,"/");
    return "";
  }

  function rgbToHex(r,g,b) {
    const hex=value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,"0");
    return "#"+hex(r)+hex(g)+hex(b);
  }
  function colorDistance(a,b){return Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b);}
  function colorStats(r,g,b,weight=1){
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    const saturation=max?(max-min)/max:0;
    const luminance=(0.2126*r+0.7152*g+0.0722*b)/255;
    return {r,g,b,weight,saturation,luminance};
  }
  function blackWhiteFallback(team){
    team.primary="#0c0f12"; team.accent="#f4f4f1"; team.trim="#f4f4f1";
    return team;
  }
  function isPresetTeam(team){
    return JERSEY_PRESETS.some(preset=>normalize(preset.name)===normalize(team?.name));
  }

  function extractLogoPalette(url) {
    return new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{
        try{
          const size=56,canvas=document.createElement("canvas");
          canvas.width=size; canvas.height=size;
          const ctx=canvas.getContext("2d",{willReadFrequently:true});
          if(!ctx) return resolve(null);
          ctx.clearRect(0,0,size,size); ctx.drawImage(image,0,0,size,size);
          const pixels=ctx.getImageData(0,0,size,size).data,buckets=new Map();
          for(let i=0;i<pixels.length;i+=4){
            const alpha=pixels[i+3]; if(alpha<72) continue;
            const r=Math.min(255,Math.round(pixels[i]/32)*32);
            const g=Math.min(255,Math.round(pixels[i+1]/32)*32);
            const b=Math.min(255,Math.round(pixels[i+2]/32)*32);
            const stats=colorStats(r,g,b,alpha/255);
            if(stats.luminance>.95 && stats.saturation<.10) continue;
            const key=r+","+g+","+b,current=buckets.get(key)||{r,g,b,weight:0};
            current.weight+=alpha/255; buckets.set(key,current);
          }
          const colors=[...buckets.values()].map(item=>colorStats(item.r,item.g,item.b,item.weight)).sort((a,b)=>b.weight-a.weight);
          if(!colors.length) return resolve(null);
          const topWeight=colors[0].weight||1;
          const darkCandidates=colors.filter(color=>color.luminance<=.56&&color.weight>=topWeight*.08)
            .sort((a,b)=>(b.weight*(1+b.saturation*.28))-(a.weight*(1+a.saturation*.28)));
          const colorfulCandidates=colors.filter(color=>color.saturation>=.20&&color.luminance<=.86)
            .sort((a,b)=>(b.weight*(1+b.saturation*.70))-(a.weight*(1+a.saturation*.70)));
          const primary=darkCandidates[0]||colorfulCandidates[0]||colors[0];
          const accent=colors.filter(color=>colorDistance(color,primary)>=88&&(color.saturation>=.20||color.luminance>=.62))
            .sort((a,b)=>(b.weight*(.7+b.saturation*1.5+b.luminance*.25))-(a.weight*(.7+a.saturation*1.5+a.luminance*.25)))[0];
          const trim=primary.luminance<.58?"#f4f4f1":"#101214";
          resolve({primary:rgbToHex(primary.r,primary.g,primary.b),accent:accent?rgbToHex(accent.r,accent.g,accent.b):trim,trim});
        }catch(error){ console.warn("[Team Jersey] kunde inte läsa logofärger",error); resolve(null); }
      };
      image.onerror=()=>resolve(null);
      image.src=url;
    });
  }

  async function ensureTeamPalette(team){
    if(!team || isPresetTeam(team)) return team;
    const exactUrl=logoUrl(team.name);
    if(!exactUrl) return blackWhiteFallback(team);
    if(teamPaletteCache.has(exactUrl)){Object.assign(team,teamPaletteCache.get(exactUrl));return team;}
    const palette=await extractLogoPalette(exactUrl);
    if(!palette) return blackWhiteFallback(team);
    teamPaletteCache.set(exactUrl,palette); Object.assign(team,palette); return team;
  }

  let jerseyClient = null;

  function getSupabaseClient() {
    if (typeof window.SEH_getAuthClient === "function") {
      const shared = window.SEH_getAuthClient();
      if (shared) return shared;
    }
    if (jerseyClient) return jerseyClient;
    const cfg = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
    const url = String(cfg.supabaseUrl || cfg.SUPABASE_URL || "").trim();
    const key = String(cfg.supabasePublishableKey || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    jerseyClient = window.supabase.createClient(url,key);
    return jerseyClient;
  }

  async function rpc(name,args={}) {
    const client=getSupabaseClient();
    if(!client) throw new Error("Supabase kunde inte startas.");
    const {data,error}=await client.rpc(name,args);
    if(error) throw error;
    return Array.isArray(data) ? (data[0] ?? null) : data;
  }

  function safeSettings(row) {
    if(!row || typeof row!=="object") return null;
    const colors=[row.primary_color,row.accent_color,row.trim_color].map(value=>String(value||"").trim().toLowerCase());
    const pattern=String(row.pattern||"").trim().toLowerCase();
    if(!colors.every(value=>/^#[0-9a-f]{6}$/.test(value))) return null;
    if(!["shoulder","classic","minimal","diagonal"].includes(pattern)) return null;
    return {primary:colors[0],accent:colors[1],trim:colors[2],pattern};
  }

  async function loadSavedSettings(teamId) {
    if(!Number.isInteger(Number(teamId)) || Number(teamId)<=0) return null;
    try {
      return safeSettings(await rpc("seh_get_team_jersey_settings",{p_team_id:Number(teamId)}));
    } catch(error) {
      console.warn("[Team Jersey] kunde inte läsa sparad tröja",error);
      return null;
    }
  }

  async function loadAccess(teamId) {
    const client=getSupabaseClient();
    if(!client || !Number.isInteger(Number(teamId)) || Number(teamId)<=0) return null;
    try {
      const {data:sessionData}=await client.auth.getSession();
      if(!sessionData?.session?.user) return null;
      const value=await rpc("seh_team_jersey_access",{p_team_id:Number(teamId)});
      return value && typeof value==="object" ? value : null;
    } catch(error) {
      console.warn("[Team Jersey] kunde inte läsa redigeringsbehörighet",error);
      return null;
    }
  }

  function canLoadLogo(url) {
    return new Promise(resolve=>{
      const value=String(url||"").trim();
      if(!value) return resolve(false);
      const image=new Image();
      let settled=false;
      const done=result=>{
        if(settled) return;
        settled=true;
        resolve(result);
      };
      image.onload=()=>done(Boolean(image.naturalWidth && image.naturalHeight));
      image.onerror=()=>done(false);
      image.src=value;
      if(image.complete) {
        queueMicrotask(()=>done(Boolean(image.naturalWidth && image.naturalHeight)));
      }
      setTimeout(()=>done(false),4000);
    });
  }

  async function ensureRenderableTeamLogo(team) {
    const candidate=logoUrl(team.name);
    if(!candidate) return;
    if(await canLoadLogo(candidate)) return;

    // Never leave a broken <image> in the jersey. Fall back to initials.
    team.exactLogoUrl="";
    team.logoName="";
    teamDirectory=[team];

    const manifestCandidate=logoFileFor(team.name,"");
    if(manifestCandidate) {
      const fallback=assetPrefix+"teamlogos/"+encodeURIComponent(manifestCandidate).replace(/%2F/gi,"/");
      if(await canLoadLogo(fallback)) {
        team.exactLogoUrl=fallback;
        teamDirectory=[team];
      }
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


  function buildTeam(input) {
    const name=String(input?.name || input?.currentName || "Okänt lag").trim();
    const preset=JERSEY_PRESETS.find(item=>normalize(item.name)===normalize(name));
    if(preset){
      return {...preset,id:String(input?.id || input?.teamId || preset.id),exactLogoUrl:String(input?.logoUrl || input?.logoPath || "")};
    }
    return {
      id:String(input?.id || input?.teamId || normalize(name).replace(/\s+/g,"-") || "team"),
      name,
      code:initials(name),
      primary:"#0c0f12",
      accent:"#f4f4f1",
      trim:"#f4f4f1",
      pattern:patternFor(name),
      exactLogoUrl:String(input?.logoUrl || input?.logoPath || ""),
      logoName:String(input?.logoName || "")
    };
  }

  async function mount(container,input) {
    if(!container) return;
    const team=buildTeam(input);
    teamDirectory=[team];

    await ensureRenderableTeamLogo(team);
    await ensureTeamPalette(team);
    const automaticStyle={
      primary:team.primary,
      accent:team.accent,
      trim:team.trim,
      pattern:team.pattern
    };
    const savedStyle=await loadSavedSettings(team.id);
    if(savedStyle) Object.assign(team,savedStyle);

    container.classList.add("team-public-jersey-v1");
    container.innerHTML =
      '<div class="team-public-jersey-v1__head"><span>TRÖJA</span><div class="team-public-jersey-v1__toggle" role="group" aria-label="Välj tröja">'+
      '<button type="button" class="is-active" data-jersey-variant="home">Hemma</button>'+
      '<button type="button" data-jersey-variant="away">Borta</button></div></div>'+
      '<div class="team-public-jersey-v1__stage"></div>'+
      '<div class="team-public-jersey-v1__owner" hidden><button type="button" data-jersey-edit>Redigera tröja</button><span data-jersey-role></span></div>'+
      '<form class="team-public-jersey-v1__editor" data-jersey-editor hidden>'+
        '<div class="team-public-jersey-v1__editor-head"><strong>Tröjeditor</strong><button type="button" data-jersey-close aria-label="Stäng">×</button></div>'+
        '<label><span>Grundfärg</span><input type="color" name="primary" value="#0c0f12"></label>'+
        '<label><span>Andrafärg</span><input type="color" name="accent" value="#f4f4f1"></label>'+
        '<label><span>Detaljer</span><input type="color" name="trim" value="#f4f4f1"></label>'+
        '<label class="team-public-jersey-v1__pattern"><span>Mönster</span><select name="pattern">'+
          '<option value="shoulder">Axlar</option>'+
          '<option value="classic">Klassisk</option>'+
          '<option value="minimal">Minimal</option>'+
          '<option value="diagonal">Diagonal</option>'+
        '</select></label>'+
        '<div class="team-public-jersey-v1__editor-actions">'+
          '<button type="button" data-jersey-auto>Från lagloggan</button>'+
          '<button type="button" data-jersey-reset>Ta bort egen design</button>'+
          '<button type="submit" class="is-primary">Spara</button>'+
        '</div>'+
        '<p class="team-public-jersey-v1__status" data-jersey-status aria-live="polite"></p>'+
      '</form>';

    const stage=container.querySelector(".team-public-jersey-v1__stage");
    const buttons=[...container.querySelectorAll("[data-jersey-variant]")];
    const owner=container.querySelector(".team-public-jersey-v1__owner");
    const editButton=container.querySelector("[data-jersey-edit]");
    const roleLabel=container.querySelector("[data-jersey-role]");
    const editor=container.querySelector("[data-jersey-editor]");
    const closeButton=container.querySelector("[data-jersey-close]");
    const autoButton=container.querySelector("[data-jersey-auto]");
    const resetButton=container.querySelector("[data-jersey-reset]");
    const status=container.querySelector("[data-jersey-status]");
    const primaryInput=editor?.elements?.primary;
    const accentInput=editor?.elements?.accent;
    const trimInput=editor?.elements?.trim;
    const patternInput=editor?.elements?.pattern;
    let variant="home";

    function currentEditorStyle() {
      return {
        primary:String(primaryInput?.value || team.primary),
        accent:String(accentInput?.value || team.accent),
        trim:String(trimInput?.value || team.trim),
        pattern:String(patternInput?.value || team.pattern)
      };
    }

    function syncEditor(style=team) {
      if(primaryInput) primaryInput.value=style.primary;
      if(accentInput) accentInput.value=style.accent;
      if(trimInput) trimInput.value=style.trim;
      if(patternInput) patternInput.value=style.pattern;
    }

    function paint(style=team) {
      stage.innerHTML=premiumJerseySvg({...team,...style},{variant,side:"front",compact:false});
      buttons.forEach(button=>button.classList.toggle("is-active",button.dataset.jerseyVariant===variant));
    }

    buttons.forEach(button=>button.addEventListener("click",()=>{
      variant=button.dataset.jerseyVariant || "home";
      paint(editor && !editor.hidden ? currentEditorStyle() : team);
    }));

    [primaryInput,accentInput,trimInput,patternInput].filter(Boolean).forEach(input=>{
      input.addEventListener("input",()=>paint(currentEditorStyle()));
      input.addEventListener("change",()=>paint(currentEditorStyle()));
    });

    syncEditor(team);
    paint();

    const access=await loadAccess(team.id);
    if(access?.can_edit && owner && editor) {
      owner.hidden=false;
      roleLabel.textContent=access.is_admin
        ? "ADMIN"
        : access.staff_role==="captain"
          ? "KAPTEN"
          : access.staff_role==="assistant_captain"
            ? "ASSISTERANDE KAPTEN"
            : "LAGLEDARE";

      editButton?.addEventListener("click",()=>{
        syncEditor(team);
        editor.hidden=false;
        owner.hidden=true;
        status.textContent="";
        paint(currentEditorStyle());
      });

      closeButton?.addEventListener("click",()=>{
        editor.hidden=true;
        owner.hidden=false;
        syncEditor(team);
        status.textContent="";
        paint(team);
      });

      autoButton?.addEventListener("click",()=>{
        syncEditor(automaticStyle);
        status.textContent="Förhandsvisar färgerna från lagloggan. Tryck Spara för att använda dem.";
        paint(currentEditorStyle());
      });

      resetButton?.addEventListener("click",async()=>{
        if(!confirm("Ta bort den sparade tröjdesignen och återgå till automatisk design från lagloggan?")) return;
        resetButton.disabled=true;
        status.textContent="Återställer…";
        try{
          await rpc("seh_reset_team_jersey",{p_team_id:Number(team.id)});
          Object.assign(team,automaticStyle);
          syncEditor(team);
          status.textContent="Egen design borttagen.";
          paint(team);
        }catch(error){
          status.textContent="Kunde inte återställa: "+(error?.message || error);
        }finally{
          resetButton.disabled=false;
        }
      });

      editor.addEventListener("submit",async(event)=>{
        event.preventDefault();
        const saveButton=editor.querySelector('button[type="submit"]');
        const style=currentEditorStyle();
        saveButton.disabled=true;
        status.textContent="Sparar…";
        try{
          const saved=safeSettings(await rpc("seh_save_team_jersey",{
            p_team_id:Number(team.id),
            p_primary_color:style.primary,
            p_accent_color:style.accent,
            p_trim_color:style.trim,
            p_pattern:style.pattern
          }));
          if(!saved) throw new Error("Sparningen gav inget giltigt svar.");
          Object.assign(team,saved);
          syncEditor(team);
          status.textContent="Sparat. Tröjan är nu uppdaterad för alla.";
          paint(team);
        }catch(error){
          status.textContent="Kunde inte spara: "+(error?.message || error);
        }finally{
          saveButton.disabled=false;
        }
      });
    }
  }

  window.SEH_TEAM_JERSEY_V27={mount};
})();
