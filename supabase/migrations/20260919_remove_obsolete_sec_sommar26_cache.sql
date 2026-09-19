-- Remove obsolete SEC Sommar 26 cache chain.
-- Verified before removal:
-- - no GitHub references in the current site/app
-- - no functions or non-Sommar26 database objects depended on this chain

drop materialized view if exists public.sec_sommar26_player_card_fast_v1;
drop view if exists public.v_sec_sommar26_player_card_v33;
drop view if exists public.v_sec_sommar26_player_country_v36;
drop view if exists public.v_sec_sommar26_player_card_central_v38;
drop view if exists public.v_sec_sommar26_player_identity;
drop materialized view if exists public.v_sec_sommar26_player_info;

drop table if exists public.sec_sommar26_player_card_cache_v37;
drop table if exists public.sec_sommar26_latest_ecl_cache;
drop table if exists public.sec_sommar26_player_career_cache;
drop table if exists public.sec_sommar26_player_identity_cache;
