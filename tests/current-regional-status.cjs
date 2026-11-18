const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const app = read('app.js');
const helpers = app.slice(app.indexOf('function SEH_winterPlayerTeams('), app.indexOf('function SEH_applyDirectoryWinterClub('));
const rows = {
  app_player_directory_cache: [1, 2, 3, 4, 5, 6].map(id => ({
    player_key: 'p' + id, display_gamertag: 'Player' + id,
    sports_gamer_player_url: 'https://sportsgamer.gg/players/' + id,
    latest_team: 'Historiskt lag'
  })),
  v_ehockey_free_agents_public: [1, 2, 3, 5].map(id => ({ player_key: 'p' + id }))
};
const snapshot = { leagueId: 535, teams: [
  { id: 101, name: 'Winterlaget', players: [{ id: 1 }, { id: 5 }] },
  { id: 102, name: 'Andra laget', players: [{ id: 5 }] }
] };
const build = { name: 'Aktivt bygge', href: '#/lagbygge?ecl27lag=aktivt-bygge', playersNow: ['Player1', 'Player2'] };
const calls = new Set();
function query(table) {
  calls.add(table);
  assert.ok(Object.hasOwn(rows, table), 'Unexpected current-club source: ' + table);
  const q = { select: () => q, order: () => q, range: (start, end) => ({
    data: rows[table].slice(start, end + 1), error: null
  }) };
  return q;
}
const context = {
  window: {
    SEH_CONFIG: { supabaseUrl: 'https://test.invalid', supabasePublishableKey: 'test' },
    supabase: { createClient: () => ({ from: query }) },
    SEH_fetchWinterRosters: async () => snapshot,
    SEH_ECL27_BUILD_ROSTER_READY: Promise.resolve(async () => [build]),
    dispatchEvent() {}
  },
  SEH_WINTER_TITLE: 'ECL ’27: Winter', SEH_WINTER_DIVISIONS: {},
  location: { pathname: '/' }, CustomEvent: class {}, console
};
vm.runInNewContext(helpers + '\nObject.assign(window, { SEH_winterPlayerTeams, SEH_winterClubStatus, SEH_winterTeamUrl });', context);
vm.runInNewContext(read('player-current-status-v1.js'), context);
(async () => {
  const api = context.window.SEH_currentPlayerStatus;
  assert.equal((await api.get('p1')).teamName, 'Winterlaget', 'Registration wins over build and Free Agent');
  assert.equal((await api.get('p2')).teamName, 'Aktivt bygge', 'Visible Lagbygge roster wins over Free Agent');
  assert.equal((await api.get('p3')).kind, 'free_agent', 'Listed with no current team');
  assert.equal((await api.get('p4')).kind, 'no_team', 'History is not a current club');
  assert.equal((await api.get('p5')).kind, 'free_agent', 'Two conflicting registrations do not establish a team');
  assert.equal((await api.get('p6')).kind, 'no_team', 'No roster or Free Agent membership');
  const decorated = await api.decorateRows(rows.app_player_directory_cache);
  assert.equal(decorated[0].current_team_href, 'https://sportsgamer.gg/leagues/535/teams/101');
  assert.equal(decorated[1].current_team_href, build.href);
  assert.equal(decorated[3].latest_team, 'Historiskt lag');
  assert.equal(decorated[3].current_team_name, '');
  assert.deepEqual([...calls], ['app_player_directory_cache', 'v_ehockey_free_agents_public']);
  console.log('Current club policy passed: Winter → Lagbygge → Free Agent → no current team.');
})().catch(error => { console.error(error); process.exitCode = 1; });
