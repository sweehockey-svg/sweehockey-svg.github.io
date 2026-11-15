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
assert.ok(invictus && invictus.players.length);
assert.equal(new Set(snapshot.teams.map(({ id }) => id)).size, snapshot.teams.length);
assert.ok(snapshot.teams.every((team) => team.players.every((player) => player.id > 0 && player.name)));

const player = invictus.players[0];
const collision = { ...invictus, id: 98765, players: [player] };
const context = vm.createContext({ snapshot, invictus, player, collision, assert });
vm.runInContext(body + `
  assert.equal(SEH_winterTeam(snapshot, ["6709", 6709]), invictus);
  assert.equal(SEH_winterTeam(snapshot, [0]), null);
  assert.equal(SEH_winterTeam({ teams:[invictus, collision] }, [6709, 98765]), null);
  assert.equal(SEH_winterPlayerTeams({ teams:[invictus] }).get(player.id), invictus);
  assert.equal(SEH_winterPlayerTeams({ teams:[invictus, collision] }).get(player.id), null);
  assert.match(SEH_winterLabel(invictus), /Winter · Anmäld · ansökt:/);
  assert.match(SEH_winterTeamUrl(invictus), /section=teams&teamId=6709$/);
  const swedish = { team_id: 1, effective_country: "SE", sports_gamer_team_ids: ["6709", "6710"] };
  const foreign = { team_id: 2, effective_country: "FI", sports_gamer_team_ids: [98765] };
  const all = { teams: [collision, invictus] };
  const result = SEH_winterSwedishTeams(all, [swedish, swedish, foreign]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, invictus.id);
  assert.equal(result[0].players, invictus.players);
  assert.equal(result[0].club, swedish);
  assert.equal(SEH_winterSwedishTeams(all, [swedish, { ...swedish, team_id: 3 }]).length, 0);
  const refuse = snapshot.teams.find((team) => team.id === 4523 && team.players.some((player) => player.id === 4596));
  assert.ok(refuse);
  const jeppe = { player_key: "jeppe-profile", player_country: "SE", sports_gamer_player_url: "https://sportsgamer.gg/players/4596", team_external_id: 6987, team_name_in_tournament: "MRAZIX", division: "Pro", league_id: 508 };
  const threeStars = { ...jeppe, team_external_id: 5979, team_name_in_tournament: "Three Stars" };
  const move = { player_id: 4596, transfer_date: "2026-04-21", to_team_id: 6987 };
  const moves = SEH_winterTransferRows(snapshot, [jeppe, threeStars], [move]);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].from_team, "MRAZIX");
  assert.equal(moves[0].to_team, "Refuse Too Lose");
  assert.equal(moves[0].to_division, "Lite");
  assert.equal(moves[0].transfer_date, undefined);
  assert.equal(SEH_winterTransferRows(snapshot, [jeppe, threeStars], []).length, 0);
  assert.equal(SEH_winterTransferRows(snapshot, [{ ...jeppe, team_external_id: 4523 }], []).length, 0);
  assert.equal(SEH_winterTransferRows(snapshot, [{ ...jeppe, player_country: "FI" }], []).length, 0);
`, context);

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
  const newer = { ...snapshot, checkedAt: "2026-12-08T22:00:00Z" };
  const run = (fetch) => vm.runInNewContext(body + "SEH_fetchWinterRosters()", { fetch, AbortController, setTimeout, clearTimeout });
  const response = (data) => ({ ok: true, json: async () => data });
  assert.equal(await run(async (url) => response(url.startsWith("https:") ? newer : snapshot)), newer);
  assert.equal(await run(async (url) => response(url.startsWith("https:") ? { leagueId: 534 } : snapshot)), snapshot);
  console.log("Winter: IDs, division labels, duplicate protection and snapshot fallback verified");
})().catch((error) => { console.error(error); process.exitCode = 1; });
