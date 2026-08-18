(function () {
  if (window.__SEH_NATIVE_APP_SHELL__) {
    if (window.__SEH_NATIVE_APP_SHELL__.refresh) window.__SEH_NATIVE_APP_SHELL__.refresh();
    return;
  }

  const ROOT = 'https://www.svenskehockey.se/';
  const isSec = () => location.pathname === '/SEC' || location.pathname.startsWith('/SEC/');

  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    news: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 4h8M8 12h8M8 16h5"/></svg>',
    players: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.4-6 5.5-6s5.1 2 5.5 6M14 15c2.8-.5 5 .9 6 4"/></svg>',
    teams: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7v5c0 5 3.3 8.2 8 9 4.7-.8 8-4 8-9V7z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    sec: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4c0 3.2-2 5.3-5 6-3-.7-5-2.8-5-6zM9 20h6M12 14v6M5 5H3v2c0 2.4 1.5 4 4 4M19 5h2v2c0 2.4-1.5 4-4 4"/></svg>'
  };

  const css = `
    :root{--seh-app-top:62px;--seh-app-bottom:76px}
    html.seh-native-app,body.seh-native-app{background:#02030a!important}
    body.seh-native-app{padding-top:var(--seh-app-top)!important;padding-bottom:calc(var(--seh-app-bottom) + env(safe-area-inset-bottom))!important;overscroll-behavior-y:none}
    body.seh-native-app .seh-header{display:none!important}
    body.seh-native-app .arena{display:none!important}
    body.seh-native-app .mainNav{display:none!important}
    body.seh-native-app .siteFooter,body.seh-native-app .directory-footer{padding-bottom:calc(var(--seh-app-bottom) + 20px)!important}
    #seh-native-topbar,#seh-native-bottomnav{font-family:Inter,Arial,sans-serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    #seh-native-topbar{position:fixed;z-index:2147483000;top:0;left:0;right:0;height:var(--seh-app-top);display:flex;align-items:center;gap:12px;padding:8px 14px;background:rgba(2,3,10,.96);border-bottom:1px solid rgba(255,255,255,.10);backdrop-filter:blur(16px)}
    #seh-native-topbar .seh-app-logo{display:flex;align-items:center;min-width:78px;height:42px;text-decoration:none}
    #seh-native-topbar .seh-app-logo img{display:block;width:78px;height:auto;max-height:38px;object-fit:contain}
    #seh-native-topbar .seh-app-title{min-width:0;flex:1;line-height:1.05}
    #seh-native-topbar .seh-app-title small{display:block;color:#62d4cf;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:3px}
    #seh-native-topbar .seh-app-title strong{display:block;color:#f4f1e9;font-size:16px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #seh-native-topbar .seh-app-action{width:40px;height:40px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(255,255,255,.035);display:grid;place-items:center;color:#f4f1e9;font-size:23px;text-decoration:none}
    #seh-native-bottomnav{position:fixed;z-index:2147483000;left:0;right:0;bottom:0;min-height:var(--seh-app-bottom);padding:5px 6px calc(5px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,1fr);background:rgba(2,3,10,.97);border-top:1px solid rgba(255,255,255,.11);backdrop-filter:blur(18px);box-shadow:0 -10px 30px rgba(0,0,0,.28)}
    #seh-native-bottomnav a{position:relative;display:flex;min-width:0;min-height:62px;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:13px;color:#8f949a;text-decoration:none;font-size:10px;font-weight:800;letter-spacing:.02em}
    #seh-native-bottomnav a svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    #seh-native-bottomnav a.is-active{color:#f4f1e9;background:rgba(255,208,0,.08)}
    #seh-native-bottomnav a.is-active::before{content:'';position:absolute;top:2px;left:50%;transform:translateX(-50%);width:24px;height:3px;border-radius:3px;background:#ffd000}
    #seh-native-bottomnav a[data-tab='sec'].is-active{background:rgba(214,177,95,.10)}
    #seh-native-bottomnav a[data-tab='sec'].is-active::before{background:#d6b15f}
    body.seh-native-app .news-page-shell,body.seh-native-app .players-shell,body.seh-native-app .portal-shell,body.seh-native-app .history-page-shell{scroll-margin-top:var(--seh-app-top)}
    @media (max-width:380px){#seh-native-bottomnav a{font-size:9px}#seh-native-bottomnav a svg{width:21px;height:21px}#seh-native-topbar .seh-app-title strong{font-size:15px}}
  `;

  function labelForRoute(){
    if(isSec()) return 'Svenska eHockey Cupen';
    const h = location.hash || '#/';
    if(h.startsWith('#/nyheter')) return 'Nyheter';
    if(h.startsWith('#/spelare')) return h.split('/').length>2 ? 'Spelarprofil' : 'Spelare';
    if(h.startsWith('#/laghistoria')) return 'Laghistoria';
    if(h.startsWith('#/lag/')) return 'Lag';
    if(h.startsWith('#/shop')) return 'Shop';
    if(h.startsWith('#/sasong')) return 'Säsong';
    return 'Hem';
  }

  function activeTab(){
    if(isSec()) return 'sec';
    const h = location.hash || '#/';
    if(h.startsWith('#/nyheter')) return 'news';
    if(h.startsWith('#/spelare')) return 'players';
    if(h.startsWith('#/laghistoria') || h.startsWith('#/lag/')) return 'teams';
    return 'home';
  }

  function href(tab){
    if(tab==='sec') return ROOT+'SEC/';
    if(isSec()){
      const map={home:'#/',news:'#/nyheter',players:'#/spelare',teams:'#/laghistoria'};
      return ROOT+map[tab];
    }
    return {home:'#/',news:'#/nyheter',players:'#/spelare',teams:'#/laghistoria'}[tab];
  }

  function ensureShell(){
    document.documentElement.classList.add('seh-native-app');
    if(document.body) document.body.classList.add('seh-native-app');
    if(!document.getElementById('seh-native-style')){
      const s=document.createElement('style');s.id='seh-native-style';s.textContent=css;document.head.appendChild(s);
    }
    if(!document.getElementById('seh-native-topbar')){
      const top=document.createElement('div');top.id='seh-native-topbar';
      top.innerHTML=`<a class="seh-app-logo" href="${ROOT}#/" aria-label="Hem"><img src="${ROOT}assets/SeHlogga.png" alt=""></a><div class="seh-app-title"><small>SVENSK eHOCKEY</small><strong id="seh-native-title"></strong></div><a class="seh-app-action" href="${ROOT}#/" aria-label="Till startsidan">⌂</a>`;
      document.body.appendChild(top);
    }
    if(!document.getElementById('seh-native-bottomnav')){
      const nav=document.createElement('nav');nav.id='seh-native-bottomnav';nav.setAttribute('aria-label','Appnavigation');
      nav.innerHTML=[['home','Hem'],['news','Nyheter'],['players','Spelare'],['teams','Lag'],['sec','SEC']].map(([tab,label])=>`<a data-tab="${tab}" href="${href(tab)}">${icons[tab]}<span>${label}</span></a>`).join('');
      document.body.appendChild(nav);
    }
    refresh();
  }

  function refresh(){
    const title=document.getElementById('seh-native-title'); if(title) title.textContent=labelForRoute();
    const active=activeTab();
    document.querySelectorAll('#seh-native-bottomnav a').forEach(a=>{
      const tab=a.dataset.tab;a.href=href(tab);a.classList.toggle('is-active',tab===active);
    });
  }

  window.addEventListener('hashchange',()=>setTimeout(refresh,0));
  window.addEventListener('popstate',()=>setTimeout(refresh,0));
  new MutationObserver(()=>{ if(!document.getElementById('seh-native-bottomnav') && document.body) ensureShell(); else refresh(); }).observe(document.documentElement,{childList:true,subtree:true});
  window.__SEH_NATIVE_APP_SHELL__={refresh,ensureShell};
  if(document.body) ensureShell(); else document.addEventListener('DOMContentLoaded',ensureShell,{once:true});
})();
