-- Admin-only recovery. Leaves the private archive intact. Never overwrite newer rows.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
insert into public.sportsgamer_team_player_stats
 select (jsonb_populate_record(null::public.sportsgamer_team_player_stats,row_data)).*
 from private.player_cohort_cleanup_archive where run_id='20261018-cohort-v1' and table_name='public.sportsgamer_team_player_stats'
 on conflict do nothing;
insert into public.sportsgamer_league_roster_current
 select (jsonb_populate_record(null::public.sportsgamer_league_roster_current,row_data)).*
 from private.player_cohort_cleanup_archive where run_id='20261018-cohort-v1' and table_name='public.sportsgamer_league_roster_current'
 on conflict do nothing;
insert into graphics_private.sports_player_matches
 select (jsonb_populate_record(null::graphics_private.sports_player_matches,row_data)).*
 from private.player_cohort_cleanup_archive where run_id='20261018-cohort-v1' and table_name='graphics_private.sports_player_matches'
 on conflict do nothing;
-- Review counts, then deliberately replace ROLLBACK with COMMIT for recovery.
rollback;
