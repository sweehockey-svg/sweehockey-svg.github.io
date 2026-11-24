const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'ecl27-team-builds-v2.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'scripts/correct-ecl27-player-aliases.sql'),'utf8');
const aliases=Object.fromEntries([...sql.matchAll(/\('([^']+)','[^']+','([^']+)'\)/g)].map(m=>[m[1],m[2]]));
assert.equal(aliases.poppen,'Ztarsailor');
assert.equal(aliases.henk,'Zonkji v');
assert.equal(aliases.strandh85,'casse 33 40');
const teams=[{name:'N E O N X',players:['Poppen','Ztarsailor']},
  {name:'BIK Karlskoga',players:['henk','strandh85','itsWalsy']},{name:'Havoc HC',players:[]}];
const ctx={DATA:{aliases,springTeams:teams,moveEvents:[
  {at:'2026-10-19',team:'BIK Karlskoga',type:'out',player:'Zonkji v'},
  {at:'2026-10-19',team:'BIK Karlskoga',type:'out',player:'casse 33 40'},
  {at:'2026-10-22',team:'Havoc HC',type:'in',player:'Zonkji v'}]},
  teamDefs:teams,registeredDisplay:new Map(),norm:s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ')};
vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('  function canonical('),src.indexOf('  function esc('))+
  src.slice(src.indexOf('  function buildModel('),src.indexOf('  const model = buildModel();'))+'\nresult=buildModel();',ctx);
const byName=Object.fromEntries(ctx.result.teams.map(t=>[t.name,t]));
assert.deepEqual([...byName['N E O N X'].playersNow],['Ztarsailor'],'old and new name count once');
assert.deepEqual([...byName['BIK Karlskoga'].playersNow],['itsWalsy'],'later OUT removes old source aliases');
assert.deepEqual([...byName['Havoc HC'].playersNow],['Zonkji v']);
const source=fs.readFileSync(path.join(root,'ecl27-team-builds-source-enrichment.js'),'utf8');
const aliasLoop=source.slice(source.indexOf('    for (const row of events || [])'),source.indexOf('    const byId ='));
vm.runInNewContext(aliasLoop,{aliases,events:[{source_gamertag:'henk',display_gamertag:'Outdated name'}]});
assert.equal(aliases.henk,'Zonkji v','confirmed alias survives stale event label');
console.log('Confirmed aliases deduplicate rosters and apply later OUT/IN events to the same player.');
