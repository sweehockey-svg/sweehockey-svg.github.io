/* Normalized version to avoid max_allowed_packet by not duplicating player/team history inside every team object. */
WITH
/* =========================================================
   SVENSKA LAG HISTORIA - ALL ECL - V9
   Output: one JSON object with all Swedish ECL team seasons,
   players, player stats and player/team history.

   Swedish team = nhlgamer_leagueTeams.country = 'SE' OR manually listed Swedish teamID (178 IDs). Team name is taken from nhlgamer_leagueTeams.teamName per league season, so same teamID can show different names in different leagues.
   Players = league roster + players with skater/goalie stats.
   0-game roster entries are included but marked played = false.
========================================================= */

ecl_league_map_raw AS (
  SELECT 4 AS leagueID, 'ELITE' AS divisionName, 5 AS divisionRank, NULL AS seasonYear, NULL AS seasonName
  UNION ALL SELECT 5, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 17, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 18, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 19, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 20, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 23, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 24, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 25, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 27, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 28, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 29, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 35, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 36, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 37, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 40, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 41, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 42, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 55, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 56, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 57, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 58, 'NEO', 1, NULL, NULL
  UNION ALL SELECT 65, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 66, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 67, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 68, 'NEO', 1, NULL, NULL
  UNION ALL SELECT 94, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 95, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 96, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 97, 'NEO', 1, NULL, NULL
  UNION ALL SELECT 119, 'ELITE', 5, NULL, NULL
  UNION ALL SELECT 120, 'PRO', 4, NULL, NULL
  UNION ALL SELECT 121, 'LITE', 3, NULL, NULL
  UNION ALL SELECT 122, 'CORE', 2, NULL, NULL
  UNION ALL SELECT 123, 'NEO', 1, NULL, NULL
  UNION ALL SELECT 170, 'ELITE', 5, 2022, 'Winter'
  UNION ALL SELECT 171, 'PRO', 4, 2022, 'Winter'
  UNION ALL SELECT 172, 'LITE', 3, 2022, 'Winter'
  UNION ALL SELECT 173, 'CORE', 2, 2022, 'Winter'
  UNION ALL SELECT 174, 'NEO', 1, 2022, 'Winter'
  UNION ALL SELECT 190, 'ELITE', 5, 2022, 'Spring'
  UNION ALL SELECT 191, 'PRO', 4, 2022, 'Spring'
  UNION ALL SELECT 192, 'LITE', 3, 2022, 'Spring'
  UNION ALL SELECT 193, 'CORE', 2, 2022, 'Spring'
  UNION ALL SELECT 194, 'NEO', 1, 2022, 'Spring'
  UNION ALL SELECT 250, 'ELITE', 5, 2023, 'Winter'
  UNION ALL SELECT 251, 'PRO', 4, 2023, 'Winter'
  UNION ALL SELECT 252, 'LITE', 3, 2023, 'Winter'
  UNION ALL SELECT 253, 'CORE', 2, 2023, 'Winter'
  UNION ALL SELECT 254, 'NEO', 1, 2023, 'Winter'
  UNION ALL SELECT 305, 'ELITE', 5, 2023, 'Spring'
  UNION ALL SELECT 306, 'PRO', 4, 2023, 'Spring'
  UNION ALL SELECT 307, 'LITE', 3, 2023, 'Spring'
  UNION ALL SELECT 308, 'CORE', 2, 2023, 'Spring'
  UNION ALL SELECT 309, 'NEO', 1, 2023, 'Spring'
  UNION ALL SELECT 338, 'ELITE', 5, 2024, 'Winter'
  UNION ALL SELECT 339, 'PRO', 4, 2024, 'Winter'
  UNION ALL SELECT 340, 'LITE', 3, 2024, 'Winter'
  UNION ALL SELECT 341, 'CORE', 2, 2024, 'Winter'
  UNION ALL SELECT 342, 'NEO', 1, 2024, 'Winter'
  UNION ALL SELECT 379, 'ELITE', 5, 2024, 'Spring'
  UNION ALL SELECT 380, 'PRO', 4, 2024, 'Spring'
  UNION ALL SELECT 381, 'LITE', 3, 2024, 'Spring'
  UNION ALL SELECT 382, 'CORE', 2, 2024, 'Spring'
  UNION ALL SELECT 383, 'NEO', 1, 2024, 'Spring'
  UNION ALL SELECT 411, 'ELITE', 5, 2025, 'Winter'
  UNION ALL SELECT 412, 'PRO', 4, 2025, 'Winter'
  UNION ALL SELECT 413, 'LITE', 3, 2025, 'Winter'
  UNION ALL SELECT 414, 'CORE', 2, 2025, 'Winter'
  UNION ALL SELECT 415, 'NEO', 1, 2025, 'Winter'
  UNION ALL SELECT 461, 'ELITE', 5, 2025, 'Spring'
  UNION ALL SELECT 462, 'PRO', 4, 2025, 'Spring'
  UNION ALL SELECT 463, 'LITE', 3, 2025, 'Spring'
  UNION ALL SELECT 464, 'CORE', 2, 2025, 'Spring'
  UNION ALL SELECT 465, 'NEO', 1, 2025, 'Spring'
  UNION ALL SELECT 482, 'ELITE QUALIFIER', NULL, 2026, 'Winter'
  UNION ALL SELECT 484, 'LITE', 3, 2026, 'Winter'
  UNION ALL SELECT 485, 'LITE', 3, 2026, 'Winter'
  UNION ALL SELECT 486, 'NEO', 1, 2026, 'Winter'
  UNION ALL SELECT 487, 'ELITE', 5, 2026, 'Winter'
  UNION ALL SELECT 488, 'PRO', 4, 2026, 'Winter'
  UNION ALL SELECT 489, 'LITE', 3, 2026, 'Winter'
  UNION ALL SELECT 490, 'CORE', 2, 2026, 'Winter'
  UNION ALL SELECT 491, 'NEO', 1, 2026, 'Winter'
  UNION ALL SELECT 502, 'ELITE QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 503, 'PRO WILDCARD BATTLE', NULL, 2026, 'Spring'
  UNION ALL SELECT 504, 'PRO QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 505, 'PRO QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 506, 'PRO QUALIFIER', NULL, 2026, 'Spring'
  UNION ALL SELECT 507, 'ELITE', 5, 2026, 'Spring'
  UNION ALL SELECT 508, 'PRO', 4, 2026, 'Spring'
  UNION ALL SELECT 509, 'LITE', 3, 2026, 'Spring'
  UNION ALL SELECT 510, 'CORE', 2, 2026, 'Spring'
  UNION ALL SELECT 511, 'NEO', 1, 2026, 'Spring'
  /* Swedish-only leagues outside ECL */
  UNION ALL SELECT 47, 'SCL', NULL, 2020, 'Swedish Championship League'
  UNION ALL SELECT 83, 'SCL', NULL, 2020, 'SCL'
  UNION ALL SELECT 148, 'SCL', NULL, 2021, 'SCL'
  UNION ALL SELECT 233, 'SCL', NULL, 2022, 'SCL'
  UNION ALL SELECT 310, 'SCL', NULL, 2023, 'SCL'
  UNION ALL SELECT 369, 'SCL', NULL, 2024, 'SCL'
  UNION ALL SELECT 447, 'SCL', NULL, 2025, 'SCL'
  UNION ALL SELECT 60, 'eSHL', NULL, NULL, 'eSHL'
  UNION ALL SELECT 268, 'eSHL', NULL, NULL, 'eSHL Season 4'
  UNION ALL SELECT 358, 'SEC', NULL, NULL, 'SEC 14'
  UNION ALL SELECT 393, 'SEC', NULL, NULL, 'SEC 15'
  UNION ALL SELECT 398, 'SEC', NULL, NULL, 'SEC 16'
  UNION ALL SELECT 441, 'SEC', NULL, NULL, 'SEC 17'
  UNION ALL SELECT 470, 'SEC', NULL, NULL, 'SEC 18'
  UNION ALL SELECT 476, 'SEC', NULL, NULL, 'SEC 19'
  UNION ALL SELECT 497, 'SEC DIV 1', NULL, NULL, 'SEC 20 DIV 1'
  UNION ALL SELECT 498, 'SEC DIV 2', NULL, NULL, 'SEC 20 DIV 2'
  UNION ALL SELECT 520, 'SEC', NULL, NULL, 'SEC 21'
),

