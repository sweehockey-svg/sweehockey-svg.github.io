begin;

update public.ehockey_fantasy_competitions c
set status='setup',
    updated_at=now()
where upper(c.code)='SCL2027'
  and c.status='open'
  and not exists (
    select 1
    from public.ehockey_fantasy_entries e
    where e.competition_id=c.id
  )
  and not exists (
    select 1
    from public.ehockey_fantasy_rounds r
    where r.competition_id=c.id
      and r.is_active
  );

commit;
