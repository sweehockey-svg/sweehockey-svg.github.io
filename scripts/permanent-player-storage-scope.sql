create table if not exists private.sportsgamer_storage_scope (
 player_id bigint primary key check(player_id>0),
 is_scandinavian boolean not null,
 has_swedish_tournament boolean not null,
 is_current_scope boolean not null default true,
 verified_at timestamptz not null default now(),
 check (is_scandinavian or has_swedish_tournament)
);
alter table private.sportsgamer_storage_scope enable row level security;
revoke all on private.sportsgamer_storage_scope from public,anon,authenticated;
