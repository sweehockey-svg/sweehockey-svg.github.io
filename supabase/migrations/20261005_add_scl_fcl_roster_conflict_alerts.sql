create table if not exists public.ehockey_scl_fcl_roster_conflicts (
  sports_gamer_player_id bigint primary key,
  display_gamertag text,
  scl_team_id bigint not null,
  scl_team_name text,
  fcl_team_id bigint not null,
  fcl_team_name text,
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.seh_admin_scl_fcl_conflicts()
returns table(
  sports_gamer_player_id bigint,
  display_gamertag text,
  scl_team_id bigint,
  scl_team_name text,
  fcl_team_id bigint,
  fcl_team_name text,
  detected_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.seh_current_writer_role() is distinct from 'admin' then
    return;
  end if;

  return query
  select
    c.sports_gamer_player_id,
    c.display_gamertag,
    c.scl_team_id,
    c.scl_team_name,
    c.fcl_team_id,
    c.fcl_team_name,
    c.detected_at
  from public.ehockey_scl_fcl_roster_conflicts c
  order by lower(coalesce(c.display_gamertag,'')), c.sports_gamer_player_id;
end;
$$;

revoke all on function public.seh_admin_scl_fcl_conflicts() from public;
grant execute on function public.seh_admin_scl_fcl_conflicts() to authenticated;
