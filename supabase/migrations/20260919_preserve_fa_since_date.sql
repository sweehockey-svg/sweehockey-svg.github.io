-- Preserve the original Free Agent "since" date when an active FA entry is updated.

create or replace function public.seh_discord_submit_free_agent_request_v1(
  p_discord_user_id text,
  p_positions_text text default null,
  p_levels_text text default null,
  p_request_type text default 'create'
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $function$
declare
  v_link public.ehockey_discord_player_links%rowtype;
  v_player public.app_player_directory_cache%rowtype;
  v_type text := lower(trim(coalesce(p_request_type,'create')));
  v_positions text;
  v_levels text;
  v_pending_id bigint;
  v_has_active boolean := false;
  v_existing_fa_date date;
  v_request_fa_date date;
  v_result jsonb;
begin
  select * into v_link
  from public.ehockey_discord_player_links
  where discord_user_id = nullif(trim(p_discord_user_id),'')
    and status = 'approved'
    and approved_player_key is not null
  order by reviewed_at desc nulls last, updated_at desc
  limit 1;

  if v_link.user_id is null then
    return jsonb_build_object('linked',false);
  end if;

  select * into v_player
  from public.app_player_directory_cache
  where player_key = v_link.approved_player_key
  limit 1;

  if v_player.player_key is null then
    raise exception 'Spelarprofilen hittades inte.';
  end if;

  select true,f.fa_date
    into v_has_active,v_existing_fa_date
  from public.ehockey_free_agents f
  where f.player_key=v_link.approved_player_key
    and f.is_active=true
    and (f.expires_at is null or f.expires_at>now())
  limit 1;

  v_has_active := coalesce(v_has_active,false);

  if v_type='remove' then
    if not v_has_active then
      return jsonb_build_object(
        'linked',true,'ok',false,'error_code','not_active',
        'player_key',v_player.player_key,'display_gamertag',v_player.display_gamertag
      );
    end if;
  else
    v_type := case when v_has_active then 'update' else 'create' end;
  end if;

  v_request_fa_date := case
    when v_type in ('update','remove') then coalesce(v_existing_fa_date,current_date)
    else current_date
  end;

  v_positions := nullif(trim(coalesce(p_positions_text,'')),'');
  if v_positions is null then
    v_positions := nullif(trim(coalesce(v_player.primary_position,'')),'');
  end if;

  v_levels := nullif(trim(coalesce(p_levels_text,'')),'');
  if v_type<>'remove' and v_levels is null then
    v_levels := 'Öppen för förslag';
  end if;

  select r.id into v_pending_id
  from public.ehockey_free_agent_requests r
  where r.user_id=v_link.user_id and r.status='pending'
  order by r.submitted_at desc
  limit 1;

  if v_pending_id is null then
    insert into public.ehockey_free_agent_requests(
      user_id,player_key,discord_username,request_type,status,
      positions_text,levels_text,availability,message,contact,fa_date
    ) values(
      v_link.user_id,v_link.approved_player_key,v_link.discord_username,v_type,'pending',
      case when v_type='remove' then null else v_positions end,
      case when v_type='remove' then null else v_levels end,
      null,null,
      case when nullif(trim(coalesce(v_link.discord_username,'')),'') is not null
        then 'Discord: @'||trim(v_link.discord_username) else null end,
      v_request_fa_date
    ) returning id into v_pending_id;
  else
    update public.ehockey_free_agent_requests set
      player_key=v_link.approved_player_key,
      discord_username=v_link.discord_username,
      request_type=v_type,
      positions_text=case when v_type='remove' then null else v_positions end,
      levels_text=case when v_type='remove' then null else v_levels end,
      availability=null,message=null,
      contact=case when nullif(trim(coalesce(v_link.discord_username,'')),'') is not null
        then 'Discord: @'||trim(v_link.discord_username) else null end,
      fa_date=v_request_fa_date,
      submitted_at=now(),reviewed_at=null,reviewed_by=null,admin_note=null,updated_at=now()
    where id=v_pending_id;
  end if;

  select jsonb_build_object(
    'linked',true,'ok',true,'request_id',v_pending_id,'request_type',v_type,
    'player_key',v_player.player_key,'display_gamertag',v_player.display_gamertag,
    'primary_position',v_player.primary_position,
    'positions_text',case when v_type='remove' then null else v_positions end,
    'levels_text',case when v_type='remove' then null else v_levels end,
    'player_image',v_player.player_image,
    'sports_gamer_player_id',substring(coalesce(v_player.sports_gamer_player_url,'') from '/players/([0-9]+)'),
    'latest_team',v_player.latest_team,'discord_username',v_link.discord_username,
    'is_active',v_has_active,'fa_date',v_request_fa_date
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.seh_submit_free_agent_request(
  p_request_type text,
  p_positions_text text default null,
  p_levels_text text default null,
  p_availability text default null,
  p_message text default null,
  p_contact text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
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
  from public.app_player_directory_cache d
  where d.player_key=v_player_key
  limit 1;

  select true,f.fa_date
    into v_has_active,v_existing_fa_date
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
  if v_positions is null then v_positions:=nullif(trim(coalesce(v_default_position,'')),''); end if;

  select r.id into v_pending_id
  from public.ehockey_free_agent_requests r
  where r.user_id=v_user and r.status='pending'
  limit 1;

  if v_pending_id is null then
    insert into public.ehockey_free_agent_requests(
      user_id,player_key,discord_username,request_type,status,
      positions_text,levels_text,availability,message,contact,fa_date
    ) values(
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

notify pgrst,'reload schema';
