\set ON_ERROR_STOP on

-- This script commits several independently validated cache stages. Session
-- settings must therefore survive those commits, especially for the final
-- player-history rebuild which can take longer than the project default.
set statement_timeout = '15min';
set lock_timeout = '30s';

begin;

create temporary table swedish_player_web_stage
(like public.v_ehockey_player_tournaments_merged_v21_1 including defaults)
on commit drop;

insert into swedish_player_web_stage (
  player_key, player_source, display_gamertag, psn_tag, xbox_gamertag,
  player_number, captain_role, listed_in_roster, has_full_license,
  has_backup_license, has_any_statistics, player_country, player_image,
  sports_gamer_player_url, team_id, team_is_linkable, team_external_id,
  team_current_name, team_name_in_tournament, competition_code,
  competition_name, season_label, season_number, season_year, season_period,
  start_date, end_date, league_id, external_league_id, league_name, division,
  division_key, sort_date, primary_position, player_type,
  regular_skater_games, regular_goals, regular_assists, regular_points,
  regular_penalty_minutes, playoff_skater_games, playoff_goals,
  playoff_assists, playoff_points, playoff_penalty_minutes, total_skater_games,
  total_goals, total_assists, total_points, total_plus_minus,
  total_penalty_minutes, regular_goalie_games, regular_goalie_wins,
  regular_goalie_losses, regular_goalie_overtime_losses, regular_goalie_saves,
  regular_goalie_shots_against, regular_goalie_goals_allowed,
  regular_goalie_save_percentage, regular_goalie_goals_against_average,
  regular_goalie_shutouts, playoff_goalie_games, playoff_goalie_wins,
  playoff_goalie_losses, playoff_goalie_overtime_losses, playoff_goalie_saves,
  playoff_goalie_shots_against, playoff_goalie_goals_allowed,
  playoff_goalie_save_percentage, playoff_goalie_goals_against_average,
  playoff_goalie_shutouts, total_goalie_games, total_goalie_wins,
  total_goalie_losses, total_goalie_overtime_losses, total_goalie_saves,
  total_goalie_shots_against, total_goalie_goals_allowed,
  total_goalie_save_percentage, total_goalie_goals_against_average,
  total_goalie_shutouts
)
with linked_tournaments as (
  select distinct on (external_league_id, sports_gamer_team_id)
    tournament.*
  from public.v_ehockey_team_tournaments_chronological tournament
  where tournament.sports_gamer_team_id is not null
  order by external_league_id, sports_gamer_team_id,
           has_statistics desc, sort_date desc nulls last, league_id desc
),
source_rows as (
  select player.*
  from public.sportsgamer_team_player_stats player
  join public.v_ehockey_player_registry registry
    on registry.sports_gamer_player_id = player.sports_gamer_player_id
   and registry.country_code = 'SE'
)
select
  encode(digest('SPORTSGAMER:' || player.sports_gamer_player_id::text, 'sha256'), 'hex'),
  'SPORTSGAMER'::text,
  player.display_gamertag, player.psn_tag, player.xbox_gamertag,
  player.player_number, player.captain_role,
  player.listed_in_roster = 1,
  player.has_full_license = 1,
  player.has_backup_license = 1,
  player.has_any_statistics = 1 or
    coalesce(player.regular_skater_games,0) + coalesce(player.playoff_skater_games,0) +
    coalesce(player.regular_goalie_games,0) + coalesce(player.playoff_goalie_games,0) > 0,
  nullif(trim(player.player_country),''), player.player_image,
  player.sports_gamer_player_url,
  tournament.team_id,
  tournament.team_id is not null,
  player.sports_gamer_team_id::text,
  coalesce(tournament.current_name, nullif(trim(player.current_global_team_name),''),
           nullif(trim(player.team_name_in_league),''), 'Okänt lag'),
  coalesce(tournament.name_used_in_tournament, nullif(trim(player.team_name_in_league),''),
           nullif(trim(player.current_global_team_name),''), 'Okänt lag'),
  coalesce(tournament.competition_code,
    case
      when coalesce(player.official_league_name,'') ~* 'swedish championship league|(^|[^a-z])scl([^a-z]|$)' then 'SCL'
      when coalesce(player.official_league_name,'') ~* 'european championship league|(^|[^a-z])ecl([^a-z]|$)' then 'ECL'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])eshl([^a-z]|$)' then 'ESHL'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])sec([^a-z]|$)' then 'SEC'
      when coalesce(player.official_league_name,'') ~* 'world cup' then 'WORLD_CUP'
      else 'SPORTSGAMER'
    end),
  coalesce(tournament.competition_name,
    case
      when coalesce(player.official_league_name,'') ~* 'swedish championship league|(^|[^a-z])scl([^a-z]|$)' then 'Swedish Championship League'
      when coalesce(player.official_league_name,'') ~* 'european championship league|(^|[^a-z])ecl([^a-z]|$)' then 'European Championship League'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])eshl([^a-z]|$)' then 'eSHL'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])sec([^a-z]|$)' then 'Svenska eHockey Cupen'
      when coalesce(player.official_league_name,'') ~* 'world cup' then 'eHockey World Cup'
      else 'SportsGamer'
    end),
  coalesce(nullif(trim(player.official_league_name),''), tournament.season_label, 'Okänd turnering'),
  coalesce(tournament.season_number::text,
           substring(coalesce(player.official_league_name,'') from '([0-9]+(\.[0-9]+)?)')),
  coalesce(tournament.season_year,
           extract(year from coalesce(
             case when player.regular_season_end between date '1980-01-01' and date '2099-12-31' then player.regular_season_end end,
             case when player.registration_end between date '1980-01-01' and date '2099-12-31' then player.registration_end end
           ))::integer),
  coalesce(tournament.season_period,
    case
      when coalesce(player.official_league_name,'') ~* 'winter' then 'Winter'
      when coalesce(player.official_league_name,'') ~* 'spring' then 'Spring'
      when coalesce(player.official_league_name,'') ~* 'sommar|summer' then 'Summer'
      else null
    end),
  coalesce(case when player.registration_end between date '1980-01-01' and date '2099-12-31' then player.registration_end end,
           tournament.start_date),
  coalesce(case when player.regular_season_end between date '1980-01-01' and date '2099-12-31' then player.regular_season_end end,
           tournament.end_date),
  player.sports_gamer_league_id::bigint,
  player.sports_gamer_league_id::text,
  coalesce(nullif(trim(player.official_league_name),''), tournament.league_name, 'Okänd turnering'),
  coalesce(tournament.division,
    case
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])elite([^a-z]|$)' then 'Elite'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])pro([^a-z]|$)' then 'Pro'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])lite([^a-z]|$)' then 'Lite'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])core([^a-z]|$)' then 'Core'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])neo([^a-z]|$)' then 'Neo'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])main([^a-z]|$)' then 'Main'
      else null
    end),
  lower(coalesce(tournament.division_key,
    case
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])elite([^a-z]|$)' then 'elite'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])pro([^a-z]|$)' then 'pro'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])lite([^a-z]|$)' then 'lite'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])core([^a-z]|$)' then 'core'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])neo([^a-z]|$)' then 'neo'
      when coalesce(player.official_league_name,'') ~* '(^|[^a-z])main([^a-z]|$)' then 'main'
      else null
    end)),
  greatest(
    case when player.regular_season_end between date '1980-01-01' and date '2099-12-31' then player.regular_season_end end,
    case when player.registration_end between date '1980-01-01' and date '2099-12-31' then player.registration_end end,
    tournament.sort_date),
  coalesce(player.regular_skater_position_abbreviation,
           player.playoff_skater_position_abbreviation,
           player.roster_preferred_position_abbreviation,
           player.global_preferred_position_abbreviation,
           case when coalesce(player.regular_goalie_games,0)+coalesce(player.playoff_goalie_games,0)>0 then 'G' end),
  case
    when coalesce(player.regular_goalie_games,0)+coalesce(player.playoff_goalie_games,0)>0
     and coalesce(player.regular_skater_games,0)+coalesce(player.playoff_skater_games,0)>0 then 'hybrid'
    when coalesce(player.regular_goalie_games,0)+coalesce(player.playoff_goalie_games,0)>0 then 'goalie'
    when coalesce(player.regular_skater_games,0)+coalesce(player.playoff_skater_games,0)>0 then 'skater'
    else 'roster'
  end,
  player.regular_skater_games, player.regular_goals, player.regular_assists,
  player.regular_points, player.regular_penalty_minutes,
  player.playoff_skater_games, player.playoff_goals, player.playoff_assists,
  player.playoff_points, player.playoff_penalty_minutes,
  coalesce(player.regular_skater_games,0)+coalesce(player.playoff_skater_games,0),
  coalesce(player.regular_goals,0)+coalesce(player.playoff_goals,0),
  coalesce(player.regular_assists,0)+coalesce(player.playoff_assists,0),
  coalesce(player.regular_points,0)+coalesce(player.playoff_points,0),
  coalesce(player.regular_plus_minus,0)+coalesce(player.playoff_plus_minus,0),
  coalesce(player.regular_penalty_minutes,0)+coalesce(player.playoff_penalty_minutes,0),
  player.regular_goalie_games, player.regular_goalie_wins, player.regular_goalie_losses,
  player.regular_goalie_overtime_losses, player.regular_goalie_saves,
  player.regular_goalie_shots_against, player.regular_goalie_goals_allowed,
  player.regular_goalie_save_percentage, player.regular_goalie_goals_against_average,
  player.regular_goalie_shutouts,
  player.playoff_goalie_games, player.playoff_goalie_wins, player.playoff_goalie_losses,
  player.playoff_goalie_overtime_losses, player.playoff_goalie_saves,
  player.playoff_goalie_shots_against, player.playoff_goalie_goals_allowed,
  player.playoff_goalie_save_percentage, player.playoff_goalie_goals_against_average,
  player.playoff_goalie_shutouts,
  coalesce(player.regular_goalie_games,0)+coalesce(player.playoff_goalie_games,0),
  coalesce(player.regular_goalie_wins,0)+coalesce(player.playoff_goalie_wins,0),
  coalesce(player.regular_goalie_losses,0)+coalesce(player.playoff_goalie_losses,0),
  coalesce(player.regular_goalie_overtime_losses,0)+coalesce(player.playoff_goalie_overtime_losses,0),
  coalesce(player.regular_goalie_saves,0)+coalesce(player.playoff_goalie_saves,0),
  coalesce(player.regular_goalie_shots_against,0)+coalesce(player.playoff_goalie_shots_against,0),
  coalesce(player.regular_goalie_goals_allowed,0)+coalesce(player.playoff_goalie_goals_allowed,0),
  case when coalesce(player.regular_goalie_shots_against,0)+coalesce(player.playoff_goalie_shots_against,0)>0
    then round((coalesce(player.regular_goalie_saves,0)+coalesce(player.playoff_goalie_saves,0))::numeric /
               (coalesce(player.regular_goalie_shots_against,0)+coalesce(player.playoff_goalie_shots_against,0))::numeric,4) end,
  case when coalesce(player.regular_goalie_games,0)+coalesce(player.playoff_goalie_games,0)>0
    then round((coalesce(player.regular_goalie_goals_allowed,0)+coalesce(player.playoff_goalie_goals_allowed,0))::numeric /
               (coalesce(player.regular_goalie_games,0)+coalesce(player.playoff_goalie_games,0))::numeric,2) end,
  coalesce(player.regular_goalie_shutouts,0)+coalesce(player.playoff_goalie_shutouts,0)
