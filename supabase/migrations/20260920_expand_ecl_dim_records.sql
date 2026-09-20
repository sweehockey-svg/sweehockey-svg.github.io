
create table if not exists public.ehockey_ecl_dim_player_summary_cache_v1 (
  player_key text primary key,
  sports_gamer_player_id bigint,
  display_gamertag text not null,
  career_defender_games bigint not null default 0,
  career_dim_events bigint not null default 0,
  career_dim numeric(8,2),
  dim_leader_count bigint not null default 0,
  best_season_dim numeric(8,2),
  best_season_league_id bigint,
  best_season_label text,
  best_season_team text,
  best_season_games bigint,
  best_season_team_games bigint,
  best_season_match_share numeric(7,2),
  latest_leader_dim numeric(8,2),
  latest_leader_label text,
  latest_leader_team text,
  refreshed_at timestamptz not null default now()
);

alter table public.ehockey_ecl_dim_player_summary_cache_v1 enable row level security;

drop policy if exists "Public read ECL DIM player summary" on public.ehockey_ecl_dim_player_summary_cache_v1;
create policy "Public read ECL DIM player summary"
on public.ehockey_ecl_dim_player_summary_cache_v1
for select
to anon, authenticated
using (true);

revoke all on public.ehockey_ecl_dim_player_summary_cache_v1 from public;
grant select on public.ehockey_ecl_dim_player_summary_cache_v1 to anon,authenticated,service_role;

create or replace function public.refresh_ehockey_ecl_dim_player_summary_cache_v1()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='5min'
as $function$
declare
  inserted_count bigint;
