-- Extend the existing public sports-only Broadcast views; preserve columns,
-- approved portrait resolution, ownership and existing read permissions.
do $$
declare view_name text; original text; revised text;
begin
  foreach view_name in array array['v_broadcast_teams_public','v_broadcast_players_public','v_broadcast_playoffs_public'] loop
    original := pg_get_viewdef(format('public.%I',view_name)::regclass,true);
    revised := replace(replace(original,
      '527, 529]', '527, 529, 532]'),
      '529::bigint]', '529::bigint, 532::bigint]');
    if revised=original and position('532' in original)=0 then
      raise exception 'Expected league allowlist missing in %',view_name;
    end if;
    if revised<>original then execute format('create or replace view public.%I as %s',view_name,revised); end if;
  end loop;
end $$;
notify pgrst,'reload schema';
