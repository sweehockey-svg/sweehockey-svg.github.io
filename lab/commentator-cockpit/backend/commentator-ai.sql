-- Commentator Cockpit · AI request audit/rate-limit log
create table if not exists public.commentator_ai_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  model text not null,
  mode text not null default 'talking_points',
  status text not null,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists commentator_ai_requests_owner_time_idx
  on public.commentator_ai_requests(owner_id,created_at desc);
create index if not exists commentator_ai_requests_game_idx
  on public.commentator_ai_requests(game_id)
  where game_id is not null;

alter table public.commentator_ai_requests enable row level security;

revoke all on public.commentator_ai_requests from anon, authenticated;
grant select,insert,update,delete on public.commentator_ai_requests to service_role;

drop policy if exists "deny client access to ai request log" on public.commentator_ai_requests;
create policy "deny client access to ai request log"
on public.commentator_ai_requests
for all
to anon, authenticated
using (false)
with check (false);
