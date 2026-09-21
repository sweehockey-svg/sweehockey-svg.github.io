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
    const base = variant === "away" ? "#f1f2ef" : primary;
    const ink = variant === "away" ? primary : trim;
    const dark = variant === "away" ? primary : "#040607";
    const stripe = variant === "away" ? primary : accent;
    const secondary = variant === "away" ? accent : trim;
    const logo = logoUrl(team.name);
    const uid = `jersey-${team.id}-${variant}-${side}-${Math.random().toString(36).slice(2,8)}`;
    const silhouette = "M248 72 C262 57 338 57 352 72 L399 90 C441 103 490 132 535 174 L566 204 L505 324 L448 292 L432 530 Q300 552 168 530 L152 292 L95 324 L34 204 L65 174 C110 132 159 103 201 90 Z";

    const patternMarkup = {
      shoulder: `
        <path d="M188 95 C220 84 238 76 255 66 H345 C362 76 380 84 412 95 L450 112 L421 164 C386 142 354 132 300 132 C246 132 214 142 179 164 L150 112 Z" fill="${stripe}"/>
        <path d="M56 214 L146 166 L166 205 L76 254 Z M544 214 L454 166 L434 205 L524 254 Z" fill="${secondary}" opacity=".96"/>
        <path d="M69 242 L154 197 L168 224 L83 269 Z M531 242 L446 197 L432 224 L517 269 Z" fill="${stripe}"/>
        <path d="M166 467 H434 V495 H166 Z" fill="${stripe}"/>
        <path d="M166 495 H434 V511 H166 Z" fill="${secondary}"/>
      `,
      classic: `
        <path d="M166 442 H434 V466 H166 Z" fill="${secondary}"/>
        <path d="M166 468 H434 V502 H166 Z" fill="${stripe}"/>
        <path d="M58 222 L150 174 L166 206 L74 255 Z M542 222 L450 174 L434 206 L526 255 Z" fill="${secondary}"/>
        <path d="M73 253 L158 209 L171 234 L86 278 Z M527 253 L442 209 L429 234 L514 278 Z" fill="${stripe}"/>
      `,
      diagonal: `
        <path d="M150 384 L438 205 L438 274 L164 447 L168 514 L438 345 L438 402 L242 530 H168 L163 475 L148 485 Z" fill="${stripe}" opacity=".96"/>
        <path d="M159 414 L438 239 L438 262 L166 436 L168 462 L438 291 L438 314 L169 486 L159 493 Z" fill="${secondary}" opacity=".92"/>
        <path d="M45 190 L142 134 L182 174 L77 236 Z M555 190 L458 134 L418 174 L523 236 Z" fill="${stripe}"/>
      `,
      minimal: `
        <path d="M166 492 H434 V510 H166 Z" fill="${stripe}"/>
        <path d="M67 250 L153 205 L166 230 L80 275 Z M533 250 L447 205 L434 230 L520 275 Z" fill="${stripe}"/>
        <path d="M194 97 C230 84 256 79 300 79 C344 79 370 84 406 97" fill="none" stroke="${secondary}" stroke-width="8" opacity=".8"/>
      `
    }[pattern] || "";

    const front = `
      <g>
        ${logo ? `<image href="${esc(logo)}" x="211" y="190" width="178" height="158" preserveAspectRatio="xMidYMid meet"/>` : `<text x="300" y="285" text-anchor="middle" fill="${ink}" font-size="68" font-weight="1000">${esc(team.code)}</text>`}
        <text x="300" y="379" text-anchor="middle" fill="${ink}" opacity=".84" font-size="15" font-weight="1000" letter-spacing="2.4">SVENSK eHOCKEY</text>
        <rect x="383" y="174" width="34" height="34" rx="3" fill="${ink}" opacity=".94"/>
        <text x="400" y="198" text-anchor="middle" fill="${variant === "away" ? "#f1f2ef" : dark}" font-size="20" font-weight="1000">C</text>
      </g>
    `;

    const back = `
      <g>
        <text x="300" y="210" text-anchor="middle" fill="${ink}" stroke="${stripe}" stroke-width="1.8" paint-order="stroke fill" font-size="27" font-weight="1000" letter-spacing="2.4">${esc(name)}</text>
        <text x="300" y="393" text-anchor="middle" fill="${ink}" stroke="${stripe}" stroke-width="5.5" paint-order="stroke fill" font-size="166" font-weight="1000" letter-spacing="-8">${esc(number)}</text>
        <text x="300" y="432" text-anchor="middle" fill="${ink}" opacity=".72" font-size="13" font-weight="1000" letter-spacing="3">SVENSK eHOCKEY</text>
      </g>
    `;

    return `
      <svg viewBox="0 0 600 600" role="img" aria-label="${esc(team.name)} ${variant === "away" ? "bortatröja" : "hemmatröja"}" class="seh-jersey-svg${compact ? " is-compact" : ""}">
        <defs>
          <clipPath id="clip-${uid}">
            <path d="${silhouette}"/>
          </clipPath>
          <linearGradient id="fabric-${uid}" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".17"/>
            <stop offset=".18" stop-color="#ffffff" stop-opacity=".035"/>
            <stop offset=".55" stop-color="#000000" stop-opacity=".02"/>
            <stop offset="1" stop-color="#000000" stop-opacity=".28"/>
          </linearGradient>
          <linearGradient id="body-${uid}" x1="0" x2="1">
            <stop offset="0" stop-color="#000000" stop-opacity=".18"/>
            <stop offset=".24" stop-color="#ffffff" stop-opacity=".035"/>
            <stop offset=".52" stop-color="#ffffff" stop-opacity=".08"/>
            <stop offset=".76" stop-color="#ffffff" stop-opacity=".02"/>
            <stop offset="1" stop-color="#000000" stop-opacity=".22"/>
          </linearGradient>
          <radialGradient id="chest-${uid}" cx="50%" cy="30%" r="58%">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".10"/>
            <stop offset=".55" stop-color="#ffffff" stop-opacity=".02"/>
            <stop offset="1" stop-color="#000000" stop-opacity=".08"/>
          </radialGradient>
          <pattern id="mesh-${uid}" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r=".7" fill="#ffffff" opacity=".08"/>
            <circle cx="6" cy="6" r=".7" fill="#000000" opacity=".10"/>
          </pattern>
          <filter id="shadow-${uid}" x="-30%" y="-25%" width="160%" height="175%">
            <feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#000000" flood-opacity=".48"/>
          </filter>
        </defs>

        <g filter="url(#shadow-${uid})">
          <path d="${silhouette}" fill="${base}" stroke="${variant === "away" ? "#c9cece" : "#20272b"}" stroke-width="3"/>

          <g clip-path="url(#clip-${uid})">
            ${patternMarkup}
            <rect x="0" y="0" width="600" height="600" fill="url(#body-${uid})"/>
            <rect x="0" y="0" width="600" height="600" fill="url(#chest-${uid})"/>
            <rect x="0" y="0" width="600" height="600" fill="url(#mesh-${uid})" opacity=".42"/>
            <rect x="0" y="0" width="600" height="600" fill="url(#fabric-${uid})"/>
          </g>

          <!-- raglan seams and side construction -->
          <path d="M201 91 C184 126 169 161 151 203" fill="none" stroke="#ffffff" stroke-opacity=".11" stroke-width="2"/>
          <path d="M399 91 C416 126 431 161 449 203" fill="none" stroke="#ffffff" stroke-opacity=".11" stroke-width="2"/>
          <path d="M157 285 C169 339 169 427 168 530 M443 285 C431 339 431 427 432 530" fill="none" stroke="#000000" stroke-opacity=".20" stroke-width="3"/>
          <path d="M96 321 L108 299 M504 321 L492 299" stroke="#000000" stroke-opacity=".22" stroke-width="4"/>

          <!-- V-neck -->
          <path d="M246 72 C259 61 341 61 354 72 L373 88 C352 102 335 118 300 151 C265 118 248 102 227 88 Z" fill="${dark}"/>
          <path d="M245 75 C263 92 281 109 300 131 C319 109 337 92 355 75" fill="none" stroke="${stripe}" stroke-width="11" stroke-linejoin="round"/>
          <path d="M253 77 C269 93 285 108 300 124 C315 108 331 93 347 77" fill="none" stroke="${secondary}" stroke-width="3" opacity=".85"/>

          <!-- cuff + hem construction -->
          <path d="M41 208 L94 314 M559 208 L506 314" stroke="${dark}" stroke-opacity=".55" stroke-width="8"/>
          <path d="M169 526 Q300 543 431 526" fill="none" stroke="${dark}" stroke-opacity=".48" stroke-width="7"/>
          <path d="M172 519 Q300 536 428 519" fill="none" stroke="${secondary}" stroke-opacity=".65" stroke-width="2"/>

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