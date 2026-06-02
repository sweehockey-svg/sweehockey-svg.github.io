const DATA_SOURCES = {
  sheet: window.SEC_CONFIG?.sheetUrl || "",
  rules: Object.prototype.hasOwnProperty.call(window.SEC_CONFIG || {}, "rulesUrl")
    ? window.SEC_CONFIG.rulesUrl
    : "https://script.google.com/macros/s/AKfycbwUvylvIbUTy4_zihW5_OKIsQME2vxcPHWLldObZI28dggqJytvF2UmdsAD4Ib5Zre1/exec?sheet=regler",
  placements: Object.prototype.hasOwnProperty.call(window.SEC_CONFIG || {}, "placementsUrl")
    ? window.SEC_CONFIG.placementsUrl
    : "https://script.google.com/macros/s/AKfycbwUvylvIbUTy4_zihW5_OKIsQME2vxcPHWLldObZI28dggqJytvF2UmdsAD4Ib5Zre1/exec?sheet=vinnare",
  database: window.SEC_CONFIG?.databaseUrl || "",
  rawApiBase: window.SEC_CONFIG?.rawDataApiBaseUrl ?? "https://script.google.com/macros/s/AKfycbwUvylvIbUTy4_zihW5_OKIsQME2vxcPHWLldObZI28dggqJytvF2UmdsAD4Ib5Zre1/exec",
  teamLogoManifest: window.SEC_CONFIG?.teamLogoManifestUrl || "https://api.github.com/repos/sweehockey-svg/sweehockey-svg.github.io/contents/teamlogos",
  playerImageManifest: window.SEC_CONFIG?.playerImageManifestUrl || "https://api.github.com/repos/sweehockey-svg/sweehockey-svg.github.io/contents/players",
  signupApi: window.SEC_CONFIG?.signupApiUrl || ""
};

const DNF_TEAMS_BY_CUP = window.SEC_CONFIG?.dnfTeamsByCup || {
  "SEC 20 DIV 2": ["Dynamite sharks"]
};

const CUP_SETTINGS_OVERRIDES = window.SEC_CONFIG?.cupSettingsOverrides || {};

const FALLBACK_DATA = {
  cups: [
    {
      id: "1",
      sortOrder: 1,
      code: "SEC 1",
      name: "Svenska eHockey Cupen 1",
      badge: "Historik",
      placements: {
        first: "Frolunda",
        second: "Lulea"
      },
      matches: [
        {
          date: "2026-04-20",
          time: "20:00",
          awayTeam: "Frolunda",
          awayScore: 2,
          homeTeam: "Lulea",
          homeScore: 3,
          overtime: false,
          stage: "group",
          group: "Grupp A",
          goalsSummary: "1-0 Karlsson | 2-0 Andersson | 2-1 Olsson"
        },
        {
          date: "2026-04-22",
          time: "20:30",
          awayTeam: "Lulea",
          awayScore: 1,
          homeTeam: "Frolunda",
          homeScore: 4,
          overtime: false,
          stage: "playoffs",
          group: "Final",
          goalsSummary: "1-0 FezH_88 | 2-0 Maxboeeee | 3-0 LordOlii"
        }
      ],
      playerStats: {
        group: [
          { player: "FezH_88", team: "Frolunda", gp: 2, g: 3, a: 2, pts: 5, pim: 0, playerId: "123" },
          { player: "LordOlii", team: "Frolunda", gp: 2, g: 1, a: 2, pts: 3, pim: 2, playerId: "124" },
          { player: "Dan9105", team: "Lulea", gp: 2, g: 1, a: 1, pts: 2, pim: 0, playerId: "125" }
        ],
        playoffs: [
          { player: "FezH_88", team: "Frolunda", gp: 1, g: 2, a: 1, pts: 3, pim: 0, playerId: "123" }
        ]
      },
      goalieStats: {
        group: [
          { player: "Mlv Frolunda", team: "Frolunda", gp: 2, sa: 42, ga: 3, sv: 39, gaa: 1.5, svp: 0.929, so: 0, playerId: "456" },
          { player: "Mlv Lulea", team: "Lulea", gp: 2, sa: 50, ga: 6, sv: 44, gaa: 3.0, svp: 0.88, so: 0, playerId: "457" }
        ],
        playoffs: [
          { player: "Mlv Frolunda", team: "Frolunda", gp: 1, sa: 22, ga: 1, sv: 21, gaa: 1, svp: 0.955, so: 0, playerId: "456" }
        ]
      }
    },
    {
      id: "sommar-21",
      sortOrder: 21.1,
      code: "SEC Sommar 21",
      name: "SEC Sommar 21",
      badge: "Sommar",
      placements: {
        first: "Modo",
        second: "Brynas"
      },
      matches: [
        {
          date: "2026-07-02",
          time: "21:00",
          awayTeam: "Modo",
          awayScore: 5,
          homeTeam: "Brynas",
          homeScore: 2,
          overtime: false,
          stage: "playoffs",
          group: "Final",
          goalsSummary: "Modo avgjorde i tredje perioden."
        }
      ],
      playerStats: {
        group: [
          { player: "Toivo", team: "Modo", gp: 3, g: 4, a: 2, pts: 6, pim: 0, playerId: "901" }
        ],
        playoffs: [
          { player: "Toivo", team: "Modo", gp: 1, g: 2, a: 1, pts: 3, pim: 0, playerId: "901" }
        ]
      },
      goalieStats: {
        group: [],
        playoffs: [
          { player: "Jemmmuu", team: "Modo", gp: 1, sa: 25, ga: 2, sv: 23, gaa: 2, svp: 0.92, so: 0, playerId: "902" }
        ]
      }
    }
  ]
};

const state = {
  cups: [],
  teams: [],
  players: [],
  playersReady: false,
  playersBuildPromise: null,
  ready: false,
  assetIndexes: {
    teamLogos: createAssetFileIndex([]),
    playerImages: createAssetFileIndex([])
  },
  assetIndexRequested: false,
  assetIndexReady: false,
  activeCupTab: "",
  assetMatchCache: {
    teamLogos: new Map(),
    playerImages: new Map()
  }
};

const appView = document.querySelector("#app-view");
let tableIdCounter = 0;

window.SEC_IMAGE_FALLBACK = function(image) {
  const parent = image.parentElement;
  let fallbacks = [];

  try {
    fallbacks = JSON.parse(image.dataset.fallbackSrcs || "[]");
  } catch (_error) {
    fallbacks = [];
  }

  if (fallbacks.length) {
    image.dataset.fallbackSrcs = JSON.stringify(fallbacks.slice(1));
    image.src = fallbacks[0];
    return;
  }

  if (image.dataset.finalFallback && image.dataset.finalFallbackTried !== "true") {
    image.dataset.finalFallbackTried = "true";
    image.src = image.dataset.finalFallback;
    return;
  }

  image.style.display = "none";
  if (parent) {
    parent.classList.add("is-missing");
  }
};

window.addEventListener("hashchange", renderCurrentRoute);
window.addEventListener("error", function(event) {
  showFatalError(event.error || event.message || "Okant fel i JavaScript.");
});
window.addEventListener("unhandledrejection", function(event) {
  showFatalError(event.reason || "Ohanterat fel i Promise.");
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  try {
    const cups = await loadCups().catch(function(error) {
      console.warn("Kunde inte ladda cupdata.", error);
      return FALLBACK_DATA.cups;
    });
    const normalizedCups = normalizeCups(cups, new Map(), new Map());

    state.cups = normalizedCups;
    state.teams = buildTeams(normalizedCups);
    state.players = [];
    state.playersReady = false;
    state.playersBuildPromise = null;
    state.ready = true;

    renderCurrentRoute();
    schedulePlayerIndexBuild();
    scheduleAssetIndexHydration();
    hydrateCupMeta(cups);
  } catch (error) {
    console.error(error);
    state.cups = normalizeCups(FALLBACK_DATA.cups, new Map(), new Map());
    state.teams = buildTeams(state.cups);
    state.players = [];
    state.playersReady = false;
    state.playersBuildPromise = null;
    state.ready = true;
    renderCurrentRoute();
    schedulePlayerIndexBuild();
    scheduleAssetIndexHydration();
  }
}

function schedulePlayerIndexBuild() {
  if (state.playersReady || state.playersBuildPromise) {
    return state.playersBuildPromise || Promise.resolve(state.players);
  }

  const build = function() {
    return ensurePlayersReady().then(function() {
      const route = parseRoute();
      if (route.type === "home" || route.type === "players" || route.type === "player") {
        renderCurrentRoute();
      }
      return state.players;
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(function() { build(); }, { timeout: 3200 });
    return null;
  }

  window.setTimeout(build, 1200);
  return null;
}

function ensurePlayersReady() {
  if (state.playersReady) {
    return Promise.resolve(state.players);
  }

  if (state.playersBuildPromise) {
    return state.playersBuildPromise;
  }

  state.playersBuildPromise = Promise.resolve().then(function() {
    state.players = buildPlayers(state.cups);
    state.playersReady = true;
    state.playersBuildPromise = null;
    return state.players;
  });

  return state.playersBuildPromise;
}

function scheduleAssetIndexHydration() {
  const hydrate = function() {
    hydrateAssetIndexes().catch(function(error) {
      console.warn("Kunde inte ladda bildindex.", error);
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(hydrate, { timeout: 2500 });
    return;
  }

  window.setTimeout(hydrate, 900);
}

async function hydrateCupMeta(cups) {
  if (!DATA_SOURCES.rules && !DATA_SOURCES.placements) {
    return;
  }

  const results = await Promise.allSettled([
    loadCupSettings(),
    loadCupPlacements()
  ]);
  const settingsByCup = results[0].status === "fulfilled" ? results[0].value : new Map();
  const placementsByCup = results[1].status === "fulfilled" ? results[1].value : new Map();

  if (!settingsByCup.size && !placementsByCup.size) {
    return;
  }

  const normalizedCups = normalizeCups(cups, settingsByCup, placementsByCup);
  state.cups = normalizedCups;
  state.teams = buildTeams(normalizedCups);
  state.players = [];
  state.playersReady = false;
  state.playersBuildPromise = null;
  schedulePlayerIndexBuild();
  renderCurrentRoute();
}

async function hydrateAssetIndexes() {
  if (state.assetIndexRequested) {
    return;
  }

  state.assetIndexRequested = true;

  const results = await Promise.allSettled([
    loadAssetFileIndex(DATA_SOURCES.teamLogoManifest, ["png", "jpg", "jpeg", "webp"]),
    loadAssetFileIndex(DATA_SOURCES.playerImageManifest, ["jpg", "jpeg", "png", "webp"])
  ]);

  if (results[0].status === "fulfilled") {
    state.assetIndexes.teamLogos = results[0].value;
  }
  if (results[1].status === "fulfilled") {
    state.assetIndexes.playerImages = results[1].value;
  }

  state.assetIndexReady = true;
  state.assetMatchCache.teamLogos.clear();
  state.assetMatchCache.playerImages.clear();

  if (!state.assetHydrationRenderQueued) {
    state.assetHydrationRenderQueued = true;
    window.setTimeout(function() {
      state.assetHydrationRenderQueued = false;
      renderCurrentRoute();
    }, 250);
  }
}

async function loadCups() {
  const results = await Promise.allSettled([
    loadSource(DATA_SOURCES.sheet),
    loadSource(DATA_SOURCES.database)
  ]);

  const merged = [];

  if (results[0].status === "fulfilled" && Array.isArray(results[0].value)) {
    merged.push.apply(merged, results[0].value.map(function(cup) {
      return markCupSource(cup, "extra");
    }));
  }

  if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
    merged.push.apply(merged, results[1].value.map(function(cup) {
      return markCupSource(cup, "database");
    }));
  }

  try {
    const supplementalCups = await loadSupplementalCups(merged);
    merged.push.apply(merged, supplementalCups);
  } catch (error) {
    console.warn("Kunde inte hamta extra cuper fran matcherSEC.", error);
  }

  const deduped = new Map();

  merged.forEach(function(cup) {
    const key = createCupDedupKey(cup);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, cup);
      return;
    }

    deduped.set(key, resolveCupSourceConflict(existing, cup));
  });

  if (!deduped.size) {
    return FALLBACK_DATA.cups;
  }

  return Array.from(deduped.values());
}

function markCupSource(cup, source) {
  return {
    ...(cup || {}),
    __source: source
  };
}

function resolveCupSourceConflict(existing, incoming) {
  const existingPriority = getCupSourcePriority(existing);
  const incomingPriority = getCupSourcePriority(incoming);

  if (incomingPriority > existingPriority) {
    return mergeCupMetadata(incoming, existing);
  }

  if (existingPriority > incomingPriority) {
    return mergeCupMetadata(existing, incoming);
  }

  return mergeCupData(existing, incoming);
}

function mergeCupMetadata(primary, secondary) {
  const base = primary || {};
  const meta = secondary || {};

  return {
    ...base,
    settings: mergeDataRow(meta.settings, base.settings),
    placements: mergeDataRow(meta.placements, base.placements)
  };
}

function getCupSourcePriority(cup) {
  const source = cup?.__source || "";
  return source === "database" ? 2 : 1;
}

function mergeCupData(existing, incoming) {
  const base = existing || {};
  const next = incoming || {};

  return {
    ...base,
    ...next,
    settings: mergeDataRow(base.settings, next.settings),
    placements: mergeDataRow(base.placements, next.placements),
    matches: mergeCupRows(base.matches, next.matches, createMatchMergeKey),
    playerStats: {
      group: mergeCupRows(base.playerStats?.group, next.playerStats?.group, createPlayerStatMergeKey),
      playoffs: mergeCupRows(base.playerStats?.playoffs, next.playerStats?.playoffs, createPlayerStatMergeKey)
    },
    goalieStats: {
      group: mergeCupRows(base.goalieStats?.group, next.goalieStats?.group, createGoalieStatMergeKey),
      playoffs: mergeCupRows(base.goalieStats?.playoffs, next.goalieStats?.playoffs, createGoalieStatMergeKey)
    }
  };
}

function mergeCupRows(existingRows, incomingRows, getKey) {
  const rows = [];
  const seen = new Map();

  (existingRows || []).concat(incomingRows || []).forEach(function(row) {
    const key = getKey(row);
    if (key && seen.has(key)) {
      const existingIndex = seen.get(key);
      rows[existingIndex] = mergeDataRow(rows[existingIndex], row);
      return;
    }
    if (key) {
      seen.set(key, rows.length);
    }
    rows.push(row);
  });

  return rows;
}

function mergeDataRow(existing, incoming) {
  const base = existing || {};
  const next = incoming || {};
  const merged = { ...base };

  Object.keys(next).forEach(function(key) {
    if (isMeaningfulValue(next[key]) || !isMeaningfulValue(merged[key])) {
      merged[key] = mergeNestedDataValue(merged[key], next[key]);
    }
  });

  return merged;
}

function mergeNestedDataValue(existing, incoming) {
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    return mergeDataRow(existing, incoming);
  }
  return isMeaningfulValue(incoming) || !isMeaningfulValue(existing) ? incoming : existing;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMeaningfulValue(value) {
  if (value === null || typeof value === "undefined") {
    return false;
  }
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isPlainObject(value)) {
    return Object.keys(value).some(function(key) {
      return isMeaningfulValue(value[key]);
    });
  }
  return true;
}

function createMatchMergeKey(match) {
  return [
    normalizeLookupKey(match?.date),
    normalizeLookupKey(match?.time),
    normalizeLookupKey(match?.awayTeam || match?.away_team),
    normalizeLookupKey(match?.homeTeam || match?.home_team),
    String(match?.awayScore ?? match?.away_score ?? ""),
    String(match?.homeScore ?? match?.home_score ?? "")
  ].join("|");
}

function createPlayerStatMergeKey(row) {
  return [
    normalizeLookupKey(row?.player || row?.players),
    normalizeLookupKey(row?.team),
    String(row?.gp ?? ""),
    String(row?.g ?? ""),
    String(row?.a ?? ""),
    String(row?.pts ?? ""),
    String(row?.pim ?? "")
  ].join("|");
}

function createGoalieStatMergeKey(row) {
  return [
    normalizeLookupKey(row?.player || row?.goalies),
    normalizeLookupKey(row?.team),
    String(row?.gp ?? ""),
    String(row?.sa ?? ""),
    String(row?.ga ?? ""),
    String(row?.sv ?? ""),
    String(row?.svp ?? "")
  ].join("|");
}

async function loadSupplementalCups(existingCups) {
  if (!DATA_SOURCES.rawApiBase) {
    return [];
  }

  const matchRows = await loadRowsSource(createRawApiUrl("matcherSEC"));
  const rowsByCup = groupRowsByCupName(matchRows);
  const cupNames = Array.from(rowsByCup.keys());
  const existingKeys = createExistingCupKeySet(existingCups || []);

  if (!cupNames.length) {
    return [];
  }

  const [skaterRows, goalieRows] = await Promise.all([
    loadRowsSource(createRawApiUrl("utestatsall")).catch(function() { return []; }),
    loadRowsSource(createRawApiUrl("målvaktsstatsall")).catch(function() { return []; })
  ]);

  return cupNames.map(function(cupName) {
    return createSupplementalCup(
      cupName,
      rowsByCup.get(cupName),
      skaterRows,
      goalieRows,
      !existingKeys.has(normalizeLookupKey(cupName))
    );
  });
}

function createRawApiUrl(sheetName) {
  const separator = DATA_SOURCES.rawApiBase.indexOf("?") === -1 ? "?" : "&";
  return DATA_SOURCES.rawApiBase + separator + "sheet=" + encodeURIComponent(sheetName) + "&_t=" + Date.now();
}

function groupRowsByCupName(rows) {
  const grouped = new Map();

  (rows || []).forEach(function(row) {
    const cupName = normalizeText(getRowField(row, ["Cup", "CUP"], ["cup"]));
    if (!cupName) {
      return;
    }

    if (!grouped.has(cupName)) {
      grouped.set(cupName, []);
    }
    grouped.get(cupName).push(row);
  });

  return grouped;
}

function createExistingCupKeySet(cups) {
  const keys = new Set();

  (cups || []).forEach(function(cup) {
    [
      cup?.id,
      cup?.code,
      cup?.name,
      String(cup?.name || "").replace(/^Svenska eHockey Cupen\s*/i, "SEC ")
    ].forEach(function(value) {
      const key = normalizeLookupKey(value);
      if (key) {
        keys.add(key);
      }
    });
  });

  return keys;
}

function createSupplementalCup(cupName, matchRows, skaterRows, goalieRows, includeSeasonStats) {
  return {
    id: createSupplementalCupId(cupName),
    code: cupName,
    name: createSupplementalCupName(cupName),
    badge: createSupplementalCupBadge(cupName),
    sortOrder: inferSortOrder(cupName),
    matches: (matchRows || []).map(createSupplementalMatch),
    playerStats: {
      group: includeSeasonStats ? createSupplementalSkaterStats(skaterRows, cupName + " G") : [],
      playoffs: includeSeasonStats ? createSupplementalSkaterStats(skaterRows, cupName + " S") : []
    },
    goalieStats: {
      group: includeSeasonStats ? createSupplementalGoalieStats(goalieRows, cupName + " G") : [],
      playoffs: includeSeasonStats ? createSupplementalGoalieStats(goalieRows, cupName + " S") : []
    }
  };
}

function createSupplementalMatch(row) {
  return {
    date: normalizeText(getRowField(row, ["Date", "date"], ["date"])),
    time: normalizeText(getRowField(row, ["Time", "time"], ["time"])),
    awayTeam: normalizeText(getRowField(row, ["Away team", "Away Team", "away_team"], ["away", "borta"])),
    awayScore: toNullableNumber(getRowField(row, ["Away score", "Away Score", "away_score"], ["awayscore"])),
    overtime: isTruthyOvertime(getRowField(row, ["ot", "OT"], ["ot", "overtime"])),
    homeScore: toNullableNumber(getRowField(row, ["Home score", "Home Score", "home_score"], ["homescore"])),
    homeTeam: normalizeText(getRowField(row, ["Home team", "Home Team", "home_team"], ["home", "hemma"])),
    stage: normalizeText(getRowField(row, ["Stage", "stage"], ["stage", "fas"])),
    group: normalizeText(getRowField(row, ["Grupp", "Group", "grupp"], ["grupp", "group"])),
    goalsSummary: normalizeText(getRowField(row, ["goalsSummary", "Goals Summary", "goals_summary"], ["goalssummary", "goals"])),
    statsSummary: normalizeText(getRowField(row, ["Stats", "stats", "matchStats", "Match Stats"], ["stats", "matchstats"]))
  };
}

function createSupplementalSkaterStats(rows, cupLabel) {
  return (rows || []).filter(function(row) {
    return normalizeLookupKey(getRowField(row, ["CUP", "Cup"], ["cup"])) === normalizeLookupKey(cupLabel);
  }).map(function(row) {
    return {
      player: normalizeText(getRowField(row, ["PLAYERS", "Players", "players"], ["player"])),
      team: normalizeText(getRowField(row, ["TEAM", "Team", "team"], ["team"])),
      gp: toNumber(getRowField(row, ["GP", "gp"], ["gp"])),
      g: toNumber(getRowField(row, ["G", "g"], ["g"])),
      a: toNumber(getRowField(row, ["A", "a"], ["a"])),
      pts: toNumber(getRowField(row, ["PTS", "pts"], ["pts"])),
      pim: toNumber(getRowField(row, ["PIM", "pim"], ["pim"])),
      playerId: normalizeText(getRowField(row, ["playerid", "playerId"], ["playerid"]))
    };
  }).filter(function(row) {
    return row.player && row.team;
  });
}

function createSupplementalGoalieStats(rows, cupLabel) {
  return (rows || []).filter(function(row) {
    return normalizeLookupKey(getRowField(row, ["CUP", "Cup"], ["cup"])) === normalizeLookupKey(cupLabel);
  }).map(function(row) {
    return {
      player: normalizeText(getRowField(row, ["GOALIES", "Goalies", "goalies"], ["goalie"])),
      team: normalizeText(getRowField(row, ["TEAM", "Team", "team"], ["team"])),
      gp: toNumber(getRowField(row, ["GP", "gp"], ["gp"])),
      sa: toNumber(getRowField(row, ["SA", "sa"], ["sa"])),
      ga: toNumber(getRowField(row, ["GA", "ga"], ["ga"])),
      sv: toNumber(getRowField(row, ["SV", "sv"], ["sv"])),
      gaa: toNumber(getRowField(row, ["GAA", "gaa"], ["gaa"])),
      svp: toNullableNumber(getRowField(row, ["SVP", "svp", "SV%"], ["svp", "sv%"])),
      so: toNumber(getRowField(row, ["SO", "so"], ["so"])),
      playerId: normalizeText(getRowField(row, ["playerid", "playerId"], ["playerid"]))
    };
  }).filter(function(row) {
    return row.player && row.team;
  });
}

function createSupplementalCupId(cupName) {
  const normalized = normalizeText(cupName);
  const lowerName = normalized.toLowerCase();
  const numberMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  const number = numberMatch ? numberMatch[1].replace(".", "-") : "";
  const divisionMatch = normalized.match(/div(?:ision)?\s*([0-9]+)/i);

  if (lowerName.indexOf("sommar") !== -1) {
    return number ? "sommar-" + number : "sommar";
  }
  if (lowerName.indexOf("chall") !== -1) {
    return number ? number + "-challenger" : "challenger";
  }
  if (divisionMatch && number) {
    return number + "-div-" + divisionMatch[1];
  }
  if (number) {
    return number;
  }

  return normalizeLookupKey(normalized).replace(/\./g, "-") || "cup-" + Date.now();
}

function createSupplementalCupName(cupName) {
  const normalized = normalizeText(cupName);
  if (getCupCategory({ code: normalized, name: normalized, badge: "" }) !== "regular") {
    return normalized.replace(/\bchallenger\b/i, "Challenger");
  }
  return normalized.replace(/^SEC\s+/i, "Svenska eHockey Cupen ");
}

function createSupplementalCupBadge(cupName) {
  const normalized = normalizeText(cupName);
  const category = getCupCategory({ code: normalized, name: normalized, badge: "" });
  if (category === "sommar") {
    return "Sommar";
  }
  return "";
}

function isTruthyOvertime(value) {
  const text = normalizeText(value).toLowerCase();
  return text === "ot" || text === "true" || text === "1" || text === "yes" || text === "ja";
}

function createCupDedupKey(cup) {
  const codeKey = normalizeLookupKey(cup?.code);
  const nameKey = normalizeLookupKey(cup?.name);
  const idKey = normalizeLookupKey(cup?.id);

  if (codeKey) {
    return "code:" + codeKey;
  }
  if (nameKey) {
    return "name:" + nameKey;
  }
  if (idKey) {
    return "id:" + idKey;
  }

  return "unknown:" + Math.random();
}

async function loadSource(url) {
  if (!url) {
    return [];
  }

  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Request failed for " + url);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.cups)) {
    return data.cups;
  }
  return [];
}

async function loadCupSettings() {
  if (!DATA_SOURCES.rules) {
    return new Map();
  }

  try {
    const url = DATA_SOURCES.rules + (DATA_SOURCES.rules.indexOf("?") === -1 ? "?" : "&") + "_t=" + Date.now();
    const rows = await loadRowsSource(url);
    const settings = new Map();

    rows.forEach(function(row) {
      const cupName = normalizeText(getRowField(row, ["Cup", "CUP"], ["cup"]));
      if (cupName) {
        settings.set(normalizeLookupKey(cupName), normalizeCupSettings(row));
      }
    });

    return settings;
  } catch (error) {
    console.warn("Kunde inte hamta cupregler.", error);
    return new Map();
  }
}

async function loadCupPlacements() {
  if (!DATA_SOURCES.placements) {
    return new Map();
  }

  try {
    const url = DATA_SOURCES.placements + (DATA_SOURCES.placements.indexOf("?") === -1 ? "?" : "&") + "_t=" + Date.now();
    const rows = await loadRowsSource(url);
    const placements = new Map();

    rows.forEach(function(row) {
      const cupName = normalizeText(getRowField(row, ["cup", "Cup", "CUP"], ["cup"]));
      if (!cupName) {
        return;
      }

      placements.set(normalizeLookupKey(cupName), {
        first: normalizeText(getRowField(row, ["1a", "1:a", "first", "vinnare"], ["1a", "vinnare", "first"])),
        second: normalizeText(getRowField(row, ["2a", "2:a", "second", "finalist"], ["2a", "finalist", "second"]))
      });
    });

    return placements;
  } catch (error) {
    console.warn("Kunde inte hamta cupvinnare.", error);
    return new Map();
  }
}

async function loadRowsSource(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Request failed for " + url);
  }

  const data = await response.json();
  return toObjectRows(unwrapRows(data));
}

async function loadAssetFileIndex(url, allowedExtensions) {
  if (!url) {
    return createAssetFileIndex([]);
  }

  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Request failed for " + url);
  }

  const payload = await response.json();
  const rows = unwrapRows(payload);
  const allowed = new Set((allowedExtensions || []).map(function(extension) {
    return String(extension).replace(/^\./, "").toLowerCase();
  }));
  const files = rows.map(function(row) {
    if (typeof row === "string") {
      return row;
    }
    return row?.name || row?.filename || row?.path || "";
  }).filter(function(name) {
    const extension = getFileExtension(name);
    return name && (!allowed.size || allowed.has(extension));
  });

  return createAssetFileIndex(files);
}

function unwrapRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const keys = ["data", "values", "rows", "result", "records", "items"];
  for (let index = 0; index < keys.length; index += 1) {
    if (Array.isArray(payload[keys[index]])) {
      return payload[keys[index]];
    }
  }

  return Object.values(payload).find(Array.isArray) || [];
}

function toObjectRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }
  if (!Array.isArray(rows[0])) {
    return rows;
  }

  const headers = rows[0].map(function(header) {
    return String(header || "").trim();
  });

  return rows.slice(1).filter(function(row) {
    return Array.isArray(row) && row.some(function(cell) {
      return String(cell ?? "").trim() !== "";
    });
  }).map(function(row) {
    const output = {};
    headers.forEach(function(header, index) {
      output[header] = row[index] ?? "";
    });
    return output;
  });
}

function normalizeCupSettings(row) {
  return {
    playoffCut1: toNullableNumber(getRowField(row, ["slutspelsstreck 1", "slutspelsstreck1"], ["slutspelsstreck1"])),
    playoffCut2: toNullableNumber(getRowField(row, ["slutspelsstreck 2", "slutspelsstreck2"], ["slutspelsstreck2"])),
    bestOf: {
      roundOf16: toNullableNumber(getRowField(row, ["bo åtton", "bo atton"], ["atton", "bo8"])),
      quarter: toNullableNumber(getRowField(row, ["bo kvart"], ["kvart"])),
      semi: toNullableNumber(getRowField(row, ["bo semi"], ["semi"])),
      final: toNullableNumber(getRowField(row, ["bo final"], ["final"]))
    },
    minPlayers: toNullableNumber(getRowField(row, ["Minst antal spelare", "Min antal spelare"], ["minst", "minantal"])),
    maxPlayers: toNullableNumber(getRowField(row, ["Max antal spelare", "Max antal"], ["max"])),
    eligibility: normalizeText(getRowField(row, ["Behörighet:", "Behörighet", "Behorighet"], ["behorighet", "behörighet", "eligibility"])),
    info: normalizeText(getRowField(row, ["Info"], ["info"]))
  };
}

function getRowField(row, candidates, fuzzyIncludes) {
  if (!row || typeof row !== "object") {
    return "";
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const key = candidates[index];
    if (row[key] !== undefined && normalizeText(row[key]) !== "") {
      return row[key];
    }
  }

  const normalized = {};
  Object.keys(row).forEach(function(key) {
    normalized[normalizeLookupKey(key)] = key;
  });

  for (let index = 0; index < candidates.length; index += 1) {
    const match = normalized[normalizeLookupKey(candidates[index])];
    if (match && normalizeText(row[match]) !== "") {
      return row[match];
    }
  }

  const keys = Object.keys(row);
  for (let index = 0; index < fuzzyIncludes.length; index += 1) {
    const needle = normalizeLookupKey(fuzzyIncludes[index]);
    const match = keys.find(function(key) {
      return normalizeLookupKey(key).indexOf(needle) !== -1;
    });
    if (match && normalizeText(row[match]) !== "") {
      return row[match];
    }
  }

  return "";
}

