(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const TEAMS = [
    { id:"carolus", name:"Carolus Icemen", code:"CI", primary:"#123b67", accent:"#c99a32", trim:"#f3f4f2", pattern:"shoulder" },
    { id:"shadow", name:"Shadow skulls", code:"SS", primary:"#090b0d", accent:"#c52e33", trim:"#f1f1ef", pattern:"diagonal" },
    { id:"vasteras", name:"Västerås IK", code:"VIK", primary:"#0b0c0d", accent:"#f0c400", trim:"#f3f3ef", pattern:"classic" },
    { id:"nordic", name:"Nordic Nosebleed", code:"NNB", primary:"#102b48", accent:"#b62d31", trim:"#eef2f4", pattern:"shoulder" },
    { id:"ssk", name:"SSK Academy", code:"SSK", primary:"#123f83", accent:"#f1c21b", trim:"#f4f4ef", pattern:"classic" }
  ];

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
    return file ? `../../teamlogos/${encodeURIComponent(file).replace(/%2F/gi,"/")}` : "";
  }

  function teamById(id) {
    return TEAMS.find(team => team.id === id) || TEAMS[0];
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
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
    }[pattern] || "";

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
    select.innerHTML = TEAMS.map(team => `<option value="${team.id}"${team.id === selected ? " selected" : ""}>${esc(team.name)}</option>`).join("");
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
    $("#lockerRoom").innerHTML = LOCKER.map(({pos,name,number}) => `
      <div class="locker-slot">
        <div class="locker-light" aria-hidden="true"></div>
        <div class="locker-nameplate">
          <strong>${esc(name)}</strong>
          <span>${esc(pos)}</span>
        </div>
        <div class="locker-hook" aria-hidden="true"></div>
        <div class="locker-jersey">${renderJersey(team,{variant:"home",side:"back",pattern:state.pattern,playerName:name,playerNumber:number,compact:true})}</div>
        <div class="locker-base"><span>${esc(pos)}</span><small>#${esc(number)}</small></div>
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
    $("#teamGrid").innerHTML = TEAMS.map(team => `
      <article class="team-jersey-card">
        ${renderJersey(team,{variant:"home",side:"front",pattern:team.pattern,compact:true})}
        <strong>${esc(team.name)}</strong>
        <small>HEMMA · ${esc(team.pattern.toUpperCase())}</small>
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

  $("#teamSelect").addEventListener("change",event => {
    syncControlsFromTeam(teamById(event.target.value));
    renderPair();
    renderLocker();
  });
  $("#patternSelect").addEventListener("change",event => { state.pattern=event.target.value; renderPair(); renderLocker(); });
  $("#primaryColor").addEventListener("input",event => { state.primary=event.target.value; renderPair(); renderLocker(); });
  $("#accentColor").addEventListener("input",event => { state.accent=event.target.value; renderPair(); renderLocker(); });
  $("#trimColor").addEventListener("input",event => { state.trim=event.target.value; renderPair(); renderLocker(); });
  $("#playerName").addEventListener("input",event => { state.playerName=event.target.value || "PLAYER"; renderPair(); });
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

  $("#matchHomeSelect").addEventListener("change",event => { state.matchHome=event.target.value; renderMatch(); });
  $("#matchAwaySelect").addEventListener("change",event => { state.matchAway=event.target.value; renderMatch(); });

  renderAll();
})();
