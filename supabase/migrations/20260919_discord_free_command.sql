-- Discord !free command
-- Polls one configured Discord channel once per minute.
-- Channel stays disabled until ehockey_discord_free_command_config is configured.

create table if not exists public.ehockey_discord_free_command_config (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  channel_id text,
  last_message_id text,
  last_polled_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  poll_secret text
);

insert into public.ehockey_discord_free_command_config (id,enabled)
values (1,false)
on conflict (id) do nothing;

revoke all on public.ehockey_discord_free_command_config from anon, authenticated;
grant select, update on public.ehockey_discord_free_command_config to service_role;

create or replace function public.seh_discord_free_player_card_v1(p_discord_user_id text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $function$
  with linked as (
    select
      l.approved_player_key as player_key,
      l.discord_user_id,
      l.discord_username
    from public.ehockey_discord_player_links l
    where l.discord_user_id = nullif(trim(p_discord_user_id),'')
      and l.status = 'approved'
      and l.approved_player_key is not null
    order by l.reviewed_at desc nulls last,l.updated_at desc
    limit 1
  ),
  player as (
    select
      d.player_key,
      d.display_gamertag,
      d.primary_position,
      d.player_image,
      d.sports_gamer_player_url,
      e.team_name as latest_ecl_team,
      e.division as latest_ecl_division,
      r.team_name as current_team,
      r.division as current_division
    from linked l
    join public.app_player_directory_cache d
      on d.player_key=l.player_key
    left join lateral (
      select
        coalesce(nullif(h.team_name_in_tournament,''),nullif(h.team_current_name,'')) as team_name,
        nullif(h.division,'') as division
      from public.ehockey_player_history_cache_v25 h
      where h.player_key=d.player_key
        and upper(coalesce(h.competition_code,''))='ECL'
        and coalesce(h.appearance_games,0)>0
      order by h.chronology_date desc nulls last,
               h.display_end_date desc nulls last,
               h.end_date desc nulls last,
               h.league_id desc nulls last
      limit 1
    ) e on true
    left join lateral (
      select
        nullif(v.team_name,'') as team_name,
        nullif(v.division,'') as division
      from public.v_ecl27_current_roster_v1 v
      where v.player_key=d.player_key
      order by v.last_event_at desc nulls last,v.team_project_id desc
      limit 1
    ) r on true
  )
  select case
    when not exists(select 1 from linked) then
      jsonb_build_object(
        'linked',false,
        'discord_user_id',nullif(trim(p_discord_user_id),'')
      )
    else
      jsonb_build_object(
        'linked',true,
        'player_key',p.player_key,
        'display_gamertag',p.display_gamertag,
        'primary_position',p.primary_position,
        'team_name',coalesce(p.current_team,p.latest_ecl_team,'Free Agent'),
        'division',coalesce(p.current_division,p.latest_ecl_division),
        'latest_ecl_team',p.latest_ecl_team,
        'latest_ecl_division',p.latest_ecl_division,
        'player_image',p.player_image,
        'sports_gamer_player_url',p.sports_gamer_player_url
      )
  end
  from linked l
  left join player p on true
  union all
  select jsonb_build_object(
    'linked',false,
    'discord_user_id',nullif(trim(p_discord_user_id),'')
  )
  where not exists(select 1 from linked)
  limit 1;
$function$;

revoke all on function public.seh_discord_free_player_card_v1(text) from public,anon,authenticated;
grant execute on function public.seh_discord_free_player_card_v1(text) to service_role;

do $$
declare
  v_secret text;
  v_id uuid;
begin
  select poll_secret into v_secret
  from public.ehockey_discord_free_command_config
  where id=1;

  if coalesce(v_secret,'')='' then
    v_secret := encode(gen_random_bytes(32),'hex');
    update public.ehockey_discord_free_command_config
    set poll_secret=v_secret,updated_at=now()
    where id=1;
  end if;

  select id into v_id
  from vault.secrets
  where name='seh_discord_free_poll_secret'
  limit 1;

  if v_id is null then
    perform vault.create_secret(
      v_secret,
      'seh_discord_free_poll_secret',
      'Internal secret for Discord !free polling',
      null
    );
  else
    perform vault.update_secret(
      v_id,
      v_secret,
      'seh_discord_free_poll_secret',
      'Internal secret for Discord !free polling',
      null
    );
  end if;
end $$;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='seh-discord-free-poll'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'seh-discord-free-poll',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/seh-discord-free',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-seh-internal-key',
          (select decrypted_secret
           from vault.decrypted_secrets
           where name='seh_discord_free_poll_secret'
           limit 1)
      ),
      body := jsonb_build_object('action','poll'),
      timeout_milliseconds := 15000
    );
  $cron$
);

notify pgrst,'reload schema';
