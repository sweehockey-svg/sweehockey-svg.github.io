
create or replace function public.sportsgamer_discord_player_lookup_v1(p_gamertag text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $function$
with lookup as (
  select lower(trim(p_gamertag)) as q
),
matched_ids as (
  select distinct x.sports_gamer_player_id
  from (
    select s.sports_gamer_player_id
    from public.sportsgamer_team_player_stats s, lookup l
    where l.q <> ''
      and s.sports_gamer_player_id is not null
      and s.display_gamertag is not null
      and lower(s.display_gamertag)=l.q

    union all

    select s.sports_gamer_player_id
    from public.sportsgamer_team_player_stats s, lookup l
    where l.q <> ''
      and s.sports_gamer_player_id is not null
      and s.psn_tag is not null
      and lower(s.psn_tag)=l.q

    union all

    select s.sports_gamer_player_id
    from public.sportsgamer_team_player_stats s, lookup l
    where l.q <> ''
      and s.sports_gamer_player_id is not null
      and s.xbox_gamertag is not null
      and lower(s.xbox_gamertag)=l.q
  ) x
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
spring_latest as (
  select
    c.team_name,
    c.division,
    null::text as season_short,
    true as is_ecl26_spring
  from public.sportsgamer_discord_ecl26_spring_latest_team_cache c
  join player p using (sports_gamer_player_id)
  limit 1
),
ecl_rows as (
  select
    s.sports_gamer_league_id,
    nullif(trim(s.team_name_in_league),'') as team_name,
    (regexp_match(
      coalesce(ch.league_name,s.official_league_name,''),
      '(Elite|Pro|Lite|Core|Neo)',
      'i'
    ))[1] as division,
    ch.season_label,
    ch.league_name,
    ch.chronology_date,
    coalesce(s.participant_regular_games,0)+coalesce(s.participant_playoff_games,0) as games,
    case
      when lower(coalesce(ch.season_label,ch.league_name,'')) like '%ecl ''26:%spring%'
      then true else false
    end as is_ecl26_spring,
    case
      when regexp_match(coalesce(ch.season_label,ch.league_name,''), '''([0-9]{2}):\s*(Winter|Spring)', 'i') is not null
      then
        (regexp_match(coalesce(ch.season_label,ch.league_name,''), '''([0-9]{2}):\s*(Winter|Spring)', 'i'))[1]
        || ' ' ||
        case lower((regexp_match(coalesce(ch.season_label,ch.league_name,''), '''([0-9]{2}):\s*(Winter|Spring)', 'i'))[2])
          when 'winter' then 'W'
          when 'spring' then 'S'
          else ''
        end
      else null
    end as season_short
  from public.sportsgamer_team_player_stats s
  join player p using (sports_gamer_player_id)
  join public.ehockey_league_chronology_cache_v18 ch
    on ch.league_id=s.sports_gamer_league_id
  where upper(coalesce(ch.competition_code,''))='ECL'
    and coalesce(ch.include_in_history,true)
    and coalesce(s.participant_regular_games,0)+coalesce(s.participant_playoff_games,0)>0
    and lower(coalesce(ch.league_name,s.official_league_name,'')) !~
      '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|cooldown|tbc)'
),
chosen_ecl as (
  (
    select team_name,division,season_short,is_ecl26_spring
    from spring_latest
  )
  union all
  (
    select team_name,division,season_short,true as is_ecl26_spring
    from ecl_rows
    where is_ecl26_spring
      and not exists(select 1 from spring_latest)
    order by chronology_date desc nulls last,sports_gamer_league_id desc,games desc
    limit 1
  )
  union all
  (
    select team_name,division,season_short,false as is_ecl26_spring
    from ecl_rows
    where not exists(select 1 from spring_latest)
      and not exists(select 1 from ecl_rows where is_ecl26_spring)
    order by chronology_date desc nulls last,sports_gamer_league_id desc,games desc
    limit 1
  )
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
      'latest_ecl_division',e.division,
      'latest_ecl_season_short',e.season_short,
      'latest_ecl_is_ecl26_spring',coalesce(e.is_ecl26_spring,false)
    )
    from player p
    left join chosen_ecl e on true
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
