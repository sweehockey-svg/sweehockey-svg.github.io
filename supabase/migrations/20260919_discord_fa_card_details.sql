create or replace function public.seh_discord_free_player_card_v1(p_discord_user_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with linked as (
    select
      l.approved_player_key as player_key,
      l.discord_user_id,
      l.discord_username
    from public.ehockey_discord_player_links l
    where l.discord_user_id = nullif(trim(p_discord_user_id),'')
      and l.status = 'approved'
      and l.approved_player_key is not null
    order by l.reviewed_at desc nulls last,l.updated_at desc
    limit 1
  ),
  player as (
    select
      d.player_key,
      d.display_gamertag,
      coalesce(nullif(p.positions_text,''),d.primary_position) as positions_text,
      d.primary_position,
      d.player_image,
      d.sports_gamer_player_url,
      substring(coalesce(d.sports_gamer_player_url,'') from '/players/([0-9]+)') as sports_gamer_player_id,
      coalesce(h.team_name,nullif(d.latest_team,'')) as latest_team,
      h.division as latest_team_division,
      d.career_games,
      d.total_skater_games,
      d.total_goalie_games,
      d.total_points,
      d.total_goalie_saves,
      d.total_goalie_save_percentage,
      e.team_name as latest_ecl_team,
      e.division as latest_ecl_division,
      r.team_name as current_team,
      r.division as current_division
    from linked l
    join public.app_player_directory_cache d on d.player_key=l.player_key
    left join public.ehockey_player_self_profiles p on p.player_key=d.player_key
    left join lateral (
      select
        coalesce(nullif(x.team_name_in_tournament,''),nullif(x.team_current_name,'')) as team_name,
        nullif(x.division,'') as division
      from public.ehockey_player_history_cache_v25 x
      where x.player_key=d.player_key
        and coalesce(x.appearance_games,0)>0
      order by x.chronology_date desc nulls last,
               x.display_end_date desc nulls last,
               x.end_date desc nulls last,
               x.league_id desc nulls last
      limit 1
    ) h on true
    left join lateral (
      select
        coalesce(nullif(x.team_name_in_tournament,''),nullif(x.team_current_name,'')) as team_name,
        nullif(x.division,'') as division
      from public.ehockey_player_history_cache_v25 x
      where x.player_key=d.player_key
        and upper(coalesce(x.competition_code,''))='ECL'
        and coalesce(x.appearance_games,0)>0
      order by x.chronology_date desc nulls last,
               x.display_end_date desc nulls last,
               x.end_date desc nulls last,
               x.league_id desc nulls last
      limit 1
    ) e on true
    left join lateral (
      select nullif(v.team_name,'') as team_name,
             nullif(v.division,'') as division
      from public.v_ecl27_current_roster_v1 v
      where v.player_key=d.player_key
      order by v.last_event_at desc nulls last,v.team_project_id desc
      limit 1
    ) r on true
  )
  select case
    when not exists(select 1 from linked) then
      jsonb_build_object(
        'linked',false,
        'discord_user_id',nullif(trim(p_discord_user_id),'')
      )
    else
      jsonb_build_object(
        'linked',true,
        'player_key',p.player_key,
        'display_gamertag',p.display_gamertag,
        'positions_text',p.positions_text,
        'primary_position',p.primary_position,
        'current_status',case when p.current_team is not null then 'team' else 'free_agent' end,
        'current_team',p.current_team,
        'current_division',p.current_division,
        'latest_team',p.latest_team,
        'latest_team_division',p.latest_team_division,
        'latest_ecl_team',p.latest_ecl_team,
        'latest_ecl_division',p.latest_ecl_division,
        'player_image',p.player_image,
        'sports_gamer_player_id',p.sports_gamer_player_id,
        'sports_gamer_player_url',p.sports_gamer_player_url,
        'career_games',coalesce(p.career_games,0),
        'total_skater_games',coalesce(p.total_skater_games,0),
        'total_goalie_games',coalesce(p.total_goalie_games,0),
        'total_points',coalesce(p.total_points,0),
        'total_goalie_saves',coalesce(p.total_goalie_saves,0),
        'total_goalie_save_percentage',p.total_goalie_save_percentage
      )
  end
  from linked l
  left join player p on true
  union all
  select jsonb_build_object(
    'linked',false,
    'discord_user_id',nullif(trim(p_discord_user_id),'')
  )
  where not exists(select 1 from linked)
  limit 1;
$function$;
