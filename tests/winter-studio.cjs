const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const snapshot=JSON.parse(read("ecl27-winter-rosters.json"));
assert.equal(snapshot.leagueId,535);
assert.ok(snapshot.teams.every(t=>t.captainIds.length>=1 && t.captainIds.length<=3));
assert.ok(snapshot.teams.every(t=>t.captainIds.every(id=>Number.isSafeInteger(id)&&id>0)));

async function access(permission,query="?mode=admin",signedIn=true) {
  const main={hidden:true,before(){}},notice={style:{},setAttribute(){},remove(){},append(){}};
  const window={
    SEH_CONFIG:{supabaseUrl:"https://test.invalid",supabasePublishableKey:"public"},
    SEH_WINTER_STUDIO:{load:async()=>({teams:[{id:7080,name:"Havoc HC",localTeamId:10},{id:7069,name:"SSK Academy eSport",localTeamId:20}]})},
    supabase:{createClient:()=>({auth:{getUser:async()=>({data:{user:signedIn?{}:null}})},
      rpc:async(name)=>{assert.equal(name,"seh_winter_studio_access");return {data:permission};}})}
  };
  const context={window,location:{search:query},URLSearchParams,document:{querySelector:()=>main,createElement:()=>notice}};
  vm.runInNewContext(read("winter-studio-access.js"),context);
  return {result:await window.SEH_STUDIO_ACCESS_READY,main,notice};
}

(async()=>{
  assert.equal((await access({is_admin:false,teams:[]})).result,null,"query-string admin is not an admin");
  assert.equal((await access({is_admin:true,teams:[]}, "?mode=admin",false)).result,null,"login is required");
  assert.equal((await access({is_admin:true,teams:[]})).result.mode,"admin");
  const captain={is_admin:false,teams:[{teamId:7080}]};
  const own=await access(captain,"?mode=admin&teamId=10");
  assert.equal(own.result.mode,"captain","server role beats query string");
  assert.equal(own.result.teamName,"Havoc HC");
  assert.equal(own.main.hidden,false);
  assert.equal((await access(captain,"?mode=captain&teamId=20")).result,null,"captain cannot pick another team");
  assert.equal((await access(captain,"?mode=admin")).result.teamName,"Havoc HC","direct link finds captain's actual team");

  const window={SEH_CONFIG:{supabaseUrl:"https://test.invalid",supabasePublishableKey:"public"}};
  const context={window,URLSearchParams,fetch:async(url)=>{
    const data=url==="ecl27-winter-rosters.json" ? {leagueId:535,teams:[{id:7080,name:"Havoc HC",players:[{id:42,name:"CurrentPSN"}]}]}
      :url.includes("v_local_team_list")?[{team_id:10,sports_gamer_team_ids:["7080"],logo_url:"logo.png"}]
      :[{player_key:"key",display_gamertag:"OldPSN",sports_gamer_player_url:"https://sportsgamer.gg/players/42",primary_position:"G"}];
    return {ok:true,json:async()=>data};
  }};
  vm.runInNewContext(read("winter-studio-source.js"),context);
  const source=await window.SEH_WINTER_STUDIO.load();
  assert.equal(source.teams[0].localTeamId,10,"external ID maps to saved local jersey");
  assert.equal(source.teams[0].players[0].name,"CurrentPSN","registration PSN wins");
  assert.equal(source.teams[0].players[0].player_key,"key","identity follows SportsGamer ID");

  const js=read("match-image-generator.js");
  const extract=(from,to)=>js.slice(js.indexOf(from),js.indexOf(to));
  const c={window:{SEH_WINTER_STUDIO:{load:async()=>source}},getPublicRows:async()=>[],normalize:s=>s.toLowerCase(),
    buildWinterPresentationTeam:r=>({id:"winter-"+r.sports_gamer_team_id,sportsGamerTeamId:r.sports_gamer_team_id}),
    hydrateSavedJerseySettings:async()=>{},portraitUrlFromSclPoolRow:()=>"portrait.png",
    winterTeamDirectory:[],winterRostersByTeamId:new Map(),currentLineupDetails:new Map(),
    playerKeysByName:new Map(),playerPortraits:new Map(),playerMetaByName:new Map()};
  vm.runInNewContext(extract("  async function loadWinterPresentationData()", "  async function syncWinterTeamStylesFromEclDirectory()"),c);
  assert.equal(await c.loadWinterPresentationData(),1);
  assert.deepEqual([...c.winterRostersByTeamId.get("winter-7080")],["CurrentPSN"]);
  assert.equal(c.winterTeamDirectory[0].jerseyTeamId,10);
  assert.equal(c.currentLineupDetails.size,0,"no SCL numbers presented as Winter statistics");
  assert.ok(js.includes('league:"ECL"')&&js.includes('leagueSeason:"27 Winter"'));
  assert.ok(!js.includes("source_league_id=eq.527"));
  console.log("Winter studio: registered roster, identity mapping, captain/admin gates, other-team denial and stats isolation passed.");
})().catch(error=>{console.error(error);process.exitCode=1});
