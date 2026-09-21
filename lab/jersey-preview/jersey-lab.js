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
    ["G","Rootmos","30"],
    ["LD","I-Ashborn-I","21"],
    ["RD","KabbeTV","6"],
    ["LW","Bulten_49","17"],
    ["C","eSwahn","21"],
    ["RW","Feffe1och2","88"]
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
    const base = variant === "away" ? "#f2f3f0" : primary;
    const ink = variant === "away" ? primary : trim;
    const dark = variant === "away" ? primary : "#050708";
    const stripe = variant === "away" ? primary : accent;
    const secondary = variant === "away" ? accent : trim;
    const logo = logoUrl(team.name);
    const uid = `jersey-${team.id}-${variant}-${side}-${Math.random().toString(36).slice(2,8)}`;

    // Long-sleeved hockey silhouette: broad shoulders, dropped sleeves and a tapered torso.
    const silhouette = "M244 72 C262 54 338 54 356 72 L407 91 C437 102 465 119 491 139 L558 181 L528 397 L447 373 L430 532 Q300 552 170 532 L153 373 L72 397 L42 181 L109 139 C135 119 163 102 193 91 Z";

    const patternMarkup = {
      shoulder: `
        <path d="M188 94 C224 81 252 72 300 72 C348 72 376 81 412 94 L465 124 L431 180 C389 153 352 142 300 142 C248 142 211 153 169 180 L135 124 Z" fill="${stripe}"/>
        <path d="M51 220 L145 170 L162 222 L65 274 Z M549 220 L455 170 L438 222 L535 274 Z" fill="${secondary}" opacity=".98"/>
        <path d="M57 260 L151 210 L163 246 L70 296 Z M543 260 L449 210 L437 246 L530 296 Z" fill="${stripe}"/>
        <path d="M76 337 L153 315 L157 348 L80 370 Z M524 337 L447 315 L443 348 L520 370 Z" fill="${secondary}" opacity=".96"/>
        <path d="M169 468 H431 V495 H169 Z" fill="${stripe}"/>
        <path d="M169 495 H431 V511 H169 Z" fill="${secondary}"/>
      `,
      classic: `
        <path d="M168 446 H432 V468 H168 Z" fill="${secondary}"/>
        <path d="M168 471 H432 V505 H168 Z" fill="${stripe}"/>
        <path d="M54 245 L147 196 L162 233 L68 283 Z M546 245 L453 196 L438 233 L532 283 Z" fill="${secondary}"/>
        <path d="M60 285 L153 236 L165 265 L72 315 Z M540 285 L447 236 L435 265 L528 315 Z" fill="${stripe}"/>
        <path d="M75 344 L154 323 L158 350 L79 373 Z M525 344 L446 323 L442 350 L521 373 Z" fill="${stripe}"/>
      `,
      diagonal: `
        <path d="M151 383 L437 207 L437 278 L167 445 L169 517 L436 352 L436 408 L239 532 H170 L164 472 L150 482 Z" fill="${stripe}" opacity=".97"/>
        <path d="M160 414 L437 243 L437 266 L167 436 L168 462 L437 296 L437 319 L170 486 L160 493 Z" fill="${secondary}" opacity=".92"/>
        <path d="M44 199 L137 143 L181 181 L62 252 Z M556 199 L463 143 L419 181 L538 252 Z" fill="${stripe}"/>
        <path d="M72 337 L153 316 L158 349 L78 371 Z M528 337 L447 316 L442 349 L522 371 Z" fill="${secondary}"/>
      `,
      minimal: `
        <path d="M169 493 H431 V511 H169 Z" fill="${stripe}"/>
        <path d="M58 278 L151 229 L162 259 L69 309 Z M542 278 L449 229 L438 259 L531 309 Z" fill="${stripe}"/>
        <path d="M194 96 C229 82 259 77 300 77 C341 77 371 82 406 96" fill="none" stroke="${secondary}" stroke-width="7" opacity=".82"/>
        <path d="M75 344 L153 324 L156 347 L79 369 Z M525 344 L447 324 L444 347 L521 369 Z" fill="${secondary}" opacity=".55"/>
      `
    }[pattern] || "";

    const front = `
      <g>
        ${logo
          ? `<image href="${esc(logo)}" x="198" y="176" width="204" height="188" preserveAspectRatio="xMidYMid meet"/>`
          : `<text x="300" y="286" text-anchor="middle" fill="${ink}" font-size="72" font-weight="1000">${esc(team.code)}</text>`}
        <text x="300" y="397" text-anchor="middle" fill="${ink}" opacity=".58" font-size="11" font-weight="1000" letter-spacing="3.8">SVENSK eHOCKEY</text>
        <path d="M382 168 h37 v37 h-37 z" fill="${ink}" opacity=".94"/>
        <text x="400.5" y="194" text-anchor="middle" fill="${variant === "away" ? "#f2f3f0" : dark}" font-size="20" font-weight="1000">C</text>
      </g>
    `;

    const back = `
      <g>
        <text x="300" y="205" text-anchor="middle" fill="${ink}" stroke="${stripe}" stroke-width="1.7" paint-order="stroke fill" font-size="27" font-weight="1000" letter-spacing="2.5">${esc(name)}</text>
        <text x="300" y="397" text-anchor="middle" fill="${ink}" stroke="${stripe}" stroke-width="5.5" paint-order="stroke fill" font-size="170" font-weight="1000" letter-spacing="-8">${esc(number)}</text>
        <text x="300" y="434" text-anchor="middle" fill="${ink}" opacity=".64" font-size="11" font-weight="1000" letter-spacing="3.4">SVENSK eHOCKEY</text>
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

          <linearGradient id="sleeve-left-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000" stop-opacity=".28"/>
            <stop offset=".72" stop-color="#fff" stop-opacity=".04"/>
            <stop offset="1" stop-color="#000" stop-opacity=".05"/>
          </linearGradient>
          <linearGradient id="sleeve-right-${uid}" x1="1" x2="0">
            <stop offset="0" stop-color="#000" stop-opacity=".28"/>
            <stop offset=".72" stop-color="#fff" stop-opacity=".04"/>
            <stop offset="1" stop-color="#000" stop-opacity=".05"/>
          </linearGradient>

          <pattern id="mesh-${uid}" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.8" cy="1.8" r=".65" fill="#ffffff" opacity=".085"/>
            <circle cx="5.4" cy="5.4" r=".65" fill="#000000" opacity=".11"/>
          </pattern>

          <filter id="shadow-${uid}" x="-35%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="24" stdDeviation="19" flood-color="#000000" flood-opacity=".52"/>
          </filter>
        </defs>

        <g filter="url(#shadow-${uid})">
          <path d="${silhouette}" fill="${base}" stroke="${variant === "away" ? "#c7cccd" : "#20262a"}" stroke-width="3"/>

          <g clip-path="url(#clip-${uid})">
            ${patternMarkup}
            <rect width="600" height="600" fill="url(#body-${uid})"/>
            <rect width="600" height="600" fill="url(#chest-${uid})"/>
            <path d="M32 174 L158 128 L180 392 L64 420 Z" fill="url(#sleeve-left-${uid})"/>
            <path d="M568 174 L442 128 L420 392 L536 420 Z" fill="url(#sleeve-right-${uid})"/>
            <rect width="600" height="600" fill="url(#mesh-${uid})" opacity=".38"/>
          </g>

          <!-- hockey construction seams -->
          <path d="M193 92 C175 134 160 181 151 232" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>
          <path d="M407 92 C425 134 440 181 449 232" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>
          <path d="M153 373 C166 405 170 470 170 532 M447 373 C434 405 430 470 430 532" fill="none" stroke="#000000" stroke-opacity=".23" stroke-width="3"/>
          <path d="M73 395 L89 374 M527 395 L511 374" stroke="#000000" stroke-opacity=".27" stroke-width="4"/>

          <!-- structured V collar -->
          <path d="M243 72 C261 57 339 57 357 72 L377 88 C351 104 330 124 300 154 C270 124 249 104 223 88 Z" fill="${dark}"/>
          <path d="M244 76 C264 94 282 112 300 134 C318 112 336 94 356 76" fill="none" stroke="${stripe}" stroke-width="12" stroke-linejoin="round"/>
          <path d="M253 79 C270 95 285 111 300 127 C315 111 330 95 347 79" fill="none" stroke="${secondary}" stroke-width="3.2" opacity=".9"/>
          <text x="300" y="101" text-anchor="middle" fill="${secondary}" opacity=".72" font-size="10" font-weight="1000" letter-spacing="1.5">SEH</text>

          <!-- cuffs and hem -->
          <path d="M70 371 L150 350" stroke="${dark}" stroke-opacity=".58" stroke-width="9"/>
          <path d="M530 371 L450 350" stroke="${dark}" stroke-opacity=".58" stroke-width="9"/>
          <path d="M171 526 Q300 545 429 526" fill="none" stroke="${dark}" stroke-opacity=".48" stroke-width="7"/>
          <path d="M174 519 Q300 537 426 519" fill="none" stroke="${secondary}" stroke-opacity=".55" stroke-width="2"/>

          <!-- subtle fabric folds -->
          <path d="M235 156 C221 245 223 390 238 518 M365 156 C379 245 377 390 362 518" fill="none" stroke="#000000" stroke-opacity=".08" stroke-width="10"/>
          <path d="M277 153 C269 255 271 404 278 526 M323 153 C331 255 329 404 322 526" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="8"/>

          ${side === "back" ? back : front}
        </g>
      </svg>
    `;
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
    $("#homeJersey").innerHTML = jerseySvg(team,{
      variant:"home",side:state.side,pattern:state.pattern,
      playerName:state.playerName,playerNumber:state.playerNumber
    });
    $("#awayJersey").innerHTML = jerseySvg(team,{
      variant:"away",side:state.side,pattern:state.pattern,
      playerName:state.playerName,playerNumber:state.playerNumber
    });
  }

  function renderLocker() {
    const team = currentDesignTeam();
    $("#lockerRoom").innerHTML = LOCKER.map(([pos,name,number]) => `
      <div class="locker-slot">
        <div class="locker-pos">${esc(pos)}</div>
        <div class="locker-jersey">${jerseySvg(team,{variant:"home",side:"back",pattern:state.pattern,playerName:name,playerNumber:number,compact:true})}</div>
        <div class="locker-name">${esc(name)}</div>
      </div>
    `).join("");
  }

  function renderMatchTeam(hostId, teamId, variant) {
    const team = teamById(teamId);
    $(hostId).innerHTML = `
      ${jerseySvg(team,{variant,side:"front",pattern:team.pattern,compact:true})}
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
        ${jerseySvg(team,{variant:"home",side:"front",pattern:team.pattern,compact:true})}
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