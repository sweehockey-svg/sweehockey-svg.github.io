
do $do$
declare
  r record;
  ddl text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in (
        'seh_admin_list_player_image_requests',
        'seh_discord_free_player_card_v1',
        'seh_discord_submit_free_agent_request_v1',
        'seh_discord_submit_free_agent_request_v2',
        'seh_notify_free_agent_request_status',
        'seh_notify_profile_request_status',
        'seh_queue_admin_from_fa_request',
        'seh_queue_admin_from_link_request',
        'seh_queue_admin_from_profile_request'
      )
      and p.prosrc ilike '%app_player_directory_cache%'
  loop
    ddl := pg_get_functiondef(r.oid);
    ddl := replace(
      ddl,
      'public.app_player_directory_cache',
      'public.app_account_player_directory_cache'
    );
    execute ddl;
  end loop;
end
$do$;
