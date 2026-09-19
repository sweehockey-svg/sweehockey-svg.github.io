create index if not exists idx_sg_team_player_stats_gamertag_lower
on public.sportsgamer_team_player_stats (lower(display_gamertag))
where display_gamertag is not null;

create or replace function public.sportsgamer_discord_player_lookup_v1(p_gamertag text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $function$
with matched_ids as (
  select distinct s.sports_gamer_player_id
  from public.sportsgamer_team_player_stats s
  where s.sports_gamer_player_id is not null
    and nullif(trim(p_gamertag),'') is not null
    and lower(s.display_gamertag)=lower(trim(p_gamertag))
),
summary as (
  select count(*)::int as matches from matched_ids
),
player as (
  select
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
    ) as player_url
  from public.sportsgamer_team_player_stats s
  join matched_ids m using (sports_gamer_player_id)
  order by s.imported_at desc nulls last
  limit 1
),
latest_ecl as (
  select
    nullif(trim(s.team_name_in_league),'') as team_name,
    (regexp_match(
      coalesce(ch.league_name,s.official_league_name,''),
      '(Elite|Pro|Lite|Core|Neo)',
      'i'
    ))[1] as division
  from public.sportsgamer_team_player_stats s
  join player p using (sports_gamer_player_id)
  join public.ehockey_league_chronology_cache_v18 ch
    on ch.league_id=s.sports_gamer_league_id
  where upper(coalesce(ch.competition_code,''))='ECL'
    and coalesce(ch.include_in_history,true)
    and coalesce(s.participant_regular_games,0)+coalesce(s.participant_playoff_games,0)>0
    and lower(coalesce(ch.league_name,s.official_league_name,'')) !~
      '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|cooldown|tbc)'
  order by ch.chronology_date desc nulls last,
           s.sports_gamer_league_id desc,
           (coalesce(s.participant_regular_games,0)+coalesce(s.participant_playoff_games,0)) desc
  limit 1
)
select case
  when summary.matches=1 then (
    select jsonb_build_object(
      'matched',true,
      'ambiguous',false,
      'sports_gamer_player_id',p.sports_gamer_player_id,
      'gamertag',p.display_gamertag,
      'position',p.position,
      'player_url',p.player_url,
      'latest_ecl_team',e.team_name,
      'latest_ecl_division',e.division
    )
    from player p
    left join latest_ecl e on true
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
