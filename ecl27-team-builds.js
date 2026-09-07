/*
  ECL 27 – Svenska lagbyggen
  Fristående Silly Season-modul för #/sasong/ecl27winter.
  Underlaget är ECL '26 Spring-rosters + bekräftade in/ut-poster t.o.m. 7 sep 2026.
  Aktiva Free Agents hämtas live från v_ehockey_free_agents_public.
*/
(function () {
  "use strict";

  const BUILD = "2026-09-07-v1";
  const ROUTE_PREFIX = "#/sasong/ecl27winter";
  const SNAPSHOT_UPDATED = "7 sep 2026 · 23:12";

  const TEAM_DATA = [
    { name:"AFTERLIFE", division:"Elite", kind:"spring", players:["borjee__","Bystrom33","bystromjr_","Maxboeeee_"], moves:[
      {date:"2026-08-31",type:"out",player:"Zuppe_29",note:"Brynäs IF Esport"},
      {date:"2026-09-07",type:"out",player:"Rubituss_"}
    ]},
    { name:"Södertälje SK", springName:"SSK ESPORTS", logoName:"Södertälje SK", division:"Elite", kind:"spring", players:["Axelzonee","l-Furyan-l","LaxenHD","minokin-","SmAyK99","therozz94","Wagge01"], moves:[
      {date:"2026-08-13",type:"in",player:"therozz94",note:"från SSK Prospects"},
      {date:"2026-08-31",type:"out",player:"Brokenrice2000",note:"Lilmix"}
    ]},
    { name:"Unwanted", division:"Elite", kind:"spring", players:["benjamint737","Dzouvi_","Fin_S1su","Henka0009","NerazzuriSWE","oggezed","Snus97_","Suth98_","sveti-"], moves:[
      {date:"2026-09-07",type:"in",player:"benjamint737"},
      {date:"2026-09-07",type:"in",player:"Dzouvi_"}
    ]},
    { name:"vNexs", springName:"vNexs I", logoName:"vNexs I", division:"Elite", kind:"spring", players:["antoniomannen_","AntonLxnd","launonexx","pappeen-","Skumboo"], moves:[
      {date:"2026-08-31",type:"out",player:"Curhed",note:"Lilmix"},
      {date:"2026-09-04",type:"out",player:"karlssonadam_"},
      {date:"2026-09-07",type:"out",player:"Dzouvi_",note:"Unwanted"}
    ]},

    { name:"Brynäs IF Esport", division:"Pro", kind:"spring", players:["Adaam-2","Bu-ffy","Gremlingswe","Jonass1551","Stenborg431","stickovic","Vibholm_10","Zonkji v","Zuppe_29"], moves:[
      {date:"2026-05-29",type:"out",player:"henk"},
      {date:"2026-06-03",type:"out",player:"I-Bysse-I"},
      {date:"2026-09-01",type:"out",player:"Wadde",note:"Burchurs HC"},
      {date:"2026-09-01",type:"in",player:"Zuppe_29",note:"från AFTERLIFE"},
      {date:"2026-09-03",type:"in",player:"Gremlingswe"}
    ]},
    { name:"SSK Prospects", division:"Pro", kind:"spring", players:["el_cisne_loco","HambergD","Kaxen88","KrissaNSE","MakkMakk1980","Mesimaki94","MightyJalt","nikuy92","patsukka","SwedenFtW99","Tuupe12"], moves:[
      {date:"2026-08-03",type:"in",player:"MakkMakk1980",note:"från SSK Adepts"},
      {date:"2026-08-03",type:"in",player:"SwedenFtW99",note:"från SSK Adepts"},
      {date:"2026-08-03",type:"in",player:"Tuupe12",note:"från SSK Academy"},
      {date:"2026-08-03",type:"in",player:"Mesimaki94",note:"från SSK Academy"},
      {date:"2026-08-03",type:"out",player:"kax jr",note:"Lilmix"},
      {date:"2026-08-03",type:"out",player:"Disctrasan",note:"Lilmix"},
      {date:"2026-08-12",type:"out",player:"Bullbaz",note:"Västerås IK"},
      {date:"2026-08-12",type:"in",player:"patsukka"},
      {date:"2026-08-13",type:"out",player:"therozz94",note:"Södertälje SK"},
      {date:"2026-08-17",type:"in",player:"KrissaNSE"}
    ]},
    { name:"Sunne IK Esport", division:"Pro", kind:"spring", players:["Antites_","Larzzon96","O3_DAFA","Patflex_","Svana_22","vPahlen"], moves:[] },
    { name:"Västerås IK", division:"Pro", kind:"spring", players:["amadee_","BuffaViana","Bullbaz","Dobby the Joker","I-alb1n-I","Mathiasgamer_07","Mrantonn--","MrXbox79","r4mme-0","Sebbanejad"], moves:[
      {date:"2026-07-08",type:"out",player:"sneipthegunner"},
      {date:"2026-08-12",type:"in",player:"Bullbaz"},
      {date:"2026-08-24",type:"in",player:"Mrantonn--",note:"från vNexs Wisemen"},
      {date:"2026-08-24",type:"out",player:"MeKNoXEr"}
    ]},
    { name:"vNexs II", division:"Pro", kind:"spring", players:["Gudinge","Hisens__","immuszn","iSvamp","JoakimOilers","Putteekiing","SeboLHD"], moves:[
      {date:"2026-06-25",type:"out",player:"Azzez_88",note:"Gifu Hockey"},
      {date:"2026-09-07",type:"out",player:"benjamint737",note:"Unwanted"}
    ]},

    { name:"Invasion Hockey", division:"Lite", kind:"spring", players:["BigKaxen","Brobeck86","GD_Hampezzz","I-Sjogren-I","Mrclaper09","RookieLIAMOVIC","xlcelQx"], moves:[
      {date:"2026-05-29",type:"out",player:"Aker36"},
      {date:"2026-05-30",type:"out",player:"Edluund___"}
    ]},
    { name:"Macho HC", division:"Lite", kind:"spring", players:["Linx Mau5","xBerra_"], moves:[
      {date:"2026-06-17",type:"out",player:"Prolane",note:"Zero Ping"},
      {date:"2026-09-03",type:"out",player:"Andre_24x",note:"Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"D4nzk80",note:"Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"IIFaranII",note:"Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"MrWennerstrom",note:"Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"strandis96",note:"Burchurs HC"}
    ]},
    { name:"Nordic Nosebleed", division:"Lite", kind:"spring", players:["cherrykicks","Eliekamel_","Feffe1och2","Jean-Claes","Lidaas_79","Pedaliv","Sayatu14","Thedisneytime"], moves:[] },
    { name:"Refuse Too Lose", division:"Lite", kind:"spring", players:["IVIotti_-","JezuzKristuz","nigeltje1","octo--8","Sonnysprofil","suomiboe88","Vindows2608","x0RIXELIT3xD","xLeppix","Zeven1988"], moves:[] },
    { name:"Sjukstugan", division:"Lite", kind:"spring", players:["IbjonoI","Jaiken--","Nephenzy","Robbin974","Supremski","xDisauttaja"], moves:[
      {date:"2026-05-30",type:"out",player:"DUNZA",note:"SSK Adepts"},
      {date:"2026-08-23",type:"out",player:"Dirty86er"},
      {date:"2026-08-26",type:"out",player:"softa_tofta",note:"SSK Academy"}
    ]},
    { name:"SSK Academy", division:"Lite", kind:"spring", players:["Ejamannen","fimpen_365","gtasir1","HultNiklas","KaiserHanzo","Qben","Sloogan9498","softa_tofta"], moves:[
      {date:"2026-05-30",type:"out",player:"Jungledonk",note:"Zero Ping"},
      {date:"2026-05-31",type:"in",player:"KaiserHanzo",note:"från SSK Adepts"},
      {date:"2026-05-31",type:"in",player:"Sloogan9498",note:"från SSK Adepts"},
      {date:"2026-08-03",type:"out",player:"Tuupe12",note:"SSK Prospects"},
      {date:"2026-08-03",type:"out",player:"Mesimaki94",note:"SSK Prospects"},
      {date:"2026-08-26",type:"in",player:"Qben"},
      {date:"2026-08-26",type:"in",player:"softa_tofta",note:"från Sjukstugan"}
    ]},
    { name:"SSK Adepts", division:"Lite", kind:"spring", players:["Allant03","DUNZA","ePsycoShow","kecke72"], moves:[
      {date:"2026-05-30",type:"in",player:"DUNZA",note:"från Sjukstugan"},
      {date:"2026-06-04",type:"out",player:"Diizzylicious",note:"Zero Ping"},
      {date:"2026-06-04",type:"out",player:"AG_Jarl",note:"Zero Ping"},
      {date:"2026-06-04",type:"out",player:"jcarlton89",note:"Zero Ping"},
      {date:"2026-07-06",type:"in",player:"ePsycoShow"},
      {date:"2026-08-03",type:"out",player:"MakkMakk1980",note:"SSK Prospects"},
      {date:"2026-08-03",type:"out",player:"SwedenFtW99",note:"SSK Prospects"}
    ]},
    { name:"TROJANS", division:"Lite", kind:"spring", players:["ElTorstenero","foxflyers","Hermelin999","imosi1","Janikka-","Rootmos","TiSuLiNo","xHampe29x"], moves:[
      {date:"2026-07-26",type:"out",player:"BeJutiFul",note:"Shadow Skulls"}
    ]},
    { name:"vNexs Vipers", division:"Lite", kind:"spring", players:["Dan9105","Dannu1237","DE BOHM","Hescoores","Jonsson03","Kungenanton02"], moves:[
      {date:"2026-06-27",type:"out",player:"Jaksii_"},
      {date:"2026-08-18",type:"out",player:"FrogNHL"}
    ]},

    { name:"BIK Karlskoga", springName:"BIK Karlskoga Esport", logoName:"BIK Karlskoga Esport", division:"Core", kind:"spring", players:["casse 33 40","henk","Hoefi_24","I Braxsiö I","itsWalsy","meeskojr_","Robin_86_6","Toivo4936"], moves:[
      {date:"2026-06-14",type:"out",player:"Mackedavid",note:"Northern Ztars"},
      {date:"2026-06-14",type:"out",player:"HyDraVenoM92",note:"Monarchs HC"},
      {date:"2026-06-14",type:"out",player:"R.kokkonen",note:"Monarchs HC"},
      {date:"2026-06-14",type:"out",player:"Westbergg1891"},
      {date:"2026-06-14",type:"in",player:"henk"},
      {date:"2026-06-14",type:"in",player:"Hoefi_24"},
      {date:"2026-06-14",type:"in",player:"I Braxsiö I"},
      {date:"2026-07-22",type:"out",player:"Elisx95"},
      {date:"2026-08-06",type:"out",player:"MarreMurre"},
      {date:"2026-08-07",type:"in",player:"meeskojr_"}
    ]},
    { name:"Carolus Icemen", division:"Core", kind:"spring", players:["I-Ashborn-I","Kvarneen","Mellerudspils","mj_slam","PaisleyJr","pepsicharlie","Skogspyssling","XxKotilainen17xX"], moves:[] },
    { name:"Northern Ztars", springName:"Northern Ztars Hockey", logoName:"Northern Ztars Hockey", division:"Core", kind:"spring", players:["Askewfungus","hodini90","Kassby83","Mackedavid","MelleMakrill","melwin71","MYTEN-LEGENDEN","Neowise-25","Philip_050505","Redhawk1765","wheelchair_88"], moves:[
      {date:"2026-06-29",type:"out",player:"Kxner"},
      {date:"2026-07-09",type:"out",player:"Phyreon",note:"Monarchs HC"},
      {date:"2026-07-21",type:"in",player:"Mackedavid",note:"från BIK Karlskoga"}
    ]},
    { name:"PRIMA", division:"Core", kind:"spring", players:["Bdahlo05","Bulten_49","Mmmgott","Pawlo_jr","Tobzzon","troublemakingswe","Twitch_wannika"], moves:[
      {date:"2026-06-10",type:"out",player:"JNHL-_-"}
    ]},
    { name:"Style", division:"Core", kind:"spring", players:["Ael-miK","Antonqs","Borjewiseman","FezH_88","jokkz-","LordOlii","Matth3ws34","mayX-swe","RHannu","Truesnap"], moves:[] },
    { name:"vNexs Wisemen", division:"Core", kind:"spring", players:["Chrillzoork","Glamborg81","Gurliver","juhi1891","Ma-X-imilian","Malmenlid","Mctook1","skillfull85"], moves:[
      {date:"2026-06-25",type:"out",player:"Mrantonn--",note:"Västerås IK"}
    ]},

    { name:"BIK Karlskoga Academy", division:"Neo", kind:"spring", players:["Bersson_92","D24tic_BTW","KetchupBTW_","MrBumban1","Polisbilen","Raggsockar","Runhager96"], moves:[
      {date:"2026-06-21",type:"out",player:"L-sk1y-L",note:"Monarchs HC"},
      {date:"2026-06-23",type:"out",player:"Yungs"},
      {date:"2026-06-30",type:"out",player:"Shn1pez"},
      {date:"2026-08-06",type:"out",player:"Olsson_lir89"}
    ]},
    { name:"Free From Rodents", division:"Neo", kind:"spring", players:["barke_89","Fellywoop","fixarjocke","Pjoter79","Pralle-","Sir_Wasp","Swe_WASP","WILD_-AT-_HEART"], moves:[] },
    { name:"N E O N X", division:"Neo", kind:"spring", players:["Drummerking83","FearlezZ_92","Gogulus87","Hampuzz105","Lapilsner","Rospiggen","weeman400_","Ztarsailor"], moves:[
      {date:"2026-06-30",type:"out",player:"HerrLarsson80"},
      {date:"2026-08-10",type:"in",player:"Rospiggen",note:"från Shadow Skulls"}
    ]},

    { name:"Monarchs HC", division:"Nytt", kind:"new", players:["arfurins","Bergman_29","deeliice","HyDraVenoM92","Jompahell!","L-sk1y-L","Mockingjayyz","pastorn!","Phyreon","R.kokkonen","xRedhawk93"], moves:[
      {date:"2026-06-24",type:"in",player:"Bergman_29"},
      {date:"2026-07-09",type:"in",player:"xRedhawk93"},
      {date:"2026-07-09",type:"in",player:"Mockingjayyz"},
      {date:"2026-07-09",type:"in",player:"pastorn!"},
      {date:"2026-07-09",type:"in",player:"HyDraVenoM92"},
      {date:"2026-07-09",type:"in",player:"Phyreon"},
      {date:"2026-07-09",type:"in",player:"deeliice"},
      {date:"2026-07-09",type:"in",player:"Jompahell!"},
      {date:"2026-07-31",type:"in",player:"R.kokkonen"},
      {date:"2026-08-07",type:"in",player:"L-sk1y-L"},
      {date:"2026-09-03",type:"in",player:"arfurins"},
      {date:"2026-09-06",type:"out",player:"Viiken"}
    ]},
    { name:"Burchurs HC", division:"Nytt", kind:"new", players:["Andre_24x","D4nzk80","IIFaranII","MrWennerstrom","strandis96","Wadde"], moves:[
      {date:"2026-09-03",type:"in",player:"Wadde"},
      {date:"2026-09-03",type:"in",player:"MrWennerstrom"},
      {date:"2026-09-03",type:"in",player:"D4nzk80"},
      {date:"2026-09-03",type:"in",player:"strandis96"},
      {date:"2026-09-03",type:"in",player:"Andre_24x"},
      {date:"2026-09-03",type:"in",player:"IIFaranII"}
    ]},
    { name:"Lilmix", division:"Nytt", kind:"new", players:["Brokenrice2000","Curhed","Disctrasan","kax jr","Sallee42"], moves:[
      {date:"2026-08-31",type:"in",player:"Sallee42"},
      {date:"2026-08-31",type:"in",player:"Curhed"},
      {date:"2026-08-31",type:"in",player:"kax jr"},
      {date:"2026-08-31",type:"in",player:"Disctrasan"},
      {date:"2026-08-31",type:"in",player:"Brokenrice2000"}
    ]},
    { name:"Zero Ping", division:"Nytt", kind:"new", players:["Diizzylicious","jcarlton89","Jungledonk","Prolane"], moves:[
      {date:"2026-06-04",type:"in",player:"jcarlton89"},
      {date:"2026-06-04",type:"in",player:"Jungledonk"},
      {date:"2026-06-04",type:"in",player:"Diizzylicious"},
      {date:"2026-06-17",type:"in",player:"Prolane"},
      {date:"2026-07-23",type:"out",player:"AG_Jarl"}
    ]},
    { name:"Shadow Skulls", logoName:"Shadow skulls", division:"Nytt", kind:"new", players:["FERNA"], moves:[
      {date:"2026-06-05",type:"in",player:"Gurrolito1976"},
      {date:"2026-06-11",type:"out",player:"Gurrolito1976"},
      {date:"2026-06-11",type:"out",player:"Rospiggen",note:"senare N E O N X"},
      {date:"2026-06-25",type:"in",player:"FERNA"},
      {date:"2026-07-26",type:"in",player:"BeJutiFul"},
      {date:"2026-09-06",type:"out",player:"BeJutiFul"}
    ]},
    { name:"VBO Stars", logoName:"VBO STARS", division:"Nytt", kind:"new", players:["KFC Melker"], moves:[
      {date:"2026-08-25",type:"in",player:"KFC Melker"}
    ]}
  ];

  const FA_TEAM_HINTS = Object.freeze({
    "xd_jacke":"Unwanted",
    "epsych0-":"Sunne IK Esport",
    "liimp_92":"PRIMA",
    "hajjeh37":"AFTERLIFE",
    "meknoxer":"Västerås IK",
    "edluund___":"Invasion Hockey",
    "jnhl-_-":"PRIMA",
    "herrlarsson80":"N E O N X",
    "bejutiful":"Shadow Skulls",
    "sille_":"VBO Stars"
  });

  const DIVISION_ORDER = { Elite:0, Pro:1, Lite:2, Core:3, Neo:4, Nytt:5 };
  const state = { freeAgents: [], search:"", division:"all", status:"all", mounted:false };

  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  const norm = (value) => String(value ?? "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g," ");
  const compactGt = (value) => norm(value).replace(/[^a-z0-9åäö_-]+/g, "");

  function formatDate(value) {
    const parts = String(value || "").split("-");
    if (parts.length !== 3) return value || "";
    const months = ["","jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
    return `${Number(parts[2])} ${months[Number(parts[1])]}`;
  }

  function statusFor(team, rosterCount) {
    if (team.kind === "new") {
      if (rosterCount >= 7) return { key:"ready", label:"Nytt lag · ser färdigt ut", tone:"green" };
      if (rosterCount >= 5) return { key:"building", label:"Nytt lag · på god väg", tone:"yellow" };
      if (rosterCount >= 3) return { key:"thin", label:"Nytt lag · bygger", tone:"orange" };
      return { key:"rebuild", label:"Nytt lag · tidigt bygge", tone:"red" };
    }
    if (rosterCount >= 7) return { key:"ready", label:"Ser färdigt ut", tone:"green" };
    if (rosterCount >= 5) return { key:"building", label:"På god väg", tone:"yellow" };
    if (rosterCount >= 3) return { key:"thin", label:"Tunt", tone:"orange" };
    return { key:"rebuild", label:"Kraftigt ombyggt", tone:"red" };
  }

  function logoUrl(team) {
    const manifest = window.SEH_TEAM_LOGO_FILES || {};
    const candidates = [team.logoName, team.name, team.springName].filter(Boolean);
    for (const candidate of candidates) {
      const key = `${candidate}.png`.normalize("NFC").toLocaleLowerCase("sv-SE");
      const actual = manifest[key];
      if (actual) return `teamlogos/${encodeURIComponent(actual)}`;
    }
    return "";
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0,3).map((part)=>part[0]).join("").toUpperCase();
  }

  function teamMatchesLatest(team, latestTeam) {
    const a = norm(latestTeam).replace(/\(dnf\)/g,"").trim();
    if (!a) return false;
    const candidates = [team.name, team.springName, team.logoName].filter(Boolean).map((x)=>norm(x));
    const alias = {
      "vasteras ik":"västerås ik",
      "vbo stars":"vbo stars",
      "ssk esports":"södertälje sk",
      "bik karlskoga esport":"bik karlskoga",
      "northern ztars hockey":"northern ztars"
    };
    const mapped = alias[a] || a;
    return candidates.some((c)=>c === mapped || alias[c] === mapped || c === a);
  }

  function freeAgentsForTeam(team) {
    const map = new Map();
    for (const fa of state.freeAgents) {
      const gt = String(fa.display_gamertag || "").trim();
      if (!gt) continue;
      const key = compactGt(gt);
      const hint = FA_TEAM_HINTS[key];
      const inRoster = team.players.some((p)=>compactGt(p) === key);
      const latestMatch = teamMatchesLatest(team, fa.latest_ecl_team);
      if (inRoster || hint === team.name || latestMatch) map.set(key, fa);
    }
    return Array.from(map.values());
  }

  function effectivePlayers(team) {
    const faKeys = new Set(freeAgentsForTeam(team).map((fa)=>compactGt(fa.display_gamertag)));
    return team.players.filter((player)=>!faKeys.has(compactGt(player)));
  }

  function renderMove(move) {
    const typeLabel = move.type === "in" ? "IN" : "UT";
    return `
      <div class="ecl27-move ecl27-move--${move.type}">
        <span class="ecl27-move__type">${typeLabel}</span>
        <strong>${esc(move.player)}</strong>
        ${move.note ? `<small>${esc(move.note)}</small>` : ""}
        <time datetime="${esc(move.date)}">${esc(formatDate(move.date))}</time>
      </div>
    `;
  }

  function renderTeamCard(team) {
    const roster = effectivePlayers(team);
    const fas = freeAgentsForTeam(team);
    const status = statusFor(team, roster.length);
    const logo = logoUrl(team);
    const latestMoves = [...team.moves].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,4);
    const allMoves = [...team.moves].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const incomingCount = team.moves.filter((m)=>m.type === "in").length;
    const outgoingCount = team.moves.filter((m)=>m.type === "out").length;
    const springLine = team.kind === "new"
      ? `<span class="ecl27-card__source ecl27-card__source--new">NYTT PROJEKT</span>`
      : `<span class="ecl27-card__source">ECL 26 SPRING · ${esc(team.division)}${team.springName && team.springName !== team.name ? ` · ${esc(team.springName)}` : ""}</span>`;

    return `
      <article class="ecl27-card" data-division="${esc(team.division)}" data-status="${status.key}" data-name="${esc(norm(team.name))}">
        <div class="ecl27-card__watermark" aria-hidden="true">${logo ? `<img src="${logo}" alt="">` : ""}</div>
        <header class="ecl27-card__head">
          <div class="ecl27-card__logo">${logo ? `<img src="${logo}" alt="${esc(team.name)}">` : `<span>${esc(initials(team.name))}</span>`}</div>
          <div class="ecl27-card__identity">
            ${springLine}
            <h3>${esc(team.name)}</h3>
            <div class="ecl27-card__badges">
              ${team.kind === "spring" ? `<span>${esc(team.division)}</span>` : `<span>NYTT</span>`}
              <span class="ecl27-status ecl27-status--${status.tone}">${esc(status.label)}</span>
            </div>
          </div>
        </header>

        <div class="ecl27-card__numbers">
          <div><span>KÄNDA SPELARE NU</span><strong>${roster.length}</strong></div>
          <div><span>IN</span><strong class="is-in">${incomingCount}</strong></div>
          <div><span>UT</span><strong class="is-out">${outgoingCount}</strong></div>
          <div><span>FA</span><strong class="is-fa">${fas.length}</strong></div>
        </div>

        <section class="ecl27-roster">
          <span class="ecl27-mini-label">KÄND TRUPP JUST NU</span>
          <div class="ecl27-roster__chips">
            ${roster.length ? roster.map((player)=>`<span>${esc(player)}</span>`).join("") : `<em>Ingen säker spelare kvar i vår sammanställning.</em>`}
          </div>
        </section>

        ${fas.length ? `
          <section class="ecl27-fa-box">
            <span class="ecl27-mini-label">AKTIVA FREE AGENTS</span>
            <div>${fas.map((fa)=>`<span>${esc(fa.display_gamertag)}</span>`).join("")}</div>
          </section>
        ` : ""}

        <section class="ecl27-moves">
          <span class="ecl27-mini-label">SENASTE BEKRÄFTADE RÖRELSER</span>
          ${latestMoves.length ? `<div class="ecl27-moves__list">${latestMoves.map(renderMove).join("")}</div>` : `<p class="ecl27-moves__empty">Inga nya in/ut-poster i underlaget.</p>`}
        </section>

        ${allMoves.length > 4 ? `
          <details class="ecl27-timeline">
            <summary>Visa alla ${allMoves.length} rörelser</summary>
            <div class="ecl27-timeline__body">${allMoves.map(renderMove).join("")}</div>
          </details>
        ` : ""}
      </article>
    `;
  }

  function allLatestMoves() {
    return TEAM_DATA.flatMap((team)=>team.moves.map((move)=>({...move,team:team.name})))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
      .slice(0,8);
  }

  function renderLatestFeed() {
    return allLatestMoves().map((move)=>`
      <div class="ecl27-feed__row">
        <span class="ecl27-feed__date">${esc(formatDate(move.date))}</span>
        <span class="ecl27-feed__type ecl27-feed__type--${move.type}">${move.type === "in" ? "IN" : "UT"}</span>
        <strong>${esc(move.player)}</strong>
        <span>${move.type === "in" ? "→" : "←"} ${esc(move.team)}</span>
        ${move.note ? `<small>${esc(move.note)}</small>` : ""}
      </div>
    `).join("");
  }

  function sortedTeams() {
    return [...TEAM_DATA].sort((a,b)=>{
      const div = (DIVISION_ORDER[a.division] ?? 99) - (DIVISION_ORDER[b.division] ?? 99);
      if (div) return div;
      return a.name.localeCompare(b.name,"sv");
    });
  }

  function filteredTeams() {
    return sortedTeams().filter((team)=>{
      const roster = effectivePlayers(team);
      const status = statusFor(team, roster.length);
      if (state.division !== "all" && team.division !== state.division) return false;
      if (state.status !== "all" && status.key !== state.status) return false;
      if (state.search) {
        const haystack = [team.name, team.springName, ...roster, ...team.moves.map((m)=>m.player)].filter(Boolean).join(" ").toLocaleLowerCase("sv-SE");
        if (!haystack.includes(state.search.toLocaleLowerCase("sv-SE"))) return false;
      }
      return true;
    });
  }

  function renderGrid() {
    const host = $("#ecl27BuildGrid");
    const result = $("#ecl27BuildResult");
    if (!host) return;
    const rows = filteredTeams();
    host.innerHTML = rows.map(renderTeamCard).join("");
    if (result) result.textContent = `${rows.length} av ${TEAM_DATA.length} lag/projekt`;
  }

  function freeAgentStrip() {
    if (!state.freeAgents.length) return `<span class="ecl27-fa-strip__loading">Hämtar aktiva Free Agents…</span>`;
    const names = state.freeAgents.map((row)=>row.display_gamertag).filter(Boolean).slice(0,14);
    return `${names.map((name)=>`<span>${esc(name)}</span>`).join("")}<a href="#/free-agents">Visa alla Free Agents →</a>`;
  }

  function renderFreeAgentStrip() {
    const host = $("#ecl27FaStrip");
    if (host) host.innerHTML = freeAgentStrip();
    const count = $("#ecl27FaCount");
    if (count) count.textContent = String(state.freeAgents.length || 20);
  }

  function mount() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
    const overview = $("#overview");
    if (!overview) return;

    const old = $("#ecl27TeamBuilds");
    if (old) {
      renderGrid();
      renderFreeAgentStrip();
      return;
    }

    injectStyles();

    const section = document.createElement("section");
    section.id = "ecl27TeamBuilds";
    section.className = "ecl27-builds";
    section.dataset.build = BUILD;
    section.innerHTML = `
      <header class="ecl27-builds__hero">
        <div>
          <p class="directory-kicker">SILLY SEASON · SVERIGE</p>
          <h2>ECL 27 – Svenska lagbyggen</h2>
          <p class="ecl27-builds__lead">En levande arbetsbild av hur de svenska lagen ser ut inför ECL 27. Vi utgår från ECL ’26 Spring, lägger på bekräftade in/ut-poster och markerar spelare som ligger ute som Free Agent.</p>
          <div class="ecl27-legend">
            <span><i class="is-confirmed"></i> Bekräftat = in/ut-post</span>
            <span><i class="is-fa"></i> FA = spelaren söker lag</span>
            <span><i class="is-estimate"></i> Status = vår bedömning</span>
          </div>
        </div>
        <div class="ecl27-builds__stamp">
          <span>SENAST UPPDATERAD</span>
          <strong>${esc(SNAPSHOT_UPDATED)}</strong>
          <small>Transferunderlag + live Free Agents</small>
        </div>
      </header>

      <div class="ecl27-overview">
        <div><span>SPRING-LAG</span><strong>27</strong><small>Elite → Neo</small></div>
        <div><span>NYA PROJEKT</span><strong>6</strong><small>som framträder i silly season</small></div>
        <div><span>AKTIVA FA</span><strong id="ecl27FaCount">20</strong><small>hämtas live</small></div>
        <div><span>UNDERLAG</span><strong>${TEAM_DATA.reduce((sum,t)=>sum+t.moves.length,0)}</strong><small>registrerade rörelser</small></div>
      </div>

      <section class="ecl27-feed" aria-label="Senaste rörelser">
        <div class="ecl27-section-head"><div><p class="directory-kicker">SENASTE</p><h3>Transferflödet</h3></div><span>Bekräftade rörelser i underlaget</span></div>
        <div class="ecl27-feed__list">${renderLatestFeed()}</div>
      </section>

      <section class="ecl27-browser">
        <div class="ecl27-section-head"><div><p class="directory-kicker">LAG FÖR LAG</p><h3>Svenska lagbyggen just nu</h3></div><span id="ecl27BuildResult">${TEAM_DATA.length} lag/projekt</span></div>
        <div class="ecl27-toolbar">
          <label><span>SÖK</span><input id="ecl27BuildSearch" type="search" placeholder="Lag eller spelare…" autocomplete="off"></label>
          <label><span>SPRING-NIVÅ</span><select id="ecl27BuildDivision"><option value="all">Alla nivåer</option><option>Elite</option><option>Pro</option><option>Lite</option><option>Core</option><option>Neo</option><option value="Nytt">Nya projekt</option></select></label>
          <label><span>STATUS</span><select id="ecl27BuildStatus"><option value="all">Alla statusar</option><option value="ready">Ser färdigt ut</option><option value="building">På god väg</option><option value="thin">Tunt / bygger</option><option value="rebuild">Kraftigt ombyggt / tidigt</option></select></label>
        </div>
        <div id="ecl27BuildGrid" class="ecl27-grid"></div>
      </section>

      <section class="ecl27-fa-strip-wrap">
        <div><p class="directory-kicker">FREE AGENTS</p><h3>Spelare fortfarande på marknaden</h3></div>
        <div id="ecl27FaStrip" class="ecl27-fa-strip">${freeAgentStrip()}</div>
      </section>

      <aside class="ecl27-method">
        <strong>Så läser du sidan</strong>
        <p>Det här är inte officiella ECL 27-rosters. En spelare räknas som flyttad när det finns en bekräftad in/ut-post. En aktiv Free Agent markeras separat. Statusen <em>Ser färdigt ut / På god väg / Tunt / Kraftigt ombyggt</em> bygger enbart på hur många kända spelare vi kan belägga just nu.</p>
      </aside>
    `;

    overview.insertAdjacentElement("afterend", section);

    const actions = overview.querySelector(".season-upcoming-actions-v12840");
    if (actions && !actions.querySelector("[data-ecl27-builds-jump]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.ecl27BuildsJump = "true";
      button.textContent = "Svenska lagbyggen →";
      button.addEventListener("click", ()=>section.scrollIntoView({behavior:"smooth",block:"start"}));
      actions.prepend(button);
    }

    const search = $("#ecl27BuildSearch");
    const division = $("#ecl27BuildDivision");
    const status = $("#ecl27BuildStatus");
    search?.addEventListener("input", ()=>{ state.search = search.value.trim(); renderGrid(); });
    division?.addEventListener("change", ()=>{ state.division = division.value; renderGrid(); });
    status?.addEventListener("change", ()=>{ state.status = status.value; renderGrid(); });

    renderGrid();
    renderFreeAgentStrip();
    state.mounted = true;
    loadFreeAgents();
  }

  async function loadFreeAgents() {
    const cfg = window.EHOCKEY_CONFIG || window.SEH_CONFIG || {};
    if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabasePublishableKey) return;
    try {
      const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
        auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
      });
      const { data, error } = await sb
        .from("v_ehockey_free_agents_public")
        .select("display_gamertag,latest_ecl_team,latest_ecl_division,fa_date")
        .order("fa_date", { ascending:false });
      if (error) throw error;
      state.freeAgents = Array.isArray(data) ? data : [];
      renderFreeAgentStrip();
      renderGrid();
    } catch (error) {
      console.warn("ECL 27 lagbyggen: kunde inte hämta live Free Agents", error);
    }
  }

  function injectStyles() {
    if ($("#ecl27TeamBuildsStyle")) return;
    const style = document.createElement("style");
    style.id = "ecl27TeamBuildsStyle";
    style.textContent = `
      .ecl27-builds{margin:28px 0 0;padding:0 0 42px;color:#f7f4ed;scroll-margin-top:92px}
      .ecl27-builds *{box-sizing:border-box}
      .ecl27-builds__hero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,320px);gap:30px;padding:34px;border:1px solid rgba(214,177,95,.30);border-radius:22px;background:linear-gradient(135deg,rgba(3,10,20,.98),rgba(3,9,18,.94) 56%,rgba(8,22,42,.96));box-shadow:0 22px 60px rgba(0,0,0,.23)}
      .ecl27-builds__hero:after{content:"";position:absolute;right:-5%;top:-30%;width:43%;height:190%;transform:skewX(-18deg);background:linear-gradient(180deg,rgba(14,104,155,.12),rgba(214,177,95,.04));pointer-events:none}
      .ecl27-builds__hero>div{position:relative;z-index:1}
      .ecl27-builds__hero h2{margin:4px 0 12px;font-size:clamp(36px,4.2vw,68px);line-height:.95;letter-spacing:-.045em;color:#f7f4ed}
      .ecl27-builds__lead{max-width:850px;margin:0;color:#b9c6d4;font-size:15px;line-height:1.65}
      .ecl27-legend{display:flex;flex-wrap:wrap;gap:9px 16px;margin-top:22px;color:#96a9ba;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
      .ecl27-legend span{display:flex;align-items:center;gap:7px}.ecl27-legend i{width:9px;height:9px;border-radius:50%}.ecl27-legend .is-confirmed{background:#36dfc7}.ecl27-legend .is-fa{background:#ffcb3f}.ecl27-legend .is-estimate{background:#7391ad}
      .ecl27-builds__stamp{align-self:center;padding:20px 22px;border:1px solid rgba(214,177,95,.28);border-radius:16px;background:rgba(0,0,0,.22)}
      .ecl27-builds__stamp span,.ecl27-builds__stamp small{display:block;color:#7492aa;font-size:10px;font-weight:900;letter-spacing:.13em}.ecl27-builds__stamp strong{display:block;margin:5px 0 9px;color:#f0d58b;font-size:21px}
      .ecl27-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:14px 0 26px;border:1px solid #18293b;border-radius:18px;overflow:hidden;background:#030a12}
      .ecl27-overview>div{padding:19px 22px;border-right:1px solid #18293b}.ecl27-overview>div:last-child{border-right:0}.ecl27-overview span,.ecl27-overview small{display:block}.ecl27-overview span{color:#59e7de;font-size:9px;font-weight:950;letter-spacing:.13em}.ecl27-overview strong{display:block;margin:5px 0 2px;font-size:32px;line-height:1;color:#ffd900}.ecl27-overview small{color:#74899d;font-size:10px}
      .ecl27-feed,.ecl27-browser,.ecl27-fa-strip-wrap{margin-top:18px;border:1px solid #172635;border-radius:18px;background:rgba(2,8,14,.86);overflow:hidden}
      .ecl27-section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #172635}.ecl27-section-head h3,.ecl27-fa-strip-wrap h3{margin:2px 0 0;font-size:27px;color:#f7f4ed}.ecl27-section-head>span{color:#6f879b;font-size:11px}
      .ecl27-feed__list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#172635}.ecl27-feed__row{display:grid;grid-template-columns:48px 34px minmax(100px,.7fr) minmax(120px,1fr);align-items:center;gap:9px;min-height:52px;padding:9px 15px;background:#030a11}.ecl27-feed__row strong{color:#fff}.ecl27-feed__row>span:nth-of-type(3){color:#9eb1c1}.ecl27-feed__row small{grid-column:4;color:#6f8496}.ecl27-feed__date{color:#71889b;font-size:10px;text-transform:uppercase}.ecl27-feed__type{display:inline-grid;place-items:center;height:24px;border-radius:5px;font-size:9px;font-weight:950}.ecl27-feed__type--in{color:#45efd5;background:rgba(32,209,178,.10);border:1px solid rgba(32,209,178,.25)}.ecl27-feed__type--out{color:#ff7777;background:rgba(255,87,87,.08);border:1px solid rgba(255,87,87,.24)}
      .ecl27-toolbar{display:grid;grid-template-columns:1.5fr .7fr .8fr;gap:10px;padding:14px 16px;border-bottom:1px solid #172635}.ecl27-toolbar label{display:grid;gap:6px}.ecl27-toolbar label>span{color:#46e5dd;font-size:8px;font-weight:950;letter-spacing:.13em}.ecl27-toolbar input,.ecl27-toolbar select{width:100%;height:44px;padding:0 13px;border:1px solid #203347;border-radius:10px;background:#020811;color:#fff;font:inherit;font-size:12px;outline:none}.ecl27-toolbar input:focus,.ecl27-toolbar select:focus{border-color:#d6b15f;box-shadow:0 0 0 2px rgba(214,177,95,.08)}
      .ecl27-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:14px;background:#02070c}
      .ecl27-card{position:relative;overflow:hidden;min-width:0;padding:17px;border:1px solid rgba(214,177,95,.28);border-radius:16px;background:linear-gradient(155deg,#04101c 0%,#02080f 72%);box-shadow:inset 0 1px rgba(255,255,255,.015)}
      .ecl27-card__watermark{position:absolute;right:-22px;top:55px;width:160px;height:160px;opacity:.055;filter:grayscale(1);pointer-events:none}.ecl27-card__watermark img{width:100%;height:100%;object-fit:contain}
      .ecl27-card__head{position:relative;z-index:1;display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:center}.ecl27-card__logo{display:grid;place-items:center;width:64px;height:64px;border:1px solid #20374c;border-radius:14px;background:#061421;overflow:hidden}.ecl27-card__logo img{width:86%;height:86%;object-fit:contain}.ecl27-card__logo span{color:#d6b15f;font-weight:950;font-size:20px}.ecl27-card__source{display:block;margin-bottom:4px;color:#65d9dd;font-size:8px;font-weight:950;letter-spacing:.11em}.ecl27-card__source--new{color:#ffd34d}.ecl27-card h3{margin:0;color:#fff;font-size:24px;line-height:1.05;letter-spacing:-.025em}.ecl27-card__badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.ecl27-card__badges>span{padding:4px 7px;border:1px solid #294055;border-radius:999px;color:#a7bbca;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.ecl27-status--green{color:#65f2c8!important;border-color:rgba(82,238,192,.38)!important;background:rgba(82,238,192,.07)}.ecl27-status--yellow{color:#f3d36c!important;border-color:rgba(214,177,95,.42)!important;background:rgba(214,177,95,.07)}.ecl27-status--orange{color:#f5a765!important;border-color:rgba(245,167,101,.38)!important;background:rgba(245,167,101,.07)}.ecl27-status--red{color:#ff7a7a!important;border-color:rgba(255,86,86,.35)!important;background:rgba(255,86,86,.06)}
      .ecl27-card__numbers{position:relative;z-index:1;display:grid;grid-template-columns:1.35fr repeat(3,.65fr);gap:1px;margin-top:15px;border:1px solid #1b3042;border-radius:10px;overflow:hidden;background:#1b3042}.ecl27-card__numbers>div{padding:9px 10px;background:#03101a}.ecl27-card__numbers span{display:block;color:#5fcfd3;font-size:7px;font-weight:950;letter-spacing:.09em}.ecl27-card__numbers strong{display:block;margin-top:3px;color:#fff;font-size:18px}.ecl27-card__numbers .is-in{color:#54ebcd}.ecl27-card__numbers .is-out{color:#ff7676}.ecl27-card__numbers .is-fa{color:#ffd350}
      .ecl27-roster,.ecl27-fa-box,.ecl27-moves{position:relative;z-index:1;margin-top:13px}.ecl27-mini-label{display:block;margin-bottom:7px;color:#5dd7db;font-size:7px;font-weight:950;letter-spacing:.12em}.ecl27-roster__chips,.ecl27-fa-box>div{display:flex;flex-wrap:wrap;gap:5px}.ecl27-roster__chips span,.ecl27-fa-box span{padding:4px 7px;border:1px solid #203448;border-radius:999px;background:#04111c;color:#c7d3dc;font-size:9px}.ecl27-roster__chips em{color:#72899c;font-size:10px;font-style:normal}.ecl27-fa-box{padding:10px;border:1px solid rgba(222,176,52,.27);border-radius:10px;background:rgba(222,176,52,.035)}.ecl27-fa-box span{border-color:rgba(222,176,52,.35);color:#f0d58b;background:rgba(222,176,52,.05)}
      .ecl27-moves__list,.ecl27-timeline__body{display:grid;gap:5px}.ecl27-move{display:grid;grid-template-columns:26px minmax(80px,1fr) minmax(0,.8fr) 34px;align-items:center;gap:7px;min-height:28px;color:#8599aa;font-size:9px}.ecl27-move__type{font-size:8px;font-weight:950}.ecl27-move--in .ecl27-move__type{color:#4fe9cc}.ecl27-move--out .ecl27-move__type{color:#ff7777}.ecl27-move strong{overflow:hidden;text-overflow:ellipsis;color:#e6edf2;white-space:nowrap}.ecl27-move small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#71889c}.ecl27-move time{text-align:right;color:#63798b}.ecl27-moves__empty{margin:0;color:#657c90;font-size:9px}.ecl27-timeline{position:relative;z-index:1;margin-top:10px;padding-top:9px;border-top:1px solid #132535}.ecl27-timeline summary{cursor:pointer;color:#d5b866;font-size:9px;font-weight:900}.ecl27-timeline__body{margin-top:9px}
      .ecl27-fa-strip-wrap{display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;padding:20px 22px}.ecl27-fa-strip{display:flex;flex-wrap:wrap;align-content:center;gap:6px}.ecl27-fa-strip span{padding:5px 8px;border:1px solid rgba(214,177,95,.28);border-radius:999px;color:#d8c37d;font-size:9px}.ecl27-fa-strip a{align-self:center;margin-left:auto;color:#f0d58b;font-size:10px;font-weight:900;text-decoration:none}.ecl27-fa-strip__loading{color:#778da0!important;border:0!important}.ecl27-method{margin-top:14px;padding:17px 19px;border-left:3px solid #d6b15f;background:rgba(214,177,95,.035);color:#8fa3b3;font-size:11px;line-height:1.6}.ecl27-method strong{display:block;margin-bottom:3px;color:#f0d58b}.ecl27-method p{margin:0}.ecl27-method em{color:#bac8d2}
      .season-upcoming-actions-v12840 button[data-ecl27-builds-jump]{appearance:none;cursor:pointer;padding:10px 13px;border:1px solid rgba(214,177,95,.55);background:#d6b15f;color:#05070a;font:inherit;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.05em}
      @media(max-width:1250px){.ecl27-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ecl27-feed__list{grid-template-columns:1fr}}
      @media(max-width:900px){.ecl27-builds__hero{grid-template-columns:1fr}.ecl27-overview{grid-template-columns:repeat(2,1fr)}.ecl27-overview>div:nth-child(2){border-right:0}.ecl27-overview>div:nth-child(-n+2){border-bottom:1px solid #18293b}.ecl27-toolbar{grid-template-columns:1fr}.ecl27-fa-strip-wrap{grid-template-columns:1fr}}
      @media(max-width:680px){.ecl27-builds__hero{padding:23px 18px}.ecl27-grid{grid-template-columns:1fr;padding:8px}.ecl27-section-head{align-items:flex-start;padding:18px 15px}.ecl27-feed__row{grid-template-columns:42px 30px minmax(90px,1fr);gap:6px}.ecl27-feed__row>span:nth-of-type(3),.ecl27-feed__row small{grid-column:3}.ecl27-overview strong{font-size:26px}.ecl27-card{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  let mountTimer = 0;
  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = window.setTimeout(mount, 80);
  }

  window.addEventListener("hashchange", scheduleMount);
  window.addEventListener("DOMContentLoaded", scheduleMount);
  if (document.readyState !== "loading") scheduleMount();

  const observer = new MutationObserver(() => {
    if (String(location.hash || "").startsWith(ROUTE_PREFIX) && !$("#ecl27TeamBuilds")) scheduleMount();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
