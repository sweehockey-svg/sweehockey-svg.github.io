-- Fix Rekordboken ECL season counting.
-- Count each real ECL season once per player regardless of division/team changes.
-- ECL '22/'23 Winter and Spring stay separate; All-Star, qualifiers and similar
-- non-season competitions are excluded.

CREATE OR REPLACE FUNCTION public.seh_recordbook_players_v3(p_competition text DEFAULT 'ALL'::text, p_limit integer DEFAULT 1500)
 RETURNS TABLE(player_key text, display_gamertag text, player_image text, sports_gamer_player_url text, primary_position text, games bigint, skater_games bigint, goalie_games bigint, goals bigint, assists bigint, points bigint, penalty_minutes bigint, playoff_games bigint, playoff_goals bigint, playoff_assists bigint, playoff_points bigint, playoff_penalty_minutes bigint, goalie_wins bigint, goalie_saves bigint, goalie_shots_against bigint, goalie_shutouts bigint, save_percentage numeric, tournament_count bigint, club_count bigint, ecl_seasons bigint, golds bigint, silvers bigint, bronzes bigint, medals bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with params as (
    select upper(coalesce(nullif(trim(p_competition), ''), 'ALL')) as competition
  ),
  filtered as (
    select v.*
    from public.v_ehockey_player_tournaments_web_v14 v
    join public.app_player_directory_cache d0 on d0.player_key = v.player_key
    cross join params p
    where (
      p.competition in ('ALL','ALLA')
      or upper(coalesce(v.competition_code, v.competition_name, '')) = p.competition
    )
    and (
      p.competition <> 'ECL'
      or lower(coalesce(v.league_name, '')) !~ '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason)'
    )
  ),
  agg as (
    select
      v.player_key,
      sum(greatest(coalesce(v.total_skater_games,0),coalesce(v.total_goalie_games,0)))::bigint as games,
      sum(coalesce(v.total_skater_games,0))::bigint as skater_games,
      sum(coalesce(v.total_goalie_games,0))::bigint as goalie_games,
      sum(coalesce(v.total_goals,0))::bigint as goals,
      sum(coalesce(v.total_assists,0))::bigint as assists,
      sum(coalesce(v.total_points,0))::bigint as points,
      sum(coalesce(v.total_penalty_minutes,0))::bigint as penalty_minutes,
      sum(greatest(coalesce(v.playoff_skater_games,0),coalesce(v.playoff_goalie_games,0)))::bigint as playoff_games,
      sum(coalesce(v.playoff_goals,0))::bigint as playoff_goals,
      sum(coalesce(v.playoff_assists,0))::bigint as playoff_assists,
      sum(coalesce(v.playoff_points,0))::bigint as playoff_points,
      sum(coalesce(v.playoff_penalty_minutes,0))::bigint as playoff_penalty_minutes,
      sum(coalesce(v.total_goalie_wins,0))::bigint as goalie_wins,
      sum(coalesce(v.total_goalie_saves,0))::bigint as goalie_saves,
      sum(coalesce(v.total_goalie_shots_against,0))::bigint as goalie_shots_against,
      sum(coalesce(v.regular_goalie_shutouts,0) + coalesce(v.playoff_goalie_shutouts,0))::bigint as goalie_shutouts,
      count(distinct coalesce(v.league_id::text, nullif(v.external_league_id,''), concat_ws('|',v.competition_name,v.season_label,v.league_name)))::bigint as tournament_count,
      count(distinct coalesce(nullif(v.team_id::text,''), lower(nullif(trim(v.team_name_in_tournament),''))))::bigint as club_count
    from filtered v
    group by v.player_key
  ),
  ecl as (
    select
      x.player_key,
      count(distinct x.season_key)::bigint as ecl_seasons
    from (
      select
        v.player_key,
        case
          when coalesce(c.display_name,'') ~* '^ECL[[:space:]]+''?[0-9]{1,2}[[:space:]]+(Winter|Spring)' then
            'ECL ' ||
            (regexp_match(c.display_name,'^ECL[[:space:]]+''?([0-9]{1,2})[[:space:]]+(Winter|Spring)','i'))[1]
            || ' ' ||
            initcap((regexp_match(c.display_name,'^ECL[[:space:]]+''?([0-9]{1,2})[[:space:]]+(Winter|Spring)','i'))[2])
          when coalesce(c.display_name,'') ~* '^ECL[[:space:]]+''?[0-9]{1,2}([[:space:]]|$)' then
            'ECL ' ||
            (regexp_match(c.display_name,'^ECL[[:space:]]+''?([0-9]{1,2})([[:space:]]|$)','i'))[1]
          else null
        end as season_key
      from public.v_ehockey_player_tournaments_web_v14 v
      join public.app_player_directory_cache d1 on d1.player_key = v.player_key
      left join public.v_ehockey_league_catalog_v1 c on c.league_id = v.league_id
      where upper(coalesce(v.competition_code, v.competition_name, '')) = 'ECL'
        and lower(coalesce(c.source_league_name,c.display_name,v.league_name,'')) !~
          '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|legacy|all[- ]?star|cooldown|tbc)'
        and greatest(coalesce(v.total_skater_games,0),coalesce(v.total_goalie_games,0)) > 0
    ) x
    where x.season_key is not null
    group by x.player_key
  ),
  merit_filtered as (
    select m.*
    from public.ehockey_player_merits_cache_v1 m
    cross join params p
    where m.placement in (1,2,3)
      and (
        p.competition in ('ALL','ALLA')
        or upper(coalesce(m.competition_code,m.competition_name,'')) = p.competition
      )
      and (
        p.competition <> 'ECL'
        or lower(coalesce(m.league_name,'')) !~ '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason)'
      )
  ),
  merit_agg as (
    select
      player_key,
      count(*) filter (where placement=1)::bigint as golds,
      count(*) filter (where placement=2)::bigint as silvers,
      count(*) filter (where placement=3)::bigint as bronzes,
      count(*)::bigint as medals
    from merit_filtered
    where player_key is not null
    group by player_key
  )
  select
    d.player_key,
    d.display_gamertag,
    d.player_image,
    d.sports_gamer_player_url,
    d.primary_position,
    case when p.competition in ('ALL','ALLA') then d.career_games::bigint else coalesce(a.games,0)::bigint end as games,
    case when p.competition in ('ALL','ALLA') then d.total_skater_games::bigint else coalesce(a.skater_games,0)::bigint end as skater_games,
    case when p.competition in ('ALL','ALLA') then d.total_goalie_games::bigint else coalesce(a.goalie_games,0)::bigint end as goalie_games,
    case when p.competition in ('ALL','ALLA') then d.total_goals::bigint else coalesce(a.goals,0)::bigint end as goals,
    case when p.competition in ('ALL','ALLA') then d.total_assists::bigint else coalesce(a.assists,0)::bigint end as assists,
    case when p.competition in ('ALL','ALLA') then d.total_points::bigint else coalesce(a.points,0)::bigint end as points,
    coalesce(a.penalty_minutes,0)::bigint as penalty_minutes,
    coalesce(a.playoff_games,0)::bigint as playoff_games,
    coalesce(a.playoff_goals,0)::bigint as playoff_goals,
    coalesce(a.playoff_assists,0)::bigint as playoff_assists,
    coalesce(a.playoff_points,0)::bigint as playoff_points,
    coalesce(a.playoff_penalty_minutes,0)::bigint as playoff_penalty_minutes,
    coalesce(a.goalie_wins,0)::bigint as goalie_wins,
    case when p.competition in ('ALL','ALLA') then d.total_goalie_saves::bigint else coalesce(a.goalie_saves,0)::bigint end as goalie_saves,
    case when p.competition in ('ALL','ALLA') then d.total_goalie_shots_against::bigint else coalesce(a.goalie_shots_against,0)::bigint end as goalie_shots_against,
    coalesce(a.goalie_shutouts,0)::bigint as goalie_shutouts,
    case
      when p.competition in ('ALL','ALLA') then d.total_goalie_save_percentage
      when coalesce(a.goalie_shots_against,0)>0 then a.goalie_saves::numeric/a.goalie_shots_against::numeric
      else null
    end as save_percentage,
    case when p.competition in ('ALL','ALLA') then d.tournament_count::bigint else coalesce(a.tournament_count,0)::bigint end as tournament_count,
    case when p.competition in ('ALL','ALLA') then d.club_count::bigint else coalesce(a.club_count,0)::bigint end as club_count,
    coalesce(e.ecl_seasons,0)::bigint as ecl_seasons,
    coalesce(m.golds,0)::bigint as golds,
    coalesce(m.silvers,0)::bigint as silvers,
    coalesce(m.bronzes,0)::bigint as bronzes,
    coalesce(m.medals,0)::bigint as medals
  from public.app_player_directory_cache d
  cross join params p
  left join agg a on a.player_key=d.player_key
  left join ecl e on e.player_key=d.player_key
  left join merit_agg m on m.player_key=d.player_key
  where (
    case when p.competition in ('ALL','ALLA') then d.career_games else coalesce(a.games,0) end
  ) > 0
  order by games desc,d.display_gamertag asc
  limit greatest(1,least(coalesce(p_limit,1500),5000));
$function$;
