
create table if not exists public.ehockey_player_fun_records_cache_v1 (
  player_key text primary key,
  one_club_games bigint,
  one_club_name text,
  career_span_days integer,
  career_first_date date,
  career_last_date date,
  refreshed_at timestamptz not null default now()
);

alter table public.ehockey_player_fun_records_cache_v1 enable row level security;

drop policy if exists "Public read player fun records" on public.ehockey_player_fun_records_cache_v1;
create policy "Public read player fun records"
on public.ehockey_player_fun_records_cache_v1
for select
to anon, authenticated
using (true);

revoke all on public.ehockey_player_fun_records_cache_v1 from public;
grant select on public.ehockey_player_fun_records_cache_v1 to anon,authenticated,service_role;

create or replace function public.refresh_ehockey_player_fun_records_cache_v1()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='3min'
as $function$
declare
  inserted_count bigint;
begin
  truncate table public.ehockey_player_fun_records_cache_v1;

  insert into public.ehockey_player_fun_records_cache_v1 (
    player_key,
    one_club_games,
    one_club_name,
    career_span_days,
    career_first_date,
    career_last_date,
    refreshed_at
  )
  with swedish as (
    select player_key
    from public.app_player_directory_cache
  ),
  played as (
    select
      h.*,
      greatest(
        coalesce(h.appearance_games,0),
        coalesce(h.total_skater_games,0)+coalesce(h.total_goalie_games,0)
      )::bigint as games_in_row,
      coalesce(h.chronology_date,h.sort_date,h.start_date) as played_date
    from public.ehockey_player_history_cache_v25 h
    join swedish s using(player_key)
    where greatest(
      coalesce(h.appearance_games,0),
      coalesce(h.total_skater_games,0)+coalesce(h.total_goalie_games,0)
    ) > 0
  ),
  club_games as (
    select
      p.player_key,
      coalesce(
        nullif(lower(trim(p.team_current_name)),''),
        nullif(p.team_id::text,''),
        nullif(lower(trim(p.team_name_in_tournament)),'')
      ) as club_key,
      max(
        coalesce(
          nullif(trim(p.team_current_name),''),
          nullif(trim(p.team_name_in_tournament),''),
          'Okänt lag'
        )
      ) as club_name,
      sum(p.games_in_row)::bigint as games
    from played p
    group by p.player_key,2
  ),
  best_club as (
    select
      c.*,
      row_number() over(
        partition by c.player_key
        order by c.games desc,c.club_name asc
      ) as rn
    from club_games c
    where c.club_key is not null
  ),
  career as (
    select
      p.player_key,
      min(p.played_date) filter (where p.played_date<=current_date) as first_date,
      max(p.played_date) filter (where p.played_date<=current_date) as last_date
    from played p
    group by p.player_key
  )
  select
    s.player_key,
    b.games,
    b.club_name,
    case
      when c.first_date is not null and c.last_date is not null
      then (c.last_date-c.first_date)::int
      else null
    end,
    c.first_date,
    c.last_date,
    now()
  from swedish s
  left join best_club b
    on b.player_key=s.player_key
   and b.rn=1
  left join career c
    on c.player_key=s.player_key
  where b.games is not null
     or (c.first_date is not null and c.last_date is not null);

  get diagnostics inserted_count = row_count;
  analyze public.ehockey_player_fun_records_cache_v1;
  return inserted_count;
end;
$function$;

revoke all on function public.refresh_ehockey_player_fun_records_cache_v1() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_player_fun_records_cache_v1() to service_role;

drop function if exists public.seh_recordbook_fun_players_v1(integer);
create function public.seh_recordbook_fun_players_v1(p_limit integer default 2000)
returns table(
  player_key text,
  display_gamertag text,
  player_image text,
  sports_gamer_player_url text,
  primary_position text,
  games bigint,
  one_club_games bigint,
  one_club_name text,
  career_span_days integer,
  career_first_date date,
  career_last_date date
)
language sql
stable
security definer
set search_path=public
as $function$
  with career as (
    select *
    from public.seh_recordbook_players_v3('ALL',5000)
  )
  select
    f.player_key,
    d.display_gamertag,
    d.player_image,
    d.sports_gamer_player_url,
    d.primary_position,
    coalesce(c.games,0)::bigint,
    f.one_club_games,
    f.one_club_name,
    f.career_span_days,
    f.career_first_date,
    f.career_last_date
  from public.ehockey_player_fun_records_cache_v1 f
  join public.app_player_directory_cache d using(player_key)
  left join career c using(player_key)
  order by greatest(coalesce(f.one_club_games,0),coalesce(f.career_span_days,0)) desc
  limit greatest(1,least(coalesce(p_limit,2000),5000));
$function$;

grant execute on function public.seh_recordbook_fun_players_v1(integer) to anon,authenticated,service_role;

create or replace function public.refresh_ehockey_player_record_highlights_v2()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='4min'
as $function$
declare
  result_count bigint;