function normalizeCups(cups, settingsByCup, placementsByCup) {
  const settings = settingsByCup || new Map();
  const placements = placementsByCup || new Map();
  return cups
    .map(function(cup, index) {
      const groupPlayers = normalizePlayerRows(cup.playerStats?.group || [], "group");
      const playoffPlayers = normalizePlayerRows(cup.playerStats?.playoffs || [], "playoffs");
      const groupGoalies = normalizeGoalieRows(cup.goalieStats?.group || [], "group");
      const playoffGoalies = normalizeGoalieRows(cup.goalieStats?.playoffs || [], "playoffs");

      const normalizedMatches = (cup.matches || []).map(function(match, matchIndex) {
        const statsSummary = match.statsSummary || match.Stats || match.stats || "";
        const parsedStats = parseMatchStatsSummary(statsSummary, match);
        const normalizedPlayerStats = normalizeMatchStatSides(match.playerStats, normalizePlayerRows, "match");
        const normalizedGoalieStats = normalizeMatchStatSides(match.goalieStats, normalizeGoalieRows, "match");

        return {
          id: createMatchId(cup.id || index + 1, matchIndex),
          date: match.date || "",
          time: match.time || "",
          awayTeam: match.awayTeam || "Okant lag",
          awayScore: toNullableNumber(match.awayScore),
          homeScore: toNullableNumber(match.homeScore),
          homeTeam: match.homeTeam || "Okant lag",
          awayShots: toNullableNumber(match.awayShots ?? match.away_shots),
          homeShots: toNullableNumber(match.homeShots ?? match.home_shots),
          overtime: Boolean(match.overtime),
          stage: normalizeStage(match.stage, match.group),
          group: match.group || "",
          goalsSummary: match.goalsSummary || "",
          statsSummary: statsSummary,
          playerStats: hasMatchSideRows(normalizedPlayerStats) ? normalizedPlayerStats : parsedStats.playerStats,
          goalieStats: hasMatchSideRows(normalizedGoalieStats) ? normalizedGoalieStats : parsedStats.goalieStats
        };
      });
      const normalizedPlayoffPlayers = playoffPlayers.length
        ? playoffPlayers
        : aggregateMatchPlayerStats(normalizedMatches, "playoffs");
      const normalizedPlayoffGoalies = playoffGoalies.length
        ? playoffGoalies
        : aggregateMatchGoalieStats(normalizedMatches, "playoffs");
      const allPlayerStats = groupPlayers.concat(normalizedPlayoffPlayers);
      const topScorer = allPlayerStats
        .slice()
        .sort(function(a, b) {
          return (b.pts - a.pts) || (b.g - a.g) || a.player.localeCompare(b.player, "sv");
        })[0] || null;

      const id = String(cup.id || index + 1);
      const code = String(cup.code || ("SEC " + (index + 1)));
      const name = String(cup.name || cup.code || ("Svenska eHockey Cupen " + (index + 1)));
      const placement = findCupPlacement(placements, cup, code, name, id);
      const firstPlace = placement.first || cup.placements?.first || "";
      const secondPlace = placement.second || cup.placements?.second || "";

      return {
        id: id,
        sortOrder: typeof cup.sortOrder === "number" ? cup.sortOrder : inferSortOrder(cup.code || cup.name || cup.id || index + 1),
        code: code,
        name: name,
        badge: String(cup.badge || ""),
        settings: findCupSettings(settings, cup, code, name, id),
        winner: String(firstPlace || "Ej klar"),
        runnerUp: String(secondPlace || "Ej klar"),
        placements: {
          first: firstPlace,
          second: secondPlace
        },
        matches: normalizedMatches,
        playerStats: {
          group: groupPlayers,
          playoffs: normalizedPlayoffPlayers
        },
        goalieStats: {
          group: groupGoalies,
          playoffs: normalizedPlayoffGoalies
        },
        matchCount: normalizedMatches.length,
        topScorer: topScorer ? formatPlayerLabel(topScorer) : "Ingen data an"
      };
    })
    .sort(function(a, b) {
      return b.sortOrder - a.sortOrder;
    });
}

function normalizePlayerRows(rows, stage) {
  return rows.map(function(row) {
    const playerMeta = parsePlayerName(row.player);
    return {
      player: String(row.player || "Okand spelare"),
      displayName: playerMeta.name,
      countryCode: playerMeta.countryCode,
      team: String(row.team || "Okant lag"),
      gp: toNumber(row.gp),
      g: toNumber(row.g),
      a: toNumber(row.a),
      pts: toNumber(row.pts),
      pim: toNumber(row.pim),
      shots: toNumber(row.shots),
      playerId: row.playerId ? String(row.playerId) : "",
      stage: stage
    };
  });
}

function normalizeGoalieRows(rows, stage) {
  return rows.map(function(row) {
    const playerMeta = parsePlayerName(row.player);
    const ga = stage === "match" ? toNullableNumber(row.ga) : toNumber(row.ga);
    const sv = stage === "match" ? toNullableNumber(row.sv) : toNumber(row.sv);
    const rawSa = stage === "match" ? toNullableNumber(row.sa) : toNumber(row.sa);
    const sa = rawSa !== null && rawSa > 0 ? rawSa : (ga !== null && sv !== null ? ga + sv : rawSa);
    const rawSvp = row.svp === null || typeof row.svp === "undefined" ? null : Number(row.svp);
    const svp = sa > 0 && sv !== null
      ? sv / sa
      : (rawSvp !== null && Number.isFinite(rawSvp) ? (rawSvp > 1 ? rawSvp / 100 : rawSvp) : null);

    return {
      player: String(row.player || "Okand malvakt"),
      displayName: playerMeta.name,
      countryCode: playerMeta.countryCode,
      team: String(row.team || "Okant lag"),
      gp: toNumber(row.gp),
      sa: sa,
      ga: ga,
      sv: sv,
      gaa: stage === "match" ? toNullableNumber(row.gaa) : toNumber(row.gaa),
      svp: svp,
      so: stage === "match" ? toNullableNumber(row.so) : toNumber(row.so),
      playerId: row.playerId ? String(row.playerId) : "",
      stage: stage
    };
  });
}

function normalizeMatchStatSides(stats, normalizer, stage) {
  const source = stats || {};
  return {
    away: normalizer(Array.isArray(source.away) ? source.away : [], stage),
    home: normalizer(Array.isArray(source.home) ? source.home : [], stage)
  };
}

function aggregateMatchPlayerStats(matches, stage) {
  const map = new Map();

  matches.filter(function(match) {
    return match.stage === stage;
  }).forEach(function(match) {
    match.playerStats.away.concat(match.playerStats.home).forEach(function(row) {
      const key = row.playerId || normalizeLookupKey(row.player + "|" + row.team);
      if (!map.has(key)) {
        map.set(key, {
          player: row.player,
          displayName: row.displayName,
          countryCode: row.countryCode,
          team: row.team,
          gp: 0,
          g: 0,
          a: 0,
          pts: 0,
          pim: 0,
          shots: 0,
          playerId: row.playerId,
          stage: stage
        });
      }

      const target = map.get(key);
      target.gp += toNumber(row.gp) || 1;
      target.g += toNumber(row.g);
      target.a += toNumber(row.a);
      target.pts += toNumber(row.pts);
      target.pim += toNumber(row.pim);
      target.shots += toNumber(row.shots);
    });
  });

  return Array.from(map.values()).sort(function(a, b) {
    return b.pts - a.pts || b.g - a.g || b.a - a.a || b.shots - a.shots || a.player.localeCompare(b.player, "sv");
  });
}

function aggregateMatchGoalieStats(matches, stage) {
  const map = new Map();

  matches.filter(function(match) {
    return match.stage === stage;
  }).forEach(function(match) {
    match.goalieStats.away.concat(match.goalieStats.home).forEach(function(row) {
      const key = row.playerId || normalizeLookupKey(row.player + "|" + row.team);
      if (!map.has(key)) {
        map.set(key, {
          player: row.player,
          displayName: row.displayName,
          countryCode: row.countryCode,
          team: row.team,
          gp: 0,
          sa: 0,
          ga: 0,
          sv: 0,
          gaa: 0,
          svp: null,
          so: 0,
          playerId: row.playerId,
          stage: stage
        });
      }

      const target = map.get(key);
      target.gp += toNumber(row.gp) || 1;
      target.sa += toNumber(row.sa);
      target.ga += toNumber(row.ga);
      target.sv += toNumber(row.sv);
      target.so += toNumber(row.so);
    });
  });

  return Array.from(map.values()).map(function(row) {
    row.svp = row.sa > 0 ? row.sv / row.sa : null;
    row.gaa = row.gp > 0 ? row.ga / row.gp : 0;
    return row;
  }).sort(function(a, b) {
    return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(a.gaa) - safeNumber(b.gaa) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
  });
}

function buildTeams(cups) {
  const map = new Map();

  cups.forEach(function(cup) {
    const rows = []
      .concat(cup.playerStats.group)
      .concat(cup.playerStats.playoffs)
      .concat(cup.goalieStats.group)
      .concat(cup.goalieStats.playoffs);

    cup.matches.forEach(function(match) {
      ensureTeam(map, match.homeTeam);
      ensureTeam(map, match.awayTeam);

      addMatchToTeam(map.get(createTeamKey(match.homeTeam)), cup, match, true);
      addMatchToTeam(map.get(createTeamKey(match.awayTeam)), cup, match, false);
    });

    rows.forEach(function(row) {
      ensureTeam(map, row.team);
      const team = map.get(createTeamKey(row.team));
      team.cups.push({ id: cup.id, code: cup.code, name: cup.name });

      if (typeof row.g !== "undefined") {
        team.playerRows.push({
          cupId: cup.id,
          cupCode: cup.code,
          player: row.player,
          displayName: row.displayName,
          countryCode: row.countryCode,
          playerId: row.playerId,
          gp: row.gp,
          g: row.g,
          a: row.a,
          pts: row.pts,
          pim: row.pim,
          shots: row.shots,
          stage: row.stage
        });
      } else {
        team.goalieRows.push({
          cupId: cup.id,
          cupCode: cup.code,
          player: row.player,
          displayName: row.displayName,
          countryCode: row.countryCode,
          playerId: row.playerId,
          gp: row.gp,
          svp: row.svp,
          gaa: row.gaa,
          sv: row.sv,
          ga: row.ga,
          sa: row.sa,
          so: row.so,
          stage: row.stage
        });
      }
    });
  });

  return Array.from(map.values())
    .map(function(team) {
      team.cups = uniqueBy(team.cups, "id").sort(function(a, b) {
        return inferSortOrder(b.id) - inferSortOrder(a.id);
      });
      team.matches.sort(compareTeamMatchRowsDesc);
      return team;
    })
    .sort(function(a, b) {
      return a.name.localeCompare(b.name, "sv");
    });
}

function ensureTeam(map, teamName) {
  const key = createTeamKey(teamName);
  if (!map.has(key)) {
    map.set(key, {
      key: key,
      name: teamName,
      cups: [],
      matches: [],
      playerRows: [],
      goalieRows: [],
      wins: 0,
      losses: 0,
      otLosses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    });
  }
}

function addMatchToTeam(team, cup, match, isHome) {
  if (!team) {
    return;
  }

  const goalsFor = isHome ? match.homeScore : match.awayScore;
  const goalsAgainst = isHome ? match.awayScore : match.homeScore;

  team.cups.push({ id: cup.id, code: cup.code, name: cup.name });
  team.matches.push({
    cupId: cup.id,
    cupCode: cup.code,
    matchId: match.id,
    opponent: isHome ? match.awayTeam : match.homeTeam,
    isHome: isHome,
    goalsFor: goalsFor,
    goalsAgainst: goalsAgainst,
    overtime: match.overtime,
    date: match.date,
    time: match.time,
    stage: match.stage
  });

  team.goalsFor += toNumber(goalsFor);
  team.goalsAgainst += toNumber(goalsAgainst);

  if (toNumber(goalsFor) > toNumber(goalsAgainst)) {
    team.wins += 1;
  } else if (match.overtime) {
    team.otLosses += 1;
  } else {
    team.losses += 1;
  }
}

function buildPlayers(cups) {
  const map = new Map();

  cups.forEach(function(cup) {
    cup.playerStats.group.concat(cup.playerStats.playoffs).forEach(function(row) {
      const key = createPlayerKey(row);
      if (!map.has(key)) {
        map.set(key, createEmptyPlayer(row, key));
      }

      const player = map.get(key);
      player.teamNames.add(row.team);
      player.cups.push({ id: cup.id, code: cup.code });
      player.skaterRows.push({
        cupId: cup.id,
        cupCode: cup.code,
        team: row.team,
        displayName: row.displayName,
        countryCode: row.countryCode,
        gp: row.gp,
        g: row.g,
        a: row.a,
        pts: row.pts,
        pim: row.pim,
        shots: row.shots,
        stage: row.stage
      });
      player.totals.gp += row.gp;
      player.totals.g += row.g;
      player.totals.a += row.a;
      player.totals.pts += row.pts;
      player.totals.pim += row.pim;
    });

    cup.goalieStats.group.concat(cup.goalieStats.playoffs).forEach(function(row) {
      const key = createPlayerKey(row);
      if (!map.has(key)) {
        map.set(key, createEmptyPlayer(row, key));
      }

      const player = map.get(key);
      player.teamNames.add(row.team);
      player.cups.push({ id: cup.id, code: cup.code });
      player.goalieRows.push({
        cupId: cup.id,
        cupCode: cup.code,
        team: row.team,
        displayName: row.displayName,
        countryCode: row.countryCode,
        gp: row.gp,
        svp: row.svp,
        gaa: row.gaa,
        sv: row.sv,
        ga: row.ga,
        sa: row.sa,
        so: row.so,
        stage: row.stage
      });
    });
  });

  return Array.from(map.values())
    .map(function(player) {
      player.teamNames = Array.from(player.teamNames).sort(function(a, b) {
        return a.localeCompare(b, "sv");
      });
      player.cups = uniqueBy(player.cups, "id").sort(function(a, b) {
        return inferSortOrder(b.id) - inferSortOrder(a.id);
      });
      return player;
    })
    .sort(function(a, b) {
      return a.name.localeCompare(b.name, "sv");
    });
}

function createEmptyPlayer(row, key) {
  return {
    key: key,
    playerId: row.playerId || "",
    name: row.displayName || row.player,
    rawName: row.player,
    countryCode: row.countryCode || "",
    teamNames: new Set(),
    cups: [],
    skaterRows: [],
    goalieRows: [],
    totals: { gp: 0, g: 0, a: 0, pts: 0, pim: 0 }
  };
}

function renderCurrentRoute() {
  if (!state.ready) {
    setView(renderLoadingState());
    return;
  }

  const activeCupTab = state.activeCupTab || document.querySelector("[data-cup-tab].is-active")?.getAttribute("data-cup-tab") || "";
  const route = parseRoute();
  let html = "";
  let isSommarRoute = false;

  if (route.type === "home") {
    html = renderHomePage();
  } else if (route.type === "cups") {
    html = renderCupsIndex();
  } else if (route.type === "cup") {
    const cup = state.cups.find(function(entry) { return entry.id === route.id; });
    isSommarRoute = !!cup && getCupCategory(cup) === "sommar";
    html = cup ? renderCupPage(cup) : renderNotFound("Cupen kunde inte hittas.");
  } else if (route.type === "match") {
    const cup = state.cups.find(function(entry) { return entry.id === route.cupId; });
    const match = cup?.matches.find(function(entry) { return entry.id === route.matchId; });
    isSommarRoute = !!cup && getCupCategory(cup) === "sommar";
    html = cup && match ? renderMatchPage(cup, match) : renderNotFound("Matchen kunde inte hittas.");
  } else if (route.type === "teams") {
    html = renderTeamsIndex();
  } else if (route.type === "team") {
    const team = state.teams.find(function(entry) { return entry.key === route.id; });
    const cup = route.cupId ? state.cups.find(function(entry) { return entry.id === route.cupId; }) : null;
    isSommarRoute = !!cup && getCupCategory(cup) === "sommar";
    html = team ? renderTeamPage(team, cup) : renderNotFound("Laget kunde inte hittas.");
  } else if (route.type === "players") {
    if (!state.playersReady) {
      ensurePlayersReady().then(renderCurrentRoute);
      html = renderLoadingState("Bygger spelarregister...");
    } else {
      html = renderPlayersIndex();
    }
  } else if (route.type === "player") {
    if (!state.playersReady) {
      ensurePlayersReady().then(renderCurrentRoute);
      html = renderLoadingState("Bygger spelarprofil...");
    } else {
      const player = state.players.find(function(entry) { return entry.key === route.id; });
      html = player ? renderPlayerPage(player) : renderNotFound("Spelaren kunde inte hittas.");
    }
  } else if (route.type === "signupTeam") {
    html = renderTeamSignupPage();
  } else if (route.type === "signupSummerDraft") {
    html = renderSummerDraftSignupPage();
  } else {
    html = renderNotFound("Sidan kunde inte hittas.");
  }

  document.body.classList.toggle("theme-sommar", isSommarRoute);
  setView(html);
  if (route.type === "cup" && activeCupTab) {
    activateCupTab(activeCupTab);
  } else if (route.type !== "cup") {
    state.activeCupTab = "";
  }
  updateNavState(route);
}

function renderHomePage() {
  const categories = splitCupsByCategory(state.cups);
  const totalMatches = sumBy(state.cups, "matchCount");

  return `
    <section class="sec-index-shell">
      <a href="#/" class="sec-header-link" aria-label="Svenska eHockey Cupen">
        <div class="sfc-header">
          <img class="sfc-logo" src="./SECLOGGA.png" alt="SEC Logo">
          <div class="sfc-title">Svenska eHockey <strong>Cupen</strong></div>
          <div class="sfc-divider"></div>
        </div>
      </a>

      ${renderGlobalSearchModule()}

      <section class="tab-panel info-panel welcome-panel">
        <div class="welcome-title-row">
          <span class="welcome-icon" aria-hidden="true">ℹ️</span>
          <h2>Välkommen</h2>
        </div>
        <p>
          Välkommen till Svenska eHockey Cupen (SEC) – en communitydriven eHockey-cup som spelas i
          <strong>EA Sports NHL</strong>. Cupen är i grunden svensk, men vi vill att våra skandinaviska spelare
          ska vara helt likvärdiga. Därför räknas spelare från <strong>Sverige, Danmark och Norge</strong>
          på samma villkor, både i lagbyggen och i tävlingssammanhang.
        </p>
        <p>
          Genom åren har reglerna kunnat skilja sig något mellan olika upplagor av cupen, men en sak har
          varit tydlig: antalet spelare utanför Skandinavien brukar vara <strong>begränsat</strong> för att
          behålla cupens skandinaviska profil och en jämn, tydlig identitet.
        </p>
        <p>
          Här på sidan hittar du allt för att följa SEC: matchresultat, tabeller, topplistor,
          spelarstatistik, historiska resultat, matchdata och lagpresentationer. Sidan
          <strong>uppdateras kontinuerligt</strong> och förnyas löpande med nya detaljer, förbättringar och mer innehåll.
        </p>
        <p class="welcome-archive-line">
          Just nu finns <strong>${state.cups.length}</strong> cuper, <strong>${totalMatches}</strong> matcher,
          <strong>${state.teams.length}</strong> lag och <strong>${state.playersReady ? state.players.length : "..."}</strong> spelare i arkivet.
        </p>
      </section>

      ${renderHomeSignupCallout()}

      <section class="tab-panel cups-panel">
        <h2>Valj turnering</h2>
        <div class="cup-status">
          Visar ${state.cups.length} cup${state.cups.length === 1 ? "" : "er"}.
        </div>

        <div class="cup-section">
          <h3 class="cup-section-title">Svenska eHockey Cupen</h3>
          <div class="cup-list">
            ${categories.regular.length ? categories.regular.map(renderCupCard).join("") : renderEmptyCupState("Inga vanliga SEC-cuper hittades.")}
          </div>
        </div>

        <div class="cup-sep"></div>

        <div class="cup-section">
          <h3 class="cup-section-title">SEC Sommar</h3>
          <div class="cup-list">
            ${categories.sommar.length ? categories.sommar.map(renderCupCard).join("") : renderEmptyCupState("Inga sommarcuper hittades.")}
          </div>
        </div>

      </section>

      <footer id="sec-footer-wrapper">
        <div class="sec-footer-glow"></div>
        <div id="sec-footer-line"></div>
        <div id="sec-footer-text">
          Ã‚Â© 2026 <span>Svenska eHockey Cupen</span> | Design & utveckling av <span>Svensk eHockey</span>
        </div>
      </footer>
    </section>
  `;
}

function renderHomeSignupCallout() {
  return `
    <section class="tab-panel signup-public-panel">
      <div class="signup-public-copy">
        <p class="eyebrow">Anmälan öppen</p>
        <h2>SEC 21 laganmälan</h2>
        <p>Anmäl ditt lag till Svenska eHockey Cupen 21. Anmälan kräver kod från cupadmin.</p>
      </div>
      <a class="button button-primary signup-public-link" href="#/anmalan/lag">Anmäl lag</a>
    </section>
  `;
}

function renderCupsIndex() {
  const categories = splitCupsByCategory(state.cups);

  return `
    <section class="tab-panel cups-panel">
      <h2>Alla SEC-cuper</h2>
      <div class="cup-status">
        Hela arkivet med ordinarie cuper och sommarcuper.
      </div>

      <div class="cup-section">
        <h3 class="cup-section-title">Svenska eHockey Cupen</h3>
        <div class="cup-list">
          ${categories.regular.length ? categories.regular.map(renderCupCard).join("") : renderEmptyCupState("Inga vanliga SEC-cuper hittades.")}
        </div>
      </div>

      <div class="cup-sep"></div>

      <div class="cup-section">
        <h3 class="cup-section-title">SEC Sommar</h3>
        <div class="cup-list">
          ${categories.sommar.length ? categories.sommar.map(renderCupCard).join("") : renderEmptyCupState("Inga sommarcuper hittades.")}
        </div>
      </div>

    </section>
  `;
}

function renderCupPage(cup) {
  const overview = getCupOverview(cup);
  const groupStandings = buildGroupStandings(cup.matches);
  const playoffRounds = buildPlayoffRounds(cup.matches, cup);
  const latestMatches = cup.matches.slice().sort(compareMatchesDesc).slice(0, 10);
  const topPlayers = overview.topPlayers.slice(0, 5);
  const topGoalies = overview.topGoalies.slice(0, 5);
  const goalieKing = topGoalies[0] || null;

  return `
    <section class="cup-hero ${getCupCategory(cup) === "sommar" ? "is-sommar" : ""}">
      <div class="cup-hero-main">
        <div class="breadcrumbs">
          <a href="#/">Start</a>
          <span>/</span>
          <a href="#/cups">Cuper</a>
          <span>/</span>
          <strong>${escapeHtml(cup.code)}</strong>
        </div>
        <p class="eyebrow">${escapeHtml(cup.code)}</p>
        <h1 class="page-title">${formatCupHeroTitle(cup.name)}</h1>
        <p class="page-intro">
          Cupsidan visar oversikt, tabeller, lag, topplistor och matcher for den valda turneringen.
        </p>
        <div class="summary-ribbon" aria-label="Cupsummering">
          <span><strong>${overview.teams.length}</strong><em>Lag</em></span>
          <span><strong>${overview.groupMatches.length}</strong><em>Gruppmatcher</em></span>
          <span><strong>${overview.playoffMatches.length}</strong><em>Slutspelsmatcher</em></span>
        </div>
      </div>

      <aside class="cup-hero-side cup-logo-panel" aria-label="Svenska eHockey Cupen">
        <img class="cup-hero-logo" src="${getCupLogoSrc(cup)}" alt="${escapeHtml(cup.code)}">
      </aside>
    </section>

    <section class="cup-highlight-grid">
      ${renderCupHighlightCard("Poängkung", topPlayers[0], {
        type: "player",
        stat: topPlayers[0] ? topPlayers[0].pts + " p" : ""
      })}
      ${renderCupHighlightCard("Vinnare", {
        name: cup.winner,
        team: cup.winner
      }, {
        type: "team",
        cupId: cup.id,
        stat: cup.runnerUp && cup.runnerUp !== "Ej klar" ? "Finalist: " + cup.runnerUp : ""
      })}
      ${renderCupHighlightCard("Målvaktskung", goalieKing, {
        type: "player",
        stat: goalieKing ? formatPercentage(goalieKing.svp) : ""
      })}
    </section>

    <section class="cup-tabs-shell">
      <div class="cup-tabs" role="tablist" aria-label="Cupflikar">
        <button class="cup-tab is-active" type="button" role="tab" aria-selected="true" data-cup-tab="oversikt">ÖVERSIKT</button>
        <button class="cup-tab" type="button" role="tab" aria-selected="false" data-cup-tab="lag">LAG</button>
        <button class="cup-tab" type="button" role="tab" aria-selected="false" data-cup-tab="tabell">TABELL</button>
        <button class="cup-tab" type="button" role="tab" aria-selected="false" data-cup-tab="slutspel">SLUTSPEL</button>
        <button class="cup-tab" type="button" role="tab" aria-selected="false" data-cup-tab="matcher">MATCHER</button>
        <button class="cup-tab" type="button" role="tab" aria-selected="false" data-cup-tab="statistik">STATISTIK</button>
        <button class="cup-tab" type="button" role="tab" aria-selected="false" data-cup-tab="regler">REGLER</button>
      </div>
      <div class="cup-tab-panels">
        <section class="cup-tab-panel is-active" data-cup-panel="oversikt" role="tabpanel">
          <div class="two-column-section">
            <article class="detail-card">
              <div class="section-heading compact">
                <p class="eyebrow">Cupinfo</p>
                <h2>Format och regler</h2>
              </div>
              <div class="simple-list">
                ${renderCupSettingsSummary(cup.settings)}
              </div>
            </article>

            <article class="detail-card">
              <div class="section-heading compact">
                <p class="eyebrow">Senaste</p>
                <h2>Senaste 10 matcher</h2>
              </div>
              <div class="simple-list">
                ${latestMatches.length ? latestMatches.map(function(match) {
                  return renderCompactMatchLink(cup, match);
                }).join("") : `<div class="empty-state">Inga matcher finns registrerade an.</div>`}
              </div>
            </article>
          </div>

          <div class="two-column-section">
            <article class="detail-card">
              <div class="section-heading compact">
                <p class="eyebrow">Krav</p>
                <h2>Topp 5 poäng</h2>
              </div>
              ${renderOverviewPlayerCards(topPlayers, {
                label: "PTS",
                value: function(row) { return row.pts; },
                sort: function(a, b) { return b.pts - a.pts || b.g - a.g; }
              })}
            </article>

            <article class="detail-card">
              <div class="section-heading compact">
                <p class="eyebrow">Malvakter</p>
                <h2>Topp 5 SV%</h2>
              </div>
              ${renderOverviewPlayerCards(topGoalies, {
                label: "SV%",
                value: function(row) { return formatPercentage(row.svp); },
                meta: function(row) { return "GP " + row.gp; },
                sort: function(a, b) { return safeNumber(b.svp) - safeNumber(a.svp); }
              })}
            </article>
          </div>
        </section>

        <section class="cup-tab-panel" data-cup-panel="lag" role="tabpanel" hidden>
          <div class="section">
            <div class="section-heading">
              <p class="eyebrow">Lag</p>
              <h2>Deltagande lag</h2>
            </div>
            <div class="entity-grid">
              ${overview.teams.length ? overview.teams.slice().sort(function(a, b) {
                return a.name.localeCompare(b.name, "sv", { sensitivity: "base" });
              }).map(function(team) {
                return renderTeamCard(team, cup.id);
              }).join("") : `<div class="empty-state">Inga lag finns registrerade for den har cupen.</div>`}
            </div>
          </div>
        </section>
        <section class="cup-tab-panel" data-cup-panel="statistik" role="tabpanel" hidden>
          <article class="detail-card cup-stats-card" data-cup-stat-shell>
            <div class="cup-stats-head">
              <div class="section-heading compact">
                <p class="eyebrow">Statistik</p>
                <h2>Spelare och målvakter</h2>
              </div>
              <div class="cup-stats-search">
                <input data-cup-stat-search type="search" placeholder="Sök spelare, lag eller nationalitet" autocomplete="off" aria-label="Sök spelare, lag eller nationalitet">
              </div>
            </div>

            <div class="cup-stats-controls" aria-label="Statistikfilter">
              <div class="stat-segment" role="tablist" aria-label="Statistiktyp">
                <button class="stat-filter-button is-active" type="button" data-cup-stat-type="players" aria-selected="true">Spelare</button>
                <button class="stat-filter-button" type="button" data-cup-stat-type="goalies" aria-selected="false">Målvakter</button>
              </div>
              <div class="stat-segment" role="tablist" aria-label="Spelfas">
                <button class="stat-filter-button is-active" type="button" data-cup-stat-stage="group" aria-selected="true">Gruppspel</button>
                <button class="stat-filter-button" type="button" data-cup-stat-stage="playoffs" aria-selected="false">Slutspel</button>
              </div>
            </div>

            ${renderCupStatsPanel("players", "group", "Spelare", "Gruppspel", renderCupPlayerStatsTable(cup.playerStats.group, cup.id))}
            ${renderCupStatsPanel("players", "playoffs", "Spelare", "Slutspel", renderCupPlayerStatsTable(cup.playerStats.playoffs, cup.id))}
            ${renderCupStatsPanel("goalies", "group", "Målvakter", "Gruppspel", renderCupGoalieStatsTable(cup.goalieStats.group, cup.id))}
            ${renderCupStatsPanel("goalies", "playoffs", "Målvakter", "Slutspel", renderCupGoalieStatsTable(cup.goalieStats.playoffs, cup.id))}
          </article>
        </section>

        <section class="cup-tab-panel" data-cup-panel="matcher" role="tabpanel" hidden>
          <section class="section">
            <div class="section-heading">
              <p class="eyebrow">Matcher</p>
              <h2>Matchcenter</h2>
            </div>
            ${renderCupMatchFilters(cup)}
            <div class="stage-stack">
              ${overview.playoffMatches.length ? renderMatchCollection("Slutspel", overview.playoffMatches, cup) : ""}
              ${overview.groupMatches.length ? renderMatchCollection("Gruppspel", overview.groupMatches, cup) : ""}
              ${!cup.matches.length ? `<div class="empty-state">Inga matcher finns registrerade for den har cupen.</div>` : ""}
              <div class="empty-state" data-match-filter-empty hidden>Inga matcher matchar filtret.</div>
            </div>
          </section>
        </section>

        <section class="cup-tab-panel" data-cup-panel="tabell" role="tabpanel" hidden>
          <div class="stack-grid">
            ${groupStandings.length ? groupStandings.map(function(group) { return renderStandingsTable(group, cup.settings, cup.id); }).join("") : `<div class="empty-state">Ingen gruppstatistik finns an.</div>`}
          </div>
        </section>

        <section class="cup-tab-panel" data-cup-panel="slutspel" role="tabpanel" hidden>
          ${renderPlayoffBracket(playoffRounds, overview.playoffMatches, cup.settings, cup)}
        </section>

        <section class="cup-tab-panel" data-cup-panel="regler" role="tabpanel" hidden>
          ${renderCupRules(cup)}
        </section>
      </div>
    </section>
  `;
}

function renderCupStatsPanel(type, stage, title, subtitle, tableHtml) {
  const active = type === "players" && stage === "group";

  return `
    <section class="cup-stats-panel${active ? " is-active" : ""}" data-cup-stat-panel="${type}-${stage}" ${active ? "" : "hidden"}>
      <div class="section-heading compact">
        <p class="eyebrow">${escapeHtml(subtitle)}</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      ${tableHtml}
      <div class="empty-state cup-stat-filter-empty" data-cup-stat-empty hidden>Ingen rad matchar sökningen.</div>
    </section>
  `;
}

function renderCupMatchFilters(cup) {
  const teams = getCupMatchFilterTeams(cup);
  const groups = getCupMatchFilterGroups(cup);

  if (!teams.length && !groups.length) {
    return "";
  }

  return `
    <div class="match-filter-bar" data-match-filter-shell>
      <label>
        <span>Lag</span>
        <select data-match-team-filter>
          <option value="">Alla lag</option>
          ${teams.map(function(team) {
            return `<option value="${escapeHtml(slugify(team))}">${escapeHtml(team)}</option>`;
          }).join("")}
        </select>
      </label>
      <label>
        <span>Grupp</span>
        <select data-match-group-filter>
          <option value="">Alla grupper</option>
          ${groups.map(function(group) {
            return `<option value="${escapeHtml(group.value)}">${escapeHtml(group.label)}</option>`;
          }).join("")}
        </select>
      </label>
    </div>
  `;
}

