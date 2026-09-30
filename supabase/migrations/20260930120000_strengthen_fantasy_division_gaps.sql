update public.ehockey_fantasy_competitions
set
  settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'pricing_model', 'sports_gamer_top_division_playoffs_v6',
    'pricing_division_weights', jsonb_build_object(
      'Elite', 1.15,
      'Pro', 1.00,
      'Lite', 0.62,
      'Core', 0.42,
      'Neo', 0.25,
      'National', 0.75,
      'Other', 0.60
    ),
    'pricing_top_division_playoff_bonus', jsonb_build_object(
      'Elite', 1.15,
      'Pro', 1.10
    )
  ),
  updated_at = now()
where code = 'SCL2027';
