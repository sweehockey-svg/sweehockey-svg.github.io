WITH
league_map AS (
  SELECT 507 AS leagueID, 'elite' AS division, 1 AS sortOrder
  UNION ALL SELECT 508, 'pro', 2
  UNION ALL SELECT 509, 'lite', 3
  UNION ALL SELECT 510, 'core', 4
  UNION ALL SELECT 511, 'neo', 5
),

team_name_map AS (
  SELECT 'ROBE Esports' AS old_name, 'MSK Esports' AS new_name
  UNION ALL SELECT 'GREATEST', 'Unwanted'
  UNION ALL SELECT 'MoDo Hockey', 'Västerås IK'
  UNION ALL SELECT 'Vesuvius Academy', 'Grim Reapers HC'
  UNION ALL SELECT 'Refuse Too Lose (DSQ)', 'Refuse Too Lose'
),

latest_current_invite_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      ti.playerID,
      ti.leagueID,
      ti.teamID,
      ROW_NUMBER() OVER (
        PARTITION BY ti.playerID, ti.leagueID
        ORDER BY ti.inviteDate DESC, ti.teamID DESC
      ) AS rn
    FROM nhlgamer_teamInvites ti
    WHERE ti.inviteStatus = 2
      AND ti.leagueID IN (507,508,509,510,511)
  ) x
  WHERE x.rn = 1
),

/* =========================
   REGULAR TEAM MATCHES
========================= */
regular_team_games AS (
  SELECT
    p.leagueID,
    p.teamID,
    COUNT(DISTINCT p.matchID) AS teamMatches
  FROM nhlgamer_participants p
  JOIN nhlgamer_matches m
    ON m.matchID = p.matchID
  WHERE p.leagueID IN (507,508,509,510,511)
    AND m.matchType = 'regular'
  GROUP BY p.leagueID, p.teamID
),

/* =========================
   REGULAR SKATERS
========================= */
regular_skaters_stats AS (
  SELECT
    p.playerID,
    ps.leagueID,
    CASE
      WHEN p.psntag IS NOT NULL AND p.psntag <> '' THEN p.psntag
      ELSE p.gamertag
    END AS playerName,
    SUM(ps.gamesPlayed) AS gp,
    SUM(ps.goals) AS goals,
    SUM(ps.assists) AS assists,
    SUM(ps.points) AS points,
    ROUND(
      SUM(ps.points) * 1.0 / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS ppg,
    SUM(ps.penaltyMinutes) AS pim,
    ROUND(
      (SUM(ps.takeaways) + SUM(ps.interceptions) + SUM(ps.blockedShots)) * 1.0
      / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS dim
  FROM nhlgamer_playerStats ps
  JOIN nhlgamer_players p
    ON ps.playerID = p.playerID
  WHERE ps.leagueID IN (507,508,509,510,511)
    AND ps.gameType = 'regular'
    AND p.country = 'SE'
  GROUP BY p.playerID, ps.leagueID, playerName
),

regular_skaters_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      ps.playerID,
      ps.leagueID,
      ps.teamID,
      SUM(ps.gamesPlayed) AS gp
    FROM nhlgamer_playerStats ps
    JOIN nhlgamer_players p
      ON ps.playerID = p.playerID
    WHERE ps.leagueID IN (507,508,509,510,511)
      AND ps.gameType = 'regular'
      AND p.country = 'SE'
    GROUP BY ps.playerID, ps.leagueID, ps.teamID
  ) x
  JOIN (
    SELECT
      playerID,
      leagueID,
      MAX(gp) AS maxGp
    FROM (
      SELECT
        ps.playerID,
        ps.leagueID,
        ps.teamID,
        SUM(ps.gamesPlayed) AS gp
      FROM nhlgamer_playerStats ps
      JOIN nhlgamer_players p
        ON ps.playerID = p.playerID
      WHERE ps.leagueID IN (507,508,509,510,511)
        AND ps.gameType = 'regular'
        AND p.country = 'SE'
      GROUP BY ps.playerID, ps.leagueID, ps.teamID
    ) y
    GROUP BY playerID, leagueID
  ) m
    ON m.playerID = x.playerID
   AND m.leagueID = x.leagueID
   AND m.maxGp = x.gp
),

regular_skaters_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    rs.playerName,
    COALESCE(lcit.teamID, rst.teamID) AS teamID,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    rs.gp,
    COALESCE(rtg.teamMatches, 0) AS teamMatches,
    CAST(ROUND(
      rs.gp * 100.0 / NULLIF(COALESCE(rtg.teamMatches, 0), 0),
      2
    ) AS DECIMAL(6,2)) AS matchSharePct,
    rs.goals,
    rs.assists,
    rs.points,
    rs.ppg,
    rs.pim,
    rs.dim
  FROM regular_skaters_stats rs
  JOIN regular_skaters_team rst
    ON rst.playerID = rs.playerID
   AND rst.leagueID = rs.leagueID
  LEFT JOIN latest_current_invite_team lcit
    ON lcit.playerID = rs.playerID
   AND lcit.leagueID = rs.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = COALESCE(lcit.teamID, rst.teamID)
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  JOIN league_map lm
    ON lm.leagueID = rs.leagueID
  LEFT JOIN regular_team_games rtg
    ON rtg.leagueID = rs.leagueID
   AND rtg.teamID = COALESCE(lcit.teamID, rst.teamID)
  WHERE rs.gp > 0
),

regular_skaters_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', playerName,
        'gp', gp,
        'teamMatches', teamMatches,
        'matchSharePct', matchSharePct,
        'g', goals,
        'a', assists,
        'p', points,
        'ppg', ppg,
        'pen', pim,
        'dim', dim,
        'team', teamName,
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        ),
        'teamLogo', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM regular_skaters_base
    ORDER BY sortOrder, division, points DESC, goals DESC, gp DESC, playerName ASC
  ) q
  GROUP BY division
),

/* =========================
   REGULAR DEFENDERS
========================= */
regular_defenders_stats AS (
  SELECT
    p.playerID,
    ps.leagueID,
    CASE
      WHEN p.psntag IS NOT NULL AND p.psntag <> '' THEN p.psntag
      ELSE p.gamertag
    END AS playerName,
    SUM(ps.gamesPlayed) AS gp,
    SUM(ps.goals) AS goals,
    SUM(ps.assists) AS assists,
    SUM(ps.points) AS points,
    ROUND(
      SUM(ps.points) * 1.0 / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS ppg,
    SUM(ps.penaltyMinutes) AS pim,
    ROUND(
      (SUM(ps.takeaways) + SUM(ps.interceptions) + SUM(ps.blockedShots)) * 1.0
      / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS dim
  FROM nhlgamer_playerStats ps
  JOIN nhlgamer_players p
    ON ps.playerID = p.playerID
  WHERE ps.leagueID IN (507,508,509,510,511)
    AND ps.gameType = 'regular'
    AND ps.positionID IN (4,5)
    AND p.country = 'SE'
  GROUP BY p.playerID, ps.leagueID, playerName
),

regular_defenders_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      ps.playerID,
      ps.leagueID,
      ps.teamID,
      SUM(ps.gamesPlayed) AS gp
    FROM nhlgamer_playerStats ps
    JOIN nhlgamer_players p
      ON ps.playerID = p.playerID
    WHERE ps.leagueID IN (507,508,509,510,511)
      AND ps.gameType = 'regular'
      AND ps.positionID IN (4,5)
      AND p.country = 'SE'
    GROUP BY ps.playerID, ps.leagueID, ps.teamID
  ) x
  JOIN (
    SELECT
      playerID,
      leagueID,
      MAX(gp) AS maxGp
    FROM (
      SELECT
        ps.playerID,
        ps.leagueID,
        ps.teamID,
        SUM(ps.gamesPlayed) AS gp
      FROM nhlgamer_playerStats ps
      JOIN nhlgamer_players p
        ON ps.playerID = p.playerID
      WHERE ps.leagueID IN (507,508,509,510,511)
        AND ps.gameType = 'regular'
        AND ps.positionID IN (4,5)
        AND p.country = 'SE'
      GROUP BY ps.playerID, ps.leagueID, ps.teamID
    ) y
    GROUP BY playerID, leagueID
  ) m
    ON m.playerID = x.playerID
   AND m.leagueID = x.leagueID
   AND m.maxGp = x.gp
),

