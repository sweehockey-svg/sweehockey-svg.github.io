-- Fantasy account identity follows the same SE/NO/DK account directory
-- as the main Svensk eHockey account system.
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
        'seh_fantasy_get_my_account',
        'seh_fantasy_save_my_team',
        'seh_fantasy_admin_entry_roster',
        'seh_fantasy_admin_state'
      )
  loop
    ddl := pg_get_functiondef(rec.oid);
    ddl := replace(
      ddl,
      'public.app_player_directory_cache',
      'public.app_account_player_directory_cache'
    );
    execute ddl;
  end loop;
end
$$;
