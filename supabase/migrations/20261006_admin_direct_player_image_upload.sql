create or replace function public.seh_admin_search_players(p_query text default '')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
  from (
    select
      d.player_key,
      d.display_gamertag,
      d.player_country,
      d.sports_gamer_player_url,
      substring(d.sports_gamer_player_url, '/players/([0-9]+)') as sports_gamer_player_id,
      p.image_url,
      case
        when v_query <> '' and pg_catalog.lower(d.display_gamertag) = v_query then 1
        else 0
      end as sort_exact
    from public.app_account_player_directory_cache d
    left join public.ehockey_player_self_profiles p
      on p.player_key = d.player_key
    where nullif(pg_catalog.btrim(d.player_key),'') is not null
      and (
        v_query = ''
        or pg_catalog.lower(d.display_gamertag) like '%' || v_query || '%'
        or coalesce(substring(d.sports_gamer_player_url, '/players/([0-9]+)'), '') = v_query
      )
    order by
      case
        when v_query <> '' and pg_catalog.lower(d.display_gamertag) = v_query then 0
        else 1
      end,
      d.display_gamertag
    limit 30
  ) x;

  return v_result;
end;
$$;

create or replace function public.seh_admin_publish_player_image_direct(
  p_player_key text,
  p_final_path text,
  p_public_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  select d.display_gamertag
    into v_name
  from public.app_account_player_directory_cache d
  where d.player_key = v_key
  limit 1;

  if v_name is null then
    raise exception 'Spelaren hittades inte i spelarregistret.';
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
$$;

revoke all on function public.seh_admin_search_players(text) from public;
grant execute on function public.seh_admin_search_players(text) to authenticated;

revoke all on function public.seh_admin_publish_player_image_direct(text,text,text) from public;
grant execute on function public.seh_admin_publish_player_image_direct(text,text,text) to authenticated;