regular_defenders_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    rs.playerName,
    COALESCE(lcit.teamID, rst.teamID) AS teamID,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    rs.gp,
    COALESCE(rtg.teamMatches, 0) AS teamMatches,
    CAST(ROUND(
      rs.gp * 100.0 / NULLIF(COALESCE(rtg.teamMatches, 0), 0),
      2
    ) AS DECIMAL(6,2)) AS matchSharePct,
    rs.goals,
    rs.assists,
    rs.points,
    rs.ppg,
    rs.pim,
    rs.dim
  FROM regular_defenders_stats rs
  JOIN regular_defenders_team rst
    ON rst.playerID = rs.playerID
   AND rst.leagueID = rs.leagueID
  LEFT JOIN latest_current_invite_team lcit
    ON lcit.playerID = rs.playerID
   AND lcit.leagueID = rs.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = COALESCE(lcit.teamID, rst.teamID)
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  JOIN league_map lm
    ON lm.leagueID = rs.leagueID
  LEFT JOIN regular_team_games rtg
    ON rtg.leagueID = rs.leagueID
   AND rtg.teamID = COALESCE(lcit.teamID, rst.teamID)
  WHERE rs.gp > 0
),

regular_defenders_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', playerName,
        'gp', gp,
        'teamMatches', teamMatches,
        'matchSharePct', matchSharePct,
        'g', goals,
        'a', assists,
        'p', points,
        'ppg', ppg,
        'pen', pim,
        'dim', dim,
        'team', teamName,
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        ),
        'teamLogo', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM regular_defenders_base
    ORDER BY sortOrder, division, points DESC, goals DESC, gp DESC, playerName ASC
  ) q
  GROUP BY division
),

/* =========================
   REGULAR GOALIES
========================= */
regular_goalies_stats AS (
  SELECT
    gs.playerID,
    gs.leagueID,
    CASE
      WHEN p.psntag IS NOT NULL AND p.psntag <> '' THEN p.psntag
      ELSE p.gamertag
    END AS playerName,
    SUM(gs.gamesPlayed) AS gp,
    SUM(gs.wins) AS wins,
    SUM(gs.saves) AS saves,
    ROUND(
      SUM(gs.goalsAllowed) * 1.0 / NULLIF(SUM(gs.gamesPlayed), 0),
      2
    ) AS gaa,
    CAST(ROUND(
      SUM(gs.saves) * 100.0 / NULLIF(SUM(gs.saves) + SUM(gs.goalsAllowed), 0),
      2
    ) AS DECIMAL(5,2)) AS svp,
    SUM(gs.shutouts) AS shutouts
  FROM nhlgamer_goalieStats gs
  JOIN nhlgamer_players p
    ON gs.playerID = p.playerID
  WHERE gs.leagueID IN (507,508,509,510,511)
    AND gs.gameType = 'regular'
    AND p.country = 'SE'
  GROUP BY gs.playerID, gs.leagueID, playerName
  HAVING SUM(gs.gamesPlayed) > 0
),

regular_goalies_fallback_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      gs.playerID,
      gs.leagueID,
      gs.teamID,
      SUM(gs.gamesPlayed) AS gp,
      ROW_NUMBER() OVER (
        PARTITION BY gs.playerID, gs.leagueID
        ORDER BY SUM(gs.gamesPlayed) DESC, gs.teamID DESC
      ) AS rn
    FROM nhlgamer_goalieStats gs
    JOIN nhlgamer_players p
      ON gs.playerID = p.playerID
    WHERE gs.leagueID IN (507,508,509,510,511)
      AND gs.gameType = 'regular'
      AND p.country = 'SE'
    GROUP BY gs.playerID, gs.leagueID, gs.teamID
  ) x
  WHERE x.rn = 1
),

regular_goalies_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    rgs.playerID,
    rgs.playerName,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    COALESCE(lcit.teamID, rgft.teamID) AS teamID,
    rgs.leagueID,
    rgs.gp,
    rgs.wins,
    rgs.saves,
    rgs.gaa,
    rgs.svp,
    rgs.shutouts,
    COALESCE(rtg.teamMatches, 0) AS teamMatches,
    CAST(ROUND(
      rgs.gp * 100.0 / NULLIF(COALESCE(rtg.teamMatches, 0), 0),
      2
    ) AS DECIMAL(6,2)) AS matchSharePct
  FROM regular_goalies_stats rgs
  LEFT JOIN latest_current_invite_team lcit
    ON lcit.playerID = rgs.playerID
   AND lcit.leagueID = rgs.leagueID
  LEFT JOIN regular_goalies_fallback_team rgft
    ON rgft.playerID = rgs.playerID
   AND rgft.leagueID = rgs.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = COALESCE(lcit.teamID, rgft.teamID)
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  JOIN league_map lm
    ON lm.leagueID = rgs.leagueID
  LEFT JOIN regular_team_games rtg
    ON rtg.leagueID = rgs.leagueID
   AND rtg.teamID = COALESCE(lcit.teamID, rgft.teamID)
  WHERE rgs.gp > 0
),

regular_goalies_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', playerName,
        'gp', gp,
        'teamMatches', teamMatches,
        'matchSharePct', matchSharePct,
        'w', wins,
        'sv', saves,
        'gaa', gaa,
        'svp', svp,
        'so', shutouts,
        'team', teamName,
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        ),
        'teamLogo', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM regular_goalies_base
    ORDER BY sortOrder, division, svp DESC, gp DESC, playerName ASC
  ) q
  GROUP BY division
),

/* =========================
   PLAYOFF TEAM MATCHES
========================= */
playoff_team_games AS (
  SELECT
    p.leagueID,
    p.teamID,
    COUNT(DISTINCT p.matchID) AS teamMatches
  FROM nhlgamer_participants p
  JOIN nhlgamer_matches m
    ON m.matchID = p.matchID
  WHERE p.leagueID IN (507,508,509,510,511)
    AND (m.matchType <> 'regular' OR m.matchType IS NULL)
  GROUP BY p.leagueID, p.teamID
),

/* =========================
   PLAYOFF SKATERS
========================= */
playoff_skaters_stats AS (
  SELECT
    p.playerID,
    ps.leagueID,
    CASE
      WHEN p.psntag IS NOT NULL AND p.psntag <> '' THEN p.psntag
      ELSE p.gamertag
    END AS playerName,
    SUM(ps.gamesPlayed) AS gp,
    SUM(ps.goals) AS goals,
    SUM(ps.assists) AS assists,
    SUM(ps.points) AS points,
    ROUND(
      SUM(ps.points) * 1.0 / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS ppg,
    SUM(ps.penaltyMinutes) AS pim,
    ROUND(
      (SUM(ps.takeaways) + SUM(ps.interceptions) + SUM(ps.blockedShots)) * 1.0
      / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS dim
  FROM nhlgamer_playerStats ps
  JOIN nhlgamer_players p
    ON ps.playerID = p.playerID
  WHERE ps.leagueID IN (507,508,509,510,511)
    AND (ps.gameType <> 'regular' OR ps.gameType IS NULL)
    AND p.country = 'SE'
  GROUP BY p.playerID, ps.leagueID, playerName
),

playoff_skaters_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      ps.playerID,
      ps.leagueID,
      ps.teamID,
      SUM(ps.gamesPlayed) AS gp
    FROM nhlgamer_playerStats ps
    JOIN nhlgamer_players p
      ON ps.playerID = p.playerID
    WHERE ps.leagueID IN (507,508,509,510,511)
      AND (ps.gameType <> 'regular' OR ps.gameType IS NULL)
      AND p.country = 'SE'
    GROUP BY ps.playerID, ps.leagueID, ps.teamID
  ) x
  JOIN (
    SELECT
      playerID,
      leagueID,
      MAX(gp) AS maxGp
    FROM (
      SELECT
        ps.playerID,
        ps.leagueID,
        ps.teamID,
        SUM(ps.gamesPlayed) AS gp
      FROM nhlgamer_playerStats ps
      JOIN nhlgamer_players p
        ON ps.playerID = p.playerID
      WHERE ps.leagueID IN (507,508,509,510,511)
        AND (ps.gameType <> 'regular' OR ps.gameType IS NULL)
        AND p.country = 'SE'
      GROUP BY ps.playerID, ps.leagueID, ps.teamID
    ) y
    GROUP BY playerID, leagueID
  ) m
    ON m.playerID = x.playerID
   AND m.leagueID = x.leagueID
   AND m.maxGp = x.gp
),