from source_rows player
left join linked_tournaments tournament
  on tournament.external_league_id = player.sports_gamer_league_id::text
 and tournament.sports_gamer_team_id = player.sports_gamer_team_id::text;

select 1 / case
  when (select count(*) from swedish_player_web_stage) >= 1000
   and (select count(*) from swedish_player_web_stage) =
       (select count(*) from public.sportsgamer_team_player_stats player
        join public.v_ehockey_player_registry registry
          on registry.sports_gamer_player_id=player.sports_gamer_player_id
         and registry.country_code='SE')
  then 1 else 0 end as cache_safety_check_must_equal_1;

delete from public.v_ehockey_player_tournaments_merged_v21_1 current
using swedish_player_web_stage stage
where current.player_source='SPORTSGAMER'
  and current.player_key=stage.player_key
  and current.league_id=stage.league_id
  and current.team_external_id=stage.team_external_id;

insert into public.v_ehockey_player_tournaments_merged_v21_1
select * from swedish_player_web_stage;

commit;

refresh materialized view concurrently
  public.v_ehockey_team_all_time_players_chronological;

analyze public.v_ehockey_player_tournaments_merged_v21_1;

select count(*)::bigint as cached_swedish_rows,
       count(*) filter (where league_id=521)::bigint as cached_sec_sommar26_rows
