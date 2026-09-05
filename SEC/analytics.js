(() => {
  "use strict";

  const GA_ID = "G-QJ6VHZ2339";
  const CONSENT_KEY = "seh_analytics_consent";
  const BANNER_ID = "sehAnalyticsConsent";
  let lastTrackedLocation = "";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };

  function readConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (_) {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (_) {}
  }

  function hasConsentChoice() {
    return readConsent() !== null;
  }

  function isGranted() {
    return readConsent() === "granted";
  }

  function applyConsent(value) {
    const granted = value === "granted";
    window.gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }

  function currentPagePath() {
    return `${location.pathname}${location.search}${location.hash || ""}`;
  }

  function trackPageView(force = false) {
    const pageLocation = location.href;
    if (!force && pageLocation === lastTrackedLocation) return;
    lastTrackedLocation = pageLocation;

    window.gtag("event", "page_view", {
      page_title: document.title || "Svensk eHockey",
      page_location: pageLocation,
      page_path: currentPagePath(),
      seh_route: location.hash || "#/"
    });
  }

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  function showConsentBanner() {
    if (readConsent()) return;
    if (document.getElementById(BANNER_ID)) return;

    const style = document.createElement("style");
    style.id = "sehAnalyticsConsentStyles";
    style.textContent = `
      #${BANNER_ID}{
        position:fixed;left:50%;bottom:12px;z-index:2147483647;
        width:max-content;max-width:calc(100% - 28px);transform:translateX(-50%);
        display:flex;align-items:center;justify-content:center;gap:14px;
        padding:9px 10px 9px 14px;border:1px solid rgba(214,177,95,.38);
        border-radius:10px;background:rgba(5,9,18,.96);
        box-shadow:0 10px 34px rgba(0,0,0,.48);
        color:#f5f7ff;font-family:Inter,Arial,sans-serif;
        backdrop-filter:blur(12px);
      }
      #${BANNER_ID} .seh-consent-copy{min-width:0}
      #${BANNER_ID} strong{display:none}
      #${BANNER_ID} p{max-width:560px;margin:0;color:#c3cbda;font-size:11.8px;line-height:1.35}
      #${BANNER_ID} .seh-consent-actions{display:flex;flex:0 0 auto;gap:6px}
      #${BANNER_ID} button{
        min-height:34px;padding:0 11px;border-radius:7px;
        border:1px solid rgba(214,177,95,.45);font:inherit;
        font-size:11.5px;font-weight:800;white-space:nowrap;cursor:pointer
      }
      #${BANNER_ID} [data-consent="denied"]{background:#070b14;color:#f0d58b}
      #${BANNER_ID} [data-consent="granted"]{background:#d6b15f;color:#090909;border-color:#d6b15f}
      @media(max-width:700px){
        #${BANNER_ID}{
          left:8px;right:8px;bottom:8px;transform:none;width:auto;max-width:none;
          align-items:stretch;flex-direction:column;gap:8px;padding:10px
        }
        #${BANNER_ID} p{max-width:none;font-size:11px;text-align:center}
        #${BANNER_ID} .seh-consent-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}
        #${BANNER_ID} button{width:100%;min-height:34px;padding:0 8px;font-size:10.8px}
      }
    `;
    document.head.appendChild(style);

    const banner = document.createElement("aside");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Besöksstatistik");
    banner.innerHTML = `
      <div class="seh-consent-copy">
        <strong>Besöksstatistik</strong>
        <p>Vi använder anonym besöksstatistik för att se vad som är mest populärt på Svensk eHockey. Vi följer inte vem du är eller exakt vad just du gör, utan använder statistiken för att få en helhetsbild och kunna lägga mer fokus på det innehåll som faktiskt används.</p>
      </div>
      <div class="seh-consent-actions">
        <button type="button" data-consent="denied">Endast nödvändiga</button>
        <button type="button" data-consent="granted">Tillåt statistik</button>
      </div>
    `;

    banner.addEventListener("click", (event) => {
      const button = event.target.closest("[data-consent]");
      if (!button) return;

      const value = button.dataset.consent === "granted" ? "granted" : "denied";
      writeConsent(value);
      applyConsent(value);
      removeBanner();
    });

    document.body.appendChild(banner);
  }

  const initialConsent = readConsent();
  const granted = initialConsent === "granted";

  window.gtag("consent", "default", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    send_page_view: false
  });

  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(loader);

  function init() {
    if (!initialConsent) {
      showConsentBanner();
    }
    trackPageView(true);

    window.addEventListener("hashchange", () => trackPageView());
    window.addEventListener("popstate", () => trackPageView());

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) {
        setTimeout(() => trackPageView(), 0);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();