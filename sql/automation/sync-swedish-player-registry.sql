/*
  EFTER NY SPORTSGAMER-CSV – UPPDATERA MASTERREGISTER
  ====================================================

  Kör hela filen mot Supabase/PostgreSQL som postgres efter CSV-importen.

  Prioritet för slutlig nationalitet:
    1. Låst manuellt beslut.
    2. SportsGamer-fältet nationality.
    3. SportsGamer-fältet country.
    4. Övriga källor, om alla är överens.
    5. Annars konflikt eller okänd.

  Födelsedatum, stad, personnamn och sociala konton ingår inte.
  Nuvarande webbplatsvyer ändras inte.
*/

begin;

set local statement_timeout = '10min';

/*
  Sakerhetsvakt: staging far inte vara tom och varje rad maste ha SE i minst
  ett av SportsGamer-falten. Fel CSV avbryter hela transaktionen med 1/0.
*/
select 1 / case
  when count(*) > 0
   and count(*) filter (
     where coalesce(
       case
         when upper(btrim(nationality)) in
           ('SE', 'SWE', 'SWEDEN', 'SVERIGE', 'SWEDISH', 'SVENSK')
           then 'SE'
         else public.ehockey_normalize_country_code(nationality)
       end,
       case
         when upper(btrim(country)) in
           ('SE', 'SWE', 'SWEDEN', 'SVERIGE', 'SWEDISH', 'SVENSK')
           then 'SE'
         else public.ehockey_normalize_country_code(country)
       end
     ) = 'SE'
   ) = count(*)
  then 1 else 0
end as safety_check_must_equal_1
from private.sportsgamer_player_master_import;

/* Kom ihag exakt vilka profiler som saknades fore synkningen. */
drop table if exists pg_temp.new_swedish_sg_profiles;

create temporary table pg_temp.new_swedish_sg_profiles
on commit preserve rows
as
select
  source.player_id,
  source.user_id,
  source.display_gamertag,
  source.nationality,
  source.country
from private.sportsgamer_player_master_import source
left join public.ehockey_players existing
  on existing.canonical_key = 'SG:' || source.player_id::text
where existing.id is null;

/* Resultat fore synk: visar hur manga profiler som verkligen ar nya. */
select
  count(*)::bigint as imported_swedish_profiles,
  count(*) filter (
    where existing.id is null
  )::bigint as new_profiles_to_create,
  count(*) filter (
    where existing.id is not null
  )::bigint as existing_profiles_to_update
from private.sportsgamer_player_master_import source
left join public.ehockey_players existing
  on existing.canonical_key = 'SG:' || source.player_id::text;


/* 1. En central spelare per SportsGamer playerID */
insert into public.ehockey_players (
  canonical_key,
  display_gamertag,
  normalized_gamertag,
  status,
  created_at,
  updated_at
)
select
  'SG:' || source.player_id::text,
  coalesce(
    nullif(btrim(source.display_gamertag), ''),
    'SportsGamer #' || source.player_id::text
  ),
  public.normalize_ehockey_name(
    coalesce(
      nullif(btrim(source.display_gamertag), ''),
      'SportsGamer #' || source.player_id::text
    )
  ),
  'active',
  now(),
  now()
from private.sportsgamer_player_master_import source
on conflict (canonical_key)
do update set
  display_gamertag = excluded.display_gamertag,
  normalized_gamertag = excluded.normalized_gamertag,
  status = case
    when public.ehockey_players.status = 'unresolved' then 'active'
    else public.ehockey_players.status
  end,
  updated_at = now()
where public.ehockey_players.status <> 'merged';


/* 2. SportsGamer-identiteten och säker profilmetadata */
insert into public.ehockey_player_identities (
  player_id,
  identity_key,
  source_code,
  external_player_id,
  external_user_id,
  gamertag,
  normalized_gamertag,
  mapping_method,
  confidence,
  is_primary,
  metadata,
  first_seen_at,
  last_seen_at,
  created_at,
  updated_at
)
select
  player.id,
  'SPORTSGAMER:' || source.player_id::text,
  'SPORTSGAMER',
  source.player_id::text,
  case
    when btrim(source.user_id) ~ '^[1-9][0-9]*$'
      then btrim(source.user_id)
    else null
  end,
  coalesce(
    nullif(btrim(source.display_gamertag), ''),
    'SportsGamer #' || source.player_id::text
  ),
  public.normalize_ehockey_name(
    coalesce(
      nullif(btrim(source.display_gamertag), ''),
      'SportsGamer #' || source.player_id::text
    )
  ),
  'imported',
  1.000,
  true,
  jsonb_strip_nulls(
    jsonb_build_object(
      'gamertag',
        nullif(nullif(btrim(source.gamertag), ''), E'\\N'),
      'psn_tag',
        nullif(nullif(btrim(source.psn_tag), ''), E'\\N'),
      'ea_id',
        nullif(nullif(btrim(source.ea_id), ''), E'\\N'),
      'player_image',
        nullif(nullif(btrim(source.player_image), ''), E'\\N'),
      'preferred_position_id', source.preferred_position_id,
      'master_imported_at', source.imported_at
    )
  ),
  source.imported_at,
  source.imported_at,
  now(),
  now()
