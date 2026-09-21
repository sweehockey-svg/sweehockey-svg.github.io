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
    return file ? `teamlogos/${encodeURIComponent(file).replace(/%2F/gi,"/")}` : "";
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

    // V26: reference-led hockey cut. Sleeves overlap the chest; only the lower cuff separates.
    const leftSleeve = "M244 94 C216 97 178 103 153 115 C126 128 114 151 112 183 C109 242 107 309 104 377 L97 516 Q98 530 173 529 C181 517 184 480 190 445 C195 407 199 354 198 306 C197 253 189 213 185 179 C183 144 210 109 244 94 Z";
    const rightSleeve = "M356 94 C384 97 422 103 447 115 C474 128 486 151 488 183 C491 242 493 309 496 377 L503 516 Q502 530 427 529 C419 517 416 480 410 445 C405 407 401 354 402 306 C403 253 411 213 415 179 C417 144 390 109 356 94 Z";
    const torso = "M244 94 Q300 110 356 94 C387 100 420 125 426 160 C432 191 426 230 420 264 C416 306 414 346 411 385 C407 438 410 494 408 558 Q406 568 384 571 Q300 587 216 571 Q194 568 192 558 C190 505 188 467 185 426 C181 380 179 340 176 305 C170 258 166 213 170 178 C175 134 205 105 244 94 Z";

    const shoulderDecor = pattern === "shoulder" ? `
      <path d="M106 85 H494 V169 Q398 142 300 146 Q202 142 106 169 Z" fill="${yokeBase}"/>
      <path d="M109 170 Q204 144 300 148 Q396 144 491 170" fill="none" stroke="${stripeB}" stroke-width="8"/>
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
          <linearGradient id="torso-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000" stop-opacity="0"/>
            <stop offset=".055" stop-color="#000" stop-opacity=".045"/>
            <stop offset=".19" stop-color="#fff" stop-opacity=".16"/>
            <stop offset=".38" stop-color="#fff" stop-opacity=".045"/>
            <stop offset=".58" stop-color="#fff" stop-opacity=".09"/>
            <stop offset=".82" stop-color="#000" stop-opacity=".16"/>
            <stop offset=".945" stop-color="#000" stop-opacity=".065"/>
            <stop offset="1" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="left-sleeve-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000" stop-opacity=".34"/>
            <stop offset=".43" stop-color="#fff" stop-opacity=".05"/>
            <stop offset=".78" stop-color="#000" stop-opacity=".012"/>
            <stop offset="1" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="right-sleeve-${uid}" x1="1" x2="0">
            <stop offset="0" stop-color="#000" stop-opacity=".34"/>
            <stop offset=".43" stop-color="#fff" stop-opacity=".05"/>
            <stop offset=".78" stop-color="#000" stop-opacity=".012"/>
            <stop offset="1" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="chest-light-${uid}" cx="32%" cy="20%" r="78%">
            <stop offset="0" stop-color="#fff" stop-opacity="${variant === "away" ? ".22" : ".30"}"/>
            <stop offset=".28" stop-color="#fff" stop-opacity=".09"/>
            <stop offset=".7" stop-color="#000" stop-opacity=".025"/>
            <stop offset="1" stop-color="#000" stop-opacity=".15"/>
          </radialGradient>
          <pattern id="knit-${uid}" width="2.6" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <path d="M.3 .2 L1.3 1.6 L.3 3" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".45"/>
            <path d="M1.5 .2 L2.5 1.6 L1.5 3" fill="none" stroke="#000" stroke-opacity=".14" stroke-width=".45"/>
          </pattern>
          <linearGradient id="neck-lining-${uid}" x1="0" y1="0" x2=".2" y2="1">
            <stop stop-color="#555f65"/><stop offset=".35" stop-color="#d9dcd9"/><stop offset="1" stop-color="#8e9699"/>
          </linearGradient>
          <linearGradient id="collar-light-${uid}" x1="0" x2="1" y2=".4">
            <stop stop-color="#fff" stop-opacity=".27"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".25"/>
          </linearGradient>
          <filter id="shadow-${uid}" x="-35%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="${compact ? 17 : 24}" stdDeviation="${compact ? 13 : 18}" flood-color="#000" flood-opacity=".52"/>
          </filter>
          <filter id="soft-${uid}">
            <feGaussianBlur stdDeviation="4.5"/>
          </filter>
          <filter id="crease-${uid}" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="1.8"/>
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
            <rect width="600" height="600" fill="url(#chest-light-${uid})"/>
            <rect width="600" height="600" fill="url(#knit-${uid})" opacity="${compact ? ".28" : ".52"}"/>
          </g>

          <!-- Draped fabric: tapered, asymmetric folds rather than straight panel outlines. -->
          <g clip-path="url(#clip-${uid})">
            <g filter="url(#soft-${uid})" opacity="${variant === "away" ? ".72" : "1"}">
              <path d="M175 166 C167 207 186 235 189 272 C176 238 151 209 157 173 Z" fill="#000" opacity=".23"/>
              <path d="M181 178 C180 219 199 229 207 268 C197 243 181 233 176 214 Z" fill="#fff" opacity=".17"/>
              <path d="M428 158 C446 199 419 237 413 280 C411 233 426 207 428 158 Z" fill="#000" opacity=".29"/>
              <path d="M439 177 C448 216 427 260 427 304 C417 268 436 215 439 177 Z" fill="#fff" opacity=".18"/>
              <path d="M179 257 C169 320 181 386 189 450 C167 400 158 315 179 257 Z" fill="#000" opacity=".22"/>
              <path d="M420 270 C443 354 414 422 416 491 C398 434 435 350 420 270 Z" fill="#000" opacity=".27"/>
              <path d="M148 267 C123 353 145 405 131 504 C156 425 134 354 148 267 Z" fill="#fff" opacity=".16"/>
              <path d="M474 272 C458 359 480 411 462 516 C490 445 473 359 474 272 Z" fill="#fff" opacity=".14"/>
              <path d="M266 193 C247 270 276 342 241 424 C218 482 233 527 230 568 C216 508 209 478 229 420 C260 338 237 264 266 193 Z" fill="#000" opacity=".11"/>
              <path d="M274 202 C255 279 286 350 253 429 C235 480 248 535 248 570 C227 506 235 465 246 424 C277 343 247 266 274 202 Z" fill="#fff" opacity=".12"/>
              <path d="M353 174 C327 222 360 303 346 366 C335 422 364 491 358 569 C346 506 318 445 333 367 C345 301 319 222 353 174 Z" fill="#000" opacity=".16"/>
              <path d="M367 192 C348 250 383 319 364 381 C352 438 383 496 376 560 C369 497 340 439 353 379 C371 313 343 251 367 192 Z" fill="#fff" opacity=".12"/>
            </g>
            <g fill="none" stroke-linecap="round" filter="url(#crease-${uid})">
              <path d="M156 127 Q176 134 191 156 M188 111 Q215 118 232 133" stroke="#fff" stroke-opacity=".18" stroke-width="4"/>
              <path d="M148 139 Q165 142 179 168 M388 112 Q421 121 440 142" stroke="#000" stroke-opacity=".13" stroke-width="3"/>
              <path d="M159 175 Q157 203 178 223 M439 166 Q445 198 426 227" stroke="#000" stroke-opacity=".16" stroke-width="2.4"/>
              <path d="M108 510 Q137 518 171 513 M430 515 Q463 521 497 513" stroke="#fff" stroke-opacity=".15" stroke-width="2.5"/>
              <path d="M196 559 Q295 579 404 558" stroke="#000" stroke-opacity=".11" stroke-width="2"/>
            </g>
          </g>

          <!-- Curved knit neckline, with a shallow back collar for player views. -->
          ${side === "back" ? `
            <path d="M239 94 Q300 117 361 94 L358 109 Q300 137 242 109 Z" fill="${dark}"/>
            <path d="M244 105 Q300 129 356 105" fill="none" stroke="${stripeA}" stroke-width="3"/>
          ` : `
            <path d="M244 94 Q300 112 356 94 C351 119 327 147 300 168 C273 147 249 119 244 94 Z" fill="url(#neck-lining-${uid})"/>
            <path d="M244 94 Q300 111 356 94 L351 105 Q300 123 249 105 Z" fill="${dark}"/>
            <path d="M235 94 Q240 90 247 95 C248 119 273 149 307 172 L298 182 C260 154 240 128 235 94 Z" fill="${primary}"/>
            <path d="M353 95 Q360 90 365 94 C360 129 338 156 298 182 L290 174 C327 145 349 121 353 95 Z" fill="${primary}"/>
            <path d="M241 97 C247 129 269 152 299 176 C330 153 353 130 359 97" fill="none" stroke="${stripeA}" stroke-width="2.7"/>
            <path d="M237 96 C244 131 266 154 298 181 C337 154 359 124 363 96 L356 96 C350 125 329 149 298 173 C269 151 248 125 245 96 Z" fill="url(#collar-light-${uid})"/>
            <path d="M247 108 C254 132 275 155 300 172 M351 108 C344 133 324 155 300 172" fill="none" stroke="${stripeB}" stroke-opacity=".34" stroke-width=".7" stroke-dasharray="1 1.5"/>
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
