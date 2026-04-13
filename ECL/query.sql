WITH
-- =====================================================
-- A) LEAGUE META
-- =====================================================
league_meta AS (
  SELECT 4   AS leagueID, 'ELITE' AS divisionName, 5 AS divisionRank, NULL AS seasonYear, NULL AS seasonName
  UNION ALL SELECT 5,   'ELITE', 5, NULL, NULL
  UNION ALL SELECT 17,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 18,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 19,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 20,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 23,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 24,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 25,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 27,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 28,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 29,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 35,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 36,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 37,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 40,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 41,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 42,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 55,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 56,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 57,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 58,  'NEO',   1, NULL, NULL
  UNION ALL SELECT 65,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 66,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 67,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 68,  'NEO',   1, NULL, NULL
  UNION ALL SELECT 94,  'ELITE', 5, NULL, NULL
  UNION ALL SELECT 95,  'PRO',   4, NULL, NULL
  UNION ALL SELECT 96,  'LITE',  3, NULL, NULL
  UNION ALL SELECT 97,  'NEO',   1, NULL, NULL
  UNION ALL SELECT 119, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 120, 'PRO',   4, NULL, NULL
  UNION ALL SELECT 121, 'LITE',  3, NULL, NULL
  UNION ALL SELECT 122, 'CORE',  2, NULL, NULL
  UNION ALL SELECT 123, 'NEO',   1, NULL, NULL
  UNION ALL SELECT 170, 'ELITE', 5, 2022, 'Winter'
  UNION ALL SELECT 171, 'PRO',   4, 2022, 'Winter'
  UNION ALL SELECT 172, 'LITE',  3, 2022, 'Winter'
  UNION ALL SELECT 173, 'CORE',  2, 2022, 'Winter'
  UNION ALL SELECT 174, 'NEO',   1, 2022, 'Winter'
  UNION ALL SELECT 190, 'ELITE', 5, 2022, 'Spring'
  UNION ALL SELECT 191, 'PRO',   4, 2022, 'Spring'
  UNION ALL SELECT 192, 'LITE',  3, 2022, 'Spring'
  UNION ALL SELECT 193, 'CORE',  2, 2022, 'Spring'
  UNION ALL SELECT 194, 'NEO',   1, 2022, 'Spring'
  UNION ALL SELECT 250, 'ELITE', 5, 2023, 'Winter'
  UNION ALL SELECT 251, 'PRO',   4, 2023, 'Winter'
  UNION ALL SELECT 252, 'LITE',  3, 2023, 'Winter'
  UNION ALL SELECT 253, 'CORE',  2, 2023, 'Winter'
  UNION ALL SELECT 254, 'NEO',   1, 2023, 'Winter'
  UNION ALL SELECT 305, 'ELITE', 5, 2023, 'Spring'
  UNION ALL SELECT 306, 'PRO',   4, 2023, 'Spring'
  UNION ALL SELECT 307, 'LITE',  3, 2023, 'Spring'
  UNION ALL SELECT 308, 'CORE',  2, 2023, 'Spring'
  UNION ALL SELECT 309, 'NEO',   1, 2023, 'Spring'
  UNION ALL SELECT 338, 'ELITE', 5, 2024, 'Winter'
  UNION ALL SELECT 339, 'PRO',   4, 2024, 'Winter'
  UNION ALL SELECT 340, 'LITE',  3, 2024, 'Winter'
  UNION ALL SELECT 341, 'CORE',  2, 2024, 'Winter'
  UNION ALL SELECT 342, 'NEO',   1, 2024, 'Winter'
  UNION ALL SELECT 379, 'ELITE', 5, 2024, 'Spring'
  UNION ALL SELECT 380, 'PRO',   4, 2024, 'Spring'
  UNION ALL SELECT 381, 'LITE',  3, 2024, 'Spring'
  UNION ALL SELECT 382, 'CORE',  2, 2024, 'Spring'
  UNION ALL SELECT 383, 'NEO',   1, 2024, 'Spring'
  UNION ALL SELECT 411, 'ELITE', 5, 2025, 'Winter'
  UNION ALL SELECT 412, 'PRO',   4, 2025, 'Winter'
  UNION ALL SELECT 413, 'LITE',  3, 2025, 'Winter'
  UNION ALL SELECT 414, 'CORE',  2, 2025, 'Winter'
  UNION ALL SELECT 415, 'NEO',   1, 2025, 'Winter'
  UNION ALL SELECT 461, 'ELITE', 5, 2025, 'Spring'
  UNION ALL SELECT 462, 'PRO',   4, 2025, 'Spring'
  UNION ALL SELECT 463, 'LITE',  3, 2025, 'Spring'
  UNION ALL SELECT 464, 'CORE',  2, 2025, 'Spring'
  UNION ALL SELECT 465, 'NEO',   1, 2025, 'Spring'
  UNION ALL SELECT 482, 'ELITE QUALIFIER', NULL, 2026, 'Winter'
  UNION ALL SELECT 484, 'LITE',  3, 2026, 'Winter'
  UNION ALL SELECT 485, 'LITE',  3, 2026, 'Winter'
  UNION ALL SELECT 486, 'NEO',   1, 2026, 'Winter'
  UNION ALL SELECT 487, 'ELITE', 5, 2026, 'Winter'
  UNION ALL SELECT 488, 'PRO',   4, 2026, 'Winter'
  UNION ALL SELECT 489, 'LITE',  3, 2026, 'Winter'
  UNION ALL SELECT 490, 'CORE',  2, 2026, 'Winter'
  UNION ALL SELECT 491, 'NEO',   1, 2026, 'Winter'
  UNION ALL SELECT 502, 'ELITE QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 503, 'PRO WILDCARD BATTLE', NULL, 2026, 'Spring'
  UNION ALL SELECT 504, 'PRO QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 505, 'PRO QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 506, 'PRO QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 507, 'ELITE', 5, 2026, 'Spring'
  UNION ALL SELECT 508, 'PRO',   4, 2026, 'Spring'
  UNION ALL SELECT 509, 'LITE',  3, 2026, 'Spring'
  UNION ALL SELECT 510, 'CORE',  2, 2026, 'Spring'
  UNION ALL SELECT 511, 'NEO',   1, 2026, 'Spring'
),

-- =====================================================
-- B) CURRENT SPRING 26 TEAM META
--    Nuvarande ligor = 502-511
-- =====================================================
current_league_teams AS (
  SELECT
    lt.leagueID,
    lt.teamID,
    t.teamName,
    COALESCE(lt.country, t.country) AS teamCountry,
    lt.registeredForLeague AS registrationDate,
    COALESCE(lt.hasLicense, 0) AS teamLicense,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(lt.additional_info, '$.division')) AS UNSIGNED) AS targetDivisionLeagueID,
    CASE CAST(JSON_UNQUOTE(JSON_EXTRACT(lt.additional_info, '$.division')) AS UNSIGNED)
      WHEN 507 THEN 'ELITE'
      WHEN 508 THEN 'PRO'
      WHEN 509 THEN 'LITE'
      WHEN 510 THEN 'CORE'
      WHEN 511 THEN 'NEO'
      ELSE 'UNKNOWN'
    END AS divisionName,
    CASE
      WHEN JSON_CONTAINS(
        COALESCE(JSON_EXTRACT(lt.additional_info, '$.qualifiers'), JSON_ARRAY()),
        JSON_QUOTE('502')
      ) THEN 'ELITE QUALIFIER'
      WHEN JSON_CONTAINS(
        COALESCE(JSON_EXTRACT(lt.additional_info, '$.qualifiers'), JSON_ARRAY()),
        JSON_QUOTE('504')
      )
      OR JSON_CONTAINS(
        COALESCE(JSON_EXTRACT(lt.additional_info, '$.qualifiers'), JSON_ARRAY()),
        JSON_QUOTE('505')
      )
      OR JSON_CONTAINS(
        COALESCE(JSON_EXTRACT(lt.additional_info, '$.qualifiers'), JSON_ARRAY()),
        JSON_QUOTE('506')
      ) THEN 'PRO QUALIFIER'
      WHEN JSON_CONTAINS(
        COALESCE(JSON_EXTRACT(lt.additional_info, '$.qualifiers'), JSON_ARRAY()),
        JSON_QUOTE('503')
      ) THEN 'WILDCARD'
      ELSE NULL
    END AS qualifierName,
    lt.teamCaptainID,
    lt.teamAssistantCaptainID,
    lt.teamAssistantCaptainID2
  FROM nhlgamer_leagueTeams lt
  JOIN nhlgamer_teams t
    ON t.teamID = lt.teamID
  WHERE lt.leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
),

current_league_teams_signup_dedup AS (
  SELECT
    x.leagueID,
    x.teamID,
    x.teamName,
    x.teamCountry,
    x.registrationDate,
    x.teamLicense,
    x.targetDivisionLeagueID,
    x.divisionName,
    x.qualifierName,
    x.teamCaptainID,
    x.teamAssistantCaptainID,
    x.teamAssistantCaptainID2
  FROM (
    SELECT
      clt.*,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(clt.teamName))
        ORDER BY
          clt.leagueID DESC,
          clt.registrationDate DESC,
          clt.teamID DESC
      ) AS rn
    FROM current_league_teams clt
  ) x
  WHERE x.rn = 1
),

-- =====================================================
-- C) CURRENT SPRING 26 PLAYERS
--    Nuvarande ligor = 502-511
-- =====================================================
current_players_base AS (
  SELECT
    clt.leagueID,
    clt.teamID,
    clt.teamName,
    clt.divisionName,
    clt.qualifierName,
    clt.teamCountry,
    r.playerID,
    p.userID,
    COALESCE(p.psntag, p.gamertag) AS playerName
  FROM current_league_teams clt
  LEFT JOIN nhlgamer_leagueRosters r
    ON r.teamID = clt.teamID
   AND r.leagueID = clt.leagueID
  LEFT JOIN nhlgamer_players p
    ON p.playerID = r.playerID
),

current_players_lite AS (
  SELECT *
  FROM current_players_base
  WHERE divisionName = 'LITE'
    AND COALESCE(qualifierName, '') NOT IN ('PRO QUALIFIER', 'WILDCARD')
),

current_players_core AS (
  SELECT *
  FROM current_players_base
  WHERE divisionName = 'CORE'
    AND COALESCE(qualifierName, '') NOT IN ('PRO QUALIFIER', 'WILDCARD')
),

current_players_neo AS (
  SELECT *
  FROM current_players_base
  WHERE divisionName = 'NEO'
    AND COALESCE(qualifierName, '') NOT IN ('PRO QUALIFIER', 'WILDCARD')
),

