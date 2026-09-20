-- Lower SEC RP weighting to better reflect competition level.
-- SEC Main: 1.10 -> 0.90
-- SEC Challenger / Division 2: 1.00 -> 0.80
-- Keeps the shared level-factor helper plus the active v3/v4 ranking chain aligned.

create or replace function public.ehockey_rp_level_factor(
  p_competition_code text,
  p_league_name text,
  p_division text
)
returns numeric
language sql
immutable
as $function$
select case
  when upper(coalesce(p_competition_code,''))='ECL' and lower(coalesce(p_division,'')) like '%elite%' then 1.30
  when upper(coalesce(p_competition_code,''))='ECL' and lower(coalesce(p_division,'')) like '%pro%' then 1.20
  when upper(coalesce(p_competition_code,''))='ECL' and lower(coalesce(p_division,'')) like '%lite%' then 1.10
  when upper(coalesce(p_competition_code,''))='ECL' and lower(coalesce(p_division,'')) like '%core%' then 1.00
  when upper(coalesce(p_competition_code,''))='ECL' and lower(coalesce(p_division,'')) like '%neo%' then 0.80
  when coalesce(p_league_name,'') ~* 'Western European Championship League|\\mWECL\\M' then 1.10
  when upper(coalesce(p_competition_code,'')) in ('SCL','FCL','SM','ESHL','LGEL') then 1.20
  when coalesce(p_league_name,'') ~* 'Swedish Championship League|Finnish Championship League|eHockey SM|\\mEHSM\\M|\\meSHL\\M|LeagueGaming European League' then 1.20
  when upper(coalesce(p_competition_code,'')) in ('RCL','GCL') then 1.10
  when coalesce(p_league_name,'') ~* 'Russian Championship League|German Championship League|\\mRCL\\M|\\mGCL\\M' then 1.10
  when upper(coalesce(p_competition_code,''))='SEC' and lower(coalesce(p_division,'')) ~ '(challenger|div(ision)?\\s*2)' then 0.80
  when upper(coalesce(p_competition_code,''))='SEC' then 0.90
  when coalesce(p_league_name,'') ~* '\\mSEC\\M.*(DIV(ISION)?[[:space:]]*2|Challenger)' then 0.80
  when coalesce(p_league_name,'') ~* '\\mSEC\\M' then 0.90
  when upper(coalesce(p_competition_code,''))='ITHL' and lower(coalesce(p_division,'')) like '%elite%' then 1.10
  when upper(coalesce(p_competition_code,''))='ITHL' and lower(coalesce(p_division,'')) like '%sweat%' then 1.00
  when upper(coalesce(p_competition_code,''))='ITHL' and lower(coalesce(p_division,'')) like '%core%' then 0.90
  when upper(coalesce(p_competition_code,''))='ITHL' and lower(coalesce(p_division,'')) like '%rammer%' then 0.80
  when coalesce(p_league_name,'') ~* '^6v6 eHockey World Finals$' then 1.30
  when coalesce(p_league_name,'') ~* '^Czech Slovak Championship League([[:space:]]*[2-5])?$' then 1.00
  when coalesce(p_league_name,'') ~* '^CSCL Relax Cup([[:space:]]*5)?$' then 1.00
  when coalesce(p_league_name,'') ~* '^eHockey World Cup 2026 - Division A$' then 1.20
  when coalesce(p_league_name,'') ~* '^eHockey World Cup 2026 - Divis?ion B$' then 1.10
  when coalesce(p_league_name,'') ~* '^IS Cup [34]:' then 1.10
  when coalesce(p_league_name,'') ~* '^SG World Cup 2025' then 1.20
  when coalesce(p_league_name,'') ~* '^Spring League$' then 1.10
  when coalesce(p_league_name,'') ~* '^Summer Cup( - Season 2| [34]| ''25.*)?$' then 1.00
  else null end;
$function$;

do $$
declare
  def text;
