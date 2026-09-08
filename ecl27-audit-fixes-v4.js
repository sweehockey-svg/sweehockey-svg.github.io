/*
  ECL 27 – auditfixar 2026-09-08
  Bekräftade alias + korrigeringar från Discord-underlaget.
  Aktiva ECL-Free Agents räknas även som spelare UT från sitt senaste kända lag.
  Viktigt: ingen MutationObserver här. Vi använder bara begränsade retries för att
  inte skapa en ny render-loop på SPA-sidan.
*/
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";

  const ALIASES = Object.freeze({
    "sloogan08": "Sloogan9498",
    "sloogan9498": "Sloogan9498",
    "erik": "Elonnholm",
    "elonnholm": "Elonnholm",
    "love engelkrans": "toretussan",
    "toretussan": "toretussan",
    "sjögren": "I-Sjogren-I",
    "i-sjogren-i": "I-Sjogren-I",
    "edlund": "Edluund___",
    "edluund___": "Edluund___",
    "wadde": "Wadde95",
    "wadde95": "Wadde95",
    "weeman": "weeman400_",
    "weeman400_": "weeman400_",
    "makk makk": "MakkMakk1980",
    "makkmakk1980": "MakkMakk1980",
    "sille": "sille_",
    "sille_": "sille_",
    "lunkan_7": "FaZe_lunkan07",
    "faze_lunkan07": "FaZe_lunkan07"
  });

  function norm(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
  }

  function canonical(value) {
    const raw = String(value || "").trim();
    return ALIASES[norm(raw)] || raw;
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
  }

  function card(teamName) {
    const wanted = norm(teamName);
    return Array.from(document.querySelectorAll("#ecl27v2Grid .ecl27v2-card"))
      .find(function (node) { return norm(node.querySelector("h3")?.textContent) === wanted; }) || null;
  }

  function rosterHost(teamCard) {
    return teamCard?.querySelector(".ecl27v2-roster > div") || null;
  }

  function roster(teamCard) {
    return Array.from(rosterHost(teamCard)?.querySelectorAll("span") || [])
      .map(function (node) { return canonical(node.textContent); })
      .filter(Boolean);
  }

  function uniqueNames(names) {
    const out = [];
    const seen = new Set();
    for (const name of names.map(canonical)) {
      const key = norm(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out;
  }

  function setRoster(teamCard, names) {
    const host = rosterHost(teamCard);
    if (!host) return;
    const clean = uniqueNames(names);
    host.innerHTML = clean.length
      ? clean.map(function (name) { return `<span>${esc(name)}</span>`; }).join("")
      : "<em>Ingen säker spelare kvar i sammanställningen.</em>";
    updateCardStatus(teamCard, clean.length);
  }

  function addPlayers(teamName, names) {
    const teamCard = card(teamName);
    if (!teamCard) return;
    setRoster(teamCard, roster(teamCard).concat(names));
  }

  function removePlayers(teamName, names) {
    const teamCard = card(teamName);
    if (!teamCard) return;
    const remove = new Set(names.map(canonical).map(norm));
    setRoster(teamCard, roster(teamCard).filter(function (name) { return !remove.has(norm(canonical(name))); }));
  }

  function renameAliasesInCard(teamCard) {
    if (!teamCard) return;
    setRoster(teamCard, roster(teamCard));
    for (const node of teamCard.querySelectorAll(".ecl27v2-move strong, .ecl27v2-fa span")) {
      const next = canonical(node.textContent);
      if (next && next !== String(node.textContent || "").trim()) node.textContent = next;
    }
  }

  function updateCardStatus(teamCard, count) {
    if (!teamCard) return;
    const known = teamCard.querySelector(".ecl27v2-metrics > div:first-child strong");
    if (known) known.textContent = String(count);

    const isNew = norm(teamCard.querySelector("header p")?.textContent).includes("nytt projekt");
    let key = "rebuild", tone = "red", label = isNew ? "Nytt lag · tidigt bygge" : "Kraftigt ombyggt";
    if (count >= 7) { key = "ready"; tone = "green"; label = isNew ? "Nytt lag · ser färdigt ut" : "Ser färdigt ut"; }
    else if (count >= 5) { key = "building"; tone = "yellow"; label = isNew ? "Nytt lag · på god väg" : "På god väg"; }
    else if (count >= 3) { key = "thin"; tone = "orange"; label = isNew ? "Nytt lag · bygger" : "Tunt"; }

    teamCard.dataset.status = key;
    const badge = teamCard.querySelector(".ecl27v2-badges b");
    if (badge) {
      badge.textContent = label;
      badge.className = `is-${tone}`;
    }
  }

  function updateOutMetricIncludingFa(teamCard) {
    if (!teamCard) return;

    const explicitOut = new Set();
    for (const row of teamCard.querySelectorAll(".ecl27v2-move--out")) {
      const name = canonical(row.querySelector("strong")?.textContent);
      const key = norm(name);
      if (key) explicitOut.add(key);
    }

    const activeFa = new Set();
    for (const node of teamCard.querySelectorAll(".ecl27v2-fa span")) {
      const name = canonical(node.textContent);
      const key = norm(name);
      if (key) activeFa.add(key);
    }

    const allOut = new Set(explicitOut);
    for (const key of activeFa) allOut.add(key);

    const outMetric = teamCard.querySelectorAll(".ecl27v2-metrics > div")?.[2]?.querySelector("strong");
    if (outMetric) outMetric.textContent = String(allOut.size);

    const faLabel = teamCard.querySelector(".ecl27v2-fa label");
    if (faLabel) faLabel.textContent = "AKTIVA FREE AGENTS · RÄKNAS SOM UT";
  }

  function ensureMove(teamName, type, player, date, note) {
    const teamCard = card(teamName);
    const host = teamCard?.querySelector(".ecl27v2-moves");
    if (!host) return;
    const wanted = norm(canonical(player));
    const already = Array.from(host.querySelectorAll(".ecl27v2-move")).some(function (row) {
      return norm(canonical(row.querySelector("strong")?.textContent)) === wanted &&
        norm(row.querySelector("span")?.textContent) === (type === "in" ? "in" : "ut");
    });
    if (already) return;

    const months = ["","jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
    const parts = String(date).split("-");
    const pretty = parts.length === 3 ? `${Number(parts[2])} ${months[Number(parts[1])]}` : date;
    const row = document.createElement("div");
    row.className = `ecl27v2-move ecl27v2-move--${type}`;
    row.innerHTML = `<span>${type === "in" ? "IN" : "UT"}</span><strong>${esc(canonical(player))}</strong>${note ? `<small>${esc(note)}</small>` : ""}<time datetime="${esc(date)}">${esc(pretty)}</time>`;
    const label = host.querySelector("label");
    if (label) label.insertAdjacentElement("afterend", row);
    else host.prepend(row);
  }

  function apply() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
    if (!document.querySelector("#ecl27v2Grid")) return;

    // Bekräftade alias ska visas som samma spelare överallt i lagkorten.
    for (const teamCard of document.querySelectorAll("#ecl27v2Grid .ecl27v2-card")) {
      renameAliasesInCard(teamCard);
    }

    // Postaren av en lagets IN/UT/söker-post räknas som tillhörande laget
    // tills ett senare besked säger något annat.
    addPlayers("Lila skeppet", ["Gyldisen"]);
    addPlayers("VBO Stars", ["Bulten_49"]);
    addPlayers("Shadow Skulls", ["mactheking.", "Elonnholm", "toretussan"]);
    addPlayers("BIK Karlskoga", ["strandh85"]);

    // SSK Academy: hultniklas lämnade 6 maj. Sloogan08 = Xbox-GT Sloogan9498.
    removePlayers("SSK Academy", ["HultNiklas"]);
    addPlayers("SSK Academy", ["Sloogan9498"]);

    // Senaste explicita Burchurs-rosterposten 3 sep styr nuläget.
    const burchurs = card("Burchurs HC");
    if (burchurs) setRoster(burchurs, ["Andre_24x", "IIFaranII", "Wadde95", "Anan20", "Strandis96", "D4nzk80", "Mrwennerstrom"]);

    // Tydliga ECL-FA-poster utan senare IN ska inte ligga kvar som säkra spelare.
    removePlayers("Sunne IK Esport", ["ePsych0-"]);
    removePlayers("vNexs II", ["JoakimOilers"]);
    removePlayers("AFTERLIFE", ["hajjeh37"]);
    removePlayers("Unwanted", ["XD_Jacke"]);
    removePlayers("PRIMA", ["Liimp_92"]);

    // Några tidiga rörelser som saknades i kortens historik.
    ensureMove("VBO Stars", "out", "hodini90", "2026-05-06", "");
    ensureMove("Monarchs HC", "out", "HulaDoome", "2026-05-11", "");
    ensureMove("Monarchs HC", "out", "handsken111", "2026-05-11", "");
    ensureMove("Shadow Skulls", "out", "mr_gren-", "2026-05-11", "");
    ensureMove("Invasion Hockey", "out", "I-Sjogren-I", "2026-05-06", "");
    ensureMove("SSK Academy", "out", "HultNiklas", "2026-05-06", "");

    // En aktiv ECL-Free Agent räknas som UT från sitt senaste kända lag.
    // Samma spelare räknas bara en gång även om både UT-post och FA finns.
    for (const teamCard of document.querySelectorAll("#ecl27v2Grid .ecl27v2-card")) {
      updateOutMetricIncludingFa(teamCard);
    }
  }

  function runRetries() {
    [0, 80, 250, 700, 1600].forEach(function (delay) {
      window.setTimeout(apply, delay);
    });
  }

  window.SEH_ECL27_PLAYER_ALIASES = ALIASES;
  window.addEventListener("load", runRetries);
  window.addEventListener("hashchange", runRetries);
  document.addEventListener("input", function (event) {
    if (event.target?.closest?.("#ecl27TeamBuildsV2")) runRetries();
  }, true);
  document.addEventListener("change", function (event) {
    if (event.target?.closest?.("#ecl27TeamBuildsV2")) runRetries();
  }, true);

  runRetries();
})();
