-- Promote Burchurs HC as the current master identity for team 228.
-- This fixes mobile/webapp surfaces that read v_local_team_list directly,
-- while preserving Macho HC / HC Macho as historical names.

update public.teams
set current_name = 'Burchurs HC',
    normalized_name = public.normalize_team_identity_name('Burchurs HC'),
    logo_path = null,
    logo_url = 'https://sportsgamer.gg/storage/team-logos/527/4216/Burchurs HC_20261005-144947.png',
    profile_url = 'https://sportsgamer.gg/leagues/527/teams/4216',
    updated_at = now()
where id = 228;

update public.team_names
set is_current = false,
    name_type = case when name_type = 'current' then 'historical' else name_type end,
    updated_at = now()
where team_id = 228
  and normalized_name <> public.normalize_team_identity_name('Burchurs HC');

update public.team_names
set is_current = true,
    name_type = 'current',
    updated_at = now()
where team_id = 228
  and normalized_name = public.normalize_team_identity_name('Burchurs HC');
