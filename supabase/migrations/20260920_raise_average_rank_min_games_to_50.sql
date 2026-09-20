-- Require at least 50 eligible games for Snitt-rank.
-- Snitt-RP is still calculated and displayed below the threshold; only average_rank eligibility changes.

do $$
declare
  def text;
  old_rule text := 's.eligible_games >= 30 AS average_eligible';
  new_rule text := 's.eligible_games >= 50 AS average_eligible';
begin
  def := pg_get_viewdef('public.v_ehockey_swedish_player_ranking_v3'::regclass,true);

  if position(new_rule in def) > 0 then
    return;
  end if;

  if position(old_rule in def) = 0 then
    raise exception 'Expected 30-game Snitt-rank rule not found in v_ehockey_swedish_player_ranking_v3';
  end if;

  def := replace(def,old_rule,new_rule);
  execute 'create or replace view public.v_ehockey_swedish_player_ranking_v3 as ' || def;
end $$;

select public.refresh_app_player_ranking_cache();
