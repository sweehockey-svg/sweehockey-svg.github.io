create or replace function public.sportsgamer_discord_player_lookup_v1(p_gamertag text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $function$
with matches as (
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
    and lower(trim(s.display_gamertag)) = lower(trim(p_gamertag))
  order by s.sports_gamer_player_id, s.imported_at desc nulls last
),
summary as (
  select count(*)::int as matches from matches
)
select case
  when summary.matches = 1 then (
    select jsonb_build_object(
      'matched',true,
      'ambiguous',false,
      'sports_gamer_player_id',m.sports_gamer_player_id,
      'gamertag',m.display_gamertag,
      'position',m.position,
      'player_url',m.player_url
    )
    from matches m
    limit 1
  )
  else jsonb_build_object(
    'matched',false,
    'ambiguous',summary.matches > 1,
    'match_count',summary.matches,
    'gamertag',nullif(trim(p_gamertag),'')
  )
end
from summary;
$function$;

revoke all on function public.sportsgamer_discord_player_lookup_v1(text) from public,anon,authenticated;
grant execute on function public.sportsgamer_discord_player_lookup_v1(text) to service_role;
