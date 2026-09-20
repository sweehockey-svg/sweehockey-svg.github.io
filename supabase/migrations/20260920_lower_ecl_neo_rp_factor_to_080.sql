-- Lower ECL Neo RP weighting from 0.90 to 0.80.
-- Keep the active ranking chain consistent: base history weighting (v3),
-- defender merit adjustment (v4), and the shared level-factor helper (used by v6 merits).

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
  when upper(coalesce(p_competition_code,''))='SEC' and lower(coalesce(p_division,'')) ~ '(challenger|div(ision)?\\s*2)' then 1.00
  when upper(coalesce(p_competition_code,''))='SEC' then 1.10
  when coalesce(p_league_name,'') ~* '\\mSEC\\M.*(DIV(ISION)?[[:space:]]*2|Challenger)' then 1.00
  when coalesce(p_league_name,'') ~* '\\mSEC\\M' then 1.10
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
  old_neo text;
  new_neo text;
begin
  def := pg_get_viewdef('public.v_ehockey_swedish_player_ranking_v3'::regclass,true);
  old_neo := 'WHEN upper(COALESCE(h.competition_code, ''''::text)) = ''ECL''::text AND lower(COALESCE(h.division, ''''::text)) ~~ ''%neo%''::text THEN 0.90';
  new_neo := replace(old_neo,'0.90','0.80');
  if position(old_neo in def)>0 then
    def := replace(def,old_neo,new_neo);
    execute 'create or replace view public.v_ehockey_swedish_player_ranking_v3 as ' || def;
  elsif position(new_neo in def)=0 then
    raise exception 'Unexpected ECL Neo factor in v_ehockey_swedish_player_ranking_v3';
  end if;

  def := pg_get_viewdef('public.v_ehockey_swedish_player_ranking_v4'::regclass,true);
  old_neo := 'WHEN upper(COALESCE(p.competition_code, ''''::text)) = ''ECL''::text AND lower(COALESCE(p.division, ''''::text)) ~~ ''%neo%''::text THEN 0.90';
  new_neo := replace(old_neo,'0.90','0.80');
  if position(old_neo in def)>0 then
    def := replace(def,old_neo,new_neo);
    execute 'create or replace view public.v_ehockey_swedish_player_ranking_v4 as ' || def;
  elsif position(new_neo in def)=0 then
    raise exception 'Unexpected ECL Neo factor in v_ehockey_swedish_player_ranking_v4';
  end if;
end $$;

select public.refresh_app_player_ranking_cache();
