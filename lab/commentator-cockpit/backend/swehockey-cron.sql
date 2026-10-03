-- Hockeyettan sync jobs
-- Base data:
--   Norra (21043) runs through swehockey-base-sync every 30 minutes.
--   Södra (21044) is staggered by five minutes to avoid simultaneous fetch bursts.
-- Game detail/live data:
--   swehockey-game-sync runs every minute.
--   The Edge Function resolves its target teams from active commentator_access rows,
--   then derives Norra/Södra from each team's active roster membership.
--   Global admins do not cause all 39 teams to be polled.

select cron.schedule(
  'swehockey-base-sync-south',
  '5,35 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object(
      'reason','scheduled-base-sync-south',
      'competition_id','21044',
      'at',now()
    ),
    timeout_milliseconds := 30000
  );
  $$
);


-- HockeyTvåan 2026/27 base sync jobs.
-- Staggered by one minute so the nine regional series do not hit Swehockey at once.
-- Väst A/B/C: 21088/21089/21090
-- Syd A/B: 21213/21214
-- Östra: 21505
-- Norr A/B/C: 21319/21320/21321

select cron.schedule(
  'swehockey-base-sync-h2-west-a',
  '1,31 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-west-a','competition_id','21088','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-west-b',
  '2,32 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-west-b','competition_id','21089','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-west-c',
  '3,33 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-west-c','competition_id','21090','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-south-a',
  '4,34 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-south-a','competition_id','21213','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-south-b',
  '6,36 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-south-b','competition_id','21214','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-east',
  '7,37 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-east','competition_id','21505','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-north-a',
  '8,38 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-north-a','competition_id','21319','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-north-b',
  '9,39 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-north-b','competition_id','21320','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'swehockey-base-sync-h2-north-c',
  '10,40 * * * *',
  $$
  select net.http_post(
    url := 'https://pqaymcvlwsruxvekvvtl.supabase.co/functions/v1/swehockey-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='swehockey_sync_token' limit 1)
    ),
    body := jsonb_build_object('reason','scheduled-base-sync-h2-north-c','competition_id','21321','at',now()),
    timeout_milliseconds := 30000
  );
  $$
);
