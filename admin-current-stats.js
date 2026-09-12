(function () {
  "use strict";

  const STORAGE_KEY = "seh_current_player_stats_sync_request_id";
  const ADMIN_BADGE_STORAGE_KEY = "seh_admin_pending_badge_v1";
  const ADMIN_BADGE_CHANNEL = "seh_admin_pending_badge";
  let adminBadgeChannel = null;
  let client = null;
  let pollTimer = null;
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

  new MutationObserver(function () {
    mount();
    ensureAdminNavBadges();
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("hashchange", function () {
    window.clearTimeout(pollTimer);
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
