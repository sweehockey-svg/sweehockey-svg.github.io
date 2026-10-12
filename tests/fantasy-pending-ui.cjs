const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/TheSw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=path.resolve(__dirname,'../Fantasy');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const send=(body,type)=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
 if(url.pathname==='/Fantasy/'){
  let html=fs.readFileSync(path.join(source,'index.html'),'utf8');
  html=html.replace(/<script\b[^>]*src="(?:https:[^"]+|\.\.\/config\.js[^"]*)"[^>]*><\/script>/g,'');
  return send(html.replace('<head>','<head><script src="/fixtures.js"></script>'),'text/html');
 }
 if(url.pathname==='/fixtures.js')return send(fs.readFileSync(path.join(__dirname,'fantasy-pending-fixtures.js')),'text/javascript');
 if(url.pathname==='/Fantasy/app.js')return send(fs.readFileSync(path.join(source,'app.js')),'text/javascript');
 if(url.pathname==='/Fantasy/style.css')return send(fs.readFileSync(path.join(source,'style.css')),'text/css');
 res.writeHead(404);res.end();
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.addInitScript(()=>{
   const slots=['LW','C','RW','LD','RD','G'];
   localStorage.setItem('sb-fantasy-preview-auth-token',JSON.stringify({user:{id:'local-user',app_metadata:{provider:'discord'}}}));
   localStorage.setItem('seh-fantasy-local-team',JSON.stringify(slots.map((slot,i)=>({slot,pool_player_id:i===0?7:i+1,is_captain:i===0,locked_price:10}))));
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/Fantasy/?competition=LOCAL&lang=sv');
  try {await page.locator('#restorePendingTeam').waitFor({state:'visible',timeout:10000});}
  catch(error){console.log(await page.locator('body').innerText());console.log(errors);throw error;}
  assert.match(await page.locator('#pendingTransferNote').textContent(),/ändra eller ångra/);
  assert.match(await page.locator('#formerPlayersList').textContent(),/Spelar kvar i pågående period/);
  assert.match(await page.locator('#formerPlayersSection h4').textContent(),/Periodlag och historik/);
  await page.locator('#restorePendingTeam').click();
  await page.waitForFunction(()=>window.fixtureSaves===1);
  await page.locator('#restorePendingTeam').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.fixtureSavedPicks.find(p=>p.slot==='LW').pool_player_id),1);
  assert.equal(await page.evaluate(()=>window.fixtureSavedPicks.find(p=>p.slot==='LW').is_captain),true);
  assert.equal(await page.locator('#formerPlayersSection').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Pending-transfer UI passed: active player label, deadline explanation, undo restores roster/captain, button hides after restore, no browser errors.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
