(() => {
  "use strict";
  let request;
  const config = () => window.SEH_CONFIG || window.EHOCKEY_CONFIG || {};
  async function rows(table, select) {
    const cfg = config();
    const result = [];
    for (let offset = 0;; offset += 1000) {
      const query = new URLSearchParams({select,limit:"1000",offset:String(offset),
        order:table === "v_local_team_list" ? "team_id" : "player_key"});
      const response = await fetch(cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + table + "?" + query, {
        headers:{apikey:cfg.supabasePublishableKey}
      });
      if (!response.ok) throw new Error("Kunde inte läsa studions lagdata.");
      const page = await response.json();
      result.push(...page);
      if (page.length < 1000) return result;
    }
  }
  async function load() {
    const [response, clubs, players] = await Promise.all([
      fetch("ecl27-winter-rosters.json", {cache:"no-cache"}),
      rows("v_local_team_list", "team_id,current_name,sports_gamer_team_ids,logo_url"),
      rows("app_player_directory_cache", "player_key,display_gamertag,primary_position,player_country,player_image,sports_gamer_player_url")
    ]);
    if (!response.ok) throw new Error("Winter-anmälan kunde inte hämtas.");
    const snapshot = await response.json();
    if (snapshot.leagueId !== 535 || !snapshot.teams?.length) throw new Error("Fel Winter-källa.");
    const byPlayer = new Map(players.map(p => [Number(/\/players\/(\d+)\/?$/.exec(p.sports_gamer_player_url || "")?.[1]),p]));
    const teams = snapshot.teams.map(t => {
      const matches = clubs.filter(c => (c.sports_gamer_team_ids || []).map(Number).includes(Number(t.id)));
      const local = matches.length === 1 ? matches[0] : null;
      return {...t, localTeamId:local?.team_id || null,
        localLogo:local?.logo_url || "",
        players:t.players.map(p => ({...byPlayer.get(Number(p.id)),...p}))};
    });
    return {snapshot,teams};
  }
  window.SEH_WINTER_STUDIO = {load:() => request || (request=load().catch(error => {request=null; throw error;}))};
})();