playoff_skaters_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    rs.playerName,
    COALESCE(lcit.teamID, rst.teamID) AS teamID,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    rs.gp,
    COALESCE(ptg.teamMatches, 0) AS teamMatches,
    CAST(ROUND(
      rs.gp * 100.0 / NULLIF(COALESCE(ptg.teamMatches, 0), 0),
      2
    ) AS DECIMAL(6,2)) AS matchSharePct,
    rs.goals,
    rs.assists,
    rs.points,
    rs.ppg,
    rs.pim,
    rs.dim
  FROM playoff_skaters_stats rs
  JOIN playoff_skaters_team rst
    ON rst.playerID = rs.playerID
   AND rst.leagueID = rs.leagueID
  LEFT JOIN latest_current_invite_team lcit
    ON lcit.playerID = rs.playerID
   AND lcit.leagueID = rs.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = COALESCE(lcit.teamID, rst.teamID)
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  JOIN league_map lm
    ON lm.leagueID = rs.leagueID
  LEFT JOIN playoff_team_games ptg
    ON ptg.leagueID = rs.leagueID
   AND ptg.teamID = COALESCE(lcit.teamID, rst.teamID)
  WHERE rs.gp > 0
),

playoff_skaters_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', playerName,
        'gp', gp,
        'teamMatches', teamMatches,
        'matchSharePct', matchSharePct,
        'g', goals,
        'a', assists,
        'p', points,
        'ppg', ppg,
        'pen', pim,
        'dim', dim,
        'team', teamName,
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        ),
        'teamLogo', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM playoff_skaters_base
    ORDER BY sortOrder, division, points DESC, goals DESC, gp DESC, playerName ASC
  ) q
  GROUP BY division
),

/* =========================
   PLAYOFF DEFENDERS
========================= */
playoff_defenders_stats AS (
  SELECT
    p.playerID,
    ps.leagueID,
    CASE
      WHEN p.psntag IS NOT NULL AND p.psntag <> '' THEN p.psntag
      ELSE p.gamertag
    END AS playerName,
    SUM(ps.gamesPlayed) AS gp,
    SUM(ps.goals) AS goals,
    SUM(ps.assists) AS assists,
    SUM(ps.points) AS points,
    ROUND(
      SUM(ps.points) * 1.0 / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS ppg,
    SUM(ps.penaltyMinutes) AS pim,
    ROUND(
      (SUM(ps.takeaways) + SUM(ps.interceptions) + SUM(ps.blockedShots)) * 1.0
      / NULLIF(SUM(ps.gamesPlayed), 0),
      2
    ) AS dim
  FROM nhlgamer_playerStats ps
  JOIN nhlgamer_players p
    ON ps.playerID = p.playerID
  WHERE ps.leagueID IN (507,508,509,510,511)
    AND (ps.gameType <> 'regular' OR ps.gameType IS NULL)
    AND ps.positionID IN (4,5)
    AND p.country = 'SE'
  GROUP BY p.playerID, ps.leagueID, playerName
),

playoff_defenders_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      ps.playerID,
      ps.leagueID,
      ps.teamID,
      SUM(ps.gamesPlayed) AS gp
    FROM nhlgamer_playerStats ps
    JOIN nhlgamer_players p
      ON ps.playerID = p.playerID
    WHERE ps.leagueID IN (507,508,509,510,511)
      AND (ps.gameType <> 'regular' OR ps.gameType IS NULL)
      AND ps.positionID IN (4,5)
      AND p.country = 'SE'
    GROUP BY ps.playerID, ps.leagueID, ps.teamID
  ) x
  JOIN (
    SELECT
      playerID,
      leagueID,
      MAX(gp) AS maxGp
    FROM (
      SELECT
        ps.playerID,
        ps.leagueID,
        ps.teamID,
        SUM(ps.gamesPlayed) AS gp
      FROM nhlgamer_playerStats ps
      JOIN nhlgamer_players p
        ON ps.playerID = p.playerID
      WHERE ps.leagueID IN (507,508,509,510,511)
        AND (ps.gameType <> 'regular' OR ps.gameType IS NULL)
        AND ps.positionID IN (4,5)
        AND p.country = 'SE'
      GROUP BY ps.playerID, ps.leagueID, ps.teamID
    ) y
    GROUP BY playerID, leagueID
  ) m
    ON m.playerID = x.playerID
   AND m.leagueID = x.leagueID
   AND m.maxGp = x.gp
),

playoff_defenders_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    rs.playerName,
    COALESCE(lcit.teamID, rst.teamID) AS teamID,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    rs.gp,
    COALESCE(ptg.teamMatches, 0) AS teamMatches,
    CAST(ROUND(
      rs.gp * 100.0 / NULLIF(COALESCE(ptg.teamMatches, 0), 0),
      2
    ) AS DECIMAL(6,2)) AS matchSharePct,
    rs.goals,
    rs.assists,
    rs.points,
    rs.ppg,
    rs.pim,
    rs.dim
  FROM playoff_defenders_stats rs
  JOIN playoff_defenders_team rst
    ON rst.playerID = rs.playerID
   AND rst.leagueID = rs.leagueID
  LEFT JOIN latest_current_invite_team lcit
    ON lcit.playerID = rs.playerID
   AND lcit.leagueID = rs.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = COALESCE(lcit.teamID, rst.teamID)
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  JOIN league_map lm
    ON lm.leagueID = rs.leagueID
  LEFT JOIN playoff_team_games ptg
    ON ptg.leagueID = rs.leagueID
   AND ptg.teamID = COALESCE(lcit.teamID, rst.teamID)
  WHERE rs.gp > 0
),

playoff_defenders_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', playerName,
        'gp', gp,
        'teamMatches', teamMatches,
        'matchSharePct', matchSharePct,
        'g', goals,
        'a', assists,
        'p', points,
        'ppg', ppg,
        'pen', pim,
        'dim', dim,
        'team', teamName,
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        ),
        'teamLogo', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM playoff_defenders_base
    ORDER BY sortOrder, division, points DESC, goals DESC, gp DESC, playerName ASC
  ) q
  GROUP BY division
),

/* =========================
   PLAYOFF GOALIES
========================= */
playoff_goalies_stats AS (
  SELECT
    gs.playerID,
    gs.leagueID,
    CASE
      WHEN p.psntag IS NOT NULL AND p.psntag <> '' THEN p.psntag
      ELSE p.gamertag
    END AS playerName,
    SUM(gs.gamesPlayed) AS gp,
    SUM(gs.wins) AS wins,
    SUM(gs.saves) AS saves,
    ROUND(
      SUM(gs.goalsAllowed) * 1.0 / NULLIF(SUM(gs.gamesPlayed), 0),
      2
    ) AS gaa,
    CAST(ROUND(
      SUM(gs.saves) * 100.0 / NULLIF(SUM(gs.saves) + SUM(gs.goalsAllowed), 0),
      2
    ) AS DECIMAL(5,2)) AS svp,
    SUM(gs.shutouts) AS shutouts
  FROM nhlgamer_goalieStats gs
  JOIN nhlgamer_players p
    ON gs.playerID = p.playerID
  WHERE gs.leagueID IN (507,508,509,510,511)
    AND (gs.gameType <> 'regular' OR gs.gameType IS NULL)
    AND p.country = 'SE'
  GROUP BY gs.playerID, gs.leagueID, playerName
  HAVING SUM(gs.gamesPlayed) > 0
),

