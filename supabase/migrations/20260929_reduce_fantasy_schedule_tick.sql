-- Reduce idle pg_cron traffic for the Fantasy schedule tick.
-- The function checks a two-minute execution window, so a two-minute cadence
-- still catches every configured schedule slot while halving idle cron logs.

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'scl-fantasy-sportsgamer-schedule-tick'
  limit 1;

  if v_job_id is not null then
    perform cron.alter_job(
      job_id := v_job_id,
      schedule := '*/2 * * * *'
    );
  end if;
end
$$;
