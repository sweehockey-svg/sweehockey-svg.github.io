const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../lab/broadcast-studio/broadcast-studio.js'), 'utf8');
const config = source.match(/hls=new Hls\((\{[^\n]+\})\);/)[1];
const settings = vm.runInNewContext('(' + config + ')');
assert.equal(settings.capLevelToPlayerSize, false);
assert.equal(settings.liveSyncDurationCount, 3);
assert.equal(settings.liveMaxLatencyDurationCount, 5);
assert.equal(settings.maxLiveSyncPlaybackRate, 1.1);
assert.equal(settings.liveSyncOnStallIncrease, 0);
assert.ok(!source.includes('if(OBS_MODE_LOCAL&&Array.isArray(hls.levels)'));
const recovery = source.slice(source.indexOf('const recoverLive=()=>{'), source.indexOf('clearInterval(liveWatchTimer);', source.indexOf('const recoverLive=()=>{')));
function check({current, live, active=true, hidden=false, seeking=false, progressAt=Date.now()}) {
  let played=0, restarted=0;
  const ctx={hls:{liveSyncPosition:live,startLoad:()=>restarted++},video:{currentTime:current,hidden,seeking,play:()=>{}},playbackActive:()=>active,tryDirectPlay:()=>played++,lastVideoTime:current-.5,lastVideoProgressAt:progressAt,Date,Number,Math,console,setStatus:()=>{},tx:x=>x};
  vm.runInNewContext(recovery+'recoverLive();',ctx);
  return {...ctx,played,restarted};
}
assert.equal(check({current:90,live:100}).video.currentTime,100);
assert.equal(check({current:90,live:100}).played,1);
assert.equal(check({current:98,live:100}).video.currentTime,98);
assert.equal(check({current:90,live:100,active:false}).video.currentTime,90);
assert.equal(check({current:90,live:100,hidden:true}).video.currentTime,90);
assert.equal(check({current:90,live:100,seeking:true}).video.currentTime,90);
assert.equal(check({current:90,live:NaN}).video.currentTime,90);
console.log('PASS: shared live configuration, drift catch-up, normal playback and inactive/seeking guards');
