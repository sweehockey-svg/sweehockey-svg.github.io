-- Commentator Cockpit secure cloud-note schema.
-- UI v12 is local-first. Cloud sync is enabled later after Auth is wired.
create table if not exists public.commentator_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('general','match','team','player')),
  game_id uuid references public.games(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  title text not null default '',
  body text not null,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.commentator_notes enable row level security;
revoke all on public.commentator_notes from anon;
grant select,insert,update,delete on public.commentator_notes to authenticated;
