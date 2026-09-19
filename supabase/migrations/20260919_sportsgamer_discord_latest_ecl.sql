create or replace function public.sportsgamer_discord_player_lookup_v1(p_gamertag text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $function$
with player_matches as (
  select distinct on (s.sports_gamer_player_id)
    s.sports_gamer_player_id,
    s.display_gamertag,
    coalesce(
      nullif(trim(s.global_preferred_position_abbreviation),''),
      nullif(trim(s.roster_preferred_position_abbreviation),''),
      nullif(trim(s.regular_skater_position_abbreviation),''),
      nullif(trim(s.playoff_skater_position_abbreviation),'')
    ) as position,
    coalesce(
      nullif(trim(s.sports_gamer_player_url),''),
      'https://sportsgamer.gg/players/' || s.sports_gamer_player_id::text
    ) as player_url,
    s.imported_at
  from public.sportsgamer_team_player_stats s
  where s.sports_gamer_player_id is not null
    and nullif(trim(p_gamertag),'') is not null
    and lower(trim(s.display_gamertag))=lower(trim(p_gamertag))
  order by s.sports_gamer_player_id,s.imported_at desc nulls last
),
matches_with_ecl as (
  select
    m.*,
    e.latest_ecl_team,
    e.latest_ecl_division
  from player_matches m
  left join lateral (
    select
      nullif(trim(s2.team_name_in_league),'') as latest_ecl_team,
      (regexp_match(
        coalesce(c.display_name,c.source_league_name,s2.official_league_name,''),
        '(Elite|Pro|Lite|Core|Neo)',
        'i'
      ))[1] as latest_ecl_division
    from public.sportsgamer_team_player_stats s2
    join public.v_ehockey_league_catalog_v1 c
      on c.league_id=s2.sports_gamer_league_id
    where s2.sports_gamer_player_id=m.sports_gamer_player_id
      and upper(coalesce(c.competition_code,''))='ECL'
      and coalesce(s2.participant_regular_games,0)+coalesce(s2.participant_playoff_games,0)>0
      and lower(coalesce(c.source_league_name,c.display_name,'')) !~
        '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|cooldown|tbc)'
    order by c.chronology_date desc nulls last,
             s2.sports_gamer_league_id desc,
             (coalesce(s2.participant_regular_games,0)+coalesce(s2.participant_playoff_games,0)) desc
    limit 1
  ) e on true
),
summary as (
  select count(*)::int as matches from matches_with_ecl
)
select case
  when summary.matches=1 then (
    select jsonb_build_object(
      'matched',true,
      'ambiguous',false,
      'sports_gamer_player_id',m.sports_gamer_player_id,
      'gamertag',m.display_gamertag,
      'position',m.position,
      'player_url',m.player_url,
      'latest_ecl_team',m.latest_ecl_team,
      'latest_ecl_division',m.latest_ecl_division
    )
    from matches_with_ecl m
    limit 1
  )
  else jsonb_build_object(
    'matched',false,
    'ambiguous',summary.matches>1,
    'match_count',summary.matches,
    'gamertag',nullif(trim(p_gamertag),'')
  )
end
from summary;
$function$;

revoke all on function public.sportsgamer_discord_player_lookup_v1(text) from public,anon,authenticated;
grant execute on function public.sportsgamer_discord_player_lookup_v1(text) to service_role;