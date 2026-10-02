-- Keep SCL 2027 Fantasy team identity aligned with the current SportsGamer
-- league registration (league 527), not older global team identities.
with competition as (
  select id
  from public.ehockey_fantasy_competitions
  where upper(code)='SCL2027'
  limit 1
)
update public.ehockey_fantasy_team_pool fp
set
  team_name=t.team_name,
  team_logo_url=t.team_logo_url,
  source_updated_at=now(),
  updated_at=now()
from competition c,
     public.sportsgamer_league_teams_current t
where fp.competition_id=c.id
  and fp.source_league_id=527
  and t.sports_gamer_league_id=527
  and t.sports_gamer_team_id=fp.sports_gamer_team_id
  and (
    fp.team_name is distinct from t.team_name
    or fp.team_logo_url is distinct from t.team_logo_url
  );

with competition as (
  select id
  from public.ehockey_fantasy_competitions
  where upper(code)='SCL2027'
  limit 1
)
update public.ehockey_fantasy_player_pool p
set
  real_team_id=r.sports_gamer_team_id,
  real_team_name=t.team_name,
  team_logo_url=t.team_logo_url,
  source_updated_at=now(),
  updated_at=now()
from competition c,
     public.sportsgamer_league_roster_current r
join public.sportsgamer_league_teams_current t
  on t.sports_gamer_league_id=r.sports_gamer_league_id
 and t.sports_gamer_team_id=r.sports_gamer_team_id
where p.competition_id=c.id
  and r.sports_gamer_league_id=527
  and r.sports_gamer_player_id=p.sports_gamer_player_id
  and (
    p.real_team_id is distinct from r.sports_gamer_team_id
    or p.real_team_name is distinct from t.team_name
    or p.team_logo_url is distinct from t.team_logo_url
  );
