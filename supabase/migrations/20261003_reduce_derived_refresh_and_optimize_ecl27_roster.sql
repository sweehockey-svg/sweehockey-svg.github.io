-- Disable timer-driven derived player refreshes and optimize the ECL 27 roster view.
--
-- The heavy derived player data is refreshed by the manual SportsGamer sync
-- workflows when source data actually changes. Running it every six hours only
-- burns Disk IO against unchanged source data.

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname='refresh-ehockey-personal-merits-6h'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(job_id := v_jobid, active := false);
  end if;

  select jobid into v_jobid
  from cron.job
  where jobname='refresh-player-record-highlights'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(job_id := v_jobid, active := false);
  end if;
end
$$;

-- Resolve directory identities once per request. The previous view performed a
-- lateral OR scan of app_player_directory_cache for hundreds of baseline/event
-- rows, making a ~232-row roster query take several seconds.
create or replace view public.v_ecl27_current_roster_v1 as
with recursive
directory_base as materialized (
  select
    p.player_key,
    p.display_gamertag,
    p.career_games,
    lower(p.display_gamertag) as gamertag_key,
    substring(p.sports_gamer_player_url from '/players/([0-9]+)') as sg_id
  from public.app_player_directory_cache p
),
directory_gt as (
  select distinct on (gamertag_key)
    gamertag_key,
    player_key,
    display_gamertag
  from directory_base
  where nullif(gamertag_key,'') is not null
  order by gamertag_key, career_games desc nulls last, display_gamertag
),
directory_sg as (
  select distinct on (sg_id)
    sg_id,
    player_key,
    display_gamertag
  from directory_base
  where sg_id is not null
  order by sg_id, career_games desc nulls last, display_gamertag
),
baseline_raw as (
  select
    b.team_project_id,
    b.team_name,
    b.division,
    b.source_team_id,
    b.player_key,
    b.gamertag,
    b.sports_gamer_player_url,
    b.player_image,
    b.primary_position,
    coalesce(
      nullif(b.player_key,''),
      case
        when b.sports_gamer_player_url ~ '/players/[0-9]+'
          then 'SG:' || (regexp_match(b.sports_gamer_player_url,'/players/([0-9]+)'))[1]
        else null
      end,
      'GT:' || lower(b.gamertag)
    ) as raw_subject_key
  from public.v_ecl27_spring_baseline b
  where b.team_project_id is not null
    and nullif(b.gamertag,'') is not null
),
baseline as (
  select distinct on (x.identity_key)
    x.identity_key,
    x.raw_subject_key,
    x.gamertag,
    x.team_project_id
  from (
    select
      coalesce(dx.player_key, ds.player_key, dg.player_key, br.raw_subject_key) as identity_key,
      br.raw_subject_key,
      br.gamertag,
      br.team_project_id
    from baseline_raw br
    left join directory_base dx
      on dx.player_key=br.raw_subject_key
    left join directory_sg ds
      on br.raw_subject_key ~ '^SG:[0-9]+$'
     and ds.sg_id=substring(br.raw_subject_key from 4)
    left join directory_gt dg
      on dg.gamertag_key=lower(br.gamertag)
  ) x
  order by x.identity_key, x.team_project_id
),
events_normalized as (
  select
    coalesce(
      dx.player_key,
      ds.player_key,
      dg.player_key,
      e.subject_key,
      'GT:' || lower(coalesce(e.display_gamertag,e.source_gamertag,''))
    ) as identity_key,
    e.id,
    e.occurred_at,
    lower(coalesce(e.event_type,'')) as event_type,
    e.team_project_id,
    e.display_gamertag,
    e.source_gamertag
  from public.v_ecl27_events_resolved e
  left join directory_base dx
    on dx.player_key=e.subject_key
  left join directory_sg ds
    on e.subject_key ~ '^SG:[0-9]+$'
   and ds.sg_id=substring(e.subject_key from 4)
  left join directory_gt dg
    on dg.gamertag_key=lower(coalesce(e.display_gamertag,e.source_gamertag,''))
  where nullif(coalesce(e.subject_key,e.display_gamertag,e.source_gamertag),'') is not null
),
subjects as (
  select identity_key from baseline
  union
  select identity_key from events_normalized
),
ordered as (
  select
    e.identity_key,
    row_number() over (
      partition by e.identity_key
      order by e.occurred_at,e.id
    ) as rn,
    e.id,
    e.occurred_at,
    e.event_type,
    e.team_project_id,
    e.display_gamertag,
    e.source_gamertag
  from events_normalized e
),
state as (
  select
    s.identity_key,
    0::bigint as rn,
    b.team_project_id as current_team_project_id,
    null::bigint as last_event_id,
    null::timestamptz as last_event_at,
    b.gamertag as display_gamertag
  from subjects s
  left join baseline b using(identity_key)

  union all

  select
    st.identity_key,
    o.rn,
    case
      when o.event_type='in' then o.team_project_id
      when o.event_type='free_agent' then null::bigint
      when o.event_type='out' and st.current_team_project_id=o.team_project_id then null::bigint
      else st.current_team_project_id
    end as current_team_project_id,
    o.id,
    o.occurred_at,
    coalesce(
      nullif(o.display_gamertag,''),
      nullif(o.source_gamertag,''),
      st.display_gamertag
    )
  from state st
  join ordered o
    on o.identity_key=st.identity_key
   and o.rn=st.rn+1
),
final as (
  select distinct on (identity_key)
    identity_key,
    current_team_project_id,
    last_event_id,
    last_event_at,
    display_gamertag,
    rn
  from state
  order by identity_key, rn desc
)
select
  f.identity_key as subject_key,
  coalesce(dx.player_key,ds.player_key,dg.player_key) as player_key,
  coalesce(
    dx.display_gamertag,
    ds.display_gamertag,
    dg.display_gamertag,
    f.display_gamertag
  ) as display_gamertag,
  t.id as team_project_id,
  t.name as team_name,
  t.division,
  t.source_team_id as team_id,
  t.logo_name,
  f.last_event_id,
  f.last_event_at,
  case
    when f.rn=0 then 'spring_baseline'::text
    else 'event_replay'::text
  end as roster_source
from final f
join public.v_ecl27_team_builds_public t
  on t.id=f.current_team_project_id
left join directory_base dx
  on dx.player_key=f.identity_key
left join directory_sg ds
  on f.identity_key ~ '^SG:[0-9]+$'
 and ds.sg_id=substring(f.identity_key from 4)
left join directory_gt dg
  on dg.gamertag_key=lower(f.display_gamertag);
