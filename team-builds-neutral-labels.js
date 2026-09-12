/* Svensk eHockey – tävlingsneutral text och ingång för svenska lagbyggen. */
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

  function applyCompetitionHub() {
    const card = document.querySelector(".ecl-hub-current-v12840");
    if (!card) return;

    const currentTitle = card.querySelector("strong")?.textContent?.trim() || "";
    if (card.dataset.sehTeamBuildsHub === "1") return;
    if (currentTitle !== "ECL ’27: Winter") return;

    card.dataset.sehTeamBuildsHub = "1";
    card.setAttribute("aria-label", "Lagbyggen och kommande ECL-säsong");
    card.innerHTML = `
      <span>AKTUELLT</span>
      <strong>Lagbyggen</strong>
      <p>Följ svenska lagbyggen, värvningar och Free Agents inför kommande tävlingar som SCL, ECL, ITHL och andra turneringar.</p>
      <div>
        <a class="ecl-hub-button-v12840" href="?lagbyggen=1#/sasong/ecl27winter">Öppna lagbyggen</a>
      </div>
      <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.10)">
        <span style="display:block;margin-bottom:7px">KOMMANDE ECL-SÄSONG</span>
        <strong style="display:block;font-size:22px;line-height:1.05;margin-bottom:8px">ECL ’27: Winter</strong>
        <p style="margin:0 0 14px">ECL ’27 Winter är nästa ECL-säsong. Tävlingssidan får full svensk bevakning när säsongsdata finns.</p>
        <a class="ecl-hub-button-v12840 ecl-hub-button-v12840--ghost" href="#/sasong/ecl27winter">Öppna ECL ’27 Winter</a>
      </div>
    `;
  }

  function scrollToTeamBuildsIfRequested() {
    let wantsTeamBuilds = false;
    try {
      wantsTeamBuilds = new URL(window.location.href).searchParams.get("lagbyggen") === "1";
    } catch (_) {}
    if (!wantsTeamBuilds) return;

    const target = document.querySelector("#ecl27TeamBuildsV2");
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("lagbyggen");
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (_) {}
  }

  function applyAll() {
    applyCompetitionHub();
    applyNeutralLabels();
    scrollToTeamBuildsIfRequested();
  }

  function schedule() {
    [0, 80, 200, 500, 1000, 1800, 3000].forEach((delay) => {
      window.setTimeout(applyAll, delay);
    });
  }

  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  schedule();
})();