begin
  def := pg_get_viewdef('public.v_ehockey_swedish_player_ranking_v3'::regclass,true);

  def := replace(def,
    'WHEN upper(COALESCE(h.competition_code, ''''::text)) = ''SEC''::text AND lower(COALESCE(h.division, ''''::text)) ~ ''(challenger|div(ision)?\s*2)''::text THEN 1.00',
    'WHEN upper(COALESCE(h.competition_code, ''''::text)) = ''SEC''::text AND lower(COALESCE(h.division, ''''::text)) ~ ''(challenger|div(ision)?\s*2)''::text THEN 0.80');
  def := replace(def,
    'WHEN upper(COALESCE(h.competition_code, ''''::text)) = ''SEC''::text THEN 1.10',
    'WHEN upper(COALESCE(h.competition_code, ''''::text)) = ''SEC''::text THEN 0.90');
  def := replace(def,
    'WHEN COALESCE(h.league_name, ''''::text) ~* ''\mSEC\M.*(DIV(ISION)?[[:space:]]*2|Challenger)''::text THEN 1.00',
    'WHEN COALESCE(h.league_name, ''''::text) ~* ''\mSEC\M.*(DIV(ISION)?[[:space:]]*2|Challenger)''::text THEN 0.80');
  def := replace(def,
    'WHEN COALESCE(h.league_name, ''''::text) ~* ''\mSEC\M''::text THEN 1.10',
    'WHEN COALESCE(h.league_name, ''''::text) ~* ''\mSEC\M''::text THEN 0.90');

  if position('''SEC''::text THEN 0.90' in def)=0
     or position('''SEC''::text AND lower(COALESCE(h.division' in def)=0
     or position('THEN 0.80' in def)=0 then
    raise exception 'Could not verify SEC 0.90/0.80 in ranking v3';
  end if;

  execute 'create or replace view public.v_ehockey_swedish_player_ranking_v3 as ' || def;

  def := pg_get_viewdef('public.v_ehockey_swedish_player_ranking_v4'::regclass,true);

  def := replace(def,
    'WHEN upper(COALESCE(p.competition_code, ''''::text)) = ''SEC''::text AND lower(COALESCE(p.division, ''''::text)) ~ ''(challenger|div(ision)?\s*2)''::text THEN 1.00',
    'WHEN upper(COALESCE(p.competition_code, ''''::text)) = ''SEC''::text AND lower(COALESCE(p.division, ''''::text)) ~ ''(challenger|div(ision)?\s*2)''::text THEN 0.80');
  def := replace(def,
    'WHEN upper(COALESCE(p.competition_code, ''''::text)) = ''SEC''::text THEN 1.10',
    'WHEN upper(COALESCE(p.competition_code, ''''::text)) = ''SEC''::text THEN 0.90');
  def := replace(def,
    'WHEN COALESCE(p.league_name, ''''::text) ~* ''\mSEC\M.*(DIV(ISION)?[[:space:]]*2|Challenger)''::text THEN 1.00',
    'WHEN COALESCE(p.league_name, ''''::text) ~* ''\mSEC\M.*(DIV(ISION)?[[:space:]]*2|Challenger)''::text THEN 0.80');
  def := replace(def,
    'WHEN COALESCE(p.league_name, ''''::text) ~* ''\mSEC\M''::text THEN 1.10',
    'WHEN COALESCE(p.league_name, ''''::text) ~* ''\mSEC\M''::text THEN 0.90');

  if position('''SEC''::text THEN 0.90' in def)=0
     or position('''SEC''::text AND lower(COALESCE(p.division' in def)=0
     or position('THEN 0.80' in def)=0 then
    raise exception 'Could not verify SEC 0.90/0.80 in ranking v4';
  end if;

  execute 'create or replace view public.v_ehockey_swedish_player_ranking_v4 as ' || def;
end $$;

select public.refresh_app_player_ranking_cache();