from private.sportsgamer_player_master_import source
join public.ehockey_players player
  on player.canonical_key = 'SG:' || source.player_id::text
on conflict (identity_key)
do update set
  player_id = excluded.player_id,
  external_user_id = excluded.external_user_id,
  gamertag = excluded.gamertag,
  normalized_gamertag = excluded.normalized_gamertag,
  mapping_method = excluded.mapping_method,
  confidence = excluded.confidence,
  is_primary = true,
  metadata =
    coalesce(public.ehockey_player_identities.metadata, '{}'::jsonb)
    || excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();


/*
  3. Ersätt bara masterimportens egna bevis.
     Stabila evidence_key-värden gör att en ändrad eller borttagen uppgift inte
     lämnar kvar ett gammalt land från föregående import.
*/
delete from public.ehockey_player_nationality_evidence evidence
using private.sportsgamer_player_master_import source
where evidence.evidence_key =
  'SPORTSGAMER_MASTER_NATIONALITY:' || source.player_id::text;

delete from public.ehockey_player_nationality_evidence evidence
using private.sportsgamer_player_master_import source
where evidence.evidence_key =
  'SPORTSGAMER_MASTER_COUNTRY:' || source.player_id::text;

insert into public.ehockey_player_nationality_evidence (
  player_id,
  evidence_key,
  source_code,
  source_identity_key,
  evidence_type,
  raw_value,
  country_code,
  confidence,
  is_manual,
  is_locked,
  reason,
  metadata,
  observed_at,
  created_at,
  updated_at
)
select
  player.id,
  'SPORTSGAMER_MASTER_NATIONALITY:' || source.player_id::text,
  'SPORTSGAMER_MASTER',
  'SPORTSGAMER:' || source.player_id::text,
  'nationality',
  source.nationality,
  case
    when upper(btrim(source.nationality)) in (
      'SK', 'SVK', 'SLOVAK', 'SLOVAKIA', 'SLOVENSKO'
    ) then 'SK'
    else public.ehockey_normalize_country_code(source.nationality)
  end,
  0.980,
  false,
  false,
  'SportsGamer-profilens uttryckliga nationality-fält',
  jsonb_build_object('sports_gamer_player_id', source.player_id),
  source.imported_at,
  now(),
  now()
from private.sportsgamer_player_master_import source
join public.ehockey_players player
  on player.canonical_key = 'SG:' || source.player_id::text
where case
  when upper(btrim(source.nationality)) in (
    'SK', 'SVK', 'SLOVAK', 'SLOVAKIA', 'SLOVENSKO'
  ) then 'SK'
  else public.ehockey_normalize_country_code(source.nationality)
end is not null;

insert into public.ehockey_player_nationality_evidence (
  player_id,
  evidence_key,
  source_code,
  source_identity_key,
  evidence_type,
  raw_value,
  country_code,
  confidence,
  is_manual,
  is_locked,
  reason,
  metadata,
  observed_at,
  created_at,
  updated_at
)
select
  player.id,
  'SPORTSGAMER_MASTER_COUNTRY:' || source.player_id::text,
  'SPORTSGAMER_MASTER',
  'SPORTSGAMER:' || source.player_id::text,
  'country',
  source.country,
  public.ehockey_normalize_country_code(source.country),
  0.900,
  false,
  false,
  'SportsGamer-profilens country-fält',
  jsonb_build_object('sports_gamer_player_id', source.player_id),
  source.imported_at,
  now(),
  now()
from private.sportsgamer_player_master_import source
join public.ehockey_players player
  on player.canonical_key = 'SG:' || source.player_id::text
where public.ehockey_normalize_country_code(source.country) is not null;


