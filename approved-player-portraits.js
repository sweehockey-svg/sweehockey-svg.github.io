/* Use the same approved portrait as Min profil across the public site. */
(function () {
  "use strict";

  const portraits = new Map();
  const failed = new Set();
  const localPortrait = /(?:^|\/)(?:web-images\/)?players\/(\d+)\.png(?:\.webp)?(?:[?#].*)?$/i;
  let request;
  let observer;
  let enabled = false;
  const pending = new Set();
  let queued = false;

  function urlFor(id) {
    const url = portraits.get(String(id || ""));
    return url && !failed.has(url) ? url : "";
  }

  function load() {
    if (request) return request;
    request = (async () => {
      const config = window.EHOCKEY_CONFIG;
      if (!config?.supabaseUrl || !config.supabasePublishableKey) return;
      const pageSize = 250;
      for (let offset = 0; ; offset += pageSize) {
        const params = new URLSearchParams({
          select: "sports_gamer_player_id,image_url",
          sports_gamer_player_id: "not.is.null",
          image_url: "not.is.null",
          order: "sports_gamer_player_id.asc,approved_at.desc.nullslast,updated_at.desc.nullslast,player_key.asc",
          limit: String(pageSize),
          offset: String(offset)
        });
        const base = String(config.supabaseUrl).replace(/\/+$/, "");
        const response = await fetch(`${base}/rest/v1/v_ehockey_player_self_profiles_public?${params}`, {
          cache: "no-store",
          headers: { apikey: config.supabasePublishableKey, Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`Porträtt: HTTP ${response.status}`);
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error("Ogiltigt porträttsvar");
        for (const row of rows) {
          const id = String(row.sports_gamer_player_id || "");
          const url = String(row.image_url || "").trim();
          if (/^\d+$/.test(id) && /^https?:\/\//i.test(url) && !portraits.has(id)) portraits.set(id, url);
        }
        if (rows.length < pageSize) break;
      }
    })().catch(() => {
      request = undefined;
    });
    return request;
  }

  function update(img) {
    if (!img.isConnected) return;
    const src = img.getAttribute("src") || "";
    const id = img.dataset.sehPortraitId || src.match(localPortrait)?.[1];
    const approved = urlFor(id);
    if (!approved || img.src === approved) return;
    // A route that already resolved its own approval keeps that source.
    if (!localPortrait.test(src) && !/1DEFAULTBILDID\.png/i.test(src)) return;
    img.dataset.sehApprovedPortrait = "1";
    img.addEventListener("error", () => {
      failed.add(approved);
      queueMicrotask(() => {
        if (img.src !== approved && !/1DEFAULTBILDID\.png/i.test(img.getAttribute("src") || "")) return;
        delete img.dataset.sehApprovedPortrait;
        img.src = src;
      });
    }, { once: true });
    img.src = approved;
  }

  function collect(node) {
    if (node.nodeType !== 1) return;
    const add = img => {
      if (img.dataset.sehPortraitId || localPortrait.test(img.getAttribute("src") || "")) pending.add(img);
    };
    if (node.matches("img")) add(node);
    else node.querySelectorAll("img").forEach(add);
  }

  function flush() {
    if (queued || !pending.size) return;
    queued = true;
    queueMicrotask(async () => {
      await load();
      queued = false;
      if (enabled) pending.forEach(update);
      pending.clear();
    });
  }

  function mount() {
    enabled = !/^#\/(?:admin(?:center)?|skriv)(?:[/?#-]|$)/i.test(window.location.hash);
    observer?.disconnect();
    pending.clear();
    if (!enabled || !document.body) return;
    observer ||= new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "attributes") collect(record.target);
        else record.addedNodes.forEach(collect);
      }
      flush();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    collect(document.body);
    flush();
  }

  window.SEH_approvedPlayerPortraitUrl = id => enabled ? urlFor(id) : "";
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
  window.addEventListener("hashchange", mount);
})();
