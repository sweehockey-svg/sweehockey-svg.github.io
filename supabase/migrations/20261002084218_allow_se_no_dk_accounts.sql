
create table if not exists public.app_account_player_directory_cache
(like public.app_player_directory_cache including all);

alter table public.app_account_player_directory_cache enable row level security;

grant select on public.app_account_player_directory_cache to anon, authenticated, service_role;

drop policy if exists "Public read account player directory cache"
  on public.app_account_player_directory_cache;
create policy "Public read account player directory cache"
  on public.app_account_player_directory_cache
  for select
  to anon, authenticated
  using (true);

create index if not exists app_account_player_directory_cache_country_idx
  on public.app_account_player_directory_cache (player_country);

create or replace function public.refresh_app_account_player_directory_cache()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from public.app_account_player_directory_cache;

  insert into public.app_account_player_directory_cache (
    player_key, display_gamertag, player_image, sports_gamer_player_url,
    primary_position, latest_season, latest_team, competitions, divisions,
    filter_divisions, club_names, club_count, total_skater_games,
    total_goalie_games, career_games, total_points, player_type, updated_at,
    player_country, last_appearance_date, tournament_count, total_goals,
    total_assists, total_goalie_saves, total_goalie_shots_against,
    total_goalie_save_percentage
  )
  select
    player_key, display_gamertag, player_image, sports_gamer_player_url,
    primary_position, latest_season, latest_team, competitions, divisions,
    filter_divisions, club_names, club_count, total_skater_games,
    total_goalie_games, career_games, total_points, player_type, now(),
    player_country, last_appearance_date, tournament_count, total_goals,
    total_assists, total_goalie_saves, total_goalie_shots_against,
    total_goalie_save_percentage
  from public.app_player_directory_cache;

  insert into public.app_account_player_directory_cache (
    player_key, display_gamertag, player_image, sports_gamer_player_url,
    primary_position, latest_season, latest_team, competitions, divisions,
    filter_divisions, club_names, club_count, total_skater_games,
    total_goalie_games, career_games, total_points, player_type, updated_at,
    player_country, last_appearance_date, tournament_count, total_goals,
    total_assists, total_goalie_saves, total_goalie_shots_against,
    total_goalie_save_percentage
  )
  select
    coalesce(
      latest.player_key,
      md5(
        case
          when registry.sports_gamer_player_id is not null
            then 'SPORTSGAMER:' || registry.sports_gamer_player_id::text
          else 'REGISTRY:' || registry.player_id::text
        end
      )
    ) as player_key,
    coalesce(
      nullif(trim(latest.display_gamertag), ''),
      nullif(trim(registry.display_gamertag), ''),
      nullif(trim(registry.sports_gamer_gamertag), ''),
      'Okänd spelare'
    ) as display_gamertag,
    latest.player_image,
    case
      when registry.sports_gamer_player_id is not null
        then 'https://sportsgamer.gg/players/' || registry.sports_gamer_player_id::text
      else null
    end as sports_gamer_player_url,
    latest.primary_position,
    latest.latest_season,
    latest.latest_team,
    coalesce(labels.competitions, '{}'::text[]),
    coalesce(labels.divisions, '{}'::text[]),
    coalesce(labels.filter_divisions, '{}'::text[]),
    coalesce(labels.club_names, '{}'::text[]),
    coalesce(labels.club_count, 0),
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    case when upper(coalesce(latest.primary_position,'')) = 'G' then 'goalie' else 'skater' end,
    now(),
    registry.country_code,
    latest.last_appearance_date,
    coalesce(labels.tournament_count, 0),
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::numeric
  from public.v_ehockey_player_registry registry
  left join lateral (
    select
      h.player_key,
      h.display_gamertag,
      h.player_image,
      h.primary_position,
      coalesce(nullif(trim(h.season_label),''), nullif(trim(h.league_name),'')) as latest_season,
      coalesce(nullif(trim(h.team_name_in_tournament),''), nullif(trim(h.team_current_name),'')) as latest_team,
      coalesce(h.chronology_date, h.display_end_date, h.end_date, h.sort_date)::date as last_appearance_date
    from public.ehockey_player_history_cache_v25 h
    where registry.sports_gamer_player_id is not null
      and h.effective_sports_gamer_player_id = registry.sports_gamer_player_id
    order by h.chronology_date desc nulls last,
             h.display_end_date desc nulls last,
             h.end_date desc nulls last,
             h.sort_date desc nulls last,
             h.league_id desc nulls last
    limit 1
  ) latest on true
  left join lateral (
    select
      count(distinct h.league_id)::integer as tournament_count,
      array_agg(distinct upper(nullif(trim(h.competition_code),'')))
        filter (where nullif(trim(h.competition_code),'') is not null) as competitions,
      array_agg(distinct nullif(trim(h.division),''))
        filter (where nullif(trim(h.division),'') is not null) as divisions,
      array_agg(distinct nullif(trim(h.division),''))
        filter (where nullif(trim(h.division),'') is not null) as filter_divisions,
      array_agg(distinct coalesce(nullif(trim(h.team_name_in_tournament),''), nullif(trim(h.team_current_name),'')))
        filter (where coalesce(nullif(trim(h.team_name_in_tournament),''), nullif(trim(h.team_current_name),'')) is not null) as club_names,
      count(distinct lower(regexp_replace(
        coalesce(nullif(trim(h.team_name_in_tournament),''), nullif(trim(h.team_current_name),''), ''),
        '[^[:alnum:]]+','','g'
      ))) filter (
        where coalesce(nullif(trim(h.team_name_in_tournament),''), nullif(trim(h.team_current_name),'')) is not null
      )::integer as club_count
    from public.ehockey_player_history_cache_v25 h
    where registry.sports_gamer_player_id is not null
      and h.effective_sports_gamer_player_id = registry.sports_gamer_player_id
  ) labels on true
  where registry.country_code in ('NO','DK')
    and not exists (
      select 1
      from public.app_account_player_directory_cache existing
      where existing.player_key = coalesce(
        latest.player_key,
        md5(
          case
            when registry.sports_gamer_player_id is not null
              then 'SPORTSGAMER:' || registry.sports_gamer_player_id::text
            else 'REGISTRY:' || registry.player_id::text
          end
        )
      )
    );
