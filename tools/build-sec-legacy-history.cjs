const fs = require("fs");
const path = require("path");

const SOURCE = path.resolve(__dirname, "..", "..", "SECv4", "database-cups-1-13.json");
const OUT = path.resolve(__dirname, "..", "svenska-lag-historia-sec-legacy.json");

function cleanText(value) {
  if (value == null) return "";
  let text = String(value).trim();
  if (/[ÃÂ]/.test(text)) {
    try {
      text = Buffer.from(text, "latin1").toString("utf8");
    } catch (_) {}
  }
  return text.replace(/\s+/g, " ").trim();
}

function norm(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TEAM_NAME_ALIASES = new Map([
  ["IF Norrland", "IFK Norrland"],
  ["Djurgarden", "Djurgården Hockey"],
  ["Dynamic Hockey", "Dynamic"],
  ["Ik Pantern Esport", "Ik Pantern"],
  ["Modo Hockey", "MoDo Hockey"]
].map(([from, to]) => [norm(from), to]));

function canonicalTeamName(value) {
  const name = cleanText(value);
  return TEAM_NAME_ALIASES.get(norm(name)) || name;
}

function hashId(prefix, value) {
  const text = `${prefix}:${norm(value)}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return prefix * 1000000 + (Math.abs(hash) % 900000);
}

function secNumber(code) {
  const match = cleanText(code).match(/^SEC\s+(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

function includeCup(cup) {
  const code = cleanText(cup.code || cup.name);
  const number = secNumber(code);
  return number != null && number >= 1 && number <= 13;
}

function stageType(stage) {
  const s = norm(stage);
  return /(playoff|slutspel|final|semi|quarter|kvart|bronze|brons)/.test(s)
    ? "playoff"
    : "regular";
}

function toNum(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getTeamStats(map, teamName) {
  const name = canonicalTeamName(teamName);
  const key = norm(name);
  if (!key) return null;
  if (!map.has(key)) {
    map.set(key, {
      name,
      wins: 0,
      losses: 0,
      goalDiff: 0,
      goalsFor: 0,
      gamesPlayed: 0,
      playoffWins: 0,
      regularWins: 0,
      goalsAgainst: 0,
      overtimeWins: 0,
      playoffGames: 0,
      regularGames: 0,
      playoffLosses: 0,
      regularLosses: 0,
      regularPoints: 0,
      overtimeLosses: 0
    });
  }
  return map.get(key);
}

function addMatch(stats, gf, ga, isPlayoff, overtime) {
  stats.gamesPlayed += 1;
  stats.goalsFor += gf;
  stats.goalsAgainst += ga;
  stats.goalDiff += gf - ga;
  if (isPlayoff) stats.playoffGames += 1;
  else stats.regularGames += 1;

  if (gf > ga) {
    stats.wins += 1;
    if (isPlayoff) stats.playoffWins += 1;
    else stats.regularWins += 1;
    if (overtime) stats.overtimeWins += 1;
  } else if (gf < ga) {
    stats.losses += 1;
    if (isPlayoff) stats.playoffLosses += 1;
    else stats.regularLosses += 1;
    if (overtime) stats.overtimeLosses += 1;
  }
}

function emptyPlayerEntry({ cup, teamName, teamID, leagueID, role }) {
  const code = cleanText(cup.code || cup.name);
  return {
    goals: 0,
    played: 0,
    points: 0,
    teamID,
    assists: 0,
    teamUrl: "",
    division: "SEC",
    leagueID,
    teamName,
    seasonName: code,
    seasonYear: 2000 + (secNumber(code) || 0),
    divisionKey: "sec",
    gamesPlayed: 0,
    primaryRole: role,
    seasonLabel: code,
    playoffGames: 0,
    regularGames: 0
  };
}

function mergeSkater(entry, row, stage) {
  const gp = toNum(row.gp);
  entry.gamesPlayed += gp;
  entry.played += gp;
  entry.goals += toNum(row.g);
  entry.assists += toNum(row.a);
  entry.points += toNum(row.pts);
  entry.pim = (entry.pim || 0) + toNum(row.pim);
  if (stage === "playoff") entry.playoffGames += gp;
  else entry.regularGames += gp;
}

function mergeGoalie(entry, row, stage) {
  const gp = toNum(row.gp);
  const sa = toNum(row.sa);
  const ga = toNum(row.ga);
  const sv = toNum(row.sv);
  entry.gamesPlayed += gp;
  entry.played += gp;
  entry.shotsAgainst = (entry.shotsAgainst || 0) + sa;
  entry.goalsAllowed = (entry.goalsAllowed || 0) + ga;
  entry.saves = (entry.saves || 0) + sv;
  entry.shutouts = (entry.shutouts || 0) + toNum(row.so);
  entry.savePercentage = entry.shotsAgainst ? Number(((entry.saves / entry.shotsAgainst) * 100).toFixed(1)) : 0;
  entry.gaa = entry.gamesPlayed ? Number((entry.goalsAllowed / entry.gamesPlayed).toFixed(2)) : 0;
  if (stage === "playoff") entry.playoffGames += gp;
  else entry.regularGames += gp;
}

function addPlayer(playerMap, row, cup, teamName, teamID, leagueID, role, stage) {
  const playerName = cleanText(row.player);
  if (!playerName) return;
  const id = row.playerId ? String(row.playerId) : `sec-${hashId(8, playerName)}`;
  if (!playerMap.has(id)) {
    playerMap.set(id, { history: [], playerID: id });
  }
  const player = playerMap.get(id);
  let entry = player.history.find((item) => item.leagueID === leagueID && item.teamID === teamID && item.primaryRole === role);
  if (!entry) {
    entry = emptyPlayerEntry({ cup, teamName, teamID, leagueID, role });
    player.history.push(entry);
  }
  entry.playerName = playerName;
  if (role === "Goalie") mergeGoalie(entry, row, stage);
  else mergeSkater(entry, row, stage);
}

function placementName(value) {
  if (!value) return "";
  if (typeof value === "string") return canonicalTeamName(value);
  return canonicalTeamName(value.team || value.teamName || value.name);
}

const raw = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const includedCups = raw.cups.filter(includeCup);
const teamRows = [];
const podiums = [];
const playerMap = new Map();

for (const cup of includedCups) {
  const code = cleanText(cup.code || cup.name);
  const leagueID = 900000 + Math.round((secNumber(code) || cup.id || 0) * 10);
  const teamStats = new Map();
  const teamPlayers = new Map();

  for (const match of cup.matches || []) {
    const away = cleanText(match.awayTeam);
    const home = cleanText(match.homeTeam);
    const awayScore = toNum(match.awayScore);
    const homeScore = toNum(match.homeScore);
    if (!away || !home) continue;
    const isPlayoff = stageType(match.stage) === "playoff";
    addMatch(getTeamStats(teamStats, away), awayScore, homeScore, isPlayoff, !!match.overtime);
    addMatch(getTeamStats(teamStats, home), homeScore, awayScore, isPlayoff, !!match.overtime);
  }

  const statGroups = [
    ["regular", cup.playerStats?.group || [], "Skater"],
    ["playoff", cup.playerStats?.playoffs || [], "Skater"],
    ["regular", cup.goalieStats?.group || [], "Goalie"],
    ["playoff", cup.goalieStats?.playoffs || [], "Goalie"]
  ];

  for (const [stage, rows, role] of statGroups) {
    for (const row of rows) {
      const teamName = canonicalTeamName(row.team);
      if (!teamName) continue;
      const teamID = hashId(7, teamName);
      const teamKey = norm(teamName);
      if (!teamPlayers.has(teamKey)) teamPlayers.set(teamKey, new Set());
      teamPlayers.get(teamKey).add(cleanText(row.player));
      addPlayer(playerMap, row, cup, teamName, teamID, leagueID, role, stage);
      getTeamStats(teamStats, teamName);
    }
  }

  for (const [key, stats] of teamStats.entries()) {
    const playerCount = teamPlayers.get(key)?.size || 0;
    const teamID = hashId(7, stats.name);
    const top = [...playerMap.values()]
      .flatMap((player) => player.history)
      .filter((entry) => entry.leagueID === leagueID && entry.teamID === teamID && entry.primaryRole !== "Goalie")
      .sort((a, b) => (b.points || 0) - (a.points || 0))[0];
    teamRows.push({
      logo: "",
      name: stats.name,
      stats,
      teamID,
      country: "SE",
      groupID: 0,
      teamUrl: "",
      division: "SEC",
      leagueID,
      mappedName: stats.name,
      seasonName: code,
      seasonYear: 2000 + (secNumber(code) || 0),
      currentName: stats.name,
      divisionKey: "sec",
      playerCount,
      seasonLabel: code,
      divisionRank: 6,
      originalName: stats.name,
      topPlayerName: top?.playerName || "",
      seasonTeamName: stats.name,
      topPlayerPoints: top?.points || 0,
      playedPlayerCount: playerCount,
      registeredForLeague: ""
    });
  }

  const placements = cup.placements || {};
  [
    ["first", 1],
    ["second", 2],
    ["third", 3]
  ].forEach(([field, placement]) => {
    const teamName = placementName(placements[field]);
    if (!teamName) return;
    podiums.push({
      teamID: hashId(7, teamName),
      teamUrl: "",
      leagueID,
      teamName,
      placement,
      leagueName: code,
      division: "SEC",
      divisionKey: "sec"
    });
  });
}

const output = {
  source: path.basename(SOURCE),
  updated: new Date().toISOString(),
  includedCups: includedCups.map((cup) => cleanText(cup.code || cup.name)),
  teams: teamRows,
  playerHistory: [...playerMap.values()],
  podiums
};

fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.basename(OUT)}: ${teamRows.length} team seasons, ${output.playerHistory.length} players, ${podiums.length} podiums.`);
