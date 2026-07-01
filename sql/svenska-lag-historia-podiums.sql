USE `nhlgamer.com`;

SET SESSION group_concat_max_len = 1000000;

/*
  Output: one JSON object for lagsidornas turneringsmeriter.
  Export resultens json_result to: svenska-lag-historia-podiums.json

  placement:
    1 = vinnare
    2 = finalist/tvaa
    3 = trea/brons
*/

SELECT
  CONCAT('NULLIF(CAST(leagueInfo.`', c.COLUMN_NAME, '` AS CHAR), '''')')
INTO @league_name_column
FROM information_schema.COLUMNS c
WHERE c.TABLE_SCHEMA = DATABASE()
  AND c.TABLE_NAME = 'nhlgamer_leagues'
  AND c.DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext')
  AND LOWER(c.COLUMN_NAME) NOT LIKE '%description%'
  AND LOWER(c.COLUMN_NAME) NOT LIKE '%rules%'
  AND LOWER(c.COLUMN_NAME) NOT LIKE '%json%'
  AND LOWER(c.COLUMN_NAME) NOT LIKE '%logo%'
  AND LOWER(c.COLUMN_NAME) NOT LIKE '%image%'
  AND LOWER(c.COLUMN_NAME) NOT LIKE '%url%'
ORDER BY c.ORDINAL_POSITION
LIMIT 1;

SET @league_name_column = COALESCE(@league_name_column, 'CAST(podium_rows.leagueID AS CHAR)');

SET @sql = CONCAT(
'SELECT JSON_OBJECT(
  ''updated'', DATE_FORMAT(NOW(), ''%Y-%m-%d %H:%i:%s''),
  ''source'', ''svenska-lag-historia-podiums.sql'',
  ''podiums'', COALESCE(JSON_ARRAYAGG(
    JSON_OBJECT(
      ''leagueID'', podium_rows.leagueID,
      ''leagueName'', CASE
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6 - 2025%'' THEN ''SCL 25''
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6 - 2024%'' THEN ''SCL 24''
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6 - 2023%'' THEN ''SCL 23''
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6 - 2022%'' THEN ''SCL 22''
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6 - 2021%'' THEN ''SCL 21''
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6 - 2020%'' THEN ''SCL 20''
        WHEN COALESCE(', @league_name_column, ', '''') LIKE ''Swedish Championship League%'' THEN ''SCL''
        WHEN COALESCE(', @league_name_column, ', '''') = ''eSHL'' THEN ''eSHL - Season 1''
        ELSE ', @league_name_column, '
      END,
      ''placement'', podium_rows.placement,
      ''teamID'', podium_rows.teamID,
      ''teamName'', podium_rows.teamName,
      ''teamUrl'', CONCAT(''https://sportsgamer.gg/leagues/'', podium_rows.leagueID, ''/teams/'', podium_rows.teamID)
    )
  ), JSON_ARRAY())
) AS json_result
FROM (
  SELECT
    series_rows.leagueID,
    1 AS placement,
    CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.homeTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.awayTeamID
      ELSE NULL
    END AS teamID,
    COALESCE(leagueTeam.teamName, team.teamName) AS teamName
  FROM (
    SELECT
      p.leagueID,
      p.playoffStage,
      p.homeTeamID,
      p.awayTeamID,
      SUM(CASE
        WHEN m.homeTeamID = p.homeTeamID AND m.goalsHome > m.goalsAway THEN 1
        WHEN m.awayTeamID = p.homeTeamID AND m.goalsAway > m.goalsHome THEN 1
        ELSE 0
      END) AS homeWins,
      SUM(CASE
        WHEN m.homeTeamID = p.awayTeamID AND m.goalsHome > m.goalsAway THEN 1
        WHEN m.awayTeamID = p.awayTeamID AND m.goalsAway > m.goalsHome THEN 1
        ELSE 0
      END) AS awayWins
    FROM nhlgamer_playoffs p
    JOIN nhlgamer_matches m
      ON m.leagueID = p.leagueID
     AND (
       (m.homeTeamID = p.homeTeamID AND m.awayTeamID = p.awayTeamID)
       OR (m.homeTeamID = p.awayTeamID AND m.awayTeamID = p.homeTeamID)
     )
    WHERE p.playoffStage = 1
      AND COALESCE(m.matchType, ''playoffs'') = ''playoffs''
      AND COALESCE(m.matchIgnore, 0) <> 1
    GROUP BY p.leagueID, p.playoffStage, p.homeTeamID, p.awayTeamID
  ) series_rows
  LEFT JOIN nhlgamer_leagueTeams leagueTeam
    ON leagueTeam.leagueID = series_rows.leagueID
   AND leagueTeam.teamID = CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.homeTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.awayTeamID
      ELSE NULL
    END
  LEFT JOIN nhlgamer_teams team
    ON team.teamID = CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.homeTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.awayTeamID
      ELSE NULL
    END
  WHERE series_rows.homeWins <> series_rows.awayWins

  UNION ALL

  SELECT
    series_rows.leagueID,
    2 AS placement,
    CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.awayTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.homeTeamID
      ELSE NULL
    END AS teamID,
    COALESCE(leagueTeam.teamName, team.teamName) AS teamName
  FROM (
    SELECT
      p.leagueID,
      p.playoffStage,
      p.homeTeamID,
      p.awayTeamID,
      SUM(CASE
        WHEN m.homeTeamID = p.homeTeamID AND m.goalsHome > m.goalsAway THEN 1
        WHEN m.awayTeamID = p.homeTeamID AND m.goalsAway > m.goalsHome THEN 1
        ELSE 0
      END) AS homeWins,
      SUM(CASE
        WHEN m.homeTeamID = p.awayTeamID AND m.goalsHome > m.goalsAway THEN 1
        WHEN m.awayTeamID = p.awayTeamID AND m.goalsAway > m.goalsHome THEN 1
        ELSE 0
      END) AS awayWins
    FROM nhlgamer_playoffs p
    JOIN nhlgamer_matches m
      ON m.leagueID = p.leagueID
     AND (
       (m.homeTeamID = p.homeTeamID AND m.awayTeamID = p.awayTeamID)
       OR (m.homeTeamID = p.awayTeamID AND m.awayTeamID = p.homeTeamID)
     )
    WHERE p.playoffStage = 1
      AND COALESCE(m.matchType, ''playoffs'') = ''playoffs''
      AND COALESCE(m.matchIgnore, 0) <> 1
    GROUP BY p.leagueID, p.playoffStage, p.homeTeamID, p.awayTeamID
  ) series_rows
  LEFT JOIN nhlgamer_leagueTeams leagueTeam
    ON leagueTeam.leagueID = series_rows.leagueID
   AND leagueTeam.teamID = CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.awayTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.homeTeamID
      ELSE NULL
    END
  LEFT JOIN nhlgamer_teams team
    ON team.teamID = CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.awayTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.homeTeamID
      ELSE NULL
    END
  WHERE series_rows.homeWins <> series_rows.awayWins

  UNION ALL

  SELECT
    series_rows.leagueID,
    3 AS placement,
    CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.homeTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.awayTeamID
      ELSE NULL
    END AS teamID,
    COALESCE(leagueTeam.teamName, team.teamName) AS teamName
  FROM (
    SELECT
      p.leagueID,
      p.playoffStage,
      p.homeTeamID,
      p.awayTeamID,
      SUM(CASE
        WHEN m.homeTeamID = p.homeTeamID AND m.goalsHome > m.goalsAway THEN 1
        WHEN m.awayTeamID = p.homeTeamID AND m.goalsAway > m.goalsHome THEN 1
        ELSE 0
      END) AS homeWins,
      SUM(CASE
        WHEN m.homeTeamID = p.awayTeamID AND m.goalsHome > m.goalsAway THEN 1
        WHEN m.awayTeamID = p.awayTeamID AND m.goalsAway > m.goalsHome THEN 1
        ELSE 0
      END) AS awayWins
    FROM nhlgamer_playoffs p
    JOIN nhlgamer_matches m
      ON m.leagueID = p.leagueID
     AND (
       (m.homeTeamID = p.homeTeamID AND m.awayTeamID = p.awayTeamID)
       OR (m.homeTeamID = p.awayTeamID AND m.awayTeamID = p.homeTeamID)
     )
    WHERE p.playoffStage = 0
      AND COALESCE(m.matchType, ''playoffs'') = ''playoffs''
      AND COALESCE(m.matchIgnore, 0) <> 1
    GROUP BY p.leagueID, p.playoffStage, p.homeTeamID, p.awayTeamID
  ) series_rows
  LEFT JOIN nhlgamer_leagueTeams leagueTeam
    ON leagueTeam.leagueID = series_rows.leagueID
   AND leagueTeam.teamID = CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.homeTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.awayTeamID
      ELSE NULL
    END
  LEFT JOIN nhlgamer_teams team
    ON team.teamID = CASE
      WHEN series_rows.homeWins > series_rows.awayWins THEN series_rows.homeTeamID
      WHEN series_rows.awayWins > series_rows.homeWins THEN series_rows.awayTeamID
      ELSE NULL
    END
  WHERE series_rows.homeWins <> series_rows.awayWins
) podium_rows
LEFT JOIN nhlgamer_leagues leagueInfo
  ON leagueInfo.leagueID = podium_rows.leagueID
WHERE podium_rows.teamID IS NOT NULL
  AND (
    COALESCE(', @league_name_column, ', '''') LIKE ''%ECL%''
    OR COALESCE(', @league_name_column, ', '''') LIKE ''%European Championship League%''
    OR COALESCE(', @league_name_column, ', '''') LIKE ''SEC %''
    OR COALESCE(', @league_name_column, ', '''') LIKE ''%eSHL%''
    OR COALESCE(', @league_name_column, ', '''') LIKE ''SCL 6v6%''
    OR COALESCE(', @league_name_column, ', '''') LIKE ''%Swedish Championship League%''
    OR podium_rows.leagueID = 520
  )
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%Warmup%''
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%Pre-Season%''
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%Pre Season%''
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%Preseason%''
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%Qualifier%''
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%Qualification%''
  AND COALESCE(', @league_name_column, ', '''') NOT LIKE ''%1v1%''
ORDER BY podium_rows.leagueID DESC, podium_rows.placement ASC'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