/* 4. Centralt nationalitetsbeslut */
with evidence_summary as (
    select
      player.id as player_id,
      count(evidence.id)::integer as evidence_count,
      count(distinct evidence.country_code)
        filter (where evidence.country_code is not null)
        as all_country_count,
      min(evidence.country_code)
        filter (where evidence.country_code is not null)
        as unanimous_country,
      max(evidence.confidence)
        filter (where evidence.country_code is not null)
        as maximum_confidence,
      string_agg(
        distinct evidence.source_code,
        ', ' order by evidence.source_code
      ) filter (where evidence.country_code is not null)
        as evidence_sources
    from public.ehockey_players player
    left join public.ehockey_player_nationality_evidence evidence
      on evidence.player_id = player.id
    group by player.id
  ),
  locked_decision as (
    select distinct on (evidence.player_id)
      evidence.player_id,
      evidence.country_code,
      evidence.source_code,
      evidence.confidence,
      evidence.reason
    from public.ehockey_player_nationality_evidence evidence
    where evidence.is_locked
      and evidence.country_code is not null
    order by
      evidence.player_id,
      evidence.confidence desc,
      evidence.updated_at desc,
      evidence.id desc
  ),
  master_nationality as (
    select
      evidence.player_id,
      count(distinct evidence.country_code) as country_count,
      min(evidence.country_code) as country_code,
      max(evidence.confidence) as confidence
    from public.ehockey_player_nationality_evidence evidence
    where evidence.source_code = 'SPORTSGAMER_MASTER'
      and evidence.evidence_type = 'nationality'
      and evidence.country_code is not null
    group by evidence.player_id
  ),
  master_country as (
    select
      evidence.player_id,
      count(distinct evidence.country_code) as country_count,
      min(evidence.country_code) as country_code,
      max(evidence.confidence) as confidence
    from public.ehockey_player_nationality_evidence evidence
    where evidence.source_code = 'SPORTSGAMER_MASTER'
      and evidence.evidence_type = 'country'
      and evidence.country_code is not null
    group by evidence.player_id
  ),
  resolved as (
    select
      summary.player_id,
      case
        when locked.player_id is not null then locked.country_code
        when master_nationality.country_count = 1
          then master_nationality.country_code
        when master_nationality.country_count > 1 then null
        when master_country.country_count = 1 then master_country.country_code
        when master_country.country_count > 1 then null
        when summary.all_country_count = 1 then summary.unanimous_country
        else null
      end as country_code,
      case
        when locked.player_id is not null then 'manual'
        when master_nationality.country_count > 1 then 'conflict'
        when master_nationality.country_count = 1 then 'automatic'
        when master_country.country_count > 1 then 'conflict'
        when master_country.country_count = 1 then 'automatic'
        when summary.all_country_count = 1 then 'automatic'
        when summary.all_country_count > 1 then 'conflict'
        else 'unknown'
      end as decision_status,
      case
        when locked.player_id is not null then locked.source_code
        when master_nationality.country_count is not null
          then 'SPORTSGAMER_MASTER.nationality'
        when master_country.country_count is not null
          then 'SPORTSGAMER_MASTER.country'
        when summary.all_country_count = 1 then summary.evidence_sources
        else null
      end as decision_source,
      case
        when locked.player_id is not null then locked.confidence
        when master_nationality.country_count = 1
          then master_nationality.confidence
        when master_country.country_count = 1 then master_country.confidence
        when summary.all_country_count = 1 then summary.maximum_confidence
        else null
      end as confidence,
      (locked.player_id is not null) as is_locked,
      summary.evidence_count,
      case
        when locked.player_id is not null then locked.reason
        when master_nationality.country_count = 1
          then 'SportsGamer nationality styr; manuellt låst beslut har alltid företräde'
        when master_nationality.country_count > 1
          then 'Flera SportsGamer nationality-värden kräver manuell granskning'
        when master_country.country_count = 1
          then 'SportsGamer country styr när nationality saknas'
        when master_country.country_count > 1
          then 'Flera SportsGamer country-värden kräver manuell granskning'
        when summary.all_country_count = 1
          then 'Övriga normaliserade källbevis är överens'
        when summary.all_country_count > 1
          then 'Övriga källor anger olika länder; manuell granskning krävs'
        else 'Inget användbart nationalitetsbevis'
      end as reason
    from evidence_summary summary
    left join locked_decision locked
      on locked.player_id = summary.player_id
    left join master_nationality
      on master_nationality.player_id = summary.player_id
    left join master_country
      on master_country.player_id = summary.player_id
  )
  insert into public.ehockey_player_nationality (
    player_id,
    country_code,
    decision_status,
    decision_source,
    confidence,
    is_locked,
    evidence_count,
    reason,
    decided_at,
    updated_at
  )
  select
    resolved.player_id,
    resolved.country_code,
    resolved.decision_status,
    resolved.decision_source,
    resolved.confidence,
    resolved.is_locked,
    resolved.evidence_count,
    resolved.reason,
    now(),
    now()
  from resolved
  on conflict (player_id)
  do update set
    country_code = excluded.country_code,
    decision_status = excluded.decision_status,
    decision_source = excluded.decision_source,
    confidence = excluded.confidence,
    is_locked = excluded.is_locked,
    evidence_count = excluded.evidence_count,
    reason = excluded.reason,
    decided_at = excluded.decided_at,
    updated_at = now()
  where not public.ehockey_player_nationality.is_locked;

