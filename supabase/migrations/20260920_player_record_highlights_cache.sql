
create table if not exists public.ehockey_player_record_highlights_cache_v1 (
  player_key text not null,
  competition_code text not null,
  metric_code text not null,
  metric_value numeric not null,
  display_value text not null,
  merit_text text not null,
  sort_priority integer not null default 0,
  refreshed_at timestamptz not null default now(),
  primary key (player_key, competition_code, metric_code)
);

create index if not exists idx_ehockey_player_record_highlights_player
  on public.ehockey_player_record_highlights_cache_v1(player_key);

create or replace function public.refresh_ehockey_player_record_highlights_cache_v1()
returns bigint
language plpgsql
security definer
set search_path=public
set statement_timeout='3min'
as $function$
declare
  inserted_count bigint;
begin
  truncate table public.ehockey_player_record_highlights_cache_v1;

  insert into public.ehockey_player_record_highlights_cache_v1 (
    player_key,competition_code,metric_code,metric_value,display_value,
    merit_text,sort_priority,refreshed_at
  )
  with competitions(competition_code) as (
    values ('ALL'::text),('ECL'::text),('SCL'::text)
  ),
  player_rows as (
    select c.competition_code,p.*
    from competitions c
    cross join lateral public.seh_recordbook_players_v3(c.competition_code,5000) p
  ),
  metric_rows as (
    select competition_code,player_key,'games'::text metric_code,games::numeric metric_value from player_rows
    union all select competition_code,player_key,'points',points::numeric from player_rows
    union all select competition_code,player_key,'goals',goals::numeric from player_rows
    union all select competition_code,player_key,'assists',assists::numeric from player_rows
    union all select competition_code,player_key,'goalie_saves',goalie_saves::numeric from player_rows
    union all select competition_code,player_key,'goalie_wins',goalie_wins::numeric from player_rows
    union all select competition_code,player_key,'goalie_shutouts',goalie_shutouts::numeric from player_rows
    union all select competition_code,player_key,'golds',golds::numeric from player_rows
    union all select competition_code,player_key,'medals',medals::numeric from player_rows
    union all
      select competition_code,player_key,'ecl_seasons',ecl_seasons::numeric
      from player_rows
      where competition_code='ECL'
  ),
  maxima as (
    select competition_code,metric_code,max(metric_value) as record_value
    from metric_rows
    where metric_value>0
    group by competition_code,metric_code
  ),
  winners as (
    select m.*
    from metric_rows m
    join maxima x
      on x.competition_code=m.competition_code
     and x.metric_code=m.metric_code
     and x.record_value=m.metric_value
    where m.metric_value>0
  ),
  formatted as (
    select
      w.*,
      replace(to_char(w.metric_value,'FM999,999,999,990'),',',' ') as display_value,
      case w.metric_code
        when 'games' then 'Flest matcher'
        when 'points' then 'Flest poäng'
        when 'goals' then 'Flest mål'
        when 'assists' then 'Flest assist'
        when 'goalie_saves' then 'Flest målvaktsräddningar'
        when 'goalie_wins' then 'Flest målvaktsvinster'
        when 'goalie_shutouts' then 'Flest nollor'
        when 'golds' then 'Flest guld'
        when 'medals' then 'Flest medaljer'
        when 'ecl_seasons' then 'Flest ECL-säsonger'
        else w.metric_code
      end as label,
      case w.metric_code
        when 'ecl_seasons' then 980
        when 'games' then 920
        when 'points' then 910
        when 'goals' then 900
        when 'assists' then 890
        when 'goalie_saves' then 880
        when 'goalie_wins' then 870
        when 'goalie_shutouts' then 860
        when 'golds' then 850
        when 'medals' then 840
        else 800
      end
      + case w.competition_code when 'ECL' then 200 when 'SCL' then 100 else 0 end
      as sort_priority
    from winners w
  )
  select
    player_key,
    competition_code,
    metric_code,
    metric_value,
    display_value,
    case
      when competition_code='ALL' then
        label || ' av alla svenska spelare i den registrerade historiken · ' || display_value || '.'
      else
        label || ' i ' || competition_code || ' av alla svenska spelare · ' || display_value || '.'
    end,
    sort_priority,
    now()
  from formatted;

  insert into public.ehockey_player_record_highlights_cache_v1 (
    player_key,competition_code,metric_code,metric_value,display_value,
    merit_text,sort_priority,refreshed_at
  )
  with match_rows as (
    select
      'ECL'::text as competition_code,
      player_key,
      fastest_goal_seconds,
      hattricks,
      max_goals_game,
      fastest_goal_match_team,
      fastest_goal_match_opponent,
      fastest_goal_match_team_score,
      fastest_goal_match_opponent_score,
      max_goals_match_team,
      max_goals_match_opponent,
      max_goals_match_team_score,
      max_goals_match_opponent_score
    from public.seh_recordbook_ecl_match_players_v2(3000)
    union all
    select
      'SCL'::text,
      player_key,
      fastest_goal_seconds,
      hattricks,
      max_goals_game,
      fastest_goal_match_team,
      fastest_goal_match_opponent,
      fastest_goal_match_team_score,
      fastest_goal_match_opponent_score,
      max_goals_match_team,
      max_goals_match_opponent,
      max_goals_match_team_score,
      max_goals_match_opponent_score
    from public.seh_recordbook_scl_match_players_v2(2000)
  ),
  records as (
    select
      competition_code,
      min(fastest_goal_seconds) filter (where fastest_goal_seconds>0) as fastest_goal_seconds,
      max(hattricks) as hattricks,
      max(max_goals_game) as max_goals_game
    from match_rows
    group by competition_code
  ),
  winners as (
    select
      r.competition_code,
      r.player_key,
      'fastest_goal_seconds'::text as metric_code,
      r.fastest_goal_seconds::numeric as metric_value,
      r.fastest_goal_match_team as team_name,
      r.fastest_goal_match_opponent as opponent_name,
      r.fastest_goal_match_team_score as team_score,
      r.fastest_goal_match_opponent_score as opponent_score
    from match_rows r
    join records x
      on x.competition_code=r.competition_code
     and x.fastest_goal_seconds=r.fastest_goal_seconds
    where r.fastest_goal_seconds>0

    union all

    select
      r.competition_code,r.player_key,'hattricks',r.hattricks::numeric,
      null,null,null,null
    from match_rows r
    join records x
      on x.competition_code=r.competition_code
     and x.hattricks=r.hattricks
    where r.hattricks>0

    union all

    select
      r.competition_code,r.player_key,'max_goals_game',r.max_goals_game::numeric,
      r.max_goals_match_team,r.max_goals_match_opponent,
      r.max_goals_match_team_score,r.max_goals_match_opponent_score
    from match_rows r
    join records x
      on x.competition_code=r.competition_code
     and x.max_goals_game=r.max_goals_game
    where r.max_goals_game>0
  ),
  formatted as (
    select
      w.*,
      case
        when metric_code='fastest_goal_seconds' then
          floor(metric_value/60)::int::text || ':' ||
          lpad(mod(metric_value::int,60)::text,2,'0')
        else replace(to_char(metric_value,'FM999,999,999,990'),',',' ')
      end as display_value,
      case metric_code
        when 'fastest_goal_seconds' then 1400
        when 'max_goals_game' then 1360
        when 'hattricks' then 1320
        else 1200
      end + case competition_code when 'ECL' then 200 else 100 end as sort_priority
    from winners w
  )
  select
    player_key,
    competition_code,
    metric_code,
    metric_value,
    display_value,
    case metric_code
      when 'fastest_goal_seconds' then
        'Snabbaste målet i ' || competition_code ||
        ' av alla svenska spelare · ' || display_value ||
        case
          when coalesce(team_name,'')<>'' and coalesce(opponent_name,'')<>'' then
            ' · ' || team_name ||
            case when team_score is not null and opponent_score is not null
              then ' ' || team_score::text || '–' || opponent_score::text
              else ' mot'
            end ||
            ' ' || opponent_name
          else ''
        end || '.'
      when 'hattricks' then
        'Flest hattricks i ' || competition_code ||
        ' av alla svenska spelare · ' || display_value || '.'
      when 'max_goals_game' then
        'Flest mål i en ' || competition_code ||
        '-match av alla svenska spelare · ' || display_value ||
        case
          when coalesce(team_name,'')<>'' and coalesce(opponent_name,'')<>'' then
            ' · ' || team_name ||
            case when team_score is not null and opponent_score is not null
              then ' ' || team_score::text || '–' || opponent_score::text
              else ' mot'
            end ||
            ' ' || opponent_name
          else ''
        end || '.'
      else metric_code || ' · ' || display_value || '.'
    end,
    sort_priority,
    now()
  from formatted
  on conflict (player_key,competition_code,metric_code)
  do update set
    metric_value=excluded.metric_value,
    display_value=excluded.display_value,
    merit_text=excluded.merit_text,
    sort_priority=excluded.sort_priority,
    refreshed_at=excluded.refreshed_at;

  get diagnostics inserted_count = row_count;
  analyze public.ehockey_player_record_highlights_cache_v1;
  return (select count(*) from public.ehockey_player_record_highlights_cache_v1);
end;
$function$;

revoke all on public.ehockey_player_record_highlights_cache_v1 from public;
grant select on public.ehockey_player_record_highlights_cache_v1 to anon,authenticated,service_role;
revoke all on function public.refresh_ehockey_player_record_highlights_cache_v1() from public,anon,authenticated;
grant execute on function public.refresh_ehockey_player_record_highlights_cache_v1() to service_role;

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
  $cron$select public.refresh_ehockey_player_record_highlights_cache_v1();$cron$
);

select public.refresh_ehockey_player_record_highlights_cache_v1();
notify pgrst,'reload schema';
