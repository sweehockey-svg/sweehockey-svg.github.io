-- The public roster loader already selects alias_normalized/canonical_display.
-- RLS was enabled with no SELECT policy, making all aliases invisible to it.
-- Only game-handle aliases live here. Keep RLS and all write restrictions.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='ecl27_player_aliases' and policyname='ecl27_player_aliases_public_read') then
    create policy ecl27_player_aliases_public_read
      on public.ecl27_player_aliases for select to anon, authenticated using (true);
  end if;
end $$;
