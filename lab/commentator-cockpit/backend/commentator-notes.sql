-- Commentator Cockpit · notes schema
-- One generic table replaces the earlier empty match_notes/player_notes split.
-- UI v12 is local-first; cloud sync is activated only after Auth is wired.

drop table if exists public.match_notes;
drop table if exists public.player_notes;

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
  updated_at timestamptz not null default now(),
  check (
    (scope_type='general' and game_id is null and team_id is null and player_id is null)
    or (scope_type='match' and game_id is not null)
    or (scope_type='team' and team_id is not null)
    or (scope_type='player' and player_id is not null)
  )
);

create index if not exists commentator_notes_owner_idx
  on public.commentator_notes(owner_id,updated_at desc);
create index if not exists commentator_notes_game_idx
  on public.commentator_notes(game_id) where game_id is not null;
create index if not exists commentator_notes_team_idx
  on public.commentator_notes(team_id) where team_id is not null;
create index if not exists commentator_notes_player_idx
  on public.commentator_notes(player_id) where player_id is not null;

alter table public.commentator_notes enable row level security;

revoke all on public.commentator_notes from anon;
grant select,insert,update,delete on public.commentator_notes to authenticated;

drop policy if exists "owner read commentator notes" on public.commentator_notes;
create policy "owner read commentator notes"
on public.commentator_notes for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "owner insert commentator notes" on public.commentator_notes;
create policy "owner insert commentator notes"
on public.commentator_notes for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "owner update commentator notes" on public.commentator_notes;
create policy "owner update commentator notes"
on public.commentator_notes for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "owner delete commentator notes" on public.commentator_notes;
create policy "owner delete commentator notes"
on public.commentator_notes for delete
to authenticated
using ((select auth.uid()) = owner_id);
