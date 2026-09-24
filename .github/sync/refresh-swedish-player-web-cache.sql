\set ON_ERROR_STOP on

-- Full Swedish player cache refresh.
-- Preserve historical rows that are no longer present in the current import,
-- and replace only natural SportsGamer keys delivered by the fresh source.
set statement_timeout = '20min';
set lock_timeout = '30s';

select pg_advisory_lock(hashtext('seh_refresh_player_history_cache_v25'));

create temporary table fresh_swedish_history
(like public.ehockey_player_history_cache_v25 including defaults)
on commit preserve rows;

insert into fresh_swedish_history
select (jsonb_populate_record(
  null::public.ehockey_player_history_cache_v25,
  to_jsonb(source.*) || jsonb_build_object(
    'player_key', canonical.player_key,
    'display_gamertag', coalesce(identity_override.display_gamertag, registry.display_gamertag, source.display_gamertag),
    'sports_gamer_player_url', 'https://sportsgamer.gg/players/' || registry.sports_gamer_player_id::text,
    'team_id', coalesce(existing.team_id, source.team_id),
    'team_is_linkable', coalesce(existing.team_is_linkable, source.team_is_linkable),
    'team_current_name', coalesce(existing.team_current_name, source.team_current_name),
    'team_name_in_tournament', coalesce(existing.team_name_in_tournament, source.team_name_in_tournament),
    'competition_code', coalesce(existing.competition_code, source.competition_code),
    'competition_name', coalesce(existing.competition_name, source.competition_name),
    'season_label', coalesce(existing.season_label, source.season_label),
    'season_number', coalesce(existing.season_number, source.season_number),
    'season_year', coalesce(existing.season_year, source.season_year),
    'season_period', coalesce(existing.season_period, source.season_period),
    'start_date', coalesce(existing.start_date, source.start_date),
    'end_date', coalesce(source.end_date, existing.end_date),
    'league_name', coalesce(existing.league_name, source.league_name),
    'division', coalesce(existing.division, source.division),
    'division_key', coalesce(existing.division_key, source.division_key),
    'sort_date', coalesce(source.sort_date, existing.sort_date),
    'effective_sports_gamer_player_id', registry.sports_gamer_player_id,
    'chronology_date', coalesce(existing.chronology_date, source.sort_date, source.start_date, source.end_date),
    'chronology_source', coalesce(existing.chronology_source, 'sportsgamer_full_sync'),
    'appearance_games', greatest(coalesce(source.total_skater_games, 0), coalesce(source.total_goalie_games, 0)),
    'is_goalie_only',
      coalesce(source.total_goalie_games, 0) > 0
      and (
        lower(btrim(coalesce(source.player_type, ''))) = 'goalie'
        or (
          upper(btrim(coalesce(source.primary_position, ''))) = 'G'
          and coalesce(source.total_goals, 0) = 0
          and coalesce(source.total_assists, 0) = 0
          and coalesce(source.total_points, 0) = 0
          and coalesce(source.total_goalie_games, 0) >= coalesce(source.total_skater_games, 0)
        )
      ),
    'chronology_end_date', coalesce(existing.chronology_end_date, source.end_date, source.sort_date, source.start_date),
    'display_start_date', coalesce(source.start_date, source.sort_date, source.end_date),
    'display_end_date', coalesce(source.end_date, source.sort_date, source.start_date)
  )
)).*
from public.v_ehockey_player_tournaments source
cross join lateral (
  select case
           when source.sports_gamer_player_url ~ '/players/[0-9]+'
             then substring(source.sports_gamer_player_url from '/players/([0-9]+)')::bigint
           else null
         end as sports_gamer_player_id
) parsed
left join public.player_identity_overrides identity_override
  on identity_override.player_key = source.player_key
join public.v_ehockey_player_registry registry
  on registry.sports_gamer_player_id = coalesce(
       identity_override.sports_gamer_player_id,
       parsed.sports_gamer_player_id
     )
 and registry.country_code = 'SE'
cross join lateral (
  select encode(
           digest('SPORTSGAMER:' || registry.sports_gamer_player_id::text, 'sha256'),
           'hex'
         ) as player_key
) canonical
left join lateral (
  select cached.*
  from public.ehockey_player_history_cache_v25 cached
  where cached.player_source = 'SPORTSGAMER'
    and cached.player_key = canonical.player_key
    and cached.league_id = source.league_id
    and coalesce(cached.team_external_id, '') = coalesce(source.team_external_id, '')
  order by cached.sort_date desc nulls last
  limit 1
) existing on true
where source.player_source = 'SPORTSGAMER';

select 1 / case when count(*) >= 1000 then 1 else 0 end
  as fresh_history_safety_check_must_equal_1
from fresh_swedish_history;

create temporary table swedish_player_history_cache_next
(like public.ehockey_player_history_cache_v25 including defaults)
on commit preserve rows;

insert into swedish_player_history_cache_next
select *
from public.ehockey_player_history_cache_v25;

delete from swedish_player_history_cache_next cached
using fresh_swedish_history fresh
where cached.player_source = 'SPORTSGAMER'
  and cached.player_key = fresh.player_key
  and cached.league_id = fresh.league_id
  and coalesce(cached.team_external_id, '') = coalesce(fresh.team_external_id, '');

insert into swedish_player_history_cache_next
select *
from fresh_swedish_history;

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
select *
from swedish_player_history_cache_next;
commit;

analyze public.ehockey_player_history_cache_v25;
refresh materialized view concurrently
  public.v_ehockey_team_all_time_players_chronological;
refresh materialized view concurrently
  public.v_ehockey_swedish_player_directory_base_v20;
select public.refresh_app_player_directory_cache();
select public.refresh_app_player_ranking_cache();
select public.refresh_app_team_latest_leadership_cache();
select pg_advisory_unlock(hashtext('seh_refresh_player_history_cache_v25'));

select
  (select count(*) from public.ehockey_player_history_cache_v25)
    as cached_player_history_rows,
  (select count(*) from fresh_swedish_history)
    as refreshed_sportsgamer_rows;
