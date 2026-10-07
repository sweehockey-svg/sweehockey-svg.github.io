const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../.github/workflows/sync-scl27-official-teams.yml'),'utf8');
const entries=[...source.matchAll(/- cron: '([^']+)'\s+timezone: ([^\s]+)/g)];
assert.equal(entries.length,2);
const expand=field=>field.split(',').flatMap(part=>{const [a,b]=part.split('-').map(Number);return b===undefined?[a]:Array.from({length:b-a+1},(_,i)=>a+i);});
const actual=[];
for(const [,cron,zone] of entries){
  assert.equal(zone,'Europe/Stockholm');
  const [minute,hour,day,month,weekday]=cron.split(' ');
  assert.equal(minute,'0');assert.equal(day,'*');assert.equal(month,'*');
  for(const d of expand(weekday))for(const h of expand(hour))actual.push(`${d}:${h}`);
}
const expected=[];
for(let d=0;d<7;d++)for(let h=0;h<24;h++)if((d<=4&&[21,22,23].includes(h))||(d>=1&&d<=5&&[0,2,9].includes(h)))expected.push(`${d}:${h}`);
assert.deepEqual(actual.sort(),expected.sort());
assert.equal(actual.length,new Set(actual).size);
assert.ok(source.includes("github.event_name == 'schedule' && 'schedule' || 'manual'"));
assert.ok(source.includes('uses: ./.github/workflows/sync-fantasy-sportsgamer.yml'));
assert.ok(source.includes('workflow_dispatch:'));
console.log('PASS: 30 weekly SCL sync slots, Swedish timezone, midnight rollover, shared import and manual trigger preserved');
