-- PostgreSQL COALESCE, NULLIF and TRIM are SQL syntax/special forms,
-- not schema-qualified pg_catalog functions. The player-image RPCs were
-- created with pg_catalog prefixes and therefore failed at runtime.
do $$
declare
  rec record;
  ddl text;
begin
  for rec in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in (
        'seh_admin_list_player_image_requests',
        'seh_admin_publish_player_image',
        'seh_admin_set_player_image_status',
        'seh_get_my_player_image_requests',
        'seh_submit_player_image_request'
      )
  loop
    ddl := pg_get_functiondef(rec.oid);
    ddl := replace(ddl, 'pg_catalog.coalesce', 'coalesce');
    ddl := replace(ddl, 'pg_catalog.nullif', 'nullif');
    ddl := replace(ddl, 'pg_catalog.trim', 'trim');
    execute ddl;
  end loop;
end
$$;
