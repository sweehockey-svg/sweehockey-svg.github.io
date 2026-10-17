-- Read-only diagnostics, NOT a deletion list. Run with a trusted admin connection.
begin read only;
set local statement_timeout = '45s';

with eligible as (
  select distinct r.sports_gamer_player_id as player_id
  from public.v_ehockey_player_registry r
  left join private.sportsgamer_storage_scope s
    on s.player_id = r.sports_gamer_player_id
  where r.sports_gamer_player_id is not null
    and (r.country_code in ('SE','NO','DK')
         or coalesce(s.has_swedish_tournament,false))
)
select 'statistics' as dataset, p.sports_gamer_league_id as league_id,
       count(*) as rows, count(distinct p.sports_gamer_player_id) as players,
       count(distinct p.sports_gamer_player_id) filter (where e.player_id is null)
         as not_verified_for_permanent_cohort
from public.sportsgamer_team_player_stats p
left join eligible e on e.player_id = p.sports_gamer_player_id
where p.sports_gamer_league_id in (520,523,524,525,526,527,529,532)
group by p.sports_gamer_league_id
union all
select 'available_roster', p.sports_gamer_league_id,
       count(*), count(distinct p.sports_gamer_player_id),
       count(distinct p.sports_gamer_player_id) filter (where e.player_id is null)
from public.sportsgamer_league_roster_current p
left join eligible e on e.player_id = p.sports_gamer_player_id
where coalesce(p.is_available,true)
group by p.sports_gamer_league_id
order by dataset,league_id;

-- Direct view dependencies only; function bodies and transitive readers need review too.
select distinct n.nspname as schema_name,c.relname as dependent_view
from pg_depend d
join pg_rewrite rw on rw.oid = d.objid
join pg_class c on c.oid = rw.ev_class
join pg_namespace n on n.oid = c.relnamespace
where d.refobjid in ('public.sportsgamer_team_player_stats'::regclass,
                     'public.sportsgamer_league_roster_current'::regclass)
  and c.relkind in ('v','m')
order by schema_name,dependent_view;

rollback;
