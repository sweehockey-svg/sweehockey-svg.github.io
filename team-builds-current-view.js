/* Svensk eHockey – visa lagbyggen som aktuell vy innan ECL '27 startar. */
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";

  function applyCurrentTeamBuildsView() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;

    const hero = document.querySelector(".season-hero-v12840");
    const subnav = document.querySelector(".season-subnav-v12840");
    const overview = document.querySelector("#overview");
    const builds = document.querySelector("#ecl27TeamBuildsV2");

    if (hero) hero.style.display = "none";
    if (subnav) subnav.style.display = "none";
    if (overview) overview.style.display = "none";

    if (builds) {
      builds.style.marginTop = "0";
      builds.setAttribute("aria-label", "Svenska lagbyggen");
    }

    document.title = "Svenska lagbyggen – Svensk eHockey";
  }

  function schedule() {
    [0, 50, 120, 250, 500, 900, 1500, 2500, 4000].forEach((delay) => {
      window.setTimeout(applyCurrentTeamBuildsView, delay);
    });
  }

  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  schedule();
})();