playoff_goalies_fallback_team AS (
  SELECT
    x.playerID,
    x.leagueID,
    x.teamID
  FROM (
    SELECT
      gs.playerID,
      gs.leagueID,
      gs.teamID,
      SUM(gs.gamesPlayed) AS gp,
      ROW_NUMBER() OVER (
        PARTITION BY gs.playerID, gs.leagueID
        ORDER BY SUM(gs.gamesPlayed) DESC, gs.teamID DESC
      ) AS rn
    FROM nhlgamer_goalieStats gs
    JOIN nhlgamer_players p
      ON gs.playerID = p.playerID
    WHERE gs.leagueID IN (507,508,509,510,511)
      AND (gs.gameType <> 'regular' OR gs.gameType IS NULL)
      AND p.country = 'SE'
    GROUP BY gs.playerID, gs.leagueID, gs.teamID
  ) x
  WHERE x.rn = 1
),

playoff_goalies_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    pgs.playerID,
    pgs.playerName,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    COALESCE(lcit.teamID, pgft.teamID) AS teamID,
    pgs.leagueID,
    pgs.gp,
    pgs.wins,
    pgs.saves,
    pgs.gaa,
    pgs.svp,
    pgs.shutouts,
    COALESCE(ptg.teamMatches, 0) AS teamMatches,
    CAST(ROUND(
      pgs.gp * 100.0 / NULLIF(COALESCE(ptg.teamMatches, 0), 0),
      2
    ) AS DECIMAL(6,2)) AS matchSharePct
  FROM playoff_goalies_stats pgs
  LEFT JOIN latest_current_invite_team lcit
    ON lcit.playerID = pgs.playerID
   AND lcit.leagueID = pgs.leagueID
  LEFT JOIN playoff_goalies_fallback_team pgft
    ON pgft.playerID = pgs.playerID
   AND pgft.leagueID = pgs.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = COALESCE(lcit.teamID, pgft.teamID)
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  JOIN league_map lm
    ON lm.leagueID = pgs.leagueID
  LEFT JOIN playoff_team_games ptg
    ON ptg.leagueID = pgs.leagueID
   AND ptg.teamID = COALESCE(lcit.teamID, pgft.teamID)
  WHERE pgs.gp > 0
),

playoff_goalies_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', playerName,
        'gp', gp,
        'teamMatches', teamMatches,
        'matchSharePct', matchSharePct,
        'w', wins,
        'sv', saves,
        'gaa', gaa,
        'svp', svp,
        'so', shutouts,
        'team', teamName,
        'playerImage', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(playerName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        ),
        'teamLogo', CONCAT(
          LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
            '-+',
            '-'
          ))),
          '.png'
        )
      )
    ) AS players
  FROM (
    SELECT *
    FROM playoff_goalies_base
    ORDER BY sortOrder, division, svp DESC, gp DESC, playerName ASC
  ) q
  GROUP BY division
),
/* =========================================================
   OVERGANGAR CHAIN FIX
   Builds transfers from accepted invites in chronological order,
   so one player can produce multiple rows:
   VBO -> Invasion
   Invasion -> Prima
   ========================================================= */

transfer_league_meta AS (
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
),

current_league_teams AS (
  SELECT
    lt.leagueID,
    lt.teamID,
    t.teamName,
    lt.registeredForLeague AS registrationDate,
    CASE CAST(JSON_UNQUOTE(JSON_EXTRACT(lt.additional_info, '$.division')) AS UNSIGNED)
      WHEN 507 THEN 'ELITE'
      WHEN 508 THEN 'PRO'
      WHEN 509 THEN 'LITE'
      WHEN 510 THEN 'CORE'
      WHEN 511 THEN 'NEO'
      ELSE 'UNKNOWN'
    END AS divisionName,
    lt.teamCaptainID,
    lt.teamAssistantCaptainID,
    lt.teamAssistantCaptainID2
  FROM nhlgamer_leagueTeams lt
  JOIN nhlgamer_teams t
    ON t.teamID = lt.teamID
  WHERE lt.leagueID IN (502,503,504,505,506,507,508,509,510,511)
),