-- =====================================================
-- D) ALL GAMES PER PLAYER / TEAM / LEAGUE
-- =====================================================
player_games_by_team AS (
  SELECT
    x.playerID,
    x.teamID,
    x.leagueID,
    SUM(x.groupMatches) AS groupMatches,
    SUM(x.playoffMatches) AS playoffMatches
  FROM (
    SELECT
      ps.playerID,
      ps.teamID,
      ps.leagueID,
      SUM(CASE WHEN ps.gameType = 'regular' THEN ps.gamesPlayed ELSE 0 END) AS groupMatches,
      SUM(CASE WHEN ps.gameType <> 'regular' OR ps.gameType IS NULL THEN ps.gamesPlayed ELSE 0 END) AS playoffMatches
    FROM nhlgamer_playerStats ps
    GROUP BY ps.playerID, ps.teamID, ps.leagueID

    UNION ALL

    SELECT
      gs.playerID,
      gs.teamID,
      gs.leagueID,
      SUM(CASE WHEN gs.gameType = 'regular' THEN gs.gamesPlayed ELSE 0 END) AS groupMatches,
      SUM(CASE WHEN gs.gameType <> 'regular' OR gs.gameType IS NULL THEN gs.gamesPlayed ELSE 0 END) AS playoffMatches
    FROM nhlgamer_goalieStats gs
    GROUP BY gs.playerID, gs.teamID, gs.leagueID
  ) x
  GROUP BY x.playerID, x.teamID, x.leagueID
),

player_games AS (
  SELECT
    pgt.playerID,
    pgt.leagueID,
    SUM(pgt.groupMatches) AS groupMatches,
    SUM(pgt.playoffMatches) AS playoffMatches
  FROM player_games_by_team pgt
  GROUP BY pgt.playerID, pgt.leagueID
),

player_league_team_names AS (
  SELECT
    z.playerID,
    z.leagueID,
    MIN(z.teamID) AS teamID,
    GROUP_CONCAT(
      DISTINCT z.teamName
      ORDER BY z.sortMatches DESC, z.teamName
      SEPARATOR ' / '
    ) AS teamName
  FROM (
    SELECT
      pgt.playerID,
      pgt.leagueID,
      pgt.teamID,
      t.teamName,
      (COALESCE(pgt.groupMatches, 0) + COALESCE(pgt.playoffMatches, 0)) AS sortMatches
    FROM player_games_by_team pgt
    JOIN nhlgamer_teams t
      ON t.teamID = pgt.teamID
  ) z
  GROUP BY z.playerID, z.leagueID
),

history_roster_leagues AS (
  SELECT
    x.playerID,
    x.teamID,
    x.leagueID
  FROM (
    SELECT
      lr.playerID,
      lr.teamID,
      lr.leagueID,
      ROW_NUMBER() OVER (
        PARTITION BY lr.playerID, lr.leagueID
        ORDER BY lr.teamID DESC
      ) AS rn
    FROM nhlgamer_leagueRosters lr
  ) x
  WHERE x.rn = 1
),

-- =====================================================
-- E) HISTORY ROSTERS
-- =====================================================
history_rosters AS (
  SELECT
    hrl.playerID,
    COALESCE(pltn.teamID, hrl.teamID) AS teamID,
    hrl.leagueID,
    COALESCE(pltn.teamName, t.teamName) AS teamName,
    lm.divisionName,
    lm.divisionRank,
    lm.seasonYear,
    lm.seasonName,
    COALESCE(pg.groupMatches, 0) AS groupMatches,
    COALESCE(pg.playoffMatches, 0) AS playoffMatches,
    COALESCE(pg.groupMatches, 0) + COALESCE(pg.playoffMatches, 0) AS totalMatches
  FROM history_roster_leagues hrl
  JOIN league_meta lm
    ON lm.leagueID = hrl.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = hrl.teamID
  LEFT JOIN player_games pg
    ON pg.playerID = hrl.playerID
   AND pg.leagueID = hrl.leagueID
  LEFT JOIN player_league_team_names pltn
    ON pltn.playerID = hrl.playerID
   AND pltn.leagueID = hrl.leagueID
  WHERE lm.seasonYear IN (2025, 2026)
    AND lm.divisionName IN ('ELITE', 'PRO', 'LITE', 'CORE', 'NEO')
    AND hrl.leagueID NOT IN (482, 502, 503, 504, 505, 506)
),

history_rosters_same_team_season AS (
  SELECT
    x.playerID,
    x.teamID,
    x.leagueID,
    x.teamName,
    x.divisionName,
    x.divisionRank,
    x.seasonYear,
    x.seasonName,
    x.groupMatches,
    x.playoffMatches,
    x.totalMatches
  FROM (
    SELECT
      hr.playerID,
      hr.teamID,
      hr.leagueID,
      hr.teamName,
      hr.divisionName,
      hr.divisionRank,
      hr.seasonYear,
      hr.seasonName,
      hr.groupMatches,
      hr.playoffMatches,
      hr.totalMatches,
      ROW_NUMBER() OVER (
        PARTITION BY hr.playerID, hr.teamID, hr.seasonYear, hr.seasonName
        ORDER BY
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM history_rosters hr2
              WHERE hr2.playerID = hr.playerID
                AND hr2.teamID = hr.teamID
                AND COALESCE(hr2.seasonYear, 0) = COALESCE(hr.seasonYear, 0)
                AND COALESCE(hr2.seasonName, '') = COALESCE(hr.seasonName, '')
                AND hr2.divisionName = 'PRO'
            )
            AND EXISTS (
              SELECT 1
              FROM history_rosters hr3
              WHERE hr3.playerID = hr.playerID
                AND hr3.teamID = hr.teamID
                AND COALESCE(hr3.seasonYear, 0) = COALESCE(hr.seasonYear, 0)
                AND COALESCE(hr3.seasonName, '') = COALESCE(hr.seasonName, '')
                AND hr3.divisionName = 'ELITE'
            )
            THEN CASE
              WHEN hr.divisionName = 'PRO' THEN 1
              WHEN hr.divisionName = 'ELITE' THEN 2
              ELSE 3
            END
            ELSE 1
          END,
          hr.divisionRank DESC,
          hr.leagueID DESC
      ) AS rn
    FROM history_rosters hr
  ) x
  WHERE x.rn = 1
),

history_rosters_dedup AS (
  SELECT
    hrs.playerID,
    MIN(hrs.teamID) AS teamID,
    MAX(hrs.leagueID) AS leagueID,
    GROUP_CONCAT(
      DISTINCT hrs.teamName
      ORDER BY hrs.teamName
      SEPARATOR ' / '
    ) AS teamName,
    hrs.divisionName,
    hrs.divisionRank,
    hrs.seasonYear,
    hrs.seasonName,
    SUM(hrs.groupMatches) AS groupMatches,
    SUM(hrs.playoffMatches) AS playoffMatches,
    SUM(hrs.totalMatches) AS totalMatches
  FROM history_rosters_same_team_season hrs
  GROUP BY
    hrs.playerID,
    hrs.divisionName,
    hrs.divisionRank,
    hrs.seasonYear,
    hrs.seasonName
),

-- =====================================================
-- F) PLAYOFF TOTALS
-- =====================================================
player_total_playoff_games AS (
  SELECT
    hr.playerID,
    SUM(hr.playoffMatches) AS playoffGames
  FROM history_rosters_dedup hr
  GROUP BY hr.playerID
),

player_core_playoff_games AS (
  SELECT
    hr.playerID,
    SUM(hr.playoffMatches) AS corePlayoffGames
  FROM history_rosters_dedup hr
  WHERE hr.divisionName = 'CORE'
  GROUP BY hr.playerID
),

-- =====================================================
-- G) LITE
-- =====================================================
lite_player_bucket AS (
  SELECT
    cp.leagueID,
    cp.teamID,
    cp.teamName,
    cp.playerID,
    cp.userID,
    cp.playerName,
    CASE
      WHEN MAX(CASE WHEN hr.divisionName = 'ELITE' THEN 1 ELSE 0 END) = 1 THEN 'ELITE'
      WHEN MAX(CASE WHEN hr.divisionName = 'PRO' THEN 1 ELSE 0 END) = 1 THEN 'PRO'
      ELSE 'LITE OR LOWER'
    END AS bucket,
    COALESCE(ptpg.playoffGames, 0) AS playoffGames
  FROM current_players_lite cp
  LEFT JOIN history_rosters_dedup hr
    ON hr.playerID = cp.playerID
  LEFT JOIN player_total_playoff_games ptpg
    ON ptpg.playerID = cp.playerID
  GROUP BY
    cp.leagueID,
    cp.teamID,
    cp.teamName,
    cp.playerID,
    cp.userID,
    cp.playerName,
    ptpg.playoffGames
),

lite_history_ranked AS (
  SELECT *
  FROM (
    SELECT
      cp.leagueID,
      cp.teamID,
      cp.teamName,
      cp.playerID,
      cp.playerName,
      hr.divisionName,
      hr.teamName AS historyTeam,
      hr.seasonYear,
      hr.seasonName,
      hr.groupMatches,
      hr.playoffMatches,
      hr.totalMatches,
      ROW_NUMBER() OVER (
        PARTITION BY cp.leagueID, cp.teamID, cp.playerID
        ORDER BY
          hr.seasonYear DESC,
          CASE WHEN hr.seasonName = 'Spring' THEN 2 ELSE 1 END DESC,
          hr.divisionRank DESC,
          hr.leagueID DESC
      ) AS historyRank
    FROM current_players_lite cp
    LEFT JOIN history_rosters_dedup hr
      ON hr.playerID = cp.playerID
  ) x
  WHERE x.historyRank <= 3
),

lite_players_pivot AS (
  SELECT
    lpb.leagueID,
    lpb.teamID,
    lpb.playerID,
    lpb.userID,
    lpb.playerName,
    lpb.bucket,
    lpb.playoffGames,

    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.divisionName END) AS history1Division,
    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.historyTeam END) AS history1Team,
    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.seasonYear END) AS history1Year,
    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.seasonName END) AS history1Season,
    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.groupMatches END) AS history1GroupMatches,
    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.playoffMatches END) AS history1PlayoffMatches,
    MAX(CASE WHEN lhr.historyRank = 1 THEN lhr.totalMatches END) AS history1Matches,

    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.divisionName END) AS history2Division,
    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.historyTeam END) AS history2Team,
    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.seasonYear END) AS history2Year,
    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.seasonName END) AS history2Season,
    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.groupMatches END) AS history2GroupMatches,
    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.playoffMatches END) AS history2PlayoffMatches,
    MAX(CASE WHEN lhr.historyRank = 2 THEN lhr.totalMatches END) AS history2Matches,

    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.divisionName END) AS history3Division,
    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.historyTeam END) AS history3Team,
    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.seasonYear END) AS history3Year,
    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.seasonName END) AS history3Season,
    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.groupMatches END) AS history3GroupMatches,
    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.playoffMatches END) AS history3PlayoffMatches,
    MAX(CASE WHEN lhr.historyRank = 3 THEN lhr.totalMatches END) AS history3Matches
  FROM lite_player_bucket lpb
  LEFT JOIN lite_history_ranked lhr
    ON lhr.leagueID = lpb.leagueID
   AND lhr.teamID = lpb.teamID
   AND lhr.playerID = lpb.playerID
  GROUP BY
    lpb.leagueID,
    lpb.teamID,
    lpb.playerID,
    lpb.userID,
    lpb.playerName,
    lpb.bucket,
    lpb.playoffGames
),

