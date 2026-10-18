"""Sanitize read-only CSV exports for a short-lived graphics result. No DB writes."""
import csv,json,os
from collections import defaultdict
from datetime import date,datetime,time,timedelta,timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ALLOWED={520,523,524,525,526,527,529,532}
TEAM_FIELDS=('sports_gamer_league_id sports_gamer_team_id team_name_in_league team_logo_in_league statistics_stage effective_group_id group_name games_played wins losses overtime_wins overtime_losses total_wins table_points goals_for goals_against goal_difference').split()
PLAYER_FIELDS=('sports_gamer_league_id sports_gamer_team_id sports_gamer_player_id display_gamertag team_name_in_league player_number player_country player_image roster_preferred_position_abbreviation regular_skater_position_abbreviation playoff_skater_position_abbreviation sports_gamer_player_url').split()
STATS=['skater_games','goals','assists','points','penalty_minutes','hits','faceoff_wins','faceoff_losses','takeaways','interceptions','blocked_shots','goalie_games','goalie_save_percentage','goalie_goals_against_average','goalie_shutouts']
NUMERIC=set('sports_gamer_league_id sports_gamer_team_id sports_gamer_player_id player_number effective_group_id games_played wins losses overtime_wins overtime_losses total_wins table_points goals_for goals_against goal_difference'.split())|{stage+'_'+field for stage in ('regular','playoff') for field in STATS}
def number(v):
 try:return float(v) if '.' in str(v) else int(v)
 except (TypeError,ValueError):return None
def public_fields(row,fields):
 return {key:number(row.get(key)) if key in NUMERIC else row.get(key) or '' for key in fields}
def read(path):
 with Path(path).open(encoding='utf-8',newline='') as f:return list(csv.DictReader(f))
def period(start,end):
 a,b=date.fromisoformat(start),date.fromisoformat(end)
 if a<date(2020,1,1) or b<a or (b-a).days>365 or b>datetime.now(ZoneInfo('Europe/Stockholm')).date()+timedelta(days=7):raise ValueError('Invalid period (maximum 366 days)')
 zone=ZoneInfo('Europe/Stockholm')
 return datetime.combine(a,time.min,zone),datetime.combine(b+timedelta(days=1),time.min,zone)
def weekly_candidates(matches,rows,league,start,end):
 lower,upper=period(start,end);chosen={}
 for m in matches:
  if int(m['source_league_id'])!=league:raise ValueError('Mixed match leagues')
  if not m.get('started_at'):continue
  stamp=datetime.fromisoformat(m['started_at'].replace('Z','+00:00'))
  if stamp.tzinfo is None:raise ValueError('Missing source timezone')
  if lower<=stamp<upper:chosen[int(m['source_match_id'])]=m
 team_games=defaultdict(int)
 for m in chosen.values():
  for key in ('team1_id','team2_id'):team_games[int(m[key])]+=1
 groups={};coverage=defaultdict(set);seen=set()
 for row in rows:
  if int(row['source_league_id'])!=league:raise ValueError('Mixed player leagues')
  match=int(row['source_match_id']);team=int(row['source_team_id']);player=int(row['source_player_id']);pos=row['played_position'].upper()
  key=(match,team,player)
  if match not in chosen or key in seen or pos not in ('LW','C','RW','LD','RD','G'):continue
  seen.add(key);coverage[(match,team)].add(player)
  if not ((number(row.get('skater_games')) or 0)>0 or (number(row.get('goalie_games')) or 0)>0):continue
  k=(team,player,pos)
  if k not in groups:groups[k]=dict(source_team_id=team,source_player_id=player,position=pos,games=0,goals=0,assists=0,defensive_actions=0,saves=0,goals_allowed=0,dim_complete=True,goalie_complete=True,team_games=team_games[team])
  p=groups[k];p['games']+=1
  raw=json.loads(row.get('raw_stats') or '{}').get('skater') or {}
  for field in ('goals','assists'):p[field]+=number(row.get(field)) or 0
  values=[number(raw.get('takeaways')),number(raw.get('interceptions')),number(row.get('blocked_shots'))]
  p['dim_complete']=p['dim_complete'] and all(v is not None for v in values)
  p['defensive_actions']+=sum(v or 0 for v in values)
  saves,allowed=number(row.get('goalie_saves')),number(row.get('goalie_goals_allowed'))
  p['goalie_complete']=p['goalie_complete'] and saves is not None and allowed is not None
  p['saves']+=saves or 0;p['goals_allowed']+=allowed or 0
 complete=all(len(coverage[(match,int(m[key]))])>=6 for match,m in chosen.items() for key in ('team1_id','team2_id'))
 return dict(supported=True,start=start,end=end,matches=len(chosen),complete=complete,candidates=list(groups.values()))
