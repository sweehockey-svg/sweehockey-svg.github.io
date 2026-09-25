update public.ehockey_fantasy_competitions
set
  settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'pricing_model', 'sports_gamer_frozen_swedish_reference_v2',
    'pricing_history_through', 'ECL ''26: Spring',
    'pricing_history_max_league_id', 511,
    'pricing_reference_population', 'all_swedish_sportsgamer_players',
    'pricing_frozen', true,
    'pricing_unknown_player_default', 15
  ),
  updated_at = now()
where code = 'SCL2027';
