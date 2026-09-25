update public.ehockey_fantasy_competitions
set
  settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'pricing_model', 'sports_gamer_division_weighted_roles_v3',
    'pricing_history_through', 'ECL ''26: Spring',
    'pricing_history_max_league_id', 511,
    'pricing_reference_population', 'all_swedish_sportsgamer_players',
    'pricing_frozen', true,
    'pricing_confidence_games', 30,
    'pricing_role_separated', true,
    'pricing_hybrid_policy', 'highest_eligible_role_price',
    'pricing_division_weights', jsonb_build_object(
      'Elite', 1.00,
      'Pro', 0.90,
      'Lite', 0.75,
      'Core', 0.62,
      'Neo', 0.50,
      'National', 0.85,
      'Other', 0.75
    ),
    'pricing_unknown_player_default', 15
  ),
  updated_at = now()
where code = 'SCL2027';
