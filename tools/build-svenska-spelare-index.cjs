const fs = require("fs");

const INPUT_FILE = "svenska-lag-historia-teams.json";
const SEC_LEGACY_FILE = "svenska-lag-historia-sec-legacy.json";
const SWEDISH_PLAYER_OVERRIDES_FILE = "svenska-spelare-nationalitet-overrides.json";
const OUTPUT_FILE = "svenska-spelare-index.json";

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadSwedishPlayerOverrides() {
  const overrides = { ids: new Set(), names: new Set() };
  if (!fs.existsSync(SWEDISH_PLAYER_OVERRIDES_FILE)) {
    throw new Error(`Saknar ${SWEDISH_PLAYER_OVERRIDES_FILE}. Spelarindex byggs inte utan nationalitets-overrides.`);
  }

  const data = JSON.parse(fs.readFileSync(SWEDISH_PLAYER_OVERRIDES_FILE, "utf8"));
  (data.playerIds || []).forEach(id => {
    const key = String(id || "").trim();
    if (key) overrides.ids.add(key);
  });
  (data.names || []).forEach(name => {
    const key = normalizeText(name);
    if (key) overrides.names.add(key);
  });
  if (!overrides.ids.size && !overrides.names.size) {
    throw new Error(`${SWEDISH_PLAYER_OVERRIDES_FILE} saknar svenska spelare. Spelarindex byggs inte.`);
  }
  return overrides;
}

const SWEDISH_PLAYER_OVERRIDES = loadSwedishPlayerOverrides();

function normalizeDivisionName(value) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();
  if (upper.includes("ELITE")) return "ELITE";
  if (upper.includes("PRO")) return "PRO";
  if (upper.includes("LITE")) return "LITE";
  if (upper.includes("CORE")) return "CORE";
  if (upper.includes("NEO")) return "NEO";
  if (upper.includes("ESHL")) return "eSHL";
  if (upper.includes("SEC")) return "SEC";
  if (upper.includes("SCL")) return "SCL";
  return raw;
}

function normalizeCountryCode(value) {
  const aliases = {
    SWEDEN: "SE",
    SVERIGE: "SE",
    SWE: "SE",
    SE: "SE"
  };
  const key = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return aliases[key] || (/^[A-Z]{2}$/.test(key) ? key : "");
}

function splitHistoryPlayerName(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?),\s*([A-Za-zÅÄÖåäö]{2,})$/);
  return {
    name: (match ? match[1] : raw).trim(),
    country: match ? normalizeCountryCode(match[2]) : ""
  };
}

function isSwedishPlayer(player) {
  const parsed = splitHistoryPlayerName(player.name || player.playerName || player.psn || "");
  const playerId = String(player.playerID || player.idPlayer || player.IDPlayer || player.playerId || "").trim();
  if (playerId && SWEDISH_PLAYER_OVERRIDES.ids.has(playerId)) return true;

  const nameCandidates = [
    parsed.name,
    player.name,
    player.playerName,
    player.psn,
    player.GT,
    player.alias,
    player.gamertag
  ];
  if (nameCandidates.some(name => SWEDISH_PLAYER_OVERRIDES.names.has(normalizeText(splitHistoryPlayerName(name).name)))) {
    return true;
  }

  return normalizeCountryCode(player.nationality || player.country || player.playerCountry || player.countryCode || parsed.country) === "SE";
}

function playerKey(player) {
  if (player.playerID !== undefined && player.playerID !== null) return "id:" + player.playerID;
  const name = splitHistoryPlayerName(player.name || player.playerName || player.psn || "").name.toLowerCase();
  return name ? "name:" + name : "";
}

function countsAsLeagueSeason(team) {
  const text = [team.division, team.divisionKey, team.leagueName, team.seasonName, team.seasonLabel]
    .map(value => String(value || "").toLowerCase())
    .join(" ");
  return !text.includes("qualifier") && !/(^|\s|-)kval($|\s|-)/i.test(text);
}

