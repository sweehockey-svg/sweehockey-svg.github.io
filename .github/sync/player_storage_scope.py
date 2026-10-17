"""Permanent cohort: Scandinavia, or actual SEC/SCL playing history.

League registrations alone and graphics requests do not qualify a player.
This module does not write to the SportsGamer source.
"""
import re

ALIASES={
 'SE':'SE','SWE':'SE','SWEDEN':'SE','SVERIGE':'SE','SWEDISH':'SE','SVENSK':'SE',
 'NO':'NO','NOR':'NO','NORWAY':'NO','NORGE':'NO','NORWEGIAN':'NO',
 'DK':'DK','DNK':'DK','DEN':'DK','DENMARK':'DK','DANMARK':'DK','DANISH':'DK',
}
SCANDINAVIAN_VALUES=tuple(ALIASES)
SWEDISH_LEAGUE_PATTERN=r'^(SEC|SCL)([^A-Z]|$)'

def is_scandinavian(row):
 nationality=str(row.get('nationality') or '').strip()
 value=(nationality or str(row.get('country') or '').strip()).upper()
 return value in ALIASES

def qualifies(row,played_ids):
 return is_scandinavian(row) or int(row['player_id']) in played_ids

def played_player_query():
 selects=[]
 for table,condition in [('nhlgamer_playerStats','s.gamesPlayed>0'),('nhlgamer_goalieStats','s.gamesPlayed>0'),('nhlgamer_participants','s.totalIceTimeInSeconds>0 and s.matchID>0')]:
  selects.append('select distinct s.playerID as player_id from '+table+' s join nhlgamer_leagues l on l.leagueID=s.leagueID where s.playerID>0 and '+condition+' and upper(trim(l.leagueName)) regexp %s')
 return ' union '.join(selects),(SWEDISH_LEAGUE_PATTERN,)*len(selects)

def profile_filter(played_ids):
 ids=sorted(set(int(x) for x in played_ids))
 if any(x<=0 for x in ids):raise ValueError('Invalid SportsGamer player ID')
 countries=','.join(['%s']*len(SCANDINAVIAN_VALUES))
 ids_sql=','.join(['%s']*len(ids)) or '0'
 return (' where playerID>0 and (upper(trim(coalesce(nullif(trim(nationality),\'\'),country,\'\'))) in ('+countries+') or playerID in ('+ids_sql+')) order by playerID',SCANDINAVIAN_VALUES+tuple(ids))
