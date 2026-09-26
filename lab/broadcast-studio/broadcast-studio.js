(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const LEAGUE = 520;
  const SLOTS = ["LW", "C", "RW", "LD", "G", "RD"];
  // Match identity is editorial. Historical numbers only come from Supabase.
  const MATCH_TEAMS = [
    { sports_gamer_team_id: 7046, team_name_in_league: "Daankerzquad", team_logo_in_league: "https://sportsgamer.gg/storage/team-logos/520/7046/Daankerzquad_20260610-013637.png" },
    { sports_gamer_team_id: 3252, team_name_in_league: "Västerås IK", team_logo_in_league: "https://sportsgamer.gg/storage/team-logos/520/3252/VIK-prima%CC%88r@4x_20260612-174642.png" }
  ];
  const data = { teams: [], players: [], playoffs: [] };
  const COMMENTATORS = {
    flacken: { name: 'Peter “Flacken” Novara', image: '../../players/flacken.png' },
    wizrob: { name: 'Wizrob', image: '' }
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
  const team = id => data.teams.find(t => same(t.sports_gamer_team_id, id)) || MATCH_TEAMS.find(t => same(t.sports_gamer_team_id, id)) || { team_name_in_league: "LAG" };
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
    const unique = [...new Map([...MATCH_TEAMS, ...data.teams].map(t => [String(t.sports_gamer_team_id), t])).values()]
      .sort((a, b) => a.team_name_in_league.localeCompare(b.team_name_in_league, "sv"));
    ["home", "away"].forEach((side, index) => {
      const select = $("#" + side);
      const value = select.value || String(MATCH_TEAMS[index].sports_gamer_team_id);
      select.replaceChildren(...unique.map(t => new Option(t.team_name_in_league, String(t.sports_gamer_team_id))));
      select.value = value;
    });
    renderMatch();
  }

  function renderCommentators() {
    const ids = ["commentator1","commentator2"].map(id => $("#" + id)?.value).filter(Boolean);
    const people = ids.map(id => COMMENTATORS[id]).filter(Boolean);
    $("#openingCommentators").innerHTML = people.map(c =>
      '<div class="opening-commentator">' +
      (c.image ? '<img src="' + esc(c.image) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="commentator-placeholder">MIC</div>') +
      '<div><small>KOMMENTATOR</small><b>' + esc(c.name) + '</b></div></div>'
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
    $("#lineupEditors").innerHTML = SLOTS.map(slot => '<label>' + slot + '<select data-lineup-slot="' + slot + '"' + (!ps.length ? " disabled" : "") + '><option value="">Välj spelare</option>' + ps.map(p => '<option value="' + esc(p.sports_gamer_player_id) + '"' + (same(lineup[slot], p.sports_gamer_player_id) ? " selected" : "") + '>' + esc(p.display_gamertag) + ' · ' + esc(position(p) || "–") + '</option>').join("") + '</select></label>').join("");
    $(".players").innerHTML = SLOTS.map(slot => {
      const p = ps.find(p => same(p.sports_gamer_player_id, lineup[slot]));
      if (!p) return '<div class="player empty"><span>' + slot + '</span><div class="sil">?</div><b>EJ VALD</b></div>';
      return '<div class="player"><span>' + slot + '</span>' + image(playerImage(p)) + '<div class="player-info"><strong>#' + esc(p.player_number ?? "") + ' ' + esc(p.display_gamertag) + '</strong><small>GRUPP ' + stat(p.regular_points) + ' P · SLUTSPEL ' + stat(p.playoff_points) + ' P</small></div></div>';
    }).join("");
  }

  function renderStats() {
    const h = selectedTeam("home"), a = selectedTeam("away");
    const hr = stage(h, "regular"), ar = stage(a, "regular"), hp = stage(h, "playoffs"), ap = stage(a, "playoffs");
    const rows = [
      [rate(hr.total_wins, hr.games_played, true), rate(ar.total_wins, ar.games_played, true), "GRUPP WIN RATE"],
      [rate(hr.goals_for, hr.games_played), rate(ar.goals_for, ar.games_played), "GRUPP MÅL / MATCH"],
      [rate(hp.total_wins, hp.games_played, true), rate(ap.total_wins, ap.games_played, true), "SLUTSPEL WIN RATE"],
      [stat(hp.goals_for), stat(ap.goals_for), "SLUTSPEL MÅL"]
    ];
    $(".statrows").innerHTML = rows.map(r => '<div><b>' + r[0] + '</b><span>' + r[2] + '</span><b>' + r[1] + '</b></div>').join("");
  }

  function renderTable() {
    const selected = new Set([String(selectedTeam("home").sports_gamer_team_id), String(selectedTeam("away").sports_gamer_team_id)]);
    const rows = data.teams.filter(r => r.statistics_stage === "regular")
      .sort((a,b)=>(number(b.table_points)??0)-(number(a.table_points)??0) || (number(b.goal_difference)??0)-(number(a.goal_difference)??0) || (number(b.goals_for)??0)-(number(a.goals_for)??0));
    $("#broadcastTable").innerHTML = '<div class="bt-head"><span>#</span><span>LAG</span><span>GP</span><span>W</span><span>L</span><span>GD</span><span>PTS</span></div>'+rows.map((r,i)=>'<div class="bt-row '+(selected.has(String(r.sports_gamer_team_id))?"selected":"")+'"><b>'+(i+1)+'</b><span class="bt-team">'+(logo(r)?'<img src="'+esc(logo(r))+'" alt="">':"")+'<strong>'+esc(r.team_name_in_league)+'</strong></span><span>'+stat(r.games_played)+'</span><span>'+stat(r.total_wins)+'</span><span>'+stat(r.losses)+'</span><span>'+((number(r.goal_difference)??0)>0?"+":"")+stat(r.goal_difference)+'</span><b>'+stat(r.table_points)+'</b></div>').join("");
  }
  function renderTeamCompare() {
    const sides=["home","away"].map(side=>({side,t:selectedTeam(side)}));
    const vals=(x,key)=>{const r=stage(x.t,"regular"),p=stage(x.t,"playoffs"); if(key==="WIN%") return [rate(r.total_wins,r.games_played,true),rate(p.total_wins,p.games_played,true)]; if(key==="GF/G") return [rate(r.goals_for,r.games_played),rate(p.goals_for,p.games_played)]; if(key==="GA/G") return [rate(r.goals_against,r.games_played),rate(p.goals_against,p.games_played)]; return [stat(r[key]),stat(p[key])];};
    const rows=[["WIN%","WIN%"],["GF/G","MÅL / MATCH"],["GA/G","INSLÄPPT / MATCH"],["goal_difference","MÅLSKILLNAD"]];
    const sideHead=x=>'<div class="tc-team">'+(logo(x.t)?'<img src="'+esc(logo(x.t))+'" alt="">':"")+'<b>'+esc(x.t.team_name_in_league)+'</b></div>';
    $("#teamCompare").innerHTML=sideHead(sides[0])+'<div class="tc-center"><div class="tc-cols"><span>GRUPP</span><span>SLUTSPEL</span><i></i><span>GRUPP</span><span>SLUTSPEL</span></div>'+rows.map(r=>{const a=vals(sides[0],r[0]),b=vals(sides[1],r[0]);return '<div class="tc-row"><b>'+a[0]+'</b><b>'+a[1]+'</b><span>'+r[1]+'</span><b>'+b[0]+'</b><b>'+b[1]+'</b></div>'}).join("")+'</div>'+sideHead(sides[1]);
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
      return '<div class="form-card"><div class="form-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div><div class="form-record"><strong>'+x.w+'–'+x.l+'</strong><span>TOTALT RESULTAT</span></div><div class="form-stats"><div><b>'+stat(r.total_wins)+'–'+stat(r.losses)+'</b><span>GRUPPSPEL</span></div><div><b>'+stat(p.total_wins)+'–'+stat(p.losses)+'</b><span>SLUTSPEL</span></div><div><b>'+x.gf+'–'+x.ga+'</b><span>MÅL</span></div><div><b>'+(gd>0?"+":"")+gd+'</b><span>MÅLSKILLNAD</span></div></div></div>'};
    $("#formGrid").innerHTML=card("home")+card("away");
  }
  function renderOffense() {
    const card=side=>{const t=selectedTeam(side),ps=roster(t).filter(p=>(total(p.regular_skater_games,p.playoff_skater_games)??0)>0),x=teamTotals(t);
      const goals=ps.reduce((s,p)=>s+(total(p.regular_goals,p.playoff_goals)??0),0), assists=ps.reduce((s,p)=>s+(total(p.regular_assists,p.playoff_assists)??0),0);
      const top=[...ps].sort((a,b)=>(total(b.regular_goals,b.playoff_goals)??0)-(total(a.regular_goals,a.playoff_goals)??0))[0];
      return '<div class="off-card"><div class="off-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<b>'+esc(t.team_name_in_league)+'</b></div><div class="off-big"><b>'+rate(x.gf,x.gp)+'</b><span>MÅL / MATCH</span></div><div class="off-row"><div><b>'+x.gf+'</b><span>LAGMÅL</span></div><div><b>'+goals+'</b><span>SPELARMÅL</span></div><div><b>'+assists+'</b><span>ASSISTS</span></div></div>'+(top?'<div class="off-top">'+image(playerImage(top))+'<span><small>FLERST MÅL</small><b>'+esc(top.display_gamertag)+'</b></span><strong>'+stat(total(top.regular_goals,top.playoff_goals))+' G</strong></div>':"")+'</div>'};
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
      return '<div class="road-card"><div class="road-team">' + (logo(t) ? image(logo(t)) : "") + '<b>' + esc(t.team_name_in_league) + '</b></div><div class="road-step"><small>GRUPPSPEL</small><strong>#' + stat(po.regular_season_seed) + '</strong><span>' + stat(r.total_wins) + ' vinster · ' + stat(r.goals_for) + '–' + stat(r.goals_against) + '</span></div><i></i><div class="road-step"><small>SLUTSPEL · ' + esc(po.playoff_round_name || "DATA SAKNAS") + '</small><strong>' + stat(po.series_won) + '–' + stat(po.series_lost) + ' serier</strong><span>' + stat(po.matched_playoff_game_wins) + ' matchvinster</span></div><i></i><div class="road-step final"><small>FIKTIV TESTMATCH</small><strong>BRONS</strong><span>Ingen historisk bronsmatch</span></div></div>';
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
      return [top && {p:top, reason:"POÄNGLIGAN"}, special && {p:special, reason: goalies[0] === special ? "MÅLVAKT" : standoutD === special ? "BACK" : "POÄNGLIGAN"}]
        .filter(Boolean).map(x => ({...x.p, team_name_in_league:t.team_name_in_league, watch_reason:x.reason, watch_save:goalieSave(x.p)}));
    };
    const leaders = ["home","away"].flatMap(pickForTeam);
    $("#leaderGrid").innerHTML = leaders.length ? leaders.map(p => {
      const isGoalie = p.watch_reason === "MÅLVAKT";
      const main = isGoalie && p.watch_save !== null
        ? (p.watch_save * (p.watch_save <= 1 ? 100 : 1)).toFixed(1).replace(".", ",") + "% SV · " + stat(total(p.regular_goalie_shutouts,p.playoff_goalie_shutouts)) + " SO"
        : stat(playerGoals(p)) + " G · " + stat(total(p.regular_assists,p.playoff_assists)) + " A · <strong>" + stat(playerPoints(p)) + " P</strong>";
      const detail = isGoalie ? stat(goalieGames(p)) + " matcher" : "Grupp " + stat(p.regular_points) + " · Slutspel " + stat(p.playoff_points);
      const team = MATCH_TEAMS.find(t => same(t.sports_gamer_team_id, p.sports_gamer_team_id)) || {};
      const teamLogo = logo(team);
      return '<div class="leader-card">' + image(playerImage(p)) + '<div class="leader-copy">' + (teamLogo ? '<img class="leader-team-logo" src="' + esc(teamLogo) + '" alt="">' : '') + '<small>' + esc(p.team_name_in_league) + ' · ' + esc(p.watch_reason) + '</small><b>' + esc(p.display_gamertag) + '</b><span>' + main + '</span><em>' + detail + '</em></div></div>';
    }).join("") : '<p>Spelarstatistik saknas.</p>';
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
    if (!p) return '<div class="role-card empty"><b>' + slot + '</b><span>EJ VALD</span></div>';
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
      rows.push(["G",stat(p.regular_goals),stat(p.playoff_goals)],["A",stat(p.regular_assists),stat(p.playoff_assists)],["P",stat(p.regular_points),stat(p.playoff_points)]);
    }
    return '<div class="role-card">' + image(playerImage(p)) + '<div class="role-info"><div class="role-team">' + (logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"") + '<small>'+esc(t.team_name_in_league)+'</small></div><strong>'+slot+' #'+esc(p.player_number ?? "")+' · '+esc(p.display_gamertag)+'</strong><div class="role-head"><i></i><b>GRUPP</b><b>SLUTSPEL</b></div>'+rows.map(r=>'<div class="role-stat"><span>'+r[0]+'</span><b>'+r[1]+'</b><b>'+r[2]+'</b></div>').join("")+'</div></div>';
  }
  function bestLineupSkater(side) {
    return ["LW","C","RW","LD","RD"].map(slot => ({slot,p:lineupPlayer(side,slot)})).filter(x=>x.p)
      .sort((a,b)=>(total(b.p.regular_points,b.p.playoff_points)??0)-(total(a.p.regular_points,a.p.playoff_points)??0))[0];
  }
  function keyCard(side) {
    const x=bestLineupSkater(side);
    return x ? matchupCard(side,x.slot,x.slot==="C"?"center":"skater") : '<div class="role-card empty"><span>INGEN SPELARE</span></div>';
  }
  function spotlightHtml() {
    const h=bestLineupSkater("home"), a=bestLineupSkater("away");
    const x=[h&&{...h,side:"home"},a&&{...a,side:"away"}].filter(Boolean)
      .sort((x,y)=>(total(y.p.regular_points,y.p.playoff_points)??0)-(total(x.p.regular_points,x.p.playoff_points)??0))[0];
    if(!x) return '<div class="role-card empty"><span>INGEN SPELARE</span></div>';
    const p=x.p,t=selectedTeam(x.side), pts=total(p.regular_points,p.playoff_points), goals=total(p.regular_goals,p.playoff_goals), assists=total(p.regular_assists,p.playoff_assists);
    return '<div class="spotlight-player">'+image(playerImage(p))+'<div class="spotlight-copy"><div class="eyebrow">PLAYER SPOTLIGHT</div><div class="spotlight-team">'+(logo(t)?'<img src="'+esc(logo(t))+'" alt="">':"")+'<span>'+esc(t.team_name_in_league)+'</span></div><h2>'+esc(p.display_gamertag)+'</h2><h3>'+x.slot+' · #'+esc(p.player_number??"")+'</h3><div class="spotlight-total"><b>'+stat(pts)+'</b><span>POÄNG TOTALT</span></div><div class="spotlight-stats"><div><b>'+stat(goals)+'</b><span>MÅL</span></div><div><b>'+stat(assists)+'</b><span>ASSISTS</span></div><div><b>'+stat(p.regular_points)+'</b><span>GRUPPSPEL P</span></div><div><b>'+stat(p.playoff_points)+'</b><span>SLUTSPEL P</span></div></div></div></div>';
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
    const goaliePortrait = x => x.p ? '<div class="goalie-person goalie-'+x.side+'">'+image(playerImage(x.p))+'<div class="goalie-name">'+(logo(x.t)?'<img src="'+esc(logo(x.t))+'" alt="">':"")+'<span><b>G #'+esc(x.p.player_number ?? "")+' · '+esc(x.p.display_gamertag)+'</b><small>'+esc(x.t.team_name_in_league)+'</small></span></div></div>' : '<div class="goalie-person empty"><span>INGEN MÅLVAKT</span></div>';
    const goalieRows = [
      ["GP","regular_goalie_games","playoff_goalie_games"],
      ["SV%","sv","psv"],
      ["GAA","regular_goalie_goals_against_average","playoff_goalie_goals_against_average"],
      ["SO","regular_goalie_shutouts","playoff_goalie_shutouts"]
    ];
    $("#goaliesGrid").innerHTML = goaliePortrait(gh)+'<div class="goalie-center"><div class="goalie-center-title">GOALIE MATCHUP</div><div class="goalie-columns"><span>GRUPP</span><span>SLUTSPEL</span><i></i><span>GRUPP</span><span>SLUTSPEL</span></div>'+goalieRows.map(r=>'<div class="goalie-row"><b>'+goalieVal(gh,r[1])+'</b><b>'+goalieVal(gh,r[2])+'</b><span>'+r[0]+'</span><b>'+goalieVal(ga,r[1])+'</b><b>'+goalieVal(ga,r[2])+'</b></div>').join("")+'</div>'+goaliePortrait(ga);
    const kh=bestLineupSkater("home"), ka=bestLineupSkater("away");
    const keySide=(side,x)=>({side,t:selectedTeam(side),slot:x?.slot||"",p:x?.p||null});
    const kHome=keySide("home",kh), kAway=keySide("away",ka);
    const keyPortrait=x=>x.p?'<div class="key-person key-'+x.side+'">'+image(playerImage(x.p))+'<div class="key-name">'+(logo(x.t)?'<img src="'+esc(logo(x.t))+'" alt="">':"")+'<span><b>'+esc(x.slot)+' #'+esc(x.p.player_number??"")+' · '+esc(x.p.display_gamertag)+'</b><small>'+esc(x.t.team_name_in_league)+'</small></span></div></div>':'<div class="key-person empty"><span>INGEN SPELARE</span></div>';
    const keyValue=(x,key,stageName)=>{if(!x.p)return "–";if(key==="FO%")return x.slot==="C"?faceoffPct(x.p,stageName):"–";const prefix=stageName==="regular"?"regular_":"playoff_";return stat(x.p[prefix+key]);};
    const keyRows=[["GP","skater_games"],["FO%","FO%"],["G","goals"],["A","assists"],["P","points"]];
    $("#keyGrid").innerHTML=keyPortrait(kHome)+'<div class="key-center"><div class="key-center-title">KEY MATCHUP</div><div class="key-columns"><span>GRUPP</span><span>SLUTSPEL</span><i></i><span>GRUPP</span><span>SLUTSPEL</span></div>'+keyRows.map(r=>'<div class="key-row"><b>'+keyValue(kHome,r[1],"regular")+'</b><b>'+keyValue(kHome,r[1],"playoff")+'</b><span>'+r[0]+'</span><b>'+keyValue(kAway,r[1],"regular")+'</b><b>'+keyValue(kAway,r[1],"playoff")+'</b></div>').join("")+'</div>'+keyPortrait(kAway);
    $("#spotlightCard").innerHTML = spotlightHtml();
  }

  function renderStatus() {
    const labels = { teams: "Lagstatistik", players: "Trupp/spelare", playoffs: "Slutspel" };
    $("#dataStatus").textContent = Object.entries(status).map(([key, state]) => labels[key] + ": " + ({ loading: "laddar…", ready: "klar", empty: "saknas", error: "kunde inte laddas" }[state])).join(" · ");
  }

  async function loadPart(key, view, render) {
    try {
      const cfg = window.EHOCKEY_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) throw new Error("Supabase-konfiguration saknas");
      const apiKey = String(cfg.supabasePublishableKey);
      const headers = { apikey: apiKey, Accept: "application/json" };
      if (/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(apiKey)) headers.Authorization = "Bearer " + apiKey;
      const url = String(cfg.supabaseUrl).replace(/\/+$/, "") + "/rest/v1/" + view + "?select=*&sports_gamer_league_id=eq." + LEAGUE;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(view + " HTTP " + response.status);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.some(row => !row || !same(row.sports_gamer_league_id, LEAGUE) || row.sports_gamer_team_id == null || typeof row.team_name_in_league !== "string" || (key === "players" && (row.sports_gamer_player_id == null || typeof row.display_gamertag !== "string")))) throw new Error(view + ": oväntat dataformat");
      data[key] = key === "players" ? [...new Map(rows.map(p => [p.sports_gamer_team_id + ":" + p.sports_gamer_player_id, p])).values()] : rows;
      status[key] = rows.length ? "ready" : "empty";
      render();
    } catch (error) {
      status[key] = "error";
      console.error("Broadcast " + key + ":", error);
    }
    renderStatus();
  }

  // Controls are installed synchronously, before any data request starts.
  document.querySelectorAll("[data-scene]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.lineupSide) {
      $("#lineupSide").value = button.dataset.lineupSide;
      renderLineup();
    }
    document.querySelectorAll("[data-scene]").forEach(item => item.classList.toggle("active", item === button));
    document.querySelectorAll(".scene").forEach(scene => scene.classList.toggle("active", scene.classList.contains(button.dataset.scene)));
  }));
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
  });
  ["home", "away"].forEach(side => $("#" + side).addEventListener("change", () => {
    $("#subline").value = selectedTeam("home").team_name_in_league.toLocaleUpperCase("sv") + " vs " + selectedTeam("away").team_name_in_league.toLocaleUpperCase("sv");
    renderMatch();
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
  }));
  ["hs", "as", "headline", "subline", "person", "role"].forEach(id => $("#" + id).addEventListener("input", renderMatch));
  ["commentator1","commentator2"].forEach(id => $("#" + id).addEventListener("change", renderCommentators));
  $("#screen").addEventListener("error", event => {
    if (event.target.tagName === "IMG") event.target.hidden = true;
  }, true);
  renderTeams();
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
  void loadPart("teams", "v_sec21_broadcast_teams_public", () => { renderTeams(); renderStats(); renderTable(); renderTeamCompare(); renderFormGuide(); renderOffense(); renderRoad(); renderLineup(); });
  void loadPart("players", "v_sec21_broadcast_players_public", () => { renderLineup(); renderLeaders(); renderScorers(); renderDefenseLeaders(); renderGoalieLeaders(); renderOffense(); renderRoleMatchups(); });
  void loadPart("playoffs", "v_sec21_broadcast_playoffs_public", renderRoad);
})();
