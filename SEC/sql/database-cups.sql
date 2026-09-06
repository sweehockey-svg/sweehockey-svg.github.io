SET SESSION group_concat_max_len = 1000000;

WITH league_map AS (
  SELECT '21' AS id, 21.0 AS sortOrder, 520 AS leagueId, NULL AS playinLeagueId, 'SEC 21' AS code, 'Svenska eHockey Cupen 21' AS name, 'Cup 21' AS badge
  UNION ALL
  SELECT 'sommar-26' AS id, 21.5 AS sortOrder, 521 AS leagueId, NULL AS playinLeagueId, 'SEC Sommar 26' AS code, 'SEC Sommar 26' AS name, 'Sommarcup' AS badge
),
normalized_teams AS (
  SELECT
    teamID,
    CASE
      WHEN teamName = 'Vasteras IK' THEN 'Västerås IK'
      WHEN teamName = 'HC Macho' THEN 'Macho HC'
      WHEN teamName = 'SPARTA WARRIORS1928' THEN 'Sparta Warriors'
      WHEN teamName = 'Placeholder 3' THEN 'Black Panthers'
      ELSE teamName
    END AS teamName
  FROM nhlgamer_teams
),
event_rows AS (
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
  LEFT JOIN normalized_teams st ON st.teamID = g.teamID
  LEFT JOIN nhlgamer_players gs ON gs.playerID = g.goalPlayerID
  LEFT JOIN nhlgamer_players a1 ON a1.playerID = g.firstAssistPlayerID
  LEFT JOIN nhlgamer_players a2 ON a2.playerID = g.secondAssistPlayerID

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
  LEFT JOIN normalized_teams pt ON pt.teamID = p.teamID
  LEFT JOIN nhlgamer_players pp ON pp.playerID = p.penaltyPlayerID
  LEFT JOIN nhlgamer_penaltyReasons pr ON pr.penaltyReasonID = p.penaltyReasonID
),
ea_match_rows AS (
  SELECT
    ranked.matchID,
    ranked.eaJson
  FROM (
    SELECT
      m.matchID,
      em.`json` AS eaJson,
      ROW_NUMBER() OVER (
        PARTITION BY m.matchID
        ORDER BY ABS(
          TIMESTAMPDIFF(
            SECOND,
            TIMESTAMP(m.matchDate, m.matchTime),
            FROM_UNIXTIME(CAST(JSON_UNQUOTE(JSON_EXTRACT(em.`json`, '$.timestamp')) AS UNSIGNED))
          )
        )
      ) AS rowRank
    FROM nhlgamer_matches m
    JOIN nhlgamer_ea_matches em
      ON em.homeTeamID = m.homeTeamID
      AND em.awayTeamID = m.awayTeamID
    WHERE COALESCE(m.matchIgnore, 0) <> 1
      AND m.goalsAway IS NOT NULL
      AND m.goalsHome IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM nhlgamer_goals fallback_goal_check
        WHERE fallback_goal_check.matchID = m.matchID
      )
      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(em.`json`, CONCAT('$.clubs."', em.awayClubID, '".score'))) AS UNSIGNED) = m.goalsAway
      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(em.`json`, CONCAT('$.clubs."', em.homeClubID, '".score'))) AS UNSIGNED) = m.goalsHome
  ) ranked
  WHERE ranked.rowRank = 1
)

