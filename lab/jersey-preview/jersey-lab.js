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
    const sleeveBase = variant === "away" ? "#f2f2ef" : primary;
    const yokeBase = pattern === "shoulder"
      ? (variant === "away" ? primary : accent)
      : (variant === "away" ? trim : primary);
    const stripeA = variant === "away" ? primary : accent;
    const stripeB = variant === "away" ? accent : trim;
    const ink = variant === "away" ? primary : trim;
    const dark = variant === "away" ? primary : "#07090a";

    const leftSleeve = "M205 114 C180 111 149 120 120 139 L88 160 C69 173 58 190 56 211 L45 426 Q82 447 126 456 L154 334 L174 173 Q179 130 205 114 Z";
    const rightSleeve = "M395 114 C420 111 451 120 480 139 L512 160 C531 173 542 190 544 211 L555 426 Q518 447 474 456 L446 334 L426 173 Q421 130 395 114 Z";
    const torso = "M205 114 C233 94 367 94 395 114 C414 130 421 151 420 176 L424 532 C420 551 377 560 300 564 C223 560 180 551 176 532 L180 176 C179 151 186 130 205 114 Z";
    const fullShape = "M205 114 C180 111 149 120 120 139 L88 160 C69 173 58 190 56 211 L45 426 Q82 447 126 456 L154 334 L176 532 C180 551 223 560 300 564 C377 560 420 551 424 532 L446 334 L474 456 Q518 447 555 426 L544 211 C542 190 531 173 512 160 L480 139 C451 120 420 111 395 114 C367 94 233 94 205 114 Z";

    const shoulderDecor = pattern === "minimal"
      ? `
        <path d="M169 151 C214 121 259 111 300 111 C341 111 386 121 431 151" fill="none" stroke="${stripeB}" stroke-width="8" opacity=".9"/>
      `
      : `
        <path d="M137 160 C182 130 235 115 300 115 C365 115 418 130 463 160 L449 185 C405 162 356 151 300 151 C244 151 195 162 151 185 Z" fill="${yokeBase}"/>
        <path d="M151 164 C191 140 241 127 300 127 C359 127 409 140 449 164" fill="none" stroke="${stripeB}" stroke-width="5" opacity=".86"/>
      `;

    const sleeveStriping = pattern === "minimal" ? `
      <path d="M52 326 L143 312 L138 340 L49 354 Z M548 326 L457 312 L462 340 L551 354 Z" fill="${stripeA}"/>
    ` : pattern === "diagonal" ? `
      <path d="M49 269 L149 231 L143 273 L45 311 Z M551 269 L451 231 L457 273 L555 311 Z" fill="${stripeA}"/>
      <path d="M45 309 L140 274 L136 299 L42 334 Z M555 309 L460 274 L464 299 L558 334 Z" fill="${stripeB}"/>
    ` : `
      <path d="M48 276 L146 258 L141 293 L44 311 Z M552 276 L454 258 L459 293 L556 311 Z" fill="${stripeA}"/>
      <path d="M44 316 L139 300 L135 327 L42 342 Z M556 316 L461 300 L465 327 L558 342 Z" fill="${stripeB}"/>
    `;

    const hemStriping = pattern === "minimal" ? `
      <path d="M177 510 Q300 528 423 510 L423 531 Q300 548 177 531 Z" fill="${stripeA}"/>
    ` : `
      <path d="M176 499 Q300 518 424 499 L424 521 Q300 539 176 521 Z" fill="${stripeA}"/>
      <path d="M176 525 Q300 543 424 525 L424 539 Q300 555 176 539 Z" fill="${stripeB}"/>
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
          ? `<image href="${esc(logo)}" x="188" y="196" width="224" height="202" preserveAspectRatio="xMidYMid meet"/>`
          : `<text x="300" y="310" text-anchor="middle" fill="${ink}" font-size="74" font-weight="1000">${esc(team.code)}</text>`}
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
            <path d="${fullShape}"/>
          </clipPath>
          <linearGradient id="torso-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000" stop-opacity=".22"/>
            <stop offset=".14" stop-color="#fff" stop-opacity=".055"/>
            <stop offset=".38" stop-color="#fff" stop-opacity=".015"/>
            <stop offset=".58" stop-color="#fff" stop-opacity=".11"/>
            <stop offset=".82" stop-color="#000" stop-opacity=".05"/>
            <stop offset="1" stop-color="#000" stop-opacity=".28"/>
          </linearGradient>
          <linearGradient id="left-sleeve-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000" stop-opacity=".34"/>
            <stop offset=".43" stop-color="#fff" stop-opacity=".05"/>
            <stop offset="1" stop-color="#000" stop-opacity=".12"/>
          </linearGradient>
          <linearGradient id="right-sleeve-${uid}" x1="1" x2="0">
            <stop offset="0" stop-color="#000" stop-opacity=".34"/>
            <stop offset=".43" stop-color="#fff" stop-opacity=".05"/>
            <stop offset="1" stop-color="#000" stop-opacity=".12"/>
          </linearGradient>
          <radialGradient id="chest-light-${uid}" cx="48%" cy="18%" r="70%">
            <stop offset="0" stop-color="#fff" stop-opacity=".20"/>
            <stop offset=".28" stop-color="#fff" stop-opacity=".06"/>
            <stop offset=".7" stop-color="#000" stop-opacity=".02"/>
            <stop offset="1" stop-color="#000" stop-opacity=".15"/>
          </radialGradient>
          <pattern id="knit-${uid}" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="1.1" cy="1.1" r=".5" fill="#fff" opacity=".11"/>
            <circle cx="3.7" cy="3.7" r=".55" fill="#000" opacity=".13"/>
          </pattern>
          <filter id="shadow-${uid}" x="-35%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="${compact ? 17 : 24}" stdDeviation="${compact ? 13 : 18}" flood-color="#000" flood-opacity=".52"/>
          </filter>
          <filter id="soft-${uid}">
            <feGaussianBlur stdDeviation="7"/>
          </filter>
        </defs>

        <g filter="url(#shadow-${uid})">
          <path d="${fullShape}" fill="${bodyBase}" stroke="#000" stroke-opacity=".24" stroke-width="2.5"/>
          <path d="${leftSleeve}" fill="${sleeveBase}"/>
          <path d="${rightSleeve}" fill="${sleeveBase}"/>
          <path d="${torso}" fill="${bodyBase}"/>

          <g clip-path="url(#clip-${uid})">
            ${shoulderDecor}
            ${sleeveStriping}
            ${hemStriping}
            <path d="${torso}" fill="url(#torso-${uid})"/>
            <path d="${leftSleeve}" fill="url(#left-sleeve-${uid})"/>
            <path d="${rightSleeve}" fill="url(#right-sleeve-${uid})"/>
            <rect width="600" height="600" fill="url(#chest-light-${uid})"/>
            <rect width="600" height="600" fill="url(#knit-${uid})" opacity="${compact ? ".28" : ".52"}"/>
          </g>

          <!-- soft photographic folds -->
          ${compact ? "" : `
            <g fill="none" stroke-linecap="round" filter="url(#soft-${uid})">
              <path d="M232 180 C221 268 224 405 236 516" stroke="#000" stroke-opacity=".10" stroke-width="9"/>
              <path d="M276 170 C268 275 271 416 279 528" stroke="#fff" stroke-opacity=".055" stroke-width="7"/>
              <path d="M326 170 C333 274 331 416 324 528" stroke="#000" stroke-opacity=".055" stroke-width="7"/>
              <path d="M370 180 C381 268 377 405 365 516" stroke="#fff" stroke-opacity=".045" stroke-width="6"/>
              <path d="M105 208 C114 279 110 356 101 417" stroke="#fff" stroke-opacity=".045" stroke-width="6"/>
              <path d="M495 208 C486 279 490 356 499 417" stroke="#000" stroke-opacity=".065" stroke-width="7"/>
            </g>
          `}

          <!-- sleeve/torso seams -->
          <path d="M205 115 C191 150 182 192 178 248" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="1.2"/>
          <path d="M395 115 C409 150 418 192 422 248" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="1.2"/>
          <path d="M179 153 C170 198 164 257 158 314 M421 153 C430 198 436 257 442 314" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="1.4"/>

          <!-- realistic ribbed V collar -->
          <path d="M250 101 C267 87 333 87 350 101 L365 112 C344 126 323 142 300 160 C277 142 256 126 235 112 Z" fill="${dark}"/>
          <path d="M251 103 C267 117 284 132 300 148 C316 132 333 117 349 103" fill="none" stroke="${stripeA}" stroke-width="11" stroke-linejoin="round"/>
          <path d="M258 106 C272 119 286 132 300 144 C314 132 328 119 342 106" fill="none" stroke="${stripeB}" stroke-width="2.6" opacity=".86"/>
          <path d="M267 108 C278 118 289 128 300 138 C311 128 322 118 333 108" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="1.2"/>

          ${side === "back" ? back : front}
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