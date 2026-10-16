-- WV/FCL sporting match data only. No Fantasy competition or points changes.
create table if not exists graphics_private.sports_matches(
 source_league_id bigint not null check(source_league_id in(529,532)),
 source_match_id bigint not null,started_at timestamptz,
 team1_id bigint not null,team2_id bigint not null,
 imported_at timestamptz not null default now(),
 primary key(source_league_id,source_match_id));
create index if not exists sports_matches_week_idx on graphics_private.sports_matches(source_league_id,started_at);
create table if not exists graphics_private.sports_player_matches(
 source_league_id bigint not null check(source_league_id in(529,532)),source_match_id bigint not null,
 source_team_id bigint not null,source_player_id bigint not null,played_position text,
 skater_games integer,goalie_games integer,goals integer,assists integer,blocked_shots integer,
 goalie_saves integer,goalie_goals_allowed integer,raw_stats jsonb not null default '{}',
 imported_at timestamptz not null default now(),
 primary key(source_league_id,source_match_id,source_team_id,source_player_id),
 foreign key(source_league_id,source_match_id) references graphics_private.sports_matches(source_league_id,source_match_id));
alter table graphics_private.sports_matches enable row level security;
alter table graphics_private.sports_player_matches enable row level security;
revoke all on graphics_private.sports_matches,graphics_private.sports_player_matches from public,anon,authenticated;
do $upgrade$
declare original text; revised text;
begin
 original:=pg_get_functiondef('graphics_private.weekly_candidates(bigint,date)'::regprocedure);
 if position('graphics_private.sports_matches' in original)=0 then
  revised:=replace(original,'p_league<>527','p_league not in (527,529,532)');
  revised:=replace(revised,'from public.ehockey_fantasy_matches',
   'from (select source_league_id,source_match_id,started_at,team1_id,team2_id,imported_at from public.ehockey_fantasy_matches where source_league_id=527 union all select source_league_id,source_match_id,started_at,team1_id,team2_id,imported_at from graphics_private.sports_matches) shared_matches');
  revised:=replace(revised,'from public.ehockey_fantasy_match_player_stats s',
   'from (select source_league_id,source_match_id,source_team_id,source_player_id,played_position,skater_games,goalie_games,goals,assists,blocked_shots,goalie_saves,goalie_goals_allowed,raw_stats,imported_at from public.ehockey_fantasy_match_player_stats where source_league_id=527 union all select source_league_id,source_match_id,source_team_id,source_player_id,played_position,skater_games,goalie_games,goals,assists,blocked_shots,goalie_saves,goalie_goals_allowed,raw_stats,imported_at from graphics_private.sports_player_matches) s');
  if revised=original or position('graphics_private.sports_player_matches' in revised)=0 then raise exception 'Weekly function anchors missing'; end if;
  execute revised;
 end if;
end $upgrade$;
notify pgrst,'reload schema';