SELECT JSON_PRETTY(
  JSON_OBJECT(
    'generatedAt', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ'),
    'source', JSON_OBJECT(
      'type', 'database'
    ),
    'cups',
    (
      SELECT JSON_ARRAYAGG(cup_rows.cup_json)
      FROM (
        SELECT
          JSON_OBJECT(
            'id', l.id,
            'sortOrder', l.sortOrder,
            'code', l.code,
            'name', l.name,
            'badge', l.badge,
            'placements', JSON_OBJECT(
              'first', NULL,
              'second', NULL
            ),
            'rosterRows',
            COALESCE(
              (
                SELECT JSON_ARRAYAGG(roster.row_json)
                FROM (
                  SELECT
                    JSON_OBJECT(
                      'player', CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DNK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','DEU','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ),
                      'team', tm.teamName,
                      'playerId', CAST(pl.playerID AS CHAR),
                      'role', CASE
                        WHEN lr.positionG = 1 OR lr.preferredPositionID = 6 THEN 'Målvakt'
                        WHEN lr.positionLD = 1 OR lr.positionRD = 1 OR lr.preferredPositionID IN (1, 2) THEN 'Back'
                        WHEN lr.positionLW = 1 OR lr.positionC = 1 OR lr.positionRW = 1 OR lr.preferredPositionID IN (3, 4, 5) THEN 'Forward'
                        ELSE 'Registrerad'
                      END,
                      'hasLicense', lr.hasLicense,
                      'hasBackupLicense', lr.hasBackupLicense,
                      'platformId', lr.platformID
                    ) AS row_json,
                    tm.teamName AS sortTeam,
                    CASE
                      WHEN lr.positionG = 1 OR lr.preferredPositionID = 6 THEN 1
                      WHEN lr.positionLD = 1 OR lr.positionRD = 1 OR lr.preferredPositionID IN (1, 2) THEN 2
                      WHEN lr.positionLW = 1 OR lr.positionC = 1 OR lr.positionRW = 1 OR lr.preferredPositionID IN (3, 4, 5) THEN 3
                      ELSE 4
                    END AS sortRole,
                    COALESCE(pl.psntag, pl.gamertag) AS sortPlayer
                  FROM nhlgamer_leagueRosters lr
                  JOIN normalized_teams tm ON tm.teamID = lr.teamID
                  JOIN nhlgamer_players pl ON pl.playerID = lr.playerID
                  WHERE lr.leagueID = l.leagueId
                    AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                  ORDER BY sortTeam, sortRole, sortPlayer
                ) roster
              ),
              JSON_ARRAY()
            ),
            'groupRows',
            COALESCE(
              (
                SELECT JSON_ARRAYAGG(group_rows.row_json)
                FROM (
                  SELECT
                    JSON_OBJECT(
                      'team', tm.teamName,
                      'group',
                      CASE
                        WHEN lt.groupID IS NULL THEN 'Gruppspel'
                        WHEN lt.groupID = 0 THEN 'Grupp 1'
                        WHEN lt.groupID = 1 THEN 'Grupp 2'
                        ELSE CONCAT('Grupp ', lt.groupID + 1)
                      END
                    ) AS row_json,
                    COALESCE(lt.groupID, 999) AS sortGroup,
                    tm.teamName AS sortTeam
                  FROM nhlgamer_leagueTeams lt
                  JOIN normalized_teams tm ON tm.teamID = lt.teamID
                  WHERE lt.leagueID = l.leagueId
                    AND tm.teamName IS NOT NULL
                  ORDER BY sortGroup, sortTeam
                ) group_rows
              ),
              JSON_ARRAY()
            ),
            'matches',
            COALESCE(
              (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'date', m2.match_date,
                    'time', m2.match_time,
                    'awayTeam', m2.away_team,
                    'awayScore', m2.away_score,
                    'homeScore', m2.home_score,
                    'homeTeam', m2.home_team,
                    'awayShots', m2.away_shots,
                    'homeShots', m2.home_shots,
                    'overtime', m2.overtime,
                    'stage', m2.stage_name,
                    'group', m2.group_name,
                    'goalsSummary', m2.goals_summary,
                    'eaJson', m2.ea_json,
                    'playerStats', JSON_OBJECT(
                      'away',
                      COALESCE(
                        (
                          SELECT JSON_ARRAYAGG(ms.row_json)
                          FROM (
                            SELECT
                              JSON_OBJECT(
                                'player', ms_rows.player,
                                'team', ms_rows.team,
                                'gp', ms_rows.gp,
                                'g', ms_rows.g,
                                'a', ms_rows.a,
                                'pts', ms_rows.pts,
                                'pim', ms_rows.pim,
                                'playerId', ms_rows.playerId
                              ) AS row_json
                            FROM (
                              SELECT
                                CONCAT(
                                  COALESCE(pl.psntag, pl.gamertag),
                                  ', ',
                                  CASE
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                                    WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                                    ELSE 'UNK'
                                  END
                                ) AS player,
                                tm.teamName AS team,
                                1 AS gp,
                                (
                                  SELECT COUNT(*)
                                  FROM nhlgamer_goals goal_count
                                  WHERE goal_count.matchID = m2.sort_match_id
                                    AND goal_count.teamID = part.teamID
                                    AND goal_count.goalPlayerID = part.playerID
                                ) AS g,
                                (
                                  (
                                    SELECT COUNT(*)
                                    FROM nhlgamer_goals assist_count
                                    WHERE assist_count.matchID = m2.sort_match_id
                                      AND assist_count.teamID = part.teamID
                                      AND assist_count.firstAssistPlayerID = part.playerID
                                  ) +
                                  (
                                    SELECT COUNT(*)
                                    FROM nhlgamer_goals assist_count
                                    WHERE assist_count.matchID = m2.sort_match_id
                                      AND assist_count.teamID = part.teamID
                                      AND assist_count.secondAssistPlayerID = part.playerID
                                  )
                                ) AS a,
                                (
                                  (
                                    SELECT COUNT(*)
                                    FROM nhlgamer_goals goal_count
                                    WHERE goal_count.matchID = m2.sort_match_id
                                      AND goal_count.teamID = part.teamID
                                      AND goal_count.goalPlayerID = part.playerID
                                  ) +
                                  (
                                    (
                                      SELECT COUNT(*)
                                      FROM nhlgamer_goals assist_count
                                      WHERE assist_count.matchID = m2.sort_match_id
                                        AND assist_count.teamID = part.teamID
                                        AND assist_count.firstAssistPlayerID = part.playerID
                                    ) +
                                    (
                                      SELECT COUNT(*)
                                      FROM nhlgamer_goals assist_count
                                      WHERE assist_count.matchID = m2.sort_match_id
                                        AND assist_count.teamID = part.teamID
                                        AND assist_count.secondAssistPlayerID = part.playerID
                                    )
                                  )
                                ) AS pts,
                                COALESCE(
                                  (
                                    SELECT SUM(penaltyLength)
                                    FROM nhlgamer_penalties penalty_count
                                    WHERE penalty_count.matchID = m2.sort_match_id
                                      AND penalty_count.teamID = part.teamID
                                      AND penalty_count.penaltyPlayerID = part.playerID
                                  ),
                                  0
                                ) AS pim,
                                CAST(pl.playerID AS CHAR) AS playerId
                              FROM nhlgamer_participants part
                              JOIN nhlgamer_players pl ON pl.playerID = part.playerID
                              JOIN normalized_teams tm ON tm.teamID = part.teamID
                              WHERE part.matchID = m2.sort_match_id
                                AND part.teamID = m2.away_team_id
                                AND NOT (
                                  part.positionID = 6
                                  OR COALESCE(part.goalieShots, 0) > 0
                                  OR COALESCE(part.saves, 0) > 0
                                  OR COALESCE(part.goalsAllowed, 0) > 0
                                )
                                AND NOT EXISTS (
                                  SELECT 1
                                  FROM nhlgamer_goalieStats goalie_check
                                  WHERE goalie_check.leagueID = part.leagueID
                                    AND goalie_check.teamID = part.teamID
                                    AND goalie_check.playerID = part.playerID
                                    AND goalie_check.gameType = m2.game_type
                                    AND goalie_check.gamesPlayed > 0
                                )
                                AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                              GROUP BY part.leagueID, part.teamID, part.playerID, tm.teamName, pl.psntag, pl.gamertag, pl.nationality, pl.country
                              ORDER BY pts DESC, g DESC, a DESC, pim ASC, player ASC
                            ) ms_rows
                          ) ms
                        ),
                        JSON_ARRAY()
                      ),
                      'home',
                      COALESCE(
                        (
                          SELECT JSON_ARRAYAGG(ms.row_json)
                          FROM (
                            SELECT
                              JSON_OBJECT(
                                'player', ms_rows.player,
                                'team', ms_rows.team,
                                'gp', ms_rows.gp,
                                'g', ms_rows.g,
                                'a', ms_rows.a,
                                'pts', ms_rows.pts,
                                'pim', ms_rows.pim,
                                'playerId', ms_rows.playerId
                              ) AS row_json
                            FROM (
                              SELECT
                                CONCAT(
                                  COALESCE(pl.psntag, pl.gamertag),
                                  ', ',
                                  CASE
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                                    WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                                    ELSE 'UNK'
                                  END
                                ) AS player,
                                tm.teamName AS team,
                                1 AS gp,
                                (
                                  SELECT COUNT(*)
                                  FROM nhlgamer_goals goal_count
                                  WHERE goal_count.matchID = m2.sort_match_id
                                    AND goal_count.teamID = part.teamID
                                    AND goal_count.goalPlayerID = part.playerID
                                ) AS g,
                                (
                                  (
                                    SELECT COUNT(*)
                                    FROM nhlgamer_goals assist_count
                                    WHERE assist_count.matchID = m2.sort_match_id
                                      AND assist_count.teamID = part.teamID
                                      AND assist_count.firstAssistPlayerID = part.playerID
                                  ) +
                                  (
                                    SELECT COUNT(*)
                                    FROM nhlgamer_goals assist_count
                                    WHERE assist_count.matchID = m2.sort_match_id
                                      AND assist_count.teamID = part.teamID
                                      AND assist_count.secondAssistPlayerID = part.playerID
                                  )
                                ) AS a,
                                (
                                  (
                                    SELECT COUNT(*)
                                    FROM nhlgamer_goals goal_count
                                    WHERE goal_count.matchID = m2.sort_match_id
                                      AND goal_count.teamID = part.teamID
                                      AND goal_count.goalPlayerID = part.playerID
                                  ) +
                                  (
                                    (
                                      SELECT COUNT(*)
                                      FROM nhlgamer_goals assist_count
                                      WHERE assist_count.matchID = m2.sort_match_id
                                        AND assist_count.teamID = part.teamID
                                        AND assist_count.firstAssistPlayerID = part.playerID
                                    ) +
                                    (
                                      SELECT COUNT(*)
                                      FROM nhlgamer_goals assist_count
                                      WHERE assist_count.matchID = m2.sort_match_id
                                        AND assist_count.teamID = part.teamID
                                        AND assist_count.secondAssistPlayerID = part.playerID
                                    )
                                  )
                                ) AS pts,
                                COALESCE(
                                  (
                                    SELECT SUM(penaltyLength)
                                    FROM nhlgamer_penalties penalty_count
                                    WHERE penalty_count.matchID = m2.sort_match_id
                                      AND penalty_count.teamID = part.teamID
                                      AND penalty_count.penaltyPlayerID = part.playerID
                                  ),
                                  0
                                ) AS pim,
                                CAST(pl.playerID AS CHAR) AS playerId
                              FROM nhlgamer_participants part
                              JOIN nhlgamer_players pl ON pl.playerID = part.playerID
                              JOIN normalized_teams tm ON tm.teamID = part.teamID
                              WHERE part.matchID = m2.sort_match_id
                                AND part.teamID = m2.home_team_id
                                AND NOT (
                                  part.positionID = 6
                                  OR COALESCE(part.goalieShots, 0) > 0
                                  OR COALESCE(part.saves, 0) > 0
                                  OR COALESCE(part.goalsAllowed, 0) > 0
                                )
                                AND NOT EXISTS (
                                  SELECT 1
                                  FROM nhlgamer_goalieStats goalie_check
                                  WHERE goalie_check.leagueID = part.leagueID
                                    AND goalie_check.teamID = part.teamID
                                    AND goalie_check.playerID = part.playerID
                                    AND goalie_check.gameType = m2.game_type
                                    AND goalie_check.gamesPlayed > 0
                                )
                                AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                              GROUP BY part.leagueID, part.teamID, part.playerID, tm.teamName, pl.psntag, pl.gamertag, pl.nationality, pl.country
                              ORDER BY pts DESC, g DESC, a DESC, pim ASC, player ASC
                            ) ms_rows
                          ) ms
                        ),
                        JSON_ARRAY()
                      )
                    ),
                    'goalieStats', JSON_OBJECT(
                      'away',
                      COALESCE(
                        (
                          SELECT JSON_ARRAYAGG(gs_rows.row_json)
                          FROM (
                            SELECT
                              JSON_OBJECT(
                                'player', CONCAT(
                                  COALESCE(pl.psntag, pl.gamertag),
                                  ', ',
                                  CASE
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                                    WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                                    ELSE 'UNK'
                                  END
                                ),
                                'team', tm.teamName,
                                'sa', CASE
                                  WHEN p.goalieShots IS NOT NULL AND p.goalieShots > 0 THEN p.goalieShots
                                  ELSE COALESCE(p.saves, 0) + COALESCE(p.goalsAllowed, 0)
                                END,
                                'ga', p.goalsAllowed,
                                'sv', p.saves,
                                'svp', ROUND(
                                  p.saves / NULLIF(
                                    CASE
                                      WHEN p.goalieShots IS NOT NULL AND p.goalieShots > 0 THEN p.goalieShots
                                      ELSE COALESCE(p.saves, 0) + COALESCE(p.goalsAllowed, 0)
                                    END,
                                    0
                                  ),
                                  3
                                ),
                                'playerId', CAST(pl.playerID AS CHAR)
                              ) AS row_json
                            FROM nhlgamer_participants p
                            JOIN nhlgamer_players pl ON pl.playerID = p.playerID
                            JOIN normalized_teams tm ON tm.teamID = p.teamID
                            WHERE p.matchID = m2.sort_match_id
                              AND p.teamID = m2.away_team_id
                              AND (
                                p.positionID = 6
                                OR COALESCE(p.goalieShots, 0) > 0
                                OR COALESCE(p.saves, 0) > 0
                                OR COALESCE(p.goalsAllowed, 0) > 0
                              )
                              AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                            GROUP BY p.leagueID, p.teamID, p.playerID, p.goalieShots, p.goalsAllowed, p.saves, tm.teamName, pl.psntag, pl.gamertag, pl.nationality, pl.country
                            ORDER BY
                              COALESCE(pl.psntag, pl.gamertag) ASC
                          ) gs_rows
                        ),
                        JSON_ARRAY()
                      ),
                      'home',
                      COALESCE(
                        (
                          SELECT JSON_ARRAYAGG(gs_rows.row_json)
                          FROM (
                            SELECT
                              JSON_OBJECT(
                                'player', CONCAT(
                                  COALESCE(pl.psntag, pl.gamertag),
                                  ', ',
                                  CASE
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                                    WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                                    WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                                    ELSE 'UNK'
                                  END
                                ),
                                'team', tm.teamName,
                                'sa', CASE
                                  WHEN p.goalieShots IS NOT NULL AND p.goalieShots > 0 THEN p.goalieShots
                                  ELSE COALESCE(p.saves, 0) + COALESCE(p.goalsAllowed, 0)
                                END,
                                'ga', p.goalsAllowed,
                                'sv', p.saves,
                                'svp', ROUND(
                                  p.saves / NULLIF(
                                    CASE
                                      WHEN p.goalieShots IS NOT NULL AND p.goalieShots > 0 THEN p.goalieShots
                                      ELSE COALESCE(p.saves, 0) + COALESCE(p.goalsAllowed, 0)
                                    END,
                                    0
                                  ),
                                  3
                                ),
                                'playerId', CAST(pl.playerID AS CHAR)
                              ) AS row_json
                            FROM nhlgamer_participants p
                            JOIN nhlgamer_players pl ON pl.playerID = p.playerID
                            JOIN normalized_teams tm ON tm.teamID = p.teamID
                            WHERE p.matchID = m2.sort_match_id
                              AND p.teamID = m2.home_team_id
                              AND (
                                p.positionID = 6
                                OR COALESCE(p.goalieShots, 0) > 0
                                OR COALESCE(p.saves, 0) > 0
                                OR COALESCE(p.goalsAllowed, 0) > 0
                              )
                              AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                            GROUP BY p.leagueID, p.teamID, p.playerID, p.goalieShots, p.goalsAllowed, p.saves, tm.teamName, pl.psntag, pl.gamertag, pl.nationality, pl.country
                            ORDER BY
                              COALESCE(pl.psntag, pl.gamertag) ASC
                          ) gs_rows
                        ),
                        JSON_ARRAY()
                      )
                    )
                  )
                )
                FROM (
                  SELECT *
                  FROM (
                    SELECT
                      DATE_FORMAT(m.matchDate, '%Y-%m-%d') AS match_date,
                      TIME_FORMAT(m.matchTime, '%H:%i') AS match_time,
                      at.teamName AS away_team,
                      m.goalsAway AS away_score,
                      m.goalsHome AS home_score,
                      ht.teamName AS home_team,
                      m.shotsAway AS away_shots,
                      m.shotsHome AS home_shots,
                      IF(m.overtime = 1, TRUE, FALSE) AS overtime,
                      'group' AS stage_name,
                      CASE
                        WHEN ltH.groupID IS NULL THEN ''
                        WHEN ltH.groupID = 0 THEN 'Grupp 1'
                        WHEN ltH.groupID = 1 THEN 'Grupp 2'
                        ELSE CONCAT('Grupp ', ltH.groupID + 1)
                      END AS group_name,
                      COALESCE(
                        GROUP_CONCAT(
                          ev.eventText
                          ORDER BY ev.eventTime, ev.sortKey
                          SEPARATOR ' | '
                        ),
                        ''
                      ) AS goals_summary,
                      MAX(ea.eaJson) AS ea_json,
                      1 AS sort_stage,
                      ltH.groupID AS sort_group,
                      m.matchDate AS sort_date,
                      m.matchTime AS sort_time,
                      m.matchID AS sort_match_id,
                      m.awayTeamID AS away_team_id,
                      m.homeTeamID AS home_team_id,
                      COALESCE(m.matchType, 'regular') AS game_type
                    FROM nhlgamer_matches m
                    LEFT JOIN nhlgamer_leagueTeams ltH
                      ON ltH.leagueID = m.leagueID AND ltH.teamID = m.homeTeamID
                    LEFT JOIN nhlgamer_leagueTeams ltA
                      ON ltA.leagueID = m.leagueID AND ltA.teamID = m.awayTeamID
                    LEFT JOIN normalized_teams ht ON ht.teamID = m.homeTeamID
                    LEFT JOIN normalized_teams at ON at.teamID = m.awayTeamID
                    LEFT JOIN event_rows ev ON ev.matchID = m.matchID
                    LEFT JOIN ea_match_rows ea ON ea.matchID = m.matchID
                    WHERE m.leagueID = l.leagueId
                      AND COALESCE(m.matchType, 'regular') <> 'playoffs'
                      AND COALESCE(m.matchIgnore, 0) <> 1
                      AND (
                        ltH.groupID = ltA.groupID
                        OR ltH.groupID IS NULL
                        OR ltA.groupID IS NULL
                      )
                    GROUP BY
                      m.matchID, m.matchDate, m.matchTime,
                      at.teamName, ht.teamName,
                      m.goalsAway, m.goalsHome, m.overtime,
                      m.shotsAway, m.shotsHome,
                      ltH.groupID, m.awayTeamID, m.homeTeamID, m.matchType

                    UNION ALL

                    SELECT
                      DATE_FORMAT(s.matchDate, '%Y-%m-%d') AS match_date,
                      TIME_FORMAT(s.matchTime, '%H:%i') AS match_time,
                      at.teamName AS away_team,
                      NULL AS away_score,
                      NULL AS home_score,
                      ht.teamName AS home_team,
                      NULL AS away_shots,
                      NULL AS home_shots,
                      FALSE AS overtime,
                      'group' AS stage_name,
                      CASE
                        WHEN ltH.groupID IS NULL THEN ''
                        WHEN ltH.groupID = 0 THEN 'Grupp 1'
                        WHEN ltH.groupID = 1 THEN 'Grupp 2'
                        ELSE CONCAT('Grupp ', ltH.groupID + 1)
                      END AS group_name,
                      '' AS goals_summary,
                      NULL AS ea_json,
                      1 AS sort_stage,
                      ltH.groupID AS sort_group,
                      s.matchDate AS sort_date,
                      s.matchTime AS sort_time,
                      NULL AS sort_match_id,
                      s.awayTeamID AS away_team_id,
                      s.homeTeamID AS home_team_id,
                      COALESCE(s.matchType, 'regular') AS game_type
                    FROM nhlgamer_schedules s
                    LEFT JOIN nhlgamer_leagueTeams ltH
                      ON ltH.leagueID = s.leagueID AND ltH.teamID = s.homeTeamID
                    LEFT JOIN nhlgamer_leagueTeams ltA
                      ON ltA.leagueID = s.leagueID AND ltA.teamID = s.awayTeamID
                    LEFT JOIN normalized_teams ht ON ht.teamID = s.homeTeamID
                    LEFT JOIN normalized_teams at ON at.teamID = s.awayTeamID
                    WHERE s.leagueID = l.leagueId
                      AND COALESCE(s.matchType, 'regular') <> 'playoffs'
                      AND COALESCE(s.hidden, 0) <> 1
                      AND NOT EXISTS (
                        SELECT 1
                        FROM nhlgamer_matches reported
                        WHERE reported.scheduledMatchID = s.scheduledMatchID
                          AND reported.leagueID = s.leagueID
                          AND COALESCE(reported.matchIgnore, 0) <> 1
                      )
                      AND (
                        ltH.groupID = ltA.groupID
                        OR ltH.groupID IS NULL
                        OR ltA.groupID IS NULL
                      )

                    UNION ALL

                    SELECT
                      DATE_FORMAT(m.matchDate, '%Y-%m-%d') AS match_date,
                      TIME_FORMAT(m.matchTime, '%H:%i') AS match_time,
                      at.teamName AS away_team,
                      m.goalsAway AS away_score,
                      m.goalsHome AS home_score,
                      ht.teamName AS home_team,
                      m.shotsAway AS away_shots,
                      m.shotsHome AS home_shots,
                      IF(m.overtime = 1, TRUE, FALSE) AS overtime,
                      'playin' AS stage_name,
                      CASE
                        WHEN ltH.groupID IS NULL OR ltH.groupID = 0 THEN 'Play in'
                        ELSE CONCAT('Play in ', ltH.groupID + 1)
                      END AS group_name,
                      COALESCE(
                        GROUP_CONCAT(
                          ev.eventText
                          ORDER BY ev.eventTime, ev.sortKey
                          SEPARATOR ' | '
                        ),
                        ''
                      ) AS goals_summary,
                      MAX(ea.eaJson) AS ea_json,
                      1.5 AS sort_stage,
                      500 + COALESCE(ltH.groupID, 0) AS sort_group,
                      m.matchDate AS sort_date,
                      m.matchTime AS sort_time,
                      m.matchID AS sort_match_id,
                      m.awayTeamID AS away_team_id,
                      m.homeTeamID AS home_team_id,
                      COALESCE(m.matchType, 'regular') AS game_type
                    FROM nhlgamer_matches m
                    LEFT JOIN nhlgamer_leagueTeams ltH
                      ON ltH.leagueID = m.leagueID AND ltH.teamID = m.homeTeamID
                    LEFT JOIN nhlgamer_leagueTeams ltA
                      ON ltA.leagueID = m.leagueID AND ltA.teamID = m.awayTeamID
                    LEFT JOIN normalized_teams ht ON ht.teamID = m.homeTeamID
                    LEFT JOIN normalized_teams at ON at.teamID = m.awayTeamID
                    LEFT JOIN event_rows ev ON ev.matchID = m.matchID
                    LEFT JOIN ea_match_rows ea ON ea.matchID = m.matchID
                    WHERE m.leagueID = l.playinLeagueId
                      AND COALESCE(m.matchType, 'regular') <> 'playoffs'
                      AND COALESCE(m.matchIgnore, 0) <> 1
                      AND (
                        ltH.groupID = ltA.groupID
                        OR ltH.groupID IS NULL
                        OR ltA.groupID IS NULL
                      )
                    GROUP BY
                      m.matchID, m.matchDate, m.matchTime,
                      at.teamName, ht.teamName,
                      m.goalsAway, m.goalsHome, m.overtime,
                      m.shotsAway, m.shotsHome,
                      ltH.groupID, m.awayTeamID, m.homeTeamID, m.matchType

                    UNION ALL

                    SELECT
                      DATE_FORMAT(s.matchDate, '%Y-%m-%d') AS match_date,
                      TIME_FORMAT(s.matchTime, '%H:%i') AS match_time,
                      at.teamName AS away_team,
                      NULL AS away_score,
                      NULL AS home_score,
                      ht.teamName AS home_team,
                      NULL AS away_shots,
                      NULL AS home_shots,
                      FALSE AS overtime,
                      'playin' AS stage_name,
                      CASE
                        WHEN ltH.groupID IS NULL OR ltH.groupID = 0 THEN 'Play in'
                        ELSE CONCAT('Play in ', ltH.groupID + 1)
                      END AS group_name,
                      '' AS goals_summary,
                      NULL AS ea_json,
                      1.5 AS sort_stage,
                      500 + COALESCE(ltH.groupID, 0) AS sort_group,
                      s.matchDate AS sort_date,
                      s.matchTime AS sort_time,
                      NULL AS sort_match_id,
                      s.awayTeamID AS away_team_id,
                      s.homeTeamID AS home_team_id,
                      COALESCE(s.matchType, 'regular') AS game_type
                    FROM nhlgamer_schedules s
                    LEFT JOIN nhlgamer_leagueTeams ltH
                      ON ltH.leagueID = s.leagueID AND ltH.teamID = s.homeTeamID
                    LEFT JOIN nhlgamer_leagueTeams ltA
                      ON ltA.leagueID = s.leagueID AND ltA.teamID = s.awayTeamID
                    LEFT JOIN normalized_teams ht ON ht.teamID = s.homeTeamID
                    LEFT JOIN normalized_teams at ON at.teamID = s.awayTeamID
                    WHERE s.leagueID = l.playinLeagueId
                      AND COALESCE(s.matchType, 'regular') <> 'playoffs'
                      AND COALESCE(s.hidden, 0) <> 1
                      AND NOT EXISTS (
                        SELECT 1
                        FROM nhlgamer_matches reported
                        WHERE reported.scheduledMatchID = s.scheduledMatchID
                          AND reported.leagueID = s.leagueID
                          AND COALESCE(reported.matchIgnore, 0) <> 1
                      )
                      AND (
                        ltH.groupID = ltA.groupID
                        OR ltH.groupID IS NULL
                        OR ltA.groupID IS NULL
                      )

                    UNION ALL

                    SELECT
                      DATE_FORMAT(m.matchDate, '%Y-%m-%d') AS match_date,
                      TIME_FORMAT(m.matchTime, '%H:%i') AS match_time,
                      at.teamName AS away_team,
                      m.goalsAway AS away_score,
                      m.goalsHome AS home_score,
                      ht.teamName AS home_team,
                      m.shotsAway AS away_shots,
                      m.shotsHome AS home_shots,
                      IF(m.overtime = 1, TRUE, FALSE) AS overtime,
                      COALESCE(NULLIF(sched.stage, ''), 'Slutspel') AS stage_name,
                      COALESCE(NULLIF(sched.stage, ''), 'Slutspel') AS group_name,
                      COALESCE(
                        GROUP_CONCAT(
                          ev.eventText
                          ORDER BY ev.eventTime, ev.sortKey
                          SEPARATOR ' | '
                        ),
                        ''
                      ) AS goals_summary,
                      MAX(ea.eaJson) AS ea_json,
                      2 AS sort_stage,
                      999 AS sort_group,
                      m.matchDate AS sort_date,
                      m.matchTime AS sort_time,
                      m.matchID AS sort_match_id,
                      m.awayTeamID AS away_team_id,
                      m.homeTeamID AS home_team_id,
                      m.matchType AS game_type
                    FROM nhlgamer_matches m
                    LEFT JOIN nhlgamer_leagueTeams ltH
                      ON ltH.leagueID = m.leagueID AND ltH.teamID = m.homeTeamID
                    LEFT JOIN nhlgamer_leagueTeams ltA
                      ON ltA.leagueID = m.leagueID AND ltA.teamID = m.awayTeamID
                    LEFT JOIN nhlgamer_schedules sched
                      ON sched.scheduledMatchID = m.scheduledMatchID AND sched.leagueID = m.leagueID
                    LEFT JOIN normalized_teams ht ON ht.teamID = m.homeTeamID
                    LEFT JOIN normalized_teams at ON at.teamID = m.awayTeamID
                    LEFT JOIN event_rows ev ON ev.matchID = m.matchID
                    LEFT JOIN ea_match_rows ea ON ea.matchID = m.matchID
                    WHERE m.leagueID = l.leagueId
                      AND m.matchType = 'playoffs'
                      AND COALESCE(m.matchIgnore, 0) <> 1
                    GROUP BY
                      m.matchID, m.matchDate, m.matchTime,
                      at.teamName, ht.teamName,
                      m.goalsAway, m.goalsHome, m.overtime,
                      m.shotsAway, m.shotsHome,
                      m.awayTeamID, m.homeTeamID, m.matchType, sched.stage

                    UNION ALL

                    SELECT
                      DATE_FORMAT(s.matchDate, '%Y-%m-%d') AS match_date,
                      TIME_FORMAT(s.matchTime, '%H:%i') AS match_time,
                      at.teamName AS away_team,
                      NULL AS away_score,
                      NULL AS home_score,
                      ht.teamName AS home_team,
                      NULL AS away_shots,
                      NULL AS home_shots,
                      FALSE AS overtime,
                      COALESCE(NULLIF(s.stage, ''), 'Slutspel') AS stage_name,
                      COALESCE(NULLIF(s.stage, ''), 'Slutspel') AS group_name,
                      '' AS goals_summary,
                      NULL AS ea_json,
                      2 AS sort_stage,
                      999 AS sort_group,
                      s.matchDate AS sort_date,
                      s.matchTime AS sort_time,
                      NULL AS sort_match_id,
                      s.awayTeamID AS away_team_id,
                      s.homeTeamID AS home_team_id,
                      s.matchType AS game_type
                    FROM nhlgamer_schedules s
                    LEFT JOIN normalized_teams ht ON ht.teamID = s.homeTeamID
                    LEFT JOIN normalized_teams at ON at.teamID = s.awayTeamID
                    WHERE s.leagueID = l.leagueId
                      AND s.matchType = 'playoffs'
                      AND COALESCE(s.hidden, 0) <> 1
                      AND NOT EXISTS (
                        SELECT 1
                        FROM nhlgamer_matches reported
                        WHERE reported.scheduledMatchID = s.scheduledMatchID
                          AND reported.leagueID = s.leagueID
                          AND COALESCE(reported.matchIgnore, 0) <> 1
                      )
                  ) all_matches
                  ORDER BY sort_stage, sort_group, sort_date, sort_time, sort_match_id
                ) m2
              ),
              JSON_ARRAY()
            ),
            'playerStats', JSON_OBJECT(
              'group',
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'player', p2.player,
                      'team', p2.team,
                      'gp', p2.gp,
                      'g', p2.g,
                      'a', p2.a,
                      'pts', p2.pts,
                      'pim', p2.pim,
                      'shots', p2.shots,
                      'playerId', p2.playerId
                    )
                  )
                  FROM (
                    SELECT
                      CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ) AS player,
                      tm.teamName AS team,
                      a.GP AS gp,
                      a.G AS g,
                      a.A AS a,
                      a.PTS AS pts,
                      a.PIM AS pim,
                      a.SHOTS AS shots,
                      CAST(pl.playerID AS CHAR) AS playerId
                    FROM (
                      SELECT
                        leagueID,
                        teamID,
                        playerID,
                        SUM(gamesPlayed) AS GP,
                        SUM(goals) AS G,
                        SUM(assists) AS A,
                        SUM(points) AS PTS,
                        SUM(penaltyMinutes) AS PIM,
                        SUM(shots) AS SHOTS
                      FROM nhlgamer_playerStats
                      WHERE leagueID = l.leagueId
                        AND gameType = 'regular'
                        AND positionID <> 6
                      GROUP BY leagueID, teamID, playerID
                    ) a
                    JOIN nhlgamer_players pl ON pl.playerID = a.playerID
                    JOIN normalized_teams tm ON tm.teamID = a.teamID
                    WHERE COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                    ORDER BY pts DESC, g DESC, a DESC, pim ASC, player ASC
                  ) p2
                ),
                JSON_ARRAY()
              ),
              'playin',
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'player', p2.player,
                      'team', p2.team,
                      'gp', p2.gp,
                      'g', p2.g,
                      'a', p2.a,
                      'pts', p2.pts,
                      'pim', p2.pim,
                      'shots', p2.shots,
                      'playerId', p2.playerId
                    )
                  )
                  FROM (
                    SELECT
                      CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ) AS player,
                      tm.teamName AS team,
                      a.GP AS gp,
                      a.G AS g,
                      a.A AS a,
                      a.PTS AS pts,
                      a.PIM AS pim,
                      a.SHOTS AS shots,
                      CAST(pl.playerID AS CHAR) AS playerId
                    FROM (
                      SELECT
                        leagueID,
                        teamID,
                        playerID,
                        SUM(gamesPlayed) AS GP,
                        SUM(goals) AS G,
                        SUM(assists) AS A,
                        SUM(points) AS PTS,
                        SUM(penaltyMinutes) AS PIM,
                        SUM(shots) AS SHOTS
                      FROM nhlgamer_playerStats
                      WHERE leagueID = l.playinLeagueId
                        AND gameType = 'regular'
                        AND positionID <> 6
                      GROUP BY leagueID, teamID, playerID
                    ) a
                    JOIN nhlgamer_players pl ON pl.playerID = a.playerID
                    JOIN normalized_teams tm ON tm.teamID = a.teamID
                    WHERE COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                    ORDER BY pts DESC, g DESC, a DESC, pim ASC, player ASC
                  ) p2
                ),
                JSON_ARRAY()
              ),
              'playoffs',
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'player', p2.player,
                      'team', p2.team,
                      'gp', p2.gp,
                      'g', p2.g,
                      'a', p2.a,
                      'pts', p2.pts,
                      'pim', p2.pim,
                      'shots', p2.shots,
                      'playerId', p2.playerId
                    )
                  )
                  FROM (
                    SELECT
                      CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ) AS player,
                      tm.teamName AS team,
                      a.GP AS gp,
                      a.G AS g,
                      a.A AS a,
                      a.PTS AS pts,
                      a.PIM AS pim,
                      a.SHOTS AS shots,
                      CAST(pl.playerID AS CHAR) AS playerId
                    FROM (
                      SELECT
                        leagueID,
                        teamID,
                        playerID,
                        SUM(gamesPlayed) AS GP,
                        SUM(goals) AS G,
                        SUM(assists) AS A,
                        SUM(points) AS PTS,
                        SUM(penaltyMinutes) AS PIM,
                        SUM(shots) AS SHOTS
                      FROM nhlgamer_playerStats
                      WHERE leagueID = l.leagueId
                        AND gameType = 'playoffs'
                        AND positionID <> 6
                      GROUP BY leagueID, teamID, playerID
                    ) a
                    JOIN nhlgamer_players pl ON pl.playerID = a.playerID
                    JOIN normalized_teams tm ON tm.teamID = a.teamID
                    WHERE COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                    ORDER BY pts DESC, g DESC, a DESC, shots DESC, pim ASC, player ASC
                  ) p2
                ),
                JSON_ARRAY()
              )
            ),
            'goalieStats', JSON_OBJECT(
              'group',
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'player', g2.player,
                      'team', g2.team,
                      'gp', g2.gp,
                      'sa', g2.sa,
                      'ga', g2.ga,
                      'sv', g2.sv,
                      'gaa', g2.gaa,
                      'svp', g2.svp,
                      'so', g2.so,
                      'playerId', g2.playerId
                    )
                  )
                  FROM (
                    SELECT
                      CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ) AS player,
                      tm.teamName AS team,
                      gs.gamesPlayed AS gp,
                      CASE
                        WHEN gs.shotsAgainst IS NOT NULL AND gs.shotsAgainst > 0 THEN gs.shotsAgainst
                        ELSE (gs.saves + gs.goalsAllowed)
                      END AS sa,
                      gs.goalsAllowed AS ga,
                      gs.saves AS sv,
                      ROUND(
                        CASE
                          WHEN gs.playedMinutes IS NOT NULL AND gs.playedMinutes > 0
                            THEN (gs.goalsAllowed * 60) / gs.playedMinutes
                          ELSE gs.goalsAllowed / NULLIF(gs.gamesPlayed, 0)
                        END,
                        2
                      ) AS gaa,
                      ROUND(
                        gs.saves / NULLIF(
                          CASE
                            WHEN gs.shotsAgainst IS NOT NULL AND gs.shotsAgainst > 0 THEN gs.shotsAgainst
                            ELSE (gs.saves + gs.goalsAllowed)
                          END,
                          0
                        ),
                        3
                      ) AS svp,
                      gs.shutouts AS so,
                      CAST(pl.playerID AS CHAR) AS playerId
                    FROM nhlgamer_goalieStats gs
                    JOIN nhlgamer_players pl ON pl.playerID = gs.playerID
                    JOIN normalized_teams tm ON tm.teamID = gs.teamID
                    WHERE gs.leagueID = l.leagueId
                      AND gs.gameType = 'regular'
                      AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                    ORDER BY svp DESC, gaa ASC, sv DESC, player ASC
                  ) g2
                ),
                JSON_ARRAY()
              ),
              'playin',
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'player', g2.player,
                      'team', g2.team,
                      'gp', g2.gp,
                      'sa', g2.sa,
                      'ga', g2.ga,
                      'sv', g2.sv,
                      'gaa', g2.gaa,
                      'svp', g2.svp,
                      'so', g2.so,
                      'playerId', g2.playerId
                    )
                  )
                  FROM (
                    SELECT
                      CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ) AS player,
                      tm.teamName AS team,
                      gs.gamesPlayed AS gp,
                      CASE
                        WHEN gs.shotsAgainst IS NOT NULL AND gs.shotsAgainst > 0 THEN gs.shotsAgainst
                        ELSE (gs.saves + gs.goalsAllowed)
                      END AS sa,
                      gs.goalsAllowed AS ga,
                      gs.saves AS sv,
                      ROUND(
                        CASE
                          WHEN gs.playedMinutes IS NOT NULL AND gs.playedMinutes > 0
                            THEN (gs.goalsAllowed * 60) / gs.playedMinutes
                          ELSE gs.goalsAllowed / NULLIF(gs.gamesPlayed, 0)
                        END,
                        2
                      ) AS gaa,
                      ROUND(
                        gs.saves / NULLIF(
                          CASE
                            WHEN gs.shotsAgainst IS NOT NULL AND gs.shotsAgainst > 0 THEN gs.shotsAgainst
                            ELSE (gs.saves + gs.goalsAllowed)
                          END,
                          0
                        ),
                        3
                      ) AS svp,
                      gs.shutouts AS so,
                      CAST(pl.playerID AS CHAR) AS playerId
                    FROM nhlgamer_goalieStats gs
                    JOIN nhlgamer_players pl ON pl.playerID = gs.playerID
                    JOIN normalized_teams tm ON tm.teamID = gs.teamID
                    WHERE gs.leagueID = l.playinLeagueId
                      AND gs.gameType = 'regular'
                      AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                    ORDER BY svp DESC, gaa ASC, sv DESC, player ASC
                  ) g2
                ),
                JSON_ARRAY()
              ),
              'playoffs',
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'player', g2.player,
                      'team', g2.team,
                      'gp', g2.gp,
                      'sa', g2.sa,
                      'ga', g2.ga,
                      'sv', g2.sv,
                      'gaa', g2.gaa,
                      'svp', g2.svp,
                      'so', g2.so,
                      'playerId', g2.playerId
                    )
                  )
                  FROM (
                    SELECT
                      CONCAT(
                        COALESCE(pl.psntag, pl.gamertag),
                        ', ',
                        CASE
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SWE','SE','SWEDEN','SVERIGE') THEN 'SWE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('DEN','DK','DENMARK','DANMARK') THEN 'DEN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('FIN','FI','FINLAND','SUOMI') THEN 'FIN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('NOR','NO','NORWAY','NORGE') THEN 'NOR'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('GER','DE','GERMANY','DEUTSCHLAND') THEN 'GER'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CZE','CZ','CZECHIA','CZECH REPUBLIC','TJECKIEN') THEN 'CZE'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('SVK','SK','SLOVAKIA','SLOVAK REPUBLIC') THEN 'SVK'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('CAN','CA','CANADA') THEN 'CAN'
                          WHEN UPPER(TRIM(COALESCE(pl.nationality, pl.country))) IN ('USA','US','UNITED STATES','UNITED STATES OF AMERICA') THEN 'USA'
                          WHEN COALESCE(pl.nationality, pl.country) REGEXP '^[A-Za-z]{3}$' THEN UPPER(COALESCE(pl.nationality, pl.country))
                          ELSE 'UNK'
                        END
                      ) AS player,
                      tm.teamName AS team,
                      gs.gamesPlayed AS gp,
                      CASE
                        WHEN gs.shotsAgainst IS NOT NULL AND gs.shotsAgainst > 0 THEN gs.shotsAgainst
                        ELSE (gs.saves + gs.goalsAllowed)
                      END AS sa,
                      gs.goalsAllowed AS ga,
                      gs.saves AS sv,
                      ROUND(
                        CASE
                          WHEN gs.playedMinutes IS NOT NULL AND gs.playedMinutes > 0
                            THEN (gs.goalsAllowed * 60) / gs.playedMinutes
                          ELSE gs.goalsAllowed / NULLIF(gs.gamesPlayed, 0)
                        END,
                        2
                      ) AS gaa,
                      ROUND(
                        gs.saves / NULLIF(
                          CASE
                            WHEN gs.shotsAgainst IS NOT NULL AND gs.shotsAgainst > 0 THEN gs.shotsAgainst
                            ELSE (gs.saves + gs.goalsAllowed)
                          END,
                          0
                        ),
                        3
                      ) AS svp,
                      gs.shutouts AS so,
                      CAST(pl.playerID AS CHAR) AS playerId
                    FROM nhlgamer_goalieStats gs
                    JOIN nhlgamer_players pl ON pl.playerID = gs.playerID
                    JOIN normalized_teams tm ON tm.teamID = gs.teamID
                    WHERE gs.leagueID = l.leagueId
                      AND gs.gameType = 'playoffs'
                      AND COALESCE(pl.psntag, pl.gamertag) IS NOT NULL
                    ORDER BY svp DESC, gaa ASC, sv DESC, player ASC
                  ) g2
                ),
                JSON_ARRAY()
              )
            )
          ) AS cup_json
        FROM (
          SELECT *
          FROM league_map
          ORDER BY sortOrder
        ) l
      ) cup_rows
    )
  )
) AS database_cups_json;
