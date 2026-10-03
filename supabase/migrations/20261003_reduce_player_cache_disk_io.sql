-- Reduce unnecessary Disk IO from player cache refreshes.
--
-- The source data is updated manually, so the directory and ranking caches
-- should not be rebuilt every 30 minutes around the clock.
--
-- Manual data-update flow:
--   select public.refresh_app_player_caches_after_manual_update();
--
-- Personal merits still refresh every 6 hours. Ranking is refreshed
-- immediately afterwards because personal merits affect ranking points.

create or replace function public.refresh_app_player_caches_after_manual_update()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  started_at timestamptz := clock_timestamp();
begin
  perform public.refresh_app_player_directory_cache();
  perform public.refresh_app_player_ranking_cache();

  return jsonb_build_object(
    'directory_cache', 'refreshed',
    'ranking_cache', 'refreshed',
    'elapsed_seconds',
      round(extract(epoch from (clock_timestamp() - started_at))::numeric, 2)
  );
end;
$function$;

create or replace function public.refresh_ehockey_personal_merits_and_ranking_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  merits_result jsonb;
  started_at timestamptz := clock_timestamp();
begin
  merits_result := public.refresh_ehockey_personal_merits_pipeline_v1();
  perform public.refresh_app_player_ranking_cache();

  return jsonb_build_object(
    'personal_merits', merits_result,
    'ranking_cache', 'refreshed',
    'elapsed_seconds',
      round(extract(epoch from (clock_timestamp() - started_at))::numeric, 2)
  );
end;
$function$;

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname = 'refresh-app-player-ranking-cache'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(job_id := v_jobid, active := false);
  end if;

  select jobid into v_jobid
  from cron.job
  where jobname = 'refresh-app-player-directory-cache'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(job_id := v_jobid, active := false);
  end if;

  select jobid into v_jobid
  from cron.job
  where jobname = 'refresh-ehockey-personal-merits-6h'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(
      job_id := v_jobid,
      command := 'select public.refresh_ehockey_personal_merits_and_ranking_v1();'
    );
  end if;
end;
$$;
