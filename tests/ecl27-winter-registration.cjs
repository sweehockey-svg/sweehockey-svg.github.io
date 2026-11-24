const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const snapshot = require("../ecl27-winter-rosters.json");
const constants = app.slice(app.indexOf("const SEH_WINTER_TITLE"), app.indexOf("let sehWinterRosterRequest;") + "let sehWinterRosterRequest;".length);
const helpers = app.slice(app.indexOf("function SEH_fetchWinterRosters()"), app.indexOf("async function SEH_addWinterTeamLink("));
const body = constants + helpers;
const invictus = snapshot.teams.find((team) => team.id === 6709);
const redhawkTeam = snapshot.teams.find(team=>team.players.some(player=>player.id===16103));
assert.ok(redhawkTeam);
assert.ok(invictus && invictus.players.length);
assert.equal(new Set(snapshot.teams.map(({ id }) => id)).size, snapshot.teams.length);
assert.ok(snapshot.teams.every((team) => team.players.every((player) => player.id > 0 && player.name)));

const builds = fs.readFileSync(path.join(root, "ecl27-team-builds-v2.js"), "utf8");
const buildHelpers = builds.slice(builds.indexOf("  function unregisteredBuilds("), builds.indexOf("  function hydrateWinterMoves("));
const work = [
  {name:"Old alias", id:40, kind:"spring", timeline:[{}]},
  {name:"refuse too lose", id:0, kind:"spring", timeline:[{}]},
  {name:"New project", id:50, kind:"new", timeline:[]},
  {name:"Dormant Spring team", id:60, kind:"spring", timeline:[]}
];
const teamRegistration = {id:4523, name:"Refuse Too Lose", requestedDivision:542, club:{team_id:40,logo_url:""}, players:[{id:4596,name:"<Jeppe>"}]};
const buildTestContext = {work, registration:teamRegistration, norm:value=>value.trim().toLowerCase(),
  teamId:name=>work.find(team=>team.name===name)?.id, esc:value=>String(value).replaceAll("<","&lt;").replaceAll(">","&gt;"),
  SEH_WINTER_DIVISIONS:{542:"Lite"}};
const pending = vm.runInNewContext(buildHelpers + "unregisteredBuilds(work,[registration])",buildTestContext);
assert.equal(pending.length,1);
assert.equal(pending[0].name,"New project");
buildTestContext.renderTeamCard = model => model;
const registeredCard = vm.runInNewContext(buildHelpers + "renderRegisteredWinterCard(registration,true)",buildTestContext);
assert.equal(registeredCard.division,"Lite");
assert.equal(registeredCard.winterRegistration.id,4523);
assert.equal(registeredCard.playersNow.length,1);
assert.equal(registeredCard.playersNow[0],"<Jeppe>");

const player = invictus.players[0];
const collision = { ...invictus, id: 98765, players: [player] };
const context = vm.createContext({ snapshot, invictus, player, collision, assert, redhawkTeam });
vm.runInContext(body + `
  assert.equal(SEH_winterTeam(snapshot, ["6709", 6709]), invictus);
  assert.equal(SEH_winterTeam(snapshot, [0]), null);
  assert.equal(SEH_winterTeam({ teams:[invictus, collision] }, [6709, 98765]), null);
  assert.equal(SEH_winterPlayerTeams({ teams:[invictus] }).get(player.id), invictus);
  assert.equal(SEH_winterPlayerTeams({ teams:[invictus, collision] }).get(player.id), null);
  assert.match(SEH_winterLabel(invictus), /Winter · Anmäld · ansökt:/);
  assert.match(SEH_winterTeamUrl(invictus), /section=teams&teamId=6709$/);
  const redhawkCard = { sportsGamerId:16103, currentStatus:"team", currentTeam:"The Last Line",
    currentTeamId:50, currentTeamLogo:"last-line.png" };
  const updated = SEH_applyDirectoryWinterClub(redhawkCard,snapshot,SEH_winterPlayerTeams(snapshot));
  assert.equal(updated.currentTeam,redhawkTeam.name);
  assert.equal(updated.latestTeam,redhawkTeam.name);
  assert.equal(updated.currentTeamLogo,"");
  assert.equal(updated.currentTeamId,0);
  assert.equal(updated.currentTeamHref,"https://sportsgamer.gg/leagues/535/teams/"+redhawkTeam.id);
  const ambiguous = { ...snapshot, teams:[...snapshot.teams,{ ...collision, players:[{ id:16103 }] }] };
  assert.equal(SEH_applyDirectoryWinterClub(redhawkCard,ambiguous,SEH_winterPlayerTeams(ambiguous)),redhawkCard);
  assert.equal(SEH_applyDirectoryWinterClub(redhawkCard,null,SEH_winterPlayerTeams(null)),redhawkCard);
  const swedish = { team_id: 1, effective_country: "SE", sports_gamer_team_ids: ["6709", "6710"] };
  const foreign = { team_id: 2, effective_country: "FI", sports_gamer_team_ids: [98765] };
  const all = { teams: [collision, invictus] };
  const result = SEH_winterSwedishTeams(all, [swedish, swedish, foreign]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, invictus.id);
  assert.equal(result[0].players, invictus.players);
  assert.equal(result[0].club, swedish);
  assert.equal(SEH_winterSwedishTeams(all, [swedish, { ...swedish, team_id: 3 }]).length, 0);
`, context);

