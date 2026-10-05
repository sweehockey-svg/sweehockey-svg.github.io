-- Resolve approved self-profile portraits for players outside the Swedish directory.
-- Keeps the existing public view contract and adds sports_gamer_player_id so
-- other site surfaces can match approved portraits by SportsGamer identity.

create or replace view public.v_ehockey_player_self_profiles_public as
select
  p.player_key,
  coalesce(d.display_gamertag, h.display_gamertag) as display_gamertag,
  coalesce(d.player_image, h.player_image) as source_player_image,
  p.image_url,
  p.presentation,
  p.positions_text,
  p.contact,
  p.twitch_url,
  p.x_url,
  p.instagram_url,
  p.availability_status,
  p.team_status,
  p.approved_at,
  p.updated_at,
  h.sports_gamer_player_id
from public.ehockey_player_self_profiles p
left join public.app_player_directory_cache d
  on d.player_key = p.player_key
left join lateral (
  select
    hist.display_gamertag,
    hist.player_image,
    substring(hist.sports_gamer_player_url from '/players/([0-9]+)') as sports_gamer_player_id
  from public.v_ehockey_team_all_time_players_chronological hist
  where hist.player_key = p.player_key
  order by hist.last_appearance_date desc nulls last
  limit 1
) h on true;
