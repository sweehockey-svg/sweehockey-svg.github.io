(() => {
  'use strict';

  // Mobile phones and installed/forced web-app mode already have their own For dig implementation.
  if (window.__SEH_WEB_APP__ || document.documentElement.classList.contains('seh-web-app')) return;

  function ensureRuntimeStyles() {
    if (document.getElementById('seh-desktop-for-you-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'seh-desktop-for-you-runtime-style';
    style.textContent = "/* Desktop home: replace the right hero identity with a compact personal For dig panel for signed-in users. */\n@media (min-width:1101px) {\n  .home-stage__identity.home-stage__identity--for-you {\n    display:flex;\n    align-items:stretch;\n    min-height:0;\n    padding:clamp(15px,2vh,24px) clamp(16px,2vw,28px);\n  }\n\n  .home-stage__identity.home-stage__identity--for-you::before {\n    inset:6% 4%;\n    opacity:.28;\n  }\n\n  .seh-desktop-for-you {\n    position:relative;\n    z-index:2;\n    box-sizing:border-box;\n    width:100%;\n    min-width:0;\n    min-height:0;\n    display:flex;\n    flex-direction:column;\n    justify-content:center;\n    gap:9px;\n    padding:clamp(10px,1.2vh,14px);\n    border:1px solid rgba(214,177,95,.20);\n    border-radius:18px;\n    background:\n      radial-gradient(circle at 100% 0,rgba(214,177,95,.075),transparent 34%),\n      linear-gradient(145deg,rgba(8,17,34,.93),rgba(4,8,17,.90));\n    box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 14px 36px rgba(0,0,0,.16);\n    overflow:hidden;\n  }\n\n  .seh-dfy__head {\n    display:flex;\n    align-items:center;\n    justify-content:space-between;\n    gap:10px;\n  }\n\n  .seh-dfy__head > div {\n    display:grid;\n    gap:1px;\n  }\n\n  .seh-dfy__head small,\n  .seh-dfy__identity small,\n  .seh-dfy__mini small {\n    color:#d6b15f;\n    font-size:8px;\n    font-weight:950;\n    letter-spacing:.13em;\n  }\n\n  .seh-dfy__head h2 {\n    margin:0;\n    color:#f5f1e8;\n    font-size:clamp(20px,1.55vw,27px);\n    line-height:1;\n    letter-spacing:-.035em;\n  }\n\n  .seh-dfy__head > span {\n    padding:4px 7px;\n    border:1px solid rgba(77,218,156,.26);\n    border-radius:999px;\n    color:#6ee7aa;\n    background:rgba(77,218,156,.055);\n    font-size:8px;\n    font-weight:950;\n    letter-spacing:.11em;\n  }\n\n  .seh-dfy__identity {\n    display:grid;\n    grid-template-columns:54px minmax(0,1fr) auto;\n    align-items:center;\n    gap:10px;\n    min-height:68px;\n    padding:8px;\n    border:1px solid rgba(255,255,255,.075);\n    border-radius:14px;\n    background:rgba(2,7,15,.58);\n  }\n\n  .seh-dfy__avatar {\n    display:block;\n    width:54px;\n    height:54px;\n    overflow:hidden;\n    border:1px solid rgba(214,177,95,.28);\n    border-radius:12px;\n    background:#09162c;\n  }\n\n  .seh-dfy__avatar img {\n    display:block;\n    width:100%;\n    height:100%;\n    object-fit:cover;\n    object-position:center top;\n  }\n\n  .seh-dfy__identity > div {\n    display:grid;\n    min-width:0;\n    gap:2px;\n  }\n\n  .seh-dfy__identity strong,\n  .seh-dfy__identity span {\n    overflow:hidden;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n  }\n\n  .seh-dfy__identity strong {\n    color:#fff;\n    font-size:15px;\n  }\n\n  .seh-dfy__identity span {\n    color:#949eae;\n    font-size:10px;\n  }\n\n  .seh-dfy__profile-link,\n  .seh-dfy__pending a,\n  .seh-dfy__error button {\n    min-height:32px;\n    display:inline-grid;\n    place-items:center;\n    padding:0 10px;\n    border:1px solid rgba(214,177,95,.38);\n    border-radius:9px;\n    color:#f3d991;\n    background:rgba(214,177,95,.07);\n    font:inherit;\n    font-size:9px;\n    font-weight:900;\n    text-decoration:none;\n    cursor:pointer;\n  }\n\n  .seh-dfy__mini-grid {\n    display:grid;\n    grid-template-columns:repeat(2,minmax(0,1fr));\n    gap:7px;\n  }\n\n  .seh-dfy__mini {\n    display:grid;\n    min-width:0;\n    gap:3px;\n    min-height:64px;\n    padding:9px 10px;\n    border:1px solid rgba(255,255,255,.07);\n    border-radius:12px;\n    color:inherit;\n    background:rgba(255,255,255,.018);\n    text-decoration:none;\n  }\n\n  .seh-dfy__mini strong,\n  .seh-dfy__mini span {\n    overflow:hidden;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n  }\n\n  .seh-dfy__mini strong {\n    color:#eef1f6;\n    font-size:12px;\n  }\n\n  .seh-dfy__mini span {\n    color:#858e9c;\n    font-size:9px;\n  }\n\n  .seh-dfy__mini:hover,\n  .seh-dfy__mini:focus-visible,\n  .seh-dfy__profile-link:hover,\n  .seh-dfy__profile-link:focus-visible,\n  .seh-dfy__shortcuts a:hover,\n  .seh-dfy__shortcuts a:focus-visible {\n    outline:none;\n    border-color:rgba(255,208,0,.52);\n    background:rgba(255,208,0,.055);\n  }\n\n  .seh-dfy__feed-head {\n    display:flex;\n    align-items:center;\n    justify-content:space-between;\n    gap:10px;\n    margin-top:1px;\n  }\n\n  .seh-dfy__feed-head strong {\n    color:#e9e7e1;\n    font-size:10px;\n    letter-spacing:.02em;\n  }\n\n  .seh-dfy__feed-head a {\n    color:#d6b15f;\n    font-size:8px;\n    font-weight:850;\n    text-decoration:none;\n  }\n\n  .seh-dfy__feed {\n    display:grid;\n    gap:5px;\n  }\n\n  .seh-dfy__feed-row {\n    display:grid;\n    grid-template-columns:27px minmax(0,1fr) auto;\n    align-items:center;\n    gap:8px;\n    min-height:42px;\n    padding:6px 8px;\n    border:1px solid rgba(255,255,255,.055);\n    border-radius:10px;\n    background:rgba(1,5,12,.44);\n  }\n\n  .seh-dfy__feed-row > b {\n    width:26px;\n    height:26px;\n    display:grid;\n    place-items:center;\n    border-radius:8px;\n    color:#d6b15f;\n    background:rgba(214,177,95,.07);\n    font-size:9px;\n  }\n\n  .seh-dfy__feed-row[data-tone=\"in\"] > b { color:#6ee7aa; background:rgba(77,218,156,.07); }\n  .seh-dfy__feed-row[data-tone=\"out\"] > b { color:#ff8d8d; background:rgba(255,102,102,.07); }\n  .seh-dfy__feed-row[data-tone=\"fa\"] > b { color:#62d4cf; background:rgba(98,212,207,.07); }\n\n  .seh-dfy__feed-row > div {\n    display:grid;\n    min-width:0;\n    gap:1px;\n  }\n\n  .seh-dfy__feed-row strong,\n  .seh-dfy__feed-row span {\n    overflow:hidden;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n  }\n\n  .seh-dfy__feed-row strong {\n    color:#eef1f6;\n    font-size:10px;\n  }\n\n  .seh-dfy__feed-row span {\n    color:#858e9c;\n    font-size:8.5px;\n  }\n\n  .seh-dfy__feed-row time {\n    color:#626b78;\n    font-size:8px;\n    white-space:nowrap;\n  }\n\n  .seh-dfy__shortcuts {\n    display:grid;\n    grid-template-columns:repeat(4,minmax(0,1fr));\n    gap:5px;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-width:0;\n    min-height:31px;\n    display:grid;\n    place-items:center;\n    padding:4px 5px;\n    overflow:hidden;\n    border:1px solid rgba(255,255,255,.065);\n    border-radius:9px;\n    color:#aab2be;\n    background:rgba(255,255,255,.018);\n    font-size:8px;\n    font-weight:850;\n    text-align:center;\n    text-decoration:none;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n  }\n\n  .seh-dfy__pending {\n    display:grid;\n    grid-template-columns:46px minmax(0,1fr) auto;\n    align-items:center;\n    gap:10px;\n    padding:12px;\n    border:1px solid rgba(255,255,255,.07);\n    border-radius:14px;\n    background:rgba(2,7,15,.55);\n  }\n\n  .seh-dfy__pending-icon {\n    width:42px;\n    height:42px;\n    display:grid;\n    place-items:center;\n    border:1px solid rgba(214,177,95,.27);\n    border-radius:12px;\n    color:#d6b15f;\n    font-size:20px;\n  }\n\n  .seh-dfy__pending > div:nth-child(2) {\n    min-width:0;\n  }\n\n  .seh-dfy__pending strong {\n    display:block;\n    color:#f3f1eb;\n    font-size:12px;\n  }\n\n  .seh-dfy__pending span {\n    display:block;\n    margin-top:3px;\n    color:#87909f;\n    font-size:9px;\n    line-height:1.4;\n  }\n\n  .seh-dfy__loading {\n    display:grid;\n    gap:8px;\n  }\n\n  .seh-dfy__loading i {\n    display:block;\n    height:62px;\n    border-radius:12px;\n    background:linear-gradient(90deg,rgba(255,255,255,.025),rgba(255,255,255,.065),rgba(255,255,255,.025));\n    background-size:200% 100%;\n    animation:seh-dfy-shimmer 1.2s linear infinite;\n  }\n\n  .seh-dfy__error {\n    display:flex;\n    align-items:center;\n    justify-content:space-between;\n    gap:12px;\n    padding:12px;\n    border:1px solid rgba(255,255,255,.07);\n    border-radius:14px;\n    background:rgba(2,7,15,.55);\n  }\n\n  .seh-dfy__error strong {\n    color:#f3f1eb;\n    font-size:11px;\n  }\n}\n\n@media (min-width:1101px) and (max-height:860px) {\n  .home-stage__identity.home-stage__identity--for-you {\n    padding:11px 16px;\n  }\n\n  .seh-desktop-for-you {\n    gap:6px;\n    padding:9px;\n  }\n\n  .seh-dfy__identity {\n    min-height:60px;\n    grid-template-columns:48px minmax(0,1fr) auto;\n  }\n\n  .seh-dfy__avatar {\n    width:48px;\n    height:48px;\n  }\n\n  .seh-dfy__mini {\n    min-height:57px;\n    padding:7px 9px;\n  }\n\n  .seh-dfy__feed-row {\n    min-height:37px;\n    padding-block:4px;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height:27px;\n  }\n}\n\n@keyframes seh-dfy-shimmer {\n  to { background-position:-200% 0; }\n}\n\n\n/* =========================================================\n   DESKTOP FOR YOU V2 — darker, larger, more web/dashboard\n   ========================================================= */\n@media (min-width:1101px) {\n  .home-stage__identity.home-stage__identity--for-you {\n    padding: 14px 16px !important;\n    background:\n      linear-gradient(135deg, rgba(255,208,0,.018), transparent 42%),\n      #020407 !important;\n  }\n\n  .home-stage__identity.home-stage__identity--for-you::before {\n    inset: 0 !important;\n    opacity: .20 !important;\n    background:\n      linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px),\n      linear-gradient(rgba(255,255,255,.014) 1px, transparent 1px) !important;\n    background-size: 48px 48px !important;\n  }\n\n  .seh-desktop-for-you {\n    justify-content: flex-start !important;\n    gap: 11px !important;\n    padding: clamp(18px,2.1vh,24px) !important;\n    border: 1px solid rgba(255,255,255,.105) !important;\n    border-radius: 7px !important;\n    background:\n      radial-gradient(circle at 90% 0, rgba(255,208,0,.035), transparent 26%),\n      linear-gradient(180deg, #07090d 0%, #030507 100%) !important;\n    box-shadow:\n      inset 0 1px 0 rgba(255,255,255,.025),\n      0 18px 46px rgba(0,0,0,.28) !important;\n  }\n\n  .seh-desktop-for-you::before {\n    position: absolute;\n    top: 0;\n    left: 0;\n    width: 112px;\n    height: 2px;\n    content: \"\";\n    background: linear-gradient(90deg, #ffd000, rgba(255,208,0,0));\n  }\n\n  .seh-dfy__head {\n    min-height: 47px;\n    align-items: flex-end !important;\n    padding-bottom: 1px;\n  }\n\n  .seh-dfy__head small {\n    color: rgba(98,212,207,.88) !important;\n    font-size: 9px !important;\n    letter-spacing: .15em !important;\n  }\n\n  .seh-dfy__head h2 {\n    margin-top: 3px !important;\n    font-size: clamp(26px,1.8vw,31px) !important;\n    letter-spacing: -.045em !important;\n  }\n\n  .seh-dfy__head > span {\n    margin-bottom: 2px;\n    padding: 5px 9px !important;\n    border-radius: 3px !important;\n    font-size: 8.5px !important;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 84px minmax(0,1fr) auto !important;\n    gap: 14px !important;\n    min-height: 102px !important;\n    padding: 9px 11px !important;\n    border-color: rgba(255,255,255,.10) !important;\n    border-radius: 5px !important;\n    background:\n      linear-gradient(90deg, rgba(9,18,29,.72), rgba(4,7,11,.82)) !important;\n  }\n\n  .seh-dfy__avatar {\n    width: 82px !important;\n    height: 82px !important;\n    max-width: 82px !important;\n    max-height: 82px !important;\n    border-radius: 4px !important;\n    border-color: rgba(255,208,0,.28) !important;\n    background: #08101c !important;\n  }\n\n  .seh-dfy__avatar img {\n    width: 82px !important;\n    height: 82px !important;\n    max-width: 82px !important;\n    max-height: 82px !important;\n    object-fit: cover !important;\n    object-position: center 14% !important;\n  }\n\n  .seh-dfy__identity > div {\n    gap: 4px !important;\n  }\n\n  .seh-dfy__identity small {\n    color: #ffd000 !important;\n    font-size: 8.5px !important;\n  }\n\n  .seh-dfy__identity strong {\n    font-size: clamp(19px,1.35vw,23px) !important;\n    letter-spacing: -.025em;\n  }\n\n  .seh-dfy__identity span {\n    color: rgba(244,241,233,.56) !important;\n    font-size: 11px !important;\n  }\n\n  .seh-dfy__profile-link,\n  .seh-dfy__pending a,\n  .seh-dfy__error button {\n    min-height: 36px !important;\n    padding: 0 13px !important;\n    border-radius: 3px !important;\n    border-color: rgba(255,208,0,.32) !important;\n    color: #f5dc8f !important;\n    background: rgba(255,208,0,.04) !important;\n    font-size: 9.5px !important;\n  }\n\n  .seh-dfy__mini-grid {\n    gap: 9px !important;\n  }\n\n  .seh-dfy__mini {\n    position: relative;\n    min-height: 85px !important;\n    padding: 11px 12px !important;\n    border-radius: 5px !important;\n    border-color: rgba(255,255,255,.09) !important;\n    background: #05080d !important;\n  }\n\n  .seh-dfy__mini:hover,\n  .seh-dfy__mini:focus-visible {\n    border-color: rgba(255,208,0,.38) !important;\n    background: #080b10 !important;\n  }\n\n  .seh-dfy__mini--team {\n    grid-template-columns: 58px minmax(0,1fr) 18px !important;\n    align-items: center;\n    gap: 12px !important;\n  }\n\n  .seh-dfy__team-logo {\n    width: 56px;\n    height: 56px;\n    display: grid;\n    place-items: center;\n    overflow: hidden;\n    border: 1px solid rgba(255,255,255,.09);\n    border-radius: 4px;\n    color: rgba(244,241,233,.56);\n    background: #090c11;\n    font-size: 14px;\n    font-weight: 950;\n    letter-spacing: -.04em;\n  }\n\n  .seh-dfy__team-logo img {\n    display: block;\n    width: 48px;\n    height: 48px;\n    object-fit: contain;\n  }\n\n  .seh-dfy__mini-copy {\n    display: grid;\n    min-width: 0;\n    gap: 4px;\n  }\n\n  .seh-dfy__mini-copy small {\n    color: rgba(98,212,207,.86) !important;\n    font-size: 8.5px !important;\n  }\n\n  .seh-dfy__mini-copy strong {\n    color: #f6f3eb !important;\n    font-size: 15px !important;\n    letter-spacing: -.018em;\n  }\n\n  .seh-dfy__mini-copy > span {\n    color: rgba(244,241,233,.48) !important;\n    font-size: 9.5px !important;\n  }\n\n  .seh-dfy__mini-arrow {\n    justify-self: end;\n    color: rgba(244,241,233,.28);\n    font-size: 13px;\n  }\n\n  .seh-dfy__mini--fa {\n    grid-template-columns: minmax(0,1fr) auto !important;\n    align-items: center;\n  }\n\n  .seh-dfy__mini--fa .seh-dfy__fa-value {\n    display: flex;\n    align-items: baseline;\n    gap: 6px;\n    color: #f6f3eb !important;\n    font-size: 24px !important;\n    line-height: 1;\n    letter-spacing: -.045em;\n  }\n\n  .seh-dfy__mini--fa .seh-dfy__fa-value em {\n    color: rgba(244,241,233,.46);\n    font-size: 9px;\n    font-style: normal;\n    font-weight: 800;\n    letter-spacing: .02em;\n  }\n\n  .seh-dfy__feed-head {\n    min-height: 23px;\n    margin-top: 1px;\n  }\n\n  .seh-dfy__feed-head strong {\n    font-size: 11px !important;\n  }\n\n  .seh-dfy__feed-head a {\n    font-size: 8.5px !important;\n  }\n\n  .seh-dfy__feed {\n    gap: 6px !important;\n  }\n\n  .seh-dfy__feed-row {\n    min-height: 46px !important;\n    grid-template-columns: 31px minmax(0,1fr) auto !important;\n    gap: 9px !important;\n    padding: 6px 9px !important;\n    border-radius: 4px !important;\n    border-color: rgba(255,255,255,.075) !important;\n    background: #04070b !important;\n  }\n\n  .seh-dfy__feed-row > b {\n    width: 29px !important;\n    height: 29px !important;\n    border-radius: 3px !important;\n    font-size: 9px !important;\n  }\n\n  .seh-dfy__feed-row strong {\n    font-size: 10.5px !important;\n  }\n\n  .seh-dfy__feed-row span {\n    font-size: 8.8px !important;\n  }\n\n  .seh-dfy__shortcuts {\n    gap: 7px !important;\n    margin-top: 1px;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height: 35px !important;\n    border-radius: 3px !important;\n    border-color: rgba(255,255,255,.085) !important;\n    background: #05080c !important;\n    color: rgba(244,241,233,.68) !important;\n    font-size: 8.7px !important;\n  }\n\n  .seh-dfy__shortcuts a:hover,\n  .seh-dfy__shortcuts a:focus-visible,\n  .seh-dfy__profile-link:hover,\n  .seh-dfy__profile-link:focus-visible {\n    border-color: rgba(255,208,0,.42) !important;\n    color: #f6e3a8 !important;\n    background: rgba(255,208,0,.045) !important;\n  }\n}\n\n@media (min-width:1101px) and (max-height:860px) {\n  .seh-desktop-for-you {\n    gap: 8px !important;\n    padding: 14px 16px !important;\n  }\n\n  .seh-dfy__head {\n    min-height: 40px;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 70px minmax(0,1fr) auto !important;\n    min-height: 84px !important;\n  }\n\n  .seh-dfy__avatar,\n  .seh-dfy__avatar img {\n    width: 68px !important;\n    height: 68px !important;\n    max-width: 68px !important;\n    max-height: 68px !important;\n  }\n\n  .seh-dfy__mini {\n    min-height: 72px !important;\n  }\n\n  .seh-dfy__team-logo {\n    width: 48px;\n    height: 48px;\n  }\n\n  .seh-dfy__team-logo img {\n    width: 41px;\n    height: 41px;\n  }\n\n  .seh-dfy__feed-row {\n    min-height: 40px !important;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height: 31px !important;\n  }\n}\n\n\n/* =========================================================\n   DESKTOP FOR YOU V2.1 — fuller hero, less card-in-card\n   ========================================================= */\n@media (min-width:1101px) {\n  .home-stage__identity.home-stage__identity--for-you {\n    padding: 0 !important;\n    background:\n      radial-gradient(circle at 80% 10%, rgba(14,42,65,.18), transparent 34%),\n      linear-gradient(180deg, #020406 0%, #010203 100%) !important;\n  }\n\n  .seh-desktop-for-you {\n    width: 100%;\n    height: 100%;\n    min-height: 100%;\n    justify-content: center !important;\n    gap: clamp(12px,1.55vh,16px) !important;\n    padding: clamp(22px,2.7vh,30px) clamp(22px,2vw,30px) !important;\n    border: 0 !important;\n    border-radius: 0 !important;\n    background: transparent !important;\n    box-shadow: none !important;\n  }\n\n  .seh-desktop-for-you::before {\n    width: 150px;\n    height: 2px;\n  }\n\n  .seh-dfy__head {\n    min-height: 52px !important;\n  }\n\n  .seh-dfy__head h2 {\n    font-size: clamp(28px,1.95vw,34px) !important;\n  }\n\n  .seh-dfy__head small {\n    font-size: 9.5px !important;\n  }\n\n  .seh-dfy__head > span {\n    min-width: 42px;\n    min-height: 23px;\n    display: inline-grid;\n    place-items: center;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 106px minmax(0,1fr) auto !important;\n    gap: 17px !important;\n    min-height: 124px !important;\n    padding: 10px 13px !important;\n    border-radius: 4px !important;\n    background:\n      linear-gradient(90deg, rgba(7,12,19,.96), rgba(3,6,10,.96)) !important;\n  }\n\n  .seh-dfy__avatar,\n  .seh-dfy__avatar img {\n    width: 102px !important;\n    height: 102px !important;\n    max-width: 102px !important;\n    max-height: 102px !important;\n  }\n\n  .seh-dfy__avatar {\n    border-radius: 3px !important;\n  }\n\n  .seh-dfy__identity strong {\n    font-size: clamp(22px,1.55vw,27px) !important;\n  }\n\n  .seh-dfy__identity span {\n    font-size: 12px !important;\n  }\n\n  .seh-dfy__identity small {\n    font-size: 9px !important;\n  }\n\n  .seh-dfy__profile-link {\n    min-height: 40px !important;\n    padding-inline: 15px !important;\n    font-size: 10px !important;\n  }\n\n  .seh-dfy__mini-grid {\n    gap: 10px !important;\n  }\n\n  .seh-dfy__mini {\n    min-height: 96px !important;\n    padding: 12px 14px !important;\n    border-radius: 4px !important;\n  }\n\n  .seh-dfy__mini--team {\n    grid-template-columns: 68px minmax(0,1fr) 18px !important;\n    gap: 14px !important;\n  }\n\n  .seh-dfy__team-logo {\n    width: 64px;\n    height: 64px;\n    border-radius: 3px;\n  }\n\n  .seh-dfy__team-logo img {\n    width: 56px;\n    height: 56px;\n  }\n\n  .seh-dfy__mini-copy {\n    gap: 5px;\n  }\n\n  .seh-dfy__mini-copy small {\n    font-size: 9px !important;\n  }\n\n  .seh-dfy__mini-copy strong {\n    font-size: 17px !important;\n  }\n\n  .seh-dfy__mini-copy > span {\n    font-size: 10px !important;\n  }\n\n  .seh-dfy__mini--fa .seh-dfy__fa-value {\n    font-size: 29px !important;\n  }\n\n  .seh-dfy__mini--fa .seh-dfy__fa-value em {\n    font-size: 10px !important;\n  }\n\n  .seh-dfy__feed-head {\n    min-height: 27px !important;\n  }\n\n  .seh-dfy__feed-head strong {\n    font-size: 12px !important;\n  }\n\n  .seh-dfy__feed-head a {\n    font-size: 9px !important;\n  }\n\n  .seh-dfy__feed-row {\n    min-height: 52px !important;\n    grid-template-columns: 34px minmax(0,1fr) auto !important;\n    padding: 7px 10px !important;\n    border-radius: 3px !important;\n  }\n\n  .seh-dfy__feed-row > b {\n    width: 32px !important;\n    height: 32px !important;\n  }\n\n  .seh-dfy__feed-row strong {\n    font-size: 11.5px !important;\n  }\n\n  .seh-dfy__feed-row span {\n    font-size: 9.5px !important;\n  }\n\n  .seh-dfy__shortcuts {\n    gap: 8px !important;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height: 40px !important;\n    border-radius: 3px !important;\n    font-size: 9.5px !important;\n  }\n}\n\n@media (min-width:1101px) and (max-height:900px) {\n  .seh-desktop-for-you {\n    gap: 9px !important;\n    padding: 14px 18px !important;\n  }\n\n  .seh-dfy__head {\n    min-height: 42px !important;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 84px minmax(0,1fr) auto !important;\n    min-height: 98px !important;\n  }\n\n  .seh-dfy__avatar,\n  .seh-dfy__avatar img {\n    width: 80px !important;\n    height: 80px !important;\n    max-width: 80px !important;\n    max-height: 80px !important;\n  }\n\n  .seh-dfy__identity strong {\n    font-size: 21px !important;\n  }\n\n  .seh-dfy__mini {\n    min-height: 77px !important;\n    padding: 9px 11px !important;\n  }\n\n  .seh-dfy__mini--team {\n    grid-template-columns: 54px minmax(0,1fr) 16px !important;\n  }\n\n  .seh-dfy__team-logo {\n    width: 50px;\n    height: 50px;\n  }\n\n  .seh-dfy__team-logo img {\n    width: 44px;\n    height: 44px;\n  }\n\n  .seh-dfy__feed-row {\n    min-height: 40px !important;\n    padding-block: 4px !important;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height: 31px !important;\n  }\n}\n\n\n/* =========================================================\n   DESKTOP FOR YOU V3 — web gets more context than the app\n   ========================================================= */\n@media (min-width:1101px) {\n  .seh-dfy__mini-grid--three {\n    grid-template-columns: minmax(0,1.28fr) minmax(0,.86fr) minmax(0,.86fr) !important;\n    gap: 8px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini {\n    min-height: 88px !important;\n    padding: 10px 11px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini--team {\n    grid-template-columns: 58px minmax(0,1fr) 14px !important;\n    gap: 10px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo {\n    width: 54px;\n    height: 54px;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo img {\n    width: 47px;\n    height: 47px;\n  }\n\n  .seh-dfy__mini--competition {\n    grid-template-columns: minmax(0,1fr) 14px !important;\n    align-items: center;\n  }\n\n  .seh-dfy__mini--competition .seh-dfy__mini-copy {\n    align-content: center;\n  }\n\n  .seh-dfy__mini--competition .seh-dfy__mini-copy strong {\n    white-space: normal !important;\n    line-height: 1.05;\n  }\n\n  .seh-dfy__mini--competition .seh-dfy__mini-copy > span {\n    white-space: normal !important;\n    line-height: 1.28;\n  }\n}\n\n@media (min-width:1101px) and (max-height:900px) {\n  .seh-dfy__feed-row:nth-child(n+3) {\n    display: none !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini {\n    min-height: 72px !important;\n    padding: 8px 9px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini--team {\n    grid-template-columns: 47px minmax(0,1fr) 12px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo {\n    width: 44px;\n    height: 44px;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo img {\n    width: 38px;\n    height: 38px;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini-copy strong {\n    font-size: 14px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini-copy > span {\n    font-size: 8.7px !important;\n  }\n}\n\n\n/* =========================================================\n   DESKTOP FOR YOU V4 — portrait player + stronger club identity\n   ========================================================= */\n@media (min-width:1101px) {\n  .seh-desktop-for-you {\n    isolation: isolate;\n  }\n\n  .seh-dfy__team-watermark {\n    position: absolute;\n    z-index: -1;\n    top: 56px;\n    right: 24px;\n    width: 190px;\n    height: 190px;\n    display: grid;\n    place-items: center;\n    opacity: .055;\n    filter: grayscale(.18);\n    pointer-events: none;\n  }\n\n  .seh-dfy__team-watermark img {\n    width: 100%;\n    height: 100%;\n    object-fit: contain;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 96px minmax(0,1fr) auto !important;\n    min-height: 128px !important;\n    background:\n      linear-gradient(90deg, rgba(8,14,22,.98), rgba(3,6,10,.91)) !important;\n  }\n\n  .seh-dfy__avatar {\n    width: 88px !important;\n    height: 116px !important;\n    max-width: 88px !important;\n    max-height: 116px !important;\n    align-self: end;\n    border-radius: 3px !important;\n  }\n\n  .seh-dfy__avatar img {\n    width: 88px !important;\n    height: 116px !important;\n    max-width: 88px !important;\n    max-height: 116px !important;\n    object-fit: cover !important;\n    object-position: center top !important;\n  }\n\n  .seh-dfy__identity-copy {\n    display: grid !important;\n    align-content: center;\n    gap: 5px !important;\n  }\n\n  .seh-dfy__clubline {\n    width: fit-content;\n    max-width: 100%;\n    display: inline-grid;\n    grid-template-columns: 28px minmax(0,auto) auto;\n    align-items: center;\n    gap: 7px;\n    margin-top: 3px;\n    color: rgba(244,241,233,.72);\n    text-decoration: none;\n  }\n\n  .seh-dfy__clubline--plain {\n    grid-template-columns: minmax(0,auto);\n  }\n\n  .seh-dfy__identity-team-logo {\n    width: 28px;\n    height: 28px;\n    display: grid;\n    place-items: center;\n    overflow: hidden;\n    border: 1px solid rgba(255,255,255,.09);\n    border-radius: 3px;\n    background: #080b0f;\n    color: rgba(244,241,233,.55);\n    font-size: 8px;\n    font-weight: 900;\n  }\n\n  .seh-dfy__identity-team-logo img {\n    width: 24px;\n    height: 24px;\n    object-fit: contain;\n  }\n\n  .seh-dfy__clubline > span:nth-child(2),\n  .seh-dfy__clubline--plain > span {\n    overflow: hidden;\n    font-size: 12px;\n    font-weight: 850;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n\n  .seh-dfy__clubline b {\n    color: rgba(98,212,207,.72);\n    font-size: 8px;\n    font-weight: 900;\n    white-space: nowrap;\n  }\n\n  .seh-dfy__clubline:hover,\n  .seh-dfy__clubline:focus-visible {\n    outline: none;\n    color: #fff;\n  }\n\n  .seh-dfy__clubline:hover b,\n  .seh-dfy__clubline:focus-visible b {\n    color: #ffd000;\n  }\n\n  .seh-dfy__mini--team {\n    background:\n      radial-gradient(circle at 18% 50%, rgba(255,208,0,.035), transparent 36%),\n      #05080d !important;\n  }\n}\n\n@media (min-width:1101px) and (max-height:900px) {\n  .seh-dfy__identity {\n    grid-template-columns: 80px minmax(0,1fr) auto !important;\n    min-height: 108px !important;\n  }\n\n  .seh-dfy__avatar,\n  .seh-dfy__avatar img {\n    width: 72px !important;\n    height: 96px !important;\n    max-width: 72px !important;\n    max-height: 96px !important;\n  }\n\n  .seh-dfy__team-watermark {\n    width: 150px;\n    height: 150px;\n    top: 48px;\n    right: 18px;\n  }\n\n  .seh-dfy__clubline {\n    grid-template-columns: 24px minmax(0,auto) auto;\n    gap: 6px;\n  }\n\n  .seh-dfy__identity-team-logo {\n    width: 24px;\n    height: 24px;\n  }\n\n  .seh-dfy__identity-team-logo img {\n    width: 20px;\n    height: 20px;\n  }\n}\n\n\n/* =========================================================\n   DESKTOP FOR YOU V5 — stronger vertical proportions\n   ========================================================= */\n@media (min-width:1101px) {\n  .seh-desktop-for-you {\n    justify-content: flex-start !important;\n    gap: clamp(12px,1.55vh,16px) !important;\n    padding: clamp(18px,2.1vh,24px) clamp(22px,2vw,30px) !important;\n  }\n\n  .seh-dfy__head {\n    min-height: 58px !important;\n    align-items: flex-end !important;\n  }\n\n  .seh-dfy__head h2 {\n    font-size: clamp(30px,2vw,36px) !important;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 106px minmax(0,1fr) auto !important;\n    min-height: 140px !important;\n    padding: 11px 14px !important;\n  }\n\n  .seh-dfy__avatar {\n    width: 98px !important;\n    height: 130px !important;\n    max-width: 98px !important;\n    max-height: 130px !important;\n  }\n\n  .seh-dfy__avatar img {\n    width: 98px !important;\n    height: 130px !important;\n    max-width: 98px !important;\n    max-height: 130px !important;\n  }\n\n  .seh-dfy__identity-copy {\n    gap: 6px !important;\n  }\n\n  .seh-dfy__identity strong {\n    font-size: clamp(23px,1.6vw,28px) !important;\n  }\n\n  .seh-dfy__clubline > span:nth-child(2),\n  .seh-dfy__clubline--plain > span {\n    font-size: 13px !important;\n  }\n\n  .seh-dfy__profile-link {\n    min-height: 42px !important;\n    padding-inline: 16px !important;\n  }\n\n  .seh-dfy__team-watermark {\n    top: 34px !important;\n    right: 18px !important;\n    width: 220px !important;\n    height: 220px !important;\n    opacity: .075 !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini {\n    min-height: 98px !important;\n    padding: 12px 13px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini--team {\n    grid-template-columns: 64px minmax(0,1fr) 16px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo {\n    width: 60px !important;\n    height: 60px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo img {\n    width: 52px !important;\n    height: 52px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini-copy strong {\n    font-size: 16px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini-copy > span {\n    font-size: 9.5px !important;\n  }\n\n  .seh-dfy__feed-head {\n    min-height: 29px !important;\n  }\n\n  .seh-dfy__feed {\n    min-height: 58px;\n  }\n\n  .seh-dfy__feed-row {\n    min-height: 56px !important;\n    padding: 8px 10px !important;\n  }\n\n  .seh-dfy__feed-row > b {\n    width: 34px !important;\n    height: 34px !important;\n  }\n\n  .seh-dfy__feed-row strong {\n    font-size: 12px !important;\n  }\n\n  .seh-dfy__feed-row span {\n    font-size: 9.5px !important;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height: 42px !important;\n    font-size: 9.5px !important;\n  }\n}\n\n@media (min-width:1101px) and (max-height:900px) {\n  .seh-desktop-for-you {\n    justify-content: flex-start !important;\n    gap: 9px !important;\n    padding: 12px 18px !important;\n  }\n\n  .seh-dfy__head {\n    min-height: 44px !important;\n  }\n\n  .seh-dfy__head h2 {\n    font-size: 28px !important;\n  }\n\n  .seh-dfy__identity {\n    grid-template-columns: 82px minmax(0,1fr) auto !important;\n    min-height: 112px !important;\n    padding: 8px 10px !important;\n  }\n\n  .seh-dfy__avatar,\n  .seh-dfy__avatar img {\n    width: 76px !important;\n    height: 102px !important;\n    max-width: 76px !important;\n    max-height: 102px !important;\n  }\n\n  .seh-dfy__identity strong {\n    font-size: 21px !important;\n  }\n\n  .seh-dfy__team-watermark {\n    top: 28px !important;\n    right: 14px !important;\n    width: 165px !important;\n    height: 165px !important;\n    opacity: .065 !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini {\n    min-height: 76px !important;\n    padding: 8px 9px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__mini--team {\n    grid-template-columns: 49px minmax(0,1fr) 12px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo {\n    width: 46px !important;\n    height: 46px !important;\n  }\n\n  .seh-dfy__mini-grid--three .seh-dfy__team-logo img {\n    width: 40px !important;\n    height: 40px !important;\n  }\n\n  .seh-dfy__feed-head {\n    min-height: 22px !important;\n  }\n\n  .seh-dfy__feed {\n    min-height: 42px;\n  }\n\n  .seh-dfy__feed-row {\n    min-height: 42px !important;\n    padding: 5px 8px !important;\n  }\n\n  .seh-dfy__feed-row > b {\n    width: 28px !important;\n    height: 28px !important;\n  }\n\n  .seh-dfy__shortcuts a {\n    min-height: 32px !important;\n  }\n}\n";
    document.head.appendChild(style);
  }

  ensureRuntimeStyles();

  const ROOT_ID = 'seh-desktop-for-you';
  const COMPETITION_KEY = 'ecl27winter';
  const BUILDS_ROUTE = '#/sasong/ecl27winter';
  const PLAYER_FALLBACK = 'players/1DEFAULTBILDID.png';
  const originalMarkup = new WeakMap();

  let client = null;
  let authBound = false;
  let observer = null;
  let refreshTimer = 0;
  let resizeTimer = 0;
  let renderToken = 0;

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function config() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (client) return client;
    const cfg = config();
    const url = String(cfg.supabaseUrl || cfg.SUPABASE_URL || '').trim();
    const key = String(
      cfg.supabasePublishableKey ||
      cfg.supabaseAnonKey ||
      cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function isDesktopWebsite() {
    return !window.__SEH_WEB_APP__ &&
      !document.documentElement.classList.contains('seh-web-app') &&
      window.matchMedia?.('(min-width: 1101px)')?.matches === true;
  }

  function homeIdentity() {
    return document.querySelector('#spaRouteView[data-route="home"] .home-stage__identity');
  }

  function rememberOriginal(host) {
    if (!host || originalMarkup.has(host)) return;
    originalMarkup.set(host, host.innerHTML);
  }

  function restore(host) {
    if (!host) return;
    const original = originalMarkup.get(host);
    host.classList.remove('home-stage__identity--for-you');
    host.removeAttribute('data-seh-personal');
    if (typeof original === 'string' && host.querySelector('#' + ROOT_ID)) {
      host.innerHTML = original;
    }
  }

  function showSkeleton(host) {
    rememberOriginal(host);
    host.classList.add('home-stage__identity--for-you');
    host.setAttribute('data-seh-personal', 'loading');
    host.innerHTML =
      '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
        '<div class="seh-dfy__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div><span>LIVE</span></div>' +
        '<div class="seh-dfy__loading"><i></i><i></i><i></i></div>' +
      '</section>';
  }

  function renderPending(host, account) {
    const status = String(account?.status || 'unlinked');
    const title = status === 'pending' ? 'Spelarkopplingen väntar' : 'Koppla din spelarprofil';
    const text = status === 'pending'
      ? 'När kopplingen godkänts visas din personliga översikt här automatiskt.'
      : 'Koppla ditt Discord-konto till ditt befintliga spelarkort för att aktivera För dig.';
    host.classList.add('home-stage__identity--for-you');
    host.setAttribute('data-seh-personal', 'pending');
    host.innerHTML =
      '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
        '<div class="seh-dfy__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>' +
        '<div class="seh-dfy__pending">' +
          '<div class="seh-dfy__pending-icon">◎</div>' +
          '<div><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div>' +
          '<a href="#/min-profil">Min profil</a>' +
        '</div>' +
      '</section>';
  }

  function playerImage(player) {
    const sportsGamer = String(player?.sports_gamer_player_url || '').trim();
    const id = sportsGamer.match(/\/players\/(\d+)/i)?.[1];
    if (id && typeof window.SEH_playerImageUrl === 'function') {
      try { return window.SEH_playerImageUrl(id, player?.player_image || ''); } catch (_) {}
    }
    if (id) return 'players/' + id + '.png';
    return String(player?.player_image || player?.photo || '').trim() || PLAYER_FALLBACK;
  }

  function playerHref(playerKey, playerName) {
    if (typeof window.SEH_playerProfileUrl === 'function') {
      try { return window.SEH_playerProfileUrl(playerKey, playerName); } catch (_) {}
    }
    return '#/spelare/' + encodeURIComponent(playerName || playerKey || '');
  }

  async function resolveLocalTeam(sb, teamName) {
    const name = String(teamName || '').trim();
    if (!sb || !name) return null;

    const select = 'team_id,current_name,logo_url,logo_path,historical_names,names_used_in_leagues';
    const attempts = [
      () => sb.from('v_local_team_list').select(select).eq('current_name', name).limit(1),
      () => sb.from('v_local_team_list').select(select).contains('historical_names', [name]).limit(1),
      () => sb.from('v_local_team_list').select(select).contains('names_used_in_leagues', [name]).limit(1)
    ];

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (!result?.error && result?.data?.[0]?.team_id) return result.data[0];
      } catch (_) {}
    }
    return null;
  }

  function hydrateTeamLogo(root, primaryUrl, teamName) {
    const shells = [...(root?.querySelectorAll?.('[data-seh-team-logo]') || [])];
    if (!shells.length || !teamName) return;

    for (const shell of shells) {
      const image = shell.querySelector('img');
      if (!image) continue;
      const watermark = shell.classList.contains('seh-dfy__team-watermark');

      if (typeof window.SEH_applyTeamLogo === 'function') {
        try {
          window.SEH_applyTeamLogo(image, primaryUrl ? [primaryUrl] : [], teamName, watermark ? null : shell);
          continue;
        } catch (_) {}
      }

      const candidates = [];
      if (primaryUrl) candidates.push(String(primaryUrl));
      const encoded = encodeURIComponent(String(teamName).trim());
      candidates.push(
        'web-images/teamlogos/' + encoded + '.webp',
        'teamlogos/' + encoded + '.png',
        'teamlogos/' + encoded + '.webp'
      );

      let index = 0;
      const next = () => {
        if (index >= candidates.length) {
          if (watermark) {
            shell.remove();
            return;
          }
          const initials = String(teamName).split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join('').toUpperCase() || 'SEH';
          shell.replaceChildren();
          shell.textContent = initials;
          return;
        }
        image.src = candidates[index++];
      };
      image.addEventListener('error', next);
      next();
    }
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const diff = Math.max(0, Date.now() - date.getTime());
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Nyss';
    if (hours < 24) return hours + ' h';
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Igår';
    if (days < 7) return days + ' d';
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function eventCopy(event, teamName) {
    const tag = String(event?.gamertag || '').trim() || 'Spelare';
    const type = String(event?.event_type || '').toLowerCase();
    if (type === 'in') return { marker: '+', tone: 'in', title: tag + ' in', text: 'Ny spelare till ' + teamName + '.' };
    if (type === 'out') return { marker: '−', tone: 'out', title: tag + ' ut', text: 'Har lämnat ' + teamName + '.' };
    if (type === 'free_agent') return { marker: 'FA', tone: 'fa', title: tag + ' Free Agent', text: 'Spelaren är tillgänglig.' };
    return { marker: '•', tone: '', title: tag, text: 'Ny laghändelse.' };
  }

  function desktopCompetitionMeta() {
    const now = new Date();
    const sclStart = new Date('2026-10-01T00:00:00+02:00');
    const sclEnd = new Date('2026-11-16T00:00:00+01:00');

    if (now < sclStart) {
      return {
        nearestTitle: 'SCL 27 närmast',
        nearestText: 'Nästa svenska tävling',
        currentTitle: 'SCL 27',
        currentText: 'Planerad start 1 oktober · närmast på tur',
        href: '#/ecl'
      };
    }

    if (now < sclEnd) {
      return {
        nearestTitle: 'SCL 27 pågår',
        nearestText: 'Svenska mästerskapet',
        currentTitle: 'SCL 27',
        currentText: 'Matcher, tabell och statistik',
        href: '#/ecl'
      };
    }

    return {
      nearestTitle: 'ECL 27 närmast',
      nearestText: 'Nästa större period',
      currentTitle: 'ECL 27',
      currentText: 'Lagbygge och kommande säsong',
      href: BUILDS_ROUTE
    };
  }

  function renderPersonal(host, data) {
    const account = data.account || {};
    const player = data.player || {};
    const project = data.project || null;
    const phase = String(data.competitionState?.phase || 'building');
    const playerName = String(player.display_gamertag || account.playerName || account.playerKey || 'Din profil').trim();
    const localTeam = data.localTeam || null;
    const teamName = String(project?.name || '').trim();
    const division = String(project?.division || '').trim();
    const latestTeam = String(player.latest_team || player.latest_ecl_team || '').trim();
    const resolvedLatestTeam = String(localTeam?.current_name || latestTeam || '').trim();
    const sourceTeamId = Number(project?.source_team_id) || Number(localTeam?.team_id) || 0;
    const currentTeamText = teamName || resolvedLatestTeam || 'Inte i aktuellt lagbygge';
    const currentTeamMeta = teamName
      ? [division, phase === 'building' ? 'ECL 27 lagbygge' : 'Aktuellt lag'].filter(Boolean).join(' · ')
      : (resolvedLatestTeam ? 'Senaste registrerade lag' : 'ECL 27 lagbygge');
    const teamLogoPrimary = String(project?.logo_name || localTeam?.logo_url || localTeam?.logo_path || '').trim();
    const profileUrl = playerHref(account.playerKey, playerName);
    const competitionMeta = desktopCompetitionMeta();

    const feed = [];
    if (phase === 'building' && data.recruitment?.text && teamName) {
      feed.push({
        marker: '!',
        tone: 'recruit',
        title: teamName + ' söker spelare',
        text: String(data.recruitment.text).trim(),
        time: relativeTime(data.recruitment.posted_at)
      });
    }
    for (const event of data.events || []) {
      if (feed.length >= 3) break;
      const copy = eventCopy(event, teamName || String(event?.to_team || event?.from_team || 'ditt lag'));
      feed.push({ ...copy, time: relativeTime(event?.occurred_at) });
    }
    if (!feed.length) {
      feed.push({
        marker: '✓',
        tone: '',
        title: teamName ? teamName + ' är kopplat' : 'Din profil är kopplad',
        text: teamName ? 'Nya IN/UT och rekryteringsposter visas här.' : 'När du går med i ett aktuellt lag visas lagflödet här.',
        time: ''
      });
    }

    const feedHtml = feed.slice(0, 3).map((item) =>
      '<article class="seh-dfy__feed-row" data-tone="' + esc(item.tone) + '">' +
        '<b>' + esc(item.marker) + '</b>' +
        '<div><strong>' + esc(item.title) + '</strong><span>' + esc(item.text) + '</span></div>' +
        '<time>' + esc(item.time) + '</time>' +
      '</article>'
    ).join('');

    const teamHref = sourceTeamId ? '#/lag/' + sourceTeamId : BUILDS_ROUTE;

    host.classList.add('home-stage__identity--for-you');
    host.setAttribute('data-seh-personal', 'ready');
    host.innerHTML =
      '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
        (currentTeamText && currentTeamText !== 'Inte i aktuellt lagbygge'
          ? '<span class="seh-dfy__team-watermark" data-seh-team-logo aria-hidden="true"><img alt="" decoding="async"></span>'
          : '') +
        '<div class="seh-dfy__head">' +
          '<div><small>PERSONLIGT</small><h2>För dig</h2></div>' +
          '<span>LIVE</span>' +
        '</div>' +
        '<div class="seh-dfy__identity">' +
          '<a class="seh-dfy__avatar" href="' + esc(profileUrl) + '" aria-label="Öppna ' + esc(playerName) + '">' +
            '<img src="' + esc(playerImage(player)) + '" alt="' + esc(playerName) + '">' +
          '</a>' +
          '<div class="seh-dfy__identity-copy"><small>DIN SPELARE</small><strong>' + esc(playerName) + '</strong>' +
            (sourceTeamId
              ? '<a class="seh-dfy__clubline" href="' + esc(teamHref) + '"><span class="seh-dfy__identity-team-logo" data-seh-team-logo><img alt="" decoding="async"></span><span>' + esc(currentTeamText) + '</span><b>Lagprofil ↗</b></a>'
              : '<span class="seh-dfy__clubline seh-dfy__clubline--plain"><span>' + esc(currentTeamText) + '</span></span>') +
          '</div>' +
          '<a class="seh-dfy__profile-link" href="#/min-profil">Min profil</a>' +
        '</div>' +
        '<div class="seh-dfy__mini-grid seh-dfy__mini-grid--three">' +
          '<a class="seh-dfy__mini seh-dfy__mini--team" href="' + esc(teamHref) + '">' +
            '<span class="seh-dfy__team-logo" data-seh-team-logo><img alt="" decoding="async"></span>' +
            '<span class="seh-dfy__mini-copy"><small>' + esc(teamName ? 'DITT LAG' : (latestTeam ? 'SENASTE LAG' : 'DITT LAG')) + '</small><strong>' + esc(currentTeamText) + '</strong><span>' + esc(currentTeamMeta) + '</span></span>' +
            '<b class="seh-dfy__mini-arrow" aria-hidden="true">↗</b>' +
          '</a>' +
          '<a class="seh-dfy__mini seh-dfy__mini--competition" href="' + esc(competitionMeta.href) + '">' +
            '<span class="seh-dfy__mini-copy"><small>DINA TÄVLINGAR</small><strong>' + esc(competitionMeta.nearestTitle) + '</strong><span>' + esc(competitionMeta.nearestText) + '</span></span>' +
            '<b class="seh-dfy__mini-arrow" aria-hidden="true">↗</b>' +
          '</a>' +
          '<a class="seh-dfy__mini seh-dfy__mini--competition" href="' + esc(competitionMeta.href) + '">' +
            '<span class="seh-dfy__mini-copy"><small>AKTUELLT</small><strong>' + esc(competitionMeta.currentTitle) + '</strong><span>' + esc(competitionMeta.currentText) + '</span></span>' +
            '<b class="seh-dfy__mini-arrow" aria-hidden="true">↗</b>' +
          '</a>' +
        '</div>' +
        '<div class="seh-dfy__feed-head"><strong>Senaste för dig</strong><a href="' + esc(BUILDS_ROUTE) + '">Alla lagbyggen →</a></div>' +
        '<div class="seh-dfy__feed">' + feedHtml + '</div>' +
        '<div class="seh-dfy__shortcuts">' +
          '<a href="' + esc(profileUrl) + '">Spelarkort</a>' +
          '<a href="' + esc(teamHref) + '">Mitt lag</a>' +
          '<a href="' + esc(BUILDS_ROUTE) + '">Lagbygge</a>' +
          '<a href="#/min-profil">Mitt eHockey</a>' +
        '</div>' +
      '</section>';

    hydrateTeamLogo(host, teamLogoPrimary, currentTeamText);
  }

  async function loadForHost(host) {
    const token = ++renderToken;
    const sb = getClient();
    if (!sb || !host) return;

    try {
      const sessionResult = await sb.auth.getSession();
      if (token !== renderToken) return;
      const session = sessionResult.data?.session || null;

      if (!session?.user) {
        restore(host);
        return;
      }

      showSkeleton(host);

      const accountResult = await sb.rpc('seh_get_my_player_account');
      if (token !== renderToken) return;
      if (accountResult.error) throw accountResult.error;

      const rawAccount = Array.isArray(accountResult.data) ? (accountResult.data[0] || {}) : (accountResult.data || {});
      const account = {
        status: String(rawAccount.status || 'unlinked'),
        playerKey: String(rawAccount.player_key || '').trim(),
        playerName: String(rawAccount.player_name || '').trim()
      };

      if (account.status !== 'approved' || !account.playerKey) {
        renderPending(host, account);
        return;
      }

      const [phaseResult, dashboardResult, directoryResult, playerEventsResult] = await Promise.all([
        sb.from('seh_app_competition_states')
          .select('competition_key,display_name,phase,route_hash')
          .eq('competition_key', COMPETITION_KEY)
          .limit(1),
        sb.rpc('seh_get_my_player_dashboard'),
        sb.from('app_player_directory_cache')
          .select('player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,latest_team,latest_season')
          .eq('player_key', account.playerKey)
          .limit(1),
        sb.from('ecl27_roster_events')
          .select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team')
          .eq('player_key', account.playerKey)
          .order('occurred_at', { ascending: false })
          .limit(20)
      ]);

      if (token !== renderToken) return;
      if (playerEventsResult.error) throw playerEventsResult.error;

      const dashboardRow = Array.isArray(dashboardResult.data) ? (dashboardResult.data[0] || {}) : (dashboardResult.data || {});
      const dashboardPlayer = dashboardResult.error ? {} : (dashboardRow.player || {});
      const directoryPlayer = directoryResult.error ? {} : (directoryResult.data?.[0] || {});
      const player = { ...directoryPlayer, ...dashboardPlayer };
      const latestTeamName = String(player.latest_team || player.latest_ecl_team || '').trim();
      const competitionState = !phaseResult.error && phaseResult.data?.[0]
        ? phaseResult.data[0]
        : { competition_key: COMPETITION_KEY, display_name: 'ECL 27 Winter', phase: 'building', route_hash: BUILDS_ROUTE };

      const playerEvents = playerEventsResult.data || [];
      const latestPlayerEvent = playerEvents[0] || null;
      const currentProjectId = String(latestPlayerEvent?.event_type || '').toLowerCase() === 'in'
        ? Number(latestPlayerEvent?.team_project_id) || 0
        : 0;
      const building = String(competitionState.phase || '') === 'building';

      const [projectResult, eventsResult, recruitmentResult, localTeam] = await Promise.all([
        currentProjectId
          ? sb.from('ecl27_team_projects')
              .select('id,name,division,source_team_id,logo_name,status')
              .eq('id', currentProjectId)
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
        currentProjectId
          ? sb.from('ecl27_roster_events')
              .select('id,occurred_at,team_project_id,event_type,player_key,gamertag,from_team,to_team')
              .eq('team_project_id', currentProjectId)
              .order('occurred_at', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [], error: null }),
        currentProjectId && building
          ? sb.from('ecl27_recruitment_posts')
              .select('id,team_project_id,posted_at,text,is_active')
              .eq('team_project_id', currentProjectId)
              .eq('is_active', true)
              .order('posted_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
        latestTeamName ? resolveLocalTeam(sb, latestTeamName) : Promise.resolve(null)
      ]);

      if (token !== renderToken) return;

      renderPersonal(host, {
        account,
        player,
        competitionState,
        project: projectResult.error ? null : (projectResult.data?.[0] || null),
        localTeam,
        events: eventsResult.error ? [] : (eventsResult.data || []),
        recruitment: recruitmentResult.error ? null : (recruitmentResult.data?.[0] || null)
      });
    } catch (error) {
      console.warn('[Svensk eHockey] Desktop För dig kunde inte laddas', error);
      if (token !== renderToken) return;
      if (!host.querySelector('#' + ROOT_ID)) return;
      host.setAttribute('data-seh-personal', 'error');
      host.innerHTML =
        '<section id="' + ROOT_ID + '" class="seh-desktop-for-you" aria-label="För dig">' +
          '<div class="seh-dfy__head"><div><small>PERSONLIGT</small><h2>För dig</h2></div></div>' +
          '<div class="seh-dfy__error"><strong>Kunde inte ladda För dig.</strong><button type="button" data-seh-dfy-retry>Försök igen</button></div>' +
        '</section>';
    }
  }

  function refresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      const host = homeIdentity();
      if (!host) return;
      rememberOriginal(host);
      if (!isDesktopWebsite()) {
        restore(host);
        return;
      }
      loadForHost(host);
    }, 40);
  }

  function bindAuth() {
    if (authBound) return;
    const sb = getClient();
    if (!sb) return;
    authBound = true;
    sb.auth.onAuthStateChange(() => {
      window.setTimeout(refresh, 0);
    });
  }

  function start() {
    bindAuth();
    observer = new MutationObserver(() => {
      const host = homeIdentity();
      if (host && !originalMarkup.has(host)) refresh();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
      if (!event.target.closest?.('[data-seh-dfy-retry]')) return;
      event.preventDefault();
      refresh();
    });

    window.addEventListener('hashchange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 120);
    });

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();