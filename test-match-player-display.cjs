const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/match-image-generator.js','utf8');
const ctx={window:{},state:{league:'SCL',leagueSeason:'27',rosterSeason:'current',lineupTextMode:'gt_stats',showLineupNumbers:true,lineupNumbers:{},lineupNames:{}},normalize:s=>String(s||'').toLowerCase().trim(),cleanText:(s,n)=>String(s||'').trim().slice(0,n),esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),matchStatsByName:new Map(),matchStatsSeasonLabel:'ECL 26',playerPortraitCrops:new Map(),portraitUrlForPlayer:()=>'',defaultPlayerImageUrl:()=>'',playerFlagSvg:()=>''};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/match-graphics-player-details.js','utf8'),ctx);
vm.runInContext(source.slice(source.indexOf('  const detailSnapshot='),source.indexOf('  const manifestEntries')),ctx);
vm.runInContext(source.slice(source.indexOf('  function portraitCard('),source.indexOf('  function lineupPortraitSquare(')),ctx);
const team={primary:'#123',accent:'#ff0'},card=()=>ctx.portraitCard('LW','Mathiasgamer_07',0,0,286,300,team,{},true);
assert(ctx.matchStatsText('Mathiasgamer_07','LW').includes('SCL 27 · GP 12 · G 28 · A 20 · P 48'),'Norwegian player gets current stats');
assert.equal(ctx.lineupNumber('LW','Mathiasgamer_07'),'41');
assert(ctx.matchStatsText('therozz94','G').includes('SV% 79.4'),'Fractional save percentage must be shown as percent');
for(const [mode,name,stats] of [['gt',false,false],['gt_name',true,false],['gt_stats',false,true],['gt_stats_name',true,true]]){
 ctx.state.lineupTextMode=mode;const svg=card();assert(svg.includes('Mathiasgamer_07'));
 assert.equal(svg.includes('MATHIAS VÅGAN'),name,mode);assert.equal(svg.includes('SCL 27 · GP'),stats,mode);
 if(name){const match=svg.match(/textLength="([\d.]+)"[^>]*data-player-name-width="([\d.]+)"/);assert(match);assert(Number(match[1])<=Number(match[2]));}
 assert(svg.includes('#41'));assert(!/NaN|undefined/.test(svg));
}
ctx.state.showLineupNumbers=false;assert(!card().includes('#41'));
ctx.state.showLineupNumbers=true;ctx.state.lineupNumbers.LW='99';ctx.state.lineupNames.LW='<Custom Name>';assert(card().includes('#99'));assert(card().includes('&lt;CUSTOM NAME>'));
assert.equal(ctx.matchStatsText('Missing player','LW'),'');
assert.equal(ctx.matchStatsText('Mathiasgamer_07','G'),'');
ctx.state.league='ECL';assert.equal(ctx.matchStatsText('Mathiasgamer_07','LW'),'','Current SCL stats cannot leak into ECL');
console.log('Four card modes, nationalities, source labels, profile/manual names and numbers, escaping and missing/other-season stats passed.');
