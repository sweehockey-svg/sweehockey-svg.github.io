/*
  ECL 27 – ta bort inaktiva/utgångna projekt ur lagbyggen.
  Västerås Vipers: samtliga fyra kända spelare lämnade 6 sep.
  Lila skeppet: de två kända spelarna Wilhelmsson90 och Bylle67 lämnade 11 respektive 17 aug,
  och vi har ingen senare roster-/rekryteringsaktivitet som visar ett fortsatt ECL 27-bygge.
*/
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";
  const HIDDEN_TEAMS = new Set(["västerås vipers", "lila skeppet"]);
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
        if (HIDDEN_TEAMS.has(name)) card.remove();
      }

      // 27 Spring-lag + 6 nya projekt = 33 lag/projekt.
      const overviewCells = section.querySelectorAll(".ecl27-overview > div");
      if (overviewCells[1]) {
        const value = overviewCells[1].querySelector("strong");
        if (value) value.textContent = "6";
      }

      const result = section.querySelector("#ecl27BuildResult");
      if (result) {
        const match = String(result.textContent || "").match(/^(\d+)\s+av\s+\d+\s+lag\/projekt$/i);
        if (match) {
          const visible = Math.min(Number(match[1]) || 0, 33);
          result.textContent = `${visible} av 33 lag/projekt`;
        } else if (/lag\/projekt/i.test(String(result.textContent || ""))) {
          result.textContent = "33 lag/projekt";
        }
      }

      // Källförstärkningens kandidattext ska följa aktuell totalsiffra.
      for (const node of section.querySelectorAll(".ecl27-candidate-team small")) {
        node.textContent = String(node.textContent || "")
          .replace("35 bekräftade lag/projekten", "33 bekräftade lag/projekten")
          .replace("34 bekräftade lag/projekten", "33 bekräftade lag/projekten");
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
