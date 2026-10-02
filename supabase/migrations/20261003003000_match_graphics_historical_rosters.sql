create or replace function public.seh_match_graphics_team_roster_history(
  p_team_name text default null,
  p_sports_gamer_team_id bigint default null
)
returns table (
  local_team_id bigint,
  player_key text,
  display_gamertag text,
  player_country text,
  player_image text,
  sports_gamer_player_url text,
  primary_position text,
  player_type text,
  league_id bigint,
  competition_code text,
  competition_name text,
  season_label text,
  division text,
  chronology_date date,
  team_name_in_tournament text,
  team_current_name text,
  team_external_id text
)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select
      l.team_id,
      l.current_name,
      coalesce(l.sports_gamer_team_ids, '{}'::text[]) as sports_gamer_team_ids,
      coalesce(l.historical_names, '{}'::text[]) as historical_names,
      coalesce(l.names_used_in_leagues, '{}'::text[]) as names_used_in_leagues
    from public.v_local_team_list l
    where
      (
        nullif(trim(p_team_name), '') is not null
        and (
          lower(trim(l.current_name)) = lower(trim(p_team_name))
          or exists (
            select 1
            from unnest(
              array_cat(
                coalesce(l.historical_names, '{}'::text[]),
                coalesce(l.names_used_in_leagues, '{}'::text[])
              )
            ) as alias_name
            where lower(trim(alias_name)) = lower(trim(p_team_name))
          )
        )
      )
      or (
        p_sports_gamer_team_id is not null
        and p_sports_gamer_team_id::text = any(
          coalesce(l.sports_gamer_team_ids, '{}'::text[])
        )
      )
    order by
      case
        when nullif(trim(p_team_name), '') is not null
         and lower(trim(l.current_name)) = lower(trim(p_team_name))
        then 0 else 1
      end,
      l.last_registered_at desc nulls last,
      l.team_id
    limit 1
  ),
  target_names as (
    select distinct lower(trim(name_value)) as name_key
    from target t
    cross join lateral unnest(
      array_cat(
        array_cat(t.historical_names, t.names_used_in_leagues),
        array[t.current_name]
      )
    ) as name_value
    where trim(coalesce(name_value, '')) <> ''
  )
  select
    t.team_id as local_team_id,
    h.player_key,
    h.display_gamertag,
    h.player_country,
    h.player_image,
    h.sports_gamer_player_url,
    h.primary_position,
    h.player_type,
    h.league_id,
    h.competition_code,
    h.competition_name,
    h.season_label,
    h.division,
    h.chronology_date,
    h.team_name_in_tournament,
    h.team_current_name,
    h.team_external_id
  from public.ehockey_player_history_cache_v25 h
  cross join target t
  where
    trim(coalesce(h.display_gamertag, '')) <> ''
    and (
      exists (
        select 1
        from target_names n
        where n.name_key = lower(
          trim(coalesce(h.team_name_in_tournament, ''))
        )
      )
      or exists (
        select 1
        from target_names n
        where n.name_key = lower(
          trim(coalesce(h.team_current_name, ''))
        )
      )
    )
  order by
    h.chronology_date desc nulls last,
    h.league_id desc nulls last,
    h.display_gamertag asc;
$$;

revoke all on function public.seh_match_graphics_team_roster_history(text,bigint)
  from public;

grant execute on function public.seh_match_graphics_team_roster_history(text,bigint)
  to anon, authenticated, service_role;
