/* Svensk eHockey – tävlingsneutral text för svenska lagbyggen. */
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";

  function applyNeutralLabels() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;

    const section = document.querySelector("#ecl27TeamBuildsV2");
    if (!section) return;

    const heroTitle = section.querySelector(".ecl27v2-hero h2");
    if (heroTitle) heroTitle.textContent = "Svenska lagbyggen";

    const heroText = section.querySelector(".ecl27v2-hero p:not(.directory-kicker)");
    if (heroText) {
      heroText.textContent = "Arbetsbilden börjar i den registrerade ECL ’26 Spring-truppen och följer därefter bekräftade svenska IN/UT, lagposter och Free Agents kronologiskt. Lagbyggena kan gälla ECL, SCL, ITHL eller andra kommande turneringar.";
    }

    const method = section.querySelector(".ecl27v2-method");
    if (method) {
      const strong = method.querySelector("strong");
      if (strong) strong.textContent = "Arbetsbild – inte officiella turneringsrosters";
      method.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          node.textContent = node.textContent
            .replace(/ECL-Free Agent/g, "Free Agent")
            .replace(/senaste kända ECL-lag/g, "senaste kända lag")
            .replace(/SEC-only-poster inte används/g, "turneringsspecifika poster används bara när de beskriver en faktisk lagförändring");
        }
      });
    }

    section.querySelectorAll("h3").forEach((heading) => {
      if (heading.textContent.trim() === "Svenska lagbyggen just nu") {
        heading.textContent = "Lagbyggen just nu";
      }
    });

    section.querySelectorAll("span, small, p").forEach((el) => {
      if (el.textContent.trim() === "Bekräftade rörelser + Free Agents") {
        el.textContent = "Bekräftade lagrörelser + Free Agents";
      }
    });
  }

  function schedule() {
    [0, 80, 200, 500, 1000, 1800, 3000].forEach((delay) => {
      window.setTimeout(applyNeutralLabels, delay);
    });
  }

  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  schedule();
})();
