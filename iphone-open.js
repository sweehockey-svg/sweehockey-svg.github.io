(function () {
  "use strict";
  const button = document.querySelector("[data-webapp-open]");
  if (!button) return;
  let lastClick = 0;
  button.addEventListener("click", function () {
    const now = Date.now();
    if (now - lastClick < 2000) return;
    lastClick = now;
    const config = window.EHOCKEY_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey) return;
    try {
      fetch(config.supabaseUrl + "/rest/v1/seh_webapp_open_clicks", {
        method: "POST",
        headers: { apikey: config.supabasePublishableKey, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ source: "iphone_page" }),
        keepalive: true,
        credentials: "omit"
      }).catch(function () {});
    } catch (_) {}
  });
}());