def public_matches(matches,teams,league):
 names={int(t['sports_gamer_team_id']):t.get('team_name_in_league') or '' for t in teams}
 result=[];seen=set()
 for m in matches:
  if int(m['source_league_id'])!=league:raise ValueError('Mixed match leagues')
  mid=number(m.get('source_match_id'));home=number(m.get('team1_id'));away=number(m.get('team2_id'))
  hs=number(m.get('team1_score'));as_=number(m.get('team2_score'));stamp=m.get('started_at')
  if not mid or mid in seen or not home or not away or hs is None or as_ is None or not stamp:continue
  parsed=datetime.fromisoformat(stamp.replace('Z','+00:00'))
  if parsed.tzinfo is None:raise ValueError('Missing source timezone')
  raw=json.loads(m.get('raw_match') or '{}').get('row') or {}
  overtime=next((raw[k] for k in ('overtime','wentToOvertime','went_to_overtime') if raw.get(k) is not None),False)
  seen.add(mid)
  result.append(dict(id=mid,date=stamp,homeId=home,awayId=away,home=names.get(home) or str(home),away=names.get(away) or str(away),homeScore=hs,awayScore=as_,stage='playoffs' if str(m.get('match_type')).lower()=='playoffs' else 'regular',overtime=str(overtime).strip().lower() in ('1','true','yes')))
 return result

def build(league,start,end,teams,roster,stats,matches,match_players):
 if league not in ALLOWED:raise ValueError('Unsupported league')
 safe_teams=[public_fields(t,TEAM_FIELDS) for t in teams]
 by_team={int(t['sports_gamer_team_id']):t for t in teams}
 by_player={(int(p['sports_gamer_team_id']),int(p['sports_gamer_player_id'])):p for p in stats}
 registered={(int(p['sports_gamer_team_id']),int(p['sports_gamer_player_id'])):p for p in roster}
 players=[];fields=PLAYER_FIELDS+[stage+'_'+field for stage in ('regular','playoff') for field in STATS]
 for key in sorted(by_player.keys()|registered.keys()):
  row={**by_player.get(key,{}),**{k:v for k,v in registered.get(key,{}).items() if v!=''}}
  row['team_name_in_league']=by_team.get(key[0],{}).get('team_name_in_league','')
  row['roster_preferred_position_abbreviation']=row.get('roster_preferred_position_abbreviation') or row.get('preferred_position','')
  p=public_fields(row,fields);p['is_current_roster']=key in registered;players.append(p)
 if any(t['sports_gamer_league_id']!=league for t in safe_teams) or any(p['sports_gamer_league_id']!=league for p in players):raise ValueError('Mixed output leagues')
 now=datetime.now(timezone.utc)
 return dict(schema_version=1,league_id=league,source='sportsgamer-read-only',fetched_at=now.isoformat(),expires_at=(now+timedelta(hours=1)).isoformat(),teams=safe_teams,players=players,matches=public_matches(matches,teams,league),weekly=weekly_candidates(matches,match_players,league,start,end))
def main():
 league=int(os.environ.get('LEAGUE_ID','532'));today=datetime.now(ZoneInfo('Europe/Stockholm')).date()
 start=os.environ.get('PERIOD_START') or (today-timedelta(days=6)).isoformat();end=os.environ.get('PERIOD_END') or today.isoformat()
 data=build(league,start,end,read('/tmp/broadcast_league_team_stats.csv'),read('/tmp/broadcast_league_roster.csv'),read('/tmp/swedish_player_stats.csv'),read('/tmp/fantasy_matches.csv'),read('/tmp/fantasy_match_player_stats.csv'))
 output=Path('/tmp/graphics-result/result.json');output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(data,ensure_ascii=False,allow_nan=False),encoding='utf-8')
 print('Transient result:',len(data['teams']),'team rows,',len(data['players']),'players,',data['weekly']['matches'],'period matches; complete:',data['weekly']['complete'])
if __name__=='__main__':main()
