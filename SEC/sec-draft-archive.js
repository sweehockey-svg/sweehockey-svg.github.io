(function () {
  "use strict";

  const CUP_ID = "sommar-26";
  const DATA_URL = "./draft-sommar-26.json";
  const app = document.querySelector("#app");

  let data = null;
  let loadPromise = null;
  let patchQueued = false;
  let replacingView = false;

  if (!app) return;

  injectStyles();

  window.addEventListener("hashchange", queuePatch);
  window.addEventListener("DOMContentLoaded", queuePatch);

  const observer = new MutationObserver(queuePatch);
  observer.observe(app, {
    childList: true,
    subtree: true
  });

  queuePatch();

  function queuePatch() {
    if (patchQueued || replacingView) return;
    patchQueued = true;
    requestAnimationFrame(function () {
      patchQueued = false;
      patch();
    });
  }

  function getRoute() {
    const raw = String(location.hash || "")
      .replace(/^#\/?/, "");
    const parts = raw.split("?");
    const path = parts[0]
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);

    return {
      area: path[0] || "",
      cupId: path[1] || "",
      section: path[2] || "",
      params: new URLSearchParams(parts[1] || "")
    };
  }

  function patch() {
    const route = getRoute();

    if (route.area !== "cups" || route.cupId !== CUP_ID) {
      return;
    }

    addDraftNavLink(route.section);

    if (route.section !== "draft") {
      return;
    }

    const view = app.querySelector(".view");
    if (!view) return;

    if (
      view.querySelector("[data-sec-draft-archive]")
      && view.dataset.draftArchiveMode === getArchiveMode(route)
    ) {
      addDraftNavLink("draft");
      return;
    }

    loadData()
      .then(function (payload) {
        renderArchive(view, payload, route);
      })
      .catch(function (error) {
        renderError(view, error);
      });
  }

  function loadData() {
    if (data) return Promise.resolve(data);
    if (loadPromise) return loadPromise;

    loadPromise = fetch(DATA_URL, {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Draftarkivet svarade " + response.status + "."
          );
        }
        return response.json();
      })
      .then(function (payload) {
        data = payload;
        return data;
      })
      .finally(function () {
        loadPromise = null;
      });

    return loadPromise;
  }

  function addDraftNavLink(activeSection) {
    const nav = app.querySelector(".cupSectionNav");
    if (!nav) return;

    let link = nav.querySelector("[data-sec-draft-nav]");

    if (!link) {
      link = document.createElement("a");
      link.href = "#/cups/" + encodeURIComponent(CUP_ID) + "/draft";
      link.textContent = "Draften";
      link.setAttribute("data-sec-draft-nav", "");
      nav.appendChild(link);
    }

    link.classList.toggle(
      "active",
      activeSection === "draft"
    );
  }

  function getArchiveMode(route) {
    return route.params.get("view") === "teams"
      ? "teams"
      : "order";
  }

  function renderArchive(view, payload, route) {
    const mode = getArchiveMode(route);
    const nav = view.querySelector(".cupSectionNav");

    replacingView = true;
    view.dataset.draftArchiveMode = mode;

    /*
     * app-modern.js renderar redan SEC Sommar 26 med samma vanliga
     * cupheader, spotlight-kort och cupmeny som på Statistik-sidan.
     *
     * På Draften behåller vi därför allt fram till och med cupmenyn
     * och ersätter bara innehållet UNDER den. På så sätt hamnar
     * huvudmenyn på exakt samma plats som på de andra cupflikarna.
     */
    if (nav) {
      let sibling = nav.nextSibling;

      while (sibling) {
        const next = sibling.nextSibling;
        sibling.remove();
        sibling = next;
      }

      nav.insertAdjacentHTML(
        "afterend",
        archiveContentHtml(payload, mode)
      );
    } else {
      /*
       * Fallback om strukturen i app-modern.js någon gång ändras.
       * Då visas fortfarande draftarkivet, men utan att sidan kraschar.
       */
      view.innerHTML = `
        <div data-sec-draft-archive class="secDraftArchiveFallback">
          ${archiveContentHtml(payload, mode, true)}
        </div>
      `;
    }

    replacingView = false;
    addDraftNavLink("draft");
  }

  function archiveContentHtml(payload, mode, fallback) {
    const summary = payload.summary || {};
    const base = "#/cups/" + encodeURIComponent(CUP_ID);

    return `
      <div
        data-sec-draft-archive
        class="secDraftArchiveContent${fallback ? " secDraftArchiveFallbackContent" : ""}"
      >
        <section class="secDraftArchiveSummary" aria-label="Draftsammanfattning">
          ${draftSummaryStat(summary.teams, "Lag")}
          ${draftSummaryStat(summary.draftPicks, "Draftval")}
          ${draftSummaryStat(summary.players, "Spelare")}
          ${draftSummaryStat(summary.rounds, "Rundor")}
        </section>

        <div class="secDraftSubnavBlock">
          <div class="secDraftSubnavCopy">
            <span>Draftarkiv</span>
            <strong>Draft 8 augusti 2026</strong>
            <em>Slutlig snapshot · ingen livekoppling mot Google Sheet</em>
          </div>

          <nav class="subTabs secDraftArchiveTabs" aria-label="Draftvy">
            <a class="${mode === "order" ? "active" : ""}"
               href="${base}/draft">
              Draftordning
            </a>
            <a class="${mode === "teams" ? "active" : ""}"
               href="${base}/draft?view=teams">
              Lag efter draften
            </a>
          </nav>
        </div>

        ${
          mode === "teams"
            ? renderTeams(payload.teams || [])
            : renderPicks(payload.picks || [])
        }
      </div>
    `;
  }

  function draftSummaryStat(value, label) {
    return `
      <div>
        <strong>${number(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `;
  }

  function renderPicks(picks) {
    const rounds = new Map();

    picks.forEach(function (pick) {
      const round = Number(pick.roundNumber || 0);
      if (!rounds.has(round)) rounds.set(round, []);
      rounds.get(round).push(pick);
    });

    return `
      <section class="fullPagePanel secDraftOrderPanel">
        <div class="panelHead secDraftArchiveHead">
          <div>
            <span>Slutlig draftordning</span>
            <h3>Alla 74 val</h3>
          </div>
          <p>Snake draft · 8 lag · avslutad 8 augusti 2026</p>
        </div>

        <div class="secDraftRoundList">
          ${Array.from(rounds.entries()).map(function (entry) {
            const roundNumber = entry[0];
            const rows = entry[1];

            return `
              <section class="secDraftRound">
                <header>
                  <span>Runda</span>
                  <strong>${roundNumber}</strong>
                  <em>${rows.length} val</em>
                </header>
                <div class="secDraftPickGrid">
                  ${rows.map(renderPickCard).join("")}
                </div>
              </section>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderPickCard(pick) {
    return `
      <a class="secDraftPick"
         href="${sportsGamerUrl(pick.playerId)}"
         target="_blank"
         rel="noopener">
        <span class="secDraftPickNumber">#${number(pick.pickNumber)}</span>
        ${portrait(pick.playerId, pick.gt)}
        <span class="secDraftPickCopy">
          <strong>${escapeHtml(pick.gt)}</strong>
          <em>${escapeHtml(positionLabel(pick))}</em>
          <small>
            ${escapeHtml(pick.division || "NY")}
            ${pick.latestTeam ? " · " + escapeHtml(pick.latestTeam) : ""}
          </small>
        </span>
        <span class="secDraftPickedBy">
          <small>Vald av</small>
          <b>${escapeHtml(pick.teamName)}</b>
        </span>
      </a>
    `;
  }

  function renderTeams(teams) {
    return `
      <section class="secDraftTeamGrid">
        ${teams.map(renderTeamCard).join("")}
      </section>
    `;
  }

  function renderTeamCard(team) {
    const roster = Array.isArray(team.roster) ? team.roster : [];

    return `
      <article class="panel secDraftTeamCard">
        <header class="secDraftTeamHead">
          <div>
            <span>Draftposition ${number(team.draftPosition)}</span>
            <h3>Lag ${escapeHtml(team.teamName)}</h3>
            <p>
              Kapten:
              <a href="${sportsGamerUrl(team.captainPlayerId)}"
                 target="_blank"
                 rel="noopener">
                ${escapeHtml(team.captainGt)}
              </a>
            </p>
          </div>
          ${portrait(team.captainPlayerId, team.captainGt, true)}
        </header>

        <div class="secDraftRoster">
          ${roster.map(renderRosterPlayer).join("")}
        </div>
      </article>
    `;
  }

  function renderRosterPlayer(player) {
    const label = player.captain
      ? "C"
      : "#" + number(player.pickNumber);

    return `
      <a class="secDraftRosterPlayer"
         href="${sportsGamerUrl(player.playerId)}"
         target="_blank"
         rel="noopener">
        <span class="secDraftRosterPick">${label}</span>
        ${portrait(player.playerId, player.gt)}
        <span>
          <strong>${escapeHtml(player.gt)}</strong>
          <em>${escapeHtml(positionLabel(player))}</em>
        </span>
        <b class="secDraftDivision secDraftDivision${escapeClass(player.division)}">
          ${escapeHtml(player.division || "NY")}
        </b>
      </a>
    `;
  }

  function portrait(playerId, gt, large) {
    const sizeClass = large
      ? " secDraftPortraitLarge"
      : "";

    return `
      <span class="secDraftPortrait${sizeClass}">
        <img
          src="https://www.svenskehockey.se/players/${encodeURIComponent(playerId)}.jpg"
          alt="${escapeHtml(gt || "Spelare")}"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://www.svenskehockey.se/players/1DEFAULTBILDID.jpg';">
      </span>
    `;
  }

  function positionLabel(player) {
    const values = [
      player.mainPosition,
      player.alternativePosition
    ].filter(Boolean);

    return values.length
      ? values.join(" / ")
      : "Position ej angiven";
  }

  function heroStat(value, label) {
    return `
      <div>
        <strong>${number(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `;
  }

  function sportsGamerUrl(playerId) {
    return "https://sportsgamer.gg/players/"
      + encodeURIComponent(playerId);
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : "0";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      function (character) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[character];
      }
    );
  }

  function escapeClass(value) {
    return String(value || "")
      .replace(/[^A-Za-z0-9_-]/g, "");
  }

  function renderError(view, error) {
    replacingView = true;
    view.innerHTML = `
      <section class="emptyPage">
        Kunde inte ladda draftarkivet:
        ${escapeHtml(error && error.message ? error.message : String(error))}
      </section>
    `;
    replacingView = false;
  }

  function injectStyles() {
    if (document.querySelector("#sec-draft-archive-styles")) return;

    const style = document.createElement("style");
    style.id = "sec-draft-archive-styles";
    style.textContent = `
      .secDraftArchiveHero .cupKicker {
        color: #73e2d6;
      }

      .secDraftArchiveContent {
        display: grid;
        gap: 20px;
      }

      .secDraftArchiveSummary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 4px;
      }

      .secDraftArchiveSummary > div {
        min-height: 74px;
        display: grid;
        align-content: center;
        gap: 4px;
        padding: 12px 16px;
        border: 1px solid rgba(214,177,95,.24);
        border-radius: 16px;
        background: rgba(214,177,95,.04);
      }

      .secDraftArchiveSummary strong {
        color: #f0d58b;
        font-family: "Barlow Condensed", sans-serif;
        font-size: 28px;
        line-height: 1;
      }

      .secDraftArchiveSummary span {
        color: var(--muted, #9ca8bc);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .secDraftSubnavBlock {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 22px;
        padding: 16px 18px;
        border: 1px solid rgba(115,226,214,.16);
        border-radius: 16px;
        background: rgba(115,226,214,.025);
      }

      .secDraftSubnavCopy {
        min-width: 0;
        display: grid;
        gap: 2px;
      }

      .secDraftSubnavCopy span {
        color: #73e2d6;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .secDraftSubnavCopy strong {
        color: #f4f7fb;
        font-family: "Barlow Condensed", sans-serif;
        font-size: 22px;
        line-height: 1.1;
      }

      .secDraftSubnavCopy em {
        color: var(--muted, #9ca8bc);
        font-size: 10px;
        font-style: normal;
      }

      .secDraftArchiveTabs {
        flex: 0 0 auto;
        margin: 0;
      }

      .secDraftArchiveHead {
        align-items: end;
        gap: 24px;
        margin-bottom: 22px;
      }

      .secDraftArchiveHead > div {
        display: grid;
        gap: 4px;
      }

      .secDraftArchiveHead span {
        color: #73e2d6;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      .secDraftArchiveHead h3 {
        margin: 0;
      }

      .secDraftArchiveHead p {
        margin: 0;
        color: var(--muted, #9ca8bc);
        font-size: 13px;
        text-align: right;
      }

      .secDraftRoundList {
        display: grid;
        gap: 20px;
      }

      .secDraftRound {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }

      .secDraftRound > header {
        position: sticky;
        top: 16px;
        display: grid;
        justify-items: center;
        gap: 2px;
        padding: 14px 8px;
        border: 1px solid rgba(214,177,95,.24);
        border-radius: 16px;
        background: rgba(214,177,95,.055);
      }

      .secDraftRound > header span,
      .secDraftRound > header em {
        color: var(--muted, #9ca8bc);
        font-size: 9px;
        font-style: normal;
        font-weight: 800;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .secDraftRound > header strong {
        color: #f0d58b;
        font-family: "Barlow Condensed", sans-serif;
        font-size: 34px;
        line-height: 1;
      }

      .secDraftPickGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .secDraftPick {
        min-width: 0;
        display: grid;
        grid-template-columns: 46px 54px minmax(0, 1fr) minmax(110px, .55fr);
        gap: 10px;
        align-items: center;
        min-height: 84px;
        padding: 6px 10px;
        border: 1px solid rgba(255,255,255,.075);
        border-radius: 14px;
        color: inherit;
        background: rgba(255,255,255,.023);
        text-decoration: none;
        transition: border-color .15s ease, background .15s ease, transform .15s ease;
      }

      .secDraftPick:hover {
        transform: translateY(-1px);
        border-color: rgba(115,226,214,.36);
        background: rgba(115,226,214,.045);
      }

      .secDraftPickNumber {
        color: #f0d58b;
        font-family: "Barlow Condensed", sans-serif;
        font-size: 20px;
        font-weight: 900;
        text-align: center;
      }

      .secDraftPortrait {
        width: 54px;
        height: 72px;
        min-width: 54px;
        overflow: hidden;
        display: block;
        border: 1px solid rgba(240,213,139,.34);
        border-radius: 11px;
        background: #071228;
      }

      .secDraftPortrait img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center top;
        display: block;
      }

      .secDraftPortraitLarge {
        width: 72px;
        height: 96px;
        min-width: 72px;
        border-radius: 14px;
      }

      .secDraftPickCopy {
        min-width: 0;
        display: grid;
        gap: 2px;
      }

      .secDraftPickCopy strong,
      .secDraftRosterPlayer strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .secDraftPickCopy em,
      .secDraftRosterPlayer em {
        color: #73e2d6;
        font-size: 11px;
        font-style: normal;
        font-weight: 800;
      }

      .secDraftPickCopy small {
        min-width: 0;
        overflow: hidden;
        color: var(--muted, #9ca8bc);
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .secDraftPickedBy {
        min-width: 0;
        display: grid;
        gap: 2px;
        text-align: right;
      }

      .secDraftPickedBy small {
        color: var(--muted, #9ca8bc);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .secDraftPickedBy b {
        overflow: hidden;
        color: #f0d58b;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .secDraftTeamGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .secDraftTeamCard {
        padding: 18px;
      }

      .secDraftTeamHead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255,255,255,.07);
      }

      .secDraftTeamHead > div {
        min-width: 0;
      }

      .secDraftTeamHead span {
        color: #73e2d6;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .secDraftTeamHead h3 {
        margin: 4px 0;
        color: #f4f7fb;
        font-family: "Barlow Condensed", sans-serif;
        font-size: 30px;
        line-height: 1;
      }

      .secDraftTeamHead p {
        margin: 0;
        color: var(--muted, #9ca8bc);
        font-size: 11px;
      }

      .secDraftTeamHead a {
        color: #f0d58b;
      }

      .secDraftRoster {
        display: grid;
        gap: 6px;
        margin-top: 12px;
      }

      .secDraftRosterPlayer {
        min-width: 0;
        display: grid;
        grid-template-columns: 34px 48px minmax(0, 1fr) auto;
        gap: 9px;
        align-items: center;
        min-height: 70px;
        padding: 5px 8px;
        border: 1px solid rgba(255,255,255,.055);
        border-radius: 11px;
        color: inherit;
        background: rgba(255,255,255,.018);
        text-decoration: none;
      }

      .secDraftRosterPlayer .secDraftPortrait {
        width: 48px;
        height: 64px;
        min-width: 48px;
        border-radius: 9px;
      }

      .secDraftRosterPlayer > span:nth-of-type(3) {
        min-width: 0;
        display: grid;
        gap: 2px;
      }

      .secDraftRosterPick {
        color: #f0d58b;
        font-family: "Barlow Condensed", sans-serif;
        font-size: 16px;
        font-weight: 900;
        text-align: center;
      }

      .secDraftDivision {
        padding: 4px 7px;
        border: 1px solid rgba(115,226,214,.20);
        border-radius: 999px;
        color: #73e2d6;
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .secDraftDivisionElite {
        border-color: rgba(240,213,139,.32);
        color: #f0d58b;
      }

      @media (max-width: 1100px) {
        .secDraftPickGrid,
        .secDraftTeamGrid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .secDraftArchiveSummary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .secDraftSubnavBlock {
          align-items: stretch;
          flex-direction: column;
        }

        .secDraftArchiveTabs {
          width: 100%;
        }

        .secDraftRound {
          grid-template-columns: 1fr;
        }

        .secDraftRound > header {
          position: static;
          display: flex;
          justify-content: flex-start;
          align-items: baseline;
          gap: 8px;
        }

        .secDraftPick {
          grid-template-columns: 38px 48px minmax(0, 1fr);
          min-height: 76px;
        }

        .secDraftPick .secDraftPortrait {
          width: 48px;
          height: 64px;
          min-width: 48px;
        }

        .secDraftPickedBy {
          grid-column: 3;
          text-align: left;
        }

        .secDraftArchiveHead {
          align-items: start;
          flex-direction: column;
        }

        .secDraftArchiveHead p {
          text-align: left;
        }
      }
    `;

    document.head.appendChild(style);
  }
}());
