-- Add exact match context to fastest-goal recordbook entries.
-- Source match data is still temporary during GitHub sync; only compact context
-- is retained in the public ECL/SCL recordbook caches.

alter table public.seh_recordbook_ecl_match_players_cache_v1
  add column if not exists fastest_goal_match_season text,
  add column if not exists fastest_goal_match_team text,
  add column if not exists fastest_goal_match_opponent text,
  add column if not exists fastest_goal_match_team_score integer,
  add column if not exists fastest_goal_match_opponent_score integer,
  add column if not exists fastest_goal_match_stage text;

alter table public.seh_recordbook_scl_match_players_cache_v1
  add column if not exists fastest_goal_match_season text,
  add column if not exists fastest_goal_match_team text,
  add column if not exists fastest_goal_match_opponent text,
  add column if not exists fastest_goal_match_team_score integer,
  add column if not exists fastest_goal_match_opponent_score integer,
  add column if not exists fastest_goal_match_stage text;

CREATE OR REPLACE FUNCTION public.seh_refresh_recordbook_ecl_match_players_cache_v1()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '15min'
AS $function$
declare
  inserted_count bigint;
begin
  truncate table public.seh_recordbook_ecl_match_players_cache_v1;

  insert into public.seh_recordbook_ecl_match_players_cache_v1 (
    player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,
    fastest_goal_seconds,fastest_goal_date,fastest_goal_competition,
    fastest_goal_match_season,fastest_goal_match_team,fastest_goal_match_opponent,
    fastest_goal_match_team_score,fastest_goal_match_opponent_score,fastest_goal_match_stage,
    hattricks,max_goals_game,detailed_matches,
    max_goals_match_competition,max_goals_match_season,max_goals_match_date,
    max_goals_match_team,max_goals_match_opponent,
    max_goals_match_team_score,max_goals_match_opponent_score,
    max_goals_match_stage,max_goals_match_count,refreshed_at
  )
  with ecl_leagues as (
    select league_id,display_name
    from public.v_ehockey_league_catalog_v1
    where upper(coalesce(competition_code,''))='ECL'
      and coalesce(source_match_count,0)>0
      and lower(coalesce(source_league_name,display_name,'')) !~
        '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|legacy|all[- ]?star|cooldown|tbc)'
  ),
  trusted_fastest_leagues as (
    select unnest(array[
      17,18,23,27,28,35,36,40,41,42,55,56,57,65,66,67,68,94,95,
      119,120,121,170,171,172,173,190,191,192,193,250,251,252,253,254,
      305,306,307,308,309,338,339,341,379,380,382,411,412,413,414,461,
      463,487,488,489,490,491,507,508,509,510,511
    ]::bigint[]) as league_id
  ),
  directory as (
    select
      d.player_key,d.display_gamertag,d.player_image,d.sports_gamer_player_url,
      d.primary_position,
      substring(coalesce(d.sports_gamer_player_url,'') from '/players/([0-9]+)')::bigint
        as sports_gamer_player_id
    from public.app_player_directory_cache d
  ),
  goal_counts as (
    select
      g.source_league_id,g.source_match_id,g.source_player_id,
      max(g.source_team_id) as source_team_id,
      count(*)::int as goals
    from pg_temp.ecl_recordbook_goals_stage g
    join ecl_leagues e on e.league_id=g.source_league_id
    group by g.source_league_id,g.source_match_id,g.source_player_id
  ),
  player_agg as (
    select
      gc.source_player_id,
      count(*) filter (where gc.goals>=3)::bigint as hattricks,
      max(gc.goals)::int as max_goals_game,
      count(*)::bigint as detailed_matches
    from goal_counts gc
    group by gc.source_player_id
  ),
  fastest_ranked as (
    select
      g.source_player_id,g.source_league_id,g.source_match_id,g.source_team_id,
      g.goal_seconds,m.played_at,m.match_type,
      m.home_team_id,m.away_team_id,m.home_team_name,m.away_team_name,
      m.home_score,m.away_score,
      coalesce(c.display_name,c.source_season_label,'ECL') as season_label,
      row_number() over (
        partition by g.source_player_id
        order by g.goal_seconds asc,m.played_at asc nulls last,g.source_match_id asc
      ) as rn
    from pg_temp.ecl_recordbook_goals_stage g
    join trusted_fastest_leagues t on t.league_id=g.source_league_id
    join pg_temp.ecl_recordbook_matches_stage m
      on m.source_league_id=g.source_league_id
     and m.source_match_id=g.source_match_id
    left join public.v_ehockey_league_catalog_v1 c
      on c.league_id=g.source_league_id
    where g.goal_seconds>0
  ),
  max_goal_candidates as (
    select
      gc.*,
      m.played_at,m.match_type,m.home_team_id,m.away_team_id,
      m.home_team_name,m.away_team_name,m.home_score,m.away_score,
      coalesce(c.display_name,c.source_season_label,'ECL') as season_label,
      count(*) over (partition by gc.source_player_id) as tied_match_count,
      row_number() over (
        partition by gc.source_player_id
        order by m.played_at desc nulls last,gc.source_match_id desc
      ) as rn
    from goal_counts gc
    join player_agg a
      on a.source_player_id=gc.source_player_id
     and a.max_goals_game=gc.goals
    join pg_temp.ecl_recordbook_matches_stage m
      on m.source_league_id=gc.source_league_id
     and m.source_match_id=gc.source_match_id
    left join public.v_ehockey_league_catalog_v1 c
      on c.league_id=gc.source_league_id
  )
  select
    d.player_key,d.display_gamertag,d.player_image,d.sports_gamer_player_url,
    d.primary_position,
    f.goal_seconds::int,
    f.played_at,
    case when f.goal_seconds is not null then 'ECL'::text else null end,
    f.season_label,
    case
      when f.source_team_id=f.home_team_id then f.home_team_name
      when f.source_team_id=f.away_team_id then f.away_team_name
      else null
    end,
    case
      when f.source_team_id=f.home_team_id then f.away_team_name
      when f.source_team_id=f.away_team_id then f.home_team_name
      else null
    end,
    case
      when f.source_team_id=f.home_team_id then f.home_score
      when f.source_team_id=f.away_team_id then f.away_score
      else null
    end::int,
    case
      when f.source_team_id=f.home_team_id then f.away_score
      when f.source_team_id=f.away_team_id then f.home_score
      else null
    end::int,
    nullif(f.match_type,''),
    coalesce(a.hattricks,0)::bigint,
    coalesce(a.max_goals_game,0)::int,
    coalesce(a.detailed_matches,0)::bigint,
    case when mg.source_match_id is not null then 'ECL'::text else null end,
    mg.season_label,mg.played_at,
    case
      when mg.source_team_id=mg.home_team_id then mg.home_team_name
      when mg.source_team_id=mg.away_team_id then mg.away_team_name
      else null
    end,
    case
      when mg.source_team_id=mg.home_team_id then mg.away_team_name
      when mg.source_team_id=mg.away_team_id then mg.home_team_name
      else null
    end,
    case
      when mg.source_team_id=mg.home_team_id then mg.home_score
      when mg.source_team_id=mg.away_team_id then mg.away_score
      else null
    end::int,
    case
      when mg.source_team_id=mg.home_team_id then mg.away_score
      when mg.source_team_id=mg.away_team_id then mg.home_score
      else null
    end::int,
    nullif(mg.match_type,''),
    coalesce(mg.tied_match_count,0)::bigint,
    now()
  from directory d
  left join player_agg a on a.source_player_id=d.sports_gamer_player_id
  left join fastest_ranked f on f.source_player_id=d.sports_gamer_player_id and f.rn=1
  left join max_goal_candidates mg on mg.source_player_id=d.sports_gamer_player_id and mg.rn=1
  where f.goal_seconds is not null
     or coalesce(a.hattricks,0)>0
     or coalesce(a.max_goals_game,0)>0;

  get diagnostics inserted_count = row_count;
  analyze public.seh_recordbook_ecl_match_players_cache_v1;
  return inserted_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seh_refresh_recordbook_scl_match_players_cache_v1()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '5min'