current_captain_players AS (
  SELECT DISTINCT
    clt.leagueID,
    clt.teamID,
    clt.teamName,
    clt.registrationDate,
    p.playerID,
    p.userID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS playerName,
    CAST(clt.divisionName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS divisionName,
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

accepted_invite_chain AS (
  SELECT
    ai.playerID,
    ai.teamID AS ToTeamID,
    ai.leagueID AS ToLeagueID,
    ai.teamName AS `To`,
    ai.inviteDate AS `Date`,
    LAG(ai.teamID) OVER (
      PARTITION BY ai.playerID
      ORDER BY ai.inviteDate, ai.leagueID, ai.teamID
    ) AS FromTeamID,
    LAG(ai.leagueID) OVER (
      PARTITION BY ai.playerID
      ORDER BY ai.inviteDate, ai.leagueID, ai.teamID
    ) AS FromLeagueID,
    LAG(ai.teamName) OVER (
      PARTITION BY ai.playerID
      ORDER BY ai.inviteDate, ai.leagueID, ai.teamID
    ) AS `From`
  FROM all_accepted_invites ai
),

transfer_chain_raw AS (
  SELECT
    p.playerID,
    p.userID,
    CAST(COALESCE(p.psntag, p.gamertag) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(COALESCE(NULLIF(p.nationality, ''), p.country, '') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,
    CAST(c.`From` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `From`,
    c.FromTeamID,
    c.FromLeagueID,
    CAST(c.`To` AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,
    c.ToTeamID,
    c.ToLeagueID,
    DATE(c.`Date`) AS `Date`,
    CAST('' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    1 AS Priority
  FROM accepted_invite_chain c
  JOIN nhlgamer_players p
    ON p.playerID = c.playerID
  WHERE c.ToLeagueID IN (502,503,504,505,506,507,508,509,510,511)
    AND c.FromTeamID IS NOT NULL
    AND (
      COALESCE(c.FromTeamID, 0) <> COALESCE(c.ToTeamID, 0)
      OR COALESCE(c.FromLeagueID, 0) <> COALESCE(c.ToLeagueID, 0)
    )
),

transfer_captain_players_current AS (
  SELECT DISTINCT
    cp.playerID,
    cp.userID,
    CAST(cp.playerName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Player,
    CAST(COALESCE(NULLIF(p.nationality, ''), p.country, '') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nationality,
    CAST('Free Agent' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `From`,
    NULL AS FromTeamID,
    NULL AS FromLeagueID,
    CAST(cp.teamName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS `To`,
    cp.teamID AS ToTeamID,
    cp.leagueID AS ToLeagueID,
    DATE(cp.registrationDate) AS `Date`,
    CAST(cp.roleName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS Role,
    2 AS Priority
  FROM current_captain_players cp
  JOIN nhlgamer_players p
    ON p.playerID = cp.playerID
  LEFT JOIN all_accepted_invites ai
    ON ai.playerID = cp.playerID
   AND ai.teamID = cp.teamID
   AND ai.leagueID = cp.leagueID
  WHERE ai.playerID IS NULL
),

transfer_combined AS (
  SELECT
    playerID,
    userID,
    Player,
    nationality,
    `From`,
    FromTeamID,
    FromLeagueID,
    `To`,
    ToTeamID,
    ToLeagueID,
    `Date`,
    Role,
    Priority
  FROM transfer_chain_raw

  UNION ALL

  SELECT
    playerID,
    userID,
    Player,
    nationality,
    `From`,
    FromTeamID,
    FromLeagueID,
    `To`,
    ToTeamID,
    ToLeagueID,
    `Date`,
    Role,
    Priority
  FROM transfer_captain_players_current
),

transfer_deduped AS (
  SELECT
    c.*,
    ROW_NUMBER() OVER (
      PARTITION BY
        c.playerID,
        COALESCE(c.FromTeamID, -1),
        COALESCE(c.FromLeagueID, -1),
        c.ToTeamID,
        c.ToLeagueID
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
    CAST(COALESCE(clt_to.divisionName, 'Unknown') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS ToDiv
  FROM transfer_deduped d
  LEFT JOIN transfer_league_meta lm_from
    ON lm_from.leagueID = d.FromLeagueID
  LEFT JOIN current_league_teams clt_to
    ON clt_to.teamID = d.ToTeamID
   AND clt_to.leagueID = d.ToLeagueID
  WHERE d.transfer_rn = 1
    AND COALESCE(d.FromTeamID, 0) <> COALESCE(d.ToTeamID, 0)
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

overgangar_json AS (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'Player', q.Player,
      'playerID', q.playerID,
      'userID', q.userID,
      'nationality', q.nationality,
      'From', q.`From`,
      'FromDiv', LOWER(q.FromDiv),
      'FromTeamID', q.FromTeamID,
      'FromLeagueID', q.FromLeagueID,
      'To', q.`To`,
      'ToDiv', LOWER(q.ToDiv),
      'ToTeamID', q.ToTeamID,
      'ToLeagueID', q.ToLeagueID,
      'GroupGames26Winter', q.GroupGames26Winter,
      'PlayoffGames26Winter', q.PlayoffGames26Winter,
      'TotalGames26Winter', q.TotalGames26Winter,
      'Date', q.`Date`,
      'Role', q.Role,
      'playerImage', CONCAT(
        LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
          REGEXP_REPLACE(CONVERT(q.Player USING ascii), '[^a-zA-Z0-9]+', '-'),
          '-+',
          '-'
        ))),
        '.png'
      ),
      'fromTeamLogo', CONCAT(
        LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
          REGEXP_REPLACE(CONVERT(q.`From` USING ascii), '[^a-zA-Z0-9]+', '-'),
          '-+',
          '-'
        ))),
        '.png'
      ),
      'toTeamLogo', CONCAT(
        LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
          REGEXP_REPLACE(CONVERT(q.`To` USING ascii), '[^a-zA-Z0-9]+', '-'),
          '-+',
          '-'
        ))),
        '.png'
      )
    )
  ) AS players
  FROM (
    SELECT *
    FROM overgangar_final
    ORDER BY `Date` DESC, Player, ToLeagueID, ToTeamID
  ) q
),

/* =========================
   SVENSKA LAG / GRUPPTABELL
   - Gruppplacering räknas endast på regular-matcher.
   - Slutspelsmatcher räknas separat och påverkar inte tabellplacering.
========================= */
regular_team_match_rows AS (
  SELECT
    m.leagueID,
    ltH.groupID,
    m.homeTeamID AS teamID,
    m.goalsHome AS gf,
    m.goalsAway AS ga,
    m.overtime,
    m.matchDate,
    m.matchID
  FROM nhlgamer_matches m
  JOIN nhlgamer_leagueTeams ltH
    ON ltH.leagueID = m.leagueID
   AND ltH.teamID = m.homeTeamID
  JOIN nhlgamer_leagueTeams ltA
    ON ltA.leagueID = m.leagueID
   AND ltA.teamID = m.awayTeamID
  WHERE m.leagueID IN (507,508,509,510,511)
    AND m.matchType = 'regular'
    AND ltH.groupID = ltA.groupID
    AND m.goalsHome IS NOT NULL
    AND m.goalsAway IS NOT NULL

  UNION ALL

  SELECT
    m.leagueID,
    ltA.groupID,
    m.awayTeamID AS teamID,
    m.goalsAway AS gf,
    m.goalsHome AS ga,
    m.overtime,
    m.matchDate,
    m.matchID
  FROM nhlgamer_matches m
  JOIN nhlgamer_leagueTeams ltH
    ON ltH.leagueID = m.leagueID
   AND ltH.teamID = m.homeTeamID
  JOIN nhlgamer_leagueTeams ltA
    ON ltA.leagueID = m.leagueID
   AND ltA.teamID = m.awayTeamID
  WHERE m.leagueID IN (507,508,509,510,511)
    AND m.matchType = 'regular'
    AND ltH.groupID = ltA.groupID
    AND m.goalsHome IS NOT NULL
    AND m.goalsAway IS NOT NULL
),

regular_team_standings_raw AS (
  SELECT
    lt.leagueID,
    lt.teamID,
    lt.groupID,
    lt.country,
    COALESCE(tnm.new_name, t.teamName) AS teamName,
    lm.division,
    lm.sortOrder,
    COUNT(r.matchID) AS gamesPlayed,
    SUM(CASE WHEN r.gf > r.ga AND COALESCE(r.overtime,0) = 0 THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN r.gf > r.ga AND COALESCE(r.overtime,0) = 1 THEN 1 ELSE 0 END) AS overtimeWins,
    SUM(CASE WHEN r.gf < r.ga AND COALESCE(r.overtime,0) = 1 THEN 1 ELSE 0 END) AS otLosses,
    SUM(CASE WHEN r.gf < r.ga AND COALESCE(r.overtime,0) = 0 THEN 1 ELSE 0 END) AS losses,
    COALESCE(SUM(r.gf), 0) AS goalsFor,
    COALESCE(SUM(r.ga), 0) AS goalsAgainst,
    COALESCE(SUM(r.gf), 0) - COALESCE(SUM(r.ga), 0) AS goalDiff,
    SUM(
      CASE
        WHEN r.gf > r.ga AND COALESCE(r.overtime,0) = 0 THEN 3
        WHEN r.gf > r.ga AND COALESCE(r.overtime,0) = 1 THEN 2
        WHEN r.gf < r.ga AND COALESCE(r.overtime,0) = 1 THEN 1
        ELSE 0
      END
    ) AS tablePoints
  FROM nhlgamer_leagueTeams lt
  JOIN league_map lm
    ON lm.leagueID = lt.leagueID
  JOIN nhlgamer_teams t
    ON t.teamID = lt.teamID
  LEFT JOIN team_name_map tnm
    ON tnm.old_name = t.teamName
  LEFT JOIN regular_team_match_rows r
    ON r.leagueID = lt.leagueID
   AND r.teamID = lt.teamID
   AND r.groupID = lt.groupID
  WHERE lt.leagueID IN (507,508,509,510,511)
  GROUP BY
    lt.leagueID,
    lt.teamID,
    lt.groupID,
    lt.country,
    COALESCE(tnm.new_name, t.teamName),
    lm.division,
    lm.sortOrder
),

regular_team_standings AS (
  SELECT
    s.*,
    ROW_NUMBER() OVER (
      PARTITION BY s.leagueID, s.groupID
      ORDER BY
        s.tablePoints DESC,
        (s.wins + s.overtimeWins) DESC,
        s.goalDiff DESC,
        s.goalsFor DESC,
        s.teamName ASC
    ) AS tablePosition
  FROM regular_team_standings_raw s
),


playoff_series_map AS (
  SELECT
    leagueID,
    LEAST(homeTeamID, awayTeamID) AS teamA,
    GREATEST(homeTeamID, awayTeamID) AS teamB,
    playoffStage,
    CASE
      WHEN playoffStage = 0 THEN 'Bronsmatch'
      WHEN playoffStage = 1 THEN 'Final'
      WHEN playoffStage = 2 THEN 'Semifinal'
      WHEN playoffStage = 3 THEN 'Kvartsfinal'
      WHEN playoffStage = 4 THEN 'Åttondelsfinal'
      WHEN playoffStage = 5 THEN 'Runda 1'
      ELSE CONCAT('Playoff stage ', playoffStage)
    END AS playoffRound
  FROM nhlgamer_playoffs
),
playoff_team_match_rows AS (
  SELECT
    m.leagueID,
    m.homeTeamID AS teamID,
    m.goalsHome AS gf,
    m.goalsAway AS ga,
    m.matchID,
    COALESCE(
      psm.playoffRound,
      CASE
        WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-23' THEN 'Final'
        WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-14' THEN 'Semifinal'
        WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-09' THEN 'Kvartsfinal'
        WHEN m.leagueID = 510 AND m.matchDate >= '2026-06-02' THEN 'Åttondelsfinal'
        WHEN m.leagueID IN (509,511) AND m.matchDate >= '2026-05-31' THEN 'Åttondelsfinal'
        WHEN m.matchDate >= '2026-06-15' THEN 'Final'
        WHEN m.matchDate >= '2026-06-08' THEN 'Semifinal'
        WHEN m.matchDate >= '2026-06-01' THEN 'Kvartsfinal'
        ELSE 'Runda 1'
      END
    ) AS playoffRound,
    m.matchDate AS playoffRoundDate
  FROM nhlgamer_matches m
  LEFT JOIN playoff_series_map psm
    ON psm.leagueID = m.leagueID
   AND psm.teamA = LEAST(m.homeTeamID, m.awayTeamID)
   AND psm.teamB = GREATEST(m.homeTeamID, m.awayTeamID)
  WHERE m.leagueID IN (507,508,509,510,511)
    AND (m.matchType <> 'regular' OR m.matchType IS NULL)
    AND NOT (m.leagueID = 510 AND m.matchDate < '2026-06-02')
    AND m.goalsHome IS NOT NULL
    AND m.goalsAway IS NOT NULL

  UNION ALL

  SELECT
    m.leagueID,
    m.awayTeamID AS teamID,
    m.goalsAway AS gf,
    m.goalsHome AS ga,
    m.matchID,
    COALESCE(
      psm.playoffRound,
      CASE
        WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-23' THEN 'Final'
        WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-14' THEN 'Semifinal'
        WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-09' THEN 'Kvartsfinal'
        WHEN m.leagueID = 510 AND m.matchDate >= '2026-06-02' THEN 'Åttondelsfinal'
        WHEN m.leagueID IN (509,511) AND m.matchDate >= '2026-05-31' THEN 'Åttondelsfinal'
        WHEN m.matchDate >= '2026-06-15' THEN 'Final'
        WHEN m.matchDate >= '2026-06-08' THEN 'Semifinal'
        WHEN m.matchDate >= '2026-06-01' THEN 'Kvartsfinal'
        ELSE 'Runda 1'
      END
    ) AS playoffRound,
    m.matchDate AS playoffRoundDate
  FROM nhlgamer_matches m
  LEFT JOIN playoff_series_map psm
    ON psm.leagueID = m.leagueID
   AND psm.teamA = LEAST(m.homeTeamID, m.awayTeamID)
   AND psm.teamB = GREATEST(m.homeTeamID, m.awayTeamID)
  WHERE m.leagueID IN (507,508,509,510,511)
    AND (m.matchType <> 'regular' OR m.matchType IS NULL)
    AND NOT (m.leagueID = 510 AND m.matchDate < '2026-06-02')
    AND m.goalsHome IS NOT NULL
    AND m.goalsAway IS NOT NULL
),

playoff_team_standings AS (
  SELECT
    leagueID,
    teamID,
    playoffRound,
    MAX(playoffRoundDate) AS latestRoundDate,
    COUNT(matchID) AS playoffMatches,
    SUM(CASE WHEN gf > ga THEN 1 ELSE 0 END) AS playoffWins,
    SUM(CASE WHEN gf < ga THEN 1 ELSE 0 END) AS playoffLosses,
    COALESCE(SUM(gf), 0) AS playoffGoalsFor,
    COALESCE(SUM(ga), 0) AS playoffGoalsAgainst
  FROM playoff_team_match_rows
  GROUP BY leagueID, teamID, playoffRound
),

playoff_team_current AS (
  SELECT
    leagueID,
    teamID,
    playoffRound,
    playoffMatches,
    playoffWins,
    playoffLosses,
    playoffGoalsFor,
    playoffGoalsAgainst
  FROM (
    SELECT
      p.*,
      ROW_NUMBER() OVER (
        PARTITION BY p.leagueID, p.teamID
        ORDER BY p.latestRoundDate DESC
      ) AS rn
    FROM playoff_team_standings p
  ) x
  WHERE rn = 1
),

teams_base AS (
  SELECT
    s.*,
    COALESCE(p.playoffMatches, 0) AS playoffMatches,
    COALESCE(p.playoffWins, 0) AS playoffWins,
    COALESCE(p.playoffLosses, 0) AS playoffLosses,
    COALESCE(p.playoffGoalsFor, 0) AS playoffGoalsFor,
    COALESCE(p.playoffGoalsAgainst, 0) AS playoffGoalsAgainst,
    CASE WHEN s.division = 'neo' THEN 5 ELSE 7 END AS playoffBestOf,
    CASE WHEN s.division = 'neo' THEN 3 ELSE 4 END AS playoffWinsNeeded,
    COALESCE(p.playoffRound, '') AS playoffRound,
    CASE
      WHEN COALESCE(p.playoffWins, 0) >= CASE WHEN s.division = 'neo' THEN 3 ELSE 4 END THEN
        CASE
          WHEN p.playoffRound = 'Runda 1' THEN 'Kvartsfinal'
          WHEN p.playoffRound = 'Kvartsfinal' THEN 'Semifinal'
          WHEN p.playoffRound = 'Semifinal' THEN 'Final'
          ELSE ''
        END
      ELSE ''
    END AS nextPlayoffRound,
    CASE
      WHEN COALESCE(p.playoffWins, 0) >= CASE WHEN s.division = 'neo' THEN 3 ELSE 4 END
        THEN CONCAT('Vann ', LOWER(COALESCE(p.playoffRound, 'slutspel')), ' ', COALESCE(p.playoffWins,0), '-', COALESCE(p.playoffLosses,0))
      WHEN COALESCE(p.playoffLosses, 0) >= CASE WHEN s.division = 'neo' THEN 3 ELSE 4 END
        THEN CONCAT('Utslagen i ', LOWER(COALESCE(p.playoffRound, 'slutspel')), ' ', COALESCE(p.playoffWins,0), '-', COALESCE(p.playoffLosses,0))
      WHEN COALESCE(p.playoffMatches, 0) > 0 THEN CONCAT('Spelar ', LOWER(COALESCE(p.playoffRound, 'slutspel')), ' ', COALESCE(p.playoffWins,0), '-', COALESCE(p.playoffLosses,0))
      WHEN s.division = 'elite' AND s.tablePosition <= 8 THEN 'Ja'
      WHEN s.division = 'elite' AND s.tablePosition <= 12 THEN 'Nej'
      WHEN s.division = 'elite' AND s.tablePosition <= 15 THEN 'Kval'
      WHEN s.division = 'elite' THEN 'Nedflyttning'
      WHEN s.division = 'pro' AND s.tablePosition <= 8 THEN 'Ja'
      WHEN s.division = 'pro' AND s.tablePosition <= 11 THEN 'Nej'
      WHEN s.division = 'pro' AND s.tablePosition <= 14 THEN 'Kval'
      WHEN s.division = 'pro' THEN 'Nedflyttning'
      WHEN s.division IN ('lite','core') AND s.tablePosition <= 10 THEN 'Ja'
      WHEN s.division IN ('lite','core') AND s.tablePosition = 11 THEN 'Möjlig'
      WHEN s.division IN ('lite','core') THEN 'Nej'
      WHEN s.division = 'neo' AND s.tablePosition <= 2 THEN 'Runda 2'
      WHEN s.division = 'neo' AND s.tablePosition <= 6 THEN 'Ja'
      WHEN s.division = 'neo' THEN 'Nej'
      ELSE ''
    END AS playoffStatus
  FROM regular_team_standings s
  LEFT JOIN playoff_team_current p
    ON p.leagueID = s.leagueID
   AND p.teamID = s.teamID
),

teams_json AS (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'name', teamName,
      'teamID', teamID,
      'leagueID', leagueID,
      'url', CONCAT('https://sportsgamer.gg/leagues/', leagueID, '/teams/', teamID),
      'logo', CONCAT(
        LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
          REGEXP_REPLACE(CONVERT(teamName USING ascii), '[^a-zA-Z0-9]+', '-'),
          '-+',
          '-'
        ))),
        '.png'
      ),
      'division', division,
      'group', CONCAT('Grupp ', groupID + 1),
      'tablePosition', tablePosition,
      'tablePoints', tablePoints,
      'gamesPlayed', gamesPlayed,
      'wins', wins,
      'overtimeWins', overtimeWins,
      'otLosses', otLosses,
      'losses', losses,
      'goalsFor', goalsFor,
      'goalsAgainst', goalsAgainst,
      'goalDiff', goalDiff,
      'playoffMatches', playoffMatches,
      'playoffWins', playoffWins,
      'playoffLosses', playoffLosses,
      'playoffGoalsFor', playoffGoalsFor,
      'playoffGoalsAgainst', playoffGoalsAgainst,
      'playoffBestOf', playoffBestOf,
      'playoffWinsNeeded', playoffWinsNeeded,
      'playoffRound', playoffRound,
      'nextPlayoffRound', nextPlayoffRound,
      'playoffStatus', playoffStatus
    )
  ) AS teams
  FROM (
    SELECT *
    FROM teams_base
    WHERE country = 'SE'
    ORDER BY sortOrder, groupID, tablePosition, teamName
  ) q
),

