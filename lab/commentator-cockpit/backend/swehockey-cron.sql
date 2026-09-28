-- Hockeyettan base sync
-- Norra (21043) runs through the original swehockey-base-sync job every 30 minutes.
-- Södra (21044) is staggered by five minutes to avoid simultaneous fetch bursts.

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
