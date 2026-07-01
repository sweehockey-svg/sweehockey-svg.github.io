/*
  svenska-lag-historia-player-stats-audit.sql

  Hjälpfråga för att hitta säsonger där spelarstatistiken troligen inte är komplett.
  Kör mot databasen och sortera på diffPerRosterSlot eller missingTeamGames.

  Tolkning:
  - teamGames kommer från nhlgamer_matches.
  - playerGamesSum kommer från nhlgamer_playerStats + nhlgamer_goalieStats.
  - rosterPlayers kommer från roster och stats.
  - expectedPlayerGameSlots är teamGames * 6 som grov kontroll, inte en facitlista.

  Den här frågan skapar inte completions automatiskt eftersom databasen inte visar
  exakt vilken spelare som ska få vilka saknade matcher. Den används för att hitta
  rader som sedan läggs i svenska-lag-historia-player-completions.sql.
*/

WITH team_match_rows AS (
  SELECT
    m.leagueID,
    m.homeTeamID AS teamID,
    m.matchID,
    m.matchType
  FROM nhlgamer_matches m
  WHERE m.goalsHome IS NOT NULL
    AND m.goalsAway IS NOT NULL

  UNION ALL

  SELECT
    m.leagueID,
    m.awayTeamID AS teamID,
    m.matchID,
    m.matchType
  FROM nhlgamer_matches m
  WHERE m.goalsHome IS NOT NULL
    AND m.goalsAway IS NOT NULL
),
team_games AS (
  SELECT
    leagueID,
    teamID,
    COUNT(DISTINCT matchID) AS teamGames,
    SUM(CASE WHEN matchType = 'regular' THEN 1 ELSE 0 END) AS regularGames,
    SUM(CASE WHEN matchType <> 'regular' OR matchType IS NULL THEN 1 ELSE 0 END) AS playoffGames
  FROM team_match_rows
  GROUP BY leagueID, teamID
),
player_games AS (
  SELECT
    leagueID,
    teamID,
    playerID,
    SUM(gamesPlayed) AS gamesPlayed
  FROM nhlgamer_playerStats
  GROUP BY leagueID, teamID, playerID

  UNION ALL

  SELECT
    leagueID,
    teamID,
    playerID,
    SUM(gamesPlayed) AS gamesPlayed
  FROM nhlgamer_goalieStats
  GROUP BY leagueID, teamID, playerID
),
player_games_by_team AS (
  SELECT
    leagueID,
    teamID,
    COUNT(DISTINCT playerID) AS statPlayers,
    SUM(gamesPlayed) AS playerGamesSum
  FROM player_games
  GROUP BY leagueID, teamID
),
roster_by_team AS (
  SELECT
    leagueID,
    teamID,
    COUNT(DISTINCT playerID) AS rosterPlayers
  FROM (
    SELECT leagueID, teamID, playerID FROM nhlgamer_leagueRosters
    UNION
    SELECT leagueID, teamID, playerID FROM nhlgamer_playerStats
    UNION
    SELECT leagueID, teamID, playerID FROM nhlgamer_goalieStats
  ) x
  GROUP BY leagueID, teamID
)

SELECT
  lt.leagueID,
  lt.teamID,
  lt.country,
  COALESCE(NULLIF(lt.teamName, ''), t.teamName) AS teamName,
  tg.teamGames,
  tg.regularGames,
  tg.playoffGames,
  COALESCE(pg.statPlayers, 0) AS statPlayers,
  COALESCE(rb.rosterPlayers, 0) AS rosterPlayers,
  COALESCE(pg.playerGamesSum, 0) AS playerGamesSum,
  tg.teamGames * 6 AS expectedPlayerGameSlots,
  (tg.teamGames * 6) - COALESCE(pg.playerGamesSum, 0) AS missingPlayerGameSlots,
  ROUND(((tg.teamGames * 6) - COALESCE(pg.playerGamesSum, 0)) / NULLIF(COALESCE(rb.rosterPlayers, 0), 0), 2) AS diffPerRosterSlot
FROM team_games tg
JOIN nhlgamer_leagueTeams lt
  ON lt.leagueID = tg.leagueID
 AND lt.teamID = tg.teamID
JOIN nhlgamer_teams t
  ON t.teamID = tg.teamID
LEFT JOIN player_games_by_team pg
  ON pg.leagueID = tg.leagueID
 AND pg.teamID = tg.teamID
LEFT JOIN roster_by_team rb
  ON rb.leagueID = tg.leagueID
 AND rb.teamID = tg.teamID
WHERE tg.teamGames > 0
  AND lt.country = 'SE'
  AND COALESCE(rb.rosterPlayers, 0) > 0
  AND ((tg.teamGames * 6) - COALESCE(pg.playerGamesSum, 0)) >= 12
ORDER BY missingPlayerGameSlots DESC, diffPerRosterSlot DESC, tg.leagueID DESC, teamName ASC
LIMIT 200;
