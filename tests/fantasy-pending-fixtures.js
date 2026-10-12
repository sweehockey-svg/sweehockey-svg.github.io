(() => {
  'use strict';
  if(location.hostname !== '127.0.0.1') throw new Error('Local preview only');
  window.EHOCKEY_CONFIG = {supabaseUrl:'https://fantasy-preview.invalid',supabasePublishableKey:'local-fixture-not-a-key'};
  const key='sb-fantasy-preview-auth-token', teamKey='seh-fantasy-local-team';
  const user={id:'local-user',app_metadata:{provider:'discord'},user_metadata:{full_name:'Testspelaren'}};
  let session=JSON.parse(localStorage.getItem(key)||'null');
  const listeners=[];
  const result=data=>({data,error:null});
  const positions=['LW','C','RW','LD','RD','G'];
  const competition={id:1,code:'LOCAL',competition_code:'ECL',name:'Lokal testliga',season_label:'Lokal testliga',status:'open',budget:90,max_players_per_real_team:2,captain_multiplier:1.5,transfers_enabled:true,lock_at:null,settings:{beta_mode:true,beta_source:'Påhittade testdata',brand_logo:'/assets/test.svg'}};
  const pool=Array.from({length:12},(_,i)=>({id:i+1,competition_id:1,display_gamertag:'Testspelare '+(i+1),primary_position:positions[i%6],eligible_slots:[positions[i%6]],real_team_id:i%3+1,real_team_name:['Testlaget Blå','Testlaget Gul','Testlaget Vit'][i%3],country_code:'SE',price:i<6?10:15,is_available:true}));
  const saved=()=>JSON.parse(localStorage.getItem(teamKey)||'null');
  const baseline=positions.map((slot,i)=>({slot,pool_player_id:i+1,is_captain:i===0,locked_price:10}));
  const entry=()=>saved()?{id:1,competition_id:1,user_id:user.id,total_points:0,team_name:'Mitt testlag'}:null;
  function rows(table) {
    switch(table){
      case 'ehockey_fantasy_competitions':return [competition];
      case 'ehockey_fantasy_player_pool':return pool;
      case 'v_ehockey_fantasy_leaderboard':return [{competition_id:1,entry_id:99,current_rank:1,team_name:'Exempellaget',total_points:123}];
      case 'ehockey_fantasy_entries':return entry()?[entry()]:[];
      case 'ehockey_fantasy_entry_players':return (saved()||[]).map(p=>({...p,entry_id:1,locked_price:pool.find(x=>x.id===p.pool_player_id).price}));
      case 'ehockey_fantasy_player_scores':return [];
      default:throw new Error('Missing local fixture: '+table);
    }
  }
  function from(table){
    const filters=[];let single=false,limit=Infinity;
    const query={select(){return query},eq(k,v){filters.push(r=>r[k]===v);return query},in(k,vs){filters.push(r=>vs.includes(r[k]));return query},order(){return query},range(){return query},limit(n){limit=n;return query},maybeSingle(){single=true;return query},then(resolve,reject){return Promise.resolve().then(()=>{const data=rows(table).filter(r=>filters.every(f=>f(r))).slice(0,limit);return result(single?(data[0]||null):data)}).then(resolve,reject)}};
    return query;
  }
  async function rpc(name,args={}) {
    switch(name){
      case 'seh_fantasy_public_insights':return result({ownership:[],ownership_visible:false});
      case 'seh_fantasy_get_my_account':return result({status:session?(localStorage.getItem('fixture-account-status')||'approved'):'unlinked',player_key:'local-player',player_name:'Testspelaren'});
      case 'seh_fantasy_my_transfer_state':return result({mode:'round',free_transfers:1,pending_changes:baseline.some(b=>!(saved()||[]).some(p=>p.slot===b.slot&&p.pool_player_id===b.pool_player_id&&p.is_captain===b.is_captain)),baseline_roster:baseline,target_round:{id:2,name:'Period 2',lock_at:'2070-10-12T16:00:00Z'}});
      case 'seh_fantasy_my_saved_score_breakdown':return result(baseline.map(p=>({...p,is_current:true,games:2,team_points:12,last_round_no:1,round_breakdown:[]})));
      case 'seh_fantasy_public_player_detail':return result({ok:false});
      case 'seh_fantasy_public_entry_roster':return result({ok:false});
      case 'seh_fantasy_save_my_team':{
        const picks=args.p_picks||[],players=picks.map(p=>pool.find(x=>x.id===p.pool_player_id));
        if(!session || args.p_competition_code!=='LOCAL' || picks.length!==6 || new Set(picks.map(p=>p.slot)).size!==6 || new Set(picks.map(p=>p.pool_player_id)).size!==6 || picks.filter(p=>p.is_captain).length!==1 || players.some((p,i)=>!p||!p.eligible_slots.includes(picks[i].slot)) || players.reduce((s,p)=>s+p.price,0)>90 || players.some(p=>players.filter(x=>x.real_team_id===p.real_team_id).length>2)) return {data:null,error:{message:'Ogiltigt lokalt testlag'}};
        window.fixtureSaves=(window.fixtureSaves||0)+1;window.fixtureSavedPicks=picks;
        localStorage.setItem(teamKey,JSON.stringify(picks.map(p=>({...p,locked_price:10}))));return result({transfer:{unlimited:false,count:0,paid_count:0,penalty_points:0}});
      }
      default:throw new Error('Missing local RPC: '+name);
    }
  }
  window.supabase={createClient(url,unused,options={}){
    if(url!==window.EHOCKEY_CONFIG.supabaseUrl || options.auth?.storageKey) throw new Error('Preview requires shared default session storage');
    return {from,rpc,auth:{
      getSession:async()=>result({session}),
      onAuthStateChange(fn){listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
      async signInWithOAuth(){session={user};localStorage.setItem(key,JSON.stringify(session));listeners.forEach(fn=>fn('SIGNED_IN',session));return result({})},
      async signOut(){session=null;localStorage.removeItem(key);listeners.forEach(fn=>fn('SIGNED_OUT',null));return result({})}
    }};
  }};
  // Prevent leaving the isolated preview through external links.
  document.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(a&&new URL(a.href).origin!==location.origin)event.preventDefault()},true);
})();