function getCupMatchFilterTeams(cup) {
  const teams = [];

  cup.matches.forEach(function(match) {
    teams.push(match.awayTeam, match.homeTeam);
  });

  return uniqueStrings(teams).sort(function(a, b) {
    return a.localeCompare(b, "sv");
  });
}

function getCupMatchFilterGroups(cup) {
  const map = new Map();

  cup.matches.forEach(function(match) {
    const label = getMatchFilterGroupLabel(match);
    const value = slugify(label);
    if (!map.has(value)) {
      map.set(value, { label: label, value: value, sort: match.stage === "playoffs" ? 999 : 1 });
    }
  });

  return Array.from(map.values()).sort(function(a, b) {
    return a.sort - b.sort || a.label.localeCompare(b.label, "sv");
  });
}

function getMatchFilterGroupLabel(match) {
  if (match.stage === "playoffs") {
    return "Slutspel";
  }
  return match.group || "Gruppspel";
}

function renderCupPlayerStatsTable(rows, cupId) {
  const sortedRows = rows.slice().sort(function(a, b) {
    return b.pts - a.pts || b.g - a.g || b.a - a.a || b.shots - a.shots || b.pim - a.pim || a.player.localeCompare(b.player, "sv");
  });

  return renderStatsTable(
    [
      { key: "player", label: "Spelare" },
      { key: "team", label: "Lag" },
      { key: "gp", label: "GP", type: "number" },
      { key: "g", label: "G", type: "number" },
      { key: "a", label: "A", type: "number" },
      { key: "pts", label: "PTS", type: "number" },
      { key: "shots", label: "S", type: "number" },
      { key: "pim", label: "PIM", type: "number" }
    ],
    sortedRows.map(function(row) {
      return {
        player: createPlayerCell(row),
        team: createTeamCell(row.team, cupId),
        gp: row.gp,
        g: row.g,
        a: row.a,
        pts: row.pts,
        shots: row.shots,
        pim: row.pim,
        _search: getCupStatSearchText(row)
      };
    })
  );
}

function renderCupGoalieStatsTable(rows, cupId) {
  const sortedRows = rows.slice().sort(function(a, b) {
    return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(a.gaa) - safeNumber(b.gaa) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
  });

  return renderStatsTable(
    [
      { key: "player", label: "Målvakt" },
      { key: "team", label: "Lag" },
      { key: "gp", label: "GP", type: "number" },
      { key: "sa", label: "SA", type: "number" },
      { key: "ga", label: "GA", type: "number" },
      { key: "sv", label: "SV", type: "number" },
      { key: "svp", label: "SV%", type: "number" },
      { key: "gaa", label: "GAA", type: "number" },
      { key: "so", label: "SO", type: "number" }
    ],
    sortedRows.map(function(row) {
      return {
        player: createPlayerCell(row),
        team: createTeamCell(row.team, cupId),
        gp: row.gp,
        sa: row.sa,
        ga: row.ga,
        sv: row.sv,
        svp: createCellValue(formatPercentage(row.svp), normalizePercentageForSort(row.svp)),
        gaa: createCellValue(formatDecimal(row.gaa), safeNumber(row.gaa)),
        so: row.so,
        _search: getCupStatSearchText(row)
      };
    })
  );
}

function getCupStatSearchText(row) {
  return [
    row.player,
    row.displayName,
    row.team,
    row.countryCode
  ].filter(Boolean).join(" ");
}

function renderMatchPage(cup, match) {
  const analysis = analyzeMatchEvents(match);
  const playerGroups = getMatchPlayerGroupsForRender(cup, match, analysis.playerStats);
  const goalieGroups = getMatchGoalieGroupsForRender(cup, match);

  return `
    <section class="cup-hero match-detail-hero ${getCupCategory(cup) === "sommar" ? "is-sommar" : ""}">
      <div class="cup-hero-main">
        <div class="breadcrumbs">
          <a href="#/">Start</a>
          <span>/</span>
          <a href="#/cups">Cuper</a>
          <span>/</span>
          <a href="#/cup/${encodeURIComponent(cup.id)}">${escapeHtml(cup.code)}</a>
          <span>/</span>
          <strong>Match</strong>
        </div>
        <p class="eyebrow">${escapeHtml(match.group || (match.stage === "playoffs" ? "Slutspel" : "Gruppspel"))}</p>
        <h1 class="page-title">${escapeHtml(match.awayTeam)} vs ${escapeHtml(match.homeTeam)}</h1>
        <p class="page-intro">${escapeHtml(formatMatchDate(match.date, match.time) || "Datum saknas")}</p>
        <div class="match-detail-score">
          ${renderMatchTeamScore(match.awayTeam, match.awayScore)}
          <span class="match-detail-score-value">${displayScore(match.awayScore)} - ${displayScore(match.homeScore)}</span>
          ${renderMatchTeamScore(match.homeTeam, match.homeScore)}
        </div>
      </div>

      <aside class="cup-hero-side match-detail-side">
        <div class="section-heading compact">
          <p class="eyebrow">Matchstatistik</p>
          <h2>Översikt</h2>
        </div>
        ${renderMatchStatGrid(match, analysis)}
      </aside>
    </section>

    <section class="detail-card match-events-card">
      <div class="section-heading compact">
        <p class="eyebrow">Matchsummering</p>
        <h2>Händelser</h2>
      </div>
      ${renderMatchTimeline(analysis.events)}
    </section>

    <section class="detail-card">
      <div class="section-heading compact">
        <p class="eyebrow">Spelare</p>
        <h2>Spelarstatistik</h2>
      </div>
      ${renderMatchTeamPlayerStats(playerGroups)}
    </section>

    <section class="detail-card">
      <div class="section-heading compact">
        <p class="eyebrow">Målvakter</p>
        <h2>Målvaktsstatistik</h2>
      </div>
      ${renderMatchTeamGoalieStats(goalieGroups)}
    </section>
  `;
}

function renderMatchTeamScore(teamName, score) {
  return `
    <div class="match-detail-team">
      ${renderTeamLogo(teamName, "team-logo-lg")}
      <strong>${escapeHtml(teamName)}</strong>
    </div>
  `;
}

function renderMatchStatGrid(match, analysis) {
  const away = analysis.teamStats[createTeamKey(match.awayTeam)] || createEmptyMatchTeamStats(match.awayTeam);
  const home = analysis.teamStats[createTeamKey(match.homeTeam)] || createEmptyMatchTeamStats(match.homeTeam);
  const shots = getMatchShots(match);

  const rows = [
    shots ? { label: "Skott", away: shots.away, home: shots.home } : null,
    { label: "Utvisningar", away: away.penalties, home: home.penalties },
    { label: "PIM", away: away.pim, home: home.pim },
    {
      label: "Special teams",
      away: "PP " + away.ppGoals + " · SH " + away.shGoals,
      home: "PP " + home.ppGoals + " · SH " + home.shGoals
    }
  ].filter(function(row) {
    return Boolean(row);
  });

  return `
    <div class="match-stat-board">
      <div class="match-stat-board-head">
        <span>${escapeHtml(match.awayTeam)}</span>
        <span></span>
        <span>${escapeHtml(match.homeTeam)}</span>
      </div>
      ${rows.map(function(row) {
        return `
          <div class="match-stat-row">
            <strong>${escapeHtml(formatNullableStat(row.away))}</strong>
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(formatNullableStat(row.home))}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getMatchShots(match) {
  const directAwayShots = toNullableNumber(match.awayShots);
  const directHomeShots = toNullableNumber(match.homeShots);
  if (directAwayShots !== null || directHomeShots !== null) {
    return {
      away: directAwayShots,
      home: directHomeShots
    };
  }

  const awayGoalieSa = sumNullableRows(match.goalieStats?.away, "sa");
  const homeGoalieSa = sumNullableRows(match.goalieStats?.home, "sa");
  if (awayGoalieSa === null && homeGoalieSa === null) {
    return null;
  }

  return {
    away: homeGoalieSa,
    home: awayGoalieSa
  };
}

function sumNullableRows(rows, key) {
  if (!Array.isArray(rows)) {
    return null;
  }

  let hasValue = false;
  const total = rows.reduce(function(sum, row) {
    const value = toNullableNumber(row?.[key]);
    if (value === null) {
      return sum;
    }
    hasValue = true;
    return sum + value;
  }, 0);

  return hasValue ? total : null;
}

function parseMatchStatsSummary(summary, match) {
  const result = {
    playerStats: { away: [], home: [] },
    goalieStats: { away: [], home: [] }
  };
  const text = String(summary || "").trim();

  if (!text) {
    return result;
  }

  let currentTeam = "";
  text.split("|").map(normalizeText).filter(Boolean).forEach(function(part) {
    const teamHeader = part.match(/^([^:]+):\s*(.*)$/);

    if (teamHeader && !/^målvakt$/i.test(normalizeText(teamHeader[1]))) {
      currentTeam = normalizeText(teamHeader[1]);
      const firstStat = normalizeText(teamHeader[2]);
      if (firstStat) {
        addParsedMatchStatLine(result, firstStat, currentTeam, match);
      }
      return;
    }

    addParsedMatchStatLine(result, part, currentTeam, match);
  });

  return result;
}

function addParsedMatchStatLine(result, line, teamName, match) {
  if (!teamName) {
    return;
  }

  const goalie = parseMatchGoalieStatLine(line, teamName);
  if (goalie) {
    const side = getMatchStatSide(teamName, match);
    if (side) {
      result.goalieStats[side].push(goalie);
    }
    return;
  }

  const player = parseMatchPlayerStatLine(line, teamName);
  if (player) {
    const side = getMatchStatSide(teamName, match);
    if (side) {
      result.playerStats[side].push(player);
    }
  }
}

function parseMatchPlayerStatLine(line, teamName) {
  const match = normalizeText(line).match(/^(.*?)\s+(-?\d+)G\s+(-?\d+)A\s+(-?\d+)PTS\s+(-?\d+)PIM$/i);
  if (!match) {
    return null;
  }

  return {
    player: normalizeText(match[1]),
    team: teamName,
    gp: 1,
    g: toNumber(match[2]),
    a: toNumber(match[3]),
    pts: toNumber(match[4]),
    pim: toNumber(match[5])
  };
}

function parseMatchGoalieStatLine(line, teamName) {
  const match = normalizeText(line).match(/^Målvakt:\s*(.*?)\s+(-|\d+)SA\s+(\d+)GA\s+(\d+)SV\s+(-|[.\d,]+)SV%$/i);
  if (!match) {
    return null;
  }

  const rawSa = match[2] === "-" ? 0 : toNumber(match[2]);
  const ga = toNumber(match[3]);
  const sv = toNumber(match[4]);
  const sa = rawSa > 0 ? rawSa : ga + sv;
  const parsedSvp = match[5] === "-" ? 0 : toNumber(String(match[5]).replace(",", "."));
  const svp = sa > 0 ? sv / sa : (parsedSvp > 1 ? parsedSvp / 100 : parsedSvp);

  return {
    player: normalizeText(match[1]),
    team: teamName,
    gp: 1,
    sa: sa,
    ga: ga,
    sv: sv,
    gaa: ga,
    svp: svp,
    so: ga === 0 ? 1 : 0
  };
}

function getMatchStatSide(teamName, match) {
  const teamKey = createTeamKey(teamName);
  if (teamKey === createTeamKey(match.awayTeam)) {
    return "away";
  }
  if (teamKey === createTeamKey(match.homeTeam)) {
    return "home";
  }

  const looseTeamKey = normalizeLooseAssetKey(teamName);
  if (looseTeamKey && looseTeamKey === normalizeLooseAssetKey(match.awayTeam)) {
    return "away";
  }
  if (looseTeamKey && looseTeamKey === normalizeLooseAssetKey(match.homeTeam)) {
    return "home";
  }

  return "";
}

function renderMatchTimeline(events) {
  if (!events.length) {
    return `<div class="empty-state">Ingen matchsummering finns registrerad.</div>`;
  }

  return `
    <div class="match-timeline">
      ${events.map(function(event) {
        const label = event.type === "goal" ? "Mål" : event.type === "penalty" ? "Utvisning" : "Info";
        const description = event.type === "goal"
          ? formatGoalEventDescription(event)
          : event.type === "penalty"
            ? formatPenaltyEventDescription(event)
            : event.body;

        return `
          <div class="match-event is-${escapeHtml(event.type)}">
            <span class="match-event-time">${escapeHtml(event.time || "-")}</span>
            <span class="match-event-type">${escapeHtml(label)}</span>
            <span class="match-event-body">
              <strong>${escapeHtml(event.team || "")}</strong>
              <span>${escapeHtml(description)}</span>
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function formatGoalEventDescription(event) {
  const assists = event.assists.length ? " (" + event.assists.join(", ") + ")" : "";
  const tags = event.tags.length ? " · " + event.tags.join(", ") : "";
  return event.player + assists + tags;
}

function formatPenaltyEventDescription(event) {
  const penalty = event.penalty ? " - " + event.penalty : "";
  const minutes = event.pim ? " (" + event.pim + " min)" : "";
  return event.player + penalty + minutes;
}

function analyzeMatchEvents(match) {
  const events = parseMatchEvents(match.goalsSummary);
  const teamStats = {};
  teamStats[createTeamKey(match.awayTeam)] = createEmptyMatchTeamStats(match.awayTeam);
  teamStats[createTeamKey(match.homeTeam)] = createEmptyMatchTeamStats(match.homeTeam);

  const playerStats = new Map();
  const specialTeams = {
    ppGoals: 0,
    shGoals: 0,
    enGoals: 0
  };

  events.forEach(function(event) {
    const teamKey = createTeamKey(event.team);
    if (event.team && !teamStats[teamKey]) {
      teamStats[teamKey] = createEmptyMatchTeamStats(event.team);
    }

    if (event.type === "goal") {
      teamStats[teamKey].goals += 1;
      if (event.tags.includes("PP")) {
        teamStats[teamKey].ppGoals += 1;
        specialTeams.ppGoals += 1;
      }
      if (event.tags.includes("SH")) {
        teamStats[teamKey].shGoals += 1;
        specialTeams.shGoals += 1;
      }
      if (event.tags.includes("EN")) {
        specialTeams.enGoals += 1;
      }
      incrementMatchPlayerStat(playerStats, event.player, event.team, "g", 1);
      event.assists.forEach(function(assist) {
        incrementMatchPlayerStat(playerStats, assist, event.team, "a", 1);
      });
    }

    if (event.type === "penalty") {
      teamStats[teamKey].penalties += 1;
      teamStats[teamKey].pim += event.pim;
      incrementMatchPlayerStat(playerStats, event.player, event.team, "pim", event.pim);
    }
  });

  return {
    events: events,
    teamStats: teamStats,
    playerStats: playerStats,
    specialTeams: specialTeams
  };
}

function createEmptyMatchTeamStats(teamName) {
  return {
    team: teamName,
    goals: 0,
    penalties: 0,
    pim: 0,
    ppGoals: 0,
    shGoals: 0
  };
}

function parseMatchEvents(summary) {
  return String(summary || "")
    .replace(/\r/g, "")
    .split("|")
    .map(parseMatchEvent)
    .filter(Boolean);
}

function parseMatchEvent(rawEvent) {
  const raw = normalizeText(rawEvent);
  if (!raw) {
    return null;
  }

  const timeMatch = raw.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
  const time = timeMatch ? timeMatch[1] : "";
  const body = timeMatch ? timeMatch[2] : raw;
  const penalty = isPenaltyEventBody(body);
  const parsed = penalty ? parsePenaltyEventBody(body) : parseGoalEventBody(body);

  return {
    raw: raw,
    time: time,
    body: body,
    type: penalty ? "penalty" : parsed.type,
    team: parsed.team,
    player: parsed.player,
    assists: parsed.assists || [],
    tags: parsed.tags || [],
    penalty: parsed.penalty || "",
    pim: parsed.pim || 0
  };
}

function isPenaltyEventBody(body) {
  return /^UTV\s+/i.test(body) || /\b(?:2|4|5|10)\s*min\b/i.test(body);
}

function parsePenaltyEventBody(body) {
  const clean = body.replace(/^UTV\s+/i, "");
  const parts = clean.split(/\s+-\s+/);
  const team = normalizeText(parts.shift() || "");
  const detail = normalizeText(parts.join(" - "));
  const pimMatch = detail.match(/\b(\d+)\s*min\b/i);
  const pim = pimMatch ? toNumber(pimMatch[1]) : 0;
  const penaltyStart = findPenaltyTextStart(detail);
  const player = penaltyStart > 0 ? detail.slice(0, penaltyStart).trim() : detail.replace(/\b\d+\s*min\b/i, "").trim();
  const penalty = penaltyStart > 0 ? detail.slice(penaltyStart).replace(/\b\d+\s*min\b/i, "").trim() : "";

  return {
    type: "penalty",
    team: team,
    player: player,
    penalty: penalty,
    pim: pim
  };
}

function findPenaltyTextStart(detail) {
  const lower = detail.toLowerCase();
  const penalties = [
    "checking from behind",
    "cross-checking",
    "interference",
    "tripping",
    "slashing",
    "boarding",
    "charging",
    "roughing",
    "holding",
    "hooking",
    "elbowing",
    "fighting"
  ];
  const indexes = penalties.map(function(value) {
    return lower.indexOf(value);
  }).filter(function(index) {
    return index > 0;
  });

  return indexes.length ? Math.min.apply(null, indexes) : -1;
}

function parseGoalEventBody(body) {
  const parts = body.split(/\s+-\s+/);
  if (parts.length < 2) {
    return {
      type: "note",
      team: "",
      player: "",
      assists: [],
      tags: [],
      body: body
    };
  }

  const team = normalizeText(parts.shift() || "");
  const detail = normalizeText(parts.join(" - "));
  const tags = getGoalTags(detail);
  const assistMatches = Array.from(detail.matchAll(/\(([^)]*)\)/g))
    .map(function(match) { return normalizeText(match[1]); })
    .filter(function(value) {
      return value && !isGoalTag(value);
    });
  const assists = assistMatches.length ? assistMatches[0].split(",").map(normalizeText).filter(Boolean) : [];
  const scorer = normalizeText(detail
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:PP|SH|EN|OT|GWG)\b/gi, " ")
  );

  return {
    type: "goal",
    team: team,
    player: scorer,
    assists: assists,
    tags: tags
  };
}

function getGoalTags(detail) {
  const tags = [];
  const upper = String(detail || "").toUpperCase();
  ["PP", "SH", "EN", "OT", "GWG"].forEach(function(tag) {
    if (new RegExp("\\b" + tag + "\\b").test(upper)) {
      tags.push(tag);
    }
  });
  return tags;
}

function isGoalTag(value) {
  return /^(PP|SH|EN|OT|GWG)$/i.test(value);
}

function incrementMatchPlayerStat(playerStats, playerName, teamName, field, amount) {
  const player = normalizeText(playerName);
  if (!player) {
    return;
  }

  const key = createTeamKey(teamName) + "|" + normalizeLookupKey(player);
  if (!playerStats.has(key)) {
    playerStats.set(key, {
      player: player,
      team: teamName,
      g: 0,
      a: 0,
      pts: 0,
      pim: 0
    });
  }

  const row = playerStats.get(key);
  row[field] += amount;
  row.pts = row.g + row.a;
}

function getMatchPlayerRows(playerStats) {
  return Array.from(playerStats.values()).sort(function(a, b) {
    return b.pts - a.pts || b.g - a.g || b.a - a.a || b.pim - a.pim || a.player.localeCompare(b.player, "sv");
  });
}

function getMatchPlayerGroupsForRender(cup, match, playerStats) {
  if (hasMatchSideRows(match.playerStats)) {
    return getStoredMatchStatGroups(match, match.playerStats, compareMatchPlayerRows);
  }

  return getMatchTeamPlayerGroups(cup, match, playerStats);
}

function getMatchGoalieGroupsForRender(cup, match) {
  if (hasMatchSideRows(match.goalieStats)) {
    return getStoredMatchStatGroups(match, match.goalieStats, compareMatchGoalieRows);
  }

  return getFallbackMatchGoalieGroups(cup, match);
}

function hasMatchSideRows(stats) {
  return Boolean(stats && ((stats.away && stats.away.length) || (stats.home && stats.home.length)));
}

function getStoredMatchStatGroups(match, stats, sorter) {
  const sides = [
    { team: match.awayTeam, rows: stats?.away || [] },
    { team: match.homeTeam, rows: stats?.home || [] }
  ];

  return sides.map(function(side) {
    return {
      team: side.team,
      rows: side.rows.slice().sort(sorter)
    };
  });
}

function getFallbackMatchGoalieGroups(cup, match) {
  const shots = getMatchShots(match);
  const sides = [
    {
      team: match.awayTeam,
      sa: shots ? shots.home : null,
      ga: toNullableNumber(match.homeScore)
    },
    {
      team: match.homeTeam,
      sa: shots ? shots.away : null,
      ga: toNullableNumber(match.awayScore)
    }
  ];

  return sides.map(function(side) {
    const goalie = findLikelyCupGoalieForTeam(cup, side.team, match.stage);
    const sa = toNullableNumber(side.sa);
    const ga = toNullableNumber(side.ga);
    const sv = sa === null || ga === null ? null : Math.max(0, sa - ga);

    return {
      team: side.team,
      rows: goalie ? [{
        player: goalie.player,
        displayName: goalie.displayName,
        countryCode: goalie.countryCode,
        playerId: goalie.playerId,
        team: side.team,
        sa: sa,
        ga: ga,
        sv: sv,
        svp: sa && sv !== null ? sv / sa : null
      }] : []
    };
  });
}

