(function () {
  "use strict";

  var VERSION = "2026-09-20-v3";
  var state = {
    open: false,
    data: null,
    loadPromise: null,
    results: [],
    selected: -1,
    lastQuery: ""
  };

  function q(selector, root) { return (root || document).querySelector(selector); }
  function qa(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function esc(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function norm(value) {
    return clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }
  function arr(value) {
    if (Array.isArray(value)) return value.map(clean).filter(Boolean);
    if (!value) return [];
    if (typeof value === "string") {
      if (value.charAt(0) === "{" && value.charAt(value.length - 1) === "}") {
        return value.slice(1, -1).split(",").map(function (item) {
          return clean(item).replace(/^"|"$/g, "");
        }).filter(Boolean);
      }
      return [clean(value)].filter(Boolean);
    }
    return [];
  }
  function config() {
    var c = window.EHOCKEY_CONFIG || window.SEH_CONFIG || window.APP_CONFIG || window.config || {};
    return {
      url: clean(c.supabaseUrl || c.SUPABASE_URL),
      key: clean(c.supabasePublishableKey || c.supabaseAnonKey || c.SUPABASE_ANON_KEY || c.SUPABASE_PUBLISHABLE_KEY)
    };
  }
  function headers() {
    var c = config();
    var out = { apikey: c.key, Accept: "application/json" };
    if (c.key.indexOf("eyJ") === 0) out.Authorization = "Bearer " + c.key;
    return out;
  }
  async function fetchRows(table, params, pageSize) {
    var c = config();
    if (!c.url || !c.key) throw new Error("Supabase-konfiguration saknas.");
    var all = [];
    var size = pageSize || 1000;
    for (var offset = 0; ; offset += size) {
      var p = new URLSearchParams(params || {});
      p.set("limit", String(size));
      p.set("offset", String(offset));
      var response = await fetch(c.url.replace(/\/+$/, "") + "/rest/v1/" + table + "?" + p.toString(), {
        headers: headers()
      });
      if (!response.ok) throw new Error(table + ": " + response.status);
      var rows = await response.json();
      if (!Array.isArray(rows)) throw new Error(table + ": oväntat svar");
      all.push.apply(all, rows);
      if (rows.length < size) break;
    }
    return all;
  }

  function newsSlug(article) {
    var explicit = clean(article && (article.url || article.slug)).replace(/^#\/?/, "");
    if (explicit) return explicit.replace(/^nyheter\//, "");
    return clean(article && article.title || "artikel")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function loadData() {
    if (state.data) return Promise.resolve(state.data);
    if (state.loadPromise) return state.loadPromise;

    var staticNews = Array.isArray(window.SEH_NEWS_ARTICLES) ? window.SEH_NEWS_ARTICLES : [];
    state.loadPromise = Promise.allSettled([
      fetchRows("app_player_directory_cache", {
        select: "player_key,display_gamertag,primary_position,latest_team,latest_season,player_image,sports_gamer_player_url",
        order: "display_gamertag.asc"
      }),
      fetchRows("v_local_team_list", {
        select: "team_id,current_name,historical_names,names_used_in_leagues,logo_path,logo_url",
        order: "current_name.asc"
      }),
      fetchRows("v_ehockey_league_catalog_v1", {
        select: "league_id,display_name,competition_code,source_league_name,chronology_date",
        order: "chronology_date.desc.nullslast,league_id.desc"
      }, 2000),
      fetchRows("seh_news_articles", {
        status: "eq.published",
        select: "slug,title,excerpt,tag,published_at",
        order: "published_at.desc.nullslast,created_at.desc"
      })
    ]).then(function (settled) {
      var players = settled[0].status === "fulfilled" ? settled[0].value : [];
      var teams = settled[1].status === "fulfilled" ? settled[1].value : [];
      var tournaments = settled[2].status === "fulfilled" ? settled[2].value : [];
      var dbNews = settled[3].status === "fulfilled" ? settled[3].value : [];

      var seenNews = new Set();
      var news = staticNews.concat(dbNews).filter(function (article) {
        var key = newsSlug(article) || norm(article && article.title);
        if (!key || seenNews.has(key)) return false;
        seenNews.add(key);
        return true;
      });

      var seenLeague = new Set();
      tournaments = tournaments.filter(function (row) {
        var id = clean(row.league_id);
        if (!id || seenLeague.has(id)) return false;
        seenLeague.add(id);
        return true;
      });

      state.data = {
        players: players,
        teams: teams,
        tournaments: tournaments,
        news: news
      };
      state.loadPromise = null;
      return state.data;
    }).catch(function (error) {
      state.loadPromise = null;
      throw error;
    });

    return state.loadPromise;
  }

  function scoreText(query, primary, extras) {
    var nq = norm(query);
    var p = norm(primary);
    var fields = [p].concat((extras || []).map(norm)).filter(Boolean);
    if (!nq || !fields.length) return 0;
    if (p === nq) return 1200;
    if (p.indexOf(nq) === 0) return 950 - Math.min(p.length - nq.length, 120);
    var words = p.split(" ");
    if (words.some(function (word) { return word.indexOf(nq) === 0; })) return 780;
    if (p.indexOf(nq) >= 0) return 650;
    for (var i = 1; i < fields.length; i += 1) {
      if (fields[i] === nq) return 610;
      if (fields[i].indexOf(nq) === 0) return 520;
      if (fields[i].indexOf(nq) >= 0) return 390;
    }
    var tokens = nq.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every(function (token) {
      return fields.some(function (field) { return field.indexOf(token) >= 0; });
    })) return 330;
    return 0;
  }

  function playerImageUrl(row) {
    var sportsGamerId = clean(row && row.sports_gamer_player_url).match(/\/players\/(\d+)/i);
    var fallbackId = sportsGamerId ? sportsGamerId[1] : "";
    try {
      if (typeof SEH_playerImageUrl === "function") {
        return SEH_playerImageUrl(row && row.player_image, fallbackId);
      }
    } catch (_) {}
    var raw = clean(row && row.player_image);
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/\.png(?:[?#].*)?$/i.test(raw)) return raw.replace(/^\/+/, "");
    return fallbackId ? "players/" + encodeURIComponent(fallbackId) + ".png" : "players/1DEFAULTBILDID.png";
  }

  function groupPriority(rows) {
    if (!rows || !rows.length) return 0;
    return Math.max.apply(null, rows.map(function (row) { return Number(row.score) || 0; }));
  }

  function mediaMarkup(row) {
    if (row.type === "player") {
      return '<span class="seh-global-search__media seh-global-search__media--player">' +
        '<img src="' + esc(row.image || "players/1DEFAULTBILDID.png") + '" alt="" loading="lazy" decoding="async" ' +
        'onerror="this.onerror=null;this.src=\'players/1DEFAULTBILDID.png\'">' +
      '</span>';
    }
    if (row.type === "team") {
      return '<span class="seh-global-search__media seh-global-search__media--team" ' +
        'data-search-team-name="' + esc(row.title) + '" ' +
        'data-search-logo-url="' + esc(row.logoUrl || "") + '" ' +
        'data-search-logo-path="' + esc(row.logoPath || "") + '">' +
        '<span class="seh-global-search__badge">' + esc(row.badge) + '</span>' +
      '</span>';
    }
    return '<span class="seh-global-search__media"><span class="seh-global-search__badge">' + esc(row.badge) + '</span></span>';
  }

  function hydrateTeamLogos(root) {
    qa("[data-search-team-name]", root).forEach(function (container) {
      var name = clean(container.dataset.searchTeamName);
      var logoUrl = clean(container.dataset.searchLogoUrl);
      var logoPath = clean(container.dataset.searchLogoPath);
      try {
        if (typeof SEH_renderTeamLogo === "function") {
          SEH_renderTeamLogo(container, [logoUrl, logoPath], name, "");
          return;
        }
      } catch (_) {}
      var source = logoUrl || logoPath;
      if (!source) return;
      container.innerHTML = '<img src="' + esc(source) + '" alt="" loading="lazy" decoding="async">';
    });
  }

  function buildResults(query) {
    var d = state.data;
    if (!d) return [];
    var groups = [
      { key: "player", label: "Spelare", badge: "S", limit: 5, rows: [] },
      { key: "team", label: "Lag", badge: "L", limit: 4, rows: [] },
      { key: "tournament", label: "Turneringar", badge: "T", limit: 4, rows: [] },
      { key: "news", label: "Nyheter", badge: "N", limit: 3, rows: [] }
    ];
    var byKey = {};
    groups.forEach(function (group) { byKey[group.key] = group; });

    d.players.forEach(function (row) {
      var primary = clean(row.display_gamertag || row.player_key);
      var s = scoreText(query, primary, [row.latest_team, row.latest_season, row.primary_position]);
      if (!s) return;
      byKey.player.rows.push({
        score: s,
        title: primary,
        meta: [clean(row.primary_position), clean(row.latest_team), clean(row.latest_season)].filter(Boolean).join(" · "),
        href: "#/spelare/" + encodeURIComponent(clean(row.player_key || primary)),
        image: playerImageUrl(row)
      });
    });

    d.teams.forEach(function (row) {
      var primary = clean(row.current_name);
      var aliases = arr(row.historical_names).concat(arr(row.names_used_in_leagues));
      var s = scoreText(query, primary, aliases);
      if (!s) return;
      var aliasMatch = aliases.find(function (name) { return norm(name).indexOf(norm(query)) >= 0 && norm(name) !== norm(primary); });
      byKey.team.rows.push({
        score: s,
        title: primary,
        meta: aliasMatch ? "Tidigare namn: " + aliasMatch : "Svenskt lag",
        href: "#/lag/" + encodeURIComponent(clean(row.team_id)),
        logoUrl: clean(row.logo_url),
        logoPath: clean(row.logo_path)
      });
    });

    d.tournaments.forEach(function (row) {
      var primary = clean(row.display_name || row.source_league_name || ("League " + row.league_id));
      var s = scoreText(query, primary, [row.competition_code, row.source_league_name]);
      if (!s) return;
      var code = clean(row.competition_code).toUpperCase();
      var date = clean(row.chronology_date).slice(0, 10);
      byKey.tournament.rows.push({
        score: s,
        title: primary,
        meta: [code, date].filter(Boolean).join(" · "),
        href: "#/turnering/" + encodeURIComponent(clean(row.league_id))
      });
    });

    d.news.forEach(function (row) {
      var primary = clean(row.title);
      var s = scoreText(query, primary, [row.excerpt, row.tag]);
      if (!s) return;
      byKey.news.rows.push({
        score: s,
        title: primary,
        meta: [clean(row.tag), clean(row.published_at).slice(0, 10)].filter(Boolean).join(" · "),
        href: "#/nyheter/" + encodeURIComponent(newsSlug(row))
      });
    });

    var output = [];
    groups.forEach(function (group) {
      group.rows.sort(function (a, b) { return b.score - a.score || a.title.localeCompare(b.title, "sv"); });
    });
    groups
      .filter(function (group) { return group.rows.length; })
      .sort(function (a, b) {
        return groupPriority(b.rows) - groupPriority(a.rows);
      })
      .forEach(function (group) {
        group.rows.slice(0, group.limit).forEach(function (row) {
          output.push(Object.assign({ type: group.key, groupLabel: group.label, badge: group.badge }, row));
        });
      });
    return output;
  }

  function ensureOverlay() {
    var overlay = q("#sehGlobalSearch");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "sehGlobalSearch";
    overlay.className = "seh-global-search";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="seh-global-search__backdrop" data-seh-global-search-close></div>' +
      '<section class="seh-global-search__panel" role="dialog" aria-modal="true" aria-labelledby="sehGlobalSearchLabel">' +
        '<div class="seh-global-search__head">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></svg>' +
          '<label id="sehGlobalSearchLabel" class="sr-only" for="sehGlobalSearchInput">Sök på Svensk eHockey</label>' +
          '<input id="sehGlobalSearchInput" class="seh-global-search__input" type="search" autocomplete="off" spellcheck="false" placeholder="Sök spelare, lag, turneringar, nyheter…">' +
          '<kbd class="seh-global-search__shortcut">Ctrl K</kbd>' +
          '<button class="seh-global-search__close" type="button" aria-label="Stäng sök" data-seh-global-search-close>×</button>' +
        '</div>' +
        '<div class="seh-global-search__meta"><span id="sehGlobalSearchStatus">Börja skriva för att söka på hela Svensk eHockey.</span><b>GLOBAL SÖK</b></div>' +
        '<div id="sehGlobalSearchResults" class="seh-global-search__results" role="listbox"></div>' +
        '<div class="seh-global-search__footer"><span><kbd>↑ ↓</kbd> navigera</span><span><kbd>Enter</kbd> öppna</span><span><kbd>Esc</kbd> stäng</span></div>' +
      '</section>';
    document.body.appendChild(overlay);

    q("#sehGlobalSearchInput", overlay).addEventListener("input", function () {
      state.lastQuery = this.value;
      state.selected = -1;
      render();
    });
    overlay.addEventListener("click", function (event) {
      if (event.target.closest("[data-seh-global-search-close]")) closeSearch();
      var link = event.target.closest(".seh-global-search__result");
      if (link) closeSearch();
    });
    return overlay;
  }

  function render() {
    var overlay = ensureOverlay();
    var input = q("#sehGlobalSearchInput", overlay);
    var host = q("#sehGlobalSearchResults", overlay);
    var status = q("#sehGlobalSearchStatus", overlay);
    var query = clean(input.value);
    state.lastQuery = query;

    if (!state.data) {
      host.innerHTML = '<div class="seh-global-search__empty"><strong>Hämtar sökindex…</strong>Spelare, lag, turneringar och nyheter laddas.</div>';
      status.textContent = "Laddar global sökning…";
      return;
    }
    if (query.length < 2) {
      state.results = [];
      state.selected = -1;
      host.innerHTML = '<div class="seh-global-search__empty"><strong>Sök på hela Svensk eHockey</strong>Skriv minst två tecken. Du kan söka på gamertag, lag, turnering eller nyhet.</div>';
      status.textContent = "Spelare · Lag · Turneringar · Nyheter";
      return;
    }

    state.results = buildResults(query);
    if (!state.results.length) {
      state.selected = -1;
      host.innerHTML = '<div class="seh-global-search__empty"><strong>Inga träffar</strong>Prova ett annat gamertag, lagnamn eller turneringsnamn.</div>';
      status.textContent = '0 träffar på "' + query + '"';
      return;
    }

    var grouped = {};
    var order = [];
    state.results.forEach(function (row, index) {
      row.index = index;
      if (!grouped[row.type]) {
        grouped[row.type] = [];
        order.push(row.type);
      }
      grouped[row.type].push(row);
    });
    var labels = { player: "Spelare", team: "Lag", tournament: "Turneringar", news: "Nyheter" };
    host.innerHTML = order.map(function (key) {
      return '<section class="seh-global-search__group">' +
        '<div class="seh-global-search__group-title">' + esc(labels[key]) + '</div>' +
        grouped[key].map(function (row) {
          return '<a class="seh-global-search__result" role="option" aria-selected="false" data-search-index="' + row.index + '" href="' + esc(row.href) + '">' +
            mediaMarkup(row) +
            '<span class="seh-global-search__copy"><strong>' + esc(row.title) + '</strong><small>' + esc(row.meta || row.groupLabel) + '</small></span>' +
            '<span class="seh-global-search__arrow" aria-hidden="true">→</span>' +
          '</a>';
        }).join("") +
      '</section>';
    }).join("");
    hydrateTeamLogos(host);
    status.textContent = state.results.length + ' träffar på "' + query + '"';
    syncSelection();
  }

  function syncSelection() {
    qa(".seh-global-search__result").forEach(function (link, index) {
      var active = index === state.selected;
      link.classList.toggle("is-selected", active);
      link.setAttribute("aria-selected", active ? "true" : "false");
      if (active) link.scrollIntoView({ block: "nearest" });
    });
  }

  function openSearch() {
    var overlay = ensureOverlay();
    if (state.open) {
      q("#sehGlobalSearchInput", overlay).focus();
      return;
    }
    state.open = true;
    overlay.hidden = false;
    document.body.classList.add("seh-global-search-open");
    var input = q("#sehGlobalSearchInput", overlay);
    input.value = state.lastQuery || "";
    state.selected = -1;
    render();
    requestAnimationFrame(function () {
      input.focus();
      input.select();
    });
    loadData().then(render).catch(function (error) {
      console.error("Global sökning:", error);
      var host = q("#sehGlobalSearchResults", overlay);
      var status = q("#sehGlobalSearchStatus", overlay);
      host.innerHTML = '<div class="seh-global-search__empty"><strong>Sökningen kunde inte laddas</strong>Försök igen om en stund.</div>';
      status.textContent = "Fel vid hämtning av sökindex.";
    });
  }

  function closeSearch() {
    var overlay = q("#sehGlobalSearch");
    if (!overlay || !state.open) return;
    state.open = false;
    overlay.hidden = true;
    document.body.classList.remove("seh-global-search-open");
  }

  function iconMarkup() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></svg>';
  }

  function createTrigger(kind) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "seh-global-search-trigger seh-global-search-trigger--" + kind;
    button.dataset.sehGlobalSearchTrigger = kind;
    button.setAttribute("aria-label", "Sök på Svensk eHockey");
    button.title = "Sök på Svensk eHockey (Ctrl+K)";
    button.innerHTML = iconMarkup();
    button.addEventListener("click", openSearch);
    return button;
  }

  function ensureTriggers() {
    // Sökningen hör ihop med kontoverktygen, inte med huvudmenyn.
    // Ta även bort en eventuell äldre nav-trigger från v1 om sidan uppdateras varmt.
    qa('[data-seh-global-search-trigger="nav"]').forEach(function (button) {
      button.remove();
    });

    var tools = q(".seh-header__tools");
    if (tools && !q('[data-seh-global-search-trigger="tools"]', tools)) {
      var trigger = createTrigger("tools");
      var account = q(".seh-account", tools);
      tools.insertBefore(trigger, account || tools.firstChild);
    }
  }

  document.addEventListener("keydown", function (event) {
    var key = String(event.key || "").toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      openSearch();
      return;
    }
    if (!state.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!state.results.length) return;
      event.preventDefault();
      var delta = event.key === "ArrowDown" ? 1 : -1;
      state.selected = (state.selected + delta + state.results.length) % state.results.length;
      syncSelection();
      return;
    }
    if (event.key === "Enter" && state.selected >= 0) {
      var selected = q('.seh-global-search__result[data-search-index="' + state.selected + '"]');
      if (selected) {
        event.preventDefault();
        selected.click();
      }
    }
  });

  window.addEventListener("hashchange", function () {
    closeSearch();
    setTimeout(ensureTriggers, 0);
    setTimeout(ensureTriggers, 120);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ensureOverlay();
      ensureTriggers();
      setTimeout(ensureTriggers, 150);
    }, { once: true });
  } else {
    ensureOverlay();
    ensureTriggers();
    setTimeout(ensureTriggers, 150);
  }

  console.info("Svensk eHockey global search:", VERSION);
})();