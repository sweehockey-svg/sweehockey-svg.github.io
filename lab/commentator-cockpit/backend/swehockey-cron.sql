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
