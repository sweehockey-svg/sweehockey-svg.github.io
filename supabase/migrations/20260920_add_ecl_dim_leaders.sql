
create table if not exists public.ehockey_ecl_dim_leaders_cache_v1 (
  league_id bigint not null,
  season_label text not null,
  chronology_date date,
  player_key text not null,
  sports_gamer_player_id bigint not null,
  display_gamertag text not null,
  team_id bigint not null,
  team_name text,
  defender_games bigint not null,
  team_games bigint not null,
  match_share numeric(7,2) not null,
  takeaways bigint not null,
  interceptions bigint not null,
  blocked_shots bigint not null,
  dim numeric(8,2) not null,
  is_tied boolean not null default false,
  refreshed_at timestamptz not null default now(),
  primary key (league_id, player_key)
);

create index if not exists idx_ehockey_ecl_dim_leaders_player
  on public.ehockey_ecl_dim_leaders_cache_v1(player_key);

alter table public.ehockey_ecl_dim_leaders_cache_v1 enable row level security;

drop policy if exists "Public read ECL DIM leaders" on public.ehockey_ecl_dim_leaders_cache_v1;
create policy "Public read ECL DIM leaders"
on public.ehockey_ecl_dim_leaders_cache_v1
for select
to anon, authenticated
using (true);

revoke all on public.ehockey_ecl_dim_leaders_cache_v1 from public;
grant select on public.ehockey_ecl_dim_leaders_cache_v1 to anon,authenticated,service_role;

create or replace function public.refresh_ehockey_ecl_dim_leaders_cache_v1()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='4min'
as $function$
declare
  inserted_count bigint;
begin
  truncate table public.ehockey_ecl_dim_leaders_cache_v1;

  insert into public.ehockey_ecl_dim_leaders_cache_v1 (
    league_id,season_label,chronology_date,
    player_key,sports_gamer_player_id,display_gamertag,
    team_id,team_name,defender_games,team_games,match_share,
    takeaways,interceptions,blocked_shots,dim,is_tied,refreshed_at
  )
  with candidates as (
    select
      s.sports_gamer_league_id::bigint as league_id,
      coalesce(nullif(trim(c.display_name),''),'ECL') as season_label,
      c.chronology_date,
      d.player_key,
      s.sports_gamer_player_id::bigint,
      max(d.display_gamertag) as display_gamertag,
      s.sports_gamer_team_id::bigint as team_id,
      max(nullif(trim(s.team_name_in_league),'')) as team_name,
      sum(coalesce(s.regular_skater_games,0))::bigint as defender_games,
      max(t.games_played)::bigint as team_games,
      sum(coalesce(s.regular_takeaways,0))::bigint as takeaways,
      sum(coalesce(s.regular_interceptions,0))::bigint as interceptions,
      sum(coalesce(s.regular_blocked_shots,0))::bigint as blocked_shots
    from public.sportsgamer_team_player_stats s
    join public.app_player_directory_cache d
      on d.sports_gamer_player_url=s.sports_gamer_player_url
    join public.v_ehockey_league_catalog_v1 c
      on c.league_id=s.sports_gamer_league_id
    join public.sportsgamer_team_tournament_stats t
      on t.sports_gamer_league_id=s.sports_gamer_league_id
     and t.sports_gamer_team_id=s.sports_gamer_team_id
     and lower(coalesce(t.statistics_stage,''))='regular'
    where upper(coalesce(c.competition_code,''))='ECL'
      and coalesce(c.source_match_count,0)>0
      and lower(coalesce(c.source_league_name,c.display_name,s.official_league_name,'')) !~
        '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|legacy|all[- ]?star|cooldown|tbc)'
      and upper(coalesce(s.regular_skater_position_abbreviation,'')) in ('LD','RD')
      and coalesce(s.regular_skater_games,0)>0
    group by
      s.sports_gamer_league_id,c.display_name,c.chronology_date,
      d.player_key,s.sports_gamer_player_id,s.sports_gamer_team_id
  ),
  eligible as (
    select
      c.*,
      round(
        (c.takeaways+c.interceptions+c.blocked_shots)::numeric
        / nullif(c.defender_games,0),
        2
      ) as dim,
      round(c.defender_games*100.0/nullif(c.team_games,0),2) as match_share
    from candidates c
    where c.team_games>0
      and c.defender_games*100.0/c.team_games >= 59
      and (c.takeaways+c.interceptions+c.blocked_shots)>0
  ),
  ranked as (
    select
      e.*,
      dense_rank() over(partition by e.league_id order by e.dim desc) as dim_rank,
      count(*) over(partition by e.league_id,e.dim) as tie_count
    from eligible e
  )
  select
    league_id,season_label,chronology_date,
    player_key,sports_gamer_player_id,display_gamertag,
    team_id,team_name,defender_games,team_games,match_share,
    takeaways,interceptions,blocked_shots,dim,
    tie_count>1,
    now()
  from ranked
  where dim_rank=1;

  get diagnostics inserted_count = row_count;
  analyze public.ehockey_ecl_dim_leaders_cache_v1;
  return inserted_count;
