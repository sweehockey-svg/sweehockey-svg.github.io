(function () {
  "use strict";

  const STORAGE_KEY = "seh_current_player_stats_sync_request_id";
  let client = null;
  let pollTimer = null;

  function isAdminHome() {
    return location.hash === "#/admin" || location.hash === "#admin";
  }

  function getClient() {
    if (client) return client;
    const config = window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || {};
    const url = config.supabaseUrl || config.SUPABASE_URL || "";
    const key = config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_PUBLISHABLE_KEY || "";
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function requestId() {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  }

  function makeId() {
    return window.crypto?.randomUUID
      ? "web_" + window.crypto.randomUUID().replaceAll("-", "")
      : "web_" + Date.now();
  }

  function statusElement() {
    return document.getElementById("currentStatsSyncStatus");
  }

  function setStatus(message, tone, runUrl) {
    const status = statusElement();
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || "";
    if (runUrl) {
      const link = document.createElement("a");
      link.href = runUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = " Visa körlogg";
      status.append(link);
    }
  }

  function setBusy(isBusy) {
    const start = document.getElementById("startCurrentStatsSync");
    const refresh = document.getElementById("refreshCurrentStatsSync");
    if (start) start.disabled = isBusy;
    if (refresh) refresh.disabled = isBusy || !requestId();
  }

  async function invoke(action) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase är inte initierat.");

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data.session) throw new Error("Du måste logga in igen.");

    const response = await supabase.functions.invoke("seh-admin-sync", {
      body: {
        action,
        job: "current_swedish_player_stats",
        request_id: requestId()
      }
    });

    if (response.error) {
      let message = response.error.message || "Synktjänsten svarade med ett fel.";
      try {
        const details = await response.error.context?.json();
        if (details?.error) message = details.error;
      } catch (_) {}
      throw new Error(message);
    }
    if (response.data?.error) throw new Error(response.data.error);
    return response.data || {};
  }

  async function refresh(continuePolling) {
    if (!requestId() || !statusElement()) return;
    window.clearTimeout(pollTimer);
    setBusy(true);
    try {
      const data = await invoke("status");
      const done = data.state === "completed";
      setStatus(
        done
          ? (data.conclusion === "success"
              ? "Klart – aktuell spelarstatistik är uppdaterad."
              : "Snabbkörningen misslyckades.")
          : (data.state === "queued" ? "Snabbkörningen väntar på att starta…" : "Aktuell spelarstatistik uppdateras…"),
        done && data.conclusion === "success" ? "success" : done ? "error" : "working",
        data.run_url || ""
      );
      if (continuePolling && !done) {
        pollTimer = window.setTimeout(function () { refresh(true); }, 7000);
      }
    } catch (error) {
      setStatus("Fel: " + (error?.message || error), "error");
    } finally {
      setBusy(false);
    }
  }

  function buildCard() {
    const card = document.createElement("article");
    card.className = "admin-card admin-home-card";
    card.id = "currentStatsSyncCard";
    card.innerHTML = [
      '<p class="writer-panel-kicker">AKTUELL STATISTIK</p>',
      '<h2>Pågående turneringar</h2>',
      '<p>Snabbkörning som bara hämtar ny statistik från aktuella SportsGamer-turneringar. Äldre historik lämnas orörd.</p>',
      '<div class="admin-actions">',
      '<button id="startCurrentStatsSync" type="button">Uppdatera aktuell statistik</button>',
      '<button id="refreshCurrentStatsSync" class="writer-secondary" type="button" disabled>Kontrollera status</button>',
      '</div>',
      '<p id="currentStatsSyncStatus" class="admin-status" role="status" aria-live="polite"></p>'
    ].join("");
    return card;
  }

  function mount() {
    if (!isAdminHome()) return;
    if (document.getElementById("currentStatsSyncCard")) return;

    const dashboard = document.getElementById("adminDashboard");
    const grid = dashboard?.querySelector(".admin-grid");
    const fullStatsButton = document.getElementById("startStatsSync");
    const fullStatsCard = fullStatsButton?.closest(".admin-card");
    const playerSyncCard = document.getElementById("startPlayerSync")?.closest(".admin-card");
    if (!grid || !fullStatsCard || !playerSyncCard) return;

    const card = buildCard();
    grid.insertBefore(card, fullStatsCard);

    document.getElementById("startCurrentStatsSync")?.addEventListener("click", async function () {
      if (!window.confirm("Hämta ny statistik från aktuella SportsGamer-turneringar nu? Äldre turneringar lämnas orörda och SportsGamer-databasen läses endast.")) return;
      const id = makeId();
      sessionStorage.setItem(STORAGE_KEY, id);
      setBusy(true);
      setStatus("Startar snabbkörningen…", "working");
      try {
        await invoke("start");
        await refresh(true);
      } catch (error) {
        setStatus("Fel: " + (error?.message || error), "error");
        setBusy(false);
      }
    });

    document.getElementById("refreshCurrentStatsSync")?.addEventListener("click", function () {
      refresh(false);
    });

    setBusy(false);
    if (requestId()) refresh(true);
  }

  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", function () {
    window.clearTimeout(pollTimer);
    window.setTimeout(mount, 0);
  });
  mount();

  /*
    ECL 27 emergency guard:
    De tre ECL 27-tilläggsskripten laddas direkt efter denna fil. Två av dem skapade
    MutationObservers som själva skrev om DOM:en och därmed triggade sig själva i en
    oändlig render-loop. Admin-observern ovan är redan skapad, så vi kan tillfälligt
    ersätta MutationObserver medan ECL-skripten evalueras och återställa den på nästa
    event-loop-varv. ECL-skripten har egna hash/load/input-handlers och fungerar utan
    de kontinuerliga observers som orsakade låsningen.
  */
  if (!window.__sehNativeMutationObserver && window.MutationObserver) {
    window.__sehNativeMutationObserver = window.MutationObserver;
    window.MutationObserver = class SehNoopMutationObserver {
      constructor() {}
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    };
    window.setTimeout(function () {
      if (window.__sehNativeMutationObserver) {
        window.MutationObserver = window.__sehNativeMutationObserver;
        delete window.__sehNativeMutationObserver;
      }
    }, 0);
  }
}());
