begin;
do $test$
declare
 e public.ehockey_fantasy_entries%rowtype; c public.ehockey_fantasy_competitions%rowtype;
 info jsonb; base jsonb; draft_a jsonb; draft_b jsonb; draft_two jsonb; result jsonb;
 pick jsonb; candidate record; chosen_slot text; first_player bigint; found boolean;
 snapshots text; target bigint; captain_slot text;
begin
 select x.* into e from public.ehockey_fantasy_entries x
 join public.ehockey_fantasy_competitions comp on comp.id=x.competition_id
 where comp.code='SCL2027' and public.seh_fantasy_has_access(x.user_id)
 and exists(select 1 from ehockey_fantasy_entry_round_players rp join ehockey_fantasy_rounds r on r.id=rp.round_id
 where rp.entry_id=x.id and r.starts_at<=now() and r.ends_at>now())
 and not exists(select 1 from ehockey_fantasy_entry_round_players rp
 join ehockey_fantasy_rounds r on r.id=rp.round_id join ehockey_fantasy_player_pool p on p.id=rp.pool_player_id
 where rp.entry_id=x.id and r.starts_at<=now() and r.ends_at>now()
 and (not p.is_available or not seh_fantasy_country_allowed(x.competition_id,p.country_code)
 or not rp.slot=any(p.eligible_slots)))
 order by x.id limit 1;
 if e.id is null then raise exception 'No eligible test fixture'; end if;
 select * into c from ehockey_fantasy_competitions where id=e.competition_id;
 perform set_config('request.jwt.claim.sub',e.user_id::text,true);
 info:=seh_fantasy_my_transfer_state(c.code);base:=info->'baseline_roster';
 target:=(info->'target_round'->>'id')::bigint;
 if jsonb_array_length(base)<>6 then raise exception 'Missing baseline';end if;
 select md5(coalesce(jsonb_agg(to_jsonb(rp) order by rp.id)::text,'')) into snapshots
 from ehockey_fantasy_entry_round_players rp where entry_id=e.id;
 perform seh_fantasy_save_my_team(c.code,'',base);
 update ehockey_fantasy_entry_transfer_state set free_transfers=1 where entry_id=e.id;
 -- Find two valid alternatives for one position, using the production validator.
 found:=false;
 for pick in select value from jsonb_array_elements(base) loop
  chosen_slot:=pick->>'slot';
  for candidate in select p.id from ehockey_fantasy_player_pool p
   where p.competition_id=c.id and p.is_available and chosen_slot=any(p.eligible_slots)
   and not exists(select 1 from jsonb_array_elements(base) b where (b->>'pool_player_id')::bigint=p.id)
   order by p.price,p.id limit 40 loop
   select jsonb_agg(case when b->>'slot'=chosen_slot then jsonb_set(b,'{pool_player_id}',to_jsonb(candidate.id)) else b end)
   into draft_a from jsonb_array_elements(base) b;
   begin
    result:=seh_fantasy_save_my_team(c.code,'',draft_a);first_player:=candidate.id;found:=true;exit;
   exception when others then null;end;
  end loop;
  exit when found;
 end loop;
 if not found then raise exception 'No valid transfer fixture';end if;
 if (result->'transfer'->>'count')::int<>1 or (result->'transfer'->>'paid_count')::int<>0 then raise exception 'First transfer charge incorrect';end if;
 found:=false;
 for candidate in select p.id from ehockey_fantasy_player_pool p
 where p.competition_id=c.id and p.is_available and chosen_slot=any(p.eligible_slots) and p.id<>first_player
 and not exists(select 1 from jsonb_array_elements(base) b where (b->>'pool_player_id')::bigint=p.id)
 order by p.price,p.id limit 40 loop
 select jsonb_agg(case when b->>'slot'=chosen_slot then jsonb_set(b,'{pool_player_id}',to_jsonb(candidate.id)) else b end)
 into draft_b from jsonb_array_elements(base) b;
 begin result:=seh_fantasy_save_my_team(c.code,'',draft_b);found:=true;exit;
 exception when others then null;end;
 end loop;
 if not found then raise exception 'No alternative fixture';end if;
 if (result->'transfer'->>'count')::int<>1 or (result->'transfer'->>'paid_count')::int<>0 then raise exception 'Editing same transfer charged twice';end if;
 found:=false;
 for pick in select value from jsonb_array_elements(base) where value->>'slot'<>chosen_slot loop
  for candidate in select p.id from ehockey_fantasy_player_pool p
  where p.competition_id=c.id and p.is_available and (pick->>'slot')=any(p.eligible_slots)
  and not exists(select 1 from jsonb_array_elements(draft_b) b where (b->>'pool_player_id')::bigint=p.id)
  and not exists(select 1 from jsonb_array_elements(base) b where (b->>'pool_player_id')::bigint=p.id)
  order by p.price,p.id limit 40 loop
  select jsonb_agg(case when b->>'slot'=pick->>'slot' then jsonb_set(b,'{pool_player_id}',to_jsonb(candidate.id)) else b end)
  into draft_two from jsonb_array_elements(draft_b) b;
  begin result:=seh_fantasy_save_my_team(c.code,'',draft_two);found:=true;exit;
  exception when others then null;end;
  end loop;
  exit when found;
 end loop;
 if not found then raise exception 'No second-slot fixture';end if;
 if (result->'transfer'->>'count')::int<>2 or (result->'transfer'->>'penalty_points')::numeric<>10 then raise exception 'Paid transfer cost incorrect';end if;
 perform seh_fantasy_save_my_team(c.code,'',base);
 if (select free_transfers from ehockey_fantasy_entry_transfer_state where entry_id=e.id)<>1 then raise exception 'Free transfer not refunded';end if;
 if (select coalesce(sum(penalty_points),0) from ehockey_fantasy_transfer_events where entry_id=e.id and target_round_id=target)<>0 then raise exception 'Penalty not refunded';end if;
 info:=seh_fantasy_my_transfer_state(c.code);
 if (info->>'pending_changes')::boolean then raise exception 'Restored roster still pending';end if;
 select b->>'slot' into captain_slot from jsonb_array_elements(base) b where not (b->>'is_captain')::boolean limit 1;
 select jsonb_agg(jsonb_set(b,'{is_captain}',to_jsonb(b->>'slot'=captain_slot))) into draft_a from jsonb_array_elements(base) b;
 result:=seh_fantasy_save_my_team(c.code,'',draft_a);
 info:=seh_fantasy_my_transfer_state(c.code);
 if (result->'transfer'->>'count')::int<>0 or not (info->>'pending_changes')::boolean then raise exception 'Captain editing incorrect';end if;
 perform seh_fantasy_save_my_team(c.code,'',base);
 if snapshots<>(select md5(coalesce(jsonb_agg(to_jsonb(rp) order by rp.id)::text,'')) from ehockey_fantasy_entry_round_players rp where entry_id=e.id)
 then raise exception 'Locked roster changed';end if;
end;
$test$;
rollback;
select 'Passed: replacement edits cost one transfer, two transfers cost 10, undo refunds free transfers and penalties, captain changes are free, locked snapshots unchanged; all test writes rolled back.' as result;