ecl_league_map AS (
  SELECT
    leagueID,
    divisionName,
    divisionRank,
    seasonYear,
    seasonName,
    CASE
      WHEN leagueID IN (47,83,148,233,310,369,447) THEN 'SCL'
      WHEN leagueID IN (60,268) THEN 'ESHL'
      WHEN leagueID IN (358,393,398,441,470,476,497,498,520) THEN 'SEC'
      ELSE 'ECL'
    END AS leagueFamily,
    CASE
      WHEN leagueID = 4 THEN 'ECL 1'
      WHEN leagueID = 5 THEN 'ECL 2'
      WHEN leagueID = 17 THEN 'ECL 3'
      WHEN leagueID IN (18,19,20) THEN 'ECL 4'
      WHEN leagueID IN (23,24,25) THEN 'ECL 5'
      WHEN leagueID IN (27,28,29) THEN 'ECL 6'
      WHEN leagueID IN (35,36,37) THEN 'ECL 7'
      WHEN leagueID IN (40,41,42) THEN 'ECL 8'
      WHEN leagueID IN (55,56,57,58) THEN 'ECL 9'
      WHEN leagueID IN (65,66,67,68) THEN 'ECL 10'
      WHEN leagueID IN (94,95,96,97) THEN 'ECL 11'
      WHEN leagueID IN (119,120,121,122,123) THEN 'ECL 12'
      WHEN leagueID IN (170,171,172,173,174) THEN 'ECL 22 Winter'
      WHEN leagueID IN (190,191,192,193,194) THEN 'ECL 22 Spring'
      WHEN leagueID IN (250,251,252,253,254) THEN 'ECL 23 Winter'
      WHEN leagueID IN (305,306,307,308,309) THEN 'ECL 23 Spring'
      WHEN leagueID IN (338,339,340,341,342) THEN 'ECL 24 Winter'
      WHEN leagueID IN (379,380,381,382,383) THEN 'ECL 24 Spring'
      WHEN leagueID IN (411,412,413,414,415) THEN 'ECL 25 Winter'
      WHEN leagueID IN (461,462,463,464,465) THEN 'ECL 25 Spring'
      WHEN leagueID IN (482,484,485,486,487,488,489,490,491) THEN 'ECL 26 Winter'
      WHEN leagueID IN (502,503,504,505,506,507,508,509,510,511) THEN 'ECL 26 Spring'
      WHEN leagueID = 47 THEN 'SCL'
      WHEN leagueID = 83 THEN 'SCL 20'
      WHEN leagueID = 148 THEN 'SCL 21'
      WHEN leagueID = 233 THEN 'SCL 22'
      WHEN leagueID = 310 THEN 'SCL 23'
      WHEN leagueID = 369 THEN 'SCL 24'
      WHEN leagueID = 447 THEN 'SCL 25'
      WHEN leagueID = 60 THEN 'eSHL - Season 1'
      WHEN leagueID = 268 THEN 'eSHL - Season 4'
      WHEN leagueID = 358 THEN 'SEC 14'
      WHEN leagueID = 393 THEN 'SEC 15'
      WHEN leagueID = 398 THEN 'SEC 16'
      WHEN leagueID = 441 THEN 'SEC 17'
      WHEN leagueID = 470 THEN 'SEC 18'
      WHEN leagueID = 476 THEN 'SEC 19'
      WHEN leagueID = 497 THEN 'SEC 20 DIV 1'
      WHEN leagueID = 498 THEN 'SEC 20 DIV 2'
      WHEN leagueID = 520 THEN 'SEC 21'
      ELSE CONCAT('League ', leagueID)
    END AS seasonLabel,
    LOWER(REPLACE(divisionName, ' ', '-')) AS divisionKey
  FROM ecl_league_map_raw
),

