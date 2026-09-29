-- Reduce idle cron/log traffic from Discord command pollers.
-- Commands may take up to roughly two minutes to be processed, but no messages
-- are lost because each poll advances from the stored Discord snowflake cursor.

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname in (
      'seh-discord-free-poll',
      'seh-discord-fa-poll',
      'sportsgamer-discord-free-poll'
    )
  loop
    perform cron.alter_job(
      job_id := v_job_id,
      schedule := '*/2 * * * *'
    );
  end loop;
end
$$;