lite_players_json AS (
  SELECT
    lpp.leagueID,
    lpp.teamID,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', lpp.playerID,
        'userID', lpp.userID,
        'playerName', lpp.playerName,
        'bucket', lpp.bucket,
        'playoffGames', lpp.playoffGames,
        'history1Division', lpp.history1Division,
        'history1Team', lpp.history1Team,
        'history1Year', lpp.history1Year,
        'history1Season', lpp.history1Season,
        'history1GroupMatches', lpp.history1GroupMatches,
        'history1PlayoffMatches', lpp.history1PlayoffMatches,
        'history1Matches', lpp.history1Matches,
        'history2Division', lpp.history2Division,
        'history2Team', lpp.history2Team,
        'history2Year', lpp.history2Year,
        'history2Season', lpp.history2Season,
        'history2GroupMatches', lpp.history2GroupMatches,
        'history2PlayoffMatches', lpp.history2PlayoffMatches,
        'history2Matches', lpp.history2Matches,
        'history3Division', lpp.history3Division,
        'history3Team', lpp.history3Team,
        'history3Year', lpp.history3Year,
        'history3Season', lpp.history3Season,
        'history3GroupMatches', lpp.history3GroupMatches,
        'history3PlayoffMatches', lpp.history3PlayoffMatches,
        'history3Matches', lpp.history3Matches
      )
    ) AS players
  FROM (
    SELECT *
    FROM lite_players_pivot
    ORDER BY playerName
  ) lpp
  GROUP BY lpp.leagueID, lpp.teamID
),

lite_team_summary AS (
  SELECT
    lpb.leagueID,
    lpb.teamID,
    lpb.teamName,
    SUM(CASE WHEN lpb.bucket = 'ELITE' THEN 1 ELSE 0 END) AS EP,
    SUM(CASE WHEN lpb.bucket = 'PRO' THEN 1 ELSE 0 END) AS PP,
    SUM(CASE WHEN lpb.bucket = 'LITE OR LOWER' THEN 1 ELSE 0 END) AS LP,
    COUNT(lpb.playerID) AS totalPlayers,
    SUM(CASE WHEN lpb.bucket IN ('ELITE', 'PRO') AND lpb.playoffGames > 0 THEN 1 ELSE 0 END) AS playersWithPlayoffGames,
    GROUP_CONCAT(
      CASE WHEN lpb.bucket = 'ELITE' THEN CONCAT(lpb.playerName, ' (', lpb.playoffGames, ')') END
      ORDER BY lpb.playerName SEPARATOR ', '
    ) AS elitePlayerNames,
    GROUP_CONCAT(
      CASE WHEN lpb.bucket = 'PRO' THEN CONCAT(lpb.playerName, ' (', lpb.playoffGames, ')') END
      ORDER BY lpb.playerName SEPARATOR ', '
    ) AS proPlayerNames,
    SUM(
      CASE
        WHEN lpb.bucket = 'ELITE' THEN 2.5
        WHEN lpb.bucket = 'PRO' THEN 2.0
        ELSE 0.0
      END
    ) AS totalPoints
  FROM lite_player_bucket lpb
  GROUP BY lpb.leagueID, lpb.teamID, lpb.teamName
),

lite_final AS (
  SELECT
    lts.leagueID,
    lts.teamID,
    lts.teamName,
    lts.EP,
    lts.PP,
    lts.LP,
    lts.totalPlayers,
    lts.playersWithPlayoffGames,
    COALESCE(lts.elitePlayerNames, '') AS elitePlayerNames,
    COALESCE(lts.proPlayerNames, '') AS proPlayerNames,
    lts.totalPoints,
    CASE WHEN lts.totalPoints <= 4.5 THEN 'OK' ELSE 'NOT OK' END AS compatibility,
    COALESCE(lpj.players, JSON_ARRAY()) AS players
  FROM lite_team_summary lts
  LEFT JOIN lite_players_json lpj
    ON lpj.leagueID = lts.leagueID
   AND lpj.teamID = lts.teamID
),

lite_final_dedup AS (
  SELECT
    x.leagueID,
    x.teamID,
    x.teamName,
    x.EP,
    x.PP,
    x.LP,
    x.totalPlayers,
    x.playersWithPlayoffGames,
    x.elitePlayerNames,
    x.proPlayerNames,
    x.totalPoints,
    x.compatibility,
    x.players
  FROM (
    SELECT
      lf.*,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(lf.teamName))
        ORDER BY
          lf.leagueID DESC,
          lf.teamID DESC
      ) AS rn
    FROM lite_final lf
  ) x
  WHERE x.rn = 1
),

-- =====================================================
-- H) CORE
-- =====================================================
core_player_bucket AS (
  SELECT
    cp.leagueID,
    cp.teamID,
    cp.teamName,
    cp.playerID,
    cp.userID,
    cp.playerName,
    CASE
      WHEN MAX(CASE WHEN hr.divisionName = 'ELITE' THEN 1 ELSE 0 END) = 1 THEN 'ELITE'
      WHEN MAX(CASE WHEN hr.divisionName = 'PRO' THEN 1 ELSE 0 END) = 1 THEN 'PRO'
      WHEN MAX(CASE WHEN hr.divisionName = 'LITE' THEN 1 ELSE 0 END) = 1 THEN 'LITE'
      ELSE 'CORE OR LOWER'
    END AS bucket,
    COALESCE(ptpg.playoffGames, 0) AS playoffGames
  FROM current_players_core cp
  LEFT JOIN history_rosters_dedup hr
    ON hr.playerID = cp.playerID
  LEFT JOIN player_total_playoff_games ptpg
    ON ptpg.playerID = cp.playerID
  GROUP BY cp.leagueID, cp.teamID, cp.teamName, cp.playerID, cp.userID, cp.playerName, ptpg.playoffGames
),

core_history_ranked AS (
  SELECT *
  FROM (
    SELECT
      cp.leagueID,
      cp.teamID,
      cp.teamName,
      cp.playerID,
      cp.playerName,
      hr.divisionName,
      hr.teamName AS historyTeam,
      hr.seasonYear,
      hr.seasonName,
      hr.groupMatches,
      hr.playoffMatches,
      hr.totalMatches,
      ROW_NUMBER() OVER (
        PARTITION BY cp.leagueID, cp.teamID, cp.playerID
        ORDER BY
          hr.seasonYear DESC,
          CASE WHEN hr.seasonName = 'Spring' THEN 2 ELSE 1 END DESC,
          hr.divisionRank DESC,
          hr.leagueID DESC
      ) AS historyRank
    FROM current_players_core cp
    LEFT JOIN history_rosters_dedup hr
      ON hr.playerID = cp.playerID
  ) x
  WHERE x.historyRank <= 3
),

core_players_pivot AS (
  SELECT
    cpb.leagueID,
    cpb.teamID,
    cpb.playerID,
    cpb.userID,
    cpb.playerName,
    cpb.bucket,
    cpb.playoffGames,

    MAX(CASE WHEN chr.historyRank = 1 THEN chr.divisionName END) AS history1Division,
    MAX(CASE WHEN chr.historyRank = 1 THEN chr.historyTeam END) AS history1Team,
    MAX(CASE WHEN chr.historyRank = 1 THEN chr.seasonYear END) AS history1Year,
    MAX(CASE WHEN chr.historyRank = 1 THEN chr.seasonName END) AS history1Season,
    MAX(CASE WHEN chr.historyRank = 1 THEN chr.groupMatches END) AS history1GroupMatches,
    MAX(CASE WHEN chr.historyRank = 1 THEN chr.playoffMatches END) AS history1PlayoffMatches,
    MAX(CASE WHEN chr.historyRank = 1 THEN chr.totalMatches END) AS history1Matches,

    MAX(CASE WHEN chr.historyRank = 2 THEN chr.divisionName END) AS history2Division,
    MAX(CASE WHEN chr.historyRank = 2 THEN chr.historyTeam END) AS history2Team,
    MAX(CASE WHEN chr.historyRank = 2 THEN chr.seasonYear END) AS history2Year,
    MAX(CASE WHEN chr.historyRank = 2 THEN chr.seasonName END) AS history2Season,
    MAX(CASE WHEN chr.historyRank = 2 THEN chr.groupMatches END) AS history2GroupMatches,
    MAX(CASE WHEN chr.historyRank = 2 THEN chr.playoffMatches END) AS history2PlayoffMatches,
    MAX(CASE WHEN chr.historyRank = 2 THEN chr.totalMatches END) AS history2Matches,

    MAX(CASE WHEN chr.historyRank = 3 THEN chr.divisionName END) AS history3Division,
    MAX(CASE WHEN chr.historyRank = 3 THEN chr.historyTeam END) AS history3Team,
    MAX(CASE WHEN chr.historyRank = 3 THEN chr.seasonYear END) AS history3Year,
    MAX(CASE WHEN chr.historyRank = 3 THEN chr.seasonName END) AS history3Season,
    MAX(CASE WHEN chr.historyRank = 3 THEN chr.groupMatches END) AS history3GroupMatches,
    MAX(CASE WHEN chr.historyRank = 3 THEN chr.playoffMatches END) AS history3PlayoffMatches,
    MAX(CASE WHEN chr.historyRank = 3 THEN chr.totalMatches END) AS history3Matches
  FROM core_player_bucket cpb
  LEFT JOIN core_history_ranked chr
    ON chr.leagueID = cpb.leagueID
   AND chr.teamID = cpb.teamID
   AND chr.playerID = cpb.playerID
  GROUP BY cpb.leagueID, cpb.teamID, cpb.playerID, cpb.userID, cpb.playerName, cpb.bucket, cpb.playoffGames
),

core_players_json AS (
  SELECT
    cpp.leagueID,
    cpp.teamID,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', cpp.playerID,
        'userID', cpp.userID,
        'playerName', cpp.playerName,
        'bucket', cpp.bucket,
        'playoffGames', cpp.playoffGames,
        'history1Division', cpp.history1Division,
        'history1Team', cpp.history1Team,
        'history1Year', cpp.history1Year,
        'history1Season', cpp.history1Season,
        'history1GroupMatches', cpp.history1GroupMatches,
        'history1PlayoffMatches', cpp.history1PlayoffMatches,
        'history1Matches', cpp.history1Matches,
        'history2Division', cpp.history2Division,
        'history2Team', cpp.history2Team,
        'history2Year', cpp.history2Year,
        'history2Season', cpp.history2Season,
        'history2GroupMatches', cpp.history2GroupMatches,
        'history2PlayoffMatches', cpp.history2PlayoffMatches,
        'history2Matches', cpp.history2Matches,
        'history3Division', cpp.history3Division,
        'history3Team', cpp.history3Team,
        'history3Year', cpp.history3Year,
        'history3Season', cpp.history3Season,
        'history3GroupMatches', cpp.history3GroupMatches,
        'history3PlayoffMatches', cpp.history3PlayoffMatches,
        'history3Matches', cpp.history3Matches
      )
    ) AS players
  FROM (
    SELECT *
    FROM core_players_pivot
    ORDER BY playerName
  ) cpp
  GROUP BY cpp.leagueID, cpp.teamID
),

