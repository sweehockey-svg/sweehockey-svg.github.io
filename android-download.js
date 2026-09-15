(function () {
  "use strict";
  const button = document.querySelector("a.download[download]");
  if (!button) return;
  let lastClick = 0;
  button.addEventListener("click", function () {
    const now = Date.now();
    if (now - lastClick < 2000) return;
    lastClick = now;
    const config = window.EHOCKEY_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey) return;
    // Keep the normal download link working even if counting is unavailable.
    try {
      fetch(config.supabaseUrl + "/rest/v1/seh_app_download_clicks", {
        method: "POST",
        headers: {
          apikey: config.supabasePublishableKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ version: "5.30" }),
        keepalive: true,
        credentials: "omit"
      }).catch(function () {});
    } catch (_) {}
  });
}());
