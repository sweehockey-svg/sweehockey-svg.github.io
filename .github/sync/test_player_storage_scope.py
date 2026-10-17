import re
import unittest
from player_storage_scope import is_scandinavian,qualifies,played_player_query,profile_filter,SWEDISH_LEAGUE_PATTERN

class StorageScopeTests(unittest.TestCase):
 def test_scandinavia(self):
  for value in ['SE','SWE','Sweden','NO','NOR','Norway','DK','DNK','Denmark']:
   self.assertTrue(is_scandinavian({'nationality':value}))
  self.assertTrue(is_scandinavian({'nationality':'  ','country':'NO'}))
  for value in ['FI','IS','CA','US','DE','']:
   self.assertFalse(qualifies({'player_id':9,'nationality':value},set()))
 def test_swedish_participation(self):
  for value in ['FI','CA','US','DE','']:
   self.assertTrue(qualifies({'player_id':9,'nationality':value},{9}))
  self.assertFalse(is_scandinavian({'nationality':'FI','country':'SE'}),'Do not replace nationality with residence')
 def test_historical_league_names(self):
  for name in ['SEC 21 🇸🇪','SEC Sommar 26 🇸🇪','SCL 2027 - 6v6 🇸🇪','SCL 6v6 - 2025 🇸🇪']:
   self.assertRegex(name,SWEDISH_LEAGUE_PATTERN)
  for name in ['FCL 27','WV 4 Nations 2026','SECURITY CUP','SCLUB']:
   self.assertIsNone(re.search(SWEDISH_LEAGUE_PATTERN,name))
 def test_readonly_and_played_not_registered(self):
  query,params=played_player_query()
  self.assertTrue(query.lower().startswith('select'))
  self.assertEqual(len(params),3)
  self.assertNotIn('leagueRosters',query)
  self.assertIn('gamesPlayed>0',query)
  self.assertIn('totalIceTimeInSeconds>0',query)
  where,values=profile_filter({9,3})
  self.assertTrue(where.endswith('order by playerID'))
  self.assertEqual(values[-2:],(3,9))
  with self.assertRaises(ValueError):profile_filter({-1})

if __name__=='__main__':unittest.main()
