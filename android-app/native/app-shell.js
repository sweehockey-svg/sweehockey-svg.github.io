(function () {
  const ROOT = 'https://www.svenskehockey.se/';
  const isSec = () => location.pathname === '/SEC' || location.pathname.startsWith('/SEC/');

  const icons = {
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    news:'<svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 4h8M8 12h8M8 16h5"/></svg>',
    players:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.4-6 5.5-6s5.1 2 5.5 6M14 15c2.8-.5 5 .9 6 4"/></svg>',
    teams:'<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.3 8.2 8 9 4.7-.8 8-4 8-9V7z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    sec:'<svg viewBox="0 0 24 24"><path d="M7 4h10v4c0 3.2-2 5.3-5 6-3-.7-5-2.8-5-6zM9 20h6M12 14v6M5 5H3v2c0 2.4 1.5 4 4 4M19 5h2v2c0 2.4-1.5 4-4 4"/></svg>'
  };

  const CSS = `
    :root{--seh-native-top:60px;--seh-native-bottom:72px}
    html.seh-native-app,body.seh-native-app{
      background:#02030a!important;
      min-height:100%!important;
      height:auto!important;
      max-height:none!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      position:static!important;
      touch-action:pan-y!important;
    }
    body.seh-native-app{
      padding-top:var(--seh-native-top)!important;
      padding-bottom:calc(var(--seh-native-bottom) + env(safe-area-inset-bottom))!important;
      overscroll-behavior-y:auto!important;
    }
    body.seh-native-app .seh-header,
    body.seh-native-app .mainNav,
    body.seh-native-app .mobile-nav,
    body.seh-native-app .mobile-menu{display:none!important}
    #seh-native-top{position:fixed;z-index:2147483000;top:0;left:0;right:0;height:var(--seh-native-top);display:flex;align-items:center;gap:12px;padding:8px 14px;box-sizing:border-box;background:#02030af7;border-bottom:1px solid #ffffff18;backdrop-filter:blur(16px)}
    #seh-native-top img{width:74px;max-height:38px;object-fit:contain}
    #seh-native-top .t{flex:1;min-width:0;color:#f4f1e9;font:800 16px/1.05 Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #seh-native-top .t small{display:block;color:#62d4cf;font-size:9px;letter-spacing:.14em;margin-bottom:4px}
    #seh-native-bottom{position:fixed;z-index:2147483000;left:0;right:0;bottom:0;min-height:var(--seh-native-bottom);display:grid;grid-template-columns:repeat(5,1fr);padding:4px 5px calc(4px + env(safe-area-inset-bottom));box-sizing:border-box;background:#02030af7;border-top:1px solid #ffffff18;backdrop-filter:blur(18px);box-shadow:0 -10px 28px rgba(0,0,0,.26)}
    #seh-native-bottom a{display:flex;min-height:60px;align-items:center;justify-content:center;flex-direction:column;gap:3px;color:#8f949a;text-decoration:none;font:800 10px Arial,sans-serif;border-radius:12px;position:relative;-webkit-tap-highlight-color:transparent}
    #seh-native-bottom a svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    #seh-native-bottom a.on{color:#f4f1e9;background:#ffd00012}
    #seh-native-bottom a.on:before{content:'';position:absolute;top:1px;width:23px;height:3px;border-radius:3px;background:#ffd000}
  `;

  function route(){
    if(isSec()) return {tab:'sec',title:'Svenska eHockey Cupen'};
    const h=location.hash||'#/';
    if(h.startsWith('#/nyheter')) return {tab:'news',title:'Nyheter'};
    if(h.startsWith('#/spelare')) return {tab:'players',title:h.split('/').length>2?'Spelarprofil':'Spelare'};
    if(h.startsWith('#/laghistoria')||h.startsWith('#/lag/')) return {tab:'teams',title:'Lag'};
    return {tab:'home',title:'Hem'};
  }

  function href(tab){
    if(tab==='sec') return ROOT+'SEC/';
    const h={home:'#/',news:'#/nyheter',players:'#/spelare',teams:'#/laghistoria'}[tab];
    return isSec()?ROOT+h:h;
  }

  function unlockScrolling(){
    document.documentElement.classList.add('seh-native-app');
    document.body.classList.add('seh-native-app');
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('position');
  }

  function ensureStyle(){
    let s=document.getElementById('seh-native-style');
    if(!s){s=document.createElement('style');s.id='seh-native-style';document.head.appendChild(s);}
    if(s.textContent!==CSS)s.textContent=CSS;
  }

  function ensureTop(){
    let top=document.getElementById('seh-native-top');
    if(!top){
      top=document.createElement('div');top.id='seh-native-top';
      top.innerHTML=`<a href="${ROOT}#/" aria-label="Hem"><img src="${ROOT}assets/SeHlogga.png" alt="Svensk eHockey"></a><div class="t"><small>SVENSK eHOCKEY</small><span id="seh-native-title">Hem</span></div>`;
      document.body.appendChild(top);
    }
  }

  function ensureBottom(){
    let nav=document.getElementById('seh-native-bottom');
    if(!nav){
      nav=document.createElement('nav');nav.id='seh-native-bottom';nav.setAttribute('aria-label','Appnavigation');
      nav.innerHTML=[['home','Hem'],['news','Nyheter'],['players','Spelare'],['teams','Lag'],['sec','SEC']].map(([tab,label])=>`<a data-tab="${tab}" href="${href(tab)}">${icons[tab]}<span>${label}</span></a>`).join('');
      document.body.appendChild(nav);
    }
  }

  function refresh(){
    if(!document.body)return;
    unlockScrolling();
    ensureStyle();
    ensureTop();
    ensureBottom();
    const r=route();
    const title=document.getElementById('seh-native-title');if(title)title.textContent=r.title;
    document.querySelectorAll('#seh-native-bottom a').forEach(a=>{a.href=href(a.dataset.tab);a.classList.toggle('on',a.dataset.tab===r.tab);});
  }

  if(!window.__SEH_NATIVE_APP_SHELL__){
    window.addEventListener('hashchange',()=>setTimeout(refresh,50));
    window.addEventListener('popstate',()=>setTimeout(refresh,50));
    window.__SEH_NATIVE_APP_SHELL__={refresh};
  }

  refresh();
})();
