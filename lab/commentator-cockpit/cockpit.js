(() => {
  "use strict";

  const panels = {
    match: {
      kicker: "MATCH",
      title: "Matchöversikt",
      cards: [
        ["Nästa match", "När första Swehockey-importen är klar visas datum, tid, arena, domare, tabellposition och form här."],
        ["Datakälla", "Match- och liveinformationen kommer från Swehockey via vår collector, aldrig direkt från webbläsaren."]
      ]
    },
    lines: {
      kicker: "KEDJOR",
      title: "Laguppställning",
      cards: [
        ["Officiell lineup", "Fyra kedjor, backpar, startande målvakt och reservmålvakt laddas per match."],
        ["Versionshistorik", "Sena lineupändringar sparas som nya revisioner i stället för att skriva över historiken."]
      ]
    },
    live: {
      kicker: "LIVE",
      title: "Live matchdata",
      cards: [
        ["Eventfeed", "Mål, assists, utvisningar och målvaktsbyten reconcileras mot Swehockey."],
        ["Status", "Livepollingen aktiveras först när collectorn är driftsatt."]
      ]
    },
    story: {
      kicker: "STORYLINES",
      title: "Matchens vinklar",
      cards: [
        ["Automatiskt", "Form, tidigare möten, streaks och situationsstatistik byggs från verifierad historik."],
        ["Redaktionellt", "Egna anteckningar kan komplettera med sådant som inte finns i officiell statistik."]
      ]
    },
    h2h: {
      kicker: "H2H",
      title: "Tidigare möten",
      cards: [
        ["Senaste möten", "H2H räknas från sparade matcher, inte som en separat sanning i databasen."],
        ["Kontext", "Hemma/borta, målskillnad, sviter och största seger kan läggas ovanpå samma historik."]
      ]
    },
    studio: {
      kicker: "STUDIO",
      title: "Periodunderlag",
      cards: [
        ["Periodslut", "När rapportdata finns byggs ett kompakt pausunderlag med skott, special teams och nyckelhändelser."],
        ["Samtalspunkter", "Verifierade fakta prioriteras efter det som faktiskt har hänt i matchen."]
      ]
    },
    ai: {
      kicker: "AI",
      title: "AI-assistent",
      cards: [
        ["Begränsad källa", "AI får endast strukturerad, verifierad data från vår stats engine och egna godkända anteckningar."],
        ["Ingen statistikfantasi", "AI ska formulera samtalspunkter, inte hitta på eller själv samla in matchfakta."]
      ]
    }
  };

  const drawer = document.getElementById("drawer");
  const drawerKicker = document.getElementById("drawerKicker");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");

  function renderDrawer(key) {
    const data = panels[key] || panels.match;
    drawerKicker.textContent = data.kicker;
    drawerTitle.textContent = data.title;
    drawerBody.innerHTML = data.cards.map(([title, text]) =>
      `<article class="drawer-card"><strong>${title}</strong><span>${text}</span></article>`
    ).join("");
    drawer.classList.add("open");
  }

  document.querySelectorAll(".deck-key").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".deck-key").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderDrawer(button.dataset.panel);
    });
  });

  document.getElementById("closeDrawer").addEventListener("click", () => drawer.classList.remove("open"));

  document.getElementById("clearDemo").addEventListener("click", () => {
    const feed = document.getElementById("eventFeed");
    feed.innerHTML = `
      <div class="empty-icon">↯</div>
      <strong>Ingen eventdata ännu</strong>
      <p>Den här ytan börjar fyllas när Swehockey-collectorn är ansluten.</p>
    `;
  });

  function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  updateClock();
  window.setInterval(updateClock, 1000);

  window.CommentatorCockpit = {
    config: window.COMMENTATOR_CONFIG || null,
    openPanel: renderDrawer
  };
})();