team_name_map AS (
  SELECT 'ROBE Esports' AS old_name, 'MSK Esports' AS new_name
  UNION ALL SELECT 'GREATEST', 'Unwanted'
  UNION ALL SELECT 'MoDo Hockey', 'Västerås IK'
  UNION ALL SELECT 'Vesuvius Academy', 'Grim Reapers HC'
  UNION ALL SELECT 'Refuse Too Lose (DSQ)', 'Refuse Too Lose'
  UNION ALL SELECT 'HC Macho', 'Macho HC'
  UNION ALL SELECT 'Malmö Redhawks', 'Redhawks Esport'
  UNION ALL SELECT 'Malmo Redhawks', 'Redhawks Esport'
),

manual_swedish_teams AS (
  SELECT DISTINCT teamID
  FROM (
    SELECT 65 AS teamID
    UNION ALL SELECT 12
    UNION ALL SELECT 13
    UNION ALL SELECT 15
    UNION ALL SELECT 37
    UNION ALL SELECT 38
    UNION ALL SELECT 39
    UNION ALL SELECT 52
    UNION ALL SELECT 57
    UNION ALL SELECT 72
    UNION ALL SELECT 87
    UNION ALL SELECT 97
    UNION ALL SELECT 131
    UNION ALL SELECT 134
    UNION ALL SELECT 137
    UNION ALL SELECT 142
    UNION ALL SELECT 144
    UNION ALL SELECT 165
    UNION ALL SELECT 166
    UNION ALL SELECT 184
    UNION ALL SELECT 187
    UNION ALL SELECT 188
    UNION ALL SELECT 247
    UNION ALL SELECT 249
    UNION ALL SELECT 253
    UNION ALL SELECT 262
    UNION ALL SELECT 270
    UNION ALL SELECT 277
    UNION ALL SELECT 309
    UNION ALL SELECT 313
    UNION ALL SELECT 324
    UNION ALL SELECT 327
    UNION ALL SELECT 332
    UNION ALL SELECT 334
    UNION ALL SELECT 425
    UNION ALL SELECT 440
    UNION ALL SELECT 443
    UNION ALL SELECT 446
    UNION ALL SELECT 450
    UNION ALL SELECT 453
    UNION ALL SELECT 460
    UNION ALL SELECT 463
    UNION ALL SELECT 468
    UNION ALL SELECT 470
    UNION ALL SELECT 486
    UNION ALL SELECT 494
    UNION ALL SELECT 552
    UNION ALL SELECT 559
    UNION ALL SELECT 560
    UNION ALL SELECT 587
    UNION ALL SELECT 665
    UNION ALL SELECT 668
    UNION ALL SELECT 673
    UNION ALL SELECT 680
    UNION ALL SELECT 682
    UNION ALL SELECT 684
    UNION ALL SELECT 685
    UNION ALL SELECT 693
    UNION ALL SELECT 695
    UNION ALL SELECT 696
    UNION ALL SELECT 697
    UNION ALL SELECT 700
    UNION ALL SELECT 701
    UNION ALL SELECT 703
    UNION ALL SELECT 744
    UNION ALL SELECT 746
    UNION ALL SELECT 750
    UNION ALL SELECT 755
    UNION ALL SELECT 757
    UNION ALL SELECT 760
    UNION ALL SELECT 767
    UNION ALL SELECT 768
    UNION ALL SELECT 777
    UNION ALL SELECT 785
    UNION ALL SELECT 786
    UNION ALL SELECT 798
    UNION ALL SELECT 800
    UNION ALL SELECT 801
    UNION ALL SELECT 957
    UNION ALL SELECT 958
    UNION ALL SELECT 959
    UNION ALL SELECT 965
    UNION ALL SELECT 976
    UNION ALL SELECT 977
    UNION ALL SELECT 978
    UNION ALL SELECT 992
    UNION ALL SELECT 993
    UNION ALL SELECT 994
    UNION ALL SELECT 1486
    UNION ALL SELECT 1514
    UNION ALL SELECT 1519
    UNION ALL SELECT 1537
    UNION ALL SELECT 1538
    UNION ALL SELECT 1545
    UNION ALL SELECT 1559
    UNION ALL SELECT 1571
    UNION ALL SELECT 1589
    UNION ALL SELECT 1591
    UNION ALL SELECT 1597
    UNION ALL SELECT 1612
    UNION ALL SELECT 1624
    UNION ALL SELECT 1625
    UNION ALL SELECT 1649
    UNION ALL SELECT 1772
    UNION ALL SELECT 1792
    UNION ALL SELECT 1812
    UNION ALL SELECT 1831
    UNION ALL SELECT 1834
    UNION ALL SELECT 1843
    UNION ALL SELECT 1850
    UNION ALL SELECT 1872
    UNION ALL SELECT 1888
    UNION ALL SELECT 1892
    UNION ALL SELECT 1896
    UNION ALL SELECT 1902
    UNION ALL SELECT 1903
    UNION ALL SELECT 2185
    UNION ALL SELECT 2386
    UNION ALL SELECT 2409
    UNION ALL SELECT 2422
    UNION ALL SELECT 2486
    UNION ALL SELECT 2491
    UNION ALL SELECT 2499
    UNION ALL SELECT 2500
    UNION ALL SELECT 2504
    UNION ALL SELECT 2507
    UNION ALL SELECT 2509
    UNION ALL SELECT 2568
    UNION ALL SELECT 2570
    UNION ALL SELECT 2575
    UNION ALL SELECT 2751
    UNION ALL SELECT 2757
    UNION ALL SELECT 2777
    UNION ALL SELECT 2813
    UNION ALL SELECT 2821
    UNION ALL SELECT 2839
    UNION ALL SELECT 2848
    UNION ALL SELECT 2874
    UNION ALL SELECT 3250
    UNION ALL SELECT 3252
    UNION ALL SELECT 3253
    UNION ALL SELECT 3259
    UNION ALL SELECT 3263
    UNION ALL SELECT 3266
    UNION ALL SELECT 3314
    UNION ALL SELECT 3334
    UNION ALL SELECT 3392
    UNION ALL SELECT 3448
    UNION ALL SELECT 3770
    UNION ALL SELECT 3772
    UNION ALL SELECT 3786
    UNION ALL SELECT 3788
    UNION ALL SELECT 3790
    UNION ALL SELECT 3793
    UNION ALL SELECT 3826
    UNION ALL SELECT 3850
    UNION ALL SELECT 3862
    UNION ALL SELECT 3902
    UNION ALL SELECT 3906
    UNION ALL SELECT 4175
    UNION ALL SELECT 4181
    UNION ALL SELECT 4186
    UNION ALL SELECT 4196
    UNION ALL SELECT 4216
    UNION ALL SELECT 4243
    UNION ALL SELECT 4257
    UNION ALL SELECT 4276
    UNION ALL SELECT 4277
    UNION ALL SELECT 4293
    UNION ALL SELECT 4436
    UNION ALL SELECT 4525
    UNION ALL SELECT 4526
    UNION ALL SELECT 4529
    UNION ALL SELECT 4648
    UNION ALL SELECT 4686
    UNION ALL SELECT 4694

    UNION ALL SELECT 4264
    UNION ALL SELECT 1828
    UNION ALL SELECT 481
    UNION ALL SELECT 2405
    UNION ALL SELECT 2421
    UNION ALL SELECT 2463
    UNION ALL SELECT 2512
    UNION ALL SELECT 3132
    UNION ALL SELECT 3137
    UNION ALL SELECT 3241
    UNION ALL SELECT 4223
    UNION ALL SELECT 4428
    UNION ALL SELECT 4429
    UNION ALL SELECT 4439
    UNION ALL SELECT 4674
    UNION ALL SELECT 4690
    UNION ALL SELECT 4697
    UNION ALL SELECT 4715
    UNION ALL SELECT 4717
    UNION ALL SELECT 4794
    UNION ALL SELECT 4799
    UNION ALL SELECT 4801
    UNION ALL SELECT 4877
    UNION ALL SELECT 4878
    UNION ALL SELECT 4888
    UNION ALL SELECT 4911
    UNION ALL SELECT 4919
    UNION ALL SELECT 5010
    UNION ALL SELECT 5261
    UNION ALL SELECT 5837
    UNION ALL SELECT 5869
    UNION ALL SELECT 6085
    UNION ALL SELECT 6236
    UNION ALL SELECT 6245
    UNION ALL SELECT 6247
    UNION ALL SELECT 6465
    UNION ALL SELECT 6686
    UNION ALL SELECT 6698
    UNION ALL SELECT 6709
    UNION ALL SELECT 6712
    UNION ALL SELECT 6732
    UNION ALL SELECT 6782
    UNION ALL SELECT 6832
    UNION ALL SELECT 6884
    UNION ALL SELECT 6912
    UNION ALL SELECT 6962
    UNION ALL SELECT 6969
    UNION ALL SELECT 6989
    UNION ALL SELECT 7026
    UNION ALL SELECT 7028
   UNION ALL SELECT 643
  ) manual_ids
),

