(function () {
  const ROOT = 'https://www.svenskehockey.se/';
  const FAVORITES_KEY = 'seh_app_favorites_v1';
  const NOTIFY_KEY = 'seh_app_notifications_wanted_v1';
  const ECL_ROUTE = ''; // Sätt route här när den gömda ECL-statistiken är redo för publik app.
  const isSec = () => location.pathname === '/SEC' || location.pathname.startsWith('/SEC/');

  const icons = {
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    news:'<svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 4h8M8 12h8M8 16h5"/></svg>',
    players:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.4-6 5.5-6s5.1 2 5.5 6M14 15c2.8-.5 5 .9 6 4"/></svg>',
    teams:'<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.3 8.2 8 9 4.7-.8 8-4 8-9V7z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    shop:'<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6zM8 8a4 4 0 0 1 8 0"/></svg>',
    more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    sec:'<svg viewBox="0 0 24 24"><path d="M7 4h10v4c0 3.2-2 5.3-5 6-3-.7-5-2.8-5-6zM9 20h6M12 14v6M5 5H3v2c0 2.4 1.5 4 4 4M19 5h2v2c0 2.4-1.5 4-4 4"/></svg>',
    heart:'<svg viewBox="0 0 24 24"><path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6z"/></svg>',
    share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5"/></svg>',
    back:'<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    bell:'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M10 20h4"/></svg>',
    star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    ecl:'<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM8 10h8M8 14h5"/></svg>'
  };

  const CSS = `
    :root{--seh-native-top:62px;--seh-native-bottom:74px;--seh-bg:#02030a;--seh-panel:#080b14;--seh-text:#f4f1e9;--seh-muted:#9298a2;--seh-gold:#ffd000;--seh-cyan:#62d4cf}
    html.seh-native-app,body.seh-native-app{background:var(--seh-bg)!important;min-height:100%!important;height:auto!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;position:static!important;touch-action:pan-y!important}
    body.seh-native-app{padding-top:var(--seh-native-top)!important;padding-bottom:calc(var(--seh-native-bottom) + env(safe-area-inset-bottom))!important;overscroll-behavior-y:auto!important}
    body.seh-native-app .seh-header,body.seh-native-app .mainNav,body.seh-native-app .mobile-nav,body.seh-native-app .mobile-menu{display:none!important}
    #seh-native-top,#seh-native-bottom,#seh-app-home,#seh-app-more,#seh-app-favorites,#seh-native-loader,#seh-pull-indicator,#seh-offline-banner{font-family:Inter,Arial,sans-serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    #seh-native-top{position:fixed;z-index:2147483000;top:0;left:0;right:0;height:var(--seh-native-top);display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(2,3,10,.97);border-bottom:1px solid rgba(255,255,255,.10);backdrop-filter:blur(16px)}
    #seh-native-top .navbtn{width:40px;height:40px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.035);display:grid;place-items:center;color:var(--seh-text);padding:0}
    #seh-native-top .navbtn svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    #seh-native-top .logo{display:flex;align-items:center;text-decoration:none;margin-right:2px}
    #seh-native-top .logo img{width:63px;max-height:36px;object-fit:contain}
    #seh-native-top .title{min-width:0;flex:1;color:var(--seh-text);font-size:16px;font-weight:850;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #seh-native-top .title small{display:block;color:var(--seh-cyan);font-size:9px;letter-spacing:.14em;margin-bottom:4px}
    #seh-native-top .action-row{display:flex;gap:6px}
    #seh-native-top .navbtn.is-on{color:#ffcf43;border-color:#ffcf4345;background:#ffcf4312}
    #seh-native-bottom{position:fixed;z-index:2147483000;left:0;right:0;bottom:0;min-height:var(--seh-native-bottom);display:grid;grid-template-columns:repeat(5,1fr);padding:4px 5px calc(4px + env(safe-area-inset-bottom));background:rgba(2,3,10,.98);border-top:1px solid rgba(255,255,255,.11);backdrop-filter:blur(18px);box-shadow:0 -10px 28px rgba(0,0,0,.30);transition:.18s ease}
    #seh-native-bottom button,#seh-native-bottom a{border:0;background:transparent;display:flex;min-height:61px;align-items:center;justify-content:center;flex-direction:column;gap:3px;color:#8f949a;text-decoration:none;font-size:10px;font-weight:800;border-radius:12px;position:relative;padding:0}
    #seh-native-bottom svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    #seh-native-bottom .on{color:var(--seh-text);background:#ffd00012}
    #seh-native-bottom .on:before{content:'';position:absolute;top:1px;width:23px;height:3px;border-radius:3px;background:var(--seh-gold)}
    body.seh-consent-open #seh-native-bottom{transform:translateY(115%);opacity:0;pointer-events:none}
    #seh-app-home,#seh-app-directory,#seh-app-more,#seh-app-favorites{position:fixed;z-index:2147481000;left:0;right:0;top:var(--seh-native-top);bottom:calc(var(--seh-native-bottom) + env(safe-area-inset-bottom));background:var(--seh-bg);overflow-y:auto;overscroll-behavior-y:contain;color:var(--seh-text);display:none}
    #seh-app-home.show,#seh-app-directory.show,#seh-app-more.show,#seh-app-favorites.show{display:block}
    .seh-app-page{padding:22px 18px 34px;max-width:760px;margin:0 auto}
    .seh-kicker{color:var(--seh-cyan);font-weight:900;letter-spacing:.08em;font-size:12px;text-transform:uppercase;margin:4px 0 7px}
    .seh-app-page h1{font-size:34px;line-height:1.02;margin:0 0 10px;letter-spacing:-.035em}
    .seh-app-page .lead{color:#b4b8c0;line-height:1.5;margin:0 0 22px;font-size:15px}
    .seh-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .seh-card{border:1px solid rgba(255,255,255,.10);border-radius:18px;background:linear-gradient(145deg,#0b101c,#060811);padding:17px;min-height:132px;color:var(--seh-text);text-decoration:none;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
    .seh-card:before{content:'';position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,var(--seh-gold),transparent 70%);opacity:.9}
    .seh-card .ico{width:38px;height:38px;border-radius:12px;background:#ffffff08;display:grid;place-items:center;color:var(--seh-cyan);margin-bottom:14px}
    .seh-card .ico svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .seh-card strong{font-size:16px;line-height:1.15}.seh-card span{display:block;color:#969ca5;font-size:12px;line-height:1.35;margin-top:5px}
    .seh-card.wide{grid-column:1/-1;min-height:112px}.seh-card.gold .ico{color:#ffd000}.seh-card.disabled{opacity:.58}.seh-badge{position:absolute;right:12px;top:12px;font-size:10px;font-weight:900;color:#02030a;background:#ffd000;padding:5px 8px;border-radius:999px}
    .seh-section-title{display:flex;align-items:center;justify-content:space-between;margin:25px 0 10px}.seh-section-title h2{font-size:17px;margin:0}.seh-section-title small{color:#8d939d}
    .seh-list{display:grid;gap:9px}.seh-list-item{display:flex;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.09);background:#080b13;border-radius:15px;padding:13px;text-decoration:none;color:var(--seh-text)}
    .seh-list-item .bullet{width:38px;height:38px;flex:0 0 38px;border-radius:11px;background:#62d4cf12;color:var(--seh-cyan);display:grid;place-items:center}.seh-list-item .bullet svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9}.seh-list-item strong{font-size:14px}.seh-list-item span{display:block;color:#8d939d;font-size:11px;margin-top:3px}
    .seh-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(255,255,255,.09);background:#080b13;border-radius:15px;padding:14px}.seh-switch{width:50px;height:28px;border:0;border-radius:20px;background:#303641;padding:3px;position:relative}.seh-switch:after{content:'';display:block;width:22px;height:22px;border-radius:50%;background:#fff;transition:.18s}.seh-switch.on{background:#ffd000}.seh-switch.on:after{transform:translateX(22px);background:#101216}
    .seh-note{font-size:11px;line-height:1.4;color:#858b95;margin-top:8px}
    #seh-native-loader{position:fixed;z-index:2147482500;left:0;right:0;top:var(--seh-native-top);bottom:calc(var(--seh-native-bottom) + env(safe-area-inset-bottom));background:#02030af4;padding:28px 20px;display:none;pointer-events:none}.seh-loading #seh-native-loader{display:block}
    .sk{height:18px;border-radius:8px;background:linear-gradient(90deg,#111621,#1b2230,#111621);background-size:220% 100%;animation:sh 1.1s infinite}.sk.hero{height:90px;margin:24px 0 18px}.sk.row{margin:12px 0}.sk.short{width:60%}@keyframes sh{0%{background-position:100%}100%{background-position:-100%}}
    #seh-pull-indicator{position:fixed;z-index:2147483100;top:66px;left:50%;transform:translate(-50%,-70px);opacity:0;background:#101520;border:1px solid #ffffff16;border-radius:999px;padding:9px 13px;color:#d8dbe0;font-size:11px;font-weight:800;transition:.12s;pointer-events:none}#seh-pull-indicator.show{opacity:1}
    #seh-offline-banner{position:fixed;z-index:2147483200;left:12px;right:12px;top:70px;background:#33240d;color:#f6d78a;border:1px solid #f4b74055;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800;text-align:center;display:none}#seh-offline-banner.show{display:block}
    .seh-empty{text-align:center;color:#8f949a;padding:34px 16px;border:1px dashed #ffffff1a;border-radius:16px}
    /* V4.3 APP CONTENT MODE - påverkar bara WebView i Android-appen */
    body.seh-content-mode main,
    body.seh-content-mode #app,
    body.seh-content-mode .app,
    body.seh-content-mode .page,
    body.seh-content-mode .page-content{max-width:100%!important}

    body.seh-content-mode h1{
      font-size:clamp(34px,10vw,54px)!important;
      line-height:.98!important;
      letter-spacing:-.035em!important;
      margin-bottom:18px!important;
    }
    body.seh-content-mode h2{
      line-height:1.06!important;
      letter-spacing:-.02em!important;
    }
    body.seh-content-mode p{
      line-height:1.48!important;
    }

    /* Top-level appvyer ska börja snabbare och inte kännas som långa webblandningssidor */
    body.seh-top-level main,
    body.seh-top-level .page,
    body.seh-top-level .page-content{
      padding-top:14px!important;
    }
    body.seh-top-level .hero,
    body.seh-top-level [class*="hero"]{
      min-height:0!important;
      padding-top:24px!important;
      padding-bottom:24px!important;
    }
    body.seh-top-level .hero p,
    body.seh-top-level [class*="hero"] p{
      max-width:680px!important;
      font-size:15px!important;
      line-height:1.45!important;
    }

    /* Nyheter: kompaktare feed och rubriker */
    body.seh-route-news article,
    body.seh-route-news [class*="news-card"],
    body.seh-route-news [class*="article-card"]{
      border-radius:16px!important;
      overflow:hidden!important;
    }
    body.seh-route-news article h2,
    body.seh-route-news [class*="news-card"] h2,
    body.seh-route-news [class*="article-card"] h2{
      font-size:clamp(22px,6vw,32px)!important;
      line-height:1.02!important;
    }
    body.seh-route-news input,
    body.seh-route-news select,
    body.seh-route-players input,
    body.seh-route-players select,
    body.seh-route-teams input,
    body.seh-route-teams select{
      border-radius:14px!important;
      min-height:52px!important;
    }

    /* Spelare/Lag: mindre webhero, direkt fokus på data + sök */
    body.seh-route-players h1,
    body.seh-route-teams h1{
      font-size:clamp(38px,11vw,58px)!important;
    }
    body.seh-route-players [class*="stats"],
    body.seh-route-teams [class*="stats"],
    body.seh-route-players [class*="summary"],
    body.seh-route-teams [class*="summary"]{
      border-radius:16px!important;
    }

    /* Shop: mer produktfokus */
    body.seh-route-shop h1{
      font-size:clamp(44px,14vw,70px)!important;
      margin-bottom:12px!important;
    }
    body.seh-route-shop .hero,
    body.seh-route-shop [class*="hero"]{
      padding-top:20px!important;
      padding-bottom:18px!important;
      min-height:0!important;
    }
    body.seh-route-shop iframe{
      border-radius:16px!important;
      overflow:hidden!important;
    }

    /* SEC: kompakt appöversikt */
    body.seh-route-sec h1{
      font-size:clamp(34px,9vw,50px)!important;
      line-height:1!important;
    }
    body.seh-route-sec [class*="card"],
    body.seh-route-sec article{
      border-radius:18px!important;
    }

    /* Undersidor: mer appkänsla, men behåll innehållet */
    body.seh-detail-page h1{
      font-size:clamp(34px,9vw,52px)!important;
    }
    body.seh-detail-page img{
      max-width:100%!important;
    }

    /* Enkel "app-chip" för sticky filter/search om sajten redan har sticky-element */
    body.seh-content-mode [class*="sticky"]{
      border-radius:14px!important;
    }

    @media(max-width:390px){
      #seh-native-bottom button,#seh-native-bottom a{font-size:9px}
      .seh-card-grid{gap:9px}
      .seh-card{padding:14px;min-height:125px}
      .seh-app-page{padding-left:14px;padding-right:14px}
      #seh-native-top .logo img{width:58px}
    }
  `;

  function htmlEscape(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function route(){
    if(isSec()) return {tab:'sec',title:'SEC',kind:'sec'};
    const h=location.hash||'#/';
    if(h.startsWith('#/nyheter')) return {tab:'news',title:'Nyheter',kind:h==='#/nyheter'?'news':'article'};
    if(h.startsWith('#/spelare')) return {tab:'directory',title:h.split('/').length>2?'Spelarprofil':'Spelare',kind:h.split('/').length>2?'player':'players'};
    if(h.startsWith('#/laghistoria')||h.startsWith('#/lag/')) return {tab:'directory',title:h.startsWith('#/lag/')?'Lag':'Laghistoria',kind:h.startsWith('#/lag/')?'team':'teams'};
    if(h.startsWith('#/shop')) return {tab:'shop',title:'Shop',kind:'shop'};
    return {tab:'more',title:'Hem',kind:'home'};
  }
  function href(tab){
    const map={home:'#/',news:'#/nyheter',players:'#/spelare',shop:'#/shop'};
    return isSec() && tab!=='more' ? ROOT+map[tab] : map[tab];
  }
  function eligibleFavorite(){return ['article','player','team'].includes(route().kind);}
  function pageTitle(){
    const candidates=['h1','.player-profile-name','.news-article-title','.team-profile-title'];
    for(const sel of candidates){const el=document.querySelector(sel);if(el&&el.textContent.trim())return el.textContent.trim();}
    return document.title.replace(/\s*[|–-]\s*Svensk eHockey.*$/i,'').trim()||route().title;
  }
  function currentFavorite(){return {url:location.href,title:pageTitle(),type:route().kind,ts:Date.now()};}
  function getFavs(){try{return JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]')}catch(_){return[]}}
  function setFavs(v){localStorage.setItem(FAVORITES_KEY,JSON.stringify(v));}
  function isFav(){const u=location.href;return getFavs().some(x=>x.url===u);}
  function toggleFav(){
    if(!eligibleFavorite())return;
    const cur=currentFavorite();let f=getFavs();const exists=f.some(x=>x.url===cur.url);
    f=exists?f.filter(x=>x.url!==cur.url):[cur,...f.filter(x=>x.url!==cur.url)].slice(0,100);setFavs(f);refreshTop();renderFavorites();
  }
  function shareCurrent(){
    const title=pageTitle(),url=location.href;
    if(window.SehNative&&window.SehNative.share){window.SehNative.share(title,url);return;}
    if(navigator.share)navigator.share({title,url}).catch(()=>{});
  }
  function openExternal(url){if(window.SehNative&&window.SehNative.openExternal)window.SehNative.openExternal(url);else window.open(url,'_blank');}
  function unlockScrolling(){document.documentElement.classList.add('seh-native-app');document.body.classList.add('seh-native-app');['overflow','height'].forEach(p=>document.documentElement.style.removeProperty(p));['overflow','height','position'].forEach(p=>document.body.style.removeProperty(p));}
  function ensureStyle(){let s=document.getElementById('seh-native-style');if(!s){s=document.createElement('style');s.id='seh-native-style';document.head.appendChild(s);}if(s.textContent!==CSS)s.textContent=CSS;}
  function ensureTop(){
    let top=document.getElementById('seh-native-top');if(top)return;
    top=document.createElement('div');top.id='seh-native-top';top.innerHTML=`<button class="navbtn" id="seh-back" aria-label="Tillbaka">${icons.back}</button><a class="logo" href="${ROOT}#/" aria-label="Hem"><img src="${ROOT}assets/SeHlogga.png" alt=""></a><div class="title"><small>SVENSK eHOCKEY</small><span id="seh-native-title">Hem</span></div><div class="action-row"><button class="navbtn" id="seh-fav" aria-label="Favorit">${icons.heart}</button><button class="navbtn" id="seh-share" aria-label="Dela">${icons.share}</button></div>`;
    document.body.appendChild(top);
    top.querySelector('#seh-back').onclick=()=>{if(document.getElementById('seh-app-directory')?.classList.contains('show')||document.getElementById('seh-app-more')?.classList.contains('show')||document.getElementById('seh-app-favorites')?.classList.contains('show')){closeOverlays();return;}history.back();};
    top.querySelector('#seh-fav').onclick=toggleFav;top.querySelector('#seh-share').onclick=shareCurrent;
  }
  function ensureBottom(){
    let nav=document.getElementById('seh-native-bottom');if(nav)return;
    nav=document.createElement('nav');nav.id='seh-native-bottom';nav.innerHTML=`<a data-tab="news" href="${ROOT}#/nyheter">${icons.news}<span>Nyheter</span></a><button data-tab="directory" id="seh-directory-btn">${icons.players}<span>Spelare & Lag</span></button><a data-tab="shop" href="${ROOT}#/shop">${icons.shop}<span>Shop</span></a><a data-tab="sec" href="${ROOT}SEC/">${icons.sec}<span>SEC</span></a><button data-tab="more" id="seh-more-btn">${icons.more}<span>Mer</span></button>`;document.body.appendChild(nav);
    nav.querySelector('#seh-directory-btn').onclick=()=>openDirectory();
    nav.querySelector('#seh-more-btn').onclick=()=>openMore();
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>showLoading()));
  }
  function ensureHome(){
    let home=document.getElementById('seh-app-home');if(home)return;
    home=document.createElement('section');home.id='seh-app-home';home.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">SVENSK eHOCKEY / APP</div><h1>All svensk eHockey.<br>En app.</h1><p class="lead">Snabbvägar till det viktigaste på Svensk eHockey – nyheter, spelare, lag, SEC och shoppen.</p><div class="seh-card-grid"><a class="seh-card wide gold" href="${ROOT}#/nyheter" data-load><div><div class="ico">${icons.news}</div><strong>Senaste nytt</strong><span>Artiklar, uppdateringar och det senaste från svensk eHockey.</span></div></a><a class="seh-card" href="${ROOT}#/spelare" data-load><div><div class="ico">${icons.players}</div><strong>Spelare</strong><span>Sök profiler, historik och statistik.</span></div></a><a class="seh-card" href="${ROOT}#/laghistoria" data-load><div><div class="ico">${icons.teams}</div><strong>Svenska lag</strong><span>Klubbar, historik och tidigare spelartrupper.</span></div></a><a class="seh-card gold" href="${ROOT}SEC/" data-load><div><div class="ico">${icons.sec}</div><strong>SEC</strong><span>Svenska eHockey Cupen – turneringar och statistik.</span></div></a><a class="seh-card" href="${ROOT}#/shop" data-load><div><div class="ico">${icons.shop}</div><strong>Shop</strong><span>Svensk eHockey-design och personliga lagprodukter.</span></div></a><div class="seh-card wide disabled" id="seh-ecl-card"><span class="seh-badge">SNART</span><div><div class="ico">${icons.ecl}</div><strong>ECL-statistik</strong><span>Appplatsen är klar. Funktionen kopplas på när den gömda ECL-statistiken är redo.</span></div></div></div><div class="seh-section-title"><h2>Din app</h2><small id="seh-fav-count"></small></div><div class="seh-list"><button class="seh-list-item" id="seh-home-favs"><span class="bullet">${icons.heart}</span><span><strong>Favoriter</strong><span>Spelare, lag och artiklar du sparat.</span></span></button><button class="seh-list-item" id="seh-home-more"><span class="bullet">${icons.more}</span><span><strong>Mer</strong><span>SEC, lag, notiser, favoriter och appinställningar.</span></span></button></div></div>`;
    document.body.appendChild(home);home.querySelectorAll('[data-load]').forEach(a=>a.onclick=()=>showLoading());home.querySelector('#seh-home-favs').onclick=openFavorites;home.querySelector('#seh-home-more').onclick=openMore;
  }
  function ensureDirectory(){
    let dir=document.getElementById('seh-app-directory');if(dir)return;
    dir=document.createElement('section');dir.id='seh-app-directory';
    dir.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">SVENSK eHOCKEY</div><h1>Spelare & Lag</h1><p class="lead">Välj vad du vill utforska.</p><div class="seh-card-grid"><a class="seh-card wide" href="${ROOT}#/spelare" data-load><div><div class="ico">${icons.players}</div><strong>Spelare</strong><span>Sök profiler, historik och statistik.</span></div></a><a class="seh-card wide gold" href="${ROOT}#/laghistoria" data-load><div><div class="ico">${icons.teams}</div><strong>Lag</strong><span>Svenska lag, klubbhistorik och tidigare spelartrupper.</span></div></a></div></div>`;
    document.body.appendChild(dir);
    dir.querySelectorAll('[data-load]').forEach(a=>a.onclick=()=>{closeOverlays();showLoading();});
  }
  function openDirectory(){ensureDirectory();document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-more')?.classList.remove('show');document.getElementById('seh-app-favorites')?.classList.remove('show');document.getElementById('seh-app-directory').classList.add('show');refreshTop();refreshBottom();}
  function ensureMore(){
    let more=document.getElementById('seh-app-more');if(more)return;
    more=document.createElement('section');more.id='seh-app-more';
    more.innerHTML=`<div class="seh-app-page">
      <div class="seh-kicker">APP</div>
      <h1>Mer</h1>
      <p class="lead">Alla delar av Svensk eHockey på ett ställe.</p>

      <div class="seh-section-title"><h2>Utforska</h2></div>
      <div class="seh-list">
        <a class="seh-list-item" href="${ROOT}#/" data-load><span class="bullet">${icons.home}</span><span><strong>Hem</strong><span>Appens startsida och snabbvägar.</span></span></a>
        <a class="seh-list-item" href="${ROOT}#/nyheter" data-load><span class="bullet">${icons.news}</span><span><strong>Nyheter</strong><span>Artiklar och uppdateringar.</span></span></a>
        <a class="seh-list-item" href="${ROOT}#/spelare" data-load><span class="bullet">${icons.players}</span><span><strong>Spelare</strong><span>Profiler, historik och statistik.</span></span></a>
        <a class="seh-list-item" href="${ROOT}#/laghistoria" data-load><span class="bullet">${icons.teams}</span><span><strong>Lag</strong><span>Svenska lag, klubbprofiler och historik.</span></span></a>
        <a class="seh-list-item" href="${ROOT}#/shop" data-load><span class="bullet">${icons.shop}</span><span><strong>Shop</strong><span>Svensk eHockey-merch och lagprodukter.</span></span></a>
        <a class="seh-list-item" href="${ROOT}SEC/" data-load><span class="bullet">${icons.sec}</span><span><strong>SEC</strong><span>Svenska eHockey Cupen.</span></span></a>
        <button class="seh-list-item" id="seh-more-favs"><span class="bullet">${icons.heart}</span><span><strong>Favoriter</strong><span>Dina sparade spelare, lag och artiklar.</span></span></button>
        <div class="seh-list-item" style="opacity:.65"><span class="bullet">${icons.ecl}</span><span><strong>ECL-statistik · snart</strong><span>Kopplas på när den gömda funktionen är klar.</span></span></div>
      </div>

      <div class="seh-section-title"><h2>App</h2></div>
      <div class="seh-toggle-row">
        <div><strong style="font-size:14px">Pushnotiser</strong><div class="seh-note">Förberett för nyheter och SEC. Själva pushleveransen aktiveras när Firebase är kopplat.</div></div>
        <button class="seh-switch" id="seh-notify-toggle" aria-label="Pushnotiser"></button>
      </div>

      <div class="seh-list" style="margin-top:10px">
        <div class="seh-list-item"><span class="bullet">i</span><span><strong>Om Svensk eHockey</strong><span>Statistik och information om svenska spelare, lag och eHockey.</span></span></div>
      </div>
      <p class="seh-note">Favoriter sparas lokalt på den här mobilen. Ingen inloggning krävs.</p>
    </div>`;
    document.body.appendChild(more);
    more.querySelectorAll('[data-load]').forEach(a=>a.onclick=()=>{closeOverlays();showLoading();});
    more.querySelector('#seh-more-favs').onclick=openFavorites;
    more.querySelector('#seh-notify-toggle').onclick=()=>{const on=localStorage.getItem(NOTIFY_KEY)==='1';localStorage.setItem(NOTIFY_KEY,on?'0':'1');renderNotifyToggle();};
  }
  function ensureFavorites(){let f=document.getElementById('seh-app-favorites');if(f)return;f=document.createElement('section');f.id='seh-app-favorites';f.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">DIN APP</div><h1>Favoriter</h1><p class="lead">Sparade spelare, lag och artiklar på den här mobilen.</p><div id="seh-favorites-list"></div></div>`;document.body.appendChild(f);}
  function ensureLoader(){if(document.getElementById('seh-native-loader'))return;const x=document.createElement('div');x.id='seh-native-loader';x.innerHTML='<div class="sk short"></div><div class="sk hero"></div><div class="sk row"></div><div class="sk row"></div><div class="sk row short"></div>';document.body.appendChild(x);}
  function ensurePull(){if(document.getElementById('seh-pull-indicator'))return;const x=document.createElement('div');x.id='seh-pull-indicator';x.textContent='Dra för att uppdatera';document.body.appendChild(x);}
  function ensureOffline(){if(document.getElementById('seh-offline-banner'))return;const x=document.createElement('div');x.id='seh-offline-banner';x.textContent='Ingen internetanslutning';document.body.appendChild(x);updateOnline();}
  function showLoading(){document.body.classList.add('seh-loading');setTimeout(()=>document.body.classList.remove('seh-loading'),900);}
  function closeOverlays(){document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-more')?.classList.remove('show');document.getElementById('seh-app-favorites')?.classList.remove('show');refreshTop();refreshBottom();}
  function openMore(){ensureMore();document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-favorites')?.classList.remove('show');document.getElementById('seh-app-more').classList.add('show');renderNotifyToggle();refreshTop();refreshBottom();}
  function openFavorites(){ensureFavorites();document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-more')?.classList.remove('show');document.getElementById('seh-app-favorites').classList.add('show');renderFavorites();refreshTop();refreshBottom();}
  function renderFavorites(){
    const host=document.getElementById('seh-favorites-list');if(!host)return;const favs=getFavs();
    if(!favs.length){host.innerHTML='<div class="seh-empty">Inga favoriter ännu.<br>Spara en spelare, ett lag eller en artikel med hjärtat uppe i appheadern.</div>';return;}
    host.innerHTML='<div class="seh-list">'+favs.map((f,i)=>`<div class="seh-list-item" data-fav-row="${i}"><span class="bullet">${f.type==='player'?icons.players:f.type==='team'?icons.teams:icons.news}</span><a href="${htmlEscape(f.url)}" style="flex:1;color:inherit;text-decoration:none" data-load><strong>${htmlEscape(f.title)}</strong><span>${f.type==='player'?'Spelare':f.type==='team'?'Lag':'Artikel'}</span></a><button data-remove="${i}" style="border:0;background:transparent;color:#9aa0aa;font-size:20px;padding:8px">×</button></div>`).join('')+'</div>';
    host.querySelectorAll('[data-remove]').forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.dataset.remove);const a=getFavs();a.splice(i,1);setFavs(a);renderFavorites();updateFavCount();});host.querySelectorAll('[data-load]').forEach(a=>a.onclick=()=>{closeOverlays();showLoading();});
  }
  function updateFavCount(){const c=getFavs().length;const e=document.getElementById('seh-fav-count');if(e)e.textContent=c?`${c} sparade`:'';}
  function renderNotifyToggle(){const b=document.getElementById('seh-notify-toggle');if(b)b.classList.toggle('on',localStorage.getItem(NOTIFY_KEY)==='1');}
  function isTopLevelRoute(){
    const r=route();
    return ['home','news','players','teams','shop','sec'].includes(r.kind);
  }

  function setContentModeClasses(){
    if(!document.body)return;
    const r=route();
    const known=['home','news','players','teams','shop','sec','article','player','team'];
    document.body.classList.add('seh-content-mode');
    known.forEach(k=>document.body.classList.remove('seh-route-'+k));
    document.body.classList.remove('seh-top-level','seh-detail-page');
    document.body.classList.add('seh-route-'+r.kind);
    document.body.classList.toggle('seh-top-level',isTopLevelRoute());
    document.body.classList.toggle('seh-detail-page',['article','player','team'].includes(r.kind));
  }

  function refreshTop(){
    const r=route();const title=document.getElementById('seh-native-title');if(title)title.textContent=document.getElementById('seh-app-directory')?.classList.contains('show')?'Spelare & Lag':document.getElementById('seh-app-more')?.classList.contains('show')?'Mer':document.getElementById('seh-app-favorites')?.classList.contains('show')?'Favoriter':r.title;
    const back=document.getElementById('seh-back');if(back){const overlayOpen=document.getElementById('seh-app-directory')?.classList.contains('show')||document.getElementById('seh-app-more')?.classList.contains('show')||document.getElementById('seh-app-favorites')?.classList.contains('show');back.style.visibility=(!overlayOpen&&isTopLevelRoute())?'hidden':'visible';}
    const fav=document.getElementById('seh-fav'),share=document.getElementById('seh-share');if(fav){fav.style.display=eligibleFavorite()?'grid':'none';fav.classList.toggle('is-on',isFav());}if(share)share.style.display=eligibleFavorite()?'grid':'none';
  }
  function refreshBottom(){
    const r=route();
    const directoryOpen=document.getElementById('seh-app-directory')?.classList.contains('show');
    const moreOpen=document.getElementById('seh-app-more')?.classList.contains('show')||document.getElementById('seh-app-favorites')?.classList.contains('show');
    const nav=document.getElementById('seh-native-bottom');
    if(nav){
      const news=nav.querySelector('[data-tab="news"]');if(news)news.href=ROOT+'#/nyheter';
      const shop=nav.querySelector('[data-tab="shop"]');if(shop)shop.href=ROOT+'#/shop';
      const sec=nav.querySelector('[data-tab="sec"]');if(sec)sec.href=ROOT+'SEC/';
    }
    document.querySelectorAll('#seh-native-bottom [data-tab]').forEach(a=>a.classList.toggle('on',directoryOpen?a.dataset.tab==='directory':moreOpen?a.dataset.tab==='more':a.dataset.tab===r.tab));
  }
  function refreshHome(){const home=document.getElementById('seh-app-home');if(home)home.classList.toggle('show',route().kind==='home'&&!document.getElementById('seh-app-directory')?.classList.contains('show')&&!document.getElementById('seh-app-more')?.classList.contains('show')&&!document.getElementById('seh-app-favorites')?.classList.contains('show'));updateFavCount();}
  function updateOnline(){document.getElementById('seh-offline-banner')?.classList.toggle('show',navigator.onLine===false);}
  function visible(el){if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';}
  function handleConsent(){
    const buttons=[...document.querySelectorAll('button,a,[role="button"]')];const allow=buttons.find(el=>visible(el)&&/tillåt statistik/i.test((el.textContent||'').trim()));const necessary=buttons.find(el=>visible(el)&&/endast nödvändiga/i.test((el.textContent||'').trim()));const open=!!(allow||necessary);document.body.classList.toggle('seh-consent-open',open);if(!open)return;
    document.body.classList.remove('seh-loading');let panel=(allow&&necessary)?(()=>{const seen=new Set();for(let n=allow;n&&n!==document.body;n=n.parentElement)seen.add(n);for(let n=necessary;n&&n!==document.body;n=n.parentElement)if(seen.has(n))return n;return null;})():(allow||necessary)?.parentElement;if(panel){panel.style.setProperty('z-index','2147483646','important');panel.style.setProperty('max-height','calc(100vh - 74px)','important');panel.style.setProperty('overflow-y','auto','important');panel.style.setProperty('pointer-events','auto','important');}[allow,necessary].forEach(b=>{if(b){b.style.setProperty('pointer-events','auto','important');b.style.setProperty('position','relative','important');b.style.setProperty('z-index','2147483647','important');}});
  }
  function installPullToRefresh(){
    if(window.__SEH_PULL__)return;window.__SEH_PULL__=true;let start=0,dist=0,pulling=false;const ind=()=>document.getElementById('seh-pull-indicator');
    document.addEventListener('touchstart',e=>{if((window.scrollY||document.documentElement.scrollTop||0)<=0&&!document.body.classList.contains('seh-consent-open')){start=e.touches[0].clientY;dist=0;pulling=true;}},{passive:true});
    document.addEventListener('touchmove',e=>{if(!pulling)return;dist=Math.max(0,e.touches[0].clientY-start);if(dist>8){const i=ind();if(i){i.classList.add('show');i.style.transform=`translate(-50%,${Math.min(18,dist/5)-4}px)`;i.textContent=dist>78?'Släpp för att uppdatera':'Dra för att uppdatera';}if(dist<120)e.preventDefault();}},{passive:false});
    document.addEventListener('touchend',()=>{if(!pulling)return;const i=ind();if(i){i.classList.remove('show');i.style.transform='translate(-50%,-70px)';}if(dist>78){showLoading();setTimeout(()=>location.reload(),150);}pulling=false;dist=0;},{passive:true});
  }
  function interceptLinks(){
    if(window.__SEH_LINK_INTERCEPT__)return;window.__SEH_LINK_INTERCEPT__=true;document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;let u;try{u=new URL(a.href,location.href);}catch(_){return;}if(u.protocol!=='http:'&&u.protocol!=='https:')return;const internal=u.hostname==='www.svenskehockey.se'||u.hostname==='svenskehockey.se';if(!internal){e.preventDefault();openExternal(u.href);return;}if(a.dataset.load!==undefined||u.hash||u.pathname==='/SEC/'||u.pathname.startsWith('/SEC/'))showLoading();},true);
  }
  function ensureAll(){unlockScrolling();ensureStyle();ensureTop();ensureBottom();ensureHome();ensureDirectory();ensureMore();ensureFavorites();ensureLoader();ensurePull();ensureOffline();installPullToRefresh();interceptLinks();}
  function refresh(){if(!document.body)return;ensureAll();setContentModeClasses();closeOverlaysIfRouteChanged();refreshTop();refreshBottom();refreshHome();handleConsent();updateOnline();setTimeout(()=>document.body.classList.remove('seh-loading'),500);}
  let lastRoute='';function closeOverlaysIfRouteChanged(){const now=location.pathname+location.hash;if(lastRoute&&lastRoute!==now){document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-more')?.classList.remove('show');document.getElementById('seh-app-favorites')?.classList.remove('show');}lastRoute=now;}

  if(!window.__SEH_NATIVE_APP_SHELL__){
    window.addEventListener('hashchange',()=>{showLoading();setTimeout(refresh,70);});window.addEventListener('popstate',()=>setTimeout(refresh,70));window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);window.__SEH_CONSENT_TIMER__=setInterval(handleConsent,400);window.__SEH_NATIVE_APP_SHELL__={refresh};
  }
  refresh();
})();
