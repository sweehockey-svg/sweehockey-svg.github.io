create or replace function public.sync_scl27_current_team_identity_to_fantasy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sports_gamer_league_id <> 527 then
    return new;
  end if;

  update public.ehockey_fantasy_team_pool
  set team_name = coalesce(nullif(btrim(new.team_name), ''), team_name),
      team_logo_url = coalesce(nullif(btrim(new.team_logo_url), ''), team_logo_url),
      updated_at = now()
  where competition_id = 2
    and sports_gamer_team_id = new.sports_gamer_team_id;

  update public.ehockey_fantasy_player_pool
  set real_team_name = coalesce(nullif(btrim(new.team_name), ''), real_team_name),
      team_logo_url = coalesce(nullif(btrim(new.team_logo_url), ''), team_logo_url),
      updated_at = now()
  where competition_id = 2
    and real_team_id = new.sports_gamer_team_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_scl27_current_team_identity_to_fantasy
  on public.sportsgamer_league_teams_current;

create trigger trg_sync_scl27_current_team_identity_to_fantasy
after insert or update of team_name, team_logo_url
on public.sportsgamer_league_teams_current
for each row
execute function public.sync_scl27_current_team_identity_to_fantasy();

update public.ehockey_fantasy_team_pool ftp
set team_name = s.team_name,
    team_logo_url = s.team_logo_url,
    updated_at = now()
from public.sportsgamer_league_teams_current s
where ftp.competition_id = 2
  and s.sports_gamer_league_id = 527
  and s.is_available = true
  and ftp.sports_gamer_team_id = s.sports_gamer_team_id
  and (
    ftp.team_name is distinct from s.team_name
    or ftp.team_logo_url is distinct from s.team_logo_url
  );

update public.ehockey_fantasy_player_pool fpp
set real_team_name = s.team_name,
    team_logo_url = s.team_logo_url,
    updated_at = now()
from public.sportsgamer_league_teams_current s
where fpp.competition_id = 2
  and s.sports_gamer_league_id = 527
  and s.is_available = true
  and fpp.real_team_id = s.sports_gamer_team_id
  and (
    fpp.real_team_name is distinct from s.team_name
    or fpp.team_logo_url is distinct from s.team_logo_url
  );