end;
$function$;

revoke all on function public.refresh_ehockey_ecl_dim_leaders_cache_v1() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_ecl_dim_leaders_cache_v1() to service_role;

drop function if exists public.seh_recordbook_ecl_dim_titles_v1(integer);
create function public.seh_recordbook_ecl_dim_titles_v1(p_limit integer default 2000)
returns table(
  player_key text,
  display_gamertag text,
  player_image text,
  sports_gamer_player_url text,
  primary_position text,
  games bigint,
  dim_titles bigint,
  latest_dim numeric,
  latest_season text,
  latest_team text,
  latest_match_share numeric
)
language sql
stable
security definer
set search_path=public
as $function$
  with agg as (
    select
      l.player_key,
      count(*)::bigint as dim_titles,
      (array_agg(l.dim order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_dim,
      (array_agg(l.season_label order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_season,
      (array_agg(l.team_name order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_team,
      (array_agg(l.match_share order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_match_share
    from public.ehockey_ecl_dim_leaders_cache_v1 l
    group by l.player_key
  ),
  career as (
    select player_key,games
    from public.seh_recordbook_players_v3('ECL',5000)
  )
  select
    a.player_key,
    d.display_gamertag,
    d.player_image,
    d.sports_gamer_player_url,
    d.primary_position,
    coalesce(c.games,0)::bigint,
    a.dim_titles,
    a.latest_dim,
    a.latest_season,
    a.latest_team,
    a.latest_match_share
  from agg a
  join public.app_player_directory_cache d using(player_key)
  left join career c using(player_key)
  order by a.dim_titles desc,a.latest_dim desc,d.display_gamertag asc
  limit greatest(1,least(coalesce(p_limit,2000),5000));
$function$;

grant execute on function public.seh_recordbook_ecl_dim_titles_v1(integer) to anon,authenticated,service_role;

create or replace function public.refresh_ehockey_player_record_highlights_v3()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='5min'
as $function$
declare
  result_count bigint;
begin
  perform public.refresh_ehockey_ecl_dim_leaders_cache_v1();
  perform public.refresh_ehockey_player_record_highlights_v2();

  insert into public.ehockey_player_record_highlights_cache_v1 (
    player_key,competition_code,metric_code,metric_value,display_value,
    merit_text,sort_priority,refreshed_at
  )
  with titles as (
    select *
    from public.seh_recordbook_ecl_dim_titles_v1(5000)
  ),
  record_value as (
    select max(dim_titles) as max_titles
    from titles
  )
  select
    t.player_key,
    'ECL',
    'dim_titles',
    t.dim_titles::numeric,
    t.dim_titles::text,
    'Flest DIM-titlar i ECL bland svenska backar · ' ||
      t.dim_titles::text ||
      case when t.dim_titles=1 then ' titel.' else ' titlar.' end,
    1450,
    now()
  from titles t,record_value r
  where t.dim_titles=r.max_titles
    and t.dim_titles>0
  on conflict (player_key,competition_code,metric_code)
  do update set
    metric_value=excluded.metric_value,
    display_value=excluded.display_value,
    merit_text=excluded.merit_text,
    sort_priority=excluded.sort_priority,
    refreshed_at=excluded.refreshed_at;

  analyze public.ehockey_player_record_highlights_cache_v1;
  select count(*) into result_count
  from public.ehockey_player_record_highlights_cache_v1;
  return result_count;
end;
$function$;

revoke all on function public.refresh_ehockey_player_record_highlights_v3() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_player_record_highlights_v3() to service_role;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='refresh-player-record-highlights'
  limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'refresh-player-record-highlights',
  '17 */6 * * *',
  $cron$select public.refresh_ehockey_player_record_highlights_v3();$cron$
);

select public.refresh_ehockey_player_record_highlights_v3();

notify pgrst,'reload schema';
