(function () {
  "use strict";

  const STORAGE_KEY = "seh_current_player_stats_sync_request_id";
  const SCL_STORAGE_KEY = "seh_scl27_official_teams_sync_request_id";
  const ADMIN_BADGE_STORAGE_KEY = "seh_admin_pending_badge_v1";
  const ADMIN_BADGE_CHANNEL = "seh_admin_pending_badge";
  let adminBadgeChannel = null;
  let client = null;
  let pollTimer = null;
  let sclPollTimer = null;
  let adminBadgeTimer = null;
  let adminBadgeRefreshBusy = false;

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

  function adminNavLinks() {
    return Array.from(document.querySelectorAll('a[data-seh-auth-link="admin"]'));
  }

  function ensureAdminBadgeStyles() {
    if (document.getElementById("sehAdminPendingBadgeStyles")) return;
    const style = document.createElement("style");
    style.id = "sehAdminPendingBadgeStyles";
    style.textContent = `
      .seh-admin-pending-badge {
        display: inline-grid;
        place-items: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        margin-left: 6px;
        border-radius: 999px;
        box-sizing: border-box;
        vertical-align: middle;
        font-size: 10px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0;
        font-variant-numeric: tabular-nums;
        transform: translateY(-1px);
        transition: background-color .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease;
      }
      .seh-admin-pending-badge[data-state="clear"] {
        color: #62e59b;
        background: rgba(40, 151, 92, .10);
        border: 1px solid rgba(98, 229, 155, .62);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .18);
      }
      .seh-admin-pending-badge[data-state="pending"] {
        color: #fff;
        background: #e73535;
        border: 1px solid #ff6767;
        box-shadow: 0 0 0 2px rgba(231, 53, 53, .12), 0 0 12px rgba(231, 53, 53, .20);
      }
      @media (max-width: 760px) {
        .seh-admin-pending-badge {
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          margin-left: 5px;
          font-size: 9px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureAdminNavBadges() {
    ensureAdminBadgeStyles();
    adminNavLinks().forEach(function (link) {
      let badge = link.querySelector(".seh-admin-pending-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "seh-admin-pending-badge";
        badge.dataset.state = "clear";
        badge.textContent = "0";
        badge.setAttribute("aria-label", "Inga väntande adminärenden");
        link.appendChild(badge);
      }
    });
  }

  function setAdminBadgeCount(count, breakdown) {
    const safeCount = Math.max(0, Number(count) || 0);
    const visibleText = safeCount > 99 ? "99+" : String(safeCount);
    const details = breakdown || {};
    const title = safeCount > 0
      ? `${safeCount} väntande adminärenden · ${details.links || 0} kopplingar · ${details.fa || 0} Free Agent · ${details.profiles || 0} profilärenden`
      : "Inga väntande adminärenden";

    ensureAdminNavBadges();
    adminNavLinks().forEach(function (link) {
      const badge = link.querySelector(".seh-admin-pending-badge");
      if (!badge) return;
      badge.textContent = visibleText;
      badge.dataset.state = safeCount > 0 ? "pending" : "clear";
      badge.setAttribute("aria-label", title);
      badge.title = title;
    });
  }

  function normalizeAdminBadgePayload(count, breakdown) {
    const details = breakdown || {};
    return {
      total: Math.max(0, Number(count) || 0),
      breakdown: {
        links: Math.max(0, Number(details.links) || 0),
        fa: Math.max(0, Number(details.fa) || 0),
        profiles: Math.max(0, Number(details.profiles) || 0)
      },
      updatedAt: Date.now()
    };
  }

  function publishAdminBadgeCount(count, breakdown) {
    const payload = normalizeAdminBadgePayload(count, breakdown);
    setAdminBadgeCount(payload.total, payload.breakdown);

    try {
      localStorage.setItem(ADMIN_BADGE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}

    try {
      adminBadgeChannel?.postMessage(payload);
    } catch (_) {}
  }

  function applyStoredAdminBadge() {
    try {
      const raw = localStorage.getItem(ADMIN_BADGE_STORAGE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (!payload || !Number.isFinite(Number(payload.total))) return false;
      setAdminBadgeCount(payload.total, payload.breakdown || {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function startAdminBadgeCrossTabSync() {
    applyStoredAdminBadge();

    window.addEventListener("storage", function (event) {
      if (event.key !== ADMIN_BADGE_STORAGE_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        setAdminBadgeCount(payload.total, payload.breakdown || {});
      } catch (_) {}
    });

    if ("BroadcastChannel" in window) {
      try {
        adminBadgeChannel = new BroadcastChannel(ADMIN_BADGE_CHANNEL);
        adminBadgeChannel.addEventListener("message", function (event) {
          const payload = event?.data || {};
          setAdminBadgeCount(payload.total, payload.breakdown || {});
        });
      } catch (_) {
        adminBadgeChannel = null;
      }
    }

    window.addEventListener("focus", function () {
      applyStoredAdminBadge();
      refreshAdminNavBadge();
    });
  }

  window.SEH_setAdminPendingBadge = function SEH_setAdminPendingBadge(count, breakdown) {
    publishAdminBadgeCount(count, breakdown || {});
  };

  window.addEventListener("seh:admin-pending-count", function (event) {
    const detail = event?.detail || {};
    publishAdminBadgeCount(detail.total, detail.breakdown || {});
  });

  async function refreshAdminNavBadge() {
    if (adminBadgeRefreshBusy) return;
    ensureAdminNavBadges();
    const links = adminNavLinks();
    if (!links.length || !links.some(function (link) { return !link.hidden; })) return;

    const supabase = getClient();
    if (!supabase) return;

    adminBadgeRefreshBusy = true;
    try {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error || !sessionResult.data.session) return;

      const { data, error } = await supabase.rpc("seh_admin_pending_counts");
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const breakdown = {
        links: Number(row?.links) || 0,
        fa: Number(row?.fa) || 0,
        profiles: Number(row?.profiles) || 0
      };
      publishAdminBadgeCount(Number(row?.total) || 0, breakdown);
    } catch (error) {
      console.warn("Kunde inte läsa väntande adminärenden till navigeringen", error);
    } finally {
      adminBadgeRefreshBusy = false;
    }
  }

  function scheduleAdminBadgeWarmup() {
    [0, 150, 450, 1000, 2200, 4500].forEach(function (delay) {
      window.setTimeout(function () {
        ensureAdminNavBadges();
        refreshAdminNavBadge();
      }, delay);
    });
  }

  function startAdminBadgeRefresh() {
    scheduleAdminBadgeWarmup();
    window.clearInterval(adminBadgeTimer);
    adminBadgeTimer = window.setInterval(function () {
      if (!document.hidden) refreshAdminNavBadge();
    }, 15000);
  }

  function requestId() {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  }

  function sclRequestId() {
    return sessionStorage.getItem(SCL_STORAGE_KEY) || "";
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

  function sclStatusElement() {
    return document.getElementById("scl27TeamsSyncStatus");
  }

  function setSclStatus(message, tone, runUrl) {
    const status = sclStatusElement();
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

  function setSclBusy(isBusy) {
    const start = document.getElementById("startScl27TeamsSync");
    const refresh = document.getElementById("refreshScl27TeamsSync");
    if (start) start.disabled = isBusy;
    if (refresh) refresh.disabled = isBusy || !sclRequestId();
  }

  async function invokeScl(action) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase är inte initierat.");

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data.session) throw new Error("Du måste logga in igen.");

    const response = await supabase.functions.invoke("seh-admin-sync", {
      body: {
        action,
        job: "fantasy_sportsgamer",
        request_id: sclRequestId(),
        competition_code: "SCL2027",
        league_ids: [527]
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

  async function refreshScl(continuePolling) {
    if (!sclRequestId() || !sclStatusElement()) return;
    window.clearTimeout(sclPollTimer);
    setSclBusy(true);
    try {
      const data = await invokeScl("status");
      const done = data.state === "completed";
      setSclStatus(
        done
          ? (data.conclusion === "success"
              ? "Klart – SCL 27-lag, registrerade trupper, Lagbygge och Svenska lag är uppdaterade."
              : "SCL 27-synkningen misslyckades.")
          : (data.state === "queued" ? "SCL 27-synkningen väntar på att starta…" : "SCL 27-lag och trupper uppdateras…"),
        done && data.conclusion === "success" ? "success" : done ? "error" : "working",
        data.run_url || ""
      );
      if (continuePolling && !done) {
        sclPollTimer = window.setTimeout(function () { refreshScl(true); }, 7000);
      }
    } catch (error) {
      setSclStatus("Fel: " + (error?.message || error), "error");
    } finally {
      setSclBusy(false);
    }
  }

  function buildSclCard() {
    const card = document.createElement("article");
    card.className = "admin-card admin-home-card";
    card.id = "scl27TeamsSyncCard";
    card.innerHTML = [
      '<p class="writer-panel-kicker">SCL 27</p>',
      '<h2>Officiella lag</h2>',
      '<p>Hämtar anmälda lag och registrerade trupper från SportsGamer liga 527. Lagbygge uppdateras och lagen skrivs även in i Svenska lag-registret. Befintliga lag matchas på namn/alias så att de inte dubblas.</p>',
      '<div class="admin-actions">',
      '<button id="startScl27TeamsSync" type="button">Synka SCL 27-lag</button>',
      '<button id="refreshScl27TeamsSync" class="writer-secondary" type="button" disabled>Kontrollera status</button>',
      '</div>',
      '<p id="scl27TeamsSyncStatus" class="admin-status" role="status" aria-live="polite"></p>'
    ].join("");
    return card;
  }

  function mountSclCard() {
    if (!isAdminHome() || document.getElementById("scl27TeamsSyncCard")) return;
    const grid = document.querySelector("#adminDashboard .admin-grid");
    const playerSyncCard = document.getElementById("startPlayerSync")?.closest(".admin-card");
    if (!grid || !playerSyncCard) return;

    const card = buildSclCard();
    playerSyncCard.insertAdjacentElement("afterend", card);

    document.getElementById("startScl27TeamsSync")?.addEventListener("click", async function () {
      if (!window.confirm("Hämta de officiellt anmälda SCL 27-lagen och trupperna från SportsGamer liga 527 nu? Lagbygge och Svenska lag-registret uppdateras.")) return;
      const id = makeId();
      sessionStorage.setItem(SCL_STORAGE_KEY, id);
      setSclBusy(true);
      setSclStatus("Startar SCL 27-synkningen…", "working");
      try {
        await invokeScl("start");
        await refreshScl(true);
      } catch (error) {
        setSclStatus("Fel: " + (error?.message || error), "error");
        setSclBusy(false);
      }
    });

    document.getElementById("refreshScl27TeamsSync")?.addEventListener("click", function () {
      refreshScl(false);
    });

    setSclBusy(false);
    if (sclRequestId()) refreshScl(true);
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

  function mountDownloadStats(webapp = false) {
    const cardId = webapp ? "webappOpenStatsCard" : "appDownloadStatsCard";
    if (!isAdminHome() || document.getElementById(cardId)) return;
    const grid = document.querySelector("#adminDashboard .admin-grid");
    if (!grid) return;
    const card = document.createElement("article");
    card.id = cardId;
    card.className = "admin-card admin-home-card";
    card.innerHTML = '<p class="writer-panel-kicker">ANDROID-APPEN</p><h2>Nedladdningar</h2><p data-download-count role="status">Hämtar antal…</p><p>Klick på nedladdningsknappen från 15 september 2026. Inte installationer eller unika personer. Direktlänkar till APK-filen räknas inte.</p><div class="admin-actions"><button type="button">Uppdatera antal</button></div>';
    if (webapp) card.innerHTML = '<p class="writer-panel-kicker">IPHONE-WEBBAPPEN</p><h2>Öppningsklick</h2><p data-download-count role="status">Hämtar antal…</p><p>Klick på ”Öppna webbappen” på iPhone-sidan från 16 september 2026. Inte unika personer eller installationer. Starter från hemskärmen räknas inte.</p><div class="admin-actions"><button type="button">Uppdatera antal</button></div>';
    grid.appendChild(card);
    const status = card.querySelector("[data-download-count]");
    const button = card.querySelector("button");
    async function refreshDownloads() {
      button.disabled = true;
      try {
        const db = getClient();
        if (!db) throw new Error("Anslutning saknas");
        const role = await db.rpc("seh_current_writer_role");
        if (role.error || role.data !== "admin") throw new Error("Admininloggning krävs");
        const result = await db.from(webapp ? "seh_webapp_open_clicks" : "seh_app_download_clicks").select("id", { count: "exact", head: true });
        if (result.error) throw result.error;
        status.textContent = Number(result.count || 0).toLocaleString("sv-SE") + (webapp ? " öppningsklick totalt" : " nedladdningsklick totalt");
      } catch (_) {
        status.textContent = "Kunde inte hämta antal. Kontrollera admininloggningen och försök igen.";
      } finally {
        button.disabled = false;
      }
    }
    button.addEventListener("click", refreshDownloads);
    refreshDownloads();
  }

  function mount() {
    mountDownloadStats();
    mountDownloadStats(true);
    mountSclCard();
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

  new MutationObserver(function () {
    mount();
    ensureAdminNavBadges();
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("hashchange", function () {
    window.clearTimeout(pollTimer);
    window.clearTimeout(sclPollTimer);
    window.setTimeout(function () {
      mount();
      ensureAdminNavBadges();
      refreshAdminNavBadge();
    }, 0);
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      applyStoredAdminBadge();
      refreshAdminNavBadge();
    }
  });

  mount();
  startAdminBadgeCrossTabSync();
  startAdminBadgeRefresh();

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