/* Swedish team appearances across all mapped ECL leagues */
swedish_team_seasons AS (
  SELECT
    lt.leagueID,
    lt.teamID,
    COALESCE(NULLIF(lt.teamName, ''), t.teamName) AS teamName,
    t.teamName AS currentTeamName,
    COALESCE(tnm.new_name, t.teamName) AS mappedTeamName,
    t.teamName AS originalTeamName,
    lt.country AS teamCountry,
    lt.groupID,
    lt.registeredForLeague,
    lt.teamCaptainID,
    lt.teamAssistantCaptainID,
    lt.teamAssistantCaptainID2,
    lm.divisionName,
    lm.divisionKey,
    lm.divisionRank,
    lm.seasonYear,
    lm.seasonName,
    lm.seasonLabel,
    CONCAT('https://sportsgamer.gg/leagues/', lt.leagueID, '/teams/', lt.teamID) AS teamUrl
  FROM nhlgamer_leagueTeams lt
  JOIN ecl_league_map lm
    ON lm.leagueID = lt.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = lt.teamID
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  LEFT JOIN manual_swedish_teams mst
    ON mst.teamID = lt.teamID
  WHERE (
     lm.leagueFamily IN ('SCL', 'ESHL')
     OR lt.country = 'SE'
     OR lm.leagueID = 520
     OR mst.teamID IS NOT NULL
    )
    AND LOWER(TRIM(COALESCE(NULLIF(lt.teamName, ''), t.teamName, ''))) <> 'hidden gemz'
),

