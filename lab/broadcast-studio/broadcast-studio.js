(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const COMPETITIONS = {
    520:{id:520,code:"SEC",label:"SEC 21",logo:"../../assets/SECLOGGA.png"},
    524:{id:524,code:"GCL",label:"GCL 13 · DIV I",logo:"https://fhr.fra1.cdn.digitaloceanspaces.com/SportsGamer/leagues/GCL/Season_12/GCL_logo_new_350x350.png"},
    525:{id:525,code:"GCL",label:"GCL 13 · DIV II",logo:"https://fhr.fra1.cdn.digitaloceanspaces.com/SportsGamer/leagues/GCL/Season_12/GCL_logo_new_350x350.png"},
    526:{id:526,code:"GCL",label:"GCL 13 · POKAL",logo:"https://fhr.fra1.cdn.digitaloceanspaces.com/SportsGamer/leagues/GCL/Season_12/GCL_logo_new_350x350.png"},
    527:{id:527,code:"SCL",label:"SCL 27",logo:"https://fhr.fra1.cdn.digitaloceanspaces.com/NHLGamer/Community/uploads/monthly_2021_08/small.SCL_logo_shading.png.f99772ef717dcd328c35b5469ac1cbc2.png"},
    523:{id:523,code:"WECL",label:"WECL",logo:"https://fhr.fra1.cdn.digitaloceanspaces.com/NHLGamer/WECL/WECL_logo.png"},
    529:{id:529,code:"FCL",label:"FCL 27",logo:"https://sportsgamer.gg/community/gallery/image/374-fcl_logopng/?do=download"}
  };
  let activeLeagueId = Number($("#tournament")?.value || 520);
  const competition = () => COMPETITIONS[activeLeagueId] || COMPETITIONS[520];
  const competitionBadge = code => "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112"><path fill="#f4b21b" d="M50 2 96 19 88 88 50 110 12 88 4 19z"/><path fill="#07111a" d="M50 10 87 24 80 82 50 100 20 82 13 24z"/><text x="50" y="64" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="25" fill="#f4b21b">'+code+'</text></svg>');
  const competitionLogo = c => c.logo || competitionBadge(c.code);
  const LOCALE = (document.documentElement.lang || "sv").toLowerCase().split("-")[0];
  const STRINGS = {
    sv:{commentator:"KOMMENTATOR",group:"GRUPP",groupstage:"GRUPPSPEL",playoffs:"SLUTSPEL",goals:"MÅL",goalsPerGame:"MÅL / MATCH",goalsAgainstPerGame:"INSLÄPPT / MATCH",goalDiff:"MÅLSKILLNAD",totalResult:"TOTALT RESULTAT",teamGoals:"LAGMÅL",playerGoals:"SPELARMÅL",mostGoals:"FLERST MÅL",wins:"vinster",series:"serier",matchWins:"matchvinster",dataMissing:"DATA SAKNAS",currentTournament:"AKTUELL TURNERING",liveTournamentData:"Live turneringsdata",testMatch:"FIKTIV TESTMATCH",bronze:"BRONS",seriesState:"SERIELÄGE",winsSeries:"VINNER SERIEN",seriesDone:"SERIEN AVGJORD",nextMatch:"NÄSTA MATCH",matches:"MATCHER",previousMatches:"TIDIGARE MATCHER",selectPlayer:"Välj spelare",teamStats:"Lagstatistik",rosterPlayers:"Trupp/spelare",loading:"laddar…",ready:"klar",empty:"saknas",loadError:"kunde inte laddas",goalie:"MÅLVAKT",defender:"BACK",pointsLeader:"POÄNGLIGAN",roadBronze:"Bronsvägen",roadPlayoffs:"Slutspelsvägen",team:"LAG",notSelected:"EJ VALD",noPlayer:"INGEN SPELARE",noGoalie:"INGEN MÅLVAKT",totalPoints:"POÄNG TOTALT",gamesLower:"matcher",invalidTwitch:"OGILTIG TWITCH-KANAL / URL",fetchingTwitch:"HÄMTAR TWITCH-STRÖM",missingSupabase:"SAKNAR SUPABASE-CONFIG",twitchFetchFail:"KUNDE INTE HÄMTA TWITCH-STRÖM",twitchReady:"TWITCH HLS KLAR",twitchNetwork:"TWITCH RESOLVER NÄTVERKSFEL",twitchRecovering:"TWITCH ÅTERHÄMTAR LIVE",unknown:"okänt",hlsNetworkError:"HLS NÄTVERKSFEL",loadingDirectVideo:"LADDAR DIREKTVIDEO",directVideo:"DIREKTVIDEO"},
    en:{commentator:"COMMENTATOR",group:"GROUP",groupstage:"GROUP STAGE",playoffs:"PLAYOFFS",goals:"GOALS",goalsPerGame:"GOALS / GAME",goalsAgainstPerGame:"GOALS AGAINST / GAME",goalDiff:"GOAL DIFFERENCE",totalResult:"OVERALL RECORD",teamGoals:"TEAM GOALS",playerGoals:"PLAYER GOALS",mostGoals:"MOST GOALS",wins:"wins",series:"series",matchWins:"game wins",dataMissing:"NO DATA",currentTournament:"CURRENT TOURNAMENT",liveTournamentData:"Live tournament data",testMatch:"TEST MATCH",bronze:"BRONZE",seriesState:"SERIES",winsSeries:"WINS THE SERIES",seriesDone:"SERIES COMPLETE",nextMatch:"NEXT GAME",matches:"GAMES",previousMatches:"PREVIOUS GAMES",selectPlayer:"Select player",teamStats:"Team stats",rosterPlayers:"Roster/players",loading:"loading…",ready:"ready",empty:"missing",loadError:"could not load",goalie:"GOALIE",defender:"DEFENSE",pointsLeader:"POINTS LEADER",roadBronze:"Bronze road",roadPlayoffs:"Playoff road",team:"TEAM",notSelected:"NOT SELECTED",noPlayer:"NO PLAYER",noGoalie:"NO GOALIE",totalPoints:"TOTAL POINTS",gamesLower:"games",invalidTwitch:"INVALID TWITCH CHANNEL / URL",fetchingTwitch:"FETCHING TWITCH STREAM",missingSupabase:"SUPABASE CONFIG MISSING",twitchFetchFail:"COULD NOT FETCH TWITCH STREAM",twitchReady:"TWITCH HLS READY",twitchNetwork:"TWITCH RESOLVER NETWORK ERROR",twitchRecovering:"TWITCH RECOVERING LIVE",unknown:"unknown",hlsNetworkError:"HLS NETWORK ERROR",loadingDirectVideo:"LOADING DIRECT VIDEO",directVideo:"DIRECT VIDEO"},
    fi:{commentator:"SELOSTAJA",group:"LOHKO",groupstage:"LOHKOVAIHE",playoffs:"PUDOTUSPELIT",goals:"MAALIT",goalsPerGame:"MAALIT / OTTELU",goalsAgainstPerGame:"PÄÄSTETYT / OTTELU",goalDiff:"MAALIERO",totalResult:"KOKONAISTULOS",teamGoals:"JOUKKUEEN MAALIT",playerGoals:"PELAAJIEN MAALIT",mostGoals:"ENITEN MAALEJA",wins:"voittoa",series:"ottelusarjaa",matchWins:"otteluvoittoa",dataMissing:"EI DATAA",currentTournament:"NYKYINEN TURNAUS",liveTournamentData:"Live-turnausdata",testMatch:"TESTIOTTELU",bronze:"PRONSSI",seriesState:"OTTELUSARJA",winsSeries:"VOITTAA OTTELUSARJAN",seriesDone:"OTTELUSARJA RATKENNUT",nextMatch:"SEURAAVA OTTELU",matches:"OTTELUT",previousMatches:"AIEMMAT OTTELUT",selectPlayer:"Valitse pelaaja",teamStats:"Joukkuetilastot",rosterPlayers:"Kokoonpano/pelaajat",loading:"ladataan…",ready:"valmis",empty:"puuttuu",loadError:"lataus epäonnistui",goalie:"MAALIVAHTI",defender:"PUOLUSTAJA",pointsLeader:"PISTEPÖRSSI",roadBronze:"Tie pronssille",roadPlayoffs:"Pudotuspelitie",team:"JOUKKUE",notSelected:"EI VALITTU",noPlayer:"EI PELAAJAA",noGoalie:"EI MAALIVAHTIA",totalPoints:"PISTEET YHTEENSÄ",gamesLower:"ottelua",invalidTwitch:"VIRHEELLINEN TWITCH-KANAVA / URL",fetchingTwitch:"HAETAAN TWITCH-STRIIMIÄ",missingSupabase:"SUPABASE-ASETUS PUUTTUU",twitchFetchFail:"TWITCH-STRIIMIÄ EI VOITU HAKEA",twitchReady:"TWITCH HLS VALMIS",twitchNetwork:"TWITCH RESOLVER -VERKKOVIRHE",twitchRecovering:"TWITCH PALAUTTAA LIVE-STRIIMIÄ",unknown:"tuntematon",hlsNetworkError:"HLS-VERKKOVIRHE",loadingDirectVideo:"LADATAAN SUORAA VIDEOTA",directVideo:"SUORA VIDEO"},
    de:{commentator:"KOMMENTATOR",group:"GRUPPE",groupstage:"GRUPPENPHASE",playoffs:"PLAYOFFS",goals:"TORE",goalsPerGame:"TORE / SPIEL",goalsAgainstPerGame:"GEGENTORE / SPIEL",goalDiff:"TORDIFFERENZ",totalResult:"GESAMTBILANZ",teamGoals:"TEAMTORE",playerGoals:"SPIELERTORE",mostGoals:"MEISTE TORE",wins:"Siege",series:"Serien",matchWins:"Spielsiege",dataMissing:"KEINE DATEN",currentTournament:"AKTUELLES TURNIER",liveTournamentData:"Live-Turnierdaten",testMatch:"TESTSPIEL",bronze:"BRONZE",seriesState:"SERIENSTAND",winsSeries:"GEWINNT DIE SERIE",seriesDone:"SERIE ENTSCHIEDEN",nextMatch:"NÄCHSTES SPIEL",matches:"SPIELE",previousMatches:"BISHERIGE SPIELE",selectPlayer:"Spieler wählen",teamStats:"Teamstatistik",rosterPlayers:"Kader/Spieler",loading:"lädt…",ready:"bereit",empty:"fehlt",loadError:"konnte nicht geladen werden",goalie:"TORWART",defender:"VERTEIDIGER",pointsLeader:"PUNKTELEADER",roadBronze:"Weg zu Bronze",roadPlayoffs:"Playoff-Weg",team:"TEAM",notSelected:"NICHT GEWÄHLT",noPlayer:"KEIN SPIELER",noGoalie:"KEIN TORWART",totalPoints:"PUNKTE GESAMT",gamesLower:"Spiele",invalidTwitch:"UNGÜLTIGER TWITCH-KANAL / URL",fetchingTwitch:"TWITCH-STREAM WIRD GELADEN",missingSupabase:"SUPABASE-KONFIGURATION FEHLT",twitchFetchFail:"TWITCH-STREAM KONNTE NICHT GELADEN WERDEN",twitchReady:"TWITCH HLS BEREIT",twitchNetwork:"TWITCH-RESOLVER NETZWERKFEHLER",twitchRecovering:"TWITCH STELLT LIVE-STREAM WIEDER HER",unknown:"unbekannt",hlsNetworkError:"HLS-NETZWERKFEHLER",loadingDirectVideo:"DIREKTVIDEO WIRD GELADEN",directVideo:"DIREKTVIDEO"}
  };
  const tx = key => (STRINGS[LOCALE] || STRINGS.sv)[key] ?? STRINGS.sv[key] ?? key;
  const REMOTE_CHANNEL = ({sv:"sec21-bronze-test",en:"broadcast-en",fi:"broadcast-fi",de:"broadcast-de"}[LOCALE] || "sec21-bronze-test");
  const OBS_MODE = new URLSearchParams(location.search).get("obs") === "1";
  if (OBS_MODE) {
    const fitObsPreview = () => document.documentElement.style.setProperty("--obs-preview-scale", String(Math.min(window.innerWidth / 1280, window.innerHeight / 720)));
    fitObsPreview();
    window.addEventListener("resize", fitObsPreview);
  }
  let activeScene = "opening", remoteApplying = false, remoteTimer = 0;
  let displayedLineupSide = "home", sceneTransitionTimer = 0, lineupTransitionTimer = 0;
  const SLOTS = ["LW", "C", "RW", "LD", "G", "RD"];
  // Match identity is editorial. Historical numbers only come from Supabase.
  const SEC_MATCH_TEAMS = [
    { sports_gamer_team_id: 7046, team_name_in_league: "Daankerzquad", team_logo_in_league: "https://sportsgamer.gg/storage/team-logos/520/7046/Daankerzquad_20260610-013637.png" },
    { sports_gamer_team_id: 3252, team_name_in_league: "Västerås IK", team_logo_in_league: "https://sportsgamer.gg/storage/team-logos/520/3252/VIK-prima%CC%88r@4x_20260612-174642.png" }
  ];
  const data = { teams: [], players: [], playoffs: [] };
  const COMMENTATORS = {
    mkine: { name: 'Marko “mkine” Mäkinen', image: '' },
    flacken: { name: 'Peter “Flacken” Novara', image: '../../players/flacken.png' },
    wizrob: { name: 'Robert “Wizrob” Olovsson', image: '../../players/Wizrob.png' }
  };
  const status = { teams: "loading", players: "loading", playoffs: "loading" };
  const lineups = new Map();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const same = (a, b) => String(a) === String(b);
  const number = value => value != null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
  const stat = value => number(value) ?? "–";
  const rate = (n, d, percent = false) => number(n) !== null && number(d) > 0
    ? (percent ? Math.round(100 * Number(n) / Number(d)) + "%" : (Number(n) / Number(d)).toFixed(1)) : "–";
  const total = (a, b) => number(a) === null && number(b) === null ? null : (number(a) ?? 0) + (number(b) ?? 0);
  const logo = t => t.team_logo_in_league || t.current_global_team_logo || "";
  const fallbackTeams = () => activeLeagueId === 520 ? SEC_MATCH_TEAMS : [];
  const team = id => data.teams.find(t => same(t.sports_gamer_team_id, id)) || fallbackTeams().find(t => same(t.sports_gamer_team_id, id)) || { sports_gamer_team_id:id||"", team_name_in_league:tx("team") };
  const selectedTeam = side => team($("#" + side).value);
  const roster = t => data.players.filter(p => same(p.sports_gamer_team_id, t.sports_gamer_team_id));
  const position = p => p.playoff_skater_position_abbreviation || p.regular_skater_position_abbreviation || p.roster_preferred_position_abbreviation || ((p.playoff_goalie_games || p.regular_goalie_games) ? "G" : "");
  const stage = (t, name) => data.teams.find(r => same(r.sports_gamer_team_id, t.sports_gamer_team_id) && r.statistics_stage === name) || {};
  const playoff = t => data.playoffs.find(r => same(r.sports_gamer_team_id, t.sports_gamer_team_id)) || {};

  const portraitFiles = new Set(window.SEH_PLAYER_IMAGE_FILES || []);
  const playerImage = p => p.player_image || "../../players/" + (portraitFiles.has(p.sports_gamer_player_id + ".png") ? p.sports_gamer_player_id + ".png" : "1DEFAULTBILDID.png");

  function image(src) {
    return src ? '<img src="' + esc(src) + '" alt="">' : '<div class="sil">?</div>';
  }

  function fill(selector, t) {
    $$(selector).forEach(el => {
      const img = el.querySelector("img");
      if (img) {
        const src = logo(t);
        img.hidden = !src;
        if (src && img.getAttribute("src") !== src) img.src = src;
        if (!src) img.removeAttribute("src");
        img.alt = "";
      }
      const label = el.querySelector("b");
      if (label) label.textContent = t.team_name_in_league;
    });
  }

  function renderTeams() {
    const unique = [...new Map([...fallbackTeams(), ...data.teams].map(t => [String(t.sports_gamer_team_id), t])).values()]
      .sort((a, b) => String(a.team_name_in_league||"").localeCompare(String(b.team_name_in_league||""), "sv"));
    ["home","away"].forEach((side,index)=>{
      const select=$("#"+side), previous=select.value;
      select.replaceChildren(...unique.map(t=>new Option(t.team_name_in_league,String(t.sports_gamer_team_id))));
      if(previous && unique.some(t=>same(t.sports_gamer_team_id,previous))) select.value=previous;
      else if(unique.length) select.value=String((unique[index]||unique[0]).sports_gamer_team_id);
    });
    if($("#home").value && $("#away").value && $("#home").value===$("#away").value && unique.length>1){
      const other=unique.find(t=>!same(t.sports_gamer_team_id,$("#home").value));
      if(other)$("#away").value=String(other.sports_gamer_team_id);
    }
    renderMatch();
  }

  function renderCommentators() {
    const ids = ["commentator1","commentator2"].map(id => $("#" + id)?.value).filter(Boolean);
    const people = ids.map(id => COMMENTATORS[id]).filter(Boolean);
    $("#openingCommentators").innerHTML = people.map(c =>
      '<div class="opening-commentator">' +
      (c.image ? '<img src="' + esc(c.image) + '" alt="">' : '<div class="commentator-placeholder">MIC</div>') +
      '<div><small>'+esc(tx("commentator"))+'</small><b>' + esc(c.name) + '</b></div></div>'
    ).join("");
  }

  function renderMatch() {
    fill(".homeTeam", selectedTeam("home"));
    fill(".awayTeam", selectedTeam("away"));
    $("#topTitle").textContent = $("#headline").value;
    $("#topSub").textContent = $("#subline").value;
    $("#homeScore").textContent = $("#hs").value || "0";
    $("#awayScore").textContent = $("#as").value || "0";
    $("#personOut").textContent = $("#person").value;
    $("#roleOut").textContent = $("#role").value;
    renderCommentators();
  }

  function lineupFor(side) {
    const t = selectedTeam(side);
    const key = side + ":" + t.sports_gamer_team_id;
    if (lineups.has(key)) return lineups.get(key);
    const ps = roster(t);
    const result = Object.fromEntries(SLOTS.map(slot => [slot, ""]));
    // Do not cache an empty roster while its independent request is pending.
    if (!ps.length) return result;
    const used = new Set();
    const candidates = slot => [...ps].sort((a, b) => {
      const games = p => slot === "G" ? (p.playoff_goalie_games || 0) : (p.playoff_skater_games || 0);
      const regular = p => slot === "G" ? (p.regular_goalie_games || 0) : (p.regular_skater_games || 0);
      return games(b) - games(a) || regular(b) - regular(a) || (b.playoff_points || 0) - (a.playoff_points || 0);
    });
    const assign = (slot, p) => {
      if (!p) return;
      result[slot] = String(p.sports_gamer_player_id);
      used.add(result[slot]);
    };
    // Reserve exact positions first so a missing winger cannot consume the goalie.
    SLOTS.forEach(slot => assign(slot, candidates(slot).find(p => position(p) === slot && !used.has(String(p.sports_gamer_player_id)))));
    SLOTS.filter(slot => !result[slot]).forEach(slot => assign(slot, candidates(slot).find(p => !used.has(String(p.sports_gamer_player_id)) && (slot === "G" ? position(p) === "G" : position(p) !== "G"))));
    lineups.set(key, result);
    return result;
  }

  function renderLineup() {
    const side = $("#lineupSide").value;
    const t = selectedTeam(side), ps = roster(t), lineup = lineupFor(side);
    $("#lineupTeam").textContent = t.team_name_in_league;
    const lineupLogo = $("#lineupTeamLogo");
    const lineupLogoUrl = logo(t);
    lineupLogo.src = lineupLogoUrl;
    lineupLogo.alt = t.team_name_in_league || "";
    lineupLogo.style.display = lineupLogoUrl ? "" : "none";
    $("#lineupEditors").innerHTML = SLOTS.map(slot => '<label>' + slot + '<select data-lineup-slot="' + slot + '"' + (!ps.length ? " disabled" : "") + '><option value="">'+esc(tx("selectPlayer"))+'</option>' + ps.map(p => '<option value="' + esc(p.sports_gamer_player_id) + '"' + (same(lineup[slot], p.sports_gamer_player_id) ? " selected" : "") + '>' + esc(p.display_gamertag) + ' · ' + esc(position(p) || "–") + '</option>').join("") + '</select></label>').join("");
    $(".players").innerHTML = SLOTS.map(slot => {
      const p = ps.find(p => same(p.sports_gamer_player_id, lineup[slot]));
      if (!p) return '<div class="player empty"><span>' + slot + '</span><div class="sil">?</div><b>'+esc(tx("notSelected"))+'</b></div>';
      return '<div class="player"><span>' + slot + '</span>' + image(playerImage(p)) + '<div class="player-info"><strong>#' + esc(p.player_number ?? "") + ' ' + esc(p.display_gamertag) + '</strong><small>'+esc(tx("group"))+' ' + stat(p.regular_points) + ' P · '+esc(tx("playoffs"))+' ' + stat(p.playoff_points) + ' P</small></div></div>';
    }).join("");
  }

  function renderStats() {
    const h = selectedTeam("home"), a = selectedTeam("away");
    const hr = stage(h, "regular"), ar = stage(a, "regular"), hp = stage(h, "playoffs"), ap = stage(a, "playoffs");
    const rows = [
      [rate(hr.total_wins, hr.games_played, true), rate(ar.total_wins, ar.games_played, true), tx("group")+" WIN RATE"],
      [rate(hr.goals_for, hr.games_played), rate(ar.goals_for, ar.games_played), tx("group")+" "+tx("goalsPerGame")],
      [rate(hp.total_wins, hp.games_played, true), rate(ap.total_wins, ap.games_played, true), tx("playoffs")+" WIN RATE"],
      [stat(hp.goals_for), stat(ap.goals_for), tx("playoffs")+" "+tx("goals")]
    ];
    $(".statrows").innerHTML = rows.map(r => '<div><b>' + r[0] + '</b><span>' + r[2] + '</span><b>' + r[1] + '</b></div>').join("");
  }

  function renderTable() {
    const selected = new Set([String(selectedTeam("home").sports_gamer_team_id), String(selectedTeam("away").sports_gamer_team_id)]);
    const rows = data.teams.filter(r => r.statistics_stage === "regular")
      .sort((a,b)=>(number(b.table_points)??0)-(number(a.table_points)??0) || (number(b.goal_difference)??0)-(number(a.goal_difference)??0) || (number(b.goals_for)??0)-(number(a.goals_for)??0));
    $("#broadcastTable").innerHTML = '<div class="bt-head"><span>#</span><span>'+esc(tx("team"))+'</span><span>GP</span><span>W</span><span>L</span><span>GD</span><span>PTS</span></div>'+rows.map((r,i)=>'<div class="bt-row '+(selected.has(String(r.sports_gamer_team_id))?"selected":"")+'"><b>'+(i+1)+'</b><span class="bt-team">'+(logo(r)?'<img src="'+esc(logo(r))+'" alt="">':"")+'<strong>'+esc(r.team_name_in_league)+'</strong></span><span>'+stat(r.games_played)+'</span><span>'+stat(r.total_wins)+'</span><span>'+stat(r.losses)+'</span><span>'+((number(r.goal_difference)??0)>0?"+":"")+stat(r.goal_difference)+'</span><b>'+stat(r.table_points)+'</b></div>').join("");
  }
  function renderTeamCompare() {
    const sides=["home","away"].map(side=>({side,t:selectedTeam(side)}));
    const vals=(x,key)=>{const r=stage(x.t,"regular"),p=stage(x.t,"playoffs"); if(key==="WIN%") return [rate(r.total_wins,r.games_played,true),rate(p.total_wins,p.games_played,true)]; if(key==="GF/G") return [rate(r.goals_for,r.games_played),rate(p.goals_for,p.games_played)]; if(key==="GA/G") return [rate(r.goals_against,r.games_played),rate(p.goals_against,p.games_played)]; return [stat(r[key]),stat(p[key])];};
    const rows=[["WIN%","WIN%"],["GF/G",tx("goalsPerGame")],["GA/G",tx("goalsAgainstPerGame")],["goal_difference",tx("goalDiff")]];
    const sideHead=x=>'<div class="tc-team">'+(logo(x.t)?'<img src="'+esc(logo(x.t))+'" alt="">':"")+'<b>'+esc(x.t.team_name_in_league)+'</b></div>';
    $("#teamCompare").innerHTML=sideHead(sides[0])+'<div class="tc-center"><div class="tc-cols"><span>'+tx("group")+'</span><span>'+tx("playoffs")+'</span><i></i><span>'+tx("group")+'</span><span>'+tx("playoffs")+'</span></div>'+rows.map(r=>{const a=vals(sides[0],r[0]),b=vals(sides[1],r[0]);return '<div class="tc-row"><b>'+a[0]+'</b><b>'+a[1]+'</b><span>'+r[1]+'</span><b>'+b[0]+'</b><b>'+b[1]+'</b></div>'}).join("")+'</div>'+sideHead(sides[1]);
  }
  function renderScorers() {
    const card=side=>{const t=selectedTeam(side), ps=roster(t).filter(p=>(total(p.regular_skater_games,p.playoff_skater_games)??0)>0).sort((a,b)=>(total(b.regular_points,b.playoff_points)??0)-(total(a.regular_points,a.playoff_points)??0)).slice(0,3);
      return '<div class="scorer-side"><div class="scorer-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div>'+ps.map((p,i)=>'<div class="scorer"><strong>'+(i+1)+'</strong>'+image(playerImage(p))+'<div><b>'+esc(p.display_gamertag)+'</b><small>'+esc(position(p)||"")+' · #'+esc(p.player_number??"")+'</small></div><span>'+stat(total(p.regular_goals,p.playoff_goals))+' G</span><span>'+stat(total(p.regular_assists,p.playoff_assists))+' A</span><em>'+stat(total(p.regular_points,p.playoff_points))+' P</em></div>').join("")+'</div>'};
    $("#scorerGrid").innerHTML=card("home")+card("away");
  }

  function teamTotals(t) {
    const r=stage(t,"regular"), p=stage(t,"playoffs");
    return {gp:(number(r.games_played)??0)+(number(p.games_played)??0),w:(number(r.total_wins)??0)+(number(p.total_wins)??0),l:(number(r.losses)??0)+(number(p.losses)??0),gf:(number(r.goals_for)??0)+(number(p.goals_for)??0),ga:(number(r.goals_against)??0)+(number(p.goals_against)??0)};
  }
  function renderFormGuide() {
    const card=side=>{const t=selectedTeam(side),r=stage(t,"regular"),p=stage(t,"playoffs"),x=teamTotals(t), gd=x.gf-x.ga;
      return '<div class="form-card"><div class="form-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div><div class="form-record"><strong>'+x.w+'–'+x.l+'</strong><span>'+tx("totalResult")+'</span></div><div class="form-stats"><div><b>'+stat(r.total_wins)+'–'+stat(r.losses)+'</b><span>'+tx("groupstage")+'</span></div><div><b>'+stat(p.total_wins)+'–'+stat(p.losses)+'</b><span>'+tx("playoffs")+'</span></div><div><b>'+x.gf+'–'+x.ga+'</b><span>'+tx("goals")+'</span></div><div><b>'+(gd>0?"+":"")+gd+'</b><span>'+tx("goalDiff")+'</span></div></div></div>'};
    $("#formGrid").innerHTML=card("home")+card("away");
  }
  function renderOffense() {
    const card=side=>{const t=selectedTeam(side),ps=roster(t).filter(p=>(total(p.regular_skater_games,p.playoff_skater_games)??0)>0),x=teamTotals(t);
      const goals=ps.reduce((s,p)=>s+(total(p.regular_goals,p.playoff_goals)??0),0), assists=ps.reduce((s,p)=>s+(total(p.regular_assists,p.playoff_assists)??0),0);
      const top=[...ps].sort((a,b)=>(total(b.regular_goals,b.playoff_goals)??0)-(total(a.regular_goals,a.playoff_goals)??0))[0];
      return '<div class="off-card"><div class="off-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div><div class="off-big"><b>'+rate(x.gf,x.gp)+'</b><span>'+tx("goalsPerGame")+'</span></div><div class="off-row"><div><b>'+x.gf+'</b><span>'+tx("teamGoals")+'</span></div><div><b>'+goals+'</b><span>'+tx("playerGoals")+'</span></div><div><b>'+assists+'</b><span>ASSISTS</span></div></div>'+(top?'<div class="off-top">'+image(playerImage(top))+'<span><small>'+tx("mostGoals")+'</small><b>'+esc(top.display_gamertag)+'</b></span><strong>'+stat(total(top.regular_goals,top.playoff_goals))+' G</strong></div>':"")+'</div>'};
    $("#offenseGrid").innerHTML=card("home")+card("away");
  }
  function renderDefenseLeaders() {
    const card=side=>{const t=selectedTeam(side),ps=roster(t).filter(p=>/^(LD|RD|D)$/i.test(position(p))).sort((a,b)=>(total(b.regular_points,b.playoff_points)??0)-(total(a.regular_points,a.playoff_points)??0)).slice(0,3);
      return '<div class="lb-side"><div class="lb-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div>'+ps.map((p,i)=>'<div class="lb-player"><strong>'+(i+1)+'</strong>'+image(playerImage(p))+'<div><b>'+esc(p.display_gamertag)+'</b><small>'+esc(position(p))+' · #'+esc(p.player_number??"")+'</small></div><span>'+stat(total(p.regular_goals,p.playoff_goals))+' G</span><span>'+stat(total(p.regular_assists,p.playoff_assists))+' A</span><em>'+stat(total(p.regular_points,p.playoff_points))+' P</em></div>').join("")+'</div>'};
    $("#defenseLeaderGrid").innerHTML=card("home")+card("away");
  }
  function renderGoalieLeaders() {
    const card=side=>{const t=selectedTeam(side),ps=roster(t).filter(p=>(total(p.regular_goalie_games,p.playoff_goalie_games)??0)>0).sort((a,b)=>(total(b.regular_goalie_games,b.playoff_goalie_games)??0)-(total(a.regular_goalie_games,a.playoff_goalie_games)??0)).slice(0,3);
      return '<div class="lb-side goalie-lb"><div class="lb-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div>'+ps.map((p,i)=>{const rg=number(p.regular_goalie_games)??0,pg=number(p.playoff_goalie_games)??0,rs=number(p.regular_goalie_save_percentage),psv=number(p.playoff_goalie_save_percentage),den=rg+pg,sv=den&&((rs!==null?rs*rg:0)+(psv!==null?psv*pg:0))/den;return '<div class="lb-player"><strong>'+(i+1)+'</strong>'+image(playerImage(p))+'<div><b>'+esc(p.display_gamertag)+'</b><small>G · #'+esc(p.player_number??"")+'</small></div><span>'+stat(den)+' GP</span><span>'+goaliePct(sv)+' SV%</span><em>'+stat(total(p.regular_goalie_shutouts,p.playoff_goalie_shutouts))+' SO</em></div>'}).join("")+'</div>'};
    $("#goalieLeaderGrid").innerHTML=card("home")+card("away");
  }

  function renderRoad() {
    $("#roadGrid").innerHTML = ["home", "away"].map(side => {
      const t = selectedTeam(side), r = stage(t, "regular"), po = playoff(t);
      return '<div class="road-card"><div class="road-team">' + (logo(t) ? image(logo(t)) : "") + '<b>' + esc(t.team_name_in_league) + '</b></div><div class="road-step"><small>' + tx("groupstage") + '</small><strong>#' + stat(po.regular_season_seed) + '</strong><span>' + stat(r.total_wins) + ' ' + tx("wins") + ' · ' + stat(r.goals_for) + '–' + stat(r.goals_against) + '</span></div><i></i><div class="road-step"><small>' + tx("playoffs") + ' · ' + esc(po.playoff_round_name || tx("dataMissing")) + '</small><strong>' + stat(po.series_won) + '–' + stat(po.series_lost) + ' ' + tx("series") + '</strong><span>' + stat(po.matched_playoff_game_wins) + ' ' + tx("matchWins") + '</span></div><i></i><div class="road-step final"><small>' + (activeLeagueId===520?tx("testMatch"):tx("currentTournament")) + '</small><strong>' + (activeLeagueId===520?tx("bronze"):tx("playoffs")) + '</strong><span>' + (activeLeagueId===520?tx("dataMissing"):tx("liveTournamentData")) + '</span></div></div>';
    }).join("");
  }

  function renderLeaders() {
    const playerPoints = p => total(p.regular_points, p.playoff_points) ?? 0;
    const playerGoals = p => total(p.regular_goals, p.playoff_goals) ?? 0;
    const goalieGames = p => total(p.regular_goalie_games, p.playoff_goalie_games) ?? 0;
    const goalieSave = p => {
      const rg = number(p.regular_goalie_games) ?? 0, pg = number(p.playoff_goalie_games) ?? 0;
      const rs = number(p.regular_goalie_save_percentage), ps = number(p.playoff_goalie_save_percentage);
      const parts = [[rs, rg], [ps, pg]].filter(([sv, gp]) => sv !== null && gp > 0);
      return parts.length ? parts.reduce((sum,[sv,gp]) => sum + sv * gp, 0) / parts.reduce((sum,[,gp]) => sum + gp, 0) : null;
    };
    const pickForTeam = side => {
      const t = selectedTeam(side);
      const ps = data.players.filter(p => same(p.sports_gamer_team_id, t.sports_gamer_team_id));
      const selectedIds = new Set(Object.values(lineupFor(side)).filter(Boolean).map(String));
      const lineupPlayers = ps.filter(p => selectedIds.has(String(p.sports_gamer_player_id)));
      const eligible = lineupPlayers.length ? lineupPlayers : ps;
      const skaters = eligible.filter(p => ((p.regular_skater_games || 0) + (p.playoff_skater_games || 0) > 0));
      const top = [...skaters].sort((a,b) => playerPoints(b) - playerPoints(a))[0];
      const candidates = skaters.filter(p => p !== top);
      const defenders = candidates.filter(p => /^(LD|RD|D)$/i.test(position(p)));
      const bestD = [...defenders].sort((a,b) => (playerGoals(b)*4 + playerPoints(b)) - (playerGoals(a)*4 + playerPoints(a)))[0];
      const standoutD = bestD && (playerGoals(bestD) >= 3 || playerPoints(bestD) >= Math.max(10, playerPoints(top) * 0.65)) ? bestD : null;
      const goalies = eligible.filter(p => goalieGames(p) >= 3 && goalieSave(p) !== null && goalieSave(p) >= 0.82).sort((a,b) => goalieSave(b) - goalieSave(a));
      let special = goalies[0] || standoutD || [...candidates].sort((a,b) => playerPoints(b) - playerPoints(a))[0];
      if (special === top) special = candidates[0];
      return [top && {p:top, reason:tx("pointsLeader")}, special && {p:special, reason: goalies[0] === special ? tx("goalie") : standoutD === special ? tx("defender") : tx("pointsLeader")}]
        .filter(Boolean).map(x => ({...x.p, team_name_in_league:t.team_name_in_league, watch_reason:x.reason, watch_save:goalieSave(x.p)}));
    };
    const leaders = ["home","away"].flatMap(pickForTeam);
    $("#leaderGrid").innerHTML = leaders.length ? leaders.map(p => {
      const isGoalie = p.watch_reason === tx("goalie");
      const main = isGoalie && p.watch_save !== null
        ? (p.watch_save * (p.watch_save <= 1 ? 100 : 1)).toFixed(1).replace(".", ",") + "% SV · " + stat(total(p.regular_goalie_shutouts,p.playoff_goalie_shutouts)) + " SO"
        : stat(playerGoals(p)) + " G · " + stat(total(p.regular_assists,p.playoff_assists)) + " A · <strong>" + stat(playerPoints(p)) + " P</strong>";
      const detail = isGoalie ? stat(goalieGames(p)) + " " + tx("gamesLower") : tx("group") + " " + stat(p.regular_points) + " · " + tx("playoffs") + " " + stat(p.playoff_points);
      const team = SEC_MATCH_TEAMS.find(t => same(t.sports_gamer_team_id, p.sports_gamer_team_id)) || {};
      const teamLogo = logo(team);
      return '<div class="leader-card">' + image(playerImage(p)) + '<div class="leader-copy">' + (teamLogo ? '<img class="leader-team-logo" src="' + esc(teamLogo) + '" alt="">' : '') + '<small>' + esc(p.team_name_in_league) + ' · ' + esc(p.watch_reason) + '</small><b>' + esc(p.display_gamertag) + '</b><span>' + main + '</span><em>' + detail + '</em></div></div>';
    }).join("") : '<p>'+tx("rosterPlayers")+': '+tx("empty")+'.</p>';
  }

  function lineupPlayer(side, slot) {
    const t = selectedTeam(side), id = lineupFor(side)[slot];
    return roster(t).find(p => same(p.sports_gamer_player_id, id));
  }
  function faceoffPct(p, stageName) {
    const w = number(p[stageName + "_faceoff_wins"]) ?? 0, l = number(p[stageName + "_faceoff_losses"]) ?? 0;
    return w + l ? (100 * w / (w + l)).toFixed(1).replace(".", ",") : "–";
  }
  function goaliePct(v) {
    const n = number(v); if (n === null) return "–";
    return (n * (n <= 1 ? 100 : 1)).toFixed(1).replace(".", ",");
  }
  function matchupCard(side, slot, kind) {
    const t = selectedTeam(side), p = lineupPlayer(side, slot);
    if (!p) return '<div class="role-card empty"><b>' + slot + '</b><span>'+esc(tx("notSelected"))+'</span></div>';
    let rows;
    if (kind === "goalie") rows = [
      ["GP", stat(p.regular_goalie_games), stat(p.playoff_goalie_games)],
      ["SV%", goaliePct(p.regular_goalie_save_percentage), goaliePct(p.playoff_goalie_save_percentage)],
      ["GAA", stat(p.regular_goalie_goals_against_average), stat(p.playoff_goalie_goals_against_average)],
      ["SO", stat(p.regular_goalie_shutouts), stat(p.playoff_goalie_shutouts)]
    ];
    else {
      rows = [["GP",stat(p.regular_skater_games),stat(p.playoff_skater_games)]];
      if (kind === "center") rows.push(["FO%",faceoffPct(p,"regular"),faceoffPct(p,"playoff")]);
      rows.push(["G",stat(p.regular_goals),stat(p.playoff_goals)],["A",stat(p.regular_assists),stat(p.playoff_assists)],["P",stat(p.regular_points),stat(p.playoff_points)],["PIM",stat(p.regular_penalty_minutes),stat(p.playoff_penalty_minutes)]);
    }
    return '<div class="role-card">' + image(playerImage(p)) + '<div class="role-info"><div class="role-team">' + (logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"") + '<small>'+esc(t.team_name_in_league)+'</small></div><strong>'+slot+' #'+esc(p.player_number ?? "")+' · '+esc(p.display_gamertag)+'</strong><div class="role-head"><i></i><b>'+tx("group")+'</b><b>'+tx("playoffs")+'</b></div>'+rows.map(r=>'<div class="role-stat"><span>'+r[0]+'</span><b>'+r[1]+'</b><b>'+r[2]+'</b></div>').join("")+'</div></div>';
  }
  function bestLineupSkater(side) {
    return ["LW","C","RW","LD","RD"].map(slot => ({slot,p:lineupPlayer(side,slot)})).filter(x=>x.p)
      .sort((a,b)=>(total(b.p.regular_points,b.p.playoff_points)??0)-(total(a.p.regular_points,a.p.playoff_points)??0))[0];
  }
  function keyCard(side) {
    const x=bestLineupSkater(side);
    return x ? matchupCard(side,x.slot,x.slot==="C"?"center":"skater") : '<div class="role-card empty"><span>'+esc(tx("noPlayer"))+'</span></div>';
  }
  function spotlightHtml() {
    const h=bestLineupSkater("home"), a=bestLineupSkater("away");
    const x=[h&&{...h,side:"home"},a&&{...a,side:"away"}].filter(Boolean)
      .sort((x,y)=>(total(y.p.regular_points,y.p.playoff_points)??0)-(total(x.p.regular_points,x.p.playoff_points)??0))[0];
    if(!x) return '<div class="role-card empty"><span>'+esc(tx("noPlayer"))+'</span></div>';
    const p=x.p,t=selectedTeam(x.side), pts=total(p.regular_points,p.playoff_points), goals=total(p.regular_goals,p.playoff_goals), assists=total(p.regular_assists,p.playoff_assists);
    return '<div class="spotlight-player">'+image(playerImage(p))+'<div class="spotlight-copy"><div class="eyebrow">PLAYER SPOTLIGHT</div><div class="spotlight-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<span>'+esc(t.team_name_in_league)+'</span></div><h2>'+esc(p.display_gamertag)+'</h2><h3>'+x.slot+' · #'+esc(p.player_number??"")+'</h3><div class="spotlight-total"><b>'+stat(pts)+'</b><span>'+esc(tx("totalPoints"))+'</span></div><div class="spotlight-stats"><div><b>'+stat(goals)+'</b><span>'+esc(tx("goals"))+'</span></div><div><b>'+stat(assists)+'</b><span>ASSISTS</span></div><div><b>'+stat(p.regular_points)+'</b><span>'+tx("groupstage")+' P</span></div><div><b>'+stat(p.playoff_points)+'</b><span>'+tx("playoffs")+' P</span></div><div><b>'+stat(total(p.regular_penalty_minutes,p.playoff_penalty_minutes))+'</b><span>PIM TOTAL</span></div></div></div></div>';
  }
  function renderRoleMatchups() {
    $("#forwardsGrid").innerHTML = ["home","away"].flatMap(side=>["LW","C","RW"].map(slot=>matchupCard(side,slot,slot==="C"?"center":"skater"))).join("");
    $("#defenseGrid").innerHTML = matchupCard("home","LD","skater")+matchupCard("home","RD","skater")+matchupCard("away","LD","skater")+matchupCard("away","RD","skater");
    const goalieSide = side => {
      const t = selectedTeam(side), p = lineupPlayer(side, "G");
      if (!p) return { side, t, p: null };
      return { side, t, p };
    };
    const gh = goalieSide("home"), ga = goalieSide("away");
    const goalieVal = (x, key) => x.p ? (key === "sv" ? goaliePct(x.p.regular_goalie_save_percentage) : key === "psv" ? goaliePct(x.p.playoff_goalie_save_percentage) : stat(x.p[key])) : "–";
    const goaliePortrait = x => x.p ? '<div class="goalie-person goalie-'+x.side+'">'+image(playerImage(x.p))+'<div class="goalie-name">'+(logo(x.t)?'<img src="'+esc(logo(x.t))+'" alt="">':"")+'<span><b>G #'+esc(x.p.player_number ?? "")+' · '+esc(x.p.display_gamertag)+'</b><small>'+esc(x.t.team_name_in_league)+'</small></span></div></div>' : '<div class="goalie-person empty"><span>'+esc(tx("noGoalie"))+'</span></div>';
    const goalieRows = [
      ["GP","regular_goalie_games","playoff_goalie_games"],
      ["SV%","sv","psv"],
      ["GAA","regular_goalie_goals_against_average","playoff_goalie_goals_against_average"],
      ["SO","regular_goalie_shutouts","playoff_goalie_shutouts"]
    ];
    $("#goaliesGrid").innerHTML = goaliePortrait(gh)+'<div class="goalie-center"><div class="goalie-center-title">GOALIE MATCHUP</div><div class="goalie-columns"><span>'+esc(tx("group"))+'</span><span>'+esc(tx("playoffs"))+'</span><i></i><span>'+esc(tx("group"))+'</span><span>'+esc(tx("playoffs"))+'</span></div>'+goalieRows.map(r=>'<div class="goalie-row"><b>'+goalieVal(gh,r[1])+'</b><b>'+goalieVal(gh,r[2])+'</b><span>'+r[0]+'</span><b>'+goalieVal(ga,r[1])+'</b><b>'+goalieVal(ga,r[2])+'</b></div>').join("")+'</div>'+goaliePortrait(ga);
    const kh=bestLineupSkater("home"), ka=bestLineupSkater("away");
    const keySide=(side,x)=>({side,t:selectedTeam(side),slot:x?.slot||"",p:x?.p||null});
    const kHome=keySide("home",kh), kAway=keySide("away",ka);
    const keyPortrait=x=>x.p?'<div class="key-person key-'+x.side+'">'+image(playerImage(x.p))+'<div class="key-name">'+(logo(x.t)?'<img src="'+esc(logo(x.t))+'" alt="">':"")+'<span><b>'+esc(x.slot)+' #'+esc(x.p.player_number??"")+' · '+esc(x.p.display_gamertag)+'</b><small>'+esc(x.t.team_name_in_league)+'</small></span></div></div>':'<div class="key-person empty"><span>'+esc(tx("noPlayer"))+'</span></div>';
    const keyValue=(x,key,stageName)=>{if(!x.p)return "–";if(key==="FO%")return x.slot==="C"?faceoffPct(x.p,stageName):"–";const prefix=stageName==="regular"?"regular_":"playoff_";return stat(x.p[prefix+key]);};
    const keyRows=[["GP","skater_games"],["FO%","FO%"],["G","goals"],["A","assists"],["P","points"]];
    $("#keyGrid").innerHTML=keyPortrait(kHome)+'<div class="key-center"><div class="key-center-title">KEY MATCHUP</div><div class="key-columns"><span>'+esc(tx("group"))+'</span><span>'+esc(tx("playoffs"))+'</span><i></i><span>'+esc(tx("group"))+'</span><span>'+esc(tx("playoffs"))+'</span></div>'+keyRows.map(r=>'<div class="key-row"><b>'+keyValue(kHome,r[1],"regular")+'</b><b>'+keyValue(kHome,r[1],"playoff")+'</b><span>'+r[0]+'</span><b>'+keyValue(kAway,r[1],"regular")+'</b><b>'+keyValue(kAway,r[1],"playoff")+'</b></div>').join("")+'</div>'+keyPortrait(kAway);
    $("#spotlightCard").innerHTML = spotlightHtml();
  }

  function applyCompetitionChrome(resetHeadline=false) {
    const c=competition(), logoSrc=competitionLogo(c);
    document.querySelectorAll(".event-logo img").forEach(img=>{img.src=logoSrc;img.alt=c.code;img.hidden=false;});
    if($("#tableKicker"))$("#tableKicker").textContent=c.label+" · "+(activeLeagueId===526?"POKAL":tx("groupstage"));
    if($("#leadersKicker"))$("#leadersKicker").textContent=c.label+" · "+tx("groupstage")+" + "+tx("playoffs");
    const bronze=activeLeagueId===520;
    if($("#roadKicker"))$("#roadKicker").textContent=(bronze?tx("roadBronze"):tx("roadPlayoffs")).toLocaleUpperCase(LOCALE);
    if($("#roadTitle"))$("#roadTitle").textContent=bronze?(LOCALE==="sv"?"VÄGEN TILL BRONSMATCHEN":tx("roadBronze").toLocaleUpperCase(LOCALE)):(LOCALE==="sv"?"VÄGEN GENOM SLUTSPELET":tx("roadPlayoffs").toLocaleUpperCase(LOCALE));
    if($("#roadSceneButton"))$("#roadSceneButton").textContent=bronze?tx("roadBronze"):tx("roadPlayoffs");
    if(resetHeadline&&$("#headline"))$("#headline").value=c.label;
  }

  function renderAllCompetitionData(){
    renderTeams();renderSeries();renderLineup();renderStats();renderTable();renderTeamCompare();renderScorers();
    renderFormGuide();renderOffense();renderDefenseLeaders();renderGoalieLeaders();renderRoad();renderLeaders();renderRoleMatchups();
  }

  function renderStatus() {
    const labels = { teams: tx("teamStats"), players: tx("rosterPlayers"), playoffs: tx("playoffs") };
    $("#dataStatus").textContent = Object.entries(status).map(([key, state]) => labels[key] + ": " + ({ loading: tx("loading"), ready: tx("ready"), empty: tx("empty"), error: tx("loadError") }[state])).join(" · ");
  }

  async function loadPart(key, view, render) {
    const leagueId=activeLeagueId;
    try {
      const cfg=window.EHOCKEY_CONFIG||{};
      if(!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error(tx("missingSupabase"));
      const apiKey=String(cfg.supabasePublishableKey);
      const headers={apikey:apiKey,Accept:"application/json"};
      if(/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(apiKey))headers.Authorization="Bearer "+apiKey;
      const url=String(cfg.supabaseUrl).replace(/\/+$/,"")+"/rest/v1/"+view+"?select=*&sports_gamer_league_id=eq."+leagueId;
      const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000),cache:"no-store"});
      if(!response.ok)throw new Error(view+" HTTP "+response.status);
      const rows=await response.json();
      if(activeLeagueId!==leagueId)return;
      if(!Array.isArray(rows)||rows.some(row=>!row||!same(row.sports_gamer_league_id,leagueId)||row.sports_gamer_team_id==null||typeof row.team_name_in_league!=="string"||(key==="players"&&(row.sports_gamer_player_id==null||typeof row.display_gamertag!=="string"))))throw new Error(view+": "+tx("loadError"));
      data[key]=key==="players"?[...new Map(rows.map(p=>[p.sports_gamer_team_id+":"+p.sports_gamer_player_id,p])).values()]:rows;
      status[key]=rows.length?"ready":"empty";
      render();
    } catch(error) {
      if(activeLeagueId!==leagueId)return;
      status[key]="error";
      console.error("Broadcast "+key+":",error);
    }
    renderStatus();
  }

  async function loadTournamentData(){
    data.teams=[];data.players=[];data.playoffs=[];lineups.clear();
    status.teams="loading";status.players="loading";status.playoffs="loading";
    renderStatus();renderAllCompetitionData();
    await Promise.all([
      loadPart("teams","v_broadcast_teams_public",()=>{renderTeams();renderStats();renderTable();renderTeamCompare();renderFormGuide();renderOffense();renderRoad();renderLineup();}),
      loadPart("players","v_broadcast_players_public",()=>{renderLineup();renderLeaders();renderScorers();renderDefenseLeaders();renderGoalieLeaders();renderOffense();renderRoleMatchups();}),
      loadPart("playoffs","v_broadcast_playoffs_public",renderRoad)
    ]);
  }

  function setTheme(name){const theme=["broadcast","arena","ice","impact"].includes(name)?name:"broadcast";document.body.dataset.theme=theme;if($("#theme"))$("#theme").value=theme;}

  function renderSeries(){const bo=Number($("#seriesFormat")?.value||5),need=Math.ceil(bo/2),hw=Math.max(0,Math.min(need,Number($("#seriesHome")?.value||0))),aw=Math.max(0,Math.min(need,Number($("#seriesAway")?.value||0))),round=($("#seriesRound")?.value||tx("playoffs")).trim().toLocaleUpperCase(LOCALE),h=selectedTeam("home"),a=selectedTeam("away");$("#seriesHomeScore").textContent=hw;$("#seriesAwayScore").textContent=aw;$("#seriesKicker").textContent=round+" · BEST OF "+bo;const dots=(wins)=>Array.from({length:need},(_,i)=>'<i class="'+(i<wins?"won":"")+'"></i>').join("");$("#seriesHomeDots").innerHTML=dots(hw);$("#seriesAwayDots").innerHTML=dots(aw);const done=hw===need||aw===need;$("#seriesTitle").textContent=done?(hw===need?h.team_name_in_league:a.team_name_in_league)+" "+tx("winsSeries"):tx("seriesState");$("#seriesNext").textContent=done?tx("seriesDone")+" · "+hw+"–"+aw:tx("nextMatch")+" · "+(hw+aw+1);const showResults=!!$("#seriesShowResults")?.checked,results=Array.from({length:bo},(_,i)=>($("#seriesR"+(i+1))?.value||"").trim()).map((v,i)=>v?'<span><b>M'+(i+1)+'</b> '+esc(v.replace(/\s+/g,""))+'</span>':"").filter(Boolean),resultBox=$("#seriesResults");if(resultBox){resultBox.hidden=!showResults||!results.length;$("#seriesResultsList").innerHTML=results.join("");}for(let i=1;i<=7;i++){const label=$("#seriesR"+i)?.closest("label");if(label)label.hidden=i>bo;}["seriesHome","seriesAway"].forEach(id=>{const el=$("#"+id);if(el)el.max=need;});}

  function studioState(){const ls={};["home","away"].forEach(side=>{const l=lineupFor(side);ls[side]={};SLOTS.forEach(slot=>ls[side][slot]=l[slot]||"");});return {leagueId:activeLeagueId,theme:$("#theme")?.value||"broadcast",seriesFormat:$("#seriesFormat")?.value||"5",seriesRound:$("#seriesRound")?.value||tx("playoffs"),seriesHome:$("#seriesHome")?.value||"0",seriesAway:$("#seriesAway")?.value||"0",seriesShowResults:!!$("#seriesShowResults")?.checked,seriesResults:Array.from({length:7},(_,i)=>$("#seriesR"+(i+1))?.value||""),scene:activeScene,lineupSide:$("#lineupSide").value,home:$("#home").value,away:$("#away").value,hs:$("#hs").value,as:$("#as").value,headline:$("#headline").value,subline:$("#subline").value,commentator1:$("#commentator1").value,commentator2:$("#commentator2").value,person:$("#person").value,role:$("#role").value,videoSource:$("#videoSource")?.value||"twitch",hlsUrl:$("#hlsUrl")?.value||"",twitchChannel:$("#twitchChannel")?.value||"",twitchShow:$("#showTwitch")?.checked!==false,twitchMute:$("#muteTwitch")?.checked!==false,lineups:ls};}
  function applyScene(name,side){
    const next=name||"opening";
    const nextSide=side||$("#lineupSide").value;
    const current=document.querySelector(".scene.active");
    const target=document.querySelector(".scene."+next);
    const sideChanged=next==="lineup"&&activeScene==="lineup"&&nextSide!==displayedLineupSide;
    // Home and away share the same lineup DOM node. Keep a visual snapshot of
    // the outgoing lineup, but run it through the exact same transition classes
    // as every other scene change.
    const oldLineup=sideChanged&&current===target?target.cloneNode(true):null;
    if(side)$("#lineupSide").value=side;
    if(next==="lineup")renderLineup();
    displayedLineupSide=next==="lineup"?nextSide:displayedLineupSide;
    document.querySelectorAll("[data-scene]").forEach(x=>x.classList.toggle("active",x.dataset.scene===next&&(!x.dataset.lineupSide||x.dataset.lineupSide===$("#lineupSide").value)));
    activeScene=next;
    if(!target)return;
    const screen=$("#screen");screen?.classList.toggle("live-mode",next==="live");
    if(OBS_MODE)document.documentElement.classList.toggle("obs-live",next==="live");
    clearTimeout(sceneTransitionTimer);
    clearTimeout(lineupTransitionTimer);
    screen.querySelectorAll(".lineup-transition-old").forEach(x=>x.remove());
    document.querySelectorAll(".scene").forEach(x=>x.classList.remove("scene-leave","scene-enter"));
    screen.classList.remove("scene-switching","lineup-side-switching");
    if(sideChanged&&oldLineup){
      oldLineup.classList.add("lineup-transition-old","scene-leave","active");
      // Keep the outgoing logo constrained exactly like the live lineup logo.
      const oldLogo=oldLineup.querySelector("#lineupTeamLogo");
      if(oldLogo) oldLogo.classList.add("lineup-team-logo-snapshot");
      oldLineup.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));
      screen.appendChild(oldLineup);
      target.classList.add("active","scene-enter");
      void screen.offsetWidth;
      screen.classList.add("scene-switching");
      lineupTransitionTimer=window.setTimeout(()=>{
        oldLineup.remove();
        target.classList.remove("scene-enter");
        screen.classList.remove("scene-switching");
      },420);
      return;
    }
    if(!current||current===target){
      document.querySelectorAll(".scene").forEach(x=>x.classList.toggle("active",x===target));
      return;
    }
    void screen.offsetWidth;
    screen.classList.add("scene-switching");
    current.classList.add("scene-leave");
    target.classList.add("active","scene-enter");
    sceneTransitionTimer=window.setTimeout(()=>{
      document.querySelectorAll(".scene").forEach(x=>{if(x!==target)x.classList.remove("active");x.classList.remove("scene-leave","scene-enter");});
      screen.classList.remove("scene-switching");
    },420);
  }
  function applyRemoteState(s){if(!s||typeof s!=="object")return;remoteApplying=true;const incomingLeague=Number(s.leagueId||activeLeagueId);if(COMPETITIONS[incomingLeague]&&incomingLeague!==activeLeagueId){activeLeagueId=incomingLeague;if($("#tournament"))$("#tournament").value=String(activeLeagueId);applyCompetitionChrome(false);loadTournamentData();}setTheme(s.theme||"broadcast");if($("#videoSource")&&s.videoSource!==undefined)$("#videoSource").value=s.videoSource||"twitch";if($("#hlsUrl")&&s.hlsUrl!==undefined)$("#hlsUrl").value=s.hlsUrl||"";if($("#twitchChannel")&&s.twitchChannel!==undefined)$("#twitchChannel").value=s.twitchChannel||"";if($("#showTwitch")&&s.twitchShow!==undefined)$("#showTwitch").checked=!!s.twitchShow;if($("#muteTwitch")&&s.twitchMute!==undefined)$("#muteTwitch").checked=!!s.twitchMute;window.__sehTwitchState=s;["home","away"].forEach(id=>{if(s[id]!==undefined&&$("#"+id)){const el=$("#"+id),v=String(s[id]);if(v&&![...el.options].some(o=>o.value===v))el.add(new Option(tx("team"),v));el.value=v;}});["hs","as","headline","subline","commentator1","commentator2","person","role","seriesFormat","seriesRound","seriesHome","seriesAway"].forEach(id=>{if(s[id]!==undefined&&$("#"+id))$("#"+id).value=s[id];});if($("#seriesShowResults")&&s.seriesShowResults!==undefined)$("#seriesShowResults").checked=!!s.seriesShowResults;if(Array.isArray(s.seriesResults))s.seriesResults.slice(0,7).forEach((v,i)=>{const el=$("#seriesR"+(i+1));if(el)el.value=v||"";});if(s.lineups){["home","away"].forEach(side=>{if(!s.lineups[side])return;const key=side+":"+String(selectedTeam(side).sports_gamer_team_id);const next={};SLOTS.forEach(slot=>next[slot]=String(s.lineups[side][slot]||""));lineups.set(key,next);});}applyScene(s.scene,s.lineupSide);window.dispatchEvent(new CustomEvent("seh:twitch-state",{detail:s}));renderMatch();renderSeries();renderLineup();renderStats();renderTable();renderTeamCompare();renderScorers();renderFormGuide();renderOffense();renderDefenseLeaders();renderGoalieLeaders();renderRoad();renderLeaders();renderRoleMatchups();remoteApplying=false;}
  async function remoteRequest(method,body){const cfg=window.EHOCKEY_CONFIG||{};if(!cfg.supabaseUrl||!cfg.supabasePublishableKey)return;const key=String(cfg.supabasePublishableKey),headers={apikey:key,Accept:"application/json","Content-Type":"application/json"};if(/^eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(key))headers.Authorization="Bearer "+key;const url=String(cfg.supabaseUrl).replace(/\/+$/,"")+"/rest/v1/broadcast_studio_state?channel=eq."+encodeURIComponent(REMOTE_CHANNEL);const res=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined,cache:"no-store"});if(!res.ok)throw new Error("Broadcast state HTTP "+res.status);return method==="GET"?res.json():null;}
  function publishState(){if(OBS_MODE||remoteApplying)return;clearTimeout(remoteTimer);remoteTimer=setTimeout(()=>remoteRequest("PATCH",{state:studioState(),updated_at:new Date().toISOString()}).catch(console.error),120);} window.__sehPublishBroadcastState=publishState;
  async function pullState(){try{const rows=await remoteRequest("GET");if(rows&&rows[0]&&rows[0].state&&Object.keys(rows[0].state).length)applyRemoteState(rows[0].state);}catch(e){console.error("Broadcast remote:",e);}}
  if(OBS_MODE){
    const obsPoll=()=>{void pullState();};
    obsPoll();
    setInterval(obsPoll,500);
    document.addEventListener("visibilitychange",obsPoll);
    window.addEventListener("focus",obsPoll);
    window.addEventListener("pageshow",obsPoll);
  }else setTimeout(publishState,800);

  // Controls are installed synchronously, before any data request starts.
  document.querySelectorAll("[data-scene]").forEach(button => button.addEventListener("click", () => { applyScene(button.dataset.scene,button.dataset.lineupSide); publishState(); }));
  $("#tournament")?.addEventListener("change",async()=>{
    const next=Number($("#tournament").value);
    if(!COMPETITIONS[next]||next===activeLeagueId)return;
    activeLeagueId=next;
    applyCompetitionChrome(true);
    $("#home").replaceChildren();$("#away").replaceChildren();
    $("#subline").value="";
    await loadTournamentData();
    const h=selectedTeam("home"),a=selectedTeam("away");
    if($("#home").value&&$("#away").value)$("#subline").value=String(h.team_name_in_league||"").toLocaleUpperCase(LOCALE)+" vs "+String(a.team_name_in_league||"").toLocaleUpperCase(LOCALE);
    renderAllCompetitionData();publishState();
  });
  $("#theme")?.addEventListener("change",()=>{setTheme($("#theme").value);publishState();});
  ["seriesFormat","seriesHome","seriesAway","seriesShowResults"].forEach(id=>$("#"+id)?.addEventListener("change",()=>{renderSeries();publishState();}));
  for(let i=1;i<=7;i++)$("#seriesR"+i)?.addEventListener("input",()=>{renderSeries();publishState();});
  $("#seriesRound")?.addEventListener("input",()=>{renderSeries();publishState();});
  setTheme("broadcast");
  $("#lineupEditors").addEventListener("change", event => {
    const select = event.target.closest("[data-lineup-slot]");
    if (!select) return;
    const side = $("#lineupSide").value, lineup = lineupFor(side), slot = select.dataset.lineupSlot;
    if (select.value && !roster(selectedTeam(side)).some(p => same(p.sports_gamer_player_id, select.value))) return;
    // Move an already selected player by swapping positions, never duplicating them.
    const other = SLOTS.find(s => s !== slot && select.value && lineup[s] === select.value);
    if (other) lineup[other] = lineup[slot];
    lineup[slot] = select.value;
    renderLineup();
    renderLeaders();
    renderRoleMatchups();
    publishState();
  });
  ["home", "away"].forEach(side => $("#" + side).addEventListener("change", () => {
    $("#subline").value = selectedTeam("home").team_name_in_league.toLocaleUpperCase(LOCALE) + " vs " + selectedTeam("away").team_name_in_league.toLocaleUpperCase(LOCALE);
    renderMatch();
    renderSeries();
    renderLineup();
    renderStats();
    renderTable();
    renderTeamCompare();
    renderScorers();
    renderFormGuide();
    renderOffense();
    renderDefenseLeaders();
    renderGoalieLeaders();
    renderRoad();
    renderLeaders();
    renderRoleMatchups();
    publishState();
  }));
  ["hs", "as", "headline", "subline", "person", "role"].forEach(id => $("#" + id).addEventListener("input", () => { renderMatch(); publishState(); }));
  ["commentator1","commentator2"].forEach(id => $("#" + id).addEventListener("change", () => { renderCommentators(); publishState(); }));
  $("#screen").addEventListener("error", event => {
    if (event.target.matches?.(".opening-commentator > img")) {
      const placeholder=document.createElement("div");
      placeholder.className="commentator-placeholder";
      placeholder.textContent="MIC";
      event.target.replaceWith(placeholder);
      return;
    }
    if (event.target.tagName === "IMG") event.target.hidden = true;
  }, true);
  renderTeams();
  renderSeries();
  renderLineup();
  renderStats();
  renderTable();
  renderTeamCompare();
  renderScorers();
  renderFormGuide();
  renderOffense();
  renderDefenseLeaders();
  renderGoalieLeaders();
  renderRoad();
  renderLeaders();
  renderRoleMatchups();
  renderStatus();
  applyCompetitionChrome(false);
  loadTournamentData();
})();


