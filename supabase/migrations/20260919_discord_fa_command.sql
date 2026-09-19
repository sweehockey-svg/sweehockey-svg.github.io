-- Discord !fa command: submit/update/remove Free Agent requests from Discord.

create table if not exists public.ehockey_discord_fa_command_config (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  channel_id text,
  last_message_id text,
  last_polled_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  poll_secret text
);

insert into public.ehockey_discord_fa_command_config (id,enabled)
values (1,false)
on conflict (id) do nothing;

revoke all on public.ehockey_discord_fa_command_config from anon, authenticated;
grant select, update on public.ehockey_discord_fa_command_config to service_role;

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
    select 1
    from public.ehockey_free_agents f
    where f.player_key = v_link.approved_player_key
      and f.is_active = true
      and (f.expires_at is null or f.expires_at > now())
  ) into v_has_active;

  if v_type = 'remove' then
    if not v_has_active then
      return jsonb_build_object(
        'linked',true,'ok',false,'error_code','not_active',
        'player_key',v_player.player_key,'display_gamertag',v_player.display_gamertag
      );
    end if;
  else
    v_type := case when v_has_active then 'update' else 'create' end;
  end if;

  v_positions := nullif(trim(coalesce(p_positions_text,'')),'');
  if v_positions is null then
    v_positions := nullif(trim(coalesce(v_player.primary_position,'')),'');
  end if;

  v_levels := nullif(trim(coalesce(p_levels_text,'')),'');
  if v_type <> 'remove' and v_levels is null then
    v_levels := 'Öppen för förslag';
  end if;

  select r.id into v_pending_id
  from public.ehockey_free_agent_requests r
  where r.user_id = v_link.user_id
    and r.status = 'pending'
  order by r.submitted_at desc
  limit 1;

  if v_pending_id is null then
    insert into public.ehockey_free_agent_requests (
      user_id,player_key,discord_username,request_type,status,
      positions_text,levels_text,availability,message,contact,fa_date
    ) values (
      v_link.user_id,v_link.approved_player_key,v_link.discord_username,v_type,'pending',
      case when v_type='remove' then null else v_positions end,
      case when v_type='remove' then null else v_levels end,
      null,null,
      case when nullif(trim(coalesce(v_link.discord_username,'')),'') is not null
        then 'Discord: @' || trim(v_link.discord_username) else null end,
      current_date
    )
    returning id into v_pending_id;
  else
    update public.ehockey_free_agent_requests
    set player_key=v_link.approved_player_key,
        discord_username=v_link.discord_username,
        request_type=v_type,
        positions_text=case when v_type='remove' then null else v_positions end,
        levels_text=case when v_type='remove' then null else v_levels end,
        availability=null,message=null,
        contact=case when nullif(trim(coalesce(v_link.discord_username,'')),'') is not null
          then 'Discord: @' || trim(v_link.discord_username) else null end,
        fa_date=current_date,submitted_at=now(),
        reviewed_at=null,reviewed_by=null,admin_note=null,updated_at=now()
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
    'is_active',v_has_active
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.seh_discord_submit_free_agent_request_v1(text,text,text,text)
from public,anon,authenticated;
grant execute on function public.seh_discord_submit_free_agent_request_v1(text,text,text,text)
to service_role;

do $$
declare
  v_secret text;
  v_id uuid;
begin
  select poll_secret into v_secret
  from public.ehockey_discord_fa_command_config
  where id=1;

  if coalesce(v_secret,'')='' then
    v_secret := encode(gen_random_bytes(32),'hex');
    update public.ehockey_discord_fa_command_config
    set poll_secret=v_secret,updated_at=now()
    where id=1;
  end if;

  select id into v_id from vault.secrets
  where name='seh_discord_fa_poll_secret'
  limit 1;

  if v_id is null then
    perform vault.create_secret(v_secret,'seh_discord_fa_poll_secret','Internal secret for Discord !fa polling',null);
  else
    perform vault.update_secret(v_id,v_secret,'seh_discord_fa_poll_secret','Internal secret for Discord !fa polling',null);
  end if;
end $$;

update public.ehockey_discord_fa_command_config
set enabled=true,
    channel_id='1550862521433464953',
    last_message_id=null,
    last_polled_at=null,
    last_error=null,
    activated_at=now(),
    updated_at=now()
where id=1;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='seh-discord-fa-poll' limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'seh-discord-fa-poll',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/seh-discord-fa',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-seh-internal-key',
          (select decrypted_secret from vault.decrypted_secrets
           where name='seh_discord_fa_poll_secret' limit 1)
      ),
      body := jsonb_build_object('action','watch'),
      timeout_milliseconds := 58000
    );
  $cron$
);

notify pgrst,'reload schema';
