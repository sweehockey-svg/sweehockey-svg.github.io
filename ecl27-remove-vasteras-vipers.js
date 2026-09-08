/*
  ECL 27 – ta bort Västerås Vipers ur lagbyggen.
  Laget hade fyra kända spelare 24 aug, men samtliga lämnade 6 sep.
  Vi visar därför inte laget som ett aktivt ECL 27-projekt.
*/
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";
  let applying = false;

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE");
  }

  function apply() {
    if (applying || !String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
    applying = true;

    try {
      const section = document.querySelector("#ecl27TeamBuilds");
      if (!section) return;

      for (const card of section.querySelectorAll("#ecl27BuildGrid .ecl27-card")) {
        const name = normalize(card.querySelector("h3")?.textContent);
        if (name === "västerås vipers") card.remove();
      }

      // 27 Spring-lag + 7 nya projekt = 34 lag/projekt.
      const overviewCells = section.querySelectorAll(".ecl27-overview > div");
      if (overviewCells[1]) {
        const value = overviewCells[1].querySelector("strong");
        if (value) value.textContent = "7";
      }

      const result = section.querySelector("#ecl27BuildResult");
      if (result) {
        const match = String(result.textContent || "").match(/^(\d+)\s+av\s+\d+\s+lag\/projekt$/i);
        if (match) {
          const visible = Math.min(Number(match[1]) || 0, 34);
          result.textContent = `${visible} av 34 lag/projekt`;
        } else if (/lag\/projekt/i.test(String(result.textContent || ""))) {
          result.textContent = "34 lag/projekt";
        }
      }

      // Källförstärkningens kandidattext hade tidigare totalsiffran 35.
      for (const node of section.querySelectorAll(".ecl27-candidate-team small")) {
        if (String(node.textContent || "").includes("35 bekräftade lag/projekten")) {
          node.textContent = String(node.textContent).replace("35 bekräftade lag/projekten", "34 bekräftade lag/projekten");
        }
      }
    } finally {
      applying = false;
    }
  }

  function scheduleApply() {
    window.setTimeout(apply, 0);
    window.setTimeout(apply, 120);
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("hashchange", scheduleApply);
  window.addEventListener("load", scheduleApply);
  document.addEventListener("input", scheduleApply, true);
  document.addEventListener("change", scheduleApply, true);

  scheduleApply();
})();
