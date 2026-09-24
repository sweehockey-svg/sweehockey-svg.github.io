begin;

alter table public.ehockey_fantasy_transfer_events
  add column if not exists forced_replacement_count integer not null default 0;

alter table public.ehockey_fantasy_transfer_events
  drop constraint if exists ehockey_fantasy_transfer_events_forced_replacement_count_check;

alter table public.ehockey_fantasy_transfer_events
  add constraint ehockey_fantasy_transfer_events_forced_replacement_count_check
  check (forced_replacement_count >= 0);

/*
  Keep the established save routine intact, but make replacements for players
  removed from the live SportsGamer roster free. The assertions make the
  migration fail loudly if the deployed routine has diverged.
*/
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='seh_fantasy_save_my_team'
    and pg_get_function_identity_arguments(p.oid)=
      'p_competition_code text, p_team_name text, p_picks jsonb';

  if v_definition is null then
    raise exception 'seh_fantasy_save_my_team was not found';
  end if;

  v_old := E'  v_transfer_count integer := 0;\n  v_free_available integer := 0;';
  v_new := E'  v_transfer_count integer := 0;\n  v_forced_replacement_count integer := 0;\n  v_chargeable_transfer_count integer := 0;\n  v_free_available integer := 0;';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team declaration anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'  if v_existing_entry_id is not null and v_transfer_count > 0 then\n    if not v_comp.transfers_enabled and v_past_rounds > 0 then';
  v_new := E'  if v_existing_entry_id is not null and v_transfer_count > 0 then\n    select least(v_transfer_count,count(*))::integer\n    into v_forced_replacement_count\n    from public.ehockey_fantasy_entry_players oldp\n    join public.ehockey_fantasy_player_pool old_pool\n      on old_pool.id=oldp.pool_player_id\n     and old_pool.competition_id=v_comp.id\n    where oldp.entry_id=v_existing_entry_id\n      and old_pool.is_available is not true\n      and not exists (\n        select 1\n        from pg_temp.seh_fantasy_pick_validation pick\n        where pick.pool_player_id=oldp.pool_player_id\n      );\n\n    v_forced_replacement_count := coalesce(v_forced_replacement_count,0);\n    v_chargeable_transfer_count := greatest(0,v_transfer_count-v_forced_replacement_count);\n\n    if not v_comp.transfers_enabled and v_past_rounds > 0 and v_chargeable_transfer_count > 0 then';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team transfer anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'    if v_unlimited then\n      v_free_used := v_transfer_count;\n      v_paid_count := 0;';
  v_new := E'    if v_unlimited then\n      v_free_used := v_chargeable_transfer_count;\n      v_paid_count := 0;';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team unlimited anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'      v_free_used := least(v_transfer_count,v_free_available);\n      v_paid_count := greatest(0,v_transfer_count-v_free_used);';
  v_new := E'      v_free_used := least(v_chargeable_transfer_count,v_free_available);\n      v_paid_count := greatest(0,v_chargeable_transfer_count-v_free_used);';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team paid transfer anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'      transfer_count,\n      free_used,';
  v_new := E'      transfer_count,\n      forced_replacement_count,\n      free_used,';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team event column anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'      v_transfer_count,\n      v_free_used,';
  v_new := E'      v_transfer_count,\n      v_forced_replacement_count,\n      v_free_used,';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team event value anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'      ''count'',v_transfer_count,\n      ''unlimited'',v_unlimited,';
  v_new := E'      ''count'',v_transfer_count,\n      ''forced_replacement_count'',v_forced_replacement_count,\n      ''unlimited'',v_unlimited,';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_save_my_team response anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  execute v_definition;
end
$migration$;

/*
  A removed player may remain in the editable roster so the owner can see and
  replace the pick. At a deadline, however, only complete rosters whose players
  are still available are snapshotted. This prevents an invalid roster from
  being silently accepted as a valid locked team.
*/
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='seh_fantasy_process_round_locks'
    and pg_get_function_identity_arguments(p.oid)='';

  if v_definition is null then
    raise exception 'seh_fantasy_process_round_locks was not found';
  end if;

  v_old := E'  v_inserted integer := 0;\nbegin';
  v_new := E'  v_inserted integer := 0;\n  v_blocked integer := 0;\n  v_blocked_round integer := 0;\nbegin';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_process_round_locks declaration anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'    insert into public.ehockey_fantasy_entry_round_players (\n      entry_id, round_id, pool_player_id, slot, is_captain, locked_price\n    )';
  v_new := E'    select count(*)::integer\n    into v_blocked_round\n    from public.ehockey_fantasy_entries blocked_entry\n    where blocked_entry.competition_id=v_round.competition_id\n      and exists (\n        select 1\n        from public.ehockey_fantasy_entry_players blocked_pick\n        join public.ehockey_fantasy_player_pool blocked_pool\n          on blocked_pool.id=blocked_pick.pool_player_id\n         and blocked_pool.competition_id=v_round.competition_id\n        where blocked_pick.entry_id=blocked_entry.id\n          and blocked_pool.is_available is not true\n      );\n\n    v_blocked := v_blocked + coalesce(v_blocked_round,0);\n\n    insert into public.ehockey_fantasy_entry_round_players (\n      entry_id, round_id, pool_player_id, slot, is_captain, locked_price\n    )';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_process_round_locks insert anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'    where e.competition_id=v_round.competition_id\n    on conflict (entry_id, round_id, slot) do nothing;';
  v_new := E'    where e.competition_id=v_round.competition_id\n      and not exists (\n        select 1\n        from public.ehockey_fantasy_entry_players blocked_pick\n        join public.ehockey_fantasy_player_pool blocked_pool\n          on blocked_pool.id=blocked_pick.pool_player_id\n         and blocked_pool.competition_id=v_round.competition_id\n        where blocked_pick.entry_id=e.id\n          and blocked_pool.is_available is not true\n      )\n    on conflict (entry_id, round_id, slot) do nothing;';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_process_round_locks filter anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  v_old := E'    ''snapshot_rows'', v_snapshots,\n    ''processed_at'', now()';
  v_new := E'    ''snapshot_rows'', v_snapshots,\n    ''entries_blocked_unavailable_players'', v_blocked,\n    ''processed_at'', now()';
  if strpos(v_definition,v_old)=0 then
    raise exception 'seh_fantasy_process_round_locks response anchor was not found';
  end if;
  v_definition := replace(v_definition,v_old,v_new);

  execute v_definition;
end
$migration$;

commit;
