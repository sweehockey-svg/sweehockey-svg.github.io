-- Keep ECL DIM comparisons fair across transfers and NHL versions.
-- Raw career/best-ever DIM remains internal compatibility data only. The public
-- recordbook compares the latest ECL season and counts DIM-leading seasons/divisions.

alter table public.ehockey_ecl_dim_player_summary_cache_v1
  add column if not exists latest_season_league_id bigint,
  add column if not exists latest_season_dim numeric(8,2),
  add column if not exists latest_season_label text,
  add column if not exists latest_season_team text,
  add column if not exists latest_season_games bigint,
  add column if not exists latest_season_team_games bigint,
  add column if not exists latest_season_match_share numeric(7,2);

CREATE OR REPLACE FUNCTION public.refresh_ehockey_ecl_dim_leaders_cache_v1()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '4min'
AS $function$
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
  with team_rows as (
    select
      s.sports_gamer_league_id::bigint as league_id,
      coalesce(nullif(trim(c.display_name),''),'ECL') as season_label,
      c.chronology_date,
      d.player_key,
      s.sports_gamer_player_id::bigint as sports_gamer_player_id,
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
  candidates as (
    select
      league_id,
      max(season_label) as season_label,
      max(chronology_date) as chronology_date,
      player_key,
      max(sports_gamer_player_id) as sports_gamer_player_id,
      max(display_gamertag) as display_gamertag,
      (array_agg(team_id order by defender_games desc,team_id))[1] as team_id,
      case
        when count(distinct team_name) filter (where team_name is not null)=1
          then max(team_name)
        else string_agg(distinct team_name,' / ' order by team_name)
      end as team_name,
      sum(defender_games)::bigint as defender_games,
      max(team_games)::bigint as team_games,
      sum(takeaways)::bigint as takeaways,
      sum(interceptions)::bigint as interceptions,
      sum(blocked_shots)::bigint as blocked_shots
    from team_rows
    group by league_id,player_key
  ),
  eligible as (
    select
      c.*,
      round(
        (c.takeaways+c.interceptions+c.blocked_shots)::numeric
        / nullif(c.defender_games,0),
        2
      ) as dim,
      round(
        least(100.0,c.defender_games*100.0/nullif(c.team_games,0)),
        2
      ) as match_share
    from candidates c
    where c.team_games>0
      and least(100.0,c.defender_games*100.0/c.team_games) >= 59
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

CREATE OR REPLACE FUNCTION public.refresh_ehockey_ecl_dim_player_summary_cache_v1()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '5min'
AS $function$
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
    latest_season_league_id,latest_season_dim,latest_season_label,latest_season_team,
    latest_season_games,latest_season_team_games,latest_season_match_share,
    latest_leader_dim,latest_leader_label,latest_leader_team,
    refreshed_at
  )
  with team_rows as (
    select
      s.sports_gamer_league_id::bigint as league_id,
      coalesce(nullif(trim(c.display_name),''),'ECL') as season_label,
      regexp_replace(
        coalesce(nullif(trim(c.display_name),''),'ECL'),
        '[[:space:]]+(Elite|Pro|Lite|Core|Neo)$',
        '',
        'i'
      ) as season_cycle,
      c.chronology_date,
      d.player_key,
      s.sports_gamer_player_id::bigint as sports_gamer_player_id,
      max(d.display_gamertag) as display_gamertag,
      s.sports_gamer_team_id::bigint as team_id,
      max(nullif(trim(s.team_name_in_league),'')) as team_name,
      sum(coalesce(s.regular_skater_games,0))::bigint as gp,
      max(t.games_played)::bigint as team_gp,
      sum(coalesce(s.regular_takeaways,0))::bigint as takeaways,
      sum(coalesce(s.regular_interceptions,0))::bigint as interceptions,
      sum(coalesce(s.regular_blocked_shots,0))::bigint as blocked_shots
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
    group by
      s.sports_gamer_league_id,c.display_name,c.chronology_date,
      d.player_key,s.sports_gamer_player_id,s.sports_gamer_team_id
  ),
  base as (
    select
      league_id,
      max(season_label) as season_label,
      max(season_cycle) as season_cycle,
      max(chronology_date) as chronology_date,
      player_key,
      max(sports_gamer_player_id) as sports_gamer_player_id,
      max(display_gamertag) as display_gamertag,
      sum(gp)::bigint as gp,
      max(team_gp)::bigint as team_gp,
      sum(takeaways+interceptions+blocked_shots)::bigint as dim_events,
      case
        when count(distinct team_name) filter (where team_name is not null)=1
          then max(team_name)
        else string_agg(distinct team_name,' / ' order by team_name)
      end as team_name
    from team_rows
    group by league_id,player_key
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
      and least(100.0,b.gp*100.0/b.team_gp) >= 59
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
  latest_cycle as (
    select season_cycle
    from season_eligible
    group by season_cycle
    order by max(chronology_date) desc nulls last,season_cycle desc
    limit 1
  ),
  latest_season as (
    select *
    from (
      select
        e.*,
        row_number() over(
          partition by e.player_key
          order by e.gp desc,e.chronology_date desc nulls last,e.dim desc,e.league_id desc
        ) as rn
      from season_eligible e
      join latest_cycle lc using(season_cycle)
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
    latest.league_id,
    latest.dim,
    latest.season_label,
    latest.team_name,
    latest.gp,
    latest.team_gp,
    latest.match_share,
    ls.latest_leader_dim,
    ls.latest_leader_label,
    ls.latest_leader_team,
    now()
  from career c
  left join best_season bs using(player_key)
  left join latest_season latest using(player_key)
  left join leader_summary ls using(player_key);

  get diagnostics inserted_count = row_count;
  analyze public.ehockey_ecl_dim_player_summary_cache_v1;
  return inserted_count;
end;
$function$;

revoke all on function public.refresh_ehockey_ecl_dim_player_summary_cache_v1() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_ecl_dim_player_summary_cache_v1() to service_role;

drop function if exists public.seh_recordbook_ecl_dim_players_v2(integer);
CREATE OR REPLACE FUNCTION public.seh_recordbook_ecl_dim_players_v2(p_limit integer DEFAULT 2000)
 RETURNS TABLE(player_key text, display_gamertag text, player_image text, sports_gamer_player_url text, primary_position text, games bigint, defender_games bigint, career_dim numeric, dim_leader_count bigint, best_season_dim numeric, best_season_label text, best_season_team text, best_season_games bigint, best_season_team_games bigint, best_season_match_share numeric, latest_season_dim numeric, latest_season_label text, latest_season_team text, latest_season_games bigint, latest_season_team_games bigint, latest_season_match_share numeric, latest_leader_dim numeric, latest_leader_label text, latest_leader_team text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    s.latest_season_dim,
    s.latest_season_label,
    s.latest_season_team,
    s.latest_season_games,
    s.latest_season_team_games,
    s.latest_season_match_share,
    s.latest_leader_dim,
    s.latest_leader_label,
    s.latest_leader_team
  from public.ehockey_ecl_dim_player_summary_cache_v1 s
  join public.app_player_directory_cache d using(player_key)
  left join career c using(player_key)
  order by s.dim_leader_count desc,s.latest_season_dim desc nulls last,d.display_gamertag
  limit greatest(1,least(coalesce(p_limit,2000),5000));
$function$;

grant execute on function public.seh_recordbook_ecl_dim_players_v2(integer) to anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.refresh_ehockey_player_record_highlights_v4()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '6min'
AS $function$
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
      max(latest_season_dim) as max_latest_season_dim
    from dim_rows
  ),
  winners as (
    select
      d.player_key,
      'dim_leader_count'::text as metric_code,
      d.dim_leader_count::numeric as metric_value,
      d.dim_leader_count::text as display_value,
      'Flest säsonger som DIM-ledare i ECL bland svenska backar · ' ||
        d.dim_leader_count::text || ' gånger.' as merit_text,
      1470 as sort_priority
    from dim_rows d,maxes m
    where d.dim_leader_count=m.max_leader_count
      and d.dim_leader_count>0

    union all

    select
      d.player_key,
      'latest_season_dim',
      d.latest_season_dim,
      to_char(d.latest_season_dim,'FM990.00'),
      'Bäst DIM i senaste ECL-säsongen bland svenska backar · ' ||
        to_char(d.latest_season_dim,'FM990.00') ||
        coalesce(' · ' || d.latest_season_label,'') ||
        coalesce(' · ' || d.latest_season_team,'') || '.',
      1460
    from dim_rows d,maxes m
    where d.latest_season_dim=m.max_latest_season_dim
      and d.latest_season_dim>0
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

select public.refresh_ehockey_player_record_highlights_v4();
notify pgrst,'reload schema';
