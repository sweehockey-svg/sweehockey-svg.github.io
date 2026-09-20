
drop policy if exists "Public read player record highlights" on public.ehockey_player_record_highlights_cache_v1;

create policy "Public read player record highlights"
on public.ehockey_player_record_highlights_cache_v1
for select
to anon, authenticated
using (true);

notify pgrst,'reload schema';
