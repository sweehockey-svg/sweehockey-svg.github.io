create or replace function public.seh_admin_search_players(p_query text default ''::text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_role text;
  v_query text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_query,'')));
  v_result jsonb;
begin
  select w.role into v_role
  from public.seh_current_writer() w
  limit 1;

  if pg_catalog.lower(coalesce(v_role,'')) <> 'admin' then
    raise exception 'Adminbehörighet krävs.';
  end if;

  with candidates as (
    select
      d.player_key,
      d.display_gamertag,
      d.player_country,
      d.sports_gamer_player_url,
      pg_catalog.substring(d.sports_gamer_player_url, '/players/([0-9]+)') as sports_gamer_player_id,
      p.image_url,
      0 as source_priority
    from public.app_account_player_directory_cache d
    left join public.ehockey_player_self_profiles p
      on p.player_key = d.player_key

    union all

    select
      fp.player_key,
      fp.display_gamertag,
      fp.country_code as player_country,
      case
        when fp.sports_gamer_player_id is not null
          then 'https://sportsgamer.gg/players/' || fp.sports_gamer_player_id::text
        else null
      end as sports_gamer_player_url,
      fp.sports_gamer_player_id::text as sports_gamer_player_id,
      p.image_url,
      1 as source_priority
    from public.ehockey_fantasy_player_pool fp
    join public.ehockey_fantasy_competitions fc
      on fc.id = fp.competition_id
     and fc.status in ('setup','open')
    left join public.ehockey_player_self_profiles p
      on p.player_key = fp.player_key
  ),
  dedup as (
    select distinct on (c.player_key)
      c.player_key,
      c.display_gamertag,
      c.player_country,
      c.sports_gamer_player_url,
      c.sports_gamer_player_id,
      c.image_url
    from candidates c
    where nullif(pg_catalog.btrim(c.player_key),'') is not null
    order by
      c.player_key,
      c.source_priority,
      case when nullif(pg_catalog.btrim(c.display_gamertag),'') is null then 1 else 0 end
  ),
  matched as (
    select
      d.*,
      case
        when v_query <> '' and pg_catalog.lower(d.display_gamertag) = v_query then 1
        else 0
      end as sort_exact
    from dedup d
    where
      v_query = ''
      or pg_catalog.lower(coalesce(d.display_gamertag,'')) like '%' || v_query || '%'
      or coalesce(d.sports_gamer_player_id,'') = v_query
  ),
  limited as (
    select *
    from matched
    order by sort_exact desc, display_gamertag
    limit 30
  )
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'player_key', x.player_key,
        'display_gamertag', x.display_gamertag,
        'player_country', x.player_country,
        'sports_gamer_player_url', x.sports_gamer_player_url,
        'sports_gamer_player_id', x.sports_gamer_player_id,
        'image_url', x.image_url
      )
      order by x.sort_exact desc, x.display_gamertag
    ),
    '[]'::jsonb
  )
  into v_result
  from limited x;

  return v_result;
end;
$function$;

create or replace function public.seh_admin_publish_player_image_direct(
  p_player_key text,
  p_final_path text,
  p_public_url text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin uuid := auth.uid();
  v_role text;
  v_key text := pg_catalog.btrim(coalesce(p_player_key,''));
  v_path text := pg_catalog.btrim(coalesce(p_final_path,''));
  v_url text := pg_catalog.btrim(coalesce(p_public_url,''));
  v_name text;
begin
  select w.role into v_role
  from public.seh_current_writer() w
  limit 1;

  if pg_catalog.lower(coalesce(v_role,'')) <> 'admin' then
    raise exception 'Adminbehörighet krävs.';
  end if;

  if v_key = '' then
    raise exception 'Välj en spelare.';
  end if;

  select x.display_gamertag
    into v_name
  from (
    select d.display_gamertag, 0 as source_priority, null::timestamptz as updated_at
    from public.app_account_player_directory_cache d
    where d.player_key = v_key

    union all

    select fp.display_gamertag, 1 as source_priority, fp.updated_at
    from public.ehockey_fantasy_player_pool fp
    join public.ehockey_fantasy_competitions fc
      on fc.id = fp.competition_id
     and fc.status in ('setup','open')
    where fp.player_key = v_key
  ) x
  where nullif(pg_catalog.btrim(coalesce(x.display_gamertag,'')),'') is not null
  order by x.source_priority, x.updated_at desc nulls last
  limit 1;

  if v_name is null then
    raise exception 'Spelaren hittades inte i spelarregistret eller i en aktiv Fantasy-spelarpool.';
  end if;

  if v_path = '' or v_path not like 'published/%' then
    raise exception 'Ogiltig sökväg för spelarbild.';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'player-profile-images'
      and o.name = v_path
  ) then
    raise exception 'Spelarbilden hittades inte i publik lagring.';
  end if;

  if v_url = ''
     or pg_catalog.strpos(v_url, '/storage/v1/object/public/player-profile-images/' || v_path) = 0 then
    raise exception 'Ogiltig publik bildadress.';
  end if;

  insert into public.ehockey_player_self_profiles(
    player_key, image_url, approved_at, approved_by, updated_at
  )
  values(
    v_key, v_url, pg_catalog.now(), v_admin, pg_catalog.now()
  )
  on conflict (player_key) do update
  set image_url = excluded.image_url,
      approved_at = excluded.approved_at,
      approved_by = excluded.approved_by,
      updated_at = excluded.updated_at;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'player_key', v_key,
    'display_gamertag', v_name,
    'image_url', v_url
  );
end;
$function$;

create or replace view public.v_ehockey_player_self_profiles_public as
select
  p.player_key,
  coalesce(d.display_gamertag, h.display_gamertag, f.display_gamertag) as display_gamertag,
  coalesce(d.player_image, h.player_image, f.player_image) as source_player_image,
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
  coalesce(
    pg_catalog.substring(d.sports_gamer_player_url, '/players/([0-9]+)'),
    h.sports_gamer_player_id,
    f.sports_gamer_player_id,
    pg_catalog.substring(p.player_key, '^SG:([0-9]+)$')
  ) as sports_gamer_player_id
from public.ehockey_player_self_profiles p
left join public.app_player_directory_cache d
  on d.player_key = p.player_key
left join lateral (
  select
    hist.display_gamertag,
    hist.player_image,
    pg_catalog.substring(hist.sports_gamer_player_url, '/players/([0-9]+)') as sports_gamer_player_id
  from public.v_ehockey_team_all_time_players_chronological hist
  where hist.player_key = p.player_key
  order by hist.last_appearance_date desc nulls last
  limit 1
) h on true
left join lateral (
  select
    fp.display_gamertag,
    fp.player_image,
    fp.sports_gamer_player_id::text as sports_gamer_player_id
  from public.ehockey_fantasy_player_pool fp
  where fp.player_key = p.player_key
  order by fp.is_available desc, fp.updated_at desc nulls last
  limit 1
) f on true;