/* Match rows from each team's point of view */
team_match_rows AS (
  SELECT
    m.leagueID,
    m.homeTeamID AS teamID,
    m.matchID,
    m.matchType,
    m.matchDate,
    m.goalsHome AS gf,
    m.goalsAway AS ga,
    m.overtime
  FROM nhlgamer_matches m
  JOIN ecl_league_map lm ON lm.leagueID = m.leagueID
  WHERE m.goalsHome IS NOT NULL AND m.goalsAway IS NOT NULL

  UNION ALL

  SELECT
    m.leagueID,
    m.awayTeamID AS teamID,
    m.matchID,
    m.matchType,
    m.matchDate,
    m.goalsAway AS gf,
    m.goalsHome AS ga,
    m.overtime
  FROM nhlgamer_matches m
  JOIN ecl_league_map lm ON lm.leagueID = m.leagueID
  WHERE m.goalsHome IS NOT NULL AND m.goalsAway IS NOT NULL
),

team_stats AS (
  SELECT
    leagueID,
    teamID,
    COUNT(DISTINCT matchID) AS gamesPlayed,
    SUM(CASE WHEN gf > ga THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN gf < ga THEN 1 ELSE 0 END) AS losses,
    SUM(CASE WHEN gf > ga AND COALESCE(overtime,0) = 1 THEN 1 ELSE 0 END) AS overtimeWins,
    SUM(CASE WHEN gf < ga AND COALESCE(overtime,0) = 1 THEN 1 ELSE 0 END) AS overtimeLosses,
    SUM(gf) AS goalsFor,
    SUM(ga) AS goalsAgainst,
    SUM(gf) - SUM(ga) AS goalDiff,
    SUM(CASE WHEN matchType = 'regular' THEN 1 ELSE 0 END) AS regularGames,
    SUM(CASE WHEN matchType = 'regular' AND gf > ga THEN 1 ELSE 0 END) AS regularWins,
    SUM(CASE WHEN matchType = 'regular' AND gf < ga THEN 1 ELSE 0 END) AS regularLosses,
    SUM(CASE WHEN matchType <> 'regular' OR matchType IS NULL THEN 1 ELSE 0 END) AS playoffGames,
    SUM(CASE WHEN (matchType <> 'regular' OR matchType IS NULL) AND gf > ga THEN 1 ELSE 0 END) AS playoffWins,
    SUM(CASE WHEN (matchType <> 'regular' OR matchType IS NULL) AND gf < ga THEN 1 ELSE 0 END) AS playoffLosses,
    SUM(
      CASE
        WHEN matchType = 'regular' AND gf > ga AND COALESCE(overtime,0) = 0 THEN 3
        WHEN matchType = 'regular' AND gf > ga AND COALESCE(overtime,0) = 1 THEN 2
        WHEN matchType = 'regular' AND gf < ga AND COALESCE(overtime,0) = 1 THEN 1
        ELSE 0
      END
    ) AS regularPoints
  FROM team_match_rows
  GROUP BY leagueID, teamID
),

