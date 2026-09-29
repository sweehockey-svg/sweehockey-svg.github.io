-- Reduce idle Supabase traffic from the admin Discord notification flusher.
-- Notifications may now wait up to roughly five minutes instead of one minute.

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'seh-discord-admin-notifications'
  limit 1;

  if v_job_id is not null then
    perform cron.alter_job(
      job_id := v_job_id,
      schedule := '*/5 * * * *'
    );
  end if;
end
$$;
