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
      min(nullif(p.source_snapshot->'raw_player'->'team'->>'teamRegistered','')) as team_registered
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
    v_registered_at := case
      when coalesce(r.team_registered,'') ~ '^\d{4}-\d{2}-\d{2}$'
        then r.team_registered::date
      else current_date
    end;

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
      registered_for_league,status,source_system_id,source_url,extra,registered_at
    )
    values(
      nextval('public.team_entries_id_seq'::regclass),
      v_league_id,v_team_id,v_name,null,'SE',
      true,'registered',v_source_id,v_profile_url,
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
      status='registered',
      source_system_id=excluded.source_system_id,
      source_url=excluded.source_url,
      extra=coalesce(public.team_entries.extra,'{}'::jsonb) || excluded.extra,
      registered_at=excluded.registered_at,
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

revoke all on function public.seh_sync_scl27_official_teams() from public;
grant execute on function public.seh_sync_scl27_official_teams() to service_role;
