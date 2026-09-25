/*
  Svensk eHockey – public team jersey renderer.
  V28 premium jersey body is mirrored from Jersey Preview.
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
    if(!["shoulder","classic","minimal","diagonal","chestband","chevron","panels","retro","sash"].includes(pattern)) return null;
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

  function extraJerseyPattern(pattern, stripe, secondary, side, torsoClip) {
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
        <g clip-path="url(#${torsoClip})">
          <path d="M455 60 L170 610" fill="none" stroke="${secondary}" stroke-width="64"/>
          <path d="M455 60 L170 610" fill="none" stroke="${stripe}" stroke-width="46"/>
        </g>
        <path d="M60 348 L183 330 V355 L60 373 Z M417 330 L540 348 V373 L417 355 Z M160 539 H440 V554 H160 Z" fill="${stripe}"/>`
    };
    return designs[pattern] || "";
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

    const extraDesign = extraJerseyPattern(pattern, stripeA, stripeB, side, `torso-clip-${uid}`);
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
            <!-- Continuous armhole seam: fabric overlap separates sleeve and body across every pattern. -->
            <g fill="none" stroke-linecap="round">
              <path d="M203 111 C181 138 169 165 172 198 C174 232 183 260 186 290 C188 314 188 339 188 360 M393 109 C416 139 429 165 426 201 C422 230 414 257 410 289 C407 314 409 339 408 360" stroke="#000" stroke-opacity="${variant === "away" ? ".17" : ".26"}" stroke-width="5.5" filter="url(#collar-shade-${uid})"/>
              <path d="M203 111 C181 138 169 165 172 198 C174 232 183 260 186 290 C188 314 188 339 188 360 M393 109 C416 139 429 165 426 201 C422 230 414 257 410 289 C407 314 409 339 408 360" stroke="#000" stroke-opacity=".22" stroke-width="1.1"/>
              <path d="M206 112 C184 139 172 166 175 198 C177 231 186 260 189 290 C191 314 191 338 191 355 M390 110 C413 140 426 166 423 201 C419 230 411 257 407 289 C404 314 406 338 405 355" stroke="#fff" stroke-opacity="${variant === "away" ? ".38" : ".22"}" stroke-width=".85" stroke-dasharray="1.3 2.2"/>
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
      '<div class="team-public-jersey-v1__owner" hidden><button type="button" data-jersey-edit>Redigera tröja</button><a data-match-graphics hidden style="display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 12px;border:1px solid rgba(244,196,0,.55);border-radius:9px;background:rgba(244,196,0,.08);color:#f4c400;font:800 10px/1 system-ui,sans-serif;letter-spacing:.02em;text-decoration:none;white-space:nowrap">Match Graphics</a><span data-jersey-role></span></div>'+
      '<form class="team-public-jersey-v1__editor" data-jersey-editor hidden>'+
        '<div class="team-public-jersey-v1__editor-head"><strong>Tröjeditor</strong><button type="button" data-jersey-close aria-label="Stäng">×</button></div>'+
        '<label><span>Grundfärg</span><input type="color" name="primary" value="#0c0f12"></label>'+
        '<label><span>Andrafärg</span><input type="color" name="accent" value="#f4f4f1"></label>'+
        '<label><span>Detaljer</span><input type="color" name="trim" value="#f4f4f1"></label>'+
        '<label class="team-public-jersey-v1__pattern"><span>Mönster</span><select name="pattern">'+
          '<option value="shoulder">Axlar + dubbla ärmstreck</option>'+
          '<option value="classic">Klassiska midje-/ärmstreck</option>'+
          '<option value="diagonal">Diagonal modern</option>'+
          '<option value="minimal">Minimal</option>'+
          '<option value="chestband">Brett bröstband</option>'+
          '<option value="chevron">V-form / Chevron</option>'+
          '<option value="panels">Kontrastpaneler</option>'+
          '<option value="retro">Retro – tre ränder</option>'+
          '<option value="sash">Diagonal sash</option>'+
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
    const matchGraphics=container.querySelector("[data-match-graphics]");
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

      if(matchGraphics && (access.is_admin || access.staff_role==="captain" || access.staff_role==="assistant_captain")) {
        let isScl27Team=false;
        try {
          isScl27Team=Boolean(await rpc("seh_is_scl27_registered_team",{p_team_name:team.name}));
        } catch(error) {
          console.warn("[Team Jersey] kunde inte kontrollera SCL 27-registrering",error);
        }
        if(isScl27Team) {
          matchGraphics.hidden=false;
          matchGraphics.href="match-image-generator.html?mode="+(access.is_admin ? "admin" : "captain")+"&team="+encodeURIComponent(team.name);
        }
      }

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

  async function prepareTeam(input) {
    const team=buildTeam(input);
    teamDirectory=[team];
    await ensureRenderableTeamLogo(team);
    await ensureTeamPalette(team);
    return team;
  }
  window.SEH_TEAM_JERSEY_V27={mount,render:premiumJerseySvg,prepareTeam};
})();
