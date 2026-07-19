const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SHEET_ID = "14Gf1A5WpepEjmSDHyNAQkeBEO-q_WrGgRYWNB3qgk4Q";
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const ORGANIZATIONS = {
  ITHL: { id: "ITHL", name: "ITHL", url: "https://ithl.hockey/home", historyBase: 1000, podiumBase: 9000 },
  LGEL: { id: "LGEL", name: "LGEL", url: "https://www.leaguegaming.com/forums/index.php?forums/lgel.649/", historyBase: 2000, podiumBase: 9100 },
  SM: { id: "SM", name: "SM", url: "", historyBase: 3000, podiumBase: 9200 },
};
const SHEETS = {
  skaters: {
    gid: "878115396",
    url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=878115396`,
  },
  goalies: {
    gid: "2063434629",
    url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=2063434629`,
  },
  dates: {
    sheet: "Datum",
    url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Datum`,
  },
  winners: {
    sheet: "vinnare",
    url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=vinnare`,
  },
};

const PLAYER_INDEX_FILE = path.join(ROOT, "svenska-spelare-index.json");
const TEAM_HISTORY_FILE = path.join(ROOT, "svenska-lag-historia-teams.json");
const OUTPUT_FILE = path.join(ROOT, "ithl.json");
const REPORT_FILE = path.join(ROOT, "ithl-import-report.json");
const PLAYER_ALIASES_FILE = path.join(__dirname, "ithl-player-aliases.json");
const TEAM_ALIASES_FILE = path.join(__dirname, "ithl-team-aliases.json");
const SWEDISH_EXTERNAL_TEAMS = new Set([
  "northernfreezehc",
  "phoenixhc",
]);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--skaters") result.skaters = argv[++index];
    else if (arg === "--goalies") result.goalies = argv[++index];
    else if (arg === "--dates") result.dates = argv[++index];
    else if (arg === "--winners") result.winners = argv[++index];
  }
  return result;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function number(value) {
  const cleaned = String(value ?? "")
    .replace(/[−–—]/g, "-")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace("%", "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function loadText(localFile, url) {
  if (localFile) return fs.readFileSync(path.resolve(localFile), "utf8");
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Kunde inte hämta ${url}: HTTP ${response.status}`);
  return response.text();
}

function dataRows(csvText) {
  const rows = parseCsv(csvText);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalize);
    return headers.includes("sasong") && headers.includes("division") && headers.includes("spelare");
  });
  if (headerIndex < 0) throw new Error("Kolumnraden Säsong/Division hittades inte.");
  const headers = rows[headerIndex].map((header) => {
    const raw = String(header || "").trim();
    if (/sv\s*%/i.test(raw)) return "svpct";
    if (/\+\s*\/\s*[-−–—]/.test(raw)) return "plusminus";
    return normalize(raw);
  });
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell).trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function buildLookup(items, namesForItem) {
  const lookup = new Map();
  for (const item of items) {
    for (const name of namesForItem(item)) {
      const key = normalize(name);
      if (!key) continue;
      if (!lookup.has(key)) lookup.set(key, []);
      const list = lookup.get(key);
      if (!list.includes(item)) list.push(item);
    }
  }
  return lookup;
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

function suggestions(name, candidates, limit = 3) {
  const key = normalize(name);
  return candidates
    .map((candidate) => ({
      name: candidate.name,
      id: candidate.id,
      distance: levenshtein(key, normalize(candidate.name)),
    }))
    .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name, "sv"))
    .slice(0, limit);
}

function organizationId(value) {
  const id = String(value || "ITHL").trim().toUpperCase();
  return ORGANIZATIONS[id] ? id : "ITHL";
}

function organizationMeta(value) {
  return ORGANIZATIONS[organizationId(value)];
}

function seasonLabel(organization, season) {
  const id = organizationId(organization);
  return id === "SM" ? `SM ${season}` : `${id} S${season}`;
}

function seasonKey(organization, season) {
  return `${organizationId(organization)}|${number(season)}`;
}

function dateMap(csvText) {
  const result = new Map();
  for (const row of parseCsv(csvText)) {
    const hasOrganization = Boolean(ORGANIZATIONS[String(row[0] || "").trim().toUpperCase()]);
    const organization = hasOrganization ? organizationId(row[0]) : "ITHL";
    const season = number(row[hasOrganization ? 1 : 0]);
    const startDate = String(row[hasOrganization ? 2 : 1] || "").trim();
    if (season && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) result.set(seasonKey(organization, season), startDate);
  }
  return result;
}

function winnerRows(csvText) {
  return parseCsv(csvText)
    .filter((row) => {
      const hasOrganization = Boolean(ORGANIZATIONS[String(row[0] || "").trim().toUpperCase()]);
      return number(row[hasOrganization ? 1 : 0]);
    })
    .flatMap((row) => {
      const hasOrganization = Boolean(ORGANIZATIONS[String(row[0] || "").trim().toUpperCase()]);
      const organization = hasOrganization ? organizationId(row[0]) : "ITHL";
      const offset = hasOrganization ? 1 : 0;
      const season = number(row[offset]);
      const division = String(row[offset + 1] || "").trim();
      return [
        { organization, season, division, placement: 1, teamName: String(row[offset + 2] || "").trim() },
        { organization, season, division, placement: 2, teamName: String(row[offset + 3] || "").trim() },
      ];
    })
    .filter((row) => row.teamName);
}

function mapSkater(row) {
  const organization = organizationId(row.turnering || row.organisation || row.organization);
  const season = number(row.sasong);
  return {
    organization,
    season,
    seasonLabel: seasonLabel(organization, season),
    division: String(row.division || "").trim(),
    rank: number(row.rank),
    playerName: String(row.spelare || "").trim(),
    nationality: String(row.nationalitet || row.nationality || "").trim(),
    teamName: String(row.lag || "").trim(),
    position: String(row.pos || "").trim(),
    primaryRole: "Skater",
    gamesPlayed: number(row.gp),
    skaterGames: number(row.gp),
    goalieGames: 0,
    goals: number(row.g),
    assists: number(row.a),
    points: number(row.pts),
    plusMinus: number(row.plusminus),
  };
}

function mapGoalie(row) {
  const organization = organizationId(row.turnering || row.organisation || row.organization);
  const season = number(row.sasong);
  return {
    organization,
    season,
    seasonLabel: seasonLabel(organization, season),
    division: String(row.division || "").trim(),
    rank: number(row.rank),
    playerName: String(row.spelare || "").trim(),
    nationality: String(row.nationalitet || row.nationality || "").trim(),
    teamName: String(row.lag || "").trim(),
    position: "G",
    primaryRole: "G",
    gamesPlayed: number(row.gp),
    skaterGames: 0,
    goalieGames: number(row.gp),
    saves: number(row.sv),
    shotsAgainst: number(row.sa),
    goalsAllowed: number(row.ga),
    savePct: number(row.svpct),
    gaa: number(row.gaa),
    shutouts: number(row.so),
  };
}

function compactPlayer(player) {
  return { playerID: player.playerID, name: player.name, profileUrl: player.profileUrl || "" };
}

function addUnique(array, value) {
  if (value && !array.includes(value)) array.push(value);
}

function externalPlayerId(name, usedIds) {
  let hash = 2166136261;
  for (const char of normalize(name)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let id = 8000000 + (hash >>> 0) % 900000;
  while (usedIds.has(String(id))) id += 1;
  usedIds.add(String(id));
  return id;
}

function externalTeamId(name, usedIds) {
  let hash = 2166136261;
  for (const char of normalize(name)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let id = 7000000 + (hash >>> 0) % 900000;
  while (usedIds.has(String(id))) id += 1;
  usedIds.add(String(id));
  return id;
}

function isSwedishExternalTeam(row) {
  return row.organization === "SM" || SWEDISH_EXTERNAL_TEAMS.has(normalize(row.teamName));
}

function isSwedishNationality(value) {
  return new Set(["svensk", "swedish", "sverige", "sweden", "se", "swe"]).has(normalize(value));
}

function isSwedishSourcePlayer(row) {
  return isSwedishNationality(row.nationality);
}

function isManagedExternalPlayer(player) {
  const id = Number(player?.playerID);
  return Number.isInteger(id) && id >= 8000000 && id < 8900000 && !String(player?.profileUrl || "").trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [skaterText, goalieText, datesText, winnersText] = await Promise.all([
    loadText(args.skaters, SHEETS.skaters.url),
    loadText(args.goalies, SHEETS.goalies.url),
    loadText(args.dates, SHEETS.dates.url),
    loadText(args.winners, SHEETS.winners.url),
  ]);
  const dates = dateMap(datesText);

  const rows = [
    ...dataRows(skaterText).map(mapSkater),
    ...dataRows(goalieText).map(mapGoalie),
  ].filter((row) => row.season && row.playerName && row.teamName);
  const swedishSourcePlayerKeys = new Set(rows.filter(isSwedishSourcePlayer).map((row) => normalize(row.playerName)));

  const playerIndex = readJson(PLAYER_INDEX_FILE);
  const teamHistory = readJson(TEAM_HISTORY_FILE);
  const playerAliases = readJson(PLAYER_ALIASES_FILE);
  const teamAliases = readJson(TEAM_ALIASES_FILE);
  // Older imports treated every source row as Swedish. Remove only profiles
  // previously generated by this importer when the refreshed sheet no longer
  // marks that name as Swedish; native SportsGamer profiles remain untouched.
  playerIndex.players = (playerIndex.players || []).filter((player) => (
    !isManagedExternalPlayer(player) || swedishSourcePlayerKeys.has(normalize(player.name))
  ));
  const players = playerIndex.players;
  const teams = teamHistory.teams || [];

  const playerLookup = buildLookup(players, (player) => [
    player.name,
    ...(player.historyRows || []).map((row) => row.name || row.playerName),
  ]);

  const teamById = new Map();
  for (const team of teams) {
    if (!teamById.has(String(team.teamID))) teamById.set(String(team.teamID), team);
  }
  const teamLookup = buildLookup(teams, (team) => [team.name, team.originalName, team.currentName, team.mappedName, team.seasonTeamName]);
  const playerCandidates = players.map((player) => ({ id: player.playerID, name: player.name }));
  const teamCandidates = [...teamById.values()].map((team) => ({ id: team.teamID, name: team.name }));

  for (const row of rows) {
    row.startDate = dates.get(seasonKey(row.organization, row.season)) || "";
    row.seasonDate = row.startDate;
    row.seasonYear = row.startDate ? Number(row.startDate.slice(0, 4)) : null;
  }

  const podiums = winnerRows(winnersText).map((podium) => {
    const teamAlias = teamAliases[podium.teamName] ?? teamAliases[normalize(podium.teamName)];
    const teamMatches = teamAlias !== undefined
      ? teams.filter((team) => String(team.teamID) === String(teamAlias) || normalize(team.name) === normalize(teamAlias))
      : (teamLookup.get(normalize(podium.teamName)) || []);
    const uniqueTeamIds = [...new Set(teamMatches.map((team) => String(team.teamID)))];
    const matched = uniqueTeamIds.length === 1
      ? teamMatches.find((team) => String(team.teamID) === uniqueTeamIds[0])
      : null;
    const meta = organizationMeta(podium.organization);
    const startDate = dates.get(seasonKey(podium.organization, podium.season)) || "";
    return {
      organization: podium.organization,
      leagueID: meta.podiumBase + podium.season,
      leagueName: `${seasonLabel(podium.organization, podium.season)}${podium.division ? ` - ${podium.division.toUpperCase()}` : ""}`,
      seasonLabel: seasonLabel(podium.organization, podium.season),
      season: podium.season,
      seasonYear: startDate ? Number(startDate.slice(0, 4)) : null,
      startDate,
      division: podium.division.toUpperCase(),
      placement: podium.placement,
      teamID: matched?.teamID ?? null,
      teamName: matched?.name || podium.teamName,
      sourceTeamName: podium.teamName,
      teamUrl: meta.url,
      source: SOURCE_URL,
    };
  });

  const unmatchedPlayers = new Map();
  const ambiguousPlayers = new Map();
  const unmatchedTeams = new Map();
  const ambiguousTeams = new Map();
  const usedTeamIds = new Set(teams.map((team) => String(team.teamID)));
  const createdTeams = new Map();

  for (const row of rows) {
    if (isSwedishSourcePlayer(row)) {
      const playerAlias = playerAliases[row.playerName] ?? playerAliases[normalize(row.playerName)];
      let playerMatches = [];
      if (playerAlias !== undefined) {
        playerMatches = players.filter((player) => String(player.playerID) === String(playerAlias) || normalize(player.name) === normalize(playerAlias));
      } else {
        playerMatches = playerLookup.get(normalize(row.playerName)) || [];
      }
      if (playerMatches.length === 1) {
        row.playerID = playerMatches[0].playerID;
        row.canonicalPlayerName = playerMatches[0].name;
        row.playerMatch = "exact";
      } else if (playerMatches.length > 1) {
        ambiguousPlayers.set(row.playerName, playerMatches.map(compactPlayer));
        row.playerMatch = "ambiguous";
      } else {
        unmatchedPlayers.set(row.playerName, suggestions(row.playerName, playerCandidates));
        row.playerMatch = "unmatched";
      }
    } else {
      row.playerMatch = "non-swedish";
    }

    const teamAlias = teamAliases[row.teamName] ?? teamAliases[normalize(row.teamName)];
    let teamMatches = [];
    if (teamAlias !== undefined) {
      teamMatches = teams.filter((team) => String(team.teamID) === String(teamAlias) || normalize(team.name) === normalize(teamAlias));
    } else {
      teamMatches = teamLookup.get(normalize(row.teamName)) || [];
    }
    const uniqueTeamIds = [...new Set(teamMatches.map((team) => String(team.teamID)))];
    if (uniqueTeamIds.length === 1) {
      const matched = teamMatches.find((team) => String(team.teamID) === uniqueTeamIds[0]);
      row.teamID = matched.teamID;
      row.canonicalTeamName = matched.name;
      row.teamMatch = "exact";
    } else if (uniqueTeamIds.length > 1) {
      const values = uniqueTeamIds.map((id) => teamById.get(id)).filter(Boolean).map((team) => ({ teamID: team.teamID, name: team.name }));
      ambiguousTeams.set(row.teamName, values);
      row.teamMatch = "ambiguous";
    } else {
      unmatchedTeams.set(row.teamName, suggestions(row.teamName, teamCandidates));
      row.teamMatch = "unmatched";
    }

    // Every SM team is Swedish. These and the explicitly confirmed Swedish
    // external clubs must remain visible even without a SportsGamer team ID.
    if (row.teamID == null && isSwedishExternalTeam(row)) {
      const key = normalize(row.teamName);
      if (!createdTeams.has(key)) {
        createdTeams.set(key, {
          teamID: externalTeamId(row.teamName, usedTeamIds),
          name: row.teamName,
        });
      }
      const created = createdTeams.get(key);
      row.teamID = created.teamID;
      row.canonicalTeamName = created.name;
      row.teamMatch = "external-swedish";
    }
  }

  for (const podium of podiums) {
    if (podium.teamID != null) continue;
    const created = createdTeams.get(normalize(podium.sourceTeamName));
    if (!created) continue;
    podium.teamID = created.teamID;
    podium.teamName = created.name;
  }

  // The source sheets themselves define these as Swedish players. Preserve
  // genuinely new names as external-only profiles instead of dropping their
  // statistics merely because they do not yet exist in the SportsGamer index.
  const usedPlayerIds = new Set(players.map((player) => String(player.playerID)));
  const createdPlayers = new Map();
  for (const row of rows.filter((item) => isSwedishSourcePlayer(item) && item.playerID == null)) {
    const key = normalize(row.playerName);
    if (!key) continue;
    if (!createdPlayers.has(key)) {
      const player = {
        playerID: externalPlayerId(row.playerName, usedPlayerIds),
        name: row.playerName,
        profileUrl: "",
        nationality: "SE",
        country: "SE",
        playerCountry: "SE",
        historyRows: [],
        teams: [],
        seasons: [],
        divisions: [],
        gamesPlayed: 0,
        regularGames: 0,
        playoffGames: 0,
        skaterGames: 0,
        goalieGames: 0,
        goals: 0,
        assists: 0,
        points: 0,
        saves: 0,
        shotsAgainst: 0,
        goalsAllowed: 0,
        shutouts: 0
      };
      players.push(player);
      createdPlayers.set(key, player);
    }
    const player = createdPlayers.get(key);
    row.playerID = player.playerID;
    row.canonicalPlayerName = player.name;
    row.playerMatch = "external-new";
  }

  const seasonDefinitions = [...new Set(rows.map((row) => seasonKey(row.organization, row.season)))]
    .map((key) => {
      const [organization, seasonValue] = key.split("|");
      return { organization, season: number(seasonValue) };
    })
    .sort((a, b) => a.organization.localeCompare(b.organization) || a.season - b.season)
    .map(({ organization, season }) => ({
      organization,
      season,
      label: seasonLabel(organization, season),
      startDate: dates.get(seasonKey(organization, season)) || "",
      divisions: [...new Set(rows.filter((row) => row.organization === organization && row.season === season).map((row) => row.division).filter(Boolean))],
    }));

  const teamMap = new Map();
  for (const row of rows) {
    const key = `${row.organization}|${row.season}|${normalize(row.division)}|${normalize(row.teamName)}`;
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        organization: row.organization,
        leagueID: -(organizationMeta(row.organization).historyBase + row.season),
        leagueName: row.organization,
        season: row.season,
        seasonLabel: row.seasonLabel,
        startDate: row.startDate,
        seasonDate: row.seasonDate,
        seasonYear: row.seasonYear,
        division: row.division,
        teamName: row.teamName,
        teamID: row.teamID ?? null,
        canonicalTeamName: row.canonicalTeamName || "",
        teamMatch: row.teamMatch,
        teamUrl: organizationMeta(row.organization).url,
        players: [],
      });
    }
    const team = teamMap.get(key);
    team.players.push({
      playerID: row.playerID ?? null,
      playerName: row.playerName,
      canonicalPlayerName: row.canonicalPlayerName || "",
      playerMatch: row.playerMatch,
      nationality: row.nationality,
      primaryRole: row.primaryRole,
      gamesPlayed: row.gamesPlayed,
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      points: row.points ?? 0,
      saves: row.saves ?? 0,
      goalsAllowed: row.goalsAllowed ?? 0,
      shotsAgainst: row.shotsAgainst ?? 0,
      savePct: row.savePct ?? 0,
      gaa: row.gaa ?? 0,
      shutouts: row.shutouts ?? 0,
    });
  }

  const output = {
    version: 2,
    organizations: Object.values(ORGANIZATIONS).map(({ id, name, url }) => ({ id, name, url })),
    updated: new Date().toISOString(),
    source: {
      spreadsheet: SOURCE_URL,
      sheets: SHEETS,
      note: "Källarket innehåller samtliga spelare. Endast rader markerade som svenska förs in i spelarregistret; hela laguppställningen behålls för svenska lag.",
    },
    seasons: seasonDefinitions,
    summary: {
      rows: rows.length,
      swedishRows: rows.filter(isSwedishSourcePlayer).length,
      skaterRows: rows.filter((row) => row.primaryRole === "Skater").length,
      goalieRows: rows.filter((row) => row.primaryRole === "G").length,
      uniquePlayers: new Set(rows.map((row) => normalize(row.playerName))).size,
      uniqueSwedishPlayers: new Set(rows.filter(isSwedishSourcePlayer).map((row) => normalize(row.playerName))).size,
      matchedPlayers: new Set(rows.filter((row) => row.playerID != null).map((row) => String(row.playerID))).size,
      uniqueTeams: new Set(rows.map((row) => normalize(row.teamName))).size,
      matchedTeams: new Set(rows.filter((row) => row.teamID != null).map((row) => String(row.teamID))).size,
      podiums: podiums.length,
      winners: podiums.filter((row) => row.placement === 1).length,
      runnersUp: podiums.filter((row) => row.placement === 2).length,
      rowsByOrganization: Object.fromEntries(Object.keys(ORGANIZATIONS).map((organization) => [organization, rows.filter((row) => row.organization === organization).length])),
    },
    playerHistory: rows.filter(isSwedishSourcePlayer),
    teamHistory: [...teamMap.values()],
    podiums,
  };

  const report = {
    updated: output.updated,
    summary: output.summary,
    unmatchedPlayers: [...unmatchedPlayers].map(([name, values]) => ({ name, suggestions: values })),
    ambiguousPlayers: [...ambiguousPlayers].map(([name, matches]) => ({ name, matches })),
    unmatchedTeams: [...unmatchedTeams].map(([name, values]) => ({ name, suggestions: values })),
    ambiguousTeams: [...ambiguousTeams].map(([name, matches]) => ({ name, matches })),
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const additiveTotalKeys = [
    "gamesPlayed",
    "regularGames",
    "playoffGames",
    "skaterGames",
    "goalieGames",
    "goals",
    "assists",
    "points",
    "saves",
    "shotsAgainst",
    "goalsAllowed",
    "shutouts",
  ];
  const baseTotalsByPlayerID = new Map();
  const importedOrganizations = new Set(Object.keys(ORGANIZATIONS));

  for (const player of players) {
    const previousExternalTotals = player.externalLeagueTotals || player.ithlTotals || {};
    const baseTotals = {};
    for (const key of additiveTotalKeys) {
      baseTotals[key] = Math.max(0, (Number(player[key]) || 0) - (Number(previousExternalTotals[key]) || 0));
    }
    baseTotalsByPlayerID.set(String(player.playerID), baseTotals);
    player.historyRows = (player.historyRows || []).filter((item) => !importedOrganizations.has(String(item.organization || "").toUpperCase()));
    player.seasons = (player.seasons || []).filter((value) => ![...importedOrganizations].some((organization) => String(value).startsWith(`${organization} S`)));
    player.divisions = (player.divisions || []).filter((value) => ![...importedOrganizations].some((organization) => String(value) === organization || String(value).startsWith(`${organization} `)));
  }

  for (const row of rows.filter((item) => item.playerID != null)) {
    const player = players.find((item) => String(item.playerID) === String(row.playerID));
    if (!player) continue;
    const historyRow = {
      organization: row.organization,
      leagueID: -(organizationMeta(row.organization).historyBase + Number(row.season || 0)),
      leagueName: row.organization,
      playerID: row.playerID,
      playerName: row.canonicalPlayerName || row.playerName,
      nationality: row.nationality,
      seasonLabel: row.seasonLabel,
      season: row.seasonLabel,
      seasonName: `S${row.season}`,
      seasonYear: row.seasonYear,
      startDate: row.startDate,
      seasonDate: row.seasonDate,
      division: String(row.division || row.organization).toUpperCase(),
      divisionKey: normalize(row.division),
      teamID: row.teamID ?? null,
        teamName: row.teamName,
      gamesPlayed: row.gamesPlayed,
      games: row.gamesPlayed,
      regularGames: row.gamesPlayed,
      playoffGames: 0,
      played: row.gamesPlayed > 0 ? 1 : 0,
      primaryRole: row.primaryRole,
      skaterGames: row.skaterGames || 0,
      goalieGames: row.goalieGames || 0,
      goals: row.goals || 0,
      assists: row.assists || 0,
      points: row.points || 0,
      saves: row.saves || 0,
      shotsAgainst: row.shotsAgainst || 0,
      goalsAllowed: row.goalsAllowed || 0,
      savePct: row.savePct || "",
      gaa: row.gaa || "",
      shutouts: row.shutouts || 0,
      source: SOURCE_URL,
    };
    player.historyRows.push(historyRow);
  }

  for (const player of players) {
    const externalRows = (player.historyRows || []).filter((row) => importedOrganizations.has(String(row.organization || "").toUpperCase()));
    const baseTotals = baseTotalsByPlayerID.get(String(player.playerID)) || {};
    const externalTotals = Object.fromEntries(additiveTotalKeys.map((key) => [key, 0]));

    for (const row of externalRows) {
      for (const key of additiveTotalKeys) externalTotals[key] += Number(row[key]) || 0;
    }
    for (const key of additiveTotalKeys) player[key] = (Number(baseTotals[key]) || 0) + externalTotals[key];
    player.externalLeagueTotals = externalTotals;
    player.ithlTotals = externalTotals;

    if ((Number(player.shotsAgainst) || 0) > 0) {
      player.savePct = ((Number(player.saves) || 0) / Number(player.shotsAgainst) * 100).toFixed(1);
    }
    if ((Number(player.goalieGames) || 0) > 0) {
      player.gaa = ((Number(player.goalsAllowed) || 0) / Number(player.goalieGames)).toFixed(2);
    }

    for (const row of externalRows) {
      addUnique(player.seasons, row.seasonLabel);
      addUnique(player.divisions, row.division && row.division !== row.organization ? `${row.organization} ${row.division}` : row.organization);
      addUnique(player.teams, row.teamName);
    }
    player.seasons.sort((left, right) => String(left).localeCompare(String(right), "sv", { numeric: true }));
    player.playedSeasons = new Set((player.historyRows || []).map((row) => row.seasonLabel).filter(Boolean)).size;
    player.seasonCount = player.playedSeasons;
    player.clubCount = new Set((player.historyRows || []).map((row) => normalize(row.teamName)).filter(Boolean)).size;
  }

  playerIndex.updated = output.updated;
  fs.writeFileSync(PLAYER_INDEX_FILE, `${JSON.stringify(playerIndex)}\n`, "utf8");

  console.log(`Skrev ${path.basename(OUTPUT_FILE)}: ${output.summary.rows} rader.`);
  console.log(`Matchade ${output.summary.matchedPlayers}/${output.summary.uniqueSwedishPlayers} svenska spelare och ${output.summary.matchedTeams}/${output.summary.uniqueTeams} lag.`);
  console.log(`Uppdaterade ${path.basename(PLAYER_INDEX_FILE)} med ITHL-, LGEL- och SM-historik.`);
  console.log(`Se ${path.basename(REPORT_FILE)} för omatchade eller tvetydiga namn.`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
