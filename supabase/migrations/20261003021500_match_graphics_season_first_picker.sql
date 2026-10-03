create or replace function public.seh_match_graphics_seasons()
returns table (
  league_id bigint,
  season_label text,
  competition_code text,
  latest_date date,
  team_count bigint,
  player_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      h.league_id,
      h.season_label,
      h.competition_code,
      h.chronology_date,
      h.team_id,
      h.player_key
    from public.ehockey_player_history_cache_v25 h
    where h.league_id is not null
      and h.team_id is not null
  ),
  labels as (
    select
      league_id,
      season_label,
      competition_code,
      count(*) as row_count,
      row_number() over (
        partition by league_id
        order by count(*) desc, max(chronology_date) desc nulls last, season_label desc
      ) as rn
    from base
    group by league_id, season_label, competition_code
  ),
  agg as (
    select
      league_id,
      max(chronology_date) as latest_date,
      count(distinct team_id) as team_count,
      count(distinct player_key) as player_count
    from base
    group by league_id
  )
  select
    a.league_id,
    coalesce(nullif(trim(l.season_label), ''), 'Säsong ' || a.league_id::text) as season_label,
    coalesce(nullif(trim(l.competition_code), ''), 'Övrigt') as competition_code,
    a.latest_date,
    a.team_count,
    a.player_count
  from agg a
  left join labels l
    on l.league_id = a.league_id
   and l.rn = 1
  order by a.latest_date desc nulls last, a.league_id desc;
$$;

create or replace function public.seh_match_graphics_season_snapshot(
  p_league_id bigint
)
returns table (
  team_id bigint,
  player_key text,
  display_gamertag text,
  player_country text,
  player_image text,
  sports_gamer_player_url text,
  primary_position text,
  player_type text,
  league_id bigint,
  competition_code text,
  competition_name text,
  season_label text,
  division text,
  chronology_date date,
  team_name_in_tournament text,
  team_current_name text,
  team_external_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.team_id,
    h.player_key,
    h.display_gamertag,
    h.player_country,
    h.player_image,
    h.sports_gamer_player_url,
    h.primary_position,
    h.player_type,
    h.league_id,
    h.competition_code,
    h.competition_name,
    h.season_label,
    h.division,
    h.chronology_date,
    h.team_name_in_tournament,
    h.team_current_name,
    h.team_external_id
  from public.ehockey_player_history_cache_v25 h
  where h.league_id = p_league_id
    and h.team_id is not null
    and trim(coalesce(h.display_gamertag, '')) <> ''
  order by
    h.team_id,
    h.chronology_date desc nulls last,
    h.display_gamertag asc;
$$;

revoke all on function public.seh_match_graphics_seasons() from public;
revoke all on function public.seh_match_graphics_season_snapshot(bigint) from public;

grant execute on function public.seh_match_graphics_seasons()
  to anon, authenticated, service_role;
grant execute on function public.seh_match_graphics_season_snapshot(bigint)
  to anon, authenticated, service_role;
