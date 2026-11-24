const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../ecl27-team-builds-v2.js"),"utf8");
const helper=source.slice(source.indexOf("  function reconcileRegisteredBuildPlayers("),source.indexOf("  let currentBuildStateRequest"));
const aliases={"previous alias":"current alias"};
const normalize=name=>name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const context={playerKey:name=>aliases[normalize(name)]||normalize(name),
  sportsGamerId:url=>/\/players\/(\d+)/.exec(url||"")?.[1]||""};
vm.runInNewContext(helper,context);
const reconcile=context.reconcileRegisteredBuildPlayers;
const history=[{type:"in",player:"Supremski"}];
const builds=[{name:"Sjukstugan",playersNow:["lbjonol","Nephenzy","Robbin974","Supremski"],timeline:history},
  {name:"Other build",playersNow:["Previous Alias","OldPSN","Different Player"],timeline:[]}];
const registered=[{name:"Brynäs IF Esport",players:[{id:100,name:"Supremski"}]},
  {name:"Foreign club",players:[{id:200,name:"Current Alias"},{id:300,name:"NewPSN"}]}];
const identity=[{display_gamertag:"OldPSN",sports_gamer_player_url:"https://sportsgamer.gg/players/300"},
  {display_gamertag:"Different Player",sports_gamer_player_url:"https://sportsgamer.gg/players/400"}];
const result=reconcile(builds,registered,identity);
assert.deepEqual([...result[0].playersNow],["lbjonol","Nephenzy","Robbin974"]);
assert.deepEqual([...result[1].playersNow],["Different Player"],"foreign registration, aliases and renamed PSN");
assert.equal(result[0].timeline,history,"history remains untouched");
assert.equal(builds[0].playersNow.length,4,"do not mutate historical base state");
assert.equal(reconcile(builds,[],identity)[0].playersNow.length,4,"removing registration restores base membership");
assert.equal(reconcile(builds,registered,identity)[0].playersNow.length,3,"repeatable, not cumulative");
assert.equal(result[0].playersNow.length,result[0].playersNow.filter(name=>name!=="Supremski").length);
console.log("Registered Winter players excluded from build rosters: counts, aliases, IDs, foreign clubs, detail data and preserved history.");