end;
$function$;

revoke all on function public.refresh_app_account_player_directory_cache() from public, anon, authenticated;
grant execute on function public.refresh_app_account_player_directory_cache() to service_role;

create or replace function public.trg_refresh_app_account_player_directory_cache()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.refresh_app_account_player_directory_cache();
  return null;
end;
$function$;

revoke all on function public.trg_refresh_app_account_player_directory_cache() from public, anon, authenticated;

drop trigger if exists refresh_app_account_player_directory_after_insert
  on public.app_player_directory_cache;
create trigger refresh_app_account_player_directory_after_insert
after insert on public.app_player_directory_cache
for each statement
execute function public.trg_refresh_app_account_player_directory_cache();

create or replace function public.seh_request_discord_player_link(p_player_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_discord_id text;
  v_identity jsonb;
  v_username text;
  v_gamertag text;
  v_country text;
  v_existing_owner uuid;
begin
  if v_user is null then raise exception 'Du måste logga in med Discord först.'; end if;

  select i.provider_id, i.identity_data
    into v_discord_id, v_identity
  from auth.identities i
  where i.user_id = v_user and i.provider = 'discord'
  order by i.created_at
  limit 1;

  if v_discord_id is null then raise exception 'Det här kontot är inte inloggat med Discord.'; end if;

  select d.display_gamertag, upper(trim(coalesce(d.player_country,'')))
    into v_gamertag, v_country
  from public.app_account_player_directory_cache d
  where d.player_key = trim(p_player_key)
  limit 1;

  if v_gamertag is null then raise exception 'Spelarprofilen kunde inte hittas.'; end if;
  if v_country not in ('SE','NO','DK') then
    raise exception 'Endast svenska, norska och danska spelarprofiler kan kopplas till konto.';
  end if;

  select l.user_id into v_existing_owner
  from public.ehockey_discord_player_links l
  where l.approved_player_key = trim(p_player_key)
    and l.status = 'approved'
    and l.user_id <> v_user
  limit 1;

  if v_existing_owner is not null then
    raise exception 'Den här spelarprofilen är redan kopplad till ett annat Discord-konto.';
  end if;

  v_username := coalesce(
    nullif(v_identity->>'global_name',''),
    nullif(v_identity->>'username',''),
    nullif(v_identity->>'full_name',''),
    nullif(v_identity->>'name',''),
    'Discord ' || v_discord_id
  );

  insert into public.ehockey_discord_player_links (
    user_id, discord_user_id, discord_username, requested_player_key, status
  ) values (
    v_user, v_discord_id, v_username, trim(p_player_key), 'pending'
  )
  on conflict (user_id) do update set
    discord_user_id = excluded.discord_user_id,
    discord_username = excluded.discord_username,
    requested_player_key = excluded.requested_player_key,
    status = 'pending',
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now();

  return jsonb_build_object(
    'status','pending',
    'player_key',trim(p_player_key),
    'display_gamertag',v_gamertag,
    'player_country',v_country,
    'discord_username',v_username
  );
end;
$function$;

create or replace function public.seh_review_discord_player_link(p_user_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_admin uuid := auth.uid();
  v_role text;
  v_decision text := lower(trim(coalesce(p_decision,'')));
  v_requested text;
  v_name text;
  v_existing_owner uuid;
begin
  select w.role into v_role from public.seh_current_writer() w limit 1;
  if lower(coalesce(v_role,'')) <> 'admin' then raise exception 'Adminbehörighet krävs.'; end if;
  if v_decision not in ('approved','rejected') then raise exception 'Ogiltigt beslut.'; end if;

  select requested_player_key into v_requested
  from public.ehockey_discord_player_links
  where user_id = p_user_id
  for update;
  if v_requested is null then raise exception 'Ingen väntande spelarkoppling hittades.'; end if;

  if v_decision = 'approved' then
    select display_gamertag into v_name
    from public.app_account_player_directory_cache
    where player_key = v_requested
    limit 1;
    if v_name is null then raise exception 'Spelarprofilen finns inte längre.'; end if;

    select l.user_id into v_existing_owner
    from public.ehockey_discord_player_links l
    where l.approved_player_key = v_requested
      and l.status = 'approved'
      and l.user_id <> p_user_id
    limit 1;

    if v_existing_owner is not null then
      raise exception 'Spelarprofilen är redan kopplad till ett annat Discord-konto.';
    end if;

    update public.ehockey_discord_player_links set
      approved_player_key = v_requested,
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin,
      updated_at = now()
    where user_id = p_user_id;
  else
    update public.ehockey_discord_player_links set
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_admin,
      updated_at = now()
    where user_id = p_user_id;
  end if;

  return jsonb_build_object('user_id',p_user_id,'status',v_decision,'player_key',v_requested,'display_gamertag',v_name);
end;
$function$;

create or replace function public.seh_get_my_player_account()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_link public.ehockey_discord_player_links%rowtype;
  v_player_name text := '';
  v_player_country text := '';
begin
  if v_user is null then raise exception 'Du måste logga in först.'; end if;

  select * into v_link
  from public.ehockey_discord_player_links
  where user_id = v_user
  limit 1;

  if v_link.user_id is null then
    return jsonb_build_object(
      'status', 'unlinked',
      'player_key', '',
      'requested_player_key', '',
      'player_name', '',
      'player_country', '',
      'discord_username', ''
    );
  end if;

  if v_link.status = 'approved' and v_link.approved_player_key is not null then
    select coalesce(d.display_gamertag, ''), coalesce(d.player_country,'')
      into v_player_name, v_player_country
    from public.app_account_player_directory_cache d
    where d.player_key = v_link.approved_player_key
    limit 1;
  end if;

  return jsonb_build_object(
    'status', coalesce(v_link.status, 'unlinked'),
    'player_key', coalesce(v_link.approved_player_key, ''),
    'requested_player_key', coalesce(v_link.requested_player_key, ''),
    'player_name', coalesce(v_player_name, ''),
    'player_country', coalesce(v_player_country, ''),
    'discord_username', coalesce(v_link.discord_username, '')
  );
end;
$function$;

create or replace function public.seh_get_my_player_dashboard()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_link public.ehockey_discord_player_links%rowtype;
  v_player jsonb;
  v_profile jsonb;
  v_fa jsonb;
  v_requests jsonb;
begin
  if v_user is null then raise exception 'Du måste logga in med Discord först.'; end if;

  select * into v_link
  from public.ehockey_discord_player_links
  where user_id = v_user
  limit 1;

  if v_link.user_id is null or v_link.status <> 'approved' or v_link.approved_player_key is null then
    raise exception 'Ditt Discord-konto måste vara kopplat till en spelarprofil och godkänt av admin.';
  end if;

  select jsonb_build_object(
    'player_key', d.player_key,
    'display_gamertag', d.display_gamertag,
    'player_country', d.player_country,
    'primary_position', d.primary_position,
    'player_image', d.player_image,
    'sports_gamer_player_url', d.sports_gamer_player_url,
    'latest_team', d.latest_team,
    'career_games', d.career_games,
    'total_points', d.total_points,
    'latest_ecl_team', e.team_name,
    'latest_ecl_division', e.division,
    'latest_ecl_season', e.season_label
  ) into v_player
  from public.app_account_player_directory_cache d
  left join lateral (
    select
      coalesce(nullif(h.team_name_in_tournament,''), nullif(h.team_current_name,'')) as team_name,
      h.division,
      h.season_label
    from public.ehockey_player_history_cache_v25 h
    where h.player_key = d.player_key
      and upper(coalesce(h.competition_code,'')) = 'ECL'
      and coalesce(h.appearance_games,0) > 0
    order by h.chronology_date desc nulls last,
             h.display_end_date desc nulls last,
             h.end_date desc nulls last,
             h.league_id desc nulls last
    limit 1
  ) e on true
  where d.player_key = v_link.approved_player_key
  limit 1;

  select to_jsonb(p) into v_profile
  from public.ehockey_player_self_profiles p
  where p.player_key = v_link.approved_player_key;

  select jsonb_build_object(
    'id', f.id,
    'positions_text', f.positions_text,
    'levels_text', f.levels_text,
    'availability', f.availability,
    'message', f.message,
    'contact', f.contact,
    'fa_date', f.fa_date,
    'is_active', f.is_active
  ) into v_fa
  from public.ehockey_free_agents f
  where f.player_key = v_link.approved_player_key
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'request_type', r.request_type,
    'status', r.status,
    'payload', r.payload,
    'submitted_at', r.submitted_at,
    'reviewed_at', r.reviewed_at,
    'admin_note', r.admin_note
  ) order by r.submitted_at desc), '[]'::jsonb)
  into v_requests
  from (
    select *
    from public.ehockey_player_profile_requests
    where user_id = v_user
    order by submitted_at desc
    limit 25
  ) r;

  return jsonb_build_object(
    'discord_username', v_link.discord_username,
    'player', coalesce(v_player, '{}'::jsonb),
    'profile', coalesce(v_profile, '{}'::jsonb),
    'free_agent', coalesce(v_fa, '{}'::jsonb),
    'requests', coalesce(v_requests, '[]'::jsonb)
  );