begin
  perform public.refresh_ehockey_ecl_dim_leaders_cache_v1();

  truncate table public.ehockey_ecl_dim_player_summary_cache_v1;

  insert into public.ehockey_ecl_dim_player_summary_cache_v1 (
    player_key,sports_gamer_player_id,display_gamertag,
    career_defender_games,career_dim_events,career_dim,
    dim_leader_count,
    best_season_dim,best_season_league_id,best_season_label,best_season_team,
    best_season_games,best_season_team_games,best_season_match_share,
    latest_leader_dim,latest_leader_label,latest_leader_team,
    refreshed_at
  )
  with base as (
    select
      d.player_key,
      s.sports_gamer_player_id::bigint,
      d.display_gamertag,
      s.sports_gamer_league_id::bigint as league_id,
      c.display_name as season_label,
      c.chronology_date,
      s.sports_gamer_team_id::bigint as team_id,
      nullif(trim(s.team_name_in_league),'') as team_name,
      coalesce(s.regular_skater_games,0)::bigint as gp,
      coalesce(t.games_played,0)::bigint as team_gp,
      (
        coalesce(s.regular_takeaways,0)
        + coalesce(s.regular_interceptions,0)
        + coalesce(s.regular_blocked_shots,0)
      )::bigint as dim_events
    from public.sportsgamer_team_player_stats s
    join public.app_player_directory_cache d
      on d.sports_gamer_player_url=s.sports_gamer_player_url
    join public.v_ehockey_league_catalog_v1 c
      on c.league_id=s.sports_gamer_league_id
    left join public.sportsgamer_team_tournament_stats t
      on t.sports_gamer_league_id=s.sports_gamer_league_id
     and t.sports_gamer_team_id=s.sports_gamer_team_id
     and lower(coalesce(t.statistics_stage,''))='regular'
    where upper(coalesce(c.competition_code,''))='ECL'
      and coalesce(c.source_match_count,0)>0
      and lower(coalesce(c.source_league_name,c.display_name,s.official_league_name,'')) !~
        '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|legacy|all[- ]?star|cooldown|tbc)'
      and upper(coalesce(s.regular_skater_position_abbreviation,'')) in ('LD','RD')
      and coalesce(s.regular_skater_games,0)>0
  ),
  career as (
    select
      player_key,
      max(sports_gamer_player_id) as sports_gamer_player_id,
      max(display_gamertag) as display_gamertag,
      sum(gp)::bigint as career_defender_games,
      sum(dim_events)::bigint as career_dim_events,
      round(sum(dim_events)::numeric/nullif(sum(gp),0),2) as career_dim
    from base
    group by player_key
  ),
  season_eligible as (
    select
      b.*,
      round(b.dim_events::numeric/nullif(b.gp,0),2) as dim,
      round(least(100.0,b.gp*100.0/nullif(b.team_gp,0)),2) as match_share
    from base b
    where b.team_gp>0
      and b.gp*100.0/b.team_gp >= 59
      and b.dim_events>0
  ),
  best_season as (
    select *
    from (
      select
        e.*,
        row_number() over(
          partition by e.player_key
          order by e.dim desc,e.gp desc,e.chronology_date desc nulls last,e.league_id desc
        ) as rn
      from season_eligible e
    ) ranked
    where rn=1
  ),
  leader_summary as (
    select
      l.player_key,
      count(distinct l.league_id)::bigint as dim_leader_count,
      (array_agg(l.dim order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_leader_dim,
      (array_agg(l.season_label order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_leader_label,
      (array_agg(l.team_name order by l.chronology_date desc nulls last,l.league_id desc))[1] as latest_leader_team
    from public.ehockey_ecl_dim_leaders_cache_v1 l
    group by l.player_key
  )
  select
    c.player_key,
    c.sports_gamer_player_id,
    c.display_gamertag,
    c.career_defender_games,
    c.career_dim_events,
    c.career_dim,
    coalesce(ls.dim_leader_count,0),
    bs.dim,
    bs.league_id,
    bs.season_label,
    bs.team_name,
    bs.gp,
    bs.team_gp,
    bs.match_share,
    ls.latest_leader_dim,
    ls.latest_leader_label,
    ls.latest_leader_team,
    now()
  from career c
  left join best_season bs using(player_key)
  left join leader_summary ls using(player_key);

  get diagnostics inserted_count = row_count;
  analyze public.ehockey_ecl_dim_player_summary_cache_v1;
  return inserted_count;
end;
$function$;

revoke all on function public.refresh_ehockey_ecl_dim_player_summary_cache_v1() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_ecl_dim_player_summary_cache_v1() to service_role;

drop function if exists public.seh_recordbook_ecl_dim_players_v2(integer);
create function public.seh_recordbook_ecl_dim_players_v2(p_limit integer default 2000)
returns table(
  player_key text,
  display_gamertag text,
  player_image text,
  sports_gamer_player_url text,
  primary_position text,
  games bigint,
  defender_games bigint,
  career_dim numeric,
  dim_leader_count bigint,
  best_season_dim numeric,
  best_season_label text,
  best_season_team text,
  best_season_games bigint,
  best_season_team_games bigint,
  best_season_match_share numeric,
  latest_leader_dim numeric,
  latest_leader_label text,
  latest_leader_team text
)
language sql
stable
security definer
set search_path=public
as $function$
  with career as (
    select player_key,games
    from public.seh_recordbook_players_v3('ECL',5000)
  )
  select
    s.player_key,
    d.display_gamertag,
    d.player_image,
    d.sports_gamer_player_url,
    d.primary_position,
    coalesce(c.games,0)::bigint,
    s.career_defender_games,
    s.career_dim,
    s.dim_leader_count,
    s.best_season_dim,
    s.best_season_label,
    s.best_season_team,
    s.best_season_games,
    s.best_season_team_games,
    s.best_season_match_share,
    s.latest_leader_dim,
    s.latest_leader_label,
    s.latest_leader_team
  from public.ehockey_ecl_dim_player_summary_cache_v1 s
  join public.app_player_directory_cache d using(player_key)
  left join career c using(player_key)
  order by s.career_dim desc,s.career_defender_games desc,d.display_gamertag
  limit greatest(1,least(coalesce(p_limit,2000),5000));
$function$;

grant execute on function public.seh_recordbook_ecl_dim_players_v2(integer) to anon,authenticated,service_role;

create or replace function public.refresh_ehockey_player_record_highlights_v4()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='6min'
as $function$
declare
  result_count bigint;
begin
  perform public.refresh_ehockey_ecl_dim_player_summary_cache_v1();
  perform public.refresh_ehockey_player_record_highlights_v2();

  insert into public.ehockey_player_record_highlights_cache_v1 (
    player_key,competition_code,metric_code,metric_value,display_value,
    merit_text,sort_priority,refreshed_at
  )
  with dim_rows as (
    select *
    from public.seh_recordbook_ecl_dim_players_v2(5000)
  ),
  maxes as (
    select
      max(dim_leader_count) as max_leader_count,
      max(career_dim) filter (where defender_games>=100) as max_career_dim,
      max(best_season_dim) as max_best_season_dim
    from dim_rows
  ),
  winners as (
    select
      d.player_key,
      'dim_leader_count'::text as metric_code,
      d.dim_leader_count::numeric as metric_value,
      d.dim_leader_count::text as display_value,
      'Flest gånger DIM-ledare i ECL bland svenska backar · ' ||
        d.dim_leader_count::text || ' gånger.' as merit_text,
      1470 as sort_priority
    from dim_rows d,maxes m
    where d.dim_leader_count=m.max_leader_count
      and d.dim_leader_count>0

    union all

    select
      d.player_key,
      'career_dim',
      d.career_dim,
      to_char(d.career_dim,'FM990.00'),
      'Bäst karriär-DIM i ECL bland svenska backar · ' ||
        to_char(d.career_dim,'FM990.00') ||
        ' över ' || d.defender_games::text || ' backmatcher.' ,
      1460
    from dim_rows d,maxes m
    where d.defender_games>=100
      and d.career_dim=m.max_career_dim

    union all

    select
      d.player_key,
      'best_season_dim',
      d.best_season_dim,
      to_char(d.best_season_dim,'FM990.00'),
      'Högsta registrerade säsongs-DIM i ECL bland svenska backar · ' ||
        to_char(d.best_season_dim,'FM990.00') ||
        coalesce(' · ' || d.best_season_label,'') ||
        coalesce(' · ' || d.best_season_team,'') || '.',
      1450
    from dim_rows d,maxes m
    where d.best_season_dim=m.max_best_season_dim
      and d.best_season_dim>0
  )
  select
    player_key,'ECL',metric_code,metric_value,display_value,
    merit_text,sort_priority,now()
  from winners
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

revoke all on function public.refresh_ehockey_player_record_highlights_v4() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_player_record_highlights_v4() to service_role;

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
  $cron$select public.refresh_ehockey_player_record_highlights_v4();$cron$
);

select public.refresh_ehockey_player_record_highlights_v4();

notify pgrst,'reload schema';
