-- Expose only public registration fields for current clubs. The raw statistics
-- table stays private. Owner execution is intentional for this restricted view.
create or replace view public.v_seh_current_regional_club_registrations
with (security_barrier=true) as
select p.sports_gamer_league_id,p.official_league_name,p.active_league,
 p.sports_gamer_team_id,p.sports_gamer_player_id,p.display_gamertag,p.listed_in_roster
from public.sportsgamer_team_player_stats p
join public.sportsgamer_league_teams_current t
 on t.sports_gamer_league_id=p.sports_gamer_league_id
 and t.sports_gamer_team_id=p.sports_gamer_team_id and t.is_available
where p.active_league=1
 and p.official_league_name ~* '\m(SCL|FCL|GCL|WECL|ECL|ROECL|CSCL|NACL)\M|CHAMPIONSHIP\s+LEAGUE';
revoke all on public.v_seh_current_regional_club_registrations from public;
grant select on public.v_seh_current_regional_club_registrations to anon,authenticated;
