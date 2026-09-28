-- Commentator Cockpit · approved access gate

create table if not exists public.commentator_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'commentator'
    check (role in ('admin','commentator')),
  active boolean not null default true,
  display_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commentator_access_email_normalized_chk
    check (email = lower(btrim(email)))
);

create unique index if not exists commentator_access_email_unique
  on public.commentator_access ((lower(email)));

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

-- Cloud NOTES require both ownership and active cockpit approval.

drop policy if exists "owner read commentator notes" on public.commentator_notes;
create policy "owner read commentator notes"
on public.commentator_notes
for select
to authenticated
using (
  (select auth.uid())=owner_id
  and exists (
    select 1
    from public.commentator_access ca
    where ca.active
      and lower(ca.email)=lower(coalesce((select auth.jwt())->>'email',''))
  )
);

drop policy if exists "owner insert commentator notes" on public.commentator_notes;
create policy "owner insert commentator notes"
on public.commentator_notes
for insert
to authenticated
with check (
  (select auth.uid())=owner_id
  and exists (
    select 1
    from public.commentator_access ca
    where ca.active
      and lower(ca.email)=lower(coalesce((select auth.jwt())->>'email',''))
  )
);

drop policy if exists "owner update commentator notes" on public.commentator_notes;
create policy "owner update commentator notes"
on public.commentator_notes
for update
to authenticated
using (
  (select auth.uid())=owner_id
  and exists (
    select 1
    from public.commentator_access ca
    where ca.active
      and lower(ca.email)=lower(coalesce((select auth.jwt())->>'email',''))
  )
)
with check (
  (select auth.uid())=owner_id
  and exists (
    select 1
    from public.commentator_access ca
    where ca.active
      and lower(ca.email)=lower(coalesce((select auth.jwt())->>'email',''))
  )
);

drop policy if exists "owner delete commentator notes" on public.commentator_notes;
create policy "owner delete commentator notes"
on public.commentator_notes
for delete
to authenticated
using (
  (select auth.uid())=owner_id
  and exists (
    select 1
    from public.commentator_access ca
    where ca.active
      and lower(ca.email)=lower(coalesce((select auth.jwt())->>'email',''))
  )
);
