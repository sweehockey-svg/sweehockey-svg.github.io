begin;
do $test$
declare e ehockey_fantasy_entries%rowtype;c ehockey_fantasy_competitions%rowtype;info jsonb;rejected boolean:=false;
begin
 select x.* into e from ehockey_fantasy_entries x join ehockey_fantasy_competitions comp on comp.id=x.competition_id
 where comp.code='SCL2027' and seh_fantasy_has_access(x.user_id) order by x.id limit 1;
 select * into c from ehockey_fantasy_competitions where id=e.competition_id;
 perform set_config('request.jwt.claim.sub',e.user_id::text,true);
 info:=seh_fantasy_my_transfer_state(c.code);
 update ehockey_fantasy_rounds set lock_at=now()+interval '100 milliseconds'
 where id=(info->'target_round'->>'id')::bigint;
 perform pg_sleep(0.15);
 begin
  perform seh_fantasy_save_my_team(c.code,'',info->'baseline_roster');
 exception when others then
  if sqlerrm like 'Deadline har passerat%' then rejected:=true;else raise;end if;
 end;
 if not rejected then raise exception 'Deadline boundary not enforced';end if;
end;$test$;
rollback;
select 'Passed: save rejected when deadline passes during transaction; all test writes rolled back.' as result;
