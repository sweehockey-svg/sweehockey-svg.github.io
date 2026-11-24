const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"../ecl27-team-builds-v2.js"),"utf8");
const block=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b));
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const context={esc,norm:s=>s.toLowerCase(),initials:()=>"RT",teamUrl:()=>"#/old",
  officialSclBadge:()=>"",statusFor:()=>({key:"thin",tone:"orange",label:"Tunt"}),
  logoUrl:()=>"local-logo.png",teamBuildUrl:()=>"#/lagbygge?ecl27lag=old",
  playerLink:n=>`<a>${esc(n)}</a>`,renderRecruitment:()=>'<p>LAGET SÖKER</p>',
  renderMove:r=>`<p>${esc(r.player)}</p>`,teamId:()=>40,SEH_WINTER_DIVISIONS:{542:"Lite"},
  window:{SEH_playerProfileUrl:(id,name)=>"#/spelare/"+id}};
vm.createContext(context);
vm.runInContext(block("  function renderTeamHeader(","  function numeric(")
  +block("  function renderTeamPowerStrip(","  function applyTeamPowerToDom(")
  +block("  function renderTeamCard(","  function renderDiscordMoves(")
  +block("  function registeredWinterCardModel(","  function hydrateWinterMoves("),context);
const registration={id:4523,name:"Refuse Too Lose",requestedDivision:542,logoUrl:"official.png",
  club:{team_id:40,logo_url:"old.png"},players:[{id:4596,name:"<Jeppe>"}]};
const history={name:"Earlier club name",playersNow:["Old roster"],timeline:[{player:"Actual move"}],
  inCount:2,outCount:1,recruitment:{seeks:"Obsolete recruitment"}};
const model=context.registeredWinterCardModel(registration,[history]);
assert.deepEqual([...model.playersNow],["<Jeppe>"],"only current registered roster is used");
assert.equal(model.powerLookupName,"Earlier club name","historical stats follow mapped identity");
const html=context.renderRegisteredWinterCard(registration,false,[history]);
for(const className of ["ecl27v2-card is-clickable","ecl27v2-watermark","ecl27v2-metrics","ecl27v2-teamrp","ecl27v2-roster","ecl27v2-moves"])
  assert.ok(html.includes(className),className);
assert.match(html,/ECL ’27 WINTER · ANMÄLT/);
assert.match(html,/Ansökt: <strong>Lite<\/strong> · preliminär/);
assert.match(html,/data-winter-roster="4523"/);
assert.match(html,/#\/sasong\/ecl27winter\?section=teams&amp;teamId=4523/);
assert.match(html,/#\/lag\/40/);
assert.match(html,/src="official.png"/);
assert.match(html,/#\/spelare\/4596[^>]*>&lt;Jeppe&gt;/);
assert.match(html,/IN · UNDERLAG/);
assert.match(html,/Actual move/);
assert.ok(!html.includes("Old roster")&&!html.includes("LAGET SÖKER"));
assert.match(html,/https:\/\/sportsgamer.gg\/leagues\/535\/teams\/4523/);
const unknown=context.renderRegisteredWinterCard(registration,false,[]);
assert.match(unknown,/class="in">–/,"unknown movements are not fabricated zero counts");
console.log("Registered cards share build layout, official roster, provisional division, links and verified historical data.");
