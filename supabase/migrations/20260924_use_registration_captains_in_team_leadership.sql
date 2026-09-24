-- SCL 27 registration leadership should count as the team's latest leadership
-- before the tournament has produced historical player rows.
--
-- 1. Persist captain/assistant SportsGamer IDs from the official SCL 27 source snapshot.
-- 2. Let the public leadership cache consider registered team-entry leadership alongside history.

create or replace function public.seh_sync_scl27_official_teams()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source_id bigint;
  v_competition_id bigint;
  v_league_id bigint;
  v_team_id bigint;
  v_name text;
  v_norm text;
  v_match_key text;
  v_candidates bigint[];
  v_profile_url text;
  v_registered_at date;
  v_created integer := 0;
  v_updated integer := 0;
  v_ambiguous integer := 0;
  v_external_id_conflicts integer := 0;
  r record;
begin
  select id into v_source_id
  from public.source_systems
  where code='SPORTSGAMER'
  limit 1;

  if v_source_id is null then
    raise exception 'SportsGamer source system saknas.';
  end if;

  select id into v_competition_id
  from public.ehockey_fantasy_competitions
  where upper(code)='SCL2027'
  limit 1;

  if v_competition_id is null then
    raise exception 'Fantasy competition SCL2027 saknas.';
  end if;

  select id into v_league_id
  from public.leagues
  where source_system_id=v_source_id
    and external_league_id='527'
  limit 1;

  if v_league_id is null then
    insert into public.leagues(
      id,source_system_id,external_league_id,name,competition_code,season_label,
      start_date,participant_type,include_in_team_history,extra
    )
    values(
      nextval('public.leagues_id_seq'::regclass),
      v_source_id,'527','Swedish Championship League 27','SCL','SCL 27',
      date '2026-10-05','team',true,
      jsonb_build_object('official_registration',true,'source','SportsGamer')
    )
    returning id into v_league_id;
  else
    update public.leagues
    set name='Swedish Championship League 27',
        competition_code='SCL',
        season_label='SCL 27',
        start_date=date '2026-10-05',
        participant_type='team',
        include_in_team_history=true,
        extra=coalesce(extra,'{}'::jsonb) || jsonb_build_object('official_registration',true,'source','SportsGamer'),
        updated_at=now()
    where id=v_league_id;
  end if;

  for r in
    select
      p.real_team_id as sports_gamer_team_id,
      min(trim(p.real_team_name)) as team_name,
      max(nullif(trim(p.team_logo_url),'')) as team_logo_url,
      max(nullif(p.source_snapshot->'raw_player'->'team'->>'teamCaptainID','')) as captain_player_id,
      max(nullif(p.source_snapshot->'raw_player'->'team'->>'teamAssistantCaptainID','')) as assistant_1_player_id,
      max(nullif(p.source_snapshot->'raw_player'->'team'->>'teamAssistantCaptainID2','')) as assistant_2_player_id
    from public.ehockey_fantasy_player_pool p
    where p.competition_id=v_competition_id
      and p.is_available=true
      and p.real_team_id is not null
      and nullif(trim(p.real_team_name),'') is not null
    group by p.real_team_id
    order by min(trim(p.real_team_name))
  loop
    v_name := trim(r.team_name);
    v_norm := public.normalize_team_identity_name(v_name);
    v_match_key := regexp_replace(v_norm, '\s+(e sport|esport|esports)$', '', 'i');
    v_profile_url := 'https://sportsgamer.gg/leagues/527/teams/' || r.sports_gamer_team_id::text;
    v_registered_at := current_date;

    select array_agg(x.team_id order by x.team_id)
    into v_candidates
    from (
      select distinct t.id as team_id
      from public.teams t
      where t.normalized_name=v_norm
      union
      select distinct n.team_id
      from public.team_names n
      where n.normalized_name=v_norm
    ) x;

    if coalesce(cardinality(v_candidates),0)=0 and v_match_key<>v_norm then
      select array_agg(x.team_id order by x.team_id)
      into v_candidates
      from (
        select distinct t.id as team_id
        from public.teams t
        where regexp_replace(t.normalized_name, '\s+(e sport|esport|esports)$', '', 'i')=v_match_key
        union
        select distinct n.team_id
        from public.team_names n
        where regexp_replace(n.normalized_name, '\s+(e sport|esport|esports)$', '', 'i')=v_match_key
      ) x;
    end if;

    if coalesce(cardinality(v_candidates),0)>1 then
      v_ambiguous := v_ambiguous + 1;
      continue;
    elsif coalesce(cardinality(v_candidates),0)=1 then
      v_team_id := v_candidates[1];
      update public.teams
      set imported_country_code='SE',
          status='active',
          logo_url=coalesce(logo_url,r.team_logo_url),
          profile_url=coalesce(profile_url,v_profile_url),
          updated_at=now()
      where id=v_team_id;
      v_updated := v_updated + 1;
    else
      insert into public.teams(
        id,current_name,normalized_name,imported_country_code,status,
        logo_url,profile_url,current_name_source_system_id,name_priority
      )
      values(
        nextval('public.teams_id_seq'::regclass),
        v_name,v_norm,'SE','active',
        r.team_logo_url,v_profile_url,v_source_id,50
      )
      returning id into v_team_id;
      v_created := v_created + 1;
    end if;

    insert into public.team_names(
      id,team_id,name,normalized_name,name_type,is_current,source_system_id,
      first_seen_at,last_seen_at
    )
    values(
      nextval('public.team_names_id_seq'::regclass),
      v_team_id,v_name,v_norm,'registered_name',
      (select normalized_name=v_norm from public.teams where id=v_team_id),
      v_source_id,v_registered_at,v_registered_at
    )
    on conflict (team_id,normalized_name)
    do update set
      last_seen_at=greatest(public.team_names.last_seen_at,excluded.last_seen_at),
      updated_at=now();

    if exists (
      select 1
      from public.team_external_ids e
      where e.source_system_id=v_source_id
        and e.external_team_id=r.sports_gamer_team_id::text
        and e.team_id<>v_team_id
    ) then
      v_external_id_conflicts := v_external_id_conflicts + 1;
    else
      insert into public.team_external_ids(
        id,team_id,source_system_id,external_team_id,profile_url,is_primary
      )
      values(
        nextval('public.team_external_ids_id_seq'::regclass),
        v_team_id,v_source_id,r.sports_gamer_team_id::text,v_profile_url,true
      )
      on conflict (source_system_id,external_team_id)
      do update set
        profile_url=excluded.profile_url,
        updated_at=now();
    end if;

    insert into public.team_entries(
      id,league_id,team_id,source_name,display_name_override,country_at_entry,
      registered_for_league,captain_external_player_id,assistant_1_external_player_id,
      assistant_2_external_player_id,status,source_system_id,source_url,extra,registered_at
    )
    values(
      nextval('public.team_entries_id_seq'::regclass),
      v_league_id,v_team_id,v_name,null,'SE',
      true,r.captain_player_id,r.assistant_1_player_id,r.assistant_2_player_id,
      'registered',v_source_id,v_profile_url,
      jsonb_build_object(
        'official_scl27',true,
        'sports_gamer_team_id',r.sports_gamer_team_id,
        'competition_code','SCL2027'
      ),
      v_registered_at
    )
    on conflict (league_id,team_id)
    do update set
      source_name=excluded.source_name,
      country_at_entry='SE',
      registered_for_league=true,
      captain_external_player_id=excluded.captain_external_player_id,
      assistant_1_external_player_id=excluded.assistant_1_external_player_id,
      assistant_2_external_player_id=excluded.assistant_2_external_player_id,
      status='registered',
      source_system_id=excluded.source_system_id,
      source_url=excluded.source_url,
      extra=coalesce(public.team_entries.extra,'{}'::jsonb) || excluded.extra,
      updated_at=now();

    insert into public.team_source_links(
      id,team_id,source_system_id,external_team_id,external_league_id,
      source_name,normalized_source_name,link_type,source_url,extra
    )
    values(
      nextval('public.team_source_links_id_seq'::regclass),
      v_team_id,v_source_id,r.sports_gamer_team_id::text,'527',
      v_name,v_norm,'league_entry_name',v_profile_url,
      jsonb_build_object('official_scl27',true,'competition_code','SCL2027')
    )
    on conflict do nothing;
  end loop;

  return jsonb_build_object(
    'league_id',v_league_id,
    'created',v_created,
    'updated',v_updated,
    'ambiguous',v_ambiguous,
    'external_id_conflicts',v_external_id_conflicts,
    'official_teams',(
      select count(distinct p.real_team_id)
      from public.ehockey_fantasy_player_pool p
      where p.competition_id=v_competition_id
        and p.is_available=true
        and p.real_team_id is not null
    )
  );
end;
$function$;

create or replace function public.refresh_app_team_latest_leadership_cache()
returns void
language plpgsql
set search_path = ''
as $$
begin
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
  merit_player_map as (
    select distinct on (m.sports_gamer_player_id)
      m.sports_gamer_player_id,
      m.player_key,
      m.display_gamertag
    from public.ehockey_player_merits_cache_v1 m
    where m.sports_gamer_player_id is not null
      and nullif(btrim(m.player_key), '') is not null
    order by m.sports_gamer_player_id, m.sort_date desc nulls last, m.league_id desc nulls last
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
      profile.player_country,
      profile.player_image,
      coalesce(profile.sports_gamer_player_url,'https://sportsgamer.gg/players/' || e.external_player_id) as sports_gamer_player_url,
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
    join merit_player_map pm
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

select public.seh_sync_scl27_official_teams();
select public.refresh_app_team_latest_leadership_cache();
