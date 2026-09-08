/*
  ECL 27 – reconcile + länkar v5
  2026-09-08

  Gör fyra saker:
  1) Spelar igenom IN/UT kronologiskt så en UT-spelare inte kan ligga kvar i "Känd trupp".
  2) En senare IN till ett annat lag flyttar spelaren dit och tar bort honom från tidigare lag.
  3) Aktiva ECL-Free Agents räknas som UT och tas bort från känd trupp.
  4) Länkar spelare till spelarprofiler och lag till laghistorik när team_id kan lösas.

  Ingen MutationObserver används (för att undvika render-loop på SPA-sidan).
*/
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";

  const FALLBACK_ALIASES = Object.freeze({
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

  /*
    Poster som vi uttryckligen använder som medlemsbevis.
    De här är inte "alla som någonsin postat", utan de fall där Discord-underlaget
    tillsammans med övrig data gör att postaren ska räknas till laget.
  */
  const POSTER_MEMBERSHIP = Object.freeze([
    { player: "Gyldisen",       team: "Lila skeppet",         date: "2026-08-03" },
    { player: "Bulten_49",      team: "VBO Stars",            date: "2026-08-25" },
    { player: "Elonnholm",      team: "Shadow Skulls",        date: "2026-07-26" },
    { player: "toretussan",     team: "Shadow Skulls",        date: "2026-09-06" },
    { player: "mactheking.",    team: "Shadow Skulls",        date: "2026-06-25" },
    { player: "strandh85",      team: "BIK Karlskoga",        date: "2026-08-07" },
    { player: "Snus97_",        team: "Unwanted",             date: "2026-09-07" },
    { player: "bystromjr_",     team: "AFTERLIFE",            date: "2026-09-07" },
    { player: "Sallee42",       team: "Lilmix",               date: "2026-08-31" },
    { player: "D4nzk80",        team: "Burchurs HC",          date: "2026-09-03" },
    { player: "Stickovic",      team: "Brynäs IF Esport",     date: "2026-09-03" },
    { player: "Malmenlid",      team: "vNexs Wisemen",        date: "2026-07-31" },
    { player: "MrXbox79",       team: "Västerås IK",          date: "2026-08-24" },
    { player: "FearlezZ_92",    team: "N E O N X",            date: "2026-08-10" },
    { player: "MrBumban1",      team: "BIK Karlskoga Academy",date: "2026-08-20" },
    { player: "KUNGENANTON02",  team: "vNexs Vipers",         date: "2026-08-18" },
    { player: "troublemakingswe", team: "PRIMA",              date: "2026-07-29" },
    { player: "Diizzylicious",  team: "Zero Ping",            date: "2026-07-26" },
    { player: "Jompahell!",      team: "Monarchs HC",          date: "2026-09-06" }
  ]);

  const TEAM_ALIAS_CANDIDATES = Object.freeze({
    "vnexs": ["vNexs I"],
    "invasion hockey": ["Invasion"],
    "bik karlskoga": ["BIK Karlskoga Esport"],
    "northern ztars": ["Northern Ztars Hockey"],
    "södertälje sk": ["SSK ESPORTS"]
  });

  let teamLookupPromise = null;

  function norm(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("sv-SE")
      .replace(/\s+/g, " ");
  }

  function aliases() {
    return Object.assign({}, FALLBACK_ALIASES, window.SEH_ECL27_PLAYER_ALIASES || {});
  }

  function canonical(value) {
    const raw = String(value || "").trim();
    return aliases()[norm(raw)] || raw;
  }

  function slug(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function playerUrl(name) {
    const gt = canonical(name);
    if (typeof window.SEH_playerProfileUrl === "function") {
      return window.SEH_playerProfileUrl("", gt);
    }
    return `#/spelare/${encodeURIComponent(slug(gt))}`;
  }

  function teamCards() {
    return Array.from(document.querySelectorAll("#ecl27v2Grid .ecl27v2-card"));
  }

  function teamName(card) {
    return String(card?.querySelector("h3")?.textContent || "").trim();
  }

  function rosterHost(card) {
    return card?.querySelector(".ecl27v2-roster > div") || null;
  }

  function rosterNames(card) {
    return Array.from(rosterHost(card)?.querySelectorAll("span, a") || [])
      .map((node) => canonical(node.textContent))
      .filter(Boolean);
  }

  function uniqueNames(names) {
    const out = [];
    const seen = new Set();
    for (const raw of names || []) {
      const name = canonical(raw);
      const key = norm(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out;
  }

  function setRoster(card, names) {
    const host = rosterHost(card);
    if (!host) return;
    const clean = uniqueNames(names);
    host.innerHTML = clean.length
      ? clean.map((name) => `<span>${escapeHtml(name)}</span>`).join("")
      : "<em>Ingen säker spelare kvar i sammanställningen.</em>";
    updateKnownAndStatus(card, clean.length);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function eventDate(row) {
    return String(row?.querySelector("time")?.getAttribute("datetime") || "").trim();
  }

  function explicitEvents() {
    const result = [];
    for (const card of teamCards()) {
      const team = teamName(card);
      for (const row of card.querySelectorAll(".ecl27v2-move")) {
        const player = canonical(row.querySelector("strong")?.textContent);
        if (!player) continue;
        const type = row.classList.contains("ecl27v2-move--in") ? "in" : "out";
        result.push({
          player,
          team,
          date: eventDate(row),
          type,
          source: "move"
        });
      }
    }
    return result;
  }

  function allEvents() {
    return explicitEvents().concat(
      POSTER_MEMBERSHIP.map((item) => ({
        player: canonical(item.player),
        team: item.team,
        date: item.date,
        type: "in",
        source: "poster"
      }))
    );
  }

  function compareEvents(a, b) {
    const ad = String(a.date || "");
    const bd = String(b.date || "");
    if (ad !== bd) return ad.localeCompare(bd);

    // Samma datum: en IN-post ska vinna över en UT-post.
    // Det löser t.ex. ett lagbyte där UT + IN publiceras samma dag.
    if (a.type !== b.type) return a.type === "in" ? 1 : -1;

    // Poster-medlemskap används som kompletterande bevis och får vinna
    // över en lika daterad äldre grundrad.
    if (a.source !== b.source) return a.source === "poster" ? 1 : -1;
    return 0;
  }

  function latestEventByPlayer() {
    const map = new Map();
    for (const event of allEvents()) {
      const key = norm(canonical(event.player));
      if (!key) continue;
      const previous = map.get(key);
      if (!previous || compareEvents(previous, event) <= 0) {
        map.set(key, event);
      }
    }
    return map;
  }

  function activeFaNames() {
    const names = new Set();
    for (const node of document.querySelectorAll("#ecl27v2Grid .ecl27v2-fa span, #ecl27v2Grid .ecl27v2-fa a")) {
      const key = norm(canonical(node.textContent));
      if (key) names.add(key);
    }
    return names;
  }

  function reconcileRosters() {
    const cards = teamCards();
    if (!cards.length) return;

    const byTeam = new Map(cards.map((card) => [norm(teamName(card)), card]));
    const latest = latestEventByPlayer();
    const fa = activeFaNames();

    // Först: tillämpa senaste kända IN/UT per spelare.
    for (const [playerKey, event] of latest.entries()) {
      if (event.type === "in") {
        for (const card of cards) {
          const currentTeam = norm(teamName(card));
          let names = rosterNames(card);
          const has = names.some((name) => norm(canonical(name)) === playerKey);

          if (currentTeam === norm(event.team)) {
            if (!has) names.push(canonical(event.player));
          } else if (has) {
            names = names.filter((name) => norm(canonical(name)) !== playerKey);
          }
          setRoster(card, names);
        }
      } else {
        // Senaste kända händelsen är UT och inget senare IN finns:
        // spelaren ska inte ligga kvar som aktiv i något av våra lagkort.
        for (const card of cards) {
          const names = rosterNames(card).filter(
            (name) => norm(canonical(name)) !== playerKey
          );
          setRoster(card, names);
        }
      }
    }

    // Därefter: aktiv ECL-FA är alltid UT från känd trupp.
    for (const playerKey of fa) {
      for (const card of cards) {
        const names = rosterNames(card).filter(
          (name) => norm(canonical(name)) !== playerKey
        );
        setRoster(card, names);
      }
    }

    // Bulten_49 är det tydliga manuella fallet från senaste kontrollen:
    // hans VBO-post 25 aug gör VBO till senaste kända lag.
    const prima = byTeam.get(norm("PRIMA"));
    if (prima) {
      setRoster(
        prima,
        rosterNames(prima).filter((name) => norm(canonical(name)) !== norm("Bulten_49"))
      );
    }
  }

  function updateKnownAndStatus(card, count) {
    const known = card?.querySelector(".ecl27v2-metrics > div:first-child strong");
    if (known) known.textContent = String(count);

    const isNew = norm(card?.querySelector("header p")?.textContent).includes("nytt projekt");
    let key = "rebuild";
    let tone = "red";
    let label = isNew ? "Nytt lag · tidigt bygge" : "Kraftigt ombyggt";

    if (count >= 7) {
      key = "ready"; tone = "green";
      label = isNew ? "Nytt lag · ser färdigt ut" : "Ser färdigt ut";
    } else if (count >= 5) {
      key = "building"; tone = "yellow";
      label = isNew ? "Nytt lag · på god väg" : "På god väg";
    } else if (count >= 3) {
      key = "thin"; tone = "orange";
      label = isNew ? "Nytt lag · bygger" : "Tunt";
    }

    if (card) card.dataset.status = key;
    const badge = card?.querySelector(".ecl27v2-badges b");
    if (badge) {
      badge.textContent = label;
      badge.className = `is-${tone}`;
    }
  }

  function updateOutMetrics() {
    for (const card of teamCards()) {
      const out = new Set();
      for (const row of card.querySelectorAll(".ecl27v2-move--out")) {
        const key = norm(canonical(row.querySelector("strong")?.textContent));
        if (key) out.add(key);
      }
      for (const node of card.querySelectorAll(".ecl27v2-fa span, .ecl27v2-fa a")) {
        const key = norm(canonical(node.textContent));
        if (key) out.add(key);
      }

      const metric = card.querySelectorAll(".ecl27v2-metrics > div")?.[2]?.querySelector("strong");
      if (metric) metric.textContent = String(out.size);

      const faLabel = card.querySelector(".ecl27v2-fa label");
      if (faLabel) faLabel.textContent = "AKTIVA FREE AGENTS · RÄKNAS SOM UT";
    }
  }

  function linkPlayerNode(node) {
    if (!node || node.tagName === "A") return;
    const name = canonical(node.textContent);
    if (!name) return;
    const a = document.createElement("a");
    a.className = "ecl27v5-player-link";
    a.href = playerUrl(name);
    a.textContent = name;
    node.replaceWith(a);
  }

  function linkPlayers() {
    const selectors = [
      "#ecl27v2Grid .ecl27v2-roster > div > span",
      "#ecl27v2Grid .ecl27v2-fa > div > span",
      "#ecl27v2Grid .ecl27v2-move strong",
      "#ecl27TeamBuildsV2 .ecl27v2-feed-row strong"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(linkPlayerNode);
  }

  function teamCandidates(card) {
    const candidates = [teamName(card)];
    const source = String(card?.querySelector("header p")?.textContent || "");
    source.split("·").map((x) => x.trim()).filter(Boolean).forEach((x) => {
      if (!/^ecl 26 spring$/i.test(x) && !/^(elite|pro|lite|core|neo|nytt projekt)$/i.test(x)) {
        candidates.push(x);
      }
    });

    const aliasesForName = TEAM_ALIAS_CANDIDATES[norm(teamName(card))] || [];
    candidates.push(...aliasesForName);
    return uniqueNames(candidates);
  }

  function parseMaybeArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (_) {
      return [value];
    }
  }

  async function fetchTeamLookup() {
    if (teamLookupPromise) return teamLookupPromise;

    teamLookupPromise = (async () => {
      const config = window.EHOCKEY_CONFIG || {};
      const base = String(config.supabaseUrl || "").replace(/\/+$/, "");
      const key = String(config.supabasePublishableKey || "").trim();
      if (!/^https:\/\/.+\.supabase\.co$/i.test(base) || key.length < 20) return new Map();

      const params = new URLSearchParams({
        select: "team_id,current_name,historical_names,names_used_in_leagues,effective_country",
        effective_country: "eq.SE",
        limit: "5000"
      });

      const response = await fetch(`${base}/rest/v1/v_local_team_list?${params}`, {
        headers: { apikey: key, Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`v_local_team_list ${response.status}`);

      const rows = await response.json();
      const lookup = new Map();

      for (const row of Array.isArray(rows) ? rows : []) {
        const id = Number(row.team_id);
        if (!Number.isInteger(id) || id <= 0) continue;
        const names = [
          row.current_name,
          ...parseMaybeArray(row.historical_names),
          ...parseMaybeArray(row.names_used_in_leagues)
        ];
        for (const name of names) {
          const keyName = norm(name);
          if (keyName && !lookup.has(keyName)) lookup.set(keyName, id);
        }
      }
      return lookup;
    })().catch((error) => {
      console.warn("ECL27 team links:", error);
      teamLookupPromise = null;
      return new Map();
    });

    return teamLookupPromise;
  }

  function resolveTeamId(card, lookup) {
    for (const candidate of teamCandidates(card)) {
      const id = lookup.get(norm(candidate));
      if (id) return id;
    }
    return null;
  }

  function wrapTeamHeader(card, teamId) {
    if (!card || !teamId) return;
    const href = `#/lag/${encodeURIComponent(teamId)}`;

    const h3 = card.querySelector("h3");
    if (h3 && !h3.closest("a")) {
      const a = document.createElement("a");
      a.className = "ecl27v5-team-link ecl27v5-team-link--title";
      a.href = href;
      h3.replaceWith(a);
      a.appendChild(h3);
    }

    const logo = card.querySelector(".ecl27v2-logo");
    if (logo && !logo.closest("a")) {
      const a = document.createElement("a");
      a.className = "ecl27v5-team-link ecl27v5-team-link--logo";
      a.href = href;
      logo.replaceWith(a);
      a.appendChild(logo);
    }

    card.dataset.teamId = String(teamId);
  }

  function linkFeedTeams(lookup) {
    for (const row of document.querySelectorAll("#ecl27TeamBuildsV2 .ecl27v2-feed-row")) {
      const teamNode = row.querySelector(":scope > span");
      if (!teamNode || teamNode.tagName === "A") continue;
      const id = lookup.get(norm(teamNode.textContent));
      if (!id) continue;
      const a = document.createElement("a");
      a.className = "ecl27v5-team-link";
      a.href = `#/lag/${encodeURIComponent(id)}`;
      a.textContent = teamNode.textContent;
      teamNode.replaceWith(a);
    }
  }

  function linkMoveTeamMentions(lookup) {
    const cardNames = teamCards().map(teamName).sort((a, b) => b.length - a.length);

    for (const node of document.querySelectorAll("#ecl27v2Grid .ecl27v2-move small")) {
      if (node.querySelector("a")) continue;
      const text = String(node.textContent || "");
      const matched = cardNames.find((name) => norm(text).includes(norm(name)));
      if (!matched) continue;

      let id = lookup.get(norm(matched));
      if (!id) {
        const matchedCard = teamCards().find((card) => norm(teamName(card)) === norm(matched));
        id = Number(matchedCard?.dataset?.teamId) || null;
      }
      if (!id) continue;

      const index = text.toLocaleLowerCase("sv-SE").indexOf(matched.toLocaleLowerCase("sv-SE"));
      if (index < 0) continue;

      node.textContent = "";
      node.append(document.createTextNode(text.slice(0, index)));
      const a = document.createElement("a");
      a.className = "ecl27v5-team-link";
      a.href = `#/lag/${encodeURIComponent(id)}`;
      a.textContent = text.slice(index, index + matched.length);
      node.append(a, document.createTextNode(text.slice(index + matched.length)));
    }
  }

  async function linkTeams() {
    const lookup = await fetchTeamLookup();
    for (const card of teamCards()) {
      const id = resolveTeamId(card, lookup);
      if (id) {
        // Lägg även in kortets namn som lokal alias så feed/noteringar kan lösas.
        lookup.set(norm(teamName(card)), id);
        wrapTeamHeader(card, id);
      }
    }
    linkFeedTeams(lookup);
    linkMoveTeamMentions(lookup);
  }

  function injectStyles() {
    if (document.querySelector("#ecl27v5LinkStyle")) return;
    const style = document.createElement("style");
    style.id = "ecl27v5LinkStyle";
    style.textContent = `
      .ecl27v5-player-link{
        display:inline-flex;align-items:center;
        color:inherit;text-decoration:none;
      }
      .ecl27v2-roster .ecl27v5-player-link,
      .ecl27v2-fa .ecl27v5-player-link{
        padding:5px 7px;border:1px solid #1c3447;border-radius:6px;
        background:#05121c;color:#dfe7ed;font-size:9px;
      }
      .ecl27v2-fa .ecl27v5-player-link{
        color:#ffd75f;border-color:rgba(255,211,79,.18);
      }
      .ecl27v5-player-link:hover,
      .ecl27v5-team-link:hover{
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .ecl27v2-move .ecl27v5-player-link{
        font-size:10px;font-weight:700;color:#f5f1e8;
      }
      .ecl27v5-team-link{color:inherit;text-decoration:none}
      .ecl27v5-team-link--title{display:inline-block}
      .ecl27v5-team-link--logo{display:block;width:64px;height:64px}
      .ecl27v5-team-link--logo .ecl27v2-logo{width:64px;height:64px}
      .ecl27v2-feed-row .ecl27v5-team-link{font-size:inherit}
      .ecl27v2-move small .ecl27v5-team-link{color:#9cb4c7}
    `;
    document.head.appendChild(style);
  }

  async function apply() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
    if (!document.querySelector("#ecl27v2Grid")) return;

    injectStyles();
    reconcileRosters();
    updateOutMetrics();
    linkPlayers();
    await linkTeams();
  }

  function schedule() {
    // Kör efter v4:s retries så länkar och reconcile blir sista steget.
    [25, 120, 320, 800, 1750].forEach((delay) => {
      window.setTimeout(() => { apply(); }, delay);
    });
  }

  window.addEventListener("load", schedule);
  window.addEventListener("hashchange", schedule);

  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("#ecl27TeamBuildsV2")) schedule();
  }, true);

  document.addEventListener("change", (event) => {
    if (event.target?.closest?.("#ecl27TeamBuildsV2")) schedule();
  }, true);

  schedule();
})();
