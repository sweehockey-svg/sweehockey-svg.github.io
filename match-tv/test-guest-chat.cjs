const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/TheSw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const html=fs.readFileSync(__dirname+'/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<iframe\b[\s\S]*?<\/iframe>/g,'').replace(/<link[^>]*>/g,'');
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:1000}});await context.route('https://chat.fixture/**',r=>r.fulfill({contentType:'text/html',body:html}));
   async function open(admin){
    const page=await context.newPage();await page.goto('https://chat.fixture/match-tv/');await page.addStyleTag({content:fs.readFileSync(__dirname+'/chat.css','utf8')});
    await page.evaluate(admin=>{
     window.EHOCKEY_CONFIG={supabaseUrl:'fixture',supabasePublishableKey:'public'};window.calls=[];window.pending=[];window.messages=[];window.admin=admin;window.bans=[];
     window.supabase={createClient:()=>({auth:{onAuthStateChange:()=>{}},rpc:async(name,args)=>{
      calls.push({name,args});
      if(name==='seh_match_tv_chat_identity')return{data:{can_write:false,is_admin:window.admin}};
      if(name==='seh_match_tv_chat_list')return{data:window.messages};
      if(name==='seh_match_tv_chat_moderation')return{data:{pending:window.pending,bans:window.bans}};
      if(name==='seh_match_tv_chat_guest_send'){window.pending.push({id:'1',sender_kind:'guest',gamertag:args.p_name,body:args.p_body,created_at:new Date().toISOString(),can_block_ip:true});return{data:'1'};}
      if(name==='seh_match_tv_chat_moderate'){
       if(!window.admin)return{error:{message:'Denied'}};
       if(args.p_action==='approve')window.messages.push({...window.pending[0]});
       window.pending=[];return{data:null};
      }return{data:null};
     }})};
    },admin);
    await page.addScriptTag({content:fs.readFileSync(__dirname+'/guest-chat.js','utf8')});await page.waitForFunction(()=>!document.getElementById('chatSend').disabled);return page;
   }
   const guest=await open(false);await guest.locator('#chatGuestName').fill('Testgäst');await guest.locator('#chatBody').fill('<img src=x onerror=alert(1)>');await guest.locator('#chatSend').click();
   await guest.waitForFunction(()=>document.getElementById('chatError').textContent.includes('godkännande'));
   assert.equal(await guest.locator('#chatMessages .chat-message').count(),0,'pending guest is not public');assert(await guest.locator('#chatModeration').isHidden());
   const sent=await guest.evaluate(()=>calls.find(c=>c.name==='seh_match_tv_chat_guest_send'));assert.match(sent.args.p_token,/^[a-f0-9]{64}$/);assert.equal(sent.args.p_name,'Testgäst');
   assert(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'guest layout fits');
   if(width===1280)await guest.screenshot({path:__dirname+'/guest-chat-form-test.png',fullPage:true});
   const admin=await open(true);await admin.evaluate(()=>{window.pending=[{id:'q1',gamertag:'Testgäst',body:'Testmeddelande för godkännande <script>',created_at:new Date().toISOString(),can_block_ip:true}];});
   await admin.waitForFunction(()=>document.querySelectorAll('#chatPending .chat-message').length===1,{timeout:7000});
   assert(await admin.getByRole('button',{name:'Godkänn',exact:true}).isVisible());assert.equal(await admin.locator('#chatPending script').count(),0,'user content is text only');
   if(width===1280)await admin.screenshot({path:__dirname+'/guest-chat-moderation-test.png',fullPage:true});
   await admin.getByRole('button',{name:'Godkänn',exact:true}).click();await admin.waitForFunction(()=>document.querySelectorAll('#chatMessages .chat-message').length===1);
   assert.equal(await admin.locator('#chatMessages .chat-badge').innerText(),'Gäst');assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'moderation layout fits');
   await context.close();
  }
  console.log('PASS guest name/token and pending receipt, no public pending post, admin-only panel, approve and guest label, XSS-safe text, 390/1280 layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
