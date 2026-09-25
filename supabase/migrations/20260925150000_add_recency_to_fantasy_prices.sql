update public.ehockey_fantasy_competitions
set
  settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'pricing_model', 'sports_gamer_division_role_recency_v5',
    'pricing_recency_method', 'sports_gamer_league_id_half_life',
    'pricing_recency_half_life_league_ids', 60,
    'pricing_recency_floor', 0.10
  ),
  updated_at = now()
where code = 'SCL2027';