function seasonSortValue(team) {
  const leagueId = safeNumber(team.leagueID || team.IDLeague || team.idLeague);
  const label = String(team.seasonLabel || team.season || team.leagueName || "");
  if (leagueId >= 900000) {
    const sec = Number((label.match(/\bSEC\s*(\d+(?:\.\d+)?)\b/i) || [])[1] || 0);
    const legacyOrder = {
      1: 70,
      2: 84,
      3: 90,
      4: 110,
      5: 116,
      6: 160,
      7: 166,
      8: 185,
      9: 220,
      10: 240,
      11: 270,
      12: 305,
      13: 330
    };
    if (legacyOrder[sec]) return legacyOrder[sec];
    if (sec) return 2000 + sec * 10;
    return leagueId;
  }
  if (leagueId) return leagueId;
  const lower = label.toLowerCase();
  const split = lower.includes("spring") ? 2 : lower.includes("winter") ? 1 : 0;
  const ecl = Number((label.match(/\bECL\s*(\d+(?:\.\d+)?)\b/i) || [])[1] || 0);
  if (ecl) return 5000 + ecl * 10 + split;
  const eshl = Number((label.match(/\beSHL(?:\s*-\s*Season)?\s*(\d+)?\b/i) || [])[1] || 1);
  if (/\beSHL\b/i.test(label)) return 4000 + eshl * 10 + split;
  const scl = Number((label.match(/\bSCL\s*(\d+)?\b/i) || [])[1] || 1);
  if (/\bSCL\b/i.test(label)) return 3000 + scl * 10 + split;
  const sec = Number((label.match(/\bSEC\s*(\d+(?:\.\d+)?)\b/i) || [])[1] || 0);
  if (sec) return 2000 + sec * 10 + split;
  return safeNumber(team.seasonYear) * 10 + split;
}

function teamIdentityKey(teamName) {
  const key = normalizeText(teamName);
  const manualGroups = [
    ["Norrland", "IFK Norrland", "IF Norrland"],
    ["Bjorkloven Esport", "Björklöven Esport"]
  ];
  for (const group of manualGroups) {
    const keys = group.map(normalizeText);
    if (keys.includes(key)) return keys[0];
  }
  return key;
}

