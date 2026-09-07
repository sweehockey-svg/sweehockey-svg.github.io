/*
  ECL 27 – Svenska lagbyggen v2
  Underlag: ECL '26 Spring + bekräftade svenska in/ut-poster t.o.m. 6 sep 2026.
  Aktiva Free Agents hämtas live från v_ehockey_free_agents_public.
*/
(function () {
  "use strict";

  const BUILD = "2026-09-07-v2";
  const ROUTE_PREFIX = "#/sasong/ecl27winter";
  const SNAPSHOT_UPDATED = "7 sep 2026 · uppdaterad silly season-lista";

  const TEAM_DATA = [
    { name:"AFTERLIFE", division:"Elite", kind:"spring", players:["borjee__","Bystrom33","bystromjr_","hajjeh37","Maxboeeee_"], moves:[
      {date:"2026-08-31",type:"out",player:"Zuppe_29",note:"→ Brynäs IF Esport"},
      {date:"2026-09-06",type:"out",player:"Rubituss_"}
    ]},
    { name:"Södertälje SK", springName:"SSK ESPORTS", logoName:"Södertälje SK", division:"Elite", kind:"spring", players:["Axelzonee","l-Furyan-l","minokin-","SmAyK99","therozz94","Wagge01"], moves:[
      {date:"2026-05-25",type:"out",player:"LaxenHD",note:"→ Unwanted"},
      {date:"2026-05-25",type:"out",player:"Brokenrice2000",note:"senare Lilmix"},
      {date:"2026-08-13",type:"in",player:"therozz94",note:"från SSK Prospects"}
    ]},
    { name:"Unwanted", division:"Elite", kind:"spring", players:["benjamint737","Fin_S1su","Henka0009","LaxenHD","oggezed","Snus97_","Suth98_","sveti-","XD_Jacke"], moves:[
      {date:"2026-05-25",type:"in",player:"LaxenHD",note:"från Södertälje SK"},
      {date:"2026-05-26",type:"out",player:"NerazzuriSWE"},
      {date:"2026-09-06",type:"in",player:"benjamint737",note:"från vNexs II"}
    ]},
    { name:"vNexs", springName:"vNexs I", logoName:"vNexs I", division:"Elite", kind:"spring", players:["antoniomannen_","AntonLxnd","Dzouvi_","launonexx","pappeen-","Skumboo"], moves:[
      {date:"2026-08-31",type:"out",player:"Curhed",note:"→ Lilmix"},
      {date:"2026-09-04",type:"out",player:"karlssonadam_"}
    ]},

    { name:"Brynäs IF Esport", division:"Pro", kind:"spring", players:["Adaam-2","Bu-ffy","Gremlingswe","Jonass1551","Stenborg431","stickovic","Vibholm_10","Zonkji v","Zuppe_29"], moves:[
      {date:"2026-05-29",type:"out",player:"henk"},
      {date:"2026-06-03",type:"out",player:"I-Bysse-I"},
      {date:"2026-09-01",type:"in",player:"Zuppe_29",note:"från AFTERLIFE"},
      {date:"2026-09-01",type:"out",player:"Wadde",note:"→ Burchurs HC"},
      {date:"2026-09-03",type:"in",player:"Gremlingswe"}
    ]},
    { name:"SSK Prospects", division:"Pro", kind:"spring", players:["el_cisne_loco","HambergD","Kaxen88","KrissaNSE","MakkMakk1980","Mesimaki94","MightyJalt","nikuy92","patsukka","SwedenFtW99","Tuupe12"], moves:[
      {date:"2026-08-03",type:"in",player:"MakkMakk1980",note:"från SSK Adepts"},
      {date:"2026-08-03",type:"in",player:"SwedenFtW99",note:"från SSK Adepts"},
      {date:"2026-08-03",type:"in",player:"Tuupe12",note:"från SSK Academy"},
      {date:"2026-08-03",type:"in",player:"Mesimaki94",note:"från SSK Academy"},
      {date:"2026-08-03",type:"out",player:"kax jr",note:"→ Lilmix"},
      {date:"2026-08-03",type:"out",player:"Disctrasan",note:"→ Lilmix"},
      {date:"2026-08-12",type:"in",player:"patsukka"},
      {date:"2026-08-13",type:"out",player:"therozz94",note:"→ Södertälje SK"},
      {date:"2026-08-17",type:"in",player:"KrissaNSE"}
    ]},
    { name:"Sunne IK Esport", division:"Pro", kind:"spring", players:["Antites_","ePsych0-","Larzzon96","O3_DAFA","Patflex_","Svana_22","vPahlen"], moves:[] },
    { name:"Västerås IK", division:"Pro", kind:"spring", players:["amadee_","BuffaViana","Bullbaz","Dobby the Joker","I-alb1n-I","Mathiasgamer_07","Mrantonn--","MrXbox79","r4mme-0","Sebbanejad"], moves:[
      {date:"2026-07-08",type:"out",player:"sneipthegunner"},
      {date:"2026-08-12",type:"in",player:"Bullbaz"},
      {date:"2026-08-24",type:"in",player:"Mrantonn--",note:"från vNexs Wisemen"},
      {date:"2026-08-24",type:"out",player:"MeKNoXEr"}
    ]},
    { name:"vNexs II", division:"Pro", kind:"spring", players:["Gudinge","Hisens__","immuszn","iSvamp","JoakimOilers","Putteekiing","SeboLHD"], moves:[
      {date:"2026-06-25",type:"out",player:"Azzez_88",note:"→ Gifu Hockey"},
      {date:"2026-09-06",type:"out",player:"benjamint737",note:"→ Unwanted"}
    ]},

    { name:"Invasion Hockey", division:"Lite", kind:"spring", players:["BigKaxen","Brobeck86","GD_Hampezzz","I-Sjogren-I","Mrclaper09","RookieLIAMOVIC","xlcelQx"], moves:[
      {date:"2026-05-29",type:"out",player:"Kaxen21"},
      {date:"2026-05-29",type:"out",player:"Aker36"},
      {date:"2026-05-30",type:"out",player:"Edluund___"}
    ]},
    { name:"Macho HC", division:"Lite", kind:"spring", players:["Linx Mau5","xBerra_"], moves:[
      {date:"2026-06-17",type:"out",player:"Prolane",note:"→ Zero Ping"},
      {date:"2026-09-03",type:"out",player:"Andre_24x",note:"→ Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"D4nzk80",note:"→ Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"IIFaranII",note:"→ Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"MrWennerstrom",note:"→ Burchurs HC"},
      {date:"2026-09-03",type:"out",player:"strandis96",note:"→ Burchurs HC"}
    ]},
    { name:"Nordic Nosebleed", division:"Lite", kind:"spring", players:["cherrykicks","Eliekamel_","Feffe1och2","Jean-Claes","Lidaas_79","Pedaliv","Sayatu14","Thedisneytime"], moves:[] },
    { name:"Refuse Too Lose", division:"Lite", kind:"spring", players:["IVIotti_-","JezuzKristuz","nigeltje1","octo--8","Sonnysprofil","suomiboe88","Vindows2608","x0RIXELIT3xD","xLeppix","Zeven1988"], moves:[] },
    { name:"Sjukstugan", division:"Lite", kind:"spring", players:["IbjonoI","Jaiken--","Nephenzy","Robbin974","Supremski","xDisauttaja"], moves:[
      {date:"2026-05-30",type:"out",player:"DUNZA",note:"→ SSK Adepts"},
      {date:"2026-08-23",type:"out",player:"Dirty86er"},
      {date:"2026-08-26",type:"out",player:"softa_tofta",note:"SSK Academy bekräftade IN"}
    ]},
    { name:"SSK Academy", division:"Lite", kind:"spring", players:["Ejamannen","gtasir1","HultNiklas","KaiserHanzo","Qben","Sloogan9498","softa_tofta"], moves:[
      {date:"2026-05-26",type:"out",player:"fimpen_365"},
      {date:"2026-05-30",type:"out",player:"Jungledonk",note:"→ Zero Ping"},
      {date:"2026-05-31",type:"out",player:"MakkMakk1980",note:"→ SSK Adepts"},
      {date:"2026-05-31",type:"out",player:"SwedenFtW99",note:"→ SSK Adepts"},
      {date:"2026-05-31",type:"in",player:"Sloogan9498",note:"från SSK Adepts"},
      {date:"2026-05-31",type:"in",player:"KaiserHanzo",note:"från SSK Adepts"},
      {date:"2026-05-31",type:"out",player:"Lunkan_7"},
      {date:"2026-05-31",type:"in",player:"KFC Melker",note:"från SSK Adepts"},
      {date:"2026-08-03",type:"out",player:"Tuupe12",note:"→ SSK Prospects"},
      {date:"2026-08-03",type:"out",player:"Mesimaki94",note:"→ SSK Prospects"},
      {date:"2026-08-26",type:"in",player:"Qben"},
      {date:"2026-08-26",type:"in",player:"softa_tofta"}
    ]},
    { name:"SSK Adepts", division:"Lite", kind:"spring", players:["Allant03","DUNZA","ePsycoShow","kecke72"], moves:[
      {date:"2026-05-30",type:"in",player:"DUNZA",note:"från Sjukstugan"},
      {date:"2026-05-31",type:"in",player:"MakkMakk1980",note:"från SSK Academy"},
      {date:"2026-05-31",type:"in",player:"SwedenFtW99",note:"från SSK Academy"},
      {date:"2026-05-31",type:"out",player:"KaiserHanzo",note:"→ SSK Academy"},
      {date:"2026-05-31",type:"out",player:"Sloogan9498",note:"→ SSK Academy"},
      {date:"2026-05-31",type:"out",player:"KFC Melker",note:"→ SSK Academy"},
      {date:"2026-06-04",type:"out",player:"Diizzylicious",note:"→ Zero Ping"},
      {date:"2026-06-04",type:"out",player:"AG_Jarl",note:"→ Zero Ping"},
      {date:"2026-06-04",type:"out",player:"jcarlton89",note:"→ Zero Ping"},
      {date:"2026-07-06",type:"in",player:"ePsycoShow"},
      {date:"2026-07-27",type:"out",player:"KFC Melker",note:"senare VBO Stars"},
      {date:"2026-08-03",type:"out",player:"MakkMakk1980",note:"→ SSK Prospects"},
      {date:"2026-08-03",type:"out",player:"SwedenFtW99",note:"→ SSK Prospects"}
    ]},
    { name:"TROJANS", division:"Lite", kind:"spring", players:["ElTorstenero","foxflyers","Hermelin999","imosi1","Janikka-","Rootmos","TiSuLiNo","xHampe29x"], moves:[
      {date:"2026-07-26",type:"out",player:"BeJutiFul",note:"Shadow Skulls bekräftade IN"}
    ]},
    { name:"vNexs Vipers", division:"Lite", kind:"spring", players:["Dan9105","Dannu1237","DE BOHM","Hescoores","Jonsson03","Kungenanton02"], moves:[
      {date:"2026-06-27",type:"out",player:"Jaksii_"},
      {date:"2026-08-18",type:"out",player:"FrogNHL"}
    ]},

    { name:"BIK Karlskoga", springName:"BIK Karlskoga Esport", logoName:"BIK Karlskoga Esport", division:"Core", kind:"spring", players:["casse 33 40","henk","Hoefi_24","I Braxsiö I","itsWalsy","Robin_86_6","Toivo4936"], moves:[
      {date:"2026-06-14",type:"out",player:"Mackedavid",note:"→ Northern Ztars"},
      {date:"2026-06-14",type:"out",player:"HyDraVenoM92",note:"→ Monarchs HC"},
      {date:"2026-06-14",type:"out",player:"R.kokkonen",note:"senare Monarchs HC"},
      {date:"2026-06-14",type:"out",player:"westbergg1891"},
      {date:"2026-06-14",type:"in",player:"henk"},
      {date:"2026-06-14",type:"in",player:"Hoefi_24"},
      {date:"2026-06-14",type:"in",player:"I Braxsiö I"},
      {date:"2026-07-22",type:"out",player:"Elisx95"},
      {date:"2026-08-06",type:"out",player:"MarreMurre"},
      {date:"2026-08-07",type:"in",player:"meeskojr_"},
      {date:"2026-08-24",type:"out",player:"meeskojr_",note:"Västerås Vipers bekräftade IN"}
    ]},
    { name:"Carolus Icemen", division:"Core", kind:"spring", players:["I-Ashborn-I","Kvarneen","Mellerudspils","mj_slam","PaisleyJr","pepsicharlie","Skogspyssling","XxKotilainen17xX"], moves:[] },
    { name:"Northern Ztars", springName:"Northern Ztars Hockey", logoName:"Northern Ztars Hockey", division:"Core", kind:"spring", players:["Askewfungus","hodini90","Kassby83","Mackedavid","MelleMakrill","melwin71","MYTEN-LEGENDEN","Neowise-25","Philip_050505","Redhawk1765","wheelchair_88"], moves:[
      {date:"2026-06-29",type:"out",player:"Kxner"},
      {date:"2026-07-09",type:"out",player:"Phyreon",note:"Monarchs HC bekräftade IN"},
      {date:"2026-07-21",type:"in",player:"Mackedavid",note:"från BIK Karlskoga"}
    ]},
    { name:"PRIMA", division:"Core", kind:"spring", players:["Bdahlo05","Bulten_49","Liimp_92","Mmmgott","Pawlo_jr","Tobzzon","troublemakingswe","Twitch_wannika"], moves:[
      {date:"2026-06-10",type:"out",player:"JNHL-_-"},
      {date:"2026-06-10",type:"out",player:"byrran_"}
    ]},
    { name:"Style", division:"Core", kind:"spring", players:["Ael-miK","Antonqs","Borjewiseman","FezH_88","jokkz-","LordOlii","Matth3ws34","mayX-swe","RHannu","Truesnap"], moves:[] },
    { name:"vNexs Wisemen", division:"Core", kind:"spring", players:["Chrillzoork","Glamborg81","Gurliver","juhi1891","Ma-X-imilian","Malmenlid","Mctook1","skillfull85"], moves:[
      {date:"2026-06-25",type:"out",player:"Mrantonn--",note:"senare Västerås IK"}
    ]},

    { name:"BIK Karlskoga Academy", division:"Neo", kind:"spring", players:["Bersson_92","D24tic_BTW","KetchupBTW_","MrBumban1","Polisbilen","Raggsockar","Runhager96"], moves:[
      {date:"2026-06-21",type:"out",player:"L-sk1y-L",note:"senare Monarchs HC"},
      {date:"2026-06-23",type:"out",player:"Yungs"},
      {date:"2026-06-30",type:"out",player:"Shn1pez"},
      {date:"2026-08-06",type:"out",player:"Shn1pez"},
      {date:"2026-08-06",type:"out",player:"Olsson_lir89"}
    ]},
    { name:"Free From Rodents", division:"Neo", kind:"spring", players:["barke_89","Fellywoop","fixarjocke","Pjoter79","Pralle-","Sir_Wasp","Swe_WASP","WILD_-AT-_HEART"], moves:[] },
    { name:"N E O N X", division:"Neo", kind:"spring", players:["Drummerking83","FearlezZ_92","Gogulus87","Hampuzz105","handsken111","Lapilsner","Lundin18","Poppen","Rospiggen","Simme96a","weeman400_","Ztarsailor"], moves:[
      {date:"2026-05-15",type:"in",player:"FearlezZ_92"},
      {date:"2026-05-15",type:"in",player:"weeman"},
      {date:"2026-05-15",type:"in",player:"Lundin18"},
      {date:"2026-05-15",type:"in",player:"FIFTY CHENG"},
      {date:"2026-05-15",type:"in",player:"HerrLarsson80"},
      {date:"2026-05-15",type:"in",player:"Poppen"},
      {date:"2026-05-15",type:"in",player:"Simme96a"},
      {date:"2026-05-15",type:"in",player:"handsken111"},
      {date:"2026-06-30",type:"out",player:"HerrLarsson80"},
      {date:"2026-06-30",type:"out",player:"FIFTY CHENG"},
      {date:"2026-08-10",type:"in",player:"Rospiggen",note:"från Shadow Skulls"}
    ]},

    { name:"Monarchs HC", division:"Nytt", kind:"new", players:["arfurins","Bergman_29","deeliice","HyDraVenoM92","Jompahell!","L-sk1y-L","Mockingjayyz","pastorn!","Phyreon","R.kokkonen","xRedhawk93"], moves:[
      {date:"2026-05-21",type:"out",player:"Zeven"},
      {date:"2026-06-24",type:"in",player:"Bergman_29"},
      {date:"2026-07-09",type:"in",player:"xRedhawk93",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"Mockingjayyz",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"pastorn!",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"HyDraVenoM92",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"Phyreon",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"deeliice",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"Bergman_29",note:"ut + in i samma rosterpost"},
      {date:"2026-07-09",type:"in",player:"Jompahell!",note:"ut + in i samma rosterpost"},
      {date:"2026-07-23",type:"in",player:"Viiken"},
      {date:"2026-07-31",type:"in",player:"R.kokkonen"},
      {date:"2026-08-07",type:"in",player:"L-sk1y-L"},
      {date:"2026-09-03",type:"in",player:"arfurins"},
      {date:"2026-09-06",type:"out",player:"Viiken"}
    ]},
    { name:"Zero Ping", division:"Nytt", kind:"new", players:["Diizzylicious","jcarlton89","Jungledonk","Prolane"], moves:[
      {date:"2026-06-04",type:"in",player:"jcarlton89"},
      {date:"2026-06-04",type:"in",player:"AG_Jarl"},
      {date:"2026-06-04",type:"in",player:"Jungledonk"},
      {date:"2026-06-04",type:"in",player:"Diizzylicious"},
      {date:"2026-06-17",type:"in",player:"Prolane"},
      {date:"2026-07-23",type:"out",player:"AG_Jarl"}
    ]},
    { name:"Shadow Skulls", logoName:"Shadow skulls", division:"Nytt", kind:"new", players:["benandRhian","FERNA"], moves:[
      {date:"2026-05-23",type:"in",player:"Rospiggen"},
      {date:"2026-05-24",type:"in",player:"benandRhian"},
      {date:"2026-06-05",type:"in",player:"Gurrolito1976"},
      {date:"2026-06-11",type:"out",player:"Gurrolito1976"},
      {date:"2026-06-11",type:"out",player:"Rospiggen",note:"senare N E O N X"},
      {date:"2026-06-25",type:"in",player:"FERNA"},
      {date:"2026-07-26",type:"in",player:"BeJutiFul"},
      {date:"2026-09-06",type:"out",player:"BeJutiFul"}
    ]},
    { name:"Lilmix", division:"Nytt", kind:"new", players:["Brokenrice2000","Curhed","Disctrasan","kax jr","Sallee42"], moves:[
      {date:"2026-08-31",type:"in",player:"Sallee42"},
      {date:"2026-08-31",type:"in",player:"Curhed"},
      {date:"2026-08-31",type:"in",player:"kax jr"},
      {date:"2026-08-31",type:"in",player:"Disctrasan"},
      {date:"2026-08-31",type:"in",player:"Brokenrice2000"}
    ]},
    { name:"Burchurs HC", division:"Nytt", kind:"new", players:["Andre_24x","D4nzk80","IIFaranII","MrWennerstrom","strandis96","Wadde"], moves:[
      {date:"2026-09-03",type:"in",player:"Wadde"},
      {date:"2026-09-03",type:"in",player:"MrWennerstrom"},
      {date:"2026-09-03",type:"in",player:"D4nzk80"},
      {date:"2026-09-03",type:"in",player:"strandis96"},
      {date:"2026-09-03",type:"in",player:"Andre_24x"},
      {date:"2026-09-03",type:"in",player:"IIFaranII"}
    ]},
    { name:"Västerås Vipers", division:"Nytt", kind:"new", players:[], moves:[
      {date:"2026-08-24",type:"in",player:"fimpen_365"},
      {date:"2026-08-24",type:"in",player:"JNHL-_-"},
      {date:"2026-08-24",type:"in",player:"Lunkan_7"},
      {date:"2026-08-24",type:"in",player:"meeskojr_"},
      {date:"2026-09-06",type:"out",player:"meeskojr_"},
      {date:"2026-09-06",type:"out",player:"JNHL-_-"},
      {date:"2026-09-06",type:"out",player:"fimpen_365"},
      {date:"2026-09-06",type:"out",player:"Lunkan_7"}
    ]},
    { name:"VBO Stars", logoName:"VBO STARS", division:"Nytt", kind:"new", players:["KFC Melker"], moves:[
      {date:"2026-08-25",type:"in",player:"KFC Melker"}
    ]},
    { name:"Lila skeppet", division:"Nytt", kind:"new", players:[], moves:[
      {date:"2026-08-11",type:"out",player:"wilhelmsson90"},
      {date:"2026-08-17",type:"out",player:"Bylle67"}
    ]}
  ];

  const FA_TEAM_HINTS = Object.freeze({
    "xd_jacke":"Unwanted",
    "epsych0-":"Sunne IK Esport",
    "liimp_92":"PRIMA",
    "hajjeh37":"AFTERLIFE",
    "meknoxer":"Västerås IK",
    "edluund___":"Invasion Hockey",
    "jnhl-_-":"Västerås Vipers",
    "herrlarsson80":"N E O N X",
    "bejutiful":"Shadow Skulls",
    "sille_":"VBO Stars",
    "wilhelmsson90":"Lila skeppet"
  });

  const DIVISION_ORDER = { Elite:0, Pro:1, Lite:2, Core:3, Neo:4, Nytt:5 };
  const state = { freeAgents: [], search:"", division:"all", status:"all" };
  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  const norm = (value) => String(value ?? "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g," ");
  const compactGt = (value) => norm(value).replace(/[^a-z0-9åäö_-]+/g, "");
  const springCount = () => TEAM_DATA.filter((team)=>team.kind === "spring").length;
  const newCount = () => TEAM_DATA.filter((team)=>team.kind === "new").length;

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
      if (rosterCount === 0 && team.moves.some((m)=>m.type === "in")) return { key:"rebuild", label:"Inga kända spelare kvar", tone:"red" };
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
      "northern ztars hockey":"northern ztars",
      "invasion":"invasion hockey"
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
    return `<div class="ecl27v2-move ecl27v2-move--${move.type}"><span>${typeLabel}</span><strong>${esc(move.player)}</strong>${move.note?`<small>${esc(move.note)}</small>`:""}<time datetime="${esc(move.date)}">${esc(formatDate(move.date))}</time></div>`;
  }

  function renderTeamCard(team) {
    const roster = effectivePlayers(team);
    const fas = freeAgentsForTeam(team);
    const status = statusFor(team, roster.length);
    const logo = logoUrl(team);
    const moves = [...team.moves].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const recent = moves.slice(0,4);
    const incoming = team.moves.filter((m)=>m.type === "in").length;
    const outgoing = team.moves.filter((m)=>m.type === "out").length;
    const source = team.kind === "new" ? "NYTT PROJEKT" : `ECL 26 SPRING · ${team.division}${team.springName&&team.springName!==team.name?` · ${team.springName}`:""}`;
    return `<article class="ecl27v2-card" data-status="${status.key}">
      <div class="ecl27v2-watermark">${logo?`<img src="${logo}" alt="">`:""}</div>
      <header><div class="ecl27v2-logo">${logo?`<img src="${logo}" alt="${esc(team.name)}">`:`<span>${esc(initials(team.name))}</span>`}</div><div><p>${esc(source)}</p><h3>${esc(team.name)}</h3><div class="ecl27v2-badges"><span>${team.kind==="new"?"NYTT":esc(team.division)}</span><b class="is-${status.tone}">${esc(status.label)}</b></div></div></header>
      <div class="ecl27v2-metrics"><div><span>KÄNDA NU</span><strong>${roster.length}</strong></div><div><span>IN</span><strong class="in">${incoming}</strong></div><div><span>UT</span><strong class="out">${outgoing}</strong></div><div><span>FA</span><strong class="fa">${fas.length}</strong></div></div>
      <section class="ecl27v2-roster"><label>KÄND TRUPP JUST NU</label><div>${roster.length?roster.map((p)=>`<span>${esc(p)}</span>`).join(""):`<em>Ingen säker spelare kvar i sammanställningen.</em>`}</div></section>
      ${fas.length?`<section class="ecl27v2-fa"><label>AKTIVA FREE AGENTS</label><div>${fas.map((fa)=>`<span>${esc(fa.display_gamertag)}</span>`).join("")}</div></section>`:""}
      <section class="ecl27v2-moves"><label>SENASTE BEKRÄFTADE RÖRELSER</label>${recent.length?recent.map(renderMove).join(""):`<p>Inga in/ut-poster i underlaget.</p>`}</section>
      ${moves.length>4?`<details><summary>Visa alla ${moves.length} rörelser</summary><div>${moves.map(renderMove).join("")}</div></details>`:""}
    </article>`;
  }

  function allLatestMoves() {
    return TEAM_DATA.flatMap((team)=>team.moves.map((move)=>({...move,team:team.name}))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
  }

  function renderLatestFeed() {
    return allLatestMoves().map((move)=>`<div class="ecl27v2-feed-row"><time>${esc(formatDate(move.date))}</time><b class="${move.type}">${move.type==="in"?"IN":"UT"}</b><strong>${esc(move.player)}</strong><span>${esc(move.team)}</span>${move.note?`<small>${esc(move.note)}</small>`:""}</div>`).join("");
  }

  function sortedTeams() {
    return [...TEAM_DATA].sort((a,b)=>((DIVISION_ORDER[a.division]??99)-(DIVISION_ORDER[b.division]??99))||a.name.localeCompare(b.name,"sv"));
  }

  function filteredTeams() {
    return sortedTeams().filter((team)=>{
      const roster = effectivePlayers(team);
      const status = statusFor(team, roster.length);
      if (state.division!=="all" && team.division!==state.division) return false;
      if (state.status!=="all" && status.key!==state.status) return false;
      if (state.search) {
        const hay = [team.name,team.springName,...roster,...team.moves.map((m)=>m.player)].filter(Boolean).join(" ").toLocaleLowerCase("sv-SE");
        if (!hay.includes(state.search.toLocaleLowerCase("sv-SE"))) return false;
      }
      return true;
    });
  }

  function renderGrid() {
    const host = $("#ecl27v2Grid");
    if (!host) return;
    const teams = filteredTeams();
    host.innerHTML = teams.map(renderTeamCard).join("");
    const result = $("#ecl27v2Result");
    if (result) result.textContent = `${teams.length} av ${TEAM_DATA.length} lag/projekt`;
  }

  function renderFaStrip() {
    const host = $("#ecl27v2FaStrip");
    const count = $("#ecl27v2FaCount");
    if (count) count.textContent = String(state.freeAgents.length || 0);
    if (!host) return;
    if (!state.freeAgents.length) { host.innerHTML = `<span>Hämtar aktiva Free Agents…</span>`; return; }
    const names = state.freeAgents.map((r)=>r.display_gamertag).filter(Boolean).slice(0,16);
    host.innerHTML = `${names.map((n)=>`<span>${esc(n)}</span>`).join("")}<a href="#/free-agents">Visa alla →</a>`;
  }

  function injectStyles() {
    if ($("#ecl27TeamBuildsV2Style")) return;
    const style = document.createElement("style");
    style.id = "ecl27TeamBuildsV2Style";
    style.textContent = `
      .ecl27v2{margin:28px 0 44px;color:#f5f1e8;scroll-margin-top:90px}.ecl27v2 *{box-sizing:border-box}
      .ecl27v2-hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;padding:32px;border:1px solid rgba(214,177,95,.3);border-radius:22px;background:linear-gradient(135deg,#030b14,#071426);box-shadow:0 24px 60px rgba(0,0,0,.22)}
      .ecl27v2-hero h2{margin:4px 0 12px;font-size:clamp(36px,4vw,64px);line-height:.95;letter-spacing:-.04em}.ecl27v2-hero>div>p:last-of-type{max-width:850px;color:#aebdca;line-height:1.6}.ecl27v2-stamp{align-self:center;padding:18px;border:1px solid rgba(214,177,95,.25);border-radius:15px;background:rgba(0,0,0,.22)}.ecl27v2-stamp span,.ecl27v2-stamp small{display:block;color:#7890a4;font-size:10px;font-weight:900;letter-spacing:.1em}.ecl27v2-stamp strong{display:block;margin:6px 0 8px;color:#f0d58b;font-size:18px}
      .ecl27v2-overview{display:grid;grid-template-columns:repeat(4,1fr);margin:14px 0 20px;border:1px solid #172839;border-radius:16px;overflow:hidden;background:#030a12}.ecl27v2-overview>div{padding:18px 20px;border-right:1px solid #172839}.ecl27v2-overview>div:last-child{border-right:0}.ecl27v2-overview span,.ecl27v2-overview small{display:block}.ecl27v2-overview span{color:#57e6dc;font-size:9px;font-weight:950;letter-spacing:.12em}.ecl27v2-overview strong{display:block;margin:5px 0 2px;color:#ffd900;font-size:30px}.ecl27v2-overview small{color:#70869a;font-size:10px}
      .ecl27v2-panel{margin-top:16px;border:1px solid #172839;border-radius:18px;background:#02080e;overflow:hidden}.ecl27v2-head{display:flex;justify-content:space-between;align-items:end;gap:16px;padding:20px 22px;border-bottom:1px solid #172839}.ecl27v2-head h3{margin:3px 0 0;font-size:27px}.ecl27v2-head>span{color:#71879a;font-size:11px}
      .ecl27v2-feed{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#172839}.ecl27v2-feed-row{display:grid;grid-template-columns:48px 32px minmax(90px,.8fr) minmax(100px,1fr);gap:8px;align-items:center;min-height:52px;padding:9px 14px;background:#030a11}.ecl27v2-feed-row time{color:#71879a;font-size:10px}.ecl27v2-feed-row b{display:grid;place-items:center;height:23px;border-radius:5px;font-size:9px}.ecl27v2-feed-row b.in{color:#46e8d2;background:rgba(38,209,177,.1)}.ecl27v2-feed-row b.out{color:#ff7777;background:rgba(255,90,90,.1)}.ecl27v2-feed-row small{grid-column:4;color:#738698}
      .ecl27v2-toolbar{display:grid;grid-template-columns:1.4fr .7fr .8fr;gap:10px;padding:14px;border-bottom:1px solid #172839}.ecl27v2-toolbar label{display:grid;gap:5px;color:#52e4dc;font-size:8px;font-weight:950;letter-spacing:.12em}.ecl27v2-toolbar input,.ecl27v2-toolbar select{height:43px;border:1px solid #203549;border-radius:9px;background:#020811;color:#fff;padding:0 12px}
      .ecl27v2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:14px}.ecl27v2-card{position:relative;overflow:hidden;padding:17px;border:1px solid rgba(214,177,95,.27);border-radius:16px;background:linear-gradient(155deg,#04111d,#02080e)}.ecl27v2-watermark{position:absolute;right:-20px;top:55px;width:150px;height:150px;opacity:.05;filter:grayscale(1)}.ecl27v2-watermark img{width:100%;height:100%;object-fit:contain}.ecl27v2-card header{position:relative;z-index:1;display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center}.ecl27v2-logo{display:grid;place-items:center;width:64px;height:64px;border:1px solid #203549;border-radius:14px;background:#061522;overflow:hidden}.ecl27v2-logo img{width:86%;height:86%;object-fit:contain}.ecl27v2-logo span{color:#e4c56f;font-weight:950}.ecl27v2-card header p{margin:0 0 3px;color:#5de5dd;font-size:8px;font-weight:900;letter-spacing:.1em}.ecl27v2-card h3{margin:0;font-size:24px;line-height:1.05}.ecl27v2-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ecl27v2-badges span,.ecl27v2-badges b{padding:4px 7px;border:1px solid #264056;border-radius:999px;font-size:8px;letter-spacing:.06em}.ecl27v2-badges .is-green{color:#44e6b9;border-color:rgba(68,230,185,.3)}.ecl27v2-badges .is-yellow{color:#f0d58b;border-color:rgba(240,213,139,.3)}.ecl27v2-badges .is-orange{color:#ffb35f;border-color:rgba(255,179,95,.3)}.ecl27v2-badges .is-red{color:#ff7e7e;border-color:rgba(255,126,126,.3)}
      .ecl27v2-metrics{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:15px 0}.ecl27v2-metrics>div{padding:9px;border:1px solid #152b3c;border-radius:9px;background:#030c14}.ecl27v2-metrics span{display:block;color:#6b879a;font-size:7px;font-weight:900}.ecl27v2-metrics strong{display:block;margin-top:4px;font-size:20px}.ecl27v2-metrics .in{color:#45e3c5}.ecl27v2-metrics .out{color:#ff7d7d}.ecl27v2-metrics .fa{color:#ffd75f}
      .ecl27v2-roster label,.ecl27v2-fa label,.ecl27v2-moves label{display:block;margin-bottom:7px;color:#6d879a;font-size:8px;font-weight:950;letter-spacing:.1em}.ecl27v2-roster>div,.ecl27v2-fa>div{display:flex;flex-wrap:wrap;gap:5px}.ecl27v2-roster span,.ecl27v2-fa span{padding:5px 7px;border:1px solid #1c3447;border-radius:6px;background:#05121c;color:#dfe7ed;font-size:9px}.ecl27v2-roster em{color:#778b9c;font-size:10px}.ecl27v2-fa{margin-top:12px;padding:10px;border:1px solid rgba(255,211,79,.22);border-radius:9px;background:rgba(255,211,79,.035)}.ecl27v2-fa span{color:#ffd75f;border-color:rgba(255,211,79,.18)}
      .ecl27v2-moves{margin-top:14px;padding-top:12px;border-top:1px solid #142737}.ecl27v2-move{display:grid;grid-template-columns:28px minmax(80px,1fr) minmax(0,1.1fr) 42px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(24,47,63,.45)}.ecl27v2-move>span{font-size:8px;font-weight:950}.ecl27v2-move--in>span{color:#45e3c5}.ecl27v2-move--out>span{color:#ff7d7d}.ecl27v2-move strong{font-size:10px}.ecl27v2-move small{color:#71879a;font-size:8px}.ecl27v2-move time{color:#61798d;font-size:8px;text-align:right}.ecl27v2-moves>p{color:#738698;font-size:10px}.ecl27v2-card details{margin-top:10px}.ecl27v2-card summary{cursor:pointer;color:#d9bd71;font-size:9px;font-weight:900}
      .ecl27v2-fa-wrap{display:grid;grid-template-columns:220px 1fr;gap:18px;align-items:center;padding:18px 22px}.ecl27v2-fa-wrap h3{margin:3px 0 0}.ecl27v2-fa-strip{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.ecl27v2-fa-strip span,.ecl27v2-fa-strip a{padding:5px 8px;border:1px solid #243a4d;border-radius:999px;color:#b9c8d3;font-size:9px;text-decoration:none}.ecl27v2-fa-strip a{color:#f0d58b;border-color:rgba(214,177,95,.3)}.ecl27v2-method{margin-top:15px;padding:18px 20px;border-left:3px solid #d6b15f;background:#060d14;color:#91a4b4;font-size:11px;line-height:1.55}.ecl27v2-method strong{display:block;margin-bottom:4px;color:#f0d58b}
      @media(max-width:1180px){.ecl27v2-grid{grid-template-columns:repeat(2,1fr)}.ecl27v2-feed{grid-template-columns:1fr}}
      @media(max-width:780px){.ecl27v2-hero{grid-template-columns:1fr;padding:23px}.ecl27v2-overview{grid-template-columns:repeat(2,1fr)}.ecl27v2-overview>div:nth-child(2){border-right:0}.ecl27v2-toolbar{grid-template-columns:1fr}.ecl27v2-grid{grid-template-columns:1fr}.ecl27v2-fa-wrap{grid-template-columns:1fr}.ecl27v2-fa-strip{justify-content:flex-start}.ecl27v2-feed-row{grid-template-columns:42px 30px 1fr}.ecl27v2-feed-row>span{grid-column:3}.ecl27v2-feed-row small{grid-column:3}}
    `;
    document.head.appendChild(style);
  }

  async function loadFreeAgents() {
    const cfg = window.EHOCKEY_CONFIG || window.SEH_CONFIG || {};
    if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabasePublishableKey) return;
    try {
      const sb = window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const {data,error} = await sb.from("v_ehockey_free_agents_public").select("display_gamertag,latest_ecl_team,latest_ecl_division,fa_date").order("fa_date",{ascending:false});
      if (error) throw error;
      state.freeAgents = Array.isArray(data)?data:[];
      renderFaStrip();
      renderGrid();
    } catch (error) { console.warn("ECL 27 lagbyggen: kunde inte hämta Free Agents",error); }
  }

  function mount() {
    if (!String(location.hash||"").startsWith(ROUTE_PREFIX)) return;
    const overview = $("#overview");
    if (!overview) return;
    $("#ecl27TeamBuilds")?.remove();
    if ($("#ecl27TeamBuildsV2")) { renderGrid(); renderFaStrip(); return; }
    injectStyles();
    const section = document.createElement("section");
    section.id = "ecl27TeamBuildsV2";
    section.className = "ecl27v2";
    section.dataset.build = BUILD;
    section.innerHTML = `<header class="ecl27v2-hero"><div><p class="directory-kicker">SILLY SEASON · SVERIGE</p><h2>ECL 27 – Svenska lagbyggen</h2><p>En levande arbetsbild av hur de svenska lagen ser ut inför ECL 27. Vi utgår från ECL ’26 Spring och lägger på bekräftade in/ut-poster. Aktiva Free Agents markeras separat och tas bort från den kända truppen.</p></div><div class="ecl27v2-stamp"><span>SENAST UPPDATERAD</span><strong>${esc(SNAPSHOT_UPDATED)}</strong><small>Transferunderlag + live Free Agents</small></div></header>
      <div class="ecl27v2-overview"><div><span>SPRING-LAG</span><strong>${springCount()}</strong><small>Elite → Neo</small></div><div><span>NYA PROJEKT</span><strong>${newCount()}</strong><small>synliga i silly season</small></div><div><span>AKTIVA FA</span><strong id="ecl27v2FaCount">0</strong><small>hämtas live</small></div><div><span>UNDERLAG</span><strong>${TEAM_DATA.reduce((s,t)=>s+t.moves.length,0)}</strong><small>registrerade rörelser</small></div></div>
      <section class="ecl27v2-panel"><div class="ecl27v2-head"><div><p class="directory-kicker">SENASTE</p><h3>Transferflödet</h3></div><span>Bekräftade rörelser</span></div><div class="ecl27v2-feed">${renderLatestFeed()}</div></section>
      <section class="ecl27v2-panel"><div class="ecl27v2-head"><div><p class="directory-kicker">LAG FÖR LAG</p><h3>Svenska lagbyggen just nu</h3></div><span id="ecl27v2Result">${TEAM_DATA.length} lag/projekt</span></div><div class="ecl27v2-toolbar"><label>SÖK<input id="ecl27v2Search" type="search" placeholder="Lag eller spelare…"></label><label>SPRING-NIVÅ<select id="ecl27v2Division"><option value="all">Alla nivåer</option><option>Elite</option><option>Pro</option><option>Lite</option><option>Core</option><option>Neo</option><option value="Nytt">Nya projekt</option></select></label><label>STATUS<select id="ecl27v2Status"><option value="all">Alla statusar</option><option value="ready">Ser färdigt ut</option><option value="building">På god väg</option><option value="thin">Tunt / bygger</option><option value="rebuild">Kraftigt ombyggt / tidigt</option></select></label></div><div id="ecl27v2Grid" class="ecl27v2-grid"></div></section>
      <section class="ecl27v2-panel ecl27v2-fa-wrap"><div><p class="directory-kicker">FREE AGENTS</p><h3>Spelare på marknaden</h3></div><div id="ecl27v2FaStrip" class="ecl27v2-fa-strip"><span>Hämtar…</span></div></section>
      <aside class="ecl27v2-method"><strong>Arbetsbild – inte officiella ECL 27-rosters</strong>En IN/UT-post räknas som bekräftad rörelse. När en spelare senare bekräftas IN i ett annat lag används det även för att räkna bort spelaren från tidigare känd trupp. Free Agents hämtas live. Statusen bygger bara på hur många spelare vi kan belägga just nu.</aside>`;
    overview.insertAdjacentElement("afterend",section);
    const actions = overview.querySelector(".season-upcoming-actions-v12840");
    if (actions && !actions.querySelector("[data-ecl27v2-jump]")) {
      actions.querySelector("[data-ecl27-builds-jump]")?.remove();
      const button = document.createElement("button");
      button.type="button"; button.dataset.ecl27v2Jump="true"; button.textContent="Svenska lagbyggen →";
      button.addEventListener("click",()=>section.scrollIntoView({behavior:"smooth",block:"start"}));
      actions.prepend(button);
    }
    const search=$("#ecl27v2Search"),division=$("#ecl27v2Division"),status=$("#ecl27v2Status");
    search?.addEventListener("input",()=>{state.search=search.value.trim();renderGrid();});
    division?.addEventListener("change",()=>{state.division=division.value;renderGrid();});
    status?.addEventListener("change",()=>{state.status=status.value;renderGrid();});
    renderGrid(); renderFaStrip(); loadFreeAgents();
  }

  const observer = new MutationObserver(()=>mount());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("hashchange",()=>setTimeout(mount,0));
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(mount,0)); else setTimeout(mount,0);
})();
