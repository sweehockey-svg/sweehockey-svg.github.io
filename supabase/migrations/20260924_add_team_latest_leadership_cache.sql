create table if not exists public.app_team_latest_leadership_cache (
  team_id bigint not null,
  player_key text not null,
  display_gamertag text not null,
  player_country text,
  player_image text,
  sports_gamer_player_url text,
  captain_role text not null check (captain_role in ('C', 'A')),
  league_id bigint,
  external_league_id text,
  competition_code text,
  competition_name text,
  season_label text,
  league_name text,
  division text,
  team_name_in_tournament text,
  leadership_date date,
  updated_at timestamptz not null default now(),
  primary key (team_id, player_key)
);

create index if not exists app_team_latest_leadership_cache_team_role_idx
  on public.app_team_latest_leadership_cache (team_id, captain_role);

alter table public.app_team_latest_leadership_cache enable row level security;

drop policy if exists "Public can read latest team leadership"
  on public.app_team_latest_leadership_cache;

create policy "Public can read latest team leadership"
  on public.app_team_latest_leadership_cache
  for select
  to anon, authenticated
  using (true);

grant select on public.app_team_latest_leadership_cache to anon, authenticated;

create or replace function public.refresh_app_team_latest_leadership_cache()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.app_team_latest_leadership_cache;

  insert into public.app_team_latest_leadership_cache (
    team_id,
    player_key,
    display_gamertag,
    player_country,
    player_image,
    sports_gamer_player_url,
    captain_role,
    league_id,
    external_league_id,
    competition_code,
    competition_name,
    season_label,
    league_name,
    division,
    team_name_in_tournament,
    leadership_date,
    updated_at
  )
  with leadership_rows as (
    select
      history.*,
      case
        when upper(btrim(coalesce(history.captain_role, ''))) in ('C', 'CAPTAIN', 'KAPTEN') then 'C'
        when upper(btrim(coalesce(history.captain_role, ''))) in ('A', 'ASSISTANT', 'ALTERNATE', 'ASSISTERANDE') then 'A'
        else null
      end as normalized_role,
      coalesce(
        case when history.chronology_date <= current_date + 366 then history.chronology_date end,
        case when history.display_start_date <= current_date + 366 then history.display_start_date end,
        case when history.end_date <= current_date + 366 then history.end_date end,
        case when history.start_date <= current_date + 366 then history.start_date end,
        case when history.sort_date <= current_date + 366 then history.sort_date end
      ) as effective_date
    from public.ehockey_player_history_cache_v25 history
    where history.team_id is not null
      and nullif(btrim(history.player_key), '') is not null
  ),
  leadership_tournaments as (
    select
      team_id,
      league_id,
      coalesce(nullif(external_league_id, ''), league_id::text) as edition_key,
      max(effective_date) as edition_date
    from leadership_rows
    where normalized_role is not null
    group by team_id, league_id, coalesce(nullif(external_league_id, ''), league_id::text)
  ),
  latest_tournament as (
    select distinct on (team_id)
      team_id,
      league_id,
      edition_key,
      edition_date
    from leadership_tournaments
    order by team_id, edition_date desc nulls last, league_id desc nulls last, edition_key desc
  ),
  chosen_players as (
    select distinct on (row.team_id, row.player_key)
      row.team_id,
      row.player_key,
      coalesce(nullif(btrim(row.display_gamertag), ''), 'Okänd spelare') as display_gamertag,
      row.player_country,
      row.player_image,
      row.sports_gamer_player_url,
      row.normalized_role as captain_role,
      row.league_id,
      row.external_league_id,
      row.competition_code,
      row.competition_name,
      row.season_label,
      row.league_name,
      row.division,
      row.team_name_in_tournament,
      latest.edition_date as leadership_date
    from leadership_rows row
    join latest_tournament latest
      on latest.team_id = row.team_id
     and latest.league_id is not distinct from row.league_id
     and latest.edition_key = coalesce(nullif(row.external_league_id, ''), row.league_id::text)
    where row.normalized_role is not null
    order by
      row.team_id,
      row.player_key,
      case row.normalized_role when 'C' then 0 else 1 end,
      row.effective_date desc nulls last
  )
  select
    team_id,
    player_key,
    display_gamertag,
    player_country,
    player_image,
    sports_gamer_player_url,
    captain_role,
    league_id,
    external_league_id,
    competition_code,
    competition_name,
    season_label,
    league_name,
    division,
    team_name_in_tournament,
    leadership_date,
    now()
  from chosen_players;
end;
$$;

revoke all on function public.refresh_app_team_latest_leadership_cache() from public, anon, authenticated;
grant execute on function public.refresh_app_team_latest_leadership_cache() to service_role;

select public.refresh_app_team_latest_leadership_cache();