/* Roster source = league roster + anyone with recorded stats */
roster_source AS (
  SELECT DISTINCT leagueID, teamID, playerID
  FROM nhlgamer_leagueRosters
  WHERE leagueID IN (SELECT leagueID FROM ecl_league_map)

  UNION

  SELECT DISTINCT leagueID, teamID, playerID
  FROM nhlgamer_playerStats
  WHERE leagueID IN (SELECT leagueID FROM ecl_league_map)

  UNION

  SELECT DISTINCT leagueID, teamID, playerID
  FROM nhlgamer_goalieStats
  WHERE leagueID IN (SELECT leagueID FROM ecl_league_map)
),

skater_stats AS (
  SELECT
    leagueID,
    teamID,
    playerID,
    SUM(CASE WHEN gameType = 'regular' THEN gamesPlayed ELSE 0 END) AS regularGames,
    SUM(CASE WHEN gameType <> 'regular' OR gameType IS NULL THEN gamesPlayed ELSE 0 END) AS playoffGames,
    SUM(gamesPlayed) AS skaterGames,
    SUM(goals) AS goals,
    SUM(assists) AS assists,
    SUM(points) AS points,
    SUM(penaltyMinutes) AS penaltyMinutes
  FROM nhlgamer_playerStats
  WHERE leagueID IN (SELECT leagueID FROM ecl_league_map)
  GROUP BY leagueID, teamID, playerID
),

goalie_stats AS (
  SELECT
    leagueID,
    teamID,
    playerID,
    SUM(CASE WHEN gameType = 'regular' THEN gamesPlayed ELSE 0 END) AS goalieRegularGames,
    SUM(CASE WHEN gameType <> 'regular' OR gameType IS NULL THEN gamesPlayed ELSE 0 END) AS goaliePlayoffGames,
    SUM(gamesPlayed) AS goalieGames,
    SUM(wins) AS goalieWins,
    SUM(saves) AS saves,
    SUM(goalsAllowed) AS goalsAllowed,
    SUM(shutouts) AS shutouts
  FROM nhlgamer_goalieStats
  WHERE leagueID IN (SELECT leagueID FROM ecl_league_map)
  GROUP BY leagueID, teamID, playerID
),

