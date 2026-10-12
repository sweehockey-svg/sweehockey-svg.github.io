-- Superseded drafts retain their rosters and original charges for audit.
alter table public.ehockey_fantasy_transfer_events
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_charge jsonb;

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
     or pool.is_available is not true
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


CREATE OR REPLACE FUNCTION public.seh_fantasy_my_transfer_state(p_code text DEFAULT 'SCL27'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_user uuid := auth.uid();
  v_comp public.ehockey_fantasy_competitions%rowtype;
  v_entry public.ehockey_fantasy_entries%rowtype;
  v_target public.ehockey_fantasy_rounds%rowtype;
  v_rules jsonb;
  v_free integer := 0;
  v_free_per_round integer := 1;
  v_max_bank integer := 2;
  v_extra_cost numeric := 10;
  v_preseason_unlimited boolean := true;
  v_past_rounds integer := 0;
  v_total_rounds integer := 0;
  v_unlimited boolean := false;
  v_mode text := 'preseason';
  v_recent jsonb := '[]'::jsonb;
  v_sim_active boolean := false;
  v_baseline jsonb := '[]'::jsonb;
  v_pending boolean := false;
begin
  if v_user is null then
    raise exception 'Du måste logga in först.';
  end if;

  select * into v_comp
  from public.ehockey_fantasy_competitions
  where upper(code)=upper(trim(coalesce(p_code,'')))
  limit 1;

  if v_comp.id is null then
    raise exception 'Fantasy-tävlingen finns inte.';
  end if;

  perform public.seh_fantasy_process_round_locks();

  v_rules := coalesce(v_comp.settings->'transfer_rules','{}'::jsonb);
  v_free_per_round := greatest(0,coalesce(nullif(v_rules->>'free_per_round','')::integer,1));
  v_max_bank := greatest(0,coalesce(nullif(v_rules->>'max_bank','')::integer,2));
  v_extra_cost := greatest(0,coalesce(nullif(v_rules->>'extra_transfer_cost','')::numeric,10));
  v_preseason_unlimited := coalesce((v_rules->>'preseason_unlimited')::boolean,true);
  v_sim_active := coalesce((v_comp.settings->'scl_simulation'->>'active')::boolean,false);

  select * into v_entry
  from public.ehockey_fantasy_entries
  where competition_id=v_comp.id and user_id=v_user
  limit 1;

  if v_entry.id is not null then
    select coalesce(s.free_transfers,0)
    into v_free
    from public.ehockey_fantasy_entry_transfer_state s
    where s.entry_id=v_entry.id;

    v_free := coalesce(v_free,0);

    select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb)
    into v_recent
    from (
      select
        t.id,
        t.transfer_count,
        t.free_used,
        t.paid_count,
        t.penalty_points,
        t.created_at,
        r.round_no,
        r.name as round_name
      from public.ehockey_fantasy_transfer_events t
      left join public.ehockey_fantasy_rounds r on r.id=t.target_round_id
      where t.entry_id=v_entry.id and t.superseded_at is null
      order by t.created_at desc
      limit 8
    ) x;
  end if;

  select count(*) into v_total_rounds
  from public.ehockey_fantasy_rounds
  where competition_id=v_comp.id and is_active;

  select count(*) into v_past_rounds
  from public.ehockey_fantasy_rounds
  where competition_id=v_comp.id and is_active
    and (lock_at <= now() or (v_sim_active and locked_at is not null));

  select * into v_target
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
  limit 1;


  if v_entry.id is not null and v_target.id is not null then
    select jsonb_agg(jsonb_build_object('pool_player_id',rp.pool_player_id,
      'slot',rp.slot,'is_captain',rp.is_captain,'locked_price',rp.locked_price) order by rp.slot)
    into v_baseline from public.ehockey_fantasy_entry_round_players rp
    where rp.entry_id=v_entry.id and rp.round_id=(
      select r.id from public.ehockey_fantasy_rounds r
      join public.ehockey_fantasy_entry_round_players p on p.round_id=r.id and p.entry_id=v_entry.id
      where r.competition_id=v_comp.id and r.locked_at is not null
        and r.lock_at<=now() and r.id<>v_target.id
      order by r.lock_at desc,r.round_no desc limit 1);
    if v_baseline is null then
      select before_roster into v_baseline from public.ehockey_fantasy_transfer_events
      where entry_id=v_entry.id and target_round_id=v_target.id
      order by created_at,id limit 1;
    end if;
    if v_baseline is not null then
      select exists (
        (select pool_player_id,slot,is_captain from jsonb_to_recordset(v_baseline)
          as b(pool_player_id bigint,slot text,is_captain boolean)
         except select pool_player_id,slot,is_captain from public.ehockey_fantasy_entry_players where entry_id=v_entry.id)
        union all
        (select pool_player_id,slot,is_captain from public.ehockey_fantasy_entry_players where entry_id=v_entry.id
         except select pool_player_id,slot,is_captain from jsonb_to_recordset(v_baseline)
          as b(pool_player_id bigint,slot text,is_captain boolean))
      ) into v_pending;
    end if;
  end if;

  if not v_comp.transfers_enabled then
    v_mode := 'disabled';
    v_unlimited := false;
  elsif v_total_rounds = 0 then
    v_mode := 'preseason';
    v_unlimited := v_preseason_unlimited;
  elsif v_past_rounds = 0 and v_preseason_unlimited then
    v_mode := 'preseason';
    v_unlimited := true;
  elsif v_target.id is null then
    v_mode := 'closed';
    v_unlimited := false;
  elsif v_target.unlimited_transfers or v_target.reset_free_transfers then
    v_mode := 'unlimited';
    v_unlimited := true;
  else
    v_mode := 'round';
    v_unlimited := false;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mode', v_mode,
    'transfers_enabled', v_comp.transfers_enabled,
    'unlimited', v_unlimited,
    'free_transfers', v_free,
    'free_per_round', v_free_per_round,
    'max_bank', v_max_bank,
    'extra_transfer_cost', v_extra_cost,
    'next_transfer_cost',
      case when v_unlimited or v_free > 0 then 0 else v_extra_cost end,
    'target_round',
      case when v_target.id is null then null else jsonb_build_object(
        'id',v_target.id,
        'round_no',v_target.round_no,
        'name',v_target.name,
        'phase',v_target.phase,
        'starts_at',v_target.starts_at,
        'lock_at',v_target.lock_at,
        'ends_at',v_target.ends_at,
        'unlimited_transfers',v_target.unlimited_transfers,
        'reset_free_transfers',v_target.reset_free_transfers
      ) end,
    'baseline_roster',coalesce(v_baseline,'[]'::jsonb),
    'pending_changes',v_pending,
    'recent_transfers', v_recent
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.seh_fantasy_my_saved_score_breakdown(p_code text DEFAULT 'SCL27'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_user uuid := auth.uid();
  v_comp public.ehockey_fantasy_competitions%rowtype;
  v_entry_id bigint;
  v_result jsonb;
  v_has_round_history boolean := false;
begin
  if v_user is null then
    raise exception 'Du måste logga in först.';
  end if;

  select *
  into v_comp
  from public.ehockey_fantasy_competitions
  where upper(code)=upper(trim(coalesce(p_code,'')))
  limit 1;

  if v_comp.id is null then
    raise exception 'Fantasy-tävlingen finns inte.';
  end if;

  perform public.seh_fantasy_process_round_locks();

  select id
  into v_entry_id
  from public.ehockey_fantasy_entries
  where competition_id=v_comp.id
    and user_id=v_user
  limit 1;

  if v_entry_id is null then
    return '[]'::jsonb;
  end if;

  select exists(
    select 1
    from public.ehockey_fantasy_entry_round_players rp
    join public.ehockey_fantasy_rounds r on r.id=rp.round_id
    where rp.entry_id=v_entry_id
      and r.competition_id=v_comp.id
  )
  into v_has_round_history;

  if v_has_round_history then
    with round_player as (
      select
        rp.pool_player_id,
        upper(rp.slot) as slot,
        rp.round_id,
        r.round_no,
        r.name as round_name,
        rp.is_captain,
        rp.locked_price,
        count(distinct m.source_match_id)::integer as games,
        round(coalesce(sum(m.fantasy_points),0)::numeric,2) as base_points,
        round(coalesce(sum(
          coalesce(m.fantasy_points,0) *
          case when rp.is_captain then coalesce(v_comp.captain_multiplier,1) else 1 end
        ),0)::numeric,2) as team_points,

        coalesce(sum(
          case when m.scoring_role in ('F','D') then m.goals
               when m.scoring_role='G' then m.goalie_goals
               else 0 end
        ),0) as goals,
        round(coalesce(sum(
          case
            when m.scoring_role='F' then m.goals * 5 * coalesce(m.league_multiplier,1)
            when m.scoring_role='D' then m.goals * 6 * coalesce(m.league_multiplier,1)
            when m.scoring_role='G' then m.goalie_goals * 10 * coalesce(m.league_multiplier,1)
            else 0
          end
        ),0)::numeric,2) as goal_points,

        coalesce(sum(
          case when m.scoring_role in ('F','D') then m.assists
               when m.scoring_role='G' then m.goalie_assists
               else 0 end
        ),0) as assists,
        round(coalesce(sum(
          case
            when m.scoring_role='F' then m.assists * 3 * coalesce(m.league_multiplier,1)
            when m.scoring_role='D' then m.assists * 4 * coalesce(m.league_multiplier,1)
            when m.scoring_role='G' then m.goalie_assists * 5 * coalesce(m.league_multiplier,1)
            else 0
          end
        ),0)::numeric,2) as assist_points,

        coalesce(sum(case when m.scoring_role in ('F','D') then m.game_winning_goals else 0 end),0) as game_winning_goals,
        round(coalesce(sum(
          case when m.scoring_role in ('F','D') then m.game_winning_goals * 2 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as gwg_points,

        coalesce(sum(case when m.scoring_role='D' then m.blocked_shots else 0 end),0) as blocked_shots,
        round(coalesce(sum(
          case when m.scoring_role='D' then m.blocked_shots * 0.25 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as block_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_wins else 0 end),0) as goalie_wins,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_wins * 6 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as win_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_saves else 0 end),0) as goalie_saves,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_saves * 0.35 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as save_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_goals_allowed else 0 end),0) as goalie_goals_allowed,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_goals_allowed * -0.50 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as goals_allowed_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_shutouts else 0 end),0) as goalie_shutouts,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_shutouts * 8 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as shutout_points,

        count(*) filter (where m.scoring_role='F')::integer as forward_games,
        count(*) filter (where m.scoring_role='D')::integer as defense_games,
        count(*) filter (where m.scoring_role='G')::integer as goalie_games
      from public.ehockey_fantasy_entry_round_players rp
      join public.ehockey_fantasy_rounds r
        on r.id=rp.round_id
       and r.competition_id=v_comp.id
      left join public.ehockey_fantasy_matches fm
        on fm.competition_id=v_comp.id
       and fm.started_at >= r.starts_at
       and fm.started_at < r.ends_at
      left join public.ehockey_fantasy_match_player_stats m
        on m.competition_id=v_comp.id
       and m.source_match_id=fm.source_match_id
       and m.pool_player_id=rp.pool_player_id
       and (
         (upper(rp.slot)='G' and m.scoring_role='G')
         or
         (upper(rp.slot)<>'G' and m.scoring_role in ('F','D'))
       )
      where rp.entry_id=v_entry_id
      group by
        rp.pool_player_id,
        upper(rp.slot),
        rp.round_id,
        r.round_no,
        r.name,
        rp.is_captain,
        rp.locked_price
    ),
    player_history as (
      select
        x.pool_player_id,
        x.slot,
        count(*)::integer as round_count,
        sum(x.games)::integer as games,
        round(sum(x.base_points)::numeric,2) as total_points,
        round(sum(x.team_points)::numeric,2) as team_points,
        round((sum(x.team_points)-sum(x.base_points))::numeric,2) as captain_bonus_points,
        sum(x.goals) as goals,
        round(sum(x.goal_points)::numeric,2) as goal_points,
        sum(x.assists) as assists,
        round(sum(x.assist_points)::numeric,2) as assist_points,
        sum(x.game_winning_goals) as game_winning_goals,
        round(sum(x.gwg_points)::numeric,2) as gwg_points,
        sum(x.blocked_shots) as blocked_shots,
        round(sum(x.block_points)::numeric,2) as block_points,
        sum(x.goalie_wins) as goalie_wins,
        round(sum(x.win_points)::numeric,2) as win_points,
        sum(x.goalie_saves) as goalie_saves,
        round(sum(x.save_points)::numeric,2) as save_points,
        sum(x.goalie_goals_allowed) as goalie_goals_allowed,
        round(sum(x.goals_allowed_points)::numeric,2) as goals_allowed_points,
        sum(x.goalie_shutouts) as goalie_shutouts,
        round(sum(x.shutout_points)::numeric,2) as shutout_points,
        sum(x.forward_games)::integer as forward_games,
        sum(x.defense_games)::integer as defense_games,
        sum(x.goalie_games)::integer as goalie_games,
        min(x.round_no) as first_round_no,
        max(x.round_no) as last_round_no,
        min(x.locked_price) as first_locked_price,
        bool_or(x.is_captain) as was_captain,
        exists(
          select 1
          from public.ehockey_fantasy_entry_round_players ep
          join public.ehockey_fantasy_rounds current_round on current_round.id=ep.round_id
          where ep.entry_id=v_entry_id
            and ep.pool_player_id=x.pool_player_id
            and upper(ep.slot)=x.slot
            and current_round.starts_at<=now() and current_round.ends_at>now()
            and current_round.locked_at is not null
        ) as is_current
      from round_player x
      group by x.pool_player_id, x.slot
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'pool_player_id', h.pool_player_id,
          'slot', h.slot,
          'history_mode', true,
          'is_current', h.is_current,
          'round_count', h.round_count,
          'games', h.games,
          'total_points', h.total_points,
          'team_points', h.team_points,
          'captain_bonus_points', h.captain_bonus_points,
          'goals', h.goals,
          'goal_points', h.goal_points,
          'assists', h.assists,
          'assist_points', h.assist_points,
          'game_winning_goals', h.game_winning_goals,
          'gwg_points', h.gwg_points,
          'blocked_shots', h.blocked_shots,
          'block_points', h.block_points,
          'goalie_wins', h.goalie_wins,
          'win_points', h.win_points,
          'goalie_saves', h.goalie_saves,
          'save_points', h.save_points,
          'goalie_goals_allowed', h.goalie_goals_allowed,
          'goals_allowed_points', h.goals_allowed_points,
          'goalie_shutouts', h.goalie_shutouts,
          'shutout_points', h.shutout_points,
          'forward_games', h.forward_games,
          'defense_games', h.defense_games,
          'goalie_games', h.goalie_games,
          'first_round_no', h.first_round_no,
          'last_round_no', h.last_round_no,
          'first_locked_price', h.first_locked_price,
          'was_captain', h.was_captain,
          'round_breakdown', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'round_id', rp2.round_id,
                'round_no', rp2.round_no,
                'round_name', rp2.round_name,
                'games', rp2.games,
                'base_points', rp2.base_points,
                'team_points', rp2.team_points,
                'is_captain', rp2.is_captain,
                'locked_price', rp2.locked_price
              )
              order by rp2.round_no, rp2.round_id
            )
            from round_player rp2
            where rp2.pool_player_id=h.pool_player_id
              and rp2.slot=h.slot
          ), '[]'::jsonb)
        )
        order by h.is_current desc, h.last_round_no desc, h.slot, h.pool_player_id
      ),
      '[]'::jsonb
    )
    into v_result
    from player_history h;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'pool_player_id', q.pool_player_id,
          'slot', q.slot,
          'history_mode', false,
          'is_current', true,
          'round_count', 0,
          'games', q.games,
          'total_points', q.total_points,
          'team_points', round((
            q.total_points *
            case when q.is_captain then coalesce(v_comp.captain_multiplier,1) else 1 end
          )::numeric,2),
          'captain_bonus_points', round((
            q.total_points *
            case when q.is_captain then coalesce(v_comp.captain_multiplier,1) else 1 end
            - q.total_points
          )::numeric,2),
          'goals', q.goals,
          'goal_points', q.goal_points,
          'assists', q.assists,
          'assist_points', q.assist_points,
          'game_winning_goals', q.game_winning_goals,
          'gwg_points', q.gwg_points,
          'blocked_shots', q.blocked_shots,
          'block_points', q.block_points,
          'goalie_wins', q.goalie_wins,
          'win_points', q.win_points,
          'goalie_saves', q.goalie_saves,
          'save_points', q.save_points,
          'goalie_goals_allowed', q.goalie_goals_allowed,
          'goals_allowed_points', q.goals_allowed_points,
          'goalie_shutouts', q.goalie_shutouts,
          'shutout_points', q.shutout_points,
          'forward_games', q.forward_games,
          'defense_games', q.defense_games,
          'goalie_games', q.goalie_games,
          'was_captain', q.is_captain,
          'round_breakdown', '[]'::jsonb
        )
        order by q.slot
      ),
      '[]'::jsonb
    )
    into v_result
    from (
      select
        ep.pool_player_id,
        upper(ep.slot) as slot,
        ep.is_captain,
        count(distinct m.source_match_id)::integer as games,
        round(coalesce(sum(m.fantasy_points),0)::numeric,2) as total_points,

        coalesce(sum(
          case when m.scoring_role in ('F','D') then m.goals
               when m.scoring_role='G' then m.goalie_goals
               else 0 end
        ),0) as goals,
        round(coalesce(sum(
          case
            when m.scoring_role='F' then m.goals * 5 * coalesce(m.league_multiplier,1)
            when m.scoring_role='D' then m.goals * 6 * coalesce(m.league_multiplier,1)
            when m.scoring_role='G' then m.goalie_goals * 10 * coalesce(m.league_multiplier,1)
            else 0
          end
        ),0)::numeric,2) as goal_points,

        coalesce(sum(
          case when m.scoring_role in ('F','D') then m.assists
               when m.scoring_role='G' then m.goalie_assists
               else 0 end
        ),0) as assists,
        round(coalesce(sum(
          case
            when m.scoring_role='F' then m.assists * 3 * coalesce(m.league_multiplier,1)
            when m.scoring_role='D' then m.assists * 4 * coalesce(m.league_multiplier,1)
            when m.scoring_role='G' then m.goalie_assists * 5 * coalesce(m.league_multiplier,1)
            else 0
          end
        ),0)::numeric,2) as assist_points,

        coalesce(sum(case when m.scoring_role in ('F','D') then m.game_winning_goals else 0 end),0) as game_winning_goals,
        round(coalesce(sum(
          case when m.scoring_role in ('F','D') then m.game_winning_goals * 2 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as gwg_points,

        coalesce(sum(case when m.scoring_role='D' then m.blocked_shots else 0 end),0) as blocked_shots,
        round(coalesce(sum(
          case when m.scoring_role='D' then m.blocked_shots * 0.25 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as block_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_wins else 0 end),0) as goalie_wins,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_wins * 6 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as win_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_saves else 0 end),0) as goalie_saves,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_saves * 0.35 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as save_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_goals_allowed else 0 end),0) as goalie_goals_allowed,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_goals_allowed * -0.50 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as goals_allowed_points,

        coalesce(sum(case when m.scoring_role='G' then m.goalie_shutouts else 0 end),0) as goalie_shutouts,
        round(coalesce(sum(
          case when m.scoring_role='G' then m.goalie_shutouts * 8 * coalesce(m.league_multiplier,1) else 0 end
        ),0)::numeric,2) as shutout_points,

        count(*) filter (where m.scoring_role='F')::integer as forward_games,
        count(*) filter (where m.scoring_role='D')::integer as defense_games,
        count(*) filter (where m.scoring_role='G')::integer as goalie_games
      from public.ehockey_fantasy_entry_players ep
      left join public.ehockey_fantasy_match_player_stats m
        on m.competition_id=v_comp.id
       and m.pool_player_id=ep.pool_player_id
       and (
         (upper(ep.slot)='G' and m.scoring_role='G')
         or
         (upper(ep.slot)<>'G' and m.scoring_role in ('F','D'))
       )
      where ep.entry_id=v_entry_id
      group by ep.pool_player_id, upper(ep.slot), ep.is_captain
    ) q;
  end if;

  return coalesce(v_result,'[]'::jsonb);
end;
$function$;
