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
    const base = variant === "away" ? "#f2f2ef" : primary;
    const dark = variant === "away" ? primary : "#050708";
    const stripe = variant === "away" ? primary : accent;
    const secondary = variant === "away" ? accent : trim;
    const logo = logoUrl(team.name);
    const clipId = `clip-${team.id}-${variant}-${side}-${Math.random().toString(36).slice(2,8)}`;

    const patternMarkup = {
      shoulder: `
        <path d="M155 126 L240 70 H360 L445 126 L420 166 L365 126 H235 L180 166 Z" fill="${stripe}"/>
        <path d="M70 228 L155 185 L177 226 L92 270 Z M530 228 L445 185 L423 226 L508 270 Z" fill="${secondary}" opacity=".98"/>
        <path d="M75 252 L158 211 L171 236 L88 278 Z M525 252 L442 211 L429 236 L512 278 Z" fill="${stripe}"/>
        <path d="M172 472 H428 V500 H172 Z" fill="${stripe}"/>
        <path d="M172 500 H428 V516 H172 Z" fill="${secondary}"/>
      `,
      classic: `
        <path d="M170 438 H430 V462 H170 Z" fill="${secondary}"/>
        <path d="M170 464 H430 V500 H170 Z" fill="${stripe}"/>
        <path d="M80 238 L162 196 L176 224 L94 266 Z M520 238 L438 196 L424 224 L506 266 Z" fill="${secondary}"/>
        <path d="M88 266 L168 226 L181 251 L101 291 Z M512 266 L432 226 L419 251 L499 291 Z" fill="${stripe}"/>
      `,
      diagonal: `
        <path d="M150 395 L430 210 L430 276 L170 448 L170 510 L430 338 L430 392 L238 520 H170 V470 L150 482 Z" fill="${stripe}" opacity=".96"/>
        <path d="M160 424 L430 246 L430 268 L170 442 L170 467 L430 295 L430 316 L170 489 L160 496 Z" fill="${secondary}" opacity=".9"/>
        <path d="M60 180 L150 128 L186 168 L92 226 Z M540 180 L450 128 L414 168 L508 226 Z" fill="${stripe}"/>
      `,
      minimal: `
        <path d="M172 492 H428 V510 H172 Z" fill="${stripe}"/>
        <path d="M76 256 L158 215 L170 238 L88 280 Z M524 256 L442 215 L430 238 L512 280 Z" fill="${stripe}"/>
      `
    }[pattern] || "";

    const front = `
      <g>
        <text x="300" y="270" text-anchor="middle" fill="${variant === "away" ? dark : "#ffffff"}" opacity=".08" font-size="54" font-weight="1000">${esc(team.code)}</text>
        ${logo ? `<image href="${esc(logo)}" x="212" y="202" width="176" height="160" preserveAspectRatio="xMidYMid meet"/>` : ""}
        <text x="300" y="386" text-anchor="middle" fill="${variant === "away" ? dark : trim}" opacity=".82" font-size="17" font-weight="950" letter-spacing="2">${esc(team.name.toUpperCase())}</text>
      </g>
    `;

    const back = `
      <g>
        <text x="300" y="218" text-anchor="middle" fill="${variant === "away" ? dark : trim}" font-size="28" font-weight="1000" letter-spacing="2">${esc(name)}</text>
        <text x="300" y="390" text-anchor="middle" fill="${variant === "away" ? dark : trim}" stroke="${stripe}" stroke-width="5" paint-order="stroke fill" font-size="166" font-weight="1000" letter-spacing="-8">${esc(number)}</text>
        <text x="300" y="430" text-anchor="middle" fill="${variant === "away" ? dark : trim}" opacity=".72" font-size="14" font-weight="950" letter-spacing="3">SVENSK eHOCKEY</text>
      </g>
    `;

    return `
      <svg viewBox="0 0 600 600" role="img" aria-label="${esc(team.name)} ${variant === "away" ? "bortatröja" : "hemmatröja"}">
        <defs>
          <clipPath id="${clipId}">
            <path d="M240 70 H360 L450 128 L548 184 L500 302 L432 270 V540 H168 V270 L100 302 L52 184 L150 128 Z"/>
          </clipPath>
          <linearGradient id="fabric-${clipId}" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".12"/>
            <stop offset=".42" stop-color="#ffffff" stop-opacity=".015"/>
            <stop offset="1" stop-color="#000000" stop-opacity=".18"/>
          </linearGradient>
          <filter id="shadow-${clipId}">
            <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000" flood-opacity=".42"/>
          </filter>
        </defs>
        <g filter="url(#shadow-${clipId})">
          <path d="M240 70 H360 L450 128 L548 184 L500 302 L432 270 V540 H168 V270 L100 302 L52 184 L150 128 Z"
            fill="${base}" stroke="${variant === "away" ? "#c7cbcc" : "#20262a"}" stroke-width="3"/>
          <g clip-path="url(#${clipId})">
            ${patternMarkup}
            <path d="M0 0 H600 V600 H0 Z" fill="url(#fabric-${clipId})"/>
          </g>
          <path d="M242 70 Q300 130 358 70 L378 91 Q300 160 222 91 Z" fill="${dark}"/>
          <path d="M245 76 Q300 128 355 76" fill="none" stroke="${stripe}" stroke-width="10"/>
          <path d="M168 270 V540 M432 270 V540" stroke="#000" stroke-opacity=".18" stroke-width="3"/>
          ${side === "back" ? back : front}
          <path d="M165 535 H435" stroke="${variant === "away" ? primary : accent}" stroke-width="6"/>
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