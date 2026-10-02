create or replace function seh_private.review_player_application(
  p_id bigint,
  p_decision text,
  p_player_key text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r public.ehockey_player_profile_requests%rowtype;
  identity_id text;
  identity_name text;
begin
  if auth.uid() is null
     or not exists(
       select 1
       from public.seh_current_writer() w
       where lower(w.role)='admin'
     )
  then
    raise exception 'Adminbehörighet krävs.';
  end if;

  if p_decision is null or p_decision not in ('approved','rejected') then
    raise exception 'Ogiltigt beslut.';
  end if;

  select *
    into r
  from public.ehockey_player_profile_requests
  where id=p_id
  for update;

  if r.id is null
     or r.request_type not in ('find_player','new_player')
     or r.status<>'pending'
  then
    raise exception 'Ingen väntande ansökan hittades.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,2712));

  if p_decision='approved' then
    if p_player_key is null
       or not exists(
         select 1
         from public.app_account_player_directory_cache d
         where d.player_key=p_player_key
           and upper(trim(coalesce(d.player_country,''))) in ('SE','NO','DK')
       )
    then
      raise exception 'Välj ett befintligt svenskt, norskt eller danskt spelarkort.';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_player_key,2713));

    if exists(
      select 1
      from public.ehockey_discord_player_links
      where user_id=r.user_id
        and status='approved'
        and approved_player_key is distinct from p_player_key
    ) then
      raise exception 'Kontot är redan kopplat till ett annat kort.';
    end if;

    select
      i.provider_id,
      coalesce(i.identity_data->>'global_name',i.identity_data->>'username','Discord')
    into identity_id, identity_name
    from auth.identities i
    where i.user_id=r.user_id
      and i.provider='discord'
    limit 1;

    if identity_id is null then
      raise exception 'Discord-kontot finns inte längre.';
    end if;

    insert into public.ehockey_discord_player_links(
      user_id,
      discord_user_id,
      discord_username,
      requested_player_key,
      status
    )
    values(
      r.user_id,
      identity_id,
      identity_name,
      p_player_key,
      'pending'
    )
    on conflict(user_id) do update set
      requested_player_key=excluded.requested_player_key,
      discord_user_id=excluded.discord_user_id,
      discord_username=excluded.discord_username,
      status='pending',
      updated_at=now();

    perform public.seh_review_discord_player_link(r.user_id,'approved');
  end if;

  update public.ehockey_player_profile_requests
  set status=p_decision,
      player_key=case when p_decision='approved' then p_player_key else null end,
      reviewed_by=auth.uid(),
      reviewed_at=now(),
      updated_at=now(),
      admin_note=left(p_note,1000)
  where id=p_id;

  return jsonb_build_object('id',p_id,'status',p_decision);
end
$function$;
