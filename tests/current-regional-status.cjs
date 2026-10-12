const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../player-current-status-v1.js'),'utf8');
const leagues=[523,524,527,529,532];
const rows={
 app_player_directory_cache:leagues.map((id,i)=>({player_key:'p'+id,display_gamertag:'Player'+id,sports_gamer_player_url:'https://sportsgamer.gg/players/'+id})),
 v_ehockey_free_agents_public:[{player_key:'p529'}],
 seh_app_competition_states:[],
 sportsgamer_league_roster_current:leagues.filter(id=>id!==529).map(id=>({sports_gamer_league_id:id,sports_gamer_team_id:id,sports_gamer_player_id:id,is_available:id!==524})),
 sportsgamer_league_teams_current:leagues.map(id=>({sports_gamer_league_id:id,sports_gamer_team_id:id,team_name:'Team'+id,is_available:true})),
 sportsgamer_team_player_stats:leagues.map((id,i)=>({sports_gamer_league_id:id,sports_gamer_team_id:id,sports_gamer_player_id:id,display_gamertag:'Player'+id,official_league_name:['WECL 5','German Championship League 13','SCL 2027','FCL 2027','WV 4 Nations 2026'][i],active_league:1,listed_in_roster:1}))
};
function query(table){let filters=[],start=0,end=999;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},range(a,b){start=a;end=b;return q},limit(){return q},then(resolve,reject){return Promise.resolve({data:(rows[table]||[]).filter(r=>filters.every(f=>f(r))).slice(start,end+1),error:null}).then(resolve,reject)}};return q;}
const context={window:{SEH_CONFIG:{supabaseUrl:'https://test.invalid',supabasePublishableKey:'test'},supabase:{createClient:()=>({from:query})},dispatchEvent(){}},location:{pathname:'/'},CustomEvent:class{},console};
vm.runInNewContext(source,context);
(async()=>{
 const api=context.window.SEH_currentPlayerStatus;
 assert.equal((await api.get('p529')).teamName,'Team529','FCL statistics registration supplies missing broadcast roster and beats FA');
 assert.equal((await api.get('p523')).teamName,'Team523','WECL is current');
 assert.equal((await api.get('p527')).teamName,'Team527','SCL is current');
 assert.equal((await api.get('p524')).kind,'no_team','Explicit roster removal overrides stale statistics');
 rows.sportsgamer_league_roster_current.find(r=>r.sports_gamer_league_id===524).is_available=true;api.invalidate();
 assert.equal((await api.get('p524')).teamName,'Team524','GCL is current');
 assert.equal((await api.get('p532')).kind,'no_team','National team is not a club');
 console.log('Regional status passed: FCL, SCL, WECL, GCL, roster removal, missing broadcast fallback and national-team exclusion.');
})().catch(e=>{console.error(e);process.exitCode=1});
