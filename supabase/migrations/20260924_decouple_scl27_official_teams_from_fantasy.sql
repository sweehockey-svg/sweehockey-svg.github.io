-- SCL 27 official team/roster data is a core Svensk eHockey concern.
-- Keep it independent from Fantasy so Lagbygge, team pages and captain access
-- never depend on the Fantasy player pool.

create table if not exists public.sportsgamer_league_teams_current (
  sports_gamer_league_id bigint not null,
  sports_gamer_team_id bigint not null,
  team_name text not null,
  team_logo_url text,
  captain_player_id bigint,
  assistant_1_player_id bigint,
  assistant_2_player_id bigint,
  registered_at date,
  is_available boolean not null default true,
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (sports_gamer_league_id, sports_gamer_team_id)
);

create table if not exists public.sportsgamer_league_roster_current (
  sports_gamer_league_id bigint not null,
  sports_gamer_team_id bigint not null,
  sports_gamer_player_id bigint not null,
  display_gamertag text not null,
  player_country text,
  player_image text,
  player_number integer,
  preferred_position text,
  captain_role text check (captain_role in ('C','A') or captain_role is null),
  is_available boolean not null default true,
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (sports_gamer_league_id, sports_gamer_team_id, sports_gamer_player_id)
);

create index if not exists sportsgamer_league_teams_current_available_idx
  on public.sportsgamer_league_teams_current (sports_gamer_league_id, is_available);

create index if not exists sportsgamer_league_roster_current_team_idx
  on public.sportsgamer_league_roster_current (sports_gamer_league_id, sports_gamer_team_id, is_available);

alter table public.sportsgamer_league_teams_current enable row level security;
alter table public.sportsgamer_league_roster_current enable row level security;

drop policy if exists "Public can read current SportsGamer league teams"
  on public.sportsgamer_league_teams_current;
create policy "Public can read current SportsGamer league teams"
  on public.sportsgamer_league_teams_current
  for select to anon, authenticated using (true);

drop policy if exists "Public can read current SportsGamer league rosters"
  on public.sportsgamer_league_roster_current;
create policy "Public can read current SportsGamer league rosters"
  on public.sportsgamer_league_roster_current
  for select to anon, authenticated using (true);

grant select on public.sportsgamer_league_teams_current to anon, authenticated;
grant select on public.sportsgamer_league_roster_current to anon, authenticated;
grant all on public.sportsgamer_league_teams_current to service_role;
grant all on public.sportsgamer_league_roster_current to service_role;

drop trigger if exists trg_seh_apply_scl27_league_captains on public.team_entries;
drop function if exists public.seh_apply_scl27_league_captains();

create or replace function public.seh_sync_scl27_official_teams()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source_id bigint;
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
  v_withdrawn integer := 0;
  r record;
begin
  select id into v_source_id
  from public.source_systems
  where code='SPORTSGAMER'
  limit 1;

  if v_source_id is null then
    raise exception 'SportsGamer source system saknas.';
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
  end if;

  for r in
    select *
    from public.sportsgamer_league_teams_current
    where sports_gamer_league_id=527
      and is_available=true
    order by team_name,sports_gamer_team_id
  loop
    v_name := trim(r.team_name);
    v_norm := public.normalize_team_identity_name(v_name);
    v_match_key := regexp_replace(v_norm, '\s+(e sport|esport|esports)$', '', 'i');
    v_profile_url := 'https://sportsgamer.gg/leagues/527/teams/' || r.sports_gamer_team_id::text;
    v_registered_at := coalesce(r.registered_at,current_date);
    v_candidates := null;

    select array_agg(distinct e.team_id order by e.team_id)
    into v_candidates
    from public.team_external_ids e
    where e.source_system_id=v_source_id
      and e.external_team_id=r.sports_gamer_team_id::text;

    if coalesce(cardinality(v_candidates),0)=0 then
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
    end if;

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
          logo_url=coalesce(r.team_logo_url,logo_url),
          profile_url=v_profile_url,
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
      do update set profile_url=excluded.profile_url,updated_at=now();
    end if;

    insert into public.team_entries(
      id,league_id,team_id,source_name,display_name_override,country_at_entry,
      registered_for_league,captain_external_player_id,assistant_1_external_player_id,
      assistant_2_external_player_id,status,source_system_id,source_url,extra,registered_at
    )
    values(
      nextval('public.team_entries_id_seq'::regclass),
      v_league_id,v_team_id,v_name,null,'SE',
      true,
      r.captain_player_id::text,
      r.assistant_1_player_id::text,
      r.assistant_2_player_id::text,
      'registered',v_source_id,v_profile_url,
      jsonb_build_object(
        'official_scl27',true,
        'sports_gamer_team_id',r.sports_gamer_team_id,
        'competition_code','SCL2027',
        'source_updated_at',r.source_updated_at,
        'leadership_source','sportsgamer_league_teams'
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
      registered_at=coalesce(public.team_entries.registered_at,excluded.registered_at),
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

  update public.team_entries te
  set registered_for_league=false,
      status='withdrawn',
      updated_at=now()
  where te.league_id=v_league_id
    and coalesce(te.extra->>'official_scl27','false')='true'
    and not exists (
      select 1
      from public.sportsgamer_league_teams_current s
      where s.sports_gamer_league_id=527
        and s.is_available=true
        and s.sports_gamer_team_id::text=te.extra->>'sports_gamer_team_id'
    );
  get diagnostics v_withdrawn = row_count;

  return jsonb_build_object(
    'league_id',v_league_id,
    'created',v_created,
    'updated',v_updated,
    'ambiguous',v_ambiguous,
    'external_id_conflicts',v_external_id_conflicts,
    'withdrawn',v_withdrawn,
    'official_teams',(
      select count(*)
      from public.sportsgamer_league_teams_current s
      where s.sports_gamer_league_id=527
        and s.is_available=true
    )
  );
end;
$function$;

revoke all on function public.seh_sync_scl27_official_teams() from public, anon, authenticated;
grant execute on function public.seh_sync_scl27_official_teams() to service_role;