core_team_summary AS (
  SELECT
    cpb.leagueID,
    cpb.teamID,
    cpb.teamName,
    SUM(CASE WHEN cpb.bucket = 'ELITE' THEN 1 ELSE 0 END) AS EP,
    SUM(CASE WHEN cpb.bucket = 'PRO' THEN 1 ELSE 0 END) AS PP,
    SUM(CASE WHEN cpb.bucket = 'LITE' THEN 1 ELSE 0 END) AS LP,
    SUM(CASE WHEN cpb.bucket = 'CORE OR LOWER' THEN 1 ELSE 0 END) AS CP,
    COUNT(cpb.playerID) AS totalPlayers,
    SUM(CASE WHEN cpb.bucket IN ('ELITE', 'PRO', 'LITE') AND cpb.playoffGames > 0 THEN 1 ELSE 0 END) AS playersWithPlayoffGames,
    GROUP_CONCAT(CASE WHEN cpb.bucket = 'ELITE' THEN CONCAT(cpb.playerName, ' (', cpb.playoffGames, ')') END ORDER BY cpb.playerName SEPARATOR ', ') AS elitePlayerNames,
    GROUP_CONCAT(CASE WHEN cpb.bucket = 'PRO' THEN CONCAT(cpb.playerName, ' (', cpb.playoffGames, ')') END ORDER BY cpb.playerName SEPARATOR ', ') AS proPlayerNames,
    GROUP_CONCAT(CASE WHEN cpb.bucket = 'LITE' THEN CONCAT(cpb.playerName, ' (', cpb.playoffGames, ')') END ORDER BY cpb.playerName SEPARATOR ', ') AS litePlayerNames,
    SUM(
      CASE
        WHEN cpb.bucket = 'ELITE' THEN 2.5
        WHEN cpb.bucket = 'PRO' THEN 2.0
        WHEN cpb.bucket = 'LITE' THEN 1.0
        ELSE 0.0
      END
    ) AS totalPoints
  FROM core_player_bucket cpb
  GROUP BY cpb.leagueID, cpb.teamID, cpb.teamName
),

core_final AS (
  SELECT
    cts.leagueID,
    cts.teamID,
    cts.teamName,
    cts.EP,
    cts.PP,
    cts.LP,
    cts.CP,
    cts.totalPlayers,
    cts.playersWithPlayoffGames,
    COALESCE(cts.elitePlayerNames, '') AS elitePlayerNames,
    COALESCE(cts.proPlayerNames, '') AS proPlayerNames,
    COALESCE(cts.litePlayerNames, '') AS litePlayerNames,
    cts.totalPoints,
    CASE WHEN cts.totalPoints <= 3.5 THEN 'OK' ELSE 'NOT OK' END AS compatibility,
    COALESCE(cpj.players, JSON_ARRAY()) AS players
  FROM core_team_summary cts
  LEFT JOIN core_players_json cpj
    ON cpj.leagueID = cts.leagueID
   AND cpj.teamID = cts.teamID
),

-- =====================================================
-- I) NEO
-- =====================================================
neo_player_bucket AS (
  SELECT
    cp.leagueID,
    cp.teamID,
    cp.teamName,
    cp.playerID,
    cp.userID,
    cp.playerName,
    CASE
      WHEN MAX(CASE WHEN hr.divisionName = 'ELITE' THEN 1 ELSE 0 END) = 1 THEN 'ELITE'
      WHEN MAX(CASE WHEN hr.divisionName = 'PRO' THEN 1 ELSE 0 END) = 1 THEN 'PRO'
      WHEN MAX(CASE WHEN hr.divisionName = 'LITE' THEN 1 ELSE 0 END) = 1 THEN 'LITE'
      WHEN MAX(CASE WHEN hr.divisionName = 'CORE' THEN 1 ELSE 0 END) = 1
           AND COALESCE(pcpg.corePlayoffGames, 0) > 0 THEN 'LITE'
      WHEN MAX(CASE WHEN hr.divisionName = 'CORE' THEN 1 ELSE 0 END) = 1 THEN 'CORE'
      ELSE 'NEO OR LOWER'
    END AS bucket,
    COALESCE(ptpg.playoffGames, 0) AS playoffGames
  FROM current_players_neo cp
  LEFT JOIN history_rosters_dedup hr
    ON hr.playerID = cp.playerID
  LEFT JOIN player_total_playoff_games ptpg
    ON ptpg.playerID = cp.playerID
  LEFT JOIN player_core_playoff_games pcpg
    ON pcpg.playerID = cp.playerID
  GROUP BY cp.leagueID, cp.teamID, cp.teamName, cp.playerID, cp.userID, cp.playerName, ptpg.playoffGames, pcpg.corePlayoffGames
),

neo_history_ranked AS (
  SELECT *
  FROM (
    SELECT
      cp.leagueID,
      cp.teamID,
      cp.teamName,
      cp.playerID,
      cp.playerName,
      hr.divisionName,
      hr.teamName AS historyTeam,
      hr.seasonYear,
      hr.seasonName,
      hr.groupMatches,
      hr.playoffMatches,
      hr.totalMatches,
      ROW_NUMBER() OVER (
        PARTITION BY cp.leagueID, cp.teamID, cp.playerID
        ORDER BY
          hr.seasonYear DESC,
          CASE WHEN hr.seasonName = 'Spring' THEN 2 ELSE 1 END DESC,
          hr.divisionRank DESC,
          hr.leagueID DESC
      ) AS historyRank
    FROM current_players_neo cp
    LEFT JOIN history_rosters_dedup hr
      ON hr.playerID = cp.playerID
  ) x
  WHERE x.historyRank <= 3
),

neo_players_pivot AS (
  SELECT
    npb.leagueID,
    npb.teamID,
    npb.playerID,
    npb.userID,
    npb.playerName,
    npb.bucket,
    npb.playoffGames,

    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.divisionName END) AS history1Division,
    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.historyTeam END) AS history1Team,
    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.seasonYear END) AS history1Year,
    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.seasonName END) AS history1Season,
    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.groupMatches END) AS history1GroupMatches,
    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.playoffMatches END) AS history1PlayoffMatches,
    MAX(CASE WHEN nhr.historyRank = 1 THEN nhr.totalMatches END) AS history1Matches,

    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.divisionName END) AS history2Division,
    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.historyTeam END) AS history2Team,
    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.seasonYear END) AS history2Year,
    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.seasonName END) AS history2Season,
    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.groupMatches END) AS history2GroupMatches,
    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.playoffMatches END) AS history2PlayoffMatches,
    MAX(CASE WHEN nhr.historyRank = 2 THEN nhr.totalMatches END) AS history2Matches,

    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.divisionName END) AS history3Division,
    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.historyTeam END) AS history3Team,
    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.seasonYear END) AS history3Year,
    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.seasonName END) AS history3Season,
    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.groupMatches END) AS history3GroupMatches,
    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.playoffMatches END) AS history3PlayoffMatches,
    MAX(CASE WHEN nhr.historyRank = 3 THEN nhr.totalMatches END) AS history3Matches
  FROM neo_player_bucket npb
  LEFT JOIN neo_history_ranked nhr
    ON nhr.leagueID = npb.leagueID
   AND nhr.teamID = npb.teamID
   AND nhr.playerID = npb.playerID
  GROUP BY npb.leagueID, npb.teamID, npb.playerID, npb.userID, npb.playerName, npb.bucket, npb.playoffGames
),

neo_players_json AS (
  SELECT
    npp.leagueID,
    npp.teamID,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', npp.playerID,
        'userID', npp.userID,
        'playerName', npp.playerName,
        'bucket', npp.bucket,
        'playoffGames', npp.playoffGames,
        'history1Division', npp.history1Division,
        'history1Team', npp.history1Team,
        'history1Year', npp.history1Year,
        'history1Season', npp.history1Season,
        'history1GroupMatches', npp.history1GroupMatches,
        'history1PlayoffMatches', npp.history1PlayoffMatches,
        'history1Matches', npp.history1Matches,
        'history2Division', npp.history2Division,
        'history2Team', npp.history2Team,
        'history2Year', npp.history2Year,
        'history2Season', npp.history2Season,
        'history2GroupMatches', npp.history2GroupMatches,
        'history2PlayoffMatches', npp.history2PlayoffMatches,
        'history2Matches', npp.history2Matches,
        'history3Division', npp.history3Division,
        'history3Team', npp.history3Team,
        'history3Year', npp.history3Year,
        'history3Season', npp.history3Season,
        'history3GroupMatches', npp.history3GroupMatches,
        'history3PlayoffMatches', npp.history3PlayoffMatches,
        'history3Matches', npp.history3Matches
      )
    ) AS players
  FROM (
    SELECT *
    FROM neo_players_pivot
    ORDER BY playerName
  ) npp
  GROUP BY npp.leagueID, npp.teamID
),

neo_team_summary AS (
  SELECT
    npb.leagueID,
    npb.teamID,
    npb.teamName,
    SUM(CASE WHEN npb.bucket = 'ELITE' THEN 1 ELSE 0 END) AS EP,
    SUM(CASE WHEN npb.bucket = 'PRO' THEN 1 ELSE 0 END) AS PP,
    SUM(CASE WHEN npb.bucket = 'LITE' THEN 1 ELSE 0 END) AS LP,
    SUM(CASE WHEN npb.bucket = 'CORE' THEN 1 ELSE 0 END) AS CP,
    SUM(CASE WHEN npb.bucket = 'NEO OR LOWER' THEN 1 ELSE 0 END) AS NP,
    COUNT(npb.playerID) AS totalPlayers,
    SUM(CASE WHEN npb.playoffGames > 0 THEN 1 ELSE 0 END) AS playersWithPlayoffGames,
    GROUP_CONCAT(CASE WHEN npb.bucket = 'ELITE' THEN CONCAT(npb.playerName, ' (', npb.playoffGames, ')') END ORDER BY npb.playerName SEPARATOR ', ') AS elitePlayerNames,
    GROUP_CONCAT(CASE WHEN npb.bucket = 'PRO' THEN CONCAT(npb.playerName, ' (', npb.playoffGames, ')') END ORDER BY npb.playerName SEPARATOR ', ') AS proPlayerNames,
    GROUP_CONCAT(CASE WHEN npb.bucket = 'LITE' THEN CONCAT(npb.playerName, ' (', npb.playoffGames, ')') END ORDER BY npb.playerName SEPARATOR ', ') AS litePlayerNames,
    GROUP_CONCAT(CASE WHEN npb.bucket = 'CORE' THEN CONCAT(npb.playerName, ' (', npb.playoffGames, ')') END ORDER BY npb.playerName SEPARATOR ', ') AS corePlayerNames,
    SUM(
      CASE
        WHEN npb.bucket = 'PRO' THEN 2.0
        WHEN npb.bucket = 'LITE' THEN 1.0
        WHEN npb.bucket = 'CORE' THEN 0.5
        ELSE 0.0
      END
    ) AS totalPoints
  FROM neo_player_bucket npb
  GROUP BY npb.leagueID, npb.teamID, npb.teamName
),

