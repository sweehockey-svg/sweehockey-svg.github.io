-- Discord !fa v2: free text and friendlier command parsing.

create or replace function public.seh_discord_submit_free_agent_request_v2(
  p_discord_user_id text,
  p_positions_text text default null,
  p_levels_text text default null,
  p_request_type text default 'create',
  p_message text default null
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
  v_message text;
  v_pending_id bigint;
  v_has_active boolean := false;
  v_active_fa_date date;
  v_request_fa_date date := current_date;
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

  select exists(
    select 1 from public.ehockey_free_agents f
    where f.player_key=v_link.approved_player_key
      and f.is_active=true
      and (f.expires_at is null or f.expires_at>now())
  ) into v_has_active;

  if v_has_active then
    select f.fa_date into v_active_fa_date
    from public.ehockey_free_agents f
    where f.player_key=v_link.approved_player_key
      and f.is_active=true
    limit 1;
  end if;

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

  if v_type='update' and v_active_fa_date is not null then
    v_request_fa_date := v_active_fa_date;
  end if;

  v_positions := left(nullif(trim(coalesce(p_positions_text,'')),''),100);
  if v_positions is null then
    v_positions := left(nullif(trim(coalesce(v_player.primary_position,'')),''),100);
  end if;

  v_levels := left(nullif(trim(coalesce(p_levels_text,'')),''),100);
  if v_type <> 'remove' and v_levels is null then
    v_levels := 'Öppen för förslag';
  end if;

  v_message := left(nullif(trim(coalesce(p_message,'')),''),500);

  select r.id into v_pending_id
  from public.ehockey_free_agent_requests r
  where r.user_id=v_link.user_id and r.status='pending'
  order by r.submitted_at desc
  limit 1;

  if v_pending_id is null then
    insert into public.ehockey_free_agent_requests(
      user_id,player_key,discord_username,request_type,status,
      positions_text,levels_text,availability,message,contact,fa_date
    ) values (
      v_link.user_id,v_link.approved_player_key,v_link.discord_username,v_type,'pending',
      case when v_type='remove' then null else v_positions end,
      case when v_type='remove' then null else v_levels end,
      null,
      case when v_type='remove' then null else v_message end,
      case when nullif(trim(coalesce(v_link.discord_username,'')),'') is not null
        then 'Discord: @'||trim(v_link.discord_username) else null end,
      v_request_fa_date
    )
    returning id into v_pending_id;
  else
    update public.ehockey_free_agent_requests
    set player_key=v_link.approved_player_key,
        discord_username=v_link.discord_username,
        request_type=v_type,
        positions_text=case when v_type='remove' then null else v_positions end,
        levels_text=case when v_type='remove' then null else v_levels end,
        availability=null,
        message=case when v_type='remove' then null else v_message end,
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
    'message',case when v_type='remove' then null else v_message end,
    'player_image',v_player.player_image,
    'sports_gamer_player_id',substring(coalesce(v_player.sports_gamer_player_url,'') from '/players/([0-9]+)'),
    'latest_team',v_player.latest_team,'discord_username',v_link.discord_username,
    'is_active',v_has_active,'fa_date',v_request_fa_date
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.seh_discord_submit_free_agent_request_v2(text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.seh_discord_submit_free_agent_request_v2(text,text,text,text,text)
to service_role;

notify pgrst,'reload schema';
