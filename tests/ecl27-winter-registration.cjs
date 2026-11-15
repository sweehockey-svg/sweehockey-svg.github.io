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
`, context);

(async () => {
  const newer = { ...snapshot, checkedAt: "2026-12-08T22:00:00Z" };
  const run = (fetch) => vm.runInNewContext(body + "SEH_fetchWinterRosters()", { fetch, AbortController, setTimeout, clearTimeout });
  const response = (data) => ({ ok: true, json: async () => data });
  assert.equal(await run(async (url) => response(url.startsWith("https:") ? newer : snapshot)), newer);
  assert.equal(await run(async (url) => response(url.startsWith("https:") ? { leagueId: 534 } : snapshot)), snapshot);
  console.log("Winter: IDs, division labels, duplicate protection and snapshot fallback verified");
})().catch((error) => { console.error(error); process.exitCode = 1; });
