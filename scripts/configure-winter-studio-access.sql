CREATE OR REPLACE FUNCTION public.seh_team_jersey_access(p_team_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_player_key text := '';
  v_staff_role text := '';
  v_is_admin boolean := false;
  v_winter_role text := '';
begin
  if v_uid is null or p_team_id is null or p_team_id <= 0 then
    return jsonb_build_object(
      'can_edit', false,
      'is_admin', false,
      'staff_role', '',
      'player_key', ''
    );
  end if;

  select exists (
    select 1
    from public.seh_news_code_writers w
    where w.auth_uid = v_uid
      and w.active = true
      and lower(w.role) = 'admin'
  )
  into v_is_admin;

  select coalesce(l.approved_player_key, '')
  into v_player_key
  from public.ehockey_discord_player_links l
  where l.user_id = v_uid
    and l.status = 'approved'
    and l.approved_player_key is not null
  limit 1;

  if coalesce(v_player_key, '') <> '' then
    -- Current Winter registration determines studio access, not past leadership.
    select case when r.captain_player_id::text=substring(d.sports_gamer_player_url from '/players/([0-9]+)')
      then 'captain' else 'assistant_captain' end
    into v_winter_role
    from public.app_player_directory_cache d
    join public.v_local_team_list t on t.team_id=p_team_id
    join public.sportsgamer_league_teams_current r
      on r.sports_gamer_team_id::text=any(t.sports_gamer_team_ids)
      and r.sports_gamer_league_id=535 and r.is_available=true
    where d.player_key=v_player_key
      and substring(d.sports_gamer_player_url from '/players/([0-9]+)') in
        (r.captain_player_id::text,r.assistant_1_player_id::text,r.assistant_2_player_id::text)
    order by r.source_updated_at desc limit 1;

    -- Keep manual staff assignments as an override/fallback.
    select coalesce(s.role, '')
    into v_staff_role
    from public.ehockey_team_staff s
    where s.team_id = p_team_id
      and s.player_key = v_player_key
      and s.active = true
      and s.role in ('captain','assistant_captain','manager')
    limit 1;

    -- The public team profile leadership cache is now the automatic source
    -- for captain permissions. C = captain, A = assistant captain.
    if coalesce(v_staff_role, '') = '' then
      select case upper(coalesce(c.captain_role, ''))
               when 'C' then 'captain'
               when 'A' then 'assistant_captain'
               else ''
             end
      into v_staff_role
      from public.app_team_latest_leadership_cache c
      where c.team_id = p_team_id
        and c.player_key = v_player_key
        and upper(coalesce(c.captain_role, '')) in ('C','A')
      order by
        case upper(c.captain_role) when 'C' then 0 else 1 end,
        c.leadership_date desc nulls last
      limit 1;
    end if;
  end if;

  return jsonb_build_object(
    'can_edit', v_is_admin or coalesce(v_staff_role, '') <> '' or coalesce(v_winter_role,'')<>'',
    'can_use_winter_studio', v_is_admin or coalesce(v_winter_role,'')<>'',
    'is_admin', v_is_admin,
    'staff_role', coalesce(nullif(v_winter_role,''),v_staff_role, ''),
    'player_key', coalesce(v_player_key, '')
  );
end;
$function$;

revoke all on function public.seh_team_jersey_access(bigint) from public;
grant execute on function public.seh_team_jersey_access(bigint) to authenticated, service_role;
create or replace function public.seh_winter_studio_access()
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_key text;
  v_admin boolean:=false;
  v_teams jsonb:='[]'::jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('is_admin',false,'teams','[]'::jsonb);
  end if;
  select exists(select from public.seh_news_code_writers where auth_uid=v_uid and active and lower(role)='admin') into v_admin;
  select approved_player_key into v_key from public.ehockey_discord_player_links
    where user_id=v_uid and status='approved' and approved_player_key is not null limit 1;
  if v_key is not null then
    select coalesce(jsonb_agg(jsonb_build_object('teamId',r.sports_gamer_team_id,'teamName',r.team_name)),'[]'::jsonb)
    into v_teams
    from public.sportsgamer_league_teams_current r
    where r.sports_gamer_league_id=535 and r.is_available and exists(
      select from public.app_player_directory_cache d where d.player_key=v_key
      and substring(d.sports_gamer_player_url from '/players/([0-9]+)') in
        (r.captain_player_id::text,r.assistant_1_player_id::text,r.assistant_2_player_id::text)
    );
  end if;
  return jsonb_build_object('is_admin',v_admin,'teams',v_teams);
end $$;
revoke all on function public.seh_winter_studio_access() from public,anon;
grant execute on function public.seh_winter_studio_access() to authenticated,service_role;
-- Only the caller's approved player identity is checked; no user ID is accepted.
