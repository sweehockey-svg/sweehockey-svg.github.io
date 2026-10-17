-- Scoped, reversible cleanup. No Storage objects, profiles, identities or historical recordbook sources are deleted.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
lock table public.sportsgamer_team_player_stats, public.sportsgamer_league_roster_current, graphics_private.sports_player_matches in share row exclusive mode;
create temporary table cleanup_candidates on commit drop as select distinct r.sports_gamer_player_id as player_id,r.player_id as registry_id
from public.v_ehockey_player_registry r
where r.country_code ~ '^[A-Z]{2}$' and r.country_code not in('SE','NO','DK')
and r.nationality_status='automatic' and not coalesce(r.nationality_locked,false)
and exists(select 1 from public.sportsgamer_team_player_stats p where p.sports_gamer_player_id=r.sports_gamer_player_id and p.sports_gamer_league_id in(523,524,525,526,529,532)
union all select 1 from public.sportsgamer_league_roster_current p where p.sports_gamer_player_id=r.sports_gamer_player_id and p.sports_gamer_league_id in(523,524,525,526,529,532))
and not exists(select 1 from private.sportsgamer_storage_scope s where s.player_id=r.sports_gamer_player_id and(s.is_scandinavian or s.has_swedish_tournament))
and not exists(select 1 from public.v_ehockey_player_tournaments_all h where h.player_key='SG:'||r.sports_gamer_player_id::text and (upper(h.competition_code)~'^(SEC|SCL)' or upper(h.league_name)~'^(SEC|SCL)') and(coalesce(h.total_skater_games,0)>0 or coalesce(h.total_goalie_games,0)>0))
and not exists(select 1 from public.sportsgamer_team_player_stats p where p.sports_gamer_player_id=r.sports_gamer_player_id and (p.sports_gamer_league_id in(520,527) or upper(p.official_league_name)~'^(SEC|SCL)') and(coalesce(p.regular_skater_games,0)+coalesce(p.playoff_skater_games,0)+coalesce(p.regular_goalie_games,0)+coalesce(p.playoff_goalie_games,0)+coalesce(p.participant_regular_games,0)+coalesce(p.participant_playoff_games,0)>0));
create unique index on cleanup_candidates(player_id);
do $$ begin
 if (select count(*) from cleanup_candidates)<>744 then raise exception 'Candidate set changed; review required';end if;
end $$;
create temporary table portrait_baseline on commit drop as
 select distinct sports_gamer_player_id,image_url from public.v_ehockey_player_self_profiles_public
 where sports_gamer_player_id is not null and nullif(image_url,'')is not null;
create temporary table sec_scl_baseline on commit drop as
 select sports_gamer_league_id,count(*) n,md5(string_agg(md5(to_jsonb(p)::text),'' order by sports_gamer_team_id,sports_gamer_player_id)) checksum
 from public.sportsgamer_team_player_stats p where sports_gamer_league_id in(520,527) group by 1;
create table if not exists private.player_cohort_cleanup_archive(
 run_id text not null,table_name text not null,row_digest text not null,row_data jsonb not null,
 archived_at timestamptz not null default now(),primary key(run_id,table_name,row_digest)
);
alter table private.player_cohort_cleanup_archive enable row level security;
revoke all on private.player_cohort_cleanup_archive from public,anon,authenticated;
do $$ begin if exists(select 1 from private.player_cohort_cleanup_archive where run_id='20261018-cohort-v1')then raise exception 'Run already archived';end if;end $$;
with removed as(
 delete from public.sportsgamer_team_player_stats p using cleanup_candidates c
 where p.sports_gamer_player_id=c.player_id and p.sports_gamer_league_id in(523,524,525,526,529,532)
 returning p.*
) insert into private.player_cohort_cleanup_archive(run_id,table_name,row_digest,row_data)
 select '20261018-cohort-v1','public.sportsgamer_team_player_stats',md5(to_jsonb(r)::text),to_jsonb(r) from removed r;
with removed as(
 delete from public.sportsgamer_league_roster_current p using cleanup_candidates c
 where p.sports_gamer_player_id=c.player_id and p.sports_gamer_league_id in(523,524,525,526,529,532)
 returning p.*
) insert into private.player_cohort_cleanup_archive(run_id,table_name,row_digest,row_data)
 select '20261018-cohort-v1','public.sportsgamer_league_roster_current',md5(to_jsonb(r)::text),to_jsonb(r) from removed r;
with removed as(
 delete from graphics_private.sports_player_matches p using cleanup_candidates c
 where p.source_player_id=c.player_id and p.source_league_id in(529,532)
 returning p.*
) insert into private.player_cohort_cleanup_archive(run_id,table_name,row_digest,row_data)
 select '20261018-cohort-v1','graphics_private.sports_player_matches',md5(to_jsonb(r)::text),to_jsonb(r) from removed r;
do $$ begin
 if exists(select * from portrait_baseline except select distinct sports_gamer_player_id,image_url from public.v_ehockey_player_self_profiles_public where sports_gamer_player_id is not null and nullif(image_url,'')is not null)then raise exception 'Portrait mapping changed';end if;
 if exists(select * from sec_scl_baseline except select sports_gamer_league_id,count(*) n,md5(string_agg(md5(to_jsonb(p)::text),'' order by sports_gamer_team_id,sports_gamer_player_id)) checksum from public.sportsgamer_team_player_stats p where sports_gamer_league_id in(520,527) group by 1)then raise exception 'SEC/SCL changed';end if;
 if (select count(*) from private.player_cohort_cleanup_archive where run_id='20261018-cohort-v1')<>5348 then raise exception 'Deletion count changed';end if;
end $$;
select table_name,count(*) archived_rows from private.player_cohort_cleanup_archive where run_id='20261018-cohort-v1' group by table_name order by table_name;
commit;
