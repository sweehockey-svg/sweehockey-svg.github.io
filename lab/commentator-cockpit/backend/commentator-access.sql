-- Commentator Cockpit · approved access gate
create table if not exists public.commentator_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'commentator' check (role in ('admin','commentator')),
  active boolean not null default true,
  display_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists commentator_access_email_unique
  on public.commentator_access ((lower(email)));
alter table public.commentator_access enable row level security;
revoke all on public.commentator_access from anon;
revoke insert,update,delete on public.commentator_access from authenticated;
grant select on public.commentator_access to authenticated;
create policy "approved user reads own access"
on public.commentator_access for select to authenticated
using (active and lower(email)=lower(coalesce(auth.jwt()->>'email','')));

create table if not exists public.commentator_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  target_email text not null,
  action text not null check (action in ('create','update','deactivate','reactivate')),
  role text,
  created_at timestamptz not null default now()
);
alter table public.commentator_access_audit enable row level security;
revoke all on public.commentator_access_audit from anon,authenticated;
grant select,insert,update,delete on public.commentator_access_audit to service_role;

-- commentator_notes owner policies additionally require an active
-- commentator_access row matching the authenticated JWT email.
