(function () {
  "use strict";

  const STORAGE_KEY = "seh_current_player_stats_sync_request_id";
  const SCL_STORAGE_KEY = "seh_scl27_official_teams_sync_request_id";
  const STARTED_KEY = "seh_current_player_stats_sync_started_at";
  const WV_STORAGE_KEY = "seh_wv_sync_request_id";
  const WV_STARTED_KEY = "seh_wv_sync_started_at";
  let wvPollTimer = null;
  function wvRequestId() { return sessionStorage.getItem(WV_STORAGE_KEY) || ""; }
  const SCL_STARTED_KEY = "seh_scl27_official_teams_sync_started_at";
  const STATUS_POLL_MS = 15000;
  const STATUS_POLL_MAX_MS = 50 * 60 * 1000;
  const ADMIN_BADGE_REFRESH_MS = 5 * 60 * 1000;
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
      ? `${safeCount} väntande adminärenden · ${details.links || 0} kopplingar · ${details.fa || 0} Free Agent · ${details.profiles || 0} profilärenden · ${details.roster || 0} SCL/FCL`
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
        profiles: Math.max(0, Number(details.profiles) || 0),
        roster: Math.max(0, Number(details.roster) || 0)
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

      const [pendingResult, conflictResult] = await Promise.all([
        supabase.rpc("seh_admin_pending_counts"),
        supabase.rpc("seh_admin_scl_fcl_conflicts")
      ]);
      if (pendingResult.error) throw pendingResult.error;

      const row = Array.isArray(pendingResult.data) ? pendingResult.data[0] : pendingResult.data;
      const rosterConflicts = conflictResult.error
        ? 0
        : (Array.isArray(conflictResult.data) ? conflictResult.data.length : 0);
      const breakdown = {
        links: Number(row?.links) || 0,
        fa: Number(row?.fa) || 0,
        profiles: Number(row?.profiles) || 0,
        roster: rosterConflicts
      };
      publishAdminBadgeCount((Number(row?.total) || 0) + rosterConflicts, breakdown);
    } catch (error) {
      console.warn("Kunde inte läsa väntande adminärenden till navigeringen", error);
    } finally {
      adminBadgeRefreshBusy = false;
    }
  }

  function scheduleAdminBadgeWarmup() {
    [0, 2000].forEach(function (delay) {
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
    }, ADMIN_BADGE_REFRESH_MS);
  }

  function pollingIsFresh(storageKey) {
    const startedAt = Number(sessionStorage.getItem(storageKey) || 0);
    return startedAt > 0 && Date.now() - startedAt <= STATUS_POLL_MAX_MS;
  }

  function stopPolling(storageKey) {
    sessionStorage.removeItem(storageKey);
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
        if (pollingIsFresh(STARTED_KEY)) {
          pollTimer = window.setTimeout(function () { refresh(true); }, STATUS_POLL_MS);
        } else {
          setStatus("Statuskontrollen stoppades efter 50 minuter. Tryck Kontrollera status för en manuell kontroll.", "error", data.run_url || "");
        }
      }
      if (done) stopPolling(STARTED_KEY);
    } catch (error) {
      stopPolling(STARTED_KEY);
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
        job: "scl27_official_teams",
        request_id: sclRequestId()
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

  async function fetchSclFclConflicts() {
    const supabase = getClient();
    if (!supabase) return [];

    const result = await supabase.rpc("seh_admin_scl_fcl_conflicts");
    if (result.error) throw result.error;
    return Array.isArray(result.data) ? result.data : [];
  }

  function ensureSclFclConflictCard() {
    let card = document.getElementById("sclFclConflictCard");
    if (card) return card;

    const anchor = document.getElementById("scl27TeamsSyncCard");
    if (!anchor) return null;

    card = document.createElement("article");
    card.id = "sclFclConflictCard";
    card.className = "admin-card admin-home-card";
    card.hidden = true;
    card.style.borderColor = "rgba(255,82,82,.7)";
    card.style.background = "linear-gradient(180deg,rgba(82,13,13,.22),rgba(28,8,8,.15))";

    const kicker = document.createElement("p");
    kicker.className = "writer-panel-kicker";
    kicker.textContent = "SCL / FCL-KONTROLL";
    kicker.style.color = "#ff6b6b";

    const heading = document.createElement("h2");
    heading.textContent = "Dubbelregistrerade spelare";

    const intro = document.createElement("p");
    intro.dataset.conflictIntro = "true";

    const list = document.createElement("div");
    list.dataset.conflictList = "true";
    list.style.display = "grid";
    list.style.gap = "8px";
    list.style.marginTop = "12px";

    card.append(kicker, heading, intro, list);
    anchor.insertAdjacentElement("afterend", card);
    return card;
  }

  function renderSclFclConflicts(rows) {
    const card = ensureSclFclConflictCard();
    if (!card) return;

    const conflicts = Array.isArray(rows) ? rows : [];
    card.hidden = conflicts.length === 0;

    const intro = card.querySelector("[data-conflict-intro]");
    const list = card.querySelector("[data-conflict-list]");
    if (!intro || !list) return;

    list.replaceChildren();
    if (!conflicts.length) {
      intro.textContent = "";
      return;
    }

    intro.textContent = conflicts.length === 1
      ? "1 spelare finns registrerad i både SCL 27 och FCL."
      : conflicts.length + " spelare finns registrerade i både SCL 27 och FCL.";

    conflicts.forEach(function (row) {
      const item = document.createElement("div");
      item.style.padding = "10px 12px";
      item.style.border = "1px solid rgba(255,107,107,.35)";
      item.style.borderRadius = "10px";
      item.style.background = "rgba(0,0,0,.18)";

      const name = document.createElement("strong");
      name.textContent = String(row?.display_gamertag || ("Player " + (row?.sports_gamer_player_id || "")));

      const detail = document.createElement("div");
      detail.style.marginTop = "3px";
      detail.style.fontSize = "12px";
      detail.style.opacity = ".82";
      detail.textContent =
        "SCL: " + String(row?.scl_team_name || row?.scl_team_id || "–") +
        " · FCL: " + String(row?.fcl_team_name || row?.fcl_team_id || "–");

      item.append(name, detail);
      list.append(item);
    });
  }

  async function refreshSclFclConflictAlert(showPopup) {
    try {
      const rows = await fetchSclFclConflicts();
      renderSclFclConflicts(rows);

      const signature = rows
        .map(function (row) {
          return [
            row?.sports_gamer_player_id || "",
            row?.scl_team_id || "",
            row?.fcl_team_id || ""
          ].join(":");
        })
        .sort()
        .join("|");
      const storageKey = "seh_scl_fcl_conflict_alert_signature";

      if (!rows.length) {
        sessionStorage.removeItem(storageKey);
      } else if (showPopup && sessionStorage.getItem(storageKey) !== signature) {
        sessionStorage.setItem(storageKey, signature);
        const lines = rows.slice(0, 12).map(function (row) {
          const name = String(row?.display_gamertag || ("Player " + (row?.sports_gamer_player_id || "")));
          const scl = String(row?.scl_team_name || row?.scl_team_id || "–");
          const fcl = String(row?.fcl_team_name || row?.fcl_team_id || "–");
          return "• " + name + " — SCL: " + scl + " / FCL: " + fcl;
        });
        const more = rows.length > 12 ? "\n+" + (rows.length - 12) + " till" : "";
        window.alert(
          "VARNING: Spelare registrerade i både SCL och FCL\n\n" +
          lines.join("\n") +
          more
        );
      }

      refreshAdminNavBadge();
      return rows;
    } catch (error) {
      console.warn("Kunde inte kontrollera SCL/FCL-dubbelregistreringar", error);
      return [];
    }
  }

  async function refreshScl(continuePolling) {
    if (!sclRequestId() || !sclStatusElement()) return;
    window.clearTimeout(sclPollTimer);
    window.clearTimeout(wvPollTimer);
    setSclBusy(true);
    try {
      const data = await invokeScl("status");
      const done = data.state === "completed";
      setSclStatus(
        done
          ? (data.conclusion === "success"
              ? "Klart – SCL 27-lag, trupper, tabell och spelarstatistik är uppdaterade. Fantasy-poängen är omräknade från samma synkkörning."
              : "SCL 27-synkningen misslyckades.")
          : (data.state === "queued" ? "SCL 27-synkningen väntar på att starta…" : "SCL 27-lag, trupper, statistik och Fantasy uppdateras…"),
        done && data.conclusion === "success" ? "success" : done ? "error" : "working",
        data.run_url || ""
      );
      if (continuePolling && !done) {
        if (pollingIsFresh(SCL_STARTED_KEY)) {
          sclPollTimer = window.setTimeout(function () { refreshScl(true); }, STATUS_POLL_MS);
        } else {
          setSclStatus("Statuskontrollen stoppades efter 50 minuter. Tryck Kontrollera status för en manuell kontroll.", "error", data.run_url || "");
        }
      }
      if (done) {
        stopPolling(SCL_STARTED_KEY);
        if (data.conclusion === "success") {
          await refreshSclFclConflictAlert(true);
        }
      }
    } catch (error) {
      stopPolling(SCL_STARTED_KEY);
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
      '<h2>Gemensam SCL-synk</h2>',
      '<p>En körning hämtar lag, kaptener, trupper, tabell, spelarstatistik och matcher från SportsGamer liga 527 och räknar om Fantasy-poängen. Samma uppdaterade data används av SCL, Lagbygge, Graphics Studio och Broadcast Studio. Kontrollerar även dubbelregistrering i FCL (liga 529).</p>',
      '<div class="admin-actions">',
      '<button id="startScl27TeamsSync" type="button">Synka all SCL 27-data</button>',
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
      if (!window.confirm("Hämta SCL 27-lag, kaptener och registrerade trupper direkt från SportsGamer liga 527 nu?")) return;
      const id = makeId();
      sessionStorage.setItem(SCL_STORAGE_KEY, id);
      sessionStorage.setItem(SCL_STARTED_KEY, String(Date.now()));
      setSclBusy(true);
      setSclStatus("Startar SCL 27-synkningen…", "working");
      try {
        await invokeScl("start");
        await refreshScl(true);
      } catch (error) {
        stopPolling(SCL_STARTED_KEY);
        setSclStatus("Fel: " + (error?.message || error), "error");
        setSclBusy(false);
      }
    });

    document.getElementById("refreshScl27TeamsSync")?.addEventListener("click", function () {
      refreshScl(false);
    });

    setSclBusy(false);
    refreshSclFclConflictAlert(false);
    if (sclRequestId()) refreshScl(pollingIsFresh(SCL_STARTED_KEY));
  }

  function wvStatusElement() {
    return document.getElementById("wvTeamsSyncStatus");
  }

  function setWvStatus(message, tone, runUrl) {
    const status = wvStatusElement();
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

  function setWvBusy(isBusy) {
    const start = document.getElementById("startWv27TeamsSync");
    const refresh = document.getElementById("refreshWv27TeamsSync");
    if (start) start.disabled = isBusy;
    if (refresh) refresh.disabled = isBusy || !wvRequestId();
  }

  async function invokeWv(action) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase är inte initierat.");

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data.session) throw new Error("Du måste logga in igen.");

    const response = await supabase.functions.invoke("seh-admin-sync", {
      body: {
        action,
        job: "broadcast_league_rosters",
        league_ids: [532],
        request_id: wvRequestId()
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


  async function refreshWv(continuePolling) {
    if (!wvRequestId() || !wvStatusElement()) return;
    window.clearTimeout(wvPollTimer);
    setWvBusy(true);
    try {
      const data = await invokeWv("status");
      const done = data.state === "completed";
      setWvStatus(
        done
          ? (data.conclusion === "success"
              ? "Klart – WV 4 Nations-lag, trupper, tabell och spelarstatistik är uppdaterade. "
              : "WV 4 Nations-synkningen misslyckades.")
          : (data.state === "queued" ? "WV 4 Nations-synkningen väntar på att starta…" : "WV 4 Nations-lag, trupper, tabell och spelarstatistik uppdateras…"),
        done && data.conclusion === "success" ? "success" : done ? "error" : "working",
        data.run_url || ""
      );
      if (continuePolling && !done) {
        if (pollingIsFresh(WV_STARTED_KEY)) {
          wvPollTimer = window.setTimeout(function () { refreshWv(true); }, STATUS_POLL_MS);
        } else {
          setWvStatus("Statuskontrollen stoppades efter 50 minuter. Tryck Kontrollera status för en manuell kontroll.", "error", data.run_url || "");
        }
      }
      if (done) {
        stopPolling(WV_STARTED_KEY);
        if (data.conclusion === "success") {
          
        }
      }
    } catch (error) {
      stopPolling(WV_STARTED_KEY);
      setWvStatus("Fel: " + (error?.message || error), "error");
    } finally {
      setWvBusy(false);
    }
  }

  function buildWvCard() {
    const card = document.createElement("article");
    card.className = "admin-card admin-home-card";
    card.id = "wvTeamsSyncCard";
    card.innerHTML = [
      '<p class="writer-panel-kicker">WV 4 Nations</p>',
      '<h2>Gemensam WV-synk</h2>',
      '<p>En körning hämtar alla länders lag, trupper, tabell och spelarstatistik från SportsGamer liga 532. Uppdaterade data används av Graphics Studio och Broadcast Studio.</p>',
      '<div class="admin-actions">',
      '<button id="startWv27TeamsSync" type="button">Synka all WV 4 Nations-data</button>',
      '<button id="refreshWv27TeamsSync" class="writer-secondary" type="button" disabled>Kontrollera status</button>',
      '</div>',
      '<p id="wvTeamsSyncStatus" class="admin-status" role="status" aria-live="polite"></p>'
    ].join("");
    return card;
  }

  function mountWvCard() {
    if (!isAdminHome() || document.getElementById("wvTeamsSyncCard")) return;
    const grid = document.querySelector("#adminDashboard .admin-grid");
    const playerSyncCard = document.getElementById("scl27TeamsSyncCard");
    if (!grid || !playerSyncCard) return;

    const card = buildWvCard();
    playerSyncCard.insertAdjacentElement("afterend", card);

    document.getElementById("startWv27TeamsSync")?.addEventListener("click", async function () {
      const id = makeId();
      sessionStorage.setItem(WV_STORAGE_KEY, id);
      sessionStorage.setItem(WV_STARTED_KEY, String(Date.now()));
      setWvBusy(true);
      setWvStatus("Startar WV 4 Nations-synkningen…", "working");
      try {
        await invokeWv("start");
        await refreshWv(true);
      } catch (error) {
        stopPolling(WV_STARTED_KEY);
        setWvStatus("Fel: " + (error?.message || error), "error");
        setWvBusy(false);
      }
    });

    document.getElementById("refreshWv27TeamsSync")?.addEventListener("click", function () {
      refreshWv(false);
    });

    setWvBusy(false);
    if (wvRequestId()) refreshWv(pollingIsFresh(WV_STARTED_KEY));
  }


  function buildCard() {
    const card = document.createElement("article");
    card.className = "admin-card admin-home-card";
    card.id = "currentStatsSyncCard";
    card.innerHTML = [
      '<p class="writer-panel-kicker">AKTUELL STATISTIK</p>',
      '<h2>Pågående turneringar</h2>',
      '<p>Snabbkörning som hämtar ny spelarstatistik från aktuella SportsGamer-turneringar, inklusive SCL 27 när liga 527 är aktiv. Äldre historik lämnas orörd.</p>',
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
    mountWvCard();
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
      sessionStorage.setItem(STARTED_KEY, String(Date.now()));
      setBusy(true);
      setStatus("Startar snabbkörningen…", "working");
      try {
        await invoke("start");
        await refresh(true);
      } catch (error) {
        stopPolling(STARTED_KEY);
        setStatus("Fel: " + (error?.message || error), "error");
        setBusy(false);
      }
    });

    document.getElementById("refreshCurrentStatsSync")?.addEventListener("click", function () {
      refresh(false);
    });

    setBusy(false);
    if (requestId()) refresh(pollingIsFresh(STARTED_KEY));
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
