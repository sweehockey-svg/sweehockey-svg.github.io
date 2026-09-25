update public.ehockey_fantasy_competitions
set
  settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'pricing_model', 'sports_gamer_division_role_quality_v4',
    'pricing_goalie_model', 'division_weighted_save_percentage_and_gaa',
    'pricing_goalie_save_percentage_weight', 20.0,
    'pricing_goalie_gaa_penalty', 1.5,
    'pricing_goalie_save_volume_bonus', 0
  ),
  updated_at = now()
where code = 'SCL2027';
