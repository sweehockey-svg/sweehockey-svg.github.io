/*
  svenska-lag-historia-player-completions.sql

  Exporterar kompletterande spelarstatistik som laghistoriksidan läser från:
  svenska-lag-historia-player-completions.json

  Syfte:
  - Används när nhlgamer_playerStats/nhlgamer_goalieStats saknar matcher som finns i
    komplett SportsGamer/all-time-underlag.
  - Kvalmatcher kan komplettera spelar-GP, men frontend räknar fortfarande inte kval
    som ECL-säsonger på lagkorten.

  Viktigt:
  - mode = 'add' betyder att värden läggs ovanpå befintlig JSON-rad.
  - mode = 'set' betyder att värden ersätter befintlig JSON-rad.
*/

WITH manual_player_stat_completions AS (
  SELECT
    CAST(NULL AS UNSIGNED) AS playerID,
    CAST(NULL AS CHAR) AS playerName,
    CAST(NULL AS UNSIGNED) AS teamID,
    CAST(NULL AS CHAR) AS teamName,
    CAST(NULL AS UNSIGNED) AS leagueID,
    CAST(NULL AS CHAR) AS seasonLabel,
    CAST(NULL AS CHAR) AS division,
    CAST(NULL AS CHAR) AS mode,
    CAST(NULL AS SIGNED) AS regularGames,
    CAST(NULL AS SIGNED) AS playoffGames,
    CAST(NULL AS SIGNED) AS gamesPlayed,
    CAST(NULL AS SIGNED) AS skaterGames,
    CAST(NULL AS SIGNED) AS goalieGames,
    CAST(NULL AS SIGNED) AS goals,
    CAST(NULL AS SIGNED) AS assists,
    CAST(NULL AS SIGNED) AS points,
    CAST(NULL AS CHAR) AS source
  WHERE 1 = 0
)

SELECT JSON_OBJECT(
  'updated', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  'source', 'svenska-lag-historia-player-completions.sql',
  'notes', JSON_ARRAY(
    'Kompletterar saknade spelar-GP där komplett all-time-underlag visar fler matcher än nhlgamer_playerStats-exporten.',
    'Kval kan ingå i spelarstatistik, men kval räknas inte som ECL-säsong på lagkorten.'
  ),
  'completions', COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'playerID', playerID,
        'playerName', playerName,
        'teamID', teamID,
        'teamName', teamName,
        'leagueID', leagueID,
        'seasonLabel', seasonLabel,
        'division', division,
        'mode', mode,
        'regularGames', regularGames,
        'playoffGames', playoffGames,
        'gamesPlayed', gamesPlayed,
        'skaterGames', skaterGames,
        'goalieGames', goalieGames,
        'goals', goals,
        'assists', assists,
        'points', points,
        'source', source
      )
    )
    FROM manual_player_stat_completions
  ), JSON_ARRAY())
) AS json_result;