/* =========================
   SVENSKA MATCHER
========================= */
svenska_matcher_base AS (
  SELECT
    lm.division,
    lm.sortOrder,
    m.leagueID,
    m.matchID,
    m.matchDate,
    m.matchTime,
    CASE
      WHEN m.matchType = 'regular' THEN 'gruppspel'
      ELSE COALESCE(
        psm.playoffRound,
        CASE
          WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-23' THEN 'Final'
          WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-14' THEN 'Semifinal'
          WHEN m.leagueID IN (509,510,511) AND m.matchDate >= '2026-06-09' THEN 'Kvartsfinal'
          WHEN m.leagueID = 510 AND m.matchDate >= '2026-06-02' THEN 'Åttondelsfinal'
          WHEN m.leagueID IN (509,511) AND m.matchDate >= '2026-05-31' THEN 'Åttondelsfinal'
          WHEN m.matchDate >= '2026-06-15' THEN 'Final'
          WHEN m.matchDate >= '2026-06-08' THEN 'Semifinal'
          WHEN m.matchDate >= '2026-06-01' THEN 'Kvartsfinal'
          ELSE 'Runda 1'
        END
      )
    END AS stage,
    at.teamName AS awayTeam,
    m.goalsAway AS awayScore,
    CASE WHEN m.overtime = 1 THEN 'OT' ELSE '' END AS ot,
    m.goalsHome AS homeScore,
    ht.teamName AS homeTeam,
    CASE
      WHEN m.matchType = 'regular' THEN
        CASE
          WHEN ltH.groupID = 0 THEN 'Grupp 1'
          WHEN ltH.groupID = 1 THEN 'Grupp 2'
          ELSE CONCAT('Grupp ', ltH.groupID + 1)
        END
      ELSE ''
    END AS grupp,
    CASE
      WHEN ltA.country = 'SE' AND ltH.country = 'SE' THEN 'SWE vs SWE'
      WHEN ltA.country = 'SE' THEN at.teamName
      WHEN ltH.country = 'SE' THEN ht.teamName
      ELSE ''
    END AS svensktLag,
    COALESCE(
      GROUP_CONCAT(
        ev.eventText
        ORDER BY ev.eventTime, ev.sortKey
        SEPARATOR ' | '
      ),
      ''
    ) AS goalsSummary
  FROM nhlgamer_matches m
  JOIN league_map lm
    ON lm.leagueID = m.leagueID
  LEFT JOIN playoff_series_map psm
    ON psm.leagueID = m.leagueID
   AND psm.teamA = LEAST(m.homeTeamID, m.awayTeamID)
   AND psm.teamB = GREATEST(m.homeTeamID, m.awayTeamID)
  JOIN nhlgamer_leagueTeams ltH
    ON ltH.leagueID = m.leagueID
   AND ltH.teamID = m.homeTeamID
  JOIN nhlgamer_leagueTeams ltA
    ON ltA.leagueID = m.leagueID
   AND ltA.teamID = m.awayTeamID
  LEFT JOIN nhlgamer_teams ht
    ON ht.teamID = m.homeTeamID
  LEFT JOIN nhlgamer_teams at
    ON at.teamID = m.awayTeamID
  LEFT JOIN (
    SELECT
      g.matchID AS matchID,
      g.goalTime AS eventTime,
      1 AS sortKey,
      CAST(
        CONCAT(
          CASE
            WHEN HOUR(g.goalTime) = 0 THEN CONCAT(MINUTE(g.goalTime), ':', LPAD(SECOND(g.goalTime), 2, '0'))
            ELSE CONCAT(HOUR(g.goalTime), ':', LPAD(MINUTE(g.goalTime), 2, '0'), ':', LPAD(SECOND(g.goalTime), 2, '0'))
          END,
          ' ',
          st.teamName,
          ' - ',
          COALESCE(gs.psntag, gs.gamertag),
          CASE
            WHEN g.firstAssistPlayerID IS NULL AND g.secondAssistPlayerID IS NULL THEN ''
            ELSE CONCAT(
              ' (',
              TRIM(BOTH ', ' FROM CONCAT(
                COALESCE(COALESCE(a1.psntag, a1.gamertag), ''),
                CASE WHEN g.firstAssistPlayerID IS NOT NULL AND g.secondAssistPlayerID IS NOT NULL THEN ', ' ELSE '' END,
                COALESCE(COALESCE(a2.psntag, a2.gamertag), '')
              )),
              ')'
            )
          END,
          CASE
            WHEN g.powerplay = 1 THEN ' PP'
            WHEN g.shorthanded = 1 THEN ' SH'
            WHEN g.emptyNet = 1 THEN ' EN'
            ELSE ''
          END,
          CASE WHEN g.winningGoal = 1 THEN ' (GWG)' ELSE '' END
        ) AS CHAR CHARACTER SET utf8mb4
      ) COLLATE utf8mb4_unicode_ci AS eventText
    FROM nhlgamer_goals g
    LEFT JOIN nhlgamer_teams st
      ON st.teamID = g.teamID
    LEFT JOIN nhlgamer_players gs
      ON gs.playerID = g.goalPlayerID
    LEFT JOIN nhlgamer_players a1
      ON a1.playerID = g.firstAssistPlayerID
    LEFT JOIN nhlgamer_players a2
      ON a2.playerID = g.secondAssistPlayerID

    UNION ALL

    SELECT
      p.matchID AS matchID,
      p.penaltyTime AS eventTime,
      2 AS sortKey,
      CAST(
        CONCAT(
          CASE
            WHEN HOUR(p.penaltyTime) = 0 THEN CONCAT(MINUTE(p.penaltyTime), ':', LPAD(SECOND(p.penaltyTime), 2, '0'))
            ELSE CONCAT(HOUR(p.penaltyTime), ':', LPAD(MINUTE(p.penaltyTime), 2, '0'), ':', LPAD(SECOND(p.penaltyTime), 2, '0'))
          END,
          ' UTV ',
          pt.teamName,
          ' - ',
          COALESCE(pp.psntag, pp.gamertag),
          ' ',
          COALESCE(pr.penaltyReason, CONCAT('ReasonID: ', p.penaltyReasonID)),
          ' ',
          p.penaltyLength,
          ' min'
        ) AS CHAR CHARACTER SET utf8mb4
      ) COLLATE utf8mb4_unicode_ci AS eventText
    FROM nhlgamer_penalties p
    LEFT JOIN nhlgamer_teams pt
      ON pt.teamID = p.teamID
    LEFT JOIN nhlgamer_players pp
      ON pp.playerID = p.penaltyPlayerID
    LEFT JOIN nhlgamer_penaltyReasons pr
      ON pr.penaltyReasonID = p.penaltyReasonID
  ) ev
    ON ev.matchID = m.matchID
  WHERE m.leagueID IN (507,508,509,510,511)
    AND (
      (m.matchType = 'regular' AND ltH.groupID = ltA.groupID)
      OR ((m.matchType <> 'regular' OR m.matchType IS NULL) AND NOT (m.leagueID = 510 AND m.matchDate < '2026-06-02'))
    )
    AND (
      ltH.country = 'SE'
      OR ltA.country = 'SE'
    )
  GROUP BY
    lm.division,
    lm.sortOrder,
    m.leagueID,
    m.matchID,
    m.matchDate,
    m.matchTime,
    m.matchType,
    psm.playoffRound,
    at.teamName,
    ht.teamName,
    m.goalsAway,
    m.goalsHome,
    m.overtime,
    ltH.groupID,
    ltH.country,
    ltA.country
),