function findLikelyCupGoalieForTeam(cup, teamName, stage) {
  const teamKey = createTeamKey(teamName);
  const preferredStage = stage === "playoffs" ? "playoffs" : "group";
  const rows = cup.goalieStats[preferredStage]
    .concat(cup.goalieStats.group)
    .concat(cup.goalieStats.playoffs)
    .filter(function(row) {
      return createTeamKey(row.team) === teamKey;
    });

  const seen = new Set();
  return rows.filter(function(row) {
    const key = row.playerId || normalizeLookupKey(row.player);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).sort(function(a, b) {
    return safeNumber(b.gp) - safeNumber(a.gp) ||
      safeNumber(b.sv) - safeNumber(a.sv) ||
      safeNumber(b.svp) - safeNumber(a.svp) ||
      a.player.localeCompare(b.player, "sv");
  })[0] || null;
}

function getMatchTeamPlayerGroups(cup, match, playerStats) {
  const teams = [match.awayTeam, match.homeTeam];
  const groups = teams.map(function(teamName) {
    return {
      team: teamName,
      rows: []
    };
  });

  Array.from(playerStats.values()).forEach(function(row) {
    const matchingTeam = teams.find(function(teamName) {
      return createTeamKey(teamName) === createTeamKey(row.team);
    });
    if (!matchingTeam) {
      return;
    }

    const playerName = normalizeText(row.player);
    if (!playerName) {
      return;
    }

    const player = findPlayerByNameAndTeam(playerName, row.team);
    const group = groups.find(function(entry) {
      return createTeamKey(entry.team) === createTeamKey(matchingTeam);
    });
    if (!group) {
      return;
    }

    group.rows.push({
      player: playerName,
      displayName: player?.name || playerName,
      rawName: player?.rawName || playerName,
      team: row.team,
      countryCode: player?.countryCode || "",
      playerId: player?.id || "",
      g: row.g || 0,
      a: row.a || 0,
      pts: row.pts || 0,
      pim: row.pim || 0
    });
  });

  groups.forEach(function(group) {
    group.rows.sort(compareMatchPlayerRows);
  });

  return groups;
}

function getMatchEventPlayerRow(playerStats, playerName, teamName) {
  const playerKey = normalizeLookupKey(playerName);
  const teamKey = createTeamKey(teamName);

  return Array.from(playerStats.values()).find(function(row) {
    return createTeamKey(row.team) === teamKey && normalizeLookupKey(row.player) === playerKey;
  }) || null;
}

function compareMatchPlayerRows(a, b) {
  return b.pts - a.pts || b.g - a.g || b.a - a.a || b.pim - a.pim || a.player.localeCompare(b.player, "sv");
}

function compareMatchGoalieRows(a, b) {
  const aSvp = a.svp === null || typeof a.svp === "undefined" ? -1 : a.svp;
  const bSvp = b.svp === null || typeof b.svp === "undefined" ? -1 : b.svp;
  return bSvp - aSvp || safeNumber(a.gaa) - safeNumber(b.gaa) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
}

function renderMatchTeamPlayerStats(groups) {
  return `
    <div class="match-team-stats-grid">
      ${groups.map(function(group) {
        return `
          <section class="match-team-stats">
            <div class="match-team-stats-head">
              ${renderTeamLogo(group.team, "team-logo-md")}
              <h3>${escapeHtml(group.team)}</h3>
            </div>
            ${renderStatsTable(
              [
                { key: "player", label: "Spelare" },
                { key: "g", label: "G", type: "number" },
                { key: "a", label: "A", type: "number" },
                { key: "pts", label: "PTS", type: "number" },
                { key: "pim", label: "PIM", type: "number" }
              ],
              group.rows.map(function(row) {
                return {
                  player: createMatchPlayerCell(row),
                  g: row.g,
                  a: row.a,
                  pts: row.pts,
                  pim: row.pim
                };
              })
            )}
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderMatchTeamGoalieStats(groups) {
  return `
    <div class="match-team-stats-grid">
      ${groups.map(function(group) {
        return `
          <section class="match-team-stats">
            <div class="match-team-stats-head">
              ${renderTeamLogo(group.team, "team-logo-md")}
              <h3>${escapeHtml(group.team)}</h3>
            </div>
            ${renderStatsTable(
              [
                { key: "player", label: "Målvakt" },
                { key: "sa", label: "SA", type: "number" },
                { key: "ga", label: "GA", type: "number" },
                { key: "sv", label: "SV", type: "number" },
                { key: "svp", label: "SV%", type: "number" }
              ],
              group.rows.map(function(row) {
                return {
                  player: createMatchPlayerCell(row),
                  sa: formatNullableStat(row.sa),
                  ga: formatNullableStat(row.ga),
                  sv: formatNullableStat(row.sv),
                  svp: row.svp === null || typeof row.svp === "undefined" ? "-" : row.svp.toFixed(3)
                };
              })
            )}
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function formatNullableStat(value) {
  return value === null || typeof value === "undefined" ? "-" : value;
}

function createMatchPlayerCell(row) {
  const player = row.playerId
    ? state.players.find(function(entry) { return entry.key === "player-" + row.playerId; })
    : findPlayerByNameAndTeam(row.displayName || row.player, row.team);
  const label = escapeHtml(row.displayName || row.player);

  if (!player) {
    return createCellValue(`
      <span class="player-inline-link is-static">
        ${renderFlag(row.countryCode)}
        <span>${label}</span>
      </span>
    `, row.player);
  }

  return createCellValue(`
    <a class="player-inline-link" href="#/player/${encodeURIComponent(player.key)}">
      ${renderFlag(row.countryCode || player.countryCode)}
      <span>${label}</span>
    </a>
  `, row.player);
}

function findPlayerByNameAndTeam(playerName, teamName) {
  const playerKey = normalizeLookupKey(playerName);
  const teamKey = createTeamKey(teamName);

  return state.players.find(function(player) {
    const sameName = normalizeLookupKey(getDisplayPlayerName(player)) === playerKey ||
      normalizeLookupKey(player.rawName || player.name || "") === playerKey;
    if (!sameName) {
      return false;
    }

    return Array.from(player.teamNames || []).some(function(name) {
      return createTeamKey(name) === teamKey;
    });
  }) || null;
}

function renderTeamsIndex() {
  return `
    <section class="section-header-block">
      <p class="eyebrow">Lagregister</p>
      <h1 class="page-title">Alla lag</h1>
      <p class="page-intro">Klicka in pa ett lag for att se cuper, matcher och spelare.</p>
    </section>
    <section class="entity-grid">
      ${state.teams.map(renderTeamCard).join("")}
    </section>
  `;
}

function renderTeamPage(team, cup) {
  const rawPlayerRows = cup ? team.playerRows.filter(function(row) { return row.cupId === cup.id; }) : team.playerRows;
  const rawGoalieRows = cup ? team.goalieRows.filter(function(row) { return row.cupId === cup.id; }) : team.goalieRows;
  const playerRows = cup ? aggregateTeamPlayerRows(rawPlayerRows) : rawPlayerRows;
  const goalieRows = cup ? aggregateTeamGoalieRows(rawGoalieRows) : rawGoalieRows;
  const matches = (cup ? team.matches.filter(function(match) { return match.cupId === cup.id; }) : team.matches).slice().sort(compareTeamMatchRowsDesc);
  const wins = matches.filter(function(match) { return toNumber(match.goalsFor) > toNumber(match.goalsAgainst); }).length;
  const losses = matches.filter(function(match) { return toNumber(match.goalsFor) < toNumber(match.goalsAgainst) && !match.overtime; }).length;
  const goalsFor = sumBy(matches, "goalsFor");
  const goalsAgainst = sumBy(matches, "goalsAgainst");
  const topScorers = playerRows
    .slice()
    .sort(function(a, b) {
      return b.pts - a.pts || b.g - a.g || a.player.localeCompare(b.player, "sv");
    });
  const sortedGoalies = goalieRows
    .slice()
    .sort(function(a, b) {
      return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(a.gaa) - safeNumber(b.gaa) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
    });

  return `
    <section class="section-header-block ${cup && getCupCategory(cup) === "sommar" ? "is-sommar" : ""}">
      <div class="breadcrumbs">
        <a href="#/">Start</a>
        <span>/</span>
        ${cup ? `<a href="#/cup/${encodeURIComponent(cup.id)}">${escapeHtml(cup.code)}</a>` : `<a href="#/teams">Lag</a>`}
        <span>/</span>
        <strong>${escapeHtml(team.name)}</strong>
      </div>
      <div class="team-page-heading">
        ${renderTeamLogo(team.name, "team-logo-lg")}
        <div>
          <p class="eyebrow">${cup ? escapeHtml(cup.code) : "Lagprofil"}</p>
          <h1 class="page-title">${escapeHtml(team.name)}</h1>
          <p class="page-intro">${cup ? "Spelare och matcher fran just den har cupen." : "Matcher, cuper och spelarproduktion for laget."}</p>
        </div>
      </div>
    </section>

    <section class="detail-grid">
      <article class="detail-card hero-stat-card"><span class="detail-label">${cup ? "Cup" : "Cuper"}</span><strong>${cup ? escapeHtml(cup.code) : team.cups.length}</strong></article>
      <article class="detail-card hero-stat-card"><span class="detail-label">Vinster</span><strong>${cup ? wins : team.wins}</strong></article>
      <article class="detail-card hero-stat-card"><span class="detail-label">Mal for</span><strong>${cup ? goalsFor : team.goalsFor}</strong></article>
      <article class="detail-card hero-stat-card"><span class="detail-label">Mal emot</span><strong>${cup ? goalsAgainst : team.goalsAgainst}</strong></article>
    </section>

    <section class="team-tabs-shell">
      <div class="team-tabs" role="tablist" aria-label="Lagflikar">
        <button class="team-tab is-active" type="button" role="tab" aria-selected="true" data-team-tab="roster">Laguppställning</button>
        <button class="team-tab" type="button" role="tab" aria-selected="false" data-team-tab="matches">Alla matcher</button>
        <button class="team-tab" type="button" role="tab" aria-selected="false" data-team-tab="stats">Statistik</button>
        <button class="team-tab" type="button" role="tab" aria-selected="false" data-team-tab="history">Historisk statistik</button>
      </div>

      <div class="team-tab-panels">
        <section class="team-tab-panel is-active" data-team-panel="roster" role="tabpanel">
          ${renderTeamRosterPanel(team, playerRows, goalieRows, cup)}
        </section>
        <section class="team-tab-panel" data-team-panel="matches" role="tabpanel" hidden>
          ${renderTeamMatchesPanel(matches, cup)}
        </section>
        <section class="team-tab-panel" data-team-panel="stats" role="tabpanel" hidden>
          ${renderTeamStatsPanel(cup ? rawPlayerRows : topScorers, cup ? rawGoalieRows : sortedGoalies, cup)}
        </section>
        <section class="team-tab-panel" data-team-panel="history" role="tabpanel" hidden>
          ${renderTeamHistoryPanel(team)}
        </section>
      </div>
    </section>
  `;
}

function renderTeamRosterPanel(team, playerRows, goalieRows, cup) {
  const rosterRows = buildTeamRosterRows(playerRows, goalieRows).sort(function(a, b) {
    return getRosterRoleOrder(a.role) - getRosterRoleOrder(b.role) ||
      safeNumber(b.pts) - safeNumber(a.pts) ||
      safeNumber(b.sv) - safeNumber(a.sv) ||
      a.player.localeCompare(b.player, "sv");
  });

  return `
    <article class="detail-card">
      <div class="section-heading compact">
        <p class="eyebrow">${cup ? escapeHtml(cup.code) : "Laguppställning"}</p>
        <h2>${escapeHtml(team.name)} roster</h2>
      </div>
      ${rosterRows.length ? `
        <div class="team-roster-grid">
          ${rosterRows.map(renderTeamRosterCard).join("")}
        </div>
      ` : `<div class="empty-state">Inga spelare hittades.</div>`}
    </article>
  `;
}

function buildTeamRosterRows(playerRows, goalieRows) {
  const map = new Map();

  playerRows.forEach(function(row) {
    const key = row.playerId || normalizeLookupKey(row.player);
    if (!map.has(key)) {
      map.set(key, {
        player: row.player,
        displayName: row.displayName,
        countryCode: row.countryCode,
        playerId: row.playerId,
        role: "Utespelare",
        gp: 0,
        g: 0,
        a: 0,
        pts: 0,
        pim: 0,
        shots: 0,
        goalieGp: 0,
        sv: 0,
        sa: 0,
        ga: 0,
        svp: null
      });
    }

    const target = map.get(key);
    target.gp += toNumber(row.gp);
    target.g += toNumber(row.g);
    target.a += toNumber(row.a);
    target.pts += toNumber(row.pts);
    target.pim += toNumber(row.pim);
    target.shots += toNumber(row.shots);
  });

  goalieRows.forEach(function(row) {
    const key = row.playerId || normalizeLookupKey(row.player);
    if (!map.has(key)) {
      map.set(key, {
        player: row.player,
        displayName: row.displayName,
        countryCode: row.countryCode,
        playerId: row.playerId,
        role: "Målvakt",
        gp: 0,
        g: 0,
        a: 0,
        pts: 0,
        pim: 0,
        shots: 0,
        goalieGp: 0,
        sv: 0,
        sa: 0,
        ga: 0,
        svp: null
      });
    }

    const target = map.get(key);
    target.role = target.gp > 0 ? "Utespelare/Målvakt" : "Målvakt";
    target.goalieGp += toNumber(row.gp);
    target.sv += toNumber(row.sv);
    target.sa += toNumber(row.sa);
    target.ga += toNumber(row.ga);
  });

  return Array.from(map.values()).map(function(row) {
    row.svp = row.sa > 0 ? row.sv / row.sa : null;
    return row;
  });
}

function getRosterRoleOrder(role) {
  if (role === "Målvakt") {
    return 2;
  }
  if (role === "Utespelare/Målvakt") {
    return 1;
  }
  return 0;
}

function renderTeamRosterCard(row) {
  const player = getPlayerForRosterRow(row);
  const href = player ? "#/player/" + encodeURIComponent(player.key) : "";
  const content = `
    ${renderPlayerPortrait(player || row, "player-portrait-card")}
    <span class="team-roster-card-body">
      <span class="team-roster-card-name">${renderFlag(row.countryCode || player?.countryCode)}${escapeHtml(row.displayName || row.player)}</span>
      <span class="team-roster-card-role">${escapeHtml(row.role)}</span>
      <span class="team-roster-card-stats">
        ${row.gp ? `<span>GP ${row.gp}</span><span>PTS ${row.pts}</span>` : ""}
        ${row.goalieGp ? `<span>G ${row.goalieGp}</span><span>SV% ${formatPercentage(row.svp)}</span>` : ""}
      </span>
    </span>
  `;

  return href
    ? `<a class="team-roster-card" href="${href}">${content}</a>`
    : `<div class="team-roster-card">${content}</div>`;
}

function getPlayerForRosterRow(row) {
  if (row.playerId) {
    return state.players.find(function(player) {
      return player.key === "player-" + row.playerId;
    }) || null;
  }
  return findPlayerByNameAndTeam(row.displayName || row.player, row.team || "");
}

function renderTeamMatchesPanel(matches, cup) {
  return `
    <article class="detail-card">
      <div class="section-heading compact">
        <p class="eyebrow">${cup ? escapeHtml(cup.code) : "Alla cuper"}</p>
        <h2>Alla matcher</h2>
      </div>
      <div class="simple-list">
        ${matches.length ? matches.map(function(match) {
          const label = `${escapeHtml(match.cupCode)}: ${displayScore(match.goalsFor)}-${displayScore(match.goalsAgainst)} mot ${escapeHtml(match.opponent)}`;
          return match.matchId
            ? `<a class="simple-list-item match-list-link" href="#/match/${encodeURIComponent(match.cupId)}/${encodeURIComponent(match.matchId)}"><span>${escapeHtml(match.stage === "playoffs" ? "Slutspel" : "Gruppspel")}</span><strong>${label}</strong></a>`
            : `<div class="simple-list-item">${label}</div>`;
        }).join("") : `<div class="empty-state">Inga matcher hittades.</div>`}
      </div>
    </article>
  `;
}

function renderTeamStatsPanel(playerRows, goalieRows, cup) {
  if (cup) {
    const stages = [
      { key: "all", label: "Totalt", title: "Totalt i cupen", playerRows: playerRows, goalieRows: goalieRows },
      {
        key: "group",
        label: "Gruppspel",
        title: "Gruppspel",
        playerRows: playerRows.filter(function(row) { return row.stage !== "playoffs"; }),
        goalieRows: goalieRows.filter(function(row) { return row.stage !== "playoffs"; })
      },
      {
        key: "playoffs",
        label: "Slutspel",
        title: "Slutspel",
        playerRows: playerRows.filter(function(row) { return row.stage === "playoffs"; }),
        goalieRows: goalieRows.filter(function(row) { return row.stage === "playoffs"; })
      }
    ];

    return `
      <div class="team-stat-shell" data-team-stat-shell>
        <div class="team-stat-controls" role="tablist" aria-label="Välj statistikfas">
          ${stages.map(function(stage, index) {
            return `
              <button
                class="stat-filter-button ${index === 0 ? "is-active" : ""}"
                type="button"
                role="tab"
                aria-selected="${index === 0 ? "true" : "false"}"
                data-team-stat-stage="${stage.key}"
              >${stage.label}</button>
            `;
          }).join("")}
        </div>
        ${stages.map(function(stage, index) {
          const sortedPlayers = aggregateTeamPlayerRows(stage.playerRows).sort(compareTeamPlayerStatsRows);
          const sortedGoalies = aggregateTeamGoalieRows(stage.goalieRows).sort(compareTeamGoalieStatsRows);

          return `
            <div class="team-stats-stage-panel ${index === 0 ? "is-active" : ""}" data-team-stat-panel="${stage.key}" ${index === 0 ? "" : "hidden"}>
              <div class="team-stats-grid">
                <article class="detail-card">
                  <div class="section-heading compact">
                    <p class="eyebrow">Spelare</p>
                    <h2>${escapeHtml(stage.title)}</h2>
                  </div>
                  ${sortedPlayers.length ? renderTeamPlayerStatsTable(sortedPlayers, true) : `<div class="empty-state">Ingen spelarstatistik finns.</div>`}
                </article>
                <article class="detail-card">
                  <div class="section-heading compact">
                    <p class="eyebrow">Målvakter</p>
                    <h2>${escapeHtml(stage.title)}</h2>
                  </div>
                  ${sortedGoalies.length ? renderTeamGoalieStatsTable(sortedGoalies, true) : `<div class="empty-state">Ingen målvaktsstatistik finns.</div>`}
                </article>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  return `
    <div class="team-stats-grid">
      <article class="detail-card">
        <div class="section-heading compact">
          <p class="eyebrow">Spelare</p>
          <h2>${cup ? "Statistik i cupen" : "Spelarstatistik"}</h2>
        </div>
        ${renderTeamPlayerStatsTable(playerRows, Boolean(cup))}
      </article>
      <article class="detail-card">
        <div class="section-heading compact">
          <p class="eyebrow">Målvakter</p>
          <h2>${cup ? "Målvakter i cupen" : "Målvaktsstatistik"}</h2>
        </div>
        ${renderTeamGoalieStatsTable(goalieRows, Boolean(cup))}
      </article>
    </div>
  `;
}

function compareTeamPlayerStatsRows(a, b) {
  return safeNumber(b.pts) - safeNumber(a.pts) ||
    safeNumber(b.g) - safeNumber(a.g) ||
    safeNumber(b.a) - safeNumber(a.a) ||
    a.player.localeCompare(b.player, "sv");
}

function compareTeamGoalieStatsRows(a, b) {
  return safeNumber(b.svp) - safeNumber(a.svp) ||
    safeNumber(a.gaa) - safeNumber(b.gaa) ||
    safeNumber(b.sv) - safeNumber(a.sv) ||
    a.player.localeCompare(b.player, "sv");
}

function renderTeamHistoryPanel(team) {
  const historicalPlayers = aggregateTeamPlayerRows(team.playerRows).sort(function(a, b) {
    return b.pts - a.pts || b.g - a.g || a.player.localeCompare(b.player, "sv");
  });
  const historicalGoalies = aggregateTeamGoalieRows(team.goalieRows).sort(function(a, b) {
    return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(a.gaa) - safeNumber(b.gaa) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
  });
  const allRoster = buildTeamRosterRows(historicalPlayers, historicalGoalies).sort(compareTeamRosterHistoryRows);

  return `
    ${renderTeamHistorySummary(team, historicalPlayers, historicalGoalies)}
    <article class="detail-card">
      <div class="section-heading compact">
        <p class="eyebrow">Historik</p>
        <h2>Alla spelare som spelat i ${escapeHtml(team.name)}</h2>
      </div>
      ${allRoster.length ? `<div class="team-roster-grid is-compact">${allRoster.map(renderTeamRosterCard).join("")}</div>` : `<div class="empty-state">Ingen historik hittades.</div>`}
    </article>
    ${renderTeamHistoryStatsByStage(team)}
  `;
}

function renderTeamHistoryStatsByStage(team) {
  const stages = [
    { key: "all", label: "Totalt", title: "All-time", playerRows: team.playerRows, goalieRows: team.goalieRows },
    {
      key: "group",
      label: "Gruppspel",
      title: "Gruppspel all-time",
      playerRows: team.playerRows.filter(function(row) { return row.stage !== "playoffs"; }),
      goalieRows: team.goalieRows.filter(function(row) { return row.stage !== "playoffs"; })
    },
    {
      key: "playoffs",
      label: "Slutspel",
      title: "Slutspel all-time",
      playerRows: team.playerRows.filter(function(row) { return row.stage === "playoffs"; }),
      goalieRows: team.goalieRows.filter(function(row) { return row.stage === "playoffs"; })
    }
  ];

  return `
    <div class="team-stat-shell" data-team-history-stat-shell>
      <div class="team-stat-controls" role="tablist" aria-label="Välj historikfas">
        ${stages.map(function(stage, index) {
          return `
            <button
              class="stat-filter-button ${index === 0 ? "is-active" : ""}"
              type="button"
              role="tab"
              aria-selected="${index === 0 ? "true" : "false"}"
              data-team-history-stat-stage="${stage.key}"
            >${stage.label}</button>
          `;
        }).join("")}
      </div>
      ${stages.map(function(stage, index) {
        const players = aggregateTeamPlayerRows(stage.playerRows).sort(compareTeamPlayerStatsRows);
        const goalies = aggregateTeamGoalieRows(stage.goalieRows).sort(compareTeamGoalieStatsRows);

        return `
          <div class="team-stats-stage-panel ${index === 0 ? "is-active" : ""}" data-team-history-stat-panel="${stage.key}" ${index === 0 ? "" : "hidden"}>
            <div class="team-stats-grid">
              <article class="detail-card">
                <div class="section-heading compact">
                  <p class="eyebrow">${escapeHtml(stage.title)}</p>
                  <h2>Utespelare</h2>
                </div>
                ${players.length ? renderTeamPlayerStatsTable(players, true) : `<div class="empty-state">Ingen spelarstatistik finns.</div>`}
              </article>
              <article class="detail-card">
                <div class="section-heading compact">
                  <p class="eyebrow">${escapeHtml(stage.title)}</p>
                  <h2>Målvakter</h2>
                </div>
                ${goalies.length ? renderTeamGoalieStatsTable(goalies, true) : `<div class="empty-state">Ingen målvaktsstatistik finns.</div>`}
              </article>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderTeamHistorySummary(team, historicalPlayers, historicalGoalies) {
  const cups = getTeamHistoryCups(team);
  const placements = getTeamHistoryPlacements(team, cups);
  const topPlayers = historicalPlayers.slice().sort(function(a, b) {
    return safeNumber(b.pts) - safeNumber(a.pts) ||
      safeNumber(b.g) - safeNumber(a.g) ||
      safeNumber(b.gp) - safeNumber(a.gp) ||
      a.player.localeCompare(b.player, "sv");
  }).slice(0, 3);
  const topGoalies = historicalGoalies.slice().sort(function(a, b) {
    return safeNumber(b.gp) - safeNumber(a.gp) ||
      safeNumber(b.sv) - safeNumber(a.sv) ||
      safeNumber(b.svp) - safeNumber(a.svp) ||
      a.player.localeCompare(b.player, "sv");
  }).slice(0, 3);
  const cupList = cups.map(function(cup) {
    return renderCupLink(cup.id, cup.code);
  }).join(", ");
  const placementText = placements.length
    ? placements.map(function(entry) { return entry.text; }).join(", ")
    : "Inga registrerade finalplaceringar.";
  const recordText = team.matches.length
    ? `${team.matches.length} matcher, ${team.wins} vinster och ${team.goalsFor}-${team.goalsAgainst} i målskillnad.`
    : "Matchhistorik saknas i arkivet.";

  return `
    <article class="detail-card team-history-summary-card">
      <div class="section-heading compact">
        <p class="eyebrow">Lagets historik</p>
        <h2>${escapeHtml(team.name)} i SEC</h2>
      </div>
      <div class="team-history-summary-grid">
        <div class="team-history-summary-block is-wide">
          <h3>Cuper och resultat</h3>
          <p>Laget har deltagit i <strong>${cups.length}</strong> ${cups.length === 1 ? "cup" : "cuper"}: ${cupList || "inga cuper hittades"}.</p>
          <p>${placementText}</p>
          <p>${escapeHtml(recordText)}</p>
        </div>
        <div class="team-history-summary-block">
          <h3>Bästa utespelare</h3>
          ${renderTeamHistoryPlayerList(topPlayers)}
        </div>
        <div class="team-history-summary-block">
          <h3>Bästa målvakter</h3>
          ${renderTeamHistoryGoalieList(topGoalies)}
        </div>
      </div>
    </article>
  `;
}

function compareTeamRosterHistoryRows(a, b) {
  const aGames = safeNumber(a.gp) + safeNumber(a.goalieGp);
  const bGames = safeNumber(b.gp) + safeNumber(b.goalieGp);
  return bGames - aGames ||
    safeNumber(b.pts) - safeNumber(a.pts) ||
    safeNumber(b.sv) - safeNumber(a.sv) ||
    String(a.player || "").localeCompare(String(b.player || ""), "sv");
}

function getTeamHistoryCups(team) {
  const cupIds = new Set();
  team.cups.forEach(function(cup) {
    if (cup.id) {
      cupIds.add(String(cup.id));
    }
  });
  team.matches.forEach(function(match) {
    if (match.cupId) {
      cupIds.add(String(match.cupId));
    }
  });
  team.playerRows.concat(team.goalieRows).forEach(function(row) {
    if (row.cupId) {
      cupIds.add(String(row.cupId));
    }
  });

  return Array.from(cupIds).map(function(cupId) {
    const cup = state.cups.find(function(entry) { return String(entry.id) === cupId; });
    return cup || { id: cupId, code: getCupCode(cupId), sortOrder: inferSortOrder(cupId) };
  }).sort(function(a, b) {
    return inferSortOrder(a.id) - inferSortOrder(b.id);
  });
}

function getTeamHistoryPlacements(team, cups) {
  const teamKey = createTeamKey(team.name);

  return cups.map(function(cup) {
    const winner = createTeamKey(cup.winner || "");
    const runnerUp = createTeamKey(cup.runnerUp || "");

    if (winner && winner === teamKey) {
      return {
        rank: 1,
        text: `<strong>Mästare</strong> i ${renderCupLink(cup.id, cup.code)}`
      };
    }
    if (runnerUp && runnerUp === teamKey) {
      return {
        rank: 2,
        text: `<strong>Finalist</strong> i ${renderCupLink(cup.id, cup.code)}`
      };
    }
    return null;
  }).filter(Boolean).sort(function(a, b) {
    return a.rank - b.rank;
  });
}

function renderTeamHistoryPlayerList(rows) {
  if (!rows.length) {
    return `<p>Ingen utespelarstatistik hittades.</p>`;
  }

  return `
    <ol class="team-history-mini-list">
      ${rows.map(function(row) {
        return `
          <li>
            <span>${createPlayerCell(row).display}</span>
            <strong>${toNumber(row.pts)} PTS</strong>
            <small>${toNumber(row.gp)} GP, ${toNumber(row.g)} G, ${toNumber(row.a)} A</small>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

function renderTeamHistoryGoalieList(rows) {
  if (!rows.length) {
    return `<p>Ingen målvaktsstatistik hittades.</p>`;
  }

  return `
    <ol class="team-history-mini-list">
      ${rows.map(function(row) {
        return `
          <li>
            <span>${createPlayerCell(row).display}</span>
            <strong>${toNumber(row.gp)} GP</strong>
            <small>${formatPercentage(row.svp)} SV%, ${toNumber(row.sv)} SV</small>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

function renderTeamPlayerStatsTable(rows, hideCup) {
  const sortedRows = rows.slice().sort(function(a, b) {
    return b.pts - a.pts || b.g - a.g || a.player.localeCompare(b.player, "sv");
  });

  return renderStatsTable(
    [
      { key: "player", label: "Spelare" },
      hideCup ? null : { key: "cup", label: "Cup" },
      { key: "gp", label: "GP", type: "number" },
      { key: "g", label: "G", type: "number" },
      { key: "a", label: "A", type: "number" },
      { key: "pts", label: "PTS", type: "number" },
      { key: "shots", label: "S", type: "number" },
      { key: "pim", label: "PIM", type: "number" }
    ].filter(Boolean),
    sortedRows.map(function(row) {
      return {
        player: createPlayerCell(row),
        cup: createCellValue(renderCupLink(row.cupId, row.cupCode), row.cupCode),
        gp: row.gp,
        g: row.g,
        a: row.a,
        pts: row.pts,
        shots: row.shots,
        pim: row.pim
      };
    })
  );
}

function renderTeamGoalieStatsTable(rows, hideCup) {
  const sortedRows = rows.slice().sort(function(a, b) {
    return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(a.gaa) - safeNumber(b.gaa) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
  });

  return renderStatsTable(
    [
      { key: "player", label: "Målvakt" },
      hideCup ? null : { key: "cup", label: "Cup" },
      { key: "gp", label: "GP", type: "number" },
      { key: "sa", label: "SA", type: "number" },
      { key: "ga", label: "GA", type: "number" },
      { key: "sv", label: "SV", type: "number" },
      { key: "svp", label: "SV%", type: "number" },
      { key: "gaa", label: "GAA", type: "number" },
      { key: "so", label: "SO", type: "number" }
    ].filter(Boolean),
    sortedRows.map(function(row) {
      return {
        player: createPlayerCell(row),
        cup: createCellValue(renderCupLink(row.cupId, row.cupCode), row.cupCode),
        gp: row.gp,
        sa: row.sa,
        ga: row.ga,
        sv: row.sv,
        svp: createCellValue(formatPercentage(row.svp), normalizePercentageForSort(row.svp)),
        gaa: createCellValue(formatDecimal(row.gaa), safeNumber(row.gaa)),
        so: row.so
      };
    })
  );
}

function aggregateTeamPlayerRows(rows) {
  const map = new Map();

  rows.forEach(function(row) {
    const key = row.playerId || normalizeLookupKey(row.player);
    if (!map.has(key)) {
      map.set(key, {
        cupId: row.cupId,
        cupCode: row.cupCode,
        player: row.player,
        displayName: row.displayName,
        countryCode: row.countryCode,
        playerId: row.playerId,
        gp: 0,
        g: 0,
        a: 0,
        pts: 0,
        pim: 0,
        shots: 0
      });
    }

    const target = map.get(key);
    target.gp += toNumber(row.gp);
    target.g += toNumber(row.g);
    target.a += toNumber(row.a);
    target.pts += toNumber(row.pts);
    target.pim += toNumber(row.pim);
    target.shots += toNumber(row.shots);
  });

  return Array.from(map.values());
}

function aggregateTeamGoalieRows(rows) {
  const map = new Map();

  rows.forEach(function(row) {
    const key = row.playerId || normalizeLookupKey(row.player);
    if (!map.has(key)) {
      map.set(key, {
        cupId: row.cupId,
        cupCode: row.cupCode,
        player: row.player,
        displayName: row.displayName,
        countryCode: row.countryCode,
        playerId: row.playerId,
        gp: 0,
        sa: 0,
        ga: 0,
        sv: 0,
        gaa: 0,
        svp: null,
        so: 0
      });
    }

    const target = map.get(key);
    target.gp += toNumber(row.gp);
    target.sa += toNumber(row.sa);
    target.ga += toNumber(row.ga);
    target.sv += toNumber(row.sv);
    target.so += toNumber(row.so);
  });

  return Array.from(map.values()).map(function(row) {
    row.svp = row.sa > 0 ? row.sv / row.sa : null;
    row.gaa = row.gp > 0 ? row.ga / row.gp : 0;
    return row;
  });
}

function renderPlayersIndex() {
  const topPlayers = state.players
    .slice()
    .sort(function(a, b) {
      return b.totals.pts - a.totals.pts || a.name.localeCompare(b.name, "sv");
    });
  const countries = uniqueStrings(topPlayers.map(function(player) {
    return String(player.countryCode || "").trim().toUpperCase();
  }).filter(Boolean)).sort(function(a, b) {
    return a.localeCompare(b, "sv");
  });

  return `
    <section class="section-header-block">
      <p class="eyebrow">Spelarregister</p>
      <h1 class="page-title">Alla spelare</h1>
      <p class="page-intro">Klicka pa en spelare for att se total statistik och laghistorik.</p>
    </section>
    <section class="detail-card player-index-card">
      <div class="player-index-controls" data-player-index-controls>
        <label>
          <span>Sok spelare eller lag</span>
          <input type="search" data-player-search placeholder="Sok spelare, lag eller land" autocomplete="off">
        </label>
        <label>
          <span>Land</span>
          <select data-player-country>
            <option value="">Alla länder</option>
            ${countries.map(function(countryCode) {
              return `<option value="${escapeHtml(countryCode)}">${countryCodeToEmoji(countryCode)} ${escapeHtml(countryCode)}</option>`;
            }).join("")}
          </select>
        </label>
        <label>
          <span>Visa</span>
          <select data-player-limit>
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="all">Alla</option>
          </select>
        </label>
        <div class="player-index-count" data-player-count></div>
      </div>
      ${renderStatsTable(
        [
          { key: "player", label: "Spelare" },
          { key: "lag", label: "Lag" },
          { key: "cuper", label: "Cuper", type: "number" },
          { key: "gp", label: "GP", type: "number" },
          { key: "pts", label: "PTS", type: "number" }
        ],
        topPlayers.map(function(player) {
          const teams = Array.from(player.teamNames || []);
          return {
            _playerIndex: true,
            _country: String(player.countryCode || "").trim().toUpperCase(),
            _search: [player.name, player.rawName, teams.join(" "), player.countryCode, getPlayerRoleLabel(player)].join(" "),
            player: createPlayerIndexCell(player),
            lag: createPlayerTeamsCell(player),
            cuper: player.cups.length,
            gp: player.totals.gp || sumBy(player.goalieRows, "gp"),
            pts: player.totals.pts || 0
          };
        })
      )}
    </section>
  `;
}

function renderTeamSignupPage() {
  return `
    <section class="signup-page-shell" data-signup-form="team">
      ${renderSignupHero("Laganmälan", "SEC 21", "Anmäl ditt lag till Svenska eHockey Cupen 21. Anmälan kräver kod från cupadmin.")}
      <section class="signup-tabs-shell">
        <div class="cup-tabs signup-tabs" role="tablist" aria-label="SEC 21 laganmälan">
          <button class="cup-tab is-active" type="button" role="tab" aria-selected="true" data-signup-tab="info">Info</button>
          <button class="cup-tab" type="button" role="tab" aria-selected="false" data-signup-tab="anmalan">Anmalan</button>
          <button class="cup-tab" type="button" role="tab" aria-selected="false" data-signup-tab="lag">Anmälda Lag</button>
          <button class="cup-tab" type="button" role="tab" aria-selected="false" data-signup-tab="regler">Regler</button>
        </div>

        <div class="signup-tab-panels">
          <section class="signup-tab-panel is-active" data-signup-panel="info" role="tabpanel">
            <article class="detail-card signup-info-card signup-info-overview">
              <div class="welcome-title-row signup-info-title-row">
                <span class="welcome-icon" aria-hidden="true">i</span>
                <h2>Info</h2>
              </div>
              <p class="signup-info-lead">
                Här hittar du all information om <strong>SEC 21</strong>, deltagarkrav, regler och hur anmälan fungerar.
              </p>

              <div class="signup-info-grid">
                <div class="signup-info-box">
                  <h3>Format</h3>
                  <ul>
                    <li>Alla lag kan delta oavsett ECL-division.</li>
                    <li>Om möjligt delar vi upp cupen i <strong>två divisioner</strong>.</li>
                    <li>Vill ni spela en eventuell division 2, skriv det i anmälan.</li>
                  </ul>
                </div>

                <div class="signup-info-box">
                  <h3>Deltagarkrav</h3>
                  <ul>
                    <li>Laget ska vara skandinaviskt.</li>
                    <li>Laget ska ha <strong>3 skandinaviska kaptener</strong>.</li>
                    <li>Minst <strong>50%</strong> av laget ska vara skandinaver.</li>
                    <li>Minst <strong>50%</strong> av spelarna på isen ska vara skandinaver.</li>
                  </ul>
                </div>

                <div class="signup-info-box">
                  <h3>Förbjudna spelarförmågor</h3>
                  <ul>
                    <li>Alla spelarförmågor och builds är förbjudna enligt ECL 26 Spring.</li>
                    <li>Forward-builds får inte användas som back och back-builds får inte användas som forward.</li>
                    <li>Specialtecken och specialtecken-klasser är förbjudna, även för målvakter.</li>
                    <li>Forwards får inte använda defensiva back-klasser.</li>
                    <li>Backar får inte använda forward-klasser.</li>
                  </ul>
                </div>

                <div class="signup-info-box">
                  <h3>Kontakt & anmälningskod</h3>
                  <ul>
                    <li>Anmälan kräver anmälningskod.</li>
                    <li>E-post: <a class="sec-link" href="mailto:svenskehockey@gmail.com">svenskehockey@gmail.com</a></li>
                    <li>Discord: <a class="sec-link" href="https://discord.gg/B9TYMEjpj6" target="_blank" rel="noopener noreferrer">Gå med i Discord</a></li>
                  </ul>
                </div>
              </div>

              <div class="signup-info-note">
                <strong>Viktigt:</strong> Du kan inte skicka in en anmälan utan anmälningskod. Kontakta Svensk eHockey via e-post eller Discord.
              </div>
            </article>
          </section>

          <section class="signup-tab-panel" data-signup-panel="anmalan" role="tabpanel" hidden>
            <section class="signup-grid">
              <article class="detail-card signup-info-card">
                <div class="section-heading compact">
                  <p class="eyebrow">Innan du anmäler</p>
                  <h2>Krav</h2>
                </div>
                <div class="simple-list">
                  <div class="simple-list-item">Använd endast den kod du fått av cupadmin. Varje kod kan användas en gång.</div>
                  <div class="simple-list-item">Minst 8 spelare måste anges. Spelare 9-12 är valfria.</div>
                  <div class="simple-list-item">Kaptener och assisterande kaptener ska gå att kontakta inför cupstart.</div>
                </div>
              </article>

              <article class="detail-card signup-form-card">
                <div class="section-heading compact">
                  <p class="eyebrow">Formulär</p>
                  <h2>Laguppgifter</h2>
                </div>
                <form class="signup-form" data-signup-kind="team">
                  <div class="signup-form-grid">
                    ${renderSignupField("email", "E-postadress", "email", "din@mail.com", "email", true)}
                    ${renderSignupField("teamName", "Lagnamn", "text", "Ex: SCRUBS", "off", true)}
                    ${renderSignupField("abbr", "Förkortning", "text", "Ex: SCR", "off", true, "maxlength=\"3\"")}
                    ${renderSignupField("captain", "Kapten", "text", "Gamertag", "off", true)}
                    ${renderSignupField("assistant1", "Assisterande kapten 1", "text", "Gamertag", "off", true)}
                    ${renderSignupField("assistant2", "Assisterande kapten 2", "text", "Gamertag", "off", true)}
                    ${renderSignupField("website", "Website", "text", "", "off", false, "tabindex=\"-1\"", "signup-honeypot")}
                  </div>

                  <div class="signup-section">
                    <h3>Spelare</h3>
                    <p class="signup-help">Minst 8 spelare, max 12. Spelare 9-12 är valfria.</p>
                    <div class="signup-player-grid">
                      ${Array.from({ length: 12 }, function(_, index) {
                        const number = index + 1;
                        return renderSignupField("player" + number, "Spelare " + number + (number <= 8 ? " *" : ""), "text", "Gamertag", "off", number <= 8);
                      }).join("")}
                    </div>
                  </div>

                  <div class="signup-section">
                    <h3>Laglogga och kod</h3>
                    <div class="signup-form-grid">
                      <label class="signup-field">
                        <span>Laglogga (valfritt)</span>
                        <input data-signup-logo type="file" accept="image/png,image/jpeg">
                        <small>PNG/JPG, max 2 MB.</small>
                      </label>
                      ${renderSignupField("signupCode", "Anmälningskod", "text", "Skriv in koden", "off", true)}
                    </div>
                  </div>

                  <div class="signup-section">
                    <h3>Extra info</h3>
                    <p class="signup-help">Skriv om ni önskar division 2, har särskilda tider eller annat cupadmin bör veta.</p>
                    <label class="signup-field signup-field-full">
                      <span>Extra info</span>
                      <textarea name="notes" placeholder="Tillgänglighet, önskemål, eventuell division 2 eller annan info."></textarea>
                    </label>
                  </div>

                  <div class="signup-actions">
                    <div class="signup-status" data-signup-status></div>
                    <button class="button button-primary signup-submit" type="submit">Skicka anmälan</button>
                  </div>
                </form>
              </article>
            </section>
          </section>

          <section class="signup-tab-panel" data-signup-panel="lag" role="tabpanel" hidden>
            <article class="detail-card signup-form-card">
              <div class="section-heading compact">
                <p class="eyebrow">Laglista</p>
                <h2>Anmälda Lag</h2>
              </div>
              <div data-registered-teams class="signup-player-list">
                <div class="empty-state">Laddar anmälda lag...</div>
              </div>
            </article>
          </section>

          <section class="signup-tab-panel" data-signup-panel="regler" role="tabpanel" hidden>
            <article class="detail-card signup-info-card">
              <div class="section-heading compact">
                <p class="eyebrow">Regler</p>
                <h2>SEC 21</h2>
              </div>
              <div class="simple-list">
                <div class="simple-list-item">Laget ska följa cupens truppregler och använda spelare som finns i anmälan.</div>
                <div class="simple-list-item">Cupadmin kan begära komplettering om anmälan saknar information.</div>
                <div class="simple-list-item">Format, datum och spelregler kan uppdateras inför cupstart.</div>
              </div>
            </article>
          </section>
        </div>
      </section>
    </section>
  `;
}

function renderSummerDraftSignupPage() {
  return `
    <section class="signup-page-shell" data-signup-form="summer-draft">
      ${renderSignupHero("Spelaranmälan", "SEC Sommar Draft Cup", "Anmäl dig som spelare till Sommar Draft Cupen. Sidan är dold från menyn och används via direktlänk.")}
      <section class="signup-tabs-shell">
        <div class="cup-tabs signup-tabs" role="tablist" aria-label="Sommar Draft Cup">
          <button class="cup-tab is-active" type="button" role="tab" aria-selected="true" data-signup-tab="info">Info</button>
          <button class="cup-tab" type="button" role="tab" aria-selected="false" data-signup-tab="anmalan">Anmalan</button>
          <button class="cup-tab" type="button" role="tab" aria-selected="false" data-signup-tab="spelare">Anmälda Spelare</button>
          <button class="cup-tab" type="button" role="tab" aria-selected="false" data-signup-tab="regler">Regler</button>
        </div>

        <div class="signup-tab-panels">
          <section class="signup-tab-panel is-active" data-signup-panel="info" role="tabpanel">
            <article class="detail-card signup-info-card">
              <div class="section-heading compact">
                <p class="eyebrow">Sommarcupen</p>
                <h2>Info</h2>
              </div>
              <div class="simple-list">
                <div class="simple-list-item">Sommar Draft Cupen är en spelaranmälan där spelare anmäler sig individuellt.</div>
                <div class="simple-list-item">Cupadmin använder anmälningarna för att skapa jämna lag och följa cupens spelarregler.</div>
                <div class="simple-list-item">Fyll i gamertag, nationalitet och vilka positioner du kan spela.</div>
              </div>
            </article>
          </section>

          <section class="signup-tab-panel" data-signup-panel="anmalan" role="tabpanel" hidden>
            <section class="signup-grid">
              <article class="detail-card signup-info-card">
                <div class="section-heading compact">
                  <p class="eyebrow">Draftanmälan</p>
                  <h2>Att tänka på</h2>
                </div>
                <div class="simple-list">
                  <div class="simple-list-item">Fyll i kontaktuppgifter och vilka positioner du kan spela.</div>
                  <div class="simple-list-item">Nationalitet används för att kunna följa cupens spelarregler.</div>
                  <div class="simple-list-item">Extra info kan användas för tider, önskemål eller annan tillgänglighet.</div>
                </div>
              </article>

              <article class="detail-card signup-form-card">
                <div class="section-heading compact">
                  <p class="eyebrow">Formulär</p>
                  <h2>Spelaruppgifter</h2>
                </div>
                <form class="signup-form" data-signup-kind="summer-draft">
                  <div class="signup-form-grid">
                    ${renderSignupField("email", "E-postadress", "email", "din@mail.com", "email", true)}
                    ${renderSignupField("gamertag", "Gamertag", "text", "Ditt gamertag", "off", true)}
                    ${renderSignupField("discord", "Discord", "text", "Discord-namn", "off", false)}
                    ${renderSignupField("nationality", "Nationalitet", "text", "Sverige / Norge / Danmark / ...", "off", true)}
                    ${renderSignupField("primaryPosition", "Primär position", "text", "LW/C/RW/LD/RD/G", "off", true)}
                    ${renderSignupField("secondaryPosition", "Sekundär position", "text", "Valfritt", "off", false)}
                    ${renderSignupField("website", "Website", "text", "", "off", false, "tabindex=\"-1\"", "signup-honeypot")}
                  </div>

                  <label class="signup-field signup-field-full">
                    <span>Extra info</span>
                    <textarea name="notes" placeholder="Tillgänglighet, önskemål eller annat cupadmin bör veta."></textarea>
                  </label>

                  <div class="signup-actions">
                    <div class="signup-status" data-signup-status></div>
                    <button class="button button-primary signup-submit" type="submit">Skicka anmälan</button>
                  </div>
                </form>
              </article>
            </section>
          </section>

          <section class="signup-tab-panel" data-signup-panel="spelare" role="tabpanel" hidden>
            <article class="detail-card signup-form-card">
              <div class="section-heading compact">
                <p class="eyebrow">Spelarlista</p>
                <h2>Anmälda Spelare</h2>
              </div>
              <div data-summer-draft-players class="signup-player-list">
                <div class="empty-state">Laddar anmälda spelare...</div>
              </div>
            </article>
          </section>

          <section class="signup-tab-panel" data-signup-panel="regler" role="tabpanel" hidden>
            <article class="detail-card signup-info-card">
              <div class="section-heading compact">
                <p class="eyebrow">Regler</p>
                <h2>Sommar Draft Cup</h2>
              </div>
              <div class="simple-list">
                <div class="simple-list-item">Cupadmin delar in lag efter anmälningar, positioner och tillgänglighet.</div>
                <div class="simple-list-item">Spelare ska använda korrekt gamertag och kunna kontaktas via angiven kontaktväg.</div>
                <div class="simple-list-item">Regler, schema och format kan uppdateras inför cupstart.</div>
              </div>
            </article>
          </section>
        </div>
      </section>
    </section>
  `;
}

function renderSignupHero(eyebrow, title, intro) {
  return `
    <section class="section-header-block signup-hero signup-hero-with-logo">
      <div class="signup-hero-content">
        <div class="breadcrumbs">
          <a href="#/">Start</a>
          <span>/</span>
          <strong>${escapeHtml(eyebrow)}</strong>
        </div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="page-intro">${escapeHtml(intro)}</p>
      </div>
      <div class="signup-hero-logo" aria-hidden="true">
        <img src="./SECLOGGA.png" alt="">
      </div>
    </section>
  `;
}

function renderSignupField(name, label, type, placeholder, autocomplete, required, extraAttrs, extraClass) {
  return `
    <label class="signup-field ${extraClass || ""}">
      <span>${escapeHtml(label)}</span>
      <input
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        placeholder="${escapeHtml(placeholder)}"
        autocomplete="${escapeHtml(autocomplete || "off")}"
        ${required ? "required" : ""}
        ${extraAttrs || ""}
      >
    </label>
  `;
}

function createPlayerIndexCell(player) {
  const href = "#/player/" + encodeURIComponent(player.key || createPlayerKey(player));
  return createCellValue(`
    <a class="player-index-cell" href="${href}">
      ${renderPlayerPortrait(player, "player-portrait-table")}
      <span class="player-index-meta">
        <span class="player-index-name">
          ${renderFlag(player.countryCode)}
          <strong>${escapeHtml(getDisplayPlayerName(player))}</strong>
        </span>
        <span class="player-index-sub">${escapeHtml(getPlayerRoleLabel(player))}</span>
      </span>
    </a>
  `, getDisplayPlayerName(player));
}

function createPlayerTeamsCell(player) {
  const teams = Array.from(player.teamNames || []);
  const latestTeam = getLatestPlayerTeam(player);
  const visibleTeams = latestTeam
    ? [latestTeam].concat(teams.filter(function(team) { return normalizeLookupKey(team) !== normalizeLookupKey(latestTeam); }))
    : teams;
  const shownTeams = visibleTeams.slice(0, 4);
  const hiddenCount = Math.max(0, visibleTeams.length - shownTeams.length);

  const html = `
    <div class="player-team-history" title="${escapeHtml(teams.join(", "))}">
      ${latestTeam ? `<div class="player-team-latest">Senaste lag: <strong>${escapeHtml(latestTeam)}</strong></div>` : ""}
      <div class="player-team-chips">
        ${shownTeams.map(function(team) {
          return `<span class="team-chip">${escapeHtml(team)}</span>`;
        }).join("")}
        ${hiddenCount ? `<span class="team-chip is-muted">+${hiddenCount} fler</span>` : ""}
      </div>
    </div>
  `;

  return createCellValue(html, teams.join(", "));
}

function getPlayerRoleLabel(player) {
  const hasSkater = (player.skaterRows || []).length > 0;
  const hasGoalie = (player.goalieRows || []).length > 0;

  if (hasSkater && hasGoalie) {
    return "Utespelare / målvakt";
  }
  if (hasGoalie) {
    return "Målvakt";
  }
  return "Utespelare";
}

function renderPlayerPage(player) {
  const goalieGames = sumBy(player.goalieRows, "gp");
  const latestTeam = getLatestPlayerTeam(player) || "Okant lag";
  const isGoalieOnly = player.skaterRows.length === 0 && player.goalieRows.length > 0;
  const playerBio = buildPlayerBio(player);
  const regularSkaterRows = player.skaterRows.filter(function(row) { return !isSummerCupRow(row); });
  const summerSkaterRows = player.skaterRows.filter(isSummerCupRow);
  const regularGoalieRows = player.goalieRows.filter(function(row) { return !isSummerCupRow(row); });
  const summerGoalieRows = player.goalieRows.filter(isSummerCupRow);

  return `
    <section class="section-header-block">
      <div class="breadcrumbs">
        <a href="#/">Start</a>
        <span>/</span>
        <a href="#/players">Spelare</a>
        <span>/</span>
        <strong>${escapeHtml(player.name)}</strong>
      </div>
      <div class="player-page-heading">
        <div class="player-heading-main">
          ${renderPlayerPortrait(player, "player-portrait-lg")}
          <div class="player-heading-text">
            <p class="eyebrow">${isGoalieOnly ? "Malvaktsprofil" : "Spelarprofil"}</p>
            <h1 class="page-title">${escapeHtml(player.name)}</h1>
            <p class="page-intro">Total statistik over spelarens SEC-historik.</p>
          </div>
        </div>
        ${renderPlayerBioPanel(playerBio)}
      </div>
      ${renderPlayerMeritsPanel(playerBio)}
    </section>

    <section class="detail-grid">
      <article class="detail-card hero-stat-card"><span class="detail-label">Senaste lag:</span><strong>${escapeHtml(latestTeam)}</strong></article>
      <article class="detail-card hero-stat-card"><span class="detail-label">Cuper:</span><strong>${player.cups.length}</strong></article>
      <article class="detail-card hero-stat-card"><span class="detail-label">GP:</span><strong>${player.totals.gp || goalieGames}</strong></article>
      <article class="detail-card hero-stat-card"><span class="detail-label">${isGoalieOnly ? "SV:" : "PTS:"}</span><strong>${isGoalieOnly ? sumBy(player.goalieRows, "sv") : player.totals.pts}</strong></article>
    </section>

    ${regularSkaterRows.length ? `
      <section class="detail-card">
        <div class="section-heading compact">
          <p class="eyebrow">Utespelare</p>
          <h2>SEC statistik</h2>
        </div>
        ${renderPlayerSkaterTable(regularSkaterRows)}
      </section>
    ` : ""}

    ${regularGoalieRows.length ? `
      <section class="detail-card">
        <div class="section-heading compact">
          <p class="eyebrow">Malvakt</p>
          <h2>SEC statistik</h2>
        </div>
        ${renderPlayerGoalieTable(regularGoalieRows)}
      </section>
    ` : ""}

    ${summerSkaterRows.length || summerGoalieRows.length ? `
      <section class="detail-card">
        <div class="section-heading compact">
          <p class="eyebrow">Sommarcupen</p>
          <h2>Sommarstatistik</h2>
        </div>
        <div class="player-summer-stats-grid">
          ${summerSkaterRows.length ? `<div class="player-summer-stat-block">${renderPlayerSkaterTable(summerSkaterRows)}</div>` : ""}
          ${summerGoalieRows.length ? `<div class="player-summer-stat-block">${renderPlayerGoalieTable(summerGoalieRows)}</div>` : ""}
        </div>
      </section>
    ` : ""}
  `;
}

function renderPlayerSkaterTable(rows) {
  return renderStatsTable(
    [
      { key: "cup", label: "Cup" },
      { key: "lag", label: "Lag" },
      { key: "gp", label: "GP", type: "number" },
      { key: "g", label: "G", type: "number" },
      { key: "a", label: "A", type: "number" },
      { key: "pts", label: "PTS", type: "number" },
      { key: "pim", label: "PIM", type: "number" }
    ],
    rows.map(function(row) {
      return {
        cup: createCellValue(renderCupLink(row.cupId, getStageCupLabel(row)), getStageCupLabel(row)),
        lag: createTeamCell(row.team, row.cupId),
        gp: row.gp,
        g: row.g,
        a: row.a,
        pts: row.pts,
        pim: row.pim
      };
    })
  );
}

function renderPlayerGoalieTable(rows) {
  return renderStatsTable(
    [
      { key: "cup", label: "Cup" },
      { key: "lag", label: "Lag" },
      { key: "gp", label: "GP", type: "number" },
      { key: "svp", label: "SV%", type: "number" },
      { key: "gaa", label: "GAA", type: "number" },
      { key: "sv", label: "SV", type: "number" },
      { key: "ga", label: "GA", type: "number" },
      { key: "so", label: "SO", type: "number" }
    ],
    rows.map(function(row) {
      return {
        cup: createCellValue(renderCupLink(row.cupId, getStageCupLabel(row)), getStageCupLabel(row)),
        lag: createTeamCell(row.team, row.cupId),
        gp: row.gp,
        svp: createCellValue(formatPercentage(row.svp), normalizePercentageForSort(row.svp)),
        gaa: createCellValue(formatDecimal(row.gaa), safeNumber(row.gaa)),
        sv: row.sv,
        ga: row.ga,
        so: row.so
      };
    })
  );
}

function buildPlayerBio(player) {
  const rows = player.skaterRows.concat(player.goalieRows);
  const cupIds = uniqueStrings(rows.map(function(row) { return row.cupId; })).sort(function(a, b) {
    return inferSortOrder(a) - inferSortOrder(b);
  });
  const regularCupIds = cupIds.filter(function(id) {
    return !/sommar/i.test(id);
  });
  const bioCupIds = regularCupIds.length ? regularCupIds : cupIds;
  const firstCupId = bioCupIds[0] || "";
  const lastCupId = bioCupIds[bioCupIds.length - 1] || "";
  const firstRow = rows.find(function(row) { return row.cupId === firstCupId; }) || rows[0] || null;
  const lastRow = rows.slice().reverse().find(function(row) { return row.cupId === lastCupId; }) || rows[rows.length - 1] || null;
  const bestSkater = player.skaterRows.slice().sort(function(a, b) {
    return b.pts - a.pts || b.g - a.g;
  })[0] || null;
  const bestGoalie = player.goalieRows.slice().sort(function(a, b) {
    return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(b.sv) - safeNumber(a.sv);
  })[0] || null;

  return {
    name: player.name,
    nationality: translateNationality(player.countryCode),
    firstCup: getCupCode(firstCupId),
    firstTeam: firstRow?.team || "-",
    lastCup: getCupCode(lastCupId),
    lastTeam: lastRow?.team || "-",
    cupsCount: cupIds.length,
    teamsCount: player.teamNames.length,
    totalGames: player.totals.gp + sumBy(player.goalieRows, "gp"),
    bestSkater: bestSkater,
    bestGoalie: bestGoalie,
    teamMerits: getPlayerTeamMerits(player),
    personalMerits: getPlayerPersonalMerits(player)
  };
}

function renderPlayerBioPanel(bio) {
  return `
    <aside class="player-bio-panel" aria-label="Spelarbio och meriter">
      <p>
        <strong>${escapeHtml(bio.name)}</strong> är en
        ${bio.nationality ? `<span class="player-bio-name">${escapeHtml(bio.nationality)}</span>` : ""}
        eHockey-spelare som gjorde sitt första framträdande i
        <strong>${escapeHtml(bio.firstCup || "SEC ?")}</strong>
        för <strong>${escapeHtml(bio.firstTeam)}</strong>.
      </p>
      <p>
        Totalt har han deltagit i <strong>${bio.cupsCount}</strong> upplagor av
        <strong>Svenska eHockey Cupen</strong> och representerat
        <strong>${bio.teamsCount}</strong> olika lag. Senast spelade han i
        <strong>${escapeHtml(bio.lastCup || "SEC ?")}</strong> för
        <strong>${escapeHtml(bio.lastTeam)}</strong>.
      </p>
      <p>Sammanlagt står han på <strong>${bio.totalGames}</strong> matcher i SEC.</p>
      ${bio.bestSkater ? `
        <p>Hans bästa turnering som utespelare kom i <strong>${escapeHtml(bio.bestSkater.cupCode)}</strong>, där han gjorde <strong>${bio.bestSkater.pts}</strong> poäng för <strong>${escapeHtml(bio.bestSkater.team)}</strong>.</p>
      ` : ""}
      ${bio.bestGoalie ? `
        <p>Hans bästa turnering som målvakt kom i <strong>${escapeHtml(bio.bestGoalie.cupCode)}</strong>, med <strong>${formatPercentage(bio.bestGoalie.svp)}</strong> i SV% för <strong>${escapeHtml(bio.bestGoalie.team)}</strong>.</p>
      ` : ""}
    </aside>
  `;
}

function renderPlayerMeritsPanel(bio) {
  if (!bio.teamMerits.length && !bio.personalMerits.length) {
    return "";
  }

  return `
    <div class="player-merits-panel">
      ${renderPlayerMeritSection("Meriter", bio.teamMerits)}
      ${renderPlayerMeritSection("Personliga meriter", bio.personalMerits)}
    </div>
  `;
}

function renderPlayerMeritSection(title, items) {
  if (!items.length) {
    return "";
  }

  return `
    <div class="player-merit-section">
      <div class="player-merit-divider">${escapeHtml(title)}</div>
      <div class="player-merit-list">
        ${items.map(function(item) {
          return `<div>${escapeHtml(item.icon)} <strong>${escapeHtml(item.text)}</strong></div>`;
        }).join("")}
      </div>
    </div>
  `;
}

function getPlayerTeamMerits(player) {
  const output = [];
  const seen = new Set();

  state.cups.forEach(function(cup) {
    const teams = getPlayerTeamsInCup(player, cup.id);
    teams.forEach(function(team) {
      const won = cup.winner && cup.winner !== "Ej klar" && createTeamKey(cup.winner) === createTeamKey(team);
      const second = cup.runnerUp && cup.runnerUp !== "Ej klar" && createTeamKey(cup.runnerUp) === createTeamKey(team);

      if (won) {
        const key = "gold-" + cup.id + "-" + createTeamKey(team);
        if (!seen.has(key)) {
          seen.add(key);
          output.push({ icon: "🏆", text: "Mästare i " + cup.code + " med " + team + "." });
        }
      }
      if (second) {
        const key = "silver-" + cup.id + "-" + createTeamKey(team);
        if (!seen.has(key)) {
          seen.add(key);
          output.push({ icon: "🥈", text: "2:a i " + cup.code + " med " + team + "." });
        }
      }
    });
  });

  return output.sort(function(a, b) {
    return a.text.localeCompare(b.text, "sv");
  });
}

function getPlayerPersonalMerits(player) {
  return getPlayerPointMerits(player).concat(getPlayerGoalMerits(player), getPlayerGoalieMerits(player));
}

function getPlayerPointMerits(player) {
  const output = [];

  player.skaterRows.forEach(function(row) {
    const cup = state.cups.find(function(entry) { return entry.id === row.cupId; });
    if (!cup) {
      return;
    }

    const stageRows = (row.stage === "playoffs" ? cup.playerStats.playoffs : cup.playerStats.group).slice();
    const sorted = stageRows.sort(function(a, b) {
      return b.pts - a.pts || b.g - a.g || a.player.localeCompare(b.player, "sv");
    });
    const index = findPlayerRankIndex(sorted, row);
    if (index >= 0 && index < 3) {
      output.push({
        icon: index === 0 ? "🎯" : index === 1 ? "🥈" : "🥉",
        text: (index + 1) + ":a i poängligan i " + getStageCupLabel(row) + " (" + row.pts + "p)."
      });
    }
  });

  return output;
}

function getPlayerGoalMerits(player) {
  const output = [];

  player.skaterRows.forEach(function(row) {
    const cup = state.cups.find(function(entry) { return entry.id === row.cupId; });
    if (!cup) {
      return;
    }

    const stageRows = (row.stage === "playoffs" ? cup.playerStats.playoffs : cup.playerStats.group).slice();
    const sorted = stageRows.sort(function(a, b) {
      return b.g - a.g || b.pts - a.pts || a.player.localeCompare(b.player, "sv");
    });
    const index = findPlayerRankIndex(sorted, row);
    if (index >= 0 && index < 3) {
      output.push({
        icon: index === 0 ? "🏹" : index === 1 ? "🥈" : "🥉",
        text: (index + 1) + ":a i skytteligan i " + getStageCupLabel(row) + " (" + row.g + " mål)."
      });
    }
  });

  return output;
}

function getPlayerGoalieMerits(player) {
  const output = [];

  player.goalieRows.forEach(function(row) {
    const cup = state.cups.find(function(entry) { return entry.id === row.cupId; });
    if (!cup) {
      return;
    }

    const stageRows = (row.stage === "playoffs" ? cup.goalieStats.playoffs : cup.goalieStats.group).slice();
    const sorted = stageRows.sort(function(a, b) {
      return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(b.sv) - safeNumber(a.sv) || a.player.localeCompare(b.player, "sv");
    });
    const index = findPlayerRankIndex(sorted, row);
    if (index >= 0 && index < 3) {
      output.push({
        icon: index === 0 ? "🧱" : index === 1 ? "🥈" : "🥉",
        text: (index + 1) + ":a i målvaktsligan i " + getStageCupLabel(row) + " (" + formatPercentage(row.svp) + ")."
      });
    }
  });

  return output;
}

function findPlayerRankIndex(rows, row) {
  return rows.findIndex(function(candidate) {
    if (row.playerId && candidate.playerId) {
      return String(candidate.playerId) === String(row.playerId);
    }
    return normalizeLookupKey(candidate.displayName || candidate.player) === normalizeLookupKey(row.displayName || row.player);
  });
}

function getPlayerTeamsInCup(player, cupId) {
  return uniqueStrings(player.skaterRows.concat(player.goalieRows).filter(function(row) {
    return row.cupId === cupId;
  }).map(function(row) {
    return row.team;
  }));
}

function getLatestPlayerTeam(player) {
  const rows = player.skaterRows.concat(player.goalieRows).filter(function(row) {
    return row.team;
  });

  rows.sort(function(a, b) {
    const cupDiff = inferSortOrder(b.cupId) - inferSortOrder(a.cupId);
    if (cupDiff !== 0) {
      return cupDiff;
    }
    return (b.stage === "playoffs" ? 1 : 0) - (a.stage === "playoffs" ? 1 : 0);
  });

  return rows[0]?.team || "";
}

function isSummerCupRow(row) {
  return /sommar/i.test(String(row?.cupId || row?.cupCode || ""));
}

function getCupCode(cupId) {
  const cup = state.cups.find(function(entry) { return entry.id === cupId; });
  return cup ? cup.code : cupId;
}

function getStageCupLabel(row) {
  return row.cupCode + (row.stage === "playoffs" ? " S" : " G");
}

function translateNationality(code) {
  const map = {
    SWE: "Svensk",
    SE: "Svensk",
    FIN: "Finsk",
    FI: "Finsk",
    NOR: "Norsk",
    NO: "Norsk",
    DEN: "Dansk",
    DK: "Dansk",
    GER: "Tysk",
    DE: "Tysk",
    CZE: "Tjeckisk",
    SVK: "Slovakisk",
    CAN: "Kanadensisk",
    USA: "Amerikansk"
  };
  const key = String(code || "").trim().toUpperCase();
  return map[key] || key;
}

function renderCupCard(cup) {
  const category = getCupCategory(cup);
  const seasonText = getCupSeasonLabel(cup, category);
  const dateLine = getCupDateLine(cup.matches);
  const className = ["cup"];

  if (category === "sommar") {
    className.push("is-sommar");
  }
  return `
    <article class="${className.join(" ")}" role="link" tabindex="0" data-cup-link="#/cup/${encodeURIComponent(cup.id)}">
      <img class="cup-logo" src="${getCupLogoSrc(cup)}" alt="${escapeHtml(cup.code)}">
      <a href="#/cup/${encodeURIComponent(cup.id)}">${escapeHtml(cup.name)}</a>
      <div class="cup-season">
        Sasong: ${escapeHtml(seasonText)}<br>
        Datum: ${escapeHtml(dateLine)}<br>
        Matcher: ${cup.matchCount}<br>
        Vinnare: ${escapeHtml(cup.winner)}<br>
        Finalist: ${escapeHtml(cup.runnerUp)}
      </div>
    </article>
  `;
}

function renderTeamCard(team, cupId) {
  const href = getTeamUrl(team.name, cupId);

  return `
    <a class="entity-card entity-card-link" href="${href}">
      <div class="entity-brand team-card-brand">
        ${renderTeamLogo(team.name, "team-logo-card")}
        <h3>${escapeHtml(team.name)}</h3>
      </div>
    </a>
  `;
}

function renderPlayoffCutSummary(settings) {
  const cut1 = settings?.playoffCut1;
  const cut2 = settings?.playoffCut2;

  if (!cut1 && !cut2) {
    return "";
  }

  const label = cut2 ? "Slutspelsstreck: " + cut1 + " / " + cut2 : "Slutspelsstreck: topp " + cut1;
  return `<p class="cut-summary">${escapeHtml(label)}</p>`;
}

function getStandingsRowClass(index, settings) {
  const cut1 = settings?.playoffCut1;
  const cut2 = settings?.playoffCut2;
  const classes = [];

  if (cut1 && index < cut1) {
    classes.push("is-playoff-zone");
  }
  if (cut1 && index === cut1 - 1) {
    classes.push("is-cutline-primary");
  }
  if (cut2 && index === cut2 - 1) {
    classes.push("is-cutline-secondary");
  }

  return classes.join(" ");
}

function renderBestOfPill(roundName, settings) {
  const bestOf = getBestOfForRound(roundName, settings);
  return bestOf ? `<div class="playoff-bestof">Bäst av ${bestOf}</div>` : "";
}

function getBestOfForRound(roundName, settings) {
  const value = String(roundName || "").toLowerCase();
  const bestOf = settings?.bestOf || {};

  if (value.indexOf("atton") !== -1 || value.indexOf("åtton") !== -1 || value.indexOf("16") !== -1) {
    return bestOf.roundOf16;
  }
  if (value.indexOf("kvart") !== -1) {
    return bestOf.quarter;
  }
  if (value.indexOf("semi") !== -1) {
    return bestOf.semi;
  }
  if (value.indexOf("final") !== -1) {
    return bestOf.final;
  }

  const fallback = [bestOf.roundOf16, bestOf.quarter, bestOf.semi, bestOf.final].filter(Boolean);
  const unique = Array.from(new Set(fallback.map(String)));
  return unique.length === 1 ? fallback[0] : null;
}

function renderCupSettingsSummary(settings) {
  const safeSettings = settings || createDefaultCupSettings();
  const items = [];
  const bestOf = [
    safeSettings.bestOf?.roundOf16,
    safeSettings.bestOf?.quarter,
    safeSettings.bestOf?.semi,
    safeSettings.bestOf?.final
  ].filter(Boolean);

  if (safeSettings.playoffCut1) {
    items.push({
      label: "Slutspelsstreck",
      text: "topp " + safeSettings.playoffCut1 + (safeSettings.playoffCut2 ? " / " + safeSettings.playoffCut2 : "")
    });
  }
  if (bestOf.length) {
    items.push({
      label: "Best of",
      text: Array.from(new Set(bestOf.map(String))).map(function(value) {
      return "BO" + value;
    }).join(", ")
    });
  }
  if (safeSettings.minPlayers || safeSettings.maxPlayers) {
    items.push({
      label: "Trupp",
      text: (safeSettings.minPlayers || "?") + "-" + (safeSettings.maxPlayers || "?") + " spelare"
    });
  }
  if (safeSettings.eligibility) {
    items.push({
      label: "Behörighet",
      text: stripRuleLabel(safeSettings.eligibility, "Behörighet")
    });
  }

  splitSettingsInfo(safeSettings.info).slice(0, 2).forEach(function(info) {
    items.push({
      label: "",
      text: info
    });
  });

  if (!items.length) {
    items.push({
      label: "",
      text: "Ingen extra cupinfo finns angiven i cupdatan."
    });
  }

  return items.map(function(item) {
    return renderRuleListItem(item);
  }).join("");
}

function renderRuleListItem(item) {
  const paragraphs = splitRuleParagraphs(item.text);
  const label = item.label ? `<strong>${escapeHtml(item.label)}:</strong> ` : "";

  if (paragraphs.length <= 1) {
    return `<div class="simple-list-item rule-list-item">${label}${renderRuleRichText(paragraphs[0] || "")}</div>`;
  }

  return `
    <div class="simple-list-item rule-list-item">
      ${label}
      <div class="rule-paragraphs">
        ${paragraphs.map(function(paragraph) {
          return `<p>${renderRuleInlineText(paragraph)}</p>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderRuleRichText(value) {
  const lines = String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .map(function(line) { return line.trim(); });

  const output = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) {
      return;
    }
    output.push(`
      <ul class="rule-list">
        ${listItems.map(function(item) {
          return `<li>${renderRuleInlineText(item)}</li>`;
        }).join("")}
      </ul>
    `);
    listItems = [];
  }

  lines.forEach(function(line) {
    if (!line) {
      flushList();
      output.push(`<br>`);
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList();

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length);
      output.push(`<h${level + 3} class="rule-heading">${renderRuleInlineText(headingMatch[2])}</h${level + 3}>`);
      return;
    }

    output.push(`<p>${renderRuleInlineText(line)}</p>`);
  });

  flushList();

  return output.join("");
}

function renderRuleInlineText(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>");
}

function stripRuleLabel(value, label) {
  const text = normalizeText(value);
  const normalizedLabel = normalizeLookupKey(label);
  const parts = text.split(":");

  if (parts.length > 1 && normalizeLookupKey(parts[0]) === normalizedLabel) {
    return parts.slice(1).join(":").trim();
  }

  return text;
}

function splitRuleParagraphs(value) {
  const text = normalizeText(value);

  if (!text) {
    return [];
  }

  if (/<br\s*\/?>/i.test(text)) {
    return [text];
  }

  const sentenceParts = text
    .split(/(?<=\.)\s+(?=[A-ZÅÄÖ])|(?<=\))\s+(?=[A-ZÅÄÖ])/g)
    .map(function(part) { return part.trim(); })
    .filter(Boolean);

  if (sentenceParts.length <= 1) {
    return [text];
  }

  const paragraphs = [];
  let current = "";

  sentenceParts.forEach(function(part) {
    if (!current) {
      current = part;
      return;
    }
    if ((current + " " + part).length > 210) {
      paragraphs.push(current);
      current = part;
      return;
    }
    current += " " + part;
  });

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs;
}

function renderCupHighlightCard(label, item, options) {
  const safeOptions = options || {};
  const isTeam = safeOptions.type === "team";
  const name = isTeam ? String(item?.name || "Ej klar") : getDisplayPlayerName(item);
  const team = isTeam ? String(item?.team || "") : String(item?.team || "");
  const stat = safeOptions.stat || "";
  const href = isTeam && team && team !== "Ej klar"
    ? getTeamUrl(team, safeOptions.cupId)
    : item
      ? "#/player/" + encodeURIComponent(createPlayerKey(item))
      : "#/";

  return `
    <a class="cup-highlight-card" href="${href}">
      <span class="cup-highlight-media">
        ${isTeam ? renderTeamLogo(team, "team-logo-highlight") : renderPlayerPortrait(item, "player-portrait-highlight")}
      </span>
      <span class="cup-highlight-body">
        <span class="detail-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(name || "Ej klar")}</strong>
        ${team && !isTeam ? `<span>${renderTeamLogo(team, "team-logo-xs")}${escapeHtml(team)}</span>` : ""}
        ${stat ? `<em>${escapeHtml(stat)}</em>` : ""}
      </span>
    </a>
  `;
}

function renderOverviewPlayerCards(rows, config) {
  if (!rows.length) {
    return `<div class="empty-state">Ingen data finns an.</div>`;
  }

  const sortedRows = rows.slice().sort(config.sort || function() { return 0; });

  return `
    <div class="overview-player-list">
      ${sortedRows.map(function(row, index) {
        const href = "#/player/" + encodeURIComponent(createPlayerKey(row));
        const statValue = typeof config.value === "function" ? config.value(row) : "";
        const statMeta = typeof config.meta === "function" ? config.meta(row) : "";

        return `
          <a class="overview-player-card" href="${href}">
            <span class="overview-player-rank">${index + 1}</span>
            ${renderPlayerPortrait(row, "player-portrait-card")}
            <span class="overview-player-main">
              <span class="overview-player-name">
                ${renderFlag(row.countryCode)}
                <span>${escapeHtml(getDisplayPlayerName(row))}</span>
              </span>
              <span class="overview-player-team">
                ${renderTeamLogo(row.team, "team-logo-xs")}
                <span>${escapeHtml(row.team)}</span>
              </span>
            </span>
            <span class="overview-player-stat">
              <span>${escapeHtml(config.label || "")}</span>
              <strong>${escapeHtml(statValue)}</strong>
              ${statMeta ? `<em>${escapeHtml(statMeta)}</em>` : ""}
            </span>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function splitSettingsInfo(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("||")
    .flatMap(function(part) {
      return part.split("\n");
    })
    .map(function(part) {
      return part.trim();
    })
    .filter(Boolean);
}

function renderStandingsTable(group, settings, cupId) {
  return `
    <article class="detail-card">
      <div class="section-heading compact">
        <p class="eyebrow">Tabell</p>
        <h2>${escapeHtml(group.name)}</h2>
      </div>
      ${renderPlayoffCutSummary(settings)}
      ${renderStatsTable(
        [
          { key: "lag", label: "Lag" },
          { key: "gp", label: "GP", type: "number" },
          { key: "wins", label: "V", type: "number" },
          { key: "otWins", label: "OTV", type: "number" },
          { key: "otLosses", label: "OTF", type: "number" },
          { key: "losses", label: "F", type: "number" },
          { key: "goalDiff", label: "MS", type: "number" },
          { key: "points", label: "P", type: "number" }
        ],
        group.rows.map(function(row, index) {
          return {
            _rowClass: getStandingsRowClass(index, settings),
            lag: createTeamCell(row.team, cupId),
            gp: row.gp,
            wins: row.wins,
            otWins: row.otWins,
            otLosses: row.otLosses,
            losses: row.losses,
            goalDiff: row.goalDiff,
            points: row.points
          };
        })
      )}
    </article>
  `;
}

function renderPlayoffBracket(rounds, playoffMatches, settings, cup) {
  if (!playoffMatches.length) {
    return `<div class="empty-state">Inget slutspel finns registrerat for den har cupen an.</div>`;
  }

  return `
    <section class="playoff-shell">
      <div class="section-heading">
        <p class="eyebrow">Slutspel</p>
        <h2>Slutspelsserier</h2>
      </div>
      <div class="playoff-rounds">
        ${rounds.map(function(round) {
          return renderPlayoffRoundSection(round, settings, cup);
        }).join("")}
      </div>
    </section>
  `;
}

function renderPlayoffRoundSection(round, settings, cup) {
  const bestOf = getBestOfForRound(round.name, settings);
  const seriesCount = buildPlayoffSeries(round.matches, bestOf, round.teamOrderBySeries).length;

  return `
    <div class="playoff-round-row" data-series-count="${seriesCount}">
      <div class="playoff-round-row-head">
        <h3>${escapeHtml(round.name)}</h3>
        ${bestOf ? `<span>BO${escapeHtml(bestOf)}</span>` : ""}
      </div>
      <div class="playoff-series-grid">
        ${renderPlayoffSeriesRound(round, settings, cup)}
      </div>
    </div>
  `;
}

function renderPlayoffSeriesRound(round, settings, cup) {
  const bestOf = getBestOfForRound(round.name, settings);
  const series = buildPlayoffSeries(round.matches, bestOf, round.teamOrderBySeries);

  return series.map(function(entry) {
    return `
      <article class="playoff-series-card">
        <div class="playoff-series-label">${escapeHtml(round.name)}</div>
        <div class="playoff-series-teams">
          ${renderSeriesTeam(entry.awayTeam, cup?.id)}
          <span class="playoff-series-vs">vs</span>
          ${renderSeriesTeam(entry.homeTeam, cup?.id)}
        </div>
        <div class="playoff-series-results">
          ${entry.matches.map(function(match, index) {
            return `
              <div class="playoff-series-result">
                <span>Match ${index + 1}</span>
                <strong>${escapeHtml(match.awayTeam)} ${displayScore(match.awayScore)}-${displayScore(match.homeScore)} ${escapeHtml(match.homeTeam)}</strong>
                <em>${escapeHtml(formatMatchDate(match.date, match.time) || "")}</em>
              </div>
            `;
          }).join("")}
        </div>
        <div class="playoff-series-status">${escapeHtml(entry.status)}</div>
      </article>
    `;
  }).join("");
}

function buildPlayoffSeries(matches, bestOf, teamOrderBySeries) {
  const groups = new Map();

  matches.forEach(function(match) {
    const key = getPlayoffSeriesKey(match.awayTeam, match.homeTeam);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(match);
  });

  return Array.from(groups.entries()).map(function(entry) {
    const seriesKey = entry[0];
    const seriesMatches = entry[1];
    const sortedMatches = seriesMatches.slice().sort(compareMatchesAsc);
    const firstMatch = sortedMatches[0] || {};
    const teams = teamOrderBySeries?.[seriesKey] || [firstMatch.awayTeam, firstMatch.homeTeam];
    const wins = new Map();

    teams.forEach(function(team) {
      wins.set(team, 0);
    });

    sortedMatches.forEach(function(match) {
      if (match.awayScore === null || match.homeScore === null || match.awayScore === match.homeScore) {
        return;
      }
      const winner = match.awayScore > match.homeScore ? match.awayTeam : match.homeTeam;
      wins.set(winner, (wins.get(winner) || 0) + 1);
    });

    const awayWins = wins.get(teams[0]) || 0;
    const homeWins = wins.get(teams[1]) || 0;
    const leader = awayWins === homeWins ? "" : awayWins > homeWins ? teams[0] : teams[1];
    const status = formatSeriesStatus(leader, awayWins, homeWins, bestOf);

    return {
      seriesKey: seriesKey,
      awayTeam: teams[0],
      homeTeam: teams[1],
      matches: sortedMatches,
      winner: leader,
      status: status
    };
  });
}

function getPlayoffSeriesKey(teamA, teamB) {
  return [createTeamKey(teamA), createTeamKey(teamB)].sort().join("|");
}

function formatSeriesStatus(leader, awayWins, homeWins, bestOf) {
  const high = Math.max(awayWins, homeWins);
  const low = Math.min(awayWins, homeWins);
  const boText = bestOf ? " i BO" + bestOf : "";
  const needed = bestOf ? Math.ceil(bestOf / 2) : null;

  if (!leader) {
    return "Står " + high + "-" + low + " i matcher" + boText;
  }

  if (needed && high >= needed) {
    return leader + " vann " + high + "-" + low + " i matcher" + boText;
  }

  return leader + " leder " + high + "-" + low + " i matcher" + boText;
}

function renderSeriesTeam(teamName, cupId) {
  return `
    <a class="playoff-series-team" href="${getTeamUrl(teamName, cupId)}">
      ${renderTeamLogo(teamName, "team-logo-md")}
      <strong>${escapeHtml(teamName)}</strong>
    </a>
  `;
}

const SEC_SHARED_RULE_SECTIONS = [
  {
    title: "Medlemsregistrering",
    items: [
      { heading: "Allmänt", text: "Alla spelare som deltar i SEC måste ha ett registrerat konto på SportsGamer.gg med sitt PSN-ID (PlayStation) eller Gamertag (Xbox) tillagt i sin profil." },
      { heading: "Kontodetaljer", text: "SportsGamer-kontonamn, PSN-ID / Gamertag och spelarnamn får inte vara av stötande, förolämpande, rå eller vulgär natur. SportsGamers personal förbehåller sig rätten att begära att spelarna ändrar dessa uppgifter om de anses olämpliga." },
      { heading: "Acceptera regler", text: "Genom att gå med i ett lag som är registrerat för en cup accepterar spelaren dessa regler." },
      { heading: "Antal konton", text: "Ingen spelare får ha mer än ett konto på SportsGamer.gg. Detta konto kan användas för att spela på olika konsoler och i olika ligor/turneringar samtidigt så länge som spelaren har sitt PSN-ID / Gamertag inställt på sin SportsGamer-profil." },
      { heading: "Konto i samma hushåll", text: "Om flera spelare använder sina konton från samma IP-adress, till exempel syskon som bor i samma hem, är dessa spelare skyldiga att omedelbart informera en administratör om dessa villkor." },
      { heading: "Playercard", text: "Det namn och nummer som en spelare har angett på sitt Playercard på SportsGamer måste stämma överens med det namn och nummer som spelaren har i spelet. Dessutom måste alla spelare i ett lag ha unika nummer jämfört med sina lagkamrater. Alla som deltar i SEC måste ha korrekt nationalitet och stad på sitt playercard synligt. Ålder är frivilligt." }
    ]
  },
  {
    title: "Lagregistrering",
    items: [
      { heading: "Allmänt", text: "Alla registrerade svenska, norska och danska medlemmar har rätt att registrera ett lag för SEC. Lagets registrant kommer att vara inställd som kapten som standard. Lagregistrering är endast möjlig under registreringsperioden." },
      { heading: "Registrering", text: "Registreringar är slutgiltiga när anmälningstiden har passerat och lagen måste delta i den liga/turnering som de har anmält sig till. SportsGamers personal har sista ordet när det gäller att placera lag i divisioner eller grupper, och besluten ska accepteras." },
      { heading: "Dra tillbaka en registrering", text: "För att dra tillbaka en registrering måste kaptenen ta bort lagets anmälan och meddela att de inte längre har för avsikt att anmäla sig. Om laget redan har flyttats till en division måste de dessutom kontakta supporten för att se till att detta inte går obemärkt förbi. Detta är endast möjligt innan anmälningstiden har gått ut." },
      { heading: "Logotyper", text: "Genom att anmäla dig till en liga/turnering som anordnas av SportsGamer samtycker du till att SportsGamer, SportsGamers dotterbolag samt dina motståndare får använda ditt lags logotyp(er) för sändnings- och reklamändamål." },
      { heading: "Sändningsbilder", text: "Genom att anmäla dig till en liga/turnering som anordnas av SportsGamer samtycker du till att SportsGamer och SportsGamers dotterbolag får använda dina egna inskickade bilder för sändnings- och reklamändamål." },
      { heading: "Sponsring", text: "Lag kan skaffa sponsorer om de så önskar. Eventuella sponsorer får dock inte stå i konflikt med SportsGamers värderingar, turneringens huvudsponsor eller cupens arrangör. Dessutom får lagen inte sponsras av företag som är inriktade på alkohol, tobak, spel eller vuxenunderhållning. Cuparrangören förbehåller sig rätten att när som helst utöka dessa begränsningar." }
    ]
  },
  {
    title: "Uppförandekod",
    items: [
      { heading: "Allmänt", text: "Registrerade medlemmar förväntas behandla varandra med respekt genom att inte övergå till alltför kränkande språkbruk. Detta gäller alla cupens konversationer som förs på SportsGamer.gg, eller direkt kommunikation mellan spelare på externa källor om bevis kan tillhandahållas som också inkluderar kontexten för konversationen." },
      { heading: "Försök att kringgå regler", text: "Medlemmar får inte kringgå reglerna, inklusive eventuella försök att göra det, eller lura SportsGamers personal och dess Cup Administration vid någon tidpunkt." }
    ]
  },
  {
    title: "Lagledningens ansvar",
    items: [
      {
        heading: "Allmänt",
        text: "Alla lagledare (C och A) är representanter för hela laget, och som sådana är de ansvariga för:",
        bullets: [
          "Schemalägga matcher.",
          "Se till att deras lag alltid följer Cupens/turneringens regler.",
          "All kommunikation med andra managers och Cupens administration i deras lags namn.",
          "Se till att laget slutför alla sina matcher."
        ]
      }
    ]
  },
  {
    title: "Cupens administration (CA)",
    items: [
      { heading: "Ansvar", text: "Cupens administration är ansvarig för att anordna cupen, upprätthålla reglerna, undersöka eventuella överträdelser och lösa tvister mellan spelare och lag." },
      { heading: "Regeländring(ar)", text: "Cupens administration kan lägga till ytterligare förtydliganden till befintliga regler om det anses nödvändigt. Om Cupens Administration måste behandla ett fall som inte täcks av någon av de befintliga reglerna, kan den lägga till nya regler under en cup för att täcka dessa scenarier. När ett beslut har fattats av CA måste de förse båda parter som är inblandade i ärendet med en förklaring som visar hur de kom fram till sitt beslut, samt vilka regler som åberopades. Cupens administration förbehåller sig rätten att granska och ändra alla regler mitt under säsongen om det behövs." },
      { heading: "Definition av bestraffning", text: "Cupens administration kommer att definiera alla spelar- eller lagbestraffningar enligt deras allvarlighetsgrad, samtidigt som tidigare beslut beaktas för att säkerställa ett välbalanserat beslutsfattande. Tidigare fall som är relaterade till det aktuella beslutet kan citeras och fungera som prejudikat." },
      { heading: "Majoritetsbeslut", text: "Cupens administration måste besluta om sina åtgärder med en majoritetsomröstning. Efter att ett beslut har fattats kommer cupadministrationen alltid att se till att den agerar som en enda enhet och inte avslöjar några enskilda röster för allmänheten. Alla ärenden hanteras så snabbt som möjligt, men det är högst osannolikt att CA kan hantera en tvist på under en timme. Om du känner att en tvist kan uppstå, flagga upp det till CA via supportverktyget så att de kan få en förvarning." },
      { heading: "Kontakt", text: "För att kontakta cupadministrationen måste spelarna använda supportfunktionen och välja SEC Support som avdelning. Dessa meddelanden är endast synliga för cupens Administration-medlemmar och den person som skickade meddelandet. Använd inte privata meddelanden för att skicka meddelanden till enskilda medlemmar i Cup Administration om CA-frågor." }
    ]
  },
  {
    title: "Lagregler",
    items: [
      { heading: "Spelare", text: "Lag får endast använda spelare som är listade i deras officiella laguppställning på SportsGamer.gg huvudsida." },
      { heading: "WO matcher", text: "Lag får lämna WO, men varje enskilt fall avgörs av CA. Genom att ge upp matchen får motståndarlaget en walkover-vinst." },
      { heading: "Annullera matcher", text: "Om en match spelas där en eller flera av de inblandade spelarna inte anses vara lagliga, förbehåller sig CA rätten att eventuellt annullera alla matcher som spelats med nämnda spelare och tilldela WO-segrar till det lag som inte begått överträdelsen." }
    ]
  },
  {
    title: "Fair Play",
    items: [
      {
        heading: "Allmänt",
        text: "Fair Play är den mest grundläggande regeln i alla spel som genomförs inom en liga/turnering på SportsGamer.gg. Det innebär att behandla din motståndare på det sätt du själv vill bli behandlad. Detta inkluderar kommunikation och alla handlingar som är direkt eller indirekt relaterade till spelet.",
        bullets: [
          "Utnyttja inte spelmekanismer eller buggar för att försätta din motståndare i underläge, till exempel statistikexploits, de-sync glitches, frysningar eller liknande.",
          "Distrahera inte din motståndare från spelet, till exempel genom att spamma meddelanden, ringa motståndaren under match eller liknande."
        ]
      }
    ]
  },
  {
    title: "Buggar",
    items: [
      { heading: "Skridskoåkare/målvakter fastnar i frysningar", text: "Det finns en bugg som leder till att spelare, inklusive skridskoåkare och målvakter, fastnar i buggiga och oavsiktliga animationer. Om detta fel uppstår måste lagen rensa pucken så snart de märker det. Vanliga animationer som är avsedda av spelutvecklarna påverkas inte av regeln. Vid oenighet får lagen skicka in videobevis till Cupens Administration för granskning. Avsiktlig, felaktig användning anses vara att utnyttja spelet." },
      { heading: "Initiera slagsmål i en faceoff-situation", text: "Spelare är strängt förbjudna att initiera slagsmål innan pucken släpps i alla divisioner. Detta är för att eliminera den för närvarande obevisade, men spekulerade, fartökningen från att göra en sådan handling." },
      { heading: "Målvakter som lämnar målgården", text: "Med hänvisning till regeln om att inte utnyttja spelmekanik eller buggar för att försätta motståndaren i underläge får målvakter inte lämna målgården i ett försök att störa en skridskoåkare från motståndarlaget. Exempelvideo: https://www.youtube.com/watch?v=ZELueWlZVr4" },
      { heading: "Lagligt hindra en spelare", text: "Skridskoåkare får inte stöta, slå eller aktivt åka i vägen för spelare som inte har pucken. Om du är osäker på om en händelse bör tillåtas, fråga dig själv om du skulle vara nöjd med att vara på mottagarsidan av det du gör. Om inte, gör det inte." },
      { heading: "Fånga en spelare i målet", text: "Målvakten får inte försöka störa en skridskoåkare från motståndarlaget som befinner sig bakom dem i nätet eller sarghörnet genom att vara i vägen så att spelaren inte kan åka skridskor bort." }
    ]
  },
  {
    title: "Schemaläggning",
    items: [
      { heading: "Schemaläggning", text: "Varje match som schemaläggs för ditt lag har en officiell speldag. Lagen är fria att flytta matcher förutsatt att de inte sänds eller är utvalda matcher. Lagen måste kommunicera med sina motståndare före speldagen för att hitta bästa speltid. Lagen rekommenderas att göra detta via webbplatsens PM-system, men om det misslyckas kan ni försöka nå ut via andra plattformar, till exempel Discord. Alla överenskomna schemaändringar ska skickas och accepteras via verktyget för rescheduling." }
    ]
  },
  {
    title: "Diskvalificering och förbjudna spelare",
    items: [
      { heading: "Diskvalificering av lag", text: "Om ett lag diskvalificeras stängs dess lagkaptener, inklusive assistenter, av från cupen. Övriga spelare i laguppställningen är fria att byta till ett annat lag, såvida de inte bevisligen var inblandade i diskvalificeringen av sitt lag. I så fall är de också avstängda. Övergångarna är fortfarande bundna av gällande tidsfrister." },
      { heading: "Förvärv av förbjudna spelare", text: "Lag som plockar upp spelare som för närvarande är förbjudna att spela på SportsGamer kommer att få allvarliga påföljder. Lagkaptenerna kommer att vara avstängda under hela säsongen på SportsGamer och laget kommer att diskvalificeras. För lag som består av tidigare lagkamrater till den avstängda spelaren krävs inga bevis för huruvida de var medvetna eller inte. Antagandet är att tidigare lagkamrater kan identifiera den avstängda spelaren i röstchattpartier eller WhatsApp-grupper." }
    ]
  }
];

function renderSharedSecRules() {
  return `
    <article class="detail-card sec-rulebook-card">
      <div class="section-heading compact">
        <p class="eyebrow">Regelverk</p>
        <h2>Gemensamma SEC-regler</h2>
      </div>
      <div class="sec-rulebook-list">
        ${SEC_SHARED_RULE_SECTIONS.map(renderSharedSecRuleSection).join("")}
      </div>
    </article>
  `;
}

function renderSharedSecRuleSection(section, index) {
  return `
    <details class="sec-rulebook-section" ${index === 0 ? "open" : ""}>
      <summary>${escapeHtml(section.title)}</summary>
      <div class="sec-rulebook-content">
        ${section.items.map(renderSharedSecRuleItem).join("")}
      </div>
    </details>
  `;
}

function renderSharedSecRuleItem(item) {
  return `
    <div class="sec-rulebook-item">
      <h3>${escapeHtml(item.heading)}</h3>
      <p>${renderRuleInlineText(item.text)}</p>
      ${Array.isArray(item.bullets) && item.bullets.length ? `
        <ul>
          ${item.bullets.map(function(bullet) { return `<li>${renderRuleInlineText(bullet)}</li>`; }).join("")}
        </ul>
      ` : ""}
    </div>
  `;
}
function renderCupRules(cup) {
  const settings = cup.settings || createDefaultCupSettings();
  const bestOfItems = [
    ["Åttondelsfinal", settings.bestOf.roundOf16],
    ["Kvartsfinal", settings.bestOf.quarter],
    ["Semifinal", settings.bestOf.semi],
    ["Final", settings.bestOf.final]
  ].filter(function(item) {
    return item[1];
  });
  const infoItems = splitSettingsInfo(settings.info);

  return `
    <section class="rules-shell">
      <div class="section-heading">
        <p class="eyebrow">Regler</p>
        <h2>${escapeHtml(cup.code)} regler</h2>
      </div>
      <div class="rules-grid">
        <article class="detail-card">
          <div class="section-heading compact">
            <p class="eyebrow">Format</p>
            <h2>Turnering</h2>
          </div>
          <div class="simple-list">
            <div class="simple-list-item">${settings.playoffCut1 ? `Slutspelsstreck: topp ${escapeHtml(settings.playoffCut1)}${settings.playoffCut2 ? " / " + escapeHtml(settings.playoffCut2) : ""}.` : "Slutspelsstreck saknas i cupdatan."}</div>
            ${bestOfItems.length ? bestOfItems.map(function(item) {
              return `<div class="simple-list-item">${escapeHtml(item[0])}: Bäst av ${escapeHtml(item[1])}</div>`;
            }).join("") : `<div class="simple-list-item">Best of saknas i cupdatan.</div>`}
          </div>
        </article>

        <article class="detail-card">
          <div class="section-heading compact">
            <p class="eyebrow">Krav</p>
            <h2>Spelare</h2>
          </div>
          <div class="simple-list">
            <div class="simple-list-item">Minst antal spelare: ${settings.minPlayers ? escapeHtml(settings.minPlayers) : "Ej angivet"}</div>
            <div class="simple-list-item">Max antal spelare: ${settings.maxPlayers ? escapeHtml(settings.maxPlayers) : "Ej angivet"}</div>
            ${renderRuleListItem({
              label: "Behörighet",
              text: settings.eligibility ? stripRuleLabel(settings.eligibility, "Behörighet") : "Ej angivet"
            })}
          </div>
        </article>

        <article class="detail-card">
          <div class="section-heading compact">
            <p class="eyebrow">Sortering</p>
            <h2>Tabellordning</h2>
          </div>
          <div class="simple-list">
            <div class="simple-list-item">Tabellen sorteras på poäng, målskillnad och gjorda mål.</div>
          </div>
        </article>

        <article class="detail-card">
          <div class="section-heading compact">
            <p class="eyebrow">Cupinfo</p>
            <h2>Extra info</h2>
          </div>
          <div class="simple-list">
            ${infoItems.length ? infoItems.map(function(item) {
              return renderRuleListItem({ label: "", text: item });
            }).join("") : `<div class="simple-list-item">Ingen extra info finns angiven för cupen.</div>`}
          </div>
        </article>
      </div>
      ${renderSharedSecRules()}
    </section>
  `;
}

function renderMatchCollection(title, matches, cup) {
  return `
    <section class="stage-block" data-match-stage-block>
      <div class="stage-block-header">
        <div>
          <p class="eyebrow">${escapeHtml(title)}</p>
          <h2>${escapeHtml(title)} matcher</h2>
        </div>
        <span class="pill" data-match-count-pill>${matches.length} st</span>
      </div>
      <div class="stack-grid">
        ${matches.map(function(match) {
          return renderMatchCard(match, cup);
        }).join("")}
      </div>
    </section>
  `;
}

function renderMatchCard(match, cup) {
  return `
    <a
      class="match-card"
      href="${getMatchUrl(cup, match)}"
      data-match-card
      data-match-away-team="${escapeHtml(match.awayTeam)}"
      data-match-home-team="${escapeHtml(match.homeTeam)}"
      data-match-group="${escapeHtml(getMatchFilterGroupLabel(match))}"
    >
      <div class="match-header">
        <div>
          <p class="entity-label">${escapeHtml(match.group || "Match")}</p>
          <strong>${escapeHtml(formatMatchDate(match.date, match.time))}</strong>
        </div>
        <span class="pill">${match.stage === "playoffs" ? "Slutspel" : "Gruppspel"}${match.overtime ? " OT" : ""}</span>
      </div>
      <div class="match-score">
        ${renderTeamIdentityStatic(match.awayTeam)}
        <strong>${displayScore(match.awayScore)} - ${displayScore(match.homeScore)}</strong>
        ${renderTeamIdentityStatic(match.homeTeam)}
      </div>
      <span class="match-card-cta">Visa matchinfo</span>
    </a>
  `;
}

function renderCompactMatchLink(cup, match) {
  return `
    <a class="simple-list-item match-list-link" href="${getMatchUrl(cup, match)}">
      <span>${escapeHtml(match.group || (match.stage === "playoffs" ? "Slutspel" : "Gruppspel"))}</span>
      <strong>${escapeHtml(match.awayTeam)} ${displayScore(match.awayScore)}-${displayScore(match.homeScore)} ${escapeHtml(match.homeTeam)}</strong>
    </a>
  `;
}

function getMatchUrl(cup, match) {
  return "#/match/" + encodeURIComponent(cup.id) + "/" + encodeURIComponent(match.id);
}

function renderStatsTable(columns, rows) {
  if (!rows.length) {
    return `<div class="empty-state">Ingen data finns an.</div>`;
  }

  const tableId = "stats-table-" + String(tableIdCounter++);

  return `
    <div class="table-wrap">
      <table class="stats-table" data-sortable-table="${tableId}">
        <thead>
          <tr>${columns.map(function(column, index) {
            const label = typeof column === "string" ? column : column.label;
            const sortable = typeof column === "string" ? true : column.sortable !== false;

            if (!sortable) {
              return `<th>${escapeHtml(String(label))}</th>`;
            }

            return `
              <th>
                <button
                  class="stats-sort-button"
                  type="button"
                  data-sort-button="${tableId}"
                  data-column-index="${index}"
                  aria-label="Sortera ${escapeHtml(String(label))}"
                >
                  <span>${escapeHtml(String(label))}</span>
                  <span class="stats-sort-icon" aria-hidden="true"></span>
                </button>
              </th>
            `;
          }).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(function(row) {
            return `
              <tr${row._rowClass ? ` class="${escapeHtml(row._rowClass)}"` : ""}${row._search ? ` data-stat-search="${escapeHtml(row._search)}"` : ""}${row._playerIndex ? ` data-player-index-row="true"` : ""}${row._country ? ` data-player-country="${escapeHtml(row._country)}"` : ""}>
                ${columns.map(function(column) {
                  const key = typeof column === "string" ? column : column.key;
                  const cell = toTableCell(row[key]);
                  return `<td data-sort-value="${escapeHtml(cell.sort)}">${cell.display}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderGlobalSearchModule() {
  return `
    <div class="player-search-centered home-search">
      <div class="search-title">Sok lag &amp; spelare</div>
      <div class="search-wrapper">
        <input id="globalSearch" placeholder="Sok lag eller spelare" autocomplete="off" aria-label="Sok lag eller spelare">
        <div id="globalResults" role="listbox" aria-label="Sokresultat"></div>
      </div>
    </div>
  `;
}

function renderLoadingState(message) {
  return `
    <section class="tab-panel">
      <h2>Laddar</h2>
      <div class="cup-status">${escapeHtml(message || "Hamtar SEC-data...")}</div>
    </section>
  `;
}

function renderNotFound(message) {
  return `
    <section class="section">
      <div class="empty-state">${escapeHtml(message)}</div>
    </section>
  `;
}

function renderErrorState(message) {
  return `
    <section class="section">
      <div class="empty-state">${escapeHtml(message)}</div>
    </section>
  `;
}

function setView(html) {
  if (!appView) {
    return;
  }
  appView.innerHTML = html;
  bindViewInteractions();
}

function bindViewInteractions() {
  bindCupCardLinks();
  bindGlobalSearch();
  bindCupTabs();
  bindTeamTabs();
  bindSignupTabs();
  bindTeamStatControls();
  bindTeamHistoryStatControls();
  bindSignupForms();
  loadSummerDraftPlayers();
  loadRegisteredTeams();
  bindCupStatControls();
  bindCupMatchFilters();
  bindSortableTables();
  bindPlayerIndexControls();
}

function bindSortableTables() {
  Array.from(document.querySelectorAll("[data-sort-button]")).forEach(function(button) {
    if (button.dataset.bound === "true") {
      return;
    }

    button.dataset.bound = "true";

    button.addEventListener("click", function() {
      const tableId = button.getAttribute("data-sort-button");
      const columnIndex = Number(button.getAttribute("data-column-index"));
      const table = document.querySelector('[data-sortable-table="' + tableId + '"]');

      if (!table) {
        return;
      }

      const tbody = table.querySelector("tbody");
      const buttons = Array.from(document.querySelectorAll('[data-sort-button="' + tableId + '"]'));
      const currentDirection = button.dataset.sortDirection === "asc" ? "asc" : button.dataset.sortDirection === "desc" ? "desc" : "";
      const nextDirection = currentDirection === "asc" ? "desc" : "asc";
      const rows = Array.from(tbody.querySelectorAll("tr"));

      rows.sort(function(leftRow, rightRow) {
        const leftCell = leftRow.children[columnIndex];
        const rightCell = rightRow.children[columnIndex];
        const leftValue = leftCell ? leftCell.getAttribute("data-sort-value") || "" : "";
        const rightValue = rightCell ? rightCell.getAttribute("data-sort-value") || "" : "";
        const comparison = compareSortValues(leftValue, rightValue);
        return nextDirection === "asc" ? comparison : -comparison;
      });

      rows.forEach(function(row) {
        tbody.appendChild(row);
      });

      const playerIndexControls = table.closest(".player-index-card")?.querySelector("[data-player-index-controls]");
      if (playerIndexControls) {
        applyPlayerIndexFilters(playerIndexControls);
      }

      buttons.forEach(function(entry) {
        entry.dataset.sortDirection = "";
        entry.setAttribute("aria-sort", "none");
        entry.classList.remove("is-active");
      });

      button.dataset.sortDirection = nextDirection;
      button.setAttribute("aria-sort", nextDirection === "asc" ? "ascending" : "descending");
      button.classList.add("is-active");
    });
  });
}

function bindPlayerIndexControls() {
  const controls = document.querySelector("[data-player-index-controls]");
  if (!controls || controls.dataset.bound === "true") {
    return;
  }

  controls.dataset.bound = "true";
  const searchInput = controls.querySelector("[data-player-search]");
  const countrySelect = controls.querySelector("[data-player-country]");
  const limitSelect = controls.querySelector("[data-player-limit]");

  [searchInput, countrySelect, limitSelect].forEach(function(control) {
    control?.addEventListener("input", function() { applyPlayerIndexFilters(controls); });
    control?.addEventListener("change", function() { applyPlayerIndexFilters(controls); });
  });

  applyPlayerIndexFilters(controls);
}

function applyPlayerIndexFilters(controls) {
  if (!controls) {
    return;
  }

  const card = controls.closest(".player-index-card") || document;
  const rows = Array.from(card.querySelectorAll("[data-player-index-row]"));
  const searchInput = controls.querySelector("[data-player-search]");
  const countrySelect = controls.querySelector("[data-player-country]");
  const limitSelect = controls.querySelector("[data-player-limit]");
  const countEl = controls.querySelector("[data-player-count]");
  const query = slugify(searchInput?.value || "");
  const country = String(countrySelect?.value || "").trim().toUpperCase();
  const limitValue = String(limitSelect?.value || "10");
  const limit = limitValue === "all" ? Infinity : Number(limitValue) || 10;
  let matched = 0;
  let shown = 0;

  rows.forEach(function(row) {
    const rowSearch = slugify(row.getAttribute("data-stat-search") || "");
    const rowCountry = String(row.getAttribute("data-player-country") || "").trim().toUpperCase();
    const isMatch = (!query || rowSearch.indexOf(query) !== -1) && (!country || rowCountry === country);

    if (!isMatch) {
      row.hidden = true;
      return;
    }

    matched += 1;
    const shouldShow = shown < limit;
    row.hidden = !shouldShow;
    if (shouldShow) {
      shown += 1;
    }
  });

  if (countEl) {
    countEl.textContent = matched
      ? "Visar " + shown + " av " + matched + " spelare"
      : "Inga spelare matchar filtret";
  }
}
function bindCupCardLinks() {
  Array.from(document.querySelectorAll("[data-cup-link]")).forEach(function(card) {
    if (card.dataset.bound === "true") {
      return;
    }

    card.dataset.bound = "true";
    const href = card.getAttribute("data-cup-link");

    card.addEventListener("click", function(event) {
      if (event.target && event.target.closest("a")) {
        return;
      }
      window.location.hash = href.replace(/^#/, "");
    });

    card.addEventListener("keydown", function(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.hash = href.replace(/^#/, "");
      }
    });
  });
}

function bindGlobalSearch() {
  const input = document.getElementById("globalSearch");
  const results = document.getElementById("globalResults");

  if (!input || !results || input.dataset.bound === "true") {
    return;
  }

  input.dataset.bound = "true";

  const teamItems = state.teams.map(function(team) {
    return {
      type: "team",
      label: team.name,
      href: "#/team/" + encodeURIComponent(team.key),
      meta: formatTeamSearchCups(team)
    };
  });
  let playerItems = state.playersReady ? createSearchPlayerItems() : [];

  function createSearchPlayerItems() {
    return state.players.map(function(player) {
      return {
        type: "player",
        label: player.name,
        href: "#/player/" + encodeURIComponent(player.key),
        meta: getLatestPlayerTeam(player) || "Spelare"
      };
    });
  }

  function closeResults() {
    results.style.display = "none";
    results.innerHTML = "";
  }

  input.addEventListener("input", function() {
    const query = slugify(input.value);

    if (!query) {
      closeResults();
      return;
    }

    const matchedTeams = teamItems.filter(function(item) {
      return slugify(item.label).indexOf(query) !== -1;
    });

    if (!matchedTeams.length && !state.playersReady) {
      ensurePlayersReady().then(function() {
        playerItems = createSearchPlayerItems();
        input.dispatchEvent(new Event("input"));
      });
    }

    const matchedPlayers = playerItems.filter(function(item) {
      return slugify(item.label).indexOf(query) !== -1;
    });
    const matched = (matchedTeams.length ? matchedTeams : matchedPlayers).slice(0, 20);

    if (!matched.length) {
      if (!state.playersReady) {
        results.innerHTML = `<div class="search-item is-muted"><div>Bygger spelarregister...</div><div class="search-pill">Spelare</div></div>`;
        results.style.display = "block";
        return;
      }
      closeResults();
      return;
    }

    results.innerHTML = matched.map(function(item) {
      return `
        <div class="search-item" role="option" data-href="${escapeHtml(item.href)}">
          <div>
            <div>${escapeHtml(item.label)}</div>
            <div class="search-sub">${escapeHtml(item.meta)}</div>
          </div>
          <div class="search-pill">${item.type === "team" ? "Lag" : "Spelare"}</div>
        </div>
      `;
    }).join("");

    results.style.display = "block";

    Array.from(results.querySelectorAll(".search-item")).forEach(function(element) {
      element.addEventListener("click", function() {
        window.location.hash = element.dataset.href.replace(/^#/, "");
      });
    });
  });

  document.addEventListener("click", function(event) {
    if (!results.contains(event.target) && event.target !== input) {
      closeResults();
    }
  });
}

function formatTeamSearchCups(team) {
  const cups = (team.cups || []).slice().sort(function(a, b) {
    return inferSortOrder(a.id) - inferSortOrder(b.id);
  });
  if (!cups.length) {
    return "Lag";
  }
  return cups.map(function(cup) {
    return cup.code;
  }).join(", ");
}

function bindCupTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-cup-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-cup-panel]"));

  if (!tabs.length || !panels.length) {
    return;
  }

  tabs.forEach(function(tab) {
    if (tab.dataset.bound === "true") {
      return;
    }

    tab.dataset.bound = "true";

    tab.addEventListener("click", function() {
      activateCupTab(tab.getAttribute("data-cup-tab"));
    });
  });
}

function activateCupTab(target) {
  const tabs = Array.from(document.querySelectorAll("[data-cup-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-cup-panel]"));

  if (!target || !tabs.length || !panels.length) {
    return;
  }

  state.activeCupTab = target;

  tabs.forEach(function(button) {
    const active = button.getAttribute("data-cup-tab") === target;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  panels.forEach(function(panel) {
    const active = panel.getAttribute("data-cup-panel") === target;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

function bindTeamTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-team-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-team-panel]"));

  if (!tabs.length || !panels.length) {
    return;
  }

  tabs.forEach(function(tab) {
    if (tab.dataset.bound === "true") {
      return;
    }

    tab.dataset.bound = "true";

    tab.addEventListener("click", function() {
      const target = tab.getAttribute("data-team-tab");

      tabs.forEach(function(button) {
        const active = button.getAttribute("data-team-tab") === target;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(function(panel) {
        const active = panel.getAttribute("data-team-panel") === target;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    });
  });
}

function bindSignupTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-signup-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-signup-panel]"));

  if (!tabs.length || !panels.length) {
    return;
  }

  tabs.forEach(function(tab) {
    if (tab.dataset.bound === "true") {
      return;
    }

    tab.dataset.bound = "true";

    tab.addEventListener("click", function() {
      const target = tab.getAttribute("data-signup-tab");

      tabs.forEach(function(button) {
        const active = button.getAttribute("data-signup-tab") === target;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(function(panel) {
        const active = panel.getAttribute("data-signup-panel") === target;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      if (target === "spelare") {
        loadSummerDraftPlayers(true);
      } else if (target === "lag") {
        loadRegisteredTeams(true);
      }
    });
  });
}

function bindTeamStatControls() {
  const shell = document.querySelector("[data-team-stat-shell]");

  if (!shell || shell.dataset.bound === "true") {
    return;
  }

  shell.dataset.bound = "true";

  const buttons = Array.from(shell.querySelectorAll("[data-team-stat-stage]"));
  const panels = Array.from(shell.querySelectorAll("[data-team-stat-panel]"));

  buttons.forEach(function(button) {
    button.addEventListener("click", function() {
      const target = button.getAttribute("data-team-stat-stage");

      buttons.forEach(function(entry) {
        const active = entry.getAttribute("data-team-stat-stage") === target;
        entry.classList.toggle("is-active", active);
        entry.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(function(panel) {
        const active = panel.getAttribute("data-team-stat-panel") === target;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      bindSortableTables();
    });
  });
}

function bindTeamHistoryStatControls() {
  const shell = document.querySelector("[data-team-history-stat-shell]");

  if (!shell || shell.dataset.bound === "true") {
    return;
  }

  shell.dataset.bound = "true";

  const buttons = Array.from(shell.querySelectorAll("[data-team-history-stat-stage]"));
  const panels = Array.from(shell.querySelectorAll("[data-team-history-stat-panel]"));

  buttons.forEach(function(button) {
    button.addEventListener("click", function() {
      const target = button.getAttribute("data-team-history-stat-stage");

      buttons.forEach(function(entry) {
        const active = entry.getAttribute("data-team-history-stat-stage") === target;
        entry.classList.toggle("is-active", active);
        entry.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(function(panel) {
        const active = panel.getAttribute("data-team-history-stat-panel") === target;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      bindSortableTables();
    });
  });
}

function bindSignupForms() {
  Array.from(document.querySelectorAll("[data-signup-kind]")).forEach(function(form) {
    if (form.dataset.bound === "true") {
      return;
    }

    form.dataset.bound = "true";
    form.addEventListener("submit", handleSignupSubmit);
  });
}

async function loadSummerDraftPlayers(force) {
  const target = document.querySelector("[data-summer-draft-players]");
  if (!target || (!force && target.dataset.loaded === "true")) {
    return;
  }

  if (!DATA_SOURCES.signupApi) {
    target.innerHTML = `<div class="empty-state">Ingen anmälnings-URL är inställd i config.js.</div>`;
    target.dataset.loaded = "true";
    return;
  }

  target.innerHTML = `<div class="empty-state">Laddar anmälda spelare...</div>`;

  try {
    const url = DATA_SOURCES.signupApi + "?view=summer-draft&_t=" + Date.now();
    const result = await fetchJsonWithJsonpFallback(url);

    if (!result || result.ok === false) {
      throw new Error(result?.error || "Kunde inte läsa spelarlistan.");
    }

    const players = Array.isArray(result.players) ? result.players : [];
    target.dataset.loaded = "true";

    if (!players.length) {
      target.innerHTML = `<div class="empty-state">Inga spelare är anmälda än.</div>`;
      return;
    }

    target.innerHTML = `
      <div class="table-wrap signup-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Spelare</th>
              <th>Nationalitet</th>
              <th>Position</th>
              <th>Discord</th>
            </tr>
          </thead>
          <tbody>
            ${players.map(function(player) {
              const primary = player.primaryPosition || player["Primar position"] || "";
              const secondary = player.secondaryPosition || player["Sekundar position"] || "";
              const position = secondary ? primary + " / " + secondary : primary;
              return `
                <tr>
                  <td>${escapeHtml(player.gamertag || player.Gamertag || "")}</td>
                  <td>${escapeHtml(player.nationality || player.Nationalitet || "")}</td>
                  <td>${escapeHtml(position)}</td>
                  <td>${escapeHtml(player.discord || player.Discord || "")}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    target.dataset.loaded = "true";
    target.innerHTML = `<div class="empty-state">Kunde inte ladda anmälda spelare: ${escapeHtml(error.message || String(error))}</div>`;
  }
}

async function loadRegisteredTeams(force) {
  const target = document.querySelector("[data-registered-teams]");
  if (!target || (!force && target.dataset.loaded === "true")) {
    return;
  }

  if (!DATA_SOURCES.signupApi) {
    target.innerHTML = `<div class="empty-state">Ingen anmälnings-URL är inställd i config.js.</div>`;
    target.dataset.loaded = "true";
    return;
  }

  target.innerHTML = `<div class="empty-state">Laddar anmälda lag...</div>`;

  try {
    const url = DATA_SOURCES.signupApi + "?view=teams&_t=" + Date.now();
    const result = await fetchJsonWithJsonpFallback(url);

    if (!result || result.ok === false) {
      throw new Error(result?.error || "Kunde inte läsa laglistan.");
    }

    const teams = Array.isArray(result.teams) ? result.teams : [];
    target.dataset.loaded = "true";

    if (!teams.length) {
      target.innerHTML = `<div class="empty-state">Inga lag är anmälda än.</div>`;
      return;
    }

    target.innerHTML = `
      <div class="registered-team-grid">
        ${teams.map(function(team) {
          const captains = [team.captain, team.assistant1, team.assistant2].filter(Boolean).join(", ");
          const players = Array.isArray(team.players) ? team.players.length : 0;
          const logo = renderRegisteredTeamLogo(team);

          return `
            <article class="registered-team-card">
              ${logo}
              <div>
                <h3>${escapeHtml(team.teamName || "Lag")}</h3>
                <p>${escapeHtml(team.abbr || "")}</p>
                <p>${players} spelare</p>
                <p>${escapeHtml(captains)}</p>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  } catch (error) {
    target.dataset.loaded = "true";
    target.innerHTML = `<div class="empty-state">Kunde inte ladda anmälda lag: ${escapeHtml(error.message || String(error))}</div>`;
  }
}

function renderRegisteredTeamLogo(team) {
  const teamName = team?.teamName || "Lag";
  const uploadedLogo = normalizeSignupLogoUrl(team?.logo);

  if (uploadedLogo) {
    const attrs = renderImageFallbackAttributes([uploadedLogo].concat(getTeamLogoUrlCandidates(teamName)));
    return `
      <div class="registered-team-logo">
        <img ${attrs} alt="${escapeHtml(teamName)} logga" loading="lazy">
      </div>
    `;
  }

  return `<div class="registered-team-logo registered-team-logo-existing">${renderTeamLogo(teamName, "team-logo-md")}</div>`;
}

function normalizeSignupLogoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return "";
  }

  const idMatch =
    raw.match(/[?&]id=([^&]+)/i) ||
    raw.match(/\/file\/d\/([^/]+)/i) ||
    raw.match(/\/open\?id=([^&]+)/i);

  if (idMatch && idMatch[1]) {
    return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(idMatch[1]) + "&sz=w300";
  }

  return raw;
}

async function fetchJsonWithJsonpFallback(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    const result = safeJsonParse(text);

    if (!response.ok || !result) {
      throw new Error(result?.error || "Failed to fetch");
    }

    return result;
  } catch (error) {
    return fetchJsonp(url);
  }
}

function fetchJsonp(url) {
  return new Promise(function(resolve, reject) {
    const callbackName = "__secSignupCallback" + Date.now() + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";
    const timeout = window.setTimeout(function() {
      cleanup();
      reject(new Error("Kunde inte läsa från Apps Script."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Apps Script kunde inte laddas."));
    };

    script.src = url + separator + "callback=" + encodeURIComponent(callbackName);
    document.head.appendChild(script);
  });
}

async function handleSignupSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const kind = form.getAttribute("data-signup-kind") || "";
  const status = form.querySelector("[data-signup-status]");
  const submit = form.querySelector(".signup-submit");

  setSignupStatus(status, "", "");

  if (!DATA_SOURCES.signupApi) {
    setSignupStatus(status, "err", "Ingen anmälnings-URL är inställd i config.js.");
    return;
  }

  const payload = collectSignupPayload(form, kind);
  const validationError = validateSignupPayload(payload, kind);

  if (validationError) {
    setSignupStatus(status, "err", validationError);
    return;
  }

  if (submit) {
    submit.disabled = true;
    submit.textContent = "Skickar...";
  }

  try {
    const logoPayload = kind === "team" ? await getSignupLogoPayload(form) : {};
    const response = await fetch(DATA_SOURCES.signupApi, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        ...payload,
        ...logoPayload
      })
    });
    const text = await response.text();
    const result = safeJsonParse(text);

    if (!response.ok || result?.ok === false) {
      throw new Error(result?.error || "Kunde inte skicka anmälan.");
    }

    form.reset();
    if (kind === "summer-draft") {
      const list = document.querySelector("[data-summer-draft-players]");
      if (list) {
        list.dataset.loaded = "false";
      }
      loadSummerDraftPlayers(true);
    } else if (kind === "team") {
      const list = document.querySelector("[data-registered-teams]");
      if (list) {
        list.dataset.loaded = "false";
      }
      loadRegisteredTeams(true);
    }
    setSignupStatus(status, "ok", "Anmälan skickad. Tack!");
  } catch (error) {
    let message = error.message || String(error);
    if (kind === "summer-draft" && /lagnamn|anmalningskod|anm.lningskod|kapten/i.test(message)) {
      message = "Apps Scriptet är fortfarande inställt på laganmälan. Uppdatera Apps Scriptet så det hanterar signupType=summer-draft.";
    }
    setSignupStatus(status, "err", "Kunde inte skicka anmälan: " + message);
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Skicka anmälan";
    }
  }
}

function collectSignupPayload(form, kind) {
  const data = new FormData(form);
  const payload = {
    signupType: kind,
    submittedAt: new Date().toISOString()
  };

  data.forEach(function(value, key) {
    if (value instanceof File) {
      return;
    }
    payload[key] = normalizeText(value);
  });

  if (kind === "team") {
    payload.cup = "SEC 21";
    payload.tournament = "SEC 21";
    payload.abbr = String(payload.abbr || "").toUpperCase();
    payload.players = Array.from({ length: 12 }, function(_, index) {
      return normalizeText(payload["player" + (index + 1)]);
    }).filter(Boolean);
  }

  return payload;
}

function validateSignupPayload(payload, kind) {
  if (payload.website) {
    return "Något gick fel. Försök igen.";
  }

  if (!payload.email) {
    return "E-postadress saknas.";
  }

  if (kind === "team") {
    if (!payload.signupCode) {
      return "Anmälningskod saknas.";
    }
    if (!payload.teamName) {
      return "Lagnamn saknas.";
    }
    if (!payload.abbr || payload.abbr.length < 2 || payload.abbr.length > 3) {
      return "Förkortning måste vara 2-3 tecken.";
    }
    if (!payload.captain || !payload.assistant1 || !payload.assistant2) {
      return "Kapten och två assisterande kaptener måste fyllas i.";
    }
    if (!payload.players || payload.players.length < 8) {
      return "Minst 8 spelare krävs.";
    }
    if (payload.players.length > 12) {
      return "Max 12 spelare är tillåtet.";
    }
  }

  if (kind === "summer-draft") {
    if (!payload.gamertag) {
      return "Gamertag saknas.";
    }
    if (!payload.nationality) {
      return "Nationalitet saknas.";
    }
    if (!payload.primaryPosition) {
      return "Primär position saknas.";
    }
  }

  return "";
}

async function getSignupLogoPayload(form) {
  const fileInput = form.querySelector("[data-signup-logo]");
  const file = fileInput?.files?.[0];

  if (!file) {
    return {};
  }

  if (!["image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("Laglogga måste vara PNG eller JPG.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Laglogga får vara max 2 MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  return {
    logoData: dataUrl.split(",")[1] || "",
    logoMime: file.type,
    logoName: file.name
  };
}

function readFileAsDataUrl(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onerror = function() {
      reject(new Error("Kunde inte läsa filen."));
    };
    reader.onload = function() {
      resolve(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  });
}

function setSignupStatus(element, type, message) {
  if (!element) {
    return;
  }

  element.className = "signup-status" + (type ? " " + type : "");
  element.textContent = message || "";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function bindCupStatControls() {
  const shell = document.querySelector("[data-cup-stat-shell]");

  if (!shell || shell.dataset.bound === "true") {
    return;
  }

  shell.dataset.bound = "true";

  const typeButtons = Array.from(shell.querySelectorAll("[data-cup-stat-type]"));
  const stageButtons = Array.from(shell.querySelectorAll("[data-cup-stat-stage]"));
  const panels = Array.from(shell.querySelectorAll("[data-cup-stat-panel]"));
  const search = shell.querySelector("[data-cup-stat-search]");
  let activeType = "players";
  let activeStage = "group";

  function applyState() {
    typeButtons.forEach(function(button) {
      const active = button.getAttribute("data-cup-stat-type") === activeType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    stageButtons.forEach(function(button) {
      const active = button.getAttribute("data-cup-stat-stage") === activeStage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach(function(panel) {
      const active = panel.getAttribute("data-cup-stat-panel") === activeType + "-" + activeStage;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });

    filterCupStatRows();
  }

  function filterCupStatRows() {
    const query = slugify(search?.value || "");
    panels.forEach(function(panel) {
      const rows = Array.from(panel.querySelectorAll("tbody tr[data-stat-search]"));
      const empty = panel.querySelector("[data-cup-stat-empty]");
      let visibleRows = 0;

      rows.forEach(function(row) {
        const matched = !query || slugify(row.getAttribute("data-stat-search") || "").indexOf(query) !== -1;
        row.hidden = !matched;
        if (matched) {
          visibleRows += 1;
        }
      });

      if (empty) {
        empty.hidden = !rows.length || visibleRows > 0 || panel.hidden;
      }
    });
  }

  typeButtons.forEach(function(button) {
    button.addEventListener("click", function() {
      activeType = button.getAttribute("data-cup-stat-type") || "players";
      applyState();
    });
  });

  stageButtons.forEach(function(button) {
    button.addEventListener("click", function() {
      activeStage = button.getAttribute("data-cup-stat-stage") || "group";
      applyState();
    });
  });

  if (search) {
    search.addEventListener("input", filterCupStatRows);
  }

  applyState();
}

function bindCupMatchFilters() {
  const shell = document.querySelector("[data-match-filter-shell]");

  if (!shell || shell.dataset.bound === "true") {
    return;
  }

  shell.dataset.bound = "true";

  const teamFilter = shell.querySelector("[data-match-team-filter]");
  const groupFilter = shell.querySelector("[data-match-group-filter]");
  const cards = Array.from(document.querySelectorAll("[data-match-card]"));
  const blocks = Array.from(document.querySelectorAll("[data-match-stage-block]"));
  const empty = document.querySelector("[data-match-filter-empty]");

  function applyFilters() {
    const selectedTeam = teamFilter?.value || "";
    const selectedGroup = groupFilter?.value || "";
    let totalVisible = 0;

    cards.forEach(function(card) {
      const teamMatched = !selectedTeam ||
        slugify(card.getAttribute("data-match-away-team") || "") === selectedTeam ||
        slugify(card.getAttribute("data-match-home-team") || "") === selectedTeam;
      const groupMatched = !selectedGroup || slugify(card.getAttribute("data-match-group") || "") === selectedGroup;
      const visible = teamMatched && groupMatched;

      card.hidden = !visible;
      if (visible) {
        totalVisible += 1;
      }
    });

    blocks.forEach(function(block) {
      const visibleCards = Array.from(block.querySelectorAll("[data-match-card]")).filter(function(card) {
        return !card.hidden;
      });
      const pill = block.querySelector("[data-match-count-pill]");
      block.hidden = visibleCards.length === 0;
      if (pill) {
        pill.textContent = visibleCards.length + " st";
      }
    });

    if (empty) {
      empty.hidden = totalVisible > 0 || cards.length === 0;
    }
  }

  if (teamFilter) {
    teamFilter.addEventListener("change", applyFilters);
  }
  if (groupFilter) {
    groupFilter.addEventListener("change", applyFilters);
  }

  applyFilters();
}

function updateNavState(route) {
  const active = route.type === "home" ? "#/" :
    route.type === "cups" || route.type === "cup" || route.type === "match" ? "#/cups" :
    route.type === "teams" || route.type === "team" ? "#/teams" :
    route.type === "players" || route.type === "player" ? "#/players" : "#/";

  document.querySelectorAll(".nav__link, .mobile__link").forEach(function(link) {
    const isSecRoot = link.hasAttribute("data-sec-root");
    link.classList.toggle("is-active", isSecRoot || link.getAttribute("href") === active);
  });
}

function splitCupsByCategory(cups) {
  const regular = [];
  const sommar = [];

  cups.forEach(function(cup) {
    const category = getCupCategory(cup);
    if (category === "sommar") {
      sommar.push(cup);
    } else {
      regular.push(cup);
    }
  });

  return {
    regular: regular,
    sommar: sommar
  };
}

function getCupCategory(cup) {
  const source = [cup.code, cup.name, cup.badge].join(" ").toLowerCase();
  if (source.indexOf("sommar") !== -1) {
    return "sommar";
  }
  return "regular";
}

function getCupLogoSrc(cup) {
  return getCupCategory(cup) === "sommar" ? "./sommarcuplogga.png" : "./SECLOGGA.png";
}

function getCupSeasonLabel(cup, category) {
  const label = String(cup.code || cup.name || "").trim();
  const match = label.match(/([0-9]+(?:\.[0-9]+)?)/);
  const number = match ? match[1] : "";

  if (category === "sommar") {
    return number ? "SEC Sommar " + number : "SEC Sommar";
  }
  return number ? "SEC " + number : label || "SEC";
}

function getCupDateLine(matches) {
  const dated = (matches || [])
    .map(function(match) { return match.date || ""; })
    .filter(Boolean)
    .sort();

  if (!dated.length) {
    return "-";
  }
  if (dated.length === 1) {
    return dated[0];
  }
  return dated[0] + " -> " + dated[dated.length - 1];
}

function renderEmptyCupState(message) {
  return `<div class="sec-empty-state">${escapeHtml(message)}</div>`;
}

function formatCupHeroTitle(name) {
  const title = String(name || "");
  const match = title.match(/^(.*)\s+(Division\s+\d+)$/i);

  if (!match) {
    return escapeHtml(title);
  }

  return `
    <span class="cup-title-main">${escapeHtml(match[1])}</span>
    <span class="cup-title-division">${escapeHtml(match[2])}</span>
  `;
}

function getCupOverview(cup) {
  const teams = buildCupTeams(cup);
  const groupMatches = cup.matches.filter(function(match) { return match.stage !== "playoffs"; }).sort(compareMatchesDesc);
  const playoffMatches = cup.matches.filter(function(match) { return match.stage === "playoffs"; }).sort(compareMatchesDesc);
  const allPlayerRows = cup.playerStats.group.concat(cup.playerStats.playoffs);
  const allGoalieRows = cup.goalieStats.group.concat(cup.goalieStats.playoffs);
  const teamMatchGames = {
    group: getTeamPlayedGames(cup.matches, "group"),
    playoffs: getTeamPlayedGames(cup.matches, "playoffs")
  };
  const teamGoalieGames = getTeamGoalieGames(allGoalieRows);
  const eligibleGoalies = allGoalieRows.filter(function(row) {
    if (isDnfTeam(row.team, cup)) {
      return false;
    }
    const stage = row.stage === "playoffs" ? "playoffs" : "group";
    const teamKey = createTeamKey(row.team);
    const teamGames = teamGoalieGames[stage].get(teamKey) || teamMatchGames[stage].get(teamKey) || 0;
    if (!teamGames) {
      return false;
    }
    return row.gp >= Math.ceil(teamGames * 0.49);
  });

  return {
    teams: teams,
    groupMatches: groupMatches,
    playoffMatches: playoffMatches,
    topPlayers: allPlayerRows.slice().sort(function(a, b) {
      return b.pts - a.pts || b.g - a.g || a.player.localeCompare(b.player, "sv");
    }).slice(0, 10),
    topGoalies: eligibleGoalies.slice().sort(function(a, b) {
      return safeNumber(b.svp) - safeNumber(a.svp) || safeNumber(a.gaa) - safeNumber(b.gaa);
    }).slice(0, 10)
  };
}

function getTeamGoalieGames(goalieRows) {
  const output = {
    group: new Map(),
    playoffs: new Map()
  };

  goalieRows.forEach(function(row) {
    const stage = row.stage === "playoffs" ? "playoffs" : "group";
    const key = createTeamKey(row.team);
    output[stage].set(key, (output[stage].get(key) || 0) + toNumber(row.gp));
  });

  return output;
}

function isDnfTeam(teamName, cup) {
  const teamText = normalizeText(teamName);
  if (/\bdnf\b/i.test(teamText)) {
    return true;
  }

  const configured = getConfiguredDnfTeams(cup);
  const key = normalizeLookupKey(teamText);
  return configured.some(function(team) {
    return normalizeLookupKey(team) === key;
  });
}

function getConfiguredDnfTeams(cup) {
  const candidates = [
    cup.code,
    cup.id,
    cup.name,
    String(cup.name || "").replace(/^Svenska eHockey Cupen\s*/i, "SEC ")
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const exact = DNF_TEAMS_BY_CUP[candidates[index]];
    if (Array.isArray(exact)) {
      return exact;
    }
  }

  const normalizedEntries = Object.entries(DNF_TEAMS_BY_CUP).find(function(entry) {
    return candidates.some(function(candidate) {
      return normalizeLookupKey(candidate) === normalizeLookupKey(entry[0]);
    });
  });

  return normalizedEntries && Array.isArray(normalizedEntries[1]) ? normalizedEntries[1] : [];
}

function getTeamPlayedGames(matches, stage) {
  const map = new Map();

  matches.forEach(function(match) {
    if (stage === "playoffs" && match.stage !== "playoffs") {
      return;
    }
    if (stage !== "playoffs" && match.stage === "playoffs") {
      return;
    }
    if (match.awayScore === null || match.homeScore === null) {
      return;
    }

    [match.awayTeam, match.homeTeam].forEach(function(teamName) {
      const key = createTeamKey(teamName);
      map.set(key, (map.get(key) || 0) + 1);
    });
  });

  return map;
}

function buildCupTeams(cup) {
  const names = new Set();

  cup.matches.forEach(function(match) {
    names.add(match.homeTeam);
    names.add(match.awayTeam);
  });

  cup.playerStats.group.concat(cup.playerStats.playoffs).forEach(function(row) {
    names.add(row.team);
  });

  cup.goalieStats.group.concat(cup.goalieStats.playoffs).forEach(function(row) {
    names.add(row.team);
  });

  return Array.from(names).map(function(name) {
    return state.teams.find(function(team) {
      return team.key === createTeamKey(name);
    });
  }).filter(Boolean);
}

function buildGroupStandings(matches) {
  const groups = new Map();

  matches.filter(function(match) {
    return match.stage !== "playoffs";
  }).forEach(function(match) {
    const groupName = match.group || "Gruppspel";
    if (!groups.has(groupName)) {
      groups.set(groupName, new Map());
    }

    const standings = groups.get(groupName);
    ingestStandingRow(standings, match.homeTeam, match.homeScore, match.awayScore, match.overtime);
    ingestStandingRow(standings, match.awayTeam, match.awayScore, match.homeScore, match.overtime);
  });

  return Array.from(groups.entries()).map(function(entry) {
    const rows = Array.from(entry[1].values()).sort(function(a, b) {
      return b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team, "sv");
    });

    return {
      name: entry[0],
      rows: rows
    };
  });
}

function buildPlayoffRounds(matches, cup) {
  const playoffMatches = matches.filter(function(match) {
    return match.stage === "playoffs";
  });

  const rounds = new Map();

  playoffMatches.forEach(function(match) {
    const raw = String(match.group || "Slutspel").trim();
    const key = raw.toLowerCase();
    const sortOrder = inferPlayoffRoundOrder(raw);

    if (!rounds.has(key)) {
      rounds.set(key, {
        key: key,
        name: raw,
        sortOrder: sortOrder,
        matches: []
      });
    }

    rounds.get(key).matches.push(match);
  });

  const groupedRounds = Array.from(rounds.values()).sort(function(a, b) {
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "sv");
  });

  if (shouldInferPlayoffRounds(groupedRounds)) {
    return inferPlayoffRoundsFromSeries(playoffMatches, cup);
  }

  return groupedRounds;
}

function shouldInferPlayoffRounds(rounds) {
  if (rounds.length !== 1) {
    return false;
  }

  return isGenericPlayoffRoundName(rounds[0].name);
}

function inferPlayoffRoundsFromSeries(playoffMatches, cup) {
  const series = buildPlayoffSeries(playoffMatches, null).sort(compareSeriesByFirstMatch);
  if (!series.length) {
    return [];
  }

  const finalSeries = series[findFinalSeriesIndex(series, cup)] || series[series.length - 1];
  const roundBySeries = inferSeriesRoundIndexes(series, finalSeries);
  const maxRound = Math.max.apply(null, Array.from(roundBySeries.values()));
  const roundsByIndex = new Map();

  if (finalSeries && roundBySeries.get(finalSeries.seriesKey) !== maxRound) {
    roundBySeries.set(finalSeries.seriesKey, maxRound);
  }

  const finalMaxRound = Math.max.apply(null, Array.from(roundBySeries.values()));

  series.forEach(function(entry) {
    const roundIndex = roundBySeries.get(entry.seriesKey) || 1;
    if (!roundsByIndex.has(roundIndex)) {
      roundsByIndex.set(roundIndex, []);
    }
    roundsByIndex.get(roundIndex).push(entry);
  });

  return Array.from(roundsByIndex.entries()).map(function(entry) {
    const roundIndex = entry[0];
    const roundSeries = entry[1].sort(compareSeriesByFirstMatch);
    const roundName = getInferredRoundName(roundIndex, finalMaxRound, cup);
    const isFinalRound = roundIndex === finalMaxRound;

    return {
      key: createTeamKey(roundName),
      name: roundName,
      sortOrder: inferPlayoffRoundOrder(roundName),
      teamOrderBySeries: isFinalRound ? getFinalTeamOrderBySeries(finalSeries, cup) : {},
      matches: roundSeries.flatMap(function(seriesEntry) {
        return seriesEntry.matches;
      }).sort(compareMatchesAsc)
    };
  }).sort(function(a, b) {
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "sv");
  });
}

function inferSeriesRoundIndexes(series, finalSeries) {
  const distanceBySeries = new Map();
  const finalKey = finalSeries?.seriesKey || "";

  function getDistanceToFinal(entry, stack) {
    if (!entry) {
      return 0;
    }
    if (entry.seriesKey === finalKey) {
      return 0;
    }
    if (distanceBySeries.has(entry.seriesKey)) {
      return distanceBySeries.get(entry.seriesKey);
    }
    if (stack.has(entry.seriesKey)) {
      return 0;
    }

    stack.add(entry.seriesKey);
    const target = findNextSeriesForWinner(entry, series);
    const distance = target ? getDistanceToFinal(target, stack) + 1 : 0;
    stack.delete(entry.seriesKey);
    distanceBySeries.set(entry.seriesKey, distance);
    return distance;
  }

  series.forEach(function(entry) {
    getDistanceToFinal(entry, new Set());
  });

  const maxDistance = Math.max.apply(null, Array.from(distanceBySeries.values()).concat([0]));
  const roundBySeries = new Map();

  series.forEach(function(entry) {
    const distance = entry.seriesKey === finalKey ? 0 : distanceBySeries.get(entry.seriesKey) || 0;
    roundBySeries.set(entry.seriesKey, maxDistance - distance + 1);
  });

  return roundBySeries;
}

function findNextSeriesForWinner(source, series) {
  const candidates = series.filter(function(target) {
    if (target.seriesKey === source.seriesKey) {
      return false;
    }
    if (!seriesIncludesTeam(target, source.winner)) {
      return false;
    }
    return compareSeriesByFirstMatch(target, source) > 0;
  }).sort(compareSeriesByFirstMatch);

  return candidates[0] || null;
}

function getInferredRoundName(roundIndex, maxRound, cup) {
  const stepsFromFinal = maxRound - roundIndex;

  if (stepsFromFinal <= 0) {
    return "Final";
  }
  if (stepsFromFinal === 1) {
    return "Semifinal";
  }
  if (stepsFromFinal === 2) {
    return "Kvartsfinal";
  }
  if (stepsFromFinal === 3) {
    if (hasPlayInFormat(cup)) {
      return "Play in";
    }
    return "Åttondelsfinal";
  }

  return "Slutspel runda " + roundIndex;
}

function hasPlayInFormat(cup) {
  return Boolean(cup?.settings?.playoffCut1 && cup?.settings?.playoffCut2);
}

function findFinalSeriesIndex(series, cup) {
  const winner = cup?.winner || "";
  const runnerUp = cup?.runnerUp || "";

  if (isKnownTeamName(winner) && isKnownTeamName(runnerUp)) {
    const placementIndex = series.findIndex(function(entry) {
      return seriesIncludesTeam(entry, winner) && seriesIncludesTeam(entry, runnerUp);
    });

    if (placementIndex !== -1) {
      return placementIndex;
    }
  }

  let latestIndex = 0;
  series.forEach(function(entry, index) {
    if (compareSeriesByLastMatch(entry, series[latestIndex]) > 0) {
      latestIndex = index;
    }
  });

  return latestIndex;
}

function seriesIncludesTeam(seriesEntry, teamName) {
  const key = createTeamKey(teamName);
  return [seriesEntry.awayTeam, seriesEntry.homeTeam].some(function(name) {
    return createTeamKey(name) === key;
  });
}

function getFinalTeamOrderBySeries(finalSeries, cup) {
  const winner = cup?.winner || "";
  const runnerUp = cup?.runnerUp || "";

  if (!isKnownTeamName(winner) || !isKnownTeamName(runnerUp)) {
    return {};
  }

  if (!seriesIncludesTeam(finalSeries, winner) || !seriesIncludesTeam(finalSeries, runnerUp)) {
    return {};
  }

  return {
    [finalSeries.seriesKey]: [runnerUp, winner]
  };
}

function compareSeriesByLastMatch(a, b) {
  return compareMatchesAsc(getSeriesLastMatch(a), getSeriesLastMatch(b));
}

function compareSeriesByFirstMatch(a, b) {
  return compareMatchesAsc(getSeriesFirstMatch(a), getSeriesFirstMatch(b));
}

function getSeriesFirstMatch(seriesEntry) {
  const sorted = seriesEntry.matches.slice().sort(compareMatchesAsc);
  return sorted[0] || {};
}

function getSeriesLastMatch(seriesEntry) {
  const sorted = seriesEntry.matches.slice().sort(compareMatchesAsc);
  return sorted[sorted.length - 1] || {};
}

function isGenericPlayoffRoundName(name) {
  const value = normalizeLookupKey(name);
  return !value || value === "slutspel" || value === "playoff" || value === "playoffs";
}

function isKnownTeamName(name) {
  const value = normalizeText(name);
  return value && value.toLowerCase() !== "ej klar";
}

function ingestStandingRow(standings, teamName, goalsFor, goalsAgainst, overtime) {
  const key = createTeamKey(teamName);

  if (!standings.has(key)) {
    standings.set(key, {
      team: teamName,
      gp: 0,
      wins: 0,
      otWins: 0,
      otLosses: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0
    });
  }

  const row = standings.get(key);
  row.gp += 1;
  row.goalsFor += toNumber(goalsFor);
  row.goalsAgainst += toNumber(goalsAgainst);
  row.goalDiff = row.goalsFor - row.goalsAgainst;

  if (toNumber(goalsFor) > toNumber(goalsAgainst)) {
    if (overtime) {
      row.otWins += 1;
      row.points += 2;
    } else {
      row.wins += 1;
      row.points += 3;
    }
  } else if (overtime) {
    row.otLosses += 1;
    row.points += 1;
  } else {
    row.losses += 1;
  }
}

function parseRoute() {
  const hash = window.location.hash || "#/";
  const clean = hash.replace(/^#\/?/, "");

  if (!clean) {
    return { type: "home" };
  }

  const parts = clean.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "cups") {
    return { type: "cups" };
  }
  if (parts[0] === "cup" && parts[1]) {
    return { type: "cup", id: parts[1] };
  }
  if (parts[0] === "match" && parts[1] && parts[2]) {
    return { type: "match", cupId: parts[1], matchId: parts[2] };
  }
  if (parts[0] === "teams") {
    return { type: "teams" };
  }
  if (parts[0] === "team" && parts[1]) {
    return { type: "team", id: parts[1], cupId: parts[2] || "" };
  }
  if (parts[0] === "players") {
    return { type: "players" };
  }
  if (parts[0] === "player" && parts[1]) {
    return { type: "player", id: parts[1] };
  }
  if (parts[0] === "anmalan" && parts[1] === "lag") {
    return { type: "signupTeam" };
  }
  if (parts[0] === "anmalan" && parts[1] === "sommar-draft") {
    return { type: "signupSummerDraft" };
  }

  return { type: "home" };
}

function renderCupLink(cupId, label) {
  return `<a href="#/cup/${encodeURIComponent(cupId)}">${escapeHtml(label)}</a>`;
}

function getTeamUrl(teamName, cupId) {
  const base = "#/team/" + encodeURIComponent(createTeamKey(teamName));
  return cupId ? base + "/" + encodeURIComponent(cupId) : base;
}

function renderTeamLink(teamName) {
  return `<a href="${getTeamUrl(teamName)}">${escapeHtml(teamName)}</a>`;
}

function renderPlayerLink(row) {
  return `
    <a class="player-inline-link" href="#/player/${encodeURIComponent(createPlayerKey(row))}">
      ${renderFlag(row.countryCode)}
      <span>${escapeHtml(getDisplayPlayerName(row))}</span>
    </a>
  `;
}

function renderTeamIdentity(teamName, cupId) {
  return `
    <a class="team-identity" href="${getTeamUrl(teamName, cupId)}">
      ${renderTeamLogo(teamName, "team-logo-sm")}
      <span class="team-identity-text">${escapeHtml(teamName)}</span>
    </a>
  `;
}

function renderTeamIdentityStatic(teamName) {
  return `
    <span class="team-identity">
      ${renderTeamLogo(teamName, "team-logo-sm")}
      <span class="team-identity-text">${escapeHtml(teamName)}</span>
    </span>
  `;
}

function renderPlayerIdentity(player) {
  return `
    <a class="player-identity" href="#/player/${encodeURIComponent(player.key)}">
      ${renderFlag(player.countryCode)}
      <span class="player-identity-text">${escapeHtml(player.name)}</span>
    </a>
  `;
}

function renderTeamLogo(teamName, sizeClass) {
  if (!teamName || teamName === "Ej klar") {
    return `<span class="team-logo-wrap ${sizeClass || "team-logo-sm"} is-missing"></span>`;
  }
  const urls = getTeamLogoUrlCandidates(teamName);
  const attrs = renderImageFallbackAttributes(urls);

  return `
    <span class="team-logo-wrap ${sizeClass || "team-logo-sm"}">
      <img
        class="team-logo-image"
        ${attrs}
        alt="${escapeHtml(teamName)} logga"
        loading="lazy"
      >
    </span>
  `;
}

function renderPlayerPortrait(player, sizeClass) {
  const urls = getPlayerImageUrlCandidates(player);

  return `
    <span class="player-portrait-wrap ${sizeClass || "player-portrait-sm"}">
      <img
        class="player-portrait-image"
        ${renderImageFallbackAttributes(urls, getDefaultPlayerImageUrl())}
        alt="${escapeHtml(player.name || player.player)} spelarkort"
        loading="lazy"
      >
    </span>
  `;
}

function renderImageFallbackAttributes(urls, finalFallbackUrl) {
  const safeUrls = uniqueStrings(urls || []).filter(Boolean);
  const firstUrl = safeUrls[0] || finalFallbackUrl || "";
  const fallbacks = safeUrls.slice(1);
  const attrs = [
    `src="${escapeHtml(firstUrl)}"`,
    `data-fallback-srcs="${escapeHtml(JSON.stringify(fallbacks))}"`,
    `onerror="window.SEC_IMAGE_FALLBACK(this);"`
  ];

  if (finalFallbackUrl) {
    attrs.push(`data-final-fallback="${escapeHtml(finalFallbackUrl)}"`);
  }

  return attrs.join(" ");
}

function getTeamLogoUrlCandidates(teamName) {
  const baseUrl = getTeamLogoBaseUrl();
  const names = getAssetNameCandidates([teamName]);
  const matched = resolveIndexedAssetUrl("teamLogos", names, baseUrl);
  const generated = buildAssetUrlCandidates(baseUrl, names, ["png", "jpg", "jpeg", "webp"]);

  return uniqueStrings(matched ? [matched].concat(generated) : generated);
}

function getTeamLogoBaseUrl() {
  return String(window.SEC_CONFIG?.teamLogoBaseUrl || "https://sweehockey-svg.github.io/teamlogos").replace(/\/+$/, "");
}

function getPlayerImageUrlCandidates(player) {
  const baseUrl = getPlayerImageBaseUrl();
  const names = getAssetNameCandidates([
    getDisplayPlayerName(player),
    player?.name,
    player?.displayName,
    player?.rawName,
    player?.player
  ]);
  const matched = resolveIndexedAssetUrl("playerImages", names, baseUrl);
  const generated = buildAssetUrlCandidates(baseUrl, names, ["jpg", "jpeg", "png", "webp"]);

  return uniqueStrings(matched ? [matched].concat(generated) : generated);
}

function getPlayerImageBaseUrl() {
  return String(window.SEC_CONFIG?.playerImageBaseUrl || "https://sweehockey-svg.github.io/players").replace(/\/+$/, "");
}

function getDefaultPlayerImageUrl() {
  return getPlayerImageBaseUrl() + "/1DEFAULTBILDID.jpg";
}

function createAssetFileIndex(files) {
  const index = {
    files: [],
    byBaseKey: new Map(),
    byLooseKey: new Map()
  };

  (files || []).forEach(function(filename) {
    const safeFilename = String(filename || "").split("/").pop().trim();
    if (!safeFilename) {
      return;
    }

    const baseName = safeFilename.replace(/\.[^.]+$/, "");
    const entry = {
      filename: safeFilename,
      baseName: baseName,
      baseKey: normalizeAssetKey(baseName),
      looseKey: normalizeLooseAssetKey(baseName)
    };

    index.files.push(entry);
    if (entry.baseKey && !index.byBaseKey.has(entry.baseKey)) {
      index.byBaseKey.set(entry.baseKey, entry);
    }
    if (entry.looseKey && !index.byLooseKey.has(entry.looseKey)) {
      index.byLooseKey.set(entry.looseKey, entry);
    }
  });

  return index;
}

function resolveIndexedAssetUrl(type, names, baseUrl) {
  const index = state.assetIndexes[type];
  if (!index || !index.files.length) {
    return "";
  }

  const cache = state.assetMatchCache[type];
  const cacheKey = uniqueStrings(names).join("|");
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const file = resolveIndexedAssetFile(index, names);
  const url = file ? buildAssetUrl(baseUrl, file.filename) : "";
  if (cache) {
    cache.set(cacheKey, url);
  }
  return url;
}

function resolveIndexedAssetFile(index, names) {
  const candidates = uniqueStrings(names || []);

  for (let indexName = 0; indexName < candidates.length; indexName += 1) {
    const baseKey = normalizeAssetKey(candidates[indexName]);
    if (index.byBaseKey.has(baseKey)) {
      return index.byBaseKey.get(baseKey);
    }
  }

  for (let indexName = 0; indexName < candidates.length; indexName += 1) {
    const looseKey = normalizeLooseAssetKey(candidates[indexName]);
    if (index.byLooseKey.has(looseKey)) {
      return index.byLooseKey.get(looseKey);
    }
  }

  return findFuzzyAssetFile(index, candidates);
}

function findFuzzyAssetFile(index, names) {
  let best = null;

  names.forEach(function(name) {
    const target = normalizeLooseAssetKey(name);
    if (!target || target.length < 4) {
      return;
    }

    const maxDistance = getFuzzyDistanceLimit(target.length);
    index.files.forEach(function(file) {
      if (!file.looseKey) {
        return;
      }

      const distance = boundedLevenshtein(target, file.looseKey, maxDistance);
      if (distance > maxDistance) {
        return;
      }

      const ratio = distance / Math.max(target.length, file.looseKey.length);
      if (ratio > 0.24) {
        return;
      }

      if (!best || distance < best.distance || (distance === best.distance && file.looseKey.length < best.length)) {
        best = {
          file: file,
          distance: distance,
          length: file.looseKey.length
        };
      }
    });
  });

  return best ? best.file : null;
}

function getFuzzyDistanceLimit(length) {
  if (length <= 5) {
    return 1;
  }
  if (length <= 11) {
    return 2;
  }
  return 3;
}

function boundedLevenshtein(left, right, maxDistance) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, function(_value, index) {
    return index;
  });

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMin = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const value = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost
      );
      current[rightIndex] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }
    previous = current;
  }

  return previous[right.length];
}

function getAssetNameCandidates(values) {
  const rawNames = uniqueStrings(values || [])
    .flatMap(function(value) {
      return getBaseAssetNames(value);
    });
  const expanded = [];

  rawNames.forEach(function(name) {
    getAssetNameVariants(name).forEach(function(variant) {
      expanded.push(variant);
    });
  });

  return uniqueStrings(expanded).slice(0, 80);
}

function getBaseAssetNames(value) {
  const parsed = parsePlayerName(value);
  const text = normalizeText(parsed.name || value);
  if (!text) {
    return [];
  }

  return uniqueStrings([
    text,
    text.replace(/[_-]+/g, " "),
    text.replace(/\s+/g, "_"),
    text.replace(/\s+/g, "-"),
    text.replace(/[._-]+/g, " "),
    text.replace(/\s*\([^)]*\)\s*/g, " "),
    text.replace(/\s+/g, "")
  ]);
}

function getAssetNameVariants(value) {
  const text = normalizeText(value);
  const ascii = removeDiacritics(text);
  const separatorVariants = [
    text,
    text.replace(/[\s-]+/g, "_"),
    text.replace(/[\s_]+/g, "-"),
    text.replace(/[\s_-]+/g, ""),
    ascii,
    ascii.replace(/[\s-]+/g, "_"),
    ascii.replace(/[\s_]+/g, "-"),
    ascii.replace(/[\s_-]+/g, "")
  ];
  const caseVariants = [];

  separatorVariants.forEach(function(variant) {
    caseVariants.push(variant);
    caseVariants.push(variant.toLowerCase());
    caseVariants.push(toTitleCase(variant));
  });

  return uniqueStrings(caseVariants);
}

function buildAssetUrlCandidates(baseUrl, names, extensions) {
  const output = [];
  uniqueStrings(names).forEach(function(name) {
    (extensions || []).forEach(function(extension) {
      output.push(buildAssetUrl(baseUrl, name + "." + extension.replace(/^\./, "")));
    });
  });
  return uniqueStrings(output).slice(0, 120);
}

function buildAssetUrl(baseUrl, filename) {
  return baseUrl.replace(/\/+$/, "") + "/" + encodeURIComponent(filename);
}

function getFileExtension(filename) {
  const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function normalizeAssetKey(value) {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLooseAssetKey(value) {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function removeDiacritics(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/Å/g, "A")
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O");
}

function toTitleCase(value) {
  return String(value || "").replace(/[^\s_-]+/g, function(part) {
    return part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase();
  });
}

function uniqueStrings(values) {
  const seen = new Set();
  const output = [];

  (values || []).forEach(function(value) {
    const text = normalizeText(value);
    if (!text || seen.has(text)) {
      return;
    }
    seen.add(text);
    output.push(text);
  });

  return output;
}

function formatPlayerLabel(player) {
  const team = player.team ? " - " + player.team : "";
  return getDisplayPlayerName(player) + team + " (" + toNumber(player.pts) + " p)";
}

function createCellValue(display, sort) {
  return {
    display: display,
    sort: typeof sort === "undefined" ? display : sort
  };
}

function createTeamCell(teamName, cupId) {
  return createCellValue(renderTeamIdentity(teamName, cupId), teamName);
}

function createPlayerCell(player, keyOverride) {
  const href = keyOverride ? "#/player/" + encodeURIComponent(keyOverride) : "#/player/" + encodeURIComponent(createPlayerKey(player));
  return createCellValue(`
    <a class="player-inline-link" href="${href}">
      ${renderFlag(player.countryCode)}
      <span>${escapeHtml(getDisplayPlayerName(player))}</span>
    </a>
  `, getDisplayPlayerName(player));
}

function toTableCell(value) {
  if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "display")) {
    return {
      display: String(value.display),
      sort: stringifySortValue(value.sort)
    };
  }

  return {
    display: escapeHtml(value),
    sort: stringifySortValue(value)
  };
}

function stringifySortValue(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  return String(value);
}

function compareSortValues(leftValue, rightValue) {
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  const bothNumeric = leftValue !== "" && rightValue !== "" && Number.isFinite(leftNumber) && Number.isFinite(rightNumber);

  if (bothNumeric) {
    return leftNumber - rightNumber;
  }

  return leftValue.localeCompare(rightValue, "sv", { numeric: true, sensitivity: "base" });
}

function parsePlayerName(value) {
  const source = String(value || "").trim();
  const match = source.match(/,\s*([A-Z]{2,3})$/);

  return {
    name: match ? source.slice(0, match.index).trim() : source,
    countryCode: match ? match[1] : ""
  };
}

function getDisplayPlayerName(player) {
  if (!player) {
    return "";
  }
  if (player.displayName) {
    return player.displayName;
  }
  return parsePlayerName(player.name || player.player || "").name;
}

function renderFlag(countryCode) {
  if (!countryCode) {
    return `<span class="player-flag is-missing" aria-hidden="true"></span>`;
  }

  return `
    <span class="player-flag" aria-label="${escapeHtml(countryCode)}" title="${escapeHtml(countryCode)}">
      ${countryCodeToEmoji(countryCode)}
    </span>
  `;
}

function countryCodeToEmoji(countryCode) {
  const normalized = String(countryCode || "").trim().toUpperCase();
  const alpha2 = getAlpha2CountryCode(normalized);

  if (!/^[A-Z]{2}$/.test(alpha2)) {
    return normalized || "";
  }

  return alpha2
    .split("")
    .map(function(letter) {
      return String.fromCodePoint(127397 + letter.charCodeAt(0));
    })
    .join("");
}

function getAlpha2CountryCode(countryCode) {
  const map = {
    SWE: "SE",
    FIN: "FI",
    NOR: "NO",
    DNK: "DK",
    DEN: "DK",
    USA: "US",
    CAN: "CA",
    CZE: "CZ",
    SVK: "SK",
    DEU: "DE",
    GER: "DE",
    AUT: "AT",
    CHE: "CH",
    SUI: "CH",
    LVA: "LV",
    LTU: "LT",
    EST: "EE",
    GBR: "GB",
    ENG: "GB"
  };

  return map[countryCode] || countryCode;
}

function normalizePercentageForSort(value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(Number(value))) {
    return -1;
  }
  const numeric = Number(value);
  return numeric > 1 ? numeric : numeric * 100;
}

function createTeamKey(teamName) {
  return slugify(teamName || "unknown-team");
}

function createPlayerKey(row) {
  if (row.playerId) {
    return "player-" + row.playerId;
  }
  return slugify((row.player || "unknown-player") + "-" + (row.team || ""));
}

function createMatchId(cupId, index) {
  return String(cupId) + "-" + String(index);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[ÃƒÂ¥ÃƒÂ¤]/g, "a")
    .replace(/[ÃƒÂ¶]/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStage(stage, group) {
  const normalized = String(stage || "").trim().toLowerCase();
  const groupText = String(group || "").trim().toLowerCase();
  const combined = normalized + " " + groupText;

  if (
    combined.indexOf("slut") !== -1 ||
    combined.indexOf("playoff") !== -1 ||
    combined.indexOf("play in") !== -1 ||
    combined.indexOf("play-in") !== -1 ||
    combined.indexOf("playin") !== -1 ||
    combined.indexOf("final") !== -1 ||
    combined.indexOf("kvart") !== -1 ||
    combined.indexOf("semi") !== -1 ||
    combined.indexOf("atton") !== -1 ||
    combined.indexOf("åtton") !== -1 ||
    combined.indexOf("brons") !== -1
  ) {
    return "playoffs";
  }

  if (!normalized || normalized.indexOf("grupp") !== -1 || normalized === "group" || groupText.indexOf("grupp") !== -1) {
    return "group";
  }

  return normalized;
}

function compareMatchesDesc(a, b) {
  const timeCompare = compareMatchesByTime(a, b);
  if (timeCompare !== 0) {
    return -timeCompare;
  }

  const left = [a.date || "", a.time || "", a.id || ""].join("|");
  const right = [b.date || "", b.time || "", b.id || ""].join("|");
  return right.localeCompare(left, "sv");
}

function compareMatchesAsc(a, b) {
  const timeCompare = compareMatchesByTime(a, b);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const left = [a.date || "", a.time || "", a.id || ""].join("|");
  const right = [b.date || "", b.time || "", b.id || ""].join("|");
  return left.localeCompare(right, "sv");
}

function compareMatchesByTime(a, b) {
  const left = getMatchTimestamp(a);
  const right = getMatchTimestamp(b);

  if (left !== null && right !== null && left !== right) {
    return left - right;
  }

  return 0;
}

function getMatchTimestamp(match) {
  const values = [
    [match?.date || "", match?.time || ""].filter(Boolean).join(" "),
    match?.date || ""
  ];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value) {
      continue;
    }

    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return null;
}

function compareTeamMatchRowsDesc(a, b) {
  const left = [a.date || "", a.time || "", a.cupId || ""].join("|");
  const right = [b.date || "", b.time || "", b.cupId || ""].join("|");
  return right.localeCompare(left, "sv");
}

function formatMatchDate(date, time) {
  return [date, time].filter(Boolean).join(" ");
}

function formatPercentage(value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  return numeric > 1 ? numeric.toFixed(1) : (numeric * 100).toFixed(1);
}

function formatDecimal(value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(2);
}

function displayScore(value) {
  return value === null || typeof value === "undefined" ? "-" : value;
}

function findCupSettings(settingsByCup, cup, code, name, id) {
  const candidates = [
    cup.code,
    code,
    cup.id,
    id,
    cup.name,
    name,
    name.replace(/^Svenska eHockey Cupen\s*/i, "SEC "),
    code.replace(/^Svenska eHockey Cupen\s*/i, "SEC ")
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const key = normalizeLookupKey(candidates[index]);
    if (key && settingsByCup.has(key)) {
      return applyCupSettingsOverride(mergeDataRow(settingsByCup.get(key), cup.settings), candidates);
    }
  }

  return applyCupSettingsOverride(mergeDataRow(createDefaultCupSettings(), cup.settings), candidates);
}

function applyCupSettingsOverride(settings, candidates) {
  const override = findCupSettingsOverride(candidates);
  if (!override) {
    return settings;
  }

  const next = {
    ...settings,
    bestOf: {
      ...(settings?.bestOf || {})
    }
  };

  ["playoffCut1", "playoffCut2", "minPlayers", "maxPlayers"].forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(override, field)) {
      next[field] = toNullableNumber(override[field]);
    }
  });

  if (override.bestOf && typeof override.bestOf === "object") {
    Object.keys(override.bestOf).forEach(function(key) {
      next.bestOf[key] = toNullableNumber(override.bestOf[key]);
    });
  }

  ["eligibility", "info"].forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(override, field)) {
      next[field] = normalizeText(override[field]);
    }
  });

  return next;
}

function findCupSettingsOverride(candidates) {
  const overrideKeys = Object.keys(CUP_SETTINGS_OVERRIDES || {});
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    const candidateKey = normalizeLookupKey(candidates[candidateIndex]);
    if (!candidateKey) {
      continue;
    }

    for (let overrideIndex = 0; overrideIndex < overrideKeys.length; overrideIndex += 1) {
      const overrideKey = overrideKeys[overrideIndex];
      if (normalizeLookupKey(overrideKey) === candidateKey) {
        return CUP_SETTINGS_OVERRIDES[overrideKey];
      }
    }
  }

  return null;
}

function findCupPlacement(placementsByCup, cup, code, name, id) {
  const candidates = [
    cup.code,
    code,
    cup.id,
    id,
    cup.name,
    name,
    name.replace(/^Svenska eHockey Cupen\s*/i, "SEC "),
    code.replace(/^Svenska eHockey Cupen\s*/i, "SEC ")
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const key = normalizeLookupKey(candidates[index]);
    if (key && placementsByCup.has(key)) {
      return placementsByCup.get(key);
    }
  }

  return {
    first: "",
    second: ""
  };
}

function createDefaultCupSettings() {
  return {
    playoffCut1: null,
    playoffCut2: null,
    bestOf: {
      roundOf16: null,
      quarter: null,
      semi: null,
      final: null
    },
    minPlayers: null,
    maxPlayers: null,
    eligibility: "",
    info: ""
  };
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLookupKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.]/g, "");
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferSortOrder(id) {
  const numeric = Number(String(id).replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function inferPlayoffRoundOrder(name) {
  const value = String(name || "").toLowerCase();

  if (value.indexOf("play in") !== -1 || value.indexOf("play-in") !== -1 || value.indexOf("playin") !== -1) {
    return 1;
  }
  if (value.indexOf("attondel") !== -1) {
    return 2;
  }
  if (value.indexOf("sexton") !== -1) {
    return 2;
  }
  if (value.indexOf("kvarts") !== -1) {
    return 3;
  }
  if (value.indexOf("semi") !== -1) {
    return 4;
  }
  if (value.indexOf("brons") !== -1) {
    return 5;
  }
  if (value.indexOf("final") !== -1) {
    return 6;
  }
  return 10;
}

function uniqueBy(items, key) {
  const map = new Map();
  items.forEach(function(item) {
    map.set(item[key], item);
  });
  return Array.from(map.values());
}

function sumBy(items, key) {
  return items.reduce(function(sum, item) {
    return sum + toNumber(item[key]);
  }, 0);
}

function showFatalError(error) {
  const message = typeof error === "string" ? error : error?.message || "Ett ovantat fel uppstod.";
  if (appView) {
    appView.innerHTML = renderErrorState("JavaScript-fel: " + message);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}




