const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = name => readFileSync(path.join(root, name), "utf8");
const app = read("app.js");
const section = (start, end) => app.slice(app.indexOf(start), app.indexOf(end));
const host = { querySelectorAll: () => [] };
const search = { value: "", addEventListener() {} };
const summary = {};
const view = { querySelector: id => ({ "#seasonTransferList": host, "#seasonTransferSearch": search, "#seasonTransferSummary": summary })[id] };
const context = {
  URL, window: {}, seasonText: (value, fallback) => value || fallback, seasonNumber: Number,
  escapeHtml: String, SEH_playerProfileUrl: () => "#", SEH_playerImageUrl: () => "", seasonDate: String
};
vm.createContext(context);
vm.runInContext(read("teamlogos-manifest.js") + "\n" +
  section("function SEH_optimizedTeamLogoPath", "function SEH_teamInitials") +
  section("function SEH_winterTeamLogo", "function SEH_winterClubStatus") +
  section("  function seasonCurrentTransferTeams", "  function seasonTeamCardHeader"), context);

const base = "https://sportsgamer.gg/storage/team-logos/535/";
const academy = { id: 7069, logoUrl: base + "7069/SSK Academy.png" };
assert.equal(context.SEH_winterTeamLogo(academy), base + "7069/SSK%20Academy.png");
assert.equal(context.SEH_winterTeamLogo({ ...academy, id: 7080 }), "");
assert.equal(context.SEH_winterTeamLogo({ ...academy, logoUrl: "/images/no-logo.jpg" }), "");
assert.equal(context.SEH_winterTeamLogo({ ...academy, logoUrl: academy.logoUrl.replace("sportsgamer.gg", "other.example") }), "");
assert.ok(context.SEH_teamLogoCandidates([], "Havoc HC").some(url => url.includes("/535/7080/")));
assert.ok(context.SEH_teamLogoCandidates([], "SSK Academy eSport").some(url => url.includes("/535/7069/")));
assert.equal(context.SEH_teamLogoCandidates([], "VALOR").length, 0);

context.initializeSeasonTransfers(view, { overgangar: [{
  Player: "Player", nationality: "SE",
  From: "Historical team", FromTeamID: academy.id, FromLeagueID: 509,
  To: "Winter team", ToTeamID: academy.id, ToLeagueID: 535
}] }, { leagueId: 535, teams: [academy] });
assert.match(host.innerHTML, /data-team-name="Historical team" data-logo-url="" data-registration-logo=""/);
assert.match(host.innerHTML, /data-team-name="Winter team" data-logo-url="" data-registration-logo="https:\/\/sportsgamer\.gg\/storage\/team-logos\/535\/7069\/SSK%20Academy\.png"/);
console.log("Winter transfer logos: verified fallback URLs, identity match, and no historical override.");
const snapshot={leagueId:535,teams:[{id:4216,name:"Burchurs HC"},{id:7023,name:"Penta"}]};
const old={Player:"Anan20",From:"Macho HC",FromTeamID:4216,FromLeagueID:509,To:"Macho HC",ToTeamID:4216,ToLeagueID:535};
const renamed=context.seasonCurrentTransferTeams([old],snapshot)[0];
assert.equal(renamed.To,"Burchurs HC");
assert.equal(renamed.OriginalTo,"Macho HC");
assert.equal(renamed.From,"Macho HC","historical source team must remain unchanged");
assert.equal(old.To,"Macho HC","do not mutate imported evidence");
assert.equal(context.seasonCurrentTransferTeams([{...old,To:"eHockey Switzerland",ToTeamID:7023}],snapshot)[0].To,"Penta");
assert.equal(context.seasonCurrentTransferTeams([{...old,ToTeamID:999}],snapshot)[0].To,"Macho HC","no text-only alias guessing");
assert.equal(context.seasonCurrentTransferTeams([{...old,ToLeagueID:509}],snapshot)[0].To,"Macho HC","other seasons retain their names");
assert.equal(context.seasonCurrentTransferTeams([old],null)[0].To,"Macho HC","missing snapshot retains source");
context.initializeSeasonTransfers(view,{overgangar:[{...old,nationality:"SE"}]},snapshot);
assert.match(host.innerHTML,/data-team-name="Burchurs HC"/);
console.log("Current Winter destination names follow exact registered team IDs; historical names and raw evidence preserved.");
