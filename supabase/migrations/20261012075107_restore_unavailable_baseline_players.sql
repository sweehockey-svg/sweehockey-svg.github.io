-- Previously owned players can be retained/restored in their original slots before deadline.
-- New unavailable selections still fail validation; auth, deadline and roster rules remain enforced.
CREATE OR REPLACE FUNCTION public.seh_fantasy_save_my_team(p_competition_code text, p_team_name text, p_picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_user uuid := auth.uid();
  v_comp public.ehockey_fantasy_competitions%rowtype;
  v_target_round public.ehockey_fantasy_rounds%rowtype;
  v_entry_id bigint;
  v_existing_entry_id bigint;
  v_owner_gamertag text;
  v_team_name text;
  v_pick_count integer;
  v_slot_count integer;
  v_distinct_slots integer;
  v_distinct_players integer;
  v_captain_count integer;
  v_total_cost numeric(12,2);
  v_total_points numeric(12,2);
  v_invalid_count integer;
  v_team_limit_violation boolean;
  v_rules jsonb;
  v_preseason_unlimited boolean := true;
  v_max_bank integer := 2;
  v_extra_cost numeric := 10;
  v_total_rounds integer := 0;
  v_past_rounds integer := 0;
  v_unlimited boolean := false;
  v_transfer_count integer := 0;
  v_forced_replacement_count integer := 0;
  v_chargeable_transfer_count integer := 0;
  v_free_available integer := 0;
  v_free_used integer := 0;
  v_paid_count integer := 0;
  v_penalty numeric(12,2) := 0;
  v_before_roster jsonb := '[]'::jsonb;
  v_after_roster jsonb := '[]'::jsonb;
  v_sim_active boolean := false;
  v_refund integer := 0;
  v_baseline jsonb;
begin
  if v_user is null then
    raise exception 'Du måste logga in med Discord först.';
  end if;

  if not public.seh_fantasy_has_access(v_user) then
    raise exception 'Du saknar behörighet att skapa ett Fantasy-lag.';
  end if;

  select d.display_gamertag
    into v_owner_gamertag
  from public.ehockey_discord_player_links l
  join public.app_account_player_directory_cache d
    on d.player_key = l.approved_player_key
  where l.user_id = v_user
    and l.status = 'approved'
  order by l.updated_at desc nulls last
  limit 1;

  if nullif(trim(coalesce(v_owner_gamertag,'')), '') is null then
    select x.display_name
      into v_owner_gamertag
    from public.ehockey_fantasy_access_exceptions x
    where x.user_id = v_user
      and x.active is true
    limit 1;
  end if;

  if nullif(trim(coalesce(v_owner_gamertag,'')), '') is null then
    raise exception 'Fantasy-kontot saknar ett giltigt visningsnamn.';
  end if;

  v_team_name := left(trim(v_owner_gamertag) || ' Fantasy', 40);

  select *
    into v_comp
  from public.ehockey_fantasy_competitions
  where upper(code) = upper(trim(coalesce(p_competition_code, '')))
  limit 1;

  if v_comp.id is null then
    raise exception 'Fantasy-tävlingen finns inte.';
  end if;

  if v_comp.status <> 'open' then
    raise exception 'Fantasy-lagbygget är inte öppet ännu.';
  end if;

  -- Serialize saves with each other before choosing the deadline and baseline.
  perform 1 from public.ehockey_fantasy_competitions where id=v_comp.id for update;
  perform public.seh_fantasy_process_round_locks();

  v_rules := coalesce(v_comp.settings->'transfer_rules','{}'::jsonb);
  v_preseason_unlimited := coalesce((v_rules->>'preseason_unlimited')::boolean,true);
  v_max_bank := greatest(0,coalesce(nullif(v_rules->>'max_bank','')::integer,2));
  v_extra_cost := greatest(0,coalesce(nullif(v_rules->>'extra_transfer_cost','')::numeric,10));
  v_sim_active := coalesce((v_comp.settings->'scl_simulation'->>'active')::boolean,false);

  select count(*) into v_total_rounds
  from public.ehockey_fantasy_rounds
  where competition_id=v_comp.id and is_active;

  select count(*) into v_past_rounds
  from public.ehockey_fantasy_rounds
  where competition_id=v_comp.id and is_active
    and (lock_at <= now() or (v_sim_active and locked_at is not null));

  select * into v_target_round
  from public.ehockey_fantasy_rounds
  where competition_id=v_comp.id
    and is_active
    and (
      (v_sim_active and locked_at is null)
      or
      (not v_sim_active and lock_at > now())
    )
  order by
    case when v_sim_active then round_no end,
    lock_at,
    round_no
  limit 1
  for update;

  select id into v_existing_entry_id
  from public.ehockey_fantasy_entries
  where competition_id=v_comp.id and user_id=v_user
  limit 1
  for update;

  if v_existing_entry_id is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'pool_player_id',ep.pool_player_id,
          'slot',ep.slot,
          'is_captain',ep.is_captain,
          'locked_price',ep.locked_price
        )
        order by ep.slot
      ),
      '[]'::jsonb
    )
    into v_before_roster
    from public.ehockey_fantasy_entry_players ep
    where ep.entry_id=v_existing_entry_id;
  end if;


  -- Only open target rounds are editable; historical events and snapshots stay intact.
  if v_existing_entry_id is not null and v_target_round.id is not null then
    if not v_sim_active and v_target_round.lock_at <= clock_timestamp() then
      raise exception 'Deadline har passerat. Uppdatera sidan innan du sparar.';
    end if;
    select jsonb_agg(jsonb_build_object('pool_player_id',rp.pool_player_id,
      'slot',rp.slot,'is_captain',rp.is_captain,'locked_price',rp.locked_price) order by rp.slot)
    into v_baseline
    from public.ehockey_fantasy_entry_round_players rp
    where rp.entry_id=v_existing_entry_id and rp.round_id=(
      select r.id from public.ehockey_fantasy_rounds r
      join public.ehockey_fantasy_entry_round_players p on p.round_id=r.id and p.entry_id=v_existing_entry_id
      where r.competition_id=v_comp.id and r.locked_at is not null
        and r.lock_at<=now() and r.id<>v_target_round.id
      order by r.lock_at desc,r.round_no desc limit 1);
    if v_baseline is null then
      select t.before_roster into v_baseline from public.ehockey_fantasy_transfer_events t
      where t.entry_id=v_existing_entry_id and t.target_round_id=v_target_round.id
      order by t.created_at,t.id limit 1;
    end if;
    v_before_roster := coalesce(v_baseline,v_before_roster);
    if not coalesce(v_target_round.unlimited_transfers,false)
      and not coalesce(v_target_round.reset_free_transfers,false)
      and not (v_past_rounds=0 and v_preseason_unlimited) then
      select coalesce(sum(t.free_used),0)::integer into v_refund
      from public.ehockey_fantasy_transfer_events t
      where t.entry_id=v_existing_entry_id and t.target_round_id=v_target_round.id;
      update public.ehockey_fantasy_entry_transfer_state
      set free_transfers=least(v_max_bank,free_transfers+v_refund),updated_at=now()
      where entry_id=v_existing_entry_id;
    end if;
    -- Keep an audit trail, but superseded drafts must contribute no cost.
    update public.ehockey_fantasy_transfer_events
    set superseded_charge=coalesce(superseded_charge,jsonb_build_object(
        'transfer_count',transfer_count,'free_used',free_used,'paid_count',paid_count,
        'penalty_points',penalty_points,'forced_replacement_count',forced_replacement_count)),
      superseded_at=coalesce(superseded_at,now()),
      transfer_count=0,free_used=0,paid_count=0,penalty_points=0,forced_replacement_count=0
    where entry_id=v_existing_entry_id and target_round_id=v_target_round.id and superseded_at is null;
  end if;

  if jsonb_typeof(p_picks) <> 'array' then
    raise exception 'Laguppställningen har fel format.';
  end if;

  create temporary table if not exists pg_temp.seh_fantasy_pick_validation (
    pool_player_id bigint,
    slot text,
    is_captain boolean
  ) on commit drop;

  truncate pg_temp.seh_fantasy_pick_validation;

  insert into pg_temp.seh_fantasy_pick_validation (pool_player_id, slot, is_captain)
  select
    nullif(item->>'pool_player_id', '')::bigint,
    upper(trim(coalesce(item->>'slot', ''))),
    coalesce((item->>'is_captain')::boolean, false)
  from jsonb_array_elements(p_picks) item;

  select count(*) into v_pick_count
  from pg_temp.seh_fantasy_pick_validation;

  v_slot_count := coalesce(array_length(v_comp.roster_slots, 1), 0);

  if v_pick_count <> v_slot_count then
    raise exception 'Du måste välja exakt % spelare.', v_slot_count;
  end if;

  select
    count(distinct slot),
    count(distinct pool_player_id),
    count(*) filter (where is_captain)
  into
    v_distinct_slots,
    v_distinct_players,
    v_captain_count
  from pg_temp.seh_fantasy_pick_validation;

  if v_distinct_slots <> v_slot_count then
    raise exception 'Varje position får bara användas en gång.';
  end if;

  if v_distinct_players <> v_pick_count then
    raise exception 'Samma spelare kan bara väljas en gång.';
  end if;

  if exists (
    select 1
    from pg_temp.seh_fantasy_pick_validation p
    where not (p.slot = any(v_comp.roster_slots))
  ) then
    raise exception 'Laguppställningen innehåller en ogiltig position.';
  end if;

  if v_comp.captain_enabled and v_captain_count <> 1 then
    raise exception 'Du måste välja exakt en kapten.';
  elsif not v_comp.captain_enabled and v_captain_count <> 0 then
    raise exception 'Kapten används inte i den här Fantasy-tävlingen.';
  end if;

  select count(*)
    into v_invalid_count
  from pg_temp.seh_fantasy_pick_validation pick
  left join public.ehockey_fantasy_player_pool pool
    on pool.id = pick.pool_player_id
   and pool.competition_id = v_comp.id
  where pool.id is null
     or (pool.is_available is not true and not (
       v_existing_entry_id is not null and v_target_round.id is not null
       and exists (
         select 1 from jsonb_to_recordset(coalesce(v_baseline,'[]'::jsonb))
           as baseline(pool_player_id bigint,slot text)
         where baseline.pool_player_id=pick.pool_player_id and baseline.slot=pick.slot
       )
     ))
     or not public.seh_fantasy_country_allowed(v_comp.id,pool.country_code)
     or not (
       pick.slot = any(coalesce(pool.eligible_slots, '{}'::text[]))
       or (
         coalesce(array_length(pool.eligible_slots, 1), 0) = 0
         and upper(coalesce(pool.primary_position, '')) = pick.slot
       )
     );

  if v_invalid_count > 0 then
    raise exception 'Minst en vald spelare är inte tillgänglig på den valda positionen.';
  end if;

  select coalesce(sum(pool.price), 0)
    into v_total_cost
  from pg_temp.seh_fantasy_pick_validation pick
  join public.ehockey_fantasy_player_pool pool
    on pool.id = pick.pool_player_id
   and pool.competition_id = v_comp.id;

  if v_total_cost > v_comp.budget then
    raise exception 'Laget kostar % men budgeten är %.', v_total_cost, v_comp.budget;
  end if;

  select exists (
    select 1
    from pg_temp.seh_fantasy_pick_validation pick
    join public.ehockey_fantasy_player_pool pool
      on pool.id = pick.pool_player_id
     and pool.competition_id = v_comp.id
    where pool.real_team_id is not null
    group by pool.real_team_id
    having count(*) > v_comp.max_players_per_real_team
  )
  into v_team_limit_violation;

  if v_team_limit_violation then
    raise exception 'Du får välja högst % spelare från samma riktiga lag.', v_comp.max_players_per_real_team;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'pool_player_id',pick.pool_player_id,
        'slot',pick.slot,
        'is_captain',pick.is_captain,
        'locked_price',pool.price
      )
      order by pick.slot
    ),
    '[]'::jsonb
  )
  into v_after_roster
  from pg_temp.seh_fantasy_pick_validation pick
  join public.ehockey_fantasy_player_pool pool
    on pool.id=pick.pool_player_id
   and pool.competition_id=v_comp.id;

  if v_existing_entry_id is not null then
    select count(*)
    into v_transfer_count
    from pg_temp.seh_fantasy_pick_validation pick
    where not exists (
      select 1
      from jsonb_to_recordset(v_before_roster) as oldp(pool_player_id bigint)
      where true
        and oldp.pool_player_id=pick.pool_player_id
    );
  end if;

  if v_existing_entry_id is not null and v_transfer_count > 0 then
    select least(v_transfer_count,count(*))::integer
    into v_forced_replacement_count
    from jsonb_to_recordset(v_before_roster) as oldp(pool_player_id bigint)
    join public.ehockey_fantasy_player_pool old_pool
      on old_pool.id=oldp.pool_player_id
     and old_pool.competition_id=v_comp.id
    where old_pool.is_available is not true
      and not exists (
        select 1
        from pg_temp.seh_fantasy_pick_validation pick
        where pick.pool_player_id=oldp.pool_player_id
      );

    v_forced_replacement_count := coalesce(v_forced_replacement_count,0);
    v_chargeable_transfer_count := greatest(0,v_transfer_count-v_forced_replacement_count);

    if not v_comp.transfers_enabled and v_past_rounds > 0 and v_chargeable_transfer_count > 0 then
      raise exception 'Byten är inte aktiverade i den här Fantasy-tävlingen.';
    end if;

    if v_total_rounds > 0 and v_target_round.id is null then
      raise exception 'Det finns ingen kommande Fantasy-period att göra bytet till.';
    end if;

    v_unlimited :=
      (v_total_rounds = 0 and v_preseason_unlimited)
      or (v_past_rounds = 0 and v_preseason_unlimited)
      or coalesce(v_target_round.unlimited_transfers,false)
      or coalesce(v_target_round.reset_free_transfers,false);

    if v_unlimited then
      v_free_used := v_chargeable_transfer_count;
      v_paid_count := 0;
      v_penalty := 0;
    else
      insert into public.ehockey_fantasy_entry_transfer_state (
        entry_id,competition_id,free_transfers,updated_at
      )
      values (
        v_existing_entry_id,v_comp.id,0,now()
      )
      on conflict (entry_id) do nothing;

      select least(v_max_bank,coalesce(free_transfers,0))
      into v_free_available
      from public.ehockey_fantasy_entry_transfer_state
      where entry_id=v_existing_entry_id
      for update;

      v_free_available := coalesce(v_free_available,0);
      v_free_used := least(v_chargeable_transfer_count,v_free_available);
      v_paid_count := greatest(0,v_chargeable_transfer_count-v_free_used);
      v_penalty := v_paid_count * v_extra_cost;

      update public.ehockey_fantasy_entry_transfer_state
      set
        free_transfers=greatest(0,free_transfers-v_free_used),
        updated_at=now()
      where entry_id=v_existing_entry_id;
    end if;
  end if;

  insert into public.ehockey_fantasy_entries (
    competition_id,
    user_id,
    team_name,
    updated_at
  )
  values (
    v_comp.id,
    v_user,
    v_team_name,
    now()
  )
  on conflict (competition_id, user_id)
  do update set
    team_name = excluded.team_name,
    updated_at = now()
  returning id into v_entry_id;

  if v_target_round.id is not null and not v_sim_active and v_target_round.lock_at <= clock_timestamp() then
    raise exception 'Deadline har passerat. Uppdatera sidan innan du sparar.';
  end if;

  delete from public.ehockey_fantasy_entry_players
  where entry_id = v_entry_id;

  insert into public.ehockey_fantasy_entry_players (
    entry_id,
    pool_player_id,
    slot,
    is_captain,
    locked_price
  )
  select
    v_entry_id,
    pick.pool_player_id,
    pick.slot,
    pick.is_captain,
    pool.price
  from pg_temp.seh_fantasy_pick_validation pick
  join public.ehockey_fantasy_player_pool pool
    on pool.id = pick.pool_player_id
   and pool.competition_id = v_comp.id;

  if v_existing_entry_id is not null and v_transfer_count > 0 then
    insert into public.ehockey_fantasy_transfer_events (
      competition_id,
      entry_id,
      target_round_id,
      transfer_count,
      forced_replacement_count,
      free_used,
      paid_count,
      penalty_points,
      before_roster,
      after_roster
    )
    values (
      v_comp.id,
      v_entry_id,
      v_target_round.id,
      v_transfer_count,
      v_forced_replacement_count,
      v_free_used,
      v_paid_count,
      v_penalty,
      v_before_roster,
      v_after_roster
    );
  end if;

  if not exists (
    select 1
    from public.ehockey_fantasy_entry_round_players rp
    join public.ehockey_fantasy_rounds r on r.id=rp.round_id
    where r.competition_id=v_comp.id
  ) then
    select
      coalesce(sum(
        public.seh_fantasy_slot_points(v_comp.id, ep.pool_player_id, ep.slot) *
        case
          when ep.is_captain then coalesce(v_comp.captain_multiplier, 1)
          else 1
        end
      ), 0)
    into v_total_points
    from public.ehockey_fantasy_entry_players ep
    where ep.entry_id = v_entry_id;
  else
    select coalesce(sum(rs.total_points),0)
    into v_total_points
    from public.ehockey_fantasy_entry_round_scores rs
    where rs.entry_id=v_entry_id;
  end if;

  update public.ehockey_fantasy_entries
  set
    total_points = v_total_points,
    updated_at = now()
  where id = v_entry_id;

  with ranked as (
    select
      id,
      dense_rank() over (
        order by total_points desc, created_at asc, id asc
      ) as new_rank
    from public.ehockey_fantasy_entries
    where competition_id = v_comp.id
  )
  update public.ehockey_fantasy_entries e
  set current_rank = ranked.new_rank
  from ranked
  where e.id = ranked.id;

  return jsonb_build_object(
    'ok', true,
    'entry_id', v_entry_id,
    'competition_id', v_comp.id,
    'team_name', v_team_name,
    'total_cost', v_total_cost,
    'budget', v_comp.budget,
    'players', v_pick_count,
    'total_points', v_total_points,
    'transfer', jsonb_build_object(
      'count',v_transfer_count,
      'forced_replacement_count',v_forced_replacement_count,
      'unlimited',v_unlimited,
      'free_used',v_free_used,
      'paid_count',v_paid_count,
      'penalty_points',v_penalty,
      'target_round_id',v_target_round.id
    )
  );
end;
$function$;



