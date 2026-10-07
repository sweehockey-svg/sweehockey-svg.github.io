-- Broadcast graphics must prefer admin-approved player portraits over SportsGamer source images.
-- This also covers foreign SCL players whose portrait exists only in ehockey_player_self_profiles.

create or replace view public.v_broadcast_players_public as
with base as (
  select
    p.sports_gamer_league_id,
    p.sports_gamer_team_id,
    p.team_name_in_league,
    p.sports_gamer_player_id,
    p.display_gamertag,
    p.player_number,
    p.player_country,
    p.player_image,
    p.roster_preferred_position_abbreviation,
    p.regular_skater_position_abbreviation,
    p.playoff_skater_position_abbreviation,
    p.regular_skater_games,
    p.regular_goals,
    p.regular_assists,
    p.regular_points,
    p.playoff_skater_games,
    p.playoff_goals,
    p.playoff_assists,
    p.playoff_points,
    p.regular_goalie_games,
    p.regular_goalie_goals_against_average,
    p.regular_goalie_shutouts,
    p.playoff_goalie_games,
    p.playoff_goalie_goals_against_average,
    p.playoff_goalie_shutouts,
    p.sports_gamer_player_url,
    p.regular_faceoff_wins,
    p.regular_faceoff_losses,
    p.playoff_faceoff_wins,
    p.playoff_faceoff_losses,
    coalesce(
      p.regular_goalie_save_percentage,
      case
        when (coalesce(p.regular_goalie_saves,0) + coalesce(p.regular_goalie_goals_allowed,0)) > 0
          then p.regular_goalie_saves::numeric
               / (p.regular_goalie_saves + p.regular_goalie_goals_allowed)::numeric
        else null::numeric
      end
    )::numeric(12,4) as regular_goalie_save_percentage,
    coalesce(
      p.playoff_goalie_save_percentage,
      case
        when (coalesce(p.playoff_goalie_saves,0) + coalesce(p.playoff_goalie_goals_allowed,0)) > 0
          then p.playoff_goalie_saves::numeric
               / (p.playoff_goalie_saves + p.playoff_goalie_goals_allowed)::numeric
        else null::numeric
      end
    )::numeric(12,4) as playoff_goalie_save_percentage,
    p.regular_penalty_minutes,
    p.playoff_penalty_minutes
  from public.sportsgamer_team_player_stats p
  where p.sports_gamer_league_id = any(array[520::bigint,523::bigint,524::bigint,525::bigint,526::bigint,527::bigint,529::bigint])

  union all

  select
    r.sports_gamer_league_id,
    r.sports_gamer_team_id,
    coalesce(t.team_name, 'TEAM ' || r.sports_gamer_team_id::text) as team_name_in_league,
    r.sports_gamer_player_id,
    r.display_gamertag,
    r.player_number::bigint as player_number,
    r.player_country,
    r.player_image,
    r.preferred_position as roster_preferred_position_abbreviation,
    null::text as regular_skater_position_abbreviation,
    null::text as playoff_skater_position_abbreviation,
    null::bigint as regular_skater_games,
    null::bigint as regular_goals,
    null::bigint as regular_assists,
    null::bigint as regular_points,
    null::bigint as playoff_skater_games,
    null::bigint as playoff_goals,
    null::bigint as playoff_assists,
    null::bigint as playoff_points,
    null::bigint as regular_goalie_games,
    null::numeric as regular_goalie_goals_against_average,
    null::bigint as regular_goalie_shutouts,
    null::bigint as playoff_goalie_games,
    null::numeric as playoff_goalie_goals_against_average,
    null::bigint as playoff_goalie_shutouts,
    null::text as sports_gamer_player_url,
    null::bigint as regular_faceoff_wins,
    null::bigint as regular_faceoff_losses,
    null::bigint as playoff_faceoff_wins,
    null::bigint as playoff_faceoff_losses,
    null::numeric(12,4) as regular_goalie_save_percentage,
    null::numeric(12,4) as playoff_goalie_save_percentage,
    null::bigint as regular_penalty_minutes,
    null::bigint as playoff_penalty_minutes
  from public.sportsgamer_league_roster_current r
  left join public.sportsgamer_league_teams_current t
    on t.sports_gamer_league_id = r.sports_gamer_league_id
   and t.sports_gamer_team_id = r.sports_gamer_team_id
  where r.sports_gamer_league_id = any(array[520::bigint,523::bigint,524::bigint,525::bigint,526::bigint,527::bigint,529::bigint])
    and coalesce(r.is_available,true)
    and not exists (
      select 1
      from public.sportsgamer_team_player_stats p
      where p.sports_gamer_league_id = r.sports_gamer_league_id
        and p.sports_gamer_team_id = r.sports_gamer_team_id
        and p.sports_gamer_player_id = r.sports_gamer_player_id
    )
)
select
  b.sports_gamer_league_id,
  b.sports_gamer_team_id,
  b.team_name_in_league,
  b.sports_gamer_player_id,
  b.display_gamertag,
  b.player_number,
  b.player_country,
  coalesce(profile.image_url, b.player_image) as player_image,
  b.roster_preferred_position_abbreviation,
  b.regular_skater_position_abbreviation,
  b.playoff_skater_position_abbreviation,
  b.regular_skater_games,
  b.regular_goals,
  b.regular_assists,
  b.regular_points,
  b.playoff_skater_games,
  b.playoff_goals,
  b.playoff_assists,
  b.playoff_points,
  b.regular_goalie_games,
  b.regular_goalie_goals_against_average,
  b.regular_goalie_shutouts,
  b.playoff_goalie_games,
  b.playoff_goalie_goals_against_average,
  b.playoff_goalie_shutouts,
  b.sports_gamer_player_url,
  b.regular_faceoff_wins,
  b.regular_faceoff_losses,
  b.playoff_faceoff_wins,
  b.playoff_faceoff_losses,
  b.regular_goalie_save_percentage,
  b.playoff_goalie_save_percentage,
  b.regular_penalty_minutes,
  b.playoff_penalty_minutes
from base b
left join lateral (
  select p.image_url
  from public.v_ehockey_player_self_profiles_public p
  where p.sports_gamer_player_id = b.sports_gamer_player_id::text
    and nullif(btrim(p.image_url),'') is not null
  order by p.approved_at desc nulls last, p.updated_at desc nulls last
  limit 1
) profile on true;
