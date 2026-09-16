const { chromium } = require('C:/Users/TheSw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
 const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const root=path.resolve(__dirname,'..');
 const files=['index.html','app.js','webapp-boot.js','webapp-shell.js','webapp.css','iphone.html','manifest.webmanifest','webapp-sw.js'];
 await page.route('https://www.svenskehockey.se/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   const name=pathname==='/'?'index.html':pathname.slice(1);
   if(files.includes(name))return route.fulfill({path:path.join(root,name),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.webmanifest')?'application/manifest+json':'text/html'});
   return route.continue();
 });
 await page.goto('https://www.svenskehockey.se/?webapp=1#/',{waitUntil:'domcontentloaded'});
 await page.locator('#seh-ob-guest').waitFor({timeout:25000});
 await page.screenshot({path:path.join(root,'webapp-welcome.png')});
 await page.locator('#seh-ob-guest').click();
 const consent = page.getByRole('button',{name:'Endast nödvändiga',exact:true});
 if(await consent.count()) await consent.click();
 await page.locator('#seh-native-bottom').waitFor();
 await page.waitForTimeout(1500);
 await page.screenshot({path:path.join(root,'webapp-home.png')});
 console.log(JSON.stringify({guest:!(await page.locator('#seh-v760-layer.show').count()),nav:await page.locator('#seh-native-bottom').innerText(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors}));
 await page.locator('#seh-native-bottom').getByText('Tävlingar',{exact:true}).click();
 await page.waitForTimeout(1200);
 console.log('Competitions: '+await page.locator('#seh-app-competitions').isVisible());
 await page.setViewportSize({width:320,height:740});
 await page.locator('#seh-native-bottom').getByText('Hem',{exact:true}).click();
 console.log('320px overflow: '+await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await page.locator('#seh-my-profile').click();
 await page.waitForTimeout(700);
 console.log('Guest account: '+await page.locator('#seh-v760-layer').innerText());
 let oauthRedirect='';
 await page.route('**/auth/v1/authorize**',route=>{oauthRedirect=new URL(route.request().url()).searchParams.get('redirect_to');return route.abort();});
 await page.locator('#seh-v760-layer').getByRole('button',{name:'Logga in med Discord',exact:true}).click();
 await page.waitForTimeout(800);
 if(oauthRedirect!=='https://www.svenskehockey.se/') throw new Error('Unexpected OAuth redirect: '+oauthRedirect);
 console.log('OAuth returns to website: true');
 await page.goto('https://www.svenskehockey.se/iphone.html',{waitUntil:'domcontentloaded'});
 await page.screenshot({path:path.join(root,'webapp-install.png')});
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