/* Bevara manuellt bekraftade aktuella gamertags efter masteruppdateringen. */
update public.ehockey_players player
set
  display_gamertag = rule.display_gamertag,
  normalized_gamertag =
    public.normalize_ehockey_name(rule.display_gamertag),
  updated_at = now()
from private.ehockey_player_manual_gamertag_rules rule
where rule.is_active
  and player.canonical_key = rule.canonical_key
  and player.status <> 'merged';

commit;

/* Uppdatera SEC-sidans snabba, indexerade spelarunderlag. */
set statement_timeout = '10min';
refresh materialized view concurrently
  public.sec_sommar26_player_card_fast_v1;
reset statement_timeout;

notify pgrst, 'reload schema';


/* 5. Verifiering */
select
  count(*)::bigint as central_players,
  count(*) filter (
    where canonical_key like 'SG:%'
  )::bigint as central_sportsgamer_profiles,
  count(*) filter (
    where status = 'unresolved'
  )::bigint as unresolved_players
from public.ehockey_players;

select
  count(*)::bigint as imported_master_rows,
  count(*) filter (
    where btrim(user_id) ~ '^[1-9][0-9]*$'
  )::bigint
    as master_rows_with_user_id,
  count(*) filter (
    where case
      when upper(btrim(nationality)) in (
        'SK', 'SVK', 'SLOVAK', 'SLOVAKIA', 'SLOVENSKO'
      ) then 'SK'
      else public.ehockey_normalize_country_code(nationality)
    end is not null
  )::bigint as master_rows_with_nationality,
  count(*) filter (
    where public.ehockey_normalize_country_code(country) is not null
  )::bigint as master_rows_with_country
from private.sportsgamer_player_master_import;

select
  nationality.decision_status,
  nationality.country_code,
  count(*)::bigint as player_count
from public.ehockey_player_nationality nationality
group by
  nationality.decision_status,
  nationality.country_code
order by
  nationality.decision_status,
  nationality.country_code;

select
  count(distinct nationality.player_id)::bigint
    as unknown_sportsgamer_players
from public.ehockey_player_nationality nationality
join public.ehockey_player_identities identity
  on identity.player_id = nationality.player_id
 and identity.source_code = 'SPORTSGAMER'
where nationality.decision_status = 'unknown';

select
  player_id,
  display_gamertag,
  canonical_key,
  decision_status,
  evidence_countries,
  evidence_sources,
  reason
from public.v_ehockey_player_nationality_review
where decision_status = 'conflict'
order by player_id;

/* Exakt vilka nya svenska SG-profiler som skapades i denna korning. */
select
  new_profile.player_id as sports_gamer_player_id,
  new_profile.user_id as sports_gamer_user_id,
  registry.display_gamertag,
  registry.country_code,
  registry.nationality_status,
  registry.status
from pg_temp.new_swedish_sg_profiles new_profile
join public.v_ehockey_player_registry registry
  on registry.sports_gamer_player_id = new_profile.player_id::bigint
order by new_profile.player_id;

/*
  Exakta namntraffar mot tidigare fristaende spelare. Dessa ar endast
  granskningskandidater och slas aldrig ihop automatiskt.
*/
select
  review.central_player_id as standalone_player_id,
  review.canonical_key as standalone_canonical_key,
  review.display_gamertag as standalone_gamertag,
  review.candidate_sports_gamer_player_ids,
  review.candidate_gamertags,
  review.review_status
from public.v_ehockey_standalone_player_review review
where exists (
  select 1
  from pg_temp.new_swedish_sg_profiles new_profile
  where new_profile.player_id::text =
    any(review.candidate_sports_gamer_player_ids)
)
order by review.display_gamertag;