end;
$function$;

create or replace function public.seh_get_linked_player_summary(p_player_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_is_admin boolean := false;
  v_allowed boolean := false;
  v_result jsonb;
begin
  if v_user is null then raise exception 'Du måste vara inloggad.'; end if;

  select exists(
    select 1 from public.seh_current_writer() w
    where lower(coalesce(w.role,'')) = 'admin'
  ) into v_is_admin;

  select exists(
    select 1 from public.ehockey_discord_player_links l
    where l.user_id = v_user
      and (l.approved_player_key = p_player_key or l.requested_player_key = p_player_key)
  ) into v_allowed;

  if not v_is_admin and not v_allowed then
    raise exception 'Du har inte behörighet till spelarprofilen.';
  end if;

  select jsonb_build_object(
    'player_key', d.player_key,
    'display_gamertag', d.display_gamertag,
    'player_country', d.player_country,
    'primary_position', d.primary_position,
    'latest_team', d.latest_team,
    'latest_ecl_team', e.team_name,
    'latest_ecl_division', e.division
  ) into v_result
  from public.app_account_player_directory_cache d
  left join lateral (
    select
      coalesce(nullif(h.team_name_in_tournament,''), nullif(h.team_current_name,'')) as team_name,
      h.division
    from public.ehockey_player_history_cache_v25 h
    where h.player_key = d.player_key
      and upper(coalesce(h.competition_code,'')) = 'ECL'
      and coalesce(h.appearance_games,0) > 0
    order by h.chronology_date desc nulls last,
             h.display_end_date desc nulls last,
             h.end_date desc nulls last,
             h.league_id desc nulls last
    limit 1
  ) e on true
  where d.player_key = p_player_key
  limit 1;

  if v_result is null then raise exception 'Spelarprofilen hittades inte.'; end if;
  return v_result;
end;
$function$;

create or replace function public.seh_submit_free_agent_request(
  p_request_type text,
  p_positions_text text default null::text,
  p_levels_text text default null::text,
  p_availability text default null::text,
  p_message text default null::text,
  p_contact text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_player_key text;
  v_discord_username text;
  v_default_position text;
  v_positions text;
  v_type text := lower(trim(coalesce(p_request_type,'')));
  v_pending_id bigint;
  v_has_active boolean := false;
  v_existing_fa_date date;
  v_request_fa_date date;
begin
  if v_user is null then raise exception 'Du måste logga in med Discord först.'; end if;
  if v_type not in ('create','update','remove') then raise exception 'Ogiltig typ av Free Agent-förfrågan.'; end if;

  select l.approved_player_key,l.discord_username
    into v_player_key,v_discord_username
  from public.ehockey_discord_player_links l
  where l.user_id=v_user;

  if v_player_key is null then
    raise exception 'Din Discord-användare måste först kopplas till en spelarprofil och godkännas av admin.';
  end if;

  select d.primary_position into v_default_position
  from public.app_account_player_directory_cache d
  where d.player_key=v_player_key
  limit 1;

  select true,f.fa_date into v_has_active,v_existing_fa_date
  from public.ehockey_free_agents f
  where f.player_key=v_player_key
    and f.is_active=true
    and (f.expires_at is null or f.expires_at>now())
  limit 1;

  v_has_active := coalesce(v_has_active,false);

  if v_type='remove' and not v_has_active then
    raise exception 'Du finns inte på den aktiva Free Agent-listan.';
  end if;

  if v_type in ('create','update') then
    v_type := case when v_has_active then 'update' else 'create' end;
  end if;

  v_request_fa_date := case
    when v_type in ('update','remove') then coalesce(v_existing_fa_date,current_date)
    else current_date
  end;

  v_positions := nullif(trim(coalesce(p_positions_text,'')),'');
  if v_positions is null then
    v_positions := nullif(trim(coalesce(v_default_position,'')),'');
  end if;

  select r.id into v_pending_id
  from public.ehockey_free_agent_requests r
  where r.user_id=v_user and r.status='pending'
  limit 1;

  if v_pending_id is null then
    insert into public.ehockey_free_agent_requests (
      user_id,player_key,discord_username,request_type,status,
      positions_text,levels_text,availability,message,contact,fa_date
    ) values (
      v_user,v_player_key,v_discord_username,v_type,'pending',
      v_positions,
      nullif(trim(coalesce(p_levels_text,'')),''),
      nullif(trim(coalesce(p_availability,'')),''),
      nullif(trim(coalesce(p_message,'')),''),
      coalesce(nullif(trim(coalesce(p_contact,'')),''),
        case when v_discord_username is not null then 'Discord: '||v_discord_username else null end),
      v_request_fa_date
    ) returning id into v_pending_id;
  else
    update public.ehockey_free_agent_requests set
      player_key=v_player_key,
      discord_username=v_discord_username,
      request_type=v_type,
      positions_text=v_positions,
      levels_text=nullif(trim(coalesce(p_levels_text,'')),''),
      availability=nullif(trim(coalesce(p_availability,'')),''),
      message=nullif(trim(coalesce(p_message,'')),''),
      contact=coalesce(nullif(trim(coalesce(p_contact,'')),''),
        case when v_discord_username is not null then 'Discord: '||v_discord_username else null end),
      fa_date=v_request_fa_date,
      submitted_at=now(),reviewed_at=null,reviewed_by=null,admin_note=null,updated_at=now()
    where id=v_pending_id;
  end if;

  return jsonb_build_object(
    'id',v_pending_id,'status','pending','request_type',v_type,
    'player_key',v_player_key,'fa_date',v_request_fa_date
  );
end;
$function$;

create or replace function public.seh_notify_discord_link_status()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_name text;
  v_title text;
  v_message text;
  v_player_key text;
begin
  if old.status is not distinct from new.status or new.status not in ('approved','rejected') then
    return new;
  end if;

  v_player_key := coalesce(new.approved_player_key, new.requested_player_key);
  select d.display_gamertag into v_name
  from public.app_account_player_directory_cache d
  where d.player_key = v_player_key
  limit 1;
  v_name := coalesce(v_name, 'spelaren');

  if new.status = 'approved' then
    v_title := 'Din spelarprofil är kopplad';
    v_message := format('Ditt Discord-konto är nu godkänt och kopplat till %s på Svensk eHockey.', v_name);
  else
    v_title := 'Din profilkoppling är avslagen';
    v_message := format('Begäran att koppla ditt Discord-konto till %s godkändes inte.', v_name);
  end if;

  perform public.seh_queue_discord_notification(
    new.user_id,
    'player_link_' || new.status,
    v_title,
    v_message || E'\n\nSvensk eHockey: https://www.svenskehockey.se/',
    'discord_player_link',
    new.user_id::text
  );

  return new;
end;
$function$;

select public.refresh_app_account_player_directory_cache();
