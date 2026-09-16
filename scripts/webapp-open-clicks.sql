create table public.seh_webapp_open_clicks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'iphone_page'),
  created_at timestamptz not null default now()
);
alter table public.seh_webapp_open_clicks enable row level security;
revoke all on public.seh_webapp_open_clicks from public, anon, authenticated;
grant insert (source) on public.seh_webapp_open_clicks to anon, authenticated;
grant select on public.seh_webapp_open_clicks to authenticated;
create policy webapp_click_insert on public.seh_webapp_open_clicks for insert to anon, authenticated with check (source = 'iphone_page');
create policy webapp_click_admin_read on public.seh_webapp_open_clicks for select to authenticated using ((select public.seh_current_writer_role()) = 'admin');
comment on table public.seh_webapp_open_clicks is 'Open web app button clicks on iPhone landing page. Not unique users, installs or launches. No user identifiers.';