function buildIndex() {
  const teamsData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const players = new Map();

  (teamsData.teams || []).forEach(team => {
    if (!countsAsLeagueSeason(team)) return;

    (team.players || []).forEach(player => {
      if (!player || !isSwedishPlayer(player)) return;
      const key = playerKey(player);
      if (!key) return;

      if (!players.has(key)) {
        players.set(key, {
          playerID: player.playerID,
          userID: player.userID,
          name: player.name || player.playerName || player.psn || "Spelare",
          profileUrl: player.profileUrl || (player.playerID ? `https://sportsgamer.gg/players/${player.playerID}` : ""),
          playerImage: player.playerImage || player.image || player.avatar || "",
          primaryRole: player.primaryRole || "",
          nationality: "SE",
          country: "SE",
          playerCountry: "SE",
          seasons: [],
          divisions: [],
          teams: [],
          gamesPlayed: 0,
          regularGames: 0,
          playoffGames: 0,
          skaterGames: 0,
          goalieGames: 0,
          goals: 0,
          assists: 0,
          points: 0,
          pim: 0,
          saves: 0,
          goalsAllowed: 0,
          shotsAgainst: 0,
          shutouts: 0,
          goalieWins: 0,
          playedSeasons: 0,
          latest: null,
          latestSort: 0,
          clubKeys: [],
          seenRows: []
        });
      }

      const row = players.get(key);
      const games = safeNumber(player.gamesPlayed || player.games || player.totalGames || player.goalieGames || player.skaterGames);
      const role = String(player.primaryRole || player.role || "").toLowerCase();
      const goalieGames = safeNumber(player.goalieGames || (role === "g" || role.includes("goalie") ? games : 0));
      const skaterGames = safeNumber(player.skaterGames || (goalieGames > 0 ? Math.max(0, games - goalieGames) : games));
      const saves = safeNumber(player.saves);
      const goalsAllowed = safeNumber(player.goalsAllowed || player.goalsAgainst);
      const division = normalizeDivisionName(team.division || team.divisionKey || "");
      const seasonLabel = team.seasonLabel || team.season || team.leagueName || "";
      const teamName = team.name || team.teamName || team.seasonTeamName || "";
      const fingerprint = [team.leagueID || "", team.teamID || "", seasonLabel, teamName, division].join("|");
      if (row.seenRows.includes(fingerprint)) return;
      row.seenRows.push(fingerprint);

      if (seasonLabel && !row.seasons.includes(seasonLabel)) row.seasons.push(seasonLabel);
      if (division && !row.divisions.includes(division)) row.divisions.push(division);
      if (teamName && !row.teams.includes(teamName)) row.teams.push(teamName);
      const clubKey = teamIdentityKey(teamName);
      if (clubKey && !row.clubKeys.includes(clubKey)) row.clubKeys.push(clubKey);

      row.gamesPlayed += games;
      row.regularGames += safeNumber(player.regularGames);
      row.playoffGames += safeNumber(player.playoffGames);
      row.skaterGames += skaterGames;
      row.goalieGames += goalieGames;
      row.goals += safeNumber(player.goals);
      row.assists += safeNumber(player.assists);
      row.points += safeNumber(player.points);
      row.pim += safeNumber(player.pim || player.penaltyMinutes);
      row.saves += saves;
      row.goalsAllowed += goalsAllowed;
      row.shotsAgainst += safeNumber(player.shotsAgainst || player.sa) || (saves + goalsAllowed);
      row.shutouts += safeNumber(player.shutouts);
      row.goalieWins += safeNumber(player.goalieWins);
      if (games > 0) row.playedSeasons += 1;
      if (!row.primaryRole) row.primaryRole = player.primaryRole || "";

      const sort = seasonSortValue(team);
      if (sort > row.latestSort) {
        row.latestSort = sort;
        row.latest = {
          seasonLabel,
          season: seasonLabel,
          division,
          teamName,
          team: teamName,
          seasonName: team.seasonName,
          seasonYear: team.seasonYear,
          gamesPlayed: games
        };
      }
    });
  });

  if (fs.existsSync(SEC_LEGACY_FILE)) {
    const secLegacy = JSON.parse(fs.readFileSync(SEC_LEGACY_FILE, "utf8"));
    (secLegacy.playerHistory || []).forEach(playerHistory => {
      (playerHistory.history || []).forEach(historyRow => {
        if (!countsAsLeagueSeason(historyRow)) return;
        const player = {
          ...historyRow,
          playerID: playerHistory.playerID ?? historyRow.playerID,
          name: historyRow.playerName || historyRow.name || playerHistory.name || playerHistory.playerName || "",
          country: historyRow.country || historyRow.playerCountry || historyRow.nationality,
          playerCountry: historyRow.playerCountry || historyRow.country || historyRow.nationality,
          nationality: historyRow.nationality || historyRow.country || historyRow.playerCountry
        };
        if (!player || !isSwedishPlayer(player)) return;
        const key = playerKey(player);
        if (!key) return;

        if (!players.has(key)) {
          players.set(key, {
            playerID: player.playerID,
            userID: player.userID,
            name: splitHistoryPlayerName(player.name || player.playerName || player.psn || "").name || "Spelare",
            profileUrl: player.profileUrl || (player.playerID ? `https://sportsgamer.gg/players/${player.playerID}` : ""),
            playerImage: player.playerImage || player.image || player.avatar || "",
            primaryRole: player.primaryRole || "",
            nationality: "SE",
            country: "SE",
            playerCountry: "SE",
            seasons: [],
            divisions: [],
            teams: [],
            gamesPlayed: 0,
            regularGames: 0,
            playoffGames: 0,
            skaterGames: 0,
            goalieGames: 0,
            goals: 0,
            assists: 0,
            points: 0,
            pim: 0,
            saves: 0,
            goalsAllowed: 0,
            shotsAgainst: 0,
            shutouts: 0,
            goalieWins: 0,
            playedSeasons: 0,
            latest: null,
            latestSort: 0,
            clubKeys: [],
            seenRows: []
          });
        }

        const row = players.get(key);
        const division = normalizeDivisionName(historyRow.division || historyRow.divisionKey || "");
        const seasonLabel = historyRow.seasonLabel || historyRow.season || historyRow.leagueName || historyRow.seasonName || "";
        const teamName = historyRow.teamName || historyRow.team || "";
        const fingerprint = [historyRow.leagueID || "", historyRow.teamID || "", seasonLabel, teamName, division].join("|");
        if (row.seenRows.includes(fingerprint)) return;
        row.seenRows.push(fingerprint);

        const games = safeNumber(historyRow.gamesPlayed || historyRow.games || historyRow.totalGames || historyRow.goalieGames || historyRow.skaterGames || historyRow.played);
        const role = String(historyRow.primaryRole || historyRow.role || "").toLowerCase();
        const goalieGames = safeNumber(historyRow.goalieGames || (role === "g" || role.includes("goalie") ? games : 0));
        const skaterGames = safeNumber(historyRow.skaterGames || (goalieGames > 0 ? Math.max(0, games - goalieGames) : games));
        const saves = safeNumber(historyRow.saves || historyRow.sv);
        const goalsAllowed = safeNumber(historyRow.goalsAllowed || historyRow.goalsAgainst || historyRow.ga);

        if (seasonLabel && !row.seasons.includes(seasonLabel)) row.seasons.push(seasonLabel);
        if (division && !row.divisions.includes(division)) row.divisions.push(division);
        if (teamName && !row.teams.includes(teamName)) row.teams.push(teamName);
        const clubKey = teamIdentityKey(teamName);
        if (clubKey && !row.clubKeys.includes(clubKey)) row.clubKeys.push(clubKey);

        row.gamesPlayed += games;
        row.regularGames += safeNumber(historyRow.regularGames);
        row.playoffGames += safeNumber(historyRow.playoffGames);
        row.skaterGames += skaterGames;
        row.goalieGames += goalieGames;
        row.goals += safeNumber(historyRow.goals);
        row.assists += safeNumber(historyRow.assists);
        row.points += safeNumber(historyRow.points);
        row.pim += safeNumber(historyRow.pim || historyRow.penaltyMinutes);
        row.saves += saves;
        row.goalsAllowed += goalsAllowed;
        row.shotsAgainst += safeNumber(historyRow.shotsAgainst || historyRow.sa) || (saves + goalsAllowed);
        row.shutouts += safeNumber(historyRow.shutouts || historyRow.so);
        row.goalieWins += safeNumber(historyRow.goalieWins);
        if (games > 0) row.playedSeasons += 1;
        if (!row.primaryRole) row.primaryRole = historyRow.primaryRole || "";

        const sort = seasonSortValue(historyRow);
        if (sort > row.latestSort) {
          row.latestSort = sort;
          row.latest = {
            seasonLabel,
            season: seasonLabel,
            division,
            teamName,
            team: teamName,
            seasonName: historyRow.seasonName,
            seasonYear: historyRow.seasonYear,
            leagueID: historyRow.leagueID,
            gamesPlayed: games
          };
        }
      });
    });
  }

  const output = [...players.values()]
    .map(player => {
      const shots = safeNumber(player.shotsAgainst) || (safeNumber(player.saves) + safeNumber(player.goalsAllowed));
      const goalieGames = safeNumber(player.goalieGames);
      const { seenRows, clubKeys, ...cleanPlayer } = player;
      return {
        ...cleanPlayer,
        clubCount: clubKeys.filter(Boolean).length,
        seasonCount: player.seasons.length,
        savePct: shots > 0 ? ((safeNumber(player.saves) / shots) * 100).toFixed(1) : "",
        gaa: goalieGames > 0 ? (safeNumber(player.goalsAllowed) / goalieGames).toFixed(2) : ""
      };
    })
    .sort((a, b) => safeNumber(b.gamesPlayed) - safeNumber(a.gamesPlayed) || safeNumber(b.points) - safeNumber(a.points) || String(a.name || "").localeCompare(String(b.name || ""), "sv"));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ updated: teamsData.updated || "", players: output }), "utf8");
  console.log(`Wrote ${OUTPUT_FILE} with ${output.length} players`);
}

buildIndex();
