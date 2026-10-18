const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sent=[],events={},elements={};
const el=id=>elements[id]||=( {textContent:'',attrs:{},events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;}} );
const frame=el('broadcast');frame.getAttribute=()=> 'https://swnworks.se/broadcast-studio/SV/?obs=1&viewer=1';frame.contentWindow={postMessage:(message,origin)=>sent.push({message,origin})};
const window={addEventListener:(k,fn)=>events[k]=fn};window.parent=window;
vm.runInNewContext(fs.readFileSync(__dirname+'/match-tv.js','utf8'),{window,location:{search:'',origin:'https://www.svenskehockey.se',href:'https://www.svenskehockey.se/match-tv/'},document:{getElementById:el},URL,URLSearchParams,String});
frame.events.load();assert.equal(sent[0].origin,'https://swnworks.se');assert.equal(sent[0].message.muted,true);
el('audio').events.click();assert.equal(sent[1].message.muted,false);assert.equal(sent[1].origin,'https://swnworks.se');
events.message({origin:'https://swnworks.se',source:frame.contentWindow,data:{type:'seh-tv-status',text:'Live',playing:true}});assert.equal(el('statusText').textContent,'Live');
for(const [origin,source] of [['https://evil.test',frame.contentWindow],['https://www.svenskehockey.se',frame.contentWindow],['https://swnworks.se',{}]]){
 events.message({origin,source,data:{type:'seh-tv-status',text:'Wrong'}});assert.equal(el('statusText').textContent,'Live');
}
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert(html.includes('https://swnworks.se/broadcast-studio/SV/?obs=1&amp;viewer=1'));assert(!html.includes('../lab/broadcast-studio/'));
assert(html.includes('https://swnworks.se/broadcast-studio/commentary.js'),'Keep the existing commentator audio controls in Match-TV');
console.log('Match-TV passed: canonical OBS source, cross-origin audio toggle/status, rejected wrong origins and wrong frame windows.');
