(function () {
  // Web edition of the verified Android 5.30 shell. Loaded only in web-app mode.
  const ROOT = 'https://www.svenskehockey.se/';
  const SEC_ROOT = 'https://www.svenskehockey.se/SEC/';
  const FAVORITES_KEY = 'seh_app_favorites_v1';
  const NOTIFY_KEY = 'seh_app_notifications_wanted_v1';
  const PUSH_TOKEN_KEY = 'seh_app_push_token_v1';
  const PUSH_ERROR_KEY = 'seh_app_push_error_v1';
  const PUSH_PREFS_KEY = 'seh_app_push_preferences_v1';
  const MY_PROFILE_KEY = 'seh_app_my_profile_v1';
  const ECL_ROUTE = '#/ecl?view=archive';
  const isSec = () => location.pathname === '/SEC' || location.pathname.startsWith('/SEC/');
  const isSecCup = () => isSec() && /^#\/cups\/[^/?#]+/i.test(location.hash || '');

  const icons = {
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    news:'<svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 4h8M8 12h8M8 16h5"/></svg>',
    players:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.4-6 5.5-6s5.1 2 5.5 6M14 15c2.8-.5 5 .9 6 4"/></svg>',
    user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4.2 2.9-6.5 7-6.5s6.5 2.3 7 6.5"/></svg>',
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
    html.seh-native-app,body.seh-native-app{background:var(--seh-bg)!important;min-height:100%!important;height:auto!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;position:static!important;touch-action:pan-y!important;scrollbar-width:none!important;-ms-overflow-style:none!important}
    html.seh-native-app::-webkit-scrollbar,body.seh-native-app::-webkit-scrollbar,
    html.seh-native-app *::-webkit-scrollbar,body.seh-native-app *::-webkit-scrollbar,
    #seh-app-home::-webkit-scrollbar,#seh-app-directory::-webkit-scrollbar,#seh-app-favorites::-webkit-scrollbar{
      display:none!important;width:0!important;height:0!important;background:transparent!important
    }
    html.seh-native-app,body.seh-native-app,html.seh-native-app *,body.seh-native-app *{
      scrollbar-width:none!important;-ms-overflow-style:none!important
    }
    body.seh-native-app{padding-top:var(--seh-native-top)!important;padding-bottom:var(--seh-native-bottom)!important;overscroll-behavior-y:auto!important}
    body.seh-native-app .seh-header,body.seh-native-app .mainNav,body.seh-native-app .mobile-nav,body.seh-native-app .mobile-menu{display:none!important}
    #seh-native-top,#seh-native-bottom,#seh-app-home,#seh-app-favorites,#seh-native-loader,#seh-pull-indicator,#seh-offline-banner{font-family:Inter,Arial,sans-serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    #seh-native-top{position:fixed;z-index:2147483000;top:0;left:0;right:0;height:var(--seh-native-top);display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(2,3,10,.97);border-bottom:1px solid rgba(255,255,255,.10);backdrop-filter:blur(16px)}
    #seh-native-top .navbtn{width:40px;height:40px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.035);display:grid;place-items:center;color:var(--seh-text);padding:0}
    #seh-native-top .navbtn svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    #seh-native-top .logo{display:flex;align-items:center;text-decoration:none;margin-right:2px}
    #seh-native-top .logo img{width:63px;max-height:36px;object-fit:contain}
    #seh-native-top .title{min-width:0;flex:1;color:var(--seh-text);font-size:16px;font-weight:850;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #seh-native-top .title small{display:block;color:var(--seh-cyan);font-size:9px;letter-spacing:.14em;margin-bottom:4px}
    #seh-native-top .action-row{display:flex;gap:6px}
    #seh-native-top .navbtn.is-on{color:#ffcf43;border-color:#ffcf4345;background:#ffcf4312}
    #seh-native-top #seh-my-profile{overflow:hidden}
    #seh-native-top #seh-my-profile img{width:100%;height:100%;object-fit:cover;border-radius:11px;display:block}
    #seh-native-top #seh-my-profile.has-profile{padding:2px;border-color:rgba(98,212,207,.34);background:#07131d}
    #seh-my-profile-modal{position:fixed;z-index:2147483600;inset:0;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);font-family:Inter,Arial,sans-serif;padding:14px;box-sizing:border-box}
    #seh-my-profile-modal.show{display:flex}
    .seh-my-profile-sheet{width:min(100%,520px);max-height:min(82vh,680px);overflow-y:auto;background:linear-gradient(160deg,#0b101c,#05070d);border:1px solid rgba(255,255,255,.13);border-radius:22px;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.55);box-sizing:border-box;color:var(--seh-text)}
    .seh-my-profile-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
    .seh-my-profile-sheet .kicker{color:var(--seh-cyan);font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}
    .seh-my-profile-sheet h2{margin:0;font-size:24px;line-height:1.05}
    .seh-my-profile-sheet p{margin:7px 0 0;color:#979da7;font-size:12px;line-height:1.4}
    .seh-my-profile-close{width:36px;height:36px;flex:0 0 36px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:#ffffff08;color:#f4f1e9;font-size:22px;line-height:1}
    .seh-my-profile-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
    .seh-my-profile-search input{min-width:0;height:48px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:#030711;color:#f4f1e9;padding:0 13px;font:750 14px/1 Inter,Arial,sans-serif;outline:none;box-sizing:border-box}
    .seh-my-profile-search input:focus{border-color:rgba(98,212,207,.55);box-shadow:0 0 0 3px rgba(98,212,207,.08)}
    .seh-my-profile-search button{height:48px;border:1px solid rgba(255,208,0,.35);border-radius:13px;background:#ffd000;color:#080a0f;padding:0 16px;font:900 12px/1 Inter,Arial,sans-serif}
    .seh-my-profile-results{display:grid;gap:8px;margin-top:12px}
    .seh-my-profile-result{width:100%;display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:11px;text-align:left;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:#070b13;color:#f4f1e9;padding:9px 10px;box-sizing:border-box}
    .seh-my-profile-result img{width:52px;height:52px;object-fit:cover;object-position:center top;border-radius:12px;background:#0b1730}
    .seh-my-profile-result strong{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .seh-my-profile-result span{display:block;margin-top:4px;color:#8e96a1;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .seh-my-profile-result b{color:#ffd000;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
    .seh-my-profile-status{min-height:18px;margin-top:9px;color:#9ba1aa;font-size:11px;line-height:1.4}
    .seh-my-profile-status.error{color:#ff9d9d}
    #seh-app-favorites .seh-my-profile-favorite-card{margin:0 0 18px;border:1px solid rgba(98,212,207,.18);border-radius:18px;background:linear-gradient(145deg,#0a111b,#060811);padding:13px;display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:12px;align-items:center;box-sizing:border-box}
    #seh-app-favorites .seh-my-profile-favorite-card img{width:62px;height:62px;object-fit:cover;object-position:center top;border-radius:14px;background:#0b1730}
    #seh-app-favorites .seh-my-profile-favorite-card .placeholder{width:62px;height:62px;display:grid;place-items:center;border-radius:14px;background:#62d4cf12;color:var(--seh-cyan)}
    #seh-app-favorites .seh-my-profile-favorite-card .placeholder svg{width:29px;height:29px;fill:none;stroke:currentColor;stroke-width:1.9}
    #seh-app-favorites .seh-my-profile-favorite-card small{display:block;color:var(--seh-cyan);font-size:8px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
    #seh-app-favorites .seh-my-profile-favorite-card strong{display:block;font-size:16px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #seh-app-favorites .seh-my-profile-favorite-card span{display:block;color:#9299a4;font-size:10px;line-height:1.3;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #seh-app-favorites .seh-my-profile-favorite-actions{display:grid;gap:6px}
    #seh-app-favorites .seh-my-profile-favorite-actions button{border:1px solid rgba(255,255,255,.11);border-radius:10px;background:#ffffff08;color:#f4f1e9;padding:8px 9px;font:850 9px/1 Inter,Arial,sans-serif}
    #seh-app-favorites .seh-my-profile-favorite-actions button.primary{border-color:rgba(255,208,0,.35);background:#ffd000;color:#05070b}
    @media(max-width:390px){#seh-native-top{gap:6px;padding-left:9px;padding-right:9px}#seh-native-top .navbtn{width:37px;height:37px}#seh-native-top .logo img{width:57px}#seh-native-top .action-row{gap:4px}#seh-native-bottom button,#seh-native-bottom a{font-size:8px}}
    #seh-native-bottom{position:fixed;z-index:2147483000;left:0;right:0;bottom:0;min-height:var(--seh-native-bottom);display:flex;padding:4px 3px;background:rgba(2,3,10,.98);border-top:1px solid rgba(255,255,255,.11);backdrop-filter:blur(18px);box-shadow:0 -10px 28px rgba(0,0,0,.30);transition:.18s ease}
    #seh-native-bottom button,#seh-native-bottom a{border:0;background:transparent;display:flex;flex:1 1 0;min-width:0;min-height:61px;align-items:center;justify-content:center;flex-direction:column;gap:3px;color:#8f949a;text-decoration:none;font-size:8.5px;font-weight:800;border-radius:12px;position:relative;padding:0 1px;white-space:nowrap;transition:flex .18s ease}
    #seh-native-bottom button.on,#seh-native-bottom a.on{flex:1.38 1 0}
    #seh-native-bottom svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    #seh-native-bottom .on{color:var(--seh-text);background:#ffd00012}
    #seh-native-bottom .on:before{content:'';position:absolute;top:1px;width:23px;height:3px;border-radius:3px;background:var(--seh-gold)}
    body.seh-consent-open #seh-native-bottom{transform:translateY(115%);opacity:0;pointer-events:none}
    #seh-app-home,#seh-app-directory,#seh-app-competitions,#seh-app-more,#seh-app-favorites{position:fixed;z-index:2147482800;left:0;right:0;top:var(--seh-native-top);bottom:var(--seh-native-bottom);background:var(--seh-bg);overflow-y:auto;overscroll-behavior-y:contain;color:var(--seh-text);display:none}
    #seh-app-home.show,#seh-app-directory.show,#seh-app-competitions.show,#seh-app-more.show,#seh-app-favorites.show{display:block}
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
    #seh-app-home .seh-home-app-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    #seh-app-home .seh-home-app-grid .seh-list-item{min-width:0;min-height:76px;padding:11px 12px;gap:10px;align-items:center;text-align:left}
    #seh-app-home .seh-home-app-grid .seh-list-item .bullet{width:34px;height:34px;flex-basis:34px;border-radius:10px}
    #seh-app-home .seh-home-app-grid .seh-list-item .bullet svg{width:19px;height:19px}
    #seh-app-home .seh-home-app-grid .seh-list-item strong{font-size:13px}
    #seh-app-home .seh-home-app-grid .seh-list-item span{font-size:10px;line-height:1.3;margin-top:2px}
    #seh-app-home .seh-home-app-grid .seh-home-app-wide{grid-column:1/-1;min-height:64px!important}
    #seh-app-home .seh-home-notify-card{overflow:hidden}
    #seh-app-home .seh-home-notify-card>span:nth-child(2){flex:1 1 auto;min-width:0}
    #seh-app-home .seh-home-notify-card .seh-switch{box-sizing:border-box;width:40px;height:24px;flex:0 0 40px;min-width:40px;margin-left:6px;margin-right:0;padding:3px}
    #seh-app-home .seh-home-notify-card .seh-switch:after{width:18px;height:18px}
    #seh-app-home .seh-home-notify-card .seh-switch.on:after{transform:translateX(16px)}
    #seh-app-home .seh-home-notify-card .seh-switch:disabled{opacity:.55}
    #seh-app-home #seh-notify-status[data-tone="error"]{color:#ff9d9d}
    #seh-app-home #seh-notify-status[data-tone="success"]{color:#79ddd2}
    #seh-app-home .seh-push-topics{grid-column:1/-1;display:grid;gap:7px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:#060912}
    #seh-app-home .seh-push-topics[hidden]{display:none!important}
    #seh-app-home .seh-push-topic{display:flex;align-items:center;gap:10px;min-height:48px;padding:7px 8px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:var(--seh-text);text-align:left}
    #seh-app-home .seh-push-topic:last-child{border-bottom:0}
    #seh-app-home .seh-push-topic>span{flex:1;min-width:0}
    #seh-app-home .seh-push-topic strong{display:block;font-size:12px}
    #seh-app-home .seh-push-topic small{display:block;margin-top:3px;color:#8f96a2;font-size:9px;line-height:1.3}
    #seh-app-home .seh-push-topic .seh-switch{pointer-events:none}
    #seh-app-home .seh-home-about-card .bullet{font-weight:900;font-size:16px}
    /* Home settings: shared notification panel, balanced shortcuts, clear text hierarchy. */
    #seh-app-home .seh-home-app-grid{gap:10px}
    #seh-app-home .seh-home-app-grid .seh-list-item{box-sizing:border-box;border-color:#26313f;background:linear-gradient(135deg,#0d1521,#080c14);border-radius:14px}
    #seh-app-home .seh-home-app-grid .seh-list-item strong{display:block;color:#f3f6fa;font-size:14px;line-height:1.25}
    #seh-app-home .seh-home-app-grid .seh-list-item>span:last-of-type>span{color:#a4afbc;font-size:11px;line-height:1.4;margin-top:5px}
    #seh-app-home #seh-home-profile,#seh-app-home #seh-home-favs{min-height:96px;gap:8px;padding:12px 10px}
    #seh-app-home #seh-home-profile .bullet,#seh-app-home #seh-home-favs .bullet{width:28px;height:32px;flex-basis:28px;color:#79e3db}
    #seh-app-home .seh-home-notify-card{grid-column:1/-1;min-height:78px!important;padding:14px!important}
    #seh-app-home .seh-home-notify-card:has(+.seh-push-topics:not([hidden])){border-radius:14px 14px 0 0;border-bottom:0}
    #seh-app-home .seh-push-topics{margin-top:-10px;border:1px solid #26313f;border-top:0;border-radius:0 0 14px 14px;background:#090f19;gap:0;padding:0 14px 8px}
    #seh-app-home .seh-push-topic{min-height:64px;padding:11px 0;gap:14px}
    #seh-app-home .seh-push-topic strong{font-size:13px;color:#eef3f8}
    #seh-app-home .seh-push-topic small{font-size:10px;line-height:1.4;color:#a0adbc;max-width:245px}
    #seh-app-home .seh-push-topic .seh-switch{box-sizing:border-box;width:42px;min-width:42px;height:24px;flex:0 0 42px;padding:3px}
    #seh-app-home .seh-push-topic .seh-switch:after{width:18px;height:18px}
    #seh-app-home .seh-push-topic .seh-switch.on:after{transform:translateX(18px)}
    #seh-app-home .seh-home-notify-card #seh-notify-toggle{width:44px;height:44px;min-width:44px;flex:0 0 44px;padding:0;background:transparent}
    #seh-app-home #seh-notify-toggle:before{content:'';position:absolute;left:2px;top:10px;width:40px;height:24px;border-radius:20px;background:#303b49}
    #seh-app-home #seh-notify-toggle.on:before{background:#ffd000}
    #seh-app-home #seh-notify-toggle:after{position:absolute;left:5px;top:13px;width:18px;height:18px}
    #seh-app-home .seh-home-app-grid .seh-home-about-card,#seh-app-home .seh-home-app-grid #seh-home-privacy{min-height:64px!important;padding:12px;border-color:#202a37;background:#080d15}
    #seh-app-home .seh-home-about-card .bullet,#seh-app-home #seh-home-privacy .bullet{background:transparent!important;width:26px!important;flex-basis:26px!important}
    #seh-app-home .seh-home-app-grid button:focus-visible{outline:2px solid #7de6df;outline-offset:3px}
    #seh-app-favorites .seh-favorite-player-photo{overflow:hidden!important;background:linear-gradient(145deg,#0c1827,#070a11)!important;border:1px solid rgba(214,177,95,.24)!important}
    #seh-app-favorites .seh-favorite-player-photo img{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center top!important;margin:0!important}
    .seh-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(255,255,255,.09);background:#080b13;border-radius:15px;padding:14px}.seh-switch{width:50px;height:28px;border:0;border-radius:20px;background:#303641;padding:3px;position:relative}.seh-switch:after{content:'';display:block;width:22px;height:22px;border-radius:50%;background:#fff;transition:.18s}.seh-switch.on{background:#ffd000}.seh-switch.on:after{transform:translateX(22px);background:#101216}
    .seh-note{font-size:11px;line-height:1.4;color:#858b95;margin-top:8px}
    #seh-native-loader{position:fixed;z-index:2147482500;left:0;right:0;top:var(--seh-native-top);bottom:var(--seh-native-bottom);background:#02030af4;padding:28px 20px;display:none;pointer-events:none}.seh-loading #seh-native-loader{display:block}

    /* V742: native-owned player/team directories live outside the website <main>.
       The rebuilt lists therefore never depend on, or reveal, legacy website pages. */
    #seh-native-directory-root{position:fixed!important;z-index:2147482700!important;left:0!important;right:0!important;top:var(--seh-native-top)!important;bottom:var(--seh-native-bottom)!important;display:block!important;width:auto!important;max-width:none!important;margin:0!important;padding:8px 8px 18px!important;box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;background:#02030a!important;color:#f4f1e9!important;-webkit-overflow-scrolling:touch!important}
    body.seh-route-players main,body.seh-route-teams main{visibility:hidden!important;pointer-events:none!important}
    #seh-native-directory-root.seh-native-player-directory-source,
    #seh-native-directory-root.seh-native-team-directory-source{display:block!important}
    .seh-native-directory-head{padding:10px 4px 8px!important;border-bottom:1px solid rgba(214,177,95,.18)!important;margin-bottom:10px!important}
    .seh-native-directory-kicker{display:block!important;color:#63e6e2!important;font:900 9px/1.2 Inter,Arial,sans-serif!important;letter-spacing:.14em!important;text-transform:uppercase!important;margin-bottom:3px!important}
    .seh-native-directory-head h1{margin:0!important;color:#f7f4ee!important;font:950 23px/1 Inter,Arial,sans-serif!important;letter-spacing:-.03em!important}
    .seh-native-directory-head p{margin:6px 0 0!important;color:#8f99a7!important;font:650 9px/1.35 Inter,Arial,sans-serif!important}
    .seh-native-player-directory-frame>.players-filters,.seh-native-player-directory-page>.players-filters,.seh-native-team-directory-filter{margin:0 0 10px!important;padding:8px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;background:rgba(5,9,16,.86)!important}
    .seh-native-team-directory-grid{margin-top:8px!important}
    .seh-native-team-directory-pager{display:grid!important;grid-template-columns:auto 1fr auto!important;align-items:center!important;gap:8px!important;margin:12px 0 4px!important;padding:8px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;background:rgba(5,9,16,.86)!important}
    .seh-native-team-directory-pager button{min-height:38px!important;padding:0 13px!important;border:1px solid rgba(214,177,95,.34)!important;border-radius:10px!important;background:linear-gradient(180deg,#0b0f18,#060910)!important;color:#f4f1e9!important;font:850 10px/1 Inter,Arial,sans-serif!important}
    .seh-native-team-directory-pager button:disabled{opacity:.32!important}
    .seh-native-team-directory-pageinfo{text-align:center!important;color:#aeb6c1!important;font:800 9px/1.25 Inter,Arial,sans-serif!important}
    .seh-native-team-directory-pageinfo strong{display:block!important;margin-bottom:2px!important;color:#ffd400!important;font-size:11px!important}
    .seh-native-player-directory-frame{display:block!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important;box-sizing:border-box!important}
    .seh-native-player-directory-frame>.seh-native-directory-head{display:block!important;width:100%!important;box-sizing:border-box!important}
    .seh-native-player-directory-frame>.players-filters{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important;box-sizing:border-box!important}
    .seh-native-player-directory-frame>.players-filters>.players-field:first-child{grid-column:1 / -1!important}

    /* V739: route byte mellan Spelare och Laghistoria får aldrig visa föregående vy. */
    #seh-route-transition-stage{
      position:fixed;
      z-index:2147482450;
      left:0;
      right:0;
      top:var(--seh-native-top);
      bottom:var(--seh-native-bottom);
      display:none;
      overflow:hidden;
      pointer-events:none;
      background:#02030a;
      color:#f5f2eb;
      contain:layout paint;
    }
    body.seh-route-transitioning #seh-route-transition-stage{display:block!important}
    #seh-route-transition-stage>.seh-route-cache-scroll{
      position:absolute;
      inset:0;
      overflow:hidden;
      background:#02030a;
    }
    #seh-route-transition-stage main{
      width:100%!important;
      min-height:100%!important;
      margin:0!important;
      box-sizing:border-box!important;
      pointer-events:none!important;
    }
    #seh-route-transition-stage .seh-route-transition-placeholder{
      padding:18px 12px 40px;
    }
    #seh-route-transition-stage .seh-route-transition-placeholder .bar{
      height:11px;
      margin:0 0 10px;
      border-radius:999px;
      background:#111827;
      opacity:.92;
    }
    #seh-route-transition-stage .seh-route-transition-placeholder .bar:nth-child(1){width:42%;height:18px;margin-top:4px}
    #seh-route-transition-stage .seh-route-transition-placeholder .bar:nth-child(2){width:100%;height:56px;border-radius:14px;margin-top:16px}
    #seh-route-transition-stage .seh-route-transition-placeholder .bar:nth-child(3){width:100%;height:112px;border-radius:14px;margin-top:12px}
    #seh-route-transition-stage .seh-route-transition-placeholder .bar:nth-child(4){width:76%}
    .sk{height:18px;border-radius:8px;background:linear-gradient(90deg,#111621,#1b2230,#111621);background-size:220% 100%;animation:sh 1.1s infinite}.sk.hero{height:90px;margin:24px 0 18px}.sk.row{margin:12px 0}.sk.short{width:60%}@keyframes sh{0%{background-position:100%}100%{background-position:-100%}}
    #seh-pull-indicator{position:fixed;z-index:2147483100;top:66px;left:50%;transform:translate(-50%,-70px);opacity:0;background:#101520;border:1px solid #ffffff16;border-radius:999px;padding:9px 13px;color:#d8dbe0;font-size:11px;font-weight:800;transition:.12s;pointer-events:none}#seh-pull-indicator.show{opacity:1}
    #seh-offline-banner{position:fixed;z-index:2147483200;left:12px;right:12px;top:70px;background:#33240d;color:#f6d78a;border:1px solid #f4b74055;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800;text-align:center;display:none}#seh-offline-banner.show{display:block}
    .seh-empty{text-align:center;color:#8f949a;padding:34px 16px;border:1px dashed #ffffff1a;border-radius:16px}



    /* V5.4: Spelarprofil – appanpassad turneringshistorik */
    /* V5.16: Alla turneringar – riktig appvy, ingen bred desktop-tabell */
    body.seh-content-mode .seh-player-history-table-hidden,
    body.seh-content-mode .seh-player-history-table-wrapper-hidden{
      display:none!important;
      width:0!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

    body.seh-content-mode .seh-player-history-intro-hide{
      display:none!important;
    }

    body.seh-content-mode .seh-player-history-filterbar{
      display:flex!important;
      flex-wrap:nowrap!important;
      gap:7px!important;
      width:calc(100vw - 16px)!important;
      max-width:none!important;
      position:relative!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:8px 0 10px!important;
      padding:0 0 3px!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      scrollbar-width:none!important;
      -webkit-overflow-scrolling:touch!important;
    }
    body.seh-content-mode .seh-player-history-filterbar{
      padding-right:6px!important;
    }

    body.seh-content-mode .seh-history-scroll-hint{
      position:sticky!important;
      right:0!important;
      flex:0 0 32px!important;
      width:32px!important;
      min-width:32px!important;
      align-self:stretch!important;
      display:grid!important;
      place-items:center!important;
      margin-left:-18px!important;
      z-index:5!important;
      pointer-events:none!important;
      color:#f0d58b!important;
      font:900 22px/1 Inter,Arial,sans-serif!important;
      background:linear-gradient(90deg,rgba(2,3,10,0),rgba(2,3,10,.88) 45%,#02030a 78%)!important;
      transition:opacity .18s ease!important;
    }

    body.seh-content-mode .seh-history-scroll-hint.is-end{
      opacity:0!important;
    }

    body.seh-content-mode .seh-player-history-filterbar::-webkit-scrollbar{display:none!important}
    body.seh-content-mode .seh-player-history-filterbar > *{
      flex:0 0 auto!important;
      min-width:auto!important;
      width:auto!important;
      margin:0!important;
    }
    body.seh-content-mode .seh-player-history-filterbar button,
    body.seh-content-mode .seh-player-history-filterbar a{
      min-height:36px!important;
      padding:8px 12px!important;
      border-radius:12px!important;
      font-size:10px!important;
      line-height:1!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode .seh-player-history-cards{
      display:flex!important;
      flex-direction:column!important;
      gap:10px!important;
      width:calc(100vw - 18px)!important;
      max-width:none!important;
      position:relative!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:10px 0 0!important;
      padding:0 0 4px!important;
    }

    body.seh-content-mode .seh-player-history-card{
      width:100%!important;
      box-sizing:border-box!important;
      padding:12px 12px 10px!important;
      border:1px solid rgba(214,177,95,.42)!important;
      border-radius:15px!important;
      background:
        radial-gradient(circle at 100% 45%,rgba(214,177,95,.07),transparent 25%),
        linear-gradient(145deg,rgba(8,13,21,.99),rgba(3,7,12,.995))!important;
      box-shadow:0 10px 24px rgba(0,0,0,.16)!important;
      overflow:hidden!important;
    }
    body.seh-content-mode .seh-player-history-card[role="link"]{cursor:pointer!important}
    body.seh-content-mode .seh-player-history-card.seh-history-filter-hidden{display:none!important}

    body.seh-content-mode .seh-player-history-head{
      display:block!important;
      margin-bottom:9px!important;
    }
    body.seh-content-mode .seh-player-history-team{
      display:grid!important;
      grid-template-columns:54px minmax(0,1fr) 18px!important;
      align-items:center!important;
      gap:11px!important;
      min-width:0!important;
      width:100%!important;
    }
    body.seh-content-mode .seh-player-history-team img,
    body.seh-content-mode .seh-player-history-team .seh-player-history-team-fallback{
      grid-column:1!important;
      grid-row:1!important;
      width:54px!important;
      height:54px!important;
      min-width:54px!important;
      border-radius:12px!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-history-team img{
      object-fit:contain!important;
      background:rgba(255,255,255,.025)!important;
      border:1px solid rgba(214,177,95,.50)!important;
      padding:5px!important;
    }
    body.seh-content-mode .seh-player-history-team .seh-player-history-team-fallback{
      display:grid!important;
      place-items:center!important;
      background:rgba(255,255,255,.025)!important;
      border:1px solid rgba(214,177,95,.50)!important;
      color:#f0d58b!important;
      font:900 12px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.35px!important;
      text-transform:uppercase!important;
      padding:0!important;
    }
    body.seh-content-mode .seh-player-history-team-copy{
      grid-column:2!important;
      grid-row:1!important;
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      gap:5px!important;
      min-width:0!important;
    }
    body.seh-content-mode .seh-player-history-team-name{
      display:block!important;
      min-width:0!important;
      color:#f5f3ed!important;
      font:950 16px/1.08 Inter,Arial,sans-serif!important;
      text-align:left!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
      letter-spacing:-.15px!important;
    }
    body.seh-content-mode .seh-player-history-season{
      display:block!important;
      min-width:0!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      color:#9ca4af!important;
      font:800 11px/1.2 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
    }
    body.seh-content-mode .seh-player-history-chevron{
      grid-column:3!important;
      grid-row:1!important;
      justify-self:end!important;
      color:#f0c33b!important;
      font:500 30px/1 Inter,Arial,sans-serif!important;
      transform:translateY(-1px)!important;
      text-shadow:0 0 12px rgba(214,177,95,.16)!important;
    }

    body.seh-content-mode .seh-player-history-stat-group{
      position:relative!important;
      width:100%!important;
      min-width:0!important;
    }
    body.seh-content-mode .seh-player-history-stat-group + .seh-player-history-stat-group{
      margin-top:8px!important;
    }
    body.seh-content-mode .seh-player-history-role-label{
      display:inline-flex!important;
      align-items:center!important;
      gap:5px!important;
      margin:0 0 6px 2px!important;
      color:#aab0b8!important;
      font:900 7.5px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.7px!important;
      text-transform:uppercase!important;
    }
    body.seh-content-mode .seh-player-history-role-label::before{
      content:''!important;
      width:12px!important;
      height:2px!important;
      border-radius:999px!important;
      background:#d6b15f!important;
      flex:0 0 12px!important;
    }

    body.seh-content-mode .seh-player-history-stats-shell{
      position:relative!important;
      width:100%!important;
      margin-top:0!important;
      padding:10px 0 7px!important;
      border-top:1px solid rgba(255,255,255,.075)!important;
      overflow:visible!important;
    }
    body.seh-content-mode .seh-player-history-stats-wrap{
      width:100%!important;
      max-width:100%!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      -webkit-overflow-scrolling:touch!important;
      scrollbar-width:none!important;
      -ms-overflow-style:none!important;
      overscroll-behavior-x:contain!important;
      touch-action:pan-x!important;
    }
    body.seh-content-mode .seh-player-history-stats-wrap::-webkit-scrollbar{display:none!important}
    body.seh-content-mode .seh-player-history-stats{
      display:flex!important;
      align-items:stretch!important;
      gap:0!important;
      width:max-content!important;
      min-width:100%!important;
    }
    body.seh-content-mode .seh-player-history-stat{
      flex:0 0 64px!important;
      min-width:64px!important;
      padding:2px 7px 3px!important;
      border-right:1px solid rgba(255,255,255,.085)!important;
      text-align:center!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-history-stat:first-child{padding-left:2px!important}
    body.seh-content-mode .seh-player-history-stat:last-child{border-right:0!important;padding-right:2px!important}
    body.seh-content-mode .seh-player-history-stats:not(.is-scrollable) .seh-player-history-stat{
      flex:1 1 0!important;
      min-width:0!important;
    }
    body.seh-content-mode .seh-player-history-stats-hint{
      position:absolute!important;
      z-index:3!important;
      right:-1px!important;
      top:9px!important;
      bottom:4px!important;
      width:60px!important;
      display:none!important;
      align-items:center!important;
      justify-content:flex-end!important;
      gap:3px!important;
      padding-right:4px!important;
      box-sizing:border-box!important;
      pointer-events:none!important;
      color:#f0c33b!important;
      font:950 24px/1 Inter,Arial,sans-serif!important;
      background:linear-gradient(90deg,rgba(3,7,12,0),rgba(3,7,12,.78) 42%,rgba(3,7,12,.99) 78%)!important;
      transition:opacity .16s ease!important;
    }
    body.seh-content-mode .seh-player-history-stats-hint small{
      color:#b1b6bd!important;
      font:900 7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.2px!important;
      text-transform:none!important;
      white-space:nowrap!important;
    }
    body.seh-content-mode .seh-player-history-stats-hint b{
      color:#f0c33b!important;
      font:950 24px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-history-stats-shell.has-overflow .seh-player-history-stats-hint{
      display:flex!important;
    }
    body.seh-content-mode .seh-player-history-stats-shell.has-overflow.is-end .seh-player-history-stats-hint{
      opacity:0!important;
    }
    body.seh-content-mode .seh-player-history-stat .k{
      display:block!important;
      margin-bottom:5px!important;
      color:#9299a3!important;
      font:850 7.3px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.35px!important;
      text-transform:uppercase!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    body.seh-content-mode .seh-player-history-stat .v{
      display:block!important;
      color:#f5f3ed!important;
      font:950 16px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    body.seh-content-mode .seh-player-history-footer{
      display:flex!important;
      align-items:flex-end!important;
      justify-content:space-between!important;
      gap:8px!important;
      margin-top:7px!important;
      padding-top:8px!important;
      border-top:1px solid rgba(255,255,255,.065)!important;
      min-width:0!important;
    }
    body.seh-content-mode .seh-player-history-extra{
      display:flex!important;
      flex-wrap:wrap!important;
      gap:6px!important;
      margin:0!important;
      min-width:0!important;
    }
    body.seh-content-mode .seh-player-history-extra-item{
      display:grid!important;
      grid-template-columns:14px auto!important;
      grid-template-rows:auto auto!important;
      align-items:center!important;
      column-gap:6px!important;
      row-gap:1px!important;
      min-width:0!important;
      width:auto!important;
      padding:5px 9px 5px 7px!important;
      border:1px solid rgba(255,255,255,.10)!important;
      border-radius:12px!important;
      background:rgba(255,255,255,.02)!important;
    }
    body.seh-content-mode .seh-player-history-extra-icon{
      grid-column:1!important;
      grid-row:1 / span 2!important;
      width:14px!important;
      height:14px!important;
      display:grid!important;
      place-items:center!important;
      color:#d6b15f!important;
    }
    body.seh-content-mode .seh-player-history-extra-icon svg{
      width:14px!important;
      height:14px!important;
      display:block!important;
      stroke:currentColor!important;
    }
    body.seh-content-mode .seh-player-history-extra-item .k{
      grid-column:2!important;
      grid-row:1!important;
      display:block!important;
      color:#747d88!important;
      font:850 6.5px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      margin:0!important;
    }
    body.seh-content-mode .seh-player-history-extra-item .v{
      grid-column:2!important;
      grid-row:2!important;
      display:block!important;
      color:#e7e8e9!important;
      font:850 9.5px/1.05 Inter,Arial,sans-serif!important;
      overflow-wrap:anywhere!important;
    }
    body.seh-content-mode .seh-player-history-footer-scrollhint{
      display:none!important;
      flex:0 0 auto!important;
      align-items:center!important;
      gap:4px!important;
      padding:0 2px 3px 0!important;
      color:#8f969f!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }
    body.seh-content-mode .seh-player-history-footer-scrollhint b{
      color:#f0c33b!important;
      font:950 18px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-history-card.has-scrollable-stats .seh-player-history-footer-scrollhint{
      display:flex!important;
    }

    /* Profilsektioner generellt lite tajtare i appen */
    body.seh-detail-page.seh-route-players main section,
    body.seh-detail-page.seh-route-players main article{
      margin-bottom:14px!important;
    }

    body.seh-detail-page.seh-route-players main h2{
      margin-top:18px!important;
      margin-bottom:8px!important;
    }


    /* V5.5: Spelarprofil – tydligare appanpassning */
    body.seh-content-mode .seh-player-career-grid{
      display:grid!important;
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      gap:0!important;
      width:100%!important;
      margin:8px 0 0!important;
      border:1px solid rgba(255,255,255,.10)!important;
      border-radius:14px!important;
      overflow:hidden!important;
      background:rgba(8,10,11,.94)!important;
    }
    body.seh-content-mode .seh-player-career-item{
      min-width:0!important;
      padding:12px 10px!important;
      border-right:1px solid rgba(255,255,255,.10)!important;
      border-bottom:1px solid rgba(255,255,255,.10)!important;
      box-sizing:border-box!important;
      min-height:76px!important;
    }
    body.seh-content-mode .seh-player-career-item:nth-child(3n){
      border-right:0!important;
    }
    body.seh-content-mode .seh-player-career-item.seh-last-row{
      border-bottom:0!important;
    }
    body.seh-content-mode .seh-player-career-item .label{
      display:block!important;
      margin:0 0 8px!important;
      color:#8d939c!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.55px!important;
      white-space:nowrap!important;
    }
    body.seh-content-mode .seh-player-career-item .value{
      display:block!important;
      color:#f4f1e9!important;
      font:850 20px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.6px!important;
      white-space:nowrap!important;
      overflow:visible!important;
      text-overflow:clip!important;
      font-size:18px!important;
    }

    /* V5.25: keep the website source grid readable until the app grid is built.
       #playerTeamsGrid is hidden by JS only after the new cards exist. */
    body.seh-content-mode .seh-player-team-original-list-hide,
    body.seh-content-mode .seh-player-team-original-row-hide{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

    body.seh-content-mode .seh-player-team-grid{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      width:min(760px,calc(100vw - 16px))!important;
      max-width:none!important;
      position:relative!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:10px 0 0!important;
    }
    body.seh-content-mode .seh-player-team-card{
      display:flex!important;
      flex-direction:column!important;
      gap:8px!important;
      min-width:0!important;
      padding:10px!important;
      border:1px solid rgba(255,255,255,.09)!important;
      border-radius:14px!important;
      background:linear-gradient(145deg,rgba(10,14,22,.97),rgba(6,8,13,.98))!important;
      color:#f4f1e9!important;
      text-decoration:none!important;
      min-height:132px!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-team-logo-fallback{
      display:grid!important;
      place-items:center!important;
      width:52px!important;
      height:52px!important;
      box-sizing:border-box!important;
      border-radius:10px!important;
      border:1px solid rgba(214,177,95,.35)!important;
      background:rgba(255,255,255,.02)!important;
      color:#f0d58b!important;
      font:850 11px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.3px!important;
    }

    body.seh-content-mode .seh-player-team-card .logo{
      width:52px!important;
      height:52px!important;
      border-radius:10px!important;
      border:1px solid rgba(214,177,95,.35)!important;
      object-fit:contain!important;
      background:rgba(255,255,255,.02)!important;
      padding:4px!important;
    }
    body.seh-content-mode .seh-player-team-card .title{
      display:block!important;
      color:#f4f1e9!important;
      font:800 14px/1.15 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
    }
    body.seh-content-mode .seh-player-team-card .meta{
      display:block!important;
      color:#9da4ae!important;
      font:650 10px/1.35 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
    }

    body.seh-content-mode .seh-player-merit-list{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      width:min(760px,calc(100vw - 16px))!important;
      max-width:none!important;
      position:relative!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:8px 0 0!important;
      padding:0!important;
      align-items:stretch!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-merit-card{
      display:flex!important;
      align-items:flex-start!important;
      gap:7px!important;
      min-width:0!important;
      min-height:82px!important;
      padding:9px 8px!important;
      border:1px solid rgba(255,255,255,.08)!important;
      border-radius:14px!important;
      background:linear-gradient(145deg,rgba(10,14,22,.96),rgba(6,8,13,.98))!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-merit-icon{
      flex:0 0 auto!important;
      width:24px!important;
      height:24px!important;
      border-radius:999px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      background:rgba(214,177,95,.14)!important;
      border:1px solid rgba(214,177,95,.30)!important;
      color:#f0d58b!important;
      font:900 12px/1 Inter,Arial,sans-serif!important;
      margin-top:1px!important;
    }
    body.seh-content-mode .seh-player-merit-text{
      min-width:0!important;
      color:#ece7db!important;
      font:750 11px/1.3 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
      flex:1 1 auto!important;
    }
    body.seh-content-mode .seh-player-merit-text .sub{
      display:block!important;
      margin-top:3px!important;
      color:#97a0aa!important;
      font:650 9px/1.25 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode .seh-player-merit-text .type{
      display:block!important;
      margin-bottom:4px!important;
      color:#f0d58b!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.7px!important;
    }
    body.seh-content-mode .seh-player-merit-text .main{
      display:block!important;
      color:#f2eee6!important;
      font:800 12px/1.25 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-merit-text .sub{
      display:block!important;
      margin-top:3px!important;
      color:#97a0aa!important;
      font:650 10px/1.3 Inter,Arial,sans-serif!important;
    }

    /* V5.58: Personliga meriter använder samma premiumkort som lagmeriterna. */
    body.seh-content-mode .seh-player-personal-merit-list{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      width:min(760px,calc(100vw - 16px))!important;
      max-width:none!important;
      position:relative!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:8px 0 0!important;
      padding:0!important;
      align-items:stretch!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-personal-merit-card{
      display:flex!important;
      align-items:flex-start!important;
      gap:7px!important;
      min-width:0!important;
      min-height:82px!important;
      padding:9px 8px!important;
      border:1px solid rgba(255,255,255,.08)!important;
      border-radius:14px!important;
      background:linear-gradient(145deg,rgba(10,14,22,.96),rgba(6,8,13,.98))!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-personal-merit-icon{
      flex:0 0 auto!important;
      width:24px!important;
      height:24px!important;
      border-radius:999px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      background:rgba(214,177,95,.14)!important;
      border:1px solid rgba(214,177,95,.30)!important;
      color:#f0d58b!important;
      font:900 11px/1 Inter,Arial,sans-serif!important;
      margin-top:1px!important;
    }
    body.seh-content-mode .seh-player-personal-merit-text{
      min-width:0!important;
      flex:1 1 auto!important;
      color:#ece7db!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
    }
    body.seh-content-mode .seh-player-personal-merit-text .type{
      display:block!important;
      margin-bottom:4px!important;
      color:#f0d58b!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.7px!important;
    }
    body.seh-content-mode .seh-player-personal-merit-text .main{
      display:block!important;
      color:#f2eee6!important;
      font:800 12px/1.25 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-personal-merit-text .sub{
      display:block!important;
      margin-top:3px!important;
      color:#97a0aa!important;
      font:650 10px/1.3 Inter,Arial,sans-serif!important;
    }

    @media (max-width:330px){
      body.seh-content-mode .seh-player-personal-merit-list{
        grid-template-columns:1fr!important;
        width:calc(100vw - 16px)!important;
      }
    }
    /* V5.57: Spelarprofil – Turneringar / Lag kvar; generell Matcher döljs */
    /* V5.23: original stacked summary boxes stay hidden after SPA rerenders */
    body.seh-content-mode .seh-player-summary-original-hide{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

    body.seh-content-mode .seh-player-summary-row{
      clear:both!important;
      align-self:stretch!important;
    }

    body.seh-content-mode .seh-player-summary-row{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:0!important;
      width:100%!important;
      max-width:none!important;
      margin:0!important;
      padding:0!important;
      border:1px solid rgba(255,255,255,.10)!important;
      border-radius:14px!important;
      overflow:hidden!important;
      background:rgba(8,10,11,.94)!important;
      box-sizing:border-box!important;
    }

    body.seh-content-mode .seh-player-summary-stat{
      min-width:0!important;
      min-height:82px!important;
      margin:0!important;
      padding:13px 10px 12px!important;
      border:0!important;
      border-right:1px solid rgba(255,255,255,.10)!important;
      border-radius:0!important;
      background:transparent!important;
      box-sizing:border-box!important;
    }

    body.seh-content-mode .seh-player-summary-stat:last-child{
      border-right:0!important;
    }
    body.seh-content-mode .seh-player-summary-row .seh-player-summary-stat:nth-child(3){
      display:none!important;
    }
    body.seh-content-mode .seh-player-summary-row .seh-player-summary-stat:nth-child(2){
      border-right:0!important;
    }

    body.seh-content-mode .seh-player-summary-stat .seh-player-summary-label{
      display:block!important;
      margin:0 0 8px!important;
      color:#8d939c!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.55px!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode .seh-player-summary-stat .seh-player-summary-value{
      display:block!important;
      color:#f4f1e9!important;
      font:850 24px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.7px!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }


    body.seh-content-mode .seh-player-team-brand{
      display:flex!important;
      align-items:center!important;
      gap:10px!important;
      margin:0 0 12px!important;
      width:fit-content!important;
      max-width:100%!important;
    }

    body.seh-content-mode .seh-player-team-brand-logo{
      width:34px!important;
      height:34px!important;
      object-fit:contain!important;
      display:block!important;
      flex:0 0 34px!important;
      border-radius:0!important;
      background:transparent!important;
    }

    body.seh-content-mode .seh-player-team-brand-fallback{
      width:34px!important;
      height:34px!important;
      flex:0 0 34px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
      border:1px solid rgba(214,177,95,.32)!important;
      border-radius:8px!important;
      background:rgba(214,177,95,.07)!important;
      color:#f2c300!important;
      font:850 11px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.45px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode .seh-player-team-brand-pill{
      margin:0!important;
      background:transparent!important;
      color:#f7f7f7!important;
      border:none!important;
      border-left:3px solid #f2c300!important;
      border-radius:0!important;
      box-shadow:none!important;
      padding:0 0 0 12px!important;
      min-height:auto!important;
      display:flex!important;
      align-items:center!important;
      font:800 18px/1.1 Inter,Arial,sans-serif!important;
      letter-spacing:.2px!important;
      text-transform:uppercase!important;
      width:auto!important;
      max-width:100%!important;
    }

    /* Svensk eHockey Ranking – spelarprofil */
    body.seh-content-mode .seh-player-ranking-card{
      width:100%!important;
      max-width:100%!important;
      margin:0 0 10px!important;
      padding:12px!important;
      border:1px solid rgba(214,177,95,.28)!important;
      border-radius:15px!important;
      background:linear-gradient(145deg,rgba(12,15,23,.98),rgba(6,8,13,.99))!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
    }
    body.seh-content-mode .seh-player-ranking-title{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:8px!important;
      margin-bottom:10px!important;
    }
    body.seh-content-mode .seh-player-ranking-title span{
      color:#f0d58b!important;
      font:900 10px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.75px!important;
      text-transform:uppercase!important;
    }
    body.seh-content-mode .seh-player-ranking-title small{
      color:#747d88!important;
      font:750 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.5px!important;
    }
    body.seh-content-mode .seh-player-ranking-grid{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
    }
    body.seh-content-mode .seh-player-ranking-main{
      min-width:0!important;
      padding:10px!important;
      border:1px solid rgba(255,255,255,.08)!important;
      border-radius:12px!important;
      background:rgba(255,255,255,.025)!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-ranking-main .label{
      display:block!important;
      margin-bottom:5px!important;
      color:#8d959f!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.55px!important;
    }
    body.seh-content-mode .seh-player-ranking-main .rank{
      display:block!important;
      color:#ffd400!important;
      font:950 21px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.6px!important;
    }
    body.seh-content-mode .seh-player-ranking-main .value{
      display:block!important;
      margin-top:4px!important;
      color:#f4f1e9!important;
      font:800 11px/1.15 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-ranking-meta{
      display:flex!important;
      flex-wrap:wrap!important;
      gap:6px!important;
      margin-top:8px!important;
    }
    body.seh-content-mode .seh-player-ranking-chip{
      display:inline-flex!important;
      align-items:center!important;
      min-height:23px!important;
      padding:0 8px!important;
      border:1px solid rgba(255,255,255,.08)!important;
      border-radius:999px!important;
      color:#aab1ba!important;
      background:rgba(255,255,255,.025)!important;
      font:750 8.5px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }
    body.seh-content-mode .seh-player-ranking-chip strong{
      margin-left:4px!important;
      color:#f0d58b!important;
      font-weight:900!important;
    }
    body.seh-content-mode .seh-player-ranking-main .rank em{
      color:#ffd400!important;
      font:850 10px/1 Inter,Arial,sans-serif!important;
      font-style:normal!important;
      letter-spacing:.35px!important;
    }
    body.seh-content-mode .seh-player-ranking-toggle{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      width:100%!important;
      min-height:40px!important;
      margin:10px 0 0!important;
      padding:0 2px!important;
      border:0!important;
      border-top:1px solid rgba(255,255,255,.08)!important;
      border-radius:0!important;
      background:transparent!important;
      color:#f4f1e9!important;
      font:850 9px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.25px!important;
      text-align:left!important;
      cursor:pointer!important;
    }
    body.seh-content-mode .seh-player-ranking-toggle b{
      color:#ffd400!important;
      font:900 17px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown[hidden]{display:none!important}
    body.seh-content-mode .seh-player-ranking-breakdown{
      display:grid!important;
      grid-template-columns:1fr!important;
      gap:9px!important;
      margin-top:2px!important;
      padding-top:2px!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown-group{
      padding:10px!important;
      border:1px solid rgba(255,255,255,.07)!important;
      border-radius:11px!important;
      background:rgba(255,255,255,.018)!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown-group h4{
      margin:0 0 8px!important;
      color:#f0d58b!important;
      font:900 9px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.55px!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown-row{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:10px!important;
      min-height:27px!important;
      color:#9da4ae!important;
      font:750 9px/1.2 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown-row strong{
      flex:0 0 auto!important;
      color:#f4f1e9!important;
      font-weight:900!important;
      white-space:nowrap!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown-row.is-total{
      margin-top:4px!important;
      padding-top:7px!important;
      border-top:1px solid rgba(255,212,0,.18)!important;
      color:#f4f1e9!important;
      font-weight:900!important;
    }
    body.seh-content-mode .seh-player-ranking-breakdown-row.is-total strong{
      color:#ffd400!important;
    }
    body.seh-content-mode .seh-player-ranking-note{
      margin:0!important;
      padding:0 2px 1px!important;
      color:#777f89!important;
      font:700 8px/1.45 Inter,Arial,sans-serif!important;
    }

    /* V5.74: Spelarprofil – kompaktare hero, bio och sektionslayout */
    body.seh-content-mode .seh-player-hero-photo{
      display:block!important;
      width:min(100%,210px)!important;
      max-width:min(100%,210px)!important;
      height:220px!important;
      max-height:220px!important;
      object-fit:cover!important;
      object-position:center 40%!important;
      margin:0 auto 8px!important;
    }
    body.seh-content-mode .seh-player-profile-root .player-profile-name,
    body.seh-content-mode .seh-player-profile-root h1.player-profile-name,
    body.seh-content-mode .seh-player-profile-root h1{
      margin-top:0!important;
      margin-bottom:10px!important;
    }
    body.seh-content-mode .seh-player-team-brand{
      margin:0 0 9px!important;
      gap:9px!important;
    }
    body.seh-content-mode .seh-player-team-brand-logo,
    body.seh-content-mode .seh-player-team-brand-fallback{
      width:30px!important;
      height:30px!important;
      flex-basis:30px!important;
    }
    body.seh-content-mode .seh-player-team-brand-pill{
      font:800 16px/1.08 Inter,Arial,sans-serif!important;
      padding-left:10px!important;
    }
    body.seh-content-mode .seh-player-profile-root .seh-player-summary-row{
      margin-top:2px!important;
      margin-bottom:6px!important;
    }
    body.seh-content-mode .seh-player-summary-stat{
      min-height:70px!important;
      padding:11px 10px 10px!important;
    }
    body.seh-content-mode .seh-player-summary-stat .seh-player-summary-value{
      font:850 22px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode #playerBio.seh-player-bio-section{
      margin-top:6px!important;
      padding-top:8px!important;
    }
    body.seh-content-mode .seh-player-bio-kicker{
      margin:0 0 10px!important;
      color:#f0d58b!important;
      font:900 10px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.72px!important;
      text-transform:uppercase!important;
    }
    body.seh-content-mode #playerBio.seh-player-bio-section > p{
      margin:0 0 14px!important;
      color:#e6e8ec!important;
      font:750 12px/1.52 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode #playerBio.seh-player-bio-section > p:last-child{
      margin-bottom:0!important;
    }
    body.seh-content-mode .seh-player-section-heading{
      position:relative!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:12px!important;
      width:min(760px,calc(100vw - 16px))!important;
      max-width:none!important;
      margin:14px auto 10px!important;
      padding:0!important;
      color:#f4f1e9!important;
      text-align:center!important;
    }
    body.seh-content-mode .seh-player-section-heading::before,
    body.seh-content-mode .seh-player-section-heading::after{
      content:''!important;
      display:block!important;
      flex:1 1 auto!important;
      height:1px!important;
      background:linear-gradient(90deg,rgba(214,177,95,0),rgba(214,177,95,.4),rgba(214,177,95,0))!important;
    }
    body.seh-content-mode .seh-player-section-heading + .seh-player-merit-list,
    body.seh-content-mode .seh-player-section-heading + .seh-player-personal-merit-list{
      margin-top:0!important;
    }
    body.seh-content-mode .seh-player-personal-merit-text .type{
      font:800 7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.78px!important;
      margin-bottom:3px!important;
    }
    body.seh-content-mode .seh-player-summary-row{
      border-radius:13px!important;
    }
    body.seh-content-mode .seh-player-team-grid{
      gap:7px!important;
      margin:8px 0 0!important;
    }
    body.seh-content-mode .seh-player-team-card{
      gap:6px!important;
      padding:8px!important;
      min-height:108px!important;
      border-radius:13px!important;
    }
    body.seh-content-mode .seh-player-team-card .logo,
    body.seh-content-mode .seh-player-team-logo-fallback{
      width:42px!important;
      height:42px!important;
      border-radius:9px!important;
      padding:3px!important;
    }
    body.seh-content-mode .seh-player-team-card .title{
      font:800 13px/1.15 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-team-card .meta{
      font:650 9.5px/1.3 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-history-header{
      display:flex!important;
      align-items:baseline!important;
      justify-content:space-between!important;
      gap:12px!important;
      width:min(760px,calc(100vw - 16px))!important;
      max-width:none!important;
      margin:5px auto 5px!important;
      padding:0!important;
    }
    body.seh-content-mode .seh-player-history-header > h1,
    body.seh-content-mode .seh-player-history-header > h2,
    body.seh-content-mode .seh-player-history-header > h3,
    body.seh-content-mode .seh-player-history-header > h4{
      margin:0!important;
      font-size:clamp(22px,6vw,30px)!important;
      line-height:1.08!important;
    }
    body.seh-content-mode .seh-player-history-count{
      flex:0 0 auto!important;
      color:#9da4ae!important;
      font:800 10px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.1px!important;
      white-space:nowrap!important;
    }
    body.seh-content-mode .seh-player-history-kicker{
      margin:12px 0 4px!important;
    }
    body.seh-content-mode .seh-player-history-filterbar{
      margin:4px 0 10px!important;
    }
    body.seh-content-mode .seh-player-history-cards{
      margin-bottom:10px!important;
    }
    body.seh-content-mode footer{
      margin-top:16px!important;
    }

    /* V5.79: Spelarprofil – ta bort webbfooterns stora reserverade höjd */
    body.seh-content-mode.seh-player-profile-active footer{
      min-height:0!important;
      height:auto!important;
      margin-top:14px!important;
      padding-top:16px!important;
      padding-bottom:16px!important;
      justify-content:flex-start!important;
      align-content:flex-start!important;
    }
    body.seh-content-mode.seh-player-profile-active footer > *,
    body.seh-content-mode.seh-player-profile-active footer > * > *{
      min-height:0!important;
      height:auto!important;
    }
    body.seh-content-mode.seh-player-profile-active footer > *{
      margin-top:0!important;
      margin-bottom:0!important;
      padding-top:0!important;
      padding-bottom:0!important;
    }

    /* V683: Lag-fliken – kompaktare tvåkolumnskort.
       Loggan ligger till vänster, texten till höger och säsongsantalet markeras
       med guld. Hela kortet förblir klickbart. */
    body.seh-content-mode .seh-player-team-grid{
      gap:6px!important;
      margin-top:6px!important;
      align-items:stretch!important;
    }
    body.seh-content-mode .seh-player-team-card{
      display:grid!important;
      grid-template-columns:42px minmax(0,1fr)!important;
      grid-template-rows:auto auto!important;
      column-gap:8px!important;
      row-gap:3px!important;
      align-items:center!important;
      min-height:78px!important;
      height:auto!important;
      padding:7px 8px!important;
      border-radius:12px!important;
    }
    body.seh-content-mode .seh-player-team-card .logo,
    body.seh-content-mode .seh-player-team-logo-fallback{
      grid-column:1!important;
      grid-row:1/3!important;
      align-self:center!important;
      width:42px!important;
      height:42px!important;
      margin:0!important;
      border-radius:9px!important;
      padding:3px!important;
    }
    body.seh-content-mode .seh-player-team-card .title{
      grid-column:2!important;
      grid-row:1!important;
      align-self:end!important;
      margin:0!important;
      color:#f5f2eb!important;
      font:850 13px/1.08 Inter,Arial,sans-serif!important;
      overflow-wrap:anywhere!important;
    }
    body.seh-content-mode .seh-player-team-card .meta{
      grid-column:2!important;
      grid-row:2!important;
      align-self:start!important;
      display:flex!important;
      align-items:baseline!important;
      flex-wrap:wrap!important;
      gap:2px 4px!important;
      margin:0!important;
      color:#a9b0ba!important;
      font:700 8.8px/1.15 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-team-card .season-count{
      color:#ffd400!important;
      font:950 11px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode .seh-player-team-card .season-label{
      color:#aeb5bf!important;
      font-weight:750!important;
    }
    body.seh-content-mode .seh-player-team-card .team-meta-dot{
      color:#68717e!important;
      font-weight:800!important;
    }
    body.seh-content-mode .seh-player-team-card .team-leagues{
      color:#bcc2cb!important;
      font-weight:800!important;
      letter-spacing:.02em!important;
    }

    /* V686: Historik-fliken – kompakt app-layout.
       Samma information, men mindre dödyta i header, filter och turneringskort. */
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-header{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto!important;
      align-items:baseline!important;
      gap:8px!important;
      width:100%!important;
      margin:0 0 4px!important;
      padding:0!important;
      overflow:visible!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-header > h1,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-header > h2,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-header > h3,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-header > h4{
      min-width:0!important;
      margin:0!important;
      font-size:22px!important;
      line-height:1.02!important;
      letter-spacing:-.45px!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-count{
      min-width:max-content!important;
      justify-self:end!important;
      margin:0!important;
      color:#9da4ae!important;
      font:800 9.5px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-filterbar{
      gap:5px!important;
      margin:2px 0 6px!important;
      padding:0 5px 2px 0!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-filterbar button,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-filterbar a{
      min-height:32px!important;
      padding:7px 10px!important;
      border-radius:11px!important;
      font-size:9.5px!important;
      line-height:1!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-scroll-hint{
      flex-basis:28px!important;
      width:28px!important;
      min-width:28px!important;
      margin-left:-16px!important;
      font-size:20px!important;
    }

    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-cards{
      gap:7px!important;
      margin:6px 0 0!important;
      padding-bottom:3px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-card{
      padding:9px 10px 8px!important;
      border-radius:14px!important;
      box-shadow:0 7px 18px rgba(0,0,0,.14)!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-head{
      margin-bottom:6px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-team{
      grid-template-columns:46px minmax(0,1fr) 16px!important;
      gap:9px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-team img,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-team .seh-player-history-team-fallback{
      width:46px!important;
      height:46px!important;
      min-width:46px!important;
      border-radius:10px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-team img{
      padding:4px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-team-copy{
      gap:3px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-team-name{
      font-size:15px!important;
      line-height:1.05!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-season{
      font-size:10px!important;
      line-height:1.12!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-chevron{
      font-size:27px!important;
    }

    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stat-group + .seh-player-history-stat-group{
      margin-top:6px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-role-label{
      gap:4px!important;
      margin:0 0 4px 1px!important;
      font-size:7px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stats-shell{
      padding:7px 0 5px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stat{
      flex-basis:60px!important;
      min-width:60px!important;
      padding:1px 5px 2px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stat .k{
      margin-bottom:3px!important;
      font-size:7px!important;
      line-height:1!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stat .v{
      font-size:15px!important;
      line-height:1!important;
    }

    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-footer{
      align-items:center!important;
      gap:6px!important;
      margin-top:5px!important;
      padding-top:6px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra{
      gap:4px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra-item{
      grid-template-columns:12px auto!important;
      column-gap:5px!important;
      padding:4px 7px 4px 6px!important;
      border-radius:10px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra-icon,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra-icon svg{
      width:12px!important;
      height:12px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra-item .k{
      font-size:6px!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra-item .v{
      font-size:9px!important;
      line-height:1!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-footer-scrollhint{
      padding-bottom:1px!important;
      font-size:7.5px!important;
    }

    /* V688: Historik – sex skaterstats + synlig scrollindikator i filtermenyn. */
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stats[data-stat-count="6"]{
      display:grid!important;
      grid-template-columns:repeat(6,minmax(0,1fr))!important;
      width:100%!important;
      min-width:0!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-stats[data-stat-count="6"] .seh-player-history-stat{
      flex:none!important;
      min-width:0!important;
      width:auto!important;
      padding:1px 3px 2px!important;
    }

    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-player-history-extra-item{
      padding-top:3px!important;
      padding-bottom:3px!important;
    }

    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-filter-shell{
      position:relative!important;
      width:100%!important;
      max-width:100%!important;
      left:auto!important;
      transform:none!important;
      margin:2px 0 6px!important;
      overflow:visible!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-filter-shell > .seh-player-history-filterbar{
      width:100%!important;
      max-width:100%!important;
      left:auto!important;
      transform:none!important;
      margin:0!important;
      padding:0 31px 2px 0!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-filter-shell > .seh-history-scroll-hint{
      position:absolute!important;
      top:0!important;
      bottom:2px!important;
      width:32px!important;
      min-width:32px!important;
      margin:0!important;
      display:grid!important;
      place-items:center!important;
      z-index:50!important;
      pointer-events:none!important;
      color:#ffd400!important;
      font:950 25px/1 Inter,Arial,sans-serif!important;
      text-shadow:0 0 8px rgba(255,212,0,.45)!important;
      opacity:1!important;
      transition:opacity .16s ease!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-filter-shell > .seh-history-scroll-hint.is-right{
      right:1px!important;
      left:auto!important;
      background:linear-gradient(90deg,rgba(2,3,10,0),rgba(2,3,10,.92) 42%,#02030a 72%)!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-filter-shell > .seh-history-scroll-hint.is-left{
      left:1px!important;
      right:auto!important;
      background:linear-gradient(270deg,rgba(2,3,10,0),rgba(2,3,10,.92) 42%,#02030a 72%)!important;
    }
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host) .seh-history-filter-shell > .seh-history-scroll-hint.is-hidden{
      opacity:0!important;
    }


    /* V689: ny kompakt lagprofil – samma app-tänk som spelarprofilen. */
    body.seh-content-mode.seh-team-native-v689 main{padding-top:2px!important}
    body.seh-content-mode .seh-team-native-shell{
      width:100%!important;max-width:none!important;margin:0 0 8px!important;padding:0!important;box-sizing:border-box!important
    }
    body.seh-content-mode .seh-team-native-hero{
      --seh-team-primary:#0b2647;--seh-team-secondary:#d6b15f;
      position:relative!important;isolation:isolate!important;overflow:hidden!important;
      display:grid!important;grid-template-columns:minmax(118px,36%) minmax(0,1fr)!important;
      grid-template-rows:auto auto!important;gap:0 10px!important;min-height:172px!important;
      padding:7px 8px 0 6px!important;border:1px solid rgba(214,177,95,.43)!important;
      border-radius:18px!important;background:linear-gradient(145deg,var(--seh-team-primary) 0%,#07101d 50%,#03060c 100%)!important;
      box-shadow:0 12px 34px rgba(0,0,0,.28)!important;box-sizing:border-box!important
    }
    body.seh-content-mode .seh-team-native-hero:before{
      content:''!important;position:absolute!important;z-index:-2!important;inset:0!important;pointer-events:none!important;
      background:radial-gradient(circle at 12% 24%,var(--seh-team-primary) 0%,transparent 49%),
      radial-gradient(circle at 88% 14%,var(--seh-team-secondary) 0%,transparent 35%),
      linear-gradient(180deg,rgba(255,255,255,.035),transparent 27%,rgba(0,0,0,.20) 100%)!important;opacity:.43!important
    }
    body.seh-content-mode .seh-team-native-hero:after{
      content:''!important;position:absolute!important;z-index:-1!important;inset:0!important;pointer-events:none!important;
      background:linear-gradient(90deg,rgba(2,3,10,.03),transparent 38%,rgba(2,3,10,.28) 100%)!important
    }
    body.seh-content-mode .seh-team-native-logo{
      position:relative!important;z-index:2!important;grid-column:1!important;grid-row:1!important;align-self:stretch!important;
      display:grid!important;place-items:center!important;min-height:128px!important;margin:-1px 0 0 -1px!important;
      border-right:1px solid rgba(214,177,95,.25)!important;overflow:hidden!important
    }
    body.seh-content-mode .seh-team-native-logo>.seh-team-native-mainlogo{
      position:relative!important;z-index:3!important;display:block!important;width:min(105px,86%)!important;height:min(105px,86%)!important;
      object-fit:contain!important;filter:drop-shadow(0 6px 12px rgba(0,0,0,.38))!important
    }
    body.seh-content-mode .seh-team-native-bglogo{
      position:absolute!important;z-index:1!important;left:-22px!important;top:-26px!important;width:190px!important;height:190px!important;
      object-fit:contain!important;opacity:.16!important;filter:saturate(1.08) brightness(1.14)!important;
      mix-blend-mode:screen!important;transform:rotate(-5deg)!important;pointer-events:none!important
    }
    body.seh-content-mode .seh-team-native-logo-fallback{
      position:relative!important;z-index:3!important;display:grid!important;place-items:center!important;width:96px!important;height:96px!important;
      border:1px solid rgba(214,177,95,.35)!important;border-radius:17px!important;background:rgba(4,7,13,.68)!important;
      color:#f0d58b!important;font:950 26px/1 Inter,Arial,sans-serif!important
    }
    body.seh-content-mode .seh-team-native-identity{
      position:relative!important;z-index:3!important;grid-column:2!important;grid-row:1!important;min-width:0!important;
      align-self:center!important;padding:7px 2px 5px 0!important
    }
    body.seh-content-mode .seh-team-native-name{
      margin:0 0 7px!important;color:#f6f3ec!important;font:950 clamp(22px,6.3vw,31px)/.98 Inter,Arial,sans-serif!important;
      letter-spacing:-.55px!important;overflow-wrap:anywhere!important
    }
    body.seh-content-mode .seh-team-native-country{
      display:flex!important;align-items:center!important;gap:6px!important;margin:0 0 7px!important;color:#c8cdd5!important;
      font:750 10.5px/1.15 Inter,Arial,sans-serif!important
    }
    body.seh-content-mode .seh-team-native-country .flag{font-size:14px!important}
    body.seh-content-mode .seh-team-native-leagues{
      margin:0 0 8px!important;color:#d3d7dd!important;font:800 9.3px/1.25 Inter,Arial,sans-serif!important;
      letter-spacing:.18px!important;text-transform:uppercase!important
    }
    body.seh-content-mode .seh-team-native-latest{
      display:inline-flex!important;align-items:center!important;min-height:25px!important;max-width:100%!important;padding:5px 8px!important;
      border:1px solid rgba(214,177,95,.28)!important;border-radius:999px!important;background:rgba(7,10,16,.56)!important;
      color:#f0d58b!important;font:800 8.6px/1 Inter,Arial,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;
      text-overflow:ellipsis!important;box-sizing:border-box!important
    }
    body.seh-content-mode .seh-team-native-watermark{
      position:absolute!important;z-index:0!important;right:-23px!important;top:-20px!important;width:180px!important;height:180px!important;
      opacity:.08!important;pointer-events:none!important
    }
    body.seh-content-mode .seh-team-native-watermark img{
      width:100%!important;height:100%!important;object-fit:contain!important;filter:grayscale(.15) brightness(1.45)!important
    }
    body.seh-content-mode .seh-team-native-numbers{
      position:relative!important;z-index:4!important;grid-column:1/-1!important;grid-row:2!important;display:grid!important;
      grid-template-columns:repeat(4,minmax(0,1fr))!important;width:calc(100% + 14px)!important;margin:0 -8px 0 -6px!important;
      border-top:1px solid rgba(255,255,255,.08)!important;background:linear-gradient(180deg,rgba(2,3,10,.22),rgba(2,3,10,.50))!important
    }
    body.seh-content-mode .seh-team-native-numbers>div{
      min-width:0!important;padding:7px 3px 6px!important;text-align:center!important;border-right:1px solid rgba(255,255,255,.09)!important
    }
    body.seh-content-mode .seh-team-native-numbers>div:last-child{border-right:0!important}
    body.seh-content-mode .seh-team-native-numbers strong{
      display:block!important;color:#f5f3ef!important;font:950 16px/1 Inter,Arial,sans-serif!important;white-space:nowrap!important
    }
    body.seh-content-mode .seh-team-native-numbers>div:last-child strong{color:#ffd400!important}
    body.seh-content-mode .seh-team-native-numbers span{
      display:block!important;margin-top:3px!important;color:#80d5ce!important;font:850 7.2px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;letter-spacing:.25px!important;white-space:nowrap!important
    }
    body.seh-content-mode .seh-team-native-dock{
      display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;margin:4px 0 7px!important;
      padding:3px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:13px!important;background:#060810!important
    }
    body.seh-content-mode .seh-team-native-tab{
      min-width:0!important;min-height:38px!important;margin:0!important;padding:5px 3px!important;border:1px solid rgba(255,255,255,.09)!important;
      border-radius:10px!important;background:#080b13!important;color:#aeb4bd!important;font:800 8.2px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important
    }
    body.seh-content-mode .seh-team-native-tab.is-active{
      border-color:rgba(255,208,0,.62)!important;background:linear-gradient(180deg,rgba(214,177,95,.13),rgba(214,177,95,.05))!important;
      color:#ffd400!important;box-shadow:inset 0 -2px 0 #ffd400!important
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-original-hero-hide{
      display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important
    }
    body.seh-content-mode.seh-team-native-v689 main h2,
    body.seh-content-mode.seh-team-native-v689 main h3,
    body.seh-content-mode.seh-team-native-v689 main h4{scroll-margin-top:150px!important}
    body.seh-content-mode.seh-team-native-v689 main [data-seh-team-section="overview"]{
      margin-top:7px!important;padding:12px!important;border:1px solid rgba(255,255,255,.08)!important;
      border-top-color:rgba(214,177,95,.25)!important;border-radius:14px!important;
      background:linear-gradient(145deg,rgba(9,13,21,.97),rgba(5,7,12,.99))!important
    }
    body.seh-content-mode.seh-team-native-v689 main [data-seh-team-section="overview"] h2,
    body.seh-content-mode.seh-team-native-v689 main [data-seh-team-section="overview"] h3,
    body.seh-content-mode.seh-team-native-v689 main [data-seh-team-section="overview"] h4{
      margin:0 0 9px!important;color:#ffd400!important;font:900 10px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;letter-spacing:.6px!important
    }
    body.seh-content-mode.seh-team-native-v689 main [data-seh-team-section="overview"] p{
      margin:0!important;color:#c6c8cc!important;font:650 12px/1.48 Inter,Arial,sans-serif!important
    }
    @media(max-width:350px){
      body.seh-content-mode .seh-team-native-hero{grid-template-columns:minmax(105px,34%) minmax(0,1fr)!important}
      body.seh-content-mode .seh-team-native-name{font-size:21px!important}
      body.seh-content-mode .seh-team-native-tab{font-size:7.3px!important}
    }

    /* V5.80: app-native spelarprofil med sticky identitet + vyer */
    body.seh-content-mode.seh-player-profile-active{--seh-player-dock-top:var(--seh-native-top)}
    body.seh-content-mode .seh-player-tab-shell{width:100%!important;margin:0!important;padding:0 0 22px!important;box-sizing:border-box!important}
    body.seh-content-mode .seh-player-tab-dock{position:sticky!important;top:var(--seh-player-dock-top)!important;z-index:2147481900!important;width:calc(100vw - 12px)!important;max-width:760px!important;margin:0 auto 12px!important;padding:7px!important;border:1px solid rgba(255,255,255,.10)!important;border-top-color:rgba(214,177,95,.42)!important;border-radius:15px!important;background:rgba(3,5,11,.96)!important;box-shadow:0 12px 32px rgba(0,0,0,.38)!important;backdrop-filter:blur(18px)!important;box-sizing:border-box!important}
    body.seh-content-mode .seh-player-tab-identity{display:grid!important;grid-template-columns:38px minmax(0,1fr) auto!important;align-items:center!important;gap:9px!important;min-height:38px!important;padding:0 3px 7px!important}
    body.seh-content-mode .seh-player-tab-avatar{width:38px!important;height:38px!important;border-radius:10px!important;object-fit:cover!important;border:1px solid rgba(255,208,0,.68)!important;background:#080b14!important}
    body.seh-content-mode .seh-player-tab-idcopy{min-width:0!important}
    body.seh-content-mode .seh-player-tab-name{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#fff!important;font:900 14px/1.08 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-tab-team{display:block!important;margin-top:3px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#9ea6b2!important;font:750 9px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.45px!important}
    body.seh-content-mode .seh-player-tab-rank{min-width:44px!important;padding:6px 8px!important;border:1px solid rgba(98,212,207,.28)!important;border-radius:10px!important;background:rgba(98,212,207,.055)!important;color:#f0d58b!important;text-align:center!important;font:900 11px/1 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-tabs{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;width:100%!important}
    body.seh-content-mode .seh-player-tab-button{appearance:none!important;min-width:0!important;height:36px!important;padding:0 3px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:9px!important;background:rgba(255,255,255,.025)!important;color:#9299a5!important;font:850 9.2px/1 Inter,Arial,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.seh-content-mode .seh-player-tab-button.is-active{border-color:rgba(255,208,0,.52)!important;background:linear-gradient(180deg,rgba(255,208,0,.14),rgba(214,177,95,.075))!important;color:#ffd400!important;box-shadow:inset 0 -2px 0 #ffd000!important}
    body.seh-content-mode .seh-player-tab-panel{display:none!important;width:100%!important;margin:0!important;padding:0 2px 8px!important;box-sizing:border-box!important}
    body.seh-content-mode .seh-player-tab-panel.is-active{display:block!important}
    body.seh-content-mode .seh-player-panel-title{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:4px 2px 10px!important}
    body.seh-content-mode .seh-player-panel-title h2{margin:0!important;color:#f4f1e9!important;font:900 21px/1.05 Inter,Arial,sans-serif!important;letter-spacing:-.4px!important}
    body.seh-content-mode .seh-player-panel-title span{color:#62d4cf!important;font:850 9px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.65px!important}
    body.seh-content-mode .seh-player-overview-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;width:100%!important}
    body.seh-content-mode .seh-player-overview-card,.seh-player-tab-section{min-width:0!important;padding:12px!important;border:1px solid rgba(255,255,255,.085)!important;border-top-color:rgba(214,177,95,.32)!important;border-radius:15px!important;background:linear-gradient(145deg,rgba(9,13,21,.98),rgba(5,7,12,.99))!important;box-sizing:border-box!important}
    body.seh-content-mode .seh-player-overview-card>h3{margin:0 0 10px!important;color:#f3efe7!important;font:900 14px/1.1 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-facts{display:grid!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:12px!important}
    body.seh-content-mode .seh-player-fact{display:grid!important;grid-template-columns:28px minmax(0,1fr)!important;gap:9px!important;align-items:center!important;min-height:54px!important;padding:8px 10px!important;border-bottom:1px solid rgba(255,255,255,.07)!important}.seh-player-fact:last-child{border-bottom:0!important}
    body.seh-content-mode .seh-player-fact-icon{display:grid!important;place-items:center!important;width:28px!important;height:28px!important;border-radius:9px!important;background:rgba(98,212,207,.055)!important;color:#62d4cf!important;font:900 13px/1 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-fact small{display:block!important;margin-bottom:3px!important;color:#818997!important;font:800 8px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.55px!important}
    body.seh-content-mode .seh-player-fact strong{display:block!important;color:#f2f3f5!important;font:850 11px/1.28 Inter,Arial,sans-serif!important;overflow-wrap:anywhere!important}
    body.seh-content-mode .seh-player-overview-merits{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
    body.seh-content-mode .seh-player-overview-merits .seh-player-merit-card,body.seh-content-mode .seh-player-overview-merits .seh-player-personal-merit-card{min-height:76px!important;margin:0!important}
    body.seh-content-mode .seh-player-overview-stats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:12px!important;background:rgba(255,255,255,.015)!important}
    body.seh-content-mode .seh-player-overview-stat{min-width:0!important;padding:10px 4px!important;border-right:1px solid rgba(255,255,255,.07)!important;text-align:center!important}.seh-player-overview-stat:last-child{border-right:0!important}
    body.seh-content-mode .seh-player-overview-stat strong{display:block!important;color:#f4f1e9!important;font:900 18px/1 Inter,Arial,sans-serif!important}.seh-player-overview-stat span{display:block!important;margin-top:5px!important;color:#62d4cf!important;font:800 7.5px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important}
    body.seh-content-mode .seh-player-overview-action{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;min-height:46px!important;margin-top:10px!important;padding:0 12px!important;border:1px solid rgba(255,208,0,.45)!important;border-radius:11px!important;background:rgba(255,208,0,.035)!important;color:#f4f1e9!important;font:850 11px/1 Inter,Arial,sans-serif!important;text-align:left!important}.seh-player-overview-action b{color:#ffd400!important;font:900 17px/1 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-tab-section{width:100%!important;margin:0 0 10px!important}
    body.seh-content-mode .seh-player-tab-section .seh-player-team-grid,body.seh-content-mode .seh-player-tab-section .seh-player-merit-list,body.seh-content-mode .seh-player-tab-section .seh-player-personal-merit-list,body.seh-content-mode .seh-player-tab-section .seh-player-history-filterbar,body.seh-content-mode .seh-player-tab-section .seh-player-history-cards{width:100%!important;left:auto!important;transform:none!important}
    body.seh-content-mode .seh-player-tab-section .seh-player-section-heading{width:100%!important;margin:2px 0 10px!important}
    body.seh-content-mode .seh-player-tab-section .seh-player-history-header{width:100%!important;margin:0 0 8px!important}
    body.seh-content-mode .seh-player-tab-panel[data-player-panel="history"] .seh-player-history-filterbar{margin-top:0!important}
    body.seh-content-mode .seh-player-tab-panel[data-player-panel="teams"] .seh-player-team-card{min-height:100px!important}
    body.seh-content-mode.seh-player-profile-active footer{display:none!important}
    @media(max-width:350px){body.seh-content-mode .seh-player-tab-button{font-size:8.2px!important}body.seh-content-mode .seh-player-overview-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}}

    /* V5.81: helt ny spelarprofil. Gamla webbprofilen är endast dold datakälla. */
    /* V647: legacy-profilen måste fortsätta renderas i DOM medan snabbprofilen visas.
       display:none stoppade webbprofilens hydrering på vissa Android/WebView-lägen och
       gjorde att previewn fastnade på "Laddar profilinformation". Håll källan osynlig
       och utanför viewporten i stället, men låt layout/JS fortsätta arbeta. */
    body.seh-content-mode.seh-player-native-v581 main.seh-player-native-source-host{
      display:block!important;
      position:absolute!important;
      left:-10000px!important;
      top:0!important;
      width:100vw!important;
      max-width:100vw!important;
      min-height:100vh!important;
      margin:0!important;
      opacity:0!important;
      pointer-events:none!important;
      z-index:-1!important;
    }
    body.seh-content-mode.seh-player-native-v581 main > .seh-player-native-source{display:block!important}
    body.seh-content-mode .seh-player-native-root{position:fixed!important;z-index:2147481800!important;left:0!important;right:0!important;top:var(--seh-native-top)!important;bottom:var(--seh-native-bottom)!important;display:flex!important;flex-direction:column!important;width:auto!important;max-width:none!important;margin:0!important;transform:none!important;padding:2px 2px 0!important;color:#f4f3ef!important;background:#02030a!important;box-sizing:border-box!important;overflow:hidden!important;overscroll-behavior:none!important}
    /* V642: om profilen öppnas från vår spelarkatalog visas spelarens hero direkt
       från redan laddad kortdata. Den fulla profilen hydreras ovanpå när webbdatat är klart. */
    body.seh-content-mode .seh-player-native-root.seh-player-native-fast .seh-player-native-fast-body{padding:10px 8px 20px!important;overflow:hidden!important}
    body.seh-content-mode .seh-player-native-fast-card{padding:12px!important;border:1px solid rgba(255,255,255,.08)!important;border-top-color:rgba(214,177,95,.28)!important;border-radius:14px!important;background:linear-gradient(145deg,rgba(9,13,21,.98),rgba(5,7,12,.99))!important}
    body.seh-content-mode .seh-player-native-fast-title{margin:0 0 10px!important;color:#aeb5bf!important;font:800 8px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.7px!important}
    body.seh-content-mode .seh-player-native-fast-lines{display:grid!important;gap:9px!important}
    body.seh-content-mode .seh-player-native-fast-lines i{display:block!important;height:12px!important;border-radius:7px!important;background:linear-gradient(90deg,#111621,#1b2230,#111621)!important;background-size:220% 100%!important;animation:sh 1.1s infinite!important}
    body.seh-content-mode .seh-player-native-fast-lines i:nth-child(2){width:78%!important}
    body.seh-content-mode .seh-player-native-fast-lines i:nth-child(3){width:58%!important}
    /* V638: spelarprofilens hero använder samma lagkänsla som spelarkorten.
       Hela hero-ytan får en diskret dynamisk lagbakgrund och transparent PNG-porträtt. */
    body.seh-content-mode .seh-player-native-hero{position:relative!important;isolation:isolate!important;overflow:hidden!important;display:grid!important;grid-template-columns:minmax(126px,38%) minmax(0,1fr)!important;gap:8px!important;padding:5px 5px 5px 0!important;border:1px solid rgba(214,177,95,.42)!important;border-radius:18px!important;background:linear-gradient(145deg,var(--seh-team-primary,#0b2647) 0%,#07101d 48%,#03060c 100%)!important;box-shadow:0 12px 34px rgba(0,0,0,.28)!important}
    body.seh-content-mode .seh-player-native-hero:before{content:''!important;position:absolute!important;z-index:-2!important;inset:0!important;pointer-events:none!important;background:radial-gradient(circle at 12% 25%,var(--seh-team-primary,#0b2647) 0%,transparent 48%),radial-gradient(circle at 84% 20%,var(--seh-team-secondary,#d6b15f) 0%,transparent 34%),linear-gradient(180deg,rgba(255,255,255,.035),transparent 24%,rgba(0,0,0,.16) 100%)!important;opacity:.42!important}
    body.seh-content-mode .seh-player-native-hero:after{content:''!important;position:absolute!important;z-index:-1!important;inset:0!important;pointer-events:none!important;background:linear-gradient(90deg,rgba(2,3,10,.05),transparent 38%,rgba(2,3,10,.26) 100%),linear-gradient(0deg,rgba(2,3,10,.18),transparent 32%)!important}
    body.seh-content-mode .seh-player-native-bglogo{position:absolute!important;z-index:1!important;left:-28px!important;right:auto!important;top:-10px!important;width:205px!important;height:205px!important;object-fit:contain!important;opacity:.22!important;filter:saturate(1.06) brightness(1.18) drop-shadow(0 0 18px rgba(0,0,0,.24))!important;mix-blend-mode:screen!important;transform:rotate(-4deg)!important;pointer-events:none!important}
    body.seh-content-mode .seh-player-native-portrait{position:relative!important;z-index:2!important;min-width:0!important;align-self:stretch!important;min-height:174px!important;max-height:184px!important;margin-left:-1px!important;border:0!important;border-right:1px solid rgba(214,177,95,.28)!important;border-radius:17px 10px 0 17px!important;overflow:hidden!important;background:linear-gradient(90deg,rgba(2,3,10,.03),rgba(2,3,10,.12))!important}
    body.seh-content-mode .seh-player-native-portrait:before{content:''!important;position:absolute!important;z-index:4!important;top:8%!important;right:0!important;bottom:0!important;width:1px!important;pointer-events:none!important;background:linear-gradient(180deg,transparent,rgba(240,213,139,.48) 24%,rgba(98,212,207,.18) 70%,transparent)!important;box-shadow:6px 0 16px rgba(0,0,0,.28)!important}
    body.seh-content-mode .seh-player-native-portrait:after{content:''!important;position:absolute!important;z-index:3!important;left:0!important;right:0!important;bottom:0!important;height:18px!important;pointer-events:none!important;background:linear-gradient(0deg,rgba(2,3,10,.24),transparent)!important}
    body.seh-content-mode .seh-player-native-portrait>img:not(.seh-player-native-bglogo){position:absolute!important;z-index:2!important;left:50%!important;top:0!important;bottom:auto!important;display:block!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;object-fit:contain!important;object-position:center top!important;background:transparent!important;transform:translateX(-50%) scale(1.20)!important;transform-origin:center top!important;filter:drop-shadow(0 9px 10px rgba(0,0,0,.34))!important}
    body.seh-content-mode .seh-player-native-identity{position:relative!important;z-index:2!important;display:flex!important;flex-direction:column!important;min-width:0!important;padding:3px 2px 0!important}
    body.seh-content-mode .seh-player-native-name{color:#fff!important;font:950 clamp(23px,6.7vw,34px)/.98 Inter,Arial,sans-serif!important;letter-spacing:-1px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    body.seh-content-mode .seh-player-native-team{display:flex!important;align-items:center!important;gap:7px!important;margin-top:7px!important;color:#f5f3ed!important;font:880 15px/1.06 Inter,Arial,sans-serif!important;letter-spacing:.01em!important;text-transform:uppercase!important;min-width:0!important}
    body.seh-content-mode .seh-player-native-team img{width:28px!important;height:28px!important;object-fit:contain!important;flex:0 0 28px!important}
    body.seh-content-mode .seh-player-native-team span{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    body.seh-content-mode .seh-player-native-sub{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:5px!important;margin-top:5px!important;color:#c7d2e1!important;font:800 10px/1.15 Inter,Arial,sans-serif!important;letter-spacing:.03em!important;text-transform:none!important}.seh-player-native-sub i{color:#505967!important;font-style:normal!important}
    body.seh-content-mode .seh-player-native-leagues{margin-top:6px!important;color:#d7dce5!important;font:780 8.2px/1.25 Inter,Arial,sans-serif!important;letter-spacing:.055em!important;white-space:normal!important;overflow-wrap:anywhere!important}
        body.seh-content-mode .seh-player-native-watermark{position:absolute!important;right:-8px!important;bottom:29px!important;width:min(39vw,148px)!important;height:min(39vw,148px)!important;display:grid!important;place-items:center!important;pointer-events:none!important;z-index:1!important;opacity:.055!important;filter:grayscale(.08) saturate(.92) blur(.2px)!important;mix-blend-mode:screen!important;transform:translateZ(0)!important}
    body.seh-content-mode .seh-player-native-watermark img{width:100%!important;height:100%!important;object-fit:contain!important}
body.seh-content-mode .seh-player-native-numbers{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;margin-top:auto!important;padding-top:6px!important}
    body.seh-content-mode .seh-player-native-numbers div{text-align:center!important;border-right:1px solid rgba(255,255,255,.10)!important}.seh-player-native-numbers div:last-child{border-right:0!important}
    body.seh-content-mode .seh-player-native-numbers strong{display:block!important;color:#fff!important;font:950 16px/1 Inter,Arial,sans-serif!important}.seh-player-native-numbers span{display:block!important;margin-top:3px!important;color:#62d4cf!important;font:800 6.5px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important}
    body.seh-content-mode .seh-player-native-rpbar{position:relative!important;z-index:2!important;grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;margin-top:1px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:12px!important;overflow:hidden!important;background:rgba(255,255,255,.018)!important}
    body.seh-content-mode .seh-player-native-rpbar div{min-width:0!important;padding:6px 3px!important;text-align:center!important;border-right:1px solid rgba(255,255,255,.08)!important}.seh-player-native-rpbar div:last-child{border-right:0!important}
    body.seh-content-mode .seh-player-native-rpbar strong{display:block!important;color:#ffd400!important;font:950 16px/1 Inter,Arial,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.seh-player-native-rpbar span{display:block!important;margin-top:3px!important;color:#89919d!important;font:800 6.5px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.3px!important}
    body.seh-content-mode .seh-player-native-sticky-shell{position:relative!important;z-index:2!important;flex:0 0 auto!important;width:100%!important;max-width:none!important;padding:0!important;background:linear-gradient(180deg,rgba(2,3,10,.998) 0%,rgba(2,3,10,.992) 94%,rgba(2,3,10,.94) 100%)!important;transform:none!important;overflow:visible!important}
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-root{padding-top:2px!important;margin-top:0!important}
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-compact-id,
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-root.is-subview .seh-player-native-compact-id{display:none!important}
    body.seh-content-mode .seh-player-native-dock{position:relative!important;top:auto!important;z-index:1!important;margin:0 0 1px!important;padding:2px!important;border:1px solid rgba(255,255,255,.085)!important;border-top-color:rgba(214,177,95,.32)!important;border-radius:12px!important;background:rgba(3,5,10,.965)!important;box-shadow:0 8px 22px rgba(0,0,0,.34)!important;backdrop-filter:blur(18px)!important}
    body.seh-content-mode .seh-player-native-compact-id{display:none!important;grid-template-columns:34px minmax(0,1fr) auto!important;align-items:center!important;gap:8px!important;padding:1px 2px 6px!important}.seh-player-native-root.is-subview .seh-player-native-compact-id{display:grid!important}.seh-player-native-compact-id img{width:34px!important;height:34px!important;border-radius:9px!important;object-fit:cover!important;border:1px solid rgba(255,208,0,.55)!important}.seh-player-native-compact-id div{min-width:0!important}.seh-player-native-compact-id strong,.seh-player-native-compact-id span{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.seh-player-native-compact-id strong{color:#fff!important;font:900 13px/1.05 Inter,Arial,sans-serif!important}.seh-player-native-compact-id span{margin-top:3px!important;color:#8f98a5!important;font:750 8px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important}.seh-player-native-compact-id>b{color:#ffd400!important;font:950 13px/1 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-native-tabs{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important}.seh-player-native-tabs button{appearance:none!important;height:26px!important;min-width:0!important;padding:0 1px!important;border:1px solid rgba(255,255,255,.065)!important;border-radius:7px!important;background:rgba(255,255,255,.018)!important;color:#9aa1ab!important;font:850 8px/1 Inter,Arial,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.seh-player-native-tabs button.is-active{border-color:rgba(255,208,0,.48)!important;background:rgba(255,208,0,.085)!important;color:#ffd400!important;box-shadow:inset 0 -2px 0 #ffd400!important}
    body.seh-content-mode .seh-player-native-panel{display:none!important}
    body.seh-content-mode .seh-player-native-panel.is-active{display:block!important}
    body.seh-content-mode .seh-player-native-content{flex:1 1 auto!important;min-height:0!important;width:100%!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;padding:0 0 18px!important;scrollbar-width:none!important}
    body.seh-content-mode .seh-player-native-content::-webkit-scrollbar{display:none!important}
    body.seh-content-mode .seh-player-native-panel[data-native-panel="stats"],
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host),
    body.seh-content-mode .seh-player-native-panel[data-native-panel="teams"],
    body.seh-content-mode .seh-player-native-panel[data-native-panel="merits"]{padding-top:4px!important}
    body.seh-content-mode .seh-player-native-panel[data-native-panel="stats"]>.seh-player-native-card:empty,
    body.seh-content-mode .seh-player-native-panel:is([data-native-panel="history"],[data-native-panel="stats"].seh-player-native-history-host)>.seh-player-native-card:empty,
    body.seh-content-mode .seh-player-native-panel[data-native-panel="teams"]>.seh-player-native-card:empty,
    body.seh-content-mode .seh-player-native-panel[data-native-panel="merits"]>.seh-player-native-card:empty{display:none!important}
    body.seh-content-mode .seh-player-native-panel[data-native-panel="stats"]>.seh-player-native-stats-career:not(:has(.seh-player-career-item)){display:none!important}
    body.seh-content-mode .seh-player-native-overview-grid{display:grid!important;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)!important;gap:2px!important;align-items:stretch!important;width:100%!important;margin:-5px 0 0!important}
    body.seh-content-mode .seh-player-native-facts-card,body.seh-content-mode .seh-player-native-highlights{min-width:0!important;margin-bottom:0!important;padding:4px 6px 7px!important}
    body.seh-content-mode .seh-player-native-panel[data-native-panel="overview"] .seh-player-native-heading{margin-top:0!important;margin-bottom:5px!important}
    body.seh-content-mode .seh-player-native-dock{margin-bottom:0!important}
    body.seh-content-mode .seh-player-native-career-preview{grid-column:1/-1!important;margin-top:0!important}
    body.seh-content-mode .seh-player-native-empty{padding:12px 10px!important;color:#8f98a5!important;font:750 9px/1.4 Inter,Arial,sans-serif!important;text-align:left!important}\n    body.seh-content-mode .seh-player-native-card{width:100%!important;margin:0 0 9px!important;padding:9px!important;border:1px solid rgba(255,255,255,.085)!important;border-top-color:rgba(214,177,95,.28)!important;border-radius:13px!important;background:linear-gradient(145deg,rgba(8,12,20,.98),rgba(5,7,12,.99))!important;box-sizing:border-box!important;overflow:hidden!important}
    body.seh-content-mode .seh-player-native-heading{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;margin:2px 2px 7px!important}.seh-player-native-heading span{display:none!important}.seh-player-native-heading h2{margin:0!important;color:#f5f3ed!important;font:900 13px/1 Inter,Arial,sans-serif!important;letter-spacing:-.12px!important}.seh-player-native-heading-icon{display:grid!important;place-items:center!important;width:18px!important;height:18px!important;flex:0 0 18px!important;color:#aeb5bf!important}.seh-player-native-heading-icon svg{display:block!important;width:17px!important;height:17px!important;stroke:currentColor!important}
    body.seh-content-mode .seh-player-native-facts{display:grid!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:10px!important;overflow:hidden!important}.seh-player-native-facts>div{display:grid!important;grid-template-columns:31px minmax(0,1fr)!important;gap:5px!important;align-items:center!important;min-height:46px!important;padding:5px 6px!important;border-bottom:1px solid rgba(255,255,255,.065)!important}.seh-player-native-facts>div:last-child{border-bottom:0!important}.seh-player-native-facts em{display:grid!important;place-items:center!important;width:30px!important;height:30px!important;border-radius:0!important;background:transparent!important;color:#cbd1d8!important;font:900 17px/1 Inter,Arial,sans-serif!important;font-style:normal!important}.seh-player-native-facts em.flag{font-size:19px!important}.seh-player-native-facts em.star{font-size:20px!important;color:#d8dde3!important}.seh-player-native-facts em.team-logo{width:30px!important;height:30px!important}.seh-player-native-facts em.team-logo img{display:block!important;width:27px!important;height:27px!important;object-fit:contain!important;object-position:center!important}.seh-player-native-facts p{margin:0!important;min-width:0!important}.seh-player-native-facts small,.seh-player-native-facts strong,.seh-player-native-facts p span{display:block!important}.seh-player-native-facts small{margin-bottom:2px!important;color:#8b939f!important;font:800 6px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.42px!important}.seh-player-native-facts strong{color:#f2f3f5!important;font:850 8px/1.22 Inter,Arial,sans-serif!important;overflow-wrap:anywhere!important}.seh-player-native-facts p span{margin-top:2px!important;color:#929aa6!important;font:700 6.5px/1.2 Inter,Arial,sans-serif!important;overflow-wrap:anywhere!important}
    body.seh-content-mode .seh-player-native-merit-preview{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}.seh-player-native-mini-merit{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0!important;min-height:83px!important;padding:6px 3px!important;border:1px solid rgba(214,177,95,.42)!important;border-radius:10px!important;background:linear-gradient(145deg,rgba(10,14,22,.98),rgba(5,7,12,.99))!important;text-align:center!important;box-sizing:border-box!important}.seh-player-native-mini-merit-icon{display:grid!important;place-items:center!important;width:29px!important;height:29px!important;margin-bottom:5px!important;border:1px solid rgba(214,177,95,.32)!important;border-radius:999px!important;background:rgba(214,177,95,.11)!important;color:#f0d58b!important;font:900 13px/1 Inter,Arial,sans-serif!important}.seh-player-native-mini-merit-main{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;color:#f5f2eb!important;font:850 8px/1.17 Inter,Arial,sans-serif!important}.seh-player-native-mini-merit-sub{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;margin-top:3px!important;color:#9ba4af!important;font:650 6.5px/1.15 Inter,Arial,sans-serif!important}
    body.seh-content-mode .seh-player-native-career-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:10px!important;overflow:hidden!important}.seh-player-native-career-row>div{padding:9px 2px!important;text-align:center!important;border-right:1px solid rgba(255,255,255,.07)!important}.seh-player-native-career-row>div:last-child{border-right:0!important}.seh-player-native-career-row strong{display:block!important;color:#fff!important;font:950 16px/1 Inter,Arial,sans-serif!important}.seh-player-native-career-row span{display:block!important;margin-top:4px!important;color:#62d4cf!important;font:800 6px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important}
    body.seh-content-mode .seh-player-native-action{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;min-height:38px!important;margin-top:7px!important;padding:0 10px!important;border:1px solid rgba(255,208,0,.42)!important;border-radius:9px!important;background:rgba(255,208,0,.035)!important;color:#f4f2ec!important;font:850 9px/1 Inter,Arial,sans-serif!important}.seh-player-native-action b{color:#ffd400!important;font-size:15px!important}
    body.seh-content-mode .seh-player-native-panel>.seh-player-native-heading{margin:6px 3px 10px!important}.seh-player-native-panel>.seh-player-native-card{margin-bottom:9px!important}
    body.seh-content-mode .seh-player-native-panel[data-native-panel="stats"]>.seh-player-native-inline-history-heading{
      margin-top:15px!important;
      margin-bottom:8px!important;
    }
    body.seh-content-mode .seh-player-native-panel[data-native-panel="stats"]>.seh-player-native-inline-history{
      margin-bottom:12px!important;
    }

    body.seh-content-mode .seh-player-native-inline-history > .seh-player-history-header,
    body.seh-content-mode .seh-player-native-inline-history > .seh-history-filter-shell,
    body.seh-content-mode .seh-player-native-inline-history > .seh-player-history-filterbar{
      display:none!important;
    }

    body.seh-content-mode .seh-player-native-history-meta{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:10px!important;
      margin:0 0 8px!important;
      padding:0 1px!important;
    }

    body.seh-content-mode .seh-player-native-history-meta > span{
      color:#a8b0bb!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.55px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode .seh-player-native-history-count{
      color:#f0d58b!important;
      font:900 8.5px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode .seh-player-native-history-filters{
      display:flex!important;
      align-items:center!important;
      gap:6px!important;
      width:100%!important;
      max-width:100%!important;
      margin:0 0 9px!important;
      padding:0 1px 3px!important;
      box-sizing:border-box!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      scrollbar-width:none!important;
      -webkit-overflow-scrolling:touch!important;
    }

    body.seh-content-mode .seh-player-native-history-filters::-webkit-scrollbar{
      display:none!important;
    }

    body.seh-content-mode .seh-player-native-history-filters button{
      appearance:none!important;
      -webkit-appearance:none!important;
      flex:0 0 auto!important;
      width:auto!important;
      min-width:42px!important;
      height:30px!important;
      min-height:30px!important;
      margin:0!important;
      padding:0 10px!important;
      display:grid!important;
      place-items:center!important;
      border:1px solid rgba(255,255,255,.12)!important;
      border-radius:10px!important;
      background:linear-gradient(180deg,#0b1019,#070a10)!important;
      color:#c7cdd5!important;
      font:900 8.5px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.12px!important;
      box-shadow:none!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode .seh-player-native-history-filters button.is-active{
      border-color:#ffd400!important;
      background:linear-gradient(180deg,#ffd91a,#f4c800)!important;
      color:#05070b!important;
      box-shadow:0 0 0 1px rgba(255,212,0,.10),0 4px 13px rgba(255,212,0,.10)!important;
    }

    body.seh-content-mode .seh-player-native-history-filters button:active{
      transform:translateY(1px)!important;
    }
    /* V679: Översikt behåller full hero. På underflikarna sparar vi i stället
       den riktiga höjden genom att lägga Total RP i samma rad som säsonger /
       klubbar / matcher och ta bort den separata RP-raden. Porträttets geometri
       lämnas helt orörd. */
    body.seh-content-mode .seh-player-native-sub-rp{display:none!important}
    body.seh-content-mode .seh-player-native-root.is-subview .seh-player-native-rpbar{display:none!important}
    body.seh-content-mode .seh-player-native-root.is-subview .seh-player-native-numbers{
      grid-template-columns:repeat(4,minmax(0,1fr))!important;
      padding-top:5px!important;
    }
    body.seh-content-mode .seh-player-native-root.is-subview .seh-player-native-sub-rp{display:block!important}
    body.seh-content-mode .seh-player-native-root.is-subview .seh-player-native-sub-rp strong{
      color:#ffd400!important;
      font-size:15px!important;
    }
    body.seh-content-mode .seh-player-native-root.is-subview .seh-player-native-sub-rp span{
      color:#89919d!important;
    }

    body.seh-content-mode .seh-player-native-merit-section-title{display:flex!important;align-items:center!important;gap:8px!important;margin:3px 0 8px!important;color:#f4f1e9!important;font:950 15px/1 Inter,Arial,sans-serif!important;text-transform:uppercase!important;text-align:center!important;letter-spacing:.015em!important}
    body.seh-content-mode .seh-player-native-merit-section-title::before,body.seh-content-mode .seh-player-native-merit-section-title::after{content:''!important;flex:1 1 auto!important;height:1px!important;background:linear-gradient(90deg,rgba(214,177,95,0),rgba(214,177,95,.38),rgba(214,177,95,0))!important}
    body.seh-content-mode .seh-player-native-merit-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important;box-sizing:border-box!important}
    body.seh-content-mode .seh-player-native-merit-grid .seh-player-merit-card,body.seh-content-mode .seh-player-native-merit-grid .seh-player-personal-merit-card{width:100%!important;margin:0!important;min-height:0!important;height:auto!important;padding:7px 8px!important;border-color:rgba(214,177,95,.18)!important;background:linear-gradient(145deg,rgba(10,14,22,.965),rgba(5,8,14,.99))!important}
    body.seh-content-mode .seh-player-native-merit-grid .seh-player-merit-icon,body.seh-content-mode .seh-player-native-merit-grid .seh-player-personal-merit-icon{width:27px!important;height:27px!important;flex-basis:27px!important;font-size:13px!important;background:rgba(214,177,95,.13)!important;border-color:rgba(214,177,95,.36)!important}
    body.seh-content-mode .seh-player-native-merit-grid .seh-player-merit-text .main,body.seh-content-mode .seh-player-native-merit-grid .seh-player-personal-merit-text .main{font-size:11.5px!important;line-height:1.16!important}
    body.seh-content-mode .seh-player-native-merit-grid .seh-player-merit-text .sub,body.seh-content-mode .seh-player-native-merit-grid .seh-player-personal-merit-text .sub{margin-top:3px!important;font-size:9px!important;line-height:1.18!important}
    body.seh-content-mode .seh-player-native-merit-grid .seh-player-personal-merit-text .type{margin-bottom:3px!important;font-size:7.5px!important;letter-spacing:.65px!important}
    body.seh-content-mode [data-native-panel="merits"]>.seh-player-native-card{padding:8px!important;margin-bottom:7px!important}
    body.seh-content-mode .seh-player-native-card .seh-player-ranking-card,body.seh-content-mode .seh-player-native-card .seh-player-summary-row,body.seh-content-mode .seh-player-native-card .seh-player-career-grid,body.seh-content-mode .seh-player-native-card .seh-player-history-filterbar,body.seh-content-mode .seh-player-native-card .seh-player-history-cards,body.seh-content-mode .seh-player-native-card .seh-player-team-grid,body.seh-content-mode .seh-player-native-card .seh-player-merit-list,body.seh-content-mode .seh-player-native-card .seh-player-personal-merit-list{width:100%!important;max-width:100%!important;left:auto!important;transform:none!important;margin-left:0!important;margin-right:0!important}
    body.seh-content-mode .seh-player-native-card .seh-player-section-heading{width:100%!important;margin:3px 0 9px!important}
    body.seh-content-mode.seh-player-native-v581 footer{display:none!important}
    @media(max-width:350px){body.seh-content-mode .seh-player-native-hero{grid-template-columns:112px minmax(0,1fr)!important;gap:5px!important;padding:4px 4px 4px 0!important}.seh-player-native-portrait{min-height:160px!important;max-height:168px!important}.seh-player-native-portrait>img:not(.seh-player-native-bglogo){width:100%!important;height:100%!important;top:0!important;bottom:auto!important;object-position:center top!important;max-height:none!important;transform:translateX(-50%) scale(1.20)!important;transform-origin:center top!important}.seh-player-native-name{font-size:20px!important}.seh-player-native-rpbar strong{font-size:14px!important}.seh-player-native-tabs button{font-size:7.7px!important}.seh-player-native-overview-grid{grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr)!important;gap:5px!important}.seh-player-native-card{padding:7px!important}.seh-player-native-heading h2{font-size:13px!important}.seh-player-native-facts>div{grid-template-columns:20px minmax(0,1fr)!important;gap:4px!important;padding:5px!important}.seh-player-native-facts em{width:20px!important;height:20px!important}.seh-player-native-merit-preview .seh-player-merit-card,.seh-player-native-merit-preview .seh-player-personal-merit-card{min-height:78px!important}}

    /* V5.87: utnyttja nästan hela mobilbredden */
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-root{
      width:calc(100vw - 4px)!important;
      max-width:none!important;
      margin-left:calc(50% - 50vw + 2px)!important;
      margin-right:0!important;
      transform:none!important;
      overflow:visible!important;
    }
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-sticky-shell,
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-hero,
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-dock,
    body.seh-content-mode.seh-player-native-v581 .seh-player-native-panel{
      width:100%!important;
      max-width:none!important;
      box-sizing:border-box!important;
    }
    @media(max-width:430px){
      body.seh-content-mode.seh-player-native-v581 .seh-player-native-hero{
        grid-template-columns:minmax(100px,34%) minmax(0,1fr)!important;
        gap:6px!important;
        padding:4px!important;
      }
      body.seh-content-mode.seh-player-native-v581 .seh-player-native-portrait{
        max-height:170px!important;
      }
      body.seh-content-mode.seh-player-native-v581 .seh-player-native-portrait>img:not(.seh-player-native-bglogo){
        max-height:none!important;
        aspect-ratio:auto!important;
      }
      body.seh-content-mode.seh-player-native-v581 .seh-player-native-overview-grid{
        grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)!important;
        gap:2px!important;
      }
    }

    /* V5.2: Spelarprofil – dölj rollstatistik om spelaren har 0 matcher i rollen */
    body.seh-content-mode .seh-zero-role-stats{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

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
      min-height:46px!important;
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
      border-radius:15px!important;
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



    /* V4.7 APP MOBILE PASS
       Anpassar webb-DOM:en för Android-appen utan att påverka vanliga sajten. */

    body.seh-native-app{
      --seh-content-x:14px;
    }

    /* Allmänt: mindre desktop-luft och bättre mobilrytmer */
    body.seh-content-mode main,
    body.seh-content-mode #app,
    body.seh-content-mode .app,
    body.seh-content-mode .page,
    body.seh-content-mode .page-content,
    body.seh-content-mode [class*="container"]{
      max-width:100%!important;
    }

    body.seh-content-mode main,
    body.seh-content-mode .page,
    body.seh-content-mode .page-content{
      padding-left:var(--seh-content-x)!important;
      padding-right:var(--seh-content-x)!important;
    }

    body.seh-content-mode section{
      scroll-margin-top:calc(var(--seh-native-top) + 12px);
    }

    body.seh-content-mode button,
    body.seh-content-mode a,
    body.seh-content-mode input,
    body.seh-content-mode select{
      -webkit-tap-highlight-color:transparent!important;
    }

    body.seh-content-mode button,
    body.seh-content-mode [role="button"]{
      touch-action:manipulation;
    }

    /* Formulär och filter */
    body.seh-route-players input,
    body.seh-route-players select,
    body.seh-route-teams input,
    body.seh-route-teams select,
    body.seh-route-news input,
    body.seh-route-news select{
      min-height:46px!important;
      height:46px!important;
      border-radius:13px!important;
      padding-top:0!important;
      padding-bottom:0!important;
      font-size:15px!important;
      line-height:46px!important;
    }

    body.seh-route-players input[type="checkbox"],
    body.seh-route-teams input[type="checkbox"]{
      width:21px!important;
      height:21px!important;
      min-height:21px!important;
    }

    body.seh-route-players label,
    body.seh-route-teams label{
      font-size:11px!important;
      line-height:1.2!important;
      margin-bottom:6px!important;
    }

    body.seh-route-players .seh-mobile-filter-zone,
    body.seh-route-teams .seh-mobile-filter-zone{
      display:grid!important;
      grid-template-columns:1fr 1fr!important;
      gap:10px!important;
      align-items:end!important;
      margin-bottom:14px!important;
    }

    body.seh-route-players .seh-mobile-filter-zone > *,
    body.seh-route-teams .seh-mobile-filter-zone > *{
      min-width:0!important;
      margin-top:0!important;
      margin-bottom:0!important;
    }

    body.seh-route-players .seh-mobile-filter-zone .seh-filter-search,
    body.seh-route-teams .seh-mobile-filter-zone .seh-filter-search{
      grid-column:1/-1!important;
    }

    body.seh-route-players .seh-mobile-filter-zone .seh-filter-view,
    body.seh-route-teams .seh-mobile-filter-zone .seh-filter-view{
      grid-column:1/-1!important;
    }

    body.seh-route-players .seh-filter-summary,
    body.seh-route-teams .seh-filter-summary{
      font-size:13px!important;
      line-height:1.35!important;
      margin:12px 0 14px!important;
    }



    /* V4.10: riktiga kompakta registerkort, två per rad */
    body.seh-route-players .seh-mobile-player-list,
    body.seh-route-teams .seh-mobile-team-list{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      align-items:stretch!important;
    }

    body.seh-route-players .seh-mobile-player-card,
    body.seh-route-teams .seh-mobile-team-card{
      min-width:0!important;
      width:auto!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      border-radius:15px!important;
    }

    /* Dölj den gamla webb-layouten inne i ett kort när den kompakta app-layouten finns. */
    body.seh-route-players .seh-mobile-player-card.seh-rebuilt > :not(.seh-compact-player),
    body.seh-route-teams .seh-mobile-team-card.seh-rebuilt > :not(.seh-compact-team){
      display:none!important;
    }

    .seh-compact-player,
    .seh-compact-team{
      box-sizing:border-box;
      width:100%;
      height:100%;
      padding:10px;
      color:#f2f2f2;
      text-decoration:none!important;
      background:transparent;
    }

    .seh-compact-player{
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      gap:8px!important;
      min-height:236px!important;
    }

    .seh-cp-name{
      min-width:0;
      font:800 16px/1.05 Inter,Arial,sans-serif;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      text-align:center;
      letter-spacing:-.15px;
    }

    .seh-cp-photo{
      width:80px!important;
      height:94px!important;
      max-width:80px!important;
      max-height:94px!important;
      border-radius:13px!important;
      object-fit:cover!important;
      align-self:center!important;
      background:#0b0d13;
      box-shadow:0 0 0 1px rgba(255,212,0,.35);
    }

    .seh-cp-summary{
      min-width:0;
      display:flex!important;
      flex-direction:column!important;
      gap:7px!important;
      align-self:stretch!important;
    }

    .seh-cp-inline{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:6px!important;
      flex-wrap:nowrap!important;
      min-width:0!important;
    }

    .seh-cp-line{
      color:#f5f5f5;
      font:800 9.5px/1.15 Inter,Arial,sans-serif;
      white-space:nowrap;
      text-align:center;
    }

    .seh-cp-dot{
      color:#6e7480;
      font-size:8px;
      flex:0 0 auto;
    }

    .seh-cp-latestbox{
      padding:7px 8px;
      border:1px solid rgba(255,255,255,.09);
      border-radius:10px;
      background:rgba(255,255,255,.025);
    }

    .seh-cp-kicker{
      display:block;
      margin-bottom:3px;
      color:#62d6d0;
      font:800 7.5px/1 Inter,Arial,sans-serif;
      text-transform:uppercase;
      letter-spacing:.7px;
    }

    .seh-cp-latest{
      color:#d9dce3;
      font:650 8.8px/1.25 Inter,Arial,sans-serif;
      white-space:normal!important;
      word-break:normal!important;
      overflow-wrap:anywhere!important;
    }

    .seh-cp-history{
      color:#737b88;
      font:600 7.8px/1.3 Inter,Arial,sans-serif;
      text-align:left;
      white-space:normal;
      word-break:normal;
    }

    .seh-cp-ranking{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      min-height:25px!important;
      padding:5px 8px!important;
      border:1px solid rgba(214,177,95,.28)!important;
      border-radius:999px!important;
      background:rgba(214,177,95,.07)!important;
      color:#f0d58b!important;
      font:850 9px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      box-sizing:border-box!important;
    }
    .seh-cp-ranking strong{
      color:#ffd400!important;
      font-weight:950!important;
    }
    .seh-cp-ranking .sep{color:#69717c!important;font-weight:700!important}

    /* Registerkort: den ombyggda appversionen ska alltid äga hela kortytan.
       Detta hindrar webbkortets desktop-layout från att pressas ihop i två kolumner. */
    body.seh-route-players .seh-mobile-player-card.seh-rebuilt{
      min-width:0!important;
      width:100%!important;
      padding:0!important;
      margin:0!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }
    body.seh-route-players .seh-mobile-player-card.seh-rebuilt .seh-compact-player{
      min-width:0!important;
      width:100%!important;
      max-width:100%!important;
      padding:10px 8px!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }
    body.seh-route-players .seh-mobile-player-card.seh-rebuilt .seh-cp-name{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
    }
    body.seh-route-players .seh-mobile-player-card.seh-rebuilt .seh-cp-ranking{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      padding-left:6px!important;
      padding-right:6px!important;
      font-size:8.5px!important;
    }

    .seh-compact-team{
      display:grid;
      grid-template-columns:52px minmax(0,1fr);
      grid-template-areas:
        "logo name"
        "logo badges"
        "stats stats"
        "latest latest"
        "top top";
      gap:6px 8px;
      min-height:184px;
    }

    .seh-ct-logo{
      grid-area:logo;
      width:46px!important;
      height:52px!important;
      object-fit:contain!important;
      align-self:start;
      border-radius:10px!important;
    }

    .seh-ct-name{
      grid-area:name;
      min-width:0;
      font:800 14px/1.08 Inter,Arial,sans-serif;
      overflow:hidden;
      text-overflow:ellipsis;
      display:-webkit-box;
      -webkit-line-clamp:2;
      -webkit-box-orient:vertical;
    }

    .seh-ct-badges{
      grid-area:badges;
      display:flex;
      flex-wrap:wrap;
      gap:4px;
      align-content:start;
      overflow:hidden;
      max-height:40px;
    }

    .seh-ct-badge{
      display:inline-flex;
      align-items:center;
      min-height:20px;
      padding:2px 6px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:999px;
      color:#d9dde6;
      font:700 8px/1 Inter,Arial,sans-serif;
      white-space:nowrap;
    }

    .seh-ct-stats{
      grid-area:stats;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:5px;
    }

    .seh-ct-stat{
      min-width:0;
      padding:6px 7px;
      border:1px solid rgba(255,255,255,.10);
      border-radius:9px;
    }

    .seh-ct-stat b{
      display:block;
      color:#8f96a3;
      font:700 8px/1.05 Inter,Arial,sans-serif;
      text-transform:uppercase;
      margin-bottom:3px;
    }

    .seh-ct-stat span{
      color:#ffd400;
      font:800 14px/1 Inter,Arial,sans-serif;
    }

    .seh-ct-latest,
    .seh-ct-top{
      color:#a2a7b1;
      font:600 9px/1.25 Inter,Arial,sans-serif;
      overflow:hidden;
      display:-webkit-box;
      -webkit-box-orient:vertical;
      -webkit-line-clamp:2;
    }

    .seh-ct-latest{grid-area:latest}
    .seh-ct-top{grid-area:top;color:#ececec}

    @media(max-width:350px){
      body.seh-route-players .seh-mobile-player-list,
      body.seh-route-teams .seh-mobile-team-list{
        grid-template-columns:1fr!important;
      }
    }

    /* V4.8: tydligt kompaktare registerkort */
    body.seh-route-players .seh-mobile-player-card{
      padding:11px!important;
      margin:0 0 8px!important;
      border-radius:15px!important;
    }

    body.seh-route-players .seh-mobile-player-card h1,
    body.seh-route-players .seh-mobile-player-card h2,
    body.seh-route-players .seh-mobile-player-card h3,
    body.seh-route-players .seh-mobile-player-card h4{
      font-size:20px!important;
      line-height:1.02!important;
      margin:0 0 2px!important;
    }

    body.seh-route-players .seh-mobile-player-card img{
      max-width:78px!important;
      max-height:88px!important;
      border-radius:12px!important;
    }

    body.seh-route-players .seh-mobile-player-card hr{
      display:none!important;
    }

    body.seh-route-players .seh-mobile-player-card .seh-hide-mobile{
      display:none!important;
    }


    /* App-pagination för spelarregistret: 20 per sida + kompakt 5-sidorsrad */
    body.seh-route-players .seh-native-player-pagination-source{
      display:none!important;
    }
    body.seh-route-players .seh-app-player-pagination{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      gap:10px!important;
      width:100%!important;
      max-width:100%!important;
      margin:18px auto 26px!important;
      padding:0 8px!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
    }
    body.seh-route-players .seh-app-player-pagination-pages{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:6px!important;
      width:100%!important;
      max-width:100%!important;
      overflow:hidden!important;
    }
    body.seh-route-players .seh-app-player-pagination button{
      appearance:none!important;
      -webkit-appearance:none!important;
      flex:0 0 38px!important;
      width:38px!important;
      height:38px!important;
      min-width:38px!important;
      min-height:38px!important;
      margin:0!important;
      padding:0!important;
      display:grid!important;
      place-items:center!important;
      border:1px solid rgba(255,255,255,.18)!important;
      border-radius:12px!important;
      background:#080b13!important;
      color:#f4f1e9!important;
      font:900 14px/1 Inter,Arial,sans-serif!important;
      box-shadow:none!important;
    }
    body.seh-route-players .seh-app-player-pagination button.is-active{
      background:#ffd000!important;
      border-color:#ffd000!important;
      color:#080a0f!important;
    }
    body.seh-route-players .seh-app-player-pagination button:disabled{
      opacity:.28!important;
    }
    body.seh-route-players .seh-app-player-pagination .seh-app-player-show-all{
      width:auto!important;
      min-width:112px!important;
      height:34px!important;
      min-height:34px!important;
      padding:0 15px!important;
      border-radius:999px!important;
      flex:0 0 auto!important;
      font-size:11px!important;
      color:#f0d58b!important;
      border-color:rgba(214,177,95,.35)!important;
      background:rgba(214,177,95,.06)!important;
    }
    body.seh-route-players .seh-app-player-pagination .seh-app-player-show-all.is-active{
      color:#080a0f!important;
      background:#ffd000!important;
      border-color:#ffd000!important;
    }

    body.seh-route-players .seh-mobile-player-card .seh-secondary-meta{
      font-size:10.5px!important;
      line-height:1.2!important;
      margin-top:4px!important;
      opacity:.70!important;
    }

    body.seh-route-players .seh-mobile-player-card [class*="badge"],
    body.seh-route-players .seh-mobile-player-card [class*="pill"],
    body.seh-route-players .seh-mobile-player-card [class*="chip"]{
      min-height:26px!important;
      padding:3px 8px!important;
      font-size:10px!important;
    }

    body.seh-route-players .seh-mobile-player-list{
      gap:8px!important;
    }

    /* Teamkort: mindre statistikmatris och mindre luft */
    body.seh-route-teams .seh-mobile-team-card{
      padding:11px!important;
      margin:0 0 8px!important;
      border-radius:15px!important;
    }

    body.seh-route-teams .seh-mobile-team-card h1,
    body.seh-route-teams .seh-mobile-team-card h2,
    body.seh-route-teams .seh-mobile-team-card h3{
      font-size:20px!important;
      margin:0 0 4px!important;
    }

    body.seh-route-teams .seh-mobile-team-card img{
      max-width:56px!important;
      max-height:56px!important;
    }

    body.seh-route-teams .seh-mobile-team-card hr{
      margin:7px 0!important;
    }

    body.seh-route-teams .seh-mobile-team-card [class*="stat"],
    body.seh-route-teams .seh-mobile-team-card [class*="metric"],
    body.seh-route-teams .seh-mobile-team-card [class*="grid"] > *{
      min-height:0!important;
      padding:6px!important;
      gap:2px!important;
    }

    body.seh-route-teams .seh-mobile-team-card [class*="stat"] *,
    body.seh-route-teams .seh-mobile-team-card [class*="metric"] *{
      line-height:1.12!important;
    }

    body.seh-route-teams .seh-mobile-team-card .seh-hide-mobile{
      display:none!important;
    }

    /* Spelarkort: från desktopkort till kompakt appkort */
    body.seh-route-players .seh-mobile-player-card{
      min-height:0!important;
      padding:11px!important;
      margin:0 0 8px!important;
      border-radius:18px!important;
      overflow:hidden!important;
    }

    body.seh-route-players .seh-mobile-player-card h1,
    body.seh-route-players .seh-mobile-player-card h2,
    body.seh-route-players .seh-mobile-player-card h3,
    body.seh-route-players .seh-mobile-player-card h4{
      font-size:20px!important;
      line-height:1.02!important;
      margin:0 0 4px!important;
    }

    body.seh-route-players .seh-mobile-player-card img{
      width:auto!important;
      max-width:78px!important;
      max-height:88px!important;
      object-fit:cover!important;
    }

    body.seh-route-players .seh-mobile-player-card p,
    body.seh-route-players .seh-mobile-player-card span,
    body.seh-route-players .seh-mobile-player-card small{
      line-height:1.3!important;
    }

    body.seh-route-players .seh-mobile-player-card hr{
      margin:6px 0!important;
    }

    body.seh-route-players .seh-mobile-player-card [class*="badge"],
    body.seh-route-players .seh-mobile-player-card [class*="pill"],
    body.seh-route-players .seh-mobile-player-card [class*="chip"]{
      min-height:30px!important;
      padding:5px 9px!important;
      font-size:11px!important;
      border-radius:999px!important;
    }

    body.seh-route-players .seh-mobile-player-card .seh-secondary-meta{
      font-size:12px!important;
      opacity:.78!important;
    }

    /* Listans mellanrum */
    body.seh-route-players .seh-mobile-player-list{
      display:grid!important;
      gap:12px!important;
    }

    /* Lag: samma mobila densitet */
    body.seh-route-teams .seh-mobile-team-card{
      min-height:0!important;
      padding:11px!important;
      margin:0 0 12px!important;
      border-radius:18px!important;
    }

    body.seh-route-teams .seh-mobile-team-card h1,
    body.seh-route-teams .seh-mobile-team-card h2,
    body.seh-route-teams .seh-mobile-team-card h3{
      font-size:20px!important;
      line-height:1.04!important;
      margin:0 0 6px!important;
    }

    body.seh-route-teams .seh-mobile-team-card img{
      max-width:56px!important;
      max-height:56px!important;
      object-fit:contain!important;
    }

    body.seh-route-teams .seh-mobile-team-card p,
    body.seh-route-teams .seh-mobile-team-card span{
      line-height:1.3!important;
    }

    /* Nyheter: feed snarare än stora webbkort */
    body.seh-route-news article,
    body.seh-route-news [class*="news-card"],
    body.seh-route-news [class*="article-card"]{
      padding:12px!important;
      margin-bottom:10px!important;
      border-radius:16px!important;
    }

    body.seh-route-news article img,
    body.seh-route-news [class*="news-card"] img,
    body.seh-route-news [class*="article-card"] img{
      max-height:190px!important;
      width:100%!important;
      object-fit:cover!important;
      border-radius:12px!important;
    }

    body.seh-route-news article h2,
    body.seh-route-news article h3,
    body.seh-route-news [class*="news-card"] h2,
    body.seh-route-news [class*="article-card"] h2{
      font-size:clamp(19px,5.5vw,25px)!important;
      line-height:1.08!important;
      margin:9px 0 6px!important;
    }

    body.seh-route-news article p,
    body.seh-route-news [class*="news-card"] p,
    body.seh-route-news [class*="article-card"] p{
      font-size:13px!important;
      line-height:1.4!important;
      margin:5px 0!important;
    }

    /* Shop: minimera webbintro och låt produkterna dominera */
    body.seh-route-shop main,
    body.seh-route-shop .page,
    body.seh-route-shop .page-content{
      padding-top:8px!important;
    }

    body.seh-route-shop iframe{
      width:100%!important;
      min-height:calc(100vh - var(--seh-native-top) - var(--seh-native-bottom) - 18px)!important;
      margin:0!important;
      border-radius:12px!important;
    }

    /* Detaljsidor: kompakt hero och läsbara metadata */
    body.seh-detail-page main,
    body.seh-detail-page .page,
    body.seh-detail-page .page-content{
      padding-left:14px!important;
      padding-right:14px!important;
    }

    body.seh-detail-page h1{
      font-size:clamp(30px,8vw,43px)!important;
      margin-bottom:12px!important;
    }

    body.seh-detail-page h2{
      font-size:clamp(22px,6vw,30px)!important;
      margin-top:22px!important;
      margin-bottom:10px!important;
    }

    body.seh-detail-page [class*="hero"]{
      min-height:0!important;
      padding-top:14px!important;
      padding-bottom:14px!important;
    }

    body.seh-detail-page [class*="meta"],
    body.seh-detail-page [class*="info"]{
      line-height:1.35!important;
    }

    /* Tabeller: appvänliga utan att kapa data */
    body.seh-content-mode table{
      font-size:12px!important;
      line-height:1.25!important;
    }

    body.seh-content-mode th,
    body.seh-content-mode td{
      padding:8px 7px!important;
      white-space:nowrap;
    }

    body.seh-content-mode .seh-mobile-table-wrap{
      width:100%!important;
      overflow-x:auto!important;
      -webkit-overflow-scrolling:touch;
      border-radius:14px!important;
    }

    /* Footers ska inte ta en halv skärm inne i appen */
    body.seh-native-app footer{
      padding-top:18px!important;
      padding-bottom:18px!important;
      margin-top:18px!important;
      font-size:11px!important;
    }

    body.seh-native-app footer nav,
    body.seh-native-app footer [class*="links"]{
      gap:8px!important;
    }

    /* Gemensamma kort och paneler */
    body.seh-content-mode article,
    body.seh-content-mode [class*="card"],
    body.seh-content-mode [class*="panel"]{
      box-shadow:none!important;
    }

    body.seh-content-mode [class*="modal"],
    body.seh-content-mode [role="dialog"]{
      max-width:calc(100vw - 20px)!important;
      max-height:calc(100vh - var(--seh-native-top) - 16px)!important;
      border-radius:18px!important;
    }

    /* Knappar: mindre desktopkänsla */
    body.seh-content-mode main button,
    body.seh-content-mode main a[class*="button"],
    body.seh-content-mode main a[class*="btn"]{
      min-height:40px!important;
      border-radius:12px!important;
    }

    @media (max-width:430px){
      body.seh-native-app{--seh-content-x:12px}
      body.seh-route-players .seh-mobile-player-card{padding:14px!important}
      body.seh-route-players .seh-mobile-player-card img{max-width:96px!important;max-height:108px!important}
      body.seh-route-teams .seh-mobile-filter-zone,
      body.seh-route-players .seh-mobile-filter-zone{gap:8px!important}
    }

    /* V4.5: tydlig native content treatment */
    .seh-native-content-head{
      margin:0 16px 14px;
      padding:16px 16px 14px;
      border:1px solid rgba(255,255,255,.10);
      border-radius:18px;
      background:linear-gradient(145deg,#0b101b,#060811);
      color:var(--seh-text);
      box-shadow:0 12px 30px rgba(0,0,0,.18);
    }
    .seh-native-content-head .k{
      color:var(--seh-cyan);
      font-weight:900;
      font-size:10px;
      letter-spacing:.14em;
      text-transform:uppercase;
      margin-bottom:6px;
    }
    .seh-native-content-head h2{
      margin:0!important;
      font-size:24px!important;
      line-height:1.05!important;
      letter-spacing:-.025em!important;
      color:var(--seh-text)!important;
    }
    .seh-native-content-head p{
      margin:7px 0 0!important;
      font-size:13px!important;
      line-height:1.4!important;
      color:#9aa1aa!important;
    }
    .seh-native-quickrow{
      display:flex;
      gap:8px;
      overflow-x:auto;
      scrollbar-width:none;
      margin-top:12px;
      padding-bottom:2px;
    }
    .seh-native-quickrow::-webkit-scrollbar{display:none}
    .seh-native-chip{
      flex:0 0 auto;
      border:1px solid rgba(255,255,255,.10);
      border-radius:999px;
      padding:8px 11px;
      background:#ffffff06;
      color:#d9dde2;
      font-size:11px;
      font-weight:800;
      text-decoration:none;
    }
    .seh-native-chip.gold{color:#101216;background:#ffd000;border-color:#ffd000}
    .seh-native-compact-hero{
      max-height:0!important;
      min-height:0!important;
      height:0!important;
      overflow:hidden!important;
      opacity:0!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
    }
    .seh-native-compact-intro{
      display:none!important;
    }

    /* News: remove web hero and tighten cards */
    body.seh-route-news .seh-native-content-head{margin-top:12px}
    body.seh-route-news article,
    body.seh-route-news [class*="news-card"],
    body.seh-route-news [class*="article-card"]{
      margin-bottom:12px!important;
      border-radius:16px!important;
      box-shadow:none!important;
    }

    /* Players/teams: data first */
    body.seh-route-players .seh-native-content-head,
    body.seh-route-teams .seh-native-content-head{margin-top:12px}
    body.seh-route-players input[type="search"],
    body.seh-route-players input[type="text"],
    body.seh-route-teams input[type="search"],
    body.seh-route-teams input[type="text"]{
      background:#080b12!important;
      border:1px solid rgba(255,255,255,.15)!important;
      color:#f4f1e9!important;
    }

    /* Shop: product iframe/store earlier and tighter */
    body.seh-route-shop .seh-native-content-head{margin-top:12px}
    body.seh-route-shop iframe{
      margin-top:8px!important;
      min-height:72vh!important;
      border:1px solid rgba(255,255,255,.08)!important;
    }


    /* SEC: kompaktare cupkort på mobil */
    body.seh-route-sec main article,
    body.seh-route-sec main [class*="cup-card"],
    body.seh-route-sec main [class*="tournament-card"],
    body.seh-route-sec main [class*="season-card"]{
      min-height:0!important;
    }

    body.seh-route-sec main article{
      padding:18px 20px!important;
      margin-bottom:16px!important;
      border-radius:22px!important;
    }

    body.seh-route-sec main article h1,
    body.seh-route-sec main article h2,
    body.seh-route-sec main article h3{
      margin-top:0!important;
      margin-bottom:10px!important;
      font-size:clamp(28px,7vw,38px)!important;
      line-height:1!important;
    }

    body.seh-route-sec main article img{
      max-width:74px!important;
      max-height:74px!important;
      object-fit:contain!important;
    }

    body.seh-route-sec main article p{
      margin-top:6px!important;
      margin-bottom:6px!important;
      line-height:1.25!important;
    }

    body.seh-route-sec main article hr{
      margin:14px 0!important;
    }

    /* Vanliga SEC-kortcontainrar: minska luft men behåll premiumkänslan */
    body.seh-route-sec [class*="cup-card"],
    body.seh-route-sec [class*="tournament-card"],
    body.seh-route-sec [class*="season-card"]{
      padding:18px 20px!important;
      margin-bottom:16px!important;
      border-radius:22px!important;
    }

    body.seh-route-sec [class*="cup-card"] img,
    body.seh-route-sec [class*="tournament-card"] img,
    body.seh-route-sec [class*="season-card"] img{
      max-width:74px!important;
      max-height:74px!important;
      object-fit:contain!important;
    }

    body.seh-route-sec [class*="cup-card"] h1,
    body.seh-route-sec [class*="cup-card"] h2,
    body.seh-route-sec [class*="cup-card"] h3,
    body.seh-route-sec [class*="tournament-card"] h1,
    body.seh-route-sec [class*="tournament-card"] h2,
    body.seh-route-sec [class*="tournament-card"] h3,
    body.seh-route-sec [class*="season-card"] h1,
    body.seh-route-sec [class*="season-card"] h2,
    body.seh-route-sec [class*="season-card"] h3{
      margin-bottom:10px!important;
      font-size:clamp(28px,7vw,38px)!important;
      line-height:1!important;
    }

    /* SEC: app-anpassad intern navigation */
    #seh-sec-subnav{
      position:fixed!important;
      left:0!important;
      right:0!important;
      bottom:auto!important;
      top:var(--seh-native-top)!important;
      height:42px!important;
      z-index:2147481500;
      display:flex;
      align-items:center;
      gap:3px;
      width:100%!important;
      max-width:none!important;
      overflow-x:auto;
      padding:5px 7px;
      margin:0!important;
      box-sizing:border-box;
      background:rgba(2,3,10,.98);
      border-top:1px solid rgba(255,255,255,.10);
      border-bottom:1px solid rgba(255,255,255,.08);
      backdrop-filter:blur(16px);
      box-shadow:0 8px 24px rgba(0,0,0,.28);
      scrollbar-width:none!important;
      -ms-overflow-style:none!important;
    }

    /* SEC tabs sit below the header; only the main navigation stays at the bottom. */
    body.seh-route-sec.seh-sec-cup{
      padding-top:calc(var(--seh-native-top) + 42px)!important;
      padding-bottom:var(--seh-native-bottom)!important;
    }
    body.seh-route-sec.seh-sec-cup :is(h1,h2,h3,h4){
      scroll-margin-top:calc(var(--seh-native-top) + 50px)!important;
    }
    #seh-sec-subnav::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
    #seh-sec-subnav button{
      flex:0 0 auto;
      min-height:30px;
      border:0;
      border-radius:999px;
      padding:0 10px;
      background:transparent;
      color:#a5aab3;
      font:800 10.5px/1 Inter,Arial,sans-serif;
      white-space:nowrap;
      -webkit-tap-highlight-color:transparent;
    }

    #seh-sec-subnav .seh-sec-scroll-hint{
      position:sticky;
      right:-1px;
      z-index:5;
      flex:0 0 30px;
      align-self:stretch;
      display:flex;
      align-items:center;
      justify-content:flex-end;
      padding-right:5px;
      margin-left:-4px;
      color:#ffd000;
      font:900 21px/1 Inter,Arial,sans-serif;
      pointer-events:none;
      background:linear-gradient(90deg,rgba(2,3,10,0),rgba(2,3,10,.90) 45%,rgba(2,3,10,.99) 75%);
      transition:opacity .15s ease;
    }
    #seh-sec-subnav .seh-sec-scroll-hint.hide{opacity:0}
    #seh-sec-subnav button.on{
      color:#111318;
      background:var(--seh-gold);
    }
    #seh-sec-subnav .seh-sec-more-wrap{position:relative;flex:0 0 auto}
    #seh-sec-more-menu{
      position:fixed;
      z-index:2147482500;
      min-width:150px;
      display:none;
      padding:6px;
      border:1px solid rgba(255,255,255,.12);
      border-radius:14px;
      background:#0a0d15;
      box-shadow:0 14px 34px rgba(0,0,0,.42);
    }
    #seh-sec-more-menu.show{display:block}
    #seh-sec-more-menu button{
      display:block;
      width:100%;
      min-height:40px;
      text-align:left;
      border-radius:10px;
      padding:0 12px;
      color:#e7e8ea;
      background:transparent;
      font:800 12px/1 Inter,Arial,sans-serif;
    }
    #seh-sec-more-menu button:active{background:#ffffff0d}
    body:not(.seh-route-sec) #seh-sec-subnav,
    body:not(.seh-route-sec) #seh-sec-more-menu{display:none!important}



    /* V5.0: SEC-översikten byggs helt separat i appen.
       Webbplatsens original-SEC laddar osynligt bakom och används bara som datakälla. */

    body.seh-sec-app-overview{
      overflow:hidden!important;
    }

    body.seh-sec-app-overview main{
      opacity:0!important;
      pointer-events:none!important;
    }

    body.seh-sec-app-overlay-open #seh-sec-app-index{
      pointer-events:none!important;
      visibility:hidden!important;
    }


    #seh-sec-app-index{
      position:fixed!important;
      left:0!important;
      right:0!important;
      top:var(--seh-native-top)!important;
      bottom:var(--seh-native-bottom)!important;
      z-index:2147481200!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      overscroll-behavior:contain!important;
      -webkit-overflow-scrolling:touch!important;
      background:
        linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px),
        #02030a!important;
      background-size:82px 82px!important;
      box-sizing:border-box!important;
      padding:14px 12px 22px!important;
    }

    #seh-sec-app-index::-webkit-scrollbar{display:none!important}
    #seh-sec-app-index{scrollbar-width:none!important}

    .seh-sec-index-head{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:10px;
      margin:2px 2px 13px;
    }

    .seh-sec-index-head .eyebrow{
      display:block;
      margin-bottom:4px;
      color:#58d3d2;
      font:800 8px/1 Inter,Arial,sans-serif;
      letter-spacing:1.1px;
      text-transform:uppercase;
    }

    .seh-sec-index-head h1{
      margin:0!important;
      color:#f3f3f3!important;
      font:900 24px/.95 Inter,Arial,sans-serif!important;
      letter-spacing:-.7px!important;
    }

    .seh-sec-index-head .count{
      flex:0 0 auto;
      color:#858c97;
      font:700 9px/1 Inter,Arial,sans-serif;
      padding-bottom:2px;
    }

    #seh-sec-app-cards{
      display:flex;
      flex-direction:column;
      gap:11px;
    }

    .seh-sec-app-card{
      position:relative;
      display:grid;
      grid-template-columns:minmax(0,1fr) 72px;
      grid-template-areas:
        "title logo"
        "metrics logo"
        "date date"
        "winner winner";
      gap:8px 10px;
      width:100%;
      min-height:170px;
      padding:16px;
      box-sizing:border-box;
      border:1px solid rgba(255,255,255,.14);
      border-radius:20px;
      overflow:hidden;
      text-decoration:none!important;
      color:#f4f4f4!important;
      background:
        radial-gradient(circle at 88% 15%,rgba(214,177,95,.11),transparent 31%),
        linear-gradient(135deg,rgba(21,31,34,.97),rgba(10,12,18,.98));
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.015);
    }

    .seh-sec-app-card:nth-child(odd){
      background:
        radial-gradient(circle at 88% 15%,rgba(214,177,95,.14),transparent 31%),
        linear-gradient(135deg,rgba(34,31,23,.97),rgba(13,13,18,.98));
    }

    .seh-sec-app-card:active{
      transform:scale(.992);
    }

    .seh-sec-app-title{
      grid-area:title;
      align-self:start;
      min-width:0;
      color:#f5f5f5;
      font:900 24px/.98 Inter,Arial,sans-serif;
      letter-spacing:-.7px;
      text-transform:uppercase;
    }

    .seh-sec-app-logo{
      grid-area:logo;
      justify-self:end;
      align-self:start;
      width:68px;
      height:68px;
      object-fit:contain;
    }

    .seh-sec-app-logo-fallback{
      grid-area:logo;
      justify-self:end;
      display:grid;
      place-items:center;
      width:62px;
      height:62px;
      border:1px solid rgba(214,177,95,.35);
      border-radius:14px;
      color:#d6b15f;
      font:900 18px/1 Inter,Arial,sans-serif;
      background:rgba(0,0,0,.16);
    }

    .seh-sec-app-metrics{
      grid-area:metrics;
      display:flex;
      align-items:baseline;
      flex-wrap:wrap;
      gap:6px 11px;
      min-width:0;
    }

    .seh-sec-app-metric{
      display:flex;
      align-items:baseline;
      gap:5px;
      white-space:nowrap;
    }

    .seh-sec-app-metric strong{
      color:#efc969;
      font:900 27px/1 Inter,Arial,sans-serif;
      letter-spacing:-.8px;
    }

    .seh-sec-app-metric span{
      color:#adb3bd;
      font:600 12px/1 Inter,Arial,sans-serif;
    }

    .seh-sec-app-date{
      grid-area:date;
      margin-top:2px;
      padding-top:9px;
      border-top:1px solid rgba(255,255,255,.08);
      color:#9ea6b1;
      font:600 12px/1.25 Inter,Arial,sans-serif;
    }

    .seh-sec-app-winner{
      grid-area:winner;
      display:flex;
      align-items:center;
      gap:8px;
      min-width:0;
      padding-top:3px;
    }

    .seh-sec-app-winner img{
      flex:0 0 auto;
      width:31px;
      height:31px;
      object-fit:contain;
      border-radius:8px;
    }

    .seh-sec-app-winner .meta{
      min-width:0;
    }

    .seh-sec-app-winner small{
      display:block;
      margin-bottom:2px;
      color:#8f96a0;
      font:800 8px/1 Inter,Arial,sans-serif;
      text-transform:uppercase;
      letter-spacing:.6px;
    }

    .seh-sec-app-winner strong{
      display:block;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      color:#ececec;
      font:850 12px/1.1 Inter,Arial,sans-serif;
    }

    .seh-sec-app-empty{
      padding:24px 16px;
      border:1px solid rgba(255,255,255,.10);
      border-radius:18px;
      color:#9da4ae;
      text-align:center;
      font:650 12px/1.45 Inter,Arial,sans-serif;
      background:rgba(8,11,17,.92);
    }

    .seh-sec-index-skeleton{
      display:flex;
      flex-direction:column;
      gap:11px;
    }

    .seh-sec-index-sk{
      position:relative;
      height:174px;
      border:1px solid rgba(255,255,255,.10);
      border-radius:20px;
      overflow:hidden;
      background:
        linear-gradient(90deg,rgba(255,255,255,.035),rgba(255,255,255,.075),rgba(255,255,255,.035));
      background-size:220% 100%;
      animation:sehSecIndexShimmer 1.05s linear infinite;
    }

    .seh-sec-index-sk:before{
      content:'';
      position:absolute;
      left:16px;
      right:94px;
      top:20px;
      height:23px;
      border-radius:7px;
      background:rgba(255,255,255,.09);
      box-shadow:
        0 47px 0 -4px rgba(255,255,255,.065),
        0 79px 0 -5px rgba(255,255,255,.05),
        0 120px 0 -5px rgba(255,255,255,.045);
    }

    .seh-sec-index-sk:after{
      content:'';
      position:absolute;
      right:16px;
      top:16px;
      width:64px;
      height:64px;
      border-radius:13px;
      background:rgba(255,255,255,.075);
    }

    @keyframes sehSecIndexShimmer{
      0%{background-position:100% 0}
      100%{background-position:-100% 0}
    }


    /* SEC: search + cups first */
    body.seh-route-sec .seh-native-content-head{margin-top:12px}
    body.seh-route-sec input{
      border-radius:14px!important;
    }

    @media(max-width:390px){
      #seh-native-bottom button,#seh-native-bottom a{font-size:8px}
      .seh-card-grid{gap:9px}
      .seh-card{padding:14px;min-height:125px}
      .seh-app-page{padding-left:14px;padding-right:14px}
      #seh-native-top .logo img{width:58px}
      .seh-native-content-head{margin-left:12px;margin-right:12px;padding:14px}
      .seh-native-content-head h2{font-size:22px!important}
    }
  
    /* V4.15: utnyttja mobilbredden bättre på hela appen */
    body.seh-native-app{
      --seh-content-x:6px!important;
    }

    body.seh-content-mode main,
    body.seh-content-mode .page,
    body.seh-content-mode .page-content,
    body.seh-content-mode #app,
    body.seh-content-mode .app{
      width:100%!important;
      max-width:none!important;
      margin-left:0!important;
      margin-right:0!important;
      padding-left:6px!important;
      padding-right:6px!important;
      box-sizing:border-box!important;
    }

    body.seh-content-mode main > section,
    body.seh-content-mode main > div,
    body.seh-content-mode .page-content > section{
      max-width:none!important;
    }

    /* Register */
    body.seh-route-players .seh-mobile-player-list,
    body.seh-route-teams .seh-mobile-team-list{
      width:100%!important;
      max-width:none!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:6px!important;
      margin-left:0!important;
      margin-right:0!important;
    }

    body.seh-route-players .seh-mobile-player-card,
    body.seh-route-teams .seh-mobile-team-card{
      width:100%!important;
      max-width:none!important;
      box-sizing:border-box!important;
    }

    .seh-compact-player,
    .seh-compact-team{
      padding-left:8px!important;
      padding-right:8px!important;
    }

    body.seh-route-players .seh-mobile-filter-zone,
    body.seh-route-teams .seh-mobile-filter-zone,
    body.seh-route-players .seh-filter-summary,
    body.seh-route-teams .seh-filter-summary{
      width:100%!important;
      max-width:none!important;
      margin-left:0!important;
      margin-right:0!important;
    }

    /* Nyheter */
    body.seh-route-news article,
    body.seh-route-news [class*="news-card"],
    body.seh-route-news [class*="article-card"]{
      width:100%!important;
      max-width:none!important;
      margin-left:0!important;
      margin-right:0!important;
      box-sizing:border-box!important;
    }

    /* SEC */
    body.seh-route-sec main article,
    body.seh-route-sec [class*="cup-card"],
    body.seh-route-sec [class*="tournament-card"],
    body.seh-route-sec [class*="season-card"]{
      width:100%!important;
      max-width:none!important;
      margin-left:0!important;
      margin-right:0!important;
      box-sizing:border-box!important;
    }

    #seh-sec-subnav{
      width:100%!important;
      margin-left:0!important;
      margin-right:0!important;
    }

    /* Shop + detaljsidor */
    body.seh-route-shop main,
    body.seh-route-shop .page,
    body.seh-route-shop .page-content,
    body.seh-detail-page main,
    body.seh-detail-page .page,
    body.seh-detail-page .page-content{
      width:100%!important;
      max-width:none!important;
      padding-left:6px!important;
      padding-right:6px!important;
      margin-left:0!important;
      margin-right:0!important;
      box-sizing:border-box!important;
    }

    body.seh-content-mode .seh-mobile-table-wrap{
      width:100%!important;
      max-width:none!important;
    }

    body.seh-content-mode [class*="modal"],
    body.seh-content-mode [role="dialog"]{
      max-width:calc(100vw - 12px)!important;
    }

    @media(max-width:430px){
      body.seh-native-app{--seh-content-x:5px!important}

      body.seh-content-mode main,
      body.seh-content-mode .page,
      body.seh-content-mode .page-content{
        padding-left:5px!important;
        padding-right:5px!important;
      }

      #seh-sec-subnav{
        width:100%!important;
        margin-left:0!important;
        margin-right:0!important;
      }
    }

  
    /* V4.20: stabil tvåkolumnslayout för laghistorik */
    body.seh-route-teams .seh-mobile-team-list{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      width:100%!important;
      max-width:none!important;
      align-items:stretch!important;
    }

    body.seh-route-teams .seh-mobile-team-card{
      width:100%!important;
      min-width:0!important;
      margin:0!important;
      padding:0!important;
      border-radius:16px!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }

    body.seh-route-teams .seh-mobile-team-card.seh-rebuilt > :not(.seh-compact-team){
      display:none!important;
    }

    body.seh-route-teams .seh-compact-team{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      gap:6px!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      padding:10px 8px!important;
      box-sizing:border-box!important;
      text-decoration:none!important;
      color:#f4f1e9!important;
    }

    body.seh-route-teams .seh-ct-name{
      order:1!important;
      width:100%!important;
      min-height:32px!important;
      margin:0!important;
      font:800 15px/1.08 Inter,Arial,sans-serif!important;
      text-align:center!important;
      display:-webkit-box!important;
      -webkit-line-clamp:2!important;
      -webkit-box-orient:vertical!important;
      overflow:hidden!important;
      overflow-wrap:anywhere!important;
    }

    body.seh-route-teams .seh-ct-logo-placeholder{
      order:2!important;
      width:60px!important;
      height:60px!important;
      margin:0 auto!important;
      border:1px solid rgba(255,208,0,.42)!important;
      border-radius:10px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      background:rgba(255,208,0,.035)!important;
      color:#ffd000!important;
      font:900 15px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.3px!important;
      box-sizing:border-box!important;
    }

    body.seh-route-teams .seh-ct-logo{
      order:2!important;
      width:60px!important;
      height:60px!important;
      max-width:60px!important;
      max-height:60px!important;
      object-fit:contain!important;
      margin:0 auto!important;
      border-radius:10px!important;
    }

    body.seh-route-teams .seh-ct-badges{
      order:3!important;
      display:flex!important;
      justify-content:center!important;
      flex-wrap:wrap!important;
      gap:3px!important;
      width:100%!important;
      max-height:42px!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-ct-badge{
      min-height:19px!important;
      padding:2px 5px!important;
      font-size:7.5px!important;
    }

    body.seh-route-teams .seh-ct-stats{
      order:4!important;
      display:grid!important;
      grid-template-columns:1fr 1fr!important;
      gap:5px!important;
      width:100%!important;
      margin:1px 0 0!important;
    }

    body.seh-route-teams .seh-ct-stat{
      min-height:36px!important;
      padding:5px 4px!important;
      border-radius:8px!important;
    }

    body.seh-route-teams .seh-ct-stat b{
      font-size:6.8px!important;
      margin-bottom:3px!important;
    }

    body.seh-route-teams .seh-ct-stat span{
      font-size:12px!important;
    }

    body.seh-route-teams .seh-ct-latest,
    body.seh-route-teams .seh-ct-top{
      order:5!important;
      display:block!important;
      width:100%!important;
      color:#aeb4be!important;
      font:600 8px/1.25 Inter,Arial,sans-serif!important;
      text-align:left!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
    }

    body.seh-route-teams .seh-ct-top{
      order:6!important;
      color:#ececec!important;
    }

    @media(max-width:350px){
      body.seh-route-teams .seh-mobile-team-list{grid-template-columns:1fr!important}
    }

  

    /* V4.21: Laghistoria ska följa samma mobila filtermönster som Spelare */
    body.seh-route-teams .seh-team-hero{
      min-height:0!important;
      height:auto!important;
      padding-top:8px!important;
      padding-bottom:10px!important;
      margin-top:0!important;
      margin-bottom:8px!important;
    }
    body.seh-route-teams .seh-team-hero > *{
      margin-top:0!important;
    }
    body.seh-route-teams .seh-team-hero .seh-team-kicker{
      margin-bottom:5px!important;
    }
    body.seh-route-teams .seh-team-hero h1{
      margin:0!important;
      font-size:32px!important;
      line-height:1!important;
    }

    body.seh-route-teams .seh-team-update-button{
      display:none!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone{
      display:grid!important;
      grid-template-columns:1fr 1fr!important;
      gap:8px!important;
      width:100%!important;
      margin:0 0 12px!important;
      align-items:end!important;
    }
    body.seh-route-teams .seh-mobile-filter-zone > *{
      min-width:0!important;
      width:100%!important;
      margin:0!important;
    }
    body.seh-route-teams .seh-mobile-filter-zone .seh-filter-search{
      grid-column:1/-1!important;
      grid-row:1!important;
      order:-100!important;
    }
    body.seh-route-teams .seh-mobile-filter-zone .seh-filter-search input{
      width:100%!important;
      min-width:0!important;
    }
    body.seh-route-teams .seh-mobile-filter-zone .seh-filter-control{
      grid-column:auto!important;
    }
    body.seh-route-teams .seh-mobile-filter-zone label{
      display:block!important;
      color:var(--seh-cyan)!important;
      font-size:10px!important;
      font-weight:800!important;
      text-transform:uppercase!important;
      letter-spacing:.45px!important;
      margin:0 0 5px!important;
    }
    body.seh-route-teams .seh-mobile-filter-zone select,
    body.seh-route-teams .seh-mobile-filter-zone input{
      min-height:46px!important;
      height:46px!important;
      border-radius:13px!important;
    }

    /* Ta bort extra desktop-luft precis före filterdelen. */
    body.seh-route-teams .seh-mobile-filter-zone{
      scroll-margin-top:calc(var(--seh-native-top) + 8px)!important;
    }




    /* V4.25: ta bort tomrummet mellan lagfilter och resultat */
    body.seh-route-teams .seh-team-results-start{
      margin-top:0!important;
      padding-top:0!important;
      min-height:0!important;
    }
    body.seh-route-teams .seh-team-gap-empty{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      overflow:hidden!important;
    }

    /* V4.24: Results must never be hidden by the intro cleanup */
    body.seh-route-teams .seh-team-pre-filter-spacer{
      display:block!important;
      height:auto!important;
      min-height:0!important;
      max-height:none!important;
      margin:initial!important;
      padding:initial!important;
      overflow:visible!important;
    }

    /* V4.23: Lag – sök direkt under appheadern, utan webhero/tomrum */
    body.seh-route-teams main{
      padding-top:6px!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone{
      position:relative!important;
      top:auto!important;
      width:100%!important;
      max-width:none!important;
      margin:0!important;
      padding:6px 0 12px!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct{
      grid-column:1/-1!important;
      width:100%!important;
      max-width:none!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct input{
      display:block!important;
      width:100%!important;
      max-width:none!important;
      box-sizing:border-box!important;
    }

    /* Webbsidans gamla intro/spacer får aldrig reservera höjd i appen. */
    body.seh-route-teams .seh-team-hero,
    body.seh-route-teams .seh-team-title-hide,
    body.seh-route-teams .seh-team-kicker{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

    /* V4.22: Lag – samma filtertopp som Spelare */
    body.seh-route-teams .seh-team-hero,
    body.seh-route-teams .seh-team-kicker,
    body.seh-route-teams .seh-team-title-hide{
      display:none!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      width:100%!important;
      max-width:none!important;
      margin:0!important;
      padding:10px 0 14px!important;
      align-items:end!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct{
      grid-column:1/-1!important;
      grid-row:1!important;
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      margin:0!important;
      padding:0!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct::before{
      content:'SÖK';
      display:block;
      margin:0 0 6px!important;
      color:var(--seh-cyan)!important;
      font:800 10px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.45px!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct input{
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-control-direct{
      width:100%!important;
      min-width:0!important;
      margin:0!important;
    }

    /* Inget gammalt desktop-spacerblock mellan appheader och filtren. */
    body.seh-route-teams main,
    body.seh-route-teams .page,
    body.seh-route-teams .page-content{
      padding-top:0!important;
      margin-top:0!important;
    }

  




    /* V4.35: flytta Uppdaterad + själva laglistan direkt efter antal-raden */
    body.seh-route-teams .seh-team-counts-compact + .seh-team-updated-line{
      margin:2px 0 8px!important;
      padding:0 2px!important;
    }

    body.seh-route-teams .seh-team-results-moved{
      margin-top:0!important;
      padding-top:0!important;
    }

    /* V4.34: ta bort kvarvarande tomrum mellan antal-raden och laglistan */
    body.seh-route-teams .seh-team-counts-compact{
      margin-bottom:2px!important;
      padding-bottom:4px!important;
    }

    body.seh-route-teams .seh-team-after-count-gap{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-team-updated-line{
      margin-top:4px!important;
      padding-top:0!important;
    }


    /* V4.36: antal lag + spelare som två kompakta statistik-kort */
    body.seh-route-teams .seh-team-counts-compact{
      display:grid!important;
      grid-template-columns:1fr 1fr!important;
      gap:8px!important;
      width:100%!important;
      margin:4px 0 8px!important;
      padding:0!important;
      box-sizing:border-box!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-card{
      min-width:0!important;
      padding:10px 12px 11px!important;
      border:1px solid rgba(255,255,255,.12)!important;
      border-radius:12px!important;
      background:linear-gradient(180deg,rgba(14,17,17,.96),rgba(8,10,11,.96))!important;
      box-sizing:border-box!important;
      text-align:left!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-label{
      display:block!important;
      margin:0 0 6px!important;
      color:#8f969f!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.25px!important;
      text-transform:uppercase!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-value{
      display:block!important;
      color:#ffd400!important;
      font:800 22px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.5px!important;
    }

    body.seh-route-teams .seh-team-count-dot{
      display:none!important;
    }

    /* V4.33: behåll antal lag + spelare, men utan den stora statistikpanelen */
    body.seh-route-teams .seh-team-old-count-hide{
      display:none!important;
      margin:0!important;
      padding:0!important;
      height:0!important;
      overflow:hidden!important;
    }

    /* V4.32: Lag – ta bort totalsammanfattning och dött mellanrum */
    body.seh-route-teams .seh-team-summary-hide{
      display:none!important;
      height:0!important;
      min-height:0!important;
      max-height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone{
      margin-bottom:4px!important;
      padding-bottom:6px!important;
    }

    body.seh-route-teams .seh-team-results-anchor{
      margin-top:0!important;
      padding-top:0!important;
    }

    /* V4.31: säkerställ att rebuilt lagkort alltid visar endast appkortet */
    body.seh-route-teams .seh-mobile-team-card.seh-rebuilt{
      padding:0!important;
      min-height:0!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-mobile-team-card.seh-rebuilt > :not(.seh-compact-team){
      display:none!important;
    }

    body.seh-route-teams .seh-mobile-team-card.seh-rebuilt > .seh-compact-team{
      display:flex!important;
      width:100%!important;
      height:100%!important;
    }

    /* V6.0: Spelarregistret renderas som en helt egen native appvy. */
    body.seh-route-players .seh-native-player-source-grid,
    body.seh-route-players .seh-native-player-pagination-source{
      display:none!important;
    }
    body.seh-route-players .seh-native-player-shell{
      display:block!important;
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      margin:0!important;
      padding:0!important;
      box-sizing:border-box!important;
      grid-column:1 / -1!important;
      justify-self:stretch!important;
      align-self:start!important;
    }
    body.seh-route-players .seh-app-player-sort{
      display:flex!important;
      align-items:center!important;
      justify-content:flex-end!important;
      gap:7px!important;
      width:100%!important;
      margin:10px 0 2px!important;
      padding:0!important;
      box-sizing:border-box!important;
    }
    body.seh-route-players .seh-app-player-sort label{
      color:#8d94a1!important;
      font:800 8px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.45px!important;
      text-transform:uppercase!important;
    }
    body.seh-route-players .seh-app-player-sort select{
      width:auto!important;
      min-width:112px!important;
      height:30px!important;
      padding:0 28px 0 10px!important;
      border:1px solid rgba(255,255,255,.11)!important;
      border-radius:999px!important;
      background:#080b14!important;
      color:#e8eaee!important;
      font:800 10px/1 Inter,Arial,sans-serif!important;
      outline:none!important;
    }
    body.seh-route-players .seh-app-player-sort select:disabled{opacity:.55!important}
    body.seh-route-players .seh-native-player-directory-page{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      width:100%!important;
      margin:12px 0 0!important;
      padding:0!important;
      box-sizing:border-box!important;
    }
    body.seh-route-players .seh-native-player-card-v2{
      content-visibility:auto!important;
      contain-intrinsic-size:390px 180px!important;
      min-width:0!important;
      width:100%!important;
      min-height:258px!important;
      box-sizing:border-box!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      gap:7px!important;
      padding:10px 9px!important;
      border:1px solid rgba(255,255,255,.10)!important;
      border-radius:15px!important;
      background:linear-gradient(155deg,#080b14,#03050b)!important;
      color:#f3f3f3!important;
      text-decoration:none!important;
      overflow:hidden!important;
      position:relative!important;
      box-shadow:none!important;
    }
    body.seh-route-players .seh-native-player-card-v2:before{
      content:''!important;
      position:absolute!important;
      left:0!important;right:0!important;top:0!important;
      height:2px!important;
      background:linear-gradient(90deg,#d6b15f,rgba(214,177,95,0))!important;
      opacity:.85!important;
    }
    .seh-np-head{min-width:0!important;text-align:center!important}
    .seh-np-name{
      display:block!important;
      min-width:0!important;
      max-width:100%!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
      color:#f5f5f5!important;
      font:900 15px/1.08 Inter,Arial,sans-serif!important;
      letter-spacing:-.2px!important;
    }
    .seh-np-position{
      display:block!important;
      margin-top:4px!important;
      color:#8d94a1!important;
      font:800 7.5px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.45px!important;
      text-transform:uppercase!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    .seh-np-photo{
      display:block!important;
      align-self:center!important;
      width:82px!important;height:96px!important;
      max-width:82px!important;max-height:96px!important;
      object-fit:cover!important;
      border-radius:13px!important;
      background:#0a0c12!important;
      border:1px solid rgba(255,208,0,.72)!important;
    }
    .seh-np-meta{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      min-width:0!important;
      color:#d7d9de!important;
      font:800 8.3px/1.15 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      overflow:hidden!important;
    }
    .seh-np-meta span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .seh-np-meta i{font-style:normal!important;color:#59606b!important;font-size:7px!important;flex:0 0 auto!important}
    .seh-np-ranking{
      align-self:center!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:4px!important;
      min-height:23px!important;
      max-width:100%!important;
      padding:4px 8px!important;
      box-sizing:border-box!important;
      border:1px solid rgba(98,212,207,.30)!important;
      border-radius:999px!important;
      background:rgba(98,212,207,.06)!important;
      color:#dce8e7!important;
      font:850 8px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    .seh-np-ranking strong{color:#f0d58b!important;font-weight:950!important}
    .seh-np-ranking .dot{color:#5e6872!important}
    .seh-np-ranking.is-loading{visibility:hidden!important}
    .seh-np-latest{
      min-width:0!important;
      padding:7px 8px!important;
      border:1px solid rgba(255,255,255,.075)!important;
      border-radius:9px!important;
      background:rgba(255,255,255,.02)!important;
    }
    .seh-np-latest b{
      display:block!important;
      margin-bottom:3px!important;
      color:#62d4cf!important;
      font:900 7px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.6px!important;
    }
    .seh-np-latest span{
      display:block!important;
      color:#d6d9df!important;
      font:650 8.3px/1.28 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow:visible!important;
      text-overflow:clip!important;
      overflow-wrap:anywhere!important;
      word-break:normal!important;
    }
    .seh-np-history{
      min-width:0!important;
      margin-top:auto!important;
      color:#747c89!important;
      font:650 7.5px/1.25 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    body.seh-route-players .seh-app-player-pagination{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:8px!important;
      width:100%!important;
      margin:16px 0 22px!important;
      padding:0!important;
    }
    body.seh-route-players .seh-app-player-pagination-pages{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:3px!important;
      width:100%!important;
      min-width:0!important;
    }
    body.seh-route-players .seh-app-player-pagination button{
      appearance:none!important;
      border:0!important;
      background:transparent!important;
      color:#9aa0aa!important;
      min-width:30px!important;
      height:32px!important;
      padding:0 5px!important;
      border-radius:8px!important;
      font:850 12px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-app-player-pagination button.is-active{
      color:#050609!important;
      background:#f0d58b!important;
    }
    body.seh-route-players .seh-app-player-pagination button:disabled{opacity:.28!important}
    body.seh-route-players .seh-app-player-pagination .seh-app-player-show-all{
      width:auto!important;
      min-width:82px!important;
      height:29px!important;
      padding:0 11px!important;
      border:1px solid rgba(255,255,255,.10)!important;
      border-radius:999px!important;
      color:#b9bec6!important;
      background:rgba(255,255,255,.025)!important;
      font-size:9px!important;
    }
    body.seh-route-players .seh-app-player-pagination .seh-app-player-show-all.is-active{
      border-color:rgba(240,213,139,.35)!important;
      color:#f0d58b!important;
      background:rgba(240,213,139,.06)!important;
    }


    /* ===== SPELARE V5: HELT NY APP-VY FRÅN NOLL ===== */
    /* Player directory V6: the website may still render its own 21-card grid in
       the background, but it is never shown or expanded. */
    body.seh-route-players #playerGrid,
    body.seh-route-players #playerPagination,
    body.seh-route-players #playerResultText,
    body.seh-route-players .players-compact{
      display:none!important;
    }
    body.seh-route-players .seh-zero-role-buttons{
      display:grid!important;
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      gap:7px!important;
      width:100%!important;
      margin-top:7px!important;
    }
    body.seh-route-players .seh-zero-role-buttons button{
      height:40px!important;
      border:1px solid rgba(255,255,255,.18)!important;
      border-radius:11px!important;
      background:#090b0f!important;
      color:#f3f4f7!important;
      font:800 12px/1 Inter,Arial,sans-serif!important;
      padding:0 8px!important;
    }
    body.seh-route-players .seh-zero-role-buttons button.is-active{
      border-color:#d6b15f!important;
      background:rgba(214,177,95,.10)!important;
      color:#f0d58b!important;
    }

    body.seh-route-players .seh-zero-player-source{
      display:none!important;
    }
    body.seh-route-players .seh-zero-player-shell{
      display:block!important;
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      box-sizing:border-box!important;
      grid-column:1 / -1!important;
      margin:0!important;
      padding:0 10px 18px!important;
      overflow:visible!important;
    }
    body.seh-route-players .seh-zero-player-toolbar{
      display:flex!important;
      align-items:center!important;
      justify-content:flex-end!important;
      width:100%!important;
      margin:0 0 12px!important;
      gap:8px!important;
    }
    body.seh-route-players .seh-zero-player-toolbar label{
      color:#8f97a5!important;
      font:800 10px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.45px!important;
    }
    body.seh-route-players .seh-zero-player-toolbar select{
      width:auto!important;
      min-width:132px!important;
      height:34px!important;
      padding:0 30px 0 11px!important;
      border:1px solid rgba(255,255,255,.12)!important;
      border-radius:10px!important;
      background:#090b12!important;
      color:#f3f4f7!important;
      font:800 11px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-summary{
      margin:2px 2px 12px!important;
      color:#d7dbe2!important;
      font:800 11px/1.35 Inter,Arial,sans-serif!important;
      opacity:.92!important;
    }
    body.seh-route-players .seh-zero-player-grid{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      gap:10px!important;
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      align-items:stretch!important;
      box-sizing:border-box!important;
    }
    body.seh-route-players .seh-zero-player-card{
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      min-width:0!important;
      width:100%!important;
      min-height:326px!important;
      box-sizing:border-box!important;
      padding:13px 10px 11px!important;
      border:1px solid rgba(255,255,255,.095)!important;
      border-top-color:rgba(214,177,95,.46)!important;
      border-radius:18px!important;
      background:linear-gradient(180deg,#050812 0%,#060911 100%)!important;
      color:#fff!important;
      text-decoration:none!important;
      overflow:hidden!important;
      contain:layout style paint!important;
    }
    body.seh-route-players .seh-zero-player-name{
      display:block!important;
      width:100%!important;
      min-width:0!important;
      margin:0!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
      text-align:center!important;
      color:#f6f6f7!important;
      font:900 17px/1.08 Inter,Arial,sans-serif!important;
      letter-spacing:-.35px!important;
    }
    body.seh-route-players .seh-zero-player-position{
      margin-top:5px!important;
      text-align:center!important;
      color:#8c94a2!important;
      font:850 8px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.65px!important;
      text-transform:uppercase!important;
    }
    body.seh-route-players .seh-zero-player-photo{
      display:block!important;
      width:114px!important;
      height:132px!important;
      max-width:76%!important;
      margin:11px auto 9px!important;
      object-fit:cover!important;
      object-position:center!important;
      border:1.5px solid #d7b000!important;
      border-radius:16px!important;
      background:#0b0e15!important;
    }
    body.seh-route-players .seh-zero-player-meta{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:6px!important;
      min-width:0!important;
      margin:0 0 8px!important;
      color:#b7bfca!important;
      font:780 9px/1.1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      overflow:hidden!important;
    }
    body.seh-route-players .seh-zero-player-meta span{
      min-width:0!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    body.seh-route-players .seh-zero-player-meta i{
      flex:0 0 auto!important;
      color:#5f6672!important;
      font-style:normal!important;
    }
    body.seh-route-players .seh-zero-player-rank{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      align-self:center!important;
      gap:5px!important;
      min-height:27px!important;
      max-width:100%!important;
      margin:0 0 9px!important;
      padding:5px 10px!important;
      box-sizing:border-box!important;
      border:1px solid rgba(98,212,207,.42)!important;
      border-radius:999px!important;
      background:rgba(98,212,207,.06)!important;
      color:#e2eeee!important;
      font:850 9px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }
    body.seh-route-players .seh-zero-player-rank strong{
      color:#f0d58b!important;
      font-weight:950!important;
    }
    body.seh-route-players .seh-zero-player-rank i{
      color:#64717b!important;
      font-style:normal!important;
    }
    body.seh-route-players .seh-zero-player-latest{
      min-width:0!important;
      margin:0 0 8px!important;
      padding:9px 10px!important;
      border:1px solid rgba(255,255,255,.09)!important;
      border-radius:12px!important;
      background:rgba(255,255,255,.018)!important;
    }
    body.seh-route-players .seh-zero-player-latest b{
      display:block!important;
      margin:0 0 4px!important;
      color:#62d4cf!important;
      font:900 8px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.65px!important;
    }
    body.seh-route-players .seh-zero-player-latest strong{
      display:block!important;
      color:#f4f5f7!important;
      font:880 12px/1.2 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    body.seh-route-players .seh-zero-player-latest span{
      display:block!important;
      margin-top:4px!important;
      color:#c8ced8!important;
      font:700 10px/1.25 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
    }
    body.seh-route-players .seh-zero-player-history{
      min-width:0!important;
      margin-top:auto!important;
      color:#8a93a1!important;
      font:650 8px/1.35 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      overflow:hidden!important;
      display:-webkit-box!important;
      -webkit-line-clamp:2!important;
      -webkit-box-orient:vertical!important;
      min-height:2.7em!important;
    }
    body.seh-route-players .seh-zero-player-pager{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:8px!important;
      width:100%!important;
      margin:16px 0 4px!important;
    }
    body.seh-route-players .seh-zero-player-pages{
      display:flex!important;
      justify-content:center!important;
      align-items:center!important;
      gap:3px!important;
      width:100%!important;
    }
    body.seh-route-players .seh-zero-player-pager button{
      appearance:none!important;
      min-width:30px!important;
      height:32px!important;
      padding:0 5px!important;
      border:0!important;
      border-radius:8px!important;
      background:transparent!important;
      color:#a3a9b3!important;
      font:850 12px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-pager button.is-active{
      background:#f0d58b!important;
      color:#050609!important;
    }
    body.seh-route-players .seh-zero-player-pager button:disabled{opacity:.28!important}
    body.seh-route-players .seh-zero-player-showall{
      width:auto!important;
      min-width:82px!important;
      height:29px!important;
      padding:0 12px!important;
      border:1px solid rgba(255,255,255,.11)!important;
      border-radius:999px!important;
      background:rgba(255,255,255,.025)!important;
      color:#b9bec7!important;
      font-size:9px!important;
    }
    body.seh-route-players .seh-zero-player-loading{
      grid-column:1/-1!important;
      padding:26px 0!important;
      text-align:center!important;
      color:#929aa7!important;
      font:750 11px/1.4 Inter,Arial,sans-serif!important;
    }
    @media (max-width:360px){
      body.seh-route-players .seh-zero-player-shell{padding-left:6px!important;padding-right:6px!important}
      body.seh-route-players .seh-zero-player-grid{gap:7px!important}
      body.seh-route-players .seh-zero-player-card{padding-left:7px!important;padding-right:7px!important}
      body.seh-route-players .seh-zero-player-name{font-size:15px!important}
      body.seh-route-players .seh-zero-player-photo{width:94px!important;height:110px!important}
    }

    /* SPELARE V10 — kompakt filterpanel */
    body.seh-route-players .players-toolbar{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      column-gap:8px!important;
      row-gap:10px!important;
      align-items:end!important;
    }
    body.seh-route-players .players-toolbar .players-field{
      min-width:0!important;
      margin:0!important;
      gap:5px!important;
    }
    body.seh-route-players .players-toolbar .seh-player-filter-search,
    body.seh-route-players .players-toolbar .seh-player-filter-role{
      grid-column:1 / -1!important;
    }
    body.seh-route-players .players-toolbar .seh-player-filter-division{grid-column:1!important}
    body.seh-route-players .players-toolbar .seh-player-filter-sort{grid-column:2!important}
    body.seh-route-players .players-toolbar .players-field > span:first-child{
      display:none!important;
    }
    body.seh-route-players #playerSearch,
    body.seh-route-players #divisionFilter,
    body.seh-route-players #playerSort{
      min-height:36px!important;
      height:36px!important;
      margin:0!important;
      border-radius:10px!important;
      font-size:11px!important;
    }
    body.seh-route-players #playerSearch{padding:0 12px!important}
    body.seh-route-players #divisionFilter,
    body.seh-route-players #playerSort{padding-left:10px!important;padding-right:28px!important}
    body.seh-route-players .seh-zero-role-buttons{
      gap:6px!important;
      margin-top:2px!important;
    }
    body.seh-route-players .seh-zero-role-buttons button{
      height:34px!important;
      border-radius:10px!important;
      font-size:11px!important;
    }

    /* SPELARE V17 — profilkort i samma visuella språk som nya spelarprofilen */
    body.seh-route-players .seh-zero-player-shell{
      width:100%!important;
      max-width:none!important;
      padding:0 6px 8px!important;
      box-sizing:border-box!important;
    }
    body.seh-route-players .seh-zero-player-summary{
      margin:4px 3px 12px!important;
      color:#b8bec8!important;
      font:750 10px/1.3 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-grid{
      gap:8px!important;
      align-items:stretch!important;
    }
    body.seh-route-players .seh-zero-player-card.seh-directory-card-v3{
      content-visibility:auto!important;
      contain-intrinsic-size:386px 176px!important;
      min-height:386px!important;
      padding:10px 9px 9px!important;
      gap:0!important;
      border:1px solid rgba(214,177,95,.52)!important;
      border-radius:18px!important;
      background:
        radial-gradient(circle at 50% 30%,rgba(28,88,150,.15),transparent 44%),
        linear-gradient(180deg,#08111d 0%,#040913 52%,#03050b 100%)!important;
      box-shadow:0 10px 30px rgba(0,0,0,.24)!important;
      isolation:isolate!important;
    }

    body.seh-route-players .seh-directory-card-v3.seh-team-preset{
      border-color:color-mix(in srgb,var(--seh-team-secondary) 68%,rgba(214,177,95,.45))!important;
    }

    body.seh-route-players .seh-zero-player-card.seh-directory-card-v3:before{
      content:''!important;
      position:absolute!important;
      inset:0!important;
      pointer-events:none!important;
      border-radius:inherit!important;
      background:
        linear-gradient(180deg,rgba(255,255,255,.028),transparent 15%),
        linear-gradient(135deg,rgba(255,208,0,.045),transparent 34%,rgba(98,212,207,.024))!important;
      z-index:-1!important;
    }
    body.seh-route-players .seh-zero-player-card.seh-directory-card-v3 .seh-zero-player-corner-rank{
      position:absolute!important;
      top:-1px!important;
      left:-1px!important;
      z-index:2!important;
      display:flex!important;
      align-items:center!important;
      gap:3px!important;
      min-width:42px!important;
      height:30px!important;
      padding:0 8px!important;
      box-sizing:border-box!important;
      border-right:1px solid rgba(214,177,95,.5)!important;
      border-bottom:1px solid rgba(214,177,95,.5)!important;
      border-radius:17px 0 12px 0!important;
      background:rgba(9,12,18,.94)!important;
      color:#f0d58b!important;
      font:900 10px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-corner-rank span{font-size:10px!important;color:#ffd000!important}
    body.seh-route-players .seh-zero-player-corner-rank strong{font-size:12px!important;color:#fff!important}
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-name{
      padding:2px 10px 0 46px!important;
      box-sizing:border-box!important;
      font-size:clamp(11px,3.75vw,15px)!important;
      line-height:1.02!important;
      letter-spacing:-.35px!important;
      text-shadow:0 1px 8px rgba(0,0,0,.32)!important;
    }
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-position{
      margin-top:5px!important;
      color:#62d4cf!important;
      font-size:7.6px!important;
      letter-spacing:.92px!important;
      text-shadow:0 1px 6px rgba(0,0,0,.3)!important;
    }
    body.seh-route-players .seh-zero-player-card.seh-directory-card-v3{
      --seh-team-primary:#16243a;
      --seh-team-secondary:#09101c;
    }
    /* V627: korten byggs mer som riktiga player cards.
       Vi utgår nu från kommande PNG-porträtt med axlar/överkropp,
       gör bildytan större, låter lagytan bli mer atmosfärisk och
       integrerar nedre infoboxen tydligare med porträttet. */
    body.seh-route-players .seh-zero-player-photo-frame{
      position:relative!important;
      width:100%!important;
      height:244px!important;
      margin:10px 0 0!important;
      flex:0 0 auto!important;
      overflow:hidden!important;
      border-radius:16px!important;
      background:
        radial-gradient(circle at 50% 18%,rgba(255,255,255,.10) 0%,transparent 28%),
        radial-gradient(circle at 84% 26%,rgba(255,255,255,.15) 0%,transparent 34%),
        linear-gradient(180deg,var(--seh-team-primary) 0%,var(--seh-team-primary) 38%,#08111e 62%,#060b14 100%)!important;
      box-shadow:
        inset 0 -34px 42px rgba(1,3,8,.30),
        inset 0 0 0 1px rgba(255,255,255,.055),
        inset 0 18px 38px rgba(255,255,255,.03),
        0 8px 16px rgba(0,0,0,.16)!important;
    }
    body.seh-route-players .seh-zero-player-photo-frame:before{
      content:''!important;
      position:absolute!important;
      z-index:0!important;
      inset:0!important;
      pointer-events:none!important;
      background:
        radial-gradient(circle at 14% 32%,rgba(255,255,255,.06) 0%,transparent 22%),
        radial-gradient(circle at 20% 24%,var(--seh-team-primary) 0%,transparent 58%),
        linear-gradient(0deg,rgba(0,0,0,.18),transparent 26%,transparent 100%)!important;
      opacity:.72!important;
      filter:none!important;
      transform:none!important;
    }
    body.seh-route-players .seh-zero-player-photo-frame:after{
      content:''!important;
      position:absolute!important;
      inset:0!important;
      z-index:3!important;
      pointer-events:none!important;
      background:
        radial-gradient(circle at 50% 72%,rgba(0,0,0,.15),transparent 32%),
        linear-gradient(90deg,rgba(0,0,0,.03),transparent 16%,transparent 84%,rgba(0,0,0,.10)),
        linear-gradient(0deg,rgba(2,4,9,.18) 0%,transparent 20%,transparent 86%,rgba(255,255,255,.04) 100%)!important;
    }
    body.seh-route-players .seh-zero-player-bglogo{
      position:absolute!important;
      z-index:1!important;
      width:204px!important;
      height:204px!important;
      right:-18px!important;
      top:2px!important;
      left:auto!important;
      object-fit:contain!important;
      opacity:.34!important;
      filter:saturate(1.08) contrast(1.08) brightness(1.26) drop-shadow(0 0 16px rgba(0,0,0,.20))!important;
      mix-blend-mode:screen!important;
      transform:rotate(4deg)!important;
      pointer-events:none!important;
    }
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-photo{
      position:absolute!important;
      z-index:2!important;
      left:0!important;
      right:0!important;
      bottom:-48px!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      margin:0!important;
      border:0!important;
      border-radius:0!important;
      object-fit:contain!important;
      object-position:center bottom!important;
      background:transparent!important;
      transform:scale(1.28)!important;
      transform-origin:center bottom!important;
      filter:drop-shadow(0 10px 12px rgba(0,0,0,.34))!important;
      box-shadow:none!important;
    }
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-photo.seh-zero-player-photo-missing{
      visibility:hidden!important;
    }
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-lower{
      position:relative!important;
      z-index:5!important;
      margin-top:-30px!important;
      margin-left:4px!important;
      margin-right:4px!important;
      border:1px solid rgba(214,177,95,.36)!important;
      border-radius:16px!important;
      overflow:hidden!important;
      background:linear-gradient(180deg,rgba(8,12,19,.95),rgba(4,7,12,.985))!important;
      box-shadow:0 -10px 24px rgba(0,0,0,.24),0 10px 18px rgba(0,0,0,.12)!important;
      backdrop-filter:blur(6px)!important;
    }
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-lower:before{
      content:''!important;
      position:absolute!important;
      inset:0 0 auto 0!important;
      height:1px!important;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent)!important;
      pointer-events:none!important;
    }
    body.seh-route-players .seh-zero-player-teamrow{
      display:grid!important;
      grid-template-columns:38px minmax(0,1fr)!important;
      gap:8px!important;
      align-items:center!important;
      min-height:50px!important;
      padding:8px 8px 8px!important;
      border-bottom:1px solid rgba(255,255,255,.08)!important;
    }
    body.seh-route-players .seh-zero-player-teamlogo{
      display:grid!important;
      place-items:center!important;
      width:36px!important;
      height:36px!important;
      overflow:hidden!important;
      border:1px solid rgba(214,177,95,.36)!important;
      border-radius:10px!important;
      background:rgba(214,177,95,.055)!important;
      color:#f0d58b!important;
      font:900 8px/1 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-teamlogo img{
      grid-area:1/1!important;
      display:block!important;
      width:31px!important;
      height:31px!important;
      object-fit:contain!important;
    }
    body.seh-route-players .seh-zero-player-teamlogo i{
      grid-area:1/1!important;
      font-style:normal!important;
    }
    body.seh-route-players .seh-zero-player-teamlogo.has-logo i{visibility:hidden!important}
    body.seh-route-players .seh-zero-player-teamcopy{min-width:0!important}
    body.seh-route-players .seh-zero-player-teamcopy strong{
      display:block!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
      color:#f4f2ed!important;
      font:900 10.8px/1.12 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-teamcopy small{
      display:-webkit-box!important;
      margin-top:3px!important;
      overflow:hidden!important;
      -webkit-line-clamp:2!important;
      -webkit-box-orient:vertical!important;
      color:#b6bec9!important;
      font:700 8.2px/1.18 Inter,Arial,sans-serif!important;
    }
    body.seh-route-players .seh-zero-player-statrow{
      display:grid!important;
      grid-template-columns:1fr 1fr!important;
      min-height:52px!important;
      border-top:1px solid rgba(255,255,255,.07)!important;
      border-bottom:1px solid rgba(214,177,95,.18)!important;
    }
    body.seh-route-players .seh-zero-player-statrow>span{
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      min-width:0!important;
      padding:7px 4px!important;
      text-align:center!important;
    }
    body.seh-route-players .seh-zero-player-statrow>span+span{border-left:1px solid rgba(255,255,255,.075)!important}
    body.seh-route-players .seh-zero-player-statrow strong{
      color:#f5f3ee!important;
      font:900 13px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }
    body.seh-route-players .seh-zero-player-statrow small{
      margin-top:5px!important;
      color:#89919d!important;
      font:800 6.9px/1 Inter,Arial,sans-serif!important;
      text-transform:uppercase!important;
      letter-spacing:.35px!important;
      white-space:nowrap!important;
    }
    body.seh-route-players .seh-zero-player-rankline strong{color:#ffd000!important}
    body.seh-route-players .seh-zero-player-rankline small{color:#aeb5bf!important}
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-history{
      display:-webkit-box!important;
      -webkit-box-orient:vertical!important;
      -webkit-line-clamp:2!important;
      min-height:33px!important;
      max-height:33px!important;
      margin:8px 6px 8px!important;
      overflow:hidden!important;
      color:#9ba3ae!important;
      font:700 7.7px/1.42 Inter,Arial,sans-serif!important;
      text-align:center!important;
    }
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-meta,
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-rank,
    body.seh-route-players .seh-directory-card-v3 .seh-zero-player-latest{display:none!important}

    /* Filterpanelen får samma lättare premiumkänsla utan att ändra funktionerna. */
    body.seh-route-players .players-toolbar{
      padding:10px 8px 11px!important;
      border:1px solid rgba(255,255,255,.055)!important;
      border-radius:15px!important;
      background:linear-gradient(145deg,rgba(7,10,17,.82),rgba(4,6,11,.88))!important;
    }
    body.seh-route-players #playerSearch,
    body.seh-route-players #divisionFilter,
    body.seh-route-players #playerSort,
    body.seh-route-players .seh-zero-role-buttons button{
      border-color:rgba(255,255,255,.12)!important;
      background:#080b13!important;
    }
    body.seh-route-players .seh-zero-role-buttons button.is-active{
      border-color:rgba(214,177,95,.72)!important;
      background:linear-gradient(180deg,rgba(214,177,95,.12),rgba(214,177,95,.045))!important;
      color:#f0d58b!important;
      box-shadow:inset 0 -1px 0 rgba(255,208,0,.72)!important;
    }
    /* V749: Roll – alla tre val ska alltid få plats på mobil. */
    body.seh-route-players .seh-zero-role-buttons{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      width:100%!important;
      min-width:0!important;
      gap:5px!important;
    }
    body.seh-route-players .seh-zero-role-buttons button{
      width:100%!important;
      min-width:0!important;
      max-width:100%!important;
      padding:0 5px!important;
      overflow:hidden!important;
      white-space:nowrap!important;
      text-overflow:clip!important;
      font-size:10px!important;
    }

    @media (max-width:360px){
      body.seh-route-players .seh-zero-player-shell{padding-left:4px!important;padding-right:4px!important}
      body.seh-route-players .seh-zero-player-grid{gap:6px!important}
      body.seh-route-players .seh-zero-player-card.seh-directory-card-v3{min-height:356px!important;padding-left:7px!important;padding-right:7px!important}
      body.seh-route-players .seh-zero-player-photo-frame{width:100%!important;height:184px!important}
      body.seh-route-players .seh-directory-card-v3 .seh-zero-player-name{font-size:clamp(10px,3.85vw,14px)!important;padding-left:43px!important;padding-right:7px!important}
      body.seh-route-players .seh-zero-player-teamrow{grid-template-columns:28px minmax(0,1fr)!important;gap:6px!important}
      body.seh-route-players .seh-zero-player-teamlogo{width:27px!important;height:27px!important}
      body.seh-route-players .seh-zero-player-teamlogo img{width:23px!important;height:23px!important}

      body.seh-route-players .seh-directory-card-v3 .seh-zero-player-photo{transform:scale(1.25)!important;bottom:-40px!important}
    }




    /* ============================================================
       V690 – LAGHISTORIA PREMIUM POLISH
       Samma visuella språk som spelarregistret, utan att ändra
       dataladdning eller lagprofilens logik.
       ============================================================ */

    body.seh-route-teams .seh-mobile-filter-zone{
      gap:7px!important;
      padding:8px 0 9px!important;
      margin:0 0 2px!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct::before{
      margin:0 0 5px!important;
      color:#63d8d2!important;
      font:900 9px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.7px!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone input,
    body.seh-route-teams .seh-mobile-filter-zone select{
      height:44px!important;
      min-height:44px!important;
      border:1px solid rgba(139,151,168,.24)!important;
      border-radius:12px!important;
      background:
        linear-gradient(180deg,rgba(11,15,24,.98),rgba(6,9,15,.98))!important;
      color:#f4f1e9!important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.025),
        0 4px 14px rgba(0,0,0,.16)!important;
      font:700 12px/1 Inter,Arial,sans-serif!important;
      outline:none!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone input{
      padding:0 12px!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone input::placeholder{
      color:#7f8895!important;
      opacity:1!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone input:focus,
    body.seh-route-teams .seh-mobile-filter-zone select:focus{
      border-color:rgba(255,208,0,.62)!important;
      box-shadow:
        0 0 0 2px rgba(255,208,0,.08),
        inset 0 1px 0 rgba(255,255,255,.025)!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-control-direct{
      position:relative!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-control-direct:not(.seh-filter-search-direct)::after{
      content:'⌄'!important;
      position:absolute!important;
      right:12px!important;
      top:50%!important;
      transform:translateY(-52%)!important;
      color:#cbd0d7!important;
      font:900 14px/1 Inter,Arial,sans-serif!important;
      pointer-events:none!important;
      z-index:2!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone select{
      -webkit-appearance:none!important;
      appearance:none!important;
      padding:0 34px 0 11px!important;
      border-color:rgba(214,177,95,.34)!important;
    }

    body.seh-route-teams .seh-team-counts-compact{
      gap:7px!important;
      margin:2px 0 5px!important;
      padding:0!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-card{
      position:relative!important;
      overflow:hidden!important;
      min-height:58px!important;
      padding:9px 11px 10px!important;
      border:1px solid rgba(255,255,255,.105)!important;
      border-radius:13px!important;
      background:
        linear-gradient(145deg,rgba(13,17,18,.99),rgba(6,9,11,.99))!important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.025),
        0 5px 15px rgba(0,0,0,.13)!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-card::before{
      content:''!important;
      position:absolute!important;
      left:0!important;
      top:0!important;
      bottom:0!important;
      width:2px!important;
      background:linear-gradient(180deg,#62d4cf,#ffd000)!important;
      opacity:.7!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-label{
      margin:0 0 5px!important;
      color:#939aa4!important;
      font:900 7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.48px!important;
    }

    body.seh-route-teams .seh-team-counts-compact .seh-team-count-value{
      color:#ffd400!important;
      font:900 21px/.98 Inter,Arial,sans-serif!important;
      letter-spacing:-.45px!important;
    }

    /* V749: Laghistoria – en enda sökrubrik och kompakt resultaträknare. */
    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-search-direct::before{
      content:none!important;
      display:none!important;
    }
    body.seh-route-teams .seh-team-counts-compact{
      display:flex!important;
      width:auto!important;
      margin:1px 0 7px!important;
    }
    body.seh-route-teams .seh-team-counts-compact .seh-team-count-card{
      width:auto!important;
      min-width:108px!important;
      min-height:42px!important;
      padding:7px 10px 7px!important;
      border-radius:11px!important;
    }
    body.seh-route-teams .seh-team-counts-compact .seh-team-count-label{
      margin:0 0 3px!important;
      font-size:6.5px!important;
    }
    body.seh-route-teams .seh-team-counts-compact .seh-team-count-value{
      font-size:16px!important;
      letter-spacing:-.2px!important;
    }

    body.seh-route-teams .seh-team-updated-line{
      margin:1px 0 7px!important;
      padding:0 2px!important;
      color:#7e8792!important;
      font:650 7.5px/1.2 Inter,Arial,sans-serif!important;
    }

    body.seh-route-teams .seh-mobile-team-list{
      gap:8px!important;
      align-items:stretch!important;
      padding-bottom:4px!important;
    }

    body.seh-route-teams .seh-mobile-team-card{
      border:1px solid rgba(214,177,95,.18)!important;
      border-radius:15px!important;
      background:
        radial-gradient(circle at 50% 18%,rgba(214,177,95,.035),transparent 38%),
        linear-gradient(155deg,#080c14 0%,#05080e 58%,#03050a 100%)!important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.025),
        0 7px 18px rgba(0,0,0,.16)!important;
    }

    body.seh-route-teams .seh-mobile-team-card:active{
      transform:scale(.992)!important;
      border-color:rgba(255,208,0,.38)!important;
    }

    body.seh-route-teams .seh-compact-team{
      gap:5px!important;
      padding:9px 8px 8px!important;
      min-height:0!important;
    }

    body.seh-route-teams .seh-ct-name{
      min-height:30px!important;
      display:flex!important;
      align-items:flex-start!important;
      justify-content:center!important;
      margin:0!important;
      color:#f7f4ed!important;
      font:900 13.5px/1.08 Inter,Arial,sans-serif!important;
      letter-spacing:-.18px!important;
      text-wrap:balance!important;
    }

    body.seh-route-teams .seh-ct-logo,
    body.seh-route-teams .seh-ct-logo-placeholder{
      width:58px!important;
      height:58px!important;
      max-width:58px!important;
      max-height:58px!important;
      margin:0 auto 1px!important;
      border-radius:10px!important;
    }

    body.seh-route-teams .seh-ct-logo{
      filter:drop-shadow(0 4px 7px rgba(0,0,0,.22))!important;
    }

    body.seh-route-teams .seh-ct-badges{
      gap:3px!important;
      min-height:17px!important;
      max-height:38px!important;
      margin:0 0 1px!important;
    }

    body.seh-route-teams .seh-ct-badge{
      min-height:17px!important;
      display:inline-flex!important;
      align-items:center!important;
      padding:1px 5px!important;
      border:1px solid rgba(139,151,168,.28)!important;
      border-radius:999px!important;
      background:rgba(6,10,16,.88)!important;
      color:#d7dbe1!important;
      font:850 6.7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.08px!important;
    }

    body.seh-route-teams .seh-ct-stats{
      gap:4px!important;
      margin:1px 0 0!important;
    }

    body.seh-route-teams .seh-ct-stat{
      min-height:38px!important;
      padding:5px 5px 4px!important;
      border:1px solid rgba(139,151,168,.18)!important;
      border-radius:8px!important;
      background:rgba(2,5,10,.42)!important;
      text-align:left!important;
    }

    body.seh-route-teams .seh-ct-stat b{
      display:block!important;
      margin:0 0 4px!important;
      color:#7e8794!important;
      font:900 5.8px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.34px!important;
      text-transform:uppercase!important;
    }

    body.seh-route-teams .seh-ct-stat span{
      display:block!important;
      color:#ffd400!important;
      font:900 12.5px/1 Inter,Arial,sans-serif!important;
    }

    body.seh-route-teams .seh-ct-latest,
    body.seh-route-teams .seh-ct-top{
      position:relative!important;
      width:100%!important;
      margin:1px 0 0!important;
      padding:0 1px!important;
      color:#9ca4af!important;
      font:650 7.25px/1.28 Inter,Arial,sans-serif!important;
      text-align:left!important;
    }

    body.seh-route-teams .seh-ct-latest strong{
      color:#8f98a5!important;
      font-weight:900!important;
    }

    body.seh-route-teams .seh-ct-top{
      margin-top:0!important;
      color:#e6e8eb!important;
      font-weight:700!important;
    }

    body.seh-route-teams .seh-ct-top strong{
      color:#f4f1e9!important;
      font-weight:900!important;
    }

    @media(max-width:350px){
      body.seh-route-teams .seh-mobile-filter-zone{
        grid-template-columns:1fr 1fr!important;
      }
      body.seh-route-teams .seh-mobile-team-list{
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:6px!important;
      }
      body.seh-route-teams .seh-compact-team{
        padding-left:6px!important;
        padding-right:6px!important;
      }
      body.seh-route-teams .seh-ct-name{
        font-size:12.4px!important;
      }
    }


    /* V691 – Laghistoria: fullbreddsfilter + tydligare kortfot */
    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-control-direct:not(.seh-filter-search-direct){
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-control-direct:not(.seh-filter-search-direct) select{
      display:block!important;
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      box-sizing:border-box!important;
      margin:0!important;
    }

    body.seh-route-teams .seh-mobile-filter-zone > .seh-filter-control-direct:not(.seh-filter-search-direct)::after{
      right:11px!important;
      top:22px!important;
      transform:translateY(-50%)!important;
      content:'⌄'!important;
      font-size:13px!important;
    }

    body.seh-route-teams .seh-ct-latest,
    body.seh-route-teams .seh-ct-top{
      font-size:7.7px!important;
      line-height:1.32!important;
    }

    body.seh-route-teams .seh-ct-top{
      margin-top:1px!important;
    }


    /* ============================================================
       V699 – LAGHISTORIA PREMIUM TEAM CARDS
       Mer identitet och djup, samma tvåkolumnslayout.
       ============================================================ */

    body.seh-route-teams .seh-mobile-team-card{
      position:relative!important;
      isolation:isolate!important;
      overflow:hidden!important;
      border-color:color-mix(in srgb,var(--seh-team-secondary,#d6b15f) 31%,rgba(255,255,255,.08))!important;
      background:
        radial-gradient(circle at 50% 22%,color-mix(in srgb,var(--seh-team-primary,#0b2647) 28%,transparent),transparent 48%),
        radial-gradient(circle at 92% 6%,color-mix(in srgb,var(--seh-team-secondary,#d6b15f) 11%,transparent),transparent 34%),
        linear-gradient(155deg,#080c14 0%,#05080e 58%,#03050a 100%)!important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.028),
        0 9px 22px rgba(0,0,0,.20)!important;
    }

    body.seh-route-teams .seh-mobile-team-card::before{
      content:''!important;
      position:absolute!important;
      z-index:2!important;
      left:0!important;
      right:0!important;
      top:0!important;
      height:2px!important;
      pointer-events:none!important;
      background:linear-gradient(90deg,
        color-mix(in srgb,var(--seh-team-primary,#0b2647) 92%,#fff 8%),
        color-mix(in srgb,var(--seh-team-secondary,#d6b15f) 88%,#fff 12%),
        transparent 92%)!important;
      opacity:.92!important;
    }

    body.seh-route-teams .seh-compact-team{
      position:relative!important;
      z-index:1!important;
      display:grid!important;
      grid-template-columns:1fr!important;
      grid-template-areas:
        "name"
        "logo"
        "badges"
        "stats"
        "latest"
        "top"!important;
      gap:5px!important;
      min-height:226px!important;
      padding:10px 9px 9px!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-ct-watermark{
      position:absolute!important;
      z-index:-1!important;
      right:-31px!important;
      top:28px!important;
      width:142px!important;
      height:142px!important;
      object-fit:contain!important;
      opacity:.065!important;
      filter:grayscale(.05) saturate(1.08) brightness(1.12)!important;
      transform:rotate(-7deg)!important;
      pointer-events:none!important;
    }

    body.seh-route-teams .seh-ct-name{
      grid-area:name!important;
      min-height:31px!important;
      display:flex!important;
      align-items:flex-start!important;
      justify-content:center!important;
      margin:0!important;
      padding:0 2px!important;
      color:#faf7f0!important;
      font:950 14px/1.05 Inter,Arial,sans-serif!important;
      letter-spacing:-.27px!important;
      text-align:center!important;
      text-shadow:0 1px 8px rgba(0,0,0,.42)!important;
      overflow:hidden!important;
      display:-webkit-box!important;
      -webkit-box-orient:vertical!important;
      -webkit-line-clamp:2!important;
    }

    body.seh-route-teams .seh-ct-logo,
    body.seh-route-teams .seh-ct-logo-placeholder{
      grid-area:logo!important;
      align-self:center!important;
      justify-self:center!important;
      width:70px!important;
      height:70px!important;
      max-width:70px!important;
      max-height:70px!important;
      margin:-1px auto 0!important;
      border-radius:13px!important;
    }

    body.seh-route-teams .seh-ct-logo{
      object-fit:contain!important;
      filter:drop-shadow(0 7px 10px rgba(0,0,0,.32))!important;
    }

    body.seh-route-teams .seh-ct-logo-placeholder{
      display:grid!important;
      place-items:center!important;
      border:1px solid rgba(214,177,95,.28)!important;
      background:rgba(4,8,14,.72)!important;
      color:#f0d58b!important;
      font:950 15px/1 Inter,Arial,sans-serif!important;
    }

    body.seh-route-teams .seh-ct-badges{
      grid-area:badges!important;
      display:flex!important;
      justify-content:center!important;
      align-items:center!important;
      flex-wrap:wrap!important;
      gap:3px!important;
      min-height:17px!important;
      max-height:37px!important;
      margin:0!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-ct-badge{
      min-height:17px!important;
      display:inline-flex!important;
      align-items:center!important;
      padding:1px 5px!important;
      border:1px solid rgba(143,156,174,.28)!important;
      border-radius:999px!important;
      background:rgba(5,9,15,.82)!important;
      color:#dce1e8!important;
      font:850 6.7px/1 Inter,Arial,sans-serif!important;
      backdrop-filter:blur(4px)!important;
    }

    body.seh-route-teams .seh-ct-stats{
      grid-area:stats!important;
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:5px!important;
      margin-top:1px!important;
    }

    body.seh-route-teams .seh-ct-stat{
      min-height:39px!important;
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      padding:6px 7px!important;
      border:1px solid rgba(139,151,168,.18)!important;
      border-top-color:color-mix(in srgb,var(--seh-team-secondary,#d6b15f) 22%,rgba(139,151,168,.18))!important;
      border-radius:9px!important;
      background:rgba(3,7,12,.66)!important;
      backdrop-filter:blur(5px)!important;
    }

    body.seh-route-teams .seh-ct-stat b{
      margin:0 0 4px!important;
      color:#8e99a7!important;
      font:900 6.2px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.38px!important;
      text-transform:uppercase!important;
    }

    body.seh-route-teams .seh-ct-stat span{
      color:#ffd400!important;
      font:950 14px/.95 Inter,Arial,sans-serif!important;
      letter-spacing:-.2px!important;
    }

    body.seh-route-teams .seh-ct-latest{
      grid-area:latest!important;
      width:100%!important;
      min-height:26px!important;
      display:flex!important;
      align-items:center!important;
      gap:4px!important;
      margin:1px 0 0!important;
      padding:5px 7px!important;
      box-sizing:border-box!important;
      border:1px solid color-mix(in srgb,var(--seh-team-secondary,#d6b15f) 28%,rgba(139,151,168,.12))!important;
      border-radius:9px!important;
      background:linear-gradient(90deg,color-mix(in srgb,var(--seh-team-primary,#0b2647) 18%,rgba(3,7,12,.72)),rgba(3,7,12,.72))!important;
      color:#c6cdd6!important;
      font:700 7.35px/1.22 Inter,Arial,sans-serif!important;
      text-align:left!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-ct-latest strong{
      flex:0 0 auto!important;
      color:#f0d58b!important;
      font-weight:950!important;
      text-transform:uppercase!important;
      letter-spacing:.18px!important;
    }

    body.seh-route-teams .seh-ct-latest span{
      min-width:0!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
    }

    body.seh-route-teams .seh-ct-top{
      grid-area:top!important;
      width:100%!important;
      min-height:29px!important;
      display:grid!important;
      grid-template-columns:auto minmax(0,1fr)!important;
      align-items:center!important;
      gap:6px!important;
      margin:3px 0 0!important;
      padding:3px 1px 0!important;
      box-sizing:border-box!important;
      color:#e8eaed!important;
      font:760 7.9px/1.24 Inter,Arial,sans-serif!important;
      text-align:left!important;
      overflow:hidden!important;
    }

    body.seh-route-teams .seh-ct-top-avatar{
      width:25px!important;
      height:25px!important;
      display:none!important;
      overflow:hidden!important;
      border:1px solid rgba(214,177,95,.26)!important;
      border-radius:7px!important;
      background:rgba(5,9,15,.78)!important;
    }

    body.seh-route-teams .seh-ct-top-avatar.has-photo{
      display:block!important;
    }

    body.seh-route-teams .seh-ct-top-avatar img{
      width:100%!important;
      height:100%!important;
      display:block!important;
      object-fit:cover!important;
      object-position:center top!important;
    }

    body.seh-route-teams .seh-ct-top-copy{
      min-width:0!important;
      overflow:hidden!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }

    body.seh-route-teams .seh-ct-top strong{
      color:#a6afba!important;
      font-weight:900!important;
      letter-spacing:.04px!important;
    }

    body.seh-route-teams .seh-ct-top-text{
      color:#f2f1ed!important;
      font-weight:875!important;
      letter-spacing:.01px!important;
    }

    @media(max-width:350px){
      body.seh-route-teams .seh-compact-team{min-height:218px!important;padding-left:7px!important;padding-right:7px!important}
      body.seh-route-teams .seh-ct-logo,body.seh-route-teams .seh-ct-logo-placeholder{width:64px!important;height:64px!important;max-width:64px!important;max-height:64px!important}
      body.seh-route-teams .seh-ct-name{font-size:12.8px!important}
      body.seh-route-teams .seh-ct-top{font-size:7.2px!important}
    }


    /* ============================================================
       V692 – LAGPROFIL MED RIKTIGA FLIKAR
       Översikt / Statistik / Historik / Spelare / Meriter är nu
       separata vyer i stället för scroll-länkar.
       ============================================================ */

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel{
      width:100%!important;
      max-width:none!important;
      margin:0!important;
      box-sizing:border-box!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[hidden]{
      display:none!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel.is-active{
      display:block!important;
    }

    body.seh-content-mode .seh-team-native-dock{
      margin:4px 0 5px!important;
    }

    /* Översikt */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"]{
      margin-top:0!important;
      padding:12px!important;
      border:1px solid rgba(255,255,255,.085)!important;
      border-top-color:rgba(214,177,95,.28)!important;
      border-radius:14px!important;
      background:
        radial-gradient(circle at 88% 0,rgba(214,177,95,.045),transparent 34%),
        linear-gradient(145deg,rgba(9,13,21,.98),rgba(5,7,12,.995))!important;
      box-shadow:0 7px 18px rgba(0,0,0,.12)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] h2,
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] h3,
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] h4{
      margin:0 0 9px!important;
      color:#ffd400!important;
      font:900 9.5px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.64px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] p{
      margin:0!important;
      color:#d0d3d7!important;
      font:650 11.5px/1.48 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-bio{
      display:grid!important;
      gap:10px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-bio p + p{
      padding-top:9px!important;
      border-top:1px solid rgba(255,255,255,.065)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-card{
      margin-top:13px!important;
      padding:12px 10px 10px!important;
      border:1px solid rgba(72,211,206,.20)!important;
      border-radius:13px!important;
      background:
        radial-gradient(circle at 88% 0,rgba(214,177,95,.055),transparent 34%),
        linear-gradient(155deg,rgba(6,11,18,.96),rgba(4,7,12,.99))!important;
      overflow:hidden!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-heading{
      margin:0 0 6px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-heading>span{
      display:block!important;
      margin-bottom:4px!important;
      color:#ffd400!important;
      font:950 7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.9px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-heading h3{
      margin:0!important;
      color:#f7f4ee!important;
      font:950 19px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.3px!important;
      text-transform:none!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-heading p{
      margin:5px 0 0!important;
      color:#7f8996!important;
      font:650 8px/1.3 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-chart{
      width:100%!important;
      margin-top:3px!important;
      overflow:hidden!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-chart svg{
      display:block!important;
      width:100%!important;
      height:auto!important;
      overflow:visible!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-grid-line{
      stroke:rgba(72,211,206,.11)!important;
      stroke-width:1!important;
      stroke-dasharray:3 5!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-axis-label{
      fill:#c7d0dc!important;
      font:900 6px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.15px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-line{
      fill:none!important;
      stroke:#e8b94d!important;
      stroke-width:2.6!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-point{
      fill:#07101a!important;
      stroke:#48d3ce!important;
      stroke-width:3!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-season-label{
      fill:#d5dbe4!important;
      font:850 5.5px/1 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-footer{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      gap:8px!important;
      margin-top:0!important;
      padding-top:8px!important;
      border-top:1px solid rgba(255,255,255,.065)!important;
      color:#b4bec9!important;
      font:700 7.2px/1.25 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-footer span:last-child{
      text-align:right!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-division-footer strong{
      color:#f0d58b!important;
      font-weight:950!important;
    }

    /* Gemensamt för sub-vyer */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel:not([data-seh-team-panel="overview"]){
      padding:11px 10px 13px!important;
      border:1px solid rgba(255,255,255,.075)!important;
      border-radius:14px!important;
      background:
        linear-gradient(160deg,rgba(8,12,20,.985),rgba(4,6,11,.995))!important;
      box-shadow:0 7px 18px rgba(0,0,0,.11)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel:not([data-seh-team-panel="overview"]) > h2{
      margin:0 0 10px!important;
      color:#f7f4ee!important;
      font:950 21px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.35px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel:not([data-seh-team-panel="overview"]) > h3{
      margin:14px 0 8px!important;
      color:#f3f0ea!important;
      font:900 15px/1 Inter,Arial,sans-serif!important;
    }

    /* Statistikens små KPI-pillars */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-source-pills{
      display:grid!important;
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      gap:5px!important;
      margin:0 0 12px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-source-pills span{
      min-width:0!important;
      min-height:37px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      padding:5px 4px!important;
      border:1px solid rgba(214,177,95,.24)!important;
      border-radius:10px!important;
      background:rgba(5,8,14,.72)!important;
      color:#f0f2f4!important;
      font:850 8.8px/1.15 Inter,Arial,sans-serif!important;
      text-align:center!important;
    }

    /* FLEST MATCHER / spelarlistor */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-player-row{
      grid-template-columns:40px minmax(0,1fr) auto!important;
      gap:9px!important;
      min-height:52px!important;
      padding:7px 2px!important;
      border-top:1px solid rgba(255,255,255,.07)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-player-row img{
      width:40px!important;
      height:40px!important;
      border:1px solid rgba(214,177,95,.20)!important;
      border-radius:9px!important;
      background:#080b11!important;
      object-fit:contain!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-player-row strong{
      color:#f5f2ec!important;
      font:850 10px/1.15 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-player-row small{
      margin-top:3px!important;
      color:#84909d!important;
      font:700 7.2px/1.2 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-player-row > b{
      color:#ffd400!important;
      font:900 8.5px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }

    /* V709 – Statistik är topplistor, Spelare är klubbens register */
    body.seh-content-mode.seh-team-native-v689 .dev-stat-leaderboard{
      margin-top:14px!important;
      padding:9px 8px 4px!important;
      border:1px solid rgba(214,177,95,.14)!important;
      border-radius:12px!important;
      background:
        linear-gradient(145deg,rgba(11,16,24,.82),rgba(5,8,13,.92))!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-leaderboard > h3{
      margin:0 0 6px!important;
      color:#f0d58b!important;
      font:950 10px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.42px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-player-row{
      grid-template-columns:16px 38px minmax(0,1fr) auto!important;
      gap:7px!important;
      min-height:49px!important;
      padding:6px 0!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-player-row img{
      width:38px!important;
      height:38px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-rank{
      display:block!important;
      color:#77818d!important;
      font:900 8px/1 Inter,Arial,sans-serif!important;
      text-align:center!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-player-copy{
      min-width:0!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-player-row > b{
      min-width:43px!important;
      text-align:right!important;
      font-size:8.8px!important;
    }

    /* V713 – Statistik ska vara prestation/topplista, inte en andra spelarlista */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-team-kpis span{
      min-height:52px!important;
      flex-direction:column!important;
      gap:3px!important;
      padding:7px 4px 6px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-team-kpis span>b{
      display:block!important;
      color:#f6f2ea!important;
      font:950 12px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.15px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-team-kpis span>small{
      display:block!important;
      color:#6ee7e7!important;
      font:900 6.3px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.42px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-team-performance{
      margin:13px 0 0!important;
      padding:10px 8px 9px!important;
      border:1px solid rgba(214,177,95,.14)!important;
      border-radius:12px!important;
      background:linear-gradient(145deg,rgba(11,16,24,.82),rgba(5,8,13,.92))!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-section-heading{
      min-width:0!important;
      display:flex!important;
      align-items:baseline!important;
      justify-content:space-between!important;
      gap:8px!important;
      margin:0 0 8px!important;
      padding:0 1px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-section-heading>h3,
    body.seh-content-mode.seh-team-native-v689 .dev-stat-leaderboard>.dev-stat-section-heading>h3{
      min-width:0!important;
      margin:0!important;
      color:#f0d58b!important;
      font:950 9.6px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.38px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-section-heading>span{
      flex:0 0 auto!important;
      color:#65717f!important;
      font:900 6.2px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.34px!important;
      text-transform:uppercase!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-team-performance-grid{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:6px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-team-performance-grid>div{
      min-width:0!important;
      min-height:45px!important;
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      gap:4px!important;
      padding:7px 8px!important;
      border:1px solid rgba(255,255,255,.065)!important;
      border-radius:9px!important;
      background:rgba(2,5,10,.58)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-team-performance-grid small{
      color:#6f7b88!important;
      font:850 6.2px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.32px!important;
      text-transform:uppercase!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-team-performance-grid strong{
      color:#f5f1e9!important;
      font:950 12px/1 Inter,Arial,sans-serif!important;
      letter-spacing:-.12px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-leaderboard{
      margin-top:13px!important;
      padding:10px 8px 5px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row{
      min-width:0!important;
      display:grid!important;
      grid-template-columns:17px minmax(0,1fr) 49px!important;
      align-items:center!important;
      gap:7px!important;
      min-height:60px!important;
      padding:8px 0!important;
      border-top:1px solid rgba(255,255,255,.07)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row .dev-stat-rank{
      align-self:start!important;
      padding-top:3px!important;
      color:#77818d!important;
      font:950 8px/1 Inter,Arial,sans-serif!important;
      text-align:center!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row[data-rank="1"] .dev-stat-rank{color:#ffd400!important}
    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row[data-rank="2"] .dev-stat-rank{color:#c7ccd2!important}
    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row[data-rank="3"] .dev-stat-rank{color:#c98a58!important}

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row .dev-stat-player-copy{
      min-width:0!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row .dev-stat-player-copy>strong{
      min-width:0!important;
      display:flex!important;
      align-items:center!important;
      gap:5px!important;
      overflow:hidden!important;
      color:#f5f2ec!important;
      font:900 10px/1.08 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-flag{
      flex:0 0 auto!important;
      font:normal 10px/1 sans-serif!important;
      font-style:normal!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid{
      min-width:0!important;
      display:grid!important;
      gap:3px!important;
      margin-top:7px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid--skater{
      grid-template-columns:repeat(4,minmax(0,1fr))!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid--goalie{
      grid-template-columns:repeat(6,minmax(0,1fr))!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid>span{
      min-width:0!important;
      display:flex!important;
      flex-direction:column!important;
      gap:2px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid small{
      color:#65717f!important;
      font:850 5.7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.18px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid b{
      overflow:hidden!important;
      color:#cbd2d8!important;
      font:850 7.2px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-primary{
      min-width:0!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:flex-end!important;
      justify-content:center!important;
      gap:3px!important;
      text-align:right!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-primary>strong{
      color:#ffd400!important;
      font:950 10.3px/1 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-primary>small{
      color:#7a8591!important;
      font:900 5.7px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.25px!important;
      text-transform:uppercase!important;
    }

    @media (max-width:350px){
      body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row{
        grid-template-columns:15px minmax(0,1fr) 45px!important;
        gap:5px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid--goalie{
        gap:2px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid b{
        font-size:6.7px!important;
      }
    }

    /* V715 – finputs: större sorteringschips, mer luft och tydligare småstatistik */
    body.seh-content-mode.seh-team-native-v689 .dev-stat-sort{
      display:flex!important;
      align-items:center!important;
      gap:5px!important;
      margin:0 0 11px!important;
      overflow-x:auto!important;
      scrollbar-width:none!important;
      -webkit-overflow-scrolling:touch!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-sort::-webkit-scrollbar{
      display:none!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-sort>button{
      flex:0 0 auto!important;
      min-height:30px!important;
      padding:0 11px!important;
      border:1px solid rgba(255,255,255,.09)!important;
      border-radius:999px!important;
      background:rgba(3,6,11,.82)!important;
      color:#7e8996!important;
      font:900 7.5px/1 Inter,Arial,sans-serif!important;
      letter-spacing:.35px!important;
      text-transform:uppercase!important;
      white-space:nowrap!important;
      appearance:none!important;
      -webkit-appearance:none!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-sort>button.is-active{
      border-color:rgba(255,212,0,.42)!important;
      background:linear-gradient(180deg,rgba(255,212,0,.14),rgba(255,212,0,.055))!important;
      color:#ffd400!important;
      box-shadow:inset 0 -1px 0 rgba(255,212,0,.55)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-rows{
      min-width:0!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row.is-outside-top10{
      display:none!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row{
      grid-template-columns:18px minmax(0,1fr) 55px!important;
      gap:8px!important;
      min-height:67px!important;
      padding:9px 0!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row .dev-stat-rank{
      padding-top:2px!important;
      font-size:8.7px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row .dev-stat-player-copy>strong{
      gap:5px!important;
      font-size:10.8px!important;
      line-height:1.1!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-flag{
      font-size:10.5px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid{
      gap:4px!important;
      margin-top:8px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid small{
      font-size:6.4px!important;
      letter-spacing:.2px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid b{
      font-size:8.6px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-primary>strong{
      font-size:11.8px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-primary>small{
      font-size:6.1px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-stat-section-heading>span{
      font-size:6.6px!important;
    }

    @media (max-width:350px){
      body.seh-content-mode.seh-team-native-v689 .dev-stat-data-row{
        grid-template-columns:16px minmax(0,1fr) 49px!important;
        gap:6px!important;
        min-height:64px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .dev-stat-sort>button{
        min-height:29px!important;
        padding:0 9px!important;
        font-size:7.1px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid--goalie{
        gap:2px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .dev-stat-mini-grid b{
        font-size:7.8px!important;
      }
    }

    body.seh-content-mode.seh-team-native-v689 .dev-team-all-players .dev-team-player-intro{
      margin:-2px 0 7px!important;
      color:#7f8996!important;
      font:650 8.1px/1.35 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .dev-all-player-row small{
      max-width:100%!important;
      overflow:hidden!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }

    /* Historik / meriter */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-tournament{
      grid-template-columns:minmax(0,1fr) auto!important;
      gap:8px!important;
      min-height:48px!important;
      align-items:center!important;
      padding:8px 3px!important;
      border-top:1px solid rgba(255,255,255,.07)!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-tournament strong{
      color:#f4f1eb!important;
      font:850 10px/1.15 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-tournament small{
      margin-top:3px!important;
      color:#86909c!important;
      font:700 7.2px/1.2 Inter,Arial,sans-serif!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel .dev-tournament > b{
      min-width:42px!important;
      padding:5px 7px!important;
      border:1px solid rgba(214,177,95,.24)!important;
      border-radius:999px!important;
      background:rgba(214,177,95,.055)!important;
      color:#ffd400!important;
      font:900 8px/1 Inter,Arial,sans-serif!important;
      text-align:center!important;
      white-space:nowrap!important;
    }

    /* Slopa gammal dubbel styling av overview-sektionen. */
    body.seh-content-mode.seh-team-native-v689 main [data-seh-team-section="overview"]{
      margin-top:0!important;
    }

    /* V717 – lagprofilens webb-DOM är endast datakälla i Android. */
    body.seh-content-mode.seh-team-native-v689 main.seh-team-native-source-host > :not(.seh-team-native-shell){
      display:none!important;
    }

    body.seh-content-mode main .seh-team-native-direct-loader{
      min-height:150px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      margin:10px 0!important;
      border:1px solid rgba(214,177,95,.18)!important;
      border-radius:14px!important;
      background:linear-gradient(155deg,rgba(7,11,18,.98),rgba(3,5,9,.995))!important;
      color:#8f99a5!important;
      font:800 10px/1.3 Inter,Arial,sans-serif!important;
      letter-spacing:.3px!important;
    }

    body.seh-content-mode main.seh-team-native-direct-loading > :not(.seh-team-native-direct-loader){
      display:none!important;
    }

    /* ============================================================
       V722 – riktig Android-finputs av lagprofilen
       - ingen webbfooter i appen
       - tydligare Historik / Spelare / Meriter
       - korrekt premiumrubrik för Divisionskurvan
       - mer luft ovanför den fasta bottennavigeringen
       ============================================================ */

    /* Webbens informationsfooter hör inte hemma inne i native-appen. */
    body.seh-native-app footer,
    body.seh-content-mode footer{
      display:none!important;
      visibility:hidden!important;
      height:0!important;
      min-height:0!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      overflow:hidden!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-shell{
      padding-bottom:14px!important;
    }

    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel{
      margin-bottom:8px!important;
    }

    /* Klubbprofil: lite lugnare typografi och tydligare styckeindelning. */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"]{
      padding:13px 12px 14px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] .seh-team-native-bio{
      gap:11px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] .seh-team-native-bio p{
      color:#d5d8dc!important;
      font-size:11.8px!important;
      line-height:1.52!important;
    }

    /* Den generella overview-h3-regeln var mer specifik och krympte denna rubrik. */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] .seh-team-division-heading h3{
      margin:0!important;
      color:#f7f4ee!important;
      font:950 18px/1.02 Inter,Arial,sans-serif!important;
      letter-spacing:-.28px!important;
      text-transform:none!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] .seh-team-division-heading>span{
      color:#58dbd4!important;
      font-size:7px!important;
      letter-spacing:.9px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="overview"] .seh-team-division-heading p{
      margin-top:5px!important;
      color:#8793a0!important;
      font-size:8.2px!important;
    }

    /* Statistik: behåll upplägget men ge sektionerna lite tydligare separation. */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"]{
      padding-bottom:18px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-team-performance,
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .dev-stat-leaderboard{
      border-color:rgba(214,177,95,.18)!important;
      background:linear-gradient(145deg,rgba(10,15,23,.92),rgba(4,7,12,.97))!important;
    }

    /* Historik: riktiga mobilrader i stället för ihoptryckt webbtabellskänsla. */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"]{
      padding:12px 10px 18px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto!important;
      gap:10px!important;
      min-height:58px!important;
      margin:0 0 6px!important;
      padding:10px 9px!important;
      border:1px solid rgba(255,255,255,.065)!important;
      border-radius:10px!important;
      background:linear-gradient(145deg,rgba(8,12,18,.78),rgba(3,6,10,.88))!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament:first-of-type{
      border-color:rgba(214,177,95,.23)!important;
      background:linear-gradient(145deg,rgba(214,177,95,.075),rgba(4,7,12,.90))!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament>div{
      min-width:0!important;
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      gap:4px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament strong{
      display:block!important;
      overflow:hidden!important;
      color:#f5f2ec!important;
      font:900 10.6px/1.18 Inter,Arial,sans-serif!important;
      white-space:normal!important;
      text-overflow:ellipsis!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament small{
      display:block!important;
      margin:0!important;
      color:#7f8b99!important;
      font:700 7.5px/1.28 Inter,Arial,sans-serif!important;
      white-space:normal!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament>b{
      align-self:center!important;
      min-width:46px!important;
      padding:6px 8px!important;
      font-size:8px!important;
    }

    /* Spelare: registret ska kännas som personlista, inte statistiktopplista. */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"]{
      padding:12px 10px 18px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-team-player-intro{
      margin:0 0 10px!important;
      color:#87919e!important;
      font:650 8.5px/1.4 Inter,Arial,sans-serif!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row{
      display:grid!important;
      grid-template-columns:44px minmax(0,1fr) auto!important;
      align-items:center!important;
      gap:10px!important;
      min-height:61px!important;
      padding:8px 5px!important;
      border-top:1px solid rgba(255,255,255,.065)!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row:first-of-type{
      border-top-color:rgba(214,177,95,.18)!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-player-link{
      color:inherit!important;
      text-decoration:none!important;
      -webkit-tap-highlight-color:rgba(214,177,95,.12)!important;
      cursor:pointer!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .seh-team-player-link:active,
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="stats"] .seh-team-player-link:active{
      background:rgba(214,177,95,.055)!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row img{
      width:44px!important;
      height:44px!important;
      border-radius:10px!important;
      object-fit:cover!important;
      object-position:center top!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row>div{
      min-width:0!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row strong{
      display:block!important;
      overflow:hidden!important;
      color:#f6f3ed!important;
      font:900 10.8px/1.14 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row small{
      display:block!important;
      margin-top:4px!important;
      overflow:hidden!important;
      color:#818d9a!important;
      font:700 7.4px/1.25 Inter,Arial,sans-serif!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="players"] .dev-player-row>b{
      align-self:center!important;
      color:#ffd400!important;
      font:950 9.4px/1 Inter,Arial,sans-serif!important;
    }

    /* Meriter: separata premium-meritkort med medaljikon och placeringsbadge. */
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"]{
      padding:12px 10px 20px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-tournament{
      display:grid!important;
      grid-template-columns:38px minmax(0,1fr) auto!important;
      align-items:center!important;
      gap:9px!important;
      min-height:66px!important;
      margin:0 0 7px!important;
      padding:9px 9px!important;
      border:1px solid rgba(214,177,95,.17)!important;
      border-radius:12px!important;
      background:
        radial-gradient(circle at 12% 50%,rgba(214,177,95,.08),transparent 30%),
        linear-gradient(145deg,rgba(10,14,21,.90),rgba(4,7,12,.97))!important;
      box-sizing:border-box!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-team-merit-icon{
      display:grid!important;
      place-items:center!important;
      width:36px!important;
      height:36px!important;
      border:1px solid rgba(214,177,95,.28)!important;
      border-radius:50%!important;
      background:rgba(214,177,95,.07)!important;
      font-size:17px!important;
      line-height:1!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-tournament>div{
      min-width:0!important;
      display:flex!important;
      flex-direction:column!important;
      gap:4px!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-tournament strong{
      display:block!important;
      color:#f6f2ea!important;
      font:900 10.5px/1.17 Inter,Arial,sans-serif!important;
      white-space:normal!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-tournament small{
      display:block!important;
      margin:0!important;
      color:#9099a5!important;
      font:700 7.5px/1.25 Inter,Arial,sans-serif!important;
      white-space:normal!important;
    }
    body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-tournament>b{
      min-width:38px!important;
      padding:6px 7px!important;
      border-color:rgba(255,212,0,.35)!important;
      background:rgba(255,212,0,.07)!important;
      color:#ffd400!important;
      font-size:8.2px!important;
    }

    @media(max-width:350px){
      body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="history"] .dev-tournament{
        padding:9px 8px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-tournament{
        grid-template-columns:34px minmax(0,1fr) auto!important;
        gap:7px!important;
        padding:8px 7px!important;
      }
      body.seh-content-mode.seh-team-native-v689 .seh-team-native-panel[data-seh-team-panel="merits"] .dev-team-merit-icon{
        width:32px!important;
        height:32px!important;
        font-size:15px!important;
      }
    }

    /* V754: Hem + ECL-säsong/statistik – riktig mobil layout i Android WebView. */
    #seh-app-home .seh-app-page h1{
      display:block!important;
      position:static!important;
      left:auto!important;
      right:auto!important;
      width:100%!important;
      max-width:100%!important;
      margin:0 0 10px!important;
      padding:0!important;
      transform:none!important;
      translate:none!important;
      text-indent:0!important;
      white-space:normal!important;
      overflow:visible!important;
      overflow-wrap:anywhere!important;
      color:var(--seh-text)!important;
      font-family:Inter,Arial,sans-serif!important;
      font-size:34px!important;
      font-weight:900!important;
      line-height:1.03!important;
      letter-spacing:-.035em!important;
      text-align:left!important;
    }

    @media(max-width:760px){
      #seh-app-home .seh-app-page{
        width:100%!important;
        max-width:100%!important;
        margin:0!important;
        padding-left:14px!important;
        padding-right:14px!important;
        box-sizing:border-box!important;
        overflow-x:hidden!important;
      }
      #seh-app-home .seh-app-page h1{
        font-size:32px!important;
      }

      body.seh-ecl-soft-switch #seh-route-transition-stage,
    body.seh-ecl-soft-switch #seh-native-loader{display:none!important}

    body.seh-route-ecl-season,
      body.seh-route-ecl-season main,
      body.seh-route-ecl-season #spaRouteView,
      body.seh-route-ecl-season #spaRouteView[data-route="season"]{
        max-width:100%!important;
        overflow-x:hidden!important;
        box-sizing:border-box!important;
      }

      body.seh-route-ecl-season .season-subnav,
      body.seh-route-ecl-season .season-subnav-v12840{
        max-width:100%!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        overscroll-behavior-x:contain!important;
        -webkit-overflow-scrolling:touch!important;
        scrollbar-width:none!important;
      }
      body.seh-route-ecl-season .season-subnav::-webkit-scrollbar,
      body.seh-route-ecl-season .season-subnav-v12840::-webkit-scrollbar{display:none!important}

      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"]{
        width:calc(100% - 8px)!important;
        max-width:calc(100% - 8px)!important;
        margin-left:4px!important;
        margin-right:4px!important;
        padding:14px 10px 18px!important;
        border-radius:16px!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-data-heading{
        display:block!important;
        margin-bottom:14px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-data-heading h3{
        max-width:100%!important;
        margin-top:5px!important;
        font-size:28px!important;
        line-height:1.02!important;
        letter-spacing:-.025em!important;
        overflow-wrap:anywhere!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-data-heading p{
        margin-top:9px!important;
        font-size:11px!important;
        line-height:1.45!important;
      }

      /* Filtren ska aldrig vara en desktop-rad som måste sidscrollas. */
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-tabs{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:8px!important;
        width:100%!important;
        max-width:100%!important;
        margin:0 0 14px!important;
        padding:8px!important;
        overflow:visible!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-tabs>div,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-tabs>div:nth-child(3){
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        padding:8px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-tabs nav,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-tabs>div:nth-child(3) nav{
        display:grid!important;
        grid-template-columns:repeat(auto-fit,minmax(72px,1fr))!important;
        gap:5px!important;
        width:100%!important;
        max-width:100%!important;
        overflow:visible!important;
        padding:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-tabs button{
        width:100%!important;
        min-width:0!important;
        min-height:38px!important;
        padding:0 6px!important;
        border-radius:9px!important;
        font-size:10px!important;
        white-space:nowrap!important;
      }

      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-heading{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:10px!important;
        margin:18px 0 12px!important;
        padding-bottom:12px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-heading h4{
        font-size:26px!important;
        line-height:1.04!important;
        overflow-wrap:anywhere!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stats-heading input{
        width:100%!important;
        min-width:0!important;
        min-height:42px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-summary-bar{
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        align-items:center!important;
        gap:9px!important;
        min-height:0!important;
        margin:10px 0 14px!important;
        padding:9px 11px!important;
        border-radius:12px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-summary-bar strong{
        font-size:26px!important;
        line-height:1!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-summary-bar span{
        min-width:0!important;
        font-size:10px!important;
        line-height:1.28!important;
      }

      /* Top 3: kompakta horisontella mobilkort i stället för stora desktopkort. */
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:9px!important;
        margin:0 0 16px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card{
        width:100%!important;
        min-width:0!important;
        min-height:0!important;
        border-radius:16px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card::after{
        left:104px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-hero{
        display:grid!important;
        grid-template-columns:104px minmax(0,1fr)!important;
        min-height:154px!important;
        max-height:174px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-media{
        width:104px!important;
        min-width:104px!important;
        min-height:154px!important;
        max-height:174px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-content{
        min-width:0!important;
        gap:6px!important;
        padding:10px 9px 9px 11px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-team-logo{
        top:8px!important;
        right:8px!important;
        width:34px!important;
        height:34px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-content-logo{
        width:92px!important;
        height:92px!important;
        right:-8px!important;
        bottom:-4px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-medal{
        top:8px!important;
        left:8px!important;
        min-width:31px!important;
        height:29px!important;
        padding:0 8px!important;
        border-radius:9px!important;
        font-size:11px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy{
        min-width:0!important;
        padding-top:10px!important;
        padding-right:28px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy strong,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy strong a,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-player-name,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-player-name a{
        max-width:100%!important;
        overflow:hidden!important;
        font-size:15px!important;
        line-height:1.06!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy small{
        max-width:100%!important;
        margin-top:4px!important;
        overflow:hidden!important;
        font-size:8px!important;
        line-height:1.15!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy b,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-value{
        margin-top:5px!important;
        font-size:25px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy b em,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-value em{
        font-size:10px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card dl{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:4px!important;
        margin:4px 0 4px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card dl div{
        min-width:0!important;
        padding:5px 3px 6px!important;
        border-radius:7px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card dt{
        font-size:5.8px!important;
        line-height:1!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card dd{
        margin-top:3px!important;
        font-size:12px!important;
        line-height:1!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-bar{
        height:3px!important;
        margin-top:4px!important;
      }

      /* Full ranking: mobilkort per spelare. All statistik finns kvar utan sidscroll. */
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stat-table-host{
        width:100%!important;
        max-width:100%!important;
        margin-top:12px!important;
        overflow:hidden!important;
        border-radius:14px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stat-table-host .seh-mobile-table-wrap,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-stat-table-host .season-table-wrap{
        width:100%!important;
        max-width:100%!important;
        overflow:visible!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] table.season-stat-table.seh-ecl-mobile-table{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        table-layout:auto!important;
        border-collapse:separate!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table thead{
        display:none!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody{
        display:grid!important;
        gap:6px!important;
        width:100%!important;
        padding:6px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody tr{
        display:grid!important;
        grid-template-columns:repeat(var(--seh-ecl-stat-count,6),minmax(0,1fr))!important;
        grid-template-rows:auto auto auto!important;
        gap:2px 4px!important;
        width:100%!important;
        min-width:0!important;
        min-height:0!important;
        margin:0!important;
        padding:8px 8px 7px!important;
        border:1px solid rgba(126,149,191,.12)!important;
        border-radius:11px!important;
        background:linear-gradient(180deg,rgba(8,17,31,.62),rgba(2,8,16,.72))!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td{
        display:block!important;
        width:auto!important;
        min-width:0!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        background:none!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td:first-child{
        grid-column:1!important;
        grid-row:1 / span 2!important;
        align-self:center!important;
        justify-self:start!important;
        width:auto!important;
        padding:0!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td:nth-child(2){
        grid-column:2 / -1!important;
        grid-row:1!important;
        align-self:end!important;
        overflow:hidden!important;
        text-align:left!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td:nth-child(3){
        grid-column:2 / -1!important;
        grid-row:2!important;
        align-self:start!important;
        overflow:hidden!important;
        text-align:left!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td:nth-child(n+4){
        grid-row:3!important;
        min-width:0!important;
        padding:5px 2px 2px!important;
        border-top:1px solid rgba(126,149,191,.10)!important;
        color:#f5f2eb!important;
        font-size:10px!important;
        font-weight:900!important;
        line-height:1!important;
        text-align:center!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td:nth-child(n+4)::before{
        content:attr(data-seh-ecl-label)!important;
        display:block!important;
        margin-bottom:4px!important;
        overflow:hidden!important;
        color:#6edbd8!important;
        font-size:5.8px!important;
        font-weight:1000!important;
        line-height:1!important;
        letter-spacing:.04em!important;
        text-overflow:ellipsis!important;
        text-transform:uppercase!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-rank{
        min-width:27px!important;
        width:27px!important;
        height:27px!important;
        border-radius:8px!important;
        font-size:9px!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-player,
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-player a{
        display:block!important;
        max-width:100%!important;
        overflow:hidden!important;
        font-size:12px!important;
        line-height:1.15!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-team{
        display:grid!important;
        grid-template-columns:22px minmax(0,1fr)!important;
        align-items:center!important;
        gap:6px!important;
        min-width:0!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-team__logo{
        width:22px!important;
        height:22px!important;
        border-radius:6px!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-team__logo img{
        width:18px!important;
        height:18px!important;
      }
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table .season-stat-team__name{
        display:block!important;
        max-width:100%!important;
        overflow:hidden!important;
        font-size:8px!important;
        line-height:1.1!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }
      body.seh-route-ecl-season .seh-ecl-mobile-sortbar{
        display:flex!important;
        flex-wrap:wrap!important;
        gap:5px!important;
        width:100%!important;
        padding:7px 7px 1px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .seh-ecl-mobile-sortbar::before{
        content:'SORTERA'!important;
        flex:0 0 100%!important;
        color:#62d4cf!important;
        font:1000 6.5px/1 Inter,Arial,sans-serif!important;
        letter-spacing:.09em!important;
      }
      body.seh-route-ecl-season .seh-ecl-mobile-sortbar button{
        min-height:28px!important;
        border:1px solid rgba(214,177,95,.20)!important;
        border-radius:8px!important;
        padding:0 8px!important;
        background:#090d14!important;
        color:#9ca5b1!important;
        font:900 7.5px/1 Inter,Arial,sans-serif!important;
      }
      body.seh-route-ecl-season .seh-ecl-mobile-sortbar button.is-active{
        border-color:#ffd000!important;
        background:rgba(255,208,0,.10)!important;
        color:#ffd000!important;
      }
    }

    @media(max-width:350px){
      #seh-app-home .seh-app-page h1{font-size:29px!important}
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-card::after{left:94px!important}
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-hero{grid-template-columns:94px minmax(0,1fr)!important}
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-media{width:94px!important;min-width:94px!important}
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy strong,
      body.seh-route-ecl-season .season-data-section[data-season-section="statistics"] .season-top3-copy strong a{font-size:13px!important}
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody tr{padding-left:6px!important;padding-right:6px!important;gap:2px 3px!important}
      body.seh-route-ecl-season table.season-stat-table.seh-ecl-mobile-table tbody td:nth-child(n+4){font-size:9px!important}
    }


    /* V755: ECL Lag – en riktig enkolumns mobilvy + mer plats för lagnamn i Byten. */
    @media(max-width:760px){
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-list{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:10px!important;
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card{
        display:block!important;
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        border-radius:14px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__link{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:11px!important;
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        min-height:0!important;
        height:auto!important;
        padding:13px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__watermark{
        top:-28px!important;
        right:-24px!important;
        width:150px!important;
        height:132px!important;
        opacity:.045!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__header{
        display:grid!important;
        grid-template-columns:66px minmax(0,1fr)!important;
        align-items:center!important;
        gap:10px!important;
        width:100%!important;
        min-width:0!important;
        min-height:0!important;
        margin:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__logo{
        width:66px!important;
        height:66px!important;
        min-width:66px!important;
        padding:5px!important;
        border-radius:10px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__logo img{
        width:100%!important;
        height:100%!important;
        max-width:100%!important;
        max-height:100%!important;
        padding:0!important;
        object-fit:contain!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__identity{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        overflow:hidden!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__eyebrow{
        display:flex!important;
        flex-wrap:wrap!important;
        align-items:center!important;
        gap:4px!important;
        width:100%!important;
        max-width:100%!important;
        margin:0 0 6px!important;
        overflow:visible!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-division,
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-group,
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-status-badge{
        flex:0 0 auto!important;
        max-width:100%!important;
        min-height:18px!important;
        padding:3px 6px!important;
        font-size:6.5px!important;
        line-height:1!important;
        white-space:normal!important;
        text-align:center!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card h4{
        display:block!important;
        width:100%!important;
        max-width:100%!important;
        margin:0!important;
        overflow:hidden!important;
        color:#fff!important;
        font-size:19px!important;
        line-height:1.05!important;
        letter-spacing:-.025em!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__identity p{
        margin:4px 0 0!important;
        max-width:100%!important;
        overflow:hidden!important;
        font-size:9px!important;
        line-height:1.2!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-highlights{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:6px!important;
        width:100%!important;
        min-width:0!important;
        margin:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-highlights>div{
        display:grid!important;
        align-content:center!important;
        min-width:0!important;
        min-height:45px!important;
        padding:7px 8px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-highlights span{
        font-size:6.5px!important;
        line-height:1!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-highlights strong{
        margin-top:5px!important;
        font-size:14px!important;
        line-height:1!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__panels{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:9px!important;
        width:100%!important;
        min-width:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:7px!important;
        width:100%!important;
        min-width:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats h5{
        margin:0!important;
        font-size:8px!important;
        line-height:1!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats dl,
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats--playoff dl{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:5px!important;
        width:100%!important;
        min-width:0!important;
        margin:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats dl div{
        min-width:0!important;
        min-height:43px!important;
        padding:7px 8px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats dt{
        max-width:100%!important;
        overflow:hidden!important;
        font-size:6.2px!important;
        line-height:1!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__stats dd{
        max-width:100%!important;
        margin:5px 0 0!important;
        overflow:hidden!important;
        font-size:13px!important;
        line-height:1!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__empty-note{
        margin:0!important;
        padding:8px 9px!important;
        font-size:9px!important;
        line-height:1.35!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__footer{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:7px!important;
        width:100%!important;
        min-width:0!important;
        margin:0!important;
        padding:0!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__summary{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        padding:7px 8px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__summary p{
        max-width:100%!important;
        overflow:hidden!important;
        font-size:8.5px!important;
        line-height:1.35!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__action{
        width:100%!important;
        min-width:0!important;
        min-height:34px!important;
        justify-content:center!important;
        padding:0 10px!important;
        box-sizing:border-box!important;
        font-size:8px!important;
      }

      /* Byten: behåll layouten, men ge lagnamnet mer faktisk textyta. */
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team{
        grid-template-columns:60px minmax(0,1fr)!important;
        gap:10px!important;
        min-width:0!important;
        min-height:96px!important;
        padding:10px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team-logo{
        width:60px!important;
        height:60px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team>div:last-child{
        min-width:0!important;
        width:100%!important;
        overflow:hidden!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team strong{
        display:-webkit-box!important;
        max-width:100%!important;
        overflow:hidden!important;
        font-size:15px!important;
        line-height:1.08!important;
        white-space:normal!important;
        text-overflow:clip!important;
        overflow-wrap:anywhere!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team small{
        font-size:7px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team span{
        margin-top:2px!important;
        font-size:8px!important;
      }
    }

    @media(max-width:350px){
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__header{
        grid-template-columns:58px minmax(0,1fr)!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card__logo{
        width:58px!important;
        height:58px!important;
        min-width:58px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="teams"] .season-team-card h4{
        font-size:17px!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team{
        grid-template-columns:54px minmax(0,1fr)!important;
      }
      body.seh-route-ecl-season .season-data-section[data-season-section="transfers"] .season-transfer-team-logo{
        width:54px!important;
        height:54px!important;
      }
    }


`;

  function htmlEscape(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}


  const SEH_RANKING_EDGE_ENDPOINT='https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/app-player-ranking?key=seh-player-ranking-2026-v1&v=11';
  let sehRankingPromise=null;

  function rankingNameKey(value){
    return String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('sv-SE');
  }

  function rankingNameAliases(value){
    const raw=rankingNameKey(value);
    if(!raw)return [];
    const aliases=new Set([raw]);
    const compact=raw.replace(/[^a-z0-9åäö]/gi,'');
    if(compact)aliases.add(compact);

    // Många äldre SportsGamer-namn använder dekorativa I/l/| runt gamertagen,
    // t.ex. I-Furyan-I och l-Furyan-l. Matcha även själva kärnnamnet.
    let core=raw
      .replace(/^[|il]+[-_. ]*/i,'')
      .replace(/[-_. ]*[|il]+$/i,'')
      .replace(/[^a-z0-9åäö]/gi,'');
    if(core.length>=3)aliases.add(core);
    return [...aliases];
  }

  function formatRankingNumber(value,decimals=0){
    const n=Number(value);
    if(!Number.isFinite(n))return '–';
    return new Intl.NumberFormat('sv-SE',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(n);
  }

  function buildRankingLookup(rows){
    const byName=new Map();
    const byKey=new Map();
    (Array.isArray(rows)?rows:[]).forEach(row=>{
      rankingNameAliases(row.display_gamertag).forEach(key=>{
        if(key && !byName.has(key))byName.set(key,row);
      });
      if(row.player_key!==null && row.player_key!==undefined){
        byKey.set(String(row.player_key).trim().toLowerCase(),row);
      }
    });
    return {rows:Array.isArray(rows)?rows:[],byName,byKey};
  }

  const SEH_STATIC_RANKING_FALLBACK={
    'i-furyan-i':[1,5054],
    'l-furyan-l':[1,5054],
    'jaiken--':[10,3144],
    'david_ovic':[19,2767],
    'antoniomannen_':[2,4673]
  };

  function staticRankingRows(){
    return Object.entries(SEH_STATIC_RANKING_FALLBACK).map(([display_gamertag,v])=>({
      display_gamertag,
      overall_rank:v[0],
      ranking_points:v[1]
    }));
  }

  function readNativeRankingRows(){
    try{
      const pushed=window.__SEH_RANKING_JSON;
      if(typeof pushed==='string' && pushed){
        const rows=JSON.parse(pushed);
        if(Array.isArray(rows) && rows.length)return rows;
      }else if(Array.isArray(pushed) && pushed.length){
        return pushed;
      }

      const raw=window.SehNative?.getRankingJson?.();
      if(!raw)return null;
      const rows=JSON.parse(raw);
      return Array.isArray(rows)?rows:null;
    }catch(err){
      console.warn('[Svensk eHockey] Kunde inte läsa ranking-JSON',err);
      return null;
    }
  }

  function loadRankingData(){
    if(window.__SEH_FULL_RANKING_LOOKUP__?.rows?.length>1300){
      return Promise.resolve(window.__SEH_FULL_RANKING_LOOKUP__);
    }
    if(sehRankingPromise)return sehRankingPromise;

    sehRankingPromise=(async()=>{
      try{
        const cachedRows=window.__SEH_PLAYER_RANKING_ROWS__;
        if(Array.isArray(cachedRows) && cachedRows.length>1300){
          const lookup=buildRankingLookup(cachedRows);
          window.__SEH_FULL_RANKING_LOOKUP__=lookup;
          return lookup;
        }

        let lastError=null;
        for(let attempt=1;attempt<=3;attempt++){
          try{
            // Edge-funktionen kan tillfälligt svara 502. Felresponsen har tidigare
            // kunnat cachas i upp till fem minuter, så en vanlig retry mot exakt
            // samma URL hjälper då inte. Alla retries får därför en unik URL.
            const endpoint=attempt===1
              ? SEH_RANKING_EDGE_ENDPOINT
              : `${SEH_RANKING_EDGE_ENDPOINT}&retry=${Date.now()}-${attempt}`;
            const response=await fetch(endpoint,attempt===1?{}:{cache:'no-store'});
            if(!response.ok)throw new Error(`Ranking HTTP ${response.status}`);
            const rows=await response.json();
            if(!Array.isArray(rows)||rows.length<1300){
              throw new Error(`Ofullständig rankinglista: ${Array.isArray(rows)?rows.length:'ogiltigt svar'}`);
            }
            window.__SEH_PLAYER_RANKING_ROWS__=rows;
            const lookup=buildRankingLookup(rows);
            window.__SEH_FULL_RANKING_LOOKUP__=lookup;
            console.info('[Svensk eHockey] Full ranking laddad via edge-cache',rows.length,'rader','attempt',attempt);
            return lookup;
          }catch(error){
            lastError=error;
            if(attempt<3)await new Promise(resolve=>setTimeout(resolve,350*attempt));
          }
        }
        throw lastError||new Error('Rankingen kunde inte laddas');
      }catch(edgeError){
        console.warn('[Svensk eHockey] Edge-ranking misslyckades, provar lokal/native fallback',edgeError);
        const nativeRows=readNativeRankingRows();
        const rows=(nativeRows&&nativeRows.length)?nativeRows:staticRankingRows();
        const lookup=buildRankingLookup(rows);
        window.__SEH_FULL_RANKING_LOOKUP__=lookup;
        return lookup;
      }
    })();

    return sehRankingPromise;
  }

  let sehPageRankingLookup=buildRankingLookup(staticRankingRows());
  let sehPageRankingListenerInstalled=false;

  function applyPageRankingRows(rows){
    if(Array.isArray(rows) && rows.length){
      const combined=[...(sehPageRankingLookup.rows||[]),...rows];
      sehPageRankingLookup=buildRankingLookup(combined);
    }
    // Also apply already-cached rows. This makes returning to a page instant and
    // avoids another native/database round-trip for players we already know.
    document.querySelectorAll('.seh-native-player-card-v2').forEach(card=>{
      const name=card.querySelector('.seh-np-name')?.textContent||'';
      const rank=rankingFromData(sehPageRankingLookup,card.getAttribute('href')||'',name);
      if(!rank)return;
      let badge=card.querySelector('.seh-np-ranking');
      if(!badge){
        badge=document.createElement('div');
        badge.className='seh-np-ranking';
        const metaEl=card.querySelector('.seh-np-meta');
        const latestEl=card.querySelector('.seh-np-latest');
        if(metaEl)metaEl.insertAdjacentElement('afterend',badge);
        else if(latestEl)latestEl.insertAdjacentElement('beforebegin',badge);
        else card.appendChild(badge);
      }
      badge.innerHTML=`<strong>#${htmlEscape(rank.overall_rank)}</strong><span class="dot">·</span><span>${htmlEscape(formatRankingNumber(rank.ranking_points,0))} RP</span>`;
    });
  }

  function installPageRankingListener(){
    if(sehPageRankingListenerInstalled)return;
    sehPageRankingListenerInstalled=true;
    window.addEventListener('seh-page-ranking-ready',()=>{
      try{
        const raw=window.__SEH_PAGE_RANKING_JSON;
        const rows=typeof raw==='string'?JSON.parse(raw):raw;
        applyPageRankingRows(rows);
      }catch(err){
        console.warn('[Svensk eHockey] Kunde inte läsa sidranking',err);
      }
    });
  }

  function requestRankingForVisibleCards(container){
    installPageRankingListener();
    const cards=[...(container||document).querySelectorAll('.seh-native-player-card-v2')];
    const names=[...new Set(cards.map(c=>(c.querySelector('.seh-np-name')?.textContent||'').trim()).filter(Boolean))];
    if(!names.length)return;

    // Apply anything already cached immediately, then ask Android only for
    // the still-missing names on this page (normally at most 20).
    applyPageRankingRows([]);
    const missingNames=names.filter(name=>!rankingFromData(sehPageRankingLookup,'',name));
    if(!missingNames.length)return;

    try{
      if(window.SehNative?.requestRankingForNames){
        window.SehNative.requestRankingForNames(JSON.stringify(missingNames));
        return;
      }
    }catch(err){
      console.warn('[Svensk eHockey] Kunde inte begära sidranking via native',err);
    }

    // Browser/dev fallback: use the existing async lookup without blocking rendering.
    loadRankingData().then(data=>{
      const rows=[];
      missingNames.forEach(name=>{
        const rank=rankingFromData(data,'',name);
        if(rank)rows.push(rank);
      });
      applyPageRankingRows(rows);
    });
  }

  function findRankingByName(name){
    return loadRankingData().then(data=>{
      for(const key of rankingNameAliases(name)){
        if(data.byName.has(key))return data.byName.get(key);
      }
      return null;
    });
  }

  function rankingKeysFromHref(hrefValue){
    try{
      const u=new URL(hrefValue||location.href,location.href);
      const out=new Set();
      const add=v=>{
        const x=decodeURIComponent(String(v||'')).trim().toLowerCase();
        if(x)out.add(x);
      };
      ['player_key','playerKey','player','playerId','playerID','id'].forEach(k=>add(u.searchParams.get(k)));
      const hashParts=(u.hash||'').split(/[\/?#=&]/).filter(Boolean);
      const pathParts=(u.pathname||'').split('/').filter(Boolean);
      hashParts.slice(-4).forEach(add);
      pathParts.slice(-4).forEach(add);
      return [...out];
    }catch(_){return [];}
  }

  function rankingKeyFromHref(hrefValue){
    return rankingKeysFromHref(hrefValue)[0]||'';
  }

  function rankingFromData(data,hrefValue,name){
    for(const key of rankingKeysFromHref(hrefValue)){
      if(data.byKey.has(key))return data.byKey.get(key);
    }
    for(const key of rankingNameAliases(name)){
      if(data.byName.has(key))return data.byName.get(key);
    }
    return null;
  }

  function findRankingForCard(card,name){
    const href=cardLink(card);
    return loadRankingData().then(data=>rankingFromData(data,href,name));
  }

  function decoratePlayerCardRanking(card,name){
    if(!card || !name)return;
    findRankingForCard(card,name).then(rank=>{
      if(!rank || !card.isConnected)return;
      const wrap=card.querySelector('.seh-compact-player');
      const summary=wrap?.querySelector('.seh-cp-summary');
      if(!summary)return;
      let badge=summary.querySelector('.seh-cp-ranking');
      if(!badge){
        badge=document.createElement('div');
        badge.className='seh-cp-ranking';
        summary.insertAdjacentElement('afterbegin',badge);
      }
      badge.innerHTML=`<strong>#${htmlEscape(rank.overall_rank)}</strong><span class="sep">·</span><span>${htmlEscape(formatRankingNumber(rank.ranking_points,0))} RP</span>`;
    });
  }

  function adaptPlayerProfileHeroRp(main,rank){
    if(!main || !rank)return;
    const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
    const careerHeading=[...main.querySelectorAll('h1,h2,h3,h4')].find(el=>
      /^(Karriärstatistik|Målvaktsstatistik)$/i.test(clean(el.textContent))
    );
    const isBeforeCareer=el=>{
      if(!careerHeading || !el)return true;
      try{return !!(el.compareDocumentPosition(careerHeading)&Node.DOCUMENT_POSITION_FOLLOWING);}catch(_){return true;}
    };
    const totalRp=Number.isFinite(Number(rank.ranking_points)) ? formatRankingNumber(rank.ranking_points,0) : '–';
    const hasAverage=Number(rank.average_rank)>0 && Number.isFinite(Number(rank.average_rating));
    const avgRp=hasAverage ? formatRankingNumber(rank.average_rating,3) : '–';
    const swedenRank=Number(rank.overall_rank)>0 ? `#${formatRankingNumber(rank.overall_rank,0)}` : '–';

    const specs=[
      {aliases:['POÄNG','TOTAL RP'],label:'TOTAL RP',value:totalRp,key:'total'},
      {aliases:['MÅL','SNITT-RP'],label:'SNITT-RP',value:avgRp,key:'average'},
      {aliases:['ASSIST','SVERIGE-RANK'],label:'SVERIGE-RANK',value:swedenRank,key:'rank'}
    ];
    const everyLabel=new Set(specs.flatMap(spec=>spec.aliases));

    const exactLeafLabels=node=>[...node.querySelectorAll('*')]
      .filter(el=>el.children.length===0)
      .map(el=>clean(el.textContent).toUpperCase())
      .filter(t=>everyLabel.has(t));

    const findBox=spec=>{
      const labelCandidates=[...main.querySelectorAll('*')].filter(el=>{
        if(el.closest('.seh-player-ranking-card,.seh-player-summary-row'))return false;
        if(!isBeforeCareer(el))return false;
        const text=clean(el.textContent).toUpperCase();
        if(!spec.aliases.includes(text))return false;
        // Prefer the actual label leaf, not a larger wrapper whose combined text happens to match.
        return el.children.length===0 || [...el.children].every(ch=>!clean(ch.textContent));
      });

      let best=null;
      for(const labelEl of labelCandidates){
        let node=labelEl.parentElement;
        for(let depth=0;node && node!==main && node!==document.body && depth<7;depth++,node=node.parentElement){
          if(!isBeforeCareer(node))continue;
          const text=clean(node.innerText||node.textContent);
          if(!text || text.length>100)continue;
          const labels=exactLeafLabels(node);
          const unique=[...new Set(labels)];
          if(unique.length!==1 || !spec.aliases.includes(unique[0]))continue;
          if(!/[#\d–-]/.test(text))continue;
          let area=Number.MAX_SAFE_INTEGER;
          try{const rect=node.getBoundingClientRect();area=Math.max(1,rect.width*rect.height);}catch(_){ }
          if(!best || area<best.area)best={box:node,labelEl,area};
          break;
        }
      }
      return best;
    };

    specs.forEach(spec=>{
      const found=findBox(spec);
      if(!found)return;
      const {box,labelEl}=found;
      const valueCandidates=[...box.querySelectorAll('*')].filter(el=>{
        if(el===labelEl || el.contains(labelEl))return false;
        if(el.children.length>0)return false;
        const text=clean(el.textContent);
        return /^(?:#?[\d\s]+(?:[.,]\d+)?|[–-])$/.test(text);
      });
      let valueEl=valueCandidates[0]||null;
      if(!valueEl){
        valueEl=[...box.children].find(el=>{
          if(el===labelEl || el.contains(labelEl))return false;
          return /[#\d–-]/.test(clean(el.textContent));
        })||null;
      }
      if(!valueEl)return;
      labelEl.textContent=spec.label;
      valueEl.textContent=spec.value;
      box.dataset.sehHeroRp=spec.key;
    });
  }

  function hideOriginalWebRankingPoints(main){
    if(!main)return;

    const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
    const protectedSelector='.seh-player-ranking-card,[data-seh-hero-rp]';

    // Webbens stora RP-panel har den här rubriken. Appens kompakta RP-kort
    // använder samma ord, så vi börjar alltid från ett exakt rubrikblad som
    // ligger UTANF både appkortet och hero-RP:n.
    const titleLeaves=[...main.querySelectorAll('*')].filter(el=>{
      if(el.children.length>0)return false;
      if(el.closest(protectedSelector))return false;
      return /^SVENSK EHOCKEY RP$/i.test(clean(el.textContent));
    });

    for(const title of titleLeaves){
      let node=title.parentElement;
      for(let depth=0;node && node!==main && depth<10;depth++,node=node.parentElement){
        // Gå aldrig upp i en container som innehåller den RP vi vill behålla.
        if(node.matches(protectedSelector) || node.querySelector(protectedSelector))break;

        const txt=clean(node.innerText||node.textContent||'');
        if(!txt || txt.length>2600)break;

        const isOriginalWebPanel=
          /SVENSK\s+EHOCKEY\s+RP/i.test(txt) &&
          /Ranking\s+Points/i.test(txt) &&
          /TOTAL\s*RP/i.test(txt) &&
          /SNITT-?RP/i.test(txt) &&
          /(Visa|Dölj)\s+RP-uträkning/i.test(txt);

        if(isOriginalWebPanel){
          node.style.setProperty('display','none','important');
          node.setAttribute('data-seh-original-web-rp-hidden','1');
          return;
        }
      }
    }
  }

  function syncNativePlayerRanking(rank){
    if(!rank)return;
    const root=document.querySelector('body > .seh-player-native-root');
    if(!root || root.dataset.routeKey!==(location.pathname+location.hash))return;

    const overallRank=Number(rank.overall_rank)>0?`#${formatRankingNumber(rank.overall_rank,0)}`:'—';
    const totalRp=Number.isFinite(Number(rank.ranking_points))?formatRankingNumber(rank.ranking_points,0):'—';
    const hasAverage=Number(rank.average_rank)>0 && Number.isFinite(Number(rank.average_rating));
    const avgRp=hasAverage?formatRankingNumber(rank.average_rating,3):'—';
    const pos=String(rank.primary_position||'').toUpperCase();
    const positionGroup=String(rank.position_group||'').toUpperCase() || (pos==='G'?'G':(['LD','RD','D'].includes(pos)?'D':'F'));
    const roleRank=positionGroup==='G' ? rank.goalie_rank : (rank.position_rank||rank.skater_rank);
    const roleLabel=positionGroup==='G' ? 'Målvakter' : (positionGroup==='D' ? 'Backar' : (positionGroup==='F' ? 'Forwards' : 'Utespelare'));
    const roleRankValue=Number(roleRank)>0?`#${formatRankingNumber(roleRank,0)}`:'—';

    const set=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
    set('[data-native-rank-country]',overallRank);
    set('[data-native-rank-total]',totalRp);
    set('[data-native-rank-total-inline]',totalRp);
    set('[data-native-rank-average]',avgRp);
    set('[data-native-rank-role]',roleRankValue);
    set('[data-native-rank-role-label]',roleLabel);
    set('[data-native-rank-compact]',overallRank);
  }

  function adaptPlayerRankingProfile(){
    if(route().kind!=='player')return;
    const main=document.querySelector('main');
    if(!main)return;
    const nameEl=main.querySelector('.player-profile-name,h1');
    const name=(nameEl?.textContent||'').replace(/\s+/g,' ').trim();
    if(!name)return;

    const routePlayerKey=rankingKeyFromHref(location.href);
    loadRankingData().then(data=>{
      let rank=null;
      if(routePlayerKey && data.byKey.has(routePlayerKey))rank=data.byKey.get(routePlayerKey);
      if(!rank){
        for(const key of rankingNameAliases(name)){
          if(data.byName.has(key)){rank=data.byName.get(key);break;}
        }
      }
      if(!rank || route().kind!=='player'){
        main.querySelector('.seh-player-ranking-card')?.remove();
        return;
      }

      // Uppdatera native-profilen direkt när rankingen kommer. Synka även igen
      // efter korta intervall eftersom den slutliga profilroten kan skapas om medan
      // nätverksanropet fortfarande pågår.
      syncNativePlayerRanking(rank);
      [120,450,1100].forEach(delay=>setTimeout(()=>{
        if(route().kind==='player')syncNativePlayerRanking(rank);
      },delay));

      let card=main.querySelector('.seh-player-ranking-card');
      if(!card){
        card=document.createElement('section');
        card.className='seh-player-ranking-card';
      }

      const overallRank=Number(rank.overall_rank)>0?`#${formatRankingNumber(rank.overall_rank,0)}`:'–';
      const totalRp=Number.isFinite(Number(rank.ranking_points))?formatRankingNumber(rank.ranking_points,0):'–';
      const hasAverage=Number(rank.average_rank)>0 && Number.isFinite(Number(rank.average_rating));
      const avgRank=hasAverage?`#${formatRankingNumber(rank.average_rank,0)}`:'Ej rankad';
      const avgValue=hasAverage?formatRankingNumber(rank.average_rating,3):'–';

      adaptPlayerProfileHeroRp(main,rank);

      const baseSkaterRp=Number(rank.base_skater_rp)||0;
      const positionAdjustmentRp=Number(rank.position_adjustment_rp)||0;
      const skaterRp=Number(rank.skater_rp)||0;
      const goalieRp=Number(rank.goalie_rp)||0;
      const performanceRp=skaterRp+goalieRp;
      const teamMeritRp=Number(rank.team_merit_rp)||0;
      const personalMeritRp=Number(rank.personal_merit_rp)||0;
      const perfPerGame=Number(rank.performance_rp_per_game);
      const avgMeritBonus=Number(rank.average_merit_bonus);
      const eligibleGames=Number(rank.eligible_games)||0;
      const pos=String(rank.primary_position||'').toUpperCase();
      const positionGroup=String(rank.position_group||'').toUpperCase() || (pos==='G'?'G':(['LD','RD','D'].includes(pos)?'D':'F'));
      const roleRank=positionGroup==='G' ? rank.goalie_rank : (rank.position_rank||rank.skater_rank);
      const roleLabel=positionGroup==='G' ? 'Målvakter' : (positionGroup==='D' ? 'Backar' : (positionGroup==='F' ? 'Forwards' : 'Utespelare'));
      const positionAdjustmentLabel=positionGroup==='D' ? 'Positionsnormalisering (back)' : (positionGroup==='F' ? 'Positionsnormalisering (forward)' : 'Positionsnormalisering');
      const signedPositionAdjustment=`${positionAdjustmentRp>0?'+':''}${formatRankingNumber(positionAdjustmentRp,1)} RP`;

      const rankingPanelKey=routePlayerKey || rankingNameAliases(name)[0] || name;
      const expandedStore=window.__SEH_PLAYER_RP_EXPANDED__ instanceof Map
        ? window.__SEH_PLAYER_RP_EXPANDED__
        : (window.__SEH_PLAYER_RP_EXPANDED__=new Map());
      const existingExpanded=card.querySelector('.seh-player-ranking-toggle')?.getAttribute('aria-expanded')==='true';
      if(existingExpanded)expandedStore.set(rankingPanelKey,true);
      const expanded=existingExpanded || expandedStore.get(rankingPanelKey)===true;
      const signature=[
        rank.player_key||'',rank.display_gamertag||'',rank.overall_rank||'',rank.ranking_points||'',
        rank.average_rank||'',rank.average_rating||'',rank.skater_rank||'',rank.goalie_rank||'',
        rank.position_group||'',rank.position_rank||'',rank.defender_rank||'',rank.forward_rank||'',
        rank.eligible_games||'',rank.base_skater_rp||'',rank.position_adjustment_rp||'',rank.skater_rp||'',rank.goalie_rp||'',rank.team_merit_rp||'',
        rank.personal_merit_rp||'',rank.performance_rp_per_game||'',rank.average_merit_bonus||''
      ].join('|');

      if(card.dataset.sehRankingSignature!==signature){
        card.innerHTML=`
        <div class="seh-player-ranking-title">
          <span>Svensk eHockey RP</span>
          <small>Ranking Points</small>
        </div>
        <div class="seh-player-ranking-grid">
          <div class="seh-player-ranking-main">
            <span class="label">Total RP</span>
            <span class="rank">${htmlEscape(totalRp)} <em>RP</em></span>
            <span class="value">${htmlEscape(overallRank)} i Sverige</span>
          </div>
          <div class="seh-player-ranking-main">
            <span class="label">Snitt-RP</span>
            <span class="rank">${htmlEscape(avgValue)}</span>
            <span class="value">${hasAverage?`${htmlEscape(avgRank)} i Sverige`:'Minst 30 matcher krävs'}</span>
          </div>
        </div>
        <div class="seh-player-ranking-meta">
          ${Number(roleRank)>0?`<span class="seh-player-ranking-chip">${htmlEscape(roleLabel)}<strong>#${htmlEscape(formatRankingNumber(roleRank,0))}</strong></span>`:''}
          ${eligibleGames>0?`<span class="seh-player-ranking-chip">Rankade matcher<strong>${htmlEscape(formatRankingNumber(eligibleGames,0))}</strong></span>`:''}
        </div>
        <button type="button" class="seh-player-ranking-toggle" aria-expanded="${expanded?'true':'false'}">
          <span>${expanded?'Dölj RP-uträkning':'Visa RP-uträkning'}</span><b aria-hidden="true">${expanded?'⌃':'⌄'}</b>
        </button>
        <div class="seh-player-ranking-breakdown"${expanded?'':' hidden'}>
          <div class="seh-player-ranking-breakdown-group">
            <h4>Total RP</h4>
            ${baseSkaterRp!==0?`<div class="seh-player-ranking-breakdown-row"><span>Grundprestation utespelare</span><strong>${htmlEscape(formatRankingNumber(baseSkaterRp,1))} RP</strong></div>`:''}
            ${Math.abs(positionAdjustmentRp)>=0.05?`<div class="seh-player-ranking-breakdown-row"><span>${htmlEscape(positionAdjustmentLabel)}</span><strong>${htmlEscape(signedPositionAdjustment)}</strong></div>`:''}
            ${goalieRp!==0?`<div class="seh-player-ranking-breakdown-row"><span>Målvaktsprestationer</span><strong>${htmlEscape(formatRankingNumber(goalieRp,1))} RP</strong></div>`:''}
            <div class="seh-player-ranking-breakdown-row"><span>Spelprestationer efter normalisering</span><strong>${htmlEscape(formatRankingNumber(performanceRp,1))} RP</strong></div>
            <div class="seh-player-ranking-breakdown-row"><span>Lagmeriter</span><strong>+${htmlEscape(formatRankingNumber(teamMeritRp,1))} RP</strong></div>
            <div class="seh-player-ranking-breakdown-row"><span>Personliga meriter</span><strong>+${htmlEscape(formatRankingNumber(personalMeritRp,1))} RP</strong></div>
            <div class="seh-player-ranking-breakdown-row is-total"><span>Totalt</span><strong>${htmlEscape(formatRankingNumber(rank.ranking_points,1))} RP</strong></div>
          </div>
          <div class="seh-player-ranking-breakdown-group">
            <h4>Snitt-RP</h4>
            ${Number.isFinite(perfPerGame)?`<div class="seh-player-ranking-breakdown-row"><span>Prestation per rankad match</span><strong>${htmlEscape(formatRankingNumber(perfPerGame,3))}</strong></div>`:''}
            ${Number.isFinite(avgMeritBonus)?`<div class="seh-player-ranking-breakdown-row"><span>Meritbonus</span><strong>+${htmlEscape(formatRankingNumber(avgMeritBonus,3))}</strong></div>`:''}
            <div class="seh-player-ranking-breakdown-row is-total"><span>Snitt-RP</span><strong>${hasAverage?htmlEscape(formatRankingNumber(rank.average_rating,3)):'Ej rankad'}</strong></div>
            <div class="seh-player-ranking-breakdown-row"><span>Matcher som räknas</span><strong>${htmlEscape(formatRankingNumber(eligibleGames,0))}</strong></div>
          </div>
          <p class="seh-player-ranking-note">Offensiv utespelarprestation normaliseras efter position och turneringsnivå, så backar jämförs mot backars normala produktion och forwards mot forwards. Total RP = normaliserade spelprestationer + lagmeriter + personliga meriter.</p>
        </div>
      `;

        card.dataset.sehRankingSignature=signature;
        const toggle=card.querySelector('.seh-player-ranking-toggle');
        const breakdown=card.querySelector('.seh-player-ranking-breakdown');
        if(toggle && breakdown){
          toggle.addEventListener('click',()=>{
            const open=toggle.getAttribute('aria-expanded')==='true';
            const nextOpen=!open;
            toggle.setAttribute('aria-expanded',String(nextOpen));
            breakdown.hidden=!nextOpen;
            expandedStore.set(rankingPanelKey,nextOpen);
            toggle.querySelector('span').textContent=nextOpen?'Dölj RP-uträkning':'Visa RP-uträkning';
            toggle.querySelector('b').textContent=nextOpen?'⌃':'⌄';
          });
        }
      }

      const summary=main.querySelector('.seh-player-summary-row');
      if(summary){
        if(card.parentElement!==summary.parentElement || card.nextElementSibling!==summary){
          summary.insertAdjacentElement('beforebegin',card);
        }
      }else{
        const careerHeading=[...main.querySelectorAll('h1,h2,h3,h4')].find(el=>/^(Karriärstatistik|Målvaktsstatistik)$/i.test((el.textContent||'').trim()));
        if(careerHeading && !card.isConnected)careerHeading.insertAdjacentElement('beforebegin',card);
      }

      // Behåll appens kompakta RP-kort ovan, men dölj webbens separata stora RP-panel.
      hideOriginalWebRankingPoints(main);
    });
  }
  function route(){
    const h=location.hash||'#/';
    if(h.startsWith('#/free-agents')) return {tab:'home',title:'Free Agents',kind:'free-agents'};
    if(h.startsWith('#/rekord')||h.startsWith('#/rekordboken')) return {tab:'home',title:'Rekordboken',kind:'records'};
    if(isSec()) return {tab:'sec',title:'SEC',kind:'sec'};
    if(h.startsWith('#/nyheter')) return {tab:'news',title:'Nyheter',kind:h==='#/nyheter'?'news':'article'};
    if(h.startsWith('#/spelare')) return {tab:'players',title:h.split('/').length>2?'Spelarprofil':'Spelare',kind:h.split('/').length>2?'player':'players'};
    if(h.startsWith('#/laghistoria')||h.startsWith('#/lag/')) return {tab:'teams',title:h.startsWith('#/lag/')?'Lag':'Laghistoria',kind:h.startsWith('#/lag/')?'team':'teams'};
    if(h.startsWith('#/turnering/')) return {tab:'competitions',title:'Turnering',kind:'tournament'};
    if(h.startsWith('#/ecl')) return {tab:'competitions',title:'Tävlingar',kind:'ecl'};
    if(h.startsWith('#/sasong/')) return {tab:'competitions',title:h.startsWith('#/sasong/ecl27winter')?'Lagbyggen':/\/ithl/i.test(h)?'ITHL':/\/lgel/i.test(h)?'LGEL':'ECL',kind:'ecl-season'};
    if(h.startsWith('#/shop')) return {tab:'shop',title:'Shop',kind:'shop'};
    return {tab:'home',title:'Hem',kind:'home'};
  }
  function href(tab){
    const map={home:'#/',news:'#/nyheter',players:'#/spelare',shop:'#/shop',ecl:ECL_ROUTE};
    return isSec() && tab!=='more' ? ROOT+map[tab] : map[tab];
  }

  /* V739: stale-while-revalidate-visning för Spelare/Laghistoria. */
  const sehRouteVisualCache=(window.__SEH_ROUTE_VISUAL_CACHE__ instanceof Map)
    ? window.__SEH_ROUTE_VISUAL_CACHE__
    : (window.__SEH_ROUTE_VISUAL_CACHE__=new Map());
  const SEH_ROUTE_VISUAL_STORAGE_PREFIX='seh-route-visual-v740:';

  function sehRouteVisualLoadStored(kind){
    if(!['players','teams'].includes(kind))return null;
    try{
      const raw=sessionStorage.getItem(SEH_ROUTE_VISUAL_STORAGE_PREFIX+kind);
      if(!raw)return null;
      const value=JSON.parse(raw);
      if(!value || typeof value.html!=='string' || value.html.length<300)return null;
      // Session-cache is only a visual bridge. Drop very old snapshots so a
      // tab left open for hours cannot keep stale content indefinitely.
      if(value.ts && Date.now()-Number(value.ts)>30*60*1000){
        sessionStorage.removeItem(SEH_ROUTE_VISUAL_STORAGE_PREFIX+kind);
        return null;
      }
      sehRouteVisualCache.set(kind,value);
      return value;
    }catch(_){return null;}
  }

  function sehRouteVisualStore(kind,value){
    if(!['players','teams'].includes(kind) || !value)return;
    sehRouteVisualCache.set(kind,value);
    try{
      sessionStorage.setItem(SEH_ROUTE_VISUAL_STORAGE_PREFIX+kind,JSON.stringify(value));
    }catch(_){
      // If WebView storage is full, keep the in-document Map cache. Remove the
      // opposite route first and retry once; one snapshot is still enough to
      // eliminate the backwards flash.
      try{
        const other=kind==='players'?'teams':'players';
        sessionStorage.removeItem(SEH_ROUTE_VISUAL_STORAGE_PREFIX+other);
        sessionStorage.setItem(SEH_ROUTE_VISUAL_STORAGE_PREFIX+kind,JSON.stringify(value));
      }catch(__){}
    }
  }

  // Restore visual snapshots after a real WebView document navigation.
  ['players','teams'].forEach(sehRouteVisualLoadStored);

  let sehPendingVisualRoute='';
  let sehPendingVisualUsedCache=false;
  let sehPendingVisualTimer=0;
  let sehLastVisualKind=route().kind;

  function sehTopDirectoryKindFromTarget(target){
    try{
      const u=new URL(String(target||''),location.href);
      const h=String(u.hash||'').replace(/[?].*$/,'');
      if(/^#\/spelare\/?$/i.test(h))return 'players';
      if(/^#\/laghistoria\/?$/i.test(h))return 'teams';
    }catch(_){
      const raw=String(target||'');
      if(/#\/spelare\/?(?:$|[?])/i.test(raw))return 'players';
      if(/#\/laghistoria\/?(?:$|[?])/i.test(raw))return 'teams';
    }
    return '';
  }

  function sehEnsureRouteTransitionStage(){
    let stage=document.getElementById('seh-route-transition-stage');
    if(stage)return stage;
    stage=document.createElement('div');
    stage.id='seh-route-transition-stage';
    stage.setAttribute('aria-hidden','true');
    document.body.appendChild(stage);
    return stage;
  }

  function sehRouteVisualReady(kind){
    const main=window.__SEH_DESKTOP_DEV__?document.querySelector('main'):document.getElementById('seh-native-directory-root');
    if(!main || route().kind!==kind)return false;
    if(kind==='players'){
      return !!main.querySelector('.seh-zero-player-shell,.seh-native-player-directory-frame,.seh-native-player-directory-page,.seh-mobile-player-list');
    }
    if(kind==='teams'){
      return !!main.querySelector('.seh-mobile-team-list,.dev-team-source-list,.seh-team-counts-compact');
    }
    return false;
  }

  function sehCaptureRouteVisual(kind=route().kind){
    if(!['players','teams'].includes(kind))return false;
    if(route().kind!==kind || document.body.classList.contains('seh-loading'))return false;
    if(!sehRouteVisualReady(kind))return false;
    const main=window.__SEH_DESKTOP_DEV__?document.querySelector('main'):document.getElementById('seh-native-directory-root');
    if(!main)return false;
    const clone=main.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    clone.querySelectorAll('script,style').forEach(el=>el.remove());
    clone.querySelectorAll('a,button,input,select,textarea').forEach(el=>{
      el.removeAttribute('href');
      el.removeAttribute('onclick');
      el.setAttribute('tabindex','-1');
      el.setAttribute('aria-hidden','true');
    });
    const html=clone.innerHTML;
    if(html.length<300)return false;
    sehRouteVisualStore(kind,{
      html,
      className:main.className||'',
      scrollY:Math.max(0,Number(window.scrollY)||0),
      ts:Date.now()
    });
    return true;
  }

  function sehApplyProvisionalRouteClass(kind){
    if(!document.body || !['players','teams'].includes(kind))return;
    ['players','teams'].forEach(k=>document.body.classList.remove('seh-route-'+k));
    document.body.classList.add('seh-route-'+kind,'seh-content-mode','seh-top-level');
    document.body.classList.remove('seh-detail-page');
  }

  function sehBeginRouteVisualTransition(target,sourceKindOverride=''){
    const targetKind=sehTopDirectoryKindFromTarget(target);
    const currentKind=sourceKindOverride||route().kind;
    if(!targetKind || targetKind===currentKind)return {active:false,hasCache:false};

    sehCaptureRouteVisual(currentKind);
    const stage=sehEnsureRouteTransitionStage();
    const cached=sehRouteVisualCache.get(targetKind)||sehRouteVisualLoadStored(targetKind);
    sehPendingVisualRoute=targetKind;
    sehPendingVisualUsedCache=!!cached;

    if(cached?.html){
      stage.innerHTML=`<div class="seh-route-cache-scroll"><main class="${htmlEscape(cached.className||'')}">${cached.html}</main></div>`;
      const scroller=stage.firstElementChild;
      const cachedMain=scroller?.querySelector('main');
      if(cachedMain && cached.scrollY>0)cachedMain.style.transform=`translateY(-${Math.min(cached.scrollY,1200)}px)`;
    }else{
      stage.innerHTML='<div class="seh-route-transition-placeholder"><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>';
    }

    sehApplyProvisionalRouteClass(targetKind);
    document.body.classList.add('seh-route-transitioning');
    if(cached)document.body.classList.remove('seh-loading');

    clearTimeout(sehPendingVisualTimer);
    sehPendingVisualTimer=setTimeout(()=>{
      // Släpp aldrig fram föregående route. Om mål-DOM fortfarande är sen,
      // låt den vanliga loadern ta över innan snapshoten tas bort.
      if(!sehPendingVisualRoute)return;
      if(!sehRouteVisualReady(sehPendingVisualRoute))document.body.classList.add('seh-loading');
      document.body.classList.remove('seh-route-transitioning');
      stage.replaceChildren();
      sehPendingVisualRoute='';
      sehPendingVisualUsedCache=false;
    },3200);

    return {active:true,hasCache:!!cached,kind:targetKind};
  }

  function sehFinishRouteVisualTransition(force=false){
    if(!sehPendingVisualRoute)return false;
    const kind=sehPendingVisualRoute;
    if(route().kind!==kind)return false;
    if(!force && !sehRouteVisualReady(kind))return false;

    clearTimeout(sehPendingVisualTimer);
    sehPendingVisualTimer=0;
    const stage=document.getElementById('seh-route-transition-stage');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(sehPendingVisualRoute!==kind)return;
      document.body.classList.remove('seh-route-transitioning');
      stage?.replaceChildren();
      sehPendingVisualRoute='';
      sehPendingVisualUsedCache=false;
      document.body.classList.remove('seh-loading');
      sehCaptureRouteVisual(kind);
    }));
    return true;
  }

  let __sehNativePlayerReturnView=null;

  function sehNativeTeamIdFromTarget(target){
    try{
      const u=new URL(String(target||''),location.href);
      const match=String(u.hash||'').match(/^#\/lag\/(\d+)(?:[/?#]|$)/i);
      if(!match)return 0;
      const allowedHost=
        u.origin===location.origin ||
        /^(?:www\.)?svenskehockey\.se$/i.test(u.hostname) ||
        u.hostname==='stellular-nougat-2db764.netlify.app';
      return allowedHost ? (Number(match[1])||0) : 0;
    }catch(_){
      const match=String(target||'').match(/#\/lag\/(\d+)(?:[/?#]|$)/i);
      return Number(match?.[1])||0;
    }
  }

  function sehStoreNativePlayerReturnView(){
    if(route().kind!=='player')return;
    const root=document.querySelector('body > .seh-player-native-root');
    if(!root || root.dataset.provisional==='1')return;
    __sehNativePlayerReturnView={
      routeKey:location.pathname+location.hash,
      root
    };
    root.remove();
  }

  function sehRestoreNativePlayerReturnView(){
    const saved=__sehNativePlayerReturnView;
    if(!saved || route().kind!=='player')return false;
    if(saved.routeKey!==location.pathname+location.hash)return false;

    const main=document.querySelector('main');
    document.querySelector('.seh-team-native-shell')?.remove();
    if(main){
      main.replaceChildren();
      main.classList.remove('seh-team-native-source-host','seh-team-native-direct-loading');
      main.classList.add('seh-player-native-source-host');
      main.setAttribute('aria-hidden','true');
    }
    document.body.classList.remove('seh-team-native-v689');
    document.body.classList.add('seh-player-profile-active','seh-player-native-v581');
    if(!saved.root.isConnected)document.body.appendChild(saved.root);
    __sehNativePlayerReturnView=null;
    document.body.classList.remove('seh-loading');
    refreshTop();
    refreshBottom();
    return true;
  }

  function sehNativePlayerTargetHash(target){
    try{
      const u=new URL(String(target||''),location.href);
      const h=String(u.hash||'');
      return /^#\/spelare\/[^/?#]+/i.test(h)?h:'';
    }catch(_){
      const match=String(target||'').match(/(#\/spelare\/[^\s]+)/i);
      return match?match[1]:'';
    }
  }

  function sehPrepareNativePlayerSource(){
    if(window.__SEH_DESKTOP_DEV__||route().kind!=='player')return false;
    const main=document.querySelector('main');
    if(!main)return false;
    const data=sehReadFastProfileNav()||sehFastProfileDataFromDirectory();
    if(!data?.name){
      main.replaceChildren();
      main.classList.add('seh-player-native-source-host');
      main.setAttribute('aria-hidden','true');
      const loader=document.createElement('div');
      loader.className='seh-team-native-direct-loader';
      loader.textContent='Laddar spelarprofil…';
      main.appendChild(loader);
      loadZeroPlayerDirectory().then(()=>{
        if(route().kind!=='player')return;
        sehPrepareNativePlayerSource();
        showFastPlayerProfilePreview();
        scheduleAdaptiveContent(0);
      }).catch(()=>{});
      return false;
    }

    if(main.dataset.sehNativePlayerSourceKey===String(data.key||data.name)
      && main.querySelector('.seh-player-native-synthetic-source .player-profile-name'))return true;
    main.replaceChildren();
    main.dataset.sehNativePlayerSourceKey=String(data.key||data.name);
    main.classList.add('seh-player-native-source-host');
    main.setAttribute('aria-hidden','true');

    const source=document.createElement('section');
    source.className='seh-player-native-synthetic-source';
    source.innerHTML=`
      <h1 class="player-profile-name">${htmlEscape(data.name)}</h1>
      ${data.photo?`<img class="seh-player-hero-photo" src="${htmlEscape(data.photo)}" alt="${htmlEscape(data.name)}">`:''}
      <div id="playerCurrentTeam">${data.teamLogo?`<img src="${htmlEscape(data.teamLogo)}" alt="">`:''}<span>${htmlEscape(data.latestTeam||'')}</span></div>
      <div class="seh-player-synthetic-role">${htmlEscape((data.position||'Spelare').replace(/^./,m=>m.toUpperCase()))}</div>
      <div id="playerBio"></div>
      <div class="seh-player-ranking-card" style="display:none">${data.rankNo?`#${htmlEscape(data.rankNo)} i Sverige `:''}${data.rankPoints?`TOTAL RP ${htmlEscape(data.rankPoints)}`:''}</div>`;
    main.appendChild(source);
    return true;
  }

  function sehNavigateNativePlayer(target){
    sehRemoveNativeDirectoryHost();
    const targetHash=sehNativePlayerTargetHash(target);
    if(!targetHash)return false;
    closeOverlays();
    sehCaptureRouteVisual(route().kind);
    document.querySelector('.seh-team-native-shell')?.remove();
    document.body.classList.remove('seh-team-native-v689');
    try{history.pushState({sehNativePlayer:targetHash},'',targetHash);}catch(_){location.hash=targetHash;return true;}
    window.scrollTo({top:0,behavior:'auto'});
    sehPrepareNativePlayerSource();
    showFastPlayerProfilePreview();
    refresh();
    setTimeout(()=>scheduleAdaptiveContent(0),60);
    return true;
  }

  function sehNavigateNativeTeam(teamId){
    sehRemoveNativeDirectoryHost();
    teamId=Number(teamId)||0;
    if(!teamId)return false;

    closeOverlays();
    showLoading();

    const targetHash=`#/lag/${teamId}`;
    if(location.hash===targetHash){
      refresh();
      return true;
    }

    // V720: stay inside the packaged Android document. A full navigation lets
    // the website SPA render its legacy team profile before the native shell.
    // Keeping the route in this document makes the direct Supabase team source
    // the only visible profile implementation.
    sehStoreNativePlayerReturnView();
    try{history.pushState({sehNativeTeamId:teamId},'',targetHash);}
    catch(_){location.hash=targetHash;return true;}

    const main=document.querySelector('main');
    if(main){
      // V741: legacy team page is not kept below the native profile anymore.
      main.replaceChildren();
      main.classList.add('seh-team-native-direct-loading');
      const loader=document.createElement('div');
      loader.className='seh-team-native-direct-loader';
      loader.textContent='Laddar lagprofil…';
      main.appendChild(loader);
    }

    window.scrollTo({top:0,behavior:'auto'});
    refresh();
    setTimeout(()=>scheduleAdaptiveContent(0),80);
    return true;
  }

  function nativeNavigate(target){
    // V741: rebuilt player/team routes are real in-app routes. Never navigate
    // the WebView to their legacy website pages again.
    sehCaptureRouteVisual(route().kind);
    if(!window.__SEH_DESKTOP_DEV__){
      const nativeTeamId=sehNativeTeamIdFromTarget(target);
      if(nativeTeamId){sehNavigateNativeTeam(nativeTeamId);return;}
      const nativePlayerHash=sehNativePlayerTargetHash(target);
      if(nativePlayerHash){sehNavigateNativePlayer(target);return;}
      const targetDirectory=sehTopDirectoryKindFromTarget(target);
      if(targetDirectory){
        closeOverlays();
        const targetHash=targetDirectory==='players'?'#/spelare':'#/laghistoria';
        // V764: the native shell is also injected on /SEC/. A hash-only route
        // from that document stays under /SEC/ and the SEC router wins. Jump
        // back to the production root before opening Spelare/Lag.
        if(/^\/SEC(?:\/|$)/i.test(location.pathname||'')){
          const absoluteDirectory=`${ROOT}${targetHash}`;
          if(window.SehNative && typeof window.SehNative.prepareNavigation==='function'){
            try{ window.SehNative.prepareNavigation(); }catch(_){}
          }
          window.location.href=absoluteDirectory;
          return;
        }
        if(location.hash!==targetHash){
          try{history.pushState({sehNativeDirectory:targetDirectory},'',targetHash);}catch(_){location.hash=targetHash;return;}
        }
        document.querySelector('body > .seh-player-native-root')?.remove();
        document.querySelector('.seh-team-native-shell')?.remove();
        document.body.classList.remove('seh-player-profile-active','seh-player-native-v581','seh-team-native-v689');
        const main=document.querySelector('main');
        if(main){
          main.replaceChildren();
          main.removeAttribute('aria-hidden');
          main.classList.remove('seh-player-native-source-host','seh-team-native-source-host','seh-team-native-direct-loading');
          delete main.dataset.sehNativePlayerDirectory;
          delete main.dataset.sehNativeTeamDirectory;
          delete main.dataset.sehNativePlayerSourceKey;
        }
        // V744: pushState triggar inget hashchange-event. Uppdatera därför header
        // och starta mål-vyn explicit i samma call stack, utan att vänta på en
        // senare adapt-pass. Det förhindrar den tomma Spelare-vyn som syntes
        // efter Spelare & Lag-overlayn på riktig Android WebView.
        refreshTop();
        refreshBottom();
        document.body?.classList.remove('seh-loading','seh-route-transitioning');
        document.getElementById('seh-route-transition-stage')?.replaceChildren();
        const directoryRoot=sehNativeDirectoryHost(targetDirectory);
        if(directoryRoot){
          directoryRoot.scrollTop=0;
          if(targetDirectory==='players'){
            sehEnsureNativePlayerDirectoryScaffold(directoryRoot);
            buildZeroPlayerPage();
          }else{
            sehEnsureDirectTeamDirectory();
          }
        }
        window.scrollTo({top:0,behavior:'auto'});
        refresh();
        return;
      }
    }

    const routeTransition=sehBeginRouteVisualTransition(target);
    closeOverlays();

    const goingToSec = /\/SEC\/?$/i.test(target) || /\/SEC\/#?$/i.test(target);
    if(goingToSec){
      document.body?.classList.add('seh-loading');
      setTimeout(()=>document.body?.classList.remove('seh-loading'),260);
    }else if(!routeTransition.active || !routeTransition.hasCache){
      showLoading();
    }else{
      document.body?.classList.remove('seh-loading');
    }

    const absolute = target.startsWith('http')
      ? target
      : ROOT + (target.startsWith('#') ? target : target.replace(/^\//,''));

    // Force the WebView to navigate instead of relying on the site's own
    // click/router handlers. This also works when coming from player/team views.
    if(location.href === absolute){
      refresh();
      return;
    }

    if(window.SehNative && typeof window.SehNative.prepareNavigation==='function'){
      try{ window.SehNative.prepareNavigation(); }catch(_){}
    }

    window.location.href = absolute;
  }
  function eligibleFavorite(){return ['article','player','team'].includes(route().kind);}

  function sehFavoritePlayerNameFromUrl(url){
    try{
      const u=new URL(String(url||''),location.href);
      const hash=decodeURIComponent(u.hash||'');
      const match=hash.match(/^#\/spelare\/([^/?#]+)/i);
      return match ? match[1].trim() : '';
    }catch(_){
      return '';
    }
  }

  function sehIsGenericFavoriteTitle(value){
    const title=String(value||'').replace(/\s+/g,' ').trim();
    return !title ||
      /^All svensk eHockey\.?\s*En app\.?$/i.test(title) ||
      /^Svensk eHockey$/i.test(title) ||
      /^Spelarprofil$/i.test(title) ||
      /^Lag$/i.test(title);
  }

  function pageTitle(){
    const currentRoute=route();

    /*
     * V697:
     * Do not use the first <h1> globally. In Desktop Dev the hidden source DOM
     * also contains the app-home heading "All svensk eHockey. En app.", which
     * caused every saved player to get that title.
     */
    const selectors=
      currentRoute.kind==='player'
        ? [
            '.seh-player-native-root .seh-player-native-name',
            '.seh-player-native-name',
            '.seh-player-profile-root .player-profile-name',
            '.player-profile-name'
          ]
        : currentRoute.kind==='team'
          ? [
              '.seh-team-native-root .seh-team-native-name',
              '.seh-team-native-name',
              '.team-profile-title'
            ]
          : currentRoute.kind==='article'
            ? [
                '.news-article-title',
                'article h1',
                'main article h1'
              ]
            : [];

    for(const sel of selectors){
      const el=document.querySelector(sel);
      const value=el?.textContent?.replace(/\s+/g,' ').trim()||'';
      if(value && !sehIsGenericFavoriteTitle(value))return value;
    }

    if(currentRoute.kind==='player'){
      const fromUrl=sehFavoritePlayerNameFromUrl(location.href);
      if(fromUrl)return fromUrl;
    }

    const docTitle=document.title
      .replace(/\s*[|–-]\s*Svensk eHockey.*$/i,'')
      .replace(/\s+/g,' ')
      .trim();

    return !sehIsGenericFavoriteTitle(docTitle)
      ? docTitle
      : currentRoute.title;
  }

  function sehCurrentFavoritePlayerImage(){
    if(route().kind!=='player')return '';

    const selectors=[
      '.seh-player-native-root .seh-player-native-portrait > img:not(.seh-player-native-bglogo)',
      '.seh-player-native-portrait > img:not(.seh-player-native-bglogo)',
      '.seh-player-profile-root .history-player-avatar img',
      '.player-profile-portrait img'
    ];

    for(const selector of selectors){
      const img=document.querySelector(selector);
      const raw=String(img?.currentSrc||img?.src||'').trim();
      if(!raw)continue;
      try{
        return zeroProfilePngFromHero(img);
      }catch(_){
        return raw;
      }
    }

    return '';
  }

  function sehFavoritePlayerKeyFromUrl(url){
    try{
      const u=new URL(String(url||''),location.href);
      const params=new URLSearchParams((u.hash.split('?')[1]||''));
      return params.get('pk')||'';
    }catch(_){
      return '';
    }
  }

  function sehFavoriteDirectoryMatch(favorite,rows){
    if(!favorite || favorite.type!=='player' || !Array.isArray(rows))return null;

    const key=sehFavoritePlayerKeyFromUrl(favorite.url);
    const title=String(favorite.title||'').trim().toLocaleLowerCase('sv-SE');
    const slug=sehFavoritePlayerNameFromUrl(favorite.url).toLocaleLowerCase('sv-SE');

    if(key){
      const byKey=rows.find(row=>String(row?.key||'')===key);
      if(byKey)return byKey;
    }

    if(title){
      const byTitle=rows.find(row=>
        String(row?.name||'').trim().toLocaleLowerCase('sv-SE')===title
      );
      if(byTitle)return byTitle;
    }

    if(slug){
      return rows.find(row=>
        String(row?.name||'').trim().toLocaleLowerCase('sv-SE')===slug
      )||null;
    }

    return null;
  }

  let sehFavoriteImageHydrationPromise=null;

  function sehHydrateFavoritePlayerImages(){
    if(sehFavoriteImageHydrationPromise)return sehFavoriteImageHydrationPromise;

    const needs=getFavs().some(f=>f?.type==='player'&&!String(f?.image||'').trim());
    if(!needs)return Promise.resolve(false);

    sehFavoriteImageHydrationPromise=loadZeroPlayerDirectory()
      .then(rows=>{
        const favorites=getFavs();
        let changed=false;

        favorites.forEach(favorite=>{
          if(
            favorite?.type!=='player' ||
            String(favorite?.image||'').trim()
          )return;

          const player=sehFavoriteDirectoryMatch(favorite,rows);
          const photo=String(player?.photo||'').trim();
          if(!photo)return;

          favorite.image=photo;
          changed=true;
        });

        if(changed){
          setFavs(favorites);
          if(document.getElementById('seh-app-favorites')?.classList.contains('show')){
            renderFavorites();
          }
        }

        return changed;
      })
      .catch(error=>{
        console.warn('[Svensk eHockey] Kunde inte ladda favoritbilder',error);
        return false;
      })
      .finally(()=>{
        sehFavoriteImageHydrationPromise=null;
      });

    return sehFavoriteImageHydrationPromise;
  }

  function currentFavorite(){
    const currentRoute=route();
    const favorite={
      url:location.href,
      title:pageTitle(),
      type:currentRoute.kind,
      ts:Date.now()
    };

    if(currentRoute.kind==='player'){
      const image=sehCurrentFavoritePlayerImage();
      if(image)favorite.image=image;
    }

    return favorite;
  }

  function sehNormalizeFavorite(favorite){
    if(!favorite || typeof favorite!=='object')return favorite;

    const next={...favorite};

    /*
     * Repair already-saved Desktop Dev player favorites from before V697.
     * The route slug preserves eSwahn / ICappeI, so the user does not have to
     * delete and re-add the favorites.
     */
    if(
      next.type==='player' &&
      sehIsGenericFavoriteTitle(next.title)
    ){
      const playerName=sehFavoritePlayerNameFromUrl(next.url);
      if(playerName)next.title=playerName;
    }

    return next;
  }

  function getFavs(){
    try{
      const raw=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
      if(!Array.isArray(raw))return[];

      let changed=false;
      const normalized=raw
        .map(item=>{
          const next=sehNormalizeFavorite(item);
          if(
            next &&
            item &&
            String(next.title||'')!==String(item.title||'')
          )changed=true;
          return next;
        })
        .filter(Boolean);

      if(changed){
        localStorage.setItem(FAVORITES_KEY,JSON.stringify(normalized));
      }

      return normalized;
    }catch(_){
      return[];
    }
  }

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
  function getMyProfile(){
    try{
      const value=JSON.parse(localStorage.getItem(MY_PROFILE_KEY)||'null');
      if(!value||typeof value!=='object')return null;
      const key=String(value.key||value.player_key||'').trim();
      const name=String(value.name||value.display_gamertag||'').trim();
      if(!key&&!name)return null;
      return {...value,key,name};
    }catch(_){return null;}
  }
  function setMyProfile(player){
    if(!player){localStorage.removeItem(MY_PROFILE_KEY);refreshMyProfileButton();renderFavorites();return;}
    const value={
      key:String(player.key||player.player_key||'').trim(),
      name:String(player.name||player.display_gamertag||'').trim(),
      photo:sehWebAppPlayerImage(player.photo||player.player_image||'',player.sportsGamerId||player.sports_gamer_player_url||''),
      latestTeam:String(player.currentTeam||player.current_team_name||player.latestTeam||player.latest_team||'').trim(),
      latestSeason:String(player.latestSeason||player.latest_season||'').trim(),
      position:String(player.position||player.primary_position||'').trim(),
      href:String(player.href||'').trim(),
      serverLinked:Boolean(player.serverLinked||player.server_linked),
      savedAt:Date.now()
    };
    localStorage.setItem(MY_PROFILE_KEY,JSON.stringify(value));
    refreshMyProfileButton();
    renderFavorites();
  }
  function myProfileHref(profile){
    if(!profile)return '';
    if(String(profile.href||'').trim())return String(profile.href).trim();
    const key=String(profile.key||'').trim();
    const name=String(profile.name||key).trim();
    const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv-SE').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return key?`${ROOT}#/spelare/${encodeURIComponent(slug||key)}?pk=${encodeURIComponent(key)}`:'';
  }
  function openSavedMyProfile(){
    const profile=getMyProfile();
    if(!profile){openMyProfilePicker();return;}
    const href=myProfileHref(profile);
    if(!href){openMyProfilePicker(true);return;}
    try{sehRememberFastProfileNav({...profile,href},zeroTeamLogoUrl(profile.latestTeam),zeroRankingForName(profile.name));}catch(_){}
    closeMyProfilePicker();
    closeOverlays();
    nativeNavigate(href);
  }
  function refreshMyProfileButton(){
    const button=document.getElementById('seh-my-profile');
    if(!button)return;
    const profile=getMyProfile();
    button.classList.toggle('has-profile',!!profile);
    button.setAttribute('aria-label',profile?`Min profil: ${profile.name}`:'Koppla min spelarprofil');
    if(profile&&String(profile.photo||'').trim()){
      button.innerHTML=`<img src="${htmlEscape(profile.photo)}" alt="">`;
      const img=button.querySelector('img');
      if(img)img.onerror=()=>{button.classList.remove('has-profile');button.innerHTML=icons.user;};
    }else button.innerHTML=icons.user;
  }
  function ensureMyProfilePicker(){
    let modal=document.getElementById('seh-my-profile-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='seh-my-profile-modal';
    modal.innerHTML=`<div class="seh-my-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="seh-my-profile-title"><div class="seh-my-profile-sheet-head"><div><div class="kicker">MIN PROFIL</div><h2 id="seh-my-profile-title">Koppla din spelarprofil</h2><p>Skriv in ditt gamertag och välj rätt svensk spelare. Profilen sparas bara på den här mobilen.</p></div><button class="seh-my-profile-close" type="button" aria-label="Stäng">×</button></div><div class="seh-my-profile-search"><input id="seh-my-profile-input" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Skriv ditt GT"><button id="seh-my-profile-search-btn" type="button">Sök</button></div><div class="seh-my-profile-status" id="seh-my-profile-status"></div><div class="seh-my-profile-results" id="seh-my-profile-results"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.seh-my-profile-close').onclick=closeMyProfilePicker;
    modal.addEventListener('click',event=>{if(event.target===modal)closeMyProfilePicker();});
    const input=modal.querySelector('#seh-my-profile-input');
    const search=()=>searchMyProfile(input?.value||'');
    modal.querySelector('#seh-my-profile-search-btn').onclick=search;
    input?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();search();}});
    return modal;
  }
  function closeMyProfilePicker(){document.getElementById('seh-my-profile-modal')?.classList.remove('show');}
  function openMyProfilePicker(edit=false){
    const modal=ensureMyProfilePicker();
    const current=getMyProfile();
    const title=modal.querySelector('#seh-my-profile-title');
    if(title)title.textContent=current||edit?'Ändra min profil':'Koppla din spelarprofil';
    const input=modal.querySelector('#seh-my-profile-input');
    const results=modal.querySelector('#seh-my-profile-results');
    const status=modal.querySelector('#seh-my-profile-status');
    if(results)results.innerHTML='';
    if(status){status.textContent=current?`Nuvarande profil: ${current.name}`:'';status.classList.remove('error');}
    if(input){input.value=current?.name||'';setTimeout(()=>{input.focus();input.select();},80);}
    modal.classList.add('show');
  }
  function myProfileSearchKey(value){return String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('sv-SE');}
  async function searchMyProfile(value){
    const modal=ensureMyProfilePicker();
    const status=modal.querySelector('#seh-my-profile-status');
    const results=modal.querySelector('#seh-my-profile-results');
    const query=String(value||'').replace(/[\r\n]/g,' ').replace(/[*%]/g,'').trim().slice(0,48);
    if(query.length<2){if(status){status.textContent='Skriv minst två tecken.';status.classList.add('error');}if(results)results.innerHTML='';return;}
    if(status){status.textContent='Söker…';status.classList.remove('error');}
    if(results)results.innerHTML='';
    try{
      let raw=await sehTeamDirectRest('app_player_directory_cache',{
        select:zeroPlayerDirectorySelect(),
        player_country:'eq.SE',
        display_gamertag:`ilike.*${query}*`,
        order:'career_games.desc.nullslast,display_gamertag.asc',
        limit:'18'
      });
      if(window.SEH_currentPlayerStatus?.decorateRows){
        raw=await window.SEH_currentPlayerStatus.decorateRows(raw);
      }
      const q=myProfileSearchKey(query);
      const compactQ=q.replace(/[^a-z0-9åäö]/gi,'');
      const players=zeroNormalizeDirectoryBatch(raw).sort((a,b)=>{
        const ak=myProfileSearchKey(a.name),bk=myProfileSearchKey(b.name);
        const ac=ak.replace(/[^a-z0-9åäö]/gi,''),bc=bk.replace(/[^a-z0-9åäö]/gi,'');
        const score=(k,c)=>k===q?0:c===compactQ?1:k.startsWith(q)?2:k.includes(q)?3:4;
        return score(ak,ac)-score(bk,bc)||b.games-a.games||a.name.localeCompare(b.name,'sv-SE');
      }).slice(0,10);
      if(!players.length){if(status)status.textContent='Ingen svensk spelare hittades. Kontrollera GT och försök igen.';return;}
      if(status)status.textContent=`${players.length} träff${players.length===1?'':'ar'} – välj rätt profil.`;
      results.innerHTML=players.map((player,index)=>`<button class="seh-my-profile-result" type="button" data-profile-result="${index}"><img src="${htmlEscape(player.photo||ZERO_PLAYER_PNG_FALLBACK)}" alt=""><span><strong>${htmlEscape(player.name)}</strong><span>${htmlEscape([player.latestTeam,player.latestSeason].filter(Boolean).join(' · ')||player.position||'Svensk spelare')}</span></span><b>Välj</b></button>`).join('');
      results.querySelectorAll('[data-profile-result]').forEach(button=>{
        const player=players[Number(button.dataset.profileResult)];
        const img=button.querySelector('img');if(img)applyZeroPlayerPngFallback(img);
        button.onclick=()=>{setMyProfile(player);openSavedMyProfile();};
      });
    }catch(error){
      console.warn('[Svensk eHockey] Min profil-sökning misslyckades',error);
      if(status){status.textContent='Kunde inte söka just nu. Kontrollera anslutningen och försök igen.';status.classList.add('error');}
    }
  }
  function myProfileFavoriteCardHtml(){
    const profile=getMyProfile();
    if(!profile)return `<div class="seh-my-profile-favorite-card"><span class="placeholder">${icons.user}</span><div><small>MIN PROFIL</small><strong>Koppla din spelarprofil</strong><span>Logga in med Discord och koppla ditt befintliga spelarkort.</span></div><div class="seh-my-profile-favorite-actions"><button class="primary" type="button" data-my-profile-account>Koppla</button></div></div>`;
    const photo=String(profile.photo||ZERO_PLAYER_PNG_FALLBACK).trim();
    const linked=profile.serverLinked===true;
    return `<div class="seh-my-profile-favorite-card"><img src="${htmlEscape(photo)}" alt="${htmlEscape(profile.name)}"><div><small>${linked?'KOPPLAD SPELARPROFIL':'MIN PROFIL'}</small><strong>${htmlEscape(profile.name)}</strong><span>${htmlEscape([profile.latestTeam,profile.latestSeason].filter(Boolean).join(' · ')||'Svensk spelare')}</span></div><div class="seh-my-profile-favorite-actions"><button class="primary" type="button" data-my-profile-open>Öppna</button><button type="button" ${linked?'data-my-profile-account':'data-my-profile-pick'}>${linked?'Min profil':'Ändra'}</button></div></div>`;
  }
  function sehEnsureSyncUiStyle(){
    if(document.getElementById('seh-webapp-sync-ui'))return;
    const style=document.createElement('style');
    style.id='seh-webapp-sync-ui';
    style.textContent=`
      #seh-native-top #seh-global-search-btn{color:#67ddd8}
      .seh-zero-player-card.is-free-agent .seh-zero-player-teamrow{border-color:rgba(255,208,0,.38)!important;background:rgba(255,208,0,.055)!important}
      .seh-zero-player-card.is-free-agent .seh-zero-player-teamlogo{border-color:#ffd000!important;background:#ffd000!important;color:#07111f!important}
      .seh-zero-player-card.is-free-agent .seh-zero-player-teamcopy strong{color:#ffd000!important}
      .seh-zero-player-card.is-no-team .seh-zero-player-teamrow{border-color:rgba(255,255,255,.10)!important;background:rgba(255,255,255,.025)!important}
      .seh-zero-player-card.is-no-team .seh-zero-player-teamlogo{border-color:rgba(255,255,255,.12)!important;background:rgba(255,255,255,.035)!important;color:#8d98a2!important}
      .seh-zero-player-card.is-no-team .seh-zero-player-teamcopy strong{color:#929ca6!important}
      .seh-zero-player-teamrow.is-team{cursor:pointer}
      .seh-zero-player-teamrow.is-team:hover .seh-zero-player-teamcopy strong,
      .seh-zero-player-teamrow.is-team:focus-visible .seh-zero-player-teamcopy strong{color:#62d4cf!important;text-decoration:underline}
      .seh-zero-player-teamrow.is-team:focus-visible{outline:1px solid rgba(98,212,207,.5);outline-offset:2px}

      .seh-v760-fa-extra{display:grid;gap:9px;margin:10px 0 14px;padding:11px;border:1px solid #ffffff14;border-radius:13px;background:#ffffff05}
      .seh-v760-fa-extra label{display:flex;align-items:flex-start;gap:9px;color:#eef1f2;font-size:11px;font-weight:850;line-height:1.3}
      .seh-v760-fa-extra input[type="checkbox"]{width:18px;height:18px;flex:0 0 18px;margin:0;accent-color:#ffd000}
      .seh-v760-fa-extra small{display:block;margin-top:3px;color:#83909b;font-size:8.5px;font-weight:650}
      .seh-v760-fa-extra select{width:100%;min-height:42px;border:1px solid #ffffff18;border-radius:10px;background:#070b12;color:#f4f1e9;padding:0 10px;font-size:11px;font-weight:800}
      .seh-v760-fa-extra-status{margin:0;color:#8995a0;font-size:9px}
      .seh-v760-fa-section-title{margin:16px 2px 8px;color:#62d4cf;font-size:9px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}
      .seh-fa-card.is-no-team{border-color:#71808d66;background:linear-gradient(115deg,#111a22,#070b10 70%)}
      .seh-fa-card.is-no-team .seh-fa-portrait{background:linear-gradient(#1a2833,#0a1118)}
      .seh-fa-card.is-no-team .seh-fa-portrait>span{border-left-color:#8997a4;color:#b6c0c8}
      .seh-fa-card.is-no-team .seh-fa-topline{color:#b0bbc4}
      .seh-fa-card.is-no-team .seh-fa-rank{border-color:#8796a34f}
      .seh-fa-card.is-no-team .seh-fa-tags b{border-color:#8796a34f;color:#b0bbc4}
      .seh-fa-card.is-no-team .seh-fa-open{color:#b9c4cc}
      .seh-fa-status-note{padding:7px;border:1px solid #ffffff14;border-radius:8px;color:#9ba6af;font-size:9px;font-weight:800}
      /* Rekordbok + Lagbygge: same native-like visual language as the rest of the webapp */
      body.seh-route-records .seh-recordbook-shell{
        width:100%!important;
        max-width:760px!important;
        margin:0 auto!important;
        padding:14px 12px 30px!important;
        box-sizing:border-box!important;
      }
      body.seh-route-records .seh-recordbook-hero{
        display:block!important;
        margin:0 0 12px!important;
        padding:17px!important;
        border:1px solid rgba(255,255,255,.10)!important;
        border-radius:18px!important;
        background:linear-gradient(145deg,#0b101c,#060811)!important;
      }
      body.seh-route-records .seh-recordbook-hero>div{
        padding:0!important;
      }
      body.seh-route-records .seh-recordbook-hero>aside{
        display:none!important;
      }
      body.seh-route-records .seh-recordbook-hero h1{
        margin:4px 0 8px!important;
        font-family:Inter,Arial,sans-serif!important;
        font-size:30px!important;
        line-height:1.02!important;
        letter-spacing:-.035em!important;
      }
      body.seh-route-records .seh-recordbook-hero .directory-kicker{
        margin:0 0 6px!important;
        color:#62d4cf!important;
        font:900 10px/1 Inter,Arial,sans-serif!important;
        letter-spacing:.09em!important;
      }
      body.seh-route-records .seh-recordbook-hero>div>p:last-child{
        margin:0!important;
        color:#9aa3ae!important;
        font-size:12px!important;
        line-height:1.45!important;
      }
      body.seh-route-records .seh-recordbook-panel{
        margin:0!important;
        padding:0!important;
        border:1px solid rgba(255,255,255,.09)!important;
        border-radius:18px!important;
        background:#070b13!important;
        overflow:hidden!important;
      }
      body.seh-route-records .seh-recordbook-dock{
        padding:12px!important;
        border-top:0!important;
        border-bottom:1px solid rgba(255,255,255,.08)!important;
      }
      body.seh-route-records .seh-recordbook-dock::before{display:none!important}
      body.seh-route-records .seh-recordbook-switch,
      body.seh-route-records .seh-recordbook-metrics{
        border-radius:11px!important;
        background:#030711!important;
      }
      body.seh-route-records .seh-recordbook-switch button,
      body.seh-route-records .seh-recordbook-filters button,
      body.seh-route-records .seh-recordbook-metrics button{
        border-radius:9px!important;
      }
      body.seh-route-records .seh-recordbook-group-tabs button{
        border-radius:0!important;
      }
      body.seh-route-records .seh-recordbook-status{
        min-height:0!important;
        padding:11px 12px 8px!important;
        border-bottom:0!important;
      }
      body.seh-route-records .seh-record-podium{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:8px!important;
        margin:0!important;
        padding:0 10px 10px!important;
        border:0!important;
      }
      body.seh-route-records .seh-record-podium-card,
      body.seh-route-records .seh-record-podium-card.is-team{
        border:1px solid rgba(255,255,255,.09)!important;
        border-radius:15px!important;
        background:linear-gradient(145deg,#0b101c,#060811)!important;
      }
      body.seh-route-records .seh-record-podium-stats>span,
      body.seh-route-records .seh-record-avatar,
      body.seh-route-records .seh-record-rank{
        border-radius:10px!important;
      }
      body.seh-route-records .seh-record-list{
        gap:7px!important;
        padding:0 10px 10px!important;
        border:0!important;
      }
      body.seh-route-records .seh-record-row,
      body.seh-route-records .seh-record-row.is-leader{
        min-height:62px!important;
        border:1px solid rgba(255,255,255,.08)!important;
        border-radius:14px!important;
        background:#080d15!important;
      }
      body.seh-route-records .seh-record-row.is-leader{
        border-color:rgba(255,208,0,.25)!important;
        background:linear-gradient(90deg,rgba(255,208,0,.07),#080d15 45%)!important;
      }
      body.seh-route-records .seh-recordbook-note{
        margin:4px 12px 14px!important;
        padding-top:11px!important;
      }

      body.seh-winter-compact .season-shell-v12840{
        width:100%!important;
        max-width:760px!important;
        margin:0 auto!important;
        padding:12px!important;
        box-sizing:border-box!important;
      }
      body.seh-winter-compact .season-hero-v12840,
      body.seh-winter-compact .season-subnav-v12840,
      body.seh-winter-compact .season-overview-v12840{
        display:none!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2{
        margin:0!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-hero{
        display:block!important;
        margin:0 0 12px!important;
        padding:17px!important;
        border:1px solid rgba(255,255,255,.10)!important;
        border-radius:18px!important;
        background:linear-gradient(145deg,#0b101c,#060811)!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-hero>div:first-child{
        padding:0!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-hero h2{
        margin:4px 0 8px!important;
        font-family:Inter,Arial,sans-serif!important;
        font-size:29px!important;
        line-height:1.04!important;
        letter-spacing:-.035em!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-hero>div>p:last-of-type{
        margin:0!important;
        color:#9aa3ae!important;
        font-size:12px!important;
        line-height:1.45!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-stamp{
        margin-top:12px!important;
        min-height:0!important;
        padding:12px!important;
        border:1px solid rgba(255,208,0,.22)!important;
        border-radius:13px!important;
        color:#f4f1e9!important;
        background:rgba(255,208,0,.045)!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-stamp span,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-stamp strong,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-stamp small{
        color:inherit!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-stamp strong{
        margin:5px 0!important;
        font-family:Inter,Arial,sans-serif!important;
        font-size:16px!important;
        letter-spacing:0!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-overview{
        gap:8px!important;
        margin:0 0 12px!important;
        border:0!important;
        background:transparent!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-overview>div{
        min-height:82px!important;
        padding:12px!important;
        border:1px solid rgba(255,255,255,.09)!important;
        border-radius:14px!important;
        background:#080d15!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-panel{
        margin-top:12px!important;
        border:1px solid rgba(255,255,255,.09)!important;
        border-radius:18px!important;
        background:#070b13!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-head{
        padding:14px!important;
        border-bottom:1px solid rgba(255,255,255,.08)!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-head h3{
        font-family:Inter,Arial,sans-serif!important;
        font-size:19px!important;
        letter-spacing:-.02em!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-toolbar{
        padding:11px!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-toolbar input,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-toolbar select{
        border-radius:11px!important;
        background:#030711!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-grid{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:9px!important;
        padding:10px!important;
        border:0!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-card{
        padding:15px!important;
        border:1px solid rgba(255,255,255,.09)!important;
        border-radius:16px!important;
        background:linear-gradient(145deg,#0b101c,#060811)!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-logo,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-badges span,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-badges b,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-metrics>div,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-roster-player,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-recruit,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-detail-panel,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-detail-logo,
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-detail-metrics>div{
        border-radius:11px!important;
      }
      body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-method{
        margin-top:12px!important;
        border-radius:14px!important;
        background:#080d15!important;
      }

    `;
    document.head.appendChild(style);
  }

  function ensureTop(){
    sehEnsureSyncUiStyle();
    let top=document.getElementById('seh-native-top');if(top)return;
    const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></svg>';
    top=document.createElement('div');top.id='seh-native-top';top.innerHTML=`<button class="navbtn" id="seh-back" aria-label="Tillbaka">${icons.back}</button><a class="logo" href="${ROOT}#/" aria-label="Hem"><img src="${ROOT}assets/SeHlogga.png" alt=""></a><div class="title"><small>SVENSK eHOCKEY</small><span id="seh-native-title">Hem</span></div><div class="action-row"><button class="navbtn" id="seh-global-search-btn" aria-label="Sök">${searchIcon}</button><button class="navbtn" id="seh-fav" aria-label="Favorit">${icons.heart}</button><button class="navbtn" id="seh-share" aria-label="Dela">${icons.share}</button><button class="navbtn" id="seh-my-profile" aria-label="Min profil">${icons.user}</button></div>`;
    document.body.appendChild(top);
    top.querySelector('#seh-back').onclick=()=>{if(document.getElementById('seh-app-directory')?.classList.contains('show')||document.getElementById('seh-app-competitions')?.classList.contains('show')||document.getElementById('seh-app-more')?.classList.contains('show')||document.getElementById('seh-app-favorites')?.classList.contains('show')){closeOverlays();return;}history.back();};
    top.querySelector('#seh-global-search-btn').onclick=()=>{
      if(typeof window.SEH_openGlobalSearch==='function')window.SEH_openGlobalSearch();
      else document.querySelector('[data-seh-global-search-trigger]')?.click();
    };
    top.querySelector('#seh-fav').onclick=toggleFav;top.querySelector('#seh-share').onclick=shareCurrent;top.querySelector('#seh-my-profile').onclick=()=>{sehV760OpenAccount();};refreshMyProfileButton();
  }
  function ensureBottom(){
    let nav=document.getElementById('seh-native-bottom');if(nav)return;
    nav=document.createElement('nav');
    nav.id='seh-native-bottom';
    nav.innerHTML=`<button data-tab="home" id="seh-home-btn">${icons.home}<span>Hem</span></button><button data-tab="players" id="seh-players-btn">${icons.players}<span>Spelare</span></button><button data-tab="teams" id="seh-teams-btn">${icons.teams}<span>Lag</span></button><button data-tab="competitions" id="seh-competitions-btn">${icons.ecl}<span>Tävlingar</span></button><button data-tab="sec" id="seh-sec-btn">${icons.sec}<span>SEC</span></button>`;
    document.body.appendChild(nav);

    nav.querySelector('#seh-home-btn').onclick=()=>openHome();
    nav.querySelector('#seh-players-btn').onclick=()=>nativeNavigate('#/spelare');
    nav.querySelector('#seh-teams-btn').onclick=()=>nativeNavigate('#/laghistoria');
    nav.querySelector('#seh-competitions-btn').onclick=()=>openCompetitions();
    nav.querySelector('#seh-sec-btn').onclick=()=>nativeNavigate(SEC_ROOT);

  }
  function ensureCompetitions(){
    let page=document.getElementById('seh-app-competitions');if(page)return;
    page=document.createElement('section');page.id='seh-app-competitions';
    page.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">SVENSK eHOCKEY</div><h1>Tävlingar</h1><p class="lead">Tävlingar och ligor som Svensk eHockey bevakar.</p><div class="seh-card-grid"><a class="seh-card wide gold" href="${ROOT}${ECL_ROUTE}" data-load><div><div class="ico">${icons.ecl}</div><strong>ECL</strong><span>Säsonger, matcher, svenska lag och spelarstatistik.</span></div></a><a class="seh-card wide" href="${ROOT}${ECL_ROUTE}" data-load id="seh-competitions-ecl27"><div><div class="ico">${icons.teams}</div><strong>Svenska lagbyggen</strong><span>Aktuella trupper, IN/UT, Free Agents och rekrytering.</span></div></a></div></div>`;
    document.body.appendChild(page);
    page.querySelector('.seh-card-grid').prepend(page.querySelector('#seh-competitions-ecl27'));
    for(const [title,id,description] of [['ITHL','ithl12','Säsong 12 · svenska lag och spelarstatistik'],['LGEL','lgel1','Säsong 1 · svenska lag och spelarstatistik']]){
      const link=document.createElement('a');link.className='seh-card wide';link.href=`${ROOT}#/sasong/${id}`;link.setAttribute('data-load','');link.innerHTML=`<div><strong>${title}</strong><span>${description}</span></div>`;page.querySelector('.seh-card-grid')?.append(link);
    }
    page.querySelectorAll('[data-load]').forEach(link=>link.onclick=()=>{closeOverlays();showLoading();});
  }
  function openCompetitions(){
    // V765: Spelare/Lag renderas i en egen native directory-root med högre
    // z-index än app-overlays. Ta bort den innan Tävlingar öppnas så att den
    // aldrig kan ligga kvar ovanpå tävlingssidan.
    sehRemoveNativeDirectoryHost();
    document.querySelector('.seh-team-native-shell')?.remove();
    document.body.classList.remove('seh-team-native-v689','seh-player-profile-active','seh-player-native-v581');
    ensureCompetitions();closeOverlays();document.getElementById('seh-app-home')?.classList.remove('show');document.getElementById('seh-app-competitions').classList.add('show');refreshTop();refreshBottom();
  }
  // Retained as compatibility entry points; Hem is now the sole hub.
  function ensureMore(){document.getElementById('seh-app-more')?.remove();}
  function openMore(){openHome();}

  function ensureHome(){
    let home=document.getElementById('seh-app-home');if(home)return;
    home=document.createElement('section');home.id='seh-app-home';home.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">SVENSK eHOCKEY / APP</div><h1>All svensk eHockey.<br>En app.</h1><p class="lead">Snabbvägar till det viktigaste på Svensk eHockey – nyheter, spelare, lag, SEC, ECL och shoppen.</p><div class="seh-card-grid"><a class="seh-card gold" href="${ROOT}#/nyheter" data-load><div><div class="ico">${icons.news}</div><strong>Senaste nytt</strong><span>Artiklar, uppdateringar och det senaste från svensk eHockey.</span></div></a><a class="seh-card" href="${ROOT}#/spelare" data-load><div><div class="ico">${icons.players}</div><strong>Spelare</strong><span>Sök profiler, historik och statistik.</span></div></a><a class="seh-card" href="${ROOT}#/laghistoria" data-load><div><div class="ico">${icons.teams}</div><strong>Svenska lag</strong><span>Klubbar, historik och tidigare spelartrupper.</span></div></a><a class="seh-card" href="${ROOT}#/rekord" data-load><div><div class="ico">${icons.star}</div><strong>Rekordboken</strong><span>All-time-rekord för svenska spelare och lag.</span></div></a><a class="seh-card gold" href="${SEC_ROOT}" data-load><div><div class="ico">${icons.sec}</div><strong>SEC</strong><span>Svenska eHockey Cupen – turneringar och statistik.</span></div></a><a class="seh-card" href="${ROOT}#/shop" data-load><div><div class="ico">${icons.shop}</div><strong>Shop</strong><span>Svensk eHockey-design och personliga lagprodukter.</span></div></a><a class="seh-card gold" id="seh-ecl-card" href="${ROOT}${ECL_ROUTE}" data-load><div><div class="ico">${icons.ecl}</div><strong>Tävlingar</strong><span>Säsongsarkiv med matcher, lag, byten och svensk spelarstatistik.</span></div></a></div><div class="seh-section-title"><h2>Din app</h2><small id="seh-fav-count"></small></div><div class="seh-list seh-home-app-grid"><button class="seh-list-item" id="seh-home-favs"><span class="bullet">${icons.heart}</span><span><strong>Favoriter</strong><span>Spelare, lag och artiklar du sparat.</span></span></button><div class="seh-list-item seh-home-notify-card"><span class="bullet">${icons.bell}</span><span><strong>Pushnotiser</strong><span>Nyheter och SEC.</span></span><button class="seh-switch" id="seh-notify-toggle" aria-label="Pushnotiser"></button></div><div class="seh-list-item seh-home-app-wide seh-home-about-card"><span class="bullet">i</span><span><strong>Om Svensk eHockey</strong><span>Statistik och information om svenska spelare, lag och eHockey.</span></span></div></div><p class="seh-note">Favoriter sparas lokalt på den här mobilen. Ingen inloggning krävs.</p></div>`;
    home.querySelector('.seh-card-grid').insertAdjacentHTML('beforeend',`<a class="seh-card gold" href="${ROOT}#/sasong/ecl27winter" data-load><div><div class="ico">${icons.teams}</div><strong>Lagbygge</strong><span>Aktuella svenska lagbyggen, trupper, IN/UT och vilka lag som söker spelare.</span></div></a><button type="button" class="seh-card" id="seh-home-fa" style="text-align:left;font:inherit"><div><div class="ico">${icons.players}</div><strong>Free Agents</strong><span>Söker ditt lag spelare? Se vilka som är tillgängliga och hitta förstärkningar.</span></div></button>`);
    home.querySelector('.seh-home-app-grid').insertAdjacentHTML('afterbegin',`<button type="button" class="seh-list-item" id="seh-home-profile"><span class="bullet">${icons.user}</span><span><strong>Min profil</strong><span>Din spelarkoppling och dina uppgifter.</span></span></button>`);
    home.querySelector('.seh-home-app-grid').insertAdjacentHTML('beforeend',`<button type="button" class="seh-list-item seh-home-app-wide" id="seh-home-privacy"><span class="bullet">i</span><span><strong>Integritet & konto</strong><span>Dina uppgifter, spelarbild och appkonto.</span></span></button>`);
    home.querySelector('#seh-home-profile').onclick=()=>{closeOverlays();sehV760OpenAccount();};
    home.querySelector('#seh-home-fa').onclick=()=>{closeOverlays();sehV760OpenFreeAgents();};
    home.querySelector('#seh-home-privacy').onclick=()=>{closeOverlays();sehV760OpenPrivacy();};
    const notifyStatus=home.querySelector('.seh-home-notify-card>span:nth-child(2)>span');
    if(notifyStatus){notifyStatus.id='seh-notify-status';notifyStatus.removeAttribute('data-tone');}
    const notifyToggle=home.querySelector('#seh-notify-toggle');
    if(notifyToggle){notifyToggle.type='button';notifyToggle.setAttribute('role','switch');notifyToggle.setAttribute('aria-checked','false');}
    home.querySelector('.seh-home-notify-card')?.insertAdjacentHTML('afterend',`<div class="seh-push-topics" id="seh-push-topics" hidden><button class="seh-push-topic" type="button" data-seh-push-topic="important"><span><strong>Viktiga meddelanden</strong><small>Driftproblem och nödvändiga appuppdateringar.</small></span><i class="seh-switch"></i></button><button class="seh-push-topic" type="button" data-seh-push-topic="news"><span><strong>Nyheter</strong><small>Större nyheter från Svensk eHockey.</small></span><i class="seh-switch"></i></button><button class="seh-push-topic" type="button" data-seh-push-topic="sec"><span><strong>SEC</strong><small>Anmälan, schema, slutspel och slutresultat.</small></span><i class="seh-switch"></i></button><button class="seh-push-topic" type="button" data-seh-push-topic="ecl"><span><strong>ECL & lagbyggen</strong><small>Säsonger, slutspel och större truppnyheter.</small></span><i class="seh-switch"></i></button></div>`);
    home.querySelectorAll('[data-seh-push-topic]').forEach(button=>button.addEventListener('click',sehTogglePushTopic));
    document.body.appendChild(home);home.querySelectorAll('[data-load]').forEach(a=>a.onclick=()=>showLoading());home.querySelector('#seh-home-favs').onclick=openFavorites;home.querySelector('#seh-notify-toggle').onclick=sehTogglePushNotifications;renderNotifyToggle();
  }
  function ensureDirectory(){
    let dir=document.getElementById('seh-app-directory');if(dir)return;
    dir=document.createElement('section');dir.id='seh-app-directory';
    dir.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">SVENSK eHOCKEY</div><h1>Spelare & Lag</h1><p class="lead">Välj vad du vill utforska.</p><div class="seh-card-grid"><a class="seh-card wide" href="${ROOT}#/spelare" data-load data-native-directory-target="players"><div><div class="ico">${icons.players}</div><strong>Spelare</strong><span>Sök profiler, historik och statistik.</span></div></a><a class="seh-card wide gold" href="${ROOT}#/laghistoria" data-load data-native-directory-target="teams"><div><div class="ico">${icons.teams}</div><strong>Lag</strong><span>Svenska lag, klubbhistorik och tidigare spelartrupper.</span></div></a></div></div>`;
    document.body.appendChild(dir);
    dir.querySelectorAll('[data-load]').forEach(a=>{
      a.onclick=e=>{
        e.preventDefault();
        const target=a.href;
        closeOverlays();
        nativeNavigate(target);
      };
    });
  }
  function openDirectory(){
    ensureDirectory();
    document.getElementById('seh-app-competitions')?.classList.remove('show');
    document.getElementById('seh-app-more')?.classList.remove('show');
    document.getElementById('seh-app-favorites')?.classList.remove('show');
    document.getElementById('seh-app-directory').classList.add('show');
    document.body?.classList.toggle('seh-sec-app-overlay-open',isSec()&&!isSecCup());
    refreshTop();
    refreshBottom();
  }
  // V757: Hem is the fifth bottom tab. On the main domain, switching to Hem is
  // app-owned and instant; the underlying route stays mounted so Back can restore it.
  function openHome(){
    if(isSec() || location.pathname!=='/'){
      nativeNavigate(ROOT+'#/');
      return;
    }
    document.getElementById('seh-app-directory')?.classList.remove('show');
    document.getElementById('seh-app-competitions')?.classList.remove('show');
    document.getElementById('seh-app-more')?.classList.remove('show');
    document.getElementById('seh-app-favorites')?.classList.remove('show');
    document.body?.classList.remove('seh-sec-app-overlay-open','seh-loading','seh-route-transitioning');
    document.getElementById('seh-route-transition-stage')?.replaceChildren();
    if(location.hash!=='#/'){
      try{history.pushState({sehAppHome:true},'', '#/');}
      catch(_){location.hash='#/';return;}
    }
    refresh();
    const home=document.getElementById('seh-app-home');
    if(home){home.classList.add('show');home.scrollTop=0;}
    renderNotifyToggle();
    refreshTop();
    refreshBottom();
  }

  function ensureFavorites(){let f=document.getElementById('seh-app-favorites');if(f)return;f=document.createElement('section');f.id='seh-app-favorites';f.innerHTML=`<div class="seh-app-page"><div class="seh-kicker">DIN APP</div><h1>Favoriter</h1><p class="lead">Sparade spelare, lag och artiklar på den här mobilen.</p><div id="seh-favorites-list"></div></div>`;document.body.appendChild(f);}
  function ensureLoader(){if(document.getElementById('seh-native-loader'))return;const x=document.createElement('div');x.id='seh-native-loader';x.innerHTML='<div class="sk short"></div><div class="sk hero"></div><div class="sk row"></div><div class="sk row"></div><div class="sk row short"></div>';document.body.appendChild(x);}
  function ensurePull(){if(document.getElementById('seh-pull-indicator'))return;const x=document.createElement('div');x.id='seh-pull-indicator';x.textContent='Dra längre för att uppdatera';document.body.appendChild(x);}
  function ensureOffline(){if(document.getElementById('seh-offline-banner'))return;const x=document.createElement('div');x.id='seh-offline-banner';x.textContent='Ingen internetanslutning';document.body.appendChild(x);updateOnline();}
  function showLoading(){document.body.classList.add('seh-loading');setTimeout(()=>{if(route().kind!=='player')document.body.classList.remove('seh-loading');},900);}
  function closeOverlays(){
    document.getElementById('seh-app-directory')?.classList.remove('show');
    document.getElementById('seh-app-competitions')?.classList.remove('show');
    document.getElementById('seh-app-more')?.classList.remove('show');
    document.getElementById('seh-app-favorites')?.classList.remove('show');
    document.body?.classList.remove('seh-sec-app-overlay-open');
    refreshTop();
    refreshBottom();
  }
  function openFavorites(){
    ensureFavorites();
    document.getElementById('seh-app-directory')?.classList.remove('show');
    document.getElementById('seh-app-competitions')?.classList.remove('show');
    document.getElementById('seh-app-more')?.classList.remove('show');
    document.getElementById('seh-app-favorites').classList.add('show');
    document.body?.classList.toggle('seh-sec-app-overlay-open',isSec()&&!isSecCup());
    renderFavorites();
    refreshTop();
    refreshBottom();
    sehV760LoadAccount().catch(()=>{});
  }
  function renderFavorites(){
    const host=document.getElementById('seh-favorites-list');if(!host)return;const favs=getFavs();
    const profileCard=myProfileFavoriteCardHtml();
    const favoritesHtml=!favs.length
      ? '<div class="seh-empty">Inga favoriter ännu.<br>Spara en spelare, ett lag eller en artikel med hjärtat uppe i appheadern.</div>'
      : '<div class="seh-list">'+favs.map((f,i)=>{
          const playerImage=
            f.type==='player' && String(f.image||'').trim()
              ? `<span class="bullet seh-favorite-player-photo"><img src="${htmlEscape(sehWebAppPlayerImage(String(f.image)))}" alt="${htmlEscape(f.title||'Spelare')}"></span>`
              : `<span class="bullet">${f.type==='player'?icons.players:f.type==='team'?icons.teams:icons.news}</span>`;
          return `<div class="seh-list-item" data-fav-row="${i}">${playerImage}<a href="${htmlEscape(f.url)}" style="flex:1;color:inherit;text-decoration:none" data-load><strong>${htmlEscape(f.title)}</strong><span>${f.type==='player'?'Spelare':f.type==='team'?'Lag':'Artikel'}</span></a><button data-remove="${i}" style="border:0;background:transparent;color:#9aa0aa;font-size:20px;padding:8px">×</button></div>`;
        }).join('')+'</div>';
    host.innerHTML=profileCard+favoritesHtml;

    host.querySelector('[data-my-profile-open]')?.addEventListener('click',openSavedMyProfile);
    host.querySelector('[data-my-profile-account]')?.addEventListener('click',()=>{closeOverlays();sehV760OpenAccount();});
    host.querySelector('[data-my-profile-pick]')?.addEventListener('click',()=>openMyProfilePicker(true));
    host.querySelectorAll('.seh-my-profile-favorite-card img,.seh-favorite-player-photo img').forEach(img=>{
      img.onerror=()=>{
        const holder=img.closest('.seh-favorite-player-photo');
        if(holder){holder.classList.remove('seh-favorite-player-photo');holder.innerHTML=icons.players;return;}
        img.src=sehWebAppPlayerImage('');img.onerror=null;
      };
    });
    host.querySelectorAll('[data-remove]').forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.dataset.remove);const a=getFavs();a.splice(i,1);setFavs(a);renderFavorites();updateFavCount();});
    host.querySelectorAll('[data-load]').forEach(a=>a.onclick=()=>{closeOverlays();showLoading();});
    if(favs.some(f=>f?.type==='player'&&!String(f?.image||'').trim()))sehHydrateFavoritePlayerImages();
  }
  function updateFavCount(){const c=getFavs().length;const e=document.getElementById('seh-fav-count');if(e)e.textContent=c?`${c} sparade`:'';}
  let sehPushRegistrationPending=false;
  function sehPushPlugin(){return window.Capacitor?.Plugins?.PushNotifications||null;}
  function sehPushErrorText(error){return String(error?.error||error?.message||error||'Okänt fel').slice(0,180);}
  function sehSetPushStatus(text,tone=''){
    const status=document.getElementById('seh-notify-status');
    if(status){status.textContent=text;status.dataset.tone=tone;}
  }
  function sehPushPreferences(){
    const defaults={important:true,news:true,sec:true,ecl:true};
    try{return {...defaults,...JSON.parse(localStorage.getItem(PUSH_PREFS_KEY)||'{}')};}catch(_){return defaults;}
  }
  function sehApplyPushTopics(preferences=sehPushPreferences()){
    try{window.SehNative?.configurePushTopics?.(JSON.stringify(preferences));}catch(error){console.warn('[Svensk eHockey] Push topics failed',error);}
  }
  function sehRenderPushTopics(wanted){
    const panel=document.getElementById('seh-push-topics');if(panel)panel.hidden=!wanted;
    const preferences=sehPushPreferences();
    document.querySelectorAll('[data-seh-push-topic]').forEach(button=>{
      const enabled=preferences[button.dataset.sehPushTopic]!==false;
      button.setAttribute('aria-pressed',enabled?'true':'false');button.querySelector('.seh-switch')?.classList.toggle('on',enabled);
    });
  }
  function sehTogglePushTopic(event){
    const key=event.currentTarget?.dataset?.sehPushTopic;if(!key)return;
    if(window.__SEH_WEB_APP__)return window.SehWebPush?.topic(key);
    const preferences=sehPushPreferences();preferences[key]=preferences[key]===false;localStorage.setItem(PUSH_PREFS_KEY,JSON.stringify(preferences));
    sehRenderPushTopics(localStorage.getItem(NOTIFY_KEY)==='1');if(localStorage.getItem(NOTIFY_KEY)==='1')sehApplyPushTopics(preferences);
  }
  function renderNotifyToggle(){
    if(window.__SEH_WEB_APP__){
      if(window.SehWebPush){window.SehWebPush.render();return;}
      const button=document.getElementById('seh-notify-toggle');
      if(button){button.disabled=true;button.classList.remove('on');button.setAttribute('aria-checked','false');}
      sehRenderPushTopics(false);
      sehSetPushStatus('Push kunde inte laddas. Öppna webbappen igen.');
      return;
    }
    const button=document.getElementById('seh-notify-toggle');
    const wanted=localStorage.getItem(NOTIFY_KEY)==='1';
    const token=localStorage.getItem(PUSH_TOKEN_KEY)||'';
    const error=localStorage.getItem(PUSH_ERROR_KEY)||'';
    if(button){button.classList.toggle('on',wanted);button.setAttribute('aria-checked',wanted?'true':'false');button.disabled=sehPushRegistrationPending;}
    sehRenderPushTopics(wanted);
    if(error)sehSetPushStatus(error,'error');
    else if(wanted&&token)sehSetPushStatus('Aktiverade på den här mobilen.','success');
    else if(wanted)sehSetPushStatus('Registrerar mobilen hos Firebase…');
    else sehSetPushStatus('Nyheter och SEC.');
  }
  async function sehInstallPushListeners(plugin){
    if(window.__SEH_PUSH_LISTENERS_INSTALLED__||!plugin)return;
    window.__SEH_PUSH_LISTENERS_INSTALLED__=true;
    try{
      await plugin.addListener('registration',token=>{
      const value=String(token?.value||'').trim();
      if(!value)return;
      localStorage.setItem(PUSH_TOKEN_KEY,value);
      localStorage.setItem(NOTIFY_KEY,'1');
      localStorage.removeItem(PUSH_ERROR_KEY);
      window.__SEH_PUSH_TOKEN__=value;
      console.info('[Svensk eHockey] FCM registration ready',value);
      sehApplyPushTopics();
      sehPushRegistrationPending=false;
      renderNotifyToggle();
      });
      await plugin.addListener('registrationError',error=>{
      localStorage.removeItem(PUSH_TOKEN_KEY);
      localStorage.setItem(PUSH_ERROR_KEY,`Push kunde inte aktiveras: ${sehPushErrorText(error)}`);
      sehPushRegistrationPending=false;
      renderNotifyToggle();
      });
      await plugin.addListener('pushNotificationReceived',notification=>{window.__SEH_LAST_PUSH__=notification;});
      await plugin.addListener('pushNotificationActionPerformed',action=>{
      const data=action?.notification?.data||{};
      const target=String(data.url||data.route||data.hash||'').trim();
      if(target)nativeNavigate(target);
      });
    }catch(error){window.__SEH_PUSH_LISTENERS_INSTALLED__=false;throw error;}
  }
  async function sehEnablePushNotifications(){
    const plugin=sehPushPlugin();
    if(!plugin){localStorage.setItem(PUSH_ERROR_KEY,'Push stöds inte i den här appversionen.');renderNotifyToggle();return false;}
    sehPushRegistrationPending=true;localStorage.removeItem(PUSH_ERROR_KEY);renderNotifyToggle();
    try{
      await sehInstallPushListeners(plugin);
      let permission=await plugin.checkPermissions();
      if(permission.receive==='prompt'||permission.receive==='prompt-with-rationale')permission=await plugin.requestPermissions();
      if(permission.receive!=='granted')throw new Error('Notisbehörigheten nekades. Aktivera notiser i Androids appinställningar.');
      await plugin.createChannel?.({id:'seh_updates',name:'Svensk eHockey',description:'Nyheter och SEC',importance:4,visibility:1,vibration:true});
      localStorage.setItem(NOTIFY_KEY,'1');
      await plugin.register();
      renderNotifyToggle();
      return true;
    }catch(error){
      sehPushRegistrationPending=false;localStorage.setItem(NOTIFY_KEY,'0');localStorage.removeItem(PUSH_TOKEN_KEY);
      localStorage.setItem(PUSH_ERROR_KEY,sehPushErrorText(error));renderNotifyToggle();return false;
    }
  }
  async function sehDisablePushNotifications(){
    const plugin=sehPushPlugin();sehPushRegistrationPending=true;renderNotifyToggle();
    sehApplyPushTopics({important:false,news:false,sec:false,ecl:false});
    try{await plugin?.unregister?.();}catch(error){console.warn('[Svensk eHockey] Push unregister failed',error);}
    sehPushRegistrationPending=false;localStorage.setItem(NOTIFY_KEY,'0');localStorage.removeItem(PUSH_TOKEN_KEY);localStorage.removeItem(PUSH_ERROR_KEY);
    delete window.__SEH_PUSH_TOKEN__;renderNotifyToggle();
  }
  function sehTogglePushNotifications(){if(window.__SEH_WEB_APP__)return window.SehWebPush?.toggle();return localStorage.getItem(NOTIFY_KEY)==='1'?sehDisablePushNotifications():sehEnablePushNotifications();}
  async function sehInitializePushNotifications(){
    const plugin=sehPushPlugin();if(!plugin||window.__SEH_PUSH_INITIALIZED__)return;
    window.__SEH_PUSH_INITIALIZED__=true;
    await sehInstallPushListeners(plugin);
    const savedToken=localStorage.getItem(PUSH_TOKEN_KEY)||'';if(savedToken)window.__SEH_PUSH_TOKEN__=savedToken;
    if(localStorage.getItem(NOTIFY_KEY)==='1'){sehApplyPushTopics();sehEnablePushNotifications();}else renderNotifyToggle();
  }
  function isTopLevelRoute(){
    const r=route();
    return ['home','news','players','teams','records','shop','sec','ecl'].includes(r.kind);
  }

  function textNorm(el){
    return (el&&el.textContent?el.textContent:'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function nearestBlock(el){
    if(!el)return null;
    let n=el;
    while(n&&n!==document.body){
      const tag=(n.tagName||'').toLowerCase();
      const r=n.getBoundingClientRect?n.getBoundingClientRect():{height:0};
      if(['section','article','header'].includes(tag) || (r.height>220 && n.children && n.children.length>1)) return n;
      n=n.parentElement;
    }
    return el.parentElement;
  }

  function markCompactByHeading(pattern){
    const heads=[...document.querySelectorAll('h1,h2,h3')];
    const h=heads.find(x=>pattern.test(textNorm(x)));
    if(!h)return;
    const block=nearestBlock(h);
    if(block && !block.closest?.('#seh-native-directory-root') && !block.id?.startsWith('seh-')) block.classList.add('seh-native-compact-hero');
  }

  function markIntroParagraphs(patterns){
    const ps=[...document.querySelectorAll('p')];
    ps.forEach(p=>{
      const t=textNorm(p);
      if(patterns.some(rx=>rx.test(t))){
        const block=nearestBlock(p);
        if(block && !block.closest?.('#seh-native-directory-root') && !block.id?.startsWith('seh-')) block.classList.add('seh-native-compact-intro');
      }
    });
  }

  function nativeHeadConfig(){
    return null;
  }

  function ensureNativeContentHead(){
    const cfg=nativeHeadConfig();
    let head=document.getElementById('seh-native-content-head');
    if(!cfg){
      if(head)head.remove();
      return;
    }
    if(!head){
      head=document.createElement('section');
      head.id='seh-native-content-head';
      head.className='seh-native-content-head';
    }
    head.innerHTML=`<div class="k">${cfg.kicker}</div><h2>${cfg.title}</h2><p>${cfg.text}</p>`;
    const top=document.getElementById('seh-native-top');
    if(top && top.nextSibling!==head) top.insertAdjacentElement('afterend',head);
    else if(!head.isConnected) document.body.prepend(head);
  }

  function applyAggressiveAppContent(){
    const r=route();
    if(!['news','players','teams','shop','sec'].includes(r.kind)) return;

    // Remove/compact the big website-style hero sections based on their actual visible headings/text.
    if(r.kind==='news'){
      markCompactByHeading(/^(nyheter|svensk ehockey.*nyheter)$/i);
      markIntroParagraphs([/artiklar, uppdateringar och notiser/,/svenska ehockeyscenen/]);
    }
    if(r.kind==='players'){
      markCompactByHeading(/svenska spelare|spelare$/i);
      markIntroParagraphs([/här hittar du svenska spelare/,/svenskt spelarregister/,/profiler med historik/,/sorterbart på klubbar/]);
    }
    if(r.kind==='teams'){
      markCompactByHeading(/svenska lag|laghistoria|lag$/i);
      markIntroParagraphs([/svenska lag genom åren/,/klubbhistorik/]);
    }
    if(r.kind==='shop'){
      markCompactByHeading(/^shop$/i);
      markIntroParagraphs([/officiell svensk ehockey-merch/,/utan vinstsyfte/,/lag & personliga produkter/,/kontakt/]);
    }
    if(r.kind==='sec'){
      markCompactByHeading(/svenska ehockey cupen/i);
      markIntroParagraphs([/välkommen till svenska ehockey cupen/,/sidan uppdateras kontinuerligt/]);
    }
  }

  const SEC_MAIN_TABS=['Översikt','Lag','Tabell','Matcher','Slutspel','Statistik'];
  const SEC_MORE_TABS=['Regler','Draften'];

  function normSecText(v){
    return String(v||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('sv-SE');
  }

  function findSecAction(label){
    const wanted=normSecText(label);
    const nodes=[...document.querySelectorAll('a,button,[role="button"]')];
    return nodes.find(el=>{
      if(el.closest('#seh-sec-subnav')||el.closest('#seh-sec-more-menu')) return false;
      return normSecText(el.textContent)===wanted;
    })||null;
  }

  function findSecOriginalNav(){
    const hits=[...SEC_MAIN_TABS,...SEC_MORE_TABS].map(findSecAction).filter(Boolean);
    if(hits.length<4) return null;

    let node=hits[0].parentElement;
    while(node && node!==document.body){
      const count=hits.filter(el=>node.contains(el)).length;
      if(count>=Math.min(6,hits.length)){
        const rect=node.getBoundingClientRect();
        if(rect.height>0 && rect.height<360) return node;
      }
      node=node.parentElement;
    }
    return null;
  }

  function clickSecAction(label){
    const original=findSecAction(label);
    closeSecMore();

    document.querySelectorAll('#seh-sec-subnav [data-sec-tab]').forEach(b=>{
      b.classList.toggle('on',normSecText(b.dataset.secTab)===normSecText(label));
    });

    if(original){
      original.click();
      setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),120);
      return;
    }

    // Fallback for sections that are anchors rather than buttons.
    const wanted=normSecText(label);
    const heading=[...document.querySelectorAll('h1,h2,h3,h4')].find(h=>{
      const t=normSecText(h.textContent);
      return t===wanted || t.startsWith(wanted);
    });
    if(heading) heading.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function closeSecMore(){
    document.getElementById('seh-sec-more-menu')?.classList.remove('show');
  }

  function toggleSecMore(btn){
    const menu=document.getElementById('seh-sec-more-menu');
    if(!menu)return;
    const opening=!menu.classList.contains('show');
    closeSecMore();
    if(!opening)return;

    const r=btn.getBoundingClientRect();
    const w=Math.min(170,window.innerWidth-20);
    menu.style.width=w+'px';
    menu.style.left=Math.min(window.innerWidth-w-10,Math.max(10,r.right-w))+'px';
    menu.style.bottom='auto';
    menu.style.top=(r.bottom+6)+'px';
    menu.style.maxHeight=Math.max(40,window.innerHeight-r.bottom-90)+'px';
    menu.style.overflowY='auto';
    menu.classList.add('show');
  }

  function ensureSecSubnav(){
    let nav=document.getElementById('seh-sec-subnav');
    let menu=document.getElementById('seh-sec-more-menu');
    const inCup=isSecCup();

    document.body?.classList.toggle('seh-sec-cup', inCup);

    if(!inCup){
      if(nav)nav.remove();
      if(menu)menu.remove();

      // If we leave a cup, restore the website's own cup navigation if one had
      // previously been hidden by the app shell.
      document.querySelectorAll('[data-seh-sec-original-nav="1"]').forEach(el=>{
        el.style.removeProperty('display');
        el.removeAttribute('data-seh-sec-original-nav');
      });
      return;
    }

    // Hide the website's large SEC button matrix but keep its controls in the DOM
    // so the app tabs can trigger the site's own navigation logic.
    const originalNav=findSecOriginalNav();
    if(originalNav && originalNav.id!=='seh-sec-subnav'){
      originalNav.setAttribute('data-seh-sec-original-nav','1');
      originalNav.style.setProperty('display','none','important');
    }

    if(!nav){
      nav=document.createElement('nav');
      nav.id='seh-sec-subnav';
      nav.setAttribute('aria-label','SEC navigation');
      nav.innerHTML=
        SEC_MAIN_TABS.map((label,i)=>`<button type="button" data-sec-tab="${label}" class="${i===0?'on':''}">${label}</button>`).join('')+
        `<div class="seh-sec-more-wrap"><button type="button" id="seh-sec-more-btn">Mer</button></div>`+
        `<span class="seh-sec-scroll-hint" aria-hidden="true">›</span>`;

      const top=document.getElementById('seh-native-top');
      if(top) top.insertAdjacentElement('afterend',nav);
      else document.body.prepend(nav);

      nav.querySelectorAll('[data-sec-tab]').forEach(btn=>{
        btn.onclick=()=>clickSecAction(btn.dataset.secTab);
      });
      nav.querySelector('#seh-sec-more-btn').onclick=e=>toggleSecMore(e.currentTarget);

      const updateSecScrollHint=()=>{
        const hint=nav.querySelector('.seh-sec-scroll-hint');
        if(!hint)return;
        const hasMore=nav.scrollWidth > nav.clientWidth + 6;
        const atEnd=nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 8;
        hint.classList.toggle('hide', !hasMore || atEnd);
      };
      nav.addEventListener('scroll',updateSecScrollHint,{passive:true});
      setTimeout(updateSecScrollHint,80);
      setTimeout(updateSecScrollHint,400);
    }

    if(!menu){
      menu=document.createElement('div');
      menu.id='seh-sec-more-menu';
      menu.innerHTML=SEC_MORE_TABS.map(label=>`<button type="button" data-sec-more="${label}">${label}</button>`).join('');
      document.body.appendChild(menu);
      menu.querySelectorAll('[data-sec-more]').forEach(btn=>{
        btn.onclick=()=>clickSecAction(btn.dataset.secMore);
      });
    }
  }


  function commonAncestor(nodes){
    if(!nodes||!nodes.length)return null;
    let a=nodes[0];
    while(a&&a!==document.body){
      if(nodes.every(n=>a.contains(n))) return a;
      a=a.parentElement;
    }
    return null;
  }

  function visible(el){
    if(!el)return false;
    const r=el.getBoundingClientRect();
    const s=getComputedStyle(el);
    return r.width>0 && r.height>0 && s.display!=='none' && s.visibility!=='hidden';
  }

  function adaptTables(){
    document.querySelectorAll('table').forEach(table=>{
      if(table.closest('.seh-mobile-table-wrap'))return;
      const wrap=document.createElement('div');
      wrap.className='seh-mobile-table-wrap';
      table.parentNode?.insertBefore(wrap,table);
      wrap.appendChild(table);
    });
  }


  function adaptEclStatisticsMobile(){
    if(route().kind!=='ecl-season')return;
    const section=document.querySelector('.season-data-section[data-season-section="statistics"]');
    if(!section || section.hidden)return;

    const statTable=section.querySelector('table.season-stat-table');
    if(!statTable)return;

    const headers=[...statTable.querySelectorAll('thead th')];
    if(headers.length<4)return;
    const labels=headers.map(th=>(th.textContent||'').replace(/\s+/g,' ').trim());
    const statCount=Math.max(1,headers.length-3);

    statTable.classList.add('seh-ecl-mobile-table');
    statTable.style.setProperty('--seh-ecl-stat-count',String(statCount));
    statTable.querySelectorAll('tbody tr').forEach(row=>{
      const cells=[...row.children].filter(el=>el.tagName==='TD');
      if(cells.length!==headers.length)return;
      row.style.setProperty('--seh-ecl-stat-count',String(statCount));
      cells.forEach((cell,index)=>{
        if(index>=3)cell.setAttribute('data-seh-ecl-label',labels[index]||'');
      });
    });

    const host=section.querySelector('.season-stat-table-host') || statTable.parentElement;
    if(!host)return;
    let sortbar=host.querySelector(':scope > .seh-ecl-mobile-sortbar');
    if(!sortbar){
      sortbar=document.createElement('div');
      sortbar.className='seh-ecl-mobile-sortbar';
      host.insertBefore(sortbar,host.firstChild);
    }
    const sortSignature=headers.slice(3).map(th=>{
      const button=th.querySelector('button[data-season-stat-sort]');
      return `${(button?.textContent||'').replace(/\s+/g,' ').trim()}:${button?.classList.contains('is-active')?'1':'0'}`;
    }).join('|');
    if(sortbar.dataset.signature===sortSignature)return;
    sortbar.dataset.signature=sortSignature;
    sortbar.replaceChildren();
    headers.slice(3).forEach(th=>{
      const original=th.querySelector('button[data-season-stat-sort]');
      if(!original)return;
      const button=document.createElement('button');
      button.type='button';
      button.textContent=(original.textContent||'').replace(/\s+/g,' ').trim();
      button.classList.toggle('is-active',original.classList.contains('is-active'));
      button.addEventListener('click',()=>original.click());
      sortbar.appendChild(button);
    });
  }

  function findCompactCard(seed, kind){
    if(!seed)return null;
    let n=seed;
    while(n&&n!==document.body){
      const r=n.getBoundingClientRect();
      const txt=(n.innerText||'').trim();
      if(r.width>240 && r.height>170 && r.height<900 && txt.length>20){
        const hasImg=!!n.querySelector('img');
        if(hasImg && (n.tagName==='ARTICLE' || /card|item|row|player|team/i.test(n.className||''))){
          return n;
        }
      }
      n=n.parentElement;
    }
    return null;
  }

  function firstTextMatch(root, regex){
    const nodes=[...root.querySelectorAll('span,p,div,small,strong,b')];
    for(const el of nodes){
      if(el.children.length>3) continue;
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      const m=t.match(regex);
      if(m) return {text:t,match:m,el};
    }
    return null;
  }

  function cardImage(root){
    const img=root.querySelector('img');
    if(!img)return '';
    return img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
  }

  const PLAYER_FALLBACK_IMAGE = 'https://sweehockey-svg.github.io/web-images/players/1DEFAULTBILDID.png.webp';

  function safePlayerImage(src){
    return sehWebAppPlayerImage(src);
  }

  function applyPlayerImageFallback(img){
    if(!img)return;
    img.onerror=()=>{
      img.onerror=null;
      img.src=PLAYER_FALLBACK_IMAGE;
    };
  }

  function cardLink(root){
    const a=root.matches?.('a[href]') ? root : root.querySelector('a[href]');
    return a?.href || '';
  }

  function playerNameFromCard(card){
    const direct=card.querySelector('h1,h2,h3,h4,.player-name,.player-card-name,[class*="player-name"],[class*="gamertag"]');
    const directText=(direct?.textContent||'').replace(/\s+/g,' ').trim();
    if(directText && directText.length<=60)return directText;

    const rejected=/^(UTESPELARE|MÅLVAKT|GOALIE|FORWARD|DEFENDER|SENAST|MATCHER|SÄSONGER|KLUBBAR)$/i;
    const leaves=[...card.querySelectorAll('a,span,strong,b,div,p')].filter(el=>{
      if(el.children.length>0)return false;
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!t || t.length<2 || t.length>45)return false;
      if(rejected.test(t))return false;
      if(/^\d[\d\s,.]*(p|g|a|matcher|säsonger|klubbar)?$/i.test(t))return false;
      if(/^(ECL|SEC|SCL|FCL|RCL|GCL|eSHL|SM|ITHL|LGEL)(\b|\s|,)/i.test(t))return false;
      return /[A-Za-zÅÄÖåäö]/.test(t);
    });
    leaves.sort((a,b)=>{
      const af=parseFloat(getComputedStyle(a).fontSize)||0;
      const bf=parseFloat(getComputedStyle(b).fontSize)||0;
      if(bf!==af)return bf-af;
      return ((a.textContent||'').trim().length)-((b.textContent||'').trim().length);
    });

    const leafName=(leaves[0]?.textContent||'').replace(/\s+/g,' ').trim();
    if(leafName)return leafName;

    // Some versions of the web player card don't expose the gamertag in a
    // dedicated heading/class. In that DOM the visible card text starts with
    // "<gamertag> UTESPELARE/MÅLVAKT". Use that as a robust app fallback so
    // rebuildPlayerCard() never leaves the desktop statistics card squeezed
    // into the two-column mobile grid.
    const cardText=(card.innerText||card.textContent||'').replace(/\s+/g,' ').trim();
    const roleMatch=cardText.match(/^(.{2,60}?)\s+(?:UTESPELARE|MÅLVAKT|GOALIE|FORWARD|DEFENDER)(?:\s|$)/i);
    if(roleMatch){
      const roleName=roleMatch[1].trim();
      if(roleName && !rejected.test(roleName))return roleName;
    }

    const imgAlt=(card.querySelector('img')?.getAttribute('alt')||'').replace(/\s+/g,' ').trim();
    if(imgAlt && imgAlt.length<=60 && !/^(spelare|player|profil|portrait|avatar|bild)$/i.test(imgAlt)){
      return imgAlt;
    }

    return '';
  }

  function rebuildPlayerCard(card){
    if(card.classList.contains('seh-rebuilt')){
      const existingName=(card.querySelector('.seh-cp-name')?.textContent||'').replace(/\s+/g,' ').trim();
      if(existingName)decoratePlayerCardRanking(card,existingName);
      return;
    }

    const name=playerNameFromCard(card);
    const photo=cardImage(card) || PLAYER_FALLBACK_IMAGE;
    if(!name)return;

    const clubHit=firstTextMatch(card,/(\d+)\s+klubbar/i);
    const matchHit=firstTextMatch(card,/([\d\s]+)\s+matcher/i);

    // Pick the shortest element that actually starts with "Senast:".
    const latestCandidates=[...card.querySelectorAll('p,div,span,small')]
      .map(el=>({el,text:(el.textContent||'').replace(/\s+/g,' ').trim()}))
      .filter(x=>/^Senast\s*:/i.test(x.text));
    latestCandidates.sort((a,b)=>a.text.length-b.text.length);
    const latestRaw=latestCandidates[0]?.text || '';

    // The site also shows the player's competition/division history. Keep it,
    // but render it separately so "Senast" stays readable.
    const historyCandidates=[...card.querySelectorAll('p,div,span,small')]
      .map(el=>(el.textContent||'').replace(/\s+/g,' ').trim())
      .filter(t=>{
        if(!t || /^Senast\s*:/i.test(t) || t.length>140) return false;
        const hits=(t.match(/\b(ECL|eSHL|SCL|SEC|SM|6v6|Elite|Lite|Pro|Core|Neo)\b/gi)||[]).length;
        return hits>=3;
      })
      .sort((a,b)=>a.length-b.length);
    const history=historyCandidates[0] || '';

    const wrap=document.createElement(cardLink(card)?'a':'div');
    wrap.className='seh-compact-player';
    if(wrap.tagName==='A') wrap.href=cardLink(card);

    const clubs=clubHit ? `${clubHit.match[1]} klubbar` : '';
    const matches=matchHit ? `${matchHit.match[1].replace(/\s+/g,' ').trim()} matcher` : '';
    const shortMatches = matches ? matches.replace(/\s*matcher$/i,' m') : '';

    // Remove any accidental history suffix from the latest line if the DOM grouped both together.
    let latest=latestRaw;
    if(history && latest.endsWith(history)){
      latest=latest.slice(0,-history.length).trim();
    }

    wrap.innerHTML=`
      <div class="seh-cp-name"></div>
      <img class="seh-cp-photo" alt="">
      <div class="seh-cp-summary">
        ${(clubs||shortMatches)?`<div class="seh-cp-inline">
          ${clubs?`<div class="seh-cp-line">${clubs}</div>`:''}
          ${(clubs&&shortMatches)?`<span class="seh-cp-dot">•</span>`:''}
          ${shortMatches?`<div class="seh-cp-line">${shortMatches}</div>`:''}
        </div>`:''}
        ${latest?`<div class="seh-cp-latestbox"><span class="seh-cp-kicker">Senast</span><div class="seh-cp-latest"></div></div>`:''}
        ${history?`<div class="seh-cp-history"></div>`:''}
      </div>
    `;

    wrap.querySelector('.seh-cp-name').textContent=name;
    const img=wrap.querySelector('.seh-cp-photo');
    applyPlayerImageFallback(img);
    img.src=safePlayerImage(photo);
    img.alt=name;
    if(latest) wrap.querySelector('.seh-cp-latest').textContent=latest.replace(/^Senast\s*:\s*/i,'');
    if(history) wrap.querySelector('.seh-cp-history').textContent=history;

    card.appendChild(wrap);
    card.classList.add('seh-rebuilt');
    decoratePlayerCardRanking(card,name);
  }

  function sehCompactTeamListTournamentLabel(value){
    try{return sehTeamCompactTournamentLabel(value||'');}catch(_){return String(value||'').replace(/\b6v6\b/gi,' ').replace(/\s+/g,' ').trim();}
  }

  function sehTeamTopPlayerName(value){
    return String(value||'')
      .replace(/,?\s*[–-]?\s*\d[\d\s.,]*\s*p\b.*$/i,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function sehTeamDirectoryNameKey(value){
    return String(value||'')
      .normalize('NFKC')
      .replace(/\s+/g,' ')
      .trim()
      .toLocaleLowerCase('sv-SE');
  }

  let sehTeamTopAvatarObserver=null;
  const sehTeamTopAvatarJobs=new WeakMap();

  function sehRunTeamTopAvatarJob(wrap){
    const job=sehTeamTopAvatarJobs.get(wrap);
    if(!job||!wrap?.isConnected)return;
    sehTeamTopAvatarJobs.delete(wrap);

    try{
      loadZeroPlayerDirectory().then(rows=>{
        if(!wrap?.isConnected)return;
        const targetKey=sehTeamDirectoryNameKey(job.name);
        const player=(Array.isArray(rows)?rows:[]).find(row=>
          sehTeamDirectoryNameKey(row?.name)===targetKey
        );
        const photo=String(player?.photo||'').trim();
        if(!photo)return;

        const avatar=job.avatar;
        if(!avatar?.isConnected)return;
        const img=document.createElement('img');
        img.alt='';
        img.onerror=()=>avatar.classList.remove('has-photo');
        img.onload=()=>avatar.classList.add('has-photo');
        img.src=photo;
        avatar.replaceChildren(img);
      }).catch(()=>{});
    }catch(_){}
  }

  function sehQueueTeamTopAvatar(wrap,top){
    const avatar=wrap?.querySelector('.seh-ct-top-avatar');
    const name=sehTeamTopPlayerName(top);
    if(!avatar||!name)return;

    sehTeamTopAvatarJobs.set(wrap,{avatar,name});

    if('IntersectionObserver' in window){
      if(!sehTeamTopAvatarObserver){
        sehTeamTopAvatarObserver=new IntersectionObserver(entries=>{
          entries.forEach(entry=>{
            if(!entry.isIntersecting)return;
            sehTeamTopAvatarObserver.unobserve(entry.target);
            sehRunTeamTopAvatarJob(entry.target);
          });
        },{rootMargin:'180px 0px'});
      }
      sehTeamTopAvatarObserver.observe(wrap);
      return;
    }

    sehRunTeamTopAvatarJob(wrap);
  }

  function rebuildTeamCard(card){
    if(card.classList.contains('seh-rebuilt'))return;

    const heading=card.querySelector('h1,h2,h3,h4');
    const name=(heading?.textContent||'').replace(/\s+/g,' ').trim();
    if(!name)return;

    const logo=sehWebAppTeamLogo(cardImage(card),name);
    const allText=(card.innerText||'').replace(/\s+/g,' ').trim();
    const statFromLabel=(label)=>{
      const re=new RegExp(label+'\\s*([\\d\\s]+)','i');
      const m=allText.match(re);
      return m ? m[1].replace(/\s+/g,' ').trim() : '';
    };

    const players=statFromLabel('SPELARE');
    const tournaments=statFromLabel('TURNERINGAR');

    const shortestStarting=(re)=>{
      const vals=[...card.querySelectorAll('p,div,span,small')]
        .map(el=>(el.textContent||'').replace(/\s+/g,' ').trim())
        .filter(t=>re.test(t));
      vals.sort((a,b)=>a.length-b.length);
      return vals[0]||'';
    };

    let latest=shortestStarting(/^Senast\s*:/i).replace(/^Senast\s*:\s*/i,'');
    let top=shortestStarting(/^Topp spelare\s*:/i).replace(/^Topp spelare\s*:\s*/i,'');
    latest=latest.split(/Namnvariationer\s*:/i)[0].trim();
    top=top.split(/Namnvariationer\s*:/i)[0].trim();
    latest=sehCompactTeamListTournamentLabel(latest);

    const badgeTexts=[];
    [...card.querySelectorAll('span,a,button')].forEach(el=>{
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!t || t.length>18)return;
      if(/^(SCL|SEC|ECL\b|ECL\s*[-–]|ECL\s+(Neo|Core|Lite|Pro|Elite)|SM|eSHL)/i.test(t)){
        if(!badgeTexts.includes(t))badgeTexts.push(t);
      }
    });

    const href=cardLink(card);
    const wrap=document.createElement(href?'a':'div');
    wrap.className='seh-compact-team';
    if(href)wrap.href=href;

    const initials=name
      .split(/\s+/)
      .map(x=>x.replace(/[^A-Za-zÅÄÖåäö0-9]/g,'').charAt(0))
      .filter(Boolean)
      .slice(0,2)
      .join('')
      .toUpperCase() || 'SE';

    wrap.innerHTML=`
      ${logo?'<img class="seh-ct-watermark" alt="" aria-hidden="true" loading="lazy" decoding="async">':''}
      <div class="seh-ct-name"></div>
      ${logo?'<img class="seh-ct-logo" alt="">':`<div class="seh-ct-logo-placeholder" aria-hidden="true">${initials}</div>`}
      <div class="seh-ct-badges"></div>
      <div class="seh-ct-stats">
        <div class="seh-ct-stat"><b>Spelare</b><span>${players||'–'}</span></div>
        <div class="seh-ct-stat"><b>Turneringar</b><span>${tournaments||'–'}</span></div>
      </div>
      ${latest?`<div class="seh-ct-latest"><strong>Senast</strong><span></span></div>`:''}
      ${top?`<div class="seh-ct-top"><span class="seh-ct-top-avatar" aria-hidden="true"></span><span class="seh-ct-top-copy"><strong>Topp</strong> <span class="seh-ct-top-text"></span></span></div>`:''}
    `;

    wrap.querySelector('.seh-ct-name').textContent=name;
    if(logo){
      const img=wrap.querySelector('.seh-ct-logo');
      const watermark=wrap.querySelector('.seh-ct-watermark');
      const canonical=sehWebAppTeamLogo('',name);

      /*
       * V700:
       * Do NOT set crossOrigin on the visible logo. Some source-logo hosts do
       * not send CORS headers; crossOrigin="anonymous" therefore turned images
       * that previously rendered correctly into broken images.
       *
       * Load the original source first, then the canonical GitHub logo.
       */
      let triedCanonical=false;
      img.alt=name;
      img.onerror=()=>{
        if(!triedCanonical && canonical && img.src!==canonical){
          triedCanonical=true;
          img.src=canonical;
          if(watermark)watermark.src=canonical;
          return;
        }

        img.onerror=null;
        img.remove();

        if(watermark)watermark.remove();

        const placeholder=document.createElement('div');
        placeholder.className='seh-ct-logo-placeholder';
        placeholder.setAttribute('aria-hidden','true');
        placeholder.textContent=initials;
        wrap.querySelector('.seh-ct-badges')?.insertAdjacentElement('beforebegin',placeholder);
      };

      img.onload=()=>{
        /*
         * Palette extraction is best-effort only. If canvas access is blocked
         * by CORS, zeroApplyTeamPalette already fails safely and the card keeps
         * the premium default gradient.
         */
        try{zeroApplyTeamPalette(wrap,name,img);}catch(_){}
      };

      img.src=logo;
      if(watermark){
        watermark.onerror=()=>{
          watermark.onerror=null;
          if(watermark.src!==canonical)watermark.src=canonical;
          else watermark.remove();
        };
        watermark.src=logo;
      }
    }

    const badges=wrap.querySelector('.seh-ct-badges');
    badgeTexts.slice(0,4).forEach(t=>{
      const b=document.createElement('span');
      b.className='seh-ct-badge';
      b.textContent=t;
      badges.appendChild(b);
    });

    if(latest)wrap.querySelector('.seh-ct-latest span').textContent=latest;
    if(top){
      const topText=wrap.querySelector('.seh-ct-top-text');
      if(topText)topText.textContent=top;

      /*
       * V703 / Desktop Dev V29:
       * If the source already knows the SportsGamer player ID, use its PNG
       * directly. This removes the final delayed stage where the full player
       * directory had to load only to resolve the top-player avatar.
       */
      const directPhoto=String(card.dataset.topPlayerPhoto||'').trim();
      const avatar=wrap.querySelector('.seh-ct-top-avatar');

      if(directPhoto && avatar){
        const img=document.createElement('img');
        img.alt='';
        img.onload=()=>avatar.classList.add('has-photo');
        img.onerror=()=>{
          avatar.classList.remove('has-photo');
          img.remove();
        };
        img.src=directPhoto;
        avatar.replaceChildren(img);
      }else{
        sehQueueTeamTopAvatar(wrap,top);
      }
    }

    card.appendChild(wrap);
    card.classList.add('seh-rebuilt');
  }



  /* ===== SPELARE V6: DIREKT FRÅN SERVERCACHE, INGEN DOM-SKRAPNING ===== */
  const SEH_PLAYER_PAGE_SIZE=20;
  const SEH_PLAYER_IMPL_VERSION='directory-card-v4-paged-rest';
  const SEH_PLAYER_BATCH_SIZE=100;
  const SEH_PLAYER_DIRECTORY_ENDPOINT='https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/app-player-directory?key=seh-player-directory-2026-v1&v=3';
  const SEH_PLAYER_RANKING_ENDPOINT='https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/app-player-ranking?key=seh-player-ranking-2026-v1&v=11';
  const SEH_PLAYER_DIVISIONS=[
    'ECL','ECL Elite','ECL Pro','ECL Lite','ECL Core','ECL Neo',
    'SCL','SEC','FCL','GCL','RCL','CSCL','NACL','eSHL','LGEL','SM','6HL',
    'ITHL','ITHL Elite','ITHL Sweat','ITHL Rammer','ITHL Core'
  ];

  const previousZeroPlayerState=window.__SEH_ZERO_PLAYER_STATE__;
  if(previousZeroPlayerState?.implVersion!==SEH_PLAYER_IMPL_VERSION){
    document.querySelectorAll('.seh-zero-player-shell,.seh-zero-role-buttons').forEach(el=>el.remove());
  }
  const sehZeroPlayer=(previousZeroPlayerState?.implVersion===SEH_PLAYER_IMPL_VERSION)
    ? previousZeroPlayerState
    : (window.__SEH_ZERO_PLAYER_STATE__={
        implVersion:SEH_PLAYER_IMPL_VERSION,
        shell:null,
        grid:null,
        pager:null,
        summary:null,
        main:null,
        all:[],
        items:[],
        page:1,
        showAll:false,
        roleFilter:'all',
        divisionFilter:'all',
        searchQuery:'',
        upperSort:'games',
        ranking:new Map(),
        directoryPromise:null,
        directoryBackgroundPromise:null,
        directoryRawOffset:0,
        directoryFullyLoaded:false,
        rankingPromise:null,
        ready:false,
        building:false,
        renderToken:0,
        waitTimer:null,
        controlsRoot:null
      });
  if(!(sehZeroPlayer.ranking instanceof Map))sehZeroPlayer.ranking=new Map();
  if(!Array.isArray(sehZeroPlayer.all))sehZeroPlayer.all=[];
  if(!Array.isArray(sehZeroPlayer.items))sehZeroPlayer.items=[];

  function zeroNumber(value){
    const n=Number(value);
    return Number.isFinite(n)?n:0;
  }

  function zeroArray(value){
    if(Array.isArray(value))return value.map(x=>String(x??'').trim()).filter(Boolean);
    const raw=String(value??'').trim();
    return raw?raw.split(/[,;|]/).map(x=>x.trim()).filter(Boolean):[];
  }

  function zeroUnique(values){
    const out=[];const seen=new Set();
    for(const value of values){
      const text=String(value||'').replace(/\s+/g,' ').trim();
      if(!text)continue;
      const key=text.toLocaleLowerCase('sv-SE');
      if(seen.has(key))continue;
      seen.add(key);out.push(text);
    }
    return out;
  }

  function zeroRankingKeys(value){
    const raw=String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('sv-SE');
    if(!raw)return [];
    const out=new Set([raw]);
    const compact=raw.replace(/[^a-z0-9åäö]/gi,'');
    if(compact)out.add(compact);
    const core=raw.replace(/^[|il]+[-_. ]*/i,'').replace(/[-_. ]*[|il]+$/i,'').trim();
    if(core){
      out.add(core);
      const cc=core.replace(/[^a-z0-9åäö]/gi,'');
      if(cc)out.add(cc);
    }
    return [...out];
  }

  function zeroRankingForName(name){
    for(const key of zeroRankingKeys(name)){
      const rank=sehZeroPlayer.ranking.get(key);
      if(rank)return rank;
    }
    return null;
  }

  function loadZeroPlayerRanking(){
    if(sehZeroPlayer.ranking instanceof Map&&sehZeroPlayer.ranking.size>1000)return Promise.resolve(sehZeroPlayer.ranking);
    if(window.__SEH_PLAYER_RANKING_MAP__ instanceof Map&&window.__SEH_PLAYER_RANKING_MAP__.size>1000){
      sehZeroPlayer.ranking=window.__SEH_PLAYER_RANKING_MAP__;
      return Promise.resolve(sehZeroPlayer.ranking);
    }
    if(sehZeroPlayer.rankingPromise)return sehZeroPlayer.rankingPromise;
    if(window.__SEH_PLAYER_RANKING_PROMISE__){
      sehZeroPlayer.rankingPromise=window.__SEH_PLAYER_RANKING_PROMISE__.then(map=>{
        if(map instanceof Map)sehZeroPlayer.ranking=map;
        return sehZeroPlayer.ranking;
      });
      return sehZeroPlayer.rankingPromise;
    }

    const request=(async()=>{
      let lastError=null;
      for(let attempt=1;attempt<=3;attempt++){
        try{
          const endpoint=attempt===1
            ? SEH_PLAYER_RANKING_ENDPOINT
            : `${SEH_PLAYER_RANKING_ENDPOINT}&retry=${Date.now()}-${attempt}`;
          const response=await fetch(endpoint,attempt===1?{}:{cache:'no-store'});
          if(!response.ok)throw new Error(`Ranking HTTP ${response.status}`);
          const rows=await response.json();
          if(!Array.isArray(rows)||rows.length<1300)throw new Error(`Ofullständig rankinglista: ${Array.isArray(rows)?rows.length:'ogiltigt svar'}`);
          window.__SEH_PLAYER_RANKING_ROWS__=rows;
          const map=new Map();
          for(const row of rows){
            const overall_rank=Number(row.overall_rank);
            const ranking_points=Number(row.ranking_points);
            if(!Number.isFinite(overall_rank)||overall_rank<=0||!Number.isFinite(ranking_points))continue;
            const rank={...row,overall_rank,ranking_points};
            zeroRankingKeys(row.display_gamertag).forEach(key=>{if(key&&!map.has(key))map.set(key,rank);});
          }
          if(map.size<1000)throw new Error(`För få rankingnycklar: ${map.size}`);
          window.__SEH_PLAYER_RANKING_MAP__=map;
          return map;
        }catch(error){
          lastError=error;
          if(attempt<3)await new Promise(resolve=>setTimeout(resolve,400*attempt));
        }
      }
      throw lastError||new Error('Rankingen kunde inte laddas');
    })();

    window.__SEH_PLAYER_RANKING_PROMISE__=request.catch(error=>{
      console.warn('[Svensk eHockey] Ranking kunde inte laddas',error);
      return new Map();
    });
    sehZeroPlayer.rankingPromise=window.__SEH_PLAYER_RANKING_PROMISE__.then(map=>{
      if(map instanceof Map)sehZeroPlayer.ranking=map;
      return sehZeroPlayer.ranking;
    });
    return sehZeroPlayer.rankingPromise;
  }

  const ZERO_PLAYER_PNG_BASE = 'https://sweehockey-svg.github.io/players/';
  const ZERO_PLAYER_PNG_FALLBACK = 'https://sweehockey-svg.github.io/players/1DEFAULTBILDID.png';
  const ZERO_PLAYER_WEBP_BASE = 'https://sweehockey-svg.github.io/web-images/players/';
  const sehRemovedPortraitIds=new Set();

  function sehWebAppPlayerImage(value='', fallbackCandidate=''){
    const candidates=[value,fallbackCandidate];
    const manifest=Array.isArray(window.SEH_PLAYER_IMAGE_FILES)?window.SEH_PLAYER_IMAGE_FILES:[];

    for(const candidate of candidates){
      const raw=String(candidate||'').trim();
      if(!raw)continue;

      if(/\/web-images\/players\/[^/?#]+\.webp(?:[?#]|$)/i.test(raw)){
        try{return new URL(raw,ROOT).href;}catch(_){return raw;}
      }

      const numeric=raw.match(/^\d+$/)?.[0]||'';
      const pathMatch=raw.match(/(?:^|\/)players\/([^/?#]+\.png)(?:[?#].*)?$/i);
      const plainFile=raw.match(/^([^/?#]+\.png)$/i)?.[1]||'';
      const fileName=numeric?numeric+'.png':(pathMatch?.[1]||plainFile);

      if(fileName){
        if(manifest.includes(fileName)){
          return ZERO_PLAYER_WEBP_BASE+encodeURIComponent(fileName)+'.webp';
        }
        if(numeric)return ZERO_PLAYER_PNG_BASE+encodeURIComponent(fileName);
        try{return new URL(raw,ROOT).href;}catch(_){return raw;}
      }

      if(/^https?:\/\//i.test(raw))return raw;
    }

    if(manifest.includes('1DEFAULTBILDID.png')){
      return ZERO_PLAYER_WEBP_BASE+'1DEFAULTBILDID.png.webp';
    }
    return ZERO_PLAYER_PNG_FALLBACK;
  }

  window.SEH_WEBAPP_PLAYER_IMAGE_URL=sehWebAppPlayerImage;

  const SEH_WEBAPP_TEAMLOGO_BASE='https://sweehockey-svg.github.io/teamlogos/';
  const SEH_WEBAPP_TEAMLOGO_WEBP_BASE='https://sweehockey-svg.github.io/web-images/teamlogos/';

  function sehWebAppTeamLogoFile(value,teamName=''){
    const raw=String(value||'').trim();
    let file='';

    if(raw){
      const match=raw.match(/(?:^|\/)teamlogos\/([^/?#]+\.(?:png|jpe?g|webp))(?:[?#].*)?$/i);
      if(match)file=match[1];
      else if(/^[^/?#]+\.(?:png|jpe?g|webp)$/i.test(raw))file=raw;
    }

    if(!file && teamName)file=String(teamName).trim()+'.png';
    if(!file)return '';

    try{file=decodeURIComponent(file);}catch(_){}
    const manifest=(window.SEH_TEAM_LOGO_FILES&&typeof window.SEH_TEAM_LOGO_FILES==='object')
      ? window.SEH_TEAM_LOGO_FILES
      : {};
    const key=file.normalize('NFC').toLocaleLowerCase('sv-SE');
    return String(manifest[key]||file).trim();
  }

  function sehWebAppTeamLogoOriginal(value='',teamName=''){
    const raw=String(value||'').trim();
    const file=sehWebAppTeamLogoFile(raw,teamName);
    if(file)return SEH_WEBAPP_TEAMLOGO_BASE+encodeURIComponent(file);
    if(/^https?:\/\//i.test(raw))return raw;
    if(raw){
      try{return new URL(raw,ROOT).href;}catch(_){return raw;}
    }
    return '';
  }

  function sehWebAppTeamLogo(value='',teamName=''){
    const raw=String(value||'').trim();
    const file=sehWebAppTeamLogoFile(raw,teamName);

    if(file){
      const manifest=(window.SEH_TEAM_LOGO_FILES&&typeof window.SEH_TEAM_LOGO_FILES==='object')
        ? window.SEH_TEAM_LOGO_FILES
        : {};
      const key=file.normalize('NFC').toLocaleLowerCase('sv-SE');
      if(Object.prototype.hasOwnProperty.call(manifest,key) || /\/teamlogos\//i.test(raw) || !raw){
        return SEH_WEBAPP_TEAMLOGO_WEBP_BASE+encodeURIComponent(file)+'.webp';
      }
    }

    if(/^https?:\/\//i.test(raw))return raw;
    return sehWebAppTeamLogoOriginal(raw,teamName);
  }

  function sehWebAppTeamLogoFallbackFromOptimized(value){
    const raw=String(value||'').trim();
    const match=raw.match(/\/web-images\/teamlogos\/([^/?#]+)\.webp(?:[?#]|$)/i);
    if(!match)return '';
    let file=match[1];
    try{file=decodeURIComponent(file);}catch(_){}
    return file?SEH_WEBAPP_TEAMLOGO_BASE+encodeURIComponent(file):'';
  }

  document.addEventListener('error',event=>{
    const image=event.target;
    if(!(image instanceof HTMLImageElement))return;
    if(image.dataset.sehTeamLogoFallbackUsed==='1')return;
    const fallback=sehWebAppTeamLogoFallbackFromOptimized(image.getAttribute('src')||image.src);
    if(!fallback)return;
    image.dataset.sehTeamLogoFallbackUsed='1';
    image.src=fallback;
    event.stopImmediatePropagation();
  },true);

  window.SEH_WEBAPP_TEAM_LOGO_URL=sehWebAppTeamLogo;

  function zeroPngUrl(src){
    const raw=String(src||'').trim();
    if(!raw)return ZERO_PLAYER_PNG_FALLBACK;
    if(sehRemovedPortraitIds.has(raw.match(/\/players\/(\d+)\.png(?:[?#]|$)/i)?.[1]))return ZERO_PLAYER_PNG_FALLBACK;
    try{
      const url=new URL(raw,ROOT);
      url.pathname=url.pathname.replace(/\.(?:jpe?g|webp|gif|avif)$/i,'.png');
      return url.href;
    }catch(error){
      return ZERO_PLAYER_PNG_FALLBACK;
    }
  }

  function zeroPlayerPhotoFromRow(row){
    const url=String(row.sports_gamer_player_url||'');
    const match=url.match(/\/players\/(\d+)(?:\/|$|[?#])/i);
    return sehWebAppPlayerImage(row.player_image||'',match?.[1]||'');
  }

  function applyZeroPlayerPngFallback(img){
    if(!img)return;
    img.onerror=()=>{
      if(img.dataset.sehPngFallback!=='1' && img.src!==ZERO_PLAYER_PNG_FALLBACK){
        img.dataset.sehPngFallback='1';
        img.src=ZERO_PLAYER_PNG_FALLBACK;
        return;
      }
      img.onerror=null;
      img.removeAttribute('src');
      img.classList.add('seh-zero-player-photo-missing');
    };
  }

  function zeroProfilePngFromHero(img){
    const raw=String(img?.currentSrc||img?.src||'').trim();
    return sehWebAppPlayerImage(raw);
  }

  function zeroPlayerHistory(row){
    const omit=new Set(['MAIN','DIVISION A','SPORTSGAMER','6V6']);
    const leagueOrder=['ECL','SEC','SCL','SM','eSHL','FCL','GCL','LGEL','ITHL','RCL','SG'];
    const aliases=new Map([
      ['ESHL','eSHL'],['ITHL','ITHL'],['LGEL','LGEL'],['RCL','RCL'],['GCL','GCL'],
      ['ECL','ECL'],['SEC','SEC'],['SCL','SCL'],['SM','SM'],['FCL','FCL'],['SG','SG']
    ]);
    const candidates=zeroUnique([...zeroArray(row.competitions),...zeroArray(row.divisions)]);
    const found=new Set();
    candidates.forEach(value=>{
      const raw=String(value||'').trim();
      const upper=raw.toUpperCase();
      if(!raw||omit.has(upper))return;
      for(const [key,label] of aliases){
        if(upper===key || upper.startsWith(key+' ') || upper.includes(' '+key+' ')){
          found.add(label);break;
        }
      }
    });
    return leagueOrder.filter(label=>found.has(label)).join(' · ');
  }

  function zeroPrettyLatestSeason(value){
    return String(value||'')
      .replace(/\s+-\s+(Elite|Pro|Lite|Core|Neo)\b/gi,' · $1')
      .replace(/\s+/g,' ')
      .trim();
  }

  function sehWebAppCanonicalTeamName(value,teamId=0){
    const fallback=String(value||'').replace(/\s+/g,' ').trim();
    try{return window.SEH_WEBAPP_TEAM_ALIASES?.canonicalName(fallback,teamId)||fallback;}catch(_){return fallback;}
  }

  function sehWebAppTeamAliasSearchText(value,teamId=0){
    try{return window.SEH_WEBAPP_TEAM_ALIASES?.searchText(value,teamId)||String(value||'').toLocaleLowerCase('sv-SE');}
    catch(_){return String(value||'').toLocaleLowerCase('sv-SE');}
  }

  window.SEH_WEBAPP_CANONICAL_TEAM_NAME=sehWebAppCanonicalTeamName;

  function zeroTeamLogoUrl(teamName){
    const name=sehWebAppCanonicalTeamName(teamName);
    return name?sehWebAppTeamLogo('',name):'';
  }

  function zeroTeamInitials(teamName){
    return String(teamName||'')
      .split(/\s+/).filter(Boolean).map(part=>part.charAt(0)).join('').slice(0,3).toUpperCase()||'—';
  }

  function zeroPlayerHrefFromRow(row,name){
    try{
      if(typeof window.SEH_playerProfileUrl==='function')return window.SEH_playerProfileUrl(row.player_key,name);
    }catch(error){}
    const key=String(row.player_key||'').trim();
    const slug=String(name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv-SE').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return key?`${ROOT}#/spelare/${encodeURIComponent(slug||key)}?pk=${encodeURIComponent(key)}`:'';
  }

  function normalizeZeroDirectoryRow(row){
    const name=String(row.display_gamertag||'').replace(/\s+/g,' ').trim();
    if(!name)return null;
    const skaterGames=zeroNumber(row.total_skater_games);
    const goalieGames=zeroNumber(row.total_goalie_games);
    const role=String(row.player_type||'').trim().toLocaleLowerCase('sv-SE')==='goalie'||goalieGames>skaterGames?'goalie':'skater';
    const latestSeason=zeroPrettyLatestSeason(String(row.latest_season||''));
    // Aktuell status är gemensam med webben:
    // pågående lag -> aktiv Free Agent -> inget aktuellt lag.
    const latestHistoricalTeam=String(row.team_name_in_tournament||row.latest_team||row.team_current_name||'').replace(/\s+/g,' ').trim();
    const currentStatus=String(row.current_status||'').trim() || (String(row.current_team_name||'').trim()?'team':'no_team');
    const currentTeam=currentStatus==='team'
      ? String(row.current_team_name||'Aktuellt lag').replace(/\s+/g,' ').trim()
      : currentStatus==='free_agent'
        ? 'Free Agent'
        : 'Inget aktuellt lag';
    const latestTeam=currentTeam;
    const latest=[latestSeason,currentTeam].filter(Boolean).join(' · ');
    const clubs=zeroNumber(row.club_count);
    const games=zeroNumber(row.career_games);
    const totalPoints=zeroNumber(row.total_points);
    const competitions=zeroArray(row.competitions);
    const divisions=zeroArray(row.divisions);
    const filterDivisions=zeroArray(row.filter_divisions);
    const clubNames=zeroArray(row.club_names);
    const searchText=[name,latestSeason,latestTeam,...clubNames,...competitions,...divisions,...filterDivisions]
      .join(' ').toLocaleLowerCase('sv-SE');
    return {
      key:String(row.player_key||''),
      name,
      role,
      position:role==='goalie'?'MÅLVAKT':'UTESPELARE',
      photo:zeroPlayerPhotoFromRow(row),
      clubs,
      games,
      totalPoints,
      latest,
      latestSeason,
      latestTeam,
      currentTeam,
      currentTeamId:Number(row.current_team_id)||0,
      currentTeamLogo:String(row.current_team_logo||'').trim(),
      currentStatus,
      primaryPosition:String(row.primary_position||'').trim(),
      lastAppearanceDate:String(row.last_appearance_date||'').trim(),
      latestHistoricalTeam,
      history:zeroPlayerHistory(row),
      href:zeroPlayerHrefFromRow(row,name),
      competitions,
      divisions,
      filterDivisions,
      clubNames,
      searchText
    };
  }

  function zeroPlayerDirectorySelect(){
    return 'player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_season,latest_team,competitions,divisions,filter_divisions,club_names,club_count,total_skater_games,total_goalie_games,career_games,total_points,player_type,player_country,last_appearance_date,tournament_count,total_goals,total_assists,total_goalie_saves,total_goalie_shots_against,total_goalie_save_percentage';
  }

  function zeroNormalizeDirectoryBatch(raw,existing=[]){
    const rows=[];
    const seen=new Set(existing.map(player=>player.key||player.name.toLocaleLowerCase('sv-SE')));
    for(const row of Array.isArray(raw)?raw:[]){
      const player=normalizeZeroDirectoryRow(row);
      if(!player)continue;
      const identity=player.key||player.name.toLocaleLowerCase('sv-SE');
      if(seen.has(identity))continue;
      seen.add(identity);
      rows.push(player);
    }
    return rows;
  }

  async function zeroFetchDirectoryBatch(offset=0,limit=SEH_PLAYER_BATCH_SIZE){
    const rows=await sehTeamDirectRest('app_player_directory_cache',{
      select:zeroPlayerDirectorySelect(),
      player_country:'eq.SE',
      order:'career_games.desc.nullslast,display_gamertag.asc',
      limit:String(limit),
      offset:String(offset)
    });
    if(window.SEH_currentPlayerStatus?.decorateRows){
      return window.SEH_currentPlayerStatus.decorateRows(rows);
    }
    return rows;
  }

  function zeroLoadRemainingPlayerDirectory(){
    if(sehZeroPlayer.directoryFullyLoaded)return Promise.resolve(sehZeroPlayer.all);
    if(sehZeroPlayer.directoryBackgroundPromise)return sehZeroPlayer.directoryBackgroundPromise;

    sehZeroPlayer.directoryBackgroundPromise=(async()=>{
      let offset=Math.max(0,Number(sehZeroPlayer.directoryRawOffset)||0);
      while(!sehZeroPlayer.directoryFullyLoaded){
        const raw=await zeroFetchDirectoryBatch(offset,SEH_PLAYER_BATCH_SIZE);
        const count=Array.isArray(raw)?raw.length:0;
        if(count){
          const normalized=zeroNormalizeDirectoryBatch(raw,sehZeroPlayer.all);
          if(normalized.length)sehZeroPlayer.all.push(...normalized);
          offset+=count;
          sehZeroPlayer.directoryRawOffset=offset;
          window.__SEH_PLAYER_DIRECTORY_ROWS__=sehZeroPlayer.all;
        }
        if(count<SEH_PLAYER_BATCH_SIZE){
          sehZeroPlayer.directoryFullyLoaded=true;
          window.__SEH_PLAYER_DIRECTORY_COMPLETE__=true;
          break;
        }
        // Ge Android WebView en render-frame mellan batcherna.
        await new Promise(resolve=>setTimeout(resolve,25));
      }
      console.info(`[Svensk eHockey] Mobil spelarkatalog färdig: ${sehZeroPlayer.all.length} spelare`);
      if(route().kind==='players'&&sehZeroPlayer.shell?.isConnected)zeroApplyLocalPlayerControls();
      return sehZeroPlayer.all;
    })().catch(error=>{
      console.warn('[Svensk eHockey] Bakgrundsladdning av spelarregistret avbröts',error);
      return sehZeroPlayer.all;
    }).finally(()=>{sehZeroPlayer.directoryBackgroundPromise=null;});
    return sehZeroPlayer.directoryBackgroundPromise;
  }

  function loadZeroPlayerDirectory(){
    if(Array.isArray(sehZeroPlayer.all)&&sehZeroPlayer.all.length>0){
      if(!sehZeroPlayer.directoryFullyLoaded)zeroLoadRemainingPlayerDirectory();
      return Promise.resolve(sehZeroPlayer.all);
    }
    if(Array.isArray(window.__SEH_PLAYER_DIRECTORY_ROWS__)&&window.__SEH_PLAYER_DIRECTORY_ROWS__.length>0){
      sehZeroPlayer.all=window.__SEH_PLAYER_DIRECTORY_ROWS__;
      sehZeroPlayer.directoryRawOffset=sehZeroPlayer.all.length;
      // En tidigare komplett katalog markeras av separat flagga, annars fortsätter vi i bakgrunden.
      sehZeroPlayer.directoryFullyLoaded=window.__SEH_PLAYER_DIRECTORY_COMPLETE__===true;
      if(!sehZeroPlayer.directoryFullyLoaded)zeroLoadRemainingPlayerDirectory();
      return Promise.resolve(sehZeroPlayer.all);
    }
    if(sehZeroPlayer.directoryPromise)return sehZeroPlayer.directoryPromise;

    sehZeroPlayer.directoryPromise=(async()=>{
      let lastError=null;
      for(let attempt=1;attempt<=3;attempt++){
        try{
          if(attempt>1)await new Promise(resolve=>setTimeout(resolve,300*attempt));
          const raw=await zeroFetchDirectoryBatch(0,SEH_PLAYER_BATCH_SIZE);
          if(!Array.isArray(raw)||raw.length===0)throw new Error('Tom spelarkatalog');
          const rows=zeroNormalizeDirectoryBatch(raw);
          if(!rows.length)throw new Error('Inga normaliserade spelare');
          sehZeroPlayer.all=rows;
          sehZeroPlayer.directoryRawOffset=raw.length;
          sehZeroPlayer.directoryFullyLoaded=raw.length<SEH_PLAYER_BATCH_SIZE;
          window.__SEH_PLAYER_DIRECTORY_ROWS__=rows;
          window.__SEH_PLAYER_DIRECTORY_COMPLETE__=sehZeroPlayer.directoryFullyLoaded;
          console.info(`[Svensk eHockey] Första spelarbATCH: ${rows.length} spelare`);
          // Rendera första sidan nu. Resten får laddas efteråt.
          if(!sehZeroPlayer.directoryFullyLoaded)setTimeout(()=>zeroLoadRemainingPlayerDirectory(),60);
          return rows;
        }catch(error){lastError=error;}
      }
      throw lastError||new Error('Spelarkatalogen kunde inte laddas');
    })().catch(error=>{
      console.error('[Svensk eHockey] Spelarkatalogen kunde inte laddas',error);
      throw error;
    }).finally(()=>{sehZeroPlayer.directoryPromise=null;});
    return sehZeroPlayer.directoryPromise;
  }

  function zeroTeamPaletteKey(teamName){
    return String(teamName||'').trim().toLocaleLowerCase('sv-SE');
  }

  function zeroRgbToHex(r,g,b){
    const part=v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0');
    return `#${part(r)}${part(g)}${part(b)}`;
  }

  function zeroColorDistance(a,b){
    return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
  }

  function zeroPaletteFromLogo(img){
    try{
      const canvas=document.createElement('canvas');
      canvas.width=48;canvas.height=48;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)return null;
      ctx.clearRect(0,0,48,48);
      ctx.drawImage(img,0,0,48,48);
      const pixels=ctx.getImageData(0,0,48,48).data;
      const buckets=new Map();
      for(let i=0;i<pixels.length;i+=4){
        const a=pixels[i+3];
        if(a<100)continue;
        let r=pixels[i],g=pixels[i+1],b=pixels[i+2];
        const max=Math.max(r,g,b),min=Math.min(r,g,b);
        const light=(max+min)/2;
        const sat=max-min;
        // Ignorera nästan svart/vitt/grått – de ger tråkiga lagbakgrunder.
        if(light<24 || light>235 || sat<24)continue;
        r=Math.round(r/32)*32;g=Math.round(g/32)*32;b=Math.round(b/32)*32;
        const key=`${r},${g},${b}`;
        buckets.set(key,(buckets.get(key)||0)+1);
      }
      const colors=[...buckets.entries()]
        .sort((a,b)=>b[1]-a[1])
        .map(([key,count])=>({rgb:key.split(',').map(Number),count}));
      if(!colors.length)return null;
      const primary=colors[0].rgb;
      const secondary=(colors.find(item=>zeroColorDistance(item.rgb,primary)>90)||colors[1]||colors[0]).rgb;
      return {primary:zeroRgbToHex(...primary),secondary:zeroRgbToHex(...secondary)};
    }catch(error){
      return null;
    }
  }

  const ZERO_TEAM_COLOR_PRESETS={
    // V622: SSK/Cappel är referenskortet medan nya transparenta porträtt tas fram.
    'ssk esports':{primary:'#0750a0',secondary:'#f0c51b'}
  };

  function zeroApplyTeamPalette(card,teamName,logo){
    if(!card)return;
    const key=zeroTeamPaletteKey(teamName);
    const configured=window.SEH_TEAM_COLORS?.[teamName] || window.SEH_TEAM_COLORS?.[key] || ZERO_TEAM_COLOR_PRESETS[key];
    const cache=window.__SEH_TEAM_PALETTE_CACHE__ instanceof Map
      ? window.__SEH_TEAM_PALETTE_CACHE__
      : (window.__SEH_TEAM_PALETTE_CACHE__=new Map());

    const apply=palette=>{
      if(!palette)return;
      const primary=palette.primary||palette.primaryColor;
      const secondary=palette.secondary||palette.secondaryColor||primary;
      if(primary)card.style.setProperty('--seh-team-primary',primary);
      if(secondary)card.style.setProperty('--seh-team-secondary',secondary);
    };

    if(configured){apply(configured);return;}
    if(cache.has(key)){apply(cache.get(key));return;}
    if(!logo)return;
    const read=()=>{
      const palette=zeroPaletteFromLogo(logo);
      if(palette){cache.set(key,palette);apply(palette);}
    };
    if(logo.complete && logo.naturalWidth)read();
    else logo.addEventListener('load',read,{once:true});
  }

  const SEH_FAST_PROFILE_NAV_KEY='seh_fast_profile_nav_v1';

  function sehRememberFastProfileNav(data,teamLogo,rank){
    try{
      const latestTeam=sehWebAppCanonicalTeamName(data?.latestTeam||'');
      sessionStorage.setItem(SEH_FAST_PROFILE_NAV_KEY,JSON.stringify({
        href:String(data?.href||''),
        key:String(data?.key||''),
        name:String(data?.name||''),
        position:String(data?.position||''),
        photo:String(data?.photo||''),
        latestTeam:String(latestTeam||''),
        latestSeason:String(data?.latestSeason||''),
        history:String(data?.history||''),
        games:Number(data?.games)||0,
        rankNo:Number(rank?.overall_rank)||0,
        rankPoints:Number(rank?.ranking_points)||0,
        teamLogo:sehWebAppTeamLogo(teamLogo,latestTeam),
        savedAt:Date.now()
      }));
    }catch(_){}
  }

  function sehFastProfileRouteKey(){
    const hashKey=(String(location.hash||'').match(/^#\/spelare\/([^/?#]+)/i)||[])[1]||'';
    try{return decodeURIComponent(hashKey).trim();}catch(_){return String(hashKey||'').trim();}
  }

  function sehFastProfileDataFromDirectory(){
    const routeKey=sehFastProfileRouteKey();
    if(!routeKey)return null;
    const routeLower=routeKey.toLocaleLowerCase('sv-SE');
    const rows=Array.isArray(sehZeroPlayer?.all)&&sehZeroPlayer.all.length
      ? sehZeroPlayer.all
      : (Array.isArray(window.__SEH_PLAYER_DIRECTORY_ROWS__)?window.__SEH_PLAYER_DIRECTORY_ROWS__:[]);
    if(!rows.length)return null;
    const row=rows.find(item=>{
      const key=String(item?.key||'').trim().toLocaleLowerCase('sv-SE');
      if(key && key===routeLower)return true;
      const href=String(item?.href||'');
      const hrefKey=(href.match(/#\/spelare\/([^/?#]+)/i)||[])[1]||'';
      let decodedHref='';try{decodedHref=decodeURIComponent(hrefKey);}catch(_){decodedHref=hrefKey;}
      return decodedHref.trim().toLocaleLowerCase('sv-SE')===routeLower;
    });
    if(!row)return null;
    const latestTeam=sehWebAppCanonicalTeamName(row.latestTeam);
    const teamLogo=zeroTeamLogoUrl(latestTeam);
    const rank=zeroRankingForName(row.name);
    return {
      href:String(row.href||''),key:String(row.key||routeKey),name:String(row.name||''),
      position:String(row.position||''),photo:String(row.photo||''),latestTeam:String(latestTeam||''),
      latestSeason:String(row.latestSeason||''),history:String(row.history||''),games:Number(row.games)||0,
      rankNo:Number(rank?.overall_rank)||0,rankPoints:Number(rank?.ranking_points)||0,
      teamLogo:String(teamLogo||''),savedAt:Date.now()
    };
  }

  function sehReadFastProfileNav(){
    const routeKey=sehFastProfileRouteKey();

    // V767: account/FA/ECL27 navigation can change route before the directory
    // lookup has completed. Keep the selected player in memory as an immediate
    // native-profile source so the route can never fall through to an empty grid.
    try{
      const pending=window.__SEH_PENDING_NATIVE_PLAYER__;
      if(pending?.name){
        const age=Date.now()-Number(pending.savedAt||0);
        const routeLower=String(routeKey||'').trim().toLocaleLowerCase('sv-SE');
        const hrefKeyRaw=(String(pending.href||'').match(/#\/spelare\/([^/?#]+)/i)||[])[1]||'';
        let hrefKey='';try{hrefKey=decodeURIComponent(hrefKeyRaw);}catch(_){hrefKey=hrefKeyRaw;}
        if(age<=120000 && (!routeLower || hrefKey.trim().toLocaleLowerCase('sv-SE')===routeLower))return pending;
      }
    }catch(_){}

    try{
      const raw=sessionStorage.getItem(SEH_FAST_PROFILE_NAV_KEY);
      if(raw){
        const data=JSON.parse(raw);
        const age=Date.now()-Number(data?.savedAt||0);
        if(data && age<=120000){
          const expected=String(data.key||'').trim().toLocaleLowerCase('sv-SE');
          const hrefKeyRaw=(String(data.href||'').match(/#\/spelare\/([^/?#]+)/i)||[])[1]||'';
          let hrefKey='';try{hrefKey=decodeURIComponent(hrefKeyRaw);}catch(_){hrefKey=hrefKeyRaw;}
          const routeLower=routeKey.toLocaleLowerCase('sv-SE');
          const matches=!routeKey || (expected&&expected===routeLower) || (hrefKey&&hrefKey.trim().toLocaleLowerCase('sv-SE')===routeLower);
          // Direkt efter ett klick är detta med säkerhet den spelare användaren valde.
          // Tillåt därför den sparade kortdatan även om webbens route-slug och canonical player_key skiljer sig.
          if(matches || age<10000)return data;
        }
      }
    }catch(_){}
    return sehFastProfileDataFromDirectory();
  }

  function showFastPlayerProfilePreview(){
    if(route().kind!=='player')return false;
    const data=sehReadFastProfileNav();
    if(!data?.name)return false;
    const routeKey=location.pathname+location.hash;
    const existing=document.querySelector('body > .seh-player-native-root');
    if(existing?.dataset.routeKey===routeKey)return true;
    existing?.remove();

    document.body.classList.add('seh-player-profile-active','seh-player-native-v581');
    const main=document.querySelector('main');
    if(main){main.classList.add('seh-player-native-source-host');main.setAttribute('aria-hidden','true');}

    const esc=v=>htmlEscape(String(v||''));
    const root=document.createElement('section');
    root.className='seh-player-native-root seh-player-native-fast';
    root.dataset.routeKey=routeKey;
    root.dataset.provisional='1';
    const rankNo=Number(data.rankNo)||0;
    const rankPoints=Number(data.rankPoints)||0;
    const games=Number(data.games)||0;
    const leagueLine=String(data.history||'').trim();
    root.innerHTML=`
      <div class="seh-player-native-sticky-shell">
        <section class="seh-player-native-hero">
          <div class="seh-player-native-portrait">${data.teamLogo?`<img class="seh-player-native-bglogo" src="${esc(data.teamLogo)}" alt="">`:''}${data.photo?`<img src="${esc(data.photo)}" alt="${esc(data.name)}" loading="eager" decoding="async" fetchpriority="high">`:''}</div>
          <div class="seh-player-native-identity">
            <div class="seh-player-native-name">${esc(data.name)}</div>
            <div class="seh-player-native-team">${data.teamLogo?`<img src="${esc(data.teamLogo)}" alt="">`:''}<span>${esc(data.latestTeam||'Klubb saknas')}</span></div>
            <div class="seh-player-native-sub"><span>${esc((data.position||'Spelare').replace(/^./,m=>m.toUpperCase()))}</span><i>•</i><span>🇸🇪 Sverige</span></div>
            ${leagueLine?`<div class="seh-player-native-leagues">${esc(leagueLine.replace(/ · /g,', '))}</div>`:''}
            <div class="seh-player-native-numbers">
              <div><strong>—</strong><span>säsonger</span></div>
              <div><strong>—</strong><span>klubbar</span></div>
              <div><strong>${games?games.toLocaleString('sv-SE'):'—'}</strong><span>matcher</span></div>
            </div>
          </div>
          <div class="seh-player-native-rpbar">
            <div><strong>${rankNo?`#${esc(rankNo)}`:'—'}</strong><span>Sverige</span></div>
            <div><strong>${rankPoints?`${esc(formatRankingNumber(rankPoints,0))} RP`:'—'}</strong><span>Total RP</span></div>
            <div><strong>—</strong><span>Snitt-RP</span></div>
            <div><strong>—</strong><span>Positionsrank</span></div>
          </div>
        </section>
      </div>
      <div class="seh-player-native-fast-body">
        <div class="seh-player-native-fast-card">
          <div class="seh-player-native-fast-title">Laddar profilinformation</div>
          <div class="seh-player-native-fast-lines"><i></i><i></i><i></i></div>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.documentElement.classList.remove('seh-player-route-pending');
    document.body.classList.remove('seh-loading');
    return true;
  }

  function makeZeroPlayerCard(data){
    const el=document.createElement(data.href?'a':'article');
    el.className='seh-zero-player-card seh-directory-card-v3';
    if(data.href)el.href=data.href;
    const hasCurrentTeam=data.currentStatus==='team'&&data.currentTeam;
    const isFreeAgent=data.currentStatus==='free_agent';
    const displayTeam=hasCurrentTeam
      ? sehWebAppCanonicalTeamName(data.currentTeam,data.currentTeamId)
      : isFreeAgent
        ? 'Free Agent'
        : 'Inget aktuellt lag';
    const rank=zeroRankingForName(data.name);
    const rankNo=Number(rank?.overall_rank);
    const rankPoints=Number(rank?.ranking_points);
    const hasRank=Number.isFinite(rankNo)&&rankNo>0&&Number.isFinite(rankPoints);
    const gamesText=new Intl.NumberFormat('sv-SE').format(Math.max(0,Number(data.games)||0));
    const clubsText=new Intl.NumberFormat('sv-SE').format(Math.max(0,Number(data.clubs)||0));
    const teamLogo=hasCurrentTeam
      ? sehWebAppTeamLogo(data.currentTeamLogo||'',displayTeam)
      : '';
    const teamInitials=hasCurrentTeam
      ? zeroTeamInitials(displayTeam)
      : isFreeAgent ? 'FA' : '–';
    el.classList.toggle('is-free-agent',isFreeAgent);
    el.classList.toggle('is-no-team',!hasCurrentTeam&&!isFreeAgent);
    if(hasCurrentTeam&&ZERO_TEAM_COLOR_PRESETS[zeroTeamPaletteKey(displayTeam)])el.classList.add('seh-team-preset');

    el.innerHTML=`
      ${hasRank?`<div class="seh-zero-player-corner-rank" aria-label="Sverigerank ${htmlEscape(rankNo)}"><span>${rankNo===1?'♛':'#'}</span><strong>${htmlEscape(rankNo)}</strong></div>`:''}
      <div class="seh-zero-player-name"></div>
      <div class="seh-zero-player-position"></div>
      <div class="seh-zero-player-photo-frame">${teamLogo?`<img class="seh-zero-player-bglogo" src="${htmlEscape(teamLogo)}" alt="" loading="lazy" decoding="async">`:''}<img class="seh-zero-player-photo" alt="" loading="lazy" decoding="async"></div>
      <div class="seh-zero-player-lower">
        ${displayTeam?`
          <div class="seh-zero-player-teamrow${hasCurrentTeam?' is-team':isFreeAgent?' is-free-agent':' is-no-team'}" ${hasCurrentTeam&&data.currentTeamId?'role="link" tabindex="0"':''}>
            <span class="seh-zero-player-teamlogo">${teamLogo?`<img src="${htmlEscape(teamLogo)}" alt="" loading="lazy" decoding="async">`:''}<i>${htmlEscape(teamInitials)}</i></span>
            <span class="seh-zero-player-teamcopy"><strong>${htmlEscape(displayTeam)}</strong>${data.latestSeason?`<small>${htmlEscape(data.latestSeason)}</small>`:''}</span>
          </div>`:''}
        <div class="seh-zero-player-statrow">
          <span class="seh-zero-player-games"><strong>${htmlEscape(gamesText)}</strong><small>matcher</small></span>
          ${hasRank?`<span class="seh-zero-player-rankline"><small>#${htmlEscape(rankNo)}</small><strong>${htmlEscape(formatRankingNumber(rankPoints,0))} RP</strong></span>`:`<span class="seh-zero-player-clubs"><strong>${htmlEscape(clubsText)}</strong><small>klubbar</small></span>`}
        </div>
        ${data.history?`<div class="seh-zero-player-history"></div>`:''}
      </div>
    `;
    el.querySelector('.seh-zero-player-name').textContent=data.name;
    el.querySelector('.seh-zero-player-position').textContent=data.position;
    const image=el.querySelector('.seh-zero-player-photo');
    image.src=data.photo;image.alt=data.name;applyZeroPlayerPngFallback(image);

    const logo=el.querySelector('.seh-zero-player-teamlogo img');
    const bgLogo=el.querySelector('.seh-zero-player-bglogo');
    if(logo){
      logo.addEventListener('load',()=>logo.closest('.seh-zero-player-teamlogo')?.classList.add('has-logo'),{once:true});
      logo.addEventListener('error',()=>logo.remove(),{once:true});
    }
    if(bgLogo)bgLogo.addEventListener('error',()=>bgLogo.remove(),{once:true});
    if(hasCurrentTeam)zeroApplyTeamPalette(el,displayTeam,bgLogo||logo);
    if(data.history)el.querySelector('.seh-zero-player-history').textContent=data.history;

    const teamRow=el.querySelector('.seh-zero-player-teamrow.is-team');
    if(teamRow&&data.currentTeamId){
      const openTeam=(event)=>{
        event.preventDefault();
        event.stopPropagation();
        nativeNavigate(`${ROOT}#/lag/${encodeURIComponent(data.currentTeamId)}`);
      };
      teamRow.addEventListener('click',openTeam);
      teamRow.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();openTeam(event);}
      });
    }

    if(data.href){
      el.addEventListener('click',()=>sehRememberFastProfileNav(data,teamLogo,rank),{capture:true});
    }
    return el;
  }

  function renderZeroPlayerPage(){
    if(!sehZeroPlayer.grid||!sehZeroPlayer.pager||!sehZeroPlayer.summary)return;
    const items=sehZeroPlayer.items;
    const pagesTotal=Math.max(1,Math.ceil(items.length/SEH_PLAYER_PAGE_SIZE));
    sehZeroPlayer.page=Math.max(1,Math.min(sehZeroPlayer.page,pagesTotal));
    const start=(sehZeroPlayer.page-1)*SEH_PLAYER_PAGE_SIZE;
    const visible=sehZeroPlayer.showAll?items:items.slice(start,start+SEH_PLAYER_PAGE_SIZE);
    const token=++sehZeroPlayer.renderToken;

    const loadingSuffix=sehZeroPlayer.directoryFullyLoaded?'':' · laddar fler…';
    sehZeroPlayer.summary.textContent=(sehZeroPlayer.showAll
      ?`Visar alla ${items.length} svenska spelare`
      :`Visar ${items.length?start+1:0}–${Math.min(start+SEH_PLAYER_PAGE_SIZE,items.length)} av ${items.length} svenska spelare`)+loadingSuffix;

    sehZeroPlayer.grid.replaceChildren();
    if(!visible.length){
      sehZeroPlayer.grid.innerHTML='<div class="seh-zero-player-loading">Inga spelare hittades.</div>';
    }else if(!sehZeroPlayer.showAll){
      const fragment=document.createDocumentFragment();
      visible.forEach(player=>fragment.appendChild(makeZeroPlayerCard(player)));
      sehZeroPlayer.grid.appendChild(fragment);
    }else{
      let offset=0;const batch=32;
      const next=()=>{
        if(token!==sehZeroPlayer.renderToken||!sehZeroPlayer.showAll)return;
        const fragment=document.createDocumentFragment();
        visible.slice(offset,offset+batch).forEach(player=>fragment.appendChild(makeZeroPlayerCard(player)));
        sehZeroPlayer.grid.appendChild(fragment);
        offset+=batch;
        if(offset<visible.length)setTimeout(next,16);
      };
      next();
    }

    const pages=document.createElement('div');pages.className='seh-zero-player-pages';
    const addPage=(label,target,active=false,disabled=false)=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=label;button.disabled=disabled;button.classList.toggle('is-active',active);
      button.onclick=()=>{
        sehZeroPlayer.showAll=false;sehZeroPlayer.page=target;renderZeroPlayerPage();
        sehZeroPlayer.shell?.scrollIntoView({behavior:'smooth',block:'start'});
      };
      pages.appendChild(button);
    };
    addPage('<',Math.max(1,sehZeroPlayer.page-1),false,sehZeroPlayer.page<=1||sehZeroPlayer.showAll);
    const count=Math.min(5,pagesTotal);
    let from=Math.max(1,sehZeroPlayer.page-2);
    from=Math.min(from,Math.max(1,pagesTotal-count+1));
    for(let page=from;page<from+count;page++)addPage(String(page),page,!sehZeroPlayer.showAll&&page===sehZeroPlayer.page,false);
    addPage('>',Math.min(pagesTotal,sehZeroPlayer.page+1),false,sehZeroPlayer.page>=pagesTotal||sehZeroPlayer.showAll);

    const showAll=document.createElement('button');
    showAll.type='button';showAll.className='seh-zero-player-showall';showAll.textContent=sehZeroPlayer.showAll?'Visa 20 per sida':'Visa alla';
    showAll.onclick=()=>{
      sehZeroPlayer.showAll=!sehZeroPlayer.showAll;sehZeroPlayer.page=1;renderZeroPlayerPage();
      sehZeroPlayer.shell?.scrollIntoView({behavior:'smooth',block:'start'});
    };
    sehZeroPlayer.pager.replaceChildren(pages,showAll);
  }

  function zeroApplyLocalPlayerControls(){
    const query=String(sehZeroPlayer.searchQuery||'').trim().toLocaleLowerCase('sv-SE');
    const division=sehZeroPlayer.divisionFilter;
    let list=sehZeroPlayer.all.filter(player=>{
      if(query){
        const aliasText=[
          sehWebAppTeamAliasSearchText(player.latestTeam),
          ...(Array.isArray(player.clubNames)?player.clubNames.map(name=>sehWebAppTeamAliasSearchText(name)):[])
        ].join(' ');
        if(!player.searchText.includes(query)&&!aliasText.includes(query))return false;
      }
      if(sehZeroPlayer.roleFilter!=='all'&&player.role!==sehZeroPlayer.roleFilter)return false;
      if(division!=='all'&&!player.filterDivisions.includes(division))return false;
      return true;
    });

    const finish=()=>{
      const mode=sehZeroPlayer.upperSort;
      if(mode==='points')list.sort((a,b)=>b.totalPoints-a.totalPoints||b.games-a.games||a.name.localeCompare(b.name,'sv'));
      else if(mode==='clubs')list.sort((a,b)=>b.clubs-a.clubs||b.games-a.games||a.name.localeCompare(b.name,'sv'));
      else if(mode==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'sv',{sensitivity:'base'}));
      else if(mode==='ranking'){
        list=list.map((item,index)=>({item,index,rank:zeroRankingForName(item.name)})).sort((a,b)=>{
          const ar=Number(a.rank?.overall_rank),br=Number(b.rank?.overall_rank);
          const aa=Number.isFinite(ar)&&ar>0,bb=Number.isFinite(br)&&br>0;
          if(aa&&bb&&ar!==br)return ar-br;
          if(aa!==bb)return aa?-1:1;
          return a.index-b.index;
        }).map(entry=>entry.item);
      }else if(mode==='average-ranking'){
        list=list.map((item,index)=>({item,index,rank:zeroRankingForName(item.name)})).sort((a,b)=>{
          const ar=Number(a.rank?.average_rank),br=Number(b.rank?.average_rank);
          const av=Number(a.rank?.average_rating),bv=Number(b.rank?.average_rating);
          const aa=Number.isFinite(ar)&&ar>0&&Number.isFinite(av);
          const bb=Number.isFinite(br)&&br>0&&Number.isFinite(bv);
          if(aa&&bb){
            if(ar!==br)return ar-br;
            if(av!==bv)return bv-av;
            return a.item.name.localeCompare(b.item.name,'sv',{sensitivity:'base'});
          }
          if(aa!==bb)return aa?-1:1;
          return a.index-b.index;
        }).map(entry=>entry.item);
      }else list.sort((a,b)=>b.games-a.games||b.totalPoints-a.totalPoints||a.name.localeCompare(b.name,'sv'));

      sehZeroPlayer.items=list;
      sehZeroPlayer.page=1;
      sehZeroPlayer.showAll=false;
      renderZeroPlayerPage();
    };
    if(sehZeroPlayer.upperSort==='ranking'||sehZeroPlayer.upperSort==='average-ranking')loadZeroPlayerRanking().then(finish);
    else finish();
  }

  function zeroCloneControlWithoutListeners(element){
    if(!element)return null;
    const clone=element.cloneNode(true);
    element.replaceWith(clone);
    return clone;
  }

  function zeroInstallPlayerControls(main){
    if(!main||sehZeroPlayer.controlsRoot===main)return;
    sehZeroPlayer.controlsRoot=main;

    // Djuplänkar från divisioner och sökresultat ska öppna rätt filter även i webbappen.
    try{
      const query=new URLSearchParams((location.hash.split('?')[1]||''));
      const requestedDivision=String(query.get('division')||'').trim();
      const requestedSearch=String(query.get('q')||'').trim();
      if(requestedDivision&&SEH_PLAYER_DIVISIONS.includes(requestedDivision))sehZeroPlayer.divisionFilter=requestedDivision;
      if(requestedSearch)sehZeroPlayer.searchQuery=requestedSearch;
    }catch(_){}

    const compact=main.querySelector('.players-compact');
    if(compact)compact.style.setProperty('display','none','important');

    const search=zeroCloneControlWithoutListeners(main.querySelector('#playerSearch'));
    if(search){
      search.closest('.players-field')?.classList.add('seh-player-filter-search');
      search.value=sehZeroPlayer.searchQuery||'';
      search.addEventListener('input',event=>{
        event.stopPropagation();
        sehZeroPlayer.searchQuery=search.value;
        zeroApplyLocalPlayerControls();
      });
    }

    const division=zeroCloneControlWithoutListeners(main.querySelector('#divisionFilter'));
    if(division){
      division.closest('.players-field')?.classList.add('seh-player-filter-division');
      division.replaceChildren();
      const all=document.createElement('option');all.value='all';all.textContent='Alla divisioner';division.appendChild(all);
      SEH_PLAYER_DIVISIONS.forEach(label=>{
        const option=document.createElement('option');option.value=label;option.textContent=label;division.appendChild(option);
      });
      division.value=SEH_PLAYER_DIVISIONS.includes(sehZeroPlayer.divisionFilter)?sehZeroPlayer.divisionFilter:'all';
      division.addEventListener('change',event=>{
        event.stopPropagation();
        sehZeroPlayer.divisionFilter=division.value||'all';
        zeroApplyLocalPlayerControls();
      });
    }

    const sort=zeroCloneControlWithoutListeners(main.querySelector('#playerSort'));
    if(sort){
      sort.closest('.players-field')?.classList.add('seh-player-filter-sort');
      sort.replaceChildren();
      const options=[
        ['ranking','Bästa ranking'],['average-ranking','Bästa snittranking'],['games','Flest matcher'],['points','Flest poäng'],['clubs','Flest klubbar'],['name','Namn A–Ö']
      ];
      options.forEach(([value,label])=>{
        const option=document.createElement('option');option.value=value;option.textContent=label;sort.appendChild(option);
      });
      sort.value=options.some(([value])=>value===sehZeroPlayer.upperSort)?sehZeroPlayer.upperSort:'games';
      sort.addEventListener('change',event=>{
        event.stopPropagation();
        sehZeroPlayer.upperSort=sort.value||'games';
        zeroApplyLocalPlayerControls();
      });
    }

    const role=main.querySelector('#roleFilter');
    if(role){
      const cleanRole=zeroCloneControlWithoutListeners(role);
      cleanRole.closest('.players-field')?.classList.add('seh-player-filter-role');
      cleanRole.style.setProperty('display','none','important');
      const oldButtons=cleanRole.parentElement?.querySelector('.seh-zero-role-buttons');
      oldButtons?.remove();
      const buttons=document.createElement('div');buttons.className='seh-zero-role-buttons';
      [['all','Alla'],['skater','Utespelare'],['goalie','Målvakter']].forEach(([value,label])=>{
        const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.role=value;
        button.classList.toggle('is-active',sehZeroPlayer.roleFilter===value);
        button.addEventListener('click',()=>{
          sehZeroPlayer.roleFilter=value;
          buttons.querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item.dataset.role===value));
          zeroApplyLocalPlayerControls();
        });
        buttons.appendChild(button);
      });
      cleanRole.insertAdjacentElement('afterend',buttons);
    }
  }

  /* V742: top-level Spelare/Laghistoria use an app-owned body root.
     This root survives with zero dependency on the website <main>. */
  function sehNativeDirectoryHost(kind){
    if(window.__SEH_DESKTOP_DEV__)return document.querySelector('main');
    if(!['players','teams'].includes(kind))return null;
    // App-owned overlays are authoritative. A pending directory fetch can finish
    // after Tävlingar has opened; never recreate its higher native directory root
    // until the overlay has closed.
    if(document.querySelector('#seh-app-home.show,#seh-app-directory.show,#seh-app-competitions.show,#seh-app-more.show,#seh-app-favorites.show'))return null;
    // V745: native directories own the entire content viewport. Never allow
    // the generic loader or a stale route-transition layer to cover them.
    document.body?.classList.remove('seh-loading','seh-route-transitioning');
    document.getElementById('seh-route-transition-stage')?.replaceChildren();
    sehPendingVisualRoute='';
    sehPendingVisualUsedCache=false;
    clearTimeout(sehPendingVisualTimer);
    let root=document.getElementById('seh-native-directory-root');
    if(!root){
      root=document.createElement('section');
      root.id='seh-native-directory-root';
      document.body.appendChild(root);
    }
    if(root.dataset.kind!==kind){
      root.replaceChildren();
      root.className='';
      root.dataset.kind=kind;
      // V747: directory roots are reused between Laghistoria and Spelare.
      // Never keep a stale "already built" flag after the children were cleared.
      delete root.dataset.sehNativePlayerDirectory;
      delete root.dataset.sehNativeTeamDirectory;
      root.removeAttribute('aria-hidden');
    }
    return root;
  }

  function sehRemoveNativeDirectoryHost(){
    document.getElementById('seh-native-directory-root')?.remove();
  }

  /* V742: Android owns Spelare completely. Build the source scaffold in-app
     instead of waiting for the legacy website directory DOM. */
  function sehEnsureNativePlayerDirectoryScaffold(main){
    if(!main || window.__SEH_DESKTOP_DEV__)return main?.querySelector('#playerGrid')||null;
    if(route().kind!=='players')return null;
    if(main.dataset.sehNativePlayerDirectory==='1'){
      const existingGrid=main.querySelector('#playerGrid');
      if(existingGrid)return existingGrid;
      // V747: stale state can remain after this shared root was emptied by another route.
      // Rebuild instead of waiting forever for a grid that no longer exists.
      delete main.dataset.sehNativePlayerDirectory;
    }

    // The old website page is not a fallback anymore. Remove it completely.
    main.replaceChildren();
    main.dataset.sehNativePlayerDirectory='1';
    main.classList.add('seh-native-player-directory-source');
    main.removeAttribute('aria-hidden');

    const page=document.createElement('section');
    page.className='seh-native-player-directory-frame';
    page.innerHTML=`
      <div class="seh-native-directory-head">
        <span class="seh-native-directory-kicker">SVENSK eHOCKEY</span>
        <h1>Spelare</h1>
        <p>Svenska spelare, profiler, historik och statistik.</p>
      </div>
      <div class="players-filters seh-mobile-filter-zone">
        <label class="players-field"><span>Sök</span><input id="playerSearch" type="search" placeholder="Sök spelare, lag eller liga" autocomplete="off"></label>
        <label class="players-field"><span>Division</span><select id="divisionFilter"></select></label>
        <label class="players-field"><span>Sortera</span><select id="playerSort"></select></label>
        <label class="players-field"><span>Roll</span><select id="roleFilter"><option value="all">Alla</option></select></label>
      </div>
      <p id="playerResultText" class="player-directory__result seh-zero-player-source"></p>
      <section id="playerGrid" class="seh-zero-player-source" aria-hidden="true"></section>
      <nav id="playerPagination" class="seh-zero-player-source" aria-hidden="true"></nav>`;
    main.appendChild(page);
    return page.querySelector('#playerGrid');
  }

  function zeroPrepareOriginalPlayerArea(main){
    const oldGrid=main.querySelector('#playerGrid');
    const oldPager=main.querySelector('#playerPagination');
    const oldResult=main.querySelector('#playerResultText');
    oldGrid?.classList.add('seh-zero-player-source');
    oldPager?.classList.add('seh-zero-player-source');
    oldResult?.classList.add('seh-zero-player-source');
    return {oldGrid,oldPager,oldResult};
  }

  function waitForZeroDirectPlayerMount(){
    if(sehZeroPlayer.waitTimer)return;
    sehZeroPlayer.waitTimer=setTimeout(()=>{
      sehZeroPlayer.waitTimer=null;
      buildZeroPlayerPage();
    },100);
  }

  function buildZeroPlayerPage(){
    if(route().kind!=='players')return;
    const main=window.__SEH_DESKTOP_DEV__?document.querySelector('main'):sehNativeDirectoryHost('players');
    if(!main){waitForZeroDirectPlayerMount();return;}

    if(sehZeroPlayer.shell?.isConnected&&sehZeroPlayer.main===main){
      sehZeroPlayer.ready=true;
      zeroInstallPlayerControls(main);
      return;
    }
    if(sehZeroPlayer.building)return;

    let oldGrid=main.querySelector('#playerGrid');
    if(!oldGrid && !window.__SEH_DESKTOP_DEV__)oldGrid=sehEnsureNativePlayerDirectoryScaffold(main);
    if(!oldGrid){waitForZeroDirectPlayerMount();return;}

    sehZeroPlayer.building=true;
    try{
      document.querySelectorAll('.seh-zero-player-shell').forEach(shell=>{if(!shell.isConnected||shell.closest('main')===main)shell.remove();});
      zeroPrepareOriginalPlayerArea(main);

      const shell=document.createElement('section');shell.className='seh-zero-player-shell';
      const summary=document.createElement('p');summary.className='player-directory__result seh-zero-player-summary';summary.textContent='Laddar svenska spelare…';
      const grid=document.createElement('section');grid.className='seh-zero-player-grid';
      const pager=document.createElement('nav');pager.className='seh-zero-player-pager';pager.setAttribute('aria-label','Spelarsidor');
      shell.append(summary,grid,pager);
      oldGrid.insertAdjacentElement('beforebegin',shell);

      sehZeroPlayer.main=main;
      sehZeroPlayer.shell=shell;
      sehZeroPlayer.summary=summary;
      sehZeroPlayer.grid=grid;
      sehZeroPlayer.pager=pager;
      sehZeroPlayer.ready=true;
      sehZeroPlayer.controlsRoot=null;
      zeroInstallPlayerControls(main);

      if(sehZeroPlayer.all.length>0){
        zeroApplyLocalPlayerControls();
        if(!sehZeroPlayer.directoryFullyLoaded)zeroLoadRemainingPlayerDirectory();
      }else{
        grid.innerHTML='<div class="seh-zero-player-loading">Laddar första spelarna…</div>';
        loadZeroPlayerDirectory().then(()=>{
          if(route().kind!=='players'||!sehZeroPlayer.shell?.isConnected)return;
          zeroApplyLocalPlayerControls();
        }).catch(error=>{
          if(!sehZeroPlayer.summary||!sehZeroPlayer.grid)return;
          sehZeroPlayer.summary.textContent='Ansluter till spelarregistret igen…';
          sehZeroPlayer.grid.innerHTML='<div class="seh-zero-player-loading">Laddar spelare…</div>';
          setTimeout(()=>{
            if(route().kind!=='players'||!sehZeroPlayer.shell?.isConnected)return;
            loadZeroPlayerDirectory().then(()=>{
              if(route().kind==='players'&&sehZeroPlayer.shell?.isConnected)zeroApplyLocalPlayerControls();
            }).catch(()=>{
              if(!sehZeroPlayer.summary||!sehZeroPlayer.grid)return;
              sehZeroPlayer.summary.textContent='Spelarna kunde inte laddas.';
              sehZeroPlayer.grid.innerHTML='<div class="seh-zero-player-loading">Försök öppna Spelare igen.</div>';
            });
          },1200);
        });
      }

      // Rankingen är sekundär data och är också en stor lista. Vänta tills
      // spelarkatalogens bakgrundsbatcher är klara så Android inte laddar två
      // stora register parallellt.
      const startRankingLoad=()=>setTimeout(()=>{
        if(route().kind!=='players'||!sehZeroPlayer.shell?.isConnected)return;
        loadZeroPlayerRanking().then(()=>{
          if(route().kind!=='players'||!sehZeroPlayer.shell?.isConnected||sehZeroPlayer.all.length<1)return;
          if(sehZeroPlayer.upperSort==='ranking'||sehZeroPlayer.upperSort==='average-ranking')zeroApplyLocalPlayerControls();
          else renderZeroPlayerPage();
        });
      },250);
      if(sehZeroPlayer.directoryFullyLoaded)startRankingLoad();
      else zeroLoadRemainingPlayerDirectory().then(startRankingLoad);
    }finally{
      sehZeroPlayer.building=false;
    }
  }

  function playerDirectoryStable(){
    return route().kind==='players'&&sehZeroPlayer.ready&&!!sehZeroPlayer.shell?.isConnected;
  }

  function adaptPlayerPagination(){buildZeroPlayerPage();}
  function adaptPlayerCards(){buildZeroPlayerPage();}


  function hideTeamSummaryBlock(mainEl){
    if(!mainEl)return;

    const summaryLabels=['VISAR LAG','ALLA LAGNAMN','SÄSONGER','DIVISIONER','MATCHER / VINSTER','SPELARE'];

    const candidates=[...mainEl.querySelectorAll('section,article,div')].filter(el=>{
      if(el.closest('.seh-mobile-team-card,.seh-compact-team,.seh-mobile-filter-zone,.seh-team-counts-compact')) return false;
      const txt=(el.innerText||'').replace(/\s+/g,' ').trim();
      if(!txt || txt.length>500) return false;

      const hits=summaryLabels.filter(label=>txt.toUpperCase().includes(label)).length;
      return hits>=4;
    });

    candidates.sort((a,b)=>{
      const ar=a.getBoundingClientRect();
      const br=b.getBoundingClientRect();
      return (ar.width*ar.height)-(br.width*br.height);
    });

    const block=candidates[0];
    if(!block)return;

    const txt=(block.innerText||'').replace(/\s+/g,' ').trim();

    const teamMatch =
      txt.match(/VISAR LAG\s*([\d\s]+)/i) ||
      txt.match(/([\d\s]+)\s+svenska lag/i);

    const playerMatch =
      txt.match(/SPELARE\s*([\d\s]+)/i);

    const teams=teamMatch ? teamMatch[1].replace(/\s+/g,' ').trim() : '';
    const players=playerMatch ? playerMatch[1].replace(/\s+/g,' ').trim() : '';

    let compact=mainEl.querySelector('.seh-team-counts-compact');
    if(!compact){
      compact=document.createElement('div');
      compact.className='seh-team-counts-compact';
    }

    compact.innerHTML=`
      ${teams?`<div class="seh-team-count-card"><span class="seh-team-count-label">Visar lag</span><span class="seh-team-count-value">${teams}</span></div>`:''}
      ${players?`<div class="seh-team-count-card"><span class="seh-team-count-label">Spelare</span><span class="seh-team-count-value">${players}</span></div>`:''}
    `;

    block.classList.add('seh-team-summary-hide');

    // Place the compact count directly after the filters.
    const filter=mainEl.querySelector('.seh-mobile-filter-zone');
    if(filter){
      filter.insertAdjacentElement('afterend',compact);
    }else{
      block.insertAdjacentElement('beforebegin',compact);
    }

    const next=block.nextElementSibling;
    if(next) next.classList.add('seh-team-results-anchor');

    // Remove only genuinely empty spacer elements between the compact count row
    // and the next useful content ("Uppdaterad" or the first team result).
    let n=compact.nextElementSibling;
    let guard=0;
    while(n && guard<8){
      guard++;

      const t=(n.innerText||'').replace(/\s+/g,' ').trim();
      const hasTeamCard=!!n.querySelector?.('.seh-mobile-team-card,[class*="team-card"]');
      const isUpdated=/^Uppdaterad\s+/i.test(t);

      if(isUpdated){
        n.classList.add('seh-team-updated-line');
        break;
      }

      if(hasTeamCard) break;

      const r=n.getBoundingClientRect();
      const hasInteractive=!!n.querySelector?.('input,select,button,a[href]');
      const isEmptyish=!t && !hasInteractive;

      if(isEmptyish || (t.length===0 && r.height>0)){
        n.classList.add('seh-team-after-count-gap');
        n=n.nextElementSibling;
        continue;
      }

      break;
    }
  }

  function compactTeamResultsLayout(mainEl, cards){
    if(!mainEl || !cards?.size)return;

    const compact=mainEl.querySelector('.seh-team-counts-compact');
    if(!compact)return;

    // Find the smallest element that is only the "Uppdaterad ..." line.
    const updatedCandidates=[...mainEl.querySelectorAll('p,span,div,small')].filter(el=>{
      if(el.closest('.seh-mobile-team-card,.seh-compact-team,.seh-team-counts-compact'))return false;
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      return /^Uppdaterad\s+\d{4}-\d{2}-\d{2}/i.test(t) && t.length<80;
    });

    updatedCandidates.sort((a,b)=>{
      const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
      return (ar.width*ar.height)-(br.width*br.height);
    });

    const updated=updatedCandidates[0]||null;
    if(updated) updated.classList.add('seh-team-updated-line');

    // Find the common direct container holding the rebuilt team cards.
    const cardArray=[...cards];
    let resultContainer=null;

    if(cardArray.length){
      const parents=new Map();
      cardArray.forEach(card=>{
        const p=card.parentElement;
        if(!p)return;
        parents.set(p,(parents.get(p)||0)+1);
      });

      resultContainer=[...parents.entries()]
        .sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
    }

    // Reorder only these two useful nodes. This removes any web spacer/min-height
    // that happens to live between them in the original desktop layout.
    let cursor=compact;

    if(updated){
      cursor.insertAdjacentElement('afterend',updated);
      cursor=updated;
    }

    if(resultContainer && resultContainer!==mainEl){
      resultContainer.classList.add('seh-team-results-moved');
      cursor.insertAdjacentElement('afterend',resultContainer);
    }
  }

  /* V741: Android Laghistoria is a direct Supabase directory. No legacy
     website page is kept underneath or used as a visual/data fallback. */
  const sehNativeTeamDirectoryState=(window.__SEH_NATIVE_TEAM_DIRECTORY_STATE__&&typeof window.__SEH_NATIVE_TEAM_DIRECTORY_STATE__==='object')
    ? window.__SEH_NATIVE_TEAM_DIRECTORY_STATE__
    : (window.__SEH_NATIVE_TEAM_DIRECTORY_STATE__={rows:null,promise:null,error:null,query:'',league:'all',sort:'name',page:1,pageSize:50});

  if(!('league' in sehNativeTeamDirectoryState))sehNativeTeamDirectoryState.league='all';
  if(!('sort' in sehNativeTeamDirectoryState))sehNativeTeamDirectoryState.sort='name';
  if(!sehNativeTeamDirectoryState.v749DefaultSortApplied){sehNativeTeamDirectoryState.sort='name';sehNativeTeamDirectoryState.page=1;sehNativeTeamDirectoryState.v749DefaultSortApplied=true;}
  if(!Number.isFinite(Number(sehNativeTeamDirectoryState.page))||Number(sehNativeTeamDirectoryState.page)<1)sehNativeTeamDirectoryState.page=1;
  sehNativeTeamDirectoryState.pageSize=50;

  function sehNativeTeamDirectoryLogo(row){
    const raw=String(row?.logo_url||row?.logo_path||'').trim();
    const name=String(row?.current_name||'').trim();
    return sehWebAppTeamLogo(raw,name);
  }

  function sehNativeTeamDirectoryTopPhoto(row){
    const match=String(row?.top_player_url||'').match(/\/players\/(\d+)/i);
    return match?sehWebAppPlayerImage('',match[1]):'';
  }

  function sehLoadNativeTeamDirectory(){
    if(Array.isArray(sehNativeTeamDirectoryState.rows)&&sehNativeTeamDirectoryState.rows.length>250)return Promise.resolve(sehNativeTeamDirectoryState.rows);
    if(sehNativeTeamDirectoryState.promise)return sehNativeTeamDirectoryState.promise;
    const primary=()=>sehTeamDirectRest('v_ehockey_team_card_meta_v1',{
      select:'team_id,current_name,effective_country,league_appearances,logo_path,logo_url,last_registered_at,player_count,competitions,latest,top_player,top_points,top_player_url',
      effective_country:'eq.SE',
      order:'last_registered_at.desc.nullslast,current_name.asc',
      limit:'500'
    });
    const fallback=()=>sehTeamDirectRest('v_local_team_list',{
      select:'team_id,current_name,effective_country,league_appearances,logo_path,logo_url,last_registered_at,profile_url',
      effective_country:'eq.SE',
      order:'last_registered_at.desc.nullslast,current_name.asc',
      limit:'500'
    }).then(rows=>(Array.isArray(rows)?rows:[]).map(row=>({
      ...row,
      player_count:Number(row?.player_count)||0,
      competitions:Array.isArray(row?.competitions)?row.competitions:[],
      latest:String(row?.latest||''),
      top_player:String(row?.top_player||''),
      top_points:Number(row?.top_points)||0,
      top_player_url:String(row?.top_player_url||'')
    })));
    sehNativeTeamDirectoryState.promise=primary().catch(error=>{
      console.warn('[Svensk eHockey] Primär laglista kunde inte hämtas, provar reservkälla',error);
      return fallback();
    }).then(rows=>{
      sehNativeTeamDirectoryState.rows=(Array.isArray(rows)?rows:[]).filter(row=>Number(row?.team_id)>0&&String(row?.current_name||'').trim());
      sehNativeTeamDirectoryState.error=null;
      return sehNativeTeamDirectoryState.rows;
    }).catch(error=>{
      sehNativeTeamDirectoryState.error=error;
      throw error;
    }).finally(()=>{sehNativeTeamDirectoryState.promise=null;});
    return sehNativeTeamDirectoryState.promise;
  }

  const sehTeamRpState={rows:null,promise:null,retryAt:0};
  function sehTeamRpText(teamId){
    const r=sehTeamRpState.rows?.get(Number(teamId));
    if(!r)return sehTeamRpState.rows?'RP saknas':Date.now()<sehTeamRpState.retryAt?'RP tillfälligt otillgängligt':'RP laddas…';
    return `${Number(r.total).toLocaleString('sv-SE')} RP · ${r.rank?'#'+r.rank:'Orankat'} · Snitt ${r.average}`;
  }
  function sehSyncTeamRp(){
    if(!['teams','team'].includes(route().kind))return;
    if(!sehTeamRpState.rows&&!sehTeamRpState.promise&&Date.now()>sehTeamRpState.retryAt&&typeof window.SEH_getTeamRanking==='function'){
      sehTeamRpState.promise=window.SEH_getTeamRanking().then(rows=>{
        sehTeamRpState.rows=new Map(rows.map(row=>[Number(row.team_id),row]));
        if(route().kind==='teams'&&sehNativeTeamDirectoryState.sort==='rp'&&sehNativeTeamDirectoryState.rows)sehRenderNativeTeamDirectory(sehNativeDirectoryHost('teams'),sehNativeTeamDirectoryState.rows);
        sehSyncTeamRp();
      }).catch(error=>{sehTeamRpState.retryAt=Date.now()+60000;console.warn('Lag-RP kunde inte hämtas',error);document.querySelectorAll('[data-seh-team-rp]').forEach(node=>node.textContent='RP tillfälligt otillgängligt');}).finally(()=>{sehTeamRpState.promise=null;});
    }
    const sort=document.querySelector('[data-seh-team-sort]');
    if(sort&&!sort.querySelector('option[value="rp"]'))sort.add(new Option('Högst lag-RP','rp'));
    document.querySelectorAll('.seh-native-team-directory-card [data-team-id]').forEach(card=>{
      let rp=card.querySelector('[data-seh-team-rp]');
      if(!rp){rp=document.createElement('div');rp.dataset.sehTeamRp=card.dataset.teamId;rp.style.cssText='margin:8px 0;padding:10px 6px;border:1px solid #d6b15f66;border-radius:10px;color:#ffe078;font-size:12px;font-weight:800;line-height:1.5;text-align:center';card.querySelector('.seh-ct-stats')?.before(rp);}
      const text=sehTeamRpText(card.dataset.teamId);if(rp.dataset.text!==text){rp.replaceChildren(...text.split(' · ').map(part=>{const span=document.createElement('span');span.textContent=part;return span;}));rp.dataset.text=text;}
    });
    const hero=document.querySelector('.seh-team-native-identity');
    if(hero){let rp=hero.querySelector('[data-seh-team-rp]');if(!rp){rp=document.createElement('p');rp.dataset.sehTeamRp=String(sehTeamRouteId());rp.style.cssText='color:#ffe078;font-size:14px;font-weight:800;line-height:1.5';hero.append(rp);}const text=sehTeamRpText(sehTeamRouteId());if(rp.textContent!==text)rp.textContent=text;}
  }
  function sehMakeNativeTeamDirectoryCard(row){
    const teamId=Number(row?.team_id)||0;
    const name=String(row?.current_name||'').replace(/\s+/g,' ').trim();
    const logo=sehNativeTeamDirectoryLogo(row);
    const competitions=zeroUnique(zeroArray(row?.competitions)).slice(0,4);
    const latest=sehCompactTeamListTournamentLabel(String(row?.latest||'').trim());
    const topName=String(row?.top_player||'').replace(/\s+/g,' ').trim();
    const topPoints=Number(row?.top_points)||0;
    const topLabel=topName?`${topName}${topPoints?` · ${topPoints.toLocaleString('sv-SE')} PTS`:''}`:'';
    const players=Math.max(0,Number(row?.player_count)||0);
    const tournaments=Math.max(0,Number(row?.league_appearances)||0);
    const initials=name.split(/\s+/).map(x=>x.replace(/[^A-Za-zÅÄÖåäö0-9]/g,'').charAt(0)).filter(Boolean).slice(0,2).join('').toUpperCase()||'SE';

    const host=document.createElement('article');
    host.className='seh-mobile-team-card seh-rebuilt seh-native-team-directory-card';
    const card=document.createElement('a');
    card.className='seh-compact-team';
    card.href=`${ROOT}#/lag/${teamId}`;
    card.dataset.teamId=String(teamId);
    card.innerHTML=`
      ${logo?'<img class="seh-ct-watermark" alt="" aria-hidden="true">':''}
      <div class="seh-ct-name">${htmlEscape(name)}</div>
      ${logo?'<img class="seh-ct-logo" alt="" loading="lazy" decoding="async">':`<div class="seh-ct-logo-placeholder" aria-hidden="true">${htmlEscape(initials)}</div>`}
      <div class="seh-ct-badges">${competitions.map(x=>`<span class="seh-ct-badge">${htmlEscape(x)}</span>`).join('')}</div>
      <div class="seh-ct-stats">
        <div class="seh-ct-stat"><b>Spelare</b><span>${players.toLocaleString('sv-SE')}</span></div>
        <div class="seh-ct-stat"><b>Turneringar</b><span>${tournaments.toLocaleString('sv-SE')}</span></div>
      </div>
      ${latest?`<div class="seh-ct-latest"><strong>Senast</strong><span>${htmlEscape(latest)}</span></div>`:''}
      ${topLabel?`<div class="seh-ct-top"><span class="seh-ct-top-avatar" aria-hidden="true"></span><span class="seh-ct-top-copy"><strong>Topp</strong> <span class="seh-ct-top-text">${htmlEscape(topLabel)}</span></span></div>`:''}`;

    if(logo){
      const image=card.querySelector('.seh-ct-logo');
      const watermark=card.querySelector('.seh-ct-watermark');
      const canonical=sehWebAppTeamLogo('',name);
      let canonicalTried=false;
      const fail=img=>{
        if(!canonicalTried&&img.src!==canonical){canonicalTried=true;img.src=canonical;return;}
        img.remove();
      };
      image.src=logo; image.alt=name;
      image.onerror=()=>fail(image);
      image.onload=()=>{try{zeroApplyTeamPalette(card,name,image);}catch(_){}};
      if(watermark){watermark.src=logo;watermark.onerror=()=>{if(watermark.src!==canonical)watermark.src=canonical;else watermark.remove();};}
    }

    const avatar=card.querySelector('.seh-ct-top-avatar');
    const photo=sehNativeTeamDirectoryTopPhoto(row);
    if(avatar&&photo){
      const img=document.createElement('img');img.alt='';
      img.onload=()=>avatar.classList.add('has-photo');
      img.onerror=()=>img.remove();
      img.src=photo;avatar.appendChild(img);
    }
    host.appendChild(card);
    return host;
  }

  function sehRenderNativeTeamDirectory(main,rows){
    if(route().kind!=='teams'||!main)return;
    const query=String(sehNativeTeamDirectoryState.query||'').trim().toLocaleLowerCase('sv-SE');
    const league=String(sehNativeTeamDirectoryState.league||'all');
    const sortMode=String(sehNativeTeamDirectoryState.sort||'name');
    const collator=new Intl.Collator('sv',{sensitivity:'base',numeric:true});
    const filtered=(Array.isArray(rows)?rows:[]).filter(row=>{
      const comps=zeroArray(row.competitions);
      if(league!=='all'&&!comps.some(code=>String(code).toLocaleUpperCase('sv-SE')===league.toLocaleUpperCase('sv-SE')))return false;
      if(!query)return true;
      return [row.current_name,row.latest,row.top_player,...comps,sehWebAppTeamAliasSearchText(row.current_name,row.team_id)]
        .join(' ').toLocaleLowerCase('sv-SE').includes(query);
    }).slice();

    // V748: sortera ALLA filtrerade lag innan sidan om 50 väljs.
    if(sortMode==='rp'){
      filtered.sort((a,b)=>(sehTeamRpState.rows?.get(Number(a.team_id))?.rank||Infinity)-(sehTeamRpState.rows?.get(Number(b.team_id))?.rank||Infinity)||collator.compare(String(a.current_name||''),String(b.current_name||'')));
    }else if(sortMode==='name'){
      filtered.sort((a,b)=>collator.compare(String(a.current_name||''),String(b.current_name||'')));
    }else if(sortMode==='tournaments'){
      filtered.sort((a,b)=>(Number(b.league_appearances)||0)-(Number(a.league_appearances)||0)||collator.compare(String(a.current_name||''),String(b.current_name||'')));
    }else if(sortMode==='players'){
      filtered.sort((a,b)=>(Number(b.player_count)||0)-(Number(a.player_count)||0)||collator.compare(String(a.current_name||''),String(b.current_name||'')));
    }else{
      filtered.sort((a,b)=>{
        const ad=String(a.last_registered_at||'');
        const bd=String(b.last_registered_at||'');
        if(ad!==bd)return bd.localeCompare(ad);
        return collator.compare(String(a.current_name||''),String(b.current_name||''));
      });
    }

    const pageSize=50;
    const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
    let currentPage=Math.max(1,Math.min(totalPages,Number(sehNativeTeamDirectoryState.page)||1));
    sehNativeTeamDirectoryState.page=currentPage;
    const pageStart=(currentPage-1)*pageSize;
    const pageRows=filtered.slice(pageStart,pageStart+pageSize);

    let page=main.querySelector(':scope > .seh-native-team-directory');
    if(!page || !page.querySelector('.seh-native-team-directory-grid')){
      main.replaceChildren();
      main.classList.add('seh-native-team-directory-source');
      main.removeAttribute('aria-hidden');
      page=document.createElement('section');
      page.className='seh-native-team-directory';
      page.innerHTML=`
        <div class="seh-native-directory-head">
          <span class="seh-native-directory-kicker">LAGHISTORIA</span>
          <h1>Svenska lag</h1>
          <p>Klubbar, turneringar och spelare i svensk eHockey-historik.</p>
        </div>
        <div class="seh-mobile-filter-zone seh-native-team-directory-filter">
          <label class="players-field seh-filter-search-direct"><span>Sök lag</span><input type="search" placeholder="Sök lag, liga eller spelare" autocomplete="off"></label>
          <label class="players-field seh-filter-control-direct"><span>Liga</span><select data-seh-team-league><option value="all">Alla ligor</option></select></label>
          <label class="players-field seh-filter-control-direct"><span>Sortera</span><select data-seh-team-sort><option value="name">Namn A–Ö</option><option value="recent">Senast aktiva</option><option value="tournaments">Flest turneringar</option><option value="players">Flest spelare</option></select></label>
        </div>
        <div class="seh-team-counts-compact"><div class="seh-team-count-card"><span class="seh-team-count-label">Visar lag</span><span class="seh-team-count-value"></span></div></div>
        <div class="seh-mobile-team-list seh-native-team-directory-grid"></div>
        <nav class="seh-native-team-directory-pager" aria-label="Lagsidor">
          <button type="button" data-seh-team-prev>Föregående</button>
          <span class="seh-native-team-directory-pageinfo"></span>
          <button type="button" data-seh-team-next>Nästa</button>
        </nav>`;
      main.appendChild(page);

      const rerender=()=>sehRenderNativeTeamDirectory(main,sehNativeTeamDirectoryState.rows||[]);
      const input=page.querySelector('input[type="search"]');
      input.value=sehNativeTeamDirectoryState.query||'';
      input.addEventListener('input',()=>{
        sehNativeTeamDirectoryState.query=input.value;
        sehNativeTeamDirectoryState.page=1;
        rerender();
      });

      const leagueSelect=page.querySelector('[data-seh-team-league]');
      const leagueCodes=zeroUnique((Array.isArray(rows)?rows:[]).flatMap(row=>zeroArray(row.competitions)))
        .filter(Boolean).sort((a,b)=>collator.compare(String(a),String(b)));
      leagueCodes.forEach(code=>{
        const option=document.createElement('option');option.value=String(code);option.textContent=String(code);leagueSelect.appendChild(option);
      });
      leagueSelect.value=leagueCodes.includes(sehNativeTeamDirectoryState.league)?sehNativeTeamDirectoryState.league:'all';
      const applyLeague=()=>{
        sehNativeTeamDirectoryState.league=leagueSelect.value||'all';
        sehNativeTeamDirectoryState.page=1;
        rerender();
      };
      leagueSelect.addEventListener('change',applyLeague);
      leagueSelect.addEventListener('input',applyLeague);

      const sortSelect=page.querySelector('[data-seh-team-sort]');
      sortSelect.value=sehNativeTeamDirectoryState.sort||'name';
      const applySort=()=>{
        const next=sortSelect.value||'name';
        sehNativeTeamDirectoryState.sort=next;
        sehNativeTeamDirectoryState.page=1;
        // Android WebView can repaint slowly after a select closes. Render on the next frame.
        requestAnimationFrame(rerender);
      };
      sortSelect.addEventListener('change',applySort);
      sortSelect.addEventListener('input',applySort);

      page.querySelector('[data-seh-team-prev]').addEventListener('click',()=>{
        if((Number(sehNativeTeamDirectoryState.page)||1)<=1)return;
        sehNativeTeamDirectoryState.page=Math.max(1,(Number(sehNativeTeamDirectoryState.page)||1)-1);
        rerender();
        main.scrollTo({top:0,behavior:'smooth'});
      });
      page.querySelector('[data-seh-team-next]').addEventListener('click',()=>{
        sehNativeTeamDirectoryState.page=(Number(sehNativeTeamDirectoryState.page)||1)+1;
        rerender();
        main.scrollTo({top:0,behavior:'smooth'});
      });
    }

    const input=page.querySelector('input[type="search"]');
    if(input&&document.activeElement!==input&&input.value!==String(sehNativeTeamDirectoryState.query||''))input.value=String(sehNativeTeamDirectoryState.query||'');
    const leagueSelect=page.querySelector('[data-seh-team-league]');
    if(leagueSelect&&leagueSelect.value!==league)leagueSelect.value=league;
    const sortSelect=page.querySelector('[data-seh-team-sort]');
    if(sortSelect&&sortSelect.value!==sortMode)sortSelect.value=sortMode;

    page.querySelector('.seh-team-count-value').textContent=filtered.length>pageSize?`${pageRows.length.toLocaleString('sv-SE')} / ${filtered.length.toLocaleString('sv-SE')}`:filtered.length.toLocaleString('sv-SE');
    const grid=page.querySelector('.seh-native-team-directory-grid');
    grid.replaceChildren();
    if(!filtered.length){
      grid.innerHTML='<div class="seh-zero-player-loading">Inga lag hittades.</div>';
    }else{
      const fragment=document.createDocumentFragment();
      pageRows.forEach(row=>fragment.appendChild(sehMakeNativeTeamDirectoryCard(row)));
      grid.appendChild(fragment);
      sehSyncTeamRp();
    }

    // Recalculate after filters because the number of pages may have changed.
    const finalTotalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
    currentPage=Math.max(1,Math.min(finalTotalPages,Number(sehNativeTeamDirectoryState.page)||1));
    sehNativeTeamDirectoryState.page=currentPage;
    const pager=page.querySelector('.seh-native-team-directory-pager');
    if(pager){
      pager.hidden=filtered.length<=pageSize;
      pager.style.setProperty('display',filtered.length<=pageSize?'none':'grid','important');
      const prev=pager.querySelector('[data-seh-team-prev]');
      const next=pager.querySelector('[data-seh-team-next]');
      if(prev)prev.disabled=currentPage<=1;
      if(next)next.disabled=currentPage>=finalTotalPages;
      const info=pager.querySelector('.seh-native-team-directory-pageinfo');
      if(info){
        const first=filtered.length?pageStart+1:0;
        const last=Math.min(pageStart+pageSize,filtered.length);
        info.innerHTML=`<strong>Sida ${currentPage} av ${finalTotalPages}</strong>${first.toLocaleString('sv-SE')}–${last.toLocaleString('sv-SE')} av ${filtered.length.toLocaleString('sv-SE')}`;
      }
    }
  }

  function sehEnsureDirectTeamDirectory(){
    if(window.__SEH_DESKTOP_DEV__||route().kind!=='teams')return false;
    const main=window.__SEH_DESKTOP_DEV__?document.querySelector('main'):sehNativeDirectoryHost('teams');
    if(!main)return false;
    // The website Laghistoria page is never used; Android renders into its own root.
    if(main.dataset.sehNativeTeamDirectory==='1' && !main.querySelector('.seh-native-team-directory')){
      delete main.dataset.sehNativeTeamDirectory;
    }
    if(main.dataset.sehNativeTeamDirectory!=='1'){
      main.dataset.sehNativeTeamDirectory='1';
      main.replaceChildren();
      main.innerHTML='<section class="seh-native-team-directory"><div class="seh-native-directory-head"><span class="seh-native-directory-kicker">LAGHISTORIA</span><h1>Svenska lag</h1><p>Laddar svenska lag…</p></div><div class="seh-zero-player-loading">Laddar lag…</div></section>';
    }
    if(Array.isArray(sehNativeTeamDirectoryState.rows)){
      sehRenderNativeTeamDirectory(main,sehNativeTeamDirectoryState.rows);
      return true;
    }
    sehLoadNativeTeamDirectory().then(rows=>{
      if(route().kind==='teams')sehRenderNativeTeamDirectory(window.__SEH_DESKTOP_DEV__?document.querySelector('main'):sehNativeDirectoryHost('teams'),rows);
    }).catch(()=>{
      if(route().kind!=='teams')return;
      const current=window.__SEH_DESKTOP_DEV__?document.querySelector('main'):sehNativeDirectoryHost('teams');
      if(current){
        current.innerHTML='<section class="seh-native-team-directory"><div class="seh-native-directory-head"><span class="seh-native-directory-kicker">LAGHISTORIA</span><h1>Svenska lag</h1><p>Lagen kunde inte laddas.</p></div><div class="seh-zero-player-loading"><button type="button" data-seh-team-retry>Försök igen</button></div></section>';
        current.querySelector('[data-seh-team-retry]')?.addEventListener('click',()=>{
          sehNativeTeamDirectoryState.rows=null;
          sehNativeTeamDirectoryState.promise=null;
          sehNativeTeamDirectoryState.error=null;
          delete current.dataset.sehNativeTeamDirectory;
          sehEnsureDirectTeamDirectory();
        });
      }
    });
    return true;
  }

  function adaptTeamCards(){
    if(route().kind!=='teams')return;
    if(!window.__SEH_DESKTOP_DEV__){sehEnsureDirectTeamDirectory();return;}

    const mainEl=document.querySelector('main');
    if(!mainEl)return;

    hideTeamSummaryBlock(mainEl);

    [...mainEl.querySelectorAll('p,div,span')].forEach(el=>{
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(/^Uppdaterad\s+\d{4}-\d{2}-\d{2}/i.test(t) && t.length<80){
        el.classList.add('seh-team-updated-line');
      }
    });

    [...mainEl.querySelectorAll('p,div,span')].forEach(el=>{
      if(el.closest('.seh-team-counts-compact,.seh-mobile-team-card,.seh-compact-team'))return;
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(/^\d+\s+svenska lag$/i.test(t)){
        el.classList.add('seh-team-old-count-hide');
      }
    });

    // Förbered filter/toppen en gång per DOM.
    if(mainEl.dataset.sehTeamPrepared!=='1'){
      mainEl.dataset.sehTeamPrepared='1';

      const controls=[...mainEl.querySelectorAll('input,select')].filter(visible);
      if(controls.length>=2){
        const zone=commonAncestor(controls.slice(0,Math.min(controls.length,6)));
        if(zone && zone!==document.body && zone.tagName!=='MAIN'){
          zone.classList.add('seh-mobile-filter-zone');

          controls.forEach(control=>{
            let direct=control;
            while(direct.parentElement && direct.parentElement!==zone) direct=direct.parentElement;
            if(direct.parentElement!==zone) direct=control;

            direct.classList.add('seh-filter-control-direct');
            if(control.matches('input[type="search"],input[type="text"]')){
              direct.classList.add('seh-filter-search-direct');
              zone.prepend(direct);
            }

            if(control.matches('select')){
              const optionTexts=[...control.options].map(option=>(option.textContent||'').replace(/\s+/g,' ').trim());
              const isTeamNameMode=optionTexts.some(text=>/^Visa via lagnamn$/i.test(text))
                && optionTexts.some(text=>/^Visa senaste turneringsnamn$/i.test(text));
              const isCardMode=optionTexts.some(text=>/^Hela kort$/i.test(text));

              if(isTeamNameMode || isCardMode){
                direct.style.setProperty('display','none','important');
              }
            }
          });

          if(zone.parentElement!==mainEl || mainEl.firstElementChild!==zone){
            mainEl.prepend(zone);
          }
        }
      }

      [...mainEl.querySelectorAll('button,a')].forEach(el=>{
        const t=(el.textContent||'').replace(/\s+/g,' ').trim();
        if(/^Uppdatera data$/i.test(t)) el.classList.add('seh-team-update-button');
      });

      const teamTitle=[...mainEl.querySelectorAll('h1,h2')].find(el=>
        /^Svenska lag$/i.test((el.textContent||'').replace(/\s+/g,' ').trim())
      );
      const kicker=[...mainEl.querySelectorAll('*')].find(el=>
        /^HISTORIK$/i.test((el.textContent||'').trim())
      );

      if(teamTitle) teamTitle.classList.add('seh-team-title-hide');
      if(kicker) kicker.classList.add('seh-team-kicker');
    }

    const cards=new Set();

    /*
     * V702 – Desktop Dev recovery.
     *
     * Desktop Dev has a stable source contract:
     *   .dev-team-source-card
     *
     * Prefer those explicit cards before the older heuristic scanner. On a
     * cold Desktop Dev start the summary/filter DOM can be adapted before all
     * metadata has arrived, and the heuristic could occasionally miss every
     * team card. That left Laghistoria with counts but an empty result area.
     *
     * Production web does not use this class, so this is a no-op there.
     */
    [...mainEl.querySelectorAll('.dev-team-source-card')].forEach(card=>{
      const hasName=!!card.querySelector('h2,h3,h4');
      const txt=(card.innerText||'').replace(/\s+/g,' ').trim();
      if(
        hasName &&
        /\bSPELARE\b/i.test(txt) &&
        /\bTURNERINGAR\b/i.test(txt)
      ){
        cards.add(card);
      }
    });

    // V4.31: hitta lagkorten från deras innehåll i stället för att vara beroende
    // av länken "Öppna laghistoriken". Den länken finns inte konsekvent i alla
    // renderade kort/lägen.
    const headings=[...mainEl.querySelectorAll('h2,h3,h4')];

    headings.forEach(heading=>{
      const headingText=(heading.textContent||'').replace(/\s+/g,' ').trim();
      if(!headingText || /^(Svenska lag|Laghistoria)$/i.test(headingText))return;

      let node=heading.parentElement;
      let depth=0;

      while(node && node!==mainEl && node!==document.body && depth<9){
        const txt=(node.innerText||'').replace(/\s+/g,' ').trim();

        const hasPlayers=/\bSPELARE\b/i.test(txt);
        const hasTournaments=/\bTURNERINGAR\b/i.test(txt);

        let extraStats=0;
        [
          /\bDIVISIONER\b/i,
          /\bMATCHER\b/i,
          /\bRECORD\b/i,
          /\bVINST%\b/i,
          /\bGF[–-]GA\b/i,
          /\bSLUTSPEL\b/i,
          /\+\/-/i
        ].forEach(re=>{ if(re.test(txt)) extraStats++; });

        const hasTeamMeta=/\bTopp spelare\s*:/i.test(txt) || /\bSenast\s*:/i.test(txt);
        const openCount=(txt.match(/Öppna laghistoriken/gi)||[]).length;

        // Ett riktigt lagkort har Spelare + Turneringar och dessutom antingen
        // minst två av de gamla statistikraderna eller Senast/Topp spelare.
        // Begränsad textmängd och max en "Öppna"-länk hindrar att list-wrappern väljs.
        if(
          hasPlayers &&
          hasTournaments &&
          (extraStats>=2 || hasTeamMeta) &&
          openCount<=1 &&
          txt.length<1600
        ){
          cards.add(node);
          break; // minsta matchande ancestor
        }

        node=node.parentElement;
        depth++;
      }
    });

    // Fallback för kort där lagets namn inte ligger i en heading.
    if(cards.size===0){
      const leaves=[...mainEl.querySelectorAll('a,button')].filter(el=>
        /^Öppna laghistoriken(?:\s*→)?$/i.test((el.textContent||'').replace(/\s+/g,' ').trim())
      );

      leaves.forEach(leaf=>{
        let node=leaf.parentElement;
        let depth=0;
        while(node && node!==mainEl && node!==document.body && depth<9){
          const txt=(node.innerText||'').replace(/\s+/g,' ').trim();
          if(
            /\bSPELARE\b/i.test(txt) &&
            /\bTURNERINGAR\b/i.test(txt) &&
            (txt.match(/Öppna laghistoriken/gi)||[]).length===1 &&
            txt.length<1600
          ){
            cards.add(node);
            break;
          }
          node=node.parentElement;
          depth++;
        }
      });
    }

    if(!cards.size){
      if(
        mainEl.querySelector('.dev-team-source-list') &&
        !mainEl.dataset.sehTeamCardRecoveryQueued
      ){
        mainEl.dataset.sehTeamCardRecoveryQueued='1';
        setTimeout(()=>{
          if(route().kind!=='teams')return;
          try{
            mainEl.dataset.sehTeamCardRecoveryQueued='';
            adaptTeamCards();
          }catch(_){}
        },180);
      }
      return;
    }

    mainEl.dataset.sehTeamCardRecoveryQueued='';

    cards.forEach(card=>{
      card.classList.add('seh-mobile-team-card');
      rebuildTeamCard(card);
    });

    // Sätt tvåkolumnsgrid på varje gemensam parent-grupp.
    const byParent=new Map();
    cards.forEach(card=>{
      const p=card.parentElement;
      if(!p)return;
      if(!byParent.has(p))byParent.set(p,[]);
      byParent.get(p).push(card);
    });

    byParent.forEach(group=>{
      if(group.length>=2) group[0].parentElement.classList.add('seh-mobile-team-list');
    });

    compactTeamResultsLayout(mainEl,cards);
  }

  function ensureHistoryFilterScrollHint(bar){
    if(!bar)return;

    // V687: lägg scrollindikatorerna UTANFÖR själva scrollcontainern.
    // Den tidigare högerpilen låg sist i den scrollbara raden och syntes därför
    // inte förrän man nästan redan hade scrollat dit.
    bar.querySelectorAll(':scope > .seh-history-scroll-hint').forEach(node=>node.remove());

    let shell=bar.parentElement?.classList?.contains('seh-history-filter-shell')
      ? bar.parentElement
      : null;

    if(!shell){
      shell=document.createElement('div');
      shell.className='seh-history-filter-shell';
      bar.parentNode?.insertBefore(shell,bar);
      shell.appendChild(bar);
    }

    let left=shell.querySelector(':scope > .seh-history-scroll-hint.is-left');
    if(!left){
      left=document.createElement('span');
      left.className='seh-history-scroll-hint is-left is-hidden';
      left.setAttribute('aria-hidden','true');
      left.textContent='‹';
      shell.appendChild(left);
    }

    let right=shell.querySelector(':scope > .seh-history-scroll-hint.is-right');
    if(!right){
      right=document.createElement('span');
      right.className='seh-history-scroll-hint is-right is-hidden';
      right.setAttribute('aria-hidden','true');
      right.textContent='›';
      shell.appendChild(right);
    }

    const update=()=>{
      const max=Math.max(0,bar.scrollWidth-bar.clientWidth);
      const hasOverflow=max>3;
      const atStart=!hasOverflow || bar.scrollLeft<=3;
      const atEnd=!hasOverflow || bar.scrollLeft>=max-3;

      shell.classList.toggle('has-overflow',hasOverflow);
      left.classList.toggle('is-hidden',atStart);
      right.classList.toggle('is-hidden',atEnd);
    };

    if(!bar.dataset.sehScrollHintBound){
      bar.dataset.sehScrollHintBound='1';
      bar.addEventListener('scroll',update,{passive:true});
      window.addEventListener('resize',update,{passive:true});
    }

    requestAnimationFrame(update);
    setTimeout(update,80);
  }


  const sehProfileHistoryDetailCache=(window.__SEH_PROFILE_HISTORY_DETAIL_CACHE__ instanceof Map)
    ? window.__SEH_PROFILE_HISTORY_DETAIL_CACHE__
    : (window.__SEH_PROFILE_HISTORY_DETAIL_CACHE__=new Map());

  function sehProfileHistoryIdentity(main){
    const hash=String(location.hash||'');
    const match=hash.match(/^#\/spelare\/([^/?#]+)/i);
    let routeKey='';
    try{routeKey=decodeURIComponent(match?.[1]||'').trim();}catch(_){routeKey=String(match?.[1]||'').trim();}
    const name=(main?.querySelector('.player-profile-name')?.textContent||main?.querySelector('h1')?.textContent||'')
      .replace(/\s+/g,' ').trim();

    // V6.07: gamertag/route är inte alltid samma som Supabase player_key.
    // Läs därför SportsGamer-ID direkt från profilens SportsGamer-länk och låt
    // history-RPC:n lösa rätt canonical player_key. Detta täcker t.ex. l-Furyan-l.
    let sportsGamerPlayerId=0;
    const sgLinks=[...main?.querySelectorAll?.('a[href*="sportsgamer.gg/players/"],a[href*="nhlgamer.com/players/"]')||[]];
    for(const link of sgLinks){
      const href=String(link.getAttribute('href')||link.href||'');
      const idMatch=href.match(/\/players\/(\d+)/i);
      if(idMatch){sportsGamerPlayerId=Number(idMatch[1])||0;break;}
    }

    let explicitPlayerKey='';
    try{
      const hashQuery=hash.includes('?')?hash.slice(hash.indexOf('?')+1):'';
      explicitPlayerKey=new URLSearchParams(hashQuery).get('pk')||'';
    }catch(_){explicitPlayerKey='';}
    explicitPlayerKey=String(explicitPlayerKey||'').trim();

    // V716: Android can open a player through a clean slug without the ?pk=
    // query surviving every navigation path. Reuse the already-resolved
    // directory key from the fast profile navigation cache when available.
    // This keeps the RPC identity identical to Desktop Dev instead of making
    // the mobile WebView depend on slug/gamertag fallback matching.
    if(!explicitPlayerKey){
      try{
        const fast=sehReadFastProfileNav?.();
        const fastKey=String(fast?.key||fast?.playerKey||fast?.player_key||'').trim();
        if(fastKey)explicitPlayerKey=fastKey;
      }catch(_){}
    }

    return {
      routeKey,
      explicitPlayerKey,
      name,
      sportsGamerPlayerId,
      cacheKey:`${(explicitPlayerKey||routeKey).toLowerCase()}|${rankingNameKey(name)}|sg:${sportsGamerPlayerId||0}`
    };
  }

  const sehProfileTeamMeritCache=(window.__SEH_PROFILE_TEAM_MERIT_CACHE__ instanceof Map)
    ? window.__SEH_PROFILE_TEAM_MERIT_CACHE__
    : (window.__SEH_PROFILE_TEAM_MERIT_CACHE__=new Map());
  const sehProfilePersonalMeritCache=(window.__SEH_PROFILE_PERSONAL_MERIT_CACHE__ instanceof Map)
    ? window.__SEH_PROFILE_PERSONAL_MERIT_CACHE__
    : (window.__SEH_PROFILE_PERSONAL_MERIT_CACHE__=new Map());

  function sehResolvedProfileMeritIdentity(main,historyRows=[]){
    const identity=sehProfileHistoryIdentity(main);
    const rows=Array.isArray(historyRows)?historyRows:[];
    const first=rows.find(row=>row && (
      Number(row.effective_sports_gamer_player_id)>0 ||
      String(row.player_key||'').trim() ||
      String(row.display_gamertag||'').trim() ||
      String(row.sports_gamer_player_url||'').trim()
    ))||null;

    let sportsGamerPlayerId=Number(identity?.sportsGamerPlayerId)||0;
    if(!sportsGamerPlayerId)sportsGamerPlayerId=Number(first?.effective_sports_gamer_player_id)||0;
    if(!sportsGamerPlayerId){
      const url=String(first?.sports_gamer_player_url||'');
      const match=url.match(/\/players\/(\d+)/i);
      if(match)sportsGamerPlayerId=Number(match[1])||0;
    }

    const playerKey=String(identity?.explicitPlayerKey||first?.player_key||'').trim();
    const name=String(identity?.name||first?.display_gamertag||identity?.routeKey||'').replace(/\s+/g,' ').trim();
    return {...identity,sportsGamerPlayerId,playerKey,name};
  }

  async function sehFetchProfileMeritRows(table,select,identity,order,label){
    const cfg=window.EHOCKEY_CONFIG||{};
    const supabaseUrl=String(cfg.supabaseUrl||'https://oujqnvrczdavqbqaavuh.supabase.co').replace(/\/+$/,'');
    const publishableKey=String(cfg.supabasePublishableKey||'sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z').trim();
    const url=new URL(`${supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set('select',select);
    if(Number(identity?.sportsGamerPlayerId)>0){
      url.searchParams.set('sports_gamer_player_id',`eq.${Number(identity.sportsGamerPlayerId)}`);
    }else if(String(identity?.playerKey||'').trim()){
      url.searchParams.set('player_key',`eq.${String(identity.playerKey).trim()}`);
    }else if(String(identity?.name||'').trim()){
      url.searchParams.set('display_gamertag',`eq.${String(identity.name).trim()}`);
    }else{
      return [];
    }
    if(order)url.searchParams.set('order',order);
    url.searchParams.set('limit','100');

    const retryDelays=[0,350,900,1800];
    let lastError=null;
    for(let attempt=0;attempt<retryDelays.length;attempt++){
      if(retryDelays[attempt])await new Promise(resolve=>setTimeout(resolve,retryDelays[attempt]));
      try{
        const response=await fetch(url.toString(),{
          headers:{apikey:publishableKey,Accept:'application/json'},
          cache:'no-store'
        });
        if(!response.ok){
          const error=new Error(`${label} HTTP ${response.status}`);
          error.status=response.status;
          throw error;
        }
        const rows=await response.json();
        if(!Array.isArray(rows))throw new Error(`Ogiltigt ${label.toLowerCase()}svar`);
        return rows;
      }catch(error){
        lastError=error;
      }
    }
    throw lastError||new Error(`${label} kunde inte hämtas`);
  }

  function sehLoadProfileTeamMerits(main,historyRows=[]){
    const identity=sehResolvedProfileMeritIdentity(main,historyRows);
    if(!identity?.name && !identity?.sportsGamerPlayerId && !identity?.playerKey)return Promise.resolve([]);

    const cacheKey=`sg:${identity.sportsGamerPlayerId||0}|pk:${identity.playerKey||''}|${rankingNameKey(identity.name||identity.routeKey||'')}`;
    if(sehProfileTeamMeritCache.has(cacheKey))return Promise.resolve(sehProfileTeamMeritCache.get(cacheKey));

    return (async()=>{
      try{
        const rows=await sehFetchProfileMeritRows(
          'ehockey_player_merits_cache_v1',
          'competition_code,season_label,division,team_name,placement,merit_type,sort_date',
          identity,
          'sort_date.desc.nullslast,placement.asc',
          'Meriter'
        );

        const seen=new Set();
        const cleanRows=rows.filter(row=>{
          const key=[
            String(row?.season_label||'').trim().toLowerCase(),
            String(row?.team_name||'').trim().toLowerCase(),
            Number(row?.placement)||0,
            String(row?.competition_code||'').trim().toLowerCase()
          ].join('|');
          if(!key.replace(/\|/g,''))return false;
          if(seen.has(key))return false;
          const meritHay=[row?.season_label,row?.division,row?.competition_code].filter(Boolean).join(' ');
          if(/\bqualifier\b|\bkval(?:et|en|ificering|ifikation)?\b/i.test(meritHay))return false;
          seen.add(key);
          return ['champion','runner_up','bronze'].includes(String(row?.merit_type||'').toLowerCase());
        });

        sehProfileTeamMeritCache.set(cacheKey,cleanRows);
        return cleanRows;
      }catch(error){
        console.warn('[Svensk eHockey] Kunde inte hämta lagmeriter direkt från Supabase',error);
        return [];
      }
    })();
  }

  function sehLoadProfilePersonalMerits(main,historyRows=[]){
    const identity=sehResolvedProfileMeritIdentity(main,historyRows);
    if(!identity?.name && !identity?.sportsGamerPlayerId && !identity?.playerKey)return Promise.resolve([]);

    const cacheKey=`sg:${identity.sportsGamerPlayerId||0}|pk:${identity.playerKey||''}|${rankingNameKey(identity.name||identity.routeKey||'')}`;
    if(sehProfilePersonalMeritCache.has(cacheKey))return Promise.resolve(sehProfilePersonalMeritCache.get(cacheKey));

    return (async()=>{
      try{
        const rows=await sehFetchProfileMeritRows(
          'ehockey_player_personal_merits_cache_v1',
          'competition_code,season_label,league_name,division,merit_code,merit_label,display_merit_label,merit_value,merit_value_unit,tournament_label,merit_text,sort_date',
          identity,
          'sort_date.desc.nullslast,merit_code.asc',
          'Personliga meriter'
        );
        const seen=new Set();
        const cleanRows=rows.filter(row=>{
          const key=[
            String(row?.merit_code||'').trim().toLowerCase(),
            String(row?.tournament_label||row?.league_name||row?.season_label||'').trim().toLowerCase(),
            String(row?.merit_value??'').trim()
          ].join('|');
          if(!key.replace(/\|/g,''))return false;
          if(seen.has(key))return false;
          seen.add(key);
          return true;
        });
        sehProfilePersonalMeritCache.set(cacheKey,cleanRows);
        return cleanRows;
      }catch(error){
        console.warn('[Svensk eHockey] Kunde inte hämta personliga meriter direkt från Supabase',error);
        return [];
      }
    })();
  }

  function sehNativeMeritIcon(type){
    const key=String(type||'').toLowerCase();
    if(key==='champion')return '🏆';
    if(key==='runner_up')return '🥈';
    if(key==='bronze')return '🥉';
    return '★';
  }

  function sehNativePersonalMeritIcon(row){
    const code=String(row?.merit_code||'').trim().toUpperCase();
    const goaliePlacement=code.match(/^GOALIE_(\d+)$/);
    if(goaliePlacement)return goaliePlacement[1];
    if(/GOALS/.test(code))return 'M';
    if(/ASSIST/.test(code))return 'A';
    if(/POINT/.test(code))return 'P';
    return '★';
  }

  function sehNativePersonalMeritValue(row){
    const raw=row?.merit_value;
    const unit=String(row?.merit_value_unit||'').trim();
    if(raw===null || raw===undefined || raw==='')return '';
    const n=Number(raw);
    const value=Number.isFinite(n)
      ? n.toLocaleString('sv-SE',{maximumFractionDigits:Number.isInteger(n)?0:2})
      : String(raw).trim();
    return [value,unit].filter(Boolean).join(' ');
  }

  function sehCompactMeritLabel(value){
    let label=String(value||'').replace(/\s+/g,' ').trim();
    if(!label)return label;
    const replacements=[
      [/\bWestern European Championship League\b/gi,'WECL'],
      [/\bXbox European Championship League\b/gi,'XECL'],
      [/\bEuropean Championship League\b/gi,'ECL'],
      [/\bGerman Championship League\b/gi,'GCL'],
      [/\bSwedish Championship League\b/gi,'SCL'],
      [/\bRussian Championship League\b/gi,'RCL'],
      [/\bFinnish Championship League\b/gi,'FCL'],
      [/\bCzech Slovak Championship League\b/gi,'CSCL'],
      [/\bNorth American Championship League\b/gi,'NACL']
    ];
    replacements.forEach(([pattern,short])=>{label=label.replace(pattern,short);});
    label=label
      .replace(/\b6v6\b/gi,' ')
      .replace(/\b(SCL|SEC|SM|FCL|GCL|RCL|NACL|WECL|XECL)\s*-\s*(20\d{2})\b/gi,'$1 $2')
      .replace(/\s+-\s+/g,' - ')
      .replace(/\s{2,}/g,' ')
      .trim();
    return label;
  }

  function sehNativeMeritPlacement(row){
    const placement=Number(row?.placement)||0;
    if(placement===1)return 'Mästare';
    if(placement===2)return '2:a';
    if(placement===3)return '3:a';
    return placement>0?`${placement}:a`:'Merit';
  }


  const sehVerifiedTeamAliasState=window.__SEH_VERIFIED_TEAM_ALIAS_STATE__ || (
    window.__SEH_VERIFIED_TEAM_ALIAS_STATE__={
      rows:null,
      aliasMap:null,
      promise:null,
      error:null,
      version:0
    }
  );

  function sehVerifiedTeamAliasKey(value){
    return String(value||'')
      .normalize('NFKC')
      .replace(/\s+/g,' ')
      .trim()
      .toLocaleLowerCase('sv-SE');
  }

  function sehBuildVerifiedTeamAliasMap(rows){
    const map=new Map();

    (Array.isArray(rows)?rows:[]).forEach(row=>{
      const teamId=Number(row?.team_id)||0;
      const currentName=String(row?.current_name||'').trim();
      if(!currentName)return;

      const names=[
        currentName,
        ...(Array.isArray(row?.historical_names)?row.historical_names:[]),
        ...(Array.isArray(row?.names_used_in_leagues)?row.names_used_in_leagues:[])
      ];

      names.forEach(name=>{
        const key=sehVerifiedTeamAliasKey(name);
        if(!key)return;

        if(!map.has(key)){
          map.set(key,row);
          return;
        }

        const existing=map.get(key);

        // An alias that occurs under more than one local club is ambiguous.
        // Do not guess which club it belongs to.
        if(existing && Number(existing?.team_id)!==teamId){
          map.set(key,null);
        }
      });
    });

    return map;
  }

  function sehLoadVerifiedTeamAliases(){
    const state=sehVerifiedTeamAliasState;
    if(state.aliasMap instanceof Map || state.promise)return state;

    const cfg=window.EHOCKEY_CONFIG||{};
    const supabaseUrl=String(cfg.supabaseUrl||'https://oujqnvrczdavqbqaavuh.supabase.co').replace(/\/+$/,'');
    const publishableKey=String(cfg.supabasePublishableKey||'sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z').trim();

    state.promise=(async()=>{
      try{
        const url=new URL(`${supabaseUrl}/rest/v1/v_local_team_list`);
        url.searchParams.set(
          'select',
          'team_id,current_name,historical_names,names_used_in_leagues,logo_url,profile_url'
        );
        url.searchParams.set('limit','1000');

        const response=await fetch(url.toString(),{
          headers:{apikey:publishableKey,Accept:'application/json'},
          cache:'no-store'
        });
        if(!response.ok)throw new Error(`Klubbalias HTTP ${response.status}`);

        const rows=await response.json();
        if(!Array.isArray(rows))throw new Error('Ogiltigt svar från klubbalias');

        state.rows=rows;
        state.aliasMap=sehBuildVerifiedTeamAliasMap(rows);
        state.error=null;
        state.version+=1;

        setTimeout(()=>{
          try{scheduleAdaptiveContent(0);}catch(_){}
        },0);

        return rows;
      }catch(error){
        state.error=error;
        state.rows=[];
        state.aliasMap=null;
        state.version+=1;
        console.warn('[Svensk eHockey] Kunde inte hämta verifierade klubbalias',error);
        return [];
      }finally{
        state.promise=null;
      }
    })();

    return state;
  }

  function sehVerifiedClubForHistoricalName(name){
    const key=sehVerifiedTeamAliasKey(name);
    if(!key)return null;

    const state=sehLoadVerifiedTeamAliases();
    if(!(state.aliasMap instanceof Map))return null;

    const row=state.aliasMap.get(key);
    return row || null;
  }

  function sehVerifiedTeamLogoUrl(displayName,club=null){
    const canonicalName=String(club?.current_name||displayName||'').trim();
    const rawLogo=String(club?.logo_url||'').trim();
    return sehWebAppTeamLogo(rawLogo,canonicalName);
  }

  function sehHistoryCompetitionCode(row){
    const raw=String(row?.competition_code||'').trim().toUpperCase();
    const hay=[
      row?.competition_code,
      row?.competition_name,
      row?.season_label,
      row?.league_name
    ].filter(Boolean).join(' ').toUpperCase();

    if(/\bECL\b|EUROPEAN CHAMPIONSHIP LEAGUE/.test(hay))return 'ECL';
    if(/\bSEC\b|SVENSKA EHOCKEY CUPEN/.test(hay))return 'SEC';
    if(/\bSCL\b|SWEDISH CHAMPIONSHIP LEAGUE/.test(hay))return 'SCL';
    if(/\bFCL\b|FINNISH CHAMPIONSHIP LEAGUE/.test(hay))return 'FCL';
    if(/\bGCL\b|GERMAN CHAMPIONSHIP LEAGUE/.test(hay))return 'GCL';
    if(/\bRCL\b|RUSSIAN CHAMPIONSHIP LEAGUE/.test(hay))return 'RCL';
    if(/\bESHL\b/.test(hay))return 'eSHL';
    if(/\bITHL\b/.test(hay))return 'ITHL';
    if(/\bLGEL\b/.test(hay))return 'LGEL';
    if(/\bIS CUP\b/.test(hay))return 'IS Cup';
    if(/\bSM\b|EHOCKEY SM/.test(hay))return 'SM';

    if(raw && raw!=='SPORTSGAMER')return raw;
    return raw==='SPORTSGAMER'?'SG':'';
  }

  function sehVerifiedPlayerTeamGroups(detailRows){
    /*
     * V696:
     * Historical grouping must never depend on the alias request succeeding.
     * Build the Lag tab immediately from team_name_in_tournament.
     *
     * If verified aliases are available they are applied.
     * If not, historical names remain separate until alias data arrives.
     * This prevents the old SportsGamer-ID fallback from showing e.g.
     * "Last Dance – 15 säsonger".
     */
    sehLoadVerifiedTeamAliases();

    const groups=new Map();

    (Array.isArray(detailRows)?detailRows:[]).forEach(row=>{
      /*
       * Historical identity is ALWAYS the name used in that tournament.
       * team_current_name/team_external_id are never grouping keys.
       */
      const historicalName=String(
        row?.team_name_in_tournament||
        row?.team_current_name||
        ''
      ).replace(/\s+/g,' ').trim();

      if(!historicalName)return;

      const club=sehVerifiedClubForHistoricalName(historicalName);
      const displayName=String(club?.current_name||historicalName).trim();
      const groupKey=club
        ? `club:${sehVerifiedTeamAliasKey(displayName)}`
        : `historic:${sehVerifiedTeamAliasKey(historicalName)}`;

      let group=groups.get(groupKey);
      if(!group){
        group={
          name:displayName,
          club:club||null,
          seasons:new Set(),
          leagues:new Set(),
          rows:[],
          safeLinkTeamId:0
        };
        groups.set(groupKey,group);
      }

      const leagueId=String(row?.league_id||row?.external_league_id||'').trim();
      const seasonLabel=String(
        row?.season_label||
        row?.league_name||
        row?.competition_name||
        ''
      ).replace(/\s+/g,' ').trim();

      group.seasons.add(
        leagueId
          ? `league:${leagueId}`
          : `season:${sehVerifiedTeamAliasKey(seasonLabel)}|${sehVerifiedTeamAliasKey(historicalName)}`
      );

      const competition=sehHistoryCompetitionCode(row);
      if(competition)group.leagues.add(competition);
      group.rows.push(row);

      if(club?.team_id){
        group.safeLinkTeamId=Number(club.team_id)||0;
      }else{
        /*
         * Linking by an ID is safe only when the historical tournament name is
         * exactly the same as the current name. The ID still never participates
         * in grouping.
         */
        const currentName=String(row?.team_current_name||'').replace(/\s+/g,' ').trim();
        const rowTeamId=Number(row?.team_id)||0;
        if(
          rowTeamId>0 &&
          sehVerifiedTeamAliasKey(currentName)===sehVerifiedTeamAliasKey(historicalName)
        ){
          group.safeLinkTeamId=rowTeamId;
        }
      }
    });

    const leagueOrder=[
      'ECL','SCL','SEC','SM','eSHL','FCL','GCL','RCL','ITHL','LGEL','IS Cup','SG'
    ];

    return [...groups.values()]
      .map(group=>({
        ...group,
        seasonCount:group.seasons.size,
        leagueList:[...group.leagues].sort((a,b)=>{
          const ai=leagueOrder.indexOf(a);
          const bi=leagueOrder.indexOf(b);
          if(ai!==-1 || bi!==-1){
            if(ai===-1)return 1;
            if(bi===-1)return -1;
            if(ai!==bi)return ai-bi;
          }
          return a.localeCompare(b,'sv');
        })
      }))
      .sort((a,b)=>
        (b.seasonCount-a.seasonCount) ||
        a.name.localeCompare(b.name,'sv')
      );
  }

  function sehDirectPlayerProfilePng(rows,heroPhoto){
    const history=Array.isArray(rows)?rows:[];

    // The native/web-app hero uses the small WebP portrait first. The site's
    // global image error handler falls back to the original PNG if needed.
    for(const row of history){
      const id=Number(row?.effective_sports_gamer_player_id)||0;
      if(id>0)return sehWebAppPlayerImage('',String(id));
    }

    for(const row of history){
      const url=String(row?.sports_gamer_player_url||'').trim();
      const match=url.match(/\/players\/(\d+)(?:\/|$|[?#])/i);
      if(match)return sehWebAppPlayerImage('',match[1]);
    }

    for(const row of history){
      const image=String(row?.player_image||'').trim();
      if(image)return sehWebAppPlayerImage(image);
    }

    if(heroPhoto)return zeroProfilePngFromHero(heroPhoto);
    return sehWebAppPlayerImage('');
  }

  function sehLoadProfileHistoryDetails(main){
    const identity=sehProfileHistoryIdentity(main);
    if(!identity.routeKey && !identity.name)return null;

    let state=sehProfileHistoryDetailCache.get(identity.cacheKey);
    if(state)return state;

    state={rows:null,promise:null,error:null,version:0};
    sehProfileHistoryDetailCache.set(identity.cacheKey,state);

    // V650: webbsidan har redan hämtat samma history-RPC för att bygga sin
    // käll-DOM. Återanvänd resultatet i native-profilen i stället för att göra
    // ett andra identiskt nätverksanrop.
    const shared=window.__SEH_ACTIVE_PLAYER_HISTORY__;
    const wantedKey=String(identity.explicitPlayerKey||identity.routeKey||'').trim().toLowerCase();
    const sharedKey=String(shared?.playerKey||'').trim().toLowerCase();
    if(wantedKey && sharedKey===wantedKey && Array.isArray(shared?.rows)){
      state.rows=shared.rows;
      state.version=1;
      state.error=null;
      return state;
    }

    const cfg=window.EHOCKEY_CONFIG||{};
    const supabaseUrl=String(cfg.supabaseUrl||'https://oujqnvrczdavqbqaavuh.supabase.co').replace(/\/+$/,'');
    const publishableKey=String(cfg.supabasePublishableKey||'sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z').trim();

    state.promise=(async()=>{
      const endpoint=`${supabaseUrl}/rest/v1/rpc/get_ehockey_player_history_cache_v26`;
      const payload={
        p_player_key:identity.explicitPlayerKey||identity.routeKey||null,
        p_sports_gamer_player_id:identity.sportsGamerPlayerId||null,
        p_display_gamertag:identity.name||null
      };
      const retryDelays=[0,350,900,1800];
      let lastError=null;

      try{
        for(let attempt=0;attempt<retryDelays.length;attempt++){
          if(retryDelays[attempt])await new Promise(resolve=>setTimeout(resolve,retryDelays[attempt]));
          try{
            const response=await fetch(endpoint,{
              method:'POST',
              headers:{
                apikey:publishableKey,
                Accept:'application/json',
                'Content-Type':'application/json'
              },
              cache:'no-store',
              body:JSON.stringify(payload)
            });
            if(!response.ok){
              const error=new Error(`Spelarhistorik HTTP ${response.status}`);
              error.status=response.status;
              throw error;
            }
            const rows=await response.json();
            if(!Array.isArray(rows))throw new Error('Ogiltigt svar från spelarhistoriken');
            state.rows=rows;
            state.error=null;
            state.version+=1;
            console.info('[Svensk eHockey] Detaljerad spelarhistorik laddad',rows.length,'rader',payload);
            setTimeout(()=>{
              try{scheduleAdaptiveContent(0);}catch(_){try{adaptPlayerTournamentHistory();}catch(__){}}
            },0);
            return rows;
          }catch(error){
            lastError=error;
            const status=Number(error?.status||0);
            const retryable=!status || status===408 || status===429 || status>=500;
            if(!retryable || attempt===retryDelays.length-1)throw error;
          }
        }
        throw lastError||new Error('Spelarhistoriken kunde inte laddas');
      }catch(error){
        state.error=error;
        state.rows=[];
        state.version+=1;
        console.warn('[Svensk eHockey] Kunde inte hämta utökad turneringsstatistik',error,payload);
        return [];
      }finally{
        state.promise=null;
      }
    })();

    return state;
  }

  function sehHistoryNumber(value){
    const n=Number(value);
    return Number.isFinite(n)?n:0;
  }

  function sehHistorySigned(value){
    const n=sehHistoryNumber(value);
    return n>0?`+${new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(n)}`:new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(n);
  }

  function sehHistoryInteger(value){
    const n=Number(value);
    return Number.isFinite(n)?new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(n):'–';
  }

  function sehHistorySavePct(value){
    if(value==null || String(value).trim()==='')return '–';
    const n=Number(value);
    if(!Number.isFinite(n))return '–';
    const pct=n<=1.5?n*100:n;
    return `${new Intl.NumberFormat('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1}).format(pct)}%`;
  }

  function sehHistoryDecimal(value,decimals=2){
    const n=Number(value);
    return Number.isFinite(n)?new Intl.NumberFormat('sv-SE',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(n):'–';
  }

  function sehHistoryGoalieShots(row){
    const count=value=>value==null || String(value).trim()==='' || !Number.isFinite(Number(value)) || Number(value)<0?null:Number(value);
    const saves=count(row?.total_goalie_saves);
    const shots=count(row?.total_goalie_shots_against);
    const goals=count(row?.total_goalie_goals_allowed);
    if(shots>0){
      if(saves!==null && saves<=shots)return {saves,shots};
      if(goals!==null && goals<=shots)return {saves:shots-goals,shots};
    }
    // Some imported seasons have no shots field; saves + conceded goals is shots faced.
    if((shots===null || shots===0) && saves!==null && goals!==null && saves+goals>0){
      return {saves,shots:saves+goals};
    }
    return null;
  }

  function sehHistoryGoalieSavePct(row){
    const totals=sehHistoryGoalieShots(row);
    return sehHistorySavePct(totals?totals.saves/totals.shots:row?.total_goalie_save_percentage);
  }

  function sehHistoryLeagueIdFromDomRow(row){
    for(const link of row.querySelectorAll('a[href]')){
      const href=String(link.getAttribute('href')||link.href||'');
      const m=href.match(/\/turnering\/(\d+)/i) || href.match(/[?&](?:leagueId|league_id)=(\d+)/i);
      if(m)return Number(m[1]);
    }
    return 0;
  }

  function sehHistoryMatchKey(value){
    return String(value||'')
      .normalize('NFKC')
      .replace(/European Championship League/gi,'ECL')
      .replace(/Swedish Championship League/gi,'SCL')
      .replace(/Finnish Championship League/gi,'FCL')
      .replace(/German Championship League/gi,'GCL')
      .replace(/6v6/gi,' ')
      .replace(/Season/gi,' ')
      .replace(/[🇦-🇿]{2}/gu,' ')
      .replace(/[^a-z0-9åäö]+/gi,' ')
      .replace(/\s+/g,' ')
      .trim()
      .toLocaleLowerCase('sv-SE');
  }

  function sehHistoryDetailForDomRow(row,detailRows,season,team,headers,values){
    if(!Array.isArray(detailRows)||!detailRows.length)return null;
    const leagueId=sehHistoryLeagueIdFromDomRow(row);
    const seasonKey=sehHistoryMatchKey(season);
    const teamKey=sehHistoryMatchKey(team);
    const headerMap=new Map(headers.map((h,i)=>[String(h||'').trim().toUpperCase().replace(/\s+/g,''),i]));
    const valueFor=(...keys)=>{
      for(const key of keys){
        const idx=headerMap.get(key);
        if(idx!==undefined)return values[idx];
      }
      return '';
    };
    const domGp=Number(String(valueFor('GP','MATCHER','GAMES')||'').replace(/[^0-9.-]/g,''));
    const domG=Number(String(valueFor('G','MÅL','GOALS')||'').replace(/[^0-9.-]/g,''));
    const domA=Number(String(valueFor('A','ASSIST','ASSISTS')||'').replace(/[^0-9.-]/g,''));
    const domPts=Number(String(valueFor('PTS','POÄNG','POINTS')||'').replace(/[^0-9.-]/g,''));

    let best=null;
    let bestScore=-Infinity;
    detailRows.forEach(item=>{
      let score=0;
      const itemLeague=Number(item.league_id||item.external_league_id||0);
      if(leagueId && itemLeague===leagueId)score+=160;
      else if(leagueId)score-=25;

      const itemTeamKey=sehHistoryMatchKey(item.team_name_in_tournament||item.team_current_name||'');
      if(teamKey && itemTeamKey===teamKey)score+=55;
      else if(teamKey && itemTeamKey && (itemTeamKey.includes(teamKey)||teamKey.includes(itemTeamKey)))score+=25;

      const labels=[item.catalog_display_name,item.season_label,item.league_name,item.competition_name]
        .map(sehHistoryMatchKey).filter(Boolean);
      if(seasonKey && labels.some(key=>key===seasonKey))score+=70;
      else if(seasonKey && labels.some(key=>key.includes(seasonKey)||seasonKey.includes(key)))score+=38;

      const skGp=sehHistoryNumber(item.total_skater_games);
      const gkGp=sehHistoryNumber(item.total_goalie_games);
      const appearance=sehHistoryNumber(item.appearance_games);
      if(Number.isFinite(domGp) && domGp>=0 && [skGp,gkGp,appearance].some(n=>n===domGp))score+=18;
      if(Number.isFinite(domG) && domG===sehHistoryNumber(item.total_goals))score+=5;
      if(Number.isFinite(domA) && domA===sehHistoryNumber(item.total_assists))score+=5;
      if(Number.isFinite(domPts) && domPts===sehHistoryNumber(item.total_points))score+=6;

      if(score>bestScore){bestScore=score;best=item;}
    });

    return bestScore>=45?best:null;
  }

  function sehHistoryStatGroups(detail,fallback){
    const groups=[];
    const playerType=String(detail?.player_type||'').trim().toLowerCase();
    const goalieOnly=detail?.is_goalie_only===true || playerType==='goalie';
    const hybrid=playerType==='hybrid';
    const skaterGames=sehHistoryNumber(detail?.total_skater_games);
    const goalieGames=sehHistoryNumber(detail?.total_goalie_games);
    const skaterGoals=sehHistoryNumber(detail?.total_goals);
    const skaterAssists=sehHistoryNumber(detail?.total_assists);
    const skaterPoints=sehHistoryNumber(detail?.total_points);

    // SportsGamer sometimes mirrors goalie appearances into skater GP when a goalie
    // is roster-listed at a skater position. Treat that as goalie-only history when
    // the skater and goalie game totals are identical and there is no skater offense.
    // This is the same false-hybrid rule used by the RP calculation.
    const falseMirroredSkater=detail && hybrid && goalieGames>0 && skaterGames===goalieGames
      && skaterGoals===0 && skaterAssists===0 && skaterPoints===0;

    const hasSkater=detail
      ? (!goalieOnly && !falseMirroredSkater && skaterGames>0 && (playerType==='skater'||hybrid||playerType===''))
      : fallback.role!=='goalie';
    const hasGoalie=detail
      ? goalieGames>0
      : fallback.role==='goalie';

    if(hasSkater){
      groups.push({
        role:'skater',
        title:'Utespelare',
        stats:[
          ['GP',detail?sehHistoryInteger(skaterGames):fallback.GP||'–'],
          ['G',detail?sehHistoryInteger(detail.total_goals):fallback.G||'–'],
          ['A',detail?sehHistoryInteger(detail.total_assists):fallback.A||'–'],
          ['PTS',detail?sehHistoryInteger(detail.total_points):fallback.PTS||'–'],
          ['+/-',detail?sehHistorySigned(detail.total_plus_minus):'–'],
          ['PIM',detail?sehHistoryInteger(detail.total_penalty_minutes):'–']
        ]
      });
    }

    if(hasGoalie){
      groups.push({
        role:'goalie',
        title:'Målvakt',
        stats:[
          ['GP',detail?sehHistoryInteger(goalieGames):fallback.GP||'–'],
          ['W',detail?sehHistoryInteger(detail.total_goalie_wins):'–'],
          ['L',detail?sehHistoryInteger(detail.total_goalie_losses):'–'],
          ['SV%',detail?sehHistoryGoalieSavePct(detail):fallback['SV%']||'–'],
          ['GAA',detail?sehHistoryDecimal(detail.total_goalie_goals_against_average,2):fallback.GAA||'–'],
          ['SO',detail?sehHistoryInteger(detail.total_goalie_shutouts):'–']
        ]
      });
    }

    if(!groups.length){
      const goalie=fallback.role==='goalie';
      groups.push(goalie?{
        role:'goalie',title:'Målvakt',stats:[
          ['GP',fallback.GP||'–'],['W','–'],['L','–'],['SV%',fallback['SV%']||'–'],['GAA',fallback.GAA||'–'],['SO','–']
        ]
      }:{
        role:'skater',title:'Utespelare',stats:[
          ['GP',fallback.GP||'–'],['G',fallback.G||'–'],['A',fallback.A||'–'],['PTS',fallback.PTS||'–'],['+/-','–'],['PIM','–']
        ]
      });
    }

    return groups;
  }

  function sehHistoryPlayedRole(detail,fallbackRole=''){
    const fallback=String(fallbackRole||'').trim().toUpperCase();
    if(!detail)return fallback;

    const playerType=String(detail.player_type||'').trim().toLowerCase();
    const skaterGames=sehHistoryNumber(detail.total_skater_games);
    const goalieGames=sehHistoryNumber(detail.total_goalie_games);
    const skaterGoals=sehHistoryNumber(detail.total_goals);
    const skaterAssists=sehHistoryNumber(detail.total_assists);
    const skaterPoints=sehHistoryNumber(detail.total_points);
    const primary=String(detail.primary_position||'').trim().toUpperCase();

    const falseMirroredSkater=playerType==='hybrid' && goalieGames>0 && skaterGames===goalieGames
      && skaterGoals===0 && skaterAssists===0 && skaterPoints===0;

    if(detail.is_goalie_only===true || playerType==='goalie' || falseMirroredSkater)return 'G';
    if(goalieGames>skaterGames)return 'G';
    if(skaterGames>0)return primary||fallback;
    if(goalieGames>0)return 'G';
    return primary||fallback;
  }

  function sehHistoryMetaIcon(key){
    if(/DIVISION|DIV/.test(key)){
      return '<span class="seh-player-history-extra-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 2 20 5v6c0 5-3.3 8.6-8 11-4.7-2.4-8-6-8-11V5l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg></span>';
    }
    return '<span class="seh-player-history-extra-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M17 3c-2 5-4.5 9-8 12l-3 2 2 4 4-2c3.5-2 6.3-5.7 8-11"/><path d="M5 18h7"/></svg></span>';
  }

  function compactPlayerHistoryHeader(main,heading,table){
    if(!main||!heading)return;

    const historyKicker=[...main.querySelectorAll('h1,h2,h3,h4,strong,b,div,span')].find(el=>{
      if(el===heading || el.closest('.seh-player-history-header,.seh-player-history-cards,.seh-player-history-filterbar'))return false;
      const text=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^HISTORIK$/i.test(text))return false;
      try{return !!(el.compareDocumentPosition(heading)&Node.DOCUMENT_POSITION_FOLLOWING);}
      catch(_){return false;}
    });
    if(historyKicker)historyKicker.classList.add('seh-player-history-kicker');

    let countNode=[...main.querySelectorAll('p,div,span,strong,b')].find(el=>{
      if(el===heading || el.closest('.seh-player-history-header,.seh-player-history-cards,.seh-player-history-filterbar'))return false;
      const text=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^\d+\s+turneringar$/i.test(text))return false;
      try{
        if(!(heading.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING))return false;
        if(table && !(el.compareDocumentPosition(table)&Node.DOCUMENT_POSITION_FOLLOWING))return false;
      }catch(_){return false;}
      return true;
    });

    let header=main.querySelector('.seh-player-history-header');
    if(!header){
      header=document.createElement('div');
      header.className='seh-player-history-header';
      heading.parentNode?.insertBefore(header,heading);
      header.appendChild(heading);
    }else if(!header.contains(heading)){
      header.prepend(heading);
    }

    let badge=header.querySelector('.seh-player-history-count');
    if(countNode){
      if(!badge){
        badge=document.createElement('span');
        badge.className='seh-player-history-count';
        header.appendChild(badge);
      }
      badge.textContent=(countNode.textContent||'').replace(/\s+/g,' ').trim();
      countNode.remove();
    }
  }

  function sehHistoryChronologyMs(row){
    const raw=
      row?.chronology_end_date||
      row?.chronology_date||
      row?.sort_date||
      row?.display_end_date||
      row?.end_date||
      row?.display_start_date||
      row?.start_date||
      '';
    const ms=Date.parse(String(raw||''));
    return Number.isFinite(ms)?ms:0;
  }

  function sehDirectHistoryCompetition(row){
    const raw=String(sehHistoryCompetitionCode(row)||'').trim().toUpperCase();
    if(raw==='ESHL')return 'ESHL';
    if(['ECL','SEC','SCL','FCL','GCL','SM','ITHL','LGEL'].includes(raw))return raw;
    return 'ÖVRIGA';
  }

  function sehBuildDirectPlayerHistoryCards(rows){
    const cards=document.createElement('div');
    cards.className='seh-player-history-cards';
    cards.dataset.directSupabase='1';

    const sorted=[...(Array.isArray(rows)?rows:[])].sort((a,b)=>
      sehHistoryChronologyMs(b)-sehHistoryChronologyMs(a) ||
      Number(b?.league_id||b?.external_league_id||0)-Number(a?.league_id||a?.external_league_id||0)
    );

    sorted.forEach(detail=>{
      const team=sehCleanText(detail?.team_name_in_tournament||detail?.team_current_name||'')||'—';
      const season=sehCompactMeritLabel(sehCleanText(
        detail?.season_label||detail?.league_name||detail?.competition_name||'Turnering'
      ));
      const verifiedHistoricalClub=sehVerifiedClubForHistoricalName(team);
      const groups=sehHistoryStatGroups(detail,{role:'skater'});

      const card=document.createElement('div');
      card.className='seh-player-history-card';
      card.dataset.historyCompetition=sehDirectHistoryCompetition(detail);
      card.dataset.leagueId=String(detail?.league_id||detail?.external_league_id||'');

      const head=document.createElement('div');
      head.className='seh-player-history-head';
      const teamEl=document.createElement('div');
      teamEl.className='seh-player-history-team';

      const fallbackLogo=()=>{
        const el=document.createElement('div');
        el.className='seh-player-history-team-fallback';
        el.textContent=team.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'—';
        el.setAttribute('aria-hidden','true');
        return el;
      };

      const logoUrl=sehVerifiedTeamLogoUrl(team,verifiedHistoricalClub);
      if(logoUrl){
        const img=document.createElement('img');
        img.alt='';
        img.src=logoUrl;
        img.onerror=()=>{if(img.isConnected)img.replaceWith(fallbackLogo());};
        teamEl.appendChild(img);
      }else{
        teamEl.appendChild(fallbackLogo());
      }

      const copy=document.createElement('div');
      copy.className='seh-player-history-team-copy';
      const teamName=document.createElement('span');
      teamName.className='seh-player-history-team-name';
      teamName.textContent=team;
      const seasonEl=document.createElement('span');
      seasonEl.className='seh-player-history-season';
      seasonEl.textContent=season||'Turnering';
      copy.append(teamName,seasonEl);
      teamEl.appendChild(copy);

      const teamId=Number(verifiedHistoricalClub?.team_id)||0;
      if(teamId>0){
        const chevron=document.createElement('span');
        chevron.className='seh-player-history-chevron';
        chevron.setAttribute('aria-hidden','true');
        chevron.textContent='›';
        teamEl.appendChild(chevron);
      }

      head.appendChild(teamEl);
      card.appendChild(head);

      const multiRole=groups.length>1;
      groups.forEach(group=>{
        const groupEl=document.createElement('div');
        groupEl.className=`seh-player-history-stat-group is-${group.role}`;
        if(multiRole){
          const roleLabel=document.createElement('div');
          roleLabel.className='seh-player-history-role-label';
          roleLabel.textContent=group.title;
          groupEl.appendChild(roleLabel);
        }

        const shell=document.createElement('div');
        shell.className='seh-player-history-stats-shell';
        const wrap=document.createElement('div');
        wrap.className='seh-player-history-stats-wrap';
        const grid=document.createElement('div');
        grid.className='seh-player-history-stats';
        grid.dataset.statCount=String(group.stats.length);
        group.stats.forEach(([label,value])=>{
          const box=document.createElement('div');
          box.className='seh-player-history-stat';
          box.innerHTML=`<span class="k">${htmlEscape(label)}</span><span class="v">${htmlEscape(value)}</span>`;
          grid.appendChild(box);
        });
        wrap.appendChild(grid);
        shell.appendChild(wrap);
        groupEl.appendChild(shell);
        card.appendChild(groupEl);
      });

      const footer=document.createElement('div');
      footer.className='seh-player-history-footer';
      const extra=document.createElement('div');
      extra.className='seh-player-history-extra';

      const division=sehCleanText(detail?.division||'');
      const playedRole=sehHistoryPlayedRole(detail,detail?.primary_position||'');
      [["DIVISION",division,"DIVISION"],["ROLL",playedRole,"ROLL"]].forEach(([label,value,key])=>{
        if(!value)return;
        const box=document.createElement('div');
        box.className='seh-player-history-extra-item';
        box.innerHTML=`${sehHistoryMetaIcon(key)}<span class="k">${label}</span><span class="v">${htmlEscape(value)}</span>`;
        extra.appendChild(box);
      });
      footer.appendChild(extra);
      card.appendChild(footer);

      if(teamId>0){
        card.setAttribute('role','link');
        card.tabIndex=0;
        const openTeam=()=>nativeNavigate(`#/lag/${teamId}`);
        card.addEventListener('click',event=>{
          if(event.target.closest('.seh-player-history-stats-wrap'))return;
          openTeam();
        });
        card.addEventListener('keydown',event=>{
          if(event.key==='Enter'||event.key===' '){event.preventDefault();openTeam();}
        });
      }

      cards.appendChild(card);
    });

    cards.dataset.signature=`direct-v720:${cards.children.length}`;
    return cards;
  }

  function sehBuildDirectPlayerTeamGrid(rows){
    const grid=document.createElement('div');
    grid.className='seh-player-team-grid';
    grid.dataset.directSupabase='1';

    sehVerifiedPlayerTeamGroups(rows).forEach(group=>{
      const teamId=Number(group.safeLinkTeamId)||0;
      const card=teamId>0?document.createElement('a'):document.createElement('div');
      card.className='seh-player-team-card';
      if(teamId>0){
        const target=`#/lag/${teamId}`;
        card.href=target;
        // V719: do not expose this click to the website SPA/data-load router.
        // The native Android shell owns team navigation and must always land on
        // the native Lag profile route.
        card.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          nativeNavigate(target);
        });
      }

      const fallback=()=>{
        const el=document.createElement('div');
        el.className='seh-player-team-logo-fallback';
        el.textContent=group.name.split(/\s+/).filter(Boolean).map(x=>x[0]||'').join('').slice(0,2).toUpperCase()||'—';
        return el;
      };
      const logoUrl=sehVerifiedTeamLogoUrl(group.name,group.club);
      if(logoUrl){
        const img=document.createElement('img');
        img.className='logo';img.alt=group.name;img.src=logoUrl;
        img.onerror=()=>{if(img.isConnected)img.replaceWith(fallback());};
        card.appendChild(img);
      }else card.appendChild(fallback());

      const title=document.createElement('span');
      title.className='title';title.textContent=group.name;
      card.appendChild(title);

      const meta=document.createElement('span');
      meta.className='meta';
      const count=document.createElement('strong');
      count.className='season-count';count.textContent=String(group.seasonCount);
      const label=document.createElement('span');
      label.className='season-label';label.textContent=group.seasonCount===1?'säsong':'säsonger';
      meta.append(count,label);
      if(group.leagueList.length){
        const dot=document.createElement('span');dot.className='team-meta-dot';dot.textContent='·';
        const leagues=document.createElement('span');leagues.className='team-leagues';leagues.textContent=group.leagueList.join(' · ');
        meta.append(dot,leagues);
      }
      card.appendChild(meta);
      grid.appendChild(card);
    });

    return grid;
  }

  function sehHistoryFalseMirroredSkater(row){
    const playerType=String(row?.player_type||'').trim().toLowerCase();
    const skaterGames=sehHistoryNumber(row?.total_skater_games);
    const goalieGames=sehHistoryNumber(row?.total_goalie_games);
    const goals=sehHistoryNumber(row?.total_goals);
    const assists=sehHistoryNumber(row?.total_assists);
    const points=sehHistoryNumber(row?.total_points);
    return playerType==='hybrid' && goalieGames>0 && skaterGames===goalieGames
      && goals===0 && assists===0 && points===0;
  }

  function sehDirectPlayerCareerGrids(rows){
    const history=Array.isArray(rows)?rows:[];
    const sum=key=>history.reduce((total,row)=>total+sehHistoryNumber(row?.[key]),0);
    const skaterGames=history.reduce((total,row)=>total+(sehHistoryFalseMirroredSkater(row)?0:sehHistoryNumber(row?.total_skater_games)),0);
    const goalieGames=sum('total_goalie_games');
    const grids=[];
    const holder=document.createElement('div');

    const add=(title,items)=>{
      const heading=document.createElement('h3');
      heading.textContent=title;
      const grid=document.createElement('div');
      grid.className='seh-player-career-grid';
      items.forEach(([label,value])=>{
        const item=document.createElement('div');
        item.className='seh-player-career-item';
        item.innerHTML=`<span class="label">${htmlEscape(label)}</span><span class="value">${htmlEscape(value)}</span>`;
        grid.appendChild(item);
      });
      holder.append(heading,grid);
      grids.push(grid);
    };

    if(skaterGames>0){
      add('Karriärstatistik',[
        ['MATCHER',sehHistoryInteger(skaterGames)],
        ['MÅL',sehHistoryInteger(sum('total_goals'))],
        ['ASSIST',sehHistoryInteger(sum('total_assists'))],
        ['POÄNG',sehHistoryInteger(sum('total_points'))],
        ['+/-',sehHistorySigned(sum('total_plus_minus'))],
        ['PIM',sehHistoryInteger(sum('total_penalty_minutes'))]
      ]);
    }

    if(goalieGames>0){
      const shotTotals=history.filter(row=>sehHistoryNumber(row?.total_goalie_games)>0).map(sehHistoryGoalieShots).filter(Boolean);
      const saves=shotTotals.reduce((total,row)=>total+row.saves,0);
      const shots=shotTotals.reduce((total,row)=>total+row.shots,0);
      const ga=sum('total_goalie_goals_allowed');
      add('Målvaktsstatistik',[
        ['MATCHER',sehHistoryInteger(goalieGames)],
        ['VINSTER',sehHistoryInteger(sum('total_goalie_wins'))],
        ['SKOTT',sehHistoryInteger(shots)],
        ['RÄDDNINGAR',sehHistoryInteger(saves)],
        ['GAA',goalieGames>0?sehHistoryDecimal(ga/goalieGames,2):'–'],
        ['SV%',shots>0?sehHistorySavePct(saves/shots):'–'],
        ['SO',sehHistoryInteger(sum('total_goalie_shutouts'))]
      ]);
    }

    return grids;
  }

  function sehDirectPlayerHistorySummary(rows){
    const history=Array.isArray(rows)?rows:[];
    const groups=sehVerifiedPlayerTeamGroups(history);
    const leagueOrder=['ECL','SEC','SCL','SM','eSHL','FCL','GCL','RCL','ITHL','LGEL'];
    const leagues=new Set();
    let matches=0,skaterGames=0,goalieGames=0;
    let bestOffensive=null;
    let highestEcl='';
    const eclRank={NEO:1,CORE:2,LITE:3,PRO:4,ELITE:5};

    history.forEach(row=>{
      const appearance=sehHistoryNumber(row?.appearance_games);
      const rawSg=sehHistoryNumber(row?.total_skater_games);
      const sg=sehHistoryFalseMirroredSkater(row)?0:rawSg;
      const gg=sehHistoryNumber(row?.total_goalie_games);
      matches+=appearance>0?appearance:Math.max(sg,gg);
      skaterGames+=sg;goalieGames+=gg;
      const competition=sehHistoryCompetitionCode(row);
      if(competition)leagues.add(competition);
      if(sg>0 && (!bestOffensive || sehHistoryNumber(row?.total_points)>sehHistoryNumber(bestOffensive?.total_points))){
        bestOffensive=row;
      }
      if(String(competition||'').toUpperCase()==='ECL'){
        const div=String(row?.division||'').trim().toUpperCase();
        if((eclRank[div]||0)>(eclRank[String(highestEcl||'').toUpperCase()]||0))highestEcl=row.division||'';
      }
    });

    const leagueList=leagueOrder.filter(label=>[...leagues].some(v=>String(v).toUpperCase()===label.toUpperCase()));
    [...leagues].forEach(label=>{
      if(!leagueList.some(v=>v.toUpperCase()===String(label).toUpperCase()))leagueList.push(label);
    });

    const bestOffensiveLabel=bestOffensive
      ? `${sehHistoryInteger(bestOffensive.total_points)} PTS i ${sehCompactMeritLabel(bestOffensive.season_label||bestOffensive.league_name||'turneringen')}${bestOffensive.team_name_in_tournament?` för ${bestOffensive.team_name_in_tournament}`:''}`
      : '';

    return {
      seasons:history.length,
      clubs:groups.length,
      matches,
      skaterGames,
      goalieGames,
      role:goalieGames>skaterGames?'Målvakt':'Utespelare',
      leagueLine:leagueList.join(', '),
      highestEcl,
      bestOffensiveLabel
    };
  }

  function adaptPlayerTournamentHistory(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    if(!main)return;

    const heading=[...main.querySelectorAll('h1,h2,h3,h4')].find(el=>
      /^Alla turneringar$/i.test((el.textContent||'').replace(/\s+/g,' ').trim())
    );
    if(!heading)return;

    let intro=heading.nextElementSibling;
    if(intro && /Varje rad länkar/i.test((intro.textContent||'').replace(/\s+/g,' ').trim())){
      intro.classList.add('seh-player-history-intro-hide');
    }

    const allTables=[...main.querySelectorAll('table')];
    const table=allTables.find(t=>{
      if(heading.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING){
        const hs=[...t.querySelectorAll('thead th')].map(x=>(x.textContent||'').trim().toUpperCase());
        return hs.some(h=>/SÄSONG|SEASON/.test(h)) && hs.some(h=>/LAG|TEAM/.test(h));
      }
      return false;
    });
    if(!table)return;

    compactPlayerHistoryHeader(main,heading,table);

    let filterbar=null;
    const filterButtons=[...main.querySelectorAll('button,a')].filter(el=>{
      if(!(heading.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))return false;
      if(!(el.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING))return false;
      const t=(el.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      return ['ALLA','ECL','SEC','SCL','FCL','GCL','ESHL','SM','ÖVRIGA','ITHL','LGEL'].includes(t);
    });
    if(filterButtons.length>=3){
      const parent=filterButtons[0].parentElement;
      if(parent && filterButtons.every(b=>b.parentElement===parent)){
        filterbar=parent;
        parent.classList.add('seh-player-history-filterbar');
        ensureHistoryFilterScrollHint(parent);
      }
    }

    const headers=[...table.querySelectorAll('thead th')].map(th=>(th.textContent||'').replace(/\s+/g,' ').trim());
    const rows=[...table.querySelectorAll('tbody tr')];
    if(!headers.length || !rows.length)return;

    const detailState=sehLoadProfileHistoryDetails(main);
    const detailRows=Array.isArray(detailState?.rows)?detailState.rows:[];
    const detailVersion=Number(detailState?.version||0);
    const aliasState=sehLoadVerifiedTeamAliases();
    const aliasVersion=Number(aliasState?.version||0);

    const signature='v6.15-historical-team-identity|'+detailVersion+'|aliases:'+aliasVersion+'|'+rows.map(r=>(r.innerText||'').replace(/\s+/g,' ').trim()).join('|');
    let cards=table.parentElement?.querySelector(':scope > .seh-player-history-cards') || table.nextElementSibling;
    if(cards?.classList?.contains('seh-player-history-cards') && cards.dataset.signature===signature){
      table.classList.add('seh-player-history-table-hidden');
      table.parentElement?.classList.remove('seh-player-history-table-wrapper-hidden');
      return;
    }
    if(cards?.classList?.contains('seh-player-history-cards'))cards.remove();

    cards=document.createElement('div');
    cards.className='seh-player-history-cards';
    cards.dataset.signature=signature;

    const norm=s=>(s||'').replace(/\s+/g,' ').trim();
    const headerKey=s=>norm(s).toUpperCase().replace(/\s+/g,'');
    const hidx=rx=>headers.findIndex(h=>rx.test(h));
    const seasonI=hidx(/SÄSONG|SEASON/i);
    const teamI=hidx(/^LAG$|^TEAM$|KLUBB|CLUB/i);
    const metaKeyRx=/^(DIVISION|DIV|ROLL|ROLE|POSITION|POS)$/i;
    const historyCompetitionKey=(detail,season,team)=>{
      const hay=[
        detail?.competition_code,detail?.competition_name,detail?.league_name,
        detail?.season_label,season,team
      ].map(v=>String(v||'')).join(' ').toUpperCase();
      if(/(?:^|\b)(?:ECL)(?:\b|$)|EUROPEAN CHAMPIONSHIP LEAGUE/.test(hay))return 'ECL';
      if(/(?:^|\b)(?:SEC)(?:\b|$)|SVENSKA EHOCKEY CUPEN/.test(hay))return 'SEC';
      if(/(?:^|\b)(?:SCL)(?:\b|$)|SWEDISH CHAMPIONSHIP LEAGUE/.test(hay))return 'SCL';
      if(/(?:^|\b)(?:FCL)(?:\b|$)|FINNISH CHAMPIONSHIP LEAGUE/.test(hay))return 'FCL';
      if(/(?:^|\b)(?:GCL)(?:\b|$)|GERMAN CHAMPIONSHIP LEAGUE/.test(hay))return 'GCL';
      if(/(?:^|\b)ESHL(?:\b|$)/.test(hay))return 'ESHL';
      if(/(?:^|\b)ITHL(?:\b|$)/.test(hay))return 'ITHL';
      if(/(?:^|\b)LGEL(?:\b|$)/.test(hay))return 'LGEL';
      if(/(?:^|\b)SM(?:\b|$)|SM EHOCKEY/.test(hay))return 'SM';
      return 'ÖVRIGA';
    };

    rows.forEach(row=>{
      const cells=[...row.children];
      if(!cells.length)return;
      const values=cells.map(td=>norm(td.innerText||td.textContent||''));
      if(!values.some(Boolean))return;

      const season=seasonI>=0?values[seasonI]:values[0];
      const teamCell=teamI>=0?cells[teamI]:null;
      let team=teamI>=0?values[teamI]:'';
      const sourceDomTeam=team;
      const teamImg=teamCell?.querySelector('img');
      const teamLink=teamCell?.querySelector('a[href]') || row.querySelector('a[href]');

      if(teamCell && !teamImg){
        const shortFallback=[...teamCell.querySelectorAll('*')]
          .map(el=>norm(el.textContent||''))
          .find(t=>/^[A-ZÅÄÖ0-9]{1,3}$/i.test(t));
        if(shortFallback && team.toUpperCase().startsWith(shortFallback.toUpperCase())){
          const stripped=team.slice(shortFallback.length).trim();
          if(stripped.length>=2)team=stripped;
        }
      }

      const data=[];
      headers.forEach((label,i)=>{
        if(i===seasonI || i===teamI)return;
        const cleanLabel=norm(label)||`STAT ${i+1}`;
        data.push({label:cleanLabel,value:values[i]||'–',key:headerKey(cleanLabel)});
      });
      const extras=data.filter(item=>metaKeyRx.test(item.key) && !/^(?:-|–|—)?$/.test(norm(item.value)));
      const fallback={};
      data.filter(item=>!metaKeyRx.test(item.key)).forEach(item=>{fallback[item.key]=item.value;});
      const roleRaw=(extras.find(item=>/^(ROLL|ROLE|POSITION|POS)$/.test(item.key))?.value||'').toUpperCase();
      fallback.role=/^(G|GK|GOALIE|MÅLVAKT)$/.test(roleRaw)?'goalie':'skater';

      const detail=sehHistoryDetailForDomRow(row,detailRows,season,team,headers,values);

      /*
       * V695:
       * The historical club is the name the team actually used in this
       * tournament. A reused SportsGamer team ID/current name must never
       * rewrite it (e.g. Frölunda HC -> Last Dance).
       */
      if(detail){
        const historicalTeam=sehCleanText(detail.team_name_in_tournament||'');
        if(historicalTeam){
          team=historicalTeam;
        }else if(!team){
          team=sehCleanText(detail.team_current_name||'');
        }
      }

      const verifiedHistoricalClub=sehVerifiedClubForHistoricalName(team);
      const groups=sehHistoryStatGroups(detail,fallback);

      const card=document.createElement('div');
      card.className='seh-player-history-card';
      card.dataset.historyCompetition=historyCompetitionKey(detail,season,team);

      const head=document.createElement('div');
      head.className='seh-player-history-head';

      const teamEl=document.createElement('div');
      teamEl.className='seh-player-history-team';

      const buildHistoricalLogoFallback=()=>{
        const fallbackLogo=document.createElement('div');
        fallbackLogo.className='seh-player-history-team-fallback';
        fallbackLogo.textContent=(team||'—')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0,2)
          .map(s=>s[0])
          .join('')
          .toUpperCase() || '—';
        fallbackLogo.setAttribute('aria-hidden','true');
        return fallbackLogo;
      };

      const historicalLogo=sehVerifiedTeamLogoUrl(team,verifiedHistoricalClub);
      const sourceImage=String(teamImg?.currentSrc||teamImg?.src||'').trim();
      const sourceImageMatchesHistoricalTeam=
        !!sourceImage &&
        sehVerifiedTeamAliasKey(sourceDomTeam)===sehVerifiedTeamAliasKey(team);

      if(historicalLogo || sourceImageMatchesHistoricalTeam){
        const img=document.createElement('img');
        img.alt='';
        let triedSource=false;

        img.onerror=()=>{
          if(
            !triedSource &&
            sourceImageMatchesHistoricalTeam &&
            sourceImage &&
            img.src!==sourceImage
          ){
            triedSource=true;
            img.src=sourceImage;
            return;
          }
          if(img.isConnected)img.replaceWith(buildHistoricalLogoFallback());
        };

        img.src=historicalLogo || sourceImage;
        teamEl.appendChild(img);
      }else{
        teamEl.appendChild(buildHistoricalLogoFallback());
      }

      const copy=document.createElement('div');
      copy.className='seh-player-history-team-copy';
      const tn=document.createElement('span');
      tn.className='seh-player-history-team-name';
      tn.textContent=team||'—';
      copy.appendChild(tn);
      const seasonEl=document.createElement('span');
      seasonEl.className='seh-player-history-season';
      seasonEl.textContent=season||'Turnering';
      copy.appendChild(seasonEl);
      teamEl.appendChild(copy);

      const historicalTeamTarget=
        Number(verifiedHistoricalClub?.team_id)>0
          ? `#/lag/${Number(verifiedHistoricalClub.team_id)}`
          : (teamLink?.href||'');

      if(historicalTeamTarget){
        const chevron=document.createElement('span');
        chevron.className='seh-player-history-chevron';
        chevron.setAttribute('aria-hidden','true');
        chevron.textContent='›';
        teamEl.appendChild(chevron);
      }

      head.appendChild(teamEl);
      card.appendChild(head);

      const multiRole=groups.length>1;
      groups.forEach(group=>{
        const groupEl=document.createElement('div');
        groupEl.className=`seh-player-history-stat-group is-${group.role}`;

        if(multiRole){
          const roleLabel=document.createElement('div');
          roleLabel.className='seh-player-history-role-label';
          roleLabel.textContent=group.title;
          groupEl.appendChild(roleLabel);
        }

        const shell=document.createElement('div');
        shell.className='seh-player-history-stats-shell';
        const wrap=document.createElement('div');
        wrap.className='seh-player-history-stats-wrap';
        const grid=document.createElement('div');
        grid.className='seh-player-history-stats';
        grid.dataset.statCount=String(group.stats.length);

        group.stats.forEach(([label,value])=>{
          const box=document.createElement('div');
          box.className='seh-player-history-stat';
          box.innerHTML=`<span class="k">${htmlEscape(label)}</span><span class="v">${htmlEscape(value)}</span>`;
          grid.appendChild(box);
        });

        wrap.appendChild(grid);
        shell.appendChild(wrap);

        const hint=document.createElement('div');
        hint.className='seh-player-history-stats-hint';
        hint.setAttribute('aria-hidden','true');
        hint.innerHTML='<small>Dra</small><b>›</b>';
        shell.appendChild(hint);

        const updateOverflow=()=>{
          const maxScroll=Math.max(0,wrap.scrollWidth-wrap.clientWidth);
          const hasOverflow=maxScroll>4;
          shell.classList.toggle('has-overflow',hasOverflow);
          shell.classList.toggle('is-end',!hasOverflow || wrap.scrollLeft>=maxScroll-2);
          grid.classList.toggle('is-scrollable',hasOverflow);
          shell.dataset.overflow=hasOverflow?'1':'0';
          const anyOverflow=[...card.querySelectorAll('.seh-player-history-stats-shell')]
            .some(node=>node.dataset.overflow==='1');
          card.classList.toggle('has-scrollable-stats',anyOverflow);
        };
        wrap.addEventListener('scroll',updateOverflow,{passive:true});
        requestAnimationFrame(updateOverflow);
        setTimeout(updateOverflow,80);

        groupEl.appendChild(shell);
        card.appendChild(groupEl);
      });

      const footer=document.createElement('div');
      footer.className='seh-player-history-footer';

      const extraGrid=document.createElement('div');
      extraGrid.className='seh-player-history-extra';
      const mergedExtras=[];
      const pushExtra=(label,value,key)=>{
        const v=norm(value);
        if(!v || /^(?:-|–|—)$/.test(v))return;
        if(mergedExtras.some(item=>item.key===key))return;
        mergedExtras.push({label,value:v,key});
      };

      pushExtra('DIVISION',detail?.division||extras.find(item=>/^(DIVISION|DIV)$/.test(item.key))?.value,'DIVISION');
      const fallbackRole=extras.find(item=>/^(ROLL|ROLE|POSITION|POS)$/.test(item.key))?.value;
      pushExtra('ROLL',sehHistoryPlayedRole(detail,fallbackRole),'ROLL');
      extras.forEach(item=>pushExtra(item.label,item.value,item.key));

      mergedExtras.forEach(item=>{
        const box=document.createElement('div');
        box.className='seh-player-history-extra-item';
        box.innerHTML=`${sehHistoryMetaIcon(item.key)}<span class="k">${htmlEscape(item.label)}</span><span class="v">${htmlEscape(item.value)}</span>`;
        extraGrid.appendChild(box);
      });
      footer.appendChild(extraGrid);

      const footerHint=document.createElement('div');
      footerHint.className='seh-player-history-footer-scrollhint';
      footerHint.setAttribute('aria-hidden','true');
      footerHint.innerHTML='<span>Dra för mer statistik</span><b>›</b>';
      footer.appendChild(footerHint);
      card.appendChild(footer);

      if(historicalTeamTarget){
        const target=historicalTeamTarget;
        card.setAttribute('role','link');
        card.tabIndex=0;
        card.addEventListener('click',event=>{
          if(event.target.closest('.seh-player-history-stats-wrap'))return;
          nativeNavigate(target);
        });
        card.addEventListener('keydown',event=>{
          if(event.key==='Enter' || event.key===' '){
            event.preventDefault();
            nativeNavigate(target);
          }
        });
      }

      cards.appendChild(card);
    });

    if(!cards.children.length)return;

    // V6.12: native-korten är fristående från legacy-tabellen. De gamla
    // filterknapparna kunde därför byta aktiv knapp utan att filtrera korten.
    // Filtrera appkorten direkt på samma tävlingskod som visas i filterraden.
    if(filterbar){
      const normalizeFilter=value=>{
        const raw=String(value||'').replace(/\s+/g,' ').trim().toUpperCase();
        if(raw==='ALLA')return 'ALLA';
        if(raw==='ÖVRIGA')return 'ÖVRIGA';
        if(raw==='ESHL')return 'ESHL';
        if(raw==='ITHL')return 'ITHL';
        if(raw==='LGEL')return 'LGEL';
        return ['ECL','SEC','SCL','FCL','GCL','SM'].includes(raw)?raw:'ALLA';
      };
      const applyNativeHistoryFilter=value=>{
        const key=normalizeFilter(value);
        [...cards.querySelectorAll(':scope > .seh-player-history-card')].forEach(card=>{
          const competition=String(card.dataset.historyCompetition||'ÖVRIGA').toUpperCase();
          const show=key==='ALLA' || competition===key;
          card.classList.toggle('seh-history-filter-hidden',!show);
          card.hidden=!show;
        });
        cards.dataset.activeHistoryFilter=key;
      };

      if(filterbar.__sehNativeHistoryFilterHandler){
        filterbar.removeEventListener('click',filterbar.__sehNativeHistoryFilterHandler,true);
        filterbar.removeEventListener('click',filterbar.__sehNativeHistoryFilterHandler,false);
      }
      const nativeHistoryFilterHandler=event=>{
        const control=event.target.closest('button,a');
        if(!control || !filterbar.contains(control))return;
        const label=(control.textContent||'').replace(/\s+/g,' ').trim();
        if(!/^(ALLA|ECL|SEC|SCL|FCL|GCL|ESHL|SM|ÖVRIGA|ITHL|LGEL)$/i.test(label))return;
        // Kör före legacy-filtreringen. Den gamla sidan kan stoppa bubbling efter
        // att den uppdaterat aktiv knapp, men native-korten ska filtreras ändå.
        applyNativeHistoryFilter(label);
        requestAnimationFrame(()=>applyNativeHistoryFilter(label));
      };
      filterbar.addEventListener('click',nativeHistoryFilterHandler,true);
      filterbar.__sehNativeHistoryFilterHandler=nativeHistoryFilterHandler;

      const selected=[...filterbar.querySelectorAll('button,a')].find(control=>
        control.matches('.active,.is-active,[aria-pressed="true"],[aria-selected="true"]')
      );
      applyNativeHistoryFilter(selected?.textContent||'ALLA');
    }

    table.classList.add('seh-player-history-table-hidden');
    const wrapper=table.parentElement;
    if(wrapper)wrapper.classList.remove('seh-player-history-table-wrapper-hidden');
    table.insertAdjacentElement('afterend',cards);
  }

  function sehCleanText(v){
    return (v||'').replace(/\s+/g,' ').trim();
  }

  function sehFindProfileHeading(rx){
    const main=document.querySelector('main');
    if(!main)return null;
    return [...main.querySelectorAll('h1,h2,h3,h4,strong,b,div,span')].find(el=>rx.test(sehCleanText(el.textContent||'')));
  }

  function sehFindSectionAround(el, predicate, maxDepth=8){
    let node=el;
    for(let depth=0; node && node!==document.body && depth<maxDepth; depth++, node=node.parentElement){
      if(predicate(node)) return node;
    }
    return null;
  }

  function adaptPlayerCareerStats(){
    if(route().kind!=='player')return;
    const main=document.querySelector('main');
    if(!main)return;

    const statHeadings=[...main.querySelectorAll('h1,h2,h3,h4,strong,b,div,span')].filter(el=>/^(Karriärstatistik|Career statistics|Målvaktsstatistik|Goalie statistics)$/i.test(sehCleanText(el.textContent||'')));

    statHeadings.forEach(heading=>{
      const headingText=sehCleanText(heading.textContent||'');
      const isGoalieSection=/^(Målvaktsstatistik|Goalie statistics)$/i.test(headingText);
      const order=isGoalieSection
        ? ['MATCHER','VINSTER','SKOTT','RÄDDNINGAR','GAA','SV%','SO']
        : ['MATCHER','MÅL','ASSIST','POÄNG','+/-','PIM','VINSTER','SKOTT','RÄDDNINGAR','GAA','SV%','SO'];
      const labelsAllowed=new Set(order.concat(['NOLLOR','HÅLLDA NOLLOR','SHUTOUTS']));

      const section=sehFindSectionAround(heading,node=>{
        const txt=sehCleanText(node.innerText||'');
        return /(Karriärstatistik|Målvaktsstatistik|Career statistics|Goalie statistics)/i.test(txt) && /MATCHER/i.test(txt) && txt.length<1600;
      },8);
      if(!section || section.querySelector(':scope > .seh-player-career-grid'))return;

      const found=[];
      const usedLabels=new Set();

      [...section.querySelectorAll('*')].forEach(label=>{
        const rawKey=sehCleanText(label.textContent||'').toUpperCase();
        const key=(['NOLLOR','HÅLLDA NOLLOR','SHUTOUTS'].includes(rawKey)?'SO':rawKey);
        if((!labelsAllowed.has(rawKey) && !labelsAllowed.has(key)) || usedLabels.has(key))return;

        let box=label.parentElement;
        let value='';

        for(let depth=0;box && box!==section && depth<6;depth++,box=box.parentElement){
          const txt=sehCleanText(box.innerText||'');
          if(txt.length>120)continue;

          const escapedRaw=rawKey.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          const escapedKey=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          const m=txt.match(new RegExp('^(?:'+escapedRaw+'|'+escapedKey+')\\s+(.+)$','i'));
          if(m){
            value=sehCleanText(m[1]);
            break;
          }
        }

        if(!box || box===section || !value)return;
        // A value in these career boxes is always short; reject accidental wrappers.
        if(value.length>24)return;

        usedLabels.add(key);
        found.push({label:key,value,box});
      });

      if(found.length<4)return;
      found.sort((a,b)=>order.indexOf(a.label)-order.indexOf(b.label));

      // Find one wrapper containing all original stat cells, even if the page split
      // the last cell (+/-) into a different nested column.
      let originalGrid=commonAncestor(found.map(x=>x.box));
      if(!originalGrid || originalGrid===section || originalGrid===main){
        originalGrid=found[0].box.parentElement;
        while(originalGrid && originalGrid!==section){
          const txt=sehCleanText(originalGrid.innerText||'');
          const hits=found.filter(x=>txt.includes(x.label) && txt.includes(x.value)).length;
          if(hits>=found.length)break;
          originalGrid=originalGrid.parentElement;
        }
      }

      const grid=document.createElement('div');
      grid.className='seh-player-career-grid';
      const lastRowStart=found.length-(found.length%3||3);
      grid.innerHTML=found.map((it,idx)=>`<div class="seh-player-career-item ${idx>=lastRowStart?'seh-last-row':''}"><span class="label">${htmlEscape(it.label)}</span><span class="value">${htmlEscape(it.value)}</span></div>`).join('');

      // Put the rebuilt grid directly after the title and hide the complete old grid.
      heading.insertAdjacentElement('afterend',grid);
      if(originalGrid && originalGrid!==section && !originalGrid.contains(heading)){
        originalGrid.style.setProperty('display','none','important');
      }else{
        found.forEach(it=>it.box.style.setProperty('display','none','important'));
      }
    });
  }

  function adaptPlayerTeamsSection(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    if(!main)return;

    const heading=sehFindProfileHeading(/^Lag$/i);
    if(!heading)return;

    const section=sehFindSectionAround(heading,node=>{
      const txt=sehCleanText(node.innerText||'');
      return /Lag spelaren har representerat i historiken/i.test(txt) &&
             /\b\d+\s+säsong(?:er)?\b/i.test(txt) &&
             txt.length<7000;
    },10);

    if(!section)return;

    /*
     * V695 – verified club grouping for the Lag tab.
     *
     * - team_name_in_tournament supplies the historical name.
     * - team_name_in_tournament is always the primary historical identity.
     * - v_local_team_list current_name + historical_names +
     *   names_used_in_leagues supplies the ONLY allowed alias merges.
     * - SportsGamer team IDs are never grouping keys.
     * - Alias loading is optional for correctness: without it, historical
     *   names stay separate instead of falling back to team-ID grouping.
     */
    const historyState=sehLoadProfileHistoryDetails(main);
    const verifiedAliasState=sehLoadVerifiedTeamAliases();
    const verifiedGroups=Array.isArray(historyState?.rows) && historyState.rows.length
      ? sehVerifiedPlayerTeamGroups(historyState.rows)
      : null;

    if(
      Array.isArray(verifiedGroups) &&
      verifiedGroups.length
    ){
      const verifiedSignature=[
        'v6.16-historical-first-team-groups',
        Number(historyState?.version||0),
        Number(verifiedAliasState?.version||0),
        verifiedAliasState?.aliasMap instanceof Map?'aliases-ready':'historical-only',
        ...verifiedGroups.map(group=>
          `${group.name}:${group.seasonCount}:${group.leagueList.join(',')}`
        )
      ].join('|');

      let verifiedGrid=section.querySelector('.seh-player-team-grid');

      if(
        verifiedGrid &&
        verifiedGrid.dataset.verifiedTeamSignature!==verifiedSignature
      ){
        verifiedGrid.remove();
        verifiedGrid=null;
      }

      if(!verifiedGrid){
        verifiedGrid=document.createElement('div');
        verifiedGrid.className='seh-player-team-grid';
        verifiedGrid.dataset.verifiedTeamSignature=verifiedSignature;

        verifiedGroups.forEach(group=>{
          const teamId=Number(group.safeLinkTeamId)||0;
          const card=teamId>0?document.createElement('a'):document.createElement('div');
          card.className='seh-player-team-card';

          if(teamId>0){
            card.href=`#/lag/${teamId}`;
            card.setAttribute('data-load','');
          }

          const buildLogoFallback=()=>{
            const fallback=document.createElement('div');
            fallback.className='seh-player-team-logo-fallback';
            fallback.textContent=group.name
              .split(/\s+/)
              .filter(Boolean)
              .map(part=>part[0]||'')
              .join('')
              .slice(0,2)
              .toUpperCase() || '—';
            return fallback;
          };

          const logoUrl=sehVerifiedTeamLogoUrl(group.name,group.club);
          if(logoUrl){
            const logo=document.createElement('img');
            logo.className='logo';
            logo.alt=group.name;
            logo.onerror=()=>{
              if(logo.isConnected)logo.replaceWith(buildLogoFallback());
            };
            logo.src=logoUrl;
            card.appendChild(logo);
          }else{
            card.appendChild(buildLogoFallback());
          }

          const titleEl=document.createElement('span');
          titleEl.className='title';
          titleEl.textContent=group.name;
          card.appendChild(titleEl);

          const metaEl=document.createElement('span');
          metaEl.className='meta';

          const seasonCount=document.createElement('strong');
          seasonCount.className='season-count';
          seasonCount.textContent=String(group.seasonCount);

          const seasonLabel=document.createElement('span');
          seasonLabel.className='season-label';
          seasonLabel.textContent=group.seasonCount===1?'säsong':'säsonger';

          metaEl.appendChild(seasonCount);
          metaEl.appendChild(seasonLabel);

          if(group.leagueList.length){
            const dot=document.createElement('span');
            dot.className='team-meta-dot';
            dot.textContent='·';

            const leaguesEl=document.createElement('span');
            leaguesEl.className='team-leagues';
            leaguesEl.textContent=group.leagueList.join(' · ');

            metaEl.appendChild(dot);
            metaEl.appendChild(leaguesEl);
          }

          card.appendChild(metaEl);
          verifiedGrid.appendChild(card);
        });

        if(verifiedGrid.children.length){
          const desc=[...section.querySelectorAll('p')].find(p=>
            /Lag spelaren har representerat i historiken/i.test(sehCleanText(p.textContent||''))
          );
          (desc||heading).insertAdjacentElement('afterend',verifiedGrid);
        }
      }

      if(verifiedGrid?.children.length){
        const websiteTeamGrid=section.querySelector('#playerTeamsGrid');
        if(websiteTeamGrid && !websiteTeamGrid.contains(verifiedGrid)){
          websiteTeamGrid.style.setProperty('display','none','important');
          websiteTeamGrid.style.setProperty('height','0','important');
          websiteTeamGrid.style.setProperty('min-height','0','important');
          websiteTeamGrid.style.setProperty('max-height','0','important');
          websiteTeamGrid.style.setProperty('margin','0','important');
          websiteTeamGrid.style.setProperty('padding','0','important');
          websiteTeamGrid.setAttribute('aria-hidden','true');
        }

        // Hide other legacy source rows while preserving the heading/description.
        [...section.children].forEach(child=>{
          if(child===heading || heading.contains(child) || child===verifiedGrid)return;
          if(child===websiteTeamGrid)return;

          const txt=sehCleanText(child.textContent||'');
          if(/Lag spelaren har representerat i historiken/i.test(txt) && txt.length<240)return;

          if(/\b\d+\s+säsong(?:er)?\b/i.test(txt)){
            child.classList.add('seh-player-team-original-list-hide');
          }
        });

        return;
      }
    }

    /*
     * V5.19:
     * Source rows are detected from the "X säsong(er)" text instead of IMG/link.
     * That includes teams that only have fallback initials (SS, TI, N5 etc).
     */
    const seasonNodes=[...section.querySelectorAll('*')].filter(el=>{
      if(el.closest('.seh-player-team-grid'))return false;
      const t=sehCleanText(el.textContent||'');
      return /^\d+\s+säsong(?:er)?(?:\s*·.*)?$/i.test(t);
    });

    const rows=[];
    const seenRows=new Set();

    seasonNodes.forEach(seasonNode=>{
      let node=seasonNode;
      let best=null;

      for(let depth=0; node && node!==section && depth<8; depth++,node=node.parentElement){
        const txt=sehCleanText(node.innerText||'');
        const seasons=(txt.match(/\b\d+\s+säsong(?:er)?\b/gi)||[]).length;

        if(
          seasons===1 &&
          txt.length>seasonNode.textContent.length &&
          txt.length<900
        ){
          best=node;
        }

        if(seasons>1)break;
      }

      if(best && best!==section && !seenRows.has(best)){
        seenRows.add(best);
        rows.push(best);
      }
    });

    if(!rows.length)return;

    let grid=section.querySelector('.seh-player-team-grid');

    // Rebuild the grid if the source has more teams than our existing app grid.
    if(grid && grid.children.length < rows.length){
      grid.remove();
      grid=null;
    }

    if(!grid){
      grid=document.createElement('div');
      grid.className='seh-player-team-grid';

      const seenNames=new Set();

      rows.forEach(row=>{
        const seasonNode=[...row.querySelectorAll('*')].find(el=>
          /^\d+\s+säsong(?:er)?(?:\s*·.*)?$/i.test(sehCleanText(el.textContent||''))
        );

        if(!seasonNode)return;

        let title='';
        const candidates=[...row.querySelectorAll('h1,h2,h3,h4,strong,b,a,span,div')];

        for(const el of candidates){
          if(el===seasonNode || el.contains(seasonNode))continue;
          const t=sehCleanText(el.textContent||'');
          if(!t || t.length>80)continue;
          if(/^\d+\s+säsong/i.test(t))continue;
          if(/^(ECL|SCL|SEC|SM|SG|SPORTSGAMER|eSHL|ITHL|GCL)(\s*·.*)?$/i.test(t))continue;
          if(/^[A-ZÅÄÖ0-9]{1,3}$/i.test(t) && !el.matches('h1,h2,h3,h4,strong,b,a'))continue;

          title=t;
          break;
        }

        if(!title){
          const rowText=sehCleanText(row.innerText||'');
          title=rowText
            .replace(/\b\d+\s+säsong(?:er)?\b.*$/i,'')
            .trim();
        }

        if(!title)return;
        const key=title.toLowerCase();
        if(seenNames.has(key))return;
        seenNames.add(key);

        let meta=sehCleanText(seasonNode.textContent||'')
          .replace(/SPORTSGAMER/gi,'SG')
          .replace(/\s*·\s*/g,' · ')
          .trim();

        const img=row.querySelector('img');
        const link=row.querySelector('a[href]');
        const href=link?.href || '';

        const card=href ? document.createElement('a') : document.createElement('div');
        card.className='seh-player-team-card';
        if(href){
          card.href=href;
          card.setAttribute('data-load','');
        }

        const buildTeamLogoFallback=()=>{
          const fallback=document.createElement('div');
          fallback.className='seh-player-team-logo-fallback';

          // Prefer the site's own fallback initials if present.
          const fallbackText=[...row.querySelectorAll('*')]
            .map(el=>sehCleanText(el.textContent||''))
            .find(t=>/^[A-ZÅÄÖ0-9]{1,3}$/i.test(t) && t.toLowerCase()!==title.toLowerCase());

          fallback.textContent=fallbackText || title
            .split(/\s+/)
            .map(x=>x[0]||'')
            .join('')
            .slice(0,2)
            .toUpperCase();

          return fallback;
        };

        if(img){
          const logo=document.createElement('img');
          logo.className='logo';
          logo.alt=title;

          const sourceLogo=sehWebAppTeamLogo(String(img.currentSrc||img.src||'').trim(),title);
          const remoteLogo=sehWebAppTeamLogo('',title);
          let triedRemote=false;

          // V684: source-row images can point at a local WebView path that fails
          // for some Unicode filenames (e.g. Färjestad BK). Keep the working
          // source URL first, but retry the canonical GitHub Pages team-logo URL
          // before falling back to initials. No team-specific exceptions.
          logo.onerror=()=>{
            if(!triedRemote && remoteLogo && logo.src!==remoteLogo){
              triedRemote=true;
              logo.src=remoteLogo;
              return;
            }
            const fallback=buildTeamLogoFallback();
            if(logo.isConnected)logo.replaceWith(fallback);
          };

          logo.src=sourceLogo || remoteLogo;
          card.appendChild(logo);
        }else{
          card.appendChild(buildTeamLogoFallback());
        }

        const titleEl=document.createElement('span');
        titleEl.className='title';
        titleEl.textContent=title;
        card.appendChild(titleEl);

        if(meta){
          const metaEl=document.createElement('span');
          metaEl.className='meta';

          const metaMatch=meta.match(/^(\d+)\s+säsong(?:er)?(?:\s*·\s*(.*))?$/i);
          if(metaMatch){
            const seasonCount=document.createElement('strong');
            seasonCount.className='season-count';
            seasonCount.textContent=metaMatch[1];

            const seasonLabel=document.createElement('span');
            seasonLabel.className='season-label';
            seasonLabel.textContent=Number(metaMatch[1])===1?'säsong':'säsonger';

            metaEl.appendChild(seasonCount);
            metaEl.appendChild(seasonLabel);

            const leagues=String(metaMatch[2]||'').trim();
            if(leagues){
              const dot=document.createElement('span');
              dot.className='team-meta-dot';
              dot.textContent='·';

              const leaguesEl=document.createElement('span');
              leaguesEl.className='team-leagues';
              leaguesEl.textContent=leagues;

              metaEl.appendChild(dot);
              metaEl.appendChild(leaguesEl);
            }
          }else{
            metaEl.textContent=meta;
          }
          card.appendChild(metaEl);
        }

        grid.appendChild(card);
      });

      if(grid.children.length){
        const desc=[...section.querySelectorAll('p')].find(p=>
          /Lag spelaren har representerat i historiken/i.test(sehCleanText(p.textContent||''))
        );
        (desc||heading).insertAdjacentElement('afterend',grid);
      }
    }

    /*
     * V5.23:
     * Keep the website's source rows in the DOM but hide them while the app
     * grid is active. Removing framework-managed rows can make the SPA paint
     * them back again, which caused both the old list and the new app grid to
     * be visible at the same time.
     */
    if(grid && grid.children.length){
      // V5.25: hide the website's source container only AFTER the app cards
      // have been created. If CSS hides it before this function runs, the
      // innerText-based source detection sees no teams and no app grid is built.
      const websiteTeamGrid=section.querySelector('#playerTeamsGrid');
      if(websiteTeamGrid && !websiteTeamGrid.contains(grid)){
        websiteTeamGrid.style.setProperty('display','none','important');
        websiteTeamGrid.style.setProperty('height','0','important');
        websiteTeamGrid.style.setProperty('min-height','0','important');
        websiteTeamGrid.style.setProperty('max-height','0','important');
        websiteTeamGrid.style.setProperty('margin','0','important');
        websiteTeamGrid.style.setProperty('padding','0','important');
        websiteTeamGrid.style.setProperty('overflow','hidden','important');
        websiteTeamGrid.setAttribute('aria-hidden','true');
      }

      rows.forEach(row=>{
        if(
          row &&
          row.isConnected &&
          !row.closest('.seh-player-team-grid') &&
          !row.contains(grid)
        ){
          row.classList.add('seh-player-team-original-row-hide');
        }
      });

      const hideOriginalTeamRows=(root,stopNode)=>{
        const leftovers=[...root.querySelectorAll('*')].filter(el=>{
          if(el.closest('.seh-player-team-grid,.seh-player-history-cards'))return false;
          const t=sehCleanText(el.textContent||'');
          return /^\d+\s+säsong(?:er)?(?:\s*·.*)?$/i.test(t);
        });

        leftovers.forEach(el=>{
          let node=el;
          let rowToHide=null;

          for(let depth=0; node && node!==stopNode && depth<10; depth++,node=node.parentElement){
            if(node.contains(grid))break;

            const txt=sehCleanText(node.innerText||'');
            const seasons=(txt.match(/\b\d+\s+säsong(?:er)?\b/gi)||[]).length;

            if(seasons===1 && txt.length<1100){
              rowToHide=node;
            }else if(seasons>1){
              break;
            }
          }

          if(
            rowToHide &&
            rowToHide.isConnected &&
            !rowToHide.closest('.seh-player-team-grid') &&
            !rowToHide.contains(grid)
          ){
            rowToHide.classList.add('seh-player-team-original-row-hide');
          }
        });
      };

      // First clean the detected Lag section, then the full player page. The
      // latter catches source rows that a later SPA render places outside the
      // section wrapper selected when the app grid was first created.
      hideOriginalTeamRows(section,section);
      hideOriginalTeamRows(main,main);
    }
  }

  function adaptPlayerMeritsSection(){
    if(route().kind!=='player')return;
    const main=document.querySelector('main');
    if(!main)return;
    const heading=sehFindProfileHeading(/^MERITER$/i);
    if(!heading)return;
    const section=sehFindSectionAround(heading,node=>{
      const txt=sehCleanText(node.innerText||'');
      return /MERITER/i.test(txt) && txt.length<4000 && /Mästare|Finalist|Brons|Silver/i.test(txt);
    },8);
    if(!section || section.querySelector('.seh-player-merit-list')) return;

    let raw=[];
    const lis=[...section.querySelectorAll('li')].map(li=>sehCleanText(li.innerText||'')).filter(Boolean);
    if(lis.length) raw=lis;
    else {
      raw=(section.innerText||'').split(/\n+/).map(x=>sehCleanText(x)).filter(x=>x && !/^MERITER$/i.test(x));
      raw=raw.filter(x=>x.length>12);
    }
    if(!raw.length)return;

    const list=document.createElement('div');
    list.className='seh-player-merit-list';

    raw.forEach(line=>{
      let cleaned=line.replace(/\b6v6\b/gi,'').replace(/\s+-\s+-/g,' - ').replace(/\s{2,}/g,' ').trim();
      cleaned=cleaned.replace(/\s+-\s+med\s+/i,' med ');
      cleaned=cleaned.replace(/\s+med\s+/i,' med ');
      cleaned=cleaned.replace(/\s+\.$/,'.');
      if(!cleaned) return;

      // V5.37: att vinna ett kval är inte en merit.
      // Exempel: "Mästare i ECL 12 - Lite Qualifier" ska inte visas.
      // Filtrera både engelska Qualifier och svenska kval/kvalificering.
      if(/\bqualifier\b|\bkval(?:et|en|ificering|ifikation)?\b/i.test(cleaned)) return;

      let icon='🏅';
      let type='';
      if(/^mästare/i.test(cleaned)){
        icon='🏆';
        type='Mästare';
      } else if(/^brons/i.test(cleaned)){
        icon='🥉';
        type='Brons';
      } else if(/^silver/i.test(cleaned)){
        icon='🥈';
        type='Silver';
      } else if(/^finalist/i.test(cleaned)){
        icon='🥈';
        type='Silver';
      }

      let title = cleaned
        .replace(/^(Mästare|Brons|Silver|Finalist)\s+i\s+/i,'')
        .replace(/^(Mästare|Brons|Silver|Finalist)\s+/i,'')
        .replace(/\.$/,'')
        .trim();

      title = title
        .replace(/European Championship League/gi,'ECL')
        .replace(/German Championship League/gi,'GCL')
        .replace(/Swedish Championship League/gi,'SCL')
        .replace(/Svenska eHockey Cupen/gi,'SEC')
        .replace(/Svenska Mästerskapet/gi,'SM')
        .replace(/\s{2,}/g,' ')
        .trim();

      let sub='';
      const medIdx=title.search(/\smed\s/i);
      if(medIdx>0){
        sub=title.slice(medIdx+1).trim();
        title=title.slice(0,medIdx).trim();
      }

      const card=document.createElement('div');
      card.className='seh-player-merit-card';
      card.innerHTML=`<div class="seh-player-merit-icon">${htmlEscape(icon)}</div><div class="seh-player-merit-text">${type?`<span class="type">${htmlEscape(type)}</span>`:''}<span class="main">${htmlEscape(title)}</span>${sub?`<span class="sub">${htmlEscape(sub)}</span>`:''}</div>`;
      list.appendChild(card);
    });

    [...section.children].forEach(ch=>{
      if(ch===heading || heading.contains(ch)) return;
      ch.style.setProperty('display','none','important');
    });
    heading.insertAdjacentElement('afterend',list);
  }


  const sehNationalTeamSummaryCache=(window.__SEH_NATIONAL_TEAM_SUMMARY_CACHE__ instanceof Map)
    ? window.__SEH_NATIONAL_TEAM_SUMMARY_CACHE__
    : (window.__SEH_NATIONAL_TEAM_SUMMARY_CACHE__=new Map());

  function sehFlagEmoji(countryCode){
    const code=String(countryCode||'').trim().toUpperCase();
    if(!/^[A-Z]{2}$/.test(code))return '★';
    return String.fromCodePoint(...[...code].map(ch=>127397+ch.charCodeAt(0)));
  }

  function sehIsWorldCupNationalTeamRow(row){
    if(!row)return false;
    const source=[
      row.league_name,
      row.season_label,
      row.competition_name,
      row.catalog_display_name
    ].filter(Boolean).join(' ');
    if(!/world\s+cup/i.test(source))return false;
    // SG World var ett blandat "World"-lag 2025, inte ett landslag.
    return String(row.team_external_id||'').trim()!=='6081';
  }

  function sehCanonicalWorldCupTeamName(detail,fallbackName=''){
    const fallback=sehCleanText(fallbackName||'');
    if(!sehIsWorldCupNationalTeamRow(detail))return fallback;

    const current=sehCleanText(detail?.team_current_name||'');
    const tournament=sehCleanText(detail?.team_name_in_tournament||'');
    let name=current||tournament||fallback;
    if(/^SG\s+/i.test(name))name=name.replace(/^SG\s+/i,'eHockey ');
    if(/^SG\s+/i.test(tournament) && (!current || /^SG\s+/i.test(current))){
      name=tournament.replace(/^SG\s+/i,'eHockey ');
    }
    return name||fallback;
  }

  const sehNationalCountryAliases=[
    {rx:/^(?:sweden|sverige)$/i,code:'SE',name:'Sverige',phrase:'det svenska landslaget'},
    {rx:/^(?:denmark|danmark)$/i,code:'DK',name:'Danmark',phrase:'det danska landslaget'},
    {rx:/^(?:finland)$/i,code:'FI',name:'Finland',phrase:'det finska landslaget'},
    {rx:/^(?:norway|norge)$/i,code:'NO',name:'Norge',phrase:'det norska landslaget'},
    {rx:/^(?:germany|tyskland)$/i,code:'DE',name:'Tyskland',phrase:'det tyska landslaget'},
    {rx:/^(?:czechia|czech republic|tjeckien)$/i,code:'CZ',name:'Tjeckien',phrase:'det tjeckiska landslaget'},
    {rx:/^(?:latvia|lettland)$/i,code:'LV',name:'Lettland',phrase:'det lettiska landslaget'},
    {rx:/^(?:poland|polen)$/i,code:'PL',name:'Polen',phrase:'det polska landslaget'},
    {rx:/^(?:austria|österrike)$/i,code:'AT',name:'Österrike',phrase:'det österrikiska landslaget'},
    {rx:/^(?:switzerland|schweiz)$/i,code:'CH',name:'Schweiz',phrase:'det schweiziska landslaget'},
    {rx:/^(?:belgium|belgien)$/i,code:'BE',name:'Belgien',phrase:'det belgiska landslaget'},
    {rx:/^(?:netherlands|holland|nederländerna)$/i,code:'NL',name:'Nederländerna',phrase:'det nederländska landslaget'},
    {rx:/^(?:great britain|united kingdom|uk|storbritannien)$/i,code:'GB',name:'Storbritannien',phrase:'det brittiska landslaget'},
    {rx:/^(?:canada|kanada)$/i,code:'CA',name:'Kanada',phrase:'det kanadensiska landslaget'},
    {rx:/^(?:usa|united states|united states of america)$/i,code:'US',name:'USA',phrase:'det amerikanska landslaget'}
  ];

  function sehNationalCountryFromHistoryRow(row){
    const canonical=sehCanonicalWorldCupTeamName(row,row?.team_current_name||row?.team_name_in_tournament||'');
    const raw=sehCleanText(canonical)
      .replace(/^eHockey\s+/i,'')
      .replace(/^SG\s+/i,'')
      .trim();
    const mapped=sehNationalCountryAliases.find(item=>item.rx.test(raw));
    if(mapped)return mapped;
    return {
      code:'',
      name:raw||canonical||'Landslag',
      phrase:raw?`${raw} landslaget`:'landslaget'
    };
  }

  function sehNationalTeamSummaryFromHistoryRows(rows){
    const grouped=new Map();
    (Array.isArray(rows)?rows:[]).filter(sehIsWorldCupNationalTeamRow).forEach(row=>{
      const country=sehNationalCountryFromHistoryRow(row);
      const canonicalName=sehCanonicalWorldCupTeamName(row,row?.team_current_name||row?.team_name_in_tournament||country.name);
      const groupKey=country.code || canonicalName.toLocaleLowerCase('sv-SE');
      const games=Math.max(0,Number(row?.appearance_games ?? 0)) || Math.max(
        Number(row?.total_skater_games||0),
        Number(row?.total_goalie_games||0)
      );
      if(games<=0)return;
      const tournamentKey=String(row?.external_league_id||row?.league_id||row?.season_label||row?.league_name||'').trim();
      let item=grouped.get(groupKey);
      if(!item){
        item={
          player_key:String(row?.player_key||''),
          team_external_id:String(row?.team_external_id||''),
          country_code:country.code,
          country_name_sv:country.name,
          canonical_display_name:canonicalName,
          national_team_phrase_sv:country.phrase,
          matches:0,
          tournaments:0,
          first_tournament_label:'',
          latest_tournament_label:'',
          _tournaments:new Set()
        };
        grouped.set(groupKey,item);
      }
      item.matches+=games;
      if(tournamentKey)item._tournaments.add(tournamentKey);
      const label=sehCleanText(row?.season_label||row?.league_name||'');
      if(!item.latest_tournament_label && label)item.latest_tournament_label=label;
      if(label)item.first_tournament_label=label;
    });
    return [...grouped.values()].map(item=>{
      item.tournaments=item._tournaments.size;
      delete item._tournaments;
      return item;
    }).sort((a,b)=>Number(b.matches||0)-Number(a.matches||0));
  }

  function sehLoadNationalTeamSummary(main){
    const identity=sehProfileHistoryIdentity(main);
    if(!identity.routeKey && !identity.name)return null;

    let state=sehNationalTeamSummaryCache.get(identity.cacheKey);
    if(!state){
      state={rows:null,promise:null,error:null,historyVersion:-1};
      sehNationalTeamSummaryCache.set(identity.cacheKey,state);
    }

    const historyState=sehLoadProfileHistoryDetails(main);
    if(!historyState)return state;

    const applyHistoryRows=rows=>{
      state.rows=sehNationalTeamSummaryFromHistoryRows(rows);
      state.historyVersion=Number(historyState.version||0);
      state.error=null;
      return state.rows;
    };

    if(Array.isArray(historyState.rows)){
      if(state.rows===null || state.historyVersion!==Number(historyState.version||0))applyHistoryRows(historyState.rows);
      return state;
    }

    if(historyState.promise && !state.promise){
      state.promise=historyState.promise
        .then(rows=>applyHistoryRows(rows))
        .catch(error=>{
          state.rows=[];
          state.error=error;
          return state.rows;
        })
        .finally(()=>{
          state.promise=null;
          setTimeout(()=>{
            try{scheduleAdaptiveContent(0);}catch(_){try{adaptAppContent();}catch(__){}}
          },0);
        });
    }

    return state;
  }


  function adaptPlayerPersonalMeritsSection(){
    if(route().kind!=='player')return;
    const main=document.querySelector('main');
    if(!main)return;

    const source=main.querySelector('#personalMeritsList');
    if(!source)return;

    const nationalState=sehLoadNationalTeamSummary(main);
    const nationalRows=Array.isArray(nationalState?.rows)?nationalState.rows:[];

    const normalizeSeries=v=>sehCleanText(v)
      .replace(/[–—]/g,' - ')
      .replace(/European Championship League/gi,'ECL')
      .replace(/German Championship League/gi,'GCL')
      .replace(/Swedish Championship League/gi,'SCL')
      .replace(/Svenska eHockey Cupen/gi,'SEC')
      .replace(/Svenska Mästerskapet/gi,'SM')
      .replace(/\b6v6\b/gi,'')
      .replace(/\s+-\s+/g,' - ')
      .replace(/\s{2,}/g,' ')
      .trim();

    const rows=[...source.querySelectorAll('.player-merit-row')]
      .map(row=>({
        icon:sehCleanText(row.querySelector('.player-merit-icon')?.textContent||''),
        text:normalizeSeries(row.querySelector('p')?.textContent||row.textContent||'')
      }))
      .filter(item=>item.text)
      // Landslagsrepresentation byggs från den datadrivna Supabase-sammanfattningen nedan.
      // Filtrera bort webbens äldre personliga-merit-rad så samma merit inte visas två gånger.
      .filter(item=>!(nationalRows.length && /representerat\s+(?:det\s+)?[^.]{0,50}landslaget/i.test(item.text)));

    if(!rows.length && !nationalRows.length)return;

    const nationalSignature=nationalRows
      .map(row=>`${row.country_code}|${row.matches}|${row.tournaments}`)
      .join('|');
    const signature=rows.map(item=>`${item.icon}|${item.text}`).join('||')+`||NT:${nationalSignature}`;
    let old=main.querySelector('.seh-player-personal-merit-list');
    if(old?.dataset.sourceSignature===signature){
      source.style.setProperty('display','none','important');
      return;
    }
    if(old)old.remove();

    const items=rows.map(row=>{
      const text=row.text.replace(/\.$/,'').trim();
      let icon=row.icon || '★';
      let type='Personlig merit';
      let mainText=text;
      let sub='';

      const highest=text.match(/^Högsta\s+ECL-?nivå\s+i\s+historiken\s*:\s*(.+)$/i);
      if(highest){
        icon='N';
        type='Högsta ECL-nivå';
        mainText=highest[1].replace(/\.$/,'').trim();
        return {icon,type,main:mainText,sub};
      }

      const leader=text.match(/^(Delad\s+)?(målkung|poängkung|assistkung)(?:\s+bland\s+(.+?))?\s+i\s+(.+?)(?:\s+-\s+(.+))?$/i);
      if(leader){
        const shared=!!leader[1];
        const kind=leader[2].toLowerCase();
        const group=leader[3]||'';
        const competition=leader[4]||'';
        const stat=leader[5]||'';
        const label=kind.charAt(0).toUpperCase()+kind.slice(1);
        type=`${shared?'Delad ':''}${label}`;
        mainText=normalizeSeries(competition);
        sub=[group?`Bland ${group}`:'',stat].filter(Boolean).join(' · ');
        if(!row.icon || row.icon==='★'){
          icon=kind==='målkung'?'M':kind==='poängkung'?'P':'A';
        }
        return {icon,type,main:mainText,sub};
      }

      const placement=text.match(/^(\d+)\s*:\s*a\s+i\s+(.+?)\s+i\s+(.+?)(?:\s+-\s+(.+))?$/i);
      if(placement){
        icon=placement[1];
        type=`${placement[1]}:a · ${placement[2]}`;
        mainText=normalizeSeries(placement[3]);
        sub=placement[4]||'';
        return {icon,type,main:mainText,sub};
      }

      const split=text.match(/^(.*?)\s+-\s+(.+)$/);
      if(split){
        mainText=normalizeSeries(split[1]);
        sub=split[2].trim();
      }

      return {icon,type,main:mainText,sub};
    });

    const nationalItems=nationalRows
      .slice()
      .sort((a,b)=>Number(b.matches||0)-Number(a.matches||0))
      .map(row=>{
        const matches=Number(row.matches||0);
        const tournaments=Number(row.tournaments||0);
        return {
          icon:sehFlagEmoji(row.country_code),
          type:'LANDSLAG',
          main:sehCleanText(row.country_name_sv||row.canonical_display_name||'Landslag'),
          sub:`${matches.toLocaleString('sv-SE')} ${matches===1?'match':'matcher'}${tournaments>0?` · ${tournaments} ${tournaments===1?'World Cup-turnering':'World Cup-turneringar'}`:''}`
        };
      });

    if(nationalItems.length){
      const levelIndex=items.findIndex(item=>item.type==='Högsta ECL-nivå');
      if(levelIndex>=0)items.splice(levelIndex,0,...nationalItems);
      else items.push(...nationalItems);
    }

    const list=document.createElement('div');
    list.className='seh-player-personal-merit-list';
    list.dataset.sourceSignature=signature;

    items.forEach(item=>{
      const card=document.createElement('div');
      card.className='seh-player-personal-merit-card';
      card.innerHTML=`<div class="seh-player-personal-merit-icon">${htmlEscape(item.icon)}</div><div class="seh-player-personal-merit-text"><span class="type">${htmlEscape(item.type)}</span><span class="main">${htmlEscape(item.main)}</span>${item.sub?`<span class="sub">${htmlEscape(item.sub)}</span>`:''}</div>`;
      list.appendChild(card);
    });

    source.insertAdjacentElement('afterend',list);
    source.style.setProperty('display','none','important');
  }


  function adaptPlayerProfileLayout(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    if(!main)return;
    main.classList.add('seh-player-profile-root');
    document.body.classList.add('seh-player-profile-active');

    const nameEl=main.querySelector('.player-profile-name,h1');
    if(nameEl){
      const heroImages=[...main.querySelectorAll('img')].filter(img=>{
        if(!img || !img.isConnected)return false;
        if(img.closest('.seh-player-team-brand,.seh-player-history-cards,.seh-player-team-grid,.seh-player-merit-list,.seh-player-personal-merit-list,#playerBio,table'))return false;
        try{return !!(img.compareDocumentPosition(nameEl)&Node.DOCUMENT_POSITION_FOLLOWING);}
        catch(_){return false;}
      });
      const heroPhoto=heroImages.sort((a,b)=>(b.naturalWidth*b.naturalHeight||0)-(a.naturalWidth*a.naturalHeight||0))[0]||null;
      if(heroPhoto)heroPhoto.classList.add('seh-player-hero-photo');
    }

    const bio=main.querySelector('#playerBio');
    if(bio){
      bio.classList.add('seh-player-bio-section');
      let kicker=bio.querySelector('.seh-player-bio-kicker');
      if(!kicker){
        kicker=document.createElement('div');
        kicker.className='seh-player-bio-kicker';
        kicker.textContent='OM SPELAREN';
        bio.insertAdjacentElement('afterbegin',kicker);
      }
    }

    [sehFindProfileHeading(/^MERITER$/i),sehFindProfileHeading(/^PERSONLIGA MERITER$/i)].forEach(heading=>{
      if(heading)heading.classList.add('seh-player-section-heading');
    });
  }


  function adaptPlayerTabbedProfile(){
    const existingRoot=document.querySelector('body > .seh-player-native-root');
    if(route().kind!=='player'){
      document.documentElement.classList.remove('seh-player-route-pending');
      existingRoot?.remove();
      const oldMain=document.querySelector('main');
      oldMain?.classList.remove('seh-player-native-source-host');
      oldMain?.removeAttribute('aria-hidden');
      document.body.classList.remove('seh-player-profile-active','seh-player-native-v581');
      return;
    }
    const main=document.querySelector('main');
    if(!main)return;
    const currentRouteKey=location.pathname+location.hash;

    // V718: the Android player profile no longer waits for the website to
    // materialize history/team DOM. The public history RPC is the source of
    // truth and its version (plus verified alias version) controls rebuilds.
    const directHistoryState=sehLoadProfileHistoryDetails(main);
    const directHistoryRows=Array.isArray(directHistoryState?.rows)?directHistoryState.rows:[];
    const directAliasState=sehLoadVerifiedTeamAliases();
    const directDataSignature=`h:${Number(directHistoryState?.version||0)}:${directHistoryRows.length}|a:${Number(directAliasState?.version||0)}`;

    // V716/V718: a sparse or stale mobile profile is not final. A completed
    // profile is reused only while the actual Supabase data signature matches.
    if(
      existingRoot?.dataset.routeKey===currentRouteKey &&
      existingRoot.dataset.provisional!=='1' &&
      existingRoot.dataset.sourceSparse!=='1' &&
      existingRoot.dataset.dataSignature===directDataSignature
    )return;

    // V671: vänta bara tills webbprofilens egen laddning är klar. Sparse/standalone-
    // profiler saknar legitimt vissa adapterblock (laggrid, meriter, historikkort osv.)
    // och får därför inte fastna på snabbprofilens skeleton för alltid.
    if(main.hidden)return;

    // V645: behåll snabbprofilen synlig medan legacy-webbprofilen laddar i bakgrunden.
    // Den gamla profilsidan får aldrig blinka fram mellan preview och full native-profil.
    // DOM-källan kan fortfarande läsas/adaptras trots att main är dold.
    main.classList.add('seh-player-native-source-host');
    main.setAttribute('aria-hidden','true');

    const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
    const esc=v=>htmlEscape(String(v||''));
    const nameEl=main.querySelector('.player-profile-name,h1');
    if(!nameEl)return;

    // V675: V671 gjorde sparse-profiler möjliga, men kunde låsa in native-profilen
    // innan webbens asynkrona meritblock hunnit renderas. Vänta därför på den
    // kompletta gamla källstrukturen när den finns. Profiler som legitimt saknar
    // historik/meriter får fortfarande gå vidare efter en kort, begränsad timeout.
    const bioSource=main.querySelector('#playerBio');
    let teamsGridSource=main.querySelector('.seh-player-team-grid');
    let historyCardsSource=main.querySelector('.seh-player-history-cards');
    const meritListSource=main.querySelector('.seh-player-merit-list');
    const personalListSource=main.querySelector('.seh-player-personal-merit-list');
    let careerGrids=[...main.querySelectorAll('.seh-player-career-grid')];

    // V718: once Supabase history exists, build the visible app sources from
    // those rows directly. Never require the remote website to first render a
    // legacy table/card grid inside Android WebView.
    if(directHistoryRows.length){
      const directCards=sehBuildDirectPlayerHistoryCards(directHistoryRows);
      const directTeams=sehBuildDirectPlayerTeamGrid(directHistoryRows);
      const directCareer=sehDirectPlayerCareerGrids(directHistoryRows);
      if(directCards.children.length)historyCardsSource=directCards;
      if(directTeams.children.length)teamsGridSource=directTeams;
      // v728: Supabase role games are authoritative. If a player has 0 games
      // in one role, never leak a legacy web career block for that role.
      careerGrids=directCareer;
    }

    const directCoreReady=!!(
      directHistoryRows.length &&
      teamsGridSource && teamsGridSource.children.length &&
      historyCardsSource && historyCardsSource.children.length
    );
    const richSourceReady=!!(
      bioSource &&
      teamsGridSource && teamsGridSource.children.length &&
      historyCardsSource && historyCardsSource.children.length &&
      meritListSource &&
      personalListSource &&
      careerGrids.length
    );

    const waitState=window.__SEH_PLAYER_NATIVE_SOURCE_WAIT__;
    if(!waitState || waitState.routeKey!==currentRouteKey){
      window.__SEH_PLAYER_NATIVE_SOURCE_WAIT__={routeKey:currentRouteKey,since:Date.now()};
    }
    const sourceWaitAge=Date.now()-Number(window.__SEH_PLAYER_NATIVE_SOURCE_WAIT__?.since||Date.now());

    // V716: start/observe the public history RPC before deciding that a sparse
    // source is genuinely empty. The previous 1100 ms fallback was fine on
    // Desktop Dev but too aggressive on a phone: the app could freeze a final
    // empty Statistik/Lag view and then delete the source DOM before Supabase
    // returned.
    const mobileHistoryState=directHistoryState;
    const mobileHistoryPending=!!mobileHistoryState?.promise && mobileHistoryState?.rows===null;

    if(!richSourceReady && !directCoreReady){
      // Give the normal web/source hydration a short minimum window first.
      if(sourceWaitAge<2500)return;

      // If the direct history RPC is still in flight, keep the fast profile
      // visible for a bounded period instead of committing an empty final UI.
      if(mobileHistoryPending && sourceWaitAge<10000)return;

      // A sparse native profile may be shown as a last-resort fallback, but it
      // must never be rebuilt repeatedly while the hidden source is unchanged.
      // Once the source becomes rich, MutationObserver/scheduleAdaptiveContent
      // re-enters here and the profile is rebuilt with the real data.
      if(existingRoot?.dataset.sourceSparse==='1')return;
    }

    const bio=bioSource||document.createElement('div');
    const ranking=main.querySelector('.seh-player-ranking-card');
    const teamsGrid=teamsGridSource||document.createElement('div');
    const historyCards=historyCardsSource||document.createElement('div');
    const meritList=meritListSource||document.createElement('div');
    const personalList=personalListSource||document.createElement('div');
    if(!teamsGrid.classList.contains('seh-player-team-grid'))teamsGrid.classList.add('seh-player-team-grid');
    if(!historyCards.classList.contains('seh-player-history-cards'))historyCards.classList.add('seh-player-history-cards');
    if(!meritList.classList.contains('seh-player-merit-list'))meritList.classList.add('seh-player-merit-list');
    if(!personalList.classList.contains('seh-player-personal-merit-list'))personalList.classList.add('seh-player-personal-merit-list');

    const heroPhoto=main.querySelector('.seh-player-hero-photo') || [...main.querySelectorAll('img')].find(img=>{
      if(img.closest('.seh-player-team-brand,.seh-player-team-grid,.seh-player-history-cards,.seh-player-merit-list,.seh-player-personal-merit-list'))return false;
      return (img.naturalWidth||0)>150 && (img.naturalHeight||0)>150;
    });
    const teamBrand=main.querySelector('.seh-player-team-brand');
    const fastProfileData=sehReadFastProfileNav();
    const directLatestForHero=[...directHistoryRows].sort((a,b)=>sehHistoryChronologyMs(b)-sehHistoryChronologyMs(a))[0]||null;
    const teamName=clean(
      directLatestForHero?.team_name_in_tournament||
      fastProfileData?.latestTeam||
      main.querySelector('.seh-player-team-brand-pill')?.textContent||
      main.querySelector('#playerCurrentTeam')?.textContent||
      ''
    );
    const teamLogo=
      fastProfileData?.teamLogo||
      teamBrand?.querySelector('img')?.currentSrc||
      teamBrand?.querySelector('img')?.src||
      main.querySelector('#playerCurrentTeam img')?.currentSrc||
      main.querySelector('#playerCurrentTeam img')?.src||
      zeroTeamLogoUrl(teamName);
    const playerName=clean(nameEl.textContent||'Spelare');
    const allText=clean(main.innerText||'');

    const directSummary=directHistoryRows.length?sehDirectPlayerHistorySummary(directHistoryRows):null;
    const leagueOrder=['ECL','SEC','SCL','SM','eSHL','FCL','GCL','RCL','ITHL','LGEL'];
    const leagueSearchText=[
      ...[...main.querySelectorAll('.seh-player-history-filterbar button,.seh-player-history-filterbar a')].map(el=>clean(el.textContent||'')),
      clean(historyCards?.innerText||''),
      clean(main.querySelector('.seh-player-history-table-hidden')?.innerText||''),
      allText
    ].join(' ');
    const legacyLeagueLine=leagueOrder.filter(name=>{
      const rx=new RegExp(`\\b${name}\\b`,'i');
      return rx.test(leagueSearchText);
    }).join(', ');
    const leagueLine=clean(directSummary?.leagueLine||legacyLeagueLine);

    const legacyRole=(allText.match(/\b(Målvakt|Utespelare)\b/i)?.[1]||'Spelare').replace(/^./,m=>m.toUpperCase());
    const role=clean(directSummary?.role||legacyRole)||'Spelare';
    const legacySeasons=Number((allText.match(/Totalt finns\s+(\d+)\s+säsongsrader/i)||allText.match(/\b(\d+)\s+säsonger\b/i)||[])[1]||0);
    const legacyMatches=Number((allText.match(/med\s+([\d\s]+)\s+matcher totalt/i)||allText.match(/\b([\d\s]+)\s+matcher\b/i)||[])[1]?.replace(/\s/g,'')||0);
    const legacyClubs=teamsGrid.children.length||Number((allText.match(/\b(\d+)\s+olika lag\b/i)||[])[1]||0);
    const seasons=Number(directSummary?.seasons||legacySeasons||0);
    const matches=Number(directSummary?.matches||legacyMatches||0);
    const clubs=Number(directSummary?.clubs||legacyClubs||0);

    const rankText=clean(ranking?.innerText||'');
    const totalRp=(rankText.match(/TOTAL RP\s+([\d\s.,]+)/i)||[])[1]||'—';
    const avgRp=(rankText.match(/SNITT-RP\s+([\d\s.,]+)/i)||[])[1]||'—';
    const countryRank=(rankText.match(/#\s*(\d+)\s+i Sverige/i)?.[1] || clean(main.querySelector('[data-seh-hero-rp]')?.textContent||'').match(/#\s*(\d+)/)?.[1] || '—');
    const roleRankMatch=rankText.match(/(Backar|Forwards|Målvakter)\s*#\s*(\d+)/i);
    const roleRankValue=roleRankMatch?`#${roleRankMatch[2]}`:'—';
    const roleRankLabel=roleRankMatch?roleRankMatch[1]:'Positionsrank';

    const bioPs=[...bio.querySelectorAll(':scope > p')];
    const debutP=bioPs.find(p=>/första registrerade/i.test(clean(p.textContent)));
    const latestP=bioPs.find(p=>/Senast syns spelaren/i.test(clean(p.textContent)));
    const nationalP=bioPs.find(p=>/representerat .+ landslaget/i.test(clean(p.textContent)));
    const bestP=bioPs.find(p=>/Bästa offensiva raden/i.test(clean(p.textContent)));
    const isGoalieProfile=/^Målvakt$/i.test(role);
    const linkText=p=>clean(p?.querySelector('a')?.textContent||'');
    const directChronological=[...directHistoryRows].sort((a,b)=>sehHistoryChronologyMs(a)-sehHistoryChronologyMs(b));
    const directDebutRow=directChronological[0]||null;
    const directLatestRow=directChronological[directChronological.length-1]||null;
    const directDebutTeam=clean(directDebutRow?.team_name_in_tournament||directDebutRow?.team_current_name||'');
    const directLatestTeam=clean(directLatestRow?.team_name_in_tournament||directLatestRow?.team_current_name||'');
    const directLatestSeason=sehCompactMeritLabel(clean(directLatestRow?.season_label||directLatestRow?.league_name||directLatestRow?.competition_name||''));
    const debutTeam=directDebutTeam||linkText(debutP)||clean(debutP?.textContent||'').match(/för\s+(.+?)[.]?$/i)?.[1]||'—';
    const latestText=clean(latestP?.textContent||'');
    const latestTeam=directLatestTeam||linkText(latestP)||teamName||'—';
    const latestSeason=directLatestSeason||(latestText.match(/Senast syns spelaren(?:\s+i)?\s+(.+?)\s+för\s+/i)||[])[1]||'';
    const normalizeTeamKey=value=>clean(value).toLocaleLowerCase('sv-SE');
    const teamLogoForName=name=>{
      const key=normalizeTeamKey(name);
      if(!key)return '';
      const card=[...teamsGrid.querySelectorAll('.seh-player-team-card')].find(item=>
        normalizeTeamKey(item.querySelector('.title')?.textContent||'')===key
      );
      const img=card?.querySelector('img.logo,img');
      return img?.currentSrc||img?.src||'';
    };
    const debutTeamLogo=teamLogoForName(debutTeam);
    const latestTeamLogo=teamLogoForName(latestTeam) || (normalizeTeamKey(latestTeam)===normalizeTeamKey(teamName)?teamLogo:'');
    const nationalState=sehLoadNationalTeamSummary(main);
    const formatNationalLabel=rows=>(Array.isArray(rows)?rows:[])
      .filter(row=>Number(row?.matches||0)>0)
      .slice()
      .sort((a,b)=>Number(b.matches||0)-Number(a.matches||0))
      .map(row=>{
        const matches=Number(row.matches||0);
        let phrase=clean(row.national_team_phrase_sv||'').replace(/^det\s+/i,'');
        if(!phrase)phrase=clean(row.country_name_sv||row.canonical_display_name||'landslaget');
        return `${phrase} · ${matches.toLocaleString('sv-SE')} ${matches===1?'match':'matcher'}`;
      })
      .join(' / ');
    const nationalText=clean(nationalP?.textContent||'');
    const nationalMatch=nationalText.match(/representerat\s+(.+?)\s+i\s+([\d\s]+)\s+(?:match|matcher)/i);
    const legacyNationalLabel=nationalMatch?`${nationalMatch[1].replace(/^det\s+/i,'')} · ${clean(nationalMatch[2])} matcher`:'';
    const nationalLabel=formatNationalLabel(nationalState?.rows)||legacyNationalLabel||'—';
    const highestEclCard=[...personalList.querySelectorAll('.seh-player-personal-merit-card')].find(card=>
      /HÖGSTA ECL-NIVÅ/i.test(clean(card.querySelector('.type')?.textContent||card.textContent||''))
    );
    const highestEclLevel=clean(directSummary?.highestEcl||highestEclCard?.querySelector('.main')?.textContent||'')||'—';

    const parsePct=value=>{
      const n=Number(String(value||'').replace(/\s/g,'').replace(',','.').replace(/[^0-9.\-]/g,''));
      return Number.isFinite(n)?n:NaN;
    };
    const goalieSeasonCandidates=[...historyCards.querySelectorAll('.seh-player-history-card')].map(card=>{
      const group=card.querySelector('.seh-player-history-stat-group.is-goalie');
      if(!group)return null;
      const stats={};
      group.querySelectorAll('.seh-player-history-stat').forEach(box=>{
        stats[clean(box.querySelector('.k')?.textContent||'').toUpperCase()]=clean(box.querySelector('.v')?.textContent||'');
      });
      const gp=Number(String(stats.GP||'0').replace(/[^0-9]/g,''))||0;
      const sv=parsePct(stats['SV%']);
      if(gp<=0 || !Number.isFinite(sv))return null;
      return {
        gp,sv,
        svText:stats['SV%']||`${sv.toLocaleString('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1})}%`,
        season:clean(card.querySelector('.seh-player-history-season')?.textContent||''),
        team:clean(card.querySelector('.seh-player-history-team-name')?.textContent||'')
      };
    }).filter(Boolean);
    const meaningfulGoalieSeasons=goalieSeasonCandidates.filter(item=>item.gp>=2);
    const bestGoalieSeason=[...(meaningfulGoalieSeasons.length?meaningfulGoalieSeasons:goalieSeasonCandidates)]
      .sort((a,b)=>b.sv-a.sv || b.gp-a.gp)[0]||null;
    const goalieBestLabel=bestGoalieSeason
      ? `${bestGoalieSeason.svText} i ${bestGoalieSeason.season||'turneringen'}${bestGoalieSeason.team?` för ${bestGoalieSeason.team}`:''}`
      : '—';
    const bestLabel=isGoalieProfile
      ? goalieBestLabel
      : (clean(directSummary?.bestOffensiveLabel||'') || clean(bestP?.textContent||'').replace(/^Bästa offensiva raden är\s*/i,'').replace(/[.]$/,'') || '—');

    document.body.classList.add('seh-player-profile-active','seh-player-native-v581');

    const root=document.createElement('section');
    root.className='seh-player-native-root';
    root.dataset.sehPlayerProfile='v719';
    root.dataset.routeKey=currentRouteKey;
    root.dataset.sourceSparse=(richSourceReady||directCoreReady)?'0':'1';
    root.dataset.dataSignature=directDataSignature;

    const stickyShell=document.createElement('div');
    stickyShell.className='seh-player-native-sticky-shell';
    root.appendChild(stickyShell);

    const profilePng=sehDirectPlayerProfilePng(directHistoryRows,heroPhoto);
    const hero=document.createElement('section');
    hero.className='seh-player-native-hero';
    hero.innerHTML=`
      <div class="seh-player-native-portrait">${teamLogo?`<img class="seh-player-native-bglogo" src="${esc(teamLogo)}" alt="">`:''}${profilePng?`<img src="${esc(profilePng)}" alt="${esc(playerName)}" loading="eager" decoding="async" fetchpriority="high">`:''}</div>
      <div class="seh-player-native-identity">
        <div class="seh-player-native-name">${esc(playerName)}</div>
        <div class="seh-player-native-team">${teamLogo?`<img src="${esc(teamLogo)}" alt="">`:''}<span>${esc(teamName||'Klubb saknas')}</span></div>
        <div class="seh-player-native-sub"><span>${esc(role)}</span><i>•</i><span>🇸🇪 Sverige</span></div>
        ${leagueLine?`<div class="seh-player-native-leagues">${esc(leagueLine)}</div>`:''}
        <div class="seh-player-native-numbers">
          <div><strong>${seasons||'—'}</strong><span>säsonger</span></div>
          <div><strong>${clubs||'—'}</strong><span>klubbar</span></div>
          <div><strong>${matches?matches.toLocaleString('sv-SE'):'—'}</strong><span>matcher</span></div>
          <div class="seh-player-native-sub-rp"><strong data-native-rank-total-inline>${esc(totalRp)}</strong><span>Total RP</span></div>
        </div>
      </div>
      ${teamLogo?`<div class="seh-player-native-watermark" aria-hidden="true"><img src="${esc(teamLogo)}" alt=""></div>`:''}
      <div class="seh-player-native-rpbar">
        <div><strong data-native-rank-country>#${esc(countryRank)}</strong><span>Sverige</span></div>
        <div><strong data-native-rank-total>${esc(totalRp)}</strong><span>Total RP</span></div>
        <div><strong data-native-rank-average>${esc(avgRp)}</strong><span>Snitt-RP</span></div>
        <div><strong data-native-rank-role>${esc(roleRankValue)}</strong><span data-native-rank-role-label>${esc(roleRankLabel)}</span></div>
      </div>`;
    const nativeHeroPortrait=hero.querySelector('.seh-player-native-portrait > img:not(.seh-player-native-bglogo)');
    if(nativeHeroPortrait)applyZeroPlayerPngFallback(nativeHeroPortrait);
    const nativeHeroBgLogo=hero.querySelector('.seh-player-native-bglogo');
    if(nativeHeroBgLogo)nativeHeroBgLogo.addEventListener('error',()=>nativeHeroBgLogo.remove(),{once:true});
    zeroApplyTeamPalette(hero,teamName,nativeHeroBgLogo||hero.querySelector('.seh-player-native-team img'));
    stickyShell.appendChild(hero);

    const dock=document.createElement('div');
    dock.className='seh-player-native-dock';
    dock.innerHTML=`
      <div class="seh-player-native-compact-id">
        ${profilePng?`<img src="${esc(profilePng)}" alt="">`:''}
        <div><strong>${esc(playerName)}</strong><span>${esc(teamName||'Spelarprofil')}</span></div>
        <b data-native-rank-compact>#${esc(countryRank)}</b>
      </div>
      <nav class="seh-player-native-tabs" aria-label="Spelarprofil">
        <button class="is-active" data-native-tab="overview">Översikt</button>
        <button data-native-tab="stats">Statistik</button>
        <button data-native-tab="teams">Lag</button>
        <button data-native-tab="merits">Meriter</button>
      </nav>`;
    const nativeCompactPortrait=dock.querySelector('.seh-player-native-compact-id > img');
    if(nativeCompactPortrait)applyZeroPlayerPngFallback(nativeCompactPortrait);
    stickyShell.appendChild(dock);

    const contentViewport=document.createElement('div');
    contentViewport.className='seh-player-native-content';
    root.appendChild(contentViewport);

    const panelMap=new Map();
    ['overview','stats','teams','merits'].forEach((key,i)=>{
      const panel=document.createElement('section');
      panel.className='seh-player-native-panel'+(i===0?' is-active':'');
      panel.dataset.nativePanel=key;
      panelMap.set(key,panel);
      contentViewport.appendChild(panel);
    });

    const makeHeading=(title,kicker='',icon='')=>{
      const h=document.createElement('div');
      h.className='seh-player-native-heading';
      const trophySvg='<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v3c0 4-1.8 6.5-4 6.5S8 11 8 7V4Z"/><path d="M8 6H5v1c0 2.5 1.3 4 3.7 4.5M16 6h3v1c0 2.5-1.3 4-3.7 4.5M12 13.5V17M9 20h6M10 17h4"/></svg>';
      const iconHtml=icon==='trophy'?`<i class="seh-player-native-heading-icon">${trophySvg}</i>`:'';
      h.innerHTML=`${iconHtml}<div>${kicker?`<span>${esc(kicker)}</span>`:''}<h2>${esc(title)}</h2></div>`;
      return h;
    };
    const makeCard=cls=>{const s=document.createElement('section');s.className='seh-player-native-card '+(cls||'');return s};

    const overview=panelMap.get('overview');
    const overviewGrid=document.createElement('div');overviewGrid.className='seh-player-native-overview-grid';
    const facts=makeCard('seh-player-native-facts-card');
    facts.appendChild(makeHeading('Om spelaren'));
    facts.insertAdjacentHTML('beforeend',`<div class="seh-player-native-facts">
      <div><em${debutTeamLogo?' class="team-logo"':''}>${debutTeamLogo?`<img src="${esc(debutTeamLogo)}" alt="">`:'↗'}</em><p><small>Debut</small><strong>${esc(debutTeam)}</strong></p></div>
      <div><em${latestTeamLogo?' class="team-logo"':''}>${latestTeamLogo?`<img src="${esc(latestTeamLogo)}" alt="">`:'◆'}</em><p><small>Senaste klubb</small><strong>${esc(latestTeam)}</strong>${latestSeason?`<span>${esc(latestSeason)}</span>`:''}</p></div>
      <div data-native-national-team>${nationalLabel!=='—'
        ? `<em class="flag">🇸🇪</em><p><small>Landslag</small><strong>${esc(nationalLabel)}</strong></p>`
        : `<em>N</em><p><small>Högsta ECL-nivå</small><strong>${esc(highestEclLevel)}</strong></p>`}
      </div>
      <div><em class="star">☆</em><p><small>${isGoalieProfile?'Bästa målvaktssäsong':'Bästa offensiva säsong'}</small><strong>${esc(bestLabel)}</strong></p></div>
    </div>`);
    overviewGrid.appendChild(facts);

    const highlights=makeCard('seh-player-native-highlights');
    highlights.appendChild(makeHeading('Meriter','','trophy'));
    const highlightGrid=document.createElement('div');highlightGrid.className='seh-player-native-merit-preview';
    const meritSources=[...meritList.querySelectorAll('.seh-player-merit-card'),...personalList.querySelectorAll('.seh-player-personal-merit-card')];
    const preferredMerits=[...meritList.querySelectorAll('.seh-player-merit-card')].slice(0,3);
    const personalMerit=[...personalList.querySelectorAll('.seh-player-personal-merit-card')].find(card=>!/LANDSLAG|HÖGSTA ECL-NIVÅ/i.test(clean(card.textContent||''))) || personalList.querySelector('.seh-player-personal-merit-card');
    const previewSources=[...preferredMerits,...(personalMerit?[personalMerit]:[])];
    const finalPreview=(previewSources.length?previewSources:meritSources).slice(0,4);
    finalPreview.forEach(card=>{
      const icon=clean(card.querySelector('.seh-player-merit-icon,.seh-player-personal-merit-icon')?.textContent||'★');
      const main=sehCompactMeritLabel(clean(card.querySelector('.main')?.textContent||card.querySelector('.seh-player-merit-text,.seh-player-personal-merit-text')?.textContent||'Merit'));
      const sub=clean(card.querySelector('.sub')?.textContent||'');
      const mini=document.createElement('div');mini.className='seh-player-native-mini-merit';
      mini.innerHTML=`<div class="seh-player-native-mini-merit-icon">${esc(icon||'★')}</div><div class="seh-player-native-mini-merit-main">${esc(main)}</div>${sub?`<div class="seh-player-native-mini-merit-sub">${esc(sub)}</div>`:''}`;
      highlightGrid.appendChild(mini);
    });
    if(!highlightGrid.children.length){
      const empty=document.createElement('div');
      empty.className='seh-player-native-empty';
      empty.textContent='Inga registrerade meriter.';
      highlightGrid.appendChild(empty);
    }
    highlights.appendChild(highlightGrid);overviewGrid.appendChild(highlights);

    const career=makeCard('seh-player-native-career-preview');
    const careerRow=document.createElement('div');careerRow.className='seh-player-native-career-row';
    const goalieCareerGrid=careerGrids.find(grid=>{
      const heading=clean(grid.previousElementSibling?.textContent||'');
      const labels=[...grid.querySelectorAll('.seh-player-career-item .label')].map(x=>clean(x.textContent||'').toUpperCase());
      return /Målvaktsstatistik|Goalie statistics/i.test(heading) || (labels.includes('VINSTER') && labels.includes('SV%'));
    });
    const skaterCareerGrid=careerGrids.find(grid=>{
      const heading=clean(grid.previousElementSibling?.textContent||'');
      const labels=[...grid.querySelectorAll('.seh-player-career-item .label')].map(x=>clean(x.textContent||'').toUpperCase());
      return /Karriärstatistik|Career statistics/i.test(heading) || (labels.includes('MÅL') && labels.includes('ASSIST') && !labels.includes('SV%'));
    });
    // v728: never use the opposite role as a fallback. Zero role games means
    // that role's career preview simply does not render.
    const overviewCareerGrid=isGoalieProfile?goalieCareerGrid:skaterCareerGrid;
    if(overviewCareerGrid){
      const careerItems=[...overviewCareerGrid.querySelectorAll('.seh-player-career-item')];
      const overviewCareerLabels=isGoalieProfile?['MATCHER','VINSTER','SV%','GAA']:['MÅL','ASSIST','POÄNG','PIM'];
      overviewCareerLabels.forEach(label=>{
        const item=careerItems.find(x=>clean(x.querySelector('.label')?.textContent).toUpperCase()===label);
        if(!item)return;
        const cell=document.createElement('div');cell.innerHTML=`<strong>${esc(clean(item.querySelector('.value')?.textContent||'—'))}</strong><span>${esc(label)}</span>`;careerRow.appendChild(cell);
      });
    }
    if(careerRow.children.length){
      career.appendChild(careerRow);
      overviewGrid.appendChild(career);
    }
    overview.appendChild(overviewGrid);

    const stats=panelMap.get('stats');

    // V5.95: Statistik-vyn äger stabila kopior. Flytta inte legacy-block hit,
    // eftersom RP/rollstatistik kan byggas om asynkront och lämna tomma wrappers.
    if(ranking){
      const rankWrap=makeCard('seh-player-native-stats-rp');
      rankWrap.appendChild(ranking.cloneNode(true));
      stats.appendChild(rankWrap);
    }

    careerGrids.forEach(grid=>{
      const items=[...grid.querySelectorAll('.seh-player-career-item')];
      const matchItem=items.find(x=>clean(x.querySelector('.label')?.textContent||'').toUpperCase()==='MATCHER');
      const matchValue=Number(clean(matchItem?.querySelector('.value')?.textContent||'0').replace(/[^0-9]/g,''))||0;
      const hasUsefulData=items.some(x=>{
        const value=clean(x.querySelector('.value')?.textContent||'');
        return value && value!=='—' && value!=='-' && value!=='0';
      });
      if(!matchItem || matchValue<=0 || !hasUsefulData)return;

      const c=makeCard('seh-player-native-stats-career');
      const prev=grid.previousElementSibling;
      if(prev&&/Karriärstatistik|Målvaktsstatistik/i.test(clean(prev.textContent||'')))c.appendChild(prev.cloneNode(true));
      c.appendChild(grid.cloneNode(true));
      stats.appendChild(c);
    });
    /*
     * V710:
     * Match the redesigned web profile: Historik is part of Statistik instead
     * of being a separate tab. Career totals stay first; turnering-for-
     * turnering history follows underneath with the existing league filters.
     */
    stats.classList.add('seh-player-native-history-host');

    const historyHeading=makeHeading('Turneringshistorik','Turnering för turnering');
    historyHeading.classList.add('seh-player-native-inline-history-heading');
    stats.appendChild(historyHeading);

    const historyWrap=makeCard('seh-player-native-inline-history');

    if(!historyCards.children.length){
      const empty=document.createElement('div');
      empty.className='seh-player-native-empty';
      empty.textContent=clean(main.querySelector('.history-empty-cell,.player-history-empty')?.textContent||'')||'Ingen importerad turneringshistorik.';
      historyCards.appendChild(empty);
    }

    /*
     * V711:
     * Do not move the legacy web filter bar into the native Statistik panel.
     * The legacy handler is tied to the source DOM and could end up filtering
     * a hidden/rebuilt card list after app-shell moved the visible cards.
     *
     * Build an app-owned filter bar that always targets the exact visible
     * historyCards node.
     */
    const nativeHistoryCards=[...historyCards.querySelectorAll(':scope > .seh-player-history-card')];

    if(nativeHistoryCards.length){
      const filterOrder=['ALLA','ECL','SEC','SCL','FCL','GCL','ESHL','SM','ITHL','LGEL','ÖVRIGA'];
      const present=new Set(
        nativeHistoryCards
          .map(card=>String(card.dataset.historyCompetition||'ÖVRIGA').toUpperCase())
          .filter(Boolean)
      );

      const filterKeys=filterOrder.filter(key=>key==='ALLA'||present.has(key));

      const historyMeta=document.createElement('div');
      historyMeta.className='seh-player-native-history-meta';

      const historyMetaLabel=document.createElement('span');
      historyMetaLabel.textContent='Turneringar';

      const historyCount=document.createElement('strong');
      historyCount.className='seh-player-native-history-count';
      historyCount.textContent=`${nativeHistoryCards.length.toLocaleString('sv-SE')} turneringar`;

      historyMeta.append(historyMetaLabel,historyCount);
      historyWrap.appendChild(historyMeta);

      const nativeFilters=document.createElement('div');
      nativeFilters.className='seh-player-native-history-filters';
      nativeFilters.setAttribute('role','group');
      nativeFilters.setAttribute('aria-label','Filtrera turneringshistorik');

      const applyFilter=key=>{
        const selected=String(key||'ALLA').toUpperCase();
        let visible=0;

        nativeHistoryCards.forEach(card=>{
          const competition=String(card.dataset.historyCompetition||'ÖVRIGA').toUpperCase();
          const show=selected==='ALLA'||competition===selected;
          card.classList.toggle('seh-history-filter-hidden',!show);
          card.hidden=!show;
          if(show)visible++;
        });

        [...nativeFilters.querySelectorAll('button')].forEach(button=>{
          const active=button.dataset.historyFilter===selected;
          button.classList.toggle('is-active',active);
          button.setAttribute('aria-pressed',active?'true':'false');
        });

        historyCount.textContent=
          selected==='ALLA'
            ? `${visible.toLocaleString('sv-SE')} turneringar`
            : `${visible.toLocaleString('sv-SE')} ${selected==='ESHL'?'eSHL':selected}`;
      };

      filterKeys.forEach(key=>{
        const button=document.createElement('button');
        button.type='button';
        button.dataset.historyFilter=key;
        button.textContent=key==='ESHL'?'eSHL':key;
        button.setAttribute('aria-pressed',key==='ALLA'?'true':'false');
        if(key==='ALLA')button.classList.add('is-active');

        button.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          applyFilter(key);
        });

        nativeFilters.appendChild(button);
      });

      historyWrap.appendChild(nativeFilters);
      applyFilter('ALLA');
    }

    historyWrap.appendChild(historyCards);
    stats.appendChild(historyWrap);

    const teams=panelMap.get('teams');const teamWrap=makeCard();
    if(!teamsGrid.children.length){
      const empty=document.createElement('div');
      empty.className='seh-player-native-empty';
      empty.textContent=teamName?`Ingen detaljerad laghistorik registrerad för ${teamName}.`:'Ingen detaljerad laghistorik registrerad.';
      teamsGrid.appendChild(empty);
    }
    teamWrap.appendChild(teamsGrid);teams.appendChild(teamWrap);

    const merits=panelMap.get('merits');

    // V5.92: Den nya appprofilen äger egna meritkort. Flytta inte de muterbara
    // legacy-listorna hit, eftersom landslagsuppdateringen kan bygga om dem senare.
    const meritWrap=makeCard();
    const meritTitle=document.createElement('div');meritTitle.className='seh-player-native-merit-section-title';meritTitle.textContent='Meriter';meritWrap.appendChild(meritTitle);
    const nativeMeritGrid=document.createElement('div');nativeMeritGrid.className='seh-player-native-merit-grid';
    [...meritList.querySelectorAll('.seh-player-merit-card')].forEach(card=>{const clone=card.cloneNode(true);const main=clone.querySelector('.main');if(main)main.textContent=sehCompactMeritLabel(main.textContent);nativeMeritGrid.appendChild(clone);});
    meritWrap.appendChild(nativeMeritGrid);merits.appendChild(meritWrap);

    const personalWrap=makeCard();
    const personalTitle=document.createElement('div');personalTitle.className='seh-player-native-merit-section-title';personalWrap.appendChild(personalTitle);
    const nativePersonalGrid=document.createElement('div');nativePersonalGrid.className='seh-player-native-merit-grid';nativePersonalGrid.dataset.nativePersonalMerits='1';
    [...personalList.querySelectorAll('.seh-player-personal-merit-card')].forEach(card=>nativePersonalGrid.appendChild(card.cloneNode(true)));
    personalWrap.appendChild(nativePersonalGrid);merits.appendChild(personalWrap);

    const updateNativeMeritTitles=()=>{
      const teamCount=nativeMeritGrid.querySelectorAll('.seh-player-merit-card').length;
      const personalCount=nativePersonalGrid.querySelectorAll('.seh-player-personal-merit-card').length;
      meritTitle.textContent=`🏆 Meriter${teamCount?` · ${teamCount}`:''}`;
      personalTitle.textContent=`★ Personliga meriter${personalCount?` · ${personalCount}`:''}`;
    };
    updateNativeMeritTitles();

    // V676: lagmeriter hämtas direkt från Supabase i stället för att vara beroende
    // av att den dolda webbprofilens merit-DOM hinner hydrera. Supabase är
    // source-of-truth och samma data används oavsett hur tunn legacy-profilen är.
    sehLoadProfileTeamMerits(main,directHistoryRows).then(rows=>{
      if(root.dataset.routeKey!==currentRouteKey || (location.pathname+location.hash)!==currentRouteKey || !Array.isArray(rows) || !rows.length)return;

      meritWrap.querySelector('.seh-player-native-empty')?.remove();
      nativeMeritGrid.replaceChildren();
      rows.forEach(row=>{
        const card=document.createElement('div');
        card.className='seh-player-merit-card';
        const season=sehCompactMeritLabel(clean(row.season_label||row.competition_code||'Merit'));
        const team=clean(row.team_name||'');
        const placement=sehNativeMeritPlacement(row);
        card.innerHTML=`<div class="seh-player-merit-icon">${esc(sehNativeMeritIcon(row.merit_type))}</div><div class="seh-player-merit-text"><span class="main">${esc(season)}</span><span class="sub">${esc(team?`${placement} med ${team}`:placement)}</span></div>`;
        nativeMeritGrid.appendChild(card);
      });
      updateNativeMeritTitles();

      // Uppdatera även översiktens merit-preview med de senaste lagmeriterna.
      highlightGrid.replaceChildren();
      rows.slice(0,3).forEach(row=>{
        const mini=document.createElement('div');
        mini.className='seh-player-native-mini-merit';
        mini.dataset.nativeTeamMeritPreview='1';
        const season=sehCompactMeritLabel(clean(row.season_label||row.competition_code||'Merit'));
        const team=clean(row.team_name||'');
        mini.innerHTML=`<div class="seh-player-native-mini-merit-icon">${esc(sehNativeMeritIcon(row.merit_type))}</div><div class="seh-player-native-mini-merit-main">${esc(season)}</div><div class="seh-player-native-mini-merit-sub">${esc(team?`${sehNativeMeritPlacement(row)} med ${team}`:sehNativeMeritPlacement(row))}</div>`;
        highlightGrid.appendChild(mini);
      });

      const personalPreview=[...nativePersonalGrid.querySelectorAll('.seh-player-personal-merit-card')].find(card=>
        !/LANDSLAG|HÖGSTA ECL-NIVÅ/i.test(clean(card.textContent||''))
      );
      if(personalPreview && highlightGrid.children.length<4){
        const icon=clean(personalPreview.querySelector('.seh-player-personal-merit-icon')?.textContent||'★');
        const mainText=clean(personalPreview.querySelector('.main')?.textContent||personalPreview.querySelector('.seh-player-personal-merit-text')?.textContent||'Personlig merit');
        const subText=clean(personalPreview.querySelector('.sub')?.textContent||'');
        const mini=document.createElement('div');
        mini.className='seh-player-native-mini-merit';
        mini.innerHTML=`<div class="seh-player-native-mini-merit-icon">${esc(icon||'★')}</div><div class="seh-player-native-mini-merit-main">${esc(mainText)}</div>${subText?`<div class="seh-player-native-mini-merit-sub">${esc(subText)}</div>`:''}`;
        highlightGrid.appendChild(mini);
      }
    }).catch(()=>{});

    // V730: personliga meriter hämtas också direkt från Supabase. På Android
    // kan legacy-webbprofilen vara tunn och sakna nya datadrivna meritposter.
    // Behåll endast appfakta som landslag/högsta ECL-nivå från legacy-listan
    // och låt meritcache-tabellen vara source-of-truth för riktiga personliga meriter.
    sehLoadProfilePersonalMerits(main,directHistoryRows).then(rows=>{
      if(root.dataset.routeKey!==currentRouteKey || (location.pathname+location.hash)!==currentRouteKey || !Array.isArray(rows) || !rows.length)return;

      const preserved=[...nativePersonalGrid.querySelectorAll('.seh-player-personal-merit-card')]
        .filter(card=>/^(LANDSLAG|HÖGSTA ECL-NIVÅ)$/i.test(clean(card.querySelector('.type')?.textContent||'')))
        .map(card=>card.cloneNode(true));

      nativePersonalGrid.replaceChildren();
      rows.forEach(row=>{
        const card=document.createElement('div');
        card.className='seh-player-personal-merit-card';
        card.dataset.nativeDirectPersonalMerit='1';
        const type=clean(row.display_merit_label||row.merit_label||'Personlig merit');
        const tournament=sehCompactMeritLabel(clean(row.tournament_label||row.league_name||row.season_label||row.competition_code||'Merit'));
        const value=sehNativePersonalMeritValue(row);
        card.innerHTML=`<div class="seh-player-personal-merit-icon">${esc(sehNativePersonalMeritIcon(row))}</div><div class="seh-player-personal-merit-text"><span class="type">${esc(type)}</span><span class="main">${esc(tournament)}</span>${value?`<span class="sub">${esc(value)}</span>`:''}</div>`;
        nativePersonalGrid.appendChild(card);
      });
      preserved.forEach(card=>nativePersonalGrid.appendChild(card));
      updateNativeMeritTitles();
      meritWrap.querySelector('.seh-player-native-empty')?.remove();

      // Om lagmeriterna redan har byggt översiktens tre första kort, ersätt
      // eventuell gammal legacy-personlig merit med den direkta Supabase-meriten.
      [...highlightGrid.querySelectorAll('.seh-player-native-mini-merit:not([data-native-team-merit-preview])')].forEach(el=>el.remove());
      if(highlightGrid.children.length<4 && rows.length){
        const row=rows[0];
        const mini=document.createElement('div');
        mini.className='seh-player-native-mini-merit';
        mini.dataset.nativePersonalMeritPreview='1';
        const type=clean(row.display_merit_label||row.merit_label||'Personlig merit');
        const tournament=sehCompactMeritLabel(clean(row.tournament_label||row.league_name||row.season_label||row.competition_code||'Merit'));
        const value=sehNativePersonalMeritValue(row);
        mini.innerHTML=`<div class="seh-player-native-mini-merit-icon">${esc(sehNativePersonalMeritIcon(row))}</div><div class="seh-player-native-mini-merit-main">${esc(type)}</div><div class="seh-player-native-mini-merit-sub">${esc([tournament,value].filter(Boolean).join(' · '))}</div>`;
        highlightGrid.appendChild(mini);
      }
    }).catch(()=>{});

    if(!nativeMeritGrid.children.length && !nativePersonalGrid.children.length){
      const empty=document.createElement('div');
      empty.className='seh-player-native-empty';
      empty.textContent='Inga registrerade meriter.';
      meritWrap.appendChild(empty);
    }

    const syncNativeNationalTeam=rows=>{
      const validRows=(Array.isArray(rows)?rows:[]).filter(row=>Number(row?.matches||0)>0);
      const label=formatNationalLabel(validRows);
      const overviewNationalRow=root.querySelector('[data-native-national-team]');
      if(overviewNationalRow && label){
        overviewNationalRow.innerHTML=`<em class="flag">${esc(sehFlagEmoji(validRows[0]?.country_code||'SE'))}</em><p><small>Landslag</small><strong>${esc(label)}</strong></p>`;
      }

      const grid=root.querySelector('[data-native-personal-merits]');
      if(!grid || !validRows.length)return;
      [...grid.querySelectorAll('.seh-player-personal-merit-card')].forEach(card=>{
        if(/^LANDSLAG$/i.test(clean(card.querySelector('.type')?.textContent||'')))card.remove();
      });
      const highest=[...grid.querySelectorAll('.seh-player-personal-merit-card')].find(card=>
        /HÖGSTA ECL-NIVÅ/i.test(clean(card.querySelector('.type')?.textContent||''))
      );
      validRows
        .slice()
        .sort((a,b)=>Number(b.matches||0)-Number(a.matches||0))
        .forEach(row=>{
          const matches=Number(row.matches||0);
          const tournaments=Number(row.tournaments||0);
          const card=document.createElement('div');
          card.className='seh-player-personal-merit-card';
          card.dataset.nativeNationalMerit='1';
          card.innerHTML=`<div class="seh-player-personal-merit-icon">${esc(sehFlagEmoji(row.country_code))}</div><div class="seh-player-personal-merit-text"><span class="type">LANDSLAG</span><span class="main">${esc(clean(row.country_name_sv||row.canonical_display_name||'Landslag'))}</span><span class="sub">${esc(`${matches.toLocaleString('sv-SE')} ${matches===1?'match':'matcher'}${tournaments>0?` · ${tournaments} ${tournaments===1?'World Cup-turnering':'World Cup-turneringar'}`:''}`)}</span></div>`;
          if(highest)grid.insertBefore(card,highest);else grid.appendChild(card);
        });
      updateNativeMeritTitles();
    };
    if(Array.isArray(nationalState?.rows))syncNativeNationalTeam(nationalState.rows);
    if(nationalState?.promise){
      nationalState.promise.then(rows=>{
        if(root.isConnected && root.dataset.routeKey===currentRouteKey)syncNativeNationalTeam(rows);
      }).catch(()=>{});
    }

    // V6.00/V645: Native player is an independent app viewport. Keep any fast
    // preview in place until the complete native root is fully constructed, then
    // swap in one step so neither legacy web content nor a blank frame can flash.
    if(existingRoot?.isConnected)existingRoot.remove();
    document.body.appendChild(root);
    document.documentElement.classList.remove('seh-player-route-pending');
    // V716: only discard the source DOM after a fully hydrated profile was
    // built. For a sparse fallback we keep it alive, hidden off-screen, so its
    // async Supabase/web hydration can finish and trigger a real rebuild.
    if(richSourceReady){
      main.replaceChildren();
      main.removeAttribute('data-seh-native-sparse-source');
    }else{
      main.setAttribute('data-seh-native-sparse-source','1');
    }
    main.classList.add('seh-player-native-source-host');
    main.setAttribute('aria-hidden','true');
    // v603: the native profile exists now. Only now may the skeleton disappear.
    document.body.classList.remove('seh-loading');

    const activate=(key,scroll=true)=>{
      if(!panelMap.has(key))key='overview';
      root.dataset.activeTab=key;
      root.classList.toggle('is-subview',key!=='overview');
      dock.querySelectorAll('[data-native-tab]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.nativeTab===key));
      panelMap.forEach((panel,k)=>panel.classList.toggle('is-active',k===key));
      if(scroll){
        requestAnimationFrame(()=>{
          contentViewport.scrollTo({top:0,behavior:'auto'});
        });
      }
    };
    dock.addEventListener('click',event=>{const btn=event.target.closest('[data-native-tab]');if(btn)activate(btn.dataset.nativeTab,true)});
    root.addEventListener('click',event=>{const btn=event.target.closest('[data-open-native-tab]');if(btn)activate(btn.dataset.openNativeTab,true)});
    activate('overview',false);
  }


  function adaptPlayerProfileNationalTeamBio(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    const bio=main?.querySelector('#playerBio');
    if(!main || !bio)return;

    // Lag-brand presentation hör bara hemma i headern, aldrig inne i biografin.
    bio.querySelectorAll('.seh-player-team-brand').forEach(el=>el.remove());

    const historyState=sehLoadProfileHistoryDetails(main);
    const detailRows=Array.isArray(historyState?.rows)?historyState.rows:[];
    if(!detailRows.length)return;

    const renderNationalTeamParagraph=()=>{
      const nationalState=sehLoadNationalTeamSummary(main);
      if(!nationalState)return;
      if(nationalState.rows===null){
        if(nationalState.promise){
          nationalState.promise.then(()=>{
            if(route().kind==='player' && document.contains(bio))renderNationalTeamParagraph();
          }).catch(()=>{});
        }
        return;
      }
      const nationalRows=Array.isArray(nationalState.rows)?nationalState.rows:[];

      const existingNationalParagraphs=[...bio.querySelectorAll(':scope > p')].filter(p=>{
        const value=sehCleanText(p.textContent||'');
        return p.classList.contains('seh-player-national-team-bio') || /^Spelaren har representerat .+ landslaget i \d+ (?:match|matcher)\.$/i.test(value);
      });
      let nationalParagraph=existingNationalParagraphs[0]||null;
      if(nationalParagraph)nationalParagraph.classList.add('seh-player-national-team-bio');
      existingNationalParagraphs.slice(1).forEach(el=>el.remove());
      if(!nationalRows.length){
        nationalParagraph?.remove();
        return;
      }

      if(!nationalParagraph){
        nationalParagraph=document.createElement('p');
        nationalParagraph.className='seh-player-national-team-bio';
        const latestParagraphNow=[...bio.querySelectorAll(':scope > p')].find(p=>
          /Senast syns spelaren/i.test(p.textContent||'')
        );
        if(latestParagraphNow)latestParagraphNow.insertAdjacentElement('afterend',nationalParagraph);
        else bio.appendChild(nationalParagraph);
      }

      nationalParagraph.textContent=nationalRows
        .slice()
        .sort((a,b)=>Number(b.matches||0)-Number(a.matches||0))
        .map(row=>{
          const matches=Number(row.matches||0);
          const phrase=sehCleanText(row.national_team_phrase_sv||'landslaget');
          return `Spelaren har representerat ${phrase} i ${matches.toLocaleString('sv-SE')} ${matches===1?'match':'matcher'}.`;
        })
        .join(' ');
    };

    // Senast syns-spalten ska alltid använda senaste vanliga klubblaget,
    // aldrig en World Cup-/landslagsrad. V723: the historical tournament name
    // is primary; current name is only a fallback when the historical name is missing.
    const latestClubRow=detailRows.find(row=>{
      if(sehIsWorldCupNationalTeamRow(row))return false;
      return !!sehCleanText(row?.team_name_in_tournament||row?.team_current_name||'');
    });

    const paragraphs=[...bio.querySelectorAll(':scope > p')];
    const latestParagraph=paragraphs.find(p=>/Senast syns spelaren/i.test(p.textContent||''));
    if(!latestParagraph){
      renderNationalTeamParagraph();
      return;
    }

    const currentText=sehCleanText(latestParagraph.textContent||'');
    const introMatch=currentText.match(/^(.*?\bolika lag\.)/i);
    const intro=introMatch?.[1]||currentText.split(/\s+Senast syns spelaren/i)[0].trim();

    if(!latestClubRow){
      latestParagraph.textContent=intro;
      renderNationalTeamParagraph();
      return;
    }

    const teamName=sehCleanText(
      latestClubRow.team_name_in_tournament||
      latestClubRow.team_current_name||
      ''
    );
    if(!teamName){
      latestParagraph.textContent=intro;
      renderNationalTeamParagraph();
      return;
    }

    const season=sehCleanText(
      latestClubRow.catalog_display_name||
      latestClubRow.season_label||
      latestClubRow.league_name||
      latestClubRow.competition_name||
      ''
    )
      .replace(/[🇦-🇿]{2}/gu,' ')
      .replace(/^ECL\s*'(\d+)\s*:\s*/i,"ECL '$1 ")
      .replace(/\s+-\s+/g,' ')
      .replace(/\s{2,}/g,' ')
      .trim();

    latestParagraph.replaceChildren();
    latestParagraph.append(document.createTextNode(
      `${intro}${intro && !/[.!?]$/.test(intro)?'.':''} Senast syns spelaren${season?` i ${season}`:''} för `
    ));

    const teamId=Number(latestClubRow.team_id||0);
    if(teamId>0){
      const link=document.createElement('a');
      link.className='player-bio-team-link';
      link.href=`#/lag/${teamId}`;
      link.textContent=teamName;
      latestParagraph.append(link);
    }else{
      latestParagraph.append(document.createTextNode(teamName));
    }
    latestParagraph.append(document.createTextNode('.'));
    renderNationalTeamParagraph();
  }


  function adaptPlayerProfileTeamLogo(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    if(!main)return;

    const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
    const nameEl=main.querySelector('.player-profile-name,h1');
    const profileName=clean(nameEl?.textContent||'');
    if(!nameEl || !profileName)return;

    const requestKey=`${location.hash}|${profileName}`;
    const state=window.__SEH_PROFILE_TEAM_LOGO_STATE__ || (window.__SEH_PROFILE_TEAM_LOGO_STATE__={pending:''});
    if(state.pending===requestKey)return;
    state.pending=requestKey;

    const finish=()=>{
      if(state.pending===requestKey)state.pending='';
    };

    const beforeCareer=el=>{
      const careerHeading=[...main.querySelectorAll('h1,h2,h3,h4')].find(node=>
        /^(Karriärstatistik|Målvaktsstatistik)$/i.test(clean(node.textContent))
      );
      if(!careerHeading || !el)return true;
      try{return !!(el.compareDocumentPosition(careerHeading)&Node.DOCUMENT_POSITION_FOLLOWING);}catch(_){return true;}
    };

    const bioBoundary=main.querySelector('#playerBio');

    const beforeBio=el=>{
      if(!bioBoundary || !el)return true;
      try{return !!(el.compareDocumentPosition(bioBoundary)&Node.DOCUMENT_POSITION_FOLLOWING);}
      catch(_){return !el.closest('#playerBio');}
    };

    const compactTeamTextMatch=(value,teamName)=>{
      const text=clean(value).toLocaleLowerCase('sv-SE');
      const wanted=clean(teamName).toLocaleLowerCase('sv-SE');
      if(!text || !wanted)return false;
      if(text===wanted)return true;
      if(!text.endsWith(wanted))return false;
      const prefix=clean(text.slice(0,-wanted.length)).replace(/[|•·:;\-–—]/g,'').trim();
      return /^[a-zåäö0-9]{1,3}$/i.test(prefix);
    };

    const findTopTeamElement=teamName=>{
      const wanted=clean(teamName).toLocaleLowerCase('sv-SE');
      if(!wanted)return null;
      const nodes=[...main.querySelectorAll('a,button,span,strong,b,div')].filter(el=>{
        if(el.closest('#playerBio,.seh-player-ranking-card,.seh-player-summary-row,.seh-player-team-brand,.seh-player-history-cards,table'))return false;
        if(!beforeCareer(el) || !beforeBio(el))return false;
        return compactTeamTextMatch(el.textContent,teamName);
      });
      nodes.sort((a,b)=>{
        const at=clean(a.textContent).toLocaleLowerCase('sv-SE');
        const bt=clean(b.textContent).toLocaleLowerCase('sv-SE');
        const ae=at===wanted?0:1;
        const be=bt===wanted?0:1;
        if(ae!==be)return ae-be;
        if(at.length!==bt.length)return at.length-bt.length;
        const ac=a.children.length,bc=b.children.length;
        if(ac!==bc)return ac-bc;
        let aa=Number.MAX_SAFE_INTEGER,ba=Number.MAX_SAFE_INTEGER;
        try{const r=a.getBoundingClientRect();aa=Math.max(1,r.width*r.height);}catch(_){ }
        try{const r=b.getBoundingClientRect();ba=Math.max(1,r.width*r.height);}catch(_){ }
        return aa-ba;
      });
      return nodes[0]||null;
    };

    const teamBlockFor=(el,teamName)=>{
      if(!el)return null;
      let block=el;
      let parent=el.parentElement;
      let hops=0;
      while(parent && parent!==main && hops<5){
        if(parent.closest('#playerBio,.seh-player-ranking-card,.seh-player-summary-row,.seh-player-history-cards,table'))break;
        if(!beforeBio(parent) || !beforeCareer(parent))break;
        if(!compactTeamTextMatch(parent.textContent,teamName))break;
        block=parent;
        parent=parent.parentElement;
        hops+=1;
      }
      return block;
    };

    const historyLogoFor=teamName=>{
      const wanted=clean(teamName).toLocaleLowerCase('sv-SE');
      const containers=[...main.querySelectorAll('.seh-player-history-card,.seh-player-history-team,tr')];
      for(const container of containers){
        if(!clean(container.textContent).toLocaleLowerCase('sv-SE').includes(wanted))continue;
        const historyImg=container.querySelector('img');
        const src=historyImg?.currentSrc||historyImg?.src||'';
        if(src)return src;
      }
      return '';
    };

    // V639: använd den detaljerade historik som spelarprofilen redan hämtar.
    // Tidigare laddades hela spelarkatalogen (1300+ spelare) här bara för att
    // hitta senaste lag, vilket gjorde varje enskild spelarprofil onödigt tung.
    const historyState=sehLoadProfileHistoryDetails(main);
    const detailRows=Array.isArray(historyState?.rows)?historyState.rows:[];
    if(!detailRows.length){
      finish();
      return;
    }

    try{
      if(route().kind!=='player' || !main.isConnected || `${location.hash}|${profileName}`!==requestKey)return;

      const latestHistoryRow=detailRows[0]||null;
      const latestClubRow=detailRows.find(row=>{
        if(sehIsWorldCupNationalTeamRow(row))return false;
        return !!clean(row?.team_name_in_tournament||row?.team_current_name||'');
      });
      const teamName=clean(
        latestClubRow?.team_name_in_tournament||
        latestClubRow?.team_current_name||
        ''
      );

      // V723: the header uses the historical tournament name first.
      // Headern får aldrig visa ett landslag. Om ingen vanlig klubb finns
      // tar vi hellre bort lagraden helt än att falla tillbaka till landslaget.
      const nationalState=sehLoadNationalTeamSummary(main);
      const nationalNames=(Array.isArray(nationalState?.rows)?nationalState.rows:[])
        .flatMap(row=>[
          sehCleanText(row?.canonical_display_name||''),
          sehCleanText(String(row?.canonical_display_name||'').replace(/^eHockey\s+/i,'SG '))
        ])
        .filter(Boolean);

      const sourceTeamCandidates=[
        teamName,
        clean(latestHistoryRow?.team_name_in_tournament||''),
        clean(latestHistoryRow?.team_current_name||''),
        ...nationalNames
      ].filter(Boolean).filter((value,index,array)=>
        array.findIndex(item=>item.toLocaleLowerCase('sv-SE')===value.toLocaleLowerCase('sv-SE'))===index
      );

      const findSourceTeamElement=()=>{
        for(const candidate of sourceTeamCandidates){
          const el=findTopTeamElement(candidate);
          if(el)return {el,name:candidate};
        }
        return null;
      };

      const sourceMatch=findSourceTeamElement();

      if(!teamName){
        main.querySelector('.seh-player-team-brand')?.remove();
        if(sourceMatch?.el){
          const sourceBlock=teamBlockFor(sourceMatch.el,sourceMatch.name);
          sourceBlock?.style.setProperty('display','none','important');
          sourceBlock?.setAttribute('data-seh-original-team-hidden','1');
        }
        return;
      }

      sourceTeamCandidates.forEach(candidate=>{
        if(candidate.toLocaleLowerCase('sv-SE')===teamName.toLocaleLowerCase('sv-SE'))return;
        const el=findTopTeamElement(candidate);
        if(!el)return;
        const block=teamBlockFor(el,candidate);
        block?.style.setProperty('display','none','important');
        block?.setAttribute('data-seh-original-team-hidden','1');
      });

      let wrap=main.querySelector('.seh-player-team-brand');
      let img=wrap?.querySelector('.seh-player-team-brand-logo')||null;
      let label=wrap?.querySelector('.seh-player-team-brand-pill')||null;

      if(!wrap){
        const sourceTeamEl=sourceMatch?.el||null;
        const sourceTeamKey=sourceMatch?.name||teamName;
        if(!sourceTeamEl)return;

        const sourceTeamBlock=teamBlockFor(sourceTeamEl,sourceTeamKey);
        if(!sourceTeamBlock)return;

        wrap=document.createElement('div');
        wrap.className='seh-player-team-brand';

        img=document.createElement('img');
        img.className='seh-player-team-brand-logo';
        img.alt='';
        img.decoding='async';

        label=document.createElement('div');
        label.className='seh-player-team-brand-pill';
        label.textContent=teamName;

        wrap.append(img,label);
        sourceTeamBlock.parentElement?.insertBefore(wrap,sourceTeamBlock);
        sourceTeamBlock.style.setProperty('display','none','important');
        sourceTeamBlock.setAttribute('data-seh-original-team-hidden','1');
      }else{
        if(!label){
          label=document.createElement('div');
          label.className='seh-player-team-brand-pill';
          wrap.appendChild(label);
        }
        label.textContent=teamName;
        wrap.querySelector('.seh-player-team-brand-fallback')?.remove();
      }

      if(!img || !img.isConnected){
        img=document.createElement('img');
        img.className='seh-player-team-brand-logo';
        img.alt='';
        img.decoding='async';
        wrap.insertBefore(img,wrap.firstChild);
      }

      const showLogoFallback=()=>{
        if(!img?.isConnected)return;
        const fallbackEl=document.createElement('div');
        fallbackEl.className='seh-player-team-brand-fallback';
        fallbackEl.setAttribute('aria-hidden','true');
        fallbackEl.textContent=teamName
          .split(/\s+/)
          .filter(Boolean)
          .map(part=>part.charAt(0))
          .join('')
          .slice(0,3)
          .toUpperCase() || '—';
        img.replaceWith(fallbackEl);
      };

      const directLogo=sehWebAppTeamLogo('',teamName);
      img.onerror=()=>{
        const fallback=historyLogoFor(teamName);
        if(fallback && img.getAttribute('src')!==fallback){
          img.onerror=showLogoFallback;
          img.src=fallback;
        }else{
          showLogoFallback();
        }
      };
      if(img.getAttribute('src')!==directLogo)img.src=directLogo;
    }catch(error){
      console.warn('[Svensk eHockey] Laglogga på spelarprofil kunde inte laddas',error);
    }finally{
      finish();
    }
  }

  function adaptPlayerProfileSummary(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    if(!main)return;

    const clean=v=>(v||'').replace(/\s+/g,' ').trim();
    const labels=['TURNERINGAR','LAG','MATCHER'];

    const careerHeading=[...main.querySelectorAll('h1,h2,h3,h4')].find(el=>
      /^(Karriärstatistik|Målvaktsstatistik)$/i.test(clean(el.textContent||''))
    );
    const careerTop=careerHeading ? careerHeading.getBoundingClientRect().top : Infinity;

    const findStat=(labelText)=>{
      const labelsFound=[...main.querySelectorAll('*')].filter(el=>{
        if(el.closest('.seh-player-summary-row'))return false;
        if(clean(el.textContent).toUpperCase()!==labelText)return false;
        try{
          if(el.getBoundingClientRect().top >= careerTop)return false;
        }catch(_){}
        return true;
      });

      let best=null;

      labelsFound.forEach(label=>{
        let node=label.parentElement;

        for(let depth=0; node && node!==main && node!==document.body && depth<8; depth++,node=node.parentElement){
          const txt=clean(node.innerText||node.textContent||'');
          if(!txt || txt.length>120)continue;

          // Accept exact compact stat boxes: LABEL + NUMBER.
          const m=txt.match(new RegExp('^'+labelText+'\\s+([\\d\\s]+)$','i'));
          if(!m)continue;

          const value=clean(m[1]);
          if(!/^\d[\d\s]*$/.test(value))continue;

          let area=Number.MAX_SAFE_INTEGER;
          try{
            const r=node.getBoundingClientRect();
            area=Math.max(1,r.width*r.height);
          }catch(_){}

          if(!best || area<best.area){
            best={label:labelText,value,box:node,area};
          }
          break;
        }
      });

      return best;
    };

    const found=labels.map(findStat).filter(Boolean);
    if(found.length!==3)return;

    let row=main.querySelector('.seh-player-summary-row');
    if(!row){
      row=document.createElement('div');
      row.className='seh-player-summary-row';
    }

    row.innerHTML=labels.map(labelText=>{
      const x=found.find(f=>f.label===labelText);
      return `
        <div class="seh-player-summary-stat">
          <span class="seh-player-summary-label">${labelText}</span>
          <span class="seh-player-summary-value">${x.value}</span>
        </div>
      `;
    }).join('');

    // Stable placement immediately before career statistics.
    if(careerHeading){
      let careerSection=careerHeading;
      for(let depth=0; careerSection && careerSection!==main && depth<7; depth++,careerSection=careerSection.parentElement){
        const txt=clean(careerSection.innerText||'');
        if(
          /Karriärstatistik|Målvaktsstatistik/i.test(txt) &&
          /\bMATCHER\b/i.test(txt) &&
          txt.length<1200
        ){
          break;
        }
      }
      const anchor=(careerSection && careerSection!==main) ? careerSection : careerHeading;
      if(row.parentElement!==anchor.parentElement || row.nextElementSibling!==anchor){
        anchor.insertAdjacentElement('beforebegin',row);
      }
    }

    // Hide all three original compact summary boxes every pass.
    found.forEach(x=>{
      x.box.classList.add('seh-player-summary-original-hide');
      x.box.style.setProperty('display','none','important');
    });

    // Safety: hide any duplicate old summary cards before career stats.
    labels.forEach(labelText=>{
      const val=found.find(f=>f.label===labelText)?.value;
      if(!val)return;

      [...main.querySelectorAll('*')].forEach(el=>{
        if(el.closest('.seh-player-summary-row'))return;
        try{
          if(el.getBoundingClientRect().top >= careerTop)return;
        }catch(_){}

        const txt=clean(el.innerText||el.textContent||'');
        if(txt!==`${labelText} ${val}`)return;

        let node=el;
        let chosen=el;
        for(let depth=0; node && node!==main && node!==document.body && depth<5; depth++,node=node.parentElement){
          const nt=clean(node.innerText||node.textContent||'');
          if(nt===`${labelText} ${val}` && nt.length<120){
            chosen=node;
          }else{
            break;
          }
        }

        chosen.classList.add('seh-player-summary-original-hide');
        chosen.style.setProperty('display','none','important');
      });
    });
  }

  function adaptPlayerProfileRoleStats(){
    if(route().kind!=='player')return;

    const main=document.querySelector('main');
    if(!main)return;

    const goalieTitleRx=/^(Målvaktsstatistik|Goalie statistics)$/i;
    const skaterTitleRx=/^(Karriärstatistik|Utespelarstatistik|Skater statistics|Spelarstatistik)$/i;
    const statTitles=[goalieTitleRx, skaterTitleRx];

    const clean=v=>(v||'').replace(/\s+/g,' ').trim();

    const titleNodes=[...main.querySelectorAll('h1,h2,h3,h4,strong,b,div,span')].filter(el=>{
      const t=clean(el.textContent||'');
      return statTitles.some(rx=>rx.test(t));
    });

    titleNodes.forEach(title=>{
      const titleText=clean(title.textContent||'');
      const isGoalieSection=goalieTitleRx.test(titleText);
      const isSkaterSection=skaterTitleRx.test(titleText);

      let section=title;
      let chosen=null;

      for(let depth=0; section && section!==main && section!==document.body && depth<7; depth++,section=section.parentElement){
        const text=clean(section.innerText||'');
        const hasMatches=/\bMATCHER\b/i.test(text);
        const tooLarge=text.length>900;

        if(hasMatches && !tooLarge){
          chosen=section;
          break;
        }
      }

      if(!chosen)return;

      let matchValue=null;
      const labels=[...chosen.querySelectorAll('*')].filter(el=>
        /^MATCHER$/i.test(clean(el.textContent||''))
      );

      for(const label of labels){
        const parent=label.parentElement;
        if(!parent)continue;

        const candidates=[
          ...parent.children,
          parent.nextElementSibling,
          label.nextElementSibling
        ].filter(Boolean);

        for(const c of candidates){
          if(c===label)continue;
          const t=clean(c.textContent||'');
          if(/^\d+$/.test(t)){
            matchValue=Number(t);
            break;
          }
        }
        if(matchValue!==null)break;

        const pt=clean(parent.innerText||'');
        const m=pt.match(/\bMATCHER\s+(\d+)\b/i);
        if(m){
          matchValue=Number(m[1]);
          break;
        }
      }

      if(matchValue===null){
        const txt=clean(chosen.innerText||'');
        const m=txt.match(/\bMATCHER\s+(\d+)\b/i);
        if(m)matchValue=Number(m[1]);
      }

      let hideSection=false;

      if(isSkaterSection){
        // Hide the skater panel completely if the player has not played as a skater.
        hideSection=(matchValue===0);
      }else if(isGoalieSection){
        // Hide the goalie panel completely if the player has not played as a goalie.
        hideSection=(matchValue===0);
      }

      chosen.classList.toggle('seh-zero-role-stats',hideSection);
    });
  }


  function sehTeamClean(value){return String(value||'').replace(/\s+/g,' ').trim();}

  function sehTeamInitials(name){
    const words=sehTeamClean(name).split(/\s+/).filter(Boolean);
    if(!words.length)return 'LAG';
    if(words.length===1)return words[0].slice(0,3).toUpperCase();
    return words.slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  }

  function sehTeamFindHeading(main,patterns){
    const headings=[...main.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    for(const pattern of patterns){
      const hit=headings.find(h=>pattern.test(sehTeamClean(h.textContent||'')));
      if(hit)return hit;
    }
    return null;
  }

  function sehTeamSectionForHeading(heading){
    if(!heading)return null;
    let node=heading;
    for(let depth=0;node&&node.parentElement&&depth<5;depth++,node=node.parentElement){
      const parent=node.parentElement;
      if(!parent||parent.tagName==='MAIN'||parent===document.body)break;
      const text=sehTeamClean(parent.textContent||'');
      if(text.length>0&&text.length<1800&&parent.querySelectorAll('h1,h2,h3,h4,h5,h6').length<=2)return parent;
    }
    return heading.parentElement;
  }

  function sehTeamExactTextElement(main,value){
    const wanted=sehTeamClean(value);
    if(!wanted)return null;
    return [...main.querySelectorAll('div,span,p,strong,b,button,a')].find(el=>sehTeamClean(el.textContent||'')===wanted)||null;
  }

  function sehTeamHideCompactElement(el,main){
    if(!el)return;
    let target=el,node=el;
    for(let depth=0;depth<3;depth++){
      const parent=node?.parentElement;
      if(!parent||parent===main||parent===document.body)break;
      if(sehTeamClean(parent.textContent||'')!==sehTeamClean(node.textContent||''))break;
      target=parent;node=parent;
    }
    target.classList.add('seh-team-original-hero-hide');
  }

  function sehTeamFindLogo(main,teamName){
    const imgs=[...main.querySelectorAll('img')].filter(img=>!img.closest('.seh-team-native-shell'));
    const scored=imgs.map(img=>{
      const src=String(img.currentSrc||img.getAttribute('src')||'');
      const alt=sehTeamClean(img.getAttribute('alt')||'');
      let score=0;
      if(/teamlogos|team-logo|logo/i.test(src))score+=6;
      if(alt&&teamName&&alt.toLocaleLowerCase('sv-SE').includes(teamName.toLocaleLowerCase('sv-SE')))score+=5;
      if(/logo/i.test(alt))score+=2;
      const rect=img.getBoundingClientRect?.();
      if(rect&&rect.width>70&&rect.height>70)score+=3;
      if(rect&&Math.abs(rect.width-rect.height)<50)score+=1;
      return {img,score};
    }).sort((a,b)=>b.score-a.score);
    return scored[0]?.score>0?scored[0].img:null;
  }

  function sehTeamCompactTournamentLabel(value,competitionHint=''){
    let raw=sehTeamClean(value);
    if(!raw)return '';

    let hint=sehTeamClean(competitionHint).toUpperCase();

    raw=raw
      .replace(/\bWestern European Championship League\b/gi,'WECL')
      .replace(/\bXbox European Championship League\b/gi,'XECL')
      .replace(/\bEuropean Championship League\b/gi,'ECL')
      .replace(/\bSwedish Championship League\b/gi,'SCL')
      .replace(/\bFinnish Championship League\b/gi,'FCL')
      .replace(/\bGerman Championship League\b/gi,'GCL')
      .replace(/\bSvenska eHockey Cupen\b/gi,'SEC')
      .replace(/\bSvenska Mästerskapet\b/gi,'SM')
      .replace(/\b6v6\b/gi,' ')
      .replace(/\s+/g,' ')
      .trim();

    if(/^\d+$/.test(raw) && /\bSEC\b/i.test(hint))raw=`SEC ${raw}`;

    raw=raw
      .replace(/\b(SCL|SEC|SM|FCL|GCL)\s*-\s*(20\d{2})\b/gi,'$1 $2')
      .replace(/\s+-\s+/g,' - ')
      .replace(/\s{2,}/g,' ')
      .trim();

    return raw;
  }

  function sehTeamCompetitionCodes(text){
    const order=['ECL','SEC','SCL','SM','eSHL','FCL','GCL','WECL','XECL','NACL','RCL'];
    const out=[];
    order.forEach(code=>{
      const escaped=code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if(new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`,'i').test(text))out.push(code);
    });
    return out;
  }

  function sehTeamProfileTargets(main){
    const headings={};
    headings.overview=sehTeamFindHeading(main,[/^KLUBBPROFIL$/i,/^ÖVERSIKT$/i,/PROFIL/i]);
    headings.stats=sehTeamFindHeading(main,[/^STATISTIK$/i,/FLEST MATCHER/i,/TOPP SPELARE/i,/REKORD/i]);
    headings.history=sehTeamFindHeading(main,[/^HISTORIK$/i,/TURNERINGAR/i,/SÄSONGER/i]);
    headings.players=sehTeamFindHeading(main,[/^SPELARE$/i,/TRUPP/i]);
    headings.merits=sehTeamFindHeading(main,[/^MERITER$/i,/TITLAR/i,/PODIUM/i,/MÄSTARE/i]);

    const panels={};

    Object.entries(headings).forEach(([key,heading])=>{
      if(!heading)return;
      const section=sehTeamSectionForHeading(heading);
      if(!section)return;
      section.dataset.sehTeamPanel=key;
      section.classList.add('seh-team-native-panel');
      panels[key]=section;
    });

    return {headings,panels};
  }

  function sehTeamSwedishList(values){
    const items=[...values].filter(Boolean);
    if(items.length<=1)return items[0]||'';
    if(items.length===2)return `${items[0]} och ${items[1]}`;
    return `${items.slice(0,-1).join(', ')} och ${items.at(-1)}`;
  }

  function sehTeamCleanBioText(value){
    return String(value||'')
      .replace(/\bSCL\s+6v6\s*-\s*(20\d{2})\b/gi,'SCL $1')
      .replace(/\b6v6\b/gi,'')
      .replace(/\s{2,}/g,' ')
      .replace(/\s+([.,])/g,'$1')
      .trim();
  }

  function sehTeamMeritRows(panel){
    if(!panel)return [];

    const direct=[...panel.querySelectorAll('.dev-tournament')];
    if(direct.length)return direct;

    const candidates=[...panel.querySelectorAll(
      'article,li,tr,[class*="merit"],[class*="tournament"],div'
    )];

    return candidates.filter(el=>{
      const text=sehTeamClean(el.textContent||'');
      if(!text || text.length>320)return false;
      return /(?:#\s*[123]\b|\bMästare\b|\bFinalist\b|\bSilver\b|\bBrons\b)/i.test(text);
    });
  }

  function sehTeamEnrichOverviewBio(targets){
    const overview=targets?.panels?.overview;
    const history=targets?.panels?.history;
    const merits=targets?.panels?.merits;
    if(!overview)return;

    const bio=[...overview.querySelectorAll('p')]
      .find(p=>sehTeamClean(p.textContent||'').length>20);
    if(!bio)return;

    const original=sehTeamCleanBioText(bio.textContent||'');

    const teamName=(
      original.match(/^(.+?)\s+har deltagit i\b/i)?.[1] ||
      overview.closest('main')?.querySelector('h1')?.textContent ||
      'Laget'
    ).replace(/\s+/g,' ').trim();

    const tournamentCount=Number(original.match(/\b(\d+)\s+registrerade turneringar\b/i)?.[1]||0);
    const games=Number(original.match(/\bspelat(?: totalt)?\s+(\d+)\s+matcher\b/i)?.[1]||0);
    const wins=Number(
      original.match(/\b(?:med|vunnit)\s+(\d+)\s+(?:av dessa )?matcher\b/i)?.[1] ||
      original.match(/\bmed\s+(\d+)\s+vinster\b/i)?.[1] || 0
    );
    const losses=Number(
      original.match(/\b(?:och\s+)?förlorat\s+(\d+)\b/i)?.[1] ||
      original.match(/\boch\s+(\d+)\s+förluster\b/i)?.[1] || 0
    );
    const highestEcl=(original.match(/\bHögsta registrerade ECL-nivå är\s+([^.]+)\./i)?.[1]||'').trim();

    const historyRows=history ? [...history.querySelectorAll('.dev-tournament')] : [];

    const titleFor=row=>{
      if(!row)return '';
      const raw=sehTeamClean(row.querySelector('strong,h3,h4')?.textContent||'');
      const hint=sehTeamClean(row.querySelector('small,[class*="meta"]')?.textContent||'');
      return raw ? sehTeamCompactTournamentLabel(raw,hint) : '';
    };

    const metaFor=row=>{
      if(!row)return {gp:0,status:''};
      const rowText=sehTeamClean(row.textContent||'');
      const badge=sehTeamClean(row.querySelector('b,[class*="placement"],[class*="place"]')?.textContent||'');
      const small=sehTeamClean(row.querySelector('small,[class*="meta"]')?.textContent||'');

      const gp=Number(
        badge.match(/\b(\d+)\s*GP\b/i)?.[1] ||
        rowText.match(/\b(\d+)\s*GP\b/i)?.[1] || 0
      );

      const statusParts=small
        .split(/[·|]/)
        .map(x=>x.trim())
        .filter(Boolean)
        .filter(x=>!/^(ECL|SCL|SEC|SM|FCL|GCL|RCL|eSHL|Core|Lite|Pro|Elite|Neo|Main)$/i.test(x));

      return {gp,status:statusParts.at(-1)||''};
    };

    const latestRow=historyRows[0]||null;
    const latestTournament=titleFor(latestRow);
    const latestMeta=metaFor(latestRow);
    const firstTournament=titleFor(historyRows.at(-1));

    const champions=[];
    let silver=0;
    let bronze=0;
    const seen=new Set();

    for(const row of sehTeamMeritRows(merits)){
      const rowText=sehTeamClean(row.textContent||'');
      const badge=sehTeamClean(row.querySelector('b,[class*="placement"],[class*="place"]')?.textContent||'');

      let placement=Number(row?.dataset?.placement)||0;
      if(!placement&&/#\s*1\b|\bMästare\b|\bGuld\b/i.test(`${badge} ${rowText}`))placement=1;
      else if(!placement&&/#\s*2\b|\bFinalist\b|\bSilver\b/i.test(`${badge} ${rowText}`))placement=2;
      else if(!placement&&/#\s*3\b|\bBrons\b/i.test(`${badge} ${rowText}`))placement=3;
      if(!placement)continue;

      const raw=sehTeamClean(row.querySelector('strong,h3,h4')?.textContent||'');
      const hint=sehTeamClean(row.querySelector('small,[class*="meta"]')?.textContent||rowText);
      const title=raw ? sehTeamCompactTournamentLabel(raw,hint) : '';

      const key=`${placement}|${title||rowText}`;
      if(seen.has(key))continue;
      seen.add(key);

      if(placement===1 && title)champions.push(title);
      else if(placement===2)silver+=1;
      else if(placement===3)bronze+=1;
    }

    const paragraphs=[];

    const intro=[];
    if(tournamentCount && games){
      intro.push(`${teamName} har deltagit i ${tournamentCount} registrerade turneringar och spelat totalt ${games.toLocaleString('sv-SE')} matcher.`);
    }else if(tournamentCount){
      intro.push(`${teamName} har deltagit i ${tournamentCount} registrerade turneringar.`);
    }else{
      intro.push(original.split(/(?<=\.)\s+/)[0]||original);
    }

    if(games && wins){
      const pct=(wins/games)*100;
      let sentence=`Av dessa matcher har laget vunnit ${wins.toLocaleString('sv-SE')}`;
      if(losses)sentence+=` och förlorat ${losses.toLocaleString('sv-SE')}`;
      sentence+=`, vilket motsvarar en segerprocent på ${pct.toLocaleString('sv-SE',{maximumFractionDigits:1})} %.`;
      intro.push(sentence);
    }

    if(firstTournament){
      intro.push(`Den första registrerade turneringen var ${firstTournament}.`);
    }
    paragraphs.push(intro.join(' '));

    const recent=[];
    if(latestTournament){
      let sentence=`Senast spelade ${teamName} i ${latestTournament}`;
      if(latestMeta.gp)sentence+=`, där laget spelade ${latestMeta.gp.toLocaleString('sv-SE')} matcher`;

      let status=latestMeta.status;
      status=status
        .replace(/^Missade slutspel$/i,'missade slutspel')
        .replace(/^Mästare$/i,'blev mästare')
        .replace(/^Final$/i,'nådde final')
        .replace(/^Semifinal$/i,'nådde semifinal')
        .replace(/^Kvartsfinal$/i,'nådde kvartsfinal')
        .replace(/^Omgång\s+1$/i,'nådde omgång 1');

      if(status && /^(missade|blev|nådde)/i.test(status))sentence+=` och ${status}`;
      sentence+='.';
      recent.push(sentence);
    }

    if(highestEcl){
      recent.push(`Den högsta registrerade ECL-nivån är ${highestEcl}.`);
    }
    if(recent.length)paragraphs.push(recent.join(' '));

    const merit=[];
    const possessiveTeamName=/[sxz]$/i.test(teamName)
      ? teamName
      : `${teamName}s`;

    if(champions.length===1){
      merit.push(`${possessiveTeamName} främsta merit är mästartiteln i ${champions[0]}.`);
    }else if(champions.length>1){
      merit.push(`${possessiveTeamName} främsta meriter är mästartitlarna i ${sehTeamSwedishList(champions)}.`);
    }

    const podium=[];
    if(silver)podium.push(`${silver} ${silver===1?'andraplats':'andraplatser'}`);
    if(bronze)podium.push(`${bronze} ${bronze===1?'tredjeplats':'tredjeplatser'}`);
    if(podium.length)merit.push(`Därtill finns ${sehTeamSwedishList(podium)} registrerade.`);
    if(merit.length)paragraphs.push(merit.join(' '));

    const wrapper=document.createElement('div');
    wrapper.className='seh-team-native-bio';

    paragraphs
      .map(sehTeamCleanBioText)
      .filter(Boolean)
      .forEach(value=>{
        const p=document.createElement('p');
        p.textContent=value;
        wrapper.appendChild(p);
      });

    bio.replaceWith(wrapper);
  }

  function sehTeamDivisionChronologyValue(row){
    for(const value of [
      row?.chronologyEndDate,
      row?.chronologyDate,
      row?.sortDate
    ]){
      const text=String(value||'').slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(text))continue;
      const time=Date.parse(`${text}T00:00:00`);
      if(Number.isFinite(time))return time;
    }
    return 0;
  }

  function sehTeamDivisionCurveRows(main){
    if(!main)return [];

    const allowed=new Set(['Elite','Pro','Lite','Core','Neo']);
    const rows=[...main.querySelectorAll('[data-seh-division-row]')]
      .map(node=>{
        const competition=String(node.dataset.competitionCode||'').trim().toUpperCase();
        const division=String(node.dataset.division||'').trim();
        if(competition!=='ECL'||!allowed.has(division))return null;

        return {
          title:sehTeamCompactTournamentLabel(node.dataset.label||'',competition),
          division,
          chronologyEndDate:node.dataset.chronologyEndDate||'',
          chronologyDate:node.dataset.chronologyDate||'',
          sortDate:node.dataset.sortDate||''
        };
      })
      .filter(Boolean)
      .sort((a,b)=>
        sehTeamDivisionChronologyValue(a)-sehTeamDivisionChronologyValue(b) ||
        a.title.localeCompare(b.title,'sv-SE',{numeric:true})
      );

    return rows.length>12?rows.slice(-12):rows;
  }

  function sehTeamDivisionPointLabel(row){
    let label=String(row?.title||'')
      .replace(/^ECL\s*/i,'')
      .trim();

    label=label.replace(/\b20(\d{2})\b/g,"'$1");

    const division=String(row?.division||'').trim();
    if(division&&!new RegExp(`\\b${division}\\b`,'i').test(label)){
      label=`${label} ${division}`.trim();
    }

    return label;
  }

  function sehTeamExistingWebDivisionCurve(main){
    if(!main)return null;
    const panel=main.querySelector('.history-division-panel');
    const svg=panel?.querySelector('.division-curve svg');
    if(!panel||!svg)return null;

    return {
      panel,
      svg,
      first:sehTeamClean(panel.querySelector('#divisionCurveFirst')?.textContent||''),
      latest:sehTeamClean(panel.querySelector('#divisionCurveLatest')?.textContent||'')
    };
  }

  function sehTeamStyleClonedDivisionSvg(svg){
    if(!svg)return;
    [
      ['.division-grid-line','seh-team-division-grid-line'],
      ['.division-axis-label','seh-team-division-axis-label'],
      ['.division-line','seh-team-division-line'],
      ['.division-point','seh-team-division-point'],
      ['.division-season-label','seh-team-division-season-label']
    ].forEach(([selector,className])=>{
      svg.querySelectorAll(selector).forEach(node=>node.classList.add(className));
    });
  }

  function sehTeamRenderDivisionCurve(targets){
    const overview=targets?.panels?.overview;
    if(!overview)return;

    const main=overview.closest('main')||document.querySelector('main');
    if(!main)return;

    overview.querySelector('.seh-team-division-card')?.remove();

    const structuredRows=sehTeamDivisionCurveRows(main);
    const existingWebCurve=structuredRows.length?null:sehTeamExistingWebDivisionCurve(main);
    if(!structuredRows.length&&!existingWebCurve)return;

    const card=document.createElement('section');
    card.className='seh-team-division-card';

    const heading=document.createElement('div');
    heading.className='seh-team-division-heading';
    heading.innerHTML=`
      <span>DIVISIONER</span>
      <h3>Divisionskurva</h3>
      <p>Från Neo längst ner till Elite högst upp.</p>
    `;
    card.appendChild(heading);

    const chart=document.createElement('div');
    chart.className='seh-team-division-chart';

    let firstText='';
    let latestText='';

    if(existingWebCurve){
      const svg=existingWebCurve.svg.cloneNode(true);
      sehTeamStyleClonedDivisionSvg(svg);
      chart.appendChild(svg);
      firstText=existingWebCurve.first;
      latestText=existingWebCurve.latest;

      /*
       * Android laddar den riktiga webbsidan i botten. När webbens verifierade
       * divisions-SVG redan finns återanvänder vi den direkt i native-vyn i
       * stället för att försöka återskapa divisioner från synlig text.
       */
      existingWebCurve.panel.classList.add('seh-team-original-hero-hide');
    }else{
      const divisions={Elite:5,Pro:4,Lite:3,Core:2,Neo:1};
      const width=360;
      const height=196;
      const left=50;
      const right=12;
      const top=15;
      const bottom=43;
      const chartWidth=width-left-right;
      const chartHeight=height-top-bottom;

      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      svg.setAttribute('role','img');
      svg.setAttribute('aria-label','Lagets ECL-divisioner över tid');

      Object.entries(divisions).forEach(([division,rank])=>{
        const y=top+((5-rank)/4)*chartHeight;

        const line=document.createElementNS(svg.namespaceURI,'line');
        line.setAttribute('x1',left);
        line.setAttribute('x2',width-right);
        line.setAttribute('y1',y);
        line.setAttribute('y2',y);
        line.setAttribute('class','seh-team-division-grid-line');
        svg.appendChild(line);

        const label=document.createElementNS(svg.namespaceURI,'text');
        label.setAttribute('x','4');
        label.setAttribute('y',String(y+3));
        label.setAttribute('class','seh-team-division-axis-label');
        label.textContent=division.toUpperCase();
        svg.appendChild(label);
      });

      const points=structuredRows.map((row,index)=>{
        const x=structuredRows.length===1
          ? left+chartWidth/2
          : left+(index/(structuredRows.length-1))*chartWidth;
        const rank=divisions[row.division]||1;
        const y=top+((5-rank)/4)*chartHeight;
        return {x,y,row};
      });

      const polyline=document.createElementNS(svg.namespaceURI,'polyline');
      polyline.setAttribute('points',points.map(point=>`${point.x},${point.y}`).join(' '));
      polyline.setAttribute('class','seh-team-division-line');
      svg.appendChild(polyline);

      points.forEach((point,index)=>{
        const circle=document.createElementNS(svg.namespaceURI,'circle');
        circle.setAttribute('cx',String(point.x));
        circle.setAttribute('cy',String(point.y));
        circle.setAttribute('r','4');
        circle.setAttribute('class','seh-team-division-point');
        svg.appendChild(circle);

        const showLabel=
          points.length<=5 ||
          index===0 ||
          index===points.length-1 ||
          index%Math.ceil(points.length/5)===0;

        if(showLabel){
          const label=document.createElementNS(svg.namespaceURI,'text');
          label.setAttribute('x',String(point.x));
          label.setAttribute('y',String(height-13));
          label.setAttribute('text-anchor','middle');
          label.setAttribute('class','seh-team-division-season-label');

          const compact=sehTeamDivisionPointLabel(point.row);
          label.textContent=compact.length>16?compact.slice(0,15)+'…':compact;
          svg.appendChild(label);
        }
      });

      chart.appendChild(svg);

      const first=structuredRows[0];
      const latest=structuredRows.at(-1);
      firstText=`${first.title}: ${first.division}`;
      latestText=`${latest.title}: ${latest.division}`;
    }

    card.appendChild(chart);

    const footer=document.createElement('div');
    footer.className='seh-team-division-footer';

    const first=document.createElement('span');
    first.textContent=firstText||'–';
    const latest=document.createElement('span');
    latest.textContent=latestText||'–';
    footer.append(first,latest);

    card.appendChild(footer);
    overview.appendChild(card);
  }


  function sehTeamInitStatSorters(targets){
    const panel=targets?.panels?.stats;
    if(!panel)return;

    const integer=value=>Math.round(Number(value)||0).toLocaleString('sv-SE');
    const decimal=value=>(Number(value)||0).toLocaleString('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1});

    panel.querySelectorAll('[data-stat-board]').forEach(board=>{
      if(board.dataset.statSorterReady==='1')return;
      const rowsHost=board.querySelector('.dev-stat-rows');
      const rows=[...board.querySelectorAll('.dev-stat-data-row')];
      const buttons=[...board.querySelectorAll('[data-stat-sort]')];
      const summary=board.querySelector('[data-stat-summary]');
      if(!rowsHost||!rows.length||!buttons.length)return;

      board.dataset.statSorterReady='1';
      const type=board.dataset.statBoard==='goalie'?'goalie':'skater';
      const configs=type==='goalie'
        ? {
            games:{label:'MATCHER',unit:'GP',format:integer},
            savepct:{label:'SV%',unit:'SV%',format:value=>`${decimal(value)}%`},
            shutouts:{label:'SO',unit:'SO',format:integer}
          }
        : {
            points:{label:'POÄNG',unit:'PTS',format:integer},
            goals:{label:'MÅL',unit:'G',format:integer},
            assists:{label:'ASSIST',unit:'A',format:integer},
            games:{label:'MATCHER',unit:'GP',format:integer}
          };

      const valueFor=(row,key)=>Number(row.dataset[`stat${key.charAt(0).toUpperCase()+key.slice(1)}`])||0;

      const apply=(metric,button)=>{
        const config=configs[metric]||configs[Object.keys(configs)[0]];
        const key=configs[metric]?metric:Object.keys(configs)[0];

        buttons.forEach(item=>{
          const active=item===button || (!button&&item.dataset.statSort===key);
          item.classList.toggle('is-active',active);
          item.setAttribute('aria-pressed',active?'true':'false');
        });

        rows.sort((a,b)=>{
          const primary=valueFor(b,key)-valueFor(a,key);
          if(primary)return primary;
          const games=valueFor(b,'games')-valueFor(a,'games');
          if(games)return games;
          return String(a.dataset.statName||'').localeCompare(String(b.dataset.statName||''),'sv',{sensitivity:'base',numeric:true});
        });

        rows.forEach((row,index)=>{
          rowsHost.appendChild(row);
          row.dataset.rank=String(index+1);
          row.classList.toggle('is-outside-top10',index>=10);
          const rank=row.querySelector('.dev-stat-rank');
          if(rank)rank.textContent=String(index+1);
          const primary=row.querySelector('[data-stat-primary]');
          if(primary){
            const strong=primary.querySelector('strong');
            const small=primary.querySelector('small');
            if(strong)strong.textContent=config.format(valueFor(row,key));
            if(small)small.textContent=config.unit;
          }
        });

        if(summary)summary.textContent=`TOPP 10 · ${config.label}`;
        board.dataset.statActiveSort=key;
      };

      buttons.forEach(button=>{
        button.addEventListener('click',()=>apply(button.dataset.statSort,button));
      });

      const active=buttons.find(button=>button.classList.contains('is-active'))||buttons[0];
      apply(active.dataset.statSort,active);
    });
  }

  const sehTeamDirectSourceCache=(window.__SEH_TEAM_DIRECT_SOURCE_CACHE__ instanceof Map)
    ? window.__SEH_TEAM_DIRECT_SOURCE_CACHE__
    : (window.__SEH_TEAM_DIRECT_SOURCE_CACHE__=new Map());

  function sehTeamRouteId(){
    const match=String(location.hash||'').match(/^#\/lag\/(\d+)(?:[/?#]|$)/i);
    return Number(match?.[1])||0;
  }

  function sehTeamDirectChronology(row){
    for(const value of [row?.chronology_end_date,row?.chronology_date,row?.sort_date]){
      const time=Date.parse(String(value||''));
      if(Number.isFinite(time))return time;
    }
    return 0;
  }

  function sehTeamDirectLogo(team){
    const raw=String(team?.logo_url||team?.logo_path||'').trim();
    const name=String(team?.current_name||'').trim();
    return sehWebAppTeamLogo(raw,name);
  }

  function sehTeamDirectPlayerImage(player){
    const sg=String(player?.sports_gamer_player_url||'').trim();
    const match=sg.match(/\/players\/(\d+)(?:\/|$|[?#])/i);
    const raw=String(player?.player_image||'').trim();
    if(match||raw)return sehWebAppPlayerImage(raw,match?.[1]||'');

    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="none"/><circle cx="48" cy="31" r="18" fill="#102a56" stroke="#d6b15f" stroke-width="3"/><path d="M18 84c2-18 15-28 30-28s28 10 30 28" fill="#102a56" stroke="#d6b15f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function sehTeamDirectNumber(value){
    return (Number(value)||0).toLocaleString('sv-SE');
  }

  function sehTeamDirectDecimal(value,decimals=1){
    return (Number(value)||0).toLocaleString('sv-SE',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  }

  function sehTeamDirectSavePct(value){
    const raw=Number(value)||0;
    const pct=raw<=1.5?raw*100:raw;
    return `${pct.toLocaleString('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
  }

  async function sehTeamDirectRest(table,params={}){
    const cfg=window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};
    const supabaseUrl=String(cfg.supabaseUrl||cfg.SUPABASE_URL||'https://oujqnvrczdavqbqaavuh.supabase.co').replace(/\/+$/,'');
    const publishableKey=String(cfg.supabasePublishableKey||cfg.supabaseAnonKey||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z').trim();
    const url=new URL(`${supabaseUrl}/rest/v1/${table}`);
    Object.entries(params).forEach(([key,value])=>{
      if(value!==undefined&&value!==null&&String(value)!=='')url.searchParams.set(key,String(value));
    });
    const response=await fetch(url.toString(),{
      headers:{apikey:publishableKey,Accept:'application/json'},
      cache:'no-store'
    });
    if(!response.ok)throw new Error(`${table} HTTP ${response.status}`);
    const rows=await response.json();
    if(!Array.isArray(rows))throw new Error(`Ogiltigt svar från ${table}`);
    return rows;
  }

  function sehTeamLoadDirectData(teamId){
    let state=sehTeamDirectSourceCache.get(teamId);
    if(state?.data)return state;
    if(state?.promise)return state;

    state=state||{data:null,promise:null,error:null,version:0};
    sehTeamDirectSourceCache.set(teamId,state);

    state.promise=(async()=>{
      try{
        const [teamRows,statRows,historyRows,playerRows,podiumRows]=await Promise.all([
          sehTeamDirectRest('v_local_team_list',{
            select:'team_id,current_name,effective_country,league_appearances,first_registered_at,last_registered_at,logo_path,logo_url,profile_url',
            team_id:`eq.${teamId}`,
            limit:'1'
          }),
          sehTeamDirectRest('v_local_team_tournaments',{
            select:'team_id,current_name,competition_code,competition_name,season_label,season_number,season_year,season_period,league_name,division,division_rank,name_used_in_tournament,final_placement,playoff_status,games_played,wins,losses,overtime_wins,overtime_losses,goals_for,goals_against,goal_diff,table_points,has_statistics,sort_date',
            team_id:`eq.${teamId}`,
            order:'sort_date.desc.nullslast',
            limit:'300'
          }).catch(error=>{console.warn('[Svensk eHockey] Lagstatistik kunde inte hämtas',error);return [];}),
          sehTeamDirectRest('v_ehockey_team_tournaments_web_v14',{
            select:'team_id,current_name,competition_code,competition_name,season_label,season_number,season_year,season_period,league_name,division,division_rank,name_used_in_tournament,final_placement,playoff_status,games_played,wins,losses,goals_for,goals_against,has_statistics,sort_date,chronology_date,chronology_end_date,display_start_date,display_end_date',
            team_id:`eq.${teamId}`,
            order:'chronology_end_date.desc.nullslast,chronology_date.desc.nullslast,sort_date.desc.nullslast',
            limit:'300'
          }).catch(error=>{console.warn('[Svensk eHockey] Laghistorik kunde inte hämtas',error);return [];}),
          sehTeamDirectRest('v_ehockey_team_all_time_players_central_v1',{
            select:'team_id,player_key,display_gamertag,player_country,player_image,primary_position,latest_season,latest_division,tournament_count,competitions,divisions,total_skater_games,total_goals,total_assists,total_points,total_plus_minus,total_penalty_minutes,total_goalie_games,total_goalie_wins,total_goalie_losses,total_goalie_overtime_losses,total_goalie_saves,total_goalie_shots_against,total_goalie_goals_allowed,total_goalie_save_percentage,total_goalie_goals_against_average,total_goalie_shutouts,career_games,player_type,sports_gamer_player_url',
            team_id:`eq.${teamId}`,
            order:'career_games.desc.nullslast',
            limit:'500'
          }).catch(error=>{console.warn('[Svensk eHockey] Lagspelare kunde inte hämtas',error);return [];}),
          sehTeamDirectRest('v_ehockey_team_podiums_web_v2',{
            select:'team_id,current_name,name_used_in_tournament,competition_code,season_label,league_name,division,placement,playoff_status,sort_date,chronology_date,chronology_end_date',
            team_id:`eq.${teamId}`,
            order:'chronology_end_date.desc.nullslast,chronology_date.desc.nullslast,sort_date.desc.nullslast',
            limit:'200'
          }).catch(()=>[])
        ]);

        const team=teamRows[0];
        if(!team)throw new Error(`Lag ${teamId} hittades inte`);

        const uniquePlayers=[];
        const playerSeen=new Set();
        for(const row of playerRows){
          const key=String(row?.player_key||row?.display_gamertag||'').trim().toLocaleLowerCase('sv-SE');
          if(!key||playerSeen.has(key))continue;
          playerSeen.add(key);
          uniquePlayers.push(row);
        }

        const players=uniquePlayers.map(player=>({
          player_key:String(player.player_key||'').trim(),
          display_gamertag:String(player.display_gamertag||'').trim(),
          player_country:String(player.central_player_country||player.player_country||'SE').trim()||'SE',
          player_image:player.player_image,
          primary_position:String(player.primary_position||'').trim(),
          games:Number(player.career_games)||((Number(player.total_skater_games)||0)+(Number(player.total_goalie_games)||0)),
          skater_games:Number(player.total_skater_games)||0,
          goals:Number(player.total_goals)||0,
          assists:Number(player.total_assists)||0,
          points:Number(player.total_points)||0,
          plus_minus:Number(player.total_plus_minus)||0,
          penalty_minutes:Number(player.total_penalty_minutes)||0,
          goalie_games:Number(player.total_goalie_games)||0,
          goalie_wins:Number(player.total_goalie_wins)||0,
          goalie_losses:Number(player.total_goalie_losses)||0,
          goalie_overtime_losses:Number(player.total_goalie_overtime_losses)||0,
          goalie_saves:Number(player.total_goalie_saves)||0,
          goalie_shots_against:Number(player.total_goalie_shots_against)||0,
          goalie_goals_allowed:Number(player.total_goalie_goals_allowed)||0,
          goalie_save_percentage:Number(player.total_goalie_save_percentage)||0,
          goalie_goals_against_average:Number(player.total_goalie_goals_against_average)||0,
          goalie_shutouts:Number(player.total_goalie_shutouts)||0,
          tournament_count:Number(player.tournament_count)||0,
          competitions:Array.isArray(player.competitions)?player.competitions:[],
          divisions:Array.isArray(player.divisions)?player.divisions:[],
          player_type:String(player.player_type||''),
          sports_gamer_player_url:String(player.sports_gamer_player_url||'')
        })).sort((a,b)=>b.games-a.games||b.points-a.points);

        const validStats=statRows.filter(row=>row.has_statistics||Number(row.games_played)>0);
        const sum=key=>validStats.reduce((total,row)=>total+(Number(row?.[key])||0),0);

        const statByIdentity=new Map();
        statRows.forEach(row=>{
          [
            `${String(row.competition_code||'').toLowerCase()}|${String(row.season_label||'').toLowerCase()}`,
            `${String(row.competition_code||'').toLowerCase()}|${String(row.league_name||'').toLowerCase()}`
          ].forEach(key=>{if(key!=='|')statByIdentity.set(key,row);});
        });

        const history=historyRows.map(row=>{
          const keys=[
            `${String(row.competition_code||'').toLowerCase()}|${String(row.season_label||'').toLowerCase()}`,
            `${String(row.competition_code||'').toLowerCase()}|${String(row.league_name||'').toLowerCase()}`
          ];
          const stats=keys.map(key=>statByIdentity.get(key)).find(Boolean);
          return {
            ...row,
            games_played:Number(stats?.games_played)||0,
            wins:Number(stats?.wins)||0,
            losses:Number(stats?.losses)||0,
            goals_for:Number(stats?.goals_for)||0,
            goals_against:Number(stats?.goals_against)||0,
            has_statistics:Boolean(stats?.has_statistics)||Number(stats?.games_played)>0
          };
        }).sort((a,b)=>sehTeamDirectChronology(b)-sehTeamDirectChronology(a));

        state.data={
          team,
          stats:statRows,
          history,
          players,
          podiums:podiumRows.slice().sort((a,b)=>sehTeamDirectChronology(b)-sehTeamDirectChronology(a)),
          summary:{
            seasons:Number(team.league_appearances)||history.length,
            players:players.length,
            games:sum('games_played'),
            wins:sum('wins'),
            losses:sum('losses'),
            goals_for:sum('goals_for'),
            goals_against:sum('goals_against')
          }
        };
        state.error=null;
        state.version+=1;
        return state.data;
      }catch(error){
        state.error=error;
        console.warn('[Svensk eHockey] Kunde inte hämta lagprofil direkt från Supabase',error);
        return null;
      }finally{
        state.promise=null;
        setTimeout(()=>{try{scheduleAdaptiveContent(0);}catch(_){}},0);
      }
    })();

    return state;
  }

  function sehTeamDirectCompetitionLine(rows){
    const seen=new Set();
    const out=[];
    (Array.isArray(rows)?rows:[]).forEach(row=>{
      const code=String(row?.competition_code||'').trim();
      const key=code.toLowerCase();
      if(!code||seen.has(key))return;
      seen.add(key);out.push(code);
    });
    return out.join(', ');
  }

  function sehTeamDirectPlayerMeta(player){
    const parts=[];
    const count=Number(player?.tournament_count)||0;
    if(count)parts.push(`${sehTeamDirectNumber(count)} ${count===1?'säsong':'säsonger'}`);
    const comps=Array.isArray(player?.competitions)?player.competitions.filter(Boolean).filter(value=>!/sports?gamer/i.test(String(value||''))):[];
    if(comps.length)parts.push(comps.join(' · '));
    return parts.join(' · ');
  }

  function sehTeamDirectIsSwedishPlayer(player){
    const country=String(player?.player_country||'').trim().toUpperCase();
    return country==='SE'||country==='SWE'||country==='SWEDEN'||country==='SVERIGE';
  }

  function sehTeamDirectPlayerHref(player){
    if(!sehTeamDirectIsSwedishPlayer(player))return '';
    const key=String(player?.player_key||'').trim();
    const name=String(player?.display_gamertag||'').trim();
    if(!key||!name)return '';
    return zeroPlayerHrefFromRow({player_key:key},name);
  }

  function sehBuildTeamDirectSource(main,teamId,state){
    const data=state?.data;
    if(!data)return null;

    let source=main.querySelector(`.seh-team-direct-source[data-team-id="${teamId}"]`);
    if(source&&source.dataset.sourceVersion===String(state.version)&&source.querySelector('section'))return source;
    source?.remove();

    const {team,history,players,podiums,summary}=data;
    const teamName=String(team.current_name||'Lag').trim();
    const latest=history[0]||null;
    const oldest=history.at(-1)||null;
    const competitions=sehTeamDirectCompetitionLine(history);
    const highestEcl=history
      .filter(row=>String(row.competition_code||'').trim().toUpperCase()==='ECL'&&String(row.division||'').trim())
      .sort((a,b)=>(Number(b.division_rank)||0)-(Number(a.division_rank)||0))[0];

    let bio=`${teamName} har deltagit i ${summary.seasons} registrerade turneringar`;
    if(summary.games)bio+=` och spelat ${summary.games} matcher med ${summary.wins} vinster och ${summary.losses} förluster`;
    bio+='.';
    if(oldest?.season_label)bio+=` Första registrerade deltagandet är ${oldest.season_label}.`;
    if(highestEcl?.division)bio+=` Högsta registrerade ECL-nivå är ${highestEcl.division}.`;

    const divisionAllowed=new Set(['Elite','Pro','Lite','Core','Neo']);
    const divisionExcluded=/\b(?:qualifier|qualification|wildcard|crossover|registration|free agent)\b/i;
    const divisionRows=history
      .filter(row=>String(row.competition_code||'').trim().toUpperCase()==='ECL')
      .filter(row=>divisionAllowed.has(String(row.division||'').trim()))
      .filter(row=>!divisionExcluded.test(`${row.league_name||''} ${row.season_label||''}`))
      .slice()
      .sort((a,b)=>sehTeamDirectChronology(a)-sehTeamDirectChronology(b));

    const skaters=players.filter(player=>player.skater_games>0).slice().sort((a,b)=>b.points-a.points||b.skater_games-a.skater_games);
    const goalies=players.filter(player=>player.goalie_games>0).slice().sort((a,b)=>b.goalie_games-a.goalie_games||b.goalie_save_percentage-a.goalie_save_percentage);
    const goalDiff=summary.goals_for-summary.goals_against;
    const winPct=summary.games?summary.wins/summary.games*100:0;
    const gfPg=summary.games?summary.goals_for/summary.games:0;
    const gaPg=summary.games?summary.goals_against/summary.games:0;
    const gdPg=summary.games?goalDiff/summary.games:0;
    const logo=sehTeamDirectLogo(team);

    const playerRows=players.slice(0,100).map(player=>{
      const href=sehTeamDirectPlayerHref(player);
      const tag=href?'a':'div';
      const attrs=href?` href="${htmlEscape(href)}" data-load data-seh-player-link="1"`:'';
      const playerPhoto=sehTeamDirectPlayerImage(player);
      const remotePhoto=playerPhoto && playerPhoto!==ZERO_PLAYER_PNG_FALLBACK ? playerPhoto : '';
      return `<${tag} class="dev-player-row dev-all-player-row${href?' seh-team-player-link':''}"${attrs}>
        <img class="dev-team-player-photo" src="${htmlEscape(ZERO_PLAYER_PNG_FALLBACK)}"${remotePhoto?` data-seh-player-photo-src="${htmlEscape(remotePhoto)}"`:''} alt="" style="width:40px!important;height:40px!important;object-fit:cover!important;object-position:center top!important;display:block!important">
        <div><strong>${htmlEscape(player.display_gamertag)}</strong><small>${htmlEscape([player.primary_position,sehTeamDirectPlayerMeta(player)].filter(Boolean).join(' · '))}</small></div>
        <b>${sehTeamDirectNumber(player.games)} GP</b>
      </${tag}>`;
    }).join('');

    source=document.createElement('article');
    source.className='dev-source-team-profile seh-team-direct-source';
    source.dataset.teamId=String(teamId);
    source.dataset.sourceVersion=String(state.version);
    source.innerHTML=`
      <h1>${htmlEscape(teamName)}</h1>
      <img class="dev-source-logo" src="${htmlEscape(logo)}" alt="${htmlEscape(teamName)} logo">
      <div class="dev-source-pills">
        <span>${sehTeamDirectNumber(summary.seasons)} säsonger</span>
        <span>${sehTeamDirectNumber(summary.players)} spelare</span>
        <span>${sehTeamDirectNumber(summary.games)} matcher</span>
        <span>${sehTeamDirectNumber(summary.wins)} vinster</span>
      </div>
      <div class="dev-source-pills">
        ${latest?`<span data-seh-team-latest="1">${htmlEscape(latest.season_label||latest.league_name||latest.competition_code||'')}</span>`:''}
        ${competitions?`<span>${htmlEscape(competitions)}</span>`:''}
      </div>

      <section class="dev-section"><h2>KLUBBPROFIL</h2><p>${htmlEscape(bio)}</p></section>

      <div class="dev-team-division-source" hidden aria-hidden="true">
        ${divisionRows.map(row=>`<i data-seh-division-row="1" data-competition-code="${htmlEscape(row.competition_code||'')}" data-division="${htmlEscape(row.division||'')}" data-label="${htmlEscape(row.season_label||row.league_name||'')}" data-chronology-end-date="${htmlEscape(row.chronology_end_date||'')}" data-chronology-date="${htmlEscape(row.chronology_date||'')}" data-sort-date="${htmlEscape(row.sort_date||'')}"></i>`).join('')}
      </div>

      <section class="dev-section dev-team-statistics">
        <h2>STATISTIK</h2>
        <div class="dev-source-pills dev-team-kpis">
          <span><b>${sehTeamDirectNumber(summary.games)}</b><small>MATCHER</small></span>
          <span><b>${sehTeamDirectNumber(summary.wins)}</b><small>VINSTER</small></span>
          <span><b>${sehTeamDirectNumber(summary.losses)}</b><small>FÖRLUSTER</small></span>
          <span><b>${sehTeamDirectNumber(summary.goals_for)}</b><small>GF</small></span>
          <span><b>${sehTeamDirectNumber(summary.goals_against)}</b><small>GA</small></span>
          <span><b>${goalDiff>0?'+':''}${sehTeamDirectNumber(goalDiff)}</b><small>MÅLSKILLNAD</small></span>
        </div>
        <section class="dev-team-performance">
          <div class="dev-stat-section-heading"><h3>LAGPRESTATION</h3><span>ALL-TIME</span></div>
          <div class="dev-team-performance-grid">
            <div><small>SEGERPROCENT</small><strong>${sehTeamDirectDecimal(winPct,1)} %</strong></div>
            <div><small>GF / MATCH</small><strong>${sehTeamDirectDecimal(gfPg,2)}</strong></div>
            <div><small>GA / MATCH</small><strong>${sehTeamDirectDecimal(gaPg,2)}</strong></div>
            <div><small>MÅLSK. / MATCH</small><strong>${gdPg>0?'+':''}${sehTeamDirectDecimal(gdPg,2)}</strong></div>
          </div>
        </section>

        <section class="dev-stat-leaderboard dev-stat-skaters" data-stat-board="skater">
          <div class="dev-stat-section-heading"><h3>UTESPELARE – ALL-TIME</h3><span data-stat-summary>TOPP 10 · POÄNG</span></div>
          <div class="dev-stat-sort" role="group" aria-label="Sortera utespelare">
            <button type="button" class="is-active" data-stat-sort="points" aria-pressed="true">POÄNG</button>
            <button type="button" data-stat-sort="goals" aria-pressed="false">MÅL</button>
            <button type="button" data-stat-sort="assists" aria-pressed="false">ASSIST</button>
            <button type="button" data-stat-sort="games" aria-pressed="false">MATCHER</button>
          </div>
          <div class="dev-stat-rows">
            ${skaters.map((player,index)=>{
              const href=sehTeamDirectPlayerHref(player);
              const tag=href?'a':'div';
              const attrs=href?` href="${htmlEscape(href)}" data-load data-seh-player-link="1"`:'';
              return `<${tag} class="dev-stat-player-row dev-stat-data-row${index>=10?' is-outside-top10':''}${href?' seh-team-player-link':''}"${attrs} data-rank="${index+1}" data-stat-points="${player.points}" data-stat-goals="${player.goals}" data-stat-assists="${player.assists}" data-stat-games="${player.skater_games}" data-stat-name="${htmlEscape(player.display_gamertag.toLocaleLowerCase('sv-SE'))}">
                <span class="dev-stat-rank">${index+1}</span>
                <div class="dev-stat-player-copy"><strong><i class="dev-stat-flag">${htmlEscape(sehFlagEmoji(player.player_country))}</i>${htmlEscape(player.display_gamertag)}</strong><div class="dev-stat-mini-grid dev-stat-mini-grid--skater"><span><small>GP</small><b>${sehTeamDirectNumber(player.skater_games)}</b></span><span><small>G</small><b>${sehTeamDirectNumber(player.goals)}</b></span><span><small>A</small><b>${sehTeamDirectNumber(player.assists)}</b></span><span><small>PIM</small><b>${sehTeamDirectNumber(player.penalty_minutes)}</b></span></div></div>
                <div class="dev-stat-primary" data-stat-primary><strong>${sehTeamDirectNumber(player.points)}</strong><small>PTS</small></div>
              </${tag}>`;
            }).join('')||'<p>Ingen registrerad utespelarstatistik.</p>'}
          </div>
        </section>

        ${goalies.length?`<section class="dev-stat-leaderboard dev-stat-goalies" data-stat-board="goalie">
          <div class="dev-stat-section-heading"><h3>MÅLVAKTER – ALL-TIME</h3><span data-stat-summary>TOPP 10 · MATCHER</span></div>
          <div class="dev-stat-sort" role="group" aria-label="Sortera målvakter"><button type="button" class="is-active" data-stat-sort="games" aria-pressed="true">MATCHER</button><button type="button" data-stat-sort="savepct" aria-pressed="false">SV%</button><button type="button" data-stat-sort="shutouts" aria-pressed="false">SO</button></div>
          <div class="dev-stat-rows">
            ${goalies.map((player,index)=>{
              const pct=(Number(player.goalie_save_percentage)||0)<=1.5?(Number(player.goalie_save_percentage)||0)*100:(Number(player.goalie_save_percentage)||0);
              const href=sehTeamDirectPlayerHref(player);
              const tag=href?'a':'div';
              const attrs=href?` href="${htmlEscape(href)}" data-load data-seh-player-link="1"`:'';
              return `<${tag} class="dev-stat-player-row dev-stat-data-row${index>=10?' is-outside-top10':''}${href?' seh-team-player-link':''}"${attrs} data-rank="${index+1}" data-stat-games="${player.goalie_games}" data-stat-savepct="${pct}" data-stat-shutouts="${player.goalie_shutouts}" data-stat-name="${htmlEscape(player.display_gamertag.toLocaleLowerCase('sv-SE'))}"><span class="dev-stat-rank">${index+1}</span><div class="dev-stat-player-copy"><strong><i class="dev-stat-flag">${htmlEscape(sehFlagEmoji(player.player_country))}</i>${htmlEscape(player.display_gamertag)}</strong><div class="dev-stat-mini-grid dev-stat-mini-grid--goalie"><span><small>GP</small><b>${sehTeamDirectNumber(player.goalie_games)}</b></span><span><small>SA</small><b>${sehTeamDirectNumber(player.goalie_shots_against)}</b></span><span><small>SV</small><b>${sehTeamDirectNumber(player.goalie_saves)}</b></span><span><small>GA</small><b>${sehTeamDirectNumber(player.goalie_goals_allowed)}</b></span><span><small>GAA</small><b>${sehTeamDirectDecimal(player.goalie_goals_against_average,2)}</b></span><span><small>SO</small><b>${sehTeamDirectNumber(player.goalie_shutouts)}</b></span></div></div><div class="dev-stat-primary" data-stat-primary><strong>${sehTeamDirectNumber(player.goalie_games)}</strong><small>GP</small></div></${tag}>`;
            }).join('')}
          </div>
        </section>`:''}
      </section>

      <section class="dev-section"><h2>HISTORIK</h2>${history.slice(0,80).map(row=>`<div class="dev-tournament"><div><strong>${htmlEscape(row.season_label||row.league_name||row.competition_code||'Turnering')}</strong><small>${htmlEscape([row.competition_code,row.division,row.playoff_status].filter(Boolean).join(' · '))}</small></div><b>${Number(row.games_played)>0?`${sehTeamDirectNumber(row.games_played)} GP`:Number(row.final_placement)>0?`#${htmlEscape(row.final_placement)}`:'Deltog'}</b></div>`).join('')}</section>

      <section class="dev-section dev-team-all-players"><h2>SPELARE</h2><p class="dev-team-player-intro">Alla spelare som har representerat laget i registrerade turneringar.</p>${playerRows||'<p>Ingen spelardata.</p>'}</section>

      <section class="dev-section"><h2>MERITER</h2>${podiums.length?podiums.map(row=>{const placement=Number(row.placement)||0;const medal=placement===1?'🏆':placement===2?'🥈':placement===3?'🥉':'★';const label=placement===1?'GULD':placement===2?'SILVER':placement===3?'BRONS':'MERIT';const meritName=sehTeamCompactTournamentLabel(row.season_label||row.league_name||row.competition_code||'Turnering',row.competition_code||'');return `<div class="dev-tournament dev-team-merit-row" data-placement="${placement}"><span class="dev-team-merit-icon" aria-hidden="true">${medal}</span><div><strong>${htmlEscape(meritName)}</strong><small>${htmlEscape([row.competition_code,row.division,row.playoff_status].filter(Boolean).join(' · '))}</small></div><b>${label}</b></div>`;}).join(''):'<p>Inga registrerade podiummeriter.</p>'}</section>
    `;

    // V737: show the local silhouette immediately.  A remote player PNG is
    // swapped in only after a separate preload succeeds, so Android WebView
    // never flashes a broken-image icon while a missing PNG returns 404.
    source.querySelectorAll('img.dev-team-player-photo').forEach(img=>{
      const remote=String(img.dataset.sehPlayerPhotoSrc||'').trim();
      if(!remote)return;
      const probe=new Image();
      probe.onload=()=>{
        if(img.isConnected)img.src=remote;
      };
      probe.onerror=()=>{};
      probe.src=remote;
    });

    main.prepend(source);
    return source;
  }

  function sehEnsureTeamDirectSource(main,teamId){
    if(!teamId||window.__SEH_DESKTOP_DEV__)return null;
    let state=sehTeamDirectSourceCache.get(teamId);
    if(state?.data)return sehBuildTeamDirectSource(main,teamId,state);

    state=sehTeamLoadDirectData(teamId);
    if(!state?.data){
      let loader=main.querySelector(':scope > .seh-team-native-direct-loader');
      if(!loader){
        loader=document.createElement('div');
        loader.className='seh-team-native-direct-loader';
        main.prepend(loader);
      }

      if(state?.error && !state?.promise){
        loader.textContent='Kunde inte ladda lagprofil. Tryck för att försöka igen.';
        loader.setAttribute('role','button');
        loader.tabIndex=0;
        const retry=()=>{
          sehTeamDirectSourceCache.delete(teamId);
          loader.textContent='Laddar lagprofil…';
          loader.removeAttribute('role');
          loader.removeAttribute('tabindex');
          loader.onclick=null;
          loader.onkeydown=null;
          scheduleAdaptiveContent(0);
        };
        loader.onclick=retry;
        loader.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();retry();}};
      }else{
        loader.textContent='Laddar lagprofil…';
        loader.removeAttribute('role');
        loader.removeAttribute('tabindex');
        loader.onclick=null;
        loader.onkeydown=null;
      }

      main.classList.add('seh-team-native-direct-loading');
      return null;
    }
    return sehBuildTeamDirectSource(main,teamId,state);
  }

  function adaptTeamProfileNative(){
    const existing=document.querySelector('.seh-team-native-shell');

    if(route().kind!=='team'){
      existing?.remove();
      document.body?.classList.remove('seh-team-native-v689');
      document.querySelector('main')?.classList.remove('seh-team-native-source-host','seh-team-native-direct-loading');
      document.querySelector('main > .seh-team-native-direct-loader')?.remove();
      document.querySelectorAll('.seh-team-original-hero-hide').forEach(el=>el.classList.remove('seh-team-original-hero-hide'));
      document.querySelectorAll('[data-seh-team-section]').forEach(el=>el.removeAttribute('data-seh-team-section'));
      document.querySelectorAll('[data-seh-team-panel]').forEach(el=>{
        el.hidden=false;
        el.classList.remove('seh-team-native-panel','is-active');
        el.removeAttribute('data-seh-team-panel');
        el.removeAttribute('aria-hidden');
      });
      return;
    }

    const main=document.querySelector('main');
    if(!main)return;

    const routeKey=location.pathname+location.hash;
    const teamId=sehTeamRouteId();
    let sourceRoot=main;

    if(teamId&&!window.__SEH_DESKTOP_DEV__){
      const directSource=sehEnsureTeamDirectSource(main,teamId);
      if(!directSource)return;
      sourceRoot=directSource;
      main.classList.remove('seh-team-native-direct-loading');
      main.querySelector(':scope > .seh-team-native-direct-loader')?.remove();
    }else{
      sourceRoot=main.querySelector('.dev-source-team-profile')||main;
    }

    const h1=[...sourceRoot.querySelectorAll('h1')].find(el=>!el.closest('.seh-team-native-shell')&&sehTeamClean(el.textContent||''));
    if(!h1)return;

    const teamName=sehTeamClean(h1.textContent||'');
    if(!teamName)return;

    const sourceVersion=String(sourceRoot?.dataset?.sourceVersion||sourceRoot?.dataset?.sehTeamSourceVersion||'0');
    if(existing?.dataset.routeKey===routeKey&&existing.dataset.teamName===teamName&&existing.dataset.sourceVersion===sourceVersion)return;
    existing?.remove();

    const mainText=sehTeamClean(sourceRoot.innerText||sourceRoot.textContent||'');
    const logoSource=sehTeamFindLogo(sourceRoot,teamName);

    const seasonMatch=mainText.match(/\b(\d+)\s+säsong(?:er)?\b/i);
    const playersMatch=mainText.match(/\b(\d+)\s+spelare\b/i);
    const gamesMatch=mainText.match(/\bspelat\s+(\d+)\s+matcher\b/i)||mainText.match(/\b(\d+)\s+matcher\b/i);
    const winsMatch=mainText.match(/\bmed\s+(\d+)\s+vinster\b/i)||mainText.match(/\b(\d+)\s+vinster\b/i);

    const seasons=seasonMatch?Number(seasonMatch[1]):0;
    const players=playersMatch?Number(playersMatch[1]):0;
    const games=gamesMatch?Number(gamesMatch[1]):0;
    const wins=winsMatch?Number(winsMatch[1]):0;
    const leagueLine=sehTeamCompetitionCodes(mainText).join(', ');

    const explicitLatest=sehTeamClean(
      sourceRoot.querySelector('[data-seh-team-latest="1"]')?.textContent||''
    );

    const latestCandidates=[...sourceRoot.querySelectorAll('div,span,strong,p,button')]
      .map(el=>sehTeamClean(el.textContent||''))
      .filter(t=>t.length>2&&t.length<42&&/\b(?:ECL|SCL|SEC|SM|FCL|GCL|eSHL)\b/i.test(t)&&/\b(?:20\d{2}|'?\d{2}|Season\s*\d+)\b/i.test(t));

    const latest=sehTeamCompactTournamentLabel(
      explicitLatest || latestCandidates[0] || ''
    );

    let logoUrl=logoSource?String(logoSource.currentSrc||logoSource.getAttribute('src')||'').trim():'';
    const canonicalLogo=sehWebAppTeamLogo('',teamName);
    const canonicalLogoOriginal=sehWebAppTeamLogoOriginal('',teamName);
    if(!logoUrl||/^data:/i.test(logoUrl))logoUrl=canonicalLogo;
    else logoUrl=sehWebAppTeamLogo(logoUrl,teamName);

    const shell=document.createElement('section');
    shell.className='seh-team-native-shell';
    shell.dataset.routeKey=routeKey;
    shell.dataset.teamName=teamName;
    shell.dataset.sourceVersion=sourceVersion;

    const hero=document.createElement('section');
    hero.className='seh-team-native-hero';
    hero.innerHTML=`
      <div class="seh-team-native-logo">
        ${logoUrl?`<img class="seh-team-native-bglogo" src="${htmlEscape(logoUrl)}" alt="">`:''}
        ${logoUrl?`<img class="seh-team-native-mainlogo" src="${htmlEscape(logoUrl)}" alt="${htmlEscape(teamName)} logotyp">`:`<div class="seh-team-native-logo-fallback">${htmlEscape(sehTeamInitials(teamName))}</div>`}
      </div>
      <div class="seh-team-native-identity">
        <div class="seh-team-native-name">${htmlEscape(teamName)}</div>
        <div class="seh-team-native-country"><span class="flag">🇸🇪</span><span>Svenskt eHockey-lag</span></div>
        ${leagueLine?`<div class="seh-team-native-leagues">${htmlEscape(leagueLine)}</div>`:''}
        ${latest?`<div class="seh-team-native-latest">Senast · ${htmlEscape(latest)}</div>`:''}
      </div>
      ${logoUrl?`<div class="seh-team-native-watermark" aria-hidden="true"><img src="${htmlEscape(logoUrl)}" alt=""></div>`:''}
      <div class="seh-team-native-numbers">
        <div><strong>${seasons||'—'}</strong><span>säsonger</span></div>
        <div><strong>${players||'—'}</strong><span>spelare</span></div>
        <div><strong>${games?games.toLocaleString('sv-SE'):'—'}</strong><span>matcher</span></div>
        <div><strong>${wins?wins.toLocaleString('sv-SE'):'—'}</strong><span>vinster</span></div>
      </div>`;

    const mainLogo=hero.querySelector('.seh-team-native-mainlogo');
    const bgLogo=hero.querySelector('.seh-team-native-bglogo');
    const watermark=hero.querySelector('.seh-team-native-watermark img');

    const installLogoFallback=(img)=>{
      if(!img)return;
      let triedCanonical=false;
      img.addEventListener('error',()=>{
        if(!triedCanonical&&canonicalLogoOriginal&&img.src!==canonicalLogoOriginal){triedCanonical=true;img.src=canonicalLogoOriginal;return;}
        if(img.classList.contains('seh-team-native-mainlogo')){
          const fallback=document.createElement('div');
          fallback.className='seh-team-native-logo-fallback';
          fallback.textContent=sehTeamInitials(teamName);
          img.replaceWith(fallback);
        }else img.remove();
      });
    };
    installLogoFallback(mainLogo);installLogoFallback(bgLogo);installLogoFallback(watermark);
    try{zeroApplyTeamPalette(hero,teamName,mainLogo||bgLogo);}catch(_){}

    const nativeJersey=document.createElement('div');
    nativeJersey.className='seh-team-native-jersey';
    if(teamId>0 && window.SEH_TEAM_JERSEY_V27?.mount){
      void window.SEH_TEAM_JERSEY_V27.mount(nativeJersey,{
        id:teamId,
        teamId,
        name:teamName,
        currentName:teamName,
        logoUrl
      });
    }

    const targets=sehTeamProfileTargets(sourceRoot);

    /*
     * V693: clean tournament labels on the team page itself.
     * Examples:
     *   SCL 6v6 - 2021 -> SCL 2021
     *   European Championship League 11 Neo -> ECL 11 Neo
     *   SEC row with season "5" -> SEC 5
     */
    const historyPanel=targets.panels?.history;
    if(historyPanel){
      [...historyPanel.querySelectorAll('strong')].forEach(strong=>{
        const raw=sehTeamClean(strong.textContent||'');
        const row=strong.closest('.dev-tournament')||strong.parentElement?.parentElement||strong.parentElement;
        const hint=sehTeamClean(row?.querySelector?.('small')?.textContent||'');
        const shouldCompact=
          /\b(?:6v6|European Championship League|Swedish Championship League|Finnish Championship League|German Championship League|Svenska eHockey Cupen|Svenska Mästerskapet)\b/i.test(raw) ||
          (/^\d+$/.test(raw) && /\bSEC\b/i.test(hint));

        if(!shouldCompact)return;
        strong.textContent=sehTeamCompactTournamentLabel(raw,hint);
      });
    }

    // V704: make Klubbprofil more editorial and include verified team merits.
    sehTeamEnrichOverviewBio(targets);

    // V712: restore Divisionskurva directly under Klubbprofil on Overview.
    sehTeamRenderDivisionCurve(targets);

    // V714: mobile all-time leaderboards sort independently from the player register.
    sehTeamInitStatSorters(targets);

    const dock=document.createElement('nav');
    dock.className='seh-team-native-dock';
    dock.setAttribute('aria-label','Lagprofil');

    const activateTeamPanel=(key)=>{
      const available=targets.panels||{};
      if(!available[key])key=available.overview?'overview':Object.keys(available)[0]||'overview';

      shell.dataset.activeTab=key;

      dock.querySelectorAll('.seh-team-native-tab').forEach(button=>{
        const active=button.dataset.teamTab===key;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-selected',active?'true':'false');
      });

      Object.entries(available).forEach(([panelKey,panel])=>{
        const active=panelKey===key;
        panel.classList.toggle('is-active',active);
        panel.hidden=!active;
        panel.setAttribute('aria-hidden',active?'false':'true');
      });

      window.scrollTo({top:0,behavior:'smooth'});
    };

    [['overview','Översikt'],['stats','Statistik'],['history','Historik'],['players','Spelare'],['merits','Meriter']].forEach(([key,label],index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='seh-team-native-tab'+(index===0?' is-active':'');
      button.textContent=label;
      button.dataset.teamTab=key;
      button.setAttribute('role','tab');
      button.setAttribute('aria-selected',index===0?'true':'false');
      button.onclick=()=>activateTeamPanel(key);
      dock.appendChild(button);
    });

    shell.append(hero,nativeJersey,dock);
    ['overview','stats','history','players','merits'].forEach(key=>{
      const panel=targets.panels?.[key];
      if(panel)shell.appendChild(panel);
    });
    main.insertBefore(shell,main.firstChild);
    main.classList.add('seh-team-native-source-host');
    document.body.classList.add('seh-team-native-v689');
    sehSyncTeamRp();

    sehTeamHideCompactElement(h1,sourceRoot);

    if(logoSource){
      let logoHide=logoSource,node=logoSource;
      for(let depth=0;depth<3;depth++){
        const parent=node?.parentElement;
        if(!parent||parent===sourceRoot)break;
        if(sehTeamClean(parent.textContent||'')||parent.querySelectorAll('img').length>2)break;
        logoHide=parent;node=parent;
      }
      logoHide.classList.add('seh-team-original-hero-hide');
    }

    [seasonMatch?.[0],playersMatch?.[0],latest].filter(Boolean).forEach(value=>{
      sehTeamHideCompactElement(sehTeamExactTextElement(sourceRoot,value),sourceRoot);
    });

    /*
     * Hide source-summary fragments that duplicate the native hero.
     * Desktop-dev uses these pills as source data; the real profile should not
     * show them between the tab dock and the active panel.
     */
    [...sourceRoot.querySelectorAll(':scope > .dev-source-pills')]
      .forEach(el=>el.classList.add('seh-team-original-hero-hide'));

    activateTeamPanel('overview');
  }

  function sehPreferMobileNewsImages(){
    if(window.__SEH_DESKTOP_DEV__ || !['news','article'].includes(route().kind))return;
    document.querySelectorAll('.news-article-page picture,.news-card__hero').forEach(picture=>{
      const source=picture.querySelector('source[media*="max-width"][srcset],source[data-seh-mobile-news][srcset]');
      if(!source || !source.getAttribute('srcset')?.trim())return;
      source.setAttribute('data-seh-mobile-news','');
      if(source.media!=='all')source.media='all';
    });
  }

  function adaptAppContent(){
    sehPreferMobileNewsImages();
    if(!window.__SEH_DESKTOP_DEV__){
      const nativeKind=route().kind;
      if(nativeKind==='players')sehEnsureNativePlayerDirectoryScaffold(sehNativeDirectoryHost('players'));
      else if(nativeKind==='teams')sehEnsureDirectTeamDirectory();
      else{
        sehRemoveNativeDirectoryHost();
        if(nativeKind==='player')sehPrepareNativePlayerSource();
      }
    }
    const native=document.querySelector('body > .seh-player-native-root');
    const routeKey=location.pathname+location.hash;
    if(
      route().kind==='player' &&
      native &&
      native.dataset.routeKey===routeKey &&
      native.dataset.provisional!=='1' &&
      native.dataset.sourceSparse!=='1'
    ){
      return;
    }
    if(route().kind!=='player' && native){
      native.remove();
      const main=document.querySelector('main');
      main?.classList.remove('seh-player-native-source-host');
      main?.removeAttribute('aria-hidden');
    }
    adaptTables();
    adaptEclStatisticsMobile();
    adaptPlayerCards();
    adaptPlayerCareerStats();
    adaptPlayerProfileTeamLogo();
    adaptPlayerProfileSummary();
    adaptPlayerRankingProfile();
    adaptPlayerProfileLayout();
    adaptPlayerProfileRoleStats();
    adaptPlayerTournamentHistory();
    adaptPlayerProfileNationalTeamBio();
    adaptPlayerTeamsSection();
    adaptPlayerMeritsSection();
    adaptPlayerPersonalMeritsSection();
    adaptPlayerTabbedProfile();

    adaptTeamProfileNative();

    adaptTeamCards();
  }

  function secText(el){
    return (el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  }

  function secFindCardForLink(link){
    let node=link;
    let best=null;

    for(let depth=0; node && node!==document.body && depth<9; depth++,node=node.parentElement){
      const text=secText(node);
      if(text.length>1200) continue;

      const hasName=/\bSEC\s+(?:SOMMAR\s*'?26|\d{1,2})\b/i.test(text);
      const hasMeta=/\bmatcher\b/i.test(text) || /\bVINNARE\b/i.test(text);

      if(hasName && hasMeta){
        best=node;
        break;
      }
    }

    return best || link;
  }

  function secExtractOverviewCards(){
    if(!isSec() || isSecCup()) return [];

    const main=document.querySelector('main');
    if(!main) return [];

    const links=[...main.querySelectorAll('a[href]')].filter(a=>{
      const href=a.getAttribute('href')||'';
      return /#\/cups\/[^/?#]+/i.test(href);
    });

    const out=[];
    const seen=new Set();

    links.forEach(link=>{
      let href=link.href || link.getAttribute('href') || '';
      try{ href=new URL(href,location.href).href; }catch(_){}

      const cupMatch=href.match(/#\/cups\/([^/?#]+)/i);
      if(!cupMatch) return;

      const cupId=cupMatch[1];
      if(seen.has(cupId)) return;

      const card=secFindCardForLink(link);
      const text=secText(card);

      const titleMatch=text.match(/\bSEC\s+(?:SOMMAR\s*'?26|\d{1,2})\b/i);
      if(!titleMatch) return;

      const matchesMatch=text.match(/(\d+(?:[\s\u00A0]\d{3})*)\s+matcher\b/i);
      const teamsMatch=text.match(/(\d[\d\s]*)\s+lag\b/i);

      const dateMatches=text.match(
        /(\d{1,2}\s+[A-Za-zÅÄÖåäö.]+\s+\d{4}\s*[–-]\s*\d{1,2}\s+[A-Za-zÅÄÖåäö.]+\s+\d{4})/
      );

      let winner='';
      const winnerMatch=text.match(/\bVINNARE\s+(.+?)(?=\s+(?:FINALIST|MÅLVAKT|MATCHER|TABELL|LAG|$))/i);
      if(winnerMatch) winner=winnerMatch[1].trim();

      if(!winner){
        const winnerNode=[...card.querySelectorAll('*')].find(el=>
          /^VINNARE$/i.test(secText(el))
        );
        if(winnerNode){
          const p=winnerNode.parentElement;
          const pt=secText(p).replace(/^VINNARE\s*/i,'').trim();
          if(pt && pt.length<80) winner=pt;
        }
      }

      const imgs=[...card.querySelectorAll('img')];
      let logo='';
      let winnerLogo='';

      if(imgs.length){
        logo=imgs[0].currentSrc || imgs[0].getAttribute('src') || '';
        if(imgs.length>1){
          winnerLogo=imgs[imgs.length-1].currentSrc || imgs[imgs.length-1].getAttribute('src') || '';
          if(winnerLogo===logo) winnerLogo='';
        }
      }

      out.push({
        cupId,
        href,
        title:titleMatch[0].replace(/\s+/g,' ').trim(),
        matches:matchesMatch?matchesMatch[1].replace(/\s+/g,' ').trim():'',
        teams:teamsMatch?teamsMatch[1].replace(/\s+/g,' ').trim():'',
        date:dateMatches?dateMatches[1].replace(/\s+/g,' ').trim():'',
        winner:winner||'Ej klar',
        logo,
        winnerLogo
      });

      seen.add(cupId);
    });

    // Newest/highest cup id first.
    out.sort((a,b)=>{
      const an=Number(a.cupId),bn=Number(b.cupId);
      if(Number.isFinite(an)&&Number.isFinite(bn)) return bn-an;
      return String(b.cupId).localeCompare(String(a.cupId));
    });

    return out;
  }


  function secOverviewArray(v){
    if(Array.isArray(v)) return v;
    if(v && typeof v==='object') return Object.values(v).flatMap(x=>Array.isArray(x)?x:[]);
    return [];
  }

  function secOverviewCupRichness(cup){
    const matches=Array.isArray(cup?.matches)?cup.matches.length:0;
    const players=secOverviewArray(cup?.playerStats).length;
    const goalies=secOverviewArray(cup?.goalieStats).length;
    return matches*1000+players*10+goalies;
  }

  function secOverviewMergeRawCups(rawCups){
    const map=new Map();
    (rawCups||[]).forEach(cup=>{
      if(!cup || typeof cup!=='object') return;
      const code=String(cup.code||cup.name||cup.id||'').replace(/\s+/g,' ').trim();
      if(!/^SEC\s+/i.test(code) || /\bplay[ -]?in\b/i.test(code)) return;
      const key=code.toLowerCase();
      const old=map.get(key);
      if(!old){ map.set(key,cup); return; }
      const richer=secOverviewCupRichness(cup)>secOverviewCupRichness(old)?cup:old;
      const other=richer===cup?old:cup;
      map.set(key,{...other,...richer,
        placements:{...(other.placements||{}),...(richer.placements||{})},
        settings:{...(other.settings||{}),...(richer.settings||{})}
      });
    });
    return [...map.values()];
  }

  function secOverviewTeams(cup){
    const teams=new Set();
    const add=v=>{const x=String(v||'').trim();if(x)teams.add(x.toLowerCase());};
    (Array.isArray(cup?.matches)?cup.matches:[]).forEach(m=>{add(m?.homeTeam);add(m?.awayTeam);add(m?.home);add(m?.away);});
    secOverviewArray(cup?.playerStats).forEach(r=>add(r?.team));
    secOverviewArray(cup?.goalieStats).forEach(r=>add(r?.team));
    (Array.isArray(cup?.teams)?cup.teams:[]).forEach(t=>add(t?.name||t?.team||t));
    return teams.size;
  }

  function secOverviewDateMeta(cup){
    const stamps=[];
    const add=v=>{
      if(!v)return;
      const t=Date.parse(String(v));
      if(Number.isFinite(t))stamps.push(t);
    };
    add(cup?.startDate);add(cup?.endDate);add(cup?.date);
    (Array.isArray(cup?.matches)?cup.matches:[]).forEach(m=>add(m?.date));
    if(!stamps.length)return {text:'',sort:0};
    const min=Math.min(...stamps),max=Math.max(...stamps);
    const fmt=t=>{
      try{return new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(t)).replace(/\.$/,'');}
      catch(_){return '';}
    };
    const a=fmt(min),b=fmt(max);
    return {text:a&&(b&&b!==a)?`${a} – ${b}`:(a||b),sort:max};
  }

  function secOverviewDirectCard(cup){
    const code=String(cup?.code||cup?.name||cup?.id||'SEC').replace(/\s+/g,' ').trim();
    const id=String(cup?.id||code.replace(/^SEC\s+/i,'').trim()).trim();
    const matches=Array.isArray(cup?.matches)?cup.matches.length:0;
    const teams=secOverviewTeams(cup);
    const placements=cup?.placements||{};
    const winner=String(placements.first||placements['1']||cup?.winner||cup?.champion||'Ej klar').trim()||'Ej klar';
    const dm=secOverviewDateMeta(cup);
    let logo='';
    try{logo=new URL(/\bsommar\b/i.test(code)?'./assets/sommarcuplogga.png':'./SECLOGGA.png',location.href).href;}catch(_){}
    return {
      cupId:id,
      href:`#/cups/${encodeURIComponent(id)}`,
      title:code,
      matches:matches?String(matches):'',
      teams:teams?String(teams):'',
      date:dm.text,
      winner,
      logo,
      winnerLogo:'',
      _sort:dm.sort
    };
  }

  function secOverviewBuiltInCards(){
    // Compact offline-safe SEC index. Live SEC data may replace these cards when available.
    return [{"cupId":"sommar-25","href":"#/cups/sommar-25","title":"SEC Sommar 25","matches":"135","teams":"13","date":"27 juli 2025 – 3 sep 2025","winner":"Lag AntonLxnd","logo":"https://sweehockey-svg.github.io/assets/sommarcuplogga.png","winnerLogo":"","_sort":1025.0},{"cupId":"sommar-24","href":"#/cups/sommar-24","title":"SEC Sommar 24","matches":"","teams":"","date":"","winner":"Lag Svamp GG","logo":"https://sweehockey-svg.github.io/assets/sommarcuplogga.png","winnerLogo":"","_sort":1024.0},{"cupId":"sommar-23","href":"#/cups/sommar-23","title":"SEC Sommar 23","matches":"86","teams":"10","date":"19 juni 2023 – 24 juli 2023","winner":"Lag benjamint","logo":"https://sweehockey-svg.github.io/assets/sommarcuplogga.png","winnerLogo":"","_sort":1023.0},{"cupId":"sommar-22","href":"#/cups/sommar-22","title":"SEC Sommar 22","matches":"87","teams":"9","date":"12 maj 2022 – 7 juli 2022","winner":"Lag Snus","logo":"https://sweehockey-svg.github.io/assets/sommarcuplogga.png","winnerLogo":"","_sort":1022.0},{"cupId":"sommar-21","href":"#/cups/sommar-21","title":"SEC Sommar 21","matches":"91","teams":"13","date":"27 juni 2021 – 3 aug 2021","winner":"Lag Henning92-","logo":"https://sweehockey-svg.github.io/assets/sommarcuplogga.png","winnerLogo":"","_sort":1021.0},{"cupId":"21","href":"#/cups/21","title":"SEC 21","matches":"","teams":"","date":"","winner":"—","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":21.0},{"cupId":"20-div-2","href":"#/cups/20-div-2","title":"SEC 20 DIV 2","matches":"","teams":"","date":"","winner":"SCRUBS","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":20.2},{"cupId":"20-div-1","href":"#/cups/20-div-1","title":"SEC 20 DIV 1","matches":"","teams":"","date":"","winner":"NEXUS ESPORT","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":20.1},{"cupId":"19.5","href":"#/cups/19.5","title":"SEC 19.5","matches":"42","teams":"6","date":"8 okt 2025 – 26 okt 2025","winner":"vNexs Vipers","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":19.5},{"cupId":"19","href":"#/cups/19","title":"SEC 19","matches":"","teams":"","date":"","winner":"SSK Prospects","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":19.0},{"cupId":"18","href":"#/cups/18","title":"SEC 18","matches":"","teams":"","date":"","winner":"Västerås IK","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":18.0},{"cupId":"17-challenger","href":"#/cups/17-challenger","title":"SEC 17 challenger","matches":"22","teams":"4","date":"2 feb 2025 – 25 feb 2025","winner":"Flädie Faxes","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":17.05},{"cupId":"17","href":"#/cups/17","title":"SEC 17","matches":"","teams":"","date":"","winner":"Illusion","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":17.0},{"cupId":"16","href":"#/cups/16","title":"SEC 16","matches":"","teams":"","date":"","winner":"VBO STARS","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":16.0},{"cupId":"15","href":"#/cups/15","title":"SEC 15","matches":"","teams":"","date":"","winner":"TROJANS","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":15.0},{"cupId":"14","href":"#/cups/14","title":"SEC 14","matches":"","teams":"","date":"","winner":"Modo Hockey","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":14.0},{"cupId":"13","href":"#/cups/13","title":"SEC 13","matches":"101","teams":"9","date":"14 aug 2023 – 25 sep 2023","winner":"LAMPA","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":13.0},{"cupId":"12","href":"#/cups/12","title":"SEC 12","matches":"111","teams":"14","date":"12 feb 2023 – 21 mars 2023","winner":"Purification","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":12.0},{"cupId":"11","href":"#/cups/11","title":"SEC 11","matches":"29","teams":"7","date":"27 okt 2022 – 14 nov 2022","winner":"Luleå Hockey Region","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":11.0},{"cupId":"10","href":"#/cups/10","title":"SEC 10","matches":"52","teams":"10","date":"18 sep 2022 – 11 okt 2022","winner":"Northern Dust","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":10.0},{"cupId":"9","href":"#/cups/9","title":"SEC 9","matches":"68","teams":"8","date":"10 juli 2022 – 18 aug 2022","winner":"Purification","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":9.0},{"cupId":"8","href":"#/cups/8","title":"SEC 8","matches":"128","teams":"24","date":"6 mars 2022 – 31 mars 2022","winner":"Free From Rodents","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":8.0},{"cupId":"7","href":"#/cups/7","title":"SEC 7","matches":"45","teams":"11","date":"31 okt 2021 – 21 nov 2021","winner":"Mora IK","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":7.0},{"cupId":"6","href":"#/cups/6","title":"SEC 6","matches":"98","teams":"17","date":"5 sep 2021 – 6 okt 2021","winner":"Rimon o Pumba","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":6.0},{"cupId":"5","href":"#/cups/5","title":"SEC 5","matches":"253","teams":"26","date":"15 feb 2021 – 15 apr 2021","winner":"Nordic Nosebleed","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":5.0},{"cupId":"4","href":"#/cups/4","title":"SEC 4","matches":"97","teams":"16","date":"2 jan 2021 – 7 feb 2021","winner":"Verket","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":4.0},{"cupId":"3","href":"#/cups/3","title":"SEC 3","matches":"146","teams":"17","date":"17 sep 2020 – 12 okt 2020","winner":"Almtuna ESPORT","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":3.0},{"cupId":"2","href":"#/cups/2","title":"SEC 2","matches":"106","teams":"18","date":"19 juli 2020 – 19 aug 2020","winner":"Full send esport","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":2.0},{"cupId":"1","href":"#/cups/1","title":"SEC 1","matches":"123","teams":"15","date":"7 juni 2020 – 4 juli 2020","winner":"Djurgården","logo":"https://sweehockey-svg.github.io/assets/SECLOGGA.png","winnerLogo":"","_sort":1.0}];
  }

  async function secLoadOverviewCardsDirect(){
    if(window.__SEH_SEC_DIRECT_CARDS__)return window.__SEH_SEC_DIRECT_CARDS__;
    if(window.__SEH_SEC_DIRECT_PROMISE__)return window.__SEH_SEC_DIRECT_PROMISE__;
    window.__SEH_SEC_DIRECT_PROMISE__=(async()=>{
      const configured=window.SEC_CONFIG?.dataUrls;
      const urls=(Array.isArray(configured)&&configured.length?configured:[
        './database-cups-1-13.json','./database-cups-14-20.json','./database-cups.json'
      ]).filter(Boolean);
      const payloads=await Promise.all(urls.map(async url=>{
        try{
          const response=await fetch(new URL(url,location.href).href,{cache:'no-store'});
          if(!response.ok)return [];
          const data=await response.json();
          return Array.isArray(data)?data:(data?.cups||data?.data||[]);
        }catch(_){return [];}
      }));
      const cards=secOverviewMergeRawCups(payloads.flat()).map(secOverviewDirectCard).filter(c=>c.cupId);
      cards.sort((a,b)=>(b._sort||0)-(a._sort||0)||String(b.cupId).localeCompare(String(a.cupId),undefined,{numeric:true}));
      window.__SEH_SEC_DIRECT_CARDS__=cards;
      return cards;
    })().finally(()=>{window.__SEH_SEC_DIRECT_PROMISE__=null;});
    return window.__SEH_SEC_DIRECT_PROMISE__;
  }

  function secRenderOverview(root,cards){
    const signature=JSON.stringify(cards.map(c=>[
      c.cupId,c.title,c.matches,c.teams,c.date,c.winner,c.logo,c.winnerLogo
    ]));

    if(root.dataset.signature===signature) return;
    root.dataset.signature=signature;

    const cardsEl=root.querySelector('#seh-sec-app-cards');
    const countEl=root.querySelector('.seh-sec-index-head .count');

    if(countEl) countEl.textContent=cards.length ? `${cards.length} cuper` : '';

    if(!cards.length){
      cardsEl.innerHTML=`
        <div class="seh-sec-index-skeleton">
          <div class="seh-sec-index-sk"></div>
          <div class="seh-sec-index-sk"></div>
        </div>`;
      return;
    }

    cardsEl.innerHTML='';

    cards.forEach(c=>{
      const a=document.createElement('a');
      a.className='seh-sec-app-card';
      a.href=c.href;

      const safeTitle=htmlEscape(c.title);
      const safeDate=htmlEscape(c.date);
      const safeWinner=htmlEscape(c.winner);
      const safeMatches=htmlEscape(c.matches);
      const safeTeams=htmlEscape(c.teams);

      a.innerHTML=`
        <div class="seh-sec-app-title">${safeTitle}</div>
        ${c.logo
          ? `<img class="seh-sec-app-logo" alt="" src="${htmlEscape(c.logo)}">`
          : `<div class="seh-sec-app-logo-fallback">SEC</div>`}
        <div class="seh-sec-app-metrics">
          ${safeMatches?`<span class="seh-sec-app-metric"><strong>${safeMatches}</strong><span>matcher</span></span>`:''}
          ${safeTeams?`<span class="seh-sec-app-metric"><strong>${safeTeams}</strong><span>lag</span></span>`:''}
        </div>
        ${safeDate?`<div class="seh-sec-app-date">${safeDate}</div>`:''}
        <div class="seh-sec-app-winner">
          ${c.winnerLogo?`<img alt="" src="${htmlEscape(c.winnerLogo)}">`:''}
          <div class="meta"><small>Vinnare</small><strong>${safeWinner}</strong></div>
        </div>
      `;

      a.onclick=e=>{
        e.preventDefault();
        const target=c.href;
        document.body?.classList.remove('seh-sec-app-overview');
        root.remove();
        if(window.SehNative && typeof window.SehNative.prepareNavigation==='function'){
          try{ window.SehNative.prepareNavigation(); }catch(_){}
        }
        window.location.href=target;
      };

      cardsEl.appendChild(a);
    });
  }

  function ensureSecOverviewApp(){
    let root=document.getElementById('seh-sec-app-index');

    if(!isSec() || isSecCup()){
      document.body?.classList.remove('seh-sec-app-overlay-open');
      document.body?.classList.remove('seh-sec-app-overview');
      root?.remove();
      return;
    }

    document.body?.classList.add('seh-sec-app-overview');
    document.body?.classList.remove('seh-loading');

    if(!root){
      root=document.createElement('section');
      root.id='seh-sec-app-index';
      root.innerHTML=`
        <div class="seh-sec-index-head">
          <div>
            <span class="eyebrow">SVENSK eHOCKEY</span>
            <h1>SEC</h1>
          </div>
          <span class="count"></span>
        </div>
        <div id="seh-sec-app-cards">
          <div class="seh-sec-index-skeleton">
            <div class="seh-sec-index-sk"></div>
            <div class="seh-sec-index-sk"></div>
          </div>
        </div>`;

      document.body.appendChild(root);
    }

    const domCards=secExtractOverviewCards();
    const directCards=window.__SEH_SEC_DIRECT_CARDS__||[];
    const builtInCards=secOverviewBuiltInCards();
    // SEC start must never remain on a permanent skeleton just because the
    // remote SEC SPA or JSON files fail to initialize in the Android WebView.
    const cards=domCards.length?domCards:(directCards.length?directCards:builtInCards);
    secRenderOverview(root,cards);

    if(!domCards.length && !directCards.length && !window.__SEH_SEC_DIRECT_PROMISE__){
      secLoadOverviewCardsDirect().then(fallback=>{
        if(!isSec()||isSecCup()||!root?.isConnected)return;
        if(fallback?.length)secRenderOverview(root,fallback);
      }).catch(()=>{});
    }

    clearTimeout(window.__SEH_SEC_INDEX_RECHECK__);
    if(!domCards.length && !directCards.length){
      const tries=Number(window.__SEH_SEC_INDEX_RECHECK_TRIES__||0);
      if(tries<12){
        window.__SEH_SEC_INDEX_RECHECK_TRIES__=tries+1;
        window.__SEH_SEC_INDEX_RECHECK__=setTimeout(ensureSecOverviewApp,300);
      }
    }else{
      window.__SEH_SEC_INDEX_RECHECK_TRIES__=0;
    }
  }

  function setContentModeClasses(){
    if(!document.body)return;
    const r=route();
    const known=['home','news','players','teams','records','shop','sec','ecl','ecl-season','article','player','team'];
    document.body.classList.add('seh-content-mode');
    known.forEach(k=>document.body.classList.remove('seh-route-'+k));
    document.body.classList.remove('seh-top-level','seh-detail-page');
    document.body.classList.add('seh-route-'+r.kind);
    document.body.classList.toggle('seh-top-level',isTopLevelRoute());
    document.body.classList.toggle('seh-detail-page',['article','player','team'].includes(r.kind));
  }

  function refreshTop(){
    const r=route();const title=document.getElementById('seh-native-title');if(title)title.textContent=document.getElementById('seh-app-directory')?.classList.contains('show')?'Spelare & Lag':document.getElementById('seh-app-competitions')?.classList.contains('show')?'Tävlingar':document.getElementById('seh-app-more')?.classList.contains('show')?'Mer':document.getElementById('seh-app-favorites')?.classList.contains('show')?'Favoriter':r.title;
    const back=document.getElementById('seh-back');if(back){const overlayOpen=document.getElementById('seh-app-directory')?.classList.contains('show')||document.getElementById('seh-app-competitions')?.classList.contains('show')||document.getElementById('seh-app-more')?.classList.contains('show')||document.getElementById('seh-app-favorites')?.classList.contains('show');back.style.visibility=(!overlayOpen&&isTopLevelRoute())?'hidden':'visible';}
    const fav=document.getElementById('seh-fav'),share=document.getElementById('seh-share');if(fav){fav.style.display=eligibleFavorite()?'grid':'none';fav.classList.toggle('is-on',isFav());}if(share)share.style.display=eligibleFavorite()?'grid':'none';refreshMyProfileButton();
  }
  function refreshBottom(){
    const r=route();
    const competitionsOpen=document.getElementById('seh-app-competitions')?.classList.contains('show');
    const moreOpen=document.getElementById('seh-app-more')?.classList.contains('show')||document.getElementById('seh-app-favorites')?.classList.contains('show');
    document.querySelectorAll('#seh-native-bottom [data-tab]').forEach(a=>a.classList.toggle('on',competitionsOpen?a.dataset.tab==='competitions':moreOpen?a.dataset.tab==='home':a.dataset.tab===(r.tab==='more'?'home':r.tab)));
  }
  function refreshHome(){const home=document.getElementById('seh-app-home');if(home)home.classList.toggle('show',route().kind==='home'&&!document.getElementById('seh-app-directory')?.classList.contains('show')&&!document.getElementById('seh-app-competitions')?.classList.contains('show')&&!document.getElementById('seh-app-more')?.classList.contains('show')&&!document.getElementById('seh-app-favorites')?.classList.contains('show'));updateFavCount();renderNotifyToggle();}
  function updateOnline(){document.getElementById('seh-offline-banner')?.classList.toggle('show',navigator.onLine===false);}
  function visible(el){if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';}
  function handleConsent(){
    const buttons=[...document.querySelectorAll('button,a,[role="button"]')];const allow=buttons.find(el=>visible(el)&&/tillåt statistik/i.test((el.textContent||'').trim()));const necessary=buttons.find(el=>visible(el)&&/endast nödvändiga/i.test((el.textContent||'').trim()));const open=!!(allow||necessary);document.body.classList.toggle('seh-consent-open',open);if(!open)return;
    document.body.classList.remove('seh-loading');let panel=(allow&&necessary)?(()=>{const seen=new Set();for(let n=allow;n&&n!==document.body;n=n.parentElement)seen.add(n);for(let n=necessary;n&&n!==document.body;n=n.parentElement)if(seen.has(n))return n;return null;})():(allow||necessary)?.parentElement;if(panel){panel.style.setProperty('z-index','2147483646','important');panel.style.setProperty('max-height','calc(100vh - 74px)','important');panel.style.setProperty('overflow-y','auto','important');panel.style.setProperty('pointer-events','auto','important');}[allow,necessary].forEach(b=>{if(b){b.style.setProperty('pointer-events','auto','important');b.style.setProperty('position','relative','important');b.style.setProperty('z-index','2147483647','important');}});
  }
  function installPullToRefresh(){
    if(window.__SEH_PULL__)return;
    window.__SEH_PULL__=true;

    let startY=0,startX=0,dist=0,pulling=false,startTime=0,pullScroller=null;
    // V750: refresh ska vara ett medvetet långt drag, inte triggas av vanlig scroll.
    const THRESHOLD=190;
    const SHOW_AFTER=85;
    const TAKEOVER_AFTER=135;
    const MIN_TIME=480;
    const ind=()=>document.getElementById('seh-pull-indicator');

    function visibleScrollContainer(){
      const overlays=['seh-app-directory','seh-app-favorites'];
      for(const id of overlays){
        const el=document.getElementById(id);
        if(el?.classList.contains('show'))return el;
      }
      const directory=document.getElementById('seh-native-directory-root');
      if(directory?.isConnected && visible(directory))return directory;
      const player=document.querySelector('body > .seh-player-native-root .seh-player-native-content');
      if(player?.isConnected && visible(player))return player;
      const sec=document.getElementById('seh-sec-app-index');
      if(sec?.isConnected && visible(sec))return sec;
      return null;
    }

    function scrollTopOf(el){
      if(el)return Number(el.scrollTop)||0;
      return window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0;
    }

    function atPullTop(){
      const current=visibleScrollContainer();
      if(pullScroller && current!==pullScroller)return false;
      return scrollTopOf(current)<=1;
    }

    function resetIndicator(){
      const i=ind();
      if(i){i.classList.remove('show');i.style.transform='translate(-50%,-70px)';i.textContent='Dra längre för att uppdatera';}
    }

    document.addEventListener('touchstart',e=>{
      const target=e.target;
      if(target && target.closest && target.closest('input,select,textarea,button,a,[role="button"]')) return;
      if(document.body.classList.contains('seh-consent-open')) return;

      pullScroller=visibleScrollContainer();
      if(scrollTopOf(pullScroller)>1)return;

      const t=e.touches[0];
      startY=t.clientY;
      startX=t.clientX;
      dist=0;
      startTime=Date.now();
      pulling=true;
    },{passive:true});

    document.addEventListener('touchmove',e=>{
      if(!pulling)return;
      const t=e.touches[0];
      const dy=t.clientY-startY;
      const dx=Math.abs(t.clientX-startX);

      // Avbryt direkt vid uppåt-/sidledsgest eller om den synliga scrollvyn
      // inte längre står längst upp.
      if(dy<0 || dx>Math.max(30,dy*.58) || !atPullTop()){
        pulling=false;
        resetIndicator();
        return;
      }

      dist=Math.max(0,dy);
      if(dist<SHOW_AFTER)return;

      const i=ind();
      if(i){
        i.classList.add('show');
        i.style.transform=`translate(-50%,${Math.min(18,(dist-SHOW_AFTER)/8)-4}px)`;
        i.textContent=dist>=THRESHOLD?'Släpp för att uppdatera':'Dra längre för att uppdatera';
      }

      // Normal nedåtscroll får fortsätta länge. Först vid ett tydligt refresh-drag
      // tar appen över gesten.
      if(dist>TAKEOVER_AFTER)e.preventDefault();
    },{passive:false});

    document.addEventListener('touchend',()=>{
      if(!pulling){pullScroller=null;return;}

      const elapsed=Date.now()-startTime;
      resetIndicator();

      if(dist>=THRESHOLD && elapsed>=MIN_TIME && atPullTop()){
        showLoading();
        setTimeout(()=>location.reload(),160);
      }

      pulling=false;
      dist=0;
      startTime=0;
      pullScroller=null;
    },{passive:true});

    document.addEventListener('touchcancel',()=>{
      pulling=false;dist=0;startTime=0;pullScroller=null;resetIndicator();
    },{passive:true});
  }
  // V756: ECL season tabs are hash routes inside the same website SPA.
  // Keep those switches inside the current WebView document instead of doing a
  // full window.location navigation, which used to flash the season hero first.
  let __sehEclSoftSeasonNav=null;
  function sehEclSeasonRouteInfo(value){
    try{
      const u=new URL(String(value||''),location.href);
      const h=String(u.hash||'');
      const m=h.match(/^#\/sasong\/([^?/#]+)(?:\?([^#]*))?$/i);
      if(!m)return null;
      const q=new URLSearchParams(m[2]||'');
      return {
        seasonId:decodeURIComponent(m[1]).toLowerCase(),
        section:String(q.get('section')||'overview').toLowerCase(),
        hash:h
      };
    }catch(_){return null;}
  }
  function sehNavigateEclSeasonSectionSoft(target){
    if(route().kind!=='ecl-season')return false;
    const from=sehEclSeasonRouteInfo(location.href);
    const to=sehEclSeasonRouteInfo(target);
    if(!from||!to||from.seasonId!==to.seasonId||from.hash===to.hash)return false;

    __sehEclSoftSeasonNav={
      seasonId:to.seasonId,
      section:to.section,
      started:Date.now()
    };
    document.body?.classList.add('seh-ecl-soft-switch');
    document.body?.classList.remove('seh-loading','seh-route-transitioning');
    document.getElementById('seh-route-transition-stage')?.replaceChildren();

    // Assign only the hash. The website SPA receives its normal hashchange and
    // loads the requested Supabase panel, while Android stays in one document.
    location.hash=to.hash.slice(1);

    clearTimeout(window.__SEH_ECL_SOFT_NAV_TIMER__);
    window.__SEH_ECL_SOFT_NAV_TIMER__=setTimeout(()=>{
      document.body?.classList.remove('seh-ecl-soft-switch');
      __sehEclSoftSeasonNav=null;
    },1400);
    return true;
  }

  function interceptLinks(){
    if(window.__SEH_LINK_INTERCEPT__)return;window.__SEH_LINK_INTERCEPT__=true;document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;/* V744: Spelare/Lag-overlayns kort har egen in-app-navigation. Låt inte den globala capture-handlern köra före kortets handler. */if(a.hasAttribute('data-native-directory-target'))return;let u;try{u=new URL(a.href,location.href);}catch(_){return;}if(u.protocol!=='http:'&&u.protocol!=='https:')return;const oldNetlify=u.hostname==='stellular-nougat-2db764.netlify.app';const productionHost=u.hostname==='www.svenskehockey.se'||u.hostname==='svenskehockey.se';if(productionHost||oldNetlify){e.preventDefault();const rootBase=ROOT.replace(/\/$/,'');let path=u.pathname||'/';if(productionHost&&sehNavigateEclSeasonSectionSoft(u.href)){e.stopImmediatePropagation();return;}if(productionHost&&(path==='/SEC'||path.startsWith('/SEC/'))){nativeNavigate(SEC_ROOT+u.search+u.hash);return;}if(productionHost&&(path==='/v2'||path.startsWith('/v2/'))){path=path.replace(/^\/v2(?=\/|$)/,'')||'/';nativeNavigate(rootBase+(path==='/'?'/':path)+u.search+u.hash);return;}nativeNavigate(rootBase+(path==='/'?'/':path)+u.search+u.hash);return;}e.preventDefault();openExternal(u.href);},true);
  }
  let __sehContentObserver=null,__sehObservedMain=null,__sehAdaptTimer=null,__sehAdapting=false;
  function scheduleAdaptiveContent(delay=180){
    if(__sehAdaptTimer)clearTimeout(__sehAdaptTimer);
    __sehAdaptTimer=setTimeout(()=>{
      __sehAdaptTimer=null;
      if(__sehAdapting)return;
      __sehAdapting=true;
      try{
        adaptAppContent();
        ensureSecSubnav();
        sehFinishRouteVisualTransition(false);
        sehCaptureRouteVisual();
      }
      finally{setTimeout(()=>{__sehAdapting=false;},60);}
    },delay);
  }
  function installAdaptiveObserver(){
    const main=document.querySelector('main');
    if(!main || main===__sehObservedMain)return;
    if(__sehContentObserver)__sehContentObserver.disconnect();
    __sehObservedMain=main;
    __sehContentObserver=new MutationObserver(muts=>{
      if(route().kind==='player'){
        const native=document.querySelector('body > .seh-player-native-root');
        const routeKey=location.pathname+location.hash;
        if(
          native?.isConnected &&
          native.dataset.routeKey===routeKey &&
          native.dataset.provisional!=='1' &&
          native.dataset.sourceSparse!=='1'
        ){
          // A fully hydrated native profile owns the screen. Sparse mobile
          // fallbacks must keep observing the hidden source until it hydrates.
          return;
        }
      }

      const relevant=muts.some(m=>{
        if(m.type!=='childList' || (!m.addedNodes.length && !m.removedNodes.length)) return false;

        // Ignore only mutations produced inside our own injected compact cards / app shell.
        const target=m.target?.nodeType===1 ? m.target : m.target?.parentElement;
        if(target?.closest?.('.seh-compact-player,.seh-compact-team,.seh-zero-player-shell,.seh-zero-player-grid,.seh-zero-player-card,.seh-zero-player-pager,.seh-zero-player-source,.seh-native-player-directory-page,.seh-native-player-directory-frame,#seh-native-directory-root,.seh-app-player-pagination,.seh-native-player-source-grid,.seh-native-player-pagination-source,.seh-player-history-cards,.seh-player-history-card,.seh-team-native-shell,#seh-native-top,#seh-native-bottom,#seh-sec-subnav,#seh-app-directory,#seh-app-favorites')) return false;

        return true;
      });

      if(!relevant)return;

      if(isSec() && !isSecCup()){
        clearTimeout(window.__SEH_SEC_INDEX_MUTATION__);
        window.__SEH_SEC_INDEX_MUTATION__=setTimeout(ensureSecOverviewApp,70);
      }

      if(isSec() && !isSecCup()){
        clearTimeout(window.__SEH_SEC_FAST_TIMER__);
        window.__SEH_SEC_FAST_TIMER__=setTimeout(ensureSecOverviewApp,40);
      }

      // Even when a mutation lands during an adaptation pass, run one debounced
      // follow-up. This is important for async-loaded Lag results.
      scheduleAdaptiveContent(route().kind==='player' ? (__sehAdapting ? 120 : 25) : (__sehAdapting ? 320 : 140));
    });
    __sehContentObserver.observe(main,{childList:true,subtree:true});
  }

  function sehPrimeStoredRouteVisual(){
    const kind=route().kind;
    if(!['players','teams'].includes(kind) || sehPendingVisualRoute)return false;
    const cached=sehRouteVisualCache.get(kind)||sehRouteVisualLoadStored(kind);
    if(!cached?.html)return false;
    const stage=sehEnsureRouteTransitionStage();
    stage.innerHTML=`<div class="seh-route-cache-scroll"><main class="${htmlEscape(cached.className||'')}">${cached.html}</main></div>`;
    const scroller=stage.firstElementChild;
    const cachedMain=scroller?.querySelector('main');
    if(cachedMain && cached.scrollY>0)cachedMain.style.transform=`translateY(-${Math.min(cached.scrollY,1200)}px)`;
    sehPendingVisualRoute=kind;
    sehPendingVisualUsedCache=true;
    sehApplyProvisionalRouteClass(kind);
    document.body.classList.add('seh-route-transitioning');
    document.body.classList.remove('seh-loading');
    clearTimeout(sehPendingVisualTimer);
    sehPendingVisualTimer=setTimeout(()=>{
      if(sehPendingVisualRoute!==kind)return;
      if(!sehRouteVisualReady(kind))document.body.classList.add('seh-loading');
      document.body.classList.remove('seh-route-transitioning');
      stage.replaceChildren();
      sehPendingVisualRoute='';
      sehPendingVisualUsedCache=false;
    },4200);
    return true;
  }


  /* V760 — account/auth + Free Agents + shared ECL27 source. */
  const SEH_V760_STYLE=`
    #seh-v760-layer{position:fixed;z-index:2147483550;inset:0;background:#02030a;color:#f4f1e9;font-family:Inter,Arial,sans-serif;display:none;overflow:auto;padding:calc(var(--seh-native-top,72px) + 10px) 14px calc(var(--seh-native-bottom,72px) + 22px);box-sizing:border-box}
    #seh-v760-layer.show{display:block}
    #seh-app-free-agents{position:fixed;z-index:2147482750;top:var(--seh-native-top);bottom:var(--seh-native-bottom);left:0;right:0;overflow-y:auto;overscroll-behavior-y:contain;background:#02030a;color:#f4f1e9;padding:16px 14px;font-family:Inter,Arial,sans-serif;box-sizing:border-box}
    #seh-app-free-agents *{box-sizing:border-box}
    #seh-app-free-agents summary{cursor:pointer;padding:14px 0;font-weight:800;color:#d6b15f}
    #seh-v760-fa-list{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
    .seh-fa-card{display:grid;grid-template-columns:34% minmax(0,1fr);min-height:270px;border:1px solid #b89a37;border-radius:16px;overflow:hidden;background:linear-gradient(115deg,#071827,#03090f 70%);color:#f4f1e9}
    .seh-fa-portrait{position:relative;background:linear-gradient(#0c3655,#061727);overflow:hidden}.seh-fa-portrait svg,.seh-fa-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}.seh-fa-portrait img{opacity:0}.seh-fa-portrait.has-photo img{opacity:1}.seh-fa-portrait.has-photo svg{visibility:hidden}.seh-fa-portrait>span{position:absolute;bottom:12px;left:8px;border-left:3px solid #ffd000;padding:8px 5px;background:#02070ddd;color:#65e7e1;font:900 8px/1.2 Inter,Arial,sans-serif}
    .seh-fa-content{min-width:0;padding:12px 10px;display:flex;flex-direction:column;gap:8px;overflow-wrap:anywhere}.seh-fa-topline{display:flex;align-items:center;gap:7px;color:#ffd000;font-size:11px;font-weight:900}.seh-fa-rank{border:1px solid #ffd000;border-radius:8px;padding:5px;font-size:12px}.seh-fa-content h2{font-size:clamp(18px,5vw,25px);line-height:1.1;margin:0;color:#fff}.seh-fa-tags{display:flex;flex-wrap:wrap;gap:4px}.seh-fa-tags b{font:800 8px/1.25 Inter,Arial,sans-serif;border:1px solid #395966;border-radius:999px;padding:4px 6px;color:#79e7e3}.seh-fa-tags b:first-child{border-color:#b2932d;color:#ffda60}.seh-fa-facts{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);border:1px solid #203b49;border-radius:8px;overflow:hidden}.seh-fa-facts>div{padding:7px;min-width:0}.seh-fa-facts>div+div{border-left:1px solid #203b49}.seh-fa-content small{display:block;color:#65e7e1;font-size:7px;font-weight:900;letter-spacing:.04em;margin-bottom:3px}.seh-fa-facts strong{display:block;font-size:10px;line-height:1.35}.seh-fa-career{border:1px solid #203b49;border-radius:7px;padding:6px;font-size:10px;font-weight:800}.seh-fa-detail{font-size:10px;line-height:1.4;margin:0}.seh-fa-footer{margin-top:auto;border-top:1px solid #203b49;padding-top:8px;display:grid;gap:6px;font-size:9px;color:#94a4b4}.seh-fa-open{border:0;background:transparent;color:#ffd768;padding:5px 0;text-align:left;font:850 10px/1.4 Inter,Arial,sans-serif}.seh-fa-open:focus-visible{outline:2px solid #ffd000;outline-offset:2px}
    #seh-v760-layer *{box-sizing:border-box}
    .seh-v760-shell{width:min(100%,760px);margin:0 auto}
    .seh-v760-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 16px}
    .seh-v760-head small,.seh-v760-kicker{display:block;color:#d6b15f;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .seh-v760-head h1{margin:4px 0 0;font-size:27px;line-height:1.04}
    .seh-v760-close,.seh-v760-back{width:40px;height:40px;border:1px solid #ffffff1f;border-radius:12px;background:#0b1019;color:#fff;display:grid;place-items:center;font-size:20px}
    .seh-v760-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .seh-v760-btn{min-height:42px;border:1px solid #ffffff1d;border-radius:11px;background:#101621;color:#f7f3e9;padding:10px 13px;font:850 11px/1.1 Inter,Arial,sans-serif}
    .seh-v760-btn.gold{background:#d6b15f;border-color:#d6b15f;color:#06080e}.seh-v760-btn.danger{border-color:#ff7c7c55;color:#ffb2b2}.seh-v760-btn:disabled{opacity:.5}
    .seh-v760-privacy-list{margin:10px 0 0;padding-left:18px;color:#aeb4bd;font-size:12px;line-height:1.55}.seh-v760-privacy-list li+li{margin-top:6px}
    .seh-v760-danger-zone{border-color:#ff7c7c35;background:linear-gradient(145deg,#160c13,#070810)}.seh-v760-danger-zone h2{color:#ffb2b2}
    .seh-v760-confirm{margin-top:12px}.seh-v760-confirm input{text-transform:none}
    .seh-v760-card{border:1px solid #ffffff16;border-radius:17px;background:linear-gradient(145deg,#0b111c,#060811);padding:14px;margin:0 0 11px}
    .seh-v760-card h2,.seh-v760-card h3{margin:4px 0 7px}.seh-v760-card p{margin:4px 0;color:#a2a8b2;font-size:12px;line-height:1.45}
    .seh-v760-status{min-height:18px;margin:9px 0;color:#9fa6b1;font-size:11px;line-height:1.4}.seh-v760-status.error{color:#ff9999}.seh-v760-status.success{color:#84dfad}
    .seh-v760-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.seh-v760-row>div{min-width:0}
    .seh-v760-avatar{width:62px;height:62px;border-radius:15px;object-fit:cover;object-position:center top;background:#0b1730;flex:0 0 62px}
    .seh-v760-profile{display:grid;grid-template-columns:62px minmax(0,1fr);gap:12px;align-items:center}.seh-v760-profile strong{font-size:18px}.seh-v760-profile span{display:block;margin-top:4px;color:#9aa2ae;font-size:11px}
    .seh-v760-image-upload{border:1px solid #ffffff16;border-radius:14px;background:#050913;padding:12px;display:grid;gap:9px}.seh-v760-image-upload strong{font-size:13px}.seh-v760-image-upload p{margin:0;color:#9fa6b1;font-size:10px;line-height:1.45}.seh-v760-image-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.seh-v760-image-name{color:#c5cad2;font-size:10px;overflow-wrap:anywhere}.seh-v760-image-preview{width:96px;height:96px;border-radius:13px;object-fit:cover;object-position:center top;background:#0b1730;border:1px solid #ffffff18}.seh-v760-image-queue[data-state="pending"],.seh-v760-image-queue[data-state="editing"]{color:#f0d58b}.seh-v760-image-queue[data-state="published"]{color:#84dfad}.seh-v760-image-queue[data-state="rejected"]{color:#ff9999}
    .seh-v760-grid{display:grid;gap:10px}.seh-v760-team{width:100%;text-align:left;color:inherit;border:1px solid #ffffff14;border-radius:15px;background:#080d16;padding:13px}.seh-v760-team strong{display:block;font-size:15px}.seh-v760-team span{display:block;color:#979fab;font-size:10px;margin-top:4px}.seh-v760-team b{color:#d6b15f;font-size:10px}
    .seh-v760-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:0 0 12px}.seh-v760-tools input,.seh-v760-tools select,.seh-v760-form input,.seh-v760-form textarea{width:100%;border:1px solid #ffffff1c;border-radius:11px;background:#050913;color:#fff;padding:11px;font:750 12px/1.2 Inter,Arial,sans-serif;outline:none}.seh-v760-tools select{width:auto;min-width:105px}
    .seh-v760-form{display:grid;gap:9px}.seh-v760-form label span{display:block;color:#9da4af;font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;margin:0 0 5px}.seh-v760-form textarea{min-height:78px;resize:vertical}
    .seh-v760-player{width:100%;display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;border:0;border-top:1px solid #ffffff10;background:transparent;color:#fff;padding:9px 0}.seh-v760-player:first-child{border-top:0}.seh-v760-player img{width:46px;height:46px;border-radius:11px;object-fit:cover;object-position:center top;background:#0b1730}.seh-v760-player strong{display:block}.seh-v760-player span{display:block;color:#929aa7;font-size:9px;margin-top:3px}.seh-v760-player b{color:#d6b15f;font-size:10px}
    .seh-v760-movement{padding:9px 0;border-top:1px solid #ffffff0e;font-size:11px;line-height:1.35}.seh-v760-movement:first-child{border-top:0}.seh-v760-movement b{display:inline-block;min-width:26px;color:#d6b15f}.seh-v760-movement.out b,.seh-v760-movement.free_agent b{color:#ff9a9a}.seh-v760-movement time{display:block;color:#777f8c;font-size:9px;margin-top:3px}
    .seh-v760-fa-card{display:grid;grid-template-columns:54px minmax(0,1fr);gap:11px;align-items:start}.seh-v760-fa-card img{width:54px;height:54px;border-radius:13px;object-fit:cover;object-position:center top;background:#0b1730}.seh-v760-fa-card strong{font-size:15px}.seh-v760-fa-card .meta{color:#9aa2ad;font-size:10px;margin-top:4px}.seh-v760-fa-card .msg{font-size:11px;color:#c3c7cd;margin-top:7px}
    #seh-ecl27-entry{border:1px solid #d6b15f4d;border-radius:16px;background:linear-gradient(145deg,#10131b,#080a10);padding:13px;margin:10px 12px 14px;box-sizing:border-box;color:#fff}
    #seh-ecl27-entry button{width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
    #seh-ecl27-entry small{color:#d6b15f;font-size:9px;font-weight:900;letter-spacing:.1em}#seh-ecl27-entry strong{display:block;font-size:17px;margin-top:3px}#seh-ecl27-entry span{color:#949ca8;font-size:10px;display:block;margin-top:4px}#seh-ecl27-entry b{color:#d6b15f;font-size:18px}
  `;

  let sehV760LayerState={kind:'',teamId:0,teams:null,faRows:null,account:null,dashboard:null,session:null};
  let sehV760AuthClient=null;
  let sehV760AuthSubscription=null;
  let sehV760OauthReturnHandled=false;
  const SEH_ANDROID_AUTH_REDIRECT=location.origin + '/';
  const SEH_WEBAPP_OAUTH_RETURN_KEY='seh_webapp_oauth_return';
  function sehV760BrowserAuthRedirect(){
    const target=new URL(location.href);
    target.hash='';
    target.searchParams.delete('webapp');
    target.searchParams.set('webapp','1');
    return target.href;
  }
  const SEH_PRIVACY_URL='https://www.svenskehockey.se/integritet.html';
  const SEH_PRIVACY_EMAIL='svenskehockey@gmail.com';

  function sehV760CompleteOauthReturn(session){
    if(sehV760OauthReturnHandled||!session?.user)return;
    let raw='';try{raw=localStorage.getItem(SEH_WEBAPP_OAUTH_RETURN_KEY)||localStorage.getItem('seh_oauth_return')||'';}catch(_){}
    if(!raw)return;
    let returnHash='#/';
    try{
      const saved=JSON.parse(raw);
      if(saved&&Date.now()-Number(saved.savedAt||0)<=10*60*1000)returnHash=String(saved.hash||'#/');
    }catch(_){returnHash=raw;}
    if(!/^#\//.test(returnHash))returnHash='#/';
    sehV760OauthReturnHandled=true;
    try{localStorage.removeItem(SEH_WEBAPP_OAUTH_RETURN_KEY);localStorage.removeItem('seh_oauth_return');}catch(_){}
    if(location.hash!==returnHash)history.replaceState(null,'',`${location.pathname}${location.search}${returnHash}`);
    setTimeout(()=>sehOnboardingDone()?sehV760OpenAccount():sehOnboardingAfterLogin(),0);
  }

  async function sehV760HandleAuthCallback(callbackUrl){
    try{
      const url=new URL(String(callbackUrl||''));
      if(url.protocol!=='se.svenskehockey.app:'||url.hostname!=='login-callback')throw new Error('Ogiltig inloggningsretur.');
      const params=new URLSearchParams([url.search.slice(1),url.hash.slice(1)].filter(Boolean).join('&'));
      const authError=params.get('error_description')||params.get('error');
      if(authError)throw new Error(authError);
      const client=await sehV760WaitForClient();if(!client)throw new Error('Supabase Auth kunde inte startas.');
      let result;
      const code=params.get('code');
      const accessToken=params.get('access_token'),refreshToken=params.get('refresh_token');
      if(code)result=await client.auth.exchangeCodeForSession(code);
      else if(accessToken&&refreshToken)result=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
      else throw new Error('Discord returnerade ingen giltig session.');
      if(result.error)throw result.error;
      sehV760CompleteOauthReturn(result.data?.session||null);
    }catch(error){
      try{localStorage.removeItem(SEH_WEBAPP_OAUTH_RETURN_KEY);localStorage.removeItem('seh_oauth_return');}catch(_){}
      alert(`Discord-inloggningen misslyckades: ${error?.message||error}`);
    }
  }
  window.__SEH_HANDLE_AUTH_CALLBACK__=sehV760HandleAuthCallback;

  function sehV760EnsureStyle(){
    let style=document.getElementById('seh-v760-style');
    if(!style){style=document.createElement('style');style.id='seh-v760-style';document.head.appendChild(style);}
    if(style.textContent!==SEH_V760_STYLE)style.textContent=SEH_V760_STYLE;
  }
  function sehV760Client(){
    if(sehV760AuthClient)return sehV760AuthClient;
    if(window.__SEH_NATIVE_SUPABASE_CLIENT__)return (sehV760AuthClient=window.__SEH_NATIVE_SUPABASE_CLIENT__);
    const cfg=window.SEH_CONFIG||window.EHOCKEY_CONFIG||window.APP_CONFIG||window.config||{};
    const url=String(cfg.supabaseUrl||cfg.SUPABASE_URL||'https://oujqnvrczdavqbqaavuh.supabase.co').trim();
    const key=String(cfg.supabasePublishableKey||cfg.supabaseAnonKey||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z').trim();
    if(!window.supabase?.createClient||!url||!key)return null;
    sehV760AuthClient=window.supabase.createClient(url,key);
    const authChange=sehV760AuthClient.auth.onAuthStateChange((event,session)=>{
      if((event==='INITIAL_SESSION'||event==='SIGNED_IN')&&session?.user)setTimeout(()=>sehV760CompleteOauthReturn(session),0);
    });
    sehV760AuthSubscription=authChange?.data?.subscription||null;
    window.__SEH_NATIVE_SUPABASE_CLIENT__=sehV760AuthClient;
    return sehV760AuthClient;
  }
  async function sehV760WaitForClient(timeoutMs=5000){
    const started=Date.now();
    let delay=80;
    while(Date.now()-started<timeoutMs){
      const client=sehV760Client();
      if(client)return client;
      await new Promise(resolve=>setTimeout(resolve,delay));
      delay=Math.min(400,Math.round(delay*1.6));
    }
    return sehV760Client();
  }
  function sehV760IsDiscord(user){
    if(!user)return false;
    if(String(user.app_metadata?.provider||'').toLowerCase()==='discord')return true;
    if((user.app_metadata?.providers||[]).some(v=>String(v).toLowerCase()==='discord'))return true;
    return (user.identities||[]).some(v=>String(v?.provider||'').toLowerCase()==='discord');
  }
  function sehV760DiscordName(user){return String(user?.user_metadata?.global_name||user?.user_metadata?.full_name||user?.user_metadata?.name||user?.user_metadata?.preferred_username||user?.email||'Discord-användare').trim();}
  function sehV760Layer(){
    sehV760EnsureStyle();
    let layer=document.getElementById('seh-v760-layer');
    if(layer)return layer;
    layer=document.createElement('section');layer.id='seh-v760-layer';document.body.appendChild(layer);return layer;
  }
  function sehV760CloseLayer(clearReturn=true){
    const layer=document.getElementById('seh-v760-layer');if(layer){layer.classList.remove('show');layer.innerHTML='';}
    sehV760LayerState.kind='';sehV760LayerState.teamId=0;
    if(clearReturn)try{sessionStorage.removeItem('seh_v760_ecl27_return');}catch(_){}
    refreshTop();
  }
  function sehV760Header(title,kicker='SVENSK eHOCKEY',back=false){
    return `<div class="seh-v760-head"><div><small>${htmlEscape(kicker)}</small><h1>${htmlEscape(title)}</h1></div><button class="${back?'seh-v760-back':'seh-v760-close'}" type="button" aria-label="${back?'Tillbaka':'Stäng'}">${back?'‹':'×'}</button></div>`;
  }
  function sehV760BindClose(layer,onBack=null){
    layer.querySelector('.seh-v760-close')?.addEventListener('click',()=>sehV760CloseLayer());
    layer.querySelector('.seh-v760-back')?.addEventListener('click',()=>onBack?onBack():sehV760CloseLayer());
  }
  function sehV760PlayerHref(key,name){
    key=String(key||'').trim();name=String(name||key).trim();if(!key||key.startsWith('GT:'))return '';
    const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv-SE').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return `${ROOT}#/spelare/${encodeURIComponent(slug||key)}?pk=${encodeURIComponent(key)}`;
  }
  async function sehV760OpenPlayer(key,name,returnState=null){
    const href=sehV760PlayerHref(key,name);if(!href)return;
    if(returnState)try{sessionStorage.setItem('seh_v760_ecl27_return',JSON.stringify({...returnState,ts:Date.now()}));}catch(_){}

    // V767: seed a usable player immediately, before any REST request. This is
    // deliberately the same fast-profile structure used by player-directory
    // cards. It prevents Android WebView from reaching the player route with no
    // renderable source while a directory lookup is still pending.
    const immediate={
      href,
      key:String(key||'').trim(),
      name:String(name||key||'').trim(),
      position:'Spelare',photo:'',latestTeam:'',latestSeason:'',history:'',games:0,
      rankNo:0,rankPoints:0,teamLogo:'',savedAt:Date.now()
    };
    try{
      window.__SEH_PENDING_NATIVE_PLAYER__=immediate;
      sehRememberFastProfileNav(immediate,'',null);
    }catch(_){}

    // V766/V767: account/FA/ECL27 links do not originate from a player-directory card,
    // so the native player route had no fast-profile payload and could render
    // only the empty background grid. Seed the existing fast-navigation cache
    // from the same public directory source before opening the profile.
    try{
      const wanted=String(key||'').trim();
      let player=null;
      const cached=[...(Array.isArray(sehZeroPlayer?.all)?sehZeroPlayer.all:[]),...(Array.isArray(window.__SEH_PLAYER_DIRECTORY_ROWS__)?window.__SEH_PLAYER_DIRECTORY_ROWS__:[])];
      player=cached.find(row=>String(row?.key||'').trim().toLocaleLowerCase('sv-SE')===wanted.toLocaleLowerCase('sv-SE'))||null;
      if(!player&&wanted){
        const raw=await sehTeamDirectRest('app_player_directory_cache',{
          select:zeroPlayerDirectorySelect(),
          player_key:`eq.${wanted}`,
          limit:'1'
        });
        player=zeroNormalizeDirectoryBatch(raw)[0]||null;
      }
      if(player){
        player.href=href;
        const teamLogo=zeroTeamLogoUrl(player.latestTeam);
        const rank=zeroRankingForName(player.name);
        sehRememberFastProfileNav(player,teamLogo,rank);
        try{window.__SEH_PENDING_NATIVE_PLAYER__={
          href:String(player.href||href),key:String(player.key||wanted),name:String(player.name||name||wanted),
          position:String(player.position||''),photo:String(player.photo||''),latestTeam:String(player.latestTeam||''),
          latestSeason:String(player.latestSeason||''),history:String(player.history||''),games:Number(player.games)||0,
          rankNo:Number(rank?.overall_rank)||0,rankPoints:Number(rank?.ranking_points)||0,teamLogo:String(teamLogo||''),savedAt:Date.now()
        };}catch(_){}
      }else{
        sehRememberFastProfileNav(immediate,'',null);
      }
    }catch(error){
      console.warn('[Svensk eHockey] Kunde inte förladda spelarprofil',error);
      try{sehRememberFastProfileNav(immediate,'',null);}catch(_){}
    }

    sehV760CloseLayer(false);
    nativeNavigate(href);
    // One synchronous post-navigation render pass is intentional here. It is
    // not polling: it guarantees the just-seeded profile is painted in the
    // same user action even when WebView did not dispatch a hash event.
    try{showFastPlayerProfilePreview();sehPrepareNativePlayerSource();scheduleAdaptiveContent(0);}catch(_){}
  }
  function sehV760FmtDate(value){
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
    return d.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});
  }

  function sehV760PhotoIsMissing(value){
    const raw=String(value||'').trim();
    return !raw||/(?:\/players\/1DEFAULTBILDID\.png|\/web-images\/players\/1DEFAULTBILDID\.png\.webp)(?:[?#]|$)/i.test(raw);
  }
  function sehV760DirectoryPhoto(row){
    if(!row)return '';
    const sportsGamer=String(row.sports_gamer_player_url||'').trim();
    const id=sportsGamer.match(/\/players\/(\d+)(?:\/|$|[?#])/i)?.[1]||'';
    const raw=String(row.photo||row.player_image||'').trim();
    if(!id&&sehV760PhotoIsMissing(raw))return '';
    return sehWebAppPlayerImage(raw,id);
  }
  async function sehV760DirectoryPlayers(playerKeys){
    const keys=[...new Set((playerKeys||[]).map(value=>String(value||'').trim()).filter(Boolean))];
    const found=new Map();
    const cached=[...(Array.isArray(sehZeroPlayer?.all)?sehZeroPlayer.all:[]),...(Array.isArray(window.__SEH_PLAYER_DIRECTORY_ROWS__)?window.__SEH_PLAYER_DIRECTORY_ROWS__:[])];
    cached.forEach(row=>{const key=String(row?.key||row?.player_key||'').trim();if(key&&!found.has(key))found.set(key,row);});
    const missing=keys.filter(key=>!found.has(key));
    for(let offset=0;offset<missing.length;offset+=80){
      const batch=missing.slice(offset,offset+80);
      const quoted=batch.map(key=>`"${key.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`).join(',');
      try{
        const rows=await sehTeamDirectRest('app_player_directory_cache',{
          select:'player_key,player_image,sports_gamer_player_url',
          player_key:`in.(${quoted})`,limit:String(batch.length)
        });
        rows.forEach(row=>{const key=String(row?.player_key||'').trim();if(key)found.set(key,row);});
      }catch(error){console.warn('[Svensk eHockey] Kunde inte komplettera spelarbild',error);}
    }
    return found;
  }
  async function sehV760HydratePlayerPhotos(rows){
    const list=Array.isArray(rows)?rows:[];
    const directory=await sehV760DirectoryPlayers(list.filter(row=>!sehV760DirectoryPhoto(row)).map(row=>row?.player_key));
    return list.map(row=>{
      const current=sehV760DirectoryPhoto(row);
      const resolved=current||sehV760DirectoryPhoto(directory.get(String(row?.player_key||'').trim()))||sehWebAppPlayerImage('');
      return {...row,player_image:resolved};
    });
  }

  async function sehV760LoadAccount(){
    const client=await sehV760WaitForClient();
    if(!client)return {client:null,session:null,account:null,dashboard:null,error:new Error('Supabase Auth kunde inte startas.')};
    let session=null;
    try{
      const {data,error}=await client.auth.getSession();if(error)throw error;
      session=data?.session||null;if(!session?.user)return {client,session:null,account:null,dashboard:null};
      if(!sehV760IsDiscord(session.user))return {client,session,account:{status:'wrong_provider',discordUsername:sehV760DiscordName(session.user)},dashboard:null};
      const accountResult=await client.rpc('seh_get_my_player_account');if(accountResult.error)throw accountResult.error;
      const raw=Array.isArray(accountResult.data)?(accountResult.data[0]||{}):(accountResult.data||{});
      const account={status:String(raw.status||'unlinked'),playerKey:String(raw.player_key||'').trim(),requestedPlayerKey:String(raw.requested_player_key||'').trim(),playerName:String(raw.player_name||'').trim(),discordUsername:String(raw.discord_username||sehV760DiscordName(session.user)).trim()};
      let dashboard=null;
      if(account.status==='approved'&&account.playerKey){
        const dash=await client.rpc('seh_get_my_player_dashboard');
        if(!dash.error){
          dashboard=Array.isArray(dash.data)?(dash.data[0]||{}):(dash.data||{});
          const player={...(dashboard?.player||{}),player_key:dashboard?.player?.player_key||account.playerKey};
          dashboard={...(dashboard||{}),player:(await sehV760HydratePlayerPhotos([player]))[0]||player};
        }
        const linkedPlayer=dashboard?.player||{};
        let currentStatus=null;
        if(window.SEH_currentPlayerStatus?.get){
          currentStatus=await window.SEH_currentPlayerStatus.get(account.playerKey);
        }
        if(currentStatus){
          linkedPlayer.current_status=currentStatus.kind;
          linkedPlayer.current_team_name=currentStatus.teamName;
          linkedPlayer.current_team_id=currentStatus.teamId;
          if(dashboard)dashboard.player=linkedPlayer;
        }
        setMyProfile({
          player_key:account.playerKey,
          display_gamertag:linkedPlayer.display_gamertag||account.playerName||account.playerKey,
          player_image:linkedPlayer.player_image||linkedPlayer.photo||'',
          current_team_name:linkedPlayer.current_team_name||'',
          currentTeam:linkedPlayer.current_team_name||'',
          latestTeam:linkedPlayer.current_team_name||linkedPlayer.latest_ecl_team||linkedPlayer.latest_team||'',
          latestSeason:linkedPlayer.latest_ecl_division||linkedPlayer.latest_season||'',
          position:linkedPlayer.primary_position||'',
          href:sehV760PlayerHref(account.playerKey,linkedPlayer.display_gamertag||account.playerName||account.playerKey),
          serverLinked:true
        });
      }
      return {client,session,account,dashboard};
    }catch(error){return {client,session,account:null,dashboard:null,error};}
  }

  async function sehV760DiscordLogin(returnHash='#/'){
    const client=await sehV760WaitForClient();if(!client){alert('Inloggningen kunde inte starta. Kontrollera anslutningen och försök igen.');return;}
    try{
      const existing=await client.auth.getSession();
      if(existing.data?.session&&!sehV760IsDiscord(existing.data.session.user))await client.auth.signOut();
      const nativeAuth=Boolean(window.SehNative||window.Capacitor?.isNativePlatform?.());
      localStorage.setItem(SEH_WEBAPP_OAUTH_RETURN_KEY,JSON.stringify({hash:returnHash,savedAt:Date.now(),webapp:!nativeAuth}));
      if(window.SehNative&&typeof window.SehNative.prepareNavigation==='function'){try{window.SehNative.prepareNavigation();}catch(_){}}
      const authRedirect=nativeAuth?SEH_ANDROID_AUTH_REDIRECT:sehV760BrowserAuthRedirect();
      const {data,error}=await client.auth.signInWithOAuth({provider:'discord',options:{redirectTo:authRedirect,skipBrowserRedirect:true}});if(error)throw error;
      if(!data?.url)throw new Error('Discord-inloggningen saknar startadress.');
      if(window.SehNative&&typeof window.SehNative.openExternal==='function')window.SehNative.openExternal(data.url);
      else location.assign(data.url);
    }catch(error){try{localStorage.removeItem(SEH_WEBAPP_OAUTH_RETURN_KEY);}catch(_){}alert(`Discord-inloggningen kunde inte starta: ${error?.message||error}`);}
  }

  function sehV760OpenPrivacy(){
    const layer=sehV760Layer();sehV760LayerState.kind='privacy';layer.classList.add('show');
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header('Integritet','SVENSK eHOCKEY / APP')}
      <div class="seh-v760-card"><span class="seh-v760-kicker">SENAST UPPDATERAD 10 SEPTEMBER 2026</span><h2>Så hanterar vi dina uppgifter</h2><p>Svensk eHockey använder uppgifter som behövs för Discord-inloggning, spelarkoppling, Min profil, Free Agents och valfria pushnotiser. Vi säljer aldrig personuppgifter.</p>
      <ul class="seh-v760-privacy-list"><li>Discord kan lämna konto-id, användarnamn, profilbild och e-postadress.</li><li>Profiltexter, kontaktuppgifter och Free Agent-uppgifter sparas när du själv skickar in dem.</li><li>Supabase används för inloggning och datalagring. Tekniska loggar kan behandlas för drift och säkerhet.</li><li>Webbpush använder webbläsarens leverantör, exempelvis Apple på iPhone. Prenumerationsadress, krypteringsnycklar och notiskategorier lagras i Supabase utan kontokoppling och tas bort när du stänger av webbpush i appen eller prenumerationen upphör.</li><li>Favoriter och lokal spelarkoppling sparas på din mobil och kräver ingen inloggning.</li><li>Offentliga match-, lag- och turneringsresultat är idrottshistorik och ligger kvar när ett konto raderas.</li></ul></div>
      <div class="seh-v760-card"><h2>Dina val</h2><p>Under Min profil kan du radera ditt appkonto med Discord-kopplingen och dina egna profiluppgifter. Spelarkortet, GT, matcher, statistik och meriter raderas inte automatiskt. Du kan också ta bort din spelarbild separat, utan adminbeslut. Gör det före kontoraderingen om du vill ta bort båda.</p><p>Frågor om dina uppgifter eller tävlingshistoriken: <b>${SEH_PRIVACY_EMAIL}</b></p><div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-privacy-web>Öppna fullständig policy på webben</button></div></div>
    </div>`;
    sehV760BindClose(layer);
    layer.querySelector('[data-v760-privacy-web]')?.addEventListener('click',()=>{if(window.SehNative&&typeof window.SehNative.openExternal==='function')window.SehNative.openExternal(SEH_PRIVACY_URL);else window.open(SEH_PRIVACY_URL,'_blank','noopener');});
  }

  function sehV760AccountAction(action){
    const photo=action==='remove_photo';
    const layer=sehV760Layer();sehV760LayerState.kind='account-action';layer.classList.add('show');
    const phrase=photo?'TA BORT MIN BILD':'RADERA MITT APPKONTO';
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header(photo?'Ta bort min spelarbild':'Radera mitt appkonto','MIN PROFIL',true)}<div class="seh-v760-card"><p>${photo?'Din spelarbild ersätts med standardbilden utan adminbeslut. Spelarkortet, kontot och statistiken finns kvar. Andra enheter kan visa en cachad bild en stund.':'Din inloggning, Discord-koppling, egna profiluppgifter, egna Free Agent-annonser och inskickade profilärenden tas bort. Spelarkortet med GT, matcher, statistik och meriter finns kvar. Spelarbilden hanteras separat. Ditt Discord-konto hos Discord påverkas inte.'}</p>${photo?'':`<div class="seh-v760-form"><label><span>Skriv ${phrase} för att bekräfta</span><input id="seh-account-confirm" autocomplete="off"></label></div>`}<div class="seh-v760-status" role="status" id="seh-account-action-status"></div><div class="seh-v760-actions"><button class="seh-v760-btn danger" id="seh-account-action-confirm" ${photo?'':'disabled'}>${photo?'Bekräfta: ta bort bilden':'Radera mitt appkonto'}</button><button class="seh-v760-btn" id="seh-account-action-cancel">Avbryt</button></div></div></div>`;
    sehV760BindClose(layer,sehV760OpenAccount);
    const button=layer.querySelector('#seh-account-action-confirm');
    const input=layer.querySelector('#seh-account-confirm');
    input?.addEventListener('input',()=>button.disabled=input.value.trim()!==phrase);
    layer.querySelector('#seh-account-action-cancel').onclick=sehV760OpenAccount;
    button.onclick=async()=>{
      if(!photo&&input.value.trim()!==phrase)return;
      button.disabled=true;
      const status=layer.querySelector('#seh-account-action-status');status.textContent=photo?'Tar bort bilden…':'Raderar appkontot…';
      try{
        const client=await sehV760WaitForClient();if(!client)throw new Error('Inloggningen kunde inte starta. Försök igen.');
        const response=await client.functions.invoke('delete-account',{body:{action,confirmation:phrase}});
        if(response.error){
          let message=response.error.message;
          try{message=(await response.error.context.json()).error||message;}catch(_){}
          throw new Error(message);
        }
        if(photo){
          if(response.data?.photo_removed!==true)throw new Error('Bildborttagningen kunde inte bekräftas.');
          const id=String(response.data.image_id||'');
          if(/^\d+$/.test(id)){
            sehRemovedPortraitIds.add(id);
            const matches=value=>{const clean=String(value||'').split('?')[0];return clean.endsWith(`/players/${id}.png`)||clean.endsWith(`/web-images/players/${id}.png.webp`);};
            document.querySelectorAll('img').forEach(img=>{if(matches(img.src))img.src=ZERO_PLAYER_PNG_FALLBACK;});
            for(const row of sehZeroPlayer.all||[]){if(matches(row.photo))row.photo=ZERO_PLAYER_PNG_FALLBACK;}
            const local=getMyProfile();if(local&&matches(local.photo))setMyProfile({...local,photo:ZERO_PLAYER_PNG_FALLBACK});
          }
          status.textContent=response.data.message||'Bilden är borttagen.';
        }else{
          if(response.data?.deleted!==true)throw new Error('Kontoraderingen kunde inte bekräftas.');
          try{await client.auth.signOut({scope:'local'});}catch(_){}
          localStorage.removeItem(SEH_WEBAPP_OAUTH_RETURN_KEY);localStorage.removeItem('seh_oauth_return');setMyProfile(null);
          sehV760LayerState.session=null;sehV760LayerState.account=null;sehV760LayerState.dashboard=null;
          status.textContent='Ditt appkonto är raderat. Spelarkortet och tävlingshistoriken finns kvar.';
        }
        button.remove();
        const cancel=layer.querySelector('#seh-account-action-cancel');if(cancel)cancel.textContent='Klart';
      }catch(error){status.textContent=error?.message||'Åtgärden kunde inte slutföras.';status.classList.add('error');button.disabled=false;}
    };
  }

  async function sehV760OpenAccount(){
    const layer=sehV760Layer();sehV760LayerState.kind='account';layer.classList.add('show');
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header('Min profil','SVENSK eHOCKEY / KONTO')}<div class="seh-v760-card"><p>Laddar konto och spelarprofil…</p></div></div>`;sehV760BindClose(layer);
    const result=await sehV760LoadAccount();if(sehV760LayerState.kind!=='account')return;
    sehV760LayerState.session=result.session;sehV760LayerState.account=result.account;sehV760LayerState.dashboard=result.dashboard;
    const local=getMyProfile();
    let body='';
    if(result.error){body=`<div class="seh-v760-card"><h2>Kunde inte läsa kontot</h2><p>${htmlEscape(result.error.message||String(result.error))}</p><div class="seh-v760-actions"><button class="seh-v760-btn" data-v760-retry>Försök igen</button>${local?'<button class="seh-v760-btn gold" data-v760-local>Öppna lokal profil</button>':''}</div></div>`;}
    else if(!result.session){body=`<div class="seh-v760-card"><h2>Logga in med Discord</h2><p>Logga in för att hantera din spelarprofil och dina uppgifter.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-login>Logga in med Discord</button>${local?'<button class="seh-v760-btn" data-v760-local>Öppna lokal profil</button>':'<button class="seh-v760-btn" data-v760-pick>Koppla GT lokalt</button>'}</div></div>`;}
    else if(result.account?.status==='wrong_provider'){body=`<div class="seh-v760-card"><h2>Fel kontotyp</h2><p>Min profil använder Discord-inloggning. Du är inloggad med ett annat Svensk eHockey-konto.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-login>Byt till Discord</button><button class="seh-v760-btn" data-v760-logout>Logga ut</button></div></div>`;}
    else if(result.account?.status==='approved'&&result.account.playerKey){
      const p=result.dashboard?.player||{};const name=p.display_gamertag||result.account.playerName||result.account.playerKey;const photo=sehWebAppPlayerImage(p.player_image||'');const fa=result.dashboard?.free_agent||{};
      const accountTeamStatus=p.current_status==='team'
        ? (p.current_team_name||'Aktuellt lag')
        : p.current_status==='free_agent'
          ? 'Free Agent'
          : 'Inget aktuellt lag';
      body=`<div class="seh-v760-card"><div class="seh-v760-profile"><img class="seh-v760-avatar" src="${htmlEscape(photo)}" alt=""><div><span class="seh-v760-kicker">GODKÄND SPELARKOPPLING</span><strong>${htmlEscape(name)}</strong><span>${htmlEscape([p.primary_position,accountTeamStatus,p.latest_ecl_division].filter(Boolean).join(' · ')||'Svensk spelare')}</span><span>Discord: ${htmlEscape(result.account.discordUsername||sehV760DiscordName(result.session.user))}</span></div></div><div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-server-profile>Öppna spelarprofil</button><button class="seh-v760-btn" data-v760-edit-profile>Redigera profil</button><button class="seh-v760-btn" data-v760-fa>Free Agents${fa.id&&fa.is_active!==false?' · aktiv':''}</button><button class="seh-v760-btn" data-v760-favs>Favoriter</button><button class="seh-v760-btn" data-v760-logout>Logga ut</button></div></div>`;
    }else{
      const pending=result.account?.status==='pending';body=`<div class="seh-v760-card"><h2>${pending?'Spelarkoppling väntar på admin':'Koppla din spelarprofil'}</h2><p>${pending?`Begärd profil: ${htmlEscape(result.account?.requestedPlayerKey||'–')}. Du kan använda lokal Min profil under tiden.`:'Välj din svenska spelarprofil. Kopplingen skickas till samma adminflöde som på webben.'}</p>${pending?'':`<div class="seh-v760-form"><label><span>Gamertag</span><input id="seh-v760-link-search" placeholder="Skriv ditt GT"></label><div id="seh-v760-link-results"></div><div id="seh-v760-link-status" class="seh-v760-status"></div></div>`}<div class="seh-v760-actions">${local?'<button class="seh-v760-btn" data-v760-local>Öppna lokal profil</button>':'<button class="seh-v760-btn" data-v760-pick>Koppla GT lokalt</button>'}<button class="seh-v760-btn" data-v760-fa>Visa Free Agents</button><button class="seh-v760-btn" data-v760-logout>Logga ut</button></div></div>`;
    }
    const accountTools=`<div class="seh-v760-card"><span class="seh-v760-kicker">INTEGRITET & KONTO</span><h2>Dina uppgifter</h2><p>Läs hur Svensk eHockey hanterar uppgifter och hur du kontaktar oss i integritetsfrågor.</p><div class="seh-v760-actions"><button class="seh-v760-btn" data-v760-privacy>Integritetspolicy</button></div></div>`;
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header('Min profil','SVENSK eHOCKEY / KONTO')}${body}${accountTools}</div>`;sehV760BindClose(layer);
    if(result.session&&!result.error&&!['approved','wrong_provider'].includes(result.account?.status)){
      const card=layer.querySelector('.seh-v760-card');
      const pending=result.account?.status==='pending';
      const rejected=result.account?.status==='rejected';
      card.querySelector('h2').textContent=pending?'Inväntar admin':rejected?'Kopplingen godkändes inte':'Inloggad utan spelarkort';
      card.querySelector('p').textContent=pending
        ?`Begärd profil: ${result.account?.requestedPlayerKey||'–'}. Du är inloggad och kan använda appen medan admin granskar begäran. Spelarkortet är inte verifierat ännu.`
        :`${rejected?'Du kan välja rätt spelarkort och skicka en ny begäran. ':''}En spelarkoppling är valfri. Välj ett befintligt kort nedan om du vill begära godkännande från admin.`;
      const skip=document.createElement('button');skip.type='button';skip.className='seh-v760-btn gold';skip.dataset.v760SkipLink='';skip.textContent='Fortsätt till appen';skip.onclick=()=>sehV760CloseLayer();
      card.querySelector('.seh-v760-actions')?.prepend(skip);
      if(!pending){
        for(const [kind,label] of [['find_player','Jag finns redan men hittar inte min profil'],['new_player','Jag finns inte med – ansök om spelarkort']]){
          const button=document.createElement('button');button.type='button';button.className='seh-v760-btn';button.textContent=label;button.onclick=()=>sehOpenPlayerApplication(kind);card.querySelector('.seh-v760-actions')?.append(button);
        }
        sehLoadApplicationStatus(result,card);
      }
    }
    layer.querySelector('[data-v760-retry]')?.addEventListener('click',sehV760OpenAccount);
    layer.querySelector('[data-v760-login]')?.addEventListener('click',()=>sehV760DiscordLogin('#/'));
    layer.querySelector('[data-v760-logout]')?.addEventListener('click',async()=>{await result.client?.auth.signOut();sehV760OpenAccount();});
    layer.querySelector('[data-v760-local]')?.addEventListener('click',()=>{sehV760CloseLayer();openSavedMyProfile();});
    layer.querySelector('[data-v760-pick]')?.addEventListener('click',()=>{sehV760CloseLayer();openMyProfilePicker();});
    layer.querySelector('[data-v760-favs]')?.addEventListener('click',()=>{sehV760CloseLayer();openFavorites();});
    layer.querySelector('[data-v760-fa]')?.addEventListener('click',sehV760OpenFreeAgents);
    layer.querySelector('[data-v760-server-profile]')?.addEventListener('click',()=>{const p=result.dashboard?.player||{};sehV760OpenPlayer(result.account.playerKey,p.display_gamertag||result.account.playerName);});
    layer.querySelector('[data-v760-edit-profile]')?.addEventListener('click',sehV760OpenProfileEditor);
    layer.querySelector('[data-v760-privacy]')?.addEventListener('click',sehV760OpenPrivacy);
    if(result.session&&!result.error&&result.account?.status!=='wrong_provider'){
      const actions=layer.querySelector('[data-v760-privacy]')?.parentElement;
      if(result.account?.status==='approved'){
        const photo=document.createElement('button');photo.className='seh-v760-btn';photo.textContent='Ta bort min spelarbild';
        photo.onclick=()=>sehV760AccountAction('remove_photo');actions?.append(photo);
      }
      const remove=document.createElement('button');remove.className='seh-v760-btn danger';remove.textContent='Radera mitt appkonto';
      remove.onclick=()=>sehV760AccountAction('delete_account');actions?.append(remove);
    }
    const search=layer.querySelector('#seh-v760-link-search');if(search){let timer=0;search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>sehV760SearchLinkPlayer(search.value),220);});}
  }

  async function sehLoadApplicationStatus(result,card){
    const status=document.createElement('p');status.setAttribute('role','status');card.append(status);
    try{
      const response=await result.client.from('ehockey_player_profile_requests').select('id,request_type,status,admin_note,submitted_at').eq('user_id',result.session.user.id).in('request_type',['find_player','new_player']).order('submitted_at',{ascending:false}).limit(1);
      if(!card.isConnected)return;
      if(response.error)throw response.error;
      const request=response.data?.[0];if(!request){status.remove();return;}
      status.textContent=`Senaste ansökan: ${{pending:'väntar på admin',approved:'godkänd',rejected:'avslagen'}[request.status]||request.status}.${request.admin_note?' '+request.admin_note:''}`;
      if(request.status==='pending'){
        card.querySelector('.seh-v760-form')?.remove();
        status.textContent+=' Du kan uppdatera ansökan via alternativen ovan. Inget nytt spelarkort skapas automatiskt.';
      }
    }catch(_){status.textContent='Tidigare ansökningar kunde inte hämtas just nu. Försök igen senare.';}
  }
  async function sehOpenPlayerApplication(kind){
    if(!['find_player','new_player'].includes(kind))return;
    const layer=sehV760Layer();sehV760LayerState.kind='application';layer.classList.add('show');
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header('Spelaransökan','MIN PROFIL',true)}<div class="seh-v760-card"><p>Hämtar konto…</p></div></div>`;sehV760BindClose(layer,sehV760OpenAccount);
    const account=await sehV760LoadAccount();if(sehV760LayerState.kind!=='application')return;
    if(!account.session||account.error||['approved','pending','wrong_provider'].includes(account.account?.status)){sehV760OpenAccount();return;}
    let previous={};
    try{
      const response=await account.client.from('ehockey_player_profile_requests').select('payload').eq('user_id',account.session.user.id).in('request_type',['find_player','new_player']).eq('status','pending').limit(1);
      if(response.error)throw response.error;previous=response.data?.[0]?.payload||{};
    }catch(_){}
    if(sehV760LayerState.kind!=='application')return;
    const field=(name,label,max,type='text')=>`<label><span>${label}</span><input name="${name}" type="${type}" maxlength="${max}" value="${htmlEscape(previous[name]||'')}" ${name==='gamertag'?'required minlength="2"':''}></label>`;
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header(kind==='find_player'?'Hitta mitt spelarkort':'Ansök om spelarkort','MIN PROFIL',true)}<div class="seh-v760-card"><p>Admin granskar din ansökan. Inget spelarkort skapas eller kopplas automatiskt. Ditt Discord-ID hämtas säkert från inloggningen.</p><form id="seh-application-form" class="seh-v760-form">${field('gamertag','Gamertag',100)}<label><span>Plattform</span><select name="platform" required><option value="">Välj plattform</option>${['PS5','Xbox Series','Annan'].map(value=>`<option ${previous.platform===value?'selected':''}>${value}</option>`).join('')}</select></label>${field('profile_url','SportsGamer/ECL-profil (valfri https-länk)',500,'url')}${field('last_team','Senaste lag (valfritt)',120)}<label><span>Kommentar (valfri)</span><textarea name="comment" maxlength="2000">${htmlEscape(previous.comment||'')}</textarea></label><p id="seh-application-status" role="status"></p><div class="seh-v760-actions"><button type="submit" class="seh-v760-btn gold">Skicka till admin</button><button type="button" class="seh-v760-btn" id="seh-application-back">Tillbaka</button></div></form></div></div>`;
    sehV760BindClose(layer,sehV760OpenAccount);layer.querySelector('#seh-application-back').onclick=sehV760OpenAccount;
    const form=layer.querySelector('#seh-application-form');
    form.onsubmit=async event=>{
      event.preventDefault();const submit=form.querySelector('[type="submit"]');if(submit.disabled)return;submit.disabled=true;
      const status=form.querySelector('#seh-application-status');status.textContent='Skickar…';
      try{
        const payload=Object.fromEntries(new FormData(form));
        const response=await account.client.rpc('seh_submit_player_application',{p_kind:kind,p_payload:payload});if(response.error)throw response.error;
        status.textContent='Ansökan är sparad och väntar på admin. Du kan fortsätta använda appen.';
        submit.remove();form.querySelectorAll('input,select,textarea').forEach(input=>input.disabled=true);form.querySelector('#seh-application-back').textContent='Till Min profil';
      }catch(error){status.textContent=error.message||'Kunde inte skicka. Försök igen.';submit.disabled=false;}
    };
  }
  const SEH_V760_IMAGE_BUCKET_PRIVATE='player-image-submissions';
  const SEH_V760_IMAGE_MAX_SIZE=8*1024*1024;
  const SEH_V760_IMAGE_ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
  function sehV760ValidatePlayerImage(file){
    if(!file)return;
    if(!SEH_V760_IMAGE_ALLOWED.has(String(file.type||'')))throw new Error('Bilden måste vara JPG, PNG eller WEBP.');
    if(!(Number(file.size)>0)||Number(file.size)>SEH_V760_IMAGE_MAX_SIZE)throw new Error('Bilden får vara högst 8 MB.');
  }
  function sehV760PlayerImageExt(file){
    const ext=String(file?.name||'').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
    if(ext)return ext;
    if(file?.type==='image/png')return 'png';
    if(file?.type==='image/webp')return 'webp';
    return 'jpg';
  }
  async function sehV760UploadPlayerImage(client,file){
    sehV760ValidatePlayerImage(file);
    const sessionResult=await client.auth.getSession();
    if(sessionResult.error)throw sessionResult.error;
    const userId=sessionResult.data?.session?.user?.id;
    if(!userId)throw new Error('Discord-sessionen saknas.');
    const path=`submissions/${userId}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${sehV760PlayerImageExt(file)}`;
    const upload=await client.storage.from(SEH_V760_IMAGE_BUCKET_PRIVATE).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(upload.error)throw upload.error;
    const submit=await client.rpc('seh_submit_player_image_request',{p_original_path:path,p_original_filename:file.name,p_mime_type:file.type,p_size_bytes:file.size});
    if(submit.error){
      try{await client.storage.from(SEH_V760_IMAGE_BUCKET_PRIVATE).remove([path]);}catch(_){}
      throw submit.error;
    }
    return submit.data;
  }
  async function sehV760RenderPlayerImageQueue(layer,client){
    const note=layer?.querySelector('#seh-v760-image-queue');if(!note||!client)return;
    try{
      const result=await client.rpc('seh_get_my_player_image_requests');if(result.error)throw result.error;
      const rows=Array.isArray(result.data)?result.data:[];
      const latest=rows[0]||null;
      const active=rows.find(row=>['pending','editing'].includes(String(row?.status||'')));
      if(active){
        note.textContent=active.status==='editing'?'Din senaste bild är hos admin och redigeras.':'Din senaste bild väntar på admin och är inte publik.';
        note.dataset.state=active.status;
      }else if(latest?.status==='published'){
        note.textContent='Din senaste spelarbild är publicerad på din profil.';
        note.dataset.state='published';
      }else if(latest?.status==='rejected'){
        note.textContent=latest.admin_note?`Din senaste bild avslogs: ${latest.admin_note}`:'Din senaste spelarbild blev avslagen av admin.';
        note.dataset.state='rejected';
      }else{
        note.textContent='Ingen spelarbild väntar på behandling.';
        note.dataset.state='idle';
      }
    }catch(_){
      note.textContent='';
      note.dataset.state='idle';
    }
  }

  async function sehV760OpenProfileEditor(){
    const layer=sehV760Layer();sehV760LayerState.kind='profile-edit';layer.classList.add('show');
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header('Redigera profil','SVENSK eHOCKEY / KONTO')}<div class="seh-v760-card"><p>Hämtar dina profiluppgifter…</p></div></div>`;sehV760BindClose(layer);
    const account=await sehV760LoadAccount();if(sehV760LayerState.kind!=='profile-edit')return;
    if(!account?.session||account?.account?.status!=='approved'||!account.account.playerKey){sehV760OpenAccount();return;}
    const client=account.client;let current={};
    try{
      const q=await client.from('v_ehockey_player_self_profiles_public').select('*').eq('player_key',account.account.playerKey).maybeSingle();
      if(!q.error&&q.data)current=q.data;
    }catch(_){}
    const value=(k)=>htmlEscape(current?.[k]||'');
    const name=htmlEscape(account.dashboard?.player?.display_gamertag||account.account.playerName||account.account.playerKey);
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header('Redigera profil','SVENSK eHOCKEY / KONTO')}
      <div class="seh-v760-card"><span class="seh-v760-kicker">MIN SPELARPROFIL</span><h2>${name}</h2><p>Ändringarna publiceras efter godkännande av administratör.</p>
      <div class="seh-v760-form">
        <label><span>Presentation</span><textarea id="seh-v760-profile-presentation">${value('presentation')}</textarea></label>
        <label><span>Positioner</span><input id="seh-v760-profile-positions" value="${value('positions_text')}" placeholder="Ex. C / RW"></label>
        <label><span>Kontakt</span><input id="seh-v760-profile-contact" value="${value('contact')}" placeholder="Ex. Discord"></label>
        <label><span>Twitch</span><input id="seh-v760-profile-twitch" value="${value('twitch_url')}" placeholder="https://twitch.tv/..."></label>
        <label><span>X</span><input id="seh-v760-profile-x" value="${value('x_url')}" placeholder="https://x.com/..."></label>
        <label><span>Instagram</span><input id="seh-v760-profile-instagram" value="${value('instagram_url')}" placeholder="https://instagram.com/..."></label>
        <label><span>Tillgänglighet</span><input id="seh-v760-profile-availability" value="${value('availability_status')}" placeholder="Ex. Tillgänglig / Ej tillgänglig"></label>
        <label><span>Lagstatus</span><input id="seh-v760-profile-team-status" value="${value('team_status')}" placeholder="Ex. Under kontrakt / Free Agent"></label>
        <div class="seh-v760-image-upload">
          <strong>Ladda upp spelarbild</strong>
          <p>Originalet sparas privat. Admin redigerar bilden innan den publiceras på din spelarprofil. JPG, PNG eller WEBP · max 8 MB.</p>
          <input id="seh-v760-profile-image-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
          <div class="seh-v760-image-row"><button type="button" class="seh-v760-btn" id="seh-v760-profile-image-pick">Välj originalbild</button><span class="seh-v760-image-name" id="seh-v760-profile-image-name">Ingen bild vald</span></div>
          <img class="seh-v760-image-preview" id="seh-v760-profile-image-preview" alt="Förhandsvisning av vald bild" hidden>
          <div id="seh-v760-image-queue" class="seh-v760-status seh-v760-image-queue" data-state="idle"></div>
        </div>
      </div><div id="seh-v760-profile-status" class="seh-v760-status"></div>
      <div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-profile-save>Skicka ändringar</button><button class="seh-v760-btn" data-v760-profile-cancel>Tillbaka till Min profil</button></div></div></div>`;
    sehV760BindClose(layer);
    const imageInput=layer.querySelector('#seh-v760-profile-image-file');
    const imagePick=layer.querySelector('#seh-v760-profile-image-pick');
    const imageName=layer.querySelector('#seh-v760-profile-image-name');
    const imagePreview=layer.querySelector('#seh-v760-profile-image-preview');
    let imagePreviewUrl='';
    imagePick?.addEventListener('click',()=>imageInput?.click());
    imageInput?.addEventListener('change',()=>{
      const file=imageInput.files?.[0]||null;
      try{sehV760ValidatePlayerImage(file);}catch(error){
        imageInput.value='';if(imageName)imageName.textContent='Ingen bild vald';if(imagePreview)imagePreview.hidden=true;
        const status=layer.querySelector('#seh-v760-profile-status');if(status){status.textContent=error.message||String(error);status.classList.add('error');}
        return;
      }
      if(imagePreviewUrl){try{URL.revokeObjectURL(imagePreviewUrl);}catch(_){}imagePreviewUrl='';}
      if(!file){if(imageName)imageName.textContent='Ingen bild vald';if(imagePreview)imagePreview.hidden=true;return;}
      if(imageName)imageName.textContent=file.name;
      imagePreviewUrl=URL.createObjectURL(file);
      if(imagePreview){imagePreview.src=imagePreviewUrl;imagePreview.hidden=false;}
      const status=layer.querySelector('#seh-v760-profile-status');if(status){status.textContent='';status.className='seh-v760-status';}
    });
    sehV760RenderPlayerImageQueue(layer,client);
    layer.querySelector('[data-v760-profile-cancel]')?.addEventListener('click',sehV760OpenAccount);
    layer.querySelector('[data-v760-profile-save]')?.addEventListener('click',async()=>{
      const status=layer.querySelector('#seh-v760-profile-status'),btn=layer.querySelector('[data-v760-profile-save]');if(btn)btn.disabled=true;if(status){status.className='seh-v760-status';status.textContent='Skickar till admin…';}
      const payload={presentation:String(layer.querySelector('#seh-v760-profile-presentation')?.value||'').trim(),positions_text:String(layer.querySelector('#seh-v760-profile-positions')?.value||'').trim(),contact:String(layer.querySelector('#seh-v760-profile-contact')?.value||'').trim(),twitch_url:String(layer.querySelector('#seh-v760-profile-twitch')?.value||'').trim(),x_url:String(layer.querySelector('#seh-v760-profile-x')?.value||'').trim(),instagram_url:String(layer.querySelector('#seh-v760-profile-instagram')?.value||'').trim(),availability_status:String(layer.querySelector('#seh-v760-profile-availability')?.value||'').trim(),team_status:String(layer.querySelector('#seh-v760-profile-team-status')?.value||'').trim(),image_url:String(current?.image_url||'').trim()};
      const profileKeys=['presentation','positions_text','contact','twitch_url','x_url','instagram_url','availability_status','team_status'];
      const textChanged=profileKeys.some(key=>String(payload[key]||'').trim()!==String(current?.[key]||'').trim());
      const file=imageInput?.files?.[0]||null;
      if(!file&&!textChanged){if(btn)btn.disabled=false;if(status)status.textContent='Inga nya ändringar att skicka.';return;}
      let imageSent=false,profileSent=false;
      try{
        if(file){await sehV760UploadPlayerImage(client,file);imageSent=true;}
        if(textChanged){
          const r=await client.rpc('seh_submit_player_profile_request',{p_request_type:'profile_update',p_payload:payload});
          if(r.error)throw r.error;
          profileSent=true;
        }
        if(imageInput)imageInput.value='';
        if(imageName)imageName.textContent='Ingen bild vald';
        if(imagePreview){imagePreview.hidden=true;imagePreview.removeAttribute('src');}
        if(imagePreviewUrl){try{URL.revokeObjectURL(imagePreviewUrl);}catch(_){}imagePreviewUrl='';}
        if(status){
          status.className='seh-v760-status success';
          status.textContent=imageSent&&profileSent?'Profiländringarna är skickade. Originalbilden ligger privat i bildkön tills admin har redigerat och publicerat den.':imageSent?'Originalbilden är skickad privat till bildkön. Den blir inte publik förrän admin har redigerat och publicerat den.':'Profiländringen är skickad och väntar på admin.';
        }
        await sehV760RenderPlayerImageQueue(layer,client);
      }catch(error){
        if(status){
          status.className='seh-v760-status error';
          status.textContent=imageSent?`Originalbilden skickades, men profiländringen misslyckades: ${error?.message||error}`:`Fel: ${error?.message||error}`;
        }
      }finally{if(btn)btn.disabled=false;}
    });
  }

  async function sehV760SearchLinkPlayer(value){
    const layer=document.getElementById('seh-v760-layer');const host=layer?.querySelector('#seh-v760-link-results'),status=layer?.querySelector('#seh-v760-link-status');if(!host)return;
    const q=String(value||'').trim().replace(/[%*]/g,'');host.innerHTML='';if(q.length<2)return;
    if(status)status.textContent='Söker…';
    try{
      const rows=await sehTeamDirectRest('app_player_directory_cache',{select:'player_key,display_gamertag,primary_position,latest_team,player_image,sports_gamer_player_url',player_country:'eq.SE',display_gamertag:`ilike.*${q}*`,order:'display_gamertag.asc',limit:'8'});
      host.innerHTML=rows.map((p,i)=>`<button class="seh-v760-player" type="button" data-v760-link="${i}"><img src="${htmlEscape(sehV760DirectoryPhoto(p)||sehWebAppPlayerImage(''))}" alt=""><span><strong>${htmlEscape(p.display_gamertag||p.player_key)}</strong><span>${htmlEscape([p.primary_position,p.latest_team].filter(Boolean).join(' · '))}</span></span><b>Välj</b></button>`).join('');if(status)status.textContent=rows.length?'Välj rätt profil.':'Ingen svensk spelare hittades.';
      host.querySelectorAll('[data-v760-link]').forEach(btn=>btn.addEventListener('click',async()=>{const p=rows[Number(btn.dataset.v760Link)];const client=sehV760Client();if(!client)return;if(status)status.textContent='Skickar kopplingen till admin…';const r=await client.rpc('seh_request_discord_player_link',{p_player_key:p.player_key});if(r.error){if(status){status.textContent=`Fel: ${r.error.message}`;status.classList.add('error');}}else sehV760OpenAccount();}));
    }catch(error){if(status){status.textContent=`Fel: ${error.message||error}`;status.classList.add('error');}}
  }

  function sehV760OpenFreeAgents(){
    sehV760CloseLayer();closeOverlays();
    if(location.pathname!=='/'){nativeNavigate(ROOT+'#/free-agents');return;}
    sehRemoveNativeDirectoryHost();
    document.querySelector('.seh-team-native-shell')?.remove();
    if(location.hash!=='#/free-agents') history.pushState({sehFreeAgents:true},'', '#/free-agents');
    sehEnsureFreeAgentsPage(true);refresh();
  }
  function sehEnsureFreeAgentsPage(reload=false){
    let page=document.getElementById('seh-app-free-agents');
    if(route().kind!=='free-agents'){page?.remove();return;}
    if(page&&!reload)return;
    if(!page){page=document.createElement('section');page.id='seh-app-free-agents';page.setAttribute('aria-label','Free Agents');document.body.appendChild(page);}
    sehV760EnsureStyle();
    sehV760LoadFreeAgentsPage(page);
  }
  async function sehV760LoadFreeAgentsPage(layer){
    const request={};layer.sehFaRequest=request;
    const current=()=>layer.isConnected&&layer.sehFaRequest===request&&route().kind==='free-agents';
    const heading='<div class="seh-v760-head"><div><small>SPELARE SÖKER LAG</small><h1>Free Agents</h1></div></div>';
    layer.innerHTML=`<div class="seh-v760-shell">${heading}<div class="seh-v760-card"><p>Hämtar aktuell lista…</p></div></div>`;
    const [rowsResult,accountResult]=await Promise.allSettled([
      sehTeamDirectRest('v_ehockey_free_agents_public',{select:'*',order:'fa_date.desc',limit:'300'}),sehV760LoadAccount()
    ]);
    if(!current())return;
    if(rowsResult.status==='rejected'){
      layer.innerHTML=`<div class="seh-v760-shell">${heading}<div class="seh-v760-card"><p>Kunde inte hämta spelarlistan. Försök igen.</p><button class="seh-v760-btn gold" data-fa-retry>Försök igen</button></div></div>`;
      layer.querySelector('[data-fa-retry]').onclick=()=>sehV760LoadFreeAgentsPage(layer);return;
    }
    let rawRows=rowsResult.status==='fulfilled'?rowsResult.value:[];
    if(window.SEH_currentPlayerStatus?.decorateRows){
      try{rawRows=await window.SEH_currentPlayerStatus.decorateRows(rawRows);}
      catch(error){console.warn('[Svensk eHockey] FA-status kunde inte kontrolleras',error);}
    }
    rawRows=rawRows.filter(row=>!row.player_key||String(row.current_status||'').trim()!=='team');
    const rows=await sehV760HydratePlayerPhotos(rawRows);const account=accountResult.status==='fulfilled'?accountResult.value:null;if(!current())return;
    layer.sehFaRows=rows;
    layer.sehNoTeamRows=[];
    layer.sehNoTeamLoaded=false;
    layer.sehNoTeamLoading=false;
    const self=account?.dashboard?.player||{};const active=account?.dashboard?.free_agent||{};
    let selfHtml='';
    if(account?.session&&account?.account?.status==='approved'&&account.account.playerKey){
      selfHtml=`<div class="seh-v760-card"><span class="seh-v760-kicker">MIN FREE AGENT</span><h2>${active.id&&active.is_active!==false?'Redigera din annons':'Skriv in dig'}</h2><p>${htmlEscape(self.display_gamertag||account.account.playerName||account.account.playerKey)}</p><div class="seh-v760-form"><label><span>Positioner</span><input id="seh-v760-fa-pos" value="${htmlEscape(active.positions_text||self.primary_position||'')}"></label><label><span>Söker nivå</span><input id="seh-v760-fa-level" value="${htmlEscape(active.levels_text||'')}"></label><label><span>Tillgänglighet</span><input id="seh-v760-fa-avail" value="${htmlEscape(active.availability||'')}"></label><label><span>Kontakt</span><input id="seh-v760-fa-contact" value="${htmlEscape(active.contact||`Discord: ${account.account.discordUsername||''}`)}"></label><label><span>Kommentar</span><textarea id="seh-v760-fa-msg">${htmlEscape(active.message||'')}</textarea></label></div><div id="seh-v760-fa-status" class="seh-v760-status"></div><div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-fa-save>${active.id&&active.is_active!==false?'Skicka ändring':'Skicka FA-ansökan'}</button>${active.id&&active.is_active!==false?'<button class="seh-v760-btn danger" data-v760-fa-remove>Begär borttagning</button>':''}</div></div>`;
    }else selfHtml=`<div class="seh-v760-card"><span class="seh-v760-kicker">MIN FREE AGENT</span><h2>${account?.session?'Spelarkoppling krävs':'Logga in för att skriva in dig'}</h2><p>Alla kan läsa listan. Logga in om du själv söker lag och vill lägga in en annons.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" data-v760-fa-account>${account?.session?'Öppna Min profil':'Logga in med Discord'}</button></div></div>`;
    layer.innerHTML=`<div class="seh-v760-shell">${heading}<p>Sök tillgängliga spelare till ditt lag.</p><div class="seh-v760-tools"><input id="seh-v760-fa-search" type="search" placeholder="Sök spelare, lag eller nivå"><select id="seh-v760-fa-pos-filter"><option value="">Alla</option><option>G</option><option>C</option><option>F</option><option>D</option></select></div><div class="seh-v760-fa-extra"><label><input id="seh-v760-fa-show-no-team" type="checkbox"><span>Visa även spelare utan aktuellt lag<small>Inte registrerade som Free Agents. Visas separat och neutralt.</small></span></label><select id="seh-v760-fa-no-team-age" hidden><option value="12" selected>Senast aktiv · 12 månader</option><option value="24">Senast aktiv · 24 månader</option><option value="all">Alla registrerade</option></select><p id="seh-v760-fa-extra-status" class="seh-v760-fa-extra-status" hidden></p></div><div id="seh-v760-fa-list"></div><details><summary>Min annons – söker du själv lag?</summary>${selfHtml}</details></div>`;sehV760RenderFaList();
    layer.querySelector('#seh-v760-fa-search')?.addEventListener('input',sehV760RenderFaList);layer.querySelector('#seh-v760-fa-pos-filter')?.addEventListener('change',sehV760RenderFaList);
    layer.querySelector('#seh-v760-fa-show-no-team')?.addEventListener('change',async event=>{
      const checked=Boolean(event.target.checked);
      const select=layer.querySelector('#seh-v760-fa-no-team-age');
      if(select)select.hidden=!checked;
      if(checked&&!layer.sehNoTeamLoaded&&!layer.sehNoTeamLoading)await sehV760LoadNoTeamPlayers(layer);
      sehV760RenderFaList();
    });
    layer.querySelector('#seh-v760-fa-no-team-age')?.addEventListener('change',sehV760RenderFaList);
    layer.querySelector('[data-v760-fa-account]')?.addEventListener('click',()=>account?.session?sehV760OpenAccount():sehV760DiscordLogin('#/'));
    layer.querySelector('[data-v760-fa-save]')?.addEventListener('click',()=>sehV760SubmitFa(active.id&&active.is_active!==false?'update':'create'));
    layer.querySelector('[data-v760-fa-remove]')?.addEventListener('click',()=>{if(confirm('Begär att tas bort från Free Agent-listan? Du ligger kvar tills admin godkänner.'))sehV760SubmitFa('remove');});
  }
  function sehBindFreeAgentPhoto(img){
    const portrait=img.closest('.seh-fa-portrait');
    if(!portrait)return;
    const update=()=>portrait.classList.toggle('has-photo',img.naturalWidth>0);
    img.addEventListener('load',update);
    img.addEventListener('error',()=>portrait.classList.remove('has-photo'));
    // Cached images can finish before event listeners are attached.
    if(img.complete)update();
  }
  function sehV760NoTeamRecent(row,scope){
    if(scope==='all')return true;
    const raw=String(row.last_appearance_date||'').trim();
    if(!raw)return false;
    const date=new Date(raw.slice(0,10)+'T12:00:00');
    if(Number.isNaN(date.getTime()))return false;
    const cutoff=new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setMonth(cutoff.getMonth()-(Number(scope)||12));
    return date>=cutoff;
  }

  async function sehV760LoadNoTeamPlayers(layer){
    if(!layer||layer.sehNoTeamLoaded||layer.sehNoTeamLoading)return;
    layer.sehNoTeamLoading=true;
    const status=layer.querySelector('#seh-v760-fa-extra-status');
    if(status){status.hidden=false;status.textContent='Hämtar spelare utan aktuellt lag…';}
    try{
      await loadZeroPlayerDirectory();
      await zeroLoadRemainingPlayerDirectory();
      await loadZeroPlayerRanking();
      layer.sehNoTeamRows=(sehZeroPlayer.all||[])
        .filter(player=>player.currentStatus==='no_team')
        .map(player=>{
          const rank=zeroRankingForName(player.name)||{};
          return {
            _listingType:'no_team',
            player_key:player.key,
            display_gamertag:player.name,
            player_image:player.photo,
            sports_gamer_player_url:'',
            primary_position:player.primaryPosition,
            positions_text:player.primaryPosition,
            latest_team:player.latestHistoricalTeam,
            latest_season:player.latestSeason,
            last_appearance_date:player.lastAppearanceDate,
            career_games:player.games,
            total_points:player.totalPoints,
            player_type:player.role==='goalie'?'goalie':'skater',
            overall_rank:rank.overall_rank,
            ranking_points:rank.ranking_points
          };
        });
      layer.sehNoTeamLoaded=true;
      if(status)status.textContent=`${layer.sehNoTeamRows.length.toLocaleString('sv-SE')} registrerade utan aktuellt lag`;
    }catch(error){
      console.warn('[Svensk eHockey] Spelare utan aktuellt lag kunde inte laddas',error);
      if(status)status.textContent='Kunde inte hämta spelare utan aktuellt lag.';
    }finally{
      layer.sehNoTeamLoading=false;
    }
  }

  function sehV760RenderFaList(){
    const layer=document.getElementById('seh-app-free-agents');
    const host=layer?.querySelector('#seh-v760-fa-list');
    if(!host)return;

    const q=String(layer.querySelector('#seh-v760-fa-search')?.value||'').trim().toLocaleLowerCase('sv-SE');
    const pos=String(layer.querySelector('#seh-v760-fa-pos-filter')?.value||'').toLowerCase();
    const showNoTeam=Boolean(layer.querySelector('#seh-v760-fa-show-no-team')?.checked);
    const age=String(layer.querySelector('#seh-v760-fa-no-team-age')?.value||'12');

    const matches=(r)=>{
      const p=String(r.positions_text||r.primary_position||'').toLowerCase();
      const hay=[
        r.display_gamertag,r.latest_ecl_team,r.latest_ecl_division,r.latest_team,r.latest_season,
        r.positions_text,r.levels_text,r.availability,r.message
      ].join(' ').toLocaleLowerCase('sv-SE');
      return (!q||hay.includes(q))&&(!pos||p.includes(pos)||(pos==='f'&&/(lw|rw|c|vf|hf)/.test(p))||(pos==='d'&&/(ld|rd|vb|hb)/.test(p)));
    };

    const freeAgents=(layer.sehFaRows||[]).filter(matches);
    const noTeam=showNoTeam
      ? (layer.sehNoTeamRows||[]).filter(r=>sehV760NoTeamRecent(r,age)&&matches(r))
      : [];

    const silhouette='<svg viewBox="0 0 160 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path fill="#030609" d="M0 300V232Q0 210 40 195L57 184V164Q39 150 38 118Q28 114 32 98L37 94Q26 44 65 35Q98 18 121 50Q132 70 124 96Q136 100 126 119Q124 150 105 165V184L124 195Q160 210 160 232V300Z"/></svg>';

    const cardHtml=(r,isNoTeam)=>{
      const name=r.display_gamertag||r.player_key||(isNoTeam?'Spelare':'Free Agent');
      const positions=String(r.positions_text||r.primary_position||'–').split(/[,;/|]+/).map(x=>x.trim()).filter(Boolean);
      const levels=isNoTeam?[]:String(r.levels_text||r.looking_for_levels||'Öppen för förslag').split(/[,;/|]+/).map(x=>x.trim()).filter(Boolean);
      const photo=sehV760PhotoIsMissing(r.player_image)?'':sehWebAppPlayerImage(r.player_image,r.sports_gamer_player_url||'');
      const rank=Number(r.overall_rank)>0?'#'+r.overall_rank:'ORANKAD';
      const rp=Number.isFinite(Number(r.ranking_points))?Number(r.ranking_points).toLocaleString('sv-SE'):'–';
      const facts=isNoTeam
        ? `<div class="seh-fa-facts"><div><small>SENAST KÄNDA LAG</small><strong>${htmlEscape(r.latest_team||'–')}</strong></div><div><small>SENASTE TURNERING</small><strong>${htmlEscape(r.latest_season||'–')}</strong></div></div>`
        : `<div class="seh-fa-facts"><div><small>SENASTE ECL-LAG</small><strong>${htmlEscape(r.latest_ecl_team||'–')}</strong></div><div><small>DIVISION</small><strong>${htmlEscape(r.latest_ecl_division||'–')}</strong></div></div>`;
      const status=isNoTeam
        ? '<div class="seh-fa-status-note">Ej registrerad som Free Agent</div>'
        : `<div><small>SÖKER</small><div class="seh-fa-tags">${levels.map(l=>`<b>${htmlEscape(l)}</b>`).join('')}</div></div>`;
      const details=isNoTeam?'':`${r.availability?`<p class="seh-fa-detail"><small>TILLGÄNGLIGHET</small>${htmlEscape(r.availability)}</p>`:''}${r.message?`<p class="seh-fa-detail">${htmlEscape(r.message)}</p>`:''}`;
      const footerDate=isNoTeam
        ? (r.last_appearance_date?`Senast aktiv ${htmlEscape(sehV760FmtDate(r.last_appearance_date))}`:'Senast aktiv okänt')
        : (r.fa_date?`FA sedan ${htmlEscape(sehV760FmtDate(r.fa_date))}`:'');
      return `<article class="seh-fa-card${isNoTeam?' is-no-team':''}"><div class="seh-fa-portrait">${silhouette}${photo?`<img src="${htmlEscape(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span>${isNoTeam?'INGET AKTUELLT LAG':'FREE AGENT'}</span></div><div class="seh-fa-content"><div class="seh-fa-topline"><span class="seh-fa-rank">${rank}</span><strong>${rp} RP</strong></div><h2>${htmlEscape(name)}</h2><div class="seh-fa-tags">${positions.map(p=>`<b>${htmlEscape(p)}</b>`).join('')}</div>${facts}<div class="seh-fa-career"><small>KARRIÄR</small>${r.player_key?`${Number(r.career_games||0).toLocaleString('sv-SE')} GP · ${Number(r.total_points||0).toLocaleString('sv-SE')} PTS`:'–'}</div>${status}${details}<div class="seh-fa-footer">${footerDate?`<span>${footerDate}</span>`:''}${!isNoTeam&&r.contact?`<span>${htmlEscape(r.contact)}</span>`:''}${r.player_key?`<button type="button" class="seh-fa-open" data-v760-player-key="${htmlEscape(r.player_key)}" data-v760-player-name="${htmlEscape(name)}">Öppna profil →</button>`:'<span>Manuell FA-post</span>'}</div></div></article>`;
    };

    const blocks=[];
    if(freeAgents.length){
      blocks.push(`<div class="seh-v760-fa-section-title">Aktiva Free Agents · ${freeAgents.length}</div>`);
      blocks.push(freeAgents.map(r=>cardHtml(r,false)).join(''));
    }
    if(showNoTeam&&noTeam.length){
      blocks.push(`<div class="seh-v760-fa-section-title">Utan aktuellt lag · ${noTeam.length}</div>`);
      blocks.push(noTeam.map(r=>cardHtml(r,true)).join(''));
    }
    if(!blocks.length){
      blocks.push('<div class="seh-v760-card"><p>Inga spelare matchar filtret.</p></div>');
    }
    host.innerHTML=blocks.join('');

    const extraStatus=layer.querySelector('#seh-v760-fa-extra-status');
    if(showNoTeam&&extraStatus){
      extraStatus.hidden=false;
      if(layer.sehNoTeamLoading)extraStatus.textContent='Hämtar spelare utan aktuellt lag…';
      else if(layer.sehNoTeamLoaded){
        const label=age==='all'?'alla registrerade':`senaste ${age} månaderna`;
        extraStatus.textContent=`${noTeam.length.toLocaleString('sv-SE')} utan aktuellt lag · ${label}`;
      }
    }else if(extraStatus){
      extraStatus.hidden=true;
    }

    host.querySelectorAll('.seh-fa-portrait img').forEach(sehBindFreeAgentPhoto);
    host.querySelectorAll('[data-v760-player-key]').forEach(btn=>btn.addEventListener('click',()=>{
      sehV760OpenPlayer(btn.dataset.v760PlayerKey,btn.dataset.v760PlayerName);
    }));
  }

  async function sehV760SubmitFa(type){
    const layer=document.getElementById('seh-app-free-agents'),status=layer?.querySelector('#seh-v760-fa-status'),client=sehV760Client();if(!layer||!client)return;if(status){status.className='seh-v760-status';status.textContent=type==='remove'?'Skickar borttagningsbegäran…':'Skickar till admin…';}
    const args={p_request_type:type,p_positions_text:type==='remove'?null:String(layer.querySelector('#seh-v760-fa-pos')?.value||'').trim(),p_levels_text:type==='remove'?null:String(layer.querySelector('#seh-v760-fa-level')?.value||'').trim(),p_availability:type==='remove'?null:String(layer.querySelector('#seh-v760-fa-avail')?.value||'').trim(),p_message:type==='remove'?null:String(layer.querySelector('#seh-v760-fa-msg')?.value||'').trim(),p_contact:type==='remove'?null:String(layer.querySelector('#seh-v760-fa-contact')?.value||'').trim()};
    const r=await client.rpc('seh_submit_free_agent_request',args);if(r.error){if(status){status.textContent=`Fel: ${r.error.message}`;status.classList.add('error');}return;}if(status){status.textContent=type==='remove'?'Borttagningsbegäran är skickad.':'Förfrågan är skickad och väntar på admin.';status.classList.add('success');}setTimeout(()=>{if(layer.isConnected&&route().kind==='free-agents')sehEnsureFreeAgentsPage(true);},350);
  }

  function sehV760EnsureEcl27Entry(){
    const winterReady=location.hash.startsWith('#/sasong/ecl27winter')&&!!document.querySelector('#ecl27v2Grid > *');
    document.body.classList.toggle('seh-winter-compact',winterReady);
    if(!document.getElementById('seh-winter-compact-style')){
      const style=document.createElement('style');style.id='seh-winter-compact-style';style.textContent=`
        body.seh-winter-compact .season-hero-v12840{padding:12px!important;margin:0 0 10px!important;min-height:0!important}
        body.seh-winter-compact .season-hero-v12840 h1{font-size:25px!important;margin:4px 0!important}
        body.seh-winter-compact .season-hero-v12840__side,
        body.seh-winter-compact .season-overview,
        body.seh-winter-compact .season-hero-v12840__copy>p{display:none!important}
        body.seh-winter-compact #ecl27TeamBuildsV2 h2{font-size:24px!important}
        body.seh-winter-compact #ecl27TeamBuildsV2 h3{font-size:21px!important}
        body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-head{padding:12px!important}
        body.seh-winter-compact #ecl27TeamBuildsV2 .ecl27v2-toolbar{padding:12px!important;gap:10px!important}
      `;document.head.appendChild(style);
    }
    document.getElementById('seh-ecl27-entry')?.remove();
    if(route().kind!=='ecl')return;
    const main=document.querySelector('main.ecl-hub-shell-v12840');if(!main)return;
    if(!document.getElementById('seh-ecl-hub-style')){
      const style=document.createElement('style');style.id='seh-ecl-hub-style';style.textContent=`
        main.seh-ecl-hub-compact{padding:12px!important;min-height:0!important}
        main.seh-ecl-hub-compact> :not(#seh-ecl-hub){display:none!important}
        #seh-ecl-hub{color:#f5f6f8;font-family:Inter,Arial,sans-serif}
        #seh-ecl-hub h1{font-size:27px!important;margin:0 0 5px!important}
        #seh-ecl-hub p{font-size:13px!important;line-height:1.45!important;margin:5px 0 15px!important;color:#aab3c0}
        #seh-ecl-hub label,#seh-ecl-hub .eyebrow{display:block;font-size:10px;font-weight:800;letter-spacing:1px;color:#77e4df;margin-bottom:8px}
        #seh-ecl-hub select{width:100%;min-height:46px;border:1px solid #475260;border-radius:10px;background:#0b121d;color:#fff;padding:10px;font-size:15px;margin-bottom:14px}
        #seh-ecl-hub .season-card{padding:16px;border:1px solid #cfb55766;border-radius:16px;background:linear-gradient(135deg,#101e2d,#080c14)}
        #seh-ecl-hub h2{font-size:22px!important;margin:0 0 8px!important}
        #seh-ecl-hub a{box-sizing:border-box;text-decoration:none;color:#f7f8fa}
        #seh-ecl-hub .primary{display:block;border-radius:10px;background:#ffe000;color:#111;padding:14px;font-size:14px;font-weight:850;text-align:center}
        #seh-ecl-hub .views{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}
        #seh-ecl-hub .views a{padding:16px 10px;background:#101824;border:1px solid #293749;border-radius:10px;font-size:14px;font-weight:750;text-align:center}
        #seh-ecl-hub .secondary{display:block;padding:15px 0;color:#81e6df;font-size:13px}
      `;document.head.appendChild(style);
    }
    const seasons=[{id:'ecl27winter',title:'Svenska lagbyggen',sections:[]},{id:'ecl26spring',title:'ECL ’26: Spring',sections:['matches','transfers','teams','statistics']}];
    const labels={matches:'Matcher',transfers:'Byten',teams:'Lag',statistics:'Statistik'};
    main.querySelectorAll('.ecl-archive-card-v12852').forEach(card=>{
      const id=(card.getAttribute('href')||'').match(/^#\/sasong\/([a-z0-9-]+)$/)?.[1];
      if(!id||seasons.some(s=>s.id===id))return;
      const text=card.querySelector('small')?.textContent||'';
      seasons.push({id,title:card.querySelector('strong')?.textContent||id,sections:Object.keys(labels).filter(key=>text.split(' · ').includes(labels[key]))});
    });
    let hub=main.querySelector('#seh-ecl-hub');
    const signature=JSON.stringify(seasons);
    if(hub?.dataset.seasons===signature)return;
    const selected=hub?.querySelector('select')?.value||'ecl27winter';
    if(!hub){hub=document.createElement('section');hub.id='seh-ecl-hub';main.prepend(hub);}
    main.classList.add('seh-ecl-hub-compact');hub.dataset.seasons=signature;
    hub.innerHTML=`<h1>Tävlingar</h1><p>ECL, ITHL och LGEL · svenska lag och spelarstatistik.</p><label for="seh-ecl-season-select">VÄLJ LIGA OCH SÄSONG</label><select id="seh-ecl-season-select">${seasons.map(s=>`<option value="${s.id}">${htmlEscape(s.title)}</option>`).join('')}</select><div class="season-card" id="seh-ecl-season-summary"></div><a class="secondary" href="${ROOT}#/free-agents" data-load>Free Agents · hitta spelare →</a>`;
    const select=hub.querySelector('select');select.value=seasons.some(s=>s.id===selected)?selected:'ecl27winter';
    const render=()=>{
      const season=seasons.find(s=>s.id===select.value);if(!season)return;
      const winter=season.id==='ecl27winter',base=`${ROOT}#/sasong/${season.id}`;
      hub.querySelector('#seh-ecl-season-summary').innerHTML=`<span class="eyebrow">${winter?'LAGBYGGEN JUST NU':'SÄSONGSARKIV'}</span><h2>${htmlEscape(season.title)}</h2><p>${winter?'Trupper och spelarbyten inför ECL, SCL, ITHL och andra turneringar.':'Välj den del av säsongen du vill följa.'}</p><a class="primary" data-load href="${base}">${winter?'Svenska lagbyggen →':'Öppna säsongsöversikt →'}</a>${season.sections.length?`<nav class="views" aria-label="Säsongens innehåll">${season.sections.map(key=>`<a data-load href="${base}?section=${key}">${labels[key]}</a>`).join('')}</nav>`:'<p>Aktuella lagbyggen – inte officiella turneringsrosters.</p>'}`;
    };select.addEventListener('change',render);render();sehDarkSeasonPicker(select);
  }
  function sehDarkSeasonPicker(select){
    const picker=document.createElement('details');picker.id='seh-season-picker';
    const summary=document.createElement('summary');summary.setAttribute('aria-label','Välj liga och säsong');
    const choices=document.createElement('div');choices.className='seh-season-choices';
    const sync=()=>{summary.textContent=select.selectedOptions[0]?.textContent||'Välj säsong';choices.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===select.value)));};
    Array.from(select.options).forEach(option=>{
      const button=document.createElement('button');button.type='button';button.dataset.value=option.value;button.textContent=option.textContent;
      button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));picker.open=false;summary.focus();};choices.append(button);
    });
    picker.append(summary,choices);select.after(picker);select.hidden=true;select.style.setProperty('display','none','important');
    const label=select.previousElementSibling;if(label?.tagName==='LABEL'){label.removeAttribute('for');}
    select.addEventListener('change',sync);picker.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.open=false;summary.focus();}});sync();
  }

  function sehSmallScreenStyle(){
    if(document.getElementById('seh-small-screen-fixes'))return;
    const style=document.createElement('style');style.id='seh-small-screen-fixes';style.textContent=`
      #seh-season-picker{color-scheme:dark;margin:0 0 14px;border:1px solid #475260;border-radius:12px;background:#0b121d;color:#f5f6f8}
      #seh-season-picker summary{padding:14px;min-height:46px;box-sizing:border-box;font:750 15px/1.4 Inter,Arial,sans-serif;cursor:pointer;overflow-wrap:anywhere}
      #seh-season-picker .seh-season-choices{max-height:50vh;overflow:auto;padding:4px 8px 8px}
      #seh-season-picker button{display:block;width:100%;min-height:46px;padding:12px;text-align:left;background:#0b121d;border:0;border-top:1px solid #293749;color:#fff;font:700 14px/1.4 Inter,Arial,sans-serif;white-space:normal}
      #seh-season-picker button[aria-pressed="true"]{color:#ffe000;background:#24200d}
      #seh-season-picker :focus-visible{outline:2px solid #72e4de;outline-offset:-3px}
      body.seh-route-players .seh-player-filter-role{grid-column:1 / -1!important}
      body.seh-route-players .seh-zero-role-buttons{display:flex!important;flex-wrap:wrap!important;width:100%!important}
      body.seh-route-players .seh-zero-role-buttons button{flex:1 0 auto!important;width:auto!important;min-width:max-content!important;min-height:42px!important;height:auto!important;padding:10px 9px!important;font-size:12px!important;white-space:normal!important;overflow:visible!important}
      body.seh-route-teams .seh-ct-stat{min-width:0!important;padding:7px 5px!important}
      body.seh-route-teams .seh-ct-stat b{font-size:9px!important;letter-spacing:0!important;white-space:normal!important;overflow-wrap:anywhere!important;line-height:1.3!important}
      body.seh-route-teams .seh-ct-latest{height:auto!important;max-height:none!important;min-height:36px!important;flex-wrap:wrap!important;gap:3px!important}
      body.seh-route-teams .seh-ct-latest span,body.seh-route-teams .seh-ct-name{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;height:auto!important;max-height:none!important}
      body.seh-route-teams [data-seh-team-rp]{display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:2px 7px!important;font-size:11px!important;padding:7px 4px!important;grid-area:auto!important}
      body.seh-route-teams [data-seh-team-rp] span{white-space:nowrap}
      body.seh-route-players .seh-directory-card-v3 .seh-zero-player-name{white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere!important;height:auto!important;min-height:34px!important;line-height:1.2!important}
      body.seh-route-players .seh-zero-player-teamcopy strong,body.seh-route-players .seh-zero-player-teamcopy small{display:block!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;-webkit-line-clamp:unset!important;overflow-wrap:anywhere!important}
      body.seh-route-players .seh-zero-player-statrow{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)!important}
      body.seh-route-players .seh-zero-player-statrow strong{white-space:normal!important;overflow-wrap:anywhere!important;font-size:clamp(11px,3.3vw,14px)!important;line-height:1.25!important}
      body.seh-content-mode .seh-player-native-facts>div{grid-template-columns:34px minmax(0,1fr)!important;gap:9px!important}
      body.seh-content-mode .seh-player-native-facts em,body.seh-content-mode .seh-player-native-facts em.team-logo{position:static!important;width:30px!important;height:30px!important;min-width:0!important;margin:0!important;transform:none!important}
      body.seh-content-mode .seh-player-native-facts em.team-logo img{position:static!important;width:28px!important;height:28px!important;max-width:100%!important;object-fit:contain!important;transform:none!important}
      body.seh-route-article .news-article-page figure,body.seh-route-article .news-article-page picture{height:auto!important;max-height:none!important;aspect-ratio:auto!important}
      body.seh-route-article .news-article-page img{height:auto!important;max-height:none!important;object-fit:contain!important;aspect-ratio:auto!important}
      body.seh-route-news picture.news-card__hero{display:block!important;height:auto!important;max-height:none!important;aspect-ratio:auto!important}
      body.seh-route-news picture.news-card__hero img{display:block!important;width:100%!important;height:auto!important;max-height:none!important;object-fit:contain!important;aspect-ratio:auto!important}
      @media(max-width:380px){
        body.seh-route-teams .seh-ct-stats{grid-template-columns:minmax(0,1fr)!important}
        body.seh-route-teams .seh-ct-stat{flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:5px!important;min-height:32px!important}
        body.seh-route-teams .seh-ct-stat b{margin:0!important;white-space:nowrap!important}
        body.seh-route-teams .seh-ct-stat>span{font-size:14px!important}
        body.seh-content-mode .seh-player-native-overview-grid{grid-template-columns:minmax(0,1fr)!important}
        body.seh-content-mode .seh-player-native-heading h2{font-size:20px!important;line-height:1.2!important;white-space:normal!important}
        body.seh-route-players .seh-zero-player-teamrow{grid-template-columns:26px minmax(0,1fr)!important;padding:7px 4px!important;gap:5px!important}
        body.seh-route-players .seh-zero-player-teamlogo{width:25px!important;height:25px!important}
        #seh-native-top .logo{flex:0 1 70px!important;min-width:36px!important}
        #seh-native-top .logo img{max-width:100%!important}
        #seh-native-top .title{min-width:0!important;flex:1!important}
        #seh-native-title{font-size:17px!important}
        #seh-native-top .title small{font-size:8px!important}
      }
    `;document.head.append(style);
  }
  async function sehV760OpenEcl27(teamId=0){
    // Keep legacy return links on the public, working Winter page.
    sehV760CloseLayer(false);
    nativeNavigate(`${ROOT}#/sasong/ecl27winter`);
  }
  function sehV760RenderEcl27List(){
    const layer=document.getElementById('seh-v760-layer'),host=layer?.querySelector('#seh-v760-ecl-list');if(!host)return;const q=String(layer.querySelector('#seh-v760-ecl-search')?.value||'').trim().toLocaleLowerCase('sv-SE');const div=String(layer.querySelector('#seh-v760-ecl-div')?.value||'');const rows=(sehV760LayerState.teams||[]).filter(t=>{const roster=Array.isArray(t.current_roster)?t.current_roster:[];const hay=[t.name,...roster.map(p=>p.display_gamertag)].join(' ').toLocaleLowerCase('sv-SE');return(!q||hay.includes(q))&&(!div||t.division===div);});
    host.innerHTML=rows.map((t,i)=>{const roster=Array.isArray(t.current_roster)?t.current_roster:[];const moves=Array.isArray(t.movements)?t.movements:[];const latest=moves[0];return `<button class="seh-v760-team" type="button" data-v760-ecl-team="${i}"><div class="seh-v760-row"><div><b>${htmlEscape(t.division||'')}</b><strong>${htmlEscape(t.name)}</strong><span>${roster.length} spelare${latest?` · Senast ${sehV760FmtDate(latest.occurred_at)}`:''}</span>${t.latest_recruitment?.text?`<span>Söker: ${htmlEscape(t.latest_recruitment.text)}</span>`:''}</div><b>›</b></div></button>`;}).join('');host.querySelectorAll('[data-v760-ecl-team]').forEach(btn=>btn.addEventListener('click',()=>sehV760OpenEcl27Team(rows[Number(btn.dataset.v760EclTeam)].id)));
  }
  function sehV760OpenEcl27Team(teamId){
    const layer=sehV760Layer(),team=(sehV760LayerState.teams||[]).find(t=>Number(t.id)===Number(teamId));if(!team)return sehV760OpenEcl27();sehV760LayerState.teamId=Number(teamId);const roster=Array.isArray(team.current_roster)?team.current_roster:[];const moves=Array.isArray(team.movements)?team.movements:[];
    layer.innerHTML=`<div class="seh-v760-shell">${sehV760Header(team.name,`Lagbyggen / ${team.division||''}`,true)}<div class="seh-v760-card"><div class="seh-v760-row"><div><span class="seh-v760-kicker">AKTUELL KÄND TRUPP</span><h2>${roster.length} spelare</h2><p>Baseline är ECL ’26 Spring. Senaste daterade IN/UT/Free Agent gäller.</p></div></div>${team.source_team_id?`<div class="seh-v760-actions"><button class="seh-v760-btn" data-v760-team-profile>Öppna lagprofil</button></div>`:''}</div>${team.latest_recruitment?`<div class="seh-v760-card"><span class="seh-v760-kicker">SENASTE SÖKPOST</span><h3>${htmlEscape(team.latest_recruitment.text||'Söker spelare')}</h3><p>${sehV760FmtDate(team.latest_recruitment.posted_at)}</p></div>`:''}<div class="seh-v760-card"><span class="seh-v760-kicker">TRUPP</span><div id="seh-v760-roster">${roster.length?roster.map((p,i)=>`<button class="seh-v760-player" type="button" data-v760-roster-player="${i}" ${String(p.subject_key||'').startsWith('GT:')?'disabled':''}><img src="${htmlEscape(sehWebAppPlayerImage(p.player_image||'',p.sports_gamer_player_url||''))}" alt=""><span><strong>${htmlEscape(p.display_gamertag)}</strong><span>${htmlEscape(p.primary_position||'')}</span></span><b>›</b></button>`).join(''):'<p>Ingen aktuell trupp bekräftad ännu.</p>'}</div></div><div class="seh-v760-card"><span class="seh-v760-kicker">IN / UT / FREE AGENT</span>${moves.length?moves.slice(0,80).map(m=>`<div class="seh-v760-movement ${htmlEscape(m.event_type||'')}"><b>${m.event_type==='free_agent'?'FA':String(m.event_type||'').toUpperCase()}</b> ${htmlEscape(m.display_gamertag||m.source_gamertag||'')} ${m.from_team&&m.to_team?`· ${htmlEscape(m.from_team)} → ${htmlEscape(m.to_team)}`:''}<time>${sehV760FmtDate(m.occurred_at)}</time></div>`).join(''):'<p>Inga daterade rörelser registrerade.</p>'}</div></div>`;
    sehV760BindClose(layer,()=>sehV760OpenEcl27());layer.querySelector('[data-v760-team-profile]')?.addEventListener('click',()=>{try{sessionStorage.setItem('seh_v760_ecl27_return',JSON.stringify({teamId:team.id,ts:Date.now()}));}catch(_){}sehV760CloseLayer(false);nativeNavigate(`${ROOT}#/lag/${encodeURIComponent(team.source_team_id)}`);});layer.querySelectorAll('[data-v760-roster-player]').forEach(btn=>btn.addEventListener('click',()=>{const p=roster[Number(btn.dataset.v760RosterPlayer)];sehV760OpenPlayer(p.subject_key,p.display_gamertag,{teamId:team.id});}));
  }
  function sehV760MaybeRestoreEcl27(){
    if(route().kind!=='ecl'||document.getElementById('seh-v760-layer')?.classList.contains('show'))return;
    try{const raw=sessionStorage.getItem('seh_v760_ecl27_return');if(!raw)return;const state=JSON.parse(raw);if(!state||Date.now()-Number(state.ts||0)>20*60*1000){sessionStorage.removeItem('seh_v760_ecl27_return');return;}sessionStorage.removeItem('seh_v760_ecl27_return');sehV760OpenEcl27(Number(state.teamId)||0);}catch(_){}
  }
  const SEH_ONBOARDING_KEY='seh_onboarding_completed_v1';
  function sehOnboardingDone(){try{return localStorage.getItem(SEH_ONBOARDING_KEY)==='1';}catch(_){return false;}}
  function sehOnboardingComplete(){localStorage.setItem(SEH_ONBOARDING_KEY,'1');}
  function sehOnboardingScreen(title,body){
    const layer=sehV760Layer();sehV760LayerState.kind='onboarding';layer.classList.add('show');
    layer.innerHTML=`<style>
      #seh-v760-layer:has(.seh-onboarding){padding-top:clamp(24px,7vh,56px)}
      .seh-onboarding{max-width:480px;padding:0 4px 24px}
      .seh-onboarding .seh-v760-head{margin-bottom:24px}
      .seh-onboarding .seh-v760-head small{color:#72e4de;font-size:11px;line-height:1.6;letter-spacing:.1em}
      .seh-onboarding .seh-v760-head h1{font-size:clamp(30px,8.7vw,38px);line-height:1.12;letter-spacing:-.035em;margin-top:12px;text-wrap:balance}
      .seh-onboarding .seh-v760-card{padding:22px 20px;border-radius:22px;border-color:#d6b15f40;background:radial-gradient(ellipse at top left,#10232e,#080c15 75%);box-shadow:0 12px 40px #0003}
      .seh-onboarding .seh-v760-card p{font-size:17px;line-height:1.6;color:#d9dfe7;margin:0 0 20px}
      .seh-onboarding .seh-v760-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:24px}
      .seh-onboarding .seh-v760-btn{width:100%;min-height:56px;padding:16px;font-size:17px;line-height:1.3;border-radius:14px}
      .seh-onboarding .seh-v760-btn.gold{background:linear-gradient(110deg,#f1cf6c,#d6b15f);border-color:#f1cf6c}
      .seh-onboarding .seh-v760-btn:focus-visible{outline:3px solid #72e4de;outline-offset:3px}
      .seh-onboarding .seh-v760-actions+p{font-size:14px;line-height:1.55;color:#b4becb;margin:20px 0 0}
      .seh-onboarding label{font-size:17px;line-height:1.5;color:#edf1f5;padding:12px 0}
      .seh-onboarding input[type=checkbox]{flex-shrink:0;accent-color:#f1cf6c}
      @media(max-width:350px){.seh-onboarding .seh-v760-card{padding:20px 16px}.seh-onboarding .seh-v760-btn{font-size:16px}}
    </style><div class="seh-v760-shell seh-onboarding"><div class="seh-v760-head"><div><small>VÄLKOMMEN TILL SVENSK eHOCKEY</small><h1>${title}</h1></div></div>${body}</div>`;
    return layer;
  }
  function sehOnboardingPush(onFinish=()=>sehV760CloseLayer()){
    if(window.__SEH_WEB_APP__){sehOnboardingComplete();onFinish();return;}
    // A visible app choice is not Android permission. Ask the OS only after Continue.
    const layer=sehOnboardingScreen('Håll dig uppdaterad',`<div class="seh-v760-card"><p>Välj om du vill få nyheter, SEC och ECL-uppdateringar. Du kan ändra kategorierna under Hem senare.</p><label style="display:flex;gap:12px;align-items:center;min-height:48px"><input id="seh-onboarding-push" type="checkbox" checked style="width:24px;height:24px"><span>Jag vill ha pushnotiser</span></label><div class="seh-v760-actions"><button class="seh-v760-btn gold" id="seh-onboarding-finish">Fortsätt</button></div><p id="seh-onboarding-push-status" role="status"></p></div>`);
    layer.querySelector('#seh-onboarding-finish').onclick=async event=>{
      const wanted=layer.querySelector('#seh-onboarding-push').checked;
      event.currentTarget.disabled=true;sehOnboardingComplete();
      if(wanted){
        const enabled=await sehEnablePushNotifications();
        if(!enabled){
          layer.querySelector('#seh-onboarding-push-status').textContent='Notiser aktiverades inte. Du kan försöka igen under Hem.';
          const button=layer.querySelector('#seh-onboarding-finish');button.textContent='Öppna appen';button.disabled=false;button.onclick=onFinish;return;
        }
      }else if(localStorage.getItem(NOTIFY_KEY)==='1'){await sehDisablePushNotifications();}
      else{localStorage.setItem(NOTIFY_KEY,'0');}
      onFinish();
    };
  }
  async function sehOnboardingAfterLogin(){
    window.__SEH_ONBOARDING_SHOWN__=true;
    sehOnboardingScreen('Ditt konto','<div class="seh-v760-card"><p>Hämtar kontostatus…</p></div>');
    const result=await sehV760LoadAccount();
    if(sehV760LayerState.kind!=='onboarding')return;
    if(!result.session||result.error){
      const layer=sehOnboardingScreen('Fortsätt när du vill','<div class="seh-v760-card"><p>Kontostatus kunde inte läsas just nu. Du kan fortsätta använda appen och öppna Min profil senare. En eventuell inloggning behålls.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" id="seh-ob-retry">Försök igen</button><button class="seh-v760-btn" id="seh-ob-guest">Fortsätt till appen</button></div></div>');
      layer.querySelector('#seh-ob-retry').onclick=sehOnboardingAfterLogin;
      layer.querySelector('#seh-ob-guest').onclick=()=>{sehOnboardingComplete();sehOnboardingPush();};return;
    }
    const status=result.account?.status;
    if(status==='wrong_provider'){
      const layer=sehOnboardingScreen('Logga in med Discord','<div class="seh-v760-card"><p>Det befintliga kontot använder en annan inloggning. Spelarkoppling kräver Discord.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" id="seh-ob-discord">Byt till Discord</button><button class="seh-v760-btn" id="seh-ob-guest">Fortsätt till appen</button></div></div>');
      layer.querySelector('#seh-ob-discord').onclick=()=>sehV760DiscordLogin('#/');
      layer.querySelector('#seh-ob-guest').onclick=()=>{sehOnboardingComplete();sehOnboardingPush();};return;
    }
    if(status==='approved'||status==='pending'){sehOnboardingPush();return;}
    const layer=sehOnboardingScreen('Vill du koppla ett spelarkort?',`<div class="seh-v760-card"><p>Du är inloggad med Discord. En spelarkoppling är valfri och måste godkännas av admin.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" id="seh-ob-link">Koppla befintligt spelarkort</button><button class="seh-v760-btn" id="seh-ob-skip">Fortsätt utan spelarkort</button></div></div>`);
    layer.querySelector('#seh-ob-link').onclick=()=>sehOnboardingPush(()=>{sehOnboardingComplete();sehV760OpenAccount();});
    layer.querySelector('#seh-ob-skip').onclick=()=>{sehOnboardingComplete();sehOnboardingPush();};
  }
  function sehEnsureOnboarding(){
    if(sehOnboardingDone()||window.__SEH_ONBOARDING_SHOWN__)return;
    window.__SEH_ONBOARDING_SHOWN__=true;
    // Keep a usable screen when OAuth was cancelled. A successful callback
    // replaces it through sehV760CompleteOauthReturn; no blank ten-minute wait.
    const layer=sehOnboardingScreen('Din eHockey börjar här',`<div class="seh-v760-card"><p>Följ svenska spelare, lag och tävlingar. Logga in för att hantera ditt konto, eller utforska appen som gäst.</p><div class="seh-v760-actions"><button class="seh-v760-btn gold" id="seh-ob-discord">Logga in med Discord</button><button class="seh-v760-btn" id="seh-ob-guest">Fortsätt som gäst</button></div><p>Du kan alltid logga in senare via Min profil.</p></div>`);
    layer.querySelector('#seh-ob-discord').onclick=async()=>{
      const client=await sehV760WaitForClient();
      const current=client?await client.auth.getSession():null;
      if(current?.data?.session&&sehV760IsDiscord(current.data.session.user))sehOnboardingAfterLogin();
      else sehV760DiscordLogin('#/');
    };
    layer.querySelector('#seh-ob-guest').onclick=()=>{sehOnboardingComplete();sehOnboardingPush();};
  }
  function sehV760RefreshFeatures(){sehV760EnsureStyle();sehSmallScreenStyle();sehEnsureFreeAgentsPage();sehV760EnsureEcl27Entry();sehV760MaybeRestoreEcl27();sehEnsureOnboarding();sehSyncTeamRp();}

  function ensureAll(){unlockScrolling();ensureStyle();ensureTop();ensureBottom();ensureHome();ensureDirectory();ensureCompetitions();ensureMore();ensureFavorites();ensureLoader();sehEnsureRouteTransitionStage();if(window.__SEH_DESKTOP_DEV__||!['players','teams','player','team'].includes(route().kind))sehPrimeStoredRouteVisual();ensurePull();ensureOffline();installPullToRefresh();interceptLinks();sehInitializePushNotifications();}
  function refresh(){if(!document.body)return;ensureAll();setContentModeClasses();ensureNativeContentHead();applyAggressiveAppContent();ensureSecSubnav();ensureSecOverviewApp();if(route().kind==='player')showFastPlayerProfilePreview();adaptAppContent();installAdaptiveObserver();sehV760RefreshFeatures();closeOverlaysIfRouteChanged();refreshTop();refreshBottom();refreshHome();handleConsent();updateOnline();sehFinishRouteVisualTransition(false);sehCaptureRouteVisual();sehLastVisualKind=route().kind;

    // Results on Spelare/Lag load asynchronously. Two cheap one-shot follow-ups
    // catch them without bringing back the old 1.2-second full-page polling.
    if(['players','teams'].includes(route().kind)){
      setTimeout(()=>scheduleAdaptiveContent(0),450);
      setTimeout(()=>scheduleAdaptiveContent(0),1200);
    }

    if(route().kind==='player'){
      const playerRouteKey=location.pathname+location.hash;
      // V641: färre tunga fulla profil-adapteringar. MutationObserver fångar async-data;
      // dessa tre är bara fallback om webbens DOM uppdateras utan childList-mutation.
      [80,260,700,1300,2500,5000,10000].forEach(delay=>setTimeout(()=>{
        if(route().kind!=='player'||(location.pathname+location.hash)!==playerRouteKey)return;
        const native=document.querySelector('body > .seh-player-native-root');
        if(
          native?.dataset.routeKey===playerRouteKey &&
          native.dataset.provisional!=='1' &&
          native.dataset.sourceSparse!=='1'
        ){
          document.body.classList.remove('seh-loading');
          return;
        }
        scheduleAdaptiveContent(0);
      },delay));
    }

    setTimeout(()=>{
      if(route().kind==='player'){
        const native=document.querySelector('body > .seh-player-native-root');
        if(native?.dataset.routeKey===(location.pathname+location.hash))document.body.classList.remove('seh-loading');
        return;
      }
      document.body.classList.remove('seh-loading');
    },500);
  }
  let lastRoute='';function closeOverlaysIfRouteChanged(){const now=location.pathname+location.hash;if(lastRoute&&lastRoute!==now){document.getElementById('seh-app-directory')?.classList.remove('show');document.getElementById('seh-app-competitions')?.classList.remove('show');document.getElementById('seh-app-more')?.classList.remove('show');document.getElementById('seh-app-favorites')?.classList.remove('show');}lastRoute=now;}

  function sehPrepareResolvedRouteTransition(){
    const nextKind=route().kind;
    if(!window.__SEH_DESKTOP_DEV__ && ['players','teams','player','team'].includes(nextKind)){
      sehLastVisualKind=nextKind;
      document.body?.classList.remove('seh-route-transitioning');
      document.getElementById('seh-route-transition-stage')?.replaceChildren();
      return;
    }
    if(
      ['players','teams'].includes(nextKind) &&
      sehLastVisualKind!==nextKind &&
      sehPendingVisualRoute!==nextKind
    ){
      sehBeginRouteVisualTransition(location.href,sehLastVisualKind);
    }
    sehLastVisualKind=nextKind;
  }

  if(!window.__SEH_NATIVE_APP_SHELL__){
    window.addEventListener('hashchange',()=>{
      sehPrepareResolvedRouteTransition();
      const softEclSwitch=!!(
        __sehEclSoftSeasonNav &&
        Date.now()-Number(__sehEclSoftSeasonNav.started||0)<1800 &&
        route().kind==='ecl-season' &&
        sehEclSeasonRouteInfo(location.href)?.seasonId===__sehEclSoftSeasonNav.seasonId
      );
      if(softEclSwitch){
        // Do not put the full-screen app loader over a same-season tab switch.
        document.body?.classList.remove('seh-loading','seh-route-transitioning');
        document.getElementById('seh-route-transition-stage')?.replaceChildren();
        setTimeout(refresh,20);
        setTimeout(()=>{
          if(route().kind!=='ecl-season')return;
          document.body?.classList.remove('seh-loading','seh-route-transitioning');
          scheduleAdaptiveContent(0);
        },180);
        return;
      }
      if(isSec() && !isSecCup()){
        document.body?.classList.remove('seh-loading');
        ensureSecOverviewApp();
      }else if(route().kind==='player'){
        // V643: visa kortdatan först. Lägg inte den heltäckande skeleton-loadern ovanpå
        // en profil som vi redan kan rita direkt från spelarlistans cache.
        const hasFastPreview=showFastPlayerProfilePreview();
        if(!hasFastPreview)showLoading();
      }else if(sehPendingVisualRoute===route().kind && ['players','teams'].includes(route().kind)){
        if(sehPendingVisualUsedCache)document.body?.classList.remove('seh-loading');
        else showLoading();
      }else{
        showLoading();
      }
      setTimeout(refresh,45);
    });window.addEventListener('popstate',()=>{
      sehPrepareResolvedRouteTransition();
      if(sehRestoreNativePlayerReturnView())return;
      setTimeout(refresh,70);
    });window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);window.addEventListener('change',()=>scheduleAdaptiveContent(120),true);window.__SEH_CONSENT_TIMER__=setInterval(handleConsent,1200);window.__SEH_CONTENT_TIMER__=setInterval(()=>{
      ensureNativeContentHead();
      ensureSecSubnav();
      ensureSecOverviewApp();
      installAdaptiveObserver();

      // Safety net for async registers. The player directory becomes static
      // after its first successful capture, so do not rescan 1300+ hidden cards
      // every five seconds.
      const rk=route().kind;
      if(rk==='teams' || (rk==='players' && !playerDirectoryStable())) scheduleAdaptiveContent(0);
    },5000);window.__SEH_NATIVE_APP_SHELL__={refresh};
  }
  if(!window.__SEH_DESKTOP_DEV__){
    try{
      sessionStorage.removeItem('seh-route-visual-v740:players');
      sessionStorage.removeItem('seh-route-visual-v740:teams');
    }catch(_){}
  }
  refresh();
})();