player_team_stats AS (
  SELECT
    rs.leagueID,
    rs.teamID,
    rs.playerID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    p.userID,
    CAST(COALESCE(NULLIF(p.nationality, ''), p.country, '') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,
    p.country AS playerCountry,
    COALESCE(ss.regularGames, 0) + COALESCE(gs.goalieRegularGames, 0) AS regularGames,
    COALESCE(ss.playoffGames, 0) + COALESCE(gs.goaliePlayoffGames, 0) AS playoffGames,
    COALESCE(ss.skaterGames, 0) AS skaterGames,
    COALESCE(gs.goalieGames, 0) AS goalieGames,
    COALESCE(ss.skaterGames, 0) + COALESCE(gs.goalieGames, 0) AS gamesPlayed,
    COALESCE(ss.goals, 0) AS goals,
    COALESCE(ss.assists, 0) AS assists,
    COALESCE(ss.points, 0) AS points,
    ROUND(COALESCE(ss.points, 0) / NULLIF(COALESCE(ss.skaterGames, 0), 0), 2) AS ppg,
    COALESCE(ss.penaltyMinutes, 0) AS penaltyMinutes,
    COALESCE(gs.goalieWins, 0) AS goalieWins,
    COALESCE(gs.saves, 0) AS saves,
    COALESCE(gs.goalsAllowed, 0) AS goalsAllowed,
    ROUND(COALESCE(gs.goalsAllowed, 0) / NULLIF(COALESCE(gs.goalieGames, 0), 0), 2) AS gaa,
    CAST(ROUND(COALESCE(gs.saves, 0) * 100.0 / NULLIF(COALESCE(gs.saves, 0) + COALESCE(gs.goalsAllowed, 0), 0), 2) AS DECIMAL(5,2)) AS savePct,
    COALESCE(gs.shutouts, 0) AS shutouts,
    CASE
      WHEN COALESCE(gs.goalieGames, 0) > COALESCE(ss.skaterGames, 0) THEN 'G'
      WHEN COALESCE(ss.skaterGames, 0) > 0 THEN 'Skater'
      ELSE 'Roster'
    END AS primaryRole,
    CASE WHEN COALESCE(ss.skaterGames, 0) + COALESCE(gs.goalieGames, 0) > 0 THEN TRUE ELSE FALSE END AS played
  FROM roster_source rs
  JOIN nhlgamer_players p
    ON p.playerID = rs.playerID
  LEFT JOIN skater_stats ss
    ON ss.leagueID = rs.leagueID
   AND ss.teamID = rs.teamID
   AND ss.playerID = rs.playerID
  LEFT JOIN goalie_stats gs
    ON gs.leagueID = rs.leagueID
   AND gs.teamID = rs.teamID
   AND gs.playerID = rs.playerID
),

player_history_json AS (
  SELECT
    q.playerID,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', q.leagueID,
        'teamID', q.teamID,
        'teamName', q.teamName,
        'division', q.divisionName,
        'divisionKey', q.divisionKey,
        'seasonLabel', q.seasonLabel,
        'seasonYear', q.seasonYear,
        'seasonName', q.seasonName,
        'gamesPlayed', q.gamesPlayed,
        'regularGames', q.regularGames,
        'playoffGames', q.playoffGames,
        'goals', q.goals,
        'assists', q.assists,
        'points', q.points,
        'primaryRole', q.primaryRole,
        'played', q.played,
        'teamUrl', CONCAT('https://sportsgamer.gg/leagues/', q.leagueID, '/teams/', q.teamID)
      )
    ) AS history
  FROM (
    SELECT
      pts.*,
      COALESCE(NULLIF(lt.teamName, ''), t.teamName) AS teamName,
      lm.divisionName,
      lm.divisionKey,
      lm.divisionRank,
      lm.seasonLabel,
      lm.seasonYear,
      lm.seasonName
    FROM player_team_stats pts
    JOIN ecl_league_map lm ON lm.leagueID = pts.leagueID
    JOIN nhlgamer_teams t ON t.teamID = pts.teamID
    JOIN nhlgamer_leagueTeams lt
      ON lt.leagueID = pts.leagueID
     AND lt.teamID = pts.teamID
    LEFT JOIN team_name_map tnm ON tnm.old_name = t.teamName
    ORDER BY
      COALESCE(lm.seasonYear, 0) DESC,
      CASE WHEN lm.seasonName = 'Spring' THEN 2 WHEN lm.seasonName = 'Winter' THEN 1 ELSE 0 END DESC,
      lm.leagueID DESC,
      lm.divisionRank DESC,
      pts.gamesPlayed DESC
  ) q
  GROUP BY q.playerID
),

team_history_json AS (
  SELECT
    x.teamID,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', x.leagueID,
        'teamName', x.teamName,
        'division', x.divisionName,
        'divisionKey', x.divisionKey,
        'seasonLabel', x.seasonLabel,
        'seasonYear', x.seasonYear,
        'seasonName', x.seasonName,
        'country', x.country,
        'gamesPlayed', COALESCE(ts.gamesPlayed, 0),
        'wins', COALESCE(ts.wins, 0),
        'losses', COALESCE(ts.losses, 0),
        'regularPoints', COALESCE(ts.regularPoints, 0),
        'goalsFor', COALESCE(ts.goalsFor, 0),
        'goalsAgainst', COALESCE(ts.goalsAgainst, 0),
        'teamUrl', CONCAT('https://sportsgamer.gg/leagues/', x.leagueID, '/teams/', x.teamID)
      )
    ) AS history
  FROM (
    SELECT
      lt.leagueID,
      lt.teamID,
      lt.country,
      COALESCE(NULLIF(lt.teamName, ''), t.teamName) AS teamName,
      lm.divisionName,
      lm.divisionKey,
      lm.divisionRank,
      lm.seasonLabel,
      lm.seasonYear,
      lm.seasonName
    FROM nhlgamer_leagueTeams lt
    JOIN ecl_league_map lm ON lm.leagueID = lt.leagueID
    JOIN nhlgamer_teams t ON t.teamID = lt.teamID
    LEFT JOIN team_name_map tnm ON tnm.old_name = t.teamName
    ORDER BY
      lt.teamID,
      COALESCE(lm.seasonYear, 0) DESC,
      CASE WHEN lm.seasonName = 'Spring' THEN 2 WHEN lm.seasonName = 'Winter' THEN 1 ELSE 0 END DESC,
      lm.leagueID DESC
  ) x
  LEFT JOIN team_stats ts
    ON ts.leagueID = x.leagueID
   AND ts.teamID = x.teamID
  GROUP BY x.teamID
),

