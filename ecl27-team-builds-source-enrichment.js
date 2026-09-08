/*
  ECL 27 – källförstärkning 2026-09-08
  Kompletterar lagbyggen-v2 med Discord-underlag:
  - bekräftade in/ut-poster
  - ECL-relaterade FA-poster
  - lagens egna spelarannonser
*/
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";
  const BUILD = "2026-09-08-source-enrichment-v1";

  const RECRUITMENT = Object.freeze({
    "Unwanted": { date:"2026-08-11", target:"Elite", seeks:"Startande RD", note:"Laget söker högerback inför kommande ECL-säsong." },
    "Zero Ping": { date:"2026-07-26", target:"Pro-kval", seeks:"G + HB/VF", note:"Målet som anges är kval till Pro." },
    "PRIMA": { date:"2026-07-29", target:"Lite", seeks:"C + back", note:"Söker center och back för ECL Lite." },
    "BIK Karlskoga Academy": { date:"2026-08-20", target:"Core", seeks:"C + vinge + back + backup G", note:"Laget skriver att målet är Core." },
    "vNexs Wisemen": { date:"2026-07-31", target:"Lite", seeks:"G", note:"Efter tredjeplatsen i Core vill laget prova Lite." },
    "Lila skeppet": { date:"2026-08-03", target:"Ej angivet", seeks:"Back + G, ev. C", note:"Senaste rekryteringsposten kom före att Wilhelmsson90 och Bylle67 lämnade." },
    "SSK Academy": { date:"2026-08-10", target:"Lite", seeks:"VF + C + back", note:"Annonsen gäller kommande SCL och ECL Lite." },
    "vNexs Vipers": { date:"2026-08-18", target:"Pro", seeks:"2 forwards", note:"Laget uppger att avancemanget från Lite ger spel i Pro." },
    "Burchurs HC": { date:"2026-09-03", target:"Ej angivet", seeks:"G + forward", note:"Den senaste annonsen innehåller även en uttrycklig trupp på sju spelare." },
    "Västerås Vipers": { date:"2026-08-25", target:"Lite", seeks:"Start VB + backup F/back", note:"OBS: rekryteringsposten är äldre än massuttåget den 6 september." },
    "Lilmix": { date:"2026-08-31", target:"Ej angivet", seeks:"LD", note:"Söker vänsterback inför kommande ECL." }
  });

  const DISCORD_FA = Object.freeze([
    { date:"2026-09-07", player:"BeJutiFul", text:"G · Neo/Core/Lite" },
    { date:"2026-09-07", player:"XD_Jacke", text:"G · top Pro+" },
    { date:"2026-09-07", player:"edv0n", text:"HB · hela NHL 27" },
    { date:"2026-09-06", player:"JNHL-_-", text:"Backup · VF/VB" },
    { date:"2026-09-05", player:"eSwahn", text:"Backup G · alla divisioner" },
    { date:"2026-09-05", player:"DrHuhtinen77", text:"LW + C · Neo" },
    { date:"2026-09-03", player:"J_Granberg", text:"C/LW/LD · Core/Neo" },
    { date:"2026-09-02", player:"MeKNoXEr", text:"G · Lite/Pro" },
    { date:"2026-08-26", player:"FrogNHL", text:"LW/C · top Lite/Pro" },
    { date:"2026-08-26", player:"Liimp_92", text:"G" },
    { date:"2026-08-25", player:"Edluund___", text:"HF/VF · Lite/Pro" },
    { date:"2026-08-25", player:"Gangstakim", text:"VB" },
    { date:"2026-08-24", player:"hajjeh37", text:"F/D · söker tillsammans med fler" },
    { date:"2026-08-17", player:"HerrLarsson80", text:"HF/HB" },
    { date:"2026-08-17", player:"Adooph", text:"VF/HF/C" },
    { date:"2026-08-11", player:"Wilhelmsson90", text:"Back" }
  ]);

  /* Korrigeringar där källorna ger mer information än v2-underlaget. */
  const ROSTER_OVERRIDES = Object.freeze({
    "Burchurs HC": ["Andre_24x","IIFaranII","Wadde95","Anan20","Strandis96","D4nzk80","Mrwennerstrom"],
    "SSK Academy": ["Ejamannen","gtasir1","KaiserHanzo","Qben","Sloogan9498","softa_tofta"],
    "vNexs II": ["Gudinge","Hisens__","immuszn","iSvamp","Putteekiing","SeboLHD"],
    "Invasion Hockey": ["BigKaxen","Brobeck86","GD_Hampezzz","Mrclaper09","RookieLIAMOVIC","xlcelQx"],
    "Västerås Vipers": []
  });

  const MOVE_DATE_OVERRIDES = Object.freeze([
    { team:"AFTERLIFE", player:"Rubituss_", date:"2026-09-07" },
    { team:"Unwanted", player:"benjamint737", date:"2026-09-07" },
    { team:"vNexs II", player:"benjamint737", date:"2026-09-07" },
    { team:"vNexs II", player:"Azzez_88", date:"2026-05-12" }
  ]);

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE");
  }

  function formatDate(value) {
    const [y,m,d] = String(value || "").split("-");
    const months = {"01":"jan","02":"feb","03":"mar","04":"apr","05":"maj","06":"jun","07":"jul","08":"aug","09":"sep","10":"okt","11":"nov","12":"dec"};
    return d && months[m] ? `${Number(d)} ${months[m]}` : value;
  }

  function cards() {
    return Array.from(document.querySelectorAll("#ecl27BuildGrid .ecl27-card"));
  }

  function findCard(teamName) {
    const wanted = normalize(teamName);
    return cards().find((card) => normalize(card.querySelector("h3")?.textContent) === wanted) || null;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
  }

  function setRoster(card, names) {
    if (!card) return;
    const chips = card.querySelector(".ecl27-roster__chips");
    if (chips) {
      chips.innerHTML = names.length
        ? names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")
        : `<em>Ingen säker spelare kvar i vår sammanställning.</em>`;
    }
    const firstNumber = card.querySelector(".ecl27-card__numbers > div:first-child strong");
    if (firstNumber) firstNumber.textContent = String(names.length);
  }

  function addRecruitment(card, teamName, data) {
    if (!card || !data || card.querySelector(".ecl27-recruitment-source")) return;
    const block = document.createElement("section");
    block.className = "ecl27-recruitment-source";
    block.innerHTML = `
      <div class="ecl27-recruitment-source__top">
        <span>LAGET SÖKER SPELARE</span>
        <time datetime="${escapeHtml(data.date)}">${escapeHtml(formatDate(data.date))}</time>
      </div>
      <div class="ecl27-recruitment-source__main">
        <strong>${escapeHtml(data.seeks)}</strong>
        <span>${data.target && data.target !== "Ej angivet" ? `Plan: ${escapeHtml(data.target)}` : "Planerad nivå ej uttryckligen angiven"}</span>
      </div>
      <p>${escapeHtml(data.note)}</p>
    `;
    const moves = card.querySelector(".ecl27-moves");
    if (moves) moves.insertAdjacentElement("beforebegin", block);
    else card.appendChild(block);
  }

  function markVasterasVipers(card) {
    if (!card) return;
    setRoster(card, []);
    const status = card.querySelector(".ecl27-status");
    if (status) {
      status.textContent = "Ingen känd trupp kvar";
      status.className = "ecl27-status ecl27-status--red";
    }
    const faBox = card.querySelector(".ecl27-fa-box");
    if (faBox) faBox.remove();
    if (!card.querySelector(".ecl27-source-warning")) {
      const warning = document.createElement("div");
      warning.className = "ecl27-source-warning";
      warning.innerHTML = `<strong>6 SEP</strong><span>meeskojr_, JNHL-_-, fimpen_365 och Lunkan_7 lämnade samtidigt. Därför räknar vi just nu 0 kända spelare.</span>`;
      const roster = card.querySelector(".ecl27-roster");
      if (roster) roster.insertAdjacentElement("afterend", warning);
    }
  }

  function patchMoveDate(card, player, date) {
    if (!card) return;
    const wanted = normalize(player);
    for (const row of card.querySelectorAll(".ecl27-move")) {
      if (normalize(row.querySelector("strong")?.textContent) !== wanted) continue;
      const time = row.querySelector("time");
      if (time) {
        time.dateTime = date;
        time.textContent = formatDate(date);
      }
    }
  }

  function patchFeedDate(player, team, date) {
    const wantedPlayer = normalize(player);
    const wantedTeam = normalize(team);
    for (const row of document.querySelectorAll(".ecl27-feed__row")) {
      if (normalize(row.querySelector("strong")?.textContent) !== wantedPlayer) continue;
      if (!normalize(row.textContent).includes(wantedTeam)) continue;
      const dateNode = row.querySelector(".ecl27-feed__date");
      if (dateNode) dateNode.textContent = formatDate(date);
    }
  }

  function ensureExtraSourcesSection() {
    const section = document.querySelector("#ecl27TeamBuilds");
    if (!section || section.querySelector("#ecl27SourceSignals")) return;

    const method = section.querySelector(".ecl27-method");
    const extra = document.createElement("section");
    extra.id = "ecl27SourceSignals";
    extra.className = "ecl27-source-signals";
    extra.innerHTML = `
      <div class="ecl27-section-head">
        <div><p class="directory-kicker">DISCORD-UNDERLAG</p><h3>FA & lag som söker spelare</h3></div>
        <span>Kompletterar transferlistan</span>
      </div>
      <div class="ecl27-source-signals__grid">
        <article class="ecl27-source-panel">
          <div class="ecl27-source-panel__head"><strong>Senaste ECL-relaterade FA-poster</strong><span>${DISCORD_FA.length}</span></div>
          <div class="ecl27-source-fa-list">
            ${DISCORD_FA.map((row) => `
              <div><time datetime="${row.date}">${formatDate(row.date)}</time><strong>${escapeHtml(row.player)}</strong><span>${escapeHtml(row.text)}</span></div>
            `).join("")}
          </div>
          <p class="ecl27-source-note">Det här är Discord-poster. Live-listan på Svensk eHockey används fortfarande som primär markering för aktiva Free Agents.</p>
        </article>
        <article class="ecl27-source-panel ecl27-source-panel--candidate">
          <div class="ecl27-source-panel__head"><strong>Möjligt nytt ECL-projekt</strong><span>1</span></div>
          <div class="ecl27-candidate-team">
            <span class="ecl27-candidate-team__tag">MÖJLIGT ECL-LAG</span>
            <h4>Kingping</h4>
            <p>Kingping meddelade 6 juni att laget startar upp igen och söker VF, VB och G. Inlägget säger att laget tillsammans ska avgöra om det blir ECL eller ITHL.</p>
            <small>Därför räknas Kingping inte in bland de 35 bekräftade lag/projekten ovan ännu.</small>
          </div>
        </article>
      </div>
    `;

    if (method) method.insertAdjacentElement("beforebegin", extra);
    else section.appendChild(extra);
  }

  function injectStyles() {
    if (document.querySelector("#ecl27SourceEnrichmentStyle")) return;
    const style = document.createElement("style");
    style.id = "ecl27SourceEnrichmentStyle";
    style.textContent = `
      .ecl27-recruitment-source{position:relative;z-index:1;margin:13px 0;padding:12px 13px;border:1px solid rgba(75,229,221,.22);border-radius:11px;background:rgba(10,44,50,.17)}
      .ecl27-recruitment-source__top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}.ecl27-recruitment-source__top span{color:#58e7df;font-size:8px;font-weight:950;letter-spacing:.13em}.ecl27-recruitment-source__top time{color:#6f879b;font-size:9px;text-transform:uppercase}.ecl27-recruitment-source__main{display:flex;flex-wrap:wrap;gap:5px 10px;align-items:baseline}.ecl27-recruitment-source__main strong{color:#fff;font-size:13px}.ecl27-recruitment-source__main span{color:#f0d58b;font-size:10px;font-weight:800}.ecl27-recruitment-source p{margin:6px 0 0;color:#879bad;font-size:10px;line-height:1.45}
      .ecl27-source-warning{position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr;gap:9px;margin:11px 0;padding:11px 12px;border:1px solid rgba(255,103,103,.28);border-radius:10px;background:rgba(107,20,28,.16)}.ecl27-source-warning strong{color:#ff7d7d;font-size:9px;letter-spacing:.12em}.ecl27-source-warning span{color:#d6b7b7;font-size:10px;line-height:1.45}
      .ecl27-source-signals{margin-top:18px;border:1px solid #172635;border-radius:18px;background:rgba(2,8,14,.86);overflow:hidden}.ecl27-source-signals__grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:1px;background:#172635}.ecl27-source-panel{padding:18px 20px;background:#030a11}.ecl27-source-panel__head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.ecl27-source-panel__head strong{color:#f7f4ed;font-size:14px}.ecl27-source-panel__head span{display:grid;place-items:center;min-width:28px;height:24px;padding:0 7px;border-radius:7px;background:#081a27;color:#59e7de;font-size:10px;font-weight:900}
      .ecl27-source-fa-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#142433}.ecl27-source-fa-list>div{display:grid;grid-template-columns:45px minmax(90px,.65fr) minmax(0,1fr);gap:8px;align-items:center;min-height:39px;padding:7px 9px;background:#02080f}.ecl27-source-fa-list time{color:#6f879b;font-size:9px}.ecl27-source-fa-list strong{color:#fff;font-size:11px;overflow:hidden;text-overflow:ellipsis}.ecl27-source-fa-list span{color:#8fa4b5;font-size:9px}.ecl27-source-note{margin:12px 0 0;color:#6f8496;font-size:9px;line-height:1.5}
      .ecl27-candidate-team{padding:16px;border:1px solid rgba(214,177,95,.26);border-radius:13px;background:linear-gradient(145deg,rgba(214,177,95,.07),rgba(5,14,23,.8))}.ecl27-candidate-team__tag{color:#f0d58b;font-size:8px;font-weight:950;letter-spacing:.14em}.ecl27-candidate-team h4{margin:5px 0 8px;color:#fff;font-size:25px}.ecl27-candidate-team p{margin:0;color:#9eb0bf;font-size:11px;line-height:1.55}.ecl27-candidate-team small{display:block;margin-top:10px;color:#6f8496;font-size:9px;line-height:1.45}
      @media(max-width:900px){.ecl27-source-signals__grid{grid-template-columns:1fr}.ecl27-source-fa-list{grid-template-columns:1fr}}
      @media(max-width:560px){.ecl27-source-fa-list>div{grid-template-columns:42px minmax(85px,.7fr) minmax(0,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function applyPatches() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
    const section = document.querySelector("#ecl27TeamBuilds");
    if (!section) return;

    injectStyles();

    for (const [teamName, roster] of Object.entries(ROSTER_OVERRIDES)) {
      setRoster(findCard(teamName), roster);
    }

    for (const [teamName, data] of Object.entries(RECRUITMENT)) {
      addRecruitment(findCard(teamName), teamName, data);
    }

    markVasterasVipers(findCard("Västerås Vipers"));

    for (const move of MOVE_DATE_OVERRIDES) {
      patchMoveDate(findCard(move.team), move.player, move.date);
      patchFeedDate(move.player, move.team, move.date);
    }

    ensureExtraSourcesSection();
    section.dataset.sourceEnrichment = BUILD;
  }

  let timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = window.setTimeout(applyPatches, 40);
  }

  function observe() {
    const bodyObserver = new MutationObserver(() => {
      if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
      if (document.querySelector("#ecl27TeamBuilds")) schedule();
    });
    bodyObserver.observe(document.body, { childList:true, subtree:true });
  }

  window.addEventListener("hashchange", () => window.setTimeout(schedule, 100));
  window.addEventListener("DOMContentLoaded", () => { observe(); window.setTimeout(schedule, 250); });
  if (document.readyState !== "loading") { observe(); window.setTimeout(schedule, 100); }
})();