begin
  perform public.refresh_ehockey_player_fun_records_cache_v1();
  perform public.refresh_ehockey_player_record_highlights_cache_v1();

  insert into public.ehockey_player_record_highlights_cache_v1 (
    player_key,competition_code,metric_code,metric_value,display_value,
    merit_text,sort_priority,refreshed_at
  )
  with players as (
    select *
    from public.seh_recordbook_players_v3('ALL',5000)
  ),
  metric_rows as (
    select player_key,'playoff_games'::text metric_code,playoff_games::numeric metric_value from players
    union all
    select player_key,'playoff_points',playoff_points::numeric from players
    union all
    select player_key,'tournament_count',tournament_count::numeric from players
    union all
    select player_key,'club_count',club_count::numeric from players
  ),
  maxima as (
    select metric_code,max(metric_value) as record_value
    from metric_rows
    where metric_value>0
    group by metric_code
  ),
  winners as (
    select m.*
    from metric_rows m
    join maxima x using(metric_code)
    where m.metric_value=x.record_value
      and m.metric_value>0
  )
  select
    w.player_key,
    'ALL',
    w.metric_code,
    w.metric_value,
    replace(to_char(w.metric_value,'FM999,999,999,990'),',',' '),
    case w.metric_code
      when 'playoff_games' then
        'Mr. Playoffs · flest slutspelsmatcher av alla svenska spelare · ' ||
        replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ') || '.'
      when 'playoff_points' then
        'Playoff-kungen · flest slutspelspoäng av alla svenska spelare · ' ||
        replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ') || '.'
      when 'tournament_count' then
        'Turneringsräven · flest registrerade turneringar av alla svenska spelare · ' ||
        replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ') || '.'
      when 'club_count' then
        'Globetrottern · flest olika klubbar representerade av alla svenska spelare · ' ||
        replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ') || '.'
      else w.metric_code || ' · ' || w.metric_value::text || '.'
    end,
    case w.metric_code
      when 'playoff_games' then 1280
      when 'playoff_points' then 1270
      when 'tournament_count' then 1260
      when 'club_count' then 1250
      else 1200
    end,
    now()
  from winners w
  on conflict (player_key,competition_code,metric_code)
  do update set
    metric_value=excluded.metric_value,
    display_value=excluded.display_value,
    merit_text=excluded.merit_text,
    sort_priority=excluded.sort_priority,
    refreshed_at=excluded.refreshed_at;

  insert into public.ehockey_player_record_highlights_cache_v1 (
    player_key,competition_code,metric_code,metric_value,display_value,
    merit_text,sort_priority,refreshed_at
  )
  with fun as (
    select *
    from public.ehockey_player_fun_records_cache_v1
  ),
  maxes as (
    select
      max(one_club_games) as max_one_club_games,
      max(career_span_days) as max_career_span_days
    from fun
  ),
  winners as (
    select
      f.player_key,
      'one_club_games'::text metric_code,
      f.one_club_games::numeric metric_value,
      f.one_club_name,
      f.career_first_date,
      f.career_last_date,
      f.career_span_days
    from fun f,maxes m
    where f.one_club_games=m.max_one_club_games
      and f.one_club_games>0

    union all

    select
      f.player_key,
      'career_span_days',
      f.career_span_days::numeric,
      null,
      f.career_first_date,
      f.career_last_date,
      f.career_span_days
    from fun f,maxes m
    where f.career_span_days=m.max_career_span_days
      and f.career_span_days>0
  )
  select
    w.player_key,
    'ALL',
    w.metric_code,
    w.metric_value,
    case
      when w.metric_code='one_club_games' then
        replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ')
      else
        case
          when floor(w.metric_value/365.2425)>=1 then
            floor(w.metric_value/365.2425)::int::text || ' år'
          else
            round(w.metric_value/30.4375)::int::text || ' mån'
        end
    end,
    case
      when w.metric_code='one_club_games' then
        'One-club man · flest matcher för ett och samma lag av alla svenska spelare · ' ||
        replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ') ||
        ' matcher för ' || coalesce(w.one_club_name,'okänt lag') || '.'
      else
        'Längsta registrerade karriären av alla svenska spelare · ' ||
        extract(year from age(w.career_last_date,w.career_first_date))::int::text || ' år' ||
        case
          when extract(month from age(w.career_last_date,w.career_first_date))::int>0
          then ' ' || extract(month from age(w.career_last_date,w.career_first_date))::int::text || ' mån'
          else ''
        end ||
        ' · ' || to_char(w.career_first_date,'YYYY-MM-DD') ||
        '–' || to_char(w.career_last_date,'YYYY-MM-DD') || '.'
    end,
    case w.metric_code
      when 'one_club_games' then 1240
      when 'career_span_days' then 1230
      else 1200
    end,
    now()
  from winners w
  on conflict (player_key,competition_code,metric_code)
  do update set
    metric_value=excluded.metric_value,
    display_value=excluded.display_value,
    merit_text=excluded.merit_text,
    sort_priority=excluded.sort_priority,
    refreshed_at=excluded.refreshed_at;

  analyze public.ehockey_player_record_highlights_cache_v1;
  select count(*) into result_count
  from public.ehockey_player_record_highlights_cache_v1;
  return result_count;
end;
$function$;

revoke all on function public.refresh_ehockey_player_record_highlights_v2() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_player_record_highlights_v2() to service_role;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='refresh-player-record-highlights'
  limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'refresh-player-record-highlights',
  '17 */6 * * *',
  $cron$select public.refresh_ehockey_player_record_highlights_v2();$cron$
);

select public.refresh_ehockey_player_record_highlights_v2();

notify pgrst,'reload schema';