neo_final AS (
  SELECT
    nts.leagueID,
    nts.teamID,
    nts.teamName,
    nts.EP,
    nts.PP,
    nts.LP,
    nts.CP,
    nts.NP,
    nts.totalPlayers,
    nts.playersWithPlayoffGames,
    COALESCE(nts.elitePlayerNames, '') AS elitePlayerNames,
    COALESCE(nts.proPlayerNames, '') AS proPlayerNames,
    COALESCE(nts.litePlayerNames, '') AS litePlayerNames,
    COALESCE(nts.corePlayerNames, '') AS corePlayerNames,
    nts.totalPoints,
    CASE
      WHEN nts.EP > 0 THEN 'NOT OK'
      WHEN nts.totalPoints > 2.0 THEN 'NOT OK'
      ELSE 'OK'
    END AS compatibility,
    COALESCE(npj.players, JSON_ARRAY()) AS players
  FROM neo_team_summary nts
  LEFT JOIN neo_players_json npj
    ON npj.leagueID = nts.leagueID
   AND npj.teamID = nts.teamID
),

-- =====================================================
-- J) CURRENT ACTIVE ROSTERS / CAPTAINS
--    Nuvarande ligor = 502-511
-- =====================================================
current_roster_players AS (
  SELECT DISTINCT
    r.leagueID,
    r.teamID,
    t.teamName,
    p.playerID,
    p.userID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(
      CASE
        WHEN clt.divisionName IN ('ELITE', 'PRO', 'LITE', 'CORE', 'NEO') THEN clt.divisionName
        ELSE 'UNKNOWN'
      END AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS divisionName
  FROM nhlgamer_leagueRosters r
  JOIN nhlgamer_players p
    ON p.playerID = r.playerID
  JOIN nhlgamer_teams t
    ON t.teamID = r.teamID
  LEFT JOIN current_league_teams clt
    ON clt.leagueID = r.leagueID
   AND clt.teamID = r.teamID
  WHERE r.leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
),

current_captain_players AS (
  SELECT DISTINCT
    clt.leagueID,
    clt.teamID,
    clt.teamName,
    p.playerID,
    p.userID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(
      CASE
        WHEN clt.divisionName IN ('ELITE', 'PRO', 'LITE', 'CORE', 'NEO') THEN clt.divisionName
        ELSE 'UNKNOWN'
      END AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS divisionName,
    CAST(
      CASE
        WHEN clt.teamCaptainID = p.playerID THEN 'Captain'
        WHEN clt.teamAssistantCaptainID = p.playerID THEN 'Assistant Captain'
        WHEN clt.teamAssistantCaptainID2 = p.playerID THEN 'Assistant Captain'
        ELSE ''
      END AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS roleName
  FROM current_league_teams clt
  JOIN nhlgamer_players p
    ON p.playerID IN (clt.teamCaptainID, clt.teamAssistantCaptainID, clt.teamAssistantCaptainID2)
),

-- =====================================================
-- K) TRANSFERS
-- =====================================================
all_accepted_invites AS (
  SELECT
    ti.playerID,
    ti.teamID,
    ti.leagueID,
    ti.inviteDate,
    CAST(t.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName
  FROM nhlgamer_teamInvites ti
  JOIN nhlgamer_teams t
    ON t.teamID = ti.teamID
  WHERE ti.inviteStatus = 2
    AND ti.leagueID IN (
      502,503,504,505,506,507,508,509,510,511,
      4,5,17,18,19,20,23,24,25,27,28,29,35,36,37,40,41,42,55,56,57,58,
      65,66,67,68,94,95,96,97,119,120,121,122,123,
      170,171,172,173,174,190,191,192,193,194,
      250,251,252,253,254,305,306,307,308,309,
      338,339,340,341,342,379,380,381,382,383,
      411,412,413,414,415,461,462,463,464,465,
      482,484,485,486,487,488,489,490,491
    )
),

current_league_players AS (
  SELECT DISTINCT
    r.playerID,
    r.teamID,
    r.leagueID
  FROM nhlgamer_leagueRosters r
  WHERE r.leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
),

current_team_join_dates AS (
  SELECT
    clp.playerID,
    clp.teamID,
    clp.leagueID,
    MAX(ai.inviteDate) AS currentInviteDate
  FROM current_league_players clp
  LEFT JOIN all_accepted_invites ai
    ON ai.playerID = clp.playerID
   AND ai.teamID = clp.teamID
   AND ai.leagueID = clp.leagueID
  GROUP BY clp.playerID, clp.teamID, clp.leagueID
),

transfer_previous_rosters AS (
  SELECT DISTINCT
    lr.playerID,
    lr.teamID,
    lr.leagueID
  FROM nhlgamer_leagueRosters lr
  JOIN league_meta lm
    ON lm.leagueID = lr.leagueID
  WHERE (
      lm.seasonYear IS NOT NULL
      AND lm.seasonYear <= 2026
      AND lm.divisionName IN ('ELITE', 'PRO', 'LITE', 'CORE', 'NEO')
    )
    OR lr.leagueID IN (
      4,5,17,18,19,20,23,24,25,27,28,29,35,36,37,40,41,42,55,56,57,58,
      65,66,67,68,94,95,96,97,119,120,121,122,123
    )
),

transfer_previous_rosters_same_team_season AS (
  SELECT
    x.playerID,
    x.teamID,
    x.leagueID,
    x.teamName,
    x.divisionName,
    x.divisionRank,
    x.seasonYear,
    x.seasonName
  FROM (
    SELECT
      pr.playerID,
      pr.teamID,
      pr.leagueID,
      CAST(t.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName,
      lm.divisionName,
      lm.divisionRank,
      lm.seasonYear,
      CAST(lm.seasonName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS seasonName,
      ROW_NUMBER() OVER (
        PARTITION BY pr.playerID, pr.teamID, lm.seasonYear, lm.seasonName
        ORDER BY
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM transfer_previous_rosters pr2
              JOIN league_meta lm2
                ON lm2.leagueID = pr2.leagueID
              WHERE pr2.playerID = pr.playerID
                AND pr2.teamID = pr.teamID
                AND COALESCE(lm2.seasonYear, 0) = COALESCE(lm.seasonYear, 0)
                AND COALESCE(lm2.seasonName, '') = COALESCE(lm.seasonName, '')
                AND lm2.divisionName = 'PRO'
            )
            AND EXISTS (
              SELECT 1
              FROM transfer_previous_rosters pr3
              JOIN league_meta lm3
                ON lm3.leagueID = pr3.leagueID
              WHERE pr3.playerID = pr.playerID
                AND pr3.teamID = pr.teamID
                AND COALESCE(lm3.seasonYear, 0) = COALESCE(lm.seasonYear, 0)
                AND COALESCE(lm3.seasonName, '') = COALESCE(lm.seasonName, '')
                AND lm3.divisionName = 'ELITE'
            )
            THEN CASE
              WHEN lm.divisionName = 'PRO' THEN 1
              WHEN lm.divisionName = 'ELITE' THEN 2
              ELSE 3
            END
            ELSE 1
          END,
          lm.divisionRank DESC,
          pr.leagueID DESC
      ) AS rn
    FROM transfer_previous_rosters pr
    JOIN league_meta lm
      ON lm.leagueID = pr.leagueID
    JOIN nhlgamer_teams t
      ON t.teamID = pr.teamID
    WHERE lm.divisionName IN ('ELITE', 'PRO', 'LITE', 'CORE', 'NEO')
  ) x
  WHERE x.rn = 1
),

transfer_previous_teams_ranked AS (
  SELECT
    clp.playerID,
    clp.teamID AS currentTeamID,
    clp.leagueID AS currentLeagueID,
    pr.teamID,
    pr.leagueID,
    CAST(pr.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName,
    CAST(pr.divisionName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS divisionName,
    pr.divisionRank,
    pr.seasonYear,
    CAST(pr.seasonName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS seasonName,
    ROW_NUMBER() OVER (
      PARTITION BY clp.playerID, clp.teamID, clp.leagueID
      ORDER BY
        COALESCE(pr.seasonYear, 0) DESC,
        CASE WHEN pr.seasonName = 'Spring' THEN 2 WHEN pr.seasonName = 'Winter' THEN 1 ELSE 0 END DESC,
        COALESCE(pr.divisionRank, 0) DESC,
        pr.leagueID DESC,
        pr.teamID DESC,
        pr.teamName
    ) AS rn
  FROM current_league_players clp
  JOIN transfer_previous_rosters_same_team_season pr
    ON pr.playerID = clp.playerID
   AND NOT (
     COALESCE(pr.teamID, 0) = COALESCE(clp.teamID, 0)
     AND COALESCE(pr.leagueID, 0) = COALESCE(clp.leagueID, 0)
   )
),

transfer_previous_rosters_best AS (
  SELECT
    x.playerID,
    x.currentTeamID,
    x.currentLeagueID,
    x.teamID,
    x.leagueID,
    x.teamName,
    x.divisionName,
    x.seasonYear,
    x.seasonName
  FROM transfer_previous_teams_ranked x
  WHERE x.rn = 1
),

previous_invites_ranked AS (
  SELECT
    clp.playerID,
    clp.teamID AS currentTeamID,
    clp.leagueID AS currentLeagueID,
    ai.teamID,
    ai.leagueID,
    ai.teamName,
    ai.inviteDate,
    ROW_NUMBER() OVER (
      PARTITION BY clp.playerID, clp.teamID, clp.leagueID
      ORDER BY ai.inviteDate DESC, ai.leagueID DESC, ai.teamID DESC
    ) AS rn
  FROM current_league_players clp
  JOIN all_accepted_invites ai
    ON ai.playerID = clp.playerID
   AND NOT (
     COALESCE(ai.teamID, 0) = COALESCE(clp.teamID, 0)
     AND COALESCE(ai.leagueID, 0) = COALESCE(clp.leagueID, 0)
   )
  LEFT JOIN current_team_join_dates ctjd
    ON ctjd.playerID = clp.playerID
   AND ctjd.teamID = clp.teamID
   AND ctjd.leagueID = clp.leagueID
  WHERE ctjd.currentInviteDate IS NULL
     OR ai.inviteDate < ctjd.currentInviteDate
),

previous_invites_best AS (
  SELECT
    x.playerID,
    x.currentTeamID,
    x.currentLeagueID,
    x.teamID,
    x.leagueID,
    x.teamName,
    x.inviteDate
  FROM previous_invites_ranked x
  WHERE x.rn = 1
),

transfer_roster_players_current AS (
  SELECT DISTINCT
    p.playerID,
    p.userID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(COALESCE(NULLIF(p.nationality, ''), p.country, '') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,

    CAST(
      COALESCE(prev_roster.teamName, prev_inv.teamName, 'Free Agent')
      AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS `From`,

    COALESCE(prev_roster.teamID, prev_inv.teamID) AS FromTeamID,
    COALESCE(prev_roster.leagueID, prev_inv.leagueID) AS FromLeagueID,

    clp.teamID AS ToTeamID,
    clp.leagueID AS ToLeagueID,
    CAST(t_new.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,

    DATE(
      COALESCE(
        cur_inv.curInviteDate,
        clt.registrationDate
      )
    ) AS `Date`,

    CAST('' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    1 AS Priority
  FROM current_league_players clp
  JOIN nhlgamer_players p
    ON p.playerID = clp.playerID
  JOIN nhlgamer_teams t_new
    ON t_new.teamID = clp.teamID
  LEFT JOIN current_league_teams clt
    ON clt.teamID = clp.teamID
   AND clt.leagueID = clp.leagueID

  LEFT JOIN (
    SELECT
      a.playerID,
      a.teamID,
      a.leagueID,
      MAX(a.inviteDate) AS curInviteDate
    FROM all_accepted_invites a
    GROUP BY a.playerID, a.teamID, a.leagueID
  ) cur_inv
    ON cur_inv.playerID = p.playerID
   AND cur_inv.teamID = clp.teamID
   AND cur_inv.leagueID = clp.leagueID

  LEFT JOIN transfer_previous_rosters_best prev_roster
    ON prev_roster.playerID = p.playerID
   AND prev_roster.currentTeamID = clp.teamID
   AND prev_roster.currentLeagueID = clp.leagueID

  LEFT JOIN previous_invites_best prev_inv
    ON prev_inv.playerID = p.playerID
   AND prev_inv.currentTeamID = clp.teamID
   AND prev_inv.currentLeagueID = clp.leagueID
   AND prev_roster.playerID IS NULL

  WHERE COALESCE(prev_roster.teamID, prev_inv.teamID, 0) <> COALESCE(clp.teamID, 0)
),

transfer_captain_players_current AS (
  SELECT DISTINCT
    cp.playerID,
    cp.userID,
    CAST(cp.PlayerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(COALESCE(NULLIF(p.nationality, ''), p.country, '') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,

    CAST(
      COALESCE(prev_roster.teamName, prev_inv.teamName, 'Free Agent')
      AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS `From`,

    COALESCE(prev_roster.teamID, prev_inv.teamID) AS FromTeamID,
    COALESCE(prev_roster.leagueID, prev_inv.leagueID) AS FromLeagueID,

    cp.teamID AS ToTeamID,
    cp.leagueID AS ToLeagueID,
    CAST(cp.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,

    DATE(
      COALESCE(
        cur_inv.curInviteDate,
        cp.registrationDate
      )
    ) AS `Date`,

    CAST(cp.roleName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    2 AS Priority
  FROM (
    SELECT
      c.playerID,
      c.userID,
      c.playerName AS PlayerName,
      c.leagueID,
      c.teamID,
      c.teamName,
      c.roleName,
      clt.registrationDate
    FROM current_captain_players c
    LEFT JOIN current_league_teams clt
      ON clt.teamID = c.teamID
     AND clt.leagueID = c.leagueID
  ) cp
  JOIN nhlgamer_players p
    ON p.playerID = cp.playerID
  JOIN nhlgamer_leagueRosters lr_current
    ON lr_current.leagueID = cp.leagueID
   AND lr_current.teamID = cp.teamID
   AND lr_current.playerID = cp.playerID

  LEFT JOIN (
    SELECT
      a.playerID,
      a.teamID,
      a.leagueID,
      MAX(a.inviteDate) AS curInviteDate
    FROM all_accepted_invites a
    GROUP BY a.playerID, a.teamID, a.leagueID
  ) cur_inv
    ON cur_inv.playerID = cp.playerID
   AND cur_inv.teamID = cp.teamID
   AND cur_inv.leagueID = cp.leagueID

  LEFT JOIN transfer_previous_rosters_best prev_roster
    ON prev_roster.playerID = cp.playerID
   AND prev_roster.currentTeamID = cp.teamID
   AND prev_roster.currentLeagueID = cp.leagueID

  LEFT JOIN previous_invites_best prev_inv
    ON prev_inv.playerID = cp.playerID
   AND prev_inv.currentTeamID = cp.teamID
   AND prev_inv.currentLeagueID = cp.leagueID
   AND prev_roster.playerID IS NULL

  WHERE COALESCE(prev_roster.teamID, prev_inv.teamID, 0) <> COALESCE(cp.teamID, 0)
),

transfer_combined AS (
  SELECT
    playerID,
    userID,
    CAST(Player AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(nationality AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,
    CAST(`From` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `From`,
    FromTeamID,
    FromLeagueID,
    CAST(`To` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,
    ToTeamID,
    ToLeagueID,
    `Date`,
    CAST(Role AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    Priority
  FROM transfer_roster_players_current

  UNION ALL

  SELECT
    playerID,
    userID,
    CAST(Player AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(nationality AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,
    CAST(`From` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `From`,
    FromTeamID,
    FromLeagueID,
    CAST(`To` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,
    ToTeamID,
    ToLeagueID,
    `Date`,
    CAST(Role AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    Priority
  FROM transfer_captain_players_current
),

transfer_deduped AS (
  SELECT
    c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.playerID, c.ToTeamID, c.ToLeagueID
      ORDER BY c.Priority ASC, c.`Date` DESC
    ) AS transfer_rn
  FROM transfer_combined c
),

transfer_with_divs AS (
  SELECT
    d.playerID,
    d.userID,
    CAST(d.Player AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(d.nationality AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,
    CAST(d.`From` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `From`,
    d.FromTeamID,
    d.FromLeagueID,
    CAST(d.`To` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,
    d.ToTeamID,
    d.ToLeagueID,
    d.`Date`,
    CAST(d.Role AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    CAST(COALESCE(lm_from.divisionName, 'Free Agent / Unknown') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS FromDiv,
    CAST(COALESCE(clt_to.divisionName, 'Unknown') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS ToDiv,
    COALESCE(lm_from.divisionRank, 0) AS FromDivLevel,
    CASE clt_to.divisionName
      WHEN 'ELITE' THEN 5
      WHEN 'PRO' THEN 4
      WHEN 'LITE' THEN 3
      WHEN 'CORE' THEN 2
      WHEN 'NEO' THEN 1
      ELSE 0
    END AS ToDivLevel
  FROM transfer_deduped d
  LEFT JOIN league_meta lm_from
    ON lm_from.leagueID = d.FromLeagueID
  LEFT JOIN current_league_teams clt_to
    ON clt_to.teamID = d.ToTeamID
   AND clt_to.leagueID = d.ToLeagueID
  WHERE d.transfer_rn = 1
    AND COALESCE(d.FromTeamID, 0) <> COALESCE(d.ToTeamID, 0)
),

winter_26_games AS (
  SELECT
    x.playerID,
    x.teamID,
    x.leagueID,
    SUM(x.groupGames) AS GroupGames26Winter,
    SUM(x.playoffGames) AS PlayoffGames26Winter,
    SUM(x.groupGames + x.playoffGames) AS TotalGames26Winter
  FROM (
    SELECT
      ps.playerID,
      ps.teamID,
      ps.leagueID,
      SUM(CASE WHEN ps.gameType = 'regular' THEN ps.gamesPlayed ELSE 0 END) AS groupGames,
      SUM(CASE WHEN ps.gameType <> 'regular' OR ps.gameType IS NULL THEN ps.gamesPlayed ELSE 0 END) AS playoffGames
    FROM nhlgamer_playerStats ps
    WHERE ps.leagueID IN (487,488,489,490,491,507,508,509,510,511)
    GROUP BY ps.playerID, ps.teamID, ps.leagueID

    UNION ALL

    SELECT
      gs.playerID,
      gs.teamID,
      gs.leagueID,
      SUM(CASE WHEN gs.gameType = 'regular' THEN gs.gamesPlayed ELSE 0 END) AS groupGames,
      SUM(CASE WHEN gs.gameType <> 'regular' OR gs.gameType IS NULL THEN gs.gamesPlayed ELSE 0 END) AS playoffGames
    FROM nhlgamer_goalieStats gs
    WHERE gs.leagueID IN (487,488,489,490,491,507,508,509,510,511)
    GROUP BY gs.playerID, gs.teamID, gs.leagueID
  ) x
  GROUP BY x.playerID, x.teamID, x.leagueID
),

overgangar_final AS (
  SELECT
    twd.Player,
    twd.playerID,
    twd.userID,
    twd.nationality,
    CAST(CONCAT(
      twd.`From`,
      CASE
        WHEN twd.FromLeagueID = 4 THEN ' (ECL1)'
        WHEN twd.FromLeagueID = 5 THEN ' (ECL2)'
        WHEN twd.FromLeagueID = 17 THEN ' (ECL3)'
        WHEN twd.FromLeagueID IN (18,19,20) THEN ' (ECL4)'
        WHEN twd.FromLeagueID IN (23,24,25) THEN ' (ECL5)'
        WHEN twd.FromLeagueID IN (27,28,29) THEN ' (ECL6)'
        WHEN twd.FromLeagueID IN (35,36,37) THEN ' (ECL7)'
        WHEN twd.FromLeagueID IN (40,41,42) THEN ' (ECL8)'
        WHEN twd.FromLeagueID IN (55,56,57,58) THEN ' (ECL9)'
        WHEN twd.FromLeagueID IN (65,66,67,68) THEN ' (ECL10)'
        WHEN twd.FromLeagueID IN (94,95,96,97) THEN ' (ECL11)'
        WHEN twd.FromLeagueID IN (119,120,121,122,123) THEN ' (ECL12)'
        WHEN twd.FromLeagueID IN (170,171,172,173,174) THEN ' (22W)'
        WHEN twd.FromLeagueID IN (190,191,192,193,194) THEN ' (22S)'
        WHEN twd.FromLeagueID IN (250,251,252,253,254) THEN ' (23W)'
        WHEN twd.FromLeagueID IN (305,306,307,308,309) THEN ' (23S)'
        WHEN twd.FromLeagueID IN (338,339,340,341,342) THEN ' (24W)'
        WHEN twd.FromLeagueID IN (379,380,381,382,383) THEN ' (24S)'
        WHEN twd.FromLeagueID IN (411,412,413,414,415) THEN ' (25W)'
        WHEN twd.FromLeagueID IN (461,462,463,464,465) THEN ' (25S)'
        WHEN twd.FromLeagueID IN (482,484,485,486,487,488,489,490,491) THEN ' (26W)'
        WHEN twd.FromLeagueID IN (502,503,504,505,506,507,508,509,510,511) THEN ' (26S)'
        ELSE ''
      END
    ) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `From`,
    twd.FromDiv,
    twd.FromTeamID,
    twd.FromLeagueID,
    twd.`To`,
    twd.ToDiv,
    twd.ToTeamID,
    twd.ToLeagueID,
    COALESCE(wg.GroupGames26Winter, 0) AS GroupGames26Winter,
    COALESCE(wg.PlayoffGames26Winter, 0) AS PlayoffGames26Winter,
    COALESCE(wg.TotalGames26Winter, 0) AS TotalGames26Winter,
    twd.`Date`,
    twd.Role
  FROM transfer_with_divs twd
  LEFT JOIN winter_26_games wg
    ON wg.playerID = twd.playerID
   AND wg.teamID = twd.FromTeamID
   AND wg.leagueID = twd.FromLeagueID
),

-- =====================================================
-- L) BANNED PLAYERS
-- =====================================================
banned_input AS (
  SELECT 'ViSiOnZ97_' AS playerName, NULL AS aliasName, 'Captaincy ban' AS banType, 'Indefinitely' AS untilText, NULL AS extraNote
  UNION ALL SELECT 'Men-at-work74', NULL, 'Captaincy ban', 'Indefinitely', NULL
  UNION ALL SELECT 'maatti64', NULL, 'Captaincy ban', 'Undefined', NULL
  UNION ALL SELECT 'OsquuG', NULL, 'Captaincy ban', 'Undefined', NULL
  UNION ALL SELECT 'matadori-_-', 'SirRaittinen', 'Captaincy ban', 'Undefined', 'Previously SirRaittinen'
  UNION ALL SELECT 'xSagwa', NULL, 'Captaincy ban', 'Undefined', NULL
  UNION ALL SELECT 'punt1la98', NULL, 'Captaincy ban', 'Undefined', NULL
  UNION ALL SELECT 'radekbonk111', NULL, 'Captaincy ban', 'Undefined', NULL
  UNION ALL SELECT 'snaasigi', NULL, 'Captaincy ban', 'Undefined', NULL
  UNION ALL SELECT 'Keuschemisch', NULL, 'Captaincy ban', '2030.02.10', NULL
  UNION ALL SELECT 'nhlbot9878', 'nhlbot9878', 'Suspension', '2026.08.13', 'Previously eBjorken97_'
  UNION ALL SELECT 'nhlbot9878', 'nhlbot9878', 'Captaincy ban', '2027.04.09', 'Previously eBjorken97_'
  UNION ALL SELECT 'Ggwp87', 'Ggwp87', 'Captaincy ban', '2029.04.09', 'Previously abbelandit__'
  UNION ALL SELECT 'Bjorkudd_39', NULL, 'Captaincy ban', '2027.04.09', NULL
  UNION ALL SELECT 'Ggwp87', 'Ggwp87', 'Suspension', '2026.06.25', 'Previously abbelandit__'
  UNION ALL SELECT 'I-MeIIe-l', NULL, 'Captaincy ban', '2027.04.14', NULL
  UNION ALL SELECT 'I-MeIIe-l', NULL, 'Suspension', '2026.04.14', NULL
  UNION ALL SELECT 'Blaze4214', NULL, 'Captaincy ban', '2027.04.14', NULL
  UNION ALL SELECT 'Cbatta_-11', NULL, 'Suspension', '2026.04.14', NULL
),

banned_normalized AS (
  SELECT
    CAST(bi.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(bi.aliasName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS aliasName,
    CAST(
      CASE
        WHEN LOWER(bi.banType) LIKE '%suspension%' THEN 'Suspension'
        WHEN LOWER(bi.banType) LIKE '%capt%' THEN 'Captaincy ban'
        ELSE bi.banType
      END AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS banType,
    CAST(bi.untilText AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS untilText,
    CAST(bi.extraNote AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS extraNote,
    CASE
      WHEN LOWER(bi.untilText) LIKE '%indefinitely%' THEN 1
      WHEN LOWER(bi.untilText) LIKE '%undefined%' THEN 1
      WHEN LOWER(bi.untilText) LIKE '%until the end%' THEN 1
      WHEN STR_TO_DATE(bi.untilText, '%e.%c.%Y') IS NULL THEN 1
      WHEN STR_TO_DATE(bi.untilText, '%e.%c.%Y') >= CURDATE() THEN 1
      ELSE 0
    END AS active
  FROM banned_input bi
),

banned_names AS (
  SELECT
    CAST(bn.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(bn.banType AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS banType,
    CAST(bn.untilText AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS untilText,
    CAST(bn.extraNote AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS extraNote,
    bn.active,
    CAST(bn.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS matchName
  FROM banned_normalized bn

  UNION ALL

  SELECT
    CAST(bn.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(bn.banType AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS banType,
    CAST(bn.untilText AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS untilText,
    CAST(bn.extraNote AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS extraNote,
    bn.active,
    CAST(bn.aliasName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS matchName
  FROM banned_normalized bn
  WHERE bn.aliasName IS NOT NULL
),

banned_matches AS (
  SELECT
    CAST(bn.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(bn.banType AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS banType,
    CAST(bn.untilText AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS untilText,
    CAST(bn.extraNote AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS extraNote,
    bn.active,
    cp.playerID,
    cp.leagueID,
    cp.teamID,
    CAST(cp.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName,
    CAST(cp.divisionName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS divisionName,
    CAST(cp.roleName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS foundAs
  FROM banned_names bn
  JOIN current_captain_players cp
    ON LOWER(CAST(cp.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci)
     = LOWER(CAST(bn.matchName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci)
  WHERE bn.banType = 'Captaincy ban'

  UNION ALL

  SELECT
    CAST(bn.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(bn.banType AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS banType,
    CAST(bn.untilText AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS untilText,
    CAST(bn.extraNote AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS extraNote,
    bn.active,
    rp.playerID,
    rp.leagueID,
    rp.teamID,
    CAST(rp.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName,
    CAST(rp.divisionName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS divisionName,
    CAST('Player' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS foundAs
  FROM banned_names bn
  JOIN current_roster_players rp
    ON LOWER(CAST(rp.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci)
     = LOWER(CAST(bn.matchName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci)
  WHERE bn.banType = 'Suspension'

  UNION ALL

  SELECT
    CAST(bn.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(bn.banType AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS banType,
    CAST(bn.untilText AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS untilText,
    CAST(bn.extraNote AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS extraNote,
    bn.active,
    cp.playerID,
    cp.leagueID,
    cp.teamID,
    CAST(cp.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName,
    CAST(cp.divisionName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS divisionName,
    CAST(cp.roleName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS foundAs
  FROM banned_names bn
  JOIN current_captain_players cp
    ON LOWER(CAST(cp.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci)
     = LOWER(CAST(bn.matchName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci)
  WHERE bn.banType = 'Suspension'
),

banned_ranked AS (
  SELECT
    bm.*,
    ROW_NUMBER() OVER (
      PARTITION BY bm.playerName, bm.banType, bm.untilText
      ORDER BY
        CASE bm.foundAs
          WHEN 'Captain' THEN 1
          WHEN 'Assistant Captain' THEN 2
          WHEN 'Player' THEN 3
          ELSE 4
        END,
        bm.leagueID,
        bm.teamName
    ) AS ban_rn
  FROM banned_matches bm
),

banned_players_final AS (
  SELECT
    bn.playerName,
    bn.banType,
    bn.untilText,
    CASE WHEN bn.active = 1 THEN 'Yes' ELSE 'No' END AS active,
    CASE
      WHEN bn.active = 0 THEN 'Expired'
      WHEN br.playerID IS NOT NULL THEN 'Violation'
      ELSE 'Clear'
    END AS status,
    COALESCE(br.foundAs, '') AS foundAs,
    br.leagueID,
    br.teamID,
    COALESCE(br.teamName, '') AS teamName,
    COALESCE(br.divisionName, '') AS divisionName,
    CASE
      WHEN bn.extraNote IS NOT NULL AND br.playerID IS NOT NULL THEN CONCAT(bn.extraNote, ' | found in active league as ', br.foundAs)
      WHEN bn.extraNote IS NOT NULL THEN bn.extraNote
      WHEN br.playerID IS NOT NULL THEN CONCAT('found in active league as ', br.foundAs)
      ELSE ''
    END AS notes
  FROM banned_normalized bn
  LEFT JOIN banned_ranked br
    ON br.playerName = bn.playerName
   AND br.banType = bn.banType
   AND br.untilText = bn.untilText
   AND br.ban_rn = 1
),

-- =====================================================
-- M) DUPLICATE / MULTI TEAM PLAYERS
--    Endast riktiga nuvarande divisioner 507-511
-- =====================================================
multi_team_players_rows AS (
  SELECT DISTINCT
    r.playerID,
    p.userID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    r.leagueID AS normalizedLeagueID,
    CAST(
      CASE
        WHEN r.leagueID = 507 THEN 'ECL ''26: Spring - Elite'
        WHEN r.leagueID = 508 THEN 'ECL ''26: Spring - Pro'
        WHEN r.leagueID = 509 THEN 'ECL ''26: Spring - Lite'
        WHEN r.leagueID = 510 THEN 'ECL ''26: Spring - Core'
        WHEN r.leagueID = 511 THEN 'ECL ''26: Spring - Neo'
        ELSE CONCAT('League ', r.leagueID)
      END AS CHAR CHARACTER SET utf8mb4
    ) COLLATE utf8mb4_unicode_ci AS leagueName,
    t.teamID,
    CAST(t.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS teamName,
    cap.userID AS captainUserID
  FROM nhlgamer_leagueRosters r
  JOIN nhlgamer_players p
    ON p.playerID = r.playerID
  JOIN nhlgamer_teams t
    ON t.teamID = r.teamID
  LEFT JOIN current_league_teams clt
    ON clt.leagueID = r.leagueID
   AND clt.teamID = r.teamID
  LEFT JOIN nhlgamer_players cap
    ON cap.playerID = clt.teamCaptainID
  WHERE r.leagueID IN (507, 508, 509, 510, 511)
),

duplicate_players_ranked AS (
  SELECT
    playerID,
    playerName,
    CONCAT(teamName, ' (', leagueName, ')') AS teamNameLeague,
    ROW_NUMBER() OVER (
      PARTITION BY playerID
      ORDER BY normalizedLeagueID, teamName
    ) AS dup_rn
  FROM multi_team_players_rows
),

duplicate_players_final AS (
  SELECT
    playerID,
    playerName,
    MAX(CASE WHEN dup_rn = 1 THEN teamNameLeague END) AS team1,
    MAX(CASE WHEN dup_rn = 2 THEN teamNameLeague END) AS team2
  FROM duplicate_players_ranked
  GROUP BY playerID, playerName
  HAVING COUNT(DISTINCT teamNameLeague) > 1
),

multi_team_players_final AS (
  SELECT
    m.playerID,
    MAX(m.userID) AS userID,
    m.playerName,
    COUNT(DISTINCT m.teamID) AS teamCount,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', m.normalizedLeagueID,
        'leagueName', m.leagueName,
        'teamID', m.teamID,
        'teamName', m.teamName,
        'captainUserID', m.captainUserID
      )
    ) AS teams
  FROM (
    SELECT *
    FROM multi_team_players_rows
    ORDER BY leagueName, teamName
  ) m
  GROUP BY m.playerID, m.playerName
  HAVING COUNT(DISTINCT m.teamID) > 1
)

SELECT JSON_OBJECT(

'backups',
COALESCE((
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'playerID', q.playerID,
      'userID', q.userID,
      'tag', q.tag,
      'teamName', q.teamName,
      'totalMatchesPlayed', q.totalMatchesPlayed,
      'leagueID', q.leagueID
    )
  )
  FROM (
    SELECT
      r.playerID,
      pl.userID,
      COALESCE(pl.psntag, pl.gamertag) AS tag,
      t.teamName,
      r.leagueID,
      COUNT(DISTINCT p.matchID) AS totalMatchesPlayed
    FROM nhlgamer_leagueRosters r
    LEFT JOIN nhlgamer_participants p
      ON r.playerID = p.playerID
     AND p.leagueID IN (482, 484, 485, 487, 488, 489, 490, 491, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
    LEFT JOIN nhlgamer_players pl
      ON r.playerID = pl.playerID
    LEFT JOIN nhlgamer_teams t
      ON r.teamID = t.teamID
    WHERE r.leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
      AND COALESCE(r.hasBackupLicense, 0) = 1
      AND COALESCE(r.hasLicense, 0) = 0
      AND r.playerID NOT IN (
        SELECT DISTINCT lr.playerID
        FROM nhlgamer_leagueRosters lr
        WHERE lr.leagueID IN (
          482, 484, 485, 487, 488, 489, 490, 491,
          502, 503, 504, 505, 506, 507, 508, 509, 510, 511
        )
          AND COALESCE(lr.hasLicense, 0) = 1
      )
    GROUP BY r.playerID, pl.userID, tag, t.teamName, r.leagueID
    ORDER BY totalMatchesPlayed DESC, tag
  ) q
), JSON_ARRAY()),

  'teamCaptains',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', q.leagueID,
        'teamID', q.teamID,
        'teamName', q.teamName,
        'playerID', q.playerID,
        'userID', q.userID,
        'tag', q.tag,
        'Role', q.Role
      )
    )
    FROM (
      SELECT
        clt.leagueID,
        clt.teamID,
        clt.teamName,
        p.playerID,
        p.userID,
        COALESCE(p.psntag, p.gamertag) AS tag,
        CASE
          WHEN clt.teamCaptainID = p.playerID THEN 'Captain'
          WHEN clt.teamAssistantCaptainID = p.playerID THEN 'Assistant Captain'
          WHEN clt.teamAssistantCaptainID2 = p.playerID THEN 'Assistant Captain'
        END AS Role
      FROM current_league_teams clt
      JOIN nhlgamer_players p
        ON p.playerID IN (clt.teamCaptainID, clt.teamAssistantCaptainID, clt.teamAssistantCaptainID2)
      ORDER BY clt.teamName, Role, tag
    ) q
  ), JSON_ARRAY()),

  'core',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', q.leagueID,
        'teamID', q.teamID,
        'teamName', q.teamName,
        'EP', q.EP,
        'PP', q.PP,
        'LP', q.LP,
        'CP', q.CP,
        'totalPlayers', q.totalPlayers,
        'playersWithPlayoffGames', q.playersWithPlayoffGames,
        'elitePlayerNames', q.elitePlayerNames,
        'proPlayerNames', q.proPlayerNames,
        'litePlayerNames', q.litePlayerNames,
        'totalPoints', q.totalPoints,
        'compatibility', q.compatibility,
        'players', q.players
      )
    )
    FROM (
      SELECT *
      FROM core_final
      ORDER BY totalPoints DESC, teamName
    ) q
  ), JSON_ARRAY()),

  'licenslosa',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', q.playerID,
        'userID', q.userID,
        'tag', q.tag,
        'teamName', q.teamName,
        'leagueID', q.leagueID,
        'totalMatchesPlayed', q.totalMatchesPlayed
      )
    )
    FROM (
      SELECT
        r.playerID,
        pl.userID,
        COALESCE(pl.psntag, pl.gamertag) AS tag,
        t.teamName,
        r.leagueID,
        COUNT(DISTINCT p.matchID) AS totalMatchesPlayed
      FROM nhlgamer_leagueRosters r
      LEFT JOIN nhlgamer_participants p
        ON r.playerID = p.playerID
       AND p.leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
      LEFT JOIN nhlgamer_players pl
        ON r.playerID = pl.playerID
      LEFT JOIN nhlgamer_teams t
        ON r.teamID = t.teamID
      WHERE r.leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
        AND r.playerID NOT IN (
          SELECT DISTINCT playerID
          FROM nhlgamer_leagueRosters
          WHERE leagueID IN (502, 503, 504, 505, 506, 507, 508, 509, 510, 511)
            AND (hasLicense = 1 OR hasBackupLicense = 1)
        )
      GROUP BY r.playerID, pl.userID, tag, t.teamName, r.leagueID
      ORDER BY totalMatchesPlayed DESC, tag
    ) q
  ), JSON_ARRAY()),

  'lite',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', q.leagueID,
        'teamID', q.teamID,
        'teamName', q.teamName,
        'EP', q.EP,
        'PP', q.PP,
        'LP', q.LP,
        'totalPlayers', q.totalPlayers,
        'playersWithPlayoffGames', q.playersWithPlayoffGames,
        'elitePlayerNames', q.elitePlayerNames,
        'proPlayerNames', q.proPlayerNames,
        'totalPoints', q.totalPoints,
        'compatibility', q.compatibility,
        'players', q.players
      )
    )
    FROM (
      SELECT *
      FROM lite_final_dedup
      ORDER BY totalPoints DESC, teamName
    ) q
  ), JSON_ARRAY()),

  'neo',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', q.leagueID,
        'teamID', q.teamID,
        'teamName', q.teamName,
        'EP', q.EP,
        'PP', q.PP,
        'LP', q.LP,
        'CP', q.CP,
        'NP', q.NP,
        'totalPlayers', q.totalPlayers,
        'playersWithPlayoffGames', q.playersWithPlayoffGames,
        'elitePlayerNames', q.elitePlayerNames,
        'proPlayerNames', q.proPlayerNames,
        'litePlayerNames', q.litePlayerNames,
        'corePlayerNames', q.corePlayerNames,
        'totalPoints', q.totalPoints,
        'compatibility', q.compatibility,
        'players', q.players
      )
    )
    FROM (
      SELECT *
      FROM neo_final
      ORDER BY totalPoints DESC, teamName
    ) q
  ), JSON_ARRAY()),

  'overgangar',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'Player', q.Player,
        'playerID', q.playerID,
        'userID', q.userID,
        'nationality', q.nationality,
        'From', q.`From`,
        'FromDiv', q.FromDiv,
        'FromTeamID', q.FromTeamID,
        'FromLeagueID', q.FromLeagueID,
        'To', q.`To`,
        'ToDiv', q.ToDiv,
        'ToTeamID', q.ToTeamID,
        'ToLeagueID', q.ToLeagueID,
        'GroupGames26Winter', q.GroupGames26Winter,
        'PlayoffGames26Winter', q.PlayoffGames26Winter,
        'TotalGames26Winter', q.TotalGames26Winter,
        'Date', q.`Date`,
        'Role', q.Role
      )
    )
    FROM (
      SELECT *
      FROM overgangar_final
      ORDER BY `Date` DESC, Player
    ) q
  ), JSON_ARRAY()),

  'signUps',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', q.leagueID,
        'teamID', q.teamID,
        'teamName', q.teamName,
        'teamCountry', q.teamCountry,
        'registrationDate', q.registrationDate,
        'divisionName', q.divisionName,
        'qualifierName', q.qualifierName,
        'teamLicense', q.teamLicense,
        'playerCount', q.playerCount,
        'backupLicenseCount', q.backupLicenseCount,
        'unlicensedPlayerCount', q.unlicensedPlayerCount,
        'matchesPlayed', q.matchesPlayed
      )
    )
    FROM (
      SELECT
        clt.leagueID,
        clt.teamID,
        clt.teamName,
        clt.teamCountry,
        clt.registrationDate,
        clt.divisionName,
        clt.qualifierName,
        clt.teamLicense,

        COALESCE((
          SELECT COUNT(DISTINCT lr.playerID)
          FROM nhlgamer_leagueRosters lr
          WHERE lr.leagueID = clt.leagueID
            AND lr.teamID = clt.teamID
        ), 0) AS playerCount,

        COALESCE((
          SELECT COUNT(DISTINCT lr.playerID)
          FROM nhlgamer_leagueRosters lr
          WHERE lr.leagueID = clt.leagueID
            AND lr.teamID = clt.teamID
            AND COALESCE(lr.hasBackupLicense, 0) = 1
            AND COALESCE(lr.hasLicense, 0) = 0
        ), 0) AS backupLicenseCount,

        COALESCE((
          SELECT COUNT(DISTINCT lr.playerID)
          FROM nhlgamer_leagueRosters lr
          WHERE lr.leagueID = clt.leagueID
            AND lr.teamID = clt.teamID
            AND COALESCE(lr.hasLicense, 0) = 0
            AND COALESCE(lr.hasBackupLicense, 0) = 0
        ), 0) AS unlicensedPlayerCount,

        COALESCE((
          SELECT COUNT(DISTINCT p.matchID)
          FROM nhlgamer_participants p
          WHERE p.leagueID = clt.leagueID
            AND p.teamID = clt.teamID
        ), 0) AS matchesPlayed

      FROM current_league_teams_signup_dedup clt
      ORDER BY clt.registrationDate DESC, clt.teamName
    ) q
  ), JSON_ARRAY()),

  'bannedPlayers',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerName', x.playerName,
        'banType', x.banType,
        'untilText', x.untilText,
        'active', x.active,
        'status', x.status,
        'foundAs', x.foundAs,
        'leagueID', x.leagueID,
        'teamID', x.teamID,
        'teamName', x.teamName,
        'divisionName', x.divisionName,
        'notes', x.notes
      )
    )
    FROM (
      SELECT *
      FROM banned_players_final
      ORDER BY
        CASE
          WHEN active = 'Yes' AND status = 'Violation' THEN 1
          WHEN active = 'Yes' THEN 2
          ELSE 3
        END,
        playerName,
        banType
    ) x
  ), JSON_ARRAY()),

  'duplicatePlayers',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', q.playerID,
        'playerName', q.playerName,
        'team1', q.team1,
        'team2', q.team2
      )
    )
    FROM (
      SELECT *
      FROM duplicate_players_final
      ORDER BY playerName
    ) q
  ), JSON_ARRAY()),

  'inMoreThan1Teams',
  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', q.playerID,
        'userID', q.userID,
        'playerName', q.playerName,
        'teamCount', q.teamCount,
        'teams', q.teams
      )
    )
    FROM (
      SELECT *
      FROM multi_team_players_final
      ORDER BY teamCount DESC, playerName
    ) q
  ), JSON_ARRAY())

) AS json_result;
