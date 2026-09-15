create table public.seh_app_download_clicks (
 id uuid primary key default gen_random_uuid(),
 version text not null check (version = '5.30'),
 created_at timestamptz not null default now()
);
alter table public.seh_app_download_clicks enable row level security;
revoke all on public.seh_app_download_clicks from public, anon, authenticated;
grant insert (version) on public.seh_app_download_clicks to anon, authenticated;
grant select on public.seh_app_download_clicks to authenticated;
create policy download_click_insert on public.seh_app_download_clicks for insert to anon, authenticated with check (version = '5.30');
create policy download_click_admin_read on public.seh_app_download_clicks for select to authenticated using ((select public.seh_current_writer_role()) = 'admin');
create index seh_app_download_clicks_created_at_idx on public.seh_app_download_clicks (created_at);
comment on table public.seh_app_download_clicks is 'APK download-button clicks starting at deployment; not installs. No user identifiers. Direct APK links bypass counting.';
