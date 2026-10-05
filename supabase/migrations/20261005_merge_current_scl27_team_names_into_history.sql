-- Merge the official current SCL 27 names with the existing club identities.
insert into public.ehockey_team_name_aliases
  (alias_name,canonical_team_key,canonical_display_name,notes,updated_at)
values
  ('Macho HC','burchurs-hc','Burchurs HC','Samma lagidentitet som nuvarande SCL 27-laget Burchurs HC',now()),
  ('Burchurs HC','burchurs-hc','Burchurs HC','Nuvarande namn i SCL 27',now()),
  ('INVICTUS AEGIS','invictus-aegis','INVICTUS AEGIS','Nuvarande namn i SCL 27; samma lag som vNexs Vipers',now()),
  ('SSK Academy','ssk-academy-esport','SSK Academy eSport','Samma lagidentitet som nuvarande SCL 27-laget SSK Academy eSport',now()),
  ('SSK Academy eSport','ssk-academy-esport','SSK Academy eSport','Nuvarande namn i SCL 27',now())
on conflict (alias_name) do update
set canonical_team_key=excluded.canonical_team_key,
    canonical_display_name=excluded.canonical_display_name,
    notes=excluded.notes,
    updated_at=now();
