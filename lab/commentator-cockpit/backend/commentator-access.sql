-- Commentator Cockpit · team-scoped approved access gate

create table if not exists public.commentator_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'commentator'
    check (role in ('admin','commentator')),
  team_id uuid references public.teams(id) on delete cascade,
  active boolean not null default true,
  display_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commentator_access_email_normalized_chk
    check (email = lower(btrim(email))),
  constraint commentator_access_role_team_chk
    check (
      (role='admin' and team_id is null)
      or
      (role='commentator' and team_id is not null)
    )
);

create unique index if not exists commentator_access_admin_email_unique
  on public.commentator_access ((lower(email)))
  where role='admin' and team_id is null;

create unique index if not exists commentator_access_team_email_unique
  on public.commentator_access ((lower(email)),team_id)
  where role='commentator' and team_id is not null;

alter table public.commentator_access enable row level security;
revoke all on public.commentator_access from anon;
revoke insert,update,delete on public.commentator_access from authenticated;
grant select on public.commentator_access to authenticated;

drop policy if exists "approved user reads own access" on public.commentator_access;
create policy "approved user reads own access"
on public.commentator_access
for select
to authenticated
using (
  active
  and lower(email)=lower(coalesce((select auth.jwt())->>'email',''))
);

create table if not exists public.commentator_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  target_email text not null,
  action text not null
    check (action in ('create','update','deactivate','reactivate')),
  role text,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.commentator_access_audit enable row level security;
revoke all on public.commentator_access_audit from anon,authenticated;
grant select,insert,update,delete on public.commentator_access_audit to service_role;

drop policy if exists "deny client access to access audit" on public.commentator_access_audit;
create policy "deny client access to access audit"
on public.commentator_access_audit
for all
to anon,authenticated
using (false)
with check (false);

-- Cloud NOTES remain owner-private and require an active approved cockpit account.
-- Team cockpit visibility and server AI authorization are additionally checked
-- against the selected team in the frontend/Edge Function.


create index if not exists commentator_access_team_idx
  on public.commentator_access(team_id)
  where team_id is not null;

create index if not exists commentator_access_audit_team_idx
  on public.commentator_access_audit(team_id)
  where team_id is not null;
