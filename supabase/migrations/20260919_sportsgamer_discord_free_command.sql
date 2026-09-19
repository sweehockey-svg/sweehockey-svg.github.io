-- SportsGamer Discord !free command
-- Uses Discord as the actual "available tonight" list. Supabase only stores bot config/cursor.

create table if not exists public.sportsgamer_discord_free_command_config (
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

insert into public.sportsgamer_discord_free_command_config
  (id,enabled,channel_id,activated_at,updated_at)
values
  (1,true,'1550899341940490350',now(),now())
on conflict (id) do update
set enabled=true,
    channel_id=excluded.channel_id,
    activated_at=now(),
    last_message_id=null,
    last_error=null,
    updated_at=now();

revoke all on public.sportsgamer_discord_free_command_config from anon, authenticated;
grant select, update on public.sportsgamer_discord_free_command_config to service_role;

do $$
declare
  v_secret text;
  v_id uuid;
begin
  select poll_secret into v_secret
  from public.sportsgamer_discord_free_command_config
  where id=1;

  if coalesce(v_secret,'')='' then
    v_secret := encode(gen_random_bytes(32),'hex');
    update public.sportsgamer_discord_free_command_config
    set poll_secret=v_secret,updated_at=now()
    where id=1;
  end if;

  select id into v_id
  from vault.secrets
  where name='sportsgamer_discord_free_poll_secret'
  limit 1;

  if v_id is null then
    perform vault.create_secret(
      v_secret,
      'sportsgamer_discord_free_poll_secret',
      'Internal secret for SportsGamer Discord !free polling',
      null
    );
  else
    perform vault.update_secret(
      v_id,
      v_secret,
      'sportsgamer_discord_free_poll_secret',
      'Internal secret for SportsGamer Discord !free polling',
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
  where jobname='sportsgamer-discord-free-poll'
  limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'sportsgamer-discord-free-poll',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/sportsgamer-discord-free',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-sg-internal-key',
          (select decrypted_secret
           from vault.decrypted_secrets
           where name='sportsgamer_discord_free_poll_secret'
           limit 1)
      ),
      body := jsonb_build_object('action','watch'),
      timeout_milliseconds := 58000
    );
  $cron$
);

notify pgrst,'reload schema';
