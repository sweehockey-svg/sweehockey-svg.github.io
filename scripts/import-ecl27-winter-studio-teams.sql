-- Trusted server-side snapshot only. Do not expose this import as a client RPC.
begin;
create temporary table studio_winter_import on commit drop as
select :'winter_snapshot'::jsonb data;
do $$
begin
  if not exists (select from studio_winter_import
    where data->>'leagueId'='535' and jsonb_array_length(data->'teams')>0
      and not exists (select from jsonb_array_elements(data->'teams') t
        where jsonb_array_length(coalesce(t->'captainIds','[]'::jsonb)) not between 1 and 3))
  then raise exception 'Incomplete Winter captain snapshot'; end if;
end $$;
insert into public.sportsgamer_league_teams_current
  (sports_gamer_league_id,sports_gamer_team_id,team_name,team_logo_url,
   captain_player_id,assistant_1_player_id,assistant_2_player_id,is_available,source_updated_at,updated_at)
select 535,(t->>'id')::bigint,t->>'name',nullif(t->>'logoUrl',''),
  (t->'captainIds'->>0)::bigint,(t->'captainIds'->>1)::bigint,(t->'captainIds'->>2)::bigint,
  true,(data->>'checkedAt')::timestamptz,now()
from studio_winter_import cross join lateral jsonb_array_elements(data->'teams') t
on conflict(sports_gamer_league_id,sports_gamer_team_id) do update set
  team_name=excluded.team_name,team_logo_url=excluded.team_logo_url,
  captain_player_id=excluded.captain_player_id,assistant_1_player_id=excluded.assistant_1_player_id,
  assistant_2_player_id=excluded.assistant_2_player_id,is_available=true,
  source_updated_at=excluded.source_updated_at,updated_at=now()
where excluded.source_updated_at>=sportsgamer_league_teams_current.source_updated_at
   or sportsgamer_league_teams_current.source_updated_at is null;
update public.sportsgamer_league_teams_current r set is_available=false,updated_at=now()
from studio_winter_import s where r.sports_gamer_league_id=535 and r.is_available
  and coalesce(r.source_updated_at,'-infinity'::timestamptz)<=(s.data->>'checkedAt')::timestamptz
  and not exists (select from jsonb_array_elements(s.data->'teams') t where (t->>'id')::bigint=r.sports_gamer_team_id);
commit;
