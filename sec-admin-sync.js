(function () {
  "use strict";

  let client = null;
  let pollTimer = null;

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
    return sessionStorage.getItem("seh_sec_sync_request_id") || "";
  }

  function setStatus(message, tone) {
    const status = document.getElementById("secSyncStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || "";
  }

  function setBusy(isBusy) {
    const start = document.getElementById("startSecSync");
    const refresh = document.getElementById("refreshSecSync");
    if (start) start.disabled = isBusy;
    if (refresh) refresh.disabled = isBusy || !requestId();
  }

  async function invoke(action) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase är inte initierat.");
    const response = await supabase.functions.invoke("seh-admin-sync", {
      body: { action, job: "sec_site_data", request_id: requestId() }
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
    if (!requestId() || !document.getElementById("secSyncStatus")) return;
    setBusy(true);
    try {
      const data = await invoke("status");
      const done = data.state === "completed";
      setStatus(
        done
          ? (data.conclusion === "success" ? "Klart – SEC-data i Supabase är uppdaterad." : "SEC-synkningen misslyckades.")
          : "SEC-synkningen körs…",
        done && data.conclusion === "success" ? "success" : done ? "error" : "working"
      );
      if (data.run_url) {
        const status = document.getElementById("secSyncStatus");
        const link = document.createElement("a");
        link.href = data.run_url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = " Visa körlogg";
        status?.append(link);
      }
      if (continuePolling && !done) pollTimer = window.setTimeout(function () { refresh(true); }, 7000);
    } catch (error) {
      setStatus("Fel: " + (error?.message || error), "error");
    } finally {
      setBusy(false);
    }
  }

  function mount() {
    const card = Array.from(document.querySelectorAll(".admin-card")).find(function (item) {
      const heading = item.querySelector("h2")?.textContent.trim();
      return heading === "SEC-matcher" || heading === "SEC-matcher och statistik";
    });
    if (!card || card.dataset.secSyncMounted === "true") return;

    card.dataset.secSyncMounted = "true";
    card.innerHTML = '<p class="writer-panel-kicker">SEC-DATABAS</p><h2>SEC-matcher och statistik</h2><p>Hämtar den senaste SEC-cupens matcher, lag och spelarstatistik från SportsGamer och uppdaterar Supabase. SportsGamer läses endast.</p><div class="admin-actions"><button id="startSecSync" type="button">Uppdatera SEC</button><button id="refreshSecSync" class="writer-secondary" type="button" disabled>Kontrollera status</button></div><p id="secSyncStatus" class="admin-status" role="status" aria-live="polite"></p>';

    document.getElementById("startSecSync")?.addEventListener("click", async function () {
      if (!window.confirm("Hämta den senaste SEC-cupens matcher och statistik från SportsGamer nu? SportsGamer-databasen kommer endast att läsas.")) return;
      const id = window.crypto?.randomUUID
        ? "web_" + window.crypto.randomUUID().replaceAll("-", "")
        : "web_" + Date.now();
      sessionStorage.setItem("seh_sec_sync_request_id", id);
      setBusy(true);
      setStatus("Startar SEC-synkningen…", "working");
      try {
        await invoke("start");
        await refresh(true);
      } catch (error) {
        setStatus("Fel: " + (error?.message || error), "error");
        setBusy(false);
      }
    });
    document.getElementById("refreshSecSync")?.addEventListener("click", function () { refresh(false); });
    setBusy(false);
    if (requestId()) refresh(true);
  }

  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", function () {
    window.clearTimeout(pollTimer);
    window.setTimeout(mount, 0);
  });
  mount();
}());
