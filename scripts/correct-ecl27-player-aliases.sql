-- User-confirmed identities. Keep original events and names as evidence;
-- the shared roster replay resolves them to these current display names.
insert into public.ecl27_player_aliases(alias_normalized,alias_display,canonical_display)
values ('poppen','Poppen','Ztarsailor'),
       ('henk','henk','Zonkji v'),
       ('strandh85','strandh85','casse 33 40')
on conflict(alias_normalized) do update set
  alias_display=excluded.alias_display,
  canonical_display=excluded.canonical_display;
