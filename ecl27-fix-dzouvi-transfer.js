/* ECL 27 – korrigering 2026-09-08: Dzouvi_ från vNexs till Unwanted den 7 sep. */
(function () {
  "use strict";

  const ROUTE_PREFIX = "#/sasong/ecl27winter";

  function norm(value) {
    return String(value || "").trim().toLocaleLowerCase("sv-SE");
  }

  function teamCard(name) {
    const wanted = norm(name);
    return Array.from(document.querySelectorAll("#ecl27v2Grid .ecl27v2-card"))
      .find((card) => norm(card.querySelector("h3")?.textContent) === wanted) || null;
  }

  function rosterNames(card) {
    return Array.from(card?.querySelectorAll(".ecl27v2-roster > div > span") || [])
      .map((node) => String(node.textContent || "").trim())
      .filter(Boolean);
  }

  function setRoster(card, names) {
    if (!card) return false;
    const host = card.querySelector(".ecl27v2-roster > div");
    if (!host) return false;
    const current = rosterNames(card);
    if (current.length === names.length && current.every((name, i) => norm(name) === norm(names[i]))) return false;
    host.innerHTML = names.length
      ? names.map((name) => `<span>${name.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c])}</span>`).join("")
      : "<em>Ingen säker spelare kvar i sammanställningen.</em>";
    const known = card.querySelector(".ecl27v2-metrics > div:first-child strong");
    if (known) known.textContent = String(names.length);
    return true;
  }

  function ensureMove(card, type, player, note) {
    if (!card) return false;
    const host = card.querySelector(".ecl27v2-moves");
    if (!host) return false;
    const exists = Array.from(host.querySelectorAll(".ecl27v2-move strong"))
      .some((node) => norm(node.textContent) === norm(player));
    if (exists) return false;
    const row = document.createElement("div");
    row.className = `ecl27v2-move ecl27v2-move--${type}`;
    row.innerHTML = `<span>${type === "in" ? "IN" : "UT"}</span><strong>${player}</strong>${note ? `<small>${note}</small>` : ""}<time datetime="2026-09-07">7 sep</time>`;
    const label = host.querySelector("label");
    if (label) label.insertAdjacentElement("afterend", row);
    else host.prepend(row);
    return true;
  }

  function setMetric(card, index, value) {
    const metric = card?.querySelectorAll(".ecl27v2-metrics > div")?.[index]?.querySelector("strong");
    if (metric && metric.textContent !== String(value)) {
      metric.textContent = String(value);
      return true;
    }
    return false;
  }

  function apply() {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;

    const vnexs = teamCard("vNexs");
    const unwanted = teamCard("Unwanted");
    if (!vnexs && !unwanted) return;

    if (vnexs) {
      const roster = rosterNames(vnexs).filter((name) => norm(name) !== "dzouvi_");
      setRoster(vnexs, roster);
      ensureMove(vnexs, "out", "Dzouvi_", "→ Unwanted");
      setMetric(vnexs, 2, 3);
    }

    if (unwanted) {
      const roster = rosterNames(unwanted);
      if (!roster.some((name) => norm(name) === "dzouvi_")) roster.push("Dzouvi_");
      setRoster(unwanted, roster);
      ensureMove(unwanted, "in", "Dzouvi_", "från vNexs");
      setMetric(unwanted, 1, 3);
    }
  }

  let timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = window.setTimeout(apply, 30);
  }

  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  document.addEventListener("input", schedule, true);
  document.addEventListener("change", schedule, true);

  const observer = new MutationObserver(() => {
    if (!String(location.hash || "").startsWith(ROUTE_PREFIX)) return;
    if (document.querySelector("#ecl27v2Grid")) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  schedule();
})();
