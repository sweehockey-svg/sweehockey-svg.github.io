-- The registration snapshot is supplied as a quoted psql variable.
-- Registration establishes the club, not the date of the move.
with snapshot as (
  select :'winter_snapshot'::jsonb as data
), winter as (
  select (player->>'id')::bigint as player_id, min(player->>'name') as player_name,
         (team->>'id')::bigint as team_id, min(team->>'name') as team_name,
         min(case team->>'requestedDivision'
           when '540' then 'Elite' when '541' then 'Pro' when '542' then 'Lite'
           when '543' then 'Core' when '544' then 'Neo' end) as division
  from snapshot
  cross join lateral jsonb_array_elements(data->'teams') as teams(team)
  cross join lateral jsonb_array_elements(team->'players') as players(player)
  where data->>'leagueId' = '535' and nullif(player->>'name', '') is not null
  group by (player->>'id')::bigint, (team->>'id')::bigint
), unambiguous_winter as (
  select * from (
    select winter.*, count(*) over (partition by player_id) as registrations from winter
  ) roster where registrations = 1
), spring_clubs as (
  select w.player_id, spring.team_external_id::bigint as team_id,
         min(spring.team_name_in_tournament) as team_name, min(spring.division) as division,
         min(spring.league_id) as league_id
  from unambiguous_winter w
  join public.v_ehockey_player_tournaments_web_v14 spring
    on rtrim(spring.sports_gamer_player_url, '/') = 'https://sportsgamer.gg/players/' || w.player_id
  where spring.league_id in (507, 508, 509, 510, 511)
    and spring.player_country = 'SE'
    and spring.team_external_id ~ '^[0-9]+$'
    and nullif(spring.team_name_in_tournament, '') is not null
  group by w.player_id, spring.team_external_id::bigint
), spring_history as (
  select s.*, count(*) over (partition by s.player_id) as spring_teams from spring_clubs s
), ranked_moves as (
  select t.player_id, t.to_team_id, dense_rank() over (
    partition by t.player_id order by t.transfer_date desc
  ) as recency
  from public.ehockey_season_transfers_v1 t
  join unambiguous_winter w on w.player_id = t.player_id
  where t.season_id = 'ecl26spring' and t.nationality = 'SE' and t.transfer_date is not null
), last_spring_move as (
  select player_id, case when count(distinct coalesce(to_team_id, 0)) = 1 then min(to_team_id) end as team_id
  from ranked_moves where recency = 1 group by player_id
), candidates as (
  select w.player_id, w.player_name, s.team_id as from_team_id, s.team_name as from_team,
         s.division as from_division, s.league_id as from_league_id,
         w.team_id as to_team_id, w.team_name as to_team, w.division as to_division
  from unambiguous_winter w
  join spring_history s on s.player_id = w.player_id and s.team_id <> w.team_id
  left join last_spring_move m on m.player_id = w.player_id
  where (m.team_id = s.team_id or (m.player_id is null and s.spring_teams = 1))
)
insert into public.ehockey_season_transfers_v1 as existing (
  season_id, transfer_key, player_id, player_name, nationality,
  from_team_id, from_team, from_division, from_league_id,
  to_team_id, to_team, to_division, to_league_id
)
select 'ecl27winter', 'winter-registration:' || player_id || ':' || to_team_id, player_id, player_name, 'SE',
       from_team_id, from_team, from_division, from_league_id,
       to_team_id, to_team, to_division, 535
from candidates
on conflict (season_id, transfer_key) do update set
  player_name = excluded.player_name, from_team_id = excluded.from_team_id,
  from_team = excluded.from_team, from_division = excluded.from_division,
  from_league_id = excluded.from_league_id, to_team = excluded.to_team, to_division = excluded.to_division,
  updated_at = now()
where existing.transfer_date is null and
  (existing.player_name, existing.from_team_id, existing.from_team, existing.from_division,
   existing.from_league_id, existing.to_team, existing.to_division)
  is distinct from
  (excluded.player_name, excluded.from_team_id, excluded.from_team, excluded.from_division,
   excluded.from_league_id, excluded.to_team, excluded.to_division)
returning season_id, player_name, from_team, to_team;
