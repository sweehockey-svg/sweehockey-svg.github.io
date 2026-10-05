-- Keep current SCL 27 leadership in sync with the live SportsGamer team source.
-- The old cache only resolved registration leaders through the merits cache,
-- which omitted current captains who had no merit row yet.

create or replace function public.refresh_app_team_latest_leadership_cache()
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.team_entries te
  set
    source_name = sg.team_name,
    captain_external_player_id = sg.captain_player_id::text,
    assistant_1_external_player_id = sg.assistant_1_player_id::text,
    assistant_2_external_player_id = sg.assistant_2_player_id::text,
    updated_at = now()
  from
    public.leagues l,
    public.source_systems ss,
    public.team_external_ids ext,
    public.sportsgamer_league_teams_current sg
  where te.league_id = l.id
    and l.source_system_id = ss.id
    and ss.code = 'SPORTSGAMER'
    and l.competition_code = 'SCL'
    and l.external_league_id = '527'
    and ext.team_id = te.team_id
    and ext.source_system_id = ss.id
    and ext.external_team_id = sg.sports_gamer_team_id::text
    and sg.sports_gamer_league_id = 527
    and sg.is_available = true;

  delete from public.app_team_latest_leadership_cache;

  insert into public.app_team_latest_leadership_cache (
    team_id,player_key,display_gamertag,player_country,player_image,
    sports_gamer_player_url,captain_role,league_id,external_league_id,
    competition_code,competition_name,season_label,league_name,division,
    team_name_in_tournament,leadership_date,updated_at
  )
  with history_rows as (
    select
      history.team_id,
      history.player_key,
      coalesce(nullif(btrim(history.display_gamertag), ''), 'Okänd spelare') as display_gamertag,
      history.player_country,
      history.player_image,
      history.sports_gamer_player_url,
      case
        when upper(btrim(coalesce(history.captain_role, ''))) in ('C', 'CAPTAIN', 'KAPTEN') then 'C'
        when upper(btrim(coalesce(history.captain_role, ''))) in ('A', 'ASSISTANT', 'ALTERNATE', 'ASSISTERANDE') then 'A'
        else null
      end as normalized_role,
      history.league_id,
      history.external_league_id,
      history.competition_code,
      history.competition_name,
      history.season_label,
      history.league_name,
      history.division,
      history.team_name_in_tournament,
      coalesce(
        case when history.chronology_date <= current_date + 366 then history.chronology_date end,
        case when history.display_start_date <= current_date + 366 then history.display_start_date end,
        case when history.end_date <= current_date + 366 then history.end_date end,
        case when history.start_date <= current_date + 366 then history.start_date end,
        case when history.sort_date <= current_date + 366 then history.sort_date end
      ) as effective_date
    from public.ehockey_player_history_cache_v25 history
    where history.team_id is not null
      and nullif(btrim(history.player_key), '') is not null
  ),
  account_player_map as (
    select distinct on (
      substring(d.sports_gamer_player_url from '/players/([0-9]+)')
    )
      substring(d.sports_gamer_player_url from '/players/([0-9]+)')::bigint as sports_gamer_player_id,
      d.player_key,
      d.display_gamertag,
      d.player_country,
      d.player_image,
      d.sports_gamer_player_url
    from public.app_account_player_directory_cache d
    where d.sports_gamer_player_url ~ '/players/[0-9]+'
      and nullif(btrim(d.player_key),'') is not null
    order by
      substring(d.sports_gamer_player_url from '/players/([0-9]+)'),
      d.career_games desc nulls last,
      d.updated_at desc nulls last
  ),
  merit_player_map as (
    select distinct on (m.sports_gamer_player_id)
      m.sports_gamer_player_id,
      m.player_key,
      m.display_gamertag,
      null::text as player_country,
      null::text as player_image,
      ('https://sportsgamer.gg/players/' || m.sports_gamer_player_id::text)::text as sports_gamer_player_url
    from public.ehockey_player_merits_cache_v1 m
    where m.sports_gamer_player_id is not null
      and nullif(btrim(m.player_key), '') is not null
    order by m.sports_gamer_player_id, m.sort_date desc nulls last, m.league_id desc nulls last
  ),
  player_map as (
    select * from account_player_map
    union all
    select m.*
    from merit_player_map m
    where not exists (
      select 1
      from account_player_map a
      where a.sports_gamer_player_id = m.sports_gamer_player_id
    )
  ),
  entry_leaders as (
    select
      te.team_id,
      te.league_id,
      l.external_league_id,
      l.competition_code,
      l.name as competition_name,
      l.season_label,
      l.name as league_name,
      l.division_name as division,
      coalesce(nullif(te.display_name_override,''),te.source_name,t.current_name) as team_name_in_tournament,
      leader.external_player_id,
      leader.normalized_role,
      coalesce(l.start_date,te.registered_at,current_date) as effective_date
    from public.team_entries te
    join public.leagues l on l.id=te.league_id
    left join public.teams t on t.id=te.team_id
    cross join lateral (
      values
        (te.captain_external_player_id,'C'::text),
        (te.assistant_1_external_player_id,'A'::text),
        (te.assistant_2_external_player_id,'A'::text)
    ) leader(external_player_id,normalized_role)
    where te.team_id is not null
      and te.registered_for_league=true
      and coalesce(te.status,'registered') not in ('withdrawn','removed','deleted')
      and nullif(btrim(leader.external_player_id),'') is not null
      and leader.external_player_id ~ '^\d+$'
  ),
  registration_rows as (
    select
      e.team_id,
      pm.player_key,
      coalesce(nullif(btrim(pm.display_gamertag),''),profile.display_gamertag,'Okänd spelare') as display_gamertag,
      coalesce(profile.player_country,pm.player_country) as player_country,
      coalesce(profile.player_image,pm.player_image) as player_image,
      coalesce(
        profile.sports_gamer_player_url,
        pm.sports_gamer_player_url,
        'https://sportsgamer.gg/players/' || e.external_player_id
      ) as sports_gamer_player_url,
      e.normalized_role,
      e.league_id,
      e.external_league_id,
      e.competition_code,
      e.competition_name,
      e.season_label,
      e.league_name,
      e.division,
      e.team_name_in_tournament,
      e.effective_date
    from entry_leaders e
    join player_map pm
      on pm.sports_gamer_player_id=e.external_player_id::bigint
    left join lateral (
      select
        h.display_gamertag,
        h.player_country,
        h.player_image,
        h.sports_gamer_player_url
      from public.ehockey_player_history_cache_v25 h
      where h.player_key=pm.player_key
      order by coalesce(h.chronology_date,h.display_start_date,h.sort_date,h.start_date,h.end_date) desc nulls last
      limit 1
    ) profile on true
  ),
  all_leadership_rows as (
    select * from history_rows where normalized_role is not null
    union all
    select * from registration_rows
  ),
  leadership_tournaments as (
    select
      team_id,
      league_id,
      coalesce(nullif(external_league_id, ''), league_id::text) as edition_key,
      max(effective_date) as edition_date
    from all_leadership_rows
    where normalized_role is not null
    group by team_id, league_id, coalesce(nullif(external_league_id, ''), league_id::text)
  ),
  latest_tournament as (
    select distinct on (team_id)
      team_id,league_id,edition_key,edition_date
    from leadership_tournaments
    order by team_id, edition_date desc nulls last, league_id desc nulls last, edition_key desc
  ),
  chosen_players as (
    select distinct on (row.team_id, row.player_key)
      row.team_id,row.player_key,row.display_gamertag,row.player_country,row.player_image,
      row.sports_gamer_player_url,row.normalized_role as captain_role,row.league_id,
      row.external_league_id,row.competition_code,row.competition_name,row.season_label,
      row.league_name,row.division,row.team_name_in_tournament,latest.edition_date as leadership_date
    from all_leadership_rows row
    join latest_tournament latest
      on latest.team_id = row.team_id
     and latest.league_id is not distinct from row.league_id
     and latest.edition_key = coalesce(nullif(row.external_league_id, ''), row.league_id::text)
    where row.normalized_role is not null
    order by
      row.team_id,row.player_key,
      case row.normalized_role when 'C' then 0 else 1 end,
      row.effective_date desc nulls last
  )
  select
    team_id,player_key,display_gamertag,player_country,player_image,
    sports_gamer_player_url,captain_role,league_id,external_league_id,
    competition_code,competition_name,season_label,league_name,division,
    team_name_in_tournament,leadership_date,now()
  from chosen_players;
end;
$$;

select public.refresh_app_team_latest_leadership_cache();
