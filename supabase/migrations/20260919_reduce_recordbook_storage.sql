-- Reduce permanent database usage from recordbook source history.
-- Recordbook imports now load compact temporary staging tables and refresh
-- the small public caches directly; raw match/goal history is not persisted.

do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='seh_refresh_recordbook_ecl_match_players_cache_v1'
    and p.pronargs=0
  limit 1;

  if v_def is null then
    raise exception 'seh_refresh_recordbook_ecl_match_players_cache_v1 not found';
  end if;

  v_def := replace(v_def,'public.sportsgamer_recordbook_goals_v1','pg_temp.ecl_recordbook_goals_stage');
  v_def := replace(v_def,'public.sportsgamer_recordbook_matches_v1','pg_temp.ecl_recordbook_matches_stage');
  execute v_def;
end $$;

do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='seh_refresh_recordbook_scl_match_players_cache_v1'
    and p.pronargs=0
  limit 1;

  if v_def is null then
    raise exception 'seh_refresh_recordbook_scl_match_players_cache_v1 not found';
  end if;

  v_def := replace(v_def,'public.sportsgamer_recordbook_goals_v1','pg_temp.scl_recordbook_goals_stage');
  v_def := replace(v_def,'public.sportsgamer_recordbook_matches_v1','pg_temp.scl_recordbook_matches_stage');
  execute v_def;
end $$;

-- v25 contains the same first 81 history columns as the physical v21 table,
-- plus newer chronology/cache fields. Point compatibility views to v25.
do $$
declare
  r record;
  v_sql text;
begin
  for r in
    select viewname,definition
    from pg_views
    where schemaname='public'
      and viewname in (
        'v_ehockey_player_tournaments_chronological',
        'v_ehockey_player_tournaments_web_v14'
      )
    order by viewname
  loop
    v_sql := replace(
      r.definition,
      'v_ehockey_player_tournaments_merged_v21_1',
      'ehockey_player_history_cache_v25'
    );
    execute format('create or replace view public.%I as %s',r.viewname,v_sql);
  end loop;
end $$;

drop table if exists public.sportsgamer_recordbook_goals_v1;
drop table if exists public.sportsgamer_recordbook_matches_v1;
drop table if exists public.v_ehockey_player_tournaments_merged_v21_1;

-- pg_cron does not prune run history automatically. Keep a bounded history.
truncate table cron.job_run_details;

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

select cron.schedule(
  'cleanup-cron-job-run-details',
  '15 3 * * *',
  $cron$
    delete from cron.job_run_details
    where end_time < now() - interval '7 days';
  $cron$
);

notify pgrst,'reload schema';