svenska_matcher_json AS (
  SELECT
    division,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'leagueID', leagueID,
        'matchID', matchID,
        'date', DATE_FORMAT(matchDate, '%Y-%m-%d'),
        'time', TIME_FORMAT(matchTime, '%H:%i'),
        'awayTeam', awayTeam,
        'awayScore', awayScore,
        'ot', ot,
        'homeScore', homeScore,
        'homeTeam', homeTeam,
        'stage', stage,
        'group', grupp,
        'svensktLag', svensktLag,
        'goalsSummary', goalsSummary
      )
    ) AS matches
  FROM (
    SELECT *
    FROM svenska_matcher_base
    ORDER BY sortOrder, matchDate, matchTime, matchID
  ) q
  GROUP BY division
)

SELECT JSON_OBJECT(
  'updated', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  'teams', COALESCE((SELECT teams FROM teams_json), JSON_ARRAY()),

  'regular', JSON_OBJECT(
    'skaters', JSON_OBJECT(
      'elite', COALESCE((SELECT players FROM regular_skaters_json WHERE division = 'elite'), JSON_ARRAY()),
      'pro', COALESCE((SELECT players FROM regular_skaters_json WHERE division = 'pro'), JSON_ARRAY()),
      'lite', COALESCE((SELECT players FROM regular_skaters_json WHERE division = 'lite'), JSON_ARRAY()),
      'core', COALESCE((SELECT players FROM regular_skaters_json WHERE division = 'core'), JSON_ARRAY()),
      'neo', COALESCE((SELECT players FROM regular_skaters_json WHERE division = 'neo'), JSON_ARRAY())
    ),
    'defenders', JSON_OBJECT(
      'elite', COALESCE((SELECT players FROM regular_defenders_json WHERE division = 'elite'), JSON_ARRAY()),
      'pro', COALESCE((SELECT players FROM regular_defenders_json WHERE division = 'pro'), JSON_ARRAY()),
      'lite', COALESCE((SELECT players FROM regular_defenders_json WHERE division = 'lite'), JSON_ARRAY()),
      'core', COALESCE((SELECT players FROM regular_defenders_json WHERE division = 'core'), JSON_ARRAY()),
      'neo', COALESCE((SELECT players FROM regular_defenders_json WHERE division = 'neo'), JSON_ARRAY())
    ),
    'goalies', JSON_OBJECT(
      'elite', COALESCE((SELECT players FROM regular_goalies_json WHERE division = 'elite'), JSON_ARRAY()),
      'pro', COALESCE((SELECT players FROM regular_goalies_json WHERE division = 'pro'), JSON_ARRAY()),
      'lite', COALESCE((SELECT players FROM regular_goalies_json WHERE division = 'lite'), JSON_ARRAY()),
      'core', COALESCE((SELECT players FROM regular_goalies_json WHERE division = 'core'), JSON_ARRAY()),
      'neo', COALESCE((SELECT players FROM regular_goalies_json WHERE division = 'neo'), JSON_ARRAY())
    )
  ),

  'playoffs', JSON_OBJECT(
    'skaters', JSON_OBJECT(
      'elite', COALESCE((SELECT players FROM playoff_skaters_json WHERE division = 'elite'), JSON_ARRAY()),
      'pro', COALESCE((SELECT players FROM playoff_skaters_json WHERE division = 'pro'), JSON_ARRAY()),
      'lite', COALESCE((SELECT players FROM playoff_skaters_json WHERE division = 'lite'), JSON_ARRAY()),
      'core', COALESCE((SELECT players FROM playoff_skaters_json WHERE division = 'core'), JSON_ARRAY()),
      'neo', COALESCE((SELECT players FROM playoff_skaters_json WHERE division = 'neo'), JSON_ARRAY())
    ),
    'defenders', JSON_OBJECT(
      'elite', COALESCE((SELECT players FROM playoff_defenders_json WHERE division = 'elite'), JSON_ARRAY()),
      'pro', COALESCE((SELECT players FROM playoff_defenders_json WHERE division = 'pro'), JSON_ARRAY()),
      'lite', COALESCE((SELECT players FROM playoff_defenders_json WHERE division = 'lite'), JSON_ARRAY()),
      'core', COALESCE((SELECT players FROM playoff_defenders_json WHERE division = 'core'), JSON_ARRAY()),
      'neo', COALESCE((SELECT players FROM playoff_defenders_json WHERE division = 'neo'), JSON_ARRAY())
    ),
    'goalies', JSON_OBJECT(
      'elite', COALESCE((SELECT players FROM playoff_goalies_json WHERE division = 'elite'), JSON_ARRAY()),
      'pro', COALESCE((SELECT players FROM playoff_goalies_json WHERE division = 'pro'), JSON_ARRAY()),
      'lite', COALESCE((SELECT players FROM playoff_goalies_json WHERE division = 'lite'), JSON_ARRAY()),
      'core', COALESCE((SELECT players FROM playoff_goalies_json WHERE division = 'core'), JSON_ARRAY()),
      'neo', COALESCE((SELECT players FROM playoff_goalies_json WHERE division = 'neo'), JSON_ARRAY())
    )
  ),

  'matcher', JSON_OBJECT(
    'elite', COALESCE((SELECT matches FROM svenska_matcher_json WHERE division = 'elite'), JSON_ARRAY()),
    'pro', COALESCE((SELECT matches FROM svenska_matcher_json WHERE division = 'pro'), JSON_ARRAY()),
    'lite', COALESCE((SELECT matches FROM svenska_matcher_json WHERE division = 'lite'), JSON_ARRAY()),
    'core', COALESCE((SELECT matches FROM svenska_matcher_json WHERE division = 'core'), JSON_ARRAY()),
    'neo', COALESCE((SELECT matches FROM svenska_matcher_json WHERE division = 'neo'), JSON_ARRAY())
  ),

  'overgangar', COALESCE((SELECT players FROM overgangar_json), JSON_ARRAY())
) AS json_result;
