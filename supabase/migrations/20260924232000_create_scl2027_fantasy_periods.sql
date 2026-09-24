begin;

with competition as (
  select id
  from public.ehockey_fantasy_competitions
  where upper(code)='SCL2027'
), periods(round_no,name,phase,starts_local,ends_local,reset_free_transfers) as (
  values
    (1,'Period 1 · Gruppspel','regular','2026-10-05 18:00'::timestamp,'2026-10-12 18:00'::timestamp,false),
    (2,'Period 2 · Gruppspel','regular','2026-10-12 18:00'::timestamp,'2026-10-19 18:00'::timestamp,false),
    (3,'Period 3 · Gruppspel','regular','2026-10-19 18:00'::timestamp,'2026-10-26 18:00'::timestamp,false),
    (4,'Period 4 · Åttondelsfinaler','playoffs','2026-10-26 18:00'::timestamp,'2026-11-02 18:00'::timestamp,true),
    (5,'Period 5 · Kvartsfinaler','playoffs','2026-11-02 18:00'::timestamp,'2026-11-09 18:00'::timestamp,false),
    (6,'Period 6 · Semifinaler','playoffs','2026-11-09 18:00'::timestamp,'2026-11-16 18:00'::timestamp,false),
    (7,'Period 7 · Final','finals','2026-11-16 18:00'::timestamp,'2026-11-23 18:00'::timestamp,false)
)
insert into public.ehockey_fantasy_rounds (
  competition_id,
  round_no,
  name,
  phase,
  starts_at,
  lock_at,
  ends_at,
  unlimited_transfers,
  reset_free_transfers,
  free_transfers_awarded,
  is_active,
  updated_at
)
select
  c.id,
  p.round_no,
  p.name,
  p.phase,
  p.starts_local at time zone 'Europe/Stockholm',
  p.starts_local at time zone 'Europe/Stockholm',
  p.ends_local at time zone 'Europe/Stockholm',
  false,
  p.reset_free_transfers,
  1,
  true,
  now()
from competition c
cross join periods p
on conflict (competition_id,round_no) do update set
  name=excluded.name,
  phase=excluded.phase,
  starts_at=excluded.starts_at,
  lock_at=excluded.lock_at,
  ends_at=excluded.ends_at,
  unlimited_transfers=excluded.unlimited_transfers,
  reset_free_transfers=excluded.reset_free_transfers,
  free_transfers_awarded=excluded.free_transfers_awarded,
  is_active=true,
  updated_at=now()
where public.ehockey_fantasy_rounds.locked_at is null;

update public.ehockey_fantasy_competitions c
set status='open',
    lock_at='2026-10-05 18:00'::timestamp at time zone 'Europe/Stockholm',
    updated_at=now()
where upper(c.code)='SCL2027'
  and exists (
    select 1
    from public.ehockey_fantasy_rounds r
    where r.competition_id=c.id
      and r.is_active
    group by r.competition_id
    having count(*)=7
  );

commit;
