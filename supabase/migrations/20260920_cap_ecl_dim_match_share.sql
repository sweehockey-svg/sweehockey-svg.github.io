-- Cap displayed DIM match share at 100 percent for overlapping historical source aggregates.

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
      least(100.0,round(c.defender_games*100.0/nullif(c.team_games,0),2)) as match_share
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

select public.refresh_ehockey_player_record_highlights_v3();