from public.v_ehockey_player_tournaments_merged_v21_1
where player_source='SPORTSGAMER'
  and player_key in (
    select encode(digest('SPORTSGAMER:' || sports_gamer_player_id::text,'sha256'),'hex')
    from public.v_ehockey_player_registry where country_code='SE'
  );

-- Spelarprofilerna läser en separat historikcache. Bygg nästa version helt
-- innan den befintliga tabellen låses, validera radantalet och gör sedan ett
-- kort atomiskt byte. På så sätt blir nya turneringar synliga även på
-- profilsidan utan en manuell cachekörning.
select pg_advisory_lock(hashtext('seh_refresh_player_history_cache_v25'));

create temp table swedish_player_history_cache_next
(like public.ehockey_player_history_cache_v25 including defaults)
on commit preserve rows;

with previous_ids as materialized (
  select player_key, max(effective_sports_gamer_player_id) as effective_sports_gamer_player_id
  from public.ehockey_player_history_cache_v25
  where effective_sports_gamer_player_id is not null
  group by player_key
)
insert into swedish_player_history_cache_next
select (jsonb_populate_record(
  null::public.ehockey_player_history_cache_v25,
  to_jsonb(source.*) || jsonb_build_object(
    'effective_sports_gamer_player_id',
    coalesce(
      case
        when source.sports_gamer_player_url ~ '/players/[0-9]+'
          then substring(source.sports_gamer_player_url from '/players/([0-9]+)')::bigint
        else null
      end,
      previous.effective_sports_gamer_player_id
    )
  )
)).* 
from public.v_ehockey_player_tournaments_chronological_canonical_v13 source
left join previous_ids previous using (player_key);

do $$
declare
  current_count bigint;
  next_count bigint;
begin
  select count(*) into current_count
  from public.ehockey_player_history_cache_v25;

  select count(*) into next_count
  from swedish_player_history_cache_next;

  if next_count < greatest(1000, floor(current_count * 0.95)::bigint) then
    raise exception
      'Player history cache safety check failed: current %, next %',
      current_count,
      next_count;
  end if;
end
$$;

begin;
delete from public.ehockey_player_history_cache_v25;
insert into public.ehockey_player_history_cache_v25
select * from swedish_player_history_cache_next;
commit;

analyze public.ehockey_player_history_cache_v25;
select public.refresh_app_player_directory_cache();
select public.refresh_app_player_ranking_cache();
select pg_advisory_unlock(hashtext('seh_refresh_player_history_cache_v25'));

select count(*)::bigint as cached_player_history_rows,
       count(*) filter (where league_id=521)::bigint as cached_history_sec_sommar26_rows
from public.ehockey_player_history_cache_v25;