const transferMapper = app.slice(app.indexOf("  function seasonSupabaseTransferRows("), app.indexOf("  function seasonSupabaseMetricsLegacy("));
const registration = { transfer_key: "winter-registration:4596:4523", player_id: 4596, from_league_id: 508, from_team_id: 6987, to_league_id: 535, to_team_id: 4523, transfer_date: null };
const mapTransfers = (rows) => vm.runInNewContext(transferMapper + "seasonSupabaseTransferRows(rows)", { rows });
assert.equal(mapTransfers([registration])[0].registrationComparison, true);
assert.equal(mapTransfers([registration])[0].ToUrl, "https://sportsgamer.gg/leagues/535/teams/4523");
const dated = { ...registration, transfer_key: "official-1", transfer_date: "2026-11-18" };
assert.equal(mapTransfers([registration, dated]).length, 1);
assert.equal(mapTransfers([registration, dated])[0].Date, dated.transfer_date);
const invite = { ...dated, from_team_id: 5979, transfer_key: "winter-invite:4596:5979:4523:2026-11-18" };
const captain = { ...dated, transfer_key: "winter-captain:4596:4523:2026-11-15" };
const imported = mapTransfers([registration, captain, invite]);
assert.equal(imported.length, 1);
assert.equal(imported[0].Date, invite.transfer_date);
assert.match(imported[0].dateSource, /accepterad/);

const seasonConfiguration = app.slice(app.indexOf("  async function loadWinterSeasonConfiguration("), app.indexOf("  async function loadWinterOfficialTeamRows("));
const getWinterConfiguration = (base, rows) => vm.runInNewContext(seasonConfiguration + "loadWinterSeasonConfiguration(base)", {
  base, seasonFetchAll: async () => rows
});

const routeParser = app.slice(app.indexOf("  function normalizeSeasonId("), app.indexOf("  function headerHtml("));
const routeFor = (hash) => vm.runInNewContext(routeParser + "parseRoute()", {
  location: { hash }, decode: decodeURIComponent, URLSearchParams,
  seasons: { ecl27winter: { title: "ECL ’27: Winter" }, ecl26spring: { title: "ECL ’26: Spring" } }
});
assert.equal(routeFor("#/sasong/ecl27winter?section=teams").active, "ecl");
assert.equal(routeFor("#/sasong/ecl27winter?section=teams&teamId=4523").query.get("teamId"), "4523");
assert.equal(routeFor("#/sasong/ecl26spring?section=teams").params.seasonId, "ecl26spring");
assert.equal(routeFor("#/lagbygge?ecl27lag=refuse-too-lose").key, "teamBuilds");

(async () => {
  const fallback = { kind: "team", teamName: "The Last Line" };
  const resolveClub = (data, id) => {
    const helpersOnly = helpers.slice(helpers.indexOf("function SEH_winterTeam("));
    return vm.runInNewContext(constants + helpersOnly + "SEH_playerProfileClubStatus('key', id)", {
      id, SEH_fetchWinterRosters: () => data ? Promise.resolve(data) : Promise.reject(new Error("offline")),
      window: { SEH_currentPlayerStatus: { get: async () => fallback } }
    });
  };
  const redhawk = await resolveClub(snapshot, 16103);
  assert.equal(redhawk.teamName, redhawkTeam.name);
  assert.equal(redhawk.href, "https://sportsgamer.gg/leagues/535/teams/"+redhawkTeam.id);
  assert.equal(await resolveClub(snapshot, 999999), fallback);
  assert.equal(await resolveClub(null, 16103), fallback);
  assert.equal(await resolveClub({ ...snapshot, teams: [...snapshot.teams, {
    id: 1617, name: "The Last Line", players: [{ id: 16103 }]
  }] }, 16103), fallback);

  const base = { registrationRosters: true, divisions: [{ id: "elite" }, { id: "pro" }, { id: "lite" }] };
  const division = (id, official_league_name) => ({ sports_gamer_league_id: id, official_league_name });
  const other = [division(535, "ECL '27 Winter Registration"), division(545, "ECL '27 Winter Pro Qualifier"),
    division(507, "ECL '26 Spring Elite")];
  assert.equal(await getWinterConfiguration(base, other), base);
  const official = await getWinterConfiguration(base, [...other, division(550, "ECL ’27: Winter - Elite"), division(551, "ECL '27 Winter Pro")]);
  assert.equal(official.registrationRosters, false);
  assert.equal(official.leagueIds.join(","), "550,551");
  assert.equal(official.divisionByLeague.get(551), "pro");
  assert.equal(official.divisions.length, 2);
  const newer = { ...snapshot, checkedAt: "2026-12-08T22:00:00Z" };
  const run = (fetch) => vm.runInNewContext(body + "SEH_fetchWinterRosters()", { fetch, AbortController, setTimeout, clearTimeout });
  const response = (data) => ({ ok: true, json: async () => data });
  assert.equal(await run(async (url) => response(url.startsWith("https:") ? newer : snapshot)), newer);
  assert.equal(await run(async (url) => response(url.startsWith("https:") ? { leagueId: 534 } : snapshot)), snapshot);
  console.log("Winter: IDs, division labels, duplicate protection and snapshot fallback verified");
})().catch((error) => { console.error(error); process.exitCode = 1; });
