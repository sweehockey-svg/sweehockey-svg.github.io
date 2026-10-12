const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../webapp-shell.js'),'utf8');
const block=source.slice(source.indexOf('  let sehApprovedPortraits='),source.indexOf('  function sehWebAppPlayerImage('));
let now=100000,calls=0,fail=false;
const player={key:'bjorkudd-key',name:'Bjorkudd_39',photo:'https://example.org/players/11761.png',sehOriginalPhoto:'https://example.org/players/11761.png'};
const portrait={src:player.photo,dataset:{},getAttribute(){return this.src;}};
let approved=[{player_key:'bjorkudd-key',display_gamertag:'Bjorkudd_39',sports_gamer_player_id:'11761',image_url:'https://example.org/published/new.png'}];
const events={},timers=[];
const context=vm.createContext({Map,Promise,String,Array,Date:class extends Date{static now(){return now;}},console:{warn(){}},
 document:{hidden:false,addEventListener(name,fn){events[name]=fn;},querySelectorAll(){return [portrait];}},
 setInterval(fn){timers.push(fn);},sehZeroPlayer:{all:[player]},route:()=>({kind:'player'}),sehReadFastProfileNav:()=>player,
 zeroApplyLocalPlayerControls(){},sehTeamDirectRest:async(table,params)=>{calls++;assert.equal(table,'v_ehockey_player_self_profiles_public');assert.equal(params.image_url,'not.is.null');if(fail)throw Error('Offline');return approved;}
});
vm.runInContext(block+'\nthis.api={refresh:sehRefreshApprovedPortraits,resolve:sehApprovedPortraitFor,apply:sehApplyApprovedPortraitRows};',context);
(async()=>{
 await Promise.all([context.api.refresh(),context.api.refresh()]);
 assert.equal(calls,1);assert.equal(player.photo,approved[0].image_url);assert.equal(portrait.src,approved[0].image_url);
 assert.equal(context.api.resolve({sports_gamer_player_url:'https://sportsgamer.gg/players/11761'}),approved[0].image_url);
 assert.equal(context.api.resolve({name:' bjorkudd_39 '}),approved[0].image_url);
 assert.equal(context.api.resolve({key:'other',name:'Unknown'}),'');
 await context.api.refresh();assert.equal(calls,1);
 now+=31000;approved=[{...approved[0],image_url:'https://example.org/published/newer.png'}];
 await context.api.refresh();assert.equal(portrait.src,approved[0].image_url);assert.equal(player.photo,approved[0].image_url);
 now+=31000;fail=true;await context.api.refresh();assert.equal(player.photo,approved[0].image_url);
 fail=false;approved=[];now+=31000;await context.api.refresh();assert.equal(player.photo,player.sehOriginalPhoto);assert.equal(portrait.src,player.sehOriginalPhoto);
 context.api.apply([{player_key:'unsafe',image_url:'javascript:alert(1)'}]);assert.equal(context.api.resolve({key:'unsafe'}),'');
 assert.equal(typeof events.visibilitychange,'function');assert.equal(timers.length,1);
 console.log('Approved portrait tests passed: key/ID/name matching, concurrent deduplication, cache refresh, original fallback, offline preservation and unsafe URLs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
