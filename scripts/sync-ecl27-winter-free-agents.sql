-- A source-managed entry is identifiable by this exact message and no owner.
-- This feed never replaces a player/admin-created listing.
with input as (
  select :'winter_snapshot'::jsonb as winter, :'free_agent_snapshot'::jsonb as fa
), verified_input as (
  select * from input
  where winter->>'leagueId' = '535' and fa->>'leagueId' = '534' and fa->>'teamId' = '6981'
    and jsonb_array_length(winter->'teams') > 0 and jsonb_array_length(fa->'players') > 0
), source_players as (
  select distinct (p->>'id')::bigint as id
  from verified_input cross join lateral jsonb_array_elements(fa->'players') as players(p)
  where (p->>'swedish')::boolean
), registered as (
  select distinct (p->>'id')::bigint as id
  from verified_input cross join lateral jsonb_array_elements(winter->'teams') as teams(t)
  cross join lateral jsonb_array_elements(t->'players') as players(p)
), marker as (
  select 'Listad som Free Agent hos SportsGamer för ECL ’27: Winter.'::text as message
), eligible as (
  select distinct on (d.player_key) d.player_key, r.display_gamertag
  from source_players s
  join public.v_ehockey_player_registry r on r.sports_gamer_player_id = s.id and r.status = 'active'
  join public.app_player_directory_cache d
    on rtrim(d.sports_gamer_player_url,'/') = 'https://sportsgamer.gg/players/' || s.id
  left join registered t on t.id = s.id
  left join lateral (
    select e.event_type
    from public.v_ecl27_events_resolved e
    where e.subject_key = 'SG:' || s.id
       or public.normalize_ehockey_name(e.display_gamertag) = public.normalize_ehockey_name(r.display_gamertag)
    order by e.occurred_at desc, e.id desc limit 1
  ) movement on true
  where t.id is null and movement.event_type is distinct from 'in'
    and upper(coalesce(r.country_code,'')) in ('SE','SWE')
  order by d.player_key, s.id
), published as (
  insert into public.ehockey_free_agents as existing
    (player_key,manual_gamertag,message,is_active,fa_date)
  select e.player_key,e.display_gamertag,m.message,true,(now() at time zone 'Europe/Stockholm')::date
  from eligible e cross join marker m
  where not exists (
    select from public.ehockey_free_agents f
    where f.player_key is distinct from e.player_key
      and public.normalize_ehockey_name(f.manual_gamertag) = public.normalize_ehockey_name(e.display_gamertag)
  )
  on conflict (player_key) do update set is_active=true,expires_at=null,
    fa_date=excluded.fa_date,manual_gamertag=excluded.manual_gamertag
  where existing.created_by is null and existing.message=excluded.message and not existing.is_active
  returning manual_gamertag
), unpublished as (
  update public.ehockey_free_agents f set is_active=false
  from marker m where f.created_by is null and f.message=m.message and f.is_active
    and exists (select from verified_input)
    and not exists (select from eligible e where e.player_key=f.player_key)
  returning f.manual_gamertag
)
select (select count(*) from source_players) as swedish_in_source,
       (select count(*) from eligible) as eligible,
       (select array_agg(manual_gamertag order by manual_gamertag) from published) as published,
       (select array_agg(manual_gamertag order by manual_gamertag) from unpublished) as unpublished;
