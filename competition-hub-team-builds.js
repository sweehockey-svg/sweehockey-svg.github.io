/* Svensk eHockey – separat ingång för tävlingsneutrala lagbyggen. */
(function () {
  "use strict";

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

  function schedule() {
    [0, 80, 200, 500, 1000, 1800, 3000].forEach((delay) => {
      window.setTimeout(() => {
        applyCompetitionHub();
        scrollToTeamBuildsIfRequested();
      }, delay);
    });
  }

  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  schedule();
})();
