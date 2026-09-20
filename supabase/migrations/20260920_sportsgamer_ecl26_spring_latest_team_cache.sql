
create table if not exists public.sportsgamer_discord_ecl26_spring_latest_team_cache (
  sports_gamer_player_id bigint primary key,
  sports_gamer_league_id bigint not null,
  sports_gamer_team_id bigint not null,
  team_name text not null,
  division text,
  last_game_at timestamptz,
  last_match_id bigint,
  refreshed_at timestamptz not null default now()
);

create or replace function public.refresh_sportsgamer_discord_ecl26_spring_latest_team_cache()
returns void
language plpgsql
security definer
set search_path=public
as $function$
begin
  truncate table public.sportsgamer_discord_ecl26_spring_latest_team_cache;

  insert into public.sportsgamer_discord_ecl26_spring_latest_team_cache (
    sports_gamer_player_id,
    sports_gamer_league_id,
    sports_gamer_team_id,
    team_name,
    division,
    last_game_at,
    last_match_id,
    refreshed_at
  )
  with ranked as (
    select
      ps.source_player_id as sports_gamer_player_id,
      ps.source_league_id as sports_gamer_league_id,
      ps.source_team_id as sports_gamer_team_id,
      nullif(trim(s.team_name_in_league),'') as team_name,
      (regexp_match(ch.league_name,'(Elite|Pro|Lite|Core|Neo)','i'))[1] as division,
      m.started_at as last_game_at,
      ps.source_match_id as last_match_id,
      row_number() over (
        partition by ps.source_player_id
        order by
          m.started_at desc nulls last,
          ps.source_match_id desc,
          ps.source_league_id desc
      ) as rn
    from public.ehockey_fantasy_match_player_stats ps
    join public.ehockey_fantasy_matches m
      on m.competition_id=ps.competition_id
     and m.source_match_id=ps.source_match_id
    join public.ehockey_league_chronology_cache_v18 ch
      on ch.league_id=ps.source_league_id
    join public.sportsgamer_team_player_stats s
      on s.sports_gamer_player_id=ps.source_player_id
     and s.sports_gamer_league_id=ps.source_league_id
     and s.sports_gamer_team_id=ps.source_team_id
    where upper(coalesce(ch.competition_code,''))='ECL'
      and lower(coalesce(ch.season_label,ch.league_name,'')) like '%ecl ''26:%spring%'
      and lower(coalesce(ch.league_name,'')) !~
        '(qualifier|qualification|kval|wildcard|warmup|pre-season|preseason|registration|free agent|cooldown|tbc)'
  )
  select
    sports_gamer_player_id,
    sports_gamer_league_id,
    sports_gamer_team_id,
    team_name,
    division,
    last_game_at,
    last_match_id,
    now()
  from ranked
  where rn=1
    and team_name is not null;
end;
$function$;

revoke all on public.sportsgamer_discord_ecl26_spring_latest_team_cache from anon,authenticated;
grant select on public.sportsgamer_discord_ecl26_spring_latest_team_cache to service_role;
revoke all on function public.refresh_sportsgamer_discord_ecl26_spring_latest_team_cache() from public,anon,authenticated;
grant execute on function public.refresh_sportsgamer_discord_ecl26_spring_latest_team_cache() to service_role;

select public.refresh_sportsgamer_discord_ecl26_spring_latest_team_cache();