/* v64: right-column quick controls mirror canonical controls. */
(()=>{const pairs=[["dockHs","hs"],["dockAs","as"],["dockTheme","theme"]];
 const sync=()=>pairs.forEach(([d,s])=>{const a=document.getElementById(d),b=document.getElementById(s);if(a&&b&&a.value!==b.value)a.value=b.value});
 pairs.forEach(([d,s])=>{const a=document.getElementById(d),b=document.getElementById(s);if(!a||!b)return;
   a.addEventListener("change",()=>{b.value=a.value;b.dispatchEvent(new Event("change",{bubbles:true}));sync()});
   a.addEventListener("input",()=>{if(a.type==="number"){b.value=a.value;b.dispatchEvent(new Event("input",{bubbles:true}))}});
   b.addEventListener("change",sync);b.addEventListener("input",sync);
 }); sync(); setInterval(sync,1000);
})();





/* Live video remains in canonical broadcast state.
   Twitch embed is kept for compatibility; Direct HLS/video uses a same-page <video>
   so OBS Browser Source can own playback and graphics in one source. */
(()=>{
 const OBS_MODE_LOCAL=new URLSearchParams(location.search).get("obs")==="1";
 const $id=id=>document.getElementById(id);
 const source=$id("videoSource"),twitchInput=$id("twitchChannel"),hlsInput=$id("hlsUrl"),btn=$id("loadTwitch"),
       layer=$id("twitchLayer"),host=$id("twitchPlayer"),video=$id("directVideo"),status=$id("streamStatus"),
       show=$id("showTwitch"),mute=$id("muteTwitch"),screen=$id("screen");
 let mountedKey="",hls=null,directPlaying=false,activeTwitchChannel="",pendingTwitchChannel="",liveWatchTimer=0,lastVideoTime=0,lastVideoProgressAt=0;

 const parseTwitch=raw=>{let v=String(raw||"").trim();if(!v)return "";try{if(/^https?:\/\//i.test(v)){const u=new URL(v);return u.pathname.split("/").filter(Boolean)[0]||""}}catch(e){}return v.replace(/^@/,"").replace(/^www\.twitch\.tv\//i,"").replace(/^twitch\.tv\//i,"").split(/[/?#]/)[0].trim()};
 const setStatus=(t,ok=false)=>{if(OBS_MODE_LOCAL){document.documentElement.dataset.playback=t;console.info("[SEH Video]",t)}if(status){status.classList.toggle("ready",ok);const x=status.querySelector("span");if(x)x.textContent=t}};
 const obsBoot=()=>{};
 const obsPlaying=()=>{};

 const destroy=()=>{
   clearTimeout(twitchResolveTimer);clearInterval(liveWatchTimer);liveWatchTimer=0;lastVideoTime=0;lastVideoProgressAt=0;twitchResolveSeq++;pendingTwitchChannel="";activeTwitchChannel="";
   if(hls){try{hls.destroy()}catch(e){}hls=null}
   host?.replaceChildren();
   if(video){
     try{video.pause()}catch(e){}
     video.removeAttribute("src");video.load();video.hidden=true;
   }
   mountedKey="";directPlaying=false;
   layer?.classList.remove("has-stream");
   if(OBS_MODE_LOCAL)document.documentElement.classList.remove("obs-twitch-booting","obs-twitch-playing");
 };

 let twitchResolveTimer=0,twitchResolveSeq=0,lastTwitchRaw="";
 const resolveTwitchHls=async(raw,muted=true)=>{
   const channel=parseTwitch(raw);
   if(!channel){destroy();setStatus(tx("invalidTwitch"));return false}
   if(channel===pendingTwitchChannel)return true;
   if(channel===activeTwitchChannel&&video&&!video.hidden&&(hls||video.currentSrc))return true;
   lastTwitchRaw=raw;
   pendingTwitchChannel=channel;
   const seq=++twitchResolveSeq;
   clearTimeout(twitchResolveTimer);
   setStatus(tx("fetchingTwitch")+" · "+channel.toUpperCase());
   const base=String(window.EHOCKEY_CONFIG?.supabaseUrl||"").replace(/\/+$/,"");
   if(!base){setStatus(tx("missingSupabase"));return false}
   try{
     const res=await fetch(base+"/functions/v1/seh-twitch-resolve?channel="+encodeURIComponent(channel),{cache:"no-store"});
     const data=await res.json().catch(()=>({}));
     if(seq!==twitchResolveSeq)return false;
     if(!res.ok||!data?.hlsUrl){
       setStatus(data?.detail?("TWITCH RESOLVER · "+String(data.detail).slice(0,90)):tx("twitchFetchFail"));
       return false;
     }
     setStatus(tx("twitchReady")+" · "+channel.toUpperCase(),true);
     const ok=mountDirect(data.hlsUrl,muted,{label:"TWITCH · "+channel.toUpperCase(),kind:"twitch"});
     pendingTwitchChannel="";
     if(ok)activeTwitchChannel=channel;
     if(ok&&data.expiresAt){
       const ms=Math.max(300000,Math.min(7200000,(Number(data.expiresAt)*1000-Date.now())-300000));
       twitchResolveTimer=setTimeout(()=>{if(lastTwitchRaw&&screen?.classList.contains("live-mode"))resolveTwitchHls(lastTwitchRaw,muted)},ms);
     }
     return ok;
   }catch(e){
     if(seq===twitchResolveSeq)pendingTwitchChannel="";
     setStatus(tx("twitchNetwork"));
     console.error("[SEH Video] Twitch resolver",e);
     return false;
   }
 };
 const mountTwitch=(raw,muted=true)=>{void resolveTwitchHls(raw,muted);return true;};

 const tryDirectPlay=()=>{
   if(!video||!screen?.classList.contains("live-mode")||layer?.classList.contains("is-hidden"))return;
   const p=video.play();if(p&&typeof p.catch==="function")p.catch(()=>{});
 };

 const mountDirect=(raw,muted=true,meta={})=>{
   const url=String(raw||"").trim();if(!/^https?:\/\//i.test(url)){destroy();setStatus("ANGE EN GILTIG HLS / VIDEO-URL");return false}
   const key=(meta.kind||"direct")+":"+url;if(key===mountedKey&&video&&!video.hidden)return true;
   destroy();obsBoot();
   video.hidden=false;
   video.autoplay=true;video.playsInline=true;video.preload="auto";video.controls=false;
   video.muted=!!muted;
   const onPlaying=()=>{directPlaying=true;lastVideoTime=video.currentTime||0;lastVideoProgressAt=Date.now();obsPlaying();setStatus((meta.label||"DIREKTVIDEO")+" SPELAR",true)};
   const onPause=()=>{directPlaying=false;if(screen?.classList.contains("live-mode"))setTimeout(tryDirectPlay,150)};
   video.onplaying=onPlaying;video.onpause=onPause;video.onstalled=()=>setStatus("DIREKTVIDEO BUFFRAR");video.onwaiting=()=>setStatus("DIREKTVIDEO BUFFRAR");
   video.onerror=()=>setStatus("VIDEO FEL · KONTROLLERA URL/CORS");

   if((meta.kind==="twitch"||/\.m3u8(?:$|[?#])/i.test(url))&&window.Hls?.isSupported()){
     hls=new Hls({lowLatencyMode:false,capLevelToPlayerSize:OBS_MODE_LOCAL,backBufferLength:10,maxBufferLength:12,maxMaxBufferLength:20,liveSyncDurationCount:3,liveMaxLatencyDurationCount:8,highBufferWatchdogPeriod:2,nudgeOffset:.1,nudgeMaxRetry:10});
     hls.loadSource(url);hls.attachMedia(video);
     hls.on(Hls.Events.MANIFEST_PARSED,()=>{
       let qualityLabel="";
       if(OBS_MODE_LOCAL&&Array.isArray(hls.levels)&&hls.levels.length){
         const candidates=hls.levels.map((level,index)=>({index,height:Number(level.height||0),width:Number(level.width||0),bitrate:Number(level.bitrate||0)}))
           .filter(x=>x.height>0&&x.height<=720&&(!x.width||x.width<=1280));
         const chosen=(candidates.length?candidates:hls.levels.map((level,index)=>({index,height:Number(level.height||0),width:Number(level.width||0),bitrate:Number(level.bitrate||0)})))
           .sort((a,b)=>(b.height-a.height)||(b.bitrate-a.bitrate))[0];
         if(chosen){
           hls.autoLevelCapping=chosen.index;
           hls.startLevel=chosen.index;
           hls.nextAutoLevel=chosen.index;
           qualityLabel=chosen.height?" · "+chosen.height+"p":" · OPTIMERAD";
         }
       }
       setStatus("HLS LADDAD"+qualityLabel);
       tryDirectPlay();
     });
     if(meta.kind==="twitch"){
       const recoverLive=()=>{
         if(!hls||!video||video.hidden||!screen?.classList.contains("live-mode"))return;
         const now=Date.now(),current=Number(video.currentTime||0);
         if(current>lastVideoTime+.08){lastVideoTime=current;lastVideoProgressAt=now;return}
         if(!lastVideoProgressAt)lastVideoProgressAt=now;
         if(now-lastVideoProgressAt<4500)return;
         const live=Number(hls.liveSyncPosition);
         setStatus("TWITCH ÅTERHÄMTAR LIVE");
         try{
           if(Number.isFinite(live)&&live>0&&Math.abs(live-current)>1.5)video.currentTime=Math.max(0,live-1);
           hls.startLoad(-1);
           const p=video.play();if(p&&typeof p.catch==="function")p.catch(()=>{});
         }catch(e){console.warn("[SEH HLS] live recover",e)}
         lastVideoTime=Number(video.currentTime||0);lastVideoProgressAt=now;
       };
       clearInterval(liveWatchTimer);
       liveWatchTimer=setInterval(recoverLive,1500);
       const softRecover=()=>setTimeout(recoverLive,350);
       video.onstalled=()=>{setStatus("TWITCH BUFFRAR");softRecover()};
       video.onwaiting=()=>{setStatus("TWITCH BUFFRAR");softRecover()};
     }
     hls.on(Hls.Events.ERROR,(_,data)=>{
       if(!data?.fatal)return;
       const detail=String(data?.details||data?.type||tx("unknown"));
       const code=data?.response?.code||data?.networkDetails?.status||"";
       const failed=data?.url||data?.response?.url||"";
       console.warn("[SEH HLS]",{type:data?.type,details:data?.details,code,failed,data});
       if(data.type===Hls.ErrorTypes.NETWORK_ERROR){
         setStatus("HLS NÄTVERKSFEL"+(code?" "+code:"")+" · "+detail);
         hls.startLoad();
       }else if(data.type===Hls.ErrorTypes.MEDIA_ERROR){
         setStatus("HLS MEDIAFEL · "+detail);
         hls.recoverMediaError();
       }else{
         setStatus("HLS FEL · "+detail);
         try{hls.destroy()}catch(e){}hls=null;
         if(meta.kind==="twitch"&&lastTwitchRaw)setTimeout(()=>resolveTwitchHls(lastTwitchRaw,muted),1200);
       }
     });
   }else{
     video.src=url;
     video.oncanplay=()=>tryDirectPlay();
     video.load();
   }
   layer?.classList.add("has-stream");mountedKey=key;setStatus(tx("loadingDirectVideo"));
   setTimeout(tryDirectPlay,100);
   return true;
 };

 const syncSourceUi=()=>{
   const direct=source?.value==="direct";
   document.querySelector(".source-twitch")?.toggleAttribute("hidden",direct);
   document.querySelector(".source-direct")?.toggleAttribute("hidden",!direct);
 };

 const apply=s=>{
   if(!s)return;
   if(source&&s.videoSource!==undefined)source.value=s.videoSource||"twitch";
   if(hlsInput&&s.hlsUrl!==undefined)hlsInput.value=s.hlsUrl||"";
   syncSourceUi();
   const enabled=s.scene==="live"&&s.twitchShow!==false;
   layer?.classList.toggle("is-hidden",!enabled);
   if(!enabled){destroy();return}
   if((s.videoSource||"twitch")==="direct")mountDirect(s.hlsUrl,s.twitchMute!==false,{label:tx("directVideo"),kind:"direct"});
   else mountTwitch(s.twitchChannel,s.twitchMute!==false);
 };

 const loadFromControls=()=>{
   const mode=source?.value||"twitch";
   const ok=mode==="direct"?mountDirect(hlsInput?.value,mute?.checked!==false,{label:tx("directVideo"),kind:"direct"}):mountTwitch(twitchInput?.value,mute?.checked!==false);
   if(ok)window.__sehPublishBroadcastState?.();
 };

 btn?.addEventListener("click",e=>{e.preventDefault();loadFromControls()});
 [twitchInput,hlsInput].forEach(el=>el?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();loadFromControls()}}));
 source?.addEventListener("change",()=>{syncSourceUi();window.__sehPublishBroadcastState?.();if(screen?.classList.contains("live-mode"))loadFromControls()});
 show?.addEventListener("change",()=>{layer?.classList.toggle("is-hidden",!show.checked);window.__sehPublishBroadcastState?.();if(show.checked)loadFromControls()});
 mute?.addEventListener("change",()=>{if(video&&!video.hidden)video.muted=mute.checked;window.__sehPublishBroadcastState?.()});

 window.addEventListener("seh:twitch-state",e=>apply(e.detail));
 if(window.__sehTwitchState)apply(window.__sehTwitchState);
 syncSourceUi();

 const syncLiveMode=()=>screen?.classList.toggle("live-mode",!!screen?.querySelector(".scene.live.active"));
 screen?.querySelectorAll(".scene").forEach(s=>new MutationObserver(syncLiveMode).observe(s,{attributes:true,attributeFilter:["class"]}));
 syncLiveMode();
})();
