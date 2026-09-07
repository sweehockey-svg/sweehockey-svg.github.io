\set ON_ERROR_STOP on

-- Incremental refresh for current SportsGamer leagues only.
-- The full historical cache rebuild remains in refresh-swedish-player-web-cache.sql.
set statement_timeout = '10min';
set lock_timeout = '30s';

create temporary table current_league_ids (
  league_id bigint primary key
) on commit preserve rows;

insert into current_league_ids (league_id)
select distinct btrim(value)::bigint
from regexp_split_to_table(:'league_ids_csv', ',') value
where btrim(value) ~ '^[1-9][0-9]*$';

select 1 / case when count(*) > 0 then 1 else 0 end
  as league_id_safety_check_must_equal_1
from current_league_ids;

-- Refresh only the selected SportsGamer rows in the merged tournament table.
-- Existing tournament metadata is kept when available because it contains the
-- site's canonical competition/division/team mappings.
begin;

create temporary table current_player_web_stage
(like public.v_ehockey_player_tournaments_merged_v21_1 including defaults)
on commit preserve rows;

insert into current_player_web_stage
select (jsonb_populate_record(
  null::public.v_ehockey_player_tournaments_merged_v21_1,
  to_jsonb(source.*) || jsonb_build_object(
    'team_id', coalesce(existing.team_id, source.team_id),
    'team_is_linkable', coalesce(existing.team_is_linkable, source.team_is_linkable),
    'team_current_name', coalesce(existing.team_current_name, source.team_current_name),
    'team_name_in_tournament', coalesce(existing.team_name_in_tournament, source.team_name_in_tournament),
    'competition_code', coalesce(
      existing.competition_code,
      case
        when coalesce(source.season_label, source.league_name, '') ~* '(^|[^a-z])SEC([^a-z]|$)' then 'SEC'
        when coalesce(source.season_label, source.league_name, '') ~* 'world[[:space:]]*cup' then 'WORLD_CUP'
        when coalesce(source.season_label, source.league_name, '') ~* 'swedish championship league|(^|[^a-z])SCL([^a-z]|$)' then 'SCL'
        when coalesce(source.season_label, source.league_name, '') ~* 'european championship league|(^|[^a-z])ECL([^a-z]|$)' then 'ECL'
        when coalesce(source.season_label, source.league_name, '') ~* 'finnish championship league|(^|[^a-z])FCL([^a-z]|$)' then 'FCL'
        when coalesce(source.season_label, source.league_name, '') ~* 'german championship league|(^|[^a-z])GCL([^a-z]|$)' then 'GCL'
        when coalesce(source.season_label, source.league_name, '') ~* '(^|[^a-z])WECL([^a-z]|$)' then 'WECL'
        else source.competition_code
      end
    ),
    'competition_name', coalesce(
      existing.competition_name,
      case
        when coalesce(source.season_label, source.league_name, '') ~* '(^|[^a-z])SEC([^a-z]|$)' then 'Svenska eHockey Cupen'
        when coalesce(source.season_label, source.league_name, '') ~* 'world[[:space:]]*cup' then 'eHockey World Cup'
        when coalesce(source.season_label, source.league_name, '') ~* 'swedish championship league|(^|[^a-z])SCL([^a-z]|$)' then 'Swedish Championship League'
        when coalesce(source.season_label, source.league_name, '') ~* 'european championship league|(^|[^a-z])ECL([^a-z]|$)' then 'European Championship League'
        when coalesce(source.season_label, source.league_name, '') ~* 'finnish championship league|(^|[^a-z])FCL([^a-z]|$)' then 'Finnish Championship League'
        when coalesce(source.season_label, source.league_name, '') ~* 'german championship league|(^|[^a-z])GCL([^a-z]|$)' then 'German Championship League'
        else source.competition_name
      end
    ),
    'season_label', coalesce(existing.season_label, source.season_label),
    'season_number', coalesce(existing.season_number, source.season_number),
    'season_year', coalesce(existing.season_year, source.season_year),
    'season_period', coalesce(existing.season_period, source.season_period),
    'start_date', coalesce(existing.start_date, source.start_date),
    'end_date', coalesce(existing.end_date, source.end_date),
    'league_name', coalesce(existing.league_name, source.league_name),
    'division', coalesce(existing.division, source.division),
    'division_key', coalesce(existing.division_key, source.division_key),
    'sort_date', coalesce(source.sort_date, existing.sort_date)
  )
)).*
from public.v_ehockey_player_tournaments source
join current_league_ids selected
  on selected.league_id = source.league_id
left join lateral (
  select cached.*
  from public.v_ehockey_player_tournaments_merged_v21_1 cached
  where cached.player_source = 'SPORTSGAMER'
    and cached.player_key = source.player_key
    and cached.league_id = source.league_id
    and coalesce(cached.team_external_id, '') = coalesce(source.team_external_id, '')
  order by cached.sort_date desc nulls last
  limit 1
) existing on true
where source.player_source = 'SPORTSGAMER';

select 1 / case when count(*) > 0 then 1 else 0 end
  as web_stage_safety_check_must_equal_1
from current_player_web_stage;

delete from public.v_ehockey_player_tournaments_merged_v21_1 cached
using current_league_ids selected
where cached.player_source = 'SPORTSGAMER'
  and cached.league_id = selected.league_id;

insert into public.v_ehockey_player_tournaments_merged_v21_1
select * from current_player_web_stage;

commit;

analyze public.v_ehockey_player_tournaments_merged_v21_1;

-- Update only the selected tournament rows in the profile history cache.
select pg_advisory_lock(hashtext('seh_refresh_player_history_cache_v25'));

begin;

create temporary table current_player_history_stage
(like public.ehockey_player_history_cache_v25 including defaults)
on commit preserve rows;

with previous_ids as materialized (
  select player_key,
         max(effective_sports_gamer_player_id) as effective_sports_gamer_player_id
  from public.ehockey_player_history_cache_v25
  where effective_sports_gamer_player_id is not null
  group by player_key
)
insert into current_player_history_stage
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
join current_league_ids selected
  on source.external_league_id = selected.league_id::text
left join previous_ids previous using (player_key)
where source.player_source = 'SPORTSGAMER';

select 1 / case when count(*) > 0 then 1 else 0 end
  as history_stage_safety_check_must_equal_1
from current_player_history_stage;

delete from public.ehockey_player_history_cache_v25 cached
using current_league_ids selected
where cached.player_source = 'SPORTSGAMER'
  and cached.external_league_id = selected.league_id::text;

insert into public.ehockey_player_history_cache_v25
select * from current_player_history_stage;

commit;

analyze public.ehockey_player_history_cache_v25;
select public.refresh_app_player_directory_cache();
select public.refresh_app_player_ranking_cache();
select pg_advisory_unlock(hashtext('seh_refresh_player_history_cache_v25'));

select
  (select count(*) from current_player_web_stage) as refreshed_tournament_rows,
  (select count(*) from current_player_history_stage) as refreshed_history_rows,
  (select count(*) from current_league_ids) as refreshed_leagues;
