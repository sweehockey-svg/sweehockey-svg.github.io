create or replace view public.v_ehockey_player_national_team_summary_v1 as
 WITH national_team_aliases(league_id,team_external_id,canonical_external_id) AS (
 VALUES (532::bigint,'7089'::text,'6070'::text),(532,'7090','6067'),(532,'7091','6077'),(532,'7092','6080')
), national_teams AS (
 SELECT team_external_id,country_code,country_name_sv,canonical_display_name,national_team_phrase_sv
 FROM public.ehockey_national_teams
 UNION ALL SELECT '7093','NA','Nordamerika','4N Team NA','det nordamerikanska representationslaget'
 UNION ALL SELECT '7094','EU','Europa','4N Team EU','det europeiska representationslaget'
), world_cup_rows AS (
         SELECT p.player_key,
            p.display_gamertag,
            p.sports_gamer_player_url,
            nt.team_external_id,
            nt.country_code,
            nt.country_name_sv,
            nt.canonical_display_name,
            nt.national_team_phrase_sv,
            p.league_id,
            p.season_label,
            COALESCE(p.chronology_date, p.sort_date, p.start_date, p.end_date) AS chronology_date,
                CASE
                    WHEN COALESCE(p.total_goalie_games, 0::bigint) > 0 AND COALESCE(p.total_skater_games, 0::bigint) = COALESCE(p.total_goalie_games, 0::bigint) AND COALESCE(p.total_goals, 0::bigint) = 0 AND COALESCE(p.total_assists, 0::bigint) = 0 AND COALESCE(p.total_points, 0::bigint) = 0 THEN COALESCE(p.total_goalie_games, 0::bigint)
                    ELSE COALESCE(p.total_skater_games, 0::bigint) + COALESCE(p.total_goalie_games, 0::bigint)
                END AS appearance_games
           FROM v_ehockey_player_tournaments_web_v14 p
             LEFT JOIN national_team_aliases alias ON alias.league_id=p.league_id AND alias.team_external_id=p.team_external_id
 JOIN national_teams nt ON nt.team_external_id=coalesce(alias.canonical_external_id,p.team_external_id)
          WHERE p.league_id=532 OR lower(concat_ws(' '::text, p.league_name, p.season_label, p.competition_name)) ~~ '%world cup%'::text
        ), played AS (
         SELECT world_cup_rows.player_key,
            world_cup_rows.display_gamertag,
            world_cup_rows.sports_gamer_player_url,
            world_cup_rows.team_external_id,
            world_cup_rows.country_code,
            world_cup_rows.country_name_sv,
            world_cup_rows.canonical_display_name,
            world_cup_rows.national_team_phrase_sv,
            world_cup_rows.league_id,
            world_cup_rows.season_label,
            world_cup_rows.chronology_date,
            world_cup_rows.appearance_games
           FROM world_cup_rows
          WHERE world_cup_rows.appearance_games > 0
        ), aggregated AS (
         SELECT played.player_key,
            played.team_external_id,
            played.country_code,
            played.country_name_sv,
            played.canonical_display_name,
            played.national_team_phrase_sv,
            sum(played.appearance_games)::bigint AS matches,
            count(DISTINCT played.league_id) AS tournaments
           FROM played
          GROUP BY played.player_key, played.team_external_id, played.country_code, played.country_name_sv, played.canonical_display_name, played.national_team_phrase_sv
        )
 SELECT player_key,
    ( SELECT w.display_gamertag
           FROM played w
          WHERE w.player_key = a.player_key AND w.team_external_id = a.team_external_id
          ORDER BY w.chronology_date DESC NULLS LAST, w.league_id DESC
         LIMIT 1) AS display_gamertag,
    ( SELECT w.sports_gamer_player_url
           FROM played w
          WHERE w.player_key = a.player_key AND w.team_external_id = a.team_external_id AND w.sports_gamer_player_url IS NOT NULL
          ORDER BY w.chronology_date DESC NULLS LAST, w.league_id DESC
         LIMIT 1) AS sports_gamer_player_url,
    team_external_id,
    country_code,
    country_name_sv,
    canonical_display_name,
    national_team_phrase_sv,
    matches,
    tournaments,
    ( SELECT w.season_label
           FROM played w
          WHERE w.player_key = a.player_key AND w.team_external_id = a.team_external_id
          ORDER BY w.chronology_date, w.league_id
         LIMIT 1) AS first_tournament_label,
    ( SELECT w.season_label
           FROM played w
          WHERE w.player_key = a.player_key AND w.team_external_id = a.team_external_id
          ORDER BY w.chronology_date DESC NULLS LAST, w.league_id DESC
         LIMIT 1) AS latest_tournament_label
   FROM aggregated a;;
