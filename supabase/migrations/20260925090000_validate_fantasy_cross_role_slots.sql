-- Keep genuine goalie/skater hybrids while removing stale cross-role flags.
-- Three recorded games in both roles is the minimum for dual-role eligibility.
with competition as (
  select id
  from public.ehockey_fantasy_competitions
  where code = 'SCL2027'
), history as (
  select
    sports_gamer_player_id,
    sum(coalesce(regular_skater_games, 0) + coalesce(playoff_skater_games, 0))::integer as skater_games,
    sum(coalesce(regular_goalie_games, 0) + coalesce(playoff_goalie_games, 0))::integer as goalie_games
  from public.sportsgamer_team_player_stats
  group by sports_gamer_player_id
), corrected as (
  select
    p.id,
    h.skater_games,
    h.goalie_games,
    case
      when h.skater_games >= 3 and h.goalie_games < 3
        then array_remove(p.eligible_slots, 'G')
      when h.goalie_games >= 3 and h.skater_games < 3
        then array['G']::text[]
      else p.eligible_slots
    end as eligible_slots
  from public.ehockey_fantasy_player_pool p
  join competition c on c.id = p.competition_id
  join history h on h.sports_gamer_player_id = p.sports_gamer_player_id
  where 'G' = any(p.eligible_slots)
    and cardinality(p.eligible_slots) > 1
    and not (h.skater_games >= 3 and h.goalie_games >= 3)
)
update public.ehockey_fantasy_player_pool p
set
  eligible_slots = c.eligible_slots,
  source_snapshot = jsonb_set(
    coalesce(p.source_snapshot, '{}'::jsonb),
    '{cross_role_validation}',
    jsonb_build_object(
      'rule', 'minimum_3_games_in_each_role',
      'skater_games', c.skater_games,
      'goalie_games', c.goalie_games,
      'validated_at', now()
    ),
    true
  ),
  updated_at = now()
from corrected c
where p.id = c.id
  and p.eligible_slots is distinct from c.eligible_slots;
