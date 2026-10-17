import unittest
from build_transient_graphics import build,weekly_candidates,period

class TransientTests(unittest.TestCase):
 def test_privacy_and_types(self):
  team={'sports_gamer_league_id':'532','sports_gamer_team_id':'1','team_name_in_league':'Team','statistics_stage':'regular','city_in_league':'PRIVATE'}
  player={'sports_gamer_league_id':'532','sports_gamer_team_id':'1','sports_gamer_player_id':'7','display_gamertag':'GT','player_city':'PRIVATE','sports_gamer_user_id':'123','psn_tag':'PRIVATE','regular_points':'5'}
  result=build(532,'2026-10-11','2026-10-15',[team],[],[player],[],[])
  self.assertEqual(result['players'][0]['regular_points'],5)
  for key in ['player_city','sports_gamer_user_id','psn_tag']:self.assertNotIn(key,result['players'][0])
  self.assertNotIn('city_in_league',result['teams'][0])
 def test_period_final_day_and_dedup(self):
  match={'source_league_id':'532','source_match_id':'1','team1_id':'1','team2_id':'2','started_at':'2026-10-15T21:59:59+00:00'}
  excluded={**match,'source_match_id':'2','started_at':'2026-10-15T22:00:00+00:00'}
  rows=[]
  for team in (1,2):
   for i,pos in enumerate(['LW','C','RW','LD','RD','G']):
    rows.append(dict(source_league_id='532',source_match_id='1',source_team_id=str(team),source_player_id=str(team*10+i),played_position=pos,skater_games='0' if pos=='G' else '1',goalie_games='1' if pos=='G' else '0',goals='1',assists='2',blocked_shots='3',goalie_saves='15',goalie_goals_allowed='1',raw_stats='{"skater":{"takeaways":2,"interceptions":4}}'))
  data=weekly_candidates([match,excluded],rows+[rows[0]],532,'2026-10-15','2026-10-15')
  self.assertEqual(data['matches'],1);self.assertTrue(data['complete']);self.assertEqual(len(data['candidates']),12);self.assertEqual(data['candidates'][0]['games'],1);self.assertEqual(data['candidates'][0]['defensive_actions'],9)
 def test_validation(self):
  for a,b in [('2026-10-15','2026-10-14'),('2020-01-01','2026-10-15')]:
   with self.assertRaises(ValueError):period(a,b)
  with self.assertRaises(ValueError):build(999,'2026-10-11','2026-10-15',[],[],[],[],[])

if __name__=='__main__':unittest.main()