team_players_json AS (
  SELECT
    q.leagueID,
    q.teamID,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', q.playerID,
        'userID', q.userID,
        'name', q.playerName,
        'nationality', q.nationality,
        'country', q.playerCountry,
        'primaryRole', q.primaryRole,
        'played', q.played,
        'gamesPlayed', q.gamesPlayed,
        'regularGames', q.regularGames,
        'playoffGames', q.playoffGames,
        'skaterGames', q.skaterGames,
        'goalieGames', q.goalieGames,
        'goals', q.goals,
        'assists', q.assists,
        'points', q.points,
        'ppg', q.ppg,
        'penaltyMinutes', q.penaltyMinutes,
        'goalieWins', q.goalieWins,
        'saves', q.saves,
        'goalsAllowed', q.goalsAllowed,
        'gaa', q.gaa,
        'savePct', q.savePct,
        'shutouts', q.shutouts,
        'profileUrl', CONCAT('https://sportsgamer.gg/players/', q.playerID),
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(q.playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM player_team_stats
    ORDER BY
      leagueID,
      teamID,
      played DESC,
      gamesPlayed DESC,
      points DESC,
      goals DESC,
      playerName ASC
  ) q
  GROUP BY q.leagueID, q.teamID
),

teams_json AS (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'leagueID', q.leagueID,
      'teamID', q.teamID,
      'name', q.teamName,
      'originalName', q.originalTeamName,
      'country', q.teamCountry,
      'groupID', q.groupID,
      'division', q.divisionName,
      'divisionKey', q.divisionKey,
      'divisionRank', q.divisionRank,
      'seasonLabel', q.seasonLabel,
      'seasonYear', q.seasonYear,
      'seasonName', q.seasonName,
      'registeredForLeague', q.registeredForLeague,
      'teamUrl', q.teamUrl,
      'logo', CONCAT(
        LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
          REGEXP_REPLACE(CONVERT(q.teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
          '-+',
          '-'
        ))),
        '.png'
      ),
      'stats', JSON_OBJECT(
        'gamesPlayed', COALESCE(q.gamesPlayed, 0),
        'wins', COALESCE(q.wins, 0),
        'losses', COALESCE(q.losses, 0),
        'overtimeWins', COALESCE(q.overtimeWins, 0),
        'overtimeLosses', COALESCE(q.overtimeLosses, 0),
        'goalsFor', COALESCE(q.goalsFor, 0),
        'goalsAgainst', COALESCE(q.goalsAgainst, 0),
        'goalDiff', COALESCE(q.goalDiff, 0),
        'regularGames', COALESCE(q.regularGames, 0),
        'regularWins', COALESCE(q.regularWins, 0),
        'regularLosses', COALESCE(q.regularLosses, 0),
        'regularPoints', COALESCE(q.regularPoints, 0),
        'playoffGames', COALESCE(q.playoffGames, 0),
        'playoffWins', COALESCE(q.playoffWins, 0),
        'playoffLosses', COALESCE(q.playoffLosses, 0)
      ),
      'players', COALESCE(tp.players, JSON_ARRAY())
    )
  ) AS teams
  FROM (
    SELECT
      sts.*,
      ts.gamesPlayed,
      ts.wins,
      ts.losses,
      ts.overtimeWins,
      ts.overtimeLosses,
      ts.goalsFor,
      ts.goalsAgainst,
      ts.goalDiff,
      ts.regularGames,
      ts.regularWins,
      ts.regularLosses,
      ts.regularPoints,
      ts.playoffGames,
      ts.playoffWins,
      ts.playoffLosses
    FROM swedish_team_seasons sts
    LEFT JOIN team_stats ts
      ON ts.leagueID = sts.leagueID
     AND ts.teamID = sts.teamID
    ORDER BY
      COALESCE(sts.seasonYear, 0) DESC,
      CASE WHEN sts.seasonName = 'Spring' THEN 2 WHEN sts.seasonName = 'Winter' THEN 1 ELSE 0 END DESC,
      sts.leagueID DESC,
      sts.divisionRank DESC,
      sts.teamName ASC
  ) q
  LEFT JOIN team_players_json tp
    ON tp.leagueID = q.leagueID
   AND tp.teamID = q.teamID
)


SELECT JSON_OBJECT(
  'updated', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  'source', 'svenska-lag-historia-player-history-v9-league-team-names.sql',
  'playerHistory', COALESCE((
    SELECT JSON_ARRAYAGG(JSON_OBJECT('playerID', playerID, 'history', history))
    FROM player_history_json
  ), JSON_ARRAY())
) AS json_result;