AS $function$
declare
  inserted_count bigint;
begin
  truncate table public.seh_recordbook_scl_match_players_cache_v1;

  insert into public.seh_recordbook_scl_match_players_cache_v1 (
    player_key,display_gamertag,player_image,sports_gamer_player_url,primary_position,
    fastest_goal_seconds,fastest_goal_date,fastest_goal_competition,
    fastest_goal_match_season,fastest_goal_match_team,fastest_goal_match_opponent,
    fastest_goal_match_team_score,fastest_goal_match_opponent_score,fastest_goal_match_stage,
    hattricks,max_goals_game,detailed_matches,
    max_goals_match_competition,max_goals_match_season,max_goals_match_date,
    max_goals_match_team,max_goals_match_opponent,
    max_goals_match_team_score,max_goals_match_opponent_score,
    max_goals_match_stage,max_goals_match_count,refreshed_at
  )
  with directory as (
    select
      d.player_key,d.display_gamertag,d.player_image,d.sports_gamer_player_url,
      d.primary_position,
      substring(coalesce(d.sports_gamer_player_url,'') from '/players/([0-9]+)')::bigint
        as sports_gamer_player_id
    from public.app_player_directory_cache d
  ),
  goal_counts as (
    select
      g.source_league_id,g.source_match_id,g.source_player_id,
      max(g.source_team_id) as source_team_id,
      count(*)::int as goals
    from pg_temp.scl_recordbook_goals_stage g
    where g.source_league_id in (47,83,148,233,310,369,447)
    group by g.source_league_id,g.source_match_id,g.source_player_id
  ),
  player_agg as (
    select
      gc.source_player_id,
      count(*) filter (where gc.goals>=3)::bigint as hattricks,
      max(gc.goals)::int as max_goals_game,
      count(*)::bigint as detailed_matches
    from goal_counts gc
    group by gc.source_player_id
  ),
  fastest_ranked as (
    select
      g.source_player_id,g.source_league_id,g.source_match_id,g.source_team_id,
      g.goal_seconds,m.played_at,m.match_type,
      m.home_team_id,m.away_team_id,m.home_team_name,m.away_team_name,
      m.home_score,m.away_score,
      coalesce(c.display_name,c.source_season_label,'SCL') as season_label,
      row_number() over (
        partition by g.source_player_id
        order by g.goal_seconds asc,m.played_at asc nulls last,g.source_match_id asc
      ) as rn
    from pg_temp.scl_recordbook_goals_stage g
    join pg_temp.scl_recordbook_matches_stage m
      on m.source_league_id=g.source_league_id
     and m.source_match_id=g.source_match_id
    left join public.v_ehockey_league_catalog_v1 c
      on c.league_id=g.source_league_id
    where g.source_league_id in (310,369,447)
      and g.goal_seconds>0
  ),
  max_goal_candidates as (
    select
      gc.*,
      m.played_at,m.match_type,m.home_team_id,m.away_team_id,
      m.home_team_name,m.away_team_name,m.home_score,m.away_score,
      coalesce(c.display_name,c.source_season_label,'SCL') as season_label,
      count(*) over (partition by gc.source_player_id) as tied_match_count,
      row_number() over (
        partition by gc.source_player_id
        order by m.played_at desc nulls last,gc.source_match_id desc
      ) as rn
    from goal_counts gc
    join player_agg a
      on a.source_player_id=gc.source_player_id
     and a.max_goals_game=gc.goals
    join pg_temp.scl_recordbook_matches_stage m
      on m.source_league_id=gc.source_league_id
     and m.source_match_id=gc.source_match_id
    left join public.v_ehockey_league_catalog_v1 c
      on c.league_id=gc.source_league_id
  )
  select
    d.player_key,d.display_gamertag,d.player_image,d.sports_gamer_player_url,
    d.primary_position,
    f.goal_seconds::int,
    f.played_at,
    case when f.goal_seconds is not null then 'SCL'::text else null end,
    f.season_label,
    case
      when f.source_team_id=f.home_team_id then f.home_team_name
      when f.source_team_id=f.away_team_id then f.away_team_name
      else null
    end,
    case
      when f.source_team_id=f.home_team_id then f.away_team_name
      when f.source_team_id=f.away_team_id then f.home_team_name
      else null
    end,
    case
      when f.source_team_id=f.home_team_id then f.home_score
      when f.source_team_id=f.away_team_id then f.away_score
      else null
    end::int,
    case
      when f.source_team_id=f.home_team_id then f.away_score
      when f.source_team_id=f.away_team_id then f.home_score
      else null
    end::int,
    nullif(f.match_type,''),
    coalesce(a.hattricks,0)::bigint,
    coalesce(a.max_goals_game,0)::int,
    coalesce(a.detailed_matches,0)::bigint,
    case when mg.source_match_id is not null then 'SCL'::text else null end,
    mg.season_label,mg.played_at,
    case
      when mg.source_team_id=mg.home_team_id then mg.home_team_name
      when mg.source_team_id=mg.away_team_id then mg.away_team_name
      else null
    end,
    case
      when mg.source_team_id=mg.home_team_id then mg.away_team_name
      when mg.source_team_id=mg.away_team_id then mg.home_team_name
      else null
    end,
    case
      when mg.source_team_id=mg.home_team_id then mg.home_score
      when mg.source_team_id=mg.away_team_id then mg.away_score
      else null
    end::int,
    case
      when mg.source_team_id=mg.home_team_id then mg.away_score
      when mg.source_team_id=mg.away_team_id then mg.home_score
      else null
    end::int,
    nullif(mg.match_type,''),
    coalesce(mg.tied_match_count,0)::bigint,
    now()
  from directory d
  left join player_agg a on a.source_player_id=d.sports_gamer_player_id
  left join fastest_ranked f on f.source_player_id=d.sports_gamer_player_id and f.rn=1
  left join max_goal_candidates mg on mg.source_player_id=d.sports_gamer_player_id and mg.rn=1
  where f.goal_seconds is not null
     or coalesce(a.hattricks,0)>0
     or coalesce(a.max_goals_game,0)>0;

  get diagnostics inserted_count = row_count;
  analyze public.seh_recordbook_scl_match_players_cache_v1;
  return inserted_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seh_recordbook_ecl_match_players_v2(p_limit integer DEFAULT 3000)
 RETURNS TABLE(player_key text, display_gamertag text, player_image text, sports_gamer_player_url text, primary_position text, fastest_goal_seconds integer, fastest_goal_date timestamp with time zone, fastest_goal_competition text, fastest_goal_match_season text, fastest_goal_match_team text, fastest_goal_match_opponent text, fastest_goal_match_team_score integer, fastest_goal_match_opponent_score integer, fastest_goal_match_stage text, hattricks bigint, max_goals_game integer, detailed_matches bigint, max_goals_match_competition text, max_goals_match_season text, max_goals_match_date timestamp with time zone, max_goals_match_team text, max_goals_match_opponent text, max_goals_match_team_score integer, max_goals_match_opponent_score integer, max_goals_match_stage text, max_goals_match_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.player_key,c.display_gamertag,c.player_image,c.sports_gamer_player_url,c.primary_position,
    c.fastest_goal_seconds,c.fastest_goal_date,c.fastest_goal_competition,
    c.fastest_goal_match_season,c.fastest_goal_match_team,c.fastest_goal_match_opponent,
    c.fastest_goal_match_team_score,c.fastest_goal_match_opponent_score,c.fastest_goal_match_stage,
    c.hattricks,c.max_goals_game,c.detailed_matches,
    c.max_goals_match_competition,c.max_goals_match_season,c.max_goals_match_date,
    c.max_goals_match_team,c.max_goals_match_opponent,
    c.max_goals_match_team_score,c.max_goals_match_opponent_score,
    c.max_goals_match_stage,c.max_goals_match_count
  from public.seh_recordbook_ecl_match_players_cache_v1 c
  order by c.hattricks desc,c.display_gamertag asc
  limit greatest(1,least(coalesce(p_limit,3000),5000));
$function$;

CREATE OR REPLACE FUNCTION public.seh_recordbook_scl_match_players_v2(p_limit integer DEFAULT 2000)
 RETURNS TABLE(player_key text, display_gamertag text, player_image text, sports_gamer_player_url text, primary_position text, fastest_goal_seconds integer, fastest_goal_date timestamp with time zone, fastest_goal_competition text, fastest_goal_match_season text, fastest_goal_match_team text, fastest_goal_match_opponent text, fastest_goal_match_team_score integer, fastest_goal_match_opponent_score integer, fastest_goal_match_stage text, hattricks bigint, max_goals_game integer, detailed_matches bigint, max_goals_match_competition text, max_goals_match_season text, max_goals_match_date timestamp with time zone, max_goals_match_team text, max_goals_match_opponent text, max_goals_match_team_score integer, max_goals_match_opponent_score integer, max_goals_match_stage text, max_goals_match_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.player_key,c.display_gamertag,c.player_image,c.sports_gamer_player_url,c.primary_position,
    c.fastest_goal_seconds,c.fastest_goal_date,c.fastest_goal_competition,
    c.fastest_goal_match_season,c.fastest_goal_match_team,c.fastest_goal_match_opponent,
    c.fastest_goal_match_team_score,c.fastest_goal_match_opponent_score,c.fastest_goal_match_stage,
    c.hattricks,c.max_goals_game,c.detailed_matches,
    c.max_goals_match_competition,c.max_goals_match_season,c.max_goals_match_date,
    c.max_goals_match_team,c.max_goals_match_opponent,
    c.max_goals_match_team_score,c.max_goals_match_opponent_score,
    c.max_goals_match_stage,c.max_goals_match_count
  from public.seh_recordbook_scl_match_players_cache_v1 c
  order by c.hattricks desc,c.display_gamertag asc
  limit greatest(1,least(coalesce(p_limit,2000),5000));
$function$;


grant execute on function public.seh_recordbook_ecl_match_players_v2(integer) to anon,authenticated,service_role;
grant execute on function public.seh_recordbook_scl_match_players_v2(integer) to anon,authenticated,service_role;

notify pgrst,'reload schema';
