-- Keep high-frequency bot runtime logs bounded on the Free plan.
-- These tables contain operational history only, not player/tournament data.

truncate table cron.job_run_details;
truncate table net._http_response;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='cleanup-cron-job-run-details'
  limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='cleanup-net-http-response'
  limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'cleanup-cron-job-run-details',
  '20 3 * * *',
  $cron$
    delete from cron.job_run_details
    where end_time < now() - interval '1 day';
  $cron$
);

select cron.schedule(
  'cleanup-net-http-response',
  '25 3 * * *',
  $cron$
    delete from net._http_response
    where created < now() - interval '1 day';
  $cron$
);
